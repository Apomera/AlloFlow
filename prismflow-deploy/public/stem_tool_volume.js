// ═══════════════════════════════════════════
// stem_tool_volume.js — 3D Volume Explorer Plugin (Enhanced v4)
//
// ARCHITECTURE NOTES (for contributors)
// ─────────────────────────────────────
// Rendering: pure CSS 3D transforms (translate3d + rotateX/Y, preserve-3d,
//   perspective). No Three.js, no WebGL, no canvas. Trade-off: zero deps and
//   works in any browser, but perf ceiling ~50-60 visible cubes on low-end
//   Chromebooks. For VR or higher fidelity see ARCHITECTURE.md (TODO).
//
// Coordinate system (cube positions stored as "x-y-z" strings in `positions`):
//   x = column (left/right), runs 0..L-1 in slider mode, 0..7 in freeform
//   y = row (depth into screen), runs 0..W-1
//   z = layer (height), runs 0..H-1. Origin (0,0,0) is the front-left-bottom
//   corner. World transform negates z to render up (screen coords are y-down).
//
// Modes: 'slider' (parametric prism), 'freeform' (build cube-by-cube),
//   'word' (slider with story context). 'word' is a slider variant for layout.
//
// Pointer interaction: a unified pointer handler (handlePointerDown) covers
//   mouse + touch + pen via the Pointer Events API; pinch-to-zoom uses two
//   tracked pointers. Listeners are scoped to the viewport element to avoid
//   global window-listener leaks. Keyboard rotation via arrow keys works on
//   the viewport when focused. See VIEWPORT INTERACTION section below.
//
// State: lives in ctx.toolData._volume. Persists across tab switches inside
//   AlloFlow. Save/load uses ctx.toolData._volume.saved (named map). Undo
//   uses ctx.toolData._volume.undoStack (capped at 30 entries).
//
// Accessibility: aria-live region #allo-live-volume for SR announcements.
//   Volume/SA changes call announceToSR. Reduced-motion CSS respects user
//   preference. Keyboard interaction is full-featured (S/F/W modes, arrows
//   rotate, +/- zoom, ?/Shift+? AI, B badges, P paint, U undo, R reset view).
//
// Shapes: Rectangular prism (default) is the only true 3D-cube shape. Cylinder,
//   cone, and pyramid renderers approximate the shape with cubes for volume
//   counting; analytic volume/SA formulas displayed alongside. See SHAPES below.
//
// Contributors: see CONTRIBUTING.md at repo root. Run `node --check` on this
//   file after edits. e2e test: tests/e2e/volume-tool.spec.ts.
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
    if (document.getElementById('allo-live-volume')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-volume';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Volume v3: atmospheric backgrounds + cube-place pulse animation
  (function() {
    if (document.getElementById('allo-volume-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-volume-v3-css';
    st.textContent = [
      '@keyframes allo-vol-cube-in { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }',
      '.allo-vol-bg-slider   { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(5,150,105,0.10) 0%, rgba(5,150,105,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-vol-bg-freeform { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(79,70,229,0.10) 0%, rgba(79,70,229,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-vol-bg-word     { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-vol-cube { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }
  function playSound(type) {
    if (window._volumeMuted) return;  // sync flag set by tool when muted state changes
    try {
      var ac = getAudioCtx();
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      g.gain.value = 0.12;
      switch (type) {
        case 'correct':
          o.frequency.value = 523; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.25);
          o.start(); o.stop(ac.currentTime + 0.25);
          var o2 = ac.createOscillator(); var g2 = ac.createGain();
          o2.connect(g2); g2.connect(ac.destination);
          o2.frequency.value = 659; o2.type = 'sine';
          g2.gain.setValueAtTime(0.1, ac.currentTime + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o2.start(ac.currentTime + 0.1); o2.stop(ac.currentTime + 0.35);
          break;
        case 'wrong':
          o.frequency.value = 200; o.type = 'sawtooth';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
          o.start(); o.stop(ac.currentTime + 0.3);
          break;
        case 'place':
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.06, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.08);
          o.start(); o.stop(ac.currentTime + 0.08);
          break;
        case 'remove':
          o.frequency.value = 330; o.type = 'triangle';
          g.gain.setValueAtTime(0.06, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.1);
          o.start(); o.stop(ac.currentTime + 0.1);
          break;
        case 'badge':
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.12, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
          [554, 659, 880].forEach(function(f, i) {
            var ox = ac.createOscillator(); var gx = ac.createGain();
            ox.connect(gx); gx.connect(ac.destination);
            ox.frequency.value = f; ox.type = 'sine';
            var t0 = ac.currentTime + 0.1 * (i + 1);
            gx.gain.setValueAtTime(0.1, t0);
            gx.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
            ox.start(t0); ox.stop(t0 + 0.15);
          });
          break;
        case 'streak':
          o.frequency.value = 587; o.type = 'triangle';
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
          o.start(); o.stop(ac.currentTime + 0.15);
          var o3 = ac.createOscillator(); var g3 = ac.createGain();
          o3.connect(g3); g3.connect(ac.destination);
          o3.frequency.value = 784; o3.type = 'triangle';
          g3.gain.setValueAtTime(0.1, ac.currentTime + 0.12);
          g3.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.35);
          o3.start(ac.currentTime + 0.12); o3.stop(ac.currentTime + 0.35);
          break;
        default:
          o.frequency.value = 440; o.type = 'sine';
          g.gain.setValueAtTime(0.08, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.12);
          o.start(); o.stop(ac.currentTime + 0.12);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Word problem contexts (real-world volume scenarios) ──
  // Each context describes a rectangular-prism object with a relatable use case.
  // Variables {l} {w} {h} get substituted with the current factors.
  var WORD_CONTEXTS = [
    { id: 'lunchbox',  label: 'Lunchbox',  icon: '🍱', story: 'A lunchbox is {l} units long, {w} units wide, and {h} units tall. How many unit cubes of food can fit inside?', unit: 'sandwich cubes', defaults: { l: 4, w: 3, h: 2 } },
    { id: 'aquarium',  label: 'Fish tank', icon: '🐠', story: 'An aquarium is {l} units long, {w} units wide, and {h} units tall. How many unit cubes of water does it hold?', unit: 'cubes of water', defaults: { l: 5, w: 3, h: 4 } },
    { id: 'shipping',  label: 'Shipping box', icon: '📦', story: 'A shipping box measures {l}×{w}×{h} units. How many unit cubes of packing material will it hold?', unit: 'cubic units', defaults: { l: 4, w: 4, h: 3 } },
    { id: 'pool',      label: 'Swimming pool', icon: '🏊', story: 'A small pool is {l} units long, {w} units wide, and {h} units deep. How many unit cubes of water?', unit: 'cubic units', defaults: { l: 8, w: 4, h: 2 } },
    { id: 'room',      label: 'Bedroom',   icon: '🛏', story: 'A bedroom is {l} units long, {w} units wide, with a ceiling {h} units high. How many unit cubes of air fill the room?', unit: 'cubic units', defaults: { l: 6, w: 5, h: 3 } },
    { id: 'closet',    label: 'Closet',    icon: '🚪', story: 'A closet is {l} units wide, {w} units deep, and {h} units tall. How many unit cubes of storage?', unit: 'cubic units', defaults: { l: 3, w: 2, h: 4 } },
    { id: 'sandbox',   label: 'Sandbox',   icon: '🏖', story: 'A sandbox is {l} units long, {w} units wide, and {h} units deep. How many unit cubes of sand fill it?', unit: 'cubes of sand', defaults: { l: 5, w: 4, h: 1 } },
    { id: 'truck',     label: 'Truck bed', icon: '🚚', story: 'A truck bed is {l} units long, {w} units wide, and {h} units tall. How many unit-cube boxes can it carry?', unit: 'boxes', defaults: { l: 6, w: 3, h: 2 } }
  ];

  // ── Badge definitions ──
  var BADGES = [
    { id: 'firstVolume',     icon: '\u2B50',       label: 'First Volume',      desc: 'Calculate your first volume correctly' },
    { id: 'prismBuilder',    icon: '\uD83C\uDFD7\uFE0F', label: 'Prism Builder', desc: 'Build a prism correctly in freeform' },
    { id: 'lBlockSolver',    icon: '\uD83D\uDCD0', label: 'L-Block Solver',    desc: 'Solve an L-block volume problem' },
    { id: 'streak5',         icon: '\uD83D\uDD25', label: 'On Fire',           desc: '5 correct in a row' },
    { id: 'streak10',        icon: '\u26A1',       label: 'Unstoppable',       desc: '10 correct in a row' },
    { id: 'bigBuilder',      icon: '\uD83C\uDFE0', label: 'Big Builder',      desc: 'Build a shape with 20+ cubes' },
    { id: 'surfaceExplorer', icon: '\uD83C\uDFA8', label: 'Surface Explorer',  desc: 'Use paint surface area mode' },
    { id: 'layerMaster',     icon: '\uD83C\uDF82', label: 'Layer Master',      desc: 'Explore layers with the slider' },
    { id: 'dimensionKing',   icon: '\uD83D\uDC51', label: 'Dimension King',    desc: 'Set all sliders to maximum (10)' },
    { id: 'centurion',       icon: '\uD83C\uDFC5', label: 'Centurion',         desc: '100 total cubes placed in freeform' },
    { id: 'wordWizard',      icon: '\uD83D\uDCDD', label: 'Word Wizard',       desc: 'Solve 5 word problems correctly' },
    { id: 'realWorldExpl',   icon: '\uD83C\uDF0D', label: 'Real-World Expl',   desc: 'Try all 8 word problem contexts' },
    { id: 'netArchitect',    icon: '\uD83D\uDDFA', label: 'Net Architect',    desc: 'Unfold a prism into its net' },
    { id: 'shapeEfficient',  icon: '\u2696\uFE0F', label: 'Shape Efficient',  desc: 'Discover same-volume comparison (square-cube law)' }
  ];

  window.StemLab.registerTool('volume', {
    icon: '\uD83D\uDCE6', label: '3D Volume Explorer',
    desc: '3D cube building with volume, surface area, badges & AI tutor.',
    color: 'emerald', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var t = ctx.t;
      var callGemini = ctx.callGemini;

      // ── State via toolData ──
      var ld = ctx.toolData || {};
      var _v = ld._volume || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var vol = Object.assign({}, (prev && prev._volume) || {}, obj);
            return Object.assign({}, prev, { _volume: vol });
          });
        }
      };

      var dims = _v.dims || { l: 3, w: 2, h: 2 };
      var mode = _v.mode || 'slider';
      var rotation = _v.rotation || { x: -25, y: -35 };
      var scale = _v.scale || 1.0;
      var showLayers = _v.showLayers != null ? _v.showLayers : null;
      var challenge = _v.challenge || null;
      var answer = _v.answer || '';
      var feedback = _v.feedback || null;
      var positions = _v.positions || [];
      var posSet = new Set(positions);
      var builderChallenge = _v.builderChallenge || null;
      var builderFeedback = _v.builderFeedback || null;
      var score = _v.score || { correct: 0, total: 0 };
      var paintSurfaceArea = _v.paintSurfaceArea || false;

      // Extended state for badges & AI
      var badges = _v.badges || {};
      var streak = _v.streak || 0;
      var totalPlaced = _v.totalPlaced || 0;
      var showBadges = _v.showBadges || false;
      var showAI = _v.showAI || false;
      var aiResponse = _v.aiResponse || '';
      var aiLoading = _v.aiLoading || false;
      var layerUsed = _v.layerUsed || false;

      // v3 additions
      var muted = _v.muted || false;
      window._volumeMuted = muted;                  // synced flag read by playSound
      var wpCtxIdx = _v.wpCtxIdx != null ? _v.wpCtxIdx : 0;
      var wpDims = _v.wpDims || WORD_CONTEXTS[0].defaults;
      var wpAnswer = _v.wpAnswer || '';
      var wpFeedback = _v.wpFeedback || null;
      var wpSolved = _v.wpSolved || 0;
      var wpExplored = _v.wpExplored || {};
      var showNet = _v.showNet || false;          // unfolded-net view (slider + word modes)
      var showCompare = _v.showCompare || false;  // square-cube-law comparison panel

      // v4 additions ─────────────────────────────────────────────
      // Undo stack: capped at 30 entries to prevent unbounded state growth.
      // Each entry is the previous freeform `positions` array, snapshotted
      // before any place/remove/clear operation.
      var undoStack = _v.undoStack || [];
      var pushUndo = function() {
        if (!isFreeform) return;
        var snap = positions.slice();
        var next = undoStack.concat([snap]);
        if (next.length > 30) next = next.slice(next.length - 30);
        upd({ undoStack: next });
      };
      var doUndo = function() {
        if (!undoStack.length) return;
        var prev = undoStack[undoStack.length - 1];
        var next = undoStack.slice(0, -1);
        upd({ positions: prev, undoStack: next });
        playSound('remove');
        announceToSR('Undo. ' + prev.length + ' cubes.');
      };

      // Saved constructions: map of {name -> {positions, dims, mode, createdAt}}.
      // Lets students save "my house" and reload it later. Persists across sessions.
      var saved = _v.saved || {};
      var showSaved = _v.showSaved || false;
      var saveCurrent = function(name) {
        if (!name) return;
        var trimmed = String(name).trim().slice(0, 40);
        if (!trimmed) return;
        var next = Object.assign({}, saved);
        next[trimmed] = {
          positions: positions.slice(),
          dims: Object.assign({}, dims),
          mode: mode,
          createdAt: Date.now()
        };
        upd({ saved: next });
        addToast('💾 Saved "' + trimmed + '"', 'success');
        announceToSR('Saved as ' + trimmed);
      };
      var loadSaved = function(name) {
        var entry = saved[name];
        if (!entry) return;
        upd({
          positions: entry.positions || [],
          dims: entry.dims || dims,
          mode: entry.mode || mode,
          undoStack: undoStack.concat([positions.slice()]),
          challenge: null, feedback: null,
          builderChallenge: null, builderFeedback: null
        });
        playSound('place');
        announceToSR('Loaded ' + name);
      };
      var deleteSaved = function(name) {
        var next = Object.assign({}, saved);
        delete next[name];
        upd({ saved: next });
      };

      // Real-world unit mapping: lets students see "8 cubic feet" instead of
      // just "8 cubic units." Each unit has a label and a conversion to liters
      // (a universal volume reference) for cross-unit comparison.
      var REAL_UNITS = [
        { id: 'unit', short: 'unit', long: 'cubic unit',     toL: 1,         desc: 'Abstract units (default)' },
        { id: 'cm',   short: 'cm³',  long: 'cubic cm',       toL: 0.001,     desc: 'Centimeters (small objects)' },
        { id: 'in',   short: 'in³',  long: 'cubic inch',     toL: 0.01639,   desc: 'Inches (US customary)' },
        { id: 'ft',   short: 'ft³',  long: 'cubic foot',     toL: 28.3168,   desc: 'Feet (rooms, furniture)' },
        { id: 'm',    short: 'm³',   long: 'cubic meter',    toL: 1000,      desc: 'Meters (cars, pools)' }
      ];
      var unitId = _v.unitId || 'unit';
      var unit = REAL_UNITS.find(function(u) { return u.id === unitId; }) || REAL_UNITS[0];
      var formatVolumeWithUnit = function(v) {
        var rounded = Math.round(v * 100) / 100;
        if (unit.id === 'unit') return rounded + ' ' + unit.long + (v !== 1 ? 's' : '');
        var liters = v * unit.toL;
        var litersStr = liters >= 100 ? Math.round(liters) : (liters >= 1 ? liters.toFixed(1) : liters.toFixed(3));
        return rounded + ' ' + unit.short + ' (≈ ' + litersStr + ' L)';
      };

      // Fractional-dimension toggle (slider mode only). When on, sliders step
      // by 0.5 instead of 1. Volume formula handles non-integers fine; cube
      // rendering rounds up so visual is an approximation when fractional.
      var allowFractional = _v.allowFractional || false;

      // ── SHAPES ─────────────────────────────────────────────────
      // Beyond rectangular prism: cylinder, cone, square pyramid.
      // Cube-approximation is used for visual rendering; analytic formula is
      // displayed alongside so students see both "the math says" and "the
      // visual is approximate." Voxelized shapes use the same dims (l, w as
      // diameter dims; h as height for cylinder/cone).
      var shape = _v.shape || 'prism'; // 'prism' | 'cylinder' | 'cone' | 'pyramid'
      var showCrossSection = _v.showCrossSection || false;
      var crossSectionLayer = _v.crossSectionLayer != null ? _v.crossSectionLayer : Math.floor(dims.h / 2);
      var showShapeMenu = _v.showShapeMenu || false;

      function voxelizeShape(s, l, w, h) {
        var out = [];
        var rx = (l - 1) / 2, ry = (w - 1) / 2;
        for (var z = 0; z < Math.ceil(h); z++) {
          for (var y = 0; y < Math.ceil(w); y++) {
            for (var x = 0; x < Math.ceil(l); x++) {
              var fillThisCube = false;
              if (s === 'prism') {
                fillThisCube = true;
              } else if (s === 'cylinder') {
                var ndx = (x - rx) / rx, ndy = (y - ry) / ry;
                fillThisCube = (ndx * ndx + ndy * ndy) <= 1.05;
              } else if (s === 'cone') {
                var taper = 1 - (z / Math.max(1, h - 1));
                if (taper <= 0) taper = 0.05;
                var ndx2 = (x - rx) / (rx * taper);
                var ndy2 = (y - ry) / (ry * taper);
                fillThisCube = (ndx2 * ndx2 + ndy2 * ndy2) <= 1.05;
              } else if (s === 'pyramid') {
                var taper2 = 1 - (z / Math.max(1, h - 1));
                if (taper2 <= 0) taper2 = 0.05;
                fillThisCube = (Math.abs(x - rx) <= rx * taper2 + 0.5) && (Math.abs(y - ry) <= ry * taper2 + 0.5);
              }
              if (fillThisCube) out.push({ x: x, y: y, z: z });
            }
          }
        }
        return out;
      }

      function analyticVolume(s, l, w, h) {
        if (s === 'prism')    return l * w * h;
        if (s === 'cylinder') return Math.PI * (l / 2) * (w / 2) * h;          // π·rx·ry·h
        if (s === 'cone')     return (1 / 3) * Math.PI * (l / 2) * (w / 2) * h;
        if (s === 'pyramid')  return (1 / 3) * l * w * h;
        return l * w * h;
      }
      function analyticSurfaceArea(s, l, w, h) {
        if (s === 'prism')    return 2 * (l * w + l * h + w * h);
        if (s === 'cylinder') {
          var r = (l + w) / 4; // average radius from elliptical dims
          return 2 * Math.PI * r * r + 2 * Math.PI * r * h;
        }
        if (s === 'cone') {
          var rc = (l + w) / 4;
          return Math.PI * rc * rc + Math.PI * rc * Math.sqrt(rc * rc + h * h);
        }
        if (s === 'pyramid') {
          // base + 4 triangular faces. The two faces with base l use slant √(h²+(w/2)²); the two with
          // base w use √(h²+(l/2)²). Lateral = 2·(½·l·slantW) + 2·(½·w·slantL) = l·slantW + w·slantL.
          // (The old form used one slant × the full base perimeter, ~doubling the lateral area.)
          var base = l * w;
          var slantW = Math.sqrt(h * h + (w / 2) * (w / 2));
          var slantL = Math.sqrt(h * h + (l / 2) * (l / 2));
          return base + l * slantW + w * slantL;
        }
        return 2 * (l * w + l * h + w * h);
      }
      var SHAPES_META = [
        { id: 'prism',    icon: '📦', label: 'Rectangular prism', formula: 'V = l × w × h' },
        { id: 'cylinder', icon: '🥫', label: 'Cylinder',          formula: 'V = π·r²·h' },
        { id: 'cone',     icon: '🍦', label: 'Cone',              formula: 'V = ⅓·π·r²·h' },
        { id: 'pyramid',  icon: '🔺', label: 'Square pyramid',    formula: 'V = ⅓·l·w·h' }
      ];

      // ── Badge checker ──
      function checkBadges(updates) {
        var changed = {};
        var newBadges = Object.assign({}, badges);
        Object.keys(updates).forEach(function(key) {
          if (updates[key] && !newBadges[key]) {
            changed[key] = true;
            newBadges[key] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          upd({ badges: newBadges });
          Object.keys(changed).forEach(function(bid) {
            var badge = BADGES.find(function(b) { return b.id === bid; });
            if (badge) {
              playSound('badge');
              addToast(badge.icon + ' Badge: ' + badge.label + '!', 'success');
              if (typeof awardStemXP === 'function') awardStemXP('volume', 15, 'badge');
            }
          });
        }
      }

      // ── Helper functions ──
      var getSA = function(ps) {
        var area = 0;
        var dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
        var s = ps instanceof Set ? ps : new Set(ps);
        s.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          dirs.forEach(function(d) {
            if (!s.has((p[0]+d[0])+'-'+(p[1]+d[1])+'-'+(p[2]+d[2]))) area++;
          });
        });
        return area;
      };

      // Treat word mode as a slider variant (same 3D prism viewport)
      var isWord = mode === 'word';
      var isSlider = mode === 'slider' || isWord;
      var isFreeform = mode === 'freeform';
      var volume = isSlider ? dims.l * dims.w * dims.h : posSet.size;
      var surfaceArea = isSlider
        ? 2 * (dims.l * dims.w + dims.l * dims.h + dims.w * dims.h)
        : getSA(posSet);
      var cubeUnit = isSlider
        ? Math.max(18, Math.min(36, 240 / Math.max(dims.l, dims.w, dims.h)))
        : 30;

      // ── 3D Cube rendering ──
      var renderCube = function(x, y, z, hue, lt, unit, clickable, onClick, isGhost) {
        var isPaint = paintSurfaceArea && !isGhost;
        var actHue = isPaint ? 25 : hue;
        var sat = isPaint ? 90 : 70;
        var op1 = isPaint ? 0.95 : 0.85;
        var op2 = isPaint ? 0.90 : 0.70;
        var op3 = isPaint ? 0.92 : 0.80;

        var faces = [
          { transform: 'translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+actHue+','+sat+'%,'+lt+'%,'+op1+')' },
          { transform: 'rotateY(180deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+actHue+','+(sat-5)+'%,'+(lt+5)+'%,'+op2+')' },
          { transform: 'rotateY(-90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+10)+','+(sat-10)+'%,'+(lt-5)+'%,'+op3+')' },
          { transform: 'rotateY(90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+10)+','+(sat-10)+'%,'+(lt+3)+'%,'+op3+')' },
          { transform: 'rotateX(90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue-5)+','+(sat+5)+'%,'+(lt+8)+'%,'+Math.min(1, op1+0.05)+')' },
          { transform: 'rotateX(-90deg) translateZ(' + unit/2 + 'px)', bg: isGhost ? 'hsla(210,100%,70%,0.1)' : 'hsla('+(actHue+5)+','+(sat-15)+'%,'+(lt-8)+'%,'+(isPaint?0.8:0.6)+')' }
        ];
        var borderStyle = isGhost ? '1px dashed hsla(210,100%,50%,0.6)' : (isPaint ? '1px solid hsla(25,100%,20%,0.5)' : '1px solid hsla('+actHue+',80%,30%,0.4)');

        return h('div', { 
          key: isGhost ? ('ghost-'+x+'-'+y+'-'+z) : (x+'-'+y+'-'+z),
          onClick: clickable ? function(e) { e.stopPropagation(); onClick && onClick(); } : undefined,
          style: {
            position: 'absolute', width: unit+'px', height: unit+'px',
            transform: 'translate3d('+x*unit+'px,'+-z*unit+'px,'+y*unit+'px)',
            transformStyle: 'preserve-3d',
            cursor: clickable ? 'pointer' : 'default',
            pointerEvents: isGhost ? 'none' : 'auto'
          }
        }, faces.map(function(f, i) {
          return h('div', { key: i, style: {
            position: 'absolute', width: '100%', height: i >= 4 ? unit+'px' : '100%',
            transform: f.transform, background: f.bg,
            border: borderStyle, boxSizing: 'border-box'
          }});
        }));
      };

      // Build cube grid
      var cubes = [];
      if (isSlider) {
        var maxLayer = showLayers != null ? Math.min(showLayers, dims.h) : dims.h;
        // Voxelize the active shape. For 'prism' this is equivalent to the
        // simple triple-loop; for cylinder/cone/pyramid it tapers.
        var voxels = voxelizeShape(shape, dims.l, dims.w, dims.h);
        voxels.forEach(function(vox) {
          if (vox.z >= maxLayer) return;
          // Cross-section: when showCrossSection is on, dim/cut cubes at the
          // chosen layer so the interior is visible.
          var isCutLayer = showCrossSection && vox.z === Math.min(crossSectionLayer, dims.h - 1);
          var isAboveCut = showCrossSection && vox.z > Math.min(crossSectionLayer, dims.h - 1);
          if (isAboveCut) return; // hide cubes above cut plane
          var hue = isCutLayer ? 20 : 140 + vox.z * 12;
          var lt = isCutLayer ? 65 : 55 + vox.z * 4;
          cubes.push(renderCube(vox.x, vox.y, vox.z, hue, lt, cubeUnit, false));
        });
      } else {
        positions.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          cubes.push(renderCube(p[0], p[1], p[2], 200 + p[2]*15, 50 + p[2]*5, cubeUnit, true, function() {
            pushUndo();
            playSound('remove');
            var next = positions.filter(function(pp) { return pp !== pos; });
            upd({ positions: next });
          }));
        });
        // Ground grid for placement
        for (var gx = 0; gx < 8; gx++) {
          for (var gy = 0; gy < 8; gy++) {
            var gKey = gx+'-'+gy+'-0';
            if (!posSet.has(gKey)) {
              (function(fx, fy) {
                cubes.push(h('div', { 
                  key: 'g-'+fx+'-'+fy,
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': 'Place cube at column ' + fx + ', row ' + fy + ', layer 0',
                  onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } },
                  onClick: function(e) {
                    e.stopPropagation();
                    pushUndo();
                    playSound('place');
                    var newPos = positions.concat([fx+'-'+fy+'-0']);
                    var newTotal = totalPlaced + 1;
                    upd({ positions: newPos, totalPlaced: newTotal });
                    checkBadges({ bigBuilder: newPos.length >= 20, centurion: newTotal >= 100 });
                  },
                  style: {
                    position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                    transform: 'translate3d('+fx*cubeUnit+'px,0px,'+fy*cubeUnit+'px) rotateX(90deg)',
                    background: 'hsla(220,15%,60%,0.12)', border: '1px dashed hsla(220,20%,60%,0.25)',
                    boxSizing: 'border-box', cursor: 'pointer'
                  }
                }));
              })(gx, gy);
            }
          }
        }
        // Stack targets above existing cubes
        positions.forEach(function(pos) {
          var p = pos.split('-').map(Number);
          var above = p[0]+'-'+p[1]+'-'+(p[2]+1);
          if (!posSet.has(above) && p[2] < 9) {
            (function(ax, ay, az) {
              cubes.push(h('div', { 
                key: 'stack-'+above,
                role: 'button',
                tabIndex: 0,
                'aria-label': 'Stack cube on top at column ' + ax + ', row ' + ay + ', layer ' + az,
                onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } },
                onClick: function(e) {
                  e.stopPropagation();
                  pushUndo();
                  playSound('place');
                  var newPos = positions.concat([ax+'-'+ay+'-'+az]);
                  var newTotal = totalPlaced + 1;
                  upd({ positions: newPos, totalPlaced: newTotal });
                  checkBadges({ bigBuilder: newPos.length >= 20, centurion: newTotal >= 100 });
                },
                style: {
                  position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                  transform: 'translate3d('+ax*cubeUnit+'px,'+-az*cubeUnit+'px,'+ay*cubeUnit+'px)',
                  transformStyle: 'preserve-3d', cursor: 'pointer', zIndex: 10
                }
              }, h('div', { style: {
                position: 'absolute', width: '100%', height: cubeUnit+'px',
                transform: 'rotateX(90deg) translateZ('+cubeUnit/2+'px)',
                background: 'hsla(220,15%,60%,0.10)', border: '1px dashed hsla(220,20%,60%,0.22)', boxSizing: 'border-box'
              }})));
            })(p[0], p[1], p[2]+1);
          }
        });

        // Render ghost target for prism challenge
        if (builderChallenge && builderChallenge.type === 'prism') {
          var tgt = builderChallenge.target;
          for (var gx2 = 0; gx2 < tgt.l; gx2++) {
            for (var gy2 = 0; gy2 < tgt.w; gy2++) {
              for (var gz2 = 0; gz2 < tgt.h; gz2++) {
                if (!posSet.has(gx2+'-'+gy2+'-'+gz2)) {
                  cubes.push(renderCube(gx2, gy2, gz2, 210, 80, cubeUnit, false, null, true));
                }
              }
            }
          }
        }
      }

      var fw = isSlider ? dims.l * cubeUnit : 8 * cubeUnit;
      var fh = isSlider ? dims.h * cubeUnit : 5 * cubeUnit;

      // ══════════════════════════════════════════════════════════
      // VIEWPORT INTERACTION (rotation, zoom, keyboard)
      // ──────────────────────────────────────────────────────────
      // Unified Pointer Events handler covers mouse, touch, and pen.
      // Two-pointer pinch gesture handles pinch-to-zoom on tablets/touch.
      // Rotation clamp expanded from [-80, 10] to [-180, 180] so students
      // can look from above, below, and behind.
      // Listeners are scoped to the viewport element (not window) so they
      // can't leak if a mouseup happens outside the window. setPointerCapture
      // ensures we keep receiving move events even if the pointer leaves.
      // ══════════════════════════════════════════════════════════
      var ROT_X_MIN = -180, ROT_X_MAX = 180;
      var clampRotX = function(v) { return Math.max(ROT_X_MIN, Math.min(ROT_X_MAX, v)); };

      // Track active pointers for pinch zoom (Map: pointerId -> {x, y})
      var _activePointers = window._volumeActivePointers || (window._volumeActivePointers = {});
      var _pinchStart = window._volumePinchStart || (window._volumePinchStart = { current: null });
      var _dragStart = window._volumeDragStart || (window._volumeDragStart = { current: null });

      function pointerDist(a, b) {
        var dx = a.x - b.x, dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
      }

      var handlePointerDown = function(e) {
        // Capture this pointer so we keep receiving moves even off-element
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
        _activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(_activePointers);
        if (ids.length === 1) {
          // Single-pointer drag = rotate
          _dragStart.current = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
          _pinchStart.current = null;
        } else if (ids.length === 2) {
          // Two-pointer = pinch-to-zoom
          var p1 = _activePointers[ids[0]], p2 = _activePointers[ids[1]];
          _pinchStart.current = { dist: pointerDist(p1, p2), startScale: scale };
          _dragStart.current = null;
        }
      };

      var handlePointerMove = function(e) {
        if (!(e.pointerId in _activePointers)) return;
        _activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(_activePointers);
        if (ids.length === 1 && _dragStart.current) {
          var dx = e.clientX - _dragStart.current.x;
          var dy = e.clientY - _dragStart.current.y;
          upd({ rotation: {
            x: clampRotX(_dragStart.current.rx + dy * 0.5),
            y: _dragStart.current.ry + dx * 0.5
          }});
        } else if (ids.length === 2 && _pinchStart.current) {
          var p1 = _activePointers[ids[0]], p2 = _activePointers[ids[1]];
          var d = pointerDist(p1, p2);
          var ratio = d / _pinchStart.current.dist;
          var newScale = Math.max(0.4, Math.min(2.5, _pinchStart.current.startScale * ratio));
          upd({ scale: newScale });
        }
      };

      var handlePointerUp = function(e) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
        delete _activePointers[e.pointerId];
        var remaining = Object.keys(_activePointers).length;
        if (remaining === 0) {
          _dragStart.current = null;
          _pinchStart.current = null;
        } else if (remaining === 1 && _pinchStart.current) {
          // Pinch released, fall back to single-pointer drag from the survivor
          var survId = Object.keys(_activePointers)[0];
          var surv = _activePointers[survId];
          _dragStart.current = { x: surv.x, y: surv.y, rx: rotation.x, ry: rotation.y };
          _pinchStart.current = null;
        }
      };

      // Keyboard rotation on viewport: arrow keys rotate, +/- zoom, R/Home reset.
      // Works when viewport has focus (tabIndex=0 on viewport element below).
      var handleViewportKeyDown = function(e) {
        var step = e.shiftKey ? 30 : 10;
        var nrx = rotation.x, nry = rotation.y;
        var handled = false;
        switch (e.key) {
          case 'ArrowUp':    nrx = clampRotX(rotation.x - step); handled = true; break;
          case 'ArrowDown':  nrx = clampRotX(rotation.x + step); handled = true; break;
          case 'ArrowLeft':  nry = rotation.y - step; handled = true; break;
          case 'ArrowRight': nry = rotation.y + step; handled = true; break;
          case 'r': case 'R':
            // Only reset view when not typing in an input
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
              upd({ rotation: { x: -25, y: -35 }, scale: 1.0 });
              announceToSR('3D view reset');
              handled = true;
            }
            break;
          case 'Home':
            upd({ rotation: { x: -25, y: -35 }, scale: 1.0 });
            announceToSR('3D view reset');
            handled = true;
            break;
        }
        if (handled) {
          e.preventDefault();
          if (nrx !== rotation.x || nry !== rotation.y) {
            upd({ rotation: { x: nrx, y: nry } });
          }
        }
      };

      // ── Buildable challenge library ─────────────────────────────
      // Curated named structures students can attempt to build. Each defines
      // the target positions and the expected volume. Pedagogically useful
      // because each shape exposes a different "volume = arrangement-free"
      // insight: a staircase has the same V as the smallest enclosing prism
      // (or not — see the desc); a pyramid has 1/3 the enclosing-prism V; etc.
      var BUILD_CHALLENGES = [
        {
          id: 'staircase', icon: '🪜', label: 'Staircase (4 steps)',
          desc: '4 steps of decreasing size. V = 4 + 3 + 2 + 1 = 10 cubes.',
          positions: ['0-0-0','1-0-0','2-0-0','3-0-0','0-1-0','1-1-0','2-1-0','3-1-0','0-0-1','1-0-1','2-0-1','0-1-1','1-1-1','2-1-1','0-0-2','1-0-2','0-1-2','1-1-2','0-0-3','0-1-3'],
          targetVolume: 20
        },
        {
          id: 'pyramid', icon: '🔺', label: 'Step pyramid',
          desc: 'A 3-tier step pyramid. V = 9 + 4 + 1 = 14 cubes.',
          positions: ['0-0-0','1-0-0','2-0-0','0-1-0','1-1-0','2-1-0','0-2-0','1-2-0','2-2-0','0-0-1','1-0-1','0-1-1','1-1-1','0-0-2'],
          targetVolume: 14
        },
        {
          id: 'fortress', icon: '🏰', label: 'Hollow fortress',
          desc: 'A 4×4 base with hollow interior — wall thickness 1. Counts the wall cubes only.',
          positions: (function() {
            var p = [];
            for (var x = 0; x < 4; x++) for (var y = 0; y < 4; y++)
              if (x === 0 || x === 3 || y === 0 || y === 3) p.push(x + '-' + y + '-0');
            for (var z = 1; z < 3; z++) for (var x2 = 0; x2 < 4; x2++) for (var y2 = 0; y2 < 4; y2++)
              if (x2 === 0 || x2 === 3 || y2 === 0 || y2 === 3) p.push(x2 + '-' + y2 + '-' + z);
            return p;
          })(),
          targetVolume: 36
        },
        {
          id: 'bridge', icon: '🌉', label: 'Bridge',
          desc: 'Two pillars connected by a deck — V = 6 + 6 + 5 = 17.',
          positions: ['0-0-0','0-1-0','0-0-1','0-1-1','0-0-2','0-1-2','4-0-0','4-1-0','4-0-1','4-1-1','4-0-2','4-1-2','0-0-3','1-0-3','2-0-3','3-0-3','4-0-3','0-1-3','1-1-3','2-1-3','3-1-3','4-1-3'],
          targetVolume: 22
        },
        {
          id: 'tower', icon: '🗼', label: 'Tower (Eiffel-ish)',
          desc: 'Tapering tower. Each level smaller than the last.',
          positions: (function() {
            var p = [];
            // Base 3x3
            for (var x = 0; x < 3; x++) for (var y = 0; y < 3; y++) p.push(x + '-' + y + '-0');
            // Level 1: 2x2 centered
            for (var x2 = 0; x2 < 2; x2++) for (var y2 = 0; y2 < 2; y2++) p.push((x2 + 0.5 | 0) + '-' + (y2 + 0.5 | 0) + '-1');
            // Spire
            p.push('1-1-2'); p.push('1-1-3');
            return p;
          })(),
          targetVolume: 9 + 4 + 2
        },
        {
          id: 'plus', icon: '➕', label: 'Plus sign',
          desc: '5-cube plus shape, 1 layer. V = 5.',
          positions: ['1-0-0','0-1-0','1-1-0','2-1-0','1-2-0'],
          targetVolume: 5
        },
        {
          id: 'arch', icon: '🌈', label: 'Archway',
          desc: 'A simple arch over an opening.',
          positions: ['0-0-0','0-0-1','0-0-2','3-0-0','3-0-1','3-0-2','0-0-3','1-0-3','2-0-3','3-0-3'],
          targetVolume: 10
        },
        {
          id: 'house', icon: '🏠', label: 'Simple house',
          desc: 'Walls + flat roof. V = 4×4 base wall + roof.',
          positions: (function() {
            var p = [];
            // Walls (hollow 4x4, 2 high)
            for (var z = 0; z < 2; z++) for (var x = 0; x < 4; x++) for (var y = 0; y < 4; y++)
              if (x === 0 || x === 3 || y === 0 || y === 3) p.push(x + '-' + y + '-' + z);
            // Roof
            for (var x3 = 0; x3 < 4; x3++) for (var y3 = 0; y3 < 4; y3++) p.push(x3 + '-' + y3 + '-2');
            return p;
          })(),
          targetVolume: 24 + 16
        }
      ];
      var showBuildLibrary = _v.showBuildLibrary || false;

      // ── Generate L-block ──
      var generateLBlock = function() {
        var pos = [];
        var bw = 2 + Math.floor(Math.random() * 3);
        var bd = 2 + Math.floor(Math.random() * 2);
        for (var lx = 0; lx < bw; lx++) for (var ly = 0; ly < bd; ly++) pos.push(lx+'-'+ly+'-0');
        var th = 1 + Math.floor(Math.random() * 2);
        for (var lx2 = 0; lx2 < Math.min(2, bw); lx2++)
          for (var ly2 = 0; ly2 < Math.min(2, bd); ly2++)
            for (var lz = 1; lz <= th; lz++) pos.push(lx2+'-'+ly2+'-'+lz);
        return { positions: pos, volume: new Set(pos).size };
      };

      // ── Check challenge ──
      var checkChallenge = function() {
        if (isSlider && challenge) {
          var ans = parseInt(answer);
          var ok = ans === challenge.answer;
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          playSound(ok ? 'correct' : 'wrong');
          var newStreak = ok ? streak + 1 : 0;
          if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');
          upd({
            feedback: ok
              ? { correct: true, msg: '\u2705 Correct! '+challenge.l+'\u00d7'+challenge.w+'\u00d7'+challenge.h+' = '+challenge.answer + (newStreak >= 3 ? '  \uD83D\uDD25 ' + newStreak + ' streak!' : '') }
              : { correct: false, msg: '\u274c Try V = L \u00d7 W \u00d7 H = '+challenge.l+' \u00d7 '+challenge.w+' \u00d7 '+challenge.h+' = '+challenge.answer },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
            streak: newStreak,
            attemptHist: (_v.attemptHist || []).concat([ok ? 1 : 0]).slice(-24)
          });
          if (ok) {
            awardStemXP('volume', 5, 'cube volume');
            checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10 });
          }
        }
        if (!isSlider && builderChallenge) {
          var vol = posSet.size;
          if (builderChallenge.type === 'prism') {
            var tgtP = builderChallenge.target;
            var tgtVol = tgtP.l * tgtP.w * tgtP.h;
            var isRect = false;
            if (vol === tgtVol) {
              var coords = positions.map(function(p) { return p.split('-').map(Number); });
              var xs = coords.map(function(c) { return c[0]; });
              var ys = coords.map(function(c) { return c[1]; });
              var zs = coords.map(function(c) { return c[2]; });
              var ddx = Math.max.apply(null, xs) - Math.min.apply(null, xs) + 1;
              var ddy = Math.max.apply(null, ys) - Math.min.apply(null, ys) + 1;
              var ddz = Math.max.apply(null, zs) - Math.min.apply(null, zs) + 1;
              var d = [ddx, ddy, ddz].sort(function(a,b){return a-b;});
              var tgtd = [tgtP.l, tgtP.w, tgtP.h].sort(function(a,b){return a-b;});
              isRect = d[0]===tgtd[0] && d[1]===tgtd[1] && d[2]===tgtd[2] && vol===ddx*ddy*ddz;
            }
            playSound(isRect ? 'correct' : 'wrong');
            var newStreak2 = isRect ? streak + 1 : 0;
            upd({
              builderFeedback: isRect
                ? { correct: true, msg: '\u2705 Correct! '+tgtP.l+'\u00d7'+tgtP.w+'\u00d7'+tgtP.h+' = '+tgtVol+' cubes' + (newStreak2 >= 3 ? '  \uD83D\uDD25 ' + newStreak2 + ' streak!' : '') }
                : { correct: false, msg: '\u274c Build a solid '+tgtP.l+'\u00d7'+tgtP.w+'\u00d7'+tgtP.h+' prism ('+tgtVol+' cubes). You have '+vol+'.' },
              score: { correct: score.correct + (isRect ? 1 : 0), total: score.total + 1 },
              streak: newStreak2,
              attemptHist: (_v.attemptHist || []).concat([isRect ? 1 : 0]).slice(-24)
            });
            if (isRect) {
              awardStemXP('volume', 5, 'prism build');
              checkBadges({ firstVolume: true, prismBuilder: true, streak5: newStreak2 >= 5, streak10: newStreak2 >= 10 });
            }
          } else {
            var ok2 = vol === builderChallenge.answer;
            playSound(ok2 ? 'correct' : 'wrong');
            var newStreak3 = ok2 ? streak + 1 : 0;
            var isLBlock = builderChallenge.shape === 'L-Block';
            upd({
              builderFeedback: ok2
                ? { correct: true, msg: '\u2705 Correct! Volume = '+builderChallenge.answer+' cubic units' + (newStreak3 >= 3 ? '  \uD83D\uDD25 ' + newStreak3 + ' streak!' : '') }
                : { correct: false, msg: '\u274c You placed '+vol+' cubes. Correct: '+builderChallenge.answer+'.' },
              score: { correct: score.correct + (ok2 ? 1 : 0), total: score.total + 1 },
              streak: newStreak3
            });
            if (ok2) {
              awardStemXP('volume', 5, 'volume quiz');
              checkBadges({ firstVolume: true, lBlockSolver: isLBlock, streak5: newStreak3 >= 5, streak10: newStreak3 >= 10 });
            }
          }
        }
      };

      // ── AI Tutor ──
      function askAI() {
        if (aiLoading) return;
        upd({ showAI: true, aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student explore 3D volume and surface area. ';
        if (isSlider) {
          prompt += 'They are looking at a ' + dims.l + '\u00d7' + dims.w + '\u00d7' + dims.h + ' rectangular prism. ';
          prompt += 'Volume = ' + volume + ', Surface Area = ' + surfaceArea + '. ';
          if (challenge && feedback && !feedback.correct) {
            prompt += 'They got the volume challenge wrong. Explain the formula V = L \u00d7 W \u00d7 H with this example. ';
          } else {
            prompt += 'Share a fun fact about 3D shapes or a real-world example of this volume. ';
          }
        } else {
          prompt += 'They are building 3D shapes in freeform mode with ' + posSet.size + ' cubes placed. ';
          if (builderChallenge) {
            if (builderChallenge.type === 'prism') {
              prompt += 'Challenge: build a ' + builderChallenge.target.l + '\u00d7' + builderChallenge.target.w + '\u00d7' + builderChallenge.target.h + ' prism. ';
            } else {
              prompt += 'Challenge: build a shape with volume = ' + builderChallenge.answer + '. ';
            }
            if (builderFeedback && !builderFeedback.correct) {
              prompt += 'They got it wrong. Give a helpful strategy tip. ';
            }
          } else {
            prompt += 'Give a tip about building 3D shapes or an interesting volume fact. ';
          }
        }
        prompt += 'Keep it to 2-3 sentences, encouraging and educational.';
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          upd({ aiResponse: resp || 'No response received.', aiLoading: false });
        }).catch(function() {
          upd({ aiResponse: 'AI tutor is unavailable right now. Try again later!', aiLoading: false });
        });
      }

      // ── Keyboard shortcuts (managed without useEffect) ──
      if (window._volumeKeyHandler) {
        window.removeEventListener('keydown', window._volumeKeyHandler);
      }
      window._volumeKeyHandler = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        var key = e.key.toLowerCase();
        if (key === 's' && mode !== 'slider') { e.preventDefault(); upd({ mode: 'slider', builderChallenge: null, builderFeedback: null, wpFeedback: null }); }
        if (key === 'f' && !isFreeform) { e.preventDefault(); upd({ mode: 'freeform', challenge: null, feedback: null, wpFeedback: null }); }
        if (key === 'w' && !isWord) {
          e.preventDefault();
          var ctx3 = WORD_CONTEXTS[wpCtxIdx % WORD_CONTEXTS.length];
          upd({ mode: 'word', dims: ctx3.defaults, challenge: null, feedback: null, builderChallenge: null, builderFeedback: null, wpFeedback: null });
        }
        if (key === 'n') {
          e.preventDefault();
          if (isSlider) {
            var rl = Math.floor(Math.random()*8)+1, rw = Math.floor(Math.random()*6)+1, rh = Math.floor(Math.random()*6)+1;
            upd({ dims: {l:rl,w:rw,h:rh}, challenge: {l:rl,w:rw,h:rh,answer:rl*rw*rh}, answer: '', feedback: null, showLayers: null });
          }
        }
        if (key === 'p') { e.preventDefault(); upd({ paintSurfaceArea: !paintSurfaceArea }); if (!badges.surfaceExplorer) checkBadges({ surfaceExplorer: true }); }
        if (key === 'b') { e.preventDefault(); upd({ showBadges: !showBadges }); }
        if (key === 'u' && isFreeform) { e.preventDefault(); doUndo(); }
        if (key === '?' || (e.shiftKey && key === '/')) { e.preventDefault(); askAI(); }
        if (key === '=' || key === '+') { e.preventDefault(); upd({ scale: Math.min(2.5, scale + 0.15) }); }
        if (key === '-') { e.preventDefault(); upd({ scale: Math.max(0.4, scale - 0.15) }); }
      };
      window.addEventListener('keydown', window._volumeKeyHandler);

      // ── Interactive net fold slider ──
      // Slider 0..1 controls how "folded" the net is. At 0, faces lie flat
      // (true net). At 1, faces are folded up into 3D. Pedagogically powerful
      // because students see the net BECOME the prism, not just two static
      // representations. Uses CSS 3D transforms.
      var netFold = _v.netFold != null ? _v.netFold : 0;
      var renderInteractiveNet = function() {
        var l = dims.l, w = dims.w, hh = dims.h;
        var maxDim = Math.max(l, w, hh);
        var u = Math.min(50, 280 / maxDim);
        // Container size
        var contW = (2 * (l + w)) * u + 60;
        var contH = (2 * (w + hh)) * u + 60; // flat net spans Top(w)+Front(h)+Bottom(w)+Back(h) — Back face was overflowing the panel
        var t = netFold; // 0 (flat) to 1 (folded)
        // Each face has an unfolded position and a rotation that morphs toward folded
        // We render six faces as positioned divs and rotate each by t * 90deg around
        // an appropriate hinge. "front" face stays fixed; others swing into place.
        function face(label, fillHsl, dims2D, posFlat, hinge) {
          // hinge: { axis: 'x' or 'y', deg: target degrees at t=1, originX, originY }
          var pw = dims2D[0] * u, ph = dims2D[1] * u;
          var translateFlat = 'translate(' + posFlat[0] * u + 'px, ' + posFlat[1] * u + 'px)';
          var rotateInterp = hinge ? (' rotate' + hinge.axis.toUpperCase() + '(' + (t * hinge.deg).toFixed(1) + 'deg)') : '';
          var transformOrigin = hinge ? (hinge.originX + ' ' + hinge.originY) : 'center center';
          return h('div', {
            key: 'face-' + label,
            style: {
              position: 'absolute',
              width: pw + 'px', height: ph + 'px',
              transform: translateFlat + rotateInterp,
              transformOrigin: transformOrigin,
              transformStyle: 'preserve-3d',
              background: fillHsl,
              border: '2px solid #064e3b',
              boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 'bold', fontSize: '11px',
              transition: 'transform 0.05s linear',
              textAlign: 'center'
            }
          }, label + ' · ' + dims2D[0] + '×' + dims2D[1]);
        }
        // Compute analytic surface area (only for prism)
        var sa = 2 * (l * w + l * hh + w * hh);
        return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3 space-y-2' },
          h('div', { className: 'flex items-center justify-between' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' },
              '🗺 Interactive net — drag the slider to fold the 2D net into a 3D prism'
            ),
            h('button', {
              onClick: function() { playSound('place'); upd({ showNet: false }); },
              'aria-label': 'Hide net',
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, 'Hide ×')
          ),
          // Fold slider
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-[11px] font-bold text-emerald-700' }, 'Flat'),
            h('input', {
              type: 'range', min: '0', max: '1', step: '0.02',
              value: netFold,
              onChange: function(e) { upd({ netFold: parseFloat(e.target.value) }); },
              'aria-label': 'Fold the net from flat (0) to fully folded (1)',
              className: 'flex-1 h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
            }),
            h('span', { className: 'text-[11px] font-bold text-emerald-700' }, 'Folded'),
            h('button', {
              onClick: function() {
                // Animate from 0 to 1 over ~1.5s
                var start = Date.now();
                var dur = 1500;
                var step = function() {
                  var elapsed = (Date.now() - start) / dur;
                  if (elapsed >= 1) { upd({ netFold: 1 }); return; }
                  // Ease out cubic
                  var eased = 1 - Math.pow(1 - elapsed, 3);
                  upd({ netFold: eased });
                  requestAnimationFrame(step);
                };
                upd({ netFold: 0 });
                requestAnimationFrame(step);
              },
              'aria-label': 'Animate fold',
              title: 'Watch it fold automatically',
              className: 'px-2 py-1 text-[11px] font-bold bg-emerald-700 text-white rounded hover:bg-emerald-800'
            }, '▶ Animate')
          ),
          h('div', { style: { perspective: '1200px', minHeight: contH + 'px', display: 'flex', justifyContent: 'center' } },
            h('div', { style: { position: 'relative', width: contW + 'px', height: contH + 'px', transformStyle: 'preserve-3d' } },
              face('Bottom', 'hsl(160,60%,40%)', [l, w], [w, w + hh], null),
              face('Front',  'hsl(160,60%,50%)', [l, hh], [w, w], { axis: 'x', deg: -90, originX: '0%', originY: '0%' }),
              face('Back',   'hsl(160,60%,55%)', [l, hh], [w, w + hh + w], { axis: 'x', deg: 90, originX: '0%', originY: '0%' }),
              face('Left',   'hsl(170,60%,45%)', [w, hh], [0, w], { axis: 'y', deg: 90, originX: '100%', originY: '0%' }),
              face('Right',  'hsl(150,60%,50%)', [w, hh], [w + l, w], { axis: 'y', deg: -90, originX: '0%', originY: '0%' }),
              face('Top',    'hsl(165,70%,60%)', [l, w], [w, 0], { axis: 'x', deg: 90, originX: '0%', originY: '100%' })
            )
          ),
          h('p', { className: 'text-[11px] text-emerald-800 text-center font-mono' },
            'Total SA = 2(' + l + '·' + w + ') + 2(' + l + '·' + hh + ') + 2(' + w + '·' + hh + ') = ' + sa + ' sq units'
          ),
          h('p', { className: 'text-[10px] text-emerald-700 italic text-center' },
            'When the net folds up completely, you can see the prism. Surface area is the area of all 6 faces — the wrapping paper.'
          )
        );
      };

      // ── Net visualization (unfolded 6-face cross layout) ──
      // Pedagogical move: connect 3D surface area to its 2D unfolding.
      // The 6 faces, laid flat, sum to the SA formula 2(lw + lh + wh).
      // "Surface area is the wrapping paper you'd need" becomes literal.
      var renderNet = function() {
        var l = dims.l, w = dims.w, hh = dims.h;
        // Layout cross: top above front, sides left/right of front, back to the right, bottom below front
        var spanW = 2 * (l + w);   // total layout width in units
        var spanH = 2 * w + hh;     // total layout height in units
        var maxSpan = Math.max(spanW, spanH);
        var unitSz = Math.min(32, Math.max(14, 380 / maxSpan));
        var pad = 6;
        var svgW = spanW * unitSz + pad * 2;
        var svgH = spanH * unitSz + pad * 2;
        var faces = [
          { name: 'top',    x: w,         y: 0,       fw: l, fh: w,  fill: '#86efac', area: l*w, dims: l + '×' + w },
          { name: 'left',   x: 0,         y: w,       fw: w, fh: hh, fill: '#34d399', area: w*hh, dims: w + '×' + hh },
          { name: 'front',  x: w,         y: w,       fw: l, fh: hh, fill: '#10b981', area: l*hh, dims: l + '×' + hh },
          { name: 'right',  x: w + l,     y: w,       fw: w, fh: hh, fill: '#059669', area: w*hh, dims: w + '×' + hh },
          { name: 'back',   x: w + l + w, y: w,       fw: l, fh: hh, fill: '#047857', area: l*hh, dims: l + '×' + hh },
          { name: 'bottom', x: w,         y: w + hh,  fw: l, fh: w,  fill: '#065f46', area: l*w, dims: l + '×' + w }
        ];
        var totalSA = 2 * (l*w + l*hh + w*hh);
        var faceEls = faces.map(function(f, i) {
          var px = f.x * unitSz + pad;
          var py = f.y * unitSz + pad;
          var pw = f.fw * unitSz;
          var ph = f.fh * unitSz;
          var labelFits = pw >= 36 && ph >= 28;
          return h('g', { key: 'net-face-' + i },
            h('rect', {
              x: px, y: py, width: pw, height: ph,
              fill: f.fill, stroke: '#064e3b', strokeWidth: 1.5, opacity: 0.92
            }),
            labelFits && h('text', {
              x: px + pw / 2, y: py + ph / 2 - 4,
              textAnchor: 'middle', fontSize: Math.min(12, pw / 5), fontWeight: 'bold', fill: '#fff',
              style: { pointerEvents: 'none' }
            }, f.name),
            labelFits && h('text', {
              x: px + pw / 2, y: py + ph / 2 + 10,
              textAnchor: 'middle', fontSize: Math.min(11, pw / 6), fontFamily: 'monospace', fill: '#ecfdf5',
              style: { pointerEvents: 'none' }
            }, f.dims + ' = ' + f.area)
          );
        });
        return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' },
              '🗺 Net — the 6 faces unfolded onto a 2D layout'
            ),
            h('button', {
              onClick: function() { playSound('place'); upd({ showNet: false }); },
              'aria-label': 'Hide net',
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, 'Hide net ×')
          ),
          h('div', { className: 'flex justify-center overflow-x-auto' },
            h('svg', {
              width: svgW, height: svgH, viewBox: '0 0 ' + svgW + ' ' + svgH,
              role: 'img',
              'aria-label': 'Unfolded net of ' + l + ' by ' + w + ' by ' + hh + ' prism. Total surface area: ' + totalSA + ' square units.'
            }, faceEls)
          ),
          h('div', { className: 'mt-2 bg-emerald-50 rounded-lg p-2 border border-emerald-200 text-center' },
            h('p', { className: 'text-xs font-bold text-emerald-900 font-mono' },
              '2(' + (l*w) + ') + 2(' + (l*hh) + ') + 2(' + (w*hh) + ') = ',
              h('span', { className: 'text-base text-emerald-700 font-bold' }, totalSA),
              ' square units'
            ),
            h('p', { className: 'text-[10px] text-emerald-700 italic mt-0.5' },
              'Fold the net up and you get the prism. Surface area is the total area of all 6 faces — the wrapping paper or paint you would need.'
            )
          )
        );
      };

      // ── Same-volume comparison (square-cube law) ──
      // Given the current volume, find alternative integer factorizations.
      // The cube (or closest-to-cube) has the minimum SA; thin "rod" or "slab"
      // shapes have the maximum SA. Same volume, very different "skin."
      var getFactorizations = function(V) {
        var results = [];
        if (V < 1 || V > 1000) return results;
        for (var a = 1; a * a * a <= V; a++) {
          if (V % a !== 0) continue;
          var rem = V / a;
          for (var b = a; b * b <= rem; b++) {
            if (rem % b !== 0) continue;
            var c = rem / b;
            results.push([a, b, c]);
          }
        }
        return results;
      };
      var describeShape = function(a, b, c) {
        var srt = [a, b, c].sort(function(x, y) { return x - y; });
        if (srt[0] === srt[2]) return 'cube';
        if (srt[0] === 1 && srt[1] === 1) return 'rod';
        if (srt[0] === 1) return 'slab';
        if (srt[2] / srt[0] >= 4) return 'long box';
        return 'box';
      };
      var renderCompare = function() {
        var V = volume;
        var allFactors = getFactorizations(V);
        if (allFactors.length === 0) {
          return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3 text-center text-xs text-slate-600' },
            'Volume out of range for comparison. Try a smaller prism (V ≤ 1000).'
          );
        }
        var allWithSA = allFactors.map(function(f) {
          var sa = 2 * (f[0]*f[1] + f[0]*f[2] + f[1]*f[2]);
          return { l: f[0], w: f[1], h: f[2], sa: sa };
        });
        allWithSA.sort(function(a, b) { return a.sa - b.sa; });
        var minE = allWithSA[0];
        var maxE = allWithSA[allWithSA.length - 1];
        var curEntry = null;
        for (var i = 0; i < allWithSA.length; i++) {
          var e = allWithSA[i];
          var srt1 = [e.l, e.w, e.h].sort(function(a,b){return a-b;});
          var srt2 = [dims.l, dims.w, dims.h].sort(function(a,b){return a-b;});
          if (srt1[0] === srt2[0] && srt1[1] === srt2[1] && srt1[2] === srt2[2]) { curEntry = e; break; }
        }
        // Build display list: current + min + max, deduped
        var displayList = [];
        if (curEntry) displayList.push({ entry: curEntry, label: 'Current', accent: '#3b82f6' });
        if (!curEntry || (curEntry.sa !== minE.sa)) displayList.push({ entry: minE, label: 'Most efficient ✓', accent: '#16a34a' });
        if (!curEntry || (curEntry.sa !== maxE.sa)) {
          if (!displayList.some(function(d) { return d.entry.sa === maxE.sa; })) {
            displayList.push({ entry: maxE, label: 'Least efficient', accent: '#dc2626' });
          }
        }
        var maxSAvalue = maxE.sa;
        return h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' },
              '⚖️ Same volume (' + V + ' cubes), different surface areas — the square-cube law'
            ),
            h('button', {
              onClick: function() { playSound('place'); upd({ showCompare: false }); },
              'aria-label': 'Hide compare panel',
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, 'Hide ×')
          ),
          h('div', { className: 'space-y-1.5' },
            displayList.map(function(d, idx) {
              var e = d.entry;
              var pct = (e.sa / maxSAvalue) * 100;
              var shape = describeShape(e.l, e.w, e.h);
              return h('button', {
                key: 'cmp-' + idx,
                onClick: function() {
                  playSound('place');
                  upd({ dims: { l: e.l, w: e.w, h: e.h }, showLayers: null, challenge: null, feedback: null });
                  announceToSR('Switched to ' + e.l + ' by ' + e.w + ' by ' + e.h);
                },
                'aria-label': d.label + ': ' + e.l + ' by ' + e.w + ' by ' + e.h + ', surface area ' + e.sa,
                className: 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-left hover:shadow-sm',
                style: { borderColor: d.accent + '88', backgroundColor: d.accent + '0F' }
              },
                h('span', { className: 'text-[10px] font-bold uppercase tracking-wider w-24 flex-shrink-0', style: { color: d.accent } }, d.label),
                h('span', { className: 'text-sm font-mono font-bold text-slate-800 w-24 flex-shrink-0' }, e.l + '×' + e.w + '×' + e.h),
                h('span', { className: 'text-[10px] text-slate-600 italic w-16 flex-shrink-0' }, '(' + shape + ')'),
                h('div', { className: 'flex-1 bg-slate-100 rounded h-3 overflow-hidden', 'aria-hidden': 'true' },
                  h('div', {
                    className: 'h-full rounded transition-all',
                    style: { width: pct + '%', backgroundColor: d.accent }
                  })
                ),
                h('span', { className: 'text-xs font-bold text-slate-800 w-20 text-right flex-shrink-0' }, 'SA = ' + e.sa)
              );
            })
          ),
          h('div', { className: 'mt-2 bg-emerald-50 rounded-lg p-2 border border-emerald-200' },
            h('p', { className: 'text-[11px] text-emerald-900' },
              h('b', {}, '💡 Square-cube law: '),
              'volume grows as the cube of the dimension; surface area grows as the square. Same V, very different SA. ',
              'A cube is the most surface-efficient prism shape. ',
              'It is why elephants need thick legs (volume → mass scales faster than bone cross-section), ',
              'why cells stay small (need surface area to absorb nutrients), and why insulation works (rounder shapes keep heat).'
            ),
            h('p', { className: 'text-[10px] text-emerald-700 italic mt-1' },
              '👆 Tap any row above to swap the 3D prism to that shape — see the same volume in a different skin.'
            )
          )
        );
      };

      // ── Earned badges count ──
      var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
      var earnedCount = earnedBadges.length;

      // ══════════ RENDER ══════════
      var bgClass = isWord ? 'allo-vol-bg-word' : (isFreeform ? 'allo-vol-bg-freeform' : 'allo-vol-bg-slider');
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200 ' + bgClass },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-emerald-800' }, '\uD83D\uDCE6 3D Volume Explorer'),
          h('div', { className: 'flex items-center gap-2 ml-2' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, score.correct + '/' + score.total),
            (_v.attemptHist && _v.attemptHist.length > 1) && h('div', { className: 'flex items-center gap-px', title: 'Recent attempts (newest at right)', role: 'img', 'aria-label': _v.attemptHist.slice(-12).filter(function (x) { return x; }).length + ' correct of your last ' + Math.min(12, _v.attemptHist.length) + ' attempts' },
              _v.attemptHist.slice(-12).map(function (v, i) { return h('span', { key: i, className: 'inline-block w-1 h-3.5 rounded-sm ' + (v ? 'bg-emerald-500' : 'bg-rose-400') }); })),
            streak >= 2 && h('div', {
              className: 'text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full animate-pulse'
            }, '\uD83D\uDD25 ' + streak + ' streak!'),
            earnedCount > 0 && h('button', { onClick: function() { upd({ showBadges: !showBadges }); },
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-600 text-amber-700 hover:bg-amber-100 transition-all',
              title: 'View badges (B)'
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            h('button', { onClick: askAI,
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-600 text-purple-600 hover:bg-purple-100 transition-all',
              title: 'AI Tutor (?)'
            }, '\uD83E\uDDE0 AI')
          ),
          h('div', { className: 'flex-1' }),
          // Mode toggle (now 3 options: Slider / Freeform / Word Problems)
          h('div', { className: 'flex items-center gap-1 bg-emerald-50 rounded-lg p-1 border border-emerald-200', role: 'tablist', 'aria-label': 'Volume modes' },
            h('button', { 'aria-label': 'Slider mode',
              onClick: function() { upd({ mode: 'slider', builderChallenge: null, builderFeedback: null }); },
              role: 'tab', 'aria-selected': mode === 'slider',
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (mode === 'slider' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: 'Slider mode (S)'
            }, '\uD83C\uDF9A\uFE0F Slider'),
            h('button', { 'aria-label': 'Freeform mode',
              onClick: function() { upd({ mode: 'freeform', challenge: null, feedback: null }); },
              role: 'tab', 'aria-selected': isFreeform,
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (isFreeform ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: 'Freeform mode (F)'
            }, '\uD83E\uDDF1 Freeform'),
            h('button', { 'aria-label': 'Word Problems mode',
              onClick: function() {
                var ctx = WORD_CONTEXTS[wpCtxIdx % WORD_CONTEXTS.length];
                upd({ mode: 'word', dims: ctx.defaults, challenge: null, feedback: null, builderChallenge: null, builderFeedback: null, wpFeedback: null });
              },
              role: 'tab', 'aria-selected': isWord,
              className: 'px-3 py-1 rounded-md text-xs font-bold transition-all ' + (isWord ? 'bg-white text-amber-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: 'Word Problems mode (W)'
            }, '\uD83D\uDCDD Word')),
          // Mute toggle
          h('button', {
            onClick: function() {
              var next = !muted;
              upd({ muted: next });
              window._volumeMuted = next;
              if (!next) { setTimeout(function() { playSound('place'); }, 0); }
              announceToSR(next ? 'Sound muted' : 'Sound on');
            },
            'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
            'aria-pressed': muted,
            title: muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
            className: 'p-1 ml-2 rounded-md text-base hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-400' : 'text-emerald-700')
          }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
          // Reset
          h('button', {
            onClick: function() {
              playSound('place');
              upd({
                dims: {l:3,w:2,h:2}, mode: 'slider',
                positions: [], rotation: {x:-25,y:-35}, scale: 1.0,
                challenge: null, answer: '', feedback: null, showLayers: null,
                builderChallenge: null, builderFeedback: null,
                paintSurfaceArea: false,
                wpAnswer: '', wpFeedback: null, wpCtxIdx: 0,
                shape: 'prism', showCrossSection: false, showNet: false, showCompare: false, netFold: 0
              });
              announceToSR('Volume explorer reset');
            },
            'aria-label': 'Reset',
            title: 'Reset everything',
            className: 'text-[11px] font-bold px-2 py-0.5 ml-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
          }, '\u21BA Reset'),
          // Paint toggle
          h('button', { 'aria-label': 'Toggle paint (P)',
            onClick: function() {
              upd({ paintSurfaceArea: !paintSurfaceArea });
              if (!badges.surfaceExplorer) checkBadges({ surfaceExplorer: true });
            },
            className: 'px-3 py-1 ml-2 rounded-lg text-xs font-bold transition-all border ' + (paintSurfaceArea ? 'bg-orange-100 text-orange-700 border-orange-600 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'),
            title: 'Toggle paint (P)'
          }, paintSurfaceArea ? '\uD83E\uDDFC Wash Paint' : '\uD83C\uDFA8 Paint Surface'),
          // Zoom
          h('div', { className: 'flex items-center gap-1' },
            h('button', { 'aria-label': 'Zoom out', onClick: function() { upd({ scale: Math.max(0.4, scale - 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-600 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '\u2212'),
            h('span', { className: 'text-[11px] text-emerald-600 font-mono w-10 text-center' }, Math.round(scale*100)+'%'),
            h('button', { 'aria-label': 'Zoom in', onClick: function() { upd({ scale: Math.min(2.5, scale + 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-600 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '+'),
            h('button', { 'aria-label': 'Reset 3D view rotation and zoom', onClick: function() { upd({ rotation: { x: -25, y: -35 }, scale: 1.0 }); }, className: 'ml-1 px-2 py-1 rounded-md bg-white border border-emerald-600 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100' }, '\u21BA'))
        ),

        // ── Badge panel ──
        showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', { 'aria-label': 'Close badges panel', onClick: function() { upd({ showBadges: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
          ),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-5 gap-2' },
            BADGES.map(function(badge) {
              var earned = !!badges[badge.id];
              return h('div', {
                key: badge.id,
                className: 'text-center p-2 rounded-lg border transition-all ' +
                  (earned ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'),
                title: badge.desc
              },
                h('div', { className: 'text-xl' }, earned ? badge.icon : '\uD83D\uDD12'),
                h('div', { className: 'text-[11px] font-bold mt-0.5 ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.label)
              );
            })
          )
        ),

        // ── AI Tutor panel ──
        showAI && h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-purple-800' }, '\uD83E\uDDE0 AI Volume Tutor'),
            h('button', { onClick: function() { upd({ showAI: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
          ),
          aiLoading
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin' }),
                h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, aiResponse),
          !aiLoading && h('button', { 'aria-label': 'Ask Again',
            onClick: askAI,
            className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all'
          }, '\uD83D\uDD04 Ask Again')
        ),

        // ── Topic-accent hero band per mode ──
        (function() {
          var MODE_META = {
            slider:   { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83C\uDF9A', title: 'Slider \u2014 V = l \u00d7 w \u00d7 h, watch it grow',     hint: 'Sliders snap to integer dimensions \u2014 great for the early visual: doubling each side multiplies volume by 8 (2\u00b3). Surface area scales as 2\u00b2; volume as 2\u00b3. The square-cube law explains why elephants have thick legs and shrews can fall safely.' },
            freeform: { accent: '#4f46e5', soft: 'rgba(79,70,229,0.10)',  icon: '\uD83E\uDDF1', title: 'Freeform \u2014 build any shape, count cubes',         hint: 'L-blocks, hollow shapes, irregular prisms. Volume = total cubes regardless of arrangement. CCSS 5.MD.5: relate volume of a right rectangular prism to multiplication and addition (V = b\u00d7h or as the sum of partial volumes).' },
            word:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDCDD', title: 'Word Problems \u2014 volume in the real world',        hint: 'A fish tank with 5\u00d73\u00d74 = 60 cubes of water. A lunchbox of 4\u00d73\u00d72 = 24 sandwich cubes. Every multiplication of three dimensions is a real container with a real capacity. CCSS 5.MD.5b: solve real-world problems involving volume.' }
          };
          var modeKey = isWord ? 'word' : (isFreeform ? 'freeform' : 'slider');
          var meta = MODE_META[modeKey];
          return h('div', {
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
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // Word problem story panel (when in word mode)
        isWord && (function() {
          var ctx2 = WORD_CONTEXTS[wpCtxIdx % WORD_CONTEXTS.length];
          var story = ctx2.story.replace(/\{l\}/g, dims.l).replace(/\{w\}/g, dims.w).replace(/\{h\}/g, dims.h);
          return h('div', { className: 'space-y-2' },
            // Context picker row
            h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
              h('p', { className: 'text-[11px] font-bold text-amber-800 mb-2' }, '🌍 Pick a context to make volume real:'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                WORD_CONTEXTS.map(function(c, ci) {
                  var active = wpCtxIdx === ci;
                  return h('button', {
                    key: 'wpc-' + c.id,
                    onClick: function() {
                      playSound('place');
                      var newExpl = Object.assign({}, wpExplored); newExpl[c.id] = true;
                      upd({ wpCtxIdx: ci, dims: c.defaults, wpAnswer: '', wpFeedback: null, wpExplored: newExpl });
                      if (Object.keys(newExpl).length >= WORD_CONTEXTS.length) checkBadges({ realWorldExpl: true });
                      announceToSR(c.label + ' context selected');
                    },
                    'aria-pressed': active,
                    className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ' +
                      (active ? 'bg-amber-700 text-white shadow-sm' : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100')
                  }, c.icon + ' ' + c.label);
                })
              )
            ),
            // Story prompt + answer input
            h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
              h('p', { className: 'text-base font-bold text-amber-900 leading-relaxed mb-3' }, '📖 ' + story),
              h('div', { className: 'flex gap-2 items-center' },
                h('input', {
                  type: 'number', value: wpAnswer,
                  onChange: function(e) { upd({ wpAnswer: e.target.value }); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter' && wpAnswer) {
                      var correct = dims.l * dims.w * dims.h;
                      var ok = parseInt(wpAnswer) === correct;
                      playSound(ok ? 'correct' : 'wrong');
                      var newStreak = ok ? streak + 1 : 0;
                      if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');
                      var newSolved = wpSolved + (ok ? 1 : 0);
                      announceToSR(ok ? 'Correct!' : 'Try again');
                      upd({
                        wpFeedback: ok
                          ? { correct: true, msg: '✅ Correct! ' + dims.l + '×' + dims.w + '×' + dims.h + ' = ' + correct + ' ' + ctx2.unit + (newStreak >= 3 ? '  🔥 ' + newStreak + ' streak!' : '') }
                          : { correct: false, msg: '❌ V = l × w × h = ' + dims.l + ' × ' + dims.w + ' × ' + dims.h + ' = ' + correct + ' ' + ctx2.unit },
                        score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                        streak: newStreak, wpSolved: newSolved
                      });
                      if (ok) {
                        awardStemXP('volume', 5, 'word problem');
                        checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10, wordWizard: newSolved >= 5 });
                      }
                    }
                  },
                  placeholder: 'V = ?',
                  'aria-label': 'Volume answer for word problem',
                  className: 'flex-1 px-3 py-2 border-2 border-amber-600 rounded-lg text-base font-mono'
                }),
                h('span', { className: 'text-xs font-bold text-amber-700' }, ctx2.unit),
                h('button', {
                  onClick: function() {
                    if (!wpAnswer) return;
                    var correct = dims.l * dims.w * dims.h;
                    var ok = parseInt(wpAnswer) === correct;
                    playSound(ok ? 'correct' : 'wrong');
                    var newStreak = ok ? streak + 1 : 0;
                    if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');
                    var newSolved = wpSolved + (ok ? 1 : 0);
                    announceToSR(ok ? 'Correct!' : 'Try again');
                    upd({
                      wpFeedback: ok
                        ? { correct: true, msg: '✅ Correct! ' + dims.l + '×' + dims.w + '×' + dims.h + ' = ' + correct + ' ' + ctx2.unit + (newStreak >= 3 ? '  🔥 ' + newStreak + ' streak!' : '') }
                        : { correct: false, msg: '❌ V = l × w × h = ' + dims.l + ' × ' + dims.w + ' × ' + dims.h + ' = ' + correct + ' ' + ctx2.unit },
                      score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                      streak: newStreak, wpSolved: newSolved
                    });
                    if (ok) {
                      awardStemXP('volume', 5, 'word problem');
                      checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10, wordWizard: newSolved >= 5 });
                    }
                  },
                  disabled: !wpAnswer,
                  'aria-label': 'Check answer',
                  className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-all'
                }, 'Check')
              ),
              wpFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (wpFeedback.correct ? 'text-green-700' : 'text-red-600'), 'aria-live': 'polite' }, wpFeedback.msg),
              wpFeedback && wpFeedback.correct && h('div', { className: 'mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200' },
                h('p', { className: 'text-[11px] text-amber-700' },
                  '💡 The rectangular prism above shows exactly what the words describe. Volume is the count of unit cubes that fit inside.'
                )
              )
            ),
            h('p', { className: 'text-[10px] text-amber-700 italic text-center' },
              'Adjust the sliders below to match the story — or try a new context. Solve 5 word problems to earn 📝 Word Wizard. Visit all 8 contexts for 🌍 Real-World Explorer.'
            )
          );
        })(),

        // Sliders (slider mode) — step 0.5 supports fractional dimensions.
        // SR announcements fire on each change so blind users hear the new volume.
        isSlider && h('div', { className: 'grid grid-cols-3 gap-3' },
          ['l','w','h'].map(function(dim) {
            var label = dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height';
            return h('div', { key: dim, className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-100' },
              h('label', { className: 'block text-xs text-emerald-700 mb-1 font-bold uppercase' }, label),
              h('input', {
                type: 'range',
                min: _v.allowFractional ? '0.5' : '1',
                max: '10',
                step: _v.allowFractional ? '0.5' : '1',
                value: dims[dim],
                onChange: function(e) {
                  var nd = Object.assign({}, dims);
                  nd[dim] = parseFloat(e.target.value);
                  var newVol = nd.l * nd.w * nd.h;
                  upd({ dims: nd, challenge: null, feedback: null, showLayers: null });
                  // Debounced SR announcement so we don't spam during rapid slider drags
                  if (window._volSrTimer) clearTimeout(window._volSrTimer);
                  window._volSrTimer = setTimeout(function() {
                    announceToSR(label + ' ' + nd[dim] + '. Volume now ' + (Math.round(newVol * 100) / 100) + ' cubic units.');
                  }, 350);
                  if (nd.l === 10 && nd.w === 10 && nd.h === 10) checkBadges({ dimensionKing: true });
                },
                'aria-label': label + ' slider, currently ' + dims[dim] + ', volume ' + volume + ' cubic units',
                'aria-valuenow': dims[dim],
                'aria-valuemin': _v.allowFractional ? 0.5 : 1,
                'aria-valuemax': 10,
                className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
              }),
              h('div', { className: 'text-center text-lg font-bold text-emerald-700 mt-1' }, dims[dim])
            );
          })
        ),

        // Freeform instructions
        !isSlider && h('div', { className: 'flex items-center gap-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
          h('p', { className: 'text-xs text-indigo-600 flex-1' }, '\uD83D\uDC49 Click grid to place cubes \u2022 Click cube to remove \u2022 Click above to stack'),
          h('button', { 'aria-label': 'Undo last placement (U)',
            onClick: doUndo,
            disabled: !undoStack.length,
            title: 'Undo (U) \u2014 ' + undoStack.length + ' step' + (undoStack.length === 1 ? '' : 's') + ' available',
            className: 'px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-40 border border-amber-300'
          }, '\u21B6 Undo (' + undoStack.length + ')'),
          h('button', { 'aria-label': 'Clear All',
            onClick: function() { pushUndo(); upd({ positions: [], builderChallenge: null, builderFeedback: null }); announceToSR('Cleared all cubes'); },
            className: 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300'
          }, '\u21BA Clear All')
        ),

        // 3D viewport — pointer events (mouse + touch + pen), pinch-to-zoom,
        // keyboard rotation. tabIndex=0 makes it focusable for keyboard users.
        h('div', {
          className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none focus:outline-none focus:ring-2 focus:ring-emerald-400',
          style: { minHeight: '350px', perspective: '900px', touchAction: 'none' },
          tabIndex: 0,
          role: 'application',
          'aria-label': 'Interactive 3D viewport. Drag, swipe, or use arrow keys to rotate. Pinch or +/- to zoom. R to reset view.',
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerUp,
          onKeyDown: handleViewportKeyDown,
          onWheel: function(e) { upd({ scale: Math.max(0.4, Math.min(2.5, scale + (e.deltaY > 0 ? -0.08 : 0.08))) }); }
        }, h('div', {
          style: {
            transformStyle: 'preserve-3d',
            transform: 'rotateX('+rotation.x+'deg) rotateY('+rotation.y+'deg) scale3d('+scale+','+scale+','+scale+')',
            transition: 'transform 0.15s ease-out',
            position: 'relative', width: fw+'px', height: fh+'px'
          }
        }, cubes)),

        // Layer slider (slider mode)
        isSlider && h('div', { className: 'flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100' },
          h('span', { className: 'text-xs font-bold text-emerald-700' }, 'Layers:'),
          h('input', {
            type: 'range', 'aria-label': 'Volume slider', min: '1', max: dims.h,
            value: showLayers != null ? showLayers : dims.h,
            onChange: function(e) {
              var lv = parseInt(e.target.value);
              upd({ showLayers: lv, layerUsed: true });
              if (!badges.layerMaster) checkBadges({ layerMaster: true });
            },
            'aria-label': 'Visible layers',
            className: 'flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
          }),
          h('span', { className: 'text-xs font-mono text-emerald-600' },
            (showLayers != null ? showLayers : dims.h) + ' / ' + dims.h)
        ),

        // Shape selector (slider mode only) — prism / cylinder / cone / pyramid
        isSlider && h('div', { className: 'bg-white rounded-xl p-2 border border-emerald-200' },
          h('div', { className: 'flex items-center gap-1 flex-wrap', role: 'radiogroup', 'aria-label': 'Shape selector' },
            h('span', { className: 'text-[11px] font-bold text-emerald-700 mr-1' }, '🔷 Shape:'),
            SHAPES_META.map(function(s) {
              var active = shape === s.id;
              return h('button', {
                key: 's-' + s.id,
                role: 'radio',
                'aria-checked': active,
                onClick: function() {
                  playSound('place');
                  upd({ shape: s.id });
                  announceToSR(s.label + ' selected. Formula ' + s.formula);
                },
                title: s.formula,
                className: 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ' +
                  (active ? 'bg-emerald-700 text-white border-emerald-700 shadow-inner' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50')
              }, s.icon + ' ' + s.label);
            })
          ),
          shape !== 'prism' && h('p', { className: 'mt-1.5 text-[10px] text-emerald-600 italic' },
            '⚠ Visual is a voxel approximation (built from unit cubes). The formula ',
            h('span', { className: 'font-mono font-bold text-emerald-800' }, (SHAPES_META.find(function(m) { return m.id === shape; }) || {}).formula),
            ' gives the exact analytic volume = ',
            h('span', { className: 'font-bold text-emerald-800' }, formatVolumeWithUnit(analyticVolume(shape, dims.l, dims.w, dims.h)))
          ),
          // ── Formula breakdown: shows the formula with current dimensions plugged in ──
          (function() {
            var sf = SHAPES_META.find(function(m) { return m.id === shape; });
            if (!sf) return null;
            var L = dims.l, W = dims.w, H = dims.h;
            var rx = (L / 2).toFixed(L % 2 === 0 ? 0 : 1);
            var ry = (W / 2).toFixed(W % 2 === 0 ? 0 : 1);
            var rAvg = ((L + W) / 4).toFixed(2);
            var stepStr, resultStr;
            if (shape === 'prism') {
              stepStr = 'V = ' + L + ' × ' + W + ' × ' + H;
              resultStr = (L * W * H).toFixed(0);
            } else if (shape === 'cylinder') {
              stepStr = L === W
                ? 'V = π × (' + rx + ')² × ' + H
                : 'V = π × ' + rx + ' × ' + ry + ' × ' + H + '  (elliptical base)';
              resultStr = (Math.PI * (L / 2) * (W / 2) * H).toFixed(2);
            } else if (shape === 'cone') {
              stepStr = L === W
                ? 'V = ⅓ × π × (' + rx + ')² × ' + H
                : 'V = ⅓ × π × ' + rx + ' × ' + ry + ' × ' + H;
              resultStr = ((1 / 3) * Math.PI * (L / 2) * (W / 2) * H).toFixed(2);
            } else if (shape === 'pyramid') {
              stepStr = 'V = ⅓ × ' + L + ' × ' + W + ' × ' + H;
              resultStr = ((1 / 3) * L * W * H).toFixed(2);
            } else {
              return null;
            }
            return h('div', {
              className: 'mt-2 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 font-mono text-[11px] text-emerald-900',
              role: 'note',
              'aria-label': 'Formula with dimensions substituted'
            },
              h('span', { className: 'font-bold text-emerald-700 mr-2' }, sf.formula),
              h('span', { className: 'text-emerald-600' }, '→ '),
              h('span', { className: 'text-emerald-800' }, stepStr),
              h('span', { className: 'text-emerald-600 mx-1' }, '='),
              h('span', { className: 'font-extrabold text-emerald-900' }, resultStr),
              h('span', { className: 'text-emerald-700 ml-1 not-italic' }, ' cubic units')
            );
          })()
        ),

        // Net visualization + same-volume comparison + cross-section toggles
        // (slider + word modes — rectangular prism only for net/compare)
        isSlider && h('div', { className: 'flex items-center gap-2 flex-wrap' },
          shape === 'prism' && h('button', {
            onClick: function() {
              playSound('place');
              upd({ showNet: !showNet });
              if (!badges.netArchitect) checkBadges({ netArchitect: true });
            },
            'aria-pressed': showNet,
            'aria-label': showNet ? 'Hide net view' : 'Show net (unfolded prism)',
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ' +
              (showNet ? 'bg-emerald-700 text-white border-emerald-700 shadow-inner' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50')
          }, showNet ? '🗺 Hide net' : '🗺 Show net (unfolded faces)'),
          shape === 'prism' && h('button', {
            onClick: function() {
              playSound('place');
              upd({ showCompare: !showCompare });
              if (!badges.shapeEfficient) checkBadges({ shapeEfficient: true });
            },
            'aria-pressed': showCompare,
            'aria-label': showCompare ? 'Hide same-volume comparison' : 'Show same-volume comparison',
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ' +
              (showCompare ? 'bg-emerald-700 text-white border-emerald-700 shadow-inner' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50')
          }, showCompare ? '⚖️ Hide compare' : '⚖️ Same volume, different shape'),
          h('button', {
            onClick: function() {
              playSound('place');
              upd({ showCrossSection: !showCrossSection });
            },
            'aria-pressed': showCrossSection,
            'aria-label': showCrossSection ? 'Hide cross-section slice' : 'Show cross-section slice',
            title: 'Slice horizontally to see the area-times-depth relationship',
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ' +
              (showCrossSection ? 'bg-rose-700 text-white border-rose-700 shadow-inner' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')
          }, showCrossSection ? '✂ Hide cross-section' : '✂ Cross-section slice')
        ),
        // Cross-section slice slider
        isSlider && showCrossSection && h('div', { className: 'bg-rose-50 rounded-lg p-2 border border-rose-200' },
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-[11px] font-bold text-rose-700' }, '✂ Cut at layer:'),
            h('input', {
              type: 'range', min: '0', max: Math.max(0, Math.ceil(dims.h) - 1),
              value: Math.min(crossSectionLayer, Math.ceil(dims.h) - 1),
              onChange: function(e) {
                var v = parseInt(e.target.value);
                upd({ crossSectionLayer: v });
                announceToSR('Cross-section at layer ' + v);
              },
              'aria-label': 'Cross-section layer position',
              className: 'flex-1 h-1.5 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600'
            }),
            h('span', { className: 'text-xs font-mono text-rose-700 w-12 text-right' }, Math.min(crossSectionLayer, Math.ceil(dims.h) - 1) + ' / ' + (Math.ceil(dims.h) - 1))
          ),
          h('p', { className: 'mt-1 text-[10px] text-rose-700 italic' },
            '💡 The cut face at layer ' + Math.min(crossSectionLayer, Math.ceil(dims.h) - 1) + ' has area = ',
            h('span', { className: 'font-mono font-bold' }, (shape === 'prism' ? (dims.l * dims.w) : '~' + voxelizeShape(shape, dims.l, dims.w, dims.h).filter(function(v) { return v.z === Math.min(crossSectionLayer, Math.ceil(dims.h) - 1); }).length)),
            ' square units. Volume = (cross-section area) × (depth) is the foundation of integral calculus.'
          )
        ),
        // When showNet is on AND the user has clicked "interactive", we render
        // the fold-animating version. Otherwise we render the static SVG net.
        isSlider && shape === 'prism' && showNet && (function() {
          var interactive = _v.netInteractive || false;
          return h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-2 justify-end' },
              h('button', {
                onClick: function() { upd({ netInteractive: !interactive, netFold: 0 }); },
                'aria-pressed': interactive,
                className: 'text-[11px] font-bold px-2 py-1 rounded border ' +
                  (interactive ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50')
              }, interactive ? '✓ Interactive net (foldable)' : '⊞ Switch to interactive net')
            ),
            interactive ? renderInteractiveNet() : renderNet()
          );
        })(),
        isSlider && shape === 'prism' && showCompare && renderCompare(),

        // Stats
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-xl p-3 border border-emerald-100 text-center flex flex-col items-center justify-center' },
            h('div', { className: 'text-xs font-bold text-emerald-600 uppercase mb-1' }, 'Volume'),
            h('div', { className: 'text-xl font-bold text-emerald-800' },
              isSlider && !challenge ? h('div', { className: 'flex flex-col items-center gap-1' },
                h('div', { className: 'text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200' },
                  'Area of Base ('+dims.l+'\u00d7'+dims.w+') = ' + (dims.l * dims.w)),
                h('div', { className: 'whitespace-nowrap' },
                  (dims.l * dims.w) + ' \u00d7 Height ('+dims.h+') = ',
                  h('span', { className: 'text-2xl text-emerald-600' }, volume))
              ) : h('span', null,
                h('span', { className: 'text-2xl text-emerald-600' },
                  (isSlider && challenge && !feedback) ? '?' :
                  (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? '?' : volume))
            ),
            (isSlider && challenge && !feedback) ? null :
            (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? null :
            h('div', { className: 'text-xs text-slate-600' }, volume + ' unit cube' + (volume !== 1 ? 's' : ''))
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-teal-100 text-center' },
            h('div', { className: 'text-xs font-bold text-teal-600 uppercase mb-1' }, 'Surface Area'),
            h('div', { className: 'text-xl font-bold text-teal-800' },
              'SA = ', h('span', { className: 'text-2xl text-teal-600' },
                (isSlider && challenge && !feedback) ? '?' :
                (!isSlider && builderChallenge && builderChallenge.type === 'volume') ? '?' : surfaceArea)),
            isSlider && !challenge && h('div', { className: 'text-xs text-slate-600' },
              '2('+dims.l+'\u00d7'+dims.w+' + '+dims.l+'\u00d7'+dims.h+' + '+dims.w+'\u00d7'+dims.h+')')
          )
        ),

        // === H7b'' inquiry widget: volume predictor ===
        (function() {
          var iq = _v._volPred || { lpred: 3, wpred: 3, hpred: 3, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd({ _volPred: Object.assign({}, iq, patch) }); }
          var predicted = iq.lpred * iq.wpred * iq.hpred;
          var actual = (dims.l || 1) * (dims.w || 1) * (dims.h || 1);
          var diff = Math.abs(predicted - actual);
          var state = diff < 2 ? 'close' : (diff < 8 ? 'mid' : 'far');
          var sm = {
            close: { label: '🎯 Close match', color: '#059669', bg: '#ecfdf5', border: '#86efac' },
            mid:   { label: '🟡 In the ballpark', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
            far:   { label: '🔴 Far off', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
          }[state];
          return h('div', { className: 'mt-3 mb-3 p-3 rounded-xl bg-white border border-indigo-200' },
            h('h4', { className: 'text-sm font-black text-indigo-700 mb-1' }, '📊 Volume predictor — sense-check'),
            h('p', { className: 'text-[11px] text-slate-700 mb-2 leading-relaxed' }, 'Adjust your PREDICTED dimensions, compare to actual prism. Discrete outcome: close/mid/far. No score, no reveal.'),
            h('div', { className: 'mb-2 p-2 rounded text-center', style: { background: sm.bg, border: '1px solid ' + sm.border } },
              h('div', { className: 'text-sm font-black', style: { color: sm.color } }, sm.label),
              h('div', { className: 'text-[10px] text-slate-700 font-mono mt-1' }, 'Pred: ' + iq.lpred + '×' + iq.wpred + '×' + iq.hpred + ' = ' + predicted + '   |   Actual: ' + actual)
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
              [{ k: 'lpred', l: 'L pred' }, { k: 'wpred', l: 'W pred' }, { k: 'hpred', l: 'H pred' }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'vp-' + s.k, className: 'block text-[10px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-indigo-700' }, iq[s.k])),
                  h('input', { id: 'vp-' + s.k, type: 'range', min: 1, max: 10, step: 1, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l }));
              })
            ),
            h('div', { className: 'flex gap-2 items-center flex-wrap mb-2' },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ p: predicted, a: actual, st: state }]).slice(-8) }); }, className: 'px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-300' }, '📋 Log'),
              h('button', { onClick: function() { setIQ({ lpred: 3, wpred: 3, hpred: 3, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-300' }, '↺ Reset'),
              (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: 'Hypothesis: How do you build intuition for predicting volume?',
              className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug mb-2', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-300 mb-2' }, '🤔 Stuck — show open prompts'),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700 leading-relaxed mb-2' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, 'Which dimension affects volume the most?'),
                h('li', null, 'Try halving one dimension — what happens to volume?'),
                h('li', null, 'When are predictions hardest? When easiest?'))),
            h('label', { className: 'flex items-center gap-1 text-[11px] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
              'I understand — explain in own words'),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: 'Explain how each dimension contributes to total volume.',
              className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
            h('div', { className: 'mt-2 text-[9px] italic text-slate-500' }, 'Design note: discrete 3-state outcome; no exact-volume score; no reveal — by design.')
          );
        })(),

        // Challenge buttons (skip in word mode — it has its own challenge built in)
        !isWord && h('div', { className: 'flex gap-2 flex-wrap' },
          mode === 'slider' ? h(React.Fragment, null,
            h('button', { 'aria-label': 'Random Challenge',
              onClick: function() {
                var l = Math.floor(Math.random()*8)+1, w = Math.floor(Math.random()*6)+1, hh = Math.floor(Math.random()*6)+1;
                upd({ dims: {l:l,w:w,h:hh}, challenge: {l:l,w:w,h:hh,answer:l*w*hh}, answer: '', feedback: null, showLayers: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md',
              title: 'New challenge (N)'
            }, '\uD83C\uDFB2 Random Challenge'),
            h('button', { 'aria-label': 'Reset',
              onClick: function() { upd({ dims: {l:3,w:2,h:2}, challenge: null, feedback: null, showLayers: null, rotation: {x:-25,y:-35}, scale: 1.0 }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300'
            }, '\u21BA Reset')
          ) : h(React.Fragment, null,
            h('button', { 'aria-label': 'Build Prism',
              onClick: function() {
                var pl=2+Math.floor(Math.random()*4), pw=2+Math.floor(Math.random()*3), ph=1+Math.floor(Math.random()*3);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'prism',target:{l:pl,w:pw,h:ph},answer:pl*pw*ph}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
            }, '\uD83C\uDFD7\uFE0F Build Prism'),
            h('button', { 'aria-label': 'L-Block Vol',
              onClick: function() {
                var lb = generateLBlock();
                upd({ mode: 'freeform', positions: lb.positions, builderChallenge: {type:'volume',answer:lb.volume,shape:'L-Block'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'
            }, '\uD83D\uDCD0 L-Block Vol'),
            h('button', { 'aria-label': 'Random Vol',
              onClick: function() {
                var tv = 5+Math.floor(Math.random()*16);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'volume',answer:tv,shape:'any'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Random Vol'),
            h('button', { 'aria-label': 'Open buildable challenges library',
              onClick: function() { upd({ showBuildLibrary: !showBuildLibrary, mode: 'freeform' }); },
              'aria-expanded': showBuildLibrary,
              title: 'Browse named structures to build',
              className: 'flex-1 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-fuchsia-600 transition-all shadow-md'
            }, '\uD83D\uDCDA Library')
          )
        ),

        // \u2500\u2500 Buildable challenge library panel \u2500\u2500
        !isWord && showBuildLibrary && h('div', { className: 'bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-3 border-2 border-pink-200 space-y-2' },
          h('div', { className: 'flex items-center justify-between' },
            h('p', { className: 'text-sm font-bold text-pink-800' }, '\uD83D\uDCDA Buildable challenges \u2014 pick a structure to try'),
            h('button', { onClick: function() { upd({ showBuildLibrary: false }); }, 'aria-label': 'Close library', className: 'text-xs text-pink-600 hover:text-pink-800' }, '\u00D7')
          ),
          h('p', { className: 'text-[11px] text-pink-700 italic' },
            'Click a name to set it as your target \u2014 the cubes will appear as ghost outlines. Match the shape, then Check.'
          ),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            BUILD_CHALLENGES.map(function(ch) {
              return h('button', {
                key: 'bch-' + ch.id,
                onClick: function() {
                  // Set the challenge as a custom prism-like target where the
                  // student must place exactly these positions. We reuse the
                  // existing prism-ghost rendering by making target dims that
                  // bound the positions, then validate by exact position match.
                  pushUndo();
                  playSound('place');
                  upd({
                    mode: 'freeform',
                    positions: [],
                    builderChallenge: { type: 'volume', answer: ch.targetVolume, shape: ch.label, library: ch.id, libraryPositions: ch.positions, libraryDesc: ch.desc },
                    builderFeedback: null,
                    challenge: null,
                    feedback: null,
                    showBuildLibrary: false
                  });
                  announceToSR('Challenge: ' + ch.label + '. ' + ch.desc);
                },
                title: ch.desc,
                className: 'text-left p-2 bg-white rounded-lg border border-pink-200 hover:border-pink-500 hover:shadow-md transition-all'
              },
                h('div', { className: 'text-base font-bold text-pink-800' }, ch.icon + ' ' + ch.label),
                h('div', { className: 'text-[10px] text-pink-700 mt-0.5' }, 'V = ' + ch.targetVolume + ' cubes'),
                h('div', { className: 'text-[10px] text-pink-600 italic mt-0.5 line-clamp-2' }, ch.desc)
              );
            })
          )
        ),

        // Show library-challenge hint when one is active
        !isSlider && builderChallenge && builderChallenge.library && h('div', { className: 'bg-pink-50 rounded-lg p-2 border border-pink-200' },
          h('p', { className: 'text-[11px] text-pink-800' },
            '\uD83D\uDCDA Building: ', h('b', null, builderChallenge.shape),
            ' \u00B7 Target V = ', h('b', null, builderChallenge.answer),
            ' \u00B7 ', h('span', { className: 'italic' }, builderChallenge.libraryDesc),
            h('button', {
              onClick: function() {
                pushUndo();
                playSound('place');
                upd({ positions: builderChallenge.libraryPositions.slice() });
                announceToSR('Solution shown');
              },
              title: 'Reveal the solution (gives up \u2014 no badge)',
              className: 'ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white text-pink-700 border border-pink-300 hover:bg-pink-100'
            }, '\uD83D\uDC40 Show solution')
          )
        ),

        // Challenge input (slider mode)
        isSlider && challenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
          h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83E\uDD14 What is the volume?'),
          h('div', { className: 'flex gap-2 items-center' },
            h('input', {
              type: 'number', value: answer,
              onChange: function(e) { upd({ answer: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
              placeholder: 'V = ?', 'aria-label': 'Volume answer', className: 'flex-1 px-3 py-2 border border-amber-600 rounded-lg text-sm font-mono'
            }),
            h('button', { 'aria-label': 'Check',
              onClick: checkChallenge, disabled: !answer,
              className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm disabled:opacity-40'
            }, 'Check'),
            h('button', { onClick: askAI,
              className: 'px-3 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0')
          ),
          feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg)
        ),

        // Builder challenge (freeform mode)
        !isSlider && builderChallenge && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-800 mb-2' },
            builderChallenge.type === 'prism'
              ? '\uD83C\uDFD7\uFE0F Build a '+builderChallenge.target.l+'\u00d7'+builderChallenge.target.w+'\u00d7'+builderChallenge.target.h+' rectangular prism'
              : builderChallenge.shape === 'L-Block'
                ? '\uD83D\uDCD0 What is the volume of this L-shaped block?'
                : '\uD83C\uDFB2 Build a shape with volume = '+builderChallenge.answer
          ),
          h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-indigo-600' }, 'Cubes placed: ', h('span', { className: 'font-bold' }, posSet.size)),
            h('button', { 'aria-label': 'Hint',
              onClick: askAI,
              className: 'px-3 py-1.5 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-xs',
              title: 'Get a hint from AI'
            }, '\uD83E\uDDE0 Hint'),
            h('button', { 'aria-label': 'Check', onClick: checkChallenge, className: 'ml-auto px-4 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600' }, '\u2714 Check')
          ),
          builderFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (builderFeedback.correct ? 'text-green-600' : 'text-red-600') }, builderFeedback.msg)
        ),

        // ── v4: Tools row — units, fractional, save/load, export ──
        h('div', { className: 'bg-white rounded-xl p-3 border border-emerald-200 space-y-2' },
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            // Real-world unit selector
            h('label', { className: 'text-[11px] font-bold text-emerald-700 mr-1' }, '📏 Display as:'),
            h('select', {
              value: unitId,
              onChange: function(e) {
                upd({ unitId: e.target.value });
                announceToSR('Display unit changed to ' + (REAL_UNITS.find(function(u) { return u.id === e.target.value; }) || {}).long);
              },
              'aria-label': 'Real-world unit selector',
              className: 'text-[11px] px-2 py-1 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 font-mono'
            }, REAL_UNITS.map(function(u) {
              return h('option', { key: u.id, value: u.id, title: u.desc }, u.short + ' — ' + u.long);
            })),
            // Fractional toggle (slider mode only)
            isSlider && h('label', { className: 'flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 cursor-pointer' },
              h('input', {
                type: 'checkbox',
                checked: allowFractional,
                onChange: function(e) {
                  var on = e.target.checked;
                  upd({ allowFractional: on });
                  announceToSR(on ? 'Fractional dimensions enabled, 0.5 increments' : 'Integer dimensions only');
                },
                'aria-label': 'Allow fractional dimensions',
                className: 'accent-emerald-600'
              }),
              '½ Fractional dims'
            ),
            // Spacer
            h('div', { className: 'flex-1' }),
            // Save current construction
            h('button', {
              onClick: function() {
                if (typeof window === 'undefined' || typeof window.prompt !== 'function') return;
                var name = window.prompt('Name this construction:', 'My build ' + new Date().toLocaleDateString());
                if (name) saveCurrent(name);
              },
              'aria-label': 'Save current construction',
              title: 'Save current dims + cubes with a name',
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
            }, '💾 Save'),
            // Toggle saved-list panel
            h('button', {
              onClick: function() { upd({ showSaved: !showSaved }); },
              'aria-expanded': showSaved,
              'aria-label': 'Show saved constructions',
              title: 'Saved constructions (' + Object.keys(saved).length + ')',
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100'
            }, '📂 Load (' + Object.keys(saved).length + ')'),
            // Export PNG
            h('button', {
              onClick: function() {
                // Simple SVG export: serialize the cube grid as SVG with isometric projection.
                // Pure JS, no html2canvas dependency. Downloads as PNG via a Blob URL.
                exportConstructionPNG(positions, dims, isFreeform, unit, volume, surfaceArea);
              },
              'aria-label': 'Export current construction as PNG image',
              title: 'Download a PNG snapshot of the current build',
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
            }, '🖼 Export PNG')
          ),
          // Real-world unit display strip
          unitId !== 'unit' && h('div', { className: 'bg-emerald-50 rounded-md p-2 border border-emerald-200 text-[11px] text-emerald-800' },
            '🌍 In real-world units: Volume = ', h('b', null, formatVolumeWithUnit(volume)),
            ' · Surface area = ', h('b', null, formatVolumeWithUnit(surfaceArea).replace('cubic', 'square').replace('³', '²').replace('cm³', 'cm²').replace('in³', 'in²').replace('ft³', 'ft²').replace('m³', 'm²'))
          ),
          // Saved constructions list
          showSaved && h('div', { className: 'border-t border-emerald-100 pt-2' },
            h('p', { className: 'text-[11px] font-bold text-indigo-700 mb-1' }, '📂 Saved constructions (' + Object.keys(saved).length + '):'),
            Object.keys(saved).length === 0
              ? h('p', { className: 'text-[11px] text-slate-500 italic' }, 'Nothing saved yet. Build something and click 💾 Save.')
              : h('div', { className: 'space-y-1 max-h-48 overflow-y-auto' },
                  Object.keys(saved).sort(function(a, b) {
                    return (saved[b].createdAt || 0) - (saved[a].createdAt || 0);
                  }).map(function(name) {
                    var entry = saved[name];
                    var label = entry.mode === 'freeform'
                      ? (entry.positions.length + ' cubes')
                      : (entry.dims.l + '×' + entry.dims.w + '×' + entry.dims.h);
                    return h('div', { key: name, className: 'flex items-center gap-2 bg-indigo-50 rounded-md p-1.5 border border-indigo-100' },
                      h('span', { className: 'text-[11px] font-bold text-indigo-800 flex-1 truncate', title: name }, name),
                      h('span', { className: 'text-[10px] text-indigo-600 font-mono' }, label),
                      h('button', {
                        onClick: function() { loadSaved(name); },
                        'aria-label': 'Load ' + name,
                        title: 'Load this construction',
                        className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100'
                      }, 'Load'),
                      h('button', {
                        onClick: function() {
                          if (typeof window !== 'undefined' && window.confirm && window.confirm('Delete "' + name + '"?')) {
                            deleteSaved(name);
                          }
                        },
                        'aria-label': 'Delete ' + name,
                        title: 'Delete this construction',
                        className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                      }, '×')
                    );
                  })
                )
          )
        ),

        // ── Keyboard shortcuts legend ──
        h('div', { className: 'text-[11px] text-slate-600 text-center space-x-3' },
          h('span', null, 'S Slider'),
          h('span', null, 'F Freeform'),
          h('span', null, 'W Word'),
          h('span', null, 'N Challenge'),
          h('span', null, 'P Paint'),
          h('span', null, 'B Badges'),
          h('span', null, 'U Undo'),
          h('span', null, '↑↓←→ Rotate'),
          h('span', null, '+/- Zoom'),
          h('span', null, 'R Reset view'),
          h('span', null, '? AI')
        ),

        // ═══════════════════════════════════════════════════════
        // VOLUME FORMULAS — interactive reference panel
        // ═══════════════════════════════════════════════════════
        h('div', { className: 'mt-5 rounded-2xl border border-cyan-300 bg-white p-3 shadow-sm' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-lg' }, '📐'),
              h('h4', { className: 'text-sm font-bold text-cyan-700' }, 'Volume Formulas in Motion')
            ),
            h('span', { className: 'text-[10px] italic text-slate-600' }, '6 solids rotating with live formulas')
          ),
          h('div', { className: 'rounded-xl overflow-hidden border border-cyan-200', style: { background: '#020210', aspectRatio: '16/6' } },
            h('canvas', {
              ref: function(cvEl) {
                if (!cvEl) return;
                if (cvEl._volAnim) return;
                var c2 = cvEl.getContext('2d');
                var W = cvEl.offsetWidth || 600;
                var H = cvEl.offsetHeight || 220;
                cvEl.width = W * 2; cvEl.height = H * 2;
                c2.scale(2, 2);
                var start = performance.now();
                function drawVol() {
                  if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._volAnim); if (cvEl._volRO) cvEl._volRO.disconnect(); return; }
                  var t = (performance.now() - start) / 1000;
                  c2.fillStyle = '#020210';
                  c2.fillRect(0, 0, W, H);
                  var solids = [
                    { name: 'Cube', formula: 'V = s³', vol: '64', s: 4, color: '#7dd3fc' },
                    { name: 'Sphere', formula: 'V = ⁴⁄₃πr³', vol: '113', s: 3, color: '#a78bfa' },
                    { name: 'Cylinder', formula: 'V = πr²h', vol: '151', s: 3, color: '#f472b6' },
                    { name: 'Cone', formula: 'V = ⅓πr²h', vol: '50', s: 3, color: '#fbbf24' },
                    { name: 'Pyramid', formula: 'V = ⅓·b·h', vol: '32', s: 3, color: '#fb923c' },
                    { name: 'Prism', formula: 'V = b·h', vol: '60', s: 3, color: '#10b981' }
                  ];
                  var cols = 3, rows = 2;
                  var cellW = W / cols, cellH = H / rows;
                  solids.forEach(function(s, si) {
                    var col = si % cols;
                    var row = Math.floor(si / cols);
                    var cx = col * cellW + cellW / 2;
                    var cy = row * cellH + cellH / 2;
                    var rot = t * 0.5;
                    var sz = 25;
                    c2.save();
                    c2.translate(cx, cy - 10);
                    c2.strokeStyle = s.color; c2.lineWidth = 1.5;
                    c2.fillStyle = s.color + '40';
                    // Draw shape (simplified)
                    if (s.name === 'Cube') {
                      // Iso cube with interior Y edges so it reads as 3D, not flat hexagon
                      var pts = [];
                      var cos30 = Math.cos(Math.PI / 6 + rot);
                      pts = [
                        { x: 0, y: -sz }, { x: sz * cos30, y: -sz / 2 }, { x: sz * cos30, y: sz / 2 }, { x: 0, y: sz },
                        { x: -sz * cos30, y: sz / 2 }, { x: -sz * cos30, y: -sz / 2 }
                      ];
                      c2.beginPath();
                      pts.forEach(function(p, pi) { if (pi === 0) c2.moveTo(p.x, p.y); else c2.lineTo(p.x, p.y); });
                      c2.closePath();
                      c2.fill(); c2.stroke();
                      // Interior Y: 3 edges from the near-corner (centre) to alternating outer vertices
                      c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(pts[0].x, pts[0].y); c2.stroke();
                      c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(pts[2].x, pts[2].y); c2.stroke();
                      c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(pts[4].x, pts[4].y); c2.stroke();
                    } else if (s.name === 'Sphere') {
                      c2.beginPath();
                      c2.arc(0, 0, sz, 0, Math.PI * 2);
                      c2.fill(); c2.stroke();
                      // Equator + two phase-offset meridians for continuous spin
                      c2.beginPath();
                      c2.ellipse(0, 0, sz, sz * 0.3, 0, 0, Math.PI * 2);
                      c2.stroke();
                      c2.beginPath();
                      c2.ellipse(0, 0, sz * 0.3 * Math.abs(Math.cos(rot)), sz, 0, 0, Math.PI * 2);
                      c2.stroke();
                      c2.beginPath();
                      c2.ellipse(0, 0, sz * 0.3 * Math.abs(Math.sin(rot)), sz, 0, 0, Math.PI * 2);
                      c2.stroke();
                    } else if (s.name === 'Cylinder') {
                      c2.beginPath();
                      c2.ellipse(0, -sz, sz * 0.7, sz * 0.2, 0, 0, Math.PI * 2);
                      c2.fill(); c2.stroke();
                      c2.beginPath();
                      c2.rect(-sz * 0.7, -sz, sz * 1.4, sz * 2);
                      c2.fill(); c2.stroke();
                      c2.beginPath();
                      c2.ellipse(0, sz, sz * 0.7, sz * 0.2, 0, 0, Math.PI * 2);
                      c2.fill(); c2.stroke();
                      // Back edge: vertical seam swinging horizontally to show vertical-axis spin
                      var cylBackX = Math.sin(rot) * sz * 0.7;
                      c2.beginPath(); c2.moveTo(cylBackX, -sz); c2.lineTo(cylBackX, sz); c2.stroke();
                    } else if (s.name === 'Cone') {
                      c2.beginPath();
                      c2.moveTo(0, -sz);
                      c2.lineTo(-sz * 0.7, sz);
                      c2.lineTo(sz * 0.7, sz);
                      c2.closePath();
                      c2.fill(); c2.stroke();
                      c2.beginPath();
                      c2.ellipse(0, sz, sz * 0.7, sz * 0.2, 0, 0, Math.PI * 2);
                      c2.fill(); c2.stroke();
                      // Back ridge: line from apex to a swinging point on the base ellipse
                      var coneBackX = Math.sin(rot) * sz * 0.7;
                      c2.beginPath(); c2.moveTo(0, -sz); c2.lineTo(coneBackX, sz); c2.stroke();
                    } else if (s.name === 'Pyramid') {
                      c2.beginPath();
                      c2.moveTo(0, -sz);
                      c2.lineTo(-sz * 0.7, sz);
                      c2.lineTo(sz * 0.7, sz);
                      c2.closePath();
                      c2.fill(); c2.stroke();
                      // Two phase-offset edges from apex to swinging base points
                      // (a 4-sided pyramid has 4 apex→base edges; show 2 of them rotating)
                      var pyrX1 = Math.sin(rot) * sz * 0.7;
                      var pyrX2 = Math.sin(rot + Math.PI / 2) * sz * 0.7;
                      c2.beginPath(); c2.moveTo(0, -sz); c2.lineTo(pyrX1, sz); c2.stroke();
                      c2.beginPath(); c2.moveTo(0, -sz); c2.lineTo(pyrX2, sz); c2.stroke();
                    } else if (s.name === 'Prism') {
                      // Triangular prism: front face triangle + depth edges from each vertex
                      c2.beginPath();
                      c2.moveTo(-sz, sz / 2);
                      c2.lineTo(0, -sz / 2);
                      c2.lineTo(sz, sz / 2);
                      c2.closePath();
                      c2.fill(); c2.stroke();
                      var prismDx = Math.cos(rot) * sz * 0.35;
                      var prismDy = Math.sin(rot) * sz * 0.15;
                      var prismVerts = [
                        { x: -sz, y: sz / 2 },
                        { x: 0, y: -sz / 2 },
                        { x: sz, y: sz / 2 }
                      ];
                      // Depth edges
                      prismVerts.forEach(function(v) {
                        c2.beginPath();
                        c2.moveTo(v.x, v.y);
                        c2.lineTo(v.x + prismDx, v.y + prismDy);
                        c2.stroke();
                      });
                      // Back face outline (offset triangle)
                      c2.beginPath();
                      c2.moveTo(prismVerts[0].x + prismDx, prismVerts[0].y + prismDy);
                      c2.lineTo(prismVerts[1].x + prismDx, prismVerts[1].y + prismDy);
                      c2.lineTo(prismVerts[2].x + prismDx, prismVerts[2].y + prismDy);
                      c2.closePath();
                      c2.stroke();
                    }
                    c2.restore();
                    c2.font = 'bold 10px sans-serif'; c2.fillStyle = s.color; c2.textAlign = 'center';
                    c2.fillText(s.name, cx, cy + 24);
                    c2.font = '8px monospace'; c2.fillStyle = '#fde047';
                    c2.fillText(s.formula, cx, cy + 36);
                  });
                  cvEl._volAnim = requestAnimationFrame(drawVol);
                }
                drawVol();
                var ro = new ResizeObserver(function() {
                  W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                  cvEl.width = W * 2; cvEl.height = H * 2;
                  c2.setTransform(1, 0, 0, 1, 0, 0); c2.scale(2, 2); // reset first — scale() is cumulative
                });
                cvEl._volRO = ro; // stored so the rAF teardown can disconnect it (was leaking on unmount)
                ro.observe(cvEl);
              },
              style: { width: '100%', height: '100%', display: 'block' }
            })
          )
        )
      );
    }
  });

  // ──────────────────────────────────────────────────────────────
  // PNG EXPORT (no dependencies — pure SVG → PNG via Canvas API)
  // ──────────────────────────────────────────────────────────────
  // Renders an isometric SVG of the current construction with stats overlay,
  // converts to PNG via Image+Canvas, triggers a download. Works offline.
  // ──────────────────────────────────────────────────────────────
  function exportConstructionPNG(positions, dims, isFreeform, unit, volume, surfaceArea) {
    var cubeSize = 36;
    var cosA = Math.cos(Math.PI / 6); // 30 degrees
    var sinA = Math.sin(Math.PI / 6);

    // Build cube list — either from freeform positions or from slider dims grid
    var cubeList = [];
    if (isFreeform) {
      positions.forEach(function(pos) {
        var p = pos.split('-').map(Number);
        cubeList.push({ x: p[0], y: p[1], z: p[2] });
      });
    } else {
      for (var z = 0; z < dims.h; z++)
        for (var y = 0; y < dims.w; y++)
          for (var x = 0; x < dims.l; x++)
            cubeList.push({ x: x, y: y, z: z });
    }
    // Sort painter's-algorithm style: far cubes first
    cubeList.sort(function(a, b) {
      return (b.x + b.y - b.z * 0.5) - (a.x + a.y - a.z * 0.5);
    });

    // Compute SVG bounds
    var minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
    cubeList.forEach(function(c) {
      var px = (c.x - c.y) * cubeSize * cosA;
      var py = (c.x + c.y) * cubeSize * sinA - c.z * cubeSize;
      minPx = Math.min(minPx, px - cubeSize * cosA);
      maxPx = Math.max(maxPx, px + cubeSize * cosA);
      minPy = Math.min(minPy, py - cubeSize);
      maxPy = Math.max(maxPy, py + cubeSize);
    });
    if (cubeList.length === 0) { minPx = 0; maxPx = 200; minPy = 0; maxPy = 200; }

    var pad = 40;
    var w = (maxPx - minPx) + pad * 2;
    var h2 = (maxPy - minPy) + pad * 2 + 80; // extra room for stats line
    var ox = pad - minPx;
    var oy = pad - minPy;

    var svgParts = [];
    svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h2 + '" viewBox="0 0 ' + w + ' ' + h2 + '">');
    svgParts.push('<rect width="100%" height="100%" fill="#f8fafc"/>');
    svgParts.push('<text x="20" y="28" font-family="sans-serif" font-size="16" font-weight="bold" fill="#065f46">📦 AlloFlow Volume Explorer</text>');

    cubeList.forEach(function(c) {
      var px = (c.x - c.y) * cubeSize * cosA + ox;
      var py = (c.x + c.y) * cubeSize * sinA - c.z * cubeSize + oy + 30;
      var hue = 140 + c.z * 12;
      // Top face (diamond)
      var top = [
        [px, py - cubeSize],
        [px + cubeSize * cosA, py - cubeSize + cubeSize * sinA],
        [px, py - cubeSize + cubeSize * 2 * sinA],
        [px - cubeSize * cosA, py - cubeSize + cubeSize * sinA]
      ];
      // Left face
      var left = [
        [px - cubeSize * cosA, py - cubeSize + cubeSize * sinA],
        [px, py - cubeSize + cubeSize * 2 * sinA],
        [px, py],
        [px - cubeSize * cosA, py - cubeSize * sinA + cubeSize * sinA]
      ];
      // Right face
      var right = [
        [px + cubeSize * cosA, py - cubeSize + cubeSize * sinA],
        [px, py - cubeSize + cubeSize * 2 * sinA],
        [px, py],
        [px + cubeSize * cosA, py - cubeSize + cubeSize * sinA + cubeSize - cubeSize * sinA]
      ];
      function poly(pts, fill) {
        return '<polygon points="' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="' + fill + '" stroke="hsl(' + hue + ',60%,30%)" stroke-width="0.8"/>';
      }
      svgParts.push(poly(top,   'hsl(' + hue + ',70%,65%)'));
      svgParts.push(poly(left,  'hsl(' + hue + ',60%,45%)'));
      svgParts.push(poly(right, 'hsl(' + (hue + 10) + ',55%,55%)'));
    });

    // Stats footer
    var unitShort = (unit && unit.short) || 'unit';
    var statY = h2 - 40;
    svgParts.push('<text x="20" y="' + statY + '" font-family="monospace" font-size="13" fill="#0f172a">Volume: ' + (Math.round(volume * 100) / 100) + ' ' + unitShort + '³ &#160;·&#160; Surface area: ' + (Math.round(surfaceArea * 100) / 100) + ' ' + unitShort + '²</text>');
    svgParts.push('<text x="20" y="' + (statY + 18) + '" font-family="sans-serif" font-size="10" fill="#64748b">' + (isFreeform ? cubeList.length + ' unit cubes' : (dims.l + ' × ' + dims.w + ' × ' + dims.h + ' prism')) + ' · generated ' + new Date().toLocaleDateString() + '</text>');
    svgParts.push('</svg>');

    var svg = svgParts.join('');
    var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    // Convert SVG → PNG via canvas
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h2;
      var c2d = canvas.getContext('2d');
      c2d.fillStyle = '#f8fafc';
      c2d.fillRect(0, 0, w, h2);
      c2d.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(function(pngBlob) {
        if (!pngBlob) return;
        var pngUrl = URL.createObjectURL(pngBlob);
        var a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'alloflow-volume-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(pngUrl); }, 1000);
      }, 'image/png');
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      // Fallback: download the raw SVG
      var a = document.createElement('a');
      a.href = url;
      a.download = 'alloflow-volume-' + Date.now() + '.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  }
})();
