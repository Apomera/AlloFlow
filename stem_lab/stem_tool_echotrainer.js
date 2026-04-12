// ═══════════════════════════════════════════
// stem_tool_echotrainer.js — Echo Navigator: 3D Spatial Audio Echolocation Trainer
// First-person 3D navigation using HRTF binaural spatial audio + Three.js.
// Students emit sonar clicks and listen for echoes off virtual walls, objects,
// and moving agents (pedestrians, cars, bats) to build a mental map.
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
  var ENV_3D_READY = { urban: true, cave: true, simple_room: true };

  // ── Environment presets ──
  var ENVIRONMENTS = [
    { id: 'simple_room', name: 'Simple Room', icon: '\uD83C\uDFE0', desc: 'A rectangular room with one pillar. Good for beginners.', complexity: 1 },
    { id: 'cave', name: 'Cave System', icon: '\uD83E\uDD87', desc: 'Irregular walls, stalactites, and narrow passages.', complexity: 2 },
    { id: 'corridor', name: 'Corridor Maze', icon: '\uD83C\uDFDB\uFE0F', desc: 'Hallways and turns \u2014 can you find the exit?', complexity: 3 },
    { id: 'forest', name: 'Forest Path', icon: '\uD83C\uDF32', desc: 'Trees and rocks in an open space. Materials vary.', complexity: 2 },
    { id: 'urban', name: 'Urban Street', icon: '\uD83C\uDFD9\uFE0F', desc: 'Buildings, metal posts, glass, moving pedestrians and cars.', complexity: 3 },
    { id: 'challenge', name: 'Random Challenge', icon: '\uD83C\uDFB2', desc: 'Procedurally generated. Every attempt is unique.', complexity: 4 }
  ];

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

  // ══════════════════════════════════════════════════════════
  // AGENT GENERATOR — Moving entities (pedestrians, cars, bats)
  // ══════════════════════════════════════════════════════════
  function generateAgents(type, seed, map) {
    var rng = seededRng(seed + 7777);
    var agents = [];

    if (type === 'urban') {
      // 4 pedestrians on sidewalk waypoints around perimeter
      var pedWaypoints = [
        [{ x: 60, y: 60 }, { x: 60, y: 740 }, { x: 200, y: 740 }, { x: 200, y: 60 }],
        [{ x: 740, y: 60 }, { x: 740, y: 740 }, { x: 600, y: 740 }, { x: 600, y: 60 }],
        [{ x: 60, y: 60 }, { x: 300, y: 60 }, { x: 300, y: 200 }, { x: 60, y: 200 }],
        [{ x: 500, y: 740 }, { x: 740, y: 740 }, { x: 740, y: 600 }, { x: 500, y: 600 }]
      ];
      for (var pdi = 0; pdi < 4; pdi++) {
        var wp = pedWaypoints[pdi];
        var startIdx = Math.floor(rng() * wp.length);
        agents.push({
          id: 'ped_' + pdi,
          kind: 'pedestrian',
          x: wp[startIdx].x,
          y: wp[startIdx].y,
          targetIdx: (startIdx + 1) % wp.length,
          waypoints: wp,
          speed: 25 + rng() * 15,
          loop: true,
          radius: 10,
          mat: 'flesh',
          ref: 0.6,
          height: 1.7
        });
      }
      // 3 cars on lanes
      var carLanes = [
        { waypoints: [{ x: 20, y: 380 }, { x: 780, y: 380 }], speed: 80 + rng() * 40 },
        { waypoints: [{ x: 780, y: 420 }, { x: 20, y: 420 }], speed: 70 + rng() * 50 },
        { waypoints: [{ x: 380, y: 20 }, { x: 380, y: 780 }], speed: 60 + rng() * 40 }
      ];
      for (var cri = 0; cri < 3; cri++) {
        var lane = carLanes[cri];
        agents.push({
          id: 'car_' + cri,
          kind: 'car',
          x: lane.waypoints[0].x,
          y: lane.waypoints[0].y,
          targetIdx: 1,
          waypoints: lane.waypoints,
          speed: lane.speed,
          loop: true,
          radius: 20,
          mat: 'car',
          ref: 0.85,
          height: 1.2
        });
      }
    } else if (type === 'cave') {
      // 3 bats flying in circular loops
      for (var bti = 0; bti < 3; bti++) {
        var bcx = 200 + rng() * 400, bcy = 200 + rng() * 400;
        var brad = 60 + rng() * 100;
        var bwp = [];
        for (var bsi = 0; bsi < 8; bsi++) {
          var ba = (bsi / 8) * Math.PI * 2;
          bwp.push({ x: bcx + Math.cos(ba) * brad, y: bcy + Math.sin(ba) * brad });
        }
        agents.push({
          id: 'bat_' + bti,
          kind: 'bat',
          x: bwp[0].x,
          y: bwp[0].y,
          targetIdx: 1,
          waypoints: bwp,
          speed: 50 + rng() * 40,
          loop: true,
          radius: 6,
          mat: 'flesh',
          ref: 0.4,
          height: 0.3
        });
      }
    } else if (type === 'simple_room') {
      // 1 slow pedestrian for tutorial
      agents.push({
        id: 'ped_tut',
        kind: 'pedestrian',
        x: 300,
        y: 400,
        targetIdx: 1,
        waypoints: [{ x: 300, y: 400 }, { x: 500, y: 400 }, { x: 500, y: 600 }, { x: 300, y: 600 }],
        speed: 20,
        loop: true,
        radius: 10,
        mat: 'flesh',
        ref: 0.6,
        height: 1.7
      });
    }
    return agents;
  }

  // ── Update agent positions (move toward current waypoint, cycle) ──
  function updateAgents(agents, dt, map) {
    for (var ai = 0; ai < agents.length; ai++) {
      var ag = agents[ai];
      if (!ag.waypoints || ag.waypoints.length === 0) continue;
      var target = ag.waypoints[ag.targetIdx];
      var ddx = target.x - ag.x;
      var ddy = target.y - ag.y;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < 5) {
        // Reached waypoint
        if (ag.loop) {
          ag.targetIdx = (ag.targetIdx + 1) % ag.waypoints.length;
        } else if (ag.targetIdx < ag.waypoints.length - 1) {
          ag.targetIdx++;
        } else {
          // Reverse
          ag.waypoints.reverse();
          ag.targetIdx = 1;
        }
      } else {
        var moveAmt = Math.min(ag.speed * dt, dist);
        ag.x += (ddx / dist) * moveAmt;
        ag.y += (ddy / dist) * moveAmt;
        // Clamp within map bounds
        ag.x = Math.max(30, Math.min(map.W - 30, ag.x));
        ag.y = Math.max(30, Math.min(map.H - 30, ag.y));
      }
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3D SCENE BUILDER (Three.js)
  // ══════════════════════════════════════════════════════════
  function build3DScene(THREE, map, agents) {
    var SCALE = 0.05; // 1 world unit = 0.05 map px → 800px = 40 units
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 8, 40);

    // Near-invisible ambient light
    var ambient = new THREE.AmbientLight(0xffffff, 0.02);
    scene.add(ambient);

    // Dark floor plane
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

    // Helper: get glow color for a material
    function getGlowBase(matName) {
      var gc = GLOW_COLORS[matName] || GLOW_COLORS.concrete;
      return new THREE.Color(gc[0] / 255, gc[1] / 255, gc[2] / 255);
    }

    // ── Build walls ──
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
      // Position: center of wall segment
      var midX = ((w.x1 + w.x2) / 2) * SCALE;
      var midZ = ((w.y1 + w.y2) / 2) * SCALE;
      wMesh.position.set(midX, wallHeight / 2, midZ);
      // Rotate to match wall direction
      var angle = Math.atan2(dy, dx);
      wMesh.rotation.y = -angle;
      wMesh.userData = {
        mapX: (w.x1 + w.x2) / 2,
        mapY: (w.y1 + w.y2) / 2,
        ref: w.ref,
        mat: w.mat,
        glowUntil: 0,
        glowAmt: 0,
        kind: 'wall'
      };
      scene.add(wMesh);
      meshes.push(wMesh);
    }

    // ── Build objects ──
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
      oMesh.userData = {
        mapX: obj.x,
        mapY: obj.y,
        ref: obj.ref,
        mat: obj.mat,
        glowUntil: 0,
        glowAmt: 0,
        kind: 'object',
        isGoal: !!obj.isGoal
      };
      scene.add(oMesh);
      meshes.push(oMesh);
    }

    // ── Build agent meshes ──
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
      } else {
        // pedestrian
        var pedGeo = new THREE.BoxGeometry(0.5, 1.7, 0.5);
        var pedMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        pedMat.userData = { baseColor: getGlowBase('flesh'), ref: ag.ref, mat: 'flesh' };
        aMesh = new THREE.Mesh(pedGeo, pedMat);
        aMesh.position.set(ag.x * SCALE, 0.85, ag.y * SCALE);
      }
      aMesh.userData = {
        mapX: ag.x,
        mapY: ag.y,
        ref: ag.ref,
        mat: ag.mat,
        glowUntil: 0,
        glowAmt: 0,
        kind: 'agent',
        agentKind: ag.kind,
        agentId: ag.id
      };
      scene.add(aMesh);
      meshes.push(aMesh);
      agentMeshes.push({ mesh: aMesh, agent: ag });
    }

    return { scene: scene, meshes: meshes, agentMeshes: agentMeshes, SCALE: SCALE, ambient: ambient };
  }

  // ══════════════════════════════════════════════════════════
  // RAY-SEGMENT INTERSECTION
  // ══════════════════════════════════════════════════════════
  function rayHit(px, py, dx, dy, x1, y1, x2, y2) {
    var sx = x2 - x1, sy = y2 - y1;
    var denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 0.0001) return -1;
    var t = ((x1 - px) * sy - (y1 - py) * sx) / denom;
    var u = ((x1 - px) * dy - (y1 - py) * dx) / denom;
    if (t > 0.5 && u >= 0 && u <= 1) return t;
    return -1;
  }

  // ══════════════════════════════════════════════════════════
  // WALL COLLISION CHECK
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // TUTORIAL STEPS (simple_room only)
  // ══════════════════════════════════════════════════════════
  var TUTORIAL_STEPS = [
    { title: 'The World Is Dark', text: 'The world is pitch-black. Press SPACE (or click the Click button) to emit a sonar click. Listen for echoes bouncing off nearby surfaces. Each echo tells you where something is.' },
    { title: 'Materials Glow Differently', text: 'Each surface lights up differently when hit by sonar. Metal is bright white-blue, wood is warm brown, concrete is cool blue, glass is faint teal. Brighter glow = stronger echo.' },
    { title: 'Move Toward the Goal', text: 'Use WASD to walk (or arrow keys to turn). The goal is a golden sphere somewhere in the room. As you get closer, you will hear a proximity beep that gets faster.' },
    { title: 'Watch for Moving Entities', text: 'A pedestrian is walking around the room. You will hear a faint tone and see a subtle glow from their body. In Urban mode, cars are dangerous \u2014 avoid them!' }
  ];

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
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
      { id: 'cross_urban', label: 'Survive Urban Street without a car hit', icon: '\uD83D\uDE97', check: function(d) { return !!d.urbanNoCarHit; }, progress: function(d) { return d.urbanNoCarHit ? 'Done!' : 'Not yet'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;
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
      var viewMode = d.viewMode || 'echo'; // 'echo' | 'audio' | 'reveal'
      var goalsFound = d.goalsFound || 0;
      var blindWins = d.blindWins || 0;
      var clicks = d.clicks || 0;
      var hasRevealed = d.hasRevealed || false;
      var bumps = d.bumps || 0;
      var multiBounce = d.multiBounce || false;
      var tutStep = d.tutStep || 0;

      var has3D = !!(window.THREE) && !!ENV_3D_READY[envType];

      // ── Refs ──
      var audioRef = useRef(null);
      var mapRef = useRef(null);
      var agentsRef = useRef([]);
      var playerRef = useRef({ x: 400, y: 700, angle: -Math.PI / 2 });
      var canvasRef = useRef(null);
      var mountRef = useRef(null);
      var animRef = useRef(null);
      var keysRef = useRef({});
      var pulsesRef = useRef([]); // active sonar pulses
      var agentOscRef = useRef([]); // agent audio oscillators
      var rendererRef = useRef(null);
      var sceneDataRef = useRef(null);
      var pointerLockedRef = useRef(false);
      var yawRef = useRef(-Math.PI / 2);
      var pitchRef = useRef(0);
      var carHitRef = useRef(false);
      var goalFoundRef = useRef(false);

      // ── Initialize map + agents ──
      if (!mapRef.current || mapRef.current.seed !== seed || mapRef.current.type !== envType) {
        mapRef.current = generateEnvironment(envType, seed);
        agentsRef.current = generateAgents(envType, seed, mapRef.current);
        playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
        yawRef.current = -Math.PI / 2;
        pitchRef.current = 0;
        carHitRef.current = false;
        goalFoundRef.current = !!d.goalFoundThisRun;
      }

      // ══════════════════════════════════════════
      // AUDIO SYSTEM — HRTF spatial echolocation
      // ══════════════════════════════════════════
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

        updMulti({ clicks: (d.clicks || 0) + 1 });
        if (window._alloHaptic) window._alloHaptic('echo');

        // Spawn visual sonar pulse for echo/3D mode
        if (has3D || viewMode === 'echo') {
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

        // Cast rays (fan of 120 degrees in facing direction)
        var numRays = 32;
        var fan = Math.PI * 0.67;
        var startA = player.angle - fan / 2;
        var stepA = fan / (numRays - 1);

        // Combine static obstacles + agents for ray-casting
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
            var roundTrip = minDist * 2 * 0.1; // px to meters (1px = 0.1m)
            var delaySec = Math.min(0.6, roundTrip / SPEED_OF_SOUND);
            var atten = Math.min(1, 40 / (minDist + 5)) * hitRef;
            var filterHz = hitMat === 'metal' ? 6000 : hitMat === 'glass' ? 7000 : hitMat === 'concrete' ? 4000 : hitMat === 'rock' ? 3500 : hitMat === 'wood' ? 2000 : hitMat === 'goal' ? 5000 : hitMat === 'car' ? 4500 : hitMat === 'flesh' ? 2500 : 3000;

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

            // Multi-bounce secondary rays
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

      // ══════════════════════════════════════════════════════════
      // 3D RENDER LOOP (useEffect)
      // ══════════════════════════════════════════════════════════
      useEffect(function() {
        if (!has3D || !mountRef.current) return;
        var THREE = window.THREE;
        if (!THREE) return;

        var map = mapRef.current;
        var agents = agentsRef.current;
        var player = playerRef.current;
        if (!map) return;

        // Build scene
        var sd = build3DScene(THREE, map, agents);
        sceneDataRef.current = sd;
        var SCALE = sd.SCALE;

        // Camera
        var camera = new THREE.PerspectiveCamera(75, 1, 0.1, 120);
        camera.position.set(player.x * SCALE, 1.5, player.y * SCALE);

        // Renderer
        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        var container = mountRef.current;
        var rw = container.clientWidth || 700;
        var rh = container.clientHeight || 450;
        renderer.setSize(rw, rh);
        camera.aspect = rw / rh;
        camera.updateProjectionMatrix();
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.borderRadius = '12px';
        renderer.domElement.style.outline = 'none';
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Pointer lock
        var isLocked = false;
        function onPointerLockChange() {
          isLocked = (document.pointerLockElement === renderer.domElement);
          pointerLockedRef.current = isLocked;
        }
        document.addEventListener('pointerlockchange', onPointerLockChange);

        function onCanvasClick() {
          if (!isLocked) {
            try { renderer.domElement.requestPointerLock(); } catch(e) {}
          } else {
            emitClick();
          }
        }
        renderer.domElement.addEventListener('click', onCanvasClick);

        // Mouse look
        function onMouseMove(e) {
          if (!isLocked) return;
          var sensitivity = 0.002;
          yawRef.current -= e.movementX * sensitivity;
          pitchRef.current -= e.movementY * sensitivity;
          pitchRef.current = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, pitchRef.current));
        }
        document.addEventListener('mousemove', onMouseMove);

        // Keyboard
        function onKeyDown(e) {
          keysRef.current[e.code] = true;
          if (e.code === 'Space') { e.preventDefault(); emitClick(); }
        }
        function onKeyUp(e) { keysRef.current[e.code] = false; }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Agent audio oscillators
        var agentSounds = [];
        try {
          var audio = initAudio();
          if (audio && audio.ctx) {
            var ac = audio.ctx;
            for (var asi = 0; asi < agents.length; asi++) {
              var ag = agents[asi];
              var osc = ac.createOscillator();
              var gn = ac.createGain();
              var pan = ac.createPanner();
              pan.panningModel = 'HRTF';
              pan.distanceModel = 'inverse';
              pan.refDistance = 1;
              pan.maxDistance = 60;
              pan.rolloffFactor = 1.5;
              if (ag.kind === 'car') {
                osc.type = 'sawtooth';
                osc.frequency.value = 55;
                gn.gain.value = 0.025;
              } else if (ag.kind === 'bat') {
                osc.type = 'sine';
                osc.frequency.value = 3200;
                gn.gain.value = 0.006;
              } else {
                osc.type = 'triangle';
                osc.frequency.value = 200;
                gn.gain.value = 0.008;
              }
              osc.connect(gn);
              gn.connect(pan);
              pan.connect(ac.destination);
              osc.start();
              agentSounds.push({ osc: osc, gain: gn, panner: pan, agent: ag });
            }
          }
        } catch(e) {}
        agentOscRef.current = agentSounds;

        // Animation state
        var running = true;
        var lastTime = performance.now();
        var goalCheckTimer = 0;
        var bumpFlash = 0;

        function loop(now) {
          if (!running) return;
          animRef.current = requestAnimationFrame(loop);

          var dt = Math.min(0.05, (now - lastTime) / 1000);
          lastTime = now;

          var keys = keysRef.current;
          var currentViewMode = d.viewMode || 'echo';

          // ── Movement (WASD + Q/E strafe) ──
          var ms = 180; // map px per second
          var turnSpeed = 2.0;

          // If not pointer-locked, arrows rotate
          if (!isLocked) {
            if (keys['ArrowLeft']) yawRef.current += turnSpeed * dt;
            if (keys['ArrowRight']) yawRef.current -= turnSpeed * dt;
          }
          player.angle = yawRef.current;

          var fdx = Math.cos(player.angle);
          var fdy = Math.sin(player.angle);
          var rdxS = Math.cos(player.angle + Math.PI / 2);
          var rdyS = Math.sin(player.angle + Math.PI / 2);

          var moved = false;
          var moveX = 0, moveY = 0;
          if (keys['KeyW'] || keys['ArrowUp']) { moveX += fdx; moveY += fdy; }
          if (keys['KeyS'] || keys['ArrowDown']) { moveX -= fdx; moveY -= fdy; }
          if (keys['KeyQ']) { moveX -= rdxS; moveY -= rdyS; }
          if (keys['KeyE'] || keys['KeyD']) { moveX += rdxS; moveY += rdyS; }
          if (keys['KeyA']) { moveX -= rdxS; moveY -= rdyS; }

          if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
            var mLen = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX = (moveX / mLen) * ms * dt;
            moveY = (moveY / mLen) * ms * dt;
            var nx = player.x + moveX, ny = player.y + moveY;
            if (canMoveTo(nx, ny, map)) {
              player.x = nx;
              player.y = ny;
              moved = true;
            } else {
              // Bump
              if (bumpFlash <= 0) {
                bumpFlash = 0.3;
                updMulti({ bumps: (d.bumps || 0) + 1 });
                if (window._alloHaptic) window._alloHaptic('bump');
                try {
                  var bac = audioRef.current && audioRef.current.ctx;
                  if (bac) { var bo = bac.createOscillator(); var bg = bac.createGain(); bo.type = 'sine'; bo.frequency.value = 120; bg.gain.setValueAtTime(0.08, bac.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, bac.currentTime + 0.1); bo.connect(bg); bg.connect(bac.destination); bo.start(); bo.stop(bac.currentTime + 0.1); }
                } catch(e) {}
              }
            }
          }

          // ── Update agents ──
          updateAgents(agents, dt, map);

          // ── Agent collision detection ──
          for (var aci = 0; aci < agents.length; aci++) {
            var ag = agents[aci];
            var adx = player.x - ag.x, ady = player.y - ag.y;
            var adist = Math.sqrt(adx * adx + ady * ady);
            var hitRadius = ag.kind === 'car' ? 25 : ag.kind === 'bat' ? 8 : 15;
            if (adist < hitRadius) {
              if (ag.kind === 'car' && bumpFlash <= 0) {
                bumpFlash = 0.5;
                carHitRef.current = true;
                updMulti({ bumps: (d.bumps || 0) + 3 });
                if (addToast) addToast('\uD83D\uDE97 Hit by a car! -3 bumps penalty', 'error');
                if (announceToSR) announceToSR('Hit by a car! 3 bump penalty.');
                if (window._alloHaptic) window._alloHaptic('bump');
                try {
                  var cac = audioRef.current && audioRef.current.ctx;
                  if (cac) { var co = cac.createOscillator(); var cg = cac.createGain(); co.type = 'sawtooth'; co.frequency.value = 180; cg.gain.setValueAtTime(0.12, cac.currentTime); cg.gain.exponentialRampToValueAtTime(0.001, cac.currentTime + 0.3); co.connect(cg); cg.connect(cac.destination); co.start(); co.stop(cac.currentTime + 0.3); }
                } catch(e) {}
              } else if (ag.kind === 'pedestrian' && bumpFlash <= 0) {
                bumpFlash = 0.2;
                updMulti({ bumps: (d.bumps || 0) + 1 });
                if (addToast) addToast('\uD83D\uDEB6 Bumped into a pedestrian!', 'warn');
                if (announceToSR) announceToSR('Bumped into a pedestrian.');
                if (window._alloHaptic) window._alloHaptic('bump');
              }
            }
          }

          // ── Update agent mesh positions ──
          for (var ami = 0; ami < sd.agentMeshes.length; ami++) {
            var am = sd.agentMeshes[ami];
            var amAg = am.agent;
            am.mesh.position.x = amAg.x * SCALE;
            am.mesh.position.z = amAg.y * SCALE;
            am.mesh.userData.mapX = amAg.x;
            am.mesh.userData.mapY = amAg.y;
          }

          // ── Update agent audio panner positions ──
          for (var sai = 0; sai < agentSounds.length; sai++) {
            var asnd = agentSounds[sai];
            var sag = asnd.agent;
            var relX = (sag.x - player.x) * 0.01;
            var relZ = (sag.y - player.y) * 0.01;
            var cosP = Math.cos(-player.angle), sinP = Math.sin(-player.angle);
            asnd.panner.positionX.value = relX * cosP - relZ * sinP;
            asnd.panner.positionY.value = (sag.kind === 'bat' ? 1.5 : 0);
            asnd.panner.positionZ.value = relX * sinP + relZ * cosP;
          }

          // ── Sonar pulse glow logic ──
          var activePulses = [];
          var nowMs = Date.now();
          for (var spi = 0; spi < pulsesRef.current.length; spi++) {
            var pulse = pulsesRef.current[spi];
            var age = (nowMs - pulse.birth) / 1000;
            var pulseRadiusPx = age * SPEED_OF_SOUND * 0.5;
            var pulseIntensity = Math.max(0, 1 - age * 1.5);
            if (pulseIntensity <= 0) continue;
            activePulses.push(pulse);

            for (var mi = 0; mi < sd.meshes.length; mi++) {
              var mesh = sd.meshes[mi];
              var mData = mesh.userData;
              if (mData.kind === 'floor') continue;
              var mdx = mData.mapX - pulse.x;
              var mdy = mData.mapY - pulse.y;
              var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
              var band = (mData.kind === 'agent') ? 25 : 20;
              if (Math.abs(mDist - pulseRadiusPx) < band) {
                var bandFade = 1 - Math.abs(mDist - pulseRadiusPx) / band;
                var glow = pulseIntensity * bandFade * (mData.ref || 0.5);
                if (glow > mData.glowAmt) {
                  mData.glowAmt = glow;
                }
              }
            }
          }
          pulsesRef.current = activePulses;

          // ── Glow decay ──
          for (var gdi = 0; gdi < sd.meshes.length; gdi++) {
            var gm = sd.meshes[gdi];
            if (gm.userData.glowAmt > 0) {
              gm.userData.glowAmt = Math.max(0, gm.userData.glowAmt - 1.2 * dt);
            }
          }

          // ── Agent ambient glow (faint self-illumination) ──
          var sinePulse = Math.sin(now * 0.003) * 0.05;
          for (var agl = 0; agl < sd.agentMeshes.length; agl++) {
            var agMesh = sd.agentMeshes[agl];
            var agKind = agMesh.agent.kind;
            var baseGlow = agKind === 'car' ? 0.32 : agKind === 'pedestrian' ? 0.18 : 0.1;
            var ambientGlow = baseGlow + sinePulse;
            if (ambientGlow > agMesh.mesh.userData.glowAmt) {
              agMesh.mesh.userData.glowAmt = ambientGlow;
            }
          }

          // ── Material color application ──
          for (var mci = 0; mci < sd.meshes.length; mci++) {
            var cm = sd.meshes[mci];
            var cmMat = cm.material;
            var cmUD = cmMat.userData;
            if (!cmUD || !cmUD.baseColor) continue;

            if (currentViewMode === 'reveal') {
              cmMat.color.copy(cmUD.baseColor);
            } else if (currentViewMode === 'audio') {
              cmMat.color.setHex(0x000000);
            } else {
              // echo mode
              var ga = cm.userData.glowAmt || 0;
              cmMat.color.setRGB(
                cmUD.baseColor.r * ga,
                cmUD.baseColor.g * ga,
                cmUD.baseColor.b * ga
              );
            }
          }

          // ── Floor color ──
          if (currentViewMode === 'reveal') {
            sd.scene.children[2].material.color.setHex(0x1a1a2e); // floor
          } else {
            sd.scene.children[2].material.color.setHex(0x000000);
          }

          // ── Ambient light + fog adjustment ──
          sd.ambient.intensity = currentViewMode === 'reveal' ? 0.7 : 0.02;
          sd.scene.fog.far = currentViewMode === 'reveal' ? 100 : 40;

          // ── Camera ──
          camera.position.set(player.x * SCALE, 1.5, player.y * SCALE);
          var lookX = player.x * SCALE + Math.cos(yawRef.current) * Math.cos(pitchRef.current);
          var lookY = 1.5 + Math.sin(pitchRef.current);
          var lookZ = player.y * SCALE + Math.sin(yawRef.current) * Math.cos(pitchRef.current);
          camera.lookAt(lookX, lookY, lookZ);

          // ── Bump flash via box-shadow ──
          if (bumpFlash > 0) {
            bumpFlash -= dt;
            var flashOpacity = Math.min(1, bumpFlash * 3);
            renderer.domElement.style.boxShadow = 'inset 0 0 60px rgba(239,68,68,' + (flashOpacity * 0.6) + ')';
          } else {
            renderer.domElement.style.boxShadow = 'none';
          }

          // ── Goal proximity beeping ──
          goalCheckTimer++;
          if (goalCheckTimer % 10 === 0) {
            map.objects.forEach(function(o) {
              if (!o.isGoal || goalFoundRef.current) return;
              var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gdist < 200) {
                var interval = Math.max(8, Math.floor(gdist / 3));
                if (goalCheckTimer % interval === 0) {
                  var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600;
                  try {
                    var pac = audioRef.current && audioRef.current.ctx;
                    if (pac) { var po = pac.createOscillator(); var pg = pac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, pac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, pac.currentTime + 0.05); po.connect(pg); pg.connect(pac.destination); po.start(); po.stop(pac.currentTime + 0.05); }
                  } catch(e) {}
                  if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                }
              }
            });
          }

          // ── Goal contact detection ──
          if (goalCheckTimer % 15 === 0 && !goalFoundRef.current) {
            map.objects.forEach(function(o) {
              if (!o.isGoal) return;
              var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
              if (gd < o.r + 12) {
                goalFoundRef.current = true;
                var isAudioOnly = (currentViewMode === 'audio');
                var newGoals = goalsFound + 1;
                var newBlinds = isAudioOnly ? blindWins + 1 : blindWins;
                var updateObj = { goalFoundThisRun: true, goalsFound: newGoals, blindWins: newBlinds };
                // Urban no-car-hit quest
                if (envType === 'urban' && !carHitRef.current) {
                  updateObj.urbanNoCarHit = true;
                }
                updMulti(updateObj);

                var baseXP = isAudioOnly ? 30 : (currentViewMode === 'echo' ? 20 : 10);
                var bumpPenalty = Math.min(baseXP - 5, d.bumps || 0);
                var finalXP = Math.max(5, baseXP - bumpPenalty);
                var modeLabel = currentViewMode === 'audio' ? 'Audio-only' : currentViewMode === 'echo' ? 'Echo Vision' : 'Revealed';

                if (addToast) addToast('\uD83C\uDFC6 Goal found! ' + (d.clicks || 0) + ' clicks, ' + (d.bumps || 0) + ' bumps \u2192 ' + finalXP + ' XP (' + modeLabel + ')', 'success');
                if (window._alloHaptic) window._alloHaptic('achieve');
                if (awardXP) awardXP('echoTrainer', finalXP, modeLabel + ': ' + (d.bumps || 0) + ' bumps');
                if (announceToSR) announceToSR('Goal found! ' + finalXP + ' XP earned. ' + (d.bumps || 0) + ' wall bumps. ' + modeLabel + ' mode.');
              }
            });
          }

          // ── Resize check ──
          var cw = container.clientWidth || 700;
          var ch = container.clientHeight || 450;
          if (renderer.domElement.width !== cw || renderer.domElement.height !== ch) {
            renderer.setSize(cw, ch);
            camera.aspect = cw / ch;
            camera.updateProjectionMatrix();
          }

          renderer.render(sd.scene, camera);
        }

        animRef.current = requestAnimationFrame(loop);

        // Cleanup
        return function() {
          running = false;
          if (animRef.current) cancelAnimationFrame(animRef.current);
          // Stop agent oscillators
          for (var osi = 0; osi < agentSounds.length; osi++) {
            try { agentSounds[osi].osc.stop(); } catch(e) {}
          }
          agentOscRef.current = [];
          // Dispose renderer
          if (renderer) {
            try { renderer.dispose(); } catch(e) {}
            if (renderer.domElement && renderer.domElement.parentNode) {
              renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
          }
          rendererRef.current = null;
          sceneDataRef.current = null;
          // Exit pointer lock
          if (document.pointerLockElement) {
            try { document.exitPointerLock(); } catch(e) {}
          }
          // Remove listeners
          document.removeEventListener('pointerlockchange', onPointerLockChange);
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('keyup', onKeyUp);
        };
      }, [seed, envType, has3D, viewMode]);

      // ══════════════════════════════════════════════════════════
      // 2D MINIMAP / STANDALONE FALLBACK (useEffect)
      // ══════════════════════════════════════════════════════════
      useEffect(function() {
        if (!canvasRef.current) return;
        var canvas = canvasRef.current;
        var gfx = canvas.getContext('2d');
        var running = true;
        var goalCheckTimer2d = 0;

        function loop2d() {
          if (!running) return;
          requestAnimationFrame(loop2d);

          var map = mapRef.current;
          var player = playerRef.current;
          var agents = agentsRef.current;
          var keys = keysRef.current;
          if (!map) return;

          var isMinimap = has3D;
          var W, H, scale, ox, oy;

          if (isMinimap) {
            W = canvas.width = 200;
            H = canvas.height = 200;
            scale = Math.min(W / map.W, H / map.H);
            ox = 0; oy = 0;
          } else {
            W = canvas.width = canvas.clientWidth || 800;
            H = canvas.height = canvas.clientHeight || 400;
            scale = Math.min(W / map.W, H / map.H);
            ox = (W - map.W * scale) / 2;
            oy = (H - map.H * scale) / 2;

            // 2D movement logic
            var ms2 = 2.5, ts2 = 0.045;
            if (keys['ArrowLeft'] || keys['KeyA']) player.angle -= ts2;
            if (keys['ArrowRight'] || keys['KeyD']) player.angle += ts2;
            var fdx2 = Math.cos(player.angle) * ms2, fdy2 = Math.sin(player.angle) * ms2;
            if (keys['KeyW'] || keys['ArrowUp']) {
              var nx2 = player.x + fdx2, ny2 = player.y + fdy2;
              if (canMoveTo(nx2, ny2, map)) { player.x = nx2; player.y = ny2; }
              else if (!player._bumpCooldown) {
                player._bumpCooldown = 20;
                updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
                try { var bac = audioRef.current && audioRef.current.ctx; if (bac) { var bo = bac.createOscillator(); var bg = bac.createGain(); bo.type = 'sine'; bo.frequency.value = 120; bg.gain.setValueAtTime(0.08, bac.currentTime); bg.gain.exponentialRampToValueAtTime(0.001, bac.currentTime + 0.1); bo.connect(bg); bg.connect(bac.destination); bo.start(); bo.stop(bac.currentTime + 0.1); } } catch(e) {}
              }
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
              var nx3 = player.x - fdx2, ny3 = player.y - fdy2;
              if (canMoveTo(nx3, ny3, map)) { player.x = nx3; player.y = ny3; }
              else if (!player._bumpCooldown) {
                player._bumpCooldown = 20;
                updMulti({ bumps: (d.bumps || 0) + 1 }); if (window._alloHaptic) window._alloHaptic('bump');
                try { var bac2 = audioRef.current && audioRef.current.ctx; if (bac2) { var bo2 = bac2.createOscillator(); var bg2 = bac2.createGain(); bo2.type = 'sine'; bo2.frequency.value = 120; bg2.gain.setValueAtTime(0.08, bac2.currentTime); bg2.gain.exponentialRampToValueAtTime(0.001, bac2.currentTime + 0.1); bo2.connect(bg2); bg2.connect(bac2.destination); bo2.start(); bo2.stop(bac2.currentTime + 0.1); } } catch(e) {}
              }
            }
            if (player._bumpCooldown > 0) player._bumpCooldown--;

            // Update agents for 2D standalone
            updateAgents(agents, 1 / 60, map);
          }

          // ── Draw ──
          gfx.clearRect(0, 0, W, H);
          gfx.fillStyle = isMinimap ? 'rgba(8,8,16,0.85)' : '#080810';
          gfx.fillRect(0, 0, W, H);
          gfx.save();
          gfx.translate(ox, oy);
          gfx.scale(scale, scale);

          var currentViewMode2d = d.viewMode || 'echo';
          var showMap = isMinimap || currentViewMode2d === 'reveal';

          // Walls
          if (showMap) {
            gfx.lineWidth = isMinimap ? 2 : 3;
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

          // Agents as colored dots
          if (showMap || isMinimap) {
            for (var dai = 0; dai < agents.length; dai++) {
              var da = agents[dai];
              gfx.fillStyle = da.kind === 'car' ? '#ffc47c' : da.kind === 'bat' ? '#c4b5fd' : '#ff9c9c';
              gfx.beginPath();
              gfx.arc(da.x, da.y, isMinimap ? 5 : 8, 0, Math.PI * 2);
              gfx.fill();
            }
          }

          // Player trail (2D standalone only)
          if (!isMinimap) {
            if (!player._trail) player._trail = [];
            if (player._trail.length === 0 || Math.abs(player.x - player._trail[player._trail.length - 1].x) > 5 || Math.abs(player.y - player._trail[player._trail.length - 1].y) > 5) {
              player._trail.push({ x: player.x, y: player.y });
              if (player._trail.length > 200) player._trail.shift();
            }
            for (var ti2 = 0; ti2 < player._trail.length; ti2++) {
              var trailAlpha = (ti2 / player._trail.length) * 0.15;
              gfx.fillStyle = 'rgba(99,102,241,' + trailAlpha + ')';
              gfx.beginPath(); gfx.arc(player._trail[ti2].x, player._trail[ti2].y, 2, 0, Math.PI * 2); gfx.fill();
            }
          }

          // Echo Vision pulse visualization (2D)
          if ((currentViewMode2d === 'echo' || isMinimap) && pulsesRef.current.length > 0) {
            var nowEv = Date.now();
            pulsesRef.current.forEach(function(pulse) {
              var evAge = (nowEv - pulse.birth) / 1000;
              var evRadius = evAge * SPEED_OF_SOUND * 0.5;
              var evAlpha = Math.max(0, 1 - evAge * 1.5);
              if (evAlpha <= 0) return;

              gfx.strokeStyle = 'rgba(120,180,255,' + (evAlpha * 0.2) + ')';
              gfx.lineWidth = 2;
              gfx.beginPath();
              gfx.arc(pulse.x, pulse.y, evRadius, 0, Math.PI * 2);
              gfx.stroke();

              if (!isMinimap) {
                // Illuminate walls
                map.walls.forEach(function(w) {
                  var wx = w.x2 - w.x1, wy = w.y2 - w.y1;
                  var wl2 = wx * wx + wy * wy;
                  if (wl2 < 1) return;
                  for (var svi = 0; svi <= 4; svi++) {
                    var t2 = svi / 4;
                    var pvx = w.x1 + wx * t2, pvy = w.y1 + wy * t2;
                    var dx2 = pvx - pulse.x, dy2 = pvy - pulse.y;
                    var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    if (Math.abs(dist2 - evRadius) < 15) {
                      var intensity = evAlpha * w.ref * (1 - Math.abs(dist2 - evRadius) / 15);
                      var color = w.mat === 'metal' ? '200,220,255' : w.mat === 'wood' ? '180,140,80' : w.mat === 'glass' ? '150,220,255' : '100,160,220';
                      gfx.fillStyle = 'rgba(' + color + ',' + (intensity * 0.7) + ')';
                      gfx.beginPath();
                      gfx.arc(pvx, pvy, 6, 0, Math.PI * 2);
                      gfx.fill();
                    }
                  }
                });
                // Illuminate objects
                map.objects.forEach(function(o) {
                  var odx = o.x - pulse.x, ody = o.y - pulse.y;
                  var odist = Math.sqrt(odx * odx + ody * ody);
                  if (Math.abs(odist - evRadius) < o.r + 10) {
                    var oIntensity = evAlpha * o.ref * (1 - Math.abs(odist - evRadius) / (o.r + 10));
                    var oColor = o.isGoal ? '255,220,50' : o.mat === 'metal' ? '200,220,255' : '100,160,220';
                    gfx.fillStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.6) + ')';
                    gfx.beginPath();
                    gfx.arc(o.x, o.y, o.r + 3, 0, Math.PI * 2);
                    gfx.fill();
                    gfx.strokeStyle = 'rgba(' + oColor + ',' + (oIntensity * 0.9) + ')';
                    gfx.lineWidth = 2;
                    gfx.beginPath();
                    gfx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
                    gfx.stroke();
                  }
                });
                // Illuminate agents
                for (var eai = 0; eai < agents.length; eai++) {
                  var ea = agents[eai];
                  var eadx = ea.x - pulse.x, eady = ea.y - pulse.y;
                  var eadist = Math.sqrt(eadx * eadx + eady * eady);
                  if (Math.abs(eadist - evRadius) < ea.radius + 12) {
                    var eaInt = evAlpha * ea.ref * (1 - Math.abs(eadist - evRadius) / (ea.radius + 12));
                    var eaColor = ea.kind === 'car' ? '255,196,124' : ea.kind === 'bat' ? '196,181,253' : '255,156,156';
                    gfx.fillStyle = 'rgba(' + eaColor + ',' + (eaInt * 0.6) + ')';
                    gfx.beginPath();
                    gfx.arc(ea.x, ea.y, ea.radius + 3, 0, Math.PI * 2);
                    gfx.fill();
                  }
                }
              }
            });
          }

          // Bump flash (2D standalone)
          if (!isMinimap && player._bumpCooldown > 15) {
            gfx.fillStyle = 'rgba(239,68,68,' + ((player._bumpCooldown - 15) / 5 * 0.15) + ')';
            gfx.fillRect(0, 0, map.W, map.H);
          }

          // Player dot
          gfx.fillStyle = '#6366f1';
          gfx.beginPath(); gfx.arc(player.x, player.y, isMinimap ? 5 : 8, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#a5b4fc'; gfx.lineWidth = isMinimap ? 1 : 2;
          gfx.beginPath(); gfx.moveTo(player.x, player.y);
          gfx.lineTo(player.x + Math.cos(player.angle) * (isMinimap ? 12 : 22), player.y + Math.sin(player.angle) * (isMinimap ? 12 : 22));
          gfx.stroke();

          // FOV arc
          if (!isMinimap) {
            gfx.strokeStyle = 'rgba(99,102,241,0.15)'; gfx.lineWidth = 1;
            gfx.beginPath(); gfx.arc(player.x, player.y, 80, player.angle - 0.33 * Math.PI, player.angle + 0.33 * Math.PI); gfx.stroke();
          }

          // Compass rose (minimap or standalone)
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

          gfx.restore();

          // HUD (2D standalone only)
          if (!isMinimap) {
            gfx.fillStyle = 'rgba(0,0,0,0.6)'; gfx.fillRect(0, 0, W, 26);
            gfx.font = 'bold 11px monospace'; gfx.fillStyle = '#94a3b8'; gfx.textAlign = 'left';
            var modeLabel = currentViewMode2d === 'echo' ? 'ECHO VISION' : currentViewMode2d === 'audio' ? 'AUDIO ONLY \uD83C\uDFA7' : 'MAP VISIBLE';
            gfx.fillText('Echo Navigator  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + (d.bumps || 0) + '  |  Goals: ' + goalsFound + '  |  ' + modeLabel + '  |  ' + envType, 8, 17);

            // Goal proximity beeping (2D)
            goalCheckTimer2d++;
            if (goalCheckTimer2d % 10 === 0) {
              map.objects.forEach(function(o) {
                if (!o.isGoal || d.goalFoundThisRun) return;
                var gdist = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gdist < 200) {
                  var interval = Math.max(8, Math.floor(gdist / 3));
                  if (goalCheckTimer2d % interval === 0) {
                    var pingFreq = 800 + (1 - Math.min(1, gdist / 200)) * 600;
                    try { var ac = audioRef.current && audioRef.current.ctx; if (ac) { var po = ac.createOscillator(); var pg = ac.createGain(); po.type = 'sine'; po.frequency.value = pingFreq; pg.gain.setValueAtTime(0.04, ac.currentTime); pg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05); po.connect(pg); pg.connect(ac.destination); po.start(); po.stop(ac.currentTime + 0.05); } } catch(e) {}
                    if (window._alloHaptic && gdist < 80) window._alloHaptic('echo');
                  }
                }
              });
            }

            // Goal contact (2D)
            if (goalCheckTimer2d % 30 === 0 && !d.goalFoundThisRun) {
              map.objects.forEach(function(o) {
                if (!o.isGoal) return;
                var gd = Math.sqrt((player.x - o.x) * (player.x - o.x) + (player.y - o.y) * (player.y - o.y));
                if (gd < o.r + 12) {
                  var isAudioOnly2d = (currentViewMode2d === 'audio');
                  updMulti({ goalFoundThisRun: true, goalsFound: goalsFound + 1, blindWins: isAudioOnly2d ? blindWins + 1 : blindWins });
                  var baseXP2 = isAudioOnly2d ? 30 : (currentViewMode2d === 'echo' ? 20 : 10);
                  var bumpPenalty2 = Math.min(baseXP2 - 5, d.bumps || 0);
                  var finalXP2 = Math.max(5, baseXP2 - bumpPenalty2);
                  var modeLabel2 = currentViewMode2d === 'audio' ? 'Audio-only' : currentViewMode2d === 'echo' ? 'Echo Vision' : 'Map revealed';
                  if (addToast) addToast('\uD83C\uDFC6 Goal found! ' + (d.clicks || 0) + ' clicks, ' + (d.bumps || 0) + ' bumps \u2192 ' + finalXP2 + ' XP (' + modeLabel2 + ')', 'success');
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
      }, [seed, envType, has3D, viewMode]);

      // ── View mode cycling ──
      function cycleViewMode() {
        var modes = ['echo', 'audio', 'reveal'];
        var idx = modes.indexOf(d.viewMode || 'echo');
        var next = modes[(idx + 1) % modes.length];
        if (next === 'reveal') {
          upd('hasRevealed', true);
        }
        upd('viewMode', next);
        var labels = { echo: 'Echo Vision \u2014 sonar pulses illuminate surfaces', audio: 'Audio Only \u2014 pure darkness, hardest mode', reveal: 'Reveal \u2014 full visibility (debug/teacher mode)' };
        if (announceToSR) announceToSR('View mode: ' + labels[next]);
      }

      // ── Agent count text ──
      var agentCounts = [];
      var agts = agentsRef.current;
      var pedCount = 0, carCount = 0, batCount = 0;
      for (var aci2 = 0; aci2 < agts.length; aci2++) {
        if (agts[aci2].kind === 'pedestrian') pedCount++;
        else if (agts[aci2].kind === 'car') carCount++;
        else if (agts[aci2].kind === 'bat') batCount++;
      }
      if (pedCount > 0) agentCounts.push(pedCount + ' pedestrian' + (pedCount > 1 ? 's' : ''));
      if (carCount > 0) agentCounts.push(carCount + ' car' + (carCount > 1 ? 's' : ''));
      if (batCount > 0) agentCounts.push(batCount + ' bat' + (batCount > 1 ? 's' : ''));

      // ══════════════════════════════════════════════════════════
      // RENDER (React.createElement tree)
      // ══════════════════════════════════════════════════════════
      var viewModeLabel = (d.viewMode || 'echo') === 'echo' ? '\uD83C\uDF0A Echo' : (d.viewMode || 'echo') === 'audio' ? '\uD83C\uDFA7 Audio' : '\uD83D\uDC41 Reveal';
      var viewModeColor = (d.viewMode || 'echo') === 'echo' ? '#3b82f6' : (d.viewMode || 'echo') === 'audio' ? '#7c3aed' : '#ef4444';

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' } },

        // ── Back button + header ──
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() { if (setStemLabTool) setStemLabTool(null); },
            'aria-label': 'Back to STEM Lab',
            style: { background: isDark ? '#1e293b' : '#f1f5f9', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), borderRadius: '8px', padding: '6px 12px', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }
          }, ArrowLeft ? h(ArrowLeft, { size: 14 }) : '\u2190', ' STEM Lab'),
          h('div', { style: { fontSize: '18px', fontWeight: 900, color: isDark ? '#e2e8f0' : '#1e293b' } }, '\uD83C\uDFA7 Echo Navigator'),
          has3D ? h('span', { style: { fontSize: '10px', fontWeight: 800, color: '#3b82f6', background: isDark ? '#1e3a5f' : '#eff6ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #3b82f680' } }, '3D') : null,
          h('div', { style: { fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8', marginLeft: '8px' } }, 'Navigate by sound alone')
        ),

        // ── Safety disclaimer ──
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

        // ── Research section ──
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

        // ── Echolocation diagram SVG ──
        h('details', {
          open: !(d.goalsFound > 0),
          style: { marginBottom: '8px', borderRadius: '12px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), overflow: 'hidden' }
        },
          h('summary', {
            style: { padding: '10px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }
          }, '\uD83D\uDCDA How Echolocation Works'),
          h('div', { style: { padding: '12px 14px', background: isDark ? '#0f172a' : '#fff' } },
            h('svg', { viewBox: '0 0 500 160', width: '100%', height: 'auto', style: { maxHeight: '140px' }, 'aria-label': 'Diagram showing how echolocation works: a click travels to a wall, bounces back, and the time delay tells you the distance' },
              h('rect', { x: 0, y: 0, width: 500, height: 160, fill: isDark ? '#0f172a' : '#f8fafc', rx: 8 }),
              h('circle', { cx: 60, cy: 80, r: 18, fill: '#6366f1', opacity: 0.9 }),
              h('text', { x: 60, y: 85, textAnchor: 'middle', fontSize: '16', fill: '#fff' }, '\uD83C\uDFA7'),
              h('text', { x: 60, y: 115, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'You'),
              h('rect', { x: 410, y: 20, width: 12, height: 120, fill: '#475569', rx: 3 }),
              h('text', { x: 416, y: 155, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 700 }, 'Wall'),
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 2, opacity: 0.7 },
                h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', from: '0.7', to: '0', dur: '2s', repeatCount: 'indefinite' })
              ),
              h('circle', { cx: 80, cy: 70, r: 0, fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5, opacity: 0.5 },
                h('animate', { attributeName: 'r', from: '0', to: '160', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', from: '0.5', to: '0', dur: '2s', begin: '0.5s', repeatCount: 'indefinite' })
              ),
              h('circle', { cx: 410, cy: 70, r: 0, fill: 'none', stroke: '#22c55e', strokeWidth: 2, opacity: 0 },
                h('animate', { attributeName: 'r', from: '0', to: '180', dur: '2s', begin: '1s', repeatCount: 'indefinite' }),
                h('animate', { attributeName: 'opacity', values: '0;0.6;0', dur: '2s', begin: '1s', repeatCount: 'indefinite' })
              ),
              h('line', { x1: 90, y1: 68, x2: 200, y2: 68, stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowOut)' }),
              h('text', { x: 145, y: 62, textAnchor: 'middle', fontSize: '8', fill: '#a78bfa', fontWeight: 600 }, 'Click \u2192'),
              h('line', { x1: 390, y1: 92, x2: 280, y2: 92, stroke: '#4ade80', strokeWidth: 1.5, strokeDasharray: '4,3', markerEnd: 'url(#arrowBack)' }),
              h('text', { x: 335, y: 106, textAnchor: 'middle', fontSize: '8', fill: '#4ade80', fontWeight: 600 }, '\u2190 Echo'),
              h('rect', { x: 190, y: 125, width: 120, height: 24, rx: 6, fill: isDark ? '#1e293b' : '#f0f9ff', stroke: isDark ? '#334155' : '#bae6fd' }),
              h('text', { x: 250, y: 141, textAnchor: 'middle', fontSize: '9', fill: isDark ? '#7dd3fc' : '#0369a1', fontWeight: 700 }, 'Delay = Distance \u00d7 2 \u00f7 343 m/s'),
              h('defs', null,
                h('marker', { id: 'arrowOut', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' },
                  h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#a78bfa' })
                ),
                h('marker', { id: 'arrowBack', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' },
                  h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#4ade80' })
                )
              )
            ),
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

        // ── Environment selector ──
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          ENVIRONMENTS.map(function(env) {
            var active = envType === env.id;
            var is3D = !!ENV_3D_READY[env.id];
            return h('button', {
              key: env.id,
              'aria-label': env.name + ': ' + env.desc + (is3D ? ' (3D available)' : ''),
              'aria-pressed': active ? 'true' : 'false',
              onClick: function() {
                var newSeed = Math.floor(Math.random() * 999999);
                updMulti({ envType: env.id, seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0 });
                mapRef.current = null;
                agentsRef.current = [];
                playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
                yawRef.current = -Math.PI / 2;
                pitchRef.current = 0;
                carHitRef.current = false;
                goalFoundRef.current = false;
                if (announceToSR) announceToSR('Environment: ' + env.name + '. ' + env.desc + (is3D ? ' 3D mode.' : ' 2D mode.') + ' Press Space to click.');
              },
              style: { padding: '6px 12px', borderRadius: '8px', border: '1px solid ' + (active ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')), background: active ? '#6366f1' : (isDark ? '#1e293b' : '#fff'), color: active ? '#fff' : (isDark ? '#94a3b8' : '#475569'), fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, env.icon + ' ' + env.name + (is3D ? ' [3D]' : '') + ' ' + '\u2B50'.repeat(env.complexity));
          })
        ),

        // ── Controls ──
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          h('button', {
            onClick: emitClick,
            'aria-label': 'Emit echolocation click',
            style: { padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }
          }, '\uD83D\uDD0A Click (Space)'),
          // View Mode cycle button
          h('button', {
            onClick: cycleViewMode,
            'aria-label': 'Cycle view mode: currently ' + (d.viewMode || 'echo'),
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + viewModeColor + '80', background: isDark ? '#1e293b' : '#fff', color: viewModeColor, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, viewModeLabel),
          // Multi-Bounce toggle
          h('button', {
            onClick: function() { upd('multiBounce', !multiBounce); if (announceToSR) announceToSR(multiBounce ? 'Multi-bounce echoes off' : 'Multi-bounce echoes on \u2014 more realistic but harder'); },
            'aria-label': multiBounce ? 'Turn off multi-bounce echoes' : 'Turn on multi-bounce echoes (advanced)',
            'aria-pressed': multiBounce ? 'true' : 'false',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (multiBounce ? '#f59e0b' : (isDark ? '#334155' : '#e2e8f0')), background: multiBounce ? '#78350f' : (isDark ? '#1e293b' : '#fff'), color: multiBounce ? '#fbbf24' : (isDark ? '#94a3b8' : '#475569'), fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, multiBounce ? '\uD83D\uDD04 Multi-Bounce ON' : '\uD83D\uDD04 Multi-Bounce'),
          // New Layout button
          h('button', {
            onClick: function() {
              var newSeed = Math.floor(Math.random() * 999999);
              updMulti({ seed: newSeed, viewMode: 'echo', hasRevealed: false, goalFoundThisRun: false, clicks: 0, bumps: 0 });
              mapRef.current = null;
              agentsRef.current = [];
              playerRef.current = { x: 400, y: 700, angle: -Math.PI / 2 };
              yawRef.current = -Math.PI / 2;
              pitchRef.current = 0;
              carHitRef.current = false;
              goalFoundRef.current = false;
              if (announceToSR) announceToSR('New ' + envType + ' environment generated.');
            },
            'aria-label': 'Generate new random layout',
            style: { padding: '8px 16px', borderRadius: '8px', border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'), background: isDark ? '#1e293b' : '#fff', color: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, '\uD83C\uDFB2 New Layout'),
          d.goalFoundThisRun && h('span', { style: { padding: '8px 16px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 800 } }, '\uD83C\uDFC6 Goal Found!' + ((d.viewMode || 'echo') === 'audio' ? ' (Blind! \uD83C\uDFA7)' : ''))
        ),

        // ── Tutorial overlay (simple_room, tutStep < 4) ──
        (envType === 'simple_room' && tutStep < 4) ? h('div', {
          role: 'dialog',
          'aria-label': 'Tutorial step ' + (tutStep + 1) + ' of 4',
          style: {
            background: isDark ? '#0f172a' : '#eff6ff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px',
            position: 'relative',
            zIndex: 10
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
            h('span', { style: { fontSize: '14px', fontWeight: 800, color: '#3b82f6' } }, 'Tutorial ' + (tutStep + 1) + '/4'),
            h('span', { style: { fontSize: '12px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' } }, TUTORIAL_STEPS[tutStep].title)
          ),
          h('p', { style: { fontSize: '12px', color: isDark ? '#94a3b8' : '#475569', lineHeight: 1.6, margin: '0 0 10px 0' } }, TUTORIAL_STEPS[tutStep].text),
          h('button', {
            onClick: function() {
              var next = tutStep + 1;
              upd('tutStep', next);
              if (next >= 4 && announceToSR) announceToSR('Tutorial complete! You are ready to explore on your own.');
            },
            'aria-label': tutStep < 3 ? 'Next tutorial step' : 'Complete tutorial',
            style: { padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
          }, tutStep < 3 ? 'Next \u2192' : 'Got It!')
        ) : null,

        // ── 3D Viewport (when has3D) ──
        has3D ? h('div', {
          style: { position: 'relative', width: '100%', flex: 1, minHeight: '400px', borderRadius: '12px', overflow: 'hidden', background: '#000' }
        },
          // Mount point for Three.js renderer
          h('div', {
            ref: mountRef,
            role: 'application',
            'aria-label': 'Echo navigation 3D viewport. Click to lock mouse, then click to emit sonar. WASD to move, mouse to look, Q/E to strafe.',
            tabIndex: 0,
            style: { width: '100%', height: '100%', minHeight: '400px', outline: 'none', cursor: 'crosshair' }
          }),
          // Minimap canvas overlay
          h('canvas', {
            ref: canvasRef,
            'aria-hidden': 'true',
            style: { position: 'absolute', bottom: '10px', right: '10px', width: '200px', height: '200px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.4)', opacity: 0.9, pointerEvents: 'none', zIndex: 5 }
          }),
          // HUD overlay
          h('div', {
            'aria-hidden': 'true',
            style: { position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 12px', background: 'rgba(0,0,0,0.5)', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, zIndex: 5, pointerEvents: 'none' }
          },
            'Echo Navigator 3D  |  ' + viewModeLabel + '  |  Clicks: ' + (d.clicks || 0) + '  |  Bumps: ' + (d.bumps || 0) + '  |  Goals: ' + goalsFound + '  |  ' + envType
            + (pointerLockedRef.current ? '' : '  |  Click to lock mouse')
          ),
          // Crosshair
          h('div', {
            'aria-hidden': 'true',
            style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', zIndex: 5, pointerEvents: 'none' }
          },
            h('div', { style: { position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(163,190,252,0.4)', transform: 'translateY(-1px)' } }),
            h('div', { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(163,190,252,0.4)', transform: 'translateX(-1px)' } })
          )
        ) : null,

        // ── 2D Canvas (when !has3D) — standalone full-size ──
        !has3D ? h('canvas', {
          ref: canvasRef,
          role: 'application',
          'aria-label': 'Echo navigation area. WASD to move, arrows to turn, Space to click. ' + ((d.viewMode || 'echo') === 'reveal' ? 'Map visible.' : 'Audio sonar mode \u2014 listen for echoes.'),
          tabIndex: 0,
          style: { width: '100%', flex: 1, minHeight: '350px', borderRadius: '12px', background: '#080810', display: 'block', cursor: 'crosshair', outline: 'none' },
          onKeyDown: function(e) {
            if (e.code === 'Space') { e.preventDefault(); emitClick(); }
            keysRef.current[e.code] = true;
          },
          onKeyUp: function(e) { keysRef.current[e.code] = false; }
        }) : null,

        // ── Info footer ──
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: isDark ? '#475569' : '#94a3b8' } },
          has3D ? h('span', null, '\uD83D\uDDB1 Click to lock mouse, click again to sonar') : null,
          h('span', null, '\uD83C\uDFAE WASD: Move' + (has3D ? ', Q/E: Strafe' : '/Arrows: Turn')),
          h('span', null, 'Space: Click'),
          h('span', null, '\uD83C\uDFA7 Headphones required'),
          h('span', null, '\u2B50 Find the goal using echoes'),
          agentCounts.length > 0 ? h('span', { style: { color: '#f59e0b' } }, '\uD83D\uDEB6 ' + agentCounts.join(', ')) : null,
          h('span', { style: { color: '#6366f1' } }, 'HRTF spatial audio \u2022 ' + (d.clicks || 0) + ' clicks \u2022 Seed: ' + seed)
        ),

        // ── Material legend ──
        h('details', { style: { fontSize: '10px', color: isDark ? '#64748b' : '#94a3b8' } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700 } }, '\uD83D\uDCD6 How Materials Sound'),
          h('div', { style: { padding: '8px', lineHeight: 1.8 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' } },
              h('span', { style: { fontWeight: 700 } }, 'Concrete/Rock:'), h('span', null, 'Bright echo (reflects ~90% of sound energy)'),
              h('span', { style: { fontWeight: 700 } }, 'Metal:'), h('span', null, 'Sharp, ringing echo (reflects ~95% \u2014 highest reflectivity)'),
              h('span', { style: { fontWeight: 700 } }, 'Wood:'), h('span', null, 'Muffled echo (absorbs high frequencies, reflects ~50%)'),
              h('span', { style: { fontWeight: 700 } }, 'Glass:'), h('span', null, 'Faint, high-pitched echo (mostly transparent to sound)'),
              h('span', { style: { fontWeight: 700 } }, 'Fabric/Carpet:'), h('span', null, 'Nearly silent (absorbs most sound \u2014 hard to detect)'),
              h('span', { style: { fontWeight: 700, color: '#ff9c9c' } }, 'Pedestrian:'), h('span', null, 'Soft echo, faint glow, triangle-wave tone at 200Hz'),
              h('span', { style: { fontWeight: 700, color: '#ffc47c' } }, 'Car:'), h('span', null, 'Strong echo, sawtooth engine rumble at 55Hz \u2014 AVOID!'),
              h('span', { style: { fontWeight: 700, color: '#c4b5fd' } }, 'Bat:'), h('span', null, 'Faint, ultrasonic chirp at 3200Hz \u2014 tiny targets'),
              h('span', { style: { fontWeight: 700, color: '#fbbf24' } }, 'Goal \u2B50:'), h('span', null, 'Distinctive bright echo with a unique tonal quality')
            ),
            h('p', { style: { marginTop: '6px', fontStyle: 'italic', fontSize: '9px' } },
              '\uD83E\uDD87 Real bats use frequencies of 20-200 kHz (ultrasonic). Humans echolocate best with tongue clicks at 2-4 kHz. The key cue is the time delay between click and echo \u2014 at 343 m/s, a wall 1.7m away returns an echo in 10ms.')
          )
        ),

        // ── Safety reminder footer ──
        h('div', { style: { fontSize: '9px', color: isDark ? '#475569' : '#94a3b8', textAlign: 'center', padding: '6px 0', borderTop: '1px solid ' + (isDark ? '#1e293b' : '#e2e8f0') } },
          '\u26A0\uFE0F This is an educational simulation. Do not rely on simulation experience for real-world navigation. Consult a qualified O&M specialist for echolocation training.'
        )
      );
    }
  });

})();
} // end duplicate guard
