/**
 * AlloFlow Memory Palace — method-of-loci 3D walk for the 'Memory Palace' organizer
 *
 * P1 of docs/memory_palace_3d_design.md. Turns a generated {main, branches} outline
 * (branches = rooms, items = the facts to memorize, branch.mnemonics[] = vivid
 * image descriptions) into a walkable palace: one room per branch along a corridor,
 * framed loci on the walls in reading order, first-person camera on rails.
 *
 * DESIGN RULES (same contract as concept_graph_3d_module.js):
 *   1. The LINEAR ROUTE is the accessible source of truth. buildPalace() emits it;
 *      it renders as an ordered list (sr-only while GL is live, visible on any
 *      failure) and every camera stop is announced via aria-live with room, step,
 *      item, and mnemonic. Keyboard: ← → walk, Home/End, O = overview, Enter on a
 *      frame via click. Reduced motion ⇒ instant cuts instead of glides.
 *   2. three.js is LAZY-LOADED from CDN (shares window.__cg3dThreePromise with the
 *      concept-graph renderer, so at most one download). Load/WebGL failure ⇒ the
 *      visible route list. GL context + rAF torn down on destroy.
 *   3. buildPalace()/navigateRoute()/describeLocusForSR() are PURE and unit-tested;
 *      the imperative GL mount is wrapped in try/catch and can only degrade, never
 *      crash the host.
 *
 * Epistemic note baked into the UI copy: method of loci is a practice strategy with
 * strong lab evidence for trained, ordered recall — it works because you WALK the
 * route repeatedly, not by magic. The tool says so.
 *
 * RUNTIME: plain JS; React never required. Registers window.AlloModules.MemoryPalace.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.MemoryPalace) {
    console.log('[MemoryPalace] Already loaded, skipping');
    return;
  }

  var VERSION = 'palace/1';
  var PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7', '#84cc16', '#ec4899'];
  var BG = 0x0b1020;
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.137.0/build/three.min.js';
  var SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';

  // Palace metrics (world units; camera eye height is EYE)
  var ROOM_W = 920, ROOM_D = 720, WALL_H = 330, EYE = 150;
  var FRAME_W = 175, FRAME_H = 130, DOOR_W = 210, CAM_BACK = 265;

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _tr(t, k, fallback) { try { var v = t && t(k); return (v && v !== k) ? v : fallback; } catch (e) { return fallback; } }
  function _itemText(it) { return (it && typeof it === 'object') ? String(it.text || '') : String(it == null ? '' : it); }

  // ── buildPalace — PURE: {main, branches[±mnemonics]} → rooms/loci/route ──
  // Rooms in a row along +X (entry hall first), items alternate left/right walls
  // in reading order, each locus carries its camera stop. Deterministic.
  function buildPalace(data, opts) {
    opts = opts || {};
    var main = (data && data.main != null) ? String(data.main) : '';
    var branches = (data && Array.isArray(data.branches)) ? data.branches : [];
    var rooms = [], loci = [], route = [];

    // Entry hall — the walk begins at the palace title plinth.
    rooms.push({ key: '__entry', label: main, index: 0, center: { x: 0, z: 0 }, color: '#94a3b8' });
    var entryStop = {
      id: '__entry', roomIdx: 0, branchIdx: -1, itemIdx: -1,
      label: main, mnemonic: '',
      framePos: { x: 0, y: EYE + 30, z: 0 }, faceDir: 1,
      camPos: { x: 0, y: EYE, z: ROOM_D / 2 - 120 },
      lookAt: { x: 0, y: EYE + 20, z: 0 }
    };
    loci.push(entryStop); route.push('__entry');

    branches.forEach(function (b, bi) {
      var roomIdx = bi + 1;
      var cx = roomIdx * ROOM_W;
      var color = PALETTE[bi % PALETTE.length];
      var title = (b && b.title != null) ? String(b.title) : ('Room ' + roomIdx);
      rooms.push({ key: 'b' + bi, label: title, index: roomIdx, center: { x: cx, z: 0 }, color: color });
      var items = (b && Array.isArray(b.items)) ? b.items : [];
      var mnems = (b && Array.isArray(b.mnemonics)) ? b.mnemonics : [];
      var slots = Math.max(1, Math.ceil(items.length / 2));
      items.forEach(function (it, ii) {
        var side = ii % 2 === 0 ? -1 : 1;               // alternate left/right walls
        var slot = Math.floor(ii / 2);
        var fx = cx - ROOM_W / 2 + ((slot + 1) * ROOM_W) / (slots + 1);
        var fz = side * (ROOM_D / 2 - 6);
        var id = 'b' + bi + '_i' + ii;                  // matches adaptGenerated ids
        loci.push({
          id: id, roomIdx: roomIdx, branchIdx: bi, itemIdx: ii,
          label: _itemText(it),
          mnemonic: (mnems[ii] != null) ? String(mnems[ii]) : '',
          framePos: { x: fx, y: EYE + 20, z: fz }, faceDir: -side,   // frame faces into the room
          camPos: { x: fx, y: EYE, z: fz - side * CAM_BACK },
          lookAt: { x: fx, y: EYE + 20, z: fz }
        });
        route.push(id);
      });
    });

    var minX = -ROOM_W / 2, maxX = (rooms.length - 0.5) * ROOM_W;
    return {
      version: VERSION, title: main,
      rooms: rooms, loci: loci, route: route,
      bounds: { minX: minX, maxX: maxX, minZ: -ROOM_D / 2, maxZ: ROOM_D / 2, width: maxX - minX }
    };
  }

  // ── navigateRoute — deterministic walk order (clamped, no wrap) ──
  function navigateRoute(palace, currentId, action) {
    var route = (palace && palace.route) || [];
    if (!route.length) return null;
    if (action === 'first') return route[0];
    if (action === 'last') return route[route.length - 1];
    var i = route.indexOf(currentId);
    if (action === 'next') return i < 0 ? route[0] : route[Math.min(route.length - 1, i + 1)];
    if (action === 'prev') return i < 0 ? route[0] : route[Math.max(0, i - 1)];
    return currentId || route[0];
  }

  function locusById(palace, id) {
    var ls = (palace && palace.loci) || [];
    for (var i = 0; i < ls.length; i++) { if (ls[i].id === id) return ls[i]; }
    return null;
  }

  // ── describeLocusForSR — the announcement is the mnemonic's home ──
  function describeLocusForSR(palace, id, t) {
    var l = locusById(palace, id);
    if (!l) return '';
    var route = palace.route || [];
    var pos = route.indexOf(id);
    var room = (palace.rooms || [])[l.roomIdx];
    var parts = [];
    if (l.id === '__entry') {
      parts.push(_tr(t, 'memory_palace.sr_entry', 'Palace entrance') + ': ' + l.label);
    } else {
      if (pos >= 0) parts.push(_tr(t, 'memory_palace.sr_locus', 'Locus') + ' ' + pos + ' ' + _tr(t, 'memory_palace.sr_of', 'of') + ' ' + (route.length - 1));
      if (room) parts.push(room.label + ' ' + _tr(t, 'memory_palace.sr_room', 'room'));
      parts.push(l.label);
      if (l.mnemonic) parts.push(_tr(t, 'memory_palace.sr_picture', 'Picture this') + ': ' + l.mnemonic);
    }
    return parts.join('. ');
  }

  // ── Accessible route DOM (source of truth; visible on any failure) ──
  function buildRouteDom(palace, t, visible) {
    var wrap = document.createElement('div');
    wrap.style.cssText = visible ? 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;' : SR_ONLY;
    var heading = document.createElement('div');
    heading.textContent = _tr(t, 'memory_palace.route_title', 'Palace route');
    heading.style.cssText = visible ? 'font-weight:800;font-size:13px;margin-bottom:6px;color:#f1f5f9;' : '';
    wrap.appendChild(heading);
    var ol = document.createElement('ol');
    ol.setAttribute('aria-label', _tr(t, 'memory_palace.route_aria', 'Memory palace route in walking order'));
    ol.style.cssText = visible ? 'font-size:13px;line-height:1.7;padding-left:22px;margin:0;' : 'margin:0;';
    (palace.route || []).forEach(function (id) {
      var li = document.createElement('li');
      li.textContent = describeLocusForSR(palace, id, t);
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    return wrap;
  }

  function isWebGLAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  // Shares the concept-graph renderer's promise so three.js downloads at most once.
  function loadThree(opts) {
    opts = opts || {};
    if (window.THREE) return Promise.resolve(window.THREE);
    if (window.__cg3dThreePromise) return window.__cg3dThreePromise;
    window.__cg3dThreePromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.src = opts.threeUrl || THREE_URL;
        s.async = true;
        s.onload = function () { window.THREE ? resolve(window.THREE) : reject(new Error('three.js loaded but window.THREE missing')); };
        s.onerror = function () { reject(new Error('failed to load three.js')); };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
    return window.__cg3dThreePromise;
  }

  function _roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function makeLabelSprite(THREE, text, hex, fontPx) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var font = fontPx || 26, padX = 14, padY = 9;
    ctx.font = '600 ' + font + 'px sans-serif';
    var full = String(text || '');
    var shown = full.length > 60 ? full.slice(0, 57) + '…' : full;
    var tw = Math.ceil(ctx.measureText(shown).width);
    canvas.width = Math.max(2, tw + padX * 2); canvas.height = font + padY * 2;
    ctx.font = '600 ' + font + 'px sans-serif';
    var rad = canvas.height / 2;
    ctx.fillStyle = 'rgba(8,12,26,0.86)'; _roundRect(ctx, 0, 0, canvas.width, canvas.height, rad);
    ctx.strokeStyle = hex || 'rgba(148,163,184,0.6)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(1.25, 1.25, canvas.width - 2.5, canvas.height - 2.5, rad - 1); } else { ctx.arc(canvas.width / 2, canvas.height / 2, rad - 2, 0, Math.PI * 2); }
    ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(shown, padX, canvas.height / 2 + 1);
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    var k = 0.5; sp.scale.set(canvas.width * k, canvas.height * k, 1);
    return sp;
  }

  // Placeholder card texture for an unfurnished locus: tinted panel + big number.
  function makeCardTexture(THREE, number, hex) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 192;
    var g = c.getContext('2d');
    g.fillStyle = '#101a33'; g.fillRect(0, 0, 256, 192);
    g.strokeStyle = hex; g.lineWidth = 6; g.strokeRect(6, 6, 244, 180);
    g.fillStyle = hex; g.globalAlpha = 0.18; g.fillRect(6, 6, 244, 180); g.globalAlpha = 1;
    g.fillStyle = '#e2e8f0'; g.font = '800 92px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(number), 128, 96);
    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // ── Imperative GL mount ──
  function mountGL(holder, THREE, palace, opts, state) {
    var w = holder.clientWidth || 800, hgt = holder.clientHeight || 480;
    var t = (opts && opts.t) || function (k) { return k; };
    var images = (opts && opts.images) || {};
    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, hgt);
    renderer.setClearColor(BG, 1);
    try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) {}
    holder.appendChild(renderer.domElement);
    state.renderer = renderer;

    var root = new THREE.Scene();
    root.background = new THREE.Color(BG);
    try { root.fog = new THREE.FogExp2(BG, 0.00042); } catch (e) {}
    var camera = new THREE.PerspectiveCamera(58, w / hgt, 1, 60000);

    root.add(new THREE.AmbientLight(0xffffff, 0.5));
    try { root.add(new THREE.HemisphereLight(0xbfd4ff, 0x0b1020, 0.55)); } catch (e) {}

    // Starfield above the open-roofed palace (a dream-space, not a building sim).
    try {
      var SN = 420, sp3 = new Float32Array(SN * 3);
      var span = Math.max(2000, palace.bounds.width * 1.6);
      for (var si = 0; si < SN; si++) {
        sp3[si * 3] = palace.bounds.minX + Math.random() * span;
        sp3[si * 3 + 1] = WALL_H + 300 + Math.random() * 2200;
        sp3[si * 3 + 2] = -span / 2 + Math.random() * span;
      }
      var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp3, 3));
      root.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x93c5fd, size: 7, transparent: true, opacity: 0.5, depthWrite: false })));
    } catch (e) {}

    var group = new THREE.Group(); root.add(group);
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.05 });

    function addWall(x, z, lenX, lenZ) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(lenX, 8), WALL_H, Math.max(lenZ, 8)), wallMat);
      mesh.position.set(x, WALL_H / 2, z);
      group.add(mesh);
    }

    palace.rooms.forEach(function (room, ri) {
      var cx = room.center.x;
      // Floor: dark room-accent tint.
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(room.color).multiplyScalar(0.22), roughness: 0.9 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, 0); group.add(floor);
      // Long walls (top/bottom in plan = ±z).
      addWall(cx, -ROOM_D / 2, ROOM_W, 10);
      addWall(cx, ROOM_D / 2, ROOM_W, 10);
      // End walls with doorways between consecutive rooms (gap of DOOR_W centered).
      var segZ = (ROOM_D - DOOR_W) / 2;
      var leftX = cx - ROOM_W / 2, rightX = cx + ROOM_W / 2;
      if (ri === 0) addWall(leftX, 0, 10, ROOM_D);                       // palace back wall
      addWall(rightX, -(DOOR_W / 2 + segZ / 2), 10, segZ);               // doorway wall (shared or exit)
      addWall(rightX, (DOOR_W / 2 + segZ / 2), 10, segZ);
      // Room accent light + name sprite.
      try { var pl = new THREE.PointLight(new THREE.Color(room.color), 0.55, ROOM_W * 1.4); pl.position.set(cx, WALL_H - 40, 0); group.add(pl); } catch (e) {}
      var name = makeLabelSprite(THREE, room.label, room.color, 30);
      name.position.set(cx, WALL_H + 40, 0); group.add(name);
    });

    // Entry plinth (the palace title).
    (function () {
      var plinth = new THREE.Mesh(new THREE.CylinderGeometry(46, 56, 110, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.25 }));
      plinth.position.set(0, 55, 0); group.add(plinth);
      var orb = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 0.9, roughness: 0.3 }));
      orb.position.set(0, 140, 0); orb.userData.locusId = '__entry'; group.add(orb);
      var title = makeLabelSprite(THREE, palace.title || '', '#818cf8', 32);
      title.position.set(0, 215, 0); group.add(title);
    })();

    // Loci frames.
    var frameMeshes = [];
    var texLoader = new THREE.TextureLoader();
    palace.loci.forEach(function (l, li) {
      if (l.id === '__entry') return;
      var room = palace.rooms[l.roomIdx];
      var color = (room && room.color) || '#6366f1';
      var g2 = new THREE.Group();
      g2.position.set(l.framePos.x, l.framePos.y, l.framePos.z);
      g2.rotation.y = l.faceDir > 0 ? 0 : Math.PI;   // face into the room
      // Frame border + canvas.
      var border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 18, FRAME_H + 18, 6),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.4, metalness: 0.3 }));
      g2.add(border);
      var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var img = images[l.id];
      if (img) {
        try { var tx = texLoader.load(img); if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; mat.map = tx; } catch (e) { mat.map = makeCardTexture(THREE, li, color); }
      } else {
        mat.map = makeCardTexture(THREE, li, color);
      }
      var canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), mat);
      canvasMesh.position.z = 4;
      canvasMesh.userData.locusId = l.id;
      g2.add(canvasMesh);
      // Item label under the frame.
      var lab = makeLabelSprite(THREE, l.label, color, 24);
      lab.position.set(0, -(FRAME_H / 2 + 34), 10);
      g2.add(lab);
      group.add(g2);
      frameMeshes.push(canvasMesh);
    });

    // ── Camera rails ──
    var curIdx = Math.max(0, (palace.route || []).indexOf(opts.startAt || '__entry'));
    var camPos = new THREE.Vector3(), camPosT = new THREE.Vector3();
    var look = new THREE.Vector3(), lookT = new THREE.Vector3();
    var yawOff = 0, pitchOff = 0;   // drag look-around at a stop
    var overview = false;

    function stopTargets(idx) {
      var id = palace.route[idx];
      var l = locusById(palace, id);
      if (!l) return;
      camPosT.set(l.camPos.x, l.camPos.y, l.camPos.z);
      lookT.set(l.lookAt.x, l.lookAt.y, l.lookAt.z);
    }
    function applyOverview() {
      var cx = (palace.bounds.minX + palace.bounds.maxX) / 2;
      camPosT.set(cx, Math.max(1400, palace.bounds.width * 0.75), ROOM_D * 1.9);
      lookT.set(cx, 0, 0);
    }
    stopTargets(curIdx);
    camPos.copy(camPosT); look.copy(lookT);
    if (!reduce) { camPos.y += 700; camPos.z += 500; }   // gentle descend-in

    var t2 = t;
    var live = document.createElement('div'); live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); live.style.cssText = SR_ONLY;
    holder.appendChild(live);

    function announce(idx) {
      try { live.textContent = describeLocusForSR(palace, palace.route[idx], t2); } catch (e) {}
      if (typeof opts.onLocusChange === 'function') {
        try { opts.onLocusChange(locusById(palace, palace.route[idx]), idx, palace.route.length); } catch (e) {}
      }
    }
    function goTo(idx, skipAnnounce) {
      curIdx = Math.max(0, Math.min(palace.route.length - 1, idx));
      overview = false; yawOff = 0; pitchOff = 0;
      stopTargets(curIdx);
      if (reduce) { camPos.copy(camPosT); look.copy(lookT); }
      updateHud();
      if (!skipAnnounce) announce(curIdx);
    }

    // ── DOM chrome: prev/next + progress + overview ──
    var hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:8px;background:rgba(2,6,23,0.82);border:1px solid #334155;border-radius:999px;padding:6px 10px;color:#e2e8f0;';
    function mkBtn(txt, label, fn) {
      var b = document.createElement('button');
      b.textContent = txt; b.setAttribute('aria-label', label);
      b.style.cssText = 'border:none;background:#1e293b;color:#e2e8f0;border-radius:999px;padding:6px 13px;font-size:13px;font-weight:800;cursor:pointer;';
      b.onclick = fn; return b;
    }
    var prevBtn = mkBtn('◀', _tr(t, 'memory_palace.prev', 'Previous locus'), function () { goTo(curIdx - 1); });
    var progress = document.createElement('span'); progress.style.cssText = 'font-size:12px;font-weight:800;min-width:52px;text-align:center;';
    var nextBtn = mkBtn('▶', _tr(t, 'memory_palace.next', 'Next locus'), function () { goTo(curIdx + 1); });
    var ovBtn = mkBtn('🗺', _tr(t, 'memory_palace.overview', 'Overview'), function () {
      overview = !overview;
      if (overview) { applyOverview(); if (reduce) { camPos.copy(camPosT); look.copy(lookT); } } else { goTo(curIdx, true); }
    });
    hud.appendChild(prevBtn); hud.appendChild(progress); hud.appendChild(nextBtn); hud.appendChild(ovBtn);
    holder.appendChild(hud);
    function updateHud() {
      progress.textContent = curIdx + '/' + (palace.route.length - 1);
      prevBtn.disabled = curIdx <= 0; nextBtn.disabled = curIdx >= palace.route.length - 1;
      prevBtn.style.opacity = prevBtn.disabled ? 0.4 : 1; nextBtn.style.opacity = nextBtn.disabled ? 0.4 : 1;
    }
    updateHud();

    // ── Input: keyboard walk + drag look-around + click a frame ──
    var el = renderer.domElement;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'application');
    el.setAttribute('aria-roledescription', _tr(t, 'memory_palace.canvas_role', 'Memory palace 3D walk'));
    el.setAttribute('aria-label', _tr(t, 'memory_palace.canvas_label', 'Memory palace. Use the left and right arrow keys to walk the route in order.'));
    var instrId = 'palace-instr-' + (window.__palaceSeq = (window.__palaceSeq || 0) + 1);
    var instr = document.createElement('p'); instr.id = instrId; instr.style.cssText = SR_ONLY;
    instr.textContent = _tr(t, 'memory_palace.canvas_instructions', 'Right arrow walks to the next locus, left arrow goes back. Home returns to the entrance, End jumps to the last locus. O toggles the overview map. Each stop announces the room, the item, and its mnemonic image.');
    holder.appendChild(instr);
    el.setAttribute('aria-describedby', instrId);
    [hud].forEach(function (nd) { try { nd.setAttribute('aria-hidden', 'true'); } catch (e) {} });

    function onKeyDown(e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); goTo(curIdx + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); goTo(curIdx - 1); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(palace.route.length - 1); }
      else if (k === 'o' || k === 'O') { e.preventDefault(); ovBtn.onclick(); }
    }
    el.addEventListener('keydown', onKeyDown);

    var dragging = false, moved = false, lx = 0, ly = 0;
    var raycaster = new THREE.Raycaster(); var ndc = new THREE.Vector2();
    function onDown(e) { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; el.style.cursor = 'grabbing'; }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      yawOff -= dx * 0.0035; pitchOff -= dy * 0.0025;
      yawOff = Math.max(-1.1, Math.min(1.1, yawOff));
      pitchOff = Math.max(-0.5, Math.min(0.5, pitchOff));
      lx = e.clientX; ly = e.clientY;
    }
    function onUp(e) {
      if (dragging && !moved) {
        try {
          var r = el.getBoundingClientRect();
          ndc.x = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
          ndc.y = -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          var hits = raycaster.intersectObjects(frameMeshes, false);
          if (hits.length) {
            var id = hits[0].object.userData.locusId;
            var idx = palace.route.indexOf(id);
            if (idx >= 0) goTo(idx);
          }
        } catch (er) {}
      }
      dragging = false; el.style.cursor = 'grab';
    }
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    state.cleanup.push(function () {
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      [hud, live, instr].forEach(function (nd) { try { if (nd.parentNode) nd.parentNode.removeChild(nd); } catch (e) {} });
    });

    // ── tick: ease camera along the rails; apply drag look-around ──
    var lookBase = new THREE.Vector3();
    function tick() {
      if (state.disposed) return;
      var ease = reduce ? 1 : 0.07;
      camPos.lerp(camPosT, ease);
      look.lerp(lookT, reduce ? 1 : 0.09);
      camera.position.copy(camPos);
      lookBase.copy(look);
      if (!overview && (yawOff || pitchOff)) {
        var dir = lookBase.clone().sub(camPos);
        var len = dir.length() || 1;
        var yaw = Math.atan2(dir.x, dir.z) + yawOff;
        var pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y / len))) + pitchOff;
        lookBase.set(
          camPos.x + Math.sin(yaw) * Math.cos(pitch) * len,
          camPos.y + Math.sin(pitch) * len,
          camPos.z + Math.cos(yaw) * Math.cos(pitch) * len
        );
      }
      camera.lookAt(lookBase);
      renderer.render(root, camera);
      state.raf = (window.requestAnimationFrame || function () { return 0; })(tick);
    }
    tick();
    announce(curIdx);

    state.onResize = function () {
      var W = holder.clientWidth || w, H = holder.clientHeight || hgt;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
    };
    window.addEventListener('resize', state.onResize);

    state.goTo = function (idx) { goTo(idx); };
  }

  // ── render — public imperative API. Returns { destroy, goTo, fellBack }. ──
  function render(container, data, opts) {
    opts = opts || {};
    var t = opts.t || function (k) { return k; };
    if (!container) return { destroy: function () {}, goTo: function () {}, fellBack: true };
    var palace = (data && data.version === VERSION && data.route) ? data : buildPalace(data, opts);
    while (container.firstChild) container.removeChild(container.firstChild);

    var routeEl = buildRouteDom(palace, t, false);   // sr-only while 3D is live
    container.appendChild(routeEl);

    var state = { raf: 0, renderer: null, disposed: false, onResize: null, cleanup: [], goTo: null };
    function destroy() {
      state.disposed = true;
      if (state.raf) { try { (window.cancelAnimationFrame || function () {})(state.raf); } catch (e) {} state.raf = 0; }
      if (state.onResize) { try { window.removeEventListener('resize', state.onResize); } catch (e) {} state.onResize = null; }
      state.cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      state.cleanup = [];
      if (state.renderer) {
        try { state.renderer.dispose(); } catch (e) {}
        try { var dom = state.renderer.domElement; if (dom && dom.parentNode) dom.parentNode.removeChild(dom); } catch (e) {}
        state.renderer = null;
      }
    }
    function goTo(idx) { try { if (state.goTo) state.goTo(idx); } catch (e) {} }
    function showFallback(msg) {
      routeEl.style.cssText = 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;';
      var note = document.createElement('div');
      note.setAttribute('role', 'status');
      note.textContent = msg;
      note.style.cssText = 'font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin:8px;';
      container.insertBefore(note, routeEl);
    }

    if (!isWebGLAvailable()) {
      showFallback(_tr(t, 'memory_palace.no_webgl', 'This browser cannot show the 3D palace. Showing the walking route instead.'));
      return { destroy: destroy, goTo: goTo, fellBack: true };
    }

    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;inset:0;';
    container.appendChild(holder);

    loadThree(opts).then(function (THREE) {
      if (!THREE || state.disposed) return;
      try { mountGL(holder, THREE, palace, opts, state); }
      catch (e) { console.warn('[MemoryPalace] GL mount failed:', e && e.message); showFallback(_tr(t, 'memory_palace.gl_error', 'The 3D palace could not start. Showing the walking route instead.')); }
    }).catch(function (e) {
      if (state.disposed) return;
      console.warn('[MemoryPalace] three.js load failed:', e && e.message);
      showFallback(_tr(t, 'memory_palace.load_error', 'The 3D library could not load. Showing the walking route instead.'));
    });

    return { destroy: destroy, goTo: goTo, fellBack: false };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MemoryPalace = {
    version: VERSION,
    PALETTE: PALETTE,
    buildPalace: buildPalace,
    navigateRoute: navigateRoute,
    describeLocusForSR: describeLocusForSR,
    isWebGLAvailable: isWebGLAvailable,
    loadThree: loadThree,
    render: render
  };
  console.log('[MemoryPalace] Registered (method-of-loci 3D walk; lazy three.js, route-list fallback)');
})();
