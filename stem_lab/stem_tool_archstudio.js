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
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveGallery(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) { /* quota */ }
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
          for (var x = 0; x < 5; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'slab', material: 'stone', color: '#94a3b8' });
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
          for (var x = 0; x < 7; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'slab', material: 'marble', color: '#f1f5f9' });
          // Columns at corners + midpoints y=1,2,3
          var colPositions = [[0, 0], [0, 3], [3, 0], [3, 3], [6, 0], [6, 3]];
          colPositions.forEach(function (p) {
            for (var cy = 1; cy <= 3; cy++) b.push({ x: p[0], y: cy, z: p[1], shape: 'column', material: 'marble', color: '#f1f5f9' });
          });
          // Arches between front columns y=3
          b.push({ x: 1, y: 3, z: 0, shape: 'arch', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 2, y: 3, z: 0, shape: 'arch', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 4, y: 3, z: 0, shape: 'arch', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 5, y: 3, z: 0, shape: 'arch', material: 'marble', color: '#f1f5f9' });
          // Roof y=4 (triangular with pyramid at peak)
          for (var rx = 0; rx < 7; rx++) for (var rz = 0; rz < 4; rz++) b.push({ x: rx, y: 4, z: rz, shape: 'slab', material: 'marble', color: '#e2e8f0' });
          b.push({ x: 2, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 3, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 4, y: 5, z: 1, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 2, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 3, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          b.push({ x: 4, y: 5, z: 2, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          return b;
        }
      },
      {
        id: 'tower', name: 'Castle Tower', icon: '\uD83C\uDFF0', desc: 'Tall stone tower with battlements',
        blocks: function () {
          var b = [];
          // Base platform
          for (var x = 0; x < 4; x++) for (var z = 0; z < 4; z++) b.push({ x: x, y: 0, z: z, shape: 'block', material: 'stone', color: '#94a3b8' });
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
            b.push({ x: p[0], y: 7, z: p[1], shape: 'block', material: 'stone', color: '#94a3b8' });
          });
          return b;
        }
      },
      {
        id: 'bridge', name: 'Arch Bridge', icon: '\uD83C\uDF09', desc: 'Stone bridge with arches spanning a gap',
        blocks: function () {
          var b = [];
          // Left pillar
          for (var y = 0; y <= 3; y++) { b.push({ x: 0, y: y, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' }); b.push({ x: 0, y: y, z: 1, shape: 'block', material: 'stone', color: '#94a3b8' }); }
          // Right pillar
          for (var ry = 0; ry <= 3; ry++) { b.push({ x: 5, y: ry, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' }); b.push({ x: 5, y: ry, z: 1, shape: 'block', material: 'stone', color: '#94a3b8' }); }
          // Center pillar
          for (var cy = 0; cy <= 2; cy++) { b.push({ x: 2, y: cy, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' }); b.push({ x: 3, y: cy, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' }); b.push({ x: 2, y: cy, z: 1, shape: 'block', material: 'stone', color: '#94a3b8' }); b.push({ x: 3, y: cy, z: 1, shape: 'block', material: 'stone', color: '#94a3b8' }); }
          // Arches
          b.push({ x: 1, y: 3, z: 0, shape: 'arch', material: 'stone', color: '#94a3b8' });
          b.push({ x: 1, y: 3, z: 1, shape: 'arch', material: 'stone', color: '#94a3b8' });
          b.push({ x: 4, y: 3, z: 0, shape: 'arch', material: 'stone', color: '#94a3b8' });
          b.push({ x: 4, y: 3, z: 1, shape: 'arch', material: 'stone', color: '#94a3b8' });
          // Road surface y=4
          for (var dx = 0; dx <= 5; dx++) { b.push({ x: dx, y: 4, z: 0, shape: 'slab', material: 'stone', color: '#cbd5e1' }); b.push({ x: dx, y: 4, z: 1, shape: 'slab', material: 'stone', color: '#cbd5e1' }); }
          // Railings
          [0, 2, 4].forEach(function (rx) {
            b.push({ x: rx, y: 5, z: 0, shape: 'column', material: 'metal', color: '#cbd5e1' });
            b.push({ x: rx, y: 5, z: 1, shape: 'column', material: 'metal', color: '#cbd5e1' });
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
          b.push({ x: 2, y: 3, z: 2, shape: 'pyramid', material: 'marble', color: '#f1f5f9' });
          return b;
        }
      }
    ];
  }

  // ══════════════════════════════════════════════════════════════
  // ── REGISTER TOOL ──
  // ══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('archStudio', {
    name: 'Architecture Studio',
    icon: '\uD83C\uDFD7\uFE0F',
    category: 'explore',
    questHooks: [
      { id: 'place_5_blocks', label: 'Place 5 building blocks', icon: '\uD83E\uDDF1', check: function(d) { return (d.blocks || []).length >= 5; }, progress: function(d) { return (d.blocks || []).length + '/5 blocks'; } },
      { id: 'place_15_blocks', label: 'Build a structure with 15+ blocks', icon: '\uD83C\uDFD7\uFE0F', check: function(d) { return (d.blocks || []).length >= 15; }, progress: function(d) { return (d.blocks || []).length + '/15 blocks'; } },
      { id: 'try_3_materials', label: 'Use 3 different building materials', icon: '\uD83E\uDEA8', check: function(d) { return Object.keys(d.materialsUsed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.materialsUsed || {}).length + '/3 materials'; } },
      { id: 'try_2_styles', label: 'Try 2 architectural styles', icon: '\uD83C\uDFDB\uFE0F', check: function(d) { return Object.keys(d.stylesUsed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.stylesUsed || {}).length + '/2 styles'; } }
    ],
    render: function (ctx) {
    var React = ctx.React;
    var el = React.createElement;
    var d = (ctx.toolData && ctx.toolData.archStudio) || {};
    var upd = function (key, val) {
      if (typeof key === 'object') { ctx.updateMulti('archStudio', key); }
      else { ctx.update('archStudio', key, val); }
    };
    var callGemini = ctx.callGemini || window.callGemini;
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;

    // ── State ──
    var blocks = d.blocks || [];
    var activeShape = d.activeShape || 'block';
    var activeMaterial = d.activeMaterial || 'stone';
    var activeColor = d.activeColor || '#94a3b8';
    var mode = d.mode || 'place';
    var styleMode = d.styleMode || 'architect';
    var blueprintView = d.blueprintView || false;
    var showAnalysis = d.showAnalysis || false;
    var showChallenges = d.showChallenges || false;
    var activeChallenge = d.activeChallenge != null ? d.activeChallenge : -1;
    var completedChallenges = d.completedChallenges || {};
    var threeReady = ctx.toolData && ctx.toolData._threeLoaded;

    // New state
    var undoStack = d.undoStack || [];
    var redoStack = d.redoStack || [];
    var activeRotation = d.activeRotation || 0;
    var symmetryMode = d.symmetryMode || false;
    var showGallery = d.showGallery || false;
    var showTemplates = d.showTemplates || false;
    var viewLayer = d.viewLayer != null ? d.viewLayer : -1; // -1 = all layers
    var budgetEnabled = d.budgetEnabled || false;
    var budget = d.budget != null ? d.budget : 200;
    var aiAdvice = d.aiAdvice || '';
    var aiLoading = d.aiLoading || false;
    var showAI = d.showAI || false;
    var soundEnabled = d.soundEnabled != null ? d.soundEnabled : true;

    // ── Shape definitions (12 shapes) ──
    var shapes = [
      { id: 'block', icon: '\uD83D\uDFE6', label: 'Block', vol: 1 },
      { id: 'slab', icon: '\uD83D\uDCCF', label: 'Slab', vol: 0.5 },
      { id: 'ramp', icon: '\uD83C\uDFD4\uFE0F', label: 'Ramp', vol: 0.5 },
      { id: 'column', icon: '\uD83C\uDFDB\uFE0F', label: 'Column', vol: 0.385 },
      { id: 'arch', icon: '\uD83C\uDF09', label: 'Arch', vol: 0.24 },
      { id: 'roof', icon: '\uD83D\uDCD0', label: 'Roof', vol: 0.35 },
      { id: 'pyramid', icon: '\uD83D\uDD3A', label: 'Pyramid', vol: 0.26 },
      { id: 'dome', icon: '\uD83D\uDD35', label: 'Dome', vol: 0.26 },
      { id: 'cylinder', icon: '\uD83D\uDEE2\uFE0F', label: 'Cylinder', vol: 0.785 },
      { id: 'lbeam', icon: '\uD83D\uDD29', label: 'L-Beam', vol: 0.75 },
      { id: 'window', icon: '\uD83E\uDE9F', label: 'Window', vol: 0.3 },
      { id: 'door', icon: '\uD83D\uDEAA', label: 'Door', vol: 0.4 }
    ];

    // ── Material definitions with costs ──
    var materials = [
      { id: 'stone', label: 'Stone', color: '#94a3b8', icon: '\uD83E\uDEA8', weight: 2.3, cost: 5 },
      { id: 'brick', label: 'Brick', color: '#b45309', icon: '\uD83E\uDDF1', weight: 1.9, cost: 8 },
      { id: 'wood', label: 'Wood', color: '#92400e', icon: '\uD83E\uDEB5', weight: 0.6, cost: 3 },
      { id: 'glass', label: 'Glass', color: '#38bdf8', icon: '\uD83E\uDE9F', weight: 2.5, cost: 12 },
      { id: 'marble', label: 'Marble', color: '#f1f5f9', icon: '\u26AA', weight: 2.7, cost: 15 },
      { id: 'metal', label: 'Metal', color: '#cbd5e1', icon: '\u2699\uFE0F', weight: 7.8, cost: 20 }
    ];

    // ── Tool modes ──
    var modes = [
      { id: 'place', label: 'Place', icon: '\u2795' },
      { id: 'erase', label: 'Erase', icon: '\u274C' },
      { id: 'paint', label: 'Paint', icon: '\uD83C\uDFA8' }
    ];

    // ── Rotation options ──
    var rotations = [
      { deg: 0, label: '0\u00B0', icon: '\u2B06\uFE0F' },
      { deg: 90, label: '90\u00B0', icon: '\u27A1\uFE0F' },
      { deg: 180, label: '180\u00B0', icon: '\u2B07\uFE0F' },
      { deg: 270, label: '270\u00B0', icon: '\u2B05\uFE0F' }
    ];

    // ── Lookups ──
    var volLookup = {};
    shapes.forEach(function (s) { volLookup[s.id] = s.vol; });
    var matColorLookup = {};
    var matWeightLookup = {};
    var matCostLookup = {};
    materials.forEach(function (m) { matColorLookup[m.id] = m.color; matWeightLookup[m.id] = m.weight; matCostLookup[m.id] = m.cost; });

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

      var groundY = minY;
      var floating = 0;
      blocks.forEach(function (b) {
        if (b.y > groundY && !blockMap[b.x + ',' + (b.y - 1) + ',' + b.z]) floating++;
      });
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
      { id: 0, title: 'First Wall', icon: '\uD83E\uDDF1', desc: 'Build a wall: 3+ wide, 3+ tall', xp: 10,
        check: function () { return buildW >= 3 && buildH >= 3; },
        fact: 'The earliest known brick wall dates to ~7500 BCE in Jericho!' },
      { id: 1, title: 'Stable Tower', icon: '\uD83C\uDFD7\uFE0F', desc: '6+ high, stability > 60%', xp: 15,
        check: function () { return buildH >= 6 && analysis.stability > 60; },
        fact: 'The Leaning Tower of Pisa has a 3.97\u00B0 lean due to shallow foundations!' },
      { id: 2, title: 'Material Mix', icon: '\uD83C\uDFA8', desc: 'Use 3+ different materials', xp: 10,
        check: function () { return analysis.materialCount >= 3; },
        fact: 'The Parthenon used marble, limestone, and iron clamps!' },
      { id: 3, title: 'Roman Arch', icon: '\uD83C\uDFDB\uFE0F', desc: '2+ arches and 2+ columns', xp: 20,
        check: function () { return (shapeCount.arch || 0) >= 2 && (shapeCount.column || 0) >= 2; },
        fact: 'The Colosseum has 80 arched entrances!' },
      { id: 4, title: 'Symmetry Master', icon: '\u2696\uFE0F', desc: 'Symmetry score > 80%', xp: 15,
        check: function () { return totalBlocks >= 6 && analysis.symmetry > 80; },
        fact: 'The Taj Mahal is perfectly symmetrical along its central axis.' },
      { id: 5, title: 'Bridge Builder', icon: '\uD83C\uDF09', desc: '4+ wide, 3+ high, no floaters', xp: 25,
        check: function () { return buildW >= 4 && buildH >= 3 && analysis.unsupported === 0; },
        fact: 'The 1915 \u00C7anakkale Bridge spans 2,023 meters!' },
      { id: 6, title: 'Efficient Design', icon: '\uD83D\uDCCA', desc: '20+ blocks, vol/surface > 0.5', xp: 20,
        check: function () { return totalBlocks >= 20 && volToSurf > 0.5; },
        fact: 'Igloos use dome shapes to minimize heat loss!' },
      { id: 7, title: 'Skyscraper', icon: '\uD83C\uDFD9\uFE0F', desc: '10+ height, stability > 50%', xp: 25,
        check: function () { return buildH >= 10 && analysis.stability > 50; },
        fact: 'The Burj Khalifa (828m) uses a Y-shaped floor plan!' },
      { id: 8, title: 'The Pyramid', icon: '\uD83D\uDD3A', desc: 'Pyramid/ramp shapes, stability > 90%', xp: 20,
        check: function () { return ((shapeCount.pyramid || 0) + (shapeCount.ramp || 0)) >= 3 && analysis.stability > 90; },
        fact: 'The Great Pyramid contains 2.3 million stone blocks!' },
      { id: 9, title: 'Dream Home', icon: '\uD83C\uDFE0', desc: '30+ blocks, 4+ mats, doors & windows', xp: 30,
        check: function () { return totalBlocks >= 30 && analysis.materialCount >= 4 && (shapeCount.door || 0) >= 1 && (shapeCount.window || 0) >= 1; },
        fact: 'Architects balance light, ventilation, integrity, and aesthetics!' }
    ];

    var challengeProgress = null;
    var justCompleted = false;
    if (activeChallenge >= 0 && activeChallenge < challenges.length) {
      var ch = challenges[activeChallenge];
      var passed = ch.check();
      challengeProgress = { challenge: ch, passed: passed };
      if (passed && !completedChallenges[ch.id]) justCompleted = true;
    }
    var completedCount = Object.keys(completedChallenges).length;

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

    var doUndo = function () {
      if (!undoStack || undoStack.length === 0) return;
      var stack = undoStack.slice();
      var prev = stack.pop();
      var redo = (redoStack || []).slice();
      redo.push(JSON.parse(JSON.stringify(blocks)));
      if (redo.length > 50) redo = redo.slice(-50);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: prev, undoStack: stack, redoStack: redo }) });
      });
      if (soundEnabled) sfxUndo();
      if (announceToSR) announceToSR('Undo. ' + (prev ? prev.length : 0) + ' blocks.');
    };

    var doRedo = function () {
      if (!redoStack || redoStack.length === 0) return;
      var stack = redoStack.slice();
      var next = stack.pop();
      var undo = (undoStack || []).slice();
      undo.push(JSON.parse(JSON.stringify(blocks)));
      if (undo.length > 50) undo = undo.slice(-50);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: next, undoStack: undo, redoStack: stack }) });
      });
      if (soundEnabled) sfxRedo();
      if (announceToSR) announceToSR('Redo. ' + (next ? next.length : 0) + ' blocks.');
    };

    // Clear all (with undo snapshot)
    var clearAll = function () {
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: [], undoStack: newUndo, redoStack: [] }) });
      });
      if (announceToSR) announceToSR('All blocks cleared.');
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
        blocks: JSON.parse(JSON.stringify(blocks)),
        blockCount: blocks.length,
        dims: buildW + '\u00D7' + buildD + '\u00D7' + buildH,
        stability: analysis.stability,
        timestamp: Date.now()
      };
      var updated = galleryItems.concat([item]);
      saveGallery(updated);
      upd('_galleryRefresh', Date.now());
      if (ctx.addToast) ctx.addToast('\uD83D\uDCBE Build saved: ' + name, 'success');
      if (soundEnabled) sfxSave();
      if (announceToSR) announceToSR('Build saved: ' + name + '. ' + blocks.length + ' blocks.');
    };

    var loadBuild = function (item) {
      var newUndo = pushUndo(blocks);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: item.blocks, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDCE5 Loaded: ' + item.name, 'info');
      if (soundEnabled) sfxLoad();
      if (announceToSR) announceToSR('Loaded build: ' + item.name + '. ' + (item.blocks ? item.blocks.length : 0) + ' blocks.');
    };

    var deleteBuild = function (id) {
      var updated = galleryItems.filter(function (g) { return g.id !== id; });
      saveGallery(updated);
      upd('_galleryRefresh', Date.now());
      if (ctx.addToast) ctx.addToast('\uD83D\uDDD1\uFE0F Build deleted', 'info');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Template System ──
    // ══════════════════════════════════════════════════════════════
    var templates = makeTemplates();

    var loadTemplate = function (tpl) {
      var newBlocks = tpl.blocks();
      var newUndo = pushUndo(blocks);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: newBlocks, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDCC2 Template loaded: ' + tpl.name, 'info');
      if (soundEnabled) sfxLoad();
      if (announceToSR) announceToSR('Template loaded: ' + tpl.name + '. ' + newBlocks.length + ' blocks.');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Mirror / Symmetry ──
    // ══════════════════════════════════════════════════════════════
    var mirrorBuildX = function () {
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      var mid = (minX + maxX) / 2;
      var mirrored = blocks.map(function (b) {
        return Object.assign({}, b, { x: Math.round(mid + (mid - b.x)) });
      });
      // Merge: keep original + add non-overlapping mirrored
      var existing = {};
      blocks.forEach(function (b) { existing[b.x + ',' + b.y + ',' + b.z] = true; });
      var added = mirrored.filter(function (b) { return !existing[b.x + ',' + b.y + ',' + b.z]; });
      var merged = blocks.concat(added);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: merged, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83E\uDE9E Mirrored along X axis! +' + added.length + ' blocks', 'info');
      if (soundEnabled) sfxPlace();
    };

    var mirrorBuildZ = function () {
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      var mid = (minZ + maxZ) / 2;
      var mirrored = blocks.map(function (b) {
        return Object.assign({}, b, { z: Math.round(mid + (mid - b.z)) });
      });
      var existing = {};
      blocks.forEach(function (b) { existing[b.x + ',' + b.y + ',' + b.z] = true; });
      var added = mirrored.filter(function (b) { return !existing[b.x + ',' + b.y + ',' + b.z]; });
      var merged = blocks.concat(added);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: merged, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83E\uDE9E Mirrored along Z axis! +' + added.length + ' blocks', 'info');
      if (soundEnabled) sfxPlace();
    };

    // ══════════════════════════════════════════════════════════════
    // ── AI Architect Advisor ──
    // ══════════════════════════════════════════════════════════════
    var askAIArchitect = function () {
      if (!callGemini || aiLoading) return;
      upd({ aiLoading: true, showAI: true });

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

      callGemini(prompt, true, false, 0.8).then(function (resp) {
        try {
          var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g, '').replace(/```/g, '').trim()) : resp;
          var advice = '';
          if (parsed.tips) parsed.tips.forEach(function (t, i) { advice += (i > 0 ? '\n' : '') + t; });
          if (parsed.funFact) advice += '\n\n\uD83C\uDFDB\uFE0F ' + parsed.funFact;
          upd({ aiAdvice: advice, aiLoading: false });
        } catch (e) {
          upd({ aiAdvice: typeof resp === 'string' ? resp : 'Ask me again!', aiLoading: false });
        }
      }).catch(function () {
        upd({ aiAdvice: '\u26A0\uFE0F Could not reach AI advisor. Try again later!', aiLoading: false });
      });
    };

    // ══════════════════════════════════════════════════════════════
    // ── Earthquake Simulator ──
    // ══════════════════════════════════════════════════════════════
    var quakeIntensity = d.quakeIntensity || 5; // 1-10 Richter-ish scale
    var quakeResult = d.quakeResult || null;

    var runEarthquake = function () {
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      var intensity = quakeIntensity / 10; // 0.1 - 1.0
      // Blocks survive based on: support (ground or block below), stability contribution, and randomness
      var survivors = [];
      var fallen = 0;
      // Sort by Y ascending so we evaluate from ground up
      var sorted = blocks.slice().sort(function (a, b) { return a.y - b.y; });
      var keepMap = {};
      sorted.forEach(function (b) {
        var onGround = b.y === minY;
        var supported = onGround || keepMap[b.x + ',' + (b.y - 1) + ',' + b.z];
        var hasNeighbors = 0;
        [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].forEach(function (n) {
          if (blockMap[(b.x+n[0])+','+(b.y+n[1])+','+(b.z+n[2])]) hasNeighbors++;
        });
        var survivalChance = supported ? 0.95 - (intensity * 0.4) + (hasNeighbors * 0.08) : 0.3 - (intensity * 0.25);
        // Heavy materials (metal, marble) are more stable; glass is fragile
        if (b.material === 'glass') survivalChance -= 0.15;
        if (b.material === 'metal' || b.material === 'stone') survivalChance += 0.05;
        // Pyramids and domes are more earthquake resistant
        if (b.shape === 'pyramid' || b.shape === 'dome') survivalChance += 0.1;
        if (Math.random() < Math.max(0.05, Math.min(0.99, survivalChance))) {
          survivors.push(b);
          keepMap[b.x + ',' + b.y + ',' + b.z] = true;
        } else {
          fallen++;
        }
      });
      var pctSurvived = totalBlocks > 0 ? Math.round((survivors.length / totalBlocks) * 100) : 100;
      var rating = pctSurvived >= 90 ? 'Earthquake-proof!' : pctSurvived >= 70 ? 'Minor damage' : pctSurvived >= 40 ? 'Significant damage' : 'Catastrophic failure';
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, {
          blocks: survivors, undoStack: newUndo, redoStack: [],
          quakeResult: { fallen: fallen, survived: survivors.length, pct: pctSurvived, rating: rating, intensity: quakeIntensity }
        }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83C\uDF0B Earthquake ' + quakeIntensity + '/10: ' + rating + ' (' + fallen + ' blocks fell)', pctSurvived >= 70 ? 'success' : 'error');
      // Shake sound
      playTone(80, 0.4, 'sawtooth', 0.15);
      setTimeout(function () { playTone(60, 0.5, 'sawtooth', 0.12); }, 200);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Screenshot to PNG ──
    // ══════════════════════════════════════════════════════════════
    var takeScreenshot = function () {
      var canvas = document.getElementById('arch-studio-canvas');
      if (!canvas) { if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Canvas not ready', 'error'); return; }
      try {
        var url = canvas.toDataURL('image/png');
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
    var shareCode = d.shareCode || '';

    var exportShareCode = function () {
      if (blocks.length === 0) return;
      try {
        var data = { v: 1, b: blocks.map(function (b) { return [b.x, b.y, b.z, b.shape || 'block', b.material || 'stone', b.color || '', b.rotation || 0]; }) };
        var json = JSON.stringify(data);
        var code = btoa(json);
        upd({ shareCode: code, showShare: true });
        // Copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).then(function () {
            if (ctx.addToast) ctx.addToast('\uD83D\uDCCB Share code copied to clipboard!', 'success');
          });
        } else {
          if (ctx.addToast) ctx.addToast('\uD83D\uDCE4 Share code generated! Copy it below.', 'info');
        }
      } catch (e) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Export failed', 'error');
      }
    };

    var importShareCode = function (code) {
      if (!code) return;
      try {
        var json = atob(code.trim());
        var data = JSON.parse(json);
        if (!data.b || !Array.isArray(data.b)) throw new Error('Invalid');
        var imported = data.b.map(function (arr) {
          return { x: arr[0], y: arr[1], z: arr[2], shape: arr[3] || 'block', material: arr[4] || 'stone', color: arr[5] || '#94a3b8', rotation: arr[6] || 0 };
        });
        var newUndo = pushUndo(blocks);
        ctx.setToolData(function (p) {
          var a = Object.assign({}, p.archStudio || {});
          return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: imported, undoStack: newUndo, redoStack: [] }) });
        });
        if (ctx.addToast) ctx.addToast('\uD83D\uDCE5 Imported ' + imported.length + ' blocks!', 'success');
        if (soundEnabled) sfxLoad();
      } catch (e) {
        if (ctx.addToast) ctx.addToast('\u26A0\uFE0F Invalid share code!', 'error');
      }
    };

    // ══════════════════════════════════════════════════════════════
    // ── Architecture Styles Guide ──
    // ══════════════════════════════════════════════════════════════
    var showStyleGuide = d.showStyleGuide || false;
    var archStyles = [
      { name: 'Classical', icon: '\uD83C\uDFDB\uFE0F', era: '800 BCE \u2013 500 CE', features: 'Columns, symmetry, pediments, marble. Think Parthenon, Colosseum.',
        tips: 'Use columns + arches, marble material, high symmetry' },
      { name: 'Gothic', icon: '\u26EA', era: '1100 \u2013 1500 CE', features: 'Pointed arches, tall spires, flying buttresses, stained glass.',
        tips: 'Build tall! Use arches, glass windows, stone walls' },
      { name: 'Art Deco', icon: '\uD83C\uDFD9\uFE0F', era: '1920s \u2013 1940s', features: 'Geometric shapes, stepped facades, metallic accents, bold symmetry.',
        tips: 'Use metal + glass, stepped pyramid shapes, strict symmetry' },
      { name: 'Modern', icon: '\uD83C\uDFE2', era: '1920s \u2013 present', features: 'Clean lines, glass curtain walls, open plans, "less is more".',
        tips: 'Use glass + metal, flat roofs (slabs), minimal decoration' },
      { name: 'Japanese', icon: '\u26E9\uFE0F', era: 'Traditional', features: 'Wooden frames, curved roofs, harmony with nature, tatami proportions.',
        tips: 'Use wood, roof shapes, low profiles, symmetry' },
      { name: 'Brutalist', icon: '\uD83D\uDDFF', era: '1950s \u2013 1970s', features: 'Raw concrete, massive forms, geometric repetition, fortress-like.',
        tips: 'Use stone only, blocky shapes, L-beams, no decoration' }
    ];

    // ══════════════════════════════════════════════════════════════
    // ── Copy Region (Duplicate + Offset) ──
    // ══════════════════════════════════════════════════════════════
    var duplicateBuild = function (dx, dy, dz) {
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      var duped = blocks.map(function (b) {
        return Object.assign({}, b, { x: b.x + dx, y: b.y + dy, z: b.z + dz });
      });
      var existing = {};
      blocks.forEach(function (b) { existing[b.x + ',' + b.y + ',' + b.z] = true; });
      var added = duped.filter(function (b) { return !existing[b.x + ',' + b.y + ',' + b.z]; });
      var merged = blocks.concat(added);
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: merged, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDCCB Duplicated +' + added.length + ' blocks (offset ' + dx + ',' + dy + ',' + dz + ')', 'info');
      if (soundEnabled) sfxPlace();
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
      modes: ['place', 'erase', 'paint'],
      setMode: function (id) { upd('mode', id); if (announceToSR) announceToSR((id === 'place' ? 'Place' : id === 'erase' ? 'Erase' : 'Paint') + ' mode activated.'); },
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
      if (blocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      // Sort blocks by Y ascending; drop each floating block to nearest support
      var sorted = blocks.slice().sort(function (a, b) { return a.y - b.y; });
      var occupied = {};
      var groundY = minY;
      var settled = [];
      var moved = 0;
      sorted.forEach(function (b) {
        // Find lowest available Y for this (x,z) column
        var targetY = groundY;
        while (occupied[b.x + ',' + targetY + ',' + b.z]) targetY++;
        if (targetY !== b.y) moved++;
        var nb = Object.assign({}, b, { y: targetY });
        settled.push(nb);
        occupied[nb.x + ',' + nb.y + ',' + nb.z] = true;
      });
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: settled, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\u2B07\uFE0F Gravity applied! ' + moved + ' block' + (moved !== 1 ? 's' : '') + ' dropped.', 'info');
      playTone(200, 0.3, 'sine', 0.1);
      setTimeout(function () { playTone(120, 0.4, 'sine', 0.08); }, 150);
    };

    // ══════════════════════════════════════════════════════════════
    // ── Random Build Generator ──
    // ══════════════════════════════════════════════════════════════
    var showRandomGen = d.showRandomGen || false;
    var randomPresets = [
      { id: 'tower', name: 'Random Tower', icon: '\uD83C\uDFD7\uFE0F', desc: 'Tall narrow structure' },
      { id: 'house', name: 'Random House', icon: '\uD83C\uDFE0', desc: 'Simple house with roof' },
      { id: 'wall', name: 'Random Wall', icon: '\uD83E\uDDF1', desc: 'Defensive wall segment' },
      { id: 'pyramid', name: 'Random Pyramid', icon: '\uD83D\uDD3A', desc: 'Layered pyramid' },
      { id: 'castle', name: 'Random Castle', icon: '\uD83C\uDFF0', desc: 'Castle with towers' },
      { id: 'bridge', name: 'Random Bridge', icon: '\uD83C\uDF09', desc: 'Bridge with arches' }
    ];

    var generateRandom = function (presetId) {
      var newUndo = pushUndo(blocks);
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

      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: gen, undoStack: newUndo, redoStack: [] }) });
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
    var showSlice = d.showSlice || false;
    var sliceZ = d.sliceZ != null ? d.sliceZ : -1; // -1 = all, else a specific Z
    var sliceBlocks = sliceZ >= 0 ? blocks.filter(function (b) { return b.z === sliceZ; }) : [];
    var sliceZLevels = [];
    if (totalBlocks > 0) {
      var zSet = {};
      blocks.forEach(function (b) { zSet[b.z] = true; });
      sliceZLevels = Object.keys(zSet).map(Number).sort(function (a, b) { return a - b; });
    }

    // ══════════════════════════════════════════════════════════════
    // ── Structural Load Heatmap ──
    // ══════════════════════════════════════════════════════════════
    var showHeatmap = d.showHeatmap || false;
    var blockLoads = {}; // key => load value
    if (showHeatmap && totalBlocks > 0) {
      // Compute load: each block bears its own weight + weight of all blocks directly above in same (x,z) column
      var columnBlocks = {}; // 'x,z' => [blocks sorted by y asc]
      blocks.forEach(function (b) {
        var key = b.x + ',' + b.z;
        if (!columnBlocks[key]) columnBlocks[key] = [];
        columnBlocks[key].push(b);
      });
      Object.keys(columnBlocks).forEach(function (key) {
        var col = columnBlocks[key].sort(function (a, b) { return a.y - b.y; });
        var cumWeight = 0;
        for (var ci = col.length - 1; ci >= 0; ci--) {
          var bw = (volLookup[col[ci].shape || 'block'] || 1) * (matWeightLookup[col[ci].material || 'stone'] || 2.0);
          cumWeight += bw;
          blockLoads[col[ci].x + ',' + col[ci].y + ',' + col[ci].z] = cumWeight;
        }
      });
    }
    var maxLoad = 0;
    Object.keys(blockLoads).forEach(function (k) { if (blockLoads[k] > maxLoad) maxLoad = blockLoads[k]; });

    // ══════════════════════════════════════════════════════════════
    // ── Time-Lapse Replay ──
    // ══════════════════════════════════════════════════════════════
    var showReplay = d.showReplay || false;
    var replayStep = d.replayStep != null ? d.replayStep : -1; // -1 = not replaying
    var replayFrames = (undoStack || []).length;

    var startReplay = function () {
      if (!undoStack || undoStack.length === 0) { if (ctx.addToast) ctx.addToast('\u26A0\uFE0F No undo history to replay!', 'error'); return; }
      upd({ showReplay: true, replayStep: 0 });
    };

    var stepReplay = function (dir) {
      var maxStep = replayFrames; // includes current state as last frame
      var next = Math.max(0, Math.min(maxStep, replayStep + dir));
      upd('replayStep', next);
    };

    var replayBlocks = replayStep >= 0 && replayStep < replayFrames ? undoStack[replayStep] : blocks;
    var replayLabel = replayStep >= 0 ? 'Step ' + (replayStep + 1) + '/' + (replayFrames + 1) : '';

    var exitReplay = function () { upd({ showReplay: false, replayStep: -1 }); };

    // ══════════════════════════════════════════════════════════════
    // ── Block Search / Filter ──
    // ══════════════════════════════════════════════════════════════
    var showFilter = d.showFilter || false;
    var filterMaterial = d.filterMaterial || '';
    var filterShape = d.filterShape || '';
    var filteredBlocks = blocks.filter(function (b) {
      if (filterMaterial && (b.material || 'stone') !== filterMaterial) return false;
      if (filterShape && (b.shape || 'block') !== filterShape) return false;
      return true;
    });
    var filterActive = !!(filterMaterial || filterShape);
    var filterCount = filterActive ? filteredBlocks.length : totalBlocks;

    var deleteFiltered = function () {
      if (!filterActive || filteredBlocks.length === 0) return;
      var newUndo = pushUndo(blocks);
      var removeSet = {};
      filteredBlocks.forEach(function (b) { removeSet[b.x + ',' + b.y + ',' + b.z] = true; });
      var remaining = blocks.filter(function (b) { return !removeSet[b.x + ',' + b.y + ',' + b.z]; });
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: remaining, undoStack: newUndo, redoStack: [] }) });
      });
      if (ctx.addToast) ctx.addToast('\uD83D\uDDD1\uFE0F Removed ' + filteredBlocks.length + ' matching blocks', 'info');
    };

    // ══════════════════════════════════════════════════════════════
    // ── Achievement Badges ──
    // ══════════════════════════════════════════════════════════════
    var showBadges = d.showBadges || false;
    var earnedBadges = d.earnedBadges || {};
    var badges = [
      { id: 'first_block', icon: '\uD83E\uDDF1', name: 'First Block', desc: 'Place your very first block', check: function () { return totalBlocks >= 1; } },
      { id: 'hundred_club', icon: '\uD83D\uDCAF', name: '100 Club', desc: 'Have 100+ blocks in one build', check: function () { return totalBlocks >= 100; } },
      { id: 'all_shapes', icon: '\u2B50', name: 'Shape Master', desc: 'Use all 12 shape types in one build', check: function () { return Object.keys(shapeCount).length >= 12; } },
      { id: 'all_mats', icon: '\uD83C\uDFA8', name: 'Material Maven', desc: 'Use all 6 materials in one build', check: function () { return analysis.materialCount >= 6; } },
      { id: 'sky_high', icon: '\uD83D\uDE80', name: 'Sky High', desc: 'Build 20+ blocks tall', check: function () { return buildH >= 20; } },
      { id: 'rock_solid', icon: '\uD83E\uDEA8', name: 'Rock Solid', desc: '50+ blocks with 95%+ stability', check: function () { return totalBlocks >= 50 && analysis.stability >= 95; } },
      { id: 'perfect_sym', icon: '\uD83E\uDE9E', name: 'Perfectly Balanced', desc: 'Symmetry score 100%', check: function () { return totalBlocks >= 10 && analysis.symmetry >= 100; } },
      { id: 'quake_proof', icon: '\uD83C\uDF0B', name: 'Quake-Proof', desc: 'Survive intensity 10 earthquake', check: function () { var qr = d.quakeResult; return qr && qr.intensity >= 10 && qr.pct >= 80; } },
      { id: 'five_saves', icon: '\uD83D\uDCBE', name: 'Collector', desc: 'Save 5+ builds to gallery', check: function () { return galleryItems.length >= 5; } },
      { id: 'challenger', icon: '\uD83C\uDFC6', name: 'Challenger', desc: 'Complete all 10 challenges', check: function () { return completedCount >= 10; } },
      { id: 'mega_build', icon: '\uD83C\uDFF0', name: 'Mega Build', desc: '200+ blocks in one build', check: function () { return totalBlocks >= 200; } },
      { id: 'minimalist', icon: '\u2728', name: 'Minimalist', desc: 'Build stable (70%+) with exactly 5 blocks', check: function () { return totalBlocks === 5 && analysis.stability >= 70; } }
    ];

    // Check for newly earned badges
    var newBadges = [];
    badges.forEach(function (badge) {
      if (!earnedBadges[badge.id] && badge.check()) {
        newBadges.push(badge);
      }
    });
    if (newBadges.length > 0) {
      var updatedBadges = Object.assign({}, earnedBadges);
      newBadges.forEach(function (b) {
        updatedBadges[b.id] = Date.now();
        if (ctx.addToast) ctx.addToast('\uD83C\uDFC5 Badge Earned: ' + b.icon + ' ' + b.name + '!', 'success');
        if (ctx.awardXP) ctx.awardXP('archStudio_badge_' + b.id, 5, 'Badge: ' + b.name);
      });
      // defer state update to avoid render loop
      setTimeout(function () { upd('earnedBadges', updatedBadges); }, 0);
    }
    var badgeCount = Object.keys(earnedBadges).length;

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
      if (!window.THREE || !window._archScene || blocks.length === 0) return;
      var THREE = window.THREE;
      var geos = [];
      window._archScene.blockMeshes.forEach(function (m) {
        var g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); geos.push(g);
      });
      if (geos.length === 0) return;
      var positions = [], normals = [];
      geos.forEach(function (g) {
        var idx = g.index, pos = g.getAttribute('position'), nrm = g.getAttribute('normal');
        if (idx) { for (var i = 0; i < idx.count; i++) { var vi = idx.getX(i); positions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi)); normals.push(nrm ? nrm.getX(vi) : 0, nrm ? nrm.getY(vi) : 1, nrm ? nrm.getZ(vi) : 0); } }
        else { for (var j = 0; j < pos.count; j++) { positions.push(pos.getX(j), pos.getY(j), pos.getZ(j)); normals.push(nrm ? nrm.getX(j) : 0, nrm ? nrm.getY(j) : 1, nrm ? nrm.getZ(j) : 0); } }
      });
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
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '">\n';
      svg += '<style>text{font-family:Arial,Helvetica,sans-serif;}</style>\n';
      svg += '<rect width="' + svgW + '" height="' + svgH + '" fill="#0f172a"/>\n';
      svg += '<text x="' + (svgW / 2) + '" y="28" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="bold">' + (styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio') + ' \u2014 Floor Plan</text>\n';
      svg += '<text x="' + (svgW / 2) + '" y="46" text-anchor="middle" fill="#64748b" font-size="11">' + buildW + '\u00D7' + buildD + '\u00D7' + buildH + ' \u2022 ' + totalBlocks + ' blocks \u2022 Vol: ' + totalVolume + ' u\u00B3</text>\n';
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
      svg += '<text x="' + (svgW - padding) + '" y="' + lY + '" text-anchor="end" fill="#64748b" font-size="10">Stability: ' + analysis.stabilityEmoji + ' ' + analysis.stability + '%</text>\n';
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
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '">\n';
      svg += '<style>text{font-family:Arial,Helvetica,sans-serif;}</style>\n';
      svg += '<rect width="' + svgW + '" height="' + svgH + '" fill="#0f172a"/>\n';
      svg += '<text x="' + (svgW / 2) + '" y="28" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="bold">' + (styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio') + ' \u2014 Front Elevation</text>\n';
      svg += '<text x="' + (svgW / 2) + '" y="46" text-anchor="middle" fill="#64748b" font-size="11">' + buildW + '\u00D7' + buildH + ' \u2022 ' + totalBlocks + ' blocks</text>\n';
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
        svg += '<text x="' + (gOX - 8) + '" y="' + (gOY + (buildH - 1 - hy) * cellSize + cellSize / 2 + 3) + '" text-anchor="end" fill="#475569" font-size="9">y' + (minY + hy) + '</text>\n';
      }
      svg += '<text x="' + (svgW - padding) + '" y="' + (gOY + buildH * cellSize + 30) + '" text-anchor="end" fill="#64748b" font-size="10">Stability: ' + analysis.stabilityEmoji + ' ' + analysis.stability + '% \u2022 CoG height: ' + analysis.cogY + '</text>\n';
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
          el('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, label),
          el('span', { style: { fontSize: 10, color: color, fontWeight: 700 } }, value + (suffix || ''))
        ),
        el('div', { style: { height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' } },
          el('div', { style: { height: '100%', width: Math.min(100, pct) + '%', background: color, borderRadius: 3, transition: 'width 0.3s ease' } })
        )
      );
    };

    var pillBtn = function (label, isActive, activeBg, activeBorder, activeColor, onClick) {
      return el('button', { onClick: onClick, style: {
        background: isActive ? activeBg : 'rgba(71,85,105,.3)',
        border: '1px solid ' + (isActive ? activeBorder : '#475569'),
        color: isActive ? activeColor : '#94a3b8',
        borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700
      } }, label);
    };

    // ══════════════════════════════════════════════════════════════
    // ── RENDER ──
    // ══════════════════════════════════════════════════════════════
    // ── Keyboard shortcuts (WCAG 2.1.1): P/E/A switch mode, R rotates ──
    function onArchKey(e) {
      var tgt = e.target || {};
      var tn = (tgt.tagName || '').toUpperCase();
      if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
      var k = e.key;
      if (k === 'p' || k === 'P') { e.preventDefault(); upd('mode', 'place'); if (announceToSR) announceToSR('Place mode.'); }
      else if (k === 'e' || k === 'E') { e.preventDefault(); upd('mode', 'erase'); if (announceToSR) announceToSR('Erase mode.'); }
      else if (k === 'a' || k === 'A') { e.preventDefault(); upd('mode', 'paint'); if (announceToSR) announceToSR('Paint mode.'); }
      else if (k === 'r' || k === 'R') {
        e.preventDefault();
        var nextDeg = ((d.rotation || 0) + 90) % 360;
        upd('rotation', nextDeg);
        if (announceToSR) announceToSR('Rotated to ' + nextDeg + ' degrees.');
      } else if (k >= '1' && k <= '9') {
        var idx = parseInt(k, 10) - 1;
        if (modes[idx]) {
          e.preventDefault();
          upd('mode', modes[idx].id);
          if (announceToSR) announceToSR(modes[idx].label + ' mode.');
        }
      }
    }

    return el('div', {
      key: 'archStudio',
      style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', borderRadius: 16, overflow: 'hidden', outline: 'none' },
      role: 'region',
      'aria-label': 'Architecture Studio. Keyboard shortcuts: P Place, E Erase, A Paint, R Rotate.',
      tabIndex: 0,
      onKeyDown: onArchKey
    },

      // ── Header bar ──
      el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'linear-gradient(90deg,#1e293b,#0f172a)', borderBottom: '1px solid #334155', flexWrap: 'wrap' } },
        el('button', { onClick: function () { ctx.setStemLabTool(''); }, style: { background: 'rgba(71,85,105,.5)', border: 'none', color: '#e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '\u2190 Back'),
        el('span', { style: { fontSize: 18 } }, styleMode === 'bricks' ? '\uD83E\uDDF1' : '\uD83C\uDFD7\uFE0F'),
        el('span', { style: { fontWeight: 700, fontSize: 15, color: '#f8fafc' } }, styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio'),
        el('span', { style: { fontSize: 10, color: '#94a3b8' } }, totalBlocks + ' blocks'),
        // Toggle pills
        pillBtn(styleMode === 'bricks' ? '\uD83E\uDDF1 Bricks' : '\uD83C\uDFDB\uFE0F Architect', true, styleMode === 'bricks' ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.15)', styleMode === 'bricks' ? '#f87171' : '#6366f1', styleMode === 'bricks' ? '#fca5a5' : '#a5b4fc', function () { upd('styleMode', styleMode === 'architect' ? 'bricks' : 'architect'); }),
        pillBtn(blueprintView ? '\uD83D\uDCD0 Blueprint' : '\uD83C\uDFD7\uFE0F 3D View', blueprintView, 'rgba(34,211,238,.2)', '#22d3ee', '#67e8f9', function () { upd('blueprintView', !blueprintView); }),
        pillBtn('\uD83C\uDFC6 ' + completedCount + '/10', showChallenges, 'rgba(245,158,11,.2)', '#f59e0b', '#fbbf24', function () { upd('showChallenges', !showChallenges); }),
        pillBtn('\uD83D\uDCD0 Analysis', showAnalysis, 'rgba(168,85,247,.2)', '#a855f7', '#c084fc', function () { upd('showAnalysis', !showAnalysis); }),
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
        pillBtn('\uD83C\uDF2C\uFE0F Wind', false, 'rgba(45,212,191,.2)', '#2dd4bf', '#5eead4', function () { upd('showFloorPlans', !showFloorPlans); }),
        el('button', { onClick: applyGravity, disabled: !blocks.length, title: 'Apply gravity (drop floating blocks)', style: { background: blocks.length && analysis.unsupported > 0 ? 'rgba(239,68,68,.2)' : 'rgba(71,85,105,.3)', border: '1px solid ' + (blocks.length && analysis.unsupported > 0 ? '#ef4444' : '#475569'), color: blocks.length && analysis.unsupported > 0 ? '#fca5a5' : '#94a3b8', borderRadius: 20, padding: '4px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\u2B07\uFE0F Gravity'),
        // Screenshot + Sound
        el('button', { onClick: takeScreenshot, title: 'Screenshot', style: { background: 'rgba(71,85,105,.3)', border: '1px solid #475569', color: '#94a3b8', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCF8'),
        el('button', { onClick: function () { upd('soundEnabled', !soundEnabled); }, title: 'Sound effects', 'aria-label': soundEnabled ? 'Mute sound effects' : 'Enable sound effects', 'aria-pressed': soundEnabled, style: { background: 'transparent', border: 'none', color: soundEnabled ? '#94a3b8' : '#475569', cursor: 'pointer', fontSize: 14, padding: '2px 6px' } }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        el('div', { style: { flex: 1 } }),
        // Undo / Redo / Clear
        el('button', { onClick: doUndo, disabled: !undoStack.length, title: 'Undo (multi-level)', style: { background: 'rgba(71,85,105,.5)', border: 'none', color: undoStack.length ? '#e2e8f0' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: undoStack.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 600 } }, '\u21A9 Undo' + (undoStack.length ? ' (' + undoStack.length + ')' : '')),
        el('button', { onClick: doRedo, disabled: !redoStack.length, title: 'Redo', style: { background: 'rgba(71,85,105,.5)', border: 'none', color: redoStack.length ? '#e2e8f0' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: redoStack.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 600 } }, '\u21AA Redo' + (redoStack.length ? ' (' + redoStack.length + ')' : '')),
        el('button', { onClick: clearAll, disabled: !blocks.length, style: { background: blocks.length ? 'rgba(239,68,68,.3)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid rgba(239,68,68,.4)' : '1px solid transparent', color: blocks.length ? '#fca5a5' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 600 } }, '\uD83D\uDDD1\uFE0F Clear'),
        el('button', { onClick: saveBuild, disabled: !blocks.length, title: 'Save to gallery', style: { background: blocks.length ? 'rgba(34,197,94,.2)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #22c55e' : '1px solid transparent', color: blocks.length ? '#4ade80' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCBE Save'),
        // Export buttons
        el('button', { onClick: exportBlueprint, disabled: !blocks.length, style: { background: blocks.length ? 'rgba(34,211,238,.15)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #22d3ee' : '1px solid transparent', color: blocks.length ? '#67e8f9' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCD0 Top SVG'),
        el('button', { onClick: exportSideBlueprint, disabled: !blocks.length, style: { background: blocks.length ? 'rgba(168,85,247,.15)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #a855f7' : '1px solid transparent', color: blocks.length ? '#c084fc' : '#475569', borderRadius: 8, padding: '5px 10px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83C\uDFD7\uFE0F Side SVG'),
        el('button', { onClick: exportSTL, disabled: !blocks.length, style: { background: blocks.length ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(71,85,105,.3)', border: 'none', color: blocks.length ? '#fff' : '#475569', borderRadius: 8, padding: '5px 12px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCE5 STL')
      ),

      // ── Main content: sidebar + viewport ──
      el('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },

        // ══════════════════════════════════════════════════════════
        // ── Left sidebar ──
        // ══════════════════════════════════════════════════════════
        el('div', { style: { width: 185, background: '#1e293b', padding: '10px 10px', overflowY: 'auto', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 12 } },

          // Mode selector
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Mode'),
            el('div', { style: { display: 'flex', gap: 4 } },
              modes.map(function (m) {
                return el('button', { key: m.id, onClick: function () { upd('mode', m.id); }, style: {
                  flex: 1, padding: '5px 4px', fontSize: 11, fontWeight: 600,
                  border: mode === m.id ? '2px solid #f59e0b' : '1px solid #475569',
                  borderRadius: 8, background: mode === m.id ? 'rgba(245,158,11,.15)' : 'rgba(30,41,59,.8)',
                  color: mode === m.id ? '#fbbf24' : '#94a3b8', cursor: 'pointer', textAlign: 'center'
                } }, m.icon + ' ' + m.label);
              })
            )
          ),

          // Shape palette
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Shapes'),
            el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 } },
              shapes.map(function (s) {
                return el('button', { key: s.id, onClick: function () { upd('activeShape', s.id); }, style: {
                  padding: '6px 3px', fontSize: 10, fontWeight: 600,
                  border: activeShape === s.id ? '2px solid #60a5fa' : '1px solid #334155',
                  borderRadius: 8, background: activeShape === s.id ? 'rgba(96,165,250,.12)' : 'transparent',
                  color: activeShape === s.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer', textAlign: 'center', lineHeight: 1.2
                } }, el('div', { style: { fontSize: 16 } }, s.icon), s.label);
              })
            )
          ),

          // Rotation selector
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD04 Rotation'),
            el('div', { style: { display: 'flex', gap: 3 } },
              rotations.map(function (r) {
                return el('button', { key: r.deg, onClick: function () { upd('activeRotation', r.deg); }, style: {
                  flex: 1, padding: '4px 2px', fontSize: 10, fontWeight: 600,
                  border: activeRotation === r.deg ? '2px solid #f59e0b' : '1px solid #334155',
                  borderRadius: 6, background: activeRotation === r.deg ? 'rgba(245,158,11,.12)' : 'transparent',
                  color: activeRotation === r.deg ? '#fbbf24' : '#94a3b8', cursor: 'pointer', textAlign: 'center'
                } }, r.icon + ' ' + r.label);
              })
            )
          ),

          // Material palette
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, 'Materials'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              materials.map(function (m) {
                return el('button', { key: m.id, onClick: function () { upd({ activeMaterial: m.id, activeColor: m.color }); }, style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', fontSize: 10, fontWeight: 600,
                  border: activeMaterial === m.id ? '2px solid ' + m.color : '1px solid #334155',
                  borderRadius: 8, background: activeMaterial === m.id ? 'rgba(255,255,255,.06)' : 'transparent',
                  color: activeMaterial === m.id ? '#f8fafc' : '#94a3b8', cursor: 'pointer', textAlign: 'left'
                } },
                  el('span', { style: { width: 16, height: 16, borderRadius: 4, background: m.color, display: 'inline-block', flexShrink: 0, border: '1px solid rgba(255,255,255,.15)' } }),
                  m.icon + ' ' + m.label,
                  budgetEnabled && el('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#94a3b8' } }, '\uD83D\uDCB2' + m.cost)
                );
              })
            )
          ),

          // Custom Color Palette
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFA8 Custom Color'),
            el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3 } },
              ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f8fafc','#94a3b8','#94a3b8','#1e293b'].map(function (c) {
                return el('button', { key: c, onClick: function () { upd('activeColor', c); }, title: c, style: {
                  width: 20, height: 20, borderRadius: 5, background: c, cursor: 'pointer',
                  border: activeColor === c ? '3px solid #fff' : '1px solid rgba(255,255,255,.2)',
                  boxShadow: activeColor === c ? '0 0 6px ' + c + '88' : 'none',
                  transform: activeColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s ease'
                } });
              })
            )
          ),

          // Mirror / Symmetry tools
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83E\uDE9E Mirror & Symmetry'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('button', { onClick: mirrorBuildX, disabled: !blocks.length, style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: blocks.length ? '#94a3b8' : '#475569', cursor: blocks.length ? 'pointer' : 'default' } }, '\u2194\uFE0F X'),
              el('button', { onClick: mirrorBuildZ, disabled: !blocks.length, style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: blocks.length ? '#94a3b8' : '#475569', cursor: blocks.length ? 'pointer' : 'default' } }, '\u2195\uFE0F Z'),
              el('button', { onClick: function () { upd('symmetryMode', !symmetryMode); }, style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: symmetryMode ? '2px solid #f472b6' : '1px solid #334155', borderRadius: 6, background: symmetryMode ? 'rgba(244,114,182,.15)' : 'transparent', color: symmetryMode ? '#f9a8d4' : '#94a3b8', cursor: 'pointer' } }, symmetryMode ? '\u2705 Sym' : '\uD83E\uDE9E Sym')
            )
          ),

          // Budget bar (when enabled)
          budgetEnabled && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: overBudget ? '#f87171' : '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCB0 Budget'),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 } },
              el('span', { style: { color: '#94a3b8' } }, 'Spent: \uD83D\uDCB2' + totalCost),
              el('span', { style: { color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700 } }, 'Left: \uD83D\uDCB2' + budgetRemaining)
            ),
            el('div', { style: { height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' } },
              el('div', { style: { height: '100%', width: Math.min(100, budgetPct) + '%', background: overBudget ? 'linear-gradient(90deg,#ef4444,#dc2626)' : budgetPct > 75 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 4, transition: 'width 0.3s ease' } })
            ),
            // Budget slider
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 } },
              el('span', { style: { fontSize: 11, color: '#94a3b8' } }, '\uD83D\uDCB2' + budget),
              el('input', { type: 'range', 'aria-label': 'budget', min: 50, max: 500, step: 25, value: budget, onChange: function (e) { upd('budget', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#f59e0b' } })
            )
          ),

          // Layer View
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDDC2\uFE0F Layer View'),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              el('span', { style: { fontSize: 10, color: viewLayer === -1 ? '#4ade80' : '#f59e0b', fontWeight: 700, minWidth: 28 } }, viewLayer === -1 ? 'All' : 'Y' + viewLayer),
              el('input', { type: 'range', 'aria-label': 'All', min: -1, max: Math.max(0, maxY), step: 1, value: viewLayer, onChange: function (e) { upd('viewLayer', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#60a5fa' } })
            ),
            viewLayer >= 0 && el('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
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
                    el('div', { style: { fontSize: 8, color: done ? '#22c55e' : '#94a3b8' } }, done ? 'Done!' : chItem.desc)
                  ),
                  el('span', { style: { fontSize: 11, color: done ? '#22c55e' : '#f59e0b', fontWeight: 700, flexShrink: 0 } }, done ? '\u2605' : '+' + chItem.xp)
                );
              })
            ),
            justCompleted && challengeProgress && el('button', { onClick: completeChallenge, style: {
              marginTop: 6, width: '100%', padding: '7px 10px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
              fontWeight: 700, fontSize: 11, cursor: 'pointer', animation: 'pulse 1.5s ease-in-out infinite'
            } }, '\uD83C\uDFC6 Claim +' + challengeProgress.challenge.xp + ' XP!')
          ),

          // Gallery Panel
          showGallery && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCBE Saved Builds (' + galleryItems.length + ')'),
            galleryItems.length === 0
              ? el('div', { style: { fontSize: 10, color: '#94a3b8', padding: 6 } }, 'No saved builds yet. Click \uD83D\uDCBE Save!')
              : el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' } },
                galleryItems.map(function (item) {
                  return el('div', { key: item.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid #334155' } },
                    el('div', { style: { flex: 1, minWidth: 0 } },
                      el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f8fafc' } }, item.name),
                      el('div', { style: { fontSize: 8, color: '#94a3b8' } }, item.blockCount + ' blocks \u2022 ' + item.dims)
                    ),
                    el('button', { onClick: function () { loadBuild(item); }, style: { background: 'rgba(96,165,250,.15)', border: '1px solid #60a5fa', color: '#93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\u21E9'),
                    el('button', { onClick: function () { deleteBuild(item.id); }, style: { background: 'rgba(239,68,68,.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\u2715')
                  );
                })
              )
          ),

          // Templates Panel
          showTemplates && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCC2 Templates'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              templates.map(function (tpl) {
                return el('button', { key: tpl.id, onClick: function () { loadTemplate(tpl); }, style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 10, fontWeight: 600,
                  border: '1px solid #334155', borderRadius: 8, background: 'transparent',
                  color: '#94a3b8', cursor: 'pointer', textAlign: 'left', width: '100%'
                } },
                  el('span', { style: { fontSize: 16, flexShrink: 0 } }, tpl.icon),
                  el('div', { style: { flex: 1 } },
                    el('div', { style: { fontWeight: 700, color: '#f8fafc', fontSize: 11 } }, tpl.name),
                    el('div', { style: { fontSize: 8, color: '#94a3b8' } }, tpl.desc)
                  )
                );
              })
            )
          ),

          // Earthquake Simulator
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDF0B Earthquake Test'),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 } },
              el('span', { style: { fontSize: 11, color: '#94a3b8', minWidth: 20 } }, quakeIntensity + '/10'),
              el('input', { type: 'range', 'aria-label': 'quake intensity', min: 1, max: 10, value: quakeIntensity, onChange: function (e) { upd('quakeIntensity', parseInt(e.target.value)); }, style: { flex: 1, height: 4, accentColor: '#ef4444' } })
            ),
            el('button', { onClick: runEarthquake, disabled: !blocks.length, style: {
              width: '100%', padding: '6px 10px', borderRadius: 8, border: 'none',
              background: blocks.length ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(71,85,105,.3)',
              color: blocks.length ? '#fff' : '#475569', fontWeight: 700, fontSize: 10, cursor: blocks.length ? 'pointer' : 'default'
            } }, '\uD83C\uDF0B Shake! (Intensity ' + quakeIntensity + ')'),
            quakeResult && el('div', { style: { marginTop: 4, padding: '5px 8px', background: quakeResult.pct >= 70 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', border: '1px solid ' + (quakeResult.pct >= 70 ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'), borderRadius: 8, fontSize: 11, color: quakeResult.pct >= 70 ? '#4ade80' : '#fca5a5', lineHeight: 1.4 } },
              quakeResult.rating + ' \u2022 ' + quakeResult.pct + '% survived \u2022 ' + quakeResult.fallen + ' fell'
            )
          ),

          // Copy Region (Duplicate)
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCB Duplicate Build'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('button', { onClick: function () { duplicateBuild(buildW + 1, 0, 0); }, disabled: !blocks.length, title: 'Copy to the right', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: blocks.length ? '#94a3b8' : '#475569', cursor: blocks.length ? 'pointer' : 'default' } }, '\u27A1\uFE0F +X'),
              el('button', { onClick: function () { duplicateBuild(0, 0, buildD + 1); }, disabled: !blocks.length, title: 'Copy forward', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: blocks.length ? '#94a3b8' : '#475569', cursor: blocks.length ? 'pointer' : 'default' } }, '\u2B07\uFE0F +Z'),
              el('button', { onClick: function () { duplicateBuild(0, buildH, 0); }, disabled: !blocks.length, title: 'Copy upward', style: { flex: 1, padding: '5px 4px', fontSize: 10, fontWeight: 600, border: '1px solid #334155', borderRadius: 6, background: 'transparent', color: blocks.length ? '#94a3b8' : '#475569', cursor: blocks.length ? 'pointer' : 'default' } }, '\u2B06\uFE0F +Y')
            )
          ),

          // Real-World Scale
          totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCF Real-World Scale'),
            el('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '6px 8px' } },
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
            el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 600 } }, 'By Material:'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              bomMaterialEntries.map(function (e) {
                return el('div', { key: e.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 9 } },
                  el('span', null, e.icon),
                  el('span', { style: { color: '#e2e8f0', fontWeight: 600, flex: 1 } }, e.label),
                  el('span', { style: { color: '#94a3b8' } }, '\u00D7' + e.count),
                  budgetEnabled && el('span', { style: { color: '#fbbf24', fontSize: 8 } }, '\uD83D\uDCB2' + e.cost)
                );
              })
            ),
            el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 2, marginTop: 6, fontWeight: 600 } }, 'By Shape:'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              bomShapeEntries.map(function (e) {
                return el('div', { key: e.id, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 9 } },
                  el('span', null, e.icon),
                  el('span', { style: { color: '#e2e8f0', fontWeight: 600, flex: 1 } }, e.label),
                  el('span', { style: { color: '#94a3b8' } }, '\u00D7' + e.count)
                );
              })
            )
          ),

          // Block Statistics Chart
          showStats && totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDCCA Block Stats'),
            el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3, fontWeight: 600 } }, 'Material Distribution'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              bomMaterialEntries.map(function (e) {
                var pct = maxMatCount > 0 ? Math.round((e.count / maxMatCount) * 100) : 0;
                var mat = materials.find(function (m) { return m.id === e.id; });
                var barColor = mat ? mat.color : '#94a3b8';
                return el('div', { key: e.id },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 1 } },
                    el('span', { style: { color: '#cbd5e1' } }, e.icon + ' ' + e.label),
                    el('span', { style: { color: '#94a3b8' } }, e.count)
                  ),
                  el('div', { style: { height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: pct + '%', background: barColor, borderRadius: 3, transition: 'width 0.3s ease' } })
                  )
                );
              })
            ),
            el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 3, marginTop: 8, fontWeight: 600 } }, 'Shape Distribution'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              bomShapeEntries.map(function (e) {
                var pct = maxShapeCount > 0 ? Math.round((e.count / maxShapeCount) * 100) : 0;
                return el('div', { key: e.id },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 1 } },
                    el('span', { style: { color: '#cbd5e1' } }, e.icon + ' ' + e.label),
                    el('span', { style: { color: '#94a3b8' } }, e.count)
                  ),
                  el('div', { style: { height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' } },
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
                return el('div', { key: st.name, style: { padding: '6px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid #334155' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 } },
                    el('span', { style: { fontSize: 14 } }, st.icon),
                    el('span', { style: { fontWeight: 700, fontSize: 11, color: '#f8fafc' } }, st.name),
                    el('span', { style: { fontSize: 8, color: '#94a3b8', marginLeft: 'auto' } }, st.era)
                  ),
                  el('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4, marginBottom: 3 } }, st.features),
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
                return el('div', { key: pi, style: { padding: '5px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid #334155' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 } },
                    el('span', { style: { fontWeight: 700, fontSize: 10, color: '#f8fafc' } }, (pi + 1) + '. ' + ph.name),
                    el('span', { style: { fontSize: 11, color: '#94a3b8' } }, 'Y=' + ph.y + ' \u2022 ' + ph.count + ' blocks')
                  ),
                  el('div', { style: { height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden', marginBottom: 2 } },
                    el('div', { style: { height: '100%', width: phPct + '%', background: 'linear-gradient(90deg,#2dd4bf,#14b8a6)', borderRadius: 2 } })
                  ),
                  el('div', { style: { fontSize: 8, color: '#94a3b8' } }, Object.keys(ph.mats).map(function (m) { return m + ':\u00D7' + ph.mats[m]; }).join(' \u2022 '))
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
              el('textarea', { value: shareCode, readOnly: true, onClick: function (e) { e.target.select(); }, style: {
                width: '100%', height: 50, padding: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
                color: '#94a3b8', fontSize: 8, fontFamily: 'monospace', resize: 'none'
              }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' })
            ),
            el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Paste a code below to import:'),
            el('div', { style: { display: 'flex', gap: 3 } },
              el('input', { type: 'text', placeholder: 'Paste share code...', value: d.importCode || '',
                onChange: function (e) { upd('importCode', e.target.value); },
                style: { flex: 1, padding: '5px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 9 }, className: 'outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'
              }),
              el('button', { onClick: function () { importShareCode(d.importCode); }, style: {
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer'
              } }, '\u21E9')
            )
          ),

          // Keyboard Shortcuts Reference
          el('div', { style: { marginTop: 4, padding: '6px 8px', background: 'rgba(15,23,42,.5)', borderRadius: 8, border: '1px solid #1e293b' } },
            el('div', { style: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 } }, '\u2328\uFE0F Shortcuts'),
            el('div', { style: { fontSize: 8, color: '#475569', lineHeight: 1.6 } },
              el('div', null, 'Ctrl+Z Undo \u2022 Ctrl+Y Redo'),
              el('div', null, '1-9 Select shape \u2022 P/E/T Mode'),
              el('div', null, 'S Screenshot \u2022 G Gravity')
            )
          ),

          // ── Random Build Generator ──
          showRandomGen && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDFB2 Random Generator'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              randomPresets.map(function (preset) {
                return el('button', { key: preset.id, onClick: function () { generateRandom(preset.id); }, style: {
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
                  background: 'rgba(30,41,59,.5)', border: '1px solid #334155', cursor: 'pointer', width: '100%', textAlign: 'left'
                } },
                  el('span', { style: { fontSize: 14 } }, preset.icon),
                  el('div', null,
                    el('div', { style: { fontSize: 10, fontWeight: 700, color: '#e2e8f0' } }, preset.name),
                    el('div', { style: { fontSize: 8, color: '#94a3b8' } }, preset.desc)
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
                return el('button', { key: c, onClick: function () { upd({ activeColor: c, customColor: c }); }, style: {
                  width: 18, height: 18, borderRadius: 4, border: customColor === c ? '2px solid #fff' : '1px solid #475569',
                  background: c, cursor: 'pointer', padding: 0
                } });
              })
            ),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
              el('input', { type: 'color', value: customColor, onChange: function (e) { upd({ activeColor: e.target.value, customColor: e.target.value }); }, style: { width: 28, height: 22, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' } }),
              el('span', { style: { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' } }, customColor),
              el('button', { onClick: function () { upd({ activeColor: customColor, mode: 'paint' }); }, style: {
                marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: 'none',
                background: 'linear-gradient(135deg,#ec4899,#f472b6)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer'
              } }, '\uD83C\uDFA8 Paint')
            )
          ),

          // ── Cross-Section Slicer ──
          showSlice && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD2C Cross-Section (Z)'),
            el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 4 } },
              el('button', { onClick: function () { upd('sliceZ', -1); }, style: {
                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: sliceZ === -1 ? 'rgba(34,211,238,.2)' : 'transparent', border: sliceZ === -1 ? '1px solid #22d3ee' : '1px solid #334155', color: sliceZ === -1 ? '#67e8f9' : '#94a3b8'
              } }, 'All'),
              sliceZLevels.map(function (z) {
                return el('button', { key: z, onClick: function () { upd('sliceZ', z); }, style: {
                  padding: '3px 6px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: sliceZ === z ? 'rgba(34,211,238,.2)' : 'transparent', border: sliceZ === z ? '1px solid #22d3ee' : '1px solid #334155', color: sliceZ === z ? '#67e8f9' : '#94a3b8'
                } }, 'Z=' + z);
              })
            ),
            sliceZ >= 0 && el('div', { style: { fontSize: 11, color: '#94a3b8', padding: '4px 6px', background: 'rgba(30,41,59,.5)', borderRadius: 6 } },
              '\uD83D\uDD2C Slice Z=' + sliceZ + ': ' + sliceBlocks.length + ' block' + (sliceBlocks.length !== 1 ? 's' : ''),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 } },
                sliceBlocks.map(function (b, i) {
                  var sh = shapes.find(function (s) { return s.id === (b.shape || 'block'); });
                  return el('span', { key: i, style: { fontSize: 8, padding: '1px 4px', background: 'rgba(30,41,59,.8)', borderRadius: 4, color: '#cbd5e1' } },
                    (sh ? sh.icon : '') + ' (' + b.x + ',' + b.y + ')'
                  );
                })
              )
            )
          ),

          // ── Structural Load Heatmap Legend ──
          showHeatmap && totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD25 Load Heatmap'),
            el('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginBottom: 4 } },
              'Shows load (weight supported) per block column. Blocks at the base carry the most load.'
            ),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 } },
              el('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' } }),
              el('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', position: 'absolute', fontSize: 7, color: '#94a3b8', pointerEvents: 'none' } })
            ),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' } },
              el('span', null, 'Low'),
              el('span', null, 'Max: ' + maxLoad.toFixed(1))
            ),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, maxHeight: 120, overflowY: 'auto' } },
              Object.keys(blockLoads).sort(function (a, b) { return blockLoads[b] - blockLoads[a]; }).slice(0, 10).map(function (key) {
                var load = blockLoads[key];
                var pct = maxLoad > 0 ? Math.round((load / maxLoad) * 100) : 0;
                var heatColor = pct > 66 ? '#ef4444' : pct > 33 ? '#eab308' : '#22c55e';
                return el('div', { key: key, style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 8 } },
                  el('span', { style: { color: '#94a3b8', minWidth: 50, fontFamily: 'monospace' } }, key),
                  el('div', { style: { flex: 1, height: 4, background: '#0f172a', borderRadius: 2, overflow: 'hidden' } },
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
              ? el('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'No undo history yet. Build something first!')
              : el('div', null,
                  el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4, textAlign: 'center', fontWeight: 600 } }, replayLabel),
                  el('div', { style: { display: 'flex', gap: 4, justifyContent: 'center' } },
                    el('button', { onClick: function () { upd('replayStep', 0); }, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 10 } }, '\u23EE'),
                    el('button', { onClick: function () { stepReplay(-1); }, disabled: replayStep <= 0, style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: replayStep > 0 ? '#e2e8f0' : '#475569', cursor: replayStep > 0 ? 'pointer' : 'default', fontSize: 10 } }, '\u25C0'),
                    el('button', { onClick: function () { stepReplay(1); }, disabled: replayStep >= replayFrames, style: { padding: '4px 10px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: replayStep < replayFrames ? '#e2e8f0' : '#475569', cursor: replayStep < replayFrames ? 'pointer' : 'default', fontSize: 10 } }, '\u25B6'),
                    el('button', { onClick: function () { upd('replayStep', replayFrames); }, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 10 } }, '\u23ED')
                  ),
                  el('div', { style: { marginTop: 4 } },
                    el('input', { type: 'range', 'aria-label': 'replay step', min: 0, max: replayFrames, value: replayStep >= 0 ? replayStep : replayFrames, onChange: function (e) { upd('replayStep', parseInt(e.target.value)); }, style: { width: '100%', accentColor: '#fbbf24' } })
                  ),
                  el('div', { style: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 2 } },
                    (replayStep >= 0 && replayStep < replayFrames ? replayBlocks.length : totalBlocks) + ' blocks at this step'
                  ),
                  el('button', { onClick: exitReplay, style: { width: '100%', marginTop: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(71,85,105,.3)', color: '#94a3b8', fontWeight: 600, fontSize: 11, cursor: 'pointer' } }, '\u2716 Exit Replay')
                )
          ),

          // ── Block Search / Filter ──
          showFilter && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83D\uDD0D Block Filter'),
            el('div', { style: { marginBottom: 4 } },
              el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 2 } }, 'Material:'),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 } },
                el('button', { onClick: function () { upd('filterMaterial', ''); }, style: { padding: '2px 6px', borderRadius: 4, fontSize: 8, border: !filterMaterial ? '1px solid #60a5fa' : '1px solid #334155', background: !filterMaterial ? 'rgba(96,165,250,.15)' : 'transparent', color: !filterMaterial ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, 'All'),
                materials.map(function (m) {
                  return el('button', { key: m.id, onClick: function () { upd('filterMaterial', m.id); }, style: { padding: '2px 6px', borderRadius: 4, fontSize: 8, border: filterMaterial === m.id ? '1px solid #60a5fa' : '1px solid #334155', background: filterMaterial === m.id ? 'rgba(96,165,250,.15)' : 'transparent', color: filterMaterial === m.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, m.icon + ' ' + m.label);
                })
              )
            ),
            el('div', { style: { marginBottom: 4 } },
              el('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 2 } }, 'Shape:'),
              el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 } },
                el('button', { onClick: function () { upd('filterShape', ''); }, style: { padding: '2px 6px', borderRadius: 4, fontSize: 8, border: !filterShape ? '1px solid #60a5fa' : '1px solid #334155', background: !filterShape ? 'rgba(96,165,250,.15)' : 'transparent', color: !filterShape ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, 'All'),
                shapes.map(function (s) {
                  return el('button', { key: s.id, onClick: function () { upd('filterShape', s.id); }, style: { padding: '2px 6px', borderRadius: 4, fontSize: 8, border: filterShape === s.id ? '1px solid #60a5fa' : '1px solid #334155', background: filterShape === s.id ? 'rgba(96,165,250,.15)' : 'transparent', color: filterShape === s.id ? '#93c5fd' : '#94a3b8', cursor: 'pointer' } }, s.icon);
                })
              )
            ),
            el('div', { style: { padding: '4px 8px', background: filterActive ? 'rgba(96,165,250,.1)' : 'rgba(30,41,59,.4)', borderRadius: 6, fontSize: 11, color: filterActive ? '#93c5fd' : '#94a3b8', fontWeight: 600 } },
              '\uD83D\uDD0D ' + filterCount + ' block' + (filterCount !== 1 ? 's' : '') + ' match' + (filterCount === 1 ? 'es' : '')
            ),
            filterActive && el('button', { onClick: deleteFiltered, style: {
              width: '100%', marginTop: 4, padding: '5px 10px', borderRadius: 6, border: 'none',
              background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer'
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
                    el('div', { style: { fontSize: 8, color: earned ? '#94a3b8' : '#475569' } }, badge.desc)
                  ),
                  earned && el('span', { style: { fontSize: 10, color: '#fb923c' } }, '\u2713')
                );
              })
            )
          ),

          // ── Wind Resistance ──
          totalBlocks > 0 && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#5eead4', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 } }, '\uD83C\uDF2C\uFE0F Wind Resistance'),
            el('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '6px 8px' } },
              el('div', null, windAnalysis.emoji + ' Rating: ' + windAnalysis.rating + (windAnalysis.score != null ? ' (' + windAnalysis.score + '%)' : '')),
              el('div', null, '\uD83D\uDCD0 Frontal area: ' + windAnalysis.frontalArea + ' u\u00B2'),
              el('div', null, '\uD83D\uDCD0 Side area: ' + windAnalysis.sideArea + ' u\u00B2'),
              el('div', null, '\uD83C\uDF2C\uFE0F Drag coeff: ' + windAnalysis.dragCoeff),
              el('div', { style: { marginTop: 2, fontSize: 8, color: '#94a3b8' } },
                parseFloat(windAnalysis.dragCoeff) > 0.8 ? '\uD83D\uDCA1 Use domes, pyramids, or cylinders to reduce drag!' :
                parseFloat(windAnalysis.dragCoeff) > 0.5 ? '\uD83D\uDCA1 Good mix of aerodynamic shapes!' :
                '\u2705 Very aerodynamic design!')
            )
          ),

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
                return el('div', { key: floor.y, style: { padding: '5px 8px', background: 'rgba(30,41,59,.5)', borderRadius: 8, border: '1px solid #334155' } },
                  el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 } },
                    el('span', { style: { fontSize: 10, fontWeight: 700, color: '#f8fafc' } }, 'Y=' + floor.y),
                    el('span', { style: { fontSize: 8, color: '#94a3b8' } }, floor.count + ' blocks')
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
        el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' } },
          // Three.js canvas
          !threeReady
            ? el('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 } },
              el('div', { style: { textAlign: 'center' } },
                el('div', { style: { fontSize: 32, marginBottom: 8, animation: 'spin 2s linear infinite' } }, '\u2699\uFE0F'),
                'Loading 3D engine...'
              )
            )
            : el('canvas', { id: 'arch-studio-canvas', 'aria-label': 'Interactive architecture studio 3D visualization', tabIndex: 0, style: { flex: 1, width: '100%', display: 'block', cursor: mode === 'place' ? 'crosshair' : mode === 'erase' ? 'not-allowed' : 'pointer' } }),

          // Controls overlay (top-right)
          el('div', { style: { position: 'absolute', top: 8, right: 8, background: 'rgba(15,23,42,.85)', borderRadius: 10, padding: '6px 10px', fontSize: 11, color: '#94a3b8', lineHeight: 1.6, backdropFilter: 'blur(8px)', border: '1px solid #1e293b' } },
            el('div', null, '\uD83D\uDD04 Drag \u2014 Orbit'),
            el('div', null, '\uD83D\uDD0D Scroll \u2014 Zoom'),
            el('div', null, '\u2747\uFE0F Right-drag \u2014 Pan'),
            el('div', null, '\uD83D\uDC49 Click \u2014 ' + (mode === 'place' ? 'Place' : mode === 'erase' ? 'Erase' : 'Paint')),
            symmetryMode && el('div', { style: { color: '#f9a8d4', fontWeight: 700 } }, '\uD83E\uDE9E Symmetry ON')
          ),

          // Mode indicator (top-left)
          el('div', { style: { position: 'absolute', top: 8, left: 8, background: mode === 'place' ? 'rgba(34,197,94,.2)' : mode === 'erase' ? 'rgba(239,68,68,.2)' : 'rgba(168,85,247,.2)', border: '1px solid ' + (mode === 'place' ? '#22c55e' : mode === 'erase' ? '#ef4444' : '#a855f7'), borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: mode === 'place' ? '#4ade80' : mode === 'erase' ? '#f87171' : '#c084fc' } },
            (mode === 'place' ? '\u2795 Place' : mode === 'erase' ? '\u274C Erase' : '\uD83C\uDFA8 Paint') + ' Mode',
            activeRotation > 0 && el('span', { style: { marginLeft: 6, fontSize: 11, color: '#fbbf24' } }, activeRotation + '\u00B0')
          ),

          // Analysis overlay (right side)
          showAnalysis && totalBlocks > 0 && el('div', { style: { position: 'absolute', top: 70, right: 8, width: 210, background: 'rgba(15,23,42,.92)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(12px)', border: '1px solid #334155', zIndex: 10 } },
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 } }, '\uD83D\uDCD0 Structural Analysis'),
            el('div', { style: { textAlign: 'center', marginBottom: 10, padding: '8px 0', background: 'rgba(30,41,59,.6)', borderRadius: 10, border: '1px solid #334155' } },
              el('div', { style: { fontSize: 24, marginBottom: 2 } }, analysis.stabilityEmoji),
              el('div', { style: { fontSize: 20, fontWeight: 800, color: analysis.stability >= 70 ? '#4ade80' : analysis.stability >= 40 ? '#fbbf24' : '#f87171' } }, analysis.stability + '%'),
              el('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, analysis.stabilityLabel)
            ),
            analysisBar('Load Support', analysis.supportedPct, 100, analysis.supportedPct >= 80 ? '#4ade80' : '#f87171', '%'),
            analysisBar('Symmetry', analysis.symmetry, 100, analysis.symmetry >= 70 ? '#60a5fa' : '#f87171', '%'),
            el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 } },
              [
                { label: 'CoG', value: '(' + analysis.cogX + ',' + analysis.cogY + ',' + analysis.cogZ + ')', icon: '\u2316' },
                { label: 'Weight', value: analysis.totalWeight + 't', icon: '\u2696\uFE0F' },
                { label: 'Materials', value: analysis.materialCount, icon: '\uD83C\uDFA8' },
                { label: 'Floating', value: analysis.unsupported, icon: analysis.unsupported > 0 ? '\u26A0\uFE0F' : '\u2705' }
              ].map(function (r) {
                return el('div', { key: r.label, style: { background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '4px 6px', textAlign: 'center' } },
                  el('div', { style: { fontSize: 8, color: '#94a3b8', fontWeight: 600 } }, r.icon + ' ' + r.label),
                  el('div', { style: { fontSize: 11, fontWeight: 700, color: r.label === 'Floating' && analysis.unsupported > 0 ? '#f87171' : '#f8fafc' } }, r.value)
                );
              })
            ),
            analysis.unsupported > 0 && el('div', { style: { marginTop: 6, padding: '6px 8px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: 11, color: '#fca5a5', lineHeight: 1.4 } },
              '\u26A0\uFE0F ' + analysis.unsupported + ' floating block' + (analysis.unsupported > 1 ? 's' : '') + '!'
            )
          ),

          // AI Architect overlay (left side, below mode indicator)
          showAI && el('div', { style: { position: 'absolute', top: 44, left: 8, width: 240, background: 'rgba(15,23,42,.92)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(12px)', border: '1px solid #334155', zIndex: 10 } },
            el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 } },
              el('span', { style: { fontSize: 10, fontWeight: 700, color: '#f9a8d4', textTransform: 'uppercase', letterSpacing: 1.2 } }, '\uD83E\uDD16 AI Architect'),
              el('button', { onClick: askAIArchitect, disabled: aiLoading, style: { marginLeft: 'auto', background: aiLoading ? 'rgba(71,85,105,.5)' : 'linear-gradient(135deg,#f472b6,#ec4899)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3 Thinking...' : '\u2728 Ask Again')
            ),
            aiLoading && !aiAdvice
              ? el('div', { style: { textAlign: 'center', padding: 12, color: '#94a3b8', fontSize: 11 } },
                el('div', { style: { fontSize: 20, animation: 'spin 2s linear infinite', marginBottom: 4 } }, '\uD83E\uDD16'),
                'Analyzing your structure...'
              )
              : aiAdvice
                ? el('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-line' } }, aiAdvice)
                : el('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, 'Click "Ask Again" for personalized architecture tips!')
          ),

          // Bottom stats bar
          el('div', { style: { display: 'flex', gap: 12, justifyContent: 'center', padding: '6px 12px', background: 'linear-gradient(0deg,#1e293b,#0f172a)', borderTop: '1px solid #334155', flexWrap: 'wrap' } },
            [
              { label: 'Blocks', value: totalBlocks, icon: '\uD83E\uDDF1' },
              { label: 'Size', value: blocks.length > 0 ? buildW + '\u00D7' + buildD + '\u00D7' + buildH : '\u2014', icon: '\uD83D\uDCCF' },
              { label: 'Volume', value: totalVolume + 'u\u00B3', icon: '\uD83D\uDCE6' },
              { label: 'Footprint', value: footprint + 'u\u00B2', icon: '\uD83D\uDDFA\uFE0F' },
              { label: 'Surface', value: surfaceArea + 'u\u00B2', icon: '\uD83D\uDCC0' },
              { label: 'Stability', value: analysis.stabilityEmoji + analysis.stability + '%', icon: '\uD83C\uDFD7\uFE0F' },
              budgetEnabled && { label: 'Cost', value: '\uD83D\uDCB2' + totalCost + '/' + budget, icon: '\uD83D\uDCB0' },
              { label: 'Challenges', value: completedCount + '/10', icon: '\uD83C\uDFC6' }
            ].filter(Boolean).map(function (stat) {
              return el('div', { key: stat.label, style: { textAlign: 'center' } },
                el('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, stat.icon + ' ' + stat.label),
                el('div', { style: { fontSize: 14, fontWeight: 700, color: '#f8fafc' } }, stat.value)
              );
            })
          )
        )
      ),

      // ── Coach panel ──
      el('div', { style: { padding: '8px 14px', background: '#1e293b', borderTop: '1px solid #334155', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 } },
        coachTip
      )
    );
  }});
})();
