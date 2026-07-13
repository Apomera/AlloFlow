// ═══════════════════════════════════════════
// stem_tool_wave.js — Wave Simulator Plugin
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

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
    if (document.getElementById('allo-live-wave')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-wave';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('wave', {
    icon: "🌊",
    label: "Wave Simulator",
    desc: "Animate sound and water waves across Free, Standing, Ripple Tank, Reflection, Longitudinal, Doppler, and Spectrum modes.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'adjust_frequency', label: 'Experiment with wave frequency', icon: '∿', check: function(d) { return d.frequency && d.frequency !== 1; }, progress: function(d) { return d.frequency !== 1 ? 'Adjusted!' : 'Change frequency'; } },
      { id: 'try_doppler', label: 'Try Doppler effect mode', icon: '🚗', check: function(d) { return d.waveMode === 'doppler'; }, progress: function(d) { return d.waveMode === 'doppler' ? 'Exploring!' : 'Select Doppler'; } },
      { id: 'compare_waves', label: 'Use wave comparison mode', icon: '🔊', check: function(d) { return d.waveMode === 'compare'; }, progress: function(d) { return d.waveMode === 'compare' ? 'Comparing!' : 'Select Compare'; } }
    ],

    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
      var t = ctx.t;
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
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // ── Tool body (wave) ──
      // Guard: ensure wave state exists (main module doesn't pre-init plugin state)
      if (!labToolData || !labToolData.wave) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { wave: {
              frequency: 2, amplitude: 50, waveType: 'sine',
              waveMode: 'free', waveSpeed: 343, showSecond: false,
              amp2: 30, freq2: 3, phase2: 0, harmonic: 1,
              damping: false, dampingAlpha: 0.5
            }});
          });
        }
        return h('div', { className: 'p-8 text-center text-slate-600' }, 'Loading Wave Simulator…');
      }
      var __waveMainView = (function() {
const d = labToolData.wave;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, wave: { ...prev.wave, [key]: val } }));

          var waveMode = d.waveMode || 'free';
          var phase2 = d.phase2 || 0;
          var dampingEnabled = !!d.damping;
          var dampingAlpha = d.dampingAlpha || 0.5;
          var waveSpeedBase = d.waveSpeed || 343;
          var wavelength = waveSpeedBase / (d.frequency || 1);
          var waveSpeedCalc = (d.frequency || 1) * wavelength;



          // ── Match Waveform XP check (called on slider change) ──

          var checkWaveMatch = function (newAmp, newFreq) {

            if (!d.matchTarget || d.matchXpClaimed) return;

            var tAmp = d.matchTarget.amp, tFreq = d.matchTarget.freq;

            var ampDiff = Math.abs(newAmp - tAmp) / tAmp;

            var freqDiff = Math.abs(newFreq - tFreq) / tFreq;

            var matchPct = Math.max(0, Math.round((1 - (ampDiff + freqDiff) / 2) * 100));

            if (matchPct > 90) {

              awardStemXP('wave-match', 10, 'Matched waveform (A=' + tAmp + ', f=' + tFreq + ')');

              upd('matchXpClaimed', true);

            }

          };



          // Canvas-based animated wave

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {
              // React calls ref(null) on unmount. Tear down the previous canvas's animation
              // loop (the draw() requestAnimationFrame chain otherwise only self-stops once the
              // node is detached) and close any open AudioContext (the "Play Sound" oscillator
              // would otherwise leak if you leave the tool mid-tone).
              try {
                var _prevCv = canvasRef._lastCanvas;
                if (_prevCv && _prevCv._waveAnim) { cancelAnimationFrame(_prevCv._waveAnim); _prevCv._waveAnim = null; }
                if (_prevCv && _prevCv._wavePointerUp) { window.removeEventListener('mouseup', _prevCv._wavePointerUp); window.removeEventListener('touchend', _prevCv._wavePointerUp); _prevCv._wavePointerUp = null; }
              } catch (e) {}
              try { if (d && d._audioCtx) { d._audioCtx.close(); d._audioCtx = null; } } catch (e) {}
              return;
            }

            if (canvasEl._waveInit) return;

            canvasEl._waveInit = true;

            canvasRef._lastCanvas = canvasEl;

            // ── Interactive drag state (ripple tank sources, reflection wall) ──
            // Sources start centered; reflection wall starts at 75%. Stored on
            // canvas element so the draw loop can read them; dataset fields
            // also expose them so future React state syncs are possible.
            canvasEl._drag = {
              ripple1: null, ripple2: null, // null = use default positions; { x, y } when dragged
              wallX: null,                   // null = use default wall pos
              activeHandle: null,            // 'r1' | 'r2' | 'wall' during a drag
              dragOffset: { x: 0, y: 0 }
            };

            // Get pointer position in canvas coordinates (account for DPR).
            function getCanvasPt(evt) {
              var rect = canvasEl.getBoundingClientRect();
              var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
              var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
              return {
                x: (clientX - rect.left) * (canvasEl.width / rect.width),
                y: (clientY - rect.top) * (canvasEl.height / rect.height)
              };
            }
            // Hit-test the draggable handles for the current mode. Returns
            // the handle id or null.
            function pickHandle(pt) {
              var hitR = 18 * 2; // 18px on-screen × dpr
              var mode = canvasEl.dataset.waveMode || 'free';
              if (mode === 'ripple') {
                var sep = parseFloat(canvasEl.dataset.rippleSeparation || '80') * 2;
                var defaults1 = { x: canvasEl.width / 2 - sep / 2, y: canvasEl.height / 2 };
                var defaults2 = { x: canvasEl.width / 2 + sep / 2, y: canvasEl.height / 2 };
                var r1 = canvasEl._drag.ripple1 || defaults1;
                var r2 = canvasEl._drag.ripple2 || defaults2;
                if (Math.hypot(pt.x - r1.x, pt.y - r1.y) < hitR) return 'r1';
                if (Math.hypot(pt.x - r2.x, pt.y - r2.y) < hitR) return 'r2';
              } else if (mode === 'reflection') {
                var wallDefault = canvasEl.width * 0.75;
                var wallX = canvasEl._drag.wallX != null ? canvasEl._drag.wallX : wallDefault;
                if (Math.abs(pt.x - wallX) < hitR) return 'wall';
              }
              return null;
            }
            function onPointerDown(evt) {
              evt.preventDefault();
              var pt = getCanvasPt(evt);
              var handle = pickHandle(pt);
              if (!handle) return;
              canvasEl._drag.activeHandle = handle;
              canvasEl.style.cursor = 'grabbing';
              if (handle === 'r1') {
                var r1 = canvasEl._drag.ripple1 || { x: pt.x, y: pt.y };
                canvasEl._drag.dragOffset = { x: r1.x - pt.x, y: r1.y - pt.y };
              } else if (handle === 'r2') {
                var r2 = canvasEl._drag.ripple2 || { x: pt.x, y: pt.y };
                canvasEl._drag.dragOffset = { x: r2.x - pt.x, y: r2.y - pt.y };
              } else if (handle === 'wall') {
                canvasEl._drag.dragOffset = { x: 0, y: 0 };
              }
            }
            function onPointerMove(evt) {
              if (!canvasEl._drag.activeHandle) {
                // Hover-cursor feedback
                var pt0 = getCanvasPt(evt);
                canvasEl.style.cursor = pickHandle(pt0) ? 'grab' : '';
                return;
              }
              evt.preventDefault();
              var pt = getCanvasPt(evt);
              var newX = pt.x + canvasEl._drag.dragOffset.x;
              var newY = pt.y + canvasEl._drag.dragOffset.y;
              // Clamp to canvas
              newX = Math.max(20, Math.min(canvasEl.width - 20, newX));
              newY = Math.max(20, Math.min(canvasEl.height - 20, newY));
              if (canvasEl._drag.activeHandle === 'r1') canvasEl._drag.ripple1 = { x: newX, y: newY };
              else if (canvasEl._drag.activeHandle === 'r2') canvasEl._drag.ripple2 = { x: newX, y: newY };
              else if (canvasEl._drag.activeHandle === 'wall') canvasEl._drag.wallX = newX;
            }
            function onPointerUp() {
              canvasEl._drag.activeHandle = null;
              canvasEl.style.cursor = '';
            }
            canvasEl.addEventListener('mousedown', onPointerDown);
            canvasEl.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);
            canvasEl.addEventListener('touchstart', onPointerDown, { passive: false });
            canvasEl.addEventListener('touchmove', onPointerMove, { passive: false });
            window.addEventListener('touchend', onPointerUp);
            canvasEl._wavePointerUp = onPointerUp;
            // Canvas Narration: tool init
            if (typeof canvasNarrate === 'function') canvasNarrate('wave', 'init', {
              first: 'Wave Simulator loaded. An underwater ocean scene shows animated waves. Adjust amplitude and frequency with sliders. Switch between Free Wave, Standing, Ripple Tank, Longitudinal, Doppler, and Spectrum modes.',
              repeat: 'Wave Simulator ready.',
              terse: 'Wave Simulator ready.'
            });

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            var tick = 0;



            // ── Underwater scene persistent elements ──

            var _bubbles = [];

            for (var bi = 0; bi < 25; bi++) {

              _bubbles.push({ x: Math.random() * cW, y: cH * 0.3 + Math.random() * cH * 0.65, r: 1.5 + Math.random() * 3, speed: 0.3 + Math.random() * 0.7, wobble: Math.random() * Math.PI * 2, wobbleAmp: 0.5 + Math.random() * 1.5 });

            }

            var _plankton = [];

            for (var pi = 0; pi < 15; pi++) {

              _plankton.push({ x: Math.random() * cW, y: cH * 0.15 + Math.random() * cH * 0.65, size: 0.8 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.15, phase: Math.random() * Math.PI * 2 });

            }

            var _seaGrass = [];

            for (var sgi = 0; sgi < 18; sgi++) {

              _seaGrass.push({ x: sgi * (cW / 18) + Math.random() * (cW / 22), h: 20 + Math.random() * 35, w: 2 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2, hue: 100 + Math.random() * 40 });

            }

            var _pebbles = [];

            for (var pb = 0; pb < 20; pb++) {

              _pebbles.push({ x: Math.random() * cW, w: 4 + Math.random() * 8, h: 2 + Math.random() * 4, shade: 0.3 + Math.random() * 0.3 });

            }

            var _mediumParticles = [];

            for (var mp = 0; mp < 24; mp++) {

              _mediumParticles.push({ x: (mp + 0.5) * (cW / 24), baseY: cH * 0.3 + Math.random() * cH * 0.35, phase: Math.random() * Math.PI * 2 });

            }

            var _causticPts = [];

            for (var cp = 0; cp < 6; cp++) {

              _causticPts.push({ x: cW * 0.1 + cp * cW * 0.16, w: 15 + Math.random() * 25, speed: 0.005 + Math.random() * 0.008, phase: Math.random() * Math.PI * 2 });

            }



            function draw() {
              if (!document.body.contains(canvasEl)) return;
              tick++;
              var t = tick;

              ctx.clearRect(0, 0, cW, cH);



              // ── Underwater ocean gradient ──

              var oceanGrad = ctx.createLinearGradient(0, 0, 0, cH);

              oceanGrad.addColorStop(0, '#064e6e');

              oceanGrad.addColorStop(0.08, '#0a6a8a');

              oceanGrad.addColorStop(0.3, '#0c7d9e');

              oceanGrad.addColorStop(0.65, '#0a5f7d');

              oceanGrad.addColorStop(0.85, '#083f58');

              oceanGrad.addColorStop(1, '#052e42');

              ctx.fillStyle = oceanGrad;

              ctx.fillRect(0, 0, cW, cH);



              // ── Surface shimmer line ──

              ctx.save();

              var surfaceY = cH * 0.04;

              var surfGrad = ctx.createLinearGradient(0, 0, 0, surfaceY + 20);

              surfGrad.addColorStop(0, 'rgba(180,230,255,0.25)');

              surfGrad.addColorStop(0.5, 'rgba(120,210,255,0.12)');

              surfGrad.addColorStop(1, 'rgba(80,180,240,0)');

              ctx.fillStyle = surfGrad;

              ctx.fillRect(0, 0, cW, surfaceY + 20);

              ctx.beginPath();

              for (var sx = 0; sx < cW; sx += 2) {

                var sy = surfaceY + Math.sin(sx * 0.02 + tick * 0.04) * 3 + Math.sin(sx * 0.007 + tick * 0.02) * 2;

                if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);

              }

              ctx.strokeStyle = 'rgba(200,240,255,0.4)';

              ctx.lineWidth = 1.5;

              ctx.stroke();

              ctx.restore();



              // ── Caustic light rays ──

              ctx.save();

              for (var ci = 0; ci < _causticPts.length; ci++) {

                var cr = _causticPts[ci];

                var crx = cr.x + Math.sin(tick * cr.speed + cr.phase) * 40;

                var crW = cr.w + Math.sin(tick * cr.speed * 1.3 + cr.phase) * 8;

                var rayGrad = ctx.createLinearGradient(crx, 0, crx, cH * 0.85);

                rayGrad.addColorStop(0, 'rgba(180,230,255,0.06)');

                rayGrad.addColorStop(0.3, 'rgba(140,210,245,0.04)');

                rayGrad.addColorStop(0.7, 'rgba(100,190,230,0.02)');

                rayGrad.addColorStop(1, 'rgba(80,170,220,0)');

                ctx.beginPath();

                ctx.moveTo(crx - crW * 0.3, 0);

                ctx.lineTo(crx + crW * 0.3, 0);

                ctx.lineTo(crx + crW * 0.8, cH * 0.85);

                ctx.lineTo(crx - crW * 0.8, cH * 0.85);

                ctx.closePath();

                ctx.fillStyle = rayGrad;

                ctx.fill();

              }

              ctx.restore();



              // ── Sandy ocean floor ──

              var floorY = cH * 0.88;

              ctx.save();

              var sandGrad = ctx.createLinearGradient(0, floorY, 0, cH);

              sandGrad.addColorStop(0, '#5d7a5e');

              sandGrad.addColorStop(0.3, '#8a9a6e');

              sandGrad.addColorStop(0.7, '#a8a882');

              sandGrad.addColorStop(1, '#b5ac8a');

              ctx.beginPath();

              ctx.moveTo(0, floorY);

              for (var fx = 0; fx < cW; fx += 8) {

                ctx.lineTo(fx, floorY + Math.sin(fx * 0.015) * 6 + Math.sin(fx * 0.04) * 2);

              }

              ctx.lineTo(cW, cH); ctx.lineTo(0, cH); ctx.closePath();

              ctx.fillStyle = sandGrad; ctx.fill();

              ctx.restore();



              // ── Pebbles on ocean floor ──

              ctx.save();

              for (var pbi = 0; pbi < _pebbles.length; pbi++) {

                var pbl = _pebbles[pbi];

                var pbY = floorY + Math.sin(pbl.x * 0.015) * 6 + 4;

                ctx.beginPath();

                ctx.ellipse(pbl.x, pbY, pbl.w, pbl.h, 0, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(90,100,80,' + pbl.shade + ')';

                ctx.fill();

              }

              ctx.restore();



              // ── Sea grass blades swaying ──

              ctx.save();

              for (var sj = 0; sj < _seaGrass.length; sj++) {

                var sg = _seaGrass[sj];

                var sgBaseY = floorY + Math.sin(sg.x * 0.015) * 6;

                var sway = Math.sin(tick * 0.008 + sg.phase) * 8;

                ctx.beginPath();

                ctx.moveTo(sg.x, sgBaseY);

                ctx.quadraticCurveTo(sg.x + sway * 0.5, sgBaseY - sg.h * 0.5, sg.x + sway, sgBaseY - sg.h);

                ctx.strokeStyle = 'hsla(' + sg.hue + ', 50%, 35%, 0.55)';

                ctx.lineWidth = sg.w;

                ctx.lineCap = 'round';

                ctx.stroke();

              }

              ctx.restore();



              // ── Plankton drifting ──

              ctx.save();

              for (var pk = 0; pk < _plankton.length; pk++) {

                var pl = _plankton[pk];

                pl.x += pl.vx + Math.sin(tick * 0.003 + pl.phase) * 0.1;

                pl.y += pl.vy;

                if (pl.x < 0) pl.x = cW; if (pl.x > cW) pl.x = 0;

                if (pl.y < cH * 0.1) pl.y = cH * 0.8; if (pl.y > cH * 0.85) pl.y = cH * 0.1;

                ctx.globalAlpha = 0.3 + Math.sin(tick * 0.01 + pk) * 0.15;

                ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = '#a0e8c0'; ctx.fill();

              }

              ctx.globalAlpha = 1;

              ctx.restore();



              // ── Medium particles (water molecules oscillating with wave) ──

              ctx.save();

              var mAmp = parseFloat(canvasEl.dataset.amp || '50');

              var mFreq = parseFloat(canvasEl.dataset.freq || '2');

              var mSpeed = parseFloat(canvasEl.dataset.speed || '1');

              for (var mi = 0; mi < _mediumParticles.length; mi++) {

                var mPart = _mediumParticles[mi];

                var mWaveT = mPart.x / cW * Math.PI * 2 * mFreq - tick * 0.08 * mSpeed;

                var mDisp = Math.sin(mWaveT) * mAmp * dpr * 0.3;

                var mpy = mPart.baseY - mDisp;

                // Glow

                ctx.globalAlpha = 0.15;

                ctx.beginPath(); ctx.arc(mPart.x, mpy, 7 * dpr, 0, Math.PI * 2);

                var mpGlow = ctx.createRadialGradient(mPart.x, mpy, 0, mPart.x, mpy, 7 * dpr);

                mpGlow.addColorStop(0, '#80d8ff');

                mpGlow.addColorStop(1, '#80d8ff00');

                ctx.fillStyle = mpGlow; ctx.fill();

                // Core

                ctx.globalAlpha = 0.35;

                ctx.beginPath(); ctx.arc(mPart.x, mpy, 2.5 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = '#b0e8ff'; ctx.fill();

                ctx.strokeStyle = 'rgba(130,210,255,0.3)'; ctx.lineWidth = 0.5;

                ctx.stroke();

              }

              ctx.globalAlpha = 1;

              ctx.restore();



              // ── Rising bubbles ──

              ctx.save();

              for (var bj = 0; bj < _bubbles.length; bj++) {

                var bub = _bubbles[bj];

                bub.y -= bub.speed;

                bub.x += Math.sin(tick * 0.006 + bub.wobble) * bub.wobbleAmp;

                if (bub.y < cH * 0.03) { bub.y = cH * 0.9 + Math.random() * cH * 0.1; bub.x = Math.random() * cW; }

                var bubR = bub.r * dpr;

                ctx.globalAlpha = 0.25;

                ctx.beginPath(); ctx.arc(bub.x, bub.y, bubR, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(200,240,255,0.6)'; ctx.lineWidth = 0.8;

                ctx.stroke();

                // Highlight

                ctx.beginPath(); ctx.arc(bub.x - bubR * 0.3, bub.y - bubR * 0.3, bubR * 0.3, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(230,250,255,0.5)'; ctx.fill();

              }

              ctx.globalAlpha = 1;

              ctx.restore();



              // ── Measurement grid (subtle overlay) ──

              ctx.strokeStyle = 'rgba(255,255,255,0.05)';

              ctx.lineWidth = 0.5;

              for (var gx = 0; gx < cW; gx += 30 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cH); ctx.stroke(); }

              for (var gy = 0; gy < cH; gy += 30 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }

              // Center line

              ctx.strokeStyle = 'rgba(255,255,255,0.2)';

              ctx.setLineDash([8, 4]);

              ctx.beginPath(); ctx.moveTo(0, cH / 2); ctx.lineTo(cW, cH / 2); ctx.stroke();

              ctx.setLineDash([]);

              // Read params

              var amp = parseFloat(canvasEl.dataset.amp || '50');

              var freq = parseFloat(canvasEl.dataset.freq || '2');

              var waveType = canvasEl.dataset.waveType || 'sine';

              var showSecond = canvasEl.dataset.showSecond === 'true';

              var amp2 = parseFloat(canvasEl.dataset.amp2 || '30');

              var freq2 = parseFloat(canvasEl.dataset.freq2 || '3');

              var speed = parseFloat(canvasEl.dataset.speed || '1');

              var phase2Val = parseFloat(canvasEl.dataset.phase2 || '0');
              var dampOn = canvasEl.dataset.damping === 'true';
              var dampAlpha = parseFloat(canvasEl.dataset.dampAlpha || '0.5');

              var currentMode = canvasEl.dataset.waveMode || 'free';

              var harmonic = parseInt(canvasEl.dataset.harmonic || '1', 10);



              // Wave value function

              function waveVal(t, type) {

                if (type === 'sine') return Math.sin(t);

                if (type === 'square') return Math.sign(Math.sin(t));

                if (type === 'triangle') return Math.asin(Math.sin(t)) * 2 / Math.PI;

                return (t % (Math.PI * 2)) / Math.PI - 1;

              }



              if (currentMode === 'standing') {

                // Standing wave mode

                var n = harmonic;

                // Draw standing wave envelope

                ctx.globalAlpha = 0.2;

                ctx.fillStyle = '#22d3ee';

                ctx.beginPath();

                for (var x = 0; x < cW; x++) {

                  var envelope = Math.sin(n * Math.PI * x / cW) * amp * dpr;

                  var py = cH / 2 - envelope;

                  if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);

                }

                for (var x = cW - 1; x >= 0; x--) {

                  var envelope = Math.sin(n * Math.PI * x / cW) * amp * dpr;

                  var py = cH / 2 + envelope;

                  ctx.lineTo(x, py);

                }

                ctx.fill();

                ctx.globalAlpha = 1;

                // Draw standing wave (animated)

                ctx.lineWidth = 3 * dpr;

                ctx.strokeStyle = '#22d3ee';

                ctx.shadowColor = '#22d3ee';

                ctx.shadowBlur = 10;

                ctx.beginPath();

                for (var x = 0; x < cW; x++) {

                  var y = Math.sin(n * Math.PI * x / cW) * Math.cos(tick * 0.05 * speed) * amp * dpr;

                  var py = cH / 2 - y;

                  if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);

                }

                ctx.stroke();

                ctx.shadowBlur = 0;

                // Mark nodes and antinodes

                for (var k = 0; k <= n; k++) {

                  var nx = k * cW / n;

                  ctx.fillStyle = '#ef4444';

                  ctx.beginPath(); ctx.arc(nx, cH / 2, 5 * dpr, 0, Math.PI * 2); ctx.fill();

                  ctx.fillStyle = '#ffffff';

                  ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';

                  ctx.fillText('N', nx - 3 * dpr, cH / 2 - 8 * dpr);

                }

                for (var k = 0; k < n; k++) {

                  var anx = (k + 0.5) * cW / n;

                  ctx.fillStyle = '#22c55e';

                  ctx.beginPath(); ctx.arc(anx, cH / 2, 4 * dpr, 0, Math.PI * 2); ctx.fill();

                  ctx.fillStyle = '#ffffff';

                  ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';

                  ctx.fillText('A', anx - 3 * dpr, cH / 2 - 8 * dpr);

                }

                // Label

                ctx.fillStyle = 'rgba(0,0,0,0.5)';

                ctx.fillRect(4 * dpr, 4 * dpr, 120 * dpr, 24 * dpr);

                ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                ctx.fillStyle = '#22d3ee';

                ctx.fillText('Standing Wave - Harmonic ' + n, 8 * dpr, 16 * dpr);

                ctx.fillStyle = '#ef4444';

                ctx.fillText('N=Node  ', 8 * dpr, 26 * dpr);

                ctx.fillStyle = '#22c55e';
                ctx.fillText('           A=Antinode', 8 * dpr, 26 * dpr);

              } else if (currentMode === 'free') {
                // Free wave mode
                // Draw main wave
                ctx.lineWidth = 3 * dpr;
                ctx.strokeStyle = '#22d3ee';
                ctx.shadowColor = '#22d3ee';
                ctx.shadowBlur = 8;

                ctx.beginPath();

                for (var x = 0; x < cW; x++) {

                  var t = x / (cW) * Math.PI * 2 * freq - tick * 0.08 * speed;

                  var y = waveVal(t, waveType);
                  if (dampOn) { y *= Math.exp(-dampAlpha * (x / cW) * 3); }

                  var py = cH / 2 - y * amp * dpr;

                  if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);

                }

                ctx.stroke();

                ctx.shadowBlur = 0;

                // ── Match the Waveform target ──

                var targetAmp = parseFloat(canvasEl.dataset.targetAmp || '0');

                var targetFreq = parseFloat(canvasEl.dataset.targetFreq || '0');

                var isEquationMatch = canvasEl.dataset.targetIsEquation === 'true';

                if (targetAmp > 0 && targetFreq > 0) {

                  if (!isEquationMatch) {

                    ctx.lineWidth = 2.5 * dpr;

                    ctx.strokeStyle = '#fbbf24';

                    ctx.setLineDash([8, 6]);

                    ctx.globalAlpha = 0.8;

                    ctx.beginPath();

                    for (var xt = 0; xt < cW; xt++) {

                      var tt = xt / cW * Math.PI * 2 * targetFreq - tick * 0.08 * speed;

                      var yt = Math.sin(tt);

                      var pyt = cH / 2 - yt * targetAmp * dpr;

                      if (xt === 0) ctx.moveTo(xt, pyt); else ctx.lineTo(xt, pyt);

                    }

                    ctx.stroke();

                    ctx.setLineDash([]); ctx.globalAlpha = 1;

                  }

                  // Match score HUD

                  var ampDiff = Math.abs(amp - targetAmp) / targetAmp;

                  var freqDiff = Math.abs(freq - targetFreq) / targetFreq;

                  var matchPct = Math.max(0, Math.round((1 - (ampDiff + freqDiff) / 2) * 100));

                  ctx.fillStyle = matchPct > 90 ? '#22c55e' : matchPct > 60 ? '#eab308' : '#ef4444';

                  ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';

                  ctx.textAlign = 'right';

                  ctx.fillText('Match: ' + matchPct + '%', (cW / dpr - 8) * dpr, (cH / dpr - 10) * dpr);

                  if (matchPct > 90) {

                    ctx.fillStyle = '#22c55e';

                    ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                    ctx.fillText('\u2705 Great match!', (cW / dpr - 8) * dpr, (cH / dpr - 24) * dpr);

                  }

                }

                // Draw second wave if enabled

                if (showSecond) {

                  ctx.lineWidth = 2 * dpr;

                  ctx.strokeStyle = '#f472b6';

                  ctx.shadowColor = '#f472b6';

                  ctx.shadowBlur = 6;

                  ctx.beginPath();

                  for (var x2 = 0; x2 < cW; x2++) {

                    var t2 = x2 / (cW) * Math.PI * 2 * freq2 - tick * 0.03 * speed + phase2Val;

                    var y2 = Math.sin(t2);
                    if (dampOn) { y2 *= Math.exp(-dampAlpha * (x2 / cW) * 3); }

                    var py2 = cH / 2 - y2 * amp2 * dpr;

                    if (x2 === 0) ctx.moveTo(x2, py2); else ctx.lineTo(x2, py2);

                  }

                  ctx.stroke();

                  ctx.shadowBlur = 0;

                  // Superposition

                  ctx.lineWidth = 2.5 * dpr;

                  ctx.strokeStyle = '#a78bfa';

                  ctx.shadowColor = '#a78bfa';

                  ctx.shadowBlur = 6;

                  ctx.setLineDash([6, 4]);

                  ctx.beginPath();

                  var maxSuper = 0;

                  for (var xs = 0; xs < cW; xs++) {

                    var ts1 = xs / (cW) * Math.PI * 2 * freq - tick * 0.03 * speed;

                    var ts2 = xs / (cW) * Math.PI * 2 * freq2 - tick * 0.03 * speed;

                    var ys1 = waveVal(ts1, waveType) * amp;

                    var ys2 = Math.sin(ts2) * amp2;

                    var combined = ys1 + ys2;

                    if (Math.abs(combined) > maxSuper) maxSuper = Math.abs(combined);

                    var pys = cH / 2 - combined * dpr;

                    if (xs === 0) ctx.moveTo(xs, pys); else ctx.lineTo(xs, pys);

                  }

                  ctx.stroke();

                  ctx.setLineDash([]); ctx.shadowBlur = 0;

                  // Interference type label

                  var interferenceType = freq === freq2 ? (amp === amp2 ? 'Full Constructive' : 'Partial Constructive') : 'Complex';

                  if (freq === freq2 && Math.abs(amp - amp2) < 1) interferenceType = 'Full Constructive';

                }

                // Labels

                ctx.fillStyle = 'rgba(0,0,0,0.4)';

                ctx.fillRect(4 * dpr, 4 * dpr, 130 * dpr, (showSecond ? 42 : 20) * dpr);

                ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                ctx.fillStyle = '#22d3ee';

                ctx.fillText('\uD83C\uDF0A Main: A=' + amp + ' f=' + freq + 'Hz', 8 * dpr, 16 * dpr);

                if (showSecond) {

                  ctx.fillStyle = '#f472b6';

                  ctx.fillText('\u223F Second: A=' + amp2 + ' f=' + freq2 + 'Hz', 8 * dpr, 28 * dpr);

                  ctx.fillStyle = '#a78bfa';

                  ctx.fillText('--- Superposition (' + (interferenceType || 'Complex') + ')', 8 * dpr, 40 * dpr);

                }

              } else if (currentMode === 'ripple') {
                // ========== 2D RIPPLE TANK MODE ==========
                var rippleCx = cW / 2, rippleCy = cH / 2;
                var rippleSep = parseFloat(canvasEl.dataset.rippleSeparation || '80') * dpr;
                // Draggable source positions: fall back to slider-driven defaults
                // if user hasn't dragged. Once dragged, the drag-state wins.
                var defR1 = { x: rippleCx - rippleSep / 2, y: rippleCy };
                var defR2 = { x: rippleCx + rippleSep / 2, y: rippleCy };
                var pos1 = canvasEl._drag.ripple1 || defR1;
                var pos2 = canvasEl._drag.ripple2 || defR2;
                var src1x = pos1.x, src1y = pos1.y;
                var src2x = pos2.x, src2y = pos2.y;
                var rippleWL = Math.max(20, cW / (freq * 2));
                var rippleDamp = parseFloat(canvasEl.dataset.dampingCoeff || '0.002');

                // Draw interference pattern pixel by pixel using imageData for performance
                var imgData = ctx.createImageData(cW, cH);
                var data = imgData.data;
                for (var py = 0; py < cH; py += 2) {
                  for (var px = 0; px < cW; px += 2) {
                    var d1 = Math.sqrt((px - src1x) * (px - src1x) + (py - src1y) * (py - src1y));
                    var d2 = Math.sqrt((px - src2x) * (px - src2x) + (py - src2y) * (py - src2y));
                    var v1 = amp * Math.sin(2 * Math.PI * (d1 / rippleWL - t * freq * 0.05)) * Math.exp(-rippleDamp * d1);
                    var v2 = amp * Math.sin(2 * Math.PI * (d2 / rippleWL - t * freq * 0.05)) * Math.exp(-rippleDamp * d2);
                    var vSum = (v1 + v2) / 2;
                    // Map to color: blue for troughs, cyan/white for crests
                    var bright = Math.floor(128 + vSum * 127);
                    bright = Math.max(0, Math.min(255, bright));
                    var idx = (py * cW + px) * 4;
                    data[idx] = Math.floor(bright * 0.2);       // R
                    data[idx + 1] = Math.floor(bright * 0.6);   // G
                    data[idx + 2] = bright;                       // B
                    data[idx + 3] = 255;                          // A
                    // Fill 2x2 block for speed
                    if (px + 1 < cW) { data[idx + 4] = data[idx]; data[idx + 5] = data[idx + 1]; data[idx + 6] = data[idx + 2]; data[idx + 7] = 255; }
                    if (py + 1 < cH) {
                      var idx2 = ((py + 1) * cW + px) * 4;
                      data[idx2] = data[idx]; data[idx2 + 1] = data[idx + 1]; data[idx2 + 2] = data[idx + 2]; data[idx2 + 3] = 255;
                      if (px + 1 < cW) { data[idx2 + 4] = data[idx]; data[idx2 + 5] = data[idx + 1]; data[idx2 + 6] = data[idx + 2]; data[idx2 + 7] = 255; }
                    }
                  }
                }
                ctx.putImageData(imgData, 0, 0);

                // Mark sources with prominent drag handles (rendered larger
                // when the user is hovering or dragging them).
                var active = canvasEl._drag.activeHandle;
                function drawSourceHandle(x, y, label, isActive) {
                  // Outer pulsing ring (hint that it's draggable)
                  var ringR = 14 * dpr * (1 + 0.15 * Math.sin(t * 0.1));
                  ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,107,107,0.5)';
                  ctx.lineWidth = isActive ? 2 * dpr : 1.5 * dpr;
                  ctx.beginPath(); ctx.arc(x, y, ringR, 0, 2 * Math.PI); ctx.stroke();
                  // Solid core
                  ctx.fillStyle = '#ff6b6b';
                  ctx.beginPath(); ctx.arc(x, y, 7 * dpr, 0, 2 * Math.PI); ctx.fill();
                  ctx.fillStyle = '#fff';
                  ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                  ctx.fillText(label, x - 6 * dpr, y + 3 * dpr);
                }
                drawSourceHandle(src1x, src1y, 'S\u2081', active === 'r1');
                drawSourceHandle(src2x, src2y, 'S\u2082', active === 'r2');

                // Legend + drag hint
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.fillRect(4, 4, 220 * dpr, 50 * dpr);
                ctx.fillStyle = '#67e8f9';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('2D Ripple Tank \u2014 Two-Source Interference', 8 * dpr, 14 * dpr);
                ctx.fillText('Bright = Constructive | Dark = Destructive', 8 * dpr, 26 * dpr);
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('\u2702 DRAG the red sources to explore patterns', 8 * dpr, 40 * dpr);

              } else if (currentMode === 'longitudinal') {
                // ========== LONGITUDINAL WAVE MODE ==========
                var numParticles = 60;
                var particleSpacing = cW / (numParticles + 1);
                var longAmp = amp * 15 * dpr;
                var midY = cH / 2;

                // Draw tube outline
                ctx.strokeStyle = 'rgba(100,200,255,0.15)';
                ctx.lineWidth = 1;
                ctx.strokeRect(10, midY - 40 * dpr, cW - 20, 80 * dpr);

                // Pressure graph (top)
                ctx.strokeStyle = '#f472b6';
                ctx.lineWidth = 2 * dpr;
                ctx.setLineDash([]);
                ctx.beginPath();
                for (var lx = 0; lx < cW; lx += 2) {
                  var pressure = -Math.cos(2 * Math.PI * (lx / cW * freq - t * freq * 0.05)) * amp * 0.5;
                  var py_p = midY - 60 * dpr + pressure * 40 * dpr;
                  if (lx === 0) ctx.moveTo(lx, py_p); else ctx.lineTo(lx, py_p);
                }
                ctx.stroke();

                // Draw particles as vertical lines (density visualization)
                for (var pi = 0; pi < numParticles; pi++) {
                  var baseX = (pi + 1) * particleSpacing;
                  var displacement = longAmp * Math.sin(2 * Math.PI * (baseX / cW * freq - t * freq * 0.05));
                  var drawX = baseX + displacement;
                  // Color by density: compressed = bright, rarefied = dim
                  var nextDisp = pi < numParticles - 1 ? longAmp * Math.sin(2 * Math.PI * ((baseX + particleSpacing) / cW * freq - t * freq * 0.05)) : 0;
                  var localDensity = 1 - (nextDisp - displacement) / (particleSpacing * 0.8);
                  localDensity = Math.max(0.1, Math.min(2, localDensity));
                  var alpha = Math.min(1, localDensity * 0.7);
                  ctx.strokeStyle = 'rgba(96,165,250,' + alpha.toFixed(2) + ')';
                  ctx.lineWidth = Math.max(1, localDensity * 3 * dpr);
                  ctx.beginPath();
                  ctx.moveTo(drawX, midY - 30 * dpr);
                  ctx.lineTo(drawX, midY + 30 * dpr);
                  ctx.stroke();
                }

                // Misconception-buster: highlight ONE tracer particle (gold) against a dashed
                // marker at its equilibrium (rest) position, so students SEE it only jiggles
                // back and forth in place \u2014 the wave travels right, but matter does not move with it.
                var _trBaseX = (Math.floor(numParticles / 2) + 1) * particleSpacing;
                var _trDisp = longAmp * Math.sin(2 * Math.PI * (_trBaseX / cW * freq - t * freq * 0.05));
                var _trX = _trBaseX + _trDisp;
                ctx.setLineDash([3 * dpr, 3 * dpr]);
                ctx.strokeStyle = 'rgba(251,191,36,0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(_trBaseX, midY - 38 * dpr); ctx.lineTo(_trBaseX, midY + 38 * dpr); ctx.stroke();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4 * dpr;
                ctx.beginPath(); ctx.moveTo(_trX, midY - 32 * dpr); ctx.lineTo(_trX, midY + 32 * dpr); ctx.stroke();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(_trX, midY, 4 * dpr, 0, 2 * Math.PI); ctx.fill();

                // Labels
                ctx.fillStyle = 'rgba(0,0,0,0.62)';
                ctx.fillRect(4, 4, 372 * dpr, 50 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Longitudinal Wave \u2014 Compression & Rarefaction', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#f472b6';
                ctx.fillText('\u223F Pressure wave (top) | Particles (center)', 8 * dpr, 26 * dpr);
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('\u25CF Gold particle jiggles in place \u2014 the wave moves right, matter does not.', 8 * dpr, 40 * dpr);

              } else if (currentMode === 'doppler') {
                // ========== DOPPLER EFFECT MODE ==========
                var sourceSpeed = parseFloat(canvasEl.dataset.sourceSpeed || '0.3');
                var midY_d = cH / 2;
                // Source moves left to right, wrapping
                var sourceX = ((t * sourceSpeed * 60) % (cW + 100)) - 50;
                var waveSpeedPx = 3 * dpr;
                var soundSpeed = parseFloat(canvasEl.dataset.waveSpeed || '343');

                // Draw expanding wavefronts from source's past positions
                ctx.lineWidth = 1;
                var numFronts = 20;
                for (var wf = 0; wf < numFronts; wf++) {
                  var age = wf * 8;
                  var emitX = sourceX - age * sourceSpeed * 60 / 60;
                  var radius = age * waveSpeedPx;
                  if (radius > 0 && radius < cW) {
                    var frontAlpha = Math.max(0.05, 1 - age / (numFronts * 8));
                    ctx.strokeStyle = 'rgba(96,165,250,' + frontAlpha.toFixed(2) + ')';
                    ctx.beginPath();
                    ctx.arc(emitX, midY_d, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                  }
                }

                // Draw source
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(sourceX, midY_d, 8 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';
                ctx.fillText('S', sourceX - 3 * dpr, midY_d + 2 * dpr);

                // Draw observer (right side)
                var obsX = cW - 40 * dpr;
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(obsX, midY_d, 8 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText('O', obsX - 3 * dpr, midY_d + 2 * dpr);

                // Frequency display
                var mach = sourceSpeed;
                var approachFreq = (freq / (1 - Math.min(mach, 0.95))).toFixed(1);
                var recedeFreq = (freq / (1 + mach)).toFixed(1);

                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(4, 4, 260 * dpr, 52 * dpr);
                ctx.fillStyle = '#67e8f9';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Doppler Effect \u2014 Source speed: ' + (mach * 100).toFixed(0) + '% of sound', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#f87171';
                ctx.fillText('Approaching f\u2032 = ' + approachFreq + ' Hz (compressed)', 8 * dpr, 26 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.fillText('Receding f\u2032 = ' + recedeFreq + ' Hz (stretched)', 8 * dpr, 38 * dpr);
                ctx.fillStyle = '#a78bfa';
                ctx.fillText('f\u2080 = ' + freq.toFixed(1) + ' Hz | v_s = ' + soundSpeed + ' m/s', 8 * dpr, 50 * dpr);

              } else if (currentMode === 'spectrum') {
                // ========== FFT / SPECTRUM MODE ==========
                var midY_s = cH / 2;
                var barCount = 32;
                var barW = (cW - 40) / barCount;

                // Time-domain waveform (top half)
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2 * dpr;
                ctx.shadowColor = '#60a5fa';
                ctx.shadowBlur = 8;
                ctx.setLineDash([]);
                ctx.beginPath();
                for (var sx = 0; sx < cW; sx += 2) {
                  var sv = amp * waveVal(2 * Math.PI * (sx / cW * freq - t * freq * 0.05), waveType);
                  if (showSecond) sv += amp2 * Math.sin(2 * Math.PI * (sx / cW * freq2 - t * freq2 * 0.05));
                  var sy = midY_s * 0.5 + sv * midY_s * 0.35;
                  if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Divider line
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, midY_s); ctx.lineTo(cW, midY_s); ctx.stroke();

                // Frequency domain (bottom half): a REAL discrete Fourier transform of ONE period
                // of the selected waveform, so the spectrum genuinely reflects timbre \u2014
                // sine = one bar; square = odd harmonics (~1/n); sawtooth = all harmonics (~1/n);
                // triangle = odd harmonics fading fast (~1/n\u00b2). (A steady tone has a STEADY
                // spectrum, so unlike the old fake bars these don't jitter \u2014 that's correct.)
                var NSAMP = 256, maxHarm = 12;
                var harmMag = [], maxMag = 1e-6;
                for (var hh = 1; hh <= maxHarm; hh++) {
                  var dre = 0, dim = 0;
                  for (var kk = 0; kk < NSAMP; kk++) {
                    var ph = 2 * Math.PI * kk / NSAMP;
                    var yk = waveVal(ph, waveType);
                    dre += yk * Math.cos(hh * ph);
                    dim += yk * Math.sin(hh * ph);
                  }
                  var hmag = 2 * Math.sqrt(dre * dre + dim * dim) / NSAMP; // Fourier amplitude of harmonic hh
                  harmMag.push(hmag);
                  if (hmag > maxMag) maxMag = hmag;
                }
                var maxFreqDisp = (maxHarm + 1) * freq;
                var plotBottom = cH - 12, plotTop = midY_s + 8;
                for (var hb = 1; hb <= maxHarm; hb++) {
                  var rel = harmMag[hb - 1] / maxMag;
                  if (rel < 0.012) continue; // omit negligible harmonics for a clean read
                  var hx = 20 + (hb * freq / maxFreqDisp) * (cW - 40);
                  var hBarH = rel * (plotBottom - plotTop);
                  var hue = ((hb - 1) / maxHarm) * 270;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.9)';
                  ctx.fillRect(hx - 3 * dpr, plotBottom - hBarH, 6 * dpr, hBarH);
                  ctx.fillStyle = 'hsla(' + hue + ', 90%, 80%, 0.95)';
                  ctx.fillRect(hx - 3 * dpr, plotBottom - hBarH, 6 * dpr, 3 * dpr);
                  if (rel > 0.08) {
                    ctx.fillStyle = 'rgba(255,255,255,0.75)';
                    ctx.font = (5 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(hb + 'f', hx, plotBottom - hBarH - 3 * dpr);
                    ctx.textAlign = 'left';
                  }
                }

                // Frequency axis labels
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = (5 * dpr) + 'px sans-serif';
                for (var fl = 0; fl < 5; fl++) {
                  var fLabel = Math.round(fl * maxFreqDisp / 4);
                  ctx.fillText(fLabel + ' Hz', 20 + fl * (cW - 40) / 4, cH - 2);
                }

                // Labels
                ctx.fillStyle = 'rgba(0,0,0,0.62)';
                ctx.fillRect(4, 4, 340 * dpr, 50 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Spectrum \u2014 Time \u2192 Frequency (real harmonic analysis)', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#c084fc';
                ctx.fillText('Top: ' + waveType + ' wave | Bottom: its true harmonic content', 8 * dpr, 26 * dpr);
                ctx.fillStyle = '#34d399';
                var _timbreNote = waveType === 'sine' ? 'Pure sine = ONE frequency, no harmonics.'
                  : waveType === 'square' ? 'Square = odd harmonics (1f, 3f, 5f\u2026), ~1/n.'
                  : waveType === 'triangle' ? 'Triangle = odd harmonics, fading fast (~1/n\u00b2).'
                  : 'Sawtooth = ALL harmonics (1f, 2f, 3f\u2026), ~1/n.';
                ctx.fillText('Timbre = harmonics: ' + _timbreNote, 8 * dpr, 40 * dpr);

              } else if (currentMode === 'reflection') {
                // ========== REFLECTION / BOUNDARY MODE ==========
                // A traveling wave moves right and hits a wall. Reflected wave
                // travels back leftward. They superpose into the visible wave.
                // Pedagogy: fixed-end reflection inverts phase (string tied
                // down); free-end does NOT invert. We pick by dataset toggle.
                var midY_r = cH / 2;
                var defWall = cW * 0.75;
                var wallX = canvasEl._drag.wallX != null ? canvasEl._drag.wallX : defWall;
                var endType = canvasEl.dataset.reflectionEnd || 'fixed'; // 'fixed' | 'free'
                var phaseFlip = endType === 'fixed' ? -1 : 1; // fixed-end inverts
                var refReflectivity = parseFloat(canvasEl.dataset.reflectivity || '0.9');
                var refAmp = amp * dpr;
                var k = 2 * Math.PI * freq / cW;
                var omega = freq * 0.05 * speed;

                // Build the incident + reflected wave at each x position.
                // For x < wallX:
                //   incident y_i(x,t) = A sin(k x - ω t)
                //   reflected y_r(x,t) = phaseFlip * R * A sin(k (2*wallX - x) - ω t)
                //                        = phaseFlip * R * A sin(k (2*wallX - x) - ω t)
                // For x > wallX: no wave (transmitted = 0 — perfect wall).
                ctx.lineWidth = 3 * dpr;
                ctx.strokeStyle = '#22d3ee';
                ctx.shadowColor = '#22d3ee';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                var started = false;
                for (var rx = 0; rx < wallX; rx += 2) {
                  var phaseIn = k * rx - omega * t;
                  var phaseRe = k * (2 * wallX - rx) - omega * t;
                  var yi = Math.sin(phaseIn);
                  var yre = phaseFlip * refReflectivity * Math.sin(phaseRe);
                  var ry = midY_r - (yi + yre) * refAmp;
                  if (!started) { ctx.moveTo(rx, ry); started = true; }
                  else ctx.lineTo(rx, ry);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Faintly show the incident component alone (dashed)
                ctx.strokeStyle = 'rgba(96,165,250,0.45)';
                ctx.lineWidth = 1.5 * dpr;
                ctx.setLineDash([6, 5]);
                ctx.beginPath();
                for (var rx2 = 0; rx2 < cW; rx2 += 2) {
                  var yi2 = Math.sin(k * rx2 - omega * t);
                  var ry2 = midY_r - yi2 * refAmp;
                  if (rx2 === 0) ctx.moveTo(rx2, ry2); else ctx.lineTo(rx2, ry2);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Faintly show the reflected component alone (dashed, magenta)
                ctx.strokeStyle = 'rgba(244,114,182,0.45)';
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                for (var rx3 = 0; rx3 < wallX; rx3 += 2) {
                  var yre3 = phaseFlip * refReflectivity * Math.sin(k * (2 * wallX - rx3) - omega * t);
                  var ry3 = midY_r - yre3 * refAmp;
                  if (rx3 === 0) ctx.moveTo(rx3, ry3); else ctx.lineTo(rx3, ry3);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw the wall (draggable handle)
                var wallActive = canvasEl._drag.activeHandle === 'wall';
                ctx.fillStyle = wallActive ? 'rgba(251,191,36,0.95)' : 'rgba(251,191,36,0.75)';
                ctx.fillRect(wallX - 3 * dpr, 30 * dpr, 6 * dpr, cH - 60 * dpr);
                // Wall hatching (visual texture)
                ctx.strokeStyle = wallActive ? '#fff' : 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 1;
                for (var wh = 30 * dpr; wh < cH - 30 * dpr; wh += 8 * dpr) {
                  ctx.beginPath();
                  ctx.moveTo(wallX + 3 * dpr, wh);
                  ctx.lineTo(wallX + 12 * dpr, wh + 6 * dpr);
                  ctx.stroke();
                }
                // Wall drag handle indicator
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(wallX, midY_r, 10 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                ctx.fillText('⇔', wallX - 6 * dpr, midY_r + 3 * dpr);

                // End-type label near the wall
                ctx.fillStyle = endType === 'fixed' ? '#ef4444' : '#22c55e';
                ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
                ctx.fillText(endType === 'fixed' ? 'FIXED END' : 'FREE END', wallX - 24 * dpr, 20 * dpr);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = (5 * dpr) + 'px sans-serif';
                ctx.fillText(endType === 'fixed' ? '(phase inverts)' : '(phase preserved)', wallX - 28 * dpr, 28 * dpr);

                // Legend
                ctx.fillStyle = 'rgba(0,0,0,0.65)';
                ctx.fillRect(4, 4, 280 * dpr, 60 * dpr);
                ctx.fillStyle = '#67e8f9';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Reflection / Boundary — Wave hits a wall', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.fillText('— Solid: incident + reflected (real wave)', 8 * dpr, 26 * dpr);
                ctx.fillStyle = '#f472b6';
                ctx.fillText('-- Dashed magenta: reflected component', 8 * dpr, 38 * dpr);
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('✂ DRAG the gold wall left/right', 8 * dpr, 50 * dpr);
              }

              // Wavelength annotation

              if (currentMode === 'free') {

                var wavelengthPx = cW / freq;

                if (wavelengthPx > 40) {

                  var arrowY = cH - 20 * dpr;

                  ctx.strokeStyle = '#fbbf24';

                  ctx.lineWidth = 2;

                  ctx.setLineDash([]);

                  ctx.beginPath(); ctx.moveTo(10, arrowY); ctx.lineTo(10 + wavelengthPx, arrowY); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(10, arrowY - 5 * dpr); ctx.lineTo(10, arrowY + 5 * dpr); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(10 + wavelengthPx, arrowY - 5 * dpr); ctx.lineTo(10 + wavelengthPx, arrowY + 5 * dpr); ctx.stroke();

                  ctx.fillStyle = '#fbbf24';

                  ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                  var canvasWL = parseFloat(canvasEl.dataset.waveSpeed || '343') / freq; ctx.fillText('\u03BB = ' + canvasWL.toFixed(1) + ' m', 10 + wavelengthPx / 2 - 20 * dpr, arrowY - 5 * dpr);

                }

              }

              canvasEl._waveAnim = requestAnimationFrame(draw);

            }

            canvasEl._waveAnim = requestAnimationFrame(draw);

          };



          // Sound playback

          var toggleSound = function () {

            if (d._audioCtx) {

              try { d._audioCtx.close(); } catch (e) { }

              upd('_audioCtx', null);

              upd('soundPlaying', false);

              return;

            }

            try {

              var ctx = new (window.AudioContext || window.webkitAudioContext)();

              var osc = ctx.createOscillator();

              var gain = ctx.createGain();

              osc.type = (d.waveType || 'sine');

              osc.frequency.value = d.frequency * 100;

              gain.gain.value = 0.15;

              osc.connect(gain);

              gain.connect(ctx.destination);

              osc.start();

              upd('_audioCtx', ctx);

              upd('_audioOsc', osc);

              upd('soundPlaying', true);

            } catch (e) {

              addToast(t('stem.wave.u26a0_audio_not_supported_in'), 'error');

            }

          };



          var checkWaveMatch = function(a, f) {

            if (!d.matchTarget) return;

            var pct = Math.max(0, Math.round((1 - (Math.abs(a - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(f - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

            if (pct > 90 && !d.matchXpClaimed) {

              awardStemXP('wave-match', 15, 'Matched a wave exactly!');

              upd('matchXpClaimed', true);

              addToast('\u2705 Excellent match! Equation mastered! +15 XP', 'success');

            }

          };



          // Helper to render math equations with highlighted inputs

          var renderEq = function(a, f, isTarget, isInteractive) {

             var baseHc = isTarget ? "bg-purple-800/80 text-purple-100 px-1.5 py-0.5 rounded-md mx-0.5 border border-purple-500/50 shadow-sm" : "bg-cyan-800/80 text-cyan-100 px-1.5 py-0.5 rounded-md mx-0.5 border border-cyan-500/50 shadow-sm";

             var tc = isTarget ? "text-purple-400" : "text-cyan-300";

             

             var wrapA = isInteractive ? 

                 React.createElement("input", {

                     type: "number", value: a,

                     'aria-label': 'Wave amplitude',

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('amplitude', v); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(v, f); } catch(ex){} } },

                     className: "bg-slate-900 border border-cyan-500 text-cyan-300 rounded px-1.5 py-0.5 mx-0.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 w-16 font-mono shadow-sm",

                     min: 10, max: 100, step: 1

                 }) : React.createElement("span", {className: baseHc}, a);



             var wrapF = isInteractive ? 

                 React.createElement("input", {

                     type: "number", value: f,

                     'aria-label': 'Wave frequency',

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('frequency', v); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(a, v); } catch(ex){} } },

                     className: "bg-slate-900 border border-cyan-500 text-cyan-300 rounded px-1.5 py-0.5 mx-0.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 w-16 font-mono shadow-sm",

                     min: 0.5, max: 10, step: 0.5

                 }) : React.createElement("span", {className: baseHc}, f);



             if (waveMode === 'standing') {

               var wStr = ((d.harmonic || 1) * f * 2 * Math.PI).toFixed(1);

               return React.createElement("span", {className: tc + " inline-flex items-center justify-center flex-wrap gap-y-1 align-middle whitespace-nowrap"}, 

                 "y(x,t) =", wrapA, "sin(" + (d.harmonic || 1) + "\u03C0x/L) cos(", React.createElement("span", {className: baseHc}, wStr), "t)"

               );

             } else {

               var kStr = (2 * Math.PI * f).toFixed(1);

               return React.createElement("span", {className: tc + " inline-flex items-center justify-center flex-wrap gap-y-1 align-middle whitespace-nowrap"}, 

                 "y(x,t) =", wrapA, "sin(2\u03C0\u00B7", wrapF, "t \u2212 " + kStr + "x)"

               );

             }

          };



          // Quiz bank

          var WAVE_QUIZ = [

            { q: 'What happens to pitch when frequency increases?', a: 'Goes up', opts: ['Goes up', 'Goes down', 'Stays same', 'Disappears'] },

            { q: 'What does amplitude control?', a: 'Loudness / height', opts: ['Speed', 'Loudness / height', 'Color', 'Direction'] },

            { q: 'What is superposition?', a: 'Waves combining', opts: ['Waves combining', 'Waves canceling', 'Waves reflecting', 'Waves stopping'] },

            { q: 'Destructive interference occurs when...', a: 'Peaks meet troughs', opts: ['Peaks meet peaks', 'Peaks meet troughs', 'Waves stop', 'Amplitude doubles'] },

            { q: 'Sound is what type of wave?', a: 'Longitudinal', opts: ['Transverse', 'Longitudinal', 'Circular', 'Standing'] },

            { q: 'At a node of a standing wave, the displacement is:', a: 'Always zero', opts: ['Maximum', 'Always zero', 'Half maximum', 'Random'] },

            { q: 'The speed of a wave equals:', a: 'Frequency \u00D7 Wavelength', opts: ['Amplitude \u00D7 Frequency', 'Frequency \u00D7 Wavelength', 'Period \u00D7 Amplitude', 'None of these'] },

          ];



          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            null, // tutorial overlay removed (hub-scope dependency)

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Wave Simulator"),

              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[11px] font-bold rounded-full" }, "ANIMATED")

            ),

            // Mode tabs

            React.createElement("div", { className: "flex gap-2 mb-3" },

              [['free', '\uD83C\uDF0A Free Wave'], ['standing', '\uD83C\uDFB8 Standing'], ['ripple', '\uD83D\uDCA7 Ripple Tank'], ['reflection', '\uD83E\uDE9E Reflection'], ['longitudinal', '\u2261 Longitudinal'], ['doppler', '\uD83D\uDE97 Doppler'], ['spectrum', '\uD83D\uDCCA Spectrum']].map(function (m) {

                return React.createElement("button", { "aria-label": "Switch to " + m[1] + " mode", key: m[0], onClick: function () {
                  upd('waveMode', m[0]);
                  // Canvas Narration: mode switch
                  if (typeof canvasNarrate === 'function') {
                    var modeDescs = { free: 'Free wave mode. Observe sine, square, triangle, and sawtooth waveforms.', standing: 'Standing wave mode. See nodes and antinodes form on a vibrating string.', ripple: 'Ripple tank mode. Drag two point sources to explore interference patterns.', reflection: 'Reflection mode. A wave hits a wall — drag the wall to see fixed vs free end behavior.', longitudinal: 'Longitudinal wave mode. See compression and rarefaction in a spring.', doppler: 'Doppler effect mode. A moving source shifts the observed frequency.', spectrum: 'Spectrum analysis mode. See the frequency components of your wave.' };
                    canvasNarrate('wave', 'modeSwitch', {
                      first: 'Switched to ' + m[1] + '. ' + (modeDescs[m[0]] || ''),
                      repeat: m[1] + ' mode active.',
                      terse: m[1]
                    });
                  }
                }, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 " + (waveMode === m[0] ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50') }, m[1]);

              }),

              React.createElement("button", { "aria-label": "Toggle Sound",

                onClick: toggleSound,

                className: "ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.soundPlaying ? 'bg-emerald-700 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')

              }, d.soundPlaying ? '\uD83D\uDD0A Stop Sound' : '\uD83D\uDD08 Play Sound (' + (d.frequency * 100) + 'Hz)')

            ),

            // ── Topic-accent hero band per wave mode ──
            (function() {
              var MODE_META = {
                free:         { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\uD83C\uDF0A', title: 'Free Wave \u2014 sine, square, triangle, sawtooth',  hint: 'Pure sine = single frequency; square / triangle / sawtooth are sine sums (Fourier 1822). Each waveform sounds different at the same pitch \u2014 timbre IS the harmonic content.' },
                standing:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFB8', title: 'Standing \u2014 nodes + antinodes on a string',     hint: 'Two waves traveling opposite directions interfere into a stationary pattern. Guitar / violin strings vibrate at fundamental + integer harmonics. Length, tension, density set the pitch.' },
                ripple:       { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCA7', title: 'Ripple Tank \u2014 two sources, interference',     hint: 'Where crests meet crests \u2192 bright (constructive); crests meet troughs \u2192 dark (destructive). Young\u2019s 1801 double-slit experiment proved light is a wave; same physics here.' },
                longitudinal: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\u2261',         title: 'Longitudinal \u2014 compression + rarefaction',      hint: 'Sound is longitudinal: air molecules push and pull along the direction of travel, not perpendicular. P-waves in earthquakes are longitudinal too \u2014 they arrive first, hence the P (primary).' },
                doppler:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDE97', title: 'Doppler \u2014 the moving siren effect',             hint: 'Source approaching = compressed wavelengths = higher pitch. Moving away = stretched wavelengths = lower pitch. Christian Doppler 1842; redshift in cosmology is the same idea, with light.' },
                spectrum:     { accent: '#10b981', soft: 'rgba(16,185,129,0.10)', icon: '\uD83D\uDCCA', title: 'Spectrum \u2014 FFT decomposition',                  hint: 'Any periodic signal = sum of sines (Fourier transform). Music DAWs, JPEG, MRI, MP3 \u2014 all rest on this. Cooley + Tukey 1965 FFT made it computationally cheap; modern signal processing was born.' }
              };
              var meta = MODE_META[waveMode] || MODE_META.free;
              return React.createElement('div', {
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
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // Canvas

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-cyan-300 shadow-lg mb-3", style: { height: "400px" } },

              React.createElement("canvas", {

                ref: canvasRef,

                tabIndex: 0, role: "application", "aria-label": "Wave simulator — arrow up/down adjusts amplitude, arrow left/right adjusts frequency, +/- adjusts speed",

                "data-amp": d.amplitude, "data-freq": d.frequency, "data-wave-type": d.waveType || 'sine',

                "data-show-second": d.showSecond ? 'true' : 'false',

                "data-amp2": d.amplitude2 || 30, "data-freq2": d.frequency2 || 3,

                "data-speed": d.speed || 1,

                "data-wave-mode": waveMode,

                "data-harmonic": d.harmonic || 1,
                "data-phase2": d.phase2 || 0,
                "data-damping": dampingEnabled ? 'true' : 'false',
                "data-damp-alpha": d.dampingAlpha || 0.5,
                "data-wave-speed": d.waveSpeed || 343,

                "data-target-amp": d.matchTarget ? d.matchTarget.amp : 0,

                "data-target-freq": d.matchTarget ? d.matchTarget.freq : 0,

                "data-target-is-equation": (d.matchTarget && d.matchTarget.isEquation) ? 'true' : 'false',
                "data-reflection-end": d.reflectionEnd || 'fixed',
                "data-reflectivity": d.reflectivity != null ? d.reflectivity : 0.9,

                onKeyDown: function (e) {

                  if (e.key === 'ArrowUp') { e.preventDefault(); upd('amplitude', Math.min(100, (d.amplitude || 50) + 5)); }

                  else if (e.key === 'ArrowDown') { e.preventDefault(); upd('amplitude', Math.max(5, (d.amplitude || 50) - 5)); }

                  else if (e.key === 'ArrowRight') { e.preventDefault(); upd('frequency', Math.min(10, Math.round(((d.frequency || 2) + 0.5) * 10) / 10)); }

                  else if (e.key === 'ArrowLeft') { e.preventDefault(); upd('frequency', Math.max(0.5, Math.round(((d.frequency || 2) - 0.5) * 10) / 10)); }

                  else if (e.key === '+' || e.key === '=') { e.preventDefault(); upd('speed', Math.min(3, Math.round(((d.speed || 1) + 0.25) * 100) / 100)); }

                  else if (e.key === '-') { e.preventDefault(); upd('speed', Math.max(0.25, Math.round(((d.speed || 1) - 0.25) * 100) / 100)); }

                },

                style: { width: "100%", height: "100%", display: "block", outline: "none" }

              })

            ),

            // Wave type buttons (free mode only)

            waveMode === 'free' && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              ['sine', 'square', 'triangle', 'sawtooth'].map(wt =>

                React.createElement("button", { key: wt, onClick: () => upd('waveType', wt),

                  className: "px-2.5 py-1 rounded-lg text-xs font-bold transition-all " + ((d.waveType || 'sine') === wt ? 'bg-cyan-700 text-white shadow-md' : 'bg-cyan-50 text-cyan-700 border border-cyan-600 hover:bg-cyan-100')

                }, wt.charAt(0).toUpperCase() + wt.slice(1))

              )

            ),

            // Harmonic selector (standing mode only)

            waveMode === 'standing' && React.createElement("div", { className: "flex gap-2 mb-3 items-center" },

              React.createElement("span", { className: "text-xs font-bold text-cyan-600" }, "Harmonic:"),

              [1, 2, 3, 4, 5, 6].map(function (h) {

                return React.createElement("button", { key: h, onClick: function () { upd('harmonic', h); }, className: "w-9 h-9 rounded-lg text-sm font-black transition-all " + ((d.harmonic || 1) === h ? 'bg-cyan-700 text-white shadow-md scale-110' : 'bg-cyan-50 text-cyan-700 border border-cyan-600 hover:bg-cyan-100') }, h);

              }),

              React.createElement("span", { className: "text-xs text-slate-600 ml-2" }, ((d.harmonic || 1) + 1) + " nodes, " + (d.harmonic || 1) + " antinode" + ((d.harmonic || 1) > 1 ? 's' : ''))

            ),

            // Standing wave info

            waveMode === 'standing' && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3 text-xs text-cyan-800" },

              React.createElement("p", { className: "font-bold mb-1" }, "\uD83C\uDFB8 Standing Wave \u2014 Harmonic #" + (d.harmonic || 1)),

              React.createElement("p", null, "\u2022 Nodes (\uD83D\uDD34 N): Points of zero displacement \u2014 " + ((d.harmonic || 1) + 1) + " total (including endpoints)"),

              React.createElement("p", null, "\u2022 Antinodes (\uD83D\uDFE2 A): Points of maximum displacement \u2014 " + (d.harmonic || 1) + " total"),

              React.createElement("p", null, "\u2022 Wavelength: \u03BB = 2L/" + (d.harmonic || 1) + " (L = string length)"),

              React.createElement("p", null, "\u2022 Frequency: f\u2081 \u00D7 " + (d.harmonic || 1) + " = " + ((d.harmonic || 1) * d.frequency).toFixed(1) + " Hz")

            ),

            // Controls

            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },

              [

                { k: 'amplitude', label: '\uD83D\uDCC8 Amplitude', min: 10, max: 100, step: 1 },

                { k: 'frequency', label: '\uD83C\uDFB5 Frequency', min: 0.5, max: 10, step: 0.5 },

                { k: 'speed', label: '\u23E9 Speed', min: 0.1, max: 5, step: 0.1 },

                { k: 'waveSpeed', label: '\uD83C\uDF0D Medium v (m/s)', min: 50, max: 1500, step: 10 },

              ].map(s =>

                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-[11px] font-bold text-slate-600 block" }, s.label),

                  React.createElement("span", { className: "text-sm font-bold text-slate-700 block" }, d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : d[s.k])),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : 0), 'aria-label': s.label, onChange: function (e) {
                    var v = parseFloat(e.target.value); upd(s.k, v);
                    if (s.k === 'amplitude' || s.k === 'frequency') { checkWaveMatch(s.k === 'amplitude' ? v : d.amplitude, s.k === 'frequency' ? v : d.frequency); }
                    // Canvas Narration: parameter change
                    if (typeof canvasNarrate === 'function') {
                      var wl = (s.k === 'frequency' || s.k === 'waveSpeed') ? (d.waveSpeed || 343) / (s.k === 'frequency' ? v : d.frequency || 1) : null;
                      var msg = s.label + ': ' + v + (wl ? '. Wavelength: ' + wl.toFixed(1) + ' m' : '');
                      canvasNarrate('wave', 'param_' + s.k, msg, { debounce: 800 });
                    }
                  }, className: "w-full accent-cyan-600" })

                )

              )

            ),

            // Second wave (free & spectrum mode)

            (waveMode === 'free' || waveMode === 'spectrum') && React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-pink-50 rounded-lg border border-pink-200" },

              React.createElement("label", { className: "text-xs font-bold text-pink-700 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.showSecond, 'aria-label': 'Show second wave', onChange: e => upd('showSecond', e.target.checked), className: "accent-pink-600" }),

                "\u223F Show Second Wave (Interference)"

              ),

              d.showSecond && React.createElement(React.Fragment, null,

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, "A2:"),

                  React.createElement("input", { type: "range", min: 10, max: 80, step: 1, value: d.amplitude2 || 30, 'aria-label': 'Second wave amplitude', onChange: e => upd('amplitude2', parseFloat(e.target.value)), className: "w-16 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, d.amplitude2 || 30)

                ),

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-500 font-bold" }, "f2:"),

                  React.createElement("input", { type: "range", min: 0.5, max: 10, step: 0.5, value: d.frequency2 || 3, 'aria-label': 'Second wave frequency', onChange: e => upd('frequency2', parseFloat(e.target.value)), className: "w-16 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, d.frequency2 || 3)

                ),

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-500 font-bold" }, "\u03C6\u2082:"),

                  React.createElement("input", { type: "range", min: 0, max: 6.28, step: 0.1, value: d.phase2 || 0, 'aria-label': 'Second wave phase', onChange: e => upd('phase2', parseFloat(e.target.value)), className: "w-16 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, ((d.phase2 || 0) / Math.PI).toFixed(1) + "\u03C0")

                )

              )

            ),

            // Damping toggle (free mode only)

            waveMode === 'free' && React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200" },

              React.createElement("label", { className: "text-xs font-bold text-amber-700 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.damping, 'aria-label': 'Enable damping', onChange: e => upd('damping', e.target.checked), className: "accent-amber-600" }),

                "\uD83C\uDF0A Damping (Exponential Decay)"

              ),

              d.damping && React.createElement("div", { className: "flex items-center gap-1" },

                React.createElement("span", { className: "text-[11px] text-amber-500 font-bold" }, "\u03B1:"),

                React.createElement("input", { type: "range", min: 0.1, max: 2.0, step: 0.1, value: d.dampingAlpha || 0.5, 'aria-label': 'Damping coefficient', onChange: e => upd('dampingAlpha', parseFloat(e.target.value)), className: "w-20 accent-amber-500" }),

                React.createElement("span", { className: "text-[11px] text-amber-700 font-bold" }, (d.dampingAlpha || 0.5).toFixed(1))

              )

            ),

            // Ripple Tank custom controls

            waveMode === 'ripple' && React.createElement("div", { className: "flex items-center flex-wrap gap-4 mb-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200" },

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "Source Separation:"),

                React.createElement("input", { type: "range", min: 20, max: 200, step: 5, value: d.rippleSeparation || 80, 'aria-label': 'Slit separation', onChange: e => upd('rippleSeparation', parseFloat(e.target.value)), className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-900 font-bold w-6" }, d.rippleSeparation || 80)

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "Medium Damping:"),

                React.createElement("input", { type: "range", min: 0.000, max: 0.010, step: 0.001, value: d.dampingCoeff !== undefined ? d.dampingCoeff : 0.002, 'aria-label': 'Damping coefficient for interference', onChange: e => upd('dampingCoeff', parseFloat(e.target.value)), className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-900 font-bold w-12" }, (d.dampingCoeff !== undefined ? d.dampingCoeff : 0.002).toFixed(3))

              ),

              React.createElement("button", {
                onClick: function() {
                  // Reset draggable source positions to centered defaults.
                  var c = canvasRef._lastCanvas;
                  if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; }
                  if (typeof addToast === 'function') addToast('Sources reset to defaults', 'info');
                },
                className: "px-3 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700",
                'aria-label': 'Reset source positions to defaults'
              }, '↻ Reset sources'),
              React.createElement("span", { className: "text-[10px] text-indigo-700 italic ml-auto" }, '💡 Drag the red sources on the canvas')

            ),

            // Reflection / boundary controls
            waveMode === 'reflection' && React.createElement("div", { className: "flex items-center flex-wrap gap-4 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200" },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "End Type:"),
                React.createElement("div", { className: "flex rounded-md overflow-hidden border border-amber-300" },
                  ['fixed', 'free'].map(function(et) {
                    var active = (d.reflectionEnd || 'fixed') === et;
                    return React.createElement('button', {
                      key: et,
                      onClick: function() { upd('reflectionEnd', et); },
                      className: 'px-2.5 py-1 text-[11px] font-bold transition ' + (active ? (et === 'fixed' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white') : 'bg-white text-slate-600 hover:bg-amber-100'),
                      'aria-pressed': active,
                      'aria-label': et === 'fixed' ? 'Fixed end (string tied down — phase inverts on reflection)' : 'Free end (string free to move — phase preserved on reflection)'
                    }, et === 'fixed' ? '🔒 Fixed' : '🪁 Free');
                  })
                )
              ),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "Reflectivity:"),
                React.createElement("input", { type: "range", min: 0.0, max: 1.0, step: 0.05, value: d.reflectivity != null ? d.reflectivity : 0.9, 'aria-label': 'Wall reflectivity 0 to 1', onChange: e => upd('reflectivity', parseFloat(e.target.value)), className: "w-24 accent-amber-600" }),
                React.createElement("span", { className: "text-xs text-amber-900 font-bold w-10" }, (d.reflectivity != null ? d.reflectivity : 0.9).toFixed(2))
              ),
              React.createElement("button", {
                onClick: function() {
                  var c = canvasRef._lastCanvas;
                  if (c && c._drag) { c._drag.wallX = null; }
                  if (typeof addToast === 'function') addToast('Wall reset to 75% across', 'info');
                },
                className: "px-3 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700",
                'aria-label': 'Reset wall position'
              }, '↻ Reset wall'),
              React.createElement("span", { className: "text-[10px] text-amber-800 italic ml-auto" }, '💡 Drag the gold wall on the canvas')
            ),

            // Doppler specific controls

            waveMode === 'doppler' && React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-rose-50 rounded-lg border border-rose-200" },

              React.createElement("label", { className: "text-xs font-bold text-rose-700 flex items-center gap-2" },

                "Source Speed (v\u209B):",

                React.createElement("input", { type: "range", min: 0.0, max: 0.95, step: 0.05, value: d.sourceSpeed !== undefined ? d.sourceSpeed : 0.3, 'aria-label': 'Source speed as fraction of wave speed', onChange: e => upd('sourceSpeed', parseFloat(e.target.value)), className: "w-32 accent-rose-600" }),

                React.createElement("span", { className: "inline-block w-8 text-right" }, Math.round((d.sourceSpeed !== undefined ? d.sourceSpeed : 0.3) * 100) + "%")

              ),

              React.createElement("span", { className: "text-[11px] text-rose-500" }, "of sound speed (Mach number)")

            ),

            // Wave equation display

            React.createElement("div", { className: "bg-slate-800 rounded-lg p-3 mb-3 text-center" },

              React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" }, "\uD83D\uDCDD Wave Equation"),

              

              // General Template Formula

              React.createElement("div", { className: "mb-3 p-1.5 bg-slate-900/50 rounded-lg border border-slate-700/50 inline-block text-center" },

                 React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-0.5" }, "General Formula"),

                 React.createElement("p", { className: "text-sm font-mono font-bold text-slate-300" }, 

                    waveMode === 'standing' ? 'y(x,t) = A sin(n\u03C0x/L) cos(\u03C9t)' : 'y(x,t) = A sin(2\u03C0ft \u2212 kx)'

                 )

              ),

              React.createElement("br"),



              (d.matchTarget && d.matchTarget.isEquation) && React.createElement("div", { className: "mb-3 p-2 bg-purple-900/50 rounded-lg border border-purple-500/50 inline-block text-left" },

                  React.createElement("p", { className: "text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1" }, "Target Equation:"),

                  React.createElement("div", { className: "text-lg font-mono font-bold opacity-90" }, 

                      renderEq(d.matchTarget.amp, d.matchTarget.freq, true, false)

                  )

              ),

              React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-1 flex justify-center items-center h-4" }, 

                  (d.matchTarget && d.matchTarget.isEquation) ? "Your Equation:" : "Current Equation:",

                  (function() {

                    if (!d.matchTarget) return null;

                    var pct = Math.max(0, Math.round((1 - (Math.abs(d.amplitude - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(d.frequency - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

                    return pct > 90 

                      ? React.createElement("span", {className: "text-[11px] font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, "\u2705 " + pct + "% match") 

                      : React.createElement("span", {className: "text-[11px] font-bold text-amber-400 bg-amber-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, pct + "% match");
                  })()

              ),

              React.createElement("div", { className: "text-lg font-mono font-bold" },

                  renderEq(d.amplitude, d.frequency, false, true)

              ),

              React.createElement("p", { className: "text-[11px] text-slate-400 mt-2" }, 

                  waveMode === 'standing' 

                  ? 'Standing wave \u2014 superposition of two traveling waves. A = Amplitude, n = Harmonic' 

                  : 'A = ' + d.amplitude + ', f = ' + d.frequency + ' Hz, \u03BB = ' + wavelength.toFixed(1) + ' m, T = ' + (1 / d.frequency).toFixed(3) + ' s'

              )

            ),

            // Info cards

            React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3 text-center" },

              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, "Wavelength \u03BB"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, wavelength.toFixed(1) + " m")

              ),

              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, "Period T"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (1 / d.frequency).toFixed(3) + " s")

              ),

              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, "Wave Speed v"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, waveSpeedCalc.toFixed(0) + " m/s")

              ),

              React.createElement("div", { className: "p-2 bg-cyan-50 rounded-lg border border-cyan-200" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-700 uppercase" }, "Energy"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, "\u221D A\u00B2 = " + (d.amplitude * d.amplitude).toFixed(0))

              )

            ),

            // Quiz

            React.createElement("div", { className: "flex items-center gap-2 mb-2" },

              React.createElement("button", { onClick: function () {

                  var q = WAVE_QUIZ[Math.floor(Math.random() * WAVE_QUIZ.length)];

                  upd('quiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.quiz && d.quiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " transition-all"

              }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),

              React.createElement("button", { onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  upd('matchTarget', { amp: ta, freq: tf, isEquation: false });

                  upd('matchXpClaimed', false);

                  addToast(t('stem.wave.ud83cudfaf_match_the_yellow_dashed'), 'info');

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.matchTarget && !d.matchTarget.isEquation ? 'bg-amber-100 text-amber-700' : 'bg-amber-700 text-white') + " transition-all"

              }, d.matchTarget && !d.matchTarget.isEquation ? "\uD83D\uDD04 New Target" : "\uD83C\uDFAF Match Waveform"),

              React.createElement("button", { onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  upd('matchTarget', { amp: ta, freq: tf, isEquation: true });

                  upd('matchXpClaimed', false);

                  addToast("Match the mathematical equation!", 'info');

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.matchTarget && d.matchTarget.isEquation ? 'bg-purple-100 text-purple-700' : 'bg-purple-700 text-white') + " transition-all"

              }, (d.matchTarget && d.matchTarget.isEquation) ? "\uD83D\uDD04 New Equation" : "\uD83D\uDCDD Match Equation"),

              d.matchTarget && React.createElement("button", { "aria-label": "Clear",

                onClick: function () { upd('matchTarget', null); upd('matchXpClaimed', false); },

                className: "px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100"

              }, "\u2715 Clear"),

              d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct")

            ),

            d.quiz && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3" },

              React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                d.quiz.opts.map(function (opt) {

                  var isCorrect = opt === d.quiz.a;

                  var wasChosen = d.quiz.chosen === opt;

                  var cls = !d.quiz.answered ? 'bg-white border-slate-200 hover:border-cyan-400' : isCorrect ? 'bg-emerald-100 border-emerald-600' : wasChosen ? 'bg-red-100 border-red-600' : 'bg-slate-50 border-slate-200 opacity-50';

                  return React.createElement("button", { "aria-label": "Select answer: " + opt,

                    key: opt, disabled: d.quiz.answered, onClick: function () {

                      var correct = opt === d.quiz.a;

                      upd('quiz', Object.assign({}, d.quiz, { answered: true, chosen: opt, score: d.quiz.score + (correct ? 1 : 0) }));

                      if (correct) { awardStemXP('wave-quiz', 5, 'Wave quiz: ' + d.quiz.q); }

                      addToast(correct ? '\u2705 Correct!' : '\u274C The answer is ' + d.quiz.a, correct ? 'success' : 'error');

                    }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                  }, opt);

                })

              )

            ),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wv-' + Date.now(), tool: 'wave', label: 'A=' + d.amplitude + ' f=' + d.frequency, data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot"),

            // ── AI Wave Tutor (reading-level aware) ──
            (function () {
              var aiLevel = d.aiLevel || 'grade5';
              var aiText = d.aiExplain || '';
              var aiLoading = !!d.aiLoading;
              var aiError = d.aiError || '';
              var LEVELS = [
                { id: 'plain', label: 'Plain', hint: 'using simple everyday words and short sentences' },
                { id: 'grade5', label: 'Grade 5', hint: 'for a 5th grade student, brief and friendly' },
                { id: 'hs', label: 'High School', hint: 'for a high school physics student, with appropriate equations' }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { var labToolData = ctx.toolData; setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiError: 'AI tutor not available.' }) }); }); return; }
                setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiLoading: true, aiError: '', aiExplain: '' }) }); });
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var waveMode = d.waveMode || 'free';
                var waveType = d.waveType || 'sine';
                var prompt = 'Explain this wave setup ' + lv.hint + '. '
                  + 'Wave mode: ' + waveMode + '. Wave type: ' + waveType + '. Frequency: ' + (d.frequency || 2) + ' Hz. Amplitude: ' + (d.amplitude || 50) + '. '
                  + (d.showSecond ? 'A second wave is also showing for comparison. ' : '')
                  + 'In 3 short sentences: (1) What the student is seeing on screen. (2) Which property changes the wave the most (and how). (3) One everyday example of this wave behavior. '
                  + 'No markdown, no bullets, no headings. Plain prose.';
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiExplain: String(resp || '').trim(), aiLoading: false }) }); });
                  if (typeof announceToSR === 'function') announceToSR('Explanation ready.');
                }).catch(function () {
                  setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiLoading: false, aiError: 'Could not reach AI tutor. Try again in a moment.' }) }); });
                });
              }
              function setAiLevel(id) {
                setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiLevel: id }) }); });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, "\u2728 Explain at my level"),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": "Reading level" },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { setAiLevel(L.id); },
                        "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-600 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": "Generate AI explanation at " + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",
                    className: "px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
                ),
                aiError && React.createElement("p", { className: "text-[11px] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic text-slate-500" }, "Click \u201CExplain\u201D for the AI tutor to describe the current wave at your chosen reading level.")
              );
            })()

          )
      })();

      // ═══════════════════════════════════════════════════════════════════
      // WAVE EXPANSION SECTIONS — interactive reference library (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var d2 = (labToolData && labToolData.wave) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.wave) || {};
          return Object.assign({}, prev, { wave: Object.assign({}, prior, patch) });
        });
      }

      // ── Reference data ──
      var WAVE_TYPES = [
        { name: 'Transverse', icon: '⤴', desc: 'Particle motion perpendicular to wave direction. Crests + troughs.', examples: ['Light + all EM waves', 'String wave', 'Surface water waves (mostly)', 'S-waves in earthquakes'], speed: 'Varies by medium' },
        { name: 'Longitudinal (compressional)', icon: '⤇', desc: 'Particle motion parallel to wave direction. Compressions + rarefactions.', examples: ['Sound waves in air', 'Slinky push-pull', 'P-waves in earthquakes', 'Ultrasound'], speed: '~343 m/s sound in air at 20°C' },
        { name: 'Surface (Rayleigh)', icon: '〰', desc: 'Particles trace elliptical paths. Combines transverse + longitudinal.', examples: ['Ocean surface waves', 'Rayleigh waves in earthquakes'], speed: 'Depends on water depth + λ' },
        { name: 'Electromagnetic', icon: '⚡', desc: 'Oscillating electric + magnetic fields. No medium needed (travel through vacuum).', examples: ['Visible light', 'Radio', 'X-rays', 'Microwaves', 'IR / UV'], speed: 'c = 3.0 × 10⁸ m/s in vacuum' },
        { name: 'Matter waves (de Broglie)', icon: 'λ', desc: 'All matter has wave properties. λ = h/p. Observable for electrons + atoms.', examples: ['Electron diffraction', 'Neutron scattering', 'Atom interferometry'], speed: 'Particle velocity (not wave)' },
        { name: 'Gravitational waves', icon: '⊕', desc: 'Ripples in spacetime from accelerating masses. First detected 2015 (LIGO).', examples: ['Black hole + neutron star mergers', 'Predicted by Einstein 1915'], speed: 'c (speed of light)' }
      ];

      var WAVE_QUANTITIES = [
        { sym: 'λ', name: 'Wavelength', units: 'm (meters)', def: 'Distance between two successive crests (or troughs). Crest-to-crest.' },
        { sym: 'f', name: 'Frequency', units: 'Hz (1/s)', def: 'Cycles per second. How many wave peaks pass a point per second.' },
        { sym: 'T', name: 'Period', units: 's (seconds)', def: 'Time for one complete cycle. T = 1/f.' },
        { sym: 'A', name: 'Amplitude', units: 'm (or whatever the wave displaces)', def: 'Maximum displacement from equilibrium. Carries energy; intensity ∝ A².' },
        { sym: 'v', name: 'Wave speed', units: 'm/s', def: 'How fast the wave moves through the medium. v = fλ.' },
        { sym: 'k', name: 'Wave number', units: '1/m (or rad/m)', def: 'k = 2π/λ. Spatial frequency. Useful in y = A·sin(kx − ωt).' },
        { sym: 'ω', name: 'Angular frequency', units: 'rad/s', def: 'ω = 2πf. Used in trigonometric wave equations.' },
        { sym: 'φ', name: 'Phase', units: 'rad (or degrees)', def: 'Position within a cycle. Two waves in phase: peaks align (constructive); out of phase by π: peaks meet troughs (destructive).' }
      ];

      var INTERFERENCE_PATTERNS = [
        { type: 'Constructive', icon: '+', condition: 'Δφ = 0, 2π, 4π... (path diff = mλ)', result: 'Amplitudes ADD. Bright fringe (light), loud point (sound), large displacement.' },
        { type: 'Destructive', icon: '−', condition: 'Δφ = π, 3π, 5π... (path diff = (m+½)λ)', result: 'Amplitudes CANCEL. Dark fringe, quiet point, no displacement.' },
        { type: 'Partial', icon: '~', condition: 'Other Δφ values', result: 'Partial reinforcement or cancellation. Wave appears with intermediate amplitude.' }
      ];

      var DOPPLER_CASES = [
        { case: 'Source moving toward you', effect: 'f observed > f emitted', detail: 'Wavefronts bunch up in front. Higher pitch (sound) / blueshift (light).' },
        { case: 'Source moving away', effect: 'f observed < f emitted', detail: 'Wavefronts spread out behind. Lower pitch / redshift.' },
        { case: 'Observer moving toward source', effect: 'f observed > f emitted', detail: 'You meet wavefronts faster. Higher apparent frequency.' },
        { case: 'Observer moving away', effect: 'f observed < f emitted', detail: 'Wavefronts catch up to you slower.' },
        { case: 'Both moving same direction, same speed', effect: 'No Doppler shift', detail: 'Relative velocity zero between source + observer.' },
        { case: 'Source at sound barrier (v_source ≥ v_sound)', effect: 'Sonic boom (Mach cone)', detail: 'Wavefronts stack on top of each other. Cone of compression follows the source.' }
      ];

      var EM_SPECTRUM = [
        { name: 'Radio', λ: '1 mm – 100 km', f: '3 Hz – 300 GHz', energy: 'Very low', uses: 'Broadcasting, communication, MRI' },
        { name: 'Microwave', λ: '1 mm – 1 m', f: '300 MHz – 300 GHz', energy: 'Low', uses: 'Cooking (water rotation), radar, WiFi, satellite' },
        { name: 'Infrared (IR)', λ: '700 nm – 1 mm', f: '300 GHz – 430 THz', energy: 'Low-mid', uses: 'Thermal imaging, TV remotes, fiber optics' },
        { name: 'Visible light', λ: '380 – 700 nm', f: '430 – 790 THz', energy: 'Mid', uses: 'Vision, photosynthesis, photography' },
        { name: 'Ultraviolet (UV)', λ: '10 – 380 nm', f: '790 THz – 30 PHz', energy: 'High', uses: 'Sterilization, fluorescence, Vit D synthesis' },
        { name: 'X-ray', λ: '0.01 – 10 nm', f: '30 PHz – 30 EHz', energy: 'Very high', uses: 'Medical imaging, crystallography, security scanners' },
        { name: 'Gamma ray', λ: '< 0.01 nm', f: '> 30 EHz', energy: 'Extreme', uses: 'Cancer treatment, sterilization, astronomy (most energetic photons)' }
      ];

      var VISIBLE_COLORS = [
        { color: 'Violet', λnm: '380–450', f: '670–790 THz', hex: '#7c3aed', notes: 'Highest-energy visible. Just below UV.' },
        { color: 'Blue', λnm: '450–485', f: '620–670 THz', hex: '#2563eb', notes: 'Sky color (Rayleigh scattering favors short λ).' },
        { color: 'Cyan', λnm: '485–500', f: '600–620 THz', hex: '#0891b2', notes: 'Bright in shallow water.' },
        { color: 'Green', λnm: '500–565', f: '530–600 THz', hex: '#16a34a', notes: 'Peak photopic eye sensitivity (~555 nm).' },
        { color: 'Yellow', λnm: '565–590', f: '510–530 THz', hex: '#eab308', notes: 'Sodium lamp emission (589 nm doublet).' },
        { color: 'Orange', λnm: '590–625', f: '480–510 THz', hex: '#ea580c', notes: 'Sunset enhances reds + oranges via scattering.' },
        { color: 'Red', λnm: '625–700', f: '430–480 THz', hex: '#dc2626', notes: 'Lowest-energy visible. Just above IR.' }
      ];

      var HARMONICS = [
        { mode: 'Fundamental (1st)', nodes: '2 (ends)', f: 'f₁', desc: 'Lowest mode. One antinode in the middle.' },
        { mode: '2nd harmonic', nodes: '3', f: '2 f₁', desc: 'One full wavelength fits in the string length.' },
        { mode: '3rd harmonic', nodes: '4', f: '3 f₁', desc: 'Three half-wavelengths fit. Common in plucked strings.' },
        { mode: '4th harmonic', nodes: '5', f: '4 f₁', desc: 'Even integer; less common in stringed instruments tuned to fundamental.' },
        { mode: 'nth harmonic', nodes: 'n+1', f: 'n f₁', desc: 'General formula. Higher harmonics give timbre / character to a note.' }
      ];

      var WAVE_FORMULAS = [
        { eq: 'v = f · λ', purpose: 'Wave speed from frequency + wavelength' },
        { eq: 'T = 1 / f', purpose: 'Period and frequency are reciprocals' },
        { eq: 'y(x,t) = A · sin(kx − ωt + φ)', purpose: 'Standard sinusoidal traveling wave' },
        { eq: 'k = 2π / λ', purpose: 'Wave number ↔ wavelength' },
        { eq: 'ω = 2π f', purpose: 'Angular frequency ↔ frequency' },
        { eq: 'Intensity ∝ A²', purpose: 'Energy/area carried by wave grows as square of amplitude' },
        { eq: 'n₁ sin θ₁ = n₂ sin θ₂', purpose: 'Snell\'s law — refraction at interface' },
        { eq: 'd sin θ = m λ', purpose: 'Diffraction grating maxima (m = order)' },
        { eq: 'f\' = f · (v + vₒ) / (v − vₛ)', purpose: 'Doppler shift (general; signs depend on directions)' },
        { eq: 'E = hf = hc / λ', purpose: 'Photon energy (h = Planck constant)' }
      ];

      var STANDING_WAVE_INSTRUMENTS = [
        { instrument: 'Guitar string', boundary: 'Both ends fixed', harmonics: 'All integers (1,2,3,4...)', formula: 'fₙ = n · v/(2L)', note: 'Pluck position selects which harmonics dominate. Near center → odd harmonics.' },
        { instrument: 'Open organ pipe', boundary: 'Both ends open (antinodes)', harmonics: 'All integers (1,2,3,4...)', formula: 'fₙ = n · v/(2L)', note: 'Same formula as string. Wave equation symmetric.' },
        { instrument: 'Closed organ pipe', boundary: 'One closed end', harmonics: 'Odd only (1,3,5,7...)', formula: 'fₙ = (2n−1) · v/(4L)', note: 'Only odd harmonics. Octave + 5th, not octave alone.' },
        { instrument: 'Drum head', boundary: 'Circular fixed edge', harmonics: 'Bessel function modes', formula: 'Complex 2D', note: 'Inharmonic — doesn\'t sound like a clear pitch. Tympani tuned to approximate one.' },
        { instrument: 'Marimba bar', boundary: 'Bar supported at nodes', harmonics: 'Tunable with bar shape', formula: 'Depends on cross-section', note: 'Undercut shapes the second partial to be a perfect octave above the fundamental.' }
      ];

      var SOUND_INTENSITY = [
        { db: 0, source: 'Threshold of hearing', notes: 'Reference: 10⁻¹² W/m²' },
        { db: 10, source: 'Breathing', notes: 'Quietest noticeable sound' },
        { db: 30, source: 'Whisper', notes: 'Library quiet' },
        { db: 60, source: 'Conversation', notes: 'Office background' },
        { db: 70, source: 'Vacuum cleaner', notes: 'Annoying at length' },
        { db: 85, source: 'Heavy traffic', notes: 'Hearing damage above this with extended exposure' },
        { db: 100, source: 'Motorcycle / blender', notes: 'Damage in 15 min' },
        { db: 110, source: 'Rock concert', notes: 'Damage in seconds to minutes' },
        { db: 120, source: 'Jet engine at 100 m', notes: 'Threshold of pain' },
        { db: 140, source: 'Gunshot at ear', notes: 'Instant damage' },
        { db: 194, source: 'Theoretical max in air', notes: 'Pressure variation = atmospheric pressure (can\'t go louder without becoming shock wave)' }
      ];

      var WAVE_GLOSSARY = [
        { term: 'Crest', def: 'Highest point of a transverse wave. Maximum positive displacement.' },
        { term: 'Trough', def: 'Lowest point of a transverse wave. Maximum negative displacement.' },
        { term: 'Compression', def: 'Region of high pressure in a longitudinal wave (sound).' },
        { term: 'Rarefaction', def: 'Region of low pressure in a longitudinal wave.' },
        { term: 'Node', def: 'Point of zero displacement on a standing wave.' },
        { term: 'Antinode', def: 'Point of maximum displacement on a standing wave.' },
        { term: 'Reflection', def: 'Wave bouncing off a boundary. Phase flips if going from less to more dense (hard boundary).' },
        { term: 'Refraction', def: 'Wave bending as it crosses a boundary where speed changes. Snell\'s law.' },
        { term: 'Diffraction', def: 'Wave bending around obstacles or through apertures. Effect strong when aperture ~ λ.' },
        { term: 'Interference', def: 'Two waves overlapping. Constructive (in phase) or destructive (out of phase).' },
        { term: 'Standing wave', def: 'Pattern from two identical waves traveling opposite directions. Nodes + antinodes fixed in space.' },
        { term: 'Resonance', def: 'Large amplitude when driving frequency matches natural frequency. Tacoma Narrows bridge collapse classic example (with caveats).' },
        { term: 'Damping', def: 'Loss of amplitude over time due to friction or radiation. Critical damping = fastest decay without overshoot.' },
        { term: 'Coherence', def: 'Constant phase relationship between waves. Required for stable interference patterns. Lasers are highly coherent.' },
        { term: 'Polarization', def: 'Direction of oscillation in a transverse wave. Light from sun is unpolarized; passing through a polarizer selects one direction.' },
        { term: 'Photon', def: 'Quantum of EM radiation. Energy E = hf. Each photon carries momentum p = h/λ.' }
      ];

      function expHeader() {
        return React.createElement('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-black text-cyan-900' }, '🌊 Wave Reference Library'),
            React.createElement('div', { className: 'text-[11px] text-cyan-700 mt-0.5' }, 'Interactive references — pick a topic below to explore.')
          ),
          expSection && React.createElement('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'px-3 py-1 rounded-md text-xs font-bold bg-white border border-cyan-300 text-cyan-700 hover:bg-cyan-100'
          }, '✕ Close section')
        );
      }

      function expTabBar() {
        // 45 wave/optics sections grouped into 7 cohesive domains. Renamed
        // duplicate id 'instruments' (was used for both Standing waves AND
        // Instrument freqs) — second now 'instrumentfreqs'. All other IDs
        // preserved. Groups: Wave Basics · Sound & Music · Light & Optics ·
        // EM Spectrum · Communications · Natural & Cosmic · Reference.
        var TAB_GROUPS = [
          { id: 'basics', label: 'Wave Basics', color: 'cyan', tabs: [
            { id: 'types', label: 'Wave types', icon: '🌊' },
            { id: 'quantities', label: 'Wave quantities', icon: '📐' },
            { id: 'formulas', label: 'Key formulas', icon: 'ƒ' },
            { id: 'units2', label: 'Wave units', icon: '∑' },
            { id: 'wavespeed', label: 'Wave speeds', icon: '⏱' },
            { id: 'speeds2', label: 'Detailed speeds', icon: '⏲' },
            { id: 'interference', label: 'Interference', icon: '+' },
            { id: 'diffraction', label: 'Diffraction', icon: '∿' },
            { id: 'polarization', label: 'Polarization', icon: '↕' },
            { id: 'doppler', label: 'Doppler effect', icon: '🚓' },
            { id: 'shockwaves', label: 'Shock waves', icon: '✈' },
            { id: 'standingHunt', label: 'Standing-wave hunt', icon: '🎯' },
            { id: 'discoverWave', label: 'Discover f·λ=v', icon: '🔬' }
          ] },
          { id: 'sound', label: 'Sound & Music', color: 'amber', tabs: [
            { id: 'harmonics', label: 'Harmonics', icon: '🎵' },
            { id: 'instruments', label: 'Standing waves', icon: '🎸' },
            { id: 'instrumentfreqs', label: 'Instrument freqs', icon: '🎻' },
            { id: 'music', label: 'Music + acoustics', icon: '🎼' },
            { id: 'decibels', label: 'Sound intensity', icon: '🔊' },
            { id: 'noise', label: 'Noise sources', icon: '📢' },
            { id: 'hearing', label: 'Hearing + ear', icon: '👂' },
            { id: 'recordings', label: 'Audio formats', icon: '🎧' }
          ] },
          { id: 'optics', label: 'Light & Optics', color: 'fuchsia', tabs: [
            { id: 'optics', label: 'Optics & lenses', icon: '🔍' },
            { id: 'refraction', label: 'Refraction index', icon: '↻' },
            { id: 'colors', label: 'Visible light', icon: '🌈' },
            { id: 'colors2', label: 'Color models', icon: '🎨' },
            { id: 'colorhex', label: 'Named colors', icon: '🖌' },
            { id: 'lasers', label: 'Lasers', icon: '⫸' },
            { id: 'cameras', label: 'Camera lenses', icon: '📷' },
            { id: 'optical_facts', label: 'Optical illusions', icon: '👁' }
          ] },
          { id: 'spectrum', label: 'EM Spectrum', color: 'violet', tabs: [
            { id: 'spectrum', label: 'EM spectrum', icon: '⚡' },
            { id: 'radio', label: 'Radio bands', icon: '📻' },
            { id: 'tvfreq', label: 'TV + screen', icon: '📺' },
            { id: 'quantum', label: 'Quantum waves', icon: '⚛' }
          ] },
          { id: 'comm', label: 'Communications', color: 'sky', tabs: [
            { id: 'antennas', label: 'Antennas', icon: '📶' },
            { id: 'radar', label: 'Radar/sonar', icon: '📡' },
            { id: 'protocols', label: 'Comm protocols', icon: '🛜' },
            { id: 'fibers', label: 'Fiber optics', icon: '〰' },
            { id: 'satellites', label: 'GPS + satellites', icon: '🛰' },
            { id: 'medical', label: 'Medical imaging', icon: '🏥' }
          ] },
          { id: 'natural', label: 'Natural & Cosmic', color: 'emerald', tabs: [
            { id: 'ocean', label: 'Ocean waves', icon: '🏄' },
            { id: 'seismic', label: 'Seismic waves', icon: '🌋' },
            { id: 'animals', label: 'Animal senses', icon: '🦇' },
            { id: 'stars', label: 'Stars + spectra', icon: '⭐' },
            { id: 'gravitational', label: 'Gravitational waves', icon: '⌇' }
          ] },
          { id: 'reference', label: 'Reference', color: 'slate', tabs: [
            { id: 'careers', label: 'Wave careers', icon: '💼' },
            { id: 'famous', label: 'History', icon: '🕰' },
            { id: 'glossary', label: 'Glossary', icon: '📖' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return React.createElement('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-' + accent + '-50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return React.createElement('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return React.createElement('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              React.createElement('span', { 'aria-hidden': 'true', className: 'text-[9px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              (g.tabs || []).map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderTypesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌊 Wave types'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Waves are categorized by particle motion relative to propagation, and by whether they need a medium. All carry energy but no matter from one place to another.'),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_TYPES.map(function(w, i) {
              return React.createElement('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl text-cyan-600' }, w.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, w.name),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800' }, w.speed)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, w.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Examples: ', w.examples.join(', '))
              );
            })
          )
        );
      }

      function renderQuantitiesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📐 Wave quantities'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'The full vocabulary needed to describe any wave. Most quantities are related — once you know two, you can derive the rest.'),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_QUANTITIES.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-lg font-black text-cyan-700 font-mono min-w-[24px]' }, q.sym),
                  React.createElement('span', { className: 'text-[12px] font-bold text-slate-800' }, q.name),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto' }, q.units)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, q.def)
              );
            })
          )
        );
      }

      function renderFormulasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'ƒ Key wave equations'),
          React.createElement('div', { className: 'space-y-1.5' },
            WAVE_FORMULAS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'flex items-baseline gap-3 p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-bold text-indigo-800 font-mono min-w-[200px]' }, f.eq),
                React.createElement('div', { className: 'text-[11px] text-slate-700' }, f.purpose)
              );
            })
          )
        );
      }

      function renderInterferenceSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '+ Interference + superposition'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'When two waves meet, their displacements add (principle of superposition). After passing through each other, each wave continues unchanged.'),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            INTERFERENCE_PATTERNS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-2xl font-black text-cyan-700' }, p.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, p.type),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, p.condition)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed' }, p.result)
              );
            })
          ),
          React.createElement('div', { className: 'p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, '💡 Beats: '), 'Two waves of slightly different frequency interfere alternately constructively + destructively. Beat frequency = |f₁ − f₂|. Musicians use this to tune by ear.'
          )
        );
      }

      function renderDopplerSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🚓 Doppler effect'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Frequency observed changes when source and/or observer move relative to each other. The ambulance siren that drops pitch as it passes you = sound Doppler. Galaxy redshift = light Doppler.'),
          React.createElement('div', { className: 'space-y-2' },
            DOPPLER_CASES.map(function(c, i) {
              return React.createElement('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, c.case),
                  React.createElement('span', { className: 'text-[11px] font-bold ml-auto px-2 py-0.5 rounded bg-cyan-100 text-cyan-800' }, c.effect)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, '📡 Applications'),
            React.createElement('div', { className: 'text-[11px] text-emerald-900 leading-relaxed' },
              '• Police radar: bounces microwaves off your car; Doppler shift = your speed. ',
              '• Doppler ultrasound: measures blood flow direction + speed. ',
              '• Hubble\'s discovery: distant galaxies are redshifted → universe expanding. ',
              '• Cosmic microwave background: small Doppler shifts reveal early-universe structure.'
            )
          )
        );
      }

      function renderSpectrumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electromagnetic spectrum'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'All EM waves travel at c in vacuum. The full spectrum spans 18+ orders of magnitude in frequency. We see only a narrow sliver (visible light). Energy per photon: E = hf — higher frequency = more energetic.'),
          React.createElement('div', { className: 'space-y-1.5' },
            EM_SPECTRUM.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800 min-w-[100px]' }, s.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 ml-auto' }, s.energy + ' energy')
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-0.5 font-mono' }, 'λ: ', s.λ, '  ·  f: ', s.f),
                React.createElement('div', { className: 'text-[11px] text-slate-700' }, 'Uses: ', s.uses)
              );
            })
          )
        );
      }

      function renderColorsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌈 Visible light spectrum'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Human vision spans ~380-700 nm. Each color corresponds to a specific range of wavelengths. White light = mix of all visible wavelengths.'),
          React.createElement('div', { className: 'grid gap-2' },
            VISIBLE_COLORS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-2.5 rounded-lg border border-slate-200 flex items-center gap-3', style: { background: c.hex + '15' } },
                React.createElement('div', { className: 'w-8 h-8 rounded shrink-0', style: { background: c.hex, border: '1px solid rgba(0,0,0,0.1)' } }),
                React.createElement('div', { className: 'flex-1' },
                  React.createElement('div', { className: 'text-[12px] font-black text-slate-800' }, c.color, React.createElement('span', { className: 'text-[10px] font-mono text-slate-500 ml-2' }, c.λnm, ' nm  ·  ', c.f)),
                  React.createElement('div', { className: 'text-[11px] text-slate-700 italic' }, c.notes)
                )
              );
            })
          )
        );
      }

      function renderHarmonicsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 Harmonics — modes of vibration'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'A vibrating string supports an infinite series of modes called harmonics. Each has a specific number of nodes (zero-amplitude points) + antinodes (max-amplitude points). The mix of harmonics = timbre.'),
          React.createElement('div', { className: 'space-y-1.5' },
            HARMONICS.map(function(h, i) {
              return React.createElement('div', { key: 'h'+i, className: 'flex items-baseline gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'min-w-[140px]' },
                  React.createElement('div', { className: 'text-[12px] font-black text-slate-800' }, h.mode),
                  React.createElement('div', { className: 'text-[10px] text-slate-500 font-mono' }, h.nodes + ' nodes · f = ' + h.f)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h.desc)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] text-purple-900' },
            React.createElement('strong', null, '💡 Why instruments sound different: '), 'A note at 440 Hz on a violin and a flute both have fundamental at 440 Hz. The MIX of higher harmonics (the spectrum) is different — that\'s timbre. Pure sine = boring; rich harmonic content = recognizable instrument.'
          )
        );
      }

      function renderInstrumentsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎸 Standing waves in instruments'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Instruments make tones by setting up standing waves. The boundary conditions (open/closed/fixed ends) determine which harmonics are allowed.'),
          React.createElement('div', { className: 'space-y-2' },
            STANDING_WAVE_INSTRUMENTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, s.instrument),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-purple-100 text-purple-800' }, s.harmonics)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, React.createElement('strong', null, 'Boundary: '), s.boundary),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded mb-1 inline-block' }, s.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.note)
              );
            })
          )
        );
      }

      function renderDecibelsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 Sound intensity (decibels)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Decibels are a logarithmic scale. +10 dB ≈ 10× intensity, perceived as ~2× as loud. dB SPL (sound pressure level) is referenced to threshold of human hearing.'),
          React.createElement('div', { className: 'space-y-1' },
            SOUND_INTENSITY.map(function(s, i) {
              var dangerLevel = s.db >= 120 ? 'red' : s.db >= 85 ? 'amber' : 'emerald';
              var colors = {
                red: 'bg-red-50 border-red-200 text-red-900',
                amber: 'bg-amber-50 border-amber-200 text-amber-900',
                emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900'
              };
              return React.createElement('div', { key: 's'+i, className: 'flex items-center gap-3 p-2 rounded-md border ' + colors[dangerLevel] },
                React.createElement('div', { className: 'text-base font-black font-mono min-w-[44px]' }, s.db + ' dB'),
                React.createElement('div', { className: 'text-[12px] font-bold min-w-[140px]' }, s.source),
                React.createElement('div', { className: 'text-[11px] italic flex-1' }, s.notes)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2.5 rounded-md bg-red-50 border border-red-300 text-[11px] text-red-900' },
            React.createElement('strong', null, '⚠ Permanent hearing loss: '), 'OSHA: 85 dB for 8 hours, 90 dB for 4 hours, etc. (each +5 dB halves safe exposure time). Wear ear protection at concerts, with power tools, at firing ranges.'
          )
        );
      }

      // ── Cycle 2 of the inquiry-learning study: Variable manipulation ──
      // Learner varies frequency + tension; period + wavelength + wave speed update live.
      // The widget asks discovery questions ("what stays constant?") before revealing the law.
      function renderDiscoverWaveSection() {
        var lab = d2.discoverWave || { freq: 4, tension: 50, observationsLogged: [], discovered: false };
        function setLab(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.wave) || {};
            var st = Object.assign({}, prior.discoverWave || lab, patch);
            return Object.assign({}, prev, { wave: Object.assign({}, prior, { discoverWave: st }) });
          });
        }
        // Physics: standing wave on a string, v = sqrt(T/μ), with μ fixed at 0.01 kg/m for simplicity.
        // wavelength = v/freq. Period = 1/freq. Both update live as f or T change.
        var MU = 0.01;
        var v = Math.sqrt(lab.tension / MU);
        var period = 1 / lab.freq;
        var wavelength = v / lab.freq;
        var f_lambda = lab.freq * wavelength;
        // SVG snapshot of the standing wave — amplitude 1, length 2 metres for visual
        var stringLength = 2.0;
        var nodes = Math.max(1, Math.round((2 * stringLength) / wavelength)); // half-wavelengths along string
        var pts = [];
        var samples = 60;
        for (var i = 0; i <= samples; i++) {
          var x = i / samples;
          var phase = x * nodes * Math.PI; // standing wave snapshot
          var y = Math.sin(phase);
          pts.push([10 + x * 240, 50 - y * 30]);
        }
        var pathStr = 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
        // Animated phase using time for visual interest (gentle wobble at user freq)
        var anim = 'animate-pulse'; // CSS-only; full animation handled by canvas tools elsewhere

        function logObservation() {
          var obs = { f: lab.freq, T: lab.tension, lambda: parseFloat(wavelength.toFixed(3)), v: parseFloat(v.toFixed(2)) };
          var newObs = (lab.observationsLogged || []).concat([obs]).slice(-6);
          setLab({ observationsLogged: newObs });
        }
        function reveal() { setLab({ discovered: true }); }
        function reset() { setLab({ freq: 4, tension: 50, observationsLogged: [], discovered: false }); }

        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🔬 Discover the wave equation'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            'A string is fixed at both ends. Wiggle the controls. Watch what changes and what stays the same. Log a few observations, then try to spot the pattern. Hit "I see it" when you think you have the law — no peeking.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            // Left: live SVG visualization
            h('div', { className: 'p-3 rounded-lg bg-slate-900 border border-slate-700' },
              h('svg', { viewBox: '0 0 260 100', width: '100%', style: { height: 'auto' }, 'aria-label': 'Standing wave on a string' },
                h('line', { x1: 10, y1: 50, x2: 250, y2: 50, stroke: '#475569', strokeDasharray: '2,2', strokeWidth: 1 }),
                h('path', { d: pathStr, fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, opacity: 0.95 }),
                h('circle', { cx: 10, cy: 50, r: 4, fill: '#fbbf24' }),
                h('circle', { cx: 250, cy: 50, r: 4, fill: '#fbbf24' }),
                h('text', { x: 130, y: 92, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'Length L = 2.0 m (fixed)')
              ),
              h('div', { className: 'mt-2 grid grid-cols-2 gap-2 text-[11px]' },
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, 'Period T'),
                  h('div', { className: 'font-mono font-bold text-base' }, period.toFixed(3) + ' s')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, 'Wavelength λ'),
                  h('div', { className: 'font-mono font-bold text-base' }, wavelength.toFixed(3) + ' m')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-amber-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, 'Wave speed v'),
                  h('div', { className: 'font-mono font-bold text-base' }, v.toFixed(2) + ' m/s')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-violet-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, 'f × λ'),
                  h('div', { className: 'font-mono font-bold text-base' }, f_lambda.toFixed(2))
                )
              )
            ),
            // Right: controls + observation log
            h('div', { className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('label', { htmlFor: 'discFreq', className: 'block text-[11px] font-bold text-slate-700' }, 'Frequency f: ' + lab.freq.toFixed(2) + ' Hz'),
              h('input', { id: 'discFreq', type: 'range', min: 1, max: 20, step: 0.5, value: lab.freq, onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); }, className: 'w-full', 'aria-label': 'Frequency in hertz' }),
              h('label', { htmlFor: 'discTen', className: 'block text-[11px] font-bold text-slate-700 mt-2' }, 'String tension T: ' + lab.tension + ' N'),
              h('input', { id: 'discTen', type: 'range', min: 10, max: 200, step: 5, value: lab.tension, onChange: function(e) { setLab({ tension: parseInt(e.target.value, 10) }); }, className: 'w-full', 'aria-label': 'Tension in newtons' }),
              h('p', { className: 'text-[10px] text-slate-500 italic mt-1' }, '(string mass density μ fixed at 0.01 kg/m)'),
              h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
                h('button', { onClick: logObservation, className: 'px-2 py-1 rounded text-[11px] font-bold bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none' }, '📝 Log observation'),
                h('button', { onClick: reveal, disabled: lab.discovered, className: 'px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none' }, lab.discovered ? '✓ Revealed' : '💡 I see it'),
                h('button', { onClick: reset, className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-2 focus:ring-slate-400 focus:outline-none' }, '↻ Reset')
              ),
              (lab.observationsLogged || []).length > 0 && h('div', { className: 'mt-2' },
                h('div', { className: 'text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, 'Your observations'),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'text-[10px] border-collapse w-full' },
                    h('thead', null, h('tr', { className: 'bg-slate-200' },
                      ['f (Hz)', 'T (N)', 'λ (m)', 'v (m/s)', 'f·λ'].map(function(c) { return h('th', { key: c, className: 'px-1 py-0.5 text-left' }, c); })
                    )),
                    h('tbody', null,
                      lab.observationsLogged.map(function(o, i) {
                        return h('tr', { key: i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.f.toFixed(1)),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.T),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.lambda),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.v),
                          h('td', { className: 'px-1 py-0.5 font-mono font-bold text-cyan-700' }, (o.f * o.lambda).toFixed(2))
                        );
                      })
                    )
                  )
                )
              )
            )
          ),
          // Discovery prompt — appears regardless, escalates as observations + reveal happen
          (lab.observationsLogged || []).length >= 2 && !lab.discovered && h('div', { className: 'mt-3 p-2 rounded bg-amber-50 border-l-4 border-l-amber-400 text-[12px] text-amber-900' },
            h('strong', null, '🔍 Hypothesis time: '), 'Compare your f × λ column. Is it constant for different f values at the same tension? What about when you change tension? Form a hypothesis before clicking "I see it".'),
          lab.discovered && h('div', { className: 'mt-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-l-emerald-500' },
            h('div', { className: 'font-black text-emerald-900 mb-1' }, '✨ The wave equation: v = f · λ'),
            h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' },
              'For a wave on a string, the speed v depends ONLY on the string\'s tension and mass density (v = √(T/μ)). The product f·λ always equals v. Change frequency → wavelength compensates so f·λ stays constant. Increase tension → wave speed jumps → f·λ jumps with it. Frequency × wavelength is one of the deepest constancies in physics: it shows up identically for light, sound, water waves, and quantum matter waves.'),
            h('p', { className: 'text-[11px] text-emerald-700 mt-1 italic' }, 'You just discovered it the way Hertz did — by watching what stays constant when you change one variable at a time.')
          )
        );
      }

      // === Cycle-9 open-ended manipulation widget ===
      // Design principles (per Cycle-8 instrument validation): no chip pool, no scoring,
      // no reveal button, no answer dump. Just continuous sliders, live physics, free-text
      // hypothesis input, observable paradox (harmonics-only stability), opt-in OPEN questions.
      function renderStandingHuntSection() {
        var h = React.createElement;
        var lab = d2.standingHunt || { tension: 50, freq: 4, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', observationsLogged: [], visitCount: 0 };
        function setLab(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.wave) || {};
            var st = Object.assign({}, prior.standingHunt || lab, patch);
            return Object.assign({}, prev, { wave: Object.assign({}, prior, { standingHunt: st }) });
          });
        }
        var MU = 0.01;          // string mass density kg/m (fixed)
        var L = 2.0;            // string length m (fixed)
        var v = Math.sqrt(lab.tension / MU);
        var wavelength = v / lab.freq;
        // For a string fixed at both ends, resonant harmonics: f_n = n * v / (2L)
        // The CURRENT (T, f) gives an effective harmonic number n = f * 2L / v
        var nEff = lab.freq * 2 * L / v;
        var nNear = Math.round(nEff);
        var nDist = Math.abs(nEff - nNear);
        var isHarmonic = nDist < 0.05 && nNear >= 1; // a resonance lock
        // SVG: when off-harmonic, animation looks "fuzzy" because superposition of incoming/reflected waves doesn't reinforce
        var samples = 80;
        var amp = isHarmonic ? 30 : 30 * Math.max(0.15, 1 - nDist * 2); // off-harmonic = visible chaos
        var pts = [];
        for (var i = 0; i <= samples; i++) {
          var x = i / samples;
          // Forward wave + reflected wave snapshot at t=0
          var y1 = Math.sin(2 * Math.PI * x * nEff);
          var y2 = Math.sin(2 * Math.PI * (1 - x) * nEff + (isHarmonic ? Math.PI : Math.PI * (1 + 0.3 * nDist)));
          var y = (y1 + y2) / 2;
          pts.push([20 + x * 280, 80 - y * amp]);
        }
        var pathStr = 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
        // Mark node positions (where y is always zero) — only meaningful at resonance
        var nodeXs = [];
        if (isHarmonic && nNear >= 1) {
          for (var k = 0; k <= nNear; k++) nodeXs.push(20 + (k / nNear) * 280);
        }
        function logObservation() {
          var obs = { T: lab.tension, f: parseFloat(lab.freq.toFixed(2)), v: parseFloat(v.toFixed(1)), lambda: parseFloat(wavelength.toFixed(3)), n: parseFloat(nEff.toFixed(2)), locked: isHarmonic };
          setLab({ observationsLogged: (lab.observationsLogged || []).concat([obs]).slice(-8) });
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🎯 Standing-wave hunt'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            'A string fixed at both ends. You control the tension and the driving frequency. There is no "right answer" — and no answer dump. Sweep the sliders. Look for the rare frequencies where the string locks into a clean standing pattern. Type what you discover in your own words.'),
          // Live SVG
          h('div', { className: 'mb-2 rounded border border-slate-200 bg-slate-50 p-2' },
            h('svg', { viewBox: '0 0 320 120', className: 'w-full h-32' },
              // String fixation posts
              h('rect', { x: 18, y: 70, width: 4, height: 30, fill: '#475569' }),
              h('rect', { x: 298, y: 70, width: 4, height: 30, fill: '#475569' }),
              h('path', { d: pathStr, stroke: isHarmonic ? '#059669' : '#94a3b8', strokeWidth: isHarmonic ? 2.5 : 1.5, fill: 'none' }),
              // Node markers — only show when locked into resonance
              nodeXs.map(function(nx, i) {
                return h('circle', { key: 'n' + i, cx: nx, cy: 80, r: 3.5, fill: '#16a34a' });
              }),
              h('text', { x: 160, y: 18, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: isHarmonic ? '#059669' : '#64748b' },
                isHarmonic ? ('✓ Standing pattern — n = ' + nNear + ' (' + nNear + ' half-wavelengths)') : 'Off-resonance — pattern unstable'),
              h('text', { x: 160, y: 112, textAnchor: 'middle', fontSize: 9, fill: '#475569' },
                'T = ' + lab.tension.toFixed(0) + ' N  |  f = ' + lab.freq.toFixed(2) + ' Hz  |  v = ' + v.toFixed(1) + ' m/s  |  λ = ' + wavelength.toFixed(2) + ' m  |  n = ' + nEff.toFixed(2))
            )
          ),
          // Sliders — continuous manipulation, no chip pool
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
            h('div', null,
              h('label', { htmlFor: 'sh-tension', className: 'block text-[11px] font-bold text-slate-700 mb-1' },
                'Tension: ', h('span', { className: 'font-mono text-indigo-700' }, lab.tension.toFixed(0) + ' N')),
              h('input', {
                id: 'sh-tension', type: 'range', min: 10, max: 200, step: 1, value: lab.tension,
                onChange: function(e) { setLab({ tension: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': 'Tension in newtons'
              }),
              h('div', { className: 'text-[9px] text-slate-500 flex justify-between' },
                h('span', null, '10 N'), h('span', null, '200 N'))
            ),
            h('div', null,
              h('label', { htmlFor: 'sh-freq', className: 'block text-[11px] font-bold text-slate-700 mb-1' },
                'Frequency: ', h('span', { className: 'font-mono text-indigo-700' }, lab.freq.toFixed(2) + ' Hz')),
              h('input', {
                id: 'sh-freq', type: 'range', min: 1, max: 30, step: 0.05, value: lab.freq,
                onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': 'Driving frequency in hertz'
              }),
              h('div', { className: 'text-[9px] text-slate-500 flex justify-between' },
                h('span', null, '1 Hz'), h('span', null, '30 Hz'))
            )
          ),
          // Log observation button (optional record-keeping; no scoring)
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-3' },
            h('button', {
              onClick: logObservation,
              className: 'px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 border border-slate-300'
            }, '📋 Log this observation'),
            h('button', {
              onClick: function() { setLab({ tension: 50, freq: 4, observationsLogged: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
              className: 'px-2 py-1 rounded bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 border border-slate-300'
            }, '↺ Reset'),
            (lab.observationsLogged || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (lab.observationsLogged || []).length + ' observation(s) logged')
          ),
          // Observation log (auto-tabulated; no commentary required)
          (lab.observationsLogged || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto' },
            h('table', { className: 'text-[10px] w-full border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100 text-slate-700' },
                  ['T (N)', 'f (Hz)', 'v (m/s)', 'λ (m)', 'n', 'locked'].map(function(h2, i) {
                    return h('th', { key: 'h' + i, className: 'px-2 py-1 border border-slate-200 text-left' }, h2);
                  })
                )
              ),
              h('tbody', null,
                lab.observationsLogged.map(function(o, idx) {
                  return h('tr', { key: 'r' + idx, className: o.locked ? 'bg-emerald-50' : '' },
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.T),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.f),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.v),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.lambda),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.n),
                    h('td', { className: 'px-2 py-1 border border-slate-200' }, o.locked ? '✓' : '—')
                  );
                })
              )
            )
          ),
          // Hypothesis textarea — learner-typed, free-form
          h('div', { className: 'mb-3' },
            h('label', { htmlFor: 'sh-hypo', className: 'block text-[11px] font-bold text-slate-700 mb-1' },
              'Your hypothesis (free text — no right answer):'),
            h('textarea', {
              id: 'sh-hypo',
              value: lab.hypothesis || '',
              onChange: function(e) { setLab({ hypothesis: e.target.value }); },
              placeholder: 'What pattern do you notice in the values where the string locks into a clean standing wave? Type your own theory.',
              className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug',
              rows: 3
            })
          ),
          // OPT-IN open questions — only when learner clicks "I'm stuck". No answers given.
          h('div', { className: 'mb-3' },
            !lab.stuckRevealed && h('button', {
              onClick: function() { setLab({ stuckRevealed: true }); },
              className: 'px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-800 border border-amber-300'
            }, '🤔 I\'m stuck — show me some questions to think about (no answers)'),
            lab.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
              h('div', { className: 'font-bold text-amber-900 mb-1' }, 'Open questions (no answers — investigate by manipulating):'),
              h('ul', { className: 'list-disc pl-5 space-y-1' },
                h('li', null, 'Try f = 5 Hz at T = 100 N, then T = 25 N. Does the locked state happen at the same f? Why might that be?'),
                h('li', null, 'Sweep frequency slowly from 1 → 20 Hz at fixed T. How many locked states do you find? Are they evenly spaced or pattern-spaced?'),
                h('li', null, 'When you triple the tension, does the f of the first locked state triple, or change by some other factor? Predict before you check.'),
                h('li', null, 'Log 4-5 locked observations. Look at the n column — what value do they share? Is that a coincidence or a constraint?'),
                h('li', null, 'What relationship between f, T, and L would have to be true for an integer number of half-wavelengths to fit on the string?')
              ),
              h('div', { className: 'text-[10px] italic text-amber-700 mt-2' }, 'No answers will be revealed here. The point is to push your thinking, not to hand you a result.')
            )
          ),
          // "I see it now" self-mark + explanation textarea — no automated scoring
          h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('input', {
                type: 'checkbox', id: 'sh-understood',
                checked: !!lab.understood,
                onChange: function(e) { setLab({ understood: e.target.checked }); },
                className: 'w-4 h-4'
              }),
              h('label', { htmlFor: 'sh-understood', className: 'text-[12px] font-bold text-emerald-900 cursor-pointer' },
                'I think I understand the pattern now — let me explain it in my own words')
            ),
            lab.understood && h('textarea', {
              value: lab.explanation || '',
              onChange: function(e) { setLab({ explanation: e.target.value }); },
              placeholder: 'Explain in your own words: what determines when a standing wave forms? What role does tension play? What role does frequency play? What is "n"?',
              className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug bg-white',
              rows: 4
            }),
            lab.understood && (lab.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[10px] italic text-emerald-700' },
              '✓ Saved. Notice — nobody checked your answer. The point of inquiry is the thinking that produced it, not external validation.')
          ),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600 italic' },
            'Design note: this widget has no score, no chips, no reveal button, and no right-answer check. Everything you discover comes from manipulation and observation. That is what "inquiry" looks like when the answer-dump is removed.')
        );
      }

      function renderGlossarySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 Wave glossary'),
          React.createElement('div', { className: 'space-y-1' },
            WAVE_GLOSSARY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900' }, g.term),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — More wave reference (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var OPTICS_ELEMENTS = [
        { name: 'Converging (convex) lens', behavior: 'Bends parallel rays toward focal point', use: 'Magnifying glass, eyeglasses for farsightedness, camera lenses, microscope objectives.' },
        { name: 'Diverging (concave) lens', behavior: 'Spreads parallel rays as if from focal point', use: 'Eyeglasses for nearsightedness, peephole viewers.' },
        { name: 'Concave (converging) mirror', behavior: 'Reflects parallel rays through focal point', use: 'Reflecting telescopes, satellite dishes, makeup mirrors (magnification).' },
        { name: 'Convex (diverging) mirror', behavior: 'Reflects parallel rays as if from focal point', use: 'Car side mirrors ("objects in mirror are closer than they appear"), store security mirrors.' },
        { name: 'Plane mirror', behavior: 'Flat reflection — image distance = object distance', use: 'Everyday mirrors. Image is virtual, upright, same-size, laterally inverted.' },
        { name: 'Prism (triangular)', behavior: 'Separates white light into spectrum by refraction', use: 'Spectroscopy, rainbow demos. Different wavelengths refract by different amounts (dispersion).' },
        { name: 'Diffraction grating', behavior: 'Separates light by many parallel slits', use: 'Higher resolution than prism. Used in modern spectrometers.' },
        { name: 'Beam splitter', behavior: 'Transmits part of beam, reflects rest', use: 'Interferometers, LIGO, projectors, optical instruments.' },
        { name: 'Polarizing filter', behavior: 'Transmits only one polarization direction', use: 'Sunglasses (cut glare from water/road), LCD displays, photography filters.' },
        { name: 'Optical fiber', behavior: 'Total internal reflection guides light along the core', use: 'Internet backbone, endoscopes, fiber-optic Christmas trees.' },
        { name: 'Half-silvered mirror', behavior: '~50% transmitted, ~50% reflected', use: 'One-way windows (only works with brightness asymmetry), Michelson interferometer.' },
        { name: 'Retroreflector (corner cube)', behavior: 'Returns light to source regardless of angle', use: 'Bike reflectors, road signs, Apollo lunar laser ranging.' }
      ];

      var REFRACTION_INDICES = [
        { material: 'Vacuum', n: '1.0000 (defined)', notes: 'Reference. Light travels at c = 299,792,458 m/s.' },
        { material: 'Air (STP)', n: '1.0003', notes: 'Essentially same as vacuum for most purposes.' },
        { material: 'Water (20°C)', n: '1.333', notes: 'Bends light noticeably. Critical angle (water→air) ≈ 48.6°.' },
        { material: 'Ethanol', n: '1.361', notes: 'Slightly more refractive than water.' },
        { material: 'Glycerin', n: '1.473', notes: 'Submerged glass nearly invisible in glycerin (similar n).' },
        { material: 'Quartz', n: '1.544', notes: 'Common in optics. Some birefringence.' },
        { material: 'Crown glass', n: '1.52', notes: 'Standard eyeglass + lens material.' },
        { material: 'Flint glass', n: '1.65', notes: 'Higher dispersion than crown — used in achromatic doublets.' },
        { material: 'Sapphire', n: '1.77', notes: 'Watch crystals, smartphone camera lenses.' },
        { material: 'Cubic zirconia', n: '2.16', notes: 'Higher than glass — used as diamond simulant.' },
        { material: 'Diamond', n: '2.42', notes: 'Very high. Critical angle just 24.4° → "fire" via total internal reflection.' },
        { material: 'Silicon (visible)', n: '~3.5', notes: 'Opaque to visible but transparent in IR. Used in IR optics.' },
        { material: 'Negative-index metamaterials', n: '< 0 (engineered)', notes: 'Engineered structures bend light backward. Cloaking research.' }
      ];

      var DIFFRACTION_FACTS = [
        { fact: 'Single-slit diffraction', formula: 'a·sin θ = m·λ (dark fringes)', notes: 'a = slit width. Central bright fringe is twice as wide as side fringes.' },
        { fact: 'Double-slit interference', formula: 'd·sin θ = m·λ (bright fringes)', notes: 'd = slit separation. Demonstrates wave nature of light (Young, 1801).' },
        { fact: 'Diffraction grating', formula: 'd·sin θ = m·λ', notes: 'Many slits, very sharp peaks. Resolution improves with more slits.' },
        { fact: 'Rayleigh criterion', formula: 'θ_min ≈ 1.22 λ / D', notes: 'Smallest angle resolvable by circular aperture of diameter D. Limits telescope/microscope resolution.' },
        { fact: 'Bragg\'s law (X-ray crystallography)', formula: '2d·sin θ = n·λ', notes: 'X-rays diffract from crystal planes. Used to determine atomic positions.' },
        { fact: 'Diffraction-limited spot size', formula: '≈ λ/(2·NA)', notes: 'NA = numerical aperture. Visible light limit ~200 nm — why electron microscopes have higher resolution.' }
      ];

      var POLARIZATION_NOTES = [
        { topic: 'What it is', detail: 'Direction of oscillation of the electric field in EM waves. Sound (longitudinal) cannot be polarized.' },
        { topic: 'Linear polarization', detail: 'E-field oscillates in single plane. Most "polarized" light is linear.' },
        { topic: 'Circular polarization', detail: 'E-field rotates in circle. Right vs left circular. Used in 3D movies.' },
        { topic: 'Malus\'s law', detail: 'I = I₀·cos²θ. Light through two polarizers: angle between them controls intensity.' },
        { topic: 'Brewster\'s angle', detail: 'tan θ_B = n₂/n₁. Reflected light is fully polarized at this angle of incidence.' },
        { topic: 'Birefringence', detail: 'Some crystals (calcite, quartz) split unpolarized light into two polarized rays.' },
        { topic: 'Real-world: glare', detail: 'Reflection off horizontal surfaces (water, road) polarizes horizontally. Polarized sunglasses block this.' },
        { topic: 'Real-world: LCDs', detail: 'Two crossed polarizers + liquid crystals → controllable transmission per pixel.' },
        { topic: 'Real-world: stress analysis', detail: 'Polarized light through plastic models shows stress patterns as color bands.' },
        { topic: 'Real-world: 3D movies', detail: 'Circular polarization (RealD) or linear at 45°/135° (older systems) separates left/right images.' }
      ];

      var QUANTUM_WAVES = [
        { topic: 'de Broglie wavelength', detail: 'λ = h/p. Every massive particle has a wave nature. For an electron at 100 eV, λ ≈ 0.12 nm.' },
        { topic: 'Wave-particle duality', detail: 'Photons + electrons show both wave + particle behavior. Single-photon double-slit experiments confirm interference even with one photon at a time.' },
        { topic: 'Schrödinger equation', detail: 'Wave equation for matter waves. Solutions ψ give probability amplitude. |ψ|² = probability density.' },
        { topic: 'Heisenberg uncertainty', detail: 'Δx · Δp ≥ ℏ/2. Position + momentum can\'t both be measured precisely. Fundamental, not measurement error.' },
        { topic: 'Quantized energy', detail: 'Bound systems (atoms, harmonic oscillators) only allow specific energy levels. Like standing waves on a string.' },
        { topic: 'Tunneling', detail: 'Wave nature lets particles "tunnel" through energy barriers classically forbidden. Basis of STM, alpha decay, flash memory.' },
        { topic: 'Photon energy', detail: 'E = hf = hc/λ. Higher frequency → higher-energy photon. UV photons can ionize; IR cannot.' },
        { topic: 'Compton scattering', detail: 'Photon-electron collision shifts photon wavelength. Confirms photons carry momentum p = h/λ.' },
        { topic: 'Pauli exclusion', detail: 'Identical fermions cannot occupy same quantum state. Why electrons fill shells; why matter has structure.' },
        { topic: 'Coherence length', detail: 'Distance over which wave maintains phase. Laser: kilometers. Sunlight: micrometers. Needed for interference.' }
      ];

      var SEISMIC_WAVES = [
        { name: 'P-wave (primary)', type: 'Body wave / longitudinal', speed: '~5–8 km/s in crust', notes: 'Fastest. Compression/rarefaction along travel direction. Travels through solids AND liquids — passes through Earth\'s outer core.' },
        { name: 'S-wave (secondary/shear)', type: 'Body wave / transverse', speed: '~3–4.5 km/s in crust', notes: 'Slower than P. Side-to-side shaking. Cannot travel through liquids → outer core blocks S-waves (key evidence it\'s liquid).' },
        { name: 'Love wave', type: 'Surface wave', speed: '~3–4.5 km/s', notes: 'Horizontal transverse motion at surface. More damaging to buildings than P/S.' },
        { name: 'Rayleigh wave', type: 'Surface wave', speed: '~2–4 km/s', notes: 'Rolling motion (like ocean waves). Largest amplitude. Felt as the rolling shake of an earthquake.' }
      ];

      var SEISMIC_FACTS = [
        { fact: 'Richter magnitude', detail: 'Logarithmic. Each +1 magnitude = ~10× amplitude, ~32× energy. M7 releases ~1000× energy of M5.' },
        { fact: 'Moment magnitude (Mw)', detail: 'Used for modern measurements, especially large quakes. Replaced Richter for M > ~6.5.' },
        { fact: 'Mercalli intensity', detail: 'Felt-effects scale (I-XII). What people experienced, not energy released. Same quake = different intensity at different distances.' },
        { fact: 'Locating an epicenter', detail: '3 stations measure P-S arrival-time difference → distance to each → triangulate epicenter.' },
        { fact: 'Earth\'s structure (from seismology)', detail: 'P/S wave behavior revealed liquid outer core, solid inner core, mantle, crust. Discontinuities mapped.' },
        { fact: 'Tsunami warning', detail: 'Underwater quake → ocean displacement → long-wavelength wave traveling ~700 km/h in deep water. P-wave arrival gives ~minutes warning before tsunami.' },
        { fact: 'Largest recorded', detail: 'Chile 1960: M9.5 (~32× energy of biggest US quake — 1964 Alaska M9.2). Tsunami crossed Pacific.' }
      ];

      var OCEAN_WAVES = [
        { type: 'Wind wave (sea)', period: '< 10 s', wavelength: '~10–100 m', notes: 'Local wind generated. Variable height + direction.' },
        { type: 'Swell', period: '10–30 s', wavelength: '~100–800 m', notes: 'Wind waves that have traveled far. Sorted into regular sets.' },
        { type: 'Tsunami', period: '~10 min – 2 hr', wavelength: '~100–500 km', notes: 'Tiny height in deep ocean (<1 m) but VERY long wavelength. Pile up at shore.' },
        { type: 'Tide', period: '~12 h or 24 h', wavelength: 'half Earth\'s circumference', notes: 'Gravitational pull of Moon + Sun. Bulges in ocean rotate as Earth turns.' },
        { type: 'Seiche', period: 'min to hours', wavelength: 'enclosed basin', notes: 'Standing wave in enclosed/semi-enclosed water (lakes, harbors). Triggered by wind, pressure, quakes.' },
        { type: 'Rogue wave', period: 'irregular', wavelength: 'irregular', notes: 'Unusually large (>2× average). Once thought myth, now confirmed; constructive interference of swells.' }
      ];

      var OCEAN_FACTS = [
        { fact: 'Deep water', detail: 'Depth > λ/2. Wave speed depends only on λ: v = √(gλ/2π).' },
        { fact: 'Shallow water', detail: 'Depth < λ/20. Wave speed depends only on depth: v = √(gd). Tsunamis are always shallow-water waves (huge λ).' },
        { fact: 'Wave breaking', detail: 'Waves break when amplitude/wavelength > ~1/7. Crest moves faster than trough → tips over.' },
        { fact: 'Significant wave height', detail: 'Average height of tallest 1/3 of waves — better matches what a sailor would call "the wave height".' },
        { fact: 'Spring vs neap tides', detail: 'Spring (extreme): Sun + Moon aligned (new/full moon). Neap (mild): Sun + Moon at 90° (quarter moons).' }
      ];

      var ANTENNA_TYPES = [
        { type: 'Dipole', size: '~λ/2', use: 'Simplest resonant antenna. FM radio dipole is ~1.5 m.' },
        { type: 'Yagi-Uda', size: 'multi-element', use: 'Directional. Old rooftop TV antennas, ham radio.' },
        { type: 'Parabolic dish', size: '> 10λ for efficient gain', use: 'Satellite TV, radio astronomy, deep-space comm.' },
        { type: 'Patch (microstrip)', size: '~λ/2', use: 'GPS, Wi-Fi, phones. Flat, easy to mass-manufacture.' },
        { type: 'Helical', size: '~λ circumference per turn', use: 'Circularly polarized. Satellite uplinks.' },
        { type: 'Loop', size: 'fraction of λ', use: 'AM radio receivers, RFID tags.' },
        { type: 'Horn', size: '~few λ', use: 'Radar feeds, microwave links. Broadband.' },
        { type: 'Phased array', size: 'matrix of elements', use: 'Steer beam electronically. Modern radar, 5G mmWave, Starlink user terminals.' }
      ];

      var RADAR_SONAR = [
        { system: 'Primary radar', use: 'Aircraft detection. Pulse sent → echo measured. Range = c·Δt/2.' },
        { system: 'Doppler radar', use: 'Weather (rain motion → wind), police speed guns. Frequency shift → velocity.' },
        { system: 'Synthetic aperture radar (SAR)', use: 'Moving platform creates effective large aperture. Earth imaging from satellites; works through clouds + at night.' },
        { system: 'Phased array radar', use: 'Steerable beam without moving the dish. AEGIS, modern fighters.' },
        { system: 'Active sonar', use: 'Send pulse, listen for echo. Submarine detection, fish-finding. Limited range due to sound absorption.' },
        { system: 'Passive sonar', use: 'Listen for sounds from targets. Submarines use this when avoiding detection (no emissions).' },
        { system: 'Echolocation (biological)', use: 'Bats, dolphins. Frequencies up to ~200 kHz (bats); chirps adapted for prey.' },
        { system: 'Ultrasound (medical)', use: '1–20 MHz pulses image internal tissues. Doppler mode shows blood flow.' },
        { system: 'LIDAR', use: 'Laser pulses → 3D point clouds. Self-driving cars, archaeology (forest-floor mapping).' }
      ];

      var SHOCKWAVE_FACTS = [
        { fact: 'Mach number', detail: 'M = v/v_sound. M<1 subsonic, M=1 transonic, M>1 supersonic, M>5 hypersonic.' },
        { fact: 'Sonic boom', detail: 'Cone of compressed air trailing supersonic objects. Heard as boom when cone passes you.' },
        { fact: 'Mach cone angle', detail: 'sin α = 1/M. Faster object → narrower cone.' },
        { fact: 'Shock wave thickness', detail: 'Just a few mean free paths (~micrometers in atmosphere). Steep pressure jump.' },
        { fact: 'Sound of speed (air, 20°C)', detail: '343 m/s = 1235 km/h = 767 mph. Increases with temperature: v ≈ 331 + 0.6·T(°C) m/s.' },
        { fact: 'Other media', detail: 'Water: ~1480 m/s. Steel: ~5000 m/s. Hotter, denser, stiffer → faster sound.' },
        { fact: 'Bullwhip crack', detail: 'Tip of whip exceeds Mach 1 → mini sonic boom.' },
        { fact: 'Explosion shock wave', detail: 'Initial pressure jump (overpressure) travels faster than sound, slowing to sound speed with distance.' }
      ];

      var WAVE_HISTORY = [
        { year: '1665', who: 'Robert Hooke', what: 'First observed diffraction.' },
        { year: '1690', who: 'Christiaan Huygens', what: 'Wave theory of light. Huygens\' principle (every point on wavefront is source of secondary wavelets).' },
        { year: '1801', who: 'Thomas Young', what: 'Double-slit experiment. Established wave nature of light through interference.' },
        { year: '1818', who: 'Augustin Fresnel', what: 'Mathematical theory of diffraction. Predicted (correctly) the "Poisson spot" — bright dot in center of circular shadow.' },
        { year: '1842', who: 'Christian Doppler', what: 'Doppler effect for sound and light.' },
        { year: '1864', who: 'James Clerk Maxwell', what: 'Maxwell\'s equations — light is electromagnetic wave. Predicted speed = c.' },
        { year: '1887', who: 'Heinrich Hertz', what: 'Produced + detected radio waves in lab. Confirmed Maxwell\'s prediction.' },
        { year: '1900', who: 'Max Planck', what: 'E = hf — energy is quantized. Birth of quantum theory.' },
        { year: '1905', who: 'Albert Einstein', what: 'Photoelectric effect — light comes in quanta (photons). Nobel 1921.' },
        { year: '1924', who: 'Louis de Broglie', what: 'Matter waves: λ = h/p. Even electrons are waves.' },
        { year: '1927', who: 'Davisson + Germer', what: 'Confirmed electron diffraction — proved matter waves.' },
        { year: '1960', who: 'Theodore Maiman', what: 'First working laser (ruby).' },
        { year: '2015', who: 'LIGO collaboration', what: 'First direct detection of gravitational waves (binary black hole merger).' }
      ];

      function renderOpticsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔍 Optics — lenses, mirrors, and elements'),
          React.createElement('div', { className: 'space-y-2' },
            OPTICS_ELEMENTS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, o.name),
                React.createElement('div', { className: 'text-[11px] text-cyan-700 font-bold mb-1' }, o.behavior),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.use)
              );
            })
          )
        );
      }

      function renderRefractionSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↻ Refractive indices'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Snell\'s law: n₁ sin θ₁ = n₂ sin θ₂. Light slows by factor n in material; n is wavelength-dependent (dispersion).'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Material', 'n', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                REFRACTION_INDICES.map(function(r, i) {
                  return React.createElement('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.material),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, r.n),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, r.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderDiffractionSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿ Diffraction'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Diffraction = bending of waves around obstacles or through openings. Most noticeable when feature size ≈ wavelength.'),
          React.createElement('div', { className: 'space-y-2' },
            DIFFRACTION_FACTS.map(function(d, i) {
              return React.createElement('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, d.fact),
                React.createElement('div', { className: 'text-[11px] font-mono text-cyan-700 font-bold mb-1' }, d.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, d.notes)
              );
            })
          )
        );
      }

      function renderPolarizationSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↕ Polarization'),
          React.createElement('div', { className: 'space-y-2' },
            POLARIZATION_NOTES.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, p.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.detail)
              );
            })
          )
        );
      }

      function renderQuantumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛ Quantum waves'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'In quantum mechanics, every particle has wave properties. The "wave function" ψ gives probability amplitude.'),
          React.createElement('div', { className: 'space-y-2' },
            QUANTUM_WAVES.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, q.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, q.detail)
              );
            })
          )
        );
      }

      function renderSeismicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌋 Seismic waves'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Wave types'),
            React.createElement('div', { className: 'space-y-1' },
              SEISMIC_WAVES.map(function(w, i) {
                return React.createElement('div', { key: 'w'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, w.name),
                    React.createElement('span', { className: 'text-[10px] text-cyan-700 ml-auto font-mono' }, w.speed)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700 italic mb-0.5' }, w.type),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, w.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Seismology essentials'),
          React.createElement('div', { className: 'space-y-1' },
            SEISMIC_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-cyan-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderOceanSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏄 Ocean waves'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Ocean wave types'),
            React.createElement('div', { className: 'space-y-1' },
              OCEAN_WAVES.map(function(o, i) {
                return React.createElement('div', { key: 'o'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, o.type),
                    React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto' }, 'T: ' + o.period + ' · λ: ' + o.wavelength)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, o.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Wave physics in water'),
          React.createElement('div', { className: 'space-y-1' },
            OCEAN_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-cyan-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderAntennasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📶 Antenna types'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Antenna size typically tied to wavelength. Lower frequency = longer wavelength = bigger antenna.'),
          React.createElement('div', { className: 'space-y-2' },
            ANTENNA_TYPES.map(function(a, i) {
              return React.createElement('div', { key: 'a'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, a.type),
                  React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, a.size)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, a.use)
              );
            })
          )
        );
      }

      function renderRadarSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 Radar, sonar, and active ranging'),
          React.createElement('div', { className: 'space-y-2' },
            RADAR_SONAR.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, r.system),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, r.use)
              );
            })
          )
        );
      }

      function renderShockwavesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✈ Shock waves'),
          React.createElement('div', { className: 'space-y-2' },
            SHOCKWAVE_FACTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, s.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 History of wave science'),
          React.createElement('div', { className: 'space-y-2' },
            WAVE_HISTORY.map(function(h2, i) {
              return React.createElement('div', { key: 'h'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  React.createElement('span', { className: 'text-[10px] font-mono text-cyan-700 font-bold' }, h2.year),
                  React.createElement('span', { className: 'text-[12px] font-black text-cyan-900' }, h2.who)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h2.what)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'types') return renderTypesSection();
        if (expSection === 'quantities') return renderQuantitiesSection();
        if (expSection === 'formulas') return renderFormulasSection();
        if (expSection === 'interference') return renderInterferenceSection();
        if (expSection === 'doppler') return renderDopplerSection();
        if (expSection === 'spectrum') return renderSpectrumSection();
        if (expSection === 'colors') return renderColorsSection();
        if (expSection === 'harmonics') return renderHarmonicsSection();
        if (expSection === 'instruments') return renderInstrumentsSection();
        if (expSection === 'decibels') return renderDecibelsSection();
        if (expSection === 'optics') return renderOpticsSection();
        if (expSection === 'refraction') return renderRefractionSection();
        if (expSection === 'diffraction') return renderDiffractionSection();
        if (expSection === 'polarization') return renderPolarizationSection();
        if (expSection === 'quantum') return renderQuantumSection();
        if (expSection === 'seismic') return renderSeismicSection();
        if (expSection === 'ocean') return renderOceanSection();
        if (expSection === 'antennas') return renderAntennasSection();
        if (expSection === 'radar') return renderRadarSection();
        if (expSection === 'shockwaves') return renderShockwavesSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'colors2') return renderColors2Section();
        if (expSection === 'lasers') return renderLasersSection();
        if (expSection === 'fibers') return renderFibersSection();
        if (expSection === 'protocols') return renderProtocolsSection();
        if (expSection === 'music') return renderMusicSection();
        if (expSection === 'hearing') return renderHearingSection();
        if (expSection === 'medical') return renderMedicalSection();
        if (expSection === 'satellites') return renderSatellitesSection();
        if (expSection === 'gravitational') return renderGravitationalSection();
        if (expSection === 'units2') return renderUnitsSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'animals') return renderAnimalsSection();
        if (expSection === 'instrumentfreqs') return renderInstrumentFreqSection();
        if (expSection === 'radio') return renderRadioSection();
        if (expSection === 'colorhex') return renderColorhexSection();
        if (expSection === 'wavespeed') return renderWaveSpeedSection();
        if (expSection === 'stars') return renderStarsSection();
        if (expSection === 'tvfreq') return renderTvfreqSection();
        if (expSection === 'noise') return renderNoiseSection();
        if (expSection === 'speeds2') return renderSpeeds2Section();
        if (expSection === 'cameras') return renderCamerasSection();
        if (expSection === 'optical_facts') return renderOpticalFactsSection();
        if (expSection === 'recordings') return renderRecordingsSection();
        if (expSection === 'discoverWave') return renderDiscoverWaveSection();
        if (expSection === 'standingHunt') return renderStandingHuntSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var AUDIO_FORMATS = [
        { format: 'WAV (PCM)', extension: '.wav', compression: 'None (lossless)', notes: 'Raw uncompressed audio. ~10 MB/min at CD quality. Standard for editing.' },
        { format: 'FLAC', extension: '.flac', compression: 'Lossless', notes: 'Free Lossless Audio Codec. ~5 MB/min CD quality. Bit-perfect — when decoded, identical to original.' },
        { format: 'ALAC', extension: '.m4a, .alac', compression: 'Lossless', notes: 'Apple Lossless Audio Codec. Similar to FLAC but Apple-developed.' },
        { format: 'MP3', extension: '.mp3', compression: 'Lossy', notes: 'Most common lossy format. 128 kbps = compact but audible artifacts. 320 kbps near-transparent.' },
        { format: 'AAC', extension: '.aac, .m4a', compression: 'Lossy', notes: 'Better quality than MP3 at same bitrate. iTunes, YouTube use it.' },
        { format: 'OGG Vorbis', extension: '.ogg', compression: 'Lossy', notes: 'Open-source alternative to MP3. Often used in games (Minecraft, Spotify).' },
        { format: 'Opus', extension: '.opus', compression: 'Lossy', notes: 'Modern open codec. Excellent at low bitrates (6-510 kbps). Used in WebRTC, Discord, YouTube.' },
        { format: 'WMA', extension: '.wma', compression: 'Lossy or lossless', notes: 'Microsoft\'s codec. Largely abandoned.' },
        { format: 'AIFF', extension: '.aiff', compression: 'None (lossless)', notes: 'Apple\'s uncompressed format. Similar to WAV.' },
        { format: 'MIDI', extension: '.mid', compression: 'Not audio — instructions', notes: 'Stores notes + timing, not sound. Player synthesizes. Tiny files.' },
        { format: 'DSD', extension: '.dsf, .dff', compression: 'PDM (different from PCM)', notes: 'Used for Super Audio CD. 1-bit, very high sample rate (2.8+ MHz).' }
      ];

      var AUDIO_BITRATES = [
        { quality: 'Phone call (G.711)', bitrate: '64 kbps', notes: '8 kHz sample, narrow band.' },
        { quality: 'Opus low quality', bitrate: '24 kbps', notes: 'Voice still intelligible.' },
        { quality: 'AM radio quality', bitrate: '~30 kbps equiv', notes: '5 kHz bandwidth approximately.' },
        { quality: 'FM radio quality', bitrate: '~96 kbps equiv', notes: '15 kHz bandwidth approximately.' },
        { quality: 'MP3 (web typical)', bitrate: '128 kbps', notes: 'Acceptable for casual listening. Audible artifacts.' },
        { quality: 'AAC (Apple Music)', bitrate: '256 kbps', notes: 'Apple Music standard. Better than 128 kbps MP3.' },
        { quality: 'Spotify (high)', bitrate: '320 kbps Ogg', notes: 'High-quality lossy. Near-transparent for most.' },
        { quality: 'CD quality (16-bit/44.1 kHz PCM)', bitrate: '1411 kbps', notes: 'Lossless. ~10 MB/min stereo.' },
        { quality: 'DVD-Audio (24-bit/96 kHz)', bitrate: '~4600 kbps', notes: 'High-resolution audio. Debated whether audible improvement.' },
        { quality: 'Studio masters (24-bit/192 kHz)', bitrate: '~9200 kbps', notes: 'Recording standard. Down-converted for distribution.' }
      ];

      function renderRecordingsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎧 Audio formats + quality'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Common audio file formats'),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    ['Format', 'Extension', 'Compression', 'Notes'].map(function(hh, i) {
                      return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  AUDIO_FORMATS.map(function(a, i) {
                    return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.format),
                      React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[10px]' }, a.extension),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, a.compression),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                    );
                  })
                )
              )
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Common bitrates'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Quality level', 'Bitrate', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                AUDIO_BITRATES.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.quality),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, b.bitrate),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, b.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final wave data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var OPTICAL_ILLUSIONS = [
        { illusion: 'Müller-Lyer', description: 'Two equal lines with arrowheads — one outward, one inward — appear different lengths.', explanation: 'Brain interprets arrows as depth cues. May be culturally-influenced (less effect in some non-Western cultures).' },
        { illusion: 'Necker cube', description: 'Wireframe cube spontaneously "flips" which face is in front.', explanation: 'Ambiguous projection — brain alternates interpretations. Bistable perception.' },
        { illusion: 'Hermann grid', description: 'Black squares on white grid show ghostly gray dots at intersections.', explanation: 'Lateral inhibition in retinal cells. Each cell\'s response depends on neighbors.' },
        { illusion: 'Checker shadow', description: 'Two checkerboard squares appear different shades but are identical.', explanation: 'Adelson\'s classic. Brain corrects for perceived shadow → "constancy" overrides actual luminance.' },
        { illusion: 'Ponzo illusion', description: 'Two identical lines, one near converging rails, appear different lengths.', explanation: 'Brain treats converging lines as depth — "farther" object must be bigger to project same size on retina.' },
        { illusion: 'Café wall', description: 'Parallel rows of alternating black/white tiles appear sloped.', explanation: 'Offset between rows creates perceived tilt. Studied at café walls in Bristol.' },
        { illusion: 'Rotating snakes (Kitaoka)', description: 'Static image of circles appears to rotate.', explanation: 'Motion-sensitive cells respond differently to varying luminance, creating illusory motion in peripheral vision.' },
        { illusion: 'Spinning dancer (silhouette)', description: 'Dancer appears to spin clockwise or counterclockwise.', explanation: 'Ambiguous silhouette has no depth cues. Brain locks in an interpretation — can sometimes be switched.' },
        { illusion: 'The dress (2015 viral)', description: 'Photo of dress appeared blue/black to some, white/gold to others.', explanation: 'Different brains assume different illumination (daylight vs incandescent) → "color constancy" leads to different perceptions.' },
        { illusion: 'Mach bands', description: 'Sharp luminance edges appear to have over/undershoot bands.', explanation: 'Lateral inhibition in retina enhances edges. Helps with object recognition but creates artifact at edges.' },
        { illusion: 'Stroboscopic effect', description: 'Wheels appear to spin backward in movies.', explanation: 'Frame rate samples motion — when wheel completes nearly full rotation per frame, looks like slight reverse motion.' },
        { illusion: 'Phantom limb', description: 'Amputees feel sensations from missing limb.', explanation: 'Brain map of body remains. Mirror therapy (Ramachandran) sometimes helps.' },
        { illusion: 'Persistence of vision', description: 'Why movies (24+ fps) appear as continuous motion.', explanation: 'Retinal afterimage + brain interpolation. Below ~16 fps flicker is visible.' },
        { illusion: 'Color afterimage', description: 'Stare at red for 30s → look at white → see green afterimage.', explanation: 'Cone receptors fatigue; complementary color signal dominates briefly when you look away.' },
        { illusion: 'Blind spot', description: 'Each eye has a small region where you don\'t see.', explanation: 'Where optic nerve leaves retina — no photoreceptors. Brain fills in. Both eyes together compensate.' },
        { illusion: 'Anaglyph (red/cyan 3D)', description: 'Glasses with red + cyan lenses create 3D from flat image.', explanation: 'Each eye sees different-colored image → brain fuses into 3D.' },
        { illusion: 'Magic Eye / autostereogram', description: 'Cross-eye to see hidden 3D image.', explanation: 'Repeating pattern, each row offset slightly. Brain matches wrong elements → perceived depth.' },
        { illusion: 'Doppler shift in sound', description: 'Siren of approaching vehicle sounds higher than receding.', explanation: 'Compressed waves coming, stretched waves going. f\' = f × (v_sound ± v_observer) / (v_sound ∓ v_source).' },
        { illusion: 'Sonic boom', description: 'Loud bang when supersonic object passes.', explanation: 'Pressure cone of compressed air. Boom not heard until cone reaches you.' },
        { illusion: 'Mirage (highway shimmer)', description: 'Distant road appears wet on hot day.', explanation: 'Hot air near road has lower n than cooler air above → refracts sky light to your eye. Same physics for desert mirages.' },
        { illusion: 'Rainbow', description: '42° arc from anti-solar point.', explanation: 'Sunlight refracts entering water droplet, reflects off back, refracts again leaving. Different λ at different angles.' },
        { illusion: 'Double rainbow', description: 'Second, dimmer rainbow with reversed colors at ~51°.', explanation: 'Two internal reflections in droplets. Less light → dimmer. Reverse order.' },
        { illusion: 'Halo around moon/sun', description: '22° halo around sun or moon.', explanation: 'Ice crystals in high cirrus refract light. Often precedes weather change.' },
        { illusion: 'Green flash at sunset', description: 'Brief green flash as sun dips below horizon.', explanation: 'Atmospheric refraction separates colors at moment of sunset. Best seen over ocean.' }
      ];

      function renderOpticalFactsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👁 Optical illusions + perception phenomena'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Visual perception is active — brain interprets, fills in gaps, makes guesses. Illusions reveal the underlying processes.'),
          React.createElement('div', { className: 'space-y-2' },
            OPTICAL_ILLUSIONS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, o.illusion),
                React.createElement('div', { className: 'text-[11px] text-cyan-700 italic mb-1' }, o.description),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.explanation)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data tables (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var DETAILED_SPEEDS = [
        { thing: 'Speed of light (vacuum)', speed: '299,792,458 m/s', notes: 'Universal speed limit. Defined exact.' },
        { thing: 'Speed of light (air)', speed: '~299,700,000 m/s', notes: 'Air refractive index ~1.0003.' },
        { thing: 'Speed of light (water)', speed: '~225,000,000 m/s', notes: 'n = 1.33.' },
        { thing: 'Speed of light (glass)', speed: '~200,000,000 m/s', notes: 'n ~ 1.5.' },
        { thing: 'Speed of light (diamond)', speed: '~124,000,000 m/s', notes: 'n = 2.42 — highest of common materials.' },
        { thing: 'Cherenkov radiation threshold (water)', speed: '~225,000 km/s', notes: 'Particles faster than light-in-medium emit blue glow (Cherenkov).' },
        { thing: 'Sound in air at 0°C', speed: '331 m/s', notes: 'Cold air, dry, sea level.' },
        { thing: 'Sound in air at 20°C', speed: '343 m/s', notes: 'Reference room temp.' },
        { thing: 'Sound in air at 40°C', speed: '355 m/s', notes: 'Hot day.' },
        { thing: 'Sound in helium (RT)', speed: '~1007 m/s', notes: '~3× air → voice an octave higher.' },
        { thing: 'Sound in CO₂ (RT)', speed: '~267 m/s', notes: 'Slower than air → voice lower.' },
        { thing: 'Sound in water (RT)', speed: '~1482 m/s', notes: 'Whales use long-distance communication.' },
        { thing: 'Sound in seawater', speed: '~1500 m/s', notes: 'Slightly different due to salts.' },
        { thing: 'Sound in ice', speed: '~3840 m/s', notes: 'Stiff solid.' },
        { thing: 'Sound in granite', speed: '~6000 m/s', notes: 'Hard rock.' },
        { thing: 'Sound in steel', speed: '~5960 m/s', notes: 'Train tracks carry sound far before train arrives.' },
        { thing: 'Sound in aluminum', speed: '~6420 m/s', notes: 'Light + stiff.' },
        { thing: 'Sound in diamond', speed: '~12,000 m/s', notes: 'Fastest in common materials.' },
        { thing: 'Sound in beryllium', speed: '~12,900 m/s', notes: 'Fastest in pure elements at standard conditions.' },
        { thing: 'P-wave in upper mantle', speed: '~8 km/s', notes: 'Earthquake primary waves.' },
        { thing: 'S-wave in upper mantle', speed: '~4.5 km/s', notes: 'Earthquake secondary waves.' },
        { thing: 'Tsunami in deep ocean', speed: '~700 km/h', notes: 'Long wavelength shallow-water wave.' },
        { thing: 'Tsunami in shore approach', speed: '~50 km/h', notes: 'Slows + grows as depth decreases.' },
        { thing: 'Surface ripple on water', speed: 'depends on λ', notes: 'Short wavelengths controlled by surface tension; long by gravity.' },
        { thing: 'Sound in human body (avg tissue)', speed: '~1540 m/s', notes: 'Used for medical ultrasound timing.' },
        { thing: 'Sound in bone', speed: '~3000-4000 m/s', notes: 'Faster than soft tissue.' },
        { thing: 'Sound in lung tissue', speed: '~650 m/s', notes: 'Air pockets slow it. Why lungs poorly imaged by ultrasound.' },
        { thing: 'Lightning thunder rule of thumb', speed: '5 sec per mile / 3 sec per km', notes: 'Count seconds between flash + thunder.' }
      ];

      var CAMERA_LENSES = [
        { lens: '8mm fisheye', fov: '~180° diagonal', use: 'Hemispheric panoramas, sky time-lapse, security cameras.' },
        { lens: '14mm ultrawide', fov: '~114° diagonal', use: 'Tight indoor architecture, dramatic landscape.' },
        { lens: '20mm ultrawide', fov: '~94°', use: 'Astrophotography, group photos in tight space.' },
        { lens: '24mm wide-angle', fov: '~84°', use: 'Landscape, real estate, environmental portraits.' },
        { lens: '28mm wide', fov: '~75°', use: 'Street photography, photojournalism.' },
        { lens: '35mm wide', fov: '~63°', use: 'Documentary, candid. "Storyteller\'s lens".' },
        { lens: '50mm normal', fov: '~47°', use: 'Closest to human eye perspective. "Nifty fifty". Portraits.' },
        { lens: '85mm short telephoto', fov: '~28°', use: 'Portraits. Pleasing background compression.' },
        { lens: '105mm portrait', fov: '~23°', use: 'Tight portraits. Macro variants for close-up.' },
        { lens: '135mm', fov: '~18°', use: 'Outdoor portraits, candids from distance.' },
        { lens: '200mm telephoto', fov: '~12°', use: 'Sports, wildlife, distant subjects.' },
        { lens: '300mm telephoto', fov: '~8°', use: 'Sports field-side, bird photography.' },
        { lens: '400mm super-tele', fov: '~6°', use: 'Wildlife, sports. Heavy + expensive.' },
        { lens: '600mm super-tele', fov: '~4°', use: 'Distant wildlife, moon. Requires tripod.' },
        { lens: '800mm super-tele', fov: '~3°', use: 'Specialized wildlife + astronomy.' },
        { lens: '1200mm + teleconverter', fov: '~2°', use: 'Extreme reach. Solar eclipse details.' },
        { lens: 'Macro 100mm', fov: '~24° at infinity / close at 1:1', use: 'Insects, flowers, product. 1:1 magnification.' },
        { lens: 'Tilt-shift 24mm', fov: '~84° normal, controllable', use: 'Architecture (keep verticals straight), miniature faking.' },
        { lens: 'Cinema anamorphic 50mm', fov: 'wider horizontally than spherical', use: 'Cinematic look. Oval bokeh, lens flares.' }
      ];

      var CAMERA_FACTS = [
        { fact: 'Crop factor', detail: 'Smaller sensors crop image. APS-C ~1.5×, Micro 4/3 ~2×, smartphone ~5-7×.' },
        { fact: 'Effective focal length', detail: '50mm lens on APS-C looks like 75mm on full frame. Doesn\'t change actual focal length, just FOV.' },
        { fact: 'f-stop', detail: 'Ratio of focal length to aperture diameter. f/1.4, f/2, f/2.8, f/4, f/5.6, f/8 (each step halves light).' },
        { fact: 'Depth of field', detail: 'Wider aperture (smaller f number) → shallower DOF. Why portraits use f/1.8-f/2.8 for soft backgrounds.' },
        { fact: 'Shutter speed for handheld', detail: 'Rule: at least 1/focal-length sec. 50mm → 1/50 or faster. Stabilization helps.' },
        { fact: 'Sensor sizes', detail: 'Full frame (36×24mm) > APS-H > APS-C > Micro 4/3 > 1" > phone sensors (~1/2" - 1/3").' },
        { fact: 'Megapixels', detail: 'More pixels = more detail (with good lens). Diminishing returns past ~24-50 MP for most uses.' },
        { fact: 'ISO', detail: 'Sensor sensitivity. Higher ISO = brighter image but more noise. Base ISO (lowest noise) typically 100-200.' }
      ];

      function renderSpeeds2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏲ Wave speeds in detail'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Wave + medium', 'Speed', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                DETAILED_SPEEDS.map(function(s, i) {
                  return React.createElement('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.thing),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, s.speed),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCamerasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📷 Camera lenses + photography'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Lens focal lengths (35mm full-frame)'),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    ['Lens', 'Field of view', 'Use'].map(function(hh, i) {
                      return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  CAMERA_LENSES.map(function(L, i) {
                    return React.createElement('tr', { key: 'L'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, L.lens),
                      React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, L.fov),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px]' }, L.use)
                    );
                  })
                )
              )
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Photography essentials'),
          React.createElement('div', { className: 'space-y-1' },
            CAMERA_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-cyan-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Additional dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var STAR_DATA = [
        { star: 'Sun', type: 'G2V (yellow dwarf)', temp: '5,778 K', distance: '1 AU', notes: 'Our nearest star. Apparent peak ~480 nm (blue-green) but we see it yellow due to atmospheric scattering.' },
        { star: 'Proxima Centauri', type: 'M5.5 (red dwarf)', temp: '~3,042 K', distance: '4.24 ly', notes: 'Nearest known star. Has planets including Proxima b in habitable zone.' },
        { star: 'Sirius A', type: 'A1V (white)', temp: '9,940 K', distance: '8.6 ly', notes: 'Brightest in night sky. Binary with white-dwarf Sirius B.' },
        { star: 'Betelgeuse', type: 'M1-2 (red supergiant)', temp: '~3,500 K', distance: '~640 ly', notes: 'Orion\'s shoulder. Variable. Could go supernova "soon" (anytime in next ~100,000 yr).' },
        { star: 'Rigel', type: 'B8I (blue supergiant)', temp: '~12,100 K', distance: '~860 ly', notes: 'Orion\'s foot. Triple star system.' },
        { star: 'Vega', type: 'A0V (white)', temp: '9,602 K', distance: '25 ly', notes: 'Was once "the" North Star. Will be again in ~13,727 CE (precession of equinoxes).' },
        { star: 'Polaris', type: 'F7Ib (yellow supergiant)', temp: '6,015 K', distance: '~430 ly', notes: 'Current North Star. Within ~0.5° of celestial north.' },
        { star: 'Aldebaran', type: 'K5III (orange giant)', temp: '~3,910 K', distance: '~65 ly', notes: 'Eye of Taurus. Reddish-orange.' },
        { star: 'Antares', type: 'M1.5Iab (red supergiant)', temp: '~3,660 K', distance: '~550 ly', notes: 'Heart of Scorpius. Diameter ~700× Sun.' },
        { star: 'Procyon', type: 'F5IV (yellow-white)', temp: '6,530 K', distance: '11.5 ly', notes: 'Eighth brightest star. Binary.' },
        { star: 'Capella', type: 'G3III + G0III (yellow giants)', temp: '~5,000 K (combined)', distance: '~43 ly', notes: 'Sixth brightest. Two pairs (4 stars).' },
        { star: 'Spica', type: 'B1III-IV (blue giant)', temp: '~22,400 K', distance: '~250 ly', notes: 'Brightest in Virgo. Binary.' },
        { star: 'Eta Carinae', type: 'LBV (luminous blue variable)', temp: '~20,000 K', distance: '~7,500 ly', notes: 'Massive (90 M☉ + companion). Erupted dramatically in 1840s. Likely future supernova/hypernova.' },
        { star: 'UY Scuti', type: 'M4Ia (red hypergiant)', temp: '~3,365 K', distance: '~5,200 ly', notes: 'Among largest known stars. Diameter ~1700× Sun.' }
      ];

      var SCREEN_TYPES = [
        { type: 'CRT (cathode ray tube)', refresh: '60-100 Hz', notes: 'Electron beam scans phosphors. Largely obsolete since ~2010.' },
        { type: 'LCD (liquid crystal display)', refresh: '60-360 Hz', notes: 'LCs modulate backlight. Energy-efficient. Limited viewing angles.' },
        { type: 'OLED (organic LED)', refresh: '60-240 Hz', notes: 'Each pixel emits own light. True blacks. Premium phones, TVs.' },
        { type: 'micro-LED', refresh: '60-240 Hz', notes: 'Like OLED but inorganic LEDs. Brighter, longer-lived. Expensive (~2025).' },
        { type: 'Plasma', refresh: '60 Hz typical', notes: 'Excited gas emits UV → phosphors. Discontinued ~2014.' },
        { type: 'E-ink', refresh: 'on update', notes: 'Microcapsules with charged particles. No backlight needed. E-readers.' },
        { type: 'Projector (DLP)', refresh: 'varies', notes: 'Micromirror array. Color via spinning wheel or 3 chips.' },
        { type: 'Projector (LCD)', refresh: 'varies', notes: '3 LCD panels (RGB). Common in classrooms.' },
        { type: 'Laser projector', refresh: 'varies', notes: 'RGB lasers, no lamp replacement. Wide color gamut.' }
      ];

      var SCREEN_RESOLUTIONS = [
        { name: '480p (SD)', resolution: '640×480 or 720×480', notes: 'Standard definition.' },
        { name: '720p (HD)', resolution: '1280×720', notes: 'Cable TV, older laptops.' },
        { name: '1080p (Full HD)', resolution: '1920×1080', notes: 'Most TVs + phones for a decade.' },
        { name: '2K / QHD', resolution: '2560×1440', notes: 'High-end monitors.' },
        { name: '4K (UHD)', resolution: '3840×2160', notes: 'Now standard for new TVs.' },
        { name: '5K', resolution: '5120×2880', notes: 'Apple iMac 5K, pro monitors.' },
        { name: '8K', resolution: '7680×4320', notes: 'Premium TVs. Limited content.' },
        { name: 'DCI 4K', resolution: '4096×2160', notes: 'Cinema standard.' },
        { name: '16K (experimental)', resolution: '15360×8640', notes: 'Not commercially available.' }
      ];

      var NOISE_LEVELS = [
        { source: 'Threshold of hearing', db: '0 dB SPL', notes: 'Quietest sound a young healthy ear can detect.' },
        { source: 'Whisper at 1 m', db: '~30 dB', notes: 'Library.' },
        { source: 'Quiet room', db: '~40 dB', notes: 'Empty house at night.' },
        { source: 'Normal conversation', db: '~60 dB', notes: 'At 1 m.' },
        { source: 'Vacuum cleaner', db: '~70 dB', notes: 'Most household appliances.' },
        { source: 'Heavy traffic', db: '~80 dB', notes: 'Long exposure can cause hearing damage.' },
        { source: 'Lawn mower', db: '~85-90 dB', notes: '85 dB = OSHA action level (hearing conservation required).' },
        { source: 'Subway train', db: '~95-100 dB', notes: 'Pain threshold for prolonged exposure.' },
        { source: 'Power tools (chainsaw)', db: '~110 dB', notes: 'Hearing protection essential.' },
        { source: 'Rock concert / club', db: '~110-120 dB', notes: 'Permanent damage in minutes.' },
        { source: 'Threshold of pain', db: '~130 dB', notes: 'Physically painful.' },
        { source: 'Jet engine at 30 m', db: '~140 dB', notes: 'Instant hearing damage.' },
        { source: 'Gunshot', db: '~150-170 dB', notes: 'Permanent damage possible from single exposure.' },
        { source: 'Rocket launch at 100 m', db: '~180 dB', notes: 'Causes hearing damage + can damage equipment.' },
        { source: 'Krakatoa eruption (1883)', db: '~310 dB at source', notes: 'Possibly loudest sound in modern history. Heard 3000 miles away.' }
      ];

      function renderStarsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⭐ Notable stars (visible spectra)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Star color reflects surface temperature: red coolest (~3,000 K) → orange → yellow → white → blue hottest (~30,000+ K). Spectral types O-B-A-F-G-K-M.'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Star', 'Type', 'Temp', 'Distance', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                STAR_DATA.map(function(s, i) {
                  return React.createElement('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.star),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[10px]' }, s.type),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, s.temp),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, s.distance),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderTvfreqSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📺 Display technologies + resolutions'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Display types'),
            React.createElement('div', { className: 'space-y-1' },
              SCREEN_TYPES.map(function(s, i) {
                return React.createElement('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, s.type),
                    React.createElement('span', { className: 'text-[10px] font-mono text-cyan-700 ml-auto' }, s.refresh)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, s.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Standard resolutions'),
          React.createElement('div', { className: 'space-y-1' },
            SCREEN_RESOLUTIONS.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  React.createElement('span', { className: 'text-[11px] font-black text-cyan-900' }, r.name),
                  React.createElement('span', { className: 'text-[10px] font-mono text-cyan-700 ml-auto font-bold' }, r.resolution)
                ),
                React.createElement('div', { className: 'text-[10px] text-slate-700' }, r.notes)
              );
            })
          )
        );
      }

      function renderNoiseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 Sound levels (dB SPL)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Decibels are logarithmic: +10 dB ≈ 10× sound intensity but ~2× perceived loudness. Sustained exposure >85 dB damages hearing.'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Source', 'Level', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                NOISE_LEVELS.map(function(n, i) {
                  return React.createElement('tr', { key: 'n'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, n.source),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, n.db),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, n.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ANIMAL_HEARING = [
        { animal: 'Human (young)', range: '20 Hz - 20 kHz', notes: 'Upper limit drops with age; adults often only ~14-16 kHz.' },
        { animal: 'Human (elderly)', range: '20 Hz - 10-12 kHz', notes: 'Presbycusis — gradual high-frequency loss after age ~50.' },
        { animal: 'Dog', range: '40 Hz - 60 kHz', notes: 'Dog whistles at 20-25 kHz inaudible to humans.' },
        { animal: 'Cat', range: '55 Hz - 79 kHz', notes: 'Wide range. Sensitive to mouse squeaks.' },
        { animal: 'Bat (echolocation)', range: '1 kHz - 200 kHz', notes: 'Chirp out + listen. Some species at 100+ kHz.' },
        { animal: 'Dolphin', range: '~150 Hz - 150 kHz', notes: 'Echolocate underwater; clicks up to 200 kHz.' },
        { animal: 'Whale (baleen)', range: '~10 Hz - 30 kHz', notes: 'Use infrasound (low freq) for very long-distance communication.' },
        { animal: 'Elephant', range: '~5 Hz - 12 kHz', notes: 'Infrasonic rumbles travel miles. Use for long-range communication.' },
        { animal: 'Mouse', range: '1 kHz - 90 kHz', notes: 'Ultrasonic vocalizations.' },
        { animal: 'Bird (chicken)', range: '125 Hz - 2 kHz', notes: 'Narrower range than mammals. Used in cock crow.' },
        { animal: 'Owl', range: '~50 Hz - 12 kHz', notes: 'Asymmetric ears for precise location of prey rustles.' },
        { animal: 'Moth', range: '~20-60 kHz', notes: 'Hear bat echolocation — drop to evade.' },
        { animal: 'Fish (most)', range: '50 Hz - 1 kHz', notes: 'Use lateral line for water vibrations + ears for sound.' },
        { animal: 'Cricket', range: '~5-90 kHz', notes: 'Ears on legs! Tympanic organs near "knee".' }
      ];

      var INSTRUMENT_FREQS = [
        { instrument: 'Piano', range: '27.5 Hz - 4186 Hz', fundamental: 'A0-C8 (88 keys)', notes: 'Widest range of standard orchestral instruments.' },
        { instrument: 'Violin', range: '196 Hz - 3520 Hz', fundamental: 'G3-A7', notes: 'Highest pitch of orchestral strings.' },
        { instrument: 'Viola', range: '130 Hz - 1318 Hz', fundamental: 'C3-E6', notes: 'Pitched fifth below violin.' },
        { instrument: 'Cello', range: '65 Hz - 1046 Hz', fundamental: 'C2-C6', notes: 'Pitched octave below viola.' },
        { instrument: 'Double bass', range: '41 Hz - 246 Hz', fundamental: 'E1-B3', notes: 'Lowest of standard orchestral strings.' },
        { instrument: 'Guitar (standard tuning)', range: '82 Hz - 1318 Hz', fundamental: 'E2-E6', notes: 'EADGBE strings. Range varies with frets.' },
        { instrument: 'Bass guitar', range: '41 Hz - 350 Hz', fundamental: 'E1-E4', notes: 'Octave below standard guitar (4-string).' },
        { instrument: 'Flute', range: '262 Hz - 2093 Hz', fundamental: 'C4-C7', notes: 'Highest standard woodwind.' },
        { instrument: 'Clarinet (Bb)', range: '147 Hz - 1568 Hz', fundamental: 'D3-G6', notes: 'Wide range. Distinctive timbre via odd harmonics.' },
        { instrument: 'Oboe', range: '233 Hz - 1568 Hz', fundamental: 'Bb3-G6', notes: 'Reedy tone. Tunes the orchestra (its A is hardest to adjust).' },
        { instrument: 'Bassoon', range: '58 Hz - 622 Hz', fundamental: 'Bb1-Eb5', notes: 'Lowest standard woodwind.' },
        { instrument: 'Trumpet', range: '165 Hz - 988 Hz', fundamental: 'E3-B5', notes: 'Highest standard brass.' },
        { instrument: 'Trombone', range: '82 Hz - 622 Hz', fundamental: 'E2-Eb5', notes: 'Slide changes pitch — continuous glissando possible.' },
        { instrument: 'French horn', range: '62 Hz - 698 Hz', fundamental: 'B1-F5', notes: 'Wide tonal range; difficult to control.' },
        { instrument: 'Tuba', range: '41 Hz - 349 Hz', fundamental: 'E1-F4', notes: 'Lowest brass.' },
        { instrument: 'Voice (soprano)', range: '262 Hz - 1046 Hz', fundamental: 'C4-C6', notes: 'Highest female voice type.' },
        { instrument: 'Voice (alto)', range: '196 Hz - 698 Hz', fundamental: 'G3-F5', notes: 'Lower female voice.' },
        { instrument: 'Voice (tenor)', range: '131 Hz - 523 Hz', fundamental: 'C3-C5', notes: 'Highest male voice.' },
        { instrument: 'Voice (baritone)', range: '110 Hz - 440 Hz', fundamental: 'A2-A4', notes: 'Most common male voice.' },
        { instrument: 'Voice (bass)', range: '82 Hz - 349 Hz', fundamental: 'E2-F4', notes: 'Lowest standard voice.' },
        { instrument: 'Drum kit (kick)', range: '60-100 Hz', fundamental: 'low rumble', notes: 'Felt as much as heard.' },
        { instrument: 'Drum kit (snare)', range: '~200 Hz fundamental', fundamental: 'sharp attack', notes: 'Wires (snares) add high-frequency rattle.' },
        { instrument: 'Cymbal (crash)', range: 'broad ~300 Hz - 10+ kHz', fundamental: 'inharmonic', notes: 'Not tonally pitched — many frequencies together.' }
      ];

      var RADIO_BANDS = [
        { band: 'ELF (extremely low)', range: '3-30 Hz', wavelength: '100,000-10,000 km', use: 'Submarine communication (penetrates water).' },
        { band: 'SLF (super low)', range: '30-300 Hz', wavelength: '10,000-1,000 km', use: 'Submarines, AC power harmonics.' },
        { band: 'ULF (ultra low)', range: '300 Hz-3 kHz', wavelength: '1,000-100 km', use: 'Mine communication, geophysics.' },
        { band: 'VLF (very low)', range: '3-30 kHz', wavelength: '100-10 km', use: 'Submarine comms, navigation beacons.' },
        { band: 'LF (low)', range: '30-300 kHz', wavelength: '10-1 km', use: 'AM longwave radio (Europe), time signals (WWVB), aircraft navigation.' },
        { band: 'MF (medium)', range: '300 kHz-3 MHz', wavelength: '1 km-100 m', use: 'AM broadcast radio (525-1705 kHz).' },
        { band: 'HF (high)', range: '3-30 MHz', wavelength: '100-10 m', use: 'Shortwave radio, ham radio. Reflects off ionosphere → global propagation.' },
        { band: 'VHF (very high)', range: '30-300 MHz', wavelength: '10-1 m', use: 'FM radio (88-108 MHz), TV channels 2-13, air traffic, weather radio.' },
        { band: 'UHF (ultra high)', range: '300 MHz-3 GHz', wavelength: '1 m-10 cm', use: 'TV channels 14+, cellular (700 MHz - 2.6 GHz), Wi-Fi 2.4 GHz, microwave ovens.' },
        { band: 'SHF (super high)', range: '3-30 GHz', wavelength: '10 cm-1 cm', use: 'Wi-Fi 5/6 GHz, satellite TV, radar.' },
        { band: 'EHF (extremely high)', range: '30-300 GHz', wavelength: '1 cm-1 mm', use: '5G mmWave, automotive radar, radio astronomy.' },
        { band: 'THF (terahertz)', range: '300 GHz-3 THz', wavelength: '1 mm-100 μm', use: 'Research band. Some imaging applications (terahertz cameras).' }
      ];

      var NAMED_COLORS = [
        { name: 'Black', hex: '#000000', wavelength: '—', notes: 'Absence of light. Truest black possible.' },
        { name: 'White', hex: '#FFFFFF', wavelength: 'all visible', notes: 'All wavelengths reflected equally.' },
        { name: 'Red', hex: '#FF0000', wavelength: '~620-750 nm', notes: 'Lowest energy visible.' },
        { name: 'Orange', hex: '#FFA500', wavelength: '~590-620 nm', notes: 'Between red + yellow.' },
        { name: 'Yellow', hex: '#FFFF00', wavelength: '~570-590 nm', notes: 'Brightest perceived color (peak human sensitivity).' },
        { name: 'Green', hex: '#00FF00', wavelength: '~495-570 nm', notes: 'Most abundant in nature (chlorophyll reflects).' },
        { name: 'Cyan', hex: '#00FFFF', wavelength: '~485-500 nm', notes: 'Halfway between blue + green.' },
        { name: 'Blue', hex: '#0000FF', wavelength: '~450-495 nm', notes: 'Scattered most by atmosphere → blue sky.' },
        { name: 'Magenta', hex: '#FF00FF', wavelength: 'not a single λ', notes: 'Brain perceives red+blue without green. Has no monochromatic wavelength.' },
        { name: 'Violet', hex: '#8B00FF', wavelength: '~380-450 nm', notes: 'Highest energy visible. Beyond is UV.' },
        { name: 'Pink', hex: '#FFC0CB', wavelength: '—', notes: 'Tint of red. Lots of cultural meaning.' },
        { name: 'Brown', hex: '#A52A2A', wavelength: '—', notes: 'Dark orange/red. No "brown" wavelength exists — perceptual color only.' },
        { name: 'Gray', hex: '#808080', wavelength: '—', notes: 'Achromatic. Equal RGB at any intensity.' },
        { name: 'Silver', hex: '#C0C0C0', wavelength: '—', notes: 'Light gray, often with metallic sheen.' },
        { name: 'Gold', hex: '#FFD700', wavelength: '—', notes: 'Yellow with brownish tint. Metallic sheen in physical samples.' },
        { name: 'Maroon', hex: '#800000', wavelength: '—', notes: 'Dark red.' },
        { name: 'Navy', hex: '#000080', wavelength: '—', notes: 'Dark blue. Original navy uniforms.' },
        { name: 'Teal', hex: '#008080', wavelength: '—', notes: 'Dark cyan. Named after teal duck\'s head color.' },
        { name: 'Olive', hex: '#808000', wavelength: '—', notes: 'Dark yellow-green.' },
        { name: 'Purple', hex: '#800080', wavelength: '—', notes: 'Dark magenta. Royal purple historically rare + expensive (Tyrian dye).' },
        { name: 'Indigo', hex: '#4B0082', wavelength: '~440-450 nm', notes: 'Between blue + violet. Newton\'s color of the spectrum.' },
        { name: 'Lime', hex: '#00FF00', wavelength: '~495-570 nm', notes: 'Web "lime" = pure green RGB.' },
        { name: 'Aqua', hex: '#00FFFF', wavelength: '~485-500 nm', notes: 'Same as cyan in web colors.' },
        { name: 'Fuchsia', hex: '#FF00FF', wavelength: 'not a single λ', notes: 'Same as magenta in web colors.' },
        { name: 'Coral', hex: '#FF7F50', wavelength: '—', notes: 'Orange-pink, named after coral reefs.' },
        { name: 'Tomato', hex: '#FF6347', wavelength: '—', notes: 'Bright red-orange.' },
        { name: 'Salmon', hex: '#FA8072', wavelength: '—', notes: 'Pinkish orange, like salmon flesh.' },
        { name: 'Khaki', hex: '#F0E68C', wavelength: '—', notes: 'Light yellow-brown. Military uniforms.' },
        { name: 'Crimson', hex: '#DC143C', wavelength: '~640 nm', notes: 'Deep red.' },
        { name: 'Lavender', hex: '#E6E6FA', wavelength: '—', notes: 'Light purple, named after the flower.' },
        { name: 'Turquoise', hex: '#40E0D0', wavelength: '~490 nm', notes: 'Greenish blue, named after the gemstone.' },
        { name: 'Beige', hex: '#F5F5DC', wavelength: '—', notes: 'Pale yellow-brown. Common neutral.' }
      ];

      var WAVE_SPEEDS = [
        { medium: 'Vacuum', speed: '299,792,458 m/s (light)', notes: 'Defined exactly. Maximum possible speed of any information.' },
        { medium: 'Air at 0°C', speed: '331 m/s (sound)', notes: 'Speed of sound increases with temperature.' },
        { medium: 'Air at 20°C', speed: '343 m/s (sound)', notes: 'Standard reference. ~1235 km/h, 767 mph.' },
        { medium: 'Helium at 20°C', speed: '~1007 m/s (sound)', notes: 'Faster — lighter molecules. Why helium makes voice high-pitched.' },
        { medium: 'Water at 20°C', speed: '~1482 m/s (sound)', notes: 'Sound travels ~4× faster in water than air.' },
        { medium: 'Steel', speed: '~5960 m/s (sound)', notes: 'Sound very fast in stiff solids.' },
        { medium: 'Diamond', speed: '~12,000 m/s (sound)', notes: 'Fastest sound speed of common materials.' },
        { medium: 'Glass (typical)', speed: '~200,000 km/s (light)', notes: 'About 2/3 c. Refractive index n = c/v ≈ 1.5.' },
        { medium: 'Water', speed: '~225,000 km/s (light)', notes: 'About 3/4 c. n ≈ 1.33.' },
        { medium: 'Crust (P-waves)', speed: '~5-8 km/s', notes: 'Earthquake P-waves move at this speed in upper crust.' },
        { medium: 'Crust (S-waves)', speed: '~3-4.5 km/s', notes: 'Slower than P-waves.' },
        { medium: 'Tsunami (deep ocean)', speed: '~700 km/h', notes: 'Long-wavelength shallow-water wave. Slows + grows at shore.' },
        { medium: 'Light in coaxial cable', speed: '~200,000 km/s', notes: 'Slower than vacuum — limits internet latency to/from data centers.' },
        { medium: 'Sound in body tissue', speed: '~1500-1600 m/s', notes: 'Similar to water. Why ultrasound works for medical imaging.' },
        { medium: 'Compressional wave in rope', speed: '√(T/μ) m/s', notes: 'T = tension, μ = linear density. Tighter rope → faster waves.' }
      ];

      function renderAnimalsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🦇 Animal hearing ranges'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Animal', 'Hearing range', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                ANIMAL_HEARING.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.animal),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, a.range),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderInstrumentFreqSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎻 Musical instrument frequencies'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Instrument', 'Range', 'Notes (notation)', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                INSTRUMENT_FREQS.map(function(I, i) {
                  return React.createElement('tr', { key: 'I'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, I.instrument),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, I.range),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, I.fundamental),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, I.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderRadioSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📻 Radio frequency bands (ITU)'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'EM waves below visible light, classified by frequency. Lower bands penetrate further; higher bands carry more data.'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Band', 'Frequency', 'Wavelength', 'Use'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                RADIO_BANDS.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.band),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, b.range),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, b.wavelength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px]' }, b.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderColorhexSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 Named colors + their wavelengths'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Color', 'Hex', 'λ peak', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                NAMED_COLORS.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800', style: { borderLeft: '8px solid ' + c.hex } }, c.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.hex),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[10px]' }, c.wavelength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderWaveSpeedSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏱ Wave speeds in different media'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Medium', 'Speed', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                WAVE_SPEEDS.map(function(w, i) {
                  return React.createElement('tr', { key: 'w'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, w.medium),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[10px]' }, w.speed),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, w.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var COLOR_MODELS = [
        { model: 'RGB (additive)', use: 'Screens, displays', notes: 'Red + Green + Blue. All three at max = white. Used because screens emit light.' },
        { model: 'CMYK (subtractive)', use: 'Printing', notes: 'Cyan, Magenta, Yellow + Key (black). Inks absorb colors; all four = black. Used because paper reflects light.' },
        { model: 'HSL / HSV', use: 'Color pickers, design', notes: 'Hue (angle 0-360°), Saturation (%), Lightness/Value (%). More intuitive than RGB for humans.' },
        { model: 'LAB (CIELAB)', use: 'Color science, calibration', notes: 'L = lightness, a = green-red, b = blue-yellow. Perceptually uniform.' },
        { model: 'XYZ (CIE 1931)', use: 'Reference for all other models', notes: 'Based on human cone responses. Foundation of modern colorimetry.' },
        { model: 'sRGB', use: 'Standard web + most displays', notes: 'Limited color gamut. Defines specific RGB primaries + gamma curve.' },
        { model: 'Adobe RGB', use: 'Print prep + pro photography', notes: 'Wider gamut than sRGB, especially in greens.' },
        { model: 'Display P3', use: 'Apple devices, modern smartphones', notes: 'Wider gamut than sRGB, esp. reds. Standard for HDR.' },
        { model: 'Rec. 2020', use: 'UHD TV / 4K + 8K video', notes: 'Very wide gamut. Few displays can reproduce it fully.' }
      ];

      var LASER_TYPES = [
        { type: 'Helium-Neon (HeNe)', wavelength: '633 nm (red)', power: 'mW', use: 'Alignment, barcode scanners (old). One of the first practical lasers.' },
        { type: 'CO₂', wavelength: '10.6 μm (IR)', power: 'W to kW', use: 'Cutting metal + acrylic, surgery, marking.' },
        { type: 'Nd:YAG', wavelength: '1064 nm (NIR)', power: 'mW to kW', use: 'Industrial cutting + welding, medical (skin treatment, tattoo removal).' },
        { type: 'Argon ion', wavelength: '488, 514 nm (blue-green)', power: 'mW to W', use: 'Eye surgery (retinal), flow cytometry, light shows.' },
        { type: 'Excimer (ArF, KrF)', wavelength: '193, 248 nm (UV)', power: 'pulse', use: 'LASIK eye surgery, microchip photolithography.' },
        { type: 'Semiconductor (laser diode)', wavelength: 'broad — 400 nm to 2 μm', power: 'mW to W', use: 'CD/DVD/Blu-ray, laser pointers, fiber-optic comm.' },
        { type: 'Fiber laser', wavelength: '~1 μm (typically)', power: 'W to kW', use: 'Industrial cutting/welding. Higher efficiency than older lasers.' },
        { type: 'Dye laser', wavelength: 'tunable across visible', power: 'mW to W', use: 'Spectroscopy, research. Largely replaced by tunable solid-state.' },
        { type: 'Free-electron laser (FEL)', wavelength: 'tunable, microwave to X-ray', power: 'high', use: 'Research — accelerator-based. Atomic-scale imaging.' },
        { type: 'Ti:Sapphire', wavelength: '~800 nm (tunable)', power: 'W (ultrafast)', use: 'Ultrafast science. Femtosecond pulses. Two-photon microscopy.' }
      ];

      var LASER_FACTS = [
        { fact: 'LASER acronym', detail: 'Light Amplification by Stimulated Emission of Radiation.' },
        { fact: 'Stimulated emission', detail: 'A photon causes an excited atom to emit a SECOND identical photon. Cascade of identical photons = laser beam.' },
        { fact: 'Population inversion', detail: 'More atoms in excited state than ground. Required for net amplification. Achieved via "pumping" (light, current, or chemical).' },
        { fact: 'Coherence', detail: 'Laser photons all in phase. Allows interference effects + tight focusing.' },
        { fact: 'Monochromatic', detail: 'Single wavelength. Real lasers have very narrow line width (kHz to GHz).' },
        { fact: 'Beam divergence', detail: 'Laser beams spread VERY slowly. Apollo laser ranging spread <2 km over 384,400 km to Moon.' },
        { fact: 'Eye safety', detail: 'Even low-power lasers can blind. Focused on retina, mW = sun-level brightness on photoreceptors.' },
        { fact: 'Classes', detail: 'Class 1 (safe), Class 2 (eye blink protects), Class 3R/3B (potentially hazardous), Class 4 (skin burns + fire risk).' }
      ];

      var FIBER_OPTICS = [
        { topic: 'How they work', detail: 'Total internal reflection traps light in core (higher n) surrounded by cladding (lower n). Light bounces along the fiber.' },
        { topic: 'Single-mode fiber (SMF)', detail: 'Core ~9 μm. Only one mode propagates. Long distances (>100 km). Used in telecom backbones.' },
        { topic: 'Multi-mode fiber (MMF)', detail: 'Core ~50-62.5 μm. Many modes — limits bandwidth-distance product. Short runs (<2 km).' },
        { topic: 'Attenuation', detail: 'Modern fibers: ~0.2 dB/km at 1550 nm. Signal halves every ~15 km without amplification.' },
        { topic: 'Dispersion', detail: 'Different wavelengths or modes travel at slightly different speeds → pulse spreading. Limits data rate.' },
        { topic: 'EDFA (erbium-doped fiber amp)', detail: 'Amplifies optical signal directly without electrical conversion. Revolutionized long-haul fiber.' },
        { topic: 'WDM (wavelength division multiplexing)', detail: 'Multiple wavelengths on one fiber. DWDM can fit 100+ channels — Tb/s per fiber.' },
        { topic: 'Bandwidth-distance product', detail: 'Single-mode fiber: petabit-per-second times km. Vastly more than copper.' },
        { topic: 'Real-world: internet backbones', detail: '99% of intercontinental data traffic goes over fiber-optic submarine cables.' },
        { topic: 'Real-world: medical endoscopes', detail: 'Coherent fiber bundles transmit images. Used to inspect inside body.' },
        { topic: 'Real-world: sensors', detail: 'Fiber Bragg gratings detect strain, temperature. Used in bridges, oil wells, aerospace.' }
      ];

      var COMM_PROTOCOLS = [
        { name: 'Wi-Fi 6 (802.11ax)', band: '2.4 + 5 + 6 GHz', notes: 'Up to ~10 Gbps. OFDMA for many simultaneous users.' },
        { name: 'Wi-Fi 7 (802.11be)', band: '2.4 + 5 + 6 GHz', notes: 'Up to ~46 Gbps theoretical. Wider channels (320 MHz).' },
        { name: 'Bluetooth Classic', band: '2.4 GHz', notes: '~1-3 Mbps. Pairing for headphones, controllers.' },
        { name: 'Bluetooth LE (low energy)', band: '2.4 GHz', notes: '~1-2 Mbps. Beacons, sensors, wearables. Years of coin-cell battery life.' },
        { name: 'Zigbee', band: '2.4 GHz (mostly)', notes: '~250 kbps. Mesh networking. Smart-home devices.' },
        { name: '4G LTE', band: '600 MHz - 2.6 GHz', notes: '~50-150 Mbps typical.' },
        { name: '5G (sub-6 GHz)', band: '600 MHz - 6 GHz', notes: '~100 Mbps - 1 Gbps. Wider coverage than mmWave.' },
        { name: '5G (mmWave)', band: '24-100 GHz', notes: 'Multi-Gbps in clear LOS. Heavily blocked by walls, body, rain.' },
        { name: 'NFC', band: '13.56 MHz', notes: 'cm range. Contactless payment, pairing.' },
        { name: 'RFID (UHF)', band: '860-960 MHz', notes: 'Inventory, tags. Reads at distance without battery in tag.' },
        { name: 'AM radio', band: '535-1605 kHz', notes: 'Amplitude-modulated. Long range, low fidelity. Susceptible to noise.' },
        { name: 'FM radio', band: '88-108 MHz', notes: 'Frequency-modulated. Better noise immunity than AM, higher fidelity.' },
        { name: 'GPS L1', band: '1.575 GHz', notes: 'Civilian band. ~30 satellites.' },
        { name: 'Satellite TV (Ku band)', band: '12-14 GHz', notes: 'Most consumer satellite TV.' },
        { name: 'Microwave oven', band: '2.45 GHz', notes: 'Same band as Wi-Fi! Why microwaves can disrupt Wi-Fi when door seal is bad.' }
      ];

      var MUSIC_ACOUSTICS = [
        { topic: 'Pitch', detail: 'Perception of frequency. A4 = 440 Hz standard concert pitch (some orchestras use 442 Hz).' },
        { topic: 'Octave', detail: 'Doubling of frequency. A4 = 440 Hz, A5 = 880 Hz, A3 = 220 Hz.' },
        { topic: 'Equal temperament', detail: '12 semitones per octave, each ratio 2^(1/12) ≈ 1.05946. Allows transposing.' },
        { topic: 'Just intonation', detail: 'Uses simple integer ratios (3:2 = perfect fifth, 5:4 = major third). Sounds more "pure" but not transposable.' },
        { topic: 'Harmonics', detail: 'Integer multiples of fundamental. Determine timbre. Different instruments emphasize different harmonics.' },
        { topic: 'Formants', detail: 'Resonant peaks in vocal/instrument spectrum. Distinguish vowels + instruments.' },
        { topic: 'Beats', detail: 'Two close frequencies interfere → audible amplitude oscillation at difference frequency. Used to tune instruments.' },
        { topic: 'Resonance (instruments)', detail: 'Air column or string vibrates at characteristic frequencies. Length + tension determine pitch.' },
        { topic: 'String frequency', detail: 'f = (1/2L)·√(T/μ). Higher tension or shorter string → higher pitch.' },
        { topic: 'Open pipe resonance', detail: 'f = nv/(2L). Both ends open. Even harmonics present (flute).' },
        { topic: 'Closed pipe resonance', detail: 'f = (2n-1)v/(4L). One end closed. Only odd harmonics (clarinet).' },
        { topic: 'Stereo + spatial audio', detail: 'Two ears → interaural time + level differences locate sound. Spatial audio reproduces this with head tracking.' },
        { topic: 'Reverb time (RT60)', detail: 'Time for sound to decay by 60 dB. Concert hall ~1.5-2 s; cathedral ~5-10 s; recording studio <0.3 s.' },
        { topic: 'Decibels (sound)', detail: '0 dB SPL = threshold of hearing. Conversation ~60 dB. Rock concert ~110 dB. Pain ~130 dB. Hearing damage >85 dB long exposure.' }
      ];

      var EAR_PARTS = [
        { part: 'Pinna (outer ear)', function: 'Funnels sound to canal; helps localize sound', notes: 'Shape filters frequencies → vertical localization cues.' },
        { part: 'Ear canal', function: 'Channels sound to eardrum', notes: 'Resonates at ~3 kHz → enhanced sensitivity to speech frequencies.' },
        { part: 'Eardrum (tympanic membrane)', function: 'Vibrates with sound waves', notes: '~0.1 mm thick. Connected to ossicles.' },
        { part: 'Ossicles (hammer, anvil, stirrup)', function: 'Amplify + transmit vibrations to cochlea', notes: 'Smallest bones in body. Lever action + area mismatch amplifies ~20×.' },
        { part: 'Oval window', function: 'Membrane connecting middle to inner ear', notes: 'Stirrup pushes against it, transferring vibration to cochlear fluid.' },
        { part: 'Cochlea', function: 'Frequency analysis — different positions respond to different frequencies', notes: 'Snail-shaped. ~3.5 turns. ~16,000 hair cells per ear.' },
        { part: 'Basilar membrane', function: 'Mechanical frequency analysis', notes: 'Stiff near oval window (high freq), floppy at apex (low freq).' },
        { part: 'Hair cells', function: 'Convert mechanical vibration to neural signal', notes: 'Outer hair cells amplify; inner hair cells transmit. Damage = permanent hearing loss.' },
        { part: 'Auditory nerve', function: 'Carries signal to brain', notes: 'About 30,000 fibers per ear.' },
        { part: 'Semicircular canals', function: 'Balance + head rotation', notes: '3 fluid-filled rings in 3 perpendicular planes. Detect angular acceleration.' },
        { part: 'Otolith organs', function: 'Detect linear acceleration + gravity', notes: 'Crystals on hair cells move with motion. Source of "elevator stomach" feeling.' }
      ];

      var MEDICAL_IMAGING = [
        { method: 'X-ray', radiation: 'X-rays', use: 'Bones, dense tissue. Quick, cheap, ubiquitous.', notes: 'Ionizing radiation. Bone absorbs more than soft tissue → contrast.' },
        { method: 'CT scan', radiation: 'X-rays (many angles)', use: '3D reconstruction. Trauma, tumors, internal injury.', notes: 'Higher dose than single X-ray. Excellent anatomical detail.' },
        { method: 'MRI', radiation: 'Radio (in strong B field)', use: 'Soft tissue, brain, joints, tumors.', notes: 'No ionizing radiation. Long scans. T1 vs T2 highlights different features.' },
        { method: 'fMRI', radiation: 'Radio (in strong B field)', use: 'Brain activity via blood oxygenation', notes: 'BOLD signal. Indirect — neural activity → blood flow change → MRI signal.' },
        { method: 'Ultrasound', radiation: 'High-frequency sound', use: 'Pregnancy, heart, abdominal organs', notes: 'No radiation. Real-time. Doppler mode shows blood flow.' },
        { method: 'PET scan', radiation: 'Positron emission (radiotracer)', use: 'Metabolic activity, cancer staging, brain disease', notes: 'Radioactive glucose (FDG) concentrates in active tissue.' },
        { method: 'SPECT', radiation: 'Gamma (radiotracer)', use: 'Blood flow, heart, brain', notes: 'Like PET but uses single-photon emitters; lower resolution but cheaper.' },
        { method: 'Mammography', radiation: 'Low-energy X-rays', use: 'Breast tissue screening', notes: 'Compression spreads tissue for clearer image.' },
        { method: 'Bone densitometry (DEXA)', radiation: 'Dual-energy X-ray', use: 'Bone density (osteoporosis)', notes: 'Two energies subtract to isolate bone density.' },
        { method: 'OCT (optical coherence tomography)', radiation: 'Near-infrared light', use: 'Retina + cornea imaging', notes: 'Like ultrasound but with light. μm resolution. No radiation.' }
      ];

      var SATELLITE_FACTS = [
        { topic: 'GPS orbital altitude', detail: '~20,200 km. Medium Earth orbit. Period ~12 hours (2 orbits per sidereal day).' },
        { topic: 'GPS constellation', detail: '24+ satellites; need ≥4 in view for 3D fix + time.' },
        { topic: 'Receiver position', detail: 'Triangulation by time-of-flight from satellites to receiver. Needs 4 satellites (3 for position + 1 for clock sync).' },
        { topic: 'Accuracy', detail: 'Civilian GPS: ~3-10 m. With augmentation (DGPS, RTK): cm. Selective Availability ended in 2000.' },
        { topic: 'Galileo', detail: 'EU GNSS. ~30 satellites. Open service ~1 m accuracy.' },
        { topic: 'GLONASS', detail: 'Russian GNSS. ~24 satellites.' },
        { topic: 'BeiDou', detail: 'Chinese GNSS. 35 satellites. Global service since 2020.' },
        { topic: 'Geostationary orbit (GEO)', detail: '35,786 km altitude. Period = 24 hours → fixed over equator point. Used for TV, weather.' },
        { topic: 'Low Earth orbit (LEO)', detail: '200-2000 km. Period ~90 min. ISS at ~400 km. Starlink at ~550 km. Lower latency.' },
        { topic: 'Atomic clocks on GPS', detail: 'Cesium + rubidium clocks. Stability ~10⁻¹³. Even small relativistic effects matter — must correct for both special + general relativity.' },
        { topic: 'Light travel time', detail: 'GPS satellite → receiver: ~70 ms. Geo satellite → receiver: ~250 ms (perceptible delay in geo satellite calls).' }
      ];

      var GW_FACTS = [
        { topic: 'What they are', detail: 'Ripples in spacetime predicted by Einstein (1916). Travel at speed of light.' },
        { topic: 'Sources', detail: 'Massive accelerating objects: merging black holes + neutron stars, supernovae, pulsars, Big Bang.' },
        { topic: 'LIGO', detail: 'Laser Interferometer Gravitational-wave Observatory. Two L-shaped detectors (Hanford WA, Livingston LA), 4 km arms.' },
        { topic: 'First detection', detail: '14 September 2015. Two ~30 M☉ black holes merged ~1.3 billion years ago. Signal lasted ~0.2 sec. Nobel Prize 2017.' },
        { topic: 'Sensitivity', detail: 'LIGO detects length changes ~10⁻¹⁸ m — 1/10000 the size of a proton.' },
        { topic: 'Multi-messenger astronomy', detail: '17 August 2017: GW + gamma rays + visible light from neutron-star merger (GW170817). Confirmed kilonovae produce heavy elements.' },
        { topic: 'Virgo', detail: 'European GW detector in Italy. 3 km arms.' },
        { topic: 'KAGRA', detail: 'Japanese GW detector. Underground, cryogenic mirrors.' },
        { topic: 'LISA (planned)', detail: 'Space-based detector. 3 satellites in 2.5 million km triangle. Launch ~2035. Sensitive to lower frequencies (supermassive black holes).' },
        { topic: 'Pulsar timing arrays', detail: 'Use millisecond pulsars as natural clocks. Detect very low-frequency GWs from supermassive black hole binaries. NANOGrav announced detection 2023.' }
      ];

      var WAVE_UNITS = [
        { quantity: 'Frequency', symbol: 'f or ν', unit: 'hertz (Hz)', notes: 'Cycles per second. kHz, MHz, GHz, THz common in modern tech.' },
        { quantity: 'Period', symbol: 'T', unit: 'second (s)', notes: 'Time per cycle. T = 1/f. Heart: ~1 s; mains: 16.7 ms; visible light: ~2 fs.' },
        { quantity: 'Wavelength', symbol: 'λ', unit: 'meter (m)', notes: 'Distance per cycle. Sub-mm (UHF radio) to thousands of km (extremely low freq).' },
        { quantity: 'Wavenumber', symbol: 'k', unit: 'rad/m', notes: 'k = 2π/λ. Used in waveform math.' },
        { quantity: 'Angular frequency', symbol: 'ω', unit: 'rad/s', notes: 'ω = 2πf. Common in oscillation + wave equations.' },
        { quantity: 'Speed', symbol: 'v or c', unit: 'm/s', notes: 'v = fλ. Light in vacuum: c = 299,792,458 m/s (exact).' },
        { quantity: 'Amplitude', symbol: 'A', unit: 'meters (mech), V/m (EM)', notes: 'Maximum displacement from equilibrium.' },
        { quantity: 'Intensity', symbol: 'I', unit: 'W/m²', notes: 'Power per area. Solar irradiance at Earth: ~1361 W/m².' },
        { quantity: 'Sound pressure level (SPL)', symbol: 'L_p', unit: 'dB', notes: '20·log₁₀(p/p_ref). Reference: 20 μPa.' },
        { quantity: 'Photon energy', symbol: 'E', unit: 'joule (J) or eV', notes: 'E = hf = hc/λ. Visible photons: ~2 eV.' }
      ];

      var WAVE_CAREERS = [
        { career: 'Audio engineer', use: 'Mixing music, recording. Understand EQ, reverb, frequency response.' },
        { career: 'Acoustic consultant', use: 'Design concert halls, recording studios, noise control for buildings + machinery.' },
        { career: 'Audiologist', use: 'Test + treat hearing loss. Fit hearing aids and cochlear implants.' },
        { career: 'Speech-language pathologist', use: 'Analyze speech sounds (acoustic phonetics). Treat voice + articulation disorders.' },
        { career: 'RF engineer', use: 'Design antennas, wireless systems, radar.' },
        { career: 'Optical engineer', use: 'Design cameras, microscopes, telescopes, fiber-optic links.' },
        { career: 'Seismologist', use: 'Analyze earthquake waves, locate epicenters, monitor for nuclear tests.' },
        { career: 'Oceanographer', use: 'Study tides, currents, ocean wave dynamics.' },
        { career: 'Meteorologist', use: 'Doppler radar analysis. Wave physics in atmosphere (Rossby waves).' },
        { career: 'Sonographer (medical)', use: 'Operate ultrasound for diagnostic imaging.' },
        { career: 'Astronomer', use: 'Analyze light + radio waves from celestial objects.' },
        { career: 'Music producer', use: 'Shape recorded sound. Synthesize tones. Mix tracks.' },
        { career: 'Lighting designer', use: 'Theater, film. Color temperature, beam angles, intensity.' },
        { career: 'Telecom engineer', use: 'Cellular networks, fiber backbones, satellite links.' },
        { career: 'Radar technician', use: 'Maintain + operate weather, air-traffic, military radar.' }
      ];

      function renderColors2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 Color models'),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Different ways to describe color numerically. Each is suited to a specific medium or application.'),
          React.createElement('div', { className: 'space-y-2' },
            COLOR_MODELS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, c.model),
                  React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, c.use)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderLasersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⫸ Lasers'),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Common laser types'),
            React.createElement('div', { className: 'space-y-1' },
              LASER_TYPES.map(function(L, i) {
                return React.createElement('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, L.type),
                    React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto' }, L.wavelength + ' · ' + L.power)
                  ),
                  React.createElement('div', { className: 'text-[10px] text-slate-700' }, L.use)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Laser physics essentials'),
          React.createElement('div', { className: 'space-y-1' },
            LASER_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[11px] font-black text-cyan-900 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderFibersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '〰 Fiber optics'),
          React.createElement('div', { className: 'space-y-1' },
            FIBER_OPTICS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, f.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderProtocolsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 Wireless communication protocols'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Standard', 'Frequency band', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COMM_PROTOCOLS.map(function(p, i) {
                  return React.createElement('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, p.band),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMusicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 Music & acoustics'),
          React.createElement('div', { className: 'space-y-1' },
            MUSIC_ACOUSTICS.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, m.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.detail)
              );
            })
          )
        );
      }

      function renderHearingSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👂 The ear & hearing'),
          React.createElement('div', { className: 'space-y-2' },
            EAR_PARTS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, p.part),
                React.createElement('div', { className: 'text-[11px] text-cyan-700 font-bold mb-1' }, p.function),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          )
        );
      }

      function renderMedicalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏥 Medical imaging (wave-based)'),
          React.createElement('div', { className: 'space-y-2' },
            MEDICAL_IMAGING.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, m.method),
                  React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, m.radiation)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, 'Use: '), m.use),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderSatellitesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛰 GPS & satellite communications'),
          React.createElement('div', { className: 'space-y-1' },
            SATELLITE_FACTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, s.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      function renderGravitationalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌇ Gravitational waves'),
          React.createElement('div', { className: 'space-y-1' },
            GW_FACTS.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, g.topic),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.detail)
              );
            })
          )
        );
      }

      function renderUnitsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∑ Wave units & symbols'),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Quantity', 'Symbol', 'Unit', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                WAVE_UNITS.map(function(u, i) {
                  return React.createElement('tr', { key: 'u'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, u.quantity),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, u.symbol),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, u.unit),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, u.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCareersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 Careers using wave science'),
          React.createElement('div', { className: 'space-y-2' },
            WAVE_CAREERS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[12px] font-black text-cyan-900 mb-0.5' }, c.career),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      var __waveExpansions = React.createElement('div', { className: 'mt-4 max-w-5xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && React.createElement('div', { className: 'mt-2' }, renderActiveSection())
      );

      return React.createElement(React.Fragment, null, __waveMainView, __waveExpansions);
    }
  });


  })();