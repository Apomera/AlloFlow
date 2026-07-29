// ═══════════════════════════════════════════
// stem_tool_artstudio.js — STEM Lab Art Studio Tools
// Renamed from stem_tool_creative.js (stem_tool_art.js was the obsolete duplicate)
// 2 registered tools: artStudio, gameStudio
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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


  // ── Audio (auto-injected) ──
  var _artAC = null;
  function getArtAC() { if (!_artAC) { try { _artAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_artAC && _artAC.state === "suspended") { try { _artAC.resume(); } catch(e) {} } return _artAC; }
  function artTone(f,d,tp,v) { var ac = getArtAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxArtClick() { artTone(600, 0.03, "sine", 0.04); }
  function sfxArtSuccess() { artTone(523, 0.08, "sine", 0.07); setTimeout(function() { artTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { artTone(784, 0.1, "sine", 0.08); }, 140); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-artstudio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-artstudio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ dataPlot → extracted to stem_tool_dataplot.js ═══

  // ═══ 🔬 artStudio (artStudio) ═══
  window.StemLab.registerTool('artStudio', {
    icon: "🎨",
    label: "Art & Design Studio",
    desc: "Explore the math behind art: color theory, pixel art, symmetry, spirographs, fractals, generative design, and WCAG contrast.",
    color: 'slate',
    category: 'creative',
    questHooks: [
      { id: 'create_palette', label: 'Create a color harmony palette', icon: '🎨', check: function(d) { return d.harmony && d.harmony !== 'complementary'; }, progress: function(d) { return d.harmony ? 'Created!' : 'Try harmonies'; } },
      { id: 'draw_pixels', label: 'Draw pixel art (10+ cells)', icon: '🖼️', check: function(d) { return Object.keys(d.pixelData || {}).length >= 10; }, progress: function(d) { return Object.keys(d.pixelData || {}).length + '/10'; } }
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var isDark = ctx.isDark || false;
      var isContrast = ctx.isContrast || false;
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

      // ── Tool body (artStudio) ──
      return (function() {
const d = labToolData.artStudio || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, artStudio: { ...prev.artStudio, [key]: val } }));

          const tab = d.tab || 'colorWheel';
          const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          // Canvas Narration: Art Studio init
          if (typeof canvasNarrate === 'function') canvasNarrate('artStudio', 'init', {
            first: 'Art Studio loaded. Explore color theory, pixel art, symmetry drawing, spirographs, fractals, and more. Use the tabs to switch between tools.',
            repeat: 'Art Studio ready.',
            terse: 'Art Studio ready.'
          });



          // Color Wheel Canvas

          const wheelRef = function (canvas) {

            if (!canvas) return;

            if (canvas._wheelAnim) cancelAnimationFrame(canvas._wheelAnim);

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 20;

            var tick = 0;

            var hue = d.hue || 0, sat = d.sat !== undefined ? d.sat : 100, lit = d.lit !== undefined ? d.lit : 50;

            // Pre-render the static 360-segment hue ring ONCE. sat/lit are frozen for
            // this loop instance (wheelRef re-runs with fresh values on slider change),
            // so the ring was rebuilt + 360 hsl-strings allocated EVERY frame purely to
            // pulse the 2px selector dot. Cache it; redraw only the dot/markers live.
            var _wheelBmp = document.createElement('canvas');
            _wheelBmp.width = W; _wheelBmp.height = H;
            var _wctx = _wheelBmp.getContext('2d');
            for (var wa = 0; wa < 360; wa++) {
              var wr1 = (wa - 90) * Math.PI / 180, wr2 = (wa - 89) * Math.PI / 180;
              _wctx.beginPath(); _wctx.moveTo(cx, cy); _wctx.arc(cx, cy, R, wr1, wr2); _wctx.closePath();
              _wctx.fillStyle = 'hsl(' + wa + ',' + sat + '%,' + lit + '%)'; _wctx.fill();
            }



            function drawWheel() {

              tick++;

              ctx.clearRect(0, 0, W, H);

              ctx.drawImage(_wheelBmp, 0, 0); // cached static hue ring (was a 360-arc rebuild every frame)

              ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, Math.PI * 2);

              ctx.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)'; ctx.fill();

              ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

              var selRad = (hue - 90) * Math.PI / 180;

              var sx = cx + Math.cos(selRad) * R * 0.75;

              var sy = cy + Math.sin(selRad) * R * 0.75;

              ctx.beginPath(); ctx.arc(sx, sy, reducedMotion ? 8 : 8 + Math.sin(tick * 0.06) * 2, 0, Math.PI * 2);

              ctx.shadowBlur = 14; ctx.shadowColor = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)';

              ctx.fillStyle = '#fff'; ctx.fill();

              ctx.shadowBlur = 0;

              ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

              ctx.fillStyle = lit > 55 ? '#000' : '#fff';

              ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

              ctx.fillText('H:' + hue + '\u00B0', cx, cy - 8);

              ctx.fillText('S:' + sat + '% L:' + lit + '%', cx, cy + 8);

              var harmony = d.harmony || 'complementary';

              var harmAngles = [];

              if (harmony === 'complementary') harmAngles = [(hue + 180) % 360];

              else if (harmony === 'triadic') harmAngles = [(hue + 120) % 360, (hue + 240) % 360];

              else if (harmony === 'analogous') harmAngles = [(hue + 30) % 360, (hue - 30 + 360) % 360];

              else if (harmony === 'split') harmAngles = [(hue + 150) % 360, (hue + 210) % 360];

              harmAngles.forEach(function (ha) {

                var hr = (ha - 90) * Math.PI / 180;

                var hx = cx + Math.cos(hr) * R * 0.75, hy = cy + Math.sin(hr) * R * 0.75;

                ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);

                ctx.fillStyle = 'hsl(' + ha + ',' + sat + '%,' + lit + '%)'; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

              });

              if (!reducedMotion && canvas.isConnected) canvas._wheelAnim = requestAnimationFrame(drawWheel);

            }

            function chooseHue(angle, messagePrefix) {

              hue = (angle + 360) % 360;

              canvas.setAttribute('aria-label', 'Interactive color wheel. Hue ' + hue + ' degrees, saturation ' + sat +

                ' percent, lightness ' + lit + ' percent.');

              upd('hue', hue);

              if (typeof announceToSR === 'function') announceToSR((messagePrefix || 'Hue') + ' ' + hue + ' degrees.');

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var scaleX = W / rect.width, scaleY = H / rect.height;

              ex *= scaleX; ey *= scaleY;

              var dx = ex - cx, dy = ey - cy;

              var dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < R && dist > R * 0.35) {

                chooseHue(Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360), 'Selected hue');

              }

            };

            canvas.onkeydown = function(event) {

              var step = event.shiftKey ? 10 : 1;

              var handled = true;

              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') chooseHue(hue + step, 'Hue');

              else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') chooseHue(hue - step, 'Hue');

              else if (event.key === 'Home') chooseHue(0, 'Hue');

              else if (event.key === 'End') chooseHue(359, 'Hue');

              else handled = false;

              if (handled) event.preventDefault();

            };

            canvas.setAttribute('aria-label', 'Interactive color wheel. Hue ' + hue + ' degrees, saturation ' + sat +

              ' percent, lightness ' + lit + ' percent.');

            drawWheel();

          };



          // Pixel Art Canvas

          const pixelRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var gridSize = typeof d.pixelGrid === 'number' ? d.pixelGrid : 16;

            var cellW = W / gridSize, cellH = H / gridSize;

            var grid = d.pixelData || {};

            var painting = false;

            var currentColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';
            var keyboardCursor = canvas._pixelKeyboardCursor || { x: 0, y: 0 };
            keyboardCursor.x = Math.max(0, Math.min(gridSize - 1, keyboardCursor.x || 0));
            keyboardCursor.y = Math.max(0, Math.min(gridSize - 1, keyboardCursor.y || 0));
            canvas._pixelKeyboardCursor = keyboardCursor;

            function updateKeyboardLabel() {
              var colored = Object.keys(grid).length;
              canvas.setAttribute('aria-label', 'Pixel art editor, ' + gridSize + ' by ' + gridSize + ' grid with ' + colored +
                ' colored cells. Keyboard cursor at row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
            }

            function drawPixelGrid() {

              ctx.clearRect(0, 0, W, H);

              ctx.fillStyle = '#1e1e2e'; ctx.fillRect(0, 0, W, H);

              Object.keys(grid).forEach(function (key) {

                var parts = key.split(',');

                ctx.fillStyle = grid[key];

                ctx.fillRect(parseInt(parts[0]) * cellW, parseInt(parts[1]) * cellH, cellW, cellH);

              });

              ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;

              for (var gx = 0; gx <= gridSize; gx++) { ctx.beginPath(); ctx.moveTo(gx * cellW, 0); ctx.lineTo(gx * cellW, H); ctx.stroke(); }

              for (var gy = 0; gy <= gridSize; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * cellH); ctx.lineTo(W, gy * cellH); ctx.stroke(); }

              if (typeof document !== 'undefined' && document.activeElement === canvas) {
                ctx.save();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
                ctx.strokeRect(keyboardCursor.x * cellW + 2, keyboardCursor.y * cellH + 2, cellW - 4, cellH - 4);
                ctx.strokeStyle = '#111827'; ctx.lineWidth = 2;
                ctx.strokeRect(keyboardCursor.x * cellW + 5, keyboardCursor.y * cellH + 5, cellW - 10, cellH - 10);
                ctx.restore();
              }
              updateKeyboardLabel();

            }

            function floodFill(startX, startY, fillColor) {

              var targetColor = grid[startX + ',' + startY] || null;

              if (targetColor === fillColor) return;

              var queue = [[startX, startY]];

              var visited = {};

              while (queue.length > 0) {

                var cell = queue.shift();

                var cx2 = cell[0], cy2 = cell[1];

                var k = cx2 + ',' + cy2;

                if (cx2 < 0 || cx2 >= gridSize || cy2 < 0 || cy2 >= gridSize) continue;

                if (visited[k]) continue;

                visited[k] = true;

                var cellColor = grid[k] || null;

                if (cellColor !== targetColor) continue;

                grid[k] = fillColor;

                queue.push([cx2 + 1, cy2], [cx2 - 1, cy2], [cx2, cy2 + 1], [cx2, cy2 - 1]);

              }

              upd('pixelData', Object.assign({}, grid));

              drawPixelGrid();

            }

            function applyToolAt(gx, gy) {
              if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return '';
              if (d.pixelTool === 'fill') {
                floodFill(gx, gy, currentColor);
                return 'Filled from';
              }
              var key = gx + ',' + gy;
              if (d.pixelTool === 'eraser') {
                delete grid[key];
                upd('pixelData', Object.assign({}, grid));
                drawPixelGrid();
                return 'Erased';
              }
              grid[key] = currentColor;
              upd('pixelData', Object.assign({}, grid));
              drawPixelGrid();
              return 'Painted';
            }

            function paint(e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var gx = Math.floor(ex * (W / rect.width) / cellW);

              var gy = Math.floor(ey * (H / rect.height) / cellH);

              applyToolAt(gx, gy);

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) { painting = true; paint(e); };

            canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) paint(e); };

            canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

            canvas.onmouseleave = function () { painting = false; };
            canvas.onfocus = function () { drawPixelGrid(); };
            canvas.onblur = function () { drawPixelGrid(); };
            canvas.onkeydown = function (event) {
              var moved = false;
              if (event.key === 'ArrowLeft') { keyboardCursor.x = Math.max(0, keyboardCursor.x - 1); moved = true; }
              else if (event.key === 'ArrowRight') { keyboardCursor.x = Math.min(gridSize - 1, keyboardCursor.x + 1); moved = true; }
              else if (event.key === 'ArrowUp') { keyboardCursor.y = Math.max(0, keyboardCursor.y - 1); moved = true; }
              else if (event.key === 'ArrowDown') { keyboardCursor.y = Math.min(gridSize - 1, keyboardCursor.y + 1); moved = true; }
              else if (event.key === 'Home') { keyboardCursor.x = 0; keyboardCursor.y = 0; moved = true; }
              else if (event.key === 'End') { keyboardCursor.x = gridSize - 1; keyboardCursor.y = gridSize - 1; moved = true; }
              else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                var action = applyToolAt(keyboardCursor.x, keyboardCursor.y);
                updateKeyboardLabel();
                if (typeof announceToSR === 'function') {
                  announceToSR(action + ' row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
                }
                return;
              } else {
                return;
              }
              if (moved) {
                event.preventDefault();
                canvas._pixelKeyboardCursor = keyboardCursor;
                drawPixelGrid();
                if (typeof announceToSR === 'function') {
                  announceToSR('Pixel row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
                }
              }
            };

            drawPixelGrid();

          };



          // Symmetry Canvas

          const symmetryRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2;

            var folds = d.symmetryFolds || 6;

            var drawing = false;

            var brushSize = d.brushSize || 3;

            var brushColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';
            var keyboardCursor = canvas._symmetryKeyboardCursor || { x: cx, y: cy };
            keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));
            keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));
            canvas._symmetryKeyboardCursor = keyboardCursor;

            function updateKeyboardCursor(show) {
              var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-symmetry-keyboard-cursor="true"]');
              if (cursor) {
                var displayW = canvas.clientWidth || W;
                var displayH = canvas.clientHeight || H;
                cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';
                cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';
                cursor.style.display = show ? 'block' : 'none';
              }
              canvas.setAttribute('aria-label', 'Symmetry drawing canvas with ' + folds + ' folds. Keyboard cursor at x ' +
                Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');
            }

            // Store previous point for continuous line drawing

            if (canvas._prevX === undefined) canvas._prevX = null;

            if (canvas._prevY === undefined) canvas._prevY = null;



            if (!canvas._symInit) {

              canvas._symInit = true;

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;

              for (var i = 0; i < folds; i++) {

                var angle = (i / folds) * Math.PI * 2;

                ctx.beginPath(); ctx.moveTo(cx, cy);

                ctx.lineTo(cx + Math.cos(angle) * Math.max(W, H), cy + Math.sin(angle) * Math.max(W, H));

                ctx.stroke();

              }

            }



            // In rainbow mode, pick a color based on distance from center or time; otherwise use selected

            var mode = d.symBrushMode || 'rainbow';

            var mirrorOnly = d.symMirrorOnly || false;



            function drawSymmetric(ex, ey, isStart) {

              var dx = ex - cx, dy = ey - cy, dist = Math.sqrt(dx * dx + dy * dy);

              var baseAngle = Math.atan2(dy, dx);



              var drawColor = brushColor;

              if (mode === 'rainbow') {

                drawColor = 'hsl(' + ((Date.now() / 10) % 360) + ', 100%, 50%)';

              }



              ctx.lineWidth = brushSize * 2; // match stroke width to circle diam

              ctx.lineCap = 'round';

              ctx.lineJoin = 'round';

              ctx.strokeStyle = drawColor;

              ctx.fillStyle = drawColor;



              // If it's the very first dot of a stroke, just draw a dot

              if (isStart || canvas._prevX === null || canvas._prevY === null) {

                for (var i = 0; i < folds; i++) {

                  var angle = baseAngle + (i / folds) * Math.PI * 2;

                  ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, brushSize, 0, Math.PI * 2);

                  ctx.fill();

                  if (mirrorOnly) {

                    var mirrorAngle = -baseAngle + (i / folds) * Math.PI * 2;

                    ctx.beginPath(); ctx.arc(cx + Math.cos(mirrorAngle) * dist, cy + Math.sin(mirrorAngle) * dist, brushSize, 0, Math.PI * 2);

                    ctx.fill();

                  }

                }

              } else {

                 // Draw continuous lines from previous points to current

                 var px = canvas._prevX - cx, py = canvas._prevY - cy;

                 var prevDist = Math.sqrt(px * px + py * py);

                 var prevBaseAngle = Math.atan2(py, px);



                 for (var j = 0; j < folds; j++) {

                    var curAngle = baseAngle + (j / folds) * Math.PI * 2;

                    var pAngle = prevBaseAngle + (j / folds) * Math.PI * 2;

                    ctx.beginPath();

                    ctx.moveTo(cx + Math.cos(pAngle) * prevDist, cy + Math.sin(pAngle) * prevDist);

                    ctx.lineTo(cx + Math.cos(curAngle) * dist, cy + Math.sin(curAngle) * dist);

                    ctx.stroke();



                    if (mirrorOnly) {

                       var mCurAngle = -baseAngle + (j / folds) * Math.PI * 2;

                       var mPAngle = -prevBaseAngle + (j / folds) * Math.PI * 2;

                       ctx.beginPath();

                       ctx.moveTo(cx + Math.cos(mPAngle) * prevDist, cy + Math.sin(mPAngle) * prevDist);

                       ctx.lineTo(cx + Math.cos(mCurAngle) * dist, cy + Math.sin(mCurAngle) * dist);

                       ctx.stroke();

                    }

                 }

              }

              // Save prev coords

              canvas._prevX = ex;

              canvas._prevY = ey;

            }



            function handleDraw(e, isStart) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              drawSymmetric(ex * (W / rect.width), ey * (H / rect.height), isStart);

            }



            canvas.onmousedown = canvas.ontouchstart = function (e) {

               e.preventDefault();

               drawing = true;

               canvas._prevX = null; canvas._prevY = null;

               handleDraw(e, true);

            };

            canvas.onmousemove = canvas.ontouchmove = function (e) {

               if (drawing) {

                 e.preventDefault();

                 handleDraw(e, false);

               }

            };

            canvas.onmouseup = canvas.ontouchend = function () {

               drawing = false;

               canvas._prevX = null; canvas._prevY = null;

            };

            canvas.onmouseleave = function () {

               drawing = false;

               canvas._prevX = null; canvas._prevY = null;

            };
            canvas.onfocus = function () { updateKeyboardCursor(true); };
            canvas.onblur = function () { updateKeyboardCursor(false); };
            canvas.onkeydown = function (event) {
              var step = event.altKey ? 1 : 10;
              var oldX = keyboardCursor.x, oldY = keyboardCursor.y;
              var moved = true;
              if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);
              else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);
              else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);
              else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);
              else if (event.key === 'Home') { keyboardCursor.x = cx; keyboardCursor.y = cy; }
              else moved = false;

              if (moved) {
                event.preventDefault();
                if (event.shiftKey) {
                  canvas._prevX = oldX; canvas._prevY = oldY;
                  drawSymmetric(keyboardCursor.x, keyboardCursor.y, false);
                  canvas._prevX = null; canvas._prevY = null;
                }
                canvas._symmetryKeyboardCursor = keyboardCursor;
                updateKeyboardCursor(true);
                if (typeof announceToSR === 'function') {
                  announceToSR((event.shiftKey ? 'Drew to' : 'Symmetry cursor') + ' x ' + Math.round(keyboardCursor.x) +
                    ', y ' + Math.round(keyboardCursor.y) + '.');
                }
                return;
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                canvas._prevX = null; canvas._prevY = null;
                drawSymmetric(keyboardCursor.x, keyboardCursor.y, true);
                if (typeof announceToSR === 'function') {
                  announceToSR('Placed symmetric marks at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');
                }
              }
            };
            updateKeyboardCursor(false);

          };



          // WCAG contrast helpers

          function luminance(h, s, l) {

            var c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;

            var x = c * (1 - Math.abs((h / 60) % 2 - 1));

            var m = l / 100 - c / 2;

            var r, g, b;

            if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }

            else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }

            else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }

            r += m; g += m; b += m;

            var toL = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

            return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);

          }

          function mixColors(c1, c2, ratio) {

            var h1 = c1.h, s1 = c1.s, l1 = c1.l, h2 = c2.h, s2 = c2.s, l2 = c2.l;

            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

            return { h: Math.round((h1 + (h2 - h1) * ratio + 360) % 360), s: Math.round(s1 + (s2 - s1) * ratio), l: Math.round(l1 + (l2 - l1) * ratio) };

          }

          var mix1 = { h: d.mix1H || 0, s: d.mix1S || 100, l: d.mix1L || 50 };

          var mix2 = { h: d.mix2H || 200, s: d.mix2S || 100, l: d.mix2L || 50 };

          var mixRatio = d.mixRatio || 0.5;

          var mixed = mixColors(mix1, mix2, mixRatio);

          var fgH = typeof d.fgH === 'number' ? d.fgH : 0;

          var fgS = typeof d.fgS === 'number' ? d.fgS : 0;

          var fgL = typeof d.fgL === 'number' ? d.fgL : 0;

          var bgH = typeof d.bgH === 'number' ? d.bgH : 0;

          var bgS = typeof d.bgS === 'number' ? d.bgS : 0;

          var bgL = typeof d.bgL === 'number' ? d.bgL : 100;

          var l1c = luminance(fgH, fgS, fgL), l2c = luminance(bgH, bgS, bgL);

          var contrastRatio = (Math.max(l1c, l2c) + 0.05) / (Math.min(l1c, l2c) + 0.05);

          var passAA = contrastRatio >= 4.5, passAAA = contrastRatio >= 7, passAALarge = contrastRatio >= 3;



          // Helper to toggle fullscreen for specific tool containers

          const toggleFullscreen = (elementId) => {

            var el = document.getElementById(elementId);

            if (!el) return;

            if (!document.fullscreenElement) {

              if (el.requestFullscreen) {

                el.requestFullscreen().catch(err => console.warn("Fullscreen failed: ", err));

              } else if (el.webkitRequestFullscreen) { /* Safari */

                el.webkitRequestFullscreen();

              } else if (el.msRequestFullscreen) { /* IE11 */

                el.msRequestFullscreen();

              }

            } else {

              if (document.exitFullscreen) {

                document.exitFullscreen();

              } else if (document.webkitExitFullscreen) { /* Safari */

                document.webkitExitFullscreen();

              } else if (document.msExitFullscreen) { /* IE11 */

                document.msExitFullscreen();

              }

            }

          };

            var _stereoAnimRef = { timer: null, frames: [] };

            function _sirdsRenderSync(W, H, dmData, dmW, dmH, pType, pWidth, maxShift, aiPat) {

              var offscreen = document.createElement('canvas'); offscreen.width = W; offscreen.height = H;

              var ctx = offscreen.getContext('2d');

              function makeRng(seed) { var s = seed; return function() { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; }; }

              var imgData = ctx.createImageData(W, H); var data = imgData.data;

              for (var y = 0; y < H; y++) {

                var rng = makeRng(y * 7919 + 12345);

                var row = new Uint8Array(W * 3);

                for (var x = 0; x < W; x++) {

                  if (x < pWidth) {

                    if (pType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3]=c; row[x*3+1]=c; row[x*3+2]=c; }

                    else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                    else if (pType === 'ai' && aiPat) { var pw=aiPat.width,ph=aiPat.height,pI=((y%ph)*pw+(x%pw))*4; row[x*3]=aiPat.data[pI]; row[x*3+1]=aiPat.data[pI+1]; row[x*3+2]=aiPat.data[pI+2]; }

                    else { var v=Math.floor(rng()*220)+20; row[x*3]=v; row[x*3+1]=v; row[x*3+2]=v; }

                  } else {

                    var dx=Math.floor(x*dmW/W), dy=Math.floor(y*dmH/H), di=(dy*dmW+dx)*4;

                    var depth=dmData[di]/255, shift=Math.round(depth*maxShift), srcX=x-pWidth+shift;

                    if (srcX >= 0) { row[x*3]=row[srcX*3]; row[x*3+1]=row[srcX*3+1]; row[x*3+2]=row[srcX*3+2]; }

                    else {

                      if (pType === 'bw') { var c2=rng()>0.5?230:25; row[x*3]=c2; row[x*3+1]=c2; row[x*3+2]=c2; }

                      else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                      else if (pType === 'ai' && aiPat) { var pw2=aiPat.width,ph2=aiPat.height,pI2=((y%ph2)*pw2+(x%pw2))*4; row[x*3]=aiPat.data[pI2]; row[x*3+1]=aiPat.data[pI2+1]; row[x*3+2]=aiPat.data[pI2+2]; }

                      else { var v2=Math.floor(rng()*220)+20; row[x*3]=v2; row[x*3+1]=v2; row[x*3+2]=v2; }

                    }

                  }

                }

                for (var x2=0; x2<W; x2++) { var idx=(y*W+x2)*4; data[idx]=row[x2*3]; data[idx+1]=row[x2*3+1]; data[idx+2]=row[x2*3+2]; data[idx+3]=255; }

              }

              ctx.putImageData(imgData, 0, 0);

              return offscreen;

            }

            function _genAnimDepth(presetId, frameIdx, totalFrames, W, H) {

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              if (presetId === 'pulseSphere') {

                var rBase = Math.abs(0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));

                var r = Math.max(4, Math.abs(Math.round(Math.min(W, H) * rBase)));

                var gradR = Math.max(4, r);

                if (!isFinite(gradR) || gradR <= 0) gradR = 4;

                var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, gradR);

                grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888'); grad.addColorStop(1, '#000');

                ctx.beginPath(); ctx.arc(W/2, H/2, Math.max(1, r), 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

              } else if (presetId === 'spinCube') {

                var angle = t * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle);

                var sz = Math.min(W, H) * 0.25, cx = W/2, cy = H/2;

                var verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];

                var faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];

                var proj = verts.map(function(v) { var rx=v[0]*cos-v[2]*sin, rz=v[0]*sin+v[2]*cos; return {x:cx+rx*sz, y:cy+v[1]*sz, z:(rz+1)/2}; });

                // Sort faces by average z (painter's algorithm)

                var sortedFaces = faces.slice().sort(function(a,b) {

                  var za = a.reduce(function(s,i){return s+proj[i].z;},0)/a.length;

                  var zb = b.reduce(function(s,i){return s+proj[i].z;},0)/b.length;

                  return za - zb;

                });

                sortedFaces.forEach(function(face) {

                  var avgZ = face.reduce(function(s,i){return s+proj[i].z;},0)/face.length;

                  var brt = Math.round(avgZ * 255);

                  ctx.beginPath(); ctx.moveTo(proj[face[0]].x, proj[face[0]].y);

                  for (var fi=1; fi<face.length; fi++) ctx.lineTo(proj[face[fi]].x, proj[face[fi]].y);

                  ctx.closePath(); ctx.fillStyle = 'rgb('+brt+','+brt+','+brt+')'; ctx.fill();

                });

              } else if (presetId === 'waveRipple') {

                var imgData = ctx.createImageData(W, H); var data = imgData.data;

                var phase = t * Math.PI * 2;

                for (var y=0; y<H; y++) for (var x=0; x<W; x++) {

                  var dx2=x-W/2, dy2=y-H/2, dist=Math.sqrt(dx2*dx2+dy2*dy2)/(Math.min(W,H)*0.15);

                  var val=Math.max(0,Math.min(255,Math.round((Math.sin(dist-phase)*0.5+0.5)*255*Math.max(0,1-dist/5))));

                  var idx2=(y*W+x)*4; data[idx2]=val; data[idx2+1]=val; data[idx2+2]=val; data[idx2+3]=255;

                }

                ctx.putImageData(imgData, 0, 0);

              } else if (presetId === 'morphHeart') {

                var sc = Math.min(W,H) * (0.009 + 0.004 * Math.sin(t * Math.PI * 2));

                ctx.save(); ctx.translate(W/2, H*0.45); ctx.scale(sc, -sc);

                ctx.beginPath();

                for (var ht=0; ht<=Math.PI*2; ht+=0.01) {

                  var hx=16*Math.pow(Math.sin(ht),3), hy=13*Math.cos(ht)-5*Math.cos(2*ht)-2*Math.cos(3*ht)-Math.cos(4*ht);

                  if (ht===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy);

                }

                ctx.closePath(); ctx.restore();

                var hGrad = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, Math.min(W,H)*0.4);

                hGrad.addColorStop(0, '#fff'); hGrad.addColorStop(0.8, '#aaa'); hGrad.addColorStop(1, '#000');

                ctx.fillStyle = hGrad; ctx.fill();

              } else if (presetId === 'floatText') {

                var dep = Math.round(128 + 127 * Math.sin(t * Math.PI * 2));

                ctx.fillStyle = 'rgb('+dep+','+dep+','+dep+')';

                ctx.font = 'bold ' + Math.round(H * 0.4) + 'px Arial';

                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('3D', W/2, H/2);

              }

              return ctx.getImageData(0, 0, W, H);

            }

            function _renderAnimFrames(nFrames, presetId, pType, pWidth, maxShift, aiPat, onProgress, onDone) {

              var W = 512, H = 512, dmW = 400, dmH = 400;

              var frames = []; var i = 0;

              function step() {

                if (i >= nFrames) { onDone(frames); return; }

                var dmImgData = _genAnimDepth(presetId, i, nFrames, dmW, dmH);

                var f = _sirdsRenderSync(W, H, dmImgData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                frames.push(f);

                i++;

                if (onProgress) onProgress(i, nFrames);

                requestAnimationFrame(step);

              }

              requestAnimationFrame(step);

            }

            function _stopStereoAnim() {

              if (_stereoAnimRef.timer) { clearInterval(_stereoAnimRef.timer); _stereoAnimRef.timer = null; }

            }

            function _playStereoAnim(canvasId, fps, upd2) {

              _stopStereoAnim();

              var frames = _stereoAnimRef.frames;

              if (!frames || frames.length === 0) return;

              var c = document.getElementById(canvasId);

              if (!c) return;

              var ctx = c.getContext('2d');

              var idx = 0;

              _stereoAnimRef.timer = setInterval(function() {

                ctx.drawImage(frames[idx], 0, 0);

                idx = (idx + 1) % frames.length;

                if (upd2) upd2('stereoAnimIndex', idx);

              }, 1000 / fps);

            }

            function _exportStereoGif(frames, fps) {

              if (!frames || frames.length === 0) return;

              // Build animated GIF using minimal encoder

              var W = frames[0].width, H = frames[0].height;

              var delay = Math.round(100 / fps); // centiseconds

              // Quantize each frame to 256 colors and build GIF

              var parts = [];

              // GIF89a Header

              parts.push(new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61]));

              // Logical Screen Descriptor

              var lsd = new Uint8Array(7);

              lsd[0] = W & 0xFF; lsd[1] = (W >> 8) & 0xFF;

              lsd[2] = H & 0xFF; lsd[3] = (H >> 8) & 0xFF;

              lsd[4] = 0xF7; // GCT flag, 256 colors (2^(7+1)=256)

              lsd[5] = 0; lsd[6] = 0;

              parts.push(lsd);

              // Global Color Table (256 entries = 768 bytes) - web-safe palette

              var gct = new Uint8Array(768);

              for (var ci = 0; ci < 256; ci++) {

                // Simple 6x6x6 cube + 40 grays

                if (ci < 216) {

                  gct[ci*3] = Math.floor(ci/36) * 51;

                  gct[ci*3+1] = (Math.floor(ci/6) % 6) * 51;

                  gct[ci*3+2] = (ci % 6) * 51;

                } else {

                  var gv = Math.round((ci - 216) / 39 * 255);

                  gct[ci*3] = gv; gct[ci*3+1] = gv; gct[ci*3+2] = gv;

                }

              }

              parts.push(gct);

              // Netscape looping extension

              parts.push(new Uint8Array([0x21,0xFF,0x0B,

                0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,

                0x03,0x01,0x00,0x00,0x00]));

              function nearestColor(r,g,b) {

                // Map to 6x6x6 cube

                var ri = Math.round(r/255*5), gi = Math.round(g/255*5), bi = Math.round(b/255*5);

                return ri*36 + gi*6 + bi;

              }

              // LZW Minimum Code Size

              var minCodeSize = 8;

              function lzwEncode(indexStream) {

                var clearCode = 1 << minCodeSize;

                var eoiCode = clearCode + 1;

                var codeSize = minCodeSize + 1;

                var nextCode = eoiCode + 1;

                var dict = {};

                for (var di = 0; di < clearCode; di++) dict[String(di)] = di;

                var out = [];

                var bitBuf = 0, bitCount = 0;

                function writeBits(code, size) {

                  bitBuf |= (code << bitCount);

                  bitCount += size;

                  while (bitCount >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitCount -= 8; }

                }

                writeBits(clearCode, codeSize);

                var cur = String(indexStream[0]);

                for (var si = 1; si < indexStream.length; si++) {

                  var next = String(indexStream[si]);

                  var combined = cur + ',' + next;

                  if (dict[combined] !== undefined) {

                    cur = combined;

                  } else {

                    writeBits(dict[cur], codeSize);

                    if (nextCode < 4096) {

                      dict[combined] = nextCode++;

                      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;

                    } else {

                      writeBits(clearCode, codeSize);

                      dict = {};

                      for (var dj = 0; dj < clearCode; dj++) dict[String(dj)] = dj;

                      nextCode = eoiCode + 1;

                      codeSize = minCodeSize + 1;

                    }

                    cur = next;

                  }

                }

                writeBits(dict[cur], codeSize);

                writeBits(eoiCode, codeSize);

                if (bitCount > 0) out.push(bitBuf & 0xFF);

                return new Uint8Array(out);

              }

              for (var fi = 0; fi < frames.length; fi++) {

                // Graphic Control Extension

                var gce = new Uint8Array([0x21,0xF9,0x04,0x00, delay & 0xFF, (delay >> 8) & 0xFF, 0x00, 0x00]);

                parts.push(gce);

                // Image Descriptor

                var imgDesc = new Uint8Array(10);

                imgDesc[0] = 0x2C; // separator

                imgDesc[1] = 0; imgDesc[2] = 0; imgDesc[3] = 0; imgDesc[4] = 0; // x,y

                imgDesc[5] = W & 0xFF; imgDesc[6] = (W >> 8) & 0xFF;

                imgDesc[7] = H & 0xFF; imgDesc[8] = (H >> 8) & 0xFF;

                imgDesc[9] = 0; // no local color table

                parts.push(imgDesc);

                // Get pixel data

                var fCtx = frames[fi].getContext('2d');

                var fData = fCtx.getImageData(0, 0, W, H).data;

                // Quantize

                var indices = new Uint8Array(W * H);

                for (var pi = 0; pi < W * H; pi++) {

                  indices[pi] = nearestColor(fData[pi*4], fData[pi*4+1], fData[pi*4+2]);

                }

                // LZW encode

                parts.push(new Uint8Array([minCodeSize]));

                var lzwData = lzwEncode(indices);

                // Sub-blocks (max 255 bytes each)

                var pos = 0;

                while (pos < lzwData.length) {

                  var chunkLen = Math.min(255, lzwData.length - pos);

                  parts.push(new Uint8Array([chunkLen]));

                  parts.push(lzwData.slice(pos, pos + chunkLen));

                  pos += chunkLen;

                }

                parts.push(new Uint8Array([0x00])); // block terminator

              }

              // Trailer

              parts.push(new Uint8Array([0x3B]));

              // Assemble

              var totalLen = parts.reduce(function(s,p){return s+p.length;}, 0);

              var result = new Uint8Array(totalLen);

              var offset = 0;

              parts.forEach(function(p) { result.set(p, offset); offset += p.length; });

              var blob = new Blob([result], { type: 'image/gif' });

              var link = document.createElement('a');

              link.download = 'stereogram-anim-' + Date.now() + '.gif';

              link.href = URL.createObjectURL(blob);

              link.click();

              URL.revokeObjectURL(link.href);

              if (typeof addToast === 'function') addToast('\uD83C\uDFAC Animated GIF exported!', 'success');

            }



            // ═══ CUSTOM ANIMATION HELPERS ═══

            function _genTransformDepth(sourceImgData, W, H, transformType, frameIdx, totalFrames) {

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              // Put source into a temp canvas so we can drawImage with transforms

              var src = document.createElement('canvas'); src.width = W; src.height = H;

              var sCtx = src.getContext('2d');

              var sImg = sCtx.createImageData(W, H);

              var sData = sourceImgData.data || sourceImgData;

              for (var i = 0; i < sImg.data.length; i++) sImg.data[i] = sData[i];

              sCtx.putImageData(sImg, 0, 0);

              ctx.save();

              ctx.translate(W / 2, H / 2);

              if (transformType === 'zoom') {

                var scale = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));

                ctx.scale(scale, scale);

              } else if (transformType === 'rotate') {

                ctx.rotate(t * Math.PI * 2);

              } else if (transformType === 'bounce') {

                var bounceY = Math.abs(Math.sin(t * Math.PI * 2)) * H * 0.25;

                ctx.translate(0, -bounceY);

                var bounceScale = 0.8 + 0.2 * Math.abs(Math.sin(t * Math.PI * 2));

                ctx.scale(bounceScale, bounceScale);

              } else if (transformType === 'slide') {

                var slideX = Math.sin(t * Math.PI * 2) * W * 0.3;

                ctx.translate(slideX, 0);

              }

              ctx.drawImage(src, -W / 2, -H / 2, W, H);

              ctx.restore();

              return ctx.getImageData(0, 0, W, H);

            }



            function _interpolateDepthMaps(maps, frameIdx, totalFrames) {

              if (!maps || maps.length === 0) return null;

              if (maps.length === 1) return maps[0];

              var segCount = maps.length;

              var pos = (frameIdx / totalFrames) * segCount;

              var idx0 = Math.floor(pos) % maps.length;

              var idx1 = (idx0 + 1) % maps.length;

              var frac = pos - Math.floor(pos);

              var m0 = maps[idx0], m1 = maps[idx1];

              var W = m0.width, H = m0.height;

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              var out = ctx.createImageData(W, H);

              var d0 = m0.data, d1 = m1.data, od = out.data;

              for (var i = 0; i < od.length; i += 4) {

                od[i]     = Math.round(d0[i]     * (1 - frac) + d1[i]     * frac);

                od[i + 1] = Math.round(d0[i + 1] * (1 - frac) + d1[i + 1] * frac);

                od[i + 2] = Math.round(d0[i + 2] * (1 - frac) + d1[i + 2] * frac);

                od[i + 3] = 255;

              }

              ctx.putImageData(out, 0, 0);

              return out;

            }





          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "transition-colors p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': __alloT('stem.artstudio.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, __alloT('stem.artstudio.art_design_studio', "\uD83C\uDFA8 Art & Design Studio")),

              React.createElement("span", { className: "px-2 py-0.5 bg-pink-100 text-pink-700 text-[11px] font-bold rounded-full" }, "CREATIVE"),

              React.createElement("button", { onClick: function () { setStemLabTool('archStudio'); }, className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-600 hover:from-amber-200 hover:to-orange-200 transition-all shadow-sm", title: __alloT('stem.artstudio.launch_3d_architecture_studio', "Launch 3D Architecture Studio") }, __alloT('stem.artstudio.3d_builder', "\uD83C\uDFD7\uFE0F 3D Builder \u2192")),

              React.createElement("button", { onClick: function () { upd('showTour', !d.showTour); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.showTour ? "bg-pink-600 text-white" : "transition-colors bg-pink-50 text-pink-700 border border-pink-700 hover:bg-pink-100") + " transition-all shadow-sm", "aria-label": __alloT('stem.artstudio.toggle_studio_tour', "Toggle studio tour") }, d.showTour ? "\u2716 Close Tour" : "\uD83C\uDFA8 Tour")

            ),

            /* ── Art Studio Tour/Welcome Panel ── */
            d.showTour && React.createElement("div", { className: "mb-4 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-xl border-2 border-pink-200 p-4 animate-in fade-in duration-200" },
              React.createElement("h4", { className: "text-sm font-black text-pink-800 mb-3 flex items-center gap-2" }, __alloT('stem.artstudio.welcome_to_the_art_design_studio', "\uD83C\uDFA8 Welcome to the Art & Design Studio!")),
              React.createElement("p", { className: "text-xs text-slate-600 mb-3 leading-relaxed" }, __alloT('stem.artstudio.explore_15_interactive_tools_that_teac', "Explore 15 interactive tools that teach color theory, mathematical art, generative design, and visual accessibility. Each tab is a different creative canvas. Here\u2019s what you can create:")),
              React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3" },
                [
                  { icon: '\uD83C\uDFA8', name: __alloT('stem.artstudio.color_wheel', 'Color Wheel'), desc: __alloT('stem.artstudio.explore_hsl_color_space_interactively', 'Explore HSL color space interactively') },
                  { icon: '\uD83E\uDDEA', name: __alloT('stem.artstudio.color_mixer', 'Color Mixer'), desc: __alloT('stem.artstudio.mix_paints_with_subtractive_color_theo', 'Mix paints with subtractive color theory') },
                  { icon: '\uD83D\uDDBC', name: __alloT('stem.artstudio.pixel_art', 'Pixel Art'), desc: __alloT('stem.artstudio.create_pixel_art_on_a_grid_canvas', 'Create pixel art on a grid canvas') },
                  { icon: '\u2728', name: __alloT('stem.artstudio.symmetry', 'Symmetry'), desc: __alloT('stem.artstudio.draw_with_rotational_reflective_symmet', 'Draw with rotational & reflective symmetry') },
                  { icon: '\uD83C\uDF00', name: __alloT('stem.artstudio.spirograph', 'Spirograph'), desc: __alloT('stem.artstudio.mathematical_spiral_patterns_hypotroch', 'Mathematical spiral patterns (hypotrochoids)') },
                  { icon: '\uD83C\uDF86', name: __alloT('stem.artstudio.generative', 'Generative'), desc: __alloT('stem.artstudio.flow_fields_particles_starfields_auror', 'Flow fields, particles, starfields, aurora') },
                  { icon: '\uD83C\uDF00', name: __alloT('stem.artstudio.spin_art', 'Spin Art'), desc: __alloT('stem.artstudio.virtual_spin_painting_with_physics', 'Virtual spin painting with physics') },
                  { icon: '\uD83D\uDD78', name: __alloT('stem.artstudio.string_art', 'String Art'), desc: __alloT('stem.artstudio.geometric_string_patterns_on_pegs', 'Geometric string patterns on pegs') },
                  { icon: '\uD83D\uDC41', name: __alloT('stem.artstudio.op_art', 'Op Art'), desc: __alloT('stem.artstudio.optical_illusions_and_visual_tricks', 'Optical illusions and visual tricks') },
                  { icon: '\uD83D\uDD37', name: __alloT('stem.artstudio.tessellation', 'Tessellation'), desc: __alloT('stem.artstudio.repeating_tile_patterns_like_m_c_esche', 'Repeating tile patterns like M.C. Escher') },
                  { icon: '\uD83D\uDD2E', name: __alloT('stem.artstudio.fractals', 'Fractals'), desc: __alloT('stem.artstudio.mandelbrot_julia_sets_sierpinski_trian', 'Mandelbrot, Julia sets, Sierpinski triangle') },
                  { icon: '\uD83C\uDF08', name: __alloT('stem.artstudio.gradient', 'Gradient'), desc: __alloT('stem.artstudio.design_and_export_css_gradient_pattern', 'Design and export CSS gradient patterns') },
                  { icon: '\uD83D\uDC53', name: __alloT('stem.artstudio.stereogram', 'Stereogram'), desc: __alloT('stem.artstudio.hidden_3d_images_magic_eye_style', 'Hidden 3D images (Magic Eye style)') },

                  { icon: '\uD83C\uDFB6', name: __alloT('stem.artstudio.harmony', 'Harmony'), desc: __alloT('stem.artstudio.harmony_desc', 'Explore musical consonance, intervals, and visual sound relationships') },
                  { icon: '\u267F', name: __alloT('stem.artstudio.contrast', 'Contrast'), desc: __alloT('stem.artstudio.wcag_contrast_checker_for_accessibilit', 'WCAG contrast checker for accessibility') },
                ].map(function(tool) {
                  return React.createElement("div", { key: tool.name, className: "bg-white rounded-lg p-2 border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow cursor-default" },
                    React.createElement("div", { className: "text-lg" }, tool.icon),
                    React.createElement("div", { className: "text-[11px] font-bold text-slate-700 mt-0.5" }, tool.name),
                    React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5 leading-tight" }, tool.desc)
                  );
                })
              ),
              React.createElement("div", { className: "bg-white rounded-lg p-3 border border-pink-100" },
                React.createElement("h5", { className: "text-[11px] font-bold text-pink-700 uppercase mb-1" }, __alloT('stem.artstudio.educational_concepts', "\uD83D\uDCA1 Educational Concepts")),
                React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" },
                  __alloT('stem.artstudio.color_theory_additive_vs_subtractive_m', "Color theory (additive vs subtractive mixing, complementary colors, HSL/RGB), mathematical curves (hypotrochoids, Lissajous), fractals & self-similarity, tessellation geometry, op art visual perception, WCAG accessibility standards, and computational art. Every tool teaches the math behind the beauty.")
                )
              ),
              React.createElement("button", { onClick: function () { upd('showTour', false); }, className: "mt-3 w-full py-2 bg-pink-600 text-white text-sm font-bold rounded-lg hover:bg-pink-700 transition-colors" }, __alloT('stem.artstudio.got_it_let_s_create', "Got it \u2014 let\u2019s create! \uD83C\uDFA8"))
            ),

            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-400", role: 'tablist', 'aria-label': __alloT('stem.artstudio.art_studio_sections', 'Art Studio sections') },

              [{ id: 'colorWheel', icon: '\uD83C\uDFA8', label: __alloT('stem.artstudio.color_wheel_2', 'Color Wheel') }, { id: 'mixer', icon: '\uD83E\uDDEA', label: __alloT('stem.artstudio.color_mixer_2', 'Color Mixer') }, { id: 'pixel', icon: '\uD83D\uDDBC', label: __alloT('stem.artstudio.pixel_art_2', 'Pixel Art') }, { id: 'symmetry', icon: '\u2728', label: __alloT('stem.artstudio.symmetry_2', 'Symmetry') }, { id: 'spirograph', icon: '\uD83C\uDF00', label: __alloT('stem.artstudio.spirograph_2', 'Spirograph') }, { id: 'generative', icon: '\uD83C\uDF86', label: __alloT('stem.artstudio.generative_2', 'Generative') }, { id: 'spinArt', icon: '\uD83C\uDF00', label: __alloT('stem.artstudio.spin_art_2', 'Spin Art') }, { id: 'stringArt', icon: '\uD83D\uDD78', label: __alloT('stem.artstudio.string_art_2', 'String Art') }, { id: 'opArt', icon: '\uD83D\uDC41', label: __alloT('stem.artstudio.op_art_2', 'Op Art') }, { id: 'tessellation', icon: '\uD83D\uDD37', label: __alloT('stem.artstudio.tessellation_2', 'Tessellation') }, { id: 'fractal', icon: '\uD83D\uDD2E', label: __alloT('stem.artstudio.fractals_2', 'Fractals') }, { id: 'gradient', icon: '\uD83C\uDF08', label: __alloT('stem.artstudio.gradient_2', 'Gradient') }, { id: 'stereogram', icon: '\uD83D\uDC53', label: __alloT('stem.artstudio.stereogram_2', 'Stereogram') }, { id: 'sculpt3d', icon: '\uD83D\uDDFF', label: __alloT('stem.artstudio.sculpt_3d', 'Sculpt 3D') }, { id: 'contrast', icon: '\u267F', label: __alloT('stem.artstudio.contrast_2', 'Contrast') }, { id: 'harmonyHunt', icon: '\uD83C\uDFB6', label: __alloT('stem.artstudio.harmony', 'Harmony') }].map(function (tb) {

                return React.createElement("button", { "aria-label": 'Switch to ' + tb.label + ' tab', key: tb.id, onClick: function () { upd('tab', tb.id); if (typeof canvasNarrate === 'function') canvasNarrate('artStudio', 'tabSwitch', 'Switched to ' + tb.label + ' canvas tool.', { debounce: 500 }); }, role: 'tab', 'aria-selected': tab === tb.id, className: "flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all " + (tab === tb.id ? 'bg-white shadow-md text-pink-700' : 'text-slate-600 hover:text-slate-700 hover:bg-white/50') }, tb.icon + ' ' + tb.label);

              })

            ),

            // ── Topic-accent hero band per tab ──
            (function() {
              var TAB_META = {
                colorWheel:   { accent: '#db2777', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDFA8', title: __alloT('stem.artstudio.color_wheel_hsl_hsv_complementary_pair', 'Color Wheel \u2014 HSL/HSV + complementary pairs'),           hint: __alloT('stem.artstudio.hue_0_360_around_the_wheel_saturation_', 'Hue (0-360 around the wheel), saturation (purity), lightness (brightness). Complementary across, analogous adjacent, triadic 120\u00b0 apart. Newton put the spectrum on a wheel in 1666.') },
                mixer:        { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83E\uDDEA', title: __alloT('stem.artstudio.color_mixer_subtractive_vs_additive', 'Color Mixer \u2014 subtractive vs additive'),                  hint: __alloT('stem.artstudio.paint_and_print_subtractive_cmy_mixes_', 'Paint and print = subtractive (CMY mixes to dark); light and screens = additive (RGB mixes to white). Same world, completely different math \u2014 a printer thinks in K plates, a TV thinks in Hz.') },
                pixel:        { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDDBC',  title: __alloT('stem.artstudio.pixel_art_bitmap_craft_at_8_8_to_32_32', 'Pixel Art \u2014 bitmap craft at 8\u00d78 to 32\u00d732'),          hint: __alloT('stem.artstudio.each_pixel_is_a_deliberate_decision_ne', 'Each pixel is a deliberate decision. NES sprites famously fit a hero into 16\u00d716 with a 4-color palette. Bresenham\u2019s line algorithm draws diagonals without floats.') },
                symmetry:     { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\u2728',         title: __alloT('stem.artstudio.symmetry_reflection_rotation_glide', 'Symmetry \u2014 reflection, rotation, glide'),                hint: __alloT('stem.artstudio.bilateral_mirror_rotational_n_fold_poi', 'Bilateral (mirror), rotational (n-fold), point. The 17 wallpaper groups classify every possible repeating 2D pattern \u2014 Escher\u2019s entire body of work.') },
                spirograph:   { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83C\uDF00', title: __alloT('stem.artstudio.spirograph_hypotrochoid_roulettes', 'Spirograph \u2014 hypotrochoid roulettes'),                  hint: __alloT('stem.artstudio.a_small_circle_rolls_inside_a_big_one_', 'A small circle rolls inside a big one, pen offset from center. Ratio of radii determines petal count; offset sets thickness. Toy patented 1965, math from 1700s.') },
                generative:   { accent: '#4f46e5', soft: 'rgba(79,70,229,0.10)',  icon: '\uD83C\uDF86', title: __alloT('stem.artstudio.generative_algorithm_randomness_as_art', 'Generative \u2014 algorithm + randomness as artist'),         hint: __alloT('stem.artstudio.sol_lewitt_wrote_instructions_the_wall', 'Sol LeWitt wrote instructions; the wall installer was the executor. Today: Processing, p5.js, Cinder. \u201CThe artist is the rule, not the result.\u201D') },
                spinArt:      { accent: '#db2777', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDF00', title: __alloT('stem.artstudio.spin_art_centripetal_physics_in_paint', 'Spin Art \u2014 centripetal physics in paint'),               hint: __alloT('stem.artstudio.drop_paint_spin_watch_it_fling_outward', 'Drop paint, spin, watch it fling outward in spirals. Damien Hirst made millions selling spin paintings. Same physics as a salad spinner; F = m\u03c9\u00b2r.') },
                stringArt:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDD78', title: __alloT('stem.artstudio.string_art_curves_from_straight_lines', 'String Art \u2014 curves from straight lines'),                hint: __alloT('stem.artstudio.connect_every_n_th_nail_an_envelope_cu', 'Connect every n-th nail; an envelope curve emerges. Mary Everest Boole introduced this as classroom math c. 1900. The straight-line cardioid is still hypnotic.') },
                opArt:        { accent: '#475569', soft: 'rgba(71,85,105,0.10)',  icon: '\uD83D\uDC41', title: __alloT('stem.artstudio.op_art_fooling_the_visual_system', 'Op Art \u2014 fooling the visual system'),                    hint: __alloT('stem.artstudio.bridget_riley_s_moir_fields_vasarely_s', 'Bridget Riley\u2019s moir\u00e9 fields, Vasarely\u2019s grids. The brain\u2019s motion-detection edge cells over-fire on rapidly alternating contrast \u2014 the page appears to *vibrate*.') },
                tessellation: { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83D\uDD37', title: __alloT('stem.artstudio.tessellation_the_17_wallpaper_groups', 'Tessellation \u2014 the 17 wallpaper groups'),                hint: __alloT('stem.artstudio.every_periodic_2d_tiling_fits_one_of_1', 'Every periodic 2D tiling fits one of 17 symmetry groups. Escher figured this out by visiting the Alhambra in 1936; he then spent 30 years exhausting the catalogue.') },
                fractal:      { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDD2E', title: __alloT('stem.artstudio.fractal_self_similar_at_every_scale', 'Fractal \u2014 self-similar at every scale'),                  hint: __alloT('stem.artstudio.mandelbrot_1975_cauliflower_coastlines', 'Mandelbrot 1975. Cauliflower, coastlines, blood vessels, lightning, lung alveoli \u2014 all fractal. \u201CClouds are not spheres, mountains are not cones, bark is not smooth.\u201D') },
                gradient:     { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '\uD83C\uDF08', title: __alloT('stem.artstudio.gradient_smooth_color_transitions', 'Gradient \u2014 smooth color transitions'),                    hint: __alloT('stem.artstudio.css_gives_you_linear_radial_and_conic_', 'CSS gives you linear, radial, and conic gradients. Real rainbows have continuous spectra (no discrete bands) \u2014 the 7 \u201Ccolors of the rainbow\u201D were Newton\u2019s arbitrary choice for musical reasons.') },
                stereogram:   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDC53', title: __alloT('stem.artstudio.stereogram_3d_from_a_flat_page', 'Stereogram \u2014 3D from a flat page'),                       hint: __alloT('stem.artstudio.90s_magic_eye_craze_each_eye_sees_a_sl', '90s Magic Eye craze. Each eye sees a slightly shifted version; if you cross or diverge correctly, the brain fuses them into depth. ~5% of people genuinely can\u2019t \u2014 not their fault.') },

                contrast:     { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)', icon: '\u267F',         title: __alloT('stem.artstudio.contrast_wcag_4_5_1_3_1_apca', 'Contrast \u2014 WCAG 4.5:1 / 3:1 / APCA'),                   hint: __alloT('stem.artstudio.wcag_2_1_normal_text_4_5_1_large_3_1_w', 'WCAG 2.1: normal text 4.5:1, large 3:1. Why low contrast hurts low-vision readers, even if you can read it. APCA (the WCAG 3.0 successor) uses perceptual lightness, not raw luminance ratio.') },
                harmonyHunt:  { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83C\uDFB6', title: __alloT('stem.artstudio.harmony_lab_title', 'Harmony - sound, ratio, and color'), hint: __alloT('stem.artstudio.harmony_lab_hint', 'Compare consonant and dissonant intervals, connect frequency ratios to pattern, and translate musical relationships into visual harmony.') }
              };
              var meta = TAB_META[tab] || TAB_META.colorWheel;
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

            tab === 'colorWheel' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "flex flex-col lg:flex-row gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("canvas", { tabIndex: 0, ref: wheelRef, width: 320, height: 320, role: "img",
                  'aria-label': 'Interactive color wheel. Hue ' + (d.hue || 0) + ' degrees, saturation ' + (d.sat !== undefined ? d.sat : 100) + ' percent, lightness ' + (d.lit !== undefined ? d.lit : 50) + ' percent.',
                  'aria-describedby': "artstudio-color-wheel-help",
                  'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End",
                  className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair flex-shrink-0 focus-visible:ring-4 focus-visible:ring-pink-600 focus-visible:ring-offset-2",
                  style: { background: '#1e1e2e', maxWidth: '100%' } }),

                React.createElement("div", { className: "flex-1 space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-pink-700 mb-2" }, __alloT('stem.artstudio.selected_color', "\uD83C\uDFAF Selected Color")),

                    React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

                      React.createElement("div", { "aria-hidden": "true", style: { width: 60, height: 60, borderRadius: 12, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "HSL(" + (d.hue || 0) + ", " + (d.sat || 100) + "%, " + (d.lit || 50) + "%)"),

                        React.createElement("p", { id: "artstudio-color-wheel-help", className: "text-[11px] text-slate-600" }, "Click the wheel, or focus it and use Arrow keys to adjust hue; hold Shift for 10-degree steps; Home selects 0 degrees and End selects 359 degrees.")

                      )

                    ),

                    [{ k: 'hue', label: 'Hue', min: 0, max: 360 }, { k: 'sat', label: __alloT('stem.artstudio.saturation', 'Saturation %'), min: 0, max: 100 }, { k: 'lit', label: __alloT('stem.artstudio.lightness', 'Lightness %'), min: 0, max: 100 }].map(function (s) {

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-color-' + s.k, className: "text-[11px] font-bold text-pink-700 block mb-0.5" }, s.label + ": " + (d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50))),

                        React.createElement("input", { id: 'artstudio-color-' + s.k, type: "range", min: s.min, max: s.max, value: d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50), onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-pink-600" })

                      );

                    })

                  ),

                  React.createElement("div", { className: "bg-white rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { id: "artstudio-color-harmony-label", className: "text-[11px] font-bold text-pink-700 mb-2" }, __alloT('stem.artstudio.color_harmony', "\uD83D\uDD17 Color Harmony")),

                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-color-harmony-label" },

                      ['complementary', 'triadic', 'analogous', 'split'].map(function (h) {

                        return React.createElement("button", { key: h, "aria-pressed": (d.harmony || 'complementary') === h, onClick: function () { upd('harmony', h); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all " + ((d.harmony || 'complementary') === h ? 'bg-pink-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-pink-50') }, h);

                      })

                    )

                  )

                )

              )

            ),

            tab === 'mixer' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-3 gap-4 items-center" },

                React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix1.h + ',' + mix1.s + '%,' + mix1.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-indigo-700 mb-2" }, __alloT('stem.artstudio.color_a', "Color A")),

                  [{ k: 'mix1H', max: 360, val: mix1.h }, { k: 'mix1S', max: 100, val: mix1.s }, { k: 'mix1L', max: 100, val: mix1.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, 'aria-label': s.k + ' channel', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-indigo-500 mb-1" });

                  })

                ),

                React.createElement("div", { className: "text-center" },

                  React.createElement("div", { style: { width: 100, height: 100, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mixed.h + ',' + mixed.s + '%,' + mixed.l + '%)', border: '4px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-slate-700 mb-2" }, __alloT('stem.artstudio.result', "\uD83C\uDFAF Result")),

                  React.createElement("input", { type: "range", min: 0, max: 100, value: Math.round(mixRatio * 100), 'aria-label': __alloT('stem.artstudio.color_mix_ratio', 'Color mix ratio'), onChange: function (e) { upd('mixRatio', parseInt(e.target.value) / 100); }, className: "w-full accent-pink-500" }),

                  React.createElement("p", { className: "text-[11px] text-slate-600" }, Math.round((1 - mixRatio) * 100) + '% A + ' + Math.round(mixRatio * 100) + '% B')

                ),

                React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix2.h + ',' + mix2.s + '%,' + mix2.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, __alloT('stem.artstudio.color_b', "Color B")),

                  [{ k: 'mix2H', max: 360, val: mix2.h }, { k: 'mix2S', max: 100, val: mix2.s }, { k: 'mix2L', max: 100, val: mix2.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, 'aria-label': s.k + ' filter', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-rose-500 mb-1" });

                  })

                )

              )

            ),

            tab === 'pixel' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("div", { style: { width: 28, height: 28, borderRadius: 6, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } }),

                React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, __alloT('stem.artstudio.current_color', "Current color")),

                React.createElement("div", { className: "ml-auto flex gap-1 flex-wrap" },

                  [{ id: 'brush', icon: '\uD83D\uDD8C', label: __alloT('stem.artstudio.brush', 'Brush') }, { id: 'eraser', icon: '\uD83E\uDDFD', label: __alloT('stem.artstudio.eraser', 'Eraser') }, { id: 'fill', icon: '\uD83E\uDEA3', label: __alloT('stem.artstudio.fill', 'Fill') }].map(function (t) {

                    return React.createElement("button", { "aria-label": t.label, "aria-pressed": (d.pixelTool || 'brush') === t.id, key: t.id, onClick: function () { upd('pixelTool', t.id); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.pixelTool || 'brush') === t.id ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, t.icon + ' ' + t.label);

                  }),

                  React.createElement("button", { onClick: function () { upd('pixelData', {}); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_2', "\uD83D\uDDD1 Clear")),

                  React.createElement("button", { onClick: function () { var c = document.querySelector('canvas[style*="pixelated"]'); if (!c) return; var link = document.createElement('a'); link.download = 'pixel-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_png', "\uD83D\uDCE5 Export PNG")),

                  React.createElement("select", { 'aria-label': __alloT('stem.artstudio.grid_size', 'Grid size'), value: typeof d.pixelGrid === 'number' ? d.pixelGrid : 16, onChange: function (e) { upd('pixelGrid', parseInt(e.target.value)); upd('pixelData', {}); }, className: "px-2 py-1 text-xs border border-slate-400 rounded-lg" },

                    [8, 16, 24, 32].map(function (s) { return React.createElement("option", { key: s, value: s }, s + 'x' + s); }))

                )

              ),

              // Color Palette Presets

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-400" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes', "\uD83C\uDFA8 Palettes")),

                  [{ id: 'retro', label: __alloT('stem.artstudio.retro', '\uD83D\uDD79 Retro'), colors: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]] },

                   { id: 'nature', label: __alloT('stem.artstudio.nature', '\uD83C\uDF3F Nature'), colors: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]] },

                   { id: 'warm', label: __alloT('stem.artstudio.warm', '\uD83D\uDD25 Warm'), colors: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]] },

                   { id: 'cool', label: __alloT('stem.artstudio.cool', '\u2744 Cool'), colors: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]] },

                   { id: 'neon', label: __alloT('stem.artstudio.neon', '\uD83D\uDCA5 Neon'), colors: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, "aria-pressed": (d.activePalette || 'retro') === pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": 'Choose color: hue ' + c[0] + ' degrees, saturation ' + c[1] + ' percent, lightness ' + c[2] + ' percent', "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("p", { id: "artstudio-pixel-keyboard-help", className: "text-xs text-slate-600 text-center" },
                "Keyboard: focus the canvas, move the cell cursor with Arrow keys, jump with Home or End, and press Space or Enter to use the selected tool."
              ),
              React.createElement("canvas", { tabIndex: 0, ref: pixelRef, width: 512, height: 512, role: "img",
                'aria-label': 'Pixel art editor, ' + (typeof d.pixelGrid === 'number' ? d.pixelGrid : 16) + ' by ' + (typeof d.pixelGrid === 'number' ? d.pixelGrid : 16) + ' grid with ' + Object.keys(d.pixelData || {}).length + ' colored cells.',
                'aria-describedby': "artstudio-pixel-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter Space",
                className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', imageRendering: 'pixelated' } })

            ),

            tab === 'symmetry' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.folds', "\u2728 Folds:")),

                [4, 6, 8, 12, 16].map(function (f) {

                  return React.createElement("button", { "aria-label": f + ' symmetry folds', "aria-pressed": (d.symmetryFolds || 6) === f, key: f, onClick: function () { upd('symmetryFolds', f); }, className: "px-3 py-1 rounded-lg text-xs font-bold transition-all " + ((d.symmetryFolds || 6) === f ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, f);

                }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-3" }, "Brush:"),

                React.createElement("input", { type: "range", min: 1, max: 10, value: d.brushSize || 3, 'aria-label': __alloT('stem.artstudio.brush_size', 'Brush size'), onChange: function (e) { upd('brushSize', parseInt(e.target.value)); }, className: "w-20 accent-pink-600" }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Mode:"),

                React.createElement("button", { "aria-pressed": (d.symBrushMode || 'rainbow') === 'solid', onClick: function () { upd('symBrushMode', 'solid'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'solid' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, __alloT('stem.artstudio.solid', "\uD83D\uDD8C Solid")),

                React.createElement("button", { "aria-pressed": (d.symBrushMode || 'rainbow') === 'rainbow', onClick: function () { upd('symBrushMode', 'rainbow'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'rainbow' ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, __alloT('stem.artstudio.rainbow', "\uD83C\uDF08 Rainbow")),

                React.createElement("button", { "aria-pressed": !!d.symMirrorOnly, onClick: function () { upd('symMirrorOnly', !(d.symMirrorOnly)); upd('symmetryClear', Date.now()); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.symMirrorOnly ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50') }, d.symMirrorOnly ? '\uD83E\uDE9E Mirror \u2714' : '\uD83E\uDE9E Mirror'),

                React.createElement("button", { onClick: function () { upd('symmetryClear', Date.now()); }, className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_3', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { onClick: function () { var c = document.getElementById('symmetryCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'symmetry-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_png_2', "\uD83D\uDCE5 Export PNG")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.fullscreen', "Fullscreen"), onClick: function () { toggleFullscreen('symmetryCanvasContainer'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all" }, __alloT('stem.artstudio.fullscreen_2', "\uD83D\uDD0D Fullscreen"))

              ),

              React.createElement("div", { id: 'symmetryCanvasContainer', className: "bg-slate-900 rounded-xl p-2 relative flex flex-col items-center justify-center w-full" },

                React.createElement("div", { className: "bg-slate-800/80 rounded-xl p-2 border border-slate-700 w-full mb-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes_2', "\uD83C\uDFA8 Palettes")),

                  [{ id: 'retro', label: __alloT('stem.artstudio.retro_2', '\uD83D\uDD79 Retro') }, { id: 'nature', label: __alloT('stem.artstudio.nature_2', '\uD83C\uDF3F Nature') }, { id: 'warm', label: __alloT('stem.artstudio.warm_2', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_2', '\u2744 Cool') }, { id: 'neon', label: __alloT('stem.artstudio.neon_2', '\uD83D\uDCA5 Neon') }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, "aria-pressed": (d.activePalette || 'retro') === pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": 'Choose color: hue ' + c[0] + ' degrees, saturation ' + c[1] + ' percent, lightness ' + c[2] + ' percent', "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("p", { id: "artstudio-symmetry-keyboard-help", className: "mb-1 text-xs text-slate-200 text-center" },
                "Keyboard: Arrow keys move the drawing cursor; hold Shift with an Arrow key to draw a line; Space or Enter stamps mirrored marks; Home returns to center; Alt makes one-pixel moves."
              ),
              React.createElement("canvas", { tabIndex: 0, id: 'symmetryCanvas', ref: symmetryRef, width: 512, height: 512, role: "img",
                'aria-label': 'Symmetry drawing canvas with ' + (d.symmetryFolds || 6) + ' folds.',
                'aria-describedby': "artstudio-symmetry-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                key: 'sym-' + (d.symmetryFolds || 6) + '-' + (d.symmetryClear || 0) + '-' + (d.symMirrorOnly ? 'm' : 'r'),
                className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block mt-3 flex-shrink-0 focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                style: { maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', background: 'var(--allo-stem-canvas, #0f172a)' } }),
              React.createElement("span", {
                "data-symmetry-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0f172a]",
                style: { display: 'none' }
              })

              ), // end symmetryCanvasContainer

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-4 border border-violet-200" },

                React.createElement("button", { onClick: function () { upd('showSymInfo', !d.showSymInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-violet-700" },

                  React.createElement("span", null, __alloT('stem.artstudio.learn_about_symmetry', "\uD83D\uDD2E Learn About Symmetry")),

                  React.createElement("span", null, d.showSymInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSymInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF3B ", React.createElement("strong", null, __alloT('stem.artstudio.radial_symmetry', "Radial symmetry")), __alloT('stem.artstudio.repeats_a_pattern_around_a_central_poi', " repeats a pattern around a central point. In "), React.createElement("strong", null, "nature"), __alloT('stem.artstudio.starfish_5_fold_snowflakes_6_fold_and_', ", starfish (5-fold), snowflakes (6-fold), and flowers show this everywhere.")),

                  React.createElement("p", null, "\uD83D\uDD73 ", React.createElement("strong", null, "4-fold:"), __alloT('stem.artstudio.tile_patterns_quilts_floor_mosaics', " Tile patterns, quilts, floor mosaics. "), React.createElement("strong", null, "6-fold:"), __alloT('stem.artstudio.snowflakes_honeycombs_islamic_star_pat', " Snowflakes, honeycombs, Islamic star patterns. "), React.createElement("strong", null, "8-fold:"), __alloT('stem.artstudio.mandala_art_rose_windows_in_cathedrals', " Mandala art, rose windows in cathedrals.")),

                  React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, __alloT('stem.artstudio.cultural_connections', "Cultural connections:")), __alloT('stem.artstudio.islamic_geometric_art_uses_radial_symm', " Islamic geometric art uses radial symmetry extensively. Celtic knots, Navajo textiles, and Japanese family crests (\u201Cmon\u201D) all rely on rotational symmetry.")),

                  React.createElement("p", null, "\uD83E\uDE9E ", React.createElement("strong", null, __alloT('stem.artstudio.mirror_mode', "Mirror mode")), __alloT('stem.artstudio.uses_bilateral_reflection_symmetry_the', " uses bilateral (reflection) symmetry \u2014 the kind found in faces, butterflies, and leaves. It\u2019s the most common symmetry in the animal kingdom.")),

                  React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, __alloT('stem.artstudio.rainbow_brush', "Rainbow brush")), __alloT('stem.artstudio.cycles_through_the_color_spectrum_as_y', " cycles through the color spectrum as you draw, creating gradient-like mandala effects automatically."))

                )

              )

            ),

            tab === 'contrast' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },

                [

                  { prefix: 'fg', title: __alloT('stem.artstudio.foreground_text', "Foreground (Text)"), h: fgH, s: fgS, l: fgL },

                  { prefix: 'bg', title: __alloT('stem.artstudio.background', "Background"), h: bgH, s: bgS, l: bgL }

                ].map(function (group) {

                  var headingId = 'artstudio-contrast-' + group.prefix + '-heading';

                  var colorText = 'HSL ' + group.h + ' degrees, ' + group.s + ' percent saturation, ' + group.l + ' percent lightness';

                  return React.createElement("section", { key: group.prefix, role: "group", "aria-labelledby": headingId, className: "bg-white rounded-xl p-4 border border-slate-400" },

                    React.createElement("h4", { id: headingId, className: "text-xs font-bold text-slate-700 mb-3" }, group.title),

                    React.createElement("div", { role: "img", "aria-label": group.title + ' color preview: ' + colorText + '.', style: { width: '100%', height: 50, borderRadius: 8, background: 'hsl(' + group.h + ',' + group.s + '%,' + group.l + '%)', marginBottom: 8, border: '1px solid #64748b' } }),

                    [

                      { suffix: 'H', label: __alloT('stem.artstudio.hue', 'Hue'), max: 360, val: group.h, valueText: group.h + ' degrees' },

                      { suffix: 'S', label: __alloT('stem.artstudio.saturation', 'Saturation'), max: 100, val: group.s, valueText: group.s + ' percent' },

                      { suffix: 'L', label: __alloT('stem.artstudio.lightness', 'Lightness'), max: 100, val: group.l, valueText: group.l + ' percent' }

                    ].map(function (control) {

                      var stateKey = group.prefix + control.suffix;

                      var inputId = 'artstudio-contrast-' + stateKey;

                      return React.createElement("div", { key: stateKey, className: "mb-2" },

                        React.createElement("label", { htmlFor: inputId, className: "text-[11px] text-slate-700 font-bold block" }, control.label + ': ' + control.val),

                        React.createElement("input", { id: inputId, type: "range", min: 0, max: control.max, value: control.val, "aria-valuetext": control.valueText, onChange: function (e) { upd(stateKey, parseInt(e.target.value)); }, className: "w-full accent-slate-700" })

                      );

                    })

                  );

                })

              ),

              React.createElement("section", { role: "status", "aria-live": "polite", "aria-atomic": "true", "aria-labelledby": "artstudio-contrast-result-heading", className: "rounded-xl border-2 p-4 sm:p-6 text-center " + (passAA ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') },

                React.createElement("h4", { id: "artstudio-contrast-result-heading", className: "text-sm font-bold text-slate-800 mb-3" }, __alloT('stem.artstudio.contrast_result', "WCAG 2.2 contrast result")),

                React.createElement("div", { role: "group", "aria-label": "Text contrast preview", className: "mb-3", style: { padding: 20, borderRadius: 12, background: 'hsl(' + bgH + ',' + bgS + '%,' + bgL + '%)', border: '1px solid #64748b' } },

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 24, fontWeight: 'bold' } }, __alloT('stem.artstudio.sample_text', "Sample Text")),

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 14 } }, __alloT('stem.artstudio.the_quick_brown_fox_jumps_over_the_laz', "The quick brown fox jumps over the lazy dog"))

                ),

                React.createElement("p", { className: "text-3xl font-bold " + (passAA ? 'text-green-800' : 'text-red-800') }, contrastRatio.toFixed(2) + ':1'),

                React.createElement("p", { className: "text-xs text-slate-700 mt-2" }, __alloT('stem.artstudio.wcag_22_contrast_guidance', "WCAG 2.2 AA requires 4.5:1 for normal text and 3:1 for large text. AAA requires 7:1 for normal text.")),

                React.createElement("div", { className: "flex flex-wrap justify-center gap-2 sm:gap-3 mt-3" },

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAALarge ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAALarge ? '\u2705 Pass' : '\u274C Fail') + ' AA Large'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAA ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAA ? '\u2705 Pass' : '\u274C Fail') + ' AA Normal'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAAA ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAAA ? '\u2705 Pass' : '\u274C Fail') + ' AAA Normal')

                )

              )

            ),

            // === Sculpt 3D — the full sculpting suite on the shared Prim3D seams ===
            // Same recipe format + PURE edit ops (prim3d_module.js) that power
            // Free Forms, Memory Palace, and Geometry Sandbox: presets, hand-built
            // part editing, optional AI describe/refine, a persistent gallery, and
            // PNG export. Preview follows this tool's hook-free convention: a
            // callback ref owns the WebGL lifecycle, caching on the canvas element
            // and self-terminating (with disposal) once the canvas leaves the DOM.
            tab === 'sculpt3d' && (function() {
              var P3D = window.AlloModules && window.AlloModules.Prim3D;
              var THREE_OK = !!window.THREE;
              function _loadScript(src, onDone) {
                var s = document.createElement('script'); s.src = src; s.async = true;
                s.onload = function() { onDone(true); }; s.onerror = function() { onDone(false); };
                document.head.appendChild(s);
              }
              if (!THREE_OK && !window._artSculptThreeLoading) {
                window._artSculptThreeLoading = true;
                window.StemLab.ensureThree({ orbit: false }).then(function () {
                  upd('_sculptPing', Date.now());
                }).catch(function () {
                  window._artSculptThreeLoading = false;   // failed load must not latch "loading" forever — revisiting the tab retries
                  upd('_sculptPing', Date.now());
                });
              }
              if (!P3D && !window._artSculptP3dLoading) {
                window._artSculptP3dLoading = true;
                var base = 'https://alloflow-cdn.pages.dev/', q = '';
                try {
                  var scr = document.querySelectorAll('script[src]');
                  for (var si = 0; si < scr.length; si++) {
                    var src = scr[si].getAttribute('src') || '';
                    var m = src.match(/^(.*\/)(?:stem_lab\/stem_tool_artstudio|stem_lab\/stem_tool_geosandbox|memory_palace_module|concept_graph_3d_module|prim3d_module)\.js(\?.*)?$/);
                    if (m) { base = m[1]; q = m[2] || ''; break; }
                  }
                } catch (e) {}
                _loadScript(base + 'prim3d_module.js' + q, function(ok) {
                  if (!ok) window._artSculptP3dLoading = false;
                  upd('_sculptPing', Date.now());
                });
              }
              if (!P3D || !window.THREE) {
                return React.createElement("div", { className: "p-8 text-center text-slate-500 text-sm", role: "status" }, '🗿 ' + __alloT('stem.artstudio.sculpt_loading', 'Loading the sculpting engine…'));
              }
              var recipe = d.sculptRecipe ? P3D.normalizeRecipe(d.sculptRecipe) : null;
              var parts = (recipe && recipe.parts) || [];
              var sel = Math.min(d.sculptSel || 0, Math.max(0, parts.length - 1));
              var gallery = d.sculptGallery || {};
              var sculptAuto = d.sculptAuto === undefined ? !reducedMotion : !!d.sculptAuto;
              var sculptSummary = recipe ? ((recipe.name || 'Custom sculpture') + ' with ' + parts.length + (parts.length === 1 ? ' part' : ' parts')) : 'Empty sculpture scene';
              var setRecipe = function(r) { upd('sculptRecipe', r); };
              var partOp = function(op) { var next = op(P3D, recipe); if (next !== recipe) setRecipe(next); };
              var _cnvBox = { current: null };
              // ── preview lifecycle (callback ref; state cached ON the canvas) ──
              var sculptRef = function(cnv) {
                if (!cnv) return;
                _cnvBox.current = cnv;
                var THREE = window.THREE;
                cnv.dataset.auto = sculptAuto ? '1' : '0';
                cnv.dataset.summary = sculptSummary;
                if (cnv._p3d && !cnv._p3d.drag) cnv._p3d.auto = sculptAuto;
                if (cnv._p3d && cnv._p3d.updateA11y) cnv._p3d.updateA11y();
                else cnv.setAttribute('aria-label', '3D sculpture preview. ' + sculptSummary + '. Auto-rotation ' + (sculptAuto ? 'running' : 'paused') + '.');
                if (!cnv._p3d) {
                  var scene3 = new THREE.Scene(); scene3.background = new THREE.Color('#0f172a');
                  var cam = new THREE.PerspectiveCamera(45, cnv.width / cnv.height, 0.1, 100);
                  var ren = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
                  ren.setSize(cnv.width, cnv.height, false);
                  scene3.add(new THREE.AmbientLight(0xffffff, 0.6));
                  var d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(2, 3, 2); scene3.add(d1);
                  var grid = new THREE.GridHelper(3, 12, 0x475569, 0x1e293b); scene3.add(grid);
                  cnv._p3d = { scene: scene3, cam: cam, ren: ren, obj: null, json: '', yaw: 0.7, pitch: 0.5, auto: sculptAuto };
                  function updateSculptViewLabel() {
                    var state = cnv._p3d;
                    if (!state) return;
                    var yawDegrees = Math.round((((state.yaw * 180 / Math.PI) % 360) + 360) % 360);
                    var pitchDegrees = Math.round(state.pitch * 180 / Math.PI);
                    cnv.setAttribute('aria-label', '3D sculpture preview. ' + cnv.dataset.summary + '. View angle ' +
                      yawDegrees + ' degrees, elevation ' + pitchDegrees + ' degrees. Auto-rotation ' + (state.auto ? 'running' : 'paused') + '.');
                  }
                  cnv._p3d.updateA11y = updateSculptViewLabel;
                  function announceSculptView(message) {
                    updateSculptViewLabel();
                    var state = cnv._p3d;
                    if (!state || typeof announceToSR !== 'function') return;
                    announceToSR(message + ' View angle ' + Math.round((((state.yaw * 180 / Math.PI) % 360) + 360) % 360) +
                      ' degrees, elevation ' + Math.round(state.pitch * 180 / Math.PI) + ' degrees.');
                  }
                  function endSculptDrag() {
                    if (cnv._p3d) {
                      cnv._p3d.drag = null;
                      cnv._p3d.auto = cnv.dataset.auto === '1';
                      updateSculptViewLabel();
                    }
                  }
                  // Drag to orbit; the configured rotation preference is restored on release.
                  cnv.style.touchAction = 'none';
                  cnv.addEventListener('pointerdown', function(ev) { cnv._p3d.drag = { x: ev.clientX, y: ev.clientY }; cnv._p3d.auto = false; updateSculptViewLabel(); try { cnv.setPointerCapture(ev.pointerId); } catch (e) {} });
                  cnv.addEventListener('pointermove', function(ev) {
                    var st = cnv._p3d; if (!st || !st.drag) return;
                    st.yaw += (ev.clientX - st.drag.x) * 0.01;
                    st.pitch = Math.max(0.05, Math.min(1.45, st.pitch + (ev.clientY - st.drag.y) * 0.008));
                    st.drag = { x: ev.clientX, y: ev.clientY };
                    updateSculptViewLabel();
                  });
                  cnv.addEventListener('pointerup', endSculptDrag);
                  cnv.addEventListener('pointercancel', endSculptDrag);
                  cnv.onkeydown = function(event) {
                    var st = cnv._p3d;
                    if (!st) return;
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      var step = event.altKey ? 0.02 : 0.12;
                      if (event.key === 'ArrowLeft') st.yaw -= step;
                      if (event.key === 'ArrowRight') st.yaw += step;
                      if (event.key === 'ArrowUp') st.pitch = Math.min(1.45, st.pitch + step);
                      if (event.key === 'ArrowDown') st.pitch = Math.max(0.05, st.pitch - step);
                      st.auto = false; cnv.dataset.auto = '0'; upd('sculptAuto', false);
                      announceSculptView('Sculpture view moved; auto-rotation paused.');
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      st.yaw = 0.7; st.pitch = 0.5; st.auto = false; cnv.dataset.auto = '0'; upd('sculptAuto', false);
                      announceSculptView('Sculpture view reset; auto-rotation paused.');
                    } else if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      st.auto = !st.auto; cnv.dataset.auto = st.auto ? '1' : '0'; upd('sculptAuto', st.auto);
                      announceSculptView(st.auto ? 'Sculpture auto-rotation resumed.' : 'Sculpture auto-rotation paused.');
                    }
                  };
                  updateSculptViewLabel();
                  var loop = function() {
                    var st = cnv._p3d;
                    if (!st) return;
                    if (!cnv.isConnected) {   // tab switched away — full teardown, no zombie loop
                      try {
                        st.scene.traverse(function(o) {
                          if (o.geometry && o.geometry.dispose) o.geometry.dispose();
                          var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
                          mats.forEach(function(mx) { try { if (mx.map && mx.map.dispose) mx.map.dispose(); mx.dispose(); } catch (e) {} });
                        });
                        st.ren.dispose(); if (st.ren.forceContextLoss) st.ren.forceContextLoss();
                      } catch (e) {}
                      cnv._p3d = null;
                      return;
                    }
                    if (st.auto) st.yaw += 0.006;
                    var R = 2.6;
                    st.cam.position.set(Math.sin(st.yaw) * Math.cos(st.pitch) * R, 0.5 + Math.sin(st.pitch) * R * 0.8, Math.cos(st.yaw) * Math.cos(st.pitch) * R);
                    st.cam.lookAt(0, 0.5, 0);
                    st.ren.render(st.scene, st.cam);
                    cnv._p3dAnim = requestAnimationFrame(loop);
                  };
                  loop();
                }
                // (re)build the sculpture when the recipe changed
                var st2 = cnv._p3d;
                var json = recipe ? JSON.stringify(recipe) : '';
                if (st2 && st2.json !== json) {
                  st2.json = json;
                  if (st2.obj) {
                    try {
                      st2.scene.remove(st2.obj);
                      st2.obj.traverse(function(o) { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; mats.forEach(function(mx) { try { mx.dispose(); } catch (e) {} }); });
                    } catch (e) {}
                    st2.obj = null;
                  }
                  if (recipe) { try { st2.obj = P3D.buildObject(window.THREE, recipe, { unit: 1 }); if (st2.obj) st2.scene.add(st2.obj); } catch (e) {} }
                }
              };
              var SHAPE_ICONS = { box: '📦', sphere: '⚪', cylinder: '🛢', cone: '🔺', torus: '🍩' };
              var mini = "min-h-[40px] min-w-[40px] rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-pink-50";
              var doAiSculpt = function() {
                // busy flag lives on window, NOT in toolData — a persisted busy
                // flag from an interrupted request would disable the button forever.
                if (typeof callGemini !== 'function' || window._artSculptBusy) return;
                var subj = (d.sculptText || '').trim(); if (!subj) return;
                window._artSculptBusy = true; upd('_sculptPing', (d._sculptPing || 0) + 1);
                var prompt = recipe ? P3D.buildRefinePrompt(recipe, subj) : P3D.buildRecipePrompt(subj);
                callGemini(prompt, false, false, 0.85).then(function(resp) {
                  var r = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
                  window._artSculptBusy = false;
                  if (r) { if (!recipe) r.name = subj.slice(0, 80); upd('sculptSel', 0); setRecipe(r); if (typeof announceToSR === 'function') announceToSR('Sculpture updated'); }
                  else { upd('_sculptPing', (d._sculptPing || 0) + 2); if (addToast) addToast('⚠️ ' + __alloT('stem.artstudio.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error'); }
                }).catch(function() { window._artSculptBusy = false; upd('_sculptPing', (d._sculptPing || 0) + 2); });
              };
              var doExportPng = function() {
                var cnv = _cnvBox.current; if (!cnv || !cnv._p3d) return;
                try {
                  cnv._p3d.ren.render(cnv._p3d.scene, cnv._p3d.cam);   // synchronous render → valid buffer
                  var a = document.createElement('a');
                  a.href = cnv.toDataURL('image/png');
                  a.download = ((recipe && recipe.name) || 'sculpture').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.png';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  if (typeof announceToSR === 'function') announceToSR('Sculpture picture saved.');
                } catch (e) {
                  if (typeof announceToSR === 'function') announceToSR('Unable to save the sculpture picture.');
                }
              };
              return React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                // preview column
                React.createElement("div", null,
                  React.createElement("canvas", { role: "img", "aria-label": '3D sculpture preview. ' + sculptSummary + '. Auto-rotation ' + (sculptAuto ? 'running' : 'paused') + '.',
                    ref: sculptRef,
                    width: 480,
                    height: 420,
                    className: "w-full rounded-xl border border-slate-400 focus-visible:ring-4 focus-visible:ring-pink-600 focus-visible:ring-offset-2",
                    tabIndex: 0,
                    "aria-describedby": "artstudio-sculpt-keyboard-help",
                    "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space"
                  }),
                  React.createElement("p", { id: "artstudio-sculpt-keyboard-help", className: "mt-2 text-[11px] text-slate-600" }, "Drag to orbit. Keyboard: Arrow keys orbit; Alt with an Arrow key makes a fine adjustment; Home resets the view; Space or Enter toggles auto-rotation. Manual keyboard orbit pauses auto-rotation."),
                  React.createElement("div", { className: "flex flex-wrap gap-2 mt-2", role: "group", "aria-label": "3D preview actions" },
                    React.createElement("button", {
                      className: mini + " flex-1",
                      "aria-label": sculptAuto ? "Pause 3D preview rotation" : "Resume 3D preview rotation",
                      "aria-pressed": !sculptAuto,
                      onClick: function() {
                        var nextAuto = !sculptAuto;
                        var cnv = _cnvBox.current;
                        if (cnv && cnv._p3d) { cnv._p3d.auto = nextAuto; cnv.dataset.auto = nextAuto ? '1' : '0'; }
                        upd('sculptAuto', nextAuto);
                        if (typeof announceToSR === 'function') announceToSR(nextAuto ? 'Sculpture auto-rotation resumed.' : 'Sculpture auto-rotation paused.');
                      }
                    }, sculptAuto ? '⏸ ' + __alloT('stem.artstudio.pause', 'Pause') : '▶ ' + __alloT('stem.artstudio.resume', 'Resume')),
                    React.createElement("button", { className: mini + " flex-1", onClick: doExportPng }, '📷 ' + __alloT('stem.artstudio.sculpt_export', 'Save picture')),
                    recipe ? React.createElement("button", { className: mini + " flex-1", onClick: function() { upd('sculptSel', 0); setRecipe(null); if (typeof announceToSR === 'function') announceToSR('Sculpture cleared.'); } }, '🗑 ' + __alloT('stem.artstudio.sculpt_clear', 'Clear')) : null
                  )
                ),
                // editor column
                React.createElement("div", { className: "space-y-2" },
                  React.createElement("h3", { className: "font-black text-slate-700 text-sm" }, '🗿 ' + __alloT('stem.artstudio.sculpt_title', 'Sculpt with primitive shapes')),
                  !parts.length ? React.createElement("div", null,
                    React.createElement("span", { id: "artstudio-sculpt-presets-label", className: "text-[11px] font-bold text-slate-600 mb-1 block" }, __alloT('stem.artstudio.sculpt_presets', 'Start from a preset')),
                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-sculpt-presets-label" }, (P3D.PRESETS || []).map(function(ps) {
                      return React.createElement("button", { key: ps.id, className: mini, title: ps.label, "aria-label": 'Preset: ' + ps.label, onClick: function() { upd('sculptSel', 0); setRecipe(P3D.getPreset(ps.id)); } }, ps.emoji);
                    }))
                  ) : null,
                  React.createElement("div", null,
                    React.createElement("span", { id: "artstudio-sculpt-add-label", className: "text-[11px] font-bold text-slate-600 mb-1 block" }, __alloT('stem.artstudio.sculpt_add_part', 'Add a part')),
                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-sculpt-add-label" }, (P3D.SHAPES || []).map(function(shp) {
                      return React.createElement("button", { key: shp, className: mini, title: 'Add ' + shp, "aria-label": 'Add ' + shp, onClick: function() { partOp(function(P, r) { return P.addPart(r, shp); }); upd('sculptSel', parts.length); } }, SHAPE_ICONS[shp] || shp);
                    }))
                  ),
                  parts.length ? React.createElement("div", null,
                    React.createElement("div", { className: "flex flex-wrap gap-1 mb-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_parts', 'Parts') }, parts.map(function(p, i) {
                      return React.createElement("button", { key: i, className: mini + (i === sel ? ' ring-2 ring-pink-500' : ''), "aria-pressed": i === sel ? 'true' : 'false', "aria-label": 'Part ' + (i + 1) + ': ' + p.shape, style: { borderBottom: '3px solid ' + p.color }, onClick: function() { upd('sculptSel', i); } }, SHAPE_ICONS[p.shape] || p.shape);
                    })),
                    React.createElement("div", { className: "grid grid-cols-6 gap-1 mb-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_move', 'Move the selected part') },
                      [['◀', 'position', 0, -0.08, 'Left'], ['▶', 'position', 0, 0.08, 'Right'], ['⬆', 'position', 1, 0.08, 'Up'], ['⬇', 'position', 1, -0.08, 'Down'], ['↗', 'position', 2, 0.08, 'Closer'], ['↙', 'position', 2, -0.08, 'Farther']].map(function(cfg) {
                        return React.createElement("button", { key: cfg[4], className: mini, title: cfg[4], "aria-label": cfg[4], onClick: function() { partOp(function(P, r) { return P.nudgePart(r, sel, cfg[1], cfg[2], cfg[3]); }); } }, cfg[0]);
                      })),
                    React.createElement("div", { className: "grid grid-cols-6 gap-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_tools', 'Shape tools') },
                      React.createElement("button", { className: mini, title: 'Bigger', "aria-label": 'Bigger', onClick: function() { partOp(function(P, r) { return P.scalePart(r, sel, 1.25); }); } }, '➕'),
                      React.createElement("button", { className: mini, title: 'Smaller', "aria-label": 'Smaller', onClick: function() { partOp(function(P, r) { return P.scalePart(r, sel, 0.8); }); } }, '➖'),
                      React.createElement("button", { className: mini, title: 'Spin', "aria-label": 'Spin', onClick: function() { partOp(function(P, r) { return P.nudgePart(r, sel, 'rotation', 1, 30); }); } }, '🔄'),
                      React.createElement("button", { className: mini, title: 'Color', "aria-label": 'Change color', onClick: function() { partOp(function(P, r) { return P.recolorPart(r, sel); }); } }, '🎨'),
                      React.createElement("button", { className: mini, title: 'Duplicate', "aria-label": 'Duplicate', onClick: function() { partOp(function(P, r) { return P.duplicatePart(r, sel); }); } }, '⧉'),
                      React.createElement("button", { className: mini, title: 'Remove part', "aria-label": 'Remove part', onClick: function() { partOp(function(P, r) { return P.removePart(r, sel); }); upd('sculptSel', Math.max(0, sel - 1)); } }, '✕')
                    )
                  ) : null,
                  (typeof callGemini === 'function') ? React.createElement("div", { className: "flex gap-1" },
                    React.createElement("input", { value: d.sculptText || '', onChange: function(e) { upd('sculptText', e.target.value); }, placeholder: recipe ? __alloT('stem.artstudio.sculpt_refine_ph', 'Describe a change ("longer tail")…') : __alloT('stem.artstudio.sculpt_create_ph', 'Or describe something to sculpt…'), "aria-label": __alloT('stem.artstudio.sculpt_ai_label', 'Describe a sculpture or a change'), className: "flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-xs" }),
                    React.createElement("button", { className: mini, "aria-label": recipe ? "Refine sculpture with AI" : "Create sculpture with AI", onClick: doAiSculpt, disabled: !!window._artSculptBusy, "aria-busy": window._artSculptBusy ? 'true' : 'false' }, window._artSculptBusy ? '…' : '✨')
                  ) : null,
                  // gallery — named recipes persisted in toolData
                  React.createElement("div", null,
                    React.createElement("div", { className: "text-[11px] font-bold text-slate-500 mb-1" }, '🖼 ' + __alloT('stem.artstudio.sculpt_gallery', 'My gallery')),
                    recipe ? React.createElement("form", { className: "flex gap-1 mb-1", onSubmit: function(e) {
                      e.preventDefault();
                      var nm = (e.target.elements.sculptname.value || '').trim().slice(0, 40);
                      if (!nm) return;
                      var g2 = Object.assign({}, gallery); g2[nm] = recipe;
                      upd('sculptGallery', g2); e.target.elements.sculptname.value = '';
                      if (typeof announceToSR === 'function') announceToSR('Saved to gallery');
                    } },
                      React.createElement("input", { name: "sculptname", placeholder: __alloT('stem.artstudio.sculpt_save_ph', 'Name it…'), "aria-label": __alloT('stem.artstudio.sculpt_save_ph', 'Name it…'), className: "flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-xs" }),
                      React.createElement("button", { type: "submit", className: mini, "aria-label": "Save sculpture to gallery" }, '💾')
                    ) : null,
                    Object.keys(gallery).length ? React.createElement("ul", { className: "space-y-1" }, Object.keys(gallery).map(function(nm) {
                      return React.createElement("li", { key: nm, className: "flex items-center gap-1 text-xs" },
                        React.createElement("button", { className: "flex-1 text-left min-h-[40px] px-2 rounded-lg border border-slate-200 hover:bg-pink-50 font-bold text-slate-700", onClick: function() { upd('sculptSel', 0); setRecipe(P3D.normalizeRecipe(gallery[nm])); }, "aria-label": 'Load ' + nm }, nm),
                        React.createElement("button", { className: mini, "aria-label": 'Delete ' + nm, onClick: function() { var g2 = Object.assign({}, gallery); delete g2[nm]; upd('sculptGallery', g2); } }, '✕')
                      );
                    })) : React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.sculpt_gallery_empty', 'Saved sculptures appear here.'))
                  )
                )
              );
            })(),

            // === H7b'' RICH inquiry widget: color harmony ===
            tab === 'harmonyHunt' && (function() {
              var iq = d._harmonyHunt || { baseHue: 200, satBlend: 70, litVar: 50, rotation: 0, paletteSize: 6, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('_harmonyHunt', Object.assign({}, iq, patch)); }
              // Generate harmony palette based on base hue + offset
              var palette = [];
              var harmonyType;
              for (var i = 0; i < iq.paletteSize; i++) {
                var hue = (iq.baseHue + (360 / iq.paletteSize) * i + iq.rotation) % 360;
                var sat = 50 + (iq.satBlend / 100) * 40;
                var lit = 40 + (iq.litVar / 100) * 30;
                palette.push({ hue: hue, sat: sat, lit: lit, css: 'hsl(' + hue + ',' + sat + '%,' + lit + '%)' });
              }
              // Classify harmony type by palette spread
              var hueSpread = 360 / iq.paletteSize;
              if (iq.paletteSize === 2) harmonyType = 'complementary';
              else if (iq.paletteSize === 3) harmonyType = 'triadic';
              else if (iq.paletteSize === 4) harmonyType = 'tetradic';
              else if (iq.paletteSize <= 6 && iq.satBlend < 30) harmonyType = 'analogous';
              else harmonyType = 'rainbow';
              var hMeta = {
                complementary: { label: __alloT('stem.artstudio.complementary_2_opposites', '⚫⚪ Complementary (2 opposites)'), desc: __alloT('stem.artstudio.maximum_contrast_pop_art_brand_accents', 'Maximum contrast. Pop art, brand accents.') },
                triadic:       { label: __alloT('stem.artstudio.triadic_3_equidistant', '🔺 Triadic (3 equidistant)'), desc: __alloT('stem.artstudio.vibrant_but_balanced_childrens_books_c', 'Vibrant but balanced. Childrens books, cartoons.') },
                tetradic:      { label: __alloT('stem.artstudio.tetradic_4_corners', '◇ Tetradic (4 corners)'), desc: __alloT('stem.artstudio.rich_palette_with_two_opposing_pairs', 'Rich palette with two opposing pairs.') },
                analogous:     { label: __alloT('stem.artstudio.analogous_low_saturation_neighbors', '🌅 Analogous (low saturation neighbors)'), desc: __alloT('stem.artstudio.calm_harmonious_landscape_painting', 'Calm, harmonious — landscape painting.') },
                rainbow:       { label: __alloT('stem.artstudio.rainbow_many_vivid_hues', '🌈 Rainbow (many vivid hues)'), desc: __alloT('stem.artstudio.energetic_playful_childrens_design', 'Energetic, playful — childrens design.') }
              }[harmonyType];
              function logObs() {
                setIQ({ log: (iq.log || []).concat([{ h: iq.baseHue, s: iq.satBlend, l: iq.litVar, r: iq.rotation, n: iq.paletteSize, t: harmonyType }]).slice(-8) });
              }
              return React.createElement('div', { className: 'space-y-3' },
                React.createElement('div', { className: 'p-4 rounded-xl bg-white border border-pink-300 shadow-sm space-y-3' },
                  React.createElement('h3', { className: 'text-sm font-black text-pink-700' }, __alloT('stem.artstudio.color_harmony_discovery', '🎶 Color harmony discovery')),
                  React.createElement('p', { className: 'text-[12px] text-slate-700 leading-relaxed' },
                    __alloT('stem.artstudio.adjust_base_hue_saturation_lightness_v', 'Adjust base hue, saturation, lightness variation, rotation, and palette size. Widget renders a live harmony palette and classifies it into one of 5 discrete harmony types. No score, no reveal — sweep and notice which combinations produce which harmonies.')),
                  // Classification badge
                  React.createElement('div', { className: 'p-3 rounded-lg text-center', style: { background: '#f5f3ff', border: '2px solid #c4b5fd' } },
                    React.createElement('div', { className: 'text-base font-black text-violet-700' }, hMeta.label),
                    React.createElement('div', { className: 'text-[11px] text-slate-700 mt-1' }, hMeta.desc)
                  ),
                  // SVG harmony wheel visualization
                  React.createElement('div', { className: 'flex justify-center p-3 bg-slate-50 rounded border border-slate-200' },
                    React.createElement('svg', { viewBox: '0 0 240 240', role: 'img', 'aria-label': 'Color harmony wheel showing ' + hMeta.label + ' with ' + iq.paletteSize + ' colors around base hue ' + iq.baseHue + ' degrees.', className: 'w-64 h-64' },
                      // Background hue ring (reference)
                      Array.from({ length: 36 }, function(_, i) {
                        var hue = i * 10;
                        var a1 = (hue - 5 - 90) * Math.PI / 180;
                        var a2 = (hue + 5 - 90) * Math.PI / 180;
                        var rIn = 95, rOut = 110;
                        var x1 = 120 + rIn * Math.cos(a1), y1 = 120 + rIn * Math.sin(a1);
                        var x2 = 120 + rOut * Math.cos(a1), y2 = 120 + rOut * Math.sin(a1);
                        var x3 = 120 + rOut * Math.cos(a2), y3 = 120 + rOut * Math.sin(a2);
                        var x4 = 120 + rIn * Math.cos(a2), y4 = 120 + rIn * Math.sin(a2);
                        return React.createElement('path', { key: 'r' + i, d: 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 + ' A ' + rOut + ' ' + rOut + ' 0 0 1 ' + x3 + ' ' + y3 + ' L ' + x4 + ' ' + y4 + ' A ' + rIn + ' ' + rIn + ' 0 0 0 ' + x1 + ' ' + y1 + ' Z',
                          fill: 'hsl(' + hue + ',75%,60%)', opacity: 0.35 });
                      }),
                      // Palette markers — show selected harmony positions
                      palette.map(function(p, i) {
                        var ang = (p.hue - 90) * Math.PI / 180;
                        var cx = 120 + 78 * Math.cos(ang);
                        var cy = 120 + 78 * Math.sin(ang);
                        return React.createElement('g', { key: 'p' + i },
                          React.createElement('circle', { cx: cx, cy: cy, r: 18, fill: p.css, stroke: '#1e293b', strokeWidth: 1.5 }),
                          React.createElement('text', { x: cx, y: cy + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: p.lit > 50 ? '#1e293b' : '#fff' }, (i + 1))
                        );
                      }),
                      // Center label
                      React.createElement('text', { x: 120, y: 118, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#475569' }, 'base ' + iq.baseHue + '°'),
                      React.createElement('text', { x: 120, y: 132, textAnchor: 'middle', fontSize: 10, fill: '#64748b' }, harmonyType)
                    )
                  ),
                  // Palette swatches with HSL values
                  React.createElement('div', { className: 'flex flex-wrap gap-1' },
                    palette.map(function(p, i) {
                      return React.createElement('div', { key: 'sw' + i, className: 'flex-1 min-w-[60px] rounded text-center text-[10px] font-mono', style: { background: p.css, color: p.lit > 50 ? '#1e293b' : '#fff', padding: '8px 4px' } },
                        '#' + (i + 1), React.createElement('div', null, p.hue.toFixed(0) + '°'));
                    })
                  ),
                  // Sliders
                  React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                    [{ k: 'baseHue', l: 'Base hue (°)', mn: 0, mx: 359, st: 5 },
                     { k: 'satBlend', l: 'Saturation blend (%)', mn: 0, mx: 100, st: 5 },
                     { k: 'litVar', l: 'Lightness variation (%)', mn: 0, mx: 100, st: 5 },
                     { k: 'rotation', l: 'Rotation (°)', mn: -90, mx: 90, st: 5 },
                     { k: 'paletteSize', l: 'Palette size', mn: 2, mx: 12, st: 1 }].map(function(s) {
                      return React.createElement('div', { key: s.k },
                        React.createElement('label', { htmlFor: 'hh-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-pink-700' }, iq[s.k])),
                        React.createElement('input', { id: 'hh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                          onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                          className: 'w-full', 'aria-label': s.l }));
                    })
                  ),
                  // Log + reset
                  React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                    React.createElement('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.artstudio.log', '📋 Log')),
                    React.createElement('button', { onClick: function() { setIQ({ baseHue: 200, satBlend: 70, litVar: 50, rotation: 0, paletteSize: 6, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.artstudio.reset', '↺ Reset')),
                    (iq.log || []).length > 0 && React.createElement('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
                  ),
                  // Log table
                  (iq.log || []).length > 0 && React.createElement('div', { className: 'overflow-x-auto' },
                    React.createElement('table', { className: 'text-[10px] w-full border-collapse text-slate-700' },
                      React.createElement('thead', null, React.createElement('tr', { className: 'bg-slate-100' },
                        ['base', 'sat', 'lit', 'rot', 'n', 'harmony'].map(function(c, i) { return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-1 border border-slate-200 text-left' }, c); }))),
                      React.createElement('tbody', null, iq.log.map(function(o, idx) {
                        return React.createElement('tr', { key: 'lr' + idx },
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.h),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.s),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.l),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.r),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.n),
                          React.createElement('td', { className: 'px-1 border border-slate-200' }, o.t));
                      }))
                    )
                  ),
                  React.createElement('textarea', { 'aria-label': 'Color harmony hypothesis', value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.artstudio.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): What makes a palette feel harmonious vs jarring?'),
                    className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                  !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.artstudio.stuck_show_open_prompts_no_answers', '🤔 Stuck — show open prompts (no answers)')),
                  iq.stuckRevealed && React.createElement('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                    React.createElement('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.artstudio.open_prompts_investigate_by_manipulati', 'Open prompts — investigate by manipulating:')),
                    React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
                      React.createElement('ul', { className: 'list-disc pl-3' },
                        React.createElement('li', null, __alloT('stem.artstudio.find_the_smallest_palette_that_still_f', 'Find the smallest palette that still feels "complete" to you.')),
                        React.createElement('li', null, __alloT('stem.artstudio.real_impressionists_used_analogous_pal', 'Real impressionists used analogous palettes. Why might that be?')),
                        React.createElement('li', null, __alloT('stem.artstudio.some_color_schemes_have_proper_names_c', 'Some color schemes have proper names (complementary, split-complementary, triadic). Look those up and try to reproduce them.')),
                        React.createElement('li', null, __alloT('stem.artstudio.high_saturation_many_colors_busy_try_d', 'High saturation + many colors = busy. Try desaturating with the blend slider — what happens to "harmony"?'))))),
                  React.createElement('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                      React.createElement('input', { type: 'checkbox', id: 'hh-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                      React.createElement('label', { htmlFor: 'hh-und', className: 'text-[12px] font-bold text-emerald-900 cursor-pointer' },
                        __alloT('stem.artstudio.i_think_i_understand_color_harmony_now', 'I think I understand color harmony now — let me explain it in my own words'))),
                    iq.understood && React.createElement('textarea', { 'aria-label': 'Explain your understanding of color harmony', value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.artstudio.explain_in_your_own_words_how_do_hue_s', 'Explain in your own words: how do hue spacing, saturation, and palette size determine "harmony"?'),
                      className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug', rows: 4 })),
                  React.createElement('div', { className: 'mt-3 text-[10px] italic text-slate-500' },
                    __alloT('stem.artstudio.design_note_discrete_5_state_harmony_m', 'Design note: discrete 5-state harmony marker; SVG wheel shows palette positions; no "good palette" score — by design.'))
                )
              );
            })(),

            // ═══ SPIROGRAPH TAB ═══

            tab === 'spirograph' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-indigo-700 mb-3" }, __alloT('stem.artstudio.spirograph_controls', "\uD83C\uDF00 Spirograph Controls")),

                    [{ k: 'spiroR', label: __alloT('stem.artstudio.outer_radius', 'Outer Radius'), min: 40, max: 200, def: 120 },

                     { k: 'spiror', label: __alloT('stem.artstudio.inner_radius', 'Inner Radius'), min: 10, max: 100, def: 45 },

                     { k: 'spirop', label: __alloT('stem.artstudio.pen_offset', 'Pen Offset'), min: 5, max: 120, def: 55 },

                     { k: 'spiroSpeed', label: __alloT('stem.artstudio.draw_speed', 'Draw Speed'), min: 1, max: 20, def: 8 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-indigo-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'spiroSpeed' ? val + ' drawing steps per frame' : val + ' units', onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('spiroReset', Date.now()); }, className: "w-full accent-indigo-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Redrawing the spirograph.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.redraw_spirograph', "\u21BB Redraw")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_spirograph_png', "Export spirograph as PNG"), onClick: function () { var c = document.getElementById('spiroCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spirograph-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Spirograph PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_3', "\uD83D\uDCE5 Export PNG")),

                      React.createElement("button", { "aria-label": d.spiroRainbow ? "Use a single color for the spirograph" : "Use a rainbow color progression for the spirograph", "aria-pressed": !!d.spiroRainbow, onClick: function () { var nextRainbow = !d.spiroRainbow; upd('spiroRainbow', nextRainbow); upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(nextRainbow ? 'Rainbow spirograph enabled.' : 'Single-color spirograph enabled.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 " + (d.spiroRainbow ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-400 hover:bg-indigo-50') }, d.spiroRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-spiro-presets-label" },

                      React.createElement("span", { id: "artstudio-spiro-presets-label", className: "text-[11px] font-bold text-indigo-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.star', 'Star'), R: 120, r: 45, p: 55 }, { label: __alloT('stem.artstudio.flower', 'Flower'), R: 150, r: 50, p: 25 }, { label: __alloT('stem.artstudio.lace', 'Lace'), R: 100, r: 73, p: 80 }, { label: __alloT('stem.artstudio.atom', 'Atom'), R: 180, r: 25, p: 90 }, { label: __alloT('stem.artstudio.spiral', 'Spiral'), R: 140, r: 91, p: 60 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' spirograph preset', onClick: function () { upd('spiroR', pr.R); upd('spiror', pr.r); upd('spirop', pr.p); upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' spirograph preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-indigo-700 border border-indigo-600 hover:bg-indigo-50 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200" },

                    React.createElement("p", { className: "text-[11px] font-bold text-violet-700 mb-1" }, __alloT('stem.artstudio.math_connection', "\uD83D\uDCDA Math Connection")),

                    React.createElement("p", { id: "artstudio-spiro-description", className: "text-[11px] text-slate-700 leading-relaxed" }, __alloT('stem.artstudio.spirographs_draw', "Spirographs draw "), React.createElement("strong", null, __alloT('stem.artstudio.hypotrochoid_curves', "hypotrochoid curves")), __alloT('stem.artstudio.the_path_traced_by_a_point_on_a_small_', " \u2014 the path traced by a point on a small circle rolling inside a larger one. The pattern depends on the "), React.createElement("strong", null, "GCD"), __alloT('stem.artstudio.greatest_common_divisor_of_the_two_rad', " (greatest common divisor) of the two radii. When R/r is a simple fraction, you get fewer petals; complex ratios create intricate, never-repeating paths."))

                  )

                ),

                React.createElement("canvas", { id: 'spiroCanvas', key: 'spiro-' + (d.spiroReset || 0), width: 512, height: 512, role: "img", "aria-describedby": "artstudio-spiro-description", 'aria-label': 'Spirograph output: a ' + (d.spiroRainbow ? 'rainbow' : 'single-color') + ' hypotrochoid with outer radius ' + (typeof d.spiroR === 'number' ? d.spiroR : 120) + ', inner radius ' + (typeof d.spiror === 'number' ? d.spiror : 45) + ', and pen offset ' + (typeof d.spirop === 'number' ? d.spirop : 55) + '.', className: "rounded-xl border-2 border-indigo-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._spiroInit) return;

                    canvas._spiroInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = typeof d.spiroR === 'number' ? d.spiroR : 120;

                    var r = typeof d.spiror === 'number' ? d.spiror : 45;

                    var p = typeof d.spirop === 'number' ? d.spirop : 55;

                    var speed = typeof d.spiroSpeed === 'number' ? d.spiroSpeed : 8;

                    var rainbow = d.spiroRainbow;

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    var t = 0;

                    var diff = R - r;

                    var ratio = diff / r;

                    var totalRevolutions = r / (function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); })(R, r);

                    var maxT = totalRevolutions * Math.PI * 2;

                    var prevX = cx + diff * Math.cos(0) + p * Math.cos(0 * ratio);

                    var prevY = cy + diff * Math.sin(0) + p * Math.sin(0 * ratio);

                    ctx.lineWidth = 1.5;

                    ctx.lineCap = 'round';

                    ctx.globalCompositeOperation = 'lighter';

                    function announceSpiroComplete() {

                      if (canvas._spiroDone) return;

                      canvas._spiroDone = true;

                      if (typeof announceToSR === 'function') announceToSR('Spirograph drawing complete.');

                    }

                    function drawStep() {

                      if (t >= maxT) { announceSpiroComplete(); return; }

                      var stepsThisFrame = reducedMotion ? Math.ceil((maxT - t) / 0.02) : speed;

                      for (var si = 0; si < stepsThisFrame; si++) {

                        t += 0.02;

                        if (t > maxT) t = maxT;

                        var x = cx + diff * Math.cos(t) + p * Math.cos(t * ratio);

                        var y = cy + diff * Math.sin(t) + p * Math.sin(t * ratio);

                        var hue = rainbow ? Math.round((t / maxT) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsl(' + hue + ',' + baseSat + '%,' + baseLit + '%)';

                        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();

                        prevX = x; prevY = y;

                      }

                      if (t < maxT && canvas.isConnected) canvas._spiroAnim = requestAnimationFrame(drawStep);

                      else announceSpiroComplete();

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ GENERATIVE ART TAB ═══

            tab === 'generative' && React.createElement("div", { className: "relative space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap", role: "group", "aria-label": "Generative art controls" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.style', "\uD83C\uDF86 Style:")),

                [{ id: 'flow', icon: '\uD83C\uDF0A', label: __alloT('stem.artstudio.flow_field', 'Flow Field') }, { id: 'rain', icon: '\uD83C\uDF27', label: __alloT('stem.artstudio.particle_rain', 'Particle Rain') }, { id: 'stars', icon: '\u2728', label: __alloT('stem.artstudio.starfield', 'Starfield') }, { id: 'aurora', icon: '\uD83C\uDF0C', label: __alloT('stem.artstudio.aurora', 'Aurora') }].map(function (s) {

                  return React.createElement("button", { "aria-label": 'Use ' + s.label + ' generative style', "aria-pressed": (d.genStyle || 'flow') === s.id, key: s.id, onClick: function () { upd('genStyle', s.id); upd('genReset', Date.now()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.genStyle || 'flow') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-fuchsia-50') }, s.icon + ' ' + s.label);

                }),

                React.createElement("button", {
                  "aria-label": (d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? "Resume generative animation" : "Pause generative animation",
                  "aria-pressed": d.genPaused === undefined ? reducedMotion : !!d.genPaused,
                  onClick: function () {
                    var isPaused = d.genPaused === undefined ? reducedMotion : !!d.genPaused;
                    upd('genPaused', !isPaused);
                    if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Generative animation resumed.' : 'Generative animation paused.');
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold " + ((d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? 'bg-amber-100 text-amber-700' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200')
                }, (d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                React.createElement("button", { onClick: function () { upd('genReset', Date.now()); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_6', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_4', "Export PNG"), onClick: function () { var c = document.getElementById('genCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'generative-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_5', "\uD83D\uDCE5 Export PNG"))

              ),

              React.createElement("div", { className: "flex gap-2 mb-2" },

                React.createElement("label", { htmlFor: "artstudio-generative-density", className: "text-[11px] font-bold text-slate-600" }, "Density:"),

                React.createElement("input", { id: "artstudio-generative-density", type: "range", min: 20, max: 300, value: d.genDensity || 100, "aria-describedby": "artstudio-generative-density-value", onChange: function (e) { upd('genDensity', parseInt(e.target.value)); upd('genReset', Date.now()); }, className: "w-32 max-w-full accent-fuchsia-600" }),

                React.createElement("span", { id: "artstudio-generative-density-value", className: "text-[11px] text-slate-600" }, (d.genDensity || 100) + ' particles')

              ),

              React.createElement("canvas", { tabIndex: 0, id: 'genCanvas', key: 'gen-' + (d.genStyle || 'flow') + '-' + (d.genReset || 0), width: 640, height: 480, role: "img",
                'aria-label': 'Generative art canvas using ' + (d.genStyle || 'flow') + ' style with ' + (d.genDensity || 100) + ' particles; ' + ((d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? 'paused' : 'playing') + '.',
                'aria-describedby': "artstudio-generative-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                className: "rounded-xl border-2 border-fuchsia-200 shadow-lg cursor-crosshair mx-auto block focus-visible:ring-4 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', background: '#0a0a1a' },

                ref: function (canvas) {

                  if (!canvas) return;

                  var isPaused = d.genPaused === undefined ? reducedMotion : !!d.genPaused;

                  canvas.setAttribute('data-paused', isPaused ? '1' : '0');

                  canvas.setAttribute('aria-label', 'Generative art canvas using ' + (d.genStyle || 'flow') + ' style with ' +

                    (d.genDensity || 100) + ' particles; ' + (isPaused ? 'paused' : 'playing') + '.');

                  if (canvas._genInit) return;

                  canvas._genInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var style = d.genStyle || 'flow';

                  var density = d.genDensity || 100;

                  var baseHue = d.hue || 0;

                  var particles = [];

                  var mouseX = -1, mouseY = -1;

                  var keyboardCursor = canvas._genKeyboardCursor || { x: W / 2, y: H / 2 };

                  keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                  keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                  canvas._genKeyboardCursor = keyboardCursor;

                  function updateGenCursor(show) {

                    var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-generative-keyboard-cursor="true"]');

                    if (cursor) {

                      var displayW = canvas.clientWidth || W;

                      var displayH = canvas.clientHeight || H;

                      cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                      cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                      cursor.style.display = show ? 'block' : 'none';

                    }

                    canvas.setAttribute('aria-label', 'Generative art canvas using ' + style + ' style with ' + density +

                      ' particles; ' + (canvas.getAttribute('data-paused') === '1' ? 'paused' : 'playing') +

                      '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                  }

                  // Simplex-like noise (simple hash-based)

                  function noise2D(x, y) {

                    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

                    return n - Math.floor(n);

                  }

                  // Init particles

                  for (var i = 0; i < density; i++) {

                    particles.push({

                      x: Math.random() * W, y: Math.random() * H,

                      vx: 0, vy: 0,

                      life: Math.random() * 200 + 100,

                      maxLife: 300,

                      hue: (baseHue + Math.random() * 60) % 360,

                      size: 1 + Math.random() * 2

                    });

                  }

                  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                  var tick = 0;

                  var paused = false;

                  // Pause state is refreshed before the initialization guard so the controls remain functional.

                  function burstAt(x, y) {

                    mouseX = x; mouseY = y;

                    for (var bi = 0; bi < 30; bi++) {

                      var angle = Math.random() * Math.PI * 2;

                      var speed = 1 + Math.random() * 3;

                      particles.push({

                        x: mouseX, y: mouseY,

                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,

                        life: 150 + Math.random() * 100, maxLife: 250,

                        hue: (baseHue + Math.random() * 120) % 360,

                        size: 1 + Math.random() * 3

                      });

                    }

                  }

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                    burstAt(mouseX, mouseY);

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onfocus = function() { updateGenCursor(true); };

                  canvas.onblur = function() { updateGenCursor(false); };

                  canvas.onkeydown = function(event) {

                    var step = event.altKey ? 1 : 10;

                    var moved = true;

                    if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                    else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                    else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                    else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                    else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                    else moved = false;

                    if (moved) {

                      event.preventDefault();

                      canvas._genKeyboardCursor = keyboardCursor;

                      if (event.shiftKey) burstAt(keyboardCursor.x, keyboardCursor.y);

                      updateGenCursor(true);

                      if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Created particle burst at' : 'Generative cursor') +

                        ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                      return;

                    }

                    if (event.key === 'Enter' || event.key === ' ') {

                      event.preventDefault(); burstAt(keyboardCursor.x, keyboardCursor.y);

                      if (typeof announceToSR === 'function') announceToSR('Created particle burst at x ' +

                        Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    }

                  };

                  updateGenCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                  function animate() {

                    if (canvas.getAttribute('data-paused') === '1') {

                      if (canvas.isConnected) canvas._genAnim = requestAnimationFrame(animate);

                      return;

                    }

                    tick++;

                    // Fade trail

                    ctx.fillStyle = 'rgba(10,10,26,0.04)';

                    ctx.fillRect(0, 0, W, H);

                    ctx.globalCompositeOperation = 'lighter';

                    for (var i = particles.length - 1; i >= 0; i--) {

                      var p = particles[i];

                      p.life--;

                      if (p.life <= 0) { particles.splice(i, 1); continue; }

                      var alpha = Math.min(1, p.life / 50);

                      if (style === 'flow') {

                        var angle = noise2D(p.x * 0.005, p.y * 0.005 + tick * 0.001) * Math.PI * 4;

                        p.vx += Math.cos(angle) * 0.3; p.vy += Math.sin(angle) * 0.3;

                        p.vx *= 0.96; p.vy *= 0.96;

                      } else if (style === 'rain') {

                        p.vy += 0.05;

                        p.vx += (Math.random() - 0.5) * 0.1;

                        if (p.y > H) { p.y = 0; p.x = Math.random() * W; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'stars') {

                        var scx = W / 2, scy = H / 2;

                        var sdx = p.x - scx, sdy = p.y - scy;

                        var sdist = Math.sqrt(sdx * sdx + sdy * sdy) + 0.01;

                        p.vx += sdx / sdist * 0.1; p.vy += sdy / sdist * 0.1;

                        if (sdist > Math.max(W, H) * 0.7) { p.x = scx + (Math.random() - 0.5) * 20; p.y = scy + (Math.random() - 0.5) * 20; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'aurora') {

                        p.vx += Math.sin(p.y * 0.01 + tick * 0.02) * 0.2;

                        p.vy += (Math.random() - 0.5) * 0.05 - 0.02;

                        if (p.y < 0 || p.x < 0 || p.x > W) { p.x = Math.random() * W; p.y = H * 0.7 + Math.random() * H * 0.3; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                        p.hue = (120 + Math.sin(p.x * 0.01) * 60 + tick * 0.5) % 360;

                      }

                      p.x += p.vx; p.y += p.vy;

                      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsla(' + p.hue + ',90%,60%,' + (alpha * 0.8) + ')';

                      ctx.fill();

                      // Glow effect

                      if (p.size > 1.5) {

                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);

                        ctx.fillStyle = 'hsla(' + p.hue + ',80%,50%,' + (alpha * 0.08) + ')';

                        ctx.fill();

                      }

                    }

                    ctx.globalCompositeOperation = 'source-over';

                    // Replenish particles

                    while (particles.length < density * 0.7) {

                      particles.push({

                        x: style === 'stars' ? W / 2 + (Math.random() - 0.5) * 20 : Math.random() * W,

                        y: style === 'rain' ? 0 : style === 'aurora' ? H * 0.7 + Math.random() * H * 0.3 : Math.random() * H,

                        vx: 0, vy: 0,

                        life: 200 + Math.random() * 100, maxLife: 300,

                        hue: (baseHue + Math.random() * 60) % 360,

                        size: 1 + Math.random() * 2

                      });

                    }

                    if (canvas.isConnected) canvas._genAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("span", {
                "data-generative-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#c026d3]",
                style: { display: 'none' }
              }),

              React.createElement("p", { id: "artstudio-generative-keyboard-help", className: "text-[11px] text-center text-slate-600 italic mt-1" }, "Click the canvas to create a particle burst. Keyboard: Arrow keys move the cursor; Space or Enter creates a burst; Shift with an Arrow key moves and creates a burst; Home returns to center; Alt makes one-pixel moves.")

            ),

            // ═══ SPIN ART TAB ═══

            tab === 'spinArt' && React.createElement("div", { className: "relative space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap", role: "group", "aria-label": "Spin art controls" },

                React.createElement("label", { htmlFor: "artstudio-spin-rpm", className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.rpm', "\uD83C\uDF00 RPM:")),

                React.createElement("input", { id: "artstudio-spin-rpm", type: "range", min: 20, max: 300, value: d.spinRPM || 120, "aria-describedby": "artstudio-spin-rpm-value", onChange: function (e) { upd('spinRPM', parseInt(e.target.value)); }, className: "w-28 max-w-full accent-orange-600" }),

                React.createElement("span", { id: "artstudio-spin-rpm-value", className: "text-[11px] text-slate-600 font-bold" }, (d.spinRPM || 120) + ' rpm'),

                React.createElement("label", { htmlFor: "artstudio-spin-brush", className: "text-xs font-bold text-slate-600 ml-2" }, "Brush:"),

                React.createElement("input", { id: "artstudio-spin-brush", type: "range", min: 2, max: 20, value: d.spinBrush || 6, "aria-describedby": "artstudio-spin-brush-value", onChange: function (e) { upd('spinBrush', parseInt(e.target.value)); }, className: "w-20 max-w-full accent-orange-600" }),

                React.createElement("span", { id: "artstudio-spin-brush-value", className: "text-[11px] text-slate-600 font-bold" }, (d.spinBrush || 6) + ' pixels'),

                React.createElement("button", { "aria-label": d.spinSplatter ? "Disable paint splatter" : "Enable paint splatter", "aria-pressed": !!d.spinSplatter, onClick: function () { upd('spinSplatter', !d.spinSplatter); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.spinSplatter ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50') }, d.spinSplatter ? '\uD83D\uDCA6 Splatter \u2714' : '\uD83D\uDCA6 Splatter'),

                React.createElement("button", { "aria-label": d.spinDark ? "Switch to light canvas background" : "Switch to dark canvas background", "aria-pressed": !!d.spinDark, onClick: function () { upd('spinDark', !d.spinDark); upd('spinReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.spinDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-400') }, d.spinDark ? '\uD83C\uDF11 Dark' : '\u2B1C Light'),

                React.createElement("button", {
                  "aria-label": (d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? "Resume spin art animation" : "Pause spin art animation",
                  "aria-pressed": d.spinPaused === undefined ? reducedMotion : !!d.spinPaused,
                  onClick: function () {
                    var isPaused = d.spinPaused === undefined ? reducedMotion : !!d.spinPaused;
                    upd('spinPaused', !isPaused);
                    if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Spin art animation resumed.' : 'Spin art animation paused.');
                  },
                  className: "px-2 py-1 rounded-lg text-[11px] font-bold " + ((d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                }, (d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                React.createElement("button", { onClick: function () { upd('spinReset', Date.now()); }, className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_7', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_6', "Export PNG"), onClick: function () { var c = document.getElementById('spinCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spin-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_7', "\uD83D\uDCE5 Export PNG"))

              ),

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-400" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { id: "artstudio-spin-palettes-label", className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes_3', "\uD83C\uDFA8 Palettes")),

                  React.createElement("div", { className: "contents", role: "group", "aria-labelledby": "artstudio-spin-palettes-label" },

                    [{ id: 'retro', label: __alloT('stem.artstudio.retro_3', '\uD83D\uDD79 Retro') }, { id: 'nature', label: __alloT('stem.artstudio.nature_3', '\uD83C\uDF3F Nature') }, { id: 'warm', label: __alloT('stem.artstudio.warm_3', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_3', '\u2744 Cool') }, { id: 'neon', label: __alloT('stem.artstudio.neon_3', '\uD83D\uDCA5 Neon') }].map(function (pal) {

                      return React.createElement("button", { "aria-label": "Use " + pal.label + " palette", "aria-pressed": (d.activePalette || 'retro') === pal.id, key: pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-orange-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-orange-50') }, pal.label);

                    })

                  )

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": "Select color HSL " + c[0] + ", " + c[1] + " percent saturation, " + c[2] + " percent lightness", "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110 focus-visible:ring-4 focus-visible:ring-orange-600 focus-visible:ring-offset-2", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#c2410c' : '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("canvas", { tabIndex: 0, id: 'spinCanvas', key: 'spin-' + (d.spinReset || 0), width: 512, height: 512, role: "img",
                'aria-label': 'Spin art canvas at ' + (d.spinRPM || 120) + ' RPM with a ' + (d.spinBrush || 6) + '-pixel brush; ' + ((d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? 'paused' : 'playing') + '.',
                'aria-describedby': "artstudio-spin-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                className: "rounded-full border-4 border-orange-300 shadow-lg cursor-crosshair mx-auto block mt-3 focus-visible:ring-4 focus-visible:ring-orange-600 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', background: d.spinDark ? '#0f172a' : '#fefefe' },

                ref: function (canvas) {

                  if (!canvas) return;

                  // Always sync current controls to canvas data attributes (runs on every render).
                  var spinPaused = d.spinPaused === undefined ? reducedMotion : !!d.spinPaused;
                  canvas.dataset.hue = d.hue === undefined ? 0 : d.hue;
                  canvas.dataset.sat = d.sat === undefined ? 100 : d.sat;
                  canvas.dataset.lit = d.lit === undefined ? 50 : d.lit;
                  canvas.dataset.rpm = d.spinRPM || 120;
                  canvas.dataset.brush = d.spinBrush || 6;
                  canvas.dataset.splatter = d.spinSplatter ? '1' : '0';
                  canvas.dataset.paused = spinPaused ? '1' : '0';
                  canvas.setAttribute('aria-label', 'Spin art canvas at ' + (d.spinRPM || 120) + ' RPM with a ' +
                    (d.spinBrush || 6) + '-pixel brush; ' + (spinPaused ? 'paused' : 'playing') + '.');

                  if (canvas._spinInit) return;

                  canvas._spinInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var cx = W / 2, cy = H / 2;

                  var isDark = d.spinDark || false;

                  var baseSat = d.sat === undefined ? 100 : d.sat;

                  var baseLit = d.lit === undefined ? 50 : d.lit;




                  ctx.fillStyle = isDark ? '#0f172a' : '#fefefe';

                  ctx.fillRect(0, 0, W, H);

                  var angle = 0;

                  var drips = [];

                  var mouseDown = false, mouseX = cx, mouseY = cy;

                  var keyboardCursor = canvas._spinKeyboardCursor || { x: cx, y: cy };

                  canvas._spinKeyboardCursor = keyboardCursor;

                  function updateSpinCursor(show) {

                    var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-spin-keyboard-cursor="true"]');

                    if (cursor) {

                      var displayW = canvas.clientWidth || W, displayH = canvas.clientHeight || H;

                      cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                      cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                      cursor.style.display = show ? 'block' : 'none';

                    }

                    canvas.setAttribute('aria-label', 'Spin art canvas at ' + canvas.dataset.rpm + ' RPM with a ' +

                      canvas.dataset.brush + '-pixel brush; ' + (canvas.dataset.paused === '1' ? 'paused' : 'playing') +

                      '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                  }

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    mouseDown = true;

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmouseup = canvas.ontouchend = function () { mouseDown = false; };

                  canvas.onmouseleave = function () { mouseDown = false; };

                  canvas.onfocus = function () { updateSpinCursor(true); };

                  canvas.onblur = function () { updateSpinCursor(false); };

                  canvas.onkeydown = function (event) {

                    var step = event.altKey ? 1 : 10, moved = true;

                    if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                    else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                    else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                    else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                    else if (event.key === 'Home') { keyboardCursor.x = cx; keyboardCursor.y = cy; }

                    else moved = false;

                    if (moved) {

                      event.preventDefault();

                      canvas._spinKeyboardCursor = keyboardCursor;

                      if (event.shiftKey) spawnDrip(keyboardCursor.x, keyboardCursor.y);

                      updateSpinCursor(true);

                      if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Added paint at' : 'Spin art cursor') +

                        ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    } else if (event.key === 'Enter' || event.key === ' ') {

                      event.preventDefault();

                      spawnDrip(keyboardCursor.x, keyboardCursor.y);

                      if (typeof announceToSR === 'function') announceToSR('Added paint at x ' +

                        Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    }

                  };

                  updateSpinCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                  function spawnDrip(x, y) {

                    var curHue = parseFloat(canvas.dataset.hue) || 0;
                    var curSat = parseFloat(canvas.dataset.sat);
                    var curLit = parseFloat(canvas.dataset.lit);
                    var currentBrush = parseFloat(canvas.dataset.brush) || 6;
                    var currentSplatter = canvas.dataset.splatter === '1';
                    var count = currentSplatter ? 5 + Math.floor(Math.random() * 8) : 1;

                    for (var i = 0; i < count; i++) {

                      var ox = currentSplatter ? (Math.random() - 0.5) * 30 : 0;

                      var oy = currentSplatter ? (Math.random() - 0.5) * 30 : 0;

                      drips.push({ x: x + ox, y: y + oy, vx: 0, vy: 0, life: 200 + Math.random() * 150, size: currentSplatter ? 1 + Math.random() * currentBrush : currentBrush * 0.6, hue: curHue + (currentSplatter ? Math.random() * 30 - 15 : 0), sat: curSat, lit: curLit });

                    }

                  }

                  function animate() {

                    if (canvas.dataset.paused === '1') {

                      if (canvas.isConnected) canvas._spinAnim = requestAnimationFrame(animate);

                      return;

                    }

                    var rpm = parseFloat(canvas.dataset.rpm) || 120;

                    var radPerFrame = (rpm / 60) * (Math.PI * 2) / 60;

                    angle += radPerFrame;

                    if (mouseDown) spawnDrip(mouseX, mouseY);

                    ctx.save();

                    ctx.translate(cx, cy);

                    ctx.rotate(angle);

                    ctx.translate(-cx, -cy);

                    for (var i = drips.length - 1; i >= 0; i--) {

                      var dr = drips[i];

                      dr.life--;

                      if (dr.life <= 0) { drips.splice(i, 1); continue; }

                      var dx = dr.x - cx, dy = dr.y - cy;

                      var dist = Math.sqrt(dx * dx + dy * dy);

                      if (dist > 1) {

                        var centrifugal = rpm * 0.00015;

                        dr.vx += (dx / dist) * centrifugal * dist;

                        dr.vy += (dy / dist) * centrifugal * dist;

                      }

                      dr.vx *= 0.98; dr.vy *= 0.98;

                      dr.x += dr.vx; dr.y += dr.vy;

                      var alpha = Math.min(1, dr.life / 60);

                      ctx.globalAlpha = alpha * 0.85;

                      ctx.beginPath();

                      ctx.arc(dr.x, dr.y, dr.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsl(' + Math.round(dr.hue) + ',' + (dr.sat || baseSat) + '%,' + (dr.lit || baseLit) + '%)';

                      ctx.fill();

                      if (dist > W * 0.48) { drips.splice(i, 1); }

                    }

                    ctx.restore();

                    if (canvas.isConnected) canvas._spinAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("span", {
                "data-spin-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#c2410c]",
                style: { display: 'none' }
              }),

              React.createElement("p", { id: "artstudio-spin-keyboard-help", className: "text-[11px] text-center text-slate-600 italic mt-1" }, "Click and drag to drip paint. Keyboard: Arrow keys move the cursor; Space or Enter adds paint; Shift with an Arrow key moves and adds paint; Home returns to center; Alt makes one-pixel moves."),

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200" },

                React.createElement("button", { "aria-expanded": !!d.showSpinInfo, "aria-controls": "artstudio-spin-physics", onClick: function () { upd('showSpinInfo', !d.showSpinInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700" },

                  React.createElement("span", null, __alloT('stem.artstudio.physics_of_spin_art', "\uD83C\uDF00 Physics of Spin Art")),

                  React.createElement("span", { "aria-hidden": "true" }, d.showSpinInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSpinInfo && React.createElement("div", { id: "artstudio-spin-physics", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, __alloT('stem.artstudio.centrifugal_effect', "Centrifugal effect:")), __alloT('stem.artstudio.in_a_spinning_reference_frame_objects_', " In a spinning reference frame, objects experience an outward pseudo-force proportional to their distance from the center and the square of angular velocity (\u03C9\u00B2r).")),

                  React.createElement("p", null, "\uD83D\uDCA7 ", React.createElement("strong", null, __alloT('stem.artstudio.paint_behavior', "Paint behavior:")), __alloT('stem.artstudio.real_spin_art_uses_centripetal_acceler', " Real spin art uses centripetal acceleration to spread paint. Thinner paint flies outward faster; thicker paint creates shorter, more controlled trails.")),

                  React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.why_it_s_beautiful', "Why it\u2019s beautiful:")), __alloT('stem.artstudio.the_combination_of_rotational_motion_a', " The combination of rotational motion and paint viscosity creates natural spirals and interference patterns. No two spin paintings are ever alike \u2014 it\u2019s a form of "), React.createElement("strong", null, __alloT('stem.artstudio.chaotic_art', "chaotic art")), ".")

                )

              )

            ),

            // ═══ STRING ART TAB ═══

            tab === 'stringArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, __alloT('stem.artstudio.string_art_controls', "\uD83D\uDD78 String Art Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-string-shape-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.shape', "Shape")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-string-shape-label" },

                        [{ id: 'circle', label: __alloT('stem.artstudio.circle', '\u25CB Circle') }, { id: 'square', label: __alloT('stem.artstudio.square', '\u25A1 Square') }, { id: 'triangle', label: __alloT('stem.artstudio.triangle', '\u25B3 Triangle') }, { id: 'star', label: __alloT('stem.artstudio.star_2', '\u2606 Star') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.strShape || 'circle') === s.id, onClick: function () { upd('strShape', s.id); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(s.label + ' string-art frame selected.'); }, className: "flex-1 min-w-[5rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.strShape || 'circle') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'strNails', label: __alloT('stem.artstudio.nail_count', 'Nail Count'), min: 20, max: 200, def: 80 },

                     { k: 'strMult', label: __alloT('stem.artstudio.multiplier', 'Multiplier'), min: 2, max: 99, def: 2 },

                     { k: 'strOpacity', label: __alloT('stem.artstudio.thread_opacity', 'Thread Opacity %'), min: 5, max: 100, def: 30 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-rose-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'strOpacity' ? val + ' percent opacity' : val + (s.k === 'strNails' ? ' nails' : ' multiplier'), onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('strReset', Date.now()); }, className: "w-full accent-rose-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Redrawing the string art.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.redraw_string_art', "\u21BB Redraw")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_string_art_png', "Export string art as PNG"), onClick: function () { var c = document.getElementById('stringCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'string-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('String-art PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_8', "\uD83D\uDCE5 Export PNG")),

                      React.createElement("button", { "aria-label": d.strRainbow ? "Use a single thread color" : "Use a rainbow thread progression", "aria-pressed": !!d.strRainbow, onClick: function () { var nextRainbow = !d.strRainbow; upd('strRainbow', nextRainbow); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(nextRainbow ? 'Rainbow threads enabled.' : 'Single-color threads enabled.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + (d.strRainbow ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-400 hover:bg-rose-50') }, d.strRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-string-presets-label" },

                      React.createElement("span", { id: "artstudio-string-presets-label", className: "text-[11px] font-bold text-rose-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.cardioid', 'Cardioid'), nails: 100, mult: 2 }, { label: __alloT('stem.artstudio.nephroid', 'Nephroid'), nails: 100, mult: 3 }, { label: __alloT('stem.artstudio.star_burst', 'Star Burst'), nails: 72, mult: 37 }, { label: __alloT('stem.artstudio.lace_2', 'Lace'), nails: 150, mult: 71 }, { label: __alloT('stem.artstudio.weave', 'Weave'), nails: 60, mult: 23 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' string-art preset', onClick: function () { upd('strNails', pr.nails); upd('strMult', pr.mult); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' string-art preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-600 hover:bg-rose-50 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { className: "text-[11px] font-bold text-pink-700 mb-1" }, __alloT('stem.artstudio.math_connection_2', "\uD83D\uDCDA Math Connection")),

                    React.createElement("p", { id: "artstudio-string-description", className: "text-[11px] text-slate-700 leading-relaxed" }, __alloT('stem.artstudio.string_art_creates', "String art creates "), React.createElement("strong", null, __alloT('stem.artstudio.envelope_curves', "envelope curves")), __alloT('stem.artstudio.from_straight_lines_with_a_circle_and_', " from straight lines. With a circle and multiplier of 2, you get a "), React.createElement("strong", null, "cardioid"), __alloT('stem.artstudio.the_heart_shaped_curve_seen_in_coffee_', " \u2014 the heart-shaped curve seen in coffee cups. Multiplier 3 makes a "), React.createElement("strong", null, "nephroid"), __alloT('stem.artstudio.higher_multipliers_create_intricate_pa', ". Higher multipliers create intricate patterns governed by "), React.createElement("strong", null, __alloT('stem.artstudio.modular_arithmetic', "modular arithmetic")), __alloT('stem.artstudio.nail_n_connects_to_nail_n_m_mod_total', ": nail N connects to nail (N \u00D7 M) mod total."))

                  )

                ),

                React.createElement("canvas", { id: 'stringCanvas', key: 'str-' + (d.strReset || 0), width: 512, height: 512, role: "img", "aria-describedby": "artstudio-string-description", 'aria-label': 'String-art output: ' + (typeof d.strNails === 'number' ? d.strNails : 80) + ' nails arranged on a ' + (d.strShape || 'circle') + ' frame, connected with multiplier ' + (typeof d.strMult === 'number' ? d.strMult : 2) + ' using ' + (d.strRainbow ? 'rainbow' : 'single-color') + ' threads at ' + (typeof d.strOpacity === 'number' ? d.strOpacity : 30) + ' percent opacity.', className: "rounded-xl border-2 border-rose-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._strInit) return;

                    canvas._strInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = Math.min(W, H) * 0.42;

                    var nails = typeof d.strNails === 'number' ? d.strNails : 80;

                    var mult = typeof d.strMult === 'number' ? d.strMult : 2;

                    var opacity = typeof d.strOpacity === 'number' ? d.strOpacity : 30;

                    var rainbow = d.strRainbow;

                    var shape = d.strShape || 'circle';

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    // Compute nail positions based on shape

                    var nailPos = [];

                    for (var i = 0; i < nails; i++) {

                      var t = i / nails;

                      if (shape === 'circle') {

                        var ang = t * Math.PI * 2 - Math.PI / 2;

                        nailPos.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]);

                      } else if (shape === 'square') {

                        var side = Math.floor(t * 4) % 4;

                        var frac = (t * 4) % 1;

                        var half = R;

                        if (side === 0) nailPos.push([cx - half + frac * 2 * half, cy - half]);

                        else if (side === 1) nailPos.push([cx + half, cy - half + frac * 2 * half]);

                        else if (side === 2) nailPos.push([cx + half - frac * 2 * half, cy + half]);

                        else nailPos.push([cx - half, cy + half - frac * 2 * half]);

                      } else if (shape === 'triangle') {

                        var side2 = Math.floor(t * 3) % 3;

                        var frac2 = (t * 3) % 1;

                        var triR = R;

                        var pts = [[cx, cy - triR], [cx + triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)], [cx - triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)]];

                        var p1 = pts[side2], p2 = pts[(side2 + 1) % 3];

                        nailPos.push([p1[0] + (p2[0] - p1[0]) * frac2, p1[1] + (p2[1] - p1[1]) * frac2]);

                      } else if (shape === 'star') {

                        var starPts = 5;

                        var segTotal = starPts * 2;

                        var seg = Math.floor(t * segTotal) % segTotal;

                        var frac3 = (t * segTotal) % 1;

                        var outerR = R, innerR = R * 0.4;

                        var allPts = [];

                        for (var si = 0; si < starPts; si++) {

                          var oAng = (si / starPts) * Math.PI * 2 - Math.PI / 2;

                          var iAng = ((si + 0.5) / starPts) * Math.PI * 2 - Math.PI / 2;

                          allPts.push([cx + Math.cos(oAng) * outerR, cy + Math.sin(oAng) * outerR]);

                          allPts.push([cx + Math.cos(iAng) * innerR, cy + Math.sin(iAng) * innerR]);

                        }

                        var sp1 = allPts[seg], sp2 = allPts[(seg + 1) % allPts.length];

                        nailPos.push([sp1[0] + (sp2[0] - sp1[0]) * frac3, sp1[1] + (sp2[1] - sp1[1]) * frac3]);

                      }

                    }

                    // Draw nail dots

                    ctx.fillStyle = 'rgba(255,255,255,0.15)';

                    nailPos.forEach(function (np) { ctx.beginPath(); ctx.arc(np[0], np[1], 1.5, 0, Math.PI * 2); ctx.fill(); });

                    // Animate strings

                    var lineIdx = 0;

                    ctx.lineWidth = 1;

                    ctx.lineCap = 'round';

                    ctx.globalCompositeOperation = 'lighter';

                    function announceStringComplete() {

                      if (canvas._strDone) return;

                      canvas._strDone = true;

                      if (typeof announceToSR === 'function') announceToSR('String-art drawing complete.');

                    }

                    function drawStep() {

                      if (lineIdx >= nails) { announceStringComplete(); return; }

                      var batchSize = reducedMotion ? nails : Math.max(1, Math.floor(nails / 80));

                      for (var b = 0; b < batchSize && lineIdx < nails; b++, lineIdx++) {

                        var from = nailPos[lineIdx];

                        var toIdx = (lineIdx * mult) % nails;

                        var to = nailPos[toIdx];

                        var hue = rainbow ? Math.round((lineIdx / nails) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsla(' + hue + ',' + baseSat + '%,' + baseLit + '%,' + (opacity / 100) + ')';

                        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();

                      }

                      if (lineIdx < nails && canvas.isConnected) canvas._strAnim = requestAnimationFrame(drawStep);

                      else announceStringComplete();

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ OP ART TAB ═══

            tab === 'opArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-fuchsia-700 mb-3" }, __alloT('stem.artstudio.op_art_controls', "\uD83D\uDC41 Op Art Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-op-style-label", className: "text-[11px] font-bold text-fuchsia-700 block mb-1" }, __alloT('stem.artstudio.style_2', "Style")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-op-style-label" },

                        [{ id: 'concentric', label: __alloT('stem.artstudio.rings', '\u25CE Rings') }, { id: 'checkerboard', label: __alloT('stem.artstudio.checker', '\u2593 Checker') }, { id: 'moire', label: __alloT('stem.artstudio.moir', '\u2261 Moir\u00E9') }, { id: 'vibrating', label: __alloT('stem.artstudio.vibrate', '\u2248 Vibrate') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.opStyle || 'concentric') === s.id, onClick: function () { upd('opStyle', s.id); if (typeof announceToSR === 'function') announceToSR(s.label + ' Op Art style selected.'); }, className: "flex-1 min-w-[5rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 " + ((d.opStyle || 'concentric') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-fuchsia-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'opSpeed', label: __alloT('stem.artstudio.speed', 'Speed'), min: 1, max: 20, def: 5 },

                     { k: 'opDensity', label: __alloT('stem.artstudio.density', 'Density'), min: 3, max: 60, def: 20 },

                     { k: 'opHueA', label: __alloT('stem.artstudio.color_a_hue', 'Color A Hue'), min: 0, max: 360, def: 0 },

                     { k: 'opHueB', label: __alloT('stem.artstudio.color_b_hue', 'Color B Hue'), min: 0, max: 360, def: 180 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-fuchsia-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'opSpeed' ? val + ' animation speed' : s.k === 'opDensity' ? val + ' pattern density' : val + ' degrees hue', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-fuchsia-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": (d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? "Resume Op Art animation" : "Pause Op Art animation", "aria-describedby": "artstudio-op-motion-status", onClick: function () { var isPaused = d.opPaused === undefined ? reducedMotion : !!d.opPaused; upd('opPaused', !isPaused); if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Op Art animation resumed.' : 'Op Art animation paused.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 " + ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'bg-green-50 text-green-700 border border-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-800 border border-amber-600 hover:bg-amber-100') }, (d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_op_art_png', "Export Op Art as PNG"), onClick: function () { var c = document.getElementById('opArtCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'op-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Op Art PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_10', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-op-presets-label" },

                      React.createElement("span", { id: "artstudio-op-presets-label", className: "text-[11px] font-bold text-fuchsia-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.classic_b_w', 'Classic B&W'), style: 'concentric', hA: 0, hB: 0, density: 25, speed: 4 },

                       { label: __alloT('stem.artstudio.neon_pulse', 'Neon Pulse'), style: 'concentric', hA: 280, hB: 160, density: 15, speed: 8 },

                       { label: __alloT('stem.artstudio.spiral_vortex', 'Spiral Vortex'), style: 'moire', hA: 200, hB: 30, density: 40, speed: 6 },

                       { label: __alloT('stem.artstudio.wave_grid', 'Wave Grid'), style: 'checkerboard', hA: 10, hB: 190, density: 20, speed: 5 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' Op Art preset', onClick: function () { upd('opStyle', pr.style); upd('opHueA', pr.hA); upd('opHueB', pr.hB); upd('opDensity', pr.density); upd('opSpeed', pr.speed); if (typeof announceToSR === 'function') announceToSR(pr.label + ' Op Art preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-fuchsia-700 border border-fuchsia-600 hover:bg-fuchsia-50 transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    ),

                    React.createElement("p", { id: "artstudio-op-motion-status", className: "mt-3 text-[11px] text-fuchsia-700 leading-relaxed" }, ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'Animation paused. ' : 'Animation running. ') + 'Use the pause or resume button to control motion; reduced-motion preferences start this view paused.')

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { id: "artstudio-op-info-toggle", "aria-expanded": !!d.showOpInfo, "aria-controls": "artstudio-op-info", onClick: function () { upd('showOpInfo', !d.showOpInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_op_art', "\uD83E\uDDE0 The Science of Op Art")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showOpInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showOpInfo && React.createElement("div", { id: "artstudio-op-info", role: "region", "aria-labelledby": "artstudio-op-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC41 ", React.createElement("strong", null, __alloT('stem.artstudio.op_art_3', "Op Art")), __alloT('stem.artstudio.optical_art_emerged_in_the_1960s_pione', " (Optical Art) emerged in the 1960s, pioneered by "), React.createElement("strong", null, __alloT('stem.artstudio.bridget_riley', "Bridget Riley")), " and ", React.createElement("strong", null, __alloT('stem.artstudio.victor_vasarely', "Victor Vasarely")), __alloT('stem.artstudio.it_exploits_the_mechanics_of_human_vis', ". It exploits the mechanics of human vision to create illusions of movement, vibration, and depth on flat surfaces.")),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, __alloT('stem.artstudio.moir_patterns', "Moir\u00E9 patterns")), __alloT('stem.artstudio.appear_when_two_regular_grids_overlap_', " appear when two regular grids overlap at slight angles. Your brain can\u2019t resolve the conflicting patterns, creating phantom curves and waves. This same effect causes the \u201Cscreen door\u201D shimmer on some fabrics.")),

                      React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, __alloT('stem.artstudio.vibrating_colors', "Vibrating colors")), __alloT('stem.artstudio.occur_when_highly_saturated_complement', " occur when highly saturated complementary colors sit side by side. Your eye\u2019s color receptors compete, creating a buzzing, unstable edge\u2014this is called "), React.createElement("strong", null, __alloT('stem.artstudio.chromatic_vibration', "chromatic vibration")), "."),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, __alloT('stem.artstudio.persistence_of_vision', "Persistence of vision")), " and ", React.createElement("strong", null, __alloT('stem.artstudio.lateral_inhibition', "lateral inhibition")), __alloT('stem.artstudio.in_the_retina_are_the_main_perceptual_', " in the retina are the main perceptual mechanisms. Concentric ring patterns trigger involuntary eye saccades, making the artwork seem to breathe and pulse."))

                    )

                  )

                ),

                React.createElement("canvas", { id: 'opArtCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-op-motion-status", 'aria-label': 'Op Art output: ' + ((d.opStyle || 'concentric') === 'concentric' ? 'concentric rings' : (d.opStyle || 'concentric') === 'checkerboard' ? 'a warped checkerboard grid' : (d.opStyle || 'concentric') === 'moire' ? 'overlapping Moire line fields' : 'vibrating wavy stripes') + ' at density ' + (typeof d.opDensity === 'number' ? d.opDensity : 20) + ' and speed ' + (typeof d.opSpeed === 'number' ? d.opSpeed : 5) + ', ' + ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'paused' : 'animating') + '.', className: "rounded-xl border-2 border-fuchsia-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#0a0a0a' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._opAnim) cancelAnimationFrame(canvas._opAnim);

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var tick = 0;

                    var style = d.opStyle || 'concentric';

                    var speed = typeof d.opSpeed === 'number' ? d.opSpeed : 5;

                    var density = typeof d.opDensity === 'number' ? d.opDensity : 20;

                    var hueA = typeof d.opHueA === 'number' ? d.opHueA : 0;

                    var hueB = typeof d.opHueB === 'number' ? d.opHueB : 180;

                    var paused = d.opPaused === undefined ? reducedMotion : !!d.opPaused;

                    var isMonochrome = (hueA === 0 && hueB === 0);

                    var colA = isMonochrome ? '#000000' : 'hsl(' + hueA + ',85%,50%)';

                    var colB = isMonochrome ? '#ffffff' : 'hsl(' + hueB + ',85%,50%)';



                    function drawFrame() {

                      if (!paused) tick++;

                      ctx.clearRect(0, 0, W, H);



                      if (style === 'concentric') {

                        var maxR = Math.sqrt(cx * cx + cy * cy);

                        var ringWidth = maxR / density;

                        var offset = (tick * speed * 0.3) % (ringWidth * 2);

                        for (var r = maxR + ringWidth; r > 0; r -= ringWidth) {

                          var rr = r - offset;

                          if (rr < 0) rr += ringWidth * 2;

                          ctx.beginPath();

                          ctx.arc(cx, cy, Math.abs(rr), 0, Math.PI * 2);

                          ctx.fillStyle = (Math.round(r / ringWidth) % 2 === 0) ? colA : colB;

                          ctx.fill();

                        }

                        // Add subtle rotation warp

                        ctx.save();

                        ctx.globalCompositeOperation = 'overlay';

                        ctx.globalAlpha = 0.08;

                        var warpAngle = tick * speed * 0.005;

                        for (var wr = 0; wr < maxR; wr += ringWidth * 1.5) {

                          ctx.beginPath();

                          ctx.ellipse(cx, cy, wr, wr * (0.9 + Math.sin(warpAngle + wr * 0.01) * 0.1), warpAngle, 0, Math.PI * 2);

                          ctx.strokeStyle = colA; ctx.lineWidth = 2; ctx.stroke();

                        }

                        ctx.restore();



                      } else if (style === 'checkerboard') {

                        var cellSize = Math.max(8, Math.round(W / density));

                        var t = tick * speed * 0.02;

                        for (var gx = 0; gx < W; gx += cellSize) {

                          for (var gy = 0; gy < H; gy += cellSize) {

                            var dx = gx - cx, dy = gy - cy;

                            var dist = Math.sqrt(dx * dx + dy * dy);

                            var warp = Math.sin(dist * 0.015 - t) * cellSize * 0.4;

                            var wx = gx + warp * (dx / (dist || 1));

                            var wy = gy + warp * (dy / (dist || 1));

                            var col = Math.floor(gx / cellSize);

                            var row = Math.floor(gy / cellSize);

                            ctx.fillStyle = ((col + row) % 2 === 0) ? colA : colB;

                            ctx.fillRect(wx, wy, cellSize, cellSize);

                          }

                        }



                      } else if (style === 'moire') {

                        var spacing = Math.max(3, Math.round(200 / density));

                        var t2 = tick * speed * 0.003;

                        ctx.fillStyle = isMonochrome ? '#000' : 'hsl(' + hueA + ',30%,10%)';

                        ctx.fillRect(0, 0, W, H);

                        ctx.lineWidth = 1.5;

                        // Layer 1 — horizontal lines

                        ctx.strokeStyle = colB;

                        ctx.globalAlpha = 0.7;

                        for (var ly = -H; ly < H * 2; ly += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(0, ly);

                          ctx.lineTo(W, ly);

                          ctx.stroke();

                        }

                        // Layer 2 — rotated lines

                        ctx.save();

                        ctx.translate(cx, cy);

                        ctx.rotate(t2);

                        ctx.strokeStyle = colA;

                        for (var ly2 = -W * 2; ly2 < W * 2; ly2 += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(-W, ly2);

                          ctx.lineTo(W, ly2);

                          ctx.stroke();

                        }

                        ctx.restore();

                        ctx.globalAlpha = 1;



                      } else if (style === 'vibrating') {

                        var stripeW = Math.max(4, Math.round(W / density));

                        var t3 = tick * speed * 0.04;

                        for (var vx = 0; vx < W; vx += stripeW) {

                          var wave = Math.sin(vx * 0.03 + t3) * stripeW * 0.3;

                          var idx = Math.floor(vx / stripeW);

                          ctx.fillStyle = (idx % 2 === 0) ? colA : colB;

                          ctx.beginPath();

                          ctx.moveTo(vx + wave, 0);

                          ctx.lineTo(vx + stripeW + wave, 0);

                          for (var vy = 0; vy < H; vy += 4) {

                            var localWave = Math.sin(vy * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + stripeW + localWave, vy);

                          }

                          ctx.lineTo(vx + stripeW, H);

                          ctx.lineTo(vx, H);

                          for (var vy2 = H; vy2 > 0; vy2 -= 4) {

                            var localWave2 = Math.sin(vy2 * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + localWave2, vy2);

                          }

                          ctx.closePath();

                          ctx.fill();

                        }

                      }



                      if (!paused && canvas.isConnected) canvas._opAnim = requestAnimationFrame(drawFrame);

                    }

                    drawFrame();

                  }

                })

              )

            ),

            // ═══ TESSELLATION TAB ═══

            tab === 'tessellation' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-teal-700 mb-3" }, __alloT('stem.artstudio.tessellation_controls', "\uD83D\uDD37 Tessellation Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-tess-shape-label", className: "text-[11px] font-bold text-teal-700 block mb-1" }, __alloT('stem.artstudio.base_shape', "Base Shape")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-tess-shape-label" },

                        [{ id: 'triangle', label: __alloT('stem.artstudio.triangle_2', '\u25B3 Triangle') }, { id: 'square', label: __alloT('stem.artstudio.square_2', '\u25A1 Square') }, { id: 'hexagon', label: __alloT('stem.artstudio.hexagon', '\u2B21 Hexagon') }].map(function (s) {

                          return React.createElement("button", { "aria-pressed": (d.tessShape || 'hexagon') === s.id, key: s.id, onClick: function () { upd('tessShape', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.tessShape || 'hexagon') === s.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'tessGrid', label: __alloT('stem.artstudio.grid_size_2', 'Grid Size'), min: 2, max: 20, def: 6 },

                     { k: 'tessRotation', label: __alloT('stem.artstudio.rotation', 'Rotation \u00B0'), min: 0, max: 360, def: 0 },

                     { k: 'tessWarpAmt', label: __alloT('stem.artstudio.escher_warp', 'Escher Warp'), min: 0, max: 50, def: 0 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: "artstudio-" + s.k, className: "text-[11px] font-bold text-teal-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: "artstudio-" + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-teal-600" })

                      );

                    }),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-tess-scheme-label", className: "text-[11px] font-bold text-teal-700 block mb-1" }, __alloT('stem.artstudio.color_scheme', "Color Scheme")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-tess-scheme-label" },

                        [{ id: 'rainbow', label: __alloT('stem.artstudio.rainbow_2', '\uD83C\uDF08 Rainbow') }, { id: 'warm', label: __alloT('stem.artstudio.warm_4', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_4', '\u2744 Cool') }, { id: 'mono', label: __alloT('stem.artstudio.mono', '\u25AB Mono') }, { id: 'custom', label: __alloT('stem.artstudio.custom', '\uD83C\uDFA8 Custom') }].map(function (s) {

                          return React.createElement("button", { "aria-pressed": (d.tessScheme || 'rainbow') === s.id, key: s.id, onClick: function () { upd('tessScheme', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.tessScheme || 'rainbow') === s.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": "Clear tessellation tile colors", onClick: function () { upd('tessClickData', {}); upd('tessReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Tessellation tile colors cleared.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_colors', "\uD83D\uDDD1 Clear Colors")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_11', "Export PNG"), onClick: function () { var c = document.getElementById('tessCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'tessellation-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_12', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap", role: "group", "aria-labelledby": "artstudio-tess-presets-label" },

                      React.createElement("span", { id: "artstudio-tess-presets-label", className: "text-[11px] font-bold text-teal-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.honeycomb', 'Honeycomb'), shape: 'hexagon', grid: 6, rot: 0, warp: 0, scheme: 'warm' },

                       { label: __alloT('stem.artstudio.pinwheel', 'Pinwheel'), shape: 'triangle', grid: 8, rot: 30, warp: 0, scheme: 'rainbow' },

                       { label: __alloT('stem.artstudio.islamic_star', 'Islamic Star'), shape: 'hexagon', grid: 5, rot: 15, warp: 10, scheme: 'cool' },

                       { label: __alloT('stem.artstudio.escher_fish', 'Escher Fish'), shape: 'square', grid: 6, rot: 0, warp: 35, scheme: 'rainbow' }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('tessShape', pr.shape); upd('tessGrid', pr.grid); upd('tessRotation', pr.rot); upd('tessWarpAmt', pr.warp); upd('tessScheme', pr.scheme); upd('tessClickData', {}); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-teal-700 border border-teal-700 hover:bg-teal-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("button", { "aria-expanded": !!d.showTessInfo, "aria-controls": "artstudio-tess-math", onClick: function () { upd('showTessInfo', !d.showTessInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-cyan-700" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_math_of_tessellations', "\uD83D\uDCCF The Math of Tessellations")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showTessInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showTessInfo && React.createElement("div", { id: "artstudio-tess-math", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, __alloT('stem.artstudio.a', "\uD83D\uDD37 A "), React.createElement("strong", null, "tessellation"), __alloT('stem.artstudio.or_tiling_covers_a_plane_with_shapes_t', " (or tiling) covers a plane with shapes that fit together without gaps or overlaps. Only three regular polygons tile by themselves: "), React.createElement("strong", null, __alloT('stem.artstudio.equilateral_triangles', "equilateral triangles")), __alloT('stem.artstudio.60_6_360', " (60\u00B0 \u00D7 6 = 360\u00B0), "), React.createElement("strong", null, "squares"), __alloT('stem.artstudio.90_4_360_and', " (90\u00B0 \u00D7 4 = 360\u00B0), and "), React.createElement("strong", null, __alloT('stem.artstudio.regular_hexagons', "regular hexagons")), __alloT('stem.artstudio.120_3_360', " (120\u00B0 \u00D7 3 = 360\u00B0).")),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.m_c_escher', "M.C. Escher")), __alloT('stem.artstudio.1898_1972_transformed_simple_tilings_i', " (1898\u20131972) transformed simple tilings into art by warping tile edges. His technique: deform one side of a shape and copy the deformation to the opposite side, so tiles still fit together perfectly. This is the basis of the "), React.createElement("strong", null, __alloT('stem.artstudio.escher_warp_2', "Escher Warp")), " slider."),

                      React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, __alloT('stem.artstudio.islamic_geometric_art', "Islamic geometric art")), __alloT('stem.artstudio.uses_tessellations_extensively_combini', " uses tessellations extensively\u2014combining stars, hexagons, and interlocking patterns seen in mosques like the Alhambra. These patterns follow strict mathematical rules while creating breathtaking visual complexity.")),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, "Transformations:"), __alloT('stem.artstudio.tessellations_use_three_key_operations', " Tessellations use three key operations\u2014"), React.createElement("strong", null, "translation"), " (slide), ", React.createElement("strong", null, "rotation"), __alloT('stem.artstudio.turn_and', " (turn), and "), React.createElement("strong", null, "reflection"), __alloT('stem.artstudio.flip_every_tessellation_can_be_classif', " (flip). Every tessellation can be classified by which of these 17 'wallpaper groups' it belongs to."))

                    )

                  ),

                  React.createElement("p", { id: "artstudio-tess-keyboard-help", className: "text-[11px] text-center text-slate-600 italic" }, "Click a tile to cycle its color. Keyboard: Arrow keys move between tiles; Space or Enter cycles the selected tile; Shift with an Arrow key moves and cycles; Home selects the center tile.")

                ),

                React.createElement("div", { className: "relative min-w-0" },

                  React.createElement("canvas", { tabIndex: 0, id: 'tessCanvas', width: 512, height: 512, role: "img",
                    'aria-label': 'Tessellation canvas with ' + (d.tessShape || 'hexagon') + ' tiles in a ' + (d.tessScheme || 'rainbow') + ' color scheme and grid size ' + (typeof d.tessGrid === 'number' ? d.tessGrid : 6) + '.',
                    'aria-describedby': "artstudio-tess-keyboard-help",
                    'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home Enter Space",
                    className: "rounded-xl border-2 border-teal-300 shadow-lg mx-auto block cursor-pointer focus-visible:ring-4 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
                    style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                    key: 'tess-' + (d.tessShape || 'hexagon') + '-' + (d.tessGrid || 6) + '-' + (d.tessRotation || 0) + '-' + (d.tessWarpAmt || 0) + '-' + (d.tessScheme || 'rainbow') + '-' + (d.tessReset || 0),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._tessInit) return;

                    canvas._tessInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var shape = d.tessShape || 'hexagon';

                    var gridSize = typeof d.tessGrid === 'number' ? d.tessGrid : 6;

                    var rotation = (typeof d.tessRotation === 'number' ? d.tessRotation : 0) * Math.PI / 180;

                    var warpAmt = typeof d.tessWarpAmt === 'number' ? d.tessWarpAmt : 0;

                    var scheme = d.tessScheme || 'rainbow';

                    var clickData = d.tessClickData || {};



                    // Color palettes

                    var palettes = {

                      rainbow: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 360) + ',75%,55%)'; },

                      warm: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 60) + ',80%,' + (40 + (i % 3) * 10) + '%)'; },

                      cool: function (i, total) { return 'hsl(' + (180 + Math.round((i / Math.max(total, 1)) * 80)) + ',70%,' + (40 + (i % 3) * 10) + '%)'; },

                      mono: function (i, total) { return 'hsl(210,' + (10 + (i % 4) * 8) + '%,' + (30 + (i / Math.max(total, 1)) * 40) + '%)'; },

                      custom: function (i) { return 'hsl(' + ((i * 137.508) % 360) + ',65%,55%)'; }

                    };

                    var colorFn = palettes[scheme] || palettes.rainbow;

                    var clickCyclePalette = ['hsl(0,80%,55%)', 'hsl(30,90%,55%)', 'hsl(55,90%,55%)', 'hsl(120,60%,45%)', 'hsl(200,75%,50%)', 'hsl(270,70%,55%)', 'hsl(320,80%,55%)', 'hsl(0,0%,90%)'];



                    // Store tile polygons for click detection

                    var tilePolys = [];



                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    ctx.save();

                    ctx.translate(W / 2, H / 2);

                    ctx.rotate(rotation);

                    ctx.translate(-W / 2, -H / 2);



                    var tileIdx = 0;



                    function warpEdge(x1, y1, x2, y2, amt) {

                      if (amt <= 0) return [[x1, y1], [x2, y2]];

                      var pts = [[x1, y1]];

                      var steps = 6;

                      for (var s = 1; s < steps; s++) {

                        var t = s / steps;

                        var mx = x1 + (x2 - x1) * t;

                        var my = y1 + (y2 - y1) * t;

                        var dx = -(y2 - y1), dy = (x2 - x1);

                        var len = Math.sqrt(dx * dx + dy * dy) || 1;

                        var offset = Math.sin(t * Math.PI * 2) * amt * 0.3;

                        pts.push([mx + (dx / len) * offset, my + (dy / len) * offset]);

                      }

                      pts.push([x2, y2]);

                      return pts;

                    }



                    function warpedPoints(vertices) {

                      var wPts = [];

                      for (var vi = 0; vi < vertices.length; vi++) {

                        var next = (vi + 1) % vertices.length;

                        var edgePts = warpEdge(vertices[vi][0], vertices[vi][1], vertices[next][0], vertices[next][1], warpAmt);

                        for (var ep = 0; ep < edgePts.length - (vi < vertices.length - 1 ? 1 : 0); ep++) wPts.push(edgePts[ep]);

                      }

                      return wPts;

                    }

                    function paintTile(vertices, fillColor) {

                      var wPts = warpedPoints(vertices);

                      ctx.beginPath();

                      ctx.moveTo(wPts[0][0], wPts[0][1]);

                      for (var wp = 1; wp < wPts.length; wp++) ctx.lineTo(wPts[wp][0], wPts[wp][1]);

                      ctx.closePath();

                      ctx.fillStyle = fillColor;

                      ctx.fill();

                      ctx.strokeStyle = 'rgba(255,255,255,0.4)';

                      ctx.lineWidth = 1;

                      ctx.stroke();

                    }

                    function drawTile(vertices, fillColor, idx) {

                      var keyStr = Math.round(vertices[0][0]) + '_' + Math.round(vertices[0][1]);

                      var useColor = clickData[keyStr] !== undefined ? clickCyclePalette[clickData[keyStr] % clickCyclePalette.length] : fillColor;

                      paintTile(vertices, useColor);

                      tilePolys.push({ vertices: vertices, key: keyStr, idx: idx });

                    }



                    if (shape === 'hexagon') {

                      var hexR = W / (gridSize * 1.8);

                      var hexH = hexR * Math.sqrt(3);

                      var startX = -hexR * 2;

                      var startY = -hexH;

                      for (var row = 0; row < gridSize + 3; row++) {

                        for (var col = 0; col < gridSize + 3; col++) {

                          var hx = startX + col * hexR * 1.5;

                          var hy = startY + row * hexH + (col % 2 === 1 ? hexH / 2 : 0);

                          var verts = [];

                          for (var a = 0; a < 6; a++) {

                            var ang = (a * 60 - 30) * Math.PI / 180;

                            verts.push([hx + Math.cos(ang) * hexR, hy + Math.sin(ang) * hexR]);

                          }

                          drawTile(verts, colorFn(tileIdx, (gridSize + 3) * (gridSize + 3)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'square') {

                      var sqSize = W / gridSize;

                      for (var row2 = -1; row2 < gridSize + 1; row2++) {

                        for (var col2 = -1; col2 < gridSize + 1; col2++) {

                          var sx = col2 * sqSize;

                          var sy = row2 * sqSize;

                          var verts2 = [[sx, sy], [sx + sqSize, sy], [sx + sqSize, sy + sqSize], [sx, sy + sqSize]];

                          drawTile(verts2, colorFn(tileIdx, (gridSize + 2) * (gridSize + 2)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'triangle') {

                      var triH2 = W / gridSize;

                      var triW = triH2 * 2 / Math.sqrt(3);

                      for (var row3 = -1; row3 < gridSize + 2; row3++) {

                        for (var col3 = -2; col3 < gridSize * 2 + 2; col3++) {

                          var isUp = (col3 + row3) % 2 === 0;

                          var tx = col3 * triW / 2;

                          var ty = row3 * triH2;

                          var verts3;

                          if (isUp) {

                            verts3 = [[tx, ty + triH2], [tx + triW / 2, ty], [tx + triW, ty + triH2]];

                          } else {

                            verts3 = [[tx, ty], [tx + triW, ty], [tx + triW / 2, ty + triH2]];

                          }

                          drawTile(verts3, colorFn(tileIdx, (gridSize + 3) * (gridSize * 2 + 4)), tileIdx);

                          tileIdx++;

                        }

                      }

                    }

                    ctx.restore();

                    var clickCycleNames = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'light gray'];

                    function displayPoint(px, py) {

                      var dcx = W / 2, dcy = H / 2, ddx = px - dcx, ddy = py - dcy;

                      return { x: dcx + ddx * Math.cos(rotation) - ddy * Math.sin(rotation), y: dcy + ddx * Math.sin(rotation) + ddy * Math.cos(rotation) };

                    }

                    function displayCenter(poly) {

                      var px = 0, py = 0;

                      for (var ci = 0; ci < poly.vertices.length; ci++) { px += poly.vertices[ci][0]; py += poly.vertices[ci][1]; }

                      return displayPoint(px / poly.vertices.length, py / poly.vertices.length);

                    }

                    var visibleTiles = tilePolys.filter(function (poly) {

                      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                      for (var bvi = 0; bvi < poly.vertices.length; bvi++) {

                        var point = displayPoint(poly.vertices[bvi][0], poly.vertices[bvi][1]);

                        minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);

                        maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);

                      }

                      return maxX >= 0 && minX <= W && maxY >= 0 && minY <= H;

                    });

                    var selectedPoly = visibleTiles[0] || tilePolys[0];

                    var bestCenterDistance = Infinity;

                    for (var vsi = 0; vsi < visibleTiles.length; vsi++) {

                      var vc = displayCenter(visibleTiles[vsi]);

                      var vd = Math.pow(vc.x - W / 2, 2) + Math.pow(vc.y - H / 2, 2);

                      if (vd < bestCenterDistance) { bestCenterDistance = vd; selectedPoly = visibleTiles[vsi]; }

                    }

                    function updateTessSelection(show) {

                      if (!selectedPoly) return;

                      canvas._tessSelectedKey = selectedPoly.key;

                      var selectedCenter = displayCenter(selectedPoly);

                      var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-tess-keyboard-cursor="true"]');

                      if (cursor) {

                        var displayW = canvas.clientWidth || W, displayH = canvas.clientHeight || H;

                        cursor.style.left = ((canvas.offsetLeft || 0) + selectedCenter.x / W * displayW - 10) + 'px';

                        cursor.style.top = ((canvas.offsetTop || 0) + selectedCenter.y / H * displayH - 10) + 'px';

                        cursor.style.display = show ? 'block' : 'none';

                      }

                      var selectedNumber = visibleTiles.indexOf(selectedPoly) + 1;

                      var colorIndex = clickData[selectedPoly.key];

                      canvas.setAttribute('aria-label', 'Tessellation canvas with ' + shape + ' tiles in a ' + scheme +

                        ' color scheme and grid size ' + gridSize + '. Selected tile ' + selectedNumber + ' of ' +

                        visibleTiles.length + (colorIndex === undefined ? '.' : ', colored ' + clickCycleNames[colorIndex] + '.'));

                    }

                    function cycleTile(poly) {

                      if (!poly) return;

                      var newClick = Object.assign({}, clickData);

                      var nextColor = ((newClick[poly.key] || 0) + 1) % clickCyclePalette.length;

                      newClick[poly.key] = nextColor;

                      clickData = newClick;

                      ctx.save();

                      ctx.translate(W / 2, H / 2); ctx.rotate(rotation); ctx.translate(-W / 2, -H / 2);

                      paintTile(poly.vertices, clickCyclePalette[nextColor]);

                      ctx.restore();

                      upd('tessClickData', newClick);

                      updateTessSelection(true);

                      if (typeof announceToSR === 'function') announceToSR('Tile ' + (visibleTiles.indexOf(poly) + 1) +

                        ' of ' + visibleTiles.length + ' changed to ' + clickCycleNames[nextColor] + '.');

                    }

                    function moveTessSelection(key) {

                      if (!selectedPoly) return;

                      var current = displayCenter(selectedPoly), best = null, bestScore = Infinity;

                      for (var mi = 0; mi < visibleTiles.length; mi++) {

                        var candidate = visibleTiles[mi];

                        if (candidate === selectedPoly) continue;

                        var cc = displayCenter(candidate), dx = cc.x - current.x, dy = cc.y - current.y;

                        var forward = key === 'ArrowLeft' ? -dx : key === 'ArrowRight' ? dx : key === 'ArrowUp' ? -dy : dy;

                        if (forward <= 1) continue;

                        var sideways = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);

                        var score = forward + sideways * 2;

                        if (score < bestScore) { bestScore = score; best = candidate; }

                      }

                      if (best) selectedPoly = best;

                    }

                    canvas.onfocus = function () { updateTessSelection(true); };

                    canvas.onblur = function () { updateTessSelection(false); };

                    canvas.onkeydown = function (event) {

                      if (event.key === 'Home') {

                        event.preventDefault();

                        bestCenterDistance = Infinity;

                        for (var hi = 0; hi < visibleTiles.length; hi++) {

                          var hc = displayCenter(visibleTiles[hi]);

                          var hd = Math.pow(hc.x - W / 2, 2) + Math.pow(hc.y - H / 2, 2);

                          if (hd < bestCenterDistance) { bestCenterDistance = hd; selectedPoly = visibleTiles[hi]; }

                        }

                        updateTessSelection(true);

                      } else if (event.key.indexOf('Arrow') === 0) {

                        event.preventDefault();

                        moveTessSelection(event.key);

                        if (event.shiftKey) cycleTile(selectedPoly);

                        else {

                          updateTessSelection(true);

                          if (typeof announceToSR === 'function') announceToSR('Selected tile ' +

                            (visibleTiles.indexOf(selectedPoly) + 1) + ' of ' + visibleTiles.length + '.');

                        }

                      } else if (event.key === 'Enter' || event.key === ' ') {

                        event.preventDefault();

                        cycleTile(selectedPoly);

                      }

                    };

                    updateTessSelection(typeof document !== 'undefined' && document.activeElement === canvas);

                    // Click handler for cycling tile colors.

                    canvas.onclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      // Transform click point by inverse rotation

                      var cos = Math.cos(-rotation), sin = Math.sin(-rotation);

                      var cx2 = W / 2, cy2 = H / 2;

                      var dx = mx - cx2, dy = my - cy2;

                      var rx = cx2 + dx * cos - dy * sin;

                      var ry = cy2 + dx * sin + dy * cos;

                      // Find clicked tile

                      for (var ti = tilePolys.length - 1; ti >= 0; ti--) {

                        var poly = tilePolys[ti];

                        var inside = false;

                        var vs = poly.vertices;

                        for (var pi = 0, pj = vs.length - 1; pi < vs.length; pj = pi++) {

                          if (((vs[pi][1] > ry) !== (vs[pj][1] > ry)) && (rx < (vs[pj][0] - vs[pi][0]) * (ry - vs[pi][1]) / (vs[pj][1] - vs[pi][1]) + vs[pi][0])) {

                            inside = !inside;

                          }

                        }

                        if (inside) {

                          selectedPoly = poly;

                          cycleTile(poly);

                          break;

                        }

                      }

                    };

                  }

                }),

                  React.createElement("span", {
                    "data-tess-keyboard-cursor": "true",
                    "aria-hidden": "true",
                    className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0f766e]",
                    style: { display: 'none' }
                  })

                )

              )

            ),

            // ═══ FRACTAL EXPLORER TAB ═══

            tab === 'fractal' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-violet-700 mb-3" }, __alloT('stem.artstudio.fractal_explorer', "\uD83D\uDD2E Fractal Explorer")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-fractal-type-label", className: "text-[11px] font-bold text-violet-700 block mb-1" }, __alloT('stem.artstudio.fractal_type', "Fractal Type")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-fractal-type-label" },

                        [{ id: 'mandelbrot', label: __alloT('stem.artstudio.mandelbrot', '\uD83C\uDF00 Mandelbrot') }, { id: 'julia', label: __alloT('stem.artstudio.julia', '\u2728 Julia') }, { id: 'burningShip', label: __alloT('stem.artstudio.burning_ship', '\uD83D\uDD25 Burning Ship') }, { id: 'sierpinski', label: __alloT('stem.artstudio.sierpinski', '\u25B3 Sierpinski') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.fractalType || 'mandelbrot') === s.id, onClick: function () { upd('fractalType', s.id); upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(s.label + ' fractal selected; view reset.'); }, className: "flex-1 min-w-[6rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 " + ((d.fractalType || 'mandelbrot') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'fractalIter', label: __alloT('stem.artstudio.max_iterations', 'Max Iterations'), min: 50, max: 500, def: 200 },

                     { k: 'fractalZoom', label: __alloT('stem.artstudio.zoom', 'Zoom'), min: 1, max: 500, def: 1 },

                     { k: 'fractalPanX', label: __alloT('stem.artstudio.horizontal_pan', 'Horizontal pan'), min: -200, max: 200, def: 0 },

                     { k: 'fractalPanY', label: __alloT('stem.artstudio.vertical_pan', 'Vertical pan'), min: -200, max: 200, def: 0 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      var valueText = s.k === 'fractalZoom' ? val + ' times magnification' :

                        s.k === 'fractalPanX' ? val + ' horizontal units' :

                        s.k === 'fractalPanY' ? val + ' vertical units' : val + ' iterations';

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-violet-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": valueText, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-600" })

                      );

                    }),

                    (d.fractalType || 'mandelbrot') === 'julia' && React.createElement("div", { className: "space-y-2 mt-2 p-2 bg-violet-50 rounded-lg border border-violet-200" },

                      React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, __alloT('stem.artstudio.julia_constant_c', "Julia Constant (c)")),

                      [{ k: 'juliaReal', label: __alloT('stem.artstudio.c_real', 'c real'), min: -200, max: 200, def: -70 },

                       { k: 'juliaImag', label: __alloT('stem.artstudio.c_imaginary', 'c imaginary'), min: -200, max: 200, def: 27 }].map(function (s) {

                        var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                        return React.createElement("div", { key: s.k },

                          React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-violet-700 block" }, s.label + ': ' + (val / 100).toFixed(2)),

                          React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": (val / 100).toFixed(2), onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-600" })

                        );

                      })

                    ),

                    React.createElement("div", { className: "mb-3 mt-2" },

                      React.createElement("span", { id: "artstudio-fractal-color-label", className: "text-[11px] font-bold text-violet-700 block mb-1" }, __alloT('stem.artstudio.color_scheme_2', "Color Scheme")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-fractal-color-label" },

                        [{ id: 'classic', label: __alloT('stem.artstudio.classic', '\uD83C\uDF08 Classic') }, { id: 'fire', label: __alloT('stem.artstudio.fire', '\uD83D\uDD25 Fire') }, { id: 'ocean', label: __alloT('stem.artstudio.ocean', '\uD83C\uDF0A Ocean') }, { id: 'psychedelic', label: __alloT('stem.artstudio.psychedelic', '\uD83D\uDC9C Psychedelic') }, { id: 'grayscale', label: __alloT('stem.artstudio.grayscale', '\u25AB Grayscale') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.fractalColor || 'classic') === s.id, onClick: function () { upd('fractalColor', s.id); upd('fractalReset', Date.now()); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 " + ((d.fractalColor || 'classic') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal view reset to one times zoom and centered pan.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.reset_view', "\u21BA Reset View")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_13', "Export fractal as PNG"), onClick: function () { var c = document.getElementById('fractalCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'fractal-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Fractal PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_14', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-fractal-presets-label" },

                      React.createElement("span", { id: "artstudio-fractal-presets-label", className: "text-[11px] font-bold text-violet-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.seahorse_valley', 'Seahorse Valley'), type: 'mandelbrot', panX: 74, panY: -20, zoom: 120, iter: 350 },

                       { label: __alloT('stem.artstudio.elephant_valley', 'Elephant Valley'), type: 'mandelbrot', panX: 36, panY: -4, zoom: 80, iter: 300 },

                       { label: __alloT('stem.artstudio.lightning', 'Lightning'), type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 250, jr: -12, ji: 75 },

                       { label: __alloT('stem.artstudio.spiral_arm', 'Spiral Arm'), type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 300, jr: 28, ji: 1 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' fractal preset', onClick: function () { upd('fractalType', pr.type); upd('fractalPanX', pr.panX); upd('fractalPanY', pr.panY); upd('fractalZoom', pr.zoom); upd('fractalIter', pr.iter); if (pr.jr !== undefined) { upd('juliaReal', pr.jr); upd('juliaImag', pr.ji); } upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' fractal preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-violet-700 border border-violet-300 hover:bg-violet-50 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    ),

                    React.createElement("p", { id: "artstudio-fractal-instructions", className: "mt-3 text-[11px] text-violet-700 leading-relaxed" }, __alloT('stem.artstudio.fractal_keyboard_instructions', "Keyboard: use the Zoom, Horizontal pan, and Vertical pan sliders to explore every view. Pointer users can also double-click a location or use the mouse wheel."))

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { id: "artstudio-fractal-info-toggle", "aria-expanded": !!d.showFractalInfo, "aria-controls": "artstudio-fractal-info", onClick: function () { upd('showFractalInfo', !d.showFractalInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_math_of_fractals', "\uD83D\uDD2C The Math of Fractals")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showFractalInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showFractalInfo && React.createElement("div", { id: "artstudio-fractal-info", role: "region", "aria-labelledby": "artstudio-fractal-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, __alloT('stem.artstudio.the_mandelbrot_set', "The Mandelbrot set")), __alloT('stem.artstudio.is_generated_by_iterating_z_z_c_for_ev', " is generated by iterating z = z\u00B2 + c for every point c in the complex plane. Points where |z| stays bounded (never exceeds 2) are 'in' the set. The boundary reveals "), React.createElement("strong", null, __alloT('stem.artstudio.infinite_complexity', "infinite complexity")), __alloT('stem.artstudio.at_every_scale', " at every scale.")),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, __alloT('stem.artstudio.julia_sets', "Julia sets")), __alloT('stem.artstudio.use_the_same_formula_but_fix_c_and_var', " use the same formula but fix c and vary the starting z. Each Mandelbrot point generates a unique Julia set \u2014 points inside the Mandelbrot produce connected Julias; outside points produce dust-like 'Fatou sets'.")),

                      React.createElement("p", null, __alloT('stem.artstudio.the', "\uD83D\uDD25 The "), React.createElement("strong", null, __alloT('stem.artstudio.burning_ship_2', "Burning Ship")), __alloT('stem.artstudio.fractal_modifies_the_iteration_to_z_re', " fractal modifies the iteration to z = (|Re(z)| + i|Im(z)|)\u00B2 + c, creating an asymmetric shape resembling a flaming vessel. It was discovered by Michael Michelitsch and Otto R\u00F6ssler in 1992.")),

                      React.createElement("p", null, __alloT('stem.artstudio.the_2', "\u25B3 The "), React.createElement("strong", null, __alloT('stem.artstudio.sierpinski_triangle', "Sierpinski Triangle")), __alloT('stem.artstudio.is_built_by_the_chaos_game_pick_a_rand', " is built by the 'chaos game': pick a random point, then repeatedly jump halfway toward a randomly chosen vertex. Remarkably, this random process produces a perfectly self-similar fractal.")),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, __alloT('stem.artstudio.benoit_mandelbrot', "Benoit Mandelbrot")), __alloT('stem.artstudio.1924_2010_coined_the_word_fractal_from', " (1924\u20132010) coined the word 'fractal' from Latin 'fractus' (broken). He showed that coastlines, mountains, blood vessels, and stock markets all exhibit fractal geometry \u2014 "), React.createElement("strong", null, __alloT('stem.artstudio.nature_is_fractal', "nature is fractal")), ".")

                    )

                  )

                ),

                React.createElement("canvas", { id: 'fractalCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-fractal-instructions", 'aria-label': ((d.fractalType || 'mandelbrot') === 'mandelbrot' ? 'Mandelbrot fractal: a dark cardioid and circular bulbs bordered by repeating colored tendrils' : (d.fractalType || 'mandelbrot') === 'julia' ? 'Julia fractal: self-similar colored branches generated from the selected complex constant' : (d.fractalType || 'mandelbrot') === 'burningShip' ? 'Burning Ship fractal: an asymmetric ship-like boundary with flame-shaped repeating detail' : 'Sierpinski triangle: a self-similar triangle subdivided into three smaller triangles') + '. ' + (typeof d.fractalIter === 'number' ? d.fractalIter : 200) + ' maximum iterations, ' + (typeof d.fractalZoom === 'number' ? d.fractalZoom : 1) + ' times zoom, horizontal pan ' + (typeof d.fractalPanX === 'number' ? d.fractalPanX : 0) + ', vertical pan ' + (typeof d.fractalPanY === 'number' ? d.fractalPanY : 0) + ', ' + (d.fractalColor || 'classic') + ' color scheme.', className: "rounded-xl border-2 border-violet-300 shadow-lg mx-auto block cursor-crosshair", style: { maxWidth: '100%', background: '#0a0a1a' },

                  key: 'frac-' + (d.fractalType || 'mandelbrot') + '-' + (d.fractalReset || 0),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._fracInit) return;

                    canvas._fracInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.fractalType || 'mandelbrot';

                    var maxIter = typeof d.fractalIter === 'number' ? d.fractalIter : 200;

                    var zoom = typeof d.fractalZoom === 'number' ? d.fractalZoom : 1;

                    var panX = typeof d.fractalPanX === 'number' ? d.fractalPanX : 0;

                    var panY = typeof d.fractalPanY === 'number' ? d.fractalPanY : 0;

                    var colorScheme = d.fractalColor || 'classic';

                    var juliaR = typeof d.juliaReal === 'number' ? d.juliaReal / 100 : -0.7;

                    var juliaI = typeof d.juliaImag === 'number' ? d.juliaImag / 100 : 0.27;



                    function getColor(iter, max) {

                      if (iter === max) return [0, 0, 0];

                      var t = iter / max;

                      if (colorScheme === 'fire') return [Math.min(255, Math.round(t * 3 * 255)), Math.round(t * t * 255), Math.round(t * t * t * 200)];

                      if (colorScheme === 'ocean') return [Math.round(t * t * 80), Math.round(t * 180), Math.min(255, Math.round(t * 1.5 * 255))];

                      if (colorScheme === 'psychedelic') {

                        var h = (t * 360 * 3) % 360;

                        var s = 0.9, l = 0.5;

                        var c = (1 - Math.abs(2 * l - 1)) * s;

                        var x = c * (1 - Math.abs((h / 60) % 2 - 1));

                        var m = l - c / 2;

                        var r1, g1, b1;

                        if (h < 60) { r1 = c; g1 = x; b1 = 0; } else if (h < 120) { r1 = x; g1 = c; b1 = 0; }

                        else if (h < 180) { r1 = 0; g1 = c; b1 = x; } else if (h < 240) { r1 = 0; g1 = x; b1 = c; }

                        else if (h < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }

                        return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];

                      }

                      if (colorScheme === 'grayscale') { var v = Math.round(t * 255); return [v, v, v]; }

                      // classic rainbow

                      var h2 = (t * 360 * 2) % 360;

                      var c2 = 1 * 0.8; var x2 = c2 * (1 - Math.abs((h2 / 60) % 2 - 1)); var m2 = 0.1;

                      var r2, g2, b2;

                      if (h2 < 60) { r2 = c2; g2 = x2; b2 = 0; } else if (h2 < 120) { r2 = x2; g2 = c2; b2 = 0; }

                      else if (h2 < 180) { r2 = 0; g2 = c2; b2 = x2; } else if (h2 < 240) { r2 = 0; g2 = x2; b2 = c2; }

                      else if (h2 < 300) { r2 = x2; g2 = 0; b2 = c2; } else { r2 = c2; g2 = 0; b2 = x2; }

                      return [Math.round((r2 + m2) * 255), Math.round((g2 + m2) * 255), Math.round((b2 + m2) * 255)];

                    }



                    if (type === 'sierpinski') {

                      // Chaos game Sierpinski

                      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                      var verts = [[W / 2, 20], [20, H - 20], [W - 20, H - 20]];

                      var px = Math.random() * W, py = Math.random() * H;

                      var si = 0, total = 100000;

                      var batchSize = reducedMotion ? total : 500;

                      function drawSierpBatch() {

                        for (var b = 0; b < batchSize && si < total; b++, si++) {

                          var vi = Math.floor(Math.random() * 3);

                          px = (px + verts[vi][0]) / 2;

                          py = (py + verts[vi][1]) / 2;

                          if (si > 10) {

                            var t = si / total;

                            var col = getColor(Math.round(t * maxIter * 0.5), maxIter);

                            ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.7)';

                            ctx.fillRect(px, py, 1.2, 1.2);

                          }

                        }

                        if (si < total && canvas.isConnected) canvas._fracAnim = requestAnimationFrame(drawSierpBatch);

                      }

                      drawSierpBatch();

                    } else {

                      // Mandelbrot / Julia / Burning Ship — pixel-by-pixel via ImageData

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      // Render in chunks for responsiveness

                      var rowsDone = 0;

                      var centerX = type === 'mandelbrot' ? -0.5 : type === 'burningShip' ? -0.4 : 0;

                      var centerY = type === 'burningShip' ? -0.5 : 0;

                      var scale = 3.0 / (zoom * Math.min(W, H));

                      var offsetX = (panX / 100) * 2;

                      var offsetY = (panY / 100) * 2;



                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 16, H);

                        for (var py2 = rowsDone; py2 < endRow; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var x0 = (px2 - W / 2) * scale + centerX - offsetX;

                            var y0 = (py2 - H / 2) * scale + centerY - offsetY;

                            var zr, zi, cr, ci, iter = 0;



                            if (type === 'julia') {

                              zr = x0; zi = y0; cr = juliaR; ci = juliaI;

                            } else {

                              zr = 0; zi = 0; cr = x0; ci = y0;

                            }



                            while (iter < maxIter && zr * zr + zi * zi < 4) {

                              if (type === 'burningShip') {

                                var tr = Math.abs(zr), ti = Math.abs(zi);

                                var newR = tr * tr - ti * ti + cr;

                                zi = 2 * tr * ti + ci;

                                zr = newR;

                              } else {

                                var newR2 = zr * zr - zi * zi + cr;

                                zi = 2 * zr * zi + ci;

                                zr = newR2;

                              }

                              iter++;

                            }



                            // Smooth coloring

                            var smoothIter = iter;

                            if (iter < maxIter) {

                              var log_zn = Math.log(zr * zr + zi * zi) / 2;

                              var nu = Math.log(log_zn / Math.log(2)) / Math.log(2);

                              if (isFinite(nu)) smoothIter = iter + 1 - nu;

                            }



                            var col = getColor(smoothIter, maxIter);

                            var idx = (py2 * W + px2) * 4;

                            data[idx] = col[0]; data[idx + 1] = col[1]; data[idx + 2] = col[2]; data[idx + 3] = 255;

                          }

                        }

                        if (reducedMotion) {

                          if (endRow === H) ctx.putImageData(imgData, 0, 0);

                        } else {

                          ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        }

                        rowsDone = endRow;

                        if (rowsDone < H && canvas.isConnected) canvas._fracAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }



                    // Click-to-zoom

                    canvas.ondblclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      var newPanX = Math.round(((W / 2 - mx) / W) * 100 + panX);

                      var newPanY = Math.round(((H / 2 - my) / H) * 100 + panY);

                      var newZoom = Math.min(500, Math.round(zoom * 2));

                      upd('fractalPanX', newPanX); upd('fractalPanY', newPanY); upd('fractalZoom', newZoom); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal view zoomed to ' + newZoom + ' times at horizontal pan ' + newPanX + ' and vertical pan ' + newPanY + '.');

                    };

                    // Scroll-to-zoom

                    canvas.onwheel = function (e) {

                      e.preventDefault();

                      var factor = e.deltaY < 0 ? 1.3 : 0.77;

                      var newZoom2 = Math.max(1, Math.min(500, Math.round(zoom * factor)));

                      upd('fractalZoom', newZoom2); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal zoom ' + newZoom2 + ' times.');

                    };

                  }

                })

              ),

              React.createElement("p", { className: "text-[11px] text-center text-slate-600 italic mt-1" }, __alloT('stem.artstudio.double_click_to_zoom_in_scroll_wheel_t', "\uD83D\uDC46 Double-click to zoom in \u2022 Scroll-wheel to zoom in/out"))

            ),

            // ═══ GRADIENT LAB TAB ═══

            tab === 'gradient' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, __alloT('stem.artstudio.gradient_lab', "\uD83C\uDF08 Gradient Lab")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-gradient-type-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.gradient_type', "Gradient Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-gradient-type-label" },

                        [{ id: 'linear', label: __alloT('stem.artstudio.linear', '\u2194 Linear') }, { id: 'radial', label: __alloT('stem.artstudio.radial', '\u25CE Radial') }, { id: 'conic', label: __alloT('stem.artstudio.conic', '\uD83C\uDF00 Conic') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.gradType || 'linear') === s.id, onClick: function () { upd('gradType', s.id); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.gradType || 'linear') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    (d.gradType || 'linear') === 'linear' && React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { htmlFor: "artstudio-grad-angle", className: "text-[11px] font-bold text-rose-700 block mb-0.5" }, "Angle: " + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + '\u00B0'),

                      React.createElement("input", { id: "artstudio-grad-angle", type: "range", min: 0, max: 360, value: typeof d.gradAngle === 'number' ? d.gradAngle : 90, "aria-valuetext": (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + ' degrees', onChange: function (e) { upd('gradAngle', parseInt(e.target.value)); }, className: "w-full accent-rose-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-gradient-blend-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.blend_mode', "Blend Mode")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-gradient-blend-label" },

                        [{ id: 'smooth', label: __alloT('stem.artstudio.smooth', 'Smooth') }, { id: 'hard', label: __alloT('stem.artstudio.hard_edge', 'Hard Edge') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.gradBlend || 'smooth') === s.id, onClick: function () { upd('gradBlend', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.gradBlend || 'smooth') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    // Color stops editor

                    React.createElement("div", { className: "mb-3", role: "group", "aria-labelledby": "artstudio-gradient-stops-label" },

                      React.createElement("div", { className: "flex items-center justify-between mb-1" },

                        React.createElement("span", { id: "artstudio-gradient-stops-label", className: "text-[11px] font-bold text-rose-700" }, __alloT('stem.artstudio.color_stops', "Color Stops")),

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.add_stop', "Add color stop"), "aria-describedby": "artstudio-gradient-stop-help", disabled: (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length >= 8, onClick: function () {

                          var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                          if (stops.length < 8) {

                            var newPos = 50;

                            stops = stops.concat([{ hue: Math.round(Math.random() * 360), pos: newPos }]);

                            stops.sort(function (a, b) { return a.pos - b.pos; });

                            upd('gradStops', stops);

                            if (typeof announceToSR === 'function') announceToSR('Color stop added. ' + stops.length + ' stops total.');

                          }

                        }, className: "transition-colors px-2 py-1 rounded text-[11px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.add_stop_2', "+ Add Stop"))

                      ),

                      React.createElement("p", { id: "artstudio-gradient-stop-help", className: "text-[11px] text-rose-700 mb-2 leading-relaxed" }, "Adjust hue and position with the sliders. Positions stay between neighboring stops. " + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length + " of 8 stops."),

                      (function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        return stops.map(function (stop, idx) {

                          return React.createElement("div", { key: idx, className: "flex items-end gap-2 mb-2 flex-wrap", role: "group", "aria-label": 'Color stop ' + (idx + 1) + ', hue ' + stop.hue + ' degrees, position ' + stop.pos + ' percent' },

                            React.createElement("div", { "aria-hidden": "true", style: { width: 24, height: 24, borderRadius: 4, background: 'hsl(' + stop.hue + ',85%,55%)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 } }),

                            React.createElement("div", { className: "flex-1 min-w-[8rem]" },

                              React.createElement("label", { htmlFor: 'artstudio-grad-stop-' + idx + '-hue', className: "text-[10px] font-bold text-rose-700 block" }, 'Hue: ' + stop.hue + '\u00B0'),

                              React.createElement("input", { id: 'artstudio-grad-stop-' + idx + '-hue', type: "range", min: 0, max: 360, value: stop.hue, "aria-valuetext": stop.hue + ' degrees', onChange: function (e) {

                                var newStops = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops[idx] = Object.assign({}, newStops[idx], { hue: parseInt(e.target.value) });

                                upd('gradStops', newStops);

                              }, className: "w-full accent-rose-500", title: "Hue: " + stop.hue })

                            ),

                            React.createElement("div", { className: "w-24 flex-shrink-0" },

                              React.createElement("label", { htmlFor: 'artstudio-grad-stop-' + idx + '-position', className: "text-[10px] font-bold text-rose-700 block" }, 'Position: ' + stop.pos + '%'),

                              React.createElement("input", { id: 'artstudio-grad-stop-' + idx + '-position', type: "range", min: idx === 0 ? 0 : stops[idx - 1].pos, max: idx === stops.length - 1 ? 100 : stops[idx + 1].pos, value: stop.pos, "aria-valuetext": stop.pos + ' percent', onChange: function (e) {

                                var newStops2 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops2[idx] = Object.assign({}, newStops2[idx], { pos: parseInt(e.target.value) });

                                upd('gradStops', newStops2);

                              }, className: "w-full accent-orange-500" })

                            ),

                            stops.length > 2 && React.createElement("button", { "aria-label": 'Remove color stop ' + (idx + 1), onClick: function () {

                              var newStops3 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                              newStops3.splice(idx, 1);

                              upd('gradStops', newStops3);

                              if (typeof announceToSR === 'function') announceToSR('Color stop removed. ' + newStops3.length + ' stops remain.');

                            }, className: "transition-colors text-sm font-bold text-red-700 hover:text-red-800 flex-shrink-0 w-6 h-6 rounded focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" }, "\u00D7")

                          );

                        });

                      })()

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_gradient_png', "Export gradient as PNG"), onClick: function () { var c = document.getElementById('gradientCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'gradient-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Gradient PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_16', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-gradient-presets-label" },

                      React.createElement("span", { id: "artstudio-gradient-presets-label", className: "text-[11px] font-bold text-rose-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.sunset', 'Sunset'), stops: [{ hue: 270, pos: 0 }, { hue: 330, pos: 30 }, { hue: 20, pos: 60 }, { hue: 45, pos: 100 }], type: 'linear', angle: 180 },

                       { label: __alloT('stem.artstudio.northern_lights', 'Northern Lights'), stops: [{ hue: 160, pos: 0 }, { hue: 120, pos: 35 }, { hue: 180, pos: 65 }, { hue: 280, pos: 100 }], type: 'linear', angle: 0 },

                       { label: __alloT('stem.artstudio.vaporwave', 'Vaporwave'), stops: [{ hue: 300, pos: 0 }, { hue: 270, pos: 40 }, { hue: 190, pos: 70 }, { hue: 330, pos: 100 }], type: 'radial', angle: 90 },

                       { label: __alloT('stem.artstudio.golden_hour', 'Golden Hour'), stops: [{ hue: 40, pos: 0 }, { hue: 25, pos: 50 }, { hue: 10, pos: 100 }], type: 'linear', angle: 135 },

                       { label: __alloT('stem.artstudio.deep_space', 'Deep Space'), stops: [{ hue: 260, pos: 0 }, { hue: 230, pos: 30 }, { hue: 200, pos: 60 }, { hue: 280, pos: 80 }, { hue: 0, pos: 100 }], type: 'radial', angle: 90 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' gradient preset', onClick: function () { upd('gradStops', pr.stops); upd('gradType', pr.type); upd('gradAngle', pr.angle); if (typeof announceToSR === 'function') announceToSR(pr.label + ' gradient preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-600 hover:bg-rose-50 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  // CSS output

                  React.createElement("div", { className: "bg-slate-900 rounded-xl p-3 border border-slate-700" },

                    React.createElement("div", { className: "flex items-center justify-between mb-1" },

                      React.createElement("span", { id: "artstudio-gradient-css-label", className: "text-[11px] font-bold text-slate-300" }, __alloT('stem.artstudio.css_output', "\uD83D\uDCCB CSS Output")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.copy_gradient_css', "Copy gradient CSS to clipboard"), onClick: function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(', ');

                        var css;

                        if ((d.gradType || 'linear') === 'radial') css = 'background: radial-gradient(circle, ' + stopsStr + ');';

                        else if (d.gradType === 'conic') css = 'background: conic-gradient(from 0deg, ' + stopsStr + ');';

                        else css = 'background: linear-gradient(' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg, ' + stopsStr + ');';

                        navigator.clipboard.writeText(css).then(function () { if (typeof addToast === 'function') addToast('\u2705 CSS copied!', 'success'); if (typeof announceToSR === 'function') announceToSR('Gradient CSS copied to the clipboard.'); }, function () { if (typeof addToast === 'function') addToast('Unable to copy CSS.', 'error'); if (typeof announceToSR === 'function') announceToSR('Unable to copy gradient CSS.'); });

                      }, className: "transition-colors px-2 py-1 rounded text-[11px] font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" }, __alloT('stem.artstudio.copy_2', "\uD83D\uDCCB Copy"))

                    ),

                    React.createElement("code", { id: "artstudio-gradient-css", "aria-labelledby": "artstudio-gradient-css-label", className: "text-[11px] text-green-400 font-mono leading-relaxed block whitespace-pre-wrap" }, (function () {

                      var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                      var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(',\n  ');

                      if ((d.gradType || 'linear') === 'radial') return 'radial-gradient(\n  circle,\n  ' + stopsStr + '\n)';

                      if (d.gradType === 'conic') return 'conic-gradient(\n  from 0deg,\n  ' + stopsStr + '\n)';

                      return 'linear-gradient(\n  ' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg,\n  ' + stopsStr + '\n)';

                    })())

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200" },

                    React.createElement("button", { id: "artstudio-gradient-info-toggle", "aria-expanded": !!d.showGradInfo, "aria-controls": "artstudio-gradient-info", onClick: function () { upd('showGradInfo', !d.showGradInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_gradients', "\uD83C\uDFA8 The Science of Gradients")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showGradInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showGradInfo && React.createElement("div", { id: "artstudio-gradient-info", role: "region", "aria-labelledby": "artstudio-gradient-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, __alloT('stem.artstudio.screens_create_gradients_by_mixing', "\uD83C\uDF08 Screens create gradients by mixing "), React.createElement("strong", null, __alloT('stem.artstudio.rgb_sub_pixels', "RGB sub-pixels")), __alloT('stem.artstudio.each_pixel_blends_red_green_and_blue_l', ". Each pixel blends red, green, and blue light at different intensities. A gradient smoothly interpolates these values across space.")),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.hsl_interpolation', "HSL interpolation")), __alloT('stem.artstudio.produces_more_perceptually_uniform_gra', " produces more perceptually uniform gradients than RGB. Going from red to blue in RGB passes through muddy grays; in HSL, it sweeps through vivid purples \u2014 the way a painter would mix.")),

                      React.createElement("p", null, "\uD83C\uDF05 ", React.createElement("strong", null, __alloT('stem.artstudio.real_world_gradients', "Real-world gradients")), __alloT('stem.artstudio.are_everywhere_sunsets_rayleigh_scatte', " are everywhere: sunsets (Rayleigh scattering separates wavelengths), rainbows (refraction sorts light by frequency), and ocean depths (water absorbs red first, leaving deep blue).")),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, __alloT('stem.artstudio.conic_gradients', "Conic gradients")), __alloT('stem.artstudio.sweep_color_around_a_center_point_like', " sweep color around a center point like a color wheel. They\u2019re used in pie charts, loading spinners, and data visualizations. CSS only added conic-gradient support in 2020!")),

                      React.createElement("p", null, "\uD83D\uDEE0 ", React.createElement("strong", null, __alloT('stem.artstudio.designers', "Designers")), __alloT('stem.artstudio.use_gradients_to_create_depth_direct_a', " use gradients to create depth, direct attention, and evoke emotion. Warm-to-cool gradients suggest depth (atmospheric perspective); light-to-dark suggests volume (chiaroscuro)."))

                    )

                  )

                ),

                React.createElement("canvas", { id: 'gradientCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-gradient-css", 'aria-label': 'Gradient output: ' + (d.gradType || 'linear') + ((d.gradType || 'linear') === 'linear' ? ' at ' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + ' degrees' : '') + ', ' + (d.gradBlend || 'smooth') + ' blend, with ' + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length + ' color stops: ' + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).map(function (stop) { return 'hue ' + stop.hue + ' at ' + stop.pos + ' percent'; }).join(', ') + '.', className: "rounded-xl border-2 border-rose-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#1e1e2e' },

                  key: 'grad-' + (d.gradType || 'linear') + '-' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + '-' + (d.gradBlend || 'smooth') + '-' + JSON.stringify(d.gradStops || []),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._gradInit) return;

                    canvas._gradInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.gradType || 'linear';

                    var angle = typeof d.gradAngle === 'number' ? d.gradAngle : 90;

                    var blend = d.gradBlend || 'smooth';

                    var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];



                    if (blend === 'hard') {

                      // Hard-edge gradient — fill bands

                      if (type === 'linear') {

                        var rad = angle * Math.PI / 180;

                        var cos = Math.cos(rad), sin = Math.sin(rad);

                        for (var py = 0; py < H; py++) {

                          for (var px = 0; px < W; px++) {

                            var t = ((px - W / 2) * cos + (py - H / 2) * sin) / (Math.max(W, H) * 0.5) * 0.5 + 0.5;

                            t = Math.max(0, Math.min(1, t));

                            var pos = t * 100;

                            var stopIdx = 0;

                            for (var si = 0; si < stops.length - 1; si++) {

                              if (pos >= stops[si].pos) stopIdx = si;

                            }

                            ctx.fillStyle = 'hsl(' + stops[stopIdx].hue + ',85%,55%)';

                            ctx.fillRect(px, py, 1, 1);

                          }

                        }

                      } else if (type === 'conic') {

                        var cx2 = W / 2, cy2 = H / 2;

                        for (var py2 = 0; py2 < H; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var ang = (Math.atan2(py2 - cy2, px2 - cx2) * 180 / Math.PI + 360 + 90) % 360;

                            var pos2 = ang / 360 * 100;

                            var si2 = 0;

                            for (var k = 0; k < stops.length - 1; k++) { if (pos2 >= stops[k].pos) si2 = k; }

                            ctx.fillStyle = 'hsl(' + stops[si2].hue + ',85%,55%)';

                            ctx.fillRect(px2, py2, 1, 1);

                          }

                        }

                      } else {

                        var cx3 = W / 2, cy3 = H / 2;

                        var maxR = Math.sqrt(cx3 * cx3 + cy3 * cy3);

                        for (var py3 = 0; py3 < H; py3++) {

                          for (var px3 = 0; px3 < W; px3++) {

                            var dist = Math.sqrt((px3 - cx3) * (px3 - cx3) + (py3 - cy3) * (py3 - cy3));

                            var pos3 = (dist / maxR) * 100;

                            var si3 = 0;

                            for (var k2 = 0; k2 < stops.length - 1; k2++) { if (pos3 >= stops[k2].pos) si3 = k2; }

                            ctx.fillStyle = 'hsl(' + stops[si3].hue + ',85%,55%)';

                            ctx.fillRect(px3, py3, 1, 1);

                          }

                        }

                      }

                    } else {

                      // Smooth gradient using Canvas API

                      if (type === 'linear') {

                        var rad2 = angle * Math.PI / 180;

                        var len = Math.max(W, H);

                        var x1 = W / 2 - Math.cos(rad2) * len / 2;

                        var y1 = H / 2 - Math.sin(rad2) * len / 2;

                        var x2 = W / 2 + Math.cos(rad2) * len / 2;

                        var y2 = H / 2 + Math.sin(rad2) * len / 2;

                        var grad = ctx.createLinearGradient(x1, y1, x2, y2);

                        stops.forEach(function (s) { grad.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad;

                        ctx.fillRect(0, 0, W, H);

                      } else if (type === 'radial') {

                        var grad2 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);

                        stops.forEach(function (s) { grad2.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad2;

                        ctx.fillRect(0, 0, W, H);

                      } else {

                        // Conic — render pixel-by-pixel for smooth interpolation

                        var cx4 = W / 2, cy4 = H / 2;

                        var imgData = ctx.createImageData(W, H);

                        var pxData = imgData.data;

                        function hslToRgb(h, s, l) {

                          h = h / 360; s = s / 100; l = l / 100;

                          var r3, g3, b3;

                          if (s === 0) { r3 = g3 = b3 = l; } else {

                            var hue2rgb = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };

                            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;

                            var p = 2 * l - q;

                            r3 = hue2rgb(p, q, h + 1/3); g3 = hue2rgb(p, q, h); b3 = hue2rgb(p, q, h - 1/3);

                          }

                          return [Math.round(r3 * 255), Math.round(g3 * 255), Math.round(b3 * 255)];

                        }

                        for (var py4 = 0; py4 < H; py4++) {

                          for (var px4 = 0; px4 < W; px4++) {

                            var ang2 = (Math.atan2(py4 - cy4, px4 - cx4) * 180 / Math.PI + 360 + 90) % 360;

                            var pos4 = ang2 / 360 * 100;

                            // Interpolate between stops

                            var s1 = stops[0], s2 = stops[stops.length - 1];

                            for (var k3 = 0; k3 < stops.length - 1; k3++) {

                              if (pos4 >= stops[k3].pos && pos4 <= stops[k3 + 1].pos) { s1 = stops[k3]; s2 = stops[k3 + 1]; break; }

                            }

                            var range = s2.pos - s1.pos || 1;

                            var t4 = (pos4 - s1.pos) / range;

                            var h1 = s1.hue, h2 = s2.hue;

                            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

                            var interpH = ((h1 + (h2 - h1) * t4) + 360) % 360;

                            var rgb = hslToRgb(interpH, 85, 55);

                            var idx = (py4 * W + px4) * 4;

                            pxData[idx] = rgb[0]; pxData[idx + 1] = rgb[1]; pxData[idx + 2] = rgb[2]; pxData[idx + 3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0);

                      }

                    }



                    // Decorative border glow

                    ctx.save();

                    ctx.globalCompositeOperation = 'destination-over';

                    ctx.fillStyle = '#1e1e2e';

                    ctx.fillRect(0, 0, W, H);

                    ctx.restore();

                  }

                })

              )

            ),





            // ═══ STEREOGRAM GENERATOR TAB ═══

            tab === 'stereogram' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-400 mb-2", role: "group", "aria-label": "Stereogram mode" },

                React.createElement("button", { "aria-pressed": (d.stereoAnimMode || 'static') === 'static', onClick: function() { _stopStereoAnim(); upd('stereoAnimMode', 'static'); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'static' ? 'bg-white shadow-md text-cyan-700' : 'text-slate-600 hover:text-slate-700') }, __alloT('stem.artstudio.static', "\uD83D\uDCF8 Static")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.animate', "Animate"), "aria-pressed": (d.stereoAnimMode || 'static') === 'animate', onClick: function() {
                  var staticDepthCanvas = document.getElementById('depthMapCanvas');
                  if (staticDepthCanvas) {
                    try {
                      var staticDepthData = staticDepthCanvas.getContext('2d').getImageData(0, 0, staticDepthCanvas.width, staticDepthCanvas.height);
                      upd('stereoStaticDepthSnapshot', { width: staticDepthCanvas.width, height: staticDepthCanvas.height, data: Array.from(staticDepthData.data) });
                    } catch (_) {}
                  }
                  upd('stereoAnimMode', 'animate');
                }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'animate' ? 'bg-white shadow-md text-purple-700' : 'text-slate-600 hover:text-slate-700') }, __alloT('stem.artstudio.animate_2', "\uD83C\uDFAC Animate"))

              ),

              (d.stereoAnimMode || 'static') === 'static' &&

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-cyan-700 mb-3" }, __alloT('stem.artstudio.stereogram_generator', "\uD83D\uDC53 Stereogram Generator")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-stereo-depth-brush-label", className: "text-[11px] font-bold text-cyan-700 block mb-1" }, __alloT('stem.artstudio.depth_brush', "Depth Brush")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-stereo-depth-brush-label" },

                        [{ id: 'near', label: __alloT('stem.artstudio.near', '\u2B1C Near') }, { id: 'mid', label: __alloT('stem.artstudio.mid', '\uD83D\uDD18 Mid') }, { id: 'far', label: __alloT('stem.artstudio.far', '\u2B1B Far') }, { id: 'erase', label: __alloT('stem.artstudio.erase', '\uD83E\uDDFD Erase') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoDepth || 'near') === s.id, onClick: function () { upd('stereoDepth', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoDepth || 'near') === s.id ? 'bg-cyan-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { htmlFor: "artstudio-stereo-brush-size", className: "text-[11px] font-bold text-cyan-700 block mb-0.5" }, "Brush Size: " + (typeof d.stereoBrush === 'number' ? d.stereoBrush : 20)),

                      React.createElement("input", { id: "artstudio-stereo-brush-size", type: "range", min: 5, max: 60, value: typeof d.stereoBrush === 'number' ? d.stereoBrush : 20, onChange: function (e) { upd('stereoBrush', parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-stereo-pattern-label", className: "text-[11px] font-bold text-cyan-700 block mb-1" }, __alloT('stem.artstudio.pattern_type', "Pattern Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-stereo-pattern-label" },

                        [{ id: 'bw', label: __alloT('stem.artstudio.b_w', '\u26AB B&W') }, { id: 'color', label: __alloT('stem.artstudio.color', '\uD83C\uDFA8 Color') }, { id: 'noise', label: __alloT('stem.artstudio.noise', '\uD83D\uDCFA Noise') }, { id: 'ai', label: __alloT('stem.artstudio.ai', '\u2728 AI') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoPattern || 'bw') === s.id, onClick: function () { upd('stereoPattern', s.id); if(s.id === 'ai' && !d.stereoAiPatternImg) { if(typeof addToast === 'function') addToast('Please generate an AI Pattern first!', 'warning'); } }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-cyan-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'stereoStrength', label: __alloT('stem.artstudio.depth_strength', 'Depth Strength'), min: 5, max: 30, def: 15 },

                     { k: 'stereoDensity', label: __alloT('stem.artstudio.pattern_width', 'Pattern Width'), min: 60, max: 150, def: 100 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-cyan-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                      );

                    }),



                    // --- AI GENERATION ---

                    callImagen && React.createElement("div", { className: "mt-4 bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-200" },

                      React.createElement("div", { className: "flex justify-between items-center mb-2" },

                        React.createElement("label", { htmlFor: "artstudio-stereo-ai-description", className: "text-[11px] font-bold text-indigo-700" }, __alloT('stem.artstudio.ai_stereogram_creator', "\u2728 AI Stereogram Creator")),

                        d.stereoAiGen && React.createElement("span", { className: "text-[11px] text-indigo-700 font-bold" + (reducedMotion ? "" : " animate-pulse") }, "Generating " + d.stereoAiGen + "...")

                      ),

                      React.createElement("textarea", {

                        id: "artstudio-stereo-ai-description",
                        value: d.stereoAiStr || '',

                        onChange: function(e) { upd('stereoAiStr', e.target.value); },

                        placeholder: __alloT('stem.artstudio.describe_an_object_for_a_depth_map_or_', "Describe an object for a depth map or a texture for a pattern..."),

                        className: "w-full text-xs p-2 rounded border border-indigo-600 focus:ring-2 focus:ring-indigo-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAiGen

                      }),

                      React.createElement("div", { className: "flex gap-2" },

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_depth_map', "Generate AI Depth Map"),

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Depth Map');

                            callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAiStr + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  var cvs = document.getElementById('depthMapCanvas');

                                  if(cvs) {

                                    var ztx = cvs.getContext('2d');

                                    ztx.clearRect(0, 0, cvs.width, cvs.height);

                                    ztx.drawImage(img, 0, 0, cvs.width, cvs.height);

                                  }

                                  upd('stereoAiGen', null);

                                  if(typeof addToast === 'function') addToast('\u2728 Depth map generated!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"

                        }, __alloT('stem.artstudio.generate_depth_map', "\u2B1C Generate Depth Map")),

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_pattern_tile', "Generate AI Pattern Tile"),

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Pattern');

                            callImagen('A beautiful, abstract, seamless repeating pattern tile texture of: ' + d.stereoAiStr + '. No text, no borders.', 100)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  // Store in state to use during render logic

                                  var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;

                                  c.getContext('2d').drawImage(img, 0, 0);

                                  upd('stereoAiPatternImg', { width: img.width, height: img.height, data: c.getContext('2d').getImageData(0,0,img.width,img.height).data });

                                  upd('stereoAiGen', null);

                                  upd('stereoPattern', 'ai');

                                  if(typeof addToast === 'function') addToast('\u2728 AI Pattern loaded and selected!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"

                        }, __alloT('stem.artstudio.generate_ai_base_tile', "\uD83C\uDFA8 Generate AI Base Tile"))

                      )

                    ),



                    React.createElement("div", { className: "flex gap-2 mt-4" },

                      React.createElement("button", { onClick: function () { upd('stereoGen', Date.now()); if (typeof announceToSR === 'function') announceToSR('Rendering stereogram from the current depth map.'); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-700 to-teal-700 text-white hover:from-cyan-700 hover:to-teal-700 shadow-md transition-all" }, __alloT('stem.artstudio.render_stereogram', "\uD83D\uDC53 Render Stereogram")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.clear_9', "Clear"), onClick: function () { upd('stereoClear', Date.now()); upd('stereoPreset', null); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_10', "\uD83D\uDDD1 Clear"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap", role: "group", "aria-labelledby": "artstudio-stereo-presets-label" },

                      React.createElement("span", { id: "artstudio-stereo-presets-label", className: "text-[11px] font-bold text-cyan-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.sphere', 'Sphere'), id: 'sphere' }, { label: __alloT('stem.artstudio.pyramid', 'Pyramid'), id: 'pyramid' }, { label: __alloT('stem.artstudio.heart', 'Heart'), id: 'heart' }, { label: __alloT('stem.artstudio.hi_text', 'HI Text'), id: 'text' }, { label: __alloT('stem.artstudio.rings_2', 'Rings'), id: 'rings' }].map(function (pr) {

                        return React.createElement("button", { "aria-label": 'Use ' + pr.label + ' depth-map preset', "aria-pressed": d.stereoPreset === pr.id, key: pr.id, onClick: function () { upd('stereoPreset', pr.id); upd('stereoClear', Date.now()); setTimeout(function () { upd('stereoGen', Date.now()); }, 150); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-cyan-700 border border-cyan-600 hover:bg-cyan-50 transition-all" }, pr.label);

                      })

                    ),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_stereogram_2', "Export Stereogram"), onClick: function () { var c = document.getElementById('stereoCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'stereogram-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "w-full mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_stereogram_3', "\uD83D\uDCE5 Export Stereogram"))

                  ),

                  React.createElement("div", { className: "relative" },

                    React.createElement("p", { className: "text-[11px] font-bold text-cyan-700 mb-1" }, __alloT('stem.artstudio.depth_map_canvas', "\uD83C\uDFA8 Depth Map Canvas")),

                    React.createElement("p", { id: "artstudio-depth-map-legend", className: "text-[11px] text-slate-600 mb-1" }, __alloT('stem.artstudio.white_pops_out_gray_middle_black_far', "White = pops out \u2022 Gray = middle \u2022 Black = far")),

                    React.createElement("p", { id: "artstudio-depth-map-keyboard-help", className: "text-[11px] text-slate-700 mb-1" }, "Keyboard: Arrow keys move the drawing cursor; hold Shift with an Arrow key to draw; Space or Enter stamps the brush; Home returns to center; Alt makes one-pixel moves."),

                    React.createElement("canvas", { id: 'depthMapCanvas', width: 400, height: 400,
                      tabIndex: 0,
                      role: "img",
                      "aria-label": "Depth map drawing canvas. Current brush is " + (d.stereoDepth || 'near') + ". White is near, gray is middle, and black is far.",
                      "aria-describedby": "artstudio-depth-map-legend artstudio-depth-map-keyboard-help",
                      "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",

                      key: 'dm-' + (d.stereoClear || 0),

                      className: "rounded-xl border-2 border-cyan-200 shadow-lg cursor-crosshair block focus-visible:ring-4 focus-visible:ring-cyan-600 focus-visible:ring-offset-2", style: { maxWidth: '100%', background: '#000000' },

                      ref: function (canvas) {

                        if (!canvas) return;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        if (!canvas._dmInit) {

                          canvas._dmInit = true;

                          ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

                          var preset = d.stereoPreset;

                          if (preset === 'sphere') {

                            var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H)*0.35);

                            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888888'); grad.addColorStop(1, '#000000');

                            ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)*0.35, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

                          } else if (preset === 'pyramid') {

                            ctx.beginPath(); ctx.moveTo(W/2, H*0.15); ctx.lineTo(W*0.2, H*0.85); ctx.lineTo(W*0.8, H*0.85); ctx.closePath();

                            var pgr = ctx.createLinearGradient(W/2, H*0.15, W/2, H*0.85);

                            pgr.addColorStop(0, '#ffffff'); pgr.addColorStop(1, '#555555'); ctx.fillStyle = pgr; ctx.fill();

                          } else if (preset === 'heart') {

                            ctx.save(); ctx.translate(W/2, H*0.45);

                            var sc = Math.min(W,H) * 0.012; ctx.scale(sc, -sc);

                            ctx.beginPath();

                            for (var ht = 0; ht <= Math.PI * 2; ht += 0.01) {

                              var hx = 16 * Math.pow(Math.sin(ht), 3);

                              var hy = 13 * Math.cos(ht) - 5 * Math.cos(2*ht) - 2 * Math.cos(3*ht) - Math.cos(4*ht);

                              if (ht === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);

                            }

                            ctx.closePath(); ctx.restore(); ctx.fillStyle = '#ffffff'; ctx.fill();

                          } else if (preset === 'text') {

                            ctx.fillStyle = '#ffffff'; ctx.font = 'bold ' + Math.round(H * 0.45) + 'px Arial';

                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HI', W/2, H/2);

                          } else if (preset === 'rings') {

                            for (var ri = 3; ri > 0; ri--) {

                              var rr = ri * Math.min(W,H) * 0.12;

                              var brt = Math.round((4 - ri) / 3 * 255);

                              ctx.beginPath(); ctx.arc(W/2, H/2, rr, 0, Math.PI*2);

                              ctx.lineWidth = 20; ctx.strokeStyle = 'rgb(' + brt + ',' + brt + ',' + brt + ')'; ctx.stroke();

                            }

                          }

                        }

                        var depthLevel = d.stereoDepth || 'near';

                        var brushSz = typeof d.stereoBrush === 'number' ? d.stereoBrush : 20;

                        var depthColors = { near: '#ffffff', mid: '#999999', far: '#333333', erase: '#000000' };

                        var painting = false;

                        var keyboardCursor = canvas._depthKeyboardCursor || { x: W / 2, y: H / 2 };

                        keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                        keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                        canvas._depthKeyboardCursor = keyboardCursor;

                        function updateDepthKeyboardCursor(show) {

                          var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-depth-keyboard-cursor="true"]');

                          if (cursor) {

                            var displayW = canvas.clientWidth || W;

                            var displayH = canvas.clientHeight || H;

                            cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                            cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                            cursor.style.display = show ? 'block' : 'none';

                          }

                          canvas.setAttribute('aria-label', 'Depth map drawing canvas. Current brush is ' + depthLevel +

                            '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                        }

                        function getP(e) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          return { x: ex * (W / rect.width), y: ey * (H / rect.height) };

                        }

                        function doBrush(pos) {

                          ctx.beginPath(); ctx.arc(pos.x, pos.y, brushSz, 0, Math.PI * 2);

                          ctx.fillStyle = depthColors[depthLevel]; ctx.fill();

                        }

                        function doBrushLine(from, to) {

                          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);

                          ctx.lineWidth = brushSz * 2; ctx.lineCap = 'round';

                          ctx.strokeStyle = depthColors[depthLevel]; ctx.stroke();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function (e) { e.preventDefault(); painting = true; doBrush(getP(e)); };

                        canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) doBrush(getP(e)); };

                        canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

                        canvas.onmouseleave = function () { painting = false; };

                        canvas.onfocus = function () { updateDepthKeyboardCursor(true); };

                        canvas.onblur = function () { updateDepthKeyboardCursor(false); };

                        canvas.onkeydown = function (event) {

                          var step = event.altKey ? 1 : 10;

                          var previous = { x: keyboardCursor.x, y: keyboardCursor.y };

                          var moved = true;

                          if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                          else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                          else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                          else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                          else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                          else moved = false;

                          if (moved) {

                            event.preventDefault();

                            if (event.shiftKey) doBrushLine(previous, keyboardCursor);

                            canvas._depthKeyboardCursor = keyboardCursor;

                            updateDepthKeyboardCursor(true);

                            if (typeof announceToSR === 'function') {

                              announceToSR((event.shiftKey ? 'Drew depth to' : 'Depth cursor') + ' x ' + Math.round(keyboardCursor.x) +

                                ', y ' + Math.round(keyboardCursor.y) + '.');

                            }

                            return;

                          }

                          if (event.key === 'Enter' || event.key === ' ') {

                            event.preventDefault(); doBrush(keyboardCursor);

                            if (typeof announceToSR === 'function') announceToSR('Stamped ' + depthLevel + ' depth at x ' +

                              Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                          }

                        };

                        updateDepthKeyboardCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                      }

                    }),

                    React.createElement("span", {

                      "data-depth-keyboard-cursor": "true",

                      "aria-hidden": "true",

                      className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0891b2]",

                      style: { display: 'none' }

                    })

                  ),

                  React.createElement("div", { className: "flex gap-2 mt-2" },

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.save_depth_map_png', "Save Depth Map PNG"), onClick: function () { var c = document.getElementById('depthMapCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-map-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Depth map saved as PNG!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-all" }, __alloT('stem.artstudio.save_depth_map_png_2', "\u2B07\uFE0F Save Depth Map PNG"))

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200" },

                    React.createElement("button", { "aria-expanded": !!d.showStereoInfo, "aria-controls": "artstudio-stereogram-science", onClick: function () { upd('showStereoInfo', !d.showStereoInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-teal-700" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_stereograms', "\uD83E\uDDE0 The Science of Stereograms")),

                      React.createElement("span", null, d.showStereoInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showStereoInfo && React.createElement("div", { id: "artstudio-stereogram-science", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC40 ", React.createElement("strong", null, __alloT('stem.artstudio.your_eyes_are_6_cm_apart', "Your eyes are ~6 cm apart")), __alloT('stem.artstudio.so_each_sees_the_world_from_a_slightly', ", so each sees the world from a slightly different angle. Your brain fuses these two views to perceive "), React.createElement("strong", null, "depth"), __alloT('stem.artstudio.this_is_called', " \u2014 this is called "), React.createElement("strong", null, "stereopsis"), "."),

                      React.createElement("p", null, "\uD83D\uDC53 ", React.createElement("strong", null, __alloT('stem.artstudio.autostereograms', "Autostereograms")), __alloT('stem.artstudio.magic_eye_images_hide_3d_shapes_in_a_r', " (Magic Eye\u2122 images) hide 3D shapes in a repeating pattern. The trick: where the hidden object is \u2018close,\u2019 the pattern repeats with a "), React.createElement("strong", null, __alloT('stem.artstudio.shorter_period', "shorter period")), __alloT('stem.artstudio.where_it_s_far_the_period_is_longer_yo', "; where it\u2019s \u2018far,\u2019 the period is longer. Your brain decodes these period differences as depth.")),

                      React.createElement("p", null, "\uD83D\uDCDA ", React.createElement("strong", null, __alloT('stem.artstudio.magic_eye_books', "Magic Eye books")), __alloT('stem.artstudio.1993_94_by_tom_baccei_and_cheri_smith_', " (1993\u201394) by Tom Baccei and Cheri Smith sold over 25 million copies worldwide. The underlying autostereogram technique was pioneered by Dr. Christopher Tyler in 1979.")),

                      React.createElement("p", null, __alloT('stem.artstudio.to_see_the_image_hold_your_face_close_', "\uD83E\uDDE0 To see the image: hold your face close to the screen, relax your eyes as if looking \u2018through\u2019 the image at a distant wall, then slowly pull back. The 3D shape will \u2018pop\u2019 into view. This is called "), React.createElement("strong", null, __alloT('stem.artstudio.wall_eyed_parallel_viewing', "wall-eyed (parallel) viewing")), "."),

                      React.createElement("p", null, __alloT('stem.artstudio.about', "\u26A0 About "), React.createElement("strong", null, __alloT('stem.artstudio.5_10_of_people', "5\u201310% of people")), __alloT('stem.artstudio.have_difficulty_seeing_stereograms_due', " have difficulty seeing stereograms due to conditions like amblyopia (lazy eye), strabismus (crossed eyes), or other binocular vision differences. This is completely normal!"))

                    )

                  )

                ),

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "text-xs font-bold text-teal-700" }, __alloT('stem.artstudio.stereogram_output', "\uD83D\uDC53 Stereogram Output")),

                  React.createElement("p", { id: "artstudio-stereogram-output-help", className: "text-[11px] text-slate-600 mb-1" }, __alloT('stem.artstudio.relax_your_eyes_and_look_through_the_i', "Relax your eyes and look \u2018through\u2019 the image to see 3D")),

                  React.createElement("canvas", { id: 'stereoCanvas', width: 512, height: 512,
                    role: "img",
                    "aria-label": "Stereogram output using the " + (d.stereoPattern || 'black and white') + " pattern and " + (d.stereoPreset || 'drawn') + " depth map.",
                    "aria-describedby": "artstudio-stereogram-output-help",

                    key: 'stereo-' + (d.stereoGen || 0),

                    className: "rounded-xl border-2 border-teal-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function (canvas) {

                      if (!canvas) return;

                      if (canvas._stereoInit) return;

                      canvas._stereoInit = true;

                      var ctx = canvas.getContext('2d');

                      var W = canvas.width, H = canvas.height;

                      var patternType = d.stereoPattern || 'bw';

                      var patternWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                      var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                      var dmCanvas = document.getElementById('depthMapCanvas');

                      if (!dmCanvas) {

                        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);

                        ctx.fillStyle = '#444'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                        ctx.fillText('Draw on the depth map, then click Generate', W/2, H/2);

                        return;

                      }

                      var dmCtx = dmCanvas.getContext('2d');

                      var dmData = dmCtx.getImageData(0, 0, dmCanvas.width, dmCanvas.height).data;

                      var dmW = dmCanvas.width, dmH = dmCanvas.height;

                      function makeRng(seed) {

                        var s = seed; return function () { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; };

                      }

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      var rowsDone = 0;

                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 32, H);

                        for (var y = rowsDone; y < endRow; y++) {

                          var rng = makeRng(y * 7919 + 12345);

                          var row = new Uint8Array(W * 3);

                          for (var x = 0; x < W; x++) {

                            if (x < patternWidth) {

                              if (patternType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3] = c; row[x*3+1] = c; row[x*3+2] = c; }

                              else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                              else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                var pw = d.stereoAiPatternImg.width, ph = d.stereoAiPatternImg.height;

                                var pIdx = ((y % ph) * pw + (x % pw)) * 4;

                                row[x*3] = d.stereoAiPatternImg.data[pIdx]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx+2];

                              }

                              else { var v = Math.floor(rng() * 220) + 20; row[x*3] = v; row[x*3+1] = v; row[x*3+2] = v; }

                            } else {

                              var dx = Math.floor(x * dmW / W), dy = Math.floor(y * dmH / H);

                              var di = (dy * dmW + dx) * 4;

                              var depth = dmData[di] / 255;

                              var shift = Math.round(depth * maxShift);

                              var srcX = x - patternWidth + shift;

                              if (srcX >= 0) { row[x*3] = row[srcX*3]; row[x*3+1] = row[srcX*3+1]; row[x*3+2] = row[srcX*3+2]; }

                              else {

                                if (patternType === 'bw') { var c2 = rng() > 0.5 ? 230 : 25; row[x*3] = c2; row[x*3+1] = c2; row[x*3+2] = c2; }

                                else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                                else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                  var pw2 = d.stereoAiPatternImg.width, ph2 = d.stereoAiPatternImg.height;

                                  var pIdx2 = ((y % ph2) * pw2 + (x % pw2)) * 4;

                                  row[x*3] = d.stereoAiPatternImg.data[pIdx2]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx2+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx2+2];

                                }

                                else { var v2 = Math.floor(rng()*220)+20; row[x*3] = v2; row[x*3+1] = v2; row[x*3+2] = v2; }

                              }

                            }

                          }

                          for (var x2 = 0; x2 < W; x2++) {

                            var idx = (y * W + x2) * 4;

                            data[idx] = row[x2*3]; data[idx+1] = row[x2*3+1]; data[idx+2] = row[x2*3+2]; data[idx+3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        rowsDone = endRow;

                        if (rowsDone < H && canvas.isConnected) canvas._stereoAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }

                  }),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, __alloT('stem.artstudio.how_to_view', "\uD83D\uDCA1 How to View")),

                    React.createElement("ol", { className: "text-[11px] text-slate-600 leading-relaxed list-decimal ml-4 space-y-0.5" },

                      React.createElement("li", null, __alloT('stem.artstudio.hold_your_face_close_to_the_screen', "Hold your face close to the screen")),

                      React.createElement("li", null, __alloT('stem.artstudio.relax_your_eyes_try_to_look_through_th', "Relax your eyes \u2014 try to look \u2018through\u2019 the image at a wall behind it")),

                      React.createElement("li", null, __alloT('stem.artstudio.slowly_move_back_a_3d_shape_will_emerg', "Slowly move back. A 3D shape will emerge!")),

                      React.createElement("li", null, __alloT('stem.artstudio.tip_the_two_guide_dots_above_should_ap', "Tip: the two guide dots above should appear as three when your eyes are set correctly"))

                    )

                  )

                )

              )

            ),

              (d.stereoAnimMode || 'static') === 'animate' && React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-purple-700 mb-3" }, __alloT('stem.artstudio.animated_stereogram_studio', "\uD83C\uDFAC Animated Stereogram Studio")),

                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" }, __alloT('stem.artstudio.create_animated_3d_stereograms_from_pr', "Create animated 3D stereograms from presets, custom drawings, uploaded images, transforms, or AI-generated depth maps!")),



                  // ═══ SOURCE MODE SELECTOR ═══

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-animation-source-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.animation_source', "\uD83D\uDCE1 Animation Source")),

                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-animation-source-label" },

                      [{ id: 'preset', icon: '\u2728', label: __alloT('stem.artstudio.preset', 'Preset') }, { id: 'draw', icon: '\u270F\uFE0F', label: __alloT('stem.artstudio.draw', 'Draw') }, { id: 'upload', icon: '\uD83D\uDCC2', label: __alloT('stem.artstudio.upload', 'Upload') }, { id: 'transform', icon: '\uD83D\uDD04', label: __alloT('stem.artstudio.transform', 'Transform') }, { id: 'ai', icon: '\uD83E\uDD16', label: __alloT('stem.artstudio.ai_depth', 'AI Depth') }].map(function(s) {

                        return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoAnimSource || 'preset') === s.id, onClick: function() { upd('stereoAnimSource', s.id); },

                          className: "px-2 py-2 rounded-lg text-[11px] font-bold transition-all text-center " + ((d.stereoAnimSource || 'preset') === s.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50')

                        }, s.icon + ' ' + s.label);

                      })

                    )

                  ),



                  // ═══ PRESET SOURCE (existing behavior) ═══

                  (d.stereoAnimSource || 'preset') === 'preset' && React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-animation-preset-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.animation_presets', "\u2728 Animation Presets")),

                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-animation-preset-label" },

                      [{ id: 'pulseSphere', icon: '\uD83D\uDCAB', label: __alloT('stem.artstudio.pulse', 'Pulse') }, { id: 'spinCube', icon: '\uD83D\uDD04', label: __alloT('stem.artstudio.spin_cube', 'Spin Cube') }, { id: 'waveRipple', icon: '\uD83C\uDF0A', label: __alloT('stem.artstudio.wave', 'Wave') }, { id: 'morphHeart', icon: '\uD83D\uDC93', label: __alloT('stem.artstudio.heart_2', 'Heart') }, { id: 'floatText', icon: '\u2702\uFE0F', label: __alloT('stem.artstudio.3d_text', '3D Text') }].map(function(p) {

                        return React.createElement("button", { key: p.id, "aria-pressed": d.stereoAnimPreset === p.id, onClick: function() { upd('stereoAnimPreset', p.id); },

                          className: "px-2 py-2 rounded-lg text-[11px] font-bold transition-all text-center " + (d.stereoAnimPreset === p.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50')

                        }, p.icon + ' ' + p.label);

                      })

                    )

                  ),



                  // ═══ CUSTOM DRAW SOURCE ═══

                  (d.stereoAnimSource) === 'draw' && React.createElement("div", { className: "relative mb-3 space-y-2" },

                    React.createElement("h5", { className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.draw_depth_keyframes', "\u270F\uFE0F Draw Depth Keyframes")),

                    React.createElement("p", { id: "artstudio-anim-draw-description", className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.draw_a_depth_map_capture_it_as_a_keyfr', "Draw a depth map, capture it as a keyframe, then draw the next. The animation will interpolate between them.")),

                    React.createElement("p", { id: "artstudio-anim-draw-keyboard-help", className: "text-[11px] text-slate-700" }, "Keyboard: Arrow keys move the drawing cursor; hold Shift with an Arrow key to draw; Space or Enter stamps the brush; Home returns to center; Alt makes one-pixel moves."),

                    React.createElement("div", { className: "flex gap-1 mb-2", role: "group", "aria-label": "Animation depth brush" },

                      [{ id: 'near', label: __alloT('stem.artstudio.near_2', '\u2B1C Near'), c: '#ffffff' }, { id: 'mid', label: __alloT('stem.artstudio.mid_2', '\uD83D\uDD18 Mid'), c: '#888888' }, { id: 'far', label: __alloT('stem.artstudio.far_2', '\u2B1B Far'), c: '#222222' }, { id: 'erase', label: __alloT('stem.artstudio.erase_2', '\uD83E\uDDFD Erase'), c: '#000000' }].map(function(s2) {

                        return React.createElement("button", { key: s2.id, "aria-pressed": (d.stereoAnimDrawBrush || 'near') === s2.id, onClick: function() { upd('stereoAnimDrawBrush', s2.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimDrawBrush || 'near') === s2.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, s2.label);

                      })

                    ),

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("label", { htmlFor: "artstudio-anim-draw-size", className: "text-[11px] font-bold text-purple-700" }, "Brush: " + (d.stereoAnimDrawSize || 20)),

                      React.createElement("input", { id: "artstudio-anim-draw-size", type: "range", min: 5, max: 60, value: d.stereoAnimDrawSize || 20, onChange: function(e) { upd('stereoAnimDrawSize', parseInt(e.target.value)); }, className: "flex-1 accent-purple-600" })

                    ),

                    React.createElement("canvas", { id: 'stereoAnimDrawCanvas', width: 400, height: 400,
                      tabIndex: 0,
                      role: "img",
                      "aria-label": "Animation depth-map drawing canvas. Current brush is " + (d.stereoAnimDrawBrush || 'near') + ".",
                      "aria-describedby": "artstudio-anim-draw-description artstudio-anim-draw-keyboard-help",
                      "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",

                      key: 'anim-draw-' + (d.stereoAnimDrawClear || 0),

                      className: "rounded-xl border-2 border-purple-200 shadow-lg cursor-crosshair block mx-auto focus-visible:ring-4 focus-visible:ring-purple-600 focus-visible:ring-offset-2", style: { maxWidth: '100%', background: '#000' },

                      ref: function(canvas) {

                        if (!canvas) return;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        if (!canvas._drawInit) {

                          canvas._drawInit = true;

                          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

                        }

                        var drawing = false;

                        var keyboardCursor = canvas._animDepthKeyboardCursor || { x: W / 2, y: H / 2 };

                        keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                        keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                        canvas._animDepthKeyboardCursor = keyboardCursor;

                        function updateAnimDepthCursor(show) {

                          var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-anim-depth-keyboard-cursor="true"]');

                          if (cursor) {

                            var displayW = canvas.clientWidth || W;

                            var displayH = canvas.clientHeight || H;

                            cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                            cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                            cursor.style.display = show ? 'block' : 'none';

                          }

                          canvas.setAttribute('aria-label', 'Animation depth-map drawing canvas. Current brush is ' +

                            (d.stereoAnimDrawBrush || 'near') + '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) +

                            ', y ' + Math.round(keyboardCursor.y) + '.');

                        }

                        function getColor() {

                          var b = d.stereoAnimDrawBrush || 'near';

                          if (b === 'near') return '#ffffff';

                          if (b === 'mid') return '#888888';

                          if (b === 'far') return '#222222';

                          return '#000000';

                        }

                        function paintAt(x, y) {

                          var size = d.stereoAnimDrawSize || 20;

                          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);

                          ctx.fillStyle = getColor(); ctx.fill();

                        }

                        function paint(e) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          paintAt(ex * (W / rect.width), ey * (H / rect.height));

                        }

                        function paintLine(from, to) {

                          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);

                          ctx.lineWidth = (d.stereoAnimDrawSize || 20) * 2; ctx.lineCap = 'round';

                          ctx.strokeStyle = getColor(); ctx.stroke();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function(e) { e.preventDefault(); drawing = true; paint(e); };

                        canvas.onmousemove = canvas.ontouchmove = function(e) { if (drawing) { e.preventDefault(); paint(e); } };

                        canvas.onmouseup = canvas.ontouchend = function() { drawing = false; };

                        canvas.onmouseleave = function() { drawing = false; };

                        canvas.onfocus = function() { updateAnimDepthCursor(true); };

                        canvas.onblur = function() { updateAnimDepthCursor(false); };

                        canvas.onkeydown = function(event) {

                          var step = event.altKey ? 1 : 10;

                          var previous = { x: keyboardCursor.x, y: keyboardCursor.y };

                          var moved = true;

                          if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                          else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                          else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                          else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                          else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                          else moved = false;

                          if (moved) {

                            event.preventDefault();

                            if (event.shiftKey) paintLine(previous, keyboardCursor);

                            canvas._animDepthKeyboardCursor = keyboardCursor;

                            updateAnimDepthCursor(true);

                            if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Drew animation depth to' : 'Animation depth cursor') +

                              ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                            return;

                          }

                          if (event.key === 'Enter' || event.key === ' ') {

                            event.preventDefault(); paintAt(keyboardCursor.x, keyboardCursor.y);

                            if (typeof announceToSR === 'function') announceToSR('Stamped ' + (d.stereoAnimDrawBrush || 'near') +

                              ' animation depth at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                          }

                        };

                        updateAnimDepthCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                      }

                    }),

                    React.createElement("span", {

                      "data-anim-depth-keyboard-cursor": "true",

                      "aria-hidden": "true",

                      className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#7e22ce]",

                      style: { display: 'none' }

                    }),

                    React.createElement("div", { className: "flex flex-wrap gap-2 mt-2" },

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.capture_keyframe', "Capture Keyframe"), onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (!c) return;

                        var imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);

                        var kf = d.stereoAnimKeyframes ? d.stereoAnimKeyframes.slice() : [];

                        kf.push({ width: c.width, height: c.height, data: Array.from(imgData.data) });

                        upd('stereoAnimKeyframes', kf);

                        if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Keyframe ' + kf.length + ' captured!', 'success');
                        if (typeof announceToSR === 'function') announceToSR('Keyframe ' + kf.length + ' captured.');

                      }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:from-green-800 hover:to-emerald-800 shadow-sm" }, __alloT('stem.artstudio.capture_keyframe_2', "\uD83D\uDCF8 Capture Keyframe")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.clear_canvas', "Clear Canvas"), onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (c) { var ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); if (typeof announceToSR === 'function') announceToSR('Animation depth canvas cleared.'); }

                      }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" }, __alloT('stem.artstudio.clear_canvas_2', "\uD83D\uDDD1 Clear Canvas")),

                      React.createElement("button", { onClick: function() { upd('stereoAnimKeyframes', []); if (typeof announceToSR === 'function') announceToSR('All animation keyframes cleared.'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_all_frames', "\u274C Clear All Frames")),

                      React.createElement("button", { onClick: function() { var c = document.getElementById('stereoAnimDrawCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-drawing-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Drawing saved as PNG!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-600 hover:from-indigo-100 hover:to-purple-100 transition-all" }, __alloT('stem.artstudio.save_drawing_png', "\u2B07\uFE0F Save Drawing PNG")),

                      (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length >= 2) && React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_depth_map_gif', "Export Depth Map GIF"), onClick: function() {

                        var kfs = d.stereoAnimKeyframes;

                        if (!kfs || kfs.length < 2) { if (typeof addToast === 'function') addToast('Need at least 2 keyframes for GIF!', 'warning'); return; }

                        if (typeof addToast === 'function') addToast('\u23F3 Building depth map GIF...', 'info');

                        var totalFrames = 24;

                        var canvasFrames = [];

                        var tempCanvas = document.createElement('canvas'); tempCanvas.width = kfs[0].width; tempCanvas.height = kfs[0].height;

                        var tempCtx = tempCanvas.getContext('2d');

                        for (var fi = 0; fi < totalFrames; fi++) {

                          var interpData = _interpolateDepthMaps(

                            kfs.map(function(kf) { var id = tempCtx.createImageData(kf.width, kf.height); for (var p = 0; p < kf.data.length; p++) id.data[p] = kf.data[p]; return id; }),

                            fi, totalFrames

                          );

                          tempCtx.putImageData(interpData, 0, 0);

                          canvasFrames.push(tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height));

                        }

                        _exportStereoGif(canvasFrames, 8);

                      }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-600 hover:from-emerald-100 hover:to-teal-100 transition-all" }, __alloT('stem.artstudio.export_depth_gif', "\uD83C\uDFAC Export Depth GIF"))

                    ),

                    (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length > 0) && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { role: "status", "aria-live": "polite", className: "text-[11px] font-bold text-purple-700 mb-1" }, "\uD83C\uDFAC Keyframes: " + d.stereoAnimKeyframes.length),

                      React.createElement("div", { className: "flex gap-1 flex-wrap" },

                        d.stereoAnimKeyframes.map(function(kf, idx) {

                          return React.createElement("div", { key: idx, className: "relative" },

                            React.createElement("canvas", { width: 60, height: 60, role: "img", "aria-label": "Depth-map keyframe " + (idx + 1) + " of " + d.stereoAnimKeyframes.length, className: "rounded border border-purple-200", ref: function(c) {

                              if (!c) return;

                              var ctx = c.getContext('2d');

                              var imgData = ctx.createImageData(kf.width, kf.height);

                              for (var i = 0; i < kf.data.length; i++) imgData.data[i] = kf.data[i];

                              var temp = document.createElement('canvas'); temp.width = kf.width; temp.height = kf.height;

                              temp.getContext('2d').putImageData(imgData, 0, 0);

                              ctx.drawImage(temp, 0, 0, 60, 60);

                            } }),

                            React.createElement("button", { "aria-label": "Remove keyframe " + (idx + 1), onClick: function() {

                              var kfs = d.stereoAnimKeyframes.slice(); kfs.splice(idx, 1); upd('stereoAnimKeyframes', kfs); if (typeof announceToSR === 'function') announceToSR('Keyframe ' + (idx + 1) + ' removed.');

                            }, className: "transition-colors absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-700 text-white text-sm font-bold flex items-center justify-center hover:bg-red-600 cursor-pointer focus-visible:ring-4 focus-visible:ring-purple-600 focus-visible:ring-offset-2", style: { lineHeight: '1' } }, "\u00D7")

                          );

                        })

                      )

                    )

                  ),



                  // ═══ UPLOAD IMAGE SOURCE ═══

                  (d.stereoAnimSource) === 'upload' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { htmlFor: "artstudio-anim-depth-upload", className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.upload_depth_map_image', "\uD83D\uDCC2 Upload Depth Map Image")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.upload_a_grayscale_image_white_near_bl', "Upload a grayscale image (white = near, black = far). It will be animated using the selected transform.")),

                    React.createElement("input", { id: "artstudio-anim-depth-upload", type: "file", accept: "image/png,image/jpeg,image/webp",

                      'aria-label': __alloT('stem.artstudio.upload_depth_map_image_2', 'Upload depth map image'),

                      className: "text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200",

                      onChange: function(e) {

                        var file = e.target.files && e.target.files[0];

                        if (!file) return;

                        var reader = new FileReader();

                        reader.onload = function(ev) {

                          var img = new Image();

                          img.onload = function() {

                            var c = document.createElement('canvas'); c.width = 400; c.height = 400;

                            var ctx = c.getContext('2d');

                            ctx.drawImage(img, 0, 0, 400, 400);

                            var imgData = ctx.getImageData(0, 0, 400, 400);

                            upd('stereoAnimUploadedDepth', { width: 400, height: 400, data: Array.from(imgData.data) });

                            if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Depth map uploaded!', 'success');

                          };

                          img.src = ev.target.result;

                        };

                        reader.readAsDataURL(file);

                      }

                    }),

                    d.stereoAnimUploadedDepth && React.createElement("div", { className: "mt-2 flex items-center gap-2" },

                      React.createElement("canvas", { width: 80, height: 80, role: "img", "aria-label": "Uploaded depth map preview", className: "rounded border border-purple-200", ref: function(c) {

                        if (!c || !d.stereoAnimUploadedDepth) return;

                        var ctx = c.getContext('2d');

                        var ud = d.stereoAnimUploadedDepth;

                        var imgData = ctx.createImageData(ud.width, ud.height);

                        for (var i = 0; i < ud.data.length; i++) imgData.data[i] = ud.data[i];

                        var temp = document.createElement('canvas'); temp.width = ud.width; temp.height = ud.height;

                        temp.getContext('2d').putImageData(imgData, 0, 0);

                        ctx.drawImage(temp, 0, 0, 80, 80);

                      } }),

                      React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] text-green-700 font-bold" }, __alloT('stem.artstudio.depth_map_loaded_400_400', "\u2705 Depth map loaded (400\u00D7400)"))

                    ),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("span", { id: "artstudio-upload-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type', "\uD83D\uDD04 Transform Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-upload-transform-label" },

                        [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_2', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide', '\u21C6 Slide') }].map(function(t) {

                          return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                        })

                      )

                    )

                  ),



                  // ═══ TRANSFORM SOURCE (uses static depth map) ═══

                  (d.stereoAnimSource) === 'transform' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("h5", { className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.transform_depth_map', "\uD83D\uDD04 Transform Depth Map")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.animates_the_depth_map_from_the_static', "Animates the depth map from the Static tab using a chosen transform effect. Switch to Static mode first to draw your depth map.")),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("span", { id: "artstudio-static-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type_2', "\uD83D\uDD04 Transform Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-static-transform-label" },

                        [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_3', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate_2', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce_2', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide_2', '\u21C6 Slide') }].map(function(t) {

                          return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200" },

                      React.createElement("p", { role: "status", className: "text-[11px] text-amber-700" }, (d.stereoStaticDepthSnapshot ? "\u2705 Static depth map captured. " : "\u26A0 No static depth map captured yet. ") + __alloT('stem.artstudio.tip_draw_a_depth_map_in_the_static_tab', "\uD83D\uDCA1 Tip: Draw a depth map in the Static tab first, then come back here to animate it with a transform."))

                    )

                  ),



                  // ═══ AI DEPTH SOURCE ═══

                  (d.stereoAnimSource) === 'ai' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { htmlFor: "artstudio-stereo-animation-ai-prompt", className: "text-[11px] font-bold text-purple-600 block" }, __alloT('stem.artstudio.ai_generated_depth_map', "\uD83E\uDD16 AI-Generated Depth Map")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.describe_a_3d_scene_and_ai_will_genera', "Describe a 3D scene and AI will generate a depth map, then animate it with a transform.")),

                    callImagen ? React.createElement("div", null,

                      React.createElement("textarea", {

                        id: "artstudio-stereo-animation-ai-prompt",
                        value: d.stereoAnimAiPrompt || '',

                        onChange: function(e) { upd('stereoAnimAiPrompt', e.target.value); },

                        placeholder: __alloT('stem.artstudio.e_g_a_glowing_crystal_orb_floating_in_', "e.g. A glowing crystal orb floating in space..."),

                        className: "w-full text-xs p-2 rounded border border-purple-600 focus:ring-2 focus:ring-purple-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAnimAiGenerating

                      }),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_depth_map_for_animation', "Generate AI Depth Map for Animation"),

                        onClick: function() {

                          if (!d.stereoAnimAiPrompt) return;

                          upd('stereoAnimAiGenerating', true);

                          callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAnimAiPrompt + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                            .then(function(base64) {

                              var img = new Image();

                              img.onload = function() {

                                var c = document.createElement('canvas'); c.width = 400; c.height = 400;

                                c.getContext('2d').drawImage(img, 0, 0, 400, 400);

                                var imgData = c.getContext('2d').getImageData(0, 0, 400, 400);

                                upd('stereoAnimAiDepth', { width: 400, height: 400, data: Array.from(imgData.data) });

                                upd('stereoAnimAiGenerating', false);

                                if (typeof addToast === 'function') addToast('\u2728 AI depth map generated!', 'success');

                              };

                              img.src = base64;

                            }).catch(function(e) {

                              upd('stereoAnimAiGenerating', false);

                              if (typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                            });

                        },

                        disabled: !!d.stereoAnimAiGenerating || !d.stereoAnimAiPrompt,

                        className: "w-full px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800 disabled:opacity-50 shadow-sm transition-all mb-2"

                      }, d.stereoAnimAiGenerating ? '\u23F3 Generating...' : '\uD83E\uDD16 Generate AI Depth Map'),

                      d.stereoAnimAiDepth && React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                        React.createElement("canvas", { width: 80, height: 80, role: "img", "aria-label": "AI-generated depth map preview", className: "rounded border border-purple-200", ref: function(c) {

                          if (!c || !d.stereoAnimAiDepth) return;

                          var ctx = c.getContext('2d');

                          var ad = d.stereoAnimAiDepth;

                          var imgData = ctx.createImageData(ad.width, ad.height);

                          for (var i = 0; i < ad.data.length; i++) imgData.data[i] = ad.data[i];

                          var temp = document.createElement('canvas'); temp.width = ad.width; temp.height = ad.height;

                          temp.getContext('2d').putImageData(imgData, 0, 0);

                          ctx.drawImage(temp, 0, 0, 80, 80);

                        } }),

                        React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] text-green-700 font-bold" }, __alloT('stem.artstudio.ai_depth_map_ready', "\u2705 AI depth map ready!"))

                      ),

                      React.createElement("div", { className: "mt-2" },

                        React.createElement("span", { id: "artstudio-ai-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type_3', "\uD83D\uDD04 Transform Type")),

                        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-ai-transform-label" },

                          [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_4', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate_3', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce_3', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide_3', '\u21C6 Slide') }, { id: 'ai-motion', label: __alloT('stem.artstudio.ai_motion', '\uD83C\uDFAD AI Motion') }].map(function(t) {

                            return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() {

                              upd('stereoAnimTransform', t.id);

                              // AI Motion is much heavier per frame than mechanical transforms,
                              // so seed a lower default frame count if the user is still on the
                              // pre-AI default. Caps to 30 max via slider; <=8 generates in
                              // ~30-45s end-to-end on Google's tier.
                              if (t.id === 'ai-motion' && (typeof d.stereoAnimFrameCount !== 'number' || d.stereoAnimFrameCount === 12)) {

                                upd('stereoAnimFrameCount', 8);

                              }

                            },

                              className: "px-1 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                          })

                        ),

                        (d.stereoAnimTransform === 'ai-motion') && React.createElement("p", { className: "text-[10px] text-purple-700 mt-1 italic" },

                          __alloT('stem.artstudio.ai_motion_calls_gemini_to_plan_poses_t', "AI Motion calls Gemini to plan poses then Imagen to render each frame as its own depth map. ~5\u20137s per frame; rate-limit-safe.")

                        )

                      )

                    ) : React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" },

                      React.createElement("p", { className: "text-[11px] text-amber-700 font-bold" }, __alloT('stem.artstudio.ai_image_generation_is_not_available_u', "\u26A0\uFE0F AI image generation is not available. Use the Preset, Draw, Upload, or Transform modes instead."))

                    )

                  ),



                  // ═══ COMMON CONTROLS (frames, speed, pattern, strength) ═══

                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3" },

                    React.createElement("div", null,

                      React.createElement("label", { htmlFor: "artstudio-anim-frame-count", className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, "Frames: " + (d.stereoAnimFrameCount || 12)),

                      React.createElement("input", { id: "artstudio-anim-frame-count", type: "range", min: 6, max: 30, value: d.stereoAnimFrameCount || 12, onChange: function(e) { upd('stereoAnimFrameCount', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { htmlFor: "artstudio-anim-speed", className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, "Speed: " + (d.stereoAnimSpeed || 8) + " FPS"),

                      React.createElement("input", { id: "artstudio-anim-speed", type: "range", min: 2, max: 15, value: d.stereoAnimSpeed || 8, onChange: function(e) { upd('stereoAnimSpeed', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    )

                  ),

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-anim-pattern-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.pattern_type_2', "Pattern Type")),

                    React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-anim-pattern-label" },

                      [{ id: 'bw', label: __alloT('stem.artstudio.b_w_2', '\u26AB B&W') }, { id: 'color', label: __alloT('stem.artstudio.color_2', '\uD83C\uDFA8 Color') }, { id: 'noise', label: __alloT('stem.artstudio.noise_2', '\uD83D\uDCFA Noise') }].map(function(s) {

                        return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoPattern || 'bw') === s.id, onClick: function() { upd('stereoPattern', s.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, s.label);

                      })

                    )

                  ),

                  [{ k: 'stereoStrength', label: __alloT('stem.artstudio.depth_strength_2', 'Depth Strength'), min: 5, max: 30, def: 15 },

                   { k: 'stereoDensity', label: __alloT('stem.artstudio.pattern_width_2', 'Pattern Width'), min: 60, max: 150, def: 100 }].map(function(s) {

                    var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                    return React.createElement("div", { key: s.k, className: "mb-2" },

                      React.createElement("label", { htmlFor: 'artstudio-anim-' + s.k, className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, s.label + ': ' + val),

                      React.createElement("input", { id: 'artstudio-anim-' + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function(e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    );

                  }),



                  // ═══ RENDER BUTTON (branches by source) ═══

                  React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.render_animated_stereogram', "Render Animated Stereogram"),

                      onClick: function() {

                        var source = d.stereoAnimSource || 'preset';

                        var nF = d.stereoAnimFrameCount || 12;

                        var pType = d.stereoPattern || 'bw';

                        var pWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                        var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                        var aiPat = d.stereoAiPatternImg || null;



                        // Validation

                        if (source === 'preset' && !d.stereoAnimPreset) { if (typeof addToast === 'function') addToast('Pick an animation preset first!', 'warning'); return; }

                        if (source === 'draw' && (!d.stereoAnimKeyframes || d.stereoAnimKeyframes.length < 2)) { if (typeof addToast === 'function') addToast('Capture at least 2 keyframes!', 'warning'); return; }

                        if (source === 'upload' && !d.stereoAnimUploadedDepth) { if (typeof addToast === 'function') addToast('Upload a depth map image first!', 'warning'); return; }

                        if (source === 'ai' && !d.stereoAnimAiDepth) { if (typeof addToast === 'function') addToast('Generate an AI depth map first!', 'warning'); return; }

                        if (source === 'transform' && !d.stereoStaticDepthSnapshot) {

                          if (typeof addToast === 'function') addToast('Draw a static depth map before using Transform.', 'warning');

                          if (typeof announceToSR === 'function') announceToSR('No static depth map is available. Return to Static mode and draw one first.');

                          return;

                        }



                        _stopStereoAnim();

                        upd('stereoAnimRendering', true);

                        upd('stereoAnimProgress', 0);

                        upd('stereoAnimAiMotionStatus', '');

                        if (typeof announceToSR === 'function') announceToSR('Rendering animated stereogram.');



                        // ═══ AI MOTION (Gemini storyboard + Imagen per-frame) ═══
                        // Only valid when the depth source is AI. Gemini plans a
                        // looped N-frame pose sequence; each pose is rendered as
                        // its own grayscale depth map via Imagen; the existing
                        // stereogram converter then runs frame-by-frame. callImagen
                        // already has exponential backoff + auto-serialization on
                        // 429, so an N-frame batch is rate-limit-safe (it'll slow
                        // down, not fail). Frames cap at 30 via the slider.

                        if (source === 'ai' && (d.stereoAnimTransform === 'ai-motion')) {

                          if (typeof callGemini !== 'function' || typeof callImagen !== 'function') {

                            upd('stereoAnimRendering', false);

                            if (typeof addToast === 'function') addToast('AI Motion needs Gemini + Imagen — switch transforms or check AI setup.', 'error');

                            return;

                          }

                          var motionPrompt = (d.stereoAnimAiPrompt || '').trim();

                          if (!motionPrompt) {

                            upd('stereoAnimRendering', false);

                            if (typeof addToast === 'function') addToast('Need an AI prompt for AI Motion mode.', 'warning');

                            return;

                          }

                          upd('stereoAnimAiMotionStatus', 'Planning pose sequence with Gemini…');

                          upd('stereoAnimProgress', 1);

                          var storyboardPrompt =
                            'You are a storyboard artist planning a looping ' + nF + '-frame stereogram animation.\n\n' +
                            'Subject: "' + motionPrompt + '"\n\n' +
                            'Plan exactly ' + nF + ' frames showing this subject in continuous motion.\n' +
                            'Rules (CRITICAL):\n' +
                            '1. The subject must look IDENTICAL across all frames — same anatomy, proportions, breed/species/style. Repeat the subject phrase verbatim at the start of every pose.\n' +
                            '2. Only pose / limb angles / position change between adjacent frames. No costume changes, no camera moves.\n' +
                            '3. The motion must LOOP smoothly — frame ' + nF + ' should flow naturally back into frame 1.\n' +
                            '4. Use small incremental changes (no huge jumps between adjacent frames).\n' +
                            '5. Always full-body, centered, fills the square frame, looking toward camera unless the motion requires otherwise.\n\n' +
                            'Return ONLY a JSON array of exactly ' + nF + ' strings (one per frame). Each string is a single sentence describing the pose in that frame, in present tense. No object keys, no commentary, no markdown — just the bare JSON array.';

                          // Imagen call wrapped in a promise that resolves with the ImageData-shaped keyframe.

                          var generateFrame = function(idx, pose, fallbackKf) {

                            return new Promise(function(resolve) {

                              var dpPrompt = 'A smooth high-quality grayscale depth map: ' + pose + ' ' +
                                'Closest parts pure white, furthest pure black. No text or artifacts. ' +
                                'Fill the entire square frame. Subject style: ' + motionPrompt + '.';

                              callImagen(dpPrompt, 400).then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  var c = document.createElement('canvas'); c.width = 400; c.height = 400;

                                  c.getContext('2d').drawImage(img, 0, 0, 400, 400);

                                  var imgData = c.getContext('2d').getImageData(0, 0, 400, 400);

                                  resolve({ width: 400, height: 400, data: imgData.data });

                                };

                                img.onerror = function() { resolve(fallbackKf); };

                                img.src = base64;

                              }).catch(function(err) {

                                console.warn('[AI Motion] Imagen failed for frame ' + idx + ':', err && err.message);

                                resolve(fallbackKf);

                              });

                            });

                          };

                          callGemini(storyboardPrompt, true).then(function(rawResponse) {

                            // callGemini returns the raw text body — with jsonMode=true that's a JSON
                            // string we have to parse ourselves. Be defensive: some model responses
                            // wrap the JSON in ```json … ``` fences even when responseMimeType is set.
                            console.log('[AI Motion] Gemini raw response (first 300 chars):', String(rawResponse).slice(0, 300));

                            var poses;

                            try {

                              if (Array.isArray(rawResponse)) {

                                poses = rawResponse; // already parsed (future-proof)

                              } else if (typeof rawResponse === 'string') {

                                var cleaned = rawResponse.trim()

                                  .replace(/^```(?:json)?\s*/i, '')

                                  .replace(/```\s*$/, '')

                                  .trim();

                                poses = JSON.parse(cleaned);

                                // Some responses come back as { "frames": [...] } or { "poses": [...] }
                                if (!Array.isArray(poses) && poses && typeof poses === 'object') {

                                  poses = poses.frames || poses.poses || poses.steps || Object.values(poses).find(function(v){ return Array.isArray(v); });

                                }

                              } else {

                                poses = rawResponse;

                              }

                            } catch (parseErr) {

                              console.warn('[AI Motion] Failed to parse Gemini storyboard JSON. Raw response:', rawResponse);

                              throw new Error('Could not parse Gemini storyboard: ' + parseErr.message);

                            }

                            if (!Array.isArray(poses) || poses.length === 0) {

                              console.warn('[AI Motion] Gemini storyboard not an array. Parsed value:', poses);

                              throw new Error('Gemini returned an empty or malformed storyboard (got ' + (Array.isArray(poses) ? 'empty array' : typeof poses) + ').');

                            }

                            console.log('[AI Motion] Storyboard parsed:', poses.length + ' poses (requested ' + nF + ')');

                            // Normalize to exactly nF entries (pad with last, trim overflow)
                            poses = poses.slice(0, nF);

                            while (poses.length < nF) poses.push(poses[poses.length - 1] || motionPrompt);

                            // Original AI-generated depth map serves as identity anchor for fallbacks
                            var anchorKf = d.stereoAnimAiDepth || null;

                            // Generate sequentially — callImagen auto-serializes anyway on rate limits,
                            // and sequential keeps frame N's "fallback to N-1" logic simple.

                            var keyframes = [];

                            var generateNext = function(i) {

                              if (i >= nF) {

                                // All depth maps generated — hand off to stereogram render
                                upd('stereoAnimAiMotionStatus', 'Rendering stereograms…');

                                upd('stereoAnimProgress', 50);

                                runStereoRender(keyframes);

                                return;

                              }

                              upd('stereoAnimAiMotionStatus', 'Generating depth map ' + (i + 1) + ' of ' + nF + '…');

                              var fallback = keyframes.length > 0 ? keyframes[keyframes.length - 1] : anchorKf;

                              generateFrame(i, String(poses[i] || motionPrompt), fallback).then(function(kf) {

                                keyframes.push(kf || anchorKf);

                                upd('stereoAnimProgress', Math.round((i + 1) / nF * 50));

                                generateNext(i + 1);

                              });

                            };

                            generateNext(0);

                          }).catch(function(err) {

                            console.warn('[AI Motion] Storyboard / pipeline failed:', err);

                            upd('stereoAnimRendering', false);

                            upd('stereoAnimAiMotionStatus', '');

                            upd('stereoAnimProgress', 0);

                            if (typeof addToast === 'function') addToast('AI Motion failed: ' + (err && err.message ? err.message : 'unknown'), 'error');

                          });

                          // Stereogram render once depth-map keyframes are ready.

                          function runStereoRender(kfs) {

                            var W = 512, H = 512, dmW = 400, dmH = 400;

                            var renderedFrames = []; var fi2 = 0;

                            function step() {

                              if (fi2 >= nF) {

                                _stereoAnimRef.frames = renderedFrames;

                                upd('stereoAnimRendering', false);

                                upd('stereoAnimAiMotionStatus', '');

                                upd('stereoAnimProgress', 100);

                                upd('stereoAnimHasFrames', true);

                                if (typeof addToast === 'function') addToast('🎭 AI Motion: ' + renderedFrames.length + ' frames rendered!', 'success');

                                if (typeof announceToSR === 'function') announceToSR('AI motion animation rendered.');

                                if (reducedMotion) upd('stereoAnimPlaying', false);

                                else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd); }

                                return;

                              }

                              var kf = kfs[fi2];

                              if (!kf || !kf.data) { fi2++; requestAnimationFrame(step); return; }

                              // Normalize the keyframe's data buffer to a Uint8ClampedArray for _sirdsRenderSync.

                              var depthArr;

                              if (kf.data instanceof Uint8ClampedArray) {

                                depthArr = kf.data;

                              } else {

                                var tc = document.createElement('canvas'); tc.width = kf.width; tc.height = kf.height;

                                var tctx = tc.getContext('2d');

                                var tid = tctx.createImageData(kf.width, kf.height);

                                for (var ti = 0; ti < kf.data.length; ti++) tid.data[ti] = kf.data[ti];

                                tctx.putImageData(tid, 0, 0);

                                depthArr = tctx.getImageData(0, 0, kf.width, kf.height).data;

                              }

                              var f = _sirdsRenderSync(W, H, depthArr, dmW, dmH, pType, pWidth, maxShift, aiPat);

                              renderedFrames.push(f);

                              fi2++;

                              upd('stereoAnimProgress', 50 + Math.round(fi2 / nF * 50));

                              requestAnimationFrame(step);

                            }

                            requestAnimationFrame(step);

                          }

                          return; // skip the normal render flow below

                        }



                        if (source === 'preset') {

                          // Existing preset rendering

                          _renderAnimFrames(nF, d.stereoAnimPreset, pType, pWidth, maxShift, aiPat,

                            function(done, total) { upd('stereoAnimProgress', Math.round(done/total*100)); },

                            function(frames) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              if (typeof announceToSR === 'function') announceToSR('Animation rendered.');

                              if (reducedMotion) upd('stereoAnimPlaying', false);

                              else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd); }

                            }

                          );

                        } else {

                          // Custom source rendering

                          var W = 512, H = 512, dmW = 400, dmH = 400;

                          var frames = []; var fi = 0;



                          function getDepthForFrame(frameIdx) {

                            if (source === 'draw') {

                              // Interpolate between keyframes

                              var kfs = d.stereoAnimKeyframes;

                              var maps = kfs.map(function(kf) {

                                var c2 = document.createElement('canvas'); c2.width = kf.width; c2.height = kf.height;

                                var ctx2 = c2.getContext('2d');

                                var id2 = ctx2.createImageData(kf.width, kf.height);

                                for (var j = 0; j < kf.data.length; j++) id2.data[j] = kf.data[j];

                                ctx2.putImageData(id2, 0, 0);

                                return ctx2.getImageData(0, 0, kf.width, kf.height);

                              });

                              return _interpolateDepthMaps(maps, frameIdx, nF);

                            } else {

                              // Upload, Transform, AI — use _genTransformDepth

                              var srcData;

                              if (source === 'upload') {

                                srcData = d.stereoAnimUploadedDepth;

                              } else if (source === 'ai') {

                                srcData = d.stereoAnimAiDepth;

                              } else {

                                // transform - use the snapshot captured before the static canvas unmounted

                                srcData = d.stereoStaticDepthSnapshot || null;

                                if (!srcData) {

                                  var dmc = document.getElementById('depthMapCanvas');

                                  if (dmc) srcData = dmc.getContext('2d').getImageData(0, 0, dmc.width, dmc.height);

                                }

                                if (!srcData) {

                                  var fc = document.createElement('canvas'); fc.width = dmW; fc.height = dmH;

                                  var fctx = fc.getContext('2d'); fctx.fillStyle = '#000'; fctx.fillRect(0, 0, dmW, dmH);

                                  srcData = fctx.getImageData(0, 0, dmW, dmH);

                                }

                              }

                              var srcImg;

                              if (srcData.data instanceof Uint8ClampedArray) {

                                srcImg = srcData;

                              } else {

                                // Convert from Array to ImageData

                                var tc = document.createElement('canvas'); tc.width = srcData.width; tc.height = srcData.height;

                                var tctx = tc.getContext('2d');

                                var tid = tctx.createImageData(srcData.width, srcData.height);

                                for (var ti = 0; ti < srcData.data.length; ti++) tid.data[ti] = srcData.data[ti];

                                tctx.putImageData(tid, 0, 0);

                                srcImg = tctx.getImageData(0, 0, srcData.width, srcData.height);

                              }

                              return _genTransformDepth(srcImg, dmW, dmH, d.stereoAnimTransform || 'zoom', frameIdx, nF);

                            }

                          }



                          function renderStep() {

                            if (fi >= nF) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              if (typeof announceToSR === 'function') announceToSR('Animation rendered.');

                              if (reducedMotion) upd('stereoAnimPlaying', false);

                              else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd); }

                              return;

                            }

                            var depthData = getDepthForFrame(fi);

                            var f = _sirdsRenderSync(W, H, depthData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                            frames.push(f);

                            fi++;

                            upd('stereoAnimProgress', Math.round(fi / nF * 100));

                            requestAnimationFrame(renderStep);

                          }

                          requestAnimationFrame(renderStep);

                        }

                      },

                      disabled: !!d.stereoAnimRendering,

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:from-purple-800 hover:to-indigo-800 disabled:opacity-50 shadow-md transition-all"

                    }, d.stereoAnimRendering ? (d.stereoAnimAiMotionStatus ? ('\u23F3 ' + d.stereoAnimAiMotionStatus + ' ' + (d.stereoAnimProgress || 0) + '%') : ('\u23F3 Rendering... ' + (d.stereoAnimProgress || 0) + '%')) : '\uD83C\uDFAC Render Animation'),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.reset_stereogram_animation', "Reset stereogram animation"),

                      onClick: function() {

                        _stopStereoAnim();

                        _stereoAnimRef.frames = [];

                        // Also clear the output canvas and repaint the placeholder
                        // banner. Without this the last rendered frame stays painted
                        // forever (the canvas init ref only fires once via
                        // canvas._animInit, so it never re-blanks on later resets).
                        try {

                          var rc = document.getElementById('stereoAnimCanvas');

                          if (rc) {

                            var rctx = rc.getContext('2d');

                            rctx.fillStyle = '#1a1a2e'; rctx.fillRect(0, 0, rc.width, rc.height);

                            rctx.fillStyle = '#888'; rctx.font = '14px sans-serif'; rctx.textAlign = 'center';

                            rctx.fillText('Pick a source and click Render Animation', rc.width / 2, rc.height / 2);

                          }

                        } catch (_) {}

                        upd('stereoAnimHasFrames', false);

                        upd('stereoAnimPlaying', false);

                        upd('stereoAnimProgress', 0);

                        upd('stereoAnimAiMotionStatus', '');

                        if (typeof announceToSR === 'function') announceToSR('Stereogram animation reset.');

                      },

                      className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"

                    }, __alloT('stem.artstudio.reset_2', "\u23F9 Reset"))

                  ),

                  React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" },

                    d.stereoAnimRendering ? (d.stereoAnimAiMotionStatus || "Rendering animation.") :

                      (d.stereoAnimHasFrames ? (d.stereoAnimPlaying ? "Animation playing." : "Animation ready and paused.") : "")

                  ),

                  d.stereoAnimRendering && React.createElement("div", {

                    role: "progressbar",

                    "aria-label": "Animation rendering progress",

                    "aria-valuemin": 0,

                    "aria-valuemax": 100,

                    "aria-valuenow": d.stereoAnimProgress || 0,

                    "aria-valuetext": (d.stereoAnimAiMotionStatus || "Rendering animation") + " " + (d.stereoAnimProgress || 0) + " percent",

                    className: "mt-2 h-2 bg-purple-100 rounded-full overflow-hidden"

                  },

                    React.createElement("div", { style: { width: (d.stereoAnimProgress || 0) + '%', transition: reducedMotion ? 'none' : 'width 0.3s' }, className: "h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" })

                  )

                ),



                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-purple-200 shadow-sm" },

                  React.createElement("div", { className: "flex justify-between items-center mb-2" },

                    React.createElement("p", { className: "text-xs font-bold text-purple-700" }, __alloT('stem.artstudio.animated_stereogram_output', "\uD83D\uDC53 Animated Stereogram Output")),

                    d.stereoAnimHasFrames && React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] font-bold px-2 py-0.5 rounded-full " + (d.stereoAnimPlaying ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600') }, d.stereoAnimPlaying ? '\u25B6 Playing' : '\u23F8 Paused')

                  ),

                  React.createElement("p", { id: "artstudio-animated-stereogram-help", className: "text-[11px] text-slate-600 mb-2" }, __alloT('stem.artstudio.relax_your_eyes_and_look_through_the_a', "Relax your eyes and look \u2018through\u2019 the animation to see 3D shapes move")),

                  React.createElement("canvas", { id: 'stereoAnimCanvas', width: 512, height: 512,
                    role: "img",
                    "aria-label": "Animated stereogram output with " + ((_stereoAnimRef.frames && _stereoAnimRef.frames.length) || 0) + " rendered frames; " + (d.stereoAnimPlaying ? "playing" : "paused") + ".",
                    "aria-describedby": "artstudio-animated-stereogram-help",

                    className: "rounded-xl border-2 border-purple-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function(canvas) {

                      if (!canvas) return;

                      if (canvas._animInit) return;

                      canvas._animInit = true;

                      var ctx = canvas.getContext('2d');

                      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 512, 512);

                      ctx.fillStyle = '#cbd5e1'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                      ctx.fillText('Pick a source and click Render Animation', 256, 256);

                    }

                  }),

                  d.stereoAnimHasFrames && React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", { "aria-label": d.stereoAnimPlaying ? "Pause animated stereogram" : "Play animated stereogram", "aria-pressed": !!d.stereoAnimPlaying,

                      onClick: function() {

                        if (d.stereoAnimPlaying) {

                          _stopStereoAnim(); upd('stereoAnimPlaying', false);

                          if (typeof announceToSR === 'function') announceToSR('Animated stereogram paused.');

                        } else {

                          _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd); upd('stereoAnimPlaying', true);

                          if (typeof announceToSR === 'function') announceToSR('Animated stereogram playing.');

                        }

                      },

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.stereoAnimPlaying ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:from-green-800 hover:to-emerald-800 shadow-md')

                    }, d.stereoAnimPlaying ? '\u23F8 Pause' : '\u25B6 Play'),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_gif', "Export GIF"),

                      onClick: function() {

                        _stopStereoAnim();

                        upd('stereoAnimPlaying', false);

                        _exportStereoGif(_stereoAnimRef.frames, d.stereoAnimSpeed || 8);

                      },

                      className: "transition-colors flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100"

                    }, __alloT('stem.artstudio.export_gif_2', "\uD83D\uDCE5 Export GIF"))

                  ),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-3" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, __alloT('stem.artstudio.tips_for_animated_stereograms', "\uD83D\uDCA1 Tips for Animated Stereograms")),

                    React.createElement("ul", { className: "text-[11px] text-slate-600 leading-relaxed list-disc ml-4 space-y-0.5" },

                      React.createElement("li", null, __alloT('stem.artstudio.lock_your_eyes_into_the_3d_view_before', "Lock your eyes into the 3D view before clicking Play")),

                      React.createElement("li", null, __alloT('stem.artstudio.slower_speeds_4_6_fps_are_easier_to_ma', "Slower speeds (4\u20136 FPS) are easier to maintain focus")),

                      React.createElement("li", null, __alloT('stem.artstudio.pulse_and_heart_presets_are_the_easies', "Pulse and Heart presets are the easiest to see in motion")),

                      React.createElement("li", null, __alloT('stem.artstudio.the_exported_gif_can_be_printed_frame_', "The exported GIF can be printed frame-by-frame as a flipbook!"))

                    )

                  )

                )

              ),

            React.createElement("button", { "aria-label": __alloT('stem.artstudio.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'art-' + Date.now(), tool: 'artStudio', label: __alloT('stem.artstudio.art_studio', 'Art Studio'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Art snapshot saved!', 'success'); }, className: "mt-4 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 rounded-full hover:from-pink-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all" }, __alloT('stem.artstudio.snapshot_2', "\uD83D\uDCF8 Snapshot"))

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_artstudio.js loaded \u2014 1 tool (artStudio)');
})();
