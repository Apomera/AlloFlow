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
//   'word' (slider with story context), and 'displacement' (graduated-cylinder
//   measurement lab). 'word' is a slider variant for layout.
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
      '.allo-vol-bg-displacement { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(2,132,199,0.13) 0%, rgba(14,116,144,0.05) 38%, rgba(255,255,255,0) 72%), linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%); border-radius: 16px; padding: 10px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-vol-cube { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // ── Sound effects ──
  var _audioCtx = null;
  var _volumeDeleteReturnEl = null;
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
  // Stable, readable defaults for the ten freeform build layers.
  var VOLUME_LAYER_COLORS = [
    '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04',
    '#16a34a', '#0891b2', '#4f46e5', '#9333ea', '#be123c'
  ];

  function normalizeVolumeLayerColor(value, layer) {
    var index = Math.max(0, Math.min(9, parseInt(layer, 10) || 0));
    var fallback = VOLUME_LAYER_COLORS[index % VOLUME_LAYER_COLORS.length];
    var candidate = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
  }

  function volumeLayerColorToHsl(value, layer) {
    var hex = normalizeVolumeLayerColor(value, layer);
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0;
    var l = (max + min) / 2;
    var s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return {
      hex: hex,
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function volumeLayerTextColor(value, layer) {
    var hex = normalizeVolumeLayerColor(value, layer);
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (r * 299 + g * 587 + b * 114) / 255000;
    return luminance > 0.58 ? '#0f172a' : '#ffffff';
  }

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


  // Specimens for the displacement lab. Introductory specimens are denser
  // than water so they can be fully submerged without a sinker correction.
  var DISPLACEMENT_OBJECTS = [
    { id: 'stone', label: 'River stone', icon: '\uD83E\uDEA8', volume: 18, mass: 47, initial: 42, note: 'An irregular solid with no useful length x width x height formula.' },
    { id: 'key', label: 'Brass key', icon: '\uD83D\uDD11', volume: 8, mass: 67, initial: 36, note: 'Small and irregular; displacement is easier than modeling every notch.' },
    { id: 'eraser', label: 'Rubber eraser', icon: '\u25B0', volume: 12, mass: 15, initial: 50, note: 'A compact classroom object that sinks when fully submerged.' },
    { id: 'clay', label: 'Clay figure', icon: '\uD83D\uDDFF', volume: 26, mass: 49, initial: 31, note: 'Its shape can change while its amount of material stays the same.' },
    { id: 'block', label: 'Acrylic block', icon: '\uD83E\uDDCA', volume: 24, mass: 29, initial: 45, formula: '4 x 3 x 2 = 24 cm\u00B3', note: 'A regular solid: compare displacement with the geometric formula.' },
    { id: 'cork', label: 'Cork stopper', icon: '\uD83E\uDEB5', volume: 20, mass: 5, initial: 38, floats: true, sinkerVolume: 6, middleOnly: true, note: 'Less dense than water, so it floats unless a sinker holds it below the surface.' }
  ];

  var CLAY_SHAPES = [
    { id: 'lump', label: 'Rounded lump', description: 'a rounded lump' },
    { id: 'patty', label: 'Flat patty', description: 'a flat patty' },
    { id: 'column', label: 'Tall column', description: 'a tall column' }
  ];

  function nextClayShapeId(currentId) {
    var currentIndex = CLAY_SHAPES.findIndex(function(shape) { return shape.id === currentId; });
    if (currentIndex < 0) currentIndex = 0;
    return CLAY_SHAPES[(currentIndex + 1) % CLAY_SHAPES.length].id;
  }



  var DISPLACEMENT_CONDITIONS = {
    careful: { label: 'Careful setup', short: 'Accurate trial', explanation: 'Eye level, no trapped air, and the object is fully submerged.' },
    bubble: { label: 'Air bubble attached', short: '+3 mL bias', explanation: 'The trapped bubble displaces water too, so the measured volume is too large.' },
    partial: { label: 'Only partly submerged', short: '60% submerged', explanation: 'Only the submerged part displaces water, so the measured volume is too small.' },
    parallax: { label: 'Eye above the meniscus', short: '+2 mL reading bias', explanation: 'Reading from an angle shifts the apparent liquid level. Read at eye level.' }
  };

  function displacementOffset(condition, objectVolume) {
    if (condition === 'bubble') return 3;
    if (condition === 'partial') return -Math.max(1, Math.round(objectVolume * 0.4));
    if (condition === 'parallax') return 2;
    return 0;
  }

  function calculateDisplacementTrial(initial, objectVolume, condition) {
    var offset = displacementOffset(condition, objectVolume);
    var measuredVolume = Math.max(0, objectVolume + offset);
    return {
      initial: initial,
      final: initial + measuredVolume,
      measuredVolume: measuredVolume,
      acceptedVolume: objectVolume,
      error: measuredVolume - objectVolume
    };
  }


  function calculateSinkerCorrectionTrial(initial, objectVolume, sinkerVolume) {
    var safeInitial = Number.isFinite(Number(initial)) ? Math.max(0, Number(initial)) : 0;
    var safeObjectVolume = Number.isFinite(Number(objectVolume)) ? Math.max(0, Number(objectVolume)) : 0;
    var safeSinkerVolume = Number.isFinite(Number(sinkerVolume)) ? Math.max(0, Number(sinkerVolume)) : 0;
    var sinkerOnly = safeInitial + safeSinkerVolume;
    var final = sinkerOnly + safeObjectVolume;
    return {
      initial: safeInitial,
      sinkerOnly: sinkerOnly,
      final: final,
      measuredVolume: final - sinkerOnly,
      acceptedVolume: safeObjectVolume,
      error: final - sinkerOnly - safeObjectVolume,
      totalDisplacement: safeSinkerVolume + safeObjectVolume
    };
  }


  function assessCylinderCapacity(initial, displacedVolume, capacity) {
    var numericCapacity = Number(capacity);
    var numericInitial = Number(initial);
    var numericDisplaced = Number(displacedVolume);
    var safeCapacity = Number.isFinite(numericCapacity) && numericCapacity > 0 ? numericCapacity : 100;
    var safeInitial = Number.isFinite(numericInitial) ? Math.max(0, numericInitial) : 0;
    var safeDisplaced = Number.isFinite(numericDisplaced) ? Math.max(0, numericDisplaced) : 0;
    var final = Math.round((safeInitial + safeDisplaced) * 100) / 100;
    var headroom = Math.round(Math.max(0, safeCapacity - safeInitial) * 100) / 100;
    var overflowAmount = Math.round(Math.max(0, final - safeCapacity) * 100) / 100;
    return {
      capacity: safeCapacity,
      initial: safeInitial,
      displacedVolume: safeDisplaced,
      final: final,
      headroom: headroom,
      overflow: overflowAmount > 0,
      overflowAmount: overflowAmount,
      readableFinal: overflowAmount > 0 ? null : final
    };
  }


  function summarizeDisplacementTrials(trials) {
    var valid = (Array.isArray(trials) ? trials : []).map(function(trial) {
      if (!trial || trial.measured == null || trial.accepted == null) return null;
      var measured = Number(trial.measured);
      var accepted = Number(trial.accepted);
      if (!Number.isFinite(measured) || !Number.isFinite(accepted)) return null;
      var storedError = trial.error == null ? NaN : Number(trial.error);
      var error = Number.isFinite(storedError) ? storedError : measured - accepted;
      error = Math.round(error * 100) / 100;
      return {
        error: error,
        absoluteError: Math.round(Math.abs(error) * 100) / 100
      };
    }).filter(Boolean);

    var count = valid.length;
    var accurate = valid.filter(function(item) { return item.absoluteError < 0.001; }).length;
    var over = valid.filter(function(item) { return item.error > 0.001; }).length;
    var under = valid.filter(function(item) { return item.error < -0.001; }).length;
    var meanError = count
      ? Math.round((valid.reduce(function(sum, item) { return sum + item.error; }, 0) / count) * 100) / 100
      : 0;
    var meanAbsoluteError = count
      ? Math.round((valid.reduce(function(sum, item) { return sum + item.absoluteError; }, 0) / count) * 100) / 100
      : 0;
    var largestAbsoluteError = count
      ? Math.max.apply(null, valid.map(function(item) { return item.absoluteError; }))
      : 0;
    var conclusion = 'Record a completed trial to compare measurement accuracy.';
    if (count && accurate === count) {
      conclusion = 'All recorded trials matched the accepted volume.';
    } else if (over && under) {
      conclusion = 'The record includes both overestimates and underestimates. Setup choices changed the direction of the error.';
    } else if (over) {
      conclusion = 'The biased trials overestimated volume. Look for trapped air or a reading taken above eye level.';
    } else if (under) {
      conclusion = 'The biased trials underestimated volume. Check whether the object was fully submerged.';
    }

    return {
      count: count,
      accurate: accurate,
      over: over,
      under: under,
      meanError: meanError,
      meanAbsoluteError: meanAbsoluteError,
      largestAbsoluteError: largestAbsoluteError,
      conclusion: conclusion
    };
  }

  // Deterministic seams for focused science tests.
  window.__alloVolumePure = {
    displacementOffset: displacementOffset,
    calculateDisplacementTrial: calculateDisplacementTrial,
    calculateSinkerCorrectionTrial: calculateSinkerCorrectionTrial,
    assessCylinderCapacity: assessCylinderCapacity,
    summarizeDisplacementTrials: summarizeDisplacementTrials,
    displacementObjects: DISPLACEMENT_OBJECTS,
    clayShapes: CLAY_SHAPES,
    nextClayShapeId: nextClayShapeId,
    layerColors: VOLUME_LAYER_COLORS,
    normalizeVolumeLayerColor: normalizeVolumeLayerColor,
    volumeLayerColorToHsl: volumeLayerColorToHsl,
    volumeLayerTextColor: volumeLayerTextColor
  };
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
    { id: 'shapeEfficient',  icon: '\u2696\uFE0F', label: 'Shape Efficient',  desc: 'Discover same-volume comparison (square-cube law)' },
    { id: 'displacementScientist', icon: '\uD83E\uDDEA', label: 'Displacement Scientist', desc: 'Complete 3 water-displacement trials' }
  ];

  window.StemLab.registerTool('volume', {
    icon: '\uD83D\uDCE6', label: '3D Volume Explorer',
    desc: 'Build 3D solids, solve volume challenges, and measure irregular objects with water displacement.',
    color: 'emerald', category: 'math',
    questHooks: [
      { id: 'solve_5', label: 'Solve 5 volume challenges', icon: '📦', check: function(d) { return ((d.score && d.score.correct) || 0) >= 5; }, progress: function(d) { return ((d.score && d.score.correct) || 0) + '/5 solved'; } },
      { id: 'word_3', label: 'Solve 3 word problems', icon: '📖', check: function(d) { return (d.wpSolved || 0) >= 3; }, progress: function(d) { return (d.wpSolved || 0) + '/3 word problems'; } },
      { id: 'displacement_3', label: 'Complete 3 displacement trials', icon: '\uD83E\uDDEA', check: function(d) { return (d.dispSolved || 0) >= 3; }, progress: function(d) { return (d.dispSolved || 0) + '/3 trials'; } },
      { id: 'build_10', label: 'Place 10 cubes in the freeform builder', icon: '🧱', check: function(d) { return (d.totalPlaced || 0) >= 10; }, progress: function(d) { return (d.totalPlaced || 0) + '/10 cubes'; } }
    ],
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var callGemini = ctx.callGemini;
      var reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      var parsedBuildLayer = parseInt(_v.activeBuildLayer, 10);
      var activeBuildLayer = Number.isFinite(parsedBuildLayer)
        ? Math.max(0, Math.min(9, parsedBuildLayer))
        : 0;
      var layerColors = Object.assign({}, _v.layerColors || {});
      var getLayerColor = function(layer) { return normalizeVolumeLayerColor(layerColors[String(layer)], layer); };

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

      // Water-displacement lab state.
      var dispLevel = _v.dispLevel || 'elementary';
      var availableDisplacementObjects = DISPLACEMENT_OBJECTS.filter(function(object) {
        return dispLevel === 'middle' || !object.middleOnly;
      });
      var requestedDispObjectId = _v.dispObjectId || 'stone';
      var dispObject = availableDisplacementObjects.find(function(o) { return o.id === requestedDispObjectId; }) || availableDisplacementObjects[0];
      var requestedClayShapeId = _v.dispClayShape || 'lump';
      var dispClayShapeIndex = CLAY_SHAPES.findIndex(function(shape) { return shape.id === requestedClayShapeId; });
      var dispClayShapeMeta = CLAY_SHAPES[dispClayShapeIndex < 0 ? 0 : dispClayShapeIndex];
      var dispClayReshaped = !!_v.dispClayReshaped;

      var dispObjectId = dispObject.id;
      var dispUsesSinker = !!dispObject.floats;
      var dispCondition = dispLevel === 'middle' && !dispUsesSinker ? (_v.dispCondition || 'careful') : 'careful';
      var dispConditionMeta = DISPLACEMENT_CONDITIONS[dispCondition] || DISPLACEMENT_CONDITIONS.careful;
      var dispCapacity = 100;
      var storedDispInitial = Number(_v.dispInitial);
      var dispInitial = dispLevel === 'middle' && Number.isFinite(storedDispInitial)
        ? Math.max(10, Math.min(90, storedDispInitial))
        : dispObject.initial;
      var dispTrial = dispUsesSinker
        ? calculateSinkerCorrectionTrial(dispInitial, dispObject.volume, dispObject.sinkerVolume)
        : calculateDisplacementTrial(dispInitial, dispObject.volume, dispCondition);
      var dispCapacityAssessment = assessCylinderCapacity(dispTrial.initial, dispTrial.final - dispTrial.initial, dispCapacity);
      var dispOverflow = dispCapacityAssessment.overflow;
      var dispBaselineReading = dispUsesSinker ? dispTrial.sinkerOnly : dispTrial.initial;
      var dispReferenceTrial = dispUsesSinker
        ? calculateSinkerCorrectionTrial(dispObject.initial, dispObject.volume, dispObject.sinkerVolume)
        : calculateDisplacementTrial(dispObject.initial, dispObject.volume, dispCondition);
      var dispReferenceBaseline = dispUsesSinker ? dispReferenceTrial.sinkerOnly : dispReferenceTrial.initial;
      var dispInitialAdjusted = dispLevel === 'middle' && Math.abs(dispTrial.initial - dispObject.initial) > 0.001;

      var dispSubmerged = !!_v.dispSubmerged;
      var dispPrediction = _v.dispPrediction || '';
      var dispAnswer = _v.dispAnswer || '';
      var dispFeedback = _v.dispFeedback || null;
      var dispSolved = _v.dispSolved || 0;
      var dispTrials = _v.dispTrials || [];
      var dispExplanation = _v.dispExplanation || '';

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
      var pendingDeleteName = _v.pendingDeleteName || null;
      var formulasPaused = !!_v.formulasPaused;
      var saveCurrent = function(name) {
        if (!name) return;
        var trimmed = String(name).trim().slice(0, 40);
        if (!trimmed) return;
        var next = Object.assign({}, saved);
        next[trimmed] = {
          positions: positions.slice(),
          dims: Object.assign({}, dims),
          mode: mode,
          layerColors: Object.assign({}, layerColors),
          activeBuildLayer: activeBuildLayer,
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
          layerColors: entry.layerColors || layerColors,
          activeBuildLayer: entry.activeBuildLayer != null ? entry.activeBuildLayer : activeBuildLayer,
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
      var requestDeleteSaved = function(name) {
        if (typeof document !== 'undefined') _volumeDeleteReturnEl = document.activeElement;
        upd({ pendingDeleteName: name });
        setTimeout(function() {
          if (typeof document === 'undefined') return;
          var cancel = document.getElementById('volume-delete-cancel');
          if (cancel) cancel.focus();
        }, 0);
      };
      var cancelDeleteSaved = function() {
        upd({ pendingDeleteName: null });
        setTimeout(function() {
          if (_volumeDeleteReturnEl && typeof _volumeDeleteReturnEl.focus === 'function') _volumeDeleteReturnEl.focus();
          _volumeDeleteReturnEl = null;
        }, 0);
      };
      var confirmDeleteSaved = function() {
        var name = pendingDeleteName;
        if (!name) return;
        deleteSaved(name);
        upd({ pendingDeleteName: null });
        announceToSR('Deleted saved construction ' + name);
        setTimeout(function() {
          if (typeof document !== 'undefined') {
            var toggle = document.getElementById('volume-saved-toggle');
            if (toggle) toggle.focus();
          }
          _volumeDeleteReturnEl = null;
        }, 0);
      };
      var handleDeleteDialogKeyDown = function(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancelDeleteSaved(); return; }
        if (e.key !== 'Tab' || typeof document === 'undefined') return;
        var cancel = document.getElementById('volume-delete-cancel');
        var confirm = document.getElementById('volume-delete-confirm');
        if (!cancel || !confirm) return;
        if (e.shiftKey && document.activeElement === cancel) { e.preventDefault(); confirm.focus(); }
        else if (!e.shiftKey && document.activeElement === confirm) { e.preventDefault(); cancel.focus(); }
      };
      var renderDeleteDialog = function() {
        return h('div', {
            onClick: function(e) { if (e.target === e.currentTarget) cancelDeleteSaved(); },
            className: 'fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 p-5'
          },
          h('div', { id: 'volume-delete-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'volume-delete-title', 'aria-describedby': 'volume-delete-description',
              onKeyDown: handleDeleteDialogKeyDown,
              className: 'w-full max-w-md rounded-2xl border-2 border-rose-400 bg-white p-5 shadow-2xl' },
            h('h2', { id: 'volume-delete-title', className: 'text-xl font-black text-rose-900' }, 'Delete saved construction?'),
            h('p', { id: 'volume-delete-description', className: 'mt-2 text-sm leading-relaxed text-slate-700' },
              '"' + pendingDeleteName + '" will be permanently removed from your saved constructions.'),
            h('div', { className: 'mt-5 flex flex-wrap justify-end gap-2' },
              h('button', { id: 'volume-delete-cancel', type: 'button', onClick: cancelDeleteSaved,
                className: 'min-h-11 rounded-lg border-2 border-slate-400 bg-white px-4 py-2 font-bold text-slate-800' }, 'Keep construction'),
              h('button', { id: 'volume-delete-confirm', type: 'button', onClick: confirmDeleteSaved,
                className: 'min-h-11 rounded-lg bg-rose-700 px-4 py-2 font-black text-white' }, 'Delete construction'))));
      };

      // Real-world unit mapping: lets students see "8 cubic feet" instead of
      // just "8 cubic units." Each unit has a label and a conversion to liters
      // (a universal volume reference) for cross-unit comparison.
      var REAL_UNITS = [
        { id: 'unit', short: 'unit', long: 'cubic unit',     toL: 1,         desc: __alloT('stem.volume.abstract_units_default', 'Abstract units (default)') },
        { id: 'cm',   short: 'cm³',  long: 'cubic cm',       toL: 0.001,     desc: __alloT('stem.volume.centimeters_small_objects', 'Centimeters (small objects)') },
        { id: 'in',   short: 'in³',  long: 'cubic inch',     toL: 0.01639,   desc: __alloT('stem.volume.inches_us_customary', 'Inches (US customary)') },
        { id: 'ft',   short: 'ft³',  long: 'cubic foot',     toL: 28.3168,   desc: __alloT('stem.volume.feet_rooms_furniture', 'Feet (rooms, furniture)') },
        { id: 'm',    short: 'm³',   long: 'cubic meter',    toL: 1000,      desc: __alloT('stem.volume.meters_cars_pools', 'Meters (cars, pools)') }
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
        { id: 'prism',    icon: '📦', label: __alloT('stem.volume.rectangular_prism', 'Rectangular prism'), formula: 'V = l × w × h' },
        { id: 'cylinder', icon: '🥫', label: __alloT('stem.volume.cylinder', 'Cylinder'),          formula: 'V = π·r²·h' },
        { id: 'cone',     icon: '🍦', label: __alloT('stem.volume.cone', 'Cone'),              formula: 'V = ⅓·π·r²·h' },
        { id: 'pyramid',  icon: '🔺', label: __alloT('stem.volume.square_pyramid', 'Square pyramid'),    formula: 'V = ⅓·l·w·h' }
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
      var isDisplacement = mode === 'displacement';
      var isSlider = mode === 'slider' || isWord;
      var isFreeform = mode === 'freeform';
      var toggleFreeformCube = function(x, y, z) {
        var key = x + '-' + y + '-' + z;
        var removing = posSet.has(key);
        var nextPositions = removing
          ? positions.filter(function(pos) { return pos !== key; })
          : positions.concat([key]);
        var nextUndo = undoStack.concat([positions.slice()]);
        if (nextUndo.length > 30) nextUndo = nextUndo.slice(nextUndo.length - 30);
        var patch = { positions: nextPositions, undoStack: nextUndo };
        if (!removing) patch.totalPlaced = totalPlaced + 1;
        upd(patch);
        playSound(removing ? 'remove' : 'place');
        announceToSR(
          (removing ? 'Removed' : 'Placed') +
          ' cube at column ' + (x + 1) +
          ', row ' + (y + 1) +
          ', layer ' + (z + 1) + '.'
        );
        if (!removing) {
          checkBadges({ bigBuilder: nextPositions.length >= 20, centurion: totalPlaced + 1 >= 100 });
        }
      };
      var volume = isDisplacement ? (dispSubmerged ? dispTrial.measuredVolume : 0)
        : (isSlider ? dims.l * dims.w * dims.h : posSet.size);
      var surfaceArea = isDisplacement ? 0 : (isSlider
        ? 2 * (dims.l * dims.w + dims.l * dims.h + dims.w * dims.h)
        : getSA(posSet));
      var cubeUnit = isSlider
        ? Math.max(18, Math.min(36, 240 / Math.max(dims.l, dims.w, dims.h)))
        : 30;

      // ── 3D Cube rendering ──
      var renderCube = function(x, y, z, hue, lt, unit, clickable, onClick, isGhost, satOverride, layerColor) {
        var isPaint = paintSurfaceArea && !isGhost;
        var actHue = isPaint ? 25 : hue;
        var sat = isPaint ? 90 : (satOverride != null ? satOverride : 70);
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
          'data-volume-cube': isGhost ? undefined : 'true',
          'data-volume-layer': isGhost ? undefined : String(z),
          'data-volume-layer-color': !isGhost && layerColor ? layerColor : undefined,
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
          var layerTone = volumeLayerColorToHsl(getLayerColor(p[2]), p[2]);
          cubes.push(renderCube(p[0], p[1], p[2], layerTone.h, layerTone.l, cubeUnit, true, function() {
            toggleFreeformCube(p[0], p[1], p[2]);
          }, false, layerTone.s, layerTone.hex));
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
                    toggleFreeformCube(fx, fy, 0);
                  },
                  style: {
                    position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                    transform: 'translate3d('+fx*cubeUnit+'px,0px,'+fy*cubeUnit+'px) rotateX(90deg)',
                    background: getLayerColor(0) + '33', border: '2px dashed ' + getLayerColor(0) + 'bb',
                    boxSizing: 'border-box', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: volumeLayerTextColor(getLayerColor(0), 0), fontWeight: 900
                  }
                }, h('span', { 'aria-hidden': 'true' }, '+')));
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
                  toggleFreeformCube(ax, ay, az);
                },
                style: {
                  position: 'absolute', width: cubeUnit+'px', height: cubeUnit+'px',
                  transform: 'translate3d('+ax*cubeUnit+'px,'+-az*cubeUnit+'px,'+ay*cubeUnit+'px)',
                  transformStyle: 'preserve-3d', cursor: 'pointer', zIndex: 10
                }
              }, h('div', { style: {
                position: 'absolute', width: '100%', height: cubeUnit+'px',
                transform: 'rotateX(90deg) translateZ('+cubeUnit/2+'px)',
                background: getLayerColor(az) + '33', border: '2px dashed ' + getLayerColor(az) + 'bb', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: volumeLayerTextColor(getLayerColor(az), az), fontWeight: 900
              }}, h('span', { 'aria-hidden': 'true' }, '+'))));
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
          id: 'staircase', icon: '🪜', label: __alloT('stem.volume.staircase_4_steps', 'Staircase (4 steps)'),
          desc: __alloT('stem.volume.4_steps_of_decreasing_size_v_4_3_2_1_1', '4 steps of decreasing size. V = 4 + 3 + 2 + 1 = 10 cubes.'),
          positions: ['0-0-0','1-0-0','2-0-0','3-0-0','0-1-0','1-1-0','2-1-0','3-1-0','0-0-1','1-0-1','2-0-1','0-1-1','1-1-1','2-1-1','0-0-2','1-0-2','0-1-2','1-1-2','0-0-3','0-1-3'],
          targetVolume: 20
        },
        {
          id: 'pyramid', icon: '🔺', label: __alloT('stem.volume.step_pyramid', 'Step pyramid'),
          desc: __alloT('stem.volume.a_3_tier_step_pyramid_v_9_4_1_14_cubes', 'A 3-tier step pyramid. V = 9 + 4 + 1 = 14 cubes.'),
          positions: ['0-0-0','1-0-0','2-0-0','0-1-0','1-1-0','2-1-0','0-2-0','1-2-0','2-2-0','0-0-1','1-0-1','0-1-1','1-1-1','0-0-2'],
          targetVolume: 14
        },
        {
          id: 'fortress', icon: '🏰', label: __alloT('stem.volume.hollow_fortress', 'Hollow fortress'),
          desc: __alloT('stem.volume.a_4_4_base_with_hollow_interior_wall_t', 'A 4×4 base with hollow interior — wall thickness 1. Counts the wall cubes only.'),
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
          id: 'bridge', icon: '🌉', label: __alloT('stem.volume.bridge', 'Bridge'),
          desc: __alloT('stem.volume.two_pillars_connected_by_a_deck_v_6_6_', 'Two pillars connected by a deck — V = 6 + 6 + 5 = 17.'),
          positions: ['0-0-0','0-1-0','0-0-1','0-1-1','0-0-2','0-1-2','4-0-0','4-1-0','4-0-1','4-1-1','4-0-2','4-1-2','0-0-3','1-0-3','2-0-3','3-0-3','4-0-3','0-1-3','1-1-3','2-1-3','3-1-3','4-1-3'],
          targetVolume: 22
        },
        {
          id: 'tower', icon: '🗼', label: __alloT('stem.volume.tower_eiffel_ish', 'Tower (Eiffel-ish)'),
          desc: __alloT('stem.volume.tapering_tower_each_level_smaller_than', 'Tapering tower. Each level smaller than the last.'),
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
          id: 'plus', icon: '➕', label: __alloT('stem.volume.plus_sign', 'Plus sign'),
          desc: __alloT('stem.volume.5_cube_plus_shape_1_layer_v_5', '5-cube plus shape, 1 layer. V = 5.'),
          positions: ['1-0-0','0-1-0','1-1-0','2-1-0','1-2-0'],
          targetVolume: 5
        },
        {
          id: 'arch', icon: '🌈', label: __alloT('stem.volume.archway', 'Archway'),
          desc: __alloT('stem.volume.a_simple_arch_over_an_opening', 'A simple arch over an opening.'),
          positions: ['0-0-0','0-0-1','0-0-2','3-0-0','3-0-1','3-0-2','0-0-3','1-0-3','2-0-3','3-0-3'],
          targetVolume: 10
        },
        {
          id: 'house', icon: '🏠', label: __alloT('stem.volume.simple_house', 'Simple house'),
          desc: __alloT('stem.volume.walls_flat_roof_v_4_4_base_wall_roof', 'Walls + flat roof. V = 4×4 base wall + roof.'),
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

      // ── Misconception diagnosis for V = l×w×h answers ──
      // A wrong number usually reveals WHICH formula got mixed up: adding the
      // dimensions, multiplying only two of them, or computing surface area.
      // Naming that beats re-printing the formula.
      var diagnoseVolumeError = function(l, w, hh, ans) {
        var correct = l * w * hh;
        if (isNaN(ans)) return 'Type your answer as a number first.';
        if (ans === l + w + hh) return 'You ADDED the three dimensions (' + l + '+' + w + '+' + hh + '). Volume multiplies them — each layer holds ' + (l * w) + ' cubes, stacked ' + hh + ' high: ' + correct + '.';
        if (ans === l * w || ans === l * hh || ans === w * hh) return 'That is the area of ONE FACE — only two dimensions multiplied. Volume needs all three: the ' + l + '×' + w + ' base layer, stacked ' + hh + ' high = ' + correct + '.';
        if (ans === 2 * (l * w + l * hh + w * hh)) return 'That is the SURFACE AREA — the wrapping paper around the box. Volume counts the cubes INSIDE: ' + l + ' × ' + w + ' × ' + hh + ' = ' + correct + '.';
        if (ans === correct / hh * (hh - 1) || ans === correct / hh * (hh + 1)) return 'So close — you are off by exactly one LAYER. Each layer has ' + (l * w) + ' cubes and there are ' + hh + ' layers: ' + correct + '.';
        return 'Build it in layers: the bottom layer is ' + l + ' × ' + w + ' = ' + (l * w) + ' cubes, and there are ' + hh + ' layers — ' + (l * w) + ' × ' + hh + ' = ' + correct + '.';
      };

      // ── Check challenge ──
      var checkChallenge = function() {
        if (isSlider && challenge) {
          var ans = parseInt(answer);
          var ok = ans === challenge.answer;
          var sliderFb = ok ? '' : diagnoseVolumeError(challenge.l, challenge.w, challenge.h, ans);
          announceToSR(ok ? 'Correct!' : 'Incorrect. ' + sliderFb);
          playSound(ok ? 'correct' : 'wrong');
          var newStreak = ok ? streak + 1 : 0;
          if (ok && newStreak >= 3 && newStreak % 5 === 0) playSound('streak');
          upd({
            feedback: ok
              ? { correct: true, msg: '\u2705 Correct! '+challenge.l+'\u00d7'+challenge.w+'\u00d7'+challenge.h+' = '+challenge.answer + (newStreak >= 3 ? '  \uD83D\uDD25 ' + newStreak + ' streak!' : '') }
              : { correct: false, msg: '\u274c ' + sliderFb },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
            streak: newStreak,
            attemptHist: (_v.attemptHist || []).concat([ok ? 1 : 0]).slice(-24)
          });
          if (ok) {
            awardStemXP('volume', 5, 'cube volume');
            checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10 });
          }
        }
        if (isFreeform && builderChallenge) {
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
        var prompt = 'You are a friendly STEM tutor helping a student understand volume. ';
        if (isDisplacement) {
          if (dispUsesSinker) {
            prompt += 'They are measuring a floating ' + dispObject.label + ' by sinker correction. Sinker-only reading ' + dispTrial.sinkerOnly + ' mL; sinker-plus-object reading ' + dispTrial.final + ' mL. ';
            prompt += 'Explain why combined minus sinker-only isolates the object volume, and connect density below 1 g/cm3 with floating. ';
          } else {
            prompt += 'They are measuring a ' + dispObject.label + ' by water displacement. Initial reading ' + dispTrial.initial + ' mL; recorded final reading ' + dispTrial.final + ' mL. ';
            prompt += 'Explain final minus initial and that 1 mL equals 1 cubic centimeter. ';
          }
          if (dispCondition !== 'careful') prompt += 'The trial includes this measurement issue: ' + dispConditionMeta.explanation + ' ';
        } else if (isSlider) {
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
        if (key === 'd' && !isDisplacement) { e.preventDefault(); upd({ mode: 'displacement', challenge: null, feedback: null, builderChallenge: null, builderFeedback: null, showBuildLibrary: false }); }
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
              __alloT('stem.volume.interactive_net_drag_the_slider_to_fol', '🗺 Interactive net — drag the slider to fold the 2D net into a 3D prism')
            ),
            h('button', {
              onClick: function() { playSound('place'); upd({ showNet: false }); },
              'aria-label': __alloT('stem.volume.hide_net', 'Hide net'),
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, __alloT('stem.volume.hide', 'Hide ×'))
          ),
          // Fold slider
          h('div', { className: 'flex items-center gap-2' },
            h('label', { htmlFor: 'volume-net-fold', className: 'text-[11px] font-bold text-emerald-700' }, __alloT('stem.volume.flat', 'Flat')),
            h('input', { id: 'volume-net-fold', 'aria-label': __alloT('stem.volume.fold_the_net_from_flat_0_to_fully_fold', 'Fold the net from flat (0) to fully folded (1)'),
              type: 'range', min: '0', max: '1', step: '0.02',
              value: netFold,
              onChange: function(e) { upd({ netFold: parseFloat(e.target.value) }); },
              className: 'flex-1 h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
            }),
            h('span', { className: 'text-[11px] font-bold text-emerald-700' }, __alloT('stem.volume.folded', 'Folded')),
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
              'aria-label': __alloT('stem.volume.animate_fold', 'Animate fold'),
              title: __alloT('stem.volume.watch_it_fold_automatically', 'Watch it fold automatically'),
              className: 'px-2 py-1 text-[11px] font-bold bg-emerald-700 text-white rounded hover:bg-emerald-800'
            }, __alloT('stem.volume.animate', '▶ Animate'))
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
            __alloT('stem.volume.when_the_net_folds_up_completely_you_c', 'When the net folds up completely, you can see the prism. Surface area is the area of all 6 faces — the wrapping paper.')
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
              __alloT('stem.volume.net_the_6_faces_unfolded_onto_a_2d_lay', '🗺 Net — the 6 faces unfolded onto a 2D layout')
            ),
            h('button', {
              onClick: function() { playSound('place'); upd({ showNet: false }); },
              'aria-label': __alloT('stem.volume.hide_net_2', 'Hide net'),
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, __alloT('stem.volume.hide_net_3', 'Hide net ×'))
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
              __alloT('stem.volume.square_units', ' square units')
            ),
            h('p', { className: 'text-[10px] text-emerald-700 italic mt-0.5' },
              __alloT('stem.volume.fold_the_net_up_and_you_get_the_prism_', 'Fold the net up and you get the prism. Surface area is the total area of all 6 faces — the wrapping paper or paint you would need.')
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
            __alloT('stem.volume.volume_out_of_range_for_comparison_try', 'Volume out of range for comparison. Try a smaller prism (V ≤ 1000).')
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
        if (curEntry) displayList.push({ entry: curEntry, label: __alloT('stem.volume.current', 'Current'), accent: '#3b82f6' });
        if (!curEntry || (curEntry.sa !== minE.sa)) displayList.push({ entry: minE, label: __alloT('stem.volume.most_efficient', 'Most efficient ✓'), accent: '#16a34a' });
        if (!curEntry || (curEntry.sa !== maxE.sa)) {
          if (!displayList.some(function(d) { return d.entry.sa === maxE.sa; })) {
            displayList.push({ entry: maxE, label: __alloT('stem.volume.least_efficient', 'Least efficient'), accent: '#dc2626' });
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
              'aria-label': __alloT('stem.volume.hide_compare_panel', 'Hide compare panel'),
              className: 'text-[10px] font-bold text-emerald-700 hover:underline'
            }, __alloT('stem.volume.hide_2', 'Hide ×'))
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
              h('b', {}, __alloT('stem.volume.square_cube_law', '💡 Square-cube law: ')),
              __alloT('stem.volume.volume_grows_as_the_cube_of_the_dimens', 'volume grows as the cube of the dimension; surface area grows as the square. Same V, very different SA. '),
              __alloT('stem.volume.a_cube_is_the_most_surface_efficient_p', 'A cube is the most surface-efficient prism shape. '),
              __alloT('stem.volume.it_is_why_elephants_need_thick_legs_vo', 'It is why elephants need thick legs (volume → mass scales faster than bone cross-section), '),
              __alloT('stem.volume.why_cells_stay_small_need_surface_area', 'why cells stay small (need surface area to absorb nutrients), and why insulation works (rounder shapes keep heat).')
            ),
            h('p', { className: 'text-[10px] text-emerald-700 italic mt-1' },
              __alloT('stem.volume.tap_any_row_above_to_swap_the_3d_prism', '👆 Tap any row above to swap the 3D prism to that shape — see the same volume in a different skin.')
            )
          )
        );
      };

      function renderDisplacementCylinder(label, reading, objectMode, waiting, overflowing) {
        var safeReading = Math.max(0, Math.min(100, Number(reading) || 0));
        var waterY = 310 - safeReading * 2.5;
        var ticks = [];
        for (var mark = 0; mark <= 100; mark += 5) {
          var tickY = 310 - mark * 2.5;
          var major = mark % 10 === 0;
          ticks.push(h('line', {
            key: 'tick-' + mark,
            x1: major ? 48 : 55, y1: tickY, x2: 68, y2: tickY,
            stroke: major ? '#0f172a' : '#64748b', strokeWidth: major ? 1.6 : 1
          }));
          if (major) ticks.push(h('text', {
            key: 'label-' + mark,
            x: 42, y: tickY + 4, textAnchor: 'end',
            fontSize: 10, fontFamily: 'monospace', fill: '#334155'
          }, String(mark)));
        }
        var showObject = objectMode === true || objectMode === 'object' || objectMode === 'combined';
        var showSinker = objectMode === 'sinker' || objectMode === 'combined';
        var partialImmersion = showObject && !showSinker && dispCondition === 'partial';
        var objectY = partialImmersion ? waterY + 3 : (showSinker ? 260 : 286);
        var immersionText = partialImmersion ? ' only partly submerged.' : ' fully submerged.';
        var specimenDescription = dispObject.id === 'clay' ? dispObject.label + ' shaped as ' + dispClayShapeMeta.description : dispObject.label;
        var contentsText = '.';
        if (showSinker && showObject) contentsText = ', with the metal sinker and ' + specimenDescription + ' fully submerged.';
        else if (showSinker) contentsText = ', with the metal sinker submerged.';
        else if (showObject) contentsText = ', with the ' + specimenDescription + immersionText;
        var cylinderAria = waiting
          ? label + '. Final reading is hidden until the object is lowered into the water.'
          : overflowing
            ? label + '. Water overflowed past the 100 milliliter cylinder capacity, so no valid final reading is available.'
            : label + '. Bottom of the water meniscus reads ' + safeReading + ' milliliters' + contentsText;
        return h('figure', { className: 'm-0 min-w-0 text-center' },
          h('svg', {
            viewBox: '0 0 220 350',
            role: 'img',
            tabIndex: 0,
            'aria-label': cylinderAria,
            className: 'mx-auto h-auto w-full max-w-[220px] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sky-500'
          },
            h('rect', { x: 1, y: 1, width: 218, height: 348, rx: 16, fill: '#ffffff', stroke: '#bae6fd', strokeWidth: 2 }),
            h('text', { x: 110, y: 25, textAnchor: 'middle', fontSize: 13, fontWeight: 800, fill: '#0c4a6e' }, label),
            h('path', { d: 'M46 45 L46 315 Q46 325 56 325 L164 325 Q174 325 174 315 L174 45', fill: 'none', stroke: '#334155', strokeWidth: 4, strokeLinecap: 'round' }),
            h('ellipse', { cx: 110, cy: 45, rx: 64, ry: 10, fill: '#f8fafc', stroke: '#334155', strokeWidth: 3 }),
            h('rect', { x: 48, y: waterY, width: 124, height: Math.max(0, 315 - waterY), fill: waiting ? '#dbeafe' : '#7dd3fc', opacity: waiting ? 0.55 : 0.8 }),
            h('path', {
              d: 'M48 ' + (waterY - 5) + ' Q79 ' + waterY + ' 110 ' + waterY + ' Q141 ' + waterY + ' 172 ' + (waterY - 5),
              fill: 'none', stroke: waiting ? '#93c5fd' : '#0284c7', strokeWidth: 3
            }),
            ticks,
            showSinker && h('g', { 'aria-hidden': 'true', 'data-sinker-state': showObject ? 'combined' : 'alone' },
              h('line', { x1: 138, y1: 44, x2: 138, y2: 286, stroke: '#64748b', strokeWidth: 2 }),
              h('rect', { x: 126, y: 284, width: 24, height: 22, rx: 4, fill: '#64748b', stroke: '#0f172a', strokeWidth: 2 }),
              h('text', { x: 138, y: 299, textAnchor: 'middle', fontSize: 10, fontWeight: 900, fill: '#ffffff' }, 'S')
            ),

            showObject && h('g', { 'aria-hidden': 'true', 'data-immersion': partialImmersion ? 'partial' : 'full', 'data-clay-shape': dispObject.id === 'clay' ? dispClayShapeMeta.id : undefined },
              dispObject.id === 'clay' && dispClayShapeMeta.id === 'lump' && h('ellipse', { cx: 110, cy: objectY, rx: 27, ry: 16, fill: '#a16207', stroke: '#713f12', strokeWidth: 2 }),
              dispObject.id === 'clay' && dispClayShapeMeta.id === 'patty' && h('rect', { x: 70, y: objectY - 9, width: 80, height: 18, rx: 9, fill: '#a16207', stroke: '#713f12', strokeWidth: 2 }),
              dispObject.id === 'clay' && dispClayShapeMeta.id === 'column' && h('rect', { x: 98, y: objectY - 30, width: 24, height: 60, rx: 10, fill: '#a16207', stroke: '#713f12', strokeWidth: 2 }),
              dispObject.id !== 'clay' && h('ellipse', { cx: 110, cy: objectY, rx: 24, ry: 16, fill: '#475569', stroke: '#0f172a', strokeWidth: 2 }),
              dispObject.id !== 'clay' && h('text', { x: 110, y: objectY + 5, textAnchor: 'middle', fontSize: 20 }, dispObject.icon)
            ),
            !waiting && !overflowing && h('line', { x1: 174, y1: waterY, x2: 204, y2: waterY, stroke: '#0369a1', strokeWidth: 2 }),
            !waiting && !overflowing && h('text', { x: 207, y: waterY + 4, textAnchor: 'end', fontSize: 12, fontWeight: 900, fill: '#075985' }, safeReading + ' mL'),
            overflowing && h('g', { 'aria-hidden': 'true', 'data-cylinder-overflow': 'true' },
              h('path', { d: 'M38 48 Q54 34 70 48 T102 48 T134 48 T182 48', fill: 'none', stroke: '#dc2626', strokeWidth: 5, strokeLinecap: 'round' }),
              h('text', { x: 110, y: 82, textAnchor: 'middle', fontSize: 16, fontWeight: 900, fill: '#991b1b' }, 'OVERFLOW')
            ),

            waiting && h('text', { x: 110, y: 175, textAnchor: 'middle', fontSize: 52, fontWeight: 900, fill: '#94a3b8' }, '?'),
            h('text', { x: 110, y: 342, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, 'Read the bottom of the meniscus')
          ),
          h('figcaption', { className: 'mt-1 text-xs font-bold text-sky-900' },
            waiting
              ? 'Reading hidden until measurement'
              : (overflowing ? 'Overflow - final reading unavailable' : safeReading + ' mL')
          )
        );
      }

      function renderDisplacementLab() {
        function resetDisplacementTrial(patch) {
          upd(Object.assign({
            dispSubmerged: false,
            dispPrediction: '',
            dispAnswer: '',
            dispFeedback: null,
            dispExplanation: ''
          }, patch || {}));
        }

        function chooseSpecimen(id) {
          var next = availableDisplacementObjects.find(function(o) { return o.id === id; }) || availableDisplacementObjects[0];
          resetDisplacementTrial({
            dispObjectId: next.id,
            dispInitial: next.initial,
            dispCondition: 'careful',
            dispClayShape: 'lump',
            dispClayReshaped: false
          });
          announceToSR(next.floats ? next.label + ' selected. It floats, so use the metal sinker correction method.' : next.label + ' selected. Initial water reading ' + next.initial + ' milliliters.');
        }

        function reshapeClay() {
          if (dispObject.id !== 'clay') return;
          var nextId = nextClayShapeId(dispClayShapeMeta.id);
          var nextMeta = CLAY_SHAPES.find(function(shape) { return shape.id === nextId; });
          upd({ dispClayShape: nextId, dispClayReshaped: true });
          announceToSR('Clay reshaped as ' + nextMeta.description + '. No clay was added or removed, so its volume stays ' + dispObject.volume + ' cubic centimeters.');
        }


        function lowerSpecimen() {
          upd({ dispSubmerged: true, dispAnswer: '', dispFeedback: null });
          playSound('place');
          if (dispOverflow) {
            announceToSR('The water overflowed past the 100 milliliter cylinder capacity. There is no valid final reading. Lower the initial water level and repeat the trial.');
          } else {
            if (dispUsesSinker) {
              announceToSR('Sinker-only reading ' + dispTrial.sinkerOnly + ' milliliters. Sinker plus ' + dispObject.label + ' reading ' + dispTrial.final + ' milliliters. Subtract the sinker-only reading.');
            } else {
              announceToSR(dispObject.label + (dispCondition === 'partial' ? ' partly submerged. ' : ' fully submerged. ') + 'Final reading ' + dispTrial.final + ' milliliters. Subtract the initial reading of ' + dispTrial.initial + ' milliliters.');
            }
          }
        }

        function checkDisplacementAnswer() {
          if (!dispSubmerged || dispOverflow || (dispFeedback && dispFeedback.correct)) return;
          var parsed = Number(dispAnswer);
          if (!Number.isFinite(parsed)) {
            upd({ dispFeedback: { correct: false, msg: 'Enter a number for the final reading minus the subtraction baseline.' } });
            announceToSR('Enter a number first.');
            return;
          }
          var ok = Math.abs(parsed - dispTrial.measuredVolume) < 0.001;
          var newStreak = ok ? streak + 1 : 0;
          var patch = {
            dispFeedback: ok
              ? { correct: true, msg: 'Correct: ' + dispTrial.final + ' - ' + dispBaselineReading + ' = ' + dispTrial.measuredVolume + ' mL, so the observed displaced volume is ' + dispTrial.measuredVolume + ' cm\u00B3.' }
              : { correct: false, msg: 'Use the change in water level: final (' + dispTrial.final + ' mL) - ' + (dispUsesSinker ? 'sinker-only' : 'initial') + ' (' + dispBaselineReading + ' mL). Do not use the final reading by itself.' },
            score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
            streak: newStreak,
            attemptHist: (_v.attemptHist || []).concat([ok ? 1 : 0]).slice(-24)
          };
          if (ok) {
            var nextSolved = dispSolved + 1;
            patch.dispSolved = nextSolved;
            patch.dispTrials = dispTrials.concat([{
              id: Date.now(),
              object: dispObject.label + (dispObject.id === 'clay' ? ' - ' + dispClayShapeMeta.label : ''),
              initial: dispTrial.initial,
              baseline: dispBaselineReading,
              method: dispUsesSinker ? 'Sinker correction' : 'Direct displacement',
              final: dispTrial.final,
              measured: dispTrial.measuredVolume,
              accepted: dispTrial.acceptedVolume,
              error: dispTrial.error,
              condition: dispUsesSinker ? 'Sinker correction (careful setup)' : dispConditionMeta.label
            }]).slice(-6);
            playSound('correct');
            if (typeof awardStemXP === 'function') awardStemXP('volume', 5, 'water displacement');
            checkBadges({ firstVolume: true, displacementScientist: nextSolved >= 3, streak5: newStreak >= 5, streak10: newStreak >= 10 });
            announceToSR('Correct. Observed displaced volume ' + dispTrial.measuredVolume + ' cubic centimeters.');
          } else {
            playSound('wrong');
            announceToSR(dispUsesSinker ? 'Try again. Subtract the sinker-only reading from the combined reading.' : 'Try again. Subtract the initial reading from the final reading.');
          }
          upd(patch);
        }

        function nextSpecimen() {
          var currentIndex = availableDisplacementObjects.findIndex(function(o) { return o.id === dispObject.id; });
          chooseSpecimen(availableDisplacementObjects[(currentIndex + 1) % availableDisplacementObjects.length].id);
        }

        var density = Math.round((dispObject.mass / dispObject.volume) * 100) / 100;
        var predictionNumber = Number(dispPrediction);
        var predictionReady = dispPrediction !== '' && Number.isFinite(predictionNumber);
        var predictionDifference = predictionReady ? Math.abs(predictionNumber - dispTrial.measuredVolume) : null;

        var startingLevelComparison = '';
        if (dispInitialAdjusted) {
          if (!dispSubmerged) {
            startingLevelComparison = 'Starting water changed from ' + dispObject.initial + ' to ' + dispTrial.initial + ' mL. Predict whether ' + (dispUsesSinker ? 'combined - sinker-only' : 'final - initial') + ' will change.';
          } else if (dispOverflow) {
            startingLevelComparison = 'Overflow: water passed the 100 mL mark. Starting water changed from ' + dispObject.initial + ' to ' + dispTrial.initial + ' mL, so this trial cannot test the difference. Lower the initial water level and repeat.';
          } else if (dispUsesSinker) {
            startingLevelComparison = 'Reference sinker-only ' + dispReferenceBaseline + ' \u2192 combined ' + dispReferenceTrial.final + '; adjusted sinker-only ' + dispBaselineReading + ' \u2192 combined ' + dispTrial.final + '. Both change by ' + dispTrial.measuredVolume + ' mL. Starting water changes the readings, not their difference.';
          } else {
            startingLevelComparison = dispReferenceBaseline + ' \u2192 ' + dispReferenceTrial.final + ' and ' + dispBaselineReading + ' \u2192 ' + dispTrial.final + ' both change by ' + dispTrial.measuredVolume + ' mL. Starting level changes the readings, not their difference.';
          }
        }


        var trialSummary = summarizeDisplacementTrials(dispTrials);

        function formatDisplacementError(value) {
          var number = Number(value);
          if (!Number.isFinite(number) || Math.abs(number) < 0.001) return '0';
          return (number > 0 ? '+' : '') + number;
        }

        function renderTrialErrorPlot() {
          var comparable = dispTrials.slice(-6).map(function(trial) {
            if (!trial || trial.measured == null || trial.accepted == null) return null;
            var measured = Number(trial.measured);
            var accepted = Number(trial.accepted);
            if (!Number.isFinite(measured) || !Number.isFinite(accepted)) return null;
            var storedError = trial.error == null ? NaN : Number(trial.error);
            return {
              id: trial.id,
              object: trial.object || 'Specimen',
              condition: trial.condition || 'Unknown condition',
              error: Number.isFinite(storedError) ? storedError : measured - accepted
            };
          }).filter(Boolean);
          if (!comparable.length) return null;

          var rowHeight = 46;
          var chartHeight = 38 + comparable.length * rowHeight;
          var centerX = 410;
          var maxBarWidth = 155;
          var maxError = Math.max(3, trialSummary.largestAbsoluteError);
          var aria = 'Measurement error plot. ' + comparable.map(function(trial) {
            return trial.object + ', ' + trial.condition + ', error ' + formatDisplacementError(trial.error) + ' cubic centimeters.';
          }).join(' ');

          return h('figure', { className: 'mt-3', 'data-trial-error-plot': 'true' },
            h('svg', {
              viewBox: '0 0 720 ' + chartHeight,
              role: 'img',
              'aria-label': aria,
              className: 'h-auto w-full rounded-lg border border-violet-200 bg-white'
            },
              h('line', { x1: centerX, y1: 24, x2: centerX, y2: chartHeight - 12, stroke: '#475569', strokeWidth: 2 }),
              h('text', { x: centerX, y: 16, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#334155' }, '0 cm\u00B3 error'),
              comparable.map(function(trial, index) {
                var y = 42 + index * rowHeight;
                var barWidth = Math.abs(trial.error) / maxError * maxBarWidth;
                var isAccurate = Math.abs(trial.error) < 0.001;
                var fill = isAccurate ? '#059669' : (trial.error > 0 ? '#d97706' : '#4f46e5');
                return h('g', { key: trial.id || index, 'data-error-direction': isAccurate ? 'accurate' : (trial.error > 0 ? 'over' : 'under') },
                  h('line', { x1: 218, y1: y + 9, x2: 602, y2: y + 9, stroke: '#e2e8f0', strokeWidth: 1 }),
                  h('text', { x: 12, y: y, fontSize: 12, fontWeight: 700, fill: '#0f172a' }, String(trial.object).slice(0, 24)),
                  h('text', { x: 12, y: y + 15, fontSize: 10, fill: '#475569' }, String(trial.condition).slice(0, 32)),
                  isAccurate
                    ? h('circle', { cx: centerX, cy: y + 7, r: 7, fill: fill })
                    : h('rect', {
                        x: trial.error < 0 ? centerX - barWidth : centerX,
                        y: y,
                        width: barWidth,
                        height: 14,
                        rx: 4,
                        fill: fill
                      }),
                  h('text', { x: 620, y: y + 11, fontSize: 12, fontWeight: 800, fill: '#0f172a' }, formatDisplacementError(trial.error) + ' cm\u00B3')
                );
              })
            ),
            h('figcaption', { className: 'mt-1 text-[11px] text-slate-600' }, 'Bars left of zero underestimate volume; bars right of zero overestimate it. A dot on zero matches the accepted volume.')
          );
        }

        return h('section', {
          'data-displacement-lab': 'true',
          className: 'space-y-4 rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-white via-sky-50 to-teal-50 p-3 shadow-sm sm:p-4',
          'aria-labelledby': 'volume-displacement-heading'
        },
          h('div', { className: 'flex flex-col gap-3 rounded-xl border border-sky-200 bg-white p-3 lg:flex-row lg:items-end lg:justify-between' },
            h('div', { className: 'min-w-0 flex-1' },
              h('h3', { id: 'volume-displacement-heading', className: 'text-lg font-black text-sky-900' }, '\uD83E\uDDEA Water Displacement Lab'),
              h('p', { className: 'mt-1 text-sm leading-relaxed text-slate-700' }, dispUsesSinker
                ? 'Measure a floating object by comparing the sinker-only reading with the sinker-plus-object reading.'
                : 'Measure an object that is hard to describe with a formula. With careful setup and full submersion, the rise in water level equals the object volume.'),
              h('p', { className: 'mt-2 inline-flex rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-black text-teal-900' }, '1 milliliter (mL) = 1 cubic centimeter (cm\u00B3)')
            ),
            h('div', { className: 'grid gap-2 sm:grid-cols-2 lg:w-[28rem]' },
              h('label', { className: 'text-xs font-bold text-slate-700' },
                h('span', { className: 'mb-1 block' }, 'Specimen'),
                h('select', {
                  value: dispObject.id,
                  onChange: function(e) { chooseSpecimen(e.target.value); },
                  'aria-label': 'Choose an object to measure',
                  className: 'min-h-[2.75rem] w-full rounded-lg border-2 border-sky-300 bg-white px-3 py-2 text-sm font-bold text-sky-900'
                }, availableDisplacementObjects.map(function(o) {
                  return h('option', { key: o.id, value: o.id }, o.label);
                }))
              ),
              h('fieldset', { className: 'm-0 rounded-lg border border-slate-200 p-2' },
                h('legend', { className: 'px-1 text-[11px] font-bold text-slate-700' }, 'Learning level'),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  [
                    { id: 'elementary', label: 'Grades 3-5' },
                    { id: 'middle', label: 'Grades 6-8' }
                  ].map(function(level) {
                    var active = dispLevel === level.id;
                    return h('button', {
                      key: level.id,
                      type: 'button',
                      onClick: function() {
                        var levelPatch = { dispLevel: level.id, dispCondition: 'careful' };
                        if (level.id === 'elementary' && dispUsesSinker) {
                          levelPatch.dispObjectId = DISPLACEMENT_OBJECTS[0].id;
                          levelPatch.dispInitial = DISPLACEMENT_OBJECTS[0].initial;
                        }
                        resetDisplacementTrial(levelPatch);
                        announceToSR(level.label + ' learning level selected.');
                      },
                      'aria-pressed': active,
                      className: 'min-h-[2.5rem] rounded-md px-2 py-1 text-[11px] font-bold ' + (active ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                    }, level.label);
                  })
                )
              )
            )
          ),

          dispLevel === 'middle' && !dispUsesSinker && h('fieldset', { className: 'm-0 rounded-xl border border-violet-200 bg-white p-3' },
            h('legend', { className: 'px-1 text-xs font-black text-violet-900' }, 'Measurement conditions'),
            h('div', { className: 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4' },
              Object.keys(DISPLACEMENT_CONDITIONS).map(function(key) {
                var condition = DISPLACEMENT_CONDITIONS[key];
                var active = dispCondition === key;
                return h('button', {
                  key: key,
                  type: 'button',
                  onClick: function() {
                    resetDisplacementTrial({ dispCondition: key });
                    announceToSR(condition.label + '. ' + condition.explanation);
                  },
                  'aria-pressed': active,
                  className: 'min-h-[3.75rem] rounded-lg border p-2 text-left text-xs transition ' + (active ? 'border-violet-600 bg-violet-100 text-violet-950 ring-2 ring-violet-200' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300')
                },
                  h('strong', { className: 'block' }, condition.label),
                  h('span', { className: 'mt-0.5 block text-[10px]' }, condition.short)
                );
              })
            ),
            h('p', { className: 'mt-2 text-xs leading-relaxed text-violet-900', role: 'note' }, dispConditionMeta.explanation)
          ),

          dispLevel === 'middle' && dispUsesSinker && h('section', {
            className: 'rounded-xl border border-indigo-200 bg-indigo-50 p-3',
            'data-sinker-method': 'true',
            'aria-labelledby': 'volume-sinker-method-heading'
          },
            h('h4', { id: 'volume-sinker-method-heading', className: 'text-sm font-black text-indigo-950' }, 'Floating object: sinker correction'),
            h('p', { className: 'mt-1 text-xs leading-relaxed text-indigo-950' }, 'The cork floats, so a metal sinker holds it fully underwater. Subtract the sinker\'s own displacement so only the cork volume remains.'),
            h('ol', { className: 'mt-2 grid gap-2 text-xs sm:grid-cols-3' },
              h('li', { className: 'rounded-lg bg-white p-2' }, h('strong', null, '1. Sinker alone: '), dispTrial.sinkerOnly + ' mL'),
              h('li', { className: 'rounded-lg bg-white p-2' }, h('strong', null, '2. Sinker + cork: '), dispSubmerged && !dispOverflow ? dispTrial.final + ' mL' : 'hidden until measured'),
              h('li', { className: 'rounded-lg bg-white p-2' }, h('strong', null, '3. Subtract: '), 'combined - sinker-only')
            )
          ),


          dispLevel === 'middle' && h('section', {
            className: 'rounded-xl border border-cyan-200 bg-white p-3',
            'data-cylinder-setup': 'true',
            'aria-labelledby': 'volume-cylinder-setup-heading'
          },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('h4', { id: 'volume-cylinder-setup-heading', className: 'text-sm font-black text-cyan-950' }, 'Experimental setup'),
              h('span', { className: 'rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-900' }, dispTrial.initial + ' mL starting water')
            ),
            h('label', { htmlFor: 'volume-initial-water', className: 'mt-2 block text-xs font-bold text-slate-700' }, 'Adjust the initial water level'),
            h('input', {
              id: 'volume-initial-water',
              type: 'range',
              min: 10,
              max: 90,
              step: 1,
              value: dispTrial.initial,
              onChange: function(e) { resetDisplacementTrial({ dispInitial: Number(e.target.value) }); },
              'aria-label': 'Initial water level in milliliters',
              'aria-describedby': 'volume-cylinder-capacity-note' + (dispInitialAdjusted ? ' volume-starting-level-comparison' : ''),
              className: 'mt-2 w-full accent-cyan-700'
            }),
            h('p', { id: 'volume-cylinder-capacity-note', className: 'mt-1 text-xs text-cyan-950' },
              'Cylinder capacity: 100 mL. Empty space above the water: ', h('strong', null, dispCapacityAssessment.headroom + ' mL'), '.'
            ),
            dispInitialAdjusted && h('p', {
              id: 'volume-starting-level-comparison',
              className: 'mt-2 rounded-lg border p-2 text-xs font-bold leading-relaxed ' + (dispSubmerged && dispOverflow ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-cyan-300 bg-cyan-50 text-cyan-950'),
              role: dispSubmerged && dispOverflow ? 'alert' : 'status',
              'aria-live': dispSubmerged && dispOverflow ? undefined : 'polite',
              'data-starting-level-comparison': 'true',
              'data-comparison-state': !dispSubmerged ? 'prediction' : (dispOverflow ? 'overflow' : 'observed'),
              'data-overflow-feedback': dispSubmerged && dispOverflow ? 'true' : undefined
            }, startingLevelComparison),
            dispSubmerged && dispOverflow && !dispInitialAdjusted && h('p', {
              className: 'mt-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs font-bold text-rose-900',
              role: 'alert',
              'data-overflow-feedback': 'true'
            }, 'Overflow: water passed the 100 mL mark, so the final reading is unavailable. Lower the initial water level and repeat the trial.')
          ),


          h('div', { className: 'grid gap-4 xl:grid-cols-[1.15fr_0.85fr]' },
            h('div', { className: 'rounded-xl border border-sky-200 bg-white p-3' },
              h('div', { className: 'mb-3 flex flex-wrap items-center justify-between gap-2' },
                h('div', null,
                  h('p', { className: 'text-base font-black text-slate-900' }, dispObject.icon + ' ' + dispObject.label),
                  h('p', { className: 'mt-0.5 text-xs text-slate-600' }, dispObject.note)
                ),
                h('span', { className: 'rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700' }, dispSubmerged ? (dispUsesSinker ? 'Sinker + object submerged' : (dispCondition === 'partial' ? 'Partly submerged' : 'Fully submerged')) : 'Ready to measure')
              ),
              dispObject.id === 'clay' && h('div', { className: 'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2', 'data-clay-conservation': 'true' },
                h('div', { className: 'min-w-0 flex-1' },
                  h('p', { className: 'text-xs font-black text-amber-950' }, 'Same clay, different shape: ' + dispClayShapeMeta.label),
                  h('p', { className: 'mt-0.5 text-xs leading-relaxed text-amber-900', role: dispClayReshaped ? 'status' : undefined, 'aria-live': 'polite' }, dispClayReshaped
                    ? (dispSubmerged && dispOverflow
                      ? 'No clay was added or removed, so its volume should stay the same. Overflow prevents a valid comparison; lower the initial water level and repeat.'
                      : (dispSubmerged ? 'No clay was added or removed. The shape changed, but accepted volume stays ' + dispObject.volume + ' cm\u00B3 and the final reading stays ' + dispTrial.final + ' mL.' : 'No clay was added or removed. The shape changed, but its volume should stay the same. Lower it to test your prediction.'))
                    : 'Reshape the same clay. Predict whether the water-level change will stay the same.')
                ),
                h('button', { type: 'button', onClick: reshapeClay, 'aria-label': 'Reshape clay; current shape ' + dispClayShapeMeta.label, className: 'min-h-[2.5rem] rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-black text-amber-950 hover:bg-amber-100' }, 'Reshape clay')
              ),

              h('div', { className: 'grid gap-2 ' + (dispUsesSinker ? 'grid-cols-3' : 'grid-cols-2') },
                renderDisplacementCylinder('Initial reading', dispTrial.initial, false, false, false),
                dispUsesSinker && renderDisplacementCylinder('Sinker only', dispTrial.sinkerOnly, 'sinker', false, false),
                renderDisplacementCylinder(dispUsesSinker ? 'Sinker + object' : 'Final reading', dispSubmerged ? dispTrial.final : dispBaselineReading, dispUsesSinker ? 'combined' : 'object', !dispSubmerged, dispSubmerged && dispOverflow)
              ),
              dispSubmerged && h('div', {
                className: 'mt-3 rounded-xl border p-3 text-center ' + (dispOverflow ? 'border-rose-300 bg-rose-50' : 'border-sky-300 bg-sky-50'),
                role: 'status',
                'aria-live': 'polite'
              },
                h('div', { className: 'font-mono text-lg font-black ' + (dispOverflow ? 'text-rose-950' : 'text-sky-950') },
                  dispOverflow ? 'Final reading unavailable - revise the setup' : dispTrial.final + ' mL - ' + dispBaselineReading + ' mL = ?'
                ),
                h('p', { className: 'mt-1 text-xs ' + (dispOverflow ? 'text-rose-900' : 'text-sky-800') },
                  dispOverflow
                    ? 'Liquid left the cylinder, so the required subtraction cannot be calculated from this trial.'
                    : (dispUsesSinker
                      ? 'The sinker appears in both readings, so subtraction removes its displacement and leaves the object volume.'
                      : (dispTrial.error === 0 ? 'With careful setup, the change in liquid volume is the object volume.' : 'This setup changes the reading. Calculate the observed change, then compare it with the accepted volume.'))
                )
              )
            ),

            h('div', { className: 'space-y-3' },
              h('div', { className: 'rounded-xl border border-amber-200 bg-white p-3' },
                h('label', { className: 'block text-sm font-black text-amber-900' },
                  '1. Predict the object volume',
                  h('span', { className: 'mt-1 block text-[11px] font-normal text-slate-600' }, 'Estimate before you see the final reading.'),
                  h('div', { className: 'mt-2 flex items-center gap-2' },
                    h('input', { 'aria-label': 'Predicted object volume in cubic centimeters',
                      type: 'number', min: 0, max: 100, step: 1,
                      value: dispPrediction,
                      onChange: function(e) { upd({ dispPrediction: e.target.value }); },
                      className: 'min-h-[2.75rem] min-w-0 flex-1 rounded-lg border-2 border-amber-300 px-3 py-2 font-mono text-base'
                    }),
                    h('span', { className: 'text-xs font-bold text-amber-900' }, 'cm\u00B3')
                  )
                )
              ),

              h('div', { className: 'rounded-xl border border-sky-200 bg-white p-3' },
                h('p', { className: 'text-sm font-black text-sky-900' }, '2. Observe the water level'),
                h('button', {
                  type: 'button',
                  onClick: lowerSpecimen,
                  disabled: dispSubmerged,
                  className: 'mt-2 min-h-[2.75rem] w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-sky-800 disabled:cursor-default disabled:bg-sky-200 disabled:text-sky-700'
                }, dispUsesSinker ? (dispSubmerged ? '\u2713 Sinker and cork submerged' : '\u2193 Lower cork with sinker') : (dispSubmerged ? (dispCondition === 'partial' ? '\u2713 Object partly submerged' : '\u2713 Object submerged') : (dispCondition === 'partial' ? '\u2193 Lower object partway into water' : '\u2193 Lower object into water'))),
                dispSubmerged && !dispOverflow && predictionReady && h('p', { className: 'mt-2 text-xs text-slate-700' },
                  'Your prediction: ', h('strong', null, predictionNumber + ' cm\u00B3'), '. Difference from this reading: ', h('strong', null, predictionDifference + ' cm\u00B3'), '.'
                )
              ),

              h('div', { className: 'rounded-xl border border-teal-200 bg-white p-3' },
                h('label', { className: 'block text-sm font-black text-teal-900' },
                  dispUsesSinker ? '3. Calculate combined - sinker-only' : '3. Calculate final - initial',
                  h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
                    h('input', { 'aria-label': 'Calculated displaced volume in cubic centimeters',
                      type: 'number', min: 0, max: 100, step: 1,
                      value: dispAnswer,
                      disabled: !dispSubmerged || dispOverflow || !!(dispFeedback && dispFeedback.correct),
                      onChange: function(e) { upd({ dispAnswer: e.target.value, dispFeedback: null }); },
                      onKeyDown: function(e) { if (e.key === 'Enter') checkDisplacementAnswer(); },
                      className: 'min-h-[2.75rem] min-w-0 flex-1 rounded-lg border-2 border-teal-300 px-3 py-2 font-mono text-base disabled:bg-slate-100'
                    }),
                    h('span', { className: 'text-xs font-bold text-teal-900' }, 'cm\u00B3'),
                    h('button', {
                      type: 'button',
                      onClick: checkDisplacementAnswer,
                      disabled: !dispSubmerged || dispOverflow || dispAnswer === '' || !!(dispFeedback && dispFeedback.correct),
                      className: 'min-h-[2.75rem] rounded-lg bg-teal-700 px-4 py-2 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-40'
                    }, 'Check')
                  )
                ),
                dispFeedback && h('p', {
                  className: 'mt-2 rounded-lg border p-2 text-xs font-bold leading-relaxed ' + (dispFeedback.correct ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'),
                  role: 'status', 'aria-live': 'polite'
                }, dispFeedback.msg),
                dispFeedback && dispFeedback.correct && dispObject.formula && h('p', { className: 'mt-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-900' },
                  h('strong', null, 'Formula check: '), dispObject.formula, '. ',
                  dispTrial.error === 0
                    ? 'Both methods agree.'
                    : 'The displacement result is ' + dispTrial.measuredVolume + ' cm\u00B3 (difference: ' +
                      (dispTrial.error > 0 ? '+' : '') + dispTrial.error + ' cm\u00B3). ' +
                      'This condition introduced measurement error.'
                )
              ),

              dispLevel === 'middle' && dispFeedback && dispFeedback.correct && h('div', { className: 'rounded-xl border border-violet-200 bg-violet-50 p-3' },
                h('h4', { className: 'text-sm font-black text-violet-950' }, 'Middle school extension: accuracy and density'),
                h('dl', { className: 'mt-2 grid grid-cols-2 gap-2 text-xs' },
                  h('div', { className: 'rounded-lg bg-white p-2' }, h('dt', { className: 'font-bold text-slate-600' }, 'Accepted volume'), h('dd', { className: 'font-mono font-black text-slate-900' }, dispTrial.acceptedVolume + ' cm\u00B3')),
                  h('div', { className: 'rounded-lg bg-white p-2' }, h('dt', { className: 'font-bold text-slate-600' }, 'Measurement error'), h('dd', { className: 'font-mono font-black text-slate-900' }, (dispTrial.error > 0 ? '+' : '') + dispTrial.error + ' cm\u00B3')),
                  h('div', { className: 'col-span-2 rounded-lg bg-white p-2' }, h('dt', { className: 'font-bold text-slate-600' }, 'Density = mass / accepted volume'), h('dd', { className: 'font-mono font-black text-slate-900' }, dispObject.mass + ' g / ' + dispObject.volume + ' cm\u00B3 = ' + density + ' g/cm\u00B3'))
                ),
                h('p', { className: 'mt-2 text-xs text-violet-900' }, density < 1
                  ? density + ' g/cm\u00B3 is less than water\'s density (about 1 g/cm\u00B3), so this specimen floats. The sinker holds it fully underwater without counting the sinker as part of its volume.'
                  : density + ' g/cm\u00B3 is greater than water\'s density (about 1 g/cm\u00B3), so this specimen tends to sink.')
              ),

              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: nextSpecimen, className: 'min-h-[2.5rem] flex-1 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white hover:bg-indigo-800' }, 'Next specimen'),
                h('button', { type: 'button', onClick: function() { resetDisplacementTrial({}); announceToSR('Trial reset.'); }, className: 'min-h-[2.5rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100' }, 'Reset trial')
              )
            )
          ),

          h('div', { className: 'grid gap-3 lg:grid-cols-2' },
            h('div', { className: 'rounded-xl border border-emerald-200 bg-white p-3' },
              h('label', { className: 'block text-sm font-black text-emerald-900' },
                'Explain what the water showed',
                h('span', { className: 'mt-1 block text-[11px] font-normal text-slate-600' }, 'Sentence starter: The object\'s volume is ___ because...'),
                h('textarea', { 'aria-label': 'Explain the displacement evidence in your own words',
                  rows: 3,
                  maxLength: 600,
                  value: dispExplanation,
                  onChange: function(e) { upd({ dispExplanation: e.target.value }); },
                  placeholder: 'The object\'s volume is ... because the water level changed from ... to ...',
                  className: 'mt-2 w-full rounded-lg border-2 border-emerald-200 p-2 text-sm leading-relaxed',
                })
              )
            ),
            h('aside', { className: 'rounded-xl border border-cyan-200 bg-cyan-50 p-3', 'aria-label': 'Water displacement reminders' },
              h('h4', { className: 'text-sm font-black text-cyan-950' }, 'Measurement reminders'),
              h('ul', { className: 'mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-cyan-950' },
                h('li', null, dispUsesSinker ? 'Use combined - sinker-only, not combined - initial.' : 'Use final - initial, not the final reading alone.'),
                h('li', null, 'Read water at the bottom of its curved meniscus and at eye level.'),
                h('li', null, 'The object must be fully submerged without trapping air.'),
                h('li', null, 'Use this method only when the object does not dissolve or absorb water.')
              )
            )
          ),

          dispLevel === 'middle' && trialSummary.count > 0 && h('section', {
            className: 'rounded-xl border border-violet-200 bg-violet-50 p-3',
            'aria-labelledby': 'volume-accuracy-evidence-heading'
          },
            h('h4', { id: 'volume-accuracy-evidence-heading', className: 'text-sm font-black text-violet-950' }, 'Accuracy evidence across trials'),
            h('p', { className: 'mt-1 text-xs leading-relaxed text-violet-950', role: 'status' }, trialSummary.conclusion),
            h('dl', { className: 'mt-2 grid gap-2 text-xs sm:grid-cols-3' },
              h('div', { className: 'rounded-lg bg-white p-2' },
                h('dt', { className: 'font-bold text-slate-600' }, 'Mean signed error'),
                h('dd', { className: 'font-mono font-black text-slate-900' }, formatDisplacementError(trialSummary.meanError) + ' cm\u00B3')
              ),
              h('div', { className: 'rounded-lg bg-white p-2' },
                h('dt', { className: 'font-bold text-slate-600' }, 'Mean absolute error'),
                h('dd', { className: 'font-mono font-black text-slate-900' }, trialSummary.meanAbsoluteError + ' cm\u00B3')
              ),
              h('div', { className: 'rounded-lg bg-white p-2' },
                h('dt', { className: 'font-bold text-slate-600' }, 'Matched accepted volume'),
                h('dd', { className: 'font-mono font-black text-slate-900' }, trialSummary.accurate + ' of ' + trialSummary.count)
              )
            ),
            renderTrialErrorPlot()
          ),


          dispTrials.length > 0 && h('div', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
            h('div', { className: 'flex items-center justify-between gap-2' },
              h('h4', { className: 'text-sm font-black text-slate-900' }, 'Trial record'),
              h('span', { className: 'text-xs font-bold text-sky-800' }, dispSolved + ' completed')
            ),
            h('div', { className: 'mt-2 overflow-x-auto' },
              h('table', { className: 'w-full min-w-[780px] border-collapse text-left text-xs' },
                h('thead', null, h('tr', { className: 'bg-slate-100 text-slate-700' },
                  ['Specimen', 'Baseline reading', 'Final', 'Measured volume', 'Accepted volume', 'Error', 'Condition'].map(function(head) {
                    return h('th', { key: head, scope: 'col', className: 'border border-slate-200 px-2 py-1.5 font-black' }, head);
                  })
                )),
                h('tbody', null, dispTrials.slice().reverse().map(function(trial) {

                  var accepted = trial.accepted == null ? NaN : Number(trial.accepted);
                  var baseline = trial.baseline == null ? Number(trial.initial) : Number(trial.baseline);
                  var measured = trial.measured == null ? NaN : Number(trial.measured);
                  var storedError = trial.error == null ? NaN : Number(trial.error);
                  var error = Number.isFinite(storedError)
                    ? storedError
                    : (Number.isFinite(measured) && Number.isFinite(accepted) ? measured - accepted : NaN);
                  return h('tr', { key: trial.id },
                    h('th', { scope: 'row', className: 'border border-slate-200 px-2 py-1.5 font-bold text-slate-900' }, trial.object),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5 font-mono' }, Number.isFinite(baseline) ? baseline + ' mL' : '\u2014'),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5 font-mono' }, trial.final + ' mL'),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5 font-mono font-bold' }, trial.measured + ' cm\u00B3'),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5 font-mono' }, Number.isFinite(accepted) ? accepted + ' cm\u00B3' : '\u2014'),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5 font-mono font-bold' }, Number.isFinite(error) ? formatDisplacementError(error) + ' cm\u00B3' : '\u2014'),
                    h('td', { className: 'border border-slate-200 px-2 py-1.5' }, trial.condition)
                  );
                }))
              )
            )
          )
        );
      }

      // ── Earned badges count ──
      var earnedBadges = BADGES.filter(function(b) { return badges[b.id]; });
      var earnedCount = earnedBadges.length;

      // ══════════ RENDER ══════════
      var bgClass = isDisplacement ? 'allo-vol-bg-displacement' : (isWord ? 'allo-vol-bg-word' : (isFreeform ? 'allo-vol-bg-freeform' : 'allo-vol-bg-slider'));
      var volumeModeLabel = isDisplacement ? 'Displacement' : (isWord ? 'Word problem' : (isFreeform ? 'Freeform' : 'Dimensions'));
      var volumeNext = isDisplacement
        ? (dispSubmerged && dispOverflow
          ? 'Lower the initial water level and repeat so the final reading stays within the cylinder.'
          : (dispObject.id === 'clay' && !dispClayReshaped
            ? 'Reshape the clay without adding or removing material, then predict whether its volume will change.'
            : (dispInitialAdjusted && !dispSubmerged
              ? 'Predict whether changing the starting water level will change the displacement difference.'
              : (dispUsesSinker
                ? (dispSubmerged ? 'Subtract the sinker-only reading from the sinker-plus-object reading, then explain why the sinker cancels out.' : 'Predict the cork volume, then record the sinker-only reading before lowering both together.')
                : (dispSubmerged ? 'Subtract the initial reading from the final reading, then explain what the change represents.' : (dispCondition === 'partial' ? 'Predict the specimen volume, then lower it only partway to observe the resulting error.' : 'Predict the specimen volume, then lower it fully into the water.'))))))
        : isFreeform && positions.length === 0
        ? 'Choose a build layer, then select squares in the placement grid to add unit cubes.'
        : isWord
          ? 'Identify length, width, and height in the context before multiplying.'
          : score.total === 0
            ? 'Predict the volume, then use layers to verify length × width × height.'
            : 'Change one dimension and explain how volume and surface area respond.';
      var headerDescription = isDisplacement
        ? 'Measure irregular solids with water, connect milliliters to cubic centimeters, and reason from experimental evidence.'
        : 'Build solids from unit cubes, connect layers to multiplication, and justify volume with spatial evidence.';
      var volumePathway = isDisplacement ? [
        { n: '1', title: 'Predict', detail: 'Estimate before measuring.' },
        { n: '2', title: 'Measure', detail: 'Read initial and final levels.' },
        { n: '3', title: 'Explain', detail: 'Use the change as evidence.' }
      ] : [
        { n: '1', title: 'Build', detail: 'Set dimensions or place cubes.' },
        { n: '2', title: 'Count', detail: 'Find cubes per layer and layers.' },
        { n: '3', title: 'Generalize', detail: 'Connect the model to a formula.' }
      ];

      return h('div', { className: 'space-y-4 max-w-5xl mx-auto animate-in fade-in duration-200 ' + bgClass },
        // Header
        h('section', { 'data-volume-command': 'true', className: 'overflow-hidden rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex items-center gap-2' },
                  h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-300', 'aria-label': __alloT('stem.volume.back', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-emerald-200/30' }, isDisplacement ? 'Measurement lab' : 'Volume design brief')
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, __alloT('stem.volume.3d_volume_explorer', '\uD83D\uDCE6 3D Volume Explorer')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-emerald-100' }, headerDescription),
                h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200' }, 'Recommended next move'),
                  h('p', { className: 'mt-1 text-sm font-semibold text-white' }, volumeNext)
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-2 lg:w-[22rem]' },
                [
                  { label: 'Mode', value: volumeModeLabel },
                  { label: 'Volume', value: isDisplacement ? (dispSubmerged ? dispTrial.measuredVolume + ' mL' : '?') : String(Math.round(volume * 100) / 100) },
                  { label: 'Solved', value: String(score.correct) }
                ].map(function(metric) {
                  return h('div', { key: metric.label, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200' }, metric.label)
                  );
                })
              )
            ),
            h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': isDisplacement ? 'Displacement investigation pathway' : 'Volume reasoning pathway' },
              volumePathway.map(function(step) {
                return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                  h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300 font-black text-slate-950' }, step.n),
                  h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-emerald-200' }, step.detail))
                );
              })
            )
          )
        ),
        h('div', { className: 'flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 p-2' },
          h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, score.correct + '/' + score.total),
            (_v.attemptHist && _v.attemptHist.length > 1) && h('div', { className: 'flex items-center gap-px', title: __alloT('stem.volume.recent_attempts_newest_at_right', 'Recent attempts (newest at right)'), role: 'img', 'aria-label': _v.attemptHist.slice(-12).filter(function (x) { return x; }).length + ' correct of your last ' + Math.min(12, _v.attemptHist.length) + ' attempts' },
              _v.attemptHist.slice(-12).map(function (v, i) { return h('span', { key: i, className: 'inline-block w-1 h-3.5 rounded-sm ' + (v ? 'bg-emerald-500' : 'bg-rose-400') }); })),
            streak >= 2 && h('div', {
              className: 'text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full' + (reducedMotion ? '' : ' animate-pulse')
            }, '\uD83D\uDD25 ' + streak + ' streak!'),
            earnedCount > 0 && h('button', { onClick: function() { upd({ showBadges: !showBadges }); },
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-600 text-amber-700 hover:bg-amber-100 transition-all',
              title: __alloT('stem.volume.view_badges_b', 'View badges (B)')
            }, '\uD83C\uDFC5 ' + earnedCount + '/' + BADGES.length),
            h('button', { onClick: askAI,
              className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-600 text-purple-600 hover:bg-purple-100 transition-all',
              title: __alloT('stem.volume.ai_tutor', 'AI Tutor (?)')
            }, __alloT('stem.volume.ai', '\uD83E\uDDE0 AI'))
          ),
          h('div', { className: 'flex-1' }),
          // Mode toggle: dimensions, freeform, word problems, and displacement.
          h('div', { className: 'flex items-center gap-1 overflow-x-auto bg-emerald-50 rounded-lg p-1 border border-emerald-200', role: 'tablist', 'aria-label': __alloT('stem.volume.volume_modes', 'Volume modes') },
            h('button', { 'aria-label': __alloT('stem.volume.slider_mode', 'Slider mode'),
              onClick: function() { upd({ mode: 'slider', builderChallenge: null, builderFeedback: null }); },
              role: 'tab', 'aria-selected': mode === 'slider',
              className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 ' + (mode === 'slider' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: __alloT('stem.volume.slider_mode_s', 'Slider mode (S)')
            }, __alloT('stem.volume.slider', '\uD83C\uDF9A\uFE0F Slider')),
            h('button', { 'aria-label': __alloT('stem.volume.freeform_mode', 'Freeform mode'),
              onClick: function() { upd({ mode: 'freeform', challenge: null, feedback: null }); },
              role: 'tab', 'aria-selected': isFreeform,
              className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ' + (isFreeform ? 'bg-white text-indigo-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: __alloT('stem.volume.freeform_mode_f', 'Freeform mode (F)')
            }, __alloT('stem.volume.freeform', '\uD83E\uDDF1 Freeform')),
            h('button', { 'aria-label': __alloT('stem.volume.word_problems_mode', 'Word Problems mode'),
              onClick: function() {
                var ctx = WORD_CONTEXTS[wpCtxIdx % WORD_CONTEXTS.length];
                upd({ mode: 'word', dims: ctx.defaults, challenge: null, feedback: null, builderChallenge: null, builderFeedback: null, wpFeedback: null });
              },
              role: 'tab', 'aria-selected': isWord,
              className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ' + (isWord ? 'bg-white text-amber-700 shadow-sm' : 'text-emerald-500 hover:text-emerald-700'),
              title: __alloT('stem.volume.word_problems_mode_w', 'Word Problems mode (W)')
            }, __alloT('stem.volume.word', '\uD83D\uDCDD Word')),
            h('button', { 'aria-label': 'Water Displacement Lab mode',
              onClick: function() { upd({ mode: 'displacement', challenge: null, feedback: null, builderChallenge: null, builderFeedback: null, showBuildLibrary: false }); announceToSR('Water Displacement Lab opened.'); },
              role: 'tab', 'aria-selected': isDisplacement,
              className: 'min-h-[2.5rem] whitespace-nowrap px-3 py-2 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 ' + (isDisplacement ? 'bg-white text-sky-800 shadow-sm' : 'text-emerald-500 hover:text-sky-700'),
              title: 'Water Displacement Lab mode (D)'
            }, '\uD83E\uDDEA Displacement')),
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
                activeBuildLayer: 0, layerColors: {},
                challenge: null, answer: '', feedback: null, showLayers: null,
                builderChallenge: null, builderFeedback: null,
                paintSurfaceArea: false,
                wpAnswer: '', wpFeedback: null, wpCtxIdx: 0,
                dispObjectId: 'stone', dispLevel: 'elementary', dispCondition: 'careful', dispSubmerged: false, dispPrediction: '', dispAnswer: '', dispFeedback: null, dispExplanation: '',
                dispClayShape: 'lump', dispClayReshaped: false,
                shape: 'prism', showCrossSection: false, showNet: false, showCompare: false, netFold: 0
              });
              announceToSR('Volume explorer reset');
            },
            'aria-label': __alloT('stem.volume.reset', 'Reset'),
            title: __alloT('stem.volume.reset_everything', 'Reset everything'),
            className: 'text-[11px] font-bold px-2 py-0.5 ml-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
          }, __alloT('stem.volume.reset_2', '\u21BA Reset')),
          // Paint toggle
          !isDisplacement && h('button', { 'aria-label': __alloT('stem.volume.toggle_paint_p', 'Toggle paint (P)'),
            onClick: function() {
              upd({ paintSurfaceArea: !paintSurfaceArea });
              if (!badges.surfaceExplorer) checkBadges({ surfaceExplorer: true });
            },
            className: 'px-3 py-1 ml-2 rounded-lg text-xs font-bold transition-all border ' + (paintSurfaceArea ? 'bg-orange-100 text-orange-700 border-orange-600 shadow-inner' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'),
            title: __alloT('stem.volume.toggle_paint_p_2', 'Toggle paint (P)')
          }, paintSurfaceArea ? '\uD83E\uDDFC Wash Paint' : '\uD83C\uDFA8 Paint Surface'),
          // Zoom
          !isDisplacement && h('div', { className: 'flex items-center gap-1' },
            h('button', { 'aria-label': __alloT('stem.volume.zoom_out', 'Zoom out'), onClick: function() { upd({ scale: Math.max(0.4, scale - 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-600 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '\u2212'),
            h('span', { className: 'text-[11px] text-emerald-600 font-mono w-10 text-center' }, Math.round(scale*100)+'%'),
            h('button', { 'aria-label': __alloT('stem.volume.zoom_in', 'Zoom in'), onClick: function() { upd({ scale: Math.min(2.5, scale + 0.15) }); }, className: 'w-7 h-7 rounded-full bg-white border border-emerald-600 text-emerald-700 font-bold text-sm hover:bg-emerald-100 flex items-center justify-center' }, '+'),
            h('button', { 'aria-label': __alloT('stem.volume.reset_3d_view_rotation_and_zoom', 'Reset 3D view rotation and zoom'), onClick: function() { upd({ rotation: { x: -25, y: -35 }, scale: 1.0 }); }, className: 'ml-1 px-2 py-1 rounded-md bg-white border border-emerald-600 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100' }, '\u21BA'))
        ),

        // ── Badge panel ──
        showBadges && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border-2 border-amber-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC5 Badges (' + earnedCount + '/' + BADGES.length + ')'),
            h('button', { 'aria-label': __alloT('stem.volume.close_badges_panel', 'Close badges panel'), onClick: function() { upd({ showBadges: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
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
            h('p', { className: 'text-sm font-bold text-purple-800' }, __alloT('stem.volume.ai_volume_tutor', '\uD83E\uDDE0 AI Volume Tutor')),
            h('button', { onClick: function() { upd({ showAI: false }); }, className: 'text-xs text-slate-600 hover:text-slate-600' }, '\u2715')
          ),
          aiLoading
            ? h('div', { className: 'flex items-center gap-2' },
                h('div', { 'aria-hidden': 'true', className: 'w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full' + (reducedMotion ? '' : ' animate-spin') }),
                h('span', { className: 'text-xs text-purple-600' }, 'Thinking...')
              )
            : h('p', { className: 'text-sm text-purple-700 whitespace-pre-wrap leading-relaxed' }, aiResponse),
          !aiLoading && h('button', { 'aria-label': __alloT('stem.volume.ask_again', 'Ask Again'),
            onClick: askAI,
            className: 'mt-2 text-[11px] font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 border border-purple-600 transition-all'
          }, __alloT('stem.volume.ask_again_2', '\uD83D\uDD04 Ask Again'))
        ),

        // ── Topic-accent hero band per mode ──
        (function() {
          var MODE_META = {
            slider:   { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83C\uDF9A', title: __alloT('stem.volume.slider_v_l_w_h_watch_it_grow', 'Slider \u2014 V = l \u00d7 w \u00d7 h, watch it grow'),     hint: __alloT('stem.volume.sliders_snap_to_integer_dimensions_gre', 'Sliders snap to integer dimensions \u2014 great for the early visual: doubling each side multiplies volume by 8 (2\u00b3). Surface area scales as 2\u00b2; volume as 2\u00b3. The square-cube law explains why elephants have thick legs and shrews can fall safely.') },
            freeform: { accent: '#4f46e5', soft: 'rgba(79,70,229,0.10)',  icon: '\uD83E\uDDF1', title: __alloT('stem.volume.freeform_build_any_shape_count_cubes', 'Freeform \u2014 build any shape, count cubes'),         hint: __alloT('stem.volume.l_blocks_hollow_shapes_irregular_prism', 'L-blocks, hollow shapes, irregular prisms. Volume = total cubes regardless of arrangement. CCSS 5.MD.5: relate volume of a right rectangular prism to multiplication and addition (V = b\u00d7h or as the sum of partial volumes).') },
            word:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDCDD', title: __alloT('stem.volume.word_problems_volume_in_the_real_world', 'Word Problems \u2014 volume in the real world'),        hint: __alloT('stem.volume.a_fish_tank_with_5_3_4_60_cubes_of_wat', 'A fish tank with 5\u00d73\u00d74 = 60 cubes of water. A lunchbox of 4\u00d73\u00d72 = 24 sandwich cubes. Every multiplication of three dimensions is a real container with a real capacity. CCSS 5.MD.5b: solve real-world problems involving volume.') },
            displacement: { accent: '#0369a1', soft: 'rgba(2,132,199,0.12)', icon: '\uD83E\uDDEA', title: 'Displacement Lab - measure volume with water', hint: dispUsesSinker ? 'Predict, record the sinker-only reading, fully submerge the cork with the sinker, and use combined minus sinker-only. The change in milliliters equals the cork volume in cubic centimeters.' : 'Predict, read the bottom of the meniscus, fully submerge the specimen, and use final minus initial. The change in milliliters equals the object volume in cubic centimeters.' }
          };
          var modeKey = isDisplacement ? 'displacement' : (isWord ? 'word' : (isFreeform ? 'freeform' : 'slider'));
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

        // Dedicated inquiry surface for water displacement.
        isDisplacement && renderDisplacementLab(),
        // Word problem story panel (when in word mode)
        isWord && (function() {
          var ctx2 = WORD_CONTEXTS[wpCtxIdx % WORD_CONTEXTS.length];
          var story = ctx2.story.replace(/\{l\}/g, dims.l).replace(/\{w\}/g, dims.w).replace(/\{h\}/g, dims.h);
          return h('div', { className: 'space-y-2' },
            // Context picker row
            h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
              h('p', { className: 'text-[11px] font-bold text-amber-800 mb-2' }, __alloT('stem.volume.pick_a_context_to_make_volume_real', '🌍 Pick a context to make volume real:')),
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
                h('input', { 'aria-label': __alloT('stem.volume.volume_answer_for_word_problem', 'Volume answer for word problem'),
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
                          : { correct: false, msg: '❌ ' + diagnoseVolumeError(dims.l, dims.w, dims.h, parseInt(wpAnswer)) + ' (in ' + ctx2.unit + ')' },
                        score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                        streak: newStreak, wpSolved: newSolved
                      });
                      if (ok) {
                        awardStemXP('volume', 5, 'word problem');
                        checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10, wordWizard: newSolved >= 5 });
                      }
                    }
                  },
                  placeholder: __alloT('stem.volume.v', 'V = ?'),
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
                        : { correct: false, msg: '❌ ' + diagnoseVolumeError(dims.l, dims.w, dims.h, parseInt(wpAnswer)) + ' (in ' + ctx2.unit + ')' },
                      score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 },
                      streak: newStreak, wpSolved: newSolved
                    });
                    if (ok) {
                      awardStemXP('volume', 5, 'word problem');
                      checkBadges({ firstVolume: true, streak5: newStreak >= 5, streak10: newStreak >= 10, wordWizard: newSolved >= 5 });
                    }
                  },
                  disabled: !wpAnswer,
                  'aria-label': __alloT('stem.volume.check_answer', 'Check answer'),
                  className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-all'
                }, __alloT('stem.volume.check', 'Check'))
              ),
              wpFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (wpFeedback.correct ? 'text-green-700' : 'text-red-600'), 'aria-live': 'polite' }, wpFeedback.msg),
              wpFeedback && wpFeedback.correct && h('div', { className: 'mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200' },
                h('p', { className: 'text-[11px] text-amber-700' },
                  __alloT('stem.volume.the_rectangular_prism_above_shows_exac', '💡 The rectangular prism above shows exactly what the words describe. Volume is the count of unit cubes that fit inside.')
                )
              )
            ),
            h('p', { className: 'text-[10px] text-amber-700 italic text-center' },
              __alloT('stem.volume.adjust_the_sliders_below_to_match_the_', 'Adjust the sliders below to match the story — or try a new context. Solve 5 word problems to earn 📝 Word Wizard. Visit all 8 contexts for 🌍 Real-World Explorer.')
            )
          );
        })(),

        // Sliders (slider mode) — step 0.5 supports fractional dimensions.
        // SR announcements fire on each change so blind users hear the new volume.
        isSlider && h('div', { className: 'grid grid-cols-3 gap-3' },
          ['l','w','h'].map(function(dim) {
            var label = dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height';
            return h('div', { key: dim, className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-100' },
              h('label', { htmlFor: 'volume-dimension-' + dim, className: 'block text-xs text-emerald-700 mb-1 font-bold uppercase' }, label),
              h('input', { id: 'volume-dimension-' + dim,
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

        // Freeform layer builder: a visible top-down placement surface that
        // remains usable even when the 3D model is rotated or zoomed.
        isFreeform && (function() {
          var activeLayerColor = getLayerColor(activeBuildLayer);
          var activeLayerCount = positions.filter(function(pos) {
            return parseInt(pos.split('-')[2], 10) === activeBuildLayer;
          }).length;
          var placementCells = [];

          for (var row = 0; row < 8; row++) {
            for (var col = 0; col < 8; col++) {
              (function(cellX, cellY) {
                var cellKey = cellX + '-' + cellY + '-' + activeBuildLayer;
                var occupied = posSet.has(cellKey);
                placementCells.push(h('button', {
                  key: 'builder-' + cellKey,
                  type: 'button',
                  'data-volume-cell': cellKey,
                  'data-volume-cell-layer': String(activeBuildLayer),
                  'aria-label': (occupied ? 'Remove' : 'Place') + ' cube at column ' + (cellX + 1) + ', row ' + (cellY + 1) + ', layer ' + (activeBuildLayer + 1),
                  'aria-pressed': occupied,
                  onClick: function() { toggleFreeformCube(cellX, cellY, activeBuildLayer); },
                  className: 'aspect-square min-w-0 rounded-md border-2 text-sm font-black transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
                  style: occupied
                    ? { backgroundColor: activeLayerColor, borderColor: activeLayerColor, color: volumeLayerTextColor(activeLayerColor, activeBuildLayer) }
                    : { backgroundColor: '#ffffff', borderColor: activeLayerColor + '88', color: activeLayerColor }
                }, occupied ? '\u2713' : '+'));
              })(col, row);
            }
          }

          return h('section', {
            'data-volume-layer-builder': 'true',
            className: 'space-y-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3'
          },
            h('div', { className: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' },
              h('div', null,
                h('h4', { className: 'text-sm font-black text-indigo-900' }, 'Place blocks by layer'),
                h('p', { className: 'mt-1 text-xs text-indigo-700', 'aria-live': 'polite' },
                  'Layer ' + (activeBuildLayer + 1) + ' has ' + activeLayerCount + ' block' + (activeLayerCount === 1 ? '' : 's') + '. Select a square to add or remove one.'
                )
              ),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                h('label', { htmlFor: 'volume-freeform-layer', className: 'text-xs font-bold text-indigo-900' },
                  'Build layer',
                  h('select', {
                    id: 'volume-freeform-layer',
                    value: activeBuildLayer,
                    onChange: function(e) {
                      var nextLayer = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0));
                      upd({ activeBuildLayer: nextLayer });
                      announceToSR('Build layer ' + (nextLayer + 1) + ' selected.');
                    },
                    className: 'mt-1 block h-10 w-full rounded-md border border-indigo-300 bg-white px-2 text-sm font-bold text-indigo-900'
                  }, Array.from({ length: 10 }, function(_, index) {
                    return h('option', { key: index, value: index }, 'Layer ' + (index + 1));
                  }))
                ),
                h('label', { htmlFor: 'volume-layer-color', className: 'text-xs font-bold text-indigo-900' },
                  'Layer color',
                  h('input', {
                    id: 'volume-layer-color',
                    type: 'color',
                    value: activeLayerColor,
                    onChange: function(e) {
                      var nextColors = Object.assign({}, layerColors);
                      nextColors[String(activeBuildLayer)] = normalizeVolumeLayerColor(e.target.value, activeBuildLayer);
                      upd({ layerColors: nextColors });
                      announceToSR('Layer ' + (activeBuildLayer + 1) + ' color changed.');
                    },
                    className: 'mt-1 block h-10 w-full cursor-pointer rounded-md border border-indigo-300 bg-white p-1'
                  })
                )
              )
            ),
            h('p', { className: 'text-xs font-semibold text-indigo-800' }, 'The grid is a top-down view. The 3D preview updates immediately; click a 3D cube to remove it or an outlined top face to stack.'),
            h('div', { className: 'grid grid-cols-8 gap-1', role: 'group', 'aria-label': 'Block placement grid for layer ' + (activeBuildLayer + 1) }, placementCells),
            h('div', { className: 'flex flex-wrap justify-end gap-2' },
              h('button', { 'aria-label': __alloT('stem.volume.undo_last_placement_u', 'Undo last placement (U)'),
                onClick: doUndo,
                disabled: !undoStack.length,
                title: 'Undo (U) - ' + undoStack.length + ' step' + (undoStack.length === 1 ? '' : 's') + ' available',
                className: 'px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-40 border border-amber-300'
              }, '\u21B6 Undo (' + undoStack.length + ')'),
              h('button', { 'aria-label': __alloT('stem.volume.clear_all', 'Clear All'),
                onClick: function() { pushUndo(); upd({ positions: [], builderChallenge: null, builderFeedback: null }); announceToSR('Cleared all cubes'); },
                className: 'px-3 py-1.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300'
              }, __alloT('stem.volume.clear_all_2', '\u21BA Clear All'))
            )
          );
        })(),

        // 3D viewport — pointer events (mouse + touch + pen), pinch-to-zoom,
        // keyboard rotation. tabIndex=0 makes it focusable for keyboard users.
        !isDisplacement && h('div', {
          className: 'relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none focus:outline-none focus:ring-2 focus:ring-emerald-400',
          style: { minHeight: '350px', perspective: '900px', touchAction: 'none' },
          tabIndex: 0,
          role: 'application',
          'aria-label': isFreeform ? '3D construction preview. Add or remove blocks with the layer placement grid above. Drag or use arrow keys to rotate.' : __alloT('stem.volume.interactive_3d_viewport_drag_swipe_or_', 'Interactive 3D viewport. Drag, swipe, or use arrow keys to rotate. Pinch or +/- to zoom. R to reset view.'),
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onPointerCancel: handlePointerUp,
          onKeyDown: handleViewportKeyDown,
          onWheel: function(e) { upd({ scale: Math.max(0.4, Math.min(2.5, scale + (e.deltaY > 0 ? -0.08 : 0.08))) }); }
        },
          isFreeform && h('div', { className: 'pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-indigo-300/40 bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-indigo-100' }, '3D preview - build with the layer grid above'),
          h('div', {
          style: {
            transformStyle: 'preserve-3d',
            transform: 'rotateX('+rotation.x+'deg) rotateY('+rotation.y+'deg) scale3d('+scale+','+scale+','+scale+')',
            transition: 'transform 0.15s ease-out',
            position: 'relative', width: fw+'px', height: fh+'px'
          }
          }, cubes)),

        // Layer slider (slider mode)
        isSlider && h('div', { className: 'flex items-center gap-2 bg-emerald-50 rounded-lg p-2 border border-emerald-100' },
          h('label', { htmlFor: 'volume-visible-layers', className: 'text-xs font-bold text-emerald-700' }, 'Layers:'),
          h('input', { id: 'volume-visible-layers',
            type: 'range', min: '1', max: dims.h,
            value: showLayers != null ? showLayers : dims.h,
            onChange: function(e) {
              var lv = parseInt(e.target.value);
              upd({ showLayers: lv, layerUsed: true });
              if (!badges.layerMaster) checkBadges({ layerMaster: true });
            },
            'aria-label': __alloT('stem.volume.visible_layers', 'Visible layers'),
            className: 'flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600'
          }),
          h('span', { className: 'text-xs font-mono text-emerald-600' },
            (showLayers != null ? showLayers : dims.h) + ' / ' + dims.h)
        ),

        // Shape selector (slider mode only) — prism / cylinder / cone / pyramid
        isSlider && h('div', { className: 'bg-white rounded-xl p-2 border border-emerald-200' },
          h('div', { className: 'flex items-center gap-1 flex-wrap', role: 'radiogroup', 'aria-label': __alloT('stem.volume.shape_selector', 'Shape selector') },
            h('span', { className: 'text-[11px] font-bold text-emerald-700 mr-1' }, __alloT('stem.volume.shape', '🔷 Shape:')),
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
            __alloT('stem.volume.visual_is_a_voxel_approximation_built_', '⚠ Visual is a voxel approximation (built from unit cubes). The formula '),
            h('span', { className: 'font-mono font-bold text-emerald-800' }, (SHAPES_META.find(function(m) { return m.id === shape; }) || {}).formula),
            __alloT('stem.volume.gives_the_exact_analytic_volume', ' gives the exact analytic volume = '),
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
              'aria-label': __alloT('stem.volume.formula_with_dimensions_substituted', 'Formula with dimensions substituted')
            },
              h('span', { className: 'font-bold text-emerald-700 mr-2' }, sf.formula),
              h('span', { className: 'text-emerald-600' }, '→ '),
              h('span', { className: 'text-emerald-800' }, stepStr),
              h('span', { className: 'text-emerald-600 mx-1' }, '='),
              h('span', { className: 'font-extrabold text-emerald-900' }, resultStr),
              h('span', { className: 'text-emerald-700 ml-1 not-italic' }, __alloT('stem.volume.cubic_units', ' cubic units'))
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
            title: __alloT('stem.volume.slice_horizontally_to_see_the_area_tim', 'Slice horizontally to see the area-times-depth relationship'),
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ' +
              (showCrossSection ? 'bg-rose-700 text-white border-rose-700 shadow-inner' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')
          }, showCrossSection ? '✂ Hide cross-section' : '✂ Cross-section slice')
        ),
        // Cross-section slice slider
        isSlider && showCrossSection && h('div', { className: 'bg-rose-50 rounded-lg p-2 border border-rose-200' },
          h('div', { className: 'flex items-center gap-2' },
            h('label', { htmlFor: 'volume-cross-section-layer', className: 'text-[11px] font-bold text-rose-700' }, __alloT('stem.volume.cut_at_layer', '✂ Cut at layer:')),
            h('input', { id: 'volume-cross-section-layer',
              type: 'range', min: '0', max: Math.max(0, Math.ceil(dims.h) - 1),
              value: Math.min(crossSectionLayer, Math.ceil(dims.h) - 1),
              onChange: function(e) {
                var v = parseInt(e.target.value);
                upd({ crossSectionLayer: v });
                announceToSR('Cross-section at layer ' + v);
              },
              'aria-label': __alloT('stem.volume.cross_section_layer_position', 'Cross-section layer position'),
              className: 'flex-1 h-1.5 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600'
            }),
            h('span', { className: 'text-xs font-mono text-rose-700 w-12 text-right' }, Math.min(crossSectionLayer, Math.ceil(dims.h) - 1) + ' / ' + (Math.ceil(dims.h) - 1))
          ),
          h('p', { className: 'mt-1 text-[10px] text-rose-700 italic' },
            '💡 The cut face at layer ' + Math.min(crossSectionLayer, Math.ceil(dims.h) - 1) + ' has area = ',
            h('span', { className: 'font-mono font-bold' }, (shape === 'prism' ? (dims.l * dims.w) : '~' + voxelizeShape(shape, dims.l, dims.w, dims.h).filter(function(v) { return v.z === Math.min(crossSectionLayer, Math.ceil(dims.h) - 1); }).length)),
            __alloT('stem.volume.square_units_volume_cross_section_area', ' square units. Volume = (cross-section area) × (depth) is the foundation of integral calculus.')
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
        !isDisplacement && h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-xl p-3 border border-emerald-100 text-center flex flex-col items-center justify-center' },
            h('div', { className: 'text-xs font-bold text-emerald-600 uppercase mb-1' }, __alloT('stem.volume.volume', 'Volume')),
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
                  (isFreeform && builderChallenge && builderChallenge.type === 'volume') ? '?' : volume))
            ),
            (isSlider && challenge && !feedback) ? null :
            (isFreeform && builderChallenge && builderChallenge.type === 'volume') ? null :
            h('div', { className: 'text-xs text-slate-600' }, volume + ' unit cube' + (volume !== 1 ? 's' : ''))
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-teal-100 text-center' },
            h('div', { className: 'text-xs font-bold text-teal-600 uppercase mb-1' }, __alloT('stem.volume.surface_area', 'Surface Area')),
            h('div', { className: 'text-xl font-bold text-teal-800' },
              __alloT('stem.volume.sa', 'SA = '), h('span', { className: 'text-2xl text-teal-600' },
                (isSlider && challenge && !feedback) ? '?' :
                (isFreeform && builderChallenge && builderChallenge.type === 'volume') ? '?' : surfaceArea)),
            isSlider && !challenge && h('div', { className: 'text-xs text-slate-600' },
              '2('+dims.l+'\u00d7'+dims.w+' + '+dims.l+'\u00d7'+dims.h+' + '+dims.w+'\u00d7'+dims.h+')')
          )
        ),

        // === H7b'' inquiry widget: volume predictor ===
        !isDisplacement && (function() {
          var iq = _v._volPred || { lpred: 3, wpred: 3, hpred: 3, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd({ _volPred: Object.assign({}, iq, patch) }); }
          var predicted = iq.lpred * iq.wpred * iq.hpred;
          var actual = (dims.l || 1) * (dims.w || 1) * (dims.h || 1);
          var diff = Math.abs(predicted - actual);
          var state = diff < 2 ? 'close' : (diff < 8 ? 'mid' : 'far');
          var sm = {
            close: { label: __alloT('stem.volume.close_match', '🎯 Close match'), color: '#059669', bg: '#ecfdf5', border: '#86efac' },
            mid:   { label: __alloT('stem.volume.in_the_ballpark', '🟡 In the ballpark'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
            far:   { label: __alloT('stem.volume.far_off', '🔴 Far off'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
          }[state];
          return h('div', { className: 'mt-3 mb-3 p-3 rounded-xl bg-white border border-indigo-200' },
            h('h4', { className: 'text-sm font-black text-indigo-700 mb-1' }, __alloT('stem.volume.volume_predictor_sense_check', '📊 Volume predictor — sense-check')),
            h('p', { className: 'text-[11px] text-slate-700 mb-2 leading-relaxed' }, __alloT('stem.volume.adjust_your_predicted_dimensions_compa', 'Adjust your PREDICTED dimensions, compare to actual prism. Discrete outcome: close/mid/far. No score, no reveal.')),
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
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ p: predicted, a: actual, st: state }]).slice(-8) }); }, className: 'px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.volume.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ lpred: 3, wpred: 3, hpred: 3, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.volume.reset_3', '↺ Reset')),
              (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
            ),
            h('textarea', { id: 'volume-predictor-hypothesis', 'aria-label': 'Volume prediction hypothesis', value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.volume.hypothesis_how_do_you_build_intuition_', 'Hypothesis: How do you build intuition for predicting volume?'),
              className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug mb-2', rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-300 mb-2' }, __alloT('stem.volume.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700 leading-relaxed mb-2' },
              h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                h('li', null, __alloT('stem.volume.which_dimension_affects_volume_the_mos', 'Which dimension affects volume the most?')),
                h('li', null, __alloT('stem.volume.try_halving_one_dimension_what_happens', 'Try halving one dimension — what happens to volume?')),
                h('li', null, __alloT('stem.volume.when_are_predictions_hardest_when_easi', 'When are predictions hardest? When easiest?')))),
            h('label', { className: 'flex items-center gap-1 text-[11px] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
              __alloT('stem.volume.i_understand_explain_in_own_words', 'I understand — explain in own words')),
            iq.understood && h('textarea', { id: 'volume-predictor-explanation', 'aria-label': 'Explain how each dimension contributes to total volume', value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.volume.explain_how_each_dimension_contributes', 'Explain how each dimension contributes to total volume.'),
              className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
            h('div', { className: 'mt-2 text-[10px] italic text-slate-500' }, __alloT('stem.volume.design_note_discrete_3_state_outcome_n', 'Design note: discrete 3-state outcome; no exact-volume score; no reveal — by design.'))
          );
        })(),

        // Challenge buttons (skip in word mode — it has its own challenge built in)
        !isWord && !isDisplacement && h('div', { className: 'flex gap-2 flex-wrap' },
          mode === 'slider' ? h(React.Fragment, null,
            h('button', { 'aria-label': __alloT('stem.volume.random_challenge', 'Random Challenge'),
              onClick: function() {
                var l = Math.floor(Math.random()*8)+1, w = Math.floor(Math.random()*6)+1, hh = Math.floor(Math.random()*6)+1;
                upd({ dims: {l:l,w:w,h:hh}, challenge: {l:l,w:w,h:hh,answer:l*w*hh}, answer: '', feedback: null, showLayers: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md',
              title: __alloT('stem.volume.new_challenge_n', 'New challenge (N)')
            }, __alloT('stem.volume.random_challenge_2', '\uD83C\uDFB2 Random Challenge')),
            h('button', { 'aria-label': __alloT('stem.volume.reset_4', 'Reset'),
              onClick: function() { upd({ dims: {l:3,w:2,h:2}, challenge: null, feedback: null, showLayers: null, rotation: {x:-25,y:-35}, scale: 1.0 }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300'
            }, __alloT('stem.volume.reset_5', '\u21BA Reset'))
          ) : h(React.Fragment, null,
            h('button', { 'aria-label': __alloT('stem.volume.build_prism', 'Build Prism'),
              onClick: function() {
                var pl=2+Math.floor(Math.random()*4), pw=2+Math.floor(Math.random()*3), ph=1+Math.floor(Math.random()*3);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'prism',target:{l:pl,w:pw,h:ph},answer:pl*pw*ph}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-lg text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
            }, __alloT('stem.volume.build_prism_2', '\uD83C\uDFD7\uFE0F Build Prism')),
            h('button', { 'aria-label': __alloT('stem.volume.l_block_vol', 'L-Block Vol'),
              onClick: function() {
                var lb = generateLBlock();
                upd({ mode: 'freeform', positions: lb.positions, builderChallenge: {type:'volume',answer:lb.volume,shape:'L-Block'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md'
            }, __alloT('stem.volume.l_block_vol_2', '\uD83D\uDCD0 L-Block Vol')),
            h('button', { 'aria-label': __alloT('stem.volume.random_vol', 'Random Vol'),
              onClick: function() {
                var tv = 5+Math.floor(Math.random()*16);
                upd({ mode: 'freeform', positions: [], builderChallenge: {type:'volume',answer:tv,shape:'any'}, builderFeedback: null, challenge: null, feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, __alloT('stem.volume.random_vol_2', '\uD83C\uDFB2 Random Vol')),
            h('button', { 'aria-label': __alloT('stem.volume.open_buildable_challenges_library', 'Open buildable challenges library'),
              onClick: function() { upd({ showBuildLibrary: !showBuildLibrary, mode: 'freeform' }); },
              'aria-expanded': showBuildLibrary,
              title: __alloT('stem.volume.browse_named_structures_to_build', 'Browse named structures to build'),
              className: 'flex-1 py-2 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-fuchsia-600 transition-all shadow-md'
            }, __alloT('stem.volume.library', '\uD83D\uDCDA Library'))
          )
        ),

        // \u2500\u2500 Buildable challenge library panel \u2500\u2500
        isFreeform && showBuildLibrary && h('div', { className: 'bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-3 border-2 border-pink-200 space-y-2' },
          h('div', { className: 'flex items-center justify-between' },
            h('p', { className: 'text-sm font-bold text-pink-800' }, __alloT('stem.volume.buildable_challenges_pick_a_structure_', '\uD83D\uDCDA Buildable challenges \u2014 pick a structure to try')),
            h('button', { onClick: function() { upd({ showBuildLibrary: false }); }, 'aria-label': __alloT('stem.volume.close_library', 'Close library'), className: 'text-xs text-pink-600 hover:text-pink-800' }, '\u00D7')
          ),
          h('p', { className: 'text-[11px] text-pink-700 italic' },
            __alloT('stem.volume.click_a_name_to_set_it_as_your_target_', 'Click a name to set it as your target \u2014 the cubes will appear as ghost outlines. Match the shape, then Check.')
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
        isFreeform && builderChallenge && builderChallenge.library && h('div', { className: 'bg-pink-50 rounded-lg p-2 border border-pink-200' },
          h('p', { className: 'text-[11px] text-pink-800' },
            __alloT('stem.volume.building', '\uD83D\uDCDA Building: '), h('b', null, builderChallenge.shape),
            __alloT('stem.volume.target_v', ' \u00B7 Target V = '), h('b', null, builderChallenge.answer),
            ' \u00B7 ', h('span', { className: 'italic' }, builderChallenge.libraryDesc),
            h('button', {
              onClick: function() {
                pushUndo();
                playSound('place');
                upd({ positions: builderChallenge.libraryPositions.slice() });
                announceToSR('Solution shown');
              },
              title: __alloT('stem.volume.reveal_the_solution_gives_up_no_badge', 'Reveal the solution (gives up \u2014 no badge)'),
              className: 'ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white text-pink-700 border border-pink-300 hover:bg-pink-100'
            }, __alloT('stem.volume.show_solution', '\uD83D\uDC40 Show solution'))
          )
        ),

        // Challenge input (slider mode)
        isSlider && challenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
          h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, __alloT('stem.volume.what_is_the_volume', '\uD83E\uDD14 What is the volume?')),
          h('div', { className: 'flex gap-2 items-center' },
            h('input', { 'aria-label': __alloT('stem.volume.volume_answer', 'Volume answer'),
              type: 'number', value: answer,
              onChange: function(e) { upd({ answer: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
              placeholder: __alloT('stem.volume.v_2', 'V = ?'), className: 'flex-1 px-3 py-2 border border-amber-600 rounded-lg text-sm font-mono'
            }),
            h('button', { 'aria-label': __alloT('stem.volume.check_2', 'Check'),
              onClick: checkChallenge, disabled: !answer,
              className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm disabled:opacity-40'
            }, __alloT('stem.volume.check_3', 'Check')),
            h('button', { onClick: askAI,
              className: 'px-3 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-sm',
              title: __alloT('stem.volume.get_a_hint_from_ai', 'Get a hint from AI')
            }, '\uD83E\uDDE0')
          ),
          feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg)
        ),

        // Builder challenge (freeform mode)
        isFreeform && builderChallenge && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-800 mb-2' },
            builderChallenge.type === 'prism'
              ? '\uD83C\uDFD7\uFE0F Build a '+builderChallenge.target.l+'\u00d7'+builderChallenge.target.w+'\u00d7'+builderChallenge.target.h+' rectangular prism'
              : builderChallenge.shape === 'L-Block'
                ? '\uD83D\uDCD0 What is the volume of this L-shaped block?'
                : '\uD83C\uDFB2 Build a shape with volume = '+builderChallenge.answer
          ),
          h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-indigo-600' }, __alloT('stem.volume.cubes_placed', 'Cubes placed: '), h('span', { className: 'font-bold' }, posSet.size)),
            h('button', { 'aria-label': __alloT('stem.volume.hint', 'Hint'),
              onClick: askAI,
              className: 'px-3 py-1.5 bg-purple-100 text-purple-600 font-bold rounded-lg hover:bg-purple-200 transition-all text-xs',
              title: __alloT('stem.volume.get_a_hint_from_ai_2', 'Get a hint from AI')
            }, __alloT('stem.volume.hint_2', '\uD83E\uDDE0 Hint')),
            h('button', { 'aria-label': __alloT('stem.volume.check_4', 'Check'), onClick: checkChallenge, className: 'ml-auto px-4 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-sm hover:bg-indigo-600' }, __alloT('stem.volume.check_5', '\u2714 Check'))
          ),
          builderFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (builderFeedback.correct ? 'text-green-600' : 'text-red-600') }, builderFeedback.msg)
        ),

        // ── v4: Tools row — units, fractional, save/load, export ──
        !isDisplacement && h('div', { className: 'bg-white rounded-xl p-3 border border-emerald-200 space-y-2' },
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            // Real-world unit selector
            h('label', { className: 'text-[11px] font-bold text-emerald-700 mr-1' }, __alloT('stem.volume.display_as', '📏 Display as:')),
            h('select', {
              value: unitId,
              onChange: function(e) {
                upd({ unitId: e.target.value });
                announceToSR('Display unit changed to ' + (REAL_UNITS.find(function(u) { return u.id === e.target.value; }) || {}).long);
              },
              'aria-label': __alloT('stem.volume.real_world_unit_selector', 'Real-world unit selector'),
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
                'aria-label': __alloT('stem.volume.allow_fractional_dimensions', 'Allow fractional dimensions'),
                className: 'accent-emerald-600'
              }),
              __alloT('stem.volume.fractional_dims', '½ Fractional dims')
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
              'aria-label': __alloT('stem.volume.save_current_construction', 'Save current construction'),
              title: __alloT('stem.volume.save_current_dims_cubes_with_a_name', 'Save current dims + cubes with a name'),
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
            }, __alloT('stem.volume.save', '💾 Save')),
            // Toggle saved-list panel
            h('button', {
              id: 'volume-saved-toggle',
              onClick: function() { upd({ showSaved: !showSaved }); },
              'aria-expanded': showSaved,
              'aria-label': __alloT('stem.volume.show_saved_constructions', 'Show saved constructions'),
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
              'aria-label': __alloT('stem.volume.export_current_construction_as_png_ima', 'Export current construction as PNG image'),
              title: __alloT('stem.volume.download_a_png_snapshot_of_the_current', 'Download a PNG snapshot of the current build'),
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
            }, __alloT('stem.volume.export_png', '🖼 Export PNG'))
          ),
          // Real-world unit display strip
          unitId !== 'unit' && h('div', { className: 'bg-emerald-50 rounded-md p-2 border border-emerald-200 text-[11px] text-emerald-800' },
            __alloT('stem.volume.in_real_world_units_volume', '🌍 In real-world units: Volume = '), h('b', null, formatVolumeWithUnit(volume)),
            __alloT('stem.volume.surface_area_2', ' · Surface area = '), h('b', null, formatVolumeWithUnit(surfaceArea).replace('cubic', 'square').replace('³', '²').replace('cm³', 'cm²').replace('in³', 'in²').replace('ft³', 'ft²').replace('m³', 'm²'))
          ),
          // Saved constructions list
          showSaved && h('div', { className: 'border-t border-emerald-100 pt-2' },
            h('p', { className: 'text-[11px] font-bold text-indigo-700 mb-1' }, '📂 Saved constructions (' + Object.keys(saved).length + '):'),
            Object.keys(saved).length === 0
              ? h('p', { className: 'text-[11px] text-slate-500 italic' }, __alloT('stem.volume.nothing_saved_yet_build_something_and_', 'Nothing saved yet. Build something and click 💾 Save.'))
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
                        title: __alloT('stem.volume.load_this_construction', 'Load this construction'),
                        className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100'
                      }, __alloT('stem.volume.load', 'Load')),
                      h('button', {
                        onClick: function() { requestDeleteSaved(name); },
                        'aria-label': 'Delete ' + name,
                        title: __alloT('stem.volume.delete_this_construction', 'Delete this construction'),
                        className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-100'
                      }, '×')
                    );
                  })
                )
          )
        ),

        // ── Keyboard shortcuts legend ──
        !isDisplacement && h('div', { className: 'text-[11px] text-slate-600 text-center space-x-3' },
          h('span', null, __alloT('stem.volume.s_slider', 'S Slider')),
          h('span', null, __alloT('stem.volume.f_freeform', 'F Freeform')),
          h('span', null, __alloT('stem.volume.w_word', 'W Word')),
          h('span', null, 'D Displacement'),
          h('span', null, __alloT('stem.volume.n_challenge', 'N Challenge')),
          h('span', null, __alloT('stem.volume.p_paint', 'P Paint')),
          h('span', null, __alloT('stem.volume.b_badges', 'B Badges')),
          h('span', null, __alloT('stem.volume.u_undo', 'U Undo')),
          h('span', null, __alloT('stem.volume.rotate', '↑↓←→ Rotate')),
          h('span', null, __alloT('stem.volume.zoom', '+/- Zoom')),
          h('span', null, __alloT('stem.volume.r_reset_view', 'R Reset view')),
          h('span', null, __alloT('stem.volume.ai_2', '? AI'))
        ),

        // ═══════════════════════════════════════════════════════
        // VOLUME FORMULAS — interactive reference panel
        // ═══════════════════════════════════════════════════════
        !isDisplacement && h('div', { className: 'mt-5 rounded-2xl border border-cyan-300 bg-white p-3 shadow-sm' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-lg', 'aria-hidden': 'true' }, '📐'),
              h('h4', { className: 'text-sm font-bold text-cyan-700' }, __alloT('stem.volume.volume_formulas_in_motion', 'Volume Formulas in Motion'))
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-[10px] italic text-slate-600' }, __alloT('stem.volume.6_solids_rotating_with_live_formulas', '6 solids rotating with live formulas')),
              h('button', { type: 'button', disabled: reducedMotion, 'aria-pressed': (formulasPaused || reducedMotion) ? 'true' : 'false',
                onClick: function() { upd({ formulasPaused: !formulasPaused }); },
                'aria-label': reducedMotion ? 'Formula animation disabled by reduced motion preference' : formulasPaused ? 'Resume formula animation' : 'Pause formula animation',
                className: 'min-h-8 rounded-lg border border-cyan-500 bg-white px-2 py-1 text-[10px] font-bold text-cyan-800 disabled:cursor-not-allowed disabled:opacity-70' },
                reducedMotion ? 'Motion off (system)' : formulasPaused ? '▶ Resume' : '⏸ Pause'))
          ),
          h('p', { id: 'volume-formulas-description', className: 'sr-only' },
            'Cube: V equals s cubed. Sphere: V equals four thirds pi r cubed. Cylinder: V equals pi r squared h. Cone: V equals one third pi r squared h. Pyramid: V equals one third base area times height. Prism: V equals base area times height.'),
          h('div', { className: 'rounded-xl overflow-hidden border border-cyan-200', style: { background: '#020210', aspectRatio: '16/6' } },
            h('canvas', {
              role: 'img', tabIndex: 0, 'aria-label': 'Volume and 3D shape visualization.', 'aria-describedby': 'volume-formulas-description',
              ref: function(cvEl) {
                if (!cvEl) return;
                cvEl._volPaused = formulasPaused || reducedMotion;
                if (cvEl._volAnim) return;
                var c2 = cvEl.getContext('2d');
                var W = cvEl.offsetWidth || 600;
                var H = cvEl.offsetHeight || 220;
                cvEl.width = W * 2; cvEl.height = H * 2;
                c2.scale(2, 2);
                cvEl._volTime = 0;
                cvEl._volLastFrame = performance.now();
                function drawVol() {
                  if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._volAnim); if (cvEl._volRO) cvEl._volRO.disconnect(); return; }
                  var frameNow = performance.now();
                  var frameDelta = Math.max(0, (frameNow - cvEl._volLastFrame) / 1000);
                  cvEl._volLastFrame = frameNow;
                  if (!cvEl._volPaused) cvEl._volTime += frameDelta;
                  var t = cvEl._volTime;
                  c2.fillStyle = '#020210';
                  c2.fillRect(0, 0, W, H);
                  var solids = [
                    { name: __alloT('stem.volume.cube', 'Cube'), formula: 'V = s³', vol: '64', s: 4, color: '#7dd3fc' },
                    { name: __alloT('stem.volume.sphere', 'Sphere'), formula: 'V = ⁴⁄₃πr³', vol: '113', s: 3, color: '#a78bfa' },
                    { name: __alloT('stem.volume.cylinder_2', 'Cylinder'), formula: 'V = πr²h', vol: '151', s: 3, color: '#f472b6' },
                    { name: __alloT('stem.volume.cone_2', 'Cone'), formula: 'V = ⅓πr²h', vol: '50', s: 3, color: '#fbbf24' },
                    { name: __alloT('stem.volume.pyramid', 'Pyramid'), formula: 'V = ⅓·b·h', vol: '32', s: 3, color: '#fb923c' },
                    { name: __alloT('stem.volume.prism', 'Prism'), formula: 'V = b·h', vol: '60', s: 3, color: '#10b981' }
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
        ),
        pendingDeleteName ? renderDeleteDialog() : null
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
      // Export-only detached canvas; it is never inserted into the accessibility tree.
      canvas.setAttribute('role', 'presentation');
      canvas.setAttribute('aria-label', 'Export-only image conversion canvas');
      canvas.setAttribute('aria-hidden', 'true');
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
