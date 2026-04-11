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
      { id: 'blind_navigation', label: 'Find a goal in Audio Only mode', icon: '\uD83C\uDFA7', check: function(d) { return d.blindWins >= 1; }, progress: function(d) { return (d.blindWins || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'cross_urban', label: 'Survive Urban Street without getting hit by a car', icon: '\uD83D\uDE97', check: function(d) { return d.urbanNoCarHit; }, progress: function(d) { return d.urbanNoCarHit ? 'Done!' : 'Not yet'; } },
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

      // ── 3D Scene setup + render loop ──
      useEffect(function() {
        if (!has3D || !mountRef.current) return;
        var THREE = window.THREE;
        var container = mountRef.current;
        var map = mapRef.current;
        var agents = agentsRef.current;
        if (!map) return;

        // Build scene
        var sceneData = build3DScene(THREE, map, agents);
        var scene = sceneData.scene;
        var meshes = sceneData.meshes;
        var agentMeshes = sceneData.agentMeshes;
        var SCALE = sceneData.SCALE;

        // Camera (first-person)
        var camera = new THREE.PerspectiveCamera(75, container.clientWidth / Math.max(container.clientHeight, 200), 0.1, 100);
        var player = playerRef.current;
        camera.position.set(player.x * SCALE, 1.5, player.y * SCALE);
        camera.rotation.order = 'YXZ';

        // Renderer
        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 200));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.borderRadius = '12px';
        container.appendChild(renderer.domElement);

        threeRef.current = { scene: scene, camera: camera, renderer: renderer, meshes: meshes, agentMeshes: agentMeshes, SCALE: SCALE };

        // Pointer lock for mouse-look
        var isLocked = false;
        var yaw = player.angle;
        var pitch = 0;
        renderer.domElement.addEventListener('click', function() {
          if (!isLocked) renderer.domElement.requestPointerLock();
          else emitClick(); // click = sonar pulse while locked
        });
        function onPointerLockChange() { isLocked = document.pointerLockElement === renderer.domElement; }
        document.addEventListener('pointerlockchange', onPointerLockChange);
        function onMouseMove(e) {
          if (!isLocked) return;
          yaw += e.movementX * 0.003;
          pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.003));
        }
        document.addEventListener('mousemove', onMouseMove);

        // 3D Render loop (replaces 2D animation for 3D envs)
        var running = true;
        var lastTime = performance.now();
        var goalCheckTimer3D = 0;

        function render3D() {
          if (!running) return;
          requestAnimationFrame(render3D);
          var now = performance.now();
          var dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;

          var player = playerRef.current;
          var map = mapRef.current;
          var keys = keysRef.current;
          if (!map) return;

          // Movement (sync yaw back to player.angle)
          var ms = 2.5, ts = 0.045;
          if (!isLocked) {
            if (keys['ArrowLeft'] || keys['KeyA']) yaw -= ts;
            if (keys['ArrowRight'] || keys['KeyD']) yaw += ts;
          }
          player.angle = yaw;
          var fdx = Math.cos(player.angle) * ms, fdy = Math.sin(player.angle) * ms;
          if (keys['KeyW'] || keys['ArrowUp']) {
            var nx = player.x + fdx, ny = player.y + fdy;
            if (canMoveTo(nx, ny, map)) { player.x = nx; player.y = ny; }
            else if (!player._bumpCooldown) {
              player._bumpCooldown = 20;
              updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
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
          if (player._bumpCooldown > 0) player._bumpCooldown--;

          // Agent collision (pedestrians, cars)
          if (agents) {
            for (var ai = 0; ai < agents.length; ai++) {
              var ag = agents[ai];
              var adx = player.x - ag.x, ady = player.y - ag.y;
              var adist = Math.sqrt(adx * adx + ady * ady);
              if (adist < ag.radius + 12 && !player._agentBumpCooldown) {
                player._agentBumpCooldown = 40;
                var penalty = ag.kind === 'car' ? 3 : 1;
                updMulti({ bumps: (d.bumps || 0) + penalty });
                if (addToast) addToast(ag.kind === 'car' ? '\uD83D\uDE97 Hit by a car! -' + penalty + ' bumps' : '\uD83D\uDEB6 Bumped a pedestrian!', 'warning');
                if (window._alloHaptic) window._alloHaptic('bump');
                try { var bac3 = audioRef.current && audioRef.current.ctx; if (bac3) { var bo3 = bac3.createOscillator(); var bg3 = bac3.createGain(); bo3.type = 'square'; bo3.frequency.value = ag.kind === 'car' ? 200 : 160; bg3.gain.setValueAtTime(0.12, bac3.currentTime); bg3.gain.exponentialRampToValueAtTime(0.001, bac3.currentTime + 0.2); bo3.connect(bg3); bg3.connect(bac3.destination); bo3.start(); bo3.stop(bac3.currentTime + 0.2); } } catch(e) {}
              }
            }
            if (player._agentBumpCooldown > 0) player._agentBumpCooldown--;
          }

          // Strafe (Q/E)
          var sdx = Math.cos(player.angle + Math.PI * 0.5) * ms * 0.6;
          var sdy = Math.sin(player.angle + Math.PI * 0.5) * ms * 0.6;
          if (keys['KeyQ'] || keys['KeyE']) {
            var sign = keys['KeyE'] ? 1 : -1;
            var sx = player.x + sdx * sign, sy = player.y + sdy * sign;
            if (canMoveTo(sx, sy, map)) { player.x = sx; player.y = sy; }
          }

          // Update agents
          updateAgents(agents, dt, map);

          // Sync agent meshes + play agent audio
          for (var ami = 0; ami < agentMeshes.length; ami++) {
            var am = agentMeshes[ami];
            am.mesh.position.set(am.agent.x * SCALE, am.agent.height * 0.5, am.agent.y * SCALE);
            // Face movement direction
            if (am.agent.waypoints && am.agent.waypoints.length > 1) {
              var tgt = am.agent.waypoints[am.agent.targetIdx || 0];
              am.mesh.rotation.y = -Math.atan2(tgt.y - am.agent.y, tgt.x - am.agent.x);
            }
            // Agent HRTF positional audio
            if (audioRef.current && audioRef.current.ctx) {
              var ac = audioRef.current.ctx;
              if (!agentAudioRef.current[am.agent.id]) {
                var osc = ac.createOscillator();
                var gain = ac.createGain();
                var panner = ac.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 60;
                panner.rolloffFactor = 1.5;
                // Each agent kind gets a distinctive continuous sound
                if (am.agent.kind === 'car') {
                  osc.type = 'sawtooth'; osc.frequency.value = 55; gain.gain.value = 0.025;
                } else if (am.agent.kind === 'bat') {
                  osc.type = 'sine'; osc.frequency.value = 3200; gain.gain.value = 0.006;
                } else {
                  osc.type = 'triangle'; osc.frequency.value = 200; gain.gain.value = 0.008;
                }
                osc.connect(gain); gain.connect(panner); panner.connect(ac.destination);
                osc.start();
                agentAudioRef.current[am.agent.id] = { osc: osc, gain: gain, panner: panner };
              }
              // Update panner position relative to listener
              var aRef = agentAudioRef.current[am.agent.id];
              var relX = (am.agent.x - player.x) * 0.05;
              var relZ = (am.agent.y - player.y) * 0.05;
              var cosP = Math.cos(-player.angle), sinP = Math.sin(-player.angle);
              aRef.panner.positionX.value = relX * cosP - relZ * sinP;
              aRef.panner.positionY.value = (am.agent.height || 1) - 1.5;
              aRef.panner.positionZ.value = relX * sinP + relZ * cosP;
            }
          }

          // Update camera
          camera.position.set(player.x * SCALE, 1.5, player.y * SCALE);
          camera.rotation.set(pitch, -yaw + Math.PI * 0.5, 0);

          // ── Sonar pulse glow logic (3D) ──
          var nowMs = Date.now();
          var pulseExpansionRate = SPEED_OF_SOUND * 0.5; // match 2D

          // Reset all mesh glow for this frame
          for (var mi = 0; mi < meshes.length; mi++) {
            var m = meshes[mi];
            if (!m.userData) continue;
            // Decay glow
            if (m.userData.glowAmt > 0) {
              m.userData.glowAmt = Math.max(0, m.userData.glowAmt - dt * 1.2);
            }
          }

          // Process active pulses
          if (viewMode === 'echo' && pulsesRef.current.length > 0) {
            var activePulses3 = [];
            for (var pi = 0; pi < pulsesRef.current.length; pi++) {
              var pulse = pulsesRef.current[pi];
              var age = (nowMs - pulse.birth) / 1000;
              var pulseR = age * pulseExpansionRate;
              var pulseAlpha = Math.max(0, 1 - age * 1.2);
              if (pulseAlpha <= 0) continue;
              activePulses3.push(pulse);

              for (var mi2 = 0; mi2 < meshes.length; mi2++) {
                var mesh = meshes[mi2];
                if (!mesh.userData || !mesh.userData.ref) continue;
                var mdx = (mesh.userData.mapX || 0) - pulse.x;
                var mdy = (mesh.userData.mapY || 0) - pulse.y;
                var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                var band = mesh.userData.kind === 'agent' ? 25 : 20;
                if (Math.abs(mdist - pulseR) < band) {
                  var intensity = pulseAlpha * mesh.userData.ref * (1 - Math.abs(mdist - pulseR) / band);
                  mesh.userData.glowAmt = Math.max(mesh.userData.glowAmt || 0, intensity);
                }
              }
            }
            pulsesRef.current = activePulses3;
          }

          // Agent ambient glow (constant faint self-illumination from their sound)
          if (viewMode === 'echo') {
            for (var agi = 0; agi < agentMeshes.length; agi++) {
              var agm = agentMeshes[agi];
              var ambientLevel = AGENT_AMBIENT_GLOW[agm.agent.kind] || 0.1;
              var pulseFactor = 0.5 + 0.5 * Math.sin(nowMs * 0.004 + agi);
              agm.mesh.userData.glowAmt = Math.max(agm.mesh.userData.glowAmt || 0, ambientLevel * pulseFactor);
            }
          }

          // Apply glow to materials
          var isRevealMode = viewMode === 'reveal';
          for (var mi3 = 0; mi3 < meshes.length; mi3++) {
            var mesh3 = meshes[mi3];
            if (!mesh3.material || !mesh3.material.userData) continue;
            var matData = mesh3.material.userData;
            if (isRevealMode) {
              mesh3.material.color.setHex(matData.baseColor);
            } else if (viewMode === 'audio') {
              mesh3.material.color.setHex(0x000000);
            } else {
              var glow = mesh3.userData.glowAmt || 0;
              if (glow > 0.01) {
                var r = ((matData.baseColor >> 16) & 0xff) / 255;
                var g = ((matData.baseColor >> 8) & 0xff) / 255;
                var b = (matData.baseColor & 0xff) / 255;
                mesh3.material.color.setRGB(r * glow, g * glow, b * glow);
              } else {
                mesh3.material.color.setHex(0x000000);
              }
            }
          }

          // Set ambient light based on mode
          scene.children.forEach(function(child) {
            if (child.isAmbientLight) child.intensity = isRevealMode ? 0.7 : 0.02;
          });
          if (scene.fog) scene.fog.far = isRevealMode ? 100 : 40;

          // Proximity beep + goal detection
          goalCheckTimer3D++;
          if (goalCheckTimer3D % 10 === 0) {
            map.objects.forEach(function(o) {
              if (!o.isGoal || d.goalFoundThisRun) return;
              var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gdist < 200) {
                var interval = Math.max(8, Math.floor(gdist / 3));
                if (goalCheckTimer3D % interval === 0) {
                  var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600;
                  try { var ac2 = audioRef.current && audioRef.current.ctx; if (ac2) { var po = ac2.createOscillator(); var pg = ac2.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, ac2.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, ac2.currentTime + 0.05); po.connect(pg); pg.connect(ac2.destination); po.start(); po.stop(ac2.currentTime + 0.05); } } catch(e) {}
                  if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                }
              }
            });
          }
          if (goalCheckTimer3D % 30 === 0) {
            map.objects.forEach(function(o) {
              if (!o.isGoal) return;
              var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gd < o.r + 12 && !d.goalFoundThisRun) {
                var baseXP = viewMode === 'audio' ? 30 : viewMode === 'echo' ? 20 : 10;
                var bumpPenalty = Math.min(baseXP - 5, bumps);
                var finalXP = Math.max(5, baseXP - bumpPenalty);
                var modeLabel = viewMode === 'audio' ? 'Audio-only' : viewMode === 'echo' ? 'Echo Vision' : 'Reveal';
                updMulti({ goalFoundThisRun: true, goalsFound: goalsFound + 1, blindWins: viewMode === 'audio' ? blindWins + 1 : blindWins });
                if (addToast) addToast('\uD83C\uDFC6 Goal found! ' + (d.clicks || 0) + ' clicks, ' + bumps + ' bumps \u2192 ' + finalXP + ' XP (' + modeLabel + ')', 'success');
                if (window._alloHaptic) window._alloHaptic('achieve');
                if (awardXP) awardXP('echoTrainer', finalXP, modeLabel + ': ' + bumps + ' bumps');
                if (announceToSR) announceToSR('Goal found! ' + finalXP + ' XP earned. ' + bumps + ' wall bumps. ' + modeLabel + ' mode.');
                // Tutorial progression
                if (envType === 'simple_room' && tutStep < 4) upd('tutStep', 4);
              }
            });
          }

          // Bump flash (full-screen red tint via overlay quad)
          if (player._bumpCooldown > 15) {
            renderer.domElement.style.boxShadow = 'inset 0 0 80px rgba(239,68,68,' + ((player._bumpCooldown - 15) / 5 * 0.3) + ')';
          } else {
            renderer.domElement.style.boxShadow = 'none';
          }

          // Handle resize
          if (container.clientWidth > 0 && container.clientHeight > 0) {
            if (renderer.domElement.width !== container.clientWidth || renderer.domElement.height !== container.clientHeight) {
              renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 200));
              camera.aspect = container.clientWidth / Math.max(container.clientHeight, 200);
              camera.updateProjectionMatrix();
            }
          }

          renderer.render(scene, camera);
        }
        render3D();

        return function() {
          running = false;
          document.removeEventListener('pointerlockchange', onPointerLockChange);
          document.removeEventListener('mousemove', onMouseMove);
          if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
          // Stop agent audio oscillators
          Object.keys(agentAudioRef.current).forEach(function(k) {
            try { agentAudioRef.current[k].osc.stop(); } catch(e) {}
          });
          agentAudioRef.current = {};
          renderer.dispose();
          if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
          threeRef.current = null;
        };
      }, [seed, envType, has3D, viewMode]);

      // ── 2D Minimap / fallback animation loop ──
      useEffect(function() {
        if (!canvasRef.current) return;
        var canvas = canvasRef.current;
        var gfx = canvas.getContext('2d');
        var running = true;
        var goalCheckTimer = 0;
        var isMinimap = has3D; // if 3D is active, this canvas is the minimap

        function loop() {
          if (!running) return;
          animRef.current = requestAnimationFrame(loop);

          var W, H;
          if (isMinimap) {
            W = canvas.width = 200;
            H = canvas.height = 200;
          } else {
            W = canvas.width = canvas.clientWidth || 800;
            H = canvas.height = canvas.clientHeight || 400;
          }
          var map = mapRef.current;
          var player = playerRef.current;
          var keys = keysRef.current;
          if (!map) return;

          // Movement (only in 2D-only mode — 3D useEffect handles movement when has3D)
          if (!isMinimap) {
            var ms = 2.5, ts = 0.045;
            if (keys['ArrowLeft'] || keys['KeyA']) player.angle -= ts;
            if (keys['ArrowRight'] || keys['KeyD']) player.angle += ts;
            var fdx = Math.cos(player.angle) * ms, fdy = Math.sin(player.angle) * ms;
            if (keys['KeyW'] || keys['ArrowUp']) {
              var nx = player.x + fdx, ny = player.y + fdy;
              if (canMoveTo(nx, ny, map)) { player.x = nx; player.y = ny; }
              else if (!player._bumpCooldown) {
                player._bumpCooldown = 20;
                updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
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
            if (player._bumpCooldown > 0) player._bumpCooldown--;
          }

          // Render
          var scale = Math.min(W / map.W, H / map.H);
          var ox = (W - map.W * scale) / 2, oy = (H - map.H * scale) / 2;
          gfx.clearRect(0, 0, W, H);
          gfx.fillStyle = '#080810';
          gfx.fillRect(0, 0, W, H);
          gfx.save();
          gfx.translate(ox, oy);
          gfx.scale(scale, scale);

          // Map (show in minimap always; in standalone only when reveal mode)
          var showMap = isMinimap || viewMode === 'reveal';
          if (showMap) {
            gfx.lineWidth = isMinimap ? 1.5 : 3;
            map.walls.forEach(function(w) {
              gfx.strokeStyle = w.mat === 'metal' ? '#94a3b8' : w.mat === 'wood' ? '#a16207' : w.mat === 'glass' ? '#7dd3fc55' : '#475569';
              gfx.beginPath(); gfx.moveTo(w.x1, w.y1); gfx.lineTo(w.x2, w.y2); gfx.stroke();
            });
            map.objects.forEach(function(o) {
              gfx.fillStyle = o.isGoal ? '#fbbf24' : o.mat === 'metal' ? '#94a3b8' : o.mat === 'wood' ? '#92400e' : '#64748b';
              gfx.beginPath(); gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2); gfx.fill();
              if (o.isGoal && !isMinimap) { gfx.fillStyle = '#080810'; gfx.font = 'bold 14px sans-serif'; gfx.textAlign = 'center'; gfx.fillText('\u2B50', o.x, o.y + 5); }
            });
          }

          // Draw agents on minimap / 2D
          var agents = agentsRef.current;
          if (agents && (showMap || viewMode === 'echo')) {
            for (var dai = 0; dai < agents.length; dai++) {
              var ag = agents[dai];
              gfx.fillStyle = ag.kind === 'car' ? '#ffc47c' : ag.kind === 'bat' ? '#a78bfa' : '#ff9c9c';
              gfx.beginPath(); gfx.arc(ag.x, ag.y, isMinimap ? 4 : ag.radius, 0, Math.PI * 2); gfx.fill();
            }
          }

          // Player trail
          if (!player._trail) player._trail = [];
          if (player._trail.length === 0 || Math.abs(player.x - player._trail[player._trail.length - 1].x) > 5 || Math.abs(player.y - player._trail[player._trail.length - 1].y) > 5) {
            player._trail.push({ x: player.x, y: player.y });
            if (player._trail.length > 200) player._trail.shift();
          }
          if (!isMinimap) {
            for (var ti = 0; ti < player._trail.length; ti++) {
              var trailAlpha = (ti / player._trail.length) * 0.15;
              gfx.fillStyle = 'rgba(99,102,241,' + trailAlpha + ')';
              gfx.beginPath(); gfx.arc(player._trail[ti].x, player._trail[ti].y, 2, 0, Math.PI * 2); gfx.fill();
            }
          }

          // Compass rose
          if (!isMinimap) {
            gfx.save();
            gfx.translate(map.W - 30, 40);
            gfx.strokeStyle = 'rgba(148,163,184,0.3)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.moveTo(0, -16); gfx.lineTo(0, 16); gfx.stroke();
            gfx.beginPath(); gfx.moveTo(-16, 0); gfx.lineTo(16, 0); gfx.stroke();
            gfx.fillStyle = 'rgba(239,68,68,0.5)'; gfx.font = 'bold 8px sans-serif'; gfx.textAlign = 'center';
            gfx.fillText('N', 0, -19);
            gfx.fillStyle = 'rgba(148,163,184,0.3)'; gfx.fillText('S', 0, 24); gfx.fillText('E', 20, 3); gfx.fillText('W', -20, 3);
            gfx.restore();
          }

          // Player dot
          gfx.fillStyle = '#6366f1';
          gfx.beginPath(); gfx.arc(player.x, player.y, isMinimap ? 5 : 8, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#a5b4fc'; gfx.lineWidth = isMinimap ? 1 : 2;
          gfx.beginPath(); gfx.moveTo(player.x, player.y);
          gfx.lineTo(player.x + Math.cos(player.angle) * (isMinimap ? 12 : 22), player.y + Math.sin(player.angle) * (isMinimap ? 12 : 22)); gfx.stroke();
          if (!isMinimap) {
            gfx.strokeStyle = 'rgba(99,102,241,0.15)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.arc(player.x, player.y, 80, player.angle - 0.33 * Math.PI, player.angle + 0.33 * Math.PI); gfx.stroke();
          }

          // ── 2D Echo Vision pulse visualization (only for non-3D fallback) ──
          if (!isMinimap && viewMode === 'echo' && pulsesRef.current.length > 0) {
            var now = Date.now();
            var activePulses = [];
            pulsesRef.current.forEach(function(pulse) {
              var age = (now - pulse.birth) / 1000;
              var pulseRadius = age * SPEED_OF_SOUND * 0.5;
              var pulseAlpha = Math.max(0, 1 - age * 1.5);
              if (pulseAlpha <= 0) return;
              activePulses.push(pulse);
              gfx.strokeStyle = 'rgba(120,180,255,' + (pulseAlpha * 0.2) + ')';
              gfx.lineWidth = 2;
              gfx.beginPath(); gfx.arc(pulse.x, pulse.y, pulseRadius, 0, Math.PI * 2); gfx.stroke();
              map.walls.forEach(function(w) {
                var wx = w.x2 - w.x1, wy = w.y2 - w.y1;
                var wl2 = wx * wx + wy * wy;
                if (wl2 < 1) return;
                for (var si = 0; si <= 4; si++) {
                  var t2 = si / 4;
                  var px = w.x1 + wx * t2, py = w.y1 + wy * t2;
                  var dx2 = px - pulse.x, dy2 = py - pulse.y;
                  var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                  if (Math.abs(dist - pulseRadius) < 15) {
                    var intensity = pulseAlpha * w.ref * (1 - Math.abs(dist - pulseRadius) / 15);
                    var color = w.mat === 'metal' ? '200,220,255' : w.mat === 'wood' ? '180,140,80' : w.mat === 'glass' ? '150,220,255' : '100,160,220';
                    gfx.fillStyle = 'rgba(' + color + ',' + (intensity * 0.7) + ')';
                    gfx.beginPath(); gfx.arc(px, py, 6, 0, Math.PI * 2); gfx.fill();
                  }
                }
              });
              map.objects.forEach(function(o) {
                var odx = o.x - pulse.x, ody = o.y - pulse.y;
                var odist = Math.sqrt(odx * odx + ody * ody);
                if (Math.abs(odist - pulseRadius) < o.r + 10) {
                  var oIntensity = pulseAlpha * o.ref * (1 - Math.abs(odist - pulseRadius) / (o.r + 10));
                  var oColor = o.isGoal ? '255,220,50' : o.mat === 'metal' ? '200,220,255' : '100,160,220';
                  gfx.fillStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.6) + ')';
                  gfx.beginPath(); gfx.arc(o.x, o.y, o.r + 3, 0, Math.PI * 2); gfx.fill();
                  gfx.strokeStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.9) + ')';
                  gfx.lineWidth = 2;
                  gfx.beginPath(); gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2); gfx.stroke();
                }
              });
            });
            pulsesRef.current = activePulses;
          }

          // Minimap: sonar ring overlay
          if (isMinimap && pulsesRef.current.length > 0) {
            var nowMm = Date.now();
            pulsesRef.current.forEach(function(pulse) {
              var age = (nowMm - pulse.birth) / 1000;
              var pulseR = age * SPEED_OF_SOUND * 0.5;
              var alpha = Math.max(0, 1 - age * 1.5);
              if (alpha <= 0) return;
              gfx.strokeStyle = 'rgba(120,180,255,' + (alpha * 0.35) + ')';
              gfx.lineWidth = 1.5;
              gfx.beginPath(); gfx.arc(pulse.x, pulse.y, pulseR, 0, Math.PI * 2); gfx.stroke();
            });
          }

          // Bump flash
          if (player._bumpCooldown > 15 && !isMinimap) {
            gfx.fillStyle = 'rgba(239,68,68,' + ((player._bumpCooldown - 15) / 5 * 0.15) + ')';
            gfx.fillRect(0, 0, map.W, map.H);
          }

          gfx.restore();

          // HUD (only for standalone 2D mode)
          if (!isMinimap) {
            gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(0, 0, W, 26);
            gfx.font = 'bold 11px monospace'; gfx.fillStyle = '#94a3b8'; gfx.textAlign = 'left';
            var modeName = viewMode === 'echo' ? 'ECHO VISION' : viewMode === 'audio' ? 'AUDIO ONLY \uD83C\uDFA7' : 'MAP VISIBLE';
            gfx.fillText('Echo Navigator  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + bumps + '  |  Goals: ' + goalsFound + '  |  ' + modeName + '  |  ' + envType, 8, 17);
          }

          // Goal detection (only for 2D-only mode — 3D handles its own)
          if (!isMinimap) {
            goalCheckTimer++;
            if (goalCheckTimer % 10 === 0) {
              map.objects.forEach(function(o) {
                if (!o.isGoal || d.goalFoundThisRun) return;
                var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gdist < 200) {
                  var interval = Math.max(8, Math.floor(gdist / 3));
                  if (goalCheckTimer % interval === 0) {
                    var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600;
                    try { var ac = audioRef.current && audioRef.current.ctx; if (ac) { var po = ac.createOscillator(); var pg = ac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, ac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05); po.connect(pg); pg.connect(ac.destination); po.start(); po.stop(ac.currentTime + 0.05); } } catch(e) {}
                    if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                  }
                }
              });
            }
            if (goalCheckTimer % 30 === 0) {
              map.objects.forEach(function(o) {
                if (!o.isGoal) return;
                var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gd < o.r + 12 && !d.goalFoundThisRun) {
                  var baseXP = viewMode === 'audio' ? 30 : viewMode === 'echo' ? 20 : 10;
                  var bumpPenalty = Math.min(baseXP - 5, bumps);
                  var finalXP = Math.max(5, baseXP - bumpPenalty);
                  var modeLabel = viewMode === 'audio' ? 'Audio-only' : viewMode === 'echo' ? 'Echo Vision' : 'Map revealed';
                  updMulti({ goalFoundThisRun: true, goalsFound: goalsFound + 1, blindWins: viewMode === 'audio' ? blindWins + 1 : blindWins });
                  if (addToast) addToast('\uD83C\uDFC6 Goal found! ' + (d.clicks || 0) + ' clicks, ' + bumps + ' bumps \u2192 ' + finalXP + ' XP (' + modeLabel + ')', 'success');
                  if (window._alloHaptic) window._alloHaptic('achieve');
                  if (awardXP) awardXP('echoTrainer', finalXP, modeLabel + ': ' + bumps + ' bumps');
                  if (announceToSR) announceToSR('Goal found! ' + finalXP + ' XP earned. ' + bumps + ' wall bumps. ' + modeLabel + ' mode.');
                }
              });
            }
          }
        }
        loop();
        return function() { running = false; cancelAnimationFrame(animRef.current); };
      }, [seed, envType, viewMode]);

      // ── RENDER ──
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' } },
        // Back button
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('button', { onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: isDark ? '#1e293b' : '#f1f5f9', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), borderRadius: '8px', padding: '6px 12px', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }
          }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' STEM Lab'),
          h('div', { style: { fontSize: '18px', fontWeight: 900, color: isDark ? '#e2e8f0' : '#1e293b' } }, '\uD83C\uDFA7 Echo Navigator'),
          h('div', { style: { fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', marginLeft: '8px' } }, has3D ? '3D Mode \u2022 Click viewport to engage mouse-look' : 'Navigate by sound alone'),
          has3D && h('span', { style: { padding: '2px 8px', borderRadius: '6px', background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: 800 } }, '3D')
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

        // ── How Echolocation Works — animated SVG diagram ──
        h('details', {
          open: !(d.goalsFound > 0), // Open by default for new users, collapsed for experienced
          style: { marginBottom: '8px', borderRadius: '12px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), overflow: 'hidden' }
        },
          h('summary', {
            style: { padding: '10px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }
          }, '\uD83D\uDCDA How Echolocation Works'),
          h('div', { style: { padding: '12px 14px', background: isDark ? '#0f172a' : '#fff' } },
            // Animated SVG showing click → bounce → return
            h('svg', { viewBox: '0 0 500 160', width: '100%', height: 'auto', style: { maxHeight: '140px' }, 'aria-label': 'Diagram showing how echolocation works: a click travels to a wall, bounces back, and the time delay tells you the distance' },
              // Background
              h('rect', { x: 0, y: 0, width: 500, height: 160, fill: isDark ? '#0f172a' : '#f8fafc', rx: 8 }),
              // Person (left side)
              h('circle', { cx: 60, cy: 80, r: 18, fill: '#6366f1', opacity: 0.9 }),
              h('text', { x: 60, y: 85, textAnchor: 'middle', fontSize: '16', fill: '#fff' }, '\uD83C\uDFA7'),
              h('text', { x: 60, y: 115, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'You'),
              // Wall (right side)
              h('rect', { x: 410, y: 20, width: 12, height: 120, fill: '#475569', rx: 3 }),
              h('text', { x: 416, y: 155, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'Wall'),
              // Outgoing click wave (animated)
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
                h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', from: '0.7', to: '0', dur: '2s', repeatCount: 'indefinite' })
              ),
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5, opacity: 0.5 },
                h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', from: '0.5', to: '0', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' })
              ),
              // Reflected echo (bouncing back, delayed)
              h('circle', { cx: 410, cy: 70, r: 0, fill: 'none', stroke: '#22c55e', strokeWidth: 2, opacity: 0 },
                h('animate', { attributeName: 'r', from: '0', to: '180', dur: '2s', begin: '1s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', values: '0;0.6;0', dur: '2s', begin: '1s', repeatCount: 'indefinite' })
              ),
              // Arrow: outgoing click
              h('line', { x1: 90, y1: 68, x2: 200, y2: 68, stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowOut)' }),
              h('text', { x: 145, y: 62, textAnchor: 'middle', fontSize: '8', fill: '#a78bfa', fontWeight: 600 }, 'Click \u2192'),
              // Arrow: returning echo
              h('line', { x1: 390, y1: 92, x2: 280, y2: 92, stroke: '#4ade80', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowBack)' }),
              h('text', { x: 335, y: 106, textAnchor: 'middle', fontSize: '8', fill: '#4ade80', fontWeight: 600 }, '\u2190 Echo'),
              // Time delay label
              h('rect', { x: 190, y: 125, width: 120, height: 24, rx: 6, fill: isDark ? '#1e293b' : '#f0f9ff', stroke: isDark ? '#334155' : '#bae6fd' }),
              h('text', { x: 250, y: 141, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#7dd3fc' : '#0369a1', fontWeight: 700 }, 'Delay = Distance \u00d7 2 \u00f7 343 m/s'),
              // Arrow markers (defined in defs)
              h('defs', null,
                h('marker', { id: 'arrowOut', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' },
                  h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#a78bfa' })
                ),
                h('marker', { id: 'arrowBack', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' },
                  h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#4ade80' })
                )
              )
            ),
            // Key concepts in a grid
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px', fontSize: '10px' } },
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#f5f3ff', border: '1px solid ' + (isDark ? '#334155' : '#e9d5ff'), textAlign: 'center' } },
                h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83D\uDD0A'),
                h('div', { style: { fontWeight: 700, color: '#7c3aed' } }, 'Click'),
                h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Press Space to emit a tongue click sound')
              ),
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#ecfdf5', border: '1px solid ' + (isDark ? '#334155' : '#bbf7d0'), textAlign: 'center' } },
                h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83C\uDFA7'),
                h('div', { style: { fontWeight: 700, color: '#22c55e' } }, 'Listen'),
                h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Echoes return from different directions via headphones')
              ),
              h('div', { style: { padding: '8px', borderRadius: '8px', background: isDark ? '#1e293b' : '#eff6ff', border: '1px solid ' + (isDark ? '#334155' : '#bfdbfe'), textAlign: 'center' } },
                h('div', { style: { fontSize: '16px', marginBottom: '2px' } }, '\uD83E\uDDE0'),
                h('div', { style: { fontWeight: 700, color: '#3b82f6' } }, 'Navigate'),
                h('div', { style: { color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.3 } }, 'Build a mental map from echo timing + direction')
              )
            ),
            // Material comparison
            h('div', { style: { marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } },
              [
                { name: 'Rock', color: '#64748b', desc: 'Bright echo', ref: '85%' },
                { name: 'Metal', color: '#94a3b8', desc: 'Sharp ring', ref: '95%' },
                { name: 'Wood', color: '#92400e', desc: 'Muffled', ref: '50%' },
                { name: 'Glass', color: '#7dd3fc', desc: 'Faint', ref: '30%' },
                { name: 'Goal \u2B50', color: '#fbbf24', desc: 'Bright!', ref: '90%' }
              ].map(function(mat) {
                return h('div', { key: mat.name, style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: isDark ? '#1e293b' : '#f8fafc', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), fontSize: '9px' } },
                  h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: mat.color } }),
                  h('span', { style: { fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' } }, mat.name),
                  h('span', { style: { color: isDark ? '#64748b' : '#94a3b8' } }, mat.desc)
                );
              })
            )
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
                updMulti({ envType: env.id, seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0 });
                mapRef.current = null;
                playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
                if (announceToSR) announceToSR('Environment: ' + env.name + '. ' + env.desc + (ENV_3D_READY[env.id] ? ' 3D mode.' : ' 2D mode.') + ' Press Space to click.');
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
          // View mode cycle: echo → audio → reveal → echo
          h('button', {
            onClick: function() {
              var next = viewMode === 'echo' ? 'audio' : viewMode === 'audio' ? 'reveal' : 'echo';
              upd('viewMode', next);
              if (next === 'reveal') upd('hasRevealed', true);
              var labels = { echo: 'Echo Vision — darkness + sonar reveals', audio: 'Audio Only — pure darkness, no visuals', reveal: 'Reveal — full lighting (debug/teacher mode)' };
              if (announceToSR) announceToSR(labels[next]);
            },
            'aria-label': 'Cycle view mode: ' + viewMode,
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (viewMode === 'echo' ? '#3b82f6' : viewMode === 'audio' ? '#475569' : '#ef4444'),
              background: viewMode === 'echo' ? '#1e40af' : viewMode === 'audio' ? (isDark ? '#0f172a' : '#1e293b') : '#fef2f2',
              color: viewMode === 'echo' ? '#93c5fd' : viewMode === 'audio' ? '#64748b' : '#ef4444',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, viewMode === 'echo' ? '\uD83C\uDF0A Echo Vision' : viewMode === 'audio' ? '\uD83C\uDFA7 Audio Only' : '\uD83D\uDC41 Reveal'),
          // Multi-bounce toggle
          h('button', {
            onClick: function() { upd('multiBounce', !multiBounce); if (announceToSR) announceToSR(multiBounce ? 'Multi-bounce echoes off' : 'Multi-bounce echoes on — more realistic but harder'); },
            'aria-label': multiBounce ? 'Turn off multi-bounce echoes' : 'Turn on multi-bounce echoes (advanced)',
            'aria-pressed': multiBounce ? 'true' : 'false',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (multiBounce ? '#f59e0b' : (isDark ? '#334155' : '#e2e8f0')), background: multiBounce ? '#78350f' : (isDark ? '#1e293b' : '#fff'), color: multiBounce ? '#fbbf24' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, multiBounce ? '\uD83D\uDD04 Multi-Bounce ON' : '\uD83D\uDD04 Multi-Bounce'),
          h('button', { onClick: function() {
            var newSeed = Math.floor(Math.random() * 999999);
            updMulti({ seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0 });
            mapRef.current = null; playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
            if (announceToSR) announceToSR('New ' + envType + ' environment generated.');
          }, 'aria-label': 'Generate new random layout',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, '\uD83C\uDFB2 New Layout'),
          d.goalFoundThisRun && h('span', { style: { padding: '8px 16px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 800 } }, '\uD83C\uDFC6 Goal Found!' + (viewMode === 'audio' ? ' (Blind! \uD83C\uDFA7)' : ''))
        ),

        // ── Tutorial overlay (simple_room only) ──
        envType === 'simple_room' && tutStep < 4 && h('div', {
          role: 'region', 'aria-live': 'polite',
          style: { background: isDark ? '#0f172a' : '#eff6ff', border: '2px solid #6366f1', borderRadius: '12px', padding: '14px 16px', marginBottom: '4px' }
        },
          h('div', { style: { fontSize: '13px', fontWeight: 800, color: '#6366f1', marginBottom: '6px' } },
            '\uD83C\uDF93 Tutorial Step ' + (tutStep + 1) + ' of 4'),
          h('p', { style: { fontSize: '12px', color: isDark ? '#e2e8f0' : '#1e293b', margin: '0 0 8px 0', lineHeight: 1.5 } },
            tutStep === 0 ? 'The world is dark. You can\'t see anything. Press SPACE to emit a sonar click. Watch (or listen) as the echo bounces off the walls and reveals them briefly. Try it now!' :
            tutStep === 1 ? 'Each surface lights up differently. Metal is bright white-blue, wood is warm brown, glass is faint cyan. The brighter the glow, the more sound it reflects. Click a few times and notice the differences.' :
            tutStep === 2 ? 'Use WASD to walk forward/backward and turn. The goal is the golden sphere — find it using only sonar pulses. When you get close, you\'ll hear a faster beeping.' :
            'A pedestrian is walking around. You\'ll hear footsteps and see a faint glow moving between pulses. Avoid bumping into them! Find the goal to complete the tutorial.'
          ),
          h('button', {
            onClick: function() { upd('tutStep', Math.min(tutStep + 1, 3)); },
            style: { padding: '6px 14px', borderRadius: '6px', background: '#6366f1', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
          }, tutStep < 3 ? 'Next Step \u2192' : 'Got it!')
        ),

        // ── 3D viewport + minimap ──
        has3D ? h('div', { style: { position: 'relative', width: '100%', flex: 1, minHeight: '400px' } },
          // 3D mount point
          h('div', {
            ref: mountRef,
            style: { width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000' },
            tabIndex: 0,
            onKeyDown: function(e) {
              if (e.code === 'Space') { e.preventDefault(); emitClick(); }
              keysRef.current[e.code] = true;
            },
            onKeyUp: function(e) { keysRef.current[e.code] = false; }
          }),
          // Minimap (corner overlay)
          h('canvas', {
            ref: canvasRef,
            style: { position: 'absolute', bottom: '12px', right: '12px', width: '180px', height: '180px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.4)', background: 'rgba(8,8,16,0.85)', pointerEvents: 'none', zIndex: 10 }
          }),
          // HUD overlay
          h('div', { style: { position: 'absolute', top: '8px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textShadow: '0 1px 4px #000', zIndex: 10, pointerEvents: 'none' } },
            h('span', null, 'Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + bumps + '  |  Goals: ' + goalsFound),
            h('span', null, viewMode === 'echo' ? 'ECHO VISION' : viewMode === 'audio' ? 'AUDIO ONLY' : 'REVEAL'),
            h('span', null, envType.toUpperCase())
          ),
          // Crosshair (center of 3D viewport)
          viewMode !== 'reveal' && h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '24px', height: '24px', pointerEvents: 'none', zIndex: 10 } },
            h('div', { style: { position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'rgba(120,180,255,0.35)', transform: 'translateY(-50%)' } }),
            h('div', { style: { position: 'absolute', left: '50%', top: '0', bottom: '0', width: '2px', background: 'rgba(120,180,255,0.35)', transform: 'translateX(-50%)' } })
          )
        ) :
        // ── 2D fallback canvas (for envs without 3D) ──
        h('canvas', {
          ref: canvasRef,
          role: 'application',
          'aria-label': 'Echo navigation area. WASD to move, arrows to turn, Space to click.',
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
          h('span', null, '\uD83C\uDFAE WASD: Move' + (has3D ? ' | Q/E: Strafe | Mouse: Look' : '/Arrows: Turn')),
          h('span', null, has3D ? 'Click viewport: Engage mouse-look | Click again: Sonar pulse' : 'Space: Click'),
          h('span', null, '\uD83C\uDFA7 Headphones required'),
          h('span', null, '\u2B50 Find the goal using echoes'),
          has3D && agentsRef.current && agentsRef.current.length > 0 && h('span', { style: { color: '#f59e0b' } },
            '\uD83D\uDEB6 ' + agentsRef.current.filter(function(a) { return a.kind === 'pedestrian'; }).length + ' pedestrians' +
            ' \uD83D\uDE97 ' + agentsRef.current.filter(function(a) { return a.kind === 'car'; }).length + ' cars' +
            (agentsRef.current.some(function(a) { return a.kind === 'bat'; }) ? ' \uD83E\uDD87 bats' : '')),
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
