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
    icon: '🔬',
    label: 'wave',
    desc: '',
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
      return (function() {
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

            if (!canvasEl) return;

            if (canvasEl._waveInit) return;

            canvasEl._waveInit = true;

            canvasRef._lastCanvas = canvasEl;
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

                  ctx.setLineDash([]);

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
                var src1x = rippleCx - rippleSep / 2, src2x = rippleCx + rippleSep / 2;
                var rippleWL = Math.max(20, cW / (freq * 2));
                var rippleDamp = parseFloat(canvasEl.dataset.dampingCoeff || '0.002');

                // Draw interference pattern pixel by pixel using imageData for performance
                var imgData = ctx.createImageData(cW, cH);
                var data = imgData.data;
                for (var py = 0; py < cH; py += 2) {
                  for (var px = 0; px < cW; px += 2) {
                    var d1 = Math.sqrt((px - src1x) * (px - src1x) + (py - rippleCy) * (py - rippleCy));
                    var d2 = Math.sqrt((px - src2x) * (px - src2x) + (py - rippleCy) * (py - rippleCy));
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

                // Mark sources
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath(); ctx.arc(src1x, rippleCy, 5 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.beginPath(); ctx.arc(src2x, rippleCy, 5 * dpr, 0, 2 * Math.PI); ctx.fill();

                // Labels
                ctx.fillStyle = '#fff';
                ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                ctx.fillText('S\u2081', src1x - 6 * dpr, rippleCy - 10 * dpr);
                ctx.fillText('S\u2082', src2x - 6 * dpr, rippleCy - 10 * dpr);

                // Legend
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(4, 4, 180 * dpr, 36 * dpr);
                ctx.fillStyle = '#67e8f9';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('2D Ripple Tank \u2014 Two-Source Interference', 8 * dpr, 14 * dpr);
                ctx.fillText('Bright = Constructive | Dark = Destructive', 8 * dpr, 26 * dpr);

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

                // Labels
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(4, 4, 220 * dpr, 36 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Longitudinal Wave \u2014 Compression & Rarefaction', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#f472b6';
                ctx.fillText('\u223F Pressure wave (top) | Particles (center)', 8 * dpr, 26 * dpr);

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
                ctx.setLineDash([]);
                ctx.beginPath();
                for (var sx = 0; sx < cW; sx += 2) {
                  var sv = amp * Math.sin(2 * Math.PI * (sx / cW * freq - t * freq * 0.05));
                  if (showSecond) sv += amp2 * Math.sin(2 * Math.PI * (sx / cW * freq2 - t * freq2 * 0.05));
                  var sy = midY_s * 0.5 + sv * midY_s * 0.35;
                  if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.stroke();

                // Divider line
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, midY_s); ctx.lineTo(cW, midY_s); ctx.stroke();

                // Frequency domain bars (bottom half)
                var maxFreqDisp = Math.max(freq * 3, 1000);
                var freqBin = maxFreqDisp / barCount;
                for (var bi = 0; bi < barCount; bi++) {
                  var binCenterFreq = (bi + 0.5) * freqBin;
                  // Calculate magnitude: peaks at fundamental frequencies
                  var mag = 0;
                  var spread = freqBin * 0.8;
                  mag += amp * Math.exp(-Math.pow(binCenterFreq - freq, 2) / (2 * spread * spread));
                  // Add harmonics
                  mag += amp * 0.3 * Math.exp(-Math.pow(binCenterFreq - freq * 2, 2) / (2 * spread * spread));
                  mag += amp * 0.15 * Math.exp(-Math.pow(binCenterFreq - freq * 3, 2) / (2 * spread * spread));
                  if (showSecond) {
                    mag += amp2 * Math.exp(-Math.pow(binCenterFreq - freq2, 2) / (2 * spread * spread));
                    mag += amp2 * 0.3 * Math.exp(-Math.pow(binCenterFreq - freq2 * 2, 2) / (2 * spread * spread));
                  }
                  // Animate with slight jitter
                  mag *= (0.9 + 0.1 * Math.sin(t * 2 + bi));

                  var barH = Math.min(midY_s - 20, mag * midY_s * 0.8);
                  var barX = 20 + bi * barW;
                  var barY = cH - 10 - barH;

                  // Gradient color based on frequency
                  var hue = (bi / barCount) * 270;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.85)';
                  ctx.fillRect(barX, barY, barW - 2, barH);

                  // Glow cap
                  ctx.fillStyle = 'hsla(' + hue + ', 90%, 80%, 0.9)';
                  ctx.fillRect(barX, barY, barW - 2, 3 * dpr);
                }

                // Frequency axis labels
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = (5 * dpr) + 'px sans-serif';
                for (var fl = 0; fl < 5; fl++) {
                  var fLabel = Math.round(fl * maxFreqDisp / 4);
                  ctx.fillText(fLabel + ' Hz', 20 + fl * (cW - 40) / 4, cH - 2);
                }

                // Labels
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(4, 4, 230 * dpr, 36 * dpr);
                ctx.fillStyle = '#60a5fa';
                ctx.font = (7 * dpr) + 'px sans-serif';
                ctx.fillText('Spectrum Analyzer \u2014 Time \u2192 Frequency Domain', 8 * dpr, 14 * dpr);
                ctx.fillStyle = '#c084fc';
                ctx.fillText('Top: Waveform | Bottom: Frequency Spectrum (FFT)', 8 * dpr, 26 * dpr);

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

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-200" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Wave Simulator"),

              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[11px] font-bold rounded-full" }, "ANIMATED")

            ),

            // Mode tabs

            React.createElement("div", { className: "flex gap-2 mb-3" },

              [['free', '\uD83C\uDF0A Free Wave'], ['standing', '\uD83C\uDFB8 Standing'], ['ripple', '\uD83D\uDCA7 Ripple Tank'], ['longitudinal', '\u2261 Longitudinal'], ['doppler', '\uD83D\uDE97 Doppler'], ['spectrum', '\uD83D\uDCCA Spectrum']].map(function (m) {

                return React.createElement("button", { "aria-label": "Switch to " + m[1] + " mode", key: m[0], onClick: function () {
                  upd('waveMode', m[0]);
                  // Canvas Narration: mode switch
                  if (typeof canvasNarrate === 'function') {
                    var modeDescs = { free: 'Free wave mode. Observe sine, square, triangle, and sawtooth waveforms.', standing: 'Standing wave mode. See nodes and antinodes form on a vibrating string.', ripple: 'Ripple tank mode. Two point sources create interference patterns.', longitudinal: 'Longitudinal wave mode. See compression and rarefaction in a spring.', doppler: 'Doppler effect mode. A moving source shifts the observed frequency.', spectrum: 'Spectrum analysis mode. See the frequency components of your wave.' };
                    canvasNarrate('wave', 'modeSwitch', {
                      first: 'Switched to ' + m[1] + '. ' + (modeDescs[m[0]] || ''),
                      repeat: m[1] + ' mode active.',
                      terse: m[1]
                    });
                  }
                }, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (waveMode === m[0] ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50') }, m[1]);

              }),

              React.createElement("button", { "aria-label": "Toggle Sound",

                onClick: toggleSound,

                className: "ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.soundPlaying ? 'bg-emerald-700 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')

              }, d.soundPlaying ? '\uD83D\uDD0A Stop Sound' : '\uD83D\uDD08 Play Sound (' + (d.frequency * 100) + 'Hz)')

            ),

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

                React.createElement("button", { "aria-label": "Upd",

                  key: wt, onClick: () => upd('waveType', wt),

                  className: "px-2.5 py-1 rounded-lg text-xs font-bold transition-all " + ((d.waveType || 'sine') === wt ? 'bg-cyan-700 text-white shadow-md' : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100')

                }, wt.charAt(0).toUpperCase() + wt.slice(1))

              )

            ),

            // Harmonic selector (standing mode only)

            waveMode === 'standing' && React.createElement("div", { className: "flex gap-2 mb-3 items-center" },

              React.createElement("span", { className: "text-xs font-bold text-cyan-600" }, "Harmonic:"),

              [1, 2, 3, 4, 5, 6].map(function (h) {

                return React.createElement("button", { "aria-label": "Change harmonic", key: h, onClick: function () { upd('harmonic', h); }, className: "w-9 h-9 rounded-lg text-sm font-black transition-all " + ((d.harmonic || 1) === h ? 'bg-cyan-700 text-white shadow-md scale-110' : 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100') }, h);

              }),

              React.createElement("span", { className: "text-xs text-slate-600 ml-2" }, (d.harmonic || 1) + " node" + ((d.harmonic || 1) > 1 ? 's' : '') + ", " + ((d.harmonic || 1) + 1) + " antinode" + ((d.harmonic || 1) > 0 ? 's' : ''))

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

                  React.createElement("span", { className: "text-[11px] text-pink-500 font-bold" }, "A2:"),

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

              )

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

              React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 mt-1 flex justify-center items-center h-4" }, 

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

              React.createElement("p", { className: "text-[11px] text-slate-600 mt-2" }, 

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

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, "Energy"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, "\u221D A\u00B2 = " + (d.amplitude * d.amplitude).toFixed(0))

              )

            ),

            // Quiz

            React.createElement("div", { className: "flex items-center gap-2 mb-2" },

              React.createElement("button", { "aria-label": "Wave action",

                onClick: function () {

                  var q = WAVE_QUIZ[Math.floor(Math.random() * WAVE_QUIZ.length)];

                  upd('quiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.quiz && d.quiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " transition-all"

              }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),

              React.createElement("button", { "aria-label": "Wave action",

                onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  upd('matchTarget', { amp: ta, freq: tf, isEquation: false });

                  upd('matchXpClaimed', false);

                  addToast(t('stem.wave.ud83cudfaf_match_the_yellow_dashed'), 'info');

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.matchTarget && !d.matchTarget.isEquation ? 'bg-amber-100 text-amber-700' : 'bg-amber-700 text-white') + " transition-all"

              }, d.matchTarget && !d.matchTarget.isEquation ? "\uD83D\uDD04 New Target" : "\uD83C\uDFAF Match Waveform"),

              React.createElement("button", { "aria-label": "Change match target",

                onClick: function () {

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

                  var cls = !d.quiz.answered ? 'bg-white border-slate-200 hover:border-cyan-400' : isCorrect ? 'bg-emerald-100 border-emerald-300' : wasChosen ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200 opacity-50';

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
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", "aria-label": "AI wave tutor" },
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
                        className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100')
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
    }
  });


  })();