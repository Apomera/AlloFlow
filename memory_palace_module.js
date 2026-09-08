/**
 * AlloFlow Memory Palace — method-of-loci 3D walk for the 'Memory Palace' organizer
 *
 * P1 of docs/memory_palace_3d_design.md. Turns a generated {main, branches} outline
 * (branches = rooms, items = the facts to memorize, branch.mnemonics[] = vivid
 * image descriptions) into a walkable palace: a central hub with one room per
 * branch radiating out on spokes, framed loci on the walls in reading order,
 * first-person camera on rails.
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
  // Environment themes: 'gallery' is the classic museum look; 'pasture' and
  // 'space' give open-world variety (no walls, different sky/ground/light).
  // mountGL reads these to set background, fog, lights, sky/ground, walls, floor.
  var THEMES = {
    gallery: { bg: 0x0b1020, skyTop: '#17213f', skyHorizon: '#050814', exposure: 1.06, fog: 0.00022, fogColor: 0x0b1020, walls: true, ground: 0, stars: 0x93c5fd, starCount: 420, ambient: 0.4, hemi: [0xfff0d8, 0x293442, 0.52], sun: [0xfff4e2, 0.44], floorMul: 0.42 },
    pasture: { bg: 0x8ec9ea, skyTop: '#4f9fda', skyHorizon: '#d6ecff', exposure: 1.05, fog: 0.00018, fogColor: 0xd6ecff, walls: false, ground: 0x4f7f43, stars: 0, starCount: 0, ambient: 0.9, hemi: [0xcdeaff, 0x3c5a2c, 0.95], sun: [0xfff3d6, 0.95], floorMul: 0.62 },
    space: { bg: 0x02030a, skyTop: '#111538', skyHorizon: '#010207', exposure: 1.15, fog: 0, fogColor: 0x02030a, walls: false, ground: 0, stars: 0xc3d4ff, starCount: 900, ambient: 0.34, hemi: [0x232f4d, 0x05060a, 0.5], sun: [0x9db4ff, 0.5], floorMul: 0.32 }
  };
  var THEME_KEYS = ['gallery', 'pasture', 'space'];
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.137.0/build/three.min.js';
  var SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';

  // Palace metrics (world units; camera eye height is EYE)
  var ROOM_W = 920, ROOM_D = 720, WALL_H = 330, EYE = 150;
  var FRAME_W = 175, FRAME_H = 130, DOOR_W = 210, CAM_BACK = 265;
  var WALL_T = 10, WALK_RADIUS = 28;

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _tr(t, k, fallback) { try { var v = t && t(k); return (v && v !== k) ? v : fallback; } catch (e) { return fallback; } }
  function contrastForeground(hex) {
    var raw = String(hex || '').replace('#', '');
    if (raw.length === 3) raw = raw.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-f]{6}$/i.test(raw)) return '#ffffff';
    function channel(pair) {
      var n = parseInt(pair, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    }
    var lum = 0.2126 * channel(raw.slice(0, 2)) + 0.7152 * channel(raw.slice(2, 4)) + 0.0722 * channel(raw.slice(4, 6));
    var darkLum = 0.2126 * channel('02') + 0.7152 * channel('06') + 0.0722 * channel('17');
    var whiteContrast = 1.05 / (lum + 0.05);
    var darkContrast = (Math.max(lum, darkLum) + 0.05) / (Math.min(lum, darkLum) + 0.05);
    return whiteContrast >= darkContrast ? '#ffffff' : '#020617';
  }
  function _itemText(it) { return (it && typeof it === 'object') ? String(it.text || '') : String(it == null ? '' : it); }

  // Sanitize a saved learner route against the current organizer. Unknown and
  // duplicate ids are dropped; newly generated loci are appended in source order.
  // The entrance is always first, so a stale customization can never break a walk.
  function normalizeRouteOrder(defaultRoute, preferredOrder) {
    var base = Array.isArray(defaultRoute) ? defaultRoute.filter(function (id) { return id !== '__entry'; }) : [];
    var allowed = {}, seen = {}, ordered = ['__entry'];
    base.forEach(function (id) { allowed[id] = true; });
    (Array.isArray(preferredOrder) ? preferredOrder : []).forEach(function (id) {
      if (allowed[id] && !seen[id]) { seen[id] = true; ordered.push(id); }
    });
    base.forEach(function (id) {
      if (!seen[id]) { seen[id] = true; ordered.push(id); }
    });
    return ordered;
  }

  // ── Self-authored images (the generation effect) ──────────────────────
  // The method of loci works because the LEARNER builds the picture: an image
  // you invent yourself is recalled better than one handed to you. So a
  // student's own line always outranks the generated one downstream (walk
  // strip, live-region announcement, route list, study sheet, recall hint and
  // the art prompts), while the generated line is KEPT — never destroyed — so
  // they can compare the two or fall back to it.
  //
  // The checks below are deliberately LANGUAGE-NEUTRAL: no verb lists, no word
  // matching. Whether an image is vivid is the student's judgment to make (the
  // criteria are prompts they answer themselves, not machine verdicts); code
  // only checks what is checkable in any script — that something was written,
  // and that it isn't just the item name typed back.
  var MNEMONIC_MIN_CHARS = 12;
  var MNEMONIC_CRITERIA = ['action', 'sensory', 'placed', 'personal'];

  function _foldLoose(s) {
    s = String(s == null ? '' : s).toLowerCase();
    try { s = s.normalize('NFKC'); } catch (e) {}
    return s.replace(/\s+/g, ' ').trim();
  }

  function mnemonicFeedback(text, label) {
    var raw = String(text == null ? '' : text).trim();
    var folded = _foldLoose(raw);
    var empty = folded.length === 0;
    return {
      chars: raw.length,
      empty: empty,
      tooShort: !empty && raw.length < MNEMONIC_MIN_CHARS,
      echoesLabel: !empty && folded === _foldLoose(label),
      ok: !empty && raw.length >= MNEMONIC_MIN_CHARS && folded !== _foldLoose(label),
      criteria: MNEMONIC_CRITERIA.slice()
    };
  }

  // Swap ONE locus between the student's own image and the generated one, in
  // place — the palace object is shared with the mounted scene, so a live walk
  // updates without a remount (and without losing the walker's position).
  function applyOwnMnemonic(palace, id, text) {
    var l = locusById(palace, id);
    if (!l || l.id === '__entry') return false;
    var own = (typeof text === 'string') ? text.trim() : '';
    if (l.aiMnemonic == null) l.aiMnemonic = (l.mnemonicSource === 'self') ? '' : (l.mnemonic || '');
    if (own) { l.mnemonic = own; l.mnemonicSource = 'self'; }
    else { l.mnemonic = l.aiMnemonic || ''; l.mnemonicSource = l.mnemonic ? 'ai' : ''; }
    return true;
  }

  // ── Student-built extensions (expanding the palace) ─────────────────
  // A real memory palace grows: you add a room, you add a spot, and you reuse the
  // building for new material. Generated geography answers to the document;
  // these answer to the STUDENT, and persist across regeneration.
  //
  // Extra loci are stored in ROOM-LOCAL coordinates rather than as wall slots.
  // That is the whole point: wall slots re-space every sibling when one is added
  // (lx divides ROOM_W by the count), which would quietly move furniture the
  // student had already memorised. A local (lx, lz) never moves — it just rotates
  // with its room's spoke — so an addition costs nothing already learned.
  var EXTRA_PREFIX = 'xl';
  var EXTRA_ROOM_PREFIX = 'xr';

  function _nextSeqId(existing, prefix) {
    var max = 0;
    (Array.isArray(existing) ? existing : []).forEach(function (e) {
      var id = (e && e.id != null) ? String(e.id) : String(e == null ? '' : e);
      if (id.indexOf(prefix) !== 0) return;
      var n = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + (max + 1);
  }
  function nextExtraLocusId(extraLoci) { return _nextSeqId(extraLoci, EXTRA_PREFIX); }
  function nextExtraRoomId(extraRooms) { return _nextSeqId(extraRooms, EXTRA_ROOM_PREFIX); }

  // Where a menu-added (not floor-placed) locus stands: down the middle of the
  // room on a FIXED step, so it never collides with the wall frames and never
  // shifts when the next one is added. Clamped to stay inside the room.
  // A grid of standing spots down the middle of the room: 5 across, 4 deep, all
  // comfortably inside the walls. Past that capacity each lap is offset by half a
  // cell so late spots interleave instead of stacking. The original version
  // alternated between just two depths with period 10, so spot 11 landed exactly
  // on spot 1; clamping deep rows to the back wall merely moved the collision.
  var EXTRA_COLS = 5, EXTRA_ROWS = 4;
  function extraSpotFor(k) {
    var n = Math.max(0, Math.floor(isNum(k) ? k : 0));
    var per = EXTRA_COLS * EXTRA_ROWS;
    var lap = Math.floor(n / per);
    var i = n % per;
    var colStep = ROOM_W / (EXTRA_COLS + 1);
    var usableD = ROOM_D - 120;                        // keep clear of both end walls
    var rowStep = usableD / (EXTRA_ROWS - 1);
    var jitter = (lap % 2) ? 0.5 : 0;                  // half-cell offset on alternate laps
    var lx = -ROOM_W / 2 + colStep * ((i % EXTRA_COLS) + 1 + jitter);
    var lz = usableD / 2 - rowStep * (Math.floor(i / EXTRA_COLS) + jitter);
    return {
      lx: Math.max(-ROOM_W / 2 + 20, Math.min(ROOM_W / 2 - 20, lx)),
      lz: Math.max(-ROOM_D / 2 + 40, Math.min(ROOM_D / 2 - 40, lz))
    };
  }

  // Inverse of the spoke rotation buildPalace applies: a world floor point back
  // into its room's local (lx, lz). PURE — this is what lets a click on the
  // ground become a locus the room owns, so it rotates with the spoke like
  // everything else instead of being pinned to a world coordinate.
  function worldToRoomLocal(room, x, z) {
    if (!room || !room.center) return null;
    var ang = room.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
    var dx = x - room.center.x, dz = z - room.center.z;
    return { lx: dx * ca - dz * sa, lz: dx * sa + dz * ca };
  }
  // Which room contains a world floor point (with a small inset so a locus is
  // never dropped inside a wall). Returns { room, lx, lz } or null for the hub.
  function roomAtPoint(palace, x, z, inset) {
    var pad = isNum(inset) ? inset : 22;
    var found = null;
    ((palace && palace.rooms) || []).forEach(function (room, ri) {
      if (found || ri === 0) return;                 // the hub plaza is not a room
      var lc = worldToRoomLocal(room, x, z);
      if (!lc) return;
      if (Math.abs(lc.lx) <= ROOM_W / 2 - pad && Math.abs(lc.lz) <= ROOM_D / 2 - pad) {
        found = { room: room, roomIdx: ri, roomKey: room.key, lx: lc.lx, lz: lc.lz };
      }
    });
    return found;
  }

  // Resolve a floor-plane movement against the same five wall boxes rendered
  // for each gallery room. Treating the walker as a circle and expanding the
  // walls by its radius gives natural sliding while keeping doorways passable.
  // Long moves are subdivided so a slow frame cannot tunnel through a wall.
  function resolvePalaceMovement(palace, fromX, fromZ, toX, toZ, radius) {
    var r = isNum(radius) ? Math.max(0, radius) : WALK_RADIUS;
    var result = { x: isNum(toX) ? toX : fromX, z: isNum(toZ) ? toZ : fromZ, collided: false };
    if (!palace || !Array.isArray(palace.rooms) || !isNum(fromX) || !isNum(fromZ) || !isNum(result.x) || !isNum(result.z)) return result;
    var dx = result.x - fromX, dz = result.z - fromZ;
    var steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dz * dz) / Math.max(4, r / 2)));
    var stepX = dx / steps, stepZ = dz / steps, curX = fromX, curZ = fromZ;
    var halfW = ROOM_W / 2, halfD = ROOM_D / 2, halfT = WALL_T / 2;
    var walls = [
      { x0: -halfW - r, x1: halfW + r, z0: -halfD - halfT - r, z1: -halfD + halfT + r },
      { x0: -halfW - r, x1: halfW + r, z0: halfD - halfT - r, z1: halfD + halfT + r },
      { x0: halfW - halfT - r, x1: halfW + halfT + r, z0: -halfD - r, z1: halfD + r },
      { x0: -halfW - halfT - r, x1: -halfW + halfT + r, z0: -halfD - r, z1: -DOOR_W / 2 + r },
      { x0: -halfW - halfT - r, x1: -halfW + halfT + r, z0: DOOR_W / 2 - r, z1: halfD + r }
    ];
    function localToWorld(room, lx, lz) {
      var ang = room.angle || 0, ca = Math.cos(ang), sa = Math.sin(ang);
      return { x: room.center.x + lx * ca + lz * sa, z: room.center.z - lx * sa + lz * ca };
    }
    function pushOut(px, pz, priorX, priorZ, box) {
      if (px < box.x0 || px > box.x1 || pz < box.z0 || pz > box.z1) return { x: px, z: pz, hit: false };
      var eps = 0.02;
      var options = [
        { d: Math.abs(px - box.x0), x: box.x0 - eps, z: pz, preferred: priorX <= box.x0 },
        { d: Math.abs(box.x1 - px), x: box.x1 + eps, z: pz, preferred: priorX >= box.x1 },
        { d: Math.abs(pz - box.z0), x: px, z: box.z0 - eps, preferred: priorZ <= box.z0 },
        { d: Math.abs(box.z1 - pz), x: px, z: box.z1 + eps, preferred: priorZ >= box.z1 }
      ];
      var preferred = options.filter(function (option) { return option.preferred; });
      var pool = preferred.length ? preferred : options;
      pool.sort(function (a, b) { return a.d - b.d; });
      return { x: pool[0].x, z: pool[0].z, hit: true };
    }
    for (var si = 0; si < steps; si++) {
      var nextX = curX + stepX, nextZ = curZ + stepZ;
      for (var ri = 1; ri < palace.rooms.length; ri++) {
        var room = palace.rooms[ri];
        if (!room || !room.center) continue;
        var prior = worldToRoomLocal(room, curX, curZ);
        var candidate = worldToRoomLocal(room, nextX, nextZ);
        if (!prior || !candidate) continue;
        var envelopeX = halfW + halfT + r, envelopeZ = halfD + halfT + r;
        if ((Math.abs(prior.lx) > envelopeX && Math.abs(candidate.lx) > envelopeX) ||
            (Math.abs(prior.lz) > envelopeZ && Math.abs(candidate.lz) > envelopeZ)) continue;
        var lx = candidate.lx, lz = candidate.lz, roomHit = false;
        for (var pass = 0; pass < 2; pass++) {
          walls.forEach(function (wall) {
            var pushed = pushOut(lx, lz, prior.lx, prior.lz, wall);
            if (pushed.hit) { lx = pushed.x; lz = pushed.z; roomHit = true; }
          });
        }
        if (roomHit) {
          var corrected = localToWorld(room, lx, lz);
          nextX = corrected.x; nextZ = corrected.z; result.collided = true;
        }
      }
      curX = nextX; curZ = nextZ;
    }
    result.x = curX; result.z = curZ;
    return result;
  }

  // ── Content fingerprints — student work must not silently change meaning ──
  // Locus ids are positional (`b0_i2`), so editing the outline, deleting a room
  // or reordering items re-points every per-locus store at DIFFERENT content:
  // a self-authored image written for "Allele" ends up captioning "Biome", and a
  // mastery record of five successful recalls certifies a fact never studied.
  // Nothing errors, so neither student nor teacher gets a signal.
  //
  // The fix is a fingerprint of the label taken when the student's work was
  // saved. If the label at that id no longer matches, the work is not applied —
  // it is marked stale so the host can offer it back or clear it, rather than
  // quietly attaching it to the wrong fact. Cheap, additive, and backward
  // compatible: a store with no fingerprints behaves exactly as before.
  function fingerprintLabel(label) {
    var norm = _foldLoose(label);
    if (!norm) return '';
    var h = 2166136261;
    for (var i = 0; i < norm.length; i++) { h ^= norm.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return (h >>> 0).toString(36);
  }

  // Which fingerprinted work no longer belongs where it is filed. Two cases, and
  // both matter: the id still exists but now holds DIFFERENT content (an edit or
  // a reorder), or the id is gone entirely (a room or item was deleted) and the
  // work is orphaned — invisible in the walk and never cleaned up. PURE.
  function staleLocusIds(palace, store) {
    var marks = (store && store.locusFor && typeof store.locusFor === 'object') ? store.locusFor : null;
    if (!marks) return [];
    var present = {};
    ((palace && palace.loci) || []).forEach(function (l) { if (l.id !== '__entry') present[l.id] = l; });
    var out = [];
    Object.keys(marks).forEach(function (id) {
      var recorded = marks[id];
      if (!recorded) return;                       // never fingerprinted ⇒ nothing to compare
      var l = present[id];
      if (!l) { out.push(id); return; }            // orphaned: the locus itself is gone
      if (String(recorded) !== fingerprintLabel(l.label)) out.push(id);
    });
    return out;
  }

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

    // Hub-and-spokes: rooms radiate from the central entry hub like spokes of a
    // wheel (each room rotated so its doorway faces the hub), instead of a single
    // linear corridor. Radius scales with the room count so N rooms fit around the
    // hub without overlapping it or each other. Room-local layout (loci on the two
    // long walls, doorway on the hub-facing end) is unchanged; we just rotate each
    // room by its spoke angle and rotate the loci world positions to match — so the
    // route, loci ids, camera rails, and recall all keep working.
    // Student-built rooms ride the same spoke ring, appended after the generated
    // ones so the walking ORDER a learner already knows is never re-shuffled.
    var mp = (data && data.memoryPalace) || {};
    var extraRooms = (opts.extraRooms && Array.isArray(opts.extraRooms)) ? opts.extraRooms
      : (Array.isArray(mp.extraRooms) ? mp.extraRooms : []);
    var extraLoci = (opts.extraLoci && Array.isArray(opts.extraLoci)) ? opts.extraLoci
      : (Array.isArray(mp.extraLoci) ? mp.extraLoci : []);
    var roomKeys = branches.map(function (b, bi) { return 'b' + bi; })
      .concat(extraRooms.map(function (r, ri) { return (r && r.id) ? String(r.id) : (EXTRA_ROOM_PREFIX + (ri + 1)); }));
    // Group the student's loci by room, keeping their authoring order. A locus
    // whose room vanished (the document regenerated with fewer branches) is
    // re-homed into the first room rather than silently deleted — it is the
    // student's work, not ours to throw away.
    var extrasByRoom = {};
    roomKeys.forEach(function (k) { extrasByRoom[k] = []; });
    extraLoci.forEach(function (e) {
      if (!e || !e.id) return;
      var key = String(e.room == null ? '' : e.room);
      if (!extrasByRoom[key]) key = roomKeys[0];
      if (!key || !extrasByRoom[key]) return;                 // no rooms at all ⇒ nothing to hang it on
      extrasByRoom[key].push(e);
    });
    // Place one student locus in room-local space (its own spot, never a wall slot).
    function pushExtra(e, k, roomIdx, bi, ang, rot) {
      var spot = (isNum(e.lx) && isNum(e.lz)) ? { lx: e.lx, lz: e.lz } : extraSpotFor(k);
      var fp = rot(spot.lx, spot.lz);
      var cp = rot(spot.lx - CAM_BACK, spot.lz);              // stand between the doorway and it
      loci.push({
        id: String(e.id), roomIdx: roomIdx, branchIdx: bi, itemIdx: -1, mine: true,
        lx: spot.lx, lz: spot.lz,
        label: _itemText(e.label != null ? e.label : e.text),
        mnemonic: (e.mnemonic != null) ? String(e.mnemonic) : '',
        framePos: { x: fp.x, y: EYE + 20, z: fp.z }, faceDir: -1,
        faceYaw: ang + Math.PI,                               // face back toward the doorway
        camPos: { x: cp.x, y: EYE, z: cp.z },
        lookAt: { x: fp.x, y: EYE + 20, z: fp.z }
      });
      route.push(String(e.id));
    }

    // The inner ring is sized by the GENERATED rooms alone, so building an annex
    // never re-angles a spoke the student has already walked a hundred times.
    var N = Math.max(1, branches.length);
    var SPOKE_R = Math.max(ROOM_W * 1.4, (N * ROOM_D) / (2 * Math.PI) * 1.25 + ROOM_W / 2);
    // Student rooms ride an outer ring on a FIXED 8-slot carousel (offset half a
    // slot so they sit between the inner spokes, never directly behind one).
    // Fixed slots ⇒ adding the 3rd annex does not move the 1st or 2nd.
    var OUTER_SLOTS = 8;
    var OUTER_GAP = ROOM_W * 1.35;
    function outerRoomPlacement(ri) {
      var lap = Math.floor(ri / OUTER_SLOTS);
      return {
        ang: (2 * Math.PI * ((ri % OUTER_SLOTS) + 0.5)) / OUTER_SLOTS,
        r: SPOKE_R + OUTER_GAP * (lap + 1)
      };
    }
    branches.forEach(function (b, bi) {
      var roomIdx = bi + 1;
      var ang = (2 * Math.PI * bi) / N;                 // spoke angle (room's rotation.y)
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var cx = SPOKE_R * ca, cz = -SPOKE_R * sa;        // room center, out along local +x
      var color = PALETTE[bi % PALETTE.length];
      var title = (b && b.title != null) ? String(b.title) : ('Room ' + roomIdx);
      rooms.push({ key: 'b' + bi, label: title, index: roomIdx, center: { x: cx, z: cz }, angle: ang, color: color });
      var items = (b && Array.isArray(b.items)) ? b.items : [];
      var mnems = (b && Array.isArray(b.mnemonics)) ? b.mnemonics : [];
      var slots = Math.max(1, Math.ceil(items.length / 2));
      // rotate a room-local (lx,lz) offset by the spoke angle into world (matches
      // three.js rotation.y = ang applied to the room group in mountGL).
      var rot = function (lx, lz) { return { x: cx + lx * ca + lz * sa, z: cz - lx * sa + lz * ca }; };
      items.forEach(function (it, ii) {
        var side = ii % 2 === 0 ? -1 : 1;               // alternate the two long walls
        var slot = Math.floor(ii / 2);
        var lx = -ROOM_W / 2 + ((slot + 1) * ROOM_W) / (slots + 1);   // along the room length
        var lz = side * (ROOM_D / 2 - 6);                             // on a long wall
        var faceDir = -side;                            // frame faces into the room
        var fp = rot(lx, lz);
        var cp = rot(lx, lz - side * CAM_BACK);         // camera backs off toward the interior
        var id = 'b' + bi + '_i' + ii;                  // matches adaptGenerated ids
        loci.push({
          id: id, roomIdx: roomIdx, branchIdx: bi, itemIdx: ii,
          label: _itemText(it),
          mnemonic: (mnems[ii] != null) ? String(mnems[ii]) : '',
          framePos: { x: fp.x, y: EYE + 20, z: fp.z }, faceDir: faceDir,
          faceYaw: ang + (faceDir > 0 ? 0 : Math.PI),   // frame world y-rotation
          camPos: { x: cp.x, y: EYE, z: cp.z },
          lookAt: { x: fp.x, y: EYE + 20, z: fp.z }
        });
        route.push(id);
      });
      (extrasByRoom['b' + bi] || []).forEach(function (e, k) { pushExtra(e, k, roomIdx, bi, ang, rot); });
    });

    // Rooms the student added themselves — no generated items, only their own loci.
    extraRooms.forEach(function (r, ri) {
      var bi = branches.length + ri;
      var roomIdx = bi + 1;
      var key = (r && r.id) ? String(r.id) : (EXTRA_ROOM_PREFIX + (ri + 1));
      var place = outerRoomPlacement(ri);
      var ang = place.ang;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var cx = place.r * ca, cz = -place.r * sa;
      var rot = function (lx, lz) { return { x: cx + lx * ca + lz * sa, z: cz - lx * sa + lz * ca }; };
      rooms.push({
        key: key, label: (r && r.title != null) ? String(r.title) : ('Room ' + roomIdx),
        index: roomIdx, center: { x: cx, z: cz }, angle: ang,
        color: PALETTE[bi % PALETTE.length], mine: true
      });
      (extrasByRoom[key] || []).forEach(function (e, k) { pushExtra(e, k, roomIdx, bi, ang, rot); });
    });

    // A saved self-authored image wins over the generated one everywhere the
    // mnemonic is read (see the generation-effect note above).
    var ownMnemonics = (opts.myMnemonics && typeof opts.myMnemonics === 'object')
      ? opts.myMnemonics
      : ((data && data.memoryPalace && data.memoryPalace.myMnemonics && typeof data.memoryPalace.myMnemonics === 'object')
        ? data.memoryPalace.myMnemonics : null);
    var locusMarks = (opts.locusFor && typeof opts.locusFor === 'object')
      ? opts.locusFor
      : ((mp && mp.locusFor && typeof mp.locusFor === 'object') ? mp.locusFor : null);
    loci.forEach(function (l) {
      l.aiMnemonic = l.mnemonic || '';
      // The content at this id changed since the student's work was saved, so
      // their image belongs to a different fact — show it as stale, never as if
      // they had written it about this one.
      var mark = locusMarks ? locusMarks[l.id] : null;
      l.contentChanged = !!(mark && String(mark) !== fingerprintLabel(l.label));
      var own = ownMnemonics ? ownMnemonics[l.id] : null;
      var ownText = (typeof own === 'string') ? own.trim() : '';
      if (ownText && l.id !== '__entry' && !l.contentChanged) { l.mnemonic = ownText; l.mnemonicSource = 'self'; }
      else l.mnemonicSource = l.mnemonic ? 'ai' : '';
    });

    var preferredRoute = Array.isArray(opts.routeOrder)
      ? opts.routeOrder
      : (data && data.memoryPalace && Array.isArray(data.memoryPalace.routeOrder) ? data.memoryPalace.routeOrder : null);
    route = normalizeRouteOrder(route, preferredRoute);

    // Preserve explicit non-linear branch relationships for the overview scene.
    // The authored walking route stays the source of truth; adjacent unlabeled
    // fallback edges are omitted so these threads communicate meaning, not order.
    var roomLinks = [], roomLinkSeen = {};
    branches.forEach(function (branch, sourceIdx) {
      var rawConnections = branch && Array.isArray(branch.connections) ? branch.connections : (branch && Array.isArray(branch.connectsTo) ? branch.connectsTo : []);
      rawConnections.forEach(function (rawConnection) {
        var target = typeof rawConnection === 'number' ? rawConnection : (rawConnection && rawConnection.target);
        target = Number(target);
        if (!isFinite(target) || Math.floor(target) !== target || target < 0 || target >= branches.length || target === sourceIdx) return;
        var label = typeof rawConnection === 'object' && rawConnection && rawConnection.label != null ? String(rawConnection.label).trim() : '';
        if (!label && target === sourceIdx + 1) return;
        var a = Math.min(sourceIdx, target), b = Math.max(sourceIdx, target), key = a + '|' + b;
        if (roomLinkSeen[key]) return;
        roomLinkSeen[key] = true;
        roomLinks.push({ fromRoomIdx: sourceIdx + 1, toRoomIdx: target + 1, label: label });
      });
    });

    var outerLaps = extraRooms.length ? Math.floor((extraRooms.length - 1) / OUTER_SLOTS) + 1 : 0;
    var reach = SPOKE_R + OUTER_GAP * outerLaps + ROOM_D / 2 + 80;   // radial extent, annexes included
    return {
      version: VERSION, title: main,
      rooms: rooms, loci: loci, route: route, roomLinks: roomLinks,
      bounds: { minX: -reach, maxX: reach, minZ: -reach, maxZ: reach, width: 2 * reach }
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

  // ── decorSpot / landmarkSpot — PURE placement math for radial rooms ──
  // Where a sculpture stands for a locus: beside the frame along the wall, and
  // stepped out into the room. The offsets are FRAME-LOCAL, so they must rotate
  // with faceYaw — the old axis-aligned +x/+z offsets predate hub-and-spokes and
  // put sculptures inside walls in every rotated room. Legacy persisted palaces
  // (no faceYaw) keep the old behaviour.
  var DECOR_ALONG = 100, DECOR_OUT = 100;
  function decorSpot(locus) {
    if (!locus || !locus.framePos) return null;
    if (locus.faceYaw == null) {
      return { x: locus.framePos.x + DECOR_ALONG, z: locus.framePos.z + (locus.faceDir || 1) * DECOR_OUT };
    }
    var sy = Math.sin(locus.faceYaw), cy = Math.cos(locus.faceYaw);
    return {
      x: locus.framePos.x + DECOR_ALONG * cy + DECOR_OUT * sy,
      z: locus.framePos.z - DECOR_ALONG * sy + DECOR_OUT * cy
    };
  }
  // Where a room's landmark stands: against the far (solid) wall, room-local
  // +x end, rotated onto the room's spoke. rotY turns the figure to face back
  // toward the doorway. Legacy rooms (no angle) keep the linear-corridor spot.
  var LANDMARK_INSET = 115;
  function landmarkSpot(room) {
    if (!room || !room.center) return null;
    if (room.angle == null) return { x: room.center.x, z: -ROOM_D / 2 + LANDMARK_INSET, rotY: 0 };
    var lx = ROOM_W / 2 - LANDMARK_INSET;
    return {
      x: room.center.x + lx * Math.cos(room.angle),
      z: room.center.z - lx * Math.sin(room.angle),
      // figure front (+z) turned to face back toward the doorway (room-local -x)
      rotY: room.angle - Math.PI / 2
    };
  }

  // decor (optional) = { locusId: 'Torch' } — the human name of the 3D object /
  // stamp the student placed at a locus, so screen-reader users get parity with
  // what sighted users SEE decorating the frame (the decoration is a retrieval
  // cue, not the answer). PURE: the caller supplies the labels.
  function _decorLabel(decor, id) {
    var v = decor && decor[id];
    return (typeof v === 'string' && v.trim()) ? v.trim() : '';
  }

  // ── describeLocusForSR — the announcement is the mnemonic's home ──
  function describeLocusForSR(palace, id, t, decor) {
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
      var dl = _decorLabel(decor, id);
      if (dl) parts.push(_tr(t, 'memory_palace.sr_decoration', 'Decoration') + ': ' + dl);
    }
    return parts.join('. ');
  }

  // ── Recall game (P2) — pure, testable logic ─────────────────────────
  // The walk becomes the game board: frames keep their images (the CUE) but
  // hide their labels; the student recalls what lives at each locus. Bank
  // mode (recognition, the UDL default) or typed Expert mode (free recall).

  function _lcg(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  // Deterministic (seeded) shuffle so runs vary for students but tests can pin it.
  function buildRecallBank(palace, seed) {
    var items = ((palace && palace.loci) || [])
      .filter(function (l) { return l.id !== '__entry'; })
      .map(function (l) { return { id: l.id, label: l.label }; });
    var rnd = _lcg(isNum(seed) ? seed : 1);
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = items[i]; items[i] = items[j]; items[j] = tmp;
    }
    return items;
  }

  function _hashId(str) {
    var h = 2166136261;
    str = String(str == null ? '' : str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  // ── Choices for ONE locus — a constant-size question, not a shrinking one ──
  // The old bank held one chip per locus and removed each answered chip, so the
  // choice set collapsed as the walk went on and the final locus was a forced
  // single choice — answerable with no retrieval at all, yet scored as a perfect
  // first-try recall and rewarded with the longest review interval. A fixed-size
  // set per locus keeps recognition scaffolded (the UDL reason bank mode exists)
  // while keeping the question honest from the first locus to the last.
  // Seeded by run AND locus, so a set is stable if you come back to a locus but
  // differs between loci and between runs.
  var RECALL_CHOICE_COUNT = 6;
  function buildLocusChoices(palace, locusId, opts) {
    opts = opts || {};
    var all = ((palace && palace.loci) || []).filter(function (l) { return l.id !== '__entry'; });
    var target = null, pool = [];
    all.forEach(function (l) {
      if (l.id === locusId) target = l;
      else pool.push({ id: l.id, label: l.label });
    });
    if (!target) return [];
    // A distractor that reads the same as the answer would make the item
    // unanswerable rather than harder.
    var answerText = _foldLoose(target.label);
    pool = pool.filter(function (c) { return _foldLoose(c.label) !== answerText; });
    var want = isNum(opts.size) ? opts.size : RECALL_CHOICE_COUNT;
    want = Math.max(2, Math.min(want, pool.length + 1));
    var rnd = _lcg((((isNum(opts.seed) ? opts.seed : 1) >>> 0) ^ _hashId(locusId)) >>> 0);
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var out = pool.slice(0, Math.max(0, want - 1));
    out.push({ id: target.id, label: target.label });
    for (var k = out.length - 1; k > 0; k--) {
      var j2 = Math.floor(rnd() * (k + 1));
      var t2 = out[k]; out[k] = out[j2]; out[j2] = t2;
    }
    return out;
  }

  // ── Recall ORDER — forward is the walk; backward and shuffled are the check ──
  // Reciting a route in reverse (or from a random start) is the classic probe
  // for whether content is anchored to PLACES or just rehearsed as a list: a
  // serial rehearsal collapses when the order changes, a locus-anchored one
  // survives. Nothing about the palace moves — only the sequence the quiz
  // visits, so scoring, mastery and the geography stay exactly as they were.
  var RECALL_DIRECTIONS = ['forward', 'backward', 'shuffle'];
  function buildRecallOrder(palace, opts) {
    opts = opts || {};
    var ids = ((palace && palace.route) || []).filter(function (id) { return id !== '__entry'; });
    // `only` narrows the walk to a subset — the loci actually due for review.
    // Spacing only pays off if the due set is what gets practised; re-testing the
    // whole palace every time is arithmetically a schedule and pedagogically none.
    // Unknown ids are ignored, and an empty result falls back to the full route so
    // a stale due list can never hand back a quiz with nothing in it.
    if (Array.isArray(opts.only) && opts.only.length) {
      var keep = {};
      opts.only.forEach(function (id) { keep[String(id)] = true; });
      var narrowed = ids.filter(function (id) { return keep[id]; });
      if (narrowed.length) ids = narrowed;
    }
    var dir = String(opts.direction || 'forward');
    if (dir === 'backward') return ids.reverse();          // filter() already gave us a fresh array
    if (dir === 'shuffle') {
      var rnd = _lcg(isNum(opts.seed) ? opts.seed : 1);
      for (var i = ids.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
      }
      return ids;
    }
    return ids;
  }

  // Answer matching has to work in the language the content is written in. The
  // old final step was `replace(/[^a-z0-9]+/g,' ')`, which reduces ANY non-Latin
  // string to '' — so an exactly correct answer in Japanese, Russian, Arabic,
  // Hebrew, Devanagari, Greek or Thai was marked wrong, and each attempt fed the
  // schedule a failure. Keep letters and digits from EVERY script; drop only
  // punctuation and symbols.
  var _PUNCT_ANY_SCRIPT = null;
  try { _PUNCT_ANY_SCRIPT = new RegExp('[^\\p{L}\\p{N}]+', 'gu'); } catch (e) { _PUNCT_ANY_SCRIPT = null; }
  function _normAnswer(s) {
    s = String(s == null ? '' : s).toLowerCase().trim();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}   // fold accents
    try { s = s.normalize('NFKC'); } catch (e) {}
    if (_PUNCT_ANY_SCRIPT) s = s.replace(_PUNCT_ANY_SCRIPT, ' ');
    else s = s.replace(/[^a-z0-9]+/g, ' ');                                       // ancient-engine fallback
    return s.replace(/\s+/g, ' ').trim();
  }
  function _lev(a, b) {
    var m = a.length, n = b.length;
    var prev = new Array(n + 1), cur = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      for (var k = 1; k <= n; k++) {
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
      }
      var swap = prev; prev = cur; cur = swap;
    }
    return prev[n];
  }
  // Forgiving typed-answer matcher: case/accents/punctuation-insensitive, and a
  // small edit-distance tolerance so a recall exercise never becomes a spelling
  // test (per the UDL rationale in docs/memory_palace_3d_design.md §7.2).
  function matchAnswer(expected, given) {
    var e = _normAnswer(expected), g = _normAnswer(given);
    if (!e || !g) return false;
    if (e === g) return true;
    var tol = e.length >= 10 ? 2 : (e.length >= 6 ? 1 : 0);
    if (!tol || Math.abs(e.length - g.length) > tol) return false;
    return _lev(e, g) <= tol;
  }

  // ── Directed-generation prompt gate (advanced mode) ─────────────────
  // The student writes their OWN prompt for a locus; an AI stage evaluates it
  // BEFORE generating: reject (off-topic / not classroom-appropriate), enhance
  // (on-topic but too vague → enriched), or ok. PURE builder + parser; the host
  // owns callGemini. Pedagogy: generation effect + prompt-craft literacy + a safety gate.
  function buildPromptEvalPrompt(opts) {
    opts = opts || {};
    var kind = opts.mode === 'sculpture' ? 'a small 3D sculpture' : 'an illustration';
    return [
      'You are helping a K-12 student direct an AI to create ' + kind + ' for one spot ("locus") in their memory palace.',
      (opts.topic ? 'Topic / unit: ' + opts.topic : ''),
      'The locus must help them remember this fact: "' + String(opts.itemLabel || '') + '".',
      (opts.mnemonic ? 'A suggested mnemonic image for it: "' + opts.mnemonic + '".' : ''),
      'The student wrote this prompt for the AI: "' + String(opts.userPrompt || '') + '"',
      'Judge the student prompt and reply with ONE verdict:',
      '- "reject": it is off-topic (unrelated to the fact), or not appropriate/safe for a school classroom. Give a short, kind reason and a nudge toward the fact.',
      '- "enhance": it is on-topic and appropriate but too vague or thin to make a VIVID, memorable image. Keep the student\'s idea and enrich it with concrete visual detail (clear subject, colors, composition, a memorable exaggeration tied to the fact). Return the improved prompt.',
      '- "ok": it is already clear, appropriate, and vivid.',
      'Return ONLY JSON: { "verdict": "ok"|"enhance"|"reject", "reason": "one or two short sentences for the student", "enhancedPrompt": "the improved or original prompt; omit for reject" }'
    ].filter(Boolean).join('\n');
  }
  function parsePromptEval(text) {
    var s = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    var parsed; try { parsed = JSON.parse(s); } catch (e) { return null; }
    if (!parsed || typeof parsed !== 'object') return null;
    var v = String(parsed.verdict || '').toLowerCase();
    if (v !== 'ok' && v !== 'enhance' && v !== 'reject') return null;
    return {
      verdict: v,
      reason: (parsed.reason != null) ? String(parsed.reason).slice(0, 400) : '',
      enhancedPrompt: (parsed.enhancedPrompt != null) ? String(parsed.enhancedPrompt).slice(0, 600) : ''
    };
  }

  // PURE: Imagen prompt for a grayscale DEPTH MAP of a locus subject — the Art Studio
  // stereogram trick (white = near, black = far). Paired with the color illustration it
  // drives a displacementMap "relief statue" at the locus: no new ML, ships in-Canvas
  // (design doc P4a; Depth-Anything popup remains the future fidelity upgrade).
  function buildDepthPrompt(subject) {
    return 'A smooth, high-quality, continuous 3D grayscale depth map of: ' + String(subject || '').trim() +
      '. The closest parts must be pure white, and the furthest background pure black. ' +
      'Soft gradients between depths, single centered subject matching the illustration, no text, no floating artifacts. Fill the entire square frame.';
  }

  // Refine an EXISTING sculpture recipe by a student instruction. The canonical
  // implementation now lives in Prim3D (so the sculpting primitive is reusable);
  // delegate to it, with an inline fallback if Prim3D isn't loaded.
  function buildRefinePrompt(recipe, instruction, opts) {
    var P = window.AlloModules && window.AlloModules.Prim3D;
    if (P && typeof P.buildRefinePrompt === 'function') return P.buildRefinePrompt(recipe, instruction, opts);
    var json = '';
    try { json = JSON.stringify(recipe); } catch (e) { json = '{}'; }
    return [
      'Here is a small 3D object built from primitive shapes, as JSON:',
      json,
      'The student wants this change: "' + String(instruction || '') + '"',
      'Modify the JSON to make that change while keeping it a recognizable, charming low-poly object.',
      'Use ONLY box, sphere, cylinder, cone, torus. Keep the SAME JSON shape:',
      '{ "name": "...", "parts": [ { "shape": "box", "size": [w,h,d], "position": [x,y,z], "rotation": [rx,ry,rz], "color": "#rrggbb" } ] }',
      'Rules: 4-24 parts; y is UP; the object STANDS ON y=0; sizes/positions in the same small range as the input; school-appropriate; no text.',
      'Return ONLY the updated JSON.'
    ].join('\n');
  }

  // results: {locusId: {attempts, correct, revealed}} → totals + points.
  // First-try recalls score full marks; eventual recalls half; reveals nothing.
  function scoreRecall(results) {
    var total = 0, firstTry = 0, eventual = 0, revealed = 0, selfRated = 0;
    Object.keys(results || {}).forEach(function (id) {
      var r = results[id]; if (!r) return;
      total++;
      if (r.revealed) { revealed++; return; }
      if (r.selfRated) { selfRated++; if (r.correct) eventual++; return; }
      if (r.correct && r.attempts <= 1) firstTry++;
      else if (r.correct) eventual++;
    });
    return {
      total: total, firstTry: firstTry, eventual: eventual, revealed: revealed,
      // Self-rated walks are counted separately so a summary can say what kind of
      // evidence it is rather than presenting a self-report as a measured recall.
      selfRated: selfRated,
      points: firstTry * 10 + eventual * 5,
      perfect: total > 0 && firstTry === total
    };
  }

  // ── Spaced-repetition mastery (P2.5) — the recall walk MEASURES; this SCHEDULES ──
  // Per-locus record: { reps, strength, lastResult, lastReviewedAt, dueAt }. Spaced
  // retrieval is the single best-evidenced memory technique, and the recall walk
  // already yields per-locus performance — so this is nearly free. PURE: `nowISO`
  // is injected (tests pin time; the module never reads the clock). Spacing is an
  // SM-2-lite doubling ladder that advances on strong recall and drops back on a
  // slip, so review focus tracks the student's OWN measured memory.
  var _REVIEW_LADDER = [1, 3, 7, 16, 35, 75];   // days between successful reviews

  // Strength is a claim about RETRIEVAL, so it has to distinguish how the answer
  // arrived. Being right on the fourth guess is elimination, not recall, and used
  // to score the same 0.6 as a near-miss — which advanced the ladder and bought a
  // longer gap. A self-rated "I remembered" is a real retrieval attempt but an
  // unverified one, so it tops out where an eventual recall does.
  function _strengthOf(r) {
    if (!r) return 0;
    if (r.revealed) return 0.2;
    var attempts = isNum(r.attempts) ? r.attempts : 1;
    if (!r.correct) return 0;                              // missed
    if (r.selfRated) return 0.6;                           // self-reported, not verified
    if (attempts <= 1) return 1.0;                         // first try
    if (attempts <= 2) return 0.6;                         // got it, eventually
    return 0.2;                                            // guessed through the options
  }
  function _parseDay(iso) { var t = Date.parse(iso); return isNaN(t) ? 0 : t; }
  function _sameUtcDay(a, b) {
    if (!a || !b) return false;
    return String(a).slice(0, 10) === String(b).slice(0, 10);
  }
  function _addDays(iso, days) { return new Date(_parseDay(iso) + days * 86400000).toISOString(); }

  // prevMastery + a recall walk's per-locus results (+ now) → updated mastery map.
  function updateMastery(prevMastery, resultsMap, nowISO) {
    var m = Object.assign({}, prevMastery || {});
    var results = resultsMap || {};
    Object.keys(results).forEach(function (id) {
      var s = _strengthOf(results[id]);
      var prev = m[id] || { reps: 0 };
      var prevReps = isNum(prev.reps) ? prev.reps : 0;
      var lastResult0 = (results[id] && results[id].revealed) ? 'revealed' : (s >= 1 ? 'first-try' : (s >= 0.6 ? 'eventual' : 'missed'));
      // Massed practice must not buy a longer gap. Walking the same palace six
      // times in five minutes used to advance reps six times and push the next
      // review out to the top of the ladder — the exact opposite of spacing. A
      // repeat success on a day already reviewed is recorded but does NOT advance
      // the schedule. A repeat FAILURE still demotes: forgetting is news whenever
      // it happens, and the item should come back tomorrow.
      if (_sameUtcDay(prev.lastReviewedAt, nowISO) && s >= 0.6) {
        m[id] = {
          reps: prevReps, strength: s, lastResult: lastResult0, lastReviewedAt: nowISO,
          dueAt: prev.dueAt || _addDays(nowISO, 1)
        };
        return;
      }
      var reps = (s >= 0.6) ? (prevReps + 1) : Math.max(0, prevReps - 1);
      // Success indexes the ladder at reps-1, so the FIRST correct recall spaces at
      // 1 day (ladder[0]), not 3. ANY failure to recall — a wrong guess (s=0) OR a
      // give-up reveal (s=0.2) — reschedules for tomorrow; giving up must never push
      // an item weeks out (which the old `s === 0` gate did to revealed items).
      var idx = Math.max(0, Math.min(_REVIEW_LADDER.length - 1, reps - 1));
      var intervalDays = (s < 0.6) ? 1 : _REVIEW_LADDER[idx];
      m[id] = { reps: reps, strength: s, lastResult: lastResult0, lastReviewedAt: nowISO, dueAt: _addDays(nowISO, intervalDays) };
    });
    return m;
  }

  // Which loci are due for review (dueAt <= now) vs never-reviewed ("new").
  function dueLoci(palace, mastery, nowISO) {
    var now = _parseDay(nowISO);
    var ids = (palace && Array.isArray(palace.route)) ? palace.route.filter(function (id) { return id !== '__entry'; }) : [];
    mastery = mastery || {};
    var due = [], newIds = [];
    ids.forEach(function (id) {
      var rec = mastery[id];
      if (!rec) { newIds.push(id); return; }
      if (_parseDay(rec.dueAt) <= now) due.push(id);
    });
    return { due: due, newIds: newIds, dueCount: due.length, newCount: newIds.length,
             total: ids.length, reviewedCount: ids.length - newIds.length };
  }

  // 0..1 recall strength for a locus (null = never reviewed) — powers dimming.
  function masteryStrength(mastery, id) {
    var rec = mastery && mastery[id];
    return (rec && typeof rec.strength === 'number') ? rec.strength : null;
  }

  // Room-level mastery is an overview aid, not a second score: it averages the
  // per-locus retrieval strengths already recorded and reports coverage separately
  // so a room with one reviewed locus never looks as confident as a fully reviewed
  // room. PURE and intentionally recall-agnostic; the renderer decides when to show it.
  function roomMasterySummary(palace, mastery) {
    var rooms = (palace && Array.isArray(palace.rooms)) ? palace.rooms : [];
    var loci = (palace && Array.isArray(palace.loci)) ? palace.loci : [];
    var out = rooms.map(function () { return { count: 0, rated: 0, average: null, coverage: 0 }; });
    loci.forEach(function (locus) {
      if (!locus || locus.id === '__entry' || typeof locus.roomIdx !== 'number' || !out[locus.roomIdx]) return;
      var bucket = out[locus.roomIdx];
      bucket.count += 1;
      var strength = masteryStrength(mastery, locus.id);
      if (strength == null) return;
      bucket.rated += 1;
      bucket.average = (bucket.average == null ? 0 : bucket.average) + Math.max(0, Math.min(1, strength));
    });
    out.forEach(function (bucket) {
      if (bucket.rated) bucket.average = bucket.average / bucket.rated;
      bucket.coverage = bucket.count ? bucket.rated / bucket.count : 0;
    });
    return out;
  }

  // Recall-safe announcement: room + position + the QUESTION — never the answer
  // or the mnemonic (both would leak through the live region / route list). The
  // decoration name IS included: it's the visible cue a sighted player sees at
  // the frame (equivalent to the image cue), and it's a memory aid, not the answer.
  function describeLocusForRecall(palace, id, t, decor) {
    var l = locusById(palace, id);
    if (!l) return '';
    if (l.id === '__entry') return describeLocusForSR(palace, id, t, decor);
    var route = palace.route || [];
    var pos = route.indexOf(id);
    var room = (palace.rooms || [])[l.roomIdx];
    var parts = [];
    if (pos >= 0) parts.push(_tr(t, 'memory_palace.sr_locus', 'Locus') + ' ' + pos + ' ' + _tr(t, 'memory_palace.sr_of', 'of') + ' ' + (route.length - 1));
    if (room) parts.push(room.label + ' ' + _tr(t, 'memory_palace.sr_room', 'room'));
    var dl = _decorLabel(decor, id);
    if (dl) parts.push(_tr(t, 'memory_palace.sr_cue', 'Your cue here') + ': ' + dl);
    parts.push(_tr(t, 'memory_palace.sr_recall_q', 'What belongs at this locus?'));
    return parts.join('. ');
  }

  // ── Accessible route DOM (source of truth; visible on any failure) ──
  function buildRouteDom(palace, t, visible, recall, decor, onSelect) {
    var wrap = document.createElement('div');
    wrap.style.cssText = visible ? 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;' : SR_ONLY;
    var heading = document.createElement('div');
    heading.textContent = _tr(t, 'memory_palace.route_title', 'Palace route');
    heading.style.cssText = visible ? 'font-weight:800;font-size:13px;margin-bottom:6px;color:#f1f5f9;' : '';
    wrap.appendChild(heading);
    var ol = document.createElement('ol');
    ol.setAttribute('aria-label', _tr(t, 'memory_palace.route_aria', 'Memory palace route in walking order'));
    ol.style.cssText = visible ? 'font-size:13px;line-height:1.7;padding-left:22px;margin:0;' : 'margin:0;';
    (palace.route || []).forEach(function (id, index) {
      var li = document.createElement('li');
      var description = recall ? describeLocusForRecall(palace, id, t, decor) : describeLocusForSR(palace, id, t, decor);
      if (visible && typeof onSelect === 'function') {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = description;
        button.setAttribute('data-route-index', String(index));
        button.setAttribute('aria-label', (index === 0 ? 'Entrance. ' : ('Locus ' + index + '. ')) + description);
        button.style.cssText = 'display:block;width:100%;min-height:44px;margin:4px 0;padding:8px 10px;text-align:left;color:#e2e8f0;background:#1e293b;border:1px solid #475569;border-radius:8px;cursor:pointer;font:inherit;line-height:1.45;';
        button.onclick = function () { onSelect(index); };
        li.appendChild(button);
      } else {
        li.textContent = description;
      }
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
  function _appTypography(fontPx) {
    var scale = 1, family = 'system-ui, -apple-system, sans-serif', spacing = '0px', contrast = false;
    try {
      var rootStyle = window.getComputedStyle(document.documentElement);
      var appRoot = document.querySelector('.allo-docsuite') || document.body || document.documentElement;
      var appStyle = window.getComputedStyle(appRoot);
      var base = parseFloat(rootStyle.fontSize);
      if (isNum(base) && base > 0) scale = Math.max(0.75, Math.min(1.5, base / 16));
      if (appStyle.fontFamily) family = appStyle.fontFamily;
      if (appStyle.letterSpacing && appStyle.letterSpacing !== 'normal') spacing = appStyle.letterSpacing;
      contrast = !!(appRoot.classList && appRoot.classList.contains('theme-contrast'));
    } catch (e) {}
    return {
      font: Math.max(16, Math.round((fontPx || 26) * scale)),
      family: family,
      spacing: spacing,
      contrast: contrast,
      key: scale.toFixed(3) + '|' + family + '|' + spacing + '|' + (contrast ? '1' : '0')
    };
  }

  function _labelLines(ctx, text, maxWidth) {
    var full = String(text || '').replace(/\s+/g, ' ').trim();
    if (!full) return [''];
    var rest = Array.from(full), lines = [];
    function trimLead(chars) { while (chars.length && /\s/.test(chars[0])) chars.shift(); return chars; }
    while (rest.length && lines.length < 2) {
      trimLead(rest);
      var fit = 0;
      while (fit < rest.length && ctx.measureText(rest.slice(0, fit + 1).join('')).width <= maxWidth) fit++;
      if (fit >= rest.length) { lines.push(rest.join('')); rest = []; break; }
      fit = Math.max(1, fit);
      var breakAt = -1;
      for (var bi = fit - 1; bi >= Math.floor(fit * 0.45); bi--) { if (/\s/.test(rest[bi])) { breakAt = bi; break; } }
      var take = breakAt > 0 ? breakAt : fit;
      lines.push(rest.slice(0, take).join('').trim());
      rest = rest.slice(breakAt > 0 ? breakAt + 1 : take);
    }
    if (rest.length) {
      var tail = Array.from(lines[lines.length - 1] || '');
      while (tail.length > 1 && ctx.measureText(tail.join('').replace(/\s+$/, '') + '\u2026').width > maxWidth) tail.pop();
      lines[lines.length - 1] = tail.join('').replace(/\s+$/, '') + '\u2026';
    }
    return lines.length ? lines : [''];
  }

  function makeLabelSprite(THREE, text, hex, fontPx, occlusionSafe, anisotropy, appearance) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var type = _appTypography(fontPx);
    var plaque = appearance === 'plaque';
    var font = type.font, padX = Math.round(font * 0.72), padY = Math.round(font * 0.45);
    var lineH = Math.round(font * 1.2), maxTextW = Math.round(420 * (font / 24));
    ctx.font = '800 ' + font + 'px ' + type.family;
    if ('letterSpacing' in ctx) ctx.letterSpacing = type.spacing;
    var lines = _labelLines(ctx, text, maxTextW);
    var tw = 2;
    lines.forEach(function (line) { tw = Math.max(tw, Math.ceil(ctx.measureText(line).width)); });
    var logicalW = tw + padX * 2, logicalH = lines.length * lineH + padY * 2;
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.ceil(logicalW * dpr); canvas.height = Math.ceil(logicalH * dpr);
    ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.font = '800 ' + font + 'px ' + type.family;
    if ('letterSpacing' in ctx) ctx.letterSpacing = type.spacing;
    var rad = plaque ? 5 : Math.min(18, logicalH / 2);
    ctx.fillStyle = type.contrast ? '#000000' : (plaque ? '#f4ecdc' : 'rgba(2,6,23,0.97)');
    _roundRect(ctx, 1, 1, logicalW - 2, logicalH - 2, rad);
    ctx.strokeStyle = type.contrast ? '#ffffff' : (plaque ? '#b9a782' : (hex || '#cbd5e1'));
    ctx.lineWidth = type.contrast ? 5 : (plaque ? 1.5 : 3.5);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(2.5, 2.5, logicalW - 5, logicalH - 5, Math.max(2, rad - 2));
    else ctx.rect(2.5, 2.5, logicalW - 5, logicalH - 5);
    ctx.stroke();
    if (plaque && !type.contrast) {
      ctx.fillStyle=hex || '#6366f1';ctx.fillRect(5,8,3,Math.max(4,logicalH-16));
    }
    ctx.fillStyle = type.contrast ? '#fff200' : (plaque ? '#182b3d' : '#ffffff');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = plaque && !type.contrast ? 0 : 4;
    lines.forEach(function (line, i) { ctx.fillText(line, logicalW / 2, padY + lineH * (i + 0.5)); });
    var tex = new THREE.CanvasTexture(canvas);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = Math.max(1, Number(anisotropy) || 1);
    // Locus captions sit just in front of a wall. Because sprites always face
    // the camera, a wide caption can rotate partly behind that wall at an
    // oblique viewing angle unless its depth test is disabled. Keep this opt-in
    // so room and connection labels still obey normal room-to-room occlusion.
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: !occlusionSafe,
      depthWrite: false,
      toneMapped: false
    }));
    var k = 0.5; sp.scale.set(logicalW * k, logicalH * k, 1);
    sp.userData.typographyKey = type.key;
    sp.userData.captionAppearance = appearance || 'standard';
    sp.userData.baseScale = { x: logicalW * k, y: logicalH * k };
    sp.renderOrder = occlusionSafe ? 24 : 12;
    sp.userData.occlusionSafe = !!occlusionSafe;
    return sp;
  }

  // Placeholder card texture for an unfurnished locus: tinted panel + big number.
  function makeCardTexture(THREE, number, hex, busy) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 384;
    var g = c.getContext('2d'); g.scale(2, 2);
    var backdrop = g.createLinearGradient(0, 0, 256, 192);
    backdrop.addColorStop(0, '#233a48'); backdrop.addColorStop(1, '#080f1b');
    g.fillStyle = backdrop; g.fillRect(0, 0, 256, 192);
    // Four deterministic, abstract compositions distinguish unfilled stops while
    // keeping the route number dominant. Nothing here encodes an answer.
    g.save(); g.strokeStyle = hex; g.fillStyle = hex; g.lineWidth = 1;
    var variant = (Math.max(1, Number(number) || 1) - 1) % 4;
    if (variant === 0) {
      for (var arch = 0; arch < 6; arch++) {
        var inset = 17 + arch * 15; g.globalAlpha = 0.12 + arch * 0.035;
        g.beginPath(); g.moveTo(inset, 192); g.lineTo(inset, 100);
        g.bezierCurveTo(inset, -3 + arch * 12, 256-inset, -3 + arch * 12, 256-inset, 100);
        g.lineTo(256-inset, 192); g.stroke();
      }
    } else if (variant === 1) {
      for (var orbit = 0; orbit < 5; orbit++) {
        g.globalAlpha = 0.15 + orbit * 0.04; g.beginPath();
        g.ellipse(180, 120, 40+orbit*18, 25+orbit*12, -0.7, 0, Math.PI*2); g.stroke();
      }
    } else if (variant === 2) {
      for (var peak = 0; peak < 6; peak++) {
        g.globalAlpha = 0.12 + peak * 0.035; g.beginPath();
        g.moveTo(-40, 190+peak*9); g.lineTo(150, 25+peak*22); g.lineTo(300, 190+peak*9); g.stroke();
      }
    } else {
      for (var ripple = 0; ripple < 7; ripple++) {
        g.globalAlpha = 0.12 + ripple * 0.025; g.beginPath();
        g.moveTo(0, 30+ripple*22); g.bezierCurveTo(85, -20+ripple*22, 155, 125+ripple*13, 256, 55+ripple*20); g.stroke();
      }
    }
    g.restore();
    var halo = g.createRadialGradient(120, 72, 0, 120, 72, 140);
    halo.addColorStop(0, 'rgba(255,237,193,0.08)'); halo.addColorStop(1, 'rgba(255,237,193,0)');
    g.fillStyle = halo; g.fillRect(0,0,256,192);
    g.strokeStyle = '#d5c29b'; g.globalAlpha = 0.55; g.lineWidth = 1; g.strokeRect(9,9,238,174);
    g.strokeStyle = hex; g.globalAlpha = 0.35; g.strokeRect(13,13,230,166); g.globalAlpha = 1;
    g.fillStyle = '#f9f1df'; g.font = '500 ' + (busy ? 64 : (number > 99 ? 62 : 78)) + 'px Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(busy ? '…' : (number < 10 ? '0' : '') + String(number),128,94);
    g.fillStyle = '#d5c29b'; g.globalAlpha = 0.7; g.fillRect(113,148,30,1); g.globalAlpha = 1;
    // The language-independent add affordance stays separate from the number.
    g.beginPath(); g.arc(223,32,12,0,Math.PI*2); g.fillStyle = '#f1e6d0'; g.fill();
    g.fillStyle = '#152335'; g.font = '700 18px sans-serif'; g.fillText(busy ? '↻' : '+',223,32);

    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // Small circular route-number badge pinned to a frame corner — keeps the
  // walking ORDER visible after images/stamps replace the numbered cards (the
  // ordered route is the method's active ingredient, so it must never vanish).
  function makeNumBadge(THREE, number, hex) {
    var c = document.createElement('canvas'); c.width = 96; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = hex || '#6366f1';
    g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 6;
    g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = contrastForeground(hex || '#6366f1'); g.font = '800 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(number), 48, 51);
    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(34, 34, 1);
    return sp;
  }

  // ── Imperative GL mount ──
  function mountGL(holder, THREE, palace, opts, state) {
    var w = holder.clientWidth || 800, hgt = holder.clientHeight || 480;
    var t = (opts && opts.t) || function (k) { return k; };
    var images = (opts && opts.images) || {};
    var decor = (opts && opts.decor) || {};   // { locusId: 'Torch' } — SR names for placed decorations
    // Live-update the decoration SR names without a remount (the walk position is
    // kept): announce()/live-region reads this `decor` var through its closure.
    state.setDecor = function (d) { decor = d || {}; };
    // Rewriting the image at a locus updates the live walk in place — the scene
    // shares this palace object — and re-announces so the strip and the live
    // region carry the student's own words immediately, with no remount and no
    // lost walking position.
    state.setLocusMnemonic = function (id, text) {
      if (!applyOwnMnemonic(palace, id, text)) return;
      try { announce(curIdx); } catch (e) {}
      // The in-scene route panel quotes the mnemonic too — retext just this row
      // rather than rebuilding the list, so focus and aria-current survive.
      try {
        var idx = (palace.route || []).indexOf(id);
        var btn = idx >= 0 && state.routePanel
          ? state.routePanel.querySelector('[data-route-index="' + idx + '"]') : null;
        if (btn) {
          var desc = recall ? describeLocusForRecall(palace, id, t2, decor) : describeLocusForSR(palace, id, t2, decor);
          btn.textContent = desc;
          btn.setAttribute('aria-label', 'Locus ' + idx + '. ' + desc);
        }
      } catch (e) {}
    };
    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    // WebXR: harmless in 2D (only affects rendering while a headset session is
    // presenting); lets an "Enter VR" affordance start an immersive session so a
    // student can stand inside the palace and walk the loci at room scale.
    try { renderer.xr.enabled = true; } catch (e) {}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, hgt);
    renderer.setClearColor(BG, 1);
    try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) {}
    holder.appendChild(renderer.domElement);
    var visualStyles = document.createElement('style');
    visualStyles.textContent = '[data-memory-palace-viewport] [hidden]{display:none!important}' +
      '[data-memory-palace-viewport] button:focus-visible,[data-memory-palace-viewport] canvas:focus-visible{outline:3px solid #fef08a!important;outline-offset:3px!important}' +
      '[data-memory-palace-viewport] button:hover:not(:disabled){filter:brightness(1.18)}' +
      '[data-memory-palace-viewport] [data-visited="true"]::after{content:" ✓";color:#86efac}' +
      '@media(prefers-reduced-motion:reduce){[data-memory-palace-viewport] *{transition:none!important;animation:none!important}}' +
      '@media(forced-colors:active){[data-memory-palace-viewport] [data-palace-overlay]{background:Canvas!important;color:CanvasText!important;border:2px solid CanvasText!important}[data-memory-palace-viewport] button{border:1px solid ButtonText!important}}';
    visualStyles.textContent +=
      '[data-memory-palace-viewport]{font-family:inherit}' +
      '[data-memory-palace-viewport] [data-palace-overlay="dock"],[data-memory-palace-viewport] [data-palace-overlay="free-nav"]{background:linear-gradient(150deg,rgba(29,40,57,.97),rgba(8,16,31,.97))!important;border-color:#64748b;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 14px 36px rgba(2,6,23,.3)!important}' +
      '[data-memory-palace-viewport] [data-palace-overlay="focus"]{background:radial-gradient(ellipse at top right,rgba(99,102,241,.15),transparent 70%),linear-gradient(150deg,#1b283c,#0b1425)!important;border-top-width:3px!important}' +
      '[data-memory-palace-viewport] [data-palace-overlay="focus"] [data-palace-focus-heading]{font-weight:750!important;line-height:1.3!important}' +
      '[data-memory-palace-viewport] [data-palace-action="begin-walk"]{background:linear-gradient(120deg,#6258ce,#4338a5)!important;box-shadow:0 4px 14px rgba(99,102,241,.25)}' +
      '[data-memory-palace-viewport] [data-palace-action="previous"],[data-memory-palace-viewport] [data-palace-action="next"]{background:linear-gradient(145deg,#33435f,#1b293f)!important;border-color:#8191ad!important}' +
      '@media(forced-colors:active){[data-memory-palace-viewport] [data-palace-overlay],[data-memory-palace-viewport] [data-palace-action]{background:Canvas!important;color:CanvasText!important;box-shadow:none!important}}';
    holder.appendChild(visualStyles);
    state.cleanup.push(function () { if (visualStyles.parentNode) visualStyles.parentNode.removeChild(visualStyles); });
    state.renderer = renderer;

    var theme = THEMES[opts && opts.theme] || THEMES.gallery;
    var _textureAnisotropy = 1;
    try { _textureAnisotropy = Math.max(1, Math.min(8, renderer.capabilities.getMaxAnisotropy())); } catch (eAniso) {}
    try { renderer.toneMappingExposure = theme.exposure || 1.1; } catch (eExposure) {}
    var root = new THREE.Scene();
    state.scene = root;   // exposed so destroy() can traverse + dispose the whole graph
    root.background = new THREE.Color(theme.bg);
    try { if (theme.fog > 0) root.fog = new THREE.FogExp2(theme.fogColor, theme.fog); } catch (e) {}
    // A restrained gradient dome gives every theme a horizon and depth cue
    // without post-processing or a network texture.
    try {
      var skyCanvas = document.createElement('canvas'); skyCanvas.width = 32; skyCanvas.height = 256;
      var skyCtx = skyCanvas.getContext('2d'); var skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
      skyGrad.addColorStop(0, theme.skyTop || '#111827');
      skyGrad.addColorStop(0.48, theme.skyHorizon || '#020617');
      skyGrad.addColorStop(0.52, theme.skyHorizon || '#020617');
      skyGrad.addColorStop(1, theme.skyTop || '#111827');
      skyCtx.fillStyle = skyGrad; skyCtx.fillRect(0, 0, 32, 256);
      var skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.anisotropy = _textureAnisotropy;
      if (THREE.sRGBEncoding) skyTex.encoding = THREE.sRGBEncoding;
      var skyRadius = Math.max(12000, palace.bounds.width * 5);
      var skyDome = new THREE.Mesh(new THREE.SphereGeometry(skyRadius, 32, 18),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
      skyDome.position.set((palace.bounds.minX + palace.bounds.maxX) / 2, 0, (palace.bounds.minZ + palace.bounds.maxZ) / 2);
      skyDome.userData.visualRole = 'sky-dome'; root.add(skyDome);
    } catch (eSky) {}
    var camera = new THREE.PerspectiveCamera(58, w / hgt, 1, 60000);
    // WebXR rig: while presenting, the headset drives the camera's LOCAL pose, so
    // the camera lives in a rig we seat/scale to place the user in the palace. At
    // identity (the 2D default) this is transform-neutral — camera.position stays
    // world-space, so the existing rail/free-roam camera code is untouched.
    var xrRig = new THREE.Group(); root.add(xrRig); xrRig.add(camera);

    root.add(new THREE.AmbientLight(0xffffff, theme.ambient));
    try { root.add(new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2])); } catch (e) {}
    // Overhead "sun" so floors and rooms read from above in the overview (🗺) — the
    // per-room point lights sit near the ceiling, leaving the overhead view dim.
    try { var _sun = new THREE.DirectionalLight(theme.sun[0], theme.sun[1]); _sun.position.set(0.3, 1, 0.25); root.add(_sun); } catch (e) {}

    // Open-world ground (pasture): a big soft plane under the palace.
    try {
      if (theme.ground) {
        var gr = new THREE.Mesh(new THREE.PlaneGeometry(palace.bounds.width * 3, palace.bounds.width * 3),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(theme.ground), roughness: 1 }));
        gr.rotation.x = -Math.PI / 2; gr.position.y = -2; root.add(gr);
      }
    } catch (e) {}

    // Starfield above the open-roofed palace (gallery + space; a dream-space, not
    // a building sim). Two half-count layers whose opacities pulse out of phase →
    // a gentle whole-sky twinkle for the cost of two uniform writes per frame.
    // Share a soft circular point texture across stars, the orb halo and dust.
    var softPointCanvas=document.createElement('canvas');softPointCanvas.width=softPointCanvas.height=64;
    var softPointCtx=softPointCanvas.getContext('2d'),softPointGradient=softPointCtx.createRadialGradient(32,32,1,32,32,31);
    softPointGradient.addColorStop(0,'rgba(255,255,255,1)');softPointGradient.addColorStop(0.24,'rgba(255,255,255,0.7)');softPointGradient.addColorStop(1,'rgba(255,255,255,0)');
    softPointCtx.fillStyle=softPointGradient;softPointCtx.fillRect(0,0,64,64);
    var softPointTexture=new THREE.CanvasTexture(softPointCanvas);
    var _starMats = [];
    try {
      if (theme.starCount > 0) {
        var span = Math.max(2000, palace.bounds.width * 1.6);
        var starCX = (palace.bounds.minX + palace.bounds.maxX) / 2, starCZ = (palace.bounds.minZ + palace.bounds.maxZ) / 2;
        for (var sl = 0; sl < 2; sl++) {
          var SN = Math.ceil(theme.starCount / 2), sp3 = new Float32Array(SN * 3);
          for (var si = 0; si < SN; si++) {
            sp3[si * 3] = starCX - span / 2 + Math.random() * span;
            sp3[si * 3 + 1] = WALL_H + 300 + Math.random() * 2200;
            sp3[si * 3 + 2] = starCZ - span / 2 + Math.random() * span;
          }
          var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp3, 3));
          var sm = new THREE.PointsMaterial({ map: softPointTexture, color: theme.stars, size: 7, transparent: true, opacity: 0.5, alphaTest: 0.015, depthWrite: false });
          sm.userData = { phase: sl * Math.PI };   // opposite phases
          _starMats.push(sm);
          root.add(new THREE.Points(sg, sm));
        }
      }
    } catch (e) {}

    var group = new THREE.Group(); root.add(group);
    function makeSurfaceTexture(kind) {
      var c = document.createElement('canvas'); c.width = 128; c.height = 128; var g = c.getContext('2d');
      g.fillStyle = kind === 'wall' ? '#ece6da' : '#e0d9cc'; g.fillRect(0, 0, 128, 128);
      if (kind === 'wall') {
        for (var py = 3; py < 128; py += 19) { g.fillStyle = py % 14 ? 'rgba(15,23,42,0.035)' : 'rgba(255,255,255,0.045)'; g.fillRect(0, py, 128, 1); }
        for (var pn = 0; pn < 210; pn++) { var px = (pn * 37) % 128, pyy = (pn * 71) % 128; g.fillStyle = pn % 3 ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.055)'; g.fillRect(px, pyy, 1, 1); }
      } else {
        g.strokeStyle = 'rgba(42,35,24,0.085)'; g.lineWidth = 1;
        for (var fy = 0; fy <= 128; fy += 64) { g.beginPath(); g.moveTo(0, fy); g.lineTo(128, fy); g.stroke(); }
        for (var fx = 0; fx <= 128; fx += 64) { g.beginPath(); g.moveTo(fx, 0); g.lineTo(fx, 128); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.065)'; for (var fd = -128; fd < 128; fd += 32) { g.beginPath(); g.moveTo(fd, 0); g.lineTo(fd + 128, 128); g.stroke(); }
      }
      var tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(kind === 'wall' ? 3 : 2, kind === 'wall' ? 2 : 2); tex.anisotropy = _textureAnisotropy;
      if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
      return tex;
    }
    var wallMat = new THREE.MeshStandardMaterial({ color: 0xa39988, map: theme.walls ? makeSurfaceTexture('wall') : null, roughness: 0.92, metalness: 0.02 });
    var floorTexture = theme.walls ? makeSurfaceTexture('floor') : null;
    var trimMat = new THREE.MeshStandardMaterial({ color: 0x665c4f, roughness: 0.58, metalness: 0.12 });
    var sideTrimGeo = theme.walls ? new THREE.BoxGeometry(ROOM_W, 16, 12) : null;
    var endTrimGeo = theme.walls ? new THREE.BoxGeometry(12, 16, ROOM_D) : null;

    function addWall(x, z, lenX, lenZ) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(lenX, 8), WALL_H, Math.max(lenZ, 8)), wallMat);
      mesh.position.set(x, WALL_H / 2, z);
      group.add(mesh);
    }

    // Shared baked architectural details add depth without shadow maps or lights.
    var nicheMat = null, skylightMat = null, floorContactMat = null;
    if (theme.walls && palace.rooms.length > 1) {
      var contactCanvas=document.createElement('canvas');contactCanvas.width=16;contactCanvas.height=128;
      var contactCtx=contactCanvas.getContext('2d'),contactGradient=contactCtx.createLinearGradient(0,0,0,128);
      contactGradient.addColorStop(0,'rgba(9,16,25,0.4)');contactGradient.addColorStop(0.3,'rgba(9,16,25,0.13)');contactGradient.addColorStop(1,'rgba(9,16,25,0)');
      contactCtx.fillStyle=contactGradient;contactCtx.fillRect(0,0,16,128);
      var contactTexture=new THREE.CanvasTexture(contactCanvas);
      floorContactMat=new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,toneMapped:false});
      var nc = document.createElement('canvas'); nc.width = 256; nc.height = 320;
      var ng = nc.getContext('2d');
      ng.beginPath(); ng.moveTo(20,310); ng.lineTo(20,125);
      ng.bezierCurveTo(20,-15,236,-15,236,125); ng.lineTo(236,310); ng.closePath();
      var nicheGradient = ng.createLinearGradient(0,0,256,320);
      nicheGradient.addColorStop(0,'#1a2834'); nicheGradient.addColorStop(0.6,'#30424b'); nicheGradient.addColorStop(1,'#111c28');
      ng.fillStyle=nicheGradient; ng.fill(); ng.strokeStyle='#bda77d'; ng.lineWidth=3; ng.stroke();
      ng.save(); ng.clip(); ng.strokeStyle='rgba(216,193,147,0.12)'; ng.lineWidth=1;
      for(var flute=32;flute<236;flute+=16){ng.beginPath();ng.moveTo(flute,0);ng.lineTo(flute,320);ng.stroke();}
      ng.restore();
      var nicheTex = new THREE.CanvasTexture(nc); nicheTex.anisotropy = _textureAnisotropy;
      if(THREE.sRGBEncoding) nicheTex.encoding=THREE.sRGBEncoding;
      nicheMat = new THREE.MeshBasicMaterial({map:nicheTex,transparent:true,depthWrite:false,toneMapped:false});
      var sc=document.createElement('canvas');sc.width=512;sc.height=128;
      var sgc=sc.getContext('2d'), slg=sgc.createLinearGradient(0,0,0,128);
      slg.addColorStop(0,'#5d6772');slg.addColorStop(0.18,'#c0c8c8');slg.addColorStop(0.5,'#f3eddb');slg.addColorStop(0.82,'#c0c8c8');slg.addColorStop(1,'#5d6772');
      sgc.fillStyle=slg;sgc.fillRect(0,0,512,128);
      sgc.fillStyle='#35414c'; for(var mullion=0;mullion<=512;mullion+=64)sgc.fillRect(mullion,0,5,128);
      sgc.strokeStyle='#c4ac7d';sgc.lineWidth=5;sgc.strokeRect(2,2,508,124);
      var skylightTex=new THREE.CanvasTexture(sc);skylightTex.anisotropy=_textureAnisotropy;
      if(THREE.sRGBEncoding) skylightTex.encoding=THREE.sRGBEncoding;
      skylightMat=new THREE.MeshBasicMaterial({map:skylightTex,toneMapped:false});
    }
    var _focusLight = null, _roomLabels = {}, _roomPortals = {}, _roomOutlines = {}, _roomHeatmaps = {}, _roomCanopies = {};
    palace.rooms.forEach(function (room, ri) {
      var cx = room.center.x, cz = room.center.z, ang = room.angle || 0;
      // Each room lives in its own group, positioned on its spoke and rotated to
      // face the hub, so floor + walls are built in simple room-local coordinates.
      var rg = new THREE.Group(); rg.position.set(cx, 0, cz); rg.rotation.y = ang; group.add(rg);
      function addLocalWall(x, z, lenX, lenZ) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(lenX, 8), WALL_H, Math.max(lenZ, 8)), wallMat);
        m.position.set(x, WALL_H / 2, z); rg.add(m);
      }
      // Floor: room-accent tint (brighter in open-world themes).
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshStandardMaterial({ color: theme.walls ? new THREE.Color('#8e877a').lerp(new THREE.Color(room.color), 0.08) : new THREE.Color(room.color).multiplyScalar(theme.floorMul), map: floorTexture, roughness: 0.68, metalness: 0.08 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0.5; rg.add(floor);
      // Room-level mastery tint: a quiet, overview-only wash across the floor.
      // It is deliberately created for every room but kept transparent until
      // measured mastery exists, so late-loaded mastery data can light it up
      // without rebuilding the scene.
      if (ri > 0) {
        try {
          var heatmap = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 48, ROOM_D - 48),
            new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
          heatmap.rotation.x = -Math.PI / 2;
          heatmap.position.y = 1.2;
          heatmap.renderOrder = 1;
          rg.add(heatmap);
          _roomHeatmaps[ri] = heatmap;
        } catch (eHeatmap) {}
      }
      // Thin room footprint outline: subtle in the walk, stronger in overview,
      // so the bird's-eye map preserves room grouping without adding walls.
      if (ri > 0) {
        try {
          var outlineY = 1.9, outlinePad = 26;
          var outlinePts = [
            new THREE.Vector3(-ROOM_W / 2 + outlinePad, outlineY, -ROOM_D / 2 + outlinePad),
            new THREE.Vector3(ROOM_W / 2 - outlinePad, outlineY, -ROOM_D / 2 + outlinePad),
            new THREE.Vector3(ROOM_W / 2 - outlinePad, outlineY, ROOM_D / 2 - outlinePad),
            new THREE.Vector3(-ROOM_W / 2 + outlinePad, outlineY, ROOM_D / 2 - outlinePad),
            new THREE.Vector3(-ROOM_W / 2 + outlinePad, outlineY, -ROOM_D / 2 + outlinePad)
          ];
          var outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
          var outlineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(room.color), transparent: true, opacity: 0.18, depthWrite: false });
          rg.add(new THREE.Line(outlineGeo, outlineMat));
          _roomOutlines[ri] = outlineMat;
        } catch (eO) {}
      }
      // Carpet runner from the doorway to the far wall — a soft accent path that
      // pulls the eye down the room's locus row (and doubles as wayfinding in the
      // open-world themes). Room-local, so it rotates with the spoke for free.
      if (ri !== 0) {
        try {
          var cc = document.createElement('canvas'); cc.width = 512; cc.height = 128;
          var cg = cc.getContext('2d'); var carpetBase = new THREE.Color(room.color).multiplyScalar(theme.walls ? 0.32 : 0.62);
          cg.fillStyle=carpetBase.getStyle();cg.fillRect(0,0,512,128);
          // Fine fabric grain replaces the stretched bright stripes; arrows remain.
          cg.fillStyle='rgba(255,255,255,0.035)';
          for(var warp=0;warp<512;warp+=4)cg.fillRect(warp,0,1,128);
          for(var weft=0;weft<128;weft+=4)cg.fillRect(0,weft,512,1);
          var rugShade=cg.createLinearGradient(0,0,0,128);
          rugShade.addColorStop(0,'rgba(0,0,0,0.2)');rugShade.addColorStop(0.5,'rgba(255,255,255,0.035)');rugShade.addColorStop(1,'rgba(0,0,0,0.2)');
          cg.fillStyle=rugShade;cg.fillRect(0,0,512,128);
          cg.strokeStyle='rgba(235,219,181,0.42)';cg.lineWidth=2;cg.strokeRect(7,8,498,112);
          cg.strokeStyle='rgba(235,219,181,0.16)';cg.lineWidth=1;cg.strokeRect(12,14,488,100);
          cg.strokeStyle='rgba(245,236,213,0.28)';cg.lineWidth=3;
          for(var arrowX=80;arrowX<500;arrowX+=120){cg.beginPath();cg.moveTo(arrowX-12,46);cg.lineTo(arrowX+6,64);cg.lineTo(arrowX-12,82);cg.stroke();}

          var ctex = new THREE.CanvasTexture(cc); ctex.anisotropy = _textureAnisotropy;
          if (THREE.sRGBEncoding) ctex.encoding = THREE.sRGBEncoding;
          var carpet = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 150, 130),
            new THREE.MeshStandardMaterial({ map: ctex, transparent: !theme.walls, opacity: theme.walls ? 1 : 0.42, roughness: 1, depthWrite: !!theme.walls, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
          carpet.rotation.x = -Math.PI / 2; carpet.rotation.z = 0;
          carpet.position.set(0, 1.1, 0); carpet.userData.visualRole = 'directional-runner'; rg.add(carpet);
        } catch (eC) {}
      }
      if (ri === 0 || !theme.walls) {
        // Hub is an open plaza; open-world themes (pasture/space) drop walls too.
      } else {
        // Long walls (the two sides loci hang on) + solid far wall + hub-facing
        // near wall with a central doorway.
        addLocalWall(0, -ROOM_D / 2, ROOM_W, WALL_T);
        addLocalWall(0, ROOM_D / 2, ROOM_W, WALL_T);
        addLocalWall(ROOM_W / 2, 0, WALL_T, ROOM_D);                         // far end wall (solid)
        var segZ = (ROOM_D - DOOR_W) / 2;
        addLocalWall(-ROOM_W / 2, -(DOOR_W / 2 + segZ / 2), WALL_T, segZ);   // near wall, doorway to the hub
        addLocalWall(-ROOM_W / 2, (DOOR_W / 2 + segZ / 2), WALL_T, segZ);
        // Baked contact shading grounds the walls without real-time shadow maps.
        if(floorContactMat){
          [-1,1].forEach(function(side){
            var shade=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W-32,46),floorContactMat);
            shade.rotation.set(-Math.PI/2,0,side<0?0:Math.PI);shade.position.set(0,1.04,side*(ROOM_D/2-29));
            shade.userData.visualRole='wall-floor-contact';rg.add(shade);
          });
          var endShade=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D-32,46),floorContactMat);
          endShade.rotation.set(-Math.PI/2,0,-Math.PI/2);endShade.position.set(ROOM_W/2-29,1.04,0);
          endShade.userData.visualRole='wall-floor-contact';rg.add(endShade);
        }
        // Baseboards and cornices add human scale and stronger parallax without shadows.
        try {
          [-1, 1].forEach(function (trimSide) {
            [8, WALL_H - 8].forEach(function (trimY) {
              var sideTrim = new THREE.Mesh(sideTrimGeo, trimMat);
              sideTrim.position.set(0, trimY, trimSide * (ROOM_D / 2 - 4));
              sideTrim.userData.visualRole = 'architectural-trim'; rg.add(sideTrim);
            });
          });
          [8, WALL_H - 8].forEach(function (trimY) {
            var endTrim = new THREE.Mesh(endTrimGeo, trimMat);
            endTrim.position.set(ROOM_W / 2 - 4, trimY, 0);
            endTrim.userData.visualRole = 'architectural-trim'; rg.add(endTrim);
          });
        } catch (eTrim) {}
        // Doorway columns + lintel — frame the threshold so each room reads as a
        // distinct chamber from the hub (helps the "walk into a room" mental map).
        try {
          var colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.15 });
          [-1, 1].forEach(function (cs) {
            var col = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, WALL_H * 0.88, 14), colMat);
            col.position.set(-ROOM_W / 2, WALL_H * 0.44, cs * (DOOR_W / 2 + 24)); rg.add(col);
          });
          var portalMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(room.color).multiplyScalar(0.65),
            emissive: new THREE.Color(room.color),
            emissiveIntensity: 0.04,
            roughness: 0.55,
            metalness: 0.2
          });
          var lintel = new THREE.Mesh(new THREE.BoxGeometry(26, 24, DOOR_W + 92), portalMat);
          lintel.position.set(-ROOM_W / 2, WALL_H * 0.88 + 12, 0); rg.add(lintel);
          _roomPortals[ri] = portalMat;
        } catch (eD) {}
      }

      // Permanent spatial landmarks: geometry differs between rooms and never
      // depends on answers, mastery or random seeds. No additional lights or animation.
      var architecture = new THREE.Group();
      architecture.userData.visualRole = 'room-identity';
      architecture.userData.roomIndex = ri;
      rg.add(architecture);
      var stone = new THREE.MeshStandardMaterial({ color: theme.walls ? 0x716d65 : 0x718096, roughness: 0.76, metalness: 0.1 });
      var bronze = new THREE.MeshStandardMaterial({ color: 0xd6b983, roughness: 0.4, metalness: 0.55 });
      var glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(room.color).lerp(new THREE.Color('#ffffff'), 0.48) });
      function detail(geometry, material, x, y, z, role) {
        var mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
        mesh.userData.visualRole = role; architecture.add(mesh); return mesh;
      }
      if (ri === 0) {
        // A compass rose anchors the entrance in both first-person and map views.
        // All inlays sit flush with the plaza; they add no walking obstacles.
        var centerStone=detail(new THREE.CircleGeometry(96,48),new THREE.MeshStandardMaterial({color:0x253545,roughness:0.7,metalness:0.16}),0,2.25,0,'plaza-center-inlay');
        centerStone.rotation.x=-Math.PI/2;
        var compassPetal=new THREE.Shape();compassPetal.moveTo(0,-226);compassPetal.lineTo(21,-80);compassPetal.lineTo(0,-108);compassPetal.lineTo(-21,-80);compassPetal.closePath();
        var compassRose=new THREE.InstancedMesh(new THREE.ShapeGeometry(compassPetal),bronze,8);
        var compassTransform=new THREE.Object3D();
        for(var petal=0;petal<8;petal++){
          compassTransform.position.set(0,2.35,0);compassTransform.rotation.set(-Math.PI/2,0,petal*Math.PI/4);
          compassTransform.scale.setScalar(petal%2?0.78:1);compassTransform.updateMatrix();compassRose.setMatrixAt(petal,compassTransform.matrix);
        }
        compassRose.userData.visualRole='plaza-compass-rose';architecture.add(compassRose);
        var mosaic=new THREE.InstancedMesh(new THREE.BoxGeometry(19,1,5),stone,48);
        for(var tessera=0;tessera<48;tessera++){
          var mosaicAngle=tessera*Math.PI/24;compassTransform.position.set(Math.sin(mosaicAngle)*310,1.8,Math.cos(mosaicAngle)*310);
          compassTransform.rotation.set(0,mosaicAngle,0);compassTransform.scale.setScalar(tessera%6?1:1.3);compassTransform.updateMatrix();mosaic.setMatrixAt(tessera,compassTransform.matrix);
        }
        mosaic.userData.visualRole='plaza-mosaic';architecture.add(mosaic);
        [100, 145, 210, 275].forEach(function (radius, ringIndex) {
          var ring = detail(new THREE.RingGeometry(radius, radius + (ringIndex === 2 ? 6 : 2), 64), bronze, 0, 2 + ringIndex * 0.08, 0, 'plaza-compass');
          ring.rotation.x = -Math.PI / 2;
        });
        for (var spoke = 0; spoke < 8; spoke++) {
          var a = spoke * Math.PI / 4;
          var tick = detail(new THREE.BoxGeometry(4, 1, spoke % 2 ? 24 : 48), glow, Math.sin(a) * 242, 2.2, Math.cos(a) * 242, 'plaza-compass');
          tick.rotation.y = a;
        }
      } else {
        // A distinct medallion silhouette sits on the far wall, away from loci.
        var emblem = new THREE.Group(); emblem.position.set(ROOM_W / 2 - 15, WALL_H * 0.6, 0);
        emblem.rotation.y = -Math.PI / 2;
        emblem.userData.visualRole = 'room-landmark'; emblem.userData.variant = (ri - 1) % 4;
        architecture.add(emblem);
        var medallion = new THREE.Mesh(new THREE.TorusGeometry(79, 5, 8, 48), bronze); emblem.add(medallion);
        var shape;
        switch ((ri - 1) % 4) {
          case 0: shape = new THREE.TorusGeometry(43, 8, 8, 40); break;
          case 1: shape = new THREE.OctahedronGeometry(49); break;
          case 2: shape = new THREE.TorusKnotGeometry(30, 7, 48, 6); break;
          default: shape = new THREE.IcosahedronGeometry(46); break;
        }
        var symbol = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color: room.color, emissive: room.color, emissiveIntensity: 0.24, metalness: 0.45, roughness: 0.35 }));
        symbol.rotation.set(0.25, 0.35, 0.2); emblem.add(symbol);
        // Batch the twelve ticks into one draw call per room.
        var markers = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 9, 3), glow, 12);
        var markerTransform = new THREE.Object3D();
        for (var ray = 0; ray < 12; ray++) {
          var angle = ray * Math.PI / 6;
          markerTransform.position.set(Math.sin(angle) * 95, Math.cos(angle) * 95, 0);
          markerTransform.rotation.z = -angle; markerTransform.scale.y = ray % 3 ? 1 : 2;
          markerTransform.updateMatrix(); markers.setMatrixAt(ray, markerTransform.matrix);
        }
        emblem.add(markers);
        if (theme.walls) {
          // A coffered canopy makes the room read as an interior from eye level.
          // It lifts out of the way in overview; no geometry is rebuilt on toggles.
          var canopy = new THREE.Group(); canopy.userData.visualRole = 'gallery-canopy';
          _roomCanopies[ri] = canopy; architecture.add(canopy);
          var skylight=new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W-150,116),skylightMat);
          skylight.rotation.x=Math.PI/2;skylight.position.set(0,WALL_H-1,0);
          skylight.userData.visualRole='gallery-skylight';canopy.add(skylight);
          var niche=detail(new THREE.PlaneGeometry(260,300),nicheMat,ROOM_W/2-11,166,0,'landmark-niche');
          niche.rotation.y=-Math.PI/2;
          var ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x373f49, roughness: 0.88, side: THREE.DoubleSide });
          for (var bay = 0; bay < 3; bay++) {
            var panel = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 26, 8, ROOM_D / 3 - 16), ceilingMaterial);
            panel.position.set(0, WALL_H + 6, (bay - 1) * ROOM_D / 3); canopy.add(panel);
            var beam = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 18, 14, 9), bronze);
            beam.position.set(0, WALL_H - 5, (bay - 1.5) * ROOM_D / 3 + 6); canopy.add(beam);
          }
          // Recessed lower panels and edge pilasters leave all authored frames clear.
          [-1, 1].forEach(function (side) {
            detail(new THREE.BoxGeometry(ROOM_W - 28, 60, 6), stone, 0, 36, side * (ROOM_D / 2 - 8), 'gallery-wainscot');
            detail(new THREE.BoxGeometry(ROOM_W - 30, 3, 4), bronze, 0, 69, side * (ROOM_D / 2 - 12), 'gallery-inlay');
            [-1, 1].forEach(function (end) {
              detail(new THREE.BoxGeometry(19, WALL_H - 32, 14), stone, end * (ROOM_W / 2 - 24), WALL_H / 2, side * (ROOM_D / 2 - 13), 'gallery-pilaster');
            });
            detail(new THREE.BoxGeometry(ROOM_W - 62, 3, 6), glow, 0, WALL_H - 25, side * (ROOM_D / 2 - 14), 'gallery-light-strip');
          });
        } else {
          // Open-air rooms retain a threshold and a low plinth under their landmark.
          detail(new THREE.CylinderGeometry(70, 84, 18, 32), stone, ROOM_W / 2 - 36, 9, 0, 'landmark-plinth');
          [-1, 1].forEach(function (side) {
            detail(new THREE.BoxGeometry(9, 112, 9), bronze, -ROOM_W / 2, 56, side * (DOOR_W / 2 + 16), 'open-threshold');
            detail(new THREE.SphereGeometry(8, 10, 8), glow, -ROOM_W / 2, 115, side * (DOOR_W / 2 + 16), 'open-threshold');
          });
        }
        detail(new THREE.BoxGeometry(20, 2, DOOR_W - 10), glow, -ROOM_W / 2 + 10, 2.4, 0, 'threshold-inlay');
        if(theme.walls){
          [-1,1].forEach(function(edge){
            detail(new THREE.BoxGeometry(3,218,3),glow,-ROOM_W/2-7,139,edge*(DOOR_W/2+3),'portal-edge-light');
          });
        }
        // A visible promenade connects the hub to each threshold in all themes.
        var doorX = cx - Math.cos(ang) * ROOM_W / 2;
        var doorZ = cz + Math.sin(ang) * ROOM_W / 2;
        var distance = Math.hypot(doorX, doorZ);
        if (distance > 50) {
          var promenade = new THREE.Mesh(new THREE.PlaneGeometry(110, distance), new THREE.MeshStandardMaterial({ color: new THREE.Color(room.color).multiplyScalar(0.38), roughness: 0.86, side: THREE.DoubleSide }));
          promenade.geometry.rotateX(-Math.PI / 2); promenade.rotation.y = Math.atan2(doorX, doorZ);
          promenade.position.set(doorX / 2, 0.7, doorZ / 2); promenade.userData.visualRole = 'hub-promenade'; group.add(promenade);
        }
      }

      // Room name sprite (world coords; sprites always face the camera).
      // A single movable focus light is created after the rooms, avoiding
      // one forward-rendered point light per branch in large palaces.
      var name = makeLabelSprite(THREE, room.label, room.color, 30, false, _textureAnisotropy, theme.walls ? 'plaque' : undefined);
      name.position.set(cx, WALL_H + 40, cz);
      name.userData = name.userData || {};
      name.userData.roomBaseScale = name.scale.clone();
      name.userData.roomMapPosition = name.position.clone();
      name.userData.roomWalkPosition = ri > 0
        ? new THREE.Vector3(cx-Math.cos(ang)*(ROOM_W/2+16),WALL_H+42,cz+Math.sin(ang)*(ROOM_W/2+16))
        : name.position.clone();
      name.position.copy(name.userData.roomWalkPosition);
      name.userData.visualRole='room-wayfinding-label';
      _roomLabels[ri] = name;
      group.add(name);
    });
    try {
      _focusLight = new THREE.PointLight(0x818cf8, theme.walls ? 0.5 : 0.62, ROOM_W * 1.55, 2);
      _focusLight.position.set(0, WALL_H - 46, 0);
      _focusLight.userData.visualRole = 'active-room-light'; group.add(_focusLight);
    } catch (eFocusLight) {}

    // Explicit branch relationships become overview-only glowing threads between
    // rooms. The route remains authoritative; these threads add meaning without
    // changing walking order, and recall hides them to preserve test integrity.
    var crossLinkGroup = new THREE.Group();
    var crossLinks = [];
    var focusedCrossLink = -1;
    crossLinkGroup.visible = false;
    crossLinkGroup.renderOrder = 3;
    group.add(crossLinkGroup);
    (palace.roomLinks || []).forEach(function (link, linkIdx) {
      try {
        var fromRoom = palace.rooms[link.fromRoomIdx], toRoom = palace.rooms[link.toRoomIdx];
        if (!fromRoom || !toRoom || !fromRoom.center || !toRoom.center) return;
        var start = new THREE.Vector3(fromRoom.center.x, 14, fromRoom.center.z);
        var end = new THREE.Vector3(toRoom.center.x, 14, toRoom.center.z);
        var distance = start.distanceTo(end);
        var mid = start.clone().lerp(end, 0.5);
        mid.y += Math.min(260, 90 + distance * 0.055);
        var linkGeo = new THREE.BufferGeometry().setFromPoints([start, mid, end]);
        var linkColor = fromRoom.color || '#818cf8';
        var haloMat = new THREE.LineBasicMaterial({ color: new THREE.Color(linkColor), transparent: true, opacity: 0.05, depthWrite: false });
        var coreMat = new THREE.LineBasicMaterial({ color: new THREE.Color(linkColor), transparent: true, opacity: 0.16, depthWrite: false });
        var halo = new THREE.Line(linkGeo, haloMat); halo.renderOrder = 3;
        var core = new THREE.Line(linkGeo, coreMat); core.renderOrder = 4;
        crossLinkGroup.add(halo); crossLinkGroup.add(core);
        var linkLabel = null;
        if (link.label) {
          linkLabel = makeLabelSprite(THREE, link.label, linkColor, 16, false, _textureAnisotropy);
          linkLabel.position.copy(mid); linkLabel.position.y += 18;
          linkLabel.material.opacity = 0;
          crossLinkGroup.add(linkLabel);
        }
        crossLinks.push({ from: link.fromRoomIdx, to: link.toRoomIdx, coreMat: coreMat, haloMat: haloMat, label: linkLabel, phase: linkIdx * 0.7 });
      } catch (eCrossLink) {}
    });
    function _setCrossLinkState() {
      if (!crossLinkGroup) return;
      var show = !!overview && !recall && crossLinks.length > 0;
      crossLinkGroup.visible = show;
      crossLinks.forEach(function (link, linkIdx) {
        var focused = linkIdx === focusedCrossLink;
        var active = focused || link.from === _activeRoomIdx || link.to === _activeRoomIdx;
        try {
          link.coreMat.opacity = show ? (focused ? 0.98 : (active ? 0.72 : 0.16)) : 0;
          link.haloMat.opacity = show ? (focused ? 0.26 : (active ? 0.15 : 0.04)) : 0;
          if (link.label) { link.label.visible = show && active; link.label.material.opacity = show && active ? 0.92 : 0; }
        } catch (eCrossState) {}
      });
      var focusedLink = show && focusedCrossLink >= 0 ? crossLinks[focusedCrossLink] : null;
      Object.keys(_roomLabels).forEach(function (key) {
        var roomIdx = Number(key);
        var endpoint = !!focusedLink && (focusedLink.from === roomIdx || focusedLink.to === roomIdx);
        var activeRoom = roomIdx === _activeRoomIdx;
        try {
          if (_roomLabels[key].material) _roomLabels[key].material.opacity = endpoint ? 1 : (activeRoom ? 1 : 0.62);
          var base = _roomLabels[key].userData && _roomLabels[key].userData.roomBaseScale;
          if (base) _roomLabels[key].scale.copy(base).multiplyScalar(endpoint ? 1.14 : (activeRoom ? 1.08 : 1));
        } catch (eCrossLabel) {}
      });
      Object.keys(_roomOutlines).forEach(function (key) {
        var roomIdx = Number(key);
        var endpoint = !!focusedLink && (focusedLink.from === roomIdx || focusedLink.to === roomIdx);
        var activeRoom = roomIdx === _activeRoomIdx;
        try { _roomOutlines[key].opacity = endpoint ? 0.9 : (activeRoom ? (overview ? 0.68 : 0.32) : (overview ? 0.34 : 0.14)); } catch (eCrossOutline) {}
      });
    }

    // Entry plinth (the palace title) + a slow sparkle ring orbiting the orb.
    var _orbRing = null;
    (function () {
      var plinth = new THREE.Mesh(new THREE.CylinderGeometry(46, 56, 110, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.25 }));
      plinth.position.set(0, 55, 0); group.add(plinth);
      var orb = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 0.9, roughness: 0.3 }));
      orb.position.set(0, 140, 0); orb.userData.locusId = '__entry'; group.add(orb);
      // A stationary armillary gives the entrance a recognisable silhouette.
      // It stays within the existing orb halo and needs no animated transforms.
      var armillaryMetal=new THREE.MeshStandardMaterial({color:0xc7ad79,metalness:0.58,roughness:0.38});
      var orbitGeo=new THREE.TorusGeometry(49,1.8,8,64);
      [[Math.PI/2,0,0],[0,Math.PI/4,0],[0,-Math.PI/4,0]].forEach(function(tilt){
        var orbit=new THREE.Mesh(orbitGeo,armillaryMetal);orbit.position.set(0,140,0);orbit.rotation.set(tilt[0],tilt[1],tilt[2]);orbit.userData.visualRole='entrance-armillary';group.add(orbit);
      });
      [5,106].forEach(function(level){
        var collar=new THREE.Mesh(new THREE.CylinderGeometry(51,53,5,32),armillaryMetal);collar.position.set(0,level,0);collar.userData.visualRole='entrance-plinth-collar';group.add(collar);
      });
      var title = makeLabelSprite(THREE, palace.title || '', '#818cf8', 32, false, _textureAnisotropy, theme.walls ? 'plaque' : undefined);
      title.position.set(0, 223, 0); group.add(title);
      try {
        var ORB_N = 18, op3 = new Float32Array(ORB_N * 3);
        for (var oi = 0; oi < ORB_N; oi++) {
          var oa = (Math.PI * 2 * oi) / ORB_N;
          op3[oi * 3] = Math.cos(oa) * 58;
          op3[oi * 3 + 1] = Math.sin(oa * 3) * 10;    // gentle wave, not a flat halo
          op3[oi * 3 + 2] = Math.sin(oa) * 58;
        }
        var og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(op3, 3));
        _orbRing = new THREE.Points(og, new THREE.PointsMaterial({ map: softPointTexture, color: 0xa5b4fc, size: 5, transparent: true, opacity: 0.7, alphaTest: 0.015, depthWrite: false }));
        _orbRing.position.set(0, 140, 0);
        group.add(_orbRing);
      } catch (e) {}
    })();

    // Ambient motes: one drifting point cloud through the palace interior —
    // lamplit dust (gallery), fireflies (pasture), or star-sparkles (space).
    // Animated as a whole (slow spin + bob): two uniform writes per frame.
    var _motes = null;
    try {
      var MOTE_COLOR = theme.walls ? 0xffd9a0 : (theme.ground ? 0xd9f99d : 0x93c5fd);
      var MN = Math.min(260, 60 + palace.rooms.length * 28);
      var mp3 = new Float32Array(MN * 3);
      for (var mi = 0; mi < MN; mi++) {
        mp3[mi * 3] = palace.bounds.minX * 0.9 + Math.random() * palace.bounds.width * 0.9;
        mp3[mi * 3 + 1] = 30 + Math.random() * (WALL_H + 90);
        mp3[mi * 3 + 2] = palace.bounds.minZ * 0.9 + Math.random() * palace.bounds.width * 0.9;
      }
      var mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp3, 3));
      var moteTex = softPointTexture;
      _motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: moteTex, color: MOTE_COLOR, size: 7, sizeAttenuation: true, transparent: true, opacity: 0.38, alphaTest: 0.015, depthWrite: false }));
      _motes.userData.visualRole = 'ambient-motes';
      root.add(_motes);
    } catch (e) {}

    // Loci frames. In recall mode the label is a '?' — the image (or the numbered
    // placard) is the CUE, the label is the ANSWER and stays hidden until earned.
    var recall = !!opts.recall;
    var frameMeshes = [], frameRefs = {}, _emptyBeacons = [];
    var texLoader = new THREE.TextureLoader();
    // Depth-relief "statues": when a locus has BOTH a color image and a grayscale depth
    // map (white = near), the flat frame canvas is swapped for a subdivided plane whose
    // vertices are displaced by the depth map — a bas-relief that reads as 3D from the
    // walk. Depth maps come from the same Imagen path as the art (buildDepthPrompt).
    var depths = (opts && opts.depths) || {};
    var RELIEF_DEPTH = 26;                    // world-units of max displacement (frame is 175×130)
    function applyRelief(ref, routeNo, color, img, depth) {
      if (!ref || !ref.canvasMesh || !img || !depth) return false;
      try {
        var ctex = texLoader.load(img, function () { try { ref.mat.needsUpdate = true; } catch (e) {} }, undefined,
          function () { try { ref.mat.map = makeCardTexture(THREE, routeNo, color); ref.mat.needsUpdate = true; } catch (e2) {} });
        if (THREE.sRGBEncoding) ctex.encoding = THREE.sRGBEncoding;
        ctex.anisotropy = _textureAnisotropy;
        var dtex = texLoader.load(depth, undefined, undefined, function () {}); dtex.anisotropy = _textureAnisotropy;   // decode-fail → flat (bias 0 ≙ no displacement data)
        var m2 = new THREE.MeshStandardMaterial({
          map: ctex, displacementMap: dtex,
          displacementScale: RELIEF_DEPTH, displacementBias: -RELIEF_DEPTH * 0.2,
          roughness: 0.85, metalness: 0.05
        });
        var oldG = ref.canvasMesh.geometry, oldM = ref.canvasMesh.material;
        // preserve recall-dimming opacity if the flat material carried it
        if (oldM && oldM.transparent) { m2.transparent = true; m2.opacity = oldM.opacity; }
        ref.canvasMesh.geometry = new THREE.PlaneGeometry(FRAME_W, FRAME_H, 64, 48);
        ref.canvasMesh.material = m2;
        ref.mat = m2;
        if (oldG && oldG.dispose) { try { oldG.dispose(); } catch (e) {} }
        if (oldM) { try { if (oldM.map && oldM.map.dispose && oldM.map !== ctex) oldM.map.dispose(); oldM.dispose(); } catch (e) {} }
        return true;
      } catch (e) { return false; }
    }
    // Shared warm light-wash texture+material for every picture light (gallery
    // theme): one canvas gradient, one additive material, reused by all frames.
    var _washMat = null;
    try {
      if (theme.walls) {
        var wc = document.createElement('canvas'); wc.width = 128; wc.height = 128;
        var wg = wc.getContext('2d');
        var wgrad = wg.createRadialGradient(64,48,2,64,64,64);
        wgrad.addColorStop(0, 'rgba(255,225,180,0.65)');
        wgrad.addColorStop(0.55, 'rgba(255,220,160,0.22)');
        wgrad.addColorStop(1, 'rgba(255,220,160,0)');
        wg.fillStyle = wgrad; wg.fillRect(0, 0, 128, 128);
        var wtex = new THREE.CanvasTexture(wc); wtex.anisotropy = _textureAnisotropy;
        _washMat = new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
      }
    } catch (e) {}
    // Shared gallery-frame geometry keeps the richer molding inexpensive.
    var frameRailHGeo = new THREE.BoxGeometry(FRAME_W + 28, 10, 9);
    var frameRailVGeo = new THREE.BoxGeometry(10, FRAME_H + 8, 9);
    var frameCaseMat = theme.walls && palace.loci.length > 1 ? new THREE.MeshStandardMaterial({ color: 0x746145, roughness: 0.46, metalness: 0.48 }) : null;
    // One shared planar ring gives each brass case a slim status-colour inlay.
    // The existing border material still communicates focus, recall, and loading.
    var frameAccentGeo = null;
    if (frameCaseMat) {
      var accentShape = new THREE.Shape();
      var aw=(FRAME_W+18)/2, ah=(FRAME_H+18)/2;
      accentShape.moveTo(-aw,-ah);accentShape.lineTo(aw,-ah);accentShape.lineTo(aw,ah);accentShape.lineTo(-aw,ah);accentShape.closePath();
      var accentHole=new THREE.Path(), iw=(FRAME_W+6)/2, ih=(FRAME_H+6)/2;
      accentHole.moveTo(-iw,-ih);accentHole.lineTo(-iw,ih);accentHole.lineTo(iw,ih);accentHole.lineTo(iw,-ih);accentHole.closePath();
      accentShape.holes.push(accentHole);
      frameAccentGeo=new THREE.ShapeGeometry(accentShape);
    }
    var frameInsetGeo = new THREE.PlaneGeometry(FRAME_W + 10, FRAME_H + 10);
    var frameInsetMat = new THREE.MeshStandardMaterial({ color: theme.walls ? 0xe8dcc5 : 0x111827, roughness: 0.96, metalness: 0.01 });
    // Fine inner bevels catch the gallery light without covering the artwork.
    var bevelHGeo = frameCaseMat ? new THREE.BoxGeometry(FRAME_W + 4, 1.6, 1.8) : null;
    var bevelVGeo = frameCaseMat ? new THREE.BoxGeometry(1.6, FRAME_H + 4, 1.8) : null;
    var bevelLightMat = frameCaseMat ? new THREE.MeshStandardMaterial({ color: 0xdecda9, roughness: 0.48, metalness: 0.35 }) : null;
    var bevelShadeMat = frameCaseMat ? new THREE.MeshStandardMaterial({ color: 0x6e5d43, roughness: 0.55, metalness: 0.28 }) : null;
    // Reuse fixture geometry across all stops; the diffuser is the only glowing part.
    var lampHoodGeo = new THREE.CylinderGeometry(5.5, 5.5, FRAME_W * 0.66, 12);
    var lampArmGeo = new THREE.BoxGeometry(2.6, 2.6, 14);
    var lampDiffuserGeo = new THREE.BoxGeometry(FRAME_W * 0.59, 1.4, 5);
    var lampHoodMat = new THREE.MeshStandardMaterial({ color: 0x9b825c, roughness: 0.38, metalness: 0.62 });
    var lampMat = new THREE.MeshStandardMaterial({ color: 0xffedc9, emissive: 0xffd9a0, emissiveIntensity: 0.7, roughness: 0.5, metalness: 0 });
    var frameShadowMat = null;
    try {
      var shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 96;
      var shadowCtx = shadowCanvas.getContext('2d'); shadowCtx.clearRect(0, 0, 128, 96);
      shadowCtx.shadowColor = 'rgba(0,0,0,0.9)'; shadowCtx.shadowBlur = 18; shadowCtx.fillStyle = 'rgba(0,0,0,0.52)'; shadowCtx.fillRect(22, 18, 84, 60);
      var shadowTex = new THREE.CanvasTexture(shadowCanvas);
      frameShadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    } catch (eFrameShadow) {}
    palace.loci.forEach(function (l, li) {
      if (l.id === '__entry') return;
      var routeNo = Math.max(1, palace.route.indexOf(l.id));
      var room = palace.rooms[l.roomIdx];
      var color = (room && room.color) || '#6366f1';
      var g2 = new THREE.Group();
      g2.position.set(l.framePos.x, l.framePos.y, l.framePos.z);
      g2.rotation.y = (l.faceYaw != null) ? l.faceYaw : (l.faceDir > 0 ? 0 : Math.PI);   // face into the (radial) room
      // Frame border + canvas. The border carries an (initially dark) emissive in
      // the room accent so the CURRENT locus can glow — tick pulses emissiveIntensity.
      var borderMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.38, metalness: 0.28, emissive: new THREE.Color(color), emissiveIntensity: 0 });
      var inset = new THREE.Mesh(frameInsetGeo, frameInsetMat); inset.position.z = 1.2; g2.add(inset);
      [[frameRailHGeo, 0, FRAME_H / 2 + 8], [frameRailHGeo, 0, -(FRAME_H / 2 + 8)], [frameRailVGeo, FRAME_W / 2 + 9, 0], [frameRailVGeo, -(FRAME_W / 2 + 9), 0]].forEach(function (railSpec) {
        var rail = new THREE.Mesh(railSpec[0], theme.walls ? frameCaseMat : borderMat); rail.position.set(railSpec[1], railSpec[2], 3);
        rail.userData.visualRole = 'frame-molding'; g2.add(rail);
      });
      if (theme.walls) {
        var accentInlay=new THREE.Mesh(frameAccentGeo,borderMat);accentInlay.position.z=8;
        accentInlay.userData.visualRole='frame-accent-inlay';g2.add(accentInlay);
        [[bevelHGeo, 0, FRAME_H / 2 + 1.2, bevelShadeMat], [bevelHGeo, 0, -FRAME_H / 2 - 1.2, bevelLightMat], [bevelVGeo, -FRAME_W / 2 - 1.2, 0, bevelShadeMat], [bevelVGeo, FRAME_W / 2 + 1.2, 0, bevelLightMat]].forEach(function (edge) {
          var bevel = new THREE.Mesh(edge[0], edge[3]);
          bevel.position.set(edge[1], edge[2], 5);
          bevel.userData.visualRole = 'frame-inner-bevel'; g2.add(bevel);
        });
      }
      if (frameShadowMat && !l.mine) {
        var frameShadow = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W + 52, FRAME_H + 48), frameShadowMat);
        frameShadow.position.z = -0.35; frameShadow.userData.visualRole = 'frame-contact-shadow'; g2.add(frameShadow);
      }
      // A slim brass hood projects from the frame on two supports. Its warm
      // underside illuminates the display without a bright front-facing bar.
      var lampHood = new THREE.Mesh(lampHoodGeo, lampHoodMat);
      lampHood.rotation.z = Math.PI / 2;
      lampHood.position.set(0, FRAME_H / 2 + 24, 15);
      lampHood.userData.visualRole = 'picture-light-hood'; g2.add(lampHood);
      [-1, 1].forEach(function (side) {
        var arm = new THREE.Mesh(lampArmGeo, lampHoodMat);
        arm.position.set(side * FRAME_W * 0.2, FRAME_H / 2 + 24, 5);
        g2.add(arm);
      });
      var lampBar = new THREE.Mesh(lampDiffuserGeo, lampMat);
      lampBar.position.set(0, FRAME_H / 2 + 18.6, 15);
      lampBar.userData.visualRole = 'picture-light-diffuser'; g2.add(lampBar);
      // A student-built locus stands free in the room rather than hanging on a
      // wall, so it gets a post and a base plate to sit on — and skips the wall
      // wash, which would otherwise glow on thin air behind it.
      if (l.mine) {
        try {
          var postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55), roughness: 0.7, metalness: 0.25 });
          var postH = Math.max(10, l.framePos.y - FRAME_H / 2 - 1);
          var post = new THREE.Mesh(new THREE.CylinderGeometry(5, 6.5, postH, 10), postMat);
          post.position.set(0, -(FRAME_H / 2) - postH / 2, 0);
          g2.add(post);
          var base = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, 3.5, 16), postMat);
          base.position.set(0, -(FRAME_H / 2) - postH + 1.75, 0);
          g2.add(base);
        } catch (eP) {}
      }
      // Warm wash on the wall around the frame — the picture light "shining".
      if (_washMat && !l.mine) {
        try {
          var wash = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W * 1.7, FRAME_H * 1.9), _washMat);
          wash.position.set(0, 14, -0.5);   // between the wall face and the frame border
          g2.add(wash);
        } catch (eW) {}
      }
      var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      var img = images[l.id];
      if (img) {
        // TextureLoader decodes asynchronously — a corrupt data-URL surfaces via the
        // onError callback, NOT a synchronous throw — so fall back to the numbered card
        // there too, or a bad image would render as a blank frame.
        try {
          var tx = texLoader.load(img, undefined, undefined, function () { try { mat.map = makeCardTexture(THREE, routeNo, color); mat.needsUpdate = true; } catch (e2) {} });
          if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; tx.anisotropy = _textureAnisotropy; mat.map = tx;
        } catch (e) { mat.map = makeCardTexture(THREE, routeNo, color); }
      } else {
        mat.map = makeCardTexture(THREE, routeNo, color);
      }
      var canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), mat);
      canvasMesh.position.z = 4;
      canvasMesh.userData.locusId = l.id;
      g2.add(canvasMesh);
      // Empty spots keep the numbered card, plus a quiet animated beacon around
      // its '+' affordance. It becomes more noticeable near the learner so the
      // customization tray feels connected to the place in the palace.
      var isEmptyLocus = !img && !((opts && opts.objects) || {})[l.id];
      var emptyBeacon = null;
      if (isEmptyLocus && !recall) {
        try {
          var beaconRing = new THREE.Mesh(new THREE.RingGeometry(13, 17, 28),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
          beaconRing.position.set(FRAME_W / 2 - 20, FRAME_H / 2 + 22, 13);
          beaconRing.renderOrder = 13;
          var beaconDot = new THREE.Mesh(new THREE.CircleGeometry(7, 24),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
          beaconDot.position.copy(beaconRing.position);
          beaconDot.renderOrder = 13;
          g2.add(beaconRing); g2.add(beaconDot);
          emptyBeacon = { id: l.id, ring: beaconRing, dot: beaconDot, phase: (li % 7) * 0.8 };
          _emptyBeacons.push(emptyBeacon);
        } catch (eEmptyBeacon) {}
      }
      // Item label under the frame ('?' while its answer is unearned in recall).
      var lab = makeLabelSprite(THREE, recall ? '?' : l.label, color, 24, false, _textureAnisotropy, theme.walls ? 'plaque' : undefined);
      lab.userData.visualRole = 'locus-caption'; lab.userData.locusId = l.id;
      lab.position.set(0, -(FRAME_H / 2 + 34), 10);
      g2.add(lab);
      // Route-number badge on the frame's top-left corner (order stays visible
      // once the numbered placeholder card is replaced by art). Safe in recall —
      // the position is already announced; only the LABEL is the answer.
      try {
        var badge = makeNumBadge(THREE, routeNo, color);
        badge.position.set(-(FRAME_W / 2 + 4), FRAME_H / 2 + 22, 10);
        g2.add(badge);
      } catch (eB) {}
      // Floor stop-ring at the camera stop — "stand here" wayfinding for the
      // free-roam walk and VR teleport, in the room accent color.
      var stopRing = null;
      try {
        if (l.camPos) {
          var ring = new THREE.Mesh(new THREE.RingGeometry(18, 25, 28),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(l.camPos.x, 1.6, l.camPos.z);
          group.add(ring);
          stopRing = ring;
        }
      } catch (eR) {}
      // Recall-driven dimming (study/review mode only — NEVER during a recall quiz,
      // which would leak "you struggled here"): loci the student recalled weakly in
      // past walks render dimmer, so re-study focuses where their OWN measured
      // memory is fragile (docs §4.5). Re-walking correctly brightens them.
      var masteryRing = null;
      if (!recall && opts.mastery) {
        var _st = masteryStrength(opts.mastery, l.id);
        if (_st != null) {
          var _mastery = Math.max(0, Math.min(1, _st));
          var _op = 0.32 + _mastery * 0.68;
          borderMat.transparent = true; borderMat.opacity = _op;
          mat.transparent = true; mat.opacity = _op;
          // Explicit memory-strength ring: red = needs practice, amber = developing,
          // green = strong. Hidden in recall mode so prior performance never hints
          // which test items are likely to be difficult.
          try {
            var _masteryColor = _mastery >= 0.8 ? 0x22c55e : (_mastery >= 0.5 ? 0xf59e0b : 0xef4444);
            var _ringBack = new THREE.Mesh(new THREE.RingGeometry(12, 17, 32),
              new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }));
            var _ringArc = new THREE.Mesh(new THREE.RingGeometry(12, 17, 32, 1, Math.PI / 2, Math.max(0.035, Math.PI * 2 * _mastery)),
              new THREE.MeshBasicMaterial({ color: _masteryColor, transparent: true, opacity: 0.98, depthWrite: false, side: THREE.DoubleSide }));
            _ringBack.position.set(FRAME_W / 2 + 20, FRAME_H / 2 + 18, 10);
            _ringArc.position.copy(_ringBack.position);
            g2.add(_ringBack); g2.add(_ringArc);
            masteryRing = { back: _ringBack, arc: _ringArc, strength: _mastery };
          } catch (eM) {}
        }
      }
      group.add(g2);
      frameMeshes.push(canvasMesh);
      frameRefs[l.id] = { group: g2, label: lab, captionText: recall ? '?' : l.label, borderMat: borderMat, baseColor: color, locus: l, mat: mat, canvasMesh: canvasMesh, masteryRing: masteryRing, stopRing: stopRing, emptyBeacon: emptyBeacon, idx: routeNo, hasImage: !!img, busy: false, empty: isEmptyLocus };
      if (frameRefs[l.id].empty) borderMat.emissiveIntensity = 0.12;
      // Existing relief pair (reload path): upgrade the flat frame in place.
      if (img && depths[l.id]) applyRelief(frameRefs[l.id], routeNo, color, img, depths[l.id]);
    });

    // Recreate the invitation when an existing locus is cleared after mount. This
    // keeps the visual affordance in sync with live decorate/remove actions.
    function _ensureEmptyBeacon(ref) {
      if (!ref || ref.emptyBeacon || recall || !ref.group) return;
      try {
        var color = ref.baseColor || '#818cf8';
        var beaconRing = new THREE.Mesh(new THREE.RingGeometry(13, 17, 28),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
        beaconRing.position.set(FRAME_W / 2 - 20, FRAME_H / 2 + 22, 13);
        beaconRing.renderOrder = 13;
        var beaconDot = new THREE.Mesh(new THREE.CircleGeometry(7, 24),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
        beaconDot.position.copy(beaconRing.position);
        beaconDot.renderOrder = 13;
        ref.group.add(beaconRing); ref.group.add(beaconDot);
        ref.emptyBeacon = { id: ref.locus.id, ring: beaconRing, dot: beaconDot, phase: (ref.idx % 7) * 0.8 };
        _emptyBeacons.push(ref.emptyBeacon);
      } catch (eEmptyBeacon) {}
    }

    // Final-locus completion beacon: a larger, quiet floor glow appears only after
    // the learner reaches the last authored stop in study mode. It adds closure
    // without changing the route or revealing anything during recall.
    var completionGlow = null;
    try {
      var finalId = palace.route[palace.route.length - 1];
      var finalLocus = locusById(palace, finalId);
      if (finalLocus && finalLocus.camPos) {
        var finalRoom = palace.rooms[finalLocus.roomIdx];
        var finalColor = finalRoom && finalRoom.color ? finalRoom.color : '#818cf8';
        var finalGroup = new THREE.Group();
        var finalRing = new THREE.Mesh(new THREE.RingGeometry(34, 43, 40),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(finalColor), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
        finalRing.rotation.x = -Math.PI / 2;
        finalRing.position.set(finalLocus.camPos.x, 2.2, finalLocus.camPos.z);
        finalGroup.add(finalRing);
        var finalColumn = new THREE.Mesh(new THREE.CylinderGeometry(7, 11, 108, 16),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(finalColor), transparent: true, opacity: 0, depthWrite: false }));
        finalColumn.position.set(finalLocus.camPos.x, 54, finalLocus.camPos.z);
        finalGroup.add(finalColumn);
        var finalCap = new THREE.Mesh(new THREE.ConeGeometry(19, 30, 5),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(finalColor), transparent: true, opacity: 0, depthWrite: false }));
        finalCap.position.set(finalLocus.camPos.x, 116, finalLocus.camPos.z);
        finalGroup.add(finalCap);
        finalGroup.visible = false;
        group.add(finalGroup);
        completionGlow = { group: finalGroup, ring: finalRing, column: finalColumn, cap: finalCap, color: finalColor };
      }
    } catch (eCompletionGlow) {}

    // Active-locus arrival halo: a low, color-matched floor wash makes the
    // selected frame feel like a destination, not just a highlighted border.
    // It is study-only so recall, overview, free-roam, and VR remain uncluttered.
    var arrivalHalo = null;
    try {
      var arrivalGroup = new THREE.Group();
      var arrivalOuter = new THREE.Mesh(new THREE.RingGeometry(30, 39, 40),
        new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      arrivalOuter.rotation.x = -Math.PI / 2;
      arrivalOuter.position.y = 2.3;
      var arrivalInner = new THREE.Mesh(new THREE.CircleGeometry(18, 32),
        new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      arrivalInner.rotation.x = -Math.PI / 2;
      arrivalInner.position.y = 2.05;
      arrivalGroup.add(arrivalOuter); arrivalGroup.add(arrivalInner);
      arrivalGroup.visible = false;
      group.add(arrivalGroup);
      arrivalHalo = { group: arrivalGroup, outer: arrivalOuter, inner: arrivalInner, targetId: null };
    } catch (eArrivalHalo) {}
    function _setArrivalHaloState() {
      if (!arrivalHalo) return;
      var ref = !recall && !overview && !freeMode && !state.xrActive ? _hlRef : null;
      var locus = ref && ref.locus;
      if (!locus || !locus.camPos) {
        arrivalHalo.group.visible = false;
        arrivalHalo.outer.material.opacity = 0;
        arrivalHalo.inner.material.opacity = 0;
        arrivalHalo.targetId = null;
        return;
      }
      arrivalHalo.group.visible = true;
      if (arrivalHalo.targetId !== locus.id) {
        arrivalHalo.group.position.set(locus.camPos.x, 0, locus.camPos.z);
        arrivalHalo.targetId = locus.id;
      }
      var accent = ref.baseColor || '#818cf8';
      try {
        arrivalHalo.outer.material.color.set(accent);
        arrivalHalo.inner.material.color.set(accent);
        arrivalHalo.outer.material.opacity = reduce ? 0.15 : 0.1;
        arrivalHalo.inner.material.opacity = reduce ? 0.07 : 0.045;
      } catch (eArrivalState) {}
    }

    // Free-roam route beacon: exploration stays open, but the next authored stop
    // remains visible as a gentle floor ring + vertical light column. Recall mode
    // never shows it because the next locus is an answer leak there.
    var nextStopBeacon = null;
    try {
      var nextBeaconGroup = new THREE.Group();
      var nextBeaconRing = new THREE.Mesh(new THREE.RingGeometry(23, 30, 32),
        new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.56, depthWrite: false, side: THREE.DoubleSide }));
      nextBeaconRing.rotation.x = -Math.PI / 2;
      nextBeaconRing.position.y = 1.8;
      var nextBeaconColumn = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 76, 12),
        new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.24, depthWrite: false }));
      nextBeaconColumn.position.y = 38;
      var nextBeaconCap = new THREE.Mesh(new THREE.ConeGeometry(15, 26, 4),
        new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.82, depthWrite: false }));
      nextBeaconCap.position.y = 86;
      nextBeaconGroup.add(nextBeaconRing); nextBeaconGroup.add(nextBeaconColumn); nextBeaconGroup.add(nextBeaconCap);
      nextBeaconGroup.visible = false;
      group.add(nextBeaconGroup);
      nextStopBeacon = { group: nextBeaconGroup, ring: nextBeaconRing, column: nextBeaconColumn, cap: nextBeaconCap, targetIdx: -1 };
    } catch (eNextBeacon) {}
    function _setNextStopBeaconState() {
      if (!nextStopBeacon) return;
      var targetIdx = curIdx + 1;
      var show = !!freeMode && !overview && !recall && targetIdx < palace.route.length;
      nextStopBeacon.group.visible = show;
      if (!show) { nextStopBeacon.targetIdx = -1; return; }
      var target = locusById(palace, palace.route[targetIdx]);
      if (!target || !target.camPos) { nextStopBeacon.group.visible = false; nextStopBeacon.targetIdx = -1; return; }
      if (nextStopBeacon.targetIdx === targetIdx) return;
      nextStopBeacon.group.position.set(target.camPos.x, 0, target.camPos.z);
      var room = target.roomIdx >= 0 ? palace.rooms[target.roomIdx] : null;
      var color = room && room.color ? room.color : '#93c5fd';
      try {
        nextStopBeacon.ring.material.color.set(color);
        nextStopBeacon.column.material.color.set(color);
        nextStopBeacon.cap.material.color.set(color);
      } catch (eNextColor) {}
      nextStopBeacon.targetIdx = targetIdx;
    }

    // Guided-study route tether: a restrained, floor-level arc connects the
    // current stop to the next authored locus. It gives the learner a spatial
    // sense of direction without revealing answers in recall or competing with
    // the bird's-eye overview/free-roam beacon.
    var guidedTether = null;
    try {
      var tetherGroup = new THREE.Group();
      var tetherLineMat = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0, depthWrite: false });
      var tetherLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
      ]), tetherLineMat);
      tetherLine.renderOrder = 3;
      var tetherArrowMat = new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0, depthWrite: false });
      var tetherArrow = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 4), tetherArrowMat);
      tetherArrow.renderOrder = 4;
      tetherGroup.add(tetherLine); tetherGroup.add(tetherArrow);
      tetherGroup.visible = false;
      group.add(tetherGroup);
      guidedTether = { group: tetherGroup, line: tetherLine, arrow: tetherArrow, lineMat: tetherLineMat, arrowMat: tetherArrowMat, targetIdx: -1 };
    } catch (eGuidedTether) {}
    function _setGuidedTetherState() {
      if (!guidedTether) return;
      var targetIdx = curIdx + 1;
      var show = !recall && !overview && !freeMode && !state.xrActive && targetIdx < palace.route.length;
      guidedTether.group.visible = show;
      if (!show) {
        guidedTether.lineMat.opacity = 0;
        guidedTether.arrowMat.opacity = 0;
        guidedTether.targetIdx = -1;
        return;
      }
      var from = locusById(palace, palace.route[curIdx]);
      var to = locusById(palace, palace.route[targetIdx]);
      if (!from || !to || !from.camPos || !to.camPos) {
        guidedTether.group.visible = false;
        guidedTether.targetIdx = -1;
        return;
      }
      if (guidedTether.targetIdx !== targetIdx) {
        var start = new THREE.Vector3(from.camPos.x, 5.4, from.camPos.z);
        var end = new THREE.Vector3(to.camPos.x, 5.4, to.camPos.z);
        var delta = end.clone().sub(start);
        var distance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
        var mid = start.clone().lerp(end, 0.5);
        mid.y = Math.min(84, 18 + distance * 0.04);
        try { if (guidedTether.line.geometry) guidedTether.line.geometry.dispose(); } catch (eTetherGeo) {}
        guidedTether.line.geometry = new THREE.BufferGeometry().setFromPoints([start, mid, end]);
        guidedTether.arrow.position.copy(start).lerp(end, 0.72);
        guidedTether.arrow.position.y = 10;
        guidedTether.arrow.rotation.x = Math.PI / 2;
        guidedTether.arrow.rotation.y = Math.atan2(delta.x, delta.z);
        var targetRoom = palace.rooms[to.roomIdx];
        var tetherColor = targetRoom && targetRoom.color ? targetRoom.color : '#93c5fd';
        try { guidedTether.lineMat.color.set(tetherColor); guidedTether.arrowMat.color.set(tetherColor); } catch (eTetherColor) {}
        guidedTether.targetIdx = targetIdx;
      }
    }

    // Overview-only walking-order guide: floor-level segments connect the authored
    // camera stops, while small arrowheads preserve direction without cluttering
    // the normal guided walk or recall scene.
    var routeGuide = new THREE.Group();
    var routeGuideSegments = [], routeGuideMarkers = [];
    routeGuide.visible = false;
    routeGuide.renderOrder = 4;
    group.add(routeGuide);
    try {
      for (var _routeIndex = 1; _routeIndex < palace.route.length; _routeIndex++) {
        var _from = locusById(palace, palace.route[_routeIndex - 1]);
        var _to = locusById(palace, palace.route[_routeIndex]);
        if (!_from || !_to || !_from.camPos || !_to.camPos) continue;
        var _start = new THREE.Vector3(_from.camPos.x, 3.4, _from.camPos.z);
        var _end = new THREE.Vector3(_to.camPos.x, 3.4, _to.camPos.z);
        var _delta = _end.clone().sub(_start);
        var _length = Math.max(1, Math.sqrt(_delta.x * _delta.x + _delta.z * _delta.z));
        var _roomForRoute = palace.rooms[_to.roomIdx];
        var _routeColor = (_roomForRoute && _roomForRoute.color) || '#818cf8';
        var _segGeo = new THREE.BufferGeometry().setFromPoints([_start, _end]);
        var _segMat = new THREE.LineBasicMaterial({ color: new THREE.Color(_routeColor), transparent: true, opacity: 0.22, depthWrite: false });
        var _seg = new THREE.Line(_segGeo, _segMat);
        _seg.renderOrder = 4;
        routeGuide.add(_seg);
        var _marker = new THREE.Mesh(
          new THREE.ConeGeometry(11, 28, 3),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(_routeColor), transparent: true, opacity: 0.5, depthWrite: false })
        );
        _marker.position.set(_start.x + _delta.x * 0.72, 5.2, _start.z + _delta.z * 0.72);
        _marker.rotation.x = Math.PI / 2;
        _marker.rotation.y = Math.atan2(_delta.x, _delta.z);
        _marker.renderOrder = 5;
        routeGuide.add(_marker);
        routeGuideSegments.push({ index: _routeIndex, mat: _segMat });
        routeGuideMarkers.push({ index: _routeIndex, mat: _marker.material });
      }
    } catch (eRoute) {}
    function _setRouteGuideState() {
      routeGuide.visible = !!overview;
      routeGuideSegments.forEach(function (segment) {
        var active = segment.index === curIdx;
        try { segment.mat.opacity = overview ? (active ? 0.82 : 0.22) : 0; } catch (e) {}
      });
      routeGuideMarkers.forEach(function (marker) {
        var active = marker.index === curIdx;
        try { marker.mat.opacity = overview ? (active ? 0.95 : 0.5) : 0; } catch (e) {}
      });
    }
    // Mastery rings are intentionally quiet in the walk; the overview legend
    // makes their meaning explicit without relying on color alone.
    var masteryLegend = null, masteryLegendCurrent = null;
    // Overview journey map: a compact, clickable route index that mirrors the
    // palace's room grouping without making learners decode the 3D geometry.
    var journeyMap = null, journeyMapTitle = null, journeyMapMeta = null, journeyMapStops = [], journeyMapLinks = [];
    var helpPanel = null, helpBtn = null, helpCloseBtn = null, helpVisible = false;
    var zoomValue = null, zoomOutBtn = null, zoomInBtn = null, resetViewBtn = null;
    function _setJourneyMapState() {
      if (!journeyMap) return;
      var show = !!overview && !routeVisible && !helpVisible && !recall && !buildMode && journeyMapStops.length > 0;
      journeyMap.hidden = !show;
      if (!show) return;
      var totalStops = Math.max(0, palace.route.length - 1);
      journeyMapMeta.textContent = curIdx === 0
        ? _tr(t, 'memory_palace.journey_map_start', 'Entrance · choose a stop to preview')
        : _tr(t, 'memory_palace.journey_map_progress', 'Stop {current} of {total}').replace('{current}', String(curIdx)).replace('{total}', String(totalStops));
      journeyMapStops.forEach(function (stop) {
        var active = stop.index === curIdx;
        var color = stop.color || '#818cf8';
        stop.button.setAttribute('aria-current', active ? 'step' : 'false');
        stop.button.style.backgroundColor = active ? '#24334b' : '#0c182b';
        stop.button.style.borderColor = active ? '#ffffff' : color;
        stop.button.style.color = '#f8fafc';
        if(stop.number){stop.number.style.backgroundColor=active?color:'#25334b';stop.number.style.color=active?contrastForeground(color):'#dce5f5';}
        stop.button.style.transform = 'none';
        stop.button.setAttribute('data-visited', visitedStops[palace.route[stop.index]] ? 'true' : 'false');
        stop.button.style.outline = active ? '2px solid #ffffff' : 'none';
        stop.button.style.outlineOffset = active ? '2px' : '0';
        stop.button.style.boxShadow = active ? ('0 0 0 3px ' + color + '55') : 'none';
      });
      journeyMapLinks.forEach(function (connection) {
        var focused = connection.index === focusedCrossLink;
        connection.button.setAttribute('aria-pressed', focused ? 'true' : 'false');
        connection.button.style.backgroundColor = focused ? '#312e81' : '#0f172a';
        connection.button.style.borderColor = focused ? '#c4b5fd' : (connection.color || '#64748b');
        connection.button.style.boxShadow = focused ? ('0 0 0 3px ' + (connection.color || '#818cf8') + '55') : 'none';
        connection.button.style.transform = focused ? 'translateX(2px)' : 'translateX(0)';
      });
    }
    function _focusCrossLink(index) {
      if (!overview || recall || index < 0 || index >= crossLinks.length) return;
      focusedCrossLink = focusedCrossLink === index ? -1 : index;
      _setCrossLinkState();
      _setJourneyMapState();
      try {
        var source = palace.rooms[crossLinks[index].from] || {};
        var target = palace.rooms[crossLinks[index].to] || {};
        live.textContent = focusedCrossLink === index
          ? ('Connection focused: ' + (source.label || 'Room') + ' to ' + (target.label || 'room'))
          : 'Connection focus cleared.';
      } catch (e) {}
    }
    function _firstStopForRoom(roomIdx) {
      for (var ri = 1; ri < palace.route.length; ri++) {
        var roomLocus = locusById(palace, palace.route[ri]);
        if (roomLocus && roomLocus.roomIdx === roomIdx) return ri;
      }
      return roomIdx === 0 ? 0 : -1;
    }
    function _jumpToRoom(roomIdx) {
      var targetIndex = _firstStopForRoom(roomIdx);
      if (targetIndex >= 0) {
        focusedCrossLink = -1;
        goTo(targetIndex);
      }
    }
    function _masteryDataAvailable() {
      if (recall || !opts.mastery || typeof opts.mastery !== 'object') return false;
      try {
        return Object.keys(opts.mastery).some(function (id) { return masteryStrength(opts.mastery, id) != null; });
      } catch (e) { return false; }
    }
    function _masteryStatusLabel(strength) {
      if (strength == null) return '';
      if (strength >= 0.8) return _tr(t, 'memory_palace.mastery_strong', 'Strong');
      if (strength >= 0.5) return _tr(t, 'memory_palace.mastery_developing', 'Developing');
      return _tr(t, 'memory_palace.mastery_needs_practice', 'Needs practice');
    }
    function _setMasteryLegendState() {
      if (!masteryLegend) return;
      var show = !!overview && !routeVisible && !helpVisible && _masteryDataAvailable();
      masteryLegend.hidden = !show;
      if (!show || !masteryLegendCurrent) return;
      var activeStrength = _hlRef && _hlRef.locus ? masteryStrength(opts.mastery, _hlRef.locus.id) : null;
      masteryLegendCurrent.hidden = activeStrength == null;
      masteryLegendCurrent.textContent = activeStrength == null
        ? ''
        : _tr(t, 'memory_palace.mastery_current', 'Current: {status}').replace('{status}', _masteryStatusLabel(activeStrength));
    }

    // Rebuild frame captions when the app's reading typography changes. Canvas
    // textures do not inherit CSS, so without this observer a user could enlarge
    // every app label while the in-world captions stayed small.
    function _replaceFrameLabel(ref, text) {
      if (!ref) return;
      try {
        var old = ref.label;

        if (old) ref.group.remove(old);
        if (old && old.material) {
          try { if (old.material.map) old.material.map.dispose(); old.material.dispose(); } catch (eD) {}
        }
        var overlay = !!(ref.locus && ref.locus.roomIdx === _captionOverlayRoomIdx);
        ref.label = makeLabelSprite(THREE, text, ref.baseColor, 24, overlay, _textureAnisotropy, theme.walls ? 'plaque' : undefined);
        ref.label.userData.visualRole = 'locus-caption'; ref.label.userData.locusId = ref.locus && ref.locus.id;
        ref.label.position.set(0, -(FRAME_H / 2 + 38), 11);
        if (ref.label.material) ref.label.material.opacity = 1;
        ref.captionText = text;
        ref.group.add(ref.label);
      } catch (e) {}
    }
    var _captionTypeKey = _appTypography(24).key, _captionRefreshTimer = 0;
    function _refreshFrameLabels() {
      _captionRefreshTimer = 0;
      var key = _appTypography(24).key;
      if (key === _captionTypeKey || state.disposed) return;
      _captionTypeKey = key;
      Object.keys(frameRefs).forEach(function (id) {
        var ref = frameRefs[id];
        _replaceFrameLabel(ref, ref.captionText);
      });
      _setFrameCaptionOcclusionState(true);
      if (!overview && !freeMode) stopTargets(curIdx);
    }
    function _queueCaptionRefresh() {
      if (_captionRefreshTimer || state.disposed) return;
      _captionRefreshTimer = window.setTimeout(_refreshFrameLabels, 90);
    }
    try {
      if (window.MutationObserver) {
        var _fontObserver = new window.MutationObserver(_queueCaptionRefresh);
        _fontObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
        if (document.head) _fontObserver.observe(document.head, { childList: true, characterData: true, subtree: true });
        var _appRoot = document.querySelector('.allo-docsuite');
        if (_appRoot) _fontObserver.observe(_appRoot, { attributes: true, attributeFilter: ['class', 'style'] });
        state.cleanup.push(function () {
          try { _fontObserver.disconnect(); } catch (e) {}
          if (_captionRefreshTimer) { try { window.clearTimeout(_captionRefreshTimer); } catch (e2) {} _captionRefreshTimer = 0; }
        });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            if (state.disposed) return;
            _captionTypeKey = '';
            _queueCaptionRefresh();
          }).catch(function () {});
        }
      }
    } catch (e) {}

    // Sculpted 3D objects at loci (Prim3D recipes from the 🗿 Sculpt flow, or a
    // haven decoration's recipe3d) — a pedestal + primitive-assembly figure beside
    // each frame. placeSculpture is reused for the initial pass AND live one-by-one
    // reveal (state.setLocusObject) during generation. Prim3D missing / unrenderable
    // recipe ⇒ nothing, never an error.
    var objects = (opts && opts.objects) || {};
    var P3D = window.AlloModules && window.AlloModules.Prim3D;
    var SCULPT_UNIT = 90;                    // a touch bigger than the original 70
    var _sculptedIds = {};                   // guard against placing a locus twice
    var _sculptRefs = {};                    // id → {ped, fig} so refine can replace them
    var _sculptSeq = {};                     // id → token; a late async glb resolve for a replaced/cleared locus is dropped
    // objects[id] can be a Prim3D recipe OR a CC0-library reference
    // ({ glbItem: 'sprout', ±scale/rotY/tint }) resolved via GlbLibrary.loadModel —
    // real .glb when the catalog has one, its Prim3D fallback recipe otherwise.
    function _isGlbRef(recipe) { return !!(recipe && typeof recipe === 'object' && typeof recipe.glbItem === 'string'); }
    function _placeFig(l, fig) {
      // decorSpot rotates the beside-the-frame offset with faceYaw — the old
      // axis-aligned offset put sculptures inside walls in rotated spoke rooms.
      var spot = decorSpot(l) || { x: l.framePos.x + 100, z: l.framePos.z + l.faceDir * 100 };
      var ped = new THREE.Mesh(new THREE.CylinderGeometry(34, 40, 46, 18),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.2 }));
      ped.position.set(spot.x, 23, spot.z); group.add(ped);
      fig.position.set(spot.x, 46, spot.z);
      if (l.faceYaw != null) fig.rotation.y += l.faceYaw;   // front faces into the room, like the frame
      group.add(fig);
      _sculptRefs[l.id] = { ped: ped, fig: fig };
    }
    function placeSculpture(l, recipe) {
      if (!l || l.id === '__entry' || _sculptedIds[l.id] || !recipe) return;
      if (_isGlbRef(recipe)) {
        var GLB = window.AlloModules && window.AlloModules.GlbLibrary;
        if (!GLB || typeof GLB.loadModel !== 'function') return;
        var item = null;
        try { item = (GLB.listCatalog() || []).filter(function (it) { return it.id === recipe.glbItem; })[0] || null; } catch (e) {}
        if (!item) return;
        _sculptedIds[l.id] = true;                          // claim the locus before the async load
        var token = (_sculptSeq[l.id] = (_sculptSeq[l.id] || 0) + 1);
        // student refinement transforms ride the reference (same fields as recipes)
        var unit = SCULPT_UNIT * Math.max(0.25, Math.min(5, (typeof recipe.scale === 'number' && !isNaN(recipe.scale)) ? recipe.scale : 1));
        var loadItem = recipe.tint ? Object.assign({}, item, { tint: recipe.tint }) : item;
        GLB.loadModel(THREE, loadItem, { unit: unit }).then(function (fig) {
          if (!fig) return;
          if (state.disposed || _sculptSeq[l.id] !== token || !_sculptedIds[l.id] || _sculptRefs[l.id]) { _disposeObj(fig); return; }
          try {
            if (typeof recipe.rotY === 'number' && !isNaN(recipe.rotY)) fig.rotation.y += recipe.rotY * Math.PI / 180;
            _placeFig(l, fig);
            if (palace.route[curIdx] === l.id) stopTargets(curIdx);
          } catch (e) {}
        }).catch(function () { delete _sculptedIds[l.id]; });   // failed load frees the claim for a retry
        return;
      }
      if (!P3D) return;
      try {
        var fig = P3D.buildObject(THREE, recipe, { unit: SCULPT_UNIT });
        if (!fig) return;
        _sculptedIds[l.id] = true;
        _placeFig(l, fig);
        if (palace.route[curIdx] === l.id) stopTargets(curIdx);
      } catch (e) {}
    }
    function _disposeObj(o) {
      try {
        group.remove(o);
        o.traverse && o.traverse(function (n) {
          if (n.geometry && n.geometry.dispose) { try { n.geometry.dispose(); } catch (e) {} }
          var mats = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
          mats.forEach(function (mx) { if (mx && mx.dispose) { try { if (mx.map && mx.map.dispose) mx.map.dispose(); mx.dispose(); } catch (e) {} } });
        });
        if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
        if (o.material && o.material.dispose) { try { o.material.dispose(); } catch (e) {} }
      } catch (e) {}
    }
    if (P3D && objects) {
      palace.loci.forEach(function (l) { if (objects[l.id]) placeSculpture(l, objects[l.id]); });
    }
    // ── Live one-by-one reveal API (called as furnish/sculpt generate each item,
    //    so results appear as they finish instead of all-at-once after a remount) ──
    state.setLocusImage = function (id, img) {
      var ref = frameRefs[id];
      if (!ref || !ref.mat || !img) return;
      try {
        var oldMap = ref.mat.map;
        var tx = texLoader.load(img, function () { try { ref.mat.needsUpdate = true; } catch (e) {} }, undefined, function () {});
        if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding;
        ref.mat.map = tx; ref.mat.needsUpdate = true; ref.hasImage = true; ref.busy = false; ref.empty = false;
        // A flat image replacing a relief must also drop the old depth map, or the
        // new picture renders warped over the previous subject's displacement bumps.
        if (ref.mat.displacementMap) {
          try { ref.mat.displacementMap.dispose(); } catch (eD) {}
          ref.mat.displacementMap = null; ref.mat.needsUpdate = true;
        }
        if (oldMap && oldMap.dispose && oldMap !== tx) { try { oldMap.dispose(); } catch (e) {} }   // free the placeholder card
        if (palace.route[curIdx] === id) stopTargets(curIdx);
      } catch (e) {}
    };
    // Clear a single locus back to its numbered card + no sculpture (the Decorate
    // panel's "remove art here"). Frame texture, relief displacement, and any
    // pedestal figure are all disposed in place — no remount needed.
    state.clearLocus = function (id) {
      var ref = frameRefs[id];
      if (ref && ref.mat) {
        try {
          var old = ref.mat.map;
          ref.mat.map = makeCardTexture(THREE, ref.idx || 0, ref.baseColor);
          if (ref.mat.displacementMap) { try { ref.mat.displacementMap.dispose(); } catch (eD) {} ref.mat.displacementMap = null; }
          ref.mat.needsUpdate = true;
          if (old && old.dispose && old !== ref.mat.map) { try { old.dispose(); } catch (eO) {} }
          ref.hasImage = false; ref.busy = false; ref.empty = true;
          if (ref.borderMat) ref.borderMat.emissiveIntensity = 0.12;
          _ensureEmptyBeacon(ref);
        } catch (e) {}
      }
      var sr = _sculptRefs[id];
      if (sr) { _disposeObj(sr.fig); _disposeObj(sr.ped); delete _sculptRefs[id]; }
      delete _sculptedIds[id];                              // also releases a pending glb claim…
      _sculptSeq[id] = (_sculptSeq[id] || 0) + 1;           // …and invalidates its in-flight resolve
    };
    // Live relief reveal (Furnish with 🗿 Relief on): color + depth land together.
    // No depth (or relief fails) → plain flat image, never an error.
    state.setLocusRelief = function (id, img, depth) {
      var ref = frameRefs[id];
      if (!ref || !img) return;
      ref.hasImage = true; ref.busy = false; ref.empty = false;
      if (!depth || !applyRelief(ref, ref.idx || 0, ref.baseColor, img, depth)) state.setLocusImage(id, img);
      if (palace.route[curIdx] === id) stopTargets(curIdx);
    };
    state.setLocusObject = function (id, recipe) {
      var l = locusById(palace, id);
      if (l && recipe) {
        if (frameRefs[id]) { frameRefs[id].busy = false; frameRefs[id].empty = false; }
        placeSculpture(l, recipe);
        if (palace.route[curIdx] === id) stopTargets(curIdx);
      }
    };
    state.setLocusBusy = function (id, busy) {
      var ref = frameRefs[id];
      if (!ref || !ref.mat) return;
      ref.busy = !!busy;
      try {
        if (!ref.hasImage) {
          var oldMap = ref.mat.map;
          ref.mat.map = makeCardTexture(THREE, ref.idx || 0, ref.baseColor, ref.busy);
          ref.mat.needsUpdate = true;
          if (oldMap && oldMap.dispose && oldMap !== ref.mat.map) oldMap.dispose();
        }
        if (ref.borderMat) {
          ref.borderMat.color.set(ref.busy ? '#818cf8' : ref.baseColor).multiplyScalar(ref.busy ? 1 : 0.8);
          ref.borderMat.emissiveIntensity = ref.busy ? 0.72 : (ref.empty ? 0.12 : 0);
        }
      } catch (e) {}
    };
    // Replace a locus's sculpture in place (refinement): dispose the old figure +
    // pedestal, then place the new recipe.
    state.replaceLocusObject = function (id, recipe) {
      var l = locusById(palace, id);
      if (!l) return;
      var ref = _sculptRefs[id];
      if (ref) { _disposeObj(ref.fig); _disposeObj(ref.ped); delete _sculptRefs[id]; }
      // Always release the claim + bump the token: a still-IN-FLIGHT glb load for
      // the old object must land as a no-op, not resurrect what it replaced.
      delete _sculptedIds[id];
      _sculptSeq[id] = (_sculptSeq[id] || 0) + 1;
      if (recipe && frameRefs[id]) frameRefs[id].empty = false;
      placeSculpture(l, recipe);
      if (palace.route[curIdx] === id) stopTargets(curIdx);
    };

    // Landmarks: one giant primitive structure per room (opts.landmarks =
    // { roomKey: Prim3D recipe }) rendered at building scale against the back
    // wall — "the world built of very large versions" (docs §4.7). Same graceful
    // degradation: no Prim3D or no recipe ⇒ nothing, never an error.
    var landmarks = (opts && opts.landmarks) || {};
    if (P3D && landmarks) {
      (palace.rooms || []).forEach(function (room) {
        var rec = landmarks[room.key];
        if (!rec || room.key === '__entry') return;
        try {
          var big = P3D.buildObject(THREE, rec, { unit: 150 });
          if (!big) return;
          // landmarkSpot rotates the far-wall position onto the room's spoke —
          // the old constant z was a linear-corridor leftover (wrong room, or
          // floating in the hub, for every rotated room).
          var lspot = landmarkSpot(room) || { x: room.center.x, z: -ROOM_D / 2 + 115, rotY: 0 };
          big.position.set(lspot.x, 0, lspot.z);
          big.rotation.y += lspot.rotY || 0;   // compose with any recipe rotY
          group.add(big);
        } catch (e) {}
      });
    }

    // ── Celebration burst: a fistful of glowing confetti at the frame when a
    //    recall answer lands (skipped under prefers-reduced-motion — the border
    //    flash + toast still carry the feedback). Sprites share one circle
    //    texture; per-sprite materials are disposed when the burst expires. ──
    var _fxTex = null, _bursts = [];
    var _FX_COLORS = [0xf59e0b, 0x22c55e, 0x818cf8, 0xec4899, 0x22d3ee, 0xfde047];
    function _fxTexture() {
      if (_fxTex) return _fxTex;
      var c = document.createElement('canvas'); c.width = 32; c.height = 32;
      var g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.fill();
      _fxTex = new THREE.CanvasTexture(c);
      return _fxTex;
    }
    function _celebrate(ref) {
      if (reduce || !ref || !ref.group) return;
      try {
        var yaw = (ref.locus && ref.locus.faceYaw != null) ? ref.locus.faceYaw : 0;
        var ox = Math.sin(yaw) * 34, oz = Math.cos(yaw) * 34;
        var base = ref.group.position;
        var items = [];
        for (var bi = 0; bi < 16; bi++) {
          var m = new THREE.SpriteMaterial({ map: _fxTexture(), color: _FX_COLORS[bi % _FX_COLORS.length], transparent: true, depthWrite: false });
          var sp = new THREE.Sprite(m);
          var sc = 8 + Math.random() * 7;
          sp.scale.set(sc, sc, 1);
          sp.position.set(base.x + ox, base.y + 14, base.z + oz);
          group.add(sp);
          items.push({ sp: sp, vx: (Math.random() - 0.5) * 5.5, vy: 2.6 + Math.random() * 3.4, vz: (Math.random() - 0.5) * 5.5 });
        }
        _bursts.push({ items: items, age: 0 });
      } catch (e) {}
    }
    // Ambient animation (stars twinkle, motes drift, orb ring spins, bursts fly).
    // One call per frame from tick — everything here is a handful of uniform
    // writes; the burst loop only runs while a celebration is alive.
    function _animateFlourish() {
      try {
        var now = (window.performance && window.performance.now) ? window.performance.now() : 0;
        if (!reduce) {
          for (var si = 0; si < _starMats.length; si++) {
            _starMats[si].opacity = 0.42 + 0.18 * Math.sin(now * 0.0012 + (_starMats[si].userData.phase || 0));
          }
          if (_motes) { _motes.rotation.y = now * 0.000021; _motes.position.y = Math.sin(now * 0.0005) * 6; }
          if (_orbRing) { _orbRing.rotation.y = now * 0.00072; }
        }
        if (completionGlow && completionGlow.group.visible) {
          var completionWave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.0032));
          completionGlow.ring.material.opacity = reduce ? 0.22 : (0.14 + 0.14 * completionWave);
          completionGlow.ring.scale.setScalar(reduce ? 1.04 : (1.02 + 0.1 * completionWave));
          completionGlow.column.material.opacity = reduce ? 0.18 : (0.13 + 0.09 * completionWave);
          completionGlow.cap.material.opacity = reduce ? 0.72 : (0.58 + 0.24 * completionWave);
          if (!reduce) completionGlow.cap.rotation.y += 0.01;
        }
        if (guidedTether && guidedTether.group.visible) {
          var tetherWave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.0036));
          guidedTether.lineMat.opacity = reduce ? 0.18 : (0.1 + 0.1 * tetherWave);
          guidedTether.arrowMat.opacity = reduce ? 0.62 : (0.42 + 0.22 * tetherWave);
          guidedTether.arrow.scale.setScalar(reduce ? 1 : (0.96 + 0.1 * tetherWave));
        }
        if (arrivalHalo && arrivalHalo.group.visible) {
          var arrivalWave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.0031));
          arrivalHalo.outer.material.opacity = reduce ? 0.15 : (0.07 + 0.08 * arrivalWave);
          arrivalHalo.outer.scale.setScalar(reduce ? 1.02 : (1.01 + 0.09 * arrivalWave));
          arrivalHalo.inner.material.opacity = reduce ? 0.07 : (0.028 + 0.035 * arrivalWave);
          arrivalHalo.inner.scale.setScalar(reduce ? 1 : (0.96 + 0.08 * arrivalWave));
        }
        if (nextStopBeacon && nextStopBeacon.group.visible) {
          var nextWave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.0035));
          try {
            nextStopBeacon.ring.material.opacity = reduce ? 0.62 : (0.44 + 0.26 * nextWave);
            nextStopBeacon.ring.scale.setScalar(reduce ? 1.08 : 1.02 + 0.14 * nextWave);
            if (!reduce) nextStopBeacon.ring.rotation.z += 0.012;
            nextStopBeacon.column.material.opacity = reduce ? 0.3 : (0.18 + 0.12 * nextWave);
            nextStopBeacon.cap.material.opacity = reduce ? 0.82 : (0.64 + 0.2 * nextWave);
            nextStopBeacon.cap.position.y = 82 + (reduce ? 0 : 7 * nextWave);
          } catch (eNextTick) {}
        }
        for (var eb = 0; eb < _emptyBeacons.length; eb++) {
          var beacon = _emptyBeacons[eb];
          var beaconRef = frameRefs[beacon.id];
          var beaconVisible = !!beaconRef && beaconRef.empty && !recall;
          var nearby = _nearEmptyId === beacon.id;
          var beaconWave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.004 + beacon.phase));
          try {
            beacon.ring.visible = beaconVisible;
            beacon.dot.visible = beaconVisible;
            beacon.ring.material.opacity = beaconVisible ? (nearby ? 0.56 + 0.24 * beaconWave : 0.16 + 0.12 * beaconWave) : 0;
            beacon.dot.material.opacity = beaconVisible ? (nearby ? 0.88 : 0.5) : 0;
            var ringScale = nearby ? (reduce ? 1.12 : 1.06 + 0.18 * beaconWave) : (reduce ? 1 : 1 + 0.07 * beaconWave);
            beacon.ring.scale.setScalar(ringScale);
            beacon.dot.scale.setScalar(nearby && !reduce ? 1 + 0.08 * beaconWave : 1);
          } catch (eBeaconTick) {}
        }
        for (var b = _bursts.length - 1; b >= 0; b--) {
          var burst = _bursts[b]; burst.age += 1;
          var fade = Math.max(0, 1 - burst.age / 55);
          for (var k = 0; k < burst.items.length; k++) {
            var it = burst.items[k];
            it.vy -= 0.12;
            it.sp.position.x += it.vx; it.sp.position.y += it.vy; it.sp.position.z += it.vz;
            it.sp.material.opacity = fade;
          }
          if (burst.age > 55) {
            burst.items.forEach(function (it2) {
              try { group.remove(it2.sp); it2.sp.material.dispose(); } catch (e2) {}   // shared _fxTex lives until destroy
            });
            _bursts.splice(b, 1);
          }
        }
      } catch (e) {}
    }

    // The shared confetti texture is only in the scene graph while a burst is
    // alive — dispose it explicitly so an idle-at-destroy palace doesn't leak it.
    state.cleanup.push(function () { try { if (_fxTex) _fxTex.dispose(); } catch (e) {} });

    // ── Recall API on the handle: earn a label back / flash placement status ──
    state.revealLocus = function (id) {
      try { if (typeof _xrHideBank === 'function' && _vrBankFor === id) _xrHideBank(); } catch (eB) {}   // answered correctly → close the VR bank
      var ref = frameRefs[id];
      if (!ref) return;
      try {
        _replaceFrameLabel(ref, ref.locus.label);
      } catch (e) {}
    };
    state.setLocusStatus = function (id, status) {
      var ref = frameRefs[id];
      if (!ref) return;
      try {
        if (status === 'correct') { ref.borderMat.color.set('#22c55e'); _celebrate(ref); }
        else if (status === 'incorrect') ref.borderMat.color.set('#ef4444');
        else ref.borderMat.color.set(ref.baseColor).multiplyScalar(0.8);
      } catch (e) {}
    };

    // ── Camera rails ──
    var curIdx = Math.max(0, (palace.route || []).indexOf(opts.startAt || '__entry'));
    var camPos = new THREE.Vector3(), camPosT = new THREE.Vector3();
    var railEaseMultiplier = 1;
    var look = new THREE.Vector3(), lookT = new THREE.Vector3();
    var yawOff = 0, pitchOff = 0;   // drag look-around at a stop
    var overview = false;
    // ── Free-roam (WASD) layered over the guided route ──
    // WASD walks; drag looks around; the ◀▶ buttons / arrow keys / clicking a frame
    // are the GUIDED tour (ease to a locus). Pressing a movement key enters free mode;
    // any guided nav returns to the rails.
    var freeMode = false, freeYaw = 0, freePitch = 0, moveF = 0, moveR = 0;
    var MOVE_SPEED = 14;
    var explorationControls = null;
    function stopWalking() { moveF = 0; moveR = 0; }
    function stepInRoom(direction) {
      if (!freeMode || recall || overview || buildMode || state.xrActive || helpVisible || routeVisible) return;
      stopWalking();
      var distance = direction * 64, bounds = palace.bounds;
      var x = _cl(camPos.x + Math.sin(freeYaw) * distance, bounds.minX + 40, bounds.maxX - 40);
      var z = _cl(camPos.z + Math.cos(freeYaw) * distance, bounds.minZ + 40, bounds.maxZ - 40);
      var next = theme.walls ? resolvePalaceMovement(palace, camPos.x, camPos.z, x, z, WALK_RADIUS) : { x: x, z: z, collided: false };
      camPos.x = next.x; camPos.z = next.z;
      if (next.collided) _noteWallCollision();
      _syncFreeRoomContext();
      if (freeNavLive && !next.collided) freeNavLive.textContent = direction > 0
        ? _tr(t, 'memory_palace.step_forward_done', 'Stepped forward.')
        : _tr(t, 'memory_palace.step_back_done', 'Stepped back.');
    }
    function turnInRoom(direction) {
      if (!freeMode || recall || overview || buildMode || state.xrActive || helpVisible || routeVisible) return;
      stopWalking(); freeYaw += direction * Math.PI / 6; freePitch = 0;
      _freeCueKey = ''; _syncFreeRoomContext();
      if (freeNavLive) freeNavLive.textContent = direction > 0
        ? _tr(t, 'memory_palace.turned_left', 'Turned left 30 degrees.')
        : _tr(t, 'memory_palace.turned_right', 'Turned right 30 degrees.');
    }
    function _cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function enterFree() {
      if (freeMode) return;
      var dx = look.x - camPos.x, dy = look.y - camPos.y, dz = look.z - camPos.z;
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      freeYaw = Math.atan2(dx, dz);
      freePitch = _cl(dy / len, -0.99, 0.99); freePitch = Math.asin(freePitch);
      overview = false; freeMode = true;
      _setFocusCardState();
      _setCompletionCardState();
      _setNextStopBeaconState();
      _setGuidedTetherState();
      _setArrivalHaloState();
    }

    function inspectRoom() {
      if (recall || state.xrActive || buildMode || palace.rooms.length < 2) return;
      var currentLocus = locusById(palace, palace.route[curIdx]);
      var roomIdx = currentLocus && currentLocus.roomIdx > 0 ? currentLocus.roomIdx : 1;
      var room = palace.rooms[roomIdx];
      if (!room) return;
      if (routeVisible) setRouteVisible(false, false);
      if (helpVisible) _setHelpVisible(false, false);
      _hideCtrlHint();
      moveF = 0; moveR = 0; yawOff = 0; pitchOff = 0;
      var angle = room.angle || 0;
      var localX = -ROOM_W / 2 + 76;
      camPos.set(room.center.x + Math.cos(angle) * localX, EYE, room.center.z - Math.sin(angle) * localX);
      look.set(room.center.x + Math.cos(angle) * 200, EYE + 10, room.center.z - Math.sin(angle) * 200);
      // A deliberate instant cut avoids flying through walls or unrelated rooms.
      freeMode = false; enterFree();
      _setCameraFov(68, false);
      _setActiveRoom(roomIdx); _setRouteGuideState(); _setCrossLinkState();
      _syncFreeRoomContext(); updateHud();
      if (live) live.textContent = _tr(t, 'memory_palace.room_orientation', 'Explore {room}. Notice its doorway, landmark and memory locations. Resume your stop when ready.').replace('{room}', room.label || '');
      renderer.domElement.focus();
    }

    // Content-aware camera framing keeps the featured cue legible when a locus
    // gains a sculpture, a long caption, or a relief surface. The authored rail
    // remains the baseline; this only widens the shot and recenters the focus.
    var _adaptiveBox = new THREE.Box3();
    var _adaptiveFrameCenter = new THREE.Vector3();
    var _adaptiveBaseCam = new THREE.Vector3();
    var _adaptiveForward = new THREE.Vector3();
    var _adaptiveRight = new THREE.Vector3();
    var _adaptiveFocus = new THREE.Vector3();
    var _adaptiveLookOffset = new THREE.Vector3();
    var _adaptiveObjectCenter = new THREE.Vector3();
    var _adaptiveObjectSize = new THREE.Vector3();
    function _textureAspect(ref) {
      try {
        var image = ref && ref.mat && ref.mat.map && ref.mat.map.image;
        var width = image && (image.naturalWidth || image.videoWidth || image.width);
        var height = image && (image.naturalHeight || image.videoHeight || image.height);
        return width && height ? width / height : 1;
      } catch (e) { return 1; }
    }
    function _applyAdaptiveFraming(l, ref) {
      if (!l || !ref) return;
      try {
        _adaptiveFrameCenter.set(l.framePos.x, l.framePos.y, l.framePos.z);
        _adaptiveBaseCam.copy(camPosT);
        _adaptiveForward.copy(_adaptiveBaseCam).sub(_adaptiveFrameCenter);
        var horizontal = Math.sqrt(_adaptiveForward.x * _adaptiveForward.x + _adaptiveForward.z * _adaptiveForward.z);
        if (horizontal < 1) _adaptiveForward.set(0, 0, 1);
        else _adaptiveForward.set(_adaptiveForward.x / horizontal, 0, _adaptiveForward.z / horizontal);
        var baseDistance = Math.max(CAM_BACK, _adaptiveBaseCam.distanceTo(_adaptiveFrameCenter));
        _adaptiveRight.set(_adaptiveForward.z, 0, -_adaptiveForward.x);
        _adaptiveLookOffset.copy(lookT).sub(_adaptiveFrameCenter);

        var minLateral = -FRAME_W / 2, maxLateral = FRAME_W / 2;
        var minVertical = -(FRAME_H / 2 + 54), maxVertical = FRAME_H / 2 + 32;
        var captionLength = l.label ? String(l.label).length : 0;
        var measuredCaption = ref.label && ref.label.userData && ref.label.userData.baseScale ? ref.label.userData.baseScale.x : 0;
        var captionWidth = Math.min(420, Math.max(FRAME_W, measuredCaption || (80 + captionLength * 7)));
        minLateral = Math.min(minLateral, -captionWidth / 2);
        maxLateral = Math.max(maxLateral, captionWidth / 2);

        var sculpt = _sculptRefs[l.id];
        var hasObjectBounds = false;
        _adaptiveBox.makeEmpty();
        if (sculpt && sculpt.fig) { _adaptiveBox.setFromObject(sculpt.fig); hasObjectBounds = !_adaptiveBox.isEmpty(); }
        if (sculpt && sculpt.ped) {
          var pedestalBox = new THREE.Box3().setFromObject(sculpt.ped);
          if (hasObjectBounds) _adaptiveBox.union(pedestalBox);
          else { _adaptiveBox.copy(pedestalBox); hasObjectBounds = !_adaptiveBox.isEmpty(); }
        }
        if (hasObjectBounds) {
          _adaptiveBox.getCenter(_adaptiveObjectCenter);
          _adaptiveBox.getSize(_adaptiveObjectSize);
          var objectOffset = _adaptiveObjectCenter.clone().sub(_adaptiveFrameCenter);
          var lateralOffset = objectOffset.dot(_adaptiveRight);
          var objectHalfWidth = (Math.abs(_adaptiveRight.x) * _adaptiveObjectSize.x + Math.abs(_adaptiveRight.z) * _adaptiveObjectSize.z) / 2 + 18;
          minLateral = Math.min(minLateral, lateralOffset - objectHalfWidth);
          maxLateral = Math.max(maxLateral, lateralOffset + objectHalfWidth);
          var verticalOffset = _adaptiveObjectCenter.y - _adaptiveFrameCenter.y;
          var objectHalfHeight = _adaptiveObjectSize.y / 2 + 18;
          minVertical = Math.min(minVertical, verticalOffset - objectHalfHeight);
          maxVertical = Math.max(maxVertical, verticalOffset + objectHalfHeight);
        }

        var aspect = _textureAspect(ref);
        if (ref.hasImage && aspect > 1.7) maxLateral = Math.max(maxLateral, FRAME_W * 0.62);
        if (ref.hasImage && aspect > 0 && aspect < 0.58) maxVertical = Math.max(maxVertical, FRAME_H * 0.62);
        var spanWidth = Math.max(FRAME_W, maxLateral - minLateral);
        var spanHeight = Math.max(FRAME_H + 86, maxVertical - minVertical);
        var spanRatio = Math.max(spanWidth / FRAME_W, spanHeight / (FRAME_H + 86));
        var distanceScale = 1 + Math.min(0.72, Math.max(0, spanRatio - 1) * 0.42);
        if (ref.mat && ref.mat.displacementMap) distanceScale = Math.min(1.8, distanceScale * 1.06);

        var lateralCenter = (minLateral + maxLateral) / 2;
        var verticalCenter = (minVertical + maxVertical) / 2;
        _adaptiveFocus.copy(_adaptiveFrameCenter).add(_adaptiveRight.multiplyScalar(lateralCenter));
        _adaptiveFocus.y += verticalCenter;
        var framedDistance = baseDistance * distanceScale;
        // Fit the frame, molding and caption to a portrait viewport at the default
        // lens. Keeping this independent of the current FOV preserves manual zoom.
        if (camera.aspect < 1) {
          var portraitFit = (spanWidth + 54) / (2 * Math.tan(58 * Math.PI / 360) * Math.max(0.35, camera.aspect) * 0.84);
          framedDistance = Math.max(framedDistance, portraitFit);
        }
        camPosT.copy(_adaptiveFocus).add(_adaptiveForward.multiplyScalar(framedDistance));
        if (theme.walls && camera.aspect < 1) {
          var safeFit = resolvePalaceMovement(palace, _adaptiveBaseCam.x, _adaptiveBaseCam.z, camPosT.x, camPosT.z, WALK_RADIUS);
          camPosT.x = safeFit.x; camPosT.z = safeFit.z;
        }
        camPosT.y = _adaptiveBaseCam.y;
        lookT.copy(_adaptiveFocus).add(_adaptiveLookOffset);
      } catch (e) {
        // A malformed texture/object must never break guided navigation.
      }
    }
    function stopTargets(idx) {
      var id = palace.route[idx];
      var l = locusById(palace, id);
      if (!l) return;
      camPosT.set(l.camPos.x, l.camPos.y, l.camPos.z);
      lookT.set(l.lookAt.x, l.lookAt.y, l.lookAt.z);
      if (id === '__entry' && !state.xrActive) {
        // Include the plinth base and more of the plaza in the opening view.
        camPosT.set(0, EYE + 30, ROOM_D / 2 - 28);
        lookT.set(0, 110, 0);
      }
      _applyAdaptiveFraming(l, frameRefs[id]);
    }
    function applyOverview() {
      var cx = (palace.bounds.minX + palace.bounds.maxX) / 2;
      var cz = (palace.bounds.minZ + palace.bounds.maxZ) / 2;
      var spanX = Math.max(1, palace.bounds.maxX - palace.bounds.minX);
      var spanZ = Math.max(1, palace.bounds.maxZ - palace.bounds.minZ);
      var vFov = camera.fov * Math.PI / 180;
      var hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.35, camera.aspect));
      var fitDistance = Math.max(spanZ / (2 * Math.tan(vFov / 2)), spanX / (2 * Math.tan(hFov / 2)));
      var overviewHeight = Math.max(1400, fitDistance * 1.16);
      var overviewTilt = Math.min(ROOM_D * 1.05, spanZ * 0.12);
      camPosT.set(cx, overviewHeight, cz + overviewTilt);
      lookT.set(cx, 0, cz);
      try { _setRoomOutlineMode(); _setRouteGuideState(); _setCrossLinkState(); _setRoomHeatmapState(); _setMasteryLegendState(); _setGuidedTetherState(); _setArrivalHaloState(); } catch (e) {}
    }
    stopTargets(curIdx);
    camPos.copy(camPosT); look.copy(lookT);
    if (!reduce) { camPos.y += 700; camPos.z += 500; }   // gentle descend-in

    var t2 = t;
    var live = document.createElement('div'); live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); live.style.cssText = SR_ONLY;
    holder.appendChild(live);

    function announce(idx) {
      try { live.textContent = recall ? describeLocusForRecall(palace, palace.route[idx], t2, decor) : describeLocusForSR(palace, palace.route[idx], t2, decor); } catch (e) {}
      _setFocusCardState();
      if (typeof opts.onLocusChange === 'function') {
        try { opts.onLocusChange(locusById(palace, palace.route[idx]), idx, palace.route.length); } catch (e) {}
      }
    }
    // Approaching an unfurnished camera stop surfaces its customization choices in
    // the host UI. Hysteresis prevents the card from flickering at the threshold,
    // and the callback never steals focus or runs during recall / immersive XR.
    var _nearEmptyId = null;
    function _emptyDistanceSq(ref) {
      if (!ref || !ref.locus || !ref.locus.camPos) return Infinity;
      var dx = camPos.x - ref.locus.camPos.x, dz = camPos.z - ref.locus.camPos.z;
      return dx * dx + dz * dz;
    }
    function _notifyEmptyApproach() {
      if (recall || state.xrActive || typeof opts.onEmptyLocusApproach !== 'function') return;
      var keep = _nearEmptyId && frameRefs[_nearEmptyId];
      if (keep && keep.empty && _emptyDistanceSq(keep) <= 290 * 290) return;
      if (_nearEmptyId) {
        var leaving = frameRefs[_nearEmptyId];
        var leaveReason = leaving && !leaving.empty ? 'filled' : 'departed';
        try { opts.onEmptyLocusApproach(leaving && leaving.locus, false, leaving ? palace.route.indexOf(leaving.locus.id) : -1, palace.route.length, leaveReason); } catch (e) {}
        if (typeof opts.onEmptyLocusAnchor === 'function') { try { opts.onEmptyLocusAnchor(_nearEmptyId, null); } catch (eA) {} }
        _nearEmptyId = null;
      }
      var best = null, bestD = 210 * 210;
      Object.keys(frameRefs).forEach(function (id) {
        var ref = frameRefs[id];
        if (!ref.empty) return;
        var d = _emptyDistanceSq(ref);
        if (d <= bestD) { best = ref; bestD = d; }
      });
      if (best) {
        _nearEmptyId = best.locus.id;
        try { opts.onEmptyLocusApproach(best.locus, true, palace.route.indexOf(best.locus.id), palace.route.length); } catch (e2) {}
      }
    }
    var _anchorProject = new THREE.Vector3(), _anchorLast = 0;
    function _emitEmptyAnchor() {
      if (!_nearEmptyId || typeof opts.onEmptyLocusAnchor !== 'function') return;
      var now = (window.performance && window.performance.now) ? window.performance.now() : 0;
      if (now - _anchorLast < 120) return;
      _anchorLast = now;
      var ref = frameRefs[_nearEmptyId];
      if (!ref) return;
      try {
        ref.group.getWorldPosition(_anchorProject);
        _anchorProject.y -= FRAME_H * 0.15;
        _anchorProject.project(camera);
        opts.onEmptyLocusAnchor(_nearEmptyId, {
          x: Math.max(2, Math.min(98, (_anchorProject.x * 0.5 + 0.5) * 100)),
          y: Math.max(2, Math.min(98, (-_anchorProject.y * 0.5 + 0.5) * 100)),
          visible: _anchorProject.z >= -1 && _anchorProject.z <= 1
        });
      } catch (e) {}
    }
    state.cleanup.push(function () {
      if (_nearEmptyId && typeof opts.onEmptyLocusApproach === 'function') {
        try { opts.onEmptyLocusApproach(frameRefs[_nearEmptyId] && frameRefs[_nearEmptyId].locus, false); } catch (e) {}
      }
      if (typeof opts.onEmptyLocusAnchor === 'function') { try { opts.onEmptyLocusAnchor(_nearEmptyId, null); } catch (e2) {} }
      _nearEmptyId = null;
    });

    // Caption scale compensates gently for walking distance. In overview, labels
    // are projected to screen space and overlapping neighbors yield to the closest
    // (the current locus always wins), preventing a wall of unreadable captions.
    var _captionProject = new THREE.Vector3();
    function _scaleFrameLabels() {
      var candidates = [];
      Object.keys(frameRefs).forEach(function (id) {
        var ref = frameRefs[id], label = ref && ref.label;
        if (!label || !label.userData || !label.userData.baseScale) return;
        var dx = camera.position.x - ref.group.position.x;
        var dy = camera.position.y - ref.group.position.y;
        var dz = camera.position.z - ref.group.position.z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var factor = overview ? 0.82 : Math.max(1, Math.min(1.65, Math.pow(Math.max(1, dist / 360), 0.28)));
        var tx = label.userData.baseScale.x * factor, ty = label.userData.baseScale.y * factor;
        if (reduce) label.scale.set(tx, ty, 1);
        else { label.scale.x += (tx - label.scale.x) * 0.12; label.scale.y += (ty - label.scale.y) * 0.12; }
        if (!overview) { label.visible = true; return; }
        label.getWorldPosition(_captionProject);
        var worldDist = Math.max(1, camera.position.distanceTo(_captionProject));
        _captionProject.project(camera);
        var viewHeight = 2 * Math.tan(camera.fov * Math.PI / 360) * worldDist;
        var halfW = Math.min(0.48, label.scale.x / Math.max(1, viewHeight * camera.aspect));
        var halfH = Math.min(0.28, label.scale.y / Math.max(1, viewHeight));
        candidates.push({ ref: ref, label: label, x: _captionProject.x, y: _captionProject.y, z: _captionProject.z, halfW: halfW, halfH: halfH, dist: dist, current: ref === _hlRef });
      });
      if (!overview) return;
      candidates.sort(function (a, b) { return a.current ? -1 : (b.current ? 1 : a.dist - b.dist); });
      var placed = [];
      candidates.forEach(function (c) {
        var visible = c.z >= -1 && c.z <= 1 && c.x - c.halfW >= -0.97 && c.x + c.halfW <= 0.97 && c.y - c.halfH >= -0.94 && c.y + c.halfH <= 0.94;
        if (visible && !c.current) {
          for (var i = 0; i < placed.length; i++) {
            if (Math.abs(c.x - placed[i].x) < c.halfW + placed[i].halfW + 0.025 && Math.abs(c.y - placed[i].y) < c.halfH + placed[i].halfH + 0.02) { visible = false; break; }
          }
        }
        c.label.visible = visible;
        if (visible) placed.push(c);
      });
    }

    // Current-locus glow: the active frame's border emissive pulses gently so the
    // student always sees WHICH locus the walk is on (reduced motion ⇒ steady glow).
    var _activeRoomIdx = -1, _captionOverlayRoomIdx = -2;
    var _freeStopRef = null;
    function _setFrameCaptionOcclusionState(force) {
      var cameraRoom = camPos ? roomAtPoint(palace, camPos.x, camPos.z, 28) : null;
      var overlayRoomIdx = cameraRoom && typeof cameraRoom.roomIdx === 'number' ? cameraRoom.roomIdx : -1;
      if (!force && overlayRoomIdx === _captionOverlayRoomIdx) return;
      _captionOverlayRoomIdx = overlayRoomIdx;
      Object.keys(frameRefs).forEach(function (key) {
        var ref = frameRefs[key], label = ref && ref.label;
        if (!label || !label.material) return;
        var overlay = !!(ref.locus && ref.locus.roomIdx === _captionOverlayRoomIdx);
        try {
          label.material.depthTest = !overlay;
          label.renderOrder = overlay ? 24 : 12;
          label.userData.occlusionSafe = overlay;
        } catch (eCaptionDepth) {}
      });
    }
    var freeNavCue = null, freeNavLive = null, freeNavText = null, freeReturnBtn = null, freeNavCompass = null, freeNavCompassArrow = null, roomBadge = null, roomBadgeText = null, roomBadgeDot = null, focusCard = null, focusCardKicker = null, focusCardTitle = null, focusCardMeta = null, focusCardCue = null, completionCard = null, completionCardTitle = null, completionCardMeta = null, completionCardDismiss = null, completionWalkBtn = null, completionOverviewBtn = null, completionCardDismissed = false, _freeCueKey = '', _freeAnnounceKey = '', _freeCueHeading = -99, _wallCueUntil = 0, _wallLastAnnounce = 0;
    function _setRingActive(ref, active) {
      var ring = ref && ref.stopRing;
      if (!ring || !ring.material) return;
      try {
        ring.material.opacity = active ? 0.58 : 0.16;
        ring.scale.setScalar(active ? 1.08 : 1);
      } catch (e) {}
    }
    function _resetBorder(ref) {
      if (!ref || !ref.borderMat) return;
      try { ref.borderMat.emissiveIntensity = ref.busy ? 0.72 : (ref.empty ? 0.12 : 0); } catch (e) {}
    }
    function _setRoomOutlineMode() {
      Object.keys(_roomCanopies).forEach(function (key) { _roomCanopies[key].visible = !overview; });
      Object.keys(_roomLabels).forEach(function(key){
        var sign=_roomLabels[key],position=sign.userData && (overview?sign.userData.roomMapPosition:sign.userData.roomWalkPosition);
        if(position)sign.position.copy(position);
      });
      // Overview is a navigation map: eye-level fog must not obscure distant rooms.
      if (root.fog) root.fog.density = overview ? 0 : theme.fog;
      Object.keys(_roomOutlines).forEach(function (key) {
        var outline = _roomOutlines[key];
        var active = Number(key) === _activeRoomIdx;
        try { outline.opacity = active ? (overview ? 0.68 : 0.32) : (overview ? 0.34 : 0.14); } catch (e) {}
      });
    }
    function _roomMasteryColor(value) {
      var color = new THREE.Color('#475569');
      if (value == null) return color;
      try { color.setHSL(Math.max(0, Math.min(1, value)) * 0.33, 0.78, 0.48); } catch (e) {}
      return color;
    }
    function _setRoomHeatmapState() {
      if (!Object.keys(_roomHeatmaps).length) return;
      var show = !!overview && !recall && _masteryDataAvailable();
      var summary = roomMasterySummary(palace, opts.mastery);
      Object.keys(_roomHeatmaps).forEach(function (key) {
        var roomIdx = Number(key), heatmap = _roomHeatmaps[key];
        var bucket = summary[roomIdx] || { average: null, coverage: 0 };
        var measured = bucket.average != null;
        var active = roomIdx === _activeRoomIdx;
        try {
          heatmap.visible = show && measured;
          heatmap.material.color.copy(_roomMasteryColor(bucket.average));
          heatmap.material.opacity = show && measured ? (0.06 + 0.16 * bucket.coverage + (active ? 0.05 : 0)) : 0;
          heatmap.userData = { average: bucket.average, coverage: bucket.coverage, roomIdx: roomIdx };
        } catch (eHeatState) {}
      });
    }
    function _setRoomBadgeState() {
      if (!roomBadge) return;
      var ref = freeMode ? _freeStopRef : _hlRef;
      var roomIdx = _activeRoomIdx;
      if (ref && ref.locus && typeof ref.locus.roomIdx === 'number') roomIdx = ref.locus.roomIdx;
      var room = roomIdx >= 0 ? palace.rooms[roomIdx] : null;
      if (!room) { roomBadge.hidden = true; return; }
      var label = room.label || _tr(t, 'memory_palace.hub', 'Hub plaza');
      roomBadge.hidden = false;
      roomBadgeText.textContent = label;
      roomBadgeDot.style.backgroundColor = room.color || '#64748b';
      roomBadgeDot.style.boxShadow = room.color ? ('0 0 0 2px ' + room.color + '44') : '0 0 0 2px rgba(148,163,184,0.35)';
      roomBadge.setAttribute('aria-label', _tr(t, 'memory_palace.room_current', 'Current room: {room}').replace('{room}', label));
      roomBadge.title = label;
    }
    function _setFocusCardState() {
      if (!focusCard) return;
      var l = _hlRef && _hlRef.locus ? _hlRef.locus : locusById(palace, palace.route[curIdx]);
      var show = !recall && !overview && !freeMode && !state.xrActive && !routeVisible && !helpVisible && !buildMode && !!l;
      focusCard.hidden = !show;
      if (!show) return;
      var idx = Math.max(0, palace.route.indexOf(l.id));
      var total = Math.max(0, palace.route.length - 1);
      var room = l.roomIdx >= 0 ? palace.rooms[l.roomIdx] : null;
      var roomLabel = room && room.label ? room.label : _tr(t, 'memory_palace.hub', 'Hub plaza');
      var entry = l.id === '__entry';
      var accent = room && room.color ? room.color : '#818cf8';
      focusCardKicker.textContent = entry ? _tr(t, 'memory_palace.focus_entry', 'Palace entrance') : _tr(t, 'memory_palace.focus_current', 'Current locus');
      focusCardTitle.textContent = l.label || _tr(t, 'memory_palace.focus_stop', 'Stop {index}').replace('{index}', String(idx));
      focusCardMeta.textContent = entry
        ? _tr(t, 'memory_palace.entrance_counts', '{rooms} rooms · {stops} memory stops').replace('{rooms}', String(Math.max(0, palace.rooms.length - 1))).replace('{stops}', String(total))
        : roomLabel + ' · ' + _tr(t, 'memory_palace.focus_progress', 'Stop {current} of {total}').replace('{current}', String(idx)).replace('{total}', String(total));
      focusCardCue.style.webkitLineClamp = cueExpanded || (l.mnemonic || '').length <= 120 ? 'unset' : '2';
      focusCardCue.textContent = entry
        ? _tr(t, 'memory_palace.entrance_guidance', 'Begin at the first stop. Connect each idea to its location, then walk the same route again.')
        : (l.mnemonic
          ? _tr(t, 'memory_palace.focus_picture', 'Picture: {mnemonic}').replace('{mnemonic}', l.mnemonic)
          : _tr(t, 'memory_palace.focus_follow', 'Follow the highlighted frame to place this idea.'));
      if (beginWalkBtn) { beginWalkBtn.hidden = !entry; beginWalkBtn.disabled = total === 0; }
      if (cueToggle) cueToggle.hidden = entry || !l.mnemonic || l.mnemonic.length <= 120;
      focusCard.style.borderColor = accent;
      focusCard.style.boxShadow = '0 12px 30px ' + accent + '33';
      focusCard.setAttribute('aria-label', focusCardTitle.textContent + '. ' + focusCardMeta.textContent);
    }
    function _setCompletionGlowState() {
      if (!completionGlow) return;
      var total = Math.max(0, palace.route.length - 1);
      var complete = !recall && !overview && !freeMode && !state.xrActive && !routeVisible && !helpVisible && total > 0 && curIdx >= total;
      completionGlow.group.visible = complete;
      if (!complete) {
        completionGlow.ring.material.opacity = 0;
        completionGlow.column.material.opacity = 0;
        completionGlow.cap.material.opacity = 0;
      } else if (reduce) {
        completionGlow.ring.material.opacity = 0.22;
        completionGlow.column.material.opacity = 0.18;
        completionGlow.cap.material.opacity = 0.72;
      }
    }
    function _setCompletionCardState() {
      if (!completionCard) return;
      var total = Math.max(0, palace.route.length - 1);
      var complete = !recall && !overview && !freeMode && !state.xrActive && !routeVisible && !helpVisible && total > 0 && curIdx >= total;
      completionCard.hidden = !complete || completionCardDismissed;
      if (complete) {
        var finalLocus = locusById(palace, palace.route[palace.route.length - 1]);
        var visited = Object.keys(visitedStops).length;
        completionCardTitle.textContent = visited >= total
          ? _tr(t, 'memory_palace.complete_title', 'Route complete')
          : _tr(t, 'memory_palace.final_stop_title', 'Final stop reached');
        completionCardMeta.textContent = _tr(t, 'memory_palace.visited_summary', 'Visited {visited} of {total} stops. Try recalling the ideas without looking, then revisit anything uncertain.').replace('{visited}', String(visited)).replace('{total}', String(total));
        if (visitRemainingBtn) {
          visitRemainingBtn.hidden = visited >= total;
          visitRemainingBtn.textContent = _tr(t, 'memory_palace.visit_remaining', 'Visit remaining stops ({count})').replace('{count}', String(Math.max(0, total - visited)));
          visitRemainingBtn.setAttribute('aria-label', visitRemainingBtn.textContent);
        }
        completionCard.setAttribute('aria-label', completionCardTitle.textContent + '. ' + completionCardMeta.textContent);
      }
      _setCompletionGlowState();
    }
    function _setActiveRoom(roomIdx) {
      _activeRoomIdx = typeof roomIdx === 'number' ? roomIdx : -1;
      _setFrameCaptionOcclusionState(true);
      if (_focusLight) {
        var focusRoom = _activeRoomIdx >= 0 ? palace.rooms[_activeRoomIdx] : null;
        try {
          if (focusRoom) { _focusLight.color.set(focusRoom.color || '#818cf8'); _focusLight.position.set(focusRoom.center.x, WALL_H - 46, focusRoom.center.z); _focusLight.intensity = theme.walls ? 0.86 : 0.62; }
          else { _focusLight.intensity = theme.walls ? 0.32 : 0.24; }
        } catch (eFocusRoom) {}
      }
      Object.keys(_roomLabels).forEach(function (key) {
        var label = _roomLabels[key], active = Number(key) === _activeRoomIdx;
        try {
          if (label.material) label.material.opacity = active ? 1 : 0.62;
          var base = label.userData && label.userData.roomBaseScale;
          if (base) label.scale.copy(base).multiplyScalar(active ? 1.08 : 1);
        } catch (e) {}
      });
      Object.keys(_roomPortals).forEach(function (key) {
        var portal = _roomPortals[key];
        try { portal.emissiveIntensity = Number(key) === _activeRoomIdx ? 0.42 : 0.04; } catch (e) {}
      });
      _setRoomOutlineMode();
      _setCrossLinkState();
      _setRoomHeatmapState();
      _setRoomBadgeState();
      _setFocusCardState();
      _setArrivalHaloState();
    }
    function _updateFreeCue(roomIdx, ref) {
      if (!freeNavCue) return;
      if (explorationControls) explorationControls.hidden = !freeMode || overview || recall || buildMode || state.xrActive || routeVisible || helpVisible;
      if (!freeMode || routeVisible || helpVisible) {
        freeNavCue.hidden = true;
        if (freeReturnBtn) freeReturnBtn.hidden = true;
        if (freeNavCompass) freeNavCompass.hidden = true;
        _freeCueKey = '';
        _freeAnnounceKey = '';
        _freeCueHeading = -99;
        _wallCueUntil = 0;
        return;
      }
      var room = roomIdx >= 0 ? palace.rooms[roomIdx] : null;
      var stop = !recall && ref && ref.locus ? ref.locus.label : ''; // Free-roam must not reveal answers during recall.
      var target = ref && ref.locus ? ref.locus : locusById(palace, palace.route[curIdx]);
      var headingBin = -99, headingGlyph = '';
      if (target && target.camPos) {
        var tx = target.camPos.x - camPos.x, tz = target.camPos.z - camPos.z;
        if (Math.abs(tx) + Math.abs(tz) > 40) {
          var bearing = Math.atan2(tx, tz), delta = bearing - freeYaw;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          headingBin = (Math.round(delta / (Math.PI / 4)) + 8) % 8;
          headingGlyph = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'][headingBin];
        }
      }
      var now = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
      var blocked = now < _wallCueUntil;
      var key = String(roomIdx) + '|' + (ref && ref.locus ? ref.locus.id : '') + '|' + String(headingBin) + '|' + (blocked ? 'wall' : 'clear');
      if (_freeCueKey === key && !freeNavCue.hidden) return;
      _freeCueKey = key;
      _freeCueHeading = headingBin;
      freeNavCue.hidden = false;
      freeNavCue.setAttribute('data-blocked', blocked ? 'true' : 'false');
      if (freeReturnBtn) freeReturnBtn.hidden = false;
      var roomLabel = room && room.label ? room.label : _tr(t, 'memory_palace.hub', 'Hub plaza');
      var context = blocked
        ? _tr(t, 'memory_palace.wall_ahead', 'Wall ahead · use the doorway')
        : (stop ? _tr(t, 'memory_palace.free_near', 'Near {label}').replace('{label}', stop) : _tr(t, 'memory_palace.free_walk', 'Free-roam'));
      var direction = !blocked && headingGlyph ? ' · ' + _tr(t, 'memory_palace.free_toward', 'toward route') : '';
      if (freeNavCompass) {
        freeNavCompass.hidden = blocked || !headingGlyph;
        if (!blocked && headingGlyph && freeNavCompassArrow) freeNavCompassArrow.style.transform = 'rotate(' + String(headingBin * 45) + 'deg)';
      }
      if (freeNavText) freeNavText.textContent = roomLabel + ' · ' + context + direction;
      var announceKey = String(roomIdx) + '|' + (ref && ref.locus ? ref.locus.id : '');
      if (_freeAnnounceKey !== announceKey && !blocked) {
        _freeAnnounceKey = announceKey;
        if (freeNavLive) freeNavLive.textContent = roomLabel + '. ' + (stop ? _tr(t, 'memory_palace.free_near', 'Near {label}').replace('{label}', stop) : _tr(t, 'memory_palace.free_walk', 'Free-roam')) + '.';
      }
      try {
        freeNavCue.style.borderColor = blocked ? '#fbbf24' : (room && room.color ? room.color : '#64748b');
        freeNavCue.style.boxShadow = blocked ? '0 8px 28px rgba(251,191,36,0.28)' : (room && room.color ? ('0 8px 24px ' + room.color + '33') : '0 8px 24px rgba(2,6,23,0.35)');
      } catch (e) {}
    }
    function _noteWallCollision() {
      var now = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
      _wallCueUntil = now + 850;
      _freeCueKey = '';
      if (freeNavLive && now - _wallLastAnnounce > 1400) {
        freeNavLive.textContent = _tr(t, 'memory_palace.wall_ahead', 'Wall ahead · use the doorway');
        _wallLastAnnounce = now;
      }
    }
    var _hlRef = null;
    function _setFreeStop(ref) {
      if (_freeStopRef === ref) return;
      if (_freeStopRef) { _setRingActive(_freeStopRef, false); _resetBorder(_freeStopRef); }
      if (_hlRef && _hlRef !== ref) { _setRingActive(_hlRef, false); _resetBorder(_hlRef); }
      _freeStopRef = ref || null;
      _setRingActive(_freeStopRef, true);
      if (_freeStopRef && _freeStopRef.borderMat && reduce) {
        try { _freeStopRef.borderMat.emissiveIntensity = _freeStopRef.busy ? 0.72 : 0.45; } catch (e) {}
      }
    }
    function _syncFreeRoomContext() {
      if (!freeMode) return;
      var spot = roomAtPoint(palace, camPos.x, camPos.z, 22);
      var roomIdx = spot && typeof spot.roomIdx === 'number' ? spot.roomIdx : -1;
      if (roomIdx !== _activeRoomIdx) _setActiveRoom(roomIdx);
      var nearest = null, nearestD = 300 * 300;
      Object.keys(frameRefs).forEach(function (key) {
        var ref = frameRefs[key], l = ref && ref.locus;
        if (!l || l.roomIdx !== roomIdx || !l.camPos) return;
        var dx = camPos.x - l.camPos.x, dz = camPos.z - l.camPos.z;
        var d = dx * dx + dz * dz;
        if (d <= nearestD) { nearest = ref; nearestD = d; }
      });
      _setFreeStop(nearest);
      _updateFreeCue(roomIdx, nearest);
    }
    function _setHighlight(id) {
      _updateFreeCue(-1, null);
      if (_freeStopRef) { _setRingActive(_freeStopRef, false); _freeStopRef = null; }
      _resetBorder(_hlRef);
      Object.keys(frameRefs).forEach(function (key) { _setRingActive(frameRefs[key], false); });
      _hlRef = frameRefs[id] || null;
      var nextRoomIdx = _hlRef && _hlRef.locus ? _hlRef.locus.roomIdx : -1;
      _setActiveRoom(nextRoomIdx);
      _setRingActive(_hlRef, true);
      if (_hlRef && _hlRef.borderMat && reduce) {
        try { _hlRef.borderMat.emissiveIntensity = _hlRef.busy ? 0.72 : 0.45; } catch (e) {}
      }
    }
    function _pulseHl() {
      var focusRef = freeMode ? _freeStopRef : _hlRef;
      var now = (window.performance && window.performance.now) ? window.performance.now() : 0;
      var wave = reduce ? 0.5 : (0.5 + 0.5 * Math.sin(now * 0.004));
      try {
        if (focusRef && focusRef.stopRing && focusRef.stopRing.material) {
          focusRef.stopRing.material.opacity = reduce ? 0.58 : (0.42 + 0.22 * wave);
          focusRef.stopRing.scale.setScalar(reduce ? 1.08 : (1.04 + 0.08 * wave));
        }
        // Room illumination and doorway accents stay steady; motion belongs
        // to the active stop marker and its slim frame inlay.
        var activeOutline = _roomOutlines[_activeRoomIdx];
        if (activeOutline && !reduce) activeOutline.opacity = overview ? (0.54 + 0.14 * wave) : (0.24 + 0.12 * wave);
        var activeHeatmap = _roomHeatmaps[_activeRoomIdx];
        if (activeHeatmap && activeHeatmap.visible && overview && !reduce) activeHeatmap.material.opacity = Math.min(0.32, 0.2 + 0.08 * wave);
        if (overview && !reduce) {
          routeGuideSegments.forEach(function (segment) {
            if (segment.index === curIdx) { try { segment.mat.opacity = 0.62 + 0.2 * wave; } catch (e) {} }
          });
          routeGuideMarkers.forEach(function (marker) {
            if (marker.index === curIdx) { try { marker.mat.opacity = 0.78 + 0.17 * wave; } catch (e) {} }
          });
          crossLinks.forEach(function (link, linkIdx) {
            if (linkIdx === focusedCrossLink || link.from === _activeRoomIdx || link.to === _activeRoomIdx) { try { link.coreMat.opacity = linkIdx === focusedCrossLink ? (0.84 + 0.14 * wave) : (0.58 + 0.18 * wave); link.haloMat.opacity = linkIdx === focusedCrossLink ? (0.18 + 0.1 * wave) : (0.1 + 0.08 * wave); } catch (eCrossPulse) {} }
          });
        }
        if (reduce || !focusRef || !focusRef.borderMat) return;
        focusRef.borderMat.emissiveIntensity = focusRef.busy ? (0.62 + 0.18 * wave) : (0.24 + 0.2 * wave);
      } catch (e) {}
    }
    var visitedStops = Object.create(null);
    if (!recall && curIdx > 0) visitedStops[palace.route[curIdx]] = true;
    function goTo(idx, skipAnnounce) {
      try { if (typeof _xrHideBank === 'function') _xrHideBank(); } catch (eB) {}   // navigating away closes an open VR answer bank
      if (freeMode) _setCameraFov(58, false);
      if (idx !== curIdx && cueToggle) {
        cueExpanded = false; focusCard.scrollTop = 0;
        cueToggle.textContent = _tr(t, 'memory_palace.cue_expand', 'Read full cue');
        cueToggle.setAttribute('aria-label', cueToggle.textContent); cueToggle.setAttribute('aria-expanded', 'false');
      }
      curIdx = Math.max(0, Math.min(palace.route.length - 1, idx));
      if (!recall && curIdx > 0) visitedStops[palace.route[curIdx]] = true;
      overview = false; freeMode = false; moveF = 0; moveR = 0; yawOff = 0; pitchOff = 0;   // guided nav returns to the rails
      focusedCrossLink = -1;
      completionCardDismissed = false;
      _setNextStopBeaconState();
      _setGuidedTetherState();
      stopTargets(curIdx);
      _setHighlight(palace.route[curIdx]);
      _setRouteGuideState();
      _setCrossLinkState();
      _setMasteryLegendState();
      if (reduce) { camPos.copy(camPosT); look.copy(lookT); }
      updateHud();
      if (!skipAnnounce) announce(curIdx);
    }
    _setHighlight(palace.route[curIdx]);   // glow the starting locus too
    _setRouteGuideState();
    _setGuidedTetherState();
    _setArrivalHaloState();

    // ── DOM chrome: prev/next + progress + overview ──
    var hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom,14px));transform:translateX(-50%);z-index:8;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:clamp(4px,1vw,8px);width:max-content;max-width:calc(100% - 24px);max-height:calc(100% - 24px);overflow:auto;box-sizing:border-box;background:rgba(2,6,23,0.92);border:1px solid #64748b;border-radius:999px;padding:6px 10px;color:#e2e8f0;box-shadow:0 12px 34px rgba(2,6,23,0.34);backdrop-filter:blur(8px);';
    hud.setAttribute('data-palace-overlay', 'dock');
    function mkBtn(txt, label, fn) {
      var b = document.createElement('button');
      b.textContent = txt; b.setAttribute('aria-label', label);
      b.style.cssText = 'border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:999px;min-width:44px;min-height:44px;padding:8px 13px;font-size:0.8125rem;font-weight:800;white-space:nowrap;flex:0 0 auto;cursor:pointer;';
      b.type = 'button'; b.onclick = fn; return b;
    }
    function palaceIcon(kind, size) {
      var paths={previous:'M15 5l-7 7 7 7',next:'M9 5l7 7-7 7',map:'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16',home:'M3 11l9-8 9 8M6 9v12h12V9M10 21v-7h4v7',orbit:'M18 6a8 8 0 1 0 0 12',diamond:'M12 2l9 10-9 10L3 12z',weave:'M4 8c0-8 16-8 16 0S4 24 4 16 20 0 20 8',facet:'M12 2l9 7-3 11H6L3 9zm0 0L6 20m6-18 6 18M3 9h18'};
      var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width',String(size||20));svg.setAttribute('height',String(size||20));
      svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.style.cssText='display:block;flex:none;';
      var path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[kind]||paths.map);
      path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.7');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);return svg;
    }
    function setPalaceIcon(button, kind) { button.textContent='';button.appendChild(palaceIcon(kind));button.style.display='inline-flex';button.style.alignItems='center';button.style.justifyContent='center'; }
    var prevBtn = mkBtn('◀', _tr(t, 'memory_palace.prev', 'Previous locus'), function () { goTo(curIdx - 1); });
    prevBtn.setAttribute('data-palace-action', 'previous'); setPalaceIcon(prevBtn,'previous');
    focusCard = document.createElement('section');
    focusCard.hidden = true;
    focusCard.setAttribute('role', 'group');
    focusCard.setAttribute('aria-label', _tr(t, 'memory_palace.focus_card', 'Current locus focus'));
    focusCard.setAttribute('data-palace-overlay', 'focus');
    focusCard.style.cssText = 'position:absolute;left:12px;top:12px;z-index:6;width:min(350px,calc(100% - 24px));box-sizing:border-box;padding:11px 13px 12px;border:1px solid #818cf8;border-radius:14px;background:rgba(2,6,23,0.94);color:#f8fafc;box-shadow:0 12px 30px rgba(2,6,23,0.3);pointer-events:auto;overflow:auto;scrollbar-width:thin;backdrop-filter:blur(14px);transition:border-color 180ms ease,box-shadow 180ms ease;';
    focusCardKicker = document.createElement('div');
    focusCardKicker.style.cssText = 'color:#c4b5fd;font-size:clamp(0.625rem,1.5vw,0.75rem);font-weight:900;letter-spacing:0.06em;line-height:1.2;text-transform:uppercase;';
    focusCard.appendChild(focusCardKicker);
    focusCardTitle = document.createElement('div');
    focusCardTitle.setAttribute('data-palace-focus-heading','true');
    focusCardTitle.style.cssText = 'margin-top:4px;color:#ffffff;font-size:clamp(0.95rem,2.2vw,1.2rem);font-weight:950;line-height:1.18;overflow-wrap:anywhere;';
    focusCard.appendChild(focusCardTitle);
    focusCardMeta = document.createElement('div');
    focusCardMeta.style.cssText = 'margin-top:4px;color:#cbd5e1;font-size:clamp(0.6875rem,1.6vw,0.8125rem);font-weight:800;line-height:1.25;overflow-wrap:anywhere;';
    focusCard.appendChild(focusCardMeta);
    focusCardCue = document.createElement('div');
    focusCardCue.style.cssText = 'margin-top:8px;padding-top:7px;border-top:1px solid rgba(148,163,184,0.35);color:#f8fafc;font-size:clamp(0.8125rem,1.55vw,0.875rem);font-weight:500;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;';
    focusCard.appendChild(focusCardCue);
    var cueExpanded = false;
    var cueToggle = mkBtn(_tr(t, 'memory_palace.cue_expand', 'Read full cue'), _tr(t, 'memory_palace.cue_expand', 'Read full cue'), function () {
      cueExpanded = !cueExpanded;
      focusCardCue.style.webkitLineClamp = cueExpanded ? 'unset' : '2';
      cueToggle.textContent = cueExpanded ? _tr(t, 'memory_palace.cue_collapse', 'Collapse cue') : _tr(t, 'memory_palace.cue_expand', 'Read full cue');
      cueToggle.setAttribute('aria-label', cueToggle.textContent);
      cueToggle.setAttribute('aria-expanded', String(cueExpanded));
      _syncDockLayout();
    });
    cueToggle.setAttribute('data-palace-action', 'expand-cue');
    cueToggle.setAttribute('aria-expanded', 'false');
    focusCardCue.id = 'palace-cue-' + (window.__palaceCueSeq = (window.__palaceCueSeq || 0) + 1);
    cueToggle.setAttribute('aria-controls', focusCardCue.id);
    cueToggle.style.cssText += 'margin-top:10px;background:#253652;border-radius:10px;font-size:0.75rem;';
    focusCard.appendChild(cueToggle);
    var beginWalkBtn = mkBtn(_tr(t, 'memory_palace.begin_walk', 'Begin walk'), _tr(t, 'memory_palace.begin_walk', 'Begin walk'), function () {
      if (palace.route.length < 2) return;
      goTo(1); renderer.domElement.focus();
    });
    beginWalkBtn.setAttribute('data-palace-action', 'begin-walk');
    beginWalkBtn.style.cssText += 'margin-top:12px;background:#6366f1;border-color:#c4b5fd;border-radius:10px;color:#fff;';
    focusCard.appendChild(beginWalkBtn);
    var roomBadge = document.createElement('span');
    roomBadge.hidden = true;
    roomBadge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:min(34vw,160px);padding:5px 9px;border:1px solid #475569;border-radius:999px;background:#172033;color:#f8fafc;font-size:0.75rem;font-weight:900;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;';
    roomBadgeDot = document.createElement('span');
    roomBadgeDot.setAttribute('aria-hidden', 'true');
    roomBadgeDot.style.cssText = 'width:8px;height:8px;border-radius:999px;flex:0 0 auto;background:#64748b;';
    roomBadgeText = document.createElement('span');
    roomBadgeText.style.cssText = 'min-width:0;overflow:hidden;text-overflow:ellipsis;';
    roomBadge.appendChild(roomBadgeDot); roomBadge.appendChild(roomBadgeText);
    var progressWrap = document.createElement('span');
    progressWrap.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:3px;min-width:82px;max-width:26vw;flex:0 1 auto;';
    var progressTrack = document.createElement('span');
    progressTrack.setAttribute('aria-hidden', 'true');
    progressTrack.style.cssText = 'display:block;width:100%;min-width:76px;height:4px;overflow:hidden;border-radius:999px;background:#334155;';
    var progressFill = document.createElement('span');
    progressFill.style.cssText = 'display:block;width:0%;height:100%;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#818cf8);transition:width 180ms ease;';
    progressTrack.appendChild(progressFill);
    var progress = document.createElement('span');
    progress.style.cssText = 'font-size:0.75rem;font-weight:800;min-width:76px;flex:0 1 auto;line-height:1.2;text-align:center;';
    progressWrap.appendChild(progressTrack); progressWrap.appendChild(progress);
    var nextBtn = mkBtn('▶', _tr(t, 'memory_palace.next', 'Next locus'), function () { goTo(curIdx + 1); });
    nextBtn.setAttribute('data-palace-action', 'next'); setPalaceIcon(nextBtn,'next');
    var ovBtn = mkBtn('🗺', _tr(t, 'memory_palace.overview', 'Overview'), function () {
      overview = !overview;
      if (overview) { freeMode = false; moveF = 0; moveR = 0; _updateFreeCue(-1, null); }
      if (overview) { applyOverview(); if (reduce) { camPos.copy(camPosT); look.copy(lookT); } } else { goTo(curIdx, true); }
    });
    ovBtn.setAttribute('data-palace-action', 'overview'); setPalaceIcon(ovBtn,'map');
    var inspectRoomBtn = mkBtn(_tr(t, 'memory_palace.room_view', 'Room'), _tr(t, 'memory_palace.inspect_room', 'Explore the current room'), inspectRoom);
    inspectRoomBtn.setAttribute('data-palace-action', 'inspect-room');
    inspectRoomBtn.setAttribute('aria-keyshortcuts', 'R');
    inspectRoomBtn.hidden = recall;
    inspectRoomBtn.disabled = palace.rooms.length < 2;
    var routeVisible = false;
    var routePanel = buildRouteDom(palace, t, true, recall, decor, function (index) {
      goTo(index);
      setRouteVisible(false, true);
    });
    routePanel.id = 'palace-route-panel-' + (window.__palaceRouteSeq = (window.__palaceRouteSeq || 0) + 1);
    routePanel.hidden = true;
    routePanel.style.cssText = 'position:absolute;right:12px;top:12px;bottom:78px;z-index:7;width:min(360px,calc(100% - 24px));max-height:calc(100% - 24px);color:#e2e8f0;padding:14px 18px;overflow:auto;background:rgba(2,6,23,0.94);border:1px solid #475569;border-radius:12px;box-sizing:border-box;';
    routePanel.setAttribute('role', 'region');
    routePanel.setAttribute('aria-label', _tr(t, 'memory_palace.route_title', 'Palace route'));
    routePanel.setAttribute('data-palace-overlay', 'route');
    state.routePanel = routePanel;        // so a rewritten mnemonic can retext its row
    holder.appendChild(routePanel);
    helpPanel = document.createElement('section');
    helpPanel.id = 'palace-help-panel-' + (window.__palaceHelpSeq = (window.__palaceHelpSeq || 0) + 1);
    helpPanel.hidden = true;
    helpPanel.tabIndex = -1;
    helpPanel.setAttribute('role', 'region');
    helpPanel.setAttribute('data-palace-overlay', 'help');
    helpPanel.setAttribute('aria-label', _tr(t, 'memory_palace.help_title', 'How to explore the memory palace'));
    helpPanel.style.cssText = 'position:absolute;right:12px;top:12px;bottom:78px;z-index:7;width:min(380px,calc(100% - 24px));max-height:calc(100% - 24px);color:#f8fafc;padding:14px 16px;overflow:auto;background:linear-gradient(150deg,rgba(30,41,59,0.97),rgba(2,6,23,0.97));border:1px solid #818cf8;border-radius:16px;box-sizing:border-box;box-shadow:0 18px 44px rgba(2,6,23,0.46);';
    var helpHeader = document.createElement('div');
    helpHeader.style.cssText = 'display:flex;align-items:center;gap:10px;';
    var helpTitle = document.createElement('div');
    helpTitle.textContent = _tr(t, 'memory_palace.help_title', 'How to explore');
    helpTitle.style.cssText = 'min-width:0;flex:1;font-size:1rem;font-weight:950;line-height:1.2;';
    helpHeader.appendChild(helpTitle);
    helpCloseBtn = document.createElement('button');
    helpCloseBtn.type = 'button'; helpCloseBtn.textContent = '×';
    helpCloseBtn.setAttribute('aria-label', _tr(t, 'common.close', 'Close help'));
    helpCloseBtn.style.cssText = 'min-width:44px;min-height:44px;border:1px solid #64748b;border-radius:999px;background:#0f172a;color:#fff;font-size:1.25rem;font-weight:900;cursor:pointer;';
    helpHeader.appendChild(helpCloseBtn); helpPanel.appendChild(helpHeader);
    var helpIntro = document.createElement('p');
    helpIntro.textContent = _tr(t, 'memory_palace.help_intro', 'Choose the guided route for ordered practice, or walk freely when you want to inspect a room.');
    helpIntro.style.cssText = 'margin:8px 0 12px;color:#cbd5e1;font-size:0.8125rem;font-weight:700;line-height:1.45;';
    helpPanel.appendChild(helpIntro);
    var helpGrid = document.createElement('div');
    helpGrid.style.cssText = 'display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px 10px;align-items:start;font-size:0.75rem;line-height:1.35;';
    [
      ['◀ ▶', _tr(t, 'memory_palace.help_route', 'Previous or next guided locus')],
      ['W A S D', _tr(t, 'memory_palace.help_walk', 'Walk freely; walls guide you through doorways')],
      ['Drag', _tr(t, 'memory_palace.help_look', 'Look around from your current position')],
      ['Home / End', _tr(t, 'memory_palace.help_ends', 'Jump to the entrance or final locus')],
      ['O', _tr(t, 'memory_palace.help_overview', 'Toggle the overview map')],
      ['R', _tr(t, 'memory_palace.help_room', 'Open Room to inspect the space. Use its step and turn buttons, then resume your stop.')],
      ['+  −  0', _tr(t, 'memory_palace.help_zoom', 'Zoom in, zoom out, or reset the view')]
    ].forEach(function (row) {
      var keys = document.createElement('kbd'); keys.textContent = row[0];
      keys.style.cssText = 'min-height:26px;padding:4px 7px;border:1px solid #64748b;border-radius:7px;background:#0f172a;color:#e0e7ff;font-family:ui-monospace,monospace;font-weight:900;text-align:center;white-space:nowrap;';
      var desc = document.createElement('span'); desc.textContent = row[1]; desc.style.cssText = 'padding-top:4px;color:#e2e8f0;font-weight:750;';
      helpGrid.appendChild(keys); helpGrid.appendChild(desc);
    });
    helpPanel.appendChild(helpGrid);
    var practiceHeading = document.createElement('h3');
    practiceHeading.textContent = _tr(t, 'memory_palace.practice_heading', 'Make each stop memorable');
    practiceHeading.style.cssText = 'font-size:0.95rem;margin:20px 0 10px;color:#ddd6fe;'; helpPanel.appendChild(practiceHeading);
    [
      ['place', '1 · Notice the place', 'Notice a doorway, shape or direction. Keep the same route each time.'],
      ['picture', '2 · Connect your idea', 'Invent an unusual action at this spot. A sound, feeling or short sentence can work too.'],
      ['retrieve', '3 · Recall, then check', 'Look away and retrieve the idea before checking your cue. Use Recall practice when you are ready.']
    ].forEach(function (step) {
      var p = document.createElement('p'); p.style.cssText = 'font-size:0.8125rem;line-height:1.6;color:#cbd5e1;';
      var strong = document.createElement('strong'); strong.style.color = '#f8fafc'; strong.textContent = _tr(t, 'memory_palace.practice_' + step[0] + '_title', step[1]);
      p.appendChild(strong); p.appendChild(document.createElement('br')); p.appendChild(document.createTextNode(_tr(t, 'memory_palace.practice_' + step[0], step[2]))); helpPanel.appendChild(p);
    });
    holder.appendChild(helpPanel);
    holder.appendChild(focusCard);
    completionCard = document.createElement('section');
    completionCard.hidden = true;
    completionCard.setAttribute('role', 'region');
    completionCard.setAttribute('aria-label', _tr(t, 'memory_palace.complete_card', 'Route complete'));
    completionCard.setAttribute('data-palace-overlay', 'completion');
    completionCard.style.cssText = 'position:absolute;left:50%;bottom:calc(max(92px,env(safe-area-inset-bottom,92px)) + 10px);transform:translateX(-50%);z-index:7;width:min(430px,calc(100% - 24px));box-sizing:border-box;padding:13px 15px 14px;border:1px solid #a5b4fc;border-radius:16px;background:linear-gradient(145deg,rgba(30,27,75,0.97),rgba(2,6,23,0.96));color:#f8fafc;box-shadow:0 16px 42px rgba(2,6,23,0.45),0 0 0 1px rgba(129,140,248,0.18);';
    var completionKicker = document.createElement('div');
    completionKicker.textContent = _tr(t, 'memory_palace.complete_kicker', 'Journey milestone');
    completionKicker.style.cssText = 'color:#c4b5fd;font-size:clamp(0.625rem,1.5vw,0.75rem);font-weight:900;letter-spacing:0.08em;line-height:1.2;text-transform:uppercase;';
    completionCard.appendChild(completionKicker);
    completionCardTitle = document.createElement('div');
    completionCardTitle.style.cssText = 'margin-top:4px;color:#ffffff;font-size:clamp(1.05rem,2.5vw,1.35rem);font-weight:950;line-height:1.16;';
    completionCard.appendChild(completionCardTitle);
    completionCardMeta = document.createElement('div');
    completionCardMeta.style.cssText = 'margin-top:5px;color:#e2e8f0;font-size:clamp(0.6875rem,1.7vw,0.8125rem);font-weight:750;line-height:1.35;overflow-wrap:anywhere;';
    completionCard.appendChild(completionCardMeta);
    var completionActions = document.createElement('div');
    completionActions.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:11px;';
    completionWalkBtn = document.createElement('button');
    completionWalkBtn.type = 'button';
    completionWalkBtn.textContent = _tr(t, 'memory_palace.complete_walk_again', 'Walk again');
    completionWalkBtn.setAttribute('aria-label', _tr(t, 'memory_palace.complete_walk_again', 'Walk again'));
    completionWalkBtn.style.cssText = 'min-height:44px;padding:9px 12px;border:1px solid #a5b4fc;border-radius:999px;background:#6366f1;color:#ffffff;font-size:clamp(0.6875rem,1.6vw,0.8125rem);font-weight:900;cursor:pointer;';
    completionWalkBtn.onclick = function () { visitedStops = Object.create(null); completionCardDismissed = false; goTo(0); try { renderer.domElement.focus(); } catch (e) {} };
    completionActions.appendChild(completionWalkBtn);
    var visitRemainingBtn = mkBtn('', '', function () {
      for (var remainingIdx = 1; remainingIdx < palace.route.length; remainingIdx++) {
        if (!visitedStops[palace.route[remainingIdx]]) { goTo(remainingIdx); renderer.domElement.focus(); break; }
      }
    });
    visitRemainingBtn.hidden = true;
    visitRemainingBtn.setAttribute('data-palace-action', 'visit-remaining');
    visitRemainingBtn.style.cssText += 'border-color:#86efac;background:#14532d;color:#fff;';
    completionActions.appendChild(visitRemainingBtn);
    completionOverviewBtn = document.createElement('button');
    completionOverviewBtn.type = 'button';
    completionOverviewBtn.textContent = _tr(t, 'memory_palace.complete_overview', 'Review overview');
    completionOverviewBtn.setAttribute('aria-label', _tr(t, 'memory_palace.complete_overview', 'Review overview'));
    completionOverviewBtn.style.cssText = 'min-height:44px;padding:9px 12px;border:1px solid #64748b;border-radius:999px;background:#1e293b;color:#f8fafc;font-size:clamp(0.6875rem,1.6vw,0.8125rem);font-weight:900;cursor:pointer;';
    completionOverviewBtn.onclick = function () {
      completionCardDismissed = true;
      if (routeVisible) setRouteVisible(false, false);
      overview = true;
      applyOverview();
      if (reduce) { camPos.copy(camPosT); look.copy(lookT); }
      updateHud();
    };
    completionActions.appendChild(completionOverviewBtn);
    completionCardDismiss = document.createElement('button');
    completionCardDismiss.type = 'button';
    completionCardDismiss.textContent = '\u00d7';
    completionCardDismiss.setAttribute('aria-label', _tr(t, 'memory_palace.complete_dismiss', 'Dismiss completion message'));
    completionCardDismiss.title = _tr(t, 'memory_palace.complete_dismiss', 'Dismiss completion message');
    completionCardDismiss.style.cssText = 'min-width:44px;min-height:44px;margin-left:auto;padding:5px 9px;border:1px solid #475569;border-radius:999px;background:transparent;color:#cbd5e1;font-size:1.05rem;font-weight:900;cursor:pointer;';
    completionCardDismiss.onclick = function () { completionCardDismissed = true; _setCompletionCardState(); };
    completionActions.appendChild(completionCardDismiss);
    completionCard.appendChild(completionActions);
    holder.appendChild(completionCard);
    journeyMap = document.createElement('section');
    journeyMap.hidden = true;
    journeyMap.setAttribute('role', 'region');
    journeyMap.setAttribute('aria-label', _tr(t, 'memory_palace.journey_map', 'Visual journey map'));
    journeyMap.setAttribute('data-palace-overlay', 'journey');
    journeyMap.style.cssText = 'position:absolute;right:12px;top:12px;z-index:6;width:min(380px,calc(100% - 24px));height:max-content;max-height:calc(100% - var(--palace-dock-height,70px) - 42px);overflow:auto;scrollbar-width:thin;scrollbar-color:#64748b #101b30;box-sizing:border-box;background:rgba(2,6,23,0.94);color:#f8fafc;border:1px solid #475569;border-radius:14px;padding:12px 14px;box-shadow:0 12px 30px rgba(2,6,23,0.34);';
    journeyMapTitle = document.createElement('div');
    journeyMapTitle.textContent = _tr(t, 'memory_palace.journey_map', 'Visual journey map');
    journeyMapTitle.style.cssText = 'font-size:0.95rem;font-weight:750;letter-spacing:0.01em;';
    journeyMap.appendChild(journeyMapTitle);
    journeyMapMeta = document.createElement('div');
    journeyMapMeta.setAttribute('role', 'status');
    journeyMapMeta.style.cssText = 'margin-top:3px;color:#cbd5e1;font-size:0.6875rem;font-weight:700;line-height:1.3;';
    journeyMap.appendChild(journeyMapMeta);
    var journeyMapBody = document.createElement('div');
    journeyMapBody.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:10px;';
    var journeyGroups = {};
    palace.route.forEach(function (id, index) {
      if (index === 0) return;
      var locus = locusById(palace, id);
      if (!locus) return;
      var roomIdx = typeof locus.roomIdx === 'number' ? locus.roomIdx : 0;
      if (!journeyGroups[roomIdx]) journeyGroups[roomIdx] = { room: palace.rooms[roomIdx], stops: [] };
      journeyGroups[roomIdx].stops.push({ id: id, index: index, locus: locus });
    });
    Object.keys(journeyGroups).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (key) {
      var bucket = journeyGroups[key], room = bucket.room || {};
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:9px;min-width:0;padding:12px;border:1px solid #334155;border-left:3px solid ' + (room.color || '#818cf8') + ';border-radius:12px;background:#111e33;';
      var roomName = document.createElement('span');
      roomName.textContent = room.label || _tr(t, 'memory_palace.hub', 'Hub plaza');
      roomName.title = roomName.textContent;
      roomName.style.cssText = 'min-width:0;overflow-wrap:anywhere;color:#e2e8f0;font-size:0.8125rem;font-weight:900;';
      var roomHeading=document.createElement('div');roomHeading.style.cssText='display:flex;align-items:center;gap:9px;min-width:0;';
      var emblem=document.createElement('span');emblem.style.cssText='display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid '+(room.color||'#818cf8')+';border-radius:9px;flex:none;color:'+(room.color||'#c4b5fd')+';background:#0b1729;';
      emblem.appendChild(palaceIcon(['orbit','diamond','weave','facet'][(Number(key)-1+4)%4],20));roomHeading.appendChild(emblem);
      var headingText=document.createElement('div');headingText.style.cssText='min-width:0;flex:1;';headingText.appendChild(roomName);
      var roomCount=document.createElement('div');roomCount.textContent=bucket.stops.length===1?_tr(t,'memory_palace.room_stop_one','1 stop'):_tr(t,'memory_palace.room_stop_count','{count} stops').replace('{count}',String(bucket.stops.length));
      roomCount.style.cssText='margin-top:2px;color:#a5b4ca;font-size:0.6875rem;font-weight:500;';headingText.appendChild(roomCount);roomHeading.appendChild(headingText);row.appendChild(roomHeading);
      var stopRail = document.createElement('div');
      stopRail.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:5px;min-width:0;';
      bucket.stops.forEach(function (stop) {
        var color = room.color || '#818cf8';
        var button = document.createElement('button');
        button.type = 'button';
        var numberChip=document.createElement('span');numberChip.textContent=String(stop.index).padStart(2,'0');
        numberChip.setAttribute('aria-hidden','true');numberChip.style.cssText='display:flex;align-items:center;justify-content:center;width:28px;min-height:28px;border-radius:7px;background:#25334b;font-size:0.75rem;font-weight:750;font-variant-numeric:tabular-nums;';
        var stopText=document.createElement('span');stopText.textContent=stop.locus.label||'';
        stopText.style.cssText='min-width:0;white-space:normal;overflow-wrap:anywhere;';button.appendChild(numberChip);button.appendChild(stopText);
        button.setAttribute('data-journey-index', String(stop.index));
        button.setAttribute('aria-label', _tr(t, 'memory_palace.journey_map_stop', 'Go to stop {index}: {label}').replace('{index}', String(stop.index)).replace('{label}', stop.locus.label || ''));
        button.title = stop.locus.label || ('Stop ' + stop.index);
        button.style.cssText = 'display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:9px;min-width:44px;min-height:44px;max-width:100%;padding:7px 9px;text-align:left;border:1px solid ' + color + ';border-radius:10px;background:#0f172a;color:#f8fafc;font-size:0.75rem;font-weight:800;line-height:1.3;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease,background-color 160ms ease;';
        button.onclick = function () { goTo(stop.index); };
        stopRail.appendChild(button);
        journeyMapStops.push({ index: stop.index, button: button, color: color, number: numberChip });
      });
      row.appendChild(stopRail);
      journeyMapBody.appendChild(row);
    });
    journeyMap.appendChild(journeyMapBody);
    if (palace.roomLinks && palace.roomLinks.length) {
      var connectionHeading = document.createElement('div');
      connectionHeading.textContent = _tr(t, 'memory_palace.connections', 'Connections');
      connectionHeading.style.cssText = 'margin-top:13px;padding-top:9px;border-top:1px solid #334155;color:#e2e8f0;font-size:0.6875rem;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;';
      journeyMap.appendChild(connectionHeading);
      var connectionHint = document.createElement('div');
      connectionHint.textContent = _tr(t, 'memory_palace.connections_hint', 'Select a thread to highlight both rooms, then jump to either concept.');
      connectionHint.style.cssText = 'margin-top:3px;color:#94a3b8;font-size:0.625rem;font-weight:700;line-height:1.35;';
      journeyMap.appendChild(connectionHint);
      var connectionBody = document.createElement('div');
      connectionBody.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:8px;';
      palace.roomLinks.forEach(function (link, linkIdx) {
        var fromRoom = palace.rooms[link.fromRoomIdx] || {};
        var toRoom = palace.rooms[link.toRoomIdx] || {};
        var fromLabel = fromRoom.label || _tr(t, 'memory_palace.hub', 'Hub plaza');
        var toLabel = toRoom.label || _tr(t, 'memory_palace.hub', 'Hub plaza');
        var color = fromRoom.color || '#818cf8';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:stretch;gap:5px;min-width:0;';
        var focusButton = document.createElement('button');
        focusButton.type = 'button';
        focusButton.textContent = fromLabel + ' → ' + toLabel + (link.label ? ' · ' + link.label : '');
        focusButton.setAttribute('aria-pressed', 'false');
        focusButton.setAttribute('aria-label', _tr(t, 'memory_palace.focus_connection', 'Focus connection from {from} to {to}').replace('{from}', fromLabel).replace('{to}', toLabel));
        focusButton.title = link.label ? link.label : (fromLabel + ' → ' + toLabel);
        focusButton.style.cssText = 'min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;border:1px solid ' + color + ';border-radius:8px;background:#0f172a;color:#f8fafc;padding:7px 8px;font-size:0.625rem;font-weight:900;line-height:1.2;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease,background-color 160ms ease;';
        focusButton.onclick = function () { _focusCrossLink(linkIdx); };
        row.appendChild(focusButton);
        var actionBody = document.createElement('div');
        actionBody.style.cssText = 'display:flex;gap:4px;flex:0 0 auto;';
        function addConnectionJump(label, roomIdx, roomLabel) {
          var jumpButton = document.createElement('button');
          jumpButton.type = 'button';
          jumpButton.textContent = label;
          jumpButton.setAttribute('aria-label', _tr(t, 'memory_palace.jump_connection', 'Jump to {room}').replace('{room}', roomLabel));
          jumpButton.title = _tr(t, 'memory_palace.jump_connection', 'Jump to {room}').replace('{room}', roomLabel);
          jumpButton.style.cssText = 'min-width:44px;min-height:44px;padding:5px 6px;border:1px solid #475569;border-radius:8px;background:#1e293b;color:#e2e8f0;font-size:0.5625rem;font-weight:900;cursor:pointer;';
          jumpButton.onclick = function (event) { event.stopPropagation(); _jumpToRoom(roomIdx); };
          actionBody.appendChild(jumpButton);
        }
        addConnectionJump('From', link.fromRoomIdx, fromLabel);
        addConnectionJump('To', link.toRoomIdx, toLabel);
        row.appendChild(actionBody);
        connectionBody.appendChild(row);
        journeyMapLinks.push({ index: linkIdx, button: focusButton, color: color });
      });
      journeyMap.appendChild(connectionBody);
    }
    holder.appendChild(journeyMap);
    if (!recall && opts.mastery && typeof opts.mastery === 'object') {
      masteryLegend = document.createElement('div');
      masteryLegend.hidden = true;
      masteryLegend.setAttribute('role', 'group');
      masteryLegend.setAttribute('aria-label', _tr(t, 'memory_palace.mastery_legend', 'Memory strength'));
      masteryLegend.setAttribute('data-palace-overlay', 'mastery');
      masteryLegend.style.cssText = 'position:absolute;left:12px;top:56px;z-index:6;max-width:calc(100% - 24px);display:flex;align-items:center;flex-wrap:wrap;gap:5px 7px;background:rgba(2,6,23,0.9);color:#f8fafc;border:1px solid #475569;border-radius:10px;padding:6px 8px;font-size:0.6875rem;font-weight:800;line-height:1.25;pointer-events:none;box-shadow:0 8px 24px rgba(2,6,23,0.28);';
      var masteryLegendTitle = document.createElement('span');
      masteryLegendTitle.textContent = _tr(t, 'memory_palace.mastery_legend', 'Memory strength') + ':';
      masteryLegendTitle.style.cssText = 'font-weight:900;color:#e2e8f0;';
      masteryLegend.appendChild(masteryLegendTitle);
      function _appendMasteryChip(symbol, color, label) {
        var chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:3px;white-space:nowrap;';
        var mark = document.createElement('span');
        mark.textContent = symbol;
        mark.setAttribute('aria-hidden', 'true');
        mark.style.cssText = 'font-size:14px;line-height:1;color:' + color + ';';
        var text = document.createElement('span');
        text.textContent = label;
        chip.appendChild(mark); chip.appendChild(text); masteryLegend.appendChild(chip);
      }
      _appendMasteryChip('\u25cf', '#f87171', _tr(t, 'memory_palace.mastery_needs_practice', 'Needs practice'));
      _appendMasteryChip('\u25d0', '#fbbf24', _tr(t, 'memory_palace.mastery_developing', 'Developing'));
      _appendMasteryChip('\u2713', '#4ade80', _tr(t, 'memory_palace.mastery_strong', 'Strong'));
      _appendMasteryChip('\u25a6', '#cbd5e1', _tr(t, 'memory_palace.mastery_room_average', 'Room tint = average'));
      masteryLegendCurrent = document.createElement('span');
      masteryLegendCurrent.hidden = true;
      masteryLegendCurrent.style.cssText = 'margin-left:2px;border-left:1px solid #64748b;padding-left:7px;color:#f8fafc;white-space:nowrap;';
      masteryLegend.appendChild(masteryLegendCurrent);
      holder.appendChild(masteryLegend);
    }
    var _dockResizeObserver = null;
    function _syncDockLayout() {
      try {
        if (!hud || !routePanel) return;
        var bounds = holder.getBoundingClientRect();
        var compact = bounds.width < 640 || bounds.height < 460;
        holder.setAttribute('data-palace-layout', compact ? 'compact' : 'wide');
        holder.setAttribute('data-memory-palace-viewport', 'true');
        hud.style.width = compact ? 'calc(100% - 16px)' : 'max-content';
        hud.style.maxWidth = compact ? 'calc(100% - 16px)' : 'calc(100% - 24px)';
        hud.style.borderRadius = compact ? '16px' : '20px';
        hud.style.padding = compact ? '7px 8px' : '6px 10px';
        var hudHeight = Math.ceil(hud.getBoundingClientRect().height || 0);
        var overlayBottom = Math.max(70, hudHeight + 22);
        holder.style.setProperty('--palace-dock-height', hudHeight + 'px');
        if (holder.parentElement) holder.parentElement.style.setProperty('--palace-dock-height', hudHeight + 'px');
        if (holder.parentElement && holder.parentElement.parentElement) holder.parentElement.parentElement.style.setProperty('--palace-dock-height', hudHeight + 'px');
        [routePanel, helpPanel].forEach(function (panel) {
          if (!panel) return;
          panel.style.bottom = overlayBottom + 'px';
          panel.style.left = compact ? '8px' : '';
          panel.style.right = compact ? '8px' : '12px';
          panel.style.top = compact ? '8px' : '12px';
          panel.style.width = compact ? 'auto' : (panel === helpPanel ? 'min(380px,calc(100% - 24px))' : 'min(360px,calc(100% - 24px))');
          panel.style.maxHeight = 'calc(100% - ' + (overlayBottom + (compact ? 16 : 24)) + 'px)';
        });
        if (journeyMap) journeyMap.style.bottom = overlayBottom + 'px';
        if (freeNavCue) freeNavCue.style.bottom = overlayBottom + 'px';
        if (completionCard) completionCard.style.bottom = (overlayBottom + 8) + 'px';
        var hintVisible = ctrlHint && parseFloat(ctrlHint.style.opacity || '1') > 0.05;
        var statusTop = 12 + (hintVisible ? Math.ceil(ctrlHint.getBoundingClientRect().height || 0) + 8 : 0);
        if (focusCard) {
          focusCard.style.top = statusTop + 'px';
          focusCard.style.maxHeight = Math.max(80, bounds.height - statusTop - overlayBottom - 20) + 'px';
        }
        if (masteryLegend) {
          var focusHeight = focusCard && !focusCard.hidden ? Math.ceil(focusCard.getBoundingClientRect().height || 0) + 8 : 0;
          masteryLegend.style.top = Math.max(56, statusTop + focusHeight) + 'px';
        }
      } catch (e) {}
    }
    function _updateZoomControls() {
      var percent = Math.round(58 / Math.max(1, camera.fov) * 100);
      if (zoomValue) { zoomValue.textContent = percent + '%'; zoomValue.setAttribute('aria-label', _tr(t, 'memory_palace.zoom_current', 'Current zoom: {percent}%').replace('{percent}', String(percent))); }
      if (zoomOutBtn) zoomOutBtn.disabled = camera.fov >= 78;
      if (zoomInBtn) zoomInBtn.disabled = camera.fov <= 22;
    }
    function _setCameraFov(nextFov, announceZoom) {
      camera.fov = Math.max(22, Math.min(78, Number(nextFov) || 58));
      camera.updateProjectionMatrix();
      _updateZoomControls();
      if (announceZoom && live) live.textContent = _tr(t, 'memory_palace.zoom_changed', 'Zoom {percent}%').replace('{percent}', String(Math.round(58 / camera.fov * 100)));
    }
    function _resetView() {
      yawOff = 0; pitchOff = 0; freePitch = 0;
      _setCameraFov(58, true);
    }
    function _setHelpVisible(visible, moveFocus) {
      helpVisible = !!visible;
      if (helpVisible) stopWalking();
      if (helpVisible && routeVisible) {
        routeVisible = false; routePanel.hidden = true;
        routeBtn.setAttribute('aria-pressed', 'false'); routeBtn.setAttribute('aria-expanded', 'false');
      }
      if (helpPanel) helpPanel.hidden = !helpVisible;
      if (helpBtn) { helpBtn.setAttribute('aria-pressed', helpVisible ? 'true' : 'false'); helpBtn.setAttribute('aria-expanded', helpVisible ? 'true' : 'false'); }
      if (helpVisible) _hideCtrlHint();
      updateHud();
      if (moveFocus) {
        if (helpVisible && helpCloseBtn) helpCloseBtn.focus();
        else if (helpBtn) helpBtn.focus();
      }
      if (live) live.textContent = helpVisible ? _tr(t, 'memory_palace.help_opened', 'Exploration help opened.') : _tr(t, 'memory_palace.help_closed', 'Exploration help closed.');
    }
    function onHelpKeyDown(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); _setHelpVisible(false, true);
    }
    function setRouteVisible(visible, moveFocus) {
      routeVisible = !!visible;
      if (routeVisible) stopWalking();
      if (routeVisible && helpVisible) {
        helpVisible = false; if (helpPanel) helpPanel.hidden = true;
        if (helpBtn) { helpBtn.setAttribute('aria-pressed', 'false'); helpBtn.setAttribute('aria-expanded', 'false'); }
      }
      routePanel.hidden = !routeVisible;
      routeBtn.setAttribute('aria-pressed', routeVisible ? 'true' : 'false');
      routeBtn.setAttribute('aria-expanded', routeVisible ? 'true' : 'false');
      updateHud();
      if (moveFocus) {
        if (routeVisible) {
          var currentRouteButton = routePanel.querySelector('[aria-current="step"]') || routePanel.querySelector('[data-route-index]');
          if (currentRouteButton) currentRouteButton.focus();
        } else {
          routeBtn.focus();
        }
      }
      live.textContent = routeVisible ? _tr(t, 'memory_palace.route_shown', 'Walking route shown. Current stop focused.') : _tr(t, 'memory_palace.route_hidden', 'Walking route hidden.');
    }
    var routeBtn = mkBtn('Route', _tr(t, 'memory_palace.route_title', 'Palace route'), function () {
      setRouteVisible(!routeVisible, true);
    });
    routeBtn.setAttribute('data-palace-action', 'route');
    routeBtn.setAttribute('aria-pressed', 'false');
    routeBtn.setAttribute('aria-expanded', 'false');
    function onRouteKeyDown(e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setRouteVisible(false, true);
    }
    routePanel.addEventListener('keydown', onRouteKeyDown);
    var overviewClick = ovBtn.onclick;
    ovBtn.onclick = function () { overviewClick(); updateHud(); };
    routeBtn.setAttribute('aria-controls', routePanel.id);
    zoomOutBtn = mkBtn('−', _tr(t, 'memory_palace.zoom_out', 'Zoom out'), function () { _setCameraFov(camera.fov + 4, true); });
    zoomOutBtn.setAttribute('data-palace-action', 'zoom-out');
    zoomValue = document.createElement('span');
    zoomValue.setAttribute('data-palace-zoom-value', 'true');
    zoomValue.style.cssText = 'min-width:48px;padding:0 3px;text-align:center;color:#e0e7ff;font-size:0.6875rem;font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums;';
    zoomInBtn = mkBtn('+', _tr(t, 'memory_palace.zoom_in', 'Zoom in'), function () { _setCameraFov(camera.fov - 4, true); });
    zoomInBtn.setAttribute('data-palace-action', 'zoom-in');
    resetViewBtn = mkBtn('⌂', _tr(t, 'memory_palace.reset_view', 'Reset view and zoom'), _resetView);
    resetViewBtn.setAttribute('data-palace-action', 'reset-view'); setPalaceIcon(resetViewBtn,'home');
    helpBtn = mkBtn('?', _tr(t, 'memory_palace.help_title', 'How to explore the memory palace'), function () { _setHelpVisible(!helpVisible, true); });
    helpBtn.setAttribute('data-palace-action', 'help');
    helpBtn.setAttribute('aria-controls', helpPanel.id); helpBtn.setAttribute('aria-pressed', 'false'); helpBtn.setAttribute('aria-expanded', 'false');
    helpCloseBtn.onclick = function () { _setHelpVisible(false, true); };
    helpPanel.addEventListener('keydown', onHelpKeyDown);
    hud.appendChild(prevBtn); hud.appendChild(roomBadge); hud.appendChild(progressWrap); hud.appendChild(nextBtn); hud.appendChild(inspectRoomBtn); hud.appendChild(ovBtn); hud.appendChild(routeBtn);
    hud.appendChild(zoomOutBtn); hud.appendChild(zoomValue); hud.appendChild(zoomInBtn); hud.appendChild(resetViewBtn); hud.appendChild(helpBtn);
    holder.appendChild(hud);
    _updateZoomControls();
    function updateHud() {
      var totalStops = Math.max(0, palace.route.length - 1);
      var progressRatio = totalStops ? Math.max(0, Math.min(1, curIdx / totalStops)) : 1;
      progressFill.style.width = Math.round(progressRatio * 1000) / 10 + '%';
      progress.textContent = curIdx === 0
        ? _tr(t, 'memory_palace.progress_entrance', 'Entrance')
        : _tr(t, 'memory_palace.progress_count', '{current} of {total}').replace('{current}', String(curIdx)).replace('{total}', String(totalStops));
      progress.setAttribute('aria-label', curIdx === 0
        ? _tr(t, 'memory_palace.progress_entrance_aria', 'Palace entrance. {total} loci.').replace('{total}', String(totalStops))
        : _tr(t, 'memory_palace.progress_locus_aria', 'Locus {current} of {total}').replace('{current}', String(curIdx)).replace('{total}', String(totalStops)));
      ovBtn.setAttribute('aria-pressed', overview ? 'true' : 'false');
      if (inspectRoomBtn) inspectRoomBtn.disabled = buildMode || state.xrActive || palace.rooms.length < 2;
      prevBtn.disabled = curIdx <= 0; nextBtn.disabled = curIdx >= palace.route.length - 1;
      Array.prototype.forEach.call(routePanel.querySelectorAll('[data-route-index]'), function (button) {
        if (Number(button.getAttribute('data-route-index')) === curIdx) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.style.backgroundColor = button.hasAttribute('aria-current') ? '#3730a3' : '#1e293b';
        button.style.borderColor = button.hasAttribute('aria-current') ? '#a5b4fc' : '#475569';
      });
      prevBtn.style.opacity = prevBtn.disabled ? 0.4 : 1; nextBtn.style.opacity = nextBtn.disabled ? 0.4 : 1;
      _setMasteryLegendState();
      _setRoomHeatmapState();
      _setRoomBadgeState();
      _setFocusCardState();
      _setCompletionCardState();
      _setJourneyMapState();
      _setNextStopBeaconState();
      _syncDockLayout();
    }
    updateHud();

    // ── Input: keyboard walk + drag look-around + click a frame ──
    var el = renderer.domElement;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'region');
    el.setAttribute('aria-roledescription', _tr(t, 'memory_palace.canvas_role', 'Memory palace 3D walk'));
    el.setAttribute('aria-label', _tr(t, 'memory_palace.canvas_label', 'Memory palace. Use the left and right arrow keys to walk the route in order.'));
    el.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End O R W A S D + - 0 H');
    var instrId = 'palace-instr-' + (window.__palaceSeq = (window.__palaceSeq || 0) + 1);
    var instr = document.createElement('p'); instr.id = instrId; instr.style.cssText = SR_ONLY;
    instr.textContent = _tr(t, 'memory_palace.canvas_instructions', 'W A S D keys walk you around the palace and dragging looks around. The right and left arrow keys jump to the next or previous locus in order; Home returns to the entrance and End jumps to the last locus. O toggles the overview map. Each stop announces the room, the item, and its mnemonic image.');
    holder.appendChild(instr);
    el.setAttribute('aria-describedby', instrId);
    // Visible control hint (fades after a few seconds) — WASD isn't discoverable otherwise.
    var ctrlHint = document.createElement('div');
    ctrlHint.setAttribute('aria-hidden', 'true');
    ctrlHint.style.cssText = 'position:absolute;left:12px;top:12px;z-index:6;max-width:calc(100% - 24px);box-sizing:border-box;background:rgba(2,6,23,0.82);color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:7px 10px;font-size:0.75rem;line-height:1.35;pointer-events:none;transition:opacity 260ms ease,transform 260ms ease;';
    ctrlHint.textContent = _tr(t, 'memory_palace.controls_hint', 'Room for touch controls · WASD to walk · drag to look');
    holder.appendChild(ctrlHint);
    var ctrlHintTimer = 0;
    function _hideCtrlHint() {
      if (!ctrlHint) return;
      ctrlHint.style.opacity = '0';
      ctrlHint.style.transform = 'translateY(-4px)';
      if (ctrlHintTimer) { try { window.clearTimeout(ctrlHintTimer); } catch (e) {} ctrlHintTimer = 0; }
      _syncDockLayout();
    }
    function _showCtrlHint(duration) {
      if (!ctrlHint) return;
      ctrlHint.style.opacity = '1';
      ctrlHint.style.transform = 'translateY(0)';
      if (ctrlHintTimer) { try { window.clearTimeout(ctrlHintTimer); } catch (e) {} }
      ctrlHintTimer = window.setTimeout(_hideCtrlHint, duration || 6200);
      _syncDockLayout();
    }
    _showCtrlHint(6200);

    // Free-roam orientation cue: keeps room identity visible while the learner
    // leaves the authored rail, without competing with the guided HUD.
    freeNavCue = document.createElement('div');
    freeNavCue.hidden = true;
    freeNavCue.setAttribute('role', 'group');
    freeNavCue.setAttribute('aria-label', _tr(t, 'memory_palace.free_status', 'Free-roam location and route direction'));
    freeNavCue.setAttribute('data-palace-overlay', 'free-nav');
    freeNavCue.style.cssText = 'position:absolute;left:12px;bottom:70px;z-index:7;max-width:calc(100% - 24px);display:flex;align-items:center;gap:8px;background:rgba(2,6,23,0.9);color:#f8fafc;border:1px solid #64748b;border-radius:999px;padding:5px 6px 5px 12px;font-size:0.75rem;font-weight:800;line-height:1.3;pointer-events:auto;box-shadow:0 8px 24px rgba(2,6,23,0.35);';
    freeNavCompass = document.createElement('span');
    freeNavCompass.hidden = true;
    freeNavCompass.setAttribute('aria-hidden', 'true');
    freeNavCompass.title = _tr(t, 'memory_palace.free_compass', 'Direction to the next route stop');
    freeNavCompass.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 auto;border:1px solid rgba(255,255,255,0.4);border-radius:999px;background:rgba(15,23,42,0.72);';
    freeNavCompassArrow = document.createElement('span');
    freeNavCompassArrow.textContent = '\u2191';
    freeNavCompassArrow.style.cssText = 'display:block;color:#f8fafc;font-size:1.05rem;font-weight:900;line-height:1;transition:transform 180ms ease;';
    freeNavCompass.appendChild(freeNavCompassArrow);
    freeNavCue.appendChild(freeNavCompass);
    freeNavText = document.createElement('span');
    freeNavText.style.cssText = 'min-width:0;overflow:hidden;white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.35;overflow-wrap:anywhere;';
    freeNavCue.appendChild(freeNavText);
    freeReturnBtn = document.createElement('button');
    freeReturnBtn.type = 'button';
    freeReturnBtn.textContent = _tr(t, 'memory_palace.resume_stop', 'Resume stop');
    freeReturnBtn.setAttribute('aria-label', _tr(t, 'memory_palace.free_return', 'Return to guided route'));
    freeReturnBtn.title = _tr(t, 'memory_palace.free_return', 'Return to guided route');
    freeReturnBtn.style.cssText = 'border:1px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.12);color:#fff;border-radius:999px;min-width:44px;min-height:44px;padding:6px 10px;font-size:0.875rem;font-weight:900;cursor:pointer;flex:0 0 auto;';
    freeReturnBtn.onclick = function () { goTo(curIdx); renderer.domElement.focus(); };
    freeNavCue.appendChild(freeReturnBtn);
    freeNavCue.style.cssText += 'box-sizing:border-box;width:min(440px,calc(100% - 24px));flex-wrap:wrap;border-radius:16px;padding:8px;';
    freeNavText.style.flex = '1 1 0';
    explorationControls = document.createElement('div');
    explorationControls.hidden = true;
    explorationControls.setAttribute('role', 'group');
    explorationControls.setAttribute('aria-label', _tr(t, 'memory_palace.room_controls', 'Room exploration controls'));
    explorationControls.setAttribute('data-palace-room-controls', 'true');
    explorationControls.style.cssText = 'flex:1 0 100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding-top:5px;border-top:1px solid #334155;';
    [
      ['turn-left', 'Left', 'Turn left', function () { turnInRoom(1); }],
      ['step-forward', 'Forward', 'Step forward', function () { stepInRoom(1); }],
      ['step-back', 'Back', 'Step back', function () { stepInRoom(-1); }],
      ['turn-right', 'Right', 'Turn right', function () { turnInRoom(-1); }]
    ].forEach(function (action) {
      var button = mkBtn(_tr(t, 'memory_palace.control_' + action[0], action[1]), _tr(t, 'memory_palace.control_' + action[0] + '_label', action[2]), action[3]);
      button.setAttribute('data-palace-action', action[0]);
      button.style.cssText = 'min-width:0;min-height:44px;padding:7px 3px;border:1px solid #64748b;border-radius:10px;background:#1e293b;color:#f8fafc;font-size:0.75rem;font-weight:800;line-height:1.25;overflow-wrap:anywhere;cursor:pointer;';
      explorationControls.appendChild(button);
    });
    freeNavCue.appendChild(explorationControls);
    holder.appendChild(freeNavCue);
    freeNavLive = document.createElement('div');
    freeNavLive.style.cssText = SR_ONLY;
    freeNavLive.setAttribute('role', 'status'); freeNavLive.setAttribute('aria-live', 'polite'); freeNavLive.setAttribute('aria-atomic', 'true');
    holder.appendChild(freeNavLive);
    if (typeof window.ResizeObserver === 'function') {
      try {
        _dockResizeObserver = new window.ResizeObserver(_syncDockLayout);
        _dockResizeObserver.observe(holder);
        _dockResizeObserver.observe(hud);
      } catch (eResize) { _dockResizeObserver = null; }
    }
    window.addEventListener('resize', _syncDockLayout);
    _syncDockLayout();

    // ── WebXR: optional "Enter VR" (progressive enhancement) ──
    // The button appears ONLY when the browser reports immersive-vr support (a
    // headset + granted permission — e.g. the standalone deploy opened in a Quest
    // browser). On every other device this whole block is a no-op, so the 2D walk
    // is byte-for-byte unchanged. In VR the headset owns look + real-walk; the
    // desktop walk is fully restored on exit. Comfort constants are on-device tunable.
    var VR_USER_HEIGHT_M = 1.6;                       // real standing eye height (m) — tune on-device
    function _seatUserForVR() {
      xrRig.scale.setScalar(EYE / VR_USER_HEIGHT_M);  // 1 real metre → EYE world-units, so the palace reads room-scale
      xrRig.position.set(0, 0, 0);                    // entry room centre is the world origin; floor at y=0
      xrRig.rotation.set(0, 0, 0);
    }
    function _unseatVR() { xrRig.scale.setScalar(1); xrRig.position.set(0, 0, 0); xrRig.rotation.set(0, 0, 0); }
    function enterVR(btn) {
      if (!navigator.xr) return;
      if (btn) btn.disabled = true;
      navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] })
        .then(function (session) {
          _seatUserForVR();
          freeMode = false;                           // headset owns the view; disable WASD/drag
          state.xrActive = true;
          _setFocusCardState();
          _setCompletionCardState();
          _setGuidedTetherState();
          _setArrivalHaloState();
          if (state.raf) { try { (window.cancelAnimationFrame || function () {})(state.raf); } catch (e) {} state.raf = 0; }
          try { renderer.xr.setReferenceSpaceType('local-floor'); } catch (e) {}
          _xrSetupControllers();                      // Tier 2: thumbstick locomotion + ray-select
          Promise.resolve(renderer.xr.setSession(session)).then(function () { renderer.setAnimationLoop(tick); });
          if (live) live.textContent = _tr(t, 'memory_palace.vr_entered', 'Entered VR. Look around and walk the palace.');
          session.addEventListener('end', function () {
            state.xrActive = false;
            try { _xrHideBank(); } catch (e) {}          // floating answer chips must not linger into the 2D view
            try { renderer.setAnimationLoop(null); } catch (e) {}
            _unseatVR();
            if (btn) btn.disabled = false;
            _setFocusCardState();
            _setCompletionCardState();
            _setGuidedTetherState();
            _setArrivalHaloState();
            if (!state.disposed) { if (state._resumeLoop) state._resumeLoop(); else tick(); }   // resume the 2D window-rAF loop (clears any off-screen pause)
          });
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          if (live) live.textContent = _tr(t, 'memory_palace.vr_failed', 'Could not start VR.');
        });
    }
    state.cleanup.push(function () {
      try { var s = renderer.xr && renderer.xr.getSession && renderer.xr.getSession(); if (s) s.end(); } catch (e) {}
      try { renderer.setAnimationLoop(null); } catch (e) {}
    });
    try {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
          if (!ok || state.disposed) return;
          var vb = document.createElement('button');
          vb.textContent = '🥽 ' + _tr(t, 'memory_palace.enter_vr', 'VR');
          vb.setAttribute('aria-label', _tr(t, 'memory_palace.enter_vr_title', 'Enter VR — stand inside the palace (needs a headset)'));
          vb.title = _tr(t, 'memory_palace.enter_vr_title', 'Enter VR — stand inside the palace (needs a headset)');
          vb.style.cssText = 'border:none;background:#4f46e5;color:#fff;border-radius:999px;padding:6px 13px;font-size:13px;font-weight:800;cursor:pointer;';
          vb.onclick = function () { enterVR(vb); };
          hud.appendChild(vb);
        }).catch(function () {});
      }
    } catch (e) {}
    hud.setAttribute('role', 'toolbar');
    hud.setAttribute('aria-label', _tr(t, 'memory_palace.controls', 'Memory palace route controls'));

    function onKeyDown(e) {
      if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      _hideCtrlHint();
      var k = e.key;
      var lk = (k && k.length === 1) ? k.toLowerCase() : k;
      if (lk === 'w' || lk === 'a' || lk === 's' || lk === 'd') {   // free walk
        e.preventDefault();
        if (lk === 'w') moveF = 1; else if (lk === 's') moveF = -1;
        else if (lk === 'a') moveR = 1; else if (lk === 'd') moveR = -1;   // A = strafe left, D = strafe right
        enterFree();
        return;
      }
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); goTo(curIdx + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); goTo(curIdx - 1); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(palace.route.length - 1); }
      else if (k === 'r' || k === 'R') { e.preventDefault(); inspectRoom(); }
      else if (k === 'o' || k === 'O') { e.preventDefault(); ovBtn.onclick(); }
      else if (k === '+' || k === '=') { e.preventDefault(); _setCameraFov(camera.fov - 4, true); }
      else if (k === '-' || k === '_') { e.preventDefault(); _setCameraFov(camera.fov + 4, true); }
      else if (k === '0') { e.preventDefault(); _resetView(); }
      else if (k === 'h' || k === 'H' || k === '?') { e.preventDefault(); _setHelpVisible(!helpVisible, true); }
    }
    function onKeyUp(e) {
      var lk = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
      if (lk === 'w' || lk === 's') moveF = 0;
      else if (lk === 'a' || lk === 'd') moveR = 0;
    }
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);

    var dragging = false, moved = false, lx = 0, ly = 0;
    var dragPointerId = null;
    function finishDrag() {
      var pointerId = dragPointerId;
      dragging = false; dragPointerId = null;
      el.style.cursor = buildMode ? 'crosshair' : 'grab';
      try { if (pointerId != null && el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId); } catch (e) {}
    }
    function cancelInteraction() { stopWalking(); finishDrag(); }
    function onPointerCancel(event) {
      if (dragPointerId == null || event.pointerId === dragPointerId) cancelInteraction();
    }
    el.addEventListener('blur', cancelInteraction);
    window.addEventListener('blur', cancelInteraction);
    var raycaster = new THREE.Raycaster(); var ndc = new THREE.Vector2();
    // ── Build mode: click the floor to drop a new locus where you are looking ──
    // The palace is the student's to extend, so placement happens IN the walk
    // rather than in a form: point at a spot on a room floor, click, name it.
    // A ghost ring previews the landing spot and turns red outside any room.
    var buildMode = false, _ghost = null, _floorPlane = null;
    var _ghostOk = false;
    function _ensureGhost() {
      if (_ghost) return _ghost;
      try {
        _ghost = new THREE.Mesh(
          new THREE.RingGeometry(13, 19, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false })
        );
        _ghost.rotation.x = -Math.PI / 2;
        _ghost.visible = false;
        _ghost.renderOrder = 6;
        group.add(_ghost);
      } catch (e) { _ghost = null; }
      return _ghost;
    }
    function _floorHit(clientX, clientY) {
      try {
        if (!_floorPlane) _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var r = el.getBoundingClientRect();
        ndc.x = ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
        ndc.y = -((clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        var pt = new THREE.Vector3();
        return raycaster.ray.intersectPlane(_floorPlane, pt) ? pt : null;
      } catch (e) { return null; }
    }
    function _updateGhost(clientX, clientY) {
      var g = _ensureGhost();
      if (!g) return;
      var pt = _floorHit(clientX, clientY);
      if (!pt) { g.visible = false; _ghostOk = false; return; }
      var spot = roomAtPoint(palace, pt.x, pt.z);
      _ghostOk = !!spot;
      g.visible = true;
      g.position.set(pt.x, 1.2, pt.z);
      try { g.material.color.set(spot ? 0x38bdf8 : 0xf87171); } catch (e) {}
    }
    state.setBuildMode = function (on) {
      buildMode = !!on;
      stopWalking();
      _updateFreeCue(_activeRoomIdx, _freeStopRef);
      updateHud();
      var g = _ensureGhost();
      if (g && !buildMode) g.visible = false;
      try { el.style.cursor = buildMode ? 'crosshair' : 'grab'; } catch (e) {}
    };
    function onDown(e) {
      if (e.isPrimary === false || (e.button != null && e.button !== 0)) return;
      _hideCtrlHint(); dragging = true; moved = false; lx = e.clientX; ly = e.clientY;
      dragPointerId = e.pointerId;
      el.style.cursor = 'grabbing';
      try { el.focus(); el.setPointerCapture(e.pointerId); } catch (er) {}
    }   // focus so WASD/arrows work after a click
    function onMove(e) {
      if (!dragging || (dragPointerId != null && e.pointerId !== dragPointerId)) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (freeMode) {                          // free look: turn the head fully
        freeYaw -= dx * 0.005; freePitch -= dy * 0.004;
        freePitch = Math.max(-1.2, Math.min(1.2, freePitch));
      } else {                                 // guided: peek around the current locus
        yawOff -= dx * 0.0035; pitchOff -= dy * 0.0025;
        yawOff = Math.max(-1.1, Math.min(1.1, yawOff));
        pitchOff = Math.max(-0.5, Math.min(0.5, pitchOff));
      }
      lx = e.clientX; ly = e.clientY;
    }
    function onHover(e) { if (buildMode && !dragging) _updateGhost(e.clientX, e.clientY); }
    function onUp(e) {
      if (dragPointerId != null && e.pointerId !== dragPointerId) return;
      if (dragging && !moved && buildMode) {
        dragging = false;
        try {
          var pt = _floorHit(e.clientX, e.clientY);
          var spot = pt ? roomAtPoint(palace, pt.x, pt.z) : null;
          if (spot && typeof opts.onFloorPlace === 'function') {
            opts.onFloorPlace({ roomKey: spot.roomKey, roomLabel: spot.room.label, lx: spot.lx, lz: spot.lz });
          } else if (typeof opts.onFloorPlace === 'function') {
            opts.onFloorPlace(null);                 // outside a room — the host explains why
          }
        } catch (er) {}
        finishDrag();
        return;
      }
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
      finishDrag();
    }
    // Scroll to zoom the lens (narrower FOV = zoom in) — lets you zoom into a
    // sculpture or frame from where you stand, in either walk mode.
    function onWheel(e) {
      e.preventDefault();
      _setCameraFov(camera.fov + (e.deltaY > 0 ? 3 : -3), false);
    }
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('lostpointercapture', onPointerCancel);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onHover);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    state.cleanup.push(function () {
      cancelInteraction();
      el.removeEventListener('blur', cancelInteraction);
      window.removeEventListener('blur', cancelInteraction);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('lostpointercapture', onPointerCancel);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('keyup', onKeyUp);
      try { el.removeEventListener('pointermove', onHover); } catch (eH) {}
      routePanel.removeEventListener('keydown', onRouteKeyDown);
      if (helpPanel) helpPanel.removeEventListener('keydown', onHelpKeyDown);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', _syncDockLayout);
      if (ctrlHintTimer) { try { window.clearTimeout(ctrlHintTimer); } catch (e) {} ctrlHintTimer = 0; }
      if (_dockResizeObserver) { try { _dockResizeObserver.disconnect(); } catch (eResize) {} _dockResizeObserver = null; }
      [hud, live, instr, ctrlHint, freeNavCue, freeNavLive, routePanel, helpPanel, journeyMap, masteryLegend, roomBadge, progressWrap, focusCard, completionCard].forEach(function (nd) { try { if (nd && nd.parentNode) nd.parentNode.removeChild(nd); } catch (e) {} });
      try { holder.removeAttribute('data-palace-layout'); holder.removeAttribute('data-memory-palace-viewport'); holder.style.removeProperty('--palace-dock-height'); if (holder.parentElement) holder.parentElement.style.removeProperty('--palace-dock-height'); if (holder.parentElement && holder.parentElement.parentElement) holder.parentElement.parentElement.style.removeProperty('--palace-dock-height'); } catch (eLayout) {}
      helpPanel = null; helpBtn = null; helpCloseBtn = null; helpVisible = false;
      zoomValue = null; zoomOutBtn = null; zoomInBtn = null; resetViewBtn = null;
      masteryLegend = null;
      masteryLegendCurrent = null;
      roomBadge = null;
      roomBadgeText = null;
      roomBadgeDot = null;
      focusCard = null;
      focusCardKicker = null;
      focusCardTitle = null;
      focusCardMeta = null;
      focusCardCue = null;
      completionCard = null;
      completionCardTitle = null;
      completionCardMeta = null;
      completionCardDismiss = null;
      completionWalkBtn = null;
      completionOverviewBtn = null;
      completionCardDismissed = false;
      completionGlow = null;
      guidedTether = null;
      arrivalHalo = null;
      freeNavCue = null;
      explorationControls = null;
      freeNavLive = null;
      freeNavText = null;
      freeReturnBtn = null;
      freeNavCompass = null;
      freeNavCompassArrow = null;
      _freeCueKey = '';
      _freeCueHeading = -99;
      _emptyBeacons.length = 0;
      nextStopBeacon = null;
      crossLinkGroup = null;
      crossLinks = [];
      _roomHeatmaps = {};
      _roomCanopies = {};
      journeyMap = null;
      journeyMapTitle = null;
      journeyMapMeta = null;
      journeyMapStops = [];
      journeyMapLinks = [];
      focusedCrossLink = -1;
    });

    // ── WebXR Tier 2: controllers — smooth thumbstick locomotion, snap-turn,
    //    and ray-select to reveal a locus. All guarded + presenting-only, so it
    //    can't touch the 2D path. Speeds/angles are on-device tunable. ──
    var VR_MOVE_SPEED = 2.4;      // metres/sec of smooth glide
    var VR_SNAP_DEG = 30;         // comfort snap-turn step
    var VR_VIGNETTE_MAX = 0.6;    // peripheral dim at full glide (motion-sickness comfort)
    var _xrCtrls = null, _xrGrips = null, _xrSnapArmed = true, _xrRay = null, _xrTmpM = null, _xrQ = null, _xrE = null;
    var _xrFloor = null, _teleMarker = null, _vignette = null, _teleFlash = 0, _teleTmp = null;
    function _xrBuildAids() {
      try {
        if (!_teleMarker) {
          var mg = new THREE.RingGeometry(16, 28, 32); mg.rotateX(-Math.PI / 2);   // lies flat on the floor
          _teleMarker = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.9, depthWrite: false }));
          _teleMarker.visible = false; group.add(_teleMarker);
        }
        if (!_vignette) {
          // Tunnel vignette that dims the periphery while gliding (a standard VR
          // comfort aid). Child of the camera, so it's always centred in view.
          var vg = new THREE.RingGeometry(0.35, 2.4, 40);
          _vignette = new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
          _vignette.position.set(0, 0, -0.5); _vignette.renderOrder = 9999; camera.add(_vignette);
        }
      } catch (e) {}
    }
    function _xrSetupControllers() {
      if (_xrCtrls) return;
      _xrCtrls = []; _xrGrips = []; _xrBuildAids();
      try {
        for (var ci = 0; ci < 2; ci++) {
          var c = renderer.xr.getController(ci);
          var rg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
          var rl = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.85 }));
          rl.scale.z = 6; rl.userData.decorative = true;   // aim-beam length (rig-local; picking uses the true ray)
          c.add(rl);
          (function (ctrl) { ctrl.addEventListener('selectstart', function () { _xrTrigger(ctrl); }); })(c);
          xrRig.add(c); _xrCtrls.push(c);
          // grip mesh — a small controller-ish box so the student sees their hands
          var gp = renderer.xr.getControllerGrip(ci);
          gp.add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 })));
          xrRig.add(gp); _xrGrips.push(gp);
        }
      } catch (e) {}
    }
    function _xrHapticPulse(intensity, ms) {
      try {
        var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
        var srcs = sess.inputSources || [];
        for (var i = 0; i < srcs.length; i++) {
          var g = srcs[i].gamepad;
          if (g && g.hapticActuators && g.hapticActuators[0]) { try { g.hapticActuators[0].pulse(intensity, ms); } catch (e) {} }
        }
      } catch (e) {}
    }
    function _xrCtrlRay(ctrl) {
      if (!_xrRay) _xrRay = new THREE.Raycaster();
      if (!_xrTmpM) _xrTmpM = new THREE.Matrix4();
      _xrRay.camera = camera;                            // THREE.Sprite.raycast requires it (bank chips)
      _xrTmpM.identity().extractRotation(ctrl.matrixWorld);
      _xrRay.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      _xrRay.ray.direction.set(0, 0, -1).applyMatrix4(_xrTmpM);
      return _xrRay;
    }
    function _xrFloorHit(ctrl, out) {
      try {
        if (!_xrFloor) _xrFloor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var ray = _xrCtrlRay(ctrl);
        if (ray.ray.direction.y > -0.12) return false;   // only while pointing DOWN (teleport intent, not locus aim)
        return !!ray.ray.intersectPlane(_xrFloor, out);
      } catch (e) { return false; }
    }
    // ── In-VR recall bank: floating, ray-selectable answer chips (Tier-4 item) ──
    // In recall mode the 2D bank UI is invisible from inside the headset, so the
    // trigger on a locus spawns the REMAINING answers as label sprites in front of
    // the player. Picking one routes through the SAME view-side answer flow as a
    // 2D chip click (opts.vrRecall.onPick → submitRecallAnswer): correct → the
    // view reveals the locus (which closes the bank synchronously), wrong → the
    // attempts/hints machinery accrues and the bank stays up. Distances/sizes are
    // rig-scale world units — ON-DEVICE TUNABLE like the other VR constants.
    var _vrBankGroup = null, _vrBankMeshes = [], _vrBankFor = null;
    var VR_BANK_DIST = 230, VR_BANK_COL_W = 210, VR_BANK_ROW_H = 44, VR_BANK_FONT = 30;
    function _xrHideBank() {
      if (!_vrBankGroup) return;
      try {
        group.remove(_vrBankGroup);
        _vrBankGroup.traverse(function (n) {
          if (n.material) { try { if (n.material.map && n.material.map.dispose) n.material.map.dispose(); n.material.dispose(); } catch (e) {} }
          if (n.geometry && n.geometry.dispose) { try { n.geometry.dispose(); } catch (e) {} }
        });
      } catch (e) {}
      _vrBankGroup = null; _vrBankMeshes = []; _vrBankFor = null;
    }
    function _xrShowBank(id) {
      _xrHideBank();
      if (!recall || !opts.vrRecall || typeof opts.vrRecall.getBank !== 'function') return;
      var chips = [];
      try { chips = opts.vrRecall.getBank() || []; } catch (e) { chips = []; }
      if (!chips.length) return;
      try {
        _vrBankGroup = new THREE.Group(); _vrBankFor = id;
        var cw = new THREE.Vector3(); camera.getWorldPosition(cw);
        var fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0;
        if (fwd.lengthSq() < 0.01) fwd.set(0, 0, -1); fwd.normalize();
        var right = new THREE.Vector3(fwd.z, 0, -fwd.x);                 // perpendicular, same plane
        var base = cw.clone().addScaledVector(fwd, VR_BANK_DIST);
        var cols = chips.length > 8 ? 3 : 2;
        var rows = Math.ceil(chips.length / cols);
        chips.forEach(function (ch, i) {
          var s = makeLabelSprite(THREE, ch.label, '#a5b4fc', VR_BANK_FONT, false, _textureAnisotropy);
          var cx = (i % cols) - (cols - 1) / 2, ry = Math.floor(i / cols);
          s.position.copy(base).addScaledVector(right, cx * VR_BANK_COL_W);
          s.position.y = cw.y + ((rows - 1) / 2 - ry) * VR_BANK_ROW_H;
          s.userData.bankChip = { id: ch.id, label: ch.label };
          _vrBankGroup.add(s); _vrBankMeshes.push(s);
        });
        group.add(_vrBankGroup);
        try { live.textContent = describeLocusForRecall(palace, id, t, decor); } catch (e2) {}
      } catch (e) { _xrHideBank(); }
    }
    // Context-sensitive trigger: bank chip → answer; locus in recall → open the
    // bank (NEVER auto-reveal — the pre-bank behavior leaked the answer); locus in
    // study → reveal; floor → teleport (comfort blink).
    function _xrTrigger(ctrl) {
      try {
        if (_vrBankGroup && _vrBankMeshes.length) {
          var bh = _xrCtrlRay(ctrl).intersectObjects(_vrBankMeshes, false);
          if (bh.length) {
            var chip = bh[0].object.userData.bankChip, forId = _vrBankFor;
            try { if (opts.vrRecall && typeof opts.vrRecall.onPick === 'function') opts.vrRecall.onPick(forId, chip); } catch (e5) {}
            // A correct pick makes the view reveal the locus, which closes the
            // bank synchronously — still open here means the pick was wrong.
            if (_vrBankGroup) _xrHapticPulse(0.2, 120); else _xrHapticPulse(0.5, 40);
            return;
          }
        }
        var hits = _xrCtrlRay(ctrl).intersectObjects(frameMeshes, false);
        if (hits.length) {
          var id = hits[0].object.userData.locusId;
          if (recall) {
            var ri = palace.route.indexOf(id);
            if (ri > 0) { try { goTo(ri); } catch (e6) {} }         // announce → onLocusChange keeps the view's current locus in sync (camera writes are XR-gated)
            _xrShowBank(id);
            _xrHapticPulse(0.35, 35);
            return;
          }
          try { if (state.revealLocus) state.revealLocus(id); } catch (e2) {}
          try { if (live) live.textContent = describeLocusForSR(palace, id, t, decor); } catch (e3) {}
          try { if (typeof opts.onLocusActivate === 'function') opts.onLocusActivate(id); } catch (e4) {}   // seam for VR recall
          _xrHapticPulse(0.4, 40); return;
        }
        if (!_teleTmp) _teleTmp = new THREE.Vector3();
        if (_xrFloorHit(ctrl, _teleTmp)) {
          var teleX = _cl(_teleTmp.x, palace.bounds.minX + 40, palace.bounds.maxX - 40);
          var teleZ = _cl(_teleTmp.z, palace.bounds.minZ + 40, palace.bounds.maxZ - 40);
          var teleSafe = theme.walls ? resolvePalaceMovement(palace, teleX, teleZ, teleX, teleZ, WALK_RADIUS) : { collided: false };
          if (!teleSafe.collided) {
            xrRig.position.x = teleX; xrRig.position.z = teleZ;
            _teleFlash = 1; _xrHapticPulse(0.6, 30);
          } else {
            _xrHapticPulse(0.18, 110);
          }
        }
      } catch (e) {}
    }
    function _xrLocomotion() {
      try {
        var sess = renderer.xr.getSession && renderer.xr.getSession(); if (!sess) return;
        var srcs = sess.inputSources || [];
        var mvX = 0, mvY = 0, snap = 0;
        for (var i = 0; i < srcs.length; i++) {
          var g = srcs[i].gamepad; if (!g || !g.axes) continue;
          var ax = g.axes;
          var sx = ax.length >= 4 ? ax[2] : (ax[0] || 0);   // xr-standard thumbstick, else touchpad
          var sy = ax.length >= 4 ? ax[3] : (ax[1] || 0);
          if (srcs[i].handedness === 'right') { snap = sx; }
          else { mvX += sx; mvY += sy; }                     // left/unknown hand glides
        }
        if (Math.abs(mvX) < 0.2) mvX = 0;
        if (Math.abs(mvY) < 0.2) mvY = 0;
        if (mvX || mvY) {
          if (!_xrQ) { _xrQ = new THREE.Quaternion(); _xrE = new THREE.Euler(0, 0, 0, 'YXZ'); }
          camera.getWorldQuaternion(_xrQ); _xrE.setFromQuaternion(_xrQ, 'YXZ');
          var yaw = _xrE.y, sinY = Math.sin(yaw), cosY = Math.cos(yaw);
          var fwd = -mvY, str = mvX;                          // stick up = forward, stick right = strafe right
          var stepW = VR_MOVE_SPEED * (xrRig.scale.x || 1) / 60;   // per-frame world units (~60 fps)
          var xrNextX = _cl(xrRig.position.x + (fwd * -sinY + str * cosY) * stepW, palace.bounds.minX + 40, palace.bounds.maxX - 40);
          var xrNextZ = _cl(xrRig.position.z + (fwd * -cosY + str * -sinY) * stepW, palace.bounds.minZ + 40, palace.bounds.maxZ - 40);
          var xrMove = theme.walls ? resolvePalaceMovement(palace, xrRig.position.x, xrRig.position.z, xrNextX, xrNextZ, WALK_RADIUS) : { x: xrNextX, z: xrNextZ, collided: false };
          xrRig.position.x = xrMove.x; xrRig.position.z = xrMove.z;
          if (xrMove.collided) _xrHapticPulse(0.12, 24);
        }
        if (Math.abs(snap) > 0.7) { if (_xrSnapArmed) { xrRig.rotation.y -= (snap > 0 ? 1 : -1) * VR_SNAP_DEG * Math.PI / 180; _xrSnapArmed = false; } }
        else if (Math.abs(snap) < 0.3) { _xrSnapArmed = true; }
        // Teleport aim marker: show where a downward-pointing controller would land.
        if (_teleMarker) {
          if (!_teleTmp) _teleTmp = new THREE.Vector3();
          var shown = false;
          if (_xrCtrls) for (var k = 0; k < _xrCtrls.length; k++) {
            if (_xrFloorHit(_xrCtrls[k], _teleTmp)) {
              var markerX = _cl(_teleTmp.x, palace.bounds.minX + 40, palace.bounds.maxX - 40);
              var markerZ = _cl(_teleTmp.z, palace.bounds.minZ + 40, palace.bounds.maxZ - 40);
              var markerSafe = theme.walls ? resolvePalaceMovement(palace, markerX, markerZ, markerX, markerZ, WALK_RADIUS) : { collided: false };
              if (!markerSafe.collided) { _teleMarker.position.set(markerX, 2, markerZ); _teleMarker.visible = true; shown = true; break; }
            }
          }
          if (!shown) _teleMarker.visible = false;
        }
        // Comfort vignette: dim the periphery by glide speed, plus a teleport blink.
        if (_vignette) {
          var target = Math.min(1, Math.sqrt(mvX * mvX + mvY * mvY)) * VR_VIGNETTE_MAX;
          if (_teleFlash > 0) { target = Math.max(target, 0.9); _teleFlash = Math.max(0, _teleFlash - 0.08); }
          _vignette.material.opacity += (target - _vignette.material.opacity) * 0.25;
        }
      } catch (e) {}
    }

    // ── tick: ease camera along the rails; apply drag look-around ──
    var lookBase = new THREE.Vector3();
    var previousWalkFrame = null;
    function tick() {
      if (state.disposed) return;
      var frameNow = window.performance && window.performance.now ? window.performance.now() : Date.now();
      var elapsed = previousWalkFrame == null ? 1000 / 60 : Math.max(0, Math.min(50, frameNow - previousWalkFrame));
      previousWalkFrame = frameNow;
      var walkScale = elapsed / (1000 / 60) / Math.max(1, Math.hypot(moveF, moveR));
      // While an immersive session drives the frame loop (state.xrActive), the
      // HEADSET owns the camera pose — skip all rail/free-roam camera writes and
      // let the XR compositor schedule frames (no window rAF). Controllers still
      // drive locomotion (thumbstick) each frame.
      if (state.xrActive) { _xrLocomotion(); _pulseHl(); _animateFlourish(); renderer.render(root, camera); return; }
      if (freeMode) {
        // WASD free walk on the floor plane; free-look via freeYaw/freePitch.
        if (moveF || moveR) {
          var sinY = Math.sin(freeYaw), cosY = Math.cos(freeYaw);
          var b = palace.bounds;
          var nextX = _cl(camPos.x + (moveF * sinY + moveR * cosY) * MOVE_SPEED * walkScale, b.minX + 40, b.maxX - 40);
          var nextZ = _cl(camPos.z + (moveF * cosY - moveR * sinY) * MOVE_SPEED * walkScale, b.minZ + 40, b.maxZ - 40);
          var movedPosition = theme.walls ? resolvePalaceMovement(palace, camPos.x, camPos.z, nextX, nextZ, WALK_RADIUS) : { x: nextX, z: nextZ, collided: false };
          camPos.x = movedPosition.x; camPos.z = movedPosition.z;
          if (movedPosition.collided) _noteWallCollision();
        }
        _syncFreeRoomContext();
        camPos.y = EYE;
        var cp = Math.cos(freePitch);
        lookBase.set(camPos.x + Math.sin(freeYaw) * cp, camPos.y + Math.sin(freePitch), camPos.z + Math.cos(freeYaw) * cp);
        camPosT.copy(camPos); lookT.copy(lookBase); look.copy(lookBase);   // sync rails so a later ◀▶ eases from here
        camera.position.copy(camPos);
        camera.lookAt(lookBase);
      } else {
        // Preserve the 60 Hz feel while using elapsed time at other frame rates.
        var railFrames = elapsed / (1000 / 60);
        var ease = reduce ? 1 : 1 - Math.pow(1 - Math.min(0.2, 0.07 * railEaseMultiplier), railFrames);
        camPos.lerp(camPosT, ease);
        look.lerp(lookT, reduce ? 1 : 1 - Math.pow(1 - Math.min(0.25, 0.09 * railEaseMultiplier), railFrames));
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
      }
      _setFrameCaptionOcclusionState(false);
      _scaleFrameLabels();
      _notifyEmptyApproach();
      _emitEmptyAnchor();
      _pulseHl();
      _animateFlourish();
      renderer.render(root, camera);
      // Gate the reschedule on the pause flag so a pause that lands mid-frame
      // actually stops the loop (cancelling state.raf alone would race the tail).
      state.raf = state.loopPaused ? 0 : (window.requestAnimationFrame || function () { return 0; })(tick);
    }
    tick();
    announce(curIdx);

    // ── Pause the render loop when the palace is off-screen or the tab is hidden ──
    // The walk keeps its own rAF running continuously (camera easing + flourish);
    // on the target school Chromebooks that's wasted battery while it sits in a
    // collapsed panel or a background tab. Stop the loop when not visible, resume
    // on return. XR sessions run on the headset's own setAnimationLoop — never
    // touched here (guarded by state.xrActive).
    function _pauseLoop() {
      cancelInteraction(); previousWalkFrame = null;
      state.loopPaused = true;
      if (state.raf) { try { (window.cancelAnimationFrame || function () {})(state.raf); } catch (e) {} state.raf = 0; }
    }
    function _resumeLoop() {
      if (state.disposed || state.xrActive) return;
      state.loopPaused = false;
      if (!state.raf) tick();
    }
    state._resumeLoop = _resumeLoop;   // XR session-end resumes through this (clears any pause set during VR)
    var _palaceVisible = true;
    try {
      if (window.IntersectionObserver) {
        var _vio = new IntersectionObserver(function (entries) {
          _palaceVisible = entries.some(function (en) { return en.isIntersecting; });
          if (!_palaceVisible) _pauseLoop();
          else if (!(document && document.hidden)) _resumeLoop();
        }, { threshold: 0.01 });
        _vio.observe(holder);
        state.cleanup.push(function () { try { _vio.disconnect(); } catch (e) {} });
      }
    } catch (e) {}
    function _onVisibility() {
      if (document && document.hidden) _pauseLoop();
      else if (_palaceVisible) _resumeLoop();
    }
    try {
      document.addEventListener('visibilitychange', _onVisibility);
      state.cleanup.push(function () { try { document.removeEventListener('visibilitychange', _onVisibility); } catch (e) {} });
    } catch (e) {}

    state.onResize = function () {
      var W = holder.clientWidth || w, H = holder.clientHeight || hgt;
      if (!W || !H) return;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
      if (!state.xrActive) {
        if (overview) applyOverview();
        else if (!freeMode) stopTargets(curIdx);
      }
    };
    window.addEventListener('resize', state.onResize);
    // The container frequently reaches its final width AFTER mount (panel expand /
    // reflow) with NO window 'resize' — which left the canvas frozen at its narrow
    // mount-time width (the "half the area" bug). Observe the holder directly and
    // refit on any size change, plus one refit next frame once layout has settled.
    try {
      if (window.ResizeObserver) {
        var _ro = new ResizeObserver(function () { if (!state.disposed && state.onResize) state.onResize(); });
        _ro.observe(holder);
        state.cleanup.push(function () { try { _ro.disconnect(); } catch (e) {} });
      }
    } catch (e) {}
    (window.requestAnimationFrame || function (f) { return f(); })(function () { if (!state.disposed && state.onResize) state.onResize(); });

    state.goTo = function (idx) { goTo(idx); };
    state.setTourPace = function (multiplier) {
      var n = Number(multiplier);
      railEaseMultiplier = isFinite(n) ? Math.max(0.55, Math.min(1.8, n)) : 1;
    };
  }

  // ── render — public imperative API. Returns { destroy, goTo, fellBack }. ──
  function render(container, data, opts) {
    opts = opts || {};
    var t = opts.t || function (k) { return k; };
    if (!container) return { destroy: function () {}, goTo: function () {}, fellBack: true };
    var palace = (data && data.version === VERSION && data.route) ? data : buildPalace(data, opts);
    while (container.firstChild) container.removeChild(container.firstChild);

    var routeVisible = false;                                                  // flips when we fall back to the route list
    var routeEl = buildRouteDom(palace, t, routeVisible, !!opts.recall, opts.decor);   // sr-only while 3D is live
    container.appendChild(routeEl);

    var state = { raf: 0, renderer: null, scene: null, disposed: false, onResize: null, cleanup: [], goTo: null, setTourPace: null, revealLocus: null, setLocusStatus: null, setLocusMnemonic: null, setBuildMode: null, routePanel: null };
    function destroy() {
      state.disposed = true;
      if (state.raf) { try { (window.cancelAnimationFrame || function () {})(state.raf); } catch (e) {} state.raf = 0; }
      if (state.onResize) { try { window.removeEventListener('resize', state.onResize); } catch (e) {} state.onResize = null; }
      state.cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      state.cleanup = [];
      // Dispose every geometry/material/texture in the scene graph — renderer.dispose()
      // alone does NOT free these, and the frame images are large base64 textures, so
      // repeated open/close would climb GPU memory until the context is lost.
      if (state.scene) {
        try {
          state.scene.traverse(function (o) {
            if (o.geometry && o.geometry.dispose) { try { o.geometry.dispose(); } catch (e) {} }
            var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
            mats.forEach(function (mx) {
              if (!mx) return;
              if (mx.map && mx.map.dispose) { try { mx.map.dispose(); } catch (e) {} }
              if (mx.dispose) { try { mx.dispose(); } catch (e) {} }
            });
          });
        } catch (e) {}
        state.scene = null;
      }
      if (state.renderer) {
        try { if (state.renderer.forceContextLoss) state.renderer.forceContextLoss(); } catch (e) {}
        try { state.renderer.dispose(); } catch (e) {}
        try { var dom = state.renderer.domElement; if (dom && dom.parentNode) dom.parentNode.removeChild(dom); } catch (e) {}
        state.renderer = null;
      }
    }
    function goTo(idx) { try { if (state.goTo) state.goTo(idx); } catch (e) {} }
    function setTourPace(multiplier) { try { if (state.setTourPace) state.setTourPace(multiplier); } catch (e) {} }
    function revealLocus(id) { try { if (state.revealLocus) state.revealLocus(id); } catch (e) {} }
    function setLocusStatus(id, status) { try { if (state.setLocusStatus) state.setLocusStatus(id, status); } catch (e) {} }
    function setLocusImage(id, img) { try { if (state.setLocusImage) state.setLocusImage(id, img); } catch (e) {} }
    function setLocusRelief(id, img, depth) { try { if (state.setLocusRelief) state.setLocusRelief(id, img, depth); else if (state.setLocusImage) state.setLocusImage(id, img); } catch (e) {} }
    function setLocusObject(id, recipe) { try { if (state.setLocusObject) state.setLocusObject(id, recipe); } catch (e) {} }
    function setLocusBusy(id, busy) { try { if (state.setLocusBusy) state.setLocusBusy(id, busy); } catch (e) {} }
    function replaceLocusObject(id, recipe) { try { if (state.replaceLocusObject) state.replaceLocusObject(id, recipe); } catch (e) {} }
    function clearLocus(id) { try { if (state.clearLocus) state.clearLocus(id); } catch (e) {} }
    function setDecor(d) { try { if (state.setDecor) state.setDecor(d); } catch (e) {} }
    function setBuildMode(on) { try { if (state.setBuildMode) state.setBuildMode(on); } catch (e) {} }
    // The route list is the accessible source of truth, and it quotes the
    // mnemonic — so an edited image has to reach it too, or screen-reader users
    // would keep reading the generated line the student just replaced.
    function refreshRoute() {
      if (!routeEl || !routeEl.parentNode) return;
      var fresh = buildRouteDom(palace, t, routeVisible, !!opts.recall, opts.decor);
      routeEl.parentNode.replaceChild(fresh, routeEl);
      routeEl = fresh;
    }
    function setLocusMnemonic(id, text) {
      // Works with or without a live scene: without GL the palace object still
      // needs the swap so the visible fallback route list stays truthful.
      try {
        if (state.setLocusMnemonic) state.setLocusMnemonic(id, text);
        else applyOwnMnemonic(palace, id, text);
      } catch (e) {}
      try { refreshRoute(); } catch (e) {}
    }
    function showFallback(msg) {
      routeVisible = true;
      // Tell the host, so it can stop offering controls that cannot work without
      // the 3D walk. The synchronous `fellBack` on the returned handle only covers
      // the no-WebGL case; a three.js load failure or a GL mount throw happens
      // later, and used to leave every button enabled and silently inert.
      if (typeof opts.onFallback === 'function') { try { opts.onFallback(msg); } catch (e) {} }
      routeEl.style.cssText = 'color:#e2e8f0;padding:8px 16px;max-height:100%;overflow:auto;';
      var note = document.createElement('div');
      note.setAttribute('role', 'status');
      note.textContent = msg;
      note.style.cssText = 'font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 10px;margin:8px;';
      container.insertBefore(note, routeEl);
    }

    if (!isWebGLAvailable()) {
      showFallback(_tr(t, 'memory_palace.no_webgl', 'This browser cannot show the 3D palace. Showing the walking route instead.'));
      return { destroy: destroy, goTo: goTo, setTourPace: setTourPace, revealLocus: revealLocus, setLocusStatus: setLocusStatus, setLocusImage: setLocusImage, setLocusRelief: setLocusRelief, setLocusObject: setLocusObject, setLocusBusy: setLocusBusy, replaceLocusObject: replaceLocusObject, clearLocus: clearLocus, setDecor: setDecor, setLocusMnemonic: setLocusMnemonic, setBuildMode: setBuildMode, fellBack: true };
    }

    var holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;inset:0;';
    container.appendChild(holder);

    loadThree(opts).then(function (THREE) {
      if (!THREE || state.disposed) return;
      try { mountGL(holder, THREE, palace, opts, state); }
      catch (e) {
        console.warn('[MemoryPalace] GL mount failed:', e && e.message);
        try { destroy(); } catch (e2) {}                                   // dispose whatever was built before the throw
        try { if (holder.parentNode) holder.parentNode.removeChild(holder); } catch (e3) {}
        showFallback(_tr(t, 'memory_palace.gl_error', 'The 3D palace could not start. Showing the walking route instead.'));
      }
    }).catch(function (e) {
      if (state.disposed) return;
      console.warn('[MemoryPalace] three.js load failed:', e && e.message);
      showFallback(_tr(t, 'memory_palace.load_error', 'The 3D library could not load. Showing the walking route instead.'));
    });

    return { destroy: destroy, goTo: goTo, setTourPace: setTourPace, revealLocus: revealLocus, setLocusStatus: setLocusStatus, setLocusImage: setLocusImage, setLocusRelief: setLocusRelief, setLocusObject: setLocusObject, setLocusBusy: setLocusBusy, replaceLocusObject: replaceLocusObject, clearLocus: clearLocus, setDecor: setDecor, setLocusMnemonic: setLocusMnemonic, setBuildMode: setBuildMode, fellBack: false };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MemoryPalace = {
    version: VERSION,
    PALETTE: PALETTE,
    THEME_KEYS: THEME_KEYS,
    contrastForeground: contrastForeground,
    buildPalace: buildPalace,
    normalizeRouteOrder: normalizeRouteOrder,
    navigateRoute: navigateRoute,
    MNEMONIC_MIN_CHARS: MNEMONIC_MIN_CHARS,
    MNEMONIC_CRITERIA: MNEMONIC_CRITERIA,
    mnemonicFeedback: mnemonicFeedback,
    applyOwnMnemonic: applyOwnMnemonic,
    worldToRoomLocal: worldToRoomLocal,
    roomAtPoint: roomAtPoint,
    resolvePalaceMovement: resolvePalaceMovement,
    WALK_RADIUS: WALK_RADIUS,
    WALL_T: WALL_T,
    ROOM_W: ROOM_W,
    ROOM_D: ROOM_D,
    DOOR_W: DOOR_W,
    fingerprintLabel: fingerprintLabel,
    staleLocusIds: staleLocusIds,
    nextExtraLocusId: nextExtraLocusId,
    nextExtraRoomId: nextExtraRoomId,
    extraSpotFor: extraSpotFor,
    RECALL_DIRECTIONS: RECALL_DIRECTIONS,
    buildRecallOrder: buildRecallOrder,
    decorSpot: decorSpot,
    landmarkSpot: landmarkSpot,
    describeLocusForSR: describeLocusForSR,
    describeLocusForRecall: describeLocusForRecall,
    buildRecallBank: buildRecallBank,
    buildLocusChoices: buildLocusChoices,
    RECALL_CHOICE_COUNT: RECALL_CHOICE_COUNT,
    matchAnswer: matchAnswer,
    scoreRecall: scoreRecall,
    buildPromptEvalPrompt: buildPromptEvalPrompt,
    parsePromptEval: parsePromptEval,
    buildRefinePrompt: buildRefinePrompt,
    buildDepthPrompt: buildDepthPrompt,
    updateMastery: updateMastery,
    dueLoci: dueLoci,
    masteryStrength: masteryStrength,
    roomMasterySummary: roomMasterySummary,
    isWebGLAvailable: isWebGLAvailable,
    loadThree: loadThree,
    render: render
  };
  console.log('[MemoryPalace] Registered (method-of-loci 3D walk; lazy three.js, route-list fallback)');
})();
