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


  // "Play Sound" oscillator lives at module scope — NOT in toolData, where the
  // live AudioContext would get captured by Snapshot's Object.assign({}, d).
  var _waveAudio = { ctx: null, osc: null, osc2: null };
  function _waveAudioStop() {
    try { if (_waveAudio.ctx) _waveAudio.ctx.close(); } catch (e) {}
    _waveAudio.ctx = null; _waveAudio.osc = null; _waveAudio.osc2 = null;
  }

  window.StemLab.registerTool('wave', {
    icon: "🌊",
    label: "Wave Simulator",
    desc: "Animate sound and water waves across Free, Standing, Ripple Tank, Reflection, Longitudinal, Doppler, and Spectrum modes.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'adjust_frequency', label: 'Experiment with wave frequency', icon: '∿', check: function(d) { return d.frequency && d.frequency !== 1; }, progress: function(d) { return d.frequency !== 1 ? 'Adjusted!' : 'Change frequency'; } },
      { id: 'try_doppler', label: 'Try Doppler effect mode', icon: '🚗', check: function(d) { return d.waveMode === 'doppler'; }, progress: function(d) { return d.waveMode === 'doppler' ? 'Exploring!' : 'Select Doppler'; } },
      { id: 'compare_waves', label: 'Compare two waves (superposition)', icon: '🔊', check: function(d) { return !!d.showSecond; }, progress: function(d) { return d.showSecond ? 'Comparing!' : 'Enable second wave'; } }
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };

      // ── Tool body (wave) ──
      // Guard: ensure wave state exists (main module doesn't pre-init plugin state)
      if (!labToolData || !labToolData.wave) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { wave: {
              frequency: 2, amplitude: 50, waveType: 'sine',
              waveMode: 'free', waveSpeed: 343, showSecond: false,
              amplitude2: 30, frequency2: 3, phase2: 0, harmonic: 1,
              damping: false, dampingAlpha: 0.5,
              paused: (function() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } })()
            }});
          });
        }
        return h('div', { className: 'p-8 text-center text-slate-600' }, __alloT('stem.wave.loading', 'Loading Wave Simulator…'));
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
          var displayAmp = d.amplitude || 50;
          var displayFreq = d.frequency || 2;
          var displaySpeed = d.speed || 1;
          var displayMediumSpeed = d.waveSpeed || 343;
          var displayWavelength = displayMediumSpeed / displayFreq;
          var displayPeriod = 1 / displayFreq;
          var activeWaveType = d.waveType || 'sine';
          var WAVE_VIEW_META = {
            free: { label: __alloT('stem.wave.mode_free_label', 'Free wave'), accent: '#22d3ee', chip: __alloT('stem.wave.mode_free_chip', 'Waveform lab') },
            standing: { label: __alloT('stem.wave.mode_standing_label', 'Standing'), accent: '#a855f7', chip: __alloT('stem.wave.mode_standing_chip', 'Nodes + antinodes') },
            ripple: { label: __alloT('stem.wave.mode_ripple_label', 'Ripple tank'), accent: '#60a5fa', chip: __alloT('stem.wave.mode_ripple_chip', 'Interference field') },
            reflection: { label: __alloT('stem.wave.mode_reflection_label', 'Reflection'), accent: '#f59e0b', chip: __alloT('stem.wave.mode_reflection_chip', 'Boundary lab') },
            longitudinal: { label: __alloT('stem.wave.mode_longitudinal_label', 'Longitudinal'), accent: '#fb923c', chip: __alloT('stem.wave.mode_longitudinal_chip', 'Compression map') },
            doppler: { label: __alloT('stem.wave.mode_doppler_label', 'Doppler'), accent: '#fb7185', chip: __alloT('stem.wave.mode_doppler_chip', 'Motion shift') },
            spectrum: { label: __alloT('stem.wave.mode_spectrum_label', 'Spectrum'), accent: '#34d399', chip: __alloT('stem.wave.mode_spectrum_chip', 'Frequency analyzer') }
          };
          var waveViewMeta = WAVE_VIEW_META[waveMode] || WAVE_VIEW_META.free;

          // Interference readout for the second-wave row. Equal frequencies
          // interfere per the PHASE offset (φ₂≈0 constructive, φ₂≈π destructive);
          // nearly-equal frequencies produce beats at |f₁−f₂|.
          var interferenceLabel = null;
          if (d.showSecond) {
            var _f1 = d.frequency || 2, _f2 = d.frequency2 || 3;
            var _a1 = d.amplitude || 50, _a2 = d.amplitude2 || 30;
            if (_f1 === _f2) {
              var _phN = (((d.phase2 || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              if (Math.min(_phN, Math.PI * 2 - _phN) < 0.35) interferenceLabel = Math.abs(_a1 - _a2) < 1 ? __alloT('stem.wave.interference_full_constructive', 'Full constructive') : __alloT('stem.wave.interference_partial_constructive', 'Partial constructive');
              else if (Math.abs(_phN - Math.PI) < 0.35) interferenceLabel = Math.abs(_a1 - _a2) < 1 ? __alloT('stem.wave.interference_full_destructive', 'Full destructive') : __alloT('stem.wave.interference_partial_destructive', 'Partial destructive');
              else interferenceLabel = __alloT('stem.wave.interference_partial', 'Partial') + ' (φ₂ = ' + (_phN / Math.PI).toFixed(1) + 'π)';
            } else if (Math.abs(_f1 - _f2) <= 1) {
              interferenceLabel = __alloT('stem.wave.interference_beats', 'Beats — pulses at') + ' ' + Math.abs(_f1 - _f2).toFixed(1) + ' Hz (|f₁−f₂|)';
            } else interferenceLabel = __alloT('stem.wave.interference_complex', 'Complex');
          }

          var timbreNote = activeWaveType === 'sine' ? __alloT('stem.wave.timbre_sine', 'Pure sine — ONE frequency, no harmonics')
            : activeWaveType === 'square' ? __alloT('stem.wave.timbre_square', 'Square — odd harmonics (1f, 3f, 5f…), ~1/n')
            : activeWaveType === 'triangle' ? __alloT('stem.wave.timbre_triangle', 'Triangle — odd harmonics fading fast (~1/n²)')
            : __alloT('stem.wave.timbre_sawtooth', 'Sawtooth — ALL harmonics (1f, 2f, 3f…), ~1/n');



          // (Match Waveform XP check — single definition lives below, next to toggleSound.)

          // Canvas-based animated wave

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {
              // React re-fires inline callback refs on EVERY re-render (null, then node).
              // Only tear down when the canvas actually left the DOM (real unmount) —
              // tearing down on a mere re-render reset the whole animation (tick → 0,
              // scene re-randomized) on every slider move: the canvas-stutter bug.
              // On real unmount the draw loop's own contains() check also cleans up,
              // so this branch is belt-and-braces for the frame gap.
              try {
                var _prevCv = canvasRef._lastCanvas;
                if (_prevCv && !document.body.contains(_prevCv)) {
                  if (_prevCv._waveCleanup) _prevCv._waveCleanup();
                  else {
                    if (_prevCv._waveAnim) { cancelAnimationFrame(_prevCv._waveAnim); _prevCv._waveAnim = null; }
                    if (_prevCv._wavePointerUp) { window.removeEventListener('mouseup', _prevCv._wavePointerUp); window.removeEventListener('touchend', _prevCv._wavePointerUp); _prevCv._wavePointerUp = null; }
                  }
                  _waveAudioStop();
                }
              } catch (e) {}
              return;
            }

            // Stamp _lastCanvas on THIS render's ref fn before the re-fire early-return —
            // the Step/Reset buttons read canvasRef._lastCanvas from the current render.
            canvasRef._lastCanvas = canvasEl;

            if (canvasEl._waveInit) return;

            canvasEl._waveInit = true;

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
              var hd = canvasEl._drag.activeHandle;
              canvasEl._drag.activeHandle = null;
              canvasEl.style.cursor = '';
              // Persist as canvas-size fractions so positions survive remounts and
              // the reflection wall slider tracks where the wall was dragged.
              try {
                if (hd === 'r1' && canvasEl._drag.ripple1) upd('rippleSrc1', { x: canvasEl._drag.ripple1.x / canvasEl.width, y: canvasEl._drag.ripple1.y / canvasEl.height });
                else if (hd === 'r2' && canvasEl._drag.ripple2) upd('rippleSrc2', { x: canvasEl._drag.ripple2.x / canvasEl.width, y: canvasEl._drag.ripple2.y / canvasEl.height });
                else if (hd === 'wall' && canvasEl._drag.wallX != null) upd('wallFrac', Math.round(canvasEl._drag.wallX / canvasEl.width * 100) / 100);
              } catch (e) {}
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
              first: __alloT('stem.wave.narrate_init_first', 'Wave Simulator loaded. An underwater ocean scene shows animated waves. Adjust amplitude and frequency with sliders. Switch between Free Wave, Standing, Ripple Tank, Longitudinal, Doppler, and Spectrum modes.'),
              repeat: __alloT('stem.wave.narrate_ready', 'Wave Simulator ready.'),
              terse: __alloT('stem.wave.narrate_ready', 'Wave Simulator ready.')
            });

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            // Restore persisted drag positions (ripple sources / reflection wall).
            if (d.rippleSrc1) canvasEl._drag.ripple1 = { x: d.rippleSrc1.x * cW, y: d.rippleSrc1.y * cH };
            if (d.rippleSrc2) canvasEl._drag.ripple2 = { x: d.rippleSrc2.x * cW, y: d.rippleSrc2.y * cH };
            if (d.wallFrac != null) canvasEl._drag.wallX = d.wallFrac * cW;

            var ctx = canvasEl.getContext('2d');
            if (!ctx) {
              canvasEl.removeEventListener('mousedown', onPointerDown);
              canvasEl.removeEventListener('mousemove', onPointerMove);
              canvasEl.removeEventListener('touchstart', onPointerDown);
              canvasEl.removeEventListener('touchmove', onPointerMove);
              window.removeEventListener('mouseup', onPointerUp);
              window.removeEventListener('touchend', onPointerUp);
              canvasEl._wavePointerUp = null;
              canvasEl._waveInit = false;
              return;
            }

            var dpr = 2;

            var tick = 0;
            var waveAlive = true;
            var waveMotionReduced = false;
            try { waveMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isWaveHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelWaveFrame() {
              if (canvasEl._waveAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._waveAnim);
              canvasEl._waveAnim = null;
            }

            function scheduleWaveFrame() {
              if (!waveAlive || canvasEl._waveAnim || isWaveHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvasEl._waveAnim = requestAnimationFrame(draw);
            }

            function cleanupWaveCanvas() {
              waveAlive = false;
              cancelWaveFrame();
              canvasEl.removeEventListener('mousedown', onPointerDown);
              canvasEl.removeEventListener('mousemove', onPointerMove);
              canvasEl.removeEventListener('touchstart', onPointerDown);
              canvasEl.removeEventListener('touchmove', onPointerMove);
              window.removeEventListener('mouseup', onPointerUp);
              window.removeEventListener('touchend', onPointerUp);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onWaveVisibilityChange);
              canvasEl._wavePointerUp = null;
              canvasEl._waveCleanup = null;
              canvasEl._waveInit = false;
              _waveAudioStop();
            }

            function onWaveVisibilityChange() {
              if (!waveAlive) return;
              if (!document.body.contains(canvasEl)) { cleanupWaveCanvas(); return; }
              if (isWaveHidden()) cancelWaveFrame();
              else { cancelWaveFrame(); draw(); }
            }

            canvasEl._waveCleanup = cleanupWaveCanvas;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onWaveVisibilityChange);



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



            // Step-while-paused hook (Pause/Step buttons + Space key live in React;
            // tick is closure-local, so expose a nudge function on the element).
            canvasEl._waveStep = function (n) { tick += n; };

            function draw() {
              if (!waveAlive) return;
              canvasEl._waveAnim = null;
              if (!document.body.contains(canvasEl)) { cleanupWaveCanvas(); return; }
              if (isWaveHidden()) { cancelWaveFrame(); return; }
              var isPaused = canvasEl.dataset.paused === 'true';
              if (!isPaused) tick += waveMotionReduced ? 0.2 : 1;
              var t = tick;

              // Scene policy: the underwater diorama supports free/longitudinal/
              // reflection. Ripple overwrites every pixel via putImageData (drawing
              // the scene first was pure wasted work), and the analytic plot modes
              // (standing/doppler/spectrum) keep just the gradient so the physics
              // reads cleanly.
              var mode0 = canvasEl.dataset.waveMode || 'free';
              var sceneRich = (mode0 === 'free' || mode0 === 'longitudinal' || mode0 === 'reflection');

              ctx.clearRect(0, 0, cW, cH);



              // ── Underwater ocean gradient ──

              if (mode0 !== 'ripple') {

              var oceanGrad = ctx.createLinearGradient(0, 0, 0, cH);

              oceanGrad.addColorStop(0, '#064e6e');

              oceanGrad.addColorStop(0.08, '#0a6a8a');

              oceanGrad.addColorStop(0.3, '#0c7d9e');

              oceanGrad.addColorStop(0.65, '#0a5f7d');

              oceanGrad.addColorStop(0.85, '#083f58');

              oceanGrad.addColorStop(1, '#052e42');

              ctx.fillStyle = oceanGrad;

              ctx.fillRect(0, 0, cW, cH);

              }



              // ── Surface shimmer line ──

              if (sceneRich) {

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

                if (!isPaused) {
                  pl.x += pl.vx + Math.sin(tick * 0.003 + pl.phase) * 0.1;
                  pl.y += pl.vy;
                  if (pl.x < 0) pl.x = cW; if (pl.x > cW) pl.x = 0;
                  if (pl.y < cH * 0.1) pl.y = cH * 0.8; if (pl.y > cH * 0.85) pl.y = cH * 0.1;
                }

                ctx.globalAlpha = 0.3 + Math.sin(tick * 0.01 + pk) * 0.15;

                ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = '#a0e8c0'; ctx.fill();

              }

              ctx.globalAlpha = 1;

              ctx.restore();

              }



              // ── Medium particles (water molecules oscillating with wave) ──
              // Free mode only — they animate the FREE-wave equation, which would
              // contradict what the other modes are showing.

              if (mode0 === 'free') {

              ctx.save();

              var mAmp = parseFloat(canvasEl.dataset.amp || '50');

              var mFreq = parseFloat(canvasEl.dataset.freq || '2');

              var mSpeed = parseFloat(canvasEl.dataset.speed || '1');

              for (var mi = 0; mi < _mediumParticles.length; mi++) {

                var mPart = _mediumParticles[mi];

                var mWaveT = mPart.x / cW * Math.PI * 2 * mFreq - tick * 0.04 * mFreq * mSpeed;

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

              }



              // ── Rising bubbles ──

              if (sceneRich) {

              ctx.save();

              for (var bj = 0; bj < _bubbles.length; bj++) {

                var bub = _bubbles[bj];

                if (!isPaused) {
                  bub.y -= bub.speed;
                  bub.x += Math.sin(tick * 0.006 + bub.wobble) * bub.wobbleAmp;
                  if (bub.y < cH * 0.03) { bub.y = cH * 0.9 + Math.random() * cH * 0.1; bub.x = Math.random() * cW; }
                }

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

              }



              // ── Measurement grid (subtle overlay) ──

              if (mode0 !== 'ripple') {

              ctx.strokeStyle = 'rgba(255,255,255,0.05)';

              ctx.lineWidth = 0.5;

              for (var gx = 0; gx < cW; gx += 30 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cH); ctx.stroke(); }

              for (var gy = 0; gy < cH; gy += 30 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }

              // Center line

              ctx.strokeStyle = 'rgba(255,255,255,0.2)';

              ctx.setLineDash([8, 4]);

              ctx.beginPath(); ctx.moveTo(0, cH / 2); ctx.lineTo(cW, cH / 2); ctx.stroke();

              ctx.setLineDash([]);

              }

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

              var accent = canvasEl.dataset.accent || '#22d3ee';

              var harmonic = parseInt(canvasEl.dataset.harmonic || '1', 10);



              // Wave value function

              function waveVal(t, type) {

                if (type === 'sine') return Math.sin(t);

                if (type === 'square') return Math.sign(Math.sin(t));

                if (type === 'triangle') return Math.asin(Math.sin(t)) * 2 / Math.PI;

                return (t % (Math.PI * 2)) / Math.PI - 1;

              }



              if (currentMode === 'standing') {
                var n = harmonic;
                var standMid = cH / 2;
                var standPhase = Math.cos(tick * 0.05 * speed);
                var lobeWidth = cW / n;

                // Antinode energy wells give every resonant lobe a dimensional
                // center without obscuring the mathematical envelope.
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                for (var lk = 0; lk < n; lk++) {
                  var lcx = (lk + 0.5) * lobeWidth;
                  var lobeR = Math.min(lobeWidth * 0.44, amp * dpr * 1.25 + 28 * dpr);
                  var lobeGlow = ctx.createRadialGradient(lcx, standMid, 0, lcx, standMid, lobeR);
                  lobeGlow.addColorStop(0, 'rgba(167,139,250,0.20)');
                  lobeGlow.addColorStop(0.38, 'rgba(34,211,238,0.10)');
                  lobeGlow.addColorStop(1, 'rgba(34,211,238,0)');
                  ctx.fillStyle = lobeGlow;
                  ctx.beginPath(); ctx.arc(lcx, standMid, lobeR, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();

                function traceStandingEnvelope(sign) {
                  ctx.beginPath();
                  for (var ex = 0; ex < cW; ex++) {
                    var envY = Math.sin(n * Math.PI * ex / cW) * amp * dpr * sign;
                    var envPy = standMid - envY;
                    if (ex === 0) ctx.moveTo(ex, envPy); else ctx.lineTo(ex, envPy);
                  }
                }

                // Filled maximum-displacement envelope.
                ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = accent;
                traceStandingEnvelope(1);
                for (var ex2 = cW - 1; ex2 >= 0; ex2--) ctx.lineTo(ex2, standMid + Math.sin(n * Math.PI * ex2 / cW) * amp * dpr);
                ctx.closePath(); ctx.fill(); ctx.restore();

                // Fine dashed envelope boundaries keep maximum displacement visible.
                ctx.save(); ctx.globalAlpha = 0.42; ctx.strokeStyle = accent; ctx.lineWidth = 1 * dpr; ctx.setLineDash([5*dpr,5*dpr]);
                traceStandingEnvelope(1); ctx.stroke(); traceStandingEnvelope(-1); ctx.stroke(); ctx.restore();

                // Node planes remain fixed while the lobes oscillate.
                ctx.save();
                for (var nk = 0; nk <= n; nk++) {
                  var nodeX = nk * cW / n;
                  var nodeGrad = ctx.createLinearGradient(nodeX, standMid-amp*dpr*1.25, nodeX, standMid+amp*dpr*1.25);
                  nodeGrad.addColorStop(0,'rgba(248,113,113,0)'); nodeGrad.addColorStop(.5,'rgba(248,113,113,.42)'); nodeGrad.addColorStop(1,'rgba(248,113,113,0)');
                  ctx.strokeStyle=nodeGrad; ctx.lineWidth=1*dpr; ctx.beginPath(); ctx.moveTo(nodeX,standMid-amp*dpr*1.25); ctx.lineTo(nodeX,standMid+amp*dpr*1.25); ctx.stroke();
                }
                ctx.restore();

                function traceStandingWave() {
                  ctx.beginPath();
                  for (var sxw = 0; sxw < cW; sxw++) {
                    var standY = Math.sin(n * Math.PI * sxw / cW) * standPhase * amp * dpr;
                    var standPy = standMid - standY;
                    if (sxw === 0) ctx.moveTo(sxw, standPy); else ctx.lineTo(sxw, standPy);
                  }
                }
                ctx.strokeStyle=accent; ctx.shadowColor=accent;
                traceStandingWave(); ctx.save(); ctx.globalAlpha=.18; ctx.lineWidth=12*dpr; ctx.shadowBlur=24; ctx.stroke(); ctx.restore();
                traceStandingWave(); ctx.lineWidth=3*dpr; ctx.shadowBlur=10; ctx.stroke();
                traceStandingWave(); ctx.save(); ctx.globalAlpha=.3; ctx.strokeStyle='#fff'; ctx.lineWidth=.8*dpr; ctx.shadowBlur=0; ctx.stroke(); ctx.restore();
                ctx.shadowBlur=0;

                // Accessible HTML below carries the legend; compact N/A marks stay
                // on-canvas as direct spatial labels.
                ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(11*dpr)+'px sans-serif';
                for (var k = 0; k <= n; k++) {
                  var nx = k*cW/n;
                  ctx.shadowColor='#ef4444'; ctx.shadowBlur=10; ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(nx,standMid,5*dpr,0,Math.PI*2); ctx.fill();
                  ctx.shadowBlur=0; ctx.fillStyle='#fff'; var nodeLabelX=Math.max(9*dpr,Math.min(cW-9*dpr,nx)); ctx.fillText('N',nodeLabelX,standMid-11*dpr);
                }
                for (var ak = 0; ak < n; ak++) {
                  var anx=(ak+.5)*cW/n;
                  var pulseR=(4+1.2*Math.abs(standPhase))*dpr;
                  ctx.shadowColor='#22c55e'; ctx.shadowBlur=12; ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(anx,standMid,pulseR,0,Math.PI*2); ctx.fill();
                  ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.fillText('A',anx,standMid-11*dpr);
                }
                ctx.textAlign='start'; ctx.textBaseline='alphabetic';

              } else if (currentMode === 'free') {
                // Free wave mode
                // Draw main wave as a layered instrument trace.
                ctx.lineWidth = 3 * dpr;
                ctx.strokeStyle = accent;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 8;
                function tracePrimaryWave() {
                  ctx.beginPath();
                  for (var x = 0; x < cW; x++) {
                    var wt = x / cW * Math.PI * 2 * freq - tick * 0.04 * freq * speed;
                    var wy = waveVal(wt, waveType);
                    if (dampOn) wy *= Math.exp(-dampAlpha * (x / cW) * 3);
                    var wpy = cH / 2 - wy * amp * dpr;
                    if (x === 0) ctx.moveTo(x, wpy); else ctx.lineTo(x, wpy);
                  }
                }
                tracePrimaryWave();
                ctx.lineTo(cW, cH / 2); ctx.lineTo(0, cH / 2); ctx.closePath();
                ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = accent; ctx.fill(); ctx.restore();
                tracePrimaryWave();
                ctx.save(); ctx.globalAlpha = 0.18; ctx.lineWidth = 11 * dpr; ctx.shadowBlur = 22; ctx.stroke(); ctx.restore();
                tracePrimaryWave();
                ctx.lineWidth = 3 * dpr; ctx.globalAlpha = 1; ctx.shadowBlur = 8; ctx.stroke();
                tracePrimaryWave();
                ctx.save(); ctx.globalAlpha = 0.32; ctx.lineWidth = 0.8 * dpr; ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 0; ctx.stroke(); ctx.restore();
                ctx.save();
                for (var pm = 0; pm < 9; pm++) {
                  var pmx = ((pm / 8 + tick * 0.00055 * speed) % 1) * cW;
                  var pmt = pmx / cW * Math.PI * 2 * freq - tick * 0.04 * freq * speed;
                  var pmyVal = waveVal(pmt, waveType);
                  if (dampOn) pmyVal *= Math.exp(-dampAlpha * (pmx / cW) * 3);
                  var pmy = cH / 2 - pmyVal * amp * dpr;
                  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tick * 0.025 + pm);
                  ctx.beginPath(); ctx.arc(pmx, pmy, 2.2 * dpr, 0, Math.PI * 2);
                  ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                ctx.restore();
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

                      var tt = xt / cW * Math.PI * 2 * targetFreq - tick * 0.04 * targetFreq * speed;

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

                    var t2 = x2 / (cW) * Math.PI * 2 * freq2 - tick * 0.04 * freq2 * speed + phase2Val;

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

                    // Must use the EXACT phases of the two drawn curves (incl. φ₂ and
                    // damping) or the "superposition" visibly isn't their sum.
                    var ts1 = xs / (cW) * Math.PI * 2 * freq - tick * 0.04 * freq * speed;

                    var ts2 = xs / (cW) * Math.PI * 2 * freq2 - tick * 0.04 * freq2 * speed + phase2Val;

                    var ys1 = waveVal(ts1, waveType) * amp;

                    var ys2 = Math.sin(ts2) * amp2;

                    if (dampOn) { var dEnv = Math.exp(-dampAlpha * (xs / cW) * 3); ys1 *= dEnv; ys2 *= dEnv; }

                    var combined = ys1 + ys2;

                    if (Math.abs(combined) > maxSuper) maxSuper = Math.abs(combined);

                    var pys = cH / 2 - combined * dpr;

                    if (xs === 0) ctx.moveTo(xs, pys); else ctx.lineTo(xs, pys);

                  }

                  ctx.stroke();

                  ctx.setLineDash([]); ctx.shadowBlur = 0;

                }

                // (Main/second/superposition legend moved to the HTML overlays and the
                // second-wave control row \u2014 canvas text was tiny and unlocalizable.)

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

                // Interference field rendered at ¼ resolution into a reusable
                // offscreen buffer, then scaled up with smoothing — ~4× fewer
                // per-pixel evaluations than the old full-res 2px-step loop,
                // which mattered on school Chromebooks. Color mapping unchanged.
                var rBW = Math.max(80, Math.round(cW / 4)), rBH = Math.max(60, Math.round(cH / 4));
                if (!canvasEl._rippleBuf || canvasEl._rippleBuf.width !== rBW || canvasEl._rippleBuf.height !== rBH) {
                  canvasEl._rippleBuf = document.createElement('canvas');
                  canvasEl._rippleBuf.width = rBW; canvasEl._rippleBuf.height = rBH;
                }
                var rbCtx = canvasEl._rippleBuf.getContext('2d');
                var imgData = rbCtx.createImageData(rBW, rBH);
                var data = imgData.data;
                var rSc = cW / rBW;
                for (var py = 0; py < rBH; py++) {
                  for (var px = 0; px < rBW; px++) {
                    var rcx = px * rSc, rcy = py * rSc;
                    var d1 = Math.sqrt((rcx - src1x) * (rcx - src1x) + (rcy - src1y) * (rcy - src1y));
                    var d2 = Math.sqrt((rcx - src2x) * (rcx - src2x) + (rcy - src2y) * (rcy - src2y));
                    var v1 = amp * Math.sin(2 * Math.PI * (d1 / rippleWL - t * freq * 0.05)) * Math.exp(-rippleDamp * d1);
                    var v2 = amp * Math.sin(2 * Math.PI * (d2 / rippleWL - t * freq * 0.05)) * Math.exp(-rippleDamp * d2);
                    var vSum = (v1 + v2) / 2;
                    // Diverging water-light palette: deep indigo troughs, dark
                    // equilibrium water, and cyan-white constructive crests.
                    var norm = Math.max(-1, Math.min(1, vSum / Math.max(1, amp)));
                    var idx = (py * rBW + px) * 4;
                    if (norm >= 0) {
                      var crest = Math.pow(norm, 0.72);
                      data[idx] = Math.floor(8 + crest * 230);
                      data[idx + 1] = Math.floor(62 + crest * 190);
                      data[idx + 2] = Math.floor(118 + crest * 137);
                    } else {
                      var trough = Math.pow(-norm, 0.78);
                      data[idx] = Math.floor(7 + (1 - trough) * 13);
                      data[idx + 1] = Math.floor(18 + (1 - trough) * 55);
                      data[idx + 2] = Math.floor(52 + (1 - trough) * 90);
                    }
                    data[idx + 3] = 255;
                  }
                }
                rbCtx.putImageData(imgData, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(canvasEl._rippleBuf, 0, 0, cW, cH);
                // Overlay physically aligned crest contours. They preserve the
                // interference field beneath while giving each source real depth.
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                var maxRippleR = Math.hypot(cW, cH);
                var crestPhaseR = (t * freq * 0.05 * rippleWL) % rippleWL;
                function drawCrestContours(cx, cy) {
                  for (var wr = crestPhaseR; wr < maxRippleR; wr += rippleWL) {
                    var wrAlpha = Math.max(0.025, 0.24 * Math.exp(-rippleDamp * wr));
                    ctx.globalAlpha = wrAlpha;
                    ctx.strokeStyle = '#b8f3ff';
                    ctx.lineWidth = (wr < rippleWL * 2 ? 1.35 : 0.75) * dpr;
                    ctx.beginPath(); ctx.arc(cx, cy, wr, 0, Math.PI * 2); ctx.stroke();
                  }
                }
                drawCrestContours(src1x, src1y);
                drawCrestContours(src2x, src2y);
                ctx.restore();

                // Mark sources with prominent drag handles (rendered larger
                // when the user is hovering or dragging them).
                var active = canvasEl._drag.activeHandle;
                function drawSourceHandle(x, y, label, isActive) {
                  var sourceGlow = ctx.createRadialGradient(x, y, 0, x, y, 28 * dpr);
                  sourceGlow.addColorStop(0, isActive ? 'rgba(255,255,255,0.72)' : 'rgba(255,120,100,0.52)');
                  sourceGlow.addColorStop(0.25, 'rgba(255,95,95,0.22)');
                  sourceGlow.addColorStop(1, 'rgba(255,95,95,0)');
                  ctx.fillStyle = sourceGlow;
                  ctx.beginPath(); ctx.arc(x, y, 28 * dpr, 0, Math.PI * 2); ctx.fill();
                  // Outer pulsing ring (hint that it's draggable)
                  var ringR = 14 * dpr * (1 + 0.15 * Math.sin(t * 0.1));
                  ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,107,107,0.5)';
                  ctx.lineWidth = isActive ? 2 * dpr : 1.5 * dpr;
                  ctx.beginPath(); ctx.arc(x, y, ringR, 0, 2 * Math.PI); ctx.stroke();
                  // Solid core
                  ctx.fillStyle = '#ff6b6b';
                  ctx.beginPath(); ctx.arc(x, y, 7 * dpr, 0, 2 * Math.PI); ctx.fill();
                  ctx.fillStyle = '#fff';
                  ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
                }
                drawSourceHandle(src1x, src1y, 'S\u2081', active === 'r1');
                drawSourceHandle(src2x, src2y, 'S\u2082', active === 'r2');

                // (Legend moved to the ripple controls row below the canvas.)

              } else if (currentMode === 'longitudinal') {
                // ========== LONGITUDINAL WAVE MODE ==========
                var numParticles = 60;
                var particleSpacing = cW / (numParticles + 1);
                // Max displacement = 1/k so particle paths never cross (matter can't
                // pass through itself); A slider maps 0–100 → 0–100% of that limit.
                // (Old amp*15*dpr gave ~1500px swings — pure visual noise.)
                var longAmp = (amp / 100) * cW / (2 * Math.PI * freq);
                var midY = cH / 2;

                // Moving pressure field behind the particles: warm bands are
                // compressions, cool bands are rarefactions.
                ctx.save();
                var tubeTop=midY-40*dpr, tubeHeight=80*dpr, pressureBands=96, bandW=cW/pressureBands;
                for(var bi=0;bi<pressureBands;bi++){
                  var bx=bi*bandW, bp=-Math.cos(2*Math.PI*(bx/cW*freq-t*freq*.05));
                  var bandAlpha=.035+.13*Math.abs(bp);
                  ctx.fillStyle=bp>0?'rgba(251,113,133,'+bandAlpha.toFixed(3)+')':'rgba(59,130,246,'+bandAlpha.toFixed(3)+')';
                  ctx.fillRect(bx,tubeTop,bandW+1,tubeHeight);
                }
                var glassGrad=ctx.createLinearGradient(0,tubeTop,0,tubeTop+tubeHeight);
                glassGrad.addColorStop(0,'rgba(255,255,255,.15)');glassGrad.addColorStop(.18,'rgba(255,255,255,.02)');glassGrad.addColorStop(.82,'rgba(0,15,35,.04)');glassGrad.addColorStop(1,'rgba(0,8,24,.22)');
                ctx.fillStyle=glassGrad;ctx.fillRect(10,tubeTop,cW-20,tubeHeight);
                ctx.restore();
                // Draw tube outline
                ctx.strokeStyle = 'rgba(100,200,255,0.15)';
                ctx.lineWidth = 1;
                ctx.strokeRect(10, midY - 40 * dpr, cW - 20, 80 * dpr);

                // Pressure graph (top)
                function tracePressureGraph(){
                  ctx.beginPath();
                  for(var lx=0;lx<cW;lx+=2){var pressure=-Math.cos(2*Math.PI*(lx/cW*freq-t*freq*.05))*amp*.5;var py_p=midY-60*dpr+pressure*40*dpr;if(lx===0)ctx.moveTo(lx,py_p);else ctx.lineTo(lx,py_p);}
                }
                ctx.setLineDash([]);ctx.strokeStyle='#f472b6';ctx.shadowColor='#f472b6';
                tracePressureGraph();ctx.save();ctx.globalAlpha=.16;ctx.lineWidth=10*dpr;ctx.shadowBlur=20;ctx.stroke();ctx.restore();
                tracePressureGraph();ctx.lineWidth=2*dpr;ctx.shadowBlur=8;ctx.stroke();
                tracePressureGraph();ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle='#fff';ctx.lineWidth=.7*dpr;ctx.shadowBlur=0;ctx.stroke();ctx.restore();ctx.shadowBlur=0;

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
                  var particleRGB = localDensity > 1.08 ? '251,113,133' : '96,165,250';
                  ctx.strokeStyle = 'rgba(' + particleRGB + ',' + alpha.toFixed(2) + ')';
                  ctx.shadowColor = localDensity > 1.08 ? '#fb7185' : '#60a5fa';
                  ctx.shadowBlur = Math.max(2, localDensity * 5 * dpr);
                  ctx.lineWidth = Math.max(1, localDensity * 3 * dpr);
                  ctx.beginPath(); ctx.moveTo(drawX, midY - 30 * dpr); ctx.lineTo(drawX, midY + 30 * dpr); ctx.stroke();
                  ctx.shadowBlur = 0; ctx.globalAlpha = Math.min(1, .25 + localDensity * .35);
                  ctx.fillStyle = localDensity > 1.08 ? '#fecdd3' : '#bfdbfe';
                  ctx.beginPath(); ctx.arc(drawX, midY, Math.max(1.8, localDensity * 1.8) * dpr, 0, Math.PI * 2); ctx.fill();
                  ctx.globalAlpha = 1;
                }

                // The pressure pattern travels right even though each material
                // particle only oscillates around its own equilibrium position.
                ctx.save();ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=1.3*dpr;ctx.lineCap='round';
                var longArrowOffset=(tick*.9*speed)%(100*dpr);
                for(var la=25*dpr+longArrowOffset;la<cW-20*dpr;la+=100*dpr){ctx.beginPath();ctx.moveTo(la-8*dpr,midY+34*dpr);ctx.lineTo(la+8*dpr,midY+34*dpr);ctx.lineTo(la+3*dpr,midY+30*dpr);ctx.moveTo(la+8*dpr,midY+34*dpr);ctx.lineTo(la+3*dpr,midY+38*dpr);ctx.stroke();}
                ctx.restore();
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
                ctx.save();
                ctx.strokeStyle='rgba(251,191,36,.72)';ctx.lineWidth=1.5*dpr;
                ctx.beginPath();ctx.moveTo(_trBaseX,midY);ctx.lineTo(_trX,midY);ctx.stroke();
                var tracerDir=_trX>=_trBaseX?1:-1;
                ctx.beginPath();ctx.moveTo(_trX,midY);ctx.lineTo(_trX-tracerDir*5*dpr,midY-3*dpr);ctx.moveTo(_trX,midY);ctx.lineTo(_trX-tracerDir*5*dpr,midY+3*dpr);ctx.stroke();
                ctx.restore();

                // (Legend + gold-tracer note moved to HTML overlay chips.)

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
                ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                ctx.fillText('S', sourceX - 3 * dpr, midY_d + 2 * dpr);

                // Draw observer (right side)
                var obsX = cW - 40 * dpr;
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(obsX, midY_d, 8 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText('O', obsX - 3 * dpr, midY_d + 2 * dpr);

                // Audible Doppler: if a tone is playing, bend its pitch to the
                // shifted frequency the right-side observer hears \u2014 higher while
                // the source approaches, dropping as it passes. (f\u2032 values are
                // shown in the HTML chips in the Doppler controls row.)
                if (_waveAudio.osc && _waveAudio.ctx) {
                  var _dShift = sourceX < obsX ? freq / (1 - Math.min(sourceSpeed, 0.95)) : freq / (1 + sourceSpeed);
                  try { _waveAudio.osc.frequency.setTargetAtTime(_dShift * 100, _waveAudio.ctx.currentTime, 0.08); } catch (e) {}
                }

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

                // (Timbre note moved to an HTML chip under the canvas.)

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

                // Directional energy fields separate the incoming and returning
                // components before their curves superpose.
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                var incidentField = ctx.createLinearGradient(0, 0, wallX, 0);
                incidentField.addColorStop(0, 'rgba(59,130,246,0.04)');
                incidentField.addColorStop(1, 'rgba(59,130,246,0.17)');
                ctx.fillStyle = incidentField; ctx.fillRect(0, 0, wallX, cH);
                var reflectedField = ctx.createLinearGradient(wallX, 0, 0, 0);
                reflectedField.addColorStop(0, 'rgba(244,114,182,' + (0.16 * refReflectivity).toFixed(3) + ')');
                reflectedField.addColorStop(1, 'rgba(244,114,182,0.02)');
                ctx.fillStyle = reflectedField; ctx.fillRect(0, 0, wallX, cH);
                ctx.restore();
                // Build the incident + reflected wave at each x position.
                // For x < wallX:
                //   incident y_i(x,t) = A sin(k x - ω t)
                //   reflected y_r(x,t) = phaseFlip * R * A sin(k (2*wallX - x) - ω t)
                //                        = phaseFlip * R * A sin(k (2*wallX - x) - ω t)
                // For x > wallX: no wave (transmitted = 0 — perfect wall).
                function traceCombinedReflection() {
                  ctx.beginPath();
                  var started = false;
                  for (var rx = 0; rx < wallX; rx += 2) {
                    var phaseIn = k * rx - omega * t;
                    var phaseRe = k * (2 * wallX - rx) - omega * t;
                    var yi = Math.sin(phaseIn);
                    var yre = phaseFlip * refReflectivity * Math.sin(phaseRe);
                    var ry = midY_r - (yi + yre) * refAmp;
                    if (!started) { ctx.moveTo(rx, ry); started = true; } else ctx.lineTo(rx, ry);
                  }
                }
                ctx.strokeStyle=accent; ctx.shadowColor=accent;
                traceCombinedReflection(); ctx.save(); ctx.globalAlpha=.18; ctx.lineWidth=12*dpr; ctx.shadowBlur=24; ctx.stroke(); ctx.restore();
                traceCombinedReflection(); ctx.lineWidth=3*dpr; ctx.globalAlpha=1; ctx.shadowBlur=8; ctx.stroke();
                traceCombinedReflection(); ctx.save(); ctx.globalAlpha=.3; ctx.strokeStyle='#fff'; ctx.lineWidth=.8*dpr; ctx.shadowBlur=0; ctx.stroke(); ctx.restore();
                ctx.shadowBlur=0;

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

                // Animated energy-direction chevrons make travel direction explicit.
                ctx.save();
                function drawEnergyArrow(ax, ay, dir, color, alpha) {
                  ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=1.6*dpr; ctx.lineCap='round';
                  ctx.beginPath(); ctx.moveTo(ax-dir*8*dpr,ay); ctx.lineTo(ax+dir*8*dpr,ay); ctx.lineTo(ax+dir*3*dpr,ay-4*dpr); ctx.moveTo(ax+dir*8*dpr,ay); ctx.lineTo(ax+dir*3*dpr,ay+4*dpr); ctx.stroke();
                }
                var arrowOffset=(tick*1.2*speed)%(90*dpr);
                for(var ia=35*dpr+arrowOffset;ia<wallX-20*dpr;ia+=90*dpr)drawEnergyArrow(ia,54*dpr,1,'#60a5fa',.72);
                for(var ra=wallX-35*dpr-arrowOffset;ra>20*dpr;ra-=90*dpr)drawEnergyArrow(ra,72*dpr,-1,'#f472b6',.42+.3*refReflectivity);
                ctx.restore();

                // Boundary-impact glow tracks the instantaneous arriving amplitude.
                var impactStrength=.25+.55*Math.abs(Math.sin(k*wallX-omega*t));
                var impactGlow=ctx.createRadialGradient(wallX,midY_r,0,wallX,midY_r,55*dpr);
                impactGlow.addColorStop(0,'rgba(251,191,36,'+impactStrength.toFixed(3)+')');
                impactGlow.addColorStop(.25,'rgba(251,113,133,'+(impactStrength*.28).toFixed(3)+')');
                impactGlow.addColorStop(1,'rgba(251,191,36,0)');
                ctx.fillStyle=impactGlow;ctx.beginPath();ctx.arc(wallX,midY_r,55*dpr,0,Math.PI*2);ctx.fill();
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
                ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                ctx.fillText('⇔', wallX - 6 * dpr, midY_r + 3 * dpr);

                // End-type label near the wall
                ctx.fillStyle = endType === 'fixed' ? '#ef4444' : '#22c55e';
                ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                ctx.fillText(endType === 'fixed' ? 'FIXED END' : 'FREE END', wallX - 24 * dpr, 20 * dpr);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = (11 * dpr) + 'px sans-serif';
                ctx.fillText(endType === 'fixed' ? '(phase inverts)' : '(phase preserved)', wallX - 28 * dpr, 28 * dpr);

                // (Color key moved to the reflection controls row below the canvas.)
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

              scheduleWaveFrame();

            }

            scheduleWaveFrame();

          };



          // Sound playback — oscillators track the sliders live (see syncOsc).
          // With the second wave shown, a second oscillator plays f2 so
          // superposition (and beats, when f1≈f2) is audible, not just visible.

          var toggleSound = function () {

            if (_waveAudio.ctx) {
              _waveAudioStop();
              upd('soundPlaying', false);
              return;
            }

            try {

              var actx = new (window.AudioContext || window.webkitAudioContext)();
              var osc = actx.createOscillator();
              var gain = actx.createGain();
              osc.type = (d.waveType || 'sine');
              osc.frequency.value = d.frequency * 100;
              gain.gain.value = d.showSecond ? 0.09 : 0.15;
              osc.connect(gain);
              gain.connect(actx.destination);
              osc.start();
              _waveAudio.ctx = actx;
              _waveAudio.osc = osc;
              if (d.showSecond) {
                var osc2 = actx.createOscillator();
                var gain2 = actx.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = (d.frequency2 || 3) * 100;
                gain2.gain.value = 0.09;
                osc2.connect(gain2);
                gain2.connect(actx.destination);
                osc2.start();
                _waveAudio.osc2 = osc2;
              }
              upd('soundPlaying', true);

            } catch (e) {

              addToast(t('stem.wave.u26a0_audio_not_supported_in'), 'error');

            }

          };

          // Keep a playing tone in sync with the controls (frequency sliders,
          // waveform buttons, equation inputs, canvas arrow keys).
          var syncOsc = function (opts) {
            if (!_waveAudio.osc) return;
            try {
              if (opts.freq != null) _waveAudio.osc.frequency.value = opts.freq * 100;
              if (opts.type) _waveAudio.osc.type = opts.type;
              if (opts.freq2 != null && _waveAudio.osc2) _waveAudio.osc2.frequency.value = opts.freq2 * 100;
            } catch (e) {}
          };



          var checkWaveMatch = function(a, f) {

            if (!d.matchTarget) return;

            var pct = Math.max(0, Math.round((1 - (Math.abs(a - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(f - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

            if (pct > 90 && !d.matchXpClaimed) {

              awardStemXP('wave-match', 15, __alloT('stem.wave.xp_matched_wave', 'Matched a wave exactly!'));

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

                     'aria-label': __alloT('stem.wave.aria_wave_amplitude', 'Wave amplitude'),
                     'aria-valuetext': a + ' — ' + __alloT('stem.wave.aria_amp_valuetext', 'amplitude sets the wave height (loudness and energy)'),

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('amplitude', v); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(v, f); } catch(ex){} } },

                     className: "bg-slate-900 border border-cyan-500 text-cyan-300 rounded px-1.5 py-0.5 mx-0.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 w-16 font-mono shadow-sm",

                     min: 10, max: 100, step: 1

                 }) : React.createElement("span", {className: baseHc}, a);



             var wrapF = isInteractive ? 

                 React.createElement("input", {

                     type: "number", value: f,

                     'aria-label': __alloT('stem.wave.aria_wave_frequency', 'Wave frequency'),
                     'aria-valuetext': f + __alloT('stem.wave.aria_freq_vt_a', ' hertz, period ') + (f ? (1 / f).toFixed(2) : '∞') + __alloT('stem.wave.aria_freq_vt_b', ' seconds — frequency sets the pitch'),

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('frequency', v); syncOsc({ freq: v }); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(a, v); } catch(ex){} } },

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

          // Quiz bank \u2014 each distractor carries corrective feedback that names the
          // specific mix-up and, where possible, points at the sim mode that shows it.
          var WAVE_QUIZ = [

            { q: __alloT('stem.wave.quiz1_q', 'What happens to pitch when frequency increases?'), a: 'Goes up', opts: ['Goes up', 'Goes down', 'Stays same', 'Disappears'],
              demo: { waveMode: 'free' },
              wrongFeedback: {
                'Goes down': __alloT('stem.wave.quiz1_fb_goes_down', 'Backwards \u2014 MORE vibrations per second means HIGHER pitch. Slide frequency up with Play Sound on and listen to it climb.'),
                'Stays same': __alloT('stem.wave.quiz1_fb_stays_same', 'Pitch IS your ear\u2019s perception of frequency \u2014 change one and you have changed the other.'),
                'Disappears': __alloT('stem.wave.quiz1_fb_disappears', 'Sound only disappears when AMPLITUDE reaches zero. Frequency changes the pitch, not whether it exists.')
              } },

            { q: __alloT('stem.wave.quiz2_q', 'What does amplitude control?'), a: 'Loudness / height', opts: ['Speed', 'Loudness / height', 'Color', 'Direction'],
              demo: { waveMode: 'free' },
              wrongFeedback: {
                'Speed': __alloT('stem.wave.quiz2_fb_speed', 'Wave speed is set by the MEDIUM (air, water, string tension) \u2014 a louder shout does not arrive any sooner.'),
                'Color': __alloT('stem.wave.quiz2_fb_color', 'For light, FREQUENCY sets the color. Amplitude sets brightness \u2014 and for sound, loudness.'),
                'Direction': __alloT('stem.wave.quiz2_fb_direction', 'Direction comes from the source and reflections. Amplitude is the wave\u2019s height \u2014 how much energy it carries.')
              } },

            { q: __alloT('stem.wave.quiz3_q', 'What is superposition?'), a: 'Waves combining', opts: ['Waves combining', 'Waves canceling', 'Waves reflecting', 'Waves stopping'],
              demo: { waveMode: 'free', showSecond: true },
              wrongFeedback: {
                'Waves canceling': __alloT('stem.wave.quiz3_fb_canceling', 'Canceling is only ONE special case (destructive). Superposition is the general rule: overlapping waves ADD their displacements \u2014 sometimes bigger, sometimes smaller.'),
                'Waves reflecting': __alloT('stem.wave.quiz3_fb_reflecting', 'Reflection is a wave bouncing off a boundary. Superposition is what happens when two waves OVERLAP \u2014 try the Ripple Tank.'),
                'Waves stopping': __alloT('stem.wave.quiz3_fb_stopping', 'Waves pass straight through each other and continue unchanged \u2014 they never stop each other.')
              } },

            { q: __alloT('stem.wave.quiz4_q', 'Destructive interference occurs when...'), a: 'Peaks meet troughs', opts: ['Peaks meet peaks', 'Peaks meet troughs', 'Waves stop', 'Amplitude doubles'],
              demo: { waveMode: 'free', showSecond: true, frequency: 3, frequency2: 3, amplitude: 45, amplitude2: 45, phase2: Math.PI },
              wrongFeedback: {
                'Peaks meet peaks': __alloT('stem.wave.quiz4_fb_peaks', 'Peak-on-peak is CONSTRUCTIVE interference \u2014 the wave gets bigger. Destruction needs opposites: peak + trough = flat.'),
                'Waves stop': __alloT('stem.wave.quiz4_fb_stop', 'The waves keep traveling \u2014 they only cancel at the spots where they overlap out of phase. Watch the dark bands in the Ripple Tank.'),
                'Amplitude doubles': __alloT('stem.wave.quiz4_fb_doubles', 'Doubling is constructive interference. Destructive SUBTRACTS \u2014 a peak fills a trough.')
              } },

            { q: __alloT('stem.wave.quiz5_q', 'Sound is what type of wave?'), a: 'Longitudinal', opts: ['Transverse', 'Longitudinal', 'Circular', 'Standing'],
              demo: { waveMode: 'longitudinal' },
              wrongFeedback: {
                'Transverse': __alloT('stem.wave.quiz5_fb_transverse', 'Transverse waves wiggle PERPENDICULAR to travel (light, a guitar string). Air molecules push and pull ALONG the direction of travel \u2014 switch to Longitudinal mode and watch the compressions.'),
                'Circular': __alloT('stem.wave.quiz5_fb_circular', 'Water ripples spread in circles, but that describes the pattern on the surface, not the wave type.'),
                'Standing': __alloT('stem.wave.quiz5_fb_standing', 'Standing waves are trapped between boundaries. Traveling sound is free \u2014 it only forms standing waves inside pipes and rooms.')
              } },

            { q: __alloT('stem.wave.quiz6_q', 'At a node of a standing wave, the displacement is:'), a: 'Always zero', opts: ['Maximum', 'Always zero', 'Half maximum', 'Random'],
              demo: { waveMode: 'standing', harmonic: 3 },
              wrongFeedback: {
                'Maximum': __alloT('stem.wave.quiz6_fb_maximum', 'Maximum displacement is the ANTInode. Nodes are the still points \u2014 in Standing mode, watch the spots where the string never moves.'),
                'Half maximum': __alloT('stem.wave.quiz6_fb_half', 'Nodes are perfectly still \u2014 zero, not half. Points BETWEEN node and antinode oscillate at partial amplitude.'),
                'Random': __alloT('stem.wave.quiz6_fb_random', 'Standing waves are perfectly ordered \u2014 the nodes stay locked in place. That is exactly why they are called STANDING.')
              } },

            { q: __alloT('stem.wave.quiz7_q', 'The speed of a wave equals:'), a: 'Frequency \u00D7 Wavelength', opts: ['Amplitude \u00D7 Frequency', 'Frequency \u00D7 Wavelength', 'Period \u00D7 Amplitude', 'None of these'],
              demo: { expSection: 'discoverWave' },
              wrongFeedback: {
                'Amplitude \u00D7 Frequency': __alloT('stem.wave.quiz7_fb_amp_freq', 'Amplitude carries ENERGY, not speed. v = f \u00D7 \u03BB: waves per second \u00D7 length of each wave = distance per second.'),
                'Period \u00D7 Amplitude': __alloT('stem.wave.quiz7_fb_period_amp', 'Period is just 1/frequency and amplitude is height \u2014 multiplying them gives nothing physical. v = f \u00D7 \u03BB.'),
                'None of these': __alloT('stem.wave.quiz7_fb_none', 'One of them IS right: v = f \u00D7 \u03BB \u2014 how many waves pass per second times how long each one is.')
              } },

          ];



          return React.createElement("div", { className: "max-w-6xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            // First-run 3-step tour (self-contained; localStorage-persisted)
            (function () {
              var TOUR = [
                { icon: '🎚', text: __alloT('stem.wave.tour_step1', 'Welcome! Drag the Amplitude and Frequency sliders to shape your wave — or focus the wave itself and use the arrow keys. Space pauses.') },
                { icon: '🌊', text: __alloT('stem.wave.tour_step2', 'Switch modes above: Standing, Ripple Tank, Reflection, Longitudinal, Doppler, and Spectrum each show a different piece of wave physics.') },
                { icon: '∿', text: __alloT('stem.wave.tour_step3', 'Turn on the Second Wave to see superposition — two waves adding into one. Try the 🎵 Beats preset, then Play Sound to hear it.') }
              ];
              var seen = false;
              try { seen = !!window.localStorage.getItem('allo_wave_tour_done'); } catch (e) {}
              var step = (d.tourStep === undefined) ? (seen ? -1 : 0) : d.tourStep;
              if (step == null || step < 0 || step >= TOUR.length) return null;
              var cur = TOUR[step];
              var done = function () { try { window.localStorage.setItem('allo_wave_tour_done', '1'); } catch (e) {} upd('tourStep', -1); };
              return React.createElement("div", { role: "region", "aria-label": __alloT('stem.wave.tour_region_label', 'Getting started tips'), className: "mb-3 p-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 flex items-center gap-3 flex-wrap" },
                React.createElement("span", { className: "text-2xl", "aria-hidden": "true" }, cur.icon),
                React.createElement("p", { className: "text-xs text-cyan-900 font-semibold flex-1 min-w-[200px] m-0" }, cur.text),
                React.createElement("span", { className: "text-[10px] font-bold text-cyan-600" }, (step + 1) + '/' + TOUR.length),
                React.createElement("button", { onClick: function () { if (step + 1 >= TOUR.length) done(); else upd('tourStep', step + 1); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[0.97]" }, step + 1 >= TOUR.length ? '✓ ' + __alloT('stem.wave.tour_done', 'Done') : __alloT('stem.wave.tour_next', 'Next') + ' →'),
                React.createElement("button", { onClick: done, "aria-label": __alloT('stem.wave.tour_skip_label', 'Skip the tour'), className: "transition-colors px-2 py-1.5 rounded-lg text-xs text-cyan-700 hover:bg-cyan-100 active:scale-[0.97]" }, __alloT('stem.wave.tour_skip', 'Skip'))
              );
            })(),

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "transition-colors p-1.5 hover:bg-slate-100 rounded-lg active:scale-[0.97]", 'aria-label': __alloT('stem.wave.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800 tracking-tight" }, "\uD83C\uDF0A " + __alloT('stem.wave.title', 'Wave Simulator')),

              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[11px] font-bold rounded-full" }, __alloT('stem.wave.badge_animated', 'ANIMATED'))

            ),

            // Mode tabs

            React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 items-center" },

              [['free', '\uD83C\uDF0A ' + __alloT('stem.wave.tab_free', 'Free Wave')], ['standing', '\uD83C\uDFB8 ' + __alloT('stem.wave.mode_standing_label', 'Standing')], ['ripple', '\uD83D\uDCA7 ' + __alloT('stem.wave.tab_ripple', 'Ripple Tank')], ['reflection', '\uD83E\uDE9E ' + __alloT('stem.wave.mode_reflection_label', 'Reflection')], ['longitudinal', '\u2261 ' + __alloT('stem.wave.mode_longitudinal_label', 'Longitudinal')], ['doppler', '\uD83D\uDE97 ' + __alloT('stem.wave.mode_doppler_label', 'Doppler')], ['spectrum', '\uD83D\uDCCA ' + __alloT('stem.wave.mode_spectrum_label', 'Spectrum')]].map(function (m) {

                return React.createElement("button", { "aria-label": __alloT('stem.wave.aria_switch_to', 'Switch to ') + m[1] + __alloT('stem.wave.aria_mode_suffix', ' mode'), key: m[0], onClick: function () {
                  upd('waveMode', m[0]);
                  // Canvas Narration: mode switch
                  if (typeof canvasNarrate === 'function') {
                    var modeDescs = { free: __alloT('stem.wave.narrate_free', 'Free wave mode. Observe sine, square, triangle, and sawtooth waveforms.'), standing: __alloT('stem.wave.narrate_standing', 'Standing wave mode. See nodes and antinodes form on a vibrating string.'), ripple: __alloT('stem.wave.narrate_ripple', 'Ripple tank mode. Drag two point sources to explore interference patterns.'), reflection: __alloT('stem.wave.narrate_reflection', 'Reflection mode. A wave hits a wall — drag the wall to see fixed vs free end behavior.'), longitudinal: __alloT('stem.wave.narrate_longitudinal', 'Longitudinal wave mode. See compression and rarefaction in a spring.'), doppler: __alloT('stem.wave.narrate_doppler', 'Doppler effect mode. A moving source shifts the observed frequency.'), spectrum: __alloT('stem.wave.narrate_spectrum', 'Spectrum analysis mode. See the frequency components of your wave.') };
                    canvasNarrate('wave', 'modeSwitch', {
                      first: __alloT('stem.wave.narrate_switched_to', 'Switched to ') + m[1] + '. ' + (modeDescs[m[0]] || ''),
                      repeat: m[1] + __alloT('stem.wave.narrate_mode_active', ' mode active.'),
                      terse: m[1]
                    });
                  }
                }, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 " + (waveMode === m[0] ? 'bg-slate-900 text-white shadow-md ring-1 ring-cyan-300/70' : 'transition-colors bg-white text-slate-600 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 active:scale-[0.97]') }, m[1]);

              }),

              React.createElement("button", {
                "aria-label": d.paused ? __alloT('stem.wave.aria_play_animation', 'Play animation') : __alloT('stem.wave.aria_pause_animation', 'Pause animation (or press Space on the wave)'),
                "aria-pressed": !!d.paused,
                onClick: function () { upd('paused', !d.paused); },
                className: "sm:ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.paused ? 'bg-cyan-700 text-white shadow-sm' : 'transition-colors bg-white text-slate-600 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 active:scale-[0.97]')
              }, d.paused ? '▶ ' + __alloT('stem.wave.btn_play', 'Play') : '⏸ ' + __alloT('stem.wave.btn_pause', 'Pause')),

              d.paused && React.createElement("button", {
                "aria-label": __alloT('stem.wave.aria_step_frame', 'Step the animation forward one frame'),
                onClick: function () { var c = canvasRef._lastCanvas; if (c && c._waveStep) c._waveStep(8); },
                className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 active:scale-[0.97]"
              }, '⏭ ' + __alloT('stem.wave.btn_step', 'Step')),

              React.createElement("button", { "aria-label": __alloT('stem.wave.aria_toggle_sound', 'Toggle Sound'),

                onClick: toggleSound,

                className: "px-4 py-1.5 rounded-lg text-xs font-bold transition-all " + ((_waveAudio.ctx && d.soundPlaying) ? 'bg-emerald-700 text-white animate-pulse shadow-sm' : 'transition-colors bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.97]')

              }, (_waveAudio.ctx && d.soundPlaying) ? '\uD83D\uDD0A ' + __alloT('stem.wave.btn_stop_sound', 'Stop Sound') : '\uD83D\uDD08 ' + __alloT('stem.wave.btn_play_sound', 'Play Sound') + ' (' + (d.frequency * 100) + 'Hz)')

            ),

            // ── Topic-accent hero band per wave mode ──
            (function() {
              var MODE_META = {
                free:         { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\uD83C\uDF0A', title: __alloT('stem.wave.hero_free_title', 'Free Wave \u2014 sine, square, triangle, sawtooth'),  hint: __alloT('stem.wave.hero_free_hint', 'Pure sine = single frequency; square / triangle / sawtooth are sine sums (Fourier 1822). Each waveform sounds different at the same pitch \u2014 timbre IS the harmonic content.') },
                standing:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFB8', title: __alloT('stem.wave.hero_standing_title', 'Standing \u2014 nodes + antinodes on a string'),     hint: __alloT('stem.wave.hero_standing_hint', 'Two waves traveling opposite directions interfere into a stationary pattern. Guitar / violin strings vibrate at fundamental + integer harmonics. Length, tension, density set the pitch.') },
                ripple:       { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCA7', title: __alloT('stem.wave.hero_ripple_title', 'Ripple Tank \u2014 two sources, interference'),     hint: __alloT('stem.wave.hero_ripple_hint', 'Where crests meet crests \u2192 bright (constructive); crests meet troughs \u2192 dark (destructive). Young\u2019s 1801 double-slit experiment proved light is a wave; same physics here.') },
                longitudinal: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\u2261',         title: __alloT('stem.wave.hero_longitudinal_title', 'Longitudinal \u2014 compression + rarefaction'),      hint: __alloT('stem.wave.hero_longitudinal_hint', 'Sound is longitudinal: air molecules push and pull along the direction of travel, not perpendicular. P-waves in earthquakes are longitudinal too \u2014 they arrive first, hence the P (primary).') },
                doppler:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDE97', title: __alloT('stem.wave.hero_doppler_title', 'Doppler \u2014 the moving siren effect'),             hint: __alloT('stem.wave.hero_doppler_hint', 'Source approaching = compressed wavelengths = higher pitch. Moving away = stretched wavelengths = lower pitch. Christian Doppler 1842; redshift in cosmology is the same idea, with light.') },
                spectrum:     { accent: '#10b981', soft: 'rgba(16,185,129,0.10)', icon: '\uD83D\uDCCA', title: __alloT('stem.wave.hero_spectrum_title', 'Spectrum \u2014 FFT decomposition'),                  hint: __alloT('stem.wave.hero_spectrum_hint', 'Any periodic signal = sum of sines (Fourier transform). Music DAWs, JPEG, MRI, MP3 \u2014 all rest on this. Cooley + Tukey 1965 FFT made it computationally cheap; modern signal processing was born.') }
              };
              var meta = MODE_META[waveMode] || MODE_META.free;
              return React.createElement('div', {
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 8,
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

            React.createElement("div", {
              className: "relative rounded-lg overflow-hidden border mb-3",
              style: {
                height: "clamp(360px, 52vw, 460px)",
                background: "radial-gradient(circle at 24% 16%, rgba(34,211,238,0.22), transparent 30%), linear-gradient(180deg, #061827 0%, #082f49 52%, #06202f 100%)",
                borderColor: "rgba(14,116,144,0.42)",
                boxShadow: "0 20px 44px rgba(8,47,73,0.24), inset 0 1px 0 rgba(255,255,255,0.18)"
              }
            },

              React.createElement("canvas", {

                ref: canvasRef,
                className: "focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-inset",
                "data-wave-canvas": "true",

                tabIndex: 0, role: "application", "aria-label": __alloT('stem.wave.aria_canvas', 'Wave simulator — arrow up/down adjusts amplitude, arrow left/right adjusts frequency, +/- adjusts speed, space pauses or resumes the animation'),

                "data-amp": d.amplitude, "data-freq": d.frequency, "data-wave-type": d.waveType || 'sine',

                "data-show-second": d.showSecond ? 'true' : 'false',

                "data-amp2": d.amplitude2 || 30, "data-freq2": d.frequency2 || 3,

                "data-speed": d.speed || 1,

                "data-wave-mode": waveMode,

                "data-accent": waveViewMeta.accent,

                "data-paused": d.paused ? 'true' : 'false',

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
                  var nv;
                  var say = function (id, msg) { if (typeof canvasNarrate === 'function') canvasNarrate('wave', id, msg, { debounce: 600 }); };

                  if (e.key === 'ArrowUp') { e.preventDefault(); nv = Math.min(100, (d.amplitude || 50) + 5); upd('amplitude', nv); say('key_amp', __alloT('stem.wave.narrate_amplitude', 'Amplitude') + ' ' + nv); }

                  else if (e.key === 'ArrowDown') { e.preventDefault(); nv = Math.max(5, (d.amplitude || 50) - 5); upd('amplitude', nv); say('key_amp', __alloT('stem.wave.narrate_amplitude', 'Amplitude') + ' ' + nv); }

                  else if (e.key === 'ArrowRight') { e.preventDefault(); nv = Math.min(10, Math.round(((d.frequency || 2) + 0.5) * 10) / 10); upd('frequency', nv); syncOsc({ freq: nv }); say('key_freq', __alloT('stem.wave.narrate_frequency', 'Frequency') + ' ' + nv + __alloT('stem.wave.narrate_hertz', ' hertz')); }

                  else if (e.key === 'ArrowLeft') { e.preventDefault(); nv = Math.max(0.5, Math.round(((d.frequency || 2) - 0.5) * 10) / 10); upd('frequency', nv); syncOsc({ freq: nv }); say('key_freq', __alloT('stem.wave.narrate_frequency', 'Frequency') + ' ' + nv + __alloT('stem.wave.narrate_hertz', ' hertz')); }

                  else if (e.key === '+' || e.key === '=') { e.preventDefault(); nv = Math.min(3, Math.round(((d.speed || 1) + 0.25) * 100) / 100); upd('speed', nv); say('key_speed', __alloT('stem.wave.narrate_speed', 'Speed') + ' ' + nv + ' x'); }

                  else if (e.key === '-') { e.preventDefault(); nv = Math.max(0.25, Math.round(((d.speed || 1) - 0.25) * 100) / 100); upd('speed', nv); say('key_speed', __alloT('stem.wave.narrate_speed', 'Speed') + ' ' + nv + ' x'); }

                  else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); nv = !d.paused; upd('paused', nv); say('key_pause', nv ? __alloT('stem.wave.narrate_paused', 'Animation paused') : __alloT('stem.wave.narrate_playing', 'Animation playing')); }

                },

                style: { width: "100%", height: "100%", display: "block", background: "transparent" }

              }),

              React.createElement("div", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-0",
                style: {
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent 18%, transparent 78%, rgba(2,6,23,0.28)), radial-gradient(circle at 50% 50%, transparent 58%, rgba(2,6,23,0.32) 100%)"
                }
              }),

              React.createElement("div", {
                className: "pointer-events-none absolute left-3 top-3 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-white shadow-xl backdrop-blur-md"
              },
                React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-cyan-100/80" }, __alloT('stem.wave.overlay_live_wave', 'Live wave')),
                React.createElement("p", { className: "text-sm font-black leading-tight" }, waveViewMeta.label),
                React.createElement("p", { className: "mt-1 text-[11px] text-cyan-50/90" }, "A " + displayAmp + " | f " + displayFreq + " Hz | T " + displayPeriod.toFixed(2) + " s")
              ),

              React.createElement("div", {
                className: "pointer-events-none absolute right-3 top-3 hidden rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-right text-white shadow-xl backdrop-blur-md sm:block"
              },
                React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-slate-200/80" }, waveViewMeta.chip),
                React.createElement("p", { className: "text-[11px] text-slate-100/90" }, __alloT('stem.wave.overlay_type', 'Type') + " " + activeWaveType),
                React.createElement("p", { className: "text-[11px] text-slate-100/90" }, __alloT('stem.wave.overlay_medium', 'Medium') + " " + displayMediumSpeed + " m/s")
              ),

              React.createElement("div", {
                className: "pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-2 text-white"
              },
                [
                  [__alloT('stem.wave.readout_wavelength', 'Wavelength'), displayWavelength.toFixed(1) + ' m'],
                  [__alloT('stem.wave.readout_speed', 'Speed'), displaySpeed.toFixed(1) + 'x'],
                  [__alloT('stem.wave.readout_energy', 'Energy'), (displayAmp * displayAmp).toFixed(0)]
                ].map(function(item) {
                  return React.createElement("div", { key: item[0], className: "rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-cyan-100/75" }, item[0]),
                    React.createElement("p", { className: "text-xs font-black leading-tight" }, item[1])
                  );
                }),

                waveMode === 'spectrum' && React.createElement("div", { className: "rounded-lg border border-emerald-300/40 bg-slate-950/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-emerald-200/80" }, __alloT('stem.wave.overlay_timbre_harmonics', 'Timbre = harmonics')),
                  React.createElement("p", { className: "text-xs font-bold leading-tight" }, timbreNote)
                ),

                waveMode === 'longitudinal' && React.createElement("div", { className: "rounded-lg border border-amber-300/40 bg-slate-950/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-amber-200/80" }, "● " + __alloT('stem.wave.overlay_gold_tracer', 'Gold tracer')),
                  React.createElement("p", { className: "text-xs font-bold leading-tight" }, __alloT('stem.wave.overlay_jiggles', 'Jiggles in place — the wave travels, the matter does not')),
                  React.createElement("p", { className: "mt-1 flex flex-wrap gap-x-2 text-[11px] font-bold" },
                    React.createElement("span", { className: "text-rose-200" }, __alloT('stem.wave.overlay_warm_compression', 'Warm = compression')),
                    React.createElement("span", { className: "text-blue-200" }, __alloT('stem.wave.overlay_blue_rarefaction', 'Blue = rarefaction')))
                )
              )

            ),

            // Wave type buttons (free + spectrum — spectrum analyzes the selected
            // waveform, so students need to switch types there to explore timbre)

            (waveMode === 'free' || waveMode === 'spectrum') && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              ['sine', 'square', 'triangle', 'sawtooth'].map(wt =>

                React.createElement("button", { key: wt, onClick: () => { upd('waveType', wt); syncOsc({ type: wt }); },

                  className: "px-2.5 py-1 rounded-lg text-xs font-bold transition-all " + ((d.waveType || 'sine') === wt ? 'bg-cyan-700 text-white shadow-md' : 'transition-colors bg-cyan-50 text-cyan-700 border border-cyan-600 hover:bg-cyan-100 active:scale-[0.97]')

                }, wt.charAt(0).toUpperCase() + wt.slice(1))

              )

            ),

            // Harmonic selector (standing mode only)

            waveMode === 'standing' && React.createElement("div", { className: "flex gap-2 mb-3 items-center" },

              React.createElement("span", { className: "text-xs font-bold text-cyan-600" }, __alloT('stem.wave.standing_harmonic_label', 'Harmonic:')),

              [1, 2, 3, 4, 5, 6].map(function (h) {

                return React.createElement("button", { key: h, onClick: function () { upd('harmonic', h); }, className: "w-9 h-9 rounded-lg text-sm font-black transition-all " + ((d.harmonic || 1) === h ? 'bg-cyan-700 text-white shadow-md scale-110' : 'transition-colors bg-cyan-50 text-cyan-700 border border-cyan-600 hover:bg-cyan-100 active:scale-[0.97]') }, h);

              }),

              React.createElement("span", { className: "text-xs text-slate-600 ml-2" }, ((d.harmonic || 1) + 1) + " nodes, " + (d.harmonic || 1) + " antinode" + ((d.harmonic || 1) > 1 ? 's' : ''))

            ),

            // Standing wave info

            waveMode === 'standing' && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3 text-xs text-cyan-800" },

              React.createElement("p", { className: "font-bold mb-1" }, "\uD83C\uDFB8 " + __alloT('stem.wave.standing_wave_title', 'Standing Wave \u2014 Harmonic #') + (d.harmonic || 1)),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_nodes_prefix', 'Nodes (\uD83D\uDD34 N): Points of zero displacement \u2014 ') + ((d.harmonic || 1) + 1) + __alloT('stem.wave.standing_nodes_suffix', ' total (including endpoints)')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_antinodes_prefix', 'Antinodes (\uD83D\uDFE2 A): Points of maximum displacement \u2014 ') + (d.harmonic || 1) + __alloT('stem.wave.standing_antinodes_suffix', ' total')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_wavelength_label', 'Wavelength:') + " \u03BB = 2L/" + (d.harmonic || 1) + __alloT('stem.wave.standing_wavelength_note', ' (L = string length)')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_frequency_label', 'Frequency:') + " f\u2081 \u00D7 " + (d.harmonic || 1) + " = " + ((d.harmonic || 1) * d.frequency).toFixed(1) + " Hz")

            ),

            // Controls

            React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3" },

              [

                { k: 'amplitude', label: '\uD83D\uDCC8 ' + __alloT('stem.wave.ctrl_amplitude', 'Amplitude'), aria: __alloT('stem.wave.ctrl_amplitude', 'Amplitude'), min: 10, max: 100, step: 1 },

                { k: 'frequency', label: '\uD83C\uDFB5 ' + __alloT('stem.wave.ctrl_frequency', 'Frequency'), aria: __alloT('stem.wave.ctrl_frequency_aria', 'Frequency in hertz'), min: 0.5, max: 10, step: 0.5 },

                { k: 'speed', label: '\u23E9 ' + __alloT('stem.wave.ctrl_speed', 'Speed'), aria: __alloT('stem.wave.ctrl_speed_aria', 'Animation speed multiplier'), min: 0.1, max: 5, step: 0.1 },

                { k: 'waveSpeed', label: '\uD83C\uDF0D ' + __alloT('stem.wave.ctrl_medium', 'Medium v (m/s)'), aria: __alloT('stem.wave.ctrl_medium_aria', 'Medium wave speed in meters per second'), min: 50, max: 1500, step: 10 },

              ].map(s =>

                React.createElement("div", { key: s.k, className: "bg-white rounded-lg p-3 border border-slate-200 shadow-sm" },

                  React.createElement("label", { className: "text-[11px] font-black text-slate-600 block uppercase tracking-wide" }, s.label),

                  React.createElement("span", { className: "mt-1 text-lg font-black text-slate-900 block" }, d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : d[s.k])),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : 0), 'aria-label': s.aria || s.label,
                  'aria-valuetext': (function () {
                    var val = d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : 0);
                    if (s.k === 'frequency') return val + __alloT('stem.wave.vt_freq_a', ' hertz — wavelength ') + ((d.waveSpeed || 343) / val).toFixed(1) + __alloT('stem.wave.vt_freq_b', ' meters, period ') + (1 / val).toFixed(2) + __alloT('stem.wave.vt_freq_c', ' seconds');
                    if (s.k === 'amplitude') return val + __alloT('stem.wave.vt_amplitude', ' — wave height; energy grows as amplitude squared');
                    if (s.k === 'speed') return val + __alloT('stem.wave.vt_speed', ' times animation speed');
                    return val + __alloT('stem.wave.vt_medium', ' meters per second through the medium');
                  })(), onChange: function (e) {
                    var v = parseFloat(e.target.value); upd(s.k, v);
                    if (s.k === 'frequency') syncOsc({ freq: v });
                    if (s.k === 'amplitude' || s.k === 'frequency') { checkWaveMatch(s.k === 'amplitude' ? v : d.amplitude, s.k === 'frequency' ? v : d.frequency); }
                    // Canvas Narration: parameter change
                    if (typeof canvasNarrate === 'function') {
                      var wl = (s.k === 'frequency' || s.k === 'waveSpeed') ? (d.waveSpeed || 343) / (s.k === 'frequency' ? v : d.frequency || 1) : null;
                      var msg = s.label + ': ' + v + (wl ? __alloT('stem.wave.narrate_wavelength_suffix', '. Wavelength: ') + wl.toFixed(1) + ' m' : '');
                      canvasNarrate('wave', 'param_' + s.k, msg, { debounce: 800 });
                    }
                  }, className: "mt-2 w-full accent-cyan-600" })

                )

              )

            ),

            // Second wave (free & spectrum mode)

            (waveMode === 'free' || waveMode === 'spectrum') && React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-pink-50 rounded-lg border border-pink-200" },

              React.createElement("label", { className: "text-xs font-bold text-pink-700 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.showSecond, 'aria-label': __alloT('stem.wave.aria_show_second', 'Show second wave'), onChange: e => upd('showSecond', e.target.checked), className: "accent-pink-600" }),

                "\u223F " + __alloT('stem.wave.show_second_wave', 'Show Second Wave (Interference)')

              ),

              d.showSecond && React.createElement(React.Fragment, null,

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, "A2:"),

                  React.createElement("input", { type: "range", min: 10, max: 80, step: 1, value: d.amplitude2 || 30, 'aria-label': __alloT('stem.wave.aria_second_amplitude', 'Second wave amplitude'), onChange: e => upd('amplitude2', parseFloat(e.target.value)), className: "w-24 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, d.amplitude2 || 30)

                ),

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-500 font-bold" }, "f2:"),

                  React.createElement("input", { type: "range", min: 0.5, max: 10, step: 0.5, value: d.frequency2 || 3, 'aria-label': __alloT('stem.wave.aria_second_frequency', 'Second wave frequency'), onChange: e => { var v2 = parseFloat(e.target.value); upd('frequency2', v2); syncOsc({ freq2: v2 }); }, className: "w-24 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, d.frequency2 || 3)

                ),

                React.createElement("div", { className: "flex items-center gap-1" },

                  React.createElement("span", { className: "text-[11px] text-pink-500 font-bold" }, "\u03C6\u2082:"),

                  React.createElement("input", { type: "range", min: 0, max: 6.28, step: 0.1, value: d.phase2 || 0, 'aria-label': __alloT('stem.wave.aria_second_phase', 'Second wave phase'), onChange: e => upd('phase2', parseFloat(e.target.value)), className: "w-24 accent-pink-500" }),

                  React.createElement("span", { className: "text-[11px] text-pink-700 font-bold" }, ((d.phase2 || 0) / Math.PI).toFixed(1) + "\u03C0")

                )

              ),

              React.createElement("button", {
                onClick: function () {
                  upd('showSecond', true); upd('frequency', 4); upd('frequency2', 4.5);
                  upd('amplitude', 45); upd('amplitude2', 45); upd('phase2', 0);
                  syncOsc({ freq: 4, freq2: 4.5 });
                  if (typeof addToast === 'function') addToast('\uD83C\uDFB5 ' + __alloT('stem.wave.toast_beats', 'Beats: 4 Hz + 4.5 Hz \u2014 watch (and hear) the slow 0.5 Hz pulse'), 'info');
                },
                'aria-label': __alloT('stem.wave.aria_beats_preset', 'Beats preset \u2014 two waves at 4 and 4.5 hertz so the beat envelope is visible'),
                className: "transition-colors px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-600 text-white hover:bg-pink-700 active:scale-[0.97]"
              }, '\uD83C\uDFB5 ' + __alloT('stem.wave.btn_beats', 'Beats')),

              d.showSecond && interferenceLabel && React.createElement("span", {
                role: "status",
                className: "text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-300 rounded-full px-2 py-0.5"
              }, '\u2011\u2011\u2011 ' + interferenceLabel)

            ),

            // Damping toggle (free mode only)

            waveMode === 'free' && React.createElement("div", { className: "flex items-center gap-3 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200" },

              React.createElement("label", { className: "text-xs font-bold text-amber-700 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.damping, 'aria-label': __alloT('stem.wave.aria_enable_damping', 'Enable damping'), onChange: e => upd('damping', e.target.checked), className: "accent-amber-600" }),

                "\uD83C\uDF0A " + __alloT('stem.wave.damping_label', 'Damping (Exponential Decay)')

              ),

              d.damping && React.createElement("div", { className: "flex items-center gap-1" },

                React.createElement("span", { className: "text-[11px] text-amber-500 font-bold" }, "\u03B1:"),

                React.createElement("input", { type: "range", min: 0.1, max: 2.0, step: 0.1, value: d.dampingAlpha || 0.5, 'aria-label': __alloT('stem.wave.aria_damping_coeff', 'Damping coefficient'), onChange: e => upd('dampingAlpha', parseFloat(e.target.value)), className: "w-20 accent-amber-500" }),

                React.createElement("span", { className: "text-[11px] text-amber-700 font-bold" }, (d.dampingAlpha || 0.5).toFixed(1))

              )

            ),

            // Ripple Tank custom controls

            waveMode === 'ripple' && React.createElement("div", { className: "flex items-center flex-wrap gap-4 mb-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200" },

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, __alloT('stem.wave.ripple_source_separation', 'Source Separation:')),

                React.createElement("input", { type: "range", min: 20, max: 200, step: 5, value: d.rippleSeparation || 80, 'aria-label': __alloT('stem.wave.aria_slit_separation', 'Slit separation'), onChange: e => upd('rippleSeparation', parseFloat(e.target.value)), className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-900 font-bold w-6" }, d.rippleSeparation || 80)

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, __alloT('stem.wave.ripple_medium_damping', 'Medium Damping:')),

                React.createElement("input", { type: "range", min: 0.000, max: 0.010, step: 0.001, value: d.dampingCoeff !== undefined ? d.dampingCoeff : 0.002, 'aria-label': __alloT('stem.wave.aria_damping_interference', 'Damping coefficient for interference'), onChange: e => upd('dampingCoeff', parseFloat(e.target.value)), className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-900 font-bold w-12" }, (d.dampingCoeff !== undefined ? d.dampingCoeff : 0.002).toFixed(3))

              ),

              React.createElement("button", {
                onClick: function() {
                  // Reset draggable source positions to centered defaults.
                  var c = canvasRef._lastCanvas;
                  if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; }
                  upd('rippleSrc1', null); upd('rippleSrc2', null);
                  if (typeof addToast === 'function') addToast(__alloT('stem.wave.toast_sources_reset', 'Sources reset to defaults'), 'info');
                },
                className: "transition-colors px-3 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97]",
                'aria-label': __alloT('stem.wave.aria_reset_sources', 'Reset source positions to defaults')
              }, '↻ ' + __alloT('stem.wave.btn_reset_sources', 'Reset sources')),
              React.createElement("span", { className: "text-[11px] text-indigo-800 ml-auto" },
                React.createElement("strong", null, __alloT('stem.wave.ripple_bright', 'Bright')), __alloT('stem.wave.ripple_constructive', ' = constructive · '),
                React.createElement("strong", null, __alloT('stem.wave.ripple_dark', 'dark')), __alloT('stem.wave.ripple_destructive_hint', ' = destructive · 💡 drag the red sources'))

            ),

            // Reflection / boundary controls
            waveMode === 'reflection' && React.createElement("div", { className: "flex items-center flex-wrap gap-4 mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200" },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.wave.refl_end_type', 'End Type:')),
                React.createElement("div", { className: "flex rounded-md overflow-hidden border border-amber-300" },
                  ['fixed', 'free'].map(function(et) {
                    var active = (d.reflectionEnd || 'fixed') === et;
                    return React.createElement('button', {
                      key: et,
                      onClick: function() { upd('reflectionEnd', et); },
                      className: 'px-2.5 py-1 text-[11px] font-bold transition ' + (active ? (et === 'fixed' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white') : 'transition-colors bg-white text-slate-600 hover:bg-amber-100 active:scale-[0.97]'),
                      'aria-pressed': active,
                      'aria-label': et === 'fixed' ? __alloT('stem.wave.aria_fixed_end', 'Fixed end (string tied down — phase inverts on reflection)') : __alloT('stem.wave.aria_free_end', 'Free end (string free to move — phase preserved on reflection)')
                    }, et === 'fixed' ? '🔒 ' + __alloT('stem.wave.btn_fixed', 'Fixed') : '🪁 ' + __alloT('stem.wave.btn_free', 'Free'));
                  })
                )
              ),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.wave.refl_wall_position', 'Wall Position:')),
                React.createElement("input", { type: "range", min: 0.2, max: 0.95, step: 0.01, value: d.wallFrac != null ? d.wallFrac : 0.75, 'aria-label': __alloT('stem.wave.aria_wall_position', 'Wall position across the tank (keyboard equivalent of dragging the gold wall)'), onChange: function(e) { var wf = parseFloat(e.target.value); upd('wallFrac', wf); var c = canvasRef._lastCanvas; if (c && c._drag) c._drag.wallX = wf * c.width; }, className: "w-24 accent-amber-600" }),
                React.createElement("span", { className: "text-xs text-amber-900 font-bold w-10" }, Math.round((d.wallFrac != null ? d.wallFrac : 0.75) * 100) + "%")
              ),
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.wave.refl_reflectivity', 'Reflectivity:')),
                React.createElement("input", { type: "range", min: 0.0, max: 1.0, step: 0.05, value: d.reflectivity != null ? d.reflectivity : 0.9, 'aria-label': __alloT('stem.wave.aria_reflectivity', 'Wall reflectivity 0 to 1'), onChange: e => upd('reflectivity', parseFloat(e.target.value)), className: "w-24 accent-amber-600" }),
                React.createElement("span", { className: "text-xs text-amber-900 font-bold w-10" }, (d.reflectivity != null ? d.reflectivity : 0.9).toFixed(2))
              ),
              React.createElement("button", {
                onClick: function() {
                  var c = canvasRef._lastCanvas;
                  if (c && c._drag) { c._drag.wallX = null; }
                  upd('wallFrac', null);
                  if (typeof addToast === 'function') addToast(__alloT('stem.wave.toast_wall_reset', 'Wall reset to 75% across'), 'info');
                },
                className: "transition-colors px-3 py-1 rounded-md text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.97]",
                'aria-label': __alloT('stem.wave.aria_reset_wall', 'Reset wall position')
              }, '↻ ' + __alloT('stem.wave.btn_reset_wall', 'Reset wall')),
              React.createElement("span", { className: "text-[11px] text-amber-900 ml-auto" },
                React.createElement("span", { style: { color: '#f59e0b', fontWeight: 700 } }, '— ' + __alloT('stem.wave.refl_solid', 'solid')), __alloT('stem.wave.refl_solid_desc', ': incident + reflected · '),
                React.createElement("span", { style: { color: '#db2777', fontWeight: 700 } }, '‑‑ ' + __alloT('stem.wave.refl_dashed', 'dashed')), __alloT('stem.wave.refl_dashed_desc', ': reflected alone · 💡 drag the gold wall or use the slider'))
            ),

            // Doppler specific controls

            waveMode === 'doppler' && React.createElement("div", { className: "flex items-center flex-wrap gap-3 mb-3 p-2 bg-rose-50 rounded-lg border border-rose-200" },

              React.createElement("label", { className: "text-xs font-bold text-rose-700 flex items-center gap-2" },

                __alloT('stem.wave.doppler_source_speed', 'Source Speed') + " (v\u209B):",

                React.createElement("input", { type: "range", min: 0.0, max: 0.95, step: 0.05, value: d.sourceSpeed !== undefined ? d.sourceSpeed : 0.3, 'aria-label': __alloT('stem.wave.aria_source_speed', 'Source speed as fraction of wave speed'), onChange: e => upd('sourceSpeed', parseFloat(e.target.value)), className: "w-32 accent-rose-600" }),

                React.createElement("span", { className: "inline-block w-8 text-right" }, Math.round((d.sourceSpeed !== undefined ? d.sourceSpeed : 0.3) * 100) + "%")

              ),

              React.createElement("span", { className: "text-[11px] text-rose-500" }, __alloT('stem.wave.doppler_mach', 'of sound speed (Mach number)')),

              (function() {
                var _m = d.sourceSpeed !== undefined ? d.sourceSpeed : 0.3;
                var _f0 = d.frequency || 2;
                return React.createElement(React.Fragment, null,
                  React.createElement("span", { className: "text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5" }, __alloT('stem.wave.doppler_approaching', 'approaching') + " f′ = " + (_f0 / (1 - Math.min(_m, 0.95))).toFixed(1) + " Hz"),
                  React.createElement("span", { className: "text-[11px] font-bold text-sky-700 bg-sky-100 border border-sky-200 rounded-full px-2 py-0.5" }, __alloT('stem.wave.doppler_receding', 'receding') + " f′ = " + (_f0 / (1 + _m)).toFixed(1) + " Hz"),
                  React.createElement("span", { className: "text-[10px] text-rose-600 italic" }, (_waveAudio.ctx && d.soundPlaying) ? "🔊 " + __alloT('stem.wave.doppler_tone_bends', 'the tone bends as the source passes the observer') : "▶ " + __alloT('stem.wave.doppler_press_play', 'press Play Sound to HEAR the shift'))
                );
              })()

            ),

            // Wave equation display

            React.createElement("div", { className: "bg-slate-900 rounded-lg p-4 mb-3 text-center border border-slate-700 shadow-lg" },

              React.createElement("p", { className: "text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1" }, "\uD83D\uDCDD " + __alloT('stem.wave.wave_equation_heading', 'Wave Equation')),

              

              // General Template Formula

              React.createElement("div", { className: "mb-3 p-1.5 bg-slate-900/50 rounded-lg border border-slate-700/50 inline-block text-center" },

                 React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5" }, __alloT('stem.wave.general_formula', 'General Formula')),

                 React.createElement("p", { className: "text-sm font-mono font-bold text-slate-300" }, 

                    waveMode === 'standing' ? 'y(x,t) = A sin(n\u03C0x/L) cos(\u03C9t)' : 'y(x,t) = A sin(2\u03C0ft \u2212 kx)'

                 )

              ),

              React.createElement("br"),



              (d.matchTarget && d.matchTarget.isEquation) && React.createElement("div", { className: "mb-3 p-2 bg-purple-900/50 rounded-lg border border-purple-500/50 inline-block text-left" },

                  React.createElement("p", { className: "text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1" }, __alloT('stem.wave.target_equation', 'Target Equation:')),

                  React.createElement("div", { className: "text-lg font-mono font-bold opacity-90 tracking-tight" }, 

                      renderEq(d.matchTarget.amp, d.matchTarget.freq, true, false)

                  )

              ),

              React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-1 flex justify-center items-center h-4" }, 

                  (d.matchTarget && d.matchTarget.isEquation) ? __alloT('stem.wave.your_equation', 'Your Equation:') : __alloT('stem.wave.current_equation', 'Current Equation:'),

                  (function() {

                    if (!d.matchTarget) return null;

                    var pct = Math.max(0, Math.round((1 - (Math.abs(d.amplitude - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(d.frequency - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

                    return pct > 90 

                      ? React.createElement("span", {className: "text-[11px] font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, "\u2705 " + pct + __alloT('stem.wave.pct_match', '% match'))

                      : React.createElement("span", {className: "text-[11px] font-bold text-amber-400 bg-amber-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, pct + __alloT('stem.wave.pct_match', '% match'));
                  })()

              ),

              React.createElement("div", { className: "text-lg font-mono font-bold tracking-tight" },

                  renderEq(d.amplitude, d.frequency, false, true)

              ),

              React.createElement("p", { className: "text-[11px] text-slate-400 mt-2" }, 

                  waveMode === 'standing' 

                  ? __alloT('stem.wave.eq_standing_note', 'Standing wave \u2014 superposition of two traveling waves. A = Amplitude, n = Harmonic')

                  : 'A = ' + d.amplitude + ', f = ' + d.frequency + ' Hz, \u03BB = ' + wavelength.toFixed(1) + ' m, T = ' + (1 / d.frequency).toFixed(3) + ' s'

              )

            ),

            // Info cards

            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-center" },

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, __alloT('stem.wave.card_wavelength', 'Wavelength') + " \u03BB"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, wavelength.toFixed(1) + " m")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, __alloT('stem.wave.card_period', 'Period') + " T"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (1 / d.frequency).toFixed(3) + " s")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-600 uppercase" }, __alloT('stem.wave.card_wave_speed', 'Wave Speed') + " v"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, waveSpeedCalc.toFixed(0) + " m/s")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[11px] font-bold text-cyan-700 uppercase" }, __alloT('stem.wave.card_energy', 'Energy')),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, "\u221D A\u00B2 = " + (d.amplitude * d.amplitude).toFixed(0))

              )

            ),

            // ── Investigate — surfaces the two inquiry widgets buried in the library ──

            React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 flex items-center gap-3 flex-wrap" },
              React.createElement("span", { className: "text-xl", "aria-hidden": "true" }, '🔬'),
              React.createElement("p", { className: "text-xs text-indigo-900 font-semibold flex-1 min-w-[220px] m-0" }, __alloT('stem.wave.investigate_intro', 'Ready to think like a physicist? Two open-ended investigations — no answer dumps, just you and the data.')),
              React.createElement("button", { onClick: function () { upd('expSection', 'discoverWave'); if (typeof addToast === 'function') addToast('🔬 ' + __alloT('stem.wave.toast_opened_below', 'Opened below — scroll down to the Reference Library'), 'info'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97]" }, '🔬 ' + __alloT('stem.wave.btn_discover', 'Discover') + ' f·λ = v'),
              React.createElement("button", { onClick: function () { upd('expSection', 'standingHunt'); if (typeof addToast === 'function') addToast('🎯 ' + __alloT('stem.wave.toast_opened_below', 'Opened below — scroll down to the Reference Library'), 'info'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.97]" }, '🎯 ' + __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt'))
            ),

            // ── Wave myths — misconception-busters, each with a live sim demo ──

            (function () {
              var MYTHS = [
                { myth: __alloT('stem.wave.myth1_myth', 'Waves carry water (or air) along with them.'), truth: __alloT('stem.wave.myth1_truth', 'Waves carry ENERGY, not matter. Each bit of the medium oscillates around its home spot and hands the motion on to its neighbor.'), btn: __alloT('stem.wave.myth1_btn', 'Watch the gold tracer'), demo: { waveMode: 'longitudinal' } },
                { myth: __alloT('stem.wave.myth2_myth', 'A bigger (louder) wave travels faster.'), truth: __alloT('stem.wave.myth2_truth', 'Speed is set by the MEDIUM — tension, density, temperature. Cranking amplitude adds energy, not speed: the crests arrive no sooner.'), btn: __alloT('stem.wave.myth2_btn', 'Crank amplitude, watch the speed'), demo: { waveMode: 'free', amplitude: 95 } },
                { myth: __alloT('stem.wave.myth3_myth', 'Sound can travel through empty space.'), truth: __alloT('stem.wave.myth3_truth', 'Sound is matter compressing matter. In a vacuum there is nothing to push, so space is silent. Light is different — EM waves need no medium.'), btn: __alloT('stem.wave.myth3_btn', 'See what sound really is'), demo: { waveMode: 'longitudinal' } },
                { myth: __alloT('stem.wave.myth4_myth', 'When waves cancel, their energy is destroyed.'), truth: __alloT('stem.wave.myth4_truth', 'Energy is never destroyed — it redistributes. The dark bands in the ripple tank sit right next to extra-bright ones; the total stays constant.'), btn: __alloT('stem.wave.myth4_btn', 'Find the dark bands'), demo: { waveMode: 'ripple' } }
              ];
              var mythsOpen = !!d.mythsOpen;
              return React.createElement("div", { className: "mb-3 rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50/60 overflow-hidden" },
                React.createElement("button", {
                  onClick: function () { upd('mythsOpen', !mythsOpen); },
                  "aria-expanded": mythsOpen,
                  className: "transition-colors w-full flex items-center gap-2 p-3 text-left hover:bg-fuchsia-100/60"
                },
                  React.createElement("span", { className: "text-xl", "aria-hidden": "true" }, '🧠'),
                  React.createElement("span", { className: "text-sm font-black text-fuchsia-900 flex-1" }, __alloT('stem.wave.myths_header', 'Wave myths — test your intuition')),
                  React.createElement("span", { className: "text-xs font-bold text-fuchsia-700" }, mythsOpen ? '▲ ' + __alloT('stem.wave.hide', 'Hide') : '▼ ' + __alloT('stem.wave.show', 'Show'))
                ),
                mythsOpen && React.createElement("div", { className: "px-3 pb-3 grid gap-2 grid-cols-1 md:grid-cols-2" },
                  MYTHS.map(function (m, mi) {
                    return React.createElement("div", { key: 'myth' + mi, className: "p-3 rounded-lg bg-white border border-fuchsia-200" },
                      React.createElement("p", { className: "text-xs font-black text-rose-700 m-0" }, '❌ ' + __alloT('stem.wave.myth_prefix', 'Myth: ') + m.myth),
                      React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed mt-1 mb-2" }, '✅ ' + m.truth),
                      React.createElement("button", {
                        onClick: function () {
                          setLabToolData(function (prev) { var prior = (prev && prev.wave) || {}; return Object.assign({}, prev, { wave: Object.assign({}, prior, m.demo) }); });
                          if (typeof addToast === 'function') addToast('👀 ' + m.btn, 'info');
                        },
                        className: "transition-colors px-2.5 py-1 rounded-md text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 active:scale-[0.97]"
                      }, '👀 ' + m.btn)
                    );
                  })
                )
              );
            })(),

            // Quiz

            React.createElement("div", { className: "flex items-center gap-2 mb-2" },

              React.createElement("button", { onClick: function () {

                  // No-repeat cycle through the bank; reshuffle the pool once
                  // exhausted. Option order is shuffled per question (the authored
                  // order had the correct answer position-biased toward the front).
                  var used = (d.quizUsed && d.quizUsed.length < WAVE_QUIZ.length) ? d.quizUsed.slice() : [];
                  var pool = [];
                  for (var qi = 0; qi < WAVE_QUIZ.length; qi++) { if (used.indexOf(qi) === -1) pool.push(qi); }
                  var pick = pool[Math.floor(Math.random() * pool.length)];
                  used.push(pick);
                  upd('quizUsed', used);
                  var q = WAVE_QUIZ[pick];
                  var opts = q.opts.slice();
                  for (var oi = opts.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)); var tmpO = opts[oi]; opts[oi] = opts[oj]; opts[oj] = tmpO; }

                  upd('quiz', { q: q.q, a: q.a, opts: opts, wrongFeedback: q.wrongFeedback, demo: q.demo || null, answered: false, score: (d.quiz && d.quiz.score) || 0, attempted: (d.quiz && d.quiz.attempted) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-700 text-white') + " transition-all"

              }, d.quiz ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_next_question', 'Next Question') : "\uD83E\uDDE0 " + __alloT('stem.wave.btn_quiz_mode', 'Quiz Mode')),

              React.createElement("button", { onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  upd('matchTarget', { amp: ta, freq: tf, isEquation: false });

                  upd('matchXpClaimed', false);

                  addToast(t('stem.wave.ud83cudfaf_match_the_yellow_dashed'), 'info');

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.matchTarget && !d.matchTarget.isEquation ? 'bg-amber-100 text-amber-700' : 'bg-amber-700 text-white') + " transition-all"

              }, d.matchTarget && !d.matchTarget.isEquation ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_new_target', 'New Target') : "\uD83C\uDFAF " + __alloT('stem.wave.btn_match_waveform', 'Match Waveform')),

              React.createElement("button", { onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  upd('matchTarget', { amp: ta, freq: tf, isEquation: true });

                  upd('matchXpClaimed', false);

                  addToast(__alloT('stem.wave.toast_match_equation', 'Match the mathematical equation!'), 'info');

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.matchTarget && d.matchTarget.isEquation ? 'bg-purple-100 text-purple-700' : 'bg-purple-700 text-white') + " transition-all"

              }, (d.matchTarget && d.matchTarget.isEquation) ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_new_equation', 'New Equation') : "\uD83D\uDCDD " + __alloT('stem.wave.btn_match_equation', 'Match Equation')),

              d.matchTarget && React.createElement("button", { "aria-label": __alloT('stem.wave.btn_clear', 'Clear'),

                onClick: function () { upd('matchTarget', null); upd('matchXpClaimed', false); },

                className: "transition-colors px-2 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-100 active:scale-[0.97]"

              }, "\u2715 " + __alloT('stem.wave.btn_clear', 'Clear')),

              d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + (d.quiz.attempted ? "/" + d.quiz.attempted : "") + __alloT('stem.wave.quiz_correct_suffix', ' correct')),

              React.createElement("button", { "aria-label": __alloT('stem.wave.aria_reset_all', 'Reset all wave controls to their defaults'),
                onClick: function () {
                  setLabToolData(function (prev) {
                    var prior = (prev && prev.wave) || {};
                    return Object.assign({}, prev, { wave: Object.assign({}, prior, {
                      frequency: 2, amplitude: 50, waveType: 'sine', waveSpeed: 343,
                      speed: 1, showSecond: false, amplitude2: 30, frequency2: 3, phase2: 0,
                      harmonic: 1, damping: false, dampingAlpha: 0.5, sourceSpeed: 0.3,
                      rippleSeparation: 80, dampingCoeff: 0.002, reflectionEnd: 'fixed',
                      reflectivity: 0.9, wallFrac: null, rippleSrc1: null, rippleSrc2: null,
                      matchTarget: null, matchXpClaimed: false
                    }) });
                  });
                  syncOsc({ freq: 2, type: 'sine', freq2: 3 });
                  var c = canvasRef._lastCanvas; if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; c._drag.wallX = null; }
                  if (typeof addToast === 'function') addToast('\u21BB ' + __alloT('stem.wave.toast_controls_reset', 'Controls reset to defaults'), 'info');
                },
                className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.97]"
              }, '\u21BB ' + __alloT('stem.wave.btn_reset_controls', 'Reset controls'))

            ),

            d.quiz && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3" },

              React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                d.quiz.opts.map(function (opt) {

                  var isCorrect = opt === d.quiz.a;

                  var wasChosen = d.quiz.chosen === opt;

                  var cls = !d.quiz.answered ? 'transition-colors bg-white border-slate-200 hover:border-cyan-400' : isCorrect ? 'bg-emerald-100 border-emerald-600' : wasChosen ? 'bg-red-100 border-red-600' : 'bg-slate-50 border-slate-200 opacity-50';

                  return React.createElement("button", { "aria-label": __alloT('stem.wave.aria_select_answer', 'Select answer: ') + opt,

                    key: opt, disabled: d.quiz.answered, onClick: function () {

                      var correct = opt === d.quiz.a;

                      var fb = correct ? '' : ((d.quiz.wrongFeedback && d.quiz.wrongFeedback[opt]) || (__alloT('stem.wave.quiz_answer_is', 'The answer is ') + d.quiz.a + '.'));

                      upd('quiz', Object.assign({}, d.quiz, { answered: true, chosen: opt, fb: fb, score: d.quiz.score + (correct ? 1 : 0), attempted: (d.quiz.attempted || 0) + 1 }));

                      if (correct) { awardStemXP('wave-quiz', 5, __alloT('stem.wave.xp_wave_quiz', 'Wave quiz: ') + d.quiz.q); }

                      if (!correct && typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_not_quite', 'Not quite. ') + fb);

                      addToast(correct ? '\u2705 ' + __alloT('stem.wave.toast_correct', 'Correct!') : '\u274C ' + __alloT('stem.wave.toast_not_quite_below', 'Not quite \u2014 see why below'), correct ? 'success' : 'error');

                    }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                  }, opt);

                })

              ),

              // Corrective feedback \u2014 names the specific mix-up instead of just the answer
              d.quiz.answered && React.createElement("div", { className: "mt-2 p-2.5 rounded-lg text-xs leading-relaxed " + (d.quiz.chosen === d.quiz.a ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'), role: "status" },
                d.quiz.chosen === d.quiz.a
                  ? '\u2705 ' + __alloT('stem.wave.toast_correct', 'Correct!')
                  : React.createElement(React.Fragment, null,
                      React.createElement("span", { className: "font-bold" }, '\u274C ' + __alloT('stem.wave.feedback_answer_prefix', 'Not quite \u2014 the answer is') + ' \u201C' + d.quiz.a + '\u201D. '),
                      d.quiz.fb
                    ),
                d.quiz.demo && React.createElement("button", {
                  onClick: function () {
                    var demoPatch = d.quiz.demo;
                    setLabToolData(function (prev) {
                      var prior = (prev && prev.wave) || {};
                      return Object.assign({}, prev, { wave: Object.assign({}, prior, demoPatch) });
                    });
                    if (typeof addToast === 'function') addToast('\uD83D\uDC40 ' + __alloT('stem.wave.toast_sim_setup', 'Sim set up to demonstrate this \u2014 watch the wave'), 'info');
                  },
                  className: "transition-colors ml-2 px-2 py-1 rounded-md text-[11px] font-bold bg-white border " + (d.quiz.chosen === d.quiz.a ? 'border-emerald-400 text-emerald-700 hover:bg-emerald-100' : 'border-red-400 text-red-700 hover:bg-red-100') + " active:scale-[0.97]"
                }, '\uD83D\uDC40 ' + __alloT('stem.wave.btn_show_in_sim', 'Show me in the sim'))
              )

            ),

            React.createElement("button", { "aria-label": __alloT('stem.wave.snapshot', 'Snapshot'), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wv-' + Date.now(), tool: 'wave', label: 'A=' + d.amplitude + ' f=' + d.frequency, data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 ' + __alloT('stem.wave.toast_snapshot_saved', 'Snapshot saved!'), 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.wave.snapshot', 'Snapshot')),

            // ── AI Wave Tutor (reading-level aware) ──
            (function () {
              var aiLevel = d.aiLevel || 'grade5';
              var aiText = d.aiExplain || '';
              var aiLoading = !!d.aiLoading;
              var aiError = d.aiError || '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.wave.ai_level_plain', 'Plain'), hint: 'using simple everyday words and short sentences' },
                { id: 'grade5', label: __alloT('stem.wave.ai_level_grade5', 'Grade 5'), hint: 'for a 5th grade student, brief and friendly' },
                { id: 'hs', label: __alloT('stem.wave.ai_level_hs', 'High School'), hint: 'for a high school physics student, with appropriate equations' }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { var labToolData = ctx.toolData; setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiError: __alloT('stem.wave.ai_not_available', 'AI tutor not available.') }) }); }); return; }
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
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiLoading: false, aiError: __alloT('stem.wave.ai_unreachable', 'Could not reach AI tutor. Try again in a moment.') }) }); });
                });
              }
              function setAiLevel(id) {
                setLabToolData(function (prev) { return Object.assign({}, prev, { wave: Object.assign({}, prev.wave, { aiLevel: id }) }); });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, "\u2728 " + __alloT('stem.wave.ai_explain_heading', 'Explain at my level')),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.wave.aria_reading_level_group', 'Reading level') },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { setAiLevel(L.id); },
                        "aria-label": __alloT('stem.wave.aria_reading_level', 'Reading level: ') + L.label + (active ? __alloT('stem.wave.aria_selected', ' (selected)') : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'transition-colors bg-white text-purple-700 border border-purple-600 hover:bg-purple-100 active:scale-[0.97]')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": __alloT('stem.wave.aria_generate_at', 'Generate AI explanation at ') + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + __alloT('stem.wave.aria_level_suffix', ' level'),
                    className: "transition-colors px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 active:scale-[0.97]"
                  }, aiLoading ? '\u23F3 ' + __alloT('stem.wave.ai_thinking', 'Thinking...') : (aiText ? '\uD83D\uDD04 ' + __alloT('stem.wave.ai_reexplain', 'Re-explain') : '\uD83E\uDDE0 ' + __alloT('stem.wave.ai_explain', 'Explain')))
                ),
                aiError && React.createElement("p", { className: "text-[11px] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic text-slate-500" }, __alloT('stem.wave.ai_placeholder', 'Click \u201CExplain\u201D for the AI tutor to describe the current wave at your chosen reading level.'))
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
        { name: __alloT('stem.wave.wt_transverse_name', 'Transverse'), icon: '⤴', desc: __alloT('stem.wave.wt_transverse_desc', 'Particle motion perpendicular to wave direction. Crests + troughs.'), examples: [__alloT('stem.wave.wt_transverse_ex1', 'Light + all EM waves'), __alloT('stem.wave.wt_transverse_ex2', 'String wave'), __alloT('stem.wave.wt_transverse_ex3', 'Surface water waves (mostly)'), __alloT('stem.wave.wt_transverse_ex4', 'S-waves in earthquakes')], speed: __alloT('stem.wave.wt_transverse_speed', 'Varies by medium') },
        { name: __alloT('stem.wave.wt_longitudinal_name', 'Longitudinal (compressional)'), icon: '⤇', desc: __alloT('stem.wave.wt_longitudinal_desc', 'Particle motion parallel to wave direction. Compressions + rarefactions.'), examples: [__alloT('stem.wave.wt_longitudinal_ex1', 'Sound waves in air'), __alloT('stem.wave.wt_longitudinal_ex2', 'Slinky push-pull'), __alloT('stem.wave.wt_longitudinal_ex3', 'P-waves in earthquakes'), __alloT('stem.wave.wt_longitudinal_ex4', 'Ultrasound')], speed: __alloT('stem.wave.wt_longitudinal_speed', '~343 m/s sound in air at 20°C') },
        { name: __alloT('stem.wave.wt_surface_name', 'Surface (Rayleigh)'), icon: '〰', desc: __alloT('stem.wave.wt_surface_desc', 'Particles trace elliptical paths. Combines transverse + longitudinal.'), examples: [__alloT('stem.wave.wt_surface_ex1', 'Ocean surface waves'), __alloT('stem.wave.wt_surface_ex2', 'Rayleigh waves in earthquakes')], speed: __alloT('stem.wave.wt_surface_speed', 'Depends on water depth + λ') },
        { name: __alloT('stem.wave.wt_em_name', 'Electromagnetic'), icon: '⚡', desc: __alloT('stem.wave.wt_em_desc', 'Oscillating electric + magnetic fields. No medium needed (travel through vacuum).'), examples: [__alloT('stem.wave.wt_em_ex1', 'Visible light'), __alloT('stem.wave.wt_em_ex2', 'Radio'), __alloT('stem.wave.wt_em_ex3', 'X-rays'), __alloT('stem.wave.wt_em_ex4', 'Microwaves'), __alloT('stem.wave.wt_em_ex5', 'IR / UV')], speed: __alloT('stem.wave.wt_em_speed', 'c = 3.0 × 10⁸ m/s in vacuum') },
        { name: __alloT('stem.wave.wt_matter_name', 'Matter waves (de Broglie)'), icon: 'λ', desc: __alloT('stem.wave.wt_matter_desc', 'All matter has wave properties. λ = h/p. Observable for electrons + atoms.'), examples: [__alloT('stem.wave.wt_matter_ex1', 'Electron diffraction'), __alloT('stem.wave.wt_matter_ex2', 'Neutron scattering'), __alloT('stem.wave.wt_matter_ex3', 'Atom interferometry')], speed: __alloT('stem.wave.wt_matter_speed', 'Particle velocity (not wave)') },
        { name: __alloT('stem.wave.wt_gravitational_name', 'Gravitational waves'), icon: '⊕', desc: __alloT('stem.wave.wt_gravitational_desc', 'Ripples in spacetime from accelerating masses. First detected 2015 (LIGO).'), examples: [__alloT('stem.wave.wt_gravitational_ex1', 'Black hole + neutron star mergers'), __alloT('stem.wave.wt_gravitational_ex2', 'Predicted by Einstein 1915')], speed: __alloT('stem.wave.wt_gravitational_speed', 'c (speed of light)') }
      ];

      var WAVE_QUANTITIES = [
        { sym: 'λ', name: __alloT('stem.wave.wq_wavelength_name', 'Wavelength'), units: __alloT('stem.wave.wq_wavelength_units', 'm (meters)'), def: __alloT('stem.wave.wq_wavelength_def', 'Distance between two successive crests (or troughs). Crest-to-crest.') },
        { sym: 'f', name: __alloT('stem.wave.wq_frequency_name', 'Frequency'), units: __alloT('stem.wave.wq_frequency_units', 'Hz (1/s)'), def: __alloT('stem.wave.wq_frequency_def', 'Cycles per second. How many wave peaks pass a point per second.') },
        { sym: 'T', name: __alloT('stem.wave.wq_period_name', 'Period'), units: __alloT('stem.wave.wq_period_units', 's (seconds)'), def: __alloT('stem.wave.wq_period_def', 'Time for one complete cycle. T = 1/f.') },
        { sym: 'A', name: __alloT('stem.wave.wq_amplitude_name', 'Amplitude'), units: __alloT('stem.wave.wq_amplitude_units', 'm (or whatever the wave displaces)'), def: __alloT('stem.wave.wq_amplitude_def', 'Maximum displacement from equilibrium. Carries energy; intensity ∝ A².') },
        { sym: 'v', name: __alloT('stem.wave.wq_wavespeed_name', 'Wave speed'), units: 'm/s', def: __alloT('stem.wave.wq_wavespeed_def', 'How fast the wave moves through the medium. v = fλ.') },
        { sym: 'k', name: __alloT('stem.wave.wq_wavenumber_name', 'Wave number'), units: __alloT('stem.wave.wq_wavenumber_units', '1/m (or rad/m)'), def: __alloT('stem.wave.wq_wavenumber_def', 'k = 2π/λ. Spatial frequency. Useful in y = A·sin(kx − ωt).') },
        { sym: 'ω', name: __alloT('stem.wave.wq_angfreq_name', 'Angular frequency'), units: 'rad/s', def: __alloT('stem.wave.wq_angfreq_def', 'ω = 2πf. Used in trigonometric wave equations.') },
        { sym: 'φ', name: __alloT('stem.wave.wq_phase_name', 'Phase'), units: __alloT('stem.wave.wq_phase_units', 'rad (or degrees)'), def: __alloT('stem.wave.wq_phase_def', 'Position within a cycle. Two waves in phase: peaks align (constructive); out of phase by π: peaks meet troughs (destructive).') }
      ];

      var INTERFERENCE_PATTERNS = [
        { type: __alloT('stem.wave.ip_constructive_type', 'Constructive'), icon: '+', condition: 'Δφ = 0, 2π, 4π... (path diff = mλ)', result: __alloT('stem.wave.ip_constructive_result', 'Amplitudes ADD. Bright fringe (light), loud point (sound), large displacement.') },
        { type: __alloT('stem.wave.ip_destructive_type', 'Destructive'), icon: '−', condition: 'Δφ = π, 3π, 5π... (path diff = (m+½)λ)', result: __alloT('stem.wave.ip_destructive_result', 'Amplitudes CANCEL. Dark fringe, quiet point, no displacement.') },
        { type: __alloT('stem.wave.ip_partial_type', 'Partial'), icon: '~', condition: 'Other Δφ values', result: __alloT('stem.wave.ip_partial_result', 'Partial reinforcement or cancellation. Wave appears with intermediate amplitude.') }
      ];

      var DOPPLER_CASES = [
        { case: __alloT('stem.wave.dc_toward_case', 'Source moving toward you'), effect: __alloT('stem.wave.dc_obs_higher', 'f observed > f emitted'), detail: __alloT('stem.wave.dc_toward_detail', 'Wavefronts bunch up in front. Higher pitch (sound) / blueshift (light).') },
        { case: __alloT('stem.wave.dc_away_case', 'Source moving away'), effect: __alloT('stem.wave.dc_obs_lower', 'f observed < f emitted'), detail: __alloT('stem.wave.dc_away_detail', 'Wavefronts spread out behind. Lower pitch / redshift.') },
        { case: __alloT('stem.wave.dc_obs_toward_case', 'Observer moving toward source'), effect: __alloT('stem.wave.dc_obs_higher', 'f observed > f emitted'), detail: __alloT('stem.wave.dc_obs_toward_detail', 'You meet wavefronts faster. Higher apparent frequency.') },
        { case: __alloT('stem.wave.dc_obs_away_case', 'Observer moving away'), effect: __alloT('stem.wave.dc_obs_lower', 'f observed < f emitted'), detail: __alloT('stem.wave.dc_obs_away_detail', 'Wavefronts catch up to you slower.') },
        { case: __alloT('stem.wave.dc_both_case', 'Both moving same direction, same speed'), effect: __alloT('stem.wave.dc_no_shift', 'No Doppler shift'), detail: __alloT('stem.wave.dc_both_detail', 'Relative velocity zero between source + observer.') },
        { case: __alloT('stem.wave.dc_barrier_case', 'Source at sound barrier (v_source ≥ v_sound)'), effect: __alloT('stem.wave.dc_sonic_boom', 'Sonic boom (Mach cone)'), detail: __alloT('stem.wave.dc_barrier_detail', 'Wavefronts stack on top of each other. Cone of compression follows the source.') }
      ];

      var EM_SPECTRUM = [
        { name: __alloT('stem.wave.em_radio_name', 'Radio'), λ: '1 mm – 100 km', f: '3 Hz – 300 GHz', energy: __alloT('stem.wave.em_radio_energy', 'Very low'), uses: __alloT('stem.wave.em_radio_uses', 'Broadcasting, communication, MRI') },
        { name: __alloT('stem.wave.em_microwave_name', 'Microwave'), λ: '1 mm – 1 m', f: '300 MHz – 300 GHz', energy: __alloT('stem.wave.em_microwave_energy', 'Low'), uses: __alloT('stem.wave.em_microwave_uses', 'Cooking (water rotation), radar, WiFi, satellite') },
        { name: __alloT('stem.wave.em_ir_name', 'Infrared (IR)'), λ: '700 nm – 1 mm', f: '300 GHz – 430 THz', energy: __alloT('stem.wave.em_ir_energy', 'Low-mid'), uses: __alloT('stem.wave.em_ir_uses', 'Thermal imaging, TV remotes, fiber optics') },
        { name: __alloT('stem.wave.em_visible_name', 'Visible light'), λ: '380 – 700 nm', f: '430 – 790 THz', energy: __alloT('stem.wave.em_visible_energy', 'Mid'), uses: __alloT('stem.wave.em_visible_uses', 'Vision, photosynthesis, photography') },
        { name: __alloT('stem.wave.em_uv_name', 'Ultraviolet (UV)'), λ: '10 – 380 nm', f: '790 THz – 30 PHz', energy: __alloT('stem.wave.em_uv_energy', 'High'), uses: __alloT('stem.wave.em_uv_uses', 'Sterilization, fluorescence, Vit D synthesis') },
        { name: __alloT('stem.wave.em_xray_name', 'X-ray'), λ: '0.01 – 10 nm', f: '30 PHz – 30 EHz', energy: __alloT('stem.wave.em_xray_energy', 'Very high'), uses: __alloT('stem.wave.em_xray_uses', 'Medical imaging, crystallography, security scanners') },
        { name: __alloT('stem.wave.em_gamma_name', 'Gamma ray'), λ: '< 0.01 nm', f: '> 30 EHz', energy: __alloT('stem.wave.em_gamma_energy', 'Extreme'), uses: __alloT('stem.wave.em_gamma_uses', 'Cancer treatment, sterilization, astronomy (most energetic photons)') }
      ];

      var VISIBLE_COLORS = [
        { color: __alloT('stem.wave.vc_violet', 'Violet'), λnm: '380–450', f: '670–790 THz', hex: '#7c3aed', notes: __alloT('stem.wave.vc_violet_notes', 'Highest-energy visible. Just below UV.') },
        { color: __alloT('stem.wave.vc_blue', 'Blue'), λnm: '450–485', f: '620–670 THz', hex: '#2563eb', notes: __alloT('stem.wave.vc_blue_notes', 'Sky color (Rayleigh scattering favors short λ).') },
        { color: __alloT('stem.wave.vc_cyan', 'Cyan'), λnm: '485–500', f: '600–620 THz', hex: '#0891b2', notes: __alloT('stem.wave.vc_cyan_notes', 'Bright in shallow water.') },
        { color: __alloT('stem.wave.vc_green', 'Green'), λnm: '500–565', f: '530–600 THz', hex: '#16a34a', notes: __alloT('stem.wave.vc_green_notes', 'Peak photopic eye sensitivity (~555 nm).') },
        { color: __alloT('stem.wave.vc_yellow', 'Yellow'), λnm: '565–590', f: '510–530 THz', hex: '#eab308', notes: __alloT('stem.wave.vc_yellow_notes', 'Sodium lamp emission (589 nm doublet).') },
        { color: __alloT('stem.wave.vc_orange', 'Orange'), λnm: '590–625', f: '480–510 THz', hex: '#ea580c', notes: __alloT('stem.wave.vc_orange_notes', 'Sunset enhances reds + oranges via scattering.') },
        { color: __alloT('stem.wave.vc_red', 'Red'), λnm: '625–700', f: '430–480 THz', hex: '#dc2626', notes: __alloT('stem.wave.vc_red_notes', 'Lowest-energy visible. Just above IR.') }
      ];

      var HARMONICS = [
        { mode: __alloT('stem.wave.harm_fundamental_mode', 'Fundamental (1st)'), nodes: '2 (ends)', f: 'f₁', desc: __alloT('stem.wave.harm_fundamental_desc', 'Lowest mode. One antinode in the middle.') },
        { mode: __alloT('stem.wave.harm_2nd_mode', '2nd harmonic'), nodes: '3', f: '2 f₁', desc: __alloT('stem.wave.harm_2nd_desc', 'One full wavelength fits in the string length.') },
        { mode: __alloT('stem.wave.harm_3rd_mode', '3rd harmonic'), nodes: '4', f: '3 f₁', desc: __alloT('stem.wave.harm_3rd_desc', 'Three half-wavelengths fit. Common in plucked strings.') },
        { mode: __alloT('stem.wave.harm_4th_mode', '4th harmonic'), nodes: '5', f: '4 f₁', desc: __alloT('stem.wave.harm_4th_desc', 'Even integer; less common in stringed instruments tuned to fundamental.') },
        { mode: __alloT('stem.wave.harm_nth_mode', 'nth harmonic'), nodes: 'n+1', f: 'n f₁', desc: __alloT('stem.wave.harm_nth_desc', 'General formula. Higher harmonics give timbre / character to a note.') }
      ];

      var WAVE_FORMULAS = [
        { eq: 'v = f · λ', purpose: __alloT('stem.wave.wf_speed', 'Wave speed from frequency + wavelength') },
        { eq: 'T = 1 / f', purpose: __alloT('stem.wave.wf_period', 'Period and frequency are reciprocals') },
        { eq: 'y(x,t) = A · sin(kx − ωt + φ)', purpose: __alloT('stem.wave.wf_sinusoidal', 'Standard sinusoidal traveling wave') },
        { eq: 'k = 2π / λ', purpose: __alloT('stem.wave.wf_wavenumber', 'Wave number ↔ wavelength') },
        { eq: 'ω = 2π f', purpose: __alloT('stem.wave.wf_angfreq', 'Angular frequency ↔ frequency') },
        { eq: 'Intensity ∝ A²', purpose: __alloT('stem.wave.wf_intensity', 'Energy/area carried by wave grows as square of amplitude') },
        { eq: 'n₁ sin θ₁ = n₂ sin θ₂', purpose: __alloT('stem.wave.wf_snell', 'Snell\'s law — refraction at interface') },
        { eq: 'd sin θ = m λ', purpose: __alloT('stem.wave.wf_grating', 'Diffraction grating maxima (m = order)') },
        { eq: 'f\' = f · (v + vₒ) / (v − vₛ)', purpose: __alloT('stem.wave.wf_doppler', 'Doppler shift (general; signs depend on directions)') },
        { eq: 'E = hf = hc / λ', purpose: __alloT('stem.wave.wf_photon', 'Photon energy (h = Planck constant)') }
      ];

      var STANDING_WAVE_INSTRUMENTS = [
        { instrument: __alloT('stem.wave.swi_guitar_name', 'Guitar string'), boundary: __alloT('stem.wave.swi_guitar_boundary', 'Both ends fixed'), harmonics: __alloT('stem.wave.swi_all_integers', 'All integers (1,2,3,4...)'), formula: 'fₙ = n · v/(2L)', note: __alloT('stem.wave.swi_guitar_note', 'Pluck position selects which harmonics dominate. Near center → odd harmonics.') },
        { instrument: __alloT('stem.wave.swi_openpipe_name', 'Open organ pipe'), boundary: __alloT('stem.wave.swi_openpipe_boundary', 'Both ends open (antinodes)'), harmonics: __alloT('stem.wave.swi_all_integers', 'All integers (1,2,3,4...)'), formula: 'fₙ = n · v/(2L)', note: __alloT('stem.wave.swi_openpipe_note', 'Same formula as string. Wave equation symmetric.') },
        { instrument: __alloT('stem.wave.swi_closedpipe_name', 'Closed organ pipe'), boundary: __alloT('stem.wave.swi_closedpipe_boundary', 'One closed end'), harmonics: __alloT('stem.wave.swi_odd_only', 'Odd only (1,3,5,7...)'), formula: 'fₙ = (2n−1) · v/(4L)', note: __alloT('stem.wave.swi_closedpipe_note', 'Only odd harmonics. Octave + 5th, not octave alone.') },
        { instrument: __alloT('stem.wave.swi_drum_name', 'Drum head'), boundary: __alloT('stem.wave.swi_drum_boundary', 'Circular fixed edge'), harmonics: __alloT('stem.wave.swi_drum_harmonics', 'Bessel function modes'), formula: __alloT('stem.wave.swi_drum_formula', 'Complex 2D'), note: __alloT('stem.wave.swi_drum_note', 'Inharmonic — doesn\'t sound like a clear pitch. Tympani tuned to approximate one.') },
        { instrument: __alloT('stem.wave.swi_marimba_name', 'Marimba bar'), boundary: __alloT('stem.wave.swi_marimba_boundary', 'Bar supported at nodes'), harmonics: __alloT('stem.wave.swi_marimba_harmonics', 'Tunable with bar shape'), formula: __alloT('stem.wave.swi_marimba_formula', 'Depends on cross-section'), note: __alloT('stem.wave.swi_marimba_note', 'Undercut shapes the second partial to be a perfect octave above the fundamental.') }
      ];

      var SOUND_INTENSITY = [
        { db: 0, source: __alloT('stem.wave.si_threshold_src', 'Threshold of hearing'), notes: __alloT('stem.wave.si_threshold_notes', 'Reference: 10⁻¹² W/m²') },
        { db: 10, source: __alloT('stem.wave.si_breathing_src', 'Breathing'), notes: __alloT('stem.wave.si_breathing_notes', 'Quietest noticeable sound') },
        { db: 30, source: __alloT('stem.wave.si_whisper_src', 'Whisper'), notes: __alloT('stem.wave.si_whisper_notes', 'Library quiet') },
        { db: 60, source: __alloT('stem.wave.si_conversation_src', 'Conversation'), notes: __alloT('stem.wave.si_conversation_notes', 'Office background') },
        { db: 70, source: __alloT('stem.wave.si_vacuum_src', 'Vacuum cleaner'), notes: __alloT('stem.wave.si_vacuum_notes', 'Annoying at length') },
        { db: 85, source: __alloT('stem.wave.si_traffic_src', 'Heavy traffic'), notes: __alloT('stem.wave.si_traffic_notes', 'Hearing damage above this with extended exposure') },
        { db: 100, source: __alloT('stem.wave.si_motorcycle_src', 'Motorcycle / blender'), notes: __alloT('stem.wave.si_motorcycle_notes', 'Damage in 15 min') },
        { db: 110, source: __alloT('stem.wave.si_concert_src', 'Rock concert'), notes: __alloT('stem.wave.si_concert_notes', 'Damage in seconds to minutes') },
        { db: 120, source: __alloT('stem.wave.si_jet_src', 'Jet engine at 100 m'), notes: __alloT('stem.wave.si_jet_notes', 'Threshold of pain') },
        { db: 140, source: __alloT('stem.wave.si_gunshot_src', 'Gunshot at ear'), notes: __alloT('stem.wave.si_gunshot_notes', 'Instant damage') },
        { db: 194, source: __alloT('stem.wave.si_max_src', 'Theoretical max in air'), notes: __alloT('stem.wave.si_max_notes', 'Pressure variation = atmospheric pressure (can\'t go louder without becoming shock wave)') }
      ];

      var WAVE_GLOSSARY = [
        { term: __alloT('stem.wave.gl_crest_term', 'Crest'), def: __alloT('stem.wave.gl_crest_def', 'Highest point of a transverse wave. Maximum positive displacement.') },
        { term: __alloT('stem.wave.gl_trough_term', 'Trough'), def: __alloT('stem.wave.gl_trough_def', 'Lowest point of a transverse wave. Maximum negative displacement.') },
        { term: __alloT('stem.wave.gl_compression_term', 'Compression'), def: __alloT('stem.wave.gl_compression_def', 'Region of high pressure in a longitudinal wave (sound).') },
        { term: __alloT('stem.wave.gl_rarefaction_term', 'Rarefaction'), def: __alloT('stem.wave.gl_rarefaction_def', 'Region of low pressure in a longitudinal wave.') },
        { term: __alloT('stem.wave.gl_node_term', 'Node'), def: __alloT('stem.wave.gl_node_def', 'Point of zero displacement on a standing wave.') },
        { term: __alloT('stem.wave.gl_antinode_term', 'Antinode'), def: __alloT('stem.wave.gl_antinode_def', 'Point of maximum displacement on a standing wave.') },
        { term: __alloT('stem.wave.gl_reflection_term', 'Reflection'), def: __alloT('stem.wave.gl_reflection_def', 'Wave bouncing off a boundary. Phase flips if going from less to more dense (hard boundary).') },
        { term: __alloT('stem.wave.gl_refraction_term', 'Refraction'), def: __alloT('stem.wave.gl_refraction_def', 'Wave bending as it crosses a boundary where speed changes. Snell\'s law.') },
        { term: __alloT('stem.wave.gl_diffraction_term', 'Diffraction'), def: __alloT('stem.wave.gl_diffraction_def', 'Wave bending around obstacles or through apertures. Effect strong when aperture ~ λ.') },
        { term: __alloT('stem.wave.gl_interference_term', 'Interference'), def: __alloT('stem.wave.gl_interference_def', 'Two waves overlapping. Constructive (in phase) or destructive (out of phase).') },
        { term: __alloT('stem.wave.gl_standingwave_term', 'Standing wave'), def: __alloT('stem.wave.gl_standingwave_def', 'Pattern from two identical waves traveling opposite directions. Nodes + antinodes fixed in space.') },
        { term: __alloT('stem.wave.gl_resonance_term', 'Resonance'), def: __alloT('stem.wave.gl_resonance_def', 'Large amplitude when driving frequency matches natural frequency. Tacoma Narrows bridge collapse classic example (with caveats).') },
        { term: __alloT('stem.wave.gl_damping_term', 'Damping'), def: __alloT('stem.wave.gl_damping_def', 'Loss of amplitude over time due to friction or radiation. Critical damping = fastest decay without overshoot.') },
        { term: __alloT('stem.wave.gl_coherence_term', 'Coherence'), def: __alloT('stem.wave.gl_coherence_def', 'Constant phase relationship between waves. Required for stable interference patterns. Lasers are highly coherent.') },
        { term: __alloT('stem.wave.gl_polarization_term', 'Polarization'), def: __alloT('stem.wave.gl_polarization_def', 'Direction of oscillation in a transverse wave. Light from sun is unpolarized; passing through a polarizer selects one direction.') },
        { term: __alloT('stem.wave.gl_photon_term', 'Photon'), def: __alloT('stem.wave.gl_photon_def', 'Quantum of EM radiation. Energy E = hf. Each photon carries momentum p = h/λ.') }
      ];

      function expHeader() {
        return React.createElement('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-black text-cyan-900' }, '🌊 ' + __alloT('stem.wave.exp_library_title', 'Wave Reference Library')),
            React.createElement('div', { className: 'text-[11px] text-cyan-700 mt-0.5' }, __alloT('stem.wave.exp_library_subtitle', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && React.createElement('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-1 rounded-md text-xs font-bold bg-white border border-cyan-300 text-cyan-700 hover:bg-cyan-100 active:scale-[0.97]'
          }, '✕ ' + __alloT('stem.wave.exp_close_section', 'Close section'))
        );
      }

      function expTabBar() {
        // 45 wave/optics sections grouped into 7 cohesive domains. Renamed
        // duplicate id 'instruments' (was used for both Standing waves AND
        // Instrument freqs) — second now 'instrumentfreqs'. All other IDs
        // preserved. Groups: Wave Basics · Sound & Music · Light & Optics ·
        // EM Spectrum · Communications · Natural & Cosmic · Reference.
        var TAB_GROUPS = [
          { id: 'basics', label: __alloT('stem.wave.grp_basics', 'Wave Basics'), color: 'cyan', tabs: [
            { id: 'types', label: __alloT('stem.wave.tab_types', 'Wave types'), icon: '🌊' },
            { id: 'quantities', label: __alloT('stem.wave.tab_quantities', 'Wave quantities'), icon: '📐' },
            { id: 'formulas', label: __alloT('stem.wave.tab_formulas', 'Key formulas'), icon: 'ƒ' },
            { id: 'units2', label: __alloT('stem.wave.tab_units', 'Wave units'), icon: '∑' },
            { id: 'wavespeed', label: __alloT('stem.wave.tab_wavespeeds', 'Wave speeds'), icon: '⏱' },
            { id: 'speeds2', label: __alloT('stem.wave.tab_detailedspeeds', 'Detailed speeds'), icon: '⏲' },
            { id: 'interference', label: __alloT('stem.wave.tab_interference', 'Interference'), icon: '+' },
            { id: 'diffraction', label: __alloT('stem.wave.tab_diffraction', 'Diffraction'), icon: '∿' },
            { id: 'polarization', label: __alloT('stem.wave.tab_polarization', 'Polarization'), icon: '↕' },
            { id: 'doppler', label: __alloT('stem.wave.tab_doppler', 'Doppler effect'), icon: '🚓' },
            { id: 'shockwaves', label: __alloT('stem.wave.tab_shockwaves', 'Shock waves'), icon: '✈' },
            { id: 'standingHunt', label: __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt'), icon: '🎯' },
            { id: 'discoverWave', label: __alloT('stem.wave.tab_discover', 'Discover f·λ=v'), icon: '🔬' }
          ] },
          { id: 'sound', label: __alloT('stem.wave.grp_sound', 'Sound & Music'), color: 'amber', tabs: [
            { id: 'harmonics', label: __alloT('stem.wave.tab_harmonics', 'Harmonics'), icon: '🎵' },
            { id: 'instruments', label: __alloT('stem.wave.tab_standingwaves', 'Standing waves'), icon: '🎸' },
            { id: 'instrumentfreqs', label: __alloT('stem.wave.tab_instrumentfreqs', 'Instrument freqs'), icon: '🎻' },
            { id: 'music', label: __alloT('stem.wave.tab_music', 'Music + acoustics'), icon: '🎼' },
            { id: 'decibels', label: __alloT('stem.wave.tab_soundintensity', 'Sound intensity'), icon: '🔊' },
            { id: 'noise', label: __alloT('stem.wave.tab_noise', 'Noise sources'), icon: '📢' },
            { id: 'hearing', label: __alloT('stem.wave.tab_hearing', 'Hearing + ear'), icon: '👂' },
            { id: 'recordings', label: __alloT('stem.wave.tab_audioformats', 'Audio formats'), icon: '🎧' }
          ] },
          { id: 'optics', label: __alloT('stem.wave.grp_optics', 'Light & Optics'), color: 'fuchsia', tabs: [
            { id: 'optics', label: __alloT('stem.wave.tab_optics', 'Optics & lenses'), icon: '🔍' },
            { id: 'refraction', label: __alloT('stem.wave.tab_refraction', 'Refraction index'), icon: '↻' },
            { id: 'colors', label: __alloT('stem.wave.tab_visiblelight', 'Visible light'), icon: '🌈' },
            { id: 'colors2', label: __alloT('stem.wave.tab_colormodels', 'Color models'), icon: '🎨' },
            { id: 'colorhex', label: __alloT('stem.wave.tab_namedcolors', 'Named colors'), icon: '🖌' },
            { id: 'lasers', label: __alloT('stem.wave.tab_lasers', 'Lasers'), icon: '⫸' },
            { id: 'cameras', label: __alloT('stem.wave.tab_cameras', 'Camera lenses'), icon: '📷' },
            { id: 'optical_facts', label: __alloT('stem.wave.tab_perception', 'Perception & illusions'), icon: '👁' }
          ] },
          { id: 'spectrum', label: __alloT('stem.wave.grp_spectrum', 'EM Spectrum'), color: 'violet', tabs: [
            { id: 'spectrum', label: __alloT('stem.wave.tab_emspectrum', 'EM spectrum'), icon: '⚡' },
            { id: 'radio', label: __alloT('stem.wave.tab_radiobands', 'Radio bands'), icon: '📻' },
            { id: 'tvfreq', label: __alloT('stem.wave.tab_tvscreen', 'TV + screen'), icon: '📺' },
            { id: 'quantum', label: __alloT('stem.wave.tab_quantum', 'Quantum waves'), icon: '⚛' }
          ] },
          { id: 'comm', label: __alloT('stem.wave.grp_comm', 'Communications'), color: 'sky', tabs: [
            { id: 'antennas', label: __alloT('stem.wave.tab_antennas', 'Antennas'), icon: '📶' },
            { id: 'radar', label: __alloT('stem.wave.tab_radarsonar', 'Radar/sonar'), icon: '📡' },
            { id: 'protocols', label: __alloT('stem.wave.tab_commprotocols', 'Comm protocols'), icon: '🛜' },
            { id: 'fibers', label: __alloT('stem.wave.tab_fiberoptics', 'Fiber optics'), icon: '〰' },
            { id: 'satellites', label: __alloT('stem.wave.tab_gpssatellites', 'GPS + satellites'), icon: '🛰' },
            { id: 'medical', label: __alloT('stem.wave.tab_medicalimaging', 'Medical imaging'), icon: '🏥' }
          ] },
          { id: 'natural', label: __alloT('stem.wave.grp_natural', 'Natural & Cosmic'), color: 'emerald', tabs: [
            { id: 'ocean', label: __alloT('stem.wave.tab_oceanwaves', 'Ocean waves'), icon: '🏄' },
            { id: 'seismic', label: __alloT('stem.wave.tab_seismicwaves', 'Seismic waves'), icon: '🌋' },
            { id: 'animals', label: __alloT('stem.wave.tab_animalsenses', 'Animal senses'), icon: '🦇' },
            { id: 'stars', label: __alloT('stem.wave.tab_stars', 'Stars + spectra'), icon: '⭐' },
            { id: 'gravitational', label: __alloT('stem.wave.tab_gravwaves', 'Gravitational waves'), icon: '⌇' }
          ] },
          { id: 'reference', label: __alloT('stem.wave.grp_reference', 'Reference'), color: 'slate', tabs: [
            { id: 'careers', label: __alloT('stem.wave.tab_careers', 'Wave careers'), icon: '💼' },
            { id: 'famous', label: __alloT('stem.wave.tab_history', 'History'), icon: '🕰' },
            { id: 'glossary', label: __alloT('stem.wave.tab_glossary', 'Glossary'), icon: '📖' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return React.createElement('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1.5 rounded-md text-[11px] font-bold border transition-colors active:scale-[0.97] ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-' + accent + '-50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        // Accordion: one group open at a time — 47 chips at once was a wall.
        // Default-open the group that contains the active section, if any.
        var openGroup = d2.expGroup;
        if (openGroup === undefined && expSection) {
          for (var gi = 0; gi < TAB_GROUPS.length; gi++) {
            if ((TAB_GROUPS[gi].tabs || []).some(function(s) { return s.id === expSection; })) { openGroup = TAB_GROUPS[gi].id; break; }
          }
        }
        return React.createElement('div', { className: 'mb-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col overflow-hidden' },
          TAB_GROUPS.map(function(g) {
            var isOpen = openGroup === g.id;
            return React.createElement('div', { key: g.id, className: 'border-b border-slate-200 last:border-b-0' },
              React.createElement('button', {
                onClick: function() { setExp({ expGroup: isOpen ? null : g.id }); },
                'aria-expanded': isOpen,
                className: 'transition-colors w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-' + g.color + '-50'
              },
                React.createElement('span', { className: 'text-[11px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 flex-1' }, g.label),
                React.createElement('span', { className: 'text-[10px] text-slate-500 font-bold' }, (g.tabs || []).length + __alloT('stem.wave.count_topics', ' topics ') + (isOpen ? '▲' : '▼'))
              ),
              isOpen && React.createElement('div', { role: 'group', 'aria-label': g.label + __alloT('stem.wave.aria_topics_suffix', ' topics'), className: 'px-3 pb-2 flex items-center gap-1.5 flex-wrap' },
                (g.tabs || []).map(function(s) { return renderBtn(s, g.color); })
              )
            );
          })
        );
      }

      function renderTypesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌊 ' + __alloT('stem.wave.tab_types', 'Wave types')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_types_intro', 'Waves are categorized by particle motion relative to propagation, and by whether they need a medium. All carry energy but no matter from one place to another.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_TYPES.map(function(w, i) {
              return React.createElement('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl text-cyan-600' }, w.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, w.name),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800' }, w.speed)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed mb-1' }, w.desc),
                React.createElement('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.wave.label_examples', 'Examples: '), w.examples.join(', '))
              );
            })
          )
        );
      }

      function renderQuantitiesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📐 ' + __alloT('stem.wave.tab_quantities', 'Wave quantities')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_quantities_intro', 'The full vocabulary needed to describe any wave. Most quantities are related — once you know two, you can derive the rest.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_QUANTITIES.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-lg font-black text-cyan-700 font-mono min-w-[24px] tracking-tight' }, q.sym),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'ƒ ' + __alloT('stem.wave.sec_formulas_title', 'Key wave equations')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '+ ' + __alloT('stem.wave.sec_interference_title', 'Interference + superposition')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_interference_intro', 'When two waves meet, their displacements add (principle of superposition). After passing through each other, each wave continues unchanged.')),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            INTERFERENCE_PATTERNS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-2xl font-black text-cyan-700 tracking-tight' }, p.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, p.type),
                  React.createElement('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, p.condition)
                ),
                React.createElement('div', { className: 'text-[12px] text-slate-700 leading-relaxed' }, p.result)
              );
            })
          ),
          React.createElement('div', { className: 'p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            React.createElement('strong', null, '💡 ' + __alloT('stem.wave.sec_beats_label', 'Beats: ')), __alloT('stem.wave.sec_beats_text', 'Two waves of slightly different frequency interfere alternately constructively + destructively. Beat frequency = |f₁ − f₂|. Musicians use this to tune by ear.')
          )
        );
      }

      function renderDopplerSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🚓 ' + __alloT('stem.wave.tab_doppler', 'Doppler effect')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_doppler_intro', 'Frequency observed changes when source and/or observer move relative to each other. The ambulance siren that drops pitch as it passes you = sound Doppler. Galaxy redshift = light Doppler.')),
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
            React.createElement('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, '📡 ' + __alloT('stem.wave.sec_applications', 'Applications')),
            React.createElement('div', { className: 'text-[11px] text-emerald-900 leading-relaxed' },
              '• ' + __alloT('stem.wave.doppler_app_radar', 'Police radar: bounces microwaves off your car; Doppler shift = your speed. '),
              '• ' + __alloT('stem.wave.doppler_app_ultrasound', 'Doppler ultrasound: measures blood flow direction + speed. '),
              '• ' + __alloT('stem.wave.doppler_app_hubble', 'Hubble\'s discovery: distant galaxies are redshifted → universe expanding. '),
              '• ' + __alloT('stem.wave.doppler_app_cmb', 'Cosmic microwave background: small Doppler shifts reveal early-universe structure.')
            )
          )
        );
      }

      function renderSpectrumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ ' + __alloT('stem.wave.sec_spectrum_title', 'Electromagnetic spectrum')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_spectrum_intro', 'All EM waves travel at c in vacuum. The full spectrum spans 18+ orders of magnitude in frequency. We see only a narrow sliver (visible light). Energy per photon: E = hf — higher frequency = more energetic.')),
          React.createElement('div', { className: 'space-y-1.5' },
            EM_SPECTRUM.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800 min-w-[100px]' }, s.name),
                  React.createElement('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 ml-auto' }, s.energy + __alloT('stem.wave.label_energy_suffix', ' energy'))
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-0.5 font-mono' }, 'λ: ', s.λ, '  ·  f: ', s.f),
                React.createElement('div', { className: 'text-[11px] text-slate-700' }, __alloT('stem.wave.label_uses', 'Uses: '), s.uses)
              );
            })
          )
        );
      }

      function renderColorsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌈 ' + __alloT('stem.wave.sec_colors_title', 'Visible light spectrum')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_colors_intro', 'Human vision spans ~380-700 nm. Each color corresponds to a specific range of wavelengths. White light = mix of all visible wavelengths.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 ' + __alloT('stem.wave.sec_harmonics_title', 'Harmonics — modes of vibration')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_harmonics_intro', 'A vibrating string supports an infinite series of modes called harmonics. Each has a specific number of nodes (zero-amplitude points) + antinodes (max-amplitude points). The mix of harmonics = timbre.')),
          React.createElement('div', { className: 'space-y-1.5' },
            HARMONICS.map(function(h, i) {
              return React.createElement('div', { key: 'h'+i, className: 'flex items-baseline gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'min-w-[140px]' },
                  React.createElement('div', { className: 'text-[12px] font-black text-slate-800' }, h.mode),
                  React.createElement('div', { className: 'text-[10px] text-slate-500 font-mono' }, h.nodes + __alloT('stem.wave.label_nodes_f', ' nodes · f = ') + h.f)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h.desc)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] text-purple-900' },
            React.createElement('strong', null, '💡 ' + __alloT('stem.wave.harm_callout_label', 'Why instruments sound different: ')), __alloT('stem.wave.harm_callout_text', 'A note at 440 Hz on a violin and a flute both have fundamental at 440 Hz. The MIX of higher harmonics (the spectrum) is different — that\'s timbre. Pure sine = boring; rich harmonic content = recognizable instrument.')
          )
        );
      }

      function renderInstrumentsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎸 ' + __alloT('stem.wave.sec_instruments_title', 'Standing waves in instruments')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_instruments_intro', 'Instruments make tones by setting up standing waves. The boundary conditions (open/closed/fixed ends) determine which harmonics are allowed.')),
          React.createElement('div', { className: 'space-y-2' },
            STANDING_WAVE_INSTRUMENTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, s.instrument),
                  React.createElement('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-purple-100 text-purple-800' }, s.harmonics)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' }, React.createElement('strong', null, __alloT('stem.wave.label_boundary', 'Boundary: ')), s.boundary),
                React.createElement('div', { className: 'text-[11px] font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded mb-1 inline-block' }, s.formula),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.note)
              );
            })
          )
        );
      }

      function renderDecibelsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 ' + __alloT('stem.wave.sec_decibels_title', 'Sound intensity (decibels)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_decibels_intro', 'Decibels are a logarithmic scale. +10 dB ≈ 10× intensity, perceived as ~2× as loud. dB SPL (sound pressure level) is referenced to threshold of human hearing.')),
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
            React.createElement('strong', null, '⚠ ' + __alloT('stem.wave.db_callout_label', 'Permanent hearing loss: ')), __alloT('stem.wave.db_callout_text', 'OSHA: 85 dB for 8 hours, 90 dB for 4 hours, etc. (each +5 dB halves safe exposure time). Wear ear protection at concerts, with power tools, at firing ranges.')
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
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🔬 ' + __alloT('stem.wave.sec_discover_title', 'Discover the wave equation')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.wave.sec_discover_intro', 'A string is fixed at both ends. Wiggle the controls. Watch what changes and what stays the same. Log a few observations, then try to spot the pattern. Hit "I see it" when you think you have the law — no peeking.')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            // Left: live SVG visualization
            h('div', { className: 'p-3 rounded-lg bg-slate-900 border border-slate-700' },
              h('svg', { viewBox: '0 0 260 100', width: '100%', style: { height: 'auto' }, 'aria-label': __alloT('stem.wave.aria_standing_string', 'Standing wave on a string') },
                h('line', { x1: 10, y1: 50, x2: 250, y2: 50, stroke: '#475569', strokeDasharray: '2,2', strokeWidth: 1 }),
                h('path', { d: pathStr, fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, opacity: 0.95 }),
                h('circle', { cx: 10, cy: 50, r: 4, fill: '#fbbf24' }),
                h('circle', { cx: 250, cy: 50, r: 4, fill: '#fbbf24' }),
                h('text', { x: 130, y: 92, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, __alloT('stem.wave.svg_length_2m', 'Length L = 2.0 m (fixed)'))
              ),
              h('div', { className: 'mt-2 grid grid-cols-2 gap-2 text-[11px]' },
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, __alloT('stem.wave.card_period', 'Period') + ' T'),
                  h('div', { className: 'font-mono font-bold text-base' }, period.toFixed(3) + ' s')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, __alloT('stem.wave.card_wavelength', 'Wavelength') + ' λ'),
                  h('div', { className: 'font-mono font-bold text-base' }, wavelength.toFixed(3) + ' m')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-amber-300' },
                  h('div', { className: 'text-[9px] uppercase text-slate-400 tracking-wider' }, __alloT('stem.wave.label_wavespeed', 'Wave speed') + ' v'),
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
              h('label', { htmlFor: 'discFreq', className: 'block text-[11px] font-bold text-slate-700' }, __alloT('stem.wave.disc_freq_label', 'Frequency f: ') + lab.freq.toFixed(2) + ' Hz'),
              h('input', { id: 'discFreq', type: 'range', min: 1, max: 20, step: 0.5, value: lab.freq, onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); }, className: 'w-full', 'aria-label': __alloT('stem.wave.ctrl_frequency_aria', 'Frequency in hertz') }),
              h('label', { htmlFor: 'discTen', className: 'block text-[11px] font-bold text-slate-700 mt-2' }, __alloT('stem.wave.disc_tension_label', 'String tension T: ') + lab.tension + ' N'),
              h('input', { id: 'discTen', type: 'range', min: 10, max: 200, step: 5, value: lab.tension, onChange: function(e) { setLab({ tension: parseInt(e.target.value, 10) }); }, className: 'w-full', 'aria-label': __alloT('stem.wave.aria_tension_newtons', 'Tension in newtons') }),
              h('p', { className: 'text-[10px] text-slate-500 italic mt-1' }, __alloT('stem.wave.disc_mu_note', '(string mass density μ fixed at 0.01 kg/m)')),
              h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
                h('button', { onClick: logObservation, className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none active:scale-[0.97]' }, '📝 ' + __alloT('stem.wave.btn_log_observation', 'Log observation')),
                h('button', { onClick: reveal, disabled: lab.discovered, className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]' }, lab.discovered ? '✓ ' + __alloT('stem.wave.btn_revealed', 'Revealed') : '💡 ' + __alloT('stem.wave.btn_i_see_it', 'I see it')),
                h('button', { onClick: reset, className: 'transition-colors px-2 py-1 rounded text-[11px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-2 focus:ring-slate-400 focus:outline-none active:scale-[0.97]' }, '↻ ' + __alloT('stem.wave.btn_reset', 'Reset'))
              ),
              (lab.observationsLogged || []).length > 0 && h('div', { className: 'mt-2' },
                h('div', { className: 'text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, __alloT('stem.wave.disc_your_observations', 'Your observations')),
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
            h('strong', null, '🔍 ' + __alloT('stem.wave.disc_hypothesis_label', 'Hypothesis time: ')), __alloT('stem.wave.disc_hypothesis_text', 'Compare your f × λ column. Is it constant for different f values at the same tension? What about when you change tension? Form a hypothesis before clicking "I see it".')),
          lab.discovered && h('div', { className: 'mt-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-l-emerald-500' },
            h('div', { className: 'font-black text-emerald-900 mb-1' }, '✨ ' + __alloT('stem.wave.disc_equation_label', 'The wave equation: ') + 'v = f · λ'),
            h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' },
              __alloT('stem.wave.disc_reveal_text', 'For a wave on a string, the speed v depends ONLY on the string\'s tension and mass density (v = √(T/μ)). The product f·λ always equals v. Change frequency → wavelength compensates so f·λ stays constant. Increase tension → wave speed jumps → f·λ jumps with it. Frequency × wavelength is one of the deepest constancies in physics: it shows up identically for light, sound, water waves, and quantum matter waves.')),
            h('p', { className: 'text-[11px] text-emerald-700 mt-1 italic' }, __alloT('stem.wave.disc_reveal_hertz', 'You just discovered it the way Hertz did — by watching what stays constant when you change one variable at a time.'))
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
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🎯 ' + __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.wave.sec_standinghunt_intro', 'A string fixed at both ends. You control the tension and the driving frequency. There is no "right answer" — and no answer dump. Sweep the sliders. Look for the rare frequencies where the string locks into a clean standing pattern. Type what you discover in your own words.')),
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
                isHarmonic ? ('✓ ' + __alloT('stem.wave.sh_standing_pattern', 'Standing pattern — n = ') + nNear + ' (' + nNear + __alloT('stem.wave.sh_half_wavelengths', ' half-wavelengths)')) : __alloT('stem.wave.sh_off_resonance', 'Off-resonance — pattern unstable')),
              h('text', { x: 160, y: 112, textAnchor: 'middle', fontSize: 9, fill: '#475569' },
                'T = ' + lab.tension.toFixed(0) + ' N  |  f = ' + lab.freq.toFixed(2) + ' Hz  |  v = ' + v.toFixed(1) + ' m/s  |  λ = ' + wavelength.toFixed(2) + ' m  |  n = ' + nEff.toFixed(2))
            )
          ),
          // Sliders — continuous manipulation, no chip pool
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
            h('div', null,
              h('label', { htmlFor: 'sh-tension', className: 'block text-[11px] font-bold text-slate-700 mb-1' },
                __alloT('stem.wave.sh_tension_label', 'Tension: '), h('span', { className: 'font-mono text-indigo-700' }, lab.tension.toFixed(0) + ' N')),
              h('input', {
                id: 'sh-tension', type: 'range', min: 10, max: 200, step: 1, value: lab.tension,
                onChange: function(e) { setLab({ tension: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': __alloT('stem.wave.aria_tension_newtons', 'Tension in newtons')
              }),
              h('div', { className: 'text-[9px] text-slate-500 flex justify-between' },
                h('span', null, '10 N'), h('span', null, '200 N'))
            ),
            h('div', null,
              h('label', { htmlFor: 'sh-freq', className: 'block text-[11px] font-bold text-slate-700 mb-1' },
                __alloT('stem.wave.sh_frequency_label', 'Frequency: '), h('span', { className: 'font-mono text-indigo-700' }, lab.freq.toFixed(2) + ' Hz')),
              h('input', {
                id: 'sh-freq', type: 'range', min: 1, max: 30, step: 0.05, value: lab.freq,
                onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': __alloT('stem.wave.aria_driving_freq', 'Driving frequency in hertz')
              }),
              h('div', { className: 'text-[9px] text-slate-500 flex justify-between' },
                h('span', null, '1 Hz'), h('span', null, '30 Hz'))
            )
          ),
          // Log observation button (optional record-keeping; no scoring)
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-3' },
            h('button', {
              onClick: logObservation,
              className: 'transition-colors px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 border border-slate-300 active:scale-[0.97]'
            }, '📋 ' + __alloT('stem.wave.sh_log_observation', 'Log this observation')),
            h('button', {
              onClick: function() { setLab({ tension: 50, freq: 4, observationsLogged: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
              className: 'transition-colors px-2 py-1 rounded bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 border border-slate-300 active:scale-[0.97]'
            }, '↺ ' + __alloT('stem.wave.btn_reset', 'Reset')),
            (lab.observationsLogged || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (lab.observationsLogged || []).length + __alloT('stem.wave.sh_obs_logged', ' observation(s) logged'))
          ),
          // Observation log (auto-tabulated; no commentary required)
          (lab.observationsLogged || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto' },
            h('table', { className: 'text-[10px] w-full border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100 text-slate-700' },
                  ['T (N)', 'f (Hz)', 'v (m/s)', 'λ (m)', 'n', __alloT('stem.wave.sh_col_locked', 'locked')].map(function(h2, i) {
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
              __alloT('stem.wave.sh_hypothesis_label', 'Your hypothesis (free text — no right answer):')),
            h('textarea', {
              id: 'sh-hypo',
              value: lab.hypothesis || '',
              onChange: function(e) { setLab({ hypothesis: e.target.value }); },
              placeholder: __alloT('stem.wave.sh_hypothesis_placeholder', 'What pattern do you notice in the values where the string locks into a clean standing wave? Type your own theory.'),
              className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug',
              rows: 3
            })
          ),
          // OPT-IN open questions — only when learner clicks "I'm stuck". No answers given.
          h('div', { className: 'mb-3' },
            !lab.stuckRevealed && h('button', {
              onClick: function() { setLab({ stuckRevealed: true }); },
              className: 'transition-colors px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-800 border border-amber-300 active:scale-[0.97]'
            }, '🤔 ' + __alloT('stem.wave.sh_stuck_btn', 'I\'m stuck — show me some questions to think about (no answers)')),
            lab.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
              h('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.wave.sh_open_questions', 'Open questions (no answers — investigate by manipulating):')),
              h('ul', { className: 'list-disc pl-5 space-y-1' },
                h('li', null, __alloT('stem.wave.sh_q1', 'Try f = 5 Hz at T = 100 N, then T = 25 N. Does the locked state happen at the same f? Why might that be?')),
                h('li', null, __alloT('stem.wave.sh_q2', 'Sweep frequency slowly from 1 → 20 Hz at fixed T. How many locked states do you find? Are they evenly spaced or pattern-spaced?')),
                h('li', null, __alloT('stem.wave.sh_q3', 'When you triple the tension, does the f of the first locked state triple, or change by some other factor? Predict before you check.')),
                h('li', null, __alloT('stem.wave.sh_q4', 'Log 4-5 locked observations. Look at the n column — what value do they share? Is that a coincidence or a constraint?')),
                h('li', null, __alloT('stem.wave.sh_q5', 'What relationship between f, T, and L would have to be true for an integer number of half-wavelengths to fit on the string?'))
              ),
              h('div', { className: 'text-[10px] italic text-amber-700 mt-2' }, __alloT('stem.wave.sh_no_answers', 'No answers will be revealed here. The point is to push your thinking, not to hand you a result.'))
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
                __alloT('stem.wave.sh_understood_label', 'I think I understand the pattern now — let me explain it in my own words'))
            ),
            lab.understood && h('textarea', {
              value: lab.explanation || '',
              onChange: function(e) { setLab({ explanation: e.target.value }); },
              placeholder: __alloT('stem.wave.sh_explanation_placeholder', 'Explain in your own words: what determines when a standing wave forms? What role does tension play? What role does frequency play? What is "n"?'),
              className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug bg-white',
              rows: 4
            }),
            lab.understood && (lab.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[10px] italic text-emerald-700' },
              '✓ ' + __alloT('stem.wave.sh_saved_note', 'Saved. Notice — nobody checked your answer. The point of inquiry is the thinking that produced it, not external validation.'))
          ),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600 italic' },
            __alloT('stem.wave.sh_design_note', 'Design note: this widget has no score, no chips, no reveal button, and no right-answer check. Everything you discover comes from manipulation and observation. That is what "inquiry" looks like when the answer-dump is removed.'))
        );
      }

      function renderGlossarySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 ' + __alloT('stem.wave.sec_glossary_title', 'Wave glossary')),
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
        { name: __alloT('stem.wave.oel1_name', 'Converging (convex) lens'), behavior: __alloT('stem.wave.oel1_behavior', 'Bends parallel rays toward focal point'), use: __alloT('stem.wave.oel1_use', 'Magnifying glass, eyeglasses for farsightedness, camera lenses, microscope objectives.') },
        { name: __alloT('stem.wave.oel2_name', 'Diverging (concave) lens'), behavior: __alloT('stem.wave.oel2_behavior', 'Spreads parallel rays as if from focal point'), use: __alloT('stem.wave.oel2_use', 'Eyeglasses for nearsightedness, peephole viewers.') },
        { name: __alloT('stem.wave.oel3_name', 'Concave (converging) mirror'), behavior: __alloT('stem.wave.oel3_behavior', 'Reflects parallel rays through focal point'), use: __alloT('stem.wave.oel3_use', 'Reflecting telescopes, satellite dishes, makeup mirrors (magnification).') },
        { name: __alloT('stem.wave.oel4_name', 'Convex (diverging) mirror'), behavior: __alloT('stem.wave.oel4_behavior', 'Reflects parallel rays as if from focal point'), use: __alloT('stem.wave.oel4_use', 'Car side mirrors ("objects in mirror are closer than they appear"), store security mirrors.') },
        { name: __alloT('stem.wave.oel5_name', 'Plane mirror'), behavior: __alloT('stem.wave.oel5_behavior', 'Flat reflection — image distance = object distance'), use: __alloT('stem.wave.oel5_use', 'Everyday mirrors. Image is virtual, upright, same-size, laterally inverted.') },
        { name: __alloT('stem.wave.oel6_name', 'Prism (triangular)'), behavior: __alloT('stem.wave.oel6_behavior', 'Separates white light into spectrum by refraction'), use: __alloT('stem.wave.oel6_use', 'Spectroscopy, rainbow demos. Different wavelengths refract by different amounts (dispersion).') },
        { name: __alloT('stem.wave.oel7_name', 'Diffraction grating'), behavior: __alloT('stem.wave.oel7_behavior', 'Separates light by many parallel slits'), use: __alloT('stem.wave.oel7_use', 'Higher resolution than prism. Used in modern spectrometers.') },
        { name: __alloT('stem.wave.oel8_name', 'Beam splitter'), behavior: __alloT('stem.wave.oel8_behavior', 'Transmits part of beam, reflects rest'), use: __alloT('stem.wave.oel8_use', 'Interferometers, LIGO, projectors, optical instruments.') },
        { name: __alloT('stem.wave.oel9_name', 'Polarizing filter'), behavior: __alloT('stem.wave.oel9_behavior', 'Transmits only one polarization direction'), use: __alloT('stem.wave.oel9_use', 'Sunglasses (cut glare from water/road), LCD displays, photography filters.') },
        { name: __alloT('stem.wave.oel10_name', 'Optical fiber'), behavior: __alloT('stem.wave.oel10_behavior', 'Total internal reflection guides light along the core'), use: __alloT('stem.wave.oel10_use', 'Internet backbone, endoscopes, fiber-optic Christmas trees.') },
        { name: __alloT('stem.wave.oel11_name', 'Half-silvered mirror'), behavior: __alloT('stem.wave.oel11_behavior', '~50% transmitted, ~50% reflected'), use: __alloT('stem.wave.oel11_use', 'One-way windows (only works with brightness asymmetry), Michelson interferometer.') },
        { name: __alloT('stem.wave.oel12_name', 'Retroreflector (corner cube)'), behavior: __alloT('stem.wave.oel12_behavior', 'Returns light to source regardless of angle'), use: __alloT('stem.wave.oel12_use', 'Bike reflectors, road signs, Apollo lunar laser ranging.') }
      ];

      var REFRACTION_INDICES = [
        { material: __alloT('stem.wave.ri_vacuum', 'Vacuum'), n: '1.0000 (defined)', notes: __alloT('stem.wave.ri_vacuum_notes', 'Reference. Light travels at c = 299,792,458 m/s.') },
        { material: __alloT('stem.wave.ri_air', 'Air (STP)'), n: '1.0003', notes: __alloT('stem.wave.ri_air_notes', 'Essentially same as vacuum for most purposes.') },
        { material: __alloT('stem.wave.ri_water', 'Water (20°C)'), n: '1.333', notes: __alloT('stem.wave.ri_water_notes', 'Bends light noticeably. Critical angle (water→air) ≈ 48.6°.') },
        { material: __alloT('stem.wave.ri_ethanol', 'Ethanol'), n: '1.361', notes: __alloT('stem.wave.ri_ethanol_notes', 'Slightly more refractive than water.') },
        { material: __alloT('stem.wave.ri_glycerin', 'Glycerin'), n: '1.473', notes: __alloT('stem.wave.ri_glycerin_notes', 'Submerged glass nearly invisible in glycerin (similar n).') },
        { material: __alloT('stem.wave.ri_quartz', 'Quartz'), n: '1.544', notes: __alloT('stem.wave.ri_quartz_notes', 'Common in optics. Some birefringence.') },
        { material: __alloT('stem.wave.ri_crown', 'Crown glass'), n: '1.52', notes: __alloT('stem.wave.ri_crown_notes', 'Standard eyeglass + lens material.') },
        { material: __alloT('stem.wave.ri_flint', 'Flint glass'), n: '1.65', notes: __alloT('stem.wave.ri_flint_notes', 'Higher dispersion than crown — used in achromatic doublets.') },
        { material: __alloT('stem.wave.ri_sapphire', 'Sapphire'), n: '1.77', notes: __alloT('stem.wave.ri_sapphire_notes', 'Watch crystals, smartphone camera lenses.') },
        { material: __alloT('stem.wave.ri_cz', 'Cubic zirconia'), n: '2.16', notes: __alloT('stem.wave.ri_cz_notes', 'Higher than glass — used as diamond simulant.') },
        { material: __alloT('stem.wave.ri_diamond', 'Diamond'), n: '2.42', notes: __alloT('stem.wave.ri_diamond_notes', 'Very high. Critical angle just 24.4° → "fire" via total internal reflection.') },
        { material: __alloT('stem.wave.ri_silicon', 'Silicon (visible)'), n: '~3.5', notes: __alloT('stem.wave.ri_silicon_notes', 'Opaque to visible but transparent in IR. Used in IR optics.') },
        { material: __alloT('stem.wave.ri_meta', 'Negative-index metamaterials'), n: '< 0 (engineered)', notes: __alloT('stem.wave.ri_meta_notes', 'Engineered structures bend light backward. Cloaking research.') }
      ];

      var DIFFRACTION_FACTS = [
        { fact: __alloT('stem.wave.df_singleslit', 'Single-slit diffraction'), formula: 'a·sin θ = m·λ (dark fringes)', notes: __alloT('stem.wave.df_singleslit_notes', 'a = slit width. Central bright fringe is twice as wide as side fringes.') },
        { fact: __alloT('stem.wave.df_doubleslit', 'Double-slit interference'), formula: 'd·sin θ = m·λ (bright fringes)', notes: __alloT('stem.wave.df_doubleslit_notes', 'd = slit separation. Demonstrates wave nature of light (Young, 1801).') },
        { fact: __alloT('stem.wave.df_grating', 'Diffraction grating'), formula: 'd·sin θ = m·λ', notes: __alloT('stem.wave.df_grating_notes', 'Many slits, very sharp peaks. Resolution improves with more slits.') },
        { fact: __alloT('stem.wave.df_rayleigh', 'Rayleigh criterion'), formula: 'θ_min ≈ 1.22 λ / D', notes: __alloT('stem.wave.df_rayleigh_notes', 'Smallest angle resolvable by circular aperture of diameter D. Limits telescope/microscope resolution.') },
        { fact: __alloT('stem.wave.df_bragg', 'Bragg\'s law (X-ray crystallography)'), formula: '2d·sin θ = n·λ', notes: __alloT('stem.wave.df_bragg_notes', 'X-rays diffract from crystal planes. Used to determine atomic positions.') },
        { fact: __alloT('stem.wave.df_spotsize', 'Diffraction-limited spot size'), formula: '≈ λ/(2·NA)', notes: __alloT('stem.wave.df_spotsize_notes', 'NA = numerical aperture. Visible light limit ~200 nm — why electron microscopes have higher resolution.') }
      ];

      var POLARIZATION_NOTES = [
        { topic: __alloT('stem.wave.pol_whatis', 'What it is'), detail: __alloT('stem.wave.pol_whatis_detail', 'Direction of oscillation of the electric field in EM waves. Sound (longitudinal) cannot be polarized.') },
        { topic: __alloT('stem.wave.pol_linear', 'Linear polarization'), detail: __alloT('stem.wave.pol_linear_detail', 'E-field oscillates in single plane. Most "polarized" light is linear.') },
        { topic: __alloT('stem.wave.pol_circular', 'Circular polarization'), detail: __alloT('stem.wave.pol_circular_detail', 'E-field rotates in circle. Right vs left circular. Used in 3D movies.') },
        { topic: __alloT('stem.wave.pol_malus', 'Malus\'s law'), detail: __alloT('stem.wave.pol_malus_detail', 'I = I₀·cos²θ. Light through two polarizers: angle between them controls intensity.') },
        { topic: __alloT('stem.wave.pol_brewster', 'Brewster\'s angle'), detail: __alloT('stem.wave.pol_brewster_detail', 'tan θ_B = n₂/n₁. Reflected light is fully polarized at this angle of incidence.') },
        { topic: __alloT('stem.wave.pol_birefringence', 'Birefringence'), detail: __alloT('stem.wave.pol_birefringence_detail', 'Some crystals (calcite, quartz) split unpolarized light into two polarized rays.') },
        { topic: __alloT('stem.wave.pol_glare', 'Real-world: glare'), detail: __alloT('stem.wave.pol_glare_detail', 'Reflection off horizontal surfaces (water, road) polarizes horizontally. Polarized sunglasses block this.') },
        { topic: __alloT('stem.wave.pol_lcds', 'Real-world: LCDs'), detail: __alloT('stem.wave.pol_lcds_detail', 'Two crossed polarizers + liquid crystals → controllable transmission per pixel.') },
        { topic: __alloT('stem.wave.pol_stress', 'Real-world: stress analysis'), detail: __alloT('stem.wave.pol_stress_detail', 'Polarized light through plastic models shows stress patterns as color bands.') },
        { topic: __alloT('stem.wave.pol_3d', 'Real-world: 3D movies'), detail: __alloT('stem.wave.pol_3d_detail', 'Circular polarization (RealD) or linear at 45°/135° (older systems) separates left/right images.') }
      ];

      var QUANTUM_WAVES = [
        { topic: __alloT('stem.wave.qw_debroglie', 'de Broglie wavelength'), detail: __alloT('stem.wave.qw_debroglie_detail', 'λ = h/p. Every massive particle has a wave nature. For an electron at 100 eV, λ ≈ 0.12 nm.') },
        { topic: __alloT('stem.wave.qw_duality', 'Wave-particle duality'), detail: __alloT('stem.wave.qw_duality_detail', 'Photons + electrons show both wave + particle behavior. Single-photon double-slit experiments confirm interference even with one photon at a time.') },
        { topic: __alloT('stem.wave.qw_schrodinger', 'Schrödinger equation'), detail: __alloT('stem.wave.qw_schrodinger_detail', 'Wave equation for matter waves. Solutions ψ give probability amplitude. |ψ|² = probability density.') },
        { topic: __alloT('stem.wave.qw_heisenberg', 'Heisenberg uncertainty'), detail: __alloT('stem.wave.qw_heisenberg_detail', 'Δx · Δp ≥ ℏ/2. Position + momentum can\'t both be measured precisely. Fundamental, not measurement error.') },
        { topic: __alloT('stem.wave.qw_quantized', 'Quantized energy'), detail: __alloT('stem.wave.qw_quantized_detail', 'Bound systems (atoms, harmonic oscillators) only allow specific energy levels. Like standing waves on a string.') },
        { topic: __alloT('stem.wave.qw_tunneling', 'Tunneling'), detail: __alloT('stem.wave.qw_tunneling_detail', 'Wave nature lets particles "tunnel" through energy barriers classically forbidden. Basis of STM, alpha decay, flash memory.') },
        { topic: __alloT('stem.wave.qw_photon', 'Photon energy'), detail: __alloT('stem.wave.qw_photon_detail', 'E = hf = hc/λ. Higher frequency → higher-energy photon. UV photons can ionize; IR cannot.') },
        { topic: __alloT('stem.wave.qw_compton', 'Compton scattering'), detail: __alloT('stem.wave.qw_compton_detail', 'Photon-electron collision shifts photon wavelength. Confirms photons carry momentum p = h/λ.') },
        { topic: __alloT('stem.wave.qw_pauli', 'Pauli exclusion'), detail: __alloT('stem.wave.qw_pauli_detail', 'Identical fermions cannot occupy same quantum state. Why electrons fill shells; why matter has structure.') },
        { topic: __alloT('stem.wave.qw_coherence', 'Coherence length'), detail: __alloT('stem.wave.qw_coherence_detail', 'Distance over which wave maintains phase. Laser: kilometers. Sunlight: micrometers. Needed for interference.') }
      ];

      var SEISMIC_WAVES = [
        { name: __alloT('stem.wave.sw_p', 'P-wave (primary)'), type: __alloT('stem.wave.sw_p_type', 'Body wave / longitudinal'), speed: __alloT('stem.wave.sw_p_speed', '~5–8 km/s in crust'), notes: __alloT('stem.wave.sw_p_notes', 'Fastest. Compression/rarefaction along travel direction. Travels through solids AND liquids — passes through Earth\'s outer core.') },
        { name: __alloT('stem.wave.sw_s', 'S-wave (secondary/shear)'), type: __alloT('stem.wave.sw_s_type', 'Body wave / transverse'), speed: __alloT('stem.wave.sw_s_speed', '~3–4.5 km/s in crust'), notes: __alloT('stem.wave.sw_s_notes', 'Slower than P. Side-to-side shaking. Cannot travel through liquids → outer core blocks S-waves (key evidence it\'s liquid).') },
        { name: __alloT('stem.wave.sw_love', 'Love wave'), type: __alloT('stem.wave.sw_surface_type', 'Surface wave'), speed: __alloT('stem.wave.sw_love_speed', '~3–4.5 km/s'), notes: __alloT('stem.wave.sw_love_notes', 'Horizontal transverse motion at surface. More damaging to buildings than P/S.') },
        { name: __alloT('stem.wave.sw_rayleigh', 'Rayleigh wave'), type: __alloT('stem.wave.sw_surface_type', 'Surface wave'), speed: __alloT('stem.wave.sw_rayleigh_speed', '~2–4 km/s'), notes: __alloT('stem.wave.sw_rayleigh_notes', 'Rolling motion (like ocean waves). Largest amplitude. Felt as the rolling shake of an earthquake.') }
      ];

      var SEISMIC_FACTS = [
        { fact: __alloT('stem.wave.sf_richter', 'Richter magnitude'), detail: __alloT('stem.wave.sf_richter_detail', 'Logarithmic. Each +1 magnitude = ~10× amplitude, ~32× energy. M7 releases ~1000× energy of M5.') },
        { fact: __alloT('stem.wave.sf_moment', 'Moment magnitude (Mw)'), detail: __alloT('stem.wave.sf_moment_detail', 'Used for modern measurements, especially large quakes. Replaced Richter for M > ~6.5.') },
        { fact: __alloT('stem.wave.sf_mercalli', 'Mercalli intensity'), detail: __alloT('stem.wave.sf_mercalli_detail', 'Felt-effects scale (I-XII). What people experienced, not energy released. Same quake = different intensity at different distances.') },
        { fact: __alloT('stem.wave.sf_epicenter', 'Locating an epicenter'), detail: __alloT('stem.wave.sf_epicenter_detail', '3 stations measure P-S arrival-time difference → distance to each → triangulate epicenter.') },
        { fact: __alloT('stem.wave.sf_structure', 'Earth\'s structure (from seismology)'), detail: __alloT('stem.wave.sf_structure_detail', 'P/S wave behavior revealed liquid outer core, solid inner core, mantle, crust. Discontinuities mapped.') },
        { fact: __alloT('stem.wave.sf_tsunami', 'Tsunami warning'), detail: __alloT('stem.wave.sf_tsunami_detail', 'Underwater quake → ocean displacement → long-wavelength wave traveling ~700 km/h in deep water. P-wave arrival gives ~minutes warning before tsunami.') },
        { fact: __alloT('stem.wave.sf_largest', 'Largest recorded'), detail: __alloT('stem.wave.sf_largest_detail', 'Chile 1960: M9.5 (~32× energy of biggest US quake — 1964 Alaska M9.2). Tsunami crossed Pacific.') }
      ];

      var OCEAN_WAVES = [
        { type: __alloT('stem.wave.ow_wind', 'Wind wave (sea)'), period: '< 10 s', wavelength: '~10–100 m', notes: __alloT('stem.wave.ow_wind_notes', 'Local wind generated. Variable height + direction.') },
        { type: __alloT('stem.wave.ow_swell', 'Swell'), period: '10–30 s', wavelength: '~100–800 m', notes: __alloT('stem.wave.ow_swell_notes', 'Wind waves that have traveled far. Sorted into regular sets.') },
        { type: __alloT('stem.wave.ow_tsunami', 'Tsunami'), period: '~10 min – 2 hr', wavelength: '~100–500 km', notes: __alloT('stem.wave.ow_tsunami_notes', 'Tiny height in deep ocean (<1 m) but VERY long wavelength. Pile up at shore.') },
        { type: __alloT('stem.wave.ow_tide', 'Tide'), period: '~12 h or 24 h', wavelength: 'half Earth\'s circumference', notes: __alloT('stem.wave.ow_tide_notes', 'Gravitational pull of Moon + Sun. Bulges in ocean rotate as Earth turns.') },
        { type: __alloT('stem.wave.ow_seiche', 'Seiche'), period: 'min to hours', wavelength: 'enclosed basin', notes: __alloT('stem.wave.ow_seiche_notes', 'Standing wave in enclosed/semi-enclosed water (lakes, harbors). Triggered by wind, pressure, quakes.') },
        { type: __alloT('stem.wave.ow_rogue', 'Rogue wave'), period: 'irregular', wavelength: 'irregular', notes: __alloT('stem.wave.ow_rogue_notes', 'Unusually large (>2× average). Once thought myth, now confirmed; constructive interference of swells.') }
      ];

      var OCEAN_FACTS = [
        { fact: __alloT('stem.wave.of_deep', 'Deep water'), detail: __alloT('stem.wave.of_deep_detail', 'Depth > λ/2. Wave speed depends only on λ: v = √(gλ/2π).') },
        { fact: __alloT('stem.wave.of_shallow', 'Shallow water'), detail: __alloT('stem.wave.of_shallow_detail', 'Depth < λ/20. Wave speed depends only on depth: v = √(gd). Tsunamis are always shallow-water waves (huge λ).') },
        { fact: __alloT('stem.wave.of_breaking', 'Wave breaking'), detail: __alloT('stem.wave.of_breaking_detail', 'Waves break when amplitude/wavelength > ~1/7. Crest moves faster than trough → tips over.') },
        { fact: __alloT('stem.wave.of_sigheight', 'Significant wave height'), detail: __alloT('stem.wave.of_sigheight_detail', 'Average height of tallest 1/3 of waves — better matches what a sailor would call "the wave height".') },
        { fact: __alloT('stem.wave.of_tides', 'Spring vs neap tides'), detail: __alloT('stem.wave.of_tides_detail', 'Spring (extreme): Sun + Moon aligned (new/full moon). Neap (mild): Sun + Moon at 90° (quarter moons).') }
      ];

      var ANTENNA_TYPES = [
        { type: __alloT('stem.wave.ant_dipole', 'Dipole'), size: '~λ/2', use: __alloT('stem.wave.ant_dipole_use', 'Simplest resonant antenna. FM radio dipole is ~1.5 m.') },
        { type: __alloT('stem.wave.ant_yagi', 'Yagi-Uda'), size: __alloT('stem.wave.ant_yagi_size', 'multi-element'), use: __alloT('stem.wave.ant_yagi_use', 'Directional. Old rooftop TV antennas, ham radio.') },
        { type: __alloT('stem.wave.ant_dish', 'Parabolic dish'), size: __alloT('stem.wave.ant_dish_size', '> 10λ for efficient gain'), use: __alloT('stem.wave.ant_dish_use', 'Satellite TV, radio astronomy, deep-space comm.') },
        { type: __alloT('stem.wave.ant_patch', 'Patch (microstrip)'), size: '~λ/2', use: __alloT('stem.wave.ant_patch_use', 'GPS, Wi-Fi, phones. Flat, easy to mass-manufacture.') },
        { type: __alloT('stem.wave.ant_helical', 'Helical'), size: __alloT('stem.wave.ant_helical_size', '~λ circumference per turn'), use: __alloT('stem.wave.ant_helical_use', 'Circularly polarized. Satellite uplinks.') },
        { type: __alloT('stem.wave.ant_loop', 'Loop'), size: __alloT('stem.wave.ant_loop_size', 'fraction of λ'), use: __alloT('stem.wave.ant_loop_use', 'AM radio receivers, RFID tags.') },
        { type: __alloT('stem.wave.ant_horn', 'Horn'), size: '~few λ', use: __alloT('stem.wave.ant_horn_use', 'Radar feeds, microwave links. Broadband.') },
        { type: __alloT('stem.wave.ant_phased', 'Phased array'), size: __alloT('stem.wave.ant_phased_size', 'matrix of elements'), use: __alloT('stem.wave.ant_phased_use', 'Steer beam electronically. Modern radar, 5G mmWave, Starlink user terminals.') }
      ];

      var RADAR_SONAR = [
        { system: __alloT('stem.wave.rs_primary', 'Primary radar'), use: __alloT('stem.wave.rs_primary_use', 'Aircraft detection. Pulse sent → echo measured. Range = c·Δt/2.') },
        { system: __alloT('stem.wave.rs_doppler', 'Doppler radar'), use: __alloT('stem.wave.rs_doppler_use', 'Weather (rain motion → wind), police speed guns. Frequency shift → velocity.') },
        { system: __alloT('stem.wave.rs_sar', 'Synthetic aperture radar (SAR)'), use: __alloT('stem.wave.rs_sar_use', 'Moving platform creates effective large aperture. Earth imaging from satellites; works through clouds + at night.') },
        { system: __alloT('stem.wave.rs_phased', 'Phased array radar'), use: __alloT('stem.wave.rs_phased_use', 'Steerable beam without moving the dish. AEGIS, modern fighters.') },
        { system: __alloT('stem.wave.rs_active', 'Active sonar'), use: __alloT('stem.wave.rs_active_use', 'Send pulse, listen for echo. Submarine detection, fish-finding. Limited range due to sound absorption.') },
        { system: __alloT('stem.wave.rs_passive', 'Passive sonar'), use: __alloT('stem.wave.rs_passive_use', 'Listen for sounds from targets. Submarines use this when avoiding detection (no emissions).') },
        { system: __alloT('stem.wave.rs_echo', 'Echolocation (biological)'), use: __alloT('stem.wave.rs_echo_use', 'Bats, dolphins. Frequencies up to ~200 kHz (bats); chirps adapted for prey.') },
        { system: __alloT('stem.wave.rs_ultrasound', 'Ultrasound (medical)'), use: __alloT('stem.wave.rs_ultrasound_use', '1–20 MHz pulses image internal tissues. Doppler mode shows blood flow.') },
        { system: __alloT('stem.wave.rs_lidar', 'LIDAR'), use: __alloT('stem.wave.rs_lidar_use', 'Laser pulses → 3D point clouds. Self-driving cars, archaeology (forest-floor mapping).') }
      ];

      var SHOCKWAVE_FACTS = [
        { fact: __alloT('stem.wave.shk_mach', 'Mach number'), detail: __alloT('stem.wave.shk_mach_detail', 'M = v/v_sound. M<1 subsonic, M=1 transonic, M>1 supersonic, M>5 hypersonic.') },
        { fact: __alloT('stem.wave.shk_boom', 'Sonic boom'), detail: __alloT('stem.wave.shk_boom_detail', 'Cone of compressed air trailing supersonic objects. Heard as boom when cone passes you.') },
        { fact: __alloT('stem.wave.shk_cone', 'Mach cone angle'), detail: __alloT('stem.wave.shk_cone_detail', 'sin α = 1/M. Faster object → narrower cone.') },
        { fact: __alloT('stem.wave.shk_thickness', 'Shock wave thickness'), detail: __alloT('stem.wave.shk_thickness_detail', 'Just a few mean free paths (~micrometers in atmosphere). Steep pressure jump.') },
        { fact: __alloT('stem.wave.shk_speed', 'Sound of speed (air, 20°C)'), detail: __alloT('stem.wave.shk_speed_detail', '343 m/s = 1235 km/h = 767 mph. Increases with temperature: v ≈ 331 + 0.6·T(°C) m/s.') },
        { fact: __alloT('stem.wave.shk_media', 'Other media'), detail: __alloT('stem.wave.shk_media_detail', 'Water: ~1480 m/s. Steel: ~5000 m/s. Hotter, denser, stiffer → faster sound.') },
        { fact: __alloT('stem.wave.shk_whip', 'Bullwhip crack'), detail: __alloT('stem.wave.shk_whip_detail', 'Tip of whip exceeds Mach 1 → mini sonic boom.') },
        { fact: __alloT('stem.wave.shk_explosion', 'Explosion shock wave'), detail: __alloT('stem.wave.shk_explosion_detail', 'Initial pressure jump (overpressure) travels faster than sound, slowing to sound speed with distance.') }
      ];

      var WAVE_HISTORY = [
        { year: '1665', who: 'Robert Hooke', what: __alloT('stem.wave.hist_1665', 'First observed diffraction.') },
        { year: '1690', who: 'Christiaan Huygens', what: __alloT('stem.wave.hist_1690', 'Wave theory of light. Huygens\' principle (every point on wavefront is source of secondary wavelets).') },
        { year: '1801', who: 'Thomas Young', what: __alloT('stem.wave.hist_1801', 'Double-slit experiment. Established wave nature of light through interference.') },
        { year: '1818', who: 'Augustin Fresnel', what: __alloT('stem.wave.hist_1818', 'Mathematical theory of diffraction. Predicted (correctly) the "Poisson spot" — bright dot in center of circular shadow.') },
        { year: '1842', who: 'Christian Doppler', what: __alloT('stem.wave.hist_1842', 'Doppler effect for sound and light.') },
        { year: '1864', who: 'James Clerk Maxwell', what: __alloT('stem.wave.hist_1864', 'Maxwell\'s equations — light is electromagnetic wave. Predicted speed = c.') },
        { year: '1887', who: 'Heinrich Hertz', what: __alloT('stem.wave.hist_1887', 'Produced + detected radio waves in lab. Confirmed Maxwell\'s prediction.') },
        { year: '1900', who: 'Max Planck', what: __alloT('stem.wave.hist_1900', 'E = hf — energy is quantized. Birth of quantum theory.') },
        { year: '1905', who: 'Albert Einstein', what: __alloT('stem.wave.hist_1905', 'Photoelectric effect — light comes in quanta (photons). Nobel 1921.') },
        { year: '1924', who: 'Louis de Broglie', what: __alloT('stem.wave.hist_1924', 'Matter waves: λ = h/p. Even electrons are waves.') },
        { year: '1927', who: 'Davisson + Germer', what: __alloT('stem.wave.hist_1927', 'Confirmed electron diffraction — proved matter waves.') },
        { year: '1960', who: 'Theodore Maiman', what: __alloT('stem.wave.hist_1960', 'First working laser (ruby).') },
        { year: '2015', who: 'LIGO collaboration', what: __alloT('stem.wave.hist_2015', 'First direct detection of gravitational waves (binary black hole merger).') }
      ];

      function renderOpticsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔍 ' + __alloT('stem.wave.sec_optics_title', 'Optics — lenses, mirrors, and elements')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↻ ' + __alloT('stem.wave.sec_refraction_title', 'Refractive indices')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_refraction_intro', 'Snell\'s law: n₁ sin θ₁ = n₂ sin θ₂. Light slows by factor n in material; n is wavelength-dependent (dispersion).')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_material', 'Material'), 'n', __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿ ' + __alloT('stem.wave.tab_diffraction', 'Diffraction')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_diffraction_intro', 'Diffraction = bending of waves around obstacles or through openings. Most noticeable when feature size ≈ wavelength.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↕ ' + __alloT('stem.wave.tab_polarization', 'Polarization')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛ ' + __alloT('stem.wave.tab_quantum', 'Quantum waves')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_quantum_intro', 'In quantum mechanics, every particle has wave properties. The "wave function" ψ gives probability amplitude.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌋 ' + __alloT('stem.wave.tab_seismicwaves', 'Seismic waves')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.tab_types', 'Wave types')),
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_seismology_essentials', 'Seismology essentials')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏄 ' + __alloT('stem.wave.tab_oceanwaves', 'Ocean waves')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_ocean_wave_types', 'Ocean wave types')),
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_wave_physics_water', 'Wave physics in water')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📶 ' + __alloT('stem.wave.sec_antennas_title', 'Antenna types')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_antennas_intro', 'Antenna size typically tied to wavelength. Lower frequency = longer wavelength = bigger antenna.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 ' + __alloT('stem.wave.sec_radar_title', 'Radar, sonar, and active ranging')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✈ ' + __alloT('stem.wave.tab_shockwaves', 'Shock waves')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 ' + __alloT('stem.wave.sec_history_title', 'History of wave science')),
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
        { format: 'WAV (PCM)', extension: '.wav', compression: __alloT('stem.wave.af_comp_none', 'None (lossless)'), notes: __alloT('stem.wave.af_wav_notes', 'Raw uncompressed audio. ~10 MB/min at CD quality. Standard for editing.') },
        { format: 'FLAC', extension: '.flac', compression: __alloT('stem.wave.af_comp_lossless', 'Lossless'), notes: __alloT('stem.wave.af_flac_notes', 'Free Lossless Audio Codec. ~5 MB/min CD quality. Bit-perfect — when decoded, identical to original.') },
        { format: 'ALAC', extension: '.m4a, .alac', compression: __alloT('stem.wave.af_comp_lossless', 'Lossless'), notes: __alloT('stem.wave.af_alac_notes', 'Apple Lossless Audio Codec. Similar to FLAC but Apple-developed.') },
        { format: 'MP3', extension: '.mp3', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_mp3_notes', 'Most common lossy format. 128 kbps = compact but audible artifacts. 320 kbps near-transparent.') },
        { format: 'AAC', extension: '.aac, .m4a', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_aac_notes', 'Better quality than MP3 at same bitrate. iTunes, YouTube use it.') },
        { format: 'OGG Vorbis', extension: '.ogg', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_ogg_notes', 'Open-source alternative to MP3. Often used in games (Minecraft, Spotify).') },
        { format: 'Opus', extension: '.opus', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_opus_notes', 'Modern open codec. Excellent at low bitrates (6-510 kbps). Used in WebRTC, Discord, YouTube.') },
        { format: 'WMA', extension: '.wma', compression: __alloT('stem.wave.af_comp_lossy_or_lossless', 'Lossy or lossless'), notes: __alloT('stem.wave.af_wma_notes', 'Microsoft\'s codec. Largely abandoned.') },
        { format: 'AIFF', extension: '.aiff', compression: __alloT('stem.wave.af_comp_none', 'None (lossless)'), notes: __alloT('stem.wave.af_aiff_notes', 'Apple\'s uncompressed format. Similar to WAV.') },
        { format: 'MIDI', extension: '.mid', compression: __alloT('stem.wave.af_comp_midi', 'Not audio — instructions'), notes: __alloT('stem.wave.af_midi_notes', 'Stores notes + timing, not sound. Player synthesizes. Tiny files.') },
        { format: 'DSD', extension: '.dsf, .dff', compression: __alloT('stem.wave.af_comp_dsd', 'PDM (different from PCM)'), notes: __alloT('stem.wave.af_dsd_notes', 'Used for Super Audio CD. 1-bit, very high sample rate (2.8+ MHz).') }
      ];

      var AUDIO_BITRATES = [
        { quality: __alloT('stem.wave.ab_phone', 'Phone call (G.711)'), bitrate: '64 kbps', notes: __alloT('stem.wave.ab_phone_notes', '8 kHz sample, narrow band.') },
        { quality: __alloT('stem.wave.ab_opus', 'Opus low quality'), bitrate: '24 kbps', notes: __alloT('stem.wave.ab_opus_notes', 'Voice still intelligible.') },
        { quality: __alloT('stem.wave.ab_am', 'AM radio quality'), bitrate: '~30 kbps equiv', notes: __alloT('stem.wave.ab_am_notes', '5 kHz bandwidth approximately.') },
        { quality: __alloT('stem.wave.ab_fm', 'FM radio quality'), bitrate: '~96 kbps equiv', notes: __alloT('stem.wave.ab_fm_notes', '15 kHz bandwidth approximately.') },
        { quality: __alloT('stem.wave.ab_mp3', 'MP3 (web typical)'), bitrate: '128 kbps', notes: __alloT('stem.wave.ab_mp3_notes', 'Acceptable for casual listening. Audible artifacts.') },
        { quality: __alloT('stem.wave.ab_aac', 'AAC (Apple Music)'), bitrate: '256 kbps', notes: __alloT('stem.wave.ab_aac_notes', 'Apple Music standard. Better than 128 kbps MP3.') },
        { quality: __alloT('stem.wave.ab_spotify', 'Spotify (high)'), bitrate: '320 kbps Ogg', notes: __alloT('stem.wave.ab_spotify_notes', 'High-quality lossy. Near-transparent for most.') },
        { quality: __alloT('stem.wave.ab_cd', 'CD quality (16-bit/44.1 kHz PCM)'), bitrate: '1411 kbps', notes: __alloT('stem.wave.ab_cd_notes', 'Lossless. ~10 MB/min stereo.') },
        { quality: __alloT('stem.wave.ab_dvd', 'DVD-Audio (24-bit/96 kHz)'), bitrate: '~4600 kbps', notes: __alloT('stem.wave.ab_dvd_notes', 'High-resolution audio. Debated whether audible improvement.') },
        { quality: __alloT('stem.wave.ab_studio', 'Studio masters (24-bit/192 kHz)'), bitrate: '~9200 kbps', notes: __alloT('stem.wave.ab_studio_notes', 'Recording standard. Down-converted for distribution.') }
      ];

      function renderRecordingsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎧 ' + __alloT('stem.wave.sec_recordings_title', 'Audio formats + quality')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_formats', 'Common audio file formats')),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    [__alloT('stem.wave.col_format', 'Format'), __alloT('stem.wave.col_extension', 'Extension'), __alloT('stem.wave.col_compression', 'Compression'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_bitrates', 'Common bitrates')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_quality_level', 'Quality level'), __alloT('stem.wave.col_bitrate', 'Bitrate'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
        { illusion: __alloT('stem.wave.oi1_name', 'Müller-Lyer'), description: __alloT('stem.wave.oi1_desc', 'Two equal lines with arrowheads — one outward, one inward — appear different lengths.'), explanation: __alloT('stem.wave.oi1_expl', 'Brain interprets arrows as depth cues. May be culturally-influenced (less effect in some non-Western cultures).') },
        { illusion: __alloT('stem.wave.oi2_name', 'Necker cube'), description: __alloT('stem.wave.oi2_desc', 'Wireframe cube spontaneously "flips" which face is in front.'), explanation: __alloT('stem.wave.oi2_expl', 'Ambiguous projection — brain alternates interpretations. Bistable perception.') },
        { illusion: __alloT('stem.wave.oi3_name', 'Hermann grid'), description: __alloT('stem.wave.oi3_desc', 'Black squares on white grid show ghostly gray dots at intersections.'), explanation: __alloT('stem.wave.oi3_expl', 'Lateral inhibition in retinal cells. Each cell\'s response depends on neighbors.') },
        { illusion: __alloT('stem.wave.oi4_name', 'Checker shadow'), description: __alloT('stem.wave.oi4_desc', 'Two checkerboard squares appear different shades but are identical.'), explanation: __alloT('stem.wave.oi4_expl', 'Adelson\'s classic. Brain corrects for perceived shadow → "constancy" overrides actual luminance.') },
        { illusion: __alloT('stem.wave.oi5_name', 'Ponzo illusion'), description: __alloT('stem.wave.oi5_desc', 'Two identical lines, one near converging rails, appear different lengths.'), explanation: __alloT('stem.wave.oi5_expl', 'Brain treats converging lines as depth — "farther" object must be bigger to project same size on retina.') },
        { illusion: __alloT('stem.wave.oi6_name', 'Café wall'), description: __alloT('stem.wave.oi6_desc', 'Parallel rows of alternating black/white tiles appear sloped.'), explanation: __alloT('stem.wave.oi6_expl', 'Offset between rows creates perceived tilt. Studied at café walls in Bristol.') },
        { illusion: __alloT('stem.wave.oi7_name', 'Rotating snakes (Kitaoka)'), description: __alloT('stem.wave.oi7_desc', 'Static image of circles appears to rotate.'), explanation: __alloT('stem.wave.oi7_expl', 'Motion-sensitive cells respond differently to varying luminance, creating illusory motion in peripheral vision.') },
        { illusion: __alloT('stem.wave.oi8_name', 'Spinning dancer (silhouette)'), description: __alloT('stem.wave.oi8_desc', 'Dancer appears to spin clockwise or counterclockwise.'), explanation: __alloT('stem.wave.oi8_expl', 'Ambiguous silhouette has no depth cues. Brain locks in an interpretation — can sometimes be switched.') },
        { illusion: __alloT('stem.wave.oi9_name', 'The dress (2015 viral)'), description: __alloT('stem.wave.oi9_desc', 'Photo of dress appeared blue/black to some, white/gold to others.'), explanation: __alloT('stem.wave.oi9_expl', 'Different brains assume different illumination (daylight vs incandescent) → "color constancy" leads to different perceptions.') },
        { illusion: __alloT('stem.wave.oi10_name', 'Mach bands'), description: __alloT('stem.wave.oi10_desc', 'Sharp luminance edges appear to have over/undershoot bands.'), explanation: __alloT('stem.wave.oi10_expl', 'Lateral inhibition in retina enhances edges. Helps with object recognition but creates artifact at edges.') },
        { illusion: __alloT('stem.wave.oi11_name', 'Stroboscopic effect'), description: __alloT('stem.wave.oi11_desc', 'Wheels appear to spin backward in movies.'), explanation: __alloT('stem.wave.oi11_expl', 'Frame rate samples motion — when wheel completes nearly full rotation per frame, looks like slight reverse motion.') },
        { illusion: __alloT('stem.wave.oi12_name', 'Phantom limb'), description: __alloT('stem.wave.oi12_desc', 'Amputees feel sensations from missing limb.'), explanation: __alloT('stem.wave.oi12_expl', 'Brain map of body remains. Mirror therapy (Ramachandran) sometimes helps.') },
        { illusion: __alloT('stem.wave.oi13_name', 'Persistence of vision'), description: __alloT('stem.wave.oi13_desc', 'Why movies (24+ fps) appear as continuous motion.'), explanation: __alloT('stem.wave.oi13_expl', 'Retinal afterimage + brain interpolation. Below ~16 fps flicker is visible.') },
        { illusion: __alloT('stem.wave.oi14_name', 'Color afterimage'), description: __alloT('stem.wave.oi14_desc', 'Stare at red for 30s → look at white → see green afterimage.'), explanation: __alloT('stem.wave.oi14_expl', 'Cone receptors fatigue; complementary color signal dominates briefly when you look away.') },
        { illusion: __alloT('stem.wave.oi15_name', 'Blind spot'), description: __alloT('stem.wave.oi15_desc', 'Each eye has a small region where you don\'t see.'), explanation: __alloT('stem.wave.oi15_expl', 'Where optic nerve leaves retina — no photoreceptors. Brain fills in. Both eyes together compensate.') },
        { illusion: __alloT('stem.wave.oi16_name', 'Anaglyph (red/cyan 3D)'), description: __alloT('stem.wave.oi16_desc', 'Glasses with red + cyan lenses create 3D from flat image.'), explanation: __alloT('stem.wave.oi16_expl', 'Each eye sees different-colored image → brain fuses into 3D.') },
        { illusion: __alloT('stem.wave.oi17_name', 'Magic Eye / autostereogram'), description: __alloT('stem.wave.oi17_desc', 'Cross-eye to see hidden 3D image.'), explanation: __alloT('stem.wave.oi17_expl', 'Repeating pattern, each row offset slightly. Brain matches wrong elements → perceived depth.') },
        { illusion: __alloT('stem.wave.oi18_name', 'Doppler shift in sound'), description: __alloT('stem.wave.oi18_desc', 'Siren of approaching vehicle sounds higher than receding.'), explanation: __alloT('stem.wave.oi18_expl', 'Compressed waves coming, stretched waves going. f\' = f × (v_sound ± v_observer) / (v_sound ∓ v_source).') },
        { illusion: __alloT('stem.wave.oi19_name', 'Sonic boom'), description: __alloT('stem.wave.oi19_desc', 'Loud bang when supersonic object passes.'), explanation: __alloT('stem.wave.oi19_expl', 'Pressure cone of compressed air. Boom not heard until cone reaches you.') },
        { illusion: __alloT('stem.wave.oi20_name', 'Mirage (highway shimmer)'), description: __alloT('stem.wave.oi20_desc', 'Distant road appears wet on hot day.'), explanation: __alloT('stem.wave.oi20_expl', 'Hot air near road has lower n than cooler air above → refracts sky light to your eye. Same physics for desert mirages.') },
        { illusion: __alloT('stem.wave.oi21_name', 'Rainbow'), description: __alloT('stem.wave.oi21_desc', '42° arc from anti-solar point.'), explanation: __alloT('stem.wave.oi21_expl', 'Sunlight refracts entering water droplet, reflects off back, refracts again leaving. Different λ at different angles.') },
        { illusion: __alloT('stem.wave.oi22_name', 'Double rainbow'), description: __alloT('stem.wave.oi22_desc', 'Second, dimmer rainbow with reversed colors at ~51°.'), explanation: __alloT('stem.wave.oi22_expl', 'Two internal reflections in droplets. Less light → dimmer. Reverse order.') },
        { illusion: __alloT('stem.wave.oi23_name', 'Halo around moon/sun'), description: __alloT('stem.wave.oi23_desc', '22° halo around sun or moon.'), explanation: __alloT('stem.wave.oi23_expl', 'Ice crystals in high cirrus refract light. Often precedes weather change.') },
        { illusion: __alloT('stem.wave.oi24_name', 'Green flash at sunset'), description: __alloT('stem.wave.oi24_desc', 'Brief green flash as sun dips below horizon.'), explanation: __alloT('stem.wave.oi24_expl', 'Atmospheric refraction separates colors at moment of sunset. Best seen over ocean.') }
      ];

      function renderOpticalFactsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👁 ' + __alloT('stem.wave.sec_optical_facts_title', 'Optical illusions + perception phenomena')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_optical_facts_intro', 'Visual perception is active — brain interprets, fills in gaps, makes guesses. Illusions reveal the underlying processes.')),
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
        { thing: __alloT('stem.wave.ds_light_vacuum', 'Speed of light (vacuum)'), speed: '299,792,458 m/s', notes: __alloT('stem.wave.ds_light_vacuum_notes', 'Universal speed limit. Defined exact.') },
        { thing: __alloT('stem.wave.ds_light_air', 'Speed of light (air)'), speed: '~299,700,000 m/s', notes: __alloT('stem.wave.ds_light_air_notes', 'Air refractive index ~1.0003.') },
        { thing: __alloT('stem.wave.ds_light_water', 'Speed of light (water)'), speed: '~225,000,000 m/s', notes: 'n = 1.33.' },
        { thing: __alloT('stem.wave.ds_light_glass', 'Speed of light (glass)'), speed: '~200,000,000 m/s', notes: 'n ~ 1.5.' },
        { thing: __alloT('stem.wave.ds_light_diamond', 'Speed of light (diamond)'), speed: '~124,000,000 m/s', notes: __alloT('stem.wave.ds_light_diamond_notes', 'n = 2.42 — highest of common materials.') },
        { thing: __alloT('stem.wave.ds_cherenkov', 'Cherenkov radiation threshold (water)'), speed: '~225,000 km/s', notes: __alloT('stem.wave.ds_cherenkov_notes', 'Particles faster than light-in-medium emit blue glow (Cherenkov).') },
        { thing: __alloT('stem.wave.ds_sound_air0', 'Sound in air at 0°C'), speed: '331 m/s', notes: __alloT('stem.wave.ds_sound_air0_notes', 'Cold air, dry, sea level.') },
        { thing: __alloT('stem.wave.ds_sound_air20', 'Sound in air at 20°C'), speed: '343 m/s', notes: __alloT('stem.wave.ds_sound_air20_notes', 'Reference room temp.') },
        { thing: __alloT('stem.wave.ds_sound_air40', 'Sound in air at 40°C'), speed: '355 m/s', notes: __alloT('stem.wave.ds_sound_air40_notes', 'Hot day.') },
        { thing: __alloT('stem.wave.ds_sound_helium', 'Sound in helium (RT)'), speed: '~1007 m/s', notes: __alloT('stem.wave.ds_sound_helium_notes', '~3× air → voice an octave higher.') },
        { thing: __alloT('stem.wave.ds_sound_co2', 'Sound in CO₂ (RT)'), speed: '~267 m/s', notes: __alloT('stem.wave.ds_sound_co2_notes', 'Slower than air → voice lower.') },
        { thing: __alloT('stem.wave.ds_sound_water', 'Sound in water (RT)'), speed: '~1482 m/s', notes: __alloT('stem.wave.ds_sound_water_notes', 'Whales use long-distance communication.') },
        { thing: __alloT('stem.wave.ds_sound_seawater', 'Sound in seawater'), speed: '~1500 m/s', notes: __alloT('stem.wave.ds_sound_seawater_notes', 'Slightly different due to salts.') },
        { thing: __alloT('stem.wave.ds_sound_ice', 'Sound in ice'), speed: '~3840 m/s', notes: __alloT('stem.wave.ds_sound_ice_notes', 'Stiff solid.') },
        { thing: __alloT('stem.wave.ds_sound_granite', 'Sound in granite'), speed: '~6000 m/s', notes: __alloT('stem.wave.ds_sound_granite_notes', 'Hard rock.') },
        { thing: __alloT('stem.wave.ds_sound_steel', 'Sound in steel'), speed: '~5960 m/s', notes: __alloT('stem.wave.ds_sound_steel_notes', 'Train tracks carry sound far before train arrives.') },
        { thing: __alloT('stem.wave.ds_sound_aluminum', 'Sound in aluminum'), speed: '~6420 m/s', notes: __alloT('stem.wave.ds_sound_aluminum_notes', 'Light + stiff.') },
        { thing: __alloT('stem.wave.ds_sound_diamond', 'Sound in diamond'), speed: '~12,000 m/s', notes: __alloT('stem.wave.ds_sound_diamond_notes', 'Fastest in common materials.') },
        { thing: __alloT('stem.wave.ds_sound_beryllium', 'Sound in beryllium'), speed: '~12,900 m/s', notes: __alloT('stem.wave.ds_sound_beryllium_notes', 'Fastest in pure elements at standard conditions.') },
        { thing: __alloT('stem.wave.ds_pwave', 'P-wave in upper mantle'), speed: '~8 km/s', notes: __alloT('stem.wave.ds_pwave_notes', 'Earthquake primary waves.') },
        { thing: __alloT('stem.wave.ds_swave', 'S-wave in upper mantle'), speed: '~4.5 km/s', notes: __alloT('stem.wave.ds_swave_notes', 'Earthquake secondary waves.') },
        { thing: __alloT('stem.wave.ds_tsunami_deep', 'Tsunami in deep ocean'), speed: '~700 km/h', notes: __alloT('stem.wave.ds_tsunami_deep_notes', 'Long wavelength shallow-water wave.') },
        { thing: __alloT('stem.wave.ds_tsunami_shore', 'Tsunami in shore approach'), speed: '~50 km/h', notes: __alloT('stem.wave.ds_tsunami_shore_notes', 'Slows + grows as depth decreases.') },
        { thing: __alloT('stem.wave.ds_ripple', 'Surface ripple on water'), speed: __alloT('stem.wave.ds_ripple_speed', 'depends on λ'), notes: __alloT('stem.wave.ds_ripple_notes', 'Short wavelengths controlled by surface tension; long by gravity.') },
        { thing: __alloT('stem.wave.ds_body', 'Sound in human body (avg tissue)'), speed: '~1540 m/s', notes: __alloT('stem.wave.ds_body_notes', 'Used for medical ultrasound timing.') },
        { thing: __alloT('stem.wave.ds_bone', 'Sound in bone'), speed: '~3000-4000 m/s', notes: __alloT('stem.wave.ds_bone_notes', 'Faster than soft tissue.') },
        { thing: __alloT('stem.wave.ds_lung', 'Sound in lung tissue'), speed: '~650 m/s', notes: __alloT('stem.wave.ds_lung_notes', 'Air pockets slow it. Why lungs poorly imaged by ultrasound.') },
        { thing: __alloT('stem.wave.ds_thunder', 'Lightning thunder rule of thumb'), speed: __alloT('stem.wave.ds_thunder_speed', '5 sec per mile / 3 sec per km'), notes: __alloT('stem.wave.ds_thunder_notes', 'Count seconds between flash + thunder.') }
      ];

      var CAMERA_LENSES = [
        { lens: __alloT('stem.wave.cl_8mm', '8mm fisheye'), fov: '~180° diagonal', use: __alloT('stem.wave.cl_8mm_use', 'Hemispheric panoramas, sky time-lapse, security cameras.') },
        { lens: __alloT('stem.wave.cl_14mm', '14mm ultrawide'), fov: '~114° diagonal', use: __alloT('stem.wave.cl_14mm_use', 'Tight indoor architecture, dramatic landscape.') },
        { lens: __alloT('stem.wave.cl_20mm', '20mm ultrawide'), fov: '~94°', use: __alloT('stem.wave.cl_20mm_use', 'Astrophotography, group photos in tight space.') },
        { lens: __alloT('stem.wave.cl_24mm', '24mm wide-angle'), fov: '~84°', use: __alloT('stem.wave.cl_24mm_use', 'Landscape, real estate, environmental portraits.') },
        { lens: __alloT('stem.wave.cl_28mm', '28mm wide'), fov: '~75°', use: __alloT('stem.wave.cl_28mm_use', 'Street photography, photojournalism.') },
        { lens: __alloT('stem.wave.cl_35mm', '35mm wide'), fov: '~63°', use: __alloT('stem.wave.cl_35mm_use', 'Documentary, candid. "Storyteller\'s lens".') },
        { lens: __alloT('stem.wave.cl_50mm', '50mm normal'), fov: '~47°', use: __alloT('stem.wave.cl_50mm_use', 'Closest to human eye perspective. "Nifty fifty". Portraits.') },
        { lens: __alloT('stem.wave.cl_85mm', '85mm short telephoto'), fov: '~28°', use: __alloT('stem.wave.cl_85mm_use', 'Portraits. Pleasing background compression.') },
        { lens: __alloT('stem.wave.cl_105mm', '105mm portrait'), fov: '~23°', use: __alloT('stem.wave.cl_105mm_use', 'Tight portraits. Macro variants for close-up.') },
        { lens: __alloT('stem.wave.cl_135mm', '135mm'), fov: '~18°', use: __alloT('stem.wave.cl_135mm_use', 'Outdoor portraits, candids from distance.') },
        { lens: __alloT('stem.wave.cl_200mm', '200mm telephoto'), fov: '~12°', use: __alloT('stem.wave.cl_200mm_use', 'Sports, wildlife, distant subjects.') },
        { lens: __alloT('stem.wave.cl_300mm', '300mm telephoto'), fov: '~8°', use: __alloT('stem.wave.cl_300mm_use', 'Sports field-side, bird photography.') },
        { lens: __alloT('stem.wave.cl_400mm', '400mm super-tele'), fov: '~6°', use: __alloT('stem.wave.cl_400mm_use', 'Wildlife, sports. Heavy + expensive.') },
        { lens: __alloT('stem.wave.cl_600mm', '600mm super-tele'), fov: '~4°', use: __alloT('stem.wave.cl_600mm_use', 'Distant wildlife, moon. Requires tripod.') },
        { lens: __alloT('stem.wave.cl_800mm', '800mm super-tele'), fov: '~3°', use: __alloT('stem.wave.cl_800mm_use', 'Specialized wildlife + astronomy.') },
        { lens: __alloT('stem.wave.cl_1200mm', '1200mm + teleconverter'), fov: '~2°', use: __alloT('stem.wave.cl_1200mm_use', 'Extreme reach. Solar eclipse details.') },
        { lens: __alloT('stem.wave.cl_macro', 'Macro 100mm'), fov: '~24° at infinity / close at 1:1', use: __alloT('stem.wave.cl_macro_use', 'Insects, flowers, product. 1:1 magnification.') },
        { lens: __alloT('stem.wave.cl_tiltshift', 'Tilt-shift 24mm'), fov: __alloT('stem.wave.cl_tiltshift_fov', '~84° normal, controllable'), use: __alloT('stem.wave.cl_tiltshift_use', 'Architecture (keep verticals straight), miniature faking.') },
        { lens: __alloT('stem.wave.cl_anamorphic', 'Cinema anamorphic 50mm'), fov: __alloT('stem.wave.cl_anamorphic_fov', 'wider horizontally than spherical'), use: __alloT('stem.wave.cl_anamorphic_use', 'Cinematic look. Oval bokeh, lens flares.') }
      ];

      var CAMERA_FACTS = [
        { fact: __alloT('stem.wave.cf_crop', 'Crop factor'), detail: __alloT('stem.wave.cf_crop_detail', 'Smaller sensors crop image. APS-C ~1.5×, Micro 4/3 ~2×, smartphone ~5-7×.') },
        { fact: __alloT('stem.wave.cf_efl', 'Effective focal length'), detail: __alloT('stem.wave.cf_efl_detail', '50mm lens on APS-C looks like 75mm on full frame. Doesn\'t change actual focal length, just FOV.') },
        { fact: __alloT('stem.wave.cf_fstop', 'f-stop'), detail: __alloT('stem.wave.cf_fstop_detail', 'Ratio of focal length to aperture diameter. f/1.4, f/2, f/2.8, f/4, f/5.6, f/8 (each step halves light).') },
        { fact: __alloT('stem.wave.cf_dof', 'Depth of field'), detail: __alloT('stem.wave.cf_dof_detail', 'Wider aperture (smaller f number) → shallower DOF. Why portraits use f/1.8-f/2.8 for soft backgrounds.') },
        { fact: __alloT('stem.wave.cf_shutter', 'Shutter speed for handheld'), detail: __alloT('stem.wave.cf_shutter_detail', 'Rule: at least 1/focal-length sec. 50mm → 1/50 or faster. Stabilization helps.') },
        { fact: __alloT('stem.wave.cf_sensors', 'Sensor sizes'), detail: __alloT('stem.wave.cf_sensors_detail', 'Full frame (36×24mm) > APS-H > APS-C > Micro 4/3 > 1" > phone sensors (~1/2" - 1/3").') },
        { fact: __alloT('stem.wave.cf_megapixels', 'Megapixels'), detail: __alloT('stem.wave.cf_megapixels_detail', 'More pixels = more detail (with good lens). Diminishing returns past ~24-50 MP for most uses.') },
        { fact: __alloT('stem.wave.cf_iso', 'ISO'), detail: __alloT('stem.wave.cf_iso_detail', 'Sensor sensitivity. Higher ISO = brighter image but more noise. Base ISO (lowest noise) typically 100-200.') }
      ];

      function renderSpeeds2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏲ ' + __alloT('stem.wave.sec_speeds2_title', 'Wave speeds in detail')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_wave_medium', 'Wave + medium'), __alloT('stem.wave.col_speed', 'Speed'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📷 ' + __alloT('stem.wave.sec_cameras_title', 'Camera lenses + photography')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_lens_focal_lengths', 'Lens focal lengths (35mm full-frame)')),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    [__alloT('stem.wave.col_lens', 'Lens'), __alloT('stem.wave.col_fov', 'Field of view'), __alloT('stem.wave.col_use', 'Use')].map(function(hh, i) {
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_photography_essentials', 'Photography essentials')),
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
        { star: __alloT('stem.wave.star_sun', 'Sun'), type: __alloT('stem.wave.star_sun_type', 'G2V (yellow dwarf)'), temp: '5,778 K', distance: '1 AU', notes: __alloT('stem.wave.star_sun_notes', 'Our nearest star. Apparent peak ~480 nm (blue-green) but we see it yellow due to atmospheric scattering.') },
        { star: __alloT('stem.wave.star_proxima', 'Proxima Centauri'), type: __alloT('stem.wave.star_proxima_type', 'M5.5 (red dwarf)'), temp: '~3,042 K', distance: '4.24 ly', notes: __alloT('stem.wave.star_proxima_notes', 'Nearest known star. Has planets including Proxima b in habitable zone.') },
        { star: __alloT('stem.wave.star_sirius', 'Sirius A'), type: __alloT('stem.wave.star_sirius_type', 'A1V (white)'), temp: '9,940 K', distance: '8.6 ly', notes: __alloT('stem.wave.star_sirius_notes', 'Brightest in night sky. Binary with white-dwarf Sirius B.') },
        { star: __alloT('stem.wave.star_betelgeuse', 'Betelgeuse'), type: __alloT('stem.wave.star_betelgeuse_type', 'M1-2 (red supergiant)'), temp: '~3,500 K', distance: '~640 ly', notes: __alloT('stem.wave.star_betelgeuse_notes', 'Orion\'s shoulder. Variable. Could go supernova "soon" (anytime in next ~100,000 yr).') },
        { star: __alloT('stem.wave.star_rigel', 'Rigel'), type: __alloT('stem.wave.star_rigel_type', 'B8I (blue supergiant)'), temp: '~12,100 K', distance: '~860 ly', notes: __alloT('stem.wave.star_rigel_notes', 'Orion\'s foot. Triple star system.') },
        { star: __alloT('stem.wave.star_vega', 'Vega'), type: __alloT('stem.wave.star_vega_type', 'A0V (white)'), temp: '9,602 K', distance: '25 ly', notes: __alloT('stem.wave.star_vega_notes', 'Was once "the" North Star. Will be again in ~13,727 CE (precession of equinoxes).') },
        { star: __alloT('stem.wave.star_polaris', 'Polaris'), type: __alloT('stem.wave.star_polaris_type', 'F7Ib (yellow supergiant)'), temp: '6,015 K', distance: '~430 ly', notes: __alloT('stem.wave.star_polaris_notes', 'Current North Star. Within ~0.5° of celestial north.') },
        { star: __alloT('stem.wave.star_aldebaran', 'Aldebaran'), type: __alloT('stem.wave.star_aldebaran_type', 'K5III (orange giant)'), temp: '~3,910 K', distance: '~65 ly', notes: __alloT('stem.wave.star_aldebaran_notes', 'Eye of Taurus. Reddish-orange.') },
        { star: __alloT('stem.wave.star_antares', 'Antares'), type: __alloT('stem.wave.star_antares_type', 'M1.5Iab (red supergiant)'), temp: '~3,660 K', distance: '~550 ly', notes: __alloT('stem.wave.star_antares_notes', 'Heart of Scorpius. Diameter ~700× Sun.') },
        { star: __alloT('stem.wave.star_procyon', 'Procyon'), type: __alloT('stem.wave.star_procyon_type', 'F5IV (yellow-white)'), temp: '6,530 K', distance: '11.5 ly', notes: __alloT('stem.wave.star_procyon_notes', 'Eighth brightest star. Binary.') },
        { star: __alloT('stem.wave.star_capella', 'Capella'), type: __alloT('stem.wave.star_capella_type', 'G3III + G0III (yellow giants)'), temp: '~5,000 K (combined)', distance: '~43 ly', notes: __alloT('stem.wave.star_capella_notes', 'Sixth brightest. Two pairs (4 stars).') },
        { star: __alloT('stem.wave.star_spica', 'Spica'), type: __alloT('stem.wave.star_spica_type', 'B1III-IV (blue giant)'), temp: '~22,400 K', distance: '~250 ly', notes: __alloT('stem.wave.star_spica_notes', 'Brightest in Virgo. Binary.') },
        { star: __alloT('stem.wave.star_eta', 'Eta Carinae'), type: __alloT('stem.wave.star_eta_type', 'LBV (luminous blue variable)'), temp: '~20,000 K', distance: '~7,500 ly', notes: __alloT('stem.wave.star_eta_notes', 'Massive (90 M☉ + companion). Erupted dramatically in 1840s. Likely future supernova/hypernova.') },
        { star: __alloT('stem.wave.star_uy', 'UY Scuti'), type: __alloT('stem.wave.star_uy_type', 'M4Ia (red hypergiant)'), temp: '~3,365 K', distance: '~5,200 ly', notes: __alloT('stem.wave.star_uy_notes', 'Among largest known stars. Diameter ~1700× Sun.') }
      ];

      var SCREEN_TYPES = [
        { type: __alloT('stem.wave.scr_crt', 'CRT (cathode ray tube)'), refresh: '60-100 Hz', notes: __alloT('stem.wave.scr_crt_notes', 'Electron beam scans phosphors. Largely obsolete since ~2010.') },
        { type: __alloT('stem.wave.scr_lcd', 'LCD (liquid crystal display)'), refresh: '60-360 Hz', notes: __alloT('stem.wave.scr_lcd_notes', 'LCs modulate backlight. Energy-efficient. Limited viewing angles.') },
        { type: __alloT('stem.wave.scr_oled', 'OLED (organic LED)'), refresh: '60-240 Hz', notes: __alloT('stem.wave.scr_oled_notes', 'Each pixel emits own light. True blacks. Premium phones, TVs.') },
        { type: __alloT('stem.wave.scr_microled', 'micro-LED'), refresh: '60-240 Hz', notes: __alloT('stem.wave.scr_microled_notes', 'Like OLED but inorganic LEDs. Brighter, longer-lived. Expensive (~2025).') },
        { type: __alloT('stem.wave.scr_plasma', 'Plasma'), refresh: __alloT('stem.wave.scr_plasma_refresh', '60 Hz typical'), notes: __alloT('stem.wave.scr_plasma_notes', 'Excited gas emits UV → phosphors. Discontinued ~2014.') },
        { type: __alloT('stem.wave.scr_eink', 'E-ink'), refresh: __alloT('stem.wave.scr_eink_refresh', 'on update'), notes: __alloT('stem.wave.scr_eink_notes', 'Microcapsules with charged particles. No backlight needed. E-readers.') },
        { type: __alloT('stem.wave.scr_dlp', 'Projector (DLP)'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_dlp_notes', 'Micromirror array. Color via spinning wheel or 3 chips.') },
        { type: __alloT('stem.wave.scr_lcdproj', 'Projector (LCD)'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_lcdproj_notes', '3 LCD panels (RGB). Common in classrooms.') },
        { type: __alloT('stem.wave.scr_laser', 'Laser projector'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_laser_notes', 'RGB lasers, no lamp replacement. Wide color gamut.') }
      ];

      var SCREEN_RESOLUTIONS = [
        { name: '480p (SD)', resolution: '640×480 or 720×480', notes: __alloT('stem.wave.res_480_notes', 'Standard definition.') },
        { name: '720p (HD)', resolution: '1280×720', notes: __alloT('stem.wave.res_720_notes', 'Cable TV, older laptops.') },
        { name: '1080p (Full HD)', resolution: '1920×1080', notes: __alloT('stem.wave.res_1080_notes', 'Most TVs + phones for a decade.') },
        { name: '2K / QHD', resolution: '2560×1440', notes: __alloT('stem.wave.res_2k_notes', 'High-end monitors.') },
        { name: '4K (UHD)', resolution: '3840×2160', notes: __alloT('stem.wave.res_4k_notes', 'Now standard for new TVs.') },
        { name: '5K', resolution: '5120×2880', notes: __alloT('stem.wave.res_5k_notes', 'Apple iMac 5K, pro monitors.') },
        { name: '8K', resolution: '7680×4320', notes: __alloT('stem.wave.res_8k_notes', 'Premium TVs. Limited content.') },
        { name: 'DCI 4K', resolution: '4096×2160', notes: __alloT('stem.wave.res_dci4k_notes', 'Cinema standard.') },
        { name: '16K (experimental)', resolution: '15360×8640', notes: __alloT('stem.wave.res_16k_notes', 'Not commercially available.') }
      ];

      var NOISE_LEVELS = [
        { source: __alloT('stem.wave.nl_threshold', 'Threshold of hearing'), db: '0 dB SPL', notes: __alloT('stem.wave.nl_threshold_notes', 'Quietest sound a young healthy ear can detect.') },
        { source: __alloT('stem.wave.nl_whisper', 'Whisper at 1 m'), db: '~30 dB', notes: __alloT('stem.wave.nl_whisper_notes', 'Library.') },
        { source: __alloT('stem.wave.nl_quiet', 'Quiet room'), db: '~40 dB', notes: __alloT('stem.wave.nl_quiet_notes', 'Empty house at night.') },
        { source: __alloT('stem.wave.nl_conversation', 'Normal conversation'), db: '~60 dB', notes: __alloT('stem.wave.nl_conversation_notes', 'At 1 m.') },
        { source: __alloT('stem.wave.nl_vacuum', 'Vacuum cleaner'), db: '~70 dB', notes: __alloT('stem.wave.nl_vacuum_notes', 'Most household appliances.') },
        { source: __alloT('stem.wave.nl_traffic', 'Heavy traffic'), db: '~80 dB', notes: __alloT('stem.wave.nl_traffic_notes', 'Long exposure can cause hearing damage.') },
        { source: __alloT('stem.wave.nl_mower', 'Lawn mower'), db: '~85-90 dB', notes: __alloT('stem.wave.nl_mower_notes', '85 dB = OSHA action level (hearing conservation required).') },
        { source: __alloT('stem.wave.nl_subway', 'Subway train'), db: '~95-100 dB', notes: __alloT('stem.wave.nl_subway_notes', 'Pain threshold for prolonged exposure.') },
        { source: __alloT('stem.wave.nl_powertools', 'Power tools (chainsaw)'), db: '~110 dB', notes: __alloT('stem.wave.nl_powertools_notes', 'Hearing protection essential.') },
        { source: __alloT('stem.wave.nl_concert', 'Rock concert / club'), db: '~110-120 dB', notes: __alloT('stem.wave.nl_concert_notes', 'Permanent damage in minutes.') },
        { source: __alloT('stem.wave.nl_pain', 'Threshold of pain'), db: '~130 dB', notes: __alloT('stem.wave.nl_pain_notes', 'Physically painful.') },
        { source: __alloT('stem.wave.nl_jet', 'Jet engine at 30 m'), db: '~140 dB', notes: __alloT('stem.wave.nl_jet_notes', 'Instant hearing damage.') },
        { source: __alloT('stem.wave.nl_gunshot', 'Gunshot'), db: '~150-170 dB', notes: __alloT('stem.wave.nl_gunshot_notes', 'Permanent damage possible from single exposure.') },
        { source: __alloT('stem.wave.nl_rocket', 'Rocket launch at 100 m'), db: '~180 dB', notes: __alloT('stem.wave.nl_rocket_notes', 'Causes hearing damage + can damage equipment.') },
        { source: __alloT('stem.wave.nl_krakatoa', 'Krakatoa eruption (1883)'), db: '~310 dB at source', notes: __alloT('stem.wave.nl_krakatoa_notes', 'Possibly loudest sound in modern history. Heard 3000 miles away.') }
      ];

      function renderStarsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⭐ ' + __alloT('stem.wave.sec_stars_title', 'Notable stars (visible spectra)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_stars_intro', 'Star color reflects surface temperature: red coolest (~3,000 K) → orange → yellow → white → blue hottest (~30,000+ K). Spectral types O-B-A-F-G-K-M.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📺 ' + __alloT('stem.wave.sec_tvfreq_title', 'Display technologies + resolutions')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_display_types', 'Display types')),
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_standard_resolutions', 'Standard resolutions')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 ' + __alloT('stem.wave.sec_noise_title', 'Sound levels (dB SPL)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_noise_intro', 'Decibels are logarithmic: +10 dB ≈ 10× sound intensity but ~2× perceived loudness. Sustained exposure >85 dB damages hearing.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_source', 'Source'), __alloT('stem.wave.col_level', 'Level'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
        { animal: __alloT('stem.wave.ah_human_young', 'Human (young)'), range: '20 Hz - 20 kHz', notes: __alloT('stem.wave.ah_human_young_notes', 'Upper limit drops with age; adults often only ~14-16 kHz.') },
        { animal: __alloT('stem.wave.ah_human_elderly', 'Human (elderly)'), range: '20 Hz - 10-12 kHz', notes: __alloT('stem.wave.ah_human_elderly_notes', 'Presbycusis — gradual high-frequency loss after age ~50.') },
        { animal: __alloT('stem.wave.ah_dog', 'Dog'), range: '40 Hz - 60 kHz', notes: __alloT('stem.wave.ah_dog_notes', 'Dog whistles at 20-25 kHz inaudible to humans.') },
        { animal: __alloT('stem.wave.ah_cat', 'Cat'), range: '55 Hz - 79 kHz', notes: __alloT('stem.wave.ah_cat_notes', 'Wide range. Sensitive to mouse squeaks.') },
        { animal: __alloT('stem.wave.ah_bat', 'Bat (echolocation)'), range: '1 kHz - 200 kHz', notes: __alloT('stem.wave.ah_bat_notes', 'Chirp out + listen. Some species at 100+ kHz.') },
        { animal: __alloT('stem.wave.ah_dolphin', 'Dolphin'), range: '~150 Hz - 150 kHz', notes: __alloT('stem.wave.ah_dolphin_notes', 'Echolocate underwater; clicks up to 200 kHz.') },
        { animal: __alloT('stem.wave.ah_whale', 'Whale (baleen)'), range: '~10 Hz - 30 kHz', notes: __alloT('stem.wave.ah_whale_notes', 'Use infrasound (low freq) for very long-distance communication.') },
        { animal: __alloT('stem.wave.ah_elephant', 'Elephant'), range: '~5 Hz - 12 kHz', notes: __alloT('stem.wave.ah_elephant_notes', 'Infrasonic rumbles travel miles. Use for long-range communication.') },
        { animal: __alloT('stem.wave.ah_mouse', 'Mouse'), range: '1 kHz - 90 kHz', notes: __alloT('stem.wave.ah_mouse_notes', 'Ultrasonic vocalizations.') },
        { animal: __alloT('stem.wave.ah_bird', 'Bird (chicken)'), range: '125 Hz - 2 kHz', notes: __alloT('stem.wave.ah_bird_notes', 'Narrower range than mammals. Used in cock crow.') },
        { animal: __alloT('stem.wave.ah_owl', 'Owl'), range: '~50 Hz - 12 kHz', notes: __alloT('stem.wave.ah_owl_notes', 'Asymmetric ears for precise location of prey rustles.') },
        { animal: __alloT('stem.wave.ah_moth', 'Moth'), range: '~20-60 kHz', notes: __alloT('stem.wave.ah_moth_notes', 'Hear bat echolocation — drop to evade.') },
        { animal: __alloT('stem.wave.ah_fish', 'Fish (most)'), range: '50 Hz - 1 kHz', notes: __alloT('stem.wave.ah_fish_notes', 'Use lateral line for water vibrations + ears for sound.') },
        { animal: __alloT('stem.wave.ah_cricket', 'Cricket'), range: '~5-90 kHz', notes: __alloT('stem.wave.ah_cricket_notes', 'Ears on legs! Tympanic organs near "knee".') }
      ];

      var INSTRUMENT_FREQS = [
        { instrument: __alloT('stem.wave.if_piano', 'Piano'), range: '27.5 Hz - 4186 Hz', fundamental: 'A0-C8 (88 keys)', notes: __alloT('stem.wave.if_piano_notes', 'Widest range of standard orchestral instruments.') },
        { instrument: __alloT('stem.wave.if_violin', 'Violin'), range: '196 Hz - 3520 Hz', fundamental: 'G3-A7', notes: __alloT('stem.wave.if_violin_notes', 'Highest pitch of orchestral strings.') },
        { instrument: __alloT('stem.wave.if_viola', 'Viola'), range: '130 Hz - 1318 Hz', fundamental: 'C3-E6', notes: __alloT('stem.wave.if_viola_notes', 'Pitched fifth below violin.') },
        { instrument: __alloT('stem.wave.if_cello', 'Cello'), range: '65 Hz - 1046 Hz', fundamental: 'C2-C6', notes: __alloT('stem.wave.if_cello_notes', 'Pitched octave below viola.') },
        { instrument: __alloT('stem.wave.if_bass', 'Double bass'), range: '41 Hz - 246 Hz', fundamental: 'E1-B3', notes: __alloT('stem.wave.if_bass_notes', 'Lowest of standard orchestral strings.') },
        { instrument: __alloT('stem.wave.if_guitar', 'Guitar (standard tuning)'), range: '82 Hz - 1318 Hz', fundamental: 'E2-E6', notes: __alloT('stem.wave.if_guitar_notes', 'EADGBE strings. Range varies with frets.') },
        { instrument: __alloT('stem.wave.if_bassguitar', 'Bass guitar'), range: '41 Hz - 350 Hz', fundamental: 'E1-E4', notes: __alloT('stem.wave.if_bassguitar_notes', 'Octave below standard guitar (4-string).') },
        { instrument: __alloT('stem.wave.if_flute', 'Flute'), range: '262 Hz - 2093 Hz', fundamental: 'C4-C7', notes: __alloT('stem.wave.if_flute_notes', 'Highest standard woodwind.') },
        { instrument: __alloT('stem.wave.if_clarinet', 'Clarinet (Bb)'), range: '147 Hz - 1568 Hz', fundamental: 'D3-G6', notes: __alloT('stem.wave.if_clarinet_notes', 'Wide range. Distinctive timbre via odd harmonics.') },
        { instrument: __alloT('stem.wave.if_oboe', 'Oboe'), range: '233 Hz - 1568 Hz', fundamental: 'Bb3-G6', notes: __alloT('stem.wave.if_oboe_notes', 'Reedy tone. Tunes the orchestra (its A is hardest to adjust).') },
        { instrument: __alloT('stem.wave.if_bassoon', 'Bassoon'), range: '58 Hz - 622 Hz', fundamental: 'Bb1-Eb5', notes: __alloT('stem.wave.if_bassoon_notes', 'Lowest standard woodwind.') },
        { instrument: __alloT('stem.wave.if_trumpet', 'Trumpet'), range: '165 Hz - 988 Hz', fundamental: 'E3-B5', notes: __alloT('stem.wave.if_trumpet_notes', 'Highest standard brass.') },
        { instrument: __alloT('stem.wave.if_trombone', 'Trombone'), range: '82 Hz - 622 Hz', fundamental: 'E2-Eb5', notes: __alloT('stem.wave.if_trombone_notes', 'Slide changes pitch — continuous glissando possible.') },
        { instrument: __alloT('stem.wave.if_frenchhorn', 'French horn'), range: '62 Hz - 698 Hz', fundamental: 'B1-F5', notes: __alloT('stem.wave.if_frenchhorn_notes', 'Wide tonal range; difficult to control.') },
        { instrument: __alloT('stem.wave.if_tuba', 'Tuba'), range: '41 Hz - 349 Hz', fundamental: 'E1-F4', notes: __alloT('stem.wave.if_tuba_notes', 'Lowest brass.') },
        { instrument: __alloT('stem.wave.if_soprano', 'Voice (soprano)'), range: '262 Hz - 1046 Hz', fundamental: 'C4-C6', notes: __alloT('stem.wave.if_soprano_notes', 'Highest female voice type.') },
        { instrument: __alloT('stem.wave.if_alto', 'Voice (alto)'), range: '196 Hz - 698 Hz', fundamental: 'G3-F5', notes: __alloT('stem.wave.if_alto_notes', 'Lower female voice.') },
        { instrument: __alloT('stem.wave.if_tenor', 'Voice (tenor)'), range: '131 Hz - 523 Hz', fundamental: 'C3-C5', notes: __alloT('stem.wave.if_tenor_notes', 'Highest male voice.') },
        { instrument: __alloT('stem.wave.if_baritone', 'Voice (baritone)'), range: '110 Hz - 440 Hz', fundamental: 'A2-A4', notes: __alloT('stem.wave.if_baritone_notes', 'Most common male voice.') },
        { instrument: __alloT('stem.wave.if_bassvoice', 'Voice (bass)'), range: '82 Hz - 349 Hz', fundamental: 'E2-F4', notes: __alloT('stem.wave.if_bassvoice_notes', 'Lowest standard voice.') },
        { instrument: __alloT('stem.wave.if_kick', 'Drum kit (kick)'), range: '60-100 Hz', fundamental: __alloT('stem.wave.if_kick_fund', 'low rumble'), notes: __alloT('stem.wave.if_kick_notes', 'Felt as much as heard.') },
        { instrument: __alloT('stem.wave.if_snare', 'Drum kit (snare)'), range: '~200 Hz fundamental', fundamental: __alloT('stem.wave.if_snare_fund', 'sharp attack'), notes: __alloT('stem.wave.if_snare_notes', 'Wires (snares) add high-frequency rattle.') },
        { instrument: __alloT('stem.wave.if_cymbal', 'Cymbal (crash)'), range: 'broad ~300 Hz - 10+ kHz', fundamental: __alloT('stem.wave.if_cymbal_fund', 'inharmonic'), notes: __alloT('stem.wave.if_cymbal_notes', 'Not tonally pitched — many frequencies together.') }
      ];

      var RADIO_BANDS = [
        { band: __alloT('stem.wave.rb_elf', 'ELF (extremely low)'), range: '3-30 Hz', wavelength: '100,000-10,000 km', use: __alloT('stem.wave.rb_elf_use', 'Submarine communication (penetrates water).') },
        { band: __alloT('stem.wave.rb_slf', 'SLF (super low)'), range: '30-300 Hz', wavelength: '10,000-1,000 km', use: __alloT('stem.wave.rb_slf_use', 'Submarines, AC power harmonics.') },
        { band: __alloT('stem.wave.rb_ulf', 'ULF (ultra low)'), range: '300 Hz-3 kHz', wavelength: '1,000-100 km', use: __alloT('stem.wave.rb_ulf_use', 'Mine communication, geophysics.') },
        { band: __alloT('stem.wave.rb_vlf', 'VLF (very low)'), range: '3-30 kHz', wavelength: '100-10 km', use: __alloT('stem.wave.rb_vlf_use', 'Submarine comms, navigation beacons.') },
        { band: __alloT('stem.wave.rb_lf', 'LF (low)'), range: '30-300 kHz', wavelength: '10-1 km', use: __alloT('stem.wave.rb_lf_use', 'AM longwave radio (Europe), time signals (WWVB), aircraft navigation.') },
        { band: __alloT('stem.wave.rb_mf', 'MF (medium)'), range: '300 kHz-3 MHz', wavelength: '1 km-100 m', use: __alloT('stem.wave.rb_mf_use', 'AM broadcast radio (525-1705 kHz).') },
        { band: __alloT('stem.wave.rb_hf', 'HF (high)'), range: '3-30 MHz', wavelength: '100-10 m', use: __alloT('stem.wave.rb_hf_use', 'Shortwave radio, ham radio. Reflects off ionosphere → global propagation.') },
        { band: __alloT('stem.wave.rb_vhf', 'VHF (very high)'), range: '30-300 MHz', wavelength: '10-1 m', use: __alloT('stem.wave.rb_vhf_use', 'FM radio (88-108 MHz), TV channels 2-13, air traffic, weather radio.') },
        { band: __alloT('stem.wave.rb_uhf', 'UHF (ultra high)'), range: '300 MHz-3 GHz', wavelength: '1 m-10 cm', use: __alloT('stem.wave.rb_uhf_use', 'TV channels 14+, cellular (700 MHz - 2.6 GHz), Wi-Fi 2.4 GHz, microwave ovens.') },
        { band: __alloT('stem.wave.rb_shf', 'SHF (super high)'), range: '3-30 GHz', wavelength: '10 cm-1 cm', use: __alloT('stem.wave.rb_shf_use', 'Wi-Fi 5/6 GHz, satellite TV, radar.') },
        { band: __alloT('stem.wave.rb_ehf', 'EHF (extremely high)'), range: '30-300 GHz', wavelength: '1 cm-1 mm', use: __alloT('stem.wave.rb_ehf_use', '5G mmWave, automotive radar, radio astronomy.') },
        { band: __alloT('stem.wave.rb_thf', 'THF (terahertz)'), range: '300 GHz-3 THz', wavelength: '1 mm-100 μm', use: __alloT('stem.wave.rb_thf_use', 'Research band. Some imaging applications (terahertz cameras).') }
      ];

      var NAMED_COLORS = [
        { name: __alloT('stem.wave.nc_black', 'Black'), hex: '#000000', wavelength: '—', notes: __alloT('stem.wave.nc_black_notes', 'Absence of light. Truest black possible.') },
        { name: __alloT('stem.wave.nc_white', 'White'), hex: '#FFFFFF', wavelength: __alloT('stem.wave.nc_all_visible', 'all visible'), notes: __alloT('stem.wave.nc_white_notes', 'All wavelengths reflected equally.') },
        { name: __alloT('stem.wave.nc_red', 'Red'), hex: '#FF0000', wavelength: '~620-750 nm', notes: __alloT('stem.wave.nc_red_notes', 'Lowest energy visible.') },
        { name: __alloT('stem.wave.nc_orange', 'Orange'), hex: '#FFA500', wavelength: '~590-620 nm', notes: __alloT('stem.wave.nc_orange_notes', 'Between red + yellow.') },
        { name: __alloT('stem.wave.nc_yellow', 'Yellow'), hex: '#FFFF00', wavelength: '~570-590 nm', notes: __alloT('stem.wave.nc_yellow_notes', 'Brightest perceived color (peak human sensitivity).') },
        { name: __alloT('stem.wave.nc_green', 'Green'), hex: '#00FF00', wavelength: '~495-570 nm', notes: __alloT('stem.wave.nc_green_notes', 'Most abundant in nature (chlorophyll reflects).') },
        { name: __alloT('stem.wave.nc_cyan', 'Cyan'), hex: '#00FFFF', wavelength: '~485-500 nm', notes: __alloT('stem.wave.nc_cyan_notes', 'Halfway between blue + green.') },
        { name: __alloT('stem.wave.nc_blue', 'Blue'), hex: '#0000FF', wavelength: '~450-495 nm', notes: __alloT('stem.wave.nc_blue_notes', 'Scattered most by atmosphere → blue sky.') },
        { name: __alloT('stem.wave.nc_magenta', 'Magenta'), hex: '#FF00FF', wavelength: __alloT('stem.wave.nc_not_single', 'not a single λ'), notes: __alloT('stem.wave.nc_magenta_notes', 'Brain perceives red+blue without green. Has no monochromatic wavelength.') },
        { name: __alloT('stem.wave.nc_violet', 'Violet'), hex: '#8B00FF', wavelength: '~380-450 nm', notes: __alloT('stem.wave.nc_violet_notes', 'Highest energy visible. Beyond is UV.') },
        { name: __alloT('stem.wave.nc_pink', 'Pink'), hex: '#FFC0CB', wavelength: '—', notes: __alloT('stem.wave.nc_pink_notes', 'Tint of red. Lots of cultural meaning.') },
        { name: __alloT('stem.wave.nc_brown', 'Brown'), hex: '#A52A2A', wavelength: '—', notes: __alloT('stem.wave.nc_brown_notes', 'Dark orange/red. No "brown" wavelength exists — perceptual color only.') },
        { name: __alloT('stem.wave.nc_gray', 'Gray'), hex: '#808080', wavelength: '—', notes: __alloT('stem.wave.nc_gray_notes', 'Achromatic. Equal RGB at any intensity.') },
        { name: __alloT('stem.wave.nc_silver', 'Silver'), hex: '#C0C0C0', wavelength: '—', notes: __alloT('stem.wave.nc_silver_notes', 'Light gray, often with metallic sheen.') },
        { name: __alloT('stem.wave.nc_gold', 'Gold'), hex: '#FFD700', wavelength: '—', notes: __alloT('stem.wave.nc_gold_notes', 'Yellow with brownish tint. Metallic sheen in physical samples.') },
        { name: __alloT('stem.wave.nc_maroon', 'Maroon'), hex: '#800000', wavelength: '—', notes: __alloT('stem.wave.nc_maroon_notes', 'Dark red.') },
        { name: __alloT('stem.wave.nc_navy', 'Navy'), hex: '#000080', wavelength: '—', notes: __alloT('stem.wave.nc_navy_notes', 'Dark blue. Original navy uniforms.') },
        { name: __alloT('stem.wave.nc_teal', 'Teal'), hex: '#008080', wavelength: '—', notes: __alloT('stem.wave.nc_teal_notes', 'Dark cyan. Named after teal duck\'s head color.') },
        { name: __alloT('stem.wave.nc_olive', 'Olive'), hex: '#808000', wavelength: '—', notes: __alloT('stem.wave.nc_olive_notes', 'Dark yellow-green.') },
        { name: __alloT('stem.wave.nc_purple', 'Purple'), hex: '#800080', wavelength: '—', notes: __alloT('stem.wave.nc_purple_notes', 'Dark magenta. Royal purple historically rare + expensive (Tyrian dye).') },
        { name: __alloT('stem.wave.nc_indigo', 'Indigo'), hex: '#4B0082', wavelength: '~440-450 nm', notes: __alloT('stem.wave.nc_indigo_notes', 'Between blue + violet. Newton\'s color of the spectrum.') },
        { name: __alloT('stem.wave.nc_lime', 'Lime'), hex: '#00FF00', wavelength: '~495-570 nm', notes: __alloT('stem.wave.nc_lime_notes', 'Web "lime" = pure green RGB.') },
        { name: __alloT('stem.wave.nc_aqua', 'Aqua'), hex: '#00FFFF', wavelength: '~485-500 nm', notes: __alloT('stem.wave.nc_aqua_notes', 'Same as cyan in web colors.') },
        { name: __alloT('stem.wave.nc_fuchsia', 'Fuchsia'), hex: '#FF00FF', wavelength: __alloT('stem.wave.nc_not_single', 'not a single λ'), notes: __alloT('stem.wave.nc_fuchsia_notes', 'Same as magenta in web colors.') },
        { name: __alloT('stem.wave.nc_coral', 'Coral'), hex: '#FF7F50', wavelength: '—', notes: __alloT('stem.wave.nc_coral_notes', 'Orange-pink, named after coral reefs.') },
        { name: __alloT('stem.wave.nc_tomato', 'Tomato'), hex: '#FF6347', wavelength: '—', notes: __alloT('stem.wave.nc_tomato_notes', 'Bright red-orange.') },
        { name: __alloT('stem.wave.nc_salmon', 'Salmon'), hex: '#FA8072', wavelength: '—', notes: __alloT('stem.wave.nc_salmon_notes', 'Pinkish orange, like salmon flesh.') },
        { name: __alloT('stem.wave.nc_khaki', 'Khaki'), hex: '#F0E68C', wavelength: '—', notes: __alloT('stem.wave.nc_khaki_notes', 'Light yellow-brown. Military uniforms.') },
        { name: __alloT('stem.wave.nc_crimson', 'Crimson'), hex: '#DC143C', wavelength: '~640 nm', notes: __alloT('stem.wave.nc_crimson_notes', 'Deep red.') },
        { name: __alloT('stem.wave.nc_lavender', 'Lavender'), hex: '#E6E6FA', wavelength: '—', notes: __alloT('stem.wave.nc_lavender_notes', 'Light purple, named after the flower.') },
        { name: __alloT('stem.wave.nc_turquoise', 'Turquoise'), hex: '#40E0D0', wavelength: '~490 nm', notes: __alloT('stem.wave.nc_turquoise_notes', 'Greenish blue, named after the gemstone.') },
        { name: __alloT('stem.wave.nc_beige', 'Beige'), hex: '#F5F5DC', wavelength: '—', notes: __alloT('stem.wave.nc_beige_notes', 'Pale yellow-brown. Common neutral.') }
      ];

      var WAVE_SPEEDS = [
        { medium: __alloT('stem.wave.ws_vacuum', 'Vacuum'), speed: '299,792,458 m/s (light)', notes: __alloT('stem.wave.ws_vacuum_notes', 'Defined exactly. Maximum possible speed of any information.') },
        { medium: __alloT('stem.wave.ws_air0', 'Air at 0°C'), speed: '331 m/s (sound)', notes: __alloT('stem.wave.ws_air0_notes', 'Speed of sound increases with temperature.') },
        { medium: __alloT('stem.wave.ws_air20', 'Air at 20°C'), speed: '343 m/s (sound)', notes: __alloT('stem.wave.ws_air20_notes', 'Standard reference. ~1235 km/h, 767 mph.') },
        { medium: __alloT('stem.wave.ws_helium', 'Helium at 20°C'), speed: '~1007 m/s (sound)', notes: __alloT('stem.wave.ws_helium_notes', 'Faster — lighter molecules. Why helium makes voice high-pitched.') },
        { medium: __alloT('stem.wave.ws_water20', 'Water at 20°C'), speed: '~1482 m/s (sound)', notes: __alloT('stem.wave.ws_water20_notes', 'Sound travels ~4× faster in water than air.') },
        { medium: __alloT('stem.wave.ws_steel', 'Steel'), speed: '~5960 m/s (sound)', notes: __alloT('stem.wave.ws_steel_notes', 'Sound very fast in stiff solids.') },
        { medium: __alloT('stem.wave.ws_diamond', 'Diamond'), speed: '~12,000 m/s (sound)', notes: __alloT('stem.wave.ws_diamond_notes', 'Fastest sound speed of common materials.') },
        { medium: __alloT('stem.wave.ws_glass', 'Glass (typical)'), speed: '~200,000 km/s (light)', notes: __alloT('stem.wave.ws_glass_notes', 'About 2/3 c. Refractive index n = c/v ≈ 1.5.') },
        { medium: __alloT('stem.wave.ws_water', 'Water'), speed: '~225,000 km/s (light)', notes: __alloT('stem.wave.ws_water_notes', 'About 3/4 c. n ≈ 1.33.') },
        { medium: __alloT('stem.wave.ws_crust_p', 'Crust (P-waves)'), speed: '~5-8 km/s', notes: __alloT('stem.wave.ws_crust_p_notes', 'Earthquake P-waves move at this speed in upper crust.') },
        { medium: __alloT('stem.wave.ws_crust_s', 'Crust (S-waves)'), speed: '~3-4.5 km/s', notes: __alloT('stem.wave.ws_crust_s_notes', 'Slower than P-waves.') },
        { medium: __alloT('stem.wave.ws_tsunami', 'Tsunami (deep ocean)'), speed: '~700 km/h', notes: __alloT('stem.wave.ws_tsunami_notes', 'Long-wavelength shallow-water wave. Slows + grows at shore.') },
        { medium: __alloT('stem.wave.ws_coax', 'Light in coaxial cable'), speed: '~200,000 km/s', notes: __alloT('stem.wave.ws_coax_notes', 'Slower than vacuum — limits internet latency to/from data centers.') },
        { medium: __alloT('stem.wave.ws_tissue', 'Sound in body tissue'), speed: '~1500-1600 m/s', notes: __alloT('stem.wave.ws_tissue_notes', 'Similar to water. Why ultrasound works for medical imaging.') },
        { medium: __alloT('stem.wave.ws_rope', 'Compressional wave in rope'), speed: '√(T/μ) m/s', notes: __alloT('stem.wave.ws_rope_notes', 'T = tension, μ = linear density. Tighter rope → faster waves.') }
      ];

      function renderAnimalsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🦇 ' + __alloT('stem.wave.sec_animals_title', 'Animal hearing ranges')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_animal', 'Animal'), __alloT('stem.wave.col_hearing_range', 'Hearing range'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎻 ' + __alloT('stem.wave.sec_instrumentfreq_title', 'Musical instrument frequencies')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_instrument', 'Instrument'), __alloT('stem.wave.col_range', 'Range'), __alloT('stem.wave.col_notes_notation', 'Notes (notation)'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📻 ' + __alloT('stem.wave.sec_radio_bands_title', 'Radio frequency bands (ITU)')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_radio_bands_intro', 'EM waves below visible light, classified by frequency. Lower bands penetrate further; higher bands carry more data.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_band', 'Band'), __alloT('stem.wave.col_frequency', 'Frequency'), __alloT('stem.wave.col_wavelength', 'Wavelength'), __alloT('stem.wave.col_use', 'Use')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 ' + __alloT('stem.wave.sec_colorhex_title', 'Named colors + their wavelengths')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_color', 'Color'), __alloT('stem.wave.col_hex', 'Hex'), 'λ peak', __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏱ ' + __alloT('stem.wave.sec_wavespeed_title', 'Wave speeds in different media')),
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
        { model: __alloT('stem.wave.cm_rgb', 'RGB (additive)'), use: __alloT('stem.wave.cm_rgb_use', 'Screens, displays'), notes: __alloT('stem.wave.cm_rgb_notes', 'Red + Green + Blue. All three at max = white. Used because screens emit light.') },
        { model: __alloT('stem.wave.cm_cmyk', 'CMYK (subtractive)'), use: __alloT('stem.wave.cm_cmyk_use', 'Printing'), notes: __alloT('stem.wave.cm_cmyk_notes', 'Cyan, Magenta, Yellow + Key (black). Inks absorb colors; all four = black. Used because paper reflects light.') },
        { model: __alloT('stem.wave.cm_hsl', 'HSL / HSV'), use: __alloT('stem.wave.cm_hsl_use', 'Color pickers, design'), notes: __alloT('stem.wave.cm_hsl_notes', 'Hue (angle 0-360°), Saturation (%), Lightness/Value (%). More intuitive than RGB for humans.') },
        { model: __alloT('stem.wave.cm_lab', 'LAB (CIELAB)'), use: __alloT('stem.wave.cm_lab_use', 'Color science, calibration'), notes: __alloT('stem.wave.cm_lab_notes', 'L = lightness, a = green-red, b = blue-yellow. Perceptually uniform.') },
        { model: __alloT('stem.wave.cm_xyz', 'XYZ (CIE 1931)'), use: __alloT('stem.wave.cm_xyz_use', 'Reference for all other models'), notes: __alloT('stem.wave.cm_xyz_notes', 'Based on human cone responses. Foundation of modern colorimetry.') },
        { model: __alloT('stem.wave.cm_srgb', 'sRGB'), use: __alloT('stem.wave.cm_srgb_use', 'Standard web + most displays'), notes: __alloT('stem.wave.cm_srgb_notes', 'Limited color gamut. Defines specific RGB primaries + gamma curve.') },
        { model: __alloT('stem.wave.cm_adobe', 'Adobe RGB'), use: __alloT('stem.wave.cm_adobe_use', 'Print prep + pro photography'), notes: __alloT('stem.wave.cm_adobe_notes', 'Wider gamut than sRGB, especially in greens.') },
        { model: __alloT('stem.wave.cm_p3', 'Display P3'), use: __alloT('stem.wave.cm_p3_use', 'Apple devices, modern smartphones'), notes: __alloT('stem.wave.cm_p3_notes', 'Wider gamut than sRGB, esp. reds. Standard for HDR.') },
        { model: __alloT('stem.wave.cm_rec2020', 'Rec. 2020'), use: __alloT('stem.wave.cm_rec2020_use', 'UHD TV / 4K + 8K video'), notes: __alloT('stem.wave.cm_rec2020_notes', 'Very wide gamut. Few displays can reproduce it fully.') }
      ];

      var LASER_TYPES = [
        { type: __alloT('stem.wave.lt_hene', 'Helium-Neon (HeNe)'), wavelength: '633 nm (red)', power: 'mW', use: __alloT('stem.wave.lt_hene_use', 'Alignment, barcode scanners (old). One of the first practical lasers.') },
        { type: __alloT('stem.wave.lt_co2', 'CO₂'), wavelength: '10.6 μm (IR)', power: 'W to kW', use: __alloT('stem.wave.lt_co2_use', 'Cutting metal + acrylic, surgery, marking.') },
        { type: __alloT('stem.wave.lt_ndyag', 'Nd:YAG'), wavelength: '1064 nm (NIR)', power: 'mW to kW', use: __alloT('stem.wave.lt_ndyag_use', 'Industrial cutting + welding, medical (skin treatment, tattoo removal).') },
        { type: __alloT('stem.wave.lt_argon', 'Argon ion'), wavelength: '488, 514 nm (blue-green)', power: 'mW to W', use: __alloT('stem.wave.lt_argon_use', 'Eye surgery (retinal), flow cytometry, light shows.') },
        { type: __alloT('stem.wave.lt_excimer', 'Excimer (ArF, KrF)'), wavelength: '193, 248 nm (UV)', power: 'pulse', use: __alloT('stem.wave.lt_excimer_use', 'LASIK eye surgery, microchip photolithography.') },
        { type: __alloT('stem.wave.lt_semiconductor', 'Semiconductor (laser diode)'), wavelength: 'broad — 400 nm to 2 μm', power: 'mW to W', use: __alloT('stem.wave.lt_semiconductor_use', 'CD/DVD/Blu-ray, laser pointers, fiber-optic comm.') },
        { type: __alloT('stem.wave.lt_fiber', 'Fiber laser'), wavelength: '~1 μm (typically)', power: 'W to kW', use: __alloT('stem.wave.lt_fiber_use', 'Industrial cutting/welding. Higher efficiency than older lasers.') },
        { type: __alloT('stem.wave.lt_dye', 'Dye laser'), wavelength: __alloT('stem.wave.lt_dye_wl', 'tunable across visible'), power: 'mW to W', use: __alloT('stem.wave.lt_dye_use', 'Spectroscopy, research. Largely replaced by tunable solid-state.') },
        { type: __alloT('stem.wave.lt_fel', 'Free-electron laser (FEL)'), wavelength: __alloT('stem.wave.lt_fel_wl', 'tunable, microwave to X-ray'), power: __alloT('stem.wave.lt_fel_power', 'high'), use: __alloT('stem.wave.lt_fel_use', 'Research — accelerator-based. Atomic-scale imaging.') },
        { type: __alloT('stem.wave.lt_tisapphire', 'Ti:Sapphire'), wavelength: '~800 nm (tunable)', power: 'W (ultrafast)', use: __alloT('stem.wave.lt_tisapphire_use', 'Ultrafast science. Femtosecond pulses. Two-photon microscopy.') }
      ];

      var LASER_FACTS = [
        { fact: __alloT('stem.wave.lf_acronym', 'LASER acronym'), detail: __alloT('stem.wave.lf_acronym_detail', 'Light Amplification by Stimulated Emission of Radiation.') },
        { fact: __alloT('stem.wave.lf_stimulated', 'Stimulated emission'), detail: __alloT('stem.wave.lf_stimulated_detail', 'A photon causes an excited atom to emit a SECOND identical photon. Cascade of identical photons = laser beam.') },
        { fact: __alloT('stem.wave.lf_inversion', 'Population inversion'), detail: __alloT('stem.wave.lf_inversion_detail', 'More atoms in excited state than ground. Required for net amplification. Achieved via "pumping" (light, current, or chemical).') },
        { fact: __alloT('stem.wave.lf_coherence', 'Coherence'), detail: __alloT('stem.wave.lf_coherence_detail', 'Laser photons all in phase. Allows interference effects + tight focusing.') },
        { fact: __alloT('stem.wave.lf_monochromatic', 'Monochromatic'), detail: __alloT('stem.wave.lf_monochromatic_detail', 'Single wavelength. Real lasers have very narrow line width (kHz to GHz).') },
        { fact: __alloT('stem.wave.lf_divergence', 'Beam divergence'), detail: __alloT('stem.wave.lf_divergence_detail', 'Laser beams spread VERY slowly. Apollo laser ranging spread <2 km over 384,400 km to Moon.') },
        { fact: __alloT('stem.wave.lf_eyesafety', 'Eye safety'), detail: __alloT('stem.wave.lf_eyesafety_detail', 'Even low-power lasers can blind. Focused on retina, mW = sun-level brightness on photoreceptors.') },
        { fact: __alloT('stem.wave.lf_classes', 'Classes'), detail: __alloT('stem.wave.lf_classes_detail', 'Class 1 (safe), Class 2 (eye blink protects), Class 3R/3B (potentially hazardous), Class 4 (skin burns + fire risk).') }
      ];

      var FIBER_OPTICS = [
        { topic: __alloT('stem.wave.fo_howwork', 'How they work'), detail: __alloT('stem.wave.fo_howwork_detail', 'Total internal reflection traps light in core (higher n) surrounded by cladding (lower n). Light bounces along the fiber.') },
        { topic: __alloT('stem.wave.fo_smf', 'Single-mode fiber (SMF)'), detail: __alloT('stem.wave.fo_smf_detail', 'Core ~9 μm. Only one mode propagates. Long distances (>100 km). Used in telecom backbones.') },
        { topic: __alloT('stem.wave.fo_mmf', 'Multi-mode fiber (MMF)'), detail: __alloT('stem.wave.fo_mmf_detail', 'Core ~50-62.5 μm. Many modes — limits bandwidth-distance product. Short runs (<2 km).') },
        { topic: __alloT('stem.wave.fo_attenuation', 'Attenuation'), detail: __alloT('stem.wave.fo_attenuation_detail', 'Modern fibers: ~0.2 dB/km at 1550 nm. Signal halves every ~15 km without amplification.') },
        { topic: __alloT('stem.wave.fo_dispersion', 'Dispersion'), detail: __alloT('stem.wave.fo_dispersion_detail', 'Different wavelengths or modes travel at slightly different speeds → pulse spreading. Limits data rate.') },
        { topic: __alloT('stem.wave.fo_edfa', 'EDFA (erbium-doped fiber amp)'), detail: __alloT('stem.wave.fo_edfa_detail', 'Amplifies optical signal directly without electrical conversion. Revolutionized long-haul fiber.') },
        { topic: __alloT('stem.wave.fo_wdm', 'WDM (wavelength division multiplexing)'), detail: __alloT('stem.wave.fo_wdm_detail', 'Multiple wavelengths on one fiber. DWDM can fit 100+ channels — Tb/s per fiber.') },
        { topic: __alloT('stem.wave.fo_bdp', 'Bandwidth-distance product'), detail: __alloT('stem.wave.fo_bdp_detail', 'Single-mode fiber: petabit-per-second times km. Vastly more than copper.') },
        { topic: __alloT('stem.wave.fo_backbones', 'Real-world: internet backbones'), detail: __alloT('stem.wave.fo_backbones_detail', '99% of intercontinental data traffic goes over fiber-optic submarine cables.') },
        { topic: __alloT('stem.wave.fo_endoscopes', 'Real-world: medical endoscopes'), detail: __alloT('stem.wave.fo_endoscopes_detail', 'Coherent fiber bundles transmit images. Used to inspect inside body.') },
        { topic: __alloT('stem.wave.fo_sensors', 'Real-world: sensors'), detail: __alloT('stem.wave.fo_sensors_detail', 'Fiber Bragg gratings detect strain, temperature. Used in bridges, oil wells, aerospace.') }
      ];

      var COMM_PROTOCOLS = [
        { name: 'Wi-Fi 6 (802.11ax)', band: '2.4 + 5 + 6 GHz', notes: __alloT('stem.wave.cp_wifi6_notes', 'Up to ~10 Gbps. OFDMA for many simultaneous users.') },
        { name: 'Wi-Fi 7 (802.11be)', band: '2.4 + 5 + 6 GHz', notes: __alloT('stem.wave.cp_wifi7_notes', 'Up to ~46 Gbps theoretical. Wider channels (320 MHz).') },
        { name: __alloT('stem.wave.cp_bt_classic', 'Bluetooth Classic'), band: '2.4 GHz', notes: __alloT('stem.wave.cp_bt_classic_notes', '~1-3 Mbps. Pairing for headphones, controllers.') },
        { name: __alloT('stem.wave.cp_bt_le', 'Bluetooth LE (low energy)'), band: '2.4 GHz', notes: __alloT('stem.wave.cp_bt_le_notes', '~1-2 Mbps. Beacons, sensors, wearables. Years of coin-cell battery life.') },
        { name: 'Zigbee', band: '2.4 GHz (mostly)', notes: __alloT('stem.wave.cp_zigbee_notes', '~250 kbps. Mesh networking. Smart-home devices.') },
        { name: '4G LTE', band: '600 MHz - 2.6 GHz', notes: __alloT('stem.wave.cp_4g_notes', '~50-150 Mbps typical.') },
        { name: '5G (sub-6 GHz)', band: '600 MHz - 6 GHz', notes: __alloT('stem.wave.cp_5g_sub6_notes', '~100 Mbps - 1 Gbps. Wider coverage than mmWave.') },
        { name: '5G (mmWave)', band: '24-100 GHz', notes: __alloT('stem.wave.cp_5g_mmwave_notes', 'Multi-Gbps in clear LOS. Heavily blocked by walls, body, rain.') },
        { name: 'NFC', band: '13.56 MHz', notes: __alloT('stem.wave.cp_nfc_notes', 'cm range. Contactless payment, pairing.') },
        { name: 'RFID (UHF)', band: '860-960 MHz', notes: __alloT('stem.wave.cp_rfid_notes', 'Inventory, tags. Reads at distance without battery in tag.') },
        { name: __alloT('stem.wave.cp_am', 'AM radio'), band: '535-1605 kHz', notes: __alloT('stem.wave.cp_am_notes', 'Amplitude-modulated. Long range, low fidelity. Susceptible to noise.') },
        { name: __alloT('stem.wave.cp_fm', 'FM radio'), band: '88-108 MHz', notes: __alloT('stem.wave.cp_fm_notes', 'Frequency-modulated. Better noise immunity than AM, higher fidelity.') },
        { name: 'GPS L1', band: '1.575 GHz', notes: __alloT('stem.wave.cp_gps_notes', 'Civilian band. ~30 satellites.') },
        { name: __alloT('stem.wave.cp_sattv', 'Satellite TV (Ku band)'), band: '12-14 GHz', notes: __alloT('stem.wave.cp_sattv_notes', 'Most consumer satellite TV.') },
        { name: __alloT('stem.wave.cp_microwave', 'Microwave oven'), band: '2.45 GHz', notes: __alloT('stem.wave.cp_microwave_notes', 'Same band as Wi-Fi! Why microwaves can disrupt Wi-Fi when door seal is bad.') }
      ];

      var MUSIC_ACOUSTICS = [
        { topic: __alloT('stem.wave.ma_pitch', 'Pitch'), detail: __alloT('stem.wave.ma_pitch_detail', 'Perception of frequency. A4 = 440 Hz standard concert pitch (some orchestras use 442 Hz).') },
        { topic: __alloT('stem.wave.ma_octave', 'Octave'), detail: __alloT('stem.wave.ma_octave_detail', 'Doubling of frequency. A4 = 440 Hz, A5 = 880 Hz, A3 = 220 Hz.') },
        { topic: __alloT('stem.wave.ma_equaltemp', 'Equal temperament'), detail: __alloT('stem.wave.ma_equaltemp_detail', '12 semitones per octave, each ratio 2^(1/12) ≈ 1.05946. Allows transposing.') },
        { topic: __alloT('stem.wave.ma_justint', 'Just intonation'), detail: __alloT('stem.wave.ma_justint_detail', 'Uses simple integer ratios (3:2 = perfect fifth, 5:4 = major third). Sounds more "pure" but not transposable.') },
        { topic: __alloT('stem.wave.ma_harmonics', 'Harmonics'), detail: __alloT('stem.wave.ma_harmonics_detail', 'Integer multiples of fundamental. Determine timbre. Different instruments emphasize different harmonics.') },
        { topic: __alloT('stem.wave.ma_formants', 'Formants'), detail: __alloT('stem.wave.ma_formants_detail', 'Resonant peaks in vocal/instrument spectrum. Distinguish vowels + instruments.') },
        { topic: __alloT('stem.wave.ma_beats', 'Beats'), detail: __alloT('stem.wave.ma_beats_detail', 'Two close frequencies interfere → audible amplitude oscillation at difference frequency. Used to tune instruments.') },
        { topic: __alloT('stem.wave.ma_resonance', 'Resonance (instruments)'), detail: __alloT('stem.wave.ma_resonance_detail', 'Air column or string vibrates at characteristic frequencies. Length + tension determine pitch.') },
        { topic: __alloT('stem.wave.ma_string', 'String frequency'), detail: __alloT('stem.wave.ma_string_detail', 'f = (1/2L)·√(T/μ). Higher tension or shorter string → higher pitch.') },
        { topic: __alloT('stem.wave.ma_openpipe', 'Open pipe resonance'), detail: __alloT('stem.wave.ma_openpipe_detail', 'f = nv/(2L). Both ends open. Even harmonics present (flute).') },
        { topic: __alloT('stem.wave.ma_closedpipe', 'Closed pipe resonance'), detail: __alloT('stem.wave.ma_closedpipe_detail', 'f = (2n-1)v/(4L). One end closed. Only odd harmonics (clarinet).') },
        { topic: __alloT('stem.wave.ma_stereo', 'Stereo + spatial audio'), detail: __alloT('stem.wave.ma_stereo_detail', 'Two ears → interaural time + level differences locate sound. Spatial audio reproduces this with head tracking.') },
        { topic: __alloT('stem.wave.ma_reverb', 'Reverb time (RT60)'), detail: __alloT('stem.wave.ma_reverb_detail', 'Time for sound to decay by 60 dB. Concert hall ~1.5-2 s; cathedral ~5-10 s; recording studio <0.3 s.') },
        { topic: __alloT('stem.wave.ma_decibels', 'Decibels (sound)'), detail: __alloT('stem.wave.ma_decibels_detail', '0 dB SPL = threshold of hearing. Conversation ~60 dB. Rock concert ~110 dB. Pain ~130 dB. Hearing damage >85 dB long exposure.') }
      ];

      var EAR_PARTS = [
        { part: __alloT('stem.wave.ear_pinna', 'Pinna (outer ear)'), function: __alloT('stem.wave.ear_pinna_fn', 'Funnels sound to canal; helps localize sound'), notes: __alloT('stem.wave.ear_pinna_notes', 'Shape filters frequencies → vertical localization cues.') },
        { part: __alloT('stem.wave.ear_canal', 'Ear canal'), function: __alloT('stem.wave.ear_canal_fn', 'Channels sound to eardrum'), notes: __alloT('stem.wave.ear_canal_notes', 'Resonates at ~3 kHz → enhanced sensitivity to speech frequencies.') },
        { part: __alloT('stem.wave.ear_eardrum', 'Eardrum (tympanic membrane)'), function: __alloT('stem.wave.ear_eardrum_fn', 'Vibrates with sound waves'), notes: __alloT('stem.wave.ear_eardrum_notes', '~0.1 mm thick. Connected to ossicles.') },
        { part: __alloT('stem.wave.ear_ossicles', 'Ossicles (hammer, anvil, stirrup)'), function: __alloT('stem.wave.ear_ossicles_fn', 'Amplify + transmit vibrations to cochlea'), notes: __alloT('stem.wave.ear_ossicles_notes', 'Smallest bones in body. Lever action + area mismatch amplifies ~20×.') },
        { part: __alloT('stem.wave.ear_oval', 'Oval window'), function: __alloT('stem.wave.ear_oval_fn', 'Membrane connecting middle to inner ear'), notes: __alloT('stem.wave.ear_oval_notes', 'Stirrup pushes against it, transferring vibration to cochlear fluid.') },
        { part: __alloT('stem.wave.ear_cochlea', 'Cochlea'), function: __alloT('stem.wave.ear_cochlea_fn', 'Frequency analysis — different positions respond to different frequencies'), notes: __alloT('stem.wave.ear_cochlea_notes', 'Snail-shaped. ~3.5 turns. ~16,000 hair cells per ear.') },
        { part: __alloT('stem.wave.ear_basilar', 'Basilar membrane'), function: __alloT('stem.wave.ear_basilar_fn', 'Mechanical frequency analysis'), notes: __alloT('stem.wave.ear_basilar_notes', 'Stiff near oval window (high freq), floppy at apex (low freq).') },
        { part: __alloT('stem.wave.ear_haircells', 'Hair cells'), function: __alloT('stem.wave.ear_haircells_fn', 'Convert mechanical vibration to neural signal'), notes: __alloT('stem.wave.ear_haircells_notes', 'Outer hair cells amplify; inner hair cells transmit. Damage = permanent hearing loss.') },
        { part: __alloT('stem.wave.ear_nerve', 'Auditory nerve'), function: __alloT('stem.wave.ear_nerve_fn', 'Carries signal to brain'), notes: __alloT('stem.wave.ear_nerve_notes', 'About 30,000 fibers per ear.') },
        { part: __alloT('stem.wave.ear_semicircular', 'Semicircular canals'), function: __alloT('stem.wave.ear_semicircular_fn', 'Balance + head rotation'), notes: __alloT('stem.wave.ear_semicircular_notes', '3 fluid-filled rings in 3 perpendicular planes. Detect angular acceleration.') },
        { part: __alloT('stem.wave.ear_otolith', 'Otolith organs'), function: __alloT('stem.wave.ear_otolith_fn', 'Detect linear acceleration + gravity'), notes: __alloT('stem.wave.ear_otolith_notes', 'Crystals on hair cells move with motion. Source of "elevator stomach" feeling.') }
      ];

      var MEDICAL_IMAGING = [
        { method: 'X-ray', radiation: __alloT('stem.wave.mi_xray_rad', 'X-rays'), use: __alloT('stem.wave.mi_xray_use', 'Bones, dense tissue. Quick, cheap, ubiquitous.'), notes: __alloT('stem.wave.mi_xray_notes', 'Ionizing radiation. Bone absorbs more than soft tissue → contrast.') },
        { method: __alloT('stem.wave.mi_ct', 'CT scan'), radiation: __alloT('stem.wave.mi_ct_rad', 'X-rays (many angles)'), use: __alloT('stem.wave.mi_ct_use', '3D reconstruction. Trauma, tumors, internal injury.'), notes: __alloT('stem.wave.mi_ct_notes', 'Higher dose than single X-ray. Excellent anatomical detail.') },
        { method: 'MRI', radiation: __alloT('stem.wave.mi_mri_rad', 'Radio (in strong B field)'), use: __alloT('stem.wave.mi_mri_use', 'Soft tissue, brain, joints, tumors.'), notes: __alloT('stem.wave.mi_mri_notes', 'No ionizing radiation. Long scans. T1 vs T2 highlights different features.') },
        { method: 'fMRI', radiation: __alloT('stem.wave.mi_mri_rad', 'Radio (in strong B field)'), use: __alloT('stem.wave.mi_fmri_use', 'Brain activity via blood oxygenation'), notes: __alloT('stem.wave.mi_fmri_notes', 'BOLD signal. Indirect — neural activity → blood flow change → MRI signal.') },
        { method: __alloT('stem.wave.mi_ultrasound', 'Ultrasound'), radiation: __alloT('stem.wave.mi_ultrasound_rad', 'High-frequency sound'), use: __alloT('stem.wave.mi_ultrasound_use', 'Pregnancy, heart, abdominal organs'), notes: __alloT('stem.wave.mi_ultrasound_notes', 'No radiation. Real-time. Doppler mode shows blood flow.') },
        { method: __alloT('stem.wave.mi_pet', 'PET scan'), radiation: __alloT('stem.wave.mi_pet_rad', 'Positron emission (radiotracer)'), use: __alloT('stem.wave.mi_pet_use', 'Metabolic activity, cancer staging, brain disease'), notes: __alloT('stem.wave.mi_pet_notes', 'Radioactive glucose (FDG) concentrates in active tissue.') },
        { method: 'SPECT', radiation: __alloT('stem.wave.mi_spect_rad', 'Gamma (radiotracer)'), use: __alloT('stem.wave.mi_spect_use', 'Blood flow, heart, brain'), notes: __alloT('stem.wave.mi_spect_notes', 'Like PET but uses single-photon emitters; lower resolution but cheaper.') },
        { method: __alloT('stem.wave.mi_mammography', 'Mammography'), radiation: __alloT('stem.wave.mi_mammography_rad', 'Low-energy X-rays'), use: __alloT('stem.wave.mi_mammography_use', 'Breast tissue screening'), notes: __alloT('stem.wave.mi_mammography_notes', 'Compression spreads tissue for clearer image.') },
        { method: __alloT('stem.wave.mi_dexa', 'Bone densitometry (DEXA)'), radiation: __alloT('stem.wave.mi_dexa_rad', 'Dual-energy X-ray'), use: __alloT('stem.wave.mi_dexa_use', 'Bone density (osteoporosis)'), notes: __alloT('stem.wave.mi_dexa_notes', 'Two energies subtract to isolate bone density.') },
        { method: __alloT('stem.wave.mi_oct', 'OCT (optical coherence tomography)'), radiation: __alloT('stem.wave.mi_oct_rad', 'Near-infrared light'), use: __alloT('stem.wave.mi_oct_use', 'Retina + cornea imaging'), notes: __alloT('stem.wave.mi_oct_notes', 'Like ultrasound but with light. μm resolution. No radiation.') }
      ];

      var SATELLITE_FACTS = [
        { topic: __alloT('stem.wave.sat_altitude', 'GPS orbital altitude'), detail: __alloT('stem.wave.sat_altitude_detail', '~20,200 km. Medium Earth orbit. Period ~12 hours (2 orbits per sidereal day).') },
        { topic: __alloT('stem.wave.sat_constellation', 'GPS constellation'), detail: __alloT('stem.wave.sat_constellation_detail', '24+ satellites; need ≥4 in view for 3D fix + time.') },
        { topic: __alloT('stem.wave.sat_receiver', 'Receiver position'), detail: __alloT('stem.wave.sat_receiver_detail', 'Triangulation by time-of-flight from satellites to receiver. Needs 4 satellites (3 for position + 1 for clock sync).') },
        { topic: __alloT('stem.wave.sat_accuracy', 'Accuracy'), detail: __alloT('stem.wave.sat_accuracy_detail', 'Civilian GPS: ~3-10 m. With augmentation (DGPS, RTK): cm. Selective Availability ended in 2000.') },
        { topic: 'Galileo', detail: __alloT('stem.wave.sat_galileo_detail', 'EU GNSS. ~30 satellites. Open service ~1 m accuracy.') },
        { topic: 'GLONASS', detail: __alloT('stem.wave.sat_glonass_detail', 'Russian GNSS. ~24 satellites.') },
        { topic: 'BeiDou', detail: __alloT('stem.wave.sat_beidou_detail', 'Chinese GNSS. 35 satellites. Global service since 2020.') },
        { topic: __alloT('stem.wave.sat_geo', 'Geostationary orbit (GEO)'), detail: __alloT('stem.wave.sat_geo_detail', '35,786 km altitude. Period = 24 hours → fixed over equator point. Used for TV, weather.') },
        { topic: __alloT('stem.wave.sat_leo', 'Low Earth orbit (LEO)'), detail: __alloT('stem.wave.sat_leo_detail', '200-2000 km. Period ~90 min. ISS at ~400 km. Starlink at ~550 km. Lower latency.') },
        { topic: __alloT('stem.wave.sat_clocks', 'Atomic clocks on GPS'), detail: __alloT('stem.wave.sat_clocks_detail', 'Cesium + rubidium clocks. Stability ~10⁻¹³. Even small relativistic effects matter — must correct for both special + general relativity.') },
        { topic: __alloT('stem.wave.sat_lighttime', 'Light travel time'), detail: __alloT('stem.wave.sat_lighttime_detail', 'GPS satellite → receiver: ~70 ms. Geo satellite → receiver: ~250 ms (perceptible delay in geo satellite calls).') }
      ];

      var GW_FACTS = [
        { topic: __alloT('stem.wave.gw_whatare', 'What they are'), detail: __alloT('stem.wave.gw_whatare_detail', 'Ripples in spacetime predicted by Einstein (1916). Travel at speed of light.') },
        { topic: __alloT('stem.wave.gw_sources', 'Sources'), detail: __alloT('stem.wave.gw_sources_detail', 'Massive accelerating objects: merging black holes + neutron stars, supernovae, pulsars, Big Bang.') },
        { topic: 'LIGO', detail: __alloT('stem.wave.gw_ligo_detail', 'Laser Interferometer Gravitational-wave Observatory. Two L-shaped detectors (Hanford WA, Livingston LA), 4 km arms.') },
        { topic: __alloT('stem.wave.gw_firstdetect', 'First detection'), detail: __alloT('stem.wave.gw_firstdetect_detail', '14 September 2015. Two ~30 M☉ black holes merged ~1.3 billion years ago. Signal lasted ~0.2 sec. Nobel Prize 2017.') },
        { topic: __alloT('stem.wave.gw_sensitivity', 'Sensitivity'), detail: __alloT('stem.wave.gw_sensitivity_detail', 'LIGO detects length changes ~10⁻¹⁸ m — 1/10000 the size of a proton.') },
        { topic: __alloT('stem.wave.gw_multimessenger', 'Multi-messenger astronomy'), detail: __alloT('stem.wave.gw_multimessenger_detail', '17 August 2017: GW + gamma rays + visible light from neutron-star merger (GW170817). Confirmed kilonovae produce heavy elements.') },
        { topic: 'Virgo', detail: __alloT('stem.wave.gw_virgo_detail', 'European GW detector in Italy. 3 km arms.') },
        { topic: 'KAGRA', detail: __alloT('stem.wave.gw_kagra_detail', 'Japanese GW detector. Underground, cryogenic mirrors.') },
        { topic: __alloT('stem.wave.gw_lisa', 'LISA (planned)'), detail: __alloT('stem.wave.gw_lisa_detail', 'Space-based detector. 3 satellites in 2.5 million km triangle. Launch ~2035. Sensitive to lower frequencies (supermassive black holes).') },
        { topic: __alloT('stem.wave.gw_pta', 'Pulsar timing arrays'), detail: __alloT('stem.wave.gw_pta_detail', 'Use millisecond pulsars as natural clocks. Detect very low-frequency GWs from supermassive black hole binaries. NANOGrav announced detection 2023.') }
      ];

      var WAVE_UNITS = [
        { quantity: __alloT('stem.wave.wu_frequency', 'Frequency'), symbol: 'f or ν', unit: __alloT('stem.wave.wu_frequency_unit', 'hertz (Hz)'), notes: __alloT('stem.wave.wu_frequency_notes', 'Cycles per second. kHz, MHz, GHz, THz common in modern tech.') },
        { quantity: __alloT('stem.wave.wu_period', 'Period'), symbol: 'T', unit: __alloT('stem.wave.wu_period_unit', 'second (s)'), notes: __alloT('stem.wave.wu_period_notes', 'Time per cycle. T = 1/f. Heart: ~1 s; mains: 16.7 ms; visible light: ~2 fs.') },
        { quantity: __alloT('stem.wave.wu_wavelength', 'Wavelength'), symbol: 'λ', unit: __alloT('stem.wave.wu_wavelength_unit', 'meter (m)'), notes: __alloT('stem.wave.wu_wavelength_notes', 'Distance per cycle. Sub-mm (UHF radio) to thousands of km (extremely low freq).') },
        { quantity: __alloT('stem.wave.wu_wavenumber', 'Wavenumber'), symbol: 'k', unit: 'rad/m', notes: __alloT('stem.wave.wu_wavenumber_notes', 'k = 2π/λ. Used in waveform math.') },
        { quantity: __alloT('stem.wave.wu_angfreq', 'Angular frequency'), symbol: 'ω', unit: 'rad/s', notes: __alloT('stem.wave.wu_angfreq_notes', 'ω = 2πf. Common in oscillation + wave equations.') },
        { quantity: __alloT('stem.wave.wu_speed', 'Speed'), symbol: 'v or c', unit: 'm/s', notes: __alloT('stem.wave.wu_speed_notes', 'v = fλ. Light in vacuum: c = 299,792,458 m/s (exact).') },
        { quantity: __alloT('stem.wave.wu_amplitude', 'Amplitude'), symbol: 'A', unit: __alloT('stem.wave.wu_amplitude_unit', 'meters (mech), V/m (EM)'), notes: __alloT('stem.wave.wu_amplitude_notes', 'Maximum displacement from equilibrium.') },
        { quantity: __alloT('stem.wave.wu_intensity', 'Intensity'), symbol: 'I', unit: 'W/m²', notes: __alloT('stem.wave.wu_intensity_notes', 'Power per area. Solar irradiance at Earth: ~1361 W/m².') },
        { quantity: __alloT('stem.wave.wu_spl', 'Sound pressure level (SPL)'), symbol: 'L_p', unit: 'dB', notes: __alloT('stem.wave.wu_spl_notes', '20·log₁₀(p/p_ref). Reference: 20 μPa.') },
        { quantity: __alloT('stem.wave.wu_photon', 'Photon energy'), symbol: 'E', unit: __alloT('stem.wave.wu_photon_unit', 'joule (J) or eV'), notes: __alloT('stem.wave.wu_photon_notes', 'E = hf = hc/λ. Visible photons: ~2 eV.') }
      ];

      var WAVE_CAREERS = [
        { career: __alloT('stem.wave.wc_audio', 'Audio engineer'), use: __alloT('stem.wave.wc_audio_use', 'Mixing music, recording. Understand EQ, reverb, frequency response.') },
        { career: __alloT('stem.wave.wc_acoustic', 'Acoustic consultant'), use: __alloT('stem.wave.wc_acoustic_use', 'Design concert halls, recording studios, noise control for buildings + machinery.') },
        { career: __alloT('stem.wave.wc_audiologist', 'Audiologist'), use: __alloT('stem.wave.wc_audiologist_use', 'Test + treat hearing loss. Fit hearing aids and cochlear implants.') },
        { career: __alloT('stem.wave.wc_slp', 'Speech-language pathologist'), use: __alloT('stem.wave.wc_slp_use', 'Analyze speech sounds (acoustic phonetics). Treat voice + articulation disorders.') },
        { career: __alloT('stem.wave.wc_rf', 'RF engineer'), use: __alloT('stem.wave.wc_rf_use', 'Design antennas, wireless systems, radar.') },
        { career: __alloT('stem.wave.wc_optical', 'Optical engineer'), use: __alloT('stem.wave.wc_optical_use', 'Design cameras, microscopes, telescopes, fiber-optic links.') },
        { career: __alloT('stem.wave.wc_seismologist', 'Seismologist'), use: __alloT('stem.wave.wc_seismologist_use', 'Analyze earthquake waves, locate epicenters, monitor for nuclear tests.') },
        { career: __alloT('stem.wave.wc_oceanographer', 'Oceanographer'), use: __alloT('stem.wave.wc_oceanographer_use', 'Study tides, currents, ocean wave dynamics.') },
        { career: __alloT('stem.wave.wc_meteorologist', 'Meteorologist'), use: __alloT('stem.wave.wc_meteorologist_use', 'Doppler radar analysis. Wave physics in atmosphere (Rossby waves).') },
        { career: __alloT('stem.wave.wc_sonographer', 'Sonographer (medical)'), use: __alloT('stem.wave.wc_sonographer_use', 'Operate ultrasound for diagnostic imaging.') },
        { career: __alloT('stem.wave.wc_astronomer', 'Astronomer'), use: __alloT('stem.wave.wc_astronomer_use', 'Analyze light + radio waves from celestial objects.') },
        { career: __alloT('stem.wave.wc_producer', 'Music producer'), use: __alloT('stem.wave.wc_producer_use', 'Shape recorded sound. Synthesize tones. Mix tracks.') },
        { career: __alloT('stem.wave.wc_lighting', 'Lighting designer'), use: __alloT('stem.wave.wc_lighting_use', 'Theater, film. Color temperature, beam angles, intensity.') },
        { career: __alloT('stem.wave.wc_telecom', 'Telecom engineer'), use: __alloT('stem.wave.wc_telecom_use', 'Cellular networks, fiber backbones, satellite links.') },
        { career: __alloT('stem.wave.wc_radar', 'Radar technician'), use: __alloT('stem.wave.wc_radar_use', 'Maintain + operate weather, air-traffic, military radar.') }
      ];

      function renderColors2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 ' + __alloT('stem.wave.tab_colormodels', 'Color models')),
          React.createElement('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_colors2_intro', 'Different ways to describe color numerically. Each is suited to a specific medium or application.')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⫸ ' + __alloT('stem.wave.tab_lasers', 'Lasers')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_laser_types', 'Common laser types')),
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
          React.createElement('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_laser_physics', 'Laser physics essentials')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '〰 ' + __alloT('stem.wave.tab_fiberoptics', 'Fiber optics')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 ' + __alloT('stem.wave.sec_protocols_title', 'Wireless communication protocols')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_standard', 'Standard'), __alloT('stem.wave.col_freq_band', 'Frequency band'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 ' + __alloT('stem.wave.sec_music_title', 'Music & acoustics')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👂 ' + __alloT('stem.wave.sec_hearing_title', 'The ear & hearing')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏥 ' + __alloT('stem.wave.sec_medical_title', 'Medical imaging (wave-based)')),
          React.createElement('div', { className: 'space-y-2' },
            MEDICAL_IMAGING.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[12px] font-black text-slate-800' }, m.method),
                  React.createElement('span', { className: 'text-[10px] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, m.radiation)
                ),
                React.createElement('div', { className: 'text-[11px] text-slate-700 mb-1' }, React.createElement('strong', null, __alloT('stem.wave.label_use_colon', 'Use: ')), m.use),
                React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderSatellitesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛰 ' + __alloT('stem.wave.sec_satellites_title', 'GPS & satellite communications')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌇ ' + __alloT('stem.wave.tab_gravwaves', 'Gravitational waves')),
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∑ ' + __alloT('stem.wave.sec_units_title', 'Wave units & symbols')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[11px] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_quantity', 'Quantity'), __alloT('stem.wave.col_symbol', 'Symbol'), __alloT('stem.wave.col_unit', 'Unit'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
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
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 ' + __alloT('stem.wave.sec_careers_title', 'Careers using wave science')),
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
