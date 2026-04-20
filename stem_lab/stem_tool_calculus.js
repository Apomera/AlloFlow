window.StemLab = window.StemLab || { registerTool: function(){}, registerModule: function(){} };
(function() {
  'use strict';

  // ── Audio (auto-injected) ──
  var _calcAC = null;
  function getCalcAC() { if (!_calcAC) { try { _calcAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_calcAC && _calcAC.state === "suspended") { try { _calcAC.resume(); } catch(e) {} } return _calcAC; }
  function calcTone(f,d,tp,v) { var ac = getCalcAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCalcClick() { calcTone(600, 0.03, "sine", 0.04); }
  function sfxCalcSuccess() { calcTone(523, 0.08, "sine", 0.07); setTimeout(function() { calcTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { calcTone(784, 0.1, "sine", 0.08); }, 140); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-calculus')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-calculus';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('calculus', {
    icon: '\u222B',
    label: 'Calculus',
    desc: 'Riemann sums, derivatives, and guided discovery missions',
    color: 'red',
    category: 'math',
    questHooks: [
      { id: 'explore_integral', label: 'Explore Riemann sum approximation', icon: '\u222B', check: function(d) { return (d.n || 20) !== 20 || d.mode !== 'left'; }, progress: function(d) { return d.mode && d.mode !== 'left' ? 'Exploring!' : 'Adjust rectangles'; } },
      { id: 'try_all_methods', label: 'Try left, right, midpoint, and trapezoid methods', icon: '\uD83D\uDCCA', check: function(d) { return Object.keys(d.methodsUsed || {}).length >= 4; }, progress: function(d) { return Object.keys(d.methodsUsed || {}).length + '/4 methods'; } },
      { id: 'predict_correctly', label: 'Make a correct prediction in predict mode', icon: '\uD83E\uDDE0', check: function(d) { return d.predictCorrect || false; }, progress: function(d) { return d.predictCorrect ? 'Correct!' : 'Try predicting'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

      return (function() {
        var d = labToolData.calculus || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, { [key]: val }) });
          });
        };

        // ── VISUALIZE: canvas hooks (declared at IIFE top so they fire every render) ──
        var _vizCvRef = React.useRef(null);
        var _vizAnimId = React.useRef(0);
        var _vizTick = React.useRef(0);
        var _vizLiveState = React.useRef({});
        var _vizLoopRunning = React.useRef(false);

        // ── FUNCTION REGISTRY (used by Visualize views — unlocks non-quadratics) ──
        var CALC_FUNCS = {
          'quadratic':  { label: 'x\u00B2 - 2',          f: function(x){ return x*x - 2; },             df: function(x){ return 2*x; } },
          'cubic':      { label: 'x\u00B3 / 3 - x',     f: function(x){ return x*x*x/3 - x; },         df: function(x){ return x*x - 1; } },
          'sin':        { label: 'sin(x)',               f: function(x){ return Math.sin(x); },         df: function(x){ return Math.cos(x); } },
          'exp':        { label: 'e^(x/2)',              f: function(x){ return Math.exp(x/2); },       df: function(x){ return 0.5*Math.exp(x/2); } },
          'bell':       { label: 'e^(-x\u00B2/2)',      f: function(x){ return Math.exp(-x*x/2); },    df: function(x){ return -x*Math.exp(-x*x/2); } },
          'rational':   { label: '1 / (1+x\u00B2)',     f: function(x){ return 1/(1+x*x); },           df: function(x){ return -2*x/Math.pow(1+x*x,2); } }
        };

        // Pipe live state into ref so the RAF loop always reads fresh values
        _vizLiveState.current = {
          tab: d.tab || 'integral',
          vizView: d.vizView || 'zoom',
          vizFn: d.vizFn || 'quadratic',
          vizZoom: d.vizZoom !== undefined ? d.vizZoom : 1,
          vizX0: d.vizX0 !== undefined ? d.vizX0 : 0,
          vizFtcX: d.vizFtcX !== undefined ? d.vizFtcX : -1,
          vizRiemannMode: d.vizRiemannMode || 'midpoint',
          CALC_FUNCS: CALC_FUNCS
        };

        // ── RAF LOOP FOR VISUALIZE CANVAS (attach once, dispatch per view) ──
        React.useEffect(function() {
          if ((d.tab || 'integral') !== 'visualize') return;
          var tries = 0, retryTimer = null;
          function tryInit() {
            var cv = _vizCvRef.current;
            if (!cv) {
              if (tries++ < 12) { retryTimer = setTimeout(tryInit, 50); }
              else { console.warn('[Calculus Viz] canvas ref never attached'); }
              return;
            }
            var c = cv.getContext('2d');
            if (!c) return;
            function resize() {
              var r = cv.getBoundingClientRect();
              var dpr = window.devicePixelRatio || 1;
              cv.width = Math.max(1, Math.floor(r.width * dpr));
              cv.height = Math.max(1, Math.floor(r.height * dpr));
              c.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            resize();
            var resizeObs = null;
            try { resizeObs = new ResizeObserver(resize); resizeObs.observe(cv); } catch(e) {}

            function frame() {
              _vizTick.current++;
              var t = _vizTick.current;
              var ls = _vizLiveState.current;
              if (ls.tab !== 'visualize') { _vizAnimId.current = requestAnimationFrame(frame); return; }
              var r = cv.getBoundingClientRect();
              var W = r.width, H = r.height;
              // Clear
              var bg = c.createLinearGradient(0, 0, 0, H);
              bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b');
              c.fillStyle = bg; c.fillRect(0, 0, W, H);

              var fn = ls.CALC_FUNCS[ls.vizFn] || ls.CALC_FUNCS.quadratic;

              if (ls.vizView === 'zoom')         { drawZoomToLinearity(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'tangent') { drawTangentExplorer(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'ftc')     { drawFTCSweep(c, W, H, fn, ls, t); }
              else { drawComingSoon(c, W, H, ls.vizView); }

              _vizAnimId.current = requestAnimationFrame(frame);
            }
            if (!_vizLoopRunning.current) {
              _vizLoopRunning.current = true;
              _vizAnimId.current = requestAnimationFrame(frame);
            }
            cv._vizCleanup = function() {
              _vizLoopRunning.current = false;
              if (_vizAnimId.current) cancelAnimationFrame(_vizAnimId.current);
              if (resizeObs) { try { resizeObs.disconnect(); } catch(e) {} }
            };
          }
          tryInit();
          return function() {
            if (retryTimer) clearTimeout(retryTimer);
            var cv = _vizCvRef.current;
            if (cv && cv._vizCleanup) cv._vizCleanup();
          };
        }, [d.tab]);

        // ── Keyboard shortcuts Shift+1..6 for viz views ──
        React.useEffect(function() {
          if ((d.tab || 'integral') !== 'visualize') return;
          function onKey(e) {
            if (!e.shiftKey || !/^[1-6]$/.test(e.key)) return;
            var views = ['zoom','tangent','motion','riemann','ftc','slope'];
            e.preventDefault();
            upd('vizView', views[parseInt(e.key, 10) - 1]);
          }
          window.addEventListener('keydown', onKey);
          return function() { window.removeEventListener('keydown', onKey); };
        }, [d.tab]);

        // ── VIZ DRAW FUNCTIONS (scoped inside render — OK because IIFE runs each render) ──
        function drawComingSoon(c, W, H, viewId) {
          c.fillStyle = '#94a3b8'; c.textAlign = 'center';
          c.font = 'bold 16px "Inter", sans-serif';
          c.fillText('\u23F3 View "' + viewId + '" coming soon', W/2, H/2 - 8);
          c.font = '11px "Inter", sans-serif'; c.fillStyle = '#64748b';
          c.fillText('Try Zoom, Tangent, or FTC for now', W/2, H/2 + 12);
        }

        // Helper: plot a function curve onto canvas rect with axis transforms
        function plotCurve(c, fn, xR, yR, Lx, Rx, Ty, By, color, width) {
          c.strokeStyle = color; c.lineWidth = width || 2;
          c.beginPath();
          var N = 200;
          for (var i = 0; i <= N; i++) {
            var x = xR.min + (i / N) * (xR.max - xR.min);
            var y = fn(x);
            var sx = Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            var sy = By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty);
            if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
          }
          c.stroke();
        }
        function drawAxes(c, Lx, Rx, Ty, By, xR, yR, color) {
          color = color || 'rgba(148,163,184,0.35)';
          c.strokeStyle = color; c.lineWidth = 1;
          // x=0 axis
          if (xR.min < 0 && xR.max > 0) {
            var zeroX = Lx + ((0 - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            c.beginPath(); c.moveTo(zeroX, Ty); c.lineTo(zeroX, By); c.stroke();
          }
          // y=0 axis
          if (yR.min < 0 && yR.max > 0) {
            var zeroY = By - ((0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.beginPath(); c.moveTo(Lx, zeroY); c.lineTo(Rx, zeroY); c.stroke();
          }
          // Frame
          c.strokeStyle = 'rgba(148,163,184,0.25)';
          c.strokeRect(Lx, Ty, Rx - Lx, By - Ty);
        }

        // ── VIEW 1: Zoom to Linearity ──
        function drawZoomToLinearity(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDD0D Zoom to Linearity \u2014 "what IS a derivative?"', W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText('As you zoom, ANY smooth curve becomes a straight line. That line\u2019s slope = f\u2032(x\u2080).', W/2, 36);

          var x0 = ls.vizX0;
          // Zoom factor: slow sine ping-pong 1x .. 200x so users see motion even without interacting
          var autoZoom = 1 + 100 * (1 - Math.cos(t / 90)) / 2;
          var zoom = ls.vizZoom && ls.vizZoom > 1 ? ls.vizZoom : autoZoom;
          var halfW_x = 3 / zoom;
          var xR = { min: x0 - halfW_x, max: x0 + halfW_x };

          // Sample to find dynamic y range
          var samples = [];
          for (var si = 0; si <= 40; si++) {
            samples.push(fn(xR.min + (si/40) * (xR.max - xR.min)));
          }
          var yMin = Math.min.apply(null, samples), yMax = Math.max.apply(null, samples);
          var yPad = (yMax - yMin) * 0.25 + 0.05;
          var yR = { min: yMin - yPad, max: yMax + yPad };

          // Plot area
          var Lx = 60, Rx = W - 20, Ty = 56, By = H - 60;

          drawAxes(c, Lx, Rx, Ty, By, xR, yR);

          // The curve
          plotCurve(c, fn.f, xR, yR, Lx, Rx, Ty, By, '#f87171', 2.5);

          // The tangent line at x0 (always drawn)
          var slope = fn.df(x0);
          var y0 = fn.f(x0);
          var tanFn = function(x) { return slope * (x - x0) + y0; };
          plotCurve(c, tanFn, xR, yR, Lx, Rx, Ty, By, 'rgba(52,211,153,0.85)', 2);

          // Marker at (x0, f(x0))
          var mx = Lx + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
          var my = By - ((y0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.5; c.stroke();

          // Zoom meter
          var zTxt = zoom.toFixed(0) + '\u00D7 zoom';
          c.fillStyle = 'rgba(15,23,42,0.85)';
          c.fillRect(Lx + 10, Ty + 10, 120, 40);
          c.strokeStyle = 'rgba(59,130,246,0.5)'; c.strokeRect(Lx + 10, Ty + 10, 120, 40);
          c.fillStyle = '#60a5fa'; c.textAlign = 'left';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText(zTxt, Lx + 18, Ty + 28);
          c.font = 'bold 10px "Inter", sans-serif'; c.fillStyle = '#34d399';
          c.fillText('slope \u2192 ' + slope.toFixed(4), Lx + 18, Ty + 44);

          // Small legend
          c.textAlign = 'right';
          c.fillStyle = '#f87171'; c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('\u2014 f(x)', Rx - 10, Ty + 20);
          c.fillStyle = '#34d399';
          c.fillText('\u2014 tangent at x\u2080', Rx - 10, Ty + 36);

          // x-axis scrubber at bottom
          var scrubY = H - 34;
          c.fillStyle = 'rgba(148,163,184,0.2)';
          c.fillRect(Lx, scrubY, Rx - Lx, 18);
          c.strokeStyle = 'rgba(148,163,184,0.4)';
          c.strokeRect(Lx, scrubY, Rx - Lx, 18);
          // Map x0 across a fixed -3..3 global range for scrubber
          var gx = Lx + ((x0 + 3) / 6) * (Rx - Lx);
          c.fillStyle = '#fde047';
          c.fillRect(gx - 3, scrubY - 2, 6, 22);
          c.fillStyle = '#94a3b8'; c.textAlign = 'center';
          c.font = '9px "Inter", sans-serif';
          c.fillText('drag x\u2080 below: x\u2080 = ' + x0.toFixed(2), W/2, H - 8);
        }

        // ── VIEW 2: Tangent Explorer (curve + tangent + f'(x) trace) ──
        function drawTangentExplorer(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDCCD Tangent Explorer \u2014 the derivative is itself a function', W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText('Left: f(x) with live tangent. Right: f\u2032(x) traced as you move x\u2080.', W/2, 36);

          // Two panels side by side
          var gap = 12;
          var panelW = (W - gap - 40) / 2;
          var Lx1 = 20, Rx1 = Lx1 + panelW;
          var Lx2 = Rx1 + gap, Rx2 = Lx2 + panelW;
          var Ty = 56, By = H - 30;

          var xR = { min: -3, max: 3 };

          // Sample y ranges dynamically
          var fs = [], dfs = [];
          for (var si = 0; si <= 60; si++) {
            var x = xR.min + (si/60) * (xR.max - xR.min);
            fs.push(fn.f(x));
            dfs.push(fn.df(x));
          }
          var yMin = Math.min.apply(null, fs), yMax = Math.max.apply(null, fs);
          var dyMin = Math.min.apply(null, dfs), dyMax = Math.max.apply(null, dfs);
          var yR = { min: yMin - 0.5, max: yMax + 0.5 };
          var dyR = { min: dyMin - 0.5, max: dyMax + 0.5 };

          // Left panel: f(x)
          drawAxes(c, Lx1, Rx1, Ty, By, xR, yR);
          plotCurve(c, fn.f, xR, yR, Lx1, Rx1, Ty, By, '#f87171', 2);

          // Auto-sweep x0 (smooth ping-pong) if user hasn't interacted
          var x0 = (ls.vizX0 !== undefined && ls.vizX0 !== 0) ? ls.vizX0 : Math.sin(t / 60) * 2.5;
          var slope = fn.df(x0);
          var y0 = fn.f(x0);

          // Tangent at x0
          var tanFn = function(x) { return slope * (x - x0) + y0; };
          plotCurve(c, tanFn, xR, yR, Lx1, Rx1, Ty, By, 'rgba(52,211,153,0.85)', 2);

          // Marker
          var mx = Lx1 + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
          var my = By - ((y0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.2; c.stroke();

          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('f(x)', Lx1 + 8, Ty + 16);

          // Right panel: f'(x) traced
          drawAxes(c, Lx2, Rx2, Ty, By, xR, dyR);
          plotCurve(c, fn.df, xR, dyR, Lx2, Rx2, Ty, By, 'rgba(52,211,153,0.6)', 1.5);

          // A DOT on f'(x) at x0 — this is the "slope on the right matches tangent on the left"
          var dmx = Lx2 + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
          var dmy = By - ((slope - dyR.min) / (dyR.max - dyR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(dmx, dmy, 6, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.5; c.stroke();

          // Arrow from left marker up to right dot — visual "they're the same"
          c.strokeStyle = 'rgba(253,224,71,0.35)'; c.lineWidth = 1; c.setLineDash([4, 4]);
          c.beginPath(); c.moveTo(mx, my); c.lineTo(dmx, dmy); c.stroke();
          c.setLineDash([]);

          c.fillStyle = '#34d399'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText("f\u2032(x)", Lx2 + 8, Ty + 16);

          // Bottom readout
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('x\u2080 = ' + x0.toFixed(2) + '   \u2192   f(x\u2080) = ' + y0.toFixed(2) + '   \u2022   f\u2032(x\u2080) = slope = ' + slope.toFixed(2), W/2, H - 12);
        }

        // ── VIEW 5: FTC Sweep (THE payoff) ──
        function drawFTCSweep(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\u2B50 Fundamental Theorem of Calculus \u2014 area\u2019s slope IS the curve', W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText("Left: shaded area A(x) under f. Right: plot of A(x). Its slope at any x equals f(x).", W/2, 36);

          var gap = 12;
          var panelW = (W - gap - 40) / 2;
          var Lx1 = 20, Rx1 = Lx1 + panelW;
          var Lx2 = Rx1 + gap, Rx2 = Lx2 + panelW;
          var Ty = 56, By = H - 30;

          var xR = { min: -3, max: 3 };
          // Sample f and A
          var N = 240;
          var dxS = (xR.max - xR.min) / N;
          var fVals = new Array(N+1), AVals = new Array(N+1);
          var acc = 0;
          for (var i = 0; i <= N; i++) {
            var xi = xR.min + i * dxS;
            fVals[i] = fn.f(xi);
            if (i > 0) acc += (fVals[i-1] + fVals[i]) / 2 * dxS; // trapezoidal
            AVals[i] = acc;
          }
          var fMin = Math.min.apply(null, fVals), fMax = Math.max.apply(null, fVals);
          var aMin = Math.min.apply(null, AVals), aMax = Math.max.apply(null, AVals);
          var yR = { min: Math.min(fMin - 0.3, 0), max: fMax + 0.3 };
          var aR = { min: aMin - 0.3, max: aMax + 0.3 };

          drawAxes(c, Lx1, Rx1, Ty, By, xR, yR);
          drawAxes(c, Lx2, Rx2, Ty, By, xR, aR);

          // Auto-sweep the x pointer if user hasn't touched it
          var sweepX = (ls.vizFtcX !== undefined && ls.vizFtcX > xR.min + 0.01 && ls.vizFtcX < xR.max - 0.01)
            ? ls.vizFtcX
            : (xR.min + ((Math.sin(t/80) + 1) / 2) * (xR.max - xR.min));

          // Shade area [xR.min .. sweepX] under f on left panel
          var zeroY_L = By - ((0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = 'rgba(59,130,246,0.28)';
          c.beginPath();
          var startSx = Lx1;
          c.moveTo(startSx, zeroY_L);
          for (var k = 0; k <= N; k++) {
            var xi2 = xR.min + k * dxS;
            if (xi2 > sweepX) break;
            var sx = Lx1 + ((xi2 - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
            var sy = By - ((fVals[k] - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.lineTo(sx, sy);
          }
          // Close bottom
          var endSx = Lx1 + ((sweepX - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
          c.lineTo(endSx, zeroY_L);
          c.closePath();
          c.fill();

          // Curve on top of shading
          plotCurve(c, fn.f, xR, yR, Lx1, Rx1, Ty, By, '#f87171', 2.2);

          // Sweep marker on left
          c.strokeStyle = '#fde047'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(endSx, Ty); c.lineTo(endSx, By); c.stroke();
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(endSx, zeroY_L, 4, 0, Math.PI * 2); c.fill();

          // Right panel: A(x) curve drawn only up to sweepX
          // First draw full ghost curve
          plotCurve(c, function(x){
            var idx = Math.round((x - xR.min) / dxS);
            if (idx < 0) idx = 0; if (idx > N) idx = N;
            return AVals[idx];
          }, xR, aR, Lx2, Rx2, Ty, By, 'rgba(59,130,246,0.18)', 1.5);
          // Then draw the solid portion
          c.strokeStyle = '#60a5fa'; c.lineWidth = 2.5;
          c.beginPath();
          var drawn = 0;
          for (var j = 0; j <= N; j++) {
            var xj = xR.min + j * dxS;
            if (xj > sweepX) break;
            var sx2 = Lx2 + ((xj - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
            var sy2 = By - ((AVals[j] - aR.min) / (aR.max - aR.min)) * (By - Ty);
            if (drawn === 0) c.moveTo(sx2, sy2); else c.lineTo(sx2, sy2);
            drawn++;
          }
          c.stroke();

          // Tangent to A(x) at sweepX — slope should equal f(sweepX)
          var idxS = Math.max(0, Math.min(N, Math.round((sweepX - xR.min) / dxS)));
          var fAtS = fVals[idxS], aAtS = AVals[idxS];
          var Lx2Offset = Lx2;
          var sxAtS = Lx2Offset + ((sweepX - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
          var syAtS = By - ((aAtS - aR.min) / (aR.max - aR.min)) * (By - Ty);
          // Draw the tangent
          var tanA = function(x) { return fAtS * (x - sweepX) + aAtS; };
          plotCurve(c, tanA, xR, aR, Lx2, Rx2, Ty, By, 'rgba(52,211,153,0.85)', 2);
          // Sweep dot on right
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(sxAtS, syAtS, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.2; c.stroke();

          // Panel labels
          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('f(x) \u2022 shaded area = A(x)', Lx1 + 8, Ty + 16);
          c.fillStyle = '#60a5fa';
          c.fillText('A(x) = \u222B f(t) dt', Lx2 + 8, Ty + 16);
          c.fillStyle = '#34d399'; c.font = 'bold 10px "Inter", sans-serif';
          c.fillText("slope of tangent = " + fAtS.toFixed(2), Lx2 + 8, Ty + 30);

          // Bottom big insight
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText("x = " + sweepX.toFixed(2) + "   \u2022   A(x) = " + aAtS.toFixed(3) + "   \u2022   A\u2032(x) = " + fAtS.toFixed(3) + "   \u2190  same as f(x)!", W/2, H - 10);
        }

        // ── FUNCTION EVALUATION ─────────────────────────────────────────
        var fa = d.a !== undefined ? d.a : 1;
        var fb = d.b !== undefined ? d.b : 0;
        var fc = d.c !== undefined ? d.c : 0;

        var evalF = function(x) { return fa * x * x + fb * x + fc; };
        var evalDeriv = function(x) { return 2 * fa * x + fb; };
        var evalAntiAt = function(a, b, c, x) { return (a / 3) * x * x * x + (b / 2) * x * x + c * x; };
        var exact = evalAntiAt(fa, fb, fc, d.xMax) - evalAntiAt(fa, fb, fc, d.xMin);

        // ── SYMBOLIC STRINGS ────────────────────────────────────────────
        var fmtTerm = function(coeff, power, isFirst) {
          if (coeff === 0) return '';
          var sign = coeff > 0 ? (isFirst ? '' : '+') : '\u2212';
          var absC = Math.abs(coeff);
          var cStr = (absC === 1 && power > 0) ? '' : String(absC);
          if (power === 0) return sign + absC;
          if (power === 1) return sign + cStr + 'x';
          return sign + cStr + 'x\u00B2';
        };
        var buildFStr = function(a, b, c) {
          var parts = [fmtTerm(a, 2, true), fmtTerm(b, 1, a === 0), fmtTerm(c, 0, a === 0 && b === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };
        var buildDerivStr = function(a, b) {
          var parts = [fmtTerm(2 * a, 1, true), fmtTerm(b, 0, 2 * a === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };
        var fStr = 'f(x) = ' + buildFStr(fa, fb, fc);
        var derivStr = "f\u2032(x) = " + buildDerivStr(fa, fb);

        // ── SVG LAYOUT ──────────────────────────────────────────────────
        var W = 440, H = 300, pad = 40;
        var xMin = d.xMin !== undefined ? d.xMin : 0;
        var xMax2 = d.xMax !== undefined ? d.xMax : 3;
        var nRects = d.n || 20;
        var mode = d.mode || 'left';
        var tab = d.tab || 'integral';
        var x0 = d.x0 !== undefined ? d.x0 : Math.round((xMin + xMax2) / 2 * 10) / 10;

        var sampleY = Array.from({ length: 60 }, function(_, i) { return evalF(xMin + i / 59 * (xMax2 - xMin)); });
        var yMax = Math.max.apply(null, sampleY.map(Math.abs).concat([1]));
        var xR = { min: xMin - 0.5, max: xMax2 + 0.5 };
        var yR = { min: -yMax * 0.3, max: yMax * 1.3 };
        var toSX = function(x) { return pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2 * pad); };
        var toSY = function(y) { return (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2 * pad); };

        // ── RIEMANN SHAPES ──────────────────────────────────────────────
        var dx = (xMax2 - xMin) / nRects;
        var rects = [], area = 0;
        if (mode === 'trapezoid') {
          for (var ti = 0; ti < nRects; ti++) {
            var txi = xMin + ti * dx, tyL = evalF(txi), tyR2 = evalF(txi + dx);
            area += (tyL + tyR2) / 2 * dx;
            rects.push({ x: txi, w: dx, hL: tyL, hR: tyR2, type: 'trap' });
          }
        } else if (mode === 'simpson' && nRects >= 2 && nRects % 2 === 0) {
          for (var si = 0; si < nRects; si += 2) {
            var sx0 = xMin + si * dx, sy0 = evalF(sx0), sy1 = evalF(sx0 + dx), sy2 = evalF(sx0 + 2 * dx);
            area += (sy0 + 4 * sy1 + sy2) * dx / 3;
            rects.push({ x: sx0, w: dx * 2, hL: sy0, hM: sy1, hR: sy2, type: 'simp' });
          }
        } else {
          for (var ri = 0; ri < nRects; ri++) {
            var xi = xMin + ri * dx;
            var yi = mode === 'left' ? evalF(xi) : mode === 'right' ? evalF(xi + dx) : evalF(xi + dx / 2);
            area += yi * dx; rects.push({ x: xi, w: dx, h: yi, type: 'rect' });
          }
        }
        var err = Math.abs(area - exact);

        // ── CONVERGENCE DATA ────────────────────────────────────────────
        var CW = 160, Cpad = 15;
        var convKey = [fa, fb, fc, xMin, xMax2, mode].join(',');
        if (!window._calcConvCache || window._calcConvCache.key !== convKey) {
          var _cd = [];
          for (var cn = 2; cn <= 50; cn += 2) {
            var cdx = (xMax2 - xMin) / cn, carea = 0;
            if (mode === 'trapezoid') { for (var cti = 0; cti < cn; cti++) { var cxti = xMin + cti * cdx; carea += (evalF(cxti) + evalF(cxti + cdx)) / 2 * cdx; } }
            else if (mode === 'simpson' && cn % 2 === 0) { for (var csi = 0; csi < cn; csi += 2) { var csx = xMin + csi * cdx; carea += (evalF(csx) + 4 * evalF(csx + cdx) + evalF(csx + 2 * cdx)) * cdx / 3; } }
            else { for (var cri = 0; cri < cn; cri++) { var cxi2 = xMin + cri * cdx; carea += evalF(mode === 'right' ? cxi2 + cdx : mode === 'midpoint' ? cxi2 + cdx / 2 : cxi2) * cdx; } }
            _cd.push({ n: cn, err: Math.abs(carea - exact) });
          }
          window._calcConvCache = { key: convKey, data: _cd };
        }
        var convData = window._calcConvCache.data;
        var convMaxErr = Math.max.apply(null, convData.map(function(c) { return c.err; }).concat([0.001]));
        var convToX = function(n) { return Cpad + ((n - 2) / 48) * (CW - 2 * Cpad); };
        var convToY = function(e) { return 55 - (e / convMaxErr) * 40; };

        // ── CURVE / TANGENT ─────────────────────────────────────────────
        var curvePts = [];
        for (var cpx = 0; cpx <= W - 2 * pad; cpx += 2) {
          var cx = xR.min + (cpx / (W - 2 * pad)) * (xR.max - xR.min);
          curvePts.push(toSX(cx) + ',' + toSY(evalF(cx)));
        }
        var slope = evalDeriv(x0);
        var fy0 = evalF(x0);
        var tangentPts = (function() {
          var tl = Math.max(xR.min, x0 - 1.5), tr = Math.min(xR.max, x0 + 1.5);
          return toSX(tl) + ',' + toSY(slope * (tl - x0) + fy0) + ' ' + toSX(tr) + ',' + toSY(slope * (tr - x0) + fy0);
        })();
        var dh = d.secantH !== undefined ? d.secantH : 1.0;
        var secantSlope = dh > 0.001 ? (evalF(x0 + dh) - evalF(x0)) / dh : slope;
        var secantPts = (function() {
          var sl = Math.max(xR.min, x0 - 0.5), sr = Math.min(xR.max, x0 + dh + 0.5);
          return toSX(sl) + ',' + toSY(secantSlope * (sl - x0) + fy0) + ' ' + toSX(sr) + ',' + toSY(secantSlope * (sr - x0) + fy0);
        })();

        // ── CSS ─────────────────────────────────────────────────────────
        var css = '@keyframes calcPop{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes calcCorrect{0%,100%{background:#dcfce7}50%{background:#86efac}}' +
          '@keyframes calcWrong{0%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}100%{transform:translateX(0)}}' +
          '@keyframes calcFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}' +
          '@keyframes spin{to{transform:rotate(360deg)}}';

        // ── MODES ────────────────────────────────────────────────────────
        var MODES = [
          { id: 'left', label: 'Left' }, { id: 'midpoint', label: 'Midpoint' },
          { id: 'right', label: 'Right' }, { id: 'trapezoid', label: 'Trapezoid' }, { id: 'simpson', label: "Simpson's" }
        ];

        // ── PRESETS ──────────────────────────────────────────────────────
        var PRESETS = [
          { label: '\u222B x\u00B2 [0,1]',           a:1, b:0, c:0, xMin:0, xMax:1, n:20, tip:'Classic! Think about it first: is the area more or less than 0.5?' },
          { label: '\u222B x\u00B2 [0,3]',           a:1, b:0, c:0, xMin:0, xMax:3, n:20, tip:'Same curve, wider bounds. Predict the area before computing!' },
          { label: '\u222B 2x [0,5]',                a:0, b:2, c:0, xMin:0, xMax:5, n:10, tip:'Linear function. Will rectangles ever be exact? Why?' },
          { label: '\u222B 3 [1,4]',                 a:0, b:0, c:3, xMin:1, xMax:4, n:5,  tip:'Constant function. What should the error always be?' },
          { label: '\u222B (x\u00B2+2x+1) [0,2]',   a:1, b:2, c:1, xMin:0, xMax:2, n:20, tip:'This equals (x+1)\u00B2. Does that change your prediction?' },
          { label: '\u222B \u2212x\u00B2+4 [0,2]',   a:-1,b:0, c:4, xMin:0, xMax:2, n:25, tip:'Downward arch. Will the integral be larger or smaller than for x\u00B2?' },
          { label: '\u222B \u2212x\u00B2+4 [\u22122,2]',a:-1,b:0,c:4,xMin:-2,xMax:2,n:20,tip:'Full arch. Estimate the area visually before running it.' },
          { label: '\u222B (x\u00B2\u22123x) [1,4]', a:1, b:-3,c:0, xMin:1, xMax:4, n:20, tip:'The function crosses zero in this range. What does that mean for the integral?' },
        ];

        // ── ACTIVE LEARNING STATE ────────────────────────────────────────
        var predictMode = d.predictMode || false;
        var predictInput = d.predictInput || '';
        var predictSubmitted = d.predictSubmitted || false;
        var overUnderGuess = d.overUnderGuess || null;   // 'over' | 'under' | null
        var overUnderChecked = d.overUnderChecked || false;

        // Is the sum actually an over or underestimate?
        // For Left Riemann + increasing function → underestimate
        // Quick heuristic: compare evalF slope direction
        var fIsIncreasing = evalF(xMax2) > evalF(xMin);
        var actualOverUnder = (mode === 'left' && fIsIncreasing) ? 'under'
          : (mode === 'left' && !fIsIncreasing) ? 'over'
          : (mode === 'right' && fIsIncreasing) ? 'over'
          : (mode === 'right' && !fIsIncreasing) ? 'under'
          : 'neither';  // midpoint/trapezoid/simpson don't have consistent direction

        var derivInputChecked = d.derivInputChecked || false;
        var derivInput1 = d.derivInput1 || '';
        var derivInput2 = d.derivInput2 || '';
        var antiChecked = d.antiChecked || false;
        var antiA = d.antiA || '';
        var antiB = d.antiB || '';
        var antiC2 = d.antiC2 || '';

        // Challenge state
        var cq = d.calcQuiz || null;
        var cScore = d.calcScore || 0;
        var cStreak = d.calcStreak || 0;
        var cMode = d.calcChallengeMode || 'estimate';
        var cHint = d.calcHint || '';
        var CALC_CHALLENGES = [
          { id: 'estimate',  label: '\uD83C\uDFAF Estimate \u222B',  color: 'red' },
          { id: 'overunder', label: '\u2B06\u2B07 Over or Under?',    color: 'orange' },
          { id: 'method',    label: '\u26A1 Best Method',             color: 'amber' },
          { id: 'minN',      label: '\uD83D\uDD22 Min n',             color: 'blue' },
          { id: 'exact',     label: '\u270F\uFE0F Exact \u222B',      color: 'emerald' },
          { id: 'deriv',     label: '\uD83D\uDCC8 Find the Slope',    color: 'violet' },
        ];

        // ── CHALLENGE GENERATORS ─────────────────────────────────────────
        function makeEstimateQuiz() {
          var qa=[1,-1,2,-2,0][Math.floor(Math.random()*5)];
          var qb=[0,1,2,-1,-2][Math.floor(Math.random()*5)];
          var qc=[0,1,2,-1][Math.floor(Math.random()*4)];
          var qxMax=[1,2,3][Math.floor(Math.random()*3)];
          var qExact=Math.round((evalAntiAt(qa,qb,qc,qxMax)-evalAntiAt(qa,qb,qc,0))*100)/100;
          var opts=[qExact];
          while(opts.length<4){var w=Math.round((qExact+(Math.floor(Math.random()*5)+1)*(Math.random()<0.5?1:-1))*100)/100; if(opts.indexOf(w)<0)opts.push(w);}
          opts.sort(function(a,b){return a-b;});
          return {mode:'estimate',a:qa,b:qb,c:qc,xMin:0,xMax:qxMax,answer:qExact,opts:opts,answered:false,
            question:'\u222B\u2080'+qxMax+' ('+buildFStr(qa,qb,qc)+') dx = ?'};
        }
        function makeOverUnderQuiz() {
          var qa=[1,2,-1,-2][Math.floor(Math.random()*4)];
          var qb=[0,1,-1][Math.floor(Math.random()*3)];
          var qxMax=[2,3][Math.floor(Math.random()*2)];
          var qMode=['left','right'][Math.floor(Math.random()*2)];
          var isInc = evalAntiAt(qa,qb,0,qxMax) - evalAntiAt(qa,qb,0,0) > 0 ? (qa*qxMax + qb > qa*0 + qb) : false;
          // simpler: f increasing if f(xMax) > f(0)
          var fAtEnd = qa*qxMax*qxMax + qb*qxMax;
          var fAtStart = 0;
          var inc = fAtEnd > fAtStart;
          var correct = (qMode==='left' && inc) ? 'under' : (qMode==='left' && !inc) ? 'over' : (qMode==='right' && inc) ? 'over' : 'under';
          var why = qMode==='left'
            ? (inc ? 'Left endpoints are on the rising part of the curve, so rectangles miss the area above each left corner.'
                   : 'Left endpoints are on the falling part, so rectangles extend beyond the curve.')
            : (inc ? 'Right endpoints are on the rising part, so rectangles overshoot the curve.'
                   : 'Right endpoints are on the falling part, so rectangles miss area.');
          return {mode:'overunder',a:qa,b:qb,c:0,xMin:0,xMax:qxMax,ruleMode:qMode,answer:correct,why:why,answered:false,
            question:'For f(x)='+buildFStr(qa,qb,0)+' using '+qMode.charAt(0).toUpperCase()+qMode.slice(1)+' Riemann sums [0,'+qxMax+']: is the approximation an OVERestimate or UNDERestimate?'};
        }
        function makeMethodQuiz() {
          var qa=[1,-1,2][Math.floor(Math.random()*3)], qb=[0,1,-1][Math.floor(Math.random()*3)], qc=[0,1][Math.floor(Math.random()*2)];
          var qxMax=[2,3][Math.floor(Math.random()*2)], qn=[4,6,8][Math.floor(Math.random()*3)];
          var qExact=evalAntiAt(qa,qb,qc,qxMax)-evalAntiAt(qa,qb,qc,0);
          var methods=['left','right','midpoint','trapezoid','simpson'], errors={};
          methods.forEach(function(m){
            var qdx=qxMax/qn, qa2=0;
            for(var i=0;i<qn;i++){var xi=i*qdx;
              if(m==='trapezoid'){qa2+=(qa*xi*xi+qb*xi+qc+qa*(xi+qdx)*(xi+qdx)+qb*(xi+qdx)+qc)/2*qdx;}
              else if(m==='simpson'&&qn%2===0&&i%2===0){var f0=qa*xi*xi+qb*xi+qc,f1=qa*(xi+qdx)*(xi+qdx)+qb*(xi+qdx)+qc,f2=qa*(xi+2*qdx)*(xi+2*qdx)+qb*(xi+2*qdx)+qc;qa2+=(f0+4*f1+f2)*qdx/3;}
              else if(m!=='simpson'){var xs=m==='right'?xi+qdx:m==='midpoint'?xi+qdx/2:xi;qa2+=(qa*xs*xs+qb*xs+qc)*qdx;}}
            errors[m]=Math.abs(qa2-qExact);
          });
          var best=methods.reduce(function(a,b){return errors[a]<errors[b]?a:b;});
          var labels={left:'Left Riemann',right:'Right Riemann',midpoint:'Midpoint',trapezoid:'Trapezoidal',simpson:"Simpson's"};
          return {mode:'method',a:qa,b:qb,c:qc,xMin:0,xMax:qxMax,n:qn,answer:best,answerLabel:labels[best],
            opts:methods.map(function(m){return{id:m,label:labels[m]};}),errors:errors,answered:false,
            question:'At n='+qn+', which method gives the SMALLEST error for f(x)='+buildFStr(qa,qb,qc)+'?'};
        }
        function makeMinNQuiz() {
          var qa=[1,-1,2][Math.floor(Math.random()*3)], qb=[0,1][Math.floor(Math.random()*2)];
          var qxMax=[2,3][Math.floor(Math.random()*2)], thr=[0.5,0.1,0.05][Math.floor(Math.random()*3)];
          var qExact=evalAntiAt(qa,qb,0,qxMax)-evalAntiAt(qa,qb,0,0);
          var minN=2;
          for(var tn=2;tn<=100;tn++){var tdx=qxMax/tn,ta=0;for(var ti=0;ti<tn;ti++){var txi=ti*tdx;ta+=(qa*txi*txi+qb*txi)*tdx;}if(Math.abs(ta-qExact)<thr){minN=tn;break;}}
          if(minN>50){minN=50;thr=0.5;}
          var opts=[minN],cands=[minN-4,minN-2,minN+2,minN+4,minN*2].filter(function(v){return v>=2&&v<=100&&v!==minN;});
          while(opts.length<4&&cands.length>0){var ci=Math.floor(Math.random()*cands.length);opts.push(cands.splice(ci,1)[0]);}
          opts.sort(function(a,b){return a-b;});
          return {mode:'minN',a:qa,b:qb,c:0,xMin:0,xMax:qxMax,answer:minN,threshold:thr,opts:opts,answered:false,
            question:'Using Left Riemann for f(x)='+buildFStr(qa,qb,0)+', what is the SMALLEST n where error < '+thr+'?'};
        }
        function makeExactQuiz() {
          var qa=[0,1,-1,2][Math.floor(Math.random()*4)], qb=[0,1,2,3][Math.floor(Math.random()*4)], qc=[0,1,2][Math.floor(Math.random()*3)];
          var qxMax=[1,2,3][Math.floor(Math.random()*3)];
          var qExact=Math.round((evalAntiAt(qa,qb,qc,qxMax)-evalAntiAt(qa,qb,qc,0))*1000)/1000;
          var hParts=[]; if(qa!==0)hParts.push(qa+'x\u00B3/3'); if(qb!==0)hParts.push(qb+'x\u00B2/2'); if(qc!==0)hParts.push(qc+'x');
          return {mode:'exact',a:qa,b:qb,c:qc,xMin:0,xMax:qxMax,answer:qExact,answered:false,
            question:'Use the power rule to compute \u222B\u2080'+qxMax+' ('+buildFStr(qa,qb,qc)+') dx exactly.',
            hint:'Anti-derivative: F(x) = '+(hParts.join(' + ')||'0')+'. Evaluate F('+qxMax+')\u2212F(0).'};
        }
        function makeDerivQuiz() {
          var qa=[1,-1,2,-2,3][Math.floor(Math.random()*5)], qb=[0,1,2,-1,-3][Math.floor(Math.random()*5)];
          var qx=[0,1,2,-1,0.5,3][Math.floor(Math.random()*6)];
          var qSlope=2*qa*qx+qb;
          var opts=[qSlope];
          while(opts.length<4){var w=qSlope+(Math.floor(Math.random()*4)+1)*(Math.random()<0.5?1:-1); if(opts.indexOf(w)<0)opts.push(w);}
          opts.sort(function(a,b){return a-b;});
          return {mode:'deriv',a:qa,b:qb,c:0,x0:qx,answer:qSlope,opts:opts,answered:false,
            question:"For f(x)="+buildFStr(qa,qb,0)+", apply the power rule to find f\u2032("+qx+")."};
        }
        function startCalcChallenge() {
          var q = cMode==='method'?makeMethodQuiz():cMode==='minN'?makeMinNQuiz():cMode==='exact'?makeExactQuiz():cMode==='deriv'?makeDerivQuiz():cMode==='overunder'?makeOverUnderQuiz():makeEstimateQuiz();
          setLabToolData(function(prev){
            var patch={calcQuiz:q,calcHint:'',_calcExactInput:'',a:q.a,b:q.b,c:q.c};
            if(q.xMin!==undefined)patch.xMin=q.xMin;
            if(q.xMax!==undefined)patch.xMax=q.xMax;
            if(q.n!==undefined)patch.n=q.n;
            if(q.x0!==undefined)patch.x0=q.x0;
            if(q.ruleMode!==undefined)patch.mode=q.ruleMode;
            return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,patch)});
          });
          stemBeep && stemBeep('click');
        }
        function checkCalcAnswer(chosen) {
          var correct = cMode==='method'?chosen===cq.answer:cMode==='minN'?chosen<=cq.answer+2&&chosen>=cq.answer:cMode==='exact'?Math.abs(parseFloat(chosen)-cq.answer)<0.05:cMode==='overunder'?chosen===cq.answer:cMode==='deriv'?chosen===cq.answer:chosen===cq.answer;
          var newStreak=correct?cStreak+1:0;
          var hintMsg = correct ? '' : cMode==='method'?'Best was '+cq.answerLabel+". Simpson\u2019s is exact for polynomials \u2264 degree 3!":cMode==='minN'?'Min n = '+cq.answer+'. More subdivisions \u2192 smaller error.':cMode==='overunder'?cq.why:cMode==='deriv'?'Power rule: f\u2032(x) = '+buildDerivStr(cq.a,cq.b)+', so f\u2032('+cq.x0+') = '+cq.answer+'. (Differentiate each term: d/dx[ax\u00B2] = 2ax, d/dx[bx] = b)':'Answer: '+cq.answer+'. Apply the power rule: \u222B x\u207F = x\u207F\u207A\u00B9/(n+1)';
          setLabToolData(function(prev){
            return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{
              calcQuiz:Object.assign({},prev.calculus.calcQuiz,{answered:true,chosen:chosen,correct:correct}),
              calcScore:(prev.calculus.calcScore||0)+(correct?1:0),
              calcStreak:newStreak,
              calcHint:hintMsg
            })});
          });
          if(correct){stemBeep&&stemBeep('success');if(typeof awardStemXP==='function')awardStemXP('calculus',5,cMode);addToast('\u2705 Correct! +5 XP','success');if(newStreak>=3){stemCelebrate&&stemCelebrate();awardStemXP&&awardStemXP('calculus',5,'streak');addToast('\uD83D\uDD25 '+newStreak+'-streak! +5 bonus XP','success');}setTimeout(startCalcChallenge,2000);}
          else{stemBeep&&stemBeep('error');addToast('\u274C Not quite \u2014 see explanation below','error');}
        }

        // ── SHARED SVG GRAPH ─────────────────────────────────────────────
        var svgGraph = function(showTangent, showRects) {
          return h('svg', { viewBox: '0 0 '+W+' '+H, className: 'w-full bg-white rounded-xl border-2 border-red-200 shadow-sm', style:{maxHeight:'280px'} },
            (function(){var gs=[];for(var gx=Math.ceil(xR.min);gx<=xR.max;gx++){var gsx=toSX(gx);if(gsx>pad&&gsx<W-pad)gs.push(h('line',{key:'g'+gx,x1:gsx,y1:pad,x2:gsx,y2:H-pad,stroke:'#f1f5f9',strokeWidth:0.5}));}return gs;})(),
            h('line',{x1:pad,y1:toSY(0),x2:W-pad,y2:toSY(0),stroke:'#94a3b8',strokeWidth:1.5}),
            h('line',{x1:toSX(0),y1:pad,x2:toSX(0),y2:H-pad,stroke:'#94a3b8',strokeWidth:1.5}),
            showRects && h('rect',{x:toSX(xMin),y:pad,width:Math.abs(toSX(xMax2)-toSX(xMin)),height:H-2*pad,fill:'none',stroke:'#ef4444',strokeWidth:1,strokeDasharray:'4 2'}),
            showRects && rects.map(function(r,i){
              if(r.type==='trap'){var pts=toSX(r.x)+','+toSY(0)+' '+toSX(r.x)+','+toSY(r.hL)+' '+toSX(r.x+r.w)+','+toSY(r.hR)+' '+toSX(r.x+r.w)+','+toSY(0);return h('polygon',{key:i,points:pts,fill:'rgba(239,68,68,0.15)',stroke:'#ef4444',strokeWidth:0.8});}
              if(r.type==='simp'){var sp=[toSX(r.x)+','+toSY(0)];for(var sp2=0;sp2<=10;sp2++){var st=sp2/10,spx=r.x+st*r.w,spy=r.hL*(1-st)*(1-2*st)+4*r.hM*st*(1-st)+r.hR*st*(2*st-1);sp.push(toSX(spx)+','+toSY(spy));}sp.push(toSX(r.x+r.w)+','+toSY(0));return h('polygon',{key:i,points:sp.join(' '),fill:'rgba(168,85,247,0.15)',stroke:'#a855f7',strokeWidth:0.8});}
              return h('rect',{key:i,x:toSX(r.x),y:r.h>=0?toSY(r.h):toSY(0),width:Math.abs(toSX(r.x+r.w)-toSX(r.x)),height:Math.abs(toSY(r.h)-toSY(0)),fill:'rgba(239,68,68,0.15)',stroke:'#ef4444',strokeWidth:0.8});
            }),
            showTangent && dh > 0.05 && h('polyline',{points:secantPts,fill:'none',stroke:'#f59e0b',strokeWidth:1.5,strokeDasharray:'5 3'}),
            showTangent && h('polyline',{points:tangentPts,fill:'none',stroke:'#ef4444',strokeWidth:2}),
            curvePts.length>1 && h('polyline',{points:curvePts.join(' '),fill:'none',stroke:'#1e293b',strokeWidth:2.5}),
            showTangent && h('circle',{cx:toSX(x0),cy:toSY(fy0),r:5,fill:'#ef4444',stroke:'white',strokeWidth:2}),
            showTangent && dh>0.05 && h('circle',{cx:toSX(x0+dh),cy:toSY(evalF(x0+dh)),r:4,fill:'#f59e0b',stroke:'white',strokeWidth:2}),
            h('text',{x:W/2,y:H-6,textAnchor:'middle',fill:'#64748b',style:{fontSize:'9px',fontWeight:'bold'}},
              showTangent ? fStr+'  |  f\u2032('+x0+') = '+slope.toFixed(3) : fStr+'  |  \u222B \u2248 '+area.toFixed(4)+'  (n='+nRects+', '+mode+')')
          );
        };

        // ── RENDER ───────────────────────────────────────────────────────
        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

          h('style', null, css),

          // Header
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function(){setStemLabTool(null);}, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' }, h(ArrowLeft, {size:18,className:'text-slate-600'})),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u222B Calculus'),
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-bold rounded-full' }, 'INTERACTIVE'),
            cScore > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full' }, '\u2B50 ' + cScore + ' | \uD83D\uDD25 ' + cStreak)
          ),

          // Tab bar
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-0 mb-3 border-b border-slate-200', role: 'tablist', 'aria-label': 'Calculus Tool sections' },
            [['integral','\u222B Integral'],['derivative','\uD83D\uDCC8 Derivative'],['visualize','\uD83C\uDFAC Visualize'],['challenge','\uD83C\uDFAF Challenge'],['discover','\uD83D\uDD2C Discover']].map(function(item){
              return h('button',{ "aria-label": "Calculus tool action",key:item[0],onClick:function(){upd('tab',item[0]);},role:'tab','aria-selected':tab===item[0],className:'px-3 py-1.5 text-xs font-bold transition-all '+(tab===item[0]?'border-b-2 border-red-600 text-red-700 -mb-px':'text-slate-600 hover:text-slate-700')},item[1]);
            })
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: INTEGRAL
          // ══════════════════════════════════════════════════════════════
          tab === 'integral' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: 'integral' },

            // Method selector
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1 mb-3' },
              MODES.map(function(m){
                return h('button',{ "aria-label": "Calculus tool action",key:m.id,onClick:function(){upd('mode',m.id);if(m.id==='simpson'&&nRects%2!==0)upd('n',nRects+1);},className:'px-3 py-1.5 rounded-lg text-xs font-bold transition-all '+(mode===m.id?'bg-red-600 text-white shadow-md':'bg-slate-100 text-slate-600 hover:bg-red-50')},m.label);
              })
            ),

            svgGraph(false, true),

            // ── OVER/UNDER PREDICTION (active learning) ──────────────────
            (mode === 'left' || mode === 'right') && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 bg-slate-50 rounded-xl border p-3', style:{animation:'calcFade 0.3s ease'} },
              h('p', { className: 'text-xs font-bold text-slate-700 mb-2' },
                '\uD83E\uDD14 Before checking — is this ' + mode + ' Riemann sum an OVERestimate or UNDERestimate?'
              ),
              !overUnderChecked && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
                h('button', { "aria-label": "OVERestimate",
                  onClick: function(){ upd('overUnderGuess','over'); upd('overUnderChecked',true); stemBeep&&stemBeep('click'); },
                  className: 'flex-1 py-2 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all border-2 border-red-200'
                }, '\u2B06 OVERestimate'),
                h('button', { "aria-label": "UNDERestimate",
                  onClick: function(){ upd('overUnderGuess','under'); upd('overUnderChecked',true); stemBeep&&stemBeep('click'); },
                  className: 'flex-1 py-2 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all border-2 border-blue-200'
                }, '\u2B07 UNDERestimate'),
                h('button', { "aria-label": "Calculus tool action",
                  onClick: function(){ upd('overUnderGuess','neither'); upd('overUnderChecked',true); stemBeep&&stemBeep('click'); },
                  className: 'flex-1 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border-2 border-slate-200'
                }, '\u2194 Can\'t tell')
              ),
              overUnderChecked && (function(){
                var correct = overUnderGuess === actualOverUnder || (actualOverUnder === 'neither' && overUnderGuess === 'neither');
                var isOver = actualOverUnder === 'over';
                var isNeither = actualOverUnder === 'neither';
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcPop 0.3s ease'}},
                  h('p', { className: 'text-sm font-bold mb-1 ' + (correct?'text-emerald-600':'text-red-600') },
                    (correct?'\u2705 Correct! ':'❌ Not quite — ') + (isNeither ? 'Midpoint/Trapezoid/Simpson\u2019s don\u2019t always go one way.' : isOver ? 'It\u2019s an OVERestimate.' : 'It\u2019s an UNDERestimate.')
                  ),
                  !isNeither && h('p', { className: 'text-xs text-slate-600' },
                    '\uD83D\uDCA1 ' + (mode==='left'
                      ? (fIsIncreasing ? 'The function is rising, so each left endpoint is below where the curve ends up — rectangles miss area above them.' : 'The function is falling, so each left endpoint is above where the curve goes — rectangles overshoot.')
                      : (fIsIncreasing ? 'The function is rising, so each right endpoint is at the highest point — rectangles overshoot the curve.' : 'The function is falling, so each right endpoint is at the lowest point — rectangles miss area.'))
                  ),
                  h('button', {"aria-label":"Reset", onClick:function(){upd('overUnderChecked',false);upd('overUnderGuess',null);}, className:'mt-1 text-[11px] text-slate-600 hover:text-slate-600 font-bold' }, '\u21BA Reset')
                );
              })()
            ),

            // ── PREDICT FIRST mode ────────────────────────────────────────
            h('div', { className: 'mt-3 flex items-center gap-2 mb-1' },
              h('button', { "aria-label": "Calculus tool action",
                onClick: function(){ upd('predictMode',!predictMode); upd('predictSubmitted',false); upd('predictInput',''); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (predictMode?'bg-violet-600 text-white':'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100')
              }, predictMode ? '\uD83D\uDD2E Predict Mode ON' : '\uD83D\uDD2E Try Predict Mode'),
              !predictMode && h('span', { className: 'text-[11px] text-slate-600' }, '\u2014 estimate the integral before it\u2019s revealed')
            ),

            predictMode && !predictSubmitted && h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4', style:{animation:'calcFade 0.3s ease'} },
              h('p', { className: 'text-sm font-bold text-violet-800 mb-1' }, '\uD83D\uDD2E What do you estimate \u222B[' + xMin + ',' + xMax2 + '] f(x) dx to be?'),
              h('p', { className: 'text-xs text-violet-600 mb-3 italic' }, 'Look at the graph. Think about average height \u00D7 width. Don\u2019t compute \u2014 just estimate!'),
              h('div', { className: 'flex gap-2' },
                h('input', { type:'number', step:'any', placeholder:'My estimate...', value: predictInput, onChange: function(e){upd('predictInput',e.target.value);}, onKeyDown: function(e){if(e.key==='Enter'&&predictInput)upd('predictSubmitted',true);}, 'aria-label': 'Integral estimate input', className:'flex-1 px-3 py-2 border-2 border-violet-300 rounded-lg text-sm font-bold text-violet-900 outline-none focus:border-violet-500', autoFocus: true }),
                h('button', {"aria-label":"Reveal", disabled:!predictInput, onClick:function(){if(predictInput)upd('predictSubmitted',true);}, className:'px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50' }, 'Reveal \u2192')
              )
            ),

            predictMode && predictSubmitted && (function(){
              var pred = parseFloat(predictInput);
              var pctOff = exact !== 0 ? Math.abs(pred - exact) / Math.abs(exact) * 100 : Math.abs(pred - exact) * 100;
              return h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4', style:{animation:'calcFade 0.3s ease'} },
                h('div', { className: 'grid grid-cols-3 gap-2 text-center mb-3' },
                  h('div', { className: 'p-2 bg-white rounded-lg border border-violet-200' },
                    h('p', { className: 'text-[11px] font-bold text-violet-400 uppercase' }, 'Your Estimate'),
                    h('p', { className: 'text-lg font-black text-violet-700' }, pred.toFixed(3))
                  ),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'p-2 bg-white rounded-lg border border-emerald-200' },
                    h('p', { className: 'text-[11px] font-bold text-emerald-400 uppercase' }, 'Exact Value'),
                    h('p', { className: 'text-lg font-black text-emerald-700', style:{animation:'calcPop 0.4s ease'} }, exact.toFixed(4))
                  ),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'p-2 bg-white rounded-lg border border-slate-200' },
                    h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, '% Off'),
                    h('p', { className: 'text-sm font-black text-slate-600' }, pctOff.toFixed(1) + '%')
                  )
                ),
                h('p', { className: 'text-xs italic ' + (pctOff<5?'text-emerald-600':pctOff<20?'text-amber-600':'text-slate-600') },
                  pctOff<5 ? '\uD83C\uDFAF Excellent! Within 5% \u2014 you have strong spatial intuition!' :
                  pctOff<15 ? '\uD83D\uDC4D Good intuition! Within 15%. Tip: think about the average y-value \u00D7 width.' :
                  '\uD83D\uDCA1 Keep at it! Estimation gets better with practice. Try: pick a "middle" y-value and multiply by the width.'
                ),
                h('button', {"aria-label":"Try another estimate", onClick:function(){upd('predictSubmitted',false);upd('predictInput','');}, className:'mt-2 text-[11px] text-violet-500 hover:text-violet-700 font-bold' }, '\u21BA Try another estimate')
              );
            })(),

            // Analysis panel (only show if not in predict mode OR already submitted)
            (!predictMode || predictSubmitted) && h('div', { className: 'mt-3 grid grid-cols-5 gap-3' },
              h('div', { className: 'col-span-3 bg-red-50 rounded-xl border border-red-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Analysis'),
                h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                  h('div', { className: 'p-1.5 bg-white rounded-lg border', style:{animation:'calcPop 0.3s ease'} },
                    h('p', { className: 'text-[11px] font-bold text-red-400' }, mode==='trapezoid'?'Trapezoidal':mode==='simpson'?"Simpson's":'Riemann ('+mode+')'),
                    h('p', { className: 'text-sm font-bold text-red-800' }, area.toFixed(4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { className: 'text-[11px] font-bold text-red-400' }, 'Exact (\u222B)'),
                    h('p', { className: 'text-sm font-bold text-red-800' }, exact.toFixed(4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { id: 'err-stem_tool_calculus-474', role: 'alert', className: 'text-[11px] font-bold text-red-400' }, 'Error'),
                    h('p', { className: 'text-sm font-bold '+(err<0.01?'text-emerald-600':err<0.1?'text-yellow-600':'text-red-600') }, err.toFixed(6))
                  )
                ),
                h('p', { className: 'mt-2 text-xs text-slate-600 italic' },
                  mode==='simpson'?"\uD83D\uDCA1 Simpson's uses parabolic arcs \u2014 exact for polynomials up to degree 3. Why do you think that is?":
                  mode==='trapezoid'?"\uD83D\uDCA1 Trapezoid error \u221D 1/n\u00B2. What does that mean when you double n?":
                  nRects<=5?"\uD83D\uDCA1 Only " + nRects + " rectangles. Predict: what happens to the error if you triple n?":
                  "\uD83D\uDCA1 At n=" + nRects + ": how many times larger is the error compared to n=50? Use the chart \u2192"
                )
              ),
              h('div', { className: 'col-span-2 bg-slate-50 rounded-xl border p-2' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCC9 Error vs n'),
                h('svg', { viewBox: '0 0 '+CW+' 60', className: 'w-full' },
                  h('line',{x1:Cpad,y1:55,x2:CW-Cpad,y2:55,stroke:'#e2e8f0',strokeWidth:0.5}),
                  h('polyline',{points:convData.map(function(cd){return convToX(cd.n)+','+convToY(cd.err);}).join(' '),fill:'none',stroke:'#ef4444',strokeWidth:1.5}),
                  h('circle',{cx:convToX(nRects),cy:convToY(err),r:3,fill:'#ef4444',stroke:'white',strokeWidth:1}),
                  h('text',{x:CW/2,y:8,textAnchor:'middle',fill:'#94a3b8',style:{fontSize:'6px'}},'error \u2192 0 as n \u2192 \u221E')
                )
              )
            ),

            // ── ANTIDERIVATIVE BUILDER ────────────────────────────────────
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-cyan-50 rounded-xl border border-cyan-200 p-3' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-1' },
                h('p', { className: 'text-[11px] font-bold text-cyan-700 uppercase tracking-wider' }, '\u270F\uFE0F Build the Antiderivative'),
                h('p', { className: 'text-[11px] text-cyan-500 italic' }, 'Power rule: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1)')
              ),
              h('p', { className: 'text-xs text-cyan-800 mb-2' }, 'For f(x) = ' + buildFStr(fa, fb, fc) + ', complete F(x):'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 flex-wrap' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-cyan-900' }, 'F(x) = '),
                h('input', { type:'number', step:'any', placeholder:'?', value:antiA, onChange:function(e){upd('antiA',e.target.value);upd('antiChecked',false);}, 'aria-label': 'Antiderivative x-cubed coefficient', className:'w-10 text-center border-2 border-cyan-300 rounded px-1 py-0.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-cyan-900' }, '\u00B7x\u00B3/3 + '),
                h('input', { type:'number', step:'any', placeholder:'?', value:antiB, onChange:function(e){upd('antiB',e.target.value);upd('antiChecked',false);}, 'aria-label': 'Antiderivative x-squared coefficient', className:'w-10 text-center border-2 border-cyan-300 rounded px-1 py-0.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-cyan-900' }, '\u00B7x\u00B2/2 + '),
                h('input', { type:'number', step:'any', placeholder:'?', value:antiC2, onChange:function(e){upd('antiC2',e.target.value);upd('antiChecked',false);}, 'aria-label': 'Antiderivative x coefficient', className:'w-10 text-center border-2 border-cyan-300 rounded px-1 py-0.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-cyan-900' }, '\u00B7x'),
                h('button', {"aria-label":"Check", disabled:antiA===''||antiB===''||antiC2==='', onClick:function(){upd('antiChecked',true);stemBeep&&stemBeep('click');}, className:'ml-2 px-3 py-1 bg-cyan-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-cyan-700' }, 'Check')
              ),
              antiChecked && (function(){
                var okA=Math.abs(parseFloat(antiA)-fa)<0.01, okB=Math.abs(parseFloat(antiB)-fb)<0.01, okC=Math.abs(parseFloat(antiC2)-fc)<0.01, all=okA&&okB&&okC;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className:'mt-2', style:{animation:'calcPop 0.3s ease'} },
                  h('p', { className:'text-sm font-bold '+(all?'text-emerald-700':'text-red-600') }, all ? '\u2705 Correct! Now evaluate: F(' + xMax2 + ') \u2212 F(' + xMin + ') = ' + exact.toFixed(4) : '\u274C Check each term:'),
                  !all && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className:'text-xs space-y-0.5 mt-1' },
                    h('p',{className:okA?'text-emerald-600':'text-red-500'},(okA?'\u2713':'\u2717')+' x\u00B3/3 coefficient: should be '+fa+' (same as coefficient of x\u00B2 in f(x))'),
                    h('p',{className:okB?'text-emerald-600':'text-red-500'},(okB?'\u2713':'\u2717')+' x\u00B2/2 coefficient: should be '+fb),
                    h('p',{className:okC?'text-emerald-600':'text-red-500'},(okC?'\u2713':'\u2717')+' x coefficient: should be '+fc)
                  ),
                  h('button',{"aria-label":"Clear and try again",onClick:function(){upd('antiChecked',false);upd('antiA','');upd('antiB','');upd('antiC2','');},className:'mt-1 text-[11px] text-cyan-600 hover:underline font-bold'},'\u21BA Clear and try again')
                );
              })()
            ),

            // Sliders
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2 mt-3' },
              [{k:'a',label:'a (x\u00B2)',min:-3,max:3,step:0.5},{k:'b',label:'b (x)',min:-5,max:5,step:0.5},{k:'c',label:'c (const)',min:-5,max:5,step:0.5},{k:'xMin',label:'Lower a',min:-3,max:4,step:0.5},{k:'xMax',label:'Upper b',min:1,max:10,step:0.5},{k:'n',label:'n (subdivisions)',min:2,max:50,step:mode==='simpson'?2:1}].map(function(s){
                return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },key:s.k,className:'text-center bg-slate-50 rounded-lg p-2 border'},
                  h('label',{className:'text-[11px] font-bold text-red-600'},s.label+': '+d[s.k]),
                  h('input',{type:'range',min:s.min,max:s.max,step:s.step,value:d[s.k],'aria-label':s.label,onChange:function(e){upd(s.k,parseFloat(e.target.value));upd('overUnderChecked',false);upd('predictSubmitted',false);upd('antiChecked',false);},className:'w-full accent-red-600'})
                );
              })
            ),

            // Presets
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 flex flex-wrap gap-1.5 items-center' },
              h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-[11px] font-bold text-slate-600'},'Load:'),
              PRESETS.map(function(p){
                return h('button',{ "aria-label": "Calculus tool action",key:p.label,onClick:function(){
                  setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{a:p.a,b:p.b,c:p.c,xMin:p.xMin,xMax:p.xMax,n:p.n,overUnderChecked:false,predictSubmitted:false,antiChecked:false,antiA:'',antiB:'',antiC2:''})});});
                  addToast('\uD83E\uDD14 '+p.tip,'info');
                  stemBeep&&stemBeep('click');
                },className:'px-2 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all'},p.label);
              })
            ),

            // Snapshot
            h('button',{"aria-label":"Snapshot",onClick:function(){setToolSnapshots(function(prev){return prev.concat([{id:'calc-'+Date.now(),tool:'calculus',label:'\u222B['+xMin+','+xMax2+'] n='+nRects,data:Object.assign({},d),timestamp:Date.now()}]);});addToast('\uD83D\uDCF8 Snapshot!','success');},className:'mt-3 ml-auto block px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-md transition-all'},'\uD83D\uDCF8 Snapshot')
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: DERIVATIVE
          // ══════════════════════════════════════════════════════════════
          tab === 'derivative' && h('div', { key: 'derivative' },

            h('div', { className: 'bg-red-50 rounded-xl border border-red-100 p-3 mb-3 grid grid-cols-2 gap-3' },
              h('div', null,
                h('p',{className:'text-[11px] font-bold text-red-400 uppercase mb-0.5'},'Function'),
                h('p',{className:'text-sm font-bold text-slate-800 font-mono'},fStr)
              ),
              h('div', null,
                h('p',{className:'text-[11px] font-bold text-red-400 uppercase mb-0.5'},'f\u2032(x\u2080='+x0+') = slope'),
                h('p',{className:'text-base font-black text-red-700',style:{animation:'calcPop 0.3s ease'}},slope.toFixed(4))
              ),
              h('div', null,
                h('p',{className:'text-[11px] font-bold text-red-400 uppercase mb-0.5'},'Tangent line'),
                h('p',{className:'text-xs font-bold text-slate-700 font-mono'},'y = '+slope.toFixed(2)+'(x\u2212'+x0+') + '+fy0.toFixed(2))
              ),
              h('div', null,
                h('p',{className:'text-[11px] font-bold text-red-400 uppercase mb-0.5'},'Secant slope (h='+dh.toFixed(2)+')'),
                h('p',{className:'text-sm font-bold text-amber-600'},secantSlope.toFixed(4)+' \u2192 '+slope.toFixed(4))
              )
            ),

            svgGraph(true, false),

            h('div',{className:'mt-2 grid grid-cols-2 gap-2'},
              h('div',{className:'bg-slate-50 rounded-lg border p-2'},
                h('label',{className:'text-[11px] font-bold text-red-600'},'x\u2080 (tangent point): '+x0),
                h('input',{type:'range','aria-label':'Tangent point x0',min:(xMin-1).toFixed(1),max:(xMax2+1).toFixed(1),step:0.1,value:x0,onChange:function(e){upd('x0',parseFloat(e.target.value));upd('derivInputChecked',false);},className:'w-full accent-red-600'})
              ),
              h('div',{className:'bg-slate-50 rounded-lg border p-2'},
                h('label',{className:'text-[11px] font-bold text-amber-600'},'h (secant gap): '+dh.toFixed(2)),
                h('input',{type:'range','aria-label':'Secant gap h',min:'0.02',max:'2',step:'0.02',value:dh,onChange:function(e){upd('secantH',parseFloat(e.target.value));},className:'w-full accent-amber-500'})
              )
            ),

            // Limit definition callout
            h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3'},
              h('p',{className:'text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1'},'\uD83D\uDD0D The Limit Definition of the Derivative'),
              h('p',{className:'text-xs font-mono text-amber-900 mb-2'},"f\u2032(x\u2080) = lim\u2095\u2192\u2080 [f(x\u2080 + h) \u2212 f(x\u2080)] / h"),
              h('p',{className:'text-xs text-amber-700'},'Drag h toward 0 above \u2014 watch the secant slope (\uD83D\uDFE1) converge to the true derivative (\uD83D\uDD34). When are they equal?')
            ),

            // ── POWER RULE TRAINER ────────────────────────────────────────
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 bg-emerald-50 rounded-xl border border-emerald-200 p-3' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-[11px] font-bold text-emerald-700 uppercase tracking-wider' }, '\u270F\uFE0F Power Rule Practice'),
                h('button', { "aria-label": "Calculus tool action",
                  onClick: function(){ upd('showDerivTrainer', !d.showDerivTrainer); upd('derivInputChecked', false); upd('derivInput1', ''); upd('derivInput2', ''); },
                  className: 'text-xs font-bold text-emerald-600 hover:text-emerald-800'
                }, d.showDerivTrainer ? 'Hide' : 'Try yourself \u2192')
              ),
              !d.showDerivTrainer && h('p', { className: 'text-xs text-emerald-700 italic' },
                'Before looking at the result above: apply d/dx[\u00B7] to each term of ' + fStr + '. What do you get?'
              ),
              d.showDerivTrainer && h('div', null,
                h('p', { className: 'text-sm font-bold text-emerald-800 mb-1' }, 'If f(x) = ' + buildFStr(fa, fb, fc) + ', enter f\u2032(x):'),
                h('p', { className: 'text-[11px] text-emerald-600 mb-2 italic' }, 'Rules: d/dx[ax\u00B2] = 2ax \u00B7\u00B7\u00B7 d/dx[bx] = b \u00B7\u00B7\u00B7 d/dx[c] = 0'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 flex-wrap' },
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-emerald-900' }, "f\u2032(x) = "),
                  h('input', { type:'number', step:'any', placeholder:'?', value:derivInput1, 'aria-label':'Derivative x coefficient', onChange:function(e){upd('derivInput1',e.target.value);upd('derivInputChecked',false);}, className:'w-12 text-center border-2 border-emerald-300 rounded px-1 py-0.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-emerald-900' }, 'x + '),
                  h('input', { type:'number', step:'any', placeholder:'?', value:derivInput2, 'aria-label':'Derivative constant', onChange:function(e){upd('derivInput2',e.target.value);upd('derivInputChecked',false);}, className:'w-12 text-center border-2 border-emerald-300 rounded px-1 py-0.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                  h('button', {"aria-label":"Check", disabled:derivInput1===''||derivInput2==='', onClick:function(){upd('derivInputChecked',true);stemBeep&&stemBeep('click');}, className:'ml-2 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40' }, 'Check')
                ),
                derivInputChecked && (function(){
                  var ok1=Math.abs(parseFloat(derivInput1)-2*fa)<0.01, ok2=Math.abs(parseFloat(derivInput2)-fb)<0.01, all=ok1&&ok2;
                  return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'mt-2',style:{animation:'calcPop 0.3s ease'}},
                    h('p',{className:'text-sm font-bold '+(all?'text-emerald-700':'text-red-600')},all?'\u2705 Correct! '+derivStr:'❌ Not quite:'),
                    !all && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs space-y-0.5 mt-1'},
                      h('p',{className:ok1?'text-emerald-600':'text-red-500'},(ok1?'\u2713':'\u2717')+' Coefficient of x: '+2*fa+' (d/dx['+fa+'x\u00B2] = 2\u00D7'+fa+'x = '+2*fa+'x)'),
                      h('p',{className:ok2?'text-emerald-600':'text-red-500'},(ok2?'\u2713':'\u2717')+' Constant: '+fb+' (d/dx['+fb+'x] = '+fb+')')
                    ),
                    h('button',{"aria-label":"Try again",onClick:function(){upd('derivInputChecked',false);upd('derivInput1','');upd('derivInput2','');},className:'mt-1 text-[11px] text-emerald-600 hover:underline font-bold'},'\u21BA Try again')
                  );
                })()
              )
            ),

            // Function sliders
            h('div',{className:'grid grid-cols-2 gap-2 mt-3'},
              [{k:'a',label:'a (x\u00B2)',min:-3,max:3,step:0.5},{k:'b',label:'b (x)',min:-5,max:5,step:0.5},{k:'c',label:'c (const)',min:-5,max:5,step:0.5},{k:'xMin',label:'View left',min:-5,max:3,step:0.5},{k:'xMax',label:'View right',min:1,max:10,step:0.5}].map(function(s){
                return h('div',{key:s.k,className:'text-center bg-slate-50 rounded-lg p-2 border'},
                  h('label',{className:'text-[11px] font-bold text-red-600'},s.label+': '+d[s.k]),
                  h('input',{type:'range','aria-label':s.label,min:s.min,max:s.max,step:s.step,value:d[s.k],onChange:function(e){upd(s.k,parseFloat(e.target.value));upd('derivInputChecked',false);},className:'w-full accent-red-600'})
                );
              })
            )
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: CHALLENGE
          // ══════════════════════════════════════════════════════════════
          tab === 'challenge' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: 'challenge' },

            h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex items-center gap-2 mb-3 flex-wrap'},
              h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-sm font-black text-red-800'},'\uD83C\uDFAF Calculus Challenges'),
              cScore>0 && h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'ml-auto text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border'},'\u2B50 '+cScore+' | \uD83D\uDD25 '+cStreak)
            ),
            h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex flex-wrap gap-1.5 mb-2'},
              CALC_CHALLENGES.map(function(cm){
                return h('button',{ "aria-label": "Start Calc Challenge",key:cm.id,onClick:function(){upd('calcChallengeMode',cm.id);upd('calcQuiz',null);upd('calcHint','');},className:'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all '+(cMode===cm.id?'bg-'+cm.color+'-600 text-white shadow-md':'bg-slate-100 text-slate-600 hover:bg-slate-200')},cm.label);
              })
            ),
            h('p',{className:'text-[11px] text-slate-600 italic mb-3'},
              cMode==='estimate'?'Pick the correct definite integral value from 4 choices.':
              cMode==='overunder'?'Decide if the Riemann sum is an over or underestimate — and understand why.':
              cMode==='method'?'Which approximation method gives the smallest error?':
              cMode==='minN'?'Find the minimum n to hit a precision target.':
              cMode==='exact'?'Apply the power rule: compute the exact integral by hand.':
              'Apply the power rule: compute f\u2032(x\u2080).'
            ),
            h('button',{ "aria-label": "Calculus tool action",onClick:startCalcChallenge,className:'px-4 py-2 rounded-lg text-xs font-bold mb-3 transition-all '+(cq?'bg-slate-100 text-slate-600 hover:bg-slate-200':'bg-red-600 text-white hover:bg-red-700 shadow-md')},cq?'\uD83D\uDD04 New Challenge':'\uD83D\uDE80 Start Challenge'),
            cq && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'mb-3'},svgGraph(cMode==='deriv',cMode!=='deriv'&&cMode!=='overunder')),
            cq && !cq.answered && cMode!=='exact' && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-red-50 rounded-xl p-4 border border-red-200 animate-in fade-in'},
              h('p',{className:'text-sm font-bold text-red-800 mb-3'},cq.question),
              h('div',{className:'grid grid-cols-2 gap-2'},
                (cMode==='overunder'
                  ? [{id:'over',label:'\u2B06 OVERestimate'},{id:'under',label:'\u2B07 UNDERestimate'}]
                  : cMode==='method'?cq.opts:cq.opts.map(function(o){return{id:o,label:cMode==='minN'?'n = '+o:String(o)};})
                ).map(function(opt){
                  return h('button',{ "aria-label": "Calculus tool action",key:String(opt.id),onClick:function(){checkCalcAnswer(opt.id);stemBeep&&stemBeep('click');},className:'px-3 py-2.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all'},opt.label);
                })
              )
            ),
            cq && !cq.answered && cMode==='exact' && h('div',{className:'bg-emerald-50 rounded-xl p-4 border border-emerald-200'},
              h('p',{className:'text-sm font-bold text-emerald-800 mb-1'},cq.question),
              h('p',{className:'text-[11px] text-emerald-600 mb-3 italic'},'\u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1) + C'),
              h('div',{className:'flex gap-2'},
                h('input',{type:'number',step:'any',autoFocus:true,value:d._calcExactInput||'',onChange:function(e){upd('_calcExactInput',e.target.value);},onKeyDown:function(e){if(e.key==='Enter'&&d._calcExactInput)checkCalcAnswer(d._calcExactInput);},'aria-label': 'Exact calculus answer',placeholder:'Type exact value\u2026',className:'flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 text-sm font-bold bg-white outline-none focus:border-emerald-500'}),
                h('button',{"aria-label":"Check",onClick:function(){if(d._calcExactInput)checkCalcAnswer(d._calcExactInput);},className:'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700'},'Check \u2192')
              )
            ),
            cq && cq.answered && h('div',{className:'p-3 rounded-xl text-sm font-bold mb-2 '+(cq.correct?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'),style:{animation:cq.correct?'calcCorrect 0.5s ease':'calcWrong 0.4s ease'}},
              cq.correct?'\u2705 Correct! '+cq.answer:'\u274C Correct answer: '+cq.answer,
              cq.correct && cStreak>=3 && h('span',{className:'ml-2 text-amber-600'},'\uD83D\uDD25 '+cStreak+'-streak!')
            ),
            cHint && h('div',{className:'bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-800',style:{animation:'calcFade 0.3s ease'}},h('span',{className:'font-bold'},'\uD83D\uDCA1 Explanation: '),cHint),
            cq&&cq.answered&&cMode==='method'&&cq.errors&&h('div',{className:'mt-2 bg-slate-50 rounded-lg p-2 border'},
              h('p',{className:'text-[11px] font-bold text-slate-600 uppercase mb-1'},'Error comparison (n='+cq.n+')'),
              h('div',{className:'grid grid-cols-5 gap-1 text-center'},['left','right','midpoint','trapezoid','simpson'].map(function(m){
                return h('div',{key:m,className:'px-1 py-1 rounded text-[11px] font-bold '+(m===cq.answer?'bg-emerald-100 text-emerald-700 border border-emerald-300':'bg-white text-slate-600 border')},
                  h('div',null,m==='simpson'?'Simp':m.charAt(0).toUpperCase()+m.slice(1,4)),h('div',{className:'text-[11px]'},cq.errors[m].toFixed(4)));
              }))
            )
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: DISCOVER (Guided Missions)
          // ══════════════════════════════════════════════════════════════
          tab === 'discover' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: 'discover' },

            h('p',{className:'text-xs text-slate-600 italic mb-3'},'Guided investigations \u2014 you measure, predict, and find the pattern. The tool is your calculator, not your teacher.'),

            // Mission selector
            h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 mb-4 flex-wrap'},
              ['\uD83D\uDD0D Error & n','\u26A1 Method Showdown','\uD83D\uDCCF Find the Rule','\uD83D\uDE97 Area as Distance'].map(function(label,i){
                return h('button',{ "aria-label": "Calculus tool action",key:i,onClick:function(){upd('missionIdx',i);upd('missionStep',0);upd('missionData',{});},className:'px-3 py-1.5 rounded-lg text-xs font-bold transition-all '+((d.missionIdx||0)===i?'bg-red-600 text-white shadow-md':'bg-slate-100 text-slate-600 hover:bg-slate-200')},label);
              })
            ),

            // ── MISSION 0: How does error change with n? ──────────────────
            (d.missionIdx||0) === 0 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key, val){ upd('missionData', Object.assign({}, data, { [key]: val })); };

              return h('div',{style:{animation:'calcFade 0.3s ease'}},
                h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-red-50 rounded-xl border border-red-200 p-4 mb-3'},
                  h('p',{ id: 'err-stem_tool_calculus-724', role: 'alert',className:'text-xs font-bold text-red-600 uppercase tracking-wider mb-1'},'\uD83D\uDD0D Mission 1: The Error Halving Law'),
                  h('p',{ id: 'err-stem_tool_calculus-725', role: 'alert',className:'text-xs text-red-800'},'Goal: Discover what happens to the error when you double the number of rectangles.'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-1 mt-2'},
                    [0,1,2,3,4].map(function(i){
                      return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-red-500':step===i?'bg-red-300':'bg-slate-200')});
                    })
                  )
                ),

                // Step 0: Setup + first observation
                step === 0 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 Set up the investigation'),
                  h('p',{className:'text-xs text-slate-600 mb-3'},'Click this preset to load f(x) = x\u00B2 with bounds [0,3] and left Riemann sums. Then switch to the Integral tab to see the graph.'),
                  h('button',{ "aria-label": "Calculus tool action",onClick:function(){
                    setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{a:1,b:0,c:0,xMin:0,xMax:3,n:4,mode:'left',tab:'discover',predictMode:false,overUnderChecked:false})});});
                    addToast('Loaded \u222B x\u00B2 [0,3] with n=4, Left Riemann','success');
                    stemBeep&&stemBeep('click');
                  },className:'px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all mb-3'},'\u25B6 Load f(x) = x\u00B2 [0,3], n=4'),
                  h('p',{className:'text-xs text-slate-700 mb-2 font-bold'},'Now go to the Integral tab and find the error value for n=4. Come back and enter it below:'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold text-slate-600'},'Error at n=4:'),
                    h('input',{type:'number',step:'any',placeholder:'0.????',value:data.err4||'','aria-label':'Error for n equals 4',onChange:function(e){saveData('err4',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":"Got it",disabled:!data.err4,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},'Got it \u2192')
                  )
                ),

                // Step 1: Double n, predict first
                step === 1 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 Make a prediction before looking'),
                  h('p',{className:'text-xs text-slate-600 mb-2'},'You recorded error \u2248 '+(parseFloat(data.err4)||0).toFixed(4)+' at n=4. Now you will double n to 8.'),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-3'},'Before changing the slider: predict the new error. Will it be:'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'grid grid-cols-2 gap-2 mb-3'},
                    [['same','About the same'],['half','About half ('+((parseFloat(data.err4)||0)/2).toFixed(4)+')'],['quarter','About a quarter ('+((parseFloat(data.err4)||0)/4).toFixed(4)+')'],['smaller','Much smaller (near 0)']].map(function(item){
                      return h('button',{ "aria-label": "Next Step",key:item[0],onClick:function(){saveData('prediction1',item[0]);},className:'px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.prediction1===item[0]?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-600 border-slate-200 hover:border-violet-400')},item[1]);
                    })
                  ),
                  data.prediction1 && h('button',{"aria-label":"Locked in  now measure",onClick:nextStep,className:'px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700'},'Locked in \u2014 now measure \u2192')
                ),

                // Step 2: Measure n=8
                step === 2 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2462 Measure at n=8'),
                  h('p',{className:'text-xs text-slate-600 mb-3'},'Go to the Integral tab, set n=8 (using the slider), and record the error:'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center mb-3'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold text-slate-600'},'Error at n=8:'),
                    h('input',{type:'number',step:'any',placeholder:'0.????',value:data.err8||'','aria-label':'Error for n equals 8',onChange:function(e){saveData('err8',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":"Got it",disabled:!data.err8,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},'Got it \u2192')
                  )
                ),

                // Step 3: Find the ratio + predict n=16
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2463 Find the pattern'),
                  (function(){
                    var e4=parseFloat(data.err4)||1, e8=parseFloat(data.err8)||1;
                    var ratio=(e4/e8).toFixed(2);
                    return h('div',null,
                      h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-white rounded-lg border p-3 mb-3'},
                        h('p',{className:'text-xs text-slate-600'},'Error at n=4: '+e4.toFixed(4)),
                        h('p',{className:'text-xs text-slate-600'},'Error at n=8: '+e8.toFixed(4)),
                        h('p',{className:'text-sm font-bold text-red-700 mt-1'},'Ratio: '+e4.toFixed(4)+' \u00F7 '+e8.toFixed(4)+' = '+ratio),
                        h('p',{className:'text-xs text-slate-600 italic mt-1'},'When n doubled (4\u21928), error was divided by about '+ratio+'.')
                      ),
                      h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Now predict: what will the error be at n=16? (Hint: apply the same ratio again)'),
                      h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center'},
                        h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold text-slate-600'},'Predicted error at n=16:'),
                        h('input',{type:'number',step:'any',placeholder:'0.????',value:data.predictN16||'','aria-label':'Predicted error for n equals 16',onChange:function(e){saveData('predictN16',e.target.value);},className:'w-24 px-2 py-1 border-2 border-violet-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                        h('button',{"aria-label":"Predict locked",disabled:!data.predictN16,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},'Predict locked \u2192')
                      )
                    );
                  })()
                ),

                // Step 4: Verify + conclude
                step === 4 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2464 Verify and conclude'),
                  h('p',{className:'text-xs text-slate-600 mb-2'},'Set n=16 on the Integral tab and record the actual error. Then compare to your prediction.'),
                  h('div',{className:'flex gap-2 items-center mb-3'},
                    h('span',{className:'text-xs font-bold text-slate-600'},'Actual error at n=16:'),
                    h('input',{type:'number',step:'any',placeholder:'0.????',value:data.err16||'','aria-label':'Error for n equals 16',onChange:function(e){saveData('err16',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'})
                  ),
                  data.err16 && (function(){
                    var pred=parseFloat(data.predictN16)||0, actual=parseFloat(data.err16)||0;
                    var pctOff=pred!==0?Math.abs(pred-actual)/Math.abs(pred)*100:0;
                    return h('div',{style:{animation:'calcFade 0.3s ease'}},
                      h('div',{className:'bg-emerald-50 rounded-xl border border-emerald-200 p-3 mb-3'},
                        h('p',{className:'text-sm font-bold text-emerald-700 mb-1'},'\uD83C\uDF89 '+(pctOff<10?'Excellent prediction! You nailed it!':pctOff<25?'Good prediction!':'Not bad \u2014 the pattern is approximately correct.')),
                        h('p',{className:'text-xs text-emerald-800'},'Your prediction: '+pred.toFixed(4)+' \u00B7\u00B7\u00B7 Actual: '+actual.toFixed(4)+' \u00B7\u00B7\u00B7 '+pctOff.toFixed(0)+'% off')
                      ),
                      h('div',{className:'bg-slate-50 rounded-xl border p-3'},
                        h('p',{className:'text-xs font-bold text-slate-700 uppercase tracking-wider mb-2'},'\uD83D\uDCCC The Big Idea'),
                        h('p',{className:'text-xs text-slate-700 mb-1'},'For Left Riemann sums: when n doubles, the error is divided by approximately \u00B72 (halved).'),
                        h('p',{className:'text-xs text-slate-700 mb-1'},'This means error \u221D 1/n \u2014 the error shrinks linearly with n.'),
                        h('p',{className:'text-xs text-slate-700'},'Try the Trapezoid method: does it shrink faster? (Trapezoid error \u221D 1/n\u00B2 \u2014 it halves the error when n doubles, but halves \u2248 twice as fast overall!)'),
                        h('p',{className:'text-xs font-bold text-red-600 mt-2'},"And Simpson's? Test it on your own!"),
                        awardStemXP&&awardStemXP('calculus',15,'Mission 1 complete')
                      )
                    );
                  })()
                )
              );
            })(),

            // ── MISSION 1: Method Showdown ────────────────────────────────
            (d.missionIdx||0) === 1 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-amber-50 rounded-xl border border-amber-200 p-4 mb-3'},
                  h('p',{className:'text-xs font-bold text-amber-600 uppercase tracking-wider mb-1'},'\u26A1 Mission 2: Method Showdown'),
                  h('p',{className:'text-xs text-amber-800'},'Goal: Discover which integration method is most accurate, and why.'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-1 mt-2'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-amber-500':step===i?'bg-amber-300':'bg-slate-200')});}))
                ),
                step === 0 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 Predict before you test'),
                  h('button',{"aria-label":"Load f(x) = x [0,3], n=6",onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{a:1,b:0,c:0,xMin:0,xMax:3,n:6,mode:'left',tab:'discover'})});});addToast('Loaded for Method Showdown','success');},className:'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-600 mb-3 block'},'\u25B6 Load f(x) = x\u00B2 [0,3], n=6'),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'At n=6, which method do you predict will be MOST accurate?'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'grid grid-cols-3 gap-2 mb-3'},
                    ['Left Riemann','Right Riemann','Midpoint','Trapezoidal',"Simpson's"].map(function(m){
                      return h('button',{ "aria-label": "Next Step",key:m,onClick:function(){saveData('prediction',m);},className:'px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.prediction===m?'bg-amber-700 text-white border-amber-500':'bg-white text-slate-600 border-slate-200 hover:border-amber-300')},m);
                    })
                  ),
                  data.prediction && h('button',{"aria-label":"Prediction locked",onClick:nextStep,className:'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700'},'Prediction locked \u2192')
                ),
                step === 1 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 Measure errors for all 5 methods'),
                  h('p',{className:'text-xs text-slate-600 mb-3'},'Switch to the Challenge tab, select "Best Method" mode, click Start. The error comparison table appears after you answer. OR: go to Integral tab, try each mode, record errors.'),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Which method had the SMALLEST error?'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'grid grid-cols-3 gap-2 mb-3'},
                    ['Left','Right','Midpoint','Trapezoidal',"Simpson's"].map(function(m){
                      return h('button',{ "aria-label": "Next Step",key:m,onClick:function(){saveData('measured',m);},className:'px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.measured===m?'bg-emerald-700 text-white border-emerald-500':'bg-white text-slate-600 border-slate-200 hover:border-emerald-300')},m);
                    })
                  ),
                  data.measured && h('button',{"aria-label":"Next",onClick:nextStep,className:'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700'},'Next \u2192')
                ),
                step === 2 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2462 Were you right?'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-white rounded-lg border p-3 mb-3'},
                    h('p',{className:'text-xs text-slate-600'},'You predicted: '+data.prediction),
                    h('p',{className:'text-xs text-slate-600'},'Most accurate was: '+data.measured),
                    h('p',{className:'text-sm font-bold '+(data.prediction===data.measured?'text-emerald-600':'text-slate-700')+' mt-1'},data.prediction===data.measured?'\u2705 You predicted correctly!':'\uD83D\uDCA1 The result might have surprised you.')
                  ),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},"Why is Simpson's usually most accurate for polynomials?"),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'grid grid-cols-2 gap-2 mb-3'},
                    ['It uses parabolas — which fit polynomial curves better than flat-top rectangles','It uses the most rectangles','It averages left and right','It avoids the edges of the curve'].map(function(ans,i){
                      return h('button',{ "aria-label": "Next Step",key:i,onClick:function(){saveData('why',i);},className:'px-2 py-2 rounded-lg text-xs text-left border-2 transition-all '+(data.why===i?'bg-amber-700 text-white border-amber-500':'bg-white text-slate-600 border-slate-200 hover:border-amber-300')},ans);
                    })
                  ),
                  data.why !== undefined && h('button',{"aria-label":"See answer",onClick:nextStep,className:'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-700'},'See answer \u2192')
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2463 The Big Idea'),
                  h('div',{className:'bg-amber-50 rounded-xl border border-amber-200 p-3'},
                    h('p',{className:'text-sm font-bold text-amber-800 mb-2'},(data.why===0?'\u2705 Exactly right!':'\uD83D\uDCA1 The real reason:')+' Simpson\u2019s fits parabolic arcs to the curve.'),
                    h('p',{className:'text-xs text-amber-800 mb-1'},"Since f(x) = x\u00B2 IS already a parabola, Simpson's rule fits it perfectly \u2014 giving zero error!"),
                    h('p',{className:'text-xs text-amber-800 mb-1'},"In fact: Simpson's rule is EXACT for any polynomial of degree \u2264 3."),
                    h('p',{className:'text-xs font-bold text-amber-900 mt-2'},"Test it: set Simpson's with n=2. Is the error 0? Now try n=4. What pattern do you see?"),
                    awardStemXP&&awardStemXP('calculus',15,'Mission 2 complete')
                  )
                )
              );
            })(),

            // ── MISSION 2: Find the Power Rule ───────────────────────────
            (d.missionIdx||0) === 2 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-violet-50 rounded-xl border border-violet-200 p-4 mb-3'},
                  h('p',{className:'text-xs font-bold text-violet-600 uppercase tracking-wider mb-1'},'\uD83D\uDCCF Mission 3: Discover the Power Rule'),
                  h('p',{className:'text-xs text-violet-800'},'Goal: By measuring slopes, you will discover f\u2032(x) = 2ax + b yourself \u2014 before being told.'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-1 mt-2'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-violet-500':step===i?'bg-violet-300':'bg-slate-200')});}))
                ),
                step === 0 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 Set up and measure'),
                  h('button',{"aria-label":"Load f(x) = x, x=1",onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{a:1,b:0,c:0,xMin:-1,xMax:4,n:20,mode:'left',x0:1,secantH:0.1,tab:'discover'})});});addToast('Loaded f(x) = x\u00B2','success');},className:'px-4 py-2 bg-violet-700 text-white rounded-lg text-xs font-bold hover:bg-violet-600 mb-3 block'},'\u25B6 Load f(x) = x\u00B2, x\u2080=1'),
                  h('p',{className:'text-xs text-slate-600 mb-2'},'Go to the Derivative tab. Drag h close to 0. The slope shown is f\u2032(1). Record it:'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'space-y-2'},
                    [['1','slope1'],['2','slope2'],['3','slope3']].map(function(item){
                      return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },key:item[0],className:'flex gap-2 items-center'},
                        h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold text-slate-600 w-24'},'f\u2032('+item[0]+') ='),
                        h('input',{type:'number',step:'any',placeholder:'?',value:data[item[1]]||'',onChange:function(e){saveData(item[1],e.target.value);},className:'w-20 px-2 py-1 border-2 border-violet-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'})
                      );
                    })
                  ),
                  data.slope1 && data.slope2 && data.slope3 && h('button',{"aria-label":"Got all three",onClick:nextStep,className:'mt-3 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700'},'Got all three \u2192')
                ),
                step === 1 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 Spot the pattern'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-white rounded-lg border p-3 mb-3'},
                    ['1','2','3'].map(function(x,i){
                      var key=['slope1','slope2','slope3'][i];
                      return h('p',{key:x,className:'text-xs text-slate-700'},'f\u2032('+x+') = '+(data[key]||'?'));
                    })
                  ),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'What formula produces these values? f\u2032(x) = ___'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'grid grid-cols-2 gap-2 mb-3'},
                    ['2x','x\u00B2','x + 1','x/2'].map(function(f){
                      return h('button',{ "aria-label": "Next Step",key:f,onClick:function(){saveData('formulaGuess',f);},className:'px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all '+(data.formulaGuess===f?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-600 border-slate-200 hover:border-violet-400')},f);
                    })
                  ),
                  data.formulaGuess && h('button',{"aria-label":"Check answer",onClick:nextStep,className:'px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700'},'Check answer \u2192')
                ),
                step === 2 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2462 You found it!'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-violet-50 rounded-xl border border-violet-200 p-3 mb-3'},
                    h('p',{className:'text-sm font-bold text-violet-800 mb-1'},(data.formulaGuess==='2x'?'\u2705 Yes! f\u2032(x) = 2x.':'\uD83D\uDCA1 Actually: f\u2032(x) = 2x.')),
                    h('p',{className:'text-xs text-violet-700 mb-1'},'For f(x) = x\u00B2: the derivative is 2x.'),
                    h('p',{className:'text-xs text-violet-700'},'This is the Power Rule: d/dx[x\u207F] = n\u00B7x\u207F\u207B\u00B9. For n=2: d/dx[x\u00B2] = 2x\u00B9 = 2x.')
                  ),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Now change a=2 (f(x) = 2x\u00B2) on the Derivative tab. Measure f\u2032(1). What do you predict?'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center mb-3'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold'},'f\u2032(1) for 2x\u00B2:'),
                    h('input',{type:'number',step:'any',placeholder:'?',value:data.slope2x||'',onChange:function(e){saveData('slope2x',e.target.value);},className:'w-20 px-2 py-1 border-2 border-violet-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":"Verify",disabled:!data.slope2x,onClick:nextStep,className:'px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-violet-700'},'Verify \u2192')
                  )
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('div',{className:'bg-violet-50 rounded-xl border border-violet-200 p-3'},
                    h('p',{className:'text-sm font-bold text-violet-800 mb-2'},'\uD83C\uDF89 The General Power Rule'),
                    h('p',{className:'text-xs text-violet-800 mb-1'},'You measured: for f(x) = 2x\u00B2, f\u2032(1) \u2248 '+(data.slope2x||'?')+'. (Should be 4 = 2\u00D72\u00D71)'),
                    h('p',{className:'text-xs text-violet-800 mb-1'},'General rule: d/dx[ax\u00B2 + bx + c] = 2ax + b'),
                    h('p',{className:'text-xs text-violet-800 mb-2'},'The constant c vanishes because a horizontal line has zero slope.'),
                    h('p',{className:'text-xs font-bold text-violet-900'},'Try: add b=3. What is f\u2032(0) now? What does f\u2032(0) equal in terms of b? (Answer: b itself!)'),
                    awardStemXP&&awardStemXP('calculus',15,'Mission 3 complete')
                  )
                )
              );
            })(),

            // ── MISSION 3: Area as Distance ───────────────────────────────
            (d.missionIdx||0) === 3 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              return h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-3'},
                  h('p',{className:'text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1'},'\uD83D\uDE97 Mission 4: Area as Accumulated Distance'),
                  h('p',{className:'text-xs text-emerald-800'},'Goal: Understand why the area under a velocity curve equals distance traveled.'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-1 mt-2'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-emerald-500':step===i?'bg-emerald-300':'bg-slate-200')});}))
                ),
                step === 0 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 The setup'),
                  h('p',{className:'text-xs text-slate-700 mb-2'},'A car starts from rest. Its velocity (in m/s) at time t seconds is:'),
                  h('p',{className:'text-base font-black text-emerald-700 text-center mb-2'},'v(t) = 2t m/s'),
                  h('p',{className:'text-xs text-slate-700 mb-3'},'The x-axis is time (seconds), the y-axis is velocity (m/s). The area under the velocity curve is the total distance traveled.'),
                  h('button',{"aria-label":"Load v(t) = 2t, t  [0,3]",onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{a:0,b:2,c:0,xMin:0,xMax:3,n:20,mode:'left',tab:'discover'})});});addToast('Loaded v(t) = 2t from t=0 to t=3','success');},className:'px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 mb-3 block'},'\u25B6 Load v(t) = 2t, t \u2208 [0,3]'),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Before computing: the velocity graph from t=0 to t=3 is a triangle. What is the area of this triangle?'),
                  h('p',{className:'text-xs text-slate-600 mb-2'},'(Hint: Area of triangle = \u00BD \u00D7 base \u00D7 height. Base = 3, height = v(3) = 2\u00D73 = ?)'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold'},'My triangle area:'),
                    h('input',{type:'number',step:'any',placeholder:'? m',value:data.triangleArea||'',onChange:function(e){saveData('triangleArea',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs text-slate-600'},'meters'),
                    h('button',{"aria-label":"Got it",disabled:!data.triangleArea,onClick:nextStep,className:'px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-700'},'Got it \u2192')
                  )
                ),
                step === 1 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 Verify with Riemann sums'),
                  h('p',{className:'text-xs text-slate-600 mb-2'},'Go to the Integral tab. The exact value shown is the definite integral of v(t) = 2t from 0 to 3. What is it?'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center mb-3'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold'},'Integral value:'),
                    h('input',{type:'number',step:'any',placeholder:'?',value:data.integralVal||'',onChange:function(e){saveData('integralVal',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":"Verify",disabled:!data.integralVal,onClick:nextStep,className:'px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-700'},'Verify \u2192')
                  )
                ),
                step === 2 && h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },style:{animation:'calcFade 0.3s ease'}},
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'bg-emerald-50 rounded-xl border border-emerald-200 p-3 mb-3'},
                    h('p',{className:'text-sm font-bold text-emerald-700 mb-2'},'\u2462 They match!'),
                    h('p',{className:'text-xs text-emerald-800 mb-1'},'Triangle area: '+data.triangleArea+' m'),
                    h('p',{className:'text-xs text-emerald-800 mb-1'},'Definite integral: '+data.integralVal+' m'),
                    h('p',{className:'text-xs font-bold text-emerald-900 mt-2'},(Math.abs(parseFloat(data.triangleArea||9)-9)<0.5?'\u2705 Both give 9 meters! The car traveled 9 meters in 3 seconds.':'\uD83D\uDCA1 Both should give 9 m. Triangle: \u00BD\u00D73\u00D76 = 9. Check your triangle calculation!'))
                  ),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Why does this work? Each thin rectangle has width \u0394t (time) and height v(t) (velocity). Area = v(t)\u00D7\u0394t = distance. Add them all up \u2192 total distance. This is exactly what integration does!'),
                  h('p',{className:'text-xs font-bold text-slate-700 mb-2'},'Extension: change xMax to 5. How far does the car travel in 5 seconds? Predict first!'),
                  h('div',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'flex gap-2 items-center'},
                    h('span',{ role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },className:'text-xs font-bold'},'Distance in 5s (predicted):'),
                    h('input',{type:'number',step:'any',placeholder:'? m',value:data.predict5||'',onChange:function(e){saveData('predict5',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":"Test it",disabled:!data.predict5,onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{xMax:5,tab:'discover'})});});nextStep();},className:'px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-700'},'Test it \u2192')
                  )
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('div',{className:'bg-emerald-50 rounded-xl border border-emerald-200 p-3'},
                    h('p',{className:'text-sm font-bold text-emerald-700 mb-2'},'\uD83C\uDF89 Mission Complete!'),
                    h('p',{className:'text-xs text-emerald-800 mb-1'},'Distance in 5s = \u00BD\u00D75\u00D710 = 25 m. Did your prediction match?'),
                    h('p',{className:'text-xs text-emerald-800 mb-2'},'The Fundamental Theorem of Calculus says: \u222B\u2080\u1D57 v(t) dt = position at time t \u2212 position at t=0.'),
                    h('p',{className:'text-xs font-bold text-emerald-900'},"Real applications: physicists use this to calculate trajectories, economists to find accumulated profit, biologists to model population growth. The area under ANY rate curve gives the total accumulated quantity."),
                    awardStemXP&&awardStemXP('calculus',20,'Mission 4 complete')
                  )
                )
              );
            })()

          ), // end discover tab

          // ══════════════════════════════════════════════════════════════
          // TAB: VISUALIZE  (canvas-based pedagogical views)
          // Pedagogy: show intuition BEFORE formulas.
          // ══════════════════════════════════════════════════════════════
          tab === 'visualize' && h('div', { key: 'visualize' },
            (function() {
              var vizView = d.vizView || 'zoom';
              var vizFn   = d.vizFn   || 'quadratic';
              var VIEWS = [
                { id: 'zoom',    icon: '\uD83D\uDD0D', label: 'Zoom',          desc: 'Zoom to Linearity \u2014 what is a derivative? (Shift+1)' },
                { id: 'tangent', icon: '\uD83D\uDCCD', label: 'Tangent',       desc: 'Tangent explorer \u2014 derivative as a function (Shift+2)' },
                { id: 'motion',  icon: '\uD83D\uDE97', label: 'Motion',        desc: 'Position / Velocity / Acceleration (Shift+3)' },
                { id: 'riemann', icon: '\uD83C\uDFAC', label: 'Riemann',       desc: 'Animated Riemann convergence (Shift+4)' },
                { id: 'ftc',     icon: '\u2B50',       label: 'FTC',           desc: 'The Fundamental Theorem of Calculus (Shift+5)' },
                { id: 'slope',   icon: '\uD83C\uDF0A', label: 'Slope Fields',  desc: 'Visualize ODEs without solving them (Shift+6)' }
              ];
              return h(React.Fragment, null,
                // Header strip
                h('div', { className: 'flex items-center gap-2 mb-2 text-xs text-slate-600' },
                  h('span', { className: 'font-bold' }, 'Visualize'),
                  h('span', { className: 'text-slate-400' }, '\u2022'),
                  h('span', {}, 'See the ideas before you see the formulas'),
                  h('span', { className: 'ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full' }, 'LIVE CANVAS')
                ),
                // Sub-view selector
                h('div', { className: 'flex gap-1.5 flex-wrap text-xs font-bold mb-2', role: 'tablist', 'aria-label': 'Calculus visualization view' },
                  VIEWS.map(function(v, vi) {
                    var active = vizView === v.id;
                    return h('button', {
                      key: v.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                      onClick: function() { upd('vizView', v.id); },
                      title: v.desc,
                      'aria-keyshortcuts': 'Shift+' + (vi + 1),
                      className: 'px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ' + (active
                        ? 'bg-red-500 border-red-600 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-red-400')
                    }, v.icon + ' ' + v.label);
                  })
                ),
                // Function picker (shown only for views that use it)
                (vizView === 'zoom' || vizView === 'tangent' || vizView === 'ftc' || vizView === 'riemann') &&
                h('div', { className: 'flex gap-1 flex-wrap text-[11px] mb-2' },
                  h('span', { className: 'text-slate-500 font-semibold self-center mr-1' }, 'f(x) ='),
                  Object.keys(CALC_FUNCS).map(function(fid) {
                    var active = vizFn === fid;
                    return h('button', {
                      key: fid,
                      onClick: function() { upd('vizFn', fid); },
                      className: 'px-2 py-1 rounded border font-mono font-bold transition-all ' + (active
                        ? 'bg-indigo-500 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400')
                    }, CALC_FUNCS[fid].label);
                  })
                ),
                // Canvas wrapper (fullscreen target)
                h('div', {
                  id: 'calc-viz-wrap',
                  className: 'relative rounded-xl overflow-hidden border-2 border-indigo-300',
                  style: { height: '380px', width: '100%', background: '#0f172a' }
                },
                  h('canvas', {
                    ref: _vizCvRef,
                    role: 'img',
                    'aria-label': 'Calculus visualization canvas: ' + (VIEWS.find(function(v){return v.id===vizView;}) || {}).desc,
                    style: { width: '100%', height: '100%', display: 'block' }
                  }),
                  h('button', {
                    onClick: function() {
                      var el = document.getElementById('calc-viz-wrap');
                      if (!el) return;
                      if (document.fullscreenElement) { document.exitFullscreen(); }
                      else if (el.requestFullscreen) { el.requestFullscreen(); }
                    },
                    title: 'Toggle fullscreen',
                    'aria-label': 'Toggle fullscreen',
                    className: 'absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/70 text-indigo-200 hover:bg-slate-900/90 text-sm font-bold'
                  }, '\u26F6')
                ),
                // Per-view explainer strip
                h('div', { className: 'mt-2 text-[11px] text-slate-600 leading-relaxed' },
                  vizView === 'zoom'    && 'Drag the zoom slider. Watch any smooth curve become a straight line up close. That local slope IS the derivative.',
                  vizView === 'tangent' && 'Drag the x-marker below. As you scan, the tangent line swings; f\u2032(x) traces itself on the right panel.',
                  vizView === 'motion'  && 'Drag the position curve. Velocity = slope; acceleration = slope of velocity. Three panels update live.',
                  vizView === 'riemann' && 'Watch n grow from 1 \u2192 256. All four Riemann methods converge to the true area \u2014 but at different speeds.',
                  vizView === 'ftc'     && 'THE payoff: drag x. Accumulated area A(x) is plotted on the right \u2014 its slope at every x is exactly f(x). That\u2019s the Fundamental Theorem.',
                  vizView === 'slope'   && 'Each arrow is the slope dy/dx at that point. Click anywhere to drop a solution curve that flows along the field.'
                )
              );
            })()
          ),

          // ── AI Calculus Tutor (reading-level aware) ──
          (function () {
            var aiLevel = d.aiLevel || 'grade5';
            var aiText = d.aiExplain || '';
            var aiLoading = !!d.aiLoading;
            var aiError = d.aiError || '';
            var LEVELS = [
              { id: 'plain', label: 'Plain', hint: 'using simple everyday words and short sentences, no jargon' },
              { id: 'grade5', label: 'Grade 5', hint: 'for a 5th grade student, with a concrete everyday example' },
              { id: 'hs', label: 'AP Calc', hint: 'for an AP Calculus student, using proper calculus terminology' }
            ];
            function save(k, v) {
              setLabToolData(function (prev) { return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, (function(){var o={};o[k]=v;return o;})()) }); });
            }
            function explain() {
              if (typeof callGemini !== 'function') { save('aiError', 'AI tutor not available.'); return; }
              save('aiLoading', true); save('aiError', ''); save('aiExplain', '');
              var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
              var fnStr = (d.a || 1) + 'x\u00B2 + ' + (d.b || 0) + 'x + ' + (d.c || 0);
              var tabLabel = tab === 'integral' ? 'Integral (Riemann sums)' : tab === 'derivative' ? 'Derivative (slope)' : tab === 'challenge' ? 'Challenge' : 'Discover';
              var prompt = 'Explain what this calculus tool is showing ' + lv.hint + '. '
                + 'Current tab: ' + tabLabel + '. Function: f(x) = ' + fnStr + ' on [' + (d.xMin || 0) + ', ' + (d.xMax || 3) + '] with n=' + (d.n || 20) + ' ' + (mode || 'left') + ' rectangles. '
                + 'In 3 short sentences: (1) What the student is computing. (2) Why this method works (intuition first). (3) One real-world place this shows up. '
                + 'No markdown, no bullets, no headings. Plain prose.';
              callGemini(prompt, false, false, 0.5).then(function (resp) {
                save('aiExplain', String(resp || '').trim()); save('aiLoading', false);
                if (typeof announceToSR === 'function') announceToSR('Explanation ready.');
              }).catch(function () {
                save('aiLoading', false); save('aiError', 'Could not reach AI tutor. Try again in a moment.');
              });
            }
            return h('div', { className: 'mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50', role: 'region', 'aria-label': 'AI calculus tutor' },
              h('div', { className: 'flex items-center flex-wrap gap-2 mb-1.5' },
                h('span', { className: 'text-sm font-bold text-purple-700' }, '\u2728 Explain at my level'),
                h('div', { className: 'ml-auto flex gap-1', role: 'group', 'aria-label': 'Reading level' },
                  LEVELS.map(function (L) {
                    var active = aiLevel === L.id;
                    return h('button', {
                      key: L.id,
                      onClick: function () { save('aiLevel', L.id); },
                      'aria-label': 'Reading level: ' + L.label + (active ? ' (selected)' : ''),
                      'aria-pressed': active,
                      className: 'px-2 py-0.5 rounded text-[10px] font-bold ' + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100')
                    }, L.label);
                  })
                ),
                h('button', {
                  onClick: explain,
                  disabled: aiLoading,
                  'aria-label': 'Generate AI explanation at ' + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + ' level',
                  className: 'px-3 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
              ),
              aiError && h('p', { className: 'text-[11px] text-rose-600', role: 'alert' }, aiError),
              aiText && h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100' }, aiText),
              !aiText && !aiLoading && !aiError && h('p', { className: 'text-[11px] italic text-slate-500' }, 'Click \u201CExplain\u201D for the AI tutor to describe what you\u2019re computing right now.')
            );
          })()

        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_calculus.js loaded');
})();
