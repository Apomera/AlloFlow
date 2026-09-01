/**
 * stem_tool_archstudio.js — Architecture Studio / Brick Builder
 *
 * 3D building simulator with shapes, materials, STL export,
 * blueprint SVG export, structural analysis, progressive coach tips,
 * AI architect advisor, undo/redo history, save/load gallery,
 * templates, mirror/symmetry, block rotation, layer view,
 * material budget, side-view blueprint, and sound effects.
 *
 * Registered tool ID: "archStudio"
 * Registry: window.StemLab.registerTool()
 */
(function () {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-archstudio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-archstudio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* silent */ }
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
    } catch (e) { /* silent */ }
  }
  function sfxPlace() { playTone(520, 0.08, 'square', 0.08); setTimeout(function () { playTone(680, 0.06, 'square', 0.06); }, 40); }
  function sfxErase() { playTone(400, 0.1, 'sawtooth', 0.07); setTimeout(function () { playTone(280, 0.12, 'sawtooth', 0.05); }, 50); }
  function sfxUndo() { playTone(350, 0.06, 'triangle', 0.06); }
  function sfxRedo() { playTone(450, 0.06, 'triangle', 0.06); }
  function sfxSave() { playTone(600, 0.08, 'sine', 0.08); setTimeout(function () { playTone(800, 0.1, 'sine', 0.08); }, 80); }
  function sfxLoad() { playTone(500, 0.06, 'sine', 0.07); setTimeout(function () { playTone(650, 0.08, 'sine', 0.07); }, 60); setTimeout(function () { playTone(800, 0.06, 'sine', 0.06); }, 120); }
  // Expose sfx on window so main module's Three.js click handlers can use them
  window._archStudioSfx = { place: sfxPlace, erase: sfxErase };

  function sfxChallenge() {
    playTone(523, 0.15, 'sine', 0.1);
    setTimeout(function () { playTone(659, 0.15, 'sine', 0.1); }, 120);
    setTimeout(function () { playTone(784, 0.2, 'sine', 0.12); }, 240);
    setTimeout(function () { playTone(1047, 0.3, 'sine', 0.1); }, 400);
  }

  // ══════════════════════════════════════════════════════════════
  // ── Gallery Storage ──
  // ══════════════════════════════════════════════════════════════
  var STORAGE_KEY = 'alloflow_archstudio_builds';
  function loadGallery() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(-50).map(function (item, index) {
        if (!item || typeof item !== 'object') return null;
        var savedBlocks = sanitizeArchBlocks(item.blocks);
        if (!savedBlocks.length) return null;
        return {
          id: String(item.id || ('arch_saved_' + index)).slice(0, 100),
          name: String(item.name || 'Saved build').slice(0, 80),
          blocks: savedBlocks,
          blockCount: savedBlocks.length,
          dims: String(item.dims || ''),
          stability: Math.max(0, Math.min(100, Number(item.stability) || 0)),
          timestamp: Number(item.timestamp) || 0
        };
      }).filter(Boolean);
    } catch (e) { return []; }
  }
  function saveGallery(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify((Array.isArray(arr) ? arr : []).slice(-50)));
      return true;
    } catch (e) { return false; }
  }

  // ══════════════════════════════════════════════════════════════
  // ── Template Definitions ──
  // ══════════════════════════════════════════════════════════════
  function makeTemplates() {
    // Helper: fill perimeter at given y
    function perim(w, d, y, shape, mat, color) {
      var out = [];
      for (var x = 0; x < w; x++) { out.push({ x: x, y: y, z: 0, shape: shape, material: mat, color: color }); out.push({ x: x, y: y, z: d - 1, shape: shape, material: mat, color: color }); }
      for (var z = 1; z < d - 1; z++) { out.push({ x: 0, y: y, z: z, shape: shape, material: mat, color: color }); out.push({ x: w - 1, y: y, z: z, shape: shape, material: mat, color: color }); }
      return out;
    }
    return [
      {
        id: 'cottage', name: 'Cottage', icon: '\uD83C\uDFE0', desc: 'Cozy house with stone base, wood walls, and a roof',
        blocks: function () {
          var b = [];
          // Stone foundation y=0
          for (var x = 0; x < 5; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'slab', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          // Wood walls y=1,2
          b = b.concat(perim(5, 4, 1, 'block', 'wood', '#92400e'));
          b = b.concat(perim(5, 4, 2, 'block', 'wood', '#92400e'));
          // Door (replace front center)
          b = b.filter(function (bl) { return !(bl.x === 2 && bl.z === 0 && bl.y >= 1); });
          b.push({ x: 2, y: 1, z: 0, shape: 'door', material: 'wood', color: '#78350f' });
          // Windows on sides
          b = b.filter(function (bl) { return !(bl.x === 1 && bl.z === 0 && bl.y === 2) && !(bl.x === 3 && bl.z === 0 && bl.y === 2); });
          b.push({ x: 1, y: 2, z: 0, shape: 'window', material: 'glass', color: '#38bdf8' });
          b.push({ x: 3, y: 2, z: 0, shape: 'window', material: 'glass', color: '#38bdf8' });
          // Back windows
          b = b.filter(function (bl) { return !(bl.x === 1 && bl.z === 3 && bl.y === 2) && !(bl.x === 3 && bl.z === 3 && bl.y === 2); });
          b.push({ x: 1, y: 2, z: 3, shape: 'window', material: 'glass', color: '#38bdf8' });
          b.push({ x: 3, y: 2, z: 3, shape: 'window', material: 'glass', color: '#38bdf8' });
          // Roof y=3
          for (var rx = 0; rx < 5; rx++) for (var rz = 0; rz < 4; rz++) b.push({ x: rx, y: 3, z: rz, shape: 'roof', material: 'brick', color: '#b45309' });
          return b;
        }
      },
      {
        id: 'temple', name: 'Greek Temple', icon: '\uD83C\uDFDB\uFE0F', desc: 'Classical marble temple with columns and arches',
        blocks: function () {
          var b = [];
          // Marble platform y=0
          for (var x = 0; x < 7; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'slab', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          // Columns at corners + midpoints y=1,2,3
          var colPositions = [[0, 0], [0, 3], [3, 0], [3, 3], [6, 0], [6, 3]];
          colPositions.forEach(function (p) {
            for (var cy = 1; cy <= 3; cy++) b.push({ x: p[0], y: cy, z: p[1], shape: 'column', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          });
          // Arches between front columns y=3
          b.push({ x: 1, y: 3, z: 0, shape: 'arch', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 2, y: 3, z: 0, shape: 'arch', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 4, y: 3, z: 0, shape: 'arch', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 5, y: 3, z: 0, shape: 'arch', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          // Roof y=4 (triangular with pyramid at peak)
          for (var rx = 0; rx < 7; rx++) for (var rz = 0; rz < 4; rz++) b.push({ x: rx, y: 4, z: rz, shape: 'slab', material: 'marble', color: 'var(--allo-stem-text, #e2e8f0)' });
          b.push({ x: 2, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 3, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 4, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 2, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 3, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          b.push({ x: 4, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          return b;
        }
      },
      {
        id: 'tower', name: 'Castle Tower', icon: '\uD83C\uDFF0', desc: 'Tall stone tower with battlements',
        blocks: function () {
          var b = [];
          // Base platform
          for (var x = 0; x < 4; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          // Walls y=1..6
          for (var wy = 1; wy <= 6; wy++) b = b.concat(perim(4, 4, wy, 'block', 'stone', '#94a3b8'));
          // Door
          b = b.filter(function (bl) { return !(bl.x === 1 && bl.z === 0 && (bl.y === 1 || bl.y === 2)); });
          b.push({ x: 1, y: 1, z: 0, shape: 'door', material: 'wood', color: '#78350f' });
          // Arrow slits (windows)
          b = b.filter(function (bl) { return !(bl.x === 1 && bl.z === 3 && bl.y === 4) && !(bl.x === 2 && bl.z === 0 && bl.y === 4); });
          b.push({ x: 1, y: 4, z: 3, shape: 'window', material: 'glass', color: '#38bdf8' });
          b.push({ x: 2, y: 4, z: 0, shape: 'window', material: 'glass', color: '#38bdf8' });
          // Battlements y=7 (alternating)
          [[0, 0], [0, 2], [2, 0], [2, 3], [3, 1], [3, 3], [1, 3]].forEach(function (p) {
            b.push({ x: p[0], y: 7, z: p[1], shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          });
          return b;
        }
      },
      {
        id: 'bridge', name: 'Arch Bridge', icon: '\uD83C\uDF09', desc: 'Stone bridge with arches spanning a gap',
        blocks: function () {
          var b = [];
          // Left pillar
          for (var y = 0; y <= 3; y++) { b.push({ x: 0, y: y, z: 0, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); b.push({ x: 0, y: y, z: 1, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); }
          // Right pillar
          for (var ry = 0; ry <= 3; ry++) { b.push({ x: 5, y: ry, z: 0, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); b.push({ x: 5, y: ry, z: 1, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); }
          // Center pillar
          for (var cy = 0; cy <= 2; cy++) { b.push({ x: 2, y: cy, z: 0, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); b.push({ x: 3, y: cy, z: 0, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); b.push({ x: 2, y: cy, z: 1, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); b.push({ x: 3, y: cy, z: 1, shape: 'block', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' }); }
          // Arches
          b.push({ x: 1, y: 3, z: 0, shape: 'arch', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          b.push({ x: 1, y: 3, z: 1, shape: 'arch', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          b.push({ x: 4, y: 3, z: 0, shape: 'arch', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          b.push({ x: 4, y: 3, z: 1, shape: 'arch', material: 'stone', color: 'var(--allo-stem-text-soft, #94a3b8)' });
          // Road surface y=4
          for (var dx = 0; dx <= 5; dx++) { b.push({ x: dx, y: 4, z: 0, shape: 'slab', material: 'stone', color: 'var(--allo-stem-text, #cbd5e1)' }); b.push({ x: dx, y: 4, z: 1, shape: 'slab', material: 'stone', color: 'var(--allo-stem-text, #cbd5e1)' }); }
          // Railings
          [0, 2, 4].forEach(function (rx) {
            b.push({ x: rx, y: 5, z: 0, shape: 'column', material: 'metal', color: 'var(--allo-stem-text, #cbd5e1)' });
            b.push({ x: rx, y: 5, z: 1, shape: 'column', material: 'metal', color: 'var(--allo-stem-text, #cbd5e1)' });
          });
          return b;
        }
      },
      {
        id: 'pyramid', name: 'Great Pyramid', icon: '\uD83D\uDD3A', desc: 'Classic pyramid with stone and sandstone layers',
        blocks: function () {
          var b = [];
          var layers = [[0, 4], [1, 3], [2, 2]];
          layers.forEach(function (lr, yi) {
            var start = lr[0], end = lr[1];
            for (var x = start; x <= end; x++) for (var z = start; z <= end; z++) {
              b.push({ x: x, y: yi, z: z, shape: yi < 2 ? 'block' : 'pyramid', material: 'stone', color: yi === 0 ? '#94a3b8' : yi === 1 ? '#d4a76a' : '#fbbf24' });
            }
          });
          // Top cap
          b.push({ x: 2, y: 3, z: 2, shape: 'pyramid', material: 'marble', color: 'var(--allo-stem-text, #f1f5f9)' });
          return b;
        }
      }
    ];
  }

  // ══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════
  // THE BUILDING, IN 3D
  // ───────────────────────────────────────────────────────────────────────
  // Architecture Studio stores every block as (x, y, z) with a shape, a
  // material and a rotation — a genuinely three-dimensional model — and then
  // shows it as a stack of flat floor plans, one grid per Y layer. So a
  // student places blocks in space and never sees the thing they built. Of
  // all the flat tools this is the widest gap between what the data knows and
  // what the picture shows.
  //
  // Blocks render through StemLab.makeVoxelBatch, the same host helper the
  // Volume explorer and the base-ten blocks use.
  //
  // Materials are keyed to their own palette, but several of those colours
  // are CSS custom properties with fallbacks ("var(--allo-stem-text, #f1f5f9)")
  // for theming, and THREE.Color cannot parse those — it throws. Hence the
  // plain-hex table here rather than reusing matColorLookup directly.
  var ARCH_MAT_HEX = {
    stone: 0x94a3b8, brick: 0xb45309, wood: 0x92400e,
    glass: 0x38bdf8, marble: 0xf1f5f9, metal: 0xcbd5e1
  };
  var ARCH_BRICK_HEX = {
    stone: 0xef4444, brick: 0xf59e0b, wood: 0x22c55e,
    glass: 0x3b82f6, marble: 0xf8fafc, metal: 0x1e293b
  };
  var ARCH_MAT_COLOR = {
    stone: '#94a3b8', brick: '#b45309', wood: '#92400e',
    glass: '#38bdf8', marble: '#f1f5f9', metal: '#cbd5e1'
  };
  var ARCH_SHAPE_IDS = {
    block: true, slab: true, ramp: true, column: true, arch: true, roof: true,
    pyramid: true, dome: true, cylinder: true, lbeam: true, window: true, door: true
  };
  var ARCH_MATERIAL_IDS = { stone: true, brick: true, wood: true, glass: true, marble: true, metal: true };
  var ARCH_XZ_MIN = -64, ARCH_XZ_MAX = 64, ARCH_Y_MIN = 0, ARCH_Y_MAX = 31;
  var ARCH_MAX_BLOCKS = 4096;

  function normalizeArchRotation(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    n = Math.round(n / 90) * 90;
    return ((n % 360) + 360) % 360;
  }

  function normalizeArchColor(value, material) {
    var own = String(value || '').trim();
    var match = own.match(/#[0-9a-f]{6}/i);
    return match ? match[0].toLowerCase() : (ARCH_MAT_COLOR[material] || ARCH_MAT_COLOR.stone);
  }

  function parseArchCoordinate(value) {
    if (value == null || typeof value === 'boolean') return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    var number = Number(value);
    return isFinite(number) ? Math.round(number) : null;
  }

  // Shared validation boundary for saved and shared builds. It keeps malformed
  // or oversized imports from making the renderer unusable, and also repairs
  // older builds that stored CSS variables instead of plain colours.
  function sanitizeArchBlocks(input) {
    if (!Array.isArray(input)) return [];
    var clean = [], seen = {};
    for (var i = 0; i < input.length && clean.length < ARCH_MAX_BLOCKS; i++) {
      var raw = input[i];
      if (!raw || typeof raw !== 'object') continue;
      var x = parseArchCoordinate(raw.x), y = parseArchCoordinate(raw.y), z = parseArchCoordinate(raw.z);
      if (x == null || y == null || z == null) continue;
      if (x < ARCH_XZ_MIN || x > ARCH_XZ_MAX || z < ARCH_XZ_MIN || z > ARCH_XZ_MAX || y < ARCH_Y_MIN || y > ARCH_Y_MAX) continue;
      var key = x + ',' + y + ',' + z;
      if (seen[key]) continue;
      seen[key] = true;
      var shape = Object.prototype.hasOwnProperty.call(ARCH_SHAPE_IDS, raw.shape) ? raw.shape : 'block';
      var material = Object.prototype.hasOwnProperty.call(ARCH_MATERIAL_IDS, raw.material) ? raw.material : 'stone';
      clean.push({
        x: x, y: y, z: z,
        shape: shape,
        material: material,
        color: normalizeArchColor(raw.color, material),
        rotation: normalizeArchRotation(raw.rotation)
      });
    }
    return clean;
  }

  // Keep ordinary in-memory builds referentially stable, while repairing data
  // restored from older/corrupt persistence before any analysis or rendering.
  function getArchRuntimeBlocks(input) {
    if (!Array.isArray(input) || input.length > ARCH_MAX_BLOCKS) return sanitizeArchBlocks(input);
    var seen = {};
    for (var i = 0; i < input.length; i++) {
      var raw = input[i];
      if (!raw || typeof raw !== 'object') return sanitizeArchBlocks(input);
      var x = raw.x, y = raw.y, z = raw.z;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number'
          || !isFinite(x) || !isFinite(y) || !isFinite(z)
          || Math.round(x) !== x || Math.round(y) !== y || Math.round(z) !== z
          || x < ARCH_XZ_MIN || x > ARCH_XZ_MAX || z < ARCH_XZ_MIN || z > ARCH_XZ_MAX
          || y < ARCH_Y_MIN || y > ARCH_Y_MAX) return sanitizeArchBlocks(input);
      var key = x + ',' + y + ',' + z;
      if (seen[key]) return sanitizeArchBlocks(input);
      seen[key] = true;
      if (!Object.prototype.hasOwnProperty.call(ARCH_SHAPE_IDS, raw.shape)
          || !Object.prototype.hasOwnProperty.call(ARCH_MATERIAL_IDS, raw.material)) return sanitizeArchBlocks(input);
    }
    return input;
  }

  function getArchHistoryStack(input) {
    if (!Array.isArray(input)) return [];
    return input.filter(function (frame) { return Array.isArray(frame); }).slice(-50);
  }

  function getArchDominantNormalStep(normal) {
    normal = normal || {};
    var x = Number(normal.x) || 0, y = Number(normal.y) || 0, z = Number(normal.z) || 0;
    var ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    if (ay >= ax && ay >= az) return { x: 0, y: y < 0 ? -1 : 1, z: 0 };
    if (ax >= az) return { x: x < 0 ? -1 : 1, y: 0, z: 0 };
    return { x: 0, y: 0, z: z < 0 ? -1 : 1 };
  }

  function reflectArchRotation(rotation, axis) {
    var r = normalizeArchRotation(rotation);
    return axis === 'z' ? normalizeArchRotation(-r) : normalizeArchRotation(180 - r);
  }

  function getArchUnsupportedKeys(currentBlocks) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    var occupied = {}, unsupported = {};
    current.forEach(function (b) { occupied[b.x + ',' + b.y + ',' + b.z] = true; });
    current.forEach(function (b) {
      if (b.y > ARCH_Y_MIN && !occupied[b.x + ',' + (b.y - 1) + ',' + b.z]) {
        unsupported[b.x + ',' + b.y + ',' + b.z] = true;
      }
    });
    return unsupported;
  }

  function settleArchBlocks(currentBlocks) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    var columns = {};
    current.forEach(function (b) {
      var key = b.x + ',' + b.z;
      if (!columns[key]) columns[key] = [];
      columns[key].push(b);
    });
    var settled = [], moved = 0;
    Object.keys(columns).forEach(function (key) {
      columns[key].sort(function (a, b) { return a.y - b.y; }).forEach(function (b, index) {
        if (b.y !== index) moved++;
        settled.push(Object.assign({}, b, { y: index }));
      });
    });
    settled.sort(function (a, b) { return a.y - b.y || a.x - b.x || a.z - b.z; });
    return { blocks: settled, moved: moved };
  }

  function simulateArchEarthquake(currentBlocks, quakeIntensity, randomSource) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    var intensityLevel = Math.max(1, Math.min(10, Math.round(Number(quakeIntensity) || 5)));
    var random = typeof randomSource === 'function' ? randomSource : null;
    if (!random) {
      var randomState = (Number(randomSource) >>> 0) || 0x6d2b79f5;
      random = function () {
        randomState ^= randomState << 13;
        randomState ^= randomState >>> 17;
        randomState ^= randomState << 5;
        return (randomState >>> 0) / 4294967296;
      };
    }
    var occupied = {};
    current.forEach(function (b) { occupied[b.x + ',' + b.y + ',' + b.z] = true; });
    var survivors = [], keepMap = {};
    var sorted = current.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x || a.z - b.z; });
    sorted.forEach(function (b) {
      var onGround = b.y === ARCH_Y_MIN;
      var supported = onGround || keepMap[b.x + ',' + (b.y - 1) + ',' + b.z];
      var neighbors = 0;
      [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].forEach(function (n) {
        if (occupied[(b.x+n[0])+','+(b.y+n[1])+','+(b.z+n[2])]) neighbors++;
      });
      var normalizedIntensity = intensityLevel / 10;
      var chance = supported ? 0.95 - (normalizedIntensity * 0.4) + (neighbors * 0.08) : 0.3 - (normalizedIntensity * 0.25);
      if (b.material === 'glass') chance -= 0.15;
      if (b.material === 'metal' || b.material === 'stone') chance += 0.05;
      if (b.shape === 'pyramid' || b.shape === 'dome') chance += 0.1;
      if (random() < Math.max(0.05, Math.min(0.99, chance))) {
        survivors.push(b);
        keepMap[b.x + ',' + b.y + ',' + b.z] = true;
      }
    });
    var survivedPct = current.length ? Math.round((survivors.length / current.length) * 100) : 100;
    return {
      blocks: survivors,
      fallen: current.length - survivors.length,
      survived: survivors.length,
      pct: survivedPct,
      rating: survivedPct >= 90 ? 'Earthquake-proof!' : survivedPct >= 70 ? 'Minor damage' : survivedPct >= 40 ? 'Significant damage' : 'Catastrophic failure',
      intensity: intensityLevel
    };
  }

  function changeArchCamera(current, action) {
    var base = current || {};
    var next = {
      rotX: isFinite(base.rotX) ? base.rotX : -24,
      rotY: isFinite(base.rotY) ? base.rotY : -38,
      scale: isFinite(base.scale) ? base.scale : 1
    };
    if (action === 'reset') return { rotX: -24, rotY: -38, scale: 1 };
    if (action === 'left') next.rotY -= 15;
    else if (action === 'right') next.rotY += 15;
    else if (action === 'up') next.rotX -= 10;
    else if (action === 'down') next.rotX += 10;
    else if (action === 'zoomIn') next.scale += 0.15;
    else if (action === 'zoomOut') next.scale -= 0.15;
    next.rotX = Math.max(-88, Math.min(88, next.rotX));
    next.scale = Math.max(0.3, Math.min(3, Math.round(next.scale * 100) / 100));
    return next;
  }

  var ArchGL = (function () {
    var DEG = Math.PI / 180;
    var T = null;
    var state = 'idle';
    var canvasEl = null, renderer = null, scene = null, camera = null;
    var batch = null, groundMesh = null, groundGrid = null, previewMesh = null, selectionMesh = null;
    var customMeshes = [];
    var raycaster = null, pointer = null, latestBlocks = [], latestAllBlocks = [];
    var rafId = 0, capacity = 0, resizeObs = null;
    var pending = null, appliedSig = '', appliedCamSig = '', previewSig = '', dirty = true;
    var gridLineCount = 0;
    var extent = { w: 1, d: 1, h: 1 }, centre = { x: 0, z: 0 };
    var mountGeneration = 0, contextCanvas = null, contextRestoreTimer = 0;

    function scheduleFrame() {
      if (!rafId && state === 'ready') rafId = requestAnimationFrame(frame);
    }

    function invalidate() {
      dirty = true;
      scheduleFrame();
    }

    function fail(reason) {
      if (contextRestoreTimer) { clearTimeout(contextRestoreTimer); contextRestoreTimer = 0; }
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      state = 'failed';
      if (pending && typeof pending.onFail === 'function') { try { pending.onFail(reason); } catch (e) {} }
    }

    function build() {
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(45, 1, 0.1, 3000);
      raycaster = new T.Raycaster();
      pointer = new T.Vector2();
      scene.add(new T.HemisphereLight(0xe2e8f0, 0x1e293b, 0.9));
      var sun = new T.DirectionalLight(0xffffff, 0.62);
      sun.position.set(24, 40, 30);
      scene.add(sun);
      groundMesh = new T.Mesh(
        new T.PlaneGeometry(400, 400),
        new T.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.16, depthWrite: false })
      );
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = -0.02;
      scene.add(groundMesh);
    }

    function clearCustomMeshes() {
      customMeshes.forEach(function (mesh) {
        if (scene) scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      customMeshes = [];
    }

    function clearPreview() {
      if (!previewMesh) return;
      if (scene) scene.remove(previewMesh);
      if (previewMesh.geometry) previewMesh.geometry.dispose();
      if (previewMesh.material) previewMesh.material.dispose();
      previewMesh = null;
      previewSig = '';
      invalidate();
    }

    function clearSelectionMesh() {
      if (!selectionMesh) return;
      if (scene) scene.remove(selectionMesh);
      if (selectionMesh.geometry) selectionMesh.geometry.dispose();
      if (selectionMesh.material) selectionMesh.material.dispose();
      selectionMesh = null;
      invalidate();
    }

    function clearGroundGrid() {
      if (!groundGrid) return;
      if (scene) scene.remove(groundGrid);
      if (groundGrid.geometry) groundGrid.geometry.dispose();
      if (groundGrid.material) groundGrid.material.dispose();
      groundGrid = null;
      gridLineCount = 0;
    }

    function buildPlacementGrid(minX, maxX, minZ, maxZ) {
      clearGroundGrid();
      var gx0 = Math.max(ARCH_XZ_MIN, Math.floor(minX) - 3);
      var gx1 = Math.min(ARCH_XZ_MAX, Math.ceil(maxX) + 3);
      var gz0 = Math.max(ARCH_XZ_MIN, Math.floor(minZ) - 3);
      var gz1 = Math.min(ARCH_XZ_MAX, Math.ceil(maxZ) + 3);
      if (gx1 - gx0 < 9) {
        var xPad = 9 - (gx1 - gx0);
        gx0 = Math.max(ARCH_XZ_MIN, gx0 - Math.ceil(xPad / 2));
        gx1 = Math.min(ARCH_XZ_MAX, gx0 + 9);
        gx0 = Math.max(ARCH_XZ_MIN, gx1 - 9);
      }
      if (gz1 - gz0 < 9) {
        var zPad = 9 - (gz1 - gz0);
        gz0 = Math.max(ARCH_XZ_MIN, gz0 - Math.ceil(zPad / 2));
        gz1 = Math.min(ARCH_XZ_MAX, gz0 + 9);
        gz0 = Math.max(ARCH_XZ_MIN, gz1 - 9);
      }
      var xStart = gx0 - 0.5 - centre.x, xEnd = gx1 + 0.5 - centre.x;
      var zStart = gz0 - 0.5 - centre.z, zEnd = gz1 + 0.5 - centre.z;
      var vertices = [];
      for (var gx = gx0; gx <= gx1 + 1; gx++) {
        var wx = gx - 0.5 - centre.x;
        vertices.push(wx, 0.006, zStart, wx, 0.006, zEnd);
      }
      for (var gz = gz0; gz <= gz1 + 1; gz++) {
        var wz = gz - 0.5 - centre.z;
        vertices.push(xStart, 0.006, wz, xEnd, 0.006, wz);
      }
      var geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      groundGrid = new T.LineSegments(geometry, new T.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.58 }));
      groundGrid.renderOrder = 2;
      scene.add(groundGrid);
      gridLineCount = vertices.length / 6;
      groundMesh.scale.set(Math.max(1, xEnd - xStart) / 400, Math.max(1, zEnd - zStart) / 400, 1);
      groundMesh.position.x = (xStart + xEnd) / 2;
      groundMesh.position.z = (zStart + zEnd) / 2;
    }

    // The host's voxel batch is ideal for ordinary blocks. Architecture Studio
    // also promises eleven non-cube objects, so those use their real geometry
    // instead of silently rendering every selection as the same cube.
    function makeArchGeometry(shape) {
      var s, g;
      switch (shape) {
        case 'slab': return new T.BoxGeometry(0.94, 0.46, 0.94);
        case 'ramp':
          s = new T.Shape();
          s.moveTo(-0.47, -0.47); s.lineTo(0.47, -0.47); s.lineTo(0.47, 0.47); s.closePath();
          g = new T.ExtrudeGeometry(s, { depth: 0.94, bevelEnabled: false }); g.center(); return g;
        case 'column': return new T.CylinderGeometry(0.33, 0.33, 0.94, 16);
        case 'cylinder': return new T.CylinderGeometry(0.47, 0.47, 0.94, 32);
        case 'lbeam':
          s = new T.Shape();
          s.moveTo(-0.47, -0.47); s.lineTo(0.47, -0.47); s.lineTo(0.47, 0.47);
          s.lineTo(0, 0.47); s.lineTo(0, 0); s.lineTo(-0.47, 0); s.closePath();
          g = new T.ExtrudeGeometry(s, { depth: 0.94, bevelEnabled: false }); g.center(); return g;
        case 'window': return new T.BoxGeometry(0.94, 0.94, 0.28);
        case 'door': return new T.BoxGeometry(0.94, 0.94, 0.38);
        case 'arch':
          g = new T.TorusGeometry(0.42, 0.12, 8, 18, Math.PI); g.rotateX(Math.PI / 2); return g;
        case 'roof':
          s = new T.Shape();
          s.moveTo(-0.47, -0.33); s.lineTo(0.47, -0.33); s.lineTo(0, 0.33); s.closePath();
          g = new T.ExtrudeGeometry(s, { depth: 0.94, bevelEnabled: false }); g.center(); return g;
        case 'pyramid': return new T.ConeGeometry(0.47, 0.94, 4);
        case 'dome': return new T.SphereGeometry(0.47, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        default: return new T.BoxGeometry(0.94, 0.94, 0.94);
      }
    }

    function updatePreview(target, options) {
      options = options || {};
      var mode = options.mode || 'place';
      var cell = target && (mode === 'place' ? target.place : target.block);
      if (state !== 'ready' || !scene || !cell) { clearPreview(); return; }
      if (!isFinite(cell.x) || !isFinite(cell.y) || !isFinite(cell.z)
          || cell.x < ARCH_XZ_MIN || cell.x > ARCH_XZ_MAX || cell.z < ARCH_XZ_MIN || cell.z > ARCH_XZ_MAX
          || cell.y < ARCH_Y_MIN || cell.y > ARCH_Y_MAX) { clearPreview(); return; }
      var shape = mode === 'place' ? (options.shape || 'block') : 'block';
      var rotation = mode === 'place' ? normalizeArchRotation(options.rotation) : 0;
      var nextSig = mode + '|' + cell.x + ',' + cell.y + ',' + cell.z + '|' + shape + '|' + rotation + '|' + (options.hex || 0);
      if (nextSig === previewSig) return;
      clearPreview();
      var geometry = mode === 'place' ? makeArchGeometry(shape) : new T.BoxGeometry(1.02, 1.02, 1.02);
      var color = mode === 'erase' ? 0xef4444 : mode === 'paint' ? 0xc084fc : mode === 'pick' ? 0x22d3ee : (options.hex == null ? 0x60a5fa : options.hex);
      previewMesh = new T.Mesh(geometry, new T.MeshBasicMaterial({
        color: color, transparent: true, opacity: mode === 'place' ? 0.42 : 0.55,
        wireframe: true, depthWrite: false
      }));
      var yOffset = shape === 'slab' ? 0.23 : shape === 'dome' ? 0 : 0.5;
      previewMesh.position.set(cell.x - centre.x, cell.y + yOffset, cell.z - centre.z);
      previewMesh.rotation.y = rotation * DEG;
      previewMesh.renderOrder = 4;
      scene.add(previewMesh);
      previewSig = nextSig;
      invalidate();
    }

    function apply(m) {
      var bs = m.blocks || [];
      latestAllBlocks = bs;
      clearPreview();
      var cubeBlocks = bs.filter(function (b) { return !b.shape || b.shape === 'block'; });
      latestBlocks = cubeBlocks;
      var cubeCount = cubeBlocks.length;
      if (cubeCount && (!batch || capacity < cubeCount)) {
        if (batch) batch.dispose(scene);
        capacity = Math.min(ARCH_MAX_BLOCKS, Math.max(64, cubeCount, capacity ? capacity * 2 : 64));
        batch = window.StemLab.makeVoxelBatch(T, {
          capacity: capacity, size: 0.94, edges: true, edgeOpacity: 0.26
        });
        batch.addTo(scene);
      }

      clearCustomMeshes();
      clearSelectionMesh();

      var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
      bs.forEach(function (b) {
        if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
        if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z;
        if (b.y > maxY) maxY = b.y;
      });
      if (!bs.length) { minX = maxX = minZ = maxZ = 0; }
      centre = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
      extent = { w: maxX - minX + 1, d: maxZ - minZ + 1, h: maxY + 1 };

      for (var i = 0; i < cubeCount; i++) {
        var b = cubeBlocks[i];
        // A block's own colour wins when the student has painted it; otherwise
        // the material decides. Both arrive as hex from the caller.
        batch.set(i, b.x - centre.x, b.y + 0.5, b.z - centre.z, 1, b.hex);
      }
      if (batch) batch.commit(cubeCount);

      bs.forEach(function (b) {
        var shape = b.shape || 'block';
        if (shape === 'block') return;
        var isGlass = b.material === 'glass';
        var mesh = new T.Mesh(makeArchGeometry(shape), new T.MeshPhongMaterial({
          color: b.hex,
          transparent: isGlass,
          opacity: isGlass ? 0.48 : 1,
          shininess: b.material === 'metal' ? 100 : b.material === 'marble' ? 80 : 40,
          flatShading: b.material === 'stone' || b.material === 'brick'
        }));
        var yOffset = shape === 'slab' ? 0.23 : shape === 'dome' ? 0 : 0.5;
        mesh.position.set(b.x - centre.x, b.y + yOffset, b.z - centre.z);
        mesh.rotation.y = ((b.rotation || 0) % 360) * DEG;
        mesh.userData.archBlock = b;
        scene.add(mesh);
        customMeshes.push(mesh);
      });

      // Selection is an overlay, not a replacement material. Keeping the
      // student's true block colour visible makes property edits verifiable.
      var selected = bs.find(function (b) { return b.selected; });
      if (selected) {
        var selectedShape = selected.shape || 'block';
        selectionMesh = new T.Mesh(makeArchGeometry(selectedShape), new T.MeshBasicMaterial({
          color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.96,
          depthTest: false, depthWrite: false
        }));
        var selectedYOffset = selectedShape === 'slab' ? 0.23 : selectedShape === 'dome' ? 0 : 0.5;
        selectionMesh.position.set(selected.x - centre.x, selected.y + selectedYOffset, selected.z - centre.z);
        selectionMesh.rotation.y = ((selected.rotation || 0) % 360) * DEG;
        selectionMesh.scale.set(1.08, 1.08, 1.08);
        selectionMesh.renderOrder = 5;
        scene.add(selectionMesh);
      }

      buildPlacementGrid(minX, maxX, minZ, maxZ);
    }

    function applyCam(m) {
      if (m.blueprintView) {
        camera.up.set(0, 0, -1);
        var topHalfV = Math.tan(22.5 * DEG);
        var topHalfH = topHalfV * (camera.aspect || 1.6);
        var topDist = Math.max((extent.w / 2) / topHalfH, (extent.d / 2) / topHalfV, 3) * 1.25
                    / Math.max(0.25, m.scale);
        camera.position.set(0, extent.h / 2 + topDist, 0.001);
        camera.lookAt(0, extent.h / 2, 0);
        camera.updateProjectionMatrix();
        return;
      }
      camera.up.set(0, 1, 0);
      var el = Math.max(-88, Math.min(88, -m.rotX)) * DEG;
      var az = -m.rotY * DEG;
      // Fit the projected box: a long low building and a narrow tower need
      // very different distances, and a bounding sphere over-pads both.
      var ca = Math.abs(Math.cos(az)), sa = Math.abs(Math.sin(az));
      var projW = extent.w * ca + extent.d * sa;
      var projH = extent.h * Math.abs(Math.cos(el))
                + (extent.w * sa + extent.d * ca) * Math.abs(Math.sin(el));
      var halfV = Math.tan(22.5 * DEG);
      var halfH = halfV * (camera.aspect || 1.6);
      var dist = Math.max((projW / 2) / halfH, (projH / 2) / halfV, 3) * 1.25
                 / Math.max(0.25, m.scale);
      var ty = extent.h / 2;
      camera.position.set(
        dist * Math.cos(el) * Math.sin(az),
        ty + dist * Math.sin(el),
        dist * Math.cos(el) * Math.cos(az)
      );
      camera.lookAt(0, ty, 0);
      camera.updateProjectionMatrix();
    }

    function resize() {
      if (!renderer || !canvasEl) return;
      var w = canvasEl.clientWidth || 1, hh = canvasEl.clientHeight || 1;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh;
      camera.updateProjectionMatrix();
      appliedCamSig = '';
      invalidate();
    }

    function frame() {
      if (state !== 'ready' || !pending) { rafId = 0; return; }
      var m = pending;
      try {
        if (m.sig !== appliedSig) { apply(m); appliedSig = m.sig; dirty = true; appliedCamSig = ''; }
        var cs = m.rotX + ',' + m.rotY + ',' + m.scale + ',' + (m.blueprintView ? 1 : 0);
        if (cs !== appliedCamSig) { applyCam(m); appliedCamSig = cs; dirty = true; }
        if (!dirty) { rafId = 0; return; }
        dirty = false;
        renderer.render(scene, camera);
      } catch (err) {
        console.error('[archStudio] WebGL frame failed, falling back to floor plans', err);
        fail('frame');
        return;
      }
      rafId = 0;
    }

    function handleContextLost(ev) {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      if (state !== 'ready') return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      state = 'recovering';
      if (contextRestoreTimer) clearTimeout(contextRestoreTimer);
      contextRestoreTimer = setTimeout(function () {
        contextRestoreTimer = 0;
        if (state === 'recovering') fail('context-lost');
      }, 3000);
    }

    function handleContextRestored() {
      if (!contextCanvas || contextCanvas !== canvasEl || !renderer || state !== 'recovering') return;
      if (contextRestoreTimer) { clearTimeout(contextRestoreTimer); contextRestoreTimer = 0; }
      state = 'ready';
      appliedSig = ''; appliedCamSig = ''; dirty = true;
      scheduleFrame();
      if (pending && typeof pending.onReady === 'function') { try { pending.onReady(); } catch (e) {} }
    }

    function attachContextHandlers(el) {
      if (contextCanvas === el) return;
      if (contextCanvas) {
        contextCanvas.removeEventListener('webglcontextlost', handleContextLost, false);
        contextCanvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
      }
      contextCanvas = el;
      if (contextCanvas) {
        contextCanvas.addEventListener('webglcontextlost', handleContextLost, false);
        contextCanvas.addEventListener('webglcontextrestored', handleContextRestored, false);
      }
    }

    function detachContextHandlers() {
      if (!contextCanvas) return;
      contextCanvas.removeEventListener('webglcontextlost', handleContextLost, false);
      contextCanvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
      contextCanvas = null;
    }

    return {
      isReady: function () { return state === 'ready'; },
      submit: function (m) { pending = m; scheduleFrame(); },
      pick: function (clientX, clientY) {
        if (state !== 'ready' || !renderer || !camera || !raycaster || !pointer || !canvasEl || !groundMesh) return null;
        var rect = canvasEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        var targets = [];
        if (batch && batch.mesh && latestBlocks.length) targets.push(batch.mesh);
        customMeshes.forEach(function (mesh) { targets.push(mesh); });
        targets.push(groundMesh);
        var hits = raycaster.intersectObjects(targets, false);
        for (var hi = 0; hi < hits.length; hi++) {
          var hit = hits[hi];
          if ((batch && hit.object === batch.mesh && hit.instanceId != null) || (hit.object.userData && hit.object.userData.archBlock)) {
            var b = batch && hit.object === batch.mesh ? latestBlocks[hit.instanceId] : hit.object.userData.archBlock;
            if (!b) continue;
            var normal = hit.face && hit.face.normal ? hit.face.normal : { x: 0, y: 1, z: 0 };
            if (normal.clone) {
              normal = normal.clone();
              if (hit.object !== (batch && batch.mesh) && normal.transformDirection) normal.transformDirection(hit.object.matrixWorld);
            }
            var step = getArchDominantNormalStep(normal);
            return {
              kind: 'block',
              block: { x: b.x, y: b.y, z: b.z },
              place: {
                x: b.x + step.x,
                y: b.y + step.y,
                z: b.z + step.z
              }
            };
          }
          if (hit.object === groundMesh) {
            return {
              kind: 'ground', block: null,
              place: {
                x: Math.round(hit.point.x + centre.x),
                y: 0,
                z: Math.round(hit.point.z + centre.z)
              }
            };
          }
        }
        return null;
      },
      debug: function () {
        if (state !== 'ready' || !renderer) return { state: state };
        var gl = renderer.getContext();
        var shapeCounts = {};
        latestAllBlocks.forEach(function (b) { var sid = b.shape || 'block'; shapeCounts[sid] = (shapeCounts[sid] || 0) + 1; });
        return {
          state: state,
          blockCount: (batch ? batch.drawnCount() : 0) + customMeshes.length,
          outlineCount: (batch ? batch.outlinedCount() : 0) + customMeshes.length,
          customShapeCount: customMeshes.length,
          shapeCounts: shapeCounts,
          selectedCount: latestAllBlocks.filter(function (b) { return b.selected; }).length,
          selectionOutlineVisible: !!selectionMesh,
          gridLineCount: gridLineCount,
          previewVisible: !!previewMesh,
          renderHexes: latestAllBlocks.map(function (b) { return b.hex; }),
          viewMode: pending && pending.blueprintView ? 'blueprint' : 'perspective',
          styleMode: pending && pending.styleMode ? pending.styleMode : 'architect',
          extent: extent,
          canvas: canvasEl ? { w: canvasEl.clientWidth, h: canvasEl.clientHeight } : null,
          contextLost: gl ? gl.isContextLost() : null
        };
      },
      preview: function (target, options) { updatePreview(target, options); },
      clearPreview: clearPreview,
      capturePng: function () {
        if (state !== 'ready' || !renderer || !scene || !camera || !canvasEl) return null;
        clearPreview();
        renderer.render(scene, camera);
        return canvasEl.toDataURL('image/png');
      },
      stlGeometries: function (blocks) {
        if (!T && window.THREE) T = window.THREE;
        if (!T) return [];
        return (blocks || []).map(function (b) {
          var shape = b.shape || 'block';
          var geometry = makeArchGeometry(shape);
          var yOffset = shape === 'slab' ? 0.23 : shape === 'dome' ? 0 : 0.5;
          var matrix = new T.Matrix4();
          var position = new T.Vector3(b.x || 0, (b.y || 0) + yOffset, b.z || 0);
          var rotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ((b.rotation || 0) % 360) * DEG);
          matrix.compose(position, rotation, new T.Vector3(1, 1, 1));
          geometry.applyMatrix4(matrix);
          return geometry;
        });
      },
      mount: function (el) {
        if (canvasEl === el && (state === 'ready' || state === 'loading' || state === 'recovering')) return;
        var generation = ++mountGeneration;
        canvasEl = el;
        state = 'loading';
        var loader = (window.StemLab && window.StemLab.ensureThree)
          ? window.StemLab.ensureThree({ failMessage: 'The 3D engine could not load. The floor plans still work.' })
          : Promise.reject(new Error('no-loader'));
        loader.then(function (three) {
          if (generation !== mountGeneration || canvasEl !== el || state !== 'loading') return;
          T = three;
          try {
            renderer = new T.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
          } catch (e) { fail('no-webgl'); return; }
          attachContextHandlers(el);
          renderer.setClearColor(0x000000, 0);
          build();
          resize();
          if (typeof ResizeObserver === 'function') {
            resizeObs = new ResizeObserver(resize);
            resizeObs.observe(canvasEl);
          } else { window.addEventListener('resize', resize); }
          state = 'ready';
          appliedSig = ''; appliedCamSig = ''; dirty = true;
          scheduleFrame();
          if (pending && typeof pending.onReady === 'function') { try { pending.onReady(); } catch (e2) {} }
        }).catch(function () {
          if (generation === mountGeneration && canvasEl === el && state === 'loading') fail('cdn');
        });
      },
      unmount: function () {
        mountGeneration++;
        state = 'disposing';
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (contextRestoreTimer) { clearTimeout(contextRestoreTimer); contextRestoreTimer = 0; }
        detachContextHandlers();
        if (resizeObs) { try { resizeObs.disconnect(); } catch (e) {} resizeObs = null; }
        else window.removeEventListener('resize', resize);
        if (scene) {
          if (batch) batch.dispose(scene);
          clearPreview();
          clearSelectionMesh();
          clearGroundGrid();
          clearCustomMeshes();
          if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); groundMesh.material.dispose(); }
        }
        if (renderer) { try { renderer.dispose(); } catch (e) {} }
        batch = null; groundMesh = null; groundGrid = null; previewMesh = null; selectionMesh = null; customMeshes = [];
        renderer = scene = camera = null; canvasEl = null; pending = null;
        raycaster = pointer = null; latestBlocks = []; latestAllBlocks = [];
        capacity = 0; gridLineCount = 0; appliedSig = ''; appliedCamSig = ''; previewSig = '';
        state = 'idle';
      }
    };
  })();

  // Hook-free tool, so the drag anchor lives at module scope alongside the
  // renderer rather than in a useRef.
  var archDrag = { current: null, suppressClick: false };

  // Pure authoring reducer shared by the 3D picker and the accessible floor
  // grid. Returning the original array means the requested edit was a no-op.
  function applySingleArchEdit(currentBlocks, edit) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    edit = edit || {};
    var mode = edit.mode || 'place';
    // Unknown/read-only tools must never fall through to placement. This also
    // keeps the eyedropper mode from changing a build if it reaches the reducer.
    if (mode !== 'place' && mode !== 'erase' && mode !== 'paint') return current;
    var cell = mode === 'place' ? edit.place : edit.block;
    if (!cell || !isFinite(cell.x) || !isFinite(cell.y) || !isFinite(cell.z)) return current;
    var x = Math.round(cell.x), y = Math.round(cell.y), z = Math.round(cell.z);
    if (y < ARCH_Y_MIN || y > ARCH_Y_MAX || x < ARCH_XZ_MIN || x > ARCH_XZ_MAX || z < ARCH_XZ_MIN || z > ARCH_XZ_MAX) return current;
    var atCell = function (b) { return b.x === x && b.y === y && b.z === z; };

    if (mode === 'erase') {
      if (!current.some(atCell)) return current;
      return current.filter(function (b) { return !atCell(b); });
    }
    if (mode === 'paint') {
      var found = false;
      var painted = current.map(function (b) {
        if (!atCell(b)) return b;
        found = true;
        if ((b.material || 'stone') === (edit.material || 'stone') && (b.color || '#94a3b8') === (edit.color || '#94a3b8')) return b;
        return Object.assign({}, b, { material: edit.material || 'stone', color: edit.color || '#94a3b8' });
      });
      if (!found) return current;
      var changed = painted.some(function (b, i) { return b !== current[i]; });
      return changed ? painted : current;
    }
    if (current.some(atCell)) return current;
    if (current.length >= ARCH_MAX_BLOCKS) return current;
    return current.concat([{
      x: x, y: y, z: z,
      shape: edit.shape || 'block',
      material: edit.material || 'stone',
      color: edit.color || '#94a3b8',
      rotation: normalizeArchRotation(edit.rotation)
    }]);
  }

  // Symmetry mirrors one edit across the clearly defined X=0 plane. The two
  // cells are reduced together, so one click also remains one undo step.
  function applyArchEdit(currentBlocks, edit) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    edit = edit || {};
    var next = applySingleArchEdit(current, edit);
    if (!edit.symmetry) return next;

    var mode = edit.mode || 'place';
    var cellKey = mode === 'place' ? 'place' : 'block';
    var cell = edit[cellKey];
    if (!cell || !isFinite(cell.x)) return next;
    var mirrorX = -Math.round(cell.x);
    if (mirrorX === Math.round(cell.x)) return next;
    var mirrored = Object.assign({}, edit);
    mirrored.symmetry = false;
    mirrored.rotation = reflectArchRotation(edit.rotation, 'x');
    mirrored[cellKey] = Object.assign({}, cell, { x: mirrorX });
    return applySingleArchEdit(next, mirrored);
  }

  function archBlockKey(cell) {
    if (!cell || !isFinite(cell.x) || !isFinite(cell.y) || !isFinite(cell.z)) return '';
    return Math.round(cell.x) + ',' + Math.round(cell.y) + ',' + Math.round(cell.z);
  }

  // Pure reducer for inspector actions. Like applyArchEdit, returning the
  // original array marks a blocked/no-op action so history stays noise-free.
  function applyArchBlockAction(currentBlocks, action) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    action = action || {};
    var sourceKey = archBlockKey(action.cell);
    if (!sourceKey) return current;
    var sourceIndex = -1;
    for (var i = 0; i < current.length; i++) {
      if (archBlockKey(current[i]) === sourceKey) { sourceIndex = i; break; }
    }
    if (sourceIndex < 0) return current;
    var source = current[sourceIndex];

    if (action.type === 'delete') {
      return current.filter(function (_, index) { return index !== sourceIndex; });
    }

    if (action.type === 'move' || action.type === 'duplicate') {
      var dx = Math.round(Number(action.dx) || 0);
      var dy = Math.round(Number(action.dy) || 0);
      var dz = Math.round(Number(action.dz) || 0);
      if (!dx && !dy && !dz) return current;
      var target = {
        x: Math.round(Number(source.x)) + dx,
        y: Math.round(Number(source.y)) + dy,
        z: Math.round(Number(source.z)) + dz
      };
      if (target.x < ARCH_XZ_MIN || target.x > ARCH_XZ_MAX || target.z < ARCH_XZ_MIN || target.z > ARCH_XZ_MAX
          || target.y < ARCH_Y_MIN || target.y > ARCH_Y_MAX) return current;
      var targetKey = archBlockKey(target);
      if (current.some(function (b, index) { return index !== sourceIndex && archBlockKey(b) === targetKey; })) return current;
      if (action.type === 'duplicate' && current.length >= ARCH_MAX_BLOCKS) return current;
      var transformed = Object.assign({}, source, target);
      if (action.type === 'duplicate') return current.concat([transformed]);
      return current.map(function (b, index) { return index === sourceIndex ? transformed : b; });
    }

    if (action.type === 'replace') {
      var sourceShape = Object.prototype.hasOwnProperty.call(ARCH_SHAPE_IDS, source.shape) ? source.shape : 'block';
      var sourceMaterial = Object.prototype.hasOwnProperty.call(ARCH_MATERIAL_IDS, source.material) ? source.material : 'stone';
      var shape = action.shape != null && Object.prototype.hasOwnProperty.call(ARCH_SHAPE_IDS, action.shape) ? action.shape : sourceShape;
      var material = action.material != null && Object.prototype.hasOwnProperty.call(ARCH_MATERIAL_IDS, action.material) ? action.material : sourceMaterial;
      var color = action.color != null ? normalizeArchColor(action.color, material) : normalizeArchColor(source.color, material);
      var rotation = action.rotation != null ? normalizeArchRotation(action.rotation) : normalizeArchRotation(source.rotation);
      if (shape === sourceShape && material === sourceMaterial && color === normalizeArchColor(source.color, sourceMaterial)
          && rotation === normalizeArchRotation(source.rotation)) return current;
      var replacement = Object.assign({}, source, { shape: shape, material: material, color: color, rotation: rotation });
      return current.map(function (b, index) { return index === sourceIndex ? replacement : b; });
    }

    return current;
  }

  function mergeArchBlocksWithinLimit(currentBlocks, candidateBlocks) {
    var base = sanitizeArchBlocks(currentBlocks);
    var candidates = sanitizeArchBlocks(candidateBlocks);
    var occupied = {}, eligibleCount = 0;
    base.forEach(function (b) { occupied[archBlockKey(b)] = true; });
    var room = Math.max(0, ARCH_MAX_BLOCKS - base.length);
    var additions = [];
    candidates.forEach(function (b) {
      var key = archBlockKey(b);
      if (!key || occupied[key]) return;
      eligibleCount++;
      if (additions.length >= room) return;
      occupied[key] = true;
      additions.push(b);
    });
    return {
      blocks: base.concat(additions),
      added: additions.length,
      skipped: Math.max(0, eligibleCount - additions.length)
    };
  }

  function mirrorArchBlocksWithinLimit(currentBlocks, axis) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    if (!current.length) return { blocks: current, added: 0, skipped: 0 };
    var useZ = axis === 'z';
    var values = current.map(function (b) { return useZ ? b.z : b.x; });
    var mid = (Math.min.apply(null, values) + Math.max.apply(null, values)) / 2;
    var mirrored = current.map(function (b) {
      var next = Object.assign({}, b, { rotation: reflectArchRotation(b.rotation, useZ ? 'z' : 'x') });
      if (useZ) next.z = Math.round(mid + (mid - b.z));
      else next.x = Math.round(mid + (mid - b.x));
      return next;
    });
    var occupied = {};
    current.forEach(function (b) { occupied[archBlockKey(b)] = true; });
    return mergeArchBlocksWithinLimit(current, mirrored.filter(function (b) { return !occupied[archBlockKey(b)]; }));
  }

  function duplicateArchBlocksWithinLimit(currentBlocks, dx, dy, dz) {
    var current = Array.isArray(currentBlocks) ? currentBlocks : [];
    if (!current.length) return { blocks: current, added: 0, skipped: 0 };
    var copied = sanitizeArchBlocks(current.map(function (b) {
      return Object.assign({}, b, { x: b.x + dx, y: b.y + dy, z: b.z + dz });
    }));
    var occupied = {};
    current.forEach(function (b) { occupied[archBlockKey(b)] = true; });
    return mergeArchBlocksWithinLimit(current, copied.filter(function (b) { return !occupied[archBlockKey(b)]; }));
  }

  function nearestArchOccupiedLayer(currentBlocks, preferredLayer) {
    var preferred = Math.max(ARCH_Y_MIN, Math.min(ARCH_Y_MAX, Math.round(Number(preferredLayer) || 0)));
    var layers = {}, best = preferred, bestDistance = Infinity;
    (Array.isArray(currentBlocks) ? currentBlocks : []).forEach(function (b) {
      var y = Math.max(ARCH_Y_MIN, Math.min(ARCH_Y_MAX, Math.round(Number(b.y) || 0)));
      layers[y] = true;
    });
    if (Object.keys(layers).length === 0) return ARCH_Y_MIN;
    if (layers[preferred]) return preferred;
    Object.keys(layers).forEach(function (key) {
      var y = Number(key);
      var distance = Math.abs(y - preferred);
      if (distance < bestDistance || (distance === bestDistance && y < best)) {
        best = y;
        bestDistance = distance;
      }
    });
    return best;
  }

  // A compact fingerprint keeps analysis produced for one structure from
  // masquerading as current after the student edits, loads, or replays a
  // different build. Two independently seeded 32-bit hashes make accidental
  // collisions vanishingly unlikely without persisting the whole structure.
  function getArchBuildSignature(currentBlocks) {
    var list = Array.isArray(currentBlocks) ? currentBlocks : [];
    var hashA = 2166136261;
    var hashB = 2246822519;
    var feed = function (value) {
      var str = String(value == null ? '' : value);
      for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        hashA = Math.imul(hashA ^ code, 16777619);
        hashB = Math.imul(hashB ^ code, 3266489917);
      }
      hashA = Math.imul(hashA ^ 31, 16777619);
      hashB = Math.imul(hashB ^ 127, 3266489917);
    };
    list.forEach(function (b) {
      b = b || {};
      feed(Math.round(Number(b.x) || 0));
      feed(Math.round(Number(b.y) || 0));
      feed(Math.round(Number(b.z) || 0));
      feed(b.shape || 'block');
      feed(b.material || 'stone');
      feed(String(b.color || '').toLowerCase());
      feed(normalizeArchRotation(b.rotation));
    });
    return list.length + ':' + (hashA >>> 0).toString(36) + ':' + (hashB >>> 0).toString(36);
  }

  function getArchReplacementViewState(nextBlocks, preferredLayer) {
    return {
      viewLayer: -1,
      showSlice: false,
      sliceZSelected: false,
      filterMaterial: '',
      filterShape: '',
      editLayer: nearestArchOccupiedLayer(nextBlocks, preferredLayer),
      gridCursorX: null,
      gridCursorZ: null,
      selectedBlockKey: '',
      quakeResult: null
    };
  }

  function getArchGridAxisBounds(hasBlocks, minValue, maxValue, focusValue) {
    if (!hasBlocks) return [0, 9];
    var lo = Math.max(-64, Math.round(minValue) - 1);
    var hi = Math.min(64, Math.round(maxValue) + 1);
    if (hi - lo + 1 > 32) {
      var hasFocus = focusValue != null && isFinite(focusValue);
      var mid = hasFocus
        ? Math.max(Math.round(minValue), Math.min(Math.round(maxValue), Math.round(Number(focusValue))))
        : Math.round((minValue + maxValue) / 2);
      lo = mid - 15; hi = lo + 31;
      if (lo < -64) { lo = -64; hi = -33; }
      if (hi > 64) { hi = 64; lo = 33; }
      return [lo, hi];
    }
    while (hi - lo + 1 < 10 && (lo > -64 || hi < 64)) {
      if (lo > -64) lo--;
      if (hi - lo + 1 < 10 && hi < 64) hi++;
    }
    return [lo, hi];
  }

  function moveArchGridCursor(current, key, bounds, ctrlKey) {
    current = current || {};
    bounds = bounds || {};
    var minX = isFinite(bounds.minX) ? Math.round(bounds.minX) : ARCH_XZ_MIN;
    var maxX = isFinite(bounds.maxX) ? Math.round(bounds.maxX) : ARCH_XZ_MAX;
    var minZ = isFinite(bounds.minZ) ? Math.round(bounds.minZ) : ARCH_XZ_MIN;
    var maxZ = isFinite(bounds.maxZ) ? Math.round(bounds.maxZ) : ARCH_XZ_MAX;
    var x = Math.max(minX, Math.min(maxX, Math.round(Number(current.x) || 0)));
    var z = Math.max(minZ, Math.min(maxZ, Math.round(Number(current.z) || 0)));
    if (key === 'ArrowLeft') x = Math.max(minX, x - 1);
    else if (key === 'ArrowRight') x = Math.min(maxX, x + 1);
    else if (key === 'ArrowUp') z = Math.max(minZ, z - 1);
    else if (key === 'ArrowDown') z = Math.min(maxZ, z + 1);
    else if (key === 'Home') { x = minX; if (ctrlKey) z = minZ; }
    else if (key === 'End') { x = maxX; if (ctrlKey) z = maxZ; }
    return { x: x, z: z };
  }

  function selectArchDisplayBlocks(currentBlocks, options) {
    options = options || {};
    var visible = Array.isArray(currentBlocks) ? currentBlocks : [];
    var replay = options.undoStack || [];
    if (options.showReplay && options.replayStep >= 0 && options.replayStep < replay.length) {
      visible = replay[options.replayStep] || [];
    }
    if (options.viewLayer != null && options.viewLayer >= 0) {
      visible = visible.filter(function (b) { return b.y === options.viewLayer; });
    }
    if (options.showSlice && options.sliceZSelected) {
      visible = visible.filter(function (b) { return b.z === options.sliceZ; });
    }
    if (options.filterMaterial) {
      visible = visible.filter(function (b) { return (b.material || 'stone') === options.filterMaterial; });
    }
    if (options.filterShape) {
      visible = visible.filter(function (b) { return (b.shape || 'block') === options.filterShape; });
    }
    return visible;
  }

  function archGlRef(el) { if (el) ArchGL.mount(el); else ArchGL.unmount(); }
  try { window.__alloArchGL = ArchGL; } catch (e) {}
  try { window.__alloArchEditBlocks = applyArchEdit; } catch (e) {}
  try { window.__alloArchGridAxisBounds = getArchGridAxisBounds; } catch (e) {}
  try { window.__alloArchMoveGridCursor = moveArchGridCursor; } catch (e) {}
  try { window.__alloArchDisplayBlocks = selectArchDisplayBlocks; } catch (e) {}
  try { window.__alloArchSanitizeBlocks = sanitizeArchBlocks; } catch (e) {}
  try { window.__alloArchRuntimeBlocks = getArchRuntimeBlocks; } catch (e) {}
  try { window.__alloArchDominantNormalStep = getArchDominantNormalStep; } catch (e) {}
  try { window.__alloArchSettleBlocks = settleArchBlocks; } catch (e) {}
  try { window.__alloArchUnsupportedKeys = getArchUnsupportedKeys; } catch (e) {}
  try { window.__alloArchChangeCamera = changeArchCamera; } catch (e) {}
  try { window.__alloArchReflectRotation = reflectArchRotation; } catch (e) {}
  try { window.__alloArchBlockAction = applyArchBlockAction; } catch (e) {}
  try { window.__alloArchMergeBlocks = mergeArchBlocksWithinLimit; } catch (e) {}
  try { window.__alloArchMirrorBlocks = mirrorArchBlocksWithinLimit; } catch (e) {}
  try { window.__alloArchDuplicateBlocks = duplicateArchBlocksWithinLimit; } catch (e) {}
  try { window.__alloArchNearestLayer = nearestArchOccupiedLayer; } catch (e) {}
  try { window.__alloArchReplacementViewState = getArchReplacementViewState; } catch (e) {}
  try { window.__alloArchBuildSignature = getArchBuildSignature; } catch (e) {}
  try { window.__alloArchSimulateEarthquake = simulateArchEarthquake; } catch (e) {}

  // ── REGISTER TOOL ──
  // ══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('archStudio', {
    name: 'Architecture Studio',
    icon: '\uD83C\uDFD7\uFE0F',
    desc: 'Build 3D structures with blocks, columns, arches, and ramps. Snap to a grid, measure shapes, and export a model.',
    category: 'engineering',
    aliases: ['architecture', '3D building', 'blocks', 'structural geometry'],
    questHooks: [
      { id: 'place_5_blocks', label: 'Place 5 building blocks', icon: '\uD83E\uDDF1', check: function(d) { return (d.blocks || []).length >= 5; }, progress: function(d) { return (d.blocks || []).length + '/5 blocks'; } },
      { id: 'place_15_blocks', label: 'Build a structure with 15+ blocks', icon: '\uD83C\uDFD7\uFE0F', check: function(d) { return (d.blocks || []).length >= 15; }, progress: function(d) { return (d.blocks || []).length + '/15 blocks'; } },
      { id: 'try_3_materials', label: 'Use 3 different building materials', icon: '\uD83E\uDEA8', check: function(d) { return Object.keys(d.materialsUsed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.materialsUsed || {}).length + '/3 materials'; } },
      { id: 'try_2_styles', label: 'Try 2 architectural styles', icon: '\uD83C\uDFDB\uFE0F', check: function(d) { return Object.keys(d.stylesUsed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.stylesUsed || {}).length + '/2 styles'; } }
    ],
    render: function (ctx) {
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
    var React = ctx.React;
    var el = React.createElement;
    var d = (ctx.toolData && ctx.toolData.archStudio) || {};
    var upd = function (key, val) {
      if (typeof key === 'object') { ctx.updateMulti('archStudio', key); }
      else { ctx.update('archStudio', key, val); }
    };
    var callGemini = ctx.callGemini || window.callGemini;
    var announceToSR = ctx.announceToSR;
    // typeof-guarded at both call sites, so it never threw — it just meant the
    // "3D view could not load, showing floor plans" notice never appeared, which
    // is the one moment a student most needs telling.
    var addToast = ctx.addToast;
    var a11yClick = ctx.a11yClick;

    // ── State ──
    var blocks = getArchRuntimeBlocks(d.blocks);
    var currentBuildSignature = getArchBuildSignature(blocks);
    var activeShape = d.activeShape || 'block';
    var activeMaterial = d.activeMaterial || 'stone';
    var activeColor = d.activeColor || '#94a3b8';
    var mode = d.mode === 'erase' || d.mode === 'paint' || d.mode === 'pick' ? d.mode : 'place';
    var styleMode = d.styleMode || 'architect';
    var blueprintView = d.blueprintView || false;
    var showAnalysis = d.showAnalysis || false;
    var showChallenges = d.showChallenges || false;
    var activeChallenge = d.activeChallenge != null ? d.activeChallenge : -1;
    var completedChallenges = d.completedChallenges && typeof d.completedChallenges === 'object' && !Array.isArray(d.completedChallenges) ? d.completedChallenges : {};
    var threeReady = ctx.toolData && ctx.toolData._threeLoaded;

    // New state
    var undoStack = getArchHistoryStack(d.undoStack);
    var redoStack = getArchHistoryStack(d.redoStack);
    var activeRotation = d.activeRotation || 0;
    var symmetryMode = d.symmetryMode || false;
    var showGallery = d.showGallery || false;
    var showTemplates = d.showTemplates || false;
    var restoredViewLayer = parseArchCoordinate(d.viewLayer);
    var viewLayer = restoredViewLayer != null && restoredViewLayer >= ARCH_Y_MIN && restoredViewLayer <= ARCH_Y_MAX ? restoredViewLayer : -1; // -1 = all layers
    var editorView = d.editorView || '3d';
    var editLayer = d.editLayer != null ? Math.max(0, Math.min(31, d.editLayer)) : 0;
    var gridCursorX = d.gridCursorX != null && isFinite(d.gridCursorX) ? Math.round(Number(d.gridCursorX)) : null;
    var gridCursorZ = d.gridCursorZ != null && isFinite(d.gridCursorZ) ? Math.round(Number(d.gridCursorZ)) : null;
    var showSlice = d.showSlice === true;
    var restoredSliceZ = parseArchCoordinate(d.sliceZ);
    var sliceZValid = restoredSliceZ != null && restoredSliceZ >= ARCH_XZ_MIN && restoredSliceZ <= ARCH_XZ_MAX;
    var sliceZ = sliceZValid ? restoredSliceZ : -1;
    var sliceZSelected = sliceZValid && (d.sliceZSelected === true || (d.sliceZSelected == null && d.sliceZ != null));
    var showHeatmap = d.showHeatmap === true;
    var showReplay = d.showReplay === true && undoStack.length > 0;
    var restoredReplayStep = parseArchCoordinate(d.replayStep);
    var replayStep = showReplay ? Math.max(0, Math.min(undoStack.length, restoredReplayStep == null ? 0 : restoredReplayStep)) : -1;
    var filterMaterial = typeof d.filterMaterial === 'string' && ARCH_MATERIAL_IDS[d.filterMaterial] ? d.filterMaterial : '';
    var filterShape = typeof d.filterShape === 'string' && ARCH_SHAPE_IDS[d.filterShape] ? d.filterShape : '';
    var budgetEnabled = d.budgetEnabled || false;
    var budget = d.budget != null ? d.budget : 200;
    var aiAdvice = d.aiAdviceBuildSignature === currentBuildSignature ? (d.aiAdvice || '') : '';
    var aiLoading = !!window.__archAiPendingReqId
      && d.aiRequestId === window.__archAiPendingReqId
      && d.aiRequestBuildSignature === currentBuildSignature
      && d.aiLoading === true;
    var showAI = d.showAI || false;
    var showInquiryLab = d.showInquiryLab || false;
    var soundEnabled = d.soundEnabled != null ? d.soundEnabled : true;
    var requestedSelectedBlockKey = typeof d.selectedBlockKey === 'string' ? d.selectedBlockKey : '';
    var selectedBlock = requestedSelectedBlockKey && blocks.find(function (b) { return archBlockKey(b) === requestedSelectedBlockKey; });
    var selectedBlockKey = selectedBlock ? archBlockKey(selectedBlock) : '';

    // ── Shape definitions (12 shapes) ──
    var shapes = [
      { id: 'block', icon: '\uD83D\uDFE6', label: t('stem.archstudio.block', 'Block'), vol: 1 },
      { id: 'slab', icon: '\uD83D\uDCCF', label: t('stem.archstudio.slab', 'Slab'), vol: 0.5 },
      { id: 'ramp', icon: '\uD83C\uDFD4\uFE0F', label: t('stem.archstudio.ramp', 'Ramp'), vol: 0.5 },
      { id: 'column', icon: '\uD83C\uDFDB\uFE0F', label: t('stem.archstudio.column', 'Column'), vol: 0.385 },
      { id: 'arch', icon: '\uD83C\uDF09', label: t('stem.archstudio.arch', 'Arch'), vol: 0.24 },
      { id: 'roof', icon: '\uD83D\uDCD0', label: t('stem.archstudio.roof', 'Roof'), vol: 0.35 },
      { id: 'pyramid', icon: '\uD83D\uDD3A', label: t('stem.archstudio.pyramid', 'Pyramid'), vol: 0.26 },
      { id: 'dome', icon: '\uD83D\uDD35', label: t('stem.archstudio.dome', 'Dome'), vol: 0.26 },
      { id: 'cylinder', icon: '\uD83D\uDEE2\uFE0F', label: t('stem.archstudio.cylinder', 'Cylinder'), vol: 0.785 },
      { id: 'lbeam', icon: '\uD83D\uDD29', label: 'L-Beam', vol: 0.75 },
      { id: 'window', icon: '\uD83E\uDE9F', label: t('stem.archstudio.window', 'Window'), vol: 0.3 },
      { id: 'door', icon: '\uD83D\uDEAA', label: t('stem.archstudio.door', 'Door'), vol: 0.4 }
    ];

    // ── Material definitions with costs ──
    var materials = [
      { id: 'stone', label: t('stem.archstudio.stone', 'Stone'), color: 'var(--allo-stem-text-soft, #94a3b8)', icon: '\uD83E\uDEA8', weight: 2.3, cost: 5 },
      { id: 'brick', label: t('stem.archstudio.brick', 'Brick'), color: '#b45309', icon: '\uD83E\uDDF1', weight: 1.9, cost: 8 },
      { id: 'wood', label: t('stem.archstudio.wood', 'Wood'), color: '#92400e', icon: '\uD83E\uDEB5', weight: 0.6, cost: 3 },
      { id: 'glass', label: t('stem.archstudio.glass', 'Glass'), color: '#38bdf8', icon: '\uD83E\uDE9F', weight: 2.5, cost: 12 },
      { id: 'marble', label: t('stem.archstudio.marble', 'Marble'), color: 'var(--allo-stem-text, #f1f5f9)', icon: '\u26AA', weight: 2.7, cost: 15 },
      { id: 'metal', label: t('stem.archstudio.metal', 'Metal'), color: 'var(--allo-stem-text, #cbd5e1)', icon: '\u2699\uFE0F', weight: 7.8, cost: 20 }
    ];

    // ── Tool modes ──
    var modes = [
      { id: 'place', label: t('stem.archstudio.place', 'Place'), icon: '\u2795' },
      { id: 'erase', label: t('stem.archstudio.erase', 'Erase'), icon: '\u274C' },
      { id: 'paint', label: t('stem.archstudio.paint', 'Paint'), icon: '\uD83C\uDFA8' },
      { id: 'pick', label: t('stem.archstudio.pick', 'Pick'), icon: '\uD83C\uDFAF' }
    ];
    var modeVisuals = {
      place: { bg: 'rgba(34,197,94,.2)', border: '#22c55e', color: '#4ade80', label: '\u2795 Place', action: 'Place' },
      erase: { bg: 'rgba(239,68,68,.2)', border: '#ef4444', color: '#f87171', label: '\u274C Erase', action: 'Erase' },
      paint: { bg: 'rgba(168,85,247,.2)', border: '#a855f7', color: '#c084fc', label: '\uD83C\uDFA8 Paint', action: 'Paint' },
      pick: { bg: 'rgba(34,211,238,.2)', border: '#22d3ee', color: '#67e8f9', label: '\uD83C\uDFAF Pick', action: 'Pick properties' }
    };
    var activeModeVisual = modeVisuals[mode] || modeVisuals.place;

    // ── Rotation options ──
    var rotations = [
      { deg: 0, label: '0\u00B0', icon: '\u2B06\uFE0F' },
      { deg: 90, label: '90\u00B0', icon: '\u27A1\uFE0F' },
      { deg: 180, label: '180\u00B0', icon: '\u2B07\uFE0F' },
      { deg: 270, label: '270\u00B0', icon: '\u2B05\uFE0F' }
    ];

    // ── Lookups ──
    var volLookup = {};
    var shapeIconById = {};
    shapes.forEach(function (s) { volLookup[s.id] = s.vol; shapeIconById[s.id] = s.icon; });
    var matColorLookup = {};
    var matWeightLookup = {};
    var matCostLookup = {};
    materials.forEach(function (m) { matColorLookup[m.id] = m.color; matWeightLookup[m.id] = m.weight; matCostLookup[m.id] = m.cost; });

    var archReplayFrame = showReplay && replayStep >= 0 && replayStep < undoStack.length
      ? getArchRuntimeBlocks(undoStack[replayStep])
      : blocks;
    var archDisplayBlocks = selectArchDisplayBlocks(archReplayFrame, {
      showReplay: false,
      replayStep: replayStep,
      undoStack: undoStack,
      viewLayer: viewLayer,
      showSlice: showSlice,
      sliceZ: sliceZ,
      sliceZSelected: sliceZSelected,
      filterMaterial: filterMaterial,
      filterShape: filterShape
    });

    var archUnsupportedKeys = getArchUnsupportedKeys(blocks);
    var archHeatmapBlocks = showReplay ? archReplayFrame : blocks;
    var archHeatmapUnsupportedKeys = showHeatmap ? getArchUnsupportedKeys(archHeatmapBlocks) : {};
    var archBlockLoads = {};
    var archMaxLoad = 0;
    if (showHeatmap && archHeatmapBlocks.length) {
      var archColumns = {};
      archHeatmapBlocks.forEach(function (b) {
        var columnKey = b.x + ',' + b.z;
        if (!archColumns[columnKey]) archColumns[columnKey] = [];
        archColumns[columnKey].push(b);
      });
      Object.keys(archColumns).forEach(function (columnKey) {
        var column = archColumns[columnKey].slice().sort(function (a, b) { return a.y - b.y; });
        var cumulative = 0;
        var previousY = null;
        for (var loadIndex = column.length - 1; loadIndex >= 0; loadIndex--) {
          var loadBlock = column[loadIndex];
          if (previousY != null && previousY - loadBlock.y > 1) cumulative = 0;
          cumulative += (volLookup[loadBlock.shape || 'block'] || 1) * (matWeightLookup[loadBlock.material || 'stone'] || 2.0);
          archBlockLoads[loadBlock.x + ',' + loadBlock.y + ',' + loadBlock.z] = cumulative;
          if (cumulative > archMaxLoad) archMaxLoad = cumulative;
          previousY = loadBlock.y;
        }
      });
    }

    // ── 3D building view (opt-in; the floor plans stay the floor) ──
    // Always on: this drives the tool's MAIN viewport, which until now
    // showed a spinner that never resolved. d.hide3d is an escape hatch the
    // failure path sets, not a default.
    var archShow3d = d.hide3d !== true;
    var archRot = d.rot3d || { rotX: -24, rotY: -38, scale: 1 };
    var setArchCamera = function (action) {
      var nextCamera = changeArchCamera(archRot, action);
      if (action === 'reset' || (blueprintView && action !== 'zoomIn' && action !== 'zoomOut')) upd({ rot3d: nextCamera, blueprintView: false });
      else upd('rot3d', nextCamera);
    };
    function archHexFor(b) {
      // Selection is rendered as a separate wireframe outline so material and
      // analysis colours remain truthful while an object is selected.
      if (showHeatmap && archMaxLoad > 0) {
        var loadKey = b.x + ',' + b.y + ',' + b.z;
        if (archHeatmapUnsupportedKeys[loadKey]) return 0xef4444;
        var load = archBlockLoads[loadKey] || 0;
        var pct = Math.max(0, Math.min(1, load / archMaxLoad));
        var from = pct < 0.5 ? [34, 197, 94] : [234, 179, 8];
        var to = pct < 0.5 ? [234, 179, 8] : [239, 68, 68];
        var local = pct < 0.5 ? pct * 2 : (pct - 0.5) * 2;
        var rr = Math.round(from[0] + (to[0] - from[0]) * local);
        var gg = Math.round(from[1] + (to[1] - from[1]) * local);
        var bb = Math.round(from[2] + (to[2] - from[2]) * local);
        return (rr << 16) | (gg << 8) | bb;
      }
      if (styleMode === 'bricks') return ARCH_BRICK_HEX[b.material || 'stone'] || ARCH_BRICK_HEX.stone;
      var own = String(b.color || '').trim();
      if (/^#[0-9a-f]{6}$/i.test(own)) return parseInt(own.slice(1), 16);
      var m = ARCH_MAT_HEX[b.material || 'stone'];
      return m == null ? 0x94a3b8 : m;
    }
    var archGlAlt = 'Three-dimensional view of your build: ' + archDisplayBlocks.length
      + (archDisplayBlocks.length === 1 ? ' visible block' : ' visible blocks')
      + (archDisplayBlocks.length !== blocks.length ? ' of ' + blocks.length + ' total' : '')
      + (selectedBlock ? '. Selected block at X ' + selectedBlock.x + ', Y ' + selectedBlock.y + ', Z ' + selectedBlock.z : '')
      + (showHeatmap ? '. Structural load heatmap is active' : '')
      + '. Use the camera controls to look around it.';
    var mainUse3d = archShow3d && editorView !== 'grid';
    var archRenderBlocks = mainUse3d ? archDisplayBlocks.map(function (b) {
      return {
        x: b.x || 0, y: b.y || 0, z: b.z || 0,
        shape: b.shape || 'block', material: b.material || 'stone',
        rotation: b.rotation || 0, hex: archHexFor(b), selected: archBlockKey(b) === selectedBlockKey
      };
    }) : [];
    if (mainUse3d) {
      ArchGL.submit({
        blocks: archRenderBlocks,
        rotX: archRot.rotX, rotY: archRot.rotY, scale: archRot.scale || 1,
        blueprintView: blueprintView,
        styleMode: styleMode,
        onReady: function () { upd('gl3dReadyAt', Date.now()); },
        onFail: function () {
          upd('hide3d', true);
          if (typeof addToast === 'function') addToast('The 3D view could not load. Showing floor plans.', 'info');
        },
        sig: archRenderBlocks.map(function (b) {
          return (b.x || 0) + ',' + (b.y || 0) + ',' + (b.z || 0) + ',' + (b.shape || 'block') + ','
            + (b.material || '') + ',' + (b.rotation || 0) + ',' + b.hex;
        }).join('|') + '|style:' + styleMode + '|heat:' + (showHeatmap ? 'on' : 'off')
          + '|selected:' + selectedBlockKey
      });
    }
    var archGlLive = archShow3d && ArchGL.isReady();

    // ── Basic Stats ──
    var totalBlocks = blocks.length;
    var totalVolume = blocks.reduce(function (sum, b) { return sum + (volLookup[b.shape || 'block'] || 1); }, 0).toFixed(2);

    // Footprint = unique (x,z) cells
    var footprintSet = {};
    blocks.forEach(function (b) { footprintSet[b.x + ',' + b.z] = true; });
    var footprint = Object.keys(footprintSet).length;

    // Surface area
    var blockMap = {};
    blocks.forEach(function (b) { blockMap[b.x + ',' + b.y + ',' + b.z] = true; });
    var surfaceArea = 0;
    blocks.forEach(function (b) {
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (n) {
        if (!blockMap[(b.x + n[0]) + ',' + (b.y + n[1]) + ',' + (b.z + n[2])]) surfaceArea += 1;
      });
    });

    // Bounding box
    var buildW = 0, buildD = 0, buildH = 0;
    var minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    if (blocks.length > 0) {
      minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity; minZ = Infinity; maxZ = -Infinity;
      blocks.forEach(function (b) {
        if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
        if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y;
        if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z;
      });
      buildW = maxX - minX + 1; buildD = maxZ - minZ + 1; buildH = maxY - minY + 1;
    }

    // ── Material Budget ──
    var totalCost = blocks.reduce(function (s, b) { return s + (matCostLookup[b.material || 'stone'] || 5); }, 0);
    var budgetRemaining = budget - totalCost;
    var budgetPct = budget > 0 ? Math.round((totalCost / budget) * 100) : 0;
    var overBudget = budgetEnabled && budgetRemaining < 0;

    // ══════════════════════════════════════════════════════════════
    // ── Structural Analysis Engine ──
    // ══════════════════════════════════════════════════════════════
    var analysis = { cogX: 0, cogY: 0, cogZ: 0, stability: 0, stabilityLabel: 'N/A', stabilityEmoji: '\u2B1C',
      supportedPct: 100, unsupported: 0, materialCount: 0, symmetry: 0, totalWeight: 0, tip: '' };

    if (totalBlocks > 0) {
      var sumWX = 0, sumWY = 0, sumWZ = 0, sumW = 0;
      var matSet = {};
      blocks.forEach(function (b) {
        var w = (volLookup[b.shape || 'block'] || 1) * (matWeightLookup[b.material || 'stone'] || 2.0);
        sumWX += b.x * w; sumWY += b.y * w; sumWZ += b.z * w; sumW += w;
        matSet[b.material || 'stone'] = true;
      });
      analysis.cogX = sumW > 0 ? (sumWX / sumW).toFixed(1) : 0;
      analysis.cogY = sumW > 0 ? (sumWY / sumW).toFixed(1) : 0;
      analysis.cogZ = sumW > 0 ? (sumWZ / sumW).toFixed(1) : 0;
      analysis.totalWeight = sumW.toFixed(1);
      analysis.materialCount = Object.keys(matSet).length;

      // Y=0 is the actual ground plane. A wholly elevated import must not be
      // treated as supported merely because its lowest block is above ground.
      var floating = Object.keys(archUnsupportedKeys).length;
      analysis.unsupported = floating;
      analysis.supportedPct = totalBlocks > 0 ? Math.round(((totalBlocks - floating) / totalBlocks) * 100) : 100;

      var cogHeight = parseFloat(analysis.cogY) - minY;
      var footprintWidth = Math.max(buildW, buildD);
      var rawStability = footprintWidth > 0 && cogHeight >= 0 ? Math.min(100, Math.round((footprintWidth / (cogHeight + 1)) * 30)) : 100;
      var floatPenalty = Math.round((floating / Math.max(1, totalBlocks)) * 40);
      analysis.stability = Math.max(0, Math.min(100, rawStability - floatPenalty));

      if (analysis.stability >= 70) { analysis.stabilityLabel = 'Stable'; analysis.stabilityEmoji = '\uD83D\uDFE2'; }
      else if (analysis.stability >= 40) { analysis.stabilityLabel = 'Moderate'; analysis.stabilityEmoji = '\uD83D\uDFE1'; }
      else { analysis.stabilityLabel = 'Unstable'; analysis.stabilityEmoji = '\uD83D\uDD34'; }

      var midX = (minX + maxX) / 2;
      var leftCount = 0, mirroredCount = 0;
      blocks.forEach(function (b) {
        if (b.x < midX) { leftCount++; var mirrorX = Math.round(midX + (midX - b.x)); if (blockMap[mirrorX + ',' + b.y + ',' + b.z]) mirroredCount++; }
        else if (b.x === midX) { leftCount++; mirroredCount++; }
      });
      analysis.symmetry = leftCount > 0 ? Math.round((mirroredCount / leftCount) * 100) : 100;

      if (floating > 0 && floating > totalBlocks * 0.3) {
        analysis.tip = '\u26A0\uFE0F ' + floating + ' blocks are floating! Add supports below them.';
      } else if (analysis.stability < 40) {
        analysis.tip = '\uD83C\uDFD7\uFE0F Center of gravity is high (' + analysis.cogY + '). Widen the base!';
      } else if (analysis.symmetry < 50) {
        analysis.tip = '\uD83C\uDFDB\uFE0F Asymmetric structure (symmetry: ' + analysis.symmetry + '%). Try mirroring!';
      } else if (analysis.materialCount === 1) {
        analysis.tip = '\uD83C\uDFA8 Mix materials for structural variety!';
      } else {
        analysis.tip = '\u2705 Great structure! Stability: ' + analysis.stability + '%, Symmetry: ' + analysis.symmetry + '%';
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ── Challenge System (10 progressive challenges) ──
    // ══════════════════════════════════════════════════════════════
    var shapeCount = {};
    blocks.forEach(function (b) { var sid = b.shape || 'block'; shapeCount[sid] = (shapeCount[sid] || 0) + 1; });
    var volToSurf = surfaceArea > 0 ? (parseFloat(totalVolume) / surfaceArea) : 0;

    var challenges = [
      { id: 0, title: t('stem.archstudio.first_wall', 'First Wall'), icon: '\uD83E\uDDF1', desc: t('stem.archstudio.build_a_wall_3_wide_3_tall', 'Build a wall: 3+ wide, 3+ tall'), xp: 10,
        check: function () { return buildW >= 3 && buildH >= 3; },
        fact: t('stem.archstudio.the_earliest_known_brick_wall_dates_to', 'The earliest known brick wall dates to ~7500 BCE in Jericho!') },
      { id: 1, title: t('stem.archstudio.stable_tower', 'Stable Tower'), icon: '\uD83C\uDFD7\uFE0F', desc: t('stem.archstudio.6_high_stability_60', '6+ high, stability > 60%'), xp: 15,
        check: function () { return buildH >= 6 && analysis.stability > 60; },
        fact: t('stem.archstudio.the_leaning_tower_of_pisa_has_a_3_97_l', 'The Leaning Tower of Pisa has a 3.97\u00B0 lean due to shallow foundations!') },
      { id: 2, title: t('stem.archstudio.material_mix', 'Material Mix'), icon: '\uD83C\uDFA8', desc: t('stem.archstudio.use_3_different_materials', 'Use 3+ different materials'), xp: 10,
        check: function () { return analysis.materialCount >= 3; },
        fact: t('stem.archstudio.the_parthenon_used_marble_limestone_an', 'The Parthenon used marble, limestone, and iron clamps!') },
      { id: 3, title: t('stem.archstudio.roman_arch', 'Roman Arch'), icon: '\uD83C\uDFDB\uFE0F', desc: t('stem.archstudio.2_arches_and_2_columns', '2+ arches and 2+ columns'), xp: 20,
        check: function () { return (shapeCount.arch || 0) >= 2 && (shapeCount.column || 0) >= 2; },
        fact: t('stem.archstudio.the_colosseum_has_80_arched_entrances', 'The Colosseum has 80 arched entrances!') },
      { id: 4, title: t('stem.archstudio.symmetry_master', 'Symmetry Master'), icon: '\u2696\uFE0F', desc: t('stem.archstudio.symmetry_score_80', 'Symmetry score > 80%'), xp: 15,
        check: function () { return totalBlocks >= 6 && analysis.symmetry > 80; },
        fact: t('stem.archstudio.the_taj_mahal_is_perfectly_symmetrical', 'The Taj Mahal is perfectly symmetrical along its central axis.') },
      { id: 5, title: t('stem.archstudio.bridge_builder', 'Bridge Builder'), icon: '\uD83C\uDF09', desc: t('stem.archstudio.4_wide_3_high_no_floaters', '4+ wide, 3+ high, no floaters'), xp: 25,
        check: function () { return buildW >= 4 && buildH >= 3 && analysis.unsupported === 0; },
        fact: t('stem.archstudio.the_1915_anakkale_bridge_spans_2_023_m', 'The 1915 \u00C7anakkale Bridge spans 2,023 meters!') },
      { id: 6, title: t('stem.archstudio.efficient_design', 'Efficient Design'), icon: '\uD83D\uDCCA', desc: t('stem.archstudio.20_blocks_vol_surface_0_5', '20+ blocks, vol/surface > 0.5'), xp: 20,
        check: function () { return totalBlocks >= 20 && volToSurf > 0.5; },
        fact: t('stem.archstudio.igloos_use_dome_shapes_to_minimize_hea', 'Igloos use dome shapes to minimize heat loss!') },
      { id: 7, title: t('stem.archstudio.skyscraper', 'Skyscraper'), icon: '\uD83C\uDFD9\uFE0F', desc: t('stem.archstudio.10_height_stability_50', '10+ height, stability > 50%'), xp: 25,
        check: function () { return buildH >= 10 && analysis.stability > 50; },
        fact: t('stem.archstudio.the_burj_khalifa_828m_uses_a_y_shaped_', 'The Burj Khalifa (828m) uses a Y-shaped floor plan!') },
      { id: 8, title: t('stem.archstudio.the_pyramid', 'The Pyramid'), icon: '\uD83D\uDD3A', desc: t('stem.archstudio.pyramid_ramp_shapes_stability_90', 'Pyramid/ramp shapes, stability > 90%'), xp: 20,
        check: function () { return ((shapeCount.pyramid || 0) + (shapeCount.ramp || 0)) >= 3 && analysis.stability > 90; },
        fact: t('stem.archstudio.the_great_pyramid_contains_2_3_million', 'The Great Pyramid contains 2.3 million stone blocks!') },
      { id: 9, title: t('stem.archstudio.dream_home', 'Dream Home'), icon: '\uD83C\uDFE0', desc: t('stem.archstudio.30_blocks_4_mats_doors_windows', '30+ blocks, 4+ mats, doors & windows'), xp: 30,
        check: function () { return totalBlocks >= 30 && analysis.materialCount >= 4 && (shapeCount.door || 0) >= 1 && (shapeCount.window || 0) >= 1; },
        fact: t('stem.archstudio.architects_balance_light_ventilation_i', 'Architects balance light, ventilation, integrity, and aesthetics!') }
    ];

    var challengeProgress = null;
    var justCompleted = false;
    if (activeChallenge >= 0 && activeChallenge < challenges.length) {
      var ch = challenges[activeChallenge];
      var passed = ch.check();
      challengeProgress = { challenge: ch, passed: passed };
      if (passed && !completedChallenges[ch.id]) justCompleted = true;
    }
    var completedCount = challenges.filter(function (challenge) { return !!completedChallenges[challenge.id]; }).length;

    var completeChallenge = function () {
      if (!challengeProgress || !challengeProgress.passed) return;
      var chx = challengeProgress.challenge;
      var newCompleted = Object.assign({}, completedChallenges);
      newCompleted[chx.id] = Date.now();
      upd('completedChallenges', newCompleted);
      if (ctx.awardXP) ctx.awardXP('archStudio_challenge_' + chx.id, chx.xp, 'Challenge: ' + chx.title);
      if (ctx.addToast) ctx.addToast('\uD83C\uDFC6 Challenge Complete: ' + chx.title + '! +' + chx.xp + ' XP', 'success');
      if (soundEnabled) sfxChallenge();
    };

    // ══════════════════════════════════════════════════════════════
    // ── Multi-Level Undo/Redo ──
    // ══════════════════════════════════════════════════════════════
    var pushUndo = function (currentBlocks) {
      var stack = (undoStack || []).slice();
      stack.push(JSON.parse(JSON.stringify(currentBlocks)));
      if (stack.length > 50) stack = stack.slice(-50);
      return stack;
    };

    var pushUndoFromState = function (archState) {
      var stack = getArchHistoryStack(archState.undoStack);
      stack.push(JSON.parse(JSON.stringify(getArchRuntimeBlocks(archState.blocks))));
      return stack.length > 50 ? stack.slice(-50) : stack;
    };

    var requireLiveBuild = function () {
      if (!showReplay) return true;
      var message = 'Construction replay is read-only. Exit replay before changing the live build.';
      if (ctx.addToast) ctx.addToast(message, 'info');
      if (announceToSR) announceToSR(message);
      return false;
    };

    var focusArchStudioRegion = function () {
      setTimeout(function () {
        if (typeof document === 'undefined') return;
        var region = document.getElementById('arch-studio-region');
        if (region && typeof region.focus === 'function') region.focus();
      }, 0);
    };

    var focusArchGridCell = function (x, z) {
      var attempts = 0;
      var focusWhenReady = function () {
        if (typeof document === 'undefined') return;
        var grid = document.querySelector('[data-arch-grid="true"]');
        if (!grid) {
          if (attempts++ < 4) setTimeout(focusWhenReady, 16);
          return;
        }
        var cell = null;
        if (x != null && z != null) {
          cell = grid.querySelector('[data-arch-grid-x="' + x + '"][data-arch-grid-z="' + z + '"]');
          if (!cell && attempts++ < 4) { setTimeout(focusWhenReady, 16); return; }
        }
        if (!cell) cell = grid.querySelector('[role="gridcell"][tabindex="0"]') || grid.querySelector('[role="gridcell"]');
        if (cell && typeof cell.focus === 'function') {
          cell.focus();
          if (typeof cell.scrollIntoView === 'function') {
            try { cell.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { cell.scrollIntoView(); }
          }
        }
      };
      setTimeout(focusWhenReady, 0);
    };

    var openArchGridForKeyboard = function () {
      upd('editorView', 'grid');
      focusArchGridCell(gridCursorX, gridCursorZ);
      if (announceToSR) announceToSR('Floor grid opened. Use arrow keys to move between cells and Enter or Space to use the active tool.');
    };

    var clearSelectedBlock = function (restoreFocus) {
      if (!selectedBlock) return false;
      upd('selectedBlockKey', '');
      if (announceToSR) announceToSR('Block selection cleared.');
      if (restoreFocus) focusArchStudioRegion();
      return true;
    };

    // Eyedropper workflow: copy every authoring property from an existing
    // block, then return to Place so the next click can repeat it immediately.
    // This is intentionally read-only and does not add an undo entry.
    var pickArchProperties = function (target) {
      if (showReplay) {
        if (announceToSR) announceToSR('Exit construction replay before picking a block.');
        return false;
      }
      var cell = target && target.block;
      var picked = cell && blocks.find(function (b) {
        return b.x === Math.round(cell.x) && b.y === Math.round(cell.y) && b.z === Math.round(cell.z);
      });
      if (!picked) {
        upd('selectedBlockKey', '');
        if (announceToSR) announceToSR('Pick mode needs an existing block.');
        return false;
      }
      var pickedShape = Object.prototype.hasOwnProperty.call(ARCH_SHAPE_IDS, picked.shape) ? picked.shape : 'block';
      var pickedMaterial = Object.prototype.hasOwnProperty.call(ARCH_MATERIAL_IDS, picked.material) ? picked.material : 'stone';
      var pickedRotation = normalizeArchRotation(picked.rotation);
      upd({
        activeShape: pickedShape,
        activeMaterial: pickedMaterial,
        activeColor: normalizeArchColor(picked.color, pickedMaterial),
        activeRotation: pickedRotation,
        selectedBlockKey: archBlockKey(picked),
        editLayer: Math.max(ARCH_Y_MIN, Math.min(ARCH_Y_MAX, Math.round(picked.y))),
        mode: 'place'
      });
      if (announceToSR) announceToSR('Picked ' + pickedMaterial + ' ' + pickedShape + ' at X ' + picked.x + ', Y ' + picked.y + ', Z ' + picked.z + '. Place mode active.');
      return true;
    };

    var commitArchEdit = function (target) {
      if (showReplay) {
        if (announceToSR) announceToSR('Exit construction replay before editing.');
        return false;
      }
      var edit = {
        mode: mode,
        place: target && target.place,
        block: target && target.block,
        shape: activeShape,
        material: activeMaterial,
        color: activeColor,
        rotation: activeRotation,
        symmetry: symmetryMode
      };
      var preview = applyArchEdit(blocks, edit);
      if (preview === blocks) return false;
      var editCell = mode === 'place' ? edit.place : edit.block;
      var selectedAfterEdit = '';
      if (mode !== 'erase') {
        var changedCells = [editCell];
        if (symmetryMode && editCell && isFinite(editCell.x) && Math.round(editCell.x) !== 0) {
          changedCells.push(Object.assign({}, editCell, { x: -Math.round(editCell.x) }));
        }
        changedCells.some(function (candidate) {
          var key = archBlockKey(candidate);
          var before = blocks.find(function (b) { return archBlockKey(b) === key; });
          var after = preview.find(function (b) { return archBlockKey(b) === key; });
          if (after && after !== before) { selectedAfterEdit = key; return true; }
          return false;
        });
      }

      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function (p) {
          var a = Object.assign({}, p.archStudio || {});
          if (a.showReplay) return p;
          var current = getArchRuntimeBlocks(a.blocks);
          var next = applyArchEdit(current, edit);
          if (next === current) return p;
          var committedEditLayer = mode === 'erase' ? nearestArchOccupiedLayer(next, a.editLayer) : a.editLayer;
          var committedViewLayer = a.viewLayer != null && a.viewLayer >= 0 && mode === 'erase'
            ? (next.length ? nearestArchOccupiedLayer(next, a.viewLayer) : -1)
            : a.viewLayer;
          var history = getArchHistoryStack(a.undoStack);
          history.push(JSON.parse(JSON.stringify(current)));
          if (history.length > 50) history = history.slice(-50);
          var materialsSeen = Object.assign({}, a.materialsUsed || {});
          var stylesSeen = Object.assign({}, a.stylesUsed || {});
          if (mode !== 'erase') materialsSeen[activeMaterial] = true;
          stylesSeen[styleMode] = true;
          return Object.assign({}, p, { archStudio: Object.assign({}, a, {
            blocks: next,
            undoStack: history,
            redoStack: [],
            materialsUsed: materialsSeen,
            stylesUsed: stylesSeen,
            selectedBlockKey: selectedAfterEdit,
            editLayer: committedEditLayer,
            viewLayer: committedViewLayer,
            filterMaterial: next.length ? a.filterMaterial : '',
            filterShape: next.length ? a.filterShape : '',
            showSlice: next.length ? a.showSlice : false,
            sliceZSelected: next.length ? a.sliceZSelected : false,
            quakeResult: null
          }) });
        });
      } else {
        upd({
          blocks: preview, undoStack: pushUndo(blocks), redoStack: [], selectedBlockKey: selectedAfterEdit,
          editLayer: mode === 'erase' ? nearestArchOccupiedLayer(preview, editLayer) : editLayer,
          viewLayer: viewLayer >= 0 && mode === 'erase' ? (preview.length ? nearestArchOccupiedLayer(preview, viewLayer) : -1) : viewLayer,
          filterMaterial: preview.length ? filterMaterial : '', filterShape: preview.length ? filterShape : '',
          showSlice: preview.length ? showSlice : false, sliceZSelected: preview.length ? sliceZSelected : false,
          quakeResult: null
        });
      }

      if (soundEnabled) {
        if (mode === 'erase') sfxErase(); else sfxPlace();
      }
      var cell = editCell;
      if (announceToSR && cell) {
        announceToSR((mode === 'place' ? 'Placed ' + activeShape : mode === 'erase' ? 'Removed block' : 'Painted block')
          + ' at X ' + Math.round(cell.x) + ', Y ' + Math.round(cell.y) + ', Z ' + Math.round(cell.z) + '.'
          + (symmetryMode && Math.round(cell.x) !== 0 ? ' Mirrored across X equals zero.' : ''));
      }
      return true;
    };

    var commitSelectedAction = function (action) {
      if (showReplay) {
        if (announceToSR) announceToSR('Exit construction replay before editing the selected block.');
        return false;
      }
      if (!selectedBlock) {
        if (announceToSR) announceToSR('Pick a block before using the inspector.');
        return false;
      }
      var restoreInspectorFocus = false;
      try {
        var focused = typeof document !== 'undefined' ? document.activeElement : null;
        restoreInspectorFocus = !!(focused && typeof focused.closest === 'function' && focused.closest('[data-arch-inspector="true"]'));
      } catch (_) {}
      var sourceSelectedKey = selectedBlockKey;
      var fullAction = Object.assign({}, action || {}, { cell: {
        x: selectedBlock.x, y: selectedBlock.y, z: selectedBlock.z
      } });
      if (fullAction.type === 'replace') {
        fullAction.shape = activeShape;
        fullAction.material = activeMaterial;
        fullAction.color = activeColor;
        fullAction.rotation = activeRotation;
      }
      var preview = applyArchBlockAction(blocks, fullAction);
      if (preview === blocks) {
        var blockedMessage = fullAction.type === 'replace'
          ? 'The selected block already uses the current shape, material, color, and rotation.'
          : 'That block action is blocked by the build limits, maximum size, or an occupied destination.';
        if (ctx.addToast) ctx.addToast(blockedMessage, 'info');
        if (announceToSR) announceToSR(blockedMessage);
        return false;
      }

      var targetCell = { x: selectedBlock.x, y: selectedBlock.y, z: selectedBlock.z };
      if (fullAction.type === 'move' || fullAction.type === 'duplicate') {
        targetCell = {
          x: Math.round(selectedBlock.x) + (Math.round(Number(fullAction.dx)) || 0),
          y: Math.round(selectedBlock.y) + (Math.round(Number(fullAction.dy)) || 0),
          z: Math.round(selectedBlock.z) + (Math.round(Number(fullAction.dz)) || 0)
        };
      }
      var nextSelectedKey = fullAction.type === 'delete' ? '' : archBlockKey(targetCell);
      var nextEditLayer = fullAction.type === 'delete' ? editLayer : Math.max(ARCH_Y_MIN, Math.min(ARCH_Y_MAX, Math.round(targetCell.y)));
      var transaction = { committed: false, reported: false };
      var reportCommittedAction = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (soundEnabled) {
          if (fullAction.type === 'delete') sfxErase(); else sfxPlace();
        }
        if (announceToSR) {
          if (fullAction.type === 'delete') announceToSR('Deleted the selected block.');
          else if (fullAction.type === 'replace') announceToSR('Applied the current properties to the selected block.');
          else announceToSR((fullAction.type === 'duplicate' ? 'Duplicated' : 'Moved') + ' selected block to X ' + targetCell.x + ', Y ' + targetCell.y + ', Z ' + targetCell.z + '.');
        }
      };

      // Focus recovery should not depend on React's deferred updater timing;
      // moving focus to the studio remains safe even if a racing delete no-ops.
      if (fullAction.type === 'delete' && restoreInspectorFocus) focusArchStudioRegion();

      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function (p) {
          var a = Object.assign({}, p.archStudio || {});
          if (a.showReplay) return p;
          if (a.selectedBlockKey !== sourceSelectedKey) return p;
          var current = getArchRuntimeBlocks(a.blocks);
          var liveBlock = current.find(function (b) { return archBlockKey(b) === sourceSelectedKey; });
          if (!liveBlock) return p;
          var liveAction = Object.assign({}, fullAction, { cell: liveBlock });
          var next = applyArchBlockAction(current, liveAction);
          if (next === current) return p;
          var committedEditLayer = fullAction.type === 'delete' ? nearestArchOccupiedLayer(next, a.editLayer) : nextEditLayer;
          var committedViewLayer = a.viewLayer != null && a.viewLayer >= 0
            ? (fullAction.type === 'delete' ? (next.length ? nearestArchOccupiedLayer(next, a.viewLayer) : -1) : nextEditLayer)
            : a.viewLayer;
          var history = getArchHistoryStack(a.undoStack);
          history.push(JSON.parse(JSON.stringify(current)));
          if (history.length > 50) history = history.slice(-50);
          var materialsSeen = Object.assign({}, a.materialsUsed || {});
          var stylesSeen = Object.assign({}, a.stylesUsed || {});
          if (fullAction.type === 'replace') materialsSeen[activeMaterial] = true;
          stylesSeen[styleMode] = true;
          transaction.committed = true;
          return Object.assign({}, p, { archStudio: Object.assign({}, a, {
            blocks: next,
            undoStack: history,
            redoStack: [],
            selectedBlockKey: nextSelectedKey,
            editLayer: committedEditLayer,
            viewLayer: committedViewLayer,
            filterMaterial: next.length ? a.filterMaterial : '',
            filterShape: next.length ? a.filterShape : '',
            showSlice: next.length ? a.showSlice : false,
            sliceZSelected: next.length ? a.sliceZSelected : false,
            materialsUsed: materialsSeen,
            stylesUsed: stylesSeen,
            quakeResult: null
          }) });
        });
      } else {
        upd({
          blocks: preview,
          undoStack: pushUndo(blocks),
          redoStack: [],
          selectedBlockKey: nextSelectedKey,
          editLayer: fullAction.type === 'delete' ? nearestArchOccupiedLayer(preview, editLayer) : nextEditLayer,
          viewLayer: viewLayer >= 0 ? (fullAction.type === 'delete' ? (preview.length ? nearestArchOccupiedLayer(preview, viewLayer) : -1) : nextEditLayer) : viewLayer,
          filterMaterial: preview.length ? filterMaterial : '', filterShape: preview.length ? filterShape : '',
          showSlice: preview.length ? showSlice : false, sliceZSelected: preview.length ? sliceZSelected : false,
          quakeResult: null
        });
        transaction.committed = true;
      }
      if (transaction.committed) reportCommittedAction();
      else setTimeout(reportCommittedAction, 0);
      return true;
    };

    var revealSelectedBlock = function () {
      if (!selectedBlock) return;
      upd({
        viewLayer: -1,
        showSlice: false,
        sliceZSelected: false,
        filterMaterial: '',
        filterShape: '',
        editLayer: Math.max(ARCH_Y_MIN, Math.min(ARCH_Y_MAX, Math.round(selectedBlock.y))),
        gridCursorX: Math.round(selectedBlock.x),
        gridCursorZ: Math.round(selectedBlock.z)
      });
      if (editorView === 'grid') focusArchGridCell(selectedBlock.x, selectedBlock.z);
      if (announceToSR) announceToSR('Selected block revealed at X ' + selectedBlock.x + ', Y ' + selectedBlock.y + ', Z ' + selectedBlock.z + '.');
    };

    var editAtPointer = function (ev) {
      if (archDrag.suppressClick) { archDrag.suppressClick = false; return; }
      if (showReplay) {
        if (announceToSR) announceToSR('Exit construction replay before editing.');
        return;
      }
      var target = ArchGL.pick(ev.clientX, ev.clientY);
      if (target) {
        if (mode === 'pick') pickArchProperties(target);
        else commitArchEdit(target);
      }
      ArchGL.clearPreview();
    };

    var editAtGridCell = function (x, z) {
      var target = {
        place: { x: x, y: editLayer, z: z },
        block: { x: x, y: editLayer, z: z }
      };
      if (mode === 'pick') pickArchProperties(target);
      else commitArchEdit(target);
    };

    var doUndo = function () {
      if (!requireLiveBuild()) return;
      var transaction = { committed: false, reported: false, count: 0 };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (soundEnabled) sfxUndo();
        if (announceToSR) announceToSR('Undo. ' + transaction.count + ' blocks.');
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var stack = getArchHistoryStack(a.undoStack);
        if (!stack.length) return p;
        var prev = getArchRuntimeBlocks(stack.pop());
        var redo = getArchHistoryStack(a.redoStack);
        redo.push(JSON.parse(JSON.stringify(getArchRuntimeBlocks(a.blocks))));
        if (redo.length > 50) redo = redo.slice(-50);
        var restoredEditLayer = nearestArchOccupiedLayer(prev, a.editLayer != null ? a.editLayer : editLayer);
        var restoredViewLayer = a.viewLayer != null && a.viewLayer >= 0 ? nearestArchOccupiedLayer(prev, a.viewLayer) : a.viewLayer;
        transaction.committed = true;
        transaction.count = prev ? prev.length : 0;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: prev, undoStack: stack, redoStack: redo, selectedBlockKey: '',
          editLayer: restoredEditLayer, viewLayer: restoredViewLayer,
          gridCursorX: null, gridCursorZ: null, quakeResult: null
        }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    var doRedo = function () {
      if (!requireLiveBuild()) return;
      var transaction = { committed: false, reported: false, count: 0 };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (soundEnabled) sfxRedo();
        if (announceToSR) announceToSR('Redo. ' + transaction.count + ' blocks.');
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var stack = getArchHistoryStack(a.redoStack);
        if (!stack.length) return p;
        var next = getArchRuntimeBlocks(stack.pop());
        var undo = getArchHistoryStack(a.undoStack);
        undo.push(JSON.parse(JSON.stringify(getArchRuntimeBlocks(a.blocks))));
        if (undo.length > 50) undo = undo.slice(-50);
        var restoredEditLayer = nearestArchOccupiedLayer(next, a.editLayer != null ? a.editLayer : editLayer);
        var restoredViewLayer = a.viewLayer != null && a.viewLayer >= 0 ? nearestArchOccupiedLayer(next, a.viewLayer) : a.viewLayer;
        transaction.committed = true;
        transaction.count = next ? next.length : 0;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: next, undoStack: undo, redoStack: stack, selectedBlockKey: '',
          editLayer: restoredEditLayer, viewLayer: restoredViewLayer,
          gridCursorX: null, gridCursorZ: null, quakeResult: null
        }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // Clear all (with undo snapshot)
    var clearAll = function () {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var transaction = { committed: false, reported: false };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (announceToSR) announceToSR('All blocks cleared.');
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay || !getArchRuntimeBlocks(a.blocks).length) return p;
        transaction.committed = true;
        return Object.assign({}, p, { archStudio: Object.assign({}, a,
          getArchReplacementViewState([], a.editLayer),
          { blocks: [], undoStack: pushUndoFromState(a), redoStack: [] }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Save / Load Gallery ──
    // ══════════════════════════════════════════════════════════════
    var galleryItems = loadGallery();

    var saveBuild = function () {
      if (blocks.length === 0) return;
      var name = (styleMode === 'bricks' ? 'Brick Build' : 'Build') + ' #' + (galleryItems.length + 1);
      var item = {
        id: 'arch_' + Date.now(),
        name: name,
        blocks: sanitizeArchBlocks(blocks),
        blockCount: blocks.length,
        dims: buildW + '\u00D7' + buildD + '\u00D7' + buildH,
        stability: analysis.stability,
        timestamp: Date.now()
      };
      var updated = galleryItems.concat([item]);
      if (!saveGallery(updated)) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F This browser could not save the build. Storage may be full or unavailable.', 'error');
        return;
      }
      upd('_galleryRefresh', Date.now());
      if (ctx.addToast) ctx.addToast('\uD83D\uDCBE Build saved: ' + name, 'success');
      if (soundEnabled) sfxSave();
      if (announceToSR) announceToSR('Build saved: ' + name + '. ' + blocks.length + ' blocks.');
    };

    var loadBuild = function (item) {
      if (!requireLiveBuild()) return;
      var loadedBlocks = sanitizeArchBlocks(item && item.blocks);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        return Object.assign({}, p, { archStudio: Object.assign({}, a,
          getArchReplacementViewState(loadedBlocks, a.editLayer),
          { blocks: loadedBlocks, undoStack: pushUndoFromState(a), redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDCE5 Loaded: ' + item.name, 'info');
      if (soundEnabled) sfxLoad();
      if (announceToSR) announceToSR('Loaded build: ' + item.name + '. ' + loadedBlocks.length + ' blocks.');
    };

    var deleteBuild = function (id) {
      var updated = galleryItems.filter(function (g) { return g.id !== id; });
      if (!saveGallery(updated)) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F The saved build could not be removed from browser storage.', 'error');
        return;
      }
      upd('_galleryRefresh', Date.now());
      if (ctx.addToast) ctx.addToast('\uD83D\uDDD1\uFE0F Build deleted', 'info');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Template System ──
    // ══════════════════════════════════════════════════════════════
    var templates = makeTemplates();

    var loadTemplate = function (tpl) {
      if (!requireLiveBuild()) return;
      var newBlocks = (tpl.blocks)();
      newBlocks = sanitizeArchBlocks(newBlocks);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        return Object.assign({}, p, { archStudio: Object.assign({}, a,
          getArchReplacementViewState(newBlocks, a.editLayer),
          { blocks: newBlocks, undoStack: pushUndoFromState(a), redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDCC2 Template loaded: ' + tpl.name, 'info');
      if (soundEnabled) sfxLoad();
      if (announceToSR) announceToSR('Template loaded: ' + tpl.name + '. ' + newBlocks.length + ' blocks.');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Mirror / Symmetry ──
    // ══════════════════════════════════════════════════════════════
    var mirrorBuildX = function () {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var mergeResult = mirrorArchBlocksWithinLimit(blocks, 'x');
      var added = mergeResult.added;
      if (!added) {
        if (blocks.length >= ARCH_MAX_BLOCKS && ctx.addToast) ctx.addToast('The build already has the maximum of ' + ARCH_MAX_BLOCKS + ' blocks.', 'info');
        else if (ctx.addToast) ctx.addToast('The build is already mirrored across its X centerline.', 'info');
        return;
      }
      var transaction = { committed: false, reported: false, added: 0, limited: false };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (ctx.addToast) ctx.addToast('\uD83E\uDE9E Mirrored along X axis! +' + transaction.added + ' blocks' + (transaction.limited ? '; maximum reached.' : ''), 'info');
        if (soundEnabled) sfxPlace();
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var liveResult = mirrorArchBlocksWithinLimit(getArchRuntimeBlocks(a.blocks), 'x');
        if (!liveResult.added) return p;
        transaction.committed = true;
        transaction.added = liveResult.added;
        transaction.limited = liveResult.skipped > 0;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: liveResult.blocks, undoStack: pushUndoFromState(a), redoStack: [], quakeResult: null }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    var mirrorBuildZ = function () {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var mergeResult = mirrorArchBlocksWithinLimit(blocks, 'z');
      var added = mergeResult.added;
      if (!added) {
        if (blocks.length >= ARCH_MAX_BLOCKS && ctx.addToast) ctx.addToast('The build already has the maximum of ' + ARCH_MAX_BLOCKS + ' blocks.', 'info');
        else if (ctx.addToast) ctx.addToast('The build is already mirrored across its Z centerline.', 'info');
        return;
      }
      var transaction = { committed: false, reported: false, added: 0, limited: false };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (ctx.addToast) ctx.addToast('\uD83E\uDE9E Mirrored along Z axis! +' + transaction.added + ' blocks' + (transaction.limited ? '; maximum reached.' : ''), 'info');
        if (soundEnabled) sfxPlace();
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var liveResult = mirrorArchBlocksWithinLimit(getArchRuntimeBlocks(a.blocks), 'z');
        if (!liveResult.added) return p;
        transaction.committed = true;
        transaction.added = liveResult.added;
        transaction.limited = liveResult.skipped > 0;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: liveResult.blocks, undoStack: pushUndoFromState(a), redoStack: [], quakeResult: null }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── AI Architect Advisor ──
    // ══════════════════════════════════════════════════════════════
    var askAIArchitect = function () {
      if (!callGemini || aiLoading || (window.__archAiPendingReqId && window.__archAiPendingSignature === currentBuildSignature)) return;
      // Request-ID guard: prevents stale advice from overwriting newer
      // context if student edits the build while a fetch is mid-flight.
      window.__archAiReqId = (window.__archAiReqId || 0) + 1;
      var thisReqId = window.__archAiReqId;
      var requestBuildSignature = currentBuildSignature;
      window.__archAiPendingReqId = thisReqId;
      window.__archAiPendingSignature = requestBuildSignature;
      upd({ aiLoading: true, showAI: true, aiRequestId: thisReqId, aiRequestBuildSignature: requestBuildSignature });
      if (announceToSR) announceToSR('AI Architect is analyzing this build.');

      var desc = totalBlocks === 0
        ? 'The student has not placed any blocks yet.'
        : 'The student built a structure: ' + totalBlocks + ' blocks, dimensions ' + buildW + '\u00D7' + buildD + '\u00D7' + buildH +
          ', stability ' + analysis.stability + '%, symmetry ' + analysis.symmetry + '%, ' + analysis.materialCount + ' material(s), ' +
          analysis.unsupported + ' floating blocks, shapes used: ' + Object.keys(shapeCount).join(', ') +
          '. Total weight: ' + analysis.totalWeight + 't. Volume: ' + totalVolume + ' u\u00B3.';

      var prompt = 'You are an AI Architect advisor in a kids\' educational building game. ' + desc +
        ' Give 2-3 SHORT, encouraging tips (1-2 sentences each) about how to improve the structure. ' +
        'Include one real-world architecture fact. Use emoji. Keep it fun and educational for ages 8-14. ' +
        'Return JSON: { "tips": ["tip1", "tip2", "tip3"], "funFact": "..." }';

      var finishAiRequest = function (advice) {
        if (thisReqId !== window.__archAiReqId) return;
        if (window.__archAiPendingReqId === thisReqId) {
          window.__archAiPendingReqId = 0;
          window.__archAiPendingSignature = '';
        }
        upd({ aiAdvice: advice, aiAdviceBuildSignature: requestBuildSignature, aiRequestId: 0, aiRequestBuildSignature: '', aiLoading: false });
        if (announceToSR) announceToSR(advice.indexOf('\u26A0\uFE0F') === 0 ? 'AI Architect could not finish. Try again later.' : 'AI Architect advice is ready.');
      };
      var request;
      try {
        request = callGemini(prompt, true, false, 0.8);
      } catch (e) {
        finishAiRequest('\u26A0\uFE0F Could not reach AI advisor. Try again later!');
        return;
      }
      Promise.resolve(request).then(function (resp) {
        if (thisReqId !== window.__archAiReqId) return;
        try {
          var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g, '').replace(/```/g, '').trim()) : resp;
          var advice = '';
          if (parsed.tips) parsed.tips.forEach(function (t, i) { advice += (i > 0 ? '\n' : '') + t; });
          if (parsed.funFact) advice += '\n\n\uD83C\uDFDB\uFE0F ' + parsed.funFact;
          finishAiRequest(advice);
        } catch (e) {
          finishAiRequest(typeof resp === 'string' ? resp : 'Ask me again!');
        }
      }).catch(function () {
        finishAiRequest('\u26A0\uFE0F Could not reach AI advisor. Try again later!');
      });
    };

    // ══════════════════════════════════════════════════════════════
    // ── Earthquake Simulator ──
    // ══════════════════════════════════════════════════════════════
    var quakeIntensity = d.quakeIntensity || 5; // 1-10 Richter-ish scale
    var storedQuakeResult = d.quakeResult || null;
    var quakeResult = storedQuakeResult && storedQuakeResult.buildSignature === currentBuildSignature ? storedQuakeResult : null;

    var runEarthquake = function () {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var quakeSeed = ((Math.random() * 4294967296) >>> 0) || 0x6d2b79f5;
      var transaction = { committed: false, reported: false, result: null };
      var report = function () {
        if (!transaction.committed || transaction.reported || !transaction.result) return;
        transaction.reported = true;
        var result = transaction.result;
        if (ctx.addToast) ctx.addToast('\uD83C\uDF0B Earthquake ' + result.intensity + '/10: ' + result.rating + ' (' + result.fallen + ' blocks fell)', result.pct >= 70 ? 'success' : 'error');
        playTone(80, 0.4, 'sawtooth', 0.15);
        setTimeout(function () { playTone(60, 0.5, 'sawtooth', 0.12); }, 200);
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var current = getArchRuntimeBlocks(a.blocks);
        if (!current.length) return p;
        var result = simulateArchEarthquake(current, quakeIntensity, quakeSeed);
        var survivors = result.blocks;
        var restoredEditLayer = nearestArchOccupiedLayer(survivors, a.editLayer);
        var restoredViewLayer = a.viewLayer != null && a.viewLayer >= 0 ? nearestArchOccupiedLayer(survivors, a.viewLayer) : a.viewLayer;
        transaction.committed = true;
        transaction.result = result;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: survivors, undoStack: pushUndoFromState(a), redoStack: [], selectedBlockKey: '',
          editLayer: restoredEditLayer, viewLayer: restoredViewLayer, gridCursorX: null, gridCursorZ: null,
          quakeResult: { fallen: result.fallen, survived: result.survived, pct: result.pct, rating: result.rating, intensity: result.intensity, buildSignature: getArchBuildSignature(survivors) }
        }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Screenshot to PNG ──
    // ══════════════════════════════════════════════════════════════
    var takeScreenshot = function () {
      var canvas = document.getElementById('arch-studio-canvas');
      if (!canvas) { if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Canvas not ready', 'error'); return; }
      try {
        var url = ArchGL.capturePng();
        if (!url) throw new Error('renderer-not-ready');
        var a = document.createElement('a');
        a.href = url;
        a.download = 'archstudio_screenshot_' + Date.now() + '.png';
        a.click();
        if (ctx.addToast) ctx.addToast('\uD83D\uDCF8 Screenshot saved!', 'success');
      } catch (e) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Screenshot failed (canvas security)', 'error');
      }
    };

    // ══════════════════════════════════════════════════════════════
    // ── Bill of Materials ──
    // ══════════════════════════════════════════════════════════════
    var showBOM = d.showBOM || false;
    var bomByMaterial = {};
    var bomByShape = {};
    blocks.forEach(function (b) {
      var mid = b.material || 'stone';
      var sid = b.shape || 'block';
      bomByMaterial[mid] = (bomByMaterial[mid] || 0) + 1;
      bomByShape[sid] = (bomByShape[sid] || 0) + 1;
    });
    var bomMaterialEntries = Object.keys(bomByMaterial).map(function (mid) {
      var mat = materials.find(function (m) { return m.id === mid; }) || { icon: '', label: mid, cost: 5 };
      return { id: mid, icon: mat.icon, label: mat.label, count: bomByMaterial[mid], cost: bomByMaterial[mid] * mat.cost };
    }).sort(function (a, b) { return b.count - a.count; });
    var bomShapeEntries = Object.keys(bomByShape).map(function (sid) {
      var sh = shapes.find(function (s) { return s.id === sid; }) || { icon: '', label: sid };
      return { id: sid, icon: sh.icon, label: sh.label, count: bomByShape[sid] };
    }).sort(function (a, b) { return b.count - a.count; });

    // ══════════════════════════════════════════════════════════════
    // ── Real-World Scale Calculator ──
    // ══════════════════════════════════════════════════════════════
    var BLOCK_METERS = 1; // 1 block = 1 meter
    var realW = buildW * BLOCK_METERS;
    var realD = buildD * BLOCK_METERS;
    var realH = buildH * BLOCK_METERS;
    var realWFt = (realW * 3.281).toFixed(1);
    var realHFt = (realH * 3.281).toFixed(1);
    var realVolM3 = parseFloat(totalVolume) * (BLOCK_METERS * BLOCK_METERS * BLOCK_METERS);
    var realWeightTons = parseFloat(analysis.totalWeight) * 0.001; // rough
    var scaleComparisons = [];
    if (realH >= 1 && realH < 3) scaleComparisons.push('About the height of a door');
    else if (realH >= 3 && realH < 6) scaleComparisons.push('Height of a 1-story building');
    else if (realH >= 6 && realH < 15) scaleComparisons.push('Height of a 2-4 story building');
    else if (realH >= 15 && realH < 50) scaleComparisons.push('Height of a large apartment building');
    else if (realH >= 50) scaleComparisons.push('Skyscraper territory!');

    // ══════════════════════════════════════════════════════════════
    // ── Build Sharing (Import/Export JSON) ──
    // ══════════════════════════════════════════════════════════════
    var showShare = d.showShare || false;
    var shareCode = d.shareCodeBuildSignature === currentBuildSignature ? (d.shareCode || '') : '';

    var exportShareCode = function () {
      if (blocks.length === 0) return;
      try {
        var exportBlocks = sanitizeArchBlocks(blocks);
        var data = { v: 1, b: exportBlocks.map(function (b) { return [b.x, b.y, b.z, b.shape, b.material, b.color, b.rotation]; }) };
        var json = JSON.stringify(data);
        var code = btoa(json);
        upd({ shareCode: code, shareCodeBuildSignature: getArchBuildSignature(exportBlocks), showShare: true });
        // Copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).then(function () {
            if (ctx.addToast) ctx.addToast('\uD83D\uDCCB Share code copied to clipboard!', 'success');
          }).catch(function () {
            if (ctx.addToast) ctx.addToast('\uD83D\uDCE4 Share code generated. Copy it from the Share panel.', 'info');
          });
        } else {
          if (ctx.addToast) ctx.addToast('\uD83D\uDCE4 Share code generated! Copy it below.', 'info');
        }
      } catch (e) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Export failed', 'error');
      }
    };

    var importShareCode = function (code) {
      if (!requireLiveBuild()) return;
      if (!code) return;
      try {
        var trimmedCode = String(code).trim();
        if (!trimmedCode || trimmedCode.length > 500000) throw new Error('Invalid size');
        var json = atob(trimmedCode);
        var data = JSON.parse(json);
        if (!data || data.v !== 1 || !Array.isArray(data.b) || data.b.length > ARCH_MAX_BLOCKS) throw new Error('Invalid');
        var decoded = data.b.map(function (arr) {
          if (!Array.isArray(arr)) return null;
          return { x: arr[0], y: arr[1], z: arr[2], shape: arr[3] || 'block', material: arr[4] || 'stone', color: arr[5] || '#94a3b8', rotation: arr[6] || 0 };
        });
        var imported = sanitizeArchBlocks(decoded);
        if (data.b.length && !imported.length) throw new Error('No valid blocks');
        var skipped = data.b.length - imported.length;
        ctx.setToolData(function (p) {
          var a = Object.assign({}, p.archStudio || {});
          if (a.showReplay) return p;
          return Object.assign({}, p, { archStudio: Object.assign({}, a,
            getArchReplacementViewState(imported, a.editLayer),
            { blocks: imported, undoStack: pushUndoFromState(a), redoStack: [], importCode: '' }) });
        });
        if (ctx.addToast) ctx.addToast('\uD83D\uDCE5 Imported ' + imported.length + ' blocks' + (skipped ? '; skipped ' + skipped + ' invalid or duplicate entr' + (skipped === 1 ? 'y' : 'ies') : '') + '.', skipped ? 'info' : 'success');
        if (soundEnabled) sfxLoad();
        if (announceToSR) announceToSR('Imported ' + imported.length + ' blocks.' + (skipped ? ' Skipped ' + skipped + ' invalid or duplicate entries.' : ''));
      } catch (e) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Invalid share code!', 'error');
      }
    };

    // ══════════════════════════════════════════════════════════════
    // ── Architecture Styles Guide ──
    // ══════════════════════════════════════════════════════════════
    var showStyleGuide = d.showStyleGuide || false;
    var archStyles = [
      { name: t('stem.archstudio.classical', 'Classical'), icon: '\uD83C\uDFDB\uFE0F', era: '800 BCE \u2013 500 CE', features: 'Columns, symmetry, pediments, marble. Think Parthenon, Colosseum.',
        tips: 'Use columns + arches, marble material, high symmetry' },
      { name: t('stem.archstudio.gothic', 'Gothic'), icon: '\u26EA', era: '1100 \u2013 1500 CE', features: 'Pointed arches, tall spires, flying buttresses, stained glass.',
        tips: 'Build tall! Use arches, glass windows, stone walls' },
      { name: t('stem.archstudio.art_deco', 'Art Deco'), icon: '\uD83C\uDFD9\uFE0F', era: '1920s \u2013 1940s', features: 'Geometric shapes, stepped facades, metallic accents, bold symmetry.',
        tips: 'Use metal + glass, stepped pyramid shapes, strict symmetry' },
      { name: t('stem.archstudio.modern', 'Modern'), icon: '\uD83C\uDFE2', era: '1920s \u2013 present', features: 'Clean lines, glass curtain walls, open plans, "less is more".',
        tips: 'Use glass + metal, flat roofs (slabs), minimal decoration' },
      { name: t('stem.archstudio.japanese', 'Japanese'), icon: '\u26E9\uFE0F', era: 'Traditional', features: 'Wooden frames, curved roofs, harmony with nature, tatami proportions.',
        tips: 'Use wood, roof shapes, low profiles, symmetry' },
      { name: t('stem.archstudio.brutalist', 'Brutalist'), icon: '\uD83D\uDDFF', era: '1950s \u2013 1970s', features: 'Raw concrete, massive forms, geometric repetition, fortress-like.',
        tips: 'Use stone only, blocky shapes, L-beams, no decoration' }
    ];

    // ══════════════════════════════════════════════════════════════
    // ── Copy Region (Duplicate + Offset) ──
    // ══════════════════════════════════════════════════════════════
    var duplicateBuild = function (dx, dy, dz) {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var mergeResult = duplicateArchBlocksWithinLimit(blocks, dx, dy, dz);
      var added = mergeResult.added;
      if (!added) {
        if (blocks.length >= ARCH_MAX_BLOCKS && ctx.addToast) ctx.addToast('The build already has the maximum of ' + ARCH_MAX_BLOCKS + ' blocks.', 'info');
        else if (ctx.addToast) ctx.addToast('\u26A0\uFE0F No blocks could be copied inside the build limits.', 'info');
        return;
      }
      var transaction = { committed: false, reported: false, added: 0, limited: false };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (ctx.addToast) ctx.addToast('\uD83D\uDCCB Duplicated +' + transaction.added + ' blocks (offset ' + dx + ',' + dy + ',' + dz + ')' + (transaction.limited ? '; maximum reached.' : ''), 'info');
        if (soundEnabled) sfxPlace();
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var liveResult = duplicateArchBlocksWithinLimit(getArchRuntimeBlocks(a.blocks), dx, dy, dz);
        if (!liveResult.added) return p;
        transaction.committed = true;
        transaction.added = liveResult.added;
        transaction.limited = liveResult.skipped > 0;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: liveResult.blocks, undoStack: pushUndoFromState(a), redoStack: [], quakeResult: null }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Construction Phase Viewer ──
    // ══════════════════════════════════════════════════════════════
    var showPhases = d.showPhases || false;
    var phases = [];
    if (totalBlocks > 0) {
      // Group blocks by Y level
      var byY = {};
      blocks.forEach(function (b) { if (!byY[b.y]) byY[b.y] = []; byY[b.y].push(b); });
      var yLevels = Object.keys(byY).map(Number).sort(function (a, b) { return a - b; });
      var phaseNames = ['Foundation', 'Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Upper Floors', 'Roof Structure', 'Crown/Spire'];
      yLevels.forEach(function (y, i) {
        var phaseName = i < phaseNames.length ? phaseNames[i] : 'Level ' + (i + 1);
        var phaseBlocks = byY[y];
        var matBreakdown = {};
        phaseBlocks.forEach(function (b) { var mid = b.material || 'stone'; matBreakdown[mid] = (matBreakdown[mid] || 0) + 1; });
        phases.push({ name: phaseName, y: y, count: phaseBlocks.length, mats: matBreakdown, cumulative: blocks.filter(function (b) { return b.y <= y; }).length });
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ── Keyboard Shortcuts ──
    // ══════════════════════════════════════════════════════════════
    // Note: Keyboard event handling requires a side-effect (addEventListener).
    // We expose the handlers on window so the main module's useEffect can bind them.
    window._archStudioKeys = {
      undo: doUndo,
      redo: doRedo,
      shapes: shapes.map(function (s) { return s.id; }),
      setShape: function (id) { upd('activeShape', id); },
      modes: modes.map(function (m) { return m.id; }),
      setMode: function (id) {
        var chosen = modes.find(function (m) { return m.id === id; });
        if (!chosen) return;
        upd('mode', chosen.id);
        if (announceToSR) announceToSR(chosen.label + ' mode activated.');
      },
      screenshot: takeScreenshot
    };

    // ══════════════════════════════════════════════════════════════
    // ── Block Statistics (for chart rendering) ──
    // ══════════════════════════════════════════════════════════════
    var showStats = d.showStats || false;
    var maxMatCount = Math.max.apply(null, bomMaterialEntries.map(function (e) { return e.count; }).concat([1]));
    var maxShapeCount = Math.max.apply(null, bomShapeEntries.map(function (e) { return e.count; }).concat([1]));

    // ══════════════════════════════════════════════════════════════
    // ── Gravity Simulation (drop floating blocks) ──
    // ══════════════════════════════════════════════════════════════
    var applyGravity = function () {
      if (!requireLiveBuild()) return;
      if (blocks.length === 0) return;
      var transaction = { committed: false, reported: false, moved: 0, alreadySettled: false };
      var report = function () {
        if (transaction.reported) return;
        if (!transaction.committed && !transaction.alreadySettled) return;
        transaction.reported = true;
        if (transaction.alreadySettled) {
          if (ctx.addToast) ctx.addToast('\u2705 Every block is already settled on the ground or a support.', 'info');
          return;
        }
        if (ctx.addToast) ctx.addToast('\u2B07\uFE0F Gravity applied! ' + transaction.moved + ' block' + (transaction.moved !== 1 ? 's' : '') + ' dropped.', 'info');
        if (announceToSR) announceToSR('Gravity applied. ' + transaction.moved + ' block' + (transaction.moved !== 1 ? 's' : '') + ' dropped to the ground or nearest support.');
        playTone(200, 0.3, 'sine', 0.1);
        setTimeout(function () { playTone(120, 0.4, 'sine', 0.08); }, 150);
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var current = getArchRuntimeBlocks(a.blocks);
        if (!current.length) return p;
        var result = settleArchBlocks(current);
        if (!result.moved) { transaction.alreadySettled = true; return p; }
        var restoredEditLayer = nearestArchOccupiedLayer(result.blocks, a.editLayer);
        var restoredViewLayer = a.viewLayer != null && a.viewLayer >= 0 ? nearestArchOccupiedLayer(result.blocks, a.viewLayer) : a.viewLayer;
        transaction.committed = true;
        transaction.moved = result.moved;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: result.blocks, undoStack: pushUndoFromState(a), redoStack: [], selectedBlockKey: '', quakeResult: null,
          editLayer: restoredEditLayer, viewLayer: restoredViewLayer, gridCursorX: null, gridCursorZ: null
        }) });
      });
      if (transaction.committed || transaction.alreadySettled) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Random Build Generator ──
    // ══════════════════════════════════════════════════════════════
    var showRandomGen = d.showRandomGen || false;
    var randomPresets = [
      { id: 'tower', name: t('stem.archstudio.random_tower', 'Random Tower'), icon: '\uD83C\uDFD7\uFE0F', desc: t('stem.archstudio.tall_narrow_structure', 'Tall narrow structure') },
      { id: 'house', name: t('stem.archstudio.random_house', 'Random House'), icon: '\uD83C\uDFE0', desc: t('stem.archstudio.simple_house_with_roof', 'Simple house with roof') },
      { id: 'wall', name: t('stem.archstudio.random_wall', 'Random Wall'), icon: '\uD83E\uDDF1', desc: t('stem.archstudio.defensive_wall_segment', 'Defensive wall segment') },
      { id: 'pyramid', name: t('stem.archstudio.random_pyramid', 'Random Pyramid'), icon: '\uD83D\uDD3A', desc: t('stem.archstudio.layered_pyramid', 'Layered pyramid') },
      { id: 'castle', name: t('stem.archstudio.random_castle', 'Random Castle'), icon: '\uD83C\uDFF0', desc: t('stem.archstudio.castle_with_towers', 'Castle with towers') },
      { id: 'bridge', name: t('stem.archstudio.random_bridge', 'Random Bridge'), icon: '\uD83C\uDF09', desc: t('stem.archstudio.bridge_with_arches', 'Bridge with arches') }
    ];

    var generateRandom = function (presetId) {
      if (!requireLiveBuild()) return;
      var gen = [];
      var matPool = ['stone', 'brick', 'wood', 'marble', 'metal'];
      var rMat = function () { return matPool[Math.floor(Math.random() * matPool.length)]; };
      var rColor = function (mid) { return matColorLookup[mid] || '#94a3b8'; };

      if (presetId === 'tower') {
        var tw = 2 + Math.floor(Math.random() * 2), td = tw, th = 6 + Math.floor(Math.random() * 8);
        var tMat = rMat();
        for (var ty = 0; ty < th; ty++) for (var tx = 0; tx < tw; tx++) for (var tz = 0; tz < td; tz++) {
          if (ty < th - 1 && tx > 0 && tx < tw - 1 && tz > 0 && tz < td - 1) continue;
          gen.push({ x: tx, y: ty, z: tz, shape: ty === th - 1 ? 'slab' : 'block', material: tMat, color: rColor(tMat) });
        }
      } else if (presetId === 'house') {
        var hw = 4 + Math.floor(Math.random() * 3), hd = 3 + Math.floor(Math.random() * 2);
        for (var hx = 0; hx < hw; hx++) for (var hz = 0; hz < hd; hz++) gen.push({ x: hx, y: 0, z: hz, shape: 'slab', material: 'stone', color: rColor('stone') });
        for (var wy = 1; wy <= 2; wy++) {
          for (var wx = 0; wx < hw; wx++) { gen.push({ x: wx, y: wy, z: 0, shape: 'block', material: 'brick', color: rColor('brick') }); gen.push({ x: wx, y: wy, z: hd - 1, shape: 'block', material: 'brick', color: rColor('brick') }); }
          for (var wz = 1; wz < hd - 1; wz++) { gen.push({ x: 0, y: wy, z: wz, shape: 'block', material: 'brick', color: rColor('brick') }); gen.push({ x: hw - 1, y: wy, z: wz, shape: 'block', material: 'brick', color: rColor('brick') }); }
        }
        gen = gen.filter(function (b) { return !(b.x === Math.floor(hw / 2) && b.z === 0 && b.y === 1); });
        gen.push({ x: Math.floor(hw / 2), y: 1, z: 0, shape: 'door', material: 'wood', color: rColor('wood') });
        for (var rx = 0; rx < hw; rx++) for (var rz = 0; rz < hd; rz++) gen.push({ x: rx, y: 3, z: rz, shape: 'roof', material: 'brick', color: '#b45309' });
      } else if (presetId === 'wall') {
        var ww = 8 + Math.floor(Math.random() * 6), wh = 3 + Math.floor(Math.random() * 3);
        var wMat = Math.random() > 0.5 ? 'stone' : 'brick';
        for (var yx = 0; yx < ww; yx++) for (var yy = 0; yy < wh; yy++) gen.push({ x: yx, y: yy, z: 0, shape: 'block', material: wMat, color: rColor(wMat) });
        gen.push({ x: 0, y: wh, z: 0, shape: 'slab', material: wMat, color: rColor(wMat) });
        gen.push({ x: ww - 1, y: wh, z: 0, shape: 'slab', material: wMat, color: rColor(wMat) });
      } else if (presetId === 'pyramid') {
        var ps = 5 + Math.floor(Math.random() * 4);
        for (var py = 0; py < Math.ceil(ps / 2); py++) {
          var layerStart = py, layerEnd = ps - 1 - py;
          for (var px = layerStart; px <= layerEnd; px++) for (var pz = layerStart; pz <= layerEnd; pz++)
            gen.push({ x: px, y: py, z: pz, shape: py === Math.ceil(ps / 2) - 1 ? 'pyramid' : 'block', material: 'stone', color: rColor('stone') });
        }
      } else if (presetId === 'castle') {
        // Base platform
        for (var cx = 0; cx < 7; cx++) for (var cz = 0; cz < 7; cz++) gen.push({ x: cx, y: 0, z: cz, shape: 'slab', material: 'stone', color: rColor('stone') });
        // Walls
        for (var cy = 1; cy <= 3; cy++) {
          for (var cwx = 0; cwx < 7; cwx++) { gen.push({ x: cwx, y: cy, z: 0, shape: 'block', material: 'stone', color: rColor('stone') }); gen.push({ x: cwx, y: cy, z: 6, shape: 'block', material: 'stone', color: rColor('stone') }); }
          for (var cwz = 1; cwz < 6; cwz++) { gen.push({ x: 0, y: cy, z: cwz, shape: 'block', material: 'stone', color: rColor('stone') }); gen.push({ x: 6, y: cy, z: cwz, shape: 'block', material: 'stone', color: rColor('stone') }); }
        }
        // Corner towers
        [[0,0],[0,6],[6,0],[6,6]].forEach(function (c) {
          gen.push({ x: c[0], y: 4, z: c[1], shape: 'column', material: 'stone', color: rColor('stone') });
          gen.push({ x: c[0], y: 5, z: c[1], shape: 'pyramid', material: 'stone', color: rColor('stone') });
        });
        // Gate
        gen = gen.filter(function (b) { return !(b.x === 3 && b.z === 0 && b.y === 1); });
        gen.push({ x: 3, y: 1, z: 0, shape: 'arch', material: 'stone', color: rColor('stone') });
      } else if (presetId === 'bridge') {
        var bl = 8 + Math.floor(Math.random() * 4);
        for (var bx = 0; bx < bl; bx++) gen.push({ x: bx, y: 2, z: 0, shape: 'slab', material: 'stone', color: rColor('stone') });
        gen.push({ x: 0, y: 0, z: 0, shape: 'column', material: 'stone', color: rColor('stone') }); gen.push({ x: 0, y: 1, z: 0, shape: 'column', material: 'stone', color: rColor('stone') });
        gen.push({ x: bl - 1, y: 0, z: 0, shape: 'column', material: 'stone', color: rColor('stone') }); gen.push({ x: bl - 1, y: 1, z: 0, shape: 'column', material: 'stone', color: rColor('stone') });
        var midB = Math.floor(bl / 2);
        gen.push({ x: midB, y: 0, z: 0, shape: 'column', material: 'stone', color: rColor('stone') }); gen.push({ x: midB, y: 1, z: 0, shape: 'arch', material: 'stone', color: rColor('stone') });
        gen.push({ x: 0, y: 3, z: 0, shape: 'column', material: 'metal', color: rColor('metal') }); gen.push({ x: bl - 1, y: 3, z: 0, shape: 'column', material: 'metal', color: rColor('metal') });
      }

      gen = sanitizeArchBlocks(gen);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        return Object.assign({}, p, { archStudio: Object.assign({}, a,
          getArchReplacementViewState(gen, a.editLayer),
          { blocks: gen, undoStack: pushUndoFromState(a), redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83C\uDFB2 Generated ' + gen.length + ' blocks!', 'success');
      if (soundEnabled) sfxLoad();
    };

    // ══════════════════════════════════════════════════════════════
    // ── Custom Color Palette ──
    // ══════════════════════════════════════════════════════════════
    var showColorPicker = d.showColorPicker || false;
    var customColor = d.customColor || activeColor;
    var colorSwatches = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
      '#d946ef', '#ec4899', '#f43f5e', '#78716c', '#94a3b8', '#f1f5f9',
      '#1e293b', '#0f172a', '#fbbf24', '#fb923c', '#4ade80', '#38bdf8'
    ];

    // ══════════════════════════════════════════════════════════════
    // ── Cross-Section Slicer (Z-depth) ──
    // ══════════════════════════════════════════════════════════════
    var sliceBlocks = sliceZSelected ? blocks.filter(function (b) { return b.z === sliceZ; }) : [];
    var sliceZLevels = [];
    if (totalBlocks > 0) {
      var zSet = {};
      blocks.forEach(function (b) { zSet[b.z] = true; });
      sliceZLevels = Object.keys(zSet).map(Number).sort(function (a, b) { return a - b; });
    }

    // ══════════════════════════════════════════════════════════════
    // ── Structural Load Heatmap ──
    // ══════════════════════════════════════════════════════════════
    var blockLoads = showHeatmap ? archBlockLoads : {};
    var maxLoad = showHeatmap ? archMaxLoad : 0;

    // ══════════════════════════════════════════════════════════════
    // ── Time-Lapse Replay ──
    // ══════════════════════════════════════════════════════════════
    var replayFrames = (undoStack || []).length;

    var startReplay = function () {
      if (!undoStack || undoStack.length === 0) { if (ctx.addToast) ctx.addToast('\u26A0\uFE0F No undo history to replay!', 'error'); return; }
      upd({ showReplay: true, replayStep: 0, selectedBlockKey: '' });
    };

    var stepReplay = function (dir) {
      var maxStep = replayFrames; // includes current state as last frame
      var next = Math.max(0, Math.min(maxStep, replayStep + dir));
      upd('replayStep', next);
    };

    var replayBlocks = archReplayFrame;
    var replayLabel = replayStep >= 0 ? 'Step ' + (replayStep + 1) + '/' + (replayFrames + 1) : '';

    var exitReplay = function () { upd({ showReplay: false, replayStep: -1 }); };

    // ══════════════════════════════════════════════════════════════
    // ── Block Search / Filter ──
    // ══════════════════════════════════════════════════════════════
    var showFilter = d.showFilter || false;
    var filteredBlocks = blocks.filter(function (b) {
      if (filterMaterial && (b.material || 'stone') !== filterMaterial) return false;
      if (filterShape && (b.shape || 'block') !== filterShape) return false;
      return true;
    });
    var filterActive = !!(filterMaterial || filterShape);
    var filterCount = filterActive ? filteredBlocks.length : totalBlocks;

    var deleteFiltered = function () {
      if (!requireLiveBuild()) return;
      if (!filterActive || filteredBlocks.length === 0) return;
      var requestedMaterial = filterMaterial;
      var requestedShape = filterShape;
      var transaction = { committed: false, reported: false, removed: 0 };
      var report = function () {
        if (!transaction.committed || transaction.reported) return;
        transaction.reported = true;
        if (ctx.addToast) ctx.addToast('\uD83D\uDDD1\uFE0F Removed ' + transaction.removed + ' matching blocks', 'info');
      };
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        if (a.showReplay) return p;
        var current = getArchRuntimeBlocks(a.blocks);
        var remaining = current.filter(function (b) {
          if (requestedMaterial && (b.material || 'stone') !== requestedMaterial) return true;
          if (requestedShape && (b.shape || 'block') !== requestedShape) return true;
          return false;
        });
        if (remaining.length === current.length) return p;
        var restoredEditLayer = nearestArchOccupiedLayer(remaining, a.editLayer);
        var restoredViewLayer = a.viewLayer != null && a.viewLayer >= 0 ? nearestArchOccupiedLayer(remaining, a.viewLayer) : a.viewLayer;
        transaction.committed = true;
        transaction.removed = current.length - remaining.length;
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: remaining, undoStack: pushUndoFromState(a), redoStack: [], selectedBlockKey: '', quakeResult: null,
          editLayer: restoredEditLayer, viewLayer: restoredViewLayer, gridCursorX: null, gridCursorZ: null,
          filterMaterial: '', filterShape: '', showSlice: false, sliceZSelected: false
        }) });
      });
      if (transaction.committed) report(); else setTimeout(report, 0);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Achievement Badges ──
    // ══════════════════════════════════════════════════════════════
    var showBadges = d.showBadges || false;
    var earnedBadges = d.earnedBadges && typeof d.earnedBadges === 'object' && !Array.isArray(d.earnedBadges) ? d.earnedBadges : {};
    var badges = [
      { id: 'first_block', icon: '\uD83E\uDDF1', name: t('stem.archstudio.first_block', 'First Block'), desc: t('stem.archstudio.place_your_very_first_block', 'Place your very first block'), check: function () { return totalBlocks >= 1; } },
      { id: 'hundred_club', icon: '\uD83D\uDCAF', name: t('stem.archstudio.100_club', '100 Club'), desc: t('stem.archstudio.have_100_blocks_in_one_build', 'Have 100+ blocks in one build'), check: function () { return totalBlocks >= 100; } },
      { id: 'all_shapes', icon: '\u2B50', name: t('stem.archstudio.shape_master', 'Shape Master'), desc: t('stem.archstudio.use_all_12_shape_types_in_one_build', 'Use all 12 shape types in one build'), check: function () { return Object.keys(shapeCount).length >= 12; } },
      { id: 'all_mats', icon: '\uD83C\uDFA8', name: t('stem.archstudio.material_maven', 'Material Maven'), desc: t('stem.archstudio.use_all_6_materials_in_one_build', 'Use all 6 materials in one build'), check: function () { return analysis.materialCount >= 6; } },
      { id: 'sky_high', icon: '\uD83D\uDE80', name: t('stem.archstudio.sky_high', 'Sky High'), desc: t('stem.archstudio.build_20_blocks_tall', 'Build 20+ blocks tall'), check: function () { return buildH >= 20; } },
      { id: 'rock_solid', icon: '\uD83E\uDEA8', name: t('stem.archstudio.rock_solid', 'Rock Solid'), desc: t('stem.archstudio.50_blocks_with_95_stability', '50+ blocks with 95%+ stability'), check: function () { return totalBlocks >= 50 && analysis.stability >= 95; } },
      { id: 'perfect_sym', icon: '\uD83E\uDE9E', name: t('stem.archstudio.perfectly_balanced', 'Perfectly Balanced'), desc: t('stem.archstudio.symmetry_score_100', 'Symmetry score 100%'), check: function () { return totalBlocks >= 10 && analysis.symmetry >= 100; } },
      { id: 'quake_proof', icon: '\uD83C\uDF0B', name: 'Quake-Proof', desc: t('stem.archstudio.survive_intensity_10_earthquake', 'Survive intensity 10 earthquake'), check: function () { return quakeResult && quakeResult.intensity >= 10 && quakeResult.pct >= 80; } },
      { id: 'five_saves', icon: '\uD83D\uDCBE', name: t('stem.archstudio.collector', 'Collector'), desc: t('stem.archstudio.save_5_builds_to_gallery', 'Save 5+ builds to gallery'), check: function () { return galleryItems.length >= 5; } },
      { id: 'challenger', icon: '\uD83C\uDFC6', name: t('stem.archstudio.challenger', 'Challenger'), desc: t('stem.archstudio.complete_all_10_challenges', 'Complete all 10 challenges'), check: function () { return completedCount >= 10; } },
      { id: 'mega_build', icon: '\uD83C\uDFF0', name: t('stem.archstudio.mega_build', 'Mega Build'), desc: t('stem.archstudio.200_blocks_in_one_build', '200+ blocks in one build'), check: function () { return totalBlocks >= 200; } },
      { id: 'minimalist', icon: '\u2728', name: t('stem.archstudio.minimalist', 'Minimalist'), desc: t('stem.archstudio.build_stable_70_with_exactly_5_blocks', 'Build stable (70%+) with exactly 5 blocks'), check: function () { return totalBlocks === 5 && analysis.stability >= 70; } }
    ];

    // Check for newly earned badges
    var newBadges = [];
    badges.forEach(function (badge) {
      if (!earnedBadges[badge.id] && badge.check()) {
        newBadges.push(badge);
      }
    });
    if (newBadges.length > 0) {
      var pendingBadges = window.__archPendingBadgeIds || (window.__archPendingBadgeIds = {});
      var queuedBadges = newBadges.filter(function (badge) { return !pendingBadges[badge.id]; });
      if (queuedBadges.length) {
        queuedBadges.forEach(function (badge) { pendingBadges[badge.id] = true; });
        var badgeBuildSignature = currentBuildSignature;
        setTimeout(function () {
          var awarded = {};
          var reportAwards = function () {
            queuedBadges.forEach(function (badge) { delete pendingBadges[badge.id]; });
            Object.keys(awarded).forEach(function (id) {
              var badge = awarded[id];
              if (ctx.addToast) ctx.addToast('\uD83C\uDFC5 Badge Earned: ' + badge.icon + ' ' + badge.name + '!', 'success');
              if (ctx.awardXP) ctx.awardXP('archStudio_badge_' + badge.id, 5, 'Badge: ' + badge.name);
            });
          };
          if (typeof ctx.setToolData === 'function') {
            var badgeReportScheduled = false;
            ctx.setToolData(function (p) {
              var a = Object.assign({}, p.archStudio || {});
              var scheduleBadgeReport = function () {
                if (badgeReportScheduled) return;
                badgeReportScheduled = true;
                setTimeout(reportAwards, 0);
              };
              if (getArchBuildSignature(getArchRuntimeBlocks(a.blocks)) !== badgeBuildSignature) { scheduleBadgeReport(); return p; }
              var latestEarned = Object.assign({}, a.earnedBadges || {});
              var changed = false;
              queuedBadges.forEach(function (badge) {
                if (latestEarned[badge.id]) return;
                latestEarned[badge.id] = Date.now();
                awarded[badge.id] = badge;
                changed = true;
              });
              scheduleBadgeReport();
              return changed ? Object.assign({}, p, { archStudio: Object.assign({}, a, { earnedBadges: latestEarned }) }) : p;
            });
          } else {
            var fallbackEarned = Object.assign({}, earnedBadges);
            queuedBadges.forEach(function (badge) {
              if (fallbackEarned[badge.id]) return;
              fallbackEarned[badge.id] = Date.now();
              awarded[badge.id] = badge;
            });
            upd('earnedBadges', fallbackEarned);
            reportAwards();
          }
        }, 0);
      }
    }
    var badgeCount = badges.filter(function (badge) { return !!earnedBadges[badge.id]; }).length;

    // ══════════════════════════════════════════════════════════════
    // ── Wind Resistance Analyzer ──
    // ══════════════════════════════════════════════════════════════
    var windAnalysis = { frontalArea: 0, sideArea: 0, dragCoeff: 0, rating: 'N/A', emoji: '\u2B1C' };
    if (totalBlocks > 0) {
      // Frontal area (projection on X-Y plane)
      var frontProj = {};
      blocks.forEach(function (b) { frontProj[b.x + ',' + b.y] = true; });
      windAnalysis.frontalArea = Object.keys(frontProj).length;
      // Side area (projection on Z-Y plane)
      var sideProj = {};
      blocks.forEach(function (b) { sideProj[b.z + ',' + b.y] = true; });
      windAnalysis.sideArea = Object.keys(sideProj).length;
      // Simplified drag coefficient based on shape
      var aeroShapes = { pyramid: 0.5, dome: 0.4, cylinder: 0.47, roof: 0.6, ramp: 0.55 };
      var dragSum = 0;
      blocks.forEach(function (b) { dragSum += aeroShapes[b.shape || 'block'] || 1.0; });
      windAnalysis.dragCoeff = (dragSum / totalBlocks).toFixed(2);
      // Aspect ratio penalty (tall + narrow = bad)
      var aspectRatio = buildH / Math.max(1, Math.min(buildW, buildD));
      var windScore = Math.max(0, Math.min(100, Math.round(100 - (parseFloat(windAnalysis.dragCoeff) * 30) - (aspectRatio > 3 ? (aspectRatio - 3) * 10 : 0))));
      if (windScore >= 70) { windAnalysis.rating = 'Wind-Resistant'; windAnalysis.emoji = '\uD83D\uDFE2'; }
      else if (windScore >= 40) { windAnalysis.rating = 'Moderate'; windAnalysis.emoji = '\uD83D\uDFE1'; }
      else { windAnalysis.rating = 'Vulnerable'; windAnalysis.emoji = '\uD83D\uDD34'; }
      windAnalysis.score = windScore;
    }

    // ══════════════════════════════════════════════════════════════
    // ── Multi-Floor Plan View ──
    // ══════════════════════════════════════════════════════════════
    var showFloorPlans = d.showFloorPlans || false;
    var floorPlans = [];
    if (showFloorPlans && totalBlocks > 0) {
      var byFloor = {};
      blocks.forEach(function (b) { if (!byFloor[b.y]) byFloor[b.y] = []; byFloor[b.y].push(b); });
      var floors = Object.keys(byFloor).map(Number).sort(function (a, b) { return a - b; });
      floors.forEach(function (y) {
        var floorBlocks = byFloor[y];
        var grid = {};
        floorBlocks.forEach(function (b) { grid[b.x + ',' + b.z] = b; });
        floorPlans.push({ y: y, blocks: floorBlocks, count: floorBlocks.length, grid: grid });
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ── STL Export ──
    // ══════════════════════════════════════════════════════════════
    var exportSTL = function () {
      if (blocks.length === 0) return;
      var geos = ArchGL.stlGeometries(blocks);
      if (geos.length === 0) { if (ctx.addToast) ctx.addToast('\u26A0\uFE0F 3D engine is not ready for STL export', 'error'); return; }
      var positions = [], normals = [];
      geos.forEach(function (g) {
        var idx = g.index, pos = g.getAttribute('position'), nrm = g.getAttribute('normal');
        if (idx) { for (var i = 0; i < idx.count; i++) { var vi = idx.getX(i); positions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi)); normals.push(nrm ? nrm.getX(vi) : 0, nrm ? nrm.getY(vi) : 1, nrm ? nrm.getZ(vi) : 0); } }
          else { for (var j = 0; j < pos.count; j++) { positions.push(pos.getX(j), pos.getY(j), pos.getZ(j)); normals.push(nrm ? nrm.getX(j) : 0, nrm ? nrm.getY(j) : 1, nrm ? nrm.getZ(j) : 0); } }
      });
      geos.forEach(function (g) { if (g.dispose) g.dispose(); });
      var triCount = positions.length / 9, bufLen = 84 + triCount * 50;
      var buf = new ArrayBuffer(bufLen), dv = new DataView(buf);
      for (var h = 0; h < 80; h++) dv.setUint8(h, 0);
      dv.setUint32(80, triCount, true);
      var offset = 84;
      for (var t = 0; t < triCount; t++) {
        var ni = t * 9;
        dv.setFloat32(offset, normals[ni], true); dv.setFloat32(offset + 4, normals[ni + 1], true); dv.setFloat32(offset + 8, normals[ni + 2], true); offset += 12;
        for (var v = 0; v < 3; v++) { var pi = t * 9 + v * 3; dv.setFloat32(offset, positions[pi], true); dv.setFloat32(offset + 4, positions[pi + 1], true); dv.setFloat32(offset + 8, positions[pi + 2], true); offset += 12; }
        dv.setUint16(offset, 0, true); offset += 2;
      }
      var blob = new Blob([buf], { type: 'application/octet-stream' }), url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'architecture_studio_' + Date.now() + '.stl'; a.click();
      URL.revokeObjectURL(url);
      if (ctx.addToast) ctx.addToast('\uD83C\uDFD7\uFE0F Exported as STL!', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Blueprint SVG Export (Top-Down) ──
    // ══════════════════════════════════════════════════════════════
    var exportBlueprint = function () {
      if (blocks.length === 0) return;
      var cellSize = 40, padding = 60, legendH = 80;
      var svgW = buildW * cellSize + padding * 2, svgH = buildD * cellSize + padding * 2 + legendH;
      var topView = {};
      blocks.forEach(function (b) { var key = b.x + ',' + b.z; if (!topView[key] || b.y > topView[key].y) topView[key] = b; });
      var shapeIconLookup = {};
      shapes.forEach(function (s) { shapeIconLookup[s.id] = s.icon; });
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" aria-hidden="true">\n';
      svg += '<style>text{font-family:Arial,Helvetica,sans-serif;}</style>\n';
      svg += '<rect width="' + svgW + '" height="' + svgH + '" fill="#0f172a"/>\n';
      svg += '<text x="' + (svgW / 2) + '" y="28" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="bold">' + (styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio') + ' \u2014 Floor Plan</text>\n';
      svg += '<text x="' + (svgW / 2) + '" y="46" text-anchor="middle" fill="#cbd5e1" font-size="11">' + buildW + '\u00D7' + buildD + '\u00D7' + buildH + ' \u2022 ' + totalBlocks + ' blocks \u2022 Vol: ' + totalVolume + ' u\u00B3</text>\n';
      var gOX = padding, gOY = padding;
      for (var gx = 0; gx <= buildW; gx++) svg += '<line x1="' + (gOX + gx * cellSize) + '" y1="' + gOY + '" x2="' + (gOX + gx * cellSize) + '" y2="' + (gOY + buildD * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      for (var gz = 0; gz <= buildD; gz++) svg += '<line x1="' + gOX + '" y1="' + (gOY + gz * cellSize) + '" x2="' + (gOX + buildW * cellSize) + '" y2="' + (gOY + gz * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      var usedMaterials = {};
      Object.keys(topView).forEach(function (key) {
        var b = topView[key], bx = (b.x - minX) * cellSize + gOX, bz = (b.z - minZ) * cellSize + gOY;
        var fillColor = b.color || matColorLookup[b.material || 'stone'] || '#94a3b8';
        usedMaterials[b.material || 'stone'] = fillColor;
        svg += '<rect x="' + (bx + 1) + '" y="' + (bz + 1) + '" width="' + (cellSize - 2) + '" height="' + (cellSize - 2) + '" fill="' + fillColor + '" fill-opacity="0.7" stroke="' + fillColor + '" stroke-width="1.5" rx="3"/>\n';
        svg += '<text x="' + (bx + cellSize / 2) + '" y="' + (bz + cellSize / 2 - 2) + '" text-anchor="middle" font-size="14" dominant-baseline="middle">' + (shapeIconLookup[b.shape || 'block'] || '\uD83D\uDFE6') + '</text>\n';
        svg += '<text x="' + (bx + cellSize - 5) + '" y="' + (bz + cellSize - 5) + '" text-anchor="end" fill="#fff" font-size="8" font-weight="bold" opacity="0.8">y' + b.y + '</text>\n';
      });
      var lY = gOY + buildD * cellSize + 20;
      svg += '<text x="' + gOX + '" y="' + lY + '" fill="#94a3b8" font-size="10" font-weight="bold">MATERIALS</text>\n';
      var li = 0;
      Object.keys(usedMaterials).forEach(function (mid) {
        var lx = gOX + li * 90;
        svg += '<rect x="' + lx + '" y="' + (lY + 6) + '" width="12" height="12" fill="' + usedMaterials[mid] + '" rx="2"/>\n';
        svg += '<text x="' + (lx + 16) + '" y="' + (lY + 16) + '" fill="#cbd5e1" font-size="10">' + mid.charAt(0).toUpperCase() + mid.slice(1) + '</text>\n';
        li++;
      });
      svg += '<text x="' + (svgW - padding) + '" y="' + lY + '" text-anchor="end" fill="#cbd5e1" font-size="10">Stability: ' + analysis.stabilityEmoji + ' ' + analysis.stability + '%</text>\n';
      svg += '</svg>';
      var blob = new Blob([svg], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'blueprint_top_' + Date.now() + '.svg'; a.click();
      URL.revokeObjectURL(url);
      if (ctx.addToast) ctx.addToast('\uD83D\uDCD0 Top-down blueprint exported!', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Side-View Blueprint Export (Front Elevation X-Y) ──
    // ══════════════════════════════════════════════════════════════
    var exportSideBlueprint = function () {
      if (blocks.length === 0) return;
      var cellSize = 40, padding = 60, legendH = 60;
      var svgW = buildW * cellSize + padding * 2, svgH = buildH * cellSize + padding * 2 + legendH;
      // Front elevation: for each (x,y) show the frontmost block (lowest z)
      var frontView = {};
      blocks.forEach(function (b) {
        var key = b.x + ',' + b.y;
        if (!frontView[key] || b.z < frontView[key].z) frontView[key] = b;
      });
      var shapeIconLookup = {};
      shapes.forEach(function (s) { shapeIconLookup[s.id] = s.icon; });
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '" aria-hidden="true">\n';
      svg += '<style>text{font-family:Arial,Helvetica,sans-serif;}</style>\n';
      svg += '<rect width="' + svgW + '" height="' + svgH + '" fill="#0f172a"/>\n';
      svg += '<text x="' + (svgW / 2) + '" y="28" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="bold">' + (styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio') + ' \u2014 Front Elevation</text>\n';
      svg += '<text x="' + (svgW / 2) + '" y="46" text-anchor="middle" fill="#cbd5e1" font-size="11">' + buildW + '\u00D7' + buildH + ' \u2022 ' + totalBlocks + ' blocks</text>\n';
      var gOX = padding, gOY = padding;
      // Grid
      for (var gx = 0; gx <= buildW; gx++) svg += '<line x1="' + (gOX + gx * cellSize) + '" y1="' + gOY + '" x2="' + (gOX + gx * cellSize) + '" y2="' + (gOY + buildH * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      for (var gy = 0; gy <= buildH; gy++) svg += '<line x1="' + gOX + '" y1="' + (gOY + gy * cellSize) + '" x2="' + (gOX + buildW * cellSize) + '" y2="' + (gOY + gy * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      // Blocks (Y inverted so ground is at bottom)
      Object.keys(frontView).forEach(function (key) {
        var b = frontView[key];
        var bx = (b.x - minX) * cellSize + gOX;
        var by = (maxY - b.y) * cellSize + gOY; // invert Y
        var fillColor = b.color || matColorLookup[b.material || 'stone'] || '#94a3b8';
        svg += '<rect x="' + (bx + 1) + '" y="' + (by + 1) + '" width="' + (cellSize - 2) + '" height="' + (cellSize - 2) + '" fill="' + fillColor + '" fill-opacity="0.7" stroke="' + fillColor + '" stroke-width="1.5" rx="3"/>\n';
        svg += '<text x="' + (bx + cellSize / 2) + '" y="' + (by + cellSize / 2) + '" text-anchor="middle" font-size="14" dominant-baseline="middle">' + (shapeIconLookup[b.shape || 'block'] || '\uD83D\uDFE6') + '</text>\n';
      });
      // Ground line
      var groundLineY = gOY + buildH * cellSize;
      svg += '<line x1="' + (gOX - 10) + '" y1="' + groundLineY + '" x2="' + (gOX + buildW * cellSize + 10) + '" y2="' + groundLineY + '" stroke="#22c55e" stroke-width="2" stroke-dasharray="6,3"/>\n';
      svg += '<text x="' + (gOX + buildW * cellSize + 15) + '" y="' + (groundLineY + 4) + '" fill="#22c55e" font-size="10">Ground</text>\n';
      // Height labels
      for (var hy = 0; hy < buildH; hy++) {
        svg += '<text x="' + (gOX - 8) + '" y="' + (gOY + (buildH - 1 - hy) * cellSize + cellSize / 2 + 3) + '" text-anchor="end" fill="#94a3b8" font-size="9">y' + (minY + hy) + '</text>\n';
      }
      svg += '<text x="' + (svgW - padding) + '" y="' + (gOY + buildH * cellSize + 30) + '" text-anchor="end" fill="#cbd5e1" font-size="10">Stability: ' + analysis.stabilityEmoji + ' ' + analysis.stability + '% \u2022 CoG height: ' + analysis.cogY + '</text>\n';
      svg += '</svg>';
      var blob = new Blob([svg], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'blueprint_side_' + Date.now() + '.svg'; a.click();
      URL.revokeObjectURL(url);
      if (ctx.addToast) ctx.addToast('\uD83C\uDFD7\uFE0F Side elevation exported!', 'success');
    };

    // ── Coach tips ──
    var coachTip;
    if (justCompleted && challengeProgress) {
      coachTip = '\uD83C\uDFC6 ' + challengeProgress.challenge.title + ' complete! ' + challengeProgress.challenge.fact;
    } else if (challengeProgress && !challengeProgress.passed) {
      coachTip = '\uD83C\uDFAF ' + challengeProgress.challenge.icon + ' ' + challengeProgress.challenge.desc + ' \u2014 keep building!';
    } else if (overBudget) {
      coachTip = '\uD83D\uDCB0 Over budget! Remove blocks or switch to cheaper materials. Wood (\uD83D\uDCB2' + matCostLookup.wood + ') is the cheapest material.';
    } else if (showAnalysis && analysis.tip) {
      coachTip = analysis.tip;
    } else if (totalBlocks === 0) {
      coachTip = '\uD83C\uDFD7\uFE0F Place your first block! Try \uD83C\uDFC6 Challenges or \uD83D\uDCC2 Templates to get started.';
    } else if (totalBlocks < 5) {
      coachTip = '\uD83D\uDCA1 Stack blocks upward by clicking faces. Try \uD83E\uDE9E Mirror to double your build!';
    } else if (totalBlocks < 15) {
      coachTip = '\uD83C\uDFDB\uFE0F Add columns and arches for a classical look. Use \uD83D\uDCD0 Analysis to check stability!';
    } else if (totalBlocks < 30) {
      coachTip = '\uD83C\uDFE0 Mix materials for contrast! Use \uD83E\uDD16 AI Architect for personalized tips.';
    } else if (totalBlocks < 50) {
      coachTip = '\uD83C\uDF09 The Colosseum had 80 arched entrances! Save your masterpiece with \uD83D\uDCBE Save.';
    } else {
      coachTip = '\uD83C\uDFF0 Legendary architect! Export your creation as STL for 3D printing!';
    }

    // ── Render helpers ──
    var analysisBar = function (label, value, max, color, suffix) {
      var pct = max > 0 ? Math.round((value / max) * 100) : 0;
      return el('div', { style: { marginBottom: 8 } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
          el('span', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600 } }, label),
          el('span', { style: { fontSize: 10, color: color, fontWeight: 700 } }, value + (suffix || ''))
        ),
        el('div', { style: { height: 6, background: 'var(--allo-stem-panel, #1e293b)', borderRadius: 3, overflow: 'hidden' } },
          el('div', { style: { height: '100%', width: Math.min(100, pct) + '%', background: color, borderRadius: 3, transition: 'width 0.3s ease' } })
        )
      );
    };

    var pillBtn = function (label, isActive, activeBg, activeBorder, activeColor, onClick) {
      return el('button', { className: 'arch-studio-pill', type: 'button', 'aria-pressed': !!isActive, onClick: onClick, style: {
        background: isActive ? activeBg : 'rgba(71,85,105,.3)',
        border: '1px solid ' + (isActive ? activeBorder : '#475569'),
        color: isActive ? activeColor : '#94a3b8',
        borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700
      } }, label);
    };

    var cameraBtn = function (label, glyph, action) {
      return el('button', { key: action, type: 'button', 'aria-label': label, title: label, onClick: function () { setArchCamera(action); }, style: {
        width: 30, height: 28, padding: 0, borderRadius: 6, border: '1px solid #475569', background: 'rgba(30,41,59,.92)', color: '#e2e8f0', cursor: 'pointer', fontSize: 14, fontWeight: 800
      } }, glyph);
    };

    var selectedShapeMeta = selectedBlock && (shapes.find(function (s) { return s.id === (selectedBlock.shape || 'block'); }) || shapes[0]);
    var selectedMaterialMeta = selectedBlock && (materials.find(function (m) { return m.id === (selectedBlock.material || 'stone'); }) || materials[0]);
    var selectedColorLabel = selectedBlock && normalizeArchColor(selectedBlock.color, selectedBlock.material || 'stone').toUpperCase();
    var selectedMoves = [
      { label: 'Move selected block left along X', glyph: '\u2190 X', type: 'move', dx: -1, dy: 0, dz: 0 },
      { label: 'Move selected block up one floor', glyph: '\u2191 Y', type: 'move', dx: 0, dy: 1, dz: 0 },
      { label: 'Move selected block right along X', glyph: 'X \u2192', type: 'move', dx: 1, dy: 0, dz: 0 },
      { label: 'Move selected block backward along Z', glyph: '\u2191 Z', type: 'move', dx: 0, dy: 0, dz: -1 },
      { label: 'Move selected block down one floor', glyph: '\u2193 Y', type: 'move', dx: 0, dy: -1, dz: 0 },
      { label: 'Move selected block forward along Z', glyph: 'Z \u2193', type: 'move', dx: 0, dy: 0, dz: 1 }
    ];
    var canSelectedAction = function (action) {
      if (!selectedBlock || showReplay) return false;
      return applyArchBlockAction(blocks, Object.assign({}, action || {}, { cell: selectedBlock })) !== blocks;
    };

    var renderBuildGrid = function () {
      var gridBlocks = showReplay ? archReplayFrame : blocks;
      var gridHasBlocks = gridBlocks.length > 0;
      var gridContentMinX = 0, gridContentMaxX = 0, gridContentMinZ = 0, gridContentMaxZ = 0;
      if (gridHasBlocks) {
        gridContentMinX = Infinity; gridContentMaxX = -Infinity;
        gridContentMinZ = Infinity; gridContentMaxZ = -Infinity;
        gridBlocks.forEach(function (b) {
          if (b.x < gridContentMinX) gridContentMinX = b.x;
          if (b.x > gridContentMaxX) gridContentMaxX = b.x;
          if (b.z < gridContentMinZ) gridContentMinZ = b.z;
          if (b.z > gridContentMaxZ) gridContentMaxZ = b.z;
        });
      }
      var gridFocusBlock = !showReplay && selectedBlock && selectedBlock.y === editLayer ? selectedBlock : null;
      var hasGridCursor = gridCursorX != null && gridCursorZ != null;
      var gridFocusX = hasGridCursor ? gridCursorX : gridFocusBlock ? gridFocusBlock.x : null;
      var gridFocusZ = hasGridCursor ? gridCursorZ : gridFocusBlock ? gridFocusBlock.z : null;
      var xBounds = getArchGridAxisBounds(gridHasBlocks, gridContentMinX, gridContentMaxX, gridFocusX);
      var zBounds = getArchGridAxisBounds(gridHasBlocks, gridContentMinZ, gridContentMaxZ, gridFocusZ);
      var gridMinX = xBounds[0], gridMaxX = xBounds[1];
      var gridMinZ = zBounds[0], gridMaxZ = zBounds[1];
      var cols = gridMaxX - gridMinX + 1;
      var rows = gridMaxZ - gridMinZ + 1;
      var cellPx = Math.max(28, Math.min(48, Math.floor(520 / Math.max(cols, rows, 1))));
      var cursorX = hasGridCursor
        ? Math.max(gridMinX, Math.min(gridMaxX, gridCursorX))
        : gridFocusBlock ? Math.round(gridFocusBlock.x) : Math.max(gridMinX, Math.min(gridMaxX, 0));
      var cursorZ = hasGridCursor
        ? Math.max(gridMinZ, Math.min(gridMaxZ, gridCursorZ))
        : gridFocusBlock ? Math.round(gridFocusBlock.z) : Math.max(gridMinZ, Math.min(gridMaxZ, 0));
      var cursorBounds = { minX: gridMinX, maxX: gridMaxX, minZ: gridMinZ, maxZ: gridMaxZ };
      var layerMap = {};
      gridBlocks.forEach(function (b) {
        if (b.y === editLayer) layerMap[b.x + ',' + b.z] = b;
      });
      var rowElements = [];
      var onGridCellKeyDown = function (ev, x, z) {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown'
          && ev.key !== 'Home' && ev.key !== 'End') return;
        ev.preventDefault();
        ev.stopPropagation();
        var next = moveArchGridCursor({ x: x, z: z }, ev.key, cursorBounds, ev.ctrlKey || ev.metaKey);
        upd({ gridCursorX: next.x, gridCursorZ: next.z });
        focusArchGridCell(next.x, next.z);
      };
      for (var gz = gridMinZ; gz <= gridMaxZ; gz++) {
        var rowCells = [];
        for (var gx = gridMinX; gx <= gridMaxX; gx++) {
          (function (x, z) {
            var b = layerMap[x + ',' + z];
            var isSelected = !!b && archBlockKey(b) === selectedBlockKey;
            var cellName = b ? (b.material || 'stone') + ' ' + (b.shape || 'block') : 'Empty cell';
            var action = showReplay ? 'read-only construction replay' : mode === 'place' ? 'place ' + activeShape : mode === 'erase' ? 'remove block' : mode === 'paint' ? 'paint block' : 'pick block properties';
            rowCells.push(el('button', {
              key: x + ',' + z,
              type: 'button',
              role: 'gridcell',
              tabIndex: x === cursorX && z === cursorZ ? 0 : -1,
              'aria-selected': isSelected,
              'aria-colindex': x - gridMinX + 1,
              'data-arch-grid-x': x,
              'data-arch-grid-z': z,
              'data-arch-cell': x + ',' + editLayer + ',' + z,
              'aria-label': cellName + ' at X ' + x + ', Y ' + editLayer + ', Z ' + z + '; ' + action,
              onFocus: function () {
                if (gridCursorX !== x || gridCursorZ !== z) upd({ gridCursorX: x, gridCursorZ: z });
              },
              onKeyDown: function (ev) { onGridCellKeyDown(ev, x, z); },
              onClick: function () { editAtGridCell(x, z); },
              title: 'X ' + x + '  Z ' + z + (b ? ' - ' + (b.shape || 'block') : '') + (isSelected ? ' - selected' : ''),
              style: {
                width: cellPx, height: cellPx, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 5,
                border: '2px solid ' + (isSelected ? '#fbbf24' : b ? 'rgba(255,255,255,.55)' : 'rgba(100,116,139,.42)'),
                background: b ? (showHeatmap ? '#' + ('000000' + archHexFor(b).toString(16)).slice(-6) : (b.color || matColorLookup[b.material || 'stone'] || '#94a3b8')) : 'rgba(30,41,59,.72)',
                color: b ? '#fff' : '#64748b',
                fontSize: b ? Math.max(14, Math.floor(cellPx * 0.42)) : 13,
                cursor: (mode === 'erase' || mode === 'paint' || mode === 'pick') ? (b ? (mode === 'pick' ? 'copy' : 'pointer') : 'default') : 'pointer',
                boxShadow: isSelected ? '0 0 0 2px rgba(251,191,36,.35), inset 0 0 0 1px rgba(15,23,42,.35)' : b ? 'inset 0 0 0 1px rgba(15,23,42,.35)' : 'none'
              }
            }, b ? (shapeIconById[b.shape || 'block'] || '\uD83E\uDDF1') : (mode === 'place' ? '+' : '')));
          })(gx, gz);
        }
        rowElements.push(el('div', {
          key: 'row-' + gz,
          role: 'row',
          'aria-rowindex': gz - gridMinZ + 1,
          style: { display: 'contents' }
        }, rowCells));
      }

      return el('div', { style: { flex: 1, minHeight: 260, display: 'flex', flexDirection: 'column', padding: '54px 16px 14px', overflow: 'hidden', background: 'radial-gradient(circle at 50% 20%, rgba(30,41,59,.9), rgba(15,23,42,1))' } },
        !archShow3d && el('div', { role: 'status', style: { margin: '0 auto 8px', padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.45)', color: '#fde68a', fontSize: 11 } },
          '3D is unavailable, but the floor grid is fully editable.'),
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
          el('button', { type: 'button', disabled: editLayer <= 0, 'aria-label': 'Previous floor', onClick: function () { upd('editLayer', Math.max(0, editLayer - 1)); }, style: { width: 32, height: 28, borderRadius: 7, border: '1px solid #475569', background: 'rgba(30,41,59,.8)', color: editLayer > 0 ? '#e2e8f0' : '#475569', cursor: editLayer > 0 ? 'pointer' : 'default' } }, '\u2212'),
          el('strong', { style: { minWidth: 92, textAlign: 'center', color: '#f8fafc', fontSize: 12 } }, 'Floor Y=' + editLayer),
          el('button', { type: 'button', disabled: editLayer >= 31, 'aria-label': 'Next floor', onClick: function () { upd('editLayer', Math.min(31, editLayer + 1)); }, style: { width: 32, height: 28, borderRadius: 7, border: '1px solid #475569', background: 'rgba(30,41,59,.8)', color: editLayer < 31 ? '#e2e8f0' : '#475569', cursor: editLayer < 31 ? 'pointer' : 'default' } }, '+'),
          el('span', { style: { color: '#94a3b8', fontSize: 11 } }, mode === 'place' ? 'Select a cell to place ' + activeShape : mode === 'erase' ? 'Select a block to remove it' : mode === 'paint' ? 'Select a block to paint it' : 'Select a block to copy its shape, material, color, and rotation')
        ),
        el('div', { id: 'arch-grid-help', style: { margin: '0 auto 7px', color: '#94a3b8', fontSize: 10, textAlign: 'center' } },
          showReplay ? 'Construction replay is read-only \u2022 Arrow keys move between cells' : 'Arrow keys move between cells \u2022 Enter or Space uses the active tool \u2022 Home and End jump across a row'),
        el('div', { style: { flex: 1, minHeight: 0, overflow: 'auto' } },
          el('div', {
            role: 'grid',
            'data-arch-grid': 'true',
            'aria-label': 'Architecture build grid, floor ' + editLayer,
            'aria-describedby': 'arch-grid-help',
            'aria-readonly': showReplay,
            'aria-rowcount': rows,
            'aria-colcount': cols,
            style: {
            display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', ' + cellPx + 'px)', gap: 3,
            width: 'max-content', margin: '0 auto', padding: 8, borderRadius: 10,
            background: 'rgba(2,6,23,.48)', border: '1px solid rgba(71,85,105,.7)'
          } }, rowElements)
        )
      );
    };

    // ══════════════════════════════════════════════════════════════
    // ── RENDER ──
    // ══════════════════════════════════════════════════════════════
    // ── Keyboard shortcuts (WCAG 2.1.1): P/E/A/I switch mode, R rotates ──
    function onArchKey(e) {
      var tgt = e.target || {};
      var tn = (tgt.tagName || '').toUpperCase();
      if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
      var k = e.key;
      var lower = String(k || '').toLowerCase();
      var inInspector = !!(typeof tgt.closest === 'function' && tgt.closest('[data-arch-inspector="true"]'));
      var authoringShortcutSurface = tgt === e.currentTarget || tgt.id === 'arch-studio-canvas'
        || (typeof tgt.getAttribute === 'function' && tgt.getAttribute('role') === 'gridcell');
      if ((e.ctrlKey || e.metaKey) && lower === 'z') {
        e.preventDefault();
        if (showReplay) { if (announceToSR) announceToSR('Exit construction replay before editing.'); }
        else if (e.shiftKey) doRedo(); else doUndo();
      }
      else if ((e.ctrlKey || e.metaKey) && lower === 'y') {
        e.preventDefault();
        if (showReplay) { if (announceToSR) announceToSR('Exit construction replay before editing.'); }
        else doRedo();
      }
      else if (e.ctrlKey || e.metaKey || e.altKey) { return; }
      else if ((k === 'p' || k === 'P') && authoringShortcutSurface) { e.preventDefault(); ArchGL.clearPreview(); upd('mode', 'place'); if (announceToSR) announceToSR('Place mode.'); }
      else if ((k === 'e' || k === 'E') && authoringShortcutSurface) { e.preventDefault(); ArchGL.clearPreview(); upd('mode', 'erase'); if (announceToSR) announceToSR('Erase mode.'); }
      else if ((k === 'a' || k === 'A') && authoringShortcutSurface) { e.preventDefault(); ArchGL.clearPreview(); upd('mode', 'paint'); if (announceToSR) announceToSR('Paint mode.'); }
      else if ((k === 'i' || k === 'I') && authoringShortcutSurface) { e.preventDefault(); ArchGL.clearPreview(); upd('mode', 'pick'); if (announceToSR) announceToSR('Pick properties mode. Select an existing block.'); }
      else if (k === 'Escape' && selectedBlock && (authoringShortcutSurface || inInspector)) { e.preventDefault(); clearSelectedBlock(inInspector); }
      else if (k === 'Delete' && selectedBlock && authoringShortcutSurface) { e.preventDefault(); commitSelectedAction({ type: 'delete' }); }
      else if ((k === 'd' || k === 'D') && selectedBlock && authoringShortcutSurface) { e.preventDefault(); commitSelectedAction({ type: 'duplicate', dx: 0, dy: 1, dz: 0 }); }
      else if ((k === 's' || k === 'S') && authoringShortcutSurface) { e.preventDefault(); takeScreenshot(); }
      else if ((k === 'g' || k === 'G') && authoringShortcutSurface) {
        e.preventDefault();
        if (showReplay) { if (announceToSR) announceToSR('Exit construction replay before editing.'); }
        else applyGravity();
      }
      else if ((k === 'r' || k === 'R') && authoringShortcutSurface) {
        e.preventDefault();
        ArchGL.clearPreview();
        var nextDeg = (activeRotation + 90) % 360;
        upd('activeRotation', nextDeg);
        if (announceToSR) announceToSR('Rotated to ' + nextDeg + ' degrees.');
      } else if ((k === 'PageUp' || k === 'PageDown') && authoringShortcutSurface) {
        e.preventDefault();
        var nextLayer = Math.max(0, Math.min(31, editLayer + (k === 'PageUp' ? 1 : -1)));
        upd('editLayer', nextLayer);
        if (announceToSR) announceToSR('Editing floor Y equals ' + nextLayer + '.');
      } else if (k >= '1' && k <= '9' && authoringShortcutSurface) {
        var idx = parseInt(k, 10) - 1;
        if (modes[idx]) {
          e.preventDefault();
          ArchGL.clearPreview();
          upd('mode', modes[idx].id);
          if (announceToSR) announceToSR(modes[idx].label + ' mode.');
        }
      }
    }

    // Keep every display-changing mode visible beside the build. Several of
    // these settings continue filtering the viewport after their sidebar card
    // is closed, so this dock is also the quickest route back to the full model.
    var activeViewChips = [];
    if (viewLayer >= 0) activeViewChips.push({
      id: 'layer', label: 'Layer Y=' + viewLayer, clearLabel: 'Show all floor layers',
      tone: { border: '#38bdf8', bg: 'rgba(56,189,248,.13)', color: '#bae6fd' },
      clear: function () { upd('viewLayer', -1); }
    });
    if (showSlice && sliceZSelected) activeViewChips.push({
      id: 'slice', label: 'Slice Z=' + sliceZ, clearLabel: 'Clear Z cross-section',
      tone: { border: '#22d3ee', bg: 'rgba(34,211,238,.13)', color: '#a5f3fc' },
      clear: function () { upd({ sliceZ: -1, sliceZSelected: false }); }
    });
    if (filterMaterial) {
      var hudMaterial = materials.find(function (m) { return m.id === filterMaterial; });
      activeViewChips.push({
        id: 'material', label: 'Material: ' + (hudMaterial ? hudMaterial.label : filterMaterial), clearLabel: 'Clear material filter',
        tone: { border: '#60a5fa', bg: 'rgba(96,165,250,.13)', color: '#bfdbfe' },
        clear: function () { upd('filterMaterial', ''); }
      });
    }
    if (filterShape) {
      var hudShape = shapes.find(function (s) { return s.id === filterShape; });
      activeViewChips.push({
        id: 'shape', label: 'Shape: ' + (hudShape ? hudShape.label : filterShape), clearLabel: 'Clear shape filter',
        tone: { border: '#a78bfa', bg: 'rgba(167,139,250,.13)', color: '#ddd6fe' },
        clear: function () { upd('filterShape', ''); }
      });
    }
    if (showHeatmap) activeViewChips.push({
      id: 'heatmap', label: 'Load Heatmap', clearLabel: 'Turn off load heatmap',
      tone: { border: '#f87171', bg: 'rgba(248,113,113,.13)', color: '#fecaca' },
      clear: function () { upd('showHeatmap', false); }
    });
    if (showReplay) activeViewChips.push({
      id: 'replay', label: 'Replay ' + replayLabel, clearLabel: 'Exit construction replay',
      tone: { border: '#fbbf24', bg: 'rgba(251,191,36,.13)', color: '#fde68a' },
      clear: exitReplay
    });
    if (blueprintView) activeViewChips.push({
      id: 'blueprint', label: 'Blueprint', clearLabel: 'Exit blueprint view',
      tone: { border: '#2dd4bf', bg: 'rgba(45,212,191,.13)', color: '#99f6e4' },
      clear: function () { upd('blueprintView', false); }
    });
    var resetArchView = function () {
      upd({
        viewLayer: -1, showSlice: false, sliceZ: -1, sliceZSelected: false,
        filterMaterial: '', filterShape: '', showHeatmap: false,
        showReplay: false, replayStep: -1, blueprintView: false
      });
      if (announceToSR) announceToSR('View reset. Showing the entire live build.');
    };

    return el('div', {
      key: 'archStudio',
      id: 'arch-studio-region',
      style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'radial-gradient(circle at 74% 14%,rgba(56,189,248,.075),transparent 30%),var(--allo-stem-canvas, #0f172a)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 22px 58px rgba(2,6,23,.22)' },
      role: 'region',
      'aria-label': t('stem.archstudio.architecture_studio_keyboard_shortcuts', 'Architecture Studio. On the build canvas or floor grid: P Place, E Erase, A Paint, I Pick properties, R Rotate, G Gravity, S Screenshot, D Duplicate selected, Delete removes selected, Escape clears selection, number keys choose tools, and Page Up or Page Down changes floor. Control Z and Control Y undo and redo.'),
      tabIndex: 0,
      onKeyDown: onArchKey
    },

      // ── Light-mode readability (2026-08-05) ─────────────────────────────
      // This tool is DARK-DESIGNED: every fallback in it is a dark-theme value
      // (canvas #0f172a, panel #1e293b) and its text/chrome are hardcoded
      // dark-theme colours (slate-400 labels, #e2e8f0 body, dark tooltips). But
      // the surfaces read var(--allo-stem-canvas/panel), which the light palette
      // flips to #ffffff/#f8fafc while the text does NOT flip — so light mode put
      // slate-400 on #f8fafc (2.45:1, x20 by axe), a #475569 tooltip on #333a4a
      // (1.5:1), and light-on-light chips. axe measured 35 violations in light
      // against 1 in dark: a light-specific break, not a pre-existing one.
      //
      // Pin the palette to its DARK values for this subtree so the surfaces match
      // the colours the tool actually draws. Dark theme already supplies exactly
      // these values, so it renders identically; the second rule preserves the
      // high-contrast palette, which must keep winning here.
      el('style', null,
        '#arch-studio-region{'
        + '--allo-stem-canvas:#0f172a;--allo-stem-panel:#1e293b;--allo-stem-deeper:#020617;'
        + '--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;--allo-stem-border:#334155;'
        + '--allo-stem-button-bg:#1e293b;--allo-stem-button-text:#e2e8f0;--allo-stem-button-border:#334155;'
        + '--arch-glow:rgba(56,189,248,.18);--arch-shadow:0 18px 44px rgba(2,6,23,.34);}'
        + '#arch-studio-region,#arch-studio-region *{box-sizing:border-box;}'
        + '#arch-studio-region button{font-family:inherit;}'
        + '#arch-studio-region button:not(:disabled){transition:transform .15s ease,filter .15s ease,box-shadow .15s ease,border-color .15s ease;}'
        + '#arch-studio-region button:not(:disabled):hover{filter:brightness(1.1);transform:translateY(-1px);}'
        + '#arch-studio-region button:not(:disabled):active{transform:translateY(0) scale(.98);}'
        + '#arch-studio-region button:focus-visible,#arch-studio-region input:focus-visible,#arch-studio-region textarea:focus-visible{outline:2px solid #38bdf8;outline-offset:2px;}'
        + '#arch-studio-region button:disabled{opacity:.66;}'
        + '#arch-studio-region .arch-studio-pill{white-space:nowrap;flex:0 0 auto;}'
        + '#arch-studio-region .arch-studio-title-row,#arch-studio-region .arch-studio-feature-strip,#arch-studio-region .arch-studio-stats{scrollbar-width:thin;scrollbar-color:#475569 transparent;}'
        + '#arch-studio-region .arch-studio-sidebar{scrollbar-width:thin;scrollbar-color:#475569 transparent;}'
        + '#arch-studio-region .arch-studio-sidebar>div{padding:9px;border:1px solid rgba(71,85,105,.55);border-radius:11px;background:linear-gradient(145deg,rgba(30,41,59,.72),rgba(15,23,42,.48));box-shadow:0 8px 18px rgba(2,6,23,.13);}'
        + '#arch-studio-region .arch-studio-sidebar>div:hover{border-color:rgba(100,116,139,.8);}'
        + '#arch-studio-region .arch-studio-stage{background:radial-gradient(circle at 50% 34%,rgba(56,189,248,.11),transparent 42%),linear-gradient(180deg,#0b1220 0%,#020617 100%);box-shadow:inset 0 0 60px rgba(2,6,23,.45);isolation:isolate;overflow:hidden;}'
        + '#arch-studio-region .arch-studio-floating-panel{box-sizing:border-box;box-shadow:var(--arch-shadow);max-height:calc(100% - 132px);overflow-y:auto;animation:arch-panel-in .2s ease-out;}'
        + '#arch-studio-region .arch-studio-floating-header{position:sticky;top:-12px;z-index:3;margin:-12px -14px 8px;padding:10px 12px 8px;background:rgba(15,23,42,.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(71,85,105,.55);}'
        + '#arch-studio-region .arch-studio-view-hud{scrollbar-width:thin;scrollbar-color:#475569 transparent;box-shadow:0 -8px 22px rgba(2,6,23,.2);}'
        + '#arch-studio-region .arch-studio-view-chip{flex:0 0 auto;border-radius:999px;padding:4px 9px;font-size:10px;font-weight:750;white-space:nowrap;}'
        + '#arch-studio-region .arch-studio-has-view-hud .arch-studio-floating-panel{max-height:calc(100% - 170px);}'
        + '#arch-studio-region .arch-studio-stat{min-width:82px;padding:6px 9px;border:1px solid rgba(71,85,105,.55);border-radius:9px;background:rgba(15,23,42,.58);box-shadow:inset 0 1px 0 rgba(255,255,255,.025);}'
        + '#arch-studio-region .arch-studio-empty-state{animation:arch-panel-in .2s ease-out;box-shadow:0 16px 38px rgba(2,6,23,.38);}'
        + '#arch-studio-region .arch-studio-coach{box-shadow:0 -8px 22px rgba(2,6,23,.16);}'
        + '#arch-studio-region .arch-studio-inquiry{max-height:42vh;overflow-y:auto;flex:none;}'
        + '@keyframes arch-panel-in{from{opacity:0;transform:translateY(5px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}'
        + '.theme-contrast #arch-studio-region{background:#000!important;box-shadow:none!important;'
        + '--allo-stem-canvas:#000000;--allo-stem-panel:#000000;--allo-stem-deeper:#000000;'
        + '--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;--allo-stem-border:#ffff00;'
        + '--allo-stem-button-bg:#000000;--allo-stem-button-text:#00ff00;--allo-stem-button-border:#00ff00;}'
        + '.theme-contrast #arch-studio-region button:focus-visible{outline-color:#00ff00;}'
        + '.theme-contrast #arch-studio-region .arch-studio-sidebar>div{background:#000;border-color:#ffff00;}'
        + '@media(max-width:900px) and (min-width:681px){'
        + '#arch-studio-region .arch-studio-floating-panel{width:calc(50% - 12px)!important;}'
        + '#arch-studio-region .arch-studio-help-overlay{display:none!important;}'
        + '#arch-studio-region .arch-studio-selection-chip{bottom:52px!important;max-width:calc(100% - 16px)!important;}'
        + '}'
        + '@media(max-width:680px){'
        + '#arch-studio-region .arch-studio-title-row,#arch-studio-region .arch-studio-feature-strip{flex-wrap:nowrap!important;overflow-x:auto!important;}'
        + '#arch-studio-region .arch-studio-title-row>*{flex:0 0 auto;}'
        + '#arch-studio-region .arch-studio-main{flex-direction:column;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;}'
        + '#arch-studio-region .arch-studio-sidebar{width:auto!important;max-height:240px;flex:none;border-right:0!important;border-bottom:1px solid #334155;}'
        + '#arch-studio-region .arch-studio-mode-card{position:sticky;top:0;z-index:4;}'
        + '#arch-studio-region .arch-studio-viewport{min-height:420px;flex:none!important;overflow:visible;}'
        + '#arch-studio-region .arch-studio-stage{min-height:360px;flex:none!important;}'
        + '#arch-studio-region .arch-studio-help-overlay{display:none!important;}'
        + '#arch-studio-region .arch-studio-floating-panel{position:relative!important;inset:auto!important;width:auto!important;max-height:220px;margin:8px 8px 0;animation:none;}'
        + '#arch-studio-region .arch-studio-has-view-hud .arch-studio-floating-panel{max-height:220px;}'
        + '#arch-studio-region .arch-studio-stats{justify-content:flex-start!important;}'
        + '#arch-studio-region .arch-studio-inquiry-controls{grid-template-columns:1fr!important;}'
        + '}'
        + '@media(max-width:440px){'
        + '#arch-studio-region .arch-studio-sidebar{max-height:210px;}'
        + '#arch-studio-region .arch-studio-stage{min-height:330px;}'
        + '#arch-studio-region .arch-studio-help-overlay{display:none!important;}'
        + '#arch-studio-region .arch-studio-view-switch{left:auto!important;right:8px!important;transform:none!important;}'
        + '#arch-studio-region .arch-studio-selection-chip{bottom:52px!important;max-width:calc(100% - 16px)!important;}'
        + '}'
        + '@media(max-width:480px){#arch-studio-region .arch-studio-selection-chip{bottom:52px!important;max-width:calc(100% - 16px)!important;}}'
        + '@media(max-height:600px) and (min-width:681px){'
        + '#arch-studio-region .arch-studio-main{overflow:auto!important;}'
        + '#arch-studio-region .arch-studio-viewport{min-height:380px!important;flex:none!important;}'
        + '#arch-studio-region .arch-studio-stage{min-height:300px;}'
        + '#arch-studio-region .arch-studio-inquiry{max-height:30vh;}'
        + '}'),

      // ── Header bar ──
      el('div', { className: 'arch-studio-header', style: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 5, padding: '7px 10px 6px', background: 'linear-gradient(115deg,rgba(30,41,59,.98),rgba(15,23,42,.98) 52%,rgba(8,47,73,.82))', borderBottom: '1px solid var(--allo-stem-border, #334155)', boxShadow: '0 10px 28px rgba(2,6,23,.2)', flexShrink: 0 } },
        el('div', { className: 'arch-studio-title-row', style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflowX: 'auto', padding: '1px 1px 2px' } },
          el('button', { type: 'button', onClick: function () { ctx.setStemLabTool(''); }, style: { flex: '0 0 auto', background: 'rgba(71,85,105,.42)', border: '1px solid rgba(100,116,139,.45)', color: 'var(--allo-stem-text, #e2e8f0)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '\u2190 Back'),
          el('span', { 'aria-hidden': 'true', style: { flex: '0 0 auto', display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, fontSize: 18, background: styleMode === 'bricks' ? 'rgba(239,68,68,.13)' : 'rgba(56,189,248,.12)', border: '1px solid ' + (styleMode === 'bricks' ? 'rgba(248,113,113,.35)' : 'rgba(56,189,248,.35)') } }, styleMode === 'bricks' ? '\uD83E\uDDF1' : '\uD83C\uDFD7\uFE0F'),
          el('div', { style: { minWidth: 0, whiteSpace: 'nowrap' } },
            el('div', { style: { fontWeight: 800, fontSize: 15, color: '#f8fafc', letterSpacing: .1 } }, styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio'),
            el('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 1 } }, totalBlocks + ' blocks \u2022 ' + (blocks.length ? buildW + '\u00D7' + buildD + '\u00D7' + buildH : 'ready to design'))
          ),
          el('div', { style: { flex: 1, minWidth: 8 } }),
          el('button', { type: 'button', onClick: doUndo, disabled: showReplay || !undoStack.length, title: showReplay ? 'Exit construction replay to undo' : t('stem.archstudio.undo_multi_level', 'Undo (multi-level)'), style: { flex: '0 0 auto', background: 'rgba(71,85,105,.42)', border: '1px solid rgba(100,116,139,.4)', color: !showReplay && undoStack.length ? '#e2e8f0' : '#475569', borderRadius: 8, padding: '5px 9px', cursor: !showReplay && undoStack.length ? 'pointer' : 'default', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' } }, '\u21A9 Undo' + (undoStack.length ? ' ' + undoStack.length : '')),
          el('button', { type: 'button', onClick: doRedo, disabled: showReplay || !redoStack.length, title: showReplay ? 'Exit construction replay to redo' : t('stem.archstudio.redo', 'Redo'), style: { flex: '0 0 auto', background: 'rgba(71,85,105,.42)', border: '1px solid rgba(100,116,139,.4)', color: !showReplay && redoStack.length ? '#e2e8f0' : '#475569', borderRadius: 8, padding: '5px 9px', cursor: !showReplay && redoStack.length ? 'pointer' : 'default', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' } }, '\u21AA Redo' + (redoStack.length ? ' ' + redoStack.length : '')),
          el('button', { type: 'button', onClick: saveBuild, disabled: !blocks.length, title: t('stem.archstudio.save_to_gallery', 'Save to gallery'), style: { flex: '0 0 auto', background: blocks.length ? 'rgba(34,197,94,.16)' : 'rgba(71,85,105,.25)', border: blocks.length ? '1px solid rgba(34,197,94,.55)' : '1px solid transparent', color: blocks.length ? '#86efac' : '#475569', borderRadius: 8, padding: '5px 9px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' } }, '\uD83D\uDCBE Save'),
          el('button', { type: 'button', onClick: clearAll, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to clear the build' : 'Clear the live build', style: { flex: '0 0 auto', background: !showReplay && blocks.length ? 'rgba(239,68,68,.14)' : 'rgba(71,85,105,.25)', border: !showReplay && blocks.length ? '1px solid rgba(239,68,68,.45)' : '1px solid transparent', color: !showReplay && blocks.length ? '#fca5a5' : '#475569', borderRadius: 8, padding: '5px 9px', cursor: !showReplay && blocks.length ? 'pointer' : 'default', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' } }, '\uD83D\uDDD1\uFE0F Clear')
        ),
        el('div', { className: 'arch-studio-feature-strip', role: 'toolbar', 'aria-label': 'Architecture Studio features and actions', style: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, overflowX: 'auto', overflowY: 'hidden', padding: '2px 1px 4px' } },
        // Toggle pills
        el('div', { role: 'group', 'aria-label': 'Editor style', style: { flex: '0 0 auto', display: 'flex', padding: 2, gap: 2, borderRadius: 20, border: '1px solid #475569', background: 'rgba(2,6,23,.42)' } },
          [{ id: 'architect', label: '\uD83C\uDFDB\uFE0F Architect', color: '#a5b4fc', bg: 'rgba(99,102,241,.24)' }, { id: 'bricks', label: '\uD83E\uDDF1 Bricks', color: '#fca5a5', bg: 'rgba(239,68,68,.22)' }].map(function (option) {
            var selectedStyle = styleMode === option.id;
            return el('button', { key: option.id, type: 'button', 'aria-pressed': selectedStyle, onClick: function () { upd('styleMode', option.id); }, style: { padding: '3px 9px', borderRadius: 16, border: '1px solid ' + (selectedStyle ? option.color : 'transparent'), background: selectedStyle ? option.bg : 'transparent', color: selectedStyle ? option.color : '#64748b', cursor: 'pointer', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: selectedStyle ? '0 0 14px ' + option.bg : 'none' } }, option.label);
          })
        ),
        pillBtn(blueprintView ? '\uD83D\uDCD0 Blueprint' : '\uD83C\uDFD7\uFE0F 3D View', blueprintView, 'rgba(34,211,238,.2)', '#22d3ee', '#67e8f9', function () { upd('blueprintView', !blueprintView); }),
        pillBtn('\uD83C\uDFC6 ' + completedCount + '/10', showChallenges, 'rgba(245,158,11,.2)', '#f59e0b', '#fbbf24', function () { upd('showChallenges', !showChallenges); }),
        pillBtn('\uD83D\uDCD0 Analysis', showAnalysis, 'rgba(168,85,247,.2)', '#a855f7', '#c084fc', function () { upd('showAnalysis', !showAnalysis); }),
        pillBtn('\u2696\uFE0F Inquiry', showInquiryLab, 'rgba(139,92,246,.2)', '#8b5cf6', '#c4b5fd', function () { upd('showInquiryLab', !showInquiryLab); }),
        pillBtn('\uD83D\uDCBE Gallery', showGallery, 'rgba(34,197,94,.2)', '#22c55e', '#4ade80', function () { upd('showGallery', !showGallery); }),
        pillBtn('\uD83D\uDCC2 Templates', showTemplates, 'rgba(56,189,248,.2)', '#38bdf8', '#7dd3fc', function () { upd('showTemplates', !showTemplates); }),
        pillBtn('\uD83E\uDD16 AI Architect', showAI, 'rgba(244,114,182,.2)', '#f472b6', '#f9a8d4', function () { if (!showAI && !aiAdvice && !aiLoading) askAIArchitect(); upd('showAI', !showAI); }),
        pillBtn('\uD83D\uDCB0 Budget' + (budgetEnabled ? ' ' + budgetRemaining : ''), budgetEnabled, overBudget ? 'rgba(239,68,68,.2)' : 'rgba(245,158,11,.2)', overBudget ? '#ef4444' : '#f59e0b', overBudget ? '#fca5a5' : '#fbbf24', function () { upd('budgetEnabled', !budgetEnabled); }),
        pillBtn('\uD83D\uDCCB BOM', showBOM, 'rgba(251,191,36,.2)', '#fbbf24', '#fde68a', function () { upd('showBOM', !showBOM); }),
        pillBtn('\uD83D\uDCCA Stats', showStats, 'rgba(96,165,250,.2)', '#60a5fa', '#93c5fd', function () { upd('showStats', !showStats); }),
        pillBtn('\uD83C\uDFDB\uFE0F Styles', showStyleGuide, 'rgba(251,146,60,.2)', '#fb923c', '#fdba74', function () { upd('showStyleGuide', !showStyleGuide); }),
        pillBtn('\uD83C\uDFD7\uFE0F Phases', showPhases, 'rgba(45,212,191,.2)', '#2dd4bf', '#5eead4', function () { upd('showPhases', !showPhases); }),
        pillBtn('\uD83D\uDCE4 Share', showShare, 'rgba(129,140,248,.2)', '#818cf8', '#a5b4fc', function () { upd('showShare', !showShare); }),
        pillBtn('\uD83C\uDFB2 Generate', showRandomGen, 'rgba(168,85,247,.2)', '#a855f7', '#c084fc', function () { upd('showRandomGen', !showRandomGen); }),
        pillBtn('\uD83C\uDFA8 Colors', showColorPicker, 'rgba(244,114,182,.2)', '#f472b6', '#f9a8d4', function () { upd('showColorPicker', !showColorPicker); }),
        pillBtn('\uD83D\uDD2C Slice', showSlice, 'rgba(34,211,238,.2)', '#22d3ee', '#67e8f9', function () { upd('showSlice', !showSlice); }),
        pillBtn('\uD83D\uDD25 Heatmap', showHeatmap, 'rgba(239,68,68,.2)', '#ef4444', '#fca5a5', function () { upd('showHeatmap', !showHeatmap); }),
        pillBtn('\u23EA Replay', showReplay, 'rgba(251,191,36,.2)', '#fbbf24', '#fde68a', function () { if (!showReplay) startReplay(); else exitReplay(); }),
        pillBtn('\uD83D\uDD0D Filter', showFilter, 'rgba(96,165,250,.2)', '#60a5fa', '#93c5fd', function () { upd('showFilter', !showFilter); }),
        pillBtn('\uD83C\uDFC5 ' + badgeCount + '/' + badges.length, showBadges, 'rgba(251,146,60,.2)', '#fb923c', '#fdba74', function () { upd('showBadges', !showBadges); }),
        pillBtn('\uD83C\uDFE0 Floor Plans', showFloorPlans, 'rgba(45,212,191,.2)', '#2dd4bf', '#5eead4', function () { upd('showFloorPlans', !showFloorPlans); }),
        el('button', { onClick: applyGravity, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to apply gravity' : t('stem.archstudio.apply_gravity_drop_floating_blocks', 'Apply gravity (drop floating blocks)'), style: { background: !showReplay && blocks.length && analysis.unsupported > 0 ? 'rgba(239,68,68,.2)' : 'rgba(71,85,105,.3)', border: '1px solid ' + (!showReplay && blocks.length && analysis.unsupported > 0 ? '#ef4444' : '#475569'), color: !showReplay && blocks.length && analysis.unsupported > 0 ? '#fca5a5' : '#94a3b8', borderRadius: 20, padding: '4px 10px', cursor: !showReplay && blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\u2B07\uFE0F Gravity'),
        // Screenshot + Sound
        el('button', { type: 'button', onClick: takeScreenshot, title: t('stem.archstudio.screenshot', 'Screenshot'), 'aria-label': t('stem.archstudio.screenshot', 'Screenshot'), style: { background: 'rgba(71,85,105,.3)', border: '1px solid var(--allo-stem-border, #475569)', color: 'var(--allo-stem-text-soft, #94a3b8)', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCF8'),
        el('button', { onClick: function () { upd('soundEnabled', !soundEnabled); }, title: t('stem.archstudio.sound_effects', 'Sound effects'), 'aria-label': soundEnabled ? 'Mute sound effects' : 'Enable sound effects', 'aria-pressed': soundEnabled, style: { background: 'transparent', border: 'none', color: soundEnabled ? '#94a3b8' : '#475569', cursor: 'pointer', fontSize: 14, padding: '2px 6px' } }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        // Export buttons
        el('button', { onClick: exportBlueprint, disabled: !blocks.length, style: { background: blocks.length ? 'rgba(34,211,238,.15)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #22d3ee' : '1px solid transparent', color: blocks.length ? '#67e8f9' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCD0 Top SVG'),
        el('button', { onClick: exportSideBlueprint, disabled: !blocks.length, style: { background: blocks.length ? 'rgba(168,85,247,.15)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #a855f7' : '1px solid transparent', color: blocks.length ? '#c084fc' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83C\uDFD7\uFE0F Side SVG'),
        el('button', { onClick: exportSTL, disabled: !blocks.length, style: { flex: '0 0 auto', background: blocks.length ? 'linear-gradient(135deg,#b45309,#92400e)' : 'rgba(71,85,105,.3)', border: 'none', color: blocks.length ? '#fff' : '#475569', borderRadius: 8, padding: '5px 12px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' } }, '\uD83D\uDCE5 STL')
        )
      ),

      // ── Main content: sidebar + viewport ──
      el('div', { className: 'arch-studio-main', style: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' } },

        // ══════════════════════════════════════════════════════════
        // ── Left sidebar ──
        // ══════════════════════════════════════════════════════════
        el('aside', { id: 'arch-studio-tools', className: 'arch-studio-sidebar', 'aria-label': 'Architecture tools', style: { width: 'clamp(224px,21vw,252px)', flexShrink: 0, background: 'linear-gradient(180deg,var(--allo-stem-panel, #1e293b),rgba(15,23,42,.98))', padding: '11px 10px', overflowY: 'auto', borderRight: '1px solid var(--allo-stem-border, #334155)', display: 'flex', flexDirection: 'column', gap: 10 } },

          // Mode selector
          el('div', { className: 'arch-studio-mode-card' },
            el('div', { id: 'arch-mode-heading', style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Mode'),
            el('div', { role: 'group', 'aria-labelledby': 'arch-mode-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 4 } },
              modes.map(function (m) {
                var modeActive = mode === m.id;
                var modeTone = modeVisuals[m.id] || modeVisuals.place;
                return el('button', { key: m.id, type: 'button', 'aria-label': m.label + ' mode', 'aria-pressed': modeActive, title: m.label + ' mode' + (m.id === 'pick' ? ' (I)' : ''), onClick: function () { ArchGL.clearPreview(); upd('mode', m.id); }, style: {
                  minHeight: 34, padding: '6px 4px', fontSize: 11, fontWeight: 700,
                  border: '2px solid ' + (modeActive ? modeTone.border : '#475569'),
                  borderRadius: 8, background: modeActive ? modeTone.bg : 'rgba(30,41,59,.8)',
                  color: modeActive ? modeTone.color : '#94a3b8', cursor: 'pointer', textAlign: 'center',
                  boxShadow: modeActive ? '0 0 14px ' + modeTone.bg : 'none'
                } }, m.icon + ' ' + m.label);
              })
            )
          ),

          selectedBlock && el('section', {
            className: 'arch-studio-inspector',
            'data-arch-inspector': 'true',
            'data-arch-selected-key': selectedBlockKey,
            'aria-label': 'Selected block inspector',
            'aria-labelledby': 'arch-selected-heading',
            style: { padding: 9, borderRadius: 11, border: '2px solid #f59e0b', background: 'linear-gradient(145deg,rgba(120,53,15,.2),rgba(15,23,42,.82))', boxShadow: '0 10px 26px rgba(245,158,11,.13)' }
          },
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 } },
              el('span', { 'aria-hidden': 'true', style: { display: 'grid', placeItems: 'center', width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: 'rgba(15,23,42,.75)', border: '1px solid rgba(251,191,36,.45)', fontSize: 17 } }, selectedShapeMeta ? selectedShapeMeta.icon : '\uD83D\uDFE6'),
              el('div', { style: { minWidth: 0, flex: 1 } },
                el('h3', { id: 'arch-selected-heading', style: { margin: 0, color: '#fde68a', fontSize: 12, fontWeight: 850, letterSpacing: .2 } }, 'Selected Object'),
                el('div', { 'data-arch-inspector-identity': 'true', style: { marginTop: 1, color: '#cbd5e1', fontSize: 10, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
                  (selectedShapeMeta ? selectedShapeMeta.label : 'Block') + ' \u2022 ' + (selectedMaterialMeta ? selectedMaterialMeta.label : 'Stone'))
              ),
              el('span', { style: { flexShrink: 0, padding: '2px 5px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: archUnsupportedKeys[selectedBlockKey] ? '#fecaca' : '#bbf7d0', background: archUnsupportedKeys[selectedBlockKey] ? 'rgba(239,68,68,.16)' : 'rgba(34,197,94,.14)', border: '1px solid ' + (archUnsupportedKeys[selectedBlockKey] ? 'rgba(248,113,113,.55)' : 'rgba(74,222,128,.45)') } }, archUnsupportedKeys[selectedBlockKey] ? 'Floating' : 'Supported'),
              el('button', { type: 'button', 'aria-label': 'Clear selected block', title: 'Deselect (Escape)', onClick: function () { clearSelectedBlock(true); }, style: { minWidth: 28, minHeight: 28, border: '1px solid transparent', borderRadius: 6, background: 'transparent', color: '#fca5a5', cursor: 'pointer', padding: 4, fontSize: 13 } }, '\u2715')
            ),
            el('div', { 'data-arch-inspector-coordinates': 'true', role: 'group', 'aria-label': 'Selected object coordinates', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 6 } },
              [['X', selectedBlock.x], ['Y', selectedBlock.y], ['Z', selectedBlock.z]].map(function (entry) {
                return el('div', { key: entry[0], style: { padding: '4px 3px', borderRadius: 6, background: 'rgba(15,23,42,.72)', border: '1px solid rgba(71,85,105,.55)', textAlign: 'center' } },
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 700 } }, entry[0]),
                  el('strong', { style: { display: 'block', marginTop: 1, color: '#f8fafc', fontSize: 13 } }, entry[1]));
              })
            ),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 7, padding: '6px 7px', marginBottom: 6, borderRadius: 7, background: 'rgba(15,23,42,.58)', color: '#cbd5e1', fontSize: 10, lineHeight: 1.35 } },
              el('span', { 'aria-hidden': 'true', style: { width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: normalizeArchColor(selectedBlock.color, selectedBlock.material || 'stone'), border: '1px solid rgba(255,255,255,.55)', boxShadow: '0 0 10px rgba(255,255,255,.08)' } }),
              el('span', null, 'Color ', el('strong', { style: { color: '#f8fafc' } }, selectedColorLabel), el('span', { style: { color: '#64748b', margin: '0 5px' } }, '\u2022'), 'Rotation ', el('strong', { style: { color: '#f8fafc' } }, normalizeArchRotation(selectedBlock.rotation) + '\u00B0'))
            ),
            archUnsupportedKeys[selectedBlockKey] && el('div', { role: 'status', style: { marginBottom: 6, padding: '5px 6px', borderRadius: 6, background: 'rgba(239,68,68,.13)', border: '1px solid rgba(248,113,113,.35)', color: '#fecaca', fontSize: 10, fontWeight: 750 } }, '\u26A0 Floating: move down or add support'),
            el('div', { style: { fontSize: 10, color: '#cbd5e1', fontWeight: 750, marginBottom: 4 } }, 'Move one cell'),
            el('div', { 'data-arch-inspector-moves': 'true', role: 'group', 'aria-label': 'Move selected object one cell', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 7 } },
              selectedMoves.map(function (move) {
                var available = canSelectedAction(move);
                return el('button', { key: move.label, type: 'button', 'aria-label': move.label, title: move.label, disabled: !available, onClick: function () { commitSelectedAction(move); }, style: {
                  minHeight: 32, padding: '6px 3px', borderRadius: 6, border: '1px solid ' + (available ? '#64748b' : '#334155'), background: 'rgba(30,41,59,.8)', color: available ? '#e2e8f0' : '#475569', cursor: available ? 'pointer' : 'default', fontSize: 11, fontWeight: 750
                } }, move.glyph);
              })
            ),
            el('div', { 'data-arch-inspector-actions': 'true', role: 'group', 'aria-label': 'Selected object actions', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 } },
              el('button', { type: 'button', 'aria-label': 'Reveal selected block', onClick: revealSelectedBlock, style: { minHeight: 34, padding: '7px 4px', borderRadius: 7, border: '1px solid #38bdf8', background: 'rgba(56,189,248,.1)', color: '#7dd3fc', cursor: 'pointer', fontSize: 10, fontWeight: 750 } }, '\uD83D\uDC41 Reveal'),
              el('button', { type: 'button', 'aria-label': 'Duplicate selected block above', title: 'Duplicate selected block above (D)', disabled: !canSelectedAction({ type: 'duplicate', dx: 0, dy: 1, dz: 0 }), onClick: function () { commitSelectedAction({ type: 'duplicate', dx: 0, dy: 1, dz: 0 }); }, style: { minHeight: 34, padding: '7px 4px', borderRadius: 7, border: '1px solid #60a5fa', background: 'rgba(96,165,250,.1)', color: canSelectedAction({ type: 'duplicate', dx: 0, dy: 1, dz: 0 }) ? '#93c5fd' : '#475569', cursor: canSelectedAction({ type: 'duplicate', dx: 0, dy: 1, dz: 0 }) ? 'pointer' : 'default', fontSize: 10, fontWeight: 750 } }, '\u2398 Copy \u2191'),
              el('button', { type: 'button', 'aria-label': 'Apply current properties to selected block', disabled: !canSelectedAction({ type: 'replace', shape: activeShape, material: activeMaterial, color: activeColor, rotation: activeRotation }), onClick: function () { commitSelectedAction({ type: 'replace' }); }, style: { minHeight: 34, padding: '7px 4px', borderRadius: 7, border: '1px solid #a855f7', background: 'rgba(168,85,247,.1)', color: canSelectedAction({ type: 'replace', shape: activeShape, material: activeMaterial, color: activeColor, rotation: activeRotation }) ? '#d8b4fe' : '#475569', cursor: canSelectedAction({ type: 'replace', shape: activeShape, material: activeMaterial, color: activeColor, rotation: activeRotation }) ? 'pointer' : 'default', fontSize: 10, fontWeight: 750 } }, '\u2728 Apply Palette'),
              el('button', { type: 'button', 'aria-label': 'Delete selected block', title: 'Delete selected block (Delete)', disabled: showReplay, onClick: function () { commitSelectedAction({ type: 'delete' }); }, style: { minHeight: 34, padding: '7px 4px', borderRadius: 7, border: '1px solid #ef4444', background: 'rgba(239,68,68,.1)', color: showReplay ? '#475569' : '#fca5a5', cursor: showReplay ? 'default' : 'pointer', fontSize: 10, fontWeight: 750 } }, '\uD83D\uDDD1 Delete')
            )
          ),

          // Shape palette
          el('div', null,
            el('div', { id: 'arch-shapes-heading', style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Shapes'),
            el('div', { role: 'group', 'aria-labelledby': 'arch-shapes-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 4 } },
              shapes.map(function (s) {
                return el('button', { key: s.id, type: 'button', 'aria-label': s.label + ' shape', 'aria-pressed': activeShape === s.id, onClick: function () { upd('activeShape', s.id); }, style: {
                  minHeight: 46, padding: '6px 3px', fontSize: 11, fontWeight: 650,
                  border: '2px solid ' + (activeShape === s.id ? '#60a5fa' : '#334155'),
                  borderRadius: 8, background: activeShape === s.id ? 'rgba(96,165,250,.12)' : 'transparent',
                  color: activeShape === s.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer', textAlign: 'center', lineHeight: 1.2
                } }, el('div', { style: { fontSize: 18 } }, s.icon), s.label);
              })
            )
          ),

          // Rotation selector
          el('div', null,
            el('div', { id: 'arch-rotation-heading', style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD04 Rotation'),
            el('div', { role: 'group', 'aria-labelledby': 'arch-rotation-heading', style: { display: 'flex', gap: 3 } },
              rotations.map(function (r) {
                return el('button', { key: r.deg, type: 'button', 'aria-label': 'Use ' + r.label + ' rotation', 'aria-pressed': activeRotation === r.deg, onClick: function () { upd('activeRotation', r.deg); }, style: {
                  flex: 1, padding: '4px 2px', fontSize: 10, fontWeight: 600,
                  border: '2px solid ' + (activeRotation === r.deg ? '#f59e0b' : '#334155'),
                  borderRadius: 6, background: activeRotation === r.deg ? 'rgba(245,158,11,.12)' : 'transparent',
                  color: activeRotation === r.deg ? '#fbbf24' : '#94a3b8', cursor: 'pointer', textAlign: 'center'
                } }, r.icon + ' ' + r.label);
              })
            )
          ),

          // Material palette
          el('div', null,
            el('div', { id: 'arch-materials-heading', style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Materials'),
            el('div', { role: 'group', 'aria-labelledby': 'arch-materials-heading', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 4 } },
              materials.map(function (m) {
                return el('button', { key: m.id, type: 'button', 'aria-label': 'Use ' + m.label + ' material', 'aria-pressed': activeMaterial === m.id, onClick: function () { upd({ activeMaterial: m.id, activeColor: m.color }); }, style: {
                  minHeight: 40, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 5px', fontSize: 10, fontWeight: 650,
                  border: '2px solid ' + (activeMaterial === m.id ? m.color : '#334155'),
                  borderRadius: 8, background: activeMaterial === m.id ? 'rgba(255,255,255,.06)' : 'transparent',
                  color: activeMaterial === m.id ? '#f8fafc' : '#94a3b8', cursor: 'pointer', textAlign: 'left'
                } },
                  el('span', { 'aria-hidden': 'true', style: { width: 18, height: 18, borderRadius: 4, background: m.color, display: 'inline-block', flexShrink: 0, border: '1px solid rgba(255,255,255,.2)' } }),
                  m.icon + ' ' + m.label,
                  budgetEnabled && el('span', { style: { marginLeft: 'auto', fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, '\uD83D\uDCB2' + m.cost)
                );
              })
            )
          ),

          // Custom Color Palette
          el('div', null,
            el('div', { id: 'arch-colors-heading', style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFA8 Custom Color'),
            el('div', { role: 'group', 'aria-labelledby': 'arch-colors-heading', style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f8fafc','#94a3b8','#64748b','#1e293b'].map(function (c) {
                return el('button', { key: c, type: 'button', onClick: function () { upd('activeColor', c); }, title: c, 'aria-label': 'Use custom color ' + c, 'aria-pressed': activeColor === c, style: {
                  width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                  border: '2px solid ' + (activeColor === c ? '#fff' : 'rgba(255,255,255,.2)'),
                  boxShadow: activeColor === c ? '0 0 0 2px #0f172a,0 0 9px ' + c + '88' : 'none',
                  transition: 'box-shadow 0.15s ease,border-color 0.15s ease'
                } });
              })
            )
          ),

          // Mirror / Symmetry tools
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83E\uDE9E Mirror & Symmetry'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('button', { type: 'button', onClick: mirrorBuildX, disabled: showReplay || !blocks.length, 'aria-label': 'Mirror entire build across the X axis', title: showReplay ? 'Exit construction replay to mirror the build' : 'Mirror entire build across the X axis', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, background: 'transparent', color: !showReplay && blocks.length ? '#94a3b8' : '#475569', cursor: !showReplay && blocks.length ? 'pointer' : 'default' } }, '\u2194\uFE0F X'),
              el('button', { type: 'button', onClick: mirrorBuildZ, disabled: showReplay || !blocks.length, 'aria-label': 'Mirror entire build across the Z axis', title: showReplay ? 'Exit construction replay to mirror the build' : 'Mirror entire build across the Z axis', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, background: 'transparent', color: !showReplay && blocks.length ? '#94a3b8' : '#475569', cursor: !showReplay && blocks.length ? 'pointer' : 'default' } }, '\u2195\uFE0F Z'),
              el('button', { onClick: function () { upd('symmetryMode', !symmetryMode); }, 'aria-pressed': symmetryMode, 'aria-label': 'Symmetry: mirror edits across X equals zero', title: 'Mirror place, paint, and erase edits across X=0', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: symmetryMode ? '2px solid #f472b6' : '1px solid #334155', borderRadius: 6, background: symmetryMode ? 'rgba(244,114,182,.15)' : 'transparent', color: symmetryMode ? '#f9a8d4' : '#94a3b8', cursor: 'pointer' } }, symmetryMode ? '\u2705 Sym' : '\uD83E\uDE9E Sym')
            )
          ),

          // Budget bar (when enabled)
          budgetEnabled && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: overBudget ? '#f87171' : '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCB0 Budget'),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 } },
              el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)' } }, 'Spent: \uD83D\uDCB2' + totalCost),
              el('span', { style: { color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700 } }, 'Left: \uD83D\uDCB2' + budgetRemaining)
            ),
            el('div', { style: { height: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--allo-stem-border, #334155)' } },
              el('div', { style: { height: '100%', width: Math.min(100, budgetPct) + '%', background: overBudget ? 'linear-gradient(90deg,#ef4444,#dc2626)' : budgetPct > 75 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 4, transition: 'width 0.3s ease' } })
            ),
            // Budget slider
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 } },
              el('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, '\uD83D\uDCB2' + budget),
              el('input', { type: 'range', 'aria-label': 'budget', min: 50, max: 500, step: 25, value: budget, onChange: function (e) { upd('budget', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#f59e0b' } })
            )
          ),

          // Cost-by-material breakdown — which materials are eating the budget (count × unit cost).
          budgetEnabled && (function() {
            var byMat = {};
            blocks.forEach(function(b) { var mid = b.material || 'stone'; byMat[mid] = (byMat[mid] || 0) + 1; });
            var rows = materials.filter(function(m) { return byMat[m.id]; }).map(function(m) { return { m: m, count: byMat[m.id], cost: byMat[m.id] * (matCostLookup[m.id] || 0) }; }).sort(function(a, b) { return b.cost - a.cost; });
            if (!rows.length) return null;
            var sum = rows.reduce(function(s, r) { return s + r.cost; }, 0) || 1;
            return el('div', { style: { marginTop: 6 } },
              el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 } }, 'Cost by material'),
              el('div', { style: { display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--allo-stem-border, #334155)' } },
                rows.map(function(r) { return el('div', { key: r.m.id, title: r.m.label + ': ' + r.count + ' x $' + (matCostLookup[r.m.id] || 0) + ' = $' + r.cost, style: { width: (r.cost / sum * 100) + '%', background: r.m.color } }); })
              ),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 } },
                rows.map(function(r) {
                  return el('div', { key: r.m.id, style: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                    el('span', { style: { width: 8, height: 8, borderRadius: 2, background: r.m.color, display: 'inline-block', border: '1px solid rgba(148,163,184,0.4)' } }),
                    el('span', null, r.m.icon + ' ' + r.count + 'x  $' + r.cost));
                })
              )
            );
          })(),

          // Layer View
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDDC2\uFE0F Layer View'),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              el('span', { style: { fontSize: 10, color: viewLayer === -1 ? '#4ade80' : '#f59e0b', fontWeight: 700, minWidth: 28 } }, viewLayer === -1 ? 'All' : 'Y' + viewLayer),
              el('input', { type: 'range', 'aria-label': 'Visible floor layer', 'aria-valuetext': viewLayer === -1 ? 'All floors' : 'Floor Y equals ' + viewLayer, min: -1, max: Math.max(0, maxY), step: 1, value: viewLayer, onChange: function (e) { upd('viewLayer', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#60a5fa' } })
            ),
            viewLayer >= 0 && el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2 } },
              blocks.filter(function (b) { return b.y === viewLayer; }).length + ' blocks at Y=' + viewLayer
            )
          ),

          // Challenge Panel
          showChallenges && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFC6 Challenges (' + completedCount + '/10)'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' } },
              challenges.map(function (chItem) {
                var done = !!completedChallenges[chItem.id];
                var isActive = activeChallenge === chItem.id;
                return el('button', { key: chItem.id, onClick: function () { if (!done) upd('activeChallenge', isActive ? -1 : chItem.id); }, style: {
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', fontSize: 11, fontWeight: 600,
                  border: done ? '1px solid #22c55e' : isActive ? '2px solid #f59e0b' : '1px solid #334155',
                  borderRadius: 8, background: done ? 'rgba(34,197,94,.1)' : isActive ? 'rgba(245,158,11,.1)' : 'transparent',
                  color: done ? '#4ade80' : isActive ? '#fbbf24' : '#94a3b8', cursor: done ? 'default' : 'pointer', textAlign: 'left', width: '100%', opacity: done ? 0.7 : 1
                } },
                  el('span', { style: { fontSize: 13, flexShrink: 0 } }, done ? '\u2705' : chItem.icon),
                  el('div', { style: { flex: 1, minWidth: 0 } },
                    el('div', { style: { fontWeight: 700, fontSize: 10 } }, chItem.title),
                    el('div', { style: { fontSize: 10, lineHeight: 1.35, color: done ? '#22c55e' : '#94a3b8' } }, done ? 'Done!' : chItem.desc)
                  ),
                  el('span', { style: { fontSize: 11, color: done ? '#22c55e' : '#f59e0b', fontWeight: 700, flexShrink: 0 } }, done ? '\u2605' : '+' + chItem.xp)
                );
              })
            ),
            justCompleted && challengeProgress && el('button', { onClick: completeChallenge, style: {
              marginTop: 6, width: '100%', padding: '7px 10px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#b45309,#92400e)', color: '#fff',
              fontWeight: 700, fontSize: 11, cursor: 'pointer', animation: 'pulse 1.5s ease-in-out 2'
            } }, '\uD83C\uDFC6 Claim +' + challengeProgress.challenge.xp + ' XP!')
          ),

          // Gallery Panel
          showGallery && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCBE Saved Builds (' + galleryItems.length + ')'),
            galleryItems.length === 0
              ? el('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', padding: 6 } }, 'No saved builds yet. Click \uD83D\uDCBE Save!')
              : el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' } },
                galleryItems.map(function (item) {
                  return el('div', { key: item.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid var(--allo-stem-border, #334155)' } },
                    el('div', { style: { flex: 1, minWidth: 0 } },
                      el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f8fafc' } }, item.name),
                      el('div', { style: { fontSize: 10, lineHeight: 1.35, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, item.blockCount + ' blocks \u2022 ' + item.dims)
                    ),
                    el('button', { type: 'button', 'aria-label': 'Load saved build ' + item.name, title: showReplay ? 'Exit construction replay to load this build' : 'Load ' + item.name, disabled: showReplay, onClick: function () { loadBuild(item); }, style: { background: 'rgba(96,165,250,.15)', border: '1px solid #60a5fa', color: showReplay ? '#475569' : '#93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: showReplay ? 'default' : 'pointer' } }, '\u21E9'),
                    el('button', { type: 'button', 'aria-label': 'Delete saved build ' + item.name, title: 'Delete ' + item.name, onClick: function () { deleteBuild(item.id); }, style: { background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\u2715')
                  );
                })
              )
          ),

          // Templates Panel
          showTemplates && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCC2 Templates'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              templates.map(function (tpl) {
                return el('button', { key: tpl.id, disabled: showReplay, title: showReplay ? 'Exit construction replay to load a template' : tpl.name, onClick: function () { loadTemplate(tpl); }, style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 10, fontWeight: 600,
                  border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 8, background: 'transparent',
                  color: showReplay ? '#475569' : 'var(--allo-stem-text-soft, #94a3b8)', cursor: showReplay ? 'default' : 'pointer', textAlign: 'left', width: '100%'
                } },
                  el('span', { style: { fontSize: 16, flexShrink: 0 } }, tpl.icon),
                  el('div', { style: { flex: 1 } },
                    el('div', { style: { fontWeight: 700, color: '#f8fafc', fontSize: 11 } }, tpl.name),
                    el('div', { style: { fontSize: 10, lineHeight: 1.35, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, tpl.desc)
                  )
                );
              })
            )
          ),

          // Earthquake Simulator
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDF0B Earthquake Test'),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 } },
              el('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', minWidth: 20 } }, quakeIntensity + '/10'),
              el('input', { type: 'range', 'aria-label': t('stem.archstudio.quake_intensity', 'quake intensity'), min: 1, max: 10, value: quakeIntensity, onChange: function (e) { upd('quakeIntensity', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#ef4444' } })
            ),
            el('button', { onClick: runEarthquake, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to run an earthquake test' : 'Run earthquake test', style: {
              width: '100%', padding: '6px 10px', borderRadius: 8, border: 'none',
              background: !showReplay && blocks.length ? 'linear-gradient(135deg,#b91c1c,#991b1b)' : 'rgba(71,85,105,.3)',
              color: !showReplay && blocks.length ? '#fff' : '#475569', fontWeight: 700, fontSize: 10, cursor: !showReplay && blocks.length ? 'pointer' : 'default'
            } }, '\uD83C\uDF0B Shake! (Intensity ' + quakeIntensity + ')'),
            quakeResult && el('div', { style: { marginTop: 4, padding: '5px 8px', background: quakeResult.pct >= 70 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', border: '1px solid ' + (quakeResult.pct >= 70 ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'), borderRadius: 8, fontSize: 11, color: quakeResult.pct >= 70 ? '#4ade80' : '#fca5a5', lineHeight: 1.4 } },
              quakeResult.rating + ' \u2022 ' + quakeResult.pct + '% survived \u2022 ' + quakeResult.fallen + ' fell'
            )
          ),

          // Copy Region (Duplicate)
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCB Duplicate Build'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('button', { type: 'button', onClick: function () { duplicateBuild(buildW + 1, 0, 0); }, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to duplicate the build' : t('stem.archstudio.copy_to_the_right', 'Copy to the right'), 'aria-label': t('stem.archstudio.copy_to_the_right', 'Copy to the right'), style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, background: 'transparent', color: !showReplay && blocks.length ? '#94a3b8' : '#475569', cursor: !showReplay && blocks.length ? 'pointer' : 'default' } }, '\u27A1\uFE0F +X'),
              el('button', { type: 'button', onClick: function () { duplicateBuild(0, 0, buildD + 1); }, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to duplicate the build' : t('stem.archstudio.copy_forward', 'Copy forward'), 'aria-label': t('stem.archstudio.copy_forward', 'Copy forward'), style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, background: 'transparent', color: !showReplay && blocks.length ? '#94a3b8' : '#475569', cursor: !showReplay && blocks.length ? 'pointer' : 'default' } }, '\u2B07\uFE0F +Z'),
              el('button', { type: 'button', onClick: function () { duplicateBuild(0, buildH, 0); }, disabled: showReplay || !blocks.length, title: showReplay ? 'Exit construction replay to duplicate the build' : t('stem.archstudio.copy_upward', 'Copy upward'), 'aria-label': t('stem.archstudio.copy_upward', 'Copy upward'), style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, background: 'transparent', color: !showReplay && blocks.length ? '#94a3b8' : '#475569', cursor: !showReplay && blocks.length ? 'pointer' : 'default' } }, '\u2B06\uFE0F +Y')
            )
          ),

          // Real-World Scale
          totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCF Real-World Scale'),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '6px 8px' } },
              el('div', null, '\uD83D\uDCCF ' + realW + 'm \u00D7 ' + realD + 'm \u00D7 ' + realH + 'm'),
              el('div', null, '\uD83D\uDCCF ' + realWFt + 'ft wide \u00D7 ' + realHFt + 'ft tall'),
              el('div', null, '\uD83D\uDCE6 Volume: ' + realVolM3.toFixed(1) + ' m\u00B3'),
              el('div', null, '\u2696\uFE0F Est. weight: ' + realWeightTons.toFixed(1) + ' tonnes'),
              scaleComparisons.length > 0 && el('div', { style: { color: '#fbbf24', fontWeight: 600, marginTop: 2 } }, '\uD83C\uDFD7\uFE0F ' + scaleComparisons[0])
            )
          ),

          // Bill of Materials
          showBOM && totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCB Bill of Materials'),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 2, fontWeight: 600 } }, 'By Material:'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              bomMaterialEntries.map(function (e) {
                return el('div', { key: e.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 10 } },
                  el('span', null, e.icon),
                  el('span', { style: { color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 600, flex: 1 } }, e.label),
                  el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)' } }, '\u00D7' + e.count),
                  budgetEnabled && el('span', { style: { color: '#fbbf24', fontSize: 10 } }, '\uD83D\uDCB2' + e.cost)
                );
              })
            ),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 2, marginTop: 6, fontWeight: 600 } }, 'By Shape:'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              bomShapeEntries.map(function (e) {
                return el('div', { key: e.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 10 } },
                  el('span', null, e.icon),
                  el('span', { style: { color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 600, flex: 1 } }, e.label),
                  el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)' } }, '\u00D7' + e.count)
                );
              })
            )
          ),

          // Block Statistics Chart
          showStats && totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCA Block Stats'),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 3, fontWeight: 600 } }, 'Material Distribution'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              bomMaterialEntries.map(function (e) {
                var pct = maxMatCount > 0 ? Math.round((e.count / maxMatCount) * 100) : 0;
                var mat = materials.find(function (m) { return m.id === e.id; });
                var barColor = mat ? mat.color: 'var(--allo-stem-text-soft, #94a3b8)';
                return el('div', { key: e.id },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 1 } },
                    el('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, e.icon + ' ' + e.label),
                    el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)' } }, e.count)
                  ),
                  el('div', { style: { height: 6, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 3, overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: pct + '%', background: barColor, borderRadius: 3, transition: 'width 0.3s ease' } })
                  )
                );
              })
            ),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 3, marginTop: 8, fontWeight: 600 } }, 'Shape Distribution'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              bomShapeEntries.map(function (e) {
                var pct = maxShapeCount > 0 ? Math.round((e.count / maxShapeCount) * 100) : 0;
                return el('div', { key: e.id },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 1 } },
                    el('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, e.icon + ' ' + e.label),
                    el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)' } }, e.count)
                  ),
                  el('div', { style: { height: 6, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 3, overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: pct + '%', background: '#60a5fa', borderRadius: 3, transition: 'width 0.3s ease' } })
                  )
                );
              })
            )
          ),

          // Architecture Styles Guide
          showStyleGuide && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fdba74', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFDB\uFE0F Architecture Styles'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' } },
              archStyles.map(function (st) {
                return el('div', { key: st.name, style: { padding: '6px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid var(--allo-stem-border, #334155)' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 } },
                    el('span', { style: { fontSize: 14 } }, st.icon),
                    el('span', { style: { fontWeight: 700, fontSize: 11, color: '#f8fafc' } }, st.name),
                    el('span', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginLeft: 'auto' } }, st.era)
                  ),
                  el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.4, marginBottom: 3 } }, st.features),
                  el('div', { style: { fontSize: 11, color: '#60a5fa', fontWeight: 600 } }, '\uD83D\uDCA1 ' + st.tips)
                );
              })
            )
          ),

          // Construction Phases
          showPhases && phases.length > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFD7\uFE0F Construction Phases'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' } },
              phases.map(function (ph, pi) {
                var phPct = totalBlocks > 0 ? Math.round((ph.cumulative / totalBlocks) * 100) : 0;
                return el('div', { key: pi, style: { padding: '5px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid var(--allo-stem-border, #334155)' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 } },
                    el('span', { style: { fontWeight: 700, fontSize: 10, color: '#f8fafc' } }, (pi + 1) + '. ' + ph.name),
                    el('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, 'Y=' + ph.y + ' \u2022 ' + ph.count + ' blocks')
                  ),
                  el('div', { style: { height: 4, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 2, overflow: 'hidden', marginBottom: 2 } },
                    el('div', { style: { height: '100%', width: phPct + '%', background: 'linear-gradient(90deg,#2dd4bf,#14b8a6)', borderRadius: 2 } })
                  ),
                  el('div', { style: { fontSize: 10, lineHeight: 1.35, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, Object.keys(ph.mats).map(function (m) { return m + ':\u00D7' + ph.mats[m]; }).join(' \u2022 '))
                );
              })
            )
          ),

          // Share / Import-Export
          showShare && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCE4 Share Build'),
            el('button', { onClick: exportShareCode, disabled: !blocks.length, style: {
              width: '100%', padding: '6px 10px', borderRadius: 8, border: 'none', marginBottom: 4,
              background: blocks.length ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(71,85,105,.3)',
              color: blocks.length ? '#fff' : '#475569', fontWeight: 700, fontSize: 10, cursor: blocks.length ? 'pointer' : 'default'
            } }, '\uD83D\uDCCB Copy Share Code'),
            shareCode && el('div', { style: { marginBottom: 4 } },
              el('textarea', { value: shareCode, readOnly: true, 'aria-label': t('stem.archstudio.share_code', 'Share code to copy'), onClick: function (e) { e.target.select(); }, style: {
                width: '100%', height: 50, padding: 6, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6,
                color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 10, fontFamily: 'monospace', resize: 'none'
              }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' })
            ),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 4 } }, 'Paste a code below to import:'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('input', { type: 'text', placeholder: t('stem.archstudio.paste_share_code', 'Paste share code...'), value: d.importCode || '',
                'aria-label': t('stem.archstudio.paste_share_code_to_import_a_design', 'Paste share code to import a design'),
                onChange: function (e) { upd('importCode', e.target.value); },
                style: { flex: 1, padding: '5px 8px', background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', borderRadius: 6, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 10 }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'
              }),
              el('button', { onClick: function () { importShareCode(d.importCode); }, disabled: showReplay, title: showReplay ? 'Exit construction replay to import a build' : 'Import build', style: {
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: showReplay ? 'rgba(71,85,105,.3)' : 'linear-gradient(135deg,#15803d,#166534)', color: showReplay ? '#475569' : '#fff', fontWeight: 700, fontSize: 11, cursor: showReplay ? 'default' : 'pointer'
              } }, '\u21E9')
            )
          ),

          // Keyboard Shortcuts Reference
          el('div', { style: { marginTop: 4, padding: '6px 8px', background: 'rgba(15,23,42,.5)', borderRadius: 8, border: '1px solid var(--allo-stem-border, #1e293b)' } },
            el('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--allo-stem-text-soft, #475569)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\u2328\uFE0F Shortcuts'),
            el('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #64748b)', lineHeight: 1.6 } },
              el('div', null, 'Ctrl+Z Undo \u2022 Ctrl+Y or Ctrl+Shift+Z Redo'),
              el('div', null, 'P Place \u2022 E Erase \u2022 A Paint \u2022 I Pick'),
              el('div', null, '1-4 Modes \u2022 R Rotate \u2022 Page Up/Down Floor'),
              el('div', null, 'D Duplicate selected \u2022 Delete Remove \u2022 Esc Deselect'),
              el('div', null, 'S Screenshot \u2022 G Gravity')
            )
          ),

          // ── Random Build Generator ──
          showRandomGen && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFB2 Random Generator'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              randomPresets.map(function (preset) {
                return el('button', { key: preset.id, disabled: showReplay, title: showReplay ? 'Exit construction replay to generate a build' : preset.name, onClick: function () { generateRandom(preset.id); }, style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
                  background: 'rgba(30,41,59,.5)', border: '1px solid var(--allo-stem-border, #334155)', cursor: showReplay ? 'default' : 'pointer', opacity: showReplay ? 0.55 : 1, width: '100%', textAlign: 'left'
                } },
                  el('span', { style: { fontSize: 14 } }, preset.icon),
                  el('div', null,
                    el('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, preset.name),
                    el('div', { style: { fontSize: 10, lineHeight: 1.35, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, preset.desc)
                  )
                );
              })
            )
          ),

          // ── Custom Color Palette ──
          showColorPicker && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f9a8d4', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFA8 Color Palette'),
            el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 } },
              colorSwatches.map(function (c) {
                return el('button', { key: c, type: 'button', 'aria-label': 'Use colour ' + c.toUpperCase(), 'aria-pressed': customColor === c, title: c.toUpperCase(), onClick: function () { upd({ activeColor: c, customColor: c }); }, style: {
                  width: 24, height: 24, borderRadius: 4, border: customColor === c ? '2px solid #fff' : '1px solid #475569',
                  background: c, cursor: 'pointer', padding: 0
                } });
              })
            ),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              el('input', { type: 'color', 'aria-label': t('stem.archstudio.custom_color', 'Custom color'), value: customColor, onChange: function (e) { upd({ activeColor: e.target.value, customColor: e.target.value }); }, style: { width: 28, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' } }),
              el('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontFamily: 'monospace' } }, customColor),
              el('button', { type: 'button', onClick: function () { upd({ activeColor: customColor, mode: 'paint' }); }, style: {
                marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: 'none',
                background: 'linear-gradient(135deg,#be185d,#9d174d)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer'
              } }, '\uD83C\uDFA8 Paint')
            )
          ),

          // ── Cross-Section Slicer ──
          showSlice && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD2C Cross-Section (Z)'),
            el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 4 } },
              el('button', { type: 'button', 'aria-label': 'Show all Z cross-sections', 'aria-pressed': !sliceZSelected, onClick: function () { upd({ sliceZ: -1, sliceZSelected: false }); }, style: {
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: !sliceZSelected ? 'rgba(34,211,238,.2)' : 'transparent', border: !sliceZSelected ? '1px solid #22d3ee' : '1px solid #334155', color: !sliceZSelected ? '#67e8f9' : '#94a3b8'
              } }, 'All'),
              sliceZLevels.map(function (z) {
                return el('button', { key: z, type: 'button', 'aria-label': 'Show Z cross-section ' + z, 'aria-pressed': sliceZSelected && sliceZ === z, onClick: function () { upd({ sliceZ: z, sliceZSelected: true }); }, style: {
                  padding: '3px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: sliceZSelected && sliceZ === z ? 'rgba(34,211,238,.2)' : 'transparent', border: sliceZSelected && sliceZ === z ? '1px solid #22d3ee' : '1px solid #334155', color: sliceZSelected && sliceZ === z ? '#67e8f9' : '#94a3b8'
                } }, 'Z=' + z);
              })
            ),
            sliceZSelected && el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', padding: '4px 6px', background: 'rgba(30,41,59,.5)', borderRadius: 6 } },
              '\uD83D\uDD2C Slice Z=' + sliceZ + ': ' + sliceBlocks.length + ' block' + (sliceBlocks.length !== 1 ? 's' : ''),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 } },
                sliceBlocks.map(function (b, i) {
                  var sh = shapes.find(function (s) { return s.id === (b.shape || 'block'); });
                  return el('span', { key: i, style: { fontSize: 10, padding: '2px 5px', background: 'rgba(30,41,59,.8)', borderRadius: 4, color: 'var(--allo-stem-text, #cbd5e1)' } },
                    (sh ? sh.icon : '') + ' (' + b.x + ',' + b.y + ')'
                  );
                })
              )
            )
          ),

          // ── Structural Load Heatmap Legend ──
          showHeatmap && totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD25 Load Heatmap'),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.5, marginBottom: 4 } },
              'Shows load (weight supported) per block column. Blocks at the base carry the most load.'
            ),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 } },
              el('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' } }),
              el('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', position: 'absolute', fontSize: 7, color: 'var(--allo-stem-text-soft, #94a3b8)', pointerEvents: 'none' } })
            ),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
              el('span', null, 'Low'),
              el('span', null, 'Max: ' + maxLoad.toFixed(1))
            ),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, maxHeight: 120, overflowY: 'auto' } },
              Object.keys(blockLoads).sort(function (a, b) { return blockLoads[b] - blockLoads[a]; }).slice(0, 10).map(function (key) {
                var load = blockLoads[key];
                var pct = maxLoad > 0 ? Math.round((load / maxLoad) * 100) : 0;
                var heatColor = pct > 66 ? '#ef4444' : pct > 33 ? '#eab308' : '#22c55e';
                return el('div', { key: key, style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 } },
                  el('span', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', minWidth: 50, fontFamily: 'monospace' } }, key),
                  el('div', { style: { flex: 1, height: 4, background: 'var(--allo-stem-canvas, #0f172a)', borderRadius: 2, overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: pct + '%', background: heatColor, borderRadius: 2 } })
                  ),
                  el('span', { style: { color: heatColor, fontWeight: 600, minWidth: 30, textAlign: 'right' } }, load.toFixed(1))
                );
              })
            )
          ),

          // ── Time-Lapse Replay Controls ──
          showReplay && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\u23EA Construction Replay'),
            replayFrames === 0
              ? el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, 'No undo history yet. Build something first!')
              : el('div', null,
                  el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 4, textAlign: 'center', fontWeight: 600 } }, replayLabel),
                  el('div', { role: 'note', style: { fontSize: 10, color: '#cbd5e1', marginBottom: 6, textAlign: 'center', lineHeight: 1.4 } },
                    'Viewport and heatmap show this historical step. Analysis, wind, badges, and totals describe the live build.'),
                  el('div', { style: { display: 'flex', gap: 4, justifyContent: 'center' } },
                    el('button', { type: 'button', 'aria-label': t('stem.archstudio.replay_first', 'Replay first construction step'), onClick: function () { upd('replayStep', 0); }, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid var(--allo-stem-border, #334155)', background: 'transparent', color: 'var(--allo-stem-text-soft, #94a3b8)', cursor: 'pointer', fontSize: 10 } }, '\u23EE'),
                    el('button', { type: 'button', 'aria-label': t('stem.archstudio.replay_previous', 'Replay previous construction step'), onClick: function () { stepReplay(-1); }, disabled: replayStep <= 0, style: { padding: '4px 10px', borderRadius: 6, border: '1px solid var(--allo-stem-border, #334155)', background: 'transparent', color: replayStep > 0 ? '#e2e8f0' : '#475569', cursor: replayStep > 0 ? 'pointer' : 'default', fontSize: 10 } }, '\u25C0'),
                    el('button', { type: 'button', 'aria-label': t('stem.archstudio.replay_next', 'Replay next construction step'), onClick: function () { stepReplay(1); }, disabled: replayStep >= replayFrames, style: { padding: '4px 10px', borderRadius: 6, border: '1px solid var(--allo-stem-border, #334155)', background: 'transparent', color: replayStep < replayFrames ? '#e2e8f0' : '#475569', cursor: replayStep < replayFrames ? 'pointer' : 'default', fontSize: 10 } }, '\u25B6'),
                    el('button', { type: 'button', 'aria-label': t('stem.archstudio.replay_last', 'Replay final construction step'), onClick: function () { upd('replayStep', replayFrames); }, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid var(--allo-stem-border, #334155)', background: 'transparent', color: 'var(--allo-stem-text-soft, #94a3b8)', cursor: 'pointer', fontSize: 10 } }, '\u23ED')
                  ),
                  el('div', { style: { marginTop: 4 } },
                    el('input', { type: 'range', 'aria-label': t('stem.archstudio.replay_step', 'replay step'), min: 0, max: replayFrames, value: replayStep >= 0 ? replayStep : replayFrames, onChange: function (e) { upd('replayStep', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#fbbf24' } })
                  ),
                  el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', textAlign: 'center', marginTop: 2 } },
                    (replayStep >= 0 && replayStep < replayFrames ? replayBlocks.length : totalBlocks) + ' blocks at this step'
                  ),
                  el('button', { onClick: exitReplay, style: { width: '100%', marginTop: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(71,85,105,.3)', color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600, fontSize: 11, cursor: 'pointer' } }, '\u2716 Exit Replay')
                )
          ),

          // ── Block Search / Filter ──
          showFilter && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD0D Block Filter'),
            el('div', { style: { marginBottom: 4 } },
              el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 2 } }, 'Material:'),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 } },
                el('button', { type: 'button', 'aria-label': 'Show all materials', 'aria-pressed': !filterMaterial, onClick: function () { upd('filterMaterial', ''); }, style: { padding: '3px 7px', borderRadius: 5, fontSize: 10, border: !filterMaterial ? '1px solid #60a5fa' : '1px solid #334155', background: !filterMaterial ? 'rgba(96,165,250,.15)' : 'transparent', color: !filterMaterial ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, 'All'),
                materials.map(function (m) {
                  return el('button', { key: m.id, type: 'button', 'aria-label': 'Filter by ' + m.label + ' material', 'aria-pressed': filterMaterial === m.id, onClick: function () { upd('filterMaterial', m.id); }, style: { padding: '3px 7px', borderRadius: 5, fontSize: 10, border: filterMaterial === m.id ? '1px solid #60a5fa' : '1px solid #334155', background: filterMaterial === m.id ? 'rgba(96,165,250,.15)' : 'transparent', color: filterMaterial === m.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, m.icon + ' ' + m.label);
                })
              )
            ),
            el('div', { style: { marginBottom: 4 } },
              el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 2 } }, 'Shape:'),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 } },
                el('button', { type: 'button', 'aria-label': 'Show all shapes', 'aria-pressed': !filterShape, onClick: function () { upd('filterShape', ''); }, style: { padding: '3px 7px', borderRadius: 5, fontSize: 10, border: !filterShape ? '1px solid #60a5fa' : '1px solid #334155', background: !filterShape ? 'rgba(96,165,250,.15)' : 'transparent', color: !filterShape ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, 'All'),
                shapes.map(function (s) {
                  return el('button', { key: s.id, type: 'button', 'aria-label': 'Filter by ' + s.label + ' shape', 'aria-pressed': filterShape === s.id, title: s.label, onClick: function () { upd('filterShape', s.id); }, style: { padding: '3px 7px', borderRadius: 5, fontSize: 10, border: filterShape === s.id ? '1px solid #60a5fa' : '1px solid #334155', background: filterShape === s.id ? 'rgba(96,165,250,.15)' : 'transparent', color: filterShape === s.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, s.icon);
                })
              )
            ),
            el('div', { style: { padding: '4px 8px', background: filterActive ? 'rgba(96,165,250,.1)' : 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 11, color: filterActive ? '#93c5fd' : '#94a3b8', fontWeight: 600 } },
              '\uD83D\uDD0D ' + filterCount + ' block' + (filterCount !== 1 ? 's' : '') + ' match' + (filterCount === 1 ? 'es' : '')
            ),
            filterActive && el('button', { onClick: deleteFiltered, disabled: showReplay, title: showReplay ? 'Exit construction replay to remove matching blocks' : 'Remove matching blocks', style: {
              width: '100%', marginTop: 4, padding: '5px 10px', borderRadius: 6, border: 'none',
              background: showReplay ? 'rgba(71,85,105,.3)' : 'linear-gradient(135deg,#b91c1c,#991b1b)', color: showReplay ? '#475569' : '#fff', fontWeight: 700, fontSize: 11, cursor: showReplay ? 'default' : 'pointer'
            } }, '\uD83D\uDDD1\uFE0F Remove ' + filterCount + ' Matching Blocks')
          ),

          // ── Achievement Badges ──
          showBadges && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fdba74', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFC5 Badges (' + badgeCount + '/' + badges.length + ')'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' } },
              badges.map(function (badge) {
                var earned = !!earnedBadges[badge.id];
                return el('div', { key: badge.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: earned ? 'rgba(251,146,60,.08)' : 'rgba(30,41,59,.4)', borderRadius: 8, border: earned ? '1px solid rgba(251,146,60,.3)' : '1px solid #1e293b', opacity: earned ? 1 : 0.6 } },
                  el('span', { style: { fontSize: 16, filter: earned ? 'none' : 'grayscale(1)' } }, badge.icon),
                  el('div', { style: { flex: 1 } },
                    el('div', { style: { fontSize: 10, fontWeight: 700, color: earned ? '#f8fafc' : '#94a3b8' } }, badge.name),
                    el('div', { style: { fontSize: 10, lineHeight: 1.35, color: earned ? '#94a3b8' : '#64748b' } }, badge.desc)
                  ),
                  earned && el('span', { style: { fontSize: 10, color: '#fb923c' } }, '\u2713')
                );
              })
            )
          ),

          // ── Wind Resistance ──
          totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDF2C\uFE0F Wind Resistance'),
            el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '6px 8px' } },
              el('div', null, windAnalysis.emoji + ' Rating: ' + windAnalysis.rating + (windAnalysis.score != null ? ' (' + windAnalysis.score + '%)' : '')),
              el('div', null, '\uD83D\uDCD0 Frontal area: ' + windAnalysis.frontalArea + ' u\u00B2'),
              el('div', null, '\uD83D\uDCD0 Side area: ' + windAnalysis.sideArea + ' u\u00B2'),
              el('div', null, '\uD83C\uDF2C\uFE0F Drag coeff: ' + windAnalysis.dragCoeff),
              el('div', { style: { marginTop: 2, fontSize: 10, lineHeight: 1.35, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                parseFloat(windAnalysis.dragCoeff) > 0.8 ? '\uD83D\uDCA1 Use domes, pyramids, or cylinders to reduce drag!' :
                parseFloat(windAnalysis.dragCoeff) > 0.5 ? '\uD83D\uDCA1 Good mix of aerodynamic shapes!' :
                '\u2705 Very aerodynamic design!')
            )
          ),

          // (The 3D view lives in the main viewport, not here — a building in a
          //  185px sidebar column was unreadable, and the main panel was empty.)

          // ── Multi-Floor Plan View ──
          showFloorPlans && floorPlans.length > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFE2 Floor Plans'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' } },
              floorPlans.map(function (floor) {
                // Mini grid for each floor
                var fMinX = Infinity, fMaxX = -Infinity, fMinZ = Infinity, fMaxZ = -Infinity;
                floor.blocks.forEach(function (b) { if (b.x < fMinX) fMinX = b.x; if (b.x > fMaxX) fMaxX = b.x; if (b.z < fMinZ) fMinZ = b.z; if (b.z > fMaxZ) fMaxZ = b.z; });
                var fW = fMaxX - fMinX + 1, fD = fMaxZ - fMinZ + 1;
                var cellPx = Math.min(12, Math.floor(140 / Math.max(fW, fD, 1)));
                var cells = [];
                for (var fz = fMinZ; fz <= fMaxZ; fz++) for (var fx = fMinX; fx <= fMaxX; fx++) {
                  var fb = floor.grid[fx + ',' + fz];
                  cells.push(el('div', { key: fx + ',' + fz, style: {
                    width: cellPx, height: cellPx, borderRadius: 1,
                    background: fb ? (fb.color || matColorLookup[fb.material || 'stone'] || '#94a3b8') : 'rgba(30,41,59,.3)',
                    border: fb ? 'none' : '1px solid rgba(51,65,85,.3)'
                  } }));
                }
                return el('div', { key: floor.y, style: { padding: '5px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid var(--allo-stem-border, #334155)' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                    el('span', { style: { fontSize: 10, fontWeight: 700, color: '#f8fafc' } }, 'Y=' + floor.y),
                    el('span', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, floor.count + ' blocks')
                  ),
                  el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + fW + ', ' + cellPx + 'px)', gap: 1, justifyContent: 'center' } }, cells)
                );
              })
            )
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── Main viewport area ──
        // ══════════════════════════════════════════════════════════
        el('div', { className: 'arch-studio-viewport' + (activeViewChips.length ? ' arch-studio-has-view-hud' : ''), style: { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' } },
          el('div', { className: 'arch-studio-stage', 'data-arch-stage': 'true', style: { flex: 1, minHeight: 260, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' } },
          // The build itself. This viewport previously rendered a spinner that
          // never resolved: threeReady reads a host flag this tool never set,
          // and the canvas behind it had no ref and no renderer anywhere in the
          // file, so the panel was dead on both branches. The overlay below it
          // has always promised "Drag - Orbit" and "Scroll - Zoom", so those are
          // wired here rather than left as decoration.
          mainUse3d && el('canvas', {
            ref: archGlRef,
            id: 'arch-studio-canvas',
            'data-arch-gl': 'true',
            role: 'img',
            tabIndex: 0,
            'data-a11y-static': 'true',
            'aria-describedby': 'arch-gl-description',
            'aria-label': archGlAlt,
            style: { flex: 1, width: '100%', display: 'block', minHeight: 260, visibility: archGlLive ? 'visible' : 'hidden', cursor: showReplay ? 'default' : mode === 'place' ? 'crosshair' : mode === 'erase' ? 'not-allowed' : mode === 'pick' ? 'copy' : 'pointer', touchAction: 'none' },
            onPointerDown: function (ev) {
              ArchGL.clearPreview();
              archDrag.suppressClick = false;
              archDrag.current = { x: ev.clientX, y: ev.clientY, rx: archRot.rotX, ry: archRot.rotY };
              try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (_) {}
            },
            onPointerMove: function (ev) {
              if (!archDrag.current) {
                if (showReplay) { ArchGL.clearPreview(); return; }
                var hoverTarget = ArchGL.pick(ev.clientX, ev.clientY);
                ArchGL.preview(hoverTarget, {
                  mode: mode, shape: activeShape, rotation: activeRotation,
                  hex: archHexFor({ x: hoverTarget && hoverTarget.place ? hoverTarget.place.x : 0, y: hoverTarget && hoverTarget.place ? hoverTarget.place.y : 0, z: hoverTarget && hoverTarget.place ? hoverTarget.place.z : 0, material: activeMaterial, color: activeColor })
                });
                return;
              }
              var dx = ev.clientX - archDrag.current.x;
              var dy = ev.clientY - archDrag.current.y;
              if (dx * dx + dy * dy > 25) archDrag.suppressClick = true;
              upd('rot3d', Object.assign({}, archRot, {
                rotX: Math.max(-88, Math.min(88, archDrag.current.rx + dy * 0.4)),
                rotY: archDrag.current.ry + dx * 0.4
              }));
            },
            onPointerUp: function (ev) {
              archDrag.current = null;
              try { ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (_) {}
            },
            onPointerCancel: function () { archDrag.current = null; archDrag.suppressClick = false; ArchGL.clearPreview(); },
            onPointerLeave: function () { if (!archDrag.current) ArchGL.clearPreview(); },
            onClick: editAtPointer,
            onKeyDown: function (ev) {
              var cameraKeys = {
                ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                '+': 'zoomIn', '=': 'zoomIn', '-': 'zoomOut', '_': 'zoomOut', Home: 'reset', '0': 'reset'
              };
              var cameraAction = cameraKeys[ev.key];
              if (cameraAction) {
                ev.preventDefault();
                setArchCamera(cameraAction);
                if (announceToSR) announceToSR(cameraAction === 'reset' ? 'Three-dimensional view reset.' : 'Three-dimensional view adjusted.');
                return;
              }
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                openArchGridForKeyboard();
              }
            },
            onWheel: function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              upd('rot3d', Object.assign({}, archRot, {
                scale: Math.max(0.3, Math.min(3, (archRot.scale || 1) + (ev.deltaY > 0 ? -0.12 : 0.12)))
              }));
            }
          }),
          mainUse3d && !archGlLive && el('div', { role: 'status', 'aria-live': 'polite', 'aria-busy': 'true', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 14, padding: 20 } },
            el('div', { style: { width: 'min(300px,90%)', textAlign: 'center', padding: '20px 18px', borderRadius: 16, background: 'rgba(15,23,42,.78)', border: '1px solid rgba(100,116,139,.55)', boxShadow: '0 18px 42px rgba(2,6,23,.35)', backdropFilter: 'blur(10px)' } },
              el('div', { 'aria-hidden': 'true', style: { display: 'grid', placeItems: 'center', width: 46, height: 46, margin: '0 auto 10px', borderRadius: 14, fontSize: 25, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.3)', animation: 'spin 2s linear infinite' } }, '⚙️'),
              el('div', { style: { color: '#e2e8f0', fontWeight: 800, fontSize: 13 } }, 'Preparing your 3D studio'),
              el('div', { style: { marginTop: 4, fontSize: 10, lineHeight: 1.45 } }, 'The editable floor grid is ready while the renderer starts.'),
              el('button', { type: 'button', onClick: openArchGridForKeyboard, style: { marginTop: 12, padding: '7px 12px', borderRadius: 8, border: '1px solid #2dd4bf', background: 'rgba(45,212,191,.15)', color: '#99f6e4', cursor: 'pointer', fontSize: 11, fontWeight: 800 } }, 'Open Floor Grid')
            )
          ),
          !mainUse3d && renderBuildGrid(),
          mainUse3d && archGlLive && archDisplayBlocks.length === 0 && el('div', { className: 'arch-studio-empty-state', 'data-arch-empty-state': 'true', role: 'status', style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'auto', width: 'min(330px,calc(100% - 32px))', padding: '16px 18px', borderRadius: 16, background: 'rgba(15,23,42,.9)', border: '1px solid rgba(100,116,139,.7)', color: '#e2e8f0', textAlign: 'center', backdropFilter: 'blur(12px)', zIndex: 5 } },
            el('div', { 'aria-hidden': 'true', style: { fontSize: 28, marginBottom: 6 } }, blocks.length === 0 ? (mode === 'pick' ? '\uD83C\uDFAF' : '\uD83C\uDFD7\uFE0F') : (showReplay ? '\u23EA' : '\uD83D\uDC41\uFE0F')),
            el('div', { style: { fontSize: 14, fontWeight: 850, color: '#f8fafc' } }, blocks.length === 0 ? (mode === 'pick' ? 'Nothing to pick yet' : 'Start your first structure') : (showReplay ? 'No blocks at this replay step' : 'Nothing matches this view')),
            el('div', { style: { marginTop: 4, fontSize: 10, lineHeight: 1.5, color: '#94a3b8' } }, blocks.length === 0 ? (mode === 'pick' ? 'Switch to Place, then click the ground or use the floor grid.' : 'Click the ground to place a ' + activeShape + ', or begin precisely in the floor grid.') : (showReplay ? 'Move to another step or return to the live build.' : 'A layer, slice, or filter is hiding the live structure.')),
            el('div', { style: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginTop: 11 } },
              blocks.length === 0 && mode === 'pick' && el('button', { type: 'button', onClick: function () { upd('mode', 'place'); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #22c55e', background: 'rgba(34,197,94,.16)', color: '#86efac', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, 'Switch to Place'),
              blocks.length === 0 && el('button', { type: 'button', onClick: openArchGridForKeyboard, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #2dd4bf', background: 'rgba(45,212,191,.16)', color: '#99f6e4', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, 'Open Floor Grid'),
              blocks.length > 0 && showReplay && replayStep < replayFrames && el('button', { type: 'button', onClick: function () { stepReplay(1); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #fbbf24', background: 'rgba(251,191,36,.14)', color: '#fde68a', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, 'Next Step'),
              blocks.length > 0 && showReplay && el('button', { type: 'button', onClick: exitReplay, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #64748b', background: 'rgba(71,85,105,.3)', color: '#cbd5e1', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, 'Return to Live Build'),
              blocks.length > 0 && !showReplay && el('button', { type: 'button', onClick: function () { upd({ viewLayer: -1, showSlice: false, sliceZSelected: false, filterMaterial: '', filterShape: '' }); }, style: { padding: '6px 10px', borderRadius: 8, border: '1px solid #60a5fa', background: 'rgba(96,165,250,.16)', color: '#bfdbfe', cursor: 'pointer', fontSize: 10, fontWeight: 800 } }, 'Show Entire Build')
            )
          ),
          el('p', { id: 'arch-gl-description', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } },
            showReplay
              ? 'Read-only construction replay. Use the replay controls to inspect earlier build steps. Exit replay before changing blocks.'
              : 'A three-dimensional view of the structure you have built, coloured by material. Click the ground or a block face to build, or choose Pick to copy an existing block\'s properties. Drag or use the arrow keys to orbit, scroll or use plus and minus to zoom, and press Home or zero to reset. Press Enter to open the keyboard-authoring floor grid, then use arrow keys to move between cells.'),

          // Controls overlay (top-right)
          mainUse3d && el('div', { className: 'arch-studio-help-overlay', style: { position: 'absolute', top: 8, right: 8, pointerEvents: 'none', background: 'rgba(15,23,42,.85)', borderRadius: 10, padding: '6px 10px', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.6, backdropFilter: 'blur(8px)', border: '1px solid var(--allo-stem-border, #1e293b)' } },
            el('div', null, '\uD83D\uDD04 Drag \u2014 Orbit'),
            el('div', null, '\uD83D\uDD0D Scroll \u2014 Zoom'),
            el('div', { style: { opacity: 0.9 } }, showReplay ? '\u23EA Replay is read-only' : '\uD83D\uDC49 Click \u2014 ' + activeModeVisual.action),
            archDisplayBlocks.length !== blocks.length && el('div', { style: { color: '#93c5fd', fontWeight: 700 } }, '\uD83D\uDC41 ' + archDisplayBlocks.length + '/' + blocks.length + ' visible'),
            symmetryMode && el('div', { style: { color: '#f9a8d4', fontWeight: 700 } }, '\uD83E\uDE9E Symmetry ON')
          ),

          mainUse3d && el('div', { className: 'arch-studio-camera-controls', role: 'group', 'aria-label': 'Three-dimensional camera controls', style: {
            position: 'absolute', right: 8, bottom: 8, zIndex: 7, display: 'flex', flexWrap: 'wrap', gap: 3,
            width: 'max-content', maxWidth: 'calc(100% - 16px)', padding: 4, borderRadius: 9, background: 'rgba(15,23,42,.88)', border: '1px solid #334155'
          } },
            cameraBtn('Rotate view left', '\u21B6', 'left'),
            cameraBtn('Rotate view right', '\u21B7', 'right'),
            cameraBtn('Tilt view up', '\u2191', 'up'),
            cameraBtn('Tilt view down', '\u2193', 'down'),
            cameraBtn('Zoom in', '+', 'zoomIn'),
            cameraBtn('Zoom out', '\u2212', 'zoomOut'),
            cameraBtn('Reset three-dimensional view', '\u27F2', 'reset')
          ),

          // A real keyboard-operable authoring surface is always available;
          // it also becomes the automatic fallback if WebGL cannot start.
          el('div', { className: 'arch-studio-view-switch', style: { position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 6, pointerEvents: 'none', display: 'flex', gap: 3, padding: 3, borderRadius: 9, background: 'rgba(15,23,42,.88)', border: '1px solid #334155' } },
            archShow3d && el('button', { type: 'button', 'aria-pressed': mainUse3d, onClick: function () { upd('editorView', '3d'); }, style: { pointerEvents: 'auto', padding: '4px 8px', borderRadius: 6, border: mainUse3d ? '1px solid #60a5fa' : '1px solid transparent', background: mainUse3d ? 'rgba(96,165,250,.2)' : 'transparent', color: mainUse3d ? '#bfdbfe' : '#94a3b8', cursor: 'pointer', fontSize: 10, fontWeight: 700 } }, '3D Build'),
            !archShow3d && el('button', { type: 'button', 'aria-label': 'Retry the three-dimensional view', onClick: function () { upd({ hide3d: false, editorView: '3d' }); }, style: { pointerEvents: 'auto', padding: '4px 8px', borderRadius: 6, border: '1px solid #60a5fa', background: 'rgba(96,165,250,.14)', color: '#bfdbfe', cursor: 'pointer', fontSize: 10, fontWeight: 700 } }, 'Retry 3D'),
            el('button', { type: 'button', 'aria-pressed': !mainUse3d, onClick: openArchGridForKeyboard, style: { pointerEvents: 'auto', padding: '4px 8px', borderRadius: 6, border: !mainUse3d ? '1px solid #2dd4bf' : '1px solid transparent', background: !mainUse3d ? 'rgba(45,212,191,.18)' : 'transparent', color: !mainUse3d ? '#99f6e4' : '#94a3b8', cursor: 'pointer', fontSize: 10, fontWeight: 700 } }, 'Floor Grid')
          ),

          // Mode indicator (top-left)
          el('div', { style: { position: 'absolute', top: 8, left: 8, pointerEvents: 'none', background: activeModeVisual.bg, border: '1px solid ' + activeModeVisual.border, borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: activeModeVisual.color } },
            activeModeVisual.label + ' Mode',
            mode === 'place' && activeRotation > 0 && el('span', { style: { marginLeft: 6, fontSize: 11, color: '#fbbf24' } }, activeRotation + '\u00B0')
          ),

          mainUse3d && selectedBlock && el('div', { className: 'arch-studio-empty-state arch-studio-selection-chip', 'data-arch-selection-chip': 'true', 'aria-hidden': 'true', style: { position: 'absolute', left: 8, bottom: 8, pointerEvents: 'none', zIndex: 7, maxWidth: 230, padding: '6px 9px', borderRadius: 9, background: 'rgba(15,23,42,.92)', border: '1px solid #f59e0b', boxShadow: '0 0 20px rgba(245,158,11,.16)', color: '#fde68a', fontSize: 10, fontWeight: 750 } },
            '\uD83D\uDCCC Selected X ' + selectedBlock.x + ' \u2022 Y ' + selectedBlock.y + ' \u2022 Z ' + selectedBlock.z + ' \u2022 ' + (selectedShapeMeta ? selectedShapeMeta.label : 'Block')),

          ),

          activeViewChips.length > 0 && el('div', {
            className: 'arch-studio-view-hud',
            'data-arch-view-hud': 'true',
            role: 'group',
            'aria-label': mainUse3d ? 'Active view settings' : 'Three-dimensional view settings',
            style: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', flexShrink: 0, overflowX: 'auto', overflowY: 'hidden', background: 'linear-gradient(90deg,rgba(2,6,23,.96),rgba(15,23,42,.96))', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }
          },
            el('span', { style: { flex: '0 0 auto', fontSize: 10, fontWeight: 850, color: '#e2e8f0', whiteSpace: 'nowrap' } },
              mainUse3d ? '\uD83D\uDC41 Active View \u2022 ' + archDisplayBlocks.length + '/' + archReplayFrame.length + ' visible' : '\uD83D\uDC41 3D View Settings'),
            activeViewChips.map(function (chip) {
              return el('button', {
                key: chip.id,
                type: 'button',
                className: 'arch-studio-view-chip',
                'data-arch-view-chip': chip.id,
                'aria-label': chip.clearLabel,
                title: chip.clearLabel,
                onClick: function () { chip.clear(); if (announceToSR) announceToSR(chip.clearLabel + '.'); },
                style: { border: '1px solid ' + chip.tone.border, background: chip.tone.bg, color: chip.tone.color, cursor: 'pointer' }
              }, chip.label, el('span', { 'aria-hidden': 'true' }, ' \u00D7'));
            }),
            el('button', {
              type: 'button',
              'data-arch-reset-view': 'true',
              'aria-label': 'Reset layer, slice, filters, heatmap, replay, and blueprint view settings',
              onClick: resetArchView,
              style: { flex: '0 0 auto', padding: '4px 9px', borderRadius: 7, border: '1px solid #64748b', background: 'rgba(71,85,105,.3)', color: '#e2e8f0', cursor: 'pointer', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }
            }, '\u21BA Reset View')
          ),

          // Analysis overlay (right side)
          showAnalysis && totalBlocks > 0 && el('div', { className: 'arch-studio-floating-panel arch-studio-analysis-panel', role: 'region', 'aria-label': showReplay ? 'Live build analysis' : 'Structural analysis', style: { position: 'absolute', top: 70, right: 8, width: 238, background: 'rgba(15,23,42,.93)', borderRadius: 14, padding: '12px 14px', backdropFilter: 'blur(12px)', border: '1px solid rgba(168,85,247,.35)', zIndex: 10 } },
            el('div', { className: 'arch-studio-floating-header', style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
              el('div', { style: { fontSize: 10, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1.2 } }, '\uD83D\uDCD0 ' + (showReplay ? 'Live Build Analysis' : 'Structural Analysis')),
              el('button', { type: 'button', 'aria-label': 'Close structural analysis', onClick: function () { upd('showAnalysis', false); }, style: { marginLeft: 'auto', width: 24, height: 24, padding: 0, borderRadius: 7, border: '1px solid #475569', background: 'rgba(71,85,105,.25)', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 } }, '\u00D7')
            ),
            el('div', { style: { textAlign: 'center', marginBottom: 10, padding: '8px 0', background: 'rgba(30,41,59,.6)', borderRadius: 10, border: '1px solid var(--allo-stem-border, #334155)' } },
              el('div', { style: { fontSize: 24, marginBottom: 2 } }, analysis.stabilityEmoji),
              el('div', { style: { fontSize: 20, fontWeight: 800, color: analysis.stability >= 70 ? '#4ade80' : analysis.stability >= 40 ? '#fbbf24' : '#f87171' } }, analysis.stability + '%'),
              el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600 } }, analysis.stabilityLabel)
            ),
            analysisBar('Load Support', analysis.supportedPct, 100, analysis.supportedPct >= 80 ? '#4ade80' : '#f87171', '%'),
            analysisBar('Symmetry', analysis.symmetry, 100, analysis.symmetry >= 70 ? '#60a5fa' : '#f87171', '%'),
            el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 } },
              [
                { label: 'CoG', value: '(' + analysis.cogX + ',' + analysis.cogY + ',' + analysis.cogZ + ')', icon: '\u2316' },
                { label: t('stem.archstudio.weight', 'Weight'), value: analysis.totalWeight + 't', icon: '\u2696\uFE0F' },
                { label: t('stem.archstudio.materials', 'Materials'), value: analysis.materialCount, icon: '\uD83C\uDFA8' },
                { label: t('stem.archstudio.floating', 'Floating'), value: analysis.unsupported, icon: analysis.unsupported > 0 ? '\u26A0\uFE0F' : '\u2705' }
              ].map(function (r) {
                return el('div', { key: r.label, style: { background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '4px 6px', textAlign: 'center' } },
                  el('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600 } }, r.icon + ' ' + r.label),
                  el('div', { style: { fontSize: 11, fontWeight: 700, color: r.label === 'Floating' && analysis.unsupported > 0 ? '#f87171' : '#f8fafc' } }, r.value)
                );
              })
            ),
            analysis.unsupported > 0 && el('div', { style: { marginTop: 6, padding: '6px 8px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: 11, color: '#fca5a5', lineHeight: 1.4 } },
              '\u26A0\uFE0F ' + analysis.unsupported + ' floating block' + (analysis.unsupported > 1 ? 's' : '') + '!'
            )
          ),

          // AI Architect overlay (left side, below mode indicator)
          showAI && el('div', { className: 'arch-studio-floating-panel arch-studio-ai-panel', role: 'region', 'aria-label': 'AI Architect advice', 'aria-busy': aiLoading, style: { position: 'absolute', top: 44, left: 8, width: 264, background: 'rgba(15,23,42,.93)', borderRadius: 14, padding: '12px 14px', backdropFilter: 'blur(12px)', border: '1px solid rgba(244,114,182,.35)', zIndex: 10 } },
            el('div', { className: 'arch-studio-floating-header', style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
              el('span', { style: { fontSize: 10, fontWeight: 700, color: '#f9a8d4', textTransform: 'uppercase', letterSpacing: 1.2 } }, '\uD83E\uDD16 AI Architect'),
              el('button', { type: 'button', onClick: askAIArchitect, disabled: aiLoading, style: { marginLeft: 'auto', background: aiLoading ? 'rgba(71,85,105,.5)' : 'linear-gradient(135deg,#f472b6,#ec4899)', border: 'none', color: '#fff', borderRadius: 7, padding: '4px 9px', fontSize: 10, fontWeight: 800, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3 Working' : '\u2728 Ask Again'),
              el('button', { type: 'button', 'aria-label': 'Close AI Architect', onClick: function () { upd('showAI', false); }, style: { width: 24, height: 24, padding: 0, borderRadius: 7, border: '1px solid #475569', background: 'rgba(71,85,105,.25)', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 } }, '\u00D7')
            ),
            aiLoading && el('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: aiAdvice ? 8 : 0, padding: '7px 8px', borderRadius: 8, background: 'rgba(244,114,182,.1)', border: '1px solid rgba(244,114,182,.24)', color: '#fbcfe8', fontSize: 10, fontWeight: 700 } },
              el('span', { 'aria-hidden': 'true', style: { animation: 'spin 1.5s linear infinite' } }, '\u2726'),
              aiAdvice ? 'Refreshing advice for this build\u2026' : 'Analyzing your structure\u2026'
            ),
            aiAdvice
              ? el('div', { style: { opacity: aiLoading ? .58 : 1, fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, whiteSpace: 'pre-line', transition: 'opacity .18s ease' } }, aiAdvice)
              : !aiLoading && el('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.5 } }, 'Ask for personalized architecture tips based on this build.')
          ),

          // Bottom stats bar
          el('div', { className: 'arch-studio-stats', 'data-arch-stats': 'true', style: { display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(82px,1fr)', gap: 5, justifyContent: 'stretch', padding: '7px 8px', background: 'linear-gradient(0deg,var(--allo-stem-panel, #1e293b),rgba(15,23,42,.96))', borderTop: '1px solid var(--allo-stem-border, #334155)', overflowX: 'auto', overflowY: 'hidden', flexShrink: 0 } },
            [
              { label: t('stem.archstudio.blocks', 'Blocks'), value: totalBlocks, icon: '\uD83E\uDDF1' },
              { label: t('stem.archstudio.stability', 'Stability'), value: analysis.stabilityEmoji + analysis.stability + '%', icon: '\uD83C\uDFD7\uFE0F' },
              budgetEnabled && { label: t('stem.archstudio.cost', 'Cost'), value: '\uD83D\uDCB2' + totalCost + '/' + budget, icon: '\uD83D\uDCB0' },
              { label: t('stem.archstudio.size', 'Size'), value: blocks.length > 0 ? buildW + '\u00D7' + buildD + '\u00D7' + buildH : '\u2014', icon: '\uD83D\uDCCF' },
              { label: t('stem.archstudio.footprint', 'Footprint'), value: footprint + 'u\u00B2', icon: '\uD83D\uDDFA\uFE0F' },
              { label: t('stem.archstudio.volume', 'Volume'), value: totalVolume + 'u\u00B3', icon: '\uD83D\uDCE6' },
              { label: t('stem.archstudio.surface', 'Surface'), value: surfaceArea + 'u\u00B2', icon: '\uD83D\uDCC0' },
              { label: t('stem.archstudio.challenges', 'Challenges'), value: completedCount + '/10', icon: '\uD83C\uDFC6' }
            ].filter(Boolean).map(function (stat) {
              var statColor = stat.label === t('stem.archstudio.stability', 'Stability') ? (analysis.stability >= 70 ? '#86efac' : analysis.stability >= 40 ? '#fde68a' : '#fca5a5') : stat.label === t('stem.archstudio.cost', 'Cost') && overBudget ? '#fca5a5' : '#f8fafc';
              return el('div', { className: 'arch-studio-stat', key: stat.label, style: { textAlign: 'center' } },
                el('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600 } }, stat.icon + ' ' + stat.label),
                el('div', { style: { marginTop: 1, fontSize: 13, fontWeight: 800, color: statColor } }, stat.value)
              );
            })
          )
        )
      ),

      // ── Coach panel ──
      el('div', { className: 'arch-studio-coach', role: 'status', style: { padding: '9px 14px', background: 'linear-gradient(90deg,rgba(30,41,59,.98),rgba(15,23,42,.98))', borderTop: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid rgba(56,189,248,.55)', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, flexShrink: 0 } },
        coachTip
      ),

      // === H7b'' inquiry widget: gravity-rigidity discovery ===
      showInquiryLab && (function() {
        var iq = d.gravRigid || { gravMult: 1, rigidity: 80, mass: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { upd('gravRigid', Object.assign({}, iq, patch)); }
        var stress = (iq.mass / 50) * iq.gravMult * (100 - iq.rigidity) / 100;
        var state;
        if (stress < 0.5) state = 'ultra';
        else if (stress < 1.2) state = 'stable';
        else if (stress < 2.5) state = 'mod';
        else state = 'unstable';
        var sm = {
          ultra:    { label: t('stem.archstudio.ultra_stable', '🏛️ Ultra-stable'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: t('stem.archstudio.low_effective_stress_structure_tolerat', 'Low effective stress. Structure tolerates extreme conditions.') },
          stable:   { label: t('stem.archstudio.stable', '🟢 Stable'),        color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: t('stem.archstudio.within_design_margins_survives_normal_', 'Within design margins. Survives normal loads.') },
          mod:      { label: t('stem.archstudio.moderate', '🟡 Moderate'),       color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: t('stem.archstudio.approaching_failure_threshold_marginal', 'Approaching failure threshold. Marginal under stress.') },
          unstable: { label: t('stem.archstudio.unstable', '🔴 Unstable'),       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: t('stem.archstudio.likely_collapse_under_load', 'Likely collapse under load.') }
        }[state];
        return el('div', { className: 'arch-studio-inquiry', style: { padding: 12, background: 'linear-gradient(180deg,var(--allo-stem-panel, #1e293b),rgba(15,23,42,.98))', borderTop: '1px solid #334155', color: '#e2e8f0' } },
          el('div', { className: 'arch-studio-inquiry-header', style: { position: 'sticky', top: -12, zIndex: 3, margin: '-12px -12px 8px', padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,.97)', borderBottom: '1px solid #334155', backdropFilter: 'blur(12px)' } },
            el('h3', { style: { flex: 1, fontSize: 13, fontWeight: 800, color: '#a78bfa', margin: 0 } }, '⚖️ Gravity-rigidity discovery'),
            el('button', { type: 'button', 'aria-label': 'Close gravity-rigidity discovery', onClick: function () { upd('showInquiryLab', false); }, style: { width: 26, height: 26, padding: 0, borderRadius: 7, border: '1px solid #475569', background: 'rgba(71,85,105,.25)', color: '#cbd5e1', cursor: 'pointer', fontSize: 15 } }, '\u00D7')
          ),
          el('p', { style: { fontSize: 11, color: '#cbd5e1', marginBottom: 8 } }, 'Sliders for gravity multiplier, rigidity, mass. Discrete stability outcome. No score, no reveal.'),
          el('div', { style: { padding: 8, borderRadius: 6, textAlign: 'center', background: sm.bg, border: '2px solid ' + sm.border, marginBottom: 8 } },
            el('div', { style: { fontSize: 13, fontWeight: 900, color: sm.color } }, sm.label),
            el('div', { style: { fontSize: 10, color: '#475569', marginTop: 2 } }, sm.desc)
          ),
          el('div', { className: 'arch-studio-inquiry-controls', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 } },
            [{ k: 'gravMult', l: 'Gravity ×', mn: 0.5, mx: 8, st: 0.1 },
             { k: 'rigidity', l: 'Rigidity %', mn: 30, mx: 100, st: 5 },
             { k: 'mass',     l: 'Load mass', mn: 10, mx: 200, st: 5 }].map(function(s) {
              return el('div', { key: s.k },
                el('label', { htmlFor: 'gr-' + s.k, style: { display: 'block', fontSize: 10, fontWeight: 'bold', color: '#cbd5e1', marginBottom: 2 } }, s.l + ': ', el('span', { style: { color: '#a78bfa', fontFamily: 'monospace' } }, iq[s.k])),
                el('input', { id: 'gr-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                  onChange: function(e) { var p = {}; p[s.k] = parseFloat(e.target.value); setIQ(p); },
                  style: { width: '100%' }, 'aria-label': s.l }));
            })
          ),
          el('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 } },
            el('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ g: iq.gravMult, r: iq.rigidity, m: iq.mass, st: state }]).slice(-8) }); }, style: { padding: '4px 10px', background: '#0f172a', color: '#cbd5e1', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '📋 Log'),
            el('button', { onClick: function() { setIQ({ gravMult: 1, rigidity: 80, mass: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, style: { padding: '4px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 10, cursor: 'pointer' } }, '↺ Reset')
          ),
          el('textarea', { 'aria-label': t('stem.archstudio.hypothesis', 'Structural stability hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.archstudio.hypothesis_when_does_rigidity_rescue_a', 'Hypothesis: When does rigidity rescue an overloaded structure?'),
            style: { width: '100%', minHeight: 50, padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 }, rows: 2 }),
          !iq.stuckRevealed && el('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '4px 10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', borderRadius: 4, fontSize: 10, fontWeight: 'bold', cursor: 'pointer', marginBottom: 8 } }, '🤔 Stuck — show open prompts'),
          iq.stuckRevealed && el('div', { style: { padding: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, fontSize: 10, color: '#cbd5e1', marginBottom: 8 } },
            el('ul', { style: { margin: 0, paddingLeft: 14 } },
              el('li', null, 'Find a setting where doubling rigidity moves you up one state.'),
              el('li', null, 'On Mars (gravMult=0.4), what mass becomes stable?'))),
          el('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 'bold', color: '#34d399', cursor: 'pointer' } },
            el('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }), 'I understand — explain in own words'),
          iq.understood && el('textarea', { 'aria-label': t('stem.archstudio.explanation', 'Explain structural stability'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.archstudio.explain_how_gravity_rigidity_and_mass_', 'Explain how gravity, rigidity, and mass interact to determine stability.'),
            style: { width: '100%', minHeight: 60, padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', marginTop: 4 }, rows: 3 }),
          el('div', { style: { marginTop: 6, fontSize: 10, fontStyle: 'italic', color: '#64748b' } }, 'Design note: discrete 4-state structural marker; no FEM score; no reveal — by design.')
        );
      })()
    );
  }});
})();
