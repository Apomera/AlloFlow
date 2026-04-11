// ═══════════════════════════════════════════
// stem_tool_echotrainer.js — Echo Navigator: Spatial Audio Echolocation Trainer
// First-person navigation using HRTF binaural spatial audio.
// Students emit clicks and listen for echoes off virtual walls/objects
// to build a mental map and navigate to a goal — using only sound.
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

  var SPEED_OF_SOUND = 343; // m/s

  // ── Seeded PRNG for reproducible environments ──
  function seededRng(seed) {
    var s = seed || 1;
    return function() { s = (s * 16807 + 1) % 2147483647; return (s - 1) / 2147483646; };
  }

  // ── Environment presets ──
  var ENVIRONMENTS = [
    { id: 'simple_room', name: 'Simple Room', icon: '🏠', desc: 'A rectangular room with one pillar. Good for beginners.', complexity: 1 },
    { id: 'cave', name: 'Cave System', icon: '🦇', desc: 'Irregular walls, stalactites, and narrow passages.', complexity: 2 },
    { id: 'corridor', name: 'Corridor Maze', icon: '🏛️', desc: 'Hallways and turns — can you find the exit?', complexity: 3 },
    { id: 'forest', name: 'Forest Path', icon: '🌲', desc: 'Trees and rocks in an open space. Materials vary.', complexity: 2 },
    { id: 'urban', name: 'Urban Street', icon: '🏙️', desc: 'Buildings, metal posts, and glass — each reflects differently.', complexity: 3 },
    { id: 'challenge', name: 'Random Challenge', icon: '🎲', desc: 'Procedurally generated. Every attempt is unique.', complexity: 4 },
  ];

  // ── Generate environment from seed + type ──
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
      // One central pillar
      objects.push({ x: 400, y: 350, r: 30, mat: 'concrete', ref: 0.9 });
      // One internal wall
      walls.push({ x1: 300, y1: 200, x2: 500, y2: 200, mat: 'wood', ref: 0.5 });
    } else if (type === 'cave') {
      // Irregular internal walls
      for (var ci = 0; ci < 5; ci++) {
        var cx = 80 + rng() * 640, cy = 80 + rng() * 640;
        var cl = 60 + rng() * 180, ca = rng() * Math.PI;
        walls.push({ x1: cx, y1: cy, x2: cx + Math.cos(ca) * cl, y2: cy + Math.sin(ca) * cl, mat: 'rock', ref: 0.85 });
      }
      // Stalactites (small circular objects)
      for (var si = 0; si < 4; si++) {
        objects.push({ x: 100 + rng() * 600, y: 100 + rng() * 600, r: 10 + rng() * 15, mat: 'rock', ref: 0.85 });
      }
    } else if (type === 'corridor') {
      // Maze-like corridors
      var corridorY = [200, 400, 600];
      corridorY.forEach(function(y) {
        var gapX = 150 + rng() * 500;
        walls.push({ x1: 20, y1: y, x2: gapX - 40, y2: y, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: gapX + 40, y1: y, x2: W - 20, y2: y, mat: 'concrete', ref: 0.92 });
      });
    } else if (type === 'forest') {
      // Trees (large round objects with wood material)
      for (var ti = 0; ti < 8; ti++) {
        objects.push({ x: 80 + rng() * 640, y: 80 + rng() * 640, r: 20 + rng() * 30, mat: 'wood', ref: 0.5 });
      }
      // Rocks
      for (var ri = 0; ri < 3; ri++) {
        objects.push({ x: 100 + rng() * 600, y: 100 + rng() * 600, r: 15 + rng() * 20, mat: 'rock', ref: 0.85 });
      }
    } else if (type === 'urban') {
      // Buildings (large rectangular obstacles via wall pairs)
      for (var bi = 0; bi < 4; bi++) {
        var bx = 100 + rng() * 500, by = 100 + rng() * 500;
        var bw = 60 + rng() * 80, bh = 60 + rng() * 80;
        walls.push({ x1: bx, y1: by, x2: bx + bw, y2: by, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: bx + bw, y1: by, x2: bx + bw, y2: by + bh, mat: rng() > 0.5 ? 'glass' : 'concrete', ref: rng() > 0.5 ? 0.3 : 0.92 });
        walls.push({ x1: bx + bw, y1: by + bh, x2: bx, y2: by + bh, mat: 'concrete', ref: 0.92 });
        walls.push({ x1: bx, y1: by + bh, x2: bx, y2: by, mat: 'concrete', ref: 0.92 });
      }
      // Metal posts
      for (var pi = 0; pi < 3; pi++) {
        objects.push({ x: 80 + rng() * 640, y: 80 + rng() * 640, r: 8, mat: 'metal', ref: 0.95 });
      }
    } else {
      // Random challenge
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

    // Goal (always present)
    var goalX, goalY;
    do { goalX = 80 + rng() * 640; goalY = 80 + rng() * 640; } while (Math.sqrt((goalX - 400) * (goalX - 400) + (goalY - 700) * (goalY - 700)) < 200);
    objects.push({ x: goalX, y: goalY, r: 18, mat: 'goal', ref: 0.9, isGoal: true });

    return { walls: walls, objects: objects, W: W, H: H, seed: seed, type: type };
  }

  // ── Ray-segment intersection ──
  function rayHit(px, py, dx, dy, x1, y1, x2, y2) {
    var sx = x2 - x1, sy = y2 - y1;
    var denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 0.0001) return -1;
    var t = ((x1 - px) * sy - (y1 - py) * sx) / denom;
    var u = ((x1 - px) * dy - (y1 - py) * dx) / denom;
    if (t > 0.5 && u >= 0 && u <= 1) return t;
    return -1;
  }

  // ── Wall collision check ──
  function canMoveTo(nx, ny, map, playerRadius) {
    var pr = playerRadius || 12;
    // Check boundary
    if (nx < 30 + pr || nx > map.W - 30 - pr || ny < 30 + pr || ny > map.H - 30 - pr) return false;
    // Check objects
    for (var i = 0; i < map.objects.length; i++) {
      var o = map.objects[i];
      if (o.isGoal) continue; // Can walk into goal
      var ddx = nx - o.x, ddy = ny - o.y;
      if (Math.sqrt(ddx * ddx + ddy * ddy) < o.r + pr) return false;
    }
    // Check wall proximity (simplified — point-to-segment distance)
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

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════

  window.StemLab.registerTool('echoTrainer', {
    icon: '\uD83C\uDFA7',
    label: 'Echo Navigator',
    desc: 'Navigate virtual spaces using only spatial audio echoes. Emit clicks, listen for reflections, find the goal. Real HRTF binaural audio — wear headphones!',
    color: 'indigo',
    category: 'applied',
    questHooks: [
      { id: 'find_goal_1', label: 'Find the goal in any environment', icon: '\u2B50', check: function(d) { return d.goalsFound >= 1; }, progress: function(d) { return (d.goalsFound || 0) + '/1'; } },
      { id: 'find_goal_5', label: 'Find goals in 5 different environments', icon: '\uD83C\uDFC6', check: function(d) { return d.goalsFound >= 5; }, progress: function(d) { return (d.goalsFound || 0) + '/5'; } },
      { id: 'blind_navigation', label: 'Find a goal without ever revealing the map', icon: '\uD83C\uDFA7', check: function(d) { return d.blindWins >= 1; }, progress: function(d) { return (d.blindWins || 0) >= 1 ? 'Done!' : 'Not yet'; } },
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var d = (ctx.toolData && ctx.toolData['echoTrainer']) || {};
      var upd = function(key, val) { ctx.update('echoTrainer', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('echoTrainer', obj); };
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var awardXP = ctx.awardXP;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var isDark = ctx.isDark;
      var theme = ctx.theme;

      // ── State ──
      var envType = d.envType || 'simple_room';
      var seed = d.seed || 42;
      var reveal = d.reveal || false;
      var goalsFound = d.goalsFound || 0;
      var blindWins = d.blindWins || 0;
      var clicks = d.clicks || 0;
      var hasRevealed = d.hasRevealed || false;
      var bumps = d.bumps || 0;
      var echoVision = d.echoVision || false; // "Toph mode" — sonar pulse visualization
      var multiBounce = d.multiBounce || false; // Advanced: second-order reflections

      // ── Refs ──
      var audioRef = useRef(null);
      var mapRef = useRef(null);
      var playerRef = useRef({ x: 400, y: 700, angle: -Math.PI / 2 });
      var canvasRef = useRef(null);
      var animRef = useRef(null);
      var keysRef = useRef({});
      // Echo Vision: active sonar pulses that expand from player and illuminate surfaces
      var pulsesRef = useRef([]); // [{ x, y, radius, maxRadius, birth, hits: [{x,y,brightness,material}] }]

      // ── Initialize map ──
      if (!mapRef.current || mapRef.current.seed !== seed || mapRef.current.type !== envType) {
        mapRef.current = generateEnvironment(envType, seed);
        playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
      }

      // ── Initialize Web Audio with HRTF ──
      function initAudio() {
        if (audioRef.current) return audioRef.current;
        try {
          var ctx2 = new (window.AudioContext || window.webkitAudioContext)();
          // Create click buffer (tongue-click impulse)
          var len = Math.floor(ctx2.sampleRate * 0.008);
          var buf = ctx2.createBuffer(1, len, ctx2.sampleRate);
          var data = buf.getChannelData(0);
          for (var i = 0; i < len; i++) {
            data[i] = (i < len * 0.3 ? 1 : -1) * Math.exp(-i / (len * 0.12)) * (0.85 + Math.random() * 0.15);
          }
          audioRef.current = { ctx: ctx2, clickBuf: buf };
          return audioRef.current;
        } catch(e) { return null; }
      }

      // ── Emit click with HRTF-spatialized echoes ──
      function emitClick() {
        var audio = initAudio();
        if (!audio) return;
        var ac = audio.ctx;
        if (ac.state === 'suspended') ac.resume();
        var player = playerRef.current;
        var map = mapRef.current;
        if (!map) return;

        updMulti({ clicks: (d.clicks || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('echo');

        // Spawn visual sonar pulse for Echo Vision mode
        if (echoVision) {
          pulsesRef.current.push({ x: player.x, y: player.y, radius: 0, maxRadius: 500, birth: Date.now(), hits: [] });
        }

        // Direct click (centered)
        var directSrc = ac.createBufferSource();
        directSrc.buffer = audio.clickBuf;
        var directGain = ac.createGain();
        directGain.gain.value = 0.25;
        directSrc.connect(directGain);
        directGain.connect(ac.destination);
        directSrc.start();

        // Cast rays (fan of 120° in facing direction)
        var numRays = 32;
        var fan = Math.PI * 0.67;
        var startA = player.angle - fan / 2;
        var stepA = fan / (numRays - 1);

        for (var ri = 0; ri < numRays; ri++) {
          var ra = startA + ri * stepA;
          var rdx = Math.cos(ra), rdy = Math.sin(ra);
          var minDist = Infinity, hitMat = 'rock', hitRef = 0.8;

          // Test walls
          for (var wi = 0; wi < map.walls.length; wi++) {
            var w = map.walls[wi];
            var dist = rayHit(player.x, player.y, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
            if (dist > 0 && dist < minDist) { minDist = dist; hitMat = w.mat; hitRef = w.ref; }
          }
          // Test objects
          for (var oi = 0; oi < map.objects.length; oi++) {
            var obj = map.objects[oi];
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
            var roundTrip = minDist * 2 * 0.1; // px → meters (1px = 0.1m)
            var delaySec = Math.min(0.6, roundTrip / SPEED_OF_SOUND);
            var atten = Math.min(1, 40 / (minDist + 5)) * hitRef;
            var filterHz = hitMat === 'metal' ? 6000 : hitMat === 'glass' ? 7000 : hitMat === 'concrete' ? 4000 : hitMat === 'rock' ? 3500 : hitMat === 'wood' ? 2000 : hitMat === 'goal' ? 5000 : 3000;

            // Echo chain: source → delay → filter → gain → HRTF panner → output
            var echoSrc = ac.createBufferSource();
            echoSrc.buffer = audio.clickBuf;
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

            // Position in player's local frame
            var echoWorldX = Math.cos(ra) * Math.min(minDist * 0.01, 8);
            var echoWorldZ = Math.sin(ra) * Math.min(minDist * 0.01, 8);
            var cosA = Math.cos(-player.angle), sinA = Math.sin(-player.angle);
            panner.positionX.value = echoWorldX * cosA - echoWorldZ * sinA;
            panner.positionY.value = 0;
            panner.positionZ.value = echoWorldX * sinA + echoWorldZ * cosA;

            echoSrc.connect(delay);
            delay.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(ac.destination);
            echoSrc.start();

            // Multi-bounce: cast a secondary reflected ray from the hit point
            if (multiBounce && minDist < 400) {
              // Approximate reflection: reverse the ray direction component perpendicular to the surface
              // Simplified: just scatter 3 secondary rays around the reflected direction
              for (var bri = 0; bri < 3; bri++) {
                var bounceAngle = ra + Math.PI + (bri - 1) * 0.3; // Reflected + spread
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
                  var bSrc = ac.createBufferSource(); bSrc.buffer = audio.clickBuf;
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

      // ── Animation loop ──
      useEffect(function() {
        if (!canvasRef.current) return;
        var canvas = canvasRef.current;
        var gfx = canvas.getContext('2d');
        var running = true;
        var goalCheckTimer = 0;

        function loop() {
          if (!running) return;
          animRef.current = requestAnimationFrame(loop);

          var W = canvas.width = canvas.clientWidth || 800;
          var H = canvas.height = canvas.clientHeight || 400;
          var map = mapRef.current;
          var player = playerRef.current;
          var keys = keysRef.current;
          if (!map) return;

          // Movement with wall collision
          var ms = 2.5, ts = 0.045;
          if (keys['ArrowLeft'] || keys['KeyA']) player.angle -= ts;
          if (keys['ArrowRight'] || keys['KeyD']) player.angle += ts;
          var fdx = Math.cos(player.angle) * ms, fdy = Math.sin(player.angle) * ms;
          if (keys['KeyW'] || keys['ArrowUp']) {
            var nx = player.x + fdx, ny = player.y + fdy;
            if (canMoveTo(nx, ny, map)) { player.x = nx; player.y = ny; }
            else if (!player._bumpCooldown) {
              // Bump! Player hit a wall
              player._bumpCooldown = 20; // frames
              updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
              // Bump sound — dull thud
              try { var bac = audioRef.current && audioRef.current.ctx; if (bac) { var bo = bac.createOscillator(); var bg = bac.createGain(); bo.type = 'sine'; bo.frequency.value = 120; bg.gain.setValueAtTime(0.08, bac.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, bac.currentTime + 0.1); bo.connect(bg); bg.connect(bac.destination); bo.start(); bo.stop(bac.currentTime + 0.1); } } catch(e) {}
            }
          }
          if (keys['KeyS'] || keys['ArrowDown']) {
            var nx2 = player.x - fdx, ny2 = player.y - fdy;
            if (canMoveTo(nx2, ny2, map)) { player.x = nx2; player.y = ny2; }
            else if (!player._bumpCooldown) {
              player._bumpCooldown = 20;
              updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
              try { var bac2 = audioRef.current && audioRef.current.ctx; if (bac2) { var bo2 = bac2.createOscillator(); var bg2 = bac2.createGain(); bo2.type = 'sine'; bo2.frequency.value = 120; bg2.gain.setValueAtTime(0.08, bac2.currentTime); bg2.gain.exponentialRampToValueAtTime(0.001, bac2.currentTime + 0.1); bo2.connect(bg2); bg2.connect(bac2.destination); bo2.start(); bo2.stop(bac2.currentTime + 0.1); } } catch(e) {}
            }
          }
          // Bump cooldown decay
          if (player._bumpCooldown > 0) player._bumpCooldown--;

          // Render
          var scale = Math.min(W / map.W, H / map.H);
          var ox = (W - map.W * scale) / 2, oy = (H - map.H * scale) / 2;
          gfx.clearRect(0, 0, W, H);
          gfx.fillStyle = '#080810';
          gfx.fillRect(0, 0, W, H);
          gfx.save();
          gfx.translate(ox, oy);
          gfx.scale(scale, scale);

          // Map (revealed)
          if (reveal) {
            gfx.lineWidth = 3;
            map.walls.forEach(function(w) {
              gfx.strokeStyle = w.mat === 'metal' ? '#94a3b8' : w.mat === 'wood' ? '#a16207' : w.mat === 'glass' ? '#7dd3fc55' : '#475569';
              gfx.beginPath(); gfx.moveTo(w.x1, w.y1); gfx.lineTo(w.x2, w.y2); gfx.stroke();
            });
            map.objects.forEach(function(o) {
              gfx.fillStyle = o.isGoal ? '#fbbf24' : o.mat === 'metal' ? '#94a3b8' : o.mat === 'wood' ? '#92400e' : '#64748b';
              gfx.beginPath(); gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2); gfx.fill();
              if (o.isGoal) { gfx.fillStyle = '#080810'; gfx.font = 'bold 14px sans-serif'; gfx.textAlign = 'center'; gfx.fillText('\u2B50', o.x, o.y + 5); }
            });
          }

          // Player (always visible)
          gfx.fillStyle = '#6366f1';
          gfx.beginPath(); gfx.arc(player.x, player.y, 8, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#a5b4fc'; gfx.lineWidth = 2;
          gfx.beginPath(); gfx.moveTo(player.x, player.y);
          gfx.lineTo(player.x + Math.cos(player.angle) * 22, player.y + Math.sin(player.angle) * 22); gfx.stroke();
          // Field of view arc (subtle)
          gfx.strokeStyle = 'rgba(99,102,241,0.15)'; gfx.lineWidth = 1;
          gfx.beginPath(); gfx.arc(player.x, player.y, 80, player.angle - 0.33 * Math.PI, player.angle + 0.33 * Math.PI); gfx.stroke();

          // ── Echo Vision: "Toph Mode" sonar pulse visualization ──
          // Expanding rings illuminate surfaces as the wavefront reaches them
          if (echoVision && pulsesRef.current.length > 0) {
            var now = Date.now();
            var activePulses = [];
            pulsesRef.current.forEach(function(pulse) {
              var age = (now - pulse.birth) / 1000; // seconds
              var pulseRadius = age * SPEED_OF_SOUND * 0.5; // visual expansion (scaled for display)
              var pulseAlpha = Math.max(0, 1 - age * 1.5); // fade out over ~0.67s
              if (pulseAlpha <= 0) return;
              activePulses.push(pulse);

              // Draw expanding ring
              gfx.strokeStyle = 'rgba(120,180,255,' + (pulseAlpha * 0.2) + ')';
              gfx.lineWidth = 2;
              gfx.beginPath();
              gfx.arc(pulse.x, pulse.y, pulseRadius, 0, Math.PI * 2);
              gfx.stroke();

              // Illuminate walls that the pulse has reached
              map.walls.forEach(function(w) {
                // Find the closest point on the wall to the pulse origin
                var wx = w.x2 - w.x1, wy = w.y2 - w.y1;
                var wl2 = wx * wx + wy * wy;
                if (wl2 < 1) return;
                // Sample 5 points along the wall
                for (var si = 0; si <= 4; si++) {
                  var t2 = si / 4;
                  var px = w.x1 + wx * t2, py = w.y1 + wy * t2;
                  var dx2 = px - pulse.x, dy2 = py - pulse.y;
                  var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                  // Is this point within the pulse wavefront? (±15px band)
                  if (Math.abs(dist - pulseRadius) < 15) {
                    var intensity = pulseAlpha * w.ref * (1 - Math.abs(dist - pulseRadius) / 15);
                    var color = w.mat === 'metal' ? '200,220,255' : w.mat === 'wood' ? '180,140,80' : w.mat === 'glass' ? '150,220,255' : '100,160,220';
                    gfx.fillStyle = 'rgba(' + color + ',' + (intensity * 0.7) + ')';
                    gfx.beginPath();
                    gfx.arc(px, py, 6, 0, Math.PI * 2);
                    gfx.fill();
                  }
                }
              });

              // Illuminate objects
              map.objects.forEach(function(o) {
                var odx = o.x - pulse.x, ody = o.y - pulse.y;
                var odist = Math.sqrt(odx * odx + ody * ody);
                if (Math.abs(odist - pulseRadius) < o.r + 10) {
                  var oIntensity = pulseAlpha * o.ref * (1 - Math.abs(odist - pulseRadius) / (o.r + 10));
                  var oColor = o.isGoal ? '255,220,50' : o.mat === 'metal' ? '200,220,255' : '100,160,220';
                  gfx.fillStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.6) + ')';
                  gfx.beginPath();
                  gfx.arc(o.x, o.y, o.r + 3, 0, Math.PI * 2);
                  gfx.fill();
                  // Bright edge highlight (the "sonar return" glow)
                  gfx.strokeStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.9) + ')';
                  gfx.lineWidth = 2;
                  gfx.beginPath();
                  gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
                  gfx.stroke();
                }
              });
            });
            pulsesRef.current = activePulses;
          }

          // Bump flash (red screen flash when bumping into walls)
          if (player._bumpCooldown > 15) {
            gfx.fillStyle = 'rgba(239,68,68,' + ((player._bumpCooldown - 15) / 5 * 0.15) + ')';
            gfx.fillRect(0, 0, map.W, map.H);
          }

          gfx.restore();

          // HUD
          gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(0, 0, W, 26);
          gfx.font = 'bold 11px monospace'; gfx.fillStyle = '#94a3b8'; gfx.textAlign = 'left';
          gfx.fillText('Echo Navigator  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + bumps + '  |  Goals: ' + goalsFound + '  |  ' + (echoVision ? 'ECHO VISION' : reveal ? 'MAP VISIBLE' : 'AUDIO ONLY \uD83C\uDFA7') + '  |  ' + envType, 8, 17);

          // Proximity beeping — ping gets faster as you approach the goal
          goalCheckTimer++;
          if (goalCheckTimer % 10 === 0) { // Check every ~0.3s
            map.objects.forEach(function(o) {
              if (!o.isGoal || d.goalFoundThisRun) return;
              var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              // Ping interval: 200px away = every 2s, 50px = every 0.3s, <30px = constant
              if (gdist < 200) {
                var interval = Math.max(8, Math.floor(gdist / 3)); // frames between pings
                if (goalCheckTimer % interval === 0) {
                  var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600; // 800Hz far, 1400Hz close
                  try {
                    var ac = audioRef.current && audioRef.current.ctx;
                    if (ac) { var po = ac.createOscillator(); var pg = ac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, ac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05); po.connect(pg); pg.connect(ac.destination); po.start(); po.stop(ac.currentTime + 0.05); }
                  } catch(e) {}
                  if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                }
              }
            });
          }

          // Goal proximity check (contact detection)
          if (goalCheckTimer % 30 === 0) {
            map.objects.forEach(function(o) {
              if (!o.isGoal) return;
              var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gd < o.r + 12 && !d.goalFoundThisRun) {
                updMulti({ goalFoundThisRun: true, goalsFound: goalsFound + 1, blindWins: (hasRevealed || echoVision) ? blindWins : blindWins + 1 });
                // XP scoring: base 30 for audio-only, 20 for echo vision, 10 for map revealed
                // Bump penalty: -1 XP per bump (min 5 XP)
                var baseXP = (!hasRevealed && !echoVision) ? 30 : echoVision ? 20 : 10;
                var bumpPenalty = Math.min(baseXP - 5, bumps);
                var finalXP = Math.max(5, baseXP - bumpPenalty);
                var modeLabel = (!hasRevealed && !echoVision) ? 'Audio-only' : echoVision ? 'Echo Vision' : 'Map revealed';
                if (addToast) addToast('\uD83C\uDFC6 Goal found! ' + (d.clicks || 0) + ' clicks, ' + bumps + ' bumps \u2192 ' + finalXP + ' XP (' + modeLabel + ')', 'success');
                if (window._alloHaptic) window._alloHaptic('achieve');
                if (awardXP) awardXP('echoTrainer', finalXP, modeLabel + ': ' + bumps + ' bumps');
                if (announceToSR) announceToSR('Goal found! ' + finalXP + ' XP earned. ' + bumps + ' wall bumps. ' + modeLabel + ' mode.');
              }
            });
          }
        }
        loop();
        return function() { running = false; cancelAnimationFrame(animRef.current); };
      }, [seed, envType, reveal]);

      // ── RENDER ──
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' } },
        // Back button
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('button', { onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: isDark ? '#1e293b' : '#f1f5f9', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), borderRadius: '8px', padding: '6px 12px', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }
          }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' STEM Lab'),
          h('div', { style: { fontSize: '18px', fontWeight: 900, color: isDark ? '#e2e8f0' : '#1e293b' } }, '\uD83C\uDFA7 Echo Navigator'),
          h('div', { style: { fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', marginLeft: '8px' } }, 'Navigate by sound alone')
        ),

        // Safety disclaimer (collapsible, always visible on first load)
        !d.disclaimerDismissed && h('div', {
          role: 'alert',
          style: { background: isDark ? '#1c1917' : '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', padding: '14px 16px', marginBottom: '4px' }
        },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px' } },
            h('span', { style: { fontSize: '20px', lineHeight: 1 } }, '\u26A0\uFE0F'),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#92400e', marginBottom: '4px' } }, 'Important Safety Notice'),
              h('p', { style: { fontSize: '11px', color: isDark ? '#d6d3d1' : '#78350f', lineHeight: 1.5, margin: 0 } },
                'This simulation is an educational tool for learning about echolocation and spatial audio. It does NOT replace training with a qualified Orientation & Mobility (O&M) specialist. '),
              h('p', { style: { fontSize: '11px', color: isDark ? '#d6d3d1' : '#78350f', lineHeight: 1.5, margin: '6px 0 0 0' } },
                'Do not attempt to navigate real-world environments using echolocation skills developed in this simulation. Virtual environments are simplified and do not include the complexity, hazards, or unpredictability of real spaces. Success here does not indicate readiness for real-world navigation.'),
              h('p', { style: { fontSize: '10px', color: isDark ? '#a8a29e' : '#92400e', lineHeight: 1.4, margin: '8px 0 0 0', fontStyle: 'italic' } },
                'Research: Thaler et al. (2011, 2021) demonstrated that both blind and sighted individuals can develop echolocation skills through training. This tool is inspired by the work of Daniel Kish and World Access for the Blind.')
            ),
            h('button', {
              onClick: function() { upd('disclaimerDismissed', true); },
              'aria-label': 'Acknowledge safety disclaimer',
              style: { padding: '6px 14px', borderRadius: '6px', background: '#f59e0b', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }
            }, 'I Understand')
          )
        ),

        // Research & audience info (collapsible)
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

        // Environment selector
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          ENVIRONMENTS.map(function(env) {
            var active = envType === env.id;
            return h('button', {
              key: env.id,
              'aria-label': env.name + ': ' + env.desc,
              'aria-pressed': active ? 'true' : 'false',
              onClick: function() {
                var newSeed = Math.floor(Math.random() * 999999);
                updMulti({ envType: env.id, seed: newSeed, reveal: false, hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0, echoVision: echoVision });
                mapRef.current = null;
                playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
                if (announceToSR) announceToSR('Environment: ' + env.name + '. ' + env.desc + ' Press Space to click.');
              },
              style: { padding: '6px 12px', borderRadius: '8px', border: '1px solid ' + (active ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')), background: active ? '#6366f1' : (isDark ? '#1e293b' : '#fff'), color: active ? '#fff' : (isDark ? '#94a3b8' : '#475569'), fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, env.icon + ' ' + env.name + ' ' + '\u2B50'.repeat(env.complexity));
          })
        ),

        // Controls
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
          h('button', { onClick: emitClick, 'aria-label': 'Emit echolocation click',
            style: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }
          }, '\uD83D\uDD0A Click (Space)'),
          // Echo Vision toggle ("Toph mode")
          h('button', {
            onClick: function() { upd('echoVision', !echoVision); if (announceToSR) announceToSR(echoVision ? 'Echo Vision off — audio only' : 'Echo Vision on — sonar pulses will illuminate surfaces'); },
            'aria-label': echoVision ? 'Turn off echo vision' : 'Turn on echo vision — see sonar pulses illuminate surfaces',
            'aria-pressed': echoVision ? 'true' : 'false',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (echoVision ? '#3b82f6' : (isDark ? '#334155' : '#e2e8f0')), background: echoVision ? '#1e40af' : (isDark ? '#1e293b' : '#fff'), color: echoVision ? '#93c5fd' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, echoVision ? '\uD83C\uDF0A Echo Vision ON' : '\uD83C\uDF0A Echo Vision'),
          // Multi-bounce toggle (advanced)
          h('button', {
            onClick: function() { upd('multiBounce', !multiBounce); if (announceToSR) announceToSR(multiBounce ? 'Multi-bounce echoes off' : 'Multi-bounce echoes on — more realistic but harder'); },
            'aria-label': multiBounce ? 'Turn off multi-bounce echoes' : 'Turn on multi-bounce echoes (advanced)',
            'aria-pressed': multiBounce ? 'true' : 'false',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (multiBounce ? '#f59e0b' : (isDark ? '#334155' : '#e2e8f0')), background: multiBounce ? '#78350f' : (isDark ? '#1e293b' : '#fff'), color: multiBounce ? '#fbbf24' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, multiBounce ? '\uD83D\uDD04 Multi-Bounce ON' : '\uD83D\uDD04 Multi-Bounce'),
          h('button', { onClick: function() { upd('reveal', !reveal); if (!reveal) upd('hasRevealed', true); }, 'aria-label': reveal ? 'Hide map' : 'Reveal map',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (reveal ? '#ef4444' : '#6366f1'), background: reveal ? '#fef2f2' : (isDark ? '#1e293b' : '#f5f3ff'), color: reveal ? '#ef4444' : '#6366f1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, reveal ? '\uD83D\uDE48 Hide' : '\uD83D\uDC41 Reveal'),
          h('button', { onClick: function() {
            var newSeed = Math.floor(Math.random() * 999999);
            updMulti({ seed: newSeed, reveal: false, hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0 });
            mapRef.current = null; playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
            if (announceToSR) announceToSR('New ' + envType + ' environment generated.');
          }, 'aria-label': 'Generate new random layout',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, '\uD83C\uDFB2 New Layout'),
          d.goalFoundThisRun && h('span', { style: { padding: '8px 16px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 800 } }, '\uD83C\uDFC6 Goal Found!' + (!hasRevealed ? ' (Blind! \uD83C\uDFA7)' : ''))
        ),

        // Canvas
        h('canvas', {
          ref: canvasRef,
          role: 'application',
          'aria-label': 'Echo navigation area. WASD to move, arrows to turn, Space to click. ' + (reveal ? 'Map visible.' : 'Audio only — listen for echoes.'),
          tabIndex: 0,
          style: { width: '100%', flex: 1, minHeight: '350px', borderRadius: '12px', background: '#080810', display: 'block', cursor: 'crosshair', outline: 'none' },
          onKeyDown: function(e) {
            if (e.code === 'Space') { e.preventDefault(); emitClick(); }
            keysRef.current[e.code] = true;
          },
          onKeyUp: function(e) { keysRef.current[e.code] = false; }
        }),

        // Info footer
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: isDark ? '#475569' : '#94a3b8' } },
          h('span', null, '\uD83C\uDFAE WASD/Arrows: Move & Turn'),
          h('span', null, 'Space: Click'),
          h('span', null, '\uD83C\uDFA7 Headphones required'),
          h('span', null, '\u2B50 Find the goal using echoes'),
          h('span', { style: { color: '#6366f1' } }, 'HRTF spatial audio \u2022 ' + (d.clicks || 0) + ' clicks \u2022 Seed: ' + seed)
        ),

        // Material legend
        h('details', { style: { fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, '\uD83D\uDCD6 How Materials Sound'),
          h('div', { style: { padding: '8px', lineHeight: 1.8 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' } },
              h('span', { style: { fontWeight: 700 } }, 'Concrete/Rock:'), h('span', null, 'Bright echo (reflects ~90% of sound energy)'),
              h('span', { style: { fontWeight: 700 } }, 'Metal:'), h('span', null, 'Sharp, ringing echo (reflects ~95% \u2014 highest reflectivity)'),
              h('span', { style: { fontWeight: 700 } }, 'Wood:'), h('span', null, 'Muffled echo (absorbs high frequencies, reflects ~50%)'),
              h('span', { style: { fontWeight: 700 } }, 'Glass:'), h('span', null, 'Faint, high-pitched echo (mostly transparent to sound)'),
              h('span', { style: { fontWeight: 700 } }, 'Fabric/Carpet:'), h('span', null, 'Nearly silent (absorbs most sound \u2014 hard to detect)'),
              h('span', { style: { fontWeight: 700, color: '#fbbf24' } }, 'Goal \u2B50:'), h('span', null, 'Distinctive bright echo with a unique tonal quality')
            ),
            h('p', { style: { marginTop: '6px', fontStyle: 'italic', fontSize: '9px' } },
              '\uD83E\uDD87 Real bats use frequencies of 20-200 kHz (ultrasonic). Humans echolocate best with tongue clicks at 2-4 kHz. The key cue is the time delay between click and echo \u2014 at 343 m/s, a wall 1.7m away returns an echo in 10ms.')
          )
        ),

        // Safety reminder footer
        h('div', { style: { fontSize: '9px', color: isDark ? '#475569' : '#94a3b8', textAlign: 'center', padding: '6px 0', borderTop: '1px solid ' + (isDark ? '#1e293b' : '#e2e8f0') } },
          '\u26A0\uFE0F This is an educational simulation. Do not rely on simulation experience for real-world navigation. Consult a qualified O&M specialist for echolocation training.'
        )
      );
    }
  });

})();
} // end duplicate guard
