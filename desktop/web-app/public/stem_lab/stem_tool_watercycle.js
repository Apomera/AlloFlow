// ── Reduced motion CSS (WCAG 2.3.3)  -  shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// stem_tool_watercycle.js - Water Cycle Interactive Simulator
// Extracted and enhanced with Journey Mode
(function(){
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-watercycle')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-watercycle';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── Water Cycle Audio System ──
  var _wcAC = null;
  function getWCAC() { if (!_wcAC) { try { _wcAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_wcAC && _wcAC.state === 'suspended') { try { _wcAC.resume(); } catch(e) {} } return _wcAC; }
  function wcTone(f, d2, t, v) { var ac = getWCAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d2||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d2||0.1)); } catch(e) {} }
  function wcNoise(dur, vol, hz, type) { var ac = getWCAC(); if (!ac) return; try { var bs = Math.floor(ac.sampleRate*(dur||0.1)); var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0); for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1)*(1-i/bs); var s = ac.createBufferSource(); s.buffer=b; var f = ac.createBiquadFilter(); f.type=type||'lowpass'; f.frequency.value=hz||600; var g = ac.createGain(); g.gain.setValueAtTime(vol||0.04,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(dur||0.1)); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); } catch(e) {} }
  
  function playBubblePop() {
    var ac = getWCAC(); if (!ac) return;
    try {
      var now = ac.currentTime;
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, now);
      o.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, now + 0.08);
      g.gain.setValueAtTime(0.04, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      o.connect(g); g.connect(ac.destination);
      o.start(now); o.stop(now + 0.08);
    } catch(e) {}
  }

  function sfxEvaporationSizzle() {
    var ac = getWCAC(); if (!ac) return;
    try {
      var bs = ac.sampleRate * 0.5;
      var b = ac.createBuffer(1, bs, ac.sampleRate);
      var dd = b.getChannelData(0);
      for (var i = 0; i < bs; i++) {
        dd[i] = (Math.random() * 2 - 1) * (1 - i / bs) * (0.8 + 0.2 * Math.sin(i * 0.01));
      }
      var s = ac.createBufferSource(); s.buffer = b;
      var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
      var g = ac.createGain(); g.gain.setValueAtTime(0.015, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      s.connect(f); f.connect(g); g.connect(ac.destination);
      s.start();
    } catch(e) {}
  }

  function playInfiltrationSwell() {
    var ac = getWCAC(); if (!ac) return;
    try {
      var bs = ac.sampleRate * 0.6;
      var b = ac.createBuffer(1, bs, ac.sampleRate);
      var dd = b.getChannelData(0);
      for (var i = 0; i < bs; i++) {
        dd[i] = (Math.random() * 2 - 1) * (1 - i / bs);
      }
      var s = ac.createBufferSource(); s.buffer = b;
      var f = ac.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(300, ac.currentTime);
      f.frequency.linearRampToValueAtTime(80, ac.currentTime + 0.6);
      var g = ac.createGain(); g.gain.setValueAtTime(0.05, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      s.connect(f); f.connect(g); g.connect(ac.destination);
      s.start();
    } catch(e) {}
  }

  function sfxRain() { 
    for (var i = 0; i < 8; i++) { 
      (function(d3) { 
        setTimeout(function() { 
          wcNoise(0.03, 0.02 + Math.random() * 0.02, 1500 + Math.random() * 1000, 'bandpass'); 
          if (Math.random() > 0.4) playBubblePop();
        }, d3); 
      })(i * 25 + Math.random() * 15); 
    } 
  }
  function sfxEvaporate() { 
    sfxEvaporationSizzle();
    wcTone(400, 0.1, 'sine', 0.05); 
    setTimeout(function() { wcTone(600, 0.08, 'sine', 0.05); }, 60); 
    setTimeout(function() { wcTone(800, 0.12, 'sine', 0.06); }, 120); 
  }
  function sfxCondense() { 
    playBubblePop();
    setTimeout(playBubblePop, 50);
    wcTone(600, 0.08, 'sine', 0.05); 
    setTimeout(function() { wcTone(400, 0.1, 'sine', 0.05); }, 60); 
  }
  function sfxCollect() { 
    playInfiltrationSwell();
    wcNoise(0.15, 0.05, 300, 'lowpass'); 
    wcTone(200, 0.1, 'sine', 0.04); 
  }
  function sfxStream() { wcNoise(0.2, 0.04, 400, 'bandpass'); }
  function sfxFreeze() { wcTone(1200, 0.04, 'sine', 0.04); setTimeout(function() { wcTone(1400, 0.03, 'sine', 0.03); }, 30); setTimeout(function() { wcTone(1600, 0.03, 'sine', 0.03); }, 60); }
  function sfxWcCorrect() { wcTone(523, 0.08, 'sine', 0.07); setTimeout(function() { wcTone(659, 0.08, 'sine', 0.07); }, 70); setTimeout(function() { wcTone(784, 0.1, 'sine', 0.08); }, 140); }
  function sfxWcClick() { wcTone(600, 0.03, 'sine', 0.04); }
  function sfxWcIncorrect() { wcTone(220, 0.15, 'triangle', 0.06); setTimeout(function() { wcTone(180, 0.2, 'triangle', 0.06); }, 120); }

  // Ambient water background
  var _wcAmb = null;
  function startWcAmbient() {
    if (_wcAmb) return;
    var ac = getWCAC(); if (!ac) return;
    try {
      var bs = ac.sampleRate * 2; var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0);
      for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1);
      var s = ac.createBufferSource(); s.buffer=b; s.loop=true;
      var f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=250;
      var lfo = ac.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.12;
      var lg = ac.createGain(); lg.gain.value=40; lfo.connect(lg); lg.connect(f.frequency);
      var m = ac.createGain(); m.gain.setValueAtTime(0,ac.currentTime); m.gain.linearRampToValueAtTime(0.008,ac.currentTime+2);
      s.connect(f); f.connect(m); m.connect(ac.destination); s.start(); lfo.start();
      _wcAmb = { src:s, lfo:lfo, master:m };
      _wcAmb._int = setInterval(function() {
        var cv = document.getElementById('wcCanvas');
        if (cv) {
          var t3 = parseFloat(cv.dataset.climTemp || '15');
          if (Math.random() > (t3 > 25 ? 0.3 : 0.6)) sfxRain();
        } else {
          if (Math.random() > 0.5) sfxRain();
        }
        if (Math.random() > 0.8) wcTone(200 + Math.random() * 100, 0.3, 'sine', 0.01); // distant thunder
      }, 3000 + Math.random() * 4000);

      _wcAmb._updateInterval = setInterval(function() {
        var cv = document.getElementById('wcCanvas');
        if (!cv || !_wcAmb) return;
        var s2 = parseFloat(cv.dataset.climSolar || '1.0');
        var t3 = parseFloat(cv.dataset.climTemp || '15');
        var w2 = parseFloat(cv.dataset.climWind || '1.0');
        var targetFreq = 180 + w2 * 120 + Math.sin(ac.currentTime * 1.5) * 40;
        var targetGain = 0.003 + w2 * 0.006 + s2 * 0.003;
        try {
          f.frequency.setValueAtTime(targetFreq, ac.currentTime);
          m.gain.setValueAtTime(targetGain, ac.currentTime);
        } catch(e) {}
      }, 100);
    } catch(e) {}
  }
  function stopWcAmbient() {
    if (_wcAmb) {
      try { var ac = getWCAC(); if (ac) _wcAmb.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5); } catch(e) {}
      if (_wcAmb._int) clearInterval(_wcAmb._int);
      if (_wcAmb._updateInterval) clearInterval(_wcAmb._updateInterval);
      var n = _wcAmb; setTimeout(function() { try { n.src.stop(); n.lfo.stop(); } catch(e) {} }, 600);
      _wcAmb = null;
    }
  }

  // WCAG a11y CSS
  if (!document.getElementById('wc-a11y-css')) { var _s = document.createElement('style'); _s.id = 'wc-a11y-css'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }'; document.head.appendChild(_s); }

  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-watercycle-polish-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-watercycle-polish-css';
    st.textContent = [
      '.wc-explorer-root{width:100%;max-width:65rem!important}',
      '.wc-cycle-brief{border-radius:16px;padding:14px;margin-bottom:12px;background:linear-gradient(135deg,rgba(14,165,233,.16),rgba(16,185,129,.10) 56%,rgba(251,191,36,.12));border:1px solid rgba(14,165,233,.28);box-shadow:0 16px 36px rgba(15,23,42,.12)}',
      '.wc-brief-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.wc-kicker{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0284c7;margin-bottom:3px}',
      '.wc-brief-title{font-size:19px;font-weight:900;line-height:1.15;margin:0;color:#0f172a}',
      '.wc-brief-copy{font-size:13px;line-height:1.55;margin:6px 0 0;color:#334155;max-width:680px}',
      '.wc-status-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;background:rgba(15,23,42,.88);color:#e0f2fe;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}',
      '.wc-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}',
      '.wc-metric{border-radius:12px;padding:9px 10px;background:rgba(255,255,255,.78);border:1px solid rgba(125,211,252,.45);min-height:66px}',
      '.wc-metric span{display:block;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#64748b}',
      '.wc-metric strong{display:block;margin-top:3px;font-size:14px;line-height:1.25;color:#0f172a}',
      '.wc-canvas-shell{position:relative;border-radius:18px!important;overflow:hidden!important;height:clamp(360px,48vw,520px)!important;border:1px solid rgba(14,165,233,.38)!important;background:linear-gradient(180deg,#082f49 0%,#0f172a 100%);box-shadow:0 22px 46px rgba(15,23,42,.28),inset 0 1px 0 rgba(255,255,255,.12)}',
      '.wc-view-switch{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;flex-wrap:wrap}',
      '.wc-view-segments{display:inline-flex;padding:3px;border-radius:8px;background:#e2e8f0;border:1px solid #cbd5e1}',
      '.wc-view-segments button{min-width:86px;min-height:32px;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:800;color:#475569}',
      '.wc-view-segments button[aria-pressed="true"]{background:#0369a1;color:#fff;box-shadow:0 3px 10px rgba(3,105,161,.28)}',
      '.wc-journey-3d{position:absolute;inset:0;width:100%;height:100%;display:block;background:#041a2b}',
      '.wc-3d-status{font-size:11px;font-weight:800;color:#0369a1}',
      '.wc-view-status{display:flex;align-items:center;gap:6px}',
      '.wc-camera-reset{width:32px;height:32px;display:grid;place-items:center;border-radius:6px;background:#0369a1;color:#fff;font-size:18px;font-weight:900}',
      '.wc-viewport-dock{position:absolute;z-index:5;left:10px;right:10px;bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 9px;border:1px solid rgba(125,211,252,.34);border-radius:12px;background:rgba(4,26,43,.88);box-shadow:0 10px 28px rgba(2,6,23,.34);backdrop-filter:blur(10px);color:#e0f2fe}',
      '.wc-viewport-state{min-width:0}.wc-viewport-state span{display:block;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc}.wc-viewport-state strong{display:block;max-width:260px;margin-top:1px;font-size:12px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-viewport-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}.wc-viewport-btn{min-width:44px;min-height:44px;padding:6px 10px;border:1px solid rgba(125,211,252,.36);border-radius:8px;background:#075985;color:#fff;font-size:11px;font-weight:900}.wc-viewport-btn[aria-pressed="true"]{background:#0ea5e9;color:#082f49}.wc-viewport-btn:disabled{opacity:.48;cursor:not-allowed}.wc-viewport-start{min-height:44px;padding:8px 14px;border-radius:9px;background:linear-gradient(135deg,#06b6d4,#2563eb);color:#fff;font-size:12px;font-weight:900;box-shadow:0 8px 20px rgba(14,165,233,.3)}',
      '.wc-viewport-choice{position:absolute;z-index:7;left:50%;bottom:76px;width:min(620px,calc(100% - 20px));transform:translateX(-50%);padding:12px;border:1px solid rgba(186,230,253,.5);border-radius:14px;background:rgba(4,26,43,.94);box-shadow:0 18px 42px rgba(2,6,23,.5);backdrop-filter:blur(12px);color:#e0f2fe}.wc-viewport-choice h5{margin:0;font-size:14px;font-weight:900}.wc-viewport-choice p{margin:3px 0 9px;font-size:10px;color:#bae6fd}.wc-viewport-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.wc-viewport-choice-grid button{min-height:52px;padding:7px;border:1px solid rgba(125,211,252,.4);border-radius:9px;background:rgba(8,47,73,.9);color:#fff;text-align:left}.wc-viewport-choice-grid strong,.wc-viewport-choice-grid span{display:block}.wc-viewport-choice-grid strong{font-size:11px}.wc-viewport-choice-grid span{margin-top:2px;font-size:9px;color:#bae6fd}',
      '.wc-viewport-choice-grid button[data-route-choice="runoff"]{border-left:3px solid #3b82f6}.wc-viewport-choice-grid button[data-route-choice="infiltrate"]{border-left:3px solid #22d3ee}.wc-viewport-choice-grid button[data-route-choice="plant"]{border-left:3px solid #4ade80}',
      '.wc-journey-lens{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:-2px 0 10px;border-left:3px solid #0ea5e9;background:rgba(14,165,233,.16)}',
      '.wc-journey-lens div{padding:8px 10px;background:rgba(255,255,255,.88)}',
      '.wc-journey-lens span{display:block;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b}',
      '.wc-journey-lens strong{display:block;margin-top:2px;font-size:12px;line-height:1.3;color:#0f172a}',
      '.wc-journey-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 0}',
      '.wc-journey-actions{display:flex;align-items:center;gap:5px}',
      '.wc-journey-icon-btn{width:34px;height:34px;display:grid;place-items:center;border-radius:6px;background:#0369a1;color:#fff;font-size:16px;font-weight:900}',
      '.wc-speed-segments{display:inline-flex;padding:3px;border-radius:7px;background:#e0f2fe;border:1px solid #7dd3fc}',
      '.wc-speed-segments button{min-width:42px;min-height:28px;border-radius:5px;font-size:10px;font-weight:800;color:#075985}',
      '.wc-speed-segments button[aria-pressed="true"]{background:#0369a1;color:#fff}',
      '.wc-journey-timeline{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;margin:2px 0 8px}',
      '.wc-timeline-step{position:relative;min-width:0;padding:7px 4px;border-top:3px solid #cbd5e1;text-align:center;color:#64748b}',
      '.wc-timeline-step strong{display:block;font-size:10px;line-height:1.2;white-space:normal}',
      '.wc-timeline-step[aria-current="step"]{border-color:#0284c7;color:#075985;background:rgba(224,242,254,.72)}',
      '.dark .wc-speed-segments{background:#0f172a;border-color:#334155}.dark .wc-speed-segments button{color:#bae6fd}.dark .wc-timeline-step{color:#94a3b8;border-color:#334155}.dark .wc-timeline-step[aria-current="step"]{color:#7dd3fc;border-color:#38bdf8;background:rgba(8,47,73,.5)}',
      '@media(max-width:560px){.wc-journey-timeline{grid-template-columns:repeat(3,minmax(0,1fr))}}',
      '.wc-hydro-quest{margin:0 0 10px;padding:11px 12px;border-left:3px solid #06b6d4;background:linear-gradient(90deg,rgba(8,47,73,.08),rgba(16,185,129,.08))}',
      '.wc-hydro-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.wc-hydro-kicker{display:block;font-size:10px;font-weight:900;text-transform:uppercase;color:#0284c7}.wc-hydro-head h4{margin:1px 0 0;font-size:16px;line-height:1.2;color:#0f172a}.wc-hydro-score{font-size:14px;color:#0369a1}',
      '.wc-hydro-progress{height:5px;margin:8px 0;background:#cbd5e1;overflow:hidden}.wc-hydro-progress span{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#10b981);transition:width 320ms ease}',
      '.wc-hydro-missions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.wc-hydro-mission{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:6px;min-width:0;padding:7px;background:rgba(255,255,255,.76);border:1px solid #cbd5e1;color:#475569}.wc-hydro-mission.is-complete{border-color:#34d399;background:rgba(236,253,245,.92);color:#065f46}.wc-hydro-mark{font-size:17px;font-weight:900}.wc-hydro-mission strong,.wc-hydro-mission small{display:block;line-height:1.2}.wc-hydro-mission strong{font-size:11px}.wc-hydro-mission small{margin-top:2px;font-size:9px;color:#64748b}.wc-hydro-state{font-size:9px;font-weight:900;text-transform:uppercase}',
      '.dark .wc-hydro-quest{background:linear-gradient(90deg,rgba(8,47,73,.7),rgba(6,78,59,.3))}.dark .wc-hydro-head h4{color:#f8fafc}.dark .wc-hydro-score,.dark .wc-hydro-kicker{color:#67e8f9}.dark .wc-hydro-progress{background:#334155}.dark .wc-hydro-mission{background:rgba(15,23,42,.82);border-color:#334155;color:#cbd5e1}.dark .wc-hydro-mission.is-complete{background:rgba(6,78,59,.46);border-color:#10b981;color:#a7f3d0}.dark .wc-hydro-mission small{color:#94a3b8}',
      '@media(max-width:700px){.wc-hydro-missions{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:460px){.wc-hydro-missions{grid-template-columns:1fr}}',
      '.wc-3d-loading{position:absolute;z-index:6;inset:0;display:grid;place-items:center;background:#041a2b;color:#bae6fd;font-size:12px;font-weight:800}',
      '.dark .wc-view-segments{background:#0f172a;border-color:#334155}.dark .wc-view-segments button{color:#cbd5e1}.dark .wc-3d-status{color:#7dd3fc}',
      '.dark .wc-journey-lens div{background:rgba(15,23,42,.9)}.dark .wc-journey-lens strong{color:#f8fafc}.dark .wc-journey-lens span{color:#94a3b8}',
      '@media(max-width:560px){.wc-journey-lens{grid-template-columns:1fr}}',
      '.wc-canvas-topbar{position:absolute;z-index:4;top:10px;left:10px;right:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;pointer-events:none}',
      '.wc-canvas-title{border-radius:12px;padding:8px 10px;background:rgba(15,23,42,.68);border:1px solid rgba(125,211,252,.28);backdrop-filter:blur(8px);color:#e0f2fe}',
      '.wc-canvas-title span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7dd3fc}',
      '.wc-canvas-title strong{display:block;font-size:14px;margin-top:1px}',
      '.wc-chip-row{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}',
      '.wc-chip{border-radius:999px;padding:6px 8px;font-size:11px;font-weight:800;color:#e0f2fe;background:rgba(8,47,73,.72);border:1px solid rgba(125,211,252,.28);backdrop-filter:blur(8px)}',
      '.wc-stage-rack{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
      '.wc-stage-rack button{min-height:34px}',
      '.wc-control-panel{box-shadow:0 12px 28px rgba(15,23,42,.10)}',
      '.wc-land-lab{border:1px solid rgba(16,185,129,.34);background:linear-gradient(135deg,rgba(236,253,245,.96),rgba(239,246,255,.96));padding:12px;margin-bottom:12px;box-shadow:0 12px 28px rgba(15,23,42,.09)}',
      '.wc-land-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
      '.wc-land-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '.wc-land-control{min-width:0}',
      '.wc-land-control label,.wc-land-control legend{display:block;font-size:11px;font-weight:800;color:#166534;margin-bottom:5px}',
      '.wc-land-segments{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}',
      '.wc-land-segments button{min-height:32px;padding:4px 5px;border:1px solid #a7f3d0;background:rgba(255,255,255,.88);color:#166534;font-size:10px;font-weight:800}',
      '.wc-land-segments button[aria-pressed="true"]{background:#047857;border-color:#047857;color:#fff}',
      '.wc-land-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}',
      '.wc-land-result{padding:9px 10px;border-left:3px solid #0ea5e9;background:rgba(255,255,255,.82)}',
      '.wc-land-result span{display:block;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b}',
      '.wc-land-result strong{display:block;margin-top:2px;font-size:15px;color:#0f172a}',
      '.dark .wc-land-lab{background:linear-gradient(135deg,rgba(6,78,59,.28),rgba(8,47,73,.32));border-color:rgba(52,211,153,.3)}',
      '.dark .wc-land-control label,.dark .wc-land-control legend{color:#6ee7b7}.dark .wc-land-segments button{background:#0f172a;border-color:#334155;color:#cbd5e1}.dark .wc-land-segments button[aria-pressed="true"]{background:#047857;color:#fff}.dark .wc-land-result{background:rgba(15,23,42,.82)}.dark .wc-land-result strong{color:#f8fafc}',
      '@media(max-width:640px){.wc-land-grid,.wc-land-results{grid-template-columns:1fr}}',
      '.wc-control-panel .grid.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '@media(max-width:840px){.wc-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wc-canvas-shell{height:360px!important}.wc-canvas-topbar{position:absolute;align-items:flex-start}.wc-chip-row{max-width:50%;justify-content:flex-end}.wc-control-panel .grid.grid-cols-3{grid-template-columns:1fr!important}}',
      '@media(max-width:560px){.wc-metric-grid{grid-template-columns:1fr}.wc-canvas-shell{height:380px!important}.wc-canvas-topbar{left:8px;right:8px;top:8px}.wc-canvas-title{padding:7px 8px}.wc-chip{font-size:10px;padding:5px 7px}.wc-chip-row{max-width:48%}.wc-viewport-dock{left:8px;right:8px;bottom:8px}.wc-viewport-state{width:100%}.wc-viewport-actions{width:100%;justify-content:flex-start}.wc-viewport-choice{bottom:128px}.wc-viewport-choice-grid{grid-template-columns:1fr}.wc-viewport-choice-grid button{min-height:44px}}',
      '.dark .wc-cycle-brief{background:linear-gradient(135deg,rgba(14,165,233,.14),rgba(16,185,129,.10) 58%,rgba(30,41,59,.76));border-color:rgba(56,189,248,.24)}',
      '.dark .wc-brief-title{color:#f8fafc}.dark .wc-brief-copy{color:#cbd5e1}.dark .wc-metric{background:rgba(15,23,42,.72);border-color:rgba(56,189,248,.22)}.dark .wc-metric strong{color:#f8fafc}.dark .wc-metric span{color:#94a3b8}'
    ].join('');
    if (document.head) document.head.appendChild(st);
  })();

  // ═══════════════════════════════════════════════════════
  // WATERSHED STEWARD: 10-YEAR MAINE WATERSHED CAMPAIGN
  // Parallel to Fire Ecology's Cultural Mosaic, Ecosystem's Conservation
  // Manager, and Epidemic Lab's Outbreak Response. Pedagogical core is
  // watershed-scale hydrology: how riparian buffers feed cold-water
  // streams, how beaver wetlands attenuate floods and restore floodplains,
  // how dam removal restores anadromous-fish connectivity, how
  // agricultural and suburban land use drive water quality.
  // ═══════════════════════════════════════════════════════

  var MAINE_WATERSHED_COMPONENTS = [
    {
      id: 'headwaterStreams', name: 'Headwater Streams', icon: '🏔️', color: '#0ea5e9',
      role: 'Cold-water indicator',
      desc: 'High-elevation forested streams. Native brook trout, native eastern brook trout, water temperature below 20°C. The cleanest water in the watershed; everything downstream is shaped by what happens here.',
      defaultState: { quality: 62, connectivity: 78, support: 60 }, targets: { quality: 78, connectivity: 80, support: 65 },
      deepDive: {
        knowledge: 'Headwater streams are first-order channels: small enough to step across, fed by springs and seeps, almost always shaded by mature forest. They make up roughly 60 to 80 percent of the total stream-mile length in a typical Maine watershed but receive a fraction of the regulatory attention. Native brook trout require water below about 20°C, dissolved oxygen above 7 mg/L, and woody debris for cover. Every degree of warming pushes their range north and uphill.',
        casework: 'The Eastern Brook Trout Joint Venture maps the status of native populations across the species range. Maine retains an unusually large portion of historic native brook trout habitat compared to the rest of the Northeast. Most successful headwater protection has come from upper-watershed conservation easements and replacement of undersized culverts that act as warm-water bottlenecks.',
        modernContext: 'Climate change is the central long-term threat to Maine headwater streams. Several Maine Audubon and Wabanaki community projects have led culvert replacement and shade-tree planting campaigns. The 2023 Maine Climate Action Plan named cold-water-fishery protection as a priority but funding has lagged.'
      }
    },
    {
      id: 'riverMainstem', name: 'River Mainstem', icon: '🌊', color: '#1d4ed8',
      role: 'Migratory fish corridor',
      desc: 'The big channel through the watershed. Historically the route for Atlantic salmon, alewife, sea-run brook trout, eels, sturgeon. In Maine, dam barriers block most of these runs; recent removals (Edwards Dam 1999, Fort Halifax 2008, Veazie 2012, Great Works 2013) reopened sections.',
      defaultState: { quality: 48, connectivity: 25, support: 65 }, targets: { quality: 70, connectivity: 70, support: 70 },
      deepDive: {
        knowledge: 'Anadromous fish (born in fresh water, mature at sea, return upstream to spawn) include Atlantic salmon, alewife, blueback herring, American shad, sea lamprey, and sea-run brook trout. Each species has different barrier-passage tolerance: alewife can use modest fish ladders; Atlantic salmon need near-full passage; sturgeon need almost-complete connectivity. Dam barriers degrade water quality upstream too: stagnant impoundments warm, accumulate sediment, and lose dissolved oxygen.',
        casework: 'The Penobscot River Restoration Project (Penobscot Nation, NGOs, hydro companies) removed Veazie Dam in 2012 and Great Works Dam in 2013 while preserving most generation through upgrades elsewhere. River herring returns increased over 1000-fold in the first decade post-removal. The Kennebec saw Edwards Dam come down in 1999 and Fort Halifax in 2008. The Sebasticook tributary alone now hosts the largest river-herring run on the East Coast.',
        modernContext: 'The Penobscot Nation has led the legal, political, and ecological work on its ancestral river. Ongoing dam-removal campaigns target the Mattaceunk, Milford, and lower Kennebec dams. NOAA and the Atlantic Salmon Federation track returns annually; numbers are recovering but still well below historic.'
      }
    },
    {
      id: 'floodplainWetlands', name: 'Floodplain Wetlands', icon: '🪷', color: '#16a34a',
      role: 'Beaver-built flood storage',
      desc: 'Beaver dam complexes and adjacent wet meadows. Slow flood pulses, recharge groundwater, filter nutrients, support amphibians, waterfowl, moose, otter. Beaver Dam Analogs (BDAs) mimic this work where beavers have not returned.',
      defaultState: { quality: 55, connectivity: 60, support: 50 }, targets: { quality: 75, connectivity: 70, support: 65 },
      deepDive: {
        knowledge: 'Beaver-built wetlands are the textbook example of ecosystem engineering. A single beaver complex can create up to 10 acres of wet meadow that stores flood water, recharges groundwater, traps sediment, filters nutrients, and supports moose, waterfowl, river otter, brook trout, and amphibians. Wetland complexes also act as firebreaks during dry years. North American beaver populations were estimated at 60 to 400 million pre-contact; the European fur trade crashed them to under 100,000 by 1900.',
        casework: 'Beaver populations have recovered to perhaps 10 to 15 million across North America but remain far below historic in most Northeast watersheds. Beaver Dam Analog (BDA) restoration mimics beaver work with imported wood, rock, and posts; it is increasingly used where beavers have not naturally recolonized. The Methow Beaver Project in Washington and similar Maine pilots have shown that BDAs can trigger natural beaver return within 2 to 4 years.',
        modernContext: 'Beavers face conflict with road managers and downstream landowners over flooding. Lethal trapping continues in Maine. Beaver Deceiver flow-control devices are the non-lethal alternative; Wabanaki communities have led some of the strongest beaver-protection advocacy in the region. Climate-resilience planners increasingly cite beavers as low-cost natural infrastructure.'
      }
    },
    {
      id: 'forestBuffer', name: 'Forested Buffer Zones', icon: '🌲', color: '#15803d',
      role: 'Riparian shade and filter',
      desc: 'The strip of mature forest along stream banks. Shade keeps water cold, roots stabilize banks, leaf litter feeds aquatic insects, wood falls in to create habitat. A 50-foot intact buffer is the single most cost-effective stream protection.',
      defaultState: { quality: 58, connectivity: 50, support: 60 }, targets: { quality: 75, connectivity: 70, support: 70 },
      deepDive: {
        knowledge: 'Riparian buffers do five distinct jobs at once: shade keeps water cold for trout and salmon parr, root systems stabilize banks against erosion, leaf litter is the primary food source for stream insects (which feed fish), woody debris falls in to create pools and cover, and the buffer filters runoff from adjacent agricultural and developed land. The pioneering research by Allan and others established that even a 30-foot intact buffer captures most of the runoff-quality benefit, and a 100-foot buffer provides the full hydrological function.',
        casework: 'Maine\'s Shoreland Zoning Act (1971) regulates the first 75 feet around great ponds and 250 feet around rivers, but enforcement is uneven and exemptions for development are routine. Land trust easements have been more effective than regulation in many Maine watersheds. The Maine Coast Heritage Trust and Atlantic Salmon Federation have funded buffer-replanting on hundreds of farm streams; cover-cropping plus tree-row plantings cut runoff measurably within 3 to 5 years.',
        modernContext: 'Buffer policy in Maine remains fragmented across jurisdictions. The strongest buffer protections often come from voluntary landowner agreements rather than zoning. Climate-driven storm events make buffers MORE important (they hold the streambank during high flows), so the federal Infrastructure Investment and Jobs Act has lifted buffer-restoration funding.'
      }
    },
    {
      id: 'agriculturalWatershed', name: 'Agricultural Watershed', icon: '🚜', color: '#a16207',
      role: 'Nutrient + sediment source',
      desc: 'Dairy farms, hay fields, row crops, blueberry barrens. The dominant land use in central Maine watersheds. Manure runoff, fertilizer, sediment from tilled land all flow downstream. BMPs (Best Management Practices) can cut runoff by 50-80%.',
      defaultState: { quality: 45, connectivity: 55, support: 55 }, targets: { quality: 65, connectivity: 60, support: 65 },
      deepDive: {
        knowledge: 'Agricultural land delivers three primary watershed insults: sediment from tilled or overgrazed land, nutrients (nitrogen and phosphorus) from manure and fertilizer, and pathogens from livestock waste. Best Management Practices include cover cropping, contour farming, livestock fencing from streams, manure storage upgrades, riparian buffer easements, and reduced-till or no-till cropping. Documented BMP implementations cut watershed nutrient export by 50 to 80 percent on participating farms.',
        casework: 'Maine has roughly 7,500 farms covering about 1.3 million acres. The Maine Soil and Water Conservation Districts operate the state-side BMP outreach; USDA NRCS provides federal cost-share. Dairy farms in the Sebasticook and Kennebec watersheds have implemented manure-handling and buffer projects with measurable downstream quality improvement; comparable work in the St. John watershed has helped Aroostook potato production.',
        modernContext: 'Farm consolidation pressures BMP adoption (the smallest farms have the thinnest margins to invest in capital improvements). PFAS contamination from historic biosolid spreading has surfaced as a major Maine farm-water issue post-2022, with state-led testing and remediation programs. The Maine Farmland Trust links farmland protection to watershed protection.'
      }
    },
    {
      id: 'suburbanEdges', name: 'Suburban Edges', icon: '🏘️', color: '#7c3aed',
      role: 'Stormwater + impervious surface',
      desc: 'Subdivisions, parking lots, lawns. Impervious surfaces deliver pulses of warm polluted water to streams during storms. Lawn fertilizer and pet waste are the modern eutrophication inputs. Green stormwater infrastructure can offset the impact.',
      defaultState: { quality: 50, connectivity: 60, support: 50 }, targets: { quality: 65, connectivity: 65, support: 65 },
      deepDive: {
        knowledge: 'Impervious surface (roads, roofs, parking lots, driveways) shapes urban and suburban hydrology more than any other variable. Above 10 percent watershed-wide impervious cover, stream biology measurably degrades; above 25 percent, most native fish populations are gone. Stormwater pulses are warm, fast, and pollutant-laden: lawn fertilizer, dog waste, vehicle drip, road salt, sediment from construction. Conventional drainage (curb, gutter, pipe) delivers all of it directly to streams.',
        casework: 'Portland, ME has documented stream impairment along the Capisic Brook and Stroudwater drainages tied directly to impervious cover. Green Stormwater Infrastructure (rain gardens, swales, permeable pavement, detention basins, green roofs) can offset 50 to 80 percent of the conventional pulse. The Maine Stormwater BMP Manual is the regulatory reference; municipal stormwater (MS4) permits require larger towns to implement.',
        modernContext: 'Most suburban watershed work in Maine happens at municipal scale through MS4 permits, town stormwater ordinances, and watershed-association advocacy. Climate-resilience funding under the Infrastructure Investment and Jobs Act has dramatically increased available capital for retrofit. The biggest challenge is older developments built before stormwater regulation that have no easy retrofit path.'
      }
    }
  ];

  var STEWARD_TECHNIQUES = [
    { id: 'bufferPlant', name: 'Riparian buffer planting', icon: '🌲', hours: 5, desc: 'Plant native trees and shrubs along stream banks. Slow buildup that pays off in shade, bank stability, and nutrient filtering for decades.', effects: { quality: 8, connectivity: 4 }, appliesTo: ['forestBuffer', 'headwaterStreams'] },
    { id: 'beaverDamAnalog', name: 'Beaver Dam Analog', icon: '🦫', hours: 6, desc: 'Build a low-cost wood-and-stone structure that mimics beaver dam function. Encourages real beaver recolonization. Restores wet meadow conditions.', effects: { quality: 11, connectivity: 6 }, appliesTo: ['floodplainWetlands'] },
    { id: 'damRemoval', name: 'Dam removal', icon: '🪨', hours: 15, desc: 'Remove or breach a barrier dam. Huge connectivity gain. Politically expensive: some landowners and recreational users will be upset.', effects: { connectivity: 28, quality: 8, support: -12 }, appliesTo: ['riverMainstem'] },
    { id: 'fishPassage', name: 'Fish passage installation', icon: '🐟', hours: 10, desc: 'Build a fish ladder or nature-like bypass around a barrier. Cheaper than dam removal and politically easier, but less effective for some species.', effects: { connectivity: 14, quality: 2 }, appliesTo: ['riverMainstem'] },
    { id: 'bmpOutreach', name: 'BMP outreach', icon: '🤝', hours: 4, desc: 'Work with farmers on Best Management Practices: cover crops, livestock fencing, manure storage, buffer easements. Real Maine programs.', effects: { quality: 7, support: 4 }, appliesTo: ['agriculturalWatershed'] },
    { id: 'easement', name: 'Conservation easement', icon: '📜', hours: 12, desc: 'Pay a landowner to permanently protect a riparian or upland parcel. The single highest-impact and highest-cost intervention.', effects: { quality: 15, connectivity: 12, support: 3 }, appliesTo: 'any' },
    { id: 'stormwater', name: 'Stormwater retrofit', icon: '🌧️', hours: 8, desc: 'Install rain gardens, swales, permeable pavement, or detention basins in developed areas. Slows and filters stormwater pulses.', effects: { quality: 13, connectivity: 3 }, appliesTo: ['suburbanEdges'] },
    { id: 'citizenScience', name: 'Citizen science monitoring', icon: '🔬', hours: 3, desc: 'Train volunteer water-quality monitors. Slow but builds long-term community support and detects problems early.', effects: { quality: 2, support: 7 }, appliesTo: 'any' },
    { id: 'publicEd', name: 'Public education + River Days', icon: '📣', hours: 3, desc: 'Watershed festivals, school programs, paddle events. Build community ownership of the watershed.', effects: { support: 9 }, appliesTo: 'any' },
    { id: 'rest', name: 'Hold steady', icon: '🍃', hours: 0, desc: 'No active intervention this year. Some natural recovery; some drift.', effects: {}, appliesTo: 'any' }
  ];

  var STEWARD_EVENTS = [
    { id: 'majorFlood', name: 'Major flood', icon: '🌊', desc: 'A 10-year flood scoured stream banks and washed sediment downstream. Buffers without good root systems lost ground.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'forestBuffer' && c.quality < 65) c.quality = Math.max(0, c.quality - 7); if (c.id === 'floodplainWetlands') c.quality = Math.min(100, c.quality + 3); }); } },
    { id: 'drought', name: 'Drought year', icon: '☀️', desc: 'Low summer flows raised stream temperatures and concentrated pollutants. Cold-water species took a hit.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'headwaterStreams') c.quality = Math.max(0, c.quality - 8); if (c.id === 'riverMainstem') c.quality = Math.max(0, c.quality - 4); }); } },
    { id: 'sewageRelease', name: 'Sewage discharge', icon: '⚠️', desc: 'A wastewater treatment plant bypass during a heavy storm released untreated discharge. Mainstem quality drops.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'riverMainstem' || c.id === 'suburbanEdges') c.quality = Math.max(0, c.quality - 10); }); } },
    { id: 'algalBloom', name: 'Cyanobacteria bloom', icon: '🟢', desc: 'A cyanobacteria bloom closed swim beaches and prompted advisories. Public support shifts toward stronger watershed protection.', apply: function(comps) { comps.forEach(function(c) { c.support = Math.min(100, c.support + 5); if (c.id === 'agriculturalWatershed') c.quality = Math.max(0, c.quality - 5); }); } },
    { id: 'volunteerSurge', name: 'Volunteer surge', icon: '🙌', desc: 'A successful River Day brought 200+ volunteers. Citizen monitoring + cleanup boost across the board.', apply: function(comps) { comps.forEach(function(c) { c.support = Math.min(100, c.support + 7); c.quality = Math.min(100, c.quality + 2); }); } },
    { id: 'farmSold', name: 'Farm sold for development', icon: '🚜', desc: 'A long-running family dairy operation sold to a residential developer. BMP gains on that land reset.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'agriculturalWatershed') c.quality = Math.max(0, c.quality - 6); if (c.id === 'suburbanEdges') c.quality = Math.max(0, c.quality - 3); }); } },
    { id: 'salmonReturn', name: 'Atlantic salmon detected', icon: '🐟', desc: 'Returning Atlantic salmon (or alewife runs) detected in the mainstem. Major morale boost and federal attention.', apply: function(comps, state) { if (state.connectivityBoosts >= 1) comps.forEach(function(c) { c.support = Math.min(100, c.support + 10); }); else comps.forEach(function(c) { c.support = Math.min(100, c.support + 4); }); } },
    { id: 'beaverExpand', name: 'Beaver complex expands', icon: '🦫', desc: 'Beavers expanded their territory and built three new dam complexes in the floodplain.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'floodplainWetlands') { c.quality = Math.min(100, c.quality + 9); c.connectivity = Math.min(100, c.connectivity + 5); } }); } },
    { id: 'fundingBump', name: 'EPA / FEMA grant', icon: '💵', desc: 'A federal grant lands. Stewardship hours next year will be +5.', apply: function(comps, state) { state.fundingBonusNextYear = (state.fundingBonusNextYear || 0) + 5; } },
    { id: 'erosionEvent', name: 'Major bank erosion', icon: '🏞️', desc: 'A bend in the river undercut a road shoulder. Public attention focuses on streambank stabilization.', apply: function(comps) { comps.forEach(function(c) { if (c.id === 'forestBuffer') c.support = Math.min(100, c.support + 8); }); } }
  ];

  // Hydrological cascade rules. These tie the watershed components together
  // the way real watersheds work: buffers feed headwaters, beavers create
  // floodplain function, low ag runoff cleans up the mainstem, removed
  // barriers + good buffers bring fish runs back.
  // Helper: null-safe id lookup. Falls back to inline find if window.StemLab isn't loaded.
  var _wcById = function(arr, id) { return window.StemLab && window.StemLab.findById ? window.StemLab.findById(arr, id) : null; };
  var STEWARD_FEEDBACK_RULES = [
    { id: 'bufferFeedsHeadwaters', when: function(s) { var c = _wcById(s, 'forestBuffer'); return !!c && c.quality > 70; }, apply: function(s) { var h = _wcById(s, 'headwaterStreams'); if (h) h.quality = Math.min(100, h.quality + 4); }, msg: 'Healthy forest buffers cooled and cleaned headwater streams.' },
    { id: 'beaverHelpsFloodplain', when: function(s) { var c = _wcById(s, 'floodplainWetlands'); return !!c && c.quality > 60; }, apply: function(s) { var m = _wcById(s, 'riverMainstem'); if (m) { m.quality = Math.min(100, m.quality + 3); m.connectivity = Math.min(100, m.connectivity + 2); } }, msg: 'Beaver-built wetlands attenuated flood pulses and improved mainstem water quality.' },
    { id: 'agCleansUp', when: function(s) { var c = _wcById(s, 'agriculturalWatershed'); return !!c && c.quality > 60; }, apply: function(s) { var m = _wcById(s, 'riverMainstem'); if (m) m.quality = Math.min(100, m.quality + 4); }, msg: 'Lower agricultural runoff cleaned up the river mainstem.' },
    { id: 'runRestoration', when: function(s) { var m = _wcById(s, 'riverMainstem'); var b = _wcById(s, 'forestBuffer'); return !!m && !!b && m.connectivity > 60 && b.quality > 60; }, apply: function(s) { s.forEach(function(c) { c.support = Math.min(100, c.support + 2); }); }, msg: 'Connected, shaded river segments support documented anadromous fish returns.' }
  ];

  // Parallel "coaching" view of the feedback rules above: the same thresholds,
  // but readable so the year-review debrief can (a) explain WHY a cascade fired
  // and (b) flag a near-miss — a component sitting just under a threshold, so the
  // student learns which single move would unlock a free downstream benefit.
  // Kept in lockstep with STEWARD_FEEDBACK_RULES by hand (only 4 rules).
  var STEWARD_CASCADE_HINTS = [
    { id: 'bufferFeedsHeadwaters', comp: 'forestBuffer', field: 'quality', threshold: 70,
      fired: 'Your forest buffers crossed 70% quality — shade cooled the water and roots filtered it, so cleaner cold water flowed downhill into the headwaters (+quality there, for free).',
      near: 'Forest-buffer quality is at {v}. Get it past 70 (one riparian buffer planting) and it will cool and clean the headwaters automatically every year after.' },
    { id: 'beaverHelpsFloodplain', comp: 'floodplainWetlands', field: 'quality', threshold: 60,
      fired: 'Your floodplain wetlands crossed 60% — beaver-built storage slowed the flood pulses and let sediment settle, improving mainstem water quality downstream.',
      near: 'Floodplain wetlands sit at {v}. A single Beaver Dam Analog would push past 60 and start cleaning the mainstem for you.' },
    { id: 'agCleansUp', comp: 'agriculturalWatershed', field: 'quality', threshold: 60,
      fired: 'Farm runoff dropped enough (agricultural quality over 60) that the mainstem cleaned up on its own — less nitrogen, phosphorus, and sediment reaching the river.',
      near: 'Agricultural quality is {v}. BMP outreach is cheap (4h) and would tip it past 60, cleaning the mainstem via the runoff feedback.' },
    { id: 'runRestoration', comp: 'riverMainstem', field: 'connectivity', threshold: 60,
      fired: 'A connected, shaded mainstem (connectivity over 60, with healthy buffers) is now supporting documented anadromous fish returns — morale rose across every component.',
      near: 'Mainstem connectivity is {v}. Cross 60 with buffers already healthy and you unlock fish returns plus a support boost watershed-wide.' }
  ];

  var STEWARD_DIFFICULTIES = {
    volunteer:   { id: 'volunteer',   label: 'New Volunteer',         hoursPerYear: 24, eventSkip: 0.3, severity: 0.8, desc: '24 hours / year, gentler events. For first runs.' },
    coordinator: { id: 'coordinator', label: 'Watershed Coordinator', hoursPerYear: 18, eventSkip: 0,   severity: 1.0, desc: '18 hours / year, standard events. Default.' },
    director:    { id: 'director',    label: 'Watershed Director',    hoursPerYear: 14, eventSkip: 0,   severity: 1.4, desc: '14 hours / year, harsher events. Real constraint.' }
  };

  function defaultStewardState() {
    var diff = STEWARD_DIFFICULTIES.coordinator;
    return {
      phase: 'setup',
      year: 1,
      maxYears: 10,
      difficulty: diff.id,
      hoursPerYear: diff.hoursPerYear,
      hoursLeft: diff.hoursPerYear,
      components: MAINE_WATERSHED_COMPONENTS.map(function(c) { return Object.assign({ id: c.id }, c.defaultState); }),
      yearActions: [],
      yearLog: [],
      lastEvent: null,
      cascadesFiredThisYear: [],
      finalOutcome: null,
      connectivityBoosts: 0,
      fundingBonusNextYear: 0,
      deepDiveComponent: null,
      firstTipDismissed: false,
      seed: 'steward-' + (new Date()).getFullYear() + (new Date()).getMonth() + (new Date()).getDate() + '-' + Math.floor(Math.random() * 9999)
    };
  }

  function getWatershedComponent(id) {
    for (var i = 0; i < MAINE_WATERSHED_COMPONENTS.length; i++) if (MAINE_WATERSHED_COMPONENTS[i].id === id) return MAINE_WATERSHED_COMPONENTS[i];
    return null;
  }

  function stewardRng(seed, year, purpose) {
    var s = (seed || 'default') + ':' + year + ':' + purpose;
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return function() {
      h |= 0; h = (h + 0x6D2B79F5) | 0;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var WATER_CYCLE_VOCAB = {
    'evaporation': 'The process where liquid water absorbs thermal energy and changes into water vapor gas, rising into the atmosphere.',
    'condensation': 'The process where water vapor gas cools and changes back into liquid water droplets, forming clouds.',
    'precipitation': 'Water falling from clouds to Earth\'s surface as rain, snow, sleet, or hail when droplets grow too heavy.',
    'collection': 'The accumulation of water in oceans, lakes, rivers, and underground reservoirs, completing the surface loop.',
    'transpiration': 'The evaporation of water from plant leaves through tiny pores called stomata, acting as a natural pump.',
    'infiltration': 'The process by which water on the ground surface enters the soil and rocks, replenishing groundwater.',
    'sublimation': 'The direct transition of water from solid ice or snow into water vapor gas, bypassing the liquid phase.',
    'aquifer': 'An underground layer of water-bearing permeable rock, gravel, sand, or silt from which groundwater can be extracted.',
    'watershed': 'An area of land where all of the water that falls in it drains off into a common outlet like a river or bay.',
    'riparian buffer': 'A vegetated area next to a water body, usually forested, which helps shade streams and filter run-off.',
    'Darcy\'s Law': 'A mathematical equation that describes the flow of a fluid through a porous medium, governing groundwater.',
    'PFAS': 'Synthetic per- and polyfluoroalkyl substances that contaminate water supplies and resist natural breakdown.',
    'latent heat': 'The heat energy absorbed or released by water during a phase change (like liquid to gas) without changing temperature.',
    'Bowen ratio': 'The ratio of sensible heat to latent heat loss from the surface, determining local climate feedbacks.',
    'Clausius-Clapeyron': 'The thermodynamic relationship showing that atmospheric moisture capacity increases by about 7% per degree Celsius of warming.'
  };

  var WATER_CYCLE_CHALLENGES = [
    { id: 'complete_journey', name: 'Droplet Cycle', desc: 'Complete 1 full water droplet journey cycle', icon: '💧', rp: 25 },
    { id: 'explore_all_stages', name: 'Global Explorer', desc: 'View all 5 water cycle stages', icon: '🌍', rp: 35 },
    { id: 'adjust_climate', name: 'Climate Experimenter', desc: 'Adjust solar, temperature, or wind sliders in the Climate Lab', icon: '🌡️', rp: 20 },
    { id: 'quiz_pass', name: 'Hydrologist Scholar', desc: 'Answer a quiz question correctly', icon: '🎓', rp: 15 },
    { id: 'vocabulary_studied', name: 'Word Power', desc: 'Study 3 water cycle vocabulary flashcards', icon: '📝', rp: 20 },
    { id: 'stewardship_win', name: 'Watershed Champion', desc: 'Achieve a "Watershed Recovery" or "Recovering Watershed" outcome in the campaign', icon: '🏆', rp: 50 },
    { id: 'myth_buster', name: 'Myth Buster', desc: 'Answer 3 water myths (True/False)', icon: '🧠', rp: 30 }
  ];

  var WATER_CYCLE_QUIZZES = {
    'K-2': [
      {
        q: 'What makes puddles disappear on sunny days?',
        a: 'The sun heats the water',
        opts: ['The ground drinks it', 'The sun heats the water', 'Wind blows it away', 'It goes to sleep'],
        concept: 'evaporation',
        wrongFeedback: {
          'The ground drinks it': 'While some water soaks into the ground, puddles on sidewalks and streets mostly disappear because the sun heats them up into vapor.',
          'Wind blows it away': 'Wind can help water evaporate faster by moving air, but the sun\'s heat is the main reason liquid water changes into gas.',
          'It goes to sleep': 'Water molecules never sleep! The sun\'s energy makes them move faster and float up into the sky.'
        }
      },
      {
        q: 'What are clouds made of?',
        a: 'Tiny water drops',
        opts: ['Cotton', 'Tiny water drops', 'Smoke', 'Air bubbles'],
        concept: 'condensation',
        wrongFeedback: {
          'Cotton': 'Clouds look soft like cotton, but they are actually made of billions of tiny liquid water droplets floating in the air.',
          'Smoke': 'Smoke comes from fires, but clouds in the sky are made of clean water droplets and ice crystals.',
          'Air bubbles': 'Air bubbles are trapped inside water, but clouds are water droplets trapped in the air!'
        }
      },
      {
        q: 'What falls from clouds?',
        a: 'Rain and snow',
        opts: ['Stars', 'Rain and snow', 'Leaves', 'Rocks'],
        concept: 'precipitation',
        wrongFeedback: {
          'Stars': 'Stars are huge, burning suns far away in space. They do not fall from clouds!',
          'Leaves': 'Leaves fall from trees in autumn, not from clouds in the sky.',
          'Rocks': 'Rocks are heavy parts of the ground. Only liquid or frozen water falls from clouds.'
        }
      },
      {
        q: 'Where does rain go after it falls?',
        a: 'Rivers, lakes, and oceans',
        opts: ['It disappears', 'Back up to the sky', 'Rivers, lakes, and oceans', 'Into outer space'],
        concept: 'collection',
        wrongFeedback: {
          'It disappears': 'Water does not vanish! It collects in lakes, flows down rivers, and fills the oceans.',
          'Back up to the sky': 'Rain must collect on the ground first before the sun can heat it to rise back up later.',
          'Into outer space': 'Earth\'s gravity keeps water on our planet. It collects in oceans and lakes rather than escaping into space.'
        }
      },
      {
        q: 'How do plants drink water?',
        a: 'Through their roots',
        opts: ['Through their leaves', 'Through their roots', 'Through their flowers', 'They don\'t drink water'],
        concept: 'transpiration',
        wrongFeedback: {
          'Through their leaves': 'Leaves can absorb a tiny bit of moisture, but plants get almost all their water by drinking it from the soil through their roots.',
          'Through their flowers': 'Flowers attract bees and make seeds, but they do not drink water from the soil.',
          'They don\'t drink water': 'All living things need water to survive, including plants!'
        }
      },
      {
        q: 'What does the sun do to ocean water?',
        a: 'Heats it up so it rises as vapor',
        opts: ['Freezes it', 'Heats it up so it rises as vapor', 'Turns it green', 'Makes it salty'],
        concept: 'evaporation',
        wrongFeedback: {
          'Freezes it': 'The sun provides warm heat, which warms water up instead of freezing it into ice.',
          'Turns it green': 'Algae and plants can make water look green, but the sun heats it up so it evaporates.',
          'Makes it salty': 'Ocean water is already salty because of dissolved minerals, not because of the sun.'
        }
      },
      {
        q: 'What happens when water vapor gets cold up high?',
        a: 'It turns into cloud drops',
        opts: ['It turns into cloud drops', 'It becomes a star', 'It stays invisible', 'It catches fire'],
        concept: 'condensation',
        wrongFeedback: {
          'It becomes a star': 'Stars are massive bodies in space, whereas water vapor just condenses into cloud droplets.',
          'It stays invisible': 'Water vapor gas is invisible, but when it cools and condenses, it becomes visible liquid droplets (clouds).',
          'It catches fire': 'Water does not catch fire! Cooling vapor turns back into liquid water.'
        }
      },
      {
        q: 'Can water underground come back up?',
        a: 'Yes, through springs and wells',
        opts: ['No, never', 'Yes, through springs and wells', 'Only if you dig', 'Only on rainy days'],
        concept: 'infiltration',
        wrongFeedback: {
          'No, never': 'Groundwater is part of the cycle. It flows slowly and emerges at natural springs or is pumped up through wells.',
          'Only if you dig': 'Digger wells do reach groundwater, but natural springs bubble up to the surface without any digging.',
          'Only on rainy days': 'Springs flow continuously, even on sunny days, because groundwater moves very slowly.'
        }
      }
    ],
    '3-5': [
      {
        q: 'What drives evaporation?',
        a: 'Solar energy',
        opts: ['Wind', 'Solar energy', 'Gravity', 'Moon'],
        concept: 'evaporation',
        wrongFeedback: {
          'Wind': 'Wind helps speed up evaporation by carrying moist air away, but solar energy is the heat source that drives the phase change.',
          'Gravity': 'Gravity pulls water downward (precipitation, runoff), whereas solar energy drives it upward via evaporation.',
          'Moon': 'The Moon causes ocean tides but does not heat water to drive evaporation.'
        }
      },
      {
        q: 'What forms clouds?',
        a: 'Condensation',
        opts: ['Evaporation', 'Precipitation', 'Condensation', 'Infiltration'],
        concept: 'condensation',
        wrongFeedback: {
          'Evaporation': 'Evaporation is liquid water turning into invisible gas. Clouds are formed when this gas cools and turns back to liquid.',
          'Precipitation': 'Precipitation is rain or snow falling out of clouds, not the process that forms the clouds themselves.',
          'Infiltration': 'Infiltration is water soaking into the soil, which is the opposite of cloud formation.'
        }
      },
      {
        q: 'Where does most evaporation occur?',
        a: 'Oceans',
        opts: ['Lakes', 'Rivers', 'Oceans', 'Soil'],
        concept: 'evaporation',
        wrongFeedback: {
          'Lakes': 'Lakes evaporate water, but oceans cover over 70% of Earth\'s surface and contain 97% of its water, making them the primary source.',
          'Rivers': 'Rivers flow to the sea and have small surface areas compared to the vast oceans.',
          'Soil': 'Soil releases moisture (evapotranspiration), but oceans are by far the largest source of atmospheric moisture.'
        }
      },
      {
        q: 'What is transpiration?',
        a: 'Water release from plants',
        opts: ['Rain falling', 'Water release from plants', 'Snow melting', 'Rivers flowing'],
        concept: 'transpiration',
        wrongFeedback: {
          'Rain falling': 'Rain falling is precipitation. Transpiration is water rising up through plants and escaping from their leaves.',
          'Snow melting': 'Snow melting is a phase change from solid to liquid, not related to plant transpiration.',
          'Rivers flowing': 'Rivers flowing is runoff or collection, not a biological release of water.'
        }
      },
      {
        q: 'How much of Earth\'s water is freshwater?',
        a: '3%',
        opts: ['3%', '10%', '25%', '50%'],
        concept: 'collection',
        wrongFeedback: {
          '10%': 'Freshwater is much scarcer! Only 3% of Earth\'s water is fresh, and most of that is frozen in ice caps.',
          '25%': 'A quarter of Earth\'s water is not fresh. Over 97% is salty ocean water.',
          '50%': 'Half of Earth\'s water is not fresh. Freshwater is a tiny fraction of global water.'
        }
      },
      {
        q: 'What are stomata?',
        a: 'Tiny pores on leaves',
        opts: ['Types of clouds', 'Tiny pores on leaves', 'Underground rivers', 'Rain droplets'],
        concept: 'transpiration',
        wrongFeedback: {
          'Types of clouds': 'Clouds are made of condensed water droplets. Stomata are biological structures on plant leaves.',
          'Underground rivers': 'Underground channels are part of aquifers. Stomata are tiny leaf pores used for gas exchange.',
          'Rain droplets': 'Rain droplets are precipitation. Stomata are pores that let plants release water vapor.'
        }
      },
      {
        q: 'What is sublimation?',
        a: 'Ice turning directly to vapor',
        opts: ['Ice turning directly to vapor', 'Water freezing', 'Rain evaporating', 'Clouds forming'],
        concept: 'sublimation',
        wrongFeedback: {
          'Water freezing': 'Freezing is liquid water turning to solid ice. Sublimation bypasses the liquid state entirely.',
          'Rain evaporating': 'Rain evaporating is liquid turning to gas, whereas sublimation starts with solid ice or snow.',
          'Clouds forming': 'Cloud formation is condensation (gas to liquid), not solid to gas.'
        }
      },
      {
        q: 'How does deforestation affect the water cycle?',
        a: 'Reduces transpiration and increases runoff',
        opts: ['Increases evaporation', 'Reduces transpiration and increases runoff', 'Creates more clouds', 'Has no effect'],
        concept: 'watershed',
        wrongFeedback: {
          'Increases evaporation': 'Removing trees reduces the total leaf area, which decreases transpiration and makes the local climate drier.',
          'Creates more clouds': 'Fewer trees mean less moisture is pumped into the air, leading to fewer clouds and less local rainfall.',
          'Has no effect': 'Trees are key hydrologic pumps. Removing them severely disrupts local water cycles and increases flooding.'
        }
      }
    ],
    '6-8': [
      {
        q: 'What drives evaporation?',
        a: 'Solar energy',
        opts: ['Wind', 'Solar energy', 'Gravity', 'Moon'],
        concept: 'evaporation',
        wrongFeedback: {
          'Wind': 'Wind enhances the evaporation rate by removing the boundary layer of moist air, but solar radiation is the thermodynamic driver.',
          'Gravity': 'Gravity is a downward force driving infiltration and precipitation, whereas solar energy drives water upward.',
          'Moon': 'The Moon drives tides but does not supply the heat energy required for the latent heat of vaporization.'
        }
      },
      {
        q: 'What forms clouds?',
        a: 'Condensation',
        opts: ['Evaporation', 'Precipitation', 'Condensation', 'Infiltration'],
        concept: 'condensation',
        wrongFeedback: {
          'Evaporation': 'Evaporation is liquid transitioning to gas. Clouds form when this gas cools and condenses back into liquid droplets.',
          'Precipitation': 'Precipitation occurs when cloud droplets grow too heavy and fall, not when clouds form.',
          'Infiltration': 'Infiltration is surface water soaking into ground soil, unrelated to atmospheric clouds.'
        }
      },
      {
        q: 'Where does most evaporation occur?',
        a: 'Oceans',
        opts: ['Lakes', 'Rivers', 'Oceans', 'Soil'],
        concept: 'evaporation',
        wrongFeedback: {
          'Lakes': 'Lakes contribute a tiny fraction of global evaporation compared to the vast surface area of the oceans.',
          'Rivers': 'Rivers represent a tiny portion of global surface water and account for very little evaporation.',
          'Soil': 'Soil moisture evaporation is limited by capillary action and plant coverage.'
        }
      },
      {
        q: 'What is transpiration?',
        a: 'Water release from plants',
        opts: ['Rain falling', 'Water release from plants', 'Snow melting', 'Rivers flowing'],
        concept: 'transpiration',
        wrongFeedback: {
          'Rain falling': 'Rain falling is precipitation. Transpiration is water vapor release from plant stomata.',
          'Snow melting': 'Melting is a solid-to-liquid transition, not a biological release of moisture.',
          'Rivers flowing': 'River flow is runoff and collection, not a plant-driven water transport process.'
        }
      },
      {
        q: 'How much of Earth\'s water is freshwater?',
        a: '3%',
        opts: ['3%', '10%', '25%', '50%'],
        concept: 'collection',
        wrongFeedback: {
          '10%': 'Freshwater is much scarcer! Only 3% is fresh, and about 68% of that is locked in glaciers and ice sheets.',
          '25%': 'Over 97% of Earth\'s water is salty ocean water. Fresh water is a tiny portion.',
          '50%': 'Half of Earth\'s water is saline. Freshwater is a scarce resource.'
        }
      },
      {
        q: 'What are stomata?',
        a: 'Tiny pores on leaves',
        opts: ['Types of clouds', 'Tiny pores on leaves', 'Underground rivers', 'Rain droplets'],
        concept: 'transpiration',
        wrongFeedback: {
          'Types of clouds': 'Clouds are made of condensed vapor. Stomata are microscopic pores in plant epidermal layers.',
          'Underground rivers': 'Subsurface channels are aquifers. Stomata are biological valves regulating leaf transpiration.',
          'Rain droplets': 'Rain droplets are precipitation. Stomata are microscopic openings on leaves.'
        }
      },
      {
        q: 'What is sublimation?',
        a: 'Ice turning directly to vapor',
        opts: ['Ice turning directly to vapor', 'Water freezing', 'Rain evaporating', 'Clouds forming'],
        concept: 'sublimation',
        wrongFeedback: {
          'Water freezing': 'Freezing is liquid to solid. Sublimation is the transition from solid directly to gas.',
          'Rain evaporating': 'Rain evaporating is liquid to gas, whereas sublimation starts with solid ice or snow.',
          'Clouds forming': 'Cloud formation is condensation, which is gas to liquid.'
        }
      },
      {
        q: 'How does deforestation affect the water cycle?',
        a: 'Reduces transpiration and increases runoff',
        opts: ['Increases evaporation', 'Reduces transpiration and increases runoff', 'Creates more clouds', 'Has no effect'],
        concept: 'watershed',
        wrongFeedback: {
          'Increases evaporation': 'Without tree leaves to transpire and block wind, overall evapotranspiration drops, drying the local climate.',
          'Creates more clouds': 'Deforestation reduces the water pump effect, decreasing atmospheric humidity and cloud formation.',
          'Has no effect': 'Trees are vital hydrological regulators. Deforestation leads to severe soil erosion and immediate flooding.'
        }
      }
    ],
    '9-12': [
      {
        q: 'At what rate does air temperature decrease with altitude (environmental lapse rate)?',
        a: '~6.5°C per 1000m',
        opts: ['~2°C per 1000m', '~6.5°C per 1000m', '~10°C per 1000m', '~15°C per 1000m'],
        concept: 'condensation',
        wrongFeedback: {
          '~2°C per 1000m': 'This rate is too low. The average environmental lapse rate in the troposphere is 6.5°C per kilometer.',
          '~10°C per 1000m': 'This is the dry adiabatic lapse rate (9.8°C/km) for dry rising air, not the environmental profile.',
          '~15°C per 1000m': 'This cooling rate is too high. The average atmospheric cooling is around 6.5°C per 1000m.'
        }
      },
      {
        q: 'What law governs groundwater flow through saturated porous media?',
        a: 'Darcy\'s Law',
        opts: ['Darcy\'s Law', 'Boyle\'s Law', 'Ohm\'s Law', 'Bernoulli\'s Principle'],
        concept: 'Darcy\'s Law',
        wrongFeedback: {
          'Boyle\'s Law': 'Boyle\'s Law relates gas pressure to volume, not fluid flow through soils.',
          'Ohm\'s Law': 'Ohm\'s Law relates voltage and current, though it shares mathematical forms with Darcy\'s Law.',
          'Bernoulli\'s Principle': 'Bernoulli\'s equation applies to open pipe flow, not flow within saturated media.'
        }
      },
      {
        q: 'What is the latent heat of vaporization of water at 20°C?',
        a: '~2.45 MJ/kg',
        opts: ['~1.0 MJ/kg', '~2.45 MJ/kg', '~4.18 MJ/kg', '~0.33 MJ/kg'],
        concept: 'latent heat',
        wrongFeedback: {
          '~1.0 MJ/kg': 'This value is too low. Water requires about 2.45 megajoules per kilogram to vaporize.',
          '~4.18 MJ/kg': 'This is the specific heat capacity of liquid water, not its latent heat of vaporization.',
          '~0.33 MJ/kg': 'This is close to the latent heat of fusion (melting ice) which is 0.334 MJ/kg.'
        }
      },
      {
        q: 'The Clausius-Clapeyron relation predicts saturation vapor pressure increases by what per °C?',
        a: '~7%',
        opts: ['~2%', '~7%', '~15%', '~25%'],
        concept: 'Clausius-Clapeyron',
        wrongFeedback: {
          '~2%': 'This is too low. Saturation vapor pressure increases by approximately 7% per degree of heating.',
          '~15%': 'This is too high. The capacity grows exponentially but is about 7% per degree Celsius.',
          '~25%': 'This is too high. A 1 degree Celsius increase corresponds to a 7% capacity expansion.'
        }
      },
      {
        q: 'What equation extends Darcy\'s Law to unsaturated flow?',
        a: 'Richards\' equation',
        opts: ['Navier-Stokes', 'Richards\' equation', 'Bernoulli\'s equation', 'Poiseuille\'s equation'],
        concept: 'infiltration',
        wrongFeedback: {
          'Navier-Stokes': 'Navier-Stokes equations model momentum in open fluid dynamics, not unsaturated flow in soils.',
          'Bernoulli\'s equation': 'Bernoulli\'s equation relates pressure and speed in open inviscid flows.',
          'Poiseuille\'s equation': 'Poiseuille\'s equation describes flow through open cylindrical pipes.'
        }
      },
      {
        q: 'What is cloud albedo\'s approximate effect on solar radiation?',
        a: 'Reflects ~30%',
        opts: ['Reflects ~5%', 'Reflects ~30%', 'Reflects ~60%', 'Reflects ~90%'],
        concept: 'condensation',
        wrongFeedback: {
          'Reflects ~5%': 'This is too low. Average global cloud albedo is significant, reflecting about 30% of incoming light.',
          'Reflects ~60%': 'While specific storm clouds can be highly reflective, the global average is around 30%.',
          'Reflects ~90%': 'Only the densest storm clouds reflect 90%, whereas the global average is much lower.'
        }
      },
      {
        q: 'What is the average residence time of a water molecule in the ocean?',
        a: '~3,200 years',
        opts: ['~9 days', '~100 years', '~3,200 years', '~1 million years'],
        concept: 'collection',
        wrongFeedback: {
          '~9 days': 'This is the atmospheric residence time before precipitation, not the ocean residence time.',
          '~100 years': 'This is too short. Due to ocean volume, the average water molecule remains there for about 3,200 years.',
          '~1 million years': 'This is too long. Oceanic circulation and evaporation cycle molecules much faster.'
        }
      },
      {
        q: 'What is the Bowen ratio?',
        a: 'Ratio of sensible to latent heat flux',
        opts: ['Ratio of sensible to latent heat flux', 'Ratio of runoff to infiltration', 'Ratio of evaporation to precipitation', 'Ratio of cloud cover to clear sky'],
        concept: 'Bowen ratio',
        wrongFeedback: {
          'Ratio of runoff to infiltration': 'This is a hydrological partition ratio, not the thermodynamic Bowen ratio.',
          'Ratio of evaporation to precipitation': 'This is a global water budget balance, not the Bowen ratio.',
          'Ratio of cloud cover to clear sky': 'This relates to cloud cover fraction, not the Bowen heat flux ratio.'
        }
      }
    ]
  };

  function stewardClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  if(!window.StemLab||!window.StemLab.registerTool) return;
  window.StemLab.registerTool('waterCycle',{
    icon:'\uD83C\uDF0A', label:'Water Cycle', desc:'Live water cycle canvas plus Journey Mode: ride one droplet through evaporation, condensation, precipitation, collection, transpiration, and infiltration with real choices along the way.',
    color:'sky', category:'science',
    questHooks: [
      { id: 'complete_journey', label: 'Complete a water droplet journey loop', icon: '\uD83D\uDCA7', check: function(d) { return (d.journeyLoops || 0) >= 1; }, progress: function(d) { return (d.journeyLoops || 0) >= 1 ? 'Complete!' : 'In journey'; } },
      { id: 'complete_3_journeys', label: 'Complete 3 journey loops', icon: '\uD83C\uDFC6', check: function(d) { return (d.journeyLoops || 0) >= 3; }, progress: function(d) { return (d.journeyLoops || 0) + '/3 loops'; } },
      { id: 'explore_all_stages', label: 'View all water cycle stages', icon: '\uD83C\uDF0D', check: function(d) { return Object.keys(d.stagesViewed || {}).length >= 5; }, progress: function(d) { return Object.keys(d.stagesViewed || {}).length + '/5 stages'; } },
      { id: 'adjust_climate', label: 'Experiment with climate controls', icon: '\uD83C\uDF21', check: function(d) { return d.climateAdjusted || false; }, progress: function(d) { return d.climateAdjusted ? 'Explored!' : 'Try the sliders'; } },
      { id: 'myth_3', label: 'Answer 3 water myths (True or False)', icon: '\uD83E\uDDE0', check: function(d) { return (d.wcMythsDone || 0) >= 3; }, progress: function(d) { return (d.wcMythsDone || 0) + '/3 myths'; } }
    ],
    render:function(ctx){
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React=ctx.React; var h=React.createElement;
      var labToolData=ctx.toolData; var setLabToolData=ctx.setToolData;
      var setStemLabTool=ctx.setStemLabTool;
      var toolSnapshots=ctx.toolSnapshots; var setToolSnapshots=ctx.setToolSnapshots;
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var ArrowLeft=ctx.icons.ArrowLeft;
      var announceToSR=ctx.announceToSR;
      var a11yClick=ctx.a11yClick;
      var awardStemXP=ctx.awardXP; var getStemXP=ctx.getXP;
      var stemCelebrate=ctx.celebrate; var stemBeep=ctx.beep;
      var gradeLevel=ctx.gradeLevel;
      var callGemini=ctx.callGemini;
      var canvasNarrate=ctx.canvasNarrate;
      return (function(){
const d = labToolData.waterCycle || {};
          var isContrast = !!(ctx && ctx.isContrast);
          var isDark = !!(ctx && ctx.isDark) || isContrast;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, [key]: val } }));
          const updMulti = (obj) => setLabToolData(prev => ({ ...prev, waterCycle: Object.assign({}, prev.waterCycle, obj) }));
          const h = React.createElement;

          var checkWaterCycleChallenges = function(customState) {
            var state = customState || {};
            var completed = state.completedChallenges || [];
            var newlyCompleted = [];
            var pointsEarned = 0;

            for (var i = 0; i < WATER_CYCLE_CHALLENGES.length; i++) {
              var ch = WATER_CYCLE_CHALLENGES[i];
              if (completed.indexOf(ch.id) !== -1) continue;

              var met = false;
              if (ch.id === 'complete_journey') {
                met = (state.journeyLoops || 0) >= 1;
              } else if (ch.id === 'explore_all_stages') {
                met = Object.keys(state.stagesViewed || {}).length >= 5;
              } else if (ch.id === 'adjust_climate') {
                met = !!state.climateAdjusted;
              } else if (ch.id === 'quiz_pass') {
                met = (state.quizCorrectCount || 0) >= 1;
              } else if (ch.id === 'vocabulary_studied') {
                met = (state.vocabWordsStudied || []).length >= 3;
              } else if (ch.id === 'stewardship_win') {
                met = state.campaignSuccess === true;
              } else if (ch.id === 'myth_buster') {
                met = (state.wcMythsDone || 0) >= 3;
              }

              if (met) {
                newlyCompleted.push(ch.id);
                pointsEarned += ch.rp;
              }
            }

            if (newlyCompleted.length > 0) {
              var updatedCompleted = completed.concat(newlyCompleted);
              var newRP = (state.researchPoints || 0) + pointsEarned;
              
              updMulti({
                completedChallenges: updatedCompleted,
                researchPoints: newRP
              });

              newlyCompleted.forEach(function(finishedId) {
                var ch = WATER_CYCLE_CHALLENGES.find(function(c) { return c.id === finishedId; });
                if (addToast) {
                  addToast('🏆 Challenge Complete: ' + ch.name + ' (+' + ch.rp + ' RP)', 'success');
                }
                if (typeof awardStemXP === 'function') {
                  awardStemXP('waterCycle', ch.rp, 'Challenge: ' + ch.name);
                }
              });

              if (typeof stemCelebrate === 'function') stemCelebrate();
              if (typeof announceToSR === 'function') {
                announceToSR('Challenges updated. Completed ' + updatedCompleted.length + ' of ' + WATER_CYCLE_CHALLENGES.length + '. Research points: ' + newRP);
              }
            }
          };

          var studyVocab = function(word) {
            var current = d.vocabWordsStudied || [];
            if (current.indexOf(word) === -1) {
              var next = current.concat([word]);
              var nextState = Object.assign({}, d, {
                vocabWordsStudied: next,
                researchPoints: (d.researchPoints || 0) + 5
              });
              updMulti({
                vocabWordsStudied: next,
                researchPoints: (d.researchPoints || 0) + 5
              });
              if (addToast) {
                addToast('📖 Concept studied: ' + word + ' (+5 RP)', 'info');
              }
              setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);
            }
          };

          var selectStage = function(stageId) {
            var nextStagesViewed = Object.assign({}, d.stagesViewed || {});
            nextStagesViewed[stageId] = true;
            var nextState = Object.assign({}, d, {
              activeStage: stageId,
              stagesViewed: nextStagesViewed
            });
            updMulti({
              activeStage: stageId,
              stagesViewed: nextStagesViewed
            });
            setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);
          };

          var adjustClimate = function(key, val) {
            var nextState = Object.assign({}, d, {
              [key]: val,
              climateAdjusted: true
            });
            updMulti({
              [key]: val,
              climateAdjusted: true
            });
            var cv = document.getElementById('wcCanvas');
            if (cv) cv.dataset[key] = String(val);
            setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);
          };

          var adjustLand = function(key, val) {
            updMulti({ [key]: val, landAdjusted: true });
          };

          var resetLandScenario = function() {
            updMulti({
              landRainIntensity: 55,
              landSaturation: 45,
              landPermeability: 'medium',
              landSlope: 'moderate',
              landCover: 'grass',
              landAdjusted: false
            });
            if (typeof announceToSR === 'function') announceToSR('Land-surface scenario reset to balanced conditions.');
          };

          var askHydrologist = function() {
            var query = d.hydrologistQuery || '';
            if (!query.trim()) return;
            if (typeof callGemini !== 'function') {
              updMulti({ hydrologistError: 'AI tutor not available.' });
              return;
            }
            updMulti({ hydrologistLoading: true, hydrologistError: '', hydrologistReply: '' });
            var landContext = 'Land scenario: rainfall intensity ' + (d.landRainIntensity != null ? d.landRainIntensity : 55) +
              '/100, antecedent soil saturation ' + (d.landSaturation != null ? d.landSaturation : 45) +
              '/100, permeability ' + (d.landPermeability || 'medium') +
              ', slope ' + (d.landSlope || 'moderate') +
              ', land cover ' + (d.landCover || 'grass') + '. ';
            var prompt = 'You are a friendly, encouraging Water Cycle & Hydrology tutor for middle-to-high school students. ' +
              'The student is asking about: "' + query + '". ' + landContext +
              'Explain the science behind this clearly in 3-4 sentences using helpful analogies. ' +
              'Treat tool outputs as qualitative teaching indices, not measured percentages or forecasts. ' +
              'Provide the explanation in plain prose. No markdown, no headings, no bullets.';
            callGemini(prompt, false, false, 0.5).then(function(resp) {
              updMulti({
                hydrologistReply: String(resp || '').trim(),
                hydrologistLoading: false
              });
              if (typeof announceToSR === 'function') announceToSR('AI Hydrologist reply ready.');
            }).catch(function() {
              updMulti({
                hydrologistLoading: false,
                hydrologistError: 'Could not reach AI tutor. Try again in a moment.'
              });
            });
          };

          // ═══ WATERSHED STEWARD CAMPAIGN ═══
          var wcMode = d.wcMode || 'explorer';   // 'explorer' (existing) | 'steward' (new)
          var steward = d.steward || defaultStewardState();
          var T_BLUE = '#0ea5e9', T_BLUE_HI = '#7dd3fc';

          function setSteward(patch) { updMulti({ steward: Object.assign({}, steward, patch) }); }
          function switchMode(mode) { upd('wcMode', mode); }

          function startStewardCampaign(opts) {
            opts = opts || {};
            var fresh = defaultStewardState();
            var diffId = opts.difficulty || steward.difficulty || 'coordinator';
            var diff = STEWARD_DIFFICULTIES[diffId] || STEWARD_DIFFICULTIES.coordinator;
            fresh.phase = 'year';
            fresh.difficulty = diff.id;
            fresh.hoursPerYear = diff.hoursPerYear;
            fresh.hoursLeft = diff.hoursPerYear;
            if (opts.seed) fresh.seed = opts.seed;
            setSteward(fresh);
            if (addToast) addToast('💧 Watershed Steward begins. Year 1 of 10 on ' + diff.label + '.', 'success');
            awardStemXP && awardStemXP('steward_start', 10, 'Watershed campaign begins');
            if (typeof announceToSR === 'function') announceToSR('Watershed Steward started on ' + diff.label + '. Year 1 of 10. ' + diff.hoursPerYear + ' hours.');
          }
          function resetSteward() { setSteward(defaultStewardState()); }

          function applyStewardTech(techId, componentId) {
            var tech = STEWARD_TECHNIQUES.find(function(t) { return t.id === techId; });
            if (!tech) return;
            if (steward.hoursLeft < tech.hours) { if (addToast) addToast('Not enough stewardship hours left.', 'warn'); return; }
            if (tech.appliesTo !== 'any' && componentId && tech.appliesTo.indexOf(componentId) < 0) {
              if (addToast) addToast(tech.name + ' does not apply to that component.', 'info'); return;
            }
            var newComps = steward.components.map(function(c) {
              if (componentId && c.id !== componentId && tech.appliesTo !== 'any') return c;
              if (!componentId && tech.appliesTo !== 'any') return c;
              var nc = Object.assign({}, c);
              if (tech.effects.quality) nc.quality = stewardClamp(nc.quality + tech.effects.quality, 0, 100);
              if (tech.effects.connectivity) nc.connectivity = stewardClamp(nc.connectivity + tech.effects.connectivity, 0, 100);
              if (tech.effects.support !== undefined) nc.support = stewardClamp(nc.support + tech.effects.support, 0, 100);
              return nc;
            });
            var actionLog = { tech: tech.name, target: componentId ? (getWatershedComponent(componentId) ? getWatershedComponent(componentId).name : componentId) : 'Watershed-wide', hours: tech.hours };
            var patch = { components: newComps, hoursLeft: steward.hoursLeft - tech.hours, yearActions: steward.yearActions.concat([actionLog]) };
            if (techId === 'damRemoval' || techId === 'fishPassage') patch.connectivityBoosts = (steward.connectivityBoosts || 0) + 1;
            setSteward(patch);
            if (typeof announceToSR === 'function') announceToSR(tech.name + ' applied. ' + (steward.hoursLeft - tech.hours) + ' hours left.');
          }

          function endStewardYear() {
            var pre = steward.components.map(function(c) { return Object.assign({}, c); });

            // Natural drift: components with high quality slowly grow, low quality slowly decay
            var drifted = steward.components.map(function(c) {
              var nc = Object.assign({}, c);
              if (nc.quality > 70) nc.quality = stewardClamp(nc.quality + 1, 0, 100);
              else if (nc.quality < 35) nc.quality = stewardClamp(nc.quality - 2, 0, 100);
              nc.support = stewardClamp(nc.support + (nc.support < 50 ? 1 : -1), 0, 100);
              return nc;
            });

            // Seeded event
            var diff = STEWARD_DIFFICULTIES[steward.difficulty || 'coordinator'];
            var skipRng = stewardRng(steward.seed, steward.year, 'skip');
            var pickRng = stewardRng(steward.seed, steward.year, 'pick');
            var ev;
            if (skipRng() < (diff.eventSkip || 0)) {
              ev = { id: 'quietYear', name: t('stem.watercycle.a_quiet_year', 'A Quiet Year'), icon: '🌤️', desc: t('stem.watercycle.no_major_event_routine_fieldwork_stead', 'No major event. Routine fieldwork, steady progress.'), apply: function() {} };
            } else {
              ev = STEWARD_EVENTS[Math.floor(pickRng() * STEWARD_EVENTS.length)];
            }
            var eventState = { fundingBonusNextYear: steward.fundingBonusNextYear || 0, connectivityBoosts: steward.connectivityBoosts || 0 };
            ev.apply(drifted, eventState);
            // Severity scaling
            var sev = diff.severity || 1;
            if (sev !== 1) {
              for (var di = 0; di < drifted.length; di++) {
                var sp = drifted[di]; var pr = pre[di];
                sp.quality = stewardClamp(pr.quality + (sp.quality - pr.quality) * sev, 0, 100);
                sp.connectivity = stewardClamp(pr.connectivity + (sp.connectivity - pr.connectivity) * sev, 0, 100);
                sp.support = stewardClamp(pr.support + (sp.support - pr.support) * sev, 0, 100);
              }
            }

            // Cascade rules
            var fired = [];
            STEWARD_FEEDBACK_RULES.forEach(function(rule) {
              if (rule.when(drifted)) { rule.apply(drifted); fired.push({ id: rule.id, msg: rule.msg }); }
            });

            var snap = {
              year: steward.year, event: ev.name, eventIcon: ev.icon, eventDesc: ev.desc,
              pre: pre, post: drifted.map(function(c) { return Object.assign({}, c); }),
              actions: steward.yearActions.slice(), cascades: fired
            };

            setSteward({
              phase: 'review',
              components: drifted,
              lastEvent: ev,
              cascadesFiredThisYear: fired,
              yearLog: steward.yearLog.concat([snap]),
              fundingBonusNextYear: eventState.fundingBonusNextYear || 0
            });
            if (typeof announceToSR === 'function') announceToSR('Year ' + steward.year + ' complete. Event: ' + ev.name + '.');
          }

          function advanceFromStewardReview() {
            if (steward.year >= steward.maxYears) {
              // Final outcome
              var avgQ = Math.round(steward.components.reduce(function(a, c) { return a + c.quality; }, 0) / steward.components.length);
              var componentsAt75 = steward.components.filter(function(c) { return c.quality >= 75; }).length;
              var connectivityBoosts = steward.connectivityBoosts || 0;
              var outcome;
              if (componentsAt75 >= 4 && connectivityBoosts >= 1 && avgQ >= 70) outcome = { tier: 'recovery', label: t('stem.watercycle.watershed_recovery', 'Watershed Recovery'), color: '#16a34a', icon: '🏆', desc: t('stem.watercycle.the_watershed_is_healing_across_the_bo', 'The watershed is healing across the board. Headwaters are cold and clean. The mainstem carries fish again. Beaver wetlands are doing the floodplain work. This is what watershed-scale recovery looks like when timing and community come together.') };
              else if (componentsAt75 >= 3 && avgQ >= 62) outcome = { tier: 'recovering', label: t('stem.watercycle.recovering_watershed', 'Recovering Watershed'), color: '#22c55e', icon: '🌊', desc: t('stem.watercycle.most_components_are_improving_a_few_st', 'Most components are improving. A few still need work. The trajectory is good and the community is engaged.') };
              else if (componentsAt75 >= 2 || avgQ >= 55) outcome = { tier: 'mixed', label: t('stem.watercycle.mixed_recovery', 'Mixed Recovery'), color: '#f59e0b', icon: '🍃', desc: t('stem.watercycle.some_wins_some_gaps_real_watershed_wor', 'Some wins, some gaps. Real watershed work is rarely uniform; some pieces improved while others stalled.') };
              else outcome = { tier: 'slipping', label: t('stem.watercycle.slipping_watershed', 'Slipping Watershed'), color: '#ef4444', icon: '⚠️', desc: t('stem.watercycle.average_quality_is_low_and_few_compone', 'Average quality is low and few components reached recovery thresholds. This is how watersheds degrade quietly when stewardship cannot keep up with pressures.') };
              var success = (outcome.tier === 'recovery' || outcome.tier === 'recovering');
              var nextState = Object.assign({}, d, { campaignSuccess: success });
              setSteward({ phase: 'debrief', finalOutcome: outcome, componentsAt75: componentsAt75 });
              upd('campaignSuccess', success);
              if (typeof announceToSR === 'function') announceToSR('Campaign complete. Final outcome: ' + outcome.label + '. ' + outcome.desc);
              awardStemXP && awardStemXP('steward_complete', 50, outcome.label);
              setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);
            } else {
              setSteward({
                phase: 'year', year: steward.year + 1,
                hoursLeft: steward.hoursPerYear + (steward.fundingBonusNextYear || 0),
                fundingBonusNextYear: 0,
                yearActions: [], lastEvent: null
              });
              if (typeof announceToSR === 'function') announceToSR('Year ' + (steward.year + 1) + ' begins.');
            }
          }

          // ── Watershed artifact translations ──
          // Numbers calibrated to a plausible mid-Maine watershed of about
          // 600 stream miles, 12,000 acres of forested buffer potential,
          // 3,500 acres of floodplain wetland potential, 75 dams in the
          // historic record, ~150 farms.
          function watershedArtifact(c) {
            var q = Math.max(0, Math.round(c.quality));
            var k = Math.max(0, Math.round(c.connectivity));
            if (c.id === 'headwaterStreams')      return { icon: '🐠', text: Math.round(q * 4) + ' stream miles with wild brook trout' };
            if (c.id === 'riverMainstem')         return { icon: '🐟', text: Math.round(k * 0.6) + ' mainstem miles with fish passage to the sea' };
            if (c.id === 'floodplainWetlands')    return { icon: '🦫', text: Math.round(q * 35) + ' acres of beaver-engineered wetland' };
            if (c.id === 'forestBuffer')          return { icon: '🌲', text: Math.round(q * 120) + ' acres of mature riparian buffer' };
            if (c.id === 'agriculturalWatershed') return { icon: '🚜', text: Math.round(q * 1.5) + ' farms enrolled in BMP programs' };
            if (c.id === 'suburbanEdges')         return { icon: '🏘️', text: Math.round(q * 0.4) + ' impervious-acre equivalents retrofitted' };
            return { icon: '💧', text: '' };
          }

          // ── Do-nothing baseline: 10 years of drift with no actions or events ──
          function computeStewardDoNothing() {
            var sim = MAINE_WATERSHED_COMPONENTS.map(function(c) { return Object.assign({ id: c.id }, c.defaultState); });
            for (var y = 0; y < steward.maxYears; y++) {
              sim = sim.map(function(c) {
                var nc = Object.assign({}, c);
                if (nc.quality > 70) nc.quality = stewardClamp(nc.quality + 1, 0, 100);
                else if (nc.quality < 35) nc.quality = stewardClamp(nc.quality - 2, 0, 100);
                nc.support = stewardClamp(nc.support + (nc.support < 50 ? 1 : -1), 0, 100);
                return nc;
              });
              STEWARD_FEEDBACK_RULES.forEach(function(rule) {
                if (rule.when(sim)) rule.apply(sim);
              });
            }
            return sim;
          }

          // ── Year-1 coaching tip ──
          function stewardCoachingTip() {
            var ag = steward.components.find(function(c) { return c.id === 'agriculturalWatershed'; });
            var mainstem = steward.components.find(function(c) { return c.id === 'riverMainstem'; });
            var buffer = steward.components.find(function(c) { return c.id === 'forestBuffer'; });
            if (ag && ag.quality < 50) {
              return {
                priority: 'Open with BMP outreach to farms',
                text: 'Agricultural runoff is the dominant pressure on this watershed (current quality ' + Math.round(ag.quality) + '). BMP outreach is cheap (4h) and triggers the feedback rule that cleans up the mainstem. Pair it with riparian buffer planting on adjacent stream miles for compounding effect over the campaign.'
              };
            }
            if (mainstem && mainstem.connectivity < 35) {
              return {
                priority: 'Plan the connectivity arc',
                text: 'River mainstem connectivity is critically low (' + Math.round(mainstem.connectivity) + '). Dam removal is the highest-impact move available but it costs 15 hours and 12 support. Most successful Maine projects (Edwards 1999, Veazie 2012) started with 2 to 3 years of public education and fish-passage installations before attempting full removal.'
              };
            }
            return {
              priority: 'Hold and read the watershed',
              text: t('stem.watercycle.initial_conditions_look_workable_use_y', 'Initial conditions look workable. Use Year 1 for citizen-science monitoring and education to build community support before spending it on contested actions like dam removal.')
            };
          }

          // ── Steward's debrief: turn a silent numbers turn into a coaching loop ──
          // Grades the year's DECISIONS (not just the outcome): were the hours
          // spent, aimed at the weakest link, and did they trip — or nearly trip —
          // a downstream feedback cascade? This is the systems-thinking payload the
          // campaign was missing: interventions have downstream, delayed effects.
          function stewardYearDebrief() {
            var snap = steward.yearLog[steward.yearLog.length - 1] || {};
            var actions = snap.actions || [];
            var comps = steward.components || [];
            var byId = {}; comps.forEach(function(c) { byId[c.id] = c; });
            var techByName = {}; STEWARD_TECHNIQUES.forEach(function(tc) { techByName[tc.name] = tc; });
            var compByName = {}; MAINE_WATERSHED_COMPONENTS.forEach(function(cd) { compByName[cd.name] = cd; });

            // Hours utilization
            var hoursSpent = actions.reduce(function(a, x) { return a + (x.hours || 0); }, 0);
            var hoursPerYear = steward.hoursPerYear || 18;
            var hoursIdle = Math.max(0, hoursPerYear - hoursSpent);

            // Where did the investment land? Track components touched + notable moves.
            var investedIds = {}, usedDamRemoval = false, restedOnly = actions.length > 0;
            actions.forEach(function(a) {
              var tech = techByName[a.tech];
              if (tech && tech.id === 'damRemoval') usedDamRemoval = true;
              if (tech && tech.id !== 'rest') restedOnly = false;
              var comp = compByName[a.target];
              if (comp) investedIds[comp.id] = true;
            });

            // Weakest link = component furthest below its OWN quality target
            var weakest = null, worstGap = -1;
            comps.forEach(function(c) {
              var def = getWatershedComponent(c.id); if (!def) return;
              var gap = (def.targets && def.targets.quality ? def.targets.quality : 75) - c.quality;
              if (gap > worstGap) { worstGap = gap; weakest = { c: c, def: def, gap: Math.round(gap) }; }
            });
            // Highest-quality technique that directly applies to the weakest link
            var rec = null, recQ = -1;
            if (weakest) {
              STEWARD_TECHNIQUES.forEach(function(tech) {
                if (tech.appliesTo === 'any' || tech.id === 'rest') return;
                if (tech.appliesTo.indexOf(weakest.c.id) < 0) return;
                var q = tech.effects.quality || 0;
                if (q > recQ) { recQ = q; rec = tech; }
              });
              if (!rec) rec = STEWARD_TECHNIQUES.find(function(tc) { return tc.id === 'easement'; });
            }

            // Cascades: which fired this year, which are one move away
            var firedIds = {}; (snap.cascades || []).forEach(function(x) { firedIds[x.id] = true; });
            var firedMsgs = [], nearMsgs = [];
            STEWARD_CASCADE_HINTS.forEach(function(hint) {
              var c = byId[hint.comp]; if (!c) return;
              var v = Math.round(c[hint.field]);
              if (firedIds[hint.id]) firedMsgs.push(hint.fired);
              else if (v >= hint.threshold - 8 && v < hint.threshold) nearMsgs.push(hint.near.replace('{v}', v));
            });

            // Decision grade — targeting × utilization
            var touchedWeakest = weakest && investedIds[weakest.c.id];
            var usedMost = hoursSpent >= hoursPerYear * 0.7;
            var grade;
            if (touchedWeakest && usedMost) grade = { emoji: '🌟', label: 'Sharp targeting', note: 'You put real hours into the watershed\'s weakest link. That is how a thin stewardship budget actually moves the needle.' };
            else if (usedMost || touchedWeakest) grade = { emoji: '👍', label: 'Solid year', note: touchedWeakest ? 'Good instinct hitting the priority component — try to spend more of your hour budget next year.' : 'You worked most of your hours; aim them at the single weakest component next year for compounding gains.' };
            else if (restedOnly) grade = { emoji: '🍃', label: 'Deliberate pause', note: 'Holding steady lets support recover and some components self-heal — a valid move once or twice, but pressures do not wait forever.' };
            else grade = { emoji: '🤔', label: 'Scattered effort', note: 'A lot of capacity sat idle or spread thin. Pressures never rest — pick the one component holding the watershed back and concentrate there.' };

            var backfire = usedDamRemoval ? 'Dam removal is the single biggest connectivity gain available, but it costs about 12 community support — the backlash is real and modeled. Follow it with public education and River Days to rebuild trust before the support hit stalls your other work.' : '';

            return { hoursSpent: hoursSpent, hoursIdle: hoursIdle, hoursPerYear: hoursPerYear, grade: grade, fired: firedMsgs, near: nearMsgs, weakest: weakest, rec: rec, backfire: backfire };
          }

          // ── Per-component deep-dive ──
          function openStewardDeepDive(id) { setSteward({ deepDiveComponent: id }); }
          function closeStewardDeepDive() { setSteward({ deepDiveComponent: null }); }

          function renderStewardDeepDive(id) {
            var def = getWatershedComponent(id);
            if (!def || !def.deepDive) return null;
            var dd = def.deepDive;
            var applicable = STEWARD_TECHNIQUES.filter(function(t) { return t.appliesTo === 'any' || t.appliesTo.indexOf(id) >= 0; });
            return h('div', {
              role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Watershed deep-dive: ' + def.name,
              style: {
                background: isDark
                  ? 'linear-gradient(135deg, ' + def.color + '20 0%, rgba(15,23,42,0.95) 60%)'
                  : 'linear-gradient(135deg, ' + def.color + '15 0%, #f8fafc 60%)',
                border: isDark ? '1px solid ' + def.color + '88' : '1px solid ' + def.color + '55',
                borderLeft: '4px solid ' + def.color,
                borderRadius: 14,
                padding: 18,
                marginBottom: 16
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 } },
                h('span', { style: { fontSize: 36 } }, def.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 11, color: def.color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } }, t('stem.watercycle.watershed_deep_dive', 'Watershed deep-dive')),
                  h('h3', { style: { margin: '2px 0 0', color: isDark ? '#fff' : '#0f172a', fontSize: 20 } }, def.name),
                  h('div', { style: { color: def.color, fontSize: 13, marginTop: 4, fontStyle: 'italic' } }, def.role)
                ),
                h('button', {
                  onClick: closeStewardDeepDive,
                  className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                  style: {
                    background: isDark ? 'rgba(15,23,42,0.6)' : '#e2e8f0',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    color: isDark ? '#cbd5e1' : '#334155',
                    cursor: 'pointer',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: 13
                  }
                }, t('stem.watercycle.close', '✕ Close'))
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 } },
                h('div', { style: { background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)', border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#22c55e', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, t('stem.watercycle.hydrology', '💧 Hydrology')),
                  h('p', { style: { margin: 0, color: isDark ? '#cbd5e1' : '#334155', fontSize: 13, lineHeight: 1.55 } }, dd.knowledge)
                ),
                h('div', { style: { background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)', border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, t('stem.watercycle.case_work', '📰 Case work')),
                  h('p', { style: { margin: 0, color: isDark ? '#cbd5e1' : '#334155', fontSize: 13, lineHeight: 1.55 } }, dd.casework)
                ),
                h('div', { style: { background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)', border: isDark ? '1px solid #1e293b' : '1px solid #cbd5e1', borderRadius: 10, padding: 12 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#0ea5e9', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, t('stem.watercycle.maine_context', '🌍 Maine context')),
                  h('p', { style: { margin: 0, color: isDark ? '#cbd5e1' : '#334155', fontSize: 13, lineHeight: 1.55 } }, dd.modernContext)
                )
              ),
              applicable.length > 0 ? h('div', {
                style: {
                  marginTop: 12,
                  padding: 12,
                  background: isDark ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.06)',
                  borderTop: isDark ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderRight: isDark ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderBottom: isDark ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderLeft: '3px solid #0ea5e9',
                  borderRadius: 10
                }
              },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: isDark ? '#7dd3fc' : '#0369a1', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 } }, t('stem.watercycle.what_you_can_do_for_this_component', '🛠 What you can do for this component')),
                applicable.map(function(t, i) {
                  return h('div', { key: i, style: { margin: '4px 0', fontSize: 12.5, color: isDark ? '#bae6fd' : '#0e7490', lineHeight: 1.5 } },
                    h('strong', { style: { color: isDark ? '#e0f2fe' : '#0c4a6e' } }, t.icon + ' ' + t.name), ' (' + t.hours + 'h): ', t.desc
                  );
                })
              ) : null
            );
          }

          // ── Multi-line week-by-week trend chart ──
          function renderStewardTrendChart(yearLog) {
            if (!yearLog || yearLog.length === 0) return null;
            var w = 600, hgt = 220, padL = 36, padR = 110, padT = 12, padB = 24;
            var ix = w - padL - padR;
            var iy = hgt - padT - padB;
            var components = MAINE_WATERSHED_COMPONENTS;
            function ptsFor(cid) {
              return yearLog.map(function(snap, i) {
                var post = (snap.post || []).find(function(p) { return p.id === cid; });
                var v = post ? post.quality : 0;
                var x = padL + (yearLog.length === 1 ? ix / 2 : (i / (yearLog.length - 1)) * ix);
                var y = padT + iy - (v / 100) * iy;
                return { x: x, y: y, v: v };
              });
            }
            function pathStr(pts) { return pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x + ',' + p.y; }).join(' '); }
            return h('div', {
              style: {
                background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1'
              }
            },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 8 } }, t('stem.watercycle.component_quality_across_the_10_year_c', '📈 Component quality across the 10-year campaign')),
              h('svg', { viewBox: '0 0 ' + w + ' ' + hgt, style: { width: '100%', height: 'auto', display: 'block' }, 'aria-label': t('stem.watercycle.year_by_year_quality_trend_chart_by_wa', 'Year-by-year quality trend chart by watershed component') },
                [0, 25, 50, 75, 100].map(function(g, gi) {
                  var y = padT + iy - (g / 100) * iy;
                  return h('g', { key: 'g' + gi },
                    h('line', { x1: padL, y1: y, x2: padL + ix, y2: y, stroke: isDark ? '#1e293b' : '#cbd5e1', strokeWidth: 1 }),
                    h('text', { x: padL - 4, y: y + 3, fontSize: 9, fill: isDark ? '#64748b' : '#475569', textAnchor: 'end' }, g)
                  );
                }),
                yearLog.map(function(snap, i) {
                  var x = padL + (yearLog.length === 1 ? ix / 2 : (i / (yearLog.length - 1)) * ix);
                  return h('text', { key: 'xl' + i, x: x, y: hgt - 8, fontSize: 9, fill: isDark ? '#64748b' : '#475569', textAnchor: 'middle' }, 'Y' + snap.year);
                }),
                components.map(function(comp) {
                  var pts = ptsFor(comp.id);
                  return h('g', { key: comp.id },
                    h('path', { d: pathStr(pts), stroke: comp.color, strokeWidth: 2, fill: 'none', strokeLinejoin: 'round' })
                  );
                }),
                components.map(function(comp, ci) {
                  return h('g', { key: 'leg' + comp.id },
                    h('line', { x1: w - padR + 6, y1: padT + 8 + ci * 16, x2: w - padR + 20, y2: padT + 8 + ci * 16, stroke: comp.color, strokeWidth: 2.5 }),
                    h('text', { x: w - padR + 24, y: padT + 12 + ci * 16, fontSize: 10, fill: isDark ? '#cbd5e1' : '#334155' }, comp.icon + ' ' + comp.name.split(' ')[0])
                  );
                })
              )
            );
          }

          // ── AI Watershed Reading: safe-framing AI educator ──
          function readWatershed() {
            if (!callGemini || steward.aiReadLoading) return;
            var summary = steward.components.map(function(c) {
              var def = getWatershedComponent(c.id);
              return '- ' + def.name + ' (' + def.role + '): quality ' + Math.round(c.quality) + '/' + def.targets.quality + ', connectivity ' + Math.round(c.connectivity) + '/' + def.targets.connectivity + ', community support ' + Math.round(c.support) + '/' + def.targets.support;
            }).join('\n');
            var prompt = [
              'You are an AI watershed-science educator. You are NOT a Wabanaki person, NOT a real watershed coordinator, NOT a hydrologist, NOT an agency staff member, and you do NOT speak for any Wabanaki nation, agency, watershed organization, or named individual.',
              '',
              'A student is managing a simulated central Maine watershed across 10 years. Six components.',
              '',
              'Current state (Year ' + steward.year + ' of ' + steward.maxYears + ', difficulty: ' + (STEWARD_DIFFICULTIES[steward.difficulty] || STEWARD_DIFFICULTIES.coordinator).label + '):',
              summary,
              'Stewardship hours this year: ' + steward.hoursLeft + ' of ' + steward.hoursPerYear,
              'Connectivity boosts so far: ' + (steward.connectivityBoosts || 0),
              '',
              'Read this state and give 3 to 4 sentences of practical coaching grounded in watershed-science research and documented Maine projects.',
              '',
              'HARD CONSTRAINTS:',
              '- NEVER claim to be Wabanaki, Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki, a watershed coordinator, hydrologist, agency staff, or any named individual.',
              '- NEVER invoke sacred, ceremonial, or spiritual claims.',
              '- NEVER use "noble savage" framing or romanticized language about Indigenous peoples.',
              '- NEVER invent quotes attributed to anyone.',
              '- DO frame as "documented watershed-science research" or "Maine restoration project case studies" (Edwards Dam 1999, Penobscot River Restoration Project, Beaver Dam Analog research, Eastern Brook Trout Joint Venture, Maine Soil and Water Conservation Districts).',
              '- DO acknowledge that the Penobscot Nation led the Penobscot River Restoration Project when relevant, and that Wabanaki nations have shaped Maine watershed policy, without speaking for them.',
              '- DO stay grounded in observable component state and concrete techniques: buffer planting, beaver dam analog, dam removal, fish passage, BMP outreach, conservation easement, stormwater retrofit.',
              '- Name 1 or 2 highest-priority moves and explain why, grounded in hydrology and feedback rules.',
              '- Be direct, observational, useful. No flowery language.',
              '',
              'Respond in 3 to 4 sentences of plain prose. Do not use markdown.'
            ].join('\n');
            setSteward({ aiReadLoading: true, aiReadResponse: null });
            try {
              var p = callGemini(prompt);
              if (p && typeof p.then === 'function') {
                p.then(function(resp) {
                  var text = '';
                  if (typeof resp === 'string') text = resp;
                  else if (resp && typeof resp.text === 'string') text = resp.text;
                  else if (resp && resp.candidates) text = (resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts && resp.candidates[0].content.parts[0] && resp.candidates[0].content.parts[0].text) || '';
                  text = (text || 'The reader returned no text. Try again in a moment.').replace(/\*\*/g, '').replace(/^[\s\n]+|[\s\n]+$/g, '');
                  setSteward({ aiReadResponse: text, aiReadLoading: false });
                  if (typeof announceToSR === 'function') announceToSR('AI Watershed Reading complete.');
                }).catch(function() {
                  setSteward({ aiReadResponse: 'The AI reader is offline right now. Try again in a moment.', aiReadLoading: false });
                });
              } else {
                setSteward({ aiReadResponse: 'AI is not available in this context.', aiReadLoading: false });
              }
            } catch (e) {
              setSteward({ aiReadResponse: 'The AI reader is offline right now. Try again in a moment.', aiReadLoading: false });
            }
          }
          function dismissStewardAIRead() { setSteward({ aiReadResponse: null }); }

          function renderStewardAIPanel() {
            if (steward.aiReadLoading) {
              return h('div', { role: 'status', 'aria-live': 'polite',
                style: {
                  padding: '12px 14px',
                  borderRadius: 12,
                  marginBottom: 12,
                  background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(14,165,233,0.08)',
                  borderTop: isDark ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderRight: isDark ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderBottom: isDark ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderLeft: '3px solid #38bdf8',
                  color: isDark ? '#bae6fd' : '#0369a1',
                  fontSize: 13
                }
              },
                t('stem.watercycle.ai_watershed_educator_is_reading_your_', '⏳ AI watershed educator is reading your watershed data...'));
            }
            if (!steward.aiReadResponse) return null;
            return h('div', { role: 'region', 'aria-label': t('stem.watercycle.ai_watershed_reading', 'AI Watershed Reading'),
              style: {
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(15,23,42,0.85) 100%)'
                  : 'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, #f8fafc 100%)',
                borderTop: isDark ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(14,165,233,0.3)',
                borderRight: isDark ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(14,165,233,0.3)',
                borderBottom: isDark ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(14,165,233,0.3)',
                borderLeft: '3px solid #38bdf8'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 20 } }, '🔍'),
                h('strong', { style: { color: isDark ? '#38bdf8' : '#0ea5e9', fontSize: 14 } }, t('stem.watercycle.ai_watershed_reading_2', 'AI Watershed Reading')),
                h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
                  h('button', {
                    onClick: readWatershed,
                    className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                    style: { background: 'transparent', border: isDark ? '1px solid #38bdf8' : '1px solid #0ea5e9', color: isDark ? '#38bdf8' : '#0ea5e9', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }
                  }, t('stem.watercycle.re_read', '↻ Re-read')),
                  h('button', {
                    onClick: dismissStewardAIRead,
                    className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                    style: { background: 'transparent', border: isDark ? '1px solid #475569' : '1px solid #cbd5e1', color: isDark ? '#cbd5e1' : '#475569', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }
                  }, '✕')
                )
              ),
              h('p', { style: { margin: '0 0 10px 0', color: isDark ? '#cbd5e1' : '#334155', fontSize: 13.5, lineHeight: 1.6 } }, steward.aiReadResponse),
              h('div', {
                style: {
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#475569',
                  lineHeight: 1.5,
                  paddingTop: 8,
                  borderTop: isDark ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(14,165,233,0.2)',
                  fontStyle: 'italic'
                }
              },
                t('stem.watercycle.ai_watershed_science_educator', 'AI watershed-science educator. '),
                h('strong', null, t('stem.watercycle.it_is_not_a_wabanaki_person_not_a_real', 'It is not a Wabanaki person, not a real watershed coordinator or hydrologist, and does not speak for any Wabanaki nation, agency, or organization.')),
                t('stem.watercycle.for_authoritative_voices_on_maine_wate', ' For authoritative voices on Maine watershed work, consult Penobscot Nation Cultural and Historic Preservation Department, Wabanaki Public Health and Wellness, Atlantic Salmon Federation, Maine Coast Heritage Trust, Maine Audubon, Maine Soil and Water Conservation Districts, and the Maine Department of Environmental Protection.')
              )
            );
          }

          function renderStewardCampaign() {
            // Deep-dive panel renders at the top of every phase when active
            var stewardDeepDive = steward.deepDiveComponent ? renderStewardDeepDive(steward.deepDiveComponent) : null;

            // ── SETUP ──
            if (steward.phase === 'setup') {
              return h('div', { className: 'max-w-3xl mx-auto space-y-4 ' + (isDark ? 'text-slate-100' : 'text-slate-800') },
                stewardDeepDive,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('button', {
                    onClick: function() { switchMode('explorer'); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-slate-800 text-sky-400 border border-slate-700 hover:bg-slate-700 active:scale-[0.97]" : "transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300 active:scale-[0.97]")
                  }, t('stem.watercycle.water_cycle_explorer', '← Water Cycle Explorer')),
                  h('h3', { className: 'text-lg font-bold  tracking-tight' + (isDark ? 'text-slate-100' : 'text-slate-800') }, t('stem.watercycle.watershed_steward_maine_campaign', '💧 Watershed Steward: Maine campaign'))
                ),
                h('div', {
                  style: {
                    padding: 18,
                    borderRadius: 14,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(21,128,61,0.04) 100%)'
                      : 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(21,128,61,0.06) 100%)',
                    border: isDark ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(14,165,233,0.3)',
                    borderLeft: '4px solid ' + T_BLUE
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
                    h('span', { style: { fontSize: 36 } }, '💧'),
                    h('div', null,
                      h('h3', { style: { margin: 0, color: isDark ? T_BLUE_HI : '#0284c7', fontSize: 22 } }, t('stem.watercycle.watershed_steward_10_year_maine_campai', 'Watershed Steward: 10-year Maine campaign')),
                      h('div', { style: { fontSize: 13, color: isDark ? '#94a3b8' : '#475569', marginTop: 2 } }, 'You are the Watershed Coordinator for a central Maine river system.')
                    )
                  ),
                  h('p', { style: { margin: '8px 0 0', color: isDark ? '#cbd5e1' : '#334155', fontSize: 14, lineHeight: 1.6 } },
                    t('stem.watercycle.six_watershed_components_ten_years_rea', 'Six watershed components, ten years, real Maine pressures: dam barriers, agricultural runoff, suburban stormwater, climate-driven floods and droughts. '),
                    h('strong', null, t('stem.watercycle.hydrological_feedback_rules_tie_them_t', 'Hydrological feedback rules tie them together.')),
                    t('stem.watercycle.healthy_buffers_cool_headwater_streams', ' Healthy buffers cool headwater streams. Beaver wetlands attenuate floods and clean the mainstem. Low ag runoff lets the river breathe. Connected, shaded rivers bring back salmon and alewife runs. Outcomes are hand-authored teaching indices, not field measurements, forecasts, or project guarantees.')
                  )
                ),

                // Component preview cards
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
                  MAINE_WATERSHED_COMPONENTS.map(function(c) {
                    return h('div', {
                      key: c.id,
                      style: {
                        background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
                        borderLeft: '3px solid ' + c.color,
                        borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        borderRight: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 12
                      }
                    },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                        h('span', { style: { fontSize: 22 } }, c.icon),
                        h('strong', { style: { color: c.color } }, c.name)
                      ),
                      h('div', { style: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 } }, c.role),
                      h('div', { style: { fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.5, marginBottom: 8 } }, __alloT('stem.watercycle.' + (c.id) + '_desc', c.desc)),
                      c.deepDive ? h('button', {
                        onClick: function() { openStewardDeepDive(c.id); },
                        'aria-label': 'Open deep-dive for ' + c.name,
                        className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                        style: {
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid ' + c.color + (isDark ? '88' : '55'),
                          background: c.color + (isDark ? '22' : '15'),
                          color: c.color,
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 11.5
                        }
                      }, t('stem.watercycle.watershed_deep_dive_2', '📚 Watershed deep-dive →')) : null
                    );
                  })
                ),

                // Difficulty
                h('div', {
                  style: {
                    background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
                    borderRadius: 10,
                    padding: 12,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1'
                  }
                },
                  h('div', { style: { fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 } }, t('stem.watercycle.difficulty', 'Difficulty')),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
                    Object.keys(STEWARD_DIFFICULTIES).map(function(dkey) {
                      var df = STEWARD_DIFFICULTIES[dkey];
                      var picked = (steward.difficulty || 'coordinator') === dkey;
                      return h('button', {
                        key: dkey,
                        onClick: function() { setSteward({ difficulty: dkey }); },
                        'aria-pressed': picked,
                        className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                        style: {
                          background: picked
                            ? (isDark ? 'rgba(14,165,233,0.20)' : 'rgba(14,165,233,0.15)')
                            : (isDark ? '#0f172a' : '#ffffff'),
                          border: '1px solid ' + (picked ? '#0ea5e9' : (isDark ? '#334155' : '#cbd5e1')),
                          color: picked
                            ? (isDark ? '#7dd3fc' : '#0369a1')
                            : (isDark ? '#cbd5e1' : '#475569'),
                          borderRadius: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }
                      },
                        h('div', { style: { fontWeight: 800, fontSize: 13 } }, df.label),
                        h('div', { style: { fontSize: 11, color: picked ? (isDark ? '#bae6fd' : '#0c4a6e') : (isDark ? '#94a3b8' : '#64748b'), marginTop: 2, lineHeight: 1.4 } }, __alloT('stem.watercycle.' + (dkey) + '_desc', df.desc))
                      );
                    })
                  )
                ),

                h('button', {
                  onClick: function() { startStewardCampaign(); },
                  className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                  style: {
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, ' + T_BLUE + ' 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 16,
                    boxShadow: '0 6px 14px rgba(14,165,233,0.35)'
                  }
                }, t('stem.watercycle.begin_10_year_watershed_campaign', '💧 Begin 10-year Watershed Campaign'))
              );
            }

            // ── DEBRIEF ──
            if (steward.phase === 'debrief' && steward.finalOutcome) {
              var o = steward.finalOutcome;
              var baseline = computeStewardDoNothing();
              var actualAvgQ = Math.round(steward.components.reduce(function(a, c) { return a + c.quality; }, 0) / steward.components.length);
              var baselineAvgQ = Math.round(baseline.reduce(function(a, c) { return a + c.quality; }, 0) / baseline.length);
              var actualAvgConn = Math.round(steward.components.reduce(function(a, c) { return a + c.connectivity; }, 0) / steward.components.length);
              var baselineAvgConn = Math.round(baseline.reduce(function(a, c) { return a + c.connectivity; }, 0) / baseline.length);
              return h('div', { className: 'max-w-3xl mx-auto space-y-3 ' + (isDark ? 'text-slate-100' : 'text-slate-800') },
                stewardDeepDive,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('button', {
                    onClick: function() { switchMode('explorer'); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-slate-800 text-sky-400 border border-slate-700 hover:bg-slate-700 active:scale-[0.97]" : "transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300 active:scale-[0.97]")
                  }, t('stem.watercycle.water_cycle_explorer_2', '← Water Cycle Explorer')),
                  h('h3', { className: 'text-lg font-bold  tracking-tight' + (isDark ? 'text-slate-100' : 'text-slate-800') }, t('stem.watercycle.watershed_steward_debrief', '💧 Watershed Steward: Debrief'))
                ),
                h('div', {
                  style: {
                    padding: 18,
                    borderRadius: 14,
                    background: isDark
                      ? 'linear-gradient(135deg, ' + o.color + '20 0%, rgba(15,23,42,0.95) 100%)'
                      : 'linear-gradient(135deg, ' + o.color + '15 0%, #f8fafc 100%)',
                    border: '1px solid ' + o.color + (isDark ? '88' : '55'),
                    borderLeft: '4px solid ' + o.color
                  }
                },
                  h('div', { style: { fontSize: 40, marginBottom: 6 } }, o.icon),
                  h('h3', { style: { margin: 0, color: o.color, fontSize: 22 } }, o.label),
                  h('p', { style: { margin: '8px 0 0', color: isDark ? '#cbd5e1' : '#334155', fontSize: 14, lineHeight: 1.6 } }, o.desc)
                ),

                // Year-by-year trend chart
                renderStewardTrendChart(steward.yearLog),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
                  steward.components.map(function(c) {
                    var def = getWatershedComponent(c.id);
                    var targetsHit = c.quality >= def.targets.quality && c.connectivity >= def.targets.connectivity && c.support >= def.targets.support;
                    var art = watershedArtifact(c);
                    return h('div', {
                      key: c.id,
                      style: {
                        background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
                        borderLeft: '3px solid ' + def.color,
                        borderTop: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        borderRight: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        borderBottom: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12
                      }
                    },
                      h('div', { style: { fontWeight: 700, color: def.color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', null, def.icon + ' ' + def.name + (targetsHit ? ' ✓' : '')),
                        def.deepDive ? h('button', {
                          onClick: function() { openStewardDeepDive(c.id); },
                          'aria-label': 'Deep-dive',
                          className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                          style: { marginLeft: 'auto', background: 'transparent', border: '1px solid ' + def.color + '66', color: def.color, cursor: 'pointer', borderRadius: 6, padding: '0 6px', fontSize: 11 }
                        }, '📚') : null
                      ),
                      h('div', { style: { color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.55 } },
                        'Quality: ' + Math.round(c.quality) + '/' + def.targets.quality,
                        h('br'),
                        'Connectivity: ' + Math.round(c.connectivity) + '/' + def.targets.connectivity,
                        h('br'),
                        'Community support: ' + Math.round(c.support) + '/' + def.targets.support
                      ),
                      art.text ? h('div', { style: { marginTop: 6, padding: 6, background: isDark ? '#1e293b' : '#fef3c7', borderRadius: 6, fontSize: 11.5, color: isDark ? '#fde68a' : '#92400e' } },
                        h('span', { style: { fontSize: 14, marginRight: 4 } }, art.icon), art.text
                      ) : null
                    );
                  })
                ),

                // Do-nothing baseline
                h('div', {
                  style: {
                    padding: 12,
                    borderRadius: 12,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(127,29,29,0.2) 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, rgba(248,113,113,0.15) 100%)',
                    border: isDark ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(248,113,113,0.3)'
                  }
                },
                  h('strong', { style: { color: isDark ? '#fca5a5' : '#b91c1c', fontSize: 14, display: 'block', marginBottom: 8 } }, t('stem.watercycle.what_if_you_had_done_nothing_for_10_ye', '↔ What if you had done nothing for 10 years?')),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                    h('div', { style: { background: isDark ? '#0f172a' : '#f8fafc', padding: 10, borderRadius: 8, borderLeft: '3px solid ' + o.color } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: o.color, marginBottom: 4 } }, t('stem.watercycle.your_campaign', 'Your campaign')),
                      h('div', { style: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 13 } }, 'Avg quality ' + actualAvgQ + ' · Avg connectivity ' + actualAvgConn)
                    ),
                    h('div', { style: { background: isDark ? '#0f172a' : '#f8fafc', padding: 10, borderRadius: 8, borderLeft: '3px solid #ef4444' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: isDark ? '#fca5a5' : '#ef4444', marginBottom: 4 } }, t('stem.watercycle.pure_neglect', 'Pure neglect')),
                      h('div', { style: { color: isDark ? '#cbd5e1' : '#334155', fontSize: 13 } }, 'Avg quality ' + baselineAvgQ + ' · Avg connectivity ' + baselineAvgConn)
                    )
                  ),
                  h('div', { style: { marginTop: 8, fontSize: 12, color: isDark ? '#fde68a' : '#854d0e', lineHeight: 1.5, fontStyle: 'italic' } },
                    actualAvgQ > baselineAvgQ + 8 || actualAvgConn > baselineAvgConn + 8
                      ? 'Your stewardship pulled the watershed substantially ahead of where neglect would have left it. That gap is the riparian, beaver, BMP, and connectivity infrastructure you built.'
                      : (actualAvgQ > baselineAvgQ - 2
                          ? 'You roughly held the line against drift. Sometimes stewardship that matches the do-nothing baseline still counts: stasis is the holding ground for everything you build later.'
                          : 'Active stewardship cost more than it returned this run. Look at WHICH techniques you used and whether the community had the trust to make them stick.')
                  )
                ),
                h('div', { style: { padding: 10, background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, color: isDark ? '#cbd5e1' : '#334155' } },
                  h('strong', { style: { color: '#0ea5e9' } }, t('stem.watercycle.components_at_75_quality', 'Components at 75+ quality: ')), steward.componentsAt75 + ' / 6 · ',
                  h('strong', { style: { color: '#0ea5e9' } }, t('stem.watercycle.connectivity_boosts', 'Connectivity boosts: ')), (steward.connectivityBoosts || 0)
                ),
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    onClick: resetSteward,
                    className: "px-4 py-2 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.97]" : "transition-colors bg-slate-200 text-slate-800 hover:bg-slate-300 active:scale-[0.97]")
                  }, t('stem.watercycle.new_campaign', '↻ New campaign')),
                  h('button', {
                    onClick: function() { startStewardCampaign({ seed: steward.seed, difficulty: steward.difficulty }); },
                    className: "px-4 py-2 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-sky-950/60 text-sky-400 border border-sky-900/50 hover:bg-sky-900/40 active:scale-[0.97]" : "transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300 active:scale-[0.97]")
                  }, t('stem.watercycle.replay_same_conditions', '🔁 Replay same conditions'))
                ),
                h('div', { style: { padding: 8, background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', borderRadius: 8, fontSize: 11.5, color: isDark ? '#cbd5e1' : '#334155', fontFamily: 'ui-monospace, monospace' } },
                  h('span', { style: { color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.watercycle.campaign_seed', 'Campaign seed: ')),
                  h('strong', { style: { color: isDark ? '#cbd5e1' : '#334155' } }, steward.seed)
                )
              );
            }

            // ── REVIEW ──
            if (steward.phase === 'review') {
              var lastSnap = steward.yearLog[steward.yearLog.length - 1] || {};
              var ev = steward.lastEvent || {};
              return h('div', { className: 'max-w-3xl mx-auto space-y-3 ' + (isDark ? 'text-slate-100' : 'text-slate-800') },
                stewardDeepDive,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('button', {
                    onClick: function() { switchMode('explorer'); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-slate-800 text-sky-400 border border-slate-700 hover:bg-slate-700 active:scale-[0.97]" : "transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300 active:scale-[0.97]")
                  }, t('stem.watercycle.water_cycle_explorer_3', '← Water Cycle Explorer')),
                  h('h3', { className: 'text-lg font-bold  tracking-tight' + (isDark ? 'text-slate-100' : 'text-slate-800') }, '💧 Year ' + steward.year + ' review')
                ),
                h('div', {
                  style: {
                    padding: 14,
                    borderRadius: 12,
                    background: isDark ? 'rgba(15,23,42,0.6)' : '#fffbeb',
                    border: isDark ? '1px solid #334155' : '1px solid #fde68a',
                    borderLeft: '4px solid #fbbf24'
                  }
                },
                  h('div', { style: { fontSize: 22, marginBottom: 4 } }, ev.icon || '🌿'),
                  h('strong', { style: { color: '#fbbf24', fontSize: 16 } }, 'Year ' + steward.year + ' event: ' + (ev.name || 'quiet year')),
                  h('p', { style: { margin: '6px 0 0', color: isDark ? '#cbd5e1' : '#475569', fontSize: 13, lineHeight: 1.55 } }, ev.desc || '')
                ),
                (lastSnap.cascades && lastSnap.cascades.length > 0) ? h('div', {
                  style: {
                    padding: 10,
                    borderRadius: 10,
                    background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)',
                    borderLeft: '4px solid #38bdf8',
                    fontSize: 13,
                    color: isDark ? '#bae6fd' : '#0369a1'
                  }
                },
                  h('strong', { style: { color: isDark ? '#38bdf8' : '#0ea5e9' } }, t('stem.watercycle.hydrological_feedback_rules_this_year', '🔄 Hydrological feedback rules this year')),
                  lastSnap.cascades.map(function(c, ci) { return h('div', { key: ci, style: { margin: '6px 0 0', fontStyle: 'italic' } }, '· ' + c.msg); })
                ) : null,

                // ── Steward's debrief — coaching synthesis of THIS year's decisions ──
                (function() {
                  var db = stewardYearDebrief();
                  var pillBg = isDark ? 'rgba(15,23,42,0.55)' : '#ffffff';
                  return h('div', {
                    style: {
                      padding: 12, borderRadius: 12,
                      background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                      border: isDark ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(16,185,129,0.35)',
                      borderLeft: '4px solid #10b981'
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
                      h('strong', { style: { color: isDark ? '#6ee7b7' : '#047857', fontSize: 14 } }, "🧭 Steward's debrief"),
                      h('span', { style: { fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pillBg, border: isDark ? '1px solid #334155' : '1px solid #d1fae5', color: isDark ? '#e2e8f0' : '#334155' } }, db.grade.emoji + ' ' + db.grade.label),
                      h('span', { style: { marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: db.hoursIdle > 0 ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#6ee7b7' : '#047857') } }, db.hoursSpent + '/' + db.hoursPerYear + 'h used' + (db.hoursIdle > 0 ? ' · ' + db.hoursIdle + 'h idle' : ' · full'))
                    ),
                    h('p', { style: { margin: '0 0 6px', fontSize: 12.5, lineHeight: 1.55, color: isDark ? '#cbd5e1' : '#334155' } }, db.grade.note),
                    // Causal chains that fired this year
                    db.fired.length > 0 ? db.fired.map(function(m, i) {
                      return h('p', { key: 'f' + i, style: { margin: '4px 0', fontSize: 12, lineHeight: 1.5, color: isDark ? '#a7f3d0' : '#065f46' } }, '🔗 ' + m);
                    }) : null,
                    // Backfire / tradeoff warning
                    db.backfire ? h('p', { style: { margin: '4px 0', fontSize: 12, lineHeight: 1.5, color: isDark ? '#fca5a5' : '#b91c1c' } }, '⚖️ ' + db.backfire) : null,
                    // Near-miss cascades — the one-move-away coaching
                    db.near.length > 0 ? db.near.map(function(m, i) {
                      return h('p', { key: 'n' + i, style: { margin: '4px 0', fontSize: 12, lineHeight: 1.5, color: isDark ? '#7dd3fc' : '#0369a1' } }, '🎯 ' + m);
                    }) : null,
                    // Strategic next priority
                    db.weakest && db.rec ? h('p', { style: { margin: '6px 0 0', paddingTop: 6, borderTop: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #d1fae5', fontSize: 12, lineHeight: 1.5, fontWeight: 600, color: isDark ? '#e2e8f0' : '#334155' } },
                      '➡️ Weakest link now: ' + db.weakest.def.icon + ' ' + db.weakest.def.name + ' (quality ' + Math.round(db.weakest.c.quality) + ', ' + db.weakest.gap + ' below its goal). Best matched move: ' + db.rec.icon + ' ' + db.rec.name + '.'
                    ) : null
                  );
                })(),

                // Per-component deltas
                h('div', {
                  style: {
                    background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: 10
                  }
                },
                  h('div', { style: { fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6, fontSize: 13 } }, t('stem.watercycle.what_changed_this_year', 'What changed this year')),
                  (lastSnap.pre || []).map(function(preC) {
                    var postC = (lastSnap.post || []).find(function(p) { return p.id === preC.id; }) || preC;
                    var def = getWatershedComponent(preC.id);
                    function delta(label, before, after) {
                      var dlt = Math.round(after - before);
                      var color = isDark ? '#64748b' : '#94a3b8'; var arrow = '·';
                      if (Math.abs(dlt) >= 1) { color = dlt > 0 ? '#22c55e' : '#ef4444'; arrow = dlt > 0 ? '▲' : '▼'; }
                      return h('span', { style: { color: color, fontSize: 11, fontWeight: 700, marginRight: 8 } }, label + ' ' + Math.round(after) + ' ' + arrow + ' ' + (dlt > 0 ? '+' : '') + dlt);
                    }
                    return h('div', { key: preC.id, style: { fontSize: 12, padding: '4px 0', borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' } },
                      h('strong', { style: { color: def.color, marginRight: 8 } }, def.icon + ' ' + def.name),
                      delta('Q', preC.quality, postC.quality),
                      delta('Conn', preC.connectivity, postC.connectivity),
                      delta('Sup', preC.support, postC.support)
                    );
                  })
                ),

                h('button', {
                  onClick: advanceFromStewardReview,
                  className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                  style: { width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + T_BLUE + ' 0%, #0369a1 100%)', color: '#fff', fontWeight: 700, fontSize: 14 }
                },
                  steward.year >= steward.maxYears ? 'See final outcome →' : 'Begin Year ' + (steward.year + 1) + ' →')
              );
            }

            // ── YEAR ──
            var coachingTip = (steward.year === 1 && !steward.firstTipDismissed && steward.yearActions.length === 0) ? stewardCoachingTip() : null;
            return h('div', { className: 'max-w-3xl mx-auto space-y-3 ' + (isDark ? 'text-slate-100' : 'text-slate-800') },
              stewardDeepDive,
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('button', {
                  onClick: function() { switchMode('explorer'); },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-slate-800 text-sky-400 border border-slate-700 hover:bg-slate-700 active:scale-[0.97]" : "transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-300 active:scale-[0.97]")
                }, t('stem.watercycle.water_cycle_explorer_4', '← Water Cycle Explorer')),
                h('h3', { className: 'text-lg font-bold  tracking-tight' + (isDark ? 'text-slate-100' : 'text-slate-800') }, '💧 Watershed Steward · Year ' + steward.year)
              ),
              coachingTip ? h('div', {
                role: 'note',
                style: {
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(15,23,42,0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, #fffbeb 100%)',
                  border: isDark ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(168,85,247,0.3)',
                  borderLeft: '4px solid #a855f7',
                  color: isDark ? '#e9d5ff' : '#5b21b6',
                  fontSize: 13,
                  lineHeight: 1.55,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10
                }
              },
                h('span', { style: { fontSize: 20, flexShrink: 0 } }, '🪶'),
                h('div', { style: { flex: 1 } },
                  h('strong', { style: { color: isDark ? '#c084fc' : '#6b21a8' } }, t('stem.watercycle.year_1_priority', 'Year 1 priority: ')),
                  h('span', { style: { color: isDark ? '#fde68a' : '#854d0e' } }, coachingTip.priority),
                  h('div', { style: { marginTop: 4, color: isDark ? '#cbd5e1' : '#475569' } }, coachingTip.text)
                ),
                h('button', {
                  onClick: function() { setSteward({ firstTipDismissed: true }); },
                  'aria-label': t('stem.watercycle.dismiss_tip', 'Dismiss tip'),
                  className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                  style: { background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', fontSize: 16, padding: 0, marginLeft: 6 }
                }, '✕')
              ) : null,
              // AI panel renders here when active
              renderStewardAIPanel(),
              // HUD
              h('div', {
                style: {
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.85) 100%)'
                    : 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, #f8fafc 100%)',
                  border: isDark ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(14,165,233,0.3)',
                  borderLeft: '4px solid ' + T_BLUE,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap'
                }
              },
                h('div', null,
                  h('div', { style: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.watercycle.year', 'Year')),
                  h('div', { style: { fontSize: 20, fontWeight: 800, color: T_BLUE_HI } }, steward.year + ' / ' + steward.maxYears)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.watercycle.hours_left', 'Hours left')),
                  h('div', { style: { fontSize: 20, fontWeight: 800, color: '#fbbf24' } }, steward.hoursLeft + ' / ' + steward.hoursPerYear)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' } }, t('stem.watercycle.connectivity_boosts_2', 'Connectivity boosts')),
                  h('div', { style: { fontSize: 20, fontWeight: 800, color: '#a855f7' } }, steward.connectivityBoosts || 0)
                ),
                h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                  callGemini ? h('button', {
                    onClick: readWatershed,
                    disabled: steward.aiReadLoading,
                    'aria-label': t('stem.watercycle.ask_ai_watershed_educator_to_read_your', 'Ask AI watershed educator to read your watershed data'),
                    title: t('stem.watercycle.ai_watershed_science_educator_reads_yo', 'AI watershed-science educator reads your current state'),
                    className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                    style: {
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #38bdf8',
                      cursor: steward.aiReadLoading ? 'wait' : 'pointer',
                      background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: 12,
                      opacity: steward.aiReadLoading ? 0.6 : 1
                    }
                  }, steward.aiReadLoading ? '⏳ Reading...' : '🔍 Read the watershed (AI)') : null,
                  h('button', {
                    onClick: endStewardYear,
                    'aria-label': t('stem.watercycle.end_this_year', 'End this year'),
                    className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all font-bold rounded-lg",
                    style: { padding: '10px 16px', border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontSize: 13 }
                  }, t('stem.watercycle.end_year', 'End Year →'))
                )
              ),

              // Component cards with actions
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 } },
                steward.components.map(function(c) {
                  var def = getWatershedComponent(c.id);
                  if (!def) return null;
                  var applicable = STEWARD_TECHNIQUES.filter(function(t) {
                    return t.appliesTo === 'any' || t.appliesTo.indexOf(c.id) >= 0;
                  });
                  return h('div', {
                    key: c.id,
                    style: {
                      background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      borderRadius: 12,
                      padding: 12,
                      borderLeft: '3px solid ' + def.color
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                      h('span', { style: { fontSize: 22 } }, def.icon),
                      h('div', { style: { flex: 1 } },
                        h('div', { style: { fontWeight: 700, color: def.color, fontSize: 14 } }, def.name),
                        h('div', { style: { fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' } }, def.role)
                      ),
                      def.deepDive ? h('button', {
                        onClick: function() { openStewardDeepDive(c.id); },
                        'aria-label': 'Deep-dive for ' + def.name,
                        title: t('stem.watercycle.watershed_deep_dive_3', 'Watershed deep-dive'),
                        className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                        style: {
                          background: 'transparent',
                          border: '1px solid ' + def.color + (isDark ? '88' : '55'),
                          color: def.color,
                          cursor: 'pointer',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontWeight: 700
                        }
                      }, '📚') : null
                    ),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 } },
                      [['Q', Math.round(c.quality), c.quality < 40 ? (isDark ? '#ef4444' : '#b91c1c') : c.quality < 65 ? (isDark ? '#f59e0b' : '#b45309') : (isDark ? '#22c55e' : '#15803d'), def.targets.quality],
                       ['Conn', Math.round(c.connectivity), c.connectivity < 40 ? (isDark ? '#ef4444' : '#b91c1c') : c.connectivity < 65 ? (isDark ? '#f59e0b' : '#b45309') : (isDark ? '#22c55e' : '#15803d'), def.targets.connectivity],
                       ['Sup', Math.round(c.support), c.support < 40 ? (isDark ? '#ef4444' : '#b91c1c') : c.support < 60 ? (isDark ? '#f59e0b' : '#b45309') : (isDark ? '#22c55e' : '#15803d'), def.targets.support]
                      ].map(function(st, si) {
                        return h('div', {
                          key: si,
                          style: {
                            background: isDark ? '#0f172a' : '#f8fafc',
                            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                            padding: 6,
                            borderRadius: 6,
                            textAlign: 'center'
                          }
                        },
                          h('div', { style: { fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' } }, st[0]),
                          h('div', { style: { fontSize: 15, fontWeight: 800, color: st[2] } }, st[1]),
                          h('div', { style: { fontSize: 9, color: isDark ? '#94a3b8' : '#475569' } }, 'goal ' + st[3])
                        );
                      })
                    ),
                    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                      applicable.filter(function(t) { return t.appliesTo !== 'any'; }).map(function(t) {
                        var disabled = steward.hoursLeft < t.hours;
                        return h('button', {
                          key: t.id,
                          onClick: function() { applyStewardTech(t.id, c.id); },
                          disabled: disabled,
                          title: t.desc,
                          className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                          style: {
                            padding: '4px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            background: disabled ? (isDark ? '#1e293b' : '#f1f5f9') : '#0ea5e9',
                            color: disabled ? (isDark ? '#475569' : '#94a3b8') : '#fff',
                            opacity: disabled ? 0.5 : 1
                          }
                        },
                          t.icon + ' ' + t.name + ' (' + t.hours + 'h)'
                        );
                      })
                    )
                  );
                })
              ),

              // Watershed-wide interventions row
              h('div', {
                style: {
                  background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 12,
                  borderLeft: '3px solid #38bdf8'
                }
              },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8 } }, t('stem.watercycle.watershed_wide_actions', '🛠 Watershed-wide actions')),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                  STEWARD_TECHNIQUES.filter(function(t) { return t.appliesTo === 'any'; }).map(function(t) {
                    var disabled = steward.hoursLeft < t.hours;
                    return h('button', {
                      key: t.id,
                      onClick: function() { applyStewardTech(t.id, null); },
                      disabled: disabled,
                      title: t.desc,
                      className: "focus:ring-2 focus:ring-yellow-500 focus:outline-none transition-all",
                      style: {
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        background: disabled ? (isDark ? '#1e293b' : '#f1f5f9') : '#0ea5e9',
                        color: disabled ? (isDark ? '#475569' : '#94a3b8') : '#fff',
                        opacity: disabled ? 0.5 : 1
                      }
                    },
                      t.icon + ' ' + t.name + ' (' + t.hours + 'h)'
                    );
                  })
                )
              ),

              // Action log
              steward.yearActions.length > 0 ? h('div', {
                style: {
                  background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 12,
                  color: isDark ? '#cbd5e1' : '#475569'
                }
              },
                h('div', { style: { fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 4 } }, 'Year ' + steward.year + ' actions'),
                steward.yearActions.map(function(a, ai) {
                  return h('div', { key: ai }, '· ' + a.tech + ' → ' + a.target + ' (' + a.hours + 'h)');
                })
              ) : h('div', { style: { fontSize: 12, color: isDark ? '#cbd5e1' : '#64748b', fontStyle: 'italic' } }, t('stem.watercycle.no_actions_yet_this_year_pick_a_compon', 'No actions yet this year. Pick a component, pick a technique.'))
            );
          }

          // If user has switched into Watershed Steward mode, render that
          // instead of the existing Water Cycle Explorer.
          if (wcMode === 'steward') {
            return renderStewardCampaign();
          }
          // === H7b'' inquiry widget: precipitation discovery ===
          if (wcMode === 'precipHunt') {
            var iq = d.precipHunt || { moisture: 50, tempC: 20, wind: 10, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
            function setIQ(patch) { upd('precipHunt', Object.assign({}, iq, patch)); }
            // Precipitation type: depends on temp + moisture + wind interaction
            var cloudCondensation = (iq.moisture / 100) * Math.max(0, (35 - iq.tempC) / 35);
            var liftEffect = iq.wind / 60;
            var rate = cloudCondensation * 0.7 + liftEffect * 0.3;
            var ptype;
            if (rate < 0.15) ptype = 'clear';
            else if (rate < 0.35) ptype = 'drizzle';
            else if (rate < 0.65) ptype = 'rain';
            else ptype = 'storm';
            var ptMeta = {
              clear:   { label: t('stem.watercycle.clear_very_light', '☀️ Clear / very light'), color: '#facc15', bg: '#fefce8', border: '#fde047', desc: t('stem.watercycle.insufficient_condensation_too_warm_or_', 'Insufficient condensation — too warm or too dry.') },
              drizzle: { label: t('stem.watercycle.light_drizzle', '🌦️ Light drizzle'),      color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: t('stem.watercycle.slow_condensation_steady_but_gentle_pr', 'Slow condensation. Steady but gentle precipitation.') },
              rain:    { label: t('stem.watercycle.moderate_rain', '🌧️ Moderate rain'),     color: '#0284c7', bg: '#e0f2fe', border: '#7dd3fc', desc: t('stem.watercycle.strong_condensation_typical_rainfall', 'Strong condensation. Typical rainfall.') },
              storm:   { label: t('stem.watercycle.storm_burst', '⛈️ Storm burst'),        color: '#1e40af', bg: '#dbeafe', border: '#60a5fa', desc: t('stem.watercycle.high_moisture_cool_temp_strong_lift_he', 'High moisture + cool temp + strong lift → heavy convective precipitation.') }
            }[ptype];
            function logObs() {
              setIQ({ log: (iq.log || []).concat([{ m: iq.moisture, t: iq.tempC, w: iq.wind, p: ptype }]).slice(-8) });
            }
            return h('div', { className: 'p-4 rounded-xl bg-white border border-cyan-200 shadow-sm space-y-3' },
              h('button', { onClick: function() { upd('wcMode', 'explorer'); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700' }, t('stem.watercycle.back_to_explorer', '← Back to Explorer')),
              h('h3', { className: 'text-sm font-black text-cyan-700' }, t('stem.watercycle.precipitation_discovery', '🌧️ Precipitation discovery')),
              h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' },
                t('stem.watercycle.adjust_cloud_moisture_temperature_and_', 'Adjust cloud moisture, temperature, and wind. Widget classifies precipitation into one of four discrete types. No score, no reveal — sweep and notice.')),
              h('div', { className: 'p-3 rounded-lg text-center', style: { background: ptMeta.bg, border: '2px solid ' + ptMeta.border } },
                h('div', { className: 'text-base font-black', style: { color: ptMeta.color } }, ptMeta.label),
                h('div', { className: 'text-[11px] text-slate-700 mt-1' }, ptMeta.desc)
              ),
              h('div', { className: 'grid grid-cols-3 gap-3' },
                [
                  { key: 'moisture', label: t('stem.watercycle.moisture', 'Moisture (%)'),  val: iq.moisture, min: 0, max: 100, step: 1 },
                  { key: 'tempC',    label: t('stem.watercycle.temp_c', 'Temp (°C)'),     val: iq.tempC,    min: -10, max: 40, step: 1 },
                  { key: 'wind',     label: t('stem.watercycle.wind_m_s', 'Wind (m/s)'),    val: iq.wind,     min: 0, max: 60, step: 1 }
                ].map(function(s) {
                  return h('div', { key: s.key },
                    h('label', { htmlFor: 'ph-' + s.key, className: 'block text-[11px] font-bold text-slate-700' },
                      s.label + ': ', h('span', { className: 'font-mono text-cyan-700' }, s.val)),
                    h('input', { id: 'ph-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                      onChange: function(e) { var p = {}; p[s.key] = parseInt(e.target.value, 10); setIQ(p); },
                      className: 'w-full', 'aria-label': s.label }));
                })
              ),
              h('div', { className: 'flex gap-2 items-center flex-wrap' },
                h('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, t('stem.watercycle.log', '📋 Log')),
                h('button', { onClick: function() { setIQ({ moisture: 50, tempC: 20, wind: 10, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, t('stem.watercycle.reset', '↺ Reset')),
                (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
              ),
              (iq.log || []).length > 0 && h('table', { className: 'text-[10px] w-full border-collapse text-slate-700' },
                h('thead', null, h('tr', { className: 'bg-slate-100' }, ['moisture', 'temp', 'wind', 'type'].map(function(c, i) { return h('th', { key: 'h' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
                h('tbody', null, iq.log.map(function(o, idx) {
                  return h('tr', { key: 'lr' + idx },
                    h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.m),
                    h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.t),
                    h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.w),
                    h('td', { className: 'px-1 border border-slate-200' }, o.p));
                }))
              ),
              h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.watercycle.hypothesis_free_text_what_triggers_a_s', 'Hypothesis (free text): What triggers a storm vs drizzle?'),
                className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
              !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, t('stem.watercycle.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
              iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                h('ul', { className: 'list-disc pl-5 space-y-1' },
                  h('li', null, t('stem.watercycle.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch.')),
                  h('li', null, t('stem.watercycle.find_two_settings_producing_the_same_t', 'Find two settings producing the same type.')),
                  h('li', null, t('stem.watercycle.real_storms_need_both_moisture_and_ins', 'Real storms need both moisture and instability. Investigate.')))),
              h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  t('stem.watercycle.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.watercycle.explain_how_moisture_temperature_and_w', 'Explain how moisture, temperature, and wind jointly determine precipitation type.'),
                  className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
              h('div', { className: 'text-[10px] italic text-slate-500' }, t('stem.watercycle.design_note_discrete_4_type_precipitat', 'Design note: discrete 4-type precipitation marker; no rainfall-rate score; no reveal — by design.'))
            );
          }

          // ═══ GRADE BAND HELPER ═══
          var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
          function getGradeBand() {
            var ov = d.wcGradeOverride;
            if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
            var gl = (gradeLevel || '5th Grade').toLowerCase();
            if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
            if (/3rd|4th|5th/.test(gl)) return '3-5';
            if (/6th|7th|8th/.test(gl)) return '6-8';
            if (/9th|10|11|12|high/.test(gl)) return '9-12';
            return '3-5';
          }
          var gradeBand = getGradeBand();

          // ═══ GRADE-TIERED STAGES ═══
          const STAGES = [
            { id: 'evaporation', label: t('stem.water_cycle.evaporation'), emoji: '\u2600', color: '#f59e0b',
              desc: { 'K-2': 'The sun heats up water in puddles, lakes, and oceans. The water turns into an invisible gas that floats up into the sky  -  like when a puddle disappears on a hot day!',
                      '3-5': 'Heat from the sun causes water to change from liquid to gas (water vapor). Oceans, lakes, and rivers provide most of the evaporated water. About 90% of evaporation comes from oceans.',
                      '6-8': 'Solar radiation provides thermal energy that increases water molecule kinetic energy until they escape the liquid surface as vapor. The rate depends on temperature, humidity, wind speed, and surface area. Oceans contribute ~90% of atmospheric moisture.',
                      '9-12': 'Evaporation is governed by the Clausius-Clapeyron relation: saturation vapor pressure increases ~7% per \u00B0C. The latent heat of vaporization is 2.45 MJ/kg at 20\u00B0C. Penman-Monteith equations model evapotranspiration using net radiation, soil heat flux, and aerodynamic resistance.' },
              funFact: { 'K-2': 'All the water floating in the sky as invisible vapor would only cover the ground about as deep as your fingertip  -  the sky holds just a tiny bit of Earth\'s water at one time!',
                         '3-5': 'If all the water vapor in the atmosphere rained at once, it would cover Earth with only 2.5 cm of water!',
                         '6-8': 'The atmosphere holds about 12,900 km\u00B3 of water vapor at any time  -  but that is only 0.001% of all water on Earth.',
                         '9-12': 'Global mean evaporation is ~1,200 mm/yr over oceans. The Bowen ratio (sensible/latent heat) determines partitioning of surface energy into evaporation vs heating.' } },
            { id: 'condensation', label: t('stem.water_cycle.condensation'), emoji: '\u2601', color: 'var(--allo-stem-text-soft, #94a3b8)',
              desc: { 'K-2': 'When the warm, wet air goes high up where it is cold, the water vapor turns back into tiny water drops. These tiny drops stick together and make clouds!',
                      '3-5': 'Water vapor cools as it rises, forming tiny droplets around particles of dust, pollen, or pollution, creating clouds. Each cloud droplet is about 10 micrometers wide.',
                      '6-8': 'As air rises, it cools at ~6.5\u00B0C/km (environmental lapse rate). When temperature reaches the dew point, vapor condenses onto cloud condensation nuclei (CCN)  -  aerosol particles 0.1-1 \u00B5m wide. Cloud droplets are typically 5-15 \u00B5m.',
                      '9-12': 'Heterogeneous nucleation on CCN requires supersaturation of only ~0.1-1%. K\u00F6hler theory describes the competition between the Kelvin effect (curvature) and the Raoult effect (solute). The critical supersaturation determines which CCN activate into cloud droplets.' },
              funFact: { 'K-2': 'A big fluffy cloud weighs as much as 100 elephants! But it floats because the tiny drops are spread out.',
                         '3-5': 'A typical cumulus cloud weighs about 500,000 kg - as heavy as 100 elephants!',
                         '6-8': 'Clouds reflect ~30% of incoming solar radiation (albedo), making them one of the biggest factors in Earth\'s energy budget.',
                         '9-12': 'Cloud microphysics distinguishes warm-phase (collision-coalescence) and cold-phase (Bergeron-Findeisen) precipitation processes, with ice nucleation occurring at -10\u00B0C to -40\u00B0C.' } },
            { id: 'precipitation', label: t('stem.water_cycle.precipitation'), emoji: '\uD83C\uDF27', color: '#3b82f6',
              desc: { 'K-2': 'When the tiny water drops in clouds bump into each other and get big and heavy, they fall down as rain! If it is very cold, they fall as snow or hail.',
                      '3-5': 'When cloud droplets combine and grow heavy enough, they fall as rain, snow, sleet, or hail. A raindrop falls at about 20 mph and contains about a million cloud droplets.',
                      '6-8': 'Precipitation forms via collision-coalescence (warm clouds) or the Bergeron process (mixed-phase clouds where ice crystals grow at the expense of supercooled droplets). Terminal velocity of a 2mm raindrop is ~6.5 m/s.',
                      '9-12': 'The Marshall-Palmer distribution N(D)=N\u2080e^(-\u039BD) models raindrop size spectra. Z-R relationships (Z=aR^b) connect radar reflectivity to precipitation rate. Convective precipitation involves CAPE > 1000 J/kg driving updrafts.' },
              funFact: { 'K-2': 'A single raindrop is made of about a million teeny-tiny cloud drops all stuck together!',
                         '3-5': 'The wettest place on Earth is Mawsynram, India, with ~11,871 mm of rain per year.',
                         '6-8': 'The largest hailstone ever recorded was 20 cm in diameter  -  bigger than a softball  -  and fell in Vivian, South Dakota.',
                         '9-12': 'Global mean precipitation is ~990 mm/yr. ENSO cycles can shift tropical precipitation patterns by hundreds of millimeters per year.' } },
            { id: 'collection', label: t('stem.water_cycle.collection'), emoji: '\uD83C\uDF0A', color: '#0ea5e9',
              desc: { 'K-2': 'Rainwater flows into rivers, lakes, and the big ocean. Some soaks into the ground. Almost all of Earth\'s water is in the salty ocean!',
                      '3-5': 'Water gathers in oceans, rivers, lakes, and underground aquifers. 97% of Earth\'s water is in the oceans. Only 3% is freshwater, and most of that is locked in ice caps.',
                      '6-8': 'Earth holds ~1.386 billion km\u00B3 of water. Oceans contain 96.5%, ice caps 1.74%, groundwater 1.69%, and surface freshwater only 0.01%. Residence time in the ocean averages ~3,200 years.',
                      '9-12': 'The global water budget balances precipitation (~505,000 km\u00B3/yr) against evapotranspiration. Ocean thermohaline circulation redistributes ~1.5 PW of heat poleward. Isotope ratios (\u03B4\u00B9\u2078O, \u03B4D) trace water mass origins.' },
              funFact: { 'K-2': 'If all of Earth\'s water fit in a big jug, the fresh water you can drink would be just one tiny spoonful!',
                         '3-5': 'If all of Earth\'s water fit in a gallon jug, fresh available water would be just one tablespoon.',
                         '6-8': 'The average water molecule spends about 9 days in the atmosphere before falling as precipitation.',
                         '9-12': 'Antarctic ice cores preserve 800,000 years of climate history, with \u03B4\u00B9\u2078O variations of ~5\u2030 between glacial and interglacial periods.' } },
            { id: 'transpiration', label: t('stem.water_cycle.transpiration'), emoji: '\uD83C\uDF3F', color: '#22c55e',
              desc: { 'K-2': 'Plants drink water through their roots. Then the water travels up to the leaves and floats away into the air through tiny holes  -  like the plant is breathing!',
                      '3-5': 'Plants absorb water through roots and release vapor from tiny pores called stomata in their leaves. A large tree can transpire substantial amounts of water, but the rate varies widely with species, size, season, soil moisture, and weather.',
                      '6-8': 'Transpiration is driven by the soil-plant-atmosphere continuum. Water moves through xylem via cohesion-tension, exiting through ~100,000 stomata per cm\u00B2 of leaf surface. Guard cells regulate stomatal aperture in response to light, CO\u2082, and water stress.',
                      '9-12': 'The Penman-Monteith equation models transpiration: ET = [\u0394(Rn-G) + \u03C1a·cp·VPD/ra] / [\u0394 + \u03B3(1 + rs/ra)]. Stomatal conductance follows the Ball-Berry model linking assimilation, humidity, and CO\u2082 concentration.' },
              funFact: { 'K-2': 'A big oak tree lets out enough water every year to fill a swimming pool!',
                         '3-5': 'An acre of corn transpires about 11,400 liters of water per day!',
                         '6-8': 'Globally, transpiration accounts for about 10% of atmospheric moisture  -  forests act as giant water pumps.',
                         '9-12': 'Amazon rainforest transpiration generates ~50% of its own rainfall via atmospheric moisture recycling, a process modeled by the "flying rivers" hypothesis.' } },
            { id: 'infiltration', label: t('stem.water_cycle.infiltration'), emoji: '\uD83E\uDEB4', color: '#92400e',
              desc: { 'K-2': 'Some rainwater soaks into the ground like a sponge! It goes down through dirt and rocks, getting cleaned along the way. This underground water fills wells and springs.',
                      '3-5': 'Water soaks through soil and porous rock layers, replenishing underground aquifers that feed wells, springs, and rivers. This process naturally filters the water.',
                      '6-8': 'Infiltration rate depends on soil porosity, hydraulic conductivity, and antecedent moisture. Darcy\'s Law (Q = KA·dh/dl) governs flow through saturated porous media. Typical hydraulic conductivity ranges from 10\u207B\u00B9\u00B2 m/s (clay) to 10\u207B\u00B2 m/s (gravel).',
                      '9-12': 'Richards\' equation extends Darcy\'s Law to unsaturated flow: \u2202\u03B8/\u2202t = \u2207·[K(\u03B8)\u2207(\u03C8+z)]. Van Genuchten parameters characterize soil-water retention curves. Isotope tracers (tritium, \u00B3H) date groundwater residence times from years to millennia.' },
              funFact: { 'K-2': 'Some underground water has been down there longer than the dinosaurs!',
                         '3-5': 'It can take hundreds or thousands of years for water to travel through an aquifer.',
                         '6-8': 'The Ogallala Aquifer under the US Great Plains holds about 3,000 km\u00B3 of water  -  enough to cover the entire US in 40 cm of water.',
                         '9-12': 'Groundwater depletion in the Indo-Gangetic Basin exceeds 50 km\u00B3/yr, detectable via GRACE satellite gravity anomalies averaging -2 cm/yr equivalent water height.' } },
          ];

          const sel = STAGES.find(s => s.id === (d.activeStage || 'evaporation'));
          // Resolve grade-tiered content
          var selDesc = sel ? (typeof sel.desc === 'object' ? (sel.desc[gradeBand] || sel.desc['3-5']) : sel.desc) : '';
          var selFunFact = sel ? (typeof sel.funFact === 'object' ? (sel.funFact[gradeBand] || sel.funFact['3-5']) : sel.funFact) : '';
          // Phase-change tag per stage — ties each process to the state change driving it (the
          // core standards-level idea). "State:" where no phase change occurs (gravity/storage).
          var STAGE_PHASE = {
            evaporation:   '🔥→💨 Liquid → gas — absorbs heat energy (the sun powers this)',
            condensation:  '💨→💧 Gas → liquid — releases the stored heat back to the air',
            precipitation: '💧/❄ Liquid (rain) or solid (snow/hail) falls — gravity, not a phase change',
            collection:    '💧 Liquid stored in oceans, lakes & rivers (and solid as ice)',
            transpiration: '🌿→💨 Liquid → gas — water vapor exits the leaves',
            infiltration:  '💧 Liquid soaking down into soil and rock — no phase change'
          };
          var selPhase = sel ? STAGE_PHASE[sel.id] : '';

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('waterCycle', 'init', {
              first: 'Water Cycle Simulator loaded. Currently viewing ' + (sel ? sel.label : 'evaporation') + '. This interactive diagram shows evaporation, condensation, precipitation, collection, transpiration, and infiltration.',
              repeat: 'Water Cycle, stage: ' + (sel ? sel.label : 'evaporation') + '.',
              terse: 'Water Cycle.'
            }, { debounce: 800 });
          }




          // Canvas animation

          var _lastWcCanvas = null;

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {
              var detachedCanvas = _lastWcCanvas;
              _lastWcCanvas = null;
              // React calls an old callback ref with null on ordinary rerenders.
              // Defer teardown so the same, still-connected canvas keeps its progress.
              setTimeout(function() {
                if (detachedCanvas && !detachedCanvas.isConnected && detachedCanvas._wcCleanup) {
                  detachedCanvas._wcCleanup();
                  detachedCanvas._wcInit = false;
                }
              }, 0);
              return;
            }

            _lastWcCanvas = canvasEl;

            if (canvasEl._wcInit) return;

            canvasEl._wcInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');
            if (!ctx) { canvasEl._wcInit = false; return; }

            var dpr = 2;

            var tick = 0;
            var wcAlive = true;
            var wcMotionReduced = false;
            try { wcMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isWaterCycleHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelWaterCycleFrame() {
              if (canvasEl._wcAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._wcAnim);
              canvasEl._wcAnim = null;
            }

            function scheduleWaterCycleFrame() {
              if (!wcAlive || canvasEl._wcAnim || isWaterCycleHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvasEl._wcAnim = requestAnimationFrame(draw);
            }

            function cleanupWaterCycleCanvas() {
              wcAlive = false;
              cancelWaterCycleFrame();
              canvasEl.removeEventListener('click', onWaterCycleCanvasClick);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onWaterCycleVisibilityChange);
              canvasEl._onJourneyTransition = null;
              canvasEl._onJourneyComplete = null;
              canvasEl._wcSyncReact = null;
              canvasEl._wcRestartJourney = null;
              canvasEl._wcCleanup = null;
            }

            function onWaterCycleVisibilityChange() {
              if (!wcAlive) return;
              if (!canvasEl.isConnected) { cleanupWaterCycleCanvas(); return; }
              if (isWaterCycleHidden()) cancelWaterCycleFrame();
              else { cancelWaterCycleFrame(); draw(); }
            }

            canvasEl._wcCleanup = cleanupWaterCycleCanvas;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onWaterCycleVisibilityChange);



            // Evaporation particles (rising)

            var evapPs = [];

            for (var ei = 0; ei < 40; ei++) {

              evapPs.push({ x: Math.random() * cW * 0.55 / dpr, y: cH * 0.6 / dpr + Math.random() * cH * 0.1 / dpr, size: 1.5 + Math.random() * 2, speed: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });

            }

            // Rain drops

            var rainPs = [];

            for (var ri = 0; ri < 35; ri++) {

              rainPs.push({ x: cW * 0.1 / dpr + Math.random() * cW * 0.5 / dpr, y: cH * 0.1 / dpr + Math.random() * cH * 0.4 / dpr, speed: 1 + Math.random() * 1.5, len: 3 + Math.random() * 4, phase: Math.random() * Math.PI * 2 });

            }

            // Cloud wisps

            var cloudPs = [];

            for (var ci = 0; ci < 20; ci++) {

              cloudPs.push({ x: Math.random() * cW / dpr, y: cH * 0.05 / dpr + Math.random() * cH * 0.15 / dpr, size: 3 + Math.random() * 5, phase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.3 });

            }

            // Transpiration particles (from trees)

            var transPs = [];

            for (var ti = 0; ti < 15; ti++) {

              transPs.push({ x: cW * 0.55 / dpr + Math.random() * cW * 0.15 / dpr, y: cH * 0.45 / dpr + Math.random() * cH * 0.1 / dpr, size: 1 + Math.random() * 1.5, speed: 0.2 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });

            }

            // Infiltration drips

            var infiltPs = [];

            for (var ii = 0; ii < 15; ii++) {

              infiltPs.push({ x: cW * 0.3 / dpr + Math.random() * cW * 0.4 / dpr, y: cH * 0.68 / dpr + Math.random() * cH * 0.05 / dpr, speed: 0.15 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 });

            }

            // River flow particles

            var riverPs = [];

            for (var rfi = 0; rfi < 12; rfi++) {

              riverPs.push({ t: Math.random(), speed: 0.003 + Math.random() * 0.004 });

            }

            // ═══ CLIMATE LAB  -  dynamic weather particles ═══
            var snowPs = [];
            for (var si = 0; si < 50; si++) {
              snowPs.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.65 / dpr, size: 1 + Math.random() * 2.5, speed: 0.2 + Math.random() * 0.4, drift: Math.random() * Math.PI * 2, wobble: 0.3 + Math.random() * 0.5 });
            }
            var fogPs = [];
            for (var fi2 = 0; fi2 < 12; fi2++) {
              fogPs.push({ x: Math.random() * cW / dpr, y: cH * 0.5 / dpr + Math.random() * cH * 0.15 / dpr, size: 20 + Math.random() * 30, speed: 0.08 + Math.random() * 0.12, alpha: 0.03 + Math.random() * 0.04 });
            }
            var lightning = { active: false, timer: 0, x: 0, branches: [] };
            var rainbow = { visible: false, alpha: 0 };
            var starField = [];
            for (var sti = 0; sti < 60; sti++) {
              starField.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.35 / dpr, size: 0.5 + Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 });
            }


            // ═══ JOURNEY MODE ENGINE ═══
            var journey = { state: canvasEl.dataset.journeyState || 'idle', progress: 0, pathIdx: 0, timer: 0, particleTrail: [], phase: 0 };

            // Waypoint paths (fractional coords relative to cW/cH, in dpr-independent space)
            var JOURNEY_PATHS = {
              ocean:        { pts: [{x:0.25,y:0.67},{x:0.20,y:0.66},{x:0.15,y:0.67},{x:0.25,y:0.68}], loop: true },
              evaporating:  { pts: [{x:0.25,y:0.64},{x:0.22,y:0.55},{x:0.20,y:0.45},{x:0.22,y:0.35},{x:0.25,y:0.22}], loop: false },
              condensing:   { pts: [{x:0.25,y:0.22},{x:0.30,y:0.18},{x:0.35,y:0.14},{x:0.40,y:0.12}], loop: false },
              precipitating:{ pts: [{x:0.40,y:0.12},{x:0.38,y:0.25},{x:0.36,y:0.38},{x:0.35,y:0.50},{x:0.34,y:0.62}], loop: false },
              river_runoff: { pts: [{x:0.34,y:0.62},{x:0.38,y:0.63},{x:0.45,y:0.64},{x:0.50,y:0.65},{x:0.40,y:0.66},{x:0.30,y:0.67},{x:0.25,y:0.67}], loop: false },
              infiltrating: { pts: [{x:0.34,y:0.62},{x:0.35,y:0.70},{x:0.34,y:0.76},{x:0.33,y:0.82}], loop: false },
              aquifer_flow: { pts: [{x:0.33,y:0.82},{x:0.28,y:0.84},{x:0.22,y:0.83},{x:0.15,y:0.80},{x:0.10,y:0.75},{x:0.08,y:0.70},{x:0.10,y:0.67}], loop: false },
              plant_absorb: { pts: [{x:0.34,y:0.62},{x:0.45,y:0.63},{x:0.55,y:0.62},{x:0.58,y:0.58}], loop: false },
              transpiring:  { pts: [{x:0.58,y:0.58},{x:0.57,y:0.48},{x:0.56,y:0.38},{x:0.55,y:0.28},{x:0.50,y:0.20}], loop: false }
            };

            // Science facts shown at each transition
            var JOURNEY_FACTS = {
              ocean:       'You are in the ocean! 97% of Earth\'s water is here. The sun heats you up...',
              evaporating: 'Solar energy gives some surface molecules enough speed to escape as invisible water vapor  -  no boiling needed! Evaporation happens at everyday temperatures, fastest when it is warm, sunny, and windy.',
              condensing:  'As you rise, temperature drops ~6.5\u00B0C per 1000m. You condense onto tiny dust particles to form a cloud droplet!',
              precipitating:'Cloud droplets collide and merge. When you reach ~0.5mm, gravity overcomes air resistance  -  you fall!',
              ground_choice:'You hit the ground! Water can take 3 paths from here. Where will you go?',
              river_runoff: 'Surface runoff! You flow downhill over soil and rock, joining streams and rivers back to the ocean.',
              infiltrating: 'You seep through soil pores, filtered naturally. Some water takes hundreds of years to reach the ocean!',
              aquifer_flow: 'Deep underground in porous rock, you join the aquifer  -  Earth\'s hidden reservoir.',
              plant_absorb: 'Roots absorb you via osmosis! You travel up through the xylem to the leaves.',
              transpiring:  'Through tiny stomata pores, you evaporate from the leaf surface back into the atmosphere!'
            };

            // Journey state labels for HUD
            var JOURNEY_STATE_LABELS = {
              idle: '', ocean: '\uD83C\uDF0A In the Ocean', evaporating: '\u2600\uFE0F Evaporating!',
              condensing: '\u2601\uFE0F Condensing', precipitating: '\uD83C\uDF27\uFE0F Falling!',
              ground_choice: '\uD83E\uDEA8 Choose Your Path', river_runoff: '\uD83C\uDF0A River Runoff',
              infiltrating: '\uD83E\uDEB4 Infiltrating', aquifer_flow: '\uD83D\uDCA7 Aquifer Flow',
              plant_absorb: '\uD83C\uDF3F Absorbed by Plant', transpiring: '\uD83C\uDF43 Transpiring',
              complete: '\u2705 Cycle Complete!'
            };

            // Auto-advance states (after path completes)
            var JOURNEY_NEXT = {
              ocean: 'evaporating', evaporating: 'condensing', condensing: 'precipitating',
              precipitating: 'ground_choice', river_runoff: 'ocean', infiltrating: 'aquifer_flow',
              aquifer_flow: 'ocean', plant_absorb: 'transpiring', transpiring: 'condensing'
            };

            // Shared ground-choice button definitions (used by both draw + click handler)
            var GROUND_CHOICES = [
              { x: 0.20, y: 0.63, w: 0.18, h: 0.08, state: 'river_runoff', pathKey: 'runoff', label: t('stem.watercycle.river_path', '\uD83C\uDF0A River Path'), color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.6)' },
              { x: 0.28, y: 0.72, w: 0.18, h: 0.08, state: 'infiltrating', pathKey: 'infiltrate', label: t('stem.watercycle.go_underground', '\uD83E\uDEB4 Go Underground'), color: 'rgba(120,53,15,0.2)', border: 'rgba(120,53,15,0.6)' },
              { x: 0.50, y: 0.56, w: 0.18, h: 0.08, state: 'plant_absorb', pathKey: 'plant', label: t('stem.watercycle.enter_plant', '\uD83C\uDF3F Enter Plant'), color: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.6)' }
            ];

            // Helper: interpolate along a waypoint path
            function interpPath(pathKey, t) {
              var path = JOURNEY_PATHS[pathKey];
              if (!path) return { x: 0.5, y: 0.5 };
              var pts = path.pts;
              var totalSegs = pts.length - 1;
              if (totalSegs < 1) return { x: pts[0].x, y: pts[0].y };
              var segF = t * totalSegs;
              var segIdx = Math.min(Math.floor(segF), totalSegs - 1);
              var local = segF - segIdx;
              var a = pts[segIdx], b = pts[segIdx + 1];
              return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
            }

            // Drawing the droplet avatar
            function drawDroplet(dx, dy, state, tick) {
              ctx.save();
              var px = dx * cW, py = dy * cH;
              var pulse = 1 + Math.sin(tick * 0.08) * 0.15;
              var baseR = 7 * dpr * pulse;

              // Glow
              var glow = ctx.createRadialGradient(px, py, 0, px, py, baseR * 3);
              if (state === 'evaporating' || state === 'transpiring') {
                glow.addColorStop(0, 'rgba(251,191,36,0.4)'); glow.addColorStop(1, 'rgba(251,191,36,0)');
              } else if (state === 'condensing') {
                glow.addColorStop(0, 'rgba(148,163,184,0.4)'); glow.addColorStop(1, 'rgba(148,163,184,0)');
              } else if (state === 'infiltrating' || state === 'aquifer_flow') {
                glow.addColorStop(0, 'rgba(120,53,15,0.3)'); glow.addColorStop(1, 'rgba(120,53,15,0)');
              } else {
                glow.addColorStop(0, 'rgba(59,130,246,0.4)'); glow.addColorStop(1, 'rgba(59,130,246,0)');
              }
              ctx.fillStyle = glow;
              ctx.beginPath(); ctx.arc(px, py, baseR * 3, 0, Math.PI * 2); ctx.fill();

              // Body
              if (state === 'evaporating' || state === 'transpiring') {
                // Vapor: wispy semi-transparent
                ctx.globalAlpha = 0.5 + Math.sin(tick * 0.06) * 0.2;
                ctx.fillStyle = '#fbbf24';
                for (var vi = 0; vi < 4; vi++) {
                  var vx = px + Math.sin(tick * 0.04 + vi * 1.5) * 4 * dpr;
                  var vy = py + Math.cos(tick * 0.05 + vi * 2) * 3 * dpr;
                  ctx.beginPath(); ctx.arc(vx, vy, (3 + vi) * dpr * 0.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
              } else if (state === 'precipitating') {
                // Raindrop shape
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(px, py - baseR * 1.3);
                ctx.bezierCurveTo(px + baseR, py, px + baseR * 0.6, py + baseR, px, py + baseR);
                ctx.bezierCurveTo(px - baseR * 0.6, py + baseR, px - baseR, py, px, py - baseR * 1.3);
                ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(186,230,253,0.6)';
                ctx.beginPath(); ctx.arc(px - 2 * dpr, py - 2 * dpr, 2 * dpr, 0, Math.PI * 2); ctx.fill();
              } else {
                // Default: water droplet circle
                var bodyColor = (state === 'infiltrating' || state === 'aquifer_flow') ? '#0369a1' : 
                                 state === 'plant_absorb' ? '#16a34a' : '#0ea5e9';
                ctx.fillStyle = bodyColor;
                ctx.beginPath(); ctx.arc(px, py, baseR, 0, Math.PI * 2); ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath(); ctx.arc(px - 2 * dpr, py - 2 * dpr, baseR * 0.35, 0, Math.PI * 2); ctx.fill();
              }

              // Trail particles
              journey.particleTrail.push({ x: dx, y: dy, age: 0 });
              if (journey.particleTrail.length > 20) journey.particleTrail.shift();
              
              var trailColor = 'rgba(147,197,253,';
              var trailGlow = false;
              
              if (state === 'evaporating' || state === 'transpiring') {
                trailColor = 'rgba(251,191,36,';
                trailGlow = true;
              } else if (state === 'condensing') {
                trailColor = isDark ? 'rgba(203,213,225,' : 'rgba(148,163,184,';
                trailGlow = true;
              } else if (state === 'plant_absorb') {
                trailColor = 'rgba(34,197,94,';
                trailGlow = true;
              } else if (state === 'infiltrating' || state === 'aquifer_flow') {
                trailColor = isDark ? 'rgba(34,211,238,' : 'rgba(120,53,15,';
                trailGlow = true;
              } else if (state === 'precipitating') {
                trailColor = 'rgba(59,130,246,';
                trailGlow = true;
              }
              
              var isDarkLocal = canvasEl.dataset.darkMode === 'true';
              for (var ti = 0; ti < journey.particleTrail.length; ti++) {
                var tp2 = journey.particleTrail[ti];
                tp2.age++;
                var ta = Math.max(0, 1 - tp2.age / 25);
                
                ctx.save();
                if (trailGlow && isDarkLocal) {
                  ctx.shadowBlur = 5 * dpr;
                  ctx.shadowColor = trailColor.replace(/,$/, ')');
                }
                ctx.fillStyle = trailColor + (ta * 0.35) + ')';
                ctx.beginPath();
                ctx.arc(tp2.x * cW, tp2.y * cH, (2.5 + ta * 3) * dpr, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }

              ctx.restore();
            }

            // Click handler for journey decisions  -  uses shared GROUND_CHOICES for hit zones
            function onWaterCycleCanvasClick(e) {
              if (journey.state !== 'ground_choice') return;
              var rect = canvasEl.getBoundingClientRect();
              var mx = (e.clientX - rect.left) / rect.width;
              var my = (e.clientY - rect.top) / rect.height;

              for (var gci = 0; gci < GROUND_CHOICES.length; gci++) {
                var gc = GROUND_CHOICES[gci];
                if (mx >= gc.x && mx <= gc.x + gc.w && my >= gc.y && my <= gc.y + gc.h) {
                  // Sync canvas-side state
                  journey.state = gc.state; journey.progress = 0; journey.particleTrail = [];
                  canvasEl.dataset.journeyState = gc.state;
                  // Sync React state via upd() and play sound
                  if (canvasEl._wcSyncReact) canvasEl._wcSyncReact(gc.state, gc.pathKey);
                  // Sync active stage on dataset
                  var stageMap = { ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation', 
                    precipitating: 'precipitation', river_runoff: 'collection', infiltrating: 'infiltration',
                    aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration' };
                  if (stageMap[gc.state]) canvasEl.dataset.activeStage = stageMap[gc.state];
                  break;
                }
              }
            }
            canvasEl.addEventListener('click', onWaterCycleCanvasClick);

            function advanceJourneyFrame() {
              var jState = canvasEl.dataset.journeyState || 'idle';
              var journeyPaused2 = canvasEl.dataset.journeyPaused === 'true';
              var journeySpeed2 = parseFloat(canvasEl.dataset.journeySpeed || '1');
              if (!isFinite(journeySpeed2) || journeySpeed2 <= 0) journeySpeed2 = 1;
              if (jState !== 'idle') {
                journey.state = jState;
                var speed2 = (jState === 'aquifer_flow' || jState === 'infiltrating') ? 0.003 :
                            (jState === 'precipitating') ? 0.012 : 0.006;
                if (!journeyPaused2 && jState !== 'ground_choice' && jState !== 'complete') {
                  journey.progress += speed2 * journeySpeed2;
                  if (journey.progress >= 1) {
                    journey.progress = 0;
                    journey.particleTrail = [];
                    var next = JOURNEY_NEXT[jState];
                    if (next === 'ocean' && jState !== 'ocean') {
                      canvasEl.dataset.journeyState = 'complete';
                      if (canvasEl._onJourneyComplete) canvasEl._onJourneyComplete(jState);
                    } else if (next === 'ground_choice') {
                      canvasEl.dataset.journeyState = 'ground_choice';
                      if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition('ground_choice');
                    } else {
                      canvasEl.dataset.journeyState = next || 'idle';
                      if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition(next);
                    }
                    jState = canvasEl.dataset.journeyState;
                  }
                }
              } else {
                journey.progress = 0;
              }
              canvasEl.dataset.journeyProgress = String(Math.max(0, Math.min(1, journey.progress || 0)));
              return jState;
            }

            function draw() {
              if (!wcAlive) return;
              canvasEl._wcAnim = null;
              if (!canvasEl.isConnected) { cleanupWaterCycleCanvas(); return; }
              if (isWaterCycleHidden()) { cancelWaterCycleFrame(); return; }

              tick += wcMotionReduced ? 0.2 : 1;

              if (canvasEl.dataset.renderMode === 'state-only') {
                advanceJourneyFrame();
                scheduleWaterCycleFrame();
                return;
              }
              ctx.clearRect(0, 0, cW, cH);

              var isDark = canvasEl.dataset.darkMode === 'true';

              // ── Sky gradient with dynamic time + climate response ──

              var dayPhase = (Math.sin(tick * 0.003) + 1) / 2;
              var cSolar = parseFloat(canvasEl.dataset.climSolar || '1.0');
              var skyBright = Math.max(0, Math.min(1, cSolar));

              var g = ctx.createLinearGradient(0, 0, 0, cH * 0.6);
              if (isDark) {
                // Deep space dark mode gradient: slate-950 to deep navy/indigo-950
                g.addColorStop(0, '#020617');
                g.addColorStop(0.4, '#090d1f');
                g.addColorStop(1, '#1e1b4b');
              } else {
                if (skyBright < 0.3) {
                  // Night sky  -  deep indigo/navy
                  var nf = skyBright / 0.3;
                  g.addColorStop(0, 'hsl(230,' + (40 + nf * 20) + '%,' + (8 + nf * 15) + '%)');
                  g.addColorStop(0.5, 'hsl(220,' + (30 + nf * 15) + '%,' + (12 + nf * 18) + '%)');
                  g.addColorStop(1, 'hsl(210,' + (25 + nf * 20) + '%,' + (15 + nf * 20) + '%)');
                } else if (skyBright < 0.6) {
                  // Dawn/dusk  -  warm oranges and purples
                  var df = (skyBright - 0.3) / 0.3;
                  g.addColorStop(0, 'hsl(' + (240 - df * 30) + ',' + (50 + df * 15) + '%,' + (25 + df * 30) + '%)');
                  g.addColorStop(0.5, 'hsl(' + (220 - df * 20) + ',60%,' + (40 + df * 20) + '%)');
                  g.addColorStop(1, 'hsl(' + (210 - df * 15) + ',' + (50 + df * 10) + '%,' + (50 + df * 15) + '%)');
                } else {
                  // Bright day
                  var bf = Math.min(1, (skyBright - 0.6) / 0.4);
                  g.addColorStop(0, 'hsl(210,' + (60 + dayPhase * 20 + bf * 10) + '%,' + (50 + dayPhase * 25 + bf * 10) + '%)');
                  g.addColorStop(0.5, 'hsl(200,70%,' + (65 + dayPhase * 15) + '%)');
                  g.addColorStop(1, 'hsl(190,60%,' + (70 + dayPhase * 10) + '%)');
                }
              }

              ctx.fillStyle = g;

              ctx.fillRect(0, 0, cW, cH * 0.65);

              // ── Aurora curtains (dark mode) — slow green/violet ribbons above the peaks ──
              if (isDark) {
                for (var au = 0; au < 3; au++) {
                  var auX = cW * (0.12 + au * 0.3) + Math.sin(tick * 0.004 + au * 2.1) * cW * 0.05;
                  var auW = cW * (0.09 + 0.03 * Math.sin(tick * 0.006 + au));
                  var auHue = au === 1 ? '168,85,247' : '52,211,153';
                  var auA = 0.09 + 0.05 * Math.sin(tick * 0.01 + au * 1.7);
                  var auGrad = ctx.createLinearGradient(0, cH * 0.04, 0, cH * 0.4);
                  auGrad.addColorStop(0, 'rgba(' + auHue + ',0)');
                  auGrad.addColorStop(0.45, 'rgba(' + auHue + ',' + auA.toFixed(3) + ')');
                  auGrad.addColorStop(1, 'rgba(' + auHue + ',0)');
                  ctx.fillStyle = auGrad;
                  ctx.beginPath();
                  ctx.moveTo(auX + Math.sin(tick * 0.008 + au) * cW * 0.02, cH * 0.04);
                  for (var auy = 0; auy <= 8; auy++) {
                    var ayy = cH * (0.04 + auy * 0.045);
                    ctx.lineTo(auX + Math.sin(ayy * 0.012 + tick * 0.008 + au) * cW * 0.03, ayy);
                  }
                  for (var auy2 = 8; auy2 >= 0; auy2--) {
                    var ayy2 = cH * (0.04 + auy2 * 0.045);
                    ctx.lineTo(auX + auW + Math.sin(ayy2 * 0.012 + tick * 0.008 + au + 0.6) * cW * 0.03, ayy2);
                  }
                  ctx.closePath();
                  ctx.fill();
                }
              }

              // ── Sun / Moon with animated rays / glow ──

              if (isDark) {
                // Crescent Moon
                var moonX = cW * 0.82;
                var moonY = cH * 0.08 + Math.sin(tick * 0.005) * cH * 0.03;
                
                var moonGlow = ctx.createRadialGradient(moonX, moonY, 4 * dpr, moonX, moonY, 45 * dpr);
                moonGlow.addColorStop(0, 'rgba(125,211,252,0.25)');
                moonGlow.addColorStop(0.4, 'rgba(125,211,252,0.09)');
                moonGlow.addColorStop(1, 'rgba(125,211,252,0)');
                ctx.fillStyle = moonGlow;
                ctx.beginPath();
                ctx.arc(moonX, moonY, 45 * dpr, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.arc(moonX, moonY, 14 * dpr, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#090d1f';
                ctx.beginPath();
                ctx.arc(moonX - 6 * dpr, moonY - 2 * dpr, 13 * dpr, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Sun with animated rays
                var sunX = cW * 0.82;
                var sunY = cH * 0.08 + Math.sin(tick * 0.005) * cH * 0.03;

                var sunGlow = ctx.createRadialGradient(sunX, sunY, 8 * dpr, sunX, sunY, 50 * dpr);
                sunGlow.addColorStop(0, 'rgba(251,191,36,0.4)');
                sunGlow.addColorStop(0.35, 'rgba(253,224,71,0.16)');
                sunGlow.addColorStop(1, 'rgba(251,191,36,0)');
                ctx.fillStyle = sunGlow;
                ctx.fillRect(sunX - 50 * dpr, sunY - 50 * dpr, 100 * dpr, 100 * dpr);

                ctx.beginPath(); ctx.arc(sunX, sunY, 16 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#fbbf24'; ctx.fill();

                for (var sr = 0; sr < 12; sr++) {
                  var sra = sr * Math.PI / 6 + tick * 0.008;
                  var innerR = 20 * dpr;
                  var outerR = (28 + Math.sin(tick * 0.05 + sr) * 5) * dpr;
                  ctx.beginPath();
                  ctx.moveTo(sunX + Math.cos(sra) * innerR, sunY + Math.sin(sra) * innerR);
                  ctx.lineTo(sunX + Math.cos(sra) * outerR, sunY + Math.sin(sra) * outerR);
                  ctx.strokeStyle = 'rgba(251,191,36,' + (0.3 + Math.sin(tick * 0.03 + sr) * 0.2) + ')';
                  ctx.lineWidth = 2 * dpr; ctx.stroke();
                }

                // ── God rays — volumetric beams fanning down-left across the valley ──
                // Strength follows the solar slider; beams breathe slowly and are
                // occluded by the mountains drawn after them (real crepuscular feel).
                if (skyBright > 0.45) {
                  var rayAlpha = (skyBright - 0.45) * 0.14;
                  for (var gr2 = 0; gr2 < 5; gr2++) {
                    var grA = 2.2 + (gr2 - 2) * 0.18 + Math.sin(tick * 0.002 + gr2 * 1.3) * 0.04;
                    var grLen = cH * 0.95;
                    var grHalf = 0.045 + 0.015 * Math.sin(tick * 0.004 + gr2);
                    var gx1 = sunX + Math.cos(grA - grHalf) * grLen, gy1 = sunY + Math.sin(grA - grHalf) * grLen;
                    var gx2 = sunX + Math.cos(grA + grHalf) * grLen, gy2 = sunY + Math.sin(grA + grHalf) * grLen;
                    var grGrad = ctx.createLinearGradient(sunX, sunY, (gx1 + gx2) / 2, (gy1 + gy2) / 2);
                    grGrad.addColorStop(0, 'rgba(253,224,71,' + rayAlpha.toFixed(3) + ')');
                    grGrad.addColorStop(0.6, 'rgba(253,224,71,' + (rayAlpha * 0.35).toFixed(3) + ')');
                    grGrad.addColorStop(1, 'rgba(253,224,71,0)');
                    ctx.fillStyle = grGrad;
                    ctx.beginPath();
                    ctx.moveTo(sunX, sunY);
                    ctx.lineTo(gx1, gy1);
                    ctx.lineTo(gx2, gy2);
                    ctx.closePath();
                    ctx.fill();
                  }
                }
              }

              // ── Distant range + horizon haze — atmospheric depth behind the peaks ──
              // A pale far ridge drifts almost imperceptibly (parallax) over the water
              // horizon, and a haze band settles between it and the near mountains.
              var farShift = Math.sin(tick * 0.001) * cW * 0.012;
              ctx.fillStyle = isDark ? 'rgba(30,41,59,0.55)' : 'rgba(148,163,184,0.4)';
              ctx.beginPath();
              ctx.moveTo(cW * 0.3 + farShift, cH * 0.65);
              ctx.lineTo(cW * 0.46 + farShift, cH * 0.45);
              ctx.lineTo(cW * 0.62 + farShift, cH * 0.65);
              ctx.closePath(); ctx.fill();
              ctx.fillStyle = isDark ? 'rgba(30,41,59,0.4)' : 'rgba(148,163,184,0.28)';
              ctx.beginPath();
              ctx.moveTo(cW * 0.05 + farShift * 1.5, cH * 0.65);
              ctx.lineTo(cW * 0.2 + farShift * 1.5, cH * 0.5);
              ctx.lineTo(cW * 0.38 + farShift * 1.5, cH * 0.65);
              ctx.closePath(); ctx.fill();
              var hazeGrad = ctx.createLinearGradient(0, cH * 0.5, 0, cH * 0.65);
              hazeGrad.addColorStop(0, isDark ? 'rgba(30,58,138,0)' : 'rgba(224,242,254,0)');
              hazeGrad.addColorStop(1, isDark ? 'rgba(30,58,138,0.2)' : 'rgba(224,242,254,' + (0.25 + 0.25 * skyBright).toFixed(3) + ')');
              ctx.fillStyle = hazeGrad;
              ctx.fillRect(0, cH * 0.5, cW, cH * 0.15);

              // ── Mountains ──

              // Back mountain
              ctx.fillStyle = isDark ? '#1e293b' : '#475569';

              ctx.beginPath(); ctx.moveTo(cW * 0.55, cH * 0.65); ctx.lineTo(cW * 0.72, cH * 0.3); ctx.lineTo(cW * 0.9, cH * 0.65); ctx.fill();

              // Back mountain rock cracks
              ctx.strokeStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(30,41,59,0.3)'; ctx.lineWidth = 1 * dpr;

              for (var mci = 0; mci < 5; mci++) {
                var mcx = cW * 0.62 + mci * cW * 0.055;
                var mcy = cH * 0.4 + mci * cH * 0.04;
                ctx.beginPath(); ctx.moveTo(mcx, mcy); ctx.lineTo(mcx + 8 * dpr, mcy + 15 * dpr); ctx.stroke();
              }

              // Snow cap
              ctx.fillStyle = isDark ? '#cbd5e1' : '#e2e8f0';

              ctx.beginPath(); ctx.moveTo(cW * 0.685, cH * 0.34); ctx.lineTo(cW * 0.72, cH * 0.3); ctx.lineTo(cW * 0.755, cH * 0.34);
              ctx.lineTo(cW * 0.74, cH * 0.37); ctx.lineTo(cW * 0.725, cH * 0.36); ctx.lineTo(cW * 0.71, cH * 0.375); ctx.lineTo(cW * 0.695, cH * 0.355); ctx.closePath(); ctx.fill();

              // Snow highlights
              ctx.fillStyle = 'rgba(255,255,255,0.5)';
              ctx.beginPath(); ctx.arc(cW * 0.72, cH * 0.32, 4 * dpr, 0, Math.PI * 2); ctx.fill();

              // Snow melt stream
              ctx.strokeStyle = 'rgba(147,197,253,0.4)'; ctx.lineWidth = 1.5 * dpr;
              ctx.beginPath(); ctx.moveTo(cW * 0.725, cH * 0.36);
              ctx.quadraticCurveTo(cW * 0.73, cH * 0.42, cW * 0.735, cH * 0.48);
              ctx.quadraticCurveTo(cW * 0.728, cH * 0.54, cW * 0.74, cH * 0.6);
              ctx.stroke();

              // Front mountain
              ctx.fillStyle = isDark ? '#0f172a' : '#374151';

              ctx.beginPath(); ctx.moveTo(cW * 0.65, cH * 0.65); ctx.lineTo(cW * 0.82, cH * 0.38); ctx.lineTo(cW * 0.98, cH * 0.65); ctx.fill();

              // Front mountain rock textures
              ctx.strokeStyle = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(55,65,81,0.4)'; ctx.lineWidth = 0.8 * dpr;

              for (var mti = 0; mti < 6; mti++) {
                var mtx = cW * 0.72 + mti * cW * 0.04;
                var mty = cH * 0.45 + mti * cH * 0.02;
                ctx.beginPath(); ctx.moveTo(mtx, mty);
                ctx.lineTo(mtx + (mti % 2 === 0 ? 6 : -5) * dpr, mty + 12 * dpr);
                ctx.lineTo(mtx + 3 * dpr, mty + 20 * dpr); ctx.stroke();
              }

              // Front mountain snow patch
              ctx.fillStyle = isDark ? '#cbd5e1' : '#e2e8f0';

              ctx.beginPath(); ctx.moveTo(cW * 0.8, cH * 0.40); ctx.lineTo(cW * 0.82, cH * 0.38); ctx.lineTo(cW * 0.84, cH * 0.41);
              ctx.lineTo(cW * 0.83, cH * 0.43); ctx.lineTo(cW * 0.81, cH * 0.42); ctx.closePath(); ctx.fill();

              // ── Birds — a small flock gliding on the wind (daylight only) ──
              // Crossing speed follows the wind slider, wings flap as shallow Vs.
              if (!isDark && skyBright > 0.4) {
                var birdWind = parseFloat(canvasEl.dataset.climWind || '1.0');
                for (var bd = 0; bd < 5; bd++) {
                  var bT = ((tick * 0.0016 * (0.6 + birdWind * 0.6) + bd * 0.21) % 1.2) - 0.1;
                  var bx = bT * cW;
                  var by = cH * (0.14 + (bd % 3) * 0.05) + Math.sin(tick * 0.02 + bd * 2) * cH * 0.008;
                  var flap = Math.sin(tick * 0.12 + bd * 1.8) * 3.5 * dpr;
                  var bs = (3 + (bd % 2) * 1.5) * dpr;
                  ctx.strokeStyle = 'rgba(51,65,85,' + (0.35 + 0.15 * (bd % 2)) + ')';
                  ctx.lineWidth = 1.2 * dpr;
                  ctx.beginPath();
                  ctx.moveTo(bx - bs, by - flap);
                  ctx.quadraticCurveTo(bx, by + Math.abs(flap) * 0.4, bx + bs, by - flap);
                  ctx.stroke();
                }
              }

              // ── Ground ──

              var groundGrad = ctx.createLinearGradient(0, cH * 0.62, 0, cH * 0.72);
              if (isDark) {
                groundGrad.addColorStop(0, '#064e3b');
                groundGrad.addColorStop(0.5, '#022c22');
                groundGrad.addColorStop(1, '#011c15');
              } else {
                groundGrad.addColorStop(0, '#4ade80');
                groundGrad.addColorStop(0.5, '#22c55e');
                groundGrad.addColorStop(1, '#166534');
              }

              ctx.fillStyle = groundGrad;

              ctx.fillRect(0, cH * 0.62, cW, cH * 0.1);

              // Grass blades along ground surface

              for (var gbi = 0; gbi < 80; gbi++) {

                var gbx = (gbi / 80) * cW;

                // Skip water area
                if (gbx < cW * 0.55) continue;

                var gby = cH * 0.62;

                var gbSway = Math.sin(tick * 0.015 + gbi * 0.7) * 3 * dpr;

                var gbHeight = (4 + Math.random() * 5) * dpr;

                ctx.strokeStyle = isDark 
                  ? (gbi % 3 === 0 ? 'rgba(16,185,129,0.4)' : 'rgba(5,150,105,0.3)')
                  : (gbi % 3 === 0 ? 'rgba(74,222,128,0.6)' : 'rgba(34,197,94,0.5)');

                ctx.lineWidth = 1 * dpr;

                ctx.beginPath(); ctx.moveTo(gbx, gby);

                ctx.lineTo(gbx + gbSway, gby - gbHeight); ctx.stroke();

                // Some grass with seed heads

                if (gbi % 8 === 0) {

                  ctx.fillStyle = isDark ? 'rgba(250,204,21,0.25)' : 'rgba(250,204,21,0.4)';

                  ctx.beginPath(); ctx.arc(gbx + gbSway, gby - gbHeight, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                }

              }

              // ── Fireflies — warm pulsing glints over the meadow at night ──
              if (isDark || skyBright < 0.3) {
                for (var ff = 0; ff < 8; ff++) {
                  var fseed = Math.sin(ff * 91.7) * 24634.63; fseed -= Math.floor(fseed);
                  var ffx = cW * (0.58 + fseed * 0.38) + Math.sin(tick * 0.01 + ff * 2.3) * 12 * dpr;
                  var ffy = cH * 0.6 + Math.sin(tick * 0.013 + ff * 1.1) * cH * 0.02 - fseed * cH * 0.03;
                  var ffPulse = Math.max(0, Math.sin(tick * 0.03 + ff * 2.9));
                  if (ffPulse < 0.25) continue;
                  var ffGlow = ctx.createRadialGradient(ffx, ffy, 0, ffx, ffy, 5 * dpr);
                  ffGlow.addColorStop(0, 'rgba(253,224,71,' + (0.7 * ffPulse).toFixed(3) + ')');
                  ffGlow.addColorStop(1, 'rgba(253,224,71,0)');
                  ctx.fillStyle = ffGlow;
                  ctx.beginPath(); ctx.arc(ffx, ffy, 5 * dpr, 0, Math.PI * 2); ctx.fill();
                }
              }



              // ── Underground / Aquifer layer ──

              var underGrad = ctx.createLinearGradient(0, cH * 0.72, 0, cH);
              if (isDark) {
                underGrad.addColorStop(0, '#090d16');
                underGrad.addColorStop(0.3, '#0b0f19');
                underGrad.addColorStop(0.6, '#020617');
                underGrad.addColorStop(1, '#000000');
              } else {
                underGrad.addColorStop(0, '#78350f');
                underGrad.addColorStop(0.3, '#92400e');
                underGrad.addColorStop(0.6, '#451a03');
                underGrad.addColorStop(1, '#1c1917');
              }

              ctx.fillStyle = underGrad;

              ctx.fillRect(0, cH * 0.72, cW, cH * 0.28);

              // Aquifer water table

              ctx.fillStyle = isDark ? 'rgba(6,182,212,0.25)' : 'rgba(14,165,233,0.15)';

              ctx.beginPath();

              ctx.moveTo(0, cH * 0.82);

              for (var ax = 0; ax <= cW; ax += 10) {

                ctx.lineTo(ax, cH * 0.82 + Math.sin(ax * 0.01 + tick * 0.01) * 4 * dpr);

              }

              ctx.lineTo(cW, cH); ctx.lineTo(0, cH); ctx.closePath(); ctx.fill();

              // Aquifer shimmer highlights

              ctx.fillStyle = isDark ? 'rgba(34,211,238,0.2)' : 'rgba(56,189,248,0.08)';

              for (var ashi = 0; ashi < 8; ashi++) {

                var ashx = ((tick * 0.3 + ashi * cW * 0.13) % cW);

                var ashy = cH * 0.84 + Math.sin(ashi * 2.3) * cH * 0.04;

                ctx.beginPath(); ctx.ellipse(ashx, ashy, 12 * dpr, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();

              }

              // Rock layer lines

              ctx.strokeStyle = isDark ? 'rgba(51,65,85,0.3)' : 'rgba(120,53,15,0.3)';

              ctx.lineWidth = 1 * dpr;

              for (var rl = 0; rl < 3; rl++) {

                ctx.beginPath();

                var rly = cH * (0.76 + rl * 0.06);

                for (var rx = 0; rx <= cW; rx += 8) {

                  ctx.lineTo(rx, rly + Math.sin(rx * 0.015 + rl * 2) * 3 * dpr);

                }

                ctx.stroke();

              }

              // Rock pebbles / gravel in underground layers

              ctx.fillStyle = isDark ? 'rgba(71,85,105,0.25)' : 'rgba(168,130,100,0.25)';

              for (var rpi2 = 0; rpi2 < 15; rpi2++) {

                var rpx2 = (rpi2 * cW * 0.07 + cW * 0.03) % cW;

                var rpy2 = cH * (0.74 + (rpi2 % 4) * 0.05);

                ctx.beginPath(); ctx.ellipse(rpx2, rpy2, (2 + rpi2 % 3) * dpr, (1.5 + rpi2 % 2) * dpr, rpi2 * 0.5, 0, Math.PI * 2); ctx.fill();

              }

              // Underground tiny aquifer organisms

              for (var aqi = 0; aqi < 5; aqi++) {

                var aqx = ((tick * 0.2 + aqi * cW * 0.21) % cW);

                var aqy = cH * 0.85 + Math.sin(tick * 0.02 + aqi * 1.7) * 4 * dpr;

                var aqAlpha = 0.2 + 0.15 * Math.sin(tick * 0.03 + aqi);

                ctx.strokeStyle = isDark 
                  ? 'rgba(34,211,238,' + (aqAlpha * 1.5) + ')' 
                  : 'rgba(14,165,233,' + aqAlpha + ')';
                ctx.lineWidth = 1 * dpr; ctx.lineCap = 'round';

                ctx.beginPath(); ctx.moveTo(aqx, aqy);

                for (var aqw = 1; aqw <= 4; aqw++) {

                  ctx.lineTo(aqx + aqw * 3 * dpr, aqy + Math.sin(tick * 0.05 + aqw + aqi) * 2 * dpr);

                }

                ctx.stroke();

              }



              // ── Water body (ocean/lake) ──

              var waterGrad = ctx.createLinearGradient(0, cH * 0.62, 0, cH * 0.72);
              if (isDark) {
                waterGrad.addColorStop(0, 'rgba(8,47,73,0.85)');
                waterGrad.addColorStop(1, 'rgba(3,7,18,0.95)');
              } else {
                waterGrad.addColorStop(0, 'rgba(14,165,233,0.7)');
                waterGrad.addColorStop(1, 'rgba(3,105,161,0.8)');
              }

              ctx.fillStyle = waterGrad;

              ctx.beginPath();

              ctx.moveTo(0, cH * 0.65);

              for (var wx = 0; wx <= cW * 0.55; wx += 4) {

                ctx.lineTo(wx, cH * 0.65 + Math.sin(wx * 0.02 + tick * 0.04) * 3 * dpr);

              }

              ctx.lineTo(cW * 0.55, cH * 0.72); ctx.lineTo(0, cH * 0.72); ctx.closePath(); ctx.fill();

              // Wave highlights

              ctx.strokeStyle = isDark ? 'rgba(34,211,238,0.4)' : 'rgba(186,230,253,0.3)';

              ctx.lineWidth = 1.5 * dpr;

              for (var wl = 0; wl < 3; wl++) {

                ctx.beginPath();

                var wly = cH * (0.66 + wl * 0.02);

                for (var wlx = 0; wlx <= cW * 0.5; wlx += 6) {

                  ctx.lineTo(wlx, wly + Math.sin(wlx * 0.025 + tick * 0.05 + wl * 1.5) * 2 * dpr);

                }

                ctx.stroke();

              }

              // ── Specular glitter — sun/moon light dancing on the wave crests ──
              // Deterministic per-glint positions; twinkle phase + a brightness bias
              // toward the sun side so the water reads as lit from the upper right.
              for (var gl = 0; gl < 24; gl++) {
                var gseed = Math.sin(gl * 127.1) * 43758.5453; gseed -= Math.floor(gseed);
                var glx = gseed * cW * 0.53;
                var gly = cH * (0.655 + (gl % 5) * 0.011);
                var twinkle = Math.sin(tick * 0.08 + gl * 2.7) * 0.5 + 0.5;
                var sunBias = 0.25 + 0.75 * (glx / (cW * 0.55));
                var ga = twinkle * twinkle * sunBias * (isDark ? 0.35 : 0.5) * Math.max(0.25, skyBright);
                if (ga < 0.04) continue;
                ctx.strokeStyle = isDark ? 'rgba(165,243,252,' + ga.toFixed(3) + ')' : 'rgba(255,255,255,' + ga.toFixed(3) + ')';
                ctx.lineWidth = 1 * dpr;
                ctx.beginPath();
                ctx.moveTo(glx - (2 + twinkle * 3) * dpr, gly);
                ctx.lineTo(glx + (2 + twinkle * 3) * dpr, gly);
                ctx.stroke();
              }

              // Soft light sheen across the water toward the sun side
              var sheen = ctx.createLinearGradient(cW * 0.55, 0, cW * 0.15, 0);
              sheen.addColorStop(0, isDark ? 'rgba(125,211,252,0.10)' : 'rgba(255,255,255,' + (0.12 * skyBright).toFixed(3) + ')');
              sheen.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = sheen;
              ctx.fillRect(0, cH * 0.635, cW * 0.55, cH * 0.085);



              // ── River from mountain (enhanced with rapids) ──

              ctx.strokeStyle = isDark ? 'rgba(6,182,212,0.6)' : 'rgba(59,130,246,0.5)';

              ctx.lineWidth = 4 * dpr;

              ctx.beginPath();

              ctx.moveTo(cW * 0.78, cH * 0.42);

              ctx.quadraticCurveTo(cW * 0.7, cH * 0.52, cW * 0.55, cH * 0.65);

              ctx.stroke();

              ctx.strokeStyle = isDark ? 'rgba(165,243,252,0.5)' : 'rgba(186,230,253,0.3)';

              ctx.lineWidth = 2 * dpr;

              ctx.stroke();

              // River ripple highlights

              ctx.strokeStyle = isDark ? 'rgba(165,243,252,0.3)' : 'rgba(186,230,253,0.2)'; ctx.lineWidth = 1 * dpr;

              for (var rhi = 0; rhi < 5; rhi++) {

                var rhT = ((tick * 0.005 + rhi * 0.2) % 1);

                var rhx = (1 - rhT) * (1 - rhT) * cW * 0.78 + 2 * (1 - rhT) * rhT * cW * 0.7 + rhT * rhT * cW * 0.55;

                var rhy = (1 - rhT) * (1 - rhT) * cH * 0.42 + 2 * (1 - rhT) * rhT * cH * 0.52 + rhT * rhT * cH * 0.65;

                ctx.beginPath();

                ctx.ellipse(rhx, rhy, 4 * dpr, 1.5 * dpr, 0.3, 0, Math.PI * 2); ctx.stroke();

              }

              // River flow particles

              for (var rfp = 0; rfp < riverPs.length; rfp++) {

                var rp = riverPs[rfp];

                rp.t += rp.speed;

                if (rp.t > 1) rp.t -= 1;

                var t2 = rp.t;

                var rpx = (1 - t2) * (1 - t2) * cW * 0.78 + 2 * (1 - t2) * t2 * cW * 0.7 + t2 * t2 * cW * 0.55;

                var rpy = (1 - t2) * (1 - t2) * cH * 0.42 + 2 * (1 - t2) * t2 * cH * 0.52 + t2 * t2 * cH * 0.65;

                ctx.beginPath();

                ctx.arc(rpx / dpr * dpr, rpy / dpr * dpr, 2 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(147,197,253,' + (0.4 + Math.sin(t2 * Math.PI) * 0.3) + ')';

                ctx.fill();

              }

              // ── Waterfall where river meets ocean ──

              var wfX = cW * 0.55, wfY = cH * 0.65;

              // Falling water streaks

              ctx.strokeStyle = 'rgba(147,197,253,0.5)'; ctx.lineWidth = 1.5 * dpr;

              for (var wfi = 0; wfi < 5; wfi++) {

                var wfOffset = (wfi - 2) * 3 * dpr;

                var wfDrop = ((tick * 2 + wfi * 17) % 30) * dpr / 10;

                ctx.beginPath(); ctx.moveTo(wfX + wfOffset, wfY);

                ctx.lineTo(wfX + wfOffset - 1 * dpr, wfY + (4 + wfDrop) * dpr); ctx.stroke();

              }

              // Splash spray particles at base

              ctx.fillStyle = 'rgba(186,230,253,0.4)';

              for (var spi = 0; spi < 6; spi++) {

                var spPhase = tick * 0.06 + spi * 1.1;

                var spx = wfX + Math.sin(spPhase) * 6 * dpr;

                var spy = wfY + 3 * dpr - Math.abs(Math.sin(spPhase * 0.7)) * 5 * dpr;

                ctx.beginPath(); ctx.arc(spx, spy, (1 + Math.sin(spPhase) * 0.5) * dpr, 0, Math.PI * 2); ctx.fill();

              }

              // Mist above waterfall

              ctx.fillStyle = 'rgba(186,230,253,0.1)';

              ctx.beginPath(); ctx.arc(wfX, wfY - 3 * dpr, 10 * dpr, 0, Math.PI * 2); ctx.fill();



              // ── Trees (enhanced with bark texture, roots, fruit, leaf veins) ──

              function drawTree(tx, ty, sz) {

                var sway = Math.sin(tick * 0.01 + tx * 0.1) * 1.5;

                // Roots (visible underground)

                ctx.strokeStyle = 'rgba(120,53,15,0.5)'; ctx.lineWidth = 1.5 * sz * dpr;

                for (var ri = 0; ri < 4; ri++) {

                  var rootDir = (ri - 1.5) * 8 * sz;

                  ctx.beginPath(); ctx.moveTo(tx * dpr, (ty + 2 * sz) * dpr);

                  ctx.quadraticCurveTo((tx + rootDir * 0.5) * dpr, (ty + 8 * sz) * dpr, (tx + rootDir) * dpr, (ty + 12 * sz + ri * 2 * sz) * dpr);

                  ctx.stroke();

                  // Root tips

                  ctx.fillStyle = 'rgba(120,53,15,0.3)';

                  ctx.beginPath(); ctx.arc((tx + rootDir) * dpr, (ty + 12 * sz + ri * 2 * sz) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                }

                // Trunk with bark texture

                var trunkGrad = ctx.createLinearGradient((tx - 2 * sz) * dpr, ty * dpr, (tx + 2 * sz) * dpr, ty * dpr);

                trunkGrad.addColorStop(0, '#78350f'); trunkGrad.addColorStop(0.4, '#92400e'); trunkGrad.addColorStop(0.7, '#a16207'); trunkGrad.addColorStop(1, '#78350f');

                ctx.fillStyle = trunkGrad;

                ctx.fillRect((tx - 2 * sz) * dpr, (ty - 10 * sz) * dpr, 4 * sz * dpr, 12 * sz * dpr);

                // Bark texture lines

                ctx.strokeStyle = 'rgba(60,30,10,0.3)'; ctx.lineWidth = 0.5 * dpr;

                for (var bi = 0; bi < 4; bi++) {

                  var by = (ty - 8 * sz + bi * 4 * sz);

                  ctx.beginPath(); ctx.moveTo((tx - 1.5 * sz) * dpr, by * dpr);

                  ctx.lineTo((tx + 1.5 * sz) * dpr, (by + 1 * sz) * dpr); ctx.stroke();

                }

                // Canopy layers

                ctx.fillStyle = '#22c55e';

                ctx.beginPath(); ctx.arc((tx + sway) * dpr, (ty - 16 * sz) * dpr, 9 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#16a34a';

                ctx.beginPath(); ctx.arc((tx - 4 * sz + sway * 0.7) * dpr, (ty - 12 * sz) * dpr, 7 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc((tx + 5 * sz + sway * 0.7) * dpr, (ty - 13 * sz) * dpr, 6 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                // Dark canopy shadow

                ctx.fillStyle = 'rgba(22,101,52,0.3)';

                ctx.beginPath(); ctx.arc((tx + sway * 0.5) * dpr, (ty - 11 * sz) * dpr, 5 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                // Leaf vein lines

                ctx.strokeStyle = 'rgba(21,128,61,0.25)'; ctx.lineWidth = 0.5 * dpr;

                for (var lvi = 0; lvi < 3; lvi++) {

                  var lvx = tx + (lvi - 1) * 4 * sz + sway * 0.6;

                  var lvy = ty - 14 * sz + lvi * 2 * sz;

                  ctx.beginPath(); ctx.moveTo(lvx * dpr, lvy * dpr);

                  ctx.lineTo((lvx + 5 * sz) * dpr, (lvy + 3 * sz) * dpr); ctx.stroke();

                }

                // Small fruit/flower dots

                if (Math.sin(tx) > 0) {

                  ctx.fillStyle = 'rgba(239,68,68,0.6)';

                  for (var fdi = 0; fdi < 3; fdi++) {

                    ctx.beginPath(); ctx.arc((tx + (fdi - 1) * 5 * sz + sway * 0.5) * dpr, (ty - 14 * sz + fdi * 3 * sz) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

                } else {

                  ctx.fillStyle = 'rgba(251,191,36,0.5)';

                  for (var fli = 0; fli < 2; fli++) {

                    ctx.beginPath(); ctx.arc((tx + (fli - 0.5) * 6 * sz + sway * 0.4) * dpr, (ty - 15 * sz + fli * 4 * sz) * dpr, 2 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

                }

              }

              drawTree(cW * 0.6 / dpr, cH * 0.62 / dpr, 1.1);

              drawTree(cW * 0.67 / dpr, cH * 0.61 / dpr, 0.8);

              drawTree(cW * 0.54 / dpr, cH * 0.63 / dpr, 0.7);



              // ── Clouds ──

              function drawCloud(ccx, ccy, sz) {

                ctx.fillStyle = 'rgba(226,232,240,0.85)';

                ctx.beginPath(); ctx.arc(ccx, ccy, sz, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx - sz * 0.7, ccy + sz * 0.2, sz * 0.7, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx + sz * 0.7, ccy + sz * 0.15, sz * 0.85, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx + sz * 0.3, ccy - sz * 0.3, sz * 0.6, 0, Math.PI * 2); ctx.fill();

                // Bottom flat

                ctx.fillStyle = 'rgba(203,213,225,0.5)';

                ctx.fillRect(ccx - sz * 1.2, ccy + sz * 0.4, sz * 2.4, sz * 0.3);

              }

              drawCloud(cW * 0.2 + Math.sin(tick * 0.004) * 15, cH * 0.14, 16 * dpr);

              drawCloud(cW * 0.45 + Math.cos(tick * 0.003) * 12, cH * 0.1, 20 * dpr);

              drawCloud(cW * 0.35 + Math.sin(tick * 0.005) * 10, cH * 0.2, 13 * dpr);



              // ── Active-stage emphasis ──
              // The selected process's particles stay full strength while the others fade, so the
              // animated diagram actually ISOLATES the stage the student chose instead of showing
              // every process at once. Reads the same dataset.activeStage the label loop uses.
              var _activeStage = canvasEl.dataset.activeStage || 'evaporation';
              var _emph = function (id) { return _activeStage === id ? 1 : 0.25; };

              // ── Evaporation particles ──

              for (var epi = 0; epi < evapPs.length; epi++) {

                var ep = evapPs[epi];

                ep.y -= ep.speed * 0.4;

                ep.x += Math.sin(ep.phase + tick * 0.02) * 0.3;

                ep.phase += 0.03;

                if (ep.y < cH * 0.12 / dpr) { ep.y = cH * 0.62 / dpr; ep.x = Math.random() * cW * 0.5 / dpr; }

                ctx.beginPath(); ctx.arc(ep.x * dpr, ep.y * dpr, ep.size * dpr, 0, Math.PI * 2);

                var epAlpha = (0.2 + 0.2 * Math.sin(ep.phase)) * _emph('evaporation');

                ctx.fillStyle = 'rgba(251,191,36,' + epAlpha + ')';

                ctx.fill();

              }



              // ── Transpiration particles (green, from trees) ──

              for (var tpi = 0; tpi < transPs.length; tpi++) {

                var tp = transPs[tpi];

                tp.y -= tp.speed * 0.35;

                tp.x += Math.sin(tp.phase + tick * 0.025) * 0.25;

                tp.phase += 0.04;

                if (tp.y < cH * 0.15 / dpr) { tp.y = cH * 0.48 / dpr; tp.x = cW * 0.55 / dpr + Math.random() * cW * 0.15 / dpr; }

                ctx.beginPath(); ctx.arc(tp.x * dpr, tp.y * dpr, tp.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(74,222,128,' + ((0.2 + Math.sin(tp.phase) * 0.15) * _emph('transpiration')) + ')';

                ctx.fill();

              }



              // ── Rain drops ──

              for (var rpi = 0; rpi < rainPs.length; rpi++) {

                var rr = rainPs[rpi];

                rr.y += rr.speed * 1.3;

                rr.x -= 0.15; // Slight wind

                if (rr.y > cH * 0.65 / dpr) {

                  rr.y = cH * 0.12 / dpr;

                  rr.x = cW * 0.1 / dpr + Math.random() * cW * 0.5 / dpr;

                }

                ctx.strokeStyle = 'rgba(59,130,246,' + ((0.3 + Math.sin(rr.phase + tick * 0.05) * 0.2) * _emph('precipitation')) + ')';

                ctx.lineWidth = 1.5 * dpr;

                ctx.beginPath();

                ctx.moveTo(rr.x * dpr, rr.y * dpr);

                ctx.lineTo((rr.x - 0.5) * dpr, (rr.y + rr.len) * dpr);

                ctx.stroke();

              }



              // ── Cloud wisps (drifting) ──

              for (var cwi = 0; cwi < cloudPs.length; cwi++) {

                var cw = cloudPs[cwi];

                cw.x += cw.speed;

                if (cw.x > cW / dpr + 20) cw.x = -20;

                ctx.beginPath();

                ctx.arc(cw.x * dpr, cw.y * dpr, cw.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(226,232,240,' + (0.15 + Math.sin(cw.phase + tick * 0.01) * 0.1) + ')';

                ctx.fill();

              }



              // ── Infiltration drips (into ground) ──

              for (var ipi = 0; ipi < infiltPs.length; ipi++) {

                var ip = infiltPs[ipi];

                ip.y += ip.speed;

                ip.x += Math.sin(ip.phase + tick * 0.01) * 0.1;

                if (ip.y > cH * 0.88 / dpr) { ip.y = cH * 0.7 / dpr; ip.x = cW * 0.3 / dpr + Math.random() * cW * 0.4 / dpr; }

                ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, 1.5 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(59,130,246,' + (0.2 * _emph('infiltration')) + ')';

                ctx.fill();

              }



              // ── Process Labels on diagram ──

              var activeId = canvasEl.dataset.activeStage || 'evaporation';

              ctx.textAlign = 'left';

              var labels = [

                { id: 'evaporation', text: t('stem.watercycle.evaporation', '\u2191 Evaporation'), x: 8, y: cH * 0.54, color: '#fbbf24' },

                { id: 'condensation', text: t('stem.watercycle.condensation', '\u2601 Condensation'), x: cW * 0.28, y: cH * 0.06, color: 'var(--allo-stem-text-soft, #94a3b8)' },

                { id: 'precipitation', text: t('stem.watercycle.precipitation', '\u2193 Precipitation'), x: cW * 0.08, y: cH * 0.28, color: '#60a5fa' },

                { id: 'collection', text: t('stem.watercycle.collection', '\uD83C\uDF0A Collection'), x: cW * 0.55, y: cH * 0.72, color: '#0ea5e9' },

                { id: 'transpiration', text: t('stem.watercycle.transpiration', '\uD83C\uDF3F Transpiration'), x: cW * 0.70, y: cH * 0.42, color: '#22c55e' },

                { id: 'infiltration', text: t('stem.watercycle.infiltration', '\uD83E\uDEB4 Infiltration'), x: cW * 0.42, y: cH * 0.80, color: '#92400e' }

              ];

              labels.forEach(function (lbl) {

                var isActive = activeId === lbl.id;
                ctx.save();
                
                var lblColor = lbl.color;
                if (lbl.id === 'condensation' && isDark) {
                  lblColor = '#cbd5e1';
                }

                ctx.font = (isActive ? 'bold ' : '') + ((isActive ? 8.5 : 7) * dpr) + 'px sans-serif';

                if (isActive) {
                  ctx.fillStyle = lblColor;
                  if (isDark) {
                    ctx.shadowBlur = 8 * dpr;
                    ctx.shadowColor = lblColor;
                  }
                } else {
                  ctx.fillStyle = isDark ? (lbl.id === 'condensation' ? '#475569' : lblColor + '90') : lblColor + '80';
                }

                ctx.fillText(lbl.text, lbl.x * dpr, lbl.y * dpr);

                if (isActive) {
                  ctx.strokeStyle = lblColor;
                  ctx.lineWidth = 1.5 * dpr;
                  
                  if (isDark) {
                    ctx.shadowBlur = 10 * dpr;
                    ctx.shadowColor = lblColor;
                    ctx.setLineDash([]);
                  } else {
                    ctx.strokeStyle = lblColor + '60';
                    ctx.setLineDash([4, 3]);
                  }

                  ctx.strokeRect((lbl.x - 4) * dpr, (lbl.y - 11) * dpr, ctx.measureText(lbl.text).width + 8 * dpr, 15 * dpr);

                }
                
                ctx.restore();

              });



              // ── Flying birds ──

              for (var bdi = 0; bdi < 4; bdi++) {

                var bdx = ((tick * 0.4 + bdi * cW * 0.28) % (cW + 40 * dpr)) - 20 * dpr;

                var bdy = cH * (0.08 + bdi * 0.06) + Math.sin(tick * 0.015 + bdi * 2) * 8 * dpr;

                var bdWing = Math.sin(tick * 0.06 + bdi * 1.5) * 0.4;

                ctx.strokeStyle = 'rgba(30,41,59,' + (0.3 + bdi * 0.05) + ')'; ctx.lineWidth = 1.2 * dpr;

                // Left wing

                ctx.beginPath(); ctx.moveTo(bdx - 6 * dpr, bdy + bdWing * 4 * dpr);

                ctx.quadraticCurveTo(bdx - 3 * dpr, bdy - 3 * dpr, bdx, bdy); ctx.stroke();

                // Right wing

                ctx.beginPath(); ctx.moveTo(bdx + 6 * dpr, bdy + bdWing * 4 * dpr);

                ctx.quadraticCurveTo(bdx + 3 * dpr, bdy - 3 * dpr, bdx, bdy); ctx.stroke();

              }


              // ═══ CLIMATE LAB  -  Dynamic Weather Effects ═══
              var climSolar = parseFloat(canvasEl.dataset.climSolar || '1.0');
              var climTemp = parseFloat(canvasEl.dataset.climTemp || '15');
              var climWind = parseFloat(canvasEl.dataset.climWind || '1.0');

              // ── Stars at night (visible when solar < 0.4) ──
              if (climSolar < 0.4) {
                var starAlpha = Math.max(0, (0.4 - climSolar) / 0.4);
                for (var stj = 0; stj < starField.length; stj++) {
                  var st = starField[stj];
                  var twk = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + st.twinkle));
                  ctx.fillStyle = 'rgba(255,255,255,' + (starAlpha * twk * 0.8) + ')';
                  ctx.beginPath(); ctx.arc(st.x * dpr, st.y * dpr, st.size * dpr, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Sun reflection shimmer on water ──
              if (climSolar > 0.5) {
                var refAlpha = (climSolar - 0.5) * 0.4;
                for (var sri = 0; sri < 8; sri++) {
                  var srx = cW * 0.15 + ((tick * 0.8 + sri * cW * 0.06) % (cW * 0.4));
                  var sry = cH * 0.66 + Math.sin(tick * 0.04 + sri * 1.3) * 2 * dpr;
                  ctx.fillStyle = 'rgba(251,230,180,' + (refAlpha * (0.3 + Math.sin(tick * 0.06 + sri) * 0.2)) + ')';
                  ctx.beginPath(); ctx.ellipse(srx, sry, (6 + Math.sin(tick * 0.03 + sri) * 2) * dpr, 1.5 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Lightning (random, when temp > 30) ──
              if (canvasEl.dataset.stormActive === 'true') {
                lightning.timer--;
                if (lightning.timer <= 0 && Math.random() < 0.003) {
                  lightning.active = true;
                  lightning.timer = 6 + Math.floor(Math.random() * 4);
                  lightning.x = cW * 0.15 + Math.random() * cW * 0.4;
                  lightning.branches = [];
                  var lx = lightning.x, ly = cH * 0.08;
                  for (var lb = 0; lb < 8; lb++) {
                    var nx = lx + (Math.random() - 0.5) * 20 * dpr;
                    var ny = ly + (10 + Math.random() * 15) * dpr;
                    lightning.branches.push({ x1: lx, y1: ly, x2: nx, y2: ny });
                    lx = nx; ly = ny;
                    if (Math.random() < 0.35) {
                      lightning.branches.push({ x1: nx, y1: ny, x2: nx + (Math.random() - 0.5) * 30 * dpr, y2: ny + 12 * dpr });
                    }
                  }
                }
                if (lightning.active && lightning.timer > 0) {
                  ctx.save();
                  ctx.shadowColor = 'rgba(147,197,253,0.9)'; ctx.shadowBlur = 15 * dpr;
                  ctx.strokeStyle = 'rgba(220,240,255,0.95)'; ctx.lineWidth = 2.5 * dpr; ctx.lineCap = 'round';
                  for (var lbi = 0; lbi < lightning.branches.length; lbi++) {
                    var br = lightning.branches[lbi];
                    ctx.beginPath(); ctx.moveTo(br.x1, br.y1); ctx.lineTo(br.x2, br.y2); ctx.stroke();
                  }
                  // Flash overlay
                  ctx.fillStyle = 'rgba(200,220,255,' + (lightning.timer / 10 * 0.15) + ')';
                  ctx.fillRect(0, 0, cW, cH);
                  ctx.restore();
                } else { lightning.active = false; }
              }

              // ── Snowflakes (when temp < 0) ──
              if (climTemp < 0) {
                var snowAlpha = Math.min(1, Math.abs(climTemp) / 15);
                var snowCount = Math.floor(snowPs.length * snowAlpha);
                for (var sni = 0; sni < snowCount; sni++) {
                  var sn = snowPs[sni];
                  sn.y += sn.speed * 0.5;
                  sn.x += Math.sin(sn.drift + tick * 0.01) * sn.wobble * climWind;
                  sn.drift += 0.02;
                  if (sn.y > cH * 0.65 / dpr) { sn.y = -2; sn.x = Math.random() * cW / dpr; }
                  if (sn.x > cW / dpr) sn.x = 0; if (sn.x < 0) sn.x = cW / dpr;
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(sn.drift) * 0.2) + ')';
                  ctx.beginPath(); ctx.arc(sn.x * dpr, sn.y * dpr, sn.size * dpr, 0, Math.PI * 2); ctx.fill();
                  // Tiny snowflake arms for larger flakes
                  if (sn.size > 2) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5 * dpr;
                    for (var arm = 0; arm < 6; arm++) {
                      var aa = arm * Math.PI / 3 + tick * 0.005;
                      ctx.beginPath(); ctx.moveTo(sn.x * dpr, sn.y * dpr);
                      ctx.lineTo((sn.x + Math.cos(aa) * sn.size * 1.5) * dpr, (sn.y + Math.sin(aa) * sn.size * 1.5) * dpr); ctx.stroke();
                    }
                  }
                }
                // Snow accumulation on ground
                ctx.fillStyle = 'rgba(255,255,255,' + (snowAlpha * 0.3) + ')';
                ctx.beginPath();
                for (var sgx = 0; sgx <= cW; sgx += 8) {
                  ctx.lineTo(sgx, cH * 0.62 + Math.sin(sgx * 0.02) * 2 * dpr);
                }
                ctx.lineTo(cW, cH * 0.64); ctx.lineTo(0, cH * 0.64); ctx.closePath(); ctx.fill();
              }

              // ── Fog wisps (when temp 5-15 and high solar) ──
              if (climTemp > 2 && climTemp < 18) {
                var fogIntensity = 1 - Math.abs(climTemp - 10) / 10;
                for (var fgi = 0; fgi < fogPs.length; fgi++) {
                  var fg = fogPs[fgi];
                  fg.x += fg.speed * climWind;
                  if (fg.x > cW / dpr + fg.size) fg.x = -fg.size;
                  ctx.fillStyle = 'rgba(203,213,225,' + (fg.alpha * fogIntensity) + ')';
                  ctx.beginPath(); ctx.ellipse(fg.x * dpr, fg.y * dpr, fg.size * dpr, fg.size * 0.3 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Rainbow (after rain when sun is out  -  solar > 0.7 and temp > 10) ──
              if (climSolar > 0.7 && climTemp > 10 && climTemp < 35) {
                rainbow.alpha = Math.min(rainbow.alpha + 0.003, 0.25);
                rainbow.visible = true;
              } else {
                rainbow.alpha = Math.max(rainbow.alpha - 0.005, 0);
                if (rainbow.alpha <= 0) rainbow.visible = false;
              }
              if (rainbow.visible && rainbow.alpha > 0.01) {
                var rbColors = ['rgba(255,0,0,A)','rgba(255,127,0,A)','rgba(255,255,0,A)','rgba(0,255,0,A)','rgba(0,0,255,A)','rgba(75,0,130,A)','rgba(148,0,211,A)'];
                var rbCx = cW * 0.35, rbCy = cH * 0.55, rbR = cW * 0.3;
                for (var rbi = 0; rbi < rbColors.length; rbi++) {
                  ctx.strokeStyle = rbColors[rbi].replace(/A/g, String(rainbow.alpha * (0.6 + Math.sin(tick * 0.01 + rbi) * 0.1)));
                  ctx.lineWidth = 3 * dpr;
                  ctx.beginPath(); ctx.arc(rbCx, rbCy, rbR - rbi * 4 * dpr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
                }
              }

              // ── Climate-responsive evaporation/rain intensity ──
              // Adjust particle visibility based on climate controls
              var evapActivity = Math.max(0.2, Math.min(2, climSolar * (climTemp / 15)));
              var rainActivity = climTemp < 0 ? 0.3 : (climTemp > 25 ? 1.5 : 1.0);


              // ═══ JOURNEY MODE  -  Draw droplet + update state ═══
              var jState = canvasEl.dataset.journeyState || 'idle';
              var journeyPaused2 = canvasEl.dataset.journeyPaused === 'true';
              var journeySpeed2 = parseFloat(canvasEl.dataset.journeySpeed || '1');
              if (!isFinite(journeySpeed2) || journeySpeed2 <= 0) journeySpeed2 = 1;
              if (jState !== 'idle') {
                journey.state = jState;
                var speed2 = (jState === 'aquifer_flow' || jState === 'infiltrating') ? 0.003 : 
                            (jState === 'precipitating') ? 0.012 : 0.006;
                
                if (!journeyPaused2 && jState !== 'ground_choice' && jState !== 'complete') {
                  journey.progress += speed2 * journeySpeed2;
                  if (journey.progress >= 1) {
                    journey.progress = 0;
                    journey.particleTrail = [];
                    var next = JOURNEY_NEXT[jState];
                    if (next === 'ocean' && jState !== 'ocean') {
                      // Completed a full cycle!
                      canvasEl.dataset.journeyState = 'complete';
                      if (canvasEl._onJourneyComplete) canvasEl._onJourneyComplete(jState);
                    } else if (next === 'ground_choice') {
                      canvasEl.dataset.journeyState = 'ground_choice';
                      if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition('ground_choice');
                    } else {
                      canvasEl.dataset.journeyState = next || 'idle';
                      if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition(next);
                    }
                    jState = canvasEl.dataset.journeyState;
                  }
                }

                // Draw the droplet
                if (jState !== 'idle' && jState !== 'complete' && jState !== 'ground_choice') {
                  var pos = interpPath(jState, Math.min(journey.progress, 0.999));
                  drawDroplet(pos.x, pos.y, jState, tick);
                }

                // Ground choice: draw 3 choice buttons on canvas
                if (jState === 'ground_choice') {
                  drawDroplet(0.34, 0.62, 'ocean', tick);
                  
                  // Choice highlight zones  -  uses shared GROUND_CHOICES array
                  var choices = GROUND_CHOICES;
                  for (var chi = 0; chi < choices.length; chi++) {
                    var ch = choices[chi];
                    var chPulse = 0.7 + Math.sin(tick * 0.05 + chi * 2) * 0.3;
                    ctx.fillStyle = ch.color;
                    ctx.strokeStyle = ch.border;
                    ctx.lineWidth = 2 * dpr;
                    ctx.globalAlpha = chPulse;
                    var chx = ch.x * cW, chy = ch.y * cH, chw = ch.w * cW, chh = ch.h * cH;
                    ctx.beginPath();
                    ctx.roundRect(chx, chy, chw, chh, 8 * dpr);
                    ctx.fill(); ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(ch.label, chx + chw / 2, chy + chh / 2 + 2 * dpr);
                  }
                  ctx.textAlign = 'left';
                }

                // Journey HUD bar at top
                if (jState !== 'idle') {
                  ctx.save();
                  ctx.fillStyle = 'rgba(0,0,0,0.6)';
                  ctx.beginPath(); ctx.roundRect(cW * 0.1, 6 * dpr, cW * 0.8, 22 * dpr, 6 * dpr); ctx.fill();
                  ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
                  var hudLabel = JOURNEY_STATE_LABELS[jState] || jState;
                  ctx.fillText(hudLabel, cW * 0.5, 20 * dpr);
                  // Progress bar
                  if (jState !== 'ground_choice' && jState !== 'complete') {
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(cW * 0.15, 24 * dpr, cW * 0.7, 3 * dpr);
                    ctx.fillStyle = '#0ea5e9';
                    ctx.fillRect(cW * 0.15, 24 * dpr, cW * 0.7 * journey.progress, 3 * dpr);
                  }
                  ctx.textAlign = 'left';
                  ctx.restore();
                }

                // Fact tooltip
                if (jState !== 'idle' && jState !== 'complete') {
                  var fact = JOURNEY_FACTS[jState];
                  if (fact && journey.progress < 0.3) {
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, 1 - journey.progress / 0.3);
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = (5.5 * dpr) + 'px sans-serif';
                    var tw = ctx.measureText(fact).width;
                    var fx = Math.max(4 * dpr, Math.min(cW - tw - 12 * dpr, cW * 0.5 - tw / 2));
                    ctx.beginPath(); ctx.roundRect(fx - 4 * dpr, cH * 0.94 - 2 * dpr, tw + 8 * dpr, 14 * dpr, 4 * dpr); ctx.fill();
                    ctx.fillStyle = '#e0f2fe';
                    ctx.fillText(fact, fx, cH * 0.94 + 8 * dpr);
                    ctx.restore();
                  }
                }
              }

              // ── HUD ──

              ctx.fillStyle = 'rgba(0,0,0,0.5)';

              ctx.fillRect(4 * dpr, cH - 22 * dpr, 130 * dpr, 18 * dpr);

              ctx.font = (6 * dpr) + 'px sans-serif';

              ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left';

              ctx.fillText('\uD83C\uDF0D 71% of Earth is water \u2022 97% is saltwater', 8 * dpr, cH - 10 * dpr);



              scheduleWaterCycleFrame();

            }

            scheduleWaterCycleFrame();

            // Journey callbacks
            canvasEl._onJourneyTransition = function(nextState) {
              // Sync active stage to match journey
              var stageMap = { ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation', 
                precipitating: 'precipitation', river_runoff: 'collection', infiltrating: 'infiltration',
                aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration' };
              if (stageMap[nextState]) canvasEl.dataset.activeStage = stageMap[nextState];
              if (canvasEl._wcSyncReact) {
                canvasEl._wcSyncReact(nextState);
              }
            };
            canvasEl._onJourneyComplete = function(fromState) {
              if (canvasEl._wcSyncReact) {
                canvasEl._wcSyncReact('complete');
              }
            };
            // Bridge canvas clicks and events to React state
            canvasEl._wcRestartJourney = function() {
              journey.state = 'ocean';
              journey.progress = 0;
              journey.particleTrail = [];
              canvasEl.dataset.journeyState = 'ocean';
              canvasEl.dataset.journeyPaused = 'false';
              if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition('ocean');
            };
            canvasEl._wcSyncReact = function(nextState, pathKey) {
              // Play state-specific water cycle sound
              if (nextState === 'complete') sfxWcCorrect();
              else if (nextState && nextState.indexOf('evap') >= 0) sfxEvaporate();
              else if (nextState && nextState.indexOf('cloud') >= 0) sfxCondense();
              else if (nextState && (nextState.indexOf('rain') >= 0 || nextState.indexOf('precip') >= 0 || nextState.indexOf('snow') >= 0)) sfxRain();
              else if (nextState && (nextState.indexOf('river') >= 0 || nextState.indexOf('runoff') >= 0 || nextState.indexOf('stream') >= 0)) sfxStream();
              else if (nextState && (nextState.indexOf('collect') >= 0 || nextState.indexOf('ocean') >= 0 || nextState.indexOf('lake') >= 0)) sfxCollect();
              else if (nextState && (nextState.indexOf('freez') >= 0 || nextState.indexOf('ice') >= 0 || nextState.indexOf('glacier') >= 0)) sfxFreeze();
              else sfxWcClick();
              setLabToolData(function(prev) {
                var current = prev.waterCycle || {};
                var journeyStageMap = { ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation',
                  precipitating: 'precipitation', ground_choice: 'precipitation', river_runoff: 'collection',
                  infiltrating: 'infiltration', aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration' };
                var nextStage = journeyStageMap[nextState];
                var nextWaterCycle = Object.assign({}, current, { journeyState: nextState }, nextStage ? { activeStage: nextStage } : {});
                if (pathKey) {
                  var paths = Object.assign({ runoff: 0, infiltrate: 0, plant: 0 }, current.journeyPaths || {});
                  paths[pathKey] = (paths[pathKey] || 0) + 1;
                  nextWaterCycle.journeyPaths = paths;
                  if (current.journeyView === '3d') {
                    var paths3d = Object.assign({ runoff: 0, infiltrate: 0, plant: 0 }, current.journey3dPaths || {});
                    paths3d[pathKey] = (paths3d[pathKey] || 0) + 1;
                    nextWaterCycle.journey3dPaths = paths3d;
                  }
                }
                if (current.journeyView === '3d') {
                  var visited3d = Object.assign({}, current.journey3dStatesVisited || {});
                  visited3d[nextState] = true;
                  nextWaterCycle.journey3dStatesVisited = visited3d;
                }
                return Object.assign({}, prev, { waterCycle: nextWaterCycle });
              });
            };

          };

          // ── Keyboard shortcuts (WCAG 2.1.1): 1-6 = stage, J = toggle Journey, R/U/P = journey ground choice ──
          var _lastWc3dCanvas = null;
          const journey3dRef = function(canvasEl) {
            if (!canvasEl) {
              var detached3d = _lastWc3dCanvas;
              _lastWc3dCanvas = null;
              setTimeout(function() {
                if (detached3d && !detached3d.isConnected && detached3d._wc3dCleanup) {
                  detached3d._wc3dCleanup();
                  detached3d._wc3dInit = false;
                }
              }, 0);
              return;
            }

            _lastWc3dCanvas = canvasEl;
            if (canvasEl._wc3dInit) return;
            if (!window.THREE) {
              canvasEl.dataset.engineState = 'loading';
              return;
            }

            var THREE = window.THREE;
            var renderer;
            try {
              renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' });
            } catch (err) {
              canvasEl.dataset.engineState = 'error';
              setTimeout(function() {
                upd('journey3dError', 'WebGL is unavailable on this device. Use the 2D Cycle view instead.');
              }, 0);
              return;
            }

            canvasEl._wc3dInit = true;
            canvasEl.dataset.engineState = 'ready';
            var alive3d = true;
            var frame3d = null;
            var motionReduced3d = false;
            try { motionReduced3d = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            var width = Math.max(320, canvasEl.clientWidth || 800);
            var height = Math.max(260, canvasEl.clientHeight || 460);
            renderer.setSize(width, height, false);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setClearColor(0x041a2b, 1);
            if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.12;
            if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            var scene = new THREE.Scene();
            scene.background = new THREE.Color(0x041a2b);
            scene.fog = new THREE.FogExp2(0x08283b, 0.035);

            var skyUniforms3d = {
              topColor: { value: new THREE.Color(0x082f49) },
              horizonColor: { value: new THREE.Color(0x155e75) }
            };
            var sky3d = new THREE.Mesh(
              new THREE.SphereGeometry(46, 32, 18),
              new THREE.ShaderMaterial({
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
                uniforms: skyUniforms3d,
                vertexShader: 'varying vec3 vWorldPosition;\nvoid main(){ vec4 worldPosition=modelMatrix*vec4(position,1.0); vWorldPosition=worldPosition.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
                fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vWorldPosition;\nvoid main(){ float h=normalize(vWorldPosition+vec3(0.0,4.0,0.0)).y; float blend=pow(max(h,0.0),0.58); gl_FragColor=vec4(mix(horizonColor,topColor,blend),1.0); }'
              })
            );
            scene.add(sky3d);

            var camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 80);
            camera.position.set(8.5, 4.6, 11.5);
            camera.lookAt(0, 0, 0);

            var hemi3d = new THREE.HemisphereLight(0xbde9ff, 0x183225, 1.25);
            scene.add(hemi3d);
            var sun3d = new THREE.DirectionalLight(0xfff2c7, 1.8);
            sun3d.position.set(-5, 9, 6);
            sun3d.castShadow = true;
            scene.add(sun3d);
            sun3d.shadow.mapSize.set(1024, 1024);
            sun3d.shadow.camera.left = -13; sun3d.shadow.camera.right = 13;
            sun3d.shadow.camera.top = 13; sun3d.shadow.camera.bottom = -13;
            sun3d.shadow.camera.near = 0.5; sun3d.shadow.camera.far = 32;
            sun3d.shadow.bias = -0.0004;
            var fill3d = new THREE.PointLight(0x38bdf8, 1.6, 22);
            fill3d.position.set(0, 2, 5);
            scene.add(fill3d);

            var world3d = new THREE.Group();

            var sunOrb3d = new THREE.Group();
            var sunDiscMat3d = new THREE.MeshBasicMaterial({ color: 0xfff4ba, transparent: true, opacity: 0.95, fog: false });
            var sunHaloMat3d = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
            sunOrb3d.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), sunDiscMat3d));
            sunOrb3d.add(new THREE.Mesh(new THREE.SphereGeometry(1.75, 20, 14), sunHaloMat3d));
            sunOrb3d.position.set(-13, 9, -20);
            scene.add(sunOrb3d);
            var moonMat3d = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0, fog: false });
            var moon3d = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), moonMat3d);
            moon3d.position.set(12, 8, -22);
            scene.add(moon3d);
            scene.add(world3d);

            var oceanMat = new THREE.MeshPhysicalMaterial({
              color: 0x087aa5, roughness: 0.18, metalness: 0.05,
              transparent: true, opacity: 0.9, clearcoat: 0.75, clearcoatRoughness: 0.16
            });
            var oceanGeometry3d = new THREE.PlaneGeometry(18, 10, 28, 18);
            var oceanBasePositions3d = new Float32Array(oceanGeometry3d.attributes.position.array);
            var ocean3d = new THREE.Mesh(oceanGeometry3d, oceanMat);
            ocean3d.rotation.x = -Math.PI / 2;
            ocean3d.position.set(-2.5, -1.25, 1.6);
            ocean3d.receiveShadow = true;
            world3d.add(ocean3d);

            var shore3d = new THREE.Mesh(
              new THREE.PlaneGeometry(1.45, 7.2, 1, 8),
              new THREE.MeshStandardMaterial({ color: 0xd5b47a, roughness: 0.96 })
            );
            shore3d.rotation.x = -Math.PI / 2;
            shore3d.position.set(0.25, -1.11, -0.6);
            shore3d.receiveShadow = true;
            world3d.add(shore3d);
            var foamCurve3d = new THREE.CatmullRomCurve3([
              new THREE.Vector3(-0.12, -1.04, -4.1), new THREE.Vector3(0.08, -1.04, -2.8),
              new THREE.Vector3(-0.04, -1.04, -1.4), new THREE.Vector3(0.12, -1.04, 0),
              new THREE.Vector3(-0.1, -1.04, 1.4), new THREE.Vector3(0.08, -1.04, 2.9)
            ]);
            var foam3d = new THREE.Mesh(
              new THREE.TubeGeometry(foamCurve3d, 56, 0.055, 6, false),
              new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.62, depthWrite: false })
            );
            world3d.add(foam3d);

            var coastalWaveGroup3d = new THREE.Group();
            var coastalWaveCrests3d = [];
            var coastalWaveCount3d = 7;
            for (var coastalWaveIndex3d = 0; coastalWaveIndex3d < coastalWaveCount3d; coastalWaveIndex3d++) {
              var coastalWavePoints3d = [];
              for (var coastalWavePointIndex3d = 0; coastalWavePointIndex3d < 9; coastalWavePointIndex3d++) {
                coastalWavePoints3d.push(new THREE.Vector3(
                  Math.sin(coastalWavePointIndex3d * 1.05 + coastalWaveIndex3d * 0.72) * 0.075,
                  Math.cos(coastalWavePointIndex3d * 1.45 + coastalWaveIndex3d * 0.5) * 0.008,
                  -4.05 + coastalWavePointIndex3d * 0.86
                ));
              }
              var coastalWaveCurve3d = new THREE.CatmullRomCurve3(coastalWavePoints3d, false, 'catmullrom', 0.35);
              var coastalWaveMat3d = new THREE.MeshBasicMaterial({
                color: coastalWaveIndex3d % 2 ? 0xbae6fd : 0xe0f7ff,
                transparent: true, opacity: 0, depthWrite: false,
                blending: THREE.AdditiveBlending
              });
              var coastalWaveCrest3d = new THREE.Mesh(
                new THREE.TubeGeometry(coastalWaveCurve3d, 54, 0.021 + (coastalWaveIndex3d % 3) * 0.004, 5, false),
                coastalWaveMat3d
              );
              coastalWaveCrest3d.position.set(-6, -1.12, 0);
              coastalWaveCrest3d.userData.phase = coastalWaveIndex3d / coastalWaveCount3d;
              coastalWaveCrest3d.renderOrder = 4;
              coastalWaveCrests3d.push(coastalWaveCrest3d);
              coastalWaveGroup3d.add(coastalWaveCrest3d);
            }
            coastalWaveGroup3d.visible = false;
            world3d.add(coastalWaveGroup3d);

            var shoreWashMat3d = new THREE.MeshBasicMaterial({
              color: 0x2d8f9d, transparent: true, opacity: 0,
              side: THREE.DoubleSide, depthWrite: false
            });
            var shoreWash3d = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 7.15), shoreWashMat3d);
            shoreWash3d.rotation.x = -Math.PI / 2;
            shoreWash3d.position.set(0.02, -1.092, -0.6);
            shoreWash3d.scale.set(0.45, 1, 1);
            shoreWash3d.visible = false;
            world3d.add(shoreWash3d);

            var breakingSprayCount3d = 32;
            var breakingSpraySeeds3d = new Float32Array(breakingSprayCount3d * 2);
            var breakingSprayGeometry3d = new THREE.BufferGeometry();
            breakingSprayGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(breakingSprayCount3d * 3), 3));
            for (var breakingSpraySeedIndex3d = 0; breakingSpraySeedIndex3d < breakingSprayCount3d; breakingSpraySeedIndex3d++) {
              breakingSpraySeeds3d[breakingSpraySeedIndex3d * 2] = -4.02 + ((breakingSpraySeedIndex3d * 17) % 31) / 31 * 6.95;
              breakingSpraySeeds3d[breakingSpraySeedIndex3d * 2 + 1] = (breakingSpraySeedIndex3d * 0.61803398875) % 1;
            }
            var breakingSpray3d = new THREE.Points(breakingSprayGeometry3d, new THREE.PointsMaterial({
              color: 0xe0f7ff, size: 0.062, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            breakingSpray3d.visible = false;
            world3d.add(breakingSpray3d);

            var landMat3d = new THREE.MeshStandardMaterial({ color: 0x6b482d, roughness: 0.95, transparent: true, opacity: 1 });
            var land3d = new THREE.Mesh(
              new THREE.BoxGeometry(9, 1.5, 7),
              landMat3d
            );
            land3d.position.set(4.8, -1.8, -0.6);
            land3d.castShadow = true;
            land3d.receiveShadow = true;
            world3d.add(land3d);

            var groundCoverMat3d = new THREE.MeshStandardMaterial({ color: 0x39734b, roughness: 0.9, transparent: true, opacity: 1 });
            var grass3d = new THREE.Mesh(
              new THREE.PlaneGeometry(9, 7),
              groundCoverMat3d
            );
            grass3d.rotation.x = -Math.PI / 2;
            grass3d.position.set(4.8, -1.02, -0.6);
            grass3d.receiveShadow = true;
            world3d.add(grass3d);

            var snowCoverMat3d = new THREE.MeshStandardMaterial({ color: 0xeaf7ff, roughness: 0.78, transparent: true, opacity: 0, depthWrite: false });
            var snowCover3d = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), snowCoverMat3d);
            snowCover3d.rotation.x = -Math.PI / 2;
            snowCover3d.position.set(4.8, -0.995, -0.6);
            snowCover3d.receiveShadow = true;
            snowCover3d.visible = false;
            world3d.add(snowCover3d);

            var urbanPonding3d = new THREE.Group();
            var pondingMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x38bdf8, emissive: 0x075985, emissiveIntensity: 0.12,
              roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0,
              depthWrite: false
            });
            [[2.15,-1.25,0.72],[3.85,-0.2,0.9],[5.45,-1.65,0.66],[6.45,0.35,0.78],[3.05,1.15,0.6]].forEach(function(pondingSpec3d) {
              var pondingMesh3d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), pondingMat3d);
              pondingMesh3d.rotation.x = -Math.PI / 2;
              pondingMesh3d.position.set(pondingSpec3d[0], -0.982, pondingSpec3d[1]);
              pondingMesh3d.scale.set(pondingSpec3d[2], pondingSpec3d[2] * 0.72, 1);
              pondingMesh3d.userData.baseScale = pondingSpec3d[2];
              urbanPonding3d.add(pondingMesh3d);
            });
            urbanPonding3d.visible = false;
            world3d.add(urbanPonding3d);

            var aquifer3d = new THREE.Mesh(
              new THREE.BoxGeometry(8.6, 0.38, 6.6),
              new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, emissive: 0x075985, emissiveIntensity: 0.22, transparent: true, opacity: 0.58, roughness: 0.2, clearcoat: 0.8 })
            );
            aquifer3d.position.set(4.8, -2.22, -0.6);
            world3d.add(aquifer3d);

            var groundwaterStorageGroup3d = new THREE.Group();
            var waterTableSurfaceGeometry3d = new THREE.PlaneGeometry(8.15, 6.15, 28, 20);
            var waterTableSurfaceBasePositions3d = new Float32Array(
              waterTableSurfaceGeometry3d.attributes.position.array
            );
            var waterTableSurfaceMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x38bdf8, emissive: 0x075985, emissiveIntensity: 0.32,
              roughness: 0.14, clearcoat: 0.9, transparent: true, opacity: 0,
              depthWrite: false, side: THREE.DoubleSide
            });
            var waterTableSurface3d = new THREE.Mesh(waterTableSurfaceGeometry3d, waterTableSurfaceMat3d);
            waterTableSurface3d.rotation.x = -Math.PI / 2;
            groundwaterStorageGroup3d.add(waterTableSurface3d);
            var waterTableRimMat3d = new THREE.LineBasicMaterial({
              color: 0xa5f3fc, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var waterTableRim3d = new THREE.LineSegments(
              new THREE.EdgesGeometry(new THREE.BoxGeometry(8.18, 0.028, 6.18)),
              waterTableRimMat3d
            );
            groundwaterStorageGroup3d.add(waterTableRim3d);
            var capillaryFringeCount3d = 64;
            var capillaryFringeSeeds3d = new Float32Array(capillaryFringeCount3d * 3);
            var capillaryFringeGeometry3d = new THREE.BufferGeometry();
            var capillaryFringePositions3d = new Float32Array(capillaryFringeCount3d * 3);
            for (var capillarySeedIndex3d = 0; capillarySeedIndex3d < capillaryFringeCount3d; capillarySeedIndex3d++) {
              capillaryFringeSeeds3d[capillarySeedIndex3d * 3] =
                ((capillarySeedIndex3d % 8) / 7 - 0.5) * 7.55;
              capillaryFringeSeeds3d[capillarySeedIndex3d * 3 + 1] =
                (capillarySeedIndex3d * 0.61803398875) % 1;
              capillaryFringeSeeds3d[capillarySeedIndex3d * 3 + 2] =
                (Math.floor(capillarySeedIndex3d / 8) / 7 - 0.5) * 5.55;
            }
            capillaryFringeGeometry3d.setAttribute('position',
              new THREE.BufferAttribute(capillaryFringePositions3d, 3));
            var capillaryFringe3d = new THREE.Points(capillaryFringeGeometry3d, new THREE.PointsMaterial({
              color: 0x67e8f9, size: 0.06, transparent: true, opacity: 0,
              depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
            }));
            groundwaterStorageGroup3d.add(capillaryFringe3d);
            groundwaterStorageGroup3d.position.set(4.8, -2.02, -0.6);
            groundwaterStorageGroup3d.visible = false;
            world3d.add(groundwaterStorageGroup3d);

            var soilIntakeMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x0e7490, emissive: 0x155e75, emissiveIntensity: 0.2,
              roughness: 0.22, clearcoat: 0.7, transparent: true, opacity: 0,
              depthWrite: false
            });
            var soilIntakePatch3d = new THREE.Mesh(new THREE.CircleGeometry(0.72, 40), soilIntakeMat3d);
            soilIntakePatch3d.rotation.x = -Math.PI / 2;
            soilIntakePatch3d.position.set(4.5, -0.972, -0.4);
            soilIntakePatch3d.visible = false;
            world3d.add(soilIntakePatch3d);

            var soilMoistureFrontMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.42,
              roughness: 0.18, transparent: true, opacity: 0,
              depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
            });
            var soilMoistureFrontGroup3d = new THREE.Group();
            [[-0.56,0.86,-0.08],[0,1.04,0.08],[0.56,0.8,-0.02]].forEach(function(frontLobeSpec3d) {
              var frontLobe3d = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.4, 20, 1, true), soilMoistureFrontMat3d);
              frontLobe3d.position.set(frontLobeSpec3d[0], 0, frontLobeSpec3d[2]);
              frontLobe3d.userData.baseScale = frontLobeSpec3d[1];
              soilMoistureFrontGroup3d.add(frontLobe3d);
            });
            soilMoistureFrontGroup3d.position.set(4.5, -1.12, -0.4);
            soilMoistureFrontGroup3d.visible = false;
            world3d.add(soilMoistureFrontGroup3d);

            var wettingFrontRingMat3d = new THREE.MeshBasicMaterial({
              color: 0x67e8f9, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var wettingFrontRing3d = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.034, 6, 52), wettingFrontRingMat3d);
            wettingFrontRing3d.rotation.x = Math.PI / 2;
            wettingFrontRing3d.visible = false;
            world3d.add(wettingFrontRing3d);

            var waterTableRechargeMat3d = new THREE.MeshBasicMaterial({
              color: 0xa5f3fc, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var waterTableRecharge3d = new THREE.Mesh(new THREE.CircleGeometry(1.25, 44), waterTableRechargeMat3d);
            waterTableRecharge3d.rotation.x = -Math.PI / 2;
            waterTableRecharge3d.position.set(4.5, -2.015, -0.4);
            waterTableRecharge3d.scale.set(1.45, 0.82, 1);
            waterTableRecharge3d.visible = false;
            world3d.add(waterTableRecharge3d);

            var aquiferCurrentCurve3d = new THREE.CatmullRomCurve3([
              new THREE.Vector3(7.25, -2.16, -1.45),
              new THREE.Vector3(5.75, -2.12, -0.95),
              new THREE.Vector3(4.1, -2.06, -0.2),
              new THREE.Vector3(2.35, -1.92, 0.48),
              new THREE.Vector3(0.65, -1.62, 1.08),
              new THREE.Vector3(-0.55, -1.28, 1.48)
            ], false, 'catmullrom', 0.3);
            var aquiferMarkerCount3d = 18;
            var aquiferMarkerGeometry3d = new THREE.BufferGeometry();
            aquiferMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(aquiferMarkerCount3d * 3), 3));
            var aquiferFlow3d = new THREE.Points(aquiferMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0x67e8f9, size: 0.105, transparent: true, opacity: 0.72,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            aquiferFlow3d.visible = false;
            world3d.add(aquiferFlow3d);

            var strataGroup3d = new THREE.Group();
            var strataColors3d = [0x8a5a36, 0x6f4932, 0x574137];
            for (var stratumIndex3d = 0; stratumIndex3d < strataColors3d.length; stratumIndex3d++) {
              var stratum3d = new THREE.Mesh(
                new THREE.BoxGeometry(9.08, 0.16, 7.08),
                new THREE.MeshStandardMaterial({ color: strataColors3d[stratumIndex3d], roughness: 1, transparent: true, opacity: 1 })
              );
              stratum3d.position.set(4.8, -1.32 - stratumIndex3d * 0.36, -0.6);
              strataGroup3d.add(stratum3d);
            }
            world3d.add(strataGroup3d);

            var riverCurve = new THREE.CatmullRomCurve3([
              new THREE.Vector3(7.8, -0.88, -2.5),
              new THREE.Vector3(5.7, -0.86, -1.4),
              new THREE.Vector3(3.5, -0.88, 0.2),
              new THREE.Vector3(1.1, -0.98, 1.25),
              new THREE.Vector3(-0.3, -1.15, 1.6)
            ]);
            var river3d = new THREE.Mesh(
              new THREE.TubeGeometry(riverCurve, 64, 0.24, 12, false),
              new THREE.MeshPhysicalMaterial({ color: 0x22b8e6, emissive: 0x075985, emissiveIntensity: 0.16, roughness: 0.16, clearcoat: 0.75, transparent: true, opacity: 0.7 })
            );
            world3d.add(river3d);

            var riverMarkerCount3d = 16;
            var riverMarkerGeometry3d = new THREE.BufferGeometry();
            riverMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(riverMarkerCount3d * 3), 3));
            var riverFlow3d = new THREE.Points(riverMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xcffafe, size: 0.095, transparent: true, opacity: 0.64,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            world3d.add(riverFlow3d);

            var riverTurbidityMat3d = new THREE.MeshBasicMaterial({
              color: 0xb7794f, transparent: true, opacity: 0,
              depthWrite: false, side: THREE.DoubleSide
            });
            var riverTurbidity3d = new THREE.Mesh(
              new THREE.TubeGeometry(riverCurve, 64, 0.252, 12, false),
              riverTurbidityMat3d
            );
            riverTurbidity3d.visible = false;
            world3d.add(riverTurbidity3d);
            var suspendedSedimentCount3d = 56;
            var suspendedSedimentSeeds3d = new Float32Array(suspendedSedimentCount3d * 3);
            var suspendedSedimentGeometry3d = new THREE.BufferGeometry();
            suspendedSedimentGeometry3d.setAttribute('position',
              new THREE.BufferAttribute(new Float32Array(suspendedSedimentCount3d * 3), 3));
            for (var sedimentSeedIndex3d = 0; sedimentSeedIndex3d < suspendedSedimentCount3d; sedimentSeedIndex3d++) {
              suspendedSedimentSeeds3d[sedimentSeedIndex3d * 3] =
                (sedimentSeedIndex3d * 0.61803398875) % 1;
              suspendedSedimentSeeds3d[sedimentSeedIndex3d * 3 + 1] =
                ((sedimentSeedIndex3d * 13) % 37) / 37;
              suspendedSedimentSeeds3d[sedimentSeedIndex3d * 3 + 2] =
                ((sedimentSeedIndex3d * 19) % 41) / 41;
            }
            var suspendedSediment3d = new THREE.Points(suspendedSedimentGeometry3d, new THREE.PointsMaterial({
              color: 0xf0c27b, size: 0.055, transparent: true, opacity: 0,
              depthWrite: false
            }));
            suspendedSediment3d.visible = false;
            world3d.add(suspendedSediment3d);

            var floodplainStorageGroup3d = new THREE.Group();
            var floodplainPoolMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x2dd4bf, emissive: 0x0f766e, emissiveIntensity: 0.18,
              roughness: 0.16, clearcoat: 0.8, transparent: true, opacity: 0,
              depthWrite: false
            });
            var floodplainEdgeMat3d = new THREE.MeshBasicMaterial({
              color: 0x99f6e4, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var floodplainPoolSpecs3d = [
              { position: [6.4, -0.982, -0.55], scale: [1.12, 0.68] },
              { position: [4.5, -0.984, 0.75], scale: [1.0, 0.72] },
              { position: [1.7, -1.018, 2.0], scale: [0.86, 0.64] }
            ];
            var floodplainPools3d = [];
            var floodplainEdges3d = [];
            floodplainPoolSpecs3d.forEach(function(floodplainPoolSpec3d, floodplainPoolIndex3d) {
              var floodplainPool3d = new THREE.Mesh(new THREE.CircleGeometry(0.55, 36), floodplainPoolMat3d);
              floodplainPool3d.rotation.x = -Math.PI / 2;
              floodplainPool3d.position.set(
                floodplainPoolSpec3d.position[0],
                floodplainPoolSpec3d.position[1],
                floodplainPoolSpec3d.position[2]
              );
              floodplainPool3d.userData.baseScaleX = floodplainPoolSpec3d.scale[0];
              floodplainPool3d.userData.baseScaleY = floodplainPoolSpec3d.scale[1];
              floodplainPool3d.userData.storageDelay = floodplainPoolIndex3d * 0.12;
              floodplainStorageGroup3d.add(floodplainPool3d);
              floodplainPools3d.push(floodplainPool3d);
              var floodplainEdge3d = new THREE.Mesh(new THREE.RingGeometry(0.49, 0.55, 36), floodplainEdgeMat3d);
              floodplainEdge3d.rotation.x = -Math.PI / 2;
              floodplainEdge3d.position.copy(floodplainPool3d.position);
              floodplainEdge3d.position.y += 0.008;
              floodplainStorageGroup3d.add(floodplainEdge3d);
              floodplainEdges3d.push(floodplainEdge3d);
            });
            var floodplainExchangeCurves3d = [
              makeJourneyCurve3d([[5.7, -0.91, -1.4], [5.95, -0.95, -0.92], [6.4, -0.98, -0.55]]),
              makeJourneyCurve3d([[3.5, -0.91, 0.2], [3.9, -0.95, 0.48], [4.5, -0.98, 0.75]]),
              makeJourneyCurve3d([[1.1, -0.99, 1.25], [1.35, -1.0, 1.62], [1.7, -1.02, 2.0]])
            ];
            var floodplainExchangeMat3d = new THREE.MeshBasicMaterial({
              color: 0x5eead4, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            floodplainExchangeCurves3d.forEach(function(floodplainExchangeCurve3d) {
              floodplainStorageGroup3d.add(new THREE.Mesh(
                new THREE.TubeGeometry(floodplainExchangeCurve3d, 28, 0.014, 5, false),
                floodplainExchangeMat3d
              ));
            });
            var floodplainExchangeMarkerCount3d = 24;
            var floodplainExchangeMarkerGeometry3d = new THREE.BufferGeometry();
            floodplainExchangeMarkerGeometry3d.setAttribute('position',
              new THREE.BufferAttribute(new Float32Array(floodplainExchangeMarkerCount3d * 3), 3));
            var floodplainExchangeMarkers3d = new THREE.Points(floodplainExchangeMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xccfbf1, size: 0.06, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            floodplainStorageGroup3d.add(floodplainExchangeMarkers3d);
            floodplainStorageGroup3d.visible = false;
            world3d.add(floodplainStorageGroup3d);

            var oceanCurrentGroup3d = new THREE.Group();
            var oceanCurrentCurves3d = [
              makeJourneyCurve3d([[-0.25,-1.12,1.6],[-1.3,-1.11,2.45],[-3.15,-1.13,2.35],[-4.5,-1.12,1.15],[-3.25,-1.13,-0.2],[-1.25,-1.12,0.15]], true),
              makeJourneyCurve3d([[-1.1,-1.15,3.25],[-3.1,-1.16,3.8],[-5.4,-1.14,2.65],[-6.1,-1.16,0.55],[-4.1,-1.15,-1.15],[-1.75,-1.14,-0.55]], true)
            ];
            var oceanCurrentMat3d = new THREE.MeshBasicMaterial({
              color: 0x67e8f9, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            oceanCurrentCurves3d.forEach(function(oceanCurrentCurve3d, oceanCurrentIndex3d) {
              var oceanCurrentTube3d = new THREE.Mesh(
                new THREE.TubeGeometry(oceanCurrentCurve3d, 72, 0.018 + oceanCurrentIndex3d * 0.006, 6, true),
                oceanCurrentMat3d
              );
              oceanCurrentGroup3d.add(oceanCurrentTube3d);
            });
            var oceanCurrentMarkerCount3d = 30;
            var oceanCurrentMarkerGeometry3d = new THREE.BufferGeometry();
            oceanCurrentMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(oceanCurrentMarkerCount3d * 3), 3));
            var oceanCurrentMarkers3d = new THREE.Points(oceanCurrentMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xcffafe, size: 0.072, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            oceanCurrentGroup3d.add(oceanCurrentMarkers3d);
            oceanCurrentGroup3d.visible = false;
            world3d.add(oceanCurrentGroup3d);

            var estuaryMixingCount3d = 36;
            var estuaryMixingSeeds3d = new Float32Array(estuaryMixingCount3d * 3);
            var estuaryMixingGeometry3d = new THREE.BufferGeometry();
            estuaryMixingGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(estuaryMixingCount3d * 3), 3));
            estuaryMixingGeometry3d.setAttribute('color', new THREE.BufferAttribute(new Float32Array(estuaryMixingCount3d * 3), 3));
            function setEstuarySalinityColor3d(colorAttribute3d, colorIndex3d, salinityMix3d) {
              var colorMix3d = Math.max(0, Math.min(1, salinityMix3d));
              var colorPhase3d = colorMix3d < 0.5 ? colorMix3d * 2 : (colorMix3d - 0.5) * 2;
              var colorStart3d = colorMix3d < 0.5 ? [0.49, 0.83, 1] : [0.18, 0.83, 0.74];
              var colorEnd3d = colorMix3d < 0.5 ? [0.18, 0.83, 0.74] : [0.08, 0.36, 0.62];
              colorAttribute3d.setXYZ(colorIndex3d,
                colorStart3d[0] + (colorEnd3d[0] - colorStart3d[0]) * colorPhase3d,
                colorStart3d[1] + (colorEnd3d[1] - colorStart3d[1]) * colorPhase3d,
                colorStart3d[2] + (colorEnd3d[2] - colorStart3d[2]) * colorPhase3d
              );
            }
            for (var estuarySeedIndex3d = 0; estuarySeedIndex3d < estuaryMixingCount3d; estuarySeedIndex3d++) {
              estuaryMixingSeeds3d[estuarySeedIndex3d * 3] = (estuarySeedIndex3d * 0.61803398875) % 1;
              estuaryMixingSeeds3d[estuarySeedIndex3d * 3 + 1] = ((estuarySeedIndex3d * 17) % 31) / 31;
              estuaryMixingSeeds3d[estuarySeedIndex3d * 3 + 2] = ((estuarySeedIndex3d * 11) % 29) / 29;
              setEstuarySalinityColor3d(estuaryMixingGeometry3d.attributes.color, estuarySeedIndex3d,
                estuaryMixingSeeds3d[estuarySeedIndex3d * 3]);
            }
            var estuaryMixing3d = new THREE.Points(estuaryMixingGeometry3d, new THREE.PointsMaterial({
              vertexColors: true, size: 0.085, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            estuaryMixing3d.visible = false;
            world3d.add(estuaryMixing3d);

            var estuaryRibbonShape3d = new THREE.Shape();
            estuaryRibbonShape3d.moveTo(0, -0.06);
            estuaryRibbonShape3d.bezierCurveTo(-0.55, -0.1, -1.35, -0.48, -2.45, -0.68);
            estuaryRibbonShape3d.lineTo(-2.45, 0.68);
            estuaryRibbonShape3d.bezierCurveTo(-1.35, 0.48, -0.55, 0.1, 0, 0.06);
            var estuaryMixingRibbonGeometry3d = new THREE.ShapeGeometry(estuaryRibbonShape3d, 18);
            estuaryMixingRibbonGeometry3d.setAttribute('color', new THREE.BufferAttribute(
              new Float32Array(estuaryMixingRibbonGeometry3d.attributes.position.count * 3), 3
            ));
            for (var estuaryRibbonVertex3d = 0; estuaryRibbonVertex3d < estuaryMixingRibbonGeometry3d.attributes.position.count; estuaryRibbonVertex3d++) {
              setEstuarySalinityColor3d(estuaryMixingRibbonGeometry3d.attributes.color, estuaryRibbonVertex3d,
                Math.abs(estuaryMixingRibbonGeometry3d.attributes.position.getX(estuaryRibbonVertex3d)) / 2.45);
            }
            var estuaryMixingRibbon3d = new THREE.Mesh(estuaryMixingRibbonGeometry3d, new THREE.MeshBasicMaterial({
              vertexColors: true, transparent: true, opacity: 0,
              side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            estuaryMixingRibbon3d.rotation.x = -Math.PI / 2;
            estuaryMixingRibbon3d.position.set(-0.25, -1.115, 1.6);
            estuaryMixingRibbon3d.userData.salinityProbe = true;
            estuaryMixingRibbon3d.visible = false;
            world3d.add(estuaryMixingRibbon3d);
            var sedimentPlumeMat3d = new THREE.MeshBasicMaterial({
              color: 0xb7794f, transparent: true, opacity: 0,
              side: THREE.DoubleSide, depthWrite: false
            });
            var sedimentPlume3d = new THREE.Mesh(estuaryMixingRibbonGeometry3d.clone(), sedimentPlumeMat3d);
            sedimentPlume3d.rotation.x = -Math.PI / 2;
            sedimentPlume3d.position.set(-0.25, -1.108, 1.6);
            sedimentPlume3d.visible = false;
            world3d.add(sedimentPlume3d);

            var estuarySalinityProbeMat3d = new THREE.MeshBasicMaterial({
              color: 0xe0f7ff, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            });
            var estuarySalinityProbe3d = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 36), estuarySalinityProbeMat3d);
            estuarySalinityProbe3d.rotation.x = Math.PI / 2;
            estuarySalinityProbe3d.renderOrder = 18;
            estuarySalinityProbe3d.visible = false;
            world3d.add(estuarySalinityProbe3d);

            var groundwaterSeepCount3d = 24;
            var groundwaterSeepSeeds3d = new Float32Array(groundwaterSeepCount3d * 2);
            var groundwaterSeepGeometry3d = new THREE.BufferGeometry();
            groundwaterSeepGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(groundwaterSeepCount3d * 3), 3));
            for (var groundwaterSeepSeedIndex3d = 0; groundwaterSeepSeedIndex3d < groundwaterSeepCount3d; groundwaterSeepSeedIndex3d++) {
              groundwaterSeepSeeds3d[groundwaterSeepSeedIndex3d * 2] = (groundwaterSeepSeedIndex3d * 0.754877666) % 1;
              groundwaterSeepSeeds3d[groundwaterSeepSeedIndex3d * 2 + 1] = ((groundwaterSeepSeedIndex3d * 13) % 23) / 23;
            }
            var groundwaterSeep3d = new THREE.Points(groundwaterSeepGeometry3d, new THREE.PointsMaterial({
              color: 0xa5f3fc, size: 0.078, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            groundwaterSeep3d.visible = false;
            world3d.add(groundwaterSeep3d);

            var surfaceRunoffTributaries3d = new THREE.Group();
            var surfaceRunoffCurves3d = [];
            var surfaceRunoffChannels3d = [];
            var surfaceRunoffMat3d = new THREE.MeshBasicMaterial({
              color: 0x38bdf8, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            [
              [[6.8,-0.96,1.6],[5.7,-0.92,0.9],[4.5,-0.9,0.4],[3.5,-0.88,0.2]],
              [[4.8,-0.96,-3.1],[5.0,-0.92,-2.2],[5.7,-0.86,-1.4]],
              [[2.6,-0.96,-2.4],[2.7,-0.93,-0.8],[2.1,-0.92,0.55],[1.1,-0.98,1.25]],
              [[8.0,-0.96,0.6],[7.7,-0.92,-0.5],[7.2,-0.92,-2.0]]
            ].forEach(function(tributaryPoints3d, tributaryIndex3d) {
              var tributaryCurve3d = makeJourneyCurve3d(tributaryPoints3d, false);
              var tributaryMesh3d = new THREE.Mesh(
                new THREE.TubeGeometry(tributaryCurve3d, 36, 0.026 + tributaryIndex3d * 0.004, 6, false),
                surfaceRunoffMat3d
              );
              tributaryMesh3d.visible = false;
              surfaceRunoffCurves3d.push(tributaryCurve3d);
              surfaceRunoffChannels3d.push(tributaryMesh3d);
              surfaceRunoffTributaries3d.add(tributaryMesh3d);
            });
            var surfaceRunoffMarkerCount3d = 24;
            var surfaceRunoffMarkerGeometry3d = new THREE.BufferGeometry();
            surfaceRunoffMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(surfaceRunoffMarkerCount3d * 3), 3));
            var surfaceRunoffMarkers3d = new THREE.Points(surfaceRunoffMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xe0f7ff, size: 0.075, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            surfaceRunoffTributaries3d.add(surfaceRunoffMarkers3d);
            surfaceRunoffTributaries3d.visible = false;
            world3d.add(surfaceRunoffTributaries3d);

            var runoffConfluenceMat3d = new THREE.MeshBasicMaterial({
              color: 0xbae6fd, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var runoffConfluenceGroup3d = new THREE.Group();
            surfaceRunoffCurves3d.forEach(function(tributaryCurve3d) {
              var confluenceRing3d = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.024, 6, 36), runoffConfluenceMat3d);
              confluenceRing3d.rotation.x = Math.PI / 2;
              confluenceRing3d.position.copy(tributaryCurve3d.getPointAt(1));
              confluenceRing3d.position.y += 0.055;
              confluenceRing3d.visible = false;
              runoffConfluenceGroup3d.add(confluenceRing3d);
            });
            runoffConfluenceGroup3d.visible = false;
            world3d.add(runoffConfluenceGroup3d);

            var mountainMat = new THREE.MeshStandardMaterial({ color: 0x52636b, roughness: 0.9 });
            var snowMat3d = new THREE.MeshStandardMaterial({
              color: 0xeaf7ff, roughness: 0.7, transparent: true, opacity: 1
            });
            for (var mi3 = 0; mi3 < 4; mi3++) {
              var mountainHeight3d = 3.3 + mi3 * 0.5;
              var mountain = new THREE.Mesh(new THREE.ConeGeometry(1.6 + mi3 * 0.22, mountainHeight3d, 7), mountainMat);
              mountain.position.set(3.5 + mi3 * 1.7, 0.35 + mi3 * 0.12, -3.1 - (mi3 % 2) * 0.6);
              mountain.castShadow = true;
              world3d.add(mountain);
              var snowCap3d = new THREE.Mesh(
                new THREE.ConeGeometry((1.6 + mi3 * 0.22) * 0.48, mountainHeight3d * 0.24, 7),
                snowMat3d
              );
              snowCap3d.position.set(3.5 + mi3 * 1.7, 0.35 + mi3 * 0.12 + mountainHeight3d * 0.39, -3.1 - (mi3 % 2) * 0.6);
              snowCap3d.castShadow = true;
              world3d.add(snowCap3d);
            }

            var snowmeltRouteGroup3d = new THREE.Group();
            var snowmeltCurves3d = [];
            var snowmeltRouteMat3d = new THREE.MeshBasicMaterial({
              color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false,
              blending: THREE.AdditiveBlending
            });
            [
              [[3.5, 1.45, -3.1], [4.1, 0.45, -2.55], [5.0, -0.45, -1.95], [5.7, -0.86, -1.4]],
              [[5.2, 1.68, -3.7], [5.35, 0.55, -3.0], [5.5, -0.35, -2.1], [5.7, -0.86, -1.4]],
              [[6.9, 1.88, -3.1], [7.25, 0.75, -2.9], [7.55, -0.2, -2.7], [7.8, -0.88, -2.5]],
              [[8.6, 2.08, -3.7], [8.45, 0.8, -3.35], [8.1, -0.2, -2.85], [7.8, -0.88, -2.5]]
            ].forEach(function(snowmeltRoutePoints3d) {
              var snowmeltCurve3d = makeJourneyCurve3d(snowmeltRoutePoints3d);
              snowmeltCurves3d.push(snowmeltCurve3d);
              snowmeltRouteGroup3d.add(new THREE.Mesh(
                new THREE.TubeGeometry(snowmeltCurve3d, 36, 0.022, 6, false), snowmeltRouteMat3d
              ));
            });
            var snowmeltMarkerCount3d = 24;
            var snowmeltMarkerGeometry3d = new THREE.BufferGeometry();
            snowmeltMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(snowmeltMarkerCount3d * 3), 3));
            var snowmeltMarkers3d = new THREE.Points(snowmeltMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xbae6fd, size: 0.07, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            snowmeltRouteGroup3d.add(snowmeltMarkers3d);
            snowmeltRouteGroup3d.visible = false;
            world3d.add(snowmeltRouteGroup3d);

            var snowStorageGaugeGroup3d = new THREE.Group();
            snowStorageGaugeGroup3d.position.set(9.7, 0.35, -3.45);
            var snowStorageGaugeShell3d = new THREE.Mesh(
              new THREE.CylinderGeometry(0.2, 0.2, 1.8, 18, 1, true),
              new THREE.MeshPhysicalMaterial({
                color: 0xbae6fd, transparent: true, opacity: 0.28,
                roughness: 0.2, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide
              })
            );
            snowStorageGaugeGroup3d.add(snowStorageGaugeShell3d);
            var snowStorageFillMat3d = new THREE.MeshPhysicalMaterial({
              color: 0xe0f2fe, transparent: true, opacity: 0.82,
              roughness: 0.28, emissive: 0x38bdf8, emissiveIntensity: 0.12
            });
            var snowStorageFill3d = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 1.62, 18), snowStorageFillMat3d);
            snowStorageFill3d.position.y = -0.81;
            snowStorageFill3d.scale.y = 0.001;
            snowStorageGaugeGroup3d.add(snowStorageFill3d);
            var snowStorageCap3d = new THREE.Mesh(
              new THREE.SphereGeometry(0.19, 16, 12),
              new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.9 })
            );
            snowStorageCap3d.scale.y = 0.32;
            snowStorageCap3d.position.y = -0.81;
            snowStorageGaugeGroup3d.add(snowStorageCap3d);
            for (var snowGaugeTickIndex3d = 0; snowGaugeTickIndex3d < 5; snowGaugeTickIndex3d++) {
              var snowGaugeTick3d = new THREE.Mesh(
                new THREE.BoxGeometry(0.46, 0.018, 0.035),
                new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.62 })
              );
              snowGaugeTick3d.position.set(0, -0.81 + snowGaugeTickIndex3d * 0.405, 0.04);
              snowStorageGaugeGroup3d.add(snowGaugeTick3d);
            }
            snowStorageGaugeGroup3d.visible = false;
            world3d.add(snowStorageGaugeGroup3d);

            var cloudGroup3d = new THREE.Group();
            var cloudMat3d = new THREE.MeshPhysicalMaterial({
              color: 0xe8f5ff, transparent: true, opacity: 0.8,
              roughness: 0.72, depthWrite: false
            });
            var cloudShadeMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x9eb7c8, transparent: true, opacity: 0.48,
              roughness: 0.88, depthWrite: false
            });
            for (var ci3 = 0; ci3 < 18; ci3++) {
              var puff = new THREE.Mesh(new THREE.SphereGeometry(0.52 + (ci3 % 4) * 0.12, 18, 14), Math.floor(ci3 / 6) === 0 ? cloudShadeMat3d : cloudMat3d);
              puff.position.set((ci3 % 6) * 0.72 - 1.8, Math.floor(ci3 / 6) * 0.34, (ci3 % 3) * 0.4 - 0.4);
              puff.castShadow = true;
              cloudGroup3d.add(puff);
            }
            cloudGroup3d.position.set(0.5, 3.15, -1.7);
            world3d.add(cloudGroup3d);

            var cloudMicrophysicsGroup3d = new THREE.Group();
            var cloudMicrophysicsCount3d = 54;
            var cloudMicrophysicsBase3d = new Float32Array(cloudMicrophysicsCount3d * 3);
            for (var cloudMicrophysicsSeed3d = 0; cloudMicrophysicsSeed3d < cloudMicrophysicsCount3d; cloudMicrophysicsSeed3d++) {
              cloudMicrophysicsBase3d[cloudMicrophysicsSeed3d * 3] = ((cloudMicrophysicsSeed3d * 17) % 53) / 52 * 3.8 - 1.9;
              cloudMicrophysicsBase3d[cloudMicrophysicsSeed3d * 3 + 1] = ((cloudMicrophysicsSeed3d * 23) % 47) / 46 * 1.15 - 0.25;
              cloudMicrophysicsBase3d[cloudMicrophysicsSeed3d * 3 + 2] = ((cloudMicrophysicsSeed3d * 29) % 43) / 42 * 1.3 - 0.65;
            }
            var cloudDropletGeometry3d = new THREE.BufferGeometry();
            cloudDropletGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cloudMicrophysicsBase3d), 3));
            var cloudDroplets3d = new THREE.Points(cloudDropletGeometry3d, new THREE.PointsMaterial({
              color: 0x7dd3fc, size: 0.045, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            cloudDroplets3d.renderOrder = 12;
            cloudMicrophysicsGroup3d.add(cloudDroplets3d);

            var cloudNucleusCount3d = 12;
            var cloudNucleusGeometry3d = new THREE.BufferGeometry();
            var cloudNucleusPositions3d = new Float32Array(cloudNucleusCount3d * 3);
            for (var cloudNucleusSeed3d = 0; cloudNucleusSeed3d < cloudNucleusCount3d; cloudNucleusSeed3d++) {
              var cloudNucleusSource3d = (cloudNucleusSeed3d * 5) % cloudMicrophysicsCount3d;
              cloudNucleusPositions3d[cloudNucleusSeed3d * 3] = cloudMicrophysicsBase3d[cloudNucleusSource3d * 3];
              cloudNucleusPositions3d[cloudNucleusSeed3d * 3 + 1] = cloudMicrophysicsBase3d[cloudNucleusSource3d * 3 + 1];
              cloudNucleusPositions3d[cloudNucleusSeed3d * 3 + 2] = cloudMicrophysicsBase3d[cloudNucleusSource3d * 3 + 2];
            }
            cloudNucleusGeometry3d.setAttribute('position', new THREE.BufferAttribute(cloudNucleusPositions3d, 3));
            var cloudNuclei3d = new THREE.Points(cloudNucleusGeometry3d, new THREE.PointsMaterial({
              color: 0xfbbf24, size: 0.052, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            cloudNuclei3d.renderOrder = 13;
            cloudMicrophysicsGroup3d.add(cloudNuclei3d);

            var cloudCoalescenceCount3d = 18;
            var cloudCoalescenceGeometry3d = new THREE.BufferGeometry();
            cloudCoalescenceGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cloudCoalescenceCount3d * 6), 3));
            var cloudCoalescence3d = new THREE.LineSegments(cloudCoalescenceGeometry3d, new THREE.LineBasicMaterial({
              color: 0x67e8f9, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            cloudCoalescence3d.renderOrder = 11;
            cloudMicrophysicsGroup3d.add(cloudCoalescence3d);

            var cloudIceCrystalGroup3d = new THREE.Group();
            var cloudIceCrystalMat3d = new THREE.LineBasicMaterial({
              color: 0xe0f2fe, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            });
            for (var cloudIceCrystalIndex3d = 0; cloudIceCrystalIndex3d < 8; cloudIceCrystalIndex3d++) {
              var cloudIceCrystalGeometry3d = new THREE.BufferGeometry();
              cloudIceCrystalGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
                -0.1,0,0, 0.1,0,0, 0,-0.1,0, 0,0.1,0, 0,0,-0.1, 0,0,0.1
              ]), 3));
              var cloudIceCrystal3d = new THREE.LineSegments(cloudIceCrystalGeometry3d, cloudIceCrystalMat3d);
              cloudIceCrystal3d.userData.particleIndex = (cloudIceCrystalIndex3d * 7) % cloudMicrophysicsCount3d;
              cloudIceCrystalGroup3d.add(cloudIceCrystal3d);
            }
            cloudIceCrystalGroup3d.visible = false;
            cloudMicrophysicsGroup3d.add(cloudIceCrystalGroup3d);
            cloudMicrophysicsGroup3d.visible = false;
            cloudGroup3d.add(cloudMicrophysicsGroup3d);
            var distantClouds3d = new THREE.Group();
            var distantCloudMat3d = new THREE.MeshLambertMaterial({ color: 0xb8d6e5, transparent: true, opacity: 0.28, depthWrite: false });
            for (var distantCloudIndex3d = 0; distantCloudIndex3d < 12; distantCloudIndex3d++) {
              var distantPuff3d = new THREE.Mesh(new THREE.SphereGeometry(0.7 + (distantCloudIndex3d % 3) * 0.16, 10, 8), distantCloudMat3d);
              distantPuff3d.position.set((distantCloudIndex3d % 6) * 1.05, Math.floor(distantCloudIndex3d / 6) * 0.34, (distantCloudIndex3d % 2) * 0.45);
              distantClouds3d.add(distantPuff3d);
            }
            distantClouds3d.position.set(-8.5, 5.1, -9.5);
            world3d.add(distantClouds3d);

            var cloudShadowMat3d = new THREE.ShaderMaterial({
              transparent: true, depthWrite: false,
              uniforms: { shadowOpacity: { value: 0 } },
              vertexShader: 'varying vec2 vUv;\nvoid main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
              fragmentShader: 'uniform float shadowOpacity; varying vec2 vUv;\nvoid main(){ float d=length((vUv-0.5)*2.0); float a=(1.0-smoothstep(0.16,1.0,d))*shadowOpacity; gl_FragColor=vec4(0.025,0.08,0.11,a); }'
            });
            var cloudShadow3d = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.8), cloudShadowMat3d);
            cloudShadow3d.rotation.x = -Math.PI / 2;
            cloudShadow3d.position.set(0.5, -0.965, -1.7);
            cloudShadow3d.renderOrder = 2;
            world3d.add(cloudShadow3d);

            var rainbowGroup3d = new THREE.Group();
            var rainbowColors3d = [0xf87171, 0xfb923c, 0xfacc15, 0x4ade80, 0x38bdf8, 0x818cf8, 0xc084fc];
            rainbowColors3d.forEach(function(rainbowColor3d, rainbowIndex3d) {
              var rainbowArc3d = new THREE.Mesh(
                new THREE.TorusGeometry(3.5 - rainbowIndex3d * 0.075, 0.038, 6, 96, Math.PI),
                new THREE.MeshBasicMaterial({
                  color: rainbowColor3d, transparent: true, opacity: 0,
                  depthWrite: false, side: THREE.DoubleSide
                })
              );
              rainbowArc3d.renderOrder = 1;
              rainbowGroup3d.add(rainbowArc3d);
            });
            rainbowGroup3d.position.set(1.2, -0.98, -4.6);
            rainbowGroup3d.visible = false;
            world3d.add(rainbowGroup3d);

            var plant3d = new THREE.Group();
            var trunk3d = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.24, 2.5, 12),
              new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 })
            );
            trunk3d.position.y = 0.2;
            trunk3d.castShadow = true;
            plant3d.add(trunk3d);
            var leafMat3d = new THREE.MeshStandardMaterial({ color: 0x22a45a, roughness: 0.75 });
            for (var li3 = 0; li3 < 7; li3++) {
              var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), leafMat3d);
              leaf.scale.set(1.15, 0.78, 0.9);
              leaf.position.set(Math.cos(li3 * 0.9) * 0.72, 1.35 + (li3 % 3) * 0.32, Math.sin(li3 * 0.9) * 0.55);
              leaf.castShadow = true;
              plant3d.add(leaf);
            }
            plant3d.position.set(5.9, -1.0, 1.25);
            world3d.add(plant3d);

            var plantRootGroup3d = new THREE.Group();
            var plantRootMat3d = new THREE.MeshStandardMaterial({
              color: 0x7ddf9b, emissive: 0x166534, emissiveIntensity: 0.18,
              roughness: 0.72, transparent: true, opacity: 0.34, depthWrite: false
            });
            var plantRootCurves3d = [
              [[4.85,-2.05,0.72],[5.25,-1.68,0.92],[5.68,-1.25,1.14],[5.9,-0.96,1.25]],
              [[5.2,-2.18,1.72],[5.42,-1.72,1.5],[5.72,-1.25,1.32],[5.9,-0.96,1.25]],
              [[6.65,-1.95,0.78],[6.35,-1.62,0.96],[6.08,-1.2,1.16],[5.9,-0.96,1.25]],
              [[6.7,-1.78,1.75],[6.36,-1.55,1.58],[6.08,-1.18,1.36],[5.9,-0.96,1.25]]
            ].map(function(rootPoints3d) {
              var rootCurve3d = makeJourneyCurve3d(rootPoints3d, false);
              plantRootGroup3d.add(new THREE.Mesh(
                new THREE.TubeGeometry(rootCurve3d, 28, 0.026, 6, false),
                plantRootMat3d
              ));
              return rootCurve3d;
            });
            var plantRootPulseGroup3d = new THREE.Group();
            var plantRootPulseMat3d = new THREE.MeshBasicMaterial({
              color: 0x86efac, transparent: true, opacity: 0.88,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            for (var rootPulseIndex3d = 0; rootPulseIndex3d < 8; rootPulseIndex3d++) {
              var rootPulse3d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), plantRootPulseMat3d);
              rootPulse3d.userData.curveIndex = rootPulseIndex3d % plantRootCurves3d.length;
              rootPulse3d.userData.phase = rootPulseIndex3d / 8;
              plantRootPulseGroup3d.add(rootPulse3d);
            }
            plantRootPulseGroup3d.visible = false;
            plantRootGroup3d.add(plantRootPulseGroup3d);
            world3d.add(plantRootGroup3d);

            var xylemFlowMat3d = new THREE.MeshBasicMaterial({
              color: 0x67e8f9, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var xylemFlowGroup3d = new THREE.Group();
            var xylemFlowCurves3d = [
              [[5.9,-0.96,1.25],[5.9,-0.25,1.25],[5.95,0.35,1.3],[6.35,0.67,1.68]],
              [[5.9,-0.96,1.25],[5.88,-0.18,1.28],[5.82,0.55,1.45],[5.74,0.99,1.79]],
              [[5.9,-0.96,1.25],[5.82,-0.2,1.2],[5.55,0.35,1.08],[5.25,0.67,1.0]],
              [[5.9,-0.96,1.25],[5.96,-0.18,1.2],[6.18,0.18,1.02],[6.36,0.35,0.83]]
            ].map(function(xylemPoints3d) {
              var xylemCurve3d = makeJourneyCurve3d(xylemPoints3d, false);
              var xylemChannel3d = new THREE.Mesh(new THREE.TubeGeometry(xylemCurve3d, 34, 0.018, 5, false), xylemFlowMat3d);
              xylemChannel3d.visible = false;
              xylemFlowGroup3d.add(xylemChannel3d);
              return xylemCurve3d;
            });
            var xylemMarkerCount3d = 20;
            var xylemMarkerGeometry3d = new THREE.BufferGeometry();
            xylemMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(xylemMarkerCount3d * 3), 3));
            var xylemMarkers3d = new THREE.Points(xylemMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xd1fae5, size: 0.065, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            xylemFlowGroup3d.add(xylemMarkers3d);
            xylemFlowGroup3d.visible = false;
            world3d.add(xylemFlowGroup3d);

            var stomatalReleaseOrigins3d = xylemFlowCurves3d.map(function(xylemCurve3d) { return xylemCurve3d.getPointAt(1); });
            var stomatalReleaseMat3d = new THREE.MeshBasicMaterial({
              color: 0x99f6e4, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var stomatalReleaseGroup3d = new THREE.Group();
            stomatalReleaseOrigins3d.forEach(function(stomatalOrigin3d) {
              var stomatalRing3d = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 34), stomatalReleaseMat3d);
              stomatalRing3d.position.copy(stomatalOrigin3d);
              stomatalReleaseGroup3d.add(stomatalRing3d);
            });
            stomatalReleaseGroup3d.visible = false;
            world3d.add(stomatalReleaseGroup3d);

            var stomatalVaporCount3d = 28;
            var stomatalVaporGeometry3d = new THREE.BufferGeometry();
            stomatalVaporGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(stomatalVaporCount3d * 3), 3));
            var stomatalVapor3d = new THREE.Points(stomatalVaporGeometry3d, new THREE.PointsMaterial({
              color: 0xccfbf1, size: 0.072, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            stomatalVapor3d.visible = false;
            world3d.add(stomatalVapor3d);

            var forestGroup3d = new THREE.Group();
            var miniTrunkGeometry3d = new THREE.CylinderGeometry(0.07, 0.1, 0.55, 7);
            var miniCrownGeometry3d = new THREE.ConeGeometry(0.34, 0.9, 8);
            var miniTrunkMat3d = new THREE.MeshStandardMaterial({ color: 0x69452d, roughness: 1 });
            var miniCrownMat3d = new THREE.MeshStandardMaterial({ color: 0x1f7a4d, roughness: 0.82 });
            for (var treeIndex3d = 0; treeIndex3d < 8; treeIndex3d++) {
              var miniTree3d = new THREE.Group();
              var miniTrunk3d = new THREE.Mesh(miniTrunkGeometry3d, miniTrunkMat3d);
              miniTrunk3d.position.y = 0.27;
              var miniCrown3d = new THREE.Mesh(miniCrownGeometry3d, miniCrownMat3d);
              miniCrown3d.position.y = 0.92;
              miniCrown3d.castShadow = true;
              miniTree3d.add(miniTrunk3d, miniCrown3d);
              miniTree3d.position.set(2.0 + (treeIndex3d % 4) * 1.45, 0, -1.8 + Math.floor(treeIndex3d / 4) * 2.45);
              miniTree3d.scale.setScalar(0.82 + (treeIndex3d % 3) * 0.12);
              forestGroup3d.add(miniTree3d);
            }
            forestGroup3d.position.y = -1.01;
            forestGroup3d.visible = false;
            world3d.add(forestGroup3d);

            var canopyInterceptionGroup3d = new THREE.Group();
            var canopyBeadCount3d = 32;
            var canopyBeadOrigins3d = new Float32Array(canopyBeadCount3d * 3);
            for (var canopyBeadSeedIndex3d = 0; canopyBeadSeedIndex3d < canopyBeadCount3d; canopyBeadSeedIndex3d++) {
              var canopyBeadTreeIndex3d = canopyBeadSeedIndex3d % 8;
              var canopyBeadTreeScale3d = 0.82 + (canopyBeadTreeIndex3d % 3) * 0.12;
              var canopyBeadAngle3d = canopyBeadSeedIndex3d * 2.399963;
              canopyBeadOrigins3d[canopyBeadSeedIndex3d * 3] = 2 + (canopyBeadTreeIndex3d % 4) * 1.45 + Math.cos(canopyBeadAngle3d) * 0.2 * canopyBeadTreeScale3d;
              canopyBeadOrigins3d[canopyBeadSeedIndex3d * 3 + 1] = -1.01 + 0.92 * canopyBeadTreeScale3d + Math.sin(canopyBeadSeedIndex3d * 1.7) * 0.14;
              canopyBeadOrigins3d[canopyBeadSeedIndex3d * 3 + 2] = -1.8 + Math.floor(canopyBeadTreeIndex3d / 4) * 2.45 + Math.sin(canopyBeadAngle3d) * 0.2 * canopyBeadTreeScale3d;
            }
            var canopyBeadGeometry3d = new THREE.BufferGeometry();
            canopyBeadGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(canopyBeadOrigins3d), 3));
            var canopyBeads3d = new THREE.Points(canopyBeadGeometry3d, new THREE.PointsMaterial({
              color: 0x7dd3fc, size: 0.085, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            canopyInterceptionGroup3d.add(canopyBeads3d);
            var canopyThroughfallCount3d = 28;
            var canopyThroughfallGeometry3d = new THREE.BufferGeometry();
            canopyThroughfallGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(canopyThroughfallCount3d * 3), 3));
            var canopyThroughfall3d = new THREE.Points(canopyThroughfallGeometry3d, new THREE.PointsMaterial({
              color: 0x38bdf8, size: 0.07, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            canopyInterceptionGroup3d.add(canopyThroughfall3d);
            var canopyEvaporationCount3d = 24;
            var canopyEvaporationGeometry3d = new THREE.BufferGeometry();
            canopyEvaporationGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(canopyEvaporationCount3d * 3), 3));
            var canopyEvaporation3d = new THREE.Points(canopyEvaporationGeometry3d, new THREE.PointsMaterial({
              color: 0xccfbf1, size: 0.065, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            canopyInterceptionGroup3d.add(canopyEvaporation3d);
            canopyInterceptionGroup3d.visible = false;
            world3d.add(canopyInterceptionGroup3d);

            var urbanGroup3d = new THREE.Group();
            var buildingMat3d = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.08 });
            var roofMat3d = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
            for (var buildingIndex3d = 0; buildingIndex3d < 7; buildingIndex3d++) {
              var buildingHeight3d = 0.7 + (buildingIndex3d % 4) * 0.28;
              var building3d = new THREE.Mesh(new THREE.BoxGeometry(0.72, buildingHeight3d, 0.72), buildingMat3d);
              building3d.position.set(2.05 + (buildingIndex3d % 4) * 1.5, buildingHeight3d / 2, -1.85 + Math.floor(buildingIndex3d / 4) * 2.55);
              building3d.castShadow = true;
              building3d.receiveShadow = true;
              urbanGroup3d.add(building3d);
              var roof3d = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), roofMat3d);
              roof3d.position.copy(building3d.position);
              roof3d.position.y = buildingHeight3d + 0.04;
              urbanGroup3d.add(roof3d);
            }
            urbanGroup3d.position.y = -1.0;
            urbanGroup3d.visible = false;
            world3d.add(urbanGroup3d);

            var urbanStormwaterGroup3d = new THREE.Group();
            var urbanRoofRunoffCount3d = 28;
            var urbanRoofRunoffOrigins3d = new Float32Array(urbanRoofRunoffCount3d * 3);
            for (var urbanRoofDropIndex3d = 0; urbanRoofDropIndex3d < urbanRoofRunoffCount3d; urbanRoofDropIndex3d++) {
              var urbanRoofBuildingIndex3d = urbanRoofDropIndex3d % 7;
              var urbanRoofBuildingHeight3d = 0.7 + (urbanRoofBuildingIndex3d % 4) * 0.28;
              var urbanRoofEdgeAngle3d = urbanRoofDropIndex3d * Math.PI * 0.5;
              urbanRoofRunoffOrigins3d[urbanRoofDropIndex3d * 3] = 2.05 + (urbanRoofBuildingIndex3d % 4) * 1.5 + Math.cos(urbanRoofEdgeAngle3d) * 0.34;
              urbanRoofRunoffOrigins3d[urbanRoofDropIndex3d * 3 + 1] = -0.92 + urbanRoofBuildingHeight3d;
              urbanRoofRunoffOrigins3d[urbanRoofDropIndex3d * 3 + 2] = -1.85 + Math.floor(urbanRoofBuildingIndex3d / 4) * 2.55 + Math.sin(urbanRoofEdgeAngle3d) * 0.34;
            }
            var urbanRoofRunoffGeometry3d = new THREE.BufferGeometry();
            urbanRoofRunoffGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(urbanRoofRunoffOrigins3d), 3));
            var urbanRoofRunoff3d = new THREE.Points(urbanRoofRunoffGeometry3d, new THREE.PointsMaterial({
              color: 0x7dd3fc, size: 0.072, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            urbanStormwaterGroup3d.add(urbanRoofRunoff3d);
            var urbanStormwaterCurves3d = [
              makeJourneyCurve3d([[1.7, -0.95, -2.05], [2.6, -0.96, -1.55], [3.45, -0.96, -0.85], [4.3, -0.955, -0.2]]),
              makeJourneyCurve3d([[6.7, -0.95, -1.9], [5.9, -0.96, -1.25], [5.1, -0.96, -0.65], [4.3, -0.955, -0.2]]),
              makeJourneyCurve3d([[3.1, -0.95, 0.9], [3.55, -0.96, 0.55], [3.95, -0.96, 0.12], [4.3, -0.955, -0.2]])
            ];
            var urbanStormwaterMaterial3d = new THREE.MeshBasicMaterial({
              color: 0x38bdf8, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            for (var urbanChannelIndex3d = 0; urbanChannelIndex3d < urbanStormwaterCurves3d.length; urbanChannelIndex3d++) {
              urbanStormwaterGroup3d.add(new THREE.Mesh(
                new THREE.TubeGeometry(urbanStormwaterCurves3d[urbanChannelIndex3d], 32, 0.018, 5, false),
                urbanStormwaterMaterial3d
              ));
            }
            var urbanStormDrain3d = new THREE.Mesh(
              new THREE.TorusGeometry(0.24, 0.035, 7, 32),
              new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.82 })
            );
            urbanStormDrain3d.rotation.x = Math.PI / 2;
            urbanStormDrain3d.position.set(4.3, -0.93, -0.2);
            urbanStormwaterGroup3d.add(urbanStormDrain3d);
            var urbanStormOutletCurve3d = makeJourneyCurve3d([
              [4.3, -0.96, -0.2], [3.7, -1.02, 0.25], [2.8, -1.04, 0.78], [1.8, -1.03, 1.12], [1.15, -1.0, 1.32]
            ]);
            urbanStormwaterCurves3d.push(urbanStormOutletCurve3d);
            urbanStormwaterGroup3d.add(new THREE.Mesh(
              new THREE.TubeGeometry(urbanStormOutletCurve3d, 40, 0.024, 6, false),
              urbanStormwaterMaterial3d
            ));
            var urbanStormMarkerCount3d = 32;
            var urbanStormMarkerGeometry3d = new THREE.BufferGeometry();
            urbanStormMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(urbanStormMarkerCount3d * 3), 3));
            var urbanStormMarkers3d = new THREE.Points(urbanStormMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0xbae6fd, size: 0.065, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            urbanStormwaterGroup3d.add(urbanStormMarkers3d);
            urbanStormwaterGroup3d.visible = false;
            world3d.add(urbanStormwaterGroup3d);

            var meadowGroup3d = new THREE.Group();
            var meadowMat3d = new THREE.MeshStandardMaterial({ color: 0x6da94d, roughness: 0.9 });
            var meadowGeometry3d = new THREE.ConeGeometry(0.07, 0.34, 5);
            for (var meadowIndex3d = 0; meadowIndex3d < 18; meadowIndex3d++) {
              var meadowTuft3d = new THREE.Mesh(meadowGeometry3d, meadowMat3d);
              meadowTuft3d.position.set(1.35 + (meadowIndex3d % 6) * 1.14, 0.17, -2.2 + Math.floor(meadowIndex3d / 6) * 1.72);
              meadowTuft3d.rotation.z = ((meadowIndex3d % 3) - 1) * 0.12;
              meadowGroup3d.add(meadowTuft3d);
            }
            meadowGroup3d.position.y = -1.0;
            world3d.add(meadowGroup3d);

            var meadowHydrologyGroup3d = new THREE.Group();
            var meadowRetentionBeadCount3d = 36;
            var meadowRetentionBeadOrigins3d = new Float32Array(meadowRetentionBeadCount3d * 3);
            for (var meadowBeadIndex3d = 0; meadowBeadIndex3d < meadowRetentionBeadCount3d; meadowBeadIndex3d++) {
              var meadowBeadTuftIndex3d = meadowBeadIndex3d % 18;
              var meadowBeadSide3d = meadowBeadIndex3d < 18 ? -1 : 1;
              meadowRetentionBeadOrigins3d[meadowBeadIndex3d * 3] =
                1.35 + (meadowBeadTuftIndex3d % 6) * 1.14 + meadowBeadSide3d * 0.045;
              meadowRetentionBeadOrigins3d[meadowBeadIndex3d * 3 + 1] =
                -0.66 + (meadowBeadTuftIndex3d % 3) * 0.018;
              meadowRetentionBeadOrigins3d[meadowBeadIndex3d * 3 + 2] =
                -2.2 + Math.floor(meadowBeadTuftIndex3d / 6) * 1.72 + meadowBeadSide3d * 0.025;
            }
            var meadowRetentionBeadGeometry3d = new THREE.BufferGeometry();
            meadowRetentionBeadGeometry3d.setAttribute('position',
              new THREE.BufferAttribute(new Float32Array(meadowRetentionBeadOrigins3d), 3));
            var meadowRetentionBeads3d = new THREE.Points(meadowRetentionBeadGeometry3d, new THREE.PointsMaterial({
              color: 0x99f6e4, size: 0.075, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            meadowHydrologyGroup3d.add(meadowRetentionBeads3d);
            var meadowInfiltrationCurves3d = [];
            var meadowInfiltrationMaterial3d = new THREE.MeshBasicMaterial({
              color: 0x22d3ee, transparent: true, opacity: 0,
              depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
            });
            for (var meadowInfiltrationCurveIndex3d = 0; meadowInfiltrationCurveIndex3d < 6; meadowInfiltrationCurveIndex3d++) {
              var meadowInfiltrationX3d = 1.45 + meadowInfiltrationCurveIndex3d * 1.12;
              var meadowInfiltrationZ3d = -1.85 + (meadowInfiltrationCurveIndex3d % 3) * 1.36;
              var meadowInfiltrationCurve3d = makeJourneyCurve3d([
                [meadowInfiltrationX3d, -0.96, meadowInfiltrationZ3d],
                [meadowInfiltrationX3d + 0.08, -1.18, meadowInfiltrationZ3d + 0.05],
                [meadowInfiltrationX3d - 0.06, -1.5, meadowInfiltrationZ3d - 0.04],
                [meadowInfiltrationX3d + 0.04, -1.82, meadowInfiltrationZ3d + 0.06]
              ]);
              meadowInfiltrationCurves3d.push(meadowInfiltrationCurve3d);
              meadowHydrologyGroup3d.add(new THREE.Mesh(
                new THREE.TubeGeometry(meadowInfiltrationCurve3d, 24, 0.012, 5, false),
                meadowInfiltrationMaterial3d
              ));
            }
            var meadowInfiltrationMarkerCount3d = 30;
            var meadowInfiltrationMarkerGeometry3d = new THREE.BufferGeometry();
            meadowInfiltrationMarkerGeometry3d.setAttribute('position',
              new THREE.BufferAttribute(new Float32Array(meadowInfiltrationMarkerCount3d * 3), 3));
            var meadowInfiltrationMarkers3d = new THREE.Points(meadowInfiltrationMarkerGeometry3d, new THREE.PointsMaterial({
              color: 0x67e8f9, size: 0.06, transparent: true, opacity: 0,
              depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
            }));
            meadowHydrologyGroup3d.add(meadowInfiltrationMarkers3d);
            meadowHydrologyGroup3d.visible = false;
            world3d.add(meadowHydrologyGroup3d);

            function makePoints3d(count, color, size, spreadX, spreadY, spreadZ) {
              var positions = new Float32Array(count * 3);
              for (var pi3 = 0; pi3 < count; pi3++) {
                positions[pi3 * 3] = (Math.random() - 0.5) * spreadX;
                positions[pi3 * 3 + 1] = (Math.random() - 0.5) * spreadY;
                positions[pi3 * 3 + 2] = (Math.random() - 0.5) * spreadZ;
              }
              var geometry = new THREE.BufferGeometry();
              geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              return new THREE.Points(geometry, new THREE.PointsMaterial({
                color: color, size: size, transparent: true, opacity: 0.78, depthWrite: false,
                blending: THREE.AdditiveBlending
              }));
            }

            var vapor3d = makePoints3d(90, 0x9ee7ff, 0.095, 5.5, 4.5, 3.2);
            vapor3d.position.set(-2.1, 0.8, 1.0);
            world3d.add(vapor3d);
            var vaporBasePositions3d = new Float32Array(vapor3d.geometry.attributes.position.array);

            var evaporationInterfaceGroup3d = new THREE.Group();
            var evaporationMoleculeCount3d = 48;
            var evaporationMoleculeSeeds3d = new Float32Array(evaporationMoleculeCount3d * 4);
            var evaporationMoleculeGeometry3d = new THREE.BufferGeometry();
            evaporationMoleculeGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(evaporationMoleculeCount3d * 3), 3));
            for (var evaporationMoleculeSeedIndex3d = 0; evaporationMoleculeSeedIndex3d < evaporationMoleculeCount3d; evaporationMoleculeSeedIndex3d++) {
              evaporationMoleculeSeeds3d[evaporationMoleculeSeedIndex3d * 4] = -3 + (((evaporationMoleculeSeedIndex3d * 19) % 47) / 46 - 0.5) * 2.2;
              evaporationMoleculeSeeds3d[evaporationMoleculeSeedIndex3d * 4 + 1] = 1.6 + (((evaporationMoleculeSeedIndex3d * 31) % 43) / 42 - 0.5) * 2;
              evaporationMoleculeSeeds3d[evaporationMoleculeSeedIndex3d * 4 + 2] = (evaporationMoleculeSeedIndex3d * 0.61803398875) % 1;
              evaporationMoleculeSeeds3d[evaporationMoleculeSeedIndex3d * 4 + 3] = ((evaporationMoleculeSeedIndex3d * 13) % 37) / 36;
            }
            var evaporationMolecules3d = new THREE.Points(evaporationMoleculeGeometry3d, new THREE.PointsMaterial({
              color: 0x9ee7ff, size: 0.07, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            evaporationInterfaceGroup3d.add(evaporationMolecules3d);

            var evaporationCoolingMat3d = new THREE.MeshBasicMaterial({
              color: 0x075985, transparent: true, opacity: 0,
              side: THREE.DoubleSide, depthWrite: false
            });
            var evaporationCoolingPatch3d = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), evaporationCoolingMat3d);
            evaporationCoolingPatch3d.rotation.x = -Math.PI / 2;
            evaporationCoolingPatch3d.position.set(-3, -1.085, 1.6);
            evaporationCoolingPatch3d.scale.set(1.65, 0.86, 1);
            evaporationInterfaceGroup3d.add(evaporationCoolingPatch3d);

            var evaporationHeatRingGroup3d = new THREE.Group();
            for (var evaporationHeatRingIndex3d = 0; evaporationHeatRingIndex3d < 3; evaporationHeatRingIndex3d++) {
              var evaporationHeatRing3d = new THREE.Mesh(
                new THREE.TorusGeometry(0.58, 0.02, 6, 48),
                new THREE.MeshBasicMaterial({
                  color: 0xfde68a, transparent: true, opacity: 0,
                  depthWrite: false, blending: THREE.AdditiveBlending
                })
              );
              evaporationHeatRing3d.rotation.x = Math.PI / 2;
              evaporationHeatRing3d.userData.phase = evaporationHeatRingIndex3d / 3;
              evaporationHeatRingGroup3d.add(evaporationHeatRing3d);
            }
            evaporationInterfaceGroup3d.add(evaporationHeatRingGroup3d);
            evaporationInterfaceGroup3d.visible = false;
            world3d.add(evaporationInterfaceGroup3d);

            var rain3d = makePoints3d(120, 0x69d7ff, 0.075, 5.2, 5.5, 2.6);
            rain3d.position.set(1.2, 0.75, -0.8);
            world3d.add(rain3d);
            var rainBasePositions3d = new Float32Array(rain3d.geometry.attributes.position.array);

            var rainCurtainCount3d = 72;
            var rainCurtainSeeds3d = new Float32Array(rainCurtainCount3d * 3);
            for (var rainCurtainSeedIndex3d = 0; rainCurtainSeedIndex3d < rainCurtainCount3d; rainCurtainSeedIndex3d++) {
              rainCurtainSeeds3d[rainCurtainSeedIndex3d * 3] = ((rainCurtainSeedIndex3d * 37) % 71) / 70 * 5.2 - 2.6;
              rainCurtainSeeds3d[rainCurtainSeedIndex3d * 3 + 1] = ((rainCurtainSeedIndex3d * 53) % 67) / 66 * 2.6 - 1.3;
              rainCurtainSeeds3d[rainCurtainSeedIndex3d * 3 + 2] = ((rainCurtainSeedIndex3d * 29) % 73) / 73;
            }
            var rainCurtainGeometry3d = new THREE.BufferGeometry();
            rainCurtainGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rainCurtainCount3d * 6), 3));
            var rainCurtain3d = new THREE.LineSegments(rainCurtainGeometry3d, new THREE.LineBasicMaterial({
              color: 0x9ee7ff, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            rainCurtain3d.position.set(1.2, 0.75, -0.8);
            rainCurtain3d.visible = false;
            world3d.add(rainCurtain3d);

            var rainImpactCount3d = 40;
            var rainImpactSeeds3d = new Float32Array(rainImpactCount3d * 3);
            for (var rainImpactSeedIndex3d = 0; rainImpactSeedIndex3d < rainImpactCount3d; rainImpactSeedIndex3d++) {
              rainImpactSeeds3d[rainImpactSeedIndex3d * 3] = ((rainImpactSeedIndex3d * 31) % 41) / 40 * 5.0 - 2.5;
              rainImpactSeeds3d[rainImpactSeedIndex3d * 3 + 1] = ((rainImpactSeedIndex3d * 23) % 37) / 36 * 2.4 - 1.2;
              rainImpactSeeds3d[rainImpactSeedIndex3d * 3 + 2] = ((rainImpactSeedIndex3d * 17) % 43) / 43;
            }
            var rainImpactGeometry3d = new THREE.BufferGeometry();
            rainImpactGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rainImpactCount3d * 3), 3));
            var rainImpactMist3d = new THREE.Points(rainImpactGeometry3d, new THREE.PointsMaterial({
              color: 0xcffafe, size: 0.06, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            rainImpactMist3d.position.set(1.2, 0, -0.8);
            rainImpactMist3d.visible = false;
            world3d.add(rainImpactMist3d);

            var percolationCount3d = 42;
            var percolationPositions3d = new Float32Array(percolationCount3d * 3);
            for (var percolationIndex3d = 0; percolationIndex3d < percolationCount3d; percolationIndex3d++) {
              var percolationColumn3d = percolationIndex3d % 7;
              var percolationRow3d = Math.floor(percolationIndex3d / 7);
              percolationPositions3d[percolationIndex3d * 3] = 2.0 + percolationColumn3d * 0.72 + Math.sin(percolationIndex3d * 1.7) * 0.12;
              percolationPositions3d[percolationIndex3d * 3 + 1] = -1.04 - (percolationIndex3d % 6) * 0.2;
              percolationPositions3d[percolationIndex3d * 3 + 2] = -2.45 + percolationRow3d * 0.72 + Math.cos(percolationIndex3d * 1.3) * 0.1;
            }
            var percolationGeometry3d = new THREE.BufferGeometry();
            percolationGeometry3d.setAttribute('position', new THREE.BufferAttribute(percolationPositions3d, 3));
            var soilPercolation3d = new THREE.Points(percolationGeometry3d, new THREE.PointsMaterial({
              color: 0x7dd3fc, size: 0.075, transparent: true, opacity: 0.62,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            soilPercolation3d.visible = false;
            world3d.add(soilPercolation3d);

            var windStreams3d = new THREE.Group();
            var windStreamMat3d = new THREE.LineBasicMaterial({
              color: 0xbdeeff, transparent: true, opacity: 0.18,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var windStreamCurves3d = [];
            for (var windLaneIndex3d = 0; windLaneIndex3d < 4; windLaneIndex3d++) {
              var windLaneY3d = 1.2 + windLaneIndex3d * 0.62;
              var windCurve3d = makeJourneyCurve3d([
                [-5.2,windLaneY3d,1.8-windLaneIndex3d*0.45],
                [-2.4,windLaneY3d+0.22,-0.1-windLaneIndex3d*0.35],
                [0.7,windLaneY3d-0.1,-1.2-windLaneIndex3d*0.28],
                [4.0,windLaneY3d+0.2,-0.7-windLaneIndex3d*0.2],
                [7.4,windLaneY3d,0.4-windLaneIndex3d*0.15]
              ], false);
              windStreamCurves3d.push(windCurve3d);
              windStreams3d.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(windCurve3d.getPoints(52)),
                windStreamMat3d
              ));
            }
            var windMarkerCount3d = 20;
            var windMarkerGeometry3d = new THREE.BufferGeometry();
            windMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(windMarkerCount3d * 3), 3));
            var windMarkers3d = new THREE.Points(
              windMarkerGeometry3d,
              new THREE.PointsMaterial({ color: 0xe0f7ff, size: 0.07, transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending })
            );
            windStreams3d.add(windMarkers3d);
            var windArrowGroup3d = new THREE.Group();
            var windArrows3d = [];
            var windArrowUp3d = new THREE.Vector3(0, 1, 0);
            var windArrowMat3d = new THREE.MeshBasicMaterial({
              color: 0xe0f7ff, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            for (var windArrowIndex3d = 0; windArrowIndex3d < 12; windArrowIndex3d++) {
              var windArrow3d = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), windArrowMat3d);
              windArrow3d.renderOrder = 8;
              windArrowGroup3d.add(windArrow3d);
              windArrows3d.push(windArrow3d);
            }
            windStreams3d.add(windArrowGroup3d);
            windStreams3d.visible = false;
            world3d.add(windStreams3d);

            var orographicLiftGroup3d = new THREE.Group();
            var orographicLiftCurves3d = [];
            var orographicLiftMat3d = new THREE.LineBasicMaterial({
              color: 0xc4b5fd, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            for (var orographicLaneIndex3d = 0; orographicLaneIndex3d < 3; orographicLaneIndex3d++) {
              var orographicLaneOffset3d = (orographicLaneIndex3d - 1) * 0.34;
              var orographicCurve3d = makeJourneyCurve3d([
                [1.2, 1.0 + orographicLaneIndex3d * 0.16, -3.45 + orographicLaneOffset3d],
                [3.5, 1.55 + orographicLaneIndex3d * 0.14, -3.35 + orographicLaneOffset3d],
                [5.5, 3.35 + orographicLaneIndex3d * 0.12, -3.45 + orographicLaneOffset3d],
                [7.2, 4.05 + orographicLaneIndex3d * 0.1, -3.5 + orographicLaneOffset3d],
                [9.6, 2.15 + orographicLaneIndex3d * 0.08, -3.4 + orographicLaneOffset3d]
              ], false);
              orographicLiftCurves3d.push(orographicCurve3d);
              orographicLiftGroup3d.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(orographicCurve3d.getPoints(48)), orographicLiftMat3d
              ));
            }
            var orographicArrowMat3d = new THREE.MeshBasicMaterial({
              color: 0xddd6fe, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var orographicArrows3d = [];
            for (var orographicArrowIndex3d = 0; orographicArrowIndex3d < 9; orographicArrowIndex3d++) {
              var orographicArrow3d = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.23, 8), orographicArrowMat3d);
              orographicLiftGroup3d.add(orographicArrow3d);
              orographicArrows3d.push(orographicArrow3d);
            }
            var mountainPrecipitationCount3d = 42;
            var mountainPrecipitationSeeds3d = new Float32Array(mountainPrecipitationCount3d * 4);
            for (var mountainPrecipitationSeedIndex3d = 0; mountainPrecipitationSeedIndex3d < mountainPrecipitationCount3d; mountainPrecipitationSeedIndex3d++) {
              mountainPrecipitationSeeds3d[mountainPrecipitationSeedIndex3d * 4] = 3.35 + ((mountainPrecipitationSeedIndex3d * 19) % 41) / 40 * 3.7;
              mountainPrecipitationSeeds3d[mountainPrecipitationSeedIndex3d * 4 + 1] = -3.85 + ((mountainPrecipitationSeedIndex3d * 23) % 37) / 36 * 1.35;
              mountainPrecipitationSeeds3d[mountainPrecipitationSeedIndex3d * 4 + 2] = ((mountainPrecipitationSeedIndex3d * 29) % 43) / 42;
              mountainPrecipitationSeeds3d[mountainPrecipitationSeedIndex3d * 4 + 3] = 0.72 + ((mountainPrecipitationSeedIndex3d * 31) % 17) / 16 * 0.48;
            }
            var mountainPrecipitationGeometry3d = new THREE.BufferGeometry();
            mountainPrecipitationGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mountainPrecipitationCount3d * 3), 3));
            var mountainPrecipitation3d = new THREE.Points(mountainPrecipitationGeometry3d, new THREE.PointsMaterial({
              color: 0x93c5fd, size: 0.075, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            orographicLiftGroup3d.add(mountainPrecipitation3d);
            orographicLiftGroup3d.visible = false;
            world3d.add(orographicLiftGroup3d);

            var rainShadowGroup3d = new THREE.Group();
            var rainShadowGroundMat3d = new THREE.MeshBasicMaterial({
              color: 0xb7793f, transparent: true, opacity: 0,
              depthWrite: false, side: THREE.DoubleSide
            });
            var rainShadowGround3d = new THREE.Mesh(new THREE.CircleGeometry(1, 40), rainShadowGroundMat3d);
            rainShadowGround3d.rotation.x = -Math.PI / 2;
            rainShadowGround3d.position.set(8.5, -0.972, -2.25);
            rainShadowGround3d.scale.set(0.72, 1.28, 1);
            rainShadowGroup3d.add(rainShadowGround3d);
            var rainShadowCrackMat3d = new THREE.LineBasicMaterial({ color: 0x7c4a24, transparent: true, opacity: 0 });
            var rainShadowCracks3d = new THREE.LineSegments(
              new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([
                -0.52,0.015,-0.18, -0.14,0.015,0.02, -0.14,0.015,0.02, 0.16,0.015,-0.24,
                -0.14,0.015,0.02, 0.2,0.015,0.26, 0.2,0.015,0.26, 0.52,0.015,0.08,
                -0.28,0.015,0.34, -0.04,0.015,0.12, 0.18,0.015,-0.35, 0.36,0.015,-0.52
              ], 3)),
              rainShadowCrackMat3d
            );
            rainShadowCracks3d.position.copy(rainShadowGround3d.position);
            rainShadowGroup3d.add(rainShadowCracks3d);
            var rainShadowHazeCount3d = 24;
            var rainShadowHazeSeeds3d = new Float32Array(rainShadowHazeCount3d * 3);
            for (var rainShadowHazeSeedIndex3d = 0; rainShadowHazeSeedIndex3d < rainShadowHazeCount3d; rainShadowHazeSeedIndex3d++) {
              rainShadowHazeSeeds3d[rainShadowHazeSeedIndex3d * 3] = ((rainShadowHazeSeedIndex3d * 17) % 23) / 22 * 1.2 - 0.6;
              rainShadowHazeSeeds3d[rainShadowHazeSeedIndex3d * 3 + 1] = ((rainShadowHazeSeedIndex3d * 19) % 29) / 28 * 1.1 - 0.55;
              rainShadowHazeSeeds3d[rainShadowHazeSeedIndex3d * 3 + 2] = ((rainShadowHazeSeedIndex3d * 13) % 31) / 30;
            }
            var rainShadowHazeGeometry3d = new THREE.BufferGeometry();
            rainShadowHazeGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rainShadowHazeCount3d * 3), 3));
            var rainShadowHaze3d = new THREE.Points(rainShadowHazeGeometry3d, new THREE.PointsMaterial({
              color: 0xfbbf72, size: 0.075, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            }));
            rainShadowGroup3d.add(rainShadowHaze3d);
            var rainShadowArrowMat3d = new THREE.MeshBasicMaterial({
              color: 0xf6c177, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var rainShadowArrows3d = [];
            for (var rainShadowArrowIndex3d = 0; rainShadowArrowIndex3d < 6; rainShadowArrowIndex3d++) {
              var rainShadowArrow3d = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), rainShadowArrowMat3d);
              rainShadowGroup3d.add(rainShadowArrow3d);
              rainShadowArrows3d.push(rainShadowArrow3d);
            }
            rainShadowGroup3d.visible = false;
            world3d.add(rainShadowGroup3d);

            function makeSolarEnergyPath3d(pathPoints3d) {
              var solarPathGroup3d = new THREE.Group();
              var solarPathCurves3d = [];
              var solarBeamMat3d = new THREE.MeshBasicMaterial({
                color: 0xfde68a, transparent: true, opacity: 0,
                depthWrite: false, blending: THREE.AdditiveBlending
              });
              for (var solarLaneIndex3d = 0; solarLaneIndex3d < 3; solarLaneIndex3d++) {
                var solarLaneOffset3d = (solarLaneIndex3d - 1) * 0.16;
                var solarLanePoints3d = pathPoints3d.map(function(solarPoint3d) {
                  return [solarPoint3d[0] + solarLaneOffset3d, solarPoint3d[1], solarPoint3d[2] - solarLaneOffset3d * 0.45];
                });
                var solarLaneCurve3d = makeJourneyCurve3d(solarLanePoints3d, false);
                solarPathCurves3d.push(solarLaneCurve3d);
                solarPathGroup3d.add(new THREE.Mesh(
                  new THREE.TubeGeometry(solarLaneCurve3d, 40, 0.018, 5, false),
                  solarBeamMat3d
                ));
              }
              var solarMarkerCount3d = 18;
              var solarMarkerGeometry3d = new THREE.BufferGeometry();
              solarMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(new Float32Array(solarMarkerCount3d * 3), 3));
              var solarMarkers3d = new THREE.Points(solarMarkerGeometry3d, new THREE.PointsMaterial({
                color: 0xfff7c2, size: 0.085, transparent: true, opacity: 0,
                depthWrite: false, blending: THREE.AdditiveBlending
              }));
              solarPathGroup3d.add(solarMarkers3d);
              solarPathGroup3d.visible = false;
              world3d.add(solarPathGroup3d);
              return { group: solarPathGroup3d, curves: solarPathCurves3d, beamMaterial: solarBeamMat3d, markers: solarMarkers3d };
            }
            var solarEnergyPaths3d = {
              ocean: makeSolarEnergyPath3d([[-7.6,6.2,-7.4],[-6.0,4.2,-4.5],[-4.4,2.0,-1.3],[-3.0,-0.82,1.7]]),
              plant: makeSolarEnergyPath3d([[-7.6,6.2,-7.4],[-3.5,4.5,-4.2],[1.4,2.8,-1.4],[5.9,1.35,1.25]])
            };

            var latentHeatGroup3d = new THREE.Group();
            for (var latentRingIndex3d = 0; latentRingIndex3d < 3; latentRingIndex3d++) {
              var latentRing3d = new THREE.Mesh(
                new THREE.TorusGeometry(0.72, 0.026, 6, 52),
                new THREE.MeshBasicMaterial({
                  color: 0xfbbf24, transparent: true, opacity: 0,
                  depthWrite: false, blending: THREE.AdditiveBlending
                })
              );
              if (latentRingIndex3d === 1) latentRing3d.rotation.x = Math.PI / 2;
              if (latentRingIndex3d === 2) latentRing3d.rotation.y = Math.PI / 2;
              latentHeatGroup3d.add(latentRing3d);
            }
            latentHeatGroup3d.position.set(0.5, 3.15, -1.7);
            latentHeatGroup3d.visible = false;
            world3d.add(latentHeatGroup3d);

            var starPositions = new Float32Array(240 * 3);
            for (var si3 = 0; si3 < 240; si3++) {
              starPositions[si3 * 3] = (Math.random() - 0.5) * 34;
              starPositions[si3 * 3 + 1] = 3 + Math.random() * 12;
              starPositions[si3 * 3 + 2] = -5 - Math.random() * 18;
            }
            var starGeo = new THREE.BufferGeometry();
            starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
            var stars3d = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xa5dfff, size: 0.07, transparent: true, opacity: 0.65, depthWrite: false }));
            world3d.add(stars3d);

            var routePoints = [
              new THREE.Vector3(-3.0, -0.72, 1.7), new THREE.Vector3(-2.3, 1.0, 0.9),
              new THREE.Vector3(0.2, 3.25, -1.5), new THREE.Vector3(2.5, 0.2, -0.4),
              new THREE.Vector3(4.3, -0.9, -0.1), new THREE.Vector3(4.5, -2.2, -0.4),
              new THREE.Vector3(5.8, -0.4, 1.2), new THREE.Vector3(5.9, 2.0, 1.2)
            ];
            var routeOverviewCurve3d = new THREE.CatmullRomCurve3(routePoints);
            var route3d = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(routeOverviewCurve3d.getPoints(100)),
              new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.28, depthWrite: false })
            );
            world3d.add(route3d);
            var routeGlow3d = new THREE.Mesh(
              new THREE.TubeGeometry(routeOverviewCurve3d, 100, 0.045, 6, false),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending })
            );
            world3d.add(routeGlow3d);
            var routeMarkerCount3d = 18;
            var routeMarkerPositions3d = new Float32Array(routeMarkerCount3d * 3);
            for (var routeMarkerIndex3d = 0; routeMarkerIndex3d < routeMarkerCount3d; routeMarkerIndex3d++) {
              var routeMarkerPoint3d = routeOverviewCurve3d.getPointAt(routeMarkerIndex3d / (routeMarkerCount3d - 1));
              routeMarkerPoint3d.toArray(routeMarkerPositions3d, routeMarkerIndex3d * 3);
            }
            var routeMarkerGeometry3d = new THREE.BufferGeometry();
            routeMarkerGeometry3d.setAttribute('position', new THREE.BufferAttribute(routeMarkerPositions3d, 3));
            var routeMarkers3d = new THREE.Points(
              routeMarkerGeometry3d,
              new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.09, transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending })
            );
            world3d.add(routeMarkers3d);

            var dropletTrailPositions3d = new Float32Array(14 * 3);
            var dropletTrailGeometry3d = new THREE.BufferGeometry();
            dropletTrailGeometry3d.setAttribute('position', new THREE.BufferAttribute(dropletTrailPositions3d, 3));
            var dropletTrail3d = new THREE.Points(
              dropletTrailGeometry3d,
              new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.085, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending })
            );
            world3d.add(dropletTrail3d);

            var dropletGroup3d = new THREE.Group();
            var dropletMat3d = new THREE.MeshPhysicalMaterial({
              color: 0x38bdf8, emissive: 0x075985, emissiveIntensity: 0.65,
              roughness: 0.06, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.04,
              transparent: true, opacity: 0.96
            });
            var dropletProfile3d = [
              new THREE.Vector2(0, -0.36), new THREE.Vector2(0.2, -0.3),
              new THREE.Vector2(0.31, -0.08), new THREE.Vector2(0.27, 0.14),
              new THREE.Vector2(0.14, 0.31), new THREE.Vector2(0, 0.52)
            ];
            var droplet3d = new THREE.Mesh(new THREE.LatheGeometry(dropletProfile3d, 32), dropletMat3d);
            droplet3d.castShadow = true;
            dropletGroup3d.add(droplet3d);
            var dropletCore3d = new THREE.Mesh(
              new THREE.SphereGeometry(0.17, 18, 14),
              new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.18, depthWrite: false })
            );
            dropletCore3d.position.y = -0.02;
            dropletGroup3d.add(dropletCore3d);
            var dropletHighlight3d = new THREE.Mesh(
              new THREE.SphereGeometry(0.065, 12, 10),
              new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })
            );
            dropletHighlight3d.position.set(-0.11, 0.1, 0.2);
            dropletGroup3d.add(dropletHighlight3d);
            var halo3d = new THREE.Mesh(
              new THREE.SphereGeometry(0.52, 20, 16),
              new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })
            );
            dropletGroup3d.add(halo3d);
            var dropletLight3d = new THREE.PointLight(0x38bdf8, 2.2, 5.5);
            dropletGroup3d.add(dropletLight3d);
            var vaporShellMat3d = new THREE.MeshBasicMaterial({
              color: 0xbae6fd, wireframe: true, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var vaporShell3d = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), vaporShellMat3d);
            vaporShell3d.visible = false;
            dropletGroup3d.add(vaporShell3d);
            var iceCrystal3d = new THREE.Group();
            var iceCrystalMat3d = new THREE.MeshPhysicalMaterial({
              color: 0xe0f2fe, emissive: 0x7dd3fc, emissiveIntensity: 0.42,
              roughness: 0.18, clearcoat: 0.9, transparent: true, opacity: 0.94
            });
            iceCrystal3d.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.23, 1), iceCrystalMat3d));
            for (var iceArmIndex3d = 0; iceArmIndex3d < 3; iceArmIndex3d++) {
              var iceArm3d = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.82, 7), iceCrystalMat3d);
              iceArm3d.rotation.z = iceArmIndex3d * Math.PI / 3;
              iceCrystal3d.add(iceArm3d);
            }
            iceCrystal3d.visible = false;
            dropletGroup3d.add(iceCrystal3d);
            var fallStreakMat3d = new THREE.MeshBasicMaterial({
              color: 0x93c5fd, transparent: true, opacity: 0,
              depthWrite: false, blending: THREE.AdditiveBlending
            });
            var fallStreak3d = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.1, 1.05, 9, 1, true), fallStreakMat3d);
            fallStreak3d.position.y = -0.72;
            fallStreak3d.visible = false;
            dropletGroup3d.add(fallStreak3d);
            world3d.add(dropletGroup3d);

            var labelTextures3d = [];
            var processLabels3d = {};
            function makeProcessLabel3d(labelKey, labelText, accentColor, position) {
              var labelCanvas3d = document.createElement('canvas');
              labelCanvas3d.width = 512;
              labelCanvas3d.height = 128;
              var labelContext3d = labelCanvas3d.getContext('2d');
              if (!labelContext3d) return null;
              labelContext3d.beginPath();
              labelContext3d.moveTo(28, 12);
              labelContext3d.lineTo(484, 12);
              labelContext3d.quadraticCurveTo(504, 12, 504, 32);
              labelContext3d.lineTo(504, 96);
              labelContext3d.quadraticCurveTo(504, 116, 484, 116);
              labelContext3d.lineTo(28, 116);
              labelContext3d.quadraticCurveTo(8, 116, 8, 96);
              labelContext3d.lineTo(8, 32);
              labelContext3d.quadraticCurveTo(8, 12, 28, 12);
              labelContext3d.closePath();
              labelContext3d.fillStyle = 'rgba(3, 18, 31, 0.82)';
              labelContext3d.fill();
              labelContext3d.lineWidth = 5;
              labelContext3d.strokeStyle = accentColor;
              labelContext3d.stroke();
              labelContext3d.font = '600 31px system-ui, sans-serif';
              labelContext3d.textAlign = 'center';
              labelContext3d.textBaseline = 'middle';
              labelContext3d.fillStyle = '#f0f9ff';
              labelContext3d.fillText(labelText, 256, 65);
              var labelTexture3d = new THREE.CanvasTexture(labelCanvas3d);
              labelTexture3d.minFilter = THREE.LinearFilter;
              labelTexture3d.generateMipmaps = false;
              labelTextures3d.push(labelTexture3d);
              var labelSprite3d = new THREE.Sprite(new THREE.SpriteMaterial({
                map: labelTexture3d, transparent: true, opacity: 0.96,
                depthTest: false, depthWrite: false
              }));
              labelSprite3d.position.set(position[0], position[1], position[2]);
              labelSprite3d.scale.set(2.8, 0.7, 1);
              labelSprite3d.renderOrder = 20;
              labelSprite3d.visible = false;
              processLabels3d[labelKey] = labelSprite3d;
              world3d.add(labelSprite3d);
              return labelSprite3d;
            }
            makeProcessLabel3d('ocean', 'Ocean storage', '#38bdf8', [-3.0, 0.05, 1.7]);
            makeProcessLabel3d('evaporation', 'Evaporation', '#fbbf24', [-1.8, 2.25, 0.25]);
            makeProcessLabel3d('condensation', 'Condensation', '#e0f2fe', [0.2, 4.1, -1.55]);
            makeProcessLabel3d('precipitation', 'Precipitation', '#60a5fa', [2.7, 1.25, -0.4]);
            makeProcessLabel3d('land', 'Land pathways', '#f59e0b', [4.3, 0.05, -0.1]);
            makeProcessLabel3d('river', 'Surface runoff', '#3b82f6', [1.15, -0.1, 1.35]);
            makeProcessLabel3d('aquifer', 'Groundwater', '#22d3ee', [4.8, -1.45, -0.55]);
            makeProcessLabel3d('plant', 'Plant uptake', '#4ade80', [5.9, 0.45, 1.25]);
            makeProcessLabel3d('transpiration', 'Transpiration', '#86efac', [5.9, 2.85, 1.25]);
            makeProcessLabel3d('cycle', 'Cycle continues', '#67e8f9', [-3.0, 0.65, 1.7]);
            var windTransportLabel3d = makeProcessLabel3d(
              'wind_transport', 'Atmospheric transport', '#bae6fd', [-0.6, 3.95, -1.6]
            );
            if (windTransportLabel3d) {
              delete processLabels3d.wind_transport;
              windTransportLabel3d.scale.set(2.35, 0.59, 1);
              windTransportLabel3d.visible = false;
            }
            var orographicLiftLabel3d = makeProcessLabel3d(
              'orographic_lift', 'Orographic lift', '#c4b5fd', [6.2, 4.75, -3.45]
            );
            if (orographicLiftLabel3d) {
              delete processLabels3d.orographic_lift;
              orographicLiftLabel3d.scale.set(2.05, 0.52, 1);
              orographicLiftLabel3d.visible = false;
            }
            var rainShadowLabel3d = makeProcessLabel3d(
              'rain_shadow', 'Rain shadow', '#f6c177', [8.45, 0.45, -2.15]
            );
            if (rainShadowLabel3d) {
              delete processLabels3d.rain_shadow;
              rainShadowLabel3d.scale.set(1.6, 0.4, 1);
              rainShadowLabel3d.visible = false;
            }
            var canopyInterceptionLabel3d = makeProcessLabel3d(
              'canopy_interception', 'Canopy interception', '#7dd3fc', [4.2, 1.25, -0.6]
            );
            if (canopyInterceptionLabel3d) {
              delete processLabels3d.canopy_interception;
              canopyInterceptionLabel3d.scale.set(2.25, 0.56, 1);
              canopyInterceptionLabel3d.visible = false;
            }
            var urbanStormwaterLabel3d = makeProcessLabel3d(
              'urban_stormwater', 'Stormwater runoff', '#38bdf8', [4.3, 0.6, -0.2]
            );
            if (urbanStormwaterLabel3d) {
              delete processLabels3d.urban_stormwater;
              urbanStormwaterLabel3d.scale.set(2.05, 0.52, 1);
              urbanStormwaterLabel3d.visible = false;
            }
            var meadowInfiltrationLabel3d = makeProcessLabel3d(
              'meadow_infiltration', 'Grassland infiltration', '#22d3ee', [4.3, 0.55, -1.35]
            );
            if (meadowInfiltrationLabel3d) {
              delete processLabels3d.meadow_infiltration;
              meadowInfiltrationLabel3d.scale.set(2.2, 0.55, 1);
              meadowInfiltrationLabel3d.visible = false;
            }
            var waterTableLabel3d = makeProcessLabel3d(
              'water_table', 'Water table', '#67e8f9', [7.2, -1.55, -2.5]
            );
            if (waterTableLabel3d) {
              delete processLabels3d.water_table;
              waterTableLabel3d.scale.set(1.6, 0.4, 1);
              waterTableLabel3d.visible = false;
            }
            var sedimentTransportLabel3d = makeProcessLabel3d(
              'sediment_transport', 'Suspended sediment', '#f0c27b', [2.0, -0.15, 1.0]
            );
            if (sedimentTransportLabel3d) {
              delete processLabels3d.sediment_transport;
              sedimentTransportLabel3d.scale.set(2.05, 0.51, 1);
              sedimentTransportLabel3d.visible = false;
            }
            var floodplainStorageLabel3d = makeProcessLabel3d(
              'floodplain_storage', 'Floodplain storage', '#5eead4', [4.7, -0.05, 1.15]
            );
            if (floodplainStorageLabel3d) {
              delete processLabels3d.floodplain_storage;
              floodplainStorageLabel3d.scale.set(2.0, 0.5, 1);
              floodplainStorageLabel3d.visible = false;
            }
            var snowStorageLabelCanvas3d = document.createElement('canvas');
            snowStorageLabelCanvas3d.width = 512;
            snowStorageLabelCanvas3d.height = 160;
            var snowStorageLabelContext3d = snowStorageLabelCanvas3d.getContext('2d');
            var snowStorageLabelTexture3d = null;
            var snowStorageLabel3d = null;
            var snowStorageLabelKey3d = '';
            if (snowStorageLabelContext3d) {
              snowStorageLabelTexture3d = new THREE.CanvasTexture(snowStorageLabelCanvas3d);
              snowStorageLabelTexture3d.minFilter = THREE.LinearFilter;
              snowStorageLabelTexture3d.generateMipmaps = false;
              labelTextures3d.push(snowStorageLabelTexture3d);
              snowStorageLabel3d = new THREE.Sprite(new THREE.SpriteMaterial({
                map: snowStorageLabelTexture3d, transparent: true, opacity: 0.96,
                depthTest: false, depthWrite: false
              }));
              snowStorageLabel3d.position.set(9.25, 2.15, -3.45);
              snowStorageLabel3d.scale.set(2.75, 0.86, 1);
              snowStorageLabel3d.renderOrder = 21;
              snowStorageLabel3d.visible = false;
              world3d.add(snowStorageLabel3d);
            }
            function updateSnowStorageLabel3d(snowPercent3d, snowStatus3d) {
              if (!snowStorageLabelContext3d || !snowStorageLabelTexture3d) return;
              var nextSnowStorageLabelKey3d = snowPercent3d + ':' + snowStatus3d;
              if (nextSnowStorageLabelKey3d === snowStorageLabelKey3d) return;
              snowStorageLabelKey3d = nextSnowStorageLabelKey3d;
              snowStorageLabelContext3d.clearRect(0, 0, 512, 160);
              snowStorageLabelContext3d.fillStyle = 'rgba(3, 18, 31, 0.86)';
              snowStorageLabelContext3d.fillRect(8, 8, 496, 144);
              snowStorageLabelContext3d.lineWidth = 5;
              snowStorageLabelContext3d.strokeStyle = snowStatus3d === 'Melting to river' ? '#38bdf8' : '#bae6fd';
              snowStorageLabelContext3d.strokeRect(8, 8, 496, 144);
              snowStorageLabelContext3d.textAlign = 'center';
              snowStorageLabelContext3d.textBaseline = 'middle';
              snowStorageLabelContext3d.fillStyle = '#f0f9ff';
              snowStorageLabelContext3d.font = '600 31px system-ui, sans-serif';
              snowStorageLabelContext3d.fillText('Snow storage ' + snowPercent3d + '%', 256, 58);
              snowStorageLabelContext3d.fillStyle = '#bae6fd';
              snowStorageLabelContext3d.font = '500 24px system-ui, sans-serif';
              snowStorageLabelContext3d.fillText(snowStatus3d, 256, 108);
              snowStorageLabelTexture3d.needsUpdate = true;
            }
            var estuarySalinityLabelGroup3d = new THREE.Group();
            var estuarySalinityLabels3d = [];
            [
              { key: 'salinity_fresh', zone: 'freshwater', text: 'River water', color: '#7dd3fc', position: [-0.25, -0.38, 1.28] },
              { key: 'salinity_mix', zone: 'brackish', text: 'Brackish mix', color: '#2dd4bf', position: [-1.25, -0.38, 1.78] },
              { key: 'salinity_ocean', zone: 'marine', text: 'Ocean water', color: '#0ea5e9', position: [-2.45, -0.38, 2.08] }
            ].forEach(function(estuaryLabelSpec3d) {
              var estuaryLabelSprite3d = makeProcessLabel3d(estuaryLabelSpec3d.key, estuaryLabelSpec3d.text,
                estuaryLabelSpec3d.color, estuaryLabelSpec3d.position);
              if (!estuaryLabelSprite3d) return;
              delete processLabels3d[estuaryLabelSpec3d.key];
              estuaryLabelSprite3d.userData.salinityZone = estuaryLabelSpec3d.zone;
              estuaryLabelSprite3d.scale.set(1.55, 0.39, 1);
              estuaryLabelSprite3d.visible = true;
              estuarySalinityLabels3d.push(estuaryLabelSprite3d);
              estuarySalinityLabelGroup3d.add(estuaryLabelSprite3d);
            });
            estuarySalinityLabelGroup3d.visible = false;
            world3d.add(estuarySalinityLabelGroup3d);
            var stateLabelKey3d = {
              ocean: 'ocean', complete: 'cycle', evaporating: 'evaporation',
              condensing: 'condensation', precipitating: 'precipitation', ground_choice: 'land',
              river_runoff: 'river', infiltrating: 'aquifer', aquifer_flow: 'aquifer',
              plant_absorb: 'plant', transpiring: 'transpiration'
            };

            var focusBeacon3d = new THREE.Group();
            var focusRingMat3d = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
            var focusRing3d = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.5, 36), focusRingMat3d);
            focusRing3d.rotation.x = -Math.PI / 2;
            focusBeacon3d.add(focusRing3d);
            var focusOuterRing3d = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.62, 36), focusRingMat3d.clone());
            focusOuterRing3d.rotation.x = -Math.PI / 2;
            focusBeacon3d.add(focusOuterRing3d);
            var focusBeamMat3d = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending });
            var focusBeam3d = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.17, 1.4, 14, 1, true), focusBeamMat3d);
            focusBeam3d.position.y = 0.7;
            focusBeacon3d.add(focusBeam3d);
            var focusLight3d = new THREE.PointLight(0x38bdf8, 0.8, 4);
            focusLight3d.position.y = 0.35;
            focusBeacon3d.add(focusLight3d);
            world3d.add(focusBeacon3d);

            var arrivalWaveGroup3d = new THREE.Group();
            var arrivalWaveMaterials3d = [];
            for (var arrivalRingIndex3d = 0; arrivalRingIndex3d < 3; arrivalRingIndex3d++) {
              var arrivalWaveMat3d = new THREE.MeshBasicMaterial({
                color: 0x38bdf8, transparent: true, opacity: 0,
                side: THREE.DoubleSide, depthTest: false, depthWrite: false,
                blending: THREE.AdditiveBlending
              });
              var arrivalRing3d = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.29, 36), arrivalWaveMat3d);
              arrivalRing3d.rotation.x = -Math.PI / 2;
              arrivalRing3d.userData.delay = arrivalRingIndex3d * 0.13;
              arrivalWaveMaterials3d.push(arrivalWaveMat3d);
              arrivalWaveGroup3d.add(arrivalRing3d);
            }
            arrivalWaveGroup3d.visible = false;
            world3d.add(arrivalWaveGroup3d);

            var arrivalSparkPositions3d = new Float32Array(30 * 3);
            for (var arrivalSparkIndex3d = 0; arrivalSparkIndex3d < 30; arrivalSparkIndex3d++) {
              var arrivalSparkAngle3d = arrivalSparkIndex3d * 2.39996;
              var arrivalSparkRadius3d = 0.35 + (arrivalSparkIndex3d % 5) * 0.08;
              arrivalSparkPositions3d[arrivalSparkIndex3d * 3] = Math.cos(arrivalSparkAngle3d) * arrivalSparkRadius3d;
              arrivalSparkPositions3d[arrivalSparkIndex3d * 3 + 1] = ((arrivalSparkIndex3d % 7) - 3) * 0.08;
              arrivalSparkPositions3d[arrivalSparkIndex3d * 3 + 2] = Math.sin(arrivalSparkAngle3d) * arrivalSparkRadius3d;
            }
            var arrivalSparkGeometry3d = new THREE.BufferGeometry();
            arrivalSparkGeometry3d.setAttribute('position', new THREE.BufferAttribute(arrivalSparkPositions3d, 3));
            var arrivalSpark3d = new THREE.Points(arrivalSparkGeometry3d, new THREE.PointsMaterial({
              color: 0x7dd3fc, size: 0.075, transparent: true, opacity: 0,
              depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
            }));
            arrivalSpark3d.visible = false;
            world3d.add(arrivalSpark3d);

            var cycleCrown3d = new THREE.Group();
            var cycleCrownMat3d = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending });
            for (var cycleRingIndex3d = 0; cycleRingIndex3d < 3; cycleRingIndex3d++) {
              var cycleRing3d = new THREE.Mesh(new THREE.TorusGeometry(0.64 + cycleRingIndex3d * 0.18, 0.026, 8, 48), cycleCrownMat3d.clone());
              cycleRing3d.rotation.set(Math.PI / 2 + (cycleRingIndex3d - 1) * 0.18, cycleRingIndex3d * 0.28, 0);
              cycleCrown3d.add(cycleRing3d);
            }
            cycleCrown3d.position.set(-3.0, -0.62, 1.7);
            cycleCrown3d.visible = false;
            world3d.add(cycleCrown3d);

            var rainRipples3d = new THREE.Group();
            [[3.35,-0.96,-0.9],[4.15,-0.96,0.15],[5.0,-0.96,-0.55],[3.7,-0.96,0.85]].forEach(function(ripplePosition3d, rippleIndex3d) {
              var rippleMat3d = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
              var ripple3d = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.145, 28), rippleMat3d);
              ripple3d.rotation.x = -Math.PI / 2;
              ripple3d.position.set(ripplePosition3d[0], ripplePosition3d[1], ripplePosition3d[2]);
              ripple3d.userData.phase = rippleIndex3d / 4;
              rainRipples3d.add(ripple3d);
            });
            rainRipples3d.visible = false;
            world3d.add(rainRipples3d);

            var stageTargets3d = {
              ocean: [-3.0, -0.72, 1.7], collection: [-3.0, -0.72, 1.7],
              evaporating: [-2.3, 1.0, 0.9], evaporation: [-2.3, 1.0, 0.9],
              condensing: [0.2, 3.25, -1.5], condensation: [0.2, 3.25, -1.5],
              precipitating: [2.5, 0.2, -0.4], precipitation: [2.5, 0.2, -0.4],
              ground_choice: [4.3, -0.82, -0.1],
              river_runoff: [1.2, -0.9, 1.3],
              infiltrating: [4.5, -1.78, -0.35], infiltration: [4.5, -1.78, -0.35],
              aquifer_flow: [5.25, -2.18, -0.35],
              plant_absorb: [5.8, -0.35, 1.2],
              transpiring: [5.9, 2.0, 1.2], transpiration: [5.9, 2.0, 1.2],
              complete: [-3.0, -0.72, 1.7], idle: [-3.0, -0.72, 1.7]
            };
            function makeJourneyCurve3d(points, closed) {
              return new THREE.CatmullRomCurve3(points.map(function(point) {
                return new THREE.Vector3(point[0], point[1], point[2]);
              }), !!closed, 'catmullrom', 0.35);
            }
            var stateCurves3d = {
              ocean: makeJourneyCurve3d([[-3.4,-0.72,1.45],[-2.8,-0.67,1.9],[-2.4,-0.76,1.55],[-3.0,-0.72,1.25]], true),
              evaporating: makeJourneyCurve3d([[-3.0,-0.72,1.7],[-2.7,0.15,1.35],[-2.1,1.15,0.75],[-1.2,2.15,-0.1],[-0.35,2.82,-0.95]], false),
              condensing: makeJourneyCurve3d([[-0.35,2.82,-0.95],[-0.1,3.18,-1.25],[0.25,3.3,-1.55],[0.72,3.16,-1.72]], false),
              precipitating: makeJourneyCurve3d([[0.72,3.16,-1.72],[1.2,2.35,-1.3],[2.25,0.75,-0.65],[3.35,-0.35,-0.25],[4.3,-0.82,-0.1]], false),
              ground_choice: makeJourneyCurve3d([[4.1,-0.78,-0.25],[4.3,-0.82,-0.1],[4.45,-0.8,0.08]], false),
              river_runoff: makeJourneyCurve3d([[4.3,-0.82,-0.1],[3.3,-0.88,0.35],[2.0,-0.9,0.95],[0.6,-1.0,1.45],[-1.2,-1.08,1.65],[-3.0,-0.72,1.7]], false),
              infiltrating: makeJourneyCurve3d([[4.3,-0.82,-0.1],[4.38,-1.18,-0.18],[4.46,-1.5,-0.28],[4.5,-1.78,-0.35]], false),
              aquifer_flow: makeJourneyCurve3d([[4.5,-1.78,-0.35],[5.25,-2.18,-0.35],[3.2,-2.12,0.1],[1.0,-1.95,0.75],[-1.1,-1.45,1.35],[-3.0,-0.72,1.7]], false),
              plant_absorb: makeJourneyCurve3d([[4.3,-0.82,-0.1],[4.95,-1.0,0.45],[5.55,-0.72,0.95],[5.8,-0.35,1.2]], false),
              transpiring: makeJourneyCurve3d([[5.8,-0.35,1.2],[5.9,0.75,1.2],[5.9,2.0,1.2],[4.1,2.65,0.4],[2.0,3.0,-0.55],[0.25,3.3,-1.55]], false),
              complete: makeJourneyCurve3d([[-3.4,-0.72,1.45],[-2.8,-0.67,1.9],[-2.4,-0.76,1.55],[-3.0,-0.72,1.25]], true)
            };

            var branchPreviewGroup3d = new THREE.Group();
            var branchPreviewSpecs3d = [
              { key: 'runoff', labelKey: 'river', shareLabel: 'Runoff', color: 0x3b82f6, colorCss: '#3b82f6', curve: stateCurves3d.river_runoff, markerGeometry: new THREE.SphereGeometry(0.12, 12, 9) },
              { key: 'infiltrate', labelKey: 'aquifer', shareLabel: 'Recharge', color: 0x22d3ee, colorCss: '#22d3ee', curve: stateCurves3d.infiltrating, markerGeometry: new THREE.OctahedronGeometry(0.14, 0) },
              { key: 'plant', labelKey: 'plant', shareLabel: 'Plant', color: 0x4ade80, colorCss: '#4ade80', curve: stateCurves3d.plant_absorb, markerGeometry: new THREE.TetrahedronGeometry(0.15, 0) }
            ];
            function makeBranchShareLabel3d(branchSpec3d) {
              var branchShareCanvas3d = document.createElement('canvas');
              branchShareCanvas3d.width = 320;
              branchShareCanvas3d.height = 104;
              var branchShareContext3d = branchShareCanvas3d.getContext('2d');
              if (!branchShareContext3d) return null;
              var branchShareTexture3d = new THREE.CanvasTexture(branchShareCanvas3d);
              branchShareTexture3d.minFilter = THREE.LinearFilter;
              branchShareTexture3d.generateMipmaps = false;
              labelTextures3d.push(branchShareTexture3d);
              var branchShareSprite3d = new THREE.Sprite(new THREE.SpriteMaterial({
                map: branchShareTexture3d, transparent: true, opacity: 0.96,
                depthTest: false, depthWrite: false
              }));
              branchShareSprite3d.scale.set(1.55, 0.5, 1);
              branchShareSprite3d.renderOrder = 16;
              branchShareSprite3d.visible = false;
              branchShareSprite3d.userData.routeChoice = branchSpec3d.key;
              branchSpec3d.shareCanvas3d = branchShareCanvas3d;
              branchSpec3d.shareContext3d = branchShareContext3d;
              branchSpec3d.shareTexture3d = branchShareTexture3d;
              branchSpec3d.shareSprite3d = branchShareSprite3d;
              branchSpec3d.shareLabelValue3d = '';
              var branchShareAnchorT3d = branchSpec3d.key === 'runoff' ? 0.42 :
                (branchSpec3d.key === 'infiltrate' ? 0.7 : 0.58);
              branchShareSprite3d.position.copy(branchSpec3d.curve.getPointAt(branchShareAnchorT3d));
              branchShareSprite3d.position.y += branchSpec3d.key === 'infiltrate' ? 0.28 : 0.42;
              return branchShareSprite3d;
            }
            function updateBranchShareLabel3d(branchSpec3d, branchPercent3d) {
              if (!branchSpec3d.shareContext3d || !branchSpec3d.shareTexture3d) return;
              var branchShareText3d = branchSpec3d.shareLabel + ' ' + branchPercent3d + '%';
              if (branchShareText3d === branchSpec3d.shareLabelValue3d) return;
              branchSpec3d.shareLabelValue3d = branchShareText3d;
              var branchShareContext3d = branchSpec3d.shareContext3d;
              branchShareContext3d.clearRect(0, 0, 320, 104);
              branchShareContext3d.beginPath();
              branchShareContext3d.moveTo(24, 10);
              branchShareContext3d.lineTo(296, 10);
              branchShareContext3d.quadraticCurveTo(312, 10, 312, 26);
              branchShareContext3d.lineTo(312, 78);
              branchShareContext3d.quadraticCurveTo(312, 94, 296, 94);
              branchShareContext3d.lineTo(24, 94);
              branchShareContext3d.quadraticCurveTo(8, 94, 8, 78);
              branchShareContext3d.lineTo(8, 26);
              branchShareContext3d.quadraticCurveTo(8, 10, 24, 10);
              branchShareContext3d.closePath();
              branchShareContext3d.fillStyle = 'rgba(3, 18, 31, 0.88)';
              branchShareContext3d.fill();
              branchShareContext3d.lineWidth = 5;
              branchShareContext3d.strokeStyle = branchSpec3d.colorCss;
              branchShareContext3d.stroke();
              branchShareContext3d.font = '600 30px system-ui, sans-serif';
              branchShareContext3d.textAlign = 'center';
              branchShareContext3d.textBaseline = 'middle';
              branchShareContext3d.fillStyle = '#f8fafc';
              branchShareContext3d.fillText(branchShareText3d, 160, 53);
              branchSpec3d.shareTexture3d.needsUpdate = true;
            }
            branchPreviewSpecs3d.forEach(function(branchSpec3d) {
              branchSpec3d.routeMaterial = new THREE.MeshBasicMaterial({
                color: branchSpec3d.color, transparent: true, opacity: 0.42,
                depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
              });
              branchSpec3d.routeMesh = new THREE.Mesh(
                new THREE.TubeGeometry(branchSpec3d.curve, 56, 0.035, 6, false),
                branchSpec3d.routeMaterial
              );
              branchSpec3d.routeMesh.userData.routeChoice = branchSpec3d.key;
              branchSpec3d.routeMesh.renderOrder = 14;
              branchSpec3d.routeHitMesh = new THREE.Mesh(
                new THREE.TubeGeometry(branchSpec3d.curve, 40, 0.16, 5, false),
                new THREE.MeshBasicMaterial({
                  transparent: true, opacity: 0, colorWrite: false,
                  depthTest: false, depthWrite: false
                })
              );
              branchSpec3d.routeHitMesh.userData.routeChoice = branchSpec3d.key;
              branchSpec3d.markerMaterial = new THREE.MeshBasicMaterial({
                color: branchSpec3d.color, transparent: true, opacity: 0.92,
                depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
              });
              branchSpec3d.markerMesh = new THREE.Mesh(branchSpec3d.markerGeometry, branchSpec3d.markerMaterial);
              branchSpec3d.markerMesh.userData.routeChoice = branchSpec3d.key;
              branchSpec3d.markerMesh.userData.labelKey = branchSpec3d.labelKey;
              branchSpec3d.hitMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.44, 10, 8),
                new THREE.MeshBasicMaterial({
                  transparent: true, opacity: 0, colorWrite: false,
                  depthTest: false, depthWrite: false
                })
              );
              branchSpec3d.hitMesh.userData.routeChoice = branchSpec3d.key;
              branchSpec3d.markerMesh.add(branchSpec3d.hitMesh);
              branchSpec3d.markerMesh.renderOrder = 15;
              makeBranchShareLabel3d(branchSpec3d);
              branchPreviewGroup3d.add(branchSpec3d.routeMesh, branchSpec3d.routeHitMesh,
                branchSpec3d.markerMesh);
              if (branchSpec3d.shareSprite3d) branchPreviewGroup3d.add(branchSpec3d.shareSprite3d);
            });
            branchPreviewGroup3d.visible = false;
            world3d.add(branchPreviewGroup3d);

            var activeRouteKey3d = '';
            function syncJourneyRoute3d(stateKey) {
              var routeKey = stateCurves3d[stateKey] ? stateKey : 'ocean';
              if (routeKey === activeRouteKey3d) return;
              activeRouteKey3d = routeKey;
              var activeRouteCurve3d = stateCurves3d[routeKey];
              if (route3d.geometry && route3d.geometry.dispose) route3d.geometry.dispose();
              if (routeGlow3d.geometry && routeGlow3d.geometry.dispose) routeGlow3d.geometry.dispose();
              route3d.geometry = new THREE.BufferGeometry().setFromPoints(activeRouteCurve3d.getPoints(72));
              routeGlow3d.geometry = new THREE.TubeGeometry(activeRouteCurve3d, 72, 0.045, 6, !!activeRouteCurve3d.closed);
              var routeColor3d = (stateColors3d && stateColors3d[stateKey]) || 0x38bdf8;
              route3d.material.color.setHex(routeColor3d);
              routeGlow3d.material.color.setHex(routeColor3d);
              routeMarkers3d.material.color.setHex(routeColor3d);
              dropletTrail3d.material.color.setHex(routeColor3d);
            }
            var cameraTargets3d = {
              ocean: [3.2, 2.6, 9.5], collection: [3.2, 2.6, 9.5],
              evaporating: [3.8, 3.2, 9.0], evaporation: [3.8, 3.2, 9.0],
              condensing: [5.2, 5.0, 8.8], condensation: [5.2, 5.0, 8.8],
              precipitating: [7.0, 3.2, 8.5], precipitation: [7.0, 3.2, 8.5],
              ground_choice: [9.0, 2.0, 6.8],
              river_runoff: [6.4, 1.8, 8.2],
              infiltrating: [9.1, 0.4, 6.3], infiltration: [9.1, 0.4, 6.3],
              aquifer_flow: [9.2, -0.4, 6.8],
              plant_absorb: [9.2, 2.0, 7.3],
              transpiring: [9.0, 4.1, 7.6], transpiration: [9.0, 4.1, 7.6],
              complete: [3.2, 2.6, 9.5], idle: [8.5, 4.6, 11.5]
            };
            var stateColors3d = {
              ocean: 0x38bdf8, collection: 0x38bdf8, complete: 0x67e8f9,
              evaporating: 0xfbbf24, evaporation: 0xfbbf24,
              condensing: 0xe0f2fe, condensation: 0xe0f2fe,
              precipitating: 0x60a5fa, precipitation: 0x60a5fa,
              ground_choice: 0xf59e0b, river_runoff: 0x3b82f6,
              infiltrating: 0x22d3ee, infiltration: 0x22d3ee, aquifer_flow: 0x22d3ee,
              plant_absorb: 0x4ade80, transpiring: 0x86efac, transpiration: 0x86efac
            };
            var stageMap3d = {
              evaporation: 'evaporating', condensation: 'condensing', precipitation: 'precipitating',
              collection: 'ocean', transpiration: 'transpiring', infiltration: 'infiltrating'
            };
            var controls3d = null;
            var userOrbit3d = false;
            if (THREE.OrbitControls) {
              controls3d = new THREE.OrbitControls(camera, canvasEl);
              controls3d.enableDamping = true;
              controls3d.dampingFactor = 0.06;
              controls3d.enablePan = false;
              controls3d.minDistance = 4.5;
              controls3d.maxDistance = 18;
              controls3d.maxPolarAngle = Math.PI * 0.86;
              controls3d.addEventListener('start', function() { userOrbit3d = true; });
            }
            canvasEl._wc3dResetCamera = function() {
              userOrbit3d = false;
            };

            var branchRaycaster3d = new THREE.Raycaster();
            var branchPointer3d = new THREE.Vector2();
            var branchPointerDown3d = { x: 0, y: 0 };
            var branchChoiceEnabled3d = false;
            var hoveredBranchKey3d = '';
            var estuaryProbeEnabled3d = false;
            var hoveredSalinityZone3d = '';
            var estuaryProbePoint3d = new THREE.Vector3(-0.25, -1.06, 1.6);
            function setJourneyPointer3d(pointerEvent3d) {
              var branchRect3d = canvasEl.getBoundingClientRect();
              if (!branchRect3d.width || !branchRect3d.height) return false;
              branchPointer3d.set(
                ((pointerEvent3d.clientX - branchRect3d.left) / branchRect3d.width) * 2 - 1,
                -((pointerEvent3d.clientY - branchRect3d.top) / branchRect3d.height) * 2 + 1
              );
              branchRaycaster3d.setFromCamera(branchPointer3d, camera);
              return true;
            }
            function branchChoiceAtPointer3d(pointerEvent3d) {
              if (!branchChoiceEnabled3d) return '';
              if (!setJourneyPointer3d(pointerEvent3d)) return '';
              var branchHits3d = branchRaycaster3d.intersectObjects(branchPreviewGroup3d.children, true);
              for (var branchHitIndex3d = 0; branchHitIndex3d < branchHits3d.length; branchHitIndex3d++) {
                var branchHitObject3d = branchHits3d[branchHitIndex3d].object;
                while (branchHitObject3d && branchHitObject3d !== branchPreviewGroup3d) {
                  if (branchHitObject3d.userData && branchHitObject3d.userData.routeChoice) {
                    return branchHitObject3d.userData.routeChoice;
                  }
                  branchHitObject3d = branchHitObject3d.parent;
                }
              }
              return '';
            }
            function salinityZoneAtPointer3d(pointerEvent3d) {
              if (!estuaryProbeEnabled3d || !setJourneyPointer3d(pointerEvent3d)) return '';
              var salinityHits3d = branchRaycaster3d.intersectObject(estuaryMixingRibbon3d, false);
              if (!salinityHits3d.length) return '';
              estuaryProbePoint3d.copy(salinityHits3d[0].point);
              var salinityMix3d = Math.max(0, Math.min(1, (-0.25 - estuaryProbePoint3d.x) / 2.45));
              return salinityMix3d < 0.33 ? 'freshwater' : (salinityMix3d < 0.7 ? 'brackish' : 'marine');
            }
            function handleBranchPointerDown3d(pointerEvent3d) {
              branchPointerDown3d.x = pointerEvent3d.clientX;
              branchPointerDown3d.y = pointerEvent3d.clientY;
            }
            function handleBranchPointerMove3d(pointerEvent3d) {
              hoveredBranchKey3d = branchChoiceAtPointer3d(pointerEvent3d);
              hoveredSalinityZone3d = hoveredBranchKey3d ? '' : salinityZoneAtPointer3d(pointerEvent3d);
              canvasEl.dataset.routeHover = hoveredBranchKey3d || 'none';
              canvasEl.dataset.salinityHover = hoveredSalinityZone3d || 'none';
              canvasEl.style.cursor = hoveredBranchKey3d ? 'pointer' : (hoveredSalinityZone3d ? 'crosshair' : '');
            }
            function handleBranchPointerLeave3d() {
              hoveredBranchKey3d = '';
              hoveredSalinityZone3d = '';
              canvasEl.dataset.routeHover = 'none';
              canvasEl.dataset.salinityHover = 'none';
              canvasEl.style.cursor = '';
            }
            function handleBranchClick3d(pointerEvent3d) {
              if (!branchChoiceEnabled3d) return;
              var branchDragDistance3d = Math.hypot(
                pointerEvent3d.clientX - branchPointerDown3d.x,
                pointerEvent3d.clientY - branchPointerDown3d.y
              );
              if (branchDragDistance3d > 7) return;
              var selectedBranchKey3d = branchChoiceAtPointer3d(pointerEvent3d);
              if (!selectedBranchKey3d) return;
              canvasEl.dataset.routeChoiceRequest = selectedBranchKey3d;
            }
            canvasEl.addEventListener('pointerdown', handleBranchPointerDown3d);
            canvasEl.addEventListener('pointermove', handleBranchPointerMove3d);
            canvasEl.addEventListener('pointerleave', handleBranchPointerLeave3d);
            canvasEl.addEventListener('click', handleBranchClick3d);

            var clock3d = new THREE.Clock();
            var resizeObserver3d = null;
            function resizeJourney3d() {
              if (!alive3d) return;
              var nextW = Math.max(320, canvasEl.clientWidth || 800);
              var nextH = Math.max(260, canvasEl.clientHeight || 460);
              if (nextW === width && nextH === height) return;
              width = nextW; height = nextH;
              camera.aspect = width / height;
              camera.updateProjectionMatrix();
              renderer.setSize(width, height, false);
            }
            canvasEl._wc3dAdjustCamera = function(action) {
              var focus3d = controls3d ? controls3d.target.clone() : dropletGroup3d.position.clone();
              var offset3d = camera.position.clone().sub(focus3d);
              if (action === 'left' || action === 'right') {
                offset3d.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -0.18 : 0.18);
              } else if (action === 'in' || action === 'out') {
                var zoomFactor3d = action === 'in' ? 0.84 : 1.18;
                var nextDistance3d = Math.max(4.5, Math.min(18, offset3d.length() * zoomFactor3d));
                offset3d.setLength(nextDistance3d);
              }
              camera.position.copy(focus3d).add(offset3d);
              userOrbit3d = true;
              if (controls3d) controls3d.update();
              else camera.lookAt(focus3d);
              return true;
            };

            if (typeof ResizeObserver !== 'undefined') {
              resizeObserver3d = new ResizeObserver(resizeJourney3d);
              resizeObserver3d.observe(canvasEl);
            }
            var visualTime3d = 0;
            var lastElapsed3d = 0;
            var waveFrame3d = 0;
            var lastUndergroundMode3d = null;
            var lastArrivalState3d = null;
            var arrivalAge3d = 2;
            var rainbowMemory3d = 0;
            var snowpackMemory3d = null;
            var canopyStorageMemory3d = 0;
            var urbanStormPulseMemory3d = 0;
            var meadowRetentionMemory3d = 0;
            var groundwaterStorageMemory3d = 0.24;
            var floodplainStorageMemory3d = 0;
            var dropletScaleGoal3d = new THREE.Vector3(1, 1, 1);
            var vaporSourceGoal3d = new THREE.Vector3(-2.1, 0.8, 1.0);


            function animateJourney3d() {
              if (!alive3d || !canvasEl.isConnected) return;
              resizeJourney3d();
              var elapsed3d = clock3d.getElapsedTime();
              var engineCanvas3d = document.getElementById('wcCanvas');
              var rawState3d = engineCanvas3d ? (engineCanvas3d.dataset.journeyState || 'idle') : (canvasEl.dataset.journeyState || 'idle');
              var journeyProgress3d = parseFloat(engineCanvas3d ? (engineCanvas3d.dataset.journeyProgress || '0') : (canvasEl.dataset.journeyProgress || '0'));
              if (!isFinite(journeyProgress3d)) journeyProgress3d = 0;
              journeyProgress3d = Math.max(0, Math.min(1, journeyProgress3d));
              var stage3d = canvasEl.dataset.activeStage || 'collection';
              var runoffVisual3d = parseFloat(canvasEl.dataset.runoffIndex || '50');
              var infiltrationVisual3d = parseFloat(canvasEl.dataset.infiltrationIndex || '50');
              var rainVisual3d = parseFloat(canvasEl.dataset.rainIntensity || '55');
              var coverVisual3d = canvasEl.dataset.landCover || 'grass';
              var solarVisual3d = Math.max(0, Math.min(2, parseFloat(canvasEl.dataset.climSolar || '1')));
              var tempVisual3d = parseFloat(canvasEl.dataset.climTemp || '15');
              var windVisual3d = Math.max(0, Math.min(3, parseFloat(canvasEl.dataset.climWind || '1')));
              var journeyPaused3d = canvasEl.dataset.journeyPaused === 'true';
              var hydroPoints3d = Math.max(0, Math.min(120, parseFloat(canvasEl.dataset.hydroPoints || '0')));
              var frameDelta3d = lastElapsed3d ? Math.min(0.05, Math.max(0, elapsed3d - lastElapsed3d)) : 0;
              lastElapsed3d = elapsed3d;
              if (!motionReduced3d && !journeyPaused3d) visualTime3d += frameDelta3d;

              var state3d = rawState3d === 'idle' ? (stageMap3d[stage3d] || stage3d) : rawState3d;
              var targetArray3d = stageTargets3d[state3d] || stageTargets3d.ocean;
              var cameraArray3d = cameraTargets3d[state3d] || cameraTargets3d.idle;
              var activeCurve3d = stateCurves3d[state3d];
              var target3d = (!motionReduced3d && rawState3d !== 'idle' && activeCurve3d)
                ? activeCurve3d.getPointAt(journeyProgress3d)
                : new THREE.Vector3(targetArray3d[0], targetArray3d[1], targetArray3d[2]);
              var cameraGoal3d = new THREE.Vector3(cameraArray3d[0], cameraArray3d[1], cameraArray3d[2]);
              syncJourneyRoute3d(state3d);
              canvasEl.dataset.journeyProgress = String(journeyProgress3d);
              var activeLabelKey3d = stateLabelKey3d[state3d] || 'ocean';
              var groundChoiceActive3d = state3d === 'ground_choice';
              branchChoiceEnabled3d = groundChoiceActive3d;
              if (!groundChoiceActive3d && hoveredBranchKey3d) {
                hoveredBranchKey3d = '';
                canvasEl.dataset.routeHover = 'none';
                canvasEl.style.cursor = '';
              }
              Object.keys(processLabels3d).forEach(function(labelKey3d) {
                var isChoiceLabel3d = labelKey3d === 'river' || labelKey3d === 'aquifer' || labelKey3d === 'plant';
                var isActiveLabel3d = groundChoiceActive3d ? isChoiceLabel3d : labelKey3d === activeLabelKey3d;
                processLabels3d[labelKey3d].visible = isActiveLabel3d;
                if (isActiveLabel3d) {
                  var labelPulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 2.2) * 0.025;
                  var labelWidth3d = groundChoiceActive3d ? 2.25 : 2.8;
                  processLabels3d[labelKey3d].scale.set(labelWidth3d * labelPulse3d, labelWidth3d * 0.25 * labelPulse3d, 1);
                  var labelBranchKey3d = labelKey3d === 'river' ? 'runoff' : labelKey3d === 'aquifer' ? 'infiltrate' : labelKey3d === 'plant' ? 'plant' : '';
                  processLabels3d[labelKey3d].material.opacity = groundChoiceActive3d && hoveredBranchKey3d && labelBranchKey3d !== hoveredBranchKey3d
                    ? 0.5 : 0.96;
                }
              });
              var branchRunoffCoverWeight3d = coverVisual3d === 'urban' ? 1.28 :
                (coverVisual3d === 'forest' ? 0.62 : 0.88);
              var branchInfiltrationCoverWeight3d = coverVisual3d === 'urban' ? 0.55 :
                (coverVisual3d === 'forest' ? 1.12 : 1);
              var branchPlantBase3d = coverVisual3d === 'forest' ? 44 :
                (coverVisual3d === 'grass' ? 28 : 9);
              var branchPlantInfiltrationWeight3d = coverVisual3d === 'forest' ? 0.22 :
                (coverVisual3d === 'grass' ? 0.16 : 0.04);
              var branchRunoffScore3d = Math.max(1, runoffVisual3d) * branchRunoffCoverWeight3d;
              var branchInfiltrationScore3d = Math.max(1, infiltrationVisual3d) * branchInfiltrationCoverWeight3d;
              var branchPlantScore3d = branchPlantBase3d +
                infiltrationVisual3d * branchPlantInfiltrationWeight3d;
              var branchScoreTotal3d = branchRunoffScore3d + branchInfiltrationScore3d + branchPlantScore3d;
              var branchRunoffPercent3d = Math.round(branchRunoffScore3d / branchScoreTotal3d * 100);
              var branchInfiltrationPercent3d = Math.round(branchInfiltrationScore3d / branchScoreTotal3d * 100);
              var branchPlantPercent3d = Math.max(0, 100 - branchRunoffPercent3d - branchInfiltrationPercent3d);
              var branchSharePercentByKey3d = {
                runoff: branchRunoffPercent3d,
                infiltrate: branchInfiltrationPercent3d,
                plant: branchPlantPercent3d
              };
              branchPreviewGroup3d.visible = groundChoiceActive3d;
              branchPreviewSpecs3d.forEach(function(branchSpec3d, branchIndex3d) {
                var branchSharePercent3d = branchSharePercentByKey3d[branchSpec3d.key];
                var branchShare3d = branchSharePercent3d / 100;
                var branchMarkerT3d = motionReduced3d ? 0.38 + branchIndex3d * 0.16 :
                  (0.08 + branchIndex3d * 0.22 + visualTime3d * (0.055 + branchShare3d * 0.13)) % 1;
                branchSpec3d.markerMesh.position.copy(branchSpec3d.curve.getPointAt(branchMarkerT3d));
                branchSpec3d.markerMesh.rotation.set(visualTime3d * 0.3, visualTime3d * 0.42, branchIndex3d * 0.7);
                var branchPulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 2.5 + branchIndex3d) * 0.18;
                var branchHovered3d = hoveredBranchKey3d === branchSpec3d.key;
                var branchMuted3d = !!hoveredBranchKey3d && !branchHovered3d;
                var branchShareScale3d = 0.78 + branchShare3d * 0.72;
                branchSpec3d.markerMesh.scale.setScalar(branchPulse3d * branchShareScale3d *
                  (branchHovered3d ? 1.3 : branchMuted3d ? 0.86 : 1));
                branchSpec3d.markerMaterial.opacity = branchMuted3d ? 0.38 : 0.58 + branchShare3d * 0.42;
                branchSpec3d.routeMaterial.opacity = groundChoiceActive3d ?
                  (branchHovered3d ? 0.78 : branchMuted3d ? 0.14 :
                    0.18 + branchShare3d * 0.44 + (branchPulse3d - 1) * 0.22) : 0;
                updateBranchShareLabel3d(branchSpec3d, branchSharePercent3d);
                if (branchSpec3d.shareSprite3d) {
                  branchSpec3d.shareSprite3d.visible = groundChoiceActive3d;
                  branchSpec3d.shareSprite3d.material.opacity = branchMuted3d ? 0.46 : 0.96;
                  branchSpec3d.shareSprite3d.scale.set(
                    1.55 * (branchHovered3d ? 1.08 : branchMuted3d ? 0.95 : 1),
                    0.5 * (branchHovered3d ? 1.08 : branchMuted3d ? 0.95 : 1), 1);
                }
              });
              canvasEl.dataset.routePreview = groundChoiceActive3d ? 'runoff,infiltrate,plant' : 'hidden';
              canvasEl.dataset.routeBalance = groundChoiceActive3d ?
                'runoff:' + branchRunoffPercent3d + ',infiltration:' +
                  branchInfiltrationPercent3d + ',plant:' + branchPlantPercent3d : 'hidden';
              canvasEl.dataset.routeBalanceModel = 'relative-tendency';
              canvasEl.dataset.sceneFocus = groundChoiceActive3d ? 'route-choice' : activeLabelKey3d;
              var stateVisualColor3d = stateColors3d[state3d] || 0x38bdf8;
              var arrivalStateChanged3d = lastArrivalState3d !== null && lastArrivalState3d !== state3d;
              if (lastArrivalState3d === null || arrivalStateChanged3d) {
                arrivalWaveGroup3d.position.set(targetArray3d[0], targetArray3d[1] + 0.02, targetArray3d[2]);
                arrivalSpark3d.position.copy(arrivalWaveGroup3d.position);
                arrivalWaveMaterials3d.forEach(function(arrivalColorMat3d) {
                  arrivalColorMat3d.color.setHex(stateVisualColor3d);
                });
                arrivalSpark3d.material.color.setHex(stateVisualColor3d);
                if (arrivalStateChanged3d) arrivalAge3d = 0;
                lastArrivalState3d = state3d;
                canvasEl.dataset.arrivalState = state3d;
              }
              if (!motionReduced3d && !journeyPaused3d && arrivalAge3d < 2) {
                arrivalAge3d += frameDelta3d;
              }
              var arrivalWaveActive3d = !motionReduced3d && arrivalAge3d < 1.45;
              arrivalWaveGroup3d.visible = arrivalWaveActive3d;
              arrivalWaveGroup3d.children.forEach(function(arrivalRingMesh3d) {
                var delayedArrivalAge3d = arrivalAge3d - arrivalRingMesh3d.userData.delay;
                var ringLife3d = Math.max(0, Math.min(1, delayedArrivalAge3d / 1.05));
                arrivalRingMesh3d.scale.setScalar(0.7 + ringLife3d * 3.2);
                arrivalRingMesh3d.material.opacity = delayedArrivalAge3d >= 0 && delayedArrivalAge3d < 1.05 ?
                  (1 - ringLife3d) * 0.58 : 0;
              });
              var arrivalSparkActive3d = !motionReduced3d && arrivalAge3d < 0.9;
              arrivalSpark3d.visible = arrivalSparkActive3d;
              if (arrivalSparkActive3d) {
                var arrivalSparkLife3d = Math.max(0, Math.min(1, arrivalAge3d / 0.9));
                arrivalSpark3d.scale.setScalar(0.75 + arrivalSparkLife3d * 2.1);
                arrivalSpark3d.material.opacity = (1 - arrivalSparkLife3d) * 0.72;
              }
              canvasEl.dataset.arrivalEffect = arrivalWaveActive3d || arrivalSparkActive3d ? 'active' : 'settled';

              var cycleCompleteActive3d = state3d === 'complete';
              cycleCrown3d.visible = cycleCompleteActive3d;
              cycleCrown3d.children.forEach(function(cycleRingMesh3d, cycleRingIndex3d) {
                var cyclePulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 1.8 + cycleRingIndex3d) * 0.08;
                cycleRingMesh3d.scale.setScalar(cyclePulse3d);
                cycleRingMesh3d.material.opacity = motionReduced3d ? 0.52 : 0.42 + Math.sin(visualTime3d * 1.4 + cycleRingIndex3d) * 0.16;
                cycleRingMesh3d.rotation.z = motionReduced3d ? 0 : visualTime3d * (0.2 + cycleRingIndex3d * 0.05) * (cycleRingIndex3d % 2 ? -1 : 1);
              });
              canvasEl.dataset.completionEffect = cycleCompleteActive3d ? 'cycle-continues' : 'hidden';
              var vaporTransfer3d = state3d === 'evaporating' || state3d === 'evaporation' || state3d === 'transpiring' || state3d === 'transpiration';
              var condensationTransfer3d = state3d === 'condensing' || state3d === 'condensation';
              var parcelGasBlend3d = condensationTransfer3d ? (1 - journeyProgress3d) : (vaporTransfer3d ? 1 : 0);
              var precipitationTransfer3d = state3d === 'precipitating' || state3d === 'precipitation';
              var frozenParcel3d = tempVisual3d < -2 && (precipitationTransfer3d || state3d === 'ground_choice');
              var rainParcel3d = precipitationTransfer3d && !frozenParcel3d;
              droplet3d.visible = !frozenParcel3d;
              dropletCore3d.visible = !frozenParcel3d;
              dropletHighlight3d.visible = !frozenParcel3d && parcelGasBlend3d < 0.86;
              vaporShell3d.visible = parcelGasBlend3d > 0.03 && !frozenParcel3d;
              iceCrystal3d.visible = frozenParcel3d;
              fallStreak3d.visible = rainParcel3d;
              if (parcelGasBlend3d > 0.02) {
                var parcelScale3d = 0.55 + (1 - parcelGasBlend3d) * 0.45;
                dropletScaleGoal3d.set(parcelScale3d, parcelScale3d * 1.08, parcelScale3d);
              } else if (rainParcel3d) {
                dropletScaleGoal3d.set(0.78, 1.28, 0.78);
              } else {
                dropletScaleGoal3d.set(1, 1, 1);
              }
              droplet3d.scale.lerp(dropletScaleGoal3d, motionReduced3d ? 1 : 0.1);
              dropletMat3d.opacity += ((0.96 - parcelGasBlend3d * 0.68) - dropletMat3d.opacity) * (motionReduced3d ? 1 : 0.1);
              vaporShellMat3d.opacity = vaporShell3d.visible ? 0.16 + parcelGasBlend3d * 0.34 : 0;
              vaporShell3d.scale.setScalar(0.88 + parcelGasBlend3d * 0.24 + (motionReduced3d ? 0 : Math.sin(visualTime3d * 2.4) * 0.04));
              vaporShell3d.rotation.set(visualTime3d * 0.18, visualTime3d * 0.26, visualTime3d * 0.11);
              iceCrystal3d.rotation.set(visualTime3d * 0.3, visualTime3d * 0.42, visualTime3d * 0.16);
              fallStreakMat3d.opacity = rainParcel3d ? 0.2 + rainVisual3d / 300 : 0;
              halo3d.material.color.setHex(stateVisualColor3d);
              canvasEl.dataset.parcelPhase = frozenParcel3d ? 'solid' : (parcelGasBlend3d > 0.5 ? 'vapor' : 'liquid');
              focusBeacon3d.position.set(targetArray3d[0], targetArray3d[1] - 0.04, targetArray3d[2]);
              focusRingMat3d.color.setHex(stateVisualColor3d);
              focusOuterRing3d.material.color.setHex(stateVisualColor3d);
              focusBeamMat3d.color.setHex(stateVisualColor3d);
              focusLight3d.color.setHex(stateVisualColor3d);
              var beaconPulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 2.6) * 0.16;
              focusRing3d.scale.setScalar(beaconPulse3d);
              focusOuterRing3d.scale.setScalar(1.1 + (motionReduced3d ? 0 : Math.sin(visualTime3d * 1.7) * 0.12));
              focusBeamMat3d.opacity = 0.07 + (motionReduced3d ? 0 : (Math.sin(visualTime3d * 2.1) + 1) * 0.025);
              focusLight3d.intensity = 0.55 + hydroPoints3d / 180;

              var undergroundMode3d = state3d === 'infiltrating' || state3d === 'infiltration' || state3d === 'aquifer_flow' ||
                state3d === 'plant_absorb';
              if (undergroundMode3d !== lastUndergroundMode3d) {
                landMat3d.depthWrite = !undergroundMode3d;
                groundCoverMat3d.depthWrite = !undergroundMode3d;
                landMat3d.needsUpdate = true;
                groundCoverMat3d.needsUpdate = true;
                strataGroup3d.children.forEach(function(stratumMesh3d) {
                  stratumMesh3d.material.depthWrite = !undergroundMode3d;
                  stratumMesh3d.material.needsUpdate = true;
                });
                land3d.castShadow = !undergroundMode3d;
                lastUndergroundMode3d = undergroundMode3d;
              }
              var cutawayBlend3d = motionReduced3d ? 1 : 0.09;
              landMat3d.opacity += ((undergroundMode3d ? 0.28 : 1) - landMat3d.opacity) * cutawayBlend3d;
              groundCoverMat3d.opacity += ((undergroundMode3d ? 0.2 : 1) - groundCoverMat3d.opacity) * cutawayBlend3d;
              strataGroup3d.children.forEach(function(stratumMesh3d) {
                stratumMesh3d.material.opacity += ((undergroundMode3d ? 0.24 : 1) - stratumMesh3d.material.opacity) * cutawayBlend3d;
              });
              canvasEl.dataset.cutaway = String(undergroundMode3d);

              var plantTransferActive3d = state3d === 'plant_absorb' || state3d === 'transpiring' || state3d === 'transpiration';
              var rootTargetOpacity3d = plantTransferActive3d ? (undergroundMode3d ? 0.86 : 0.56) : 0.26;
              plantRootMat3d.opacity += (rootTargetOpacity3d - plantRootMat3d.opacity) * (motionReduced3d ? 1 : 0.1);
              plantRootMat3d.emissiveIntensity = plantTransferActive3d ? 0.72 : 0.16;
              plantRootPulseGroup3d.visible = plantTransferActive3d;
              plantRootPulseGroup3d.children.forEach(function(rootPulseMesh3d) {
                var rootPulseCurve3d = plantRootCurves3d[rootPulseMesh3d.userData.curveIndex];
                var rootPulsePhase3d = (rootPulseMesh3d.userData.phase + visualTime3d * 0.22) % 1;
                rootPulseMesh3d.position.copy(rootPulseCurve3d.getPointAt(rootPulsePhase3d));
                rootPulseMesh3d.scale.setScalar(0.75 + (motionReduced3d ? 0 : Math.sin(rootPulsePhase3d * Math.PI) * 0.7));
              });
              canvasEl.dataset.rootUptake = String(plantTransferActive3d);

              var stomatalReleaseActive3d = state3d === 'transpiring' || state3d === 'transpiration';
              var plantFlowStrength3d = Math.max(0.18, Math.min(1, 0.2 + solarVisual3d * 0.34 + windVisual3d * 0.12));
              var activeXylemCount3d = plantTransferActive3d ? (stomatalReleaseActive3d ? xylemFlowCurves3d.length : 2) : 0;
              xylemFlowGroup3d.visible = plantTransferActive3d;
              xylemFlowGroup3d.children.slice(0, xylemFlowCurves3d.length).forEach(function(xylemChannelMesh3d, xylemChannelIndex3d) {
                xylemChannelMesh3d.visible = xylemChannelIndex3d < activeXylemCount3d;
              });
              xylemFlowMat3d.opacity = plantTransferActive3d ? 0.14 + plantFlowStrength3d * 0.34 : 0;
              xylemMarkers3d.material.opacity = plantTransferActive3d ? 0.3 + plantFlowStrength3d * 0.5 : 0;
              xylemMarkers3d.material.size = 0.052 + plantFlowStrength3d * 0.035;
              if (plantTransferActive3d) {
                var xylemMarkerPosition3d = xylemMarkerGeometry3d.attributes.position;
                for (var xylemMarkerIndex3d = 0; xylemMarkerIndex3d < xylemMarkerPosition3d.count; xylemMarkerIndex3d++) {
                  var xylemCurveIndex3d = xylemMarkerIndex3d % activeXylemCount3d;
                  var xylemMarkerT3d = (xylemMarkerIndex3d / xylemMarkerPosition3d.count + visualTime3d * (0.07 + plantFlowStrength3d * 0.08)) % 1;
                  var xylemMarkerPoint3d = xylemFlowCurves3d[xylemCurveIndex3d].getPointAt(xylemMarkerT3d);
                  xylemMarkerPosition3d.setXYZ(xylemMarkerIndex3d, xylemMarkerPoint3d.x, xylemMarkerPoint3d.y, xylemMarkerPoint3d.z);
                }
                xylemMarkerPosition3d.needsUpdate = true;
              }

              stomatalReleaseGroup3d.visible = stomatalReleaseActive3d;
              stomatalReleaseGroup3d.children.forEach(function(stomatalRingMesh3d, stomatalRingIndex3d) {
                stomatalRingMesh3d.quaternion.copy(camera.quaternion);
                var stomatalPulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 2.5 + stomatalRingIndex3d) * 0.2;
                stomatalRingMesh3d.scale.setScalar(stomatalPulse3d);
              });
              stomatalReleaseMat3d.opacity = stomatalReleaseActive3d ? 0.22 + plantFlowStrength3d * 0.38 : 0;
              stomatalVapor3d.visible = stomatalReleaseActive3d;
              stomatalVapor3d.material.opacity = stomatalReleaseActive3d ? 0.24 + plantFlowStrength3d * 0.48 : 0;
              if (stomatalReleaseActive3d) {
                var stomatalVaporPosition3d = stomatalVaporGeometry3d.attributes.position;
                for (var stomatalVaporIndex3d = 0; stomatalVaporIndex3d < stomatalVaporPosition3d.count; stomatalVaporIndex3d++) {
                  var stomatalOriginIndex3d = stomatalVaporIndex3d % stomatalReleaseOrigins3d.length;
                  var stomatalOriginPoint3d = stomatalReleaseOrigins3d[stomatalOriginIndex3d];
                  var stomatalLayer3d = Math.floor(stomatalVaporIndex3d / stomatalReleaseOrigins3d.length);
                  var stomatalPhase3d = (stomatalLayer3d / 7 + visualTime3d * (0.045 + solarVisual3d * 0.025)) % 1;
                  stomatalVaporPosition3d.setXYZ(stomatalVaporIndex3d,
                    stomatalOriginPoint3d.x + stomatalPhase3d * windVisual3d * 0.28 + Math.sin(stomatalPhase3d * 8 + stomatalVaporIndex3d) * 0.05,
                    stomatalOriginPoint3d.y + stomatalPhase3d * (0.58 + solarVisual3d * 0.38),
                    stomatalOriginPoint3d.z + Math.cos(stomatalPhase3d * 7 + stomatalVaporIndex3d * 0.6) * 0.05
                  );
                }
                stomatalVaporPosition3d.needsUpdate = true;
              }
              canvasEl.dataset.xylemFlow = plantTransferActive3d ?
                (stomatalReleaseActive3d ? 'supplying-stomata' : 'ascending') : 'hidden';
              canvasEl.dataset.stomatalRelease = stomatalReleaseActive3d ? 'active' : 'hidden';

              var infiltrationFlowActive3d = state3d === 'infiltrating' || state3d === 'infiltration' || state3d === 'aquifer_flow';
              var wettingFrontActive3d = state3d === 'infiltrating' || state3d === 'infiltration';
              var aquiferRechargeActive3d = state3d === 'aquifer_flow';
              var infiltrationStrength3d = Math.max(0, Math.min(1, infiltrationVisual3d / 100));
              var wettingDepth3d = wettingFrontActive3d ?
                0.18 + journeyProgress3d * (0.68 + infiltrationStrength3d * 0.18) :
                (aquiferRechargeActive3d ? 1.02 : 0);
              var soilMoistureVisible3d = wettingFrontActive3d || aquiferRechargeActive3d;
              soilMoistureFrontGroup3d.visible = soilMoistureVisible3d;
              soilMoistureFrontGroup3d.position.set(4.5, -1.02 - wettingDepth3d * 0.5, -0.4);
              soilMoistureFrontGroup3d.children.forEach(function(frontLobeMesh3d) {
                var frontLobeWidth3d = frontLobeMesh3d.userData.baseScale * (0.72 + infiltrationStrength3d * 0.34);
                frontLobeMesh3d.scale.set(frontLobeWidth3d, Math.max(0.05, wettingDepth3d / 1.4), frontLobeWidth3d * 0.82);
              });
              soilMoistureFrontMat3d.opacity = soilMoistureVisible3d ?
                (aquiferRechargeActive3d ? 0.14 : 0.12 + infiltrationStrength3d * 0.14) : 0;

              var wettingPulse3d = motionReduced3d ? 0 : Math.sin(visualTime3d * 2.4) * 0.045;
              soilIntakePatch3d.visible = wettingFrontActive3d;
              var soilIntakeScale3d = 0.72 + journeyProgress3d * 0.42 + infiltrationStrength3d * 0.24 + wettingPulse3d;
              soilIntakePatch3d.scale.set(soilIntakeScale3d, soilIntakeScale3d * 0.72, 1);
              soilIntakeMat3d.opacity = wettingFrontActive3d ? 0.14 + infiltrationStrength3d * 0.28 : 0;

              wettingFrontRing3d.visible = soilMoistureVisible3d;
              wettingFrontRing3d.position.set(4.5, -1.0 - wettingDepth3d, -0.4);
              wettingFrontRing3d.scale.setScalar((0.68 + infiltrationStrength3d * 0.3) * (1 + wettingPulse3d));
              wettingFrontRingMat3d.opacity = soilMoistureVisible3d ?
                (aquiferRechargeActive3d ? 0.22 : 0.34 + infiltrationStrength3d * 0.22) : 0;

              waterTableRecharge3d.visible = aquiferRechargeActive3d;
              var rechargePulse3d = motionReduced3d ? 0 : Math.sin(visualTime3d * 1.8) * 0.06;
              waterTableRecharge3d.scale.set(1.45 + rechargePulse3d, 0.82 + rechargePulse3d * 0.5, 1);
              waterTableRechargeMat3d.opacity = aquiferRechargeActive3d ? 0.24 + infiltrationStrength3d * 0.3 : 0;
              var groundwaterRechargeTarget3d = aquiferRechargeActive3d ?
                Math.min(1, 0.38 + infiltrationStrength3d * 0.52) :
                (wettingFrontActive3d ?
                  Math.min(0.58, 0.2 + journeyProgress3d * infiltrationStrength3d * 0.34) : 0.18);
              var groundwaterStorageTrend3d = groundwaterRechargeTarget3d > groundwaterStorageMemory3d + 0.01 ?
                'rising' : (groundwaterRechargeTarget3d < groundwaterStorageMemory3d - 0.01 ? 'receding' : 'steady');
              if (!journeyPaused3d) {
                if (motionReduced3d) {
                  groundwaterStorageMemory3d = groundwaterRechargeTarget3d;
                } else if (groundwaterRechargeTarget3d > groundwaterStorageMemory3d) {
                  groundwaterStorageMemory3d = Math.min(groundwaterRechargeTarget3d,
                    groundwaterStorageMemory3d + frameDelta3d * (0.045 + infiltrationStrength3d * 0.08));
                } else {
                  groundwaterStorageMemory3d = Math.max(groundwaterRechargeTarget3d,
                    groundwaterStorageMemory3d - frameDelta3d * 0.006);
                }
              }
              var waterTableLevel3d = -2.08 + groundwaterStorageMemory3d * 0.34;
              waterTableRecharge3d.position.y = waterTableLevel3d + 0.015;
              var groundwaterStorageVisible3d = infiltrationFlowActive3d;
              groundwaterStorageGroup3d.visible = groundwaterStorageVisible3d;
              groundwaterStorageGroup3d.position.y = waterTableLevel3d;
              waterTableSurfaceMat3d.opacity = groundwaterStorageVisible3d ?
                0.16 + groundwaterStorageMemory3d * 0.3 : 0;
              waterTableSurfaceMat3d.emissiveIntensity = 0.24 + groundwaterStorageMemory3d * 0.32;
              waterTableRimMat3d.opacity = groundwaterStorageVisible3d ?
                0.22 + groundwaterStorageMemory3d * 0.52 : 0;
              var waterTableSurfacePosition3d = waterTableSurfaceGeometry3d.attributes.position;
              if (groundwaterStorageVisible3d) {
                for (var waterTableVertexIndex3d = 0;
                  waterTableVertexIndex3d < waterTableSurfacePosition3d.count;
                  waterTableVertexIndex3d++) {
                  var waterTableBaseIndex3d = waterTableVertexIndex3d * 3;
                  var waterTableX3d = waterTableSurfaceBasePositions3d[waterTableBaseIndex3d];
                  var waterTableY3d = waterTableSurfaceBasePositions3d[waterTableBaseIndex3d + 1];
                  var waterTableWave3d = motionReduced3d ? 0 :
                    (Math.sin(waterTableX3d * 1.35 + visualTime3d * 1.1) +
                      Math.cos(waterTableY3d * 1.1 - visualTime3d * 0.8)) *
                      (0.004 + groundwaterStorageMemory3d * 0.006);
                  waterTableSurfacePosition3d.setZ(waterTableVertexIndex3d, waterTableWave3d);
                }
                waterTableSurfacePosition3d.needsUpdate = true;
                waterTableSurfaceGeometry3d.computeVertexNormals();
              }
              var capillaryFringePosition3d = capillaryFringeGeometry3d.attributes.position;
              for (var capillaryFringeIndex3d = 0; capillaryFringeIndex3d < capillaryFringeCount3d; capillaryFringeIndex3d++) {
                var capillaryFringePhase3d = (capillaryFringeSeeds3d[capillaryFringeIndex3d * 3 + 1] +
                  visualTime3d * (0.012 + groundwaterStorageMemory3d * 0.03)) % 1;
                capillaryFringePosition3d.setXYZ(capillaryFringeIndex3d,
                  capillaryFringeSeeds3d[capillaryFringeIndex3d * 3] +
                    Math.sin(capillaryFringePhase3d * 8 + capillaryFringeIndex3d) * 0.035,
                  0.025 + capillaryFringePhase3d * (0.1 + groundwaterStorageMemory3d * 0.22),
                  capillaryFringeSeeds3d[capillaryFringeIndex3d * 3 + 2] +
                    Math.cos(capillaryFringePhase3d * 7 + capillaryFringeIndex3d * 0.6) * 0.035);
              }
              capillaryFringePosition3d.needsUpdate = true;
              capillaryFringe3d.material.opacity = groundwaterStorageVisible3d ?
                0.12 + groundwaterStorageMemory3d * 0.5 : 0;
              capillaryFringe3d.material.size = 0.045 + groundwaterStorageMemory3d * 0.04;
              if (waterTableLabel3d) {
                waterTableLabel3d.visible = groundwaterStorageVisible3d;
                waterTableLabel3d.position.y = waterTableLevel3d + 0.38;
              }
              canvasEl.dataset.waterTableStorage = String(Math.round(groundwaterStorageMemory3d * 100));
              canvasEl.dataset.waterTableTrend = groundwaterStorageVisible3d ? groundwaterStorageTrend3d : 'hidden';
              canvasEl.dataset.capillaryFringe = groundwaterStorageVisible3d ? 'visible' : 'hidden';
              canvasEl.dataset.soilMoistureFront = wettingFrontActive3d ? 'advancing' :
                (aquiferRechargeActive3d ? 'recharging-water-table' : 'hidden');
              canvasEl.dataset.surfaceIntake = soilIntakePatch3d.visible ? 'visible' : 'hidden';

              var canopyRainActive3d = coverVisual3d === 'forest' &&
                (precipitationTransfer3d || state3d === 'ground_choice') &&
                tempVisual3d >= 0 && !undergroundMode3d;
              var canopyStorageTarget3d = canopyRainActive3d ?
                Math.min(1, 0.22 + rainVisual3d / 100 * 0.78) : 0;
              if (!journeyPaused3d) {
                if (canopyStorageTarget3d > canopyStorageMemory3d) {
                  if (motionReduced3d) canopyStorageMemory3d = canopyStorageTarget3d;
                  else canopyStorageMemory3d = Math.min(canopyStorageTarget3d,
                    canopyStorageMemory3d + frameDelta3d * (0.08 + rainVisual3d * 0.002));
                } else if (!motionReduced3d) {
                  var canopyReleaseRate3d = frameDelta3d * (0.018 + windVisual3d * 0.012 + solarVisual3d * 0.018);
                  canopyStorageMemory3d = Math.max(0, canopyStorageMemory3d - canopyReleaseRate3d);
                }
              }
              var canopyThroughfallStrength3d = Math.max(0, (canopyStorageMemory3d - 0.25) / 0.75) *
                (canopyRainActive3d ? Math.min(1, 0.75 + rainVisual3d / 400) : 0.28);
              var canopyEvaporationStrength3d = canopyStorageMemory3d *
                Math.min(1, solarVisual3d / 2 * 0.65 + windVisual3d / 3 * 0.35) *
                (canopyRainActive3d ? 0.25 : 1);
              var canopyInterceptionVisible3d = coverVisual3d === 'forest' &&
                (canopyRainActive3d || canopyStorageMemory3d > 0.02) && !undergroundMode3d;
              canopyInterceptionGroup3d.visible = canopyInterceptionVisible3d;
              canopyBeadGeometry3d.setDrawRange(0, Math.max(1,
                Math.floor(canopyBeadCount3d * canopyStorageMemory3d)));
              canopyBeads3d.material.opacity = canopyInterceptionVisible3d ? 0.22 + canopyStorageMemory3d * 0.72 : 0;
              canopyBeads3d.material.size = 0.06 + canopyStorageMemory3d * 0.055;
              canopyThroughfall3d.material.opacity = canopyInterceptionVisible3d && canopyThroughfallStrength3d > 0.01 ?
                0.18 + canopyThroughfallStrength3d * 0.72 : 0;
              canopyThroughfall3d.material.size = 0.05 + canopyThroughfallStrength3d * 0.045;
              var canopyThroughfallPosition3d = canopyThroughfallGeometry3d.attributes.position;
              for (var canopyThroughfallIndex3d = 0; canopyThroughfallIndex3d < canopyThroughfallCount3d; canopyThroughfallIndex3d++) {
                var canopyThroughfallOriginIndex3d = canopyThroughfallIndex3d % canopyBeadCount3d;
                var canopyThroughfallPhase3d = (canopyThroughfallIndex3d / canopyThroughfallCount3d +
                  visualTime3d * (0.035 + canopyThroughfallStrength3d * 0.1)) % 1;
                var canopyThroughfallOriginY3d = canopyBeadOrigins3d[canopyThroughfallOriginIndex3d * 3 + 1];
                canopyThroughfallPosition3d.setXYZ(canopyThroughfallIndex3d,
                  canopyBeadOrigins3d[canopyThroughfallOriginIndex3d * 3] + canopyThroughfallPhase3d * windVisual3d * 0.025,
                  canopyThroughfallOriginY3d - canopyThroughfallPhase3d * (canopyThroughfallOriginY3d + 0.96),
                  canopyBeadOrigins3d[canopyThroughfallOriginIndex3d * 3 + 2]);
              }
              canopyThroughfallPosition3d.needsUpdate = true;
              canopyEvaporation3d.material.opacity = canopyInterceptionVisible3d && canopyEvaporationStrength3d > 0.01 ?
                0.12 + canopyEvaporationStrength3d * 0.62 : 0;
              var canopyEvaporationPosition3d = canopyEvaporationGeometry3d.attributes.position;
              for (var canopyEvaporationIndex3d = 0; canopyEvaporationIndex3d < canopyEvaporationCount3d; canopyEvaporationIndex3d++) {
                var canopyEvaporationOriginIndex3d = canopyEvaporationIndex3d % canopyBeadCount3d;
                var canopyEvaporationPhase3d = (canopyEvaporationIndex3d / canopyEvaporationCount3d +
                  visualTime3d * (0.025 + solarVisual3d * 0.018 + windVisual3d * 0.012)) % 1;
                canopyEvaporationPosition3d.setXYZ(canopyEvaporationIndex3d,
                  canopyBeadOrigins3d[canopyEvaporationOriginIndex3d * 3] + canopyEvaporationPhase3d * windVisual3d * 0.24,
                  canopyBeadOrigins3d[canopyEvaporationOriginIndex3d * 3 + 1] + canopyEvaporationPhase3d * (0.5 + solarVisual3d * 0.2),
                  canopyBeadOrigins3d[canopyEvaporationOriginIndex3d * 3 + 2] +
                    Math.sin(canopyEvaporationPhase3d * 7 + canopyEvaporationIndex3d) * 0.06);
              }
              canopyEvaporationPosition3d.needsUpdate = true;
              if (canopyInterceptionLabel3d) canopyInterceptionLabel3d.visible = canopyInterceptionVisible3d;
              canvasEl.dataset.canopyStorage = String(Math.round(canopyStorageMemory3d * 100));
              canvasEl.dataset.canopyThroughfall = canopyThroughfallStrength3d > 0.02 ? 'delayed-drip' : 'hidden';
              canvasEl.dataset.canopyEvaporation = canopyEvaporationStrength3d > 0.02 ? 'returning-to-air' : 'hidden';

              var urbanRainActive3d = coverVisual3d === 'urban' &&
                (precipitationTransfer3d || state3d === 'ground_choice') &&
                tempVisual3d >= 0 && !undergroundMode3d;
              var urbanStormTarget3d = urbanRainActive3d ?
                Math.min(1, 0.25 + rainVisual3d / 100 * 0.75) : 0;
              if (!journeyPaused3d) {
                if (motionReduced3d) {
                  urbanStormPulseMemory3d = urbanStormTarget3d;
                } else if (urbanStormTarget3d > urbanStormPulseMemory3d) {
                  urbanStormPulseMemory3d = Math.min(urbanStormTarget3d, urbanStormPulseMemory3d +
                      frameDelta3d * (0.2 + rainVisual3d * 0.003));
                } else {
                  urbanStormPulseMemory3d = Math.max(0, urbanStormPulseMemory3d - frameDelta3d * 0.09);
                }
              }
              var urbanStormFlowStrength3d = coverVisual3d === 'urban' ?
                Math.max(urbanStormPulseMemory3d, Math.min(1, runoffVisual3d / 100 * 0.88)) : 0;
              var urbanStormwaterVisible3d = coverVisual3d === 'urban' &&
                (urbanRainActive3d || urbanStormPulseMemory3d > 0.02 || state3d === 'river_runoff') &&
                !undergroundMode3d;
              urbanStormwaterGroup3d.visible = urbanStormwaterVisible3d;
              urbanRoofRunoff3d.material.opacity = urbanRainActive3d ? 0.2 + urbanStormFlowStrength3d * 0.72 : 0;
              urbanRoofRunoff3d.material.size = 0.055 + urbanStormFlowStrength3d * 0.045;
              var urbanRoofRunoffPosition3d = urbanRoofRunoffGeometry3d.attributes.position;
              for (var urbanRoofRunoffIndex3d = 0; urbanRoofRunoffIndex3d < urbanRoofRunoffCount3d; urbanRoofRunoffIndex3d++) {
                var urbanRoofRunoffPhase3d = (urbanRoofRunoffIndex3d / urbanRoofRunoffCount3d +
                  visualTime3d * (0.08 + rainVisual3d * 0.0015)) % 1;
                var urbanRoofRunoffOriginY3d = urbanRoofRunoffOrigins3d[urbanRoofRunoffIndex3d * 3 + 1];
                urbanRoofRunoffPosition3d.setXYZ(urbanRoofRunoffIndex3d,
                  urbanRoofRunoffOrigins3d[urbanRoofRunoffIndex3d * 3] +
                    urbanRoofRunoffPhase3d * windVisual3d * 0.03,
                  urbanRoofRunoffOriginY3d - urbanRoofRunoffPhase3d * (urbanRoofRunoffOriginY3d + 0.95),
                  urbanRoofRunoffOrigins3d[urbanRoofRunoffIndex3d * 3 + 2]);
              }
              urbanRoofRunoffPosition3d.needsUpdate = true;
              urbanStormwaterMaterial3d.opacity = urbanStormwaterVisible3d ?
                0.14 + urbanStormFlowStrength3d * 0.5 : 0;
              urbanStormMarkers3d.material.opacity = urbanStormwaterVisible3d ?
                0.2 + urbanStormFlowStrength3d * 0.72 : 0;
              urbanStormMarkers3d.material.size = 0.05 + urbanStormFlowStrength3d * 0.05;
              var urbanStormMarkerPosition3d = urbanStormMarkerGeometry3d.attributes.position;
              for (var urbanStormMarkerIndex3d = 0; urbanStormMarkerIndex3d < urbanStormMarkerCount3d; urbanStormMarkerIndex3d++) {
                var urbanStormMarkerCurve3d = urbanStormwaterCurves3d[urbanStormMarkerIndex3d % urbanStormwaterCurves3d.length];
                var urbanStormMarkerT3d = (urbanStormMarkerIndex3d / urbanStormMarkerCount3d +
                  visualTime3d * (0.045 + urbanStormFlowStrength3d * 0.13)) % 1;
                var urbanStormMarkerPoint3d = urbanStormMarkerCurve3d.getPointAt(urbanStormMarkerT3d);
                urbanStormMarkerPosition3d.setXYZ(urbanStormMarkerIndex3d,
                  urbanStormMarkerPoint3d.x, urbanStormMarkerPoint3d.y, urbanStormMarkerPoint3d.z);
              }
              urbanStormMarkerPosition3d.needsUpdate = true;
              urbanStormDrain3d.scale.setScalar(1 + (motionReduced3d ? 0 :
                Math.sin(visualTime3d * 3.2) * 0.12) * urbanStormFlowStrength3d);
              urbanStormDrain3d.material.opacity = urbanStormwaterVisible3d ?
                0.55 + urbanStormFlowStrength3d * 0.4 : 0;
              if (urbanStormwaterLabel3d) urbanStormwaterLabel3d.visible = urbanStormwaterVisible3d;
              canvasEl.dataset.roofRunoff = urbanRainActive3d ? 'rapid-shedding' : 'hidden';
              canvasEl.dataset.stormDrain = urbanStormwaterVisible3d ? 'converging-flow' : 'hidden';
              canvasEl.dataset.urbanRunoffPulse = String(Math.round(urbanStormFlowStrength3d * 100));

              var meadowRainActive3d = coverVisual3d === 'grass' &&
                (precipitationTransfer3d || state3d === 'ground_choice') &&
                tempVisual3d >= 0 && !undergroundMode3d;
              var meadowRetentionTarget3d = meadowRainActive3d ?
                Math.min(1, 0.16 + rainVisual3d / 100 * 0.64) : 0;
              if (!journeyPaused3d) {
                if (motionReduced3d) {
                  meadowRetentionMemory3d = meadowRetentionTarget3d;
                } else if (meadowRetentionTarget3d > meadowRetentionMemory3d) {
                  meadowRetentionMemory3d = Math.min(meadowRetentionTarget3d,
                    meadowRetentionMemory3d + frameDelta3d *
                      (0.07 + infiltrationStrength3d * 0.1 + rainVisual3d * 0.0012));
                } else {
                  meadowRetentionMemory3d = Math.max(0, meadowRetentionMemory3d -
                    frameDelta3d * (0.025 + infiltrationStrength3d * 0.05 + solarVisual3d * 0.008));
                }
              }
              var meadowInfiltrationStrength3d = coverVisual3d === 'grass' ?
                Math.min(1, infiltrationStrength3d * 0.55 + meadowRetentionMemory3d * 0.65) : 0;
              var meadowHydrologyVisible3d = coverVisual3d === 'grass' &&
                (meadowRainActive3d || meadowRetentionMemory3d > 0.02 || infiltrationFlowActive3d);
              meadowHydrologyGroup3d.visible = meadowHydrologyVisible3d;
              meadowRetentionBeadGeometry3d.setDrawRange(0, Math.max(1,
                Math.floor(meadowRetentionBeadCount3d * meadowRetentionMemory3d)));
              meadowRetentionBeads3d.material.opacity = meadowHydrologyVisible3d && !undergroundMode3d ?
                0.18 + meadowRetentionMemory3d * 0.7 : 0;
              meadowRetentionBeads3d.material.size = 0.055 + meadowRetentionMemory3d * 0.04;
              meadowInfiltrationMaterial3d.opacity = meadowHydrologyVisible3d ?
                0.08 + meadowInfiltrationStrength3d * 0.38 : 0;
              meadowInfiltrationMarkers3d.material.opacity = meadowHydrologyVisible3d ?
                0.16 + meadowInfiltrationStrength3d * 0.68 : 0;
              meadowInfiltrationMarkers3d.material.size = 0.045 + meadowInfiltrationStrength3d * 0.045;
              var meadowInfiltrationMarkerPosition3d = meadowInfiltrationMarkerGeometry3d.attributes.position;
              for (var meadowInfiltrationMarkerIndex3d = 0;
                meadowInfiltrationMarkerIndex3d < meadowInfiltrationMarkerCount3d;
                meadowInfiltrationMarkerIndex3d++) {
                var meadowInfiltrationMarkerCurve3d =
                  meadowInfiltrationCurves3d[meadowInfiltrationMarkerIndex3d % meadowInfiltrationCurves3d.length];
                var meadowInfiltrationMarkerT3d = (meadowInfiltrationMarkerIndex3d /
                  meadowInfiltrationMarkerCount3d + visualTime3d *
                    (0.018 + meadowInfiltrationStrength3d * 0.07)) % 1;
                var meadowInfiltrationMarkerPoint3d =
                  meadowInfiltrationMarkerCurve3d.getPointAt(meadowInfiltrationMarkerT3d);
                meadowInfiltrationMarkerPosition3d.setXYZ(meadowInfiltrationMarkerIndex3d,
                  meadowInfiltrationMarkerPoint3d.x, meadowInfiltrationMarkerPoint3d.y,
                  meadowInfiltrationMarkerPoint3d.z);
              }
              meadowInfiltrationMarkerPosition3d.needsUpdate = true;
              if (meadowInfiltrationLabel3d) meadowInfiltrationLabel3d.visible = meadowHydrologyVisible3d;
              canvasEl.dataset.grassRetention = String(Math.round(meadowRetentionMemory3d * 100));
              canvasEl.dataset.grassInfiltration = meadowHydrologyVisible3d ? 'shallow-percolation' : 'hidden';

              var runoffCoverFactor3d = coverVisual3d === 'urban' ? 1.25 : (coverVisual3d === 'forest' ? 0.46 : 0.78);
              if (coverVisual3d === 'forest') runoffCoverFactor3d *= 1 - canopyStorageMemory3d * 0.18;
              if (coverVisual3d === 'urban') runoffCoverFactor3d *= 1 + urbanStormPulseMemory3d * 0.08;
              if (coverVisual3d === 'grass') runoffCoverFactor3d *= 1 - meadowRetentionMemory3d * 0.12;
              var effectiveRunoff3d = Math.max(0, Math.min(100, runoffVisual3d * runoffCoverFactor3d));
              var runoffRouteActive3d = state3d === 'river_runoff' && !undergroundMode3d;
              var floodplainStorageTarget3d = runoffRouteActive3d ?
                Math.max(0, Math.min(1, (effectiveRunoff3d - 42) / 58)) : 0;
              var floodplainStorageTrend3d = floodplainStorageTarget3d > floodplainStorageMemory3d + 0.01 ?
                'filling' : (floodplainStorageTarget3d < floodplainStorageMemory3d - 0.01 ? 'draining' : 'stored');
              if (!journeyPaused3d) {
                if (motionReduced3d) {
                  floodplainStorageMemory3d = floodplainStorageTarget3d;
                } else if (floodplainStorageTarget3d > floodplainStorageMemory3d) {
                  floodplainStorageMemory3d = Math.min(floodplainStorageTarget3d,
                    floodplainStorageMemory3d + frameDelta3d * (0.07 + effectiveRunoff3d * 0.0015));
                } else {
                  floodplainStorageMemory3d = Math.max(floodplainStorageTarget3d,
                    floodplainStorageMemory3d - frameDelta3d * 0.018);
                }
              }
              var floodplainStorageVisible3d = !undergroundMode3d && floodplainStorageMemory3d > 0.015;
              floodplainStorageGroup3d.visible = floodplainStorageVisible3d;
              floodplainPoolMat3d.opacity = floodplainStorageVisible3d ?
                0.08 + floodplainStorageMemory3d * 0.42 : 0;
              floodplainEdgeMat3d.opacity = floodplainStorageVisible3d ?
                0.16 + floodplainStorageMemory3d * 0.55 : 0;
              floodplainPools3d.forEach(function(floodplainPool3d, floodplainPoolIndex3d) {
                var floodplainStorageDelay3d = floodplainPool3d.userData.storageDelay;
                var localFloodplainStorage3d = Math.max(0, Math.min(1,
                  (floodplainStorageMemory3d - floodplainStorageDelay3d) / (1 - floodplainStorageDelay3d)));
                var floodplainPoolPulse3d = motionReduced3d ? 0 :
                  Math.sin(visualTime3d * 1.35 + floodplainPoolIndex3d) * 0.018;
                var floodplainPoolScale3d = 0.28 + localFloodplainStorage3d * 0.92 + floodplainPoolPulse3d;
                floodplainPool3d.visible = localFloodplainStorage3d > 0.005;
                floodplainPool3d.scale.set(
                  floodplainPool3d.userData.baseScaleX * floodplainPoolScale3d,
                  floodplainPool3d.userData.baseScaleY * floodplainPoolScale3d, 1);
                floodplainEdges3d[floodplainPoolIndex3d].visible = floodplainPool3d.visible;
                floodplainEdges3d[floodplainPoolIndex3d].scale.copy(floodplainPool3d.scale);
              });
              floodplainExchangeMat3d.opacity = floodplainStorageVisible3d ?
                0.12 + floodplainStorageMemory3d * 0.42 : 0;
              floodplainExchangeMarkers3d.material.opacity = floodplainStorageVisible3d ?
                0.2 + floodplainStorageMemory3d * 0.62 : 0;
              floodplainExchangeMarkers3d.material.size = 0.045 + floodplainStorageMemory3d * 0.04;
              floodplainExchangeMarkerGeometry3d.setDrawRange(0, Math.max(1,
                Math.floor(floodplainExchangeMarkerCount3d * (0.25 + floodplainStorageMemory3d * 0.75))));
              var floodplainExchangeMarkerPosition3d = floodplainExchangeMarkerGeometry3d.attributes.position;
              for (var floodplainMarkerIndex3d = 0; floodplainMarkerIndex3d < floodplainExchangeMarkerCount3d; floodplainMarkerIndex3d++) {
                var floodplainCurveIndex3d = floodplainMarkerIndex3d % floodplainExchangeCurves3d.length;
                var floodplainMarkerPhase3d = (floodplainMarkerIndex3d / floodplainExchangeMarkerCount3d +
                  visualTime3d * (0.018 + floodplainStorageMemory3d * 0.055)) % 1;
                var floodplainMarkerT3d = floodplainStorageTrend3d === 'draining' ?
                  1 - floodplainMarkerPhase3d : floodplainMarkerPhase3d;
                var floodplainMarkerPoint3d = floodplainExchangeCurves3d[floodplainCurveIndex3d].getPointAt(floodplainMarkerT3d);
                floodplainExchangeMarkerPosition3d.setXYZ(floodplainMarkerIndex3d,
                  floodplainMarkerPoint3d.x, floodplainMarkerPoint3d.y, floodplainMarkerPoint3d.z);
              }
              floodplainExchangeMarkerPosition3d.needsUpdate = true;
              if (floodplainStorageLabel3d) floodplainStorageLabel3d.visible = floodplainStorageVisible3d;
              canvasEl.dataset.floodplainStorage = String(Math.round(floodplainStorageMemory3d * 100));
              canvasEl.dataset.floodplainExchange = floodplainStorageVisible3d ? floodplainStorageTrend3d : 'hidden';
              var activeTributaryCount3d = runoffRouteActive3d ?
                Math.max(1, Math.min(surfaceRunoffCurves3d.length, Math.ceil(effectiveRunoff3d / 25))) : 0;
              surfaceRunoffTributaries3d.visible = runoffRouteActive3d;
              surfaceRunoffChannels3d.forEach(function(tributaryMesh3d, tributaryIndex3d) {
                tributaryMesh3d.visible = tributaryIndex3d < activeTributaryCount3d;
              });
              surfaceRunoffMat3d.opacity = runoffRouteActive3d ? 0.16 + effectiveRunoff3d / 210 : 0;
              surfaceRunoffMarkers3d.material.opacity = runoffRouteActive3d ? 0.28 + effectiveRunoff3d / 155 : 0;
              surfaceRunoffMarkers3d.material.size = 0.058 + effectiveRunoff3d / 1250;
              if (runoffRouteActive3d) {
                var surfaceRunoffMarkerPosition3d = surfaceRunoffMarkerGeometry3d.attributes.position;
                for (var surfaceMarkerIndex3d = 0; surfaceMarkerIndex3d < surfaceRunoffMarkerPosition3d.count; surfaceMarkerIndex3d++) {
                  var surfaceCurveIndex3d = surfaceMarkerIndex3d % activeTributaryCount3d;
                  var surfaceMarkerT3d = (surfaceMarkerIndex3d / surfaceRunoffMarkerPosition3d.count + visualTime3d * (0.045 + effectiveRunoff3d * 0.0017)) % 1;
                  var surfaceMarkerPoint3d = surfaceRunoffCurves3d[surfaceCurveIndex3d].getPointAt(surfaceMarkerT3d);
                  surfaceRunoffMarkerPosition3d.setXYZ(surfaceMarkerIndex3d, surfaceMarkerPoint3d.x, surfaceMarkerPoint3d.y, surfaceMarkerPoint3d.z);
                }
                surfaceRunoffMarkerPosition3d.needsUpdate = true;
              }
              runoffConfluenceGroup3d.visible = runoffRouteActive3d;
              runoffConfluenceGroup3d.children.forEach(function(confluenceRingMesh3d, confluenceIndex3d) {
                confluenceRingMesh3d.visible = confluenceIndex3d < activeTributaryCount3d;
                var confluencePulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 2.7 + confluenceIndex3d) * 0.18;
                confluenceRingMesh3d.scale.setScalar(confluencePulse3d);
              });
              runoffConfluenceMat3d.opacity = runoffRouteActive3d ? 0.24 + effectiveRunoff3d / 220 : 0;
              canvasEl.dataset.tributaryCount = String(activeTributaryCount3d);
              canvasEl.dataset.surfaceDrainage = runoffRouteActive3d ?
                (coverVisual3d === 'urban' ? 'urban-rapid' : (coverVisual3d === 'forest' ? 'forest-buffered' : 'grass-moderate')) : 'hidden';
              riverFlow3d.visible = runoffVisual3d > 6 && !undergroundMode3d;
              riverFlow3d.material.opacity = Math.min(0.92, 0.18 + runoffVisual3d / 125);
              riverFlow3d.material.size = 0.065 + runoffVisual3d / 1800;
              var riverMarkerPosition3d = riverMarkerGeometry3d.attributes.position;
              for (var riverMarkerIndex3d = 0; riverMarkerIndex3d < riverMarkerPosition3d.count; riverMarkerIndex3d++) {
                var riverMarkerT3d = (riverMarkerIndex3d / riverMarkerPosition3d.count + visualTime3d * (0.025 + runoffVisual3d * 0.0014)) % 1;
                var riverMarkerPoint3d = riverCurve.getPointAt(riverMarkerT3d);
                riverMarkerPosition3d.setXYZ(riverMarkerIndex3d, riverMarkerPoint3d.x, riverMarkerPoint3d.y, riverMarkerPoint3d.z);
              }
              riverMarkerPosition3d.needsUpdate = true;

              var sedimentCoverFactor3d = coverVisual3d === 'urban' ? 1 :
                (coverVisual3d === 'forest' ? 0.38 : 0.72);
              var sedimentStrength3d = runoffRouteActive3d ?
                Math.min(1, effectiveRunoff3d / 100 * sedimentCoverFactor3d * 1.15) *
                  (1 - floodplainStorageMemory3d * 0.18) : 0;
              var sedimentTransportVisible3d = runoffRouteActive3d && sedimentStrength3d > 0.025;
              riverTurbidity3d.visible = sedimentTransportVisible3d;
              riverTurbidityMat3d.opacity = sedimentTransportVisible3d ?
                0.025 + sedimentStrength3d * 0.26 : 0;
              suspendedSediment3d.visible = sedimentTransportVisible3d;
              suspendedSedimentGeometry3d.setDrawRange(0, Math.max(1,
                Math.floor(suspendedSedimentCount3d * (0.22 + sedimentStrength3d * 0.78))));
              suspendedSediment3d.material.opacity = sedimentTransportVisible3d ?
                0.16 + sedimentStrength3d * 0.74 : 0;
              suspendedSediment3d.material.size = 0.042 + sedimentStrength3d * 0.045;
              var suspendedSedimentPosition3d = suspendedSedimentGeometry3d.attributes.position;
              for (var sedimentIndex3d = 0; sedimentIndex3d < suspendedSedimentCount3d; sedimentIndex3d++) {
                var sedimentPhase3d = (suspendedSedimentSeeds3d[sedimentIndex3d * 3] +
                  visualTime3d * (0.025 + effectiveRunoff3d * 0.0015)) % 1;
                var sedimentCrossStream3d = suspendedSedimentSeeds3d[sedimentIndex3d * 3 + 1] - 0.5;
                var sedimentDepthSeed3d = suspendedSedimentSeeds3d[sedimentIndex3d * 3 + 2] - 0.5;
                if (sedimentPhase3d < 0.72) {
                  var sedimentRiverT3d = sedimentPhase3d / 0.72;
                  var sedimentRiverPoint3d = riverCurve.getPointAt(sedimentRiverT3d);
                  suspendedSedimentPosition3d.setXYZ(sedimentIndex3d,
                    sedimentRiverPoint3d.x + Math.sin(sedimentRiverT3d * 18 + sedimentIndex3d) * 0.035,
                    sedimentRiverPoint3d.y + sedimentDepthSeed3d * 0.13,
                    sedimentRiverPoint3d.z + sedimentCrossStream3d * 0.18);
                } else {
                  var sedimentPlumeT3d = (sedimentPhase3d - 0.72) / 0.28;
                  suspendedSedimentPosition3d.setXYZ(sedimentIndex3d,
                    -0.3 - sedimentPlumeT3d * (0.65 + sedimentStrength3d * 0.85),
                    -1.12 - sedimentPlumeT3d * 0.04 + sedimentDepthSeed3d * 0.08,
                    1.6 + sedimentCrossStream3d *
                      (0.15 + sedimentPlumeT3d * (0.32 + sedimentStrength3d * 0.3)));
                }
              }
              suspendedSedimentPosition3d.needsUpdate = true;
              sedimentPlume3d.visible = sedimentTransportVisible3d;
              sedimentPlumeMat3d.opacity = sedimentTransportVisible3d ?
                0.025 + sedimentStrength3d * 0.18 : 0;
              sedimentPlume3d.scale.set(0.48 + sedimentStrength3d * 0.62,
                0.68 + sedimentStrength3d * 0.32, 1);
              if (sedimentTransportLabel3d) sedimentTransportLabel3d.visible = sedimentTransportVisible3d;
              var riverTurbidityBand3d = sedimentStrength3d > 0.65 ? 'high' :
                (sedimentStrength3d > 0.3 ? 'moderate' : 'low');
              canvasEl.dataset.sedimentTransport = sedimentTransportVisible3d ? 'river-to-estuary' : 'hidden';
              canvasEl.dataset.riverTurbidity = sedimentTransportVisible3d ? riverTurbidityBand3d : 'clear';
              canvasEl.dataset.floodplainSedimentTrap = floodplainStorageVisible3d ?
                'settling-suspended-material' : 'hidden';

              aquiferFlow3d.visible = infiltrationFlowActive3d;
              aquiferFlow3d.material.opacity = Math.min(0.94, 0.3 + infiltrationVisual3d / 145);
              var aquiferMarkerPosition3d = aquiferMarkerGeometry3d.attributes.position;
              for (var aquiferMarkerIndex3d = 0; aquiferMarkerIndex3d < aquiferMarkerPosition3d.count; aquiferMarkerIndex3d++) {
                var aquiferMarkerT3d = (aquiferMarkerIndex3d / aquiferMarkerPosition3d.count + visualTime3d * (0.008 + infiltrationVisual3d * 0.00042)) % 1;
                var aquiferMarkerPoint3d = aquiferCurrentCurve3d.getPointAt(aquiferMarkerT3d);
                aquiferMarkerPosition3d.setXYZ(aquiferMarkerIndex3d, aquiferMarkerPoint3d.x, aquiferMarkerPoint3d.y, aquiferMarkerPoint3d.z);
              }
              aquiferMarkerPosition3d.needsUpdate = true;

              var oceanCurrentActive3d = state3d === 'ocean' || state3d === 'complete' ||
                state3d === 'river_runoff' || state3d === 'aquifer_flow';
              oceanCurrentGroup3d.visible = oceanCurrentActive3d;
              var oceanCurrentPulse3d = motionReduced3d ? 0 : Math.sin(visualTime3d * 1.25) * 0.025;
              oceanCurrentMat3d.opacity = oceanCurrentActive3d ? 0.1 + windVisual3d * 0.035 + oceanCurrentPulse3d : 0;
              oceanCurrentMarkers3d.material.opacity = oceanCurrentActive3d ? 0.3 + windVisual3d * 0.08 : 0;
              oceanCurrentMarkers3d.material.size = 0.066 + windVisual3d * 0.009;
              if (oceanCurrentActive3d) {
                var oceanCurrentMarkerPosition3d = oceanCurrentMarkerGeometry3d.attributes.position;
                for (var oceanCurrentMarkerIndex3d = 0; oceanCurrentMarkerIndex3d < oceanCurrentMarkerPosition3d.count; oceanCurrentMarkerIndex3d++) {
                  var oceanCurrentCurveIndex3d = oceanCurrentMarkerIndex3d % oceanCurrentCurves3d.length;
                  var oceanCurrentMarkerT3d = (oceanCurrentMarkerIndex3d / oceanCurrentMarkerPosition3d.count +
                    visualTime3d * (0.018 + windVisual3d * 0.012)) % 1;
                  var oceanCurrentMarkerPoint3d = oceanCurrentCurves3d[oceanCurrentCurveIndex3d].getPointAt(oceanCurrentMarkerT3d);
                  oceanCurrentMarkerPosition3d.setXYZ(oceanCurrentMarkerIndex3d,
                    oceanCurrentMarkerPoint3d.x, oceanCurrentMarkerPoint3d.y, oceanCurrentMarkerPoint3d.z);
                }
                oceanCurrentMarkerPosition3d.needsUpdate = true;
              }

              var estuaryMixingActive3d = state3d === 'river_runoff' && !undergroundMode3d;
              estuaryProbeEnabled3d = estuaryMixingActive3d;
              estuaryMixing3d.visible = estuaryMixingActive3d;
              estuaryMixing3d.material.opacity = estuaryMixingActive3d ? 0.28 + effectiveRunoff3d / 190 : 0;
              estuaryMixing3d.material.size = 0.065 + effectiveRunoff3d / 1250;
              estuaryMixingRibbon3d.visible = estuaryMixingActive3d;
              estuaryMixingRibbon3d.material.opacity = estuaryMixingActive3d ? 0.08 + effectiveRunoff3d / 520 : 0;
              estuarySalinityLabelGroup3d.visible = estuaryMixingActive3d;
              if (!estuaryMixingActive3d && hoveredSalinityZone3d) {
                hoveredSalinityZone3d = '';
                canvasEl.dataset.salinityHover = 'none';
                canvasEl.style.cursor = '';
              }
              estuarySalinityLabels3d.forEach(function(estuarySalinityLabel3d) {
                var salinityLabelSelected3d = hoveredSalinityZone3d === estuarySalinityLabel3d.userData.salinityZone;
                var salinityLabelMuted3d = !!hoveredSalinityZone3d && !salinityLabelSelected3d;
                estuarySalinityLabel3d.material.opacity = salinityLabelMuted3d ? 0.34 : 0.94;
                var salinityLabelScale3d = salinityLabelSelected3d ? 1.72 : 1.55;
                estuarySalinityLabel3d.scale.set(salinityLabelScale3d, salinityLabelScale3d * 0.25, 1);
              });
              var salinityProbeVisible3d = estuaryMixingActive3d && !!hoveredSalinityZone3d;
              estuarySalinityProbe3d.visible = salinityProbeVisible3d;
              estuarySalinityProbeMat3d.opacity = salinityProbeVisible3d ? 0.86 : 0;
              if (salinityProbeVisible3d) {
                estuarySalinityProbe3d.position.copy(estuaryProbePoint3d);
                estuarySalinityProbe3d.position.y += 0.045;
                var salinityProbePulse3d = motionReduced3d ? 1 : 1 + Math.sin(visualTime3d * 3.2) * 0.16;
                estuarySalinityProbe3d.scale.setScalar(salinityProbePulse3d);
              }
              if (estuaryMixingActive3d) {
                var estuaryMixingPosition3d = estuaryMixingGeometry3d.attributes.position;
                var estuaryMixingColor3d = estuaryMixingGeometry3d.attributes.color;
                for (var estuaryMixingIndex3d = 0; estuaryMixingIndex3d < estuaryMixingPosition3d.count; estuaryMixingIndex3d++) {
                  var estuaryPhase3d = (estuaryMixingSeeds3d[estuaryMixingIndex3d * 3] +
                    visualTime3d * (0.08 + effectiveRunoff3d * 0.001)) % 1;
                  var estuaryAngle3d = estuaryMixingSeeds3d[estuaryMixingIndex3d * 3 + 1] * Math.PI * 2 + estuaryPhase3d * 2;
                  var estuarySpread3d = 0.05 + estuaryPhase3d * (0.22 + effectiveRunoff3d * 0.0014);
                  estuaryMixingPosition3d.setXYZ(estuaryMixingIndex3d,
                    -0.25 - estuaryPhase3d * (0.72 + effectiveRunoff3d * 0.004) + Math.cos(estuaryAngle3d) * estuarySpread3d * 0.38,
                    -1.08 - estuaryPhase3d * 0.06 + Math.sin(estuaryPhase3d * Math.PI * 2) * 0.022,
                    1.6 + Math.sin(estuaryAngle3d) * estuarySpread3d +
                      (estuaryMixingSeeds3d[estuaryMixingIndex3d * 3 + 2] - 0.5) * 0.08
                  );
                  setEstuarySalinityColor3d(estuaryMixingColor3d, estuaryMixingIndex3d, estuaryPhase3d);
                }
                estuaryMixingPosition3d.needsUpdate = true;
                estuaryMixingColor3d.needsUpdate = true;
              }
              canvasEl.dataset.salinityGradient = estuaryMixingActive3d ? 'freshwater,brackish,marine' : 'hidden';

              var groundwaterSeepActive3d = state3d === 'aquifer_flow';
              groundwaterSeep3d.visible = groundwaterSeepActive3d;
              groundwaterSeep3d.material.opacity = groundwaterSeepActive3d ? 0.3 + infiltrationVisual3d / 190 : 0;
              groundwaterSeep3d.material.size = 0.062 + infiltrationVisual3d / 1500;
              if (groundwaterSeepActive3d) {
                var groundwaterSeepPosition3d = groundwaterSeepGeometry3d.attributes.position;
                for (var groundwaterSeepIndex3d = 0; groundwaterSeepIndex3d < groundwaterSeepPosition3d.count; groundwaterSeepIndex3d++) {
                  var groundwaterSeepPhase3d = (groundwaterSeepSeeds3d[groundwaterSeepIndex3d * 2] +
                    visualTime3d * (0.04 + infiltrationVisual3d * 0.0005)) % 1;
                  var groundwaterSeepAngle3d = groundwaterSeepSeeds3d[groundwaterSeepIndex3d * 2 + 1] * Math.PI * 2;
                  groundwaterSeepPosition3d.setXYZ(groundwaterSeepIndex3d,
                    -0.55 - groundwaterSeepPhase3d * 0.55 + Math.sin(groundwaterSeepAngle3d + groundwaterSeepPhase3d * 4) * 0.08,
                    -1.3 + groundwaterSeepPhase3d * 0.2,
                    1.48 + Math.cos(groundwaterSeepAngle3d) * (0.08 + groundwaterSeepPhase3d * 0.18)
                  );
                }
                groundwaterSeepPosition3d.needsUpdate = true;
              }
              canvasEl.dataset.oceanExchange = estuaryMixingActive3d ? 'river-mixing' :
                (groundwaterSeepActive3d ? 'groundwater-discharge' : (oceanCurrentActive3d ? 'collection-currents' : 'hidden'));

              soilPercolation3d.visible = infiltrationFlowActive3d;
              soilPercolation3d.material.opacity = Math.min(0.88, 0.2 + infiltrationVisual3d / 150);
              var percolationPosition3d = percolationGeometry3d.attributes.position;
              for (var soilDropIndex3d = 0; soilDropIndex3d < percolationPosition3d.count; soilDropIndex3d++) {
                var soilDropPhase3d = (soilDropIndex3d / percolationPosition3d.count + visualTime3d * (0.035 + infiltrationVisual3d * 0.0008)) % 1;
                percolationPosition3d.setY(soilDropIndex3d, -1.04 - soilDropPhase3d * 1.14);
              }
              percolationPosition3d.needsUpdate = true;
              canvasEl.dataset.surfaceFlow = riverFlow3d.visible ? 'moving' : 'quiet';
              canvasEl.dataset.groundwaterFlow = aquiferFlow3d.visible ? 'moving' : 'hidden';
              canvasEl.dataset.percolation = soilPercolation3d.visible ? 'visible' : 'hidden';

              var atmosphericTransfer3d = vaporTransfer3d || condensationTransfer3d || precipitationTransfer3d;
              var showWindField3d = atmosphericTransfer3d && windVisual3d > 0.12;
              windStreams3d.visible = showWindField3d;
              if (windTransportLabel3d) windTransportLabel3d.visible = showWindField3d && !undergroundMode3d;
              windStreamMat3d.opacity = 0.07 + Math.min(0.28, windVisual3d * 0.08);
              windMarkers3d.material.opacity = 0.24 + Math.min(0.56, windVisual3d * 0.18);
              windArrowMat3d.opacity = showWindField3d ? 0.34 + Math.min(0.58, windVisual3d * 0.18) : 0;
              var windMarkerPosition3d = windMarkerGeometry3d.attributes.position;
              for (var windMarkerIndex3d = 0; windMarkerIndex3d < windMarkerPosition3d.count; windMarkerIndex3d++) {
                var windCurveIndex3d = windMarkerIndex3d % windStreamCurves3d.length;
                var windMarkerT3d = (windMarkerIndex3d / windMarkerPosition3d.count + visualTime3d * (0.025 + windVisual3d * 0.035)) % 1;
                var windMarkerPoint3d = windStreamCurves3d[windCurveIndex3d].getPointAt(windMarkerT3d);
                windMarkerPosition3d.setXYZ(windMarkerIndex3d, windMarkerPoint3d.x, windMarkerPoint3d.y, windMarkerPoint3d.z);
              }
              windMarkerPosition3d.needsUpdate = true;
              windArrows3d.forEach(function(windArrowMesh3d, windArrowIndex3d) {
                var windArrowCurveIndex3d = windArrowIndex3d % windStreamCurves3d.length;
                var windArrowSpeedFactor3d = 1 + windArrowCurveIndex3d * 0.13;
                var windArrowT3d = (windArrowIndex3d / windArrows3d.length +
                  visualTime3d * (0.018 + windVisual3d * 0.032) * windArrowSpeedFactor3d) % 1;
                var windArrowCurve3d = windStreamCurves3d[windArrowCurveIndex3d];
                var windArrowPoint3d = windArrowCurve3d.getPointAt(windArrowT3d);
                var windArrowTangent3d = windArrowCurve3d.getTangentAt(windArrowT3d).normalize();
                windArrowMesh3d.position.copy(windArrowPoint3d);
                windArrowMesh3d.quaternion.setFromUnitVectors(windArrowUp3d, windArrowTangent3d);
                windArrowMesh3d.scale.set(0.82 + windVisual3d * 0.08, 0.88 + windVisual3d * 0.26, 0.82 + windVisual3d * 0.08);
              });
              canvasEl.dataset.windField = showWindField3d ? 'visible' : 'hidden';
              canvasEl.dataset.windAdvection = showWindField3d ?
                (windVisual3d >= 2 ? 'rapid' : (windVisual3d >= 0.8 ? 'steady' : 'gentle')) : 'hidden';
              canvasEl.dataset.windShear = showWindField3d ? 'layered' : 'hidden';

              var orographicLiftActive3d = showWindField3d &&
                (precipitationTransfer3d || state3d === 'ground_choice') &&
                windVisual3d > 0.3 && !undergroundMode3d;
              var orographicStrength3d = Math.max(0, Math.min(1,
                windVisual3d / 3 * 0.55 + rainVisual3d / 100 * 0.45));
              orographicLiftGroup3d.visible = orographicLiftActive3d;
              orographicLiftMat3d.opacity = orographicLiftActive3d ? 0.12 + orographicStrength3d * 0.34 : 0;
              orographicArrowMat3d.opacity = orographicLiftActive3d ? 0.32 + orographicStrength3d * 0.56 : 0;
              if (orographicLiftLabel3d) orographicLiftLabel3d.visible = orographicLiftActive3d;
              orographicArrows3d.forEach(function(orographicArrowMesh3d, orographicArrowIndex3d) {
                var orographicArrowCurveIndex3d = orographicArrowIndex3d % orographicLiftCurves3d.length;
                var orographicArrowT3d = (orographicArrowIndex3d / orographicArrows3d.length +
                  visualTime3d * (0.016 + windVisual3d * 0.03)) % 1;
                var orographicArrowCurve3d = orographicLiftCurves3d[orographicArrowCurveIndex3d];
                var orographicArrowPoint3d = orographicArrowCurve3d.getPointAt(orographicArrowT3d);
                var orographicArrowTangent3d = orographicArrowCurve3d.getTangentAt(orographicArrowT3d).normalize();
                orographicArrowMesh3d.position.copy(orographicArrowPoint3d);
                orographicArrowMesh3d.quaternion.setFromUnitVectors(windArrowUp3d, orographicArrowTangent3d);
                orographicArrowMesh3d.scale.setScalar(0.82 + orographicStrength3d * 0.48);
              });
              mountainPrecipitation3d.material.color.setHex(tempVisual3d < 0 ? 0xe0f2fe : 0x7dd3fc);
              mountainPrecipitation3d.material.size = tempVisual3d < 0 ? 0.105 : 0.072;
              mountainPrecipitation3d.material.opacity = orographicLiftActive3d ? 0.3 + orographicStrength3d * 0.62 : 0;
              mountainPrecipitationGeometry3d.setDrawRange(0,
                Math.floor(mountainPrecipitationCount3d * (0.28 + orographicStrength3d * 0.72)));
              if (orographicLiftActive3d) {
                var mountainPrecipitationPosition3d = mountainPrecipitationGeometry3d.attributes.position;
                for (var mountainPrecipitationIndex3d = 0; mountainPrecipitationIndex3d < mountainPrecipitationCount3d; mountainPrecipitationIndex3d++) {
                  var mountainPrecipitationPhase3d = (mountainPrecipitationSeeds3d[mountainPrecipitationIndex3d * 4 + 2] +
                    visualTime3d * (tempVisual3d < 0 ? 0.045 : 0.12 + rainVisual3d * 0.001) *
                    mountainPrecipitationSeeds3d[mountainPrecipitationIndex3d * 4 + 3]) % 1;
                  mountainPrecipitationPosition3d.setXYZ(mountainPrecipitationIndex3d,
                    mountainPrecipitationSeeds3d[mountainPrecipitationIndex3d * 4] + mountainPrecipitationPhase3d * windVisual3d * 0.11,
                    3.8 - mountainPrecipitationPhase3d * 3.35,
                    mountainPrecipitationSeeds3d[mountainPrecipitationIndex3d * 4 + 1] +
                      (tempVisual3d < 0 ? Math.sin(visualTime3d + mountainPrecipitationIndex3d) * 0.08 : 0)
                  );
                }
                mountainPrecipitationPosition3d.needsUpdate = true;
              }
              canvasEl.dataset.orographicLift = orographicLiftActive3d ? 'windward-rising-air' : 'hidden';
              canvasEl.dataset.mountainPrecipitation = orographicLiftActive3d ? (tempVisual3d < 0 ? 'snow' : 'rain') : 'hidden';

              var rainShadowStrength3d = Math.max(0, Math.min(1,
                orographicStrength3d * (0.58 + solarVisual3d / 2 * 0.42)));
              rainShadowGroup3d.visible = orographicLiftActive3d;
              rainShadowGroundMat3d.opacity = orographicLiftActive3d ? 0.06 + rainShadowStrength3d * 0.28 : 0;
              rainShadowGround3d.scale.set(0.68 + rainShadowStrength3d * 0.16, 1.18 + rainShadowStrength3d * 0.28, 1);
              rainShadowCrackMat3d.opacity = orographicLiftActive3d ? 0.18 + rainShadowStrength3d * 0.52 : 0;
              rainShadowArrowMat3d.opacity = orographicLiftActive3d ? 0.28 + rainShadowStrength3d * 0.58 : 0;
              rainShadowHaze3d.material.opacity = orographicLiftActive3d ? 0.12 + rainShadowStrength3d * 0.42 : 0;
              rainShadowHaze3d.material.size = 0.055 + rainShadowStrength3d * 0.045;
              if (rainShadowLabel3d) rainShadowLabel3d.visible = orographicLiftActive3d;
              rainShadowArrows3d.forEach(function(rainShadowArrowMesh3d, rainShadowArrowIndex3d) {
                var rainShadowCurve3d = orographicLiftCurves3d[rainShadowArrowIndex3d % orographicLiftCurves3d.length];
                var rainShadowArrowPhase3d = (rainShadowArrowIndex3d / rainShadowArrows3d.length +
                  visualTime3d * (0.014 + windVisual3d * 0.026)) % 1;
                var rainShadowArrowT3d = 0.66 + rainShadowArrowPhase3d * 0.32;
                var rainShadowArrowPoint3d = rainShadowCurve3d.getPointAt(rainShadowArrowT3d);
                var rainShadowArrowTangent3d = rainShadowCurve3d.getTangentAt(rainShadowArrowT3d).normalize();
                rainShadowArrowMesh3d.position.copy(rainShadowArrowPoint3d);
                rainShadowArrowMesh3d.quaternion.setFromUnitVectors(windArrowUp3d, rainShadowArrowTangent3d);
                rainShadowArrowMesh3d.scale.setScalar(0.78 + rainShadowStrength3d * 0.48);
              });
              if (orographicLiftActive3d) {
                var rainShadowHazePosition3d = rainShadowHazeGeometry3d.attributes.position;
                for (var rainShadowHazeIndex3d = 0; rainShadowHazeIndex3d < rainShadowHazeCount3d; rainShadowHazeIndex3d++) {
                  var rainShadowHazePhase3d = (rainShadowHazeSeeds3d[rainShadowHazeIndex3d * 3 + 2] +
                    visualTime3d * (0.022 + solarVisual3d * 0.028)) % 1;
                  rainShadowHazePosition3d.setXYZ(rainShadowHazeIndex3d,
                    8.35 + rainShadowHazeSeeds3d[rainShadowHazeIndex3d * 3] + rainShadowHazePhase3d * windVisual3d * 0.08,
                    -0.86 + rainShadowHazePhase3d * (0.78 + solarVisual3d * 0.22),
                    -2.25 + rainShadowHazeSeeds3d[rainShadowHazeIndex3d * 3 + 1]);
                }
                rainShadowHazePosition3d.needsUpdate = true;
              }
              canvasEl.dataset.rainShadow = orographicLiftActive3d ? 'leeward-drying' : 'hidden';
              canvasEl.dataset.rainShadowIntensity = String(Math.round(rainShadowStrength3d * 100));

              var vaporFromPlant3d = state3d === 'transpiring' || state3d === 'transpiration';
              if (condensationTransfer3d) vaporSourceGoal3d.set(0.2, 3.15, -1.5);
              else if (vaporFromPlant3d) vaporSourceGoal3d.set(5.9, 1.15, 1.25);
              else vaporSourceGoal3d.set(-2.1, 0.8, 1.0);
              vapor3d.position.lerp(vaporSourceGoal3d, motionReduced3d ? 1 : 0.08);
              canvasEl.dataset.moistureSource = condensationTransfer3d ? 'cloud' : (vaporFromPlant3d ? 'plant' : 'ocean');

              var oceanEvaporationActive3d = (state3d === 'evaporating' || state3d === 'evaporation') && !undergroundMode3d;
              var evaporationSolarEnergy3d = Math.max(0, Math.min(1, solarVisual3d / 2));
              var evaporationThermalEnergy3d = Math.max(0, Math.min(1, (tempVisual3d + 5) / 40));
              var evaporationWindEnergy3d = Math.max(0, Math.min(1, windVisual3d / 3));
              var evaporationEnergy3d = Math.max(0, Math.min(1,
                evaporationSolarEnergy3d * 0.45 + evaporationThermalEnergy3d * 0.35 + evaporationWindEnergy3d * 0.2));
              evaporationInterfaceGroup3d.visible = oceanEvaporationActive3d;
              evaporationMolecules3d.material.opacity = oceanEvaporationActive3d ? 0.32 + evaporationEnergy3d * 0.56 : 0;
              evaporationMolecules3d.material.size = 0.055 + evaporationEnergy3d * 0.045;
              evaporationMoleculeGeometry3d.setDrawRange(0, Math.max(8,
                Math.floor(evaporationMoleculeCount3d * (0.22 + evaporationEnergy3d * 0.78))));
              if (oceanEvaporationActive3d) {
                var evaporationMoleculePosition3d = evaporationMoleculeGeometry3d.attributes.position;
                for (var evaporationMoleculeIndex3d = 0; evaporationMoleculeIndex3d < evaporationMoleculePosition3d.count; evaporationMoleculeIndex3d++) {
                  var evaporationMoleculePhase3d = (evaporationMoleculeSeeds3d[evaporationMoleculeIndex3d * 4 + 2] +
                    visualTime3d * (0.055 + evaporationEnergy3d * 0.16 +
                      evaporationMoleculeSeeds3d[evaporationMoleculeIndex3d * 4 + 3] * 0.035)) % 1;
                  var evaporationMoleculeRise3d = evaporationMoleculePhase3d * (1.35 + evaporationEnergy3d * 1.55);
                  evaporationMoleculePosition3d.setXYZ(evaporationMoleculeIndex3d,
                    evaporationMoleculeSeeds3d[evaporationMoleculeIndex3d * 4] +
                      evaporationMoleculePhase3d * windVisual3d * 0.28 + Math.sin(evaporationMoleculePhase3d * 8 + evaporationMoleculeIndex3d) * 0.055,
                    -1.045 + evaporationMoleculeRise3d,
                    evaporationMoleculeSeeds3d[evaporationMoleculeIndex3d * 4 + 1] +
                      Math.cos(evaporationMoleculePhase3d * 7 + evaporationMoleculeIndex3d * 0.4) * 0.07
                  );
                }
                evaporationMoleculePosition3d.needsUpdate = true;
              }
              evaporationCoolingPatch3d.visible = oceanEvaporationActive3d;
              evaporationCoolingMat3d.opacity = oceanEvaporationActive3d ? 0.08 + evaporationEnergy3d * 0.24 : 0;
              evaporationCoolingMat3d.color.setHSL(0.55, 0.78, 0.17 - evaporationEnergy3d * 0.045);
              evaporationCoolingPatch3d.scale.set(1.5 + evaporationEnergy3d * 0.48, 0.78 + evaporationEnergy3d * 0.2, 1);
              evaporationHeatRingGroup3d.children.forEach(function(evaporationHeatRing3d) {
                var evaporationHeatPhase3d = motionReduced3d ? evaporationHeatRing3d.userData.phase :
                  (evaporationHeatRing3d.userData.phase + visualTime3d * (0.22 + evaporationEnergy3d * 0.2)) % 1;
                evaporationHeatRing3d.position.set(
                  -3 + evaporationHeatPhase3d * windVisual3d * 0.14,
                  -1.02 + evaporationHeatPhase3d * (0.85 + evaporationEnergy3d * 0.65),
                  1.6
                );
                evaporationHeatRing3d.scale.setScalar(0.65 + evaporationHeatPhase3d * (1.1 + evaporationEnergy3d * 0.4));
                evaporationHeatRing3d.material.opacity = oceanEvaporationActive3d ?
                  (1 - evaporationHeatPhase3d) * (0.12 + evaporationEnergy3d * 0.32) : 0;
              });
              var evaporationEnergyBand3d = evaporationEnergy3d < 0.34 ? 'low-energy' :
                (evaporationEnergy3d < 0.68 ? 'moderate-energy' : 'high-energy');
              canvasEl.dataset.evaporationInterface = oceanEvaporationActive3d ? evaporationEnergyBand3d : 'hidden';
              canvasEl.dataset.evaporationMotion = oceanEvaporationActive3d ?
                (journeyPaused3d ? 'paused' : (motionReduced3d ? 'reduced-static' : 'molecules-escaping')) : 'hidden';
              canvasEl.dataset.surfaceCooling = oceanEvaporationActive3d ? 'localized' : 'hidden';

              var activeSolarEnergyKey3d = vaporTransfer3d ? (vaporFromPlant3d ? 'plant' : 'ocean') : '';
              var solarEnergyActive3d = !!activeSolarEnergyKey3d && solarVisual3d > 0.12 && !undergroundMode3d;
              Object.keys(solarEnergyPaths3d).forEach(function(solarPathKey3d) {
                var solarPathSpec3d = solarEnergyPaths3d[solarPathKey3d];
                var solarPathVisible3d = solarEnergyActive3d && solarPathKey3d === activeSolarEnergyKey3d;
                solarPathSpec3d.group.visible = solarPathVisible3d;
                solarPathSpec3d.beamMaterial.opacity = solarPathVisible3d ? Math.min(0.54, 0.08 + solarVisual3d * 0.23) : 0;
                solarPathSpec3d.markers.material.opacity = solarPathVisible3d ? Math.min(0.86, 0.24 + solarVisual3d * 0.28) : 0;
                solarPathSpec3d.markers.material.size = 0.065 + solarVisual3d * 0.024;
                if (solarPathVisible3d) {
                  var solarMarkerPosition3d = solarPathSpec3d.markers.geometry.attributes.position;
                  for (var solarMarkerIndex3d = 0; solarMarkerIndex3d < solarMarkerPosition3d.count; solarMarkerIndex3d++) {
                    var solarCurveIndex3d = solarMarkerIndex3d % solarPathSpec3d.curves.length;
                    var solarMarkerT3d = (solarMarkerIndex3d / solarMarkerPosition3d.count + visualTime3d * (0.13 + solarVisual3d * 0.045)) % 1;
                    var solarMarkerPoint3d = solarPathSpec3d.curves[solarCurveIndex3d].getPointAt(solarMarkerT3d);
                    solarMarkerPosition3d.setXYZ(solarMarkerIndex3d, solarMarkerPoint3d.x, solarMarkerPoint3d.y, solarMarkerPoint3d.z);
                  }
                  solarMarkerPosition3d.needsUpdate = true;
                }
              });

              var latentHeatVisible3d = condensationTransfer3d && !undergroundMode3d;
              latentHeatGroup3d.visible = latentHeatVisible3d;
              latentHeatGroup3d.position.copy(cloudGroup3d.position);
              latentHeatGroup3d.children.forEach(function(latentRingMesh3d, latentRingIndex3d) {
                var latentHeatPhase3d = motionReduced3d ? 0.32 + latentRingIndex3d * 0.12 :
                  (visualTime3d * 0.38 + latentRingIndex3d * 0.29) % 1;
                latentRingMesh3d.scale.setScalar(0.72 + latentHeatPhase3d * 1.35);
                latentRingMesh3d.material.opacity = latentHeatVisible3d ?
                  (motionReduced3d ? 0.24 : (1 - latentHeatPhase3d) * (0.28 + journeyProgress3d * 0.18)) : 0;
              });
              var cloudMicrophysicsActive3d = condensationTransfer3d && !undergroundMode3d;
              var cloudGrowth3d = Math.max(0, Math.min(1, journeyProgress3d));
              cloudMicrophysicsGroup3d.visible = cloudMicrophysicsActive3d;
              cloudDroplets3d.material.size = 0.045 + cloudGrowth3d * 0.095;
              cloudDroplets3d.material.opacity = cloudMicrophysicsActive3d ? 0.46 + cloudGrowth3d * 0.42 : 0;
              cloudDroplets3d.material.color.setHex(tempVisual3d < 0 ? 0xbfdbfe : 0x7dd3fc);
              cloudNuclei3d.material.opacity = cloudMicrophysicsActive3d ? 0.78 - cloudGrowth3d * 0.42 : 0;
              cloudNuclei3d.material.size = 0.052 + (1 - cloudGrowth3d) * 0.018;
              if (cloudMicrophysicsActive3d) {
                var cloudDropletPosition3d = cloudDropletGeometry3d.attributes.position;
                var cloudCompaction3d = 1 - cloudGrowth3d * 0.18;
                for (var cloudDropletIndex3d = 0; cloudDropletIndex3d < cloudDropletPosition3d.count; cloudDropletIndex3d++) {
                  var cloudDropletDrift3d = visualTime3d * (0.11 + windVisual3d * 0.025) + cloudDropletIndex3d * 0.73;
                  cloudDropletPosition3d.setXYZ(cloudDropletIndex3d,
                    cloudMicrophysicsBase3d[cloudDropletIndex3d * 3] * cloudCompaction3d + Math.sin(cloudDropletDrift3d) * 0.035,
                    cloudMicrophysicsBase3d[cloudDropletIndex3d * 3 + 1] * cloudCompaction3d + Math.cos(cloudDropletDrift3d * 0.8) * 0.025,
                    cloudMicrophysicsBase3d[cloudDropletIndex3d * 3 + 2] * cloudCompaction3d + Math.sin(cloudDropletDrift3d * 0.6) * 0.028
                  );
                }
                cloudDropletPosition3d.needsUpdate = true;

                var cloudCoalescenceStrength3d = Math.max(0, Math.min(1, (cloudGrowth3d - 0.35) / 0.45));
                var cloudCoalescenceActive3d = tempVisual3d >= 0 && cloudCoalescenceStrength3d > 0.02;
                cloudCoalescence3d.visible = cloudCoalescenceActive3d;
                cloudCoalescence3d.material.opacity = cloudCoalescenceActive3d ? 0.08 + cloudCoalescenceStrength3d * 0.28 : 0;
                if (cloudCoalescenceActive3d) {
                  var cloudCoalescencePosition3d = cloudCoalescenceGeometry3d.attributes.position;
                  for (var cloudCoalescenceIndex3d = 0; cloudCoalescenceIndex3d < cloudCoalescenceCount3d; cloudCoalescenceIndex3d++) {
                    var cloudCoalescenceA3d = (cloudCoalescenceIndex3d * 3) % cloudMicrophysicsCount3d;
                    var cloudCoalescenceB3d = (cloudCoalescenceA3d + 11 + cloudCoalescenceIndex3d % 5) % cloudMicrophysicsCount3d;
                    cloudCoalescencePosition3d.setXYZ(cloudCoalescenceIndex3d * 2,
                      cloudDropletPosition3d.getX(cloudCoalescenceA3d), cloudDropletPosition3d.getY(cloudCoalescenceA3d), cloudDropletPosition3d.getZ(cloudCoalescenceA3d));
                    cloudCoalescencePosition3d.setXYZ(cloudCoalescenceIndex3d * 2 + 1,
                      cloudDropletPosition3d.getX(cloudCoalescenceB3d), cloudDropletPosition3d.getY(cloudCoalescenceB3d), cloudDropletPosition3d.getZ(cloudCoalescenceB3d));
                  }
                  cloudCoalescencePosition3d.needsUpdate = true;
                }

                var cloudIceMicrophysicsActive3d = tempVisual3d < 0;
                cloudIceCrystalGroup3d.visible = cloudIceMicrophysicsActive3d;
                cloudIceCrystalMat3d.opacity = cloudIceMicrophysicsActive3d ? 0.38 + cloudGrowth3d * 0.42 : 0;
                cloudIceCrystalGroup3d.children.forEach(function(cloudIceCrystal3d, cloudIceIndex3d) {
                  var cloudIceParticle3d = cloudIceCrystal3d.userData.particleIndex;
                  cloudIceCrystal3d.position.set(
                    cloudDropletPosition3d.getX(cloudIceParticle3d),
                    cloudDropletPosition3d.getY(cloudIceParticle3d),
                    cloudDropletPosition3d.getZ(cloudIceParticle3d)
                  );
                  cloudIceCrystal3d.rotation.set(
                    visualTime3d * 0.18 + cloudIceIndex3d * 0.4,
                    visualTime3d * 0.24 + cloudIceIndex3d * 0.55,
                    cloudIceIndex3d * 0.31
                  );
                  cloudIceCrystal3d.scale.setScalar(0.55 + cloudGrowth3d * 0.75);
                });
              } else {
                cloudCoalescence3d.visible = false;
                cloudIceCrystalGroup3d.visible = false;
              }
              canvasEl.dataset.cloudMicrophysics = !cloudMicrophysicsActive3d ? 'hidden' :
                (tempVisual3d < 0 ? 'ice-nucleation' : (cloudGrowth3d < 0.32 ? 'nucleation' :
                  (cloudGrowth3d < 0.72 ? 'droplet-growth' : 'collision-coalescence')));
              canvasEl.dataset.energyDriver = latentHeatVisible3d ? 'latent-heat-release' :
                (solarEnergyActive3d ? 'solar-' + activeSolarEnergyKey3d : 'none');

              if (activeCurve3d) {
                var markerPositionAttribute3d = routeMarkers3d.geometry.attributes.position;
                for (var markerIndex3d = 0; markerIndex3d < markerPositionAttribute3d.count; markerIndex3d++) {
                  var markerT3d = (markerIndex3d / markerPositionAttribute3d.count + visualTime3d * (0.035 + windVisual3d * 0.006)) % 1;
                  var markerPoint3d = activeCurve3d.getPointAt(markerT3d);
                  markerPositionAttribute3d.setXYZ(markerIndex3d, markerPoint3d.x, markerPoint3d.y, markerPoint3d.z);
                }
                markerPositionAttribute3d.needsUpdate = true;
                var trailPositionAttribute3d = dropletTrail3d.geometry.attributes.position;
                for (var trailIndex3d = 0; trailIndex3d < trailPositionAttribute3d.count; trailIndex3d++) {
                  var trailT3d = journeyProgress3d - (trailIndex3d + 1) * 0.014;
                  if (activeCurve3d.closed) trailT3d = (trailT3d + 1) % 1;
                  else trailT3d = Math.max(0, trailT3d);
                  var trailPoint3d = activeCurve3d.getPointAt(trailT3d);
                  trailPositionAttribute3d.setXYZ(trailIndex3d, trailPoint3d.x, trailPoint3d.y, trailPoint3d.z);
                }
                trailPositionAttribute3d.needsUpdate = true;
                dropletTrail3d.visible = rawState3d !== 'idle';
                if (rawState3d !== 'idle') {
                  var tangent3d = activeCurve3d.getTangentAt(journeyProgress3d).normalize();
                  var dropletDirection3d = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent3d);
                  dropletGroup3d.quaternion.slerp(dropletDirection3d, motionReduced3d ? 1 : 0.08);
                }
              } else {
                dropletTrail3d.visible = false;
              }

              var daylight3d = Math.max(0, Math.min(1, solarVisual3d / 1.35));
              var storminess3d = Math.max(0, Math.min(1, rainVisual3d / 100));
              scene.background.setHSL(0.57, 0.55, 0.045 + daylight3d * 0.09);
              scene.fog.color.copy(scene.background);
              scene.fog.density = 0.022 + storminess3d * 0.018 + (1 - daylight3d) * 0.006;
              skyUniforms3d.topColor.value.setHSL(0.59, 0.56, 0.055 + daylight3d * 0.15);
              skyUniforms3d.horizonColor.value.setHSL(0.54, 0.5 - storminess3d * 0.12, 0.1 + daylight3d * 0.28 - storminess3d * 0.045);
              sun3d.intensity = 0.35 + daylight3d * 1.85;
              hemi3d.intensity = 0.48 + daylight3d * 0.95;
              fill3d.intensity = 0.75 + daylight3d * 0.85;
              renderer.toneMappingExposure = 0.86 + daylight3d * 0.3;
              sunDiscMat3d.opacity = 0.12 + daylight3d * 0.88;
              sunHaloMat3d.opacity = 0.03 + daylight3d * 0.2;
              sunOrb3d.position.y = 5.5 + daylight3d * 5.2;
              sunOrb3d.scale.setScalar(1 + Math.sin(visualTime3d * 0.7) * 0.025);
              moonMat3d.opacity = Math.max(0, (0.42 - daylight3d) * 1.8);
              stars3d.material.opacity = Math.max(0.04, (1 - daylight3d) * 0.78);
              distantCloudMat3d.opacity = 0.16 + storminess3d * 0.28;
              var lerp3d = motionReduced3d ? 1 : 0.045;
              dropletGroup3d.position.lerp(target3d, lerp3d);
              if (!userOrbit3d) camera.position.lerp(cameraGoal3d, motionReduced3d ? 1 : 0.025);
              dropletMat3d.color.setHex(stateColors3d[state3d] || 0x38bdf8);
              dropletMat3d.emissive.setHex(stateColors3d[state3d] || 0x075985);
              dropletLight3d.intensity = 1.8 + hydroPoints3d / 55;
              halo3d.material.opacity = 0.10 + hydroPoints3d / 600;
              route3d.material.opacity = 0.18 + hydroPoints3d / 800;
              routeGlow3d.material.opacity = 0.09 + hydroPoints3d / 900;
              routeMarkers3d.material.opacity = 0.46 + hydroPoints3d / 600;
              dropletTrail3d.material.opacity = 0.3 + hydroPoints3d / 500;
              dropletMat3d.emissiveIntensity = 0.52 + hydroPoints3d / 260;
              dropletCore3d.material.opacity = 0.14 + hydroPoints3d / 900;
              oceanMat.color.setHSL(0.54, 0.78, 0.18 + daylight3d * 0.09);
              oceanMat.roughness = Math.min(0.55, 0.14 + windVisual3d * 0.11);
              var coastalWaveActive3d = !undergroundMode3d;
              var coastalWaveSpeed3d = 0.028 + windVisual3d * 0.016;
              var shoreBreakStrength3d = 0;
              coastalWaveGroup3d.visible = coastalWaveActive3d;
              coastalWaveCrests3d.forEach(function(coastalWaveCrest3d) {
                var coastalWavePhase3d = (coastalWaveCrest3d.userData.phase + visualTime3d * coastalWaveSpeed3d) % 1;
                var coastalWaveApproach3d = coastalWavePhase3d * coastalWavePhase3d * (3 - 2 * coastalWavePhase3d);
                var coastalBreakBuild3d = Math.max(0, Math.min(1, (coastalWaveApproach3d - 0.68) / 0.24));
                var coastalShoreFade3d = 1 - Math.max(0, Math.min(1, (coastalWaveApproach3d - 0.92) / 0.08));
                var coastalBreakPulse3d = coastalBreakBuild3d * coastalShoreFade3d;
                shoreBreakStrength3d = Math.max(shoreBreakStrength3d, coastalBreakPulse3d);
                coastalWaveCrest3d.position.x = -6 + coastalWaveApproach3d * 6;
                coastalWaveCrest3d.position.y = -1.13 + coastalBreakBuild3d * (0.035 + windVisual3d * 0.012);
                coastalWaveCrest3d.scale.set(1,
                  1 + coastalBreakBuild3d * (1.2 + windVisual3d * 0.2),
                  0.98 + coastalWaveApproach3d * 0.04);
                coastalWaveCrest3d.material.opacity = coastalWaveActive3d ?
                  (0.07 + coastalWaveApproach3d * 0.32 + windVisual3d * 0.035) * coastalShoreFade3d : 0;
              });
              shoreWash3d.visible = coastalWaveActive3d;
              shoreWash3d.scale.set(0.38 + shoreBreakStrength3d * 0.78, 1, 1);
              shoreWash3d.position.x = 0.02 + shoreBreakStrength3d * 0.09;
              shoreWashMat3d.opacity = coastalWaveActive3d ? 0.07 + shoreBreakStrength3d * 0.26 + windVisual3d * 0.012 : 0;
              var breakingSprayActive3d = coastalWaveActive3d && shoreBreakStrength3d > 0.04;
              breakingSpray3d.visible = breakingSprayActive3d;
              breakingSpray3d.material.opacity = breakingSprayActive3d ?
                Math.min(0.82, shoreBreakStrength3d * (0.42 + windVisual3d * 0.13)) : 0;
              breakingSpray3d.material.size = 0.052 + windVisual3d * 0.012;
              if (breakingSprayActive3d) {
                var breakingSprayPosition3d = breakingSprayGeometry3d.attributes.position;
                for (var breakingSprayIndex3d = 0; breakingSprayIndex3d < breakingSprayPosition3d.count; breakingSprayIndex3d++) {
                  var breakingSprayPhase3d = (breakingSpraySeeds3d[breakingSprayIndex3d * 2 + 1] +
                    visualTime3d * (0.32 + windVisual3d * 0.08)) % 1;
                  breakingSprayPosition3d.setXYZ(breakingSprayIndex3d,
                    -0.12 + Math.sin(breakingSprayPhase3d * Math.PI * 2 + breakingSprayIndex3d) * 0.045,
                    -1.02 + Math.sin(breakingSprayPhase3d * Math.PI) * (0.07 + windVisual3d * 0.025),
                    breakingSpraySeeds3d[breakingSprayIndex3d * 2] + Math.cos(breakingSprayPhase3d * 5 + breakingSprayIndex3d) * 0.035
                  );
                }
                breakingSprayPosition3d.needsUpdate = true;
              }
              foam3d.material.opacity = coastalWaveActive3d ?
                Math.min(0.92, 0.3 + shoreBreakStrength3d * 0.38 + Math.sin(visualTime3d * 1.7) * 0.055 + windVisual3d * 0.03) : 0.04;
              canvasEl.dataset.coastalWaveField = coastalWaveActive3d ?
                (windVisual3d > 1.6 ? 'wind-driven-breakers' : 'gentle-shoaling') : 'hidden';
              canvasEl.dataset.shoreWash = shoreWash3d.visible ?
                (journeyPaused3d ? 'paused' : (motionReduced3d ? 'reduced-static' : 'advancing')) : 'hidden';
              cloudMat3d.color.setHSL(0.55, 0.35, 0.88 - storminess3d * 0.22);
              cloudShadeMat3d.color.setHSL(0.56, 0.28, 0.62 - storminess3d * 0.18);
              cloudShadeMat3d.opacity = 0.34 + storminess3d * 0.34;
              cloudGroup3d.scale.set(1 + storminess3d * 0.06, 1 + storminess3d * 0.12, 1 + storminess3d * 0.06);
              cloudShadow3d.position.x = cloudGroup3d.position.x;
              cloudShadow3d.scale.set(1 + storminess3d * 0.3, 1 + storminess3d * 0.2, 1);
              cloudShadow3d.visible = daylight3d > 0.06 && !undergroundMode3d;
              cloudShadowMat3d.uniforms.shadowOpacity.value = cloudShadow3d.visible ?
                daylight3d * (0.045 + storminess3d * 0.13) : 0;
              canvasEl.dataset.cloudShadow = cloudShadow3d.visible ? 'visible' : 'hidden';

              var rainbowWeather3d = rainVisual3d >= 25 && solarVisual3d >= 0.7 && tempVisual3d > 1;
              var rainbowTrigger3d = rainbowWeather3d && (precipitationTransfer3d || state3d === 'ground_choice');
              if (motionReduced3d) rainbowMemory3d = rainbowTrigger3d ? 1 : 0;
              else if (!journeyPaused3d) {
                rainbowMemory3d = rainbowTrigger3d ?
                  Math.min(1, rainbowMemory3d + frameDelta3d * 1.2) :
                  Math.max(0, rainbowMemory3d - frameDelta3d * 0.055);
              }
              var rainbowVisible3d = rainbowMemory3d > 0.02 && !undergroundMode3d;
              var rainbowOpacity3d = rainbowMemory3d * Math.min(0.64, 0.18 + solarVisual3d * 0.28);
              rainbowGroup3d.visible = rainbowVisible3d;
              rainbowGroup3d.children.forEach(function(rainbowArcMesh3d, rainbowArcIndex3d) {
                rainbowArcMesh3d.material.opacity = rainbowVisible3d ?
                  rainbowOpacity3d * (0.92 - rainbowArcIndex3d * 0.035) : 0;
              });
              canvasEl.dataset.weatherOptics = rainbowVisible3d ? 'rainbow' : 'none';
              forestGroup3d.visible = coverVisual3d === 'forest' && !undergroundMode3d;
              urbanGroup3d.visible = coverVisual3d === 'urban' && !undergroundMode3d;
              meadowGroup3d.visible = coverVisual3d === 'grass' && !undergroundMode3d;
              var pondingStrength3d = Math.max(0, Math.min(1, (runoffVisual3d + rainVisual3d - 70) / 130));
              urbanPonding3d.visible = coverVisual3d === 'urban' && pondingStrength3d > 0.04 && tempVisual3d >= 0 && !undergroundMode3d;
              pondingMat3d.opacity = 0.12 + pondingStrength3d * 0.58;
              urbanPonding3d.children.forEach(function(pondingMesh3d, pondingIndex3d) {
                var pondingPulse3d = motionReduced3d ? 0 : Math.sin(visualTime3d * 1.2 + pondingIndex3d) * 0.035;
                var pondingScale3d = pondingMesh3d.userData.baseScale * (0.5 + pondingStrength3d * 0.9 + pondingPulse3d);
                pondingMesh3d.scale.set(pondingScale3d, pondingScale3d * 0.72, 1);
              });
              canvasEl.dataset.ponding = urbanPonding3d.visible ? 'visible' : 'hidden';
              var snowAccumulationTarget3d = tempVisual3d < 0 ?
                Math.min(1, 0.5 + Math.abs(tempVisual3d) / 28 + rainVisual3d / 500) : 0;
              if (snowpackMemory3d === null) snowpackMemory3d = snowAccumulationTarget3d;
              if (!journeyPaused3d) {
                if (snowAccumulationTarget3d > snowpackMemory3d) {
                  if (motionReduced3d) snowpackMemory3d = snowAccumulationTarget3d;
                  else snowpackMemory3d = Math.min(snowAccumulationTarget3d,
                    snowpackMemory3d + frameDelta3d * (0.055 + rainVisual3d * 0.0012));
                } else if (!motionReduced3d) {
                  var snowmeltRate3d = frameDelta3d * (0.018 + Math.max(0, tempVisual3d) * 0.004 + solarVisual3d * 0.018);
                  snowpackMemory3d = Math.max(0, snowpackMemory3d - snowmeltRate3d);
                }
              }
              var snowmeltIntensity3d = Math.max(0, Math.min(1, snowpackMemory3d *
                (Math.max(0, tempVisual3d) / 14 * 0.55 + solarVisual3d / 2 * 0.45)));
              var snowmeltActive3d = tempVisual3d > 0 && snowpackMemory3d > 0.025 && !undergroundMode3d;
              var snowStoragePercent3d = Math.round(snowpackMemory3d * 100);
              var snowStorageVisible3d = snowpackMemory3d > 0.02 && !undergroundMode3d;
              var snowStorageStatus3d = snowmeltActive3d ? 'Melting to river' :
                (tempVisual3d < 0 ? 'Accumulating' : 'Stored for later');
              snowStorageGaugeGroup3d.visible = snowStorageVisible3d;
              snowStorageFill3d.scale.y = Math.max(0.001, snowpackMemory3d);
              snowStorageFill3d.position.y = -0.81 + snowpackMemory3d * 0.81;
              snowStorageCap3d.position.y = -0.81 + snowpackMemory3d * 1.62;
              snowStorageFillMat3d.color.setHex(snowmeltActive3d ? 0x7dd3fc : 0xe0f2fe);
              snowStorageFillMat3d.opacity = 0.5 + snowpackMemory3d * 0.4;
              snowStorageFillMat3d.emissiveIntensity = 0.1 + snowmeltIntensity3d * 0.45;
              snowStorageCap3d.material.color.setHex(snowmeltActive3d ? 0x38bdf8 : 0xe0f2fe);
              snowStorageCap3d.material.opacity = 0.68 + snowpackMemory3d * 0.28;
              if (snowStorageLabel3d) {
                snowStorageLabel3d.visible = snowStorageVisible3d;
                if (snowStorageVisible3d) updateSnowStorageLabel3d(snowStoragePercent3d, snowStorageStatus3d);
              }
              canvasEl.dataset.snowpackPercent = String(snowStoragePercent3d);
              canvasEl.dataset.snowmeltContribution = String(Math.round(snowmeltIntensity3d * 100));
              var snowCoverTarget3d = !undergroundMode3d ? snowpackMemory3d * 0.88 : 0;
              snowCoverMat3d.opacity += (snowCoverTarget3d - snowCoverMat3d.opacity) * (motionReduced3d ? 1 : 0.08);
              snowCover3d.visible = snowCoverMat3d.opacity > 0.01;
              snowMat3d.opacity = 0.08 + snowpackMemory3d * 0.92;
              snowmeltRouteGroup3d.visible = snowmeltActive3d;
              snowmeltRouteMat3d.opacity = snowmeltActive3d ? 0.12 + snowmeltIntensity3d * 0.55 : 0;
              snowmeltMarkers3d.material.opacity = snowmeltActive3d ? 0.25 + snowmeltIntensity3d * 0.72 : 0;
              snowmeltMarkers3d.material.size = 0.05 + snowmeltIntensity3d * 0.055;
              if (snowmeltActive3d) {
                var snowmeltMarkerPosition3d = snowmeltMarkerGeometry3d.attributes.position;
                for (var snowmeltMarkerIndex3d = 0; snowmeltMarkerIndex3d < snowmeltMarkerCount3d; snowmeltMarkerIndex3d++) {
                  var snowmeltCurveIndex3d = snowmeltMarkerIndex3d % snowmeltCurves3d.length;
                  var snowmeltProgress3d = (snowmeltMarkerIndex3d / snowmeltMarkerCount3d +
                    visualTime3d * (0.035 + snowmeltIntensity3d * 0.09)) % 1;
                  var snowmeltPoint3d = snowmeltCurves3d[snowmeltCurveIndex3d].getPointAt(snowmeltProgress3d);
                  snowmeltMarkerPosition3d.setXYZ(snowmeltMarkerIndex3d, snowmeltPoint3d.x, snowmeltPoint3d.y, snowmeltPoint3d.z);
                }
                snowmeltMarkerPosition3d.needsUpdate = true;
              }
              canvasEl.dataset.snowpackStorage = snowpackMemory3d > 0.05 ?
                (snowmeltActive3d ? 'melting' : (tempVisual3d < 0 ? 'accumulating' : 'stored')) : 'none';
              canvasEl.dataset.snowmeltRunoff = snowmeltActive3d ?
                (motionReduced3d ? 'static-paths' : (journeyPaused3d ? 'paused' : 'flowing-to-river')) : 'hidden';
              if (!motionReduced3d && !journeyPaused3d) {
                dropletGroup3d.position.y += Math.sin(visualTime3d * 2.8) * 0.0025;
                halo3d.scale.setScalar(1 + Math.sin(visualTime3d * 3.2) * 0.12);
                dropletHighlight3d.material.opacity = 0.68 + Math.sin(visualTime3d * 2.1) * 0.16;
                cloudGroup3d.position.x = 0.5 + Math.sin(visualTime3d * (0.12 + windVisual3d * 0.09)) * (0.18 + windVisual3d * 0.18);
                distantClouds3d.position.x = -8.5 + (visualTime3d * (0.055 + windVisual3d * 0.08)) % 15;
                var vaporPositionAttribute3d = vapor3d.geometry.attributes.position;
                var vaporRiseRate3d = 0.06 + solarVisual3d * 0.035 + Math.max(0, tempVisual3d) * 0.001 + windVisual3d * 0.018;
                for (var vaporIndex3d = 0; vaporIndex3d < vaporPositionAttribute3d.count; vaporIndex3d++) {
                  var vaporBaseX3d = vaporBasePositions3d[vaporIndex3d * 3];
                  var vaporBaseY3d = vaporBasePositions3d[vaporIndex3d * 3 + 1];
                  var vaporBaseZ3d = vaporBasePositions3d[vaporIndex3d * 3 + 2];
                  var vaporPhase3d = ((vaporBaseY3d + 2.25) / 4.5 + visualTime3d * vaporRiseRate3d) % 1;
                  vaporPositionAttribute3d.setXYZ(vaporIndex3d,
                    vaporBaseX3d + vaporPhase3d * windVisual3d * 0.24 + Math.sin(vaporPhase3d * 8 + vaporIndex3d) * 0.06,
                    -1.35 + vaporPhase3d * 3.6,
                    vaporBaseZ3d + Math.cos(vaporPhase3d * 7 + vaporIndex3d * 0.4) * 0.05
                  );
                }
                vaporPositionAttribute3d.needsUpdate = true;
                plant3d.rotation.z = Math.sin(visualTime3d * (0.7 + windVisual3d * 0.22)) * Math.min(0.04, windVisual3d * 0.012);
                waveFrame3d += 1;
                if (waveFrame3d % 2 === 0) {
                  var oceanPositionAttribute3d = oceanGeometry3d.attributes.position;
                  for (var oceanVertexIndex3d = 0; oceanVertexIndex3d < oceanPositionAttribute3d.count; oceanVertexIndex3d++) {
                    var oceanBaseX3d = oceanBasePositions3d[oceanVertexIndex3d * 3];
                    var oceanBaseY3d = oceanBasePositions3d[oceanVertexIndex3d * 3 + 1];
                    var waveHeight3d = Math.sin(oceanBaseX3d * 0.72 + visualTime3d * (0.8 + windVisual3d * 0.18)) * (0.035 + windVisual3d * 0.014) +
                      Math.cos(oceanBaseY3d * 0.92 - visualTime3d * 0.65) * 0.028;
                    oceanPositionAttribute3d.setZ(oceanVertexIndex3d, waveHeight3d);
                  }
                  oceanPositionAttribute3d.needsUpdate = true;
                  if (waveFrame3d % 4 === 0) oceanGeometry3d.computeVertexNormals();
                }
                var rainPos3d = rain3d.geometry.attributes.position;
                var snowMode3d = tempVisual3d < 0;
                for (var ri3 = 0; ri3 < rainPos3d.count; ri3++) {
                  var rainY3d = rainPos3d.getY(ri3) - (snowMode3d ? 0.006 : 0.018 + rainVisual3d / 5000);
                  if (rainY3d < -2.6) rainY3d = 2.7;
                  var rainBaseX3d = rainBasePositions3d[ri3 * 3];
                  rainPos3d.setX(ri3, rainBaseX3d + (snowMode3d ? Math.sin(visualTime3d * 1.4 + ri3 * 0.67) * 0.22 : 0));
                  rainPos3d.setY(ri3, rainY3d);
                }
                rainPos3d.needsUpdate = true;
              }
              vapor3d.visible = vaporTransfer3d || condensationTransfer3d;
              var precipitationFieldActive3d = state3d === 'precipitating' || state3d === 'precipitation' || state3d === 'ground_choice';
              var liquidRainActive3d = precipitationFieldActive3d && tempVisual3d >= 0;
              var snowDriftActive3d = precipitationFieldActive3d && tempVisual3d < 0;
              rain3d.visible = snowDriftActive3d;
              rain3d.material.opacity = snowDriftActive3d ? Math.min(0.9, 0.32 + rainVisual3d / 150) : 0;
              rainCurtain3d.visible = liquidRainActive3d;
              rainCurtain3d.material.opacity = liquidRainActive3d ? Math.min(0.86, 0.18 + rainVisual3d / 140) : 0;
              rainCurtain3d.position.x = 1.2 + cloudGroup3d.position.x - 0.5;
              rainImpactMist3d.visible = liquidRainActive3d;
              rainImpactMist3d.material.opacity = liquidRainActive3d ? Math.min(0.72, 0.12 + rainVisual3d / 150) : 0;
              rainImpactMist3d.material.size = 0.04 + rainVisual3d / 1800;
              rainImpactMist3d.position.x = rainCurtain3d.position.x;
              canvasEl.dataset.precipitationDeflection = liquidRainActive3d ?
                (windVisual3d >= 1.6 ? 'strong-downwind-slant' : (windVisual3d > 0.2 ? 'light-downwind-slant' : 'vertical')) : 'hidden';
              if (liquidRainActive3d) {
                var rainCurtainPosition3d = rainCurtainGeometry3d.attributes.position;
                var rainStreakLength3d = 0.22 + rainVisual3d / 120;
                var rainWindSlant3d = windVisual3d * 0.11;
                for (var rainCurtainIndex3d = 0; rainCurtainIndex3d < rainCurtainCount3d; rainCurtainIndex3d++) {
                  var rainCurtainPhase3d = (rainCurtainSeeds3d[rainCurtainIndex3d * 3 + 2] + visualTime3d * (0.3 + rainVisual3d / 180)) % 1;
                  var rainCurtainX3d = rainCurtainSeeds3d[rainCurtainIndex3d * 3] + rainCurtainPhase3d * windVisual3d * 0.08;
                  var rainCurtainZ3d = rainCurtainSeeds3d[rainCurtainIndex3d * 3 + 1];
                  var rainCurtainY3d = 2.65 - rainCurtainPhase3d * 4.1;
                  rainCurtainPosition3d.setXYZ(rainCurtainIndex3d * 2, rainCurtainX3d, rainCurtainY3d, rainCurtainZ3d);
                  rainCurtainPosition3d.setXYZ(rainCurtainIndex3d * 2 + 1, rainCurtainX3d + rainWindSlant3d, rainCurtainY3d - rainStreakLength3d, rainCurtainZ3d);
                }
                rainCurtainPosition3d.needsUpdate = true;

                var rainImpactPosition3d = rainImpactGeometry3d.attributes.position;
                for (var rainImpactIndex3d = 0; rainImpactIndex3d < rainImpactCount3d; rainImpactIndex3d++) {
                  var rainImpactPhase3d = (rainImpactSeeds3d[rainImpactIndex3d * 3 + 2] + visualTime3d * (0.65 + rainVisual3d * 0.008)) % 1;
                  rainImpactPosition3d.setXYZ(rainImpactIndex3d,
                    rainImpactSeeds3d[rainImpactIndex3d * 3] + rainImpactPhase3d * windVisual3d * 0.08,
                    -0.98 + Math.sin(rainImpactPhase3d * Math.PI) * (0.04 + rainVisual3d * 0.0012),
                    rainImpactSeeds3d[rainImpactIndex3d * 3 + 1]
                  );
                }
                rainImpactPosition3d.needsUpdate = true;
              }
              canvasEl.dataset.hydrometeorMode = snowDriftActive3d ? 'snow-drift' : (liquidRainActive3d ? 'rain-streaks' : 'hidden');
              var showRainRipples3d = liquidRainActive3d;
              rainRipples3d.visible = showRainRipples3d;
              if (showRainRipples3d) {
                rainRipples3d.children.forEach(function(rippleMesh3d) {
                  var ripplePhase3d = (visualTime3d * 0.78 + rippleMesh3d.userData.phase) % 1;
                  rippleMesh3d.scale.setScalar(0.55 + ripplePhase3d * 2.4);
                  rippleMesh3d.material.opacity = (1 - ripplePhase3d) * (0.16 + rainVisual3d / 500);
                });
              }
              river3d.material.opacity = Math.min(0.94, 0.3 + runoffVisual3d / 145 + snowmeltIntensity3d * 0.18);
              river3d.material.emissiveIntensity = 0.1 + runoffVisual3d / 420 + snowmeltIntensity3d * 0.14;
              aquifer3d.material.opacity = Math.min(0.92, 0.28 + infiltrationVisual3d / 180 +
                ((state3d === 'infiltrating' || state3d === 'infiltration' || state3d === 'aquifer_flow') ? 0.2 : 0));
              aquifer3d.material.emissiveIntensity = 0.12 + infiltrationVisual3d / 300;
              vapor3d.material.opacity = Math.min(0.92, 0.28 + solarVisual3d * 0.2 + Math.max(0, tempVisual3d) / 180) *
                (condensationTransfer3d ? Math.max(0.08, parcelGasBlend3d) : 1);
              rain3d.material.color.setHex(snowDriftActive3d ? 0xe0f2fe : tempVisual3d <= 3 ? 0x93c5fd : 0x69d7ff);
              rain3d.material.size = snowDriftActive3d ? 0.105 : 0.075;
              grass3d.material.color.setHex(coverVisual3d === 'forest' ? 0x245c3a : coverVisual3d === 'urban' ? 0x68737d : 0x5d8f3b);
              if (controls3d) {
                if (!userOrbit3d) controls3d.target.lerp(target3d, motionReduced3d ? 1 : 0.035);
                controls3d.update();
              } else {
                camera.lookAt(target3d);
              }
              renderer.render(scene, camera);
              canvasEl.dataset.rendered = 'true';
              frame3d = requestAnimationFrame(animateJourney3d);
            }

            function cleanupJourney3d() {
              if (!alive3d) return;
              alive3d = false;
              if (frame3d) cancelAnimationFrame(frame3d);
              if (resizeObserver3d) resizeObserver3d.disconnect();
              canvasEl.removeEventListener('pointerdown', handleBranchPointerDown3d);
              canvasEl.removeEventListener('pointermove', handleBranchPointerMove3d);
              canvasEl.removeEventListener('pointerleave', handleBranchPointerLeave3d);
              canvasEl.removeEventListener('click', handleBranchClick3d);
              canvasEl.style.cursor = '';
              if (controls3d) controls3d.dispose();
              scene.traverse(function(obj) {
                if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
                if (obj.material) {
                  var materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                  materials.forEach(function(mat) { if (mat && mat.dispose) mat.dispose(); });
                }
              });
              labelTextures3d.forEach(function(labelTexture3d) { if (labelTexture3d && labelTexture3d.dispose) labelTexture3d.dispose(); });
              renderer.dispose();
              canvasEl._wc3dCleanup = null;
              canvasEl._wc3dResetCamera = null;
              canvasEl._wc3dAdjustCamera = null;
            }
            canvasEl._wc3dCleanup = cleanupJourney3d;
            animateJourney3d();
          };
          function onWcKey(e) {
            var tgt = e.target || {};
            var tn = (tgt.tagName || '').toUpperCase();
            if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
            var k = e.key;
            if (k >= '1' && k <= '9') {
              var idx = parseInt(k, 10) - 1;
              if (STAGES[idx]) {
                e.preventDefault();
                var st = STAGES[idx];
                selectStage(st.id);
                if (typeof announceToSR === 'function') announceToSR('Stage ' + (idx + 1) + ': ' + st.label + '.');
              }
            } else if (k === 'j' || k === 'J') {
              e.preventDefault();
              if (d.journeyActive) {
                upd('journeyActive', false); upd('journeyState', 'idle'); upd('journeyPaused', false);
                var cvOff = document.getElementById('wcCanvas'); if (cvOff) cvOff.dataset.journeyState = 'idle';
                if (typeof announceToSR === 'function') announceToSR('Journey ended.');
              } else {
                upd('journeyActive', true); upd('journeyState', 'ocean'); upd('journeyPaused', false);
                upd('activeStage', 'collection');
                upd('journeyLoops', d.journeyLoops || 0);
                upd('journeyPaths', d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 });
                var cvOn = document.getElementById('wcCanvas'); if (cvOn) cvOn.dataset.journeyState = 'ocean';
                if (typeof announceToSR === 'function') announceToSR('Journey started. You are now a water droplet in the ocean.');
              }
            } else if (d.journeyActive && d.journeyState === 'ground_choice' && (k === 'r' || k === 'R' || k === 'u' || k === 'U' || k === 'p' || k === 'P')) {
              e.preventDefault();
              var choice = (k === 'r' || k === 'R') ? 'runoff' : (k === 'u' || k === 'U') ? 'infiltrate' : 'plant';
              chooseJourneyPath(choice);
            }
          }

          var currentSolar = d.climSolar != null ? d.climSolar : 1.0;
          var currentTemp = d.climTemp != null ? d.climTemp : 15;
          var currentWind = d.climWind != null ? d.climWind : 1.0;
          var journeyView = d.journeyView || '2d';
          var journeyActiveStageMap = { ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation',
            precipitating: 'precipitation', ground_choice: 'precipitation', river_runoff: 'collection',
            infiltrating: 'infiltration', aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration' };
          var resolvedStageId = d.journeyActive
            ? (journeyActiveStageMap[d.journeyState || 'ocean'] || d.activeStage || 'collection')
            : (d.activeStage || 'evaporation');
          var resolvedStage = STAGES.find(function(stage) { return stage.id === resolvedStageId; });
          var currentStageLabel = resolvedStage ? resolvedStage.label : (sel ? sel.label : 'Evaporation');
          var completedChallengeCount = (d.completedChallenges || []).length;
          var viewedStageCount = Object.keys(d.stagesViewed || {}).length;
          var journeyLabel = d.journeyActive
            ? ((d.journeyState || 'ocean').replace(/_/g, ' '))
            : 'Ready to start';
          var immersiveStageLabel = d.journeyActive ? journeyLabel : currentStageLabel + ' preview';
          var journeyPaused = !!d.journeyPaused;
          var journeySpeed = d.journeySpeed || 1;
          var journeyStatusLabel = !d.journeyActive ? 'Previewing the selected process' :
            d.journeyState === 'ground_choice' ? 'Waiting for a land pathway choice' :
            journeyPaused ? 'Journey paused' :
            'Moving at ' + journeySpeed + 'x speed';
          var journeyTimelineSteps = ['Ocean', 'Vapor', 'Cloud', 'Precipitation', 'Land pathway', 'Return'];
          var journeyTimelineIndex = {
            ocean: 0,
            evaporating: 1,
            condensing: 2,
            precipitating: 3,
            ground_choice: 4,
            river_runoff: 4,
            infiltrating: 4,
            aquifer_flow: 4,
            plant_absorb: 4,
            transpiring: 4,
            complete: 5
          }[d.journeyState || 'ocean'];
          if (journeyTimelineIndex == null) journeyTimelineIndex = 0;
          var lensStageMap = {
            evaporation: 'evaporating', condensation: 'condensing', precipitation: 'precipitating',
            collection: 'ocean', transpiration: 'transpiring', infiltration: 'infiltrating'
          };
          var lensState = d.journeyActive ? (d.journeyState || 'ocean') : (lensStageMap[d.activeStage || 'evaporation'] || 'ocean');
          var journeyLensMap = {
            ocean: { state: 'Liquid storage', driver: 'Solar energy begins the next transfer', pace: 'Variable residence' },
            evaporating: { state: 'Liquid to gas', driver: 'Net surface energy', pace: 'Energy dependent' },
            condensing: { state: 'Gas to liquid or ice', driver: 'Cooling; latent heat released', pace: 'Cloud microphysics' },
            precipitating: { state: 'Liquid or solid', driver: 'Gravity after particle growth', pace: 'Minutes to hours' },
            ground_choice: { state: 'Liquid at the surface', driver: 'Gravity plus land properties', pace: 'Path dependent' },
            river_runoff: { state: 'Liquid surface flow', driver: 'Gravity over terrain', pace: 'Usually fast' },
            infiltrating: { state: 'Liquid in pore spaces', driver: 'Gravity plus capillarity', pace: 'Soil dependent' },
            aquifer_flow: { state: 'Groundwater', driver: 'Hydraulic gradient', pace: 'Often slow' },
            plant_absorb: { state: 'Liquid in xylem', driver: 'Water-potential gradient', pace: 'Biology plus weather' },
            transpiring: { state: 'Liquid to gas', driver: 'Solar energy plus stomata', pace: 'Daytime responsive' },
            complete: { state: 'Liquid storage', driver: 'Cycle continues', pace: 'No fixed endpoint' }
          };
          var journeyLens = journeyLensMap[lensState] || journeyLensMap.ocean;
          var journeyPaths = Object.assign({ runoff: 0, infiltrate: 0, plant: 0 }, d.journeyPaths || {});
          var journey3dPaths = Object.assign({ runoff: 0, infiltrate: 0, plant: 0 }, d.journey3dPaths || {});
          var journey3dVisited = d.journey3dStatesVisited || {};
          var hydroMissions = [
            { id: 'cloud', name: 'Cloud Chaser', detail: 'Reach condensation in 3D', complete: !!journey3dVisited.condensing },
            { id: 'river', name: 'River Runner', detail: 'Travel by surface runoff in 3D', complete: journey3dPaths.runoff > 0 },
            { id: 'deep', name: 'Deep Current', detail: 'Enter soil or an aquifer in 3D', complete: journey3dPaths.infiltrate > 0 },
            { id: 'green', name: 'Green Return', detail: 'Travel through a plant in 3D', complete: journey3dPaths.plant > 0 },
            { id: 'routes', name: 'Route Master', detail: 'Explore all three land paths in 3D', complete: journey3dPaths.runoff > 0 && journey3dPaths.infiltrate > 0 && journey3dPaths.plant > 0 },
            { id: 'cycle', name: 'Cycle Keeper', detail: 'Complete a full 3D cycle', complete: !!journey3dVisited.complete }
          ];
          var hydroCompleted = hydroMissions.filter(function(mission) { return mission.complete; }).length;
          var hydroPoints = hydroCompleted * 20;
          var hydroRank = hydroPoints >= 120 ? 'Cycle Guardian' :
            hydroPoints >= 80 ? 'Hydro Explorer' :
            hydroPoints >= 40 ? 'Watershed Scout' :
            hydroPoints >= 20 ? 'Droplet' : 'Observer';
          var weatherLabel = currentTemp < 0 ? 'Cold-surface scenario' :
            currentTemp > 30 ? 'Hot-surface scenario' :
            currentSolar < 0.3 ? 'Night cycle' :
            currentTemp > 2 && currentTemp < 18 ? 'Fog and rain' :
            'Balanced cycle';
          var evaporationIndex = Math.max(0.2, Math.min(2, currentSolar * (currentTemp / 15)));
          var landRainIntensity = d.landRainIntensity != null ? d.landRainIntensity : 55;
          var landSaturation = d.landSaturation != null ? d.landSaturation : 45;
          var landPermeability = d.landPermeability || 'medium';
          var landSlope = d.landSlope || 'moderate';
          var landCover = d.landCover || 'grass';
          var permeabilityResistance = { high: 0.15, medium: 0.5, low: 0.85 }[landPermeability];
          var slopePressure = { gentle: 0.15, moderate: 0.45, steep: 0.8 }[landSlope];
          var coverRunoffPressure = { forest: 0.15, grass: 0.35, urban: 0.9 }[landCover];
          if (permeabilityResistance == null) permeabilityResistance = 0.5;
          if (slopePressure == null) slopePressure = 0.45;
          if (coverRunoffPressure == null) coverRunoffPressure = 0.35;
          var rainPressure = landRainIntensity / 100;
          var saturationPressure = landSaturation / 100;
          // Qualitative teaching indices only. They are intentionally independent,
          // not percentages in a closed water budget and not a calibrated forecast.
          var runoffTendency = Math.round(100 * Math.max(0, Math.min(1,
            0.30 * rainPressure +
            0.25 * saturationPressure +
            0.18 * coverRunoffPressure +
            0.15 * slopePressure +
            0.12 * permeabilityResistance
          )));
          var infiltrationOpportunity = Math.round(100 * Math.max(0, Math.min(1,
            0.32 * (1 - saturationPressure) +
            0.28 * (1 - permeabilityResistance) +
            0.20 * (1 - coverRunoffPressure) +
            0.12 * (1 - slopePressure) +
            0.08 * (1 - rainPressure)
          )));
          function landIndexBand(value) {
            return value < 35 ? 'Low' : value < 65 ? 'Moderate' : 'High';
          }
          function chooseJourneyPath(pathKey) {
            var stateMap = { runoff: 'river_runoff', infiltrate: 'infiltrating', plant: 'plant_absorb' };
            var stageMap = { runoff: 'collection', infiltrate: 'infiltration', plant: 'transpiration' };
            var spokenMap = { runoff: 'River Runoff', infiltrate: 'Underground infiltration', plant: 'Plant absorption' };
            var nextState = stateMap[pathKey];
            if (!nextState) return;
            var nextPaths = Object.assign({}, journeyPaths);
            nextPaths[pathKey] = (nextPaths[pathKey] || 0) + 1;
            var nextData = {
              journeyState: nextState,
              activeStage: stageMap[pathKey],
              journeyPaths: nextPaths
            };
            if (journeyView === '3d') {
              var next3dPaths = Object.assign({}, journey3dPaths);
              next3dPaths[pathKey] = (next3dPaths[pathKey] || 0) + 1;
              nextData.journey3dPaths = next3dPaths;
            }
            updMulti(nextData);
            var journeyCanvas = document.getElementById('wcCanvas');
            if (journeyCanvas) {
              journeyCanvas.dataset.journeyState = nextState;
              journeyCanvas.dataset.activeStage = stageMap[pathKey];
              journeyCanvas.dataset.journeyProgress = '0';
              if (journeyCanvas._onJourneyTransition) journeyCanvas._onJourneyTransition(nextState);
            }
            if (typeof announceToSR === 'function') announceToSR('Path chosen: ' + spokenMap[pathKey] + '.');
          }

          function controlJourneyCamera(action) {
            var journeyCanvas = document.getElementById('wcJourney3d');
            if (!journeyCanvas) return;
            if (action === 'follow') {
              if (journeyCanvas._wc3dResetCamera) journeyCanvas._wc3dResetCamera();
              if (typeof announceToSR === 'function') announceToSR('Guided 3D camera resumed.');
              return;
            }
            if (journeyCanvas._wc3dAdjustCamera && journeyCanvas._wc3dAdjustCamera(action)) {
              var cameraActionCopy = { left: 'Rotated left.', right: 'Rotated right.', in: 'Zoomed in.', out: 'Zoomed out.' };
              if (typeof announceToSR === 'function') announceToSR(cameraActionCopy[action] || 'Camera adjusted.');
            }
          }
          function handleJourney3dKey(e) {
            var cameraKeyMap = {
              ArrowLeft: 'left', ArrowRight: 'right',
              ArrowUp: 'in', ArrowDown: 'out',
              '+': 'in', '=': 'in', '-': 'out', '_': 'out'
            };
            var action = (e.key === 'f' || e.key === 'F') ? 'follow' : cameraKeyMap[e.key];
            if (!action) return;
            e.preventDefault();
            e.stopPropagation();
            controlJourneyCamera(action);
          }
          function handleJourney3dSceneClick(e) {
            var journeyCanvas = e.currentTarget;
            var requestedPath = journeyCanvas.dataset.routeChoiceRequest || '';
            if (!requestedPath) return;
            journeyCanvas.dataset.routeChoiceRequest = '';
            if (journeyCanvas._wc3dResetCamera) journeyCanvas._wc3dResetCamera();
            chooseJourneyPath(requestedPath);
          }

          function renderLandSegments(label, stateKey, options, selected) {
            return React.createElement("fieldset", { className: "wc-land-control" },
              React.createElement("legend", null, label),
              React.createElement("div", { className: "wc-land-segments" },
                options.map(function(option) {
                  var active = selected === option.id;
                  return React.createElement("button", {
                    key: option.id,
                    type: "button",
                    "aria-pressed": active,
                    onClick: function() { adjustLand(stateKey, option.id); }
                  }, option.label);
                })
              )
            );
          }
          var missionCopy = d.journeyActive
            ? 'Follow the highlighted droplet and choose its path when it reaches the ground.'
            : 'Start a droplet journey or tune the climate sliders to see how energy, temperature, and wind reshape the cycle.';

          return React.createElement("div", {
              className: "wc-explorer-root max-w-3xl mx-auto animate-in fade-in duration-200 " + (isDark ? "text-slate-100" : "text-slate-800"),
              role: "region",
              "aria-label": t('stem.watercycle.water_cycle_keyboard_shortcuts_1_throu', "Water Cycle. Keyboard shortcuts: 1 through 6 select a stage, J toggles Journey mode, R U P choose your journey path."),
              tabIndex: 0,
              onKeyDown: onWcKey
            },

            React.createElement("div", { className: "flex items-center gap-3 mb-3 flex-wrap" },

              React.createElement("button", { 
                onClick: () => setStemLabTool(null), 
                className: "p-1.5 rounded-lg transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors hover:bg-slate-800 text-slate-350 active:scale-[0.97]" : "transition-colors hover:bg-slate-100 text-slate-600 active:scale-[0.97]"), 
                'aria-label': t('stem.watercycle.back_to_tools', 'Back to tools') 
              }, React.createElement(ArrowLeft, { size: 18, className: isDark ? "text-slate-350" : "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold  tracking-tight" + (isDark ? "text-slate-100" : "text-slate-800") }, t('stem.watercycle.water_cycle', "\uD83C\uDF0A Water Cycle")),

              React.createElement("span", { className: "px-2 py-0.5 text-[11px] font-bold rounded-full " + (isDark ? "bg-sky-950/50 text-sky-400 border border-sky-900/50" : "bg-sky-100 text-sky-700") }, "ANIMATED"),

              React.createElement("button", {
                onClick: () => switchMode('steward'),
                className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-sky-500 to-emerald-500 text-white hover:from-sky-600 hover:to-emerald-600 shadow-md focus:ring-2 focus:ring-yellow-500 focus:outline-none",
                'aria-label': t('stem.watercycle.switch_to_watershed_steward_10_year_ca', 'Switch to Watershed Steward 10-year campaign')
              }, t('stem.watercycle.watershed_steward', "\uD83D\uDCA7 Watershed Steward \u2192")),

              React.createElement("button", {
                onClick: () => switchMode('precipHunt'),
                className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-md focus:ring-2 focus:ring-yellow-500 focus:outline-none",
                'aria-label': t('stem.watercycle.switch_to_precipitation_discovery_widg', 'Switch to Precipitation Discovery widget')
              }, t('stem.watercycle.precipitation_lab', "\uD83C\uDF27\uFE0F Precipitation Lab \u2192"))

            ),

            // ═══ GRADE LEVEL SELECTOR ═══
            React.createElement("div", { className: "flex items-center gap-1.5 mb-3 flex-wrap" },
              React.createElement("span", { className: "text-[11px] font-bold uppercase tracking-wider mr-1 " + (isDark ? "text-slate-400" : "text-slate-600") }, t('stem.watercycle.grade', "\uD83C\uDF93 Grade:")),
              GRADE_BANDS.map(function(gb) {
                return React.createElement("button", { 
                  key: gb,
                  onClick: function() {
                    upd('wcGradeOverride', gb);
                    addToast('\uD83C\uDF93 Grade set to ' + gb + ' - content complexity updated!', 'success');
                  },
                  className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (gradeBand === gb ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'transition-colors bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60 active:scale-[0.97]' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 active:scale-[0.97]'))
                }, gb);
              }),
              React.createElement("span", { className: "ml-auto px-2 py-0.5 text-[11px] font-bold rounded-full border " + (isDark ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/50" : "bg-indigo-50 text-indigo-600 border-indigo-200") },
                gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
              )
            ),

            // ═══ CHALLENGES PROGRESS CARD ═══
            React.createElement("section", {
              className: "wc-cycle-brief",
              "data-watercycle-focus": "true",
              "aria-label": t('stem.watercycle.cycle_mission', "Cycle mission")
            },
              React.createElement("div", { className: "wc-brief-top" },
                React.createElement("div", null,
                  React.createElement("div", { className: "wc-kicker" }, t('stem.watercycle.live_cycle_lab', "Live cycle lab")),
                  React.createElement("h4", { className: "wc-brief-title" },
                    d.journeyActive ? t('stem.watercycle.track_the_droplet', "Track the droplet") : t('stem.watercycle.build_the_water_cycle', "Build the water cycle")
                  ),
                  React.createElement("p", { className: "wc-brief-copy" }, missionCopy)
                ),
                React.createElement("span", { className: "wc-status-pill" },
                  (d.journeyActive ? "\uD83D\uDCA7 " : "\uD83C\uDF0D ") + journeyLabel
                )
              ),
              React.createElement("div", { className: "wc-metric-grid" },
                React.createElement("div", { className: "wc-metric" },
                  React.createElement("span", null, t('stem.watercycle.stage', "Stage")),
                  React.createElement("strong", null, currentStageLabel)
                ),
                React.createElement("div", { className: "wc-metric" },
                  React.createElement("span", null, t('stem.watercycle.weather', "Weather")),
                  React.createElement("strong", null, weatherLabel)
                ),
                React.createElement("div", { className: "wc-metric" },
                  React.createElement("span", null, t('stem.watercycle.evaporation_rate', "Evaporation")),
                  React.createElement("strong", null, evaporationIndex.toFixed(2) + "x index")
                ),
                React.createElement("div", { className: "wc-metric" },
                  React.createElement("span", null, t('stem.watercycle.progress', "Progress")),
                  React.createElement("strong", null, viewedStageCount + "/6 stages - " + completedChallengeCount + "/" + WATER_CYCLE_CHALLENGES.length + " challenges")
                )
              )
            ),

            React.createElement("div", {
              "data-watercycle-progress": "true",
              className: "rounded-xl p-3 shadow-md mb-3 flex flex-col gap-2 border " + (isDark ? "bg-slate-950/60 border-slate-800/50 backdrop-blur-md" : "bg-gradient-to-br from-indigo-50 via-sky-50 to-blue-50 border-sky-200") 
            },
              React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { style: { fontSize: "18px" } }, "⭐"),
                  React.createElement("span", { className: "text-sm font-bold " + (isDark ? "text-sky-400" : "text-sky-700") }, (d.researchPoints || 0) + " RP")
                ),
                React.createElement("span", {
                  className: "text-[11px] font-bold px-2.5 py-0.5 rounded-full " + (isDark ? "bg-sky-950/50 text-sky-400 border border-sky-900/40" : "bg-sky-100 text-sky-600")
                }, (d.completedChallenges || []).length + "/" + WATER_CYCLE_CHALLENGES.length + " challenges")
              ),
              React.createElement("div", { className: "w-full rounded-full h-2.5 " + (isDark ? "bg-slate-800/50" : "bg-sky-100/50"), style: { boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" } },
                React.createElement("div", {
                  className: "bg-gradient-to-r from-sky-400 to-indigo-500 h-2.5 rounded-full transition-all duration-500",
                  style: { width: Math.min(100, ((d.completedChallenges || []).length / WATER_CYCLE_CHALLENGES.length) * 100) + "%", boxShadow: isDark ? "0 0 8px rgba(14,165,233,0.5)" : "0 0 8px rgba(14,165,233,0.3)" }
                })
              ),
              React.createElement("div", { className: "flex flex-wrap gap-2 mt-2" },
                WATER_CYCLE_CHALLENGES.map(function(ch) {
                  var done = (d.completedChallenges || []).indexOf(ch.id) !== -1;
                  return React.createElement("div", {
                    key: ch.id, title: ch.name + ": " + ch.desc + " (" + ch.rp + " RP)",
                    className: "text-center cursor-default transition-all " + (done ? "drop-shadow-md" : "opacity-25 grayscale"),
                    style: { fontSize: "18px" }
                  }, ch.icon);
                })
              )
            ),

            React.createElement("div", { className: "wc-view-switch", "data-watercycle-view-switch": "true" },
              React.createElement("div", { className: "wc-view-segments", role: "group", "aria-label": "Water Cycle visualization" },
                React.createElement("button", {
                  type: "button",
                  "aria-pressed": journeyView === '2d',
                  onClick: function() { upd('journeyView', '2d'); }
                }, "System Map"),
                React.createElement("button", {
                  type: "button",
                  "aria-pressed": journeyView === '3d',
                  onClick: function() { upd('journeyView', '3d'); }
                }, "Droplet Journey")
              ),
              React.createElement("div", { className: "wc-view-status" },
                React.createElement("div", {
                  className: "wc-3d-status",
                  role: "status",
                  "aria-live": "polite",
                  "aria-atomic": "true"
                }, journeyView === '3d'
                  ? "Droplet view: " + immersiveStageLabel + " | " + journeyStatusLabel + " | illustrative scale"
                  : "Systems view: six connected water-cycle processes"),
                journeyView === '3d' && React.createElement("button", {
                  type: "button",
                  className: "wc-camera-reset",
                  title: "Resume guided camera",
                  "aria-label": "Resume guided camera",
                  onClick: function() {
                    var journeyCanvas = document.getElementById('wcJourney3d');
                    if (journeyCanvas && journeyCanvas._wc3dResetCamera) journeyCanvas._wc3dResetCamera();
                    if (typeof announceToSR === 'function') announceToSR('Guided 3D camera resumed.');
                  }
                }, "\u21BA")
              )
            ),

            journeyView === '3d' && React.createElement("div", {
              className: "wc-journey-lens",
              role: "region",
              "aria-label": "Current water parcel state"
            },
              React.createElement("div", null,
                React.createElement("span", null, "State"),
                React.createElement("strong", null, journeyLens.state)
              ),
              React.createElement("div", null,
                React.createElement("span", null, "Dominant driver"),
                React.createElement("strong", null, journeyLens.driver)
              ),
              React.createElement("div", null,
                React.createElement("span", null, "Relative pace"),
                React.createElement("strong", null, journeyLens.pace)
              ),
              React.createElement("div", null,
                React.createElement("span", null, "Journey status"),
                React.createElement("strong", null, journeyStatusLabel)
              ),
            ),

            journeyView === '3d' && React.createElement("section", {
              className: "wc-hydro-quest",
              "data-watercycle-hydro-quest": "true",
              "aria-labelledby": "wcHydroQuestTitle"
            },
              React.createElement("div", { className: "wc-hydro-head" },
                React.createElement("div", null,
                  React.createElement("span", { className: "wc-hydro-kicker" }, "Hydro Quest"),
                  React.createElement("h4", { id: "wcHydroQuestTitle" }, hydroRank)
                ),
                React.createElement("strong", { className: "wc-hydro-score", "aria-label": hydroPoints + " of 120 Hydro Points" }, hydroPoints + " HP")
              ),
              React.createElement("div", {
                className: "wc-hydro-progress",
                role: "progressbar",
                "aria-label": "Hydro Quest progress",
                "aria-valuemin": 0,
                "aria-valuemax": 120,
                "aria-valuenow": hydroPoints
              }, React.createElement("span", { style: { width: (hydroPoints / 1.2) + "%" } })),
              React.createElement("div", { className: "wc-hydro-missions" },
                hydroMissions.map(function(mission) {
                  return React.createElement("div", {
                    key: mission.id,
                    className: "wc-hydro-mission" + (mission.complete ? " is-complete" : ""),
                    "data-mission": mission.id
                  },
                    React.createElement("span", { className: "wc-hydro-mark", "aria-hidden": "true" }, mission.complete ? "\u2713" : "\u25cb"),
                    React.createElement("span", null,
                      React.createElement("strong", null, mission.name),
                      React.createElement("small", null, mission.detail)
                    ),
                    React.createElement("span", { className: "wc-hydro-state" }, mission.complete ? "Complete" : "Open")
                  );
                })
              )
            ),

            React.createElement("div", {
              className: "wc-canvas-shell relative rounded-xl overflow-hidden shadow-lg mb-3 border-2 " + (isDark ? "border-slate-800/80" : "border-sky-300"),
              "data-watercycle-canvas-shell": "true"
            },

              React.createElement("div", { className: "wc-canvas-topbar", "aria-hidden": "true" },
                React.createElement("div", { className: "wc-canvas-title" },
                  React.createElement("span", null, (journeyView === '3d' ? "Immersive droplet journey" : t('stem.watercycle.live_cycle_model', "Live cycle model"))),
                  React.createElement("strong", null, currentStageLabel)
                ),
                React.createElement("div", { className: "wc-chip-row" },
                  React.createElement("span", { className: "wc-chip" }, weatherLabel),
                  React.createElement("span", { className: "wc-chip" }, currentTemp + "\u00B0C"),
                  React.createElement("span", { className: "wc-chip" }, "Wind " + currentWind.toFixed(1) + "x")
                )
              ),
              React.createElement("canvas", {
                role: "img",
                tabIndex: journeyView === '2d' ? 0 : -1,
                "aria-hidden": journeyView === '3d' ? "true" : undefined,
                "aria-label": "Water cycle animation showing the " + resolvedStageId + " stage.",
                ref: canvasRef,
                id: "wcCanvas",
                className: "wc-canvas-element",
                "data-watercycle-canvas": "true",
                "data-render-mode": journeyView === '2d' ? 'visual' : 'state-only',
                "data-active-stage": resolvedStageId,
                "data-journey-state": d.journeyActive ? (d.journeyState || 'ocean') : 'idle',
                "data-journey-paused": String(!!d.journeyPaused),
                "data-journey-speed": String(d.journeySpeed || 1),
                "data-clim-solar": String(d.climSolar != null ? d.climSolar : 1.0),
                "data-clim-temp": String(d.climTemp != null ? d.climTemp : 15),
                "data-clim-wind": String(d.climWind != null ? d.climWind : 1.0),
                "data-dark-mode": String(isDark),
                style: {
                  position: "absolute", inset: 0, width: "100%", height: "100%", display: "block",
                  opacity: journeyView === '2d' ? 1 : 0, pointerEvents: journeyView === '2d' ? "auto" : "none",
                  transition: "opacity 240ms ease"
                }
              }),
              journeyView === '3d' && React.createElement("p", { id: "wcJourney3dInstructions", className: "sr-only" },
                "Use left and right arrows to rotate, up and down arrows to zoom, and F to resume the guided droplet camera. At the land decision, select a highlighted route in the scene or use the route buttons. During river runoff, move across the estuary plume to compare river water, brackish mixing, and ocean water. With forest cover, water beads show rain stored on leaves, falling drops show delayed throughfall, and rising particles show intercepted water evaporating back to the air. The wind control changes ocean wave speed and breaking intensity. Wind streamlines and arrowheads show layered atmospheric transport, while stronger wind pushes rain farther downwind. During precipitation, airflow arcs upward over the mountains and produces windward rain or snow through orographic lift. Descending leeward air reveals a warmer, drier rain shadow with cracked ground and rising haze. During condensation, bright nuclei seed growing cloud droplets; connecting lines show coalescence, while crystal glints indicate freezing. During evaporation, solar energy, temperature, and wind change how many surface molecules escape and how quickly they rise. Cold conditions store water as snow; warming and sunlight release meltwater down the mountains into the river. The mountain gauge reports stored snow percentage and whether it is accumulating, stored, or melting."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dUrbanInstructions", className: "sr-only"
              }, "With urban cover, roof runoff converges through curb channels and a storm drain before pulsing rapidly toward the river."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dGrassInstructions", className: "sr-only"
              }, "With grass cover, droplets pause on blades before moving through shallow soil, reducing and delaying surface runoff."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dRouteBalanceInstructions", className: "sr-only"
              }, "At the land decision, percentages compare relative runoff, groundwater recharge, and plant uptake tendencies from the current land cover and controls; they are teaching comparisons, not measured water volumes."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dGroundwaterInstructions", className: "sr-only"
              }, "In the underground cutaway, the luminous water table rises during recharge and recedes slowly afterward; upward particles show the capillary fringe. Its level is a schematic storage indicator, not a measured depth."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dSedimentInstructions", className: "sr-only"
              }, "During river runoff, tan particles show a relative suspended-sediment signal moving into the estuary. Stronger runoff raises the cue while forest cover buffers it; this is not a concentration or pollutant model."
              ),
              journeyView === '3d' && React.createElement("p", {
                id: "wcJourney3dFloodplainInstructions", className: "sr-only"
              }, "During high runoff, side pools fill across the floodplain, temporarily storing water and settling some suspended material. They drain back slowly after the river pulse; storage is a relative teaching cue, not a mapped flood forecast."
              ),
              journeyView === '3d' && React.createElement("canvas", {
                role: "img",
                tabIndex: 0,
                "aria-label": "Three-dimensional tracked water parcel in the " + immersiveStageLabel + " stage. " + journeyStatusLabel + ". Drag or use arrow keys to explore the scene.",
                "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown F",
                "aria-describedby": "wcJourney3dInstructions wcJourney3dUrbanInstructions wcJourney3dGrassInstructions wcJourney3dRouteBalanceInstructions wcJourney3dGroundwaterInstructions wcJourney3dSedimentInstructions wcJourney3dFloodplainInstructions",
                onKeyDown: handleJourney3dKey,
                onClick: handleJourney3dSceneClick,
                ref: journey3dRef,
                id: "wcJourney3d",
                className: "wc-journey-3d",
                "data-watercycle-journey-3d": "true",
                "data-active-stage": resolvedStageId,
                "data-journey-state": d.journeyActive ? (d.journeyState || 'ocean') : 'idle',
                "data-journey-paused": String(!!d.journeyPaused),
                "data-journey-speed": String(d.journeySpeed || 1),
                "data-hydro-points": String(hydroPoints),
                "data-runoff-index": String(runoffTendency),
                "data-infiltration-index": String(infiltrationOpportunity),
                "data-rain-intensity": String(landRainIntensity),
                "data-clim-solar": String(currentSolar),
                "data-clim-temp": String(currentTemp),
                "data-clim-wind": String(currentWind),
                "data-land-cover": landCover
              }),
              journeyView === '3d' && (!labToolData._threeLoaded || labToolData._threeLoadError || d.journey3dError) && React.createElement("div", {
                className: "wc-3d-loading",
                role: "status",
                "aria-live": "polite"
              },
                (labToolData._threeLoadError || d.journey3dError)
                  ? React.createElement("div", { style: { textAlign: "center", maxWidth: 360, padding: 20 } },
                      React.createElement("p", { style: { margin: "0 0 12px", lineHeight: 1.5 } }, labToolData._threeLoadError || d.journey3dError),
                      React.createElement("button", {
                        type: "button",
                        onClick: function() { updMulti({ journeyView: '2d', journey3dError: '' }); },
                        className: "px-3 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      }, "Return to 2D Cycle")
                    )
                  : "Loading the 3D water journey..."
              ),

              // Weather badge overlay
              (d.climTemp != null && d.climTemp < 0) && React.createElement("div", { className: "absolute top-16 left-2 px-2 py-1 bg-blue-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, t('stem.watercycle.snow', "\u2744\uFE0F SNOW")),
              (d.climTemp != null && d.climTemp > 30) && React.createElement("div", { className: "absolute top-16 left-2 px-2 py-1 bg-amber-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, "HOT SURFACE"),
              (d.climSolar != null && d.climSolar < 0.3) && React.createElement("div", { className: "absolute top-16 right-2 px-2 py-1 bg-indigo-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, t('stem.watercycle.night', "\uD83C\uDF19 NIGHT")),

              journeyView === '3d' && d.journeyActive && d.journeyState === 'ground_choice' && React.createElement("section", {
                className: "wc-viewport-choice",
                role: "group",
                "aria-labelledby": "wcViewportChoiceTitle",
                "aria-live": "polite",
                "aria-atomic": "true",
              },
                React.createElement("h5", { id: "wcViewportChoiceTitle" }, "Choose where the droplet travels next"),
                React.createElement("p", null, "The land scenario changes each pathway's tendency, but you remain in control."),
                React.createElement("div", { className: "wc-viewport-choice-grid" },
                  React.createElement("button", {
                    type: "button",
                    "data-route-choice": "runoff",
                    "aria-label": "Choose River Runoff path. Runoff tendency " + landIndexBand(runoffTendency),
                    onClick: function() { chooseJourneyPath('runoff'); }
                  },
                    React.createElement("strong", null, "\uD83C\uDF0A River Runoff"),
                    React.createElement("span", null, "Runoff tendency: " + landIndexBand(runoffTendency))
                  ),
                  React.createElement("button", {
                    type: "button",
                    "data-route-choice": "infiltrate",
                    "aria-label": "Choose Underground infiltration path. Infiltration opportunity " + landIndexBand(infiltrationOpportunity),
                    onClick: function() { chooseJourneyPath('infiltrate'); }
                  },
                    React.createElement("strong", null, "\uD83E\uDEB4 Underground"),
                    React.createElement("span", null, "Infiltration opportunity: " + landIndexBand(infiltrationOpportunity))
                  ),
                  React.createElement("button", {
                    type: "button",
                    "data-route-choice": "plant",
                    "aria-label": "Choose Plant absorption path",
                    onClick: function() { chooseJourneyPath('plant'); }
                  },
                    React.createElement("strong", null, "\uD83C\uDF3F Enter Plant"),
                    React.createElement("span", null, "Return through transpiration")
                  )
                )
              ),

              journeyView === '3d' && React.createElement("div", {
                className: "wc-viewport-dock",
                role: "group",
                "aria-label": "Droplet journey and 3D camera controls"
              },
                React.createElement("div", { className: "wc-viewport-state" },
                  React.createElement("span", null, d.journeyActive ? "Current parcel state" : "Ready"),
                  React.createElement("strong", null, immersiveStageLabel)
                ),
                React.createElement("div", { className: "wc-viewport-actions" },
                  !d.journeyActive ? React.createElement("button", {
                    type: "button",
                    className: "wc-viewport-start",
                    "aria-label": "Start droplet journey in the ocean",
                    onClick: function() {
                      updMulti({
                        journeyActive: true, journeyState: 'ocean', activeStage: 'collection', journeyPaused: false,
                        journeyLoops: d.journeyLoops || 0,
                        journeyPaths: d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 }
                      });
                      var startCanvas = document.getElementById('wcCanvas');
                      if (startCanvas) {
                        startCanvas.dataset.journeyState = 'ocean';
                        startCanvas.dataset.activeStage = 'collection';
                        startCanvas.dataset.journeyPaused = 'false';
                        startCanvas.dataset.journeyProgress = '0';
                      }
                      if (typeof announceToSR === 'function') announceToSR('Droplet journey started in the ocean.');
                    }
                  }, "\uD83D\uDCA7 Begin as a droplet") : React.createElement(React.Fragment, null,
                    React.createElement("button", {
                      type: "button", className: "wc-viewport-btn",
                      disabled: d.journeyState === 'ground_choice' || d.journeyState === 'complete',
                      "aria-label": journeyPaused ? "Resume water journey" : "Pause water journey",
                      onClick: function() {
                        var nextPaused = !journeyPaused;
                        upd('journeyPaused', nextPaused);
                        var pauseCanvas = document.getElementById('wcCanvas');
                        if (pauseCanvas) pauseCanvas.dataset.journeyPaused = String(nextPaused);
                      }
                    }, journeyPaused ? "\u25B6" : "\u23F8"),
                    React.createElement("button", {
                      type: "button", className: "wc-viewport-btn", "aria-label": "Restart water journey from the ocean",
                      onClick: function() {
                        updMulti({ journeyState: 'ocean', activeStage: 'collection', journeyPaused: false });
                        var restartCanvas = document.getElementById('wcCanvas');
                        if (restartCanvas && restartCanvas._wcRestartJourney) restartCanvas._wcRestartJourney();
                      }
                    }, "\u21BA"),
                    [0.5, 1, 2].map(function(speedOption) {
                      return React.createElement("button", {
                        key: 'viewport-speed-' + speedOption,
                        type: "button", className: "wc-viewport-btn",
                        "aria-label": "Journey speed " + speedOption + " times",
                        "aria-pressed": journeySpeed === speedOption,
                        onClick: function() {
                          upd('journeySpeed', speedOption);
                          var speedCanvas = document.getElementById('wcCanvas');
                          if (speedCanvas) speedCanvas.dataset.journeySpeed = String(speedOption);
                        }
                      }, speedOption + "\u00D7");
                    })
                  ),
                  [{ action: 'left', label: 'Rotate scene left', icon: '\u2190' }, { action: 'right', label: 'Rotate scene right', icon: '\u2192' },
                   { action: 'in', label: 'Zoom in', icon: '+' }, { action: 'out', label: 'Zoom out', icon: '\u2212' },
                   { action: 'follow', label: 'Follow the droplet with the guided camera', icon: '\u25CE' }].map(function(cameraControl) {
                    return React.createElement("button", {
                      key: cameraControl.action,
                      type: "button", className: "wc-viewport-btn",
                      "aria-label": cameraControl.label,
                      onClick: function() { controlJourneyCamera(cameraControl.action); }
                    }, cameraControl.icon);
                  })
                )
              )

            ),

            // ═══ CLIMATE LAB  -  Interactive Controls ═══
            React.createElement("div", {
              className: "wc-control-panel rounded-xl p-3 mb-3 shadow-md border-2 " + (isDark ? "bg-slate-950/60 border-amber-900/40 backdrop-blur-md" : "bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 border-amber-200"),
              "data-watercycle-climate": "true"
            },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-lg" }, "\uD83C\uDF21"),
                React.createElement("h4", { className: "text-sm font-bold " + (isDark ? "text-amber-400" : "text-amber-800") }, t('stem.watercycle.climate_lab', "Climate Lab")),
                React.createElement("span", { className: "px-2 py-0.5 text-[11px] font-bold rounded-full " + (isDark ? "bg-amber-950/50 text-amber-300 border border-amber-900/30" : "bg-amber-200 text-amber-800") }, "INTERACTIVE")
              ),
              React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                // Solar Intensity
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold flex items-center gap-1 " + (isDark ? "text-amber-400" : "text-amber-700") }, "\u2600\uFE0F Solar: " + ((d.climSolar != null ? d.climSolar : 1.0) * 100).toFixed(0) + "%"),
                  React.createElement("input", {
                    type: "range", min: "0", max: "2", step: "0.05",
                    "aria-label": t('stem.watercycle.solar_intensity_slider', 'Solar intensity'),
                    value: d.climSolar != null ? d.climSolar : 1.0,
                    onChange: function(e) { adjustClimate('climSolar', parseFloat(e.target.value)); },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-indigo-300 via-amber-300 to-amber-500 cursor-pointer focus:ring-2 focus:ring-yellow-500 focus:outline-none",
                    style: { accentColor: '#f59e0b' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] " + (isDark ? "text-amber-500/80" : "text-amber-500") },
                    React.createElement("span", null, t('stem.watercycle.night_2', "\uD83C\uDF19 Night")),
                    React.createElement("span", null, t('stem.watercycle.bright', "\u2600\uFE0F Bright"))
                  )
                ),
                // Temperature
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold flex items-center gap-1 " + (isDark ? "text-sky-400" : "text-sky-700") }, "\uD83C\uDF21\uFE0F Temp: " + (d.climTemp != null ? d.climTemp : 15) + "\u00B0C"),
                  React.createElement("input", {
                    type: "range", min: "-20", max: "45", step: "1",
                    "aria-label": t('stem.watercycle.temperature_slider_celsius', 'Temperature in degrees Celsius'),
                    value: d.climTemp != null ? d.climTemp : 15,
                    onChange: function(e) { adjustClimate('climTemp', parseFloat(e.target.value)); },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-blue-400 via-emerald-300 to-red-400 cursor-pointer focus:ring-2 focus:ring-yellow-500 focus:outline-none",
                    style: { accentColor: '#0ea5e9' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] " + (isDark ? "text-sky-500/80" : "text-sky-500") },
                    React.createElement("span", null, t('stem.watercycle.20', "\u2744\uFE0F -20\u00B0")),
                    React.createElement("span", null, t('stem.watercycle.45', "\uD83D\uDD25 45\u00B0"))
                  )
                ),
                // Wind Speed
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold flex items-center gap-1 " + (isDark ? "text-emerald-400" : "text-emerald-700") }, "\uD83C\uDF2C\uFE0F Wind: " + ((d.climWind != null ? d.climWind : 1.0)).toFixed(1) + "x"),
                  React.createElement("input", {
                    type: "range", min: "0", max: "3", step: "0.1",
                    "aria-label": t('stem.watercycle.wind_speed_slider', 'Wind speed multiplier'),
                    value: d.climWind != null ? d.climWind : 1.0,
                    onChange: function(e) { adjustClimate('climWind', parseFloat(e.target.value)); },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-slate-200 to-emerald-400 cursor-pointer focus:ring-2 focus:ring-yellow-500 focus:outline-none",
                    style: { accentColor: '#22c55e' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] " + (isDark ? "text-emerald-500/80" : "text-emerald-500") },
                    React.createElement("span", null, t('stem.watercycle.calm', "Calm")),
                    React.createElement("span", null, t('stem.watercycle.gale', "\uD83C\uDF2A Gale"))
                  )
                )
              ),
              // Weather readout
              React.createElement("div", { className: "mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold" },
                (d.climTemp != null && d.climTemp < 0) && React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-blue-950/60 text-blue-300 border border-blue-900/50" : "bg-blue-100 text-blue-700") }, t('stem.watercycle.snow_active', "\u2744\uFE0F Snow active")),
                (d.climTemp != null && d.climTemp > 30) && React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-amber-950/60 text-amber-300 border border-amber-900/50" : "bg-amber-100 text-amber-700") }, "Hot surface"),
                (d.climSolar != null && d.climSolar > 0.7 && d.climTemp > 10 && d.climTemp < 35) && React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-purple-950/60 text-purple-300 border border-purple-900/50" : "bg-purple-100 text-purple-700") }, t('stem.watercycle.rainbow', "\uD83C\uDF08 Rainbow")),
                (d.climSolar != null && d.climSolar < 0.3) && React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-indigo-950/60 text-indigo-300 border border-indigo-900/50" : "bg-indigo-100 text-indigo-700") }, t('stem.watercycle.stars_visible', "\u2B50 Stars visible")),
                (d.climTemp != null && d.climTemp > 2 && d.climTemp < 18) && React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-slate-800/80 text-slate-350 border border-slate-700/60" : "bg-slate-100 text-slate-600") }, t('stem.watercycle.fog', "\uD83C\uDF2B\uFE0F Fog")),
                React.createElement("span", { className: "px-1.5 py-0.5 rounded " + (isDark ? "bg-sky-950/60 text-sky-300 border border-sky-900/50" : "bg-sky-100 text-sky-600") },
                  "Evaporation index: " + Math.max(0.2, Math.min(2, (d.climSolar != null ? d.climSolar : 1) * ((d.climTemp != null ? d.climTemp : 15) / 15))).toFixed(2) + "x"
                )
              )
            ),

            React.createElement("section", {
              className: "wc-land-lab",
              "data-watercycle-land": "true",
              "aria-labelledby": "wc-land-title"
            },
              React.createElement("div", { className: "wc-land-head" },
                React.createElement("div", null,
                  React.createElement("h4", { id: "wc-land-title", className: "text-sm font-bold " + (isDark ? "text-emerald-300" : "text-emerald-800") }, "Land-Surface Scenario Lab"),
                  React.createElement("p", { className: "text-[11px] mt-1 " + (isDark ? "text-slate-300" : "text-slate-600") }, "Explore how storm and landscape conditions influence pathways after water reaches the ground.")
                ),
                React.createElement("button", {
                  type: "button",
                  title: "Reset land scenario",
                  "aria-label": "Reset land-surface scenario",
                  onClick: resetLandScenario,
                  className: "w-8 h-8 grid place-items-center rounded-md bg-emerald-700 text-white text-lg font-bold focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                }, "\u21BA")
              ),
              React.createElement("div", { className: "wc-land-grid" },
                React.createElement("div", { className: "wc-land-control" },
                  React.createElement("label", { htmlFor: "wc-land-rain" }, "Rainfall intensity: " + landRainIntensity),
                  React.createElement("input", {
                    id: "wc-land-rain",
                    type: "range",
                    min: "0",
                    max: "100",
                    step: "5",
                    value: landRainIntensity,
                    "aria-label": "Rainfall intensity index",
                    onChange: function(e) { adjustLand('landRainIntensity', parseFloat(e.target.value)); },
                    className: "w-full",
                    style: { accentColor: '#0284c7' }
                  })
                ),
                React.createElement("div", { className: "wc-land-control" },
                  React.createElement("label", { htmlFor: "wc-land-saturation" }, "Soil saturation: " + landSaturation),
                  React.createElement("input", {
                    id: "wc-land-saturation",
                    type: "range",
                    min: "0",
                    max: "100",
                    step: "5",
                    value: landSaturation,
                    "aria-label": "Antecedent soil saturation index",
                    onChange: function(e) { adjustLand('landSaturation', parseFloat(e.target.value)); },
                    className: "w-full",
                    style: { accentColor: '#0891b2' }
                  })
                ),
                renderLandSegments("Soil permeability", "landPermeability", [
                  { id: "low", label: "Low" },
                  { id: "medium", label: "Medium" },
                  { id: "high", label: "High" }
                ], landPermeability),
                renderLandSegments("Slope", "landSlope", [
                  { id: "gentle", label: "Gentle" },
                  { id: "moderate", label: "Moderate" },
                  { id: "steep", label: "Steep" }
                ], landSlope),
                renderLandSegments("Land cover", "landCover", [
                  { id: "forest", label: "Forest" },
                  { id: "grass", label: "Grass" },
                  { id: "urban", label: "Urban" }
                ], landCover)
              ),
              React.createElement("div", {
                className: "wc-land-results",
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true"
              },
                React.createElement("div", { className: "wc-land-result" },
                  React.createElement("span", null, "Runoff tendency"),
                  React.createElement("strong", null, landIndexBand(runoffTendency) + " | " + runoffTendency + "/100")
                ),
                React.createElement("div", { className: "wc-land-result", style: { borderLeftColor: "#10b981" } },
                  React.createElement("span", null, "Infiltration opportunity"),
                  React.createElement("strong", null, landIndexBand(infiltrationOpportunity) + " | " + infiltrationOpportunity + "/100")
                )
              ),
              React.createElement("p", { role: "note", className: "text-[11px] mt-2 leading-relaxed " + (isDark ? "text-emerald-200" : "text-emerald-800") },
                "Qualitative teaching indices, not measured percentages or a forecast. They are independent: water can also be stored, evaporated, taken up by organisms, or move laterally. Infiltration does not automatically become groundwater recharge."
              )
            ),
            React.createElement("div", { className: "wc-stage-rack flex flex-wrap gap-1.5 mb-3", role: "group", "data-watercycle-stage-rack": "true", "aria-label": t('stem.watercycle.water_cycle_stages', "Water cycle stages") },
              STAGES.map(function (stage, stageIdx) {
                // active-tab ink: pick near-black or white per stage color so white
                // never sits on a light stage fill (e.g. evaporation amber #f59e0b = 2.15:1).
                var _wcInk = (function (hex) {
                  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
                  var lin = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
                  var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
                  return ((L + 0.05) / 0.05) >= (1.05 / (L + 0.05)) ? '#0a0f1a' : '#ffffff';
                })(stage.color);
                var isActive = (d.activeStage || 'evaporation') === stage.id;
                var shortcut = (stageIdx + 1).toString();
                return React.createElement("button", {
                  "aria-label": "Stage " + shortcut + ": " + stage.label + (isActive ? " (selected)" : ""),
                  "aria-pressed": isActive,
                  key: stage.id,
                  onClick: function () {
                    selectStage(stage.id);
                    if (typeof announceToSR === 'function') announceToSR(stage.label + ' stage selected.');
                    if (typeof canvasNarrate === 'function') {
                      canvasNarrate('waterCycle', 'stage_select', {
                        first: 'Selected ' + stage.label + ' stage. ' + (typeof selDesc === 'string' ? selDesc.substring(0, 80) : ''),
                        repeat: stage.label + ' stage.',
                        terse: stage.label + '.'
                      }, { debounce: 500 });
                    }
                  },
                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isActive ? 'shadow-md' : 'border hover:opacity-80'),
                  style: { backgroundColor: isActive ? stage.color : (isDark ? stage.color + '25' : stage.color + '15'), borderColor: stage.color, color: isActive ? _wcInk : stage.color }
                },
                  React.createElement("span", { className: "inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold " + (isActive ? "bg-white/25 text-white" : "bg-white/60"), "aria-hidden": "true" }, shortcut),
                  React.createElement("span", null, stage.emoji + " " + stage.label));
              })
            ),

            React.createElement("div", {
              className: "wc-control-panel rounded-xl p-4 mb-3 shadow-md border-2 " + (isDark ? "bg-slate-950/60 border-cyan-900/40 backdrop-blur-md" : "bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-300"),
              "data-watercycle-journey": "true"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xl" }, "\uD83D\uDCA7"),
                  React.createElement("h4", { className: "text-sm font-bold " + (isDark ? "text-cyan-400" : "text-cyan-800") }, t('stem.watercycle.journey_mode', "Journey Mode")),
                  React.createElement("span", { className: "px-2 py-0.5 text-[11px] font-bold rounded-full " + (isDark ? "bg-cyan-950/50 text-cyan-300 border border-cyan-900/30" : "bg-cyan-200 text-cyan-800") }, t('stem.watercycle.play_as_water', "PLAY AS WATER"))
                ),
                !d.journeyActive
                  ? React.createElement("button", { "aria-label": t('stem.watercycle.start_journey_mode_shortcut_j', "Start Journey mode (shortcut: J)"),
                      onClick: function() {
                        upd('journeyActive', true);
                        upd('journeyState', 'ocean');
                        upd('activeStage', 'collection');
                        upd('journeyPaused', false);
                        upd('journeyLoops', d.journeyLoops || 0);
                        upd('journeyPaths', d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 });
                        var cv = document.getElementById('wcCanvas');
                        if (cv) { cv.dataset.journeyState = 'ocean'; cv.dataset.activeStage = 'collection'; cv.dataset.journeyProgress = '0'; }
                        if (typeof announceToSR === 'function') announceToSR('Journey started. You are now a water droplet in the ocean.');
                        addToast('\uD83D\uDCA7 You are now a water droplet in the ocean! Watch and learn as you travel through the water cycle.', 'info');
                      },
                      className: "px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-xl hover:from-cyan-600 hover:to-blue-600 shadow-lg transition-all hover:scale-105 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    }, t('stem.watercycle.start_journey_j', "\uD83C\uDFAE Start Journey (J)"))
                  : React.createElement("div", { className: "flex gap-1.5" },
                      React.createElement("button", { "aria-label": t('stem.watercycle.end_journey_mode_shortcut_j', "End Journey mode (shortcut: J)"),
                        onClick: function() {
                          upd('journeyActive', false);
                          upd('journeyState', 'idle');
                          upd('journeyPaused', false);
                          var cv = document.getElementById('wcCanvas');
                          if (cv) { cv.dataset.journeyState = 'idle'; }
                          if (typeof announceToSR === 'function') announceToSR('Journey ended.');
                        },
                        className: "px-3 py-1.5 bg-slate-600 text-white text-[11px] font-bold rounded-lg hover:bg-slate-500 transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none active:scale-[0.97]"
                      }, t('stem.watercycle.end_journey_j', "\u23F9 End Journey (J)"))
                    )
              ),

              !d.journeyActive && React.createElement("div", {
                role: "note",
                style: {
                  padding: '8px 12px', borderRadius: 10,
                  background: isDark ? 'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(14,165,233,0.02) 100%)' : 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(14,165,233,0.04) 100%)',
                  borderTop: isDark ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(14,165,233,0.5)',
                  borderRight: isDark ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(14,165,233,0.5)',
                  borderBottom: isDark ? '1px solid rgba(14,165,233,0.3)' : '1px solid rgba(14,165,233,0.5)',
                  borderLeft: '3px solid #0ea5e9',
                  color: isDark ? '#bae6fd' : '#0c4a6e', fontSize: 12.5, lineHeight: 1.55
                }
              },
                React.createElement("strong", { style: { color: isDark ? '#38bdf8' : '#0369a1' } }, "Goal: "),
                t('stem.watercycle.ride_one_droplet_from_the_ocean_back_t', "ride one droplet from the ocean back to the ocean. You will start in the ocean, evaporate, drift into a cloud, fall as rain, then pick a path at the ground (river runoff, underground infiltration, or absorbed by a plant). Each path takes a different amount of time. Complete the loop to log a journey; 3 loops unlocks the Journey badge.")
              ),

              // Journey status
              d.journeyActive && React.createElement("div", { className: "space-y-2" },
                React.createElement("div", { className: "wc-journey-controls" },
                  React.createElement("div", { className: "wc-journey-actions" },
                    React.createElement("button", {
                      type: "button",
                      className: "wc-journey-icon-btn",
                      disabled: d.journeyState === 'ground_choice' || d.journeyState === 'complete',
                      "aria-label": journeyPaused ? "Resume water journey" : "Pause water journey",
                      title: journeyPaused ? "Resume journey" : "Pause journey",
                      onClick: function() {
                        var nextPaused = !journeyPaused;
                        upd('journeyPaused', nextPaused);
                        var journeyCanvas = document.getElementById('wcCanvas');
                        if (journeyCanvas) journeyCanvas.dataset.journeyPaused = String(nextPaused);
                        if (typeof announceToSR === 'function') announceToSR(nextPaused ? 'Water journey paused.' : 'Water journey resumed.');
                      }
                    }, journeyPaused ? "\u25B6" : "\u23F8"),
                    React.createElement("button", {
                      type: "button",
                      className: "wc-journey-icon-btn",
                      "aria-label": "Restart water journey from the ocean",
                      title: "Restart from ocean",
                      onClick: function() {
                        updMulti({ journeyState: 'ocean', journeyPaused: false });
                        upd('activeStage', 'collection');
                        var journeyCanvas = document.getElementById('wcCanvas');
                        if (journeyCanvas && journeyCanvas._wcRestartJourney) journeyCanvas._wcRestartJourney();
                        if (typeof announceToSR === 'function') announceToSR('Water journey restarted in the ocean.');
                      }
                    }, "\u21BA")
                  ),
                  React.createElement("div", { className: "wc-speed-segments", role: "group", "aria-label": "Journey animation speed" },
                    [0.5, 1, 2].map(function(speedOption) {
                      return React.createElement("button", {
                        key: String(speedOption),
                        type: "button",
                        "aria-pressed": journeySpeed === speedOption,
                        onClick: function() {
                          upd('journeySpeed', speedOption);
                          var journeyCanvas = document.getElementById('wcCanvas');
                          if (journeyCanvas) journeyCanvas.dataset.journeySpeed = String(speedOption);
                          if (typeof announceToSR === 'function') announceToSR('Journey animation speed ' + speedOption + ' times.');
                        }
                      }, speedOption + "\u00D7");
                    })
                  )
                ),
                React.createElement("div", { className: "wc-journey-timeline", role: "list", "aria-label": "Water journey timeline" },
                  journeyTimelineSteps.map(function(step, index) {
                    return React.createElement("div", {
                      key: step,
                      role: "listitem",
                      className: "wc-timeline-step",
                      "aria-current": index === journeyTimelineIndex ? "step" : undefined
                    },
                      React.createElement("strong", null, (index + 1) + ". " + step)
                    );
                  })
                ),
                React.createElement("p", { role: "note", className: "text-[11px] leading-relaxed " + (isDark ? "text-cyan-200" : "text-cyan-800") },
                  "Playback speed changes this animation only. Real water residence times vary enormously; groundwater pathways can take years to millennia."
                ),
                // Current state card
                React.createElement("div", { className: "rounded-lg p-3 border " + (isDark ? "bg-slate-900/60 border-cyan-950/50 text-slate-350" : "bg-white border-cyan-100 text-slate-800") },
                  React.createElement("p", { className: "text-xs font-bold mb-1 " + (isDark ? "text-cyan-400" : "text-cyan-700") },
                    (d.journeyState === 'ground_choice') ? (journeyView === '3d'
                      ? "\uD83E\uDEA8 Choose your path in the viewport above or use the buttons here:" : "\uD83E\uDEA8 Choose your path on the map or use the buttons here:") :
                    (d.journeyState === 'complete') ? "\u2705 You completed the water cycle! +25 XP" :
                    "\uD83D\uDCA7 Current: " + (d.journeyState || 'ocean').replace(/_/g, ' ')
                  ),
                  d.journeyState === 'complete' && React.createElement("p", { className: "text-[11px] leading-snug mt-1 " + (isDark ? "text-emerald-300" : "text-emerald-700") }, t('stem.watercycle.you_rode_the_same_water_molecule_the_w', "You rode the SAME water molecule the whole way around \u2014 it changed form (liquid \u2192 vapor \u2192 liquid) but was never created or destroyed. Every drop you drink has been cycling for billions of years.")),
                  d.journeyState === 'ground_choice' && React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2", role: "group", },
                    React.createElement("button", { "aria-label": t('stem.watercycle.choose_river_runoff_path_shortcut_r', "Choose River Runoff path (shortcut: R)"),
                      onClick: function() { chooseJourneyPath('runoff'); },
                      className: "p-2 rounded-lg text-center border-2 transition-all hover:scale-105 focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-blue-950/40 border-blue-800 hover:bg-blue-900/40 text-blue-300 active:scale-[0.97]" : "transition-colors bg-blue-50 border-blue-600 hover:bg-blue-100 text-blue-700 active:scale-[0.97]")
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83C\uDF0A"),
                      React.createElement("p", { className: "text-[11px] font-bold" }, t('stem.watercycle.river_runoff_r', "River Runoff (R)")),
                      React.createElement("p", { className: "text-[11px] opacity-70" }, "Runoff tendency: " + landIndexBand(runoffTendency))
                    ),
                    React.createElement("button", { "aria-label": t('stem.watercycle.choose_underground_infiltration_path_s', "Choose Underground infiltration path (shortcut: U)"),
                      onClick: function() { chooseJourneyPath('infiltrate'); },
                      className: "p-2 rounded-lg text-center border-2 transition-all hover:scale-105 focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-amber-950/40 border-amber-800 hover:bg-amber-900/40 text-amber-300 active:scale-[0.97]" : "transition-colors bg-amber-50 border-amber-600 hover:bg-amber-100 text-amber-700 active:scale-[0.97]")
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83E\uDEB4"),
                      React.createElement("p", { className: "text-[11px] font-bold" }, t('stem.watercycle.underground_u', "Underground (U)")),
                      React.createElement("p", { className: "text-[11px] opacity-70" }, "Infiltration opportunity: " + landIndexBand(infiltrationOpportunity))
                    ),
                    React.createElement("button", { "aria-label": t('stem.watercycle.choose_plant_absorption_path_shortcut_', "Choose Plant absorption path (shortcut: P)"),
                      onClick: function() { chooseJourneyPath('plant'); },
                      className: "p-2 rounded-lg text-center border-2 transition-all hover:scale-105 focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "transition-colors bg-emerald-950/40 border-emerald-800 hover:bg-emerald-900/40 text-emerald-300 active:scale-[0.97]" : "transition-colors bg-emerald-50 border-emerald-600 hover:bg-emerald-100 text-emerald-700 active:scale-[0.97]")
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83C\uDF3F"),
                      React.createElement("p", { className: "text-[11px] font-bold" }, t('stem.watercycle.enter_plant_p', "Enter Plant (P)")),
                      React.createElement("p", { className: "text-[11px] opacity-70" }, "Transpiration!")
                    )
                  ),
                  d.journeyState === 'complete' && React.createElement("button", { "aria-label": t('stem.watercycle.start_another_loop', "Start Another Loop"),
                    onClick: function() {
                      upd('journeyState', 'ocean');
                      upd('journeyPaused', false);
                      upd('activeStage', 'collection');
                      upd('journeyLoops', (d.journeyLoops || 0) + 1);
                      var cv = document.getElementById('wcCanvas');
                      if (cv) { cv.dataset.journeyState = 'ocean'; cv.dataset.activeStage = 'collection'; cv.dataset.journeyProgress = '0'; }
                      awardStemXP('waterCycle', 25, 'Water Cycle journey loop');
                      stemCelebrate();
                      if (typeof announceToSR === 'function') {
                        announceToSR('Starting loop ' + ((d.journeyLoops || 0) + 2) + '. You are now a water droplet in the ocean.');
                      }
                      addToast('\uD83C\uDF89 Cycle complete! +25 XP. Starting new loop...', 'success');
                    },
                    className: "mt-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold rounded-xl hover:from-emerald-600 hover:to-cyan-600 shadow-md transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  }, t('stem.watercycle.start_another_loop_2', "\uD83D\uDD04 Start Another Loop"))
                ),

                // Stats bar
                (d.journeyLoops > 0 || (d.journeyPaths && (d.journeyPaths.runoff || d.journeyPaths.infiltrate || d.journeyPaths.plant))) && React.createElement("div", { className: "flex gap-3 text-[11px] font-bold" },
                  React.createElement("span", { className: "text-cyan-650 text-cyan-400" }, "\uD83D\uDD04 Loops: " + (d.journeyLoops || 0)),
                  React.createElement("span", { className: "text-blue-500 text-blue-400" }, "\uD83C\uDF0A Runoff: " + ((d.journeyPaths && d.journeyPaths.runoff) || 0)),
                  React.createElement("span", { className: "text-amber-500 text-amber-400" }, "\uD83E\uDEB4 Underground: " + ((d.journeyPaths && d.journeyPaths.infiltrate) || 0)),
                  React.createElement("span", { className: "text-emerald-500 text-emerald-400" }, "\uD83C\uDF3F Plant: " + ((d.journeyPaths && d.journeyPaths.plant) || 0))
                )
              ),

              // Inactive description
              !d.journeyActive && React.createElement("p", { className: "text-[11px] text-cyan-500 mt-1" }, t('stem.watercycle.become_a_water_droplet_and_travel_thro', "Become a water droplet and travel through the entire water cycle! Make choices at each stage and learn the science behind each transformation."))
            ),

            sel && React.createElement("div", { 
              className: "rounded-xl p-4 border mb-3 " + (isDark ? "bg-gradient-to-r from-sky-950/20 via-slate-900/60 to-blue-950/20 border-sky-900/50 backdrop-blur-md" : "bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200") 
            },

              React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                React.createElement("span", { className: "text-2xl" }, sel.emoji),

                React.createElement("h4", { className: "text-base font-bold", style: { color: sel.color } }, sel.label)

              ),

              React.createElement("p", { className: "text-sm leading-relaxed mb-2 " + (isDark ? "text-slate-300" : "text-slate-600") }, selDesc),

              selPhase && React.createElement("div", { className: "rounded-lg p-2 mb-2 border text-[11px] font-semibold " + (isDark ? "bg-cyan-950/40 border-cyan-900/50 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800") }, selPhase),

              selFunFact && React.createElement("div", { className: "rounded-lg p-2 border " + (isDark ? "bg-amber-950/40 border-amber-900/50 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700") },

                React.createElement("p", { className: "text-[11px]" }, "\uD83D\uDCA1 " + selFunFact)

              )

            ),

            // ═══ AI HYDROLOGIST TUTOR PANEL ═══
            React.createElement("div", { className: "rounded-xl p-3 mb-3 border " + (isDark ? "bg-slate-950/60 border-slate-800/50 backdrop-blur-md" : "bg-white border-sky-200 shadow-sm") },
              React.createElement("p", { className: "text-xs font-black mb-1 flex items-center gap-1.5 " + (isDark ? "text-slate-200" : "text-slate-700") },
                React.createElement("span", null, "🧠"),
                React.createElement("span", null, t('stem.watercycle.ask_the_ai_hydrologist_tutor', "Ask the AI Hydrologist Tutor"))
              ),
              React.createElement("p", { className: "text-[10px] mb-2 " + (isDark ? "text-slate-400" : "text-slate-500") },
                "Ask questions about the " + (sel ? sel.label : 'water cycle') + " stage, climate feedbacks, or global hydrology."
              ),
              React.createElement("div", { className: "flex gap-2" },
                React.createElement("input", {
                  type: "text",
                  placeholder: t('stem.watercycle.ask_a_question_e_g_why_do_clouds_float', "Ask a question (e.g., Why do clouds float?)..."),
                  value: d.hydrologistQuery || '',
                  onChange: function(e) { upd("hydrologistQuery", e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askHydrologist(); },
                  className: "flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "bg-slate-900 border-slate-800 text-slate-100 focus:border-yellow-500" : "bg-white border-slate-300 text-slate-900 focus:border-yellow-500")
                }),
                React.createElement("button", {
                  disabled: d.hydrologistLoading,
                  onClick: askHydrologist,
                  className: "px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 transition-all disabled:opacity-50 focus:ring-2 focus:ring-yellow-500 focus:outline-none active:scale-[0.97]"
                }, d.hydrologistLoading ? "Thinking..." : "Ask")
              ),
              d.hydrologistReply && React.createElement("div", { className: "mt-2 p-2.5 rounded-lg border animate-in slide-in-from-top-1 " + (isDark ? "bg-sky-950/40 border-sky-900/50 text-slate-200" : "bg-sky-50 border-sky-100 text-slate-700") },
                React.createElement("p", { className: "text-xs leading-relaxed font-medium" }, d.hydrologistReply)
              ),
              d.hydrologistError && React.createElement("p", { className: "text-xs text-red-500 mt-2 font-bold" }, d.hydrologistError)
            ),

            // ═══ WATER BUDGET  -  Live Data Panel ═══
            React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "rounded-xl p-3 mb-3 border " + (isDark ? "bg-slate-950/60 border-slate-800/50 backdrop-blur-md" : "bg-gradient-to-r from-slate-50 to-sky-50 border-slate-400 shadow-sm") },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-base" }, "\uD83D\uDCCA"),
                React.createElement("h4", { className: "text-xs font-bold " + (isDark ? "text-slate-200" : "text-slate-700") }, t('stem.watercycle.water_budget_live', "Scenario Readout")),
                React.createElement("span", { className: "px-1.5 py-0.5 text-[11px] font-bold rounded-full " + (isDark ? "bg-sky-950/60 text-sky-400 border border-sky-900/40" : "bg-sky-100 text-sky-600") }, "TEACHING MODEL")
              ),
              (function() {
                var s2 = d.climSolar != null ? d.climSolar : 1.0;
                var t3 = d.climTemp != null ? d.climTemp : 15;
                var w2 = d.climWind != null ? d.climWind : 1.0;
                var evapRate = Math.max(0.2, Math.min(2, s2 * Math.max(0.2, (t3 + 20) / 35) * (0.85 + w2 * 0.15)));
                var precipType = t3 < -2 ? 'Snow favored' : t3 <= 3 ? 'Mixed / uncertain' : 'Rain favored';
                var runoffDisplay = landIndexBand(runoffTendency) + ' | ' + runoffTendency + '/100';
                var infiltrationDisplay = landIndexBand(infiltrationOpportunity) + ' | ' + infiltrationOpportunity + '/100';
                return React.createElement("div", null, React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
                  React.createElement("div", { className: "rounded-lg p-2 text-center border " + (isDark ? "bg-slate-900/60 border-amber-950/50" : "bg-white border-amber-100") },
                    React.createElement("p", { className: "text-lg font-bold text-amber-500 tracking-tight" }, evapRate.toFixed(2) + "x"),
                    React.createElement("p", { className: "text-[11px] font-bold " + (isDark ? "text-amber-600" : "text-amber-500") }, t('stem.watercycle.evaporation_2', "Evaporation index"))
                  ),
                  React.createElement("div", { className: "rounded-lg p-2 text-center border " + (isDark ? "bg-slate-900/60 border-blue-950/50" : "bg-white border-blue-100") },
                    React.createElement("p", { className: "text-sm font-bold text-blue-500" }, precipType),
                    React.createElement("p", { className: "text-[11px] font-bold " + (isDark ? "text-blue-600" : "text-blue-500") }, t('stem.watercycle.precip_type', "Precip Type"))
                  ),
                  React.createElement("div", { className: "rounded-lg p-2 text-center border " + (isDark ? "bg-slate-900/60 border-cyan-950/50" : "bg-white border-cyan-100") },
                    React.createElement("p", { className: "text-sm font-bold text-cyan-500" }, runoffDisplay),
                    React.createElement("p", { className: "text-[11px] font-bold " + (isDark ? "text-cyan-600" : "text-cyan-500") }, "Runoff tendency")
                  ),
                  React.createElement("div", { className: "rounded-lg p-2 text-center border " + (isDark ? "bg-slate-900/60 border-emerald-950/50" : "bg-white border-emerald-100") },
                    React.createElement("p", { className: "text-sm font-bold text-emerald-500" }, infiltrationDisplay),
                    React.createElement("p", { className: "text-[11px] font-bold " + (isDark ? "text-emerald-600" : "text-emerald-500") }, "Infiltration opportunity")
                  )
                  ),
                  React.createElement("p", { role: "note", className: "text-[11px] mt-2 text-center font-medium " + (isDark ? "text-sky-300" : "text-sky-700") }, "Relative teaching indices, not measurements or a forecast. Surface temperature only hints at precipitation phase; the vertical temperature profile matters. Land controls shape runoff tendency and infiltration opportunity, but neither index is a water-budget percentage. Groundwater recharge remains unresolved.")
                );
              })()
            ),

            React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

              React.createElement("button", { "aria-label": t('stem.watercycle.start_water_cycle_quiz', "Start water cycle quiz"),
                onClick: function () {
                  var pool = WATER_CYCLE_QUIZZES[gradeBand] || WATER_CYCLE_QUIZZES['3-5'];
                  var q = pool[Math.floor(Math.random() * pool.length)];
                  upd('wcQuiz', {
                    q: q.q,
                    a: q.a,
                    opts: q.opts,
                    answered: false,
                    score: (d.wcQuiz && d.wcQuiz.score) || 0,
                    concept: q.concept,
                    wrongFeedback: q.wrongFeedback
                  });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (d.wcQuiz ? (isDark ? 'bg-slate-800 text-sky-400 border border-slate-700' : 'bg-sky-100 text-sky-700') : 'bg-sky-600 text-white')
              }, d.wcQuiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz (" + gradeBand + ")"),

              // ═══ AI GENERATED QUIZ BUTTON ═══
              callGemini && React.createElement("button", { "aria-label": t('stem.watercycle.generate_ai_quiz_question', "Generate AI quiz question"),
                onClick: function() {
                  if (d.aiQuizLoading) return;
                  upd('aiQuizLoading', true);
                  var stageCtx = sel ? sel.id : 'evaporation';
                  var climCtx = 'Solar=' + ((d.climSolar != null ? d.climSolar : 1) * 100).toFixed(0) + '%, Temp=' + (d.climTemp != null ? d.climTemp : 15) + '\u00B0C, Wind=' + ((d.climWind != null ? d.climWind : 1)).toFixed(1) + 'x';
                  var gradeCtx = gradeBand === 'K-2' ? 'kindergarten to 2nd grade (ages 5-7), use very simple words and fun analogies' :
                    gradeBand === '3-5' ? '3rd to 5th grade (ages 8-10), use clear explanations with some science vocabulary' :
                    gradeBand === '6-8' ? '6th to 8th grade (ages 11-13), use proper scientific terminology and quantitative data' :
                    '9th to 12th grade (ages 14-18), use advanced terminology, equations, and real-world data';
                  var prompt = 'You are a science teacher creating a water cycle quiz question. ' +
                    'Grade level: ' + gradeCtx + '. ' +
                    'Current stage being studied: ' + stageCtx + '. ' +
                    'Current climate simulation settings: ' + climCtx + '. ' +
                    'Generate exactly ONE multiple-choice question about the water cycle relevant to this stage and conditions. ' +
                    'Name the core scientific concept (from: evaporation, condensation, precipitation, collection, transpiration, infiltration, aquifer, watershed). ' +
                    'For each distractor, provide a short 1-sentence explanation of why it is incorrect. ' +
                    'Ensure all text uses standard hyphens and NO em-dashes or en-dashes. ' +
                    'Respond ONLY with valid JSON in this exact format (no markdown, no explanation): ' +
                    '{"question":"...","correct":"...","distractors":["...","...","..."],"concept":"...","wrongFeedback":{"distractor1":"why incorrect","distractor2":"why incorrect","distractor3":"why incorrect"}}';
                  callGemini(prompt, true, false, 0.7).then(function(resp) {
                    try {
                      var clean = (typeof resp === 'string' ? resp : '').replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.question && parsed.correct && parsed.distractors && parsed.distractors.length >= 3) {
                        var allOpts = [parsed.correct].concat(parsed.distractors.slice(0, 3)).sort(function() { return Math.random() - 0.5; });
                        upd('wcQuiz', {
                          q: parsed.question,
                          a: parsed.correct,
                          opts: allOpts,
                          answered: false,
                          score: (d.wcQuiz && d.wcQuiz.score) || 0,
                          isAI: true,
                          concept: parsed.concept || stageCtx,
                          wrongFeedback: parsed.wrongFeedback || {}
                        });
                        upd('aiQuizLoading', false);
                      } else { throw new Error('bad format'); }
                    } catch(e) {
                      addToast('\u26A0\uFE0F AI quiz failed, using static question', 'error');
                      upd('aiQuizLoading', false);
                      // Fallback to static
                      var fb = [{ q: 'What percentage of Earth is covered by water?', a: '71%', opts: ['50%', '60%', '71%', '85%'], concept: 'collection', wrongFeedback: { '50%': 'Too low. Earth is 71% water.', '60%': 'Too low. Earth is 71% water.', '85%': 'Too high. Earth is 71% water.' } }];
                      var q2 = fb[0];
                      upd('wcQuiz', { q: q2.q, a: q2.a, opts: q2.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0, concept: q2.concept, wrongFeedback: q2.wrongFeedback });
                    }
                  }).catch(function() {
                    addToast('\u26A0\uFE0F AI unavailable, using static question', 'error');
                    upd('aiQuizLoading', false);
                    var fb = [{ q: 'How much of Earth\'s water is freshwater?', a: '3%', opts: ['3%', '10%', '25%', '50%'], concept: 'collection', wrongFeedback: { '10%': 'Too high. Only 3% is fresh.', '25%': 'Too high. Only 3% is fresh.', '50%': 'Too high. Only 3% is fresh.' } }];
                    var q2 = fb[0];
                    upd('wcQuiz', { q: q2.q, a: q2.a, opts: q2.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0, concept: q2.concept, wrongFeedback: q2.wrongFeedback });
                  });
                },
                disabled: d.aiQuizLoading,
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (d.aiQuizLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md')
              }, d.aiQuizLoading ? '\u23F3 Generating...' : '\u2728 AI Question'),

              d.wcQuiz && d.wcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.wcQuiz.score + " correct"),
              d.wcQuiz && d.wcQuiz.isAI && React.createElement("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, t('stem.watercycle.ai_generated', "\uD83E\uDDE0 AI-GENERATED")),
              (d.wcStreak || 0) >= 3 && React.createElement("span", { className: "px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-pulse" }, "\uD83D\uDD25 " + d.wcStreak + " streak!"),
              (d.wcAttempts || 0) > 0 && React.createElement("span", { className: "px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full" }, (d.wcQuiz && d.wcQuiz.score || 0) + "/" + d.wcAttempts + " (" + Math.round(((d.wcQuiz && d.wcQuiz.score || 0) / d.wcAttempts) * 100) + "%)"),

              d.wcQuiz && React.createElement("div", { className: "mt-2 rounded-xl p-3 border shadow-sm " + (isDark ? "bg-slate-950/60 border-sky-900/40 backdrop-blur-md" : "bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-200") },

                React.createElement("p", { className: "text-sm font-bold mb-2 " + (isDark ? "text-sky-400" : "text-sky-800") }, d.wcQuiz.q),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  d.wcQuiz.opts.map(function (opt) {

                    var isCorrect = opt === d.wcQuiz.a;

                    var wasChosen = d.wcQuiz.chosen === opt;

                    var cls = !d.wcQuiz.answered
                      ? (isDark
                         ? 'transition-colors bg-slate-900 border-slate-800 text-slate-300 hover:border-sky-550 hover:bg-sky-950/40 hover:shadow-sm active:scale-[0.97]'
                         : 'transition-colors bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50 hover:shadow-sm text-slate-800 active:scale-[0.97]')
                      : isCorrect
                        ? (isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 shadow-sm' : 'bg-emerald-100 border-emerald-400 shadow-sm text-emerald-900')
                        : wasChosen
                          ? (isDark ? 'bg-red-950/60 border-red-800 text-red-400' : 'bg-red-100 border-red-400 text-red-900')
                          : (isDark ? 'bg-slate-950/40 border-slate-900 opacity-40 text-slate-500' : 'bg-slate-50 border-slate-200 opacity-40 text-slate-550');

                    return React.createElement("button", { "aria-label": "Select answer: " + opt,

                      key: opt, disabled: d.wcQuiz.answered, onClick: function () {

                        var correct = opt === d.wcQuiz.a;
                        var newStreak = correct ? (d.wcStreak || 0) + 1 : 0;
                        var newAttempts = (d.wcAttempts || 0) + 1;

                        if (correct) {
                          sfxWcCorrect();
                          addToast('\u2705 Correct! +5 XP', 'success');
                          if (typeof awardStemXP === 'function') awardStemXP('waterCycle', 5, 'Water Cycle quiz');
                          // Streak celebration
                          if (newStreak >= 3 && newStreak % 3 === 0) {
                            if (typeof stemCelebrate === 'function') stemCelebrate();
                            addToast('\uD83D\uDD25 ' + newStreak + '-streak! +10 bonus XP!', 'success');
                            if (typeof awardStemXP === 'function') awardStemXP('waterCycle', 10, 'Water Cycle streak bonus');
                          }
                        } else {
                          sfxWcIncorrect();
                          addToast('\u274C The answer is: ' + d.wcQuiz.a, 'error');
                        }

                        var nextQuizCorrectCount = (d.quizCorrectCount || 0) + (correct ? 1 : 0);
                        var nextState = Object.assign({}, d, {
                          quizCorrectCount: nextQuizCorrectCount,
                          wcQuiz: Object.assign({}, d.wcQuiz, { answered: true, chosen: opt, score: d.wcQuiz.score + (correct ? 1 : 0) }),
                          wcStreak: newStreak,
                          wcAttempts: newAttempts
                        });
                        updMulti({
                          wcQuiz: nextState.wcQuiz,
                          wcStreak: newStreak,
                          wcAttempts: newAttempts,
                          quizCorrectCount: nextQuizCorrectCount
                        });
                        setTimeout(function() { checkWaterCycleChallenges(nextState); }, 50);

                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer focus:ring-2 focus:ring-yellow-500 focus:outline-none " + cls

                    }, opt);

                  })

                ),

                // Inline wrong-option explanations and vocabulary study cards
                d.wcQuiz.answered && React.createElement("div", { className: "mt-3 space-y-2 animate-in fade-in" },
                  React.createElement("div", {
                    className: "p-3 rounded-lg text-sm " + (isDark
                      ? (d.wcQuiz.chosen === d.wcQuiz.a ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" : "bg-red-950/40 text-red-400 border border-red-900/50")
                      : (d.wcQuiz.chosen === d.wcQuiz.a ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"))
                  },
                    React.createElement("p", { className: "font-black text-xs" }, d.wcQuiz.chosen === d.wcQuiz.a ? "✅ Correct answer!" : "❌ Incorrect answer"),
                    React.createElement("p", { className: "text-xs mt-1 leading-relaxed font-medium " + (isDark ? "text-slate-350" : "text-slate-700") },
                      d.wcQuiz.chosen === d.wcQuiz.a
                        ? "Great job! That is correct."
                        : (d.wcQuiz.wrongFeedback && d.wcQuiz.wrongFeedback[d.wcQuiz.chosen])
                          ? d.wcQuiz.wrongFeedback[d.wcQuiz.chosen]
                          : "That choice is not correct. Study the concept to learn more."
                    )
                  ),

                  // Concept study card
                  d.wcQuiz.concept && WATER_CYCLE_VOCAB[d.wcQuiz.concept] && (function() {
                    var concept = d.wcQuiz.concept;
                    var definition = WATER_CYCLE_VOCAB[concept];
                    var studied = (d.vocabWordsStudied || []).indexOf(concept) !== -1;
                    return React.createElement("div", { className: "p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in " + (isDark ? "bg-indigo-950/40 border border-indigo-900/50" : "bg-indigo-50 border border-indigo-200") },
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs font-bold " + (isDark ? "text-indigo-400" : "text-indigo-800") }, "🔍 Concept Focus: " + concept),
                        React.createElement("p", { className: "text-[11px] mt-0.5 leading-relaxed font-medium " + (isDark ? "text-slate-350" : "text-slate-600") }, definition)
                      ),
                      !studied && React.createElement("button", {
                        onClick: function() {
                          studyVocab(concept);
                        },
                        className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shrink-0 self-start sm:self-center transition-all hover:scale-105 focus:ring-2 focus:ring-yellow-500 focus:outline-none active:scale-[0.97]"
                      }, t('stem.watercycle.study_term_5_rp', "📖 Study Term (+5 RP)"))
                    );
                  })()
                )

              )

            ),

            // \u2550\u2550\u2550 \uD83D\uDCA7 WATER MYTHS \u2014 grade-banded misconceptions, each falsifiable IN the tool \u2550\u2550\u2550
            // Every myth is a documented water-cycle misconception (clouds-as-containers,
            // vapor-is-visible, disappearing puddles, underground rivers...), and every
            // verdict ends with a "Try it" pointing at the Journey Mode path, Climate Lab
            // slider, or stage view that lets the student SEE the truth for themselves.
            (function () {
              var MYTHS_35 = [
                { s: 'Rain falls when clouds get holes in them, like a leaky bucket.', t: false, why: 'Clouds are not containers \u2014 they are billions of tiny floating droplets. Rain begins when droplets bump together and grow too heavy to float.', tryIt: 'Watch the Condensation stage, then Precipitation: droplets grow until gravity wins.' },
                { s: 'When a puddle dries up, its water is gone forever.', t: false, why: 'The water turned into invisible vapor and floated into the sky. Later it condenses into clouds and rains back down \u2014 water is never used up, it only changes form.', tryIt: 'Start Journey Mode and ride one droplet from the ocean to a cloud and back again.' },
                { s: 'The water you drank today may once have been drunk by a dinosaur.', t: true, why: 'Earth has recycled the same water for billions of years \u2014 the cycle never makes new water, it just keeps moving what it has.', tryIt: 'Complete a full Journey Mode loop: the same droplet just keeps going around.' },
                { s: 'You can see water vapor.', t: false, why: 'Water vapor is an invisible gas. The white mist above a hot drink \u2014 and clouds themselves \u2014 are LIQUID droplets that have already condensed back.', tryIt: 'In the Evaporation stage the rising vapor is invisible; the visible cloud only forms high up, where the air is cold.' }
              ];
              var MYTHS_68 = MYTHS_35.concat([
                { s: 'Clouds are made of water vapor.', t: false, why: 'Clouds are liquid droplets (or ice crystals) condensed onto dust particles. Vapor is the invisible gas BEFORE condensation \u2014 if clouds were vapor, you could not see them.', tryIt: 'Read the Condensation stage: vapor condenses onto tiny nuclei to become ~10 \u00B5m droplets.' },
                { s: 'Water only evaporates when it is hot or boiling.', t: false, why: 'Evaporation happens at every temperature \u2014 the fastest surface molecules escape even from cold water. Heat just speeds it up.', tryIt: 'In the Climate Lab, drag the temperature down and watch the evaporation index fall \u2014 but never reach zero.' },
                { s: 'Groundwater flows in big underground rivers and lakes.', t: false, why: 'Almost all groundwater seeps through tiny pores in soil and rock, like water held in a sponge \u2014 often moving just meters per YEAR.', tryIt: 'In Journey Mode, take the Infiltration path \u2014 the aquifer leg is the slowest part of the whole cycle.' }
              ]);
              var MYTHS_912 = MYTHS_68.concat([
                { s: 'Saturation vapor pressure rises as air warms.', t: true, why: 'Near common surface temperatures, saturation vapor pressure rises by roughly 7% per degree Celsius. Actual atmospheric moisture also depends on relative humidity and circulation.', tryIt: 'Raise temperature in the Climate Lab and compare the relative evaporation index. This teaching model does not forecast storms.' },
                { s: 'Rain falls in the same place the water evaporated from.', t: false, why: 'Vapor rides the wind for hundreds of kilometers (atmospheric "flying rivers"). Rain falls where the air COOLS, not where the water left the surface.', tryIt: 'Crank the wind slider and watch the clouds drift far downwind before the rain drops.' },
                { s: 'Transpiration from plants barely matters to the cycle.', t: false, why: 'Transpiration is a major part of evapotranspiration over vegetated land. Its share varies with ecosystem, season, soil moisture, and weather.', tryIt: 'Open the Transpiration stage and trace how roots, xylem, and stomata return water to the atmosphere.' }
              ]);
              var mythBank = gradeBand === '9-12' ? MYTHS_912 : gradeBand === '6-8' ? MYTHS_68 : MYTHS_35;
              var myth = d.wcMyth || null;
              function startMyth() {
                var mi = Math.floor(Math.random() * mythBank.length);
                if (myth && mi === myth.idx) mi = (mi + 1) % mythBank.length;
                var m = mythBank[mi];
                upd('wcMyth', { idx: mi, s: m.s, t: m.t, why: m.why, tryIt: m.tryIt, answered: false, chosen: null });
              }
              return React.createElement("div", { className: "rounded-xl p-3 mb-2 shadow-md border-2 " + (isDark ? "bg-slate-950/60 border-violet-900/40 backdrop-blur-md" : "bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200") },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider " + (isDark ? "text-violet-400" : "text-violet-700") }, t('stem.watercycle.water_myths', "\uD83E\uDDE0 Water Myths \u2014 true or false?")),
                  React.createElement("button", { "aria-label": t('stem.watercycle.start_water_myth', "Start a water myth question"),
                    onClick: startMyth,
                    className: "px-3 py-1 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-700 transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  }, myth ? "\uD83D\uDD04 New Myth" : "\u25B6 Start")
                ),
                myth && React.createElement("div", { className: "space-y-2" },
                  React.createElement("p", { className: "text-xs font-bold " + (isDark ? "text-slate-300" : "text-slate-700") }, "\u201C" + myth.s + "\u201D"),
                  !myth.answered && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    [true, false].map(function (val) {
                      return React.createElement("button", { key: String(val),
                        "aria-label": "Answer " + (val ? 'true' : 'false'),
                        onClick: function () {
                          var right = val === myth.t;
                          var nextMythsDone = (d.wcMythsDone || 0) + 1;
                          if (right) {
                            sfxWcCorrect();
                            if (typeof awardStemXP === 'function') awardStemXP('waterCycle', 5, 'Water myth busted');
                          } else {
                            sfxWcIncorrect();
                          }
                          var nextState = Object.assign({}, d, { wcMythsDone: nextMythsDone });
                          updMulti({
                            wcMyth: Object.assign({}, myth, { answered: true, chosen: val }),
                            wcMythsDone: nextMythsDone
                          });
                          if (typeof announceToSR === 'function') announceToSR((right ? 'Correct. ' : 'Not quite. ') + (myth.t ? 'True. ' : 'False. ') + myth.why);
                          setTimeout(function () { checkWaterCycleChallenges(nextState); }, 50);
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none " + (isDark ? "bg-slate-900/60 text-slate-300 border-violet-900/50 hover:border-violet-600" : "bg-white text-slate-700 border-violet-200 hover:border-violet-400 hover:bg-violet-50")
                      }, val ? '\u2705 True' : '\u274C False');
                    })
                  ),
                  myth.answered && React.createElement("div", { className: "p-2.5 rounded-lg border " + (myth.chosen === myth.t
                    ? (isDark ? "bg-emerald-950/40 border-emerald-900/50" : "bg-emerald-50 border-emerald-200")
                    : (isDark ? "bg-red-950/40 border-red-900/50" : "bg-red-50 border-red-200")) },
                    React.createElement("p", { className: "text-xs font-bold mb-1 " + (myth.chosen === myth.t ? (isDark ? "text-emerald-400" : "text-emerald-700") : (isDark ? "text-red-400" : "text-red-700")) },
                      (myth.chosen === myth.t ? '\u2705 Correct \u2014 ' : '\u274C Not quite \u2014 ') + (myth.t ? 'TRUE.' : 'FALSE.')),
                    React.createElement("p", { className: "text-xs leading-relaxed mb-1 " + (isDark ? "text-slate-350" : "text-slate-700") }, myth.why),
                    React.createElement("p", { className: "text-[11px] leading-relaxed font-bold " + (isDark ? "text-indigo-400" : "text-indigo-700") }, "\uD83D\uDD2C Try it: " + myth.tryIt)
                  )
                )
              );
            })(),

            React.createElement("button", { "aria-label": t('stem.watercycle.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wc-' + Date.now(), tool: 'waterCycle', label: sel ? sel.label : t('stem.tools_menu.water_cycle'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-yellow-500 focus:outline-none" }, t('stem.watercycle.snapshot_2', "\uD83D\uDCF8 Snapshot"))

          );
      })();
    }
  });
})();
