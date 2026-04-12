// ═══════════════════════════════════════════
// stem_tool_echotrainer.js — Echo Navigator: 3D Spatial Audio Echolocation Trainer
// First-person 3D navigation using HRTF binaural spatial audio + Three.js.
// Students emit sonar clicks and listen for echoes off virtual walls, objects,
// and moving agents (pedestrians, cars, bats, joggers, cyclists) to build a mental map.
// The world is pitch-black — the only way to "see" is via sonar Echo Vision pulses.
// Designed as an accessibility training tool and perceptual skill builder.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('echoTrainer'))) {

(function() {
  'use strict';

  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById('echotrainer-a11y-css')) {
    var _s = document.createElement('style');
    _s.id = 'echotrainer-a11y-css';
    _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }';
    document.head.appendChild(_s);
  }

  // WCAG live region
  (function() {
    if (document.getElementById('allo-live-echotrainer')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-echotrainer';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  var SPEED_OF_SOUND = 343; // m/s

  // ── Seeded PRNG for reproducible environments ──
  function seededRng(seed) {
    var s = seed || 1;
    return function() { s = (s * 16807 + 1) % 2147483647; return (s - 1) / 2147483646; };
  }

  // ── Environments that support 3D rendering ──
  var ENV_3D_READY = { urban: true, cave: true, simple_room: true, forest: true, corridor: true, school: true, grocery: true, park: true };

  // ── Environment presets ──
  var ENVIRONMENTS = [
    { id: 'simple_room', name: 'Simple Room', icon: '\uD83C\uDFE0', desc: 'A rectangular room with one pillar. Good for beginners.', complexity: 1 },
    { id: 'cave', name: 'Cave System', icon: '\uD83E\uDD87', desc: 'Irregular walls, stalactites, and narrow passages.', complexity: 2 },
    { id: 'corridor', name: 'Corridor Maze', icon: '\uD83C\uDFDB\uFE0F', desc: 'Hallways and turns \u2014 can you find the exit?', complexity: 3 },
    { id: 'forest', name: 'Forest Path', icon: '\uD83C\uDF32', desc: 'Trees and rocks in an open space. Materials vary.', complexity: 2 },
    { id: 'urban', name: 'Urban Street', icon: '\uD83C\uDFD9\uFE0F', desc: 'Buildings, metal posts, glass, moving pedestrians and cars.', complexity: 3 },
    { id: 'school', name: 'School Hallway', icon: '\uD83C\uDFEB', desc: 'Navigate a school: classrooms, lockers, trophy case. Find the main office.', complexity: 2 },
    { id: 'grocery', name: 'Grocery Store', icon: '\uD83D\uDED2', desc: 'Aisles, freezers, deli counter. Reach the checkout while avoiding shoppers.', complexity: 3 },
    { id: 'park', name: 'City Park', icon: '\uD83C\uDFDE\uFE0F', desc: 'Benches, fountain, playground, paths. Joggers and cyclists pass by.', complexity: 2 },
    { id: 'challenge', name: 'Random Challenge', icon: '\uD83C\uDFB2', desc: 'Procedurally generated. Every attempt is unique.', complexity: 4 }
  ];

  // ── Progressive environment unlock system ──
  var ENV_UNLOCK = {
    simple_room: { requires: null },
    corridor: { requires: 'goalsFound >= 1', label: 'Find 1 goal' },
    cave: { requires: 'goalsFound >= 1', label: 'Find 1 goal' },
    forest: { requires: 'goalsFound >= 2', label: 'Find 2 goals' },
    urban: { requires: 'goalsFound >= 3', label: 'Find 3 goals' },
    school: { requires: 'goalsFound >= 3', label: 'Find 3 goals' },
    grocery: { requires: 'goalsFound >= 5', label: 'Find 5 goals' },
    park: { requires: 'goalsFound >= 5', label: 'Find 5 goals' },
    challenge: { requires: 'goalsFound >= 8', label: 'Find 8 goals' }
  };

  function isEnvUnlocked(envId, toolData) {
    var u = ENV_UNLOCK[envId];
    if (!u || !u.requires) return true;
    var g = toolData.goalsFound || 0;
    if (u.requires === 'goalsFound >= 1') return g >= 1;
    if (u.requires === 'goalsFound >= 2') return g >= 2;
    if (u.requires === 'goalsFound >= 3') return g >= 3;
    if (u.requires === 'goalsFound >= 5') return g >= 5;
    if (u.requires === 'goalsFound >= 8') return g >= 8;
    return true;
  }

  // ── Material glow colors for 3D sonar illumination ──
  var GLOW_COLORS = {
    concrete: [0x64, 0xa0, 0xff],
    rock:     [0x88, 0xa0, 0xb8],
    wood:     [0xd4, 0x96, 0x4b],
    metal:    [0xe0, 0xf0, 0xff],
    glass:    [0x9c, 0xea, 0xff],
    flesh:    [0xff, 0x9c, 0x9c],
    car:      [0xff, 0xc4, 0x7c],
    goal:     [0xff, 0xd8, 0x40]
  };

  // ── Difficulty presets ──
  var DIFFICULTY = [
    { id: 'easy', label: 'Explorer', icon: '\uD83C\uDF3F', agentSpeedMult: 0.5, ghostDecay: 0.008, ghostMax: 0.14, xpMult: 0.7, desc: 'Slower agents, longer ghost outlines' },
    { id: 'normal', label: 'Navigator', icon: '\u2699\uFE0F', agentSpeedMult: 1.0, ghostDecay: 0.015, ghostMax: 0.08, xpMult: 1.0, desc: 'Standard difficulty' },
    { id: 'hard', label: 'Echolocator', icon: '\uD83D\uDD25', agentSpeedMult: 1.5, ghostDecay: 0.04, ghostMax: 0.04, xpMult: 1.5, desc: 'Faster agents, ghosts fade quickly' },
    { id: 'master', label: 'Bat Master', icon: '\uD83E\uDD87', agentSpeedMult: 2.0, ghostDecay: 999, ghostMax: 0, xpMult: 2.0, desc: 'No ghost outlines, double-speed agents' }
  ];

  // ══════════════════════════════════════════════════════════
  // SOUND LANDMARKS — persistent positional audio anchors
  // ══════════════════════════════════════════════════════════
  var LANDMARKS = {
    school: [
      { x: 650, y: 400, name: 'Clock', freq: 800, type: 'tick', interval: 1.0, gain: 0.015 },
      { x: 350, y: 435, name: 'Vending Machine', freq: 100, type: 'hum', gain: 0.008 }
    ],
    grocery: [
      { x: 350, y: 720, name: 'Checkout Scanner', freq: 1200, type: 'beep', interval: 3.0, gain: 0.012 },
      { x: 620, y: 110, name: 'Freezer Compressor', freq: 65, type: 'hum', gain: 0.01 }
    ],
    park: [
      { x: 400, y: 400, name: 'Fountain', freq: 400, type: 'hum', gain: 0.008 },
      { x: 590, y: 560, name: 'Playground Squeaking', freq: 1600, type: 'tick', interval: 0.5, gain: 0.006 }
    ],
    urban: [
      { x: 400, y: 380, name: 'Traffic Signal', freq: 1000, type: 'beep', interval: 1.5, gain: 0.01 },
      { x: 700, y: 400, name: 'Crosswalk Chirp', freq: 2400, type: 'tick', interval: 0.8, gain: 0.008 }
    ],
    cave: [
      { x: 400, y: 300, name: 'Underground Stream', freq: 250, type: 'hum', gain: 0.012 }
    ]
  };

  // ══════════════════════════════════════════════════════════
  // WAYPOINT ROUTES — multi-goal navigation challenges
  // ══════════════════════════════════════════════════════════
  var WAYPOINT_ROUTES = {
    school: {
      name: 'Classroom to Office',
      points: [
        { x: 150, y: 550, label: 'Start: Classroom' },
        { x: 400, y: 400, label: 'Hallway Junction' },
        { x: 650, y: 400, label: 'Water Fountain' },
        { x: 500, y: 580, label: 'Main Office' }
      ]
    },
    grocery: {
      name: 'Shopping Trip',
      points: [
        { x: 150, y: 300, label: 'Start: Aisle 1' },
        { x: 410, y: 450, label: 'Aisle 3 Intersection' },
        { x: 620, y: 110, label: 'Freezer Section' },
        { x: 350, y: 730, label: 'Checkout' }
      ]
    },
    park: {
      name: 'Park Tour',
      points: [
        { x: 200, y: 400, label: 'West Path' },
        { x: 400, y: 400, label: 'Fountain' },
        { x: 590, y: 590, label: 'Playground' },
        { x: 400, y: 200, label: 'North Path' }
      ]
    }
  };

  // ══════════════════════════════════════════════════════════
  // ENVIRONMENT GENERATOR
  // ══════════════════════════════════════════════════════════
  function generateEnvironment(type, seed) {
    var rng = seededRng(seed);
    var W = 800, H = 800;
    var walls = [];
    var objects = [];

    // Outer boundary (always)
    walls.push({ x1: 20, y1: 20, x2: W - 20, y2: 20, mat: 'concrete', ref: 0.92 });
    walls.push({ x1: W - 20, y1: 20, x2: W - 20, y2: H - 20, mat: 'concrete', ref: 0.92 });
    walls.push({ x1: W - 20, y1: H - 20, x2: 20, y2: H - 20, mat: 'concrete', ref: 0.92 });
    walls.push({ x1: 20, y1: H - 20, x2: 20, y2: 20, mat: 'concrete', ref: 0.92 });

    if (type === 'simple_room') {
      objects.push({ x: 400, y: 350, r: 30, mat: 'concrete', ref: 0.9 });
      walls.push({ x1: 300, y1: 200, x2: 500, y2: 200, mat: 'wood', ref: 0.5 });
    } else if (type === 'cave') {
      for (var ci = 0; ci < 5; ci++) {
        var cx = 80 + rng() * 640, cy = 80 + rng() * 640;
        var cl = 60 + rng() * 180, ca = rng() * Math.PI;
        walls.push({ x1: cx, y1: cy, x2: cx + Math.cos(ca) * cl, y2: cy + Math.sin(ca) * cl, mat: 'rock', ref: 0.85 });
      }
      for (var si = 0; si < 4; si++) {
        objects.push({ x: 100 + rng() * 600, y: 100 + rng() * 600, r: 10 + rng() * 15, mat: 'rock', ref: 0.85 });
      }
    } else if (type === 'corridor') {
      var corridorY = [200, 400, 600];
      corridorY.forEach(function(y) {
        var gapX = 150 + rng() * 500;
        walls.push({ x1: 20, y1: y, x2: gapX - 40, y2: y, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: gapX + 40, y1: y, x2: W - 20, y2: y, mat: 'concrete', ref: 0.92 });
      });
    } else if (type === 'forest') {
      for (var ti = 0; ti < 8; ti++) {
        objects.push({ x: 80 + rng() * 640, y: 80 + rng() * 640, r: 20 + rng() * 30, mat: 'wood', ref: 0.5 });
      }
      for (var ri = 0; ri < 3; ri++) {
        objects.push({ x: 100 + rng() * 600, y: 100 + rng() * 600, r: 15 + rng() * 20, mat: 'rock', ref: 0.85 });
      }
    } else if (type === 'urban') {
      for (var bi = 0; bi < 4; bi++) {
        var bx = 100 + rng() * 500, by = 100 + rng() * 500;
        var bw = 60 + rng() * 80, bh = 60 + rng() * 80;
        walls.push({ x1: bx, y1: by, x2: bx + bw, y2: by, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: bx + bw, y1: by, x2: bx + bw, y2: by + bh, mat: rng() > 0.5 ? 'glass' : 'concrete', ref: rng() > 0.5 ? 0.3 : 0.92 });
        walls.push({ x1: bx + bw, y1: by + bh, x2: bx, y2: by + bh, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: bx, y1: by + bh, x2: bx, y2: by, mat: 'concrete', ref: 0.92 });
      }
      for (var pi = 0; pi < 3; pi++) {
        objects.push({ x: 80 + rng() * 640, y: 80 + rng() * 640, r: 8, mat: 'metal', ref: 0.95 });
      }
    } else if (type === 'school') {
      // ── School Hallway layout ──
      walls.push({ x1: 60, y1: 360, x2: 120, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 180, y1: 360, x2: 400, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 400, y1: 360, x2: 460, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 520, y1: 360, x2: 740, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 60, y1: 440, x2: 120, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 180, y1: 440, x2: 400, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 400, y1: 440, x2: 460, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 520, y1: 440, x2: 740, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 60, y1: 360, x2: 60, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 740, y1: 360, x2: 740, y2: 440, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 60, y1: 100, x2: 240, y2: 100, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 60, y1: 100, x2: 60, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 240, y1: 100, x2: 240, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 400, y1: 100, x2: 600, y2: 100, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 400, y1: 100, x2: 400, y2: 360, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 600, y1: 100, x2: 600, y2: 360, mat: 'wood', ref: 0.5 });
      walls.push({ x1: 60, y1: 700, x2: 240, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 60, y1: 440, x2: 60, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 240, y1: 440, x2: 240, y2: 700, mat: 'wood', ref: 0.5 });
      walls.push({ x1: 400, y1: 700, x2: 600, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 400, y1: 440, x2: 400, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 600, y1: 440, x2: 600, y2: 700, mat: 'concrete', ref: 0.92 });
      objects.push({ x: 250, y: 365, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 310, y: 365, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 620, y: 365, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 250, y: 435, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 310, y: 435, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 620, y: 435, r: 6, mat: 'metal', ref: 0.95 });
      objects.push({ x: 350, y: 380, r: 15, mat: 'glass', ref: 0.3 });
      objects.push({ x: 650, y: 365, r: 8, mat: 'metal', ref: 0.95 });
      objects.push({ x: 500, y: 580, r: 18, mat: 'goal', ref: 0.9, isGoal: true });
    } else if (type === 'grocery') {
      var aisleXs = [150, 280, 410, 540, 670];
      for (var gai = 0; gai < aisleXs.length; gai++) {
        var ax = aisleXs[gai];
        walls.push({ x1: ax - 20, y1: 150, x2: ax - 20, y2: 275, mat: 'metal', ref: 0.95 });
        walls.push({ x1: ax - 20, y1: 325, x2: ax - 20, y2: 425, mat: 'metal', ref: 0.95 });
        walls.push({ x1: ax - 20, y1: 475, x2: ax - 20, y2: 600, mat: 'metal', ref: 0.95 });
        walls.push({ x1: ax + 20, y1: 150, x2: ax + 20, y2: 275, mat: 'metal', ref: 0.95 });
        walls.push({ x1: ax + 20, y1: 325, x2: ax + 20, y2: 425, mat: 'metal', ref: 0.95 });
        walls.push({ x1: ax + 20, y1: 475, x2: ax + 20, y2: 600, mat: 'metal', ref: 0.95 });
      }
      walls.push({ x1: 100, y1: 120, x2: 300, y2: 120, mat: 'glass', ref: 0.3 });
      walls.push({ x1: 500, y1: 120, x2: 740, y2: 120, mat: 'glass', ref: 0.3 });
      walls.push({ x1: 500, y1: 100, x2: 740, y2: 100, mat: 'metal', ref: 0.95 });
      walls.push({ x1: 120, y1: 700, x2: 220, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 300, y1: 700, x2: 400, y2: 700, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 480, y1: 700, x2: 580, y2: 700, mat: 'concrete', ref: 0.92 });
      objects.push({ x: 160, y: 350, r: 10, mat: 'metal', ref: 0.95 });
      objects.push({ x: 420, y: 500, r: 10, mat: 'metal', ref: 0.95 });
      objects.push({ x: 550, y: 250, r: 10, mat: 'metal', ref: 0.95 });
      objects.push({ x: 290, y: 550, r: 10, mat: 'metal', ref: 0.95 });
      objects.push({ x: 350, y: 730, r: 18, mat: 'goal', ref: 0.9, isGoal: true });
    } else if (type === 'park') {
      walls.push({ x1: 80, y1: 390, x2: 720, y2: 390, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 80, y1: 410, x2: 720, y2: 410, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 390, y1: 80, x2: 390, y2: 390, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 410, y1: 80, x2: 410, y2: 390, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 390, y1: 410, x2: 390, y2: 720, mat: 'concrete', ref: 0.92 });
      walls.push({ x1: 410, y1: 410, x2: 410, y2: 720, mat: 'concrete', ref: 0.92 });
      objects.push({ x: 400, y: 400, r: 40, mat: 'metal', ref: 0.95 });
      objects.push({ x: 200, y: 385, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 300, y: 415, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 500, y: 385, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 600, y: 415, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 385, y: 200, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 415, y: 300, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 385, y: 550, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 415, y: 650, r: 12, mat: 'wood', ref: 0.5 });
      objects.push({ x: 560, y: 560, r: 15, mat: 'metal', ref: 0.95 });
      objects.push({ x: 620, y: 620, r: 15, mat: 'metal', ref: 0.95 });
      objects.push({ x: 650, y: 540, r: 15, mat: 'metal', ref: 0.95 });
      objects.push({ x: 150, y: 180, r: 25, mat: 'wood', ref: 0.5 });
      objects.push({ x: 250, y: 600, r: 25, mat: 'wood', ref: 0.5 });
      objects.push({ x: 600, y: 150, r: 25, mat: 'wood', ref: 0.5 });
      objects.push({ x: 680, y: 300, r: 25, mat: 'wood', ref: 0.5 });
      objects.push({ x: 140, y: 500, r: 25, mat: 'wood', ref: 0.5 });
      objects.push({ x: 590, y: 590, r: 18, mat: 'goal', ref: 0.9, isGoal: true });
    } else {
      var nw = 3 + Math.floor(rng() * 5);
      for (var cwi = 0; cwi < nw; cwi++) {
        var wx = 80 + rng() * 640, wy = 80 + rng() * 640;
        var wl = 60 + rng() * 250, wa = rng() * Math.PI;
        var mats = ['rock', 'wood', 'concrete', 'metal', 'glass'];
        var m = mats[Math.floor(rng() * mats.length)];
        var refs = { rock: 0.85, wood: 0.5, concrete: 0.92, metal: 0.95, glass: 0.3 };
        walls.push({ x1: wx, y1: wy, x2: wx + Math.cos(wa) * wl, y2: wy + Math.sin(wa) * wl, mat: m, ref: refs[m] || 0.7 });
      }
      var no = 2 + Math.floor(rng() * 5);
      for (var coi = 0; coi < no; coi++) {
        var om = mats[Math.floor(rng() * mats.length)];
        objects.push({ x: 100 + rng() * 600, y: 100 + rng() * 600, r: 12 + rng() * 30, mat: om, ref: refs[om] || 0.7 });
      }
    }

    var hasGoal = false;
    for (var gi = 0; gi < objects.length; gi++) {
      if (objects[gi].isGoal) { hasGoal = true; break; }
    }
    if (!hasGoal) {
      var goalX, goalY;
      do { goalX = 80 + rng() * 640; goalY = 80 + rng() * 640; } while (Math.sqrt((goalX - 400) * (goalX - 400) + (goalY - 700) * (goalY - 700)) < 200);
      objects.push({ x: goalX, y: goalY, r: 18, mat: 'goal', ref: 0.9, isGoal: true });
    }

    return { walls: walls, objects: objects, W: W, H: H, seed: seed, type: type };
  }

  // ══════════════════════════════════════════════════════════
  // AGENT GENERATOR
  // ══════════════════════════════════════════════════════════
  function generateAgents(type, seed, map) {
    var rng = seededRng(seed + 7777);
    var agents = [];

    if (type === 'urban') {
      var pedWaypoints = [
        [{ x: 60, y: 60 }, { x: 60, y: 740 }, { x: 200, y: 740 }, { x: 200, y: 60 }],
        [{ x: 740, y: 60 }, { x: 740, y: 740 }, { x: 600, y: 740 }, { x: 600, y: 60 }],
        [{ x: 60, y: 60 }, { x: 300, y: 60 }, { x: 300, y: 200 }, { x: 60, y: 200 }],
        [{ x: 500, y: 740 }, { x: 740, y: 740 }, { x: 740, y: 600 }, { x: 500, y: 600 }]
      ];
      for (var pdi = 0; pdi < 4; pdi++) {
        var wp = pedWaypoints[pdi];
        var startIdx = Math.floor(rng() * wp.length);
        agents.push({ id: 'ped_' + pdi, kind: 'pedestrian', x: wp[startIdx].x, y: wp[startIdx].y, targetIdx: (startIdx + 1) % wp.length, waypoints: wp, speed: 25 + rng() * 15, loop: true, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
      }
      var carLanes = [
        { waypoints: [{ x: 20, y: 380 }, { x: 780, y: 380 }], speed: 80 + rng() * 40 },
        { waypoints: [{ x: 780, y: 420 }, { x: 20, y: 420 }], speed: 70 + rng() * 50 },
        { waypoints: [{ x: 380, y: 20 }, { x: 380, y: 780 }], speed: 60 + rng() * 40 }
      ];
      for (var cri = 0; cri < 3; cri++) {
        var lane = carLanes[cri];
        agents.push({ id: 'car_' + cri, kind: 'car', x: lane.waypoints[0].x, y: lane.waypoints[0].y, targetIdx: 1, waypoints: lane.waypoints, speed: lane.speed, loop: true, radius: 20, mat: 'car', ref: 0.85, height: 1.2 });
      }
    } else if (type === 'cave') {
      for (var bti = 0; bti < 3; bti++) {
        var bcx = 200 + rng() * 400, bcy = 200 + rng() * 400;
        var brad = 60 + rng() * 100;
        var bwp = [];
        for (var bsi = 0; bsi < 8; bsi++) {
          var ba = (bsi / 8) * Math.PI * 2;
          bwp.push({ x: bcx + Math.cos(ba) * brad, y: bcy + Math.sin(ba) * brad });
        }
        agents.push({ id: 'bat_' + bti, kind: 'bat', x: bwp[0].x, y: bwp[0].y, targetIdx: 1, waypoints: bwp, speed: 50 + rng() * 40, loop: true, radius: 6, mat: 'flesh', ref: 0.4, height: 0.3 });
      }
    } else if (type === 'forest') {
      for (var dri = 0; dri < 2; dri++) {
        var deerWp = [];
        for (var dwi = 0; dwi < 5; dwi++) { deerWp.push({ x: 80 + rng() * 640, y: 80 + rng() * 640 }); }
        agents.push({ id: 'deer_' + dri, kind: 'deer', x: deerWp[0].x, y: deerWp[0].y, targetIdx: 1, waypoints: deerWp, speed: 30 + rng() * 15, loop: true, radius: 14, mat: 'flesh', ref: 0.5, height: 1.3 });
      }
      for (var bri2 = 0; bri2 < 4; bri2++) {
        var birdWp = [];
        for (var bwi2 = 0; bwi2 < 6; bwi2++) { birdWp.push({ x: 60 + rng() * 680, y: 60 + rng() * 680 }); }
        agents.push({ id: 'bird_' + bri2, kind: 'bird', x: birdWp[0].x, y: birdWp[0].y, targetIdx: 1, waypoints: birdWp, speed: 70 + rng() * 40, loop: true, radius: 4, mat: 'flesh', ref: 0.2, height: 0.2 });
      }
    } else if (type === 'corridor') {
      agents.push({ id: 'ped_cor_0', kind: 'pedestrian', x: 60, y: 150, targetIdx: 1, waypoints: [{ x: 60, y: 150 }, { x: 740, y: 150 }], speed: 30, loop: false, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
      agents.push({ id: 'ped_cor_1', kind: 'pedestrian', x: 740, y: 500, targetIdx: 1, waypoints: [{ x: 740, y: 500 }, { x: 60, y: 500 }], speed: 35, loop: false, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
    } else if (type === 'school') {
      agents.push({ id: 'stu_0', kind: 'pedestrian', x: 100, y: 400, targetIdx: 1, waypoints: [{ x: 100, y: 400 }, { x: 700, y: 400 }], speed: 25, loop: false, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
      agents.push({ id: 'stu_1', kind: 'pedestrian', x: 600, y: 400, targetIdx: 1, waypoints: [{ x: 600, y: 400 }, { x: 80, y: 400 }], speed: 28, loop: false, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
      agents.push({ id: 'stu_2', kind: 'pedestrian', x: 350, y: 400, targetIdx: 1, waypoints: [{ x: 350, y: 400 }, { x: 700, y: 400 }, { x: 350, y: 400 }], speed: 22, loop: true, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
      agents.push({ id: 'janitor_0', kind: 'pedestrian', x: 150, y: 550, targetIdx: 1, waypoints: [{ x: 150, y: 550 }, { x: 150, y: 440 }, { x: 150, y: 400 }, { x: 500, y: 400 }, { x: 500, y: 440 }, { x: 500, y: 550 }], speed: 15, loop: true, radius: 12, mat: 'flesh', ref: 0.6, height: 1.7 });
    } else if (type === 'grocery') {
      var shopperPaths = [
        [{ x: 150, y: 160 }, { x: 150, y: 590 }, { x: 280, y: 590 }, { x: 280, y: 160 }],
        [{ x: 280, y: 160 }, { x: 280, y: 590 }, { x: 410, y: 590 }, { x: 410, y: 160 }],
        [{ x: 410, y: 160 }, { x: 410, y: 590 }, { x: 540, y: 590 }, { x: 540, y: 160 }],
        [{ x: 540, y: 160 }, { x: 540, y: 590 }, { x: 670, y: 590 }, { x: 670, y: 160 }]
      ];
      for (var gsi = 0; gsi < 4; gsi++) {
        var spWp = shopperPaths[gsi];
        var spStart = Math.floor(rng() * spWp.length);
        agents.push({ id: 'shopper_' + gsi, kind: 'pedestrian', x: spWp[spStart].x, y: spWp[spStart].y, targetIdx: (spStart + 1) % spWp.length, waypoints: spWp, speed: 20, loop: true, radius: 12, mat: 'flesh', ref: 0.6, height: 1.7 });
      }
      agents.push({ id: 'employee_0', kind: 'pedestrian', x: 60, y: 700, targetIdx: 1, waypoints: [{ x: 60, y: 700 }, { x: 740, y: 700 }, { x: 740, y: 650 }, { x: 60, y: 650 }], speed: 30, loop: true, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
    } else if (type === 'park') {
      agents.push({ id: 'jogger_0', kind: 'jogger', x: 80, y: 400, targetIdx: 1, waypoints: [{ x: 80, y: 400 }, { x: 720, y: 400 }], speed: 60, loop: false, radius: 8, mat: 'flesh', ref: 0.5, height: 1.7 });
      agents.push({ id: 'jogger_1', kind: 'jogger', x: 400, y: 80, targetIdx: 1, waypoints: [{ x: 400, y: 80 }, { x: 400, y: 720 }], speed: 60, loop: false, radius: 8, mat: 'flesh', ref: 0.5, height: 1.7 });
      agents.push({ id: 'cyclist_0', kind: 'cyclist', x: 80, y: 400, targetIdx: 1, waypoints: [{ x: 80, y: 400 }, { x: 720, y: 400 }], speed: 90, loop: false, radius: 8, mat: 'car', ref: 0.7, height: 1.3 });
      agents.push({ id: 'dogwalker_0', kind: 'pedestrian', x: 150, y: 180, targetIdx: 1, waypoints: [{ x: 150, y: 180 }, { x: 250, y: 600 }, { x: 140, y: 500 }, { x: 150, y: 180 }], speed: 15, loop: true, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
    } else if (type === 'simple_room') {
      agents.push({ id: 'ped_tut', kind: 'pedestrian', x: 300, y: 400, targetIdx: 1, waypoints: [{ x: 300, y: 400 }, { x: 500, y: 400 }, { x: 500, y: 600 }, { x: 300, y: 600 }], speed: 20, loop: true, radius: 10, mat: 'flesh', ref: 0.6, height: 1.7 });
    }
    return agents;
  }

  function updateAgents(agents, dt, map) {
    for (var ai = 0; ai < agents.length; ai++) {
      var ag = agents[ai];
      if (!ag.waypoints || ag.waypoints.length === 0) continue;
      var target = ag.waypoints[ag.targetIdx];
      var ddx = target.x - ag.x;
      var ddy = target.y - ag.y;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < 5) {
        if (ag.loop) {
          ag.targetIdx = (ag.targetIdx + 1) % ag.waypoints.length;
        } else if (ag.targetIdx < ag.waypoints.length - 1) {
          ag.targetIdx++;
        } else {
          ag.waypoints = ag.waypoints.slice().reverse();
          ag.targetIdx = 1;
        }
      } else {
        var moveAmt = Math.min(ag.speed * dt, dist);
        ag.x += (ddx / dist) * moveAmt;
        ag.y += (ddy / dist) * moveAmt;
        ag.x = Math.max(30, Math.min(map.W - 30, ag.x));
        ag.y = Math.max(30, Math.min(map.H - 30, ag.y));
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3D SCENE BUILDER (Three.js)
  // ══════════════════════════════════════════════════════════
  function build3DScene(THREE, map, agents) {
    var SCALE = 0.05;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 8, 40);
    var ambient = new THREE.AmbientLight(0xffffff, 0.02);
    scene.add(ambient);
    var floorGeo = new THREE.PlaneGeometry(50, 50);
    var floorMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    floorMat.userData = { baseColor: new THREE.Color(0x1a1a2e), ref: 0.3, mat: 'concrete' };
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.userData = { mapX: 400, mapY: 400, ref: 0.3, mat: 'concrete', glowUntil: 0, glowAmt: 0, kind: 'floor' };
    scene.add(floor);
    var meshes = [];
    var agentMeshes = [];
    function getGlowBase(matName) {
      var gc = GLOW_COLORS[matName] || GLOW_COLORS.concrete;
      return new THREE.Color(gc[0] / 255, gc[1] / 255, gc[2] / 255);
    }
    for (var wi = 0; wi < map.walls.length; wi++) {
      var w = map.walls[wi];
      var dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      var wLen = Math.sqrt(dx * dx + dy * dy) * SCALE;
      if (wLen < 0.01) continue;
      var wallHeight = 3.0;
      var wallThick = 0.15;
      var wGeo = new THREE.BoxGeometry(wLen, wallHeight, wallThick);
      var wMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      wMat.userData = { baseColor: getGlowBase(w.mat), ref: w.ref, mat: w.mat };
      var wMesh = new THREE.Mesh(wGeo, wMat);
      var midX = ((w.x1 + w.x2) / 2) * SCALE;
      var midZ = ((w.y1 + w.y2) / 2) * SCALE;
      wMesh.position.set(midX, wallHeight / 2, midZ);
      var angle = Math.atan2(dy, dx);
      wMesh.rotation.y = -angle;
      wMesh.userData = { mapX: (w.x1 + w.x2) / 2, mapY: (w.y1 + w.y2) / 2, ref: w.ref, mat: w.mat, glowUntil: 0, glowAmt: 0, kind: 'wall' };
      scene.add(wMesh);
      meshes.push(wMesh);
    }
    for (var oi = 0; oi < map.objects.length; oi++) {
      var obj = map.objects[oi];
      var oRadius = obj.r * SCALE;
      var oMesh;
      if (obj.isGoal) {
        var oGeo = new THREE.SphereGeometry(oRadius, 16, 12);
        var oMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        oMat.userData = { baseColor: getGlowBase('goal'), ref: obj.ref, mat: 'goal' };
        oMesh = new THREE.Mesh(oGeo, oMat);
        oMesh.position.set(obj.x * SCALE, oRadius + 0.1, obj.y * SCALE);
      } else {
        var cylHeight = 2.0 + oRadius * 4;
        var oGeo2 = new THREE.CylinderGeometry(oRadius, oRadius, cylHeight, 12);
        var oMat2 = new THREE.MeshBasicMaterial({ color: 0x000000 });
        oMat2.userData = { baseColor: getGlowBase(obj.mat), ref: obj.ref, mat: obj.mat };
        oMesh = new THREE.Mesh(oGeo2, oMat2);
        oMesh.position.set(obj.x * SCALE, cylHeight / 2, obj.y * SCALE);
      }
      oMesh.userData = { mapX: obj.x, mapY: obj.y, ref: obj.ref, mat: obj.mat, glowUntil: 0, glowAmt: 0, kind: 'object', isGoal: !!obj.isGoal };
      scene.add(oMesh);
      meshes.push(oMesh);
    }
    for (var ami = 0; ami < agents.length; ami++) {
      var ag = agents[ami];
      var aMesh;
      if (ag.kind === 'car') {
        var carGeo = new THREE.BoxGeometry(2.0, 1.2, 1.0);
        var carMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        carMat.userData = { baseColor: getGlowBase('car'), ref: ag.ref, mat: 'car' };
        aMesh = new THREE.Mesh(carGeo, carMat);
        aMesh.position.set(ag.x * SCALE, 0.6, ag.y * SCALE);
      } else if (ag.kind === 'bat') {
        var batGeo = new THREE.SphereGeometry(0.18, 8, 6);
        var batMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        batMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(batGeo, batMat);
        aMesh.position.set(ag.x * SCALE, 2.5, ag.y * SCALE);
      } else if (ag.kind === 'bird') {
        var birdGeo = new THREE.SphereGeometry(0.12, 8, 6);
        var birdMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        birdMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(birdGeo, birdMat);
        aMesh.position.set(ag.x * SCALE, 3.0, ag.y * SCALE);
      } else if (ag.kind === 'deer') {
        var deerGeo = new THREE.BoxGeometry(0.8, 1.3, 1.4);
        var deerMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        deerMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(deerGeo, deerMat);
        aMesh.position.set(ag.x * SCALE, 0.65, ag.y * SCALE);
      } else if (ag.kind === 'jogger') {
        var jogGeo = new THREE.BoxGeometry(0.4, 1.7, 0.4);
        var jogMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        jogMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(jogGeo, jogMat);
        aMesh.position.set(ag.x * SCALE, 0.85, ag.y * SCALE);
      } else if (ag.kind === 'cyclist') {
        var cycGeo = new THREE.BoxGeometry(0.5, 1.3, 1.2);
        var cycMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        cycMat.userData = { baseColor: getGlowBase('car'), ref: ag.ref, mat: 'car' };
        aMesh = new THREE.Mesh(cycGeo, cycMat);
        aMesh.position.set(ag.x * SCALE, 0.65, ag.y * SCALE);
      } else {
        var pedGeo = new THREE.BoxGeometry(0.5, 1.7, 0.5);
        var pedMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        pedMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(pedGeo, pedMat);
        aMesh.position.set(ag.x * SCALE, 0.85, ag.y * SCALE);
      }
      aMesh.userData = { mapX: ag.x, mapY: ag.y, ref: ag.ref, mat: ag.mat, glowUntil: 0, glowAmt: 0, kind: 'agent', agentKind: ag.kind, agentId: ag.id };
      scene.add(aMesh);
      meshes.push(aMesh);
      agentMeshes.push({ mesh: aMesh, agent: ag });
    }
    return { scene: scene, meshes: meshes, agentMeshes: agentMeshes, SCALE: SCALE, ambient: ambient };
  }

  function rayHit(px, py, dx, dy, x1, y1, x2, y2) {
    var sx = x2 - x1, sy = y2 - y1;
    var denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 0.0001) return -1;
    var t = ((x1 - px) * sy - (y1 - py) * sx) / denom;
    var u = ((x1 - px) * dy - (y1 - py) * dx) / denom;
    if (t > 0.5 && u >= 0 && u <= 1) return t;
    return -1;
  }

  function canMoveTo(nx, ny, map, playerRadius) {
    var pr = playerRadius || 12;
    if (nx < 30 + pr || nx > map.W - 30 - pr || ny < 30 + pr || ny > map.H - 30 - pr) return false;
    for (var i = 0; i < map.objects.length; i++) {
      var o = map.objects[i];
      if (o.isGoal) continue;
      var ddx = nx - o.x, ddy = ny - o.y;
      if (Math.sqrt(ddx * ddx + ddy * ddy) < o.r + pr) return false;
    }
    for (var wi = 0; wi < map.walls.length; wi++) {
      var w = map.walls[wi];
      var wx = w.x2 - w.x1, wy = w.y2 - w.y1;
      var wlen2 = wx * wx + wy * wy;
      if (wlen2 < 1) continue;
      var t = Math.max(0, Math.min(1, ((nx - w.x1) * wx + (ny - w.y1) * wy) / wlen2));
      var cpx = w.x1 + t * wx, cpy = w.y1 + t * wy;
      var cdx = nx - cpx, cdy = ny - cpy;
      if (Math.sqrt(cdx * cdx + cdy * cdy) < pr) return false;
    }
    return true;
  }

  var TUTORIAL_STEPS = [
    { title: 'The World Is Dark', text: 'The world is pitch-black. Press SPACE (or click the Click button) to emit a sonar click. Listen for echoes bouncing off nearby surfaces. Each echo tells you where something is.' },
    { title: 'Materials Glow Differently', text: 'Each surface lights up differently when hit by sonar. Metal is bright white-blue, wood is warm brown, concrete is cool blue, glass is faint teal. Brighter glow = stronger echo.' },
    { title: 'Move Toward the Goal', text: 'Use WASD to walk (or arrow keys to turn). The goal is a golden sphere somewhere in the room. As you get closer, you will hear a proximity beep that gets faster.' },
    { title: 'Watch for Moving Entities', text: 'A pedestrian is walking around the room. You will hear a faint tone and see a subtle glow from their body. In Urban mode, watch for cars. In School, Grocery, and Park modes, watch for pedestrians, joggers, and cyclists!' }
  ];

  window.StemLab.registerTool('echoTrainer', {
    icon: '\uD83C\uDFA7',
    label: 'Echo Navigator',
    desc: 'Navigate virtual spaces using only spatial audio echoes. 3D first-person with Three.js. Emit clicks, listen for reflections off walls and moving agents, find the goal. Real HRTF binaural audio \u2014 wear headphones!',
    color: 'indigo',
    category: 'applied',
    questHooks: [
      { id: 'find_goal_1', label: 'Find the goal in any environment', icon: '\u2B50', check: function(d) { return d.goalsFound >= 1; }, progress: function(d) { return (d.goalsFound || 0) + '/1'; } },
      { id: 'find_goal_5', label: 'Find goals in 5 different environments', icon: '\uD83C\uDFC6', check: function(d) { return d.goalsFound >= 5; }, progress: function(d) { return (d.goalsFound || 0) + '/5'; } },
      { id: 'blind_navigation', label: 'Find a goal in Audio Only mode', icon: '\uD83C\uDFA7', check: function(d) { return d.blindWins >= 1; }, progress: function(d) { return (d.blindWins || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'cross_urban', label: 'Survive Urban Street without a car hit', icon: '\uD83D\uDE97', check: function(d) { return !!d.urbanNoCarHit; }, progress: function(d) { return d.urbanNoCarHit ? 'Done!' : 'Not yet'; } },
      { id: 'bat_master_win', label: 'Find a goal on Bat Master difficulty', icon: '\uD83E\uDD87', check: function(d) { return !!d.batMasterWin; }, progress: function(d) { return d.batMasterWin ? 'Done!' : 'Not yet'; } },
      { id: 'school_nav', label: 'Navigate to the office in School Hallway', icon: '\uD83C\uDFEB', check: function(d) { return !!d.schoolWin; }, progress: function(d) { return d.schoolWin ? 'Done!' : 'Not yet'; } },
      { id: 'waypoint_complete', label: 'Complete a waypoint route', icon: '\uD83D\uDEA9', check: function(d) { return !!d.waypointComplete; }, progress: function(d) { return d.waypointComplete ? 'Done!' : 'Not yet'; } }
    ],
    render: function(ctx) {
      var React = ctx.React; var h = React.createElement; var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef; var useCallback = React.useCallback;
      var d = (ctx.toolData && ctx.toolData['echoTrainer']) || {};
      var upd = function(key, val) { ctx.update('echoTrainer', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('echoTrainer', obj); };
      var addToast = ctx.addToast; var announceToSR = ctx.announceToSR; var awardXP = ctx.awardXP; var setStemLabTool = ctx.setStemLabTool; var ArrowLeft = ctx.icons.ArrowLeft; var isDark = ctx.isDark; var theme = ctx.theme;

      var envType = d.envType || 'simple_room';
      var seed = d.seed || 42;
      var viewMode = d.viewMode || 'echo';
      var goalsFound = d.goalsFound || 0;
      var blindWins = d.blindWins || 0;
      var clicks = d.clicks || 0;
      var hasRevealed = d.hasRevealed || false;
      var bumps = d.bumps || 0;
      var multiBounce = d.multiBounce || false;
      var clickType = d.clickType || 'tongue';
      var tutStep = d.tutStep || 0;
      var distChallenge = d.distChallenge || null;
      var matQuiz = d.matQuiz || null;
      var waypointMode = d.waypointMode || false;
      var waypointIdx = d.waypointIdx || 0;

      var diffId = d.difficulty || 'normal';
      var diff = DIFFICULTY[1];
      for (var dfi = 0; dfi < DIFFICULTY.length; dfi++) { if (DIFFICULTY[dfi].id === diffId) { diff = DIFFICULTY[dfi]; break; } }

      var has3D = !!(window.THREE) && !!ENV_3D_READY[envType];

      var audioRef = useRef(null);
      var mapRef = useRef(null);
      var agentsRef = useRef([]);
      var playerRef = useRef({ x: 400, y: 700, angle: -Math.PI / 2 });
      var canvasRef = useRef(null);
      var mountRef = useRef(null);
      var animRef = useRef(null);
      var keysRef = useRef({});
      var pulsesRef = useRef([]);
      var agentOscRef = useRef([]);
      var rendererRef = useRef(null);
      var sceneDataRef = useRef(null);
      var pointerLockedRef = useRef(false);
      var yawRef = useRef(-Math.PI / 2);
      var pitchRef = useRef(0);
      var carHitRef = useRef(false);
      var goalFoundRef = useRef(false);
      var ambientSoundsRef = useRef([]);
      var runStartRef = useRef(Date.now());
      var footstepRef = useRef({ lastStep: 0, stepInterval: 0.4 });
      var coverageRef = useRef(null);

      if (!mapRef.current || mapRef.current.seed !== seed || mapRef.current.type !== envType) {
        mapRef.current = generateEnvironment(envType, seed);
        agentsRef.current = generateAgents(envType, seed, mapRef.current);
        playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
        yawRef.current = -Math.PI / 2;
        pitchRef.current = 0;
        carHitRef.current = false;
        goalFoundRef.current = !!d.goalFoundThisRun;
        runStartRef.current = Date.now();
      }

      // ── Initialize coverage grid ──
      if (!coverageRef.current || (mapRef.current && mapRef.current.seed !== (coverageRef.current && coverageRef.current.seed))) {
        var grid = [];
        for (var ci = 0; ci < 40; ci++) { grid[ci] = []; for (var cj = 0; cj < 40; cj++) { grid[ci][cj] = 0; } }
        coverageRef.current = { grid: grid, seed: seed };
      }

      function initAudio() {
        if (audioRef.current) return audioRef.current;
        try {
          var ctx2 = new (window.AudioContext || window.webkitAudioContext)();
          var len = Math.floor(ctx2.sampleRate * 0.008);
          var buf = ctx2.createBuffer(1, len, ctx2.sampleRate);
          var data = buf.getChannelData(0);
          for (var i = 0; i < len; i++) {
            data[i] = (i < len * 0.3 ? 1 : -1) * Math.exp(-i / (len * 0.12)) * (0.85 + Math.random() * 0.15);
          }
          var caneLen = Math.floor(ctx2.sampleRate * 0.015);
          var caneBuf = ctx2.createBuffer(1, caneLen, ctx2.sampleRate);
          var caneData = caneBuf.getChannelData(0);
          for (var ci = 0; ci < caneLen; ci++) {
            caneData[ci] = Math.exp(-ci / (caneLen * 0.08)) * Math.sin(ci / (caneLen * 0.12) * Math.PI * 2) * 0.9;
          }
          audioRef.current = { ctx: ctx2, clickBuf: buf, caneBuf: caneBuf };
          return audioRef.current;
        } catch(e) { return null; }
      }

      function emitClick() {
        var audio = initAudio();
        if (!audio) return;
        var ac = audio.ctx;
        if (ac.state === 'suspended') ac.resume();
        var player = playerRef.current;
        var map = mapRef.current;
        if (!map) return;
        updMulti({ clicks: (d.clicks || 0) + 1 });
        if (window._alloHaptic) window._alloHaptic('echo');
        var activeBuf = clickType === 'cane' ? audio.caneBuf : audio.clickBuf;
        if (has3D || viewMode === 'echo') {
          pulsesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 500, birth: Date.now(), hits: [] });
        }
        // ── Coverage map update ──
        if (coverageRef.current) {
          var cGrid = coverageRef.current.grid;
          var covCx = Math.floor(player.x / 20);
          var covCy = Math.floor(player.y / 20);
          for (var gx = Math.max(0, covCx - 5); gx <= Math.min(39, covCx + 5); gx++) {
            for (var gy = Math.max(0, covCy - 5); gy <= Math.min(39, covCy + 5); gy++) {
              var gDist = Math.sqrt((gx - covCx) * (gx - covCx) + (gy - covCy) * (gy - covCy));
              if (gDist <= 5) {
                cGrid[gx][gy] = Math.min(1, cGrid[gx][gy] + 0.3);
              }
            }
          }
        }
        var directSrc = ac.createBufferSource();
        directSrc.buffer = activeBuf;
        var directGain = ac.createGain();
        directGain.gain.value = 0.25;
        directSrc.connect(directGain);
        directGain.connect(ac.destination);
        directSrc.start();
        var numRays = 32;
        var fan = Math.PI * 0.67;
        var startA = player.angle - fan / 2;
        var stepA = fan / (numRays - 1);
        var allObjects = map.objects.slice();
        var agts = agentsRef.current;
        for (var agi = 0; agi < agts.length; agi++) {
          allObjects.push({ x: agts[agi].x, y: agts[agi].y, r: agts[agi].radius, mat: agts[agi].mat, ref: agts[agi].ref, isGoal: false });
        }
        for (var ri = 0; ri < numRays; ri++) {
          var ra = startA + ri * stepA;
          var rdx = Math.cos(ra), rdy = Math.sin(ra);
          var minDist = Infinity, hitMat = 'rock', hitRef = 0.8;
          for (var wi = 0; wi < map.walls.length; wi++) {
            var w = map.walls[wi];
            var dist = rayHit(player.x, player.y, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
            if (dist > 0 && dist < minDist) { minDist = dist; hitMat = w.mat; hitRef = w.ref; }
          }
          for (var oi = 0; oi < allObjects.length; oi++) {
            var obj = allObjects[oi];
            var odx = obj.x - player.x, ody = obj.y - player.y;
            var proj = odx * rdx + ody * rdy;
            if (proj > 0) {
              var perp = Math.abs(odx * rdy - ody * rdx);
              if (perp < obj.r) {
                var hd = proj - Math.sqrt(Math.max(0, obj.r * obj.r - perp * perp));
                if (hd > 0 && hd < minDist) { minDist = hd; hitMat = obj.mat; hitRef = obj.ref; }
              }
            }
          }
          if (minDist < 500) {
            var roundTrip = minDist * 2 * 0.1;
            var delaySec = Math.min(0.6, roundTrip / SPEED_OF_SOUND);
            var atten = Math.min(1, 40 / (minDist + 5)) * hitRef;
            var filterHz = hitMat === 'metal' ? 6000 : hitMat === 'glass' ? 7000 : hitMat === 'concrete' ? 4000 : hitMat === 'rock' ? 3500 : hitMat === 'wood' ? 2000 : hitMat === 'goal' ? 5000 : hitMat === 'car' ? 4500 : hitMat === 'flesh' ? 2500 : 3000;
            var echoSrc = ac.createBufferSource();
            echoSrc.buffer = activeBuf;
            var delay = ac.createDelay(1.0);
            delay.delayTime.value = delaySec;
            var filter = ac.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterHz;
            var gain = ac.createGain();
            gain.gain.value = atten * 0.35;
            var panner = ac.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 80;
            panner.rolloffFactor = 1;
            var echoWorldX = Math.cos(ra) * Math.min(minDist * 0.01, 8);
            var echoWorldZ = Math.sin(ra) * Math.min(minDist * 0.01, 8);
            var cosA = Math.cos(-player.angle), sinA = Math.sin(-player.angle);
            panner.positionX.value = echoWorldX * cosA - echoWorldZ * sinA;
            panner.positionY.value = 0;
            panner.positionZ.value = echoWorldX * sinA + echoWorldZ * cosA;
            echoSrc.connect(delay); delay.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(ac.destination);
            echoSrc.start();
            if (multiBounce && minDist < 400) {
              for (var bri = 0; bri < 3; bri++) {
                var bounceAngle = ra + Math.PI + (bri - 1) * 0.3;
                var bdx = Math.cos(bounceAngle), bdy = Math.sin(bounceAngle);
                var hitX = player.x + rdx * minDist, hitY = player.y + rdy * minDist;
                var bMinDist = Infinity, bMat = 'rock', bRef2 = 0.5;
                for (var bwi = 0; bwi < map.walls.length; bwi++) {
                  var bw = map.walls[bwi];
                  var bd = rayHit(hitX, hitY, bdx, bdy, bw.x1, bw.y1, bw.x2, bw.y2);
                  if (bd > 0 && bd < bMinDist) { bMinDist = bd; bMat = bw.mat; bRef2 = bw.ref; }
                }
                if (bMinDist < 400 && bMinDist > 5) {
                  var totalDist = minDist + bMinDist;
                  var bDelay = Math.min(0.8, (totalDist * 2 * 0.1) / SPEED_OF_SOUND);
                  var bAtten = Math.min(0.5, 20 / (totalDist + 10)) * hitRef * bRef2;
                  var bFilt = bMat === 'metal' ? 4000 : bMat === 'wood' ? 1500 : 2500;
                  var bSrc = ac.createBufferSource(); bSrc.buffer = activeBuf;
                  var bDel = ac.createDelay(1.0); bDel.delayTime.value = bDelay;
                  var bF = ac.createBiquadFilter(); bF.type = 'lowpass'; bF.frequency.value = bFilt;
                  var bG = ac.createGain(); bG.gain.value = bAtten * 0.2;
                  var bP = ac.createPanner(); bP.panningModel = 'HRTF'; bP.distanceModel = 'inverse'; bP.refDistance = 1; bP.maxDistance = 80;
                  var bWorldX = Math.cos(bounceAngle) * Math.min((minDist + bMinDist) * 0.005, 6);
                  var bWorldZ = Math.sin(bounceAngle) * Math.min((minDist + bMinDist) * 0.005, 6);
                  bP.positionX.value = bWorldX * cosA - bWorldZ * sinA;
                  bP.positionY.value = 0;
                  bP.positionZ.value = bWorldX * sinA + bWorldZ * cosA;
                  bSrc.connect(bDel); bDel.connect(bF); bF.connect(bG); bG.connect(bP); bP.connect(ac.destination);
                  bSrc.start();
                }
              }
            }
          }
        }
      }

      // ── Distance estimation challenge ──
      function startDistanceChallenge() {
        var player = playerRef.current;
        var map = mapRef.current;
        if (!map) return;
        // Find the nearest wall in the facing direction
        var rdx = Math.cos(player.angle), rdy = Math.sin(player.angle);
        var minDist = Infinity, hitMat = 'wall';
        for (var wi = 0; wi < map.walls.length; wi++) {
          var w = map.walls[wi];
          var dist = rayHit(player.x, player.y, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
          if (dist > 0 && dist < minDist) { minDist = dist; hitMat = w.mat; }
        }
        for (var oi = 0; oi < map.objects.length; oi++) {
          var obj = map.objects[oi];
          if (obj.isGoal) continue;
          var odx = obj.x - player.x, ody = obj.y - player.y;
          var proj = odx * rdx + ody * rdy;
          if (proj > 0) {
            var perp = Math.abs(odx * rdy - ody * rdx);
            if (perp < obj.r) {
              var hd = proj - Math.sqrt(Math.max(0, obj.r * obj.r - perp * perp));
              if (hd > 0 && hd < minDist) { minDist = hd; hitMat = obj.mat; }
            }
          }
        }
        if (minDist < 500) {
          var realDistMeters = Math.round(minDist * 0.1 * 10) / 10; // 1px = 0.1m, round to 1 decimal
          upd('distChallenge', { active: true, targetDist: realDistMeters, targetMat: hitMat, answer: null, result: null });
          emitClick(); // fire a sonar pulse so they can hear it
          if (announceToSR) announceToSR('Distance challenge! You just clicked. How far is the ' + hitMat + ' surface ahead of you? Choose an estimate.');
        }
      }

      // ── Material identification quiz ──
      function startMaterialQuiz() {
        var player = playerRef.current;
        var map = mapRef.current;
        if (!map) return;
        var rdx = Math.cos(player.angle), rdy = Math.sin(player.angle);
        var minDist = Infinity, hitMat = null;
        for (var wi = 0; wi < map.walls.length; wi++) {
          var w = map.walls[wi];
          var dist = rayHit(player.x, player.y, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
          if (dist > 0 && dist < minDist) { minDist = dist; hitMat = w.mat; }
        }
        for (var oi = 0; oi < map.objects.length; oi++) {
          var obj = map.objects[oi];
          if (obj.isGoal) continue;
          var odx = obj.x - player.x, ody = obj.y - player.y;
          var proj = odx * rdx + ody * rdy;
          if (proj > 0) {
            var perp = Math.abs(odx * rdy - ody * rdx);
            if (perp < obj.r) {
              var hd = proj - Math.sqrt(Math.max(0, obj.r * obj.r - perp * perp));
              if (hd > 0 && hd < minDist) { minDist = hd; hitMat = obj.mat; }
            }
          }
        }
        if (hitMat && minDist < 400) {
          var allMats = ['concrete', 'rock', 'wood', 'metal', 'glass'];
          var options = [hitMat];
          while (options.length < 4) {
            var pick = allMats[Math.floor(Math.random() * allMats.length)];
            if (options.indexOf(pick) === -1) options.push(pick);
          }
          // Shuffle options
          for (var si = options.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            var temp = options[si]; options[si] = options[sj]; options[sj] = temp;
          }
          upd('matQuiz', { active: true, correctMat: hitMat, options: options, answer: null, result: null });
          emitClick();
          if (announceToSR) announceToSR('Material quiz! Listen to the echo ahead and identify the material.');
        } else {
          if (addToast) addToast('No surface detected ahead. Try facing a wall first.', 'info');
        }
      }

      // ══════════════════════════════════════════════════════════
      // 3D RENDER LOOP
      // ══════════════════════════════════════════════════════════
      useEffect(function() {
        if (!has3D || !mountRef.current) return;
        var THREE = window.THREE;
        if (!THREE) return;
        var map = mapRef.current; var agents = agentsRef.current; var player = playerRef.current;
        if (!map) return;
        var sd = build3DScene(THREE, map, agents);
        sceneDataRef.current = sd;
        var SCALE = sd.SCALE;
        var camera = new THREE.PerspectiveCamera(75, 1, 0.1, 120);
        camera.position.set(player.x * SCALE, 1.5, player.y * SCALE);
        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        var container = mountRef.current;
        var rw = container.clientWidth || 700; var rh = container.clientHeight || 450;
        renderer.setSize(rw, rh);
        camera.aspect = rw / rh; camera.updateProjectionMatrix();
        renderer.domElement.style.display = 'block'; renderer.domElement.style.borderRadius = '12px'; renderer.domElement.style.outline = 'none';
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        var isLocked = false;
        function onPointerLockChange() { isLocked = (document.pointerLockElement === renderer.domElement); pointerLockedRef.current = isLocked; }
        document.addEventListener('pointerlockchange', onPointerLockChange);
        function onCanvasClick() { if (!isLocked) { try { renderer.domElement.requestPointerLock(); } catch(e) {} } else { emitClick(); } }
        renderer.domElement.addEventListener('click', onCanvasClick);
        function onMouseMove(e) { if (!isLocked) return; var sensitivity = 0.002; yawRef.current -= e.movementX * sensitivity; pitchRef.current -= e.movementY * sensitivity; pitchRef.current = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, pitchRef.current)); }
        document.addEventListener('mousemove', onMouseMove);
        function onKeyDown(e) { keysRef.current[e.code] = true; if (e.code === 'Space') { e.preventDefault(); emitClick(); } }
        function onKeyUp(e) { keysRef.current[e.code] = false; }
        document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);
        var agentSounds = []; var ambientNodes = [];
        try {
          var audio = initAudio();
          if (audio && audio.ctx) {
            var ac = audio.ctx;
            for (var asi = 0; asi < agents.length; asi++) {
              var ag = agents[asi];
              var osc = ac.createOscillator(); var gn = ac.createGain(); var pan = ac.createPanner();
              pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 1; pan.maxDistance = 60; pan.rolloffFactor = 1.5;
              var _baseFreq = 200;
              if (ag.kind === 'car') { osc.type = 'sawtooth'; osc.frequency.value = 55; gn.gain.value = 0.025; _baseFreq = 55; }
              else if (ag.kind === 'bat') { osc.type = 'sine'; osc.frequency.value = 3200; gn.gain.value = 0.006; _baseFreq = 3200; }
              else if (ag.kind === 'bird') { var birdFreqVal = 2400 + Math.random() * 800; osc.type = 'sine'; osc.frequency.value = birdFreqVal; gn.gain.value = 0.01; _baseFreq = birdFreqVal; }
              else if (ag.kind === 'deer') { osc.type = 'triangle'; osc.frequency.value = 80; gn.gain.value = 0.012; _baseFreq = 80; }
              else if (ag.kind === 'jogger') { osc.type = 'triangle'; osc.frequency.value = 180; gn.gain.value = 0.01; _baseFreq = 180; }
              else if (ag.kind === 'cyclist') { osc.type = 'sawtooth'; osc.frequency.value = 90; gn.gain.value = 0.015; _baseFreq = 90; }
              else { osc.type = 'triangle'; osc.frequency.value = 200; gn.gain.value = 0.008; _baseFreq = 200; }
              osc.connect(gn); gn.connect(pan); pan.connect(ac.destination); osc.start();
              agentSounds.push({ osc: osc, gain: gn, panner: pan, agent: ag, _baseFreq: _baseFreq });
            }
            if (envType === 'cave') {
              var dripPositions = [{ x: 200, y: 200 }, { x: 500, y: 300 }, { x: 350, y: 600 }];
              for (var dpi = 0; dpi < 3; dpi++) {
                var dripOsc = ac.createOscillator(); dripOsc.type = 'sine'; dripOsc.frequency.value = 1800 + dpi * 400;
                var dripGain = ac.createGain(); dripGain.gain.value = 0;
                var dripPan = ac.createPanner(); dripPan.panningModel = 'HRTF'; dripPan.distanceModel = 'inverse'; dripPan.refDistance = 1; dripPan.maxDistance = 40; dripPan.rolloffFactor = 1.5;
                dripOsc.connect(dripGain); dripGain.connect(dripPan); dripPan.connect(ac.destination); dripOsc.start();
                ambientNodes.push({ type: 'drip', osc: dripOsc, gain: dripGain, panner: dripPan, pos: dripPositions[dpi], phase: dpi * 0.8, lastPulse: 0 });
              }
            } else if (envType === 'forest') {
              var windOsc = ac.createOscillator(); windOsc.type = 'sawtooth'; windOsc.frequency.value = 120;
              var windFilter = ac.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 300;
              var windGain = ac.createGain(); windGain.gain.value = 0.008;
              windOsc.connect(windFilter); windFilter.connect(windGain); windGain.connect(ac.destination); windOsc.start();
              ambientNodes.push({ type: 'wind', osc: windOsc, gain: windGain, filter: windFilter });
            } else if (envType === 'urban') {
              var traffOsc = ac.createOscillator(); traffOsc.type = 'sawtooth'; traffOsc.frequency.value = 40;
              var traffFilter = ac.createBiquadFilter(); traffFilter.type = 'lowpass'; traffFilter.frequency.value = 200;
              var traffGain = ac.createGain(); traffGain.gain.value = 0.006;
              traffOsc.connect(traffFilter); traffFilter.connect(traffGain); traffGain.connect(ac.destination); traffOsc.start();
              ambientNodes.push({ type: 'traffic', osc: traffOsc, gain: traffGain, filter: traffFilter });
            } else if (envType === 'school') {
              var fluorescentOsc = ac.createOscillator(); fluorescentOsc.type = 'sine'; fluorescentOsc.frequency.value = 60;
              var fluorescentGain = ac.createGain(); fluorescentGain.gain.value = 0.004;
              fluorescentOsc.connect(fluorescentGain); fluorescentGain.connect(ac.destination); fluorescentOsc.start();
              ambientNodes.push({ type: 'fluorescent', osc: fluorescentOsc, gain: fluorescentGain });
              var paOsc = ac.createOscillator(); paOsc.type = 'sine'; paOsc.frequency.value = 440;
              var paFilter = ac.createBiquadFilter(); paFilter.type = 'lowpass'; paFilter.frequency.value = 500;
              var paGain = ac.createGain(); paGain.gain.value = 0.002;
              paOsc.connect(paFilter); paFilter.connect(paGain); paGain.connect(ac.destination); paOsc.start();
              ambientNodes.push({ type: 'pa', osc: paOsc, gain: paGain, filter: paFilter });
            } else if (envType === 'grocery') {
              var fridgeOsc = ac.createOscillator(); fridgeOsc.type = 'sawtooth'; fridgeOsc.frequency.value = 50;
              var fridgeFilter = ac.createBiquadFilter(); fridgeFilter.type = 'lowpass'; fridgeFilter.frequency.value = 120;
              var fridgeGain = ac.createGain(); fridgeGain.gain.value = 0.006;
              fridgeOsc.connect(fridgeFilter); fridgeFilter.connect(fridgeGain); fridgeGain.connect(ac.destination); fridgeOsc.start();
              ambientNodes.push({ type: 'fridge', osc: fridgeOsc, gain: fridgeGain, filter: fridgeFilter });
              var muzakOsc = ac.createOscillator(); muzakOsc.type = 'sine'; muzakOsc.frequency.value = 330;
              var muzakFilter = ac.createBiquadFilter(); muzakFilter.type = 'lowpass'; muzakFilter.frequency.value = 400;
              var muzakGain = ac.createGain(); muzakGain.gain.value = 0.002;
              muzakOsc.connect(muzakFilter); muzakFilter.connect(muzakGain); muzakGain.connect(ac.destination); muzakOsc.start();
              ambientNodes.push({ type: 'muzak', osc: muzakOsc, gain: muzakGain, filter: muzakFilter });
            } else if (envType === 'park') {
              var chirpOsc = ac.createOscillator(); chirpOsc.type = 'sine'; chirpOsc.frequency.value = 2800;
              var chirpGain = ac.createGain(); chirpGain.gain.value = 0.005;
              chirpOsc.connect(chirpGain); chirpGain.connect(ac.destination); chirpOsc.start();
              ambientNodes.push({ type: 'chirp', osc: chirpOsc, gain: chirpGain });
              var fountainOsc = ac.createOscillator(); fountainOsc.type = 'sawtooth'; fountainOsc.frequency.value = 400;
              var fountainFilter = ac.createBiquadFilter(); fountainFilter.type = 'lowpass'; fountainFilter.frequency.value = 600;
              var fountainGain = ac.createGain(); fountainGain.gain.value = 0.008;
              var fountainPan = ac.createPanner(); fountainPan.panningModel = 'HRTF'; fountainPan.distanceModel = 'inverse'; fountainPan.refDistance = 1; fountainPan.maxDistance = 40; fountainPan.rolloffFactor = 1.5;
              fountainOsc.connect(fountainFilter); fountainFilter.connect(fountainGain); fountainGain.connect(fountainPan); fountainPan.connect(ac.destination); fountainOsc.start();
              ambientNodes.push({ type: 'fountain', osc: fountainOsc, gain: fountainGain, filter: fountainFilter, panner: fountainPan, pos: { x: 400, y: 400 } });
            }
            // ── Sound Landmarks ──
            var envLandmarks = LANDMARKS[envType];
            if (envLandmarks) {
              for (var lmi = 0; lmi < envLandmarks.length; lmi++) {
                var lm = envLandmarks[lmi];
                var lmOsc = ac.createOscillator();
                lmOsc.type = 'sine';
                lmOsc.frequency.value = lm.freq;
                var lmGain = ac.createGain();
                var lmPan = ac.createPanner();
                lmPan.panningModel = 'HRTF';
                lmPan.distanceModel = 'inverse';
                lmPan.refDistance = 1;
                lmPan.maxDistance = 50;
                lmPan.rolloffFactor = 1.5;
                if (lm.type === 'hum') {
                  lmGain.gain.value = lm.gain;
                } else {
                  lmGain.gain.value = 0;
                }
                lmOsc.connect(lmGain);
                lmGain.connect(lmPan);
                lmPan.connect(ac.destination);
                lmOsc.start();
                var lmType = lm.type === 'hum' ? 'landmark_hum' : (lm.type === 'beep' ? 'landmark_beep' : 'landmark_tick');
                ambientNodes.push({ type: lmType, osc: lmOsc, gain: lmGain, panner: lmPan, pos: { x: lm.x, y: lm.y }, interval: lm.interval || 1.0, baseGain: lm.gain, name: lm.name });
              }
            }
          }
        } catch(e) {}
        agentOscRef.current = agentSounds; ambientSoundsRef.current = ambientNodes;
        var running = true; var lastTime = performance.now(); var goalCheckTimer = 0; var bumpFlash = 0; var ambientTime = 0;

        function loop(now) {
          if (!running) return;
          animRef.current = requestAnimationFrame(loop);
          var dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now; ambientTime += dt;
          var keys = keysRef.current; var currentViewMode = d.viewMode || 'echo';

          // Sprint and crouch detection
          var isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
          var isCrouching = keys['KeyC'] || keys['ControlLeft'];
          var speedMult = isSprinting ? 1.6 : isCrouching ? 0.5 : 1.0;
          var ms = 180 * speedMult;
          var turnSpeed = 2.0;

          if (!isLocked) { if (keys['ArrowLeft']) yawRef.current += turnSpeed * dt; if (keys['ArrowRight']) yawRef.current -= turnSpeed * dt; }
          player.angle = yawRef.current;
          var fdx = Math.cos(player.angle); var fdy = Math.sin(player.angle);
          var rdxS = Math.cos(player.angle + Math.PI / 2); var rdyS = Math.sin(player.angle + Math.PI / 2);
          var moved = false; var moveX = 0, moveY = 0;
          if (keys['KeyW'] || keys['ArrowUp']) { moveX += fdx; moveY += fdy; }
          if (keys['KeyS'] || keys['ArrowDown']) { moveX -= fdx; moveY -= fdy; }
          if (keys['KeyQ']) { moveX -= rdxS; moveY -= rdyS; }
          if (keys['KeyE'] || keys['KeyD']) { moveX += rdxS; moveY += rdyS; }
          if (keys['KeyA']) { moveX -= rdxS; moveY -= rdyS; }
          if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
            var mLen = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX = (moveX / mLen) * ms * dt; moveY = (moveY / mLen) * ms * dt;
            var nx = player.x + moveX, ny = player.y + moveY;
            if (canMoveTo(nx, ny, map)) { player.x = nx; player.y = ny; moved = true; }
            else {
              if (bumpFlash <= 0) {
                bumpFlash = 0.3; updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
                try { var bac = audioRef.current && audioRef.current.ctx; if (bac) { var bo = bac.createOscillator(); var bg = bac.createGain(); bo.type = 'sine'; bo.frequency.value = 120; bg.gain.setValueAtTime(0.08, bac.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, bac.currentTime + 0.1); bo.connect(bg); bg.connect(bac.destination); bo.start(); bo.stop(bac.currentTime + 0.1); } } catch(e) {}
              }
            }
          }

          // Player footstep sounds — rhythmic tapping when moving
          footstepRef.current.stepInterval = isSprinting ? 0.25 : isCrouching ? 0.7 : 0.4;
          if (moved) {
            footstepRef.current.lastStep += dt;
            if (footstepRef.current.lastStep >= footstepRef.current.stepInterval) {
              footstepRef.current.lastStep = 0;
              try {
                var fsAc = audioRef.current && audioRef.current.ctx;
                if (fsAc) {
                  var fsOsc = fsAc.createOscillator();
                  var fsGain = fsAc.createGain();
                  fsOsc.type = 'triangle';
                  fsOsc.frequency.value = 100 + Math.random() * 30; // slight variation
                  fsGain.gain.setValueAtTime(isSprinting ? 0.05 : isCrouching ? 0.01 : 0.03, fsAc.currentTime);
                  fsGain.gain.exponentialRampToValueAtTime(0.001, fsAc.currentTime + 0.06);
                  fsOsc.connect(fsGain);
                  fsGain.connect(fsAc.destination);
                  fsOsc.start();
                  fsOsc.stop(fsAc.currentTime + 0.06);
                }
              } catch(e) {}
            }
          } else {
            footstepRef.current.lastStep = footstepRef.current.stepInterval * 0.8; // near-trigger so next movement is responsive
          }

          updateAgents(agents, dt * diff.agentSpeedMult, map);
          for (var aci = 0; aci < agents.length; aci++) {
            var ag = agents[aci]; var adx = player.x - ag.x, ady = player.y - ag.y; var adist = Math.sqrt(adx * adx + ady * ady);
            var hitRadius = ag.kind === 'car' ? 25 : ag.kind === 'bat' ? 8 : ag.kind === 'deer' ? 18 : ag.kind === 'bird' ? 6 : ag.kind === 'cyclist' ? 12 : 15;
            if (adist < hitRadius) {
              if (ag.kind === 'car' && bumpFlash <= 0) {
                bumpFlash = 0.5; carHitRef.current = true; updMulti({ bumps: (d.bumps || 0) + 3 });
                if (addToast) addToast('\uD83D\uDE97 Hit by a car! -3 bumps penalty', 'error'); if (announceToSR) announceToSR('Hit by a car! 3 bump penalty.'); if (window._alloHaptic) window._alloHaptic('bump');
                try { var cac = audioRef.current && audioRef.current.ctx; if (cac) { var co = cac.createOscillator(); var cg = cac.createGain(); co.type = 'sawtooth'; co.frequency.value = 180; cg.gain.setValueAtTime(0.12, cac.currentTime); cg.gain.exponentialRampToValueAtTime(0.001, cac.currentTime + 0.3); co.connect(cg); cg.connect(cac.destination); co.start(); co.stop(cac.currentTime + 0.3); } } catch(e) {}
              } else if (ag.kind === 'cyclist' && bumpFlash <= 0) {
                bumpFlash = 0.4; updMulti({ bumps: (d.bumps || 0) + 2 });
                if (addToast) addToast('\uD83D\uDEB4 Hit by a cyclist! -2 bumps penalty', 'warn'); if (announceToSR) announceToSR('Hit by a cyclist! 2 bump penalty.'); if (window._alloHaptic) window._alloHaptic('bump');
              } else if ((ag.kind === 'pedestrian' || ag.kind === 'jogger') && bumpFlash <= 0) {
                bumpFlash = 0.2; updMulti({ bumps: (d.bumps || 0) + 1 });
                if (addToast) addToast('\uD83D\uDEB6 Bumped into a ' + ag.kind + '!', 'warn'); if (announceToSR) announceToSR('Bumped into a ' + ag.kind + '.'); if (window._alloHaptic) window._alloHaptic('bump');
              }
            }
          }
          for (var ami = 0; ami < sd.agentMeshes.length; ami++) { var am = sd.agentMeshes[ami]; var amAg = am.agent; am.mesh.position.x = amAg.x * SCALE; am.mesh.position.z = amAg.y * SCALE; am.mesh.userData.mapX = amAg.x; am.mesh.userData.mapY = amAg.y; }
          for (var sai = 0; sai < agentSounds.length; sai++) {
            var asnd = agentSounds[sai]; var sag = asnd.agent; var relX = (sag.x - player.x) * 0.01; var relZ = (sag.y - player.y) * 0.01;
            var cosP = Math.cos(-player.angle), sinP = Math.sin(-player.angle);
            asnd.panner.positionX.value = relX * cosP - relZ * sinP;
            asnd.panner.positionY.value = (sag.kind === 'bat' ? 1.5 : sag.kind === 'bird' ? 2.0 : sag.kind === 'deer' ? -0.5 : sag.kind === 'jogger' ? 0 : sag.kind === 'cyclist' ? -0.3 : 0);
            asnd.panner.positionZ.value = relX * sinP + relZ * cosP;

            // Doppler effect: pitch shift based on radial velocity toward player
            if (!asnd._lastDist) asnd._lastDist = 0;
            var agDist = Math.sqrt((sag.x - player.x) * (sag.x - player.x) + (sag.y - player.y) * (sag.y - player.y));
            var radialVel = (asnd._lastDist - agDist) / Math.max(0.016, dt); // positive = approaching
            asnd._lastDist = agDist;
            var dopplerRatio = SPEED_OF_SOUND / Math.max(1, SPEED_OF_SOUND - radialVel * 0.3);
            var baseFreq = sag.kind === 'car' ? 55 : sag.kind === 'bat' ? 3200 : sag.kind === 'bird' ? (asnd._baseFreq || 2800) : sag.kind === 'deer' ? 80 : sag.kind === 'jogger' ? 180 : sag.kind === 'cyclist' ? 90 : 200;
            asnd.osc.frequency.value = baseFreq * Math.max(0.7, Math.min(1.4, dopplerRatio));
          }
          for (var ambi = 0; ambi < ambientNodes.length; ambi++) {
            var aNode = ambientNodes[ambi];
            if (aNode.type === 'drip') {
              var dRelX = (aNode.pos.x - player.x) * 0.01; var dRelZ = (aNode.pos.y - player.y) * 0.01;
              var dCosP = Math.cos(-player.angle), dSinP = Math.sin(-player.angle);
              aNode.panner.positionX.value = dRelX * dCosP - dRelZ * dSinP; aNode.panner.positionY.value = 1.0; aNode.panner.positionZ.value = dRelX * dSinP + dRelZ * dCosP;
              var dripCycle = (ambientTime + aNode.phase) % 2.5;
              if (dripCycle < 0.06) { aNode.gain.gain.value = 0.035; } else { aNode.gain.gain.value = 0; }
            } else if (aNode.type === 'chirp') { var chirpPulse = Math.sin(ambientTime * 1.5) * 0.5 + 0.5; aNode.gain.gain.value = 0.005 * chirpPulse; }
            else if (aNode.type === 'fountain' && aNode.panner) {
              var fRelX = (aNode.pos.x - player.x) * 0.01; var fRelZ = (aNode.pos.y - player.y) * 0.01;
              var fCosP = Math.cos(-player.angle), fSinP = Math.sin(-player.angle);
              aNode.panner.positionX.value = fRelX * fCosP - fRelZ * fSinP; aNode.panner.positionY.value = 0; aNode.panner.positionZ.value = fRelX * fSinP + fRelZ * fCosP;
            } else if (aNode.type === 'landmark_tick' || aNode.type === 'landmark_beep') {
              var lmCycle = ambientTime % aNode.interval;
              aNode.gain.gain.value = (lmCycle < 0.04) ? aNode.baseGain : 0;
              var lmRelX = (aNode.pos.x - player.x) * 0.01;
              var lmRelZ = (aNode.pos.y - player.y) * 0.01;
              var lmCosP = Math.cos(-player.angle), lmSinP = Math.sin(-player.angle);
              aNode.panner.positionX.value = lmRelX * lmCosP - lmRelZ * lmSinP;
              aNode.panner.positionY.value = 0;
              aNode.panner.positionZ.value = lmRelX * lmSinP + lmRelZ * lmCosP;
            } else if (aNode.type === 'landmark_hum') {
              var lhRelX = (aNode.pos.x - player.x) * 0.01;
              var lhRelZ = (aNode.pos.y - player.y) * 0.01;
              var lhCosP = Math.cos(-player.angle), lhSinP = Math.sin(-player.angle);
              aNode.panner.positionX.value = lhRelX * lhCosP - lhRelZ * lhSinP;
              aNode.panner.positionY.value = 0;
              aNode.panner.positionZ.value = lhRelX * lhSinP + lhRelZ * lhCosP;
            }
          }
          var activePulses = []; var nowMs = Date.now();
          for (var spi = 0; spi < pulsesRef.current.length; spi++) {
            var pulse = pulsesRef.current[spi]; var age = (nowMs - pulse.birth) / 1000; var pulseRadiusPx = age * SPEED_OF_SOUND * 0.5; var pulseIntensity = Math.max(0, 1 - age * 1.5);
            if (pulseIntensity <= 0) continue; activePulses.push(pulse);
            for (var mi = 0; mi < sd.meshes.length; mi++) {
              var mesh = sd.meshes[mi]; var mData = mesh.userData; if (mData.kind === 'floor') continue;
              var mdx = mData.mapX - pulse.x; var mdy = mData.mapY - pulse.y; var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
              var band = (mData.kind === 'agent') ? 25 : 20;
              if (Math.abs(mDist - pulseRadiusPx) < band) { var bandFade = 1 - Math.abs(mDist - pulseRadiusPx) / band; var glow = pulseIntensity * bandFade * (mData.ref || 0.5); if (glow > mData.glowAmt) { mData.glowAmt = glow; } }
            }
          }
          pulsesRef.current = activePulses;
          for (var gdi = 0; gdi < sd.meshes.length; gdi++) {
            var gm = sd.meshes[gdi];
            if (gm.userData.glowAmt > 0) {
              if (gm.userData.kind !== 'agent') {
                if (!gm.userData.peakGlow || gm.userData.glowAmt > gm.userData.peakGlow) { gm.userData.peakGlow = gm.userData.glowAmt; }
                var ghostTarget = Math.min(diff.ghostMax, (gm.userData.peakGlow || 0) * 0.12);
                if (!gm.userData.ghostGlow || gm.userData.ghostGlow < ghostTarget) { gm.userData.ghostGlow = ghostTarget; }
              }
              gm.userData.glowAmt = Math.max(0, gm.userData.glowAmt - 1.2 * dt);
            }
            if (gm.userData.kind !== 'agent' && gm.userData.ghostGlow > 0) { gm.userData.ghostGlow = Math.max(0, gm.userData.ghostGlow - diff.ghostDecay * dt); }
          }
          var sinePulse = Math.sin(now * 0.003) * 0.05;
          for (var agl = 0; agl < sd.agentMeshes.length; agl++) {
            var agMesh = sd.agentMeshes[agl]; var agKind = agMesh.agent.kind;
            var baseGlow = agKind === 'car' ? 0.32 : agKind === 'pedestrian' ? 0.18 : agKind === 'deer' ? 0.15 : agKind === 'bird' ? 0.08 : agKind === 'jogger' ? 0.15 : agKind === 'cyclist' ? 0.22 : 0.1;
            var ambientGlow = baseGlow + sinePulse;
            if (ambientGlow > agMesh.mesh.userData.glowAmt) { agMesh.mesh.userData.glowAmt = ambientGlow; }
          }
          for (var mci = 0; mci < sd.meshes.length; mci++) {
            var cm = sd.meshes[mci]; var cmMat = cm.material; var cmUD = cmMat.userData; if (!cmUD || !cmUD.baseColor) continue;
            if (currentViewMode === 'reveal') { cmMat.color.copy(cmUD.baseColor); }
            else if (currentViewMode === 'audio') { cmMat.color.setHex(0x000000); }
            else { var ga = cm.userData.glowAmt || 0; var ghostG = cm.userData.ghostGlow || 0; var effectiveGlow = Math.max(ga, ghostG); cmMat.color.setRGB(cmUD.baseColor.r * effectiveGlow, cmUD.baseColor.g * effectiveGlow, cmUD.baseColor.b * effectiveGlow); }
          }
          if (currentViewMode === 'reveal') { sd.scene.children[2].material.color.setHex(0x1a1a2e); } else { sd.scene.children[2].material.color.setHex(0x000000); }
          sd.ambient.intensity = currentViewMode === 'reveal' ? 0.7 : 0.02;
          sd.scene.fog.far = currentViewMode === 'reveal' ? 100 : 40;

          // Camera height: crouch lowers camera
          var camHeight = isCrouching ? 0.8 : 1.5;
          camera.position.set(player.x * SCALE, camHeight, player.y * SCALE);
          var lookX = player.x * SCALE + Math.cos(yawRef.current) * Math.cos(pitchRef.current);
          var lookY = camHeight + Math.sin(pitchRef.current);
          var lookZ = player.y * SCALE + Math.sin(yawRef.current) * Math.cos(pitchRef.current);
          camera.lookAt(lookX, lookY, lookZ);
          if (bumpFlash > 0) { bumpFlash -= dt; var flashOpacity = Math.min(1, bumpFlash * 3); renderer.domElement.style.boxShadow = 'inset 0 0 60px rgba(239,68,68,' + (flashOpacity * 0.6) + ')'; } else { renderer.domElement.style.boxShadow = 'none'; }
          goalCheckTimer++;
          if (goalCheckTimer % 10 === 0) {
            map.objects.forEach(function(o) {
              if (!o.isGoal || goalFoundRef.current) return;
              var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gdist < 200) {
                var interval = Math.max(8, Math.floor(gdist / 3));
                if (goalCheckTimer % interval === 0) {
                  var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600;
                  try { var pac = audioRef.current && audioRef.current.ctx; if (pac) { var po = pac.createOscillator(); var pg = pac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, pac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, pac.currentTime + 0.05); po.connect(pg); pg.connect(pac.destination); po.start(); po.stop(pac.currentTime + 0.05); } } catch(e) {}
                  if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                }
              }
            });
          }
          // ── Waypoint navigation detection (3D) ──
          if (waypointMode && WAYPOINT_ROUTES[envType] && !goalFoundRef.current) {
            var route = WAYPOINT_ROUTES[envType];
            var wpIdx = d.waypointIdx || 0;
            if (wpIdx < route.points.length) {
              var wp = route.points[wpIdx];
              var wpDist = Math.sqrt((player.x - wp.x) * (player.x - wp.x) + (player.y - wp.y) * (player.y - wp.y));
              if (wpDist < 150 && goalCheckTimer % 12 === 0) {
                var wpInterval = Math.max(6, Math.floor(wpDist / 2));
                if (goalCheckTimer % wpInterval === 0) {
                  try { var wpAc = audioRef.current && audioRef.current.ctx; if (wpAc) { var wpo = wpAc.createOscillator(); var wpg = wpAc.createGain(); wpo.type = 'square'; wpo.frequency.value = 1200; wpg.gain.setValueAtTime(0.03, wpAc.currentTime); wpg.gain.exponentialRampToValueAtTime(0.001, wpAc.currentTime + 0.04); wpo.connect(wpg); wpg.connect(wpAc.destination); wpo.start(); wpo.stop(wpAc.currentTime + 0.04); } } catch(e) {}
                }
              }
              if (wpDist < 25) {
                var nextIdx = wpIdx + 1;
                if (nextIdx >= route.points.length) {
                  goalFoundRef.current = true;
                  var wpXP = 15 + route.points.length * 8;
                  var wpUpdateObj = { goalFoundThisRun: true, goalsFound: goalsFound + 1, waypointIdx: nextIdx, waypointComplete: true };
                  updMulti(wpUpdateObj);
                  if (addToast) addToast('\uD83C\uDFC1 Route complete! ' + route.name + ' \u2192 ' + wpXP + ' XP!', 'success');
                  if (awardXP) awardXP('echoTrainer', Math.round(wpXP * diff.xpMult), 'Waypoint route: ' + route.name);
                  if (announceToSR) announceToSR('Route complete! ' + route.name + '. ' + wpXP + ' XP earned.');
                } else {
                  upd('waypointIdx', nextIdx);
                  if (addToast) addToast('\u2705 Waypoint ' + nextIdx + '/' + route.points.length + ': ' + route.points[nextIdx].label, 'info');
                  if (announceToSR) announceToSR('Waypoint reached! Next: ' + route.points[nextIdx].label);
                  if (awardXP) awardXP('echoTrainer', 8, 'Waypoint: ' + route.points[wpIdx].label);
                }
              }
            }
          }
          if (goalCheckTimer % 15 === 0 && !goalFoundRef.current && !waypointMode) {
            map.objects.forEach(function(o) {
              if (!o.isGoal) return;
              var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gd < o.r + 12) {
                goalFoundRef.current = true;
                var isAudioOnly = (currentViewMode === 'audio');
                var newGoals = goalsFound + 1; var newBlinds = isAudioOnly ? blindWins + 1 : blindWins;
                var updateObj = { goalFoundThisRun: true, goalsFound: newGoals, blindWins: newBlinds };
                if (envType === 'urban' && !carHitRef.current) { updateObj.urbanNoCarHit = true; }
                if (diffId === 'master') { updateObj.batMasterWin = true; }
                if (envType === 'school') { updateObj.schoolWin = true; }
                var baseXP = isAudioOnly ? 30 : (currentViewMode === 'echo' ? 20 : 10);
                var bumpPenalty = Math.min(baseXP - 5, d.bumps || 0);
                var finalXP = Math.max(5, Math.round((baseXP - bumpPenalty) * diff.xpMult));
                var modeLabel = currentViewMode === 'audio' ? 'Audio-only' : currentViewMode === 'echo' ? 'Echo Vision' : 'Revealed';
                var runTime = Math.floor((Date.now() - runStartRef.current) / 1000);
                var runHistory = (d.runHistory || []).slice();
                runHistory.push({ env: envType, mode: modeLabel, difficulty: diff.label, time: runTime, clicks: d.clicks || 0, bumps: d.bumps || 0, xp: finalXP });
                if (runHistory.length > 20) runHistory.shift();
                updateObj.runHistory = runHistory;
                updMulti(updateObj);
                var feedbackMsg = '';
                var avgBumpsPerClick = (d.bumps || 0) / Math.max(1, d.clicks || 1);
                if ((d.bumps || 0) === 0) feedbackMsg = 'Perfect navigation! Zero wall bumps.';
                else if (avgBumpsPerClick > 0.5) feedbackMsg = 'Tip: You\'re bumping into walls frequently. Try clicking more often before moving to build your echo map.';
                else if (avgBumpsPerClick > 0.2) feedbackMsg = 'Good awareness, but some bumps. Slow down near surfaces and use multiple clicks to triangulate.';
                else feedbackMsg = 'Strong performance! You\'re reading echoes well.';
                if (runTime > 120) feedbackMsg += ' Try to find the goal faster next time \u2014 click efficiency helps.';
                if ((d.clicks || 0) < 5) feedbackMsg += ' You barely used sonar! Click more to build a richer echo map.';
                if (addToast) addToast('\uD83C\uDFC6 ' + finalXP + ' XP! ' + feedbackMsg, 'success');
                if (window._alloHaptic) window._alloHaptic('achieve');
                if (awardXP) awardXP('echoTrainer', finalXP, modeLabel + ': ' + (d.bumps || 0) + ' bumps');
                if (announceToSR) announceToSR('Goal found! ' + finalXP + ' XP earned. ' + (d.bumps || 0) + ' wall bumps. ' + modeLabel + ' mode.');
              }
            });
          }
          var cw = container.clientWidth || 700; var ch = container.clientHeight || 450;
          if (renderer.domElement.width !== cw || renderer.domElement.height !== ch) { renderer.setSize(cw, ch); camera.aspect = cw / ch; camera.updateProjectionMatrix(); }
          renderer.render(sd.scene, camera);
        }
        animRef.current = requestAnimationFrame(loop);
        return function() {
          running = false; if (animRef.current) cancelAnimationFrame(animRef.current);
          for (var osi = 0; osi < agentSounds.length; osi++) { try { agentSounds[osi].osc.stop(); } catch(e) {} } agentOscRef.current = [];
          for (var amsi = 0; amsi < ambientNodes.length; amsi++) { try { ambientNodes[amsi].osc.stop(); } catch(e) {} } ambientSoundsRef.current = [];
          if (renderer) { try { renderer.dispose(); } catch(e) {} if (renderer.domElement && renderer.domElement.parentNode) { renderer.domElement.parentNode.removeChild(renderer.domElement); } }
          rendererRef.current = null; sceneDataRef.current = null;
          if (document.pointerLockElement) { try { document.exitPointerLock(); } catch(e) {} }
          document.removeEventListener('pointerlockchange', onPointerLockChange); document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp);
        };
      }, [seed, envType, has3D, viewMode, diffId]);

      // ══════════════════════════════════════════════════════════
      // 2D MINIMAP / STANDALONE FALLBACK
      // ══════════════════════════════════════════════════════════
      useEffect(function() {
        if (!canvasRef.current) return;
        var canvas = canvasRef.current; var gfx = canvas.getContext('2d'); var running = true; var goalCheckTimer2d = 0;
        function loop2d() {
          if (!running) return; requestAnimationFrame(loop2d);
          var map = mapRef.current; var player = playerRef.current; var agents = agentsRef.current; var keys = keysRef.current;
          if (!map) return;
          var isMinimap = has3D; var W, H, scale, ox, oy;
          if (isMinimap) { W = canvas.width = 200; H = canvas.height = 200; scale = Math.min(W / map.W, H / map.H); ox = 0; oy = 0; }
          else {
            W = canvas.width = canvas.clientWidth || 800; H = canvas.height = canvas.clientHeight || 400;
            scale = Math.min(W / map.W, H / map.H); ox = (W - map.W * scale) / 2; oy = (H - map.H * scale) / 2;
            var ms2 = 2.5, ts2 = 0.045;
            if (keys['ArrowLeft'] || keys['KeyA']) player.angle -= ts2;
            if (keys['ArrowRight'] || keys['KeyD']) player.angle += ts2;
            var fdx2 = Math.cos(player.angle) * ms2, fdy2 = Math.sin(player.angle) * ms2;
            if (keys['KeyW'] || keys['ArrowUp']) {
              var nx2 = player.x + fdx2, ny2 = player.y + fdy2;
              if (canMoveTo(nx2, ny2, map)) { player.x = nx2; player.y = ny2; }
              else if (!player._bumpCooldown) { player._bumpCooldown = 20; updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump'); try { var bac = audioRef.current && audioRef.current.ctx; if (bac) { var bo = bac.createOscillator(); var bg = bac.createGain(); bo.type = 'sine'; bo.frequency.value = 120; bg.gain.setValueAtTime(0.08, bac.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, bac.currentTime + 0.1); bo.connect(bg); bg.connect(bac.destination); bo.start(); bo.stop(bac.currentTime + 0.1); } } catch(e) {} }
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
              var nx3 = player.x - fdx2, ny3 = player.y - fdy2;
              if (canMoveTo(nx3, ny3, map)) { player.x = nx3; player.y = ny3; }
              else if (!player._bumpCooldown) { player._bumpCooldown = 20; updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump'); try { var bac2 = audioRef.current && audioRef.current.ctx; if (bac2) { var bo2 = bac2.createOscillator(); var bg2 = bac2.createGain(); bo2.type = 'sine'; bo2.frequency.value = 120; bg2.gain.setValueAtTime(0.08, bac2.currentTime); bg2.gain.exponentialRampToValueAtTime(0.001, bac2.currentTime + 0.1); bo2.connect(bg2); bg2.connect(bac2.destination); bo2.start(); bo2.stop(bac2.currentTime + 0.1); } } catch(e) {} }
            }
            if (player._bumpCooldown > 0) player._bumpCooldown--;
            updateAgents(agents, (1 / 60) * diff.agentSpeedMult, map);
          }
          gfx.clearRect(0, 0, W, H); gfx.fillStyle = isMinimap ? 'rgba(8,8,16,0.85)' : '#080810'; gfx.fillRect(0, 0, W, H);
          gfx.save(); gfx.translate(ox, oy); gfx.scale(scale, scale);
          var currentViewMode2d = d.viewMode || 'echo'; var showMap = isMinimap || currentViewMode2d === 'reveal';
          if (showMap) {
            gfx.lineWidth = isMinimap ? 2 : 3;
            map.walls.forEach(function(w) { gfx.strokeStyle = w.mat === 'metal' ? '#94a3b8' : w.mat === 'wood' ? '#a16207' : w.mat === 'glass' ? '#7dd3fc55' : '#475569'; gfx.beginPath(); gfx.moveTo(w.x1, w.y1); gfx.lineTo(w.x2, w.y2); gfx.stroke(); });
            map.objects.forEach(function(o) { gfx.fillStyle = o.isGoal ? '#fbbf24' : o.mat === 'metal' ? '#94a3b8' : o.mat === 'wood' ? '#92400e' : '#64748b'; gfx.beginPath(); gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2); gfx.fill(); if (o.isGoal && !isMinimap) { gfx.fillStyle = '#080810'; gfx.font = 'bold 14px sans-serif'; gfx.textAlign = 'center'; gfx.fillText('\u2B50', o.x, o.y + 5); } });
          }
          if (showMap || isMinimap) {
            for (var dai = 0; dai < agents.length; dai++) { var da = agents[dai]; gfx.fillStyle = da.kind === 'car' ? '#ffc47c' : da.kind === 'bat' ? '#c4b5fd' : da.kind === 'deer' ? '#a3e635' : da.kind === 'bird' ? '#67e8f9' : da.kind === 'jogger' ? '#fb923c' : da.kind === 'cyclist' ? '#f472b6' : '#ff9c9c'; gfx.beginPath(); gfx.arc(da.x, da.y, isMinimap ? 5 : 8, 0, Math.PI * 2); gfx.fill(); }
          }
          // ── Coverage heatmap overlay on minimap ──
          if (coverageRef.current && isMinimap) {
            var cGrid2 = coverageRef.current.grid;
            for (var hx = 0; hx < 40; hx++) {
              for (var hy = 0; hy < 40; hy++) {
                var cv = cGrid2[hx][hy];
                if (cv > 0.05) {
                  gfx.fillStyle = 'rgba(99,102,241,' + (cv * 0.25) + ')';
                  gfx.fillRect(hx * 20, hy * 20, 20, 20);
                }
              }
            }
          }
          if (!isMinimap) {
            if (!player._trail) player._trail = [];
            if (player._trail.length === 0 || Math.abs(player.x - player._trail[player._trail.length - 1].x) > 5 || Math.abs(player.y - player._trail[player._trail.length - 1].y) > 5) { player._trail.push({ x: player.x, y: player.y }); if (player._trail.length > 200) player._trail.shift(); }
            for (var ti2 = 0; ti2 < player._trail.length; ti2++) { var trailAlpha = (ti2 / player._trail.length) * 0.15; gfx.fillStyle = 'rgba(99,102,241,' + trailAlpha + ')'; gfx.beginPath(); gfx.arc(player._trail[ti2].x, player._trail[ti2].y, 2, 0, Math.PI * 2); gfx.fill(); }
          }
          if ((currentViewMode2d === 'echo' || isMinimap) && pulsesRef.current.length > 0) {
            var nowEv = Date.now();
            pulsesRef.current.forEach(function(pulse) {
              var evAge = (nowEv - pulse.birth) / 1000; var evRadius = evAge * SPEED_OF_SOUND * 0.5; var evAlpha = Math.max(0, 1 - evAge * 1.5);
              if (evAlpha <= 0) return;
              gfx.strokeStyle = 'rgba(120,180,255,' + (evAlpha * 0.2) + ')'; gfx.lineWidth = 2; gfx.beginPath(); gfx.arc(pulse.x, pulse.y, evRadius, 0, Math.PI * 2); gfx.stroke();
              if (!isMinimap) {
                map.walls.forEach(function(w) { var wx = w.x2 - w.x1, wy = w.y2 - w.y1; var wl2 = wx * wx + wy * wy; if (wl2 < 1) return; for (var svi = 0; svi <= 4; svi++) { var t2 = svi / 4; var pvx = w.x1 + wx * t2, pvy = w.y1 + wy * t2; var dx2 = pvx - pulse.x, dy2 = pvy - pulse.y; var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2); if (Math.abs(dist2 - evRadius) < 15) { var intensity = evAlpha * w.ref * (1 - Math.abs(dist2 - evRadius) / 15); var color = w.mat === 'metal' ? '200,220,255' : w.mat === 'wood' ? '180,140,80' : w.mat === 'glass' ? '150,220,255' : '100,160,220'; gfx.fillStyle = 'rgba(' + color + ',' + (intensity * 0.7) + ')'; gfx.beginPath(); gfx.arc(pvx, pvy, 6, 0, Math.PI * 2); gfx.fill(); } } });
                map.objects.forEach(function(o) { var odx = o.x - pulse.x, ody = o.y - pulse.y; var odist = Math.sqrt(odx * odx + ody * ody); if (Math.abs(odist - evRadius) < o.r + 10) { var oIntensity = evAlpha * o.ref * (1 - Math.abs(odist - evRadius) / (o.r + 10)); var oColor = o.isGoal ? '255,220,50' : o.mat === 'metal' ? '200,220,255' : '100,160,220'; gfx.fillStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.6) + ')'; gfx.beginPath(); gfx.arc(o.x, o.y, o.r + 3, 0, Math.PI * 2); gfx.fill(); gfx.strokeStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.9) + ')'; gfx.lineWidth = 2; gfx.beginPath(); gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2); gfx.stroke(); } });
                for (var eai = 0; eai < agents.length; eai++) { var ea = agents[eai]; var eadx = ea.x - pulse.x, eady = ea.y - pulse.y; var eadist = Math.sqrt(eadx * eadx + eady * eady); if (Math.abs(eadist - evRadius) < ea.radius + 12) { var eaInt = evAlpha * ea.ref * (1 - Math.abs(eadist - evRadius) / (ea.radius + 12)); var eaColor = ea.kind === 'car' ? '255,196,124' : ea.kind === 'bat' ? '196,181,253' : ea.kind === 'deer' ? '163,230,53' : ea.kind === 'bird' ? '103,232,249' : ea.kind === 'jogger' ? '251,146,60' : ea.kind === 'cyclist' ? '244,114,182' : '255,156,156'; gfx.fillStyle = 'rgba(' + eaColor + ',' + (eaInt * 0.6) + ')'; gfx.beginPath(); gfx.arc(ea.x, ea.y, ea.radius + 3, 0, Math.PI * 2); gfx.fill(); } }
              }
            });
          }
          if (!isMinimap && player._bumpCooldown > 15) { gfx.fillStyle = 'rgba(239,68,68,' + ((player._bumpCooldown - 15) / 5 * 0.15) + ')'; gfx.fillRect(0, 0, map.W, map.H); }
          gfx.fillStyle = '#6366f1'; gfx.beginPath(); gfx.arc(player.x, player.y, isMinimap ? 5 : 8, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#a5b4fc'; gfx.lineWidth = isMinimap ? 1 : 2; gfx.beginPath(); gfx.moveTo(player.x, player.y);
          gfx.lineTo(player.x + Math.cos(player.angle) * (isMinimap ? 12 : 22), player.y + Math.sin(player.angle) * (isMinimap ? 12 : 22)); gfx.stroke();
          if (!isMinimap) { gfx.strokeStyle = 'rgba(99,102,241,0.15)'; gfx.lineWidth = 1; gfx.beginPath(); gfx.arc(player.x, player.y, 80, player.angle - 0.33 * Math.PI, player.angle + 0.33 * Math.PI); gfx.stroke(); }
          if (!isMinimap) {
            gfx.save(); gfx.translate(map.W - 30, 40); gfx.strokeStyle = 'rgba(148,163,184,0.3)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.moveTo(0, -16); gfx.lineTo(0, 16); gfx.stroke(); gfx.beginPath(); gfx.moveTo(-16, 0); gfx.lineTo(16, 0); gfx.stroke();
            gfx.fillStyle = 'rgba(239,68,68,0.5)'; gfx.font = 'bold 8px sans-serif'; gfx.textAlign = 'center'; gfx.fillText('N', 0, -19);
            gfx.fillStyle = 'rgba(148,163,184,0.3)'; gfx.fillText('S', 0, 24); gfx.fillText('E', 20, 3); gfx.fillText('W', -20, 3); gfx.restore();
          }
          gfx.restore();
          if (!isMinimap) {
            gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(0, 0, W, 26);
            gfx.font = 'bold 11px monospace'; gfx.fillStyle = '#94a3b8'; gfx.textAlign = 'left';
            var modeLabel = currentViewMode2d === 'echo' ? 'ECHO VISION' : currentViewMode2d === 'audio' ? 'AUDIO ONLY \uD83C\uDFA7' : 'MAP VISIBLE';
            var elapsed2d = Math.floor((Date.now() - runStartRef.current) / 1000);
            var timeStr2d = Math.floor(elapsed2d / 60) + ':' + ('0' + (elapsed2d % 60)).slice(-2);
            var cpm2d = Math.round((d.clicks || 0) / Math.max(1, elapsed2d / 60));
            gfx.fillText('Echo Navigator  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + (d.bumps || 0) + '  |  Goals: ' + goalsFound + '  |  ' + modeLabel + '  |  ' + envType + '  |  ' + diff.label + '  |  Time: ' + timeStr2d + '  |  ' + cpm2d + ' clicks/min', 8, 17);
            goalCheckTimer2d++;
            if (goalCheckTimer2d % 10 === 0) {
              map.objects.forEach(function(o) {
                if (!o.isGoal || d.goalFoundThisRun) return;
                var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gdist < 200) { var interval = Math.max(8, Math.floor(gdist / 3)); if (goalCheckTimer2d % interval === 0) { var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600; try { var ac = audioRef.current && audioRef.current.ctx; if (ac) { var po = ac.createOscillator(); var pg = ac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, ac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05); po.connect(pg); pg.connect(ac.destination); po.start(); po.stop(ac.currentTime + 0.05); } } catch(e) {} if (window._alloHaptic && gdist < 80) window._alloHaptic('echo'); } }
              });
            }
            if (goalCheckTimer2d % 30 === 0 && !d.goalFoundThisRun) {
              map.objects.forEach(function(o) {
                if (!o.isGoal) return;
                var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gd < o.r + 12) {
                  var isAudioOnly2d = (currentViewMode2d === 'audio');
                  var updateObj2d = { goalFoundThisRun: true, goalsFound: goalsFound + 1, blindWins: isAudioOnly2d ? blindWins + 1 : blindWins };
                  if (diffId === 'master') { updateObj2d.batMasterWin = true; }
                  if (envType === 'school') { updateObj2d.schoolWin = true; }
                  var baseXP2 = isAudioOnly2d ? 30 : (currentViewMode2d === 'echo' ? 20 : 10);
                  var bumpPenalty2 = Math.min(baseXP2 - 5, d.bumps || 0);
                  var finalXP2 = Math.max(5, Math.round((baseXP2 - bumpPenalty2) * diff.xpMult));
                  var modeLabel2 = currentViewMode2d === 'audio' ? 'Audio-only' : currentViewMode2d === 'echo' ? 'Echo Vision' : 'Map revealed';
                  var runTime2 = Math.floor((Date.now() - runStartRef.current) / 1000);
                  var runHistory2 = (d.runHistory || []).slice();
                  runHistory2.push({ env: envType, mode: modeLabel2, difficulty: diff.label, time: runTime2, clicks: d.clicks || 0, bumps: d.bumps || 0, xp: finalXP2 });
                  if (runHistory2.length > 20) runHistory2.shift();
                  updateObj2d.runHistory = runHistory2;
                  updMulti(updateObj2d);
                  var feedbackMsg2 = '';
                  var avgBumpsPerClick2 = (d.bumps || 0) / Math.max(1, d.clicks || 1);
                  if ((d.bumps || 0) === 0) feedbackMsg2 = 'Perfect navigation! Zero wall bumps.';
                  else if (avgBumpsPerClick2 > 0.5) feedbackMsg2 = 'Tip: You\'re bumping into walls frequently. Try clicking more often before moving to build your echo map.';
                  else if (avgBumpsPerClick2 > 0.2) feedbackMsg2 = 'Good awareness, but some bumps. Slow down near surfaces and use multiple clicks to triangulate.';
                  else feedbackMsg2 = 'Strong performance! You\'re reading echoes well.';
                  if (runTime2 > 120) feedbackMsg2 += ' Try to find the goal faster next time \u2014 click efficiency helps.';
                  if ((d.clicks || 0) < 5) feedbackMsg2 += ' You barely used sonar! Click more to build a richer echo map.';
                  if (addToast) addToast('\uD83C\uDFC6 ' + finalXP2 + ' XP! ' + feedbackMsg2, 'success');
                  if (window._alloHaptic) window._alloHaptic('achieve');
                  if (awardXP) awardXP('echoTrainer', finalXP2, modeLabel2 + ': ' + (d.bumps || 0) + ' bumps');
                  if (announceToSR) announceToSR('Goal found! ' + finalXP2 + ' XP earned. ' + (d.bumps || 0) + ' wall bumps. ' + modeLabel2 + ' mode.');
                }
              });
            }
          }
        }
        loop2d();
        return function() { running = false; };
      }, [seed, envType, has3D, viewMode, diffId]);

      function cycleViewMode() {
        var modes = ['echo', 'audio', 'reveal']; var idx = modes.indexOf(d.viewMode || 'echo'); var next = modes[(idx + 1) % modes.length];
        if (next === 'reveal') { upd('hasRevealed', true); }
        upd('viewMode', next);
        var labels = { echo: 'Echo Vision \u2014 sonar pulses illuminate surfaces', audio: 'Audio Only \u2014 pure darkness, hardest mode', reveal: 'Reveal \u2014 full visibility (debug/teacher mode)' };
        if (announceToSR) announceToSR('View mode: ' + labels[next]);
      }

      var agentCounts = []; var agts = agentsRef.current;
      var pedCount = 0, carCount = 0, batCount = 0, deerCount = 0, birdCount = 0, joggerCount = 0, cyclistCount = 0;
      for (var aci2 = 0; aci2 < agts.length; aci2++) {
        if (agts[aci2].kind === 'pedestrian') pedCount++; else if (agts[aci2].kind === 'car') carCount++; else if (agts[aci2].kind === 'bat') batCount++;
        else if (agts[aci2].kind === 'deer') deerCount++; else if (agts[aci2].kind === 'bird') birdCount++; else if (agts[aci2].kind === 'jogger') joggerCount++; else if (agts[aci2].kind === 'cyclist') cyclistCount++;
      }
      if (pedCount > 0) agentCounts.push(pedCount + ' pedestrian' + (pedCount > 1 ? 's' : ''));
      if (carCount > 0) agentCounts.push(carCount + ' car' + (carCount > 1 ? 's' : ''));
      if (batCount > 0) agentCounts.push(batCount + ' bat' + (batCount > 1 ? 's' : ''));
      if (deerCount > 0) agentCounts.push(deerCount + ' deer');
      if (birdCount > 0) agentCounts.push(birdCount + ' bird' + (birdCount > 1 ? 's' : ''));
      if (joggerCount > 0) agentCounts.push(joggerCount + ' jogger' + (joggerCount > 1 ? 's' : ''));
      if (cyclistCount > 0) agentCounts.push(cyclistCount + ' cyclist' + (cyclistCount > 1 ? 's' : ''));

      var elapsed = Math.floor((Date.now() - runStartRef.current) / 1000);
      var timeStr = Math.floor(elapsed / 60) + ':' + ('0' + (elapsed % 60)).slice(-2);
      var cpm = Math.round((d.clicks || 0) / Math.max(1, elapsed / 60));

      var viewModeLabel = (d.viewMode || 'echo') === 'echo' ? '\uD83C\uDF0A Echo' : (d.viewMode || 'echo') === 'audio' ? '\uD83C\uDFA7 Audio' : '\uD83D\uDC41 Reveal';
      var viewModeColor = (d.viewMode || 'echo') === 'echo' ? '#3b82f6' : (d.viewMode || 'echo') === 'audio' ? '#7c3aed' : '#ef4444';

      // ── Coverage percentage calculation ──
      var coveredCells = 0, totalCells = 0;
      if (coverageRef.current) {
        var cg = coverageRef.current.grid;
        for (var cx2 = 0; cx2 < 40; cx2++) { for (var cy2 = 0; cy2 < 40; cy2++) { totalCells++; if (cg[cx2][cy2] > 0.2) coveredCells++; } }
      }
      var coveragePct = totalCells > 0 ? Math.round(coveredCells / totalCells * 100) : 0;

      // ── Material quiz hint map ──
      var matHints = { concrete: 'Bright echo', rock: 'Dull, heavy', wood: 'Muffled, warm', metal: 'Sharp ring', glass: 'Faint, high' };

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('button', { onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab', style: { background: isDark ? '#1e293b' : '#f1f5f9', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), borderRadius: '8px', padding: '6px 12px', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' } }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' STEM Lab'),
          h('div', { style: { fontSize: '18px', fontWeight: 900, color: isDark ? '#e2e8f0' : '#1e293b' } }, '\uD83C\uDFA7 Echo Navigator'),
          has3D ? h('span', { style: { fontSize: '10px', fontWeight: 800, color: '#3b82f6', background: isDark ? '#1e3a5f' : '#eff6ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #3b82f680' } }, '3D') : null,
          h('div', { style: { fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', marginLeft: '8px' } }, 'Navigate by sound alone')
        ),
        !d.disclaimerDismissed && h('div', { role: 'alert', style: { background: isDark ? '#1c1917' : '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', padding: '14px 16px', marginBottom: '4px' } },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px' } },
            h('span', { style: { fontSize: '20px', lineHeight: 1 } }, '\u26A0\uFE0F'),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '4px' } }, 'Important Safety Notice'),
              h('p', { style: { fontSize: '11px', color: isDark ? '#d6d3d1' : '#78350f', lineHeight: 1.5, margin: 0 } }, 'This simulation is an educational tool for learning about echolocation and spatial audio. It does NOT replace training with a qualified Orientation & Mobility (O&M) specialist. '),
              h('p', { style: { fontSize: '11px', color: isDark ? '#d6d3d1' : '#78350f', lineHeight: 1.5, margin: '6px 0 0 0' } }, 'Do not attempt to navigate real-world environments using echolocation skills developed in this simulation. Virtual environments are simplified and do not include the complexity, hazards, or unpredictability of real spaces. Success here does not indicate readiness for real-world navigation.'),
              h('p', { style: { fontSize: '10px', color: isDark ? '#a8a29e' : '#92400e', lineHeight: 1.4, margin: '8px 0 0 0', fontStyle: 'italic' } }, 'Research: Thaler et al. (2011, 2021) demonstrated that both blind and sighted individuals can develop echolocation skills through training. This tool is inspired by the work of Daniel Kish and World Access for the Blind.')
            ),
            h('button', { onClick: function() { upd('disclaimerDismissed', true); }, 'aria-label': 'Acknowledge safety disclaimer', style: { padding: '6px 14px', borderRadius: '6px', background: '#f59e0b', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' } }, 'I Understand')
          )
        ),
        h('details', { style: { fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8', marginBottom: '4px' } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700, fontSize: '11px' } }, '\uD83E\uDDE0 Who Is This For? (Research Background)'),
          h('div', { style: { padding: '10px', lineHeight: 1.7, background: isDark ? '#0f172a' : '#f8fafc', borderRadius: '8px', marginTop: '4px' } },
            h('p', { style: { margin: '0 0 6px 0' } }, h('strong', null, 'Students with visual impairments: '), 'Practice spatial awareness and echo interpretation in a safe, controlled environment before real-world training with an O&M instructor.'),
            h('p', { style: { margin: '0 0 6px 0' } }, h('strong', null, 'All students: '), 'Research shows sighted people CAN learn echolocation (Thaler et al., 2021 \u2014 Durham University). Participants improved significantly over 10 weeks. Children learn faster than adults, making K-12 the ideal time.'),
            h('p', { style: { margin: '0 0 6px 0' } }, h('strong', null, 'Accessibility awareness: '), 'Experience what it\u2019s like to navigate without sight. Builds empathy and understanding of sensory diversity.'),
            h('p', { style: { margin: '0 0 6px 0' } }, h('strong', null, 'STEM learning: '), 'Teaches acoustics (speed of sound, reflection coefficients, material absorption), spatial reasoning, and the physics of echolocation used by bats and dolphins.'),
            h('p', { style: { margin: 0, fontStyle: 'italic' } }, '\uD83D\uDC1D Daniel Kish, who is blind, navigates by bicycle using tongue clicks. He has taught echolocation to thousands of people worldwide through World Access for the Blind.')
          )
        ),
        h('details', { open: !(d.goalsFound > 0), style: { marginBottom: '8px', borderRadius: '12px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), overflow: 'hidden' } },
          h('summary', { style: { padding: '10px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' } }, '\uD83D\uDCDA How Echolocation Works'),
          h('div', { style: { padding: '12px 14px', background: isDark ? '#0f172a' : '#fff' } },
            h('svg', { viewBox: '0 0 500 160', width: '100%', height: 'auto', style: { maxHeight: '140px' }, 'aria-label': 'Diagram showing how echolocation works: a click travels to a wall, bounces back, and the time delay tells you the distance' },
              h('rect', { x: 0, y: 0, width: 500, height: 160, fill: isDark ? '#0f172a' : '#f8fafc', rx: 8 }),
              h('circle', { cx: 60, cy: 80, r: 18, fill: '#6366f1', opacity: 0.9 }),
              h('text', { x: 60, y: 85, textAnchor: 'middle', fontSize: '16', fill: '#fff' }, '\uD83C\uDFA7'),
              h('text', { x: 60, y: 115, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'You'),
              h('rect', { x: 410, y: 20, width: 12, height: 120, fill: '#475569', rx: 3 }),
              h('text', { x: 416, y: 155, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'Wall'),
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 }, h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', repeatCount: 'indefinite' }), h('animate', { attributeName: 'opacity', from: '0.7', to: '0', dur: '2s', repeatCount: 'indefinite' })),
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5, opacity: 0.5 }, h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' }), h('animate', { attributeName: 'opacity', from: '0.5', to: '0', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' })),
              h('circle', { cx: 410, cy: 70, r: 0, fill: 'none', stroke: '#22c55e', strokeWidth: 2, opacity: 0 }, h('animate', { attributeName: 'r', from: '0', to: '180', dur: '2s', begin: '1s', repeatCount: 'indefinite' }), h('animate', { attributeName: 'opacity', values: '0;0.6;0', dur: '2s', begin: '1s', repeatCount: 'indefinite' })),
              h('line', { x1: 90, y1: 68, x2: 200, y2: 68, stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowOut)' }),
              h('text', { x: 145, y: 62, textAnchor: 'middle', fontSize: '8', fill: '#a78bfa', fontWeight: 600 }, 'Click \u2192'),
              h('line', { x1: 390, y1: 92, x2: 280, y2: 92, stroke: '#4ade80', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowBack)' }),
              h('text', { x: 335, y: 106, textAnchor: 'middle', fontSize: '8', fill: '#4ade80', fontWeight: 600 }, '\u2190 Echo'),
              h('rect', { x: 190, y: 125, width: 120, height: 24, rx: 6, fill: isDark ? '#1e293b' : '#f0f9ff', stroke: isDark ? '#334155' : '#bae6fd' }),
              h('text', { x: 250, y: 141, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#7dd3fc' : '#0369a1', fontWeight: 700 }, 'Delay = Distance \u00d7 2 \u00f7 343 m/s'),
              h('defs', null, h('marker', { id: 'arrowOut', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#a78bfa' })), h('marker', { id: 'arrowBack', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#4ade80' })))
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px', fontSize: '10px' } },
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#f5f3ff', border: '1px solid ' + (isDark ? '#334155' : '#e9d5ff'), textAlign: 'center' } }, h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83D\uDD0A'), h('div', { style: { fontWeight: 700, color: '#7c3aed' } }, 'Click'), h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Press Space to emit a tongue click sound')),
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#ecfdf5', border: '1px solid ' + (isDark ? '#334155' : '#bbf7d0'), textAlign: 'center' } }, h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83C\uDFA7'), h('div', { style: { fontWeight: 700, color: '#22c55e' } }, 'Listen'), h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Echoes return from different directions via headphones')),
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#eff6ff', border: '1px solid ' + (isDark ? '#334155' : '#bfdbfe'), textAlign: 'center' } }, h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83E\uDDE0'), h('div', { style: { fontWeight: 700, color: '#3b82f6' } }, 'Navigate'), h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Build a mental map from echo timing + direction'))
            ),
            h('div', { style: { marginTop: '10px', padding: '10px', borderRadius: '8px', background: isDark ? '#1e293b' : '#f0f9ff', border: '1px solid ' + (isDark ? '#334155' : '#bae6fd') } },
              h('div', { style: { fontWeight: 800, fontSize: '11px', color: '#0369a1', marginBottom: '4px' } }, '\uD83C\uDFA7 Why Headphones Are Essential'),
              h('p', { style: { fontSize: '10px', lineHeight: 1.5, margin: '0 0 6px 0', color: isDark ? '#94a3b8' : '#475569' } }, 'This tool uses HRTF (Head-Related Transfer Function) \u2014 the same technique your brain uses to locate sounds in 3D space. Each echo is processed through a virtual model of how sound reaches your left and right ears differently based on direction.'),
              h('p', { style: { fontSize: '10px', lineHeight: 1.5, margin: '0 0 6px 0', color: isDark ? '#94a3b8' : '#475569' } }, 'A wall to your LEFT will return an echo that arrives at your left ear a fraction of a millisecond sooner and slightly louder. Your brain detects this automatically \u2014 if you\'re wearing headphones. Speakers cannot reproduce this effect.'),
              h('p', { style: { fontSize: '10px', lineHeight: 1.5, margin: 0, color: isDark ? '#94a3b8' : '#475569' } }, 'In 3D mode, you also perceive HEIGHT differences. A bat flying overhead sounds different from a car at ground level. The 3D scene positions every echo and every moving entity\'s sound in true 3D space around your head.')
            ),
            h('div', { style: { marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } },
              [{ name: 'Rock', color: '#64748b', desc: 'Bright echo', ref: '85%' }, { name: 'Metal', color: '#94a3b8', desc: 'Sharp ring', ref: '95%' }, { name: 'Wood', color: '#92400e', desc: 'Muffled', ref: '50%' }, { name: 'Glass', color: '#7dd3fc', desc: 'Faint', ref: '30%' }, { name: 'Goal \u2B50', color: '#fbbf24', desc: 'Bright!', ref: '90%' }].map(function(mat) {
                return h('div', { key: mat.name, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#f8fafc', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), fontSize: '9px' } }, h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: mat.color } }), h('span', { style: { fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' } }, mat.name), h('span', { style: { color: isDark ? '#64748b' : '#94a3b8' } }, mat.desc));
              })
            )
          )
        ),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          ENVIRONMENTS.map(function(env) {
            var active = envType === env.id; var is3D = !!ENV_3D_READY[env.id];
            var unlocked = isEnvUnlocked(env.id, d);
            return h('button', { key: env.id,
              disabled: !unlocked,
              'aria-label': unlocked ? (env.name + ': ' + env.desc + (is3D ? ' (3D available)' : '')) : (env.name + ' (Locked: ' + (ENV_UNLOCK[env.id] && ENV_UNLOCK[env.id].label || '') + ')'),
              'aria-pressed': active ? 'true' : 'false',
              title: unlocked ? env.desc : 'Locked: ' + (ENV_UNLOCK[env.id] && ENV_UNLOCK[env.id].label || ''),
              onClick: unlocked ? function() { var envId = env.id; return function() { var newSeed = Math.floor(Math.random() * 999999); updMulti({ envType: envId, seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0, waypointMode: false, waypointIdx: 0, matQuiz: null }); mapRef.current = null; agentsRef.current = []; playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 }; yawRef.current = -Math.PI / 2; pitchRef.current = 0; carHitRef.current = false; goalFoundRef.current = false; coverageRef.current = null; runStartRef.current = Date.now(); if (announceToSR) announceToSR('Environment: ' + env.name + '. ' + env.desc + (is3D ? ' 3D mode.' : ' 2D mode.') + ' Press Space to click.'); }; }() : undefined,
              style: {
                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                cursor: unlocked ? 'pointer' : 'not-allowed',
                opacity: unlocked ? 1 : 0.5,
                border: '1px solid ' + (active ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')),
                background: active ? '#6366f1' : (isDark ? '#1e293b' : '#fff'),
                color: active ? '#fff' : (isDark ? '#94a3b8' : '#475569')
              }
            }, (unlocked ? '' : '\uD83D\uDD12 ') + env.icon + ' ' + env.name + (is3D ? ' [3D]' : '') + (!unlocked ? ' (' + (ENV_UNLOCK[env.id] && ENV_UNLOCK[env.id].label || '') + ')' : ''));
          })
        ),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          h('button', { onClick: emitClick, 'aria-label': 'Emit echolocation click', style: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' } }, '\uD83D\uDD0A Click (Space)'),
          h('button', { onClick: function() { upd('clickType', clickType === 'tongue' ? 'cane' : 'tongue'); if (announceToSR) announceToSR('Sound: ' + (clickType === 'tongue' ? 'Cane tap' : 'Tongue click')); }, 'aria-label': 'Switch between tongue click and cane tap sounds', style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, clickType === 'tongue' ? '\uD83D\uDC45 Tongue Click' : '\uD83E\uDDAF Cane Tap'),
          h('button', { onClick: cycleViewMode, 'aria-label': 'Cycle view mode: currently ' + (d.viewMode || 'echo'), style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + viewModeColor + '80', background: isDark ? '#1e293b' : '#fff', color: viewModeColor, fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, viewModeLabel),
          h('button', { onClick: function() { upd('multiBounce', !multiBounce); if (announceToSR) announceToSR(multiBounce ? 'Multi-bounce echoes off' : 'Multi-bounce echoes on \u2014 more realistic but harder'); }, 'aria-label': multiBounce ? 'Turn off multi-bounce echoes' : 'Turn on multi-bounce echoes (advanced)', 'aria-pressed': multiBounce ? 'true' : 'false', style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (multiBounce ? '#f59e0b' : (isDark ? '#334155' : '#e2e8f0')), background: multiBounce ? '#78350f' : (isDark ? '#1e293b' : '#fff'), color: multiBounce ? '#fbbf24' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, multiBounce ? '\uD83D\uDD04 Multi-Bounce ON' : '\uD83D\uDD04 Multi-Bounce'),
          h('button', {
            onClick: startDistanceChallenge,
            'aria-label': 'Start a distance estimation challenge',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: '#7c3aed', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, '\uD83D\uDCCF Distance Quiz'),
          h('button', {
            onClick: startMaterialQuiz,
            'aria-label': 'Start a material identification quiz',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, '\uD83E\uDDCA Material Quiz'),
          WAYPOINT_ROUTES[envType] ? h('button', {
            onClick: function() {
              var newMode = !waypointMode;
              updMulti({ waypointMode: newMode, waypointIdx: 0, goalFoundThisRun: false });
              goalFoundRef.current = false;
              if (announceToSR) announceToSR(newMode ? 'Waypoint challenge ON! Navigate to: ' + WAYPOINT_ROUTES[envType].points[0].label : 'Waypoint challenge OFF. Find the single goal.');
            },
            'aria-label': waypointMode ? 'Disable waypoint challenge' : 'Enable waypoint navigation challenge',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (waypointMode ? '#22c55e' : (isDark ? '#334155' : '#e2e8f0')), background: waypointMode ? '#166534' : (isDark ? '#1e293b' : '#fff'), color: waypointMode ? '#86efac' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, waypointMode ? '\uD83D\uDEA9 Waypoint ON (' + (d.waypointIdx || 0) + '/' + WAYPOINT_ROUTES[envType].points.length + ')' : '\uD83D\uDEA9 Waypoint Challenge') : null,
          h('button', { onClick: function() { var newSeed = Math.floor(Math.random() * 999999); updMulti({ seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0, waypointMode: false, waypointIdx: 0, matQuiz: null }); mapRef.current = null; agentsRef.current = []; playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 }; yawRef.current = -Math.PI / 2; pitchRef.current = 0; carHitRef.current = false; goalFoundRef.current = false; coverageRef.current = null; runStartRef.current = Date.now(); if (announceToSR) announceToSR('New ' + envType + ' environment generated.'); }, 'aria-label': 'Generate new random layout', style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, '\uD83C\uDFB2 New Layout'),
          d.goalFoundThisRun && h('span', { style: { padding: '8px 16px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 800 } }, '\uD83C\uDFC6 Goal Found!' + ((d.viewMode || 'echo') === 'audio' ? ' (Blind! \uD83C\uDFA7)' : ''))
        ),
        // ── Waypoint HUD info ──
        (waypointMode && WAYPOINT_ROUTES[envType]) ? h('div', {
          'aria-live': 'polite',
          style: { padding: '8px 14px', borderRadius: '8px', background: isDark ? '#052e16' : '#f0fdf4', border: '1px solid #22c55e', fontSize: '12px', color: isDark ? '#86efac' : '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }
        },
          '\uD83D\uDEA9 ' + WAYPOINT_ROUTES[envType].name + ' \u2014 Waypoint ' + Math.min((d.waypointIdx || 0) + 1, WAYPOINT_ROUTES[envType].points.length) + '/' + WAYPOINT_ROUTES[envType].points.length + ': ' + ((d.waypointIdx || 0) < WAYPOINT_ROUTES[envType].points.length ? WAYPOINT_ROUTES[envType].points[d.waypointIdx || 0].label : 'Complete!')
        ) : null,
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
          h('span', { style: { fontSize: '11px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' } }, 'Difficulty:'),
          DIFFICULTY.map(function(dLvl) {
            var isActive = diffId === dLvl.id;
            return h('button', { key: dLvl.id, 'aria-label': dLvl.label + ': ' + dLvl.desc, 'aria-pressed': isActive ? 'true' : 'false', onClick: function() { upd('difficulty', dLvl.id); if (announceToSR) announceToSR('Difficulty: ' + dLvl.label + '. ' + dLvl.desc); }, style: { padding: '5px 12px', borderRadius: '8px', border: '1px solid ' + (isActive ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')), background: isActive ? '#6366f1' : (isDark ? '#1e293b' : '#fff'), color: isActive ? '#fff' : (isDark ? '#94a3b8' : '#475569'), fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, dLvl.icon + ' ' + dLvl.label);
          })
        ),
        h('details', { style: { fontSize: '11px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), overflow: 'hidden' } },
          h('summary', { style: { padding: '8px 12px', cursor: 'pointer', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', background: isDark ? '#1e293b' : '#f8fafc' } }, '\uD83D\uDCCA Performance Stats (' + (d.runHistory || []).length + ' runs) | ' + coveragePct + '% mapped | Mat Quiz: ' + (d.matQuizCorrect || 0) + '/' + (d.matQuizTotal || 0)),
          h('div', { style: { padding: '10px', background: isDark ? '#0f172a' : '#fff' } },
            (d.runHistory && d.runHistory.length > 0) ?
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' } },
                h('div', { style: { padding: '8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#f5f3ff', textAlign: 'center' } }, h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#6366f1' } }, (d.runHistory || []).length), h('div', { style: { fontSize: '9px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Total Runs')),
                h('div', { style: { padding: '8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#ecfdf5', textAlign: 'center' } }, h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#22c55e' } }, (d.runHistory || []).reduce(function(sum, r) { return sum + r.xp; }, 0)), h('div', { style: { fontSize: '9px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Total XP')),
                h('div', { style: { padding: '8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#eff6ff', textAlign: 'center' } }, h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#3b82f6' } }, Math.min.apply(null, (d.runHistory || [{ time: 0 }]).map(function(r) { return r.time; })) + 's'), h('div', { style: { fontSize: '9px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Best Time')),
                h('div', { style: { padding: '8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#fef3c7', textAlign: 'center' } }, h('div', { style: { fontSize: '18px', fontWeight: 900, color: '#f59e0b' } }, Math.min.apply(null, (d.runHistory || [{ bumps: 0 }]).map(function(r) { return r.bumps; }))), h('div', { style: { fontSize: '9px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Fewest Bumps'))
              ) : h('p', { style: { color: isDark ? '#64748b' : '#94a3b8', fontStyle: 'italic' } }, 'Complete a run to see your stats here.'),
            (d.runHistory && d.runHistory.length > 0) ?
              h('table', { style: { width: '100%', fontSize: '10px', borderCollapse: 'collapse' } },
                h('thead', null, h('tr', { style: { borderBottom: '1px solid ' + (isDark ? '#334155' : '#e2e8f0') } },
                  h('th', { style: { textAlign: 'left', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Env'),
                  h('th', { style: { textAlign: 'left', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Mode'),
                  h('th', { style: { textAlign: 'right', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Time'),
                  h('th', { style: { textAlign: 'right', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Clicks'),
                  h('th', { style: { textAlign: 'right', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'Bumps'),
                  h('th', { style: { textAlign: 'right', padding: '4px', color: isDark ? '#64748b' : '#94a3b8' } }, 'XP')
                )),
                h('tbody', null, (d.runHistory || []).slice().reverse().map(function(run, idx) {
                  return h('tr', { key: idx, style: { borderBottom: '1px solid ' + (isDark ? '#1e293b' : '#f1f5f9') } },
                    h('td', { style: { padding: '3px 4px', color: isDark ? '#e2e8f0' : '#1e293b' } }, run.env),
                    h('td', { style: { padding: '3px 4px', color: isDark ? '#94a3b8' : '#475569' } }, run.mode),
                    h('td', { style: { padding: '3px 4px', textAlign: 'right', color: isDark ? '#e2e8f0' : '#1e293b' } }, run.time + 's'),
                    h('td', { style: { padding: '3px 4px', textAlign: 'right', color: isDark ? '#e2e8f0' : '#1e293b' } }, run.clicks),
                    h('td', { style: { padding: '3px 4px', textAlign: 'right', color: run.bumps === 0 ? '#22c55e' : (isDark ? '#e2e8f0' : '#1e293b') } }, run.bumps),
                    h('td', { style: { padding: '3px 4px', textAlign: 'right', fontWeight: 700, color: '#6366f1' } }, run.xp)
                  );
                }))
              ) : null
          )
        ),
        (envType === 'simple_room' && tutStep < 4) ? h('div', { role: 'dialog', 'aria-label': 'Tutorial step ' + (tutStep + 1) + ' of 4', style: { background: isDark ? '#0f172a' : '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '16px', position: 'relative', zIndex: 10 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#3b82f6' } }, 'Tutorial ' + (tutStep + 1) + '/4'), h('span', { style: { fontSize: '12px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' } }, TUTORIAL_STEPS[tutStep].title)),
          h('p', { style: { fontSize: '12px', color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.6, margin: '0 0 10px 0' } }, TUTORIAL_STEPS[tutStep].text),
          h('button', { onClick: function() { var next = tutStep + 1; upd('tutStep', next); if (next >= 4 && announceToSR) announceToSR('Tutorial complete! You are ready to explore on your own.'); }, 'aria-label': tutStep < 3 ? 'Next tutorial step' : 'Complete tutorial', style: { padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } }, tutStep < 3 ? 'Next \u2192' : 'Got It!')
        ) : null,
        // Distance challenge UI
        (d.distChallenge && d.distChallenge.active && !d.distChallenge.result) ? h('div', {
          role: 'dialog', 'aria-label': 'Distance estimation challenge',
          style: { padding: '14px', borderRadius: '12px', border: '2px solid #7c3aed', background: isDark ? '#1e1033' : '#faf5ff', marginBottom: '8px' }
        },
          h('div', { style: { fontWeight: 800, fontSize: '13px', color: '#7c3aed', marginBottom: '6px' } }, '\uD83D\uDCCF Distance Challenge'),
          h('p', { style: { fontSize: '12px', color: isDark ? '#e2e8f0' : '#1e293b', margin: '0 0 10px 0' } },
            'You just sent a sonar pulse. How far is the ' + (d.distChallenge.targetMat || 'wall') + ' surface directly ahead of you?'),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            [0.5, 1, 2, 3, 5, 8, 12, 20].map(function(est) {
              return h('button', {
                key: est,
                onClick: function() {
                  var actual = d.distChallenge.targetDist;
                  var error = Math.abs(est - actual);
                  var pct = Math.round((error / actual) * 100);
                  var grade = pct < 15 ? 'Excellent!' : pct < 30 ? 'Good!' : pct < 50 ? 'Fair' : 'Keep practicing';
                  var resultStr = grade + ' Actual: ' + actual + 'm. Your guess: ' + est + 'm (' + pct + '% off).';
                  upd('distChallenge', { active: true, targetDist: actual, targetMat: d.distChallenge.targetMat, answer: est, result: resultStr });
                  if (announceToSR) announceToSR(resultStr);
                  if (pct < 15 && awardXP) awardXP('echoTrainer', 5, 'Distance estimation: ' + pct + '% error');
                },
                style: { padding: '8px 14px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
              }, est + 'm');
            })
          )
        ) : null,
        // Distance challenge result display
        (d.distChallenge && d.distChallenge.result) ? h('div', {
          style: { padding: '10px 14px', borderRadius: '8px', background: isDark ? '#1e293b' : '#f0fdf4', border: '1px solid ' + (isDark ? '#334155' : '#bbf7d0'), marginBottom: '8px', fontSize: '12px', color: isDark ? '#e2e8f0' : '#1e293b' }
        },
          h('span', { style: { fontWeight: 800, color: '#22c55e' } }, '\uD83C\uDFAF '),
          d.distChallenge.result,
          ' ',
          h('button', {
            onClick: function() { upd('distChallenge', null); },
            style: { marginLeft: '8px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
          }, 'Dismiss')
        ) : null,
        // ── Material Quiz UI ──
        (matQuiz && matQuiz.active && !matQuiz.result) ? h('div', {
          role: 'dialog', 'aria-label': 'Material identification quiz',
          style: { padding: '14px', borderRadius: '12px', border: '2px solid #f59e0b', background: isDark ? '#1c1917' : '#fffbeb', marginBottom: '8px' }
        },
          h('div', { style: { fontWeight: 800, fontSize: '13px', color: '#f59e0b', marginBottom: '6px' } }, '\uD83E\uDDCA Material Quiz'),
          h('p', { style: { fontSize: '12px', color: isDark ? '#e2e8f0' : '#1e293b', margin: '0 0 10px 0' } },
            'Listen to the echo ahead. What material did you just hear?'),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            (matQuiz.options || []).map(function(opt) {
              var hint = matHints[opt] || '';
              return h('button', {
                key: opt,
                onClick: function() {
                  var correct = opt === matQuiz.correctMat;
                  var newTotal = (d.matQuizTotal || 0) + 1;
                  var newCorrect = (d.matQuizCorrect || 0) + (correct ? 1 : 0);
                  var explanation = correct ? 'Correct! ' + opt + ' has a ' + (matHints[opt] || '') + ' sound signature.' : 'Not quite. The material was ' + matQuiz.correctMat + ' (' + (matHints[matQuiz.correctMat] || '') + '). You guessed ' + opt + '.';
                  var resultObj = { active: true, correctMat: matQuiz.correctMat, options: matQuiz.options, answer: opt, result: explanation };
                  updMulti({ matQuiz: resultObj, matQuizTotal: newTotal, matQuizCorrect: newCorrect });
                  if (announceToSR) announceToSR(explanation);
                  if (correct && awardXP) awardXP('echoTrainer', 5, 'Material quiz: identified ' + opt);
                },
                style: { padding: '10px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', minWidth: '100px' }
              }, h('div', { style: { fontWeight: 800, fontSize: '13px' } }, opt.charAt(0).toUpperCase() + opt.slice(1)), h('div', { style: { fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' } }, hint));
            })
          )
        ) : null,
        // Material Quiz result display
        (matQuiz && matQuiz.result) ? h('div', {
          style: { padding: '10px 14px', borderRadius: '8px', background: (matQuiz.answer === matQuiz.correctMat) ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#450a0a' : '#fef2f2'), border: '1px solid ' + ((matQuiz.answer === matQuiz.correctMat) ? '#22c55e' : '#ef4444'), marginBottom: '8px', fontSize: '12px', color: isDark ? '#e2e8f0' : '#1e293b' }
        },
          h('span', { style: { fontWeight: 800, color: (matQuiz.answer === matQuiz.correctMat) ? '#22c55e' : '#ef4444' } }, (matQuiz.answer === matQuiz.correctMat) ? '\u2705 ' : '\u274C '),
          matQuiz.result,
          ' ',
          h('button', {
            onClick: function() { upd('matQuiz', null); },
            style: { marginLeft: '8px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
          }, 'Dismiss')
        ) : null,
        has3D ? h('div', { style: { position: 'relative', width: '100%', flex: 1, minHeight: '400px', borderRadius: '12px', overflow: 'hidden', background: '#000' } },
          h('div', { ref: mountRef, role: 'application', 'aria-label': 'Echo navigation 3D viewport. Click to lock mouse, then click to emit sonar. WASD to move, mouse to look, Q/E to strafe. Shift to sprint, C to crouch.', tabIndex: 0, style: { width: '100%', height: '100%', minHeight: '400px', outline: 'none', cursor: 'crosshair' } }),
          h('canvas', { ref: canvasRef, 'aria-hidden': 'true', style: { position: 'absolute', bottom: '10px', right: '10px', width: '200px', height: '200px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.4)', opacity: 0.9, pointerEvents: 'none', zIndex: 5 } }),
          h('div', { style: { position: 'absolute', bottom: '14px', right: '194px', fontSize: '10px', fontWeight: 700, color: '#6366f1', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', zIndex: 10, pointerEvents: 'none' } }, coveragePct + '% mapped'),
          h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 12px', background: 'rgba(0,0,0,0.5)', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, zIndex: 5, pointerEvents: 'none' } },
            'Echo Navigator 3D  |  ' + viewModeLabel + '  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + (d.bumps || 0) + '  |  Goals: ' + goalsFound + '  |  ' + envType + '  |  ' + diff.icon + ' ' + diff.label + '  |  Time: ' + timeStr + '  |  ' + cpm + ' clicks/min' + (waypointMode && WAYPOINT_ROUTES[envType] ? '  |  WP ' + Math.min((d.waypointIdx || 0) + 1, WAYPOINT_ROUTES[envType].points.length) + '/' + WAYPOINT_ROUTES[envType].points.length : '') + (pointerLockedRef.current ? '' : '  |  Click to lock mouse')
          ),
          h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', zIndex: 5, pointerEvents: 'none' } },
            h('div', { style: { position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(163,190,252,0.4)', transform: 'translateY(-1px)' } }),
            h('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(163,190,252,0.4)', transform: 'translateX(-1px)' } })
          )
        ) : null,
        !has3D ? h('canvas', { ref: canvasRef, role: 'application', 'aria-label': 'Echo navigation area. WASD to move, arrows to turn, Space to click. ' + ((d.viewMode || 'echo') === 'reveal' ? 'Map visible.' : 'Audio sonar mode \u2014 listen for echoes.'), tabIndex: 0, style: { width: '100%', flex: 1, minHeight: '350px', borderRadius: '12px', background: '#080810', display: 'block', cursor: 'crosshair', outline: 'none' }, onKeyDown: function(e) { if (e.code === 'Space') { e.preventDefault(); emitClick(); } keysRef.current[e.code] = true; }, onKeyUp: function(e) { keysRef.current[e.code] = false; } }) : null,
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: isDark ? '#475569' : '#94a3b8' } },
          has3D ? h('span', null, '\uD83D\uDDB1 Click to lock mouse, click again to sonar') : null,
          h('span', null, '\uD83C\uDFAE WASD: Move' + (has3D ? ', Q/E: Strafe' : '/Arrows: Turn')),
          h('span', null, 'Space: Click'), h('span', null, '\uD83C\uDFA7 Headphones required'), h('span', null, '\u2B50 Find the goal using echoes'),
          h('span', null, 'Shift: Sprint | C: Crouch'),
          agentCounts.length > 0 ? h('span', { style: { color: '#f59e0b' } }, '\uD83D\uDEB6 ' + agentCounts.join(', ')) : null,
          h('span', { style: { color: '#6366f1' } }, 'HRTF spatial audio \u2022 ' + (d.clicks || 0) + ' clicks \u2022 Seed: ' + seed)
        ),
        h('details', { style: { fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, '\uD83D\uDCD6 How Materials Sound'),
          h('div', { style: { padding: '8px', lineHeight: 1.8 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' } },
              h('span', { style: { fontWeight: 700 } }, 'Concrete/Rock:'), h('span', null, 'Bright echo (reflects ~90% of sound energy)'),
              h('span', { style: { fontWeight: 700 } }, 'Metal:'), h('span', null, 'Sharp, ringing echo (reflects ~95% \u2014 highest reflectivity)'),
              h('span', { style: { fontWeight: 700 } }, 'Wood:'), h('span', null, 'Muffled echo (absorbs high frequencies, reflects ~50%)'),
              h('span', { style: { fontWeight: 700 } }, 'Glass:'), h('span', null, 'Faint, high-pitched echo (mostly transparent to sound)'),
              h('span', { style: { fontWeight: 700 } }, 'Fabric/Carpet:'), h('span', null, 'Nearly silent (absorbs most sound \u2014 hard to detect)'),
              h('span', { style: { fontWeight: 700 } }, 'Locker/Shopping Cart (Metal):'), h('span', null, 'Sharp ring, highest reflectivity \u2014 easy to locate'),
              h('span', { style: { fontWeight: 700 } }, 'Trophy Case/Freezer (Glass):'), h('span', null, 'Faint echo \u2014 deceptively quiet, easy to walk into'),
              h('span', { style: { fontWeight: 700, color: '#ff9c9c' } }, 'Pedestrian:'), h('span', null, 'Soft echo, faint glow, triangle-wave tone at 200Hz'),
              h('span', { style: { fontWeight: 700, color: '#ffc47c' } }, 'Car:'), h('span', null, 'Strong echo, sawtooth engine rumble at 55Hz \u2014 AVOID!'),
              h('span', { style: { fontWeight: 700, color: '#c4b5fd' } }, 'Bat:'), h('span', null, 'Faint, ultrasonic chirp at 3200Hz \u2014 tiny targets'),
              h('span', { style: { fontWeight: 700, color: '#a3e635' } }, 'Deer:'), h('span', null, 'Low 80Hz thud \u2014 large, slow-moving body'),
              h('span', { style: { fontWeight: 700, color: '#67e8f9' } }, 'Bird:'), h('span', null, 'High 2400-3200Hz chirp \u2014 tiny, fast-moving'),
              h('span', { style: { fontWeight: 700, color: '#fb923c' } }, 'Jogger:'), h('span', null, 'Rhythmic 180Hz footsteps \u2014 fast, small target'),
              h('span', { style: { fontWeight: 700, color: '#f472b6' } }, 'Cyclist:'), h('span', null, 'Low 90Hz wheel hum \u2014 very fast, watch out!'),
              h('span', { style: { fontWeight: 700, color: '#fbbf24' } }, 'Goal \u2B50:'), h('span', null, 'Distinctive bright echo with a unique tonal quality')
            ),
            h('p', { style: { marginTop: '6px', fontStyle: 'italic', fontSize: '9px' } }, '\uD83E\uDD87 Real bats use frequencies of 20-200 kHz (ultrasonic). Humans echolocate best with tongue clicks at 2-4 kHz. The key cue is the time delay between click and echo \u2014 at 343 m/s, a wall 1.7m away returns an echo in 10ms.'),
            h('p', { style: { marginTop: '4px', fontStyle: 'italic', fontSize: '9px', color: isDark ? '#64748b' : '#94a3b8' } }, '\uD83D\uDC7B Ghost outlines: After sonar pulses hit surfaces, a faint persistent glow remains to help you build a mental map. Higher difficulties reduce or eliminate ghost outlines.')
          )
        ),
        h('div', { style: { fontSize: '9px', color: isDark ? '#475569' : '#94a3b8', textAlign: 'center', padding: '6px 0', borderTop: '1px solid ' + (isDark ? '#1e293b' : '#e2e8f0') } }, '\u26A0\uFE0F This is an educational simulation. Do not rely on simulation experience for real-world navigation. Consult a qualified O&M specialist for echolocation training.')
      );
    }
  });

})();
} // end duplicate guard
