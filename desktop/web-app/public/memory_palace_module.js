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
    gallery: { bg: 0x0b1020, fog: 0.00042, fogColor: 0x0b1020, walls: true, ground: 0, stars: 0x93c5fd, starCount: 420, ambient: 0.62, hemi: [0xcfe0ff, 0x1a2740, 0.72], sun: [0xffffff, 0.6], floorMul: 0.4 },
    pasture: { bg: 0x8ec9ea, fog: 0.00018, fogColor: 0xd6ecff, walls: false, ground: 0x4f7f43, stars: 0, starCount: 0, ambient: 0.9, hemi: [0xcdeaff, 0x3c5a2c, 0.95], sun: [0xfff3d6, 0.95], floorMul: 0.62 },
    space: { bg: 0x02030a, fog: 0, fogColor: 0x02030a, walls: false, ground: 0, stars: 0xc3d4ff, starCount: 900, ambient: 0.34, hemi: [0x232f4d, 0x05060a, 0.5], sun: [0x9db4ff, 0.5], floorMul: 0.32 }
  };
  var THEME_KEYS = ['gallery', 'pasture', 'space'];
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

    // Hub-and-spokes: rooms radiate from the central entry hub like spokes of a
    // wheel (each room rotated so its doorway faces the hub), instead of a single
    // linear corridor. Radius scales with the room count so N rooms fit around the
    // hub without overlapping it or each other. Room-local layout (loci on the two
    // long walls, doorway on the hub-facing end) is unchanged; we just rotate each
    // room by its spoke angle and rotate the loci world positions to match — so the
    // route, loci ids, camera rails, and recall all keep working.
    var N = Math.max(1, branches.length);
    var SPOKE_R = Math.max(ROOM_W * 1.4, (N * ROOM_D) / (2 * Math.PI) * 1.25 + ROOM_W / 2);
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
    });

    var reach = SPOKE_R + ROOM_D / 2 + 80;               // radial extent (square bounds around the hub)
    return {
      version: VERSION, title: main,
      rooms: rooms, loci: loci, route: route,
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

  function _normAnswer(s) {
    s = String(s == null ? '' : s).toLowerCase().trim();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
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
    var total = 0, firstTry = 0, eventual = 0, revealed = 0;
    Object.keys(results || {}).forEach(function (id) {
      var r = results[id]; if (!r) return;
      total++;
      if (r.revealed) { revealed++; return; }
      if (r.correct && r.attempts <= 1) firstTry++;
      else if (r.correct) eventual++;
    });
    return {
      total: total, firstTry: firstTry, eventual: eventual, revealed: revealed,
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

  function _strengthOf(r) {
    if (!r) return 0;
    if (r.revealed) return 0.2;
    if (r.correct && (r.attempts || 1) <= 1) return 1.0;   // first try
    if (r.correct) return 0.6;                             // got it, eventually
    return 0;                                              // missed
  }
  function _parseDay(iso) { var t = Date.parse(iso); return isNaN(t) ? 0 : t; }
  function _addDays(iso, days) { return new Date(_parseDay(iso) + days * 86400000).toISOString(); }

  // prevMastery + a recall walk's per-locus results (+ now) → updated mastery map.
  function updateMastery(prevMastery, resultsMap, nowISO) {
    var m = Object.assign({}, prevMastery || {});
    var results = resultsMap || {};
    Object.keys(results).forEach(function (id) {
      var s = _strengthOf(results[id]);
      var prev = m[id] || { reps: 0 };
      var prevReps = isNum(prev.reps) ? prev.reps : 0;
      var reps = (s >= 0.6) ? (prevReps + 1) : Math.max(0, prevReps - 1);
      // Success indexes the ladder at reps-1, so the FIRST correct recall spaces at
      // 1 day (ladder[0]), not 3. ANY failure to recall — a wrong guess (s=0) OR a
      // give-up reveal (s=0.2) — reschedules for tomorrow; giving up must never push
      // an item weeks out (which the old `s === 0` gate did to revealed items).
      var idx = Math.max(0, Math.min(_REVIEW_LADDER.length - 1, reps - 1));
      var intervalDays = (s < 0.6) ? 1 : _REVIEW_LADDER[idx];
      var lastResult = (results[id] && results[id].revealed) ? 'revealed' : (s >= 1 ? 'first-try' : (s >= 0.6 ? 'eventual' : 'missed'));
      m[id] = { reps: reps, strength: s, lastResult: lastResult, lastReviewedAt: nowISO, dueAt: _addDays(nowISO, intervalDays) };
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
    g.fillStyle = '#ffffff'; g.font = '800 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
    var reduce = false; try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    // WebXR: harmless in 2D (only affects rendering while a headset session is
    // presenting); lets an "Enter VR" affordance start an immersive session so a
    // student can stand inside the palace and walk the loci at room scale.
    try { renderer.xr.enabled = true; } catch (e) {}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, hgt);
    renderer.setClearColor(BG, 1);
    try { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) {}
    holder.appendChild(renderer.domElement);
    state.renderer = renderer;

    var theme = THEMES[opts && opts.theme] || THEMES.gallery;
    var root = new THREE.Scene();
    state.scene = root;   // exposed so destroy() can traverse + dispose the whole graph
    root.background = new THREE.Color(theme.bg);
    try { if (theme.fog > 0) root.fog = new THREE.FogExp2(theme.fogColor, theme.fog); } catch (e) {}
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
    var _starMats = [];
    try {
      if (theme.starCount > 0) {
        var span = Math.max(2000, palace.bounds.width * 1.6);
        for (var sl = 0; sl < 2; sl++) {
          var SN = Math.ceil(theme.starCount / 2), sp3 = new Float32Array(SN * 3);
          for (var si = 0; si < SN; si++) {
            sp3[si * 3] = palace.bounds.minX + Math.random() * span;
            sp3[si * 3 + 1] = WALL_H + 300 + Math.random() * 2200;
            sp3[si * 3 + 2] = -span / 2 + Math.random() * span;
          }
          var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp3, 3));
          var sm = new THREE.PointsMaterial({ color: theme.stars, size: 7, transparent: true, opacity: 0.5, depthWrite: false });
          sm.userData = { phase: sl * Math.PI };   // opposite phases
          _starMats.push(sm);
          root.add(new THREE.Points(sg, sm));
        }
      }
    } catch (e) {}

    var group = new THREE.Group(); root.add(group);
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.05 });

    function addWall(x, z, lenX, lenZ) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(lenX, 8), WALL_H, Math.max(lenZ, 8)), wallMat);
      mesh.position.set(x, WALL_H / 2, z);
      group.add(mesh);
    }

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
        new THREE.MeshStandardMaterial({ color: new THREE.Color(room.color).multiplyScalar(theme.floorMul), roughness: 0.9 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0.5; rg.add(floor);
      // Carpet runner from the doorway to the far wall — a soft accent path that
      // pulls the eye down the room's locus row (and doubles as wayfinding in the
      // open-world themes). Room-local, so it rotates with the spoke for free.
      if (ri !== 0) {
        try {
          var cc = document.createElement('canvas'); cc.width = 128; cc.height = 32;
          var cg = cc.getContext('2d');
          cg.fillStyle = room.color; cg.fillRect(0, 0, 128, 32);
          cg.fillStyle = 'rgba(255,255,255,0.35)'; cg.fillRect(0, 2, 128, 3); cg.fillRect(0, 27, 128, 3);   // edge trim
          var ctex = new THREE.CanvasTexture(cc);
          if (THREE.sRGBEncoding) ctex.encoding = THREE.sRGBEncoding;
          var carpet = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 150, 130),
            new THREE.MeshStandardMaterial({ map: ctex, transparent: true, opacity: theme.walls ? 0.4 : 0.28, roughness: 1, depthWrite: false }));
          carpet.rotation.x = -Math.PI / 2; carpet.rotation.z = 0;
          carpet.position.set(0, 1.1, 0); rg.add(carpet);
        } catch (eC) {}
      }
      if (ri === 0 || !theme.walls) {
        // Hub is an open plaza; open-world themes (pasture/space) drop walls too.
      } else {
        // Long walls (the two sides loci hang on) + solid far wall + hub-facing
        // near wall with a central doorway.
        addLocalWall(0, -ROOM_D / 2, ROOM_W, 10);
        addLocalWall(0, ROOM_D / 2, ROOM_W, 10);
        addLocalWall(ROOM_W / 2, 0, 10, ROOM_D);                             // far end wall (solid)
        var segZ = (ROOM_D - DOOR_W) / 2;
        addLocalWall(-ROOM_W / 2, -(DOOR_W / 2 + segZ / 2), 10, segZ);       // near wall, doorway to the hub
        addLocalWall(-ROOM_W / 2, (DOOR_W / 2 + segZ / 2), 10, segZ);
        // Doorway columns + lintel — frame the threshold so each room reads as a
        // distinct chamber from the hub (helps the "walk into a room" mental map).
        try {
          var colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.15 });
          [-1, 1].forEach(function (cs) {
            var col = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, WALL_H * 0.88, 14), colMat);
            col.position.set(-ROOM_W / 2, WALL_H * 0.44, cs * (DOOR_W / 2 + 24)); rg.add(col);
          });
          var lintel = new THREE.Mesh(new THREE.BoxGeometry(26, 24, DOOR_W + 92),
            new THREE.MeshStandardMaterial({ color: new THREE.Color(room.color).multiplyScalar(0.65), roughness: 0.55, metalness: 0.2 }));
          lintel.position.set(-ROOM_W / 2, WALL_H * 0.88 + 12, 0); rg.add(lintel);
        } catch (eD) {}
      }
      // Room accent light + name sprite (world coords; sprites always face the camera).
      try { var pl = new THREE.PointLight(new THREE.Color(room.color), 0.55, ROOM_W * 1.4); pl.position.set(cx, WALL_H - 40, cz); group.add(pl); } catch (e) {}
      var name = makeLabelSprite(THREE, room.label, room.color, 30);
      name.position.set(cx, WALL_H + 40, cz); group.add(name);
    });

    // Entry plinth (the palace title) + a slow sparkle ring orbiting the orb.
    var _orbRing = null;
    (function () {
      var plinth = new THREE.Mesh(new THREE.CylinderGeometry(46, 56, 110, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.25 }));
      plinth.position.set(0, 55, 0); group.add(plinth);
      var orb = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 0.9, roughness: 0.3 }));
      orb.position.set(0, 140, 0); orb.userData.locusId = '__entry'; group.add(orb);
      var title = makeLabelSprite(THREE, palace.title || '', '#818cf8', 32);
      title.position.set(0, 215, 0); group.add(title);
      try {
        var ORB_N = 18, op3 = new Float32Array(ORB_N * 3);
        for (var oi = 0; oi < ORB_N; oi++) {
          var oa = (Math.PI * 2 * oi) / ORB_N;
          op3[oi * 3] = Math.cos(oa) * 58;
          op3[oi * 3 + 1] = Math.sin(oa * 3) * 10;    // gentle wave, not a flat halo
          op3[oi * 3 + 2] = Math.sin(oa) * 58;
        }
        var og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(op3, 3));
        _orbRing = new THREE.Points(og, new THREE.PointsMaterial({ color: 0xa5b4fc, size: 6, transparent: true, opacity: 0.85, depthWrite: false }));
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
      _motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: MOTE_COLOR, size: 5, transparent: true, opacity: 0.45, depthWrite: false }));
      root.add(_motes);
    } catch (e) {}

    // Loci frames. In recall mode the label is a '?' — the image (or the numbered
    // placard) is the CUE, the label is the ANSWER and stays hidden until earned.
    var recall = !!opts.recall;
    var frameMeshes = [], frameRefs = {};
    var texLoader = new THREE.TextureLoader();
    // Depth-relief "statues": when a locus has BOTH a color image and a grayscale depth
    // map (white = near), the flat frame canvas is swapped for a subdivided plane whose
    // vertices are displaced by the depth map — a bas-relief that reads as 3D from the
    // walk. Depth maps come from the same Imagen path as the art (buildDepthPrompt).
    var depths = (opts && opts.depths) || {};
    var RELIEF_DEPTH = 26;                    // world-units of max displacement (frame is 175×130)
    function applyRelief(ref, li, color, img, depth) {
      if (!ref || !ref.canvasMesh || !img || !depth) return false;
      try {
        var ctex = texLoader.load(img, function () { try { ref.mat.needsUpdate = true; } catch (e) {} }, undefined,
          function () { try { ref.mat.map = makeCardTexture(THREE, li, color); ref.mat.needsUpdate = true; } catch (e2) {} });
        if (THREE.sRGBEncoding) ctex.encoding = THREE.sRGBEncoding;
        var dtex = texLoader.load(depth, undefined, undefined, function () {});   // decode-fail → flat (bias 0 ≙ no displacement data)
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
        var wc = document.createElement('canvas'); wc.width = 64; wc.height = 128;
        var wg = wc.getContext('2d');
        var wgrad = wg.createLinearGradient(0, 0, 0, 128);
        wgrad.addColorStop(0, 'rgba(255,220,160,0.85)');
        wgrad.addColorStop(0.55, 'rgba(255,220,160,0.22)');
        wgrad.addColorStop(1, 'rgba(255,220,160,0)');
        wg.fillStyle = wgrad; wg.fillRect(0, 0, 64, 128);
        var wtex = new THREE.CanvasTexture(wc);
        _washMat = new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      }
    } catch (e) {}
    palace.loci.forEach(function (l, li) {
      if (l.id === '__entry') return;
      var room = palace.rooms[l.roomIdx];
      var color = (room && room.color) || '#6366f1';
      var g2 = new THREE.Group();
      g2.position.set(l.framePos.x, l.framePos.y, l.framePos.z);
      g2.rotation.y = (l.faceYaw != null) ? l.faceYaw : (l.faceDir > 0 ? 0 : Math.PI);   // face into the (radial) room
      // Frame border + canvas. The border carries an (initially dark) emissive in
      // the room accent so the CURRENT locus can glow — tick pulses emissiveIntensity.
      var borderMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(color), emissiveIntensity: 0 });
      var border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 18, FRAME_H + 18, 6), borderMat);
      g2.add(border);
      // Museum "picture light": a warm emissive bar above the frame — reads as a
      // gallery fixture without the per-frame cost of a real THREE light.
      var lampBar = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W * 0.72, 7, 9),
        new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0xffd9a0, emissiveIntensity: 0.85, roughness: 0.5, metalness: 0.2 }));
      lampBar.position.set(0, FRAME_H / 2 + 24, 6);
      g2.add(lampBar);
      // Warm wash on the wall around the frame — the picture light "shining".
      if (_washMat) {
        try {
          var wash = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W * 1.7, FRAME_H * 1.9), _washMat);
          wash.position.set(0, 14, -0.5);   // between the wall face and the frame border
          g2.add(wash);
        } catch (eW) {}
      }
      var mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var img = images[l.id];
      if (img) {
        // TextureLoader decodes asynchronously — a corrupt data-URL surfaces via the
        // onError callback, NOT a synchronous throw — so fall back to the numbered card
        // there too, or a bad image would render as a blank frame.
        try {
          var tx = texLoader.load(img, undefined, undefined, function () { try { mat.map = makeCardTexture(THREE, li, color); mat.needsUpdate = true; } catch (e2) {} });
          if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; mat.map = tx;
        } catch (e) { mat.map = makeCardTexture(THREE, li, color); }
      } else {
        mat.map = makeCardTexture(THREE, li, color);
      }
      var canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), mat);
      canvasMesh.position.z = 4;
      canvasMesh.userData.locusId = l.id;
      g2.add(canvasMesh);
      // Item label under the frame ('?' while its answer is unearned in recall).
      var lab = makeLabelSprite(THREE, recall ? '?' : l.label, color, 24);
      lab.position.set(0, -(FRAME_H / 2 + 34), 10);
      g2.add(lab);
      // Route-number badge on the frame's top-left corner (order stays visible
      // once the numbered placeholder card is replaced by art). Safe in recall —
      // the position is already announced; only the LABEL is the answer.
      try {
        var badge = makeNumBadge(THREE, li, color);
        badge.position.set(-(FRAME_W / 2 + 4), FRAME_H / 2 + 22, 10);
        g2.add(badge);
      } catch (eB) {}
      // Floor stop-ring at the camera stop — "stand here" wayfinding for the
      // free-roam walk and VR teleport, in the room accent color.
      try {
        if (l.camPos) {
          var ring = new THREE.Mesh(new THREE.RingGeometry(18, 25, 28),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(l.camPos.x, 1.6, l.camPos.z);
          group.add(ring);
        }
      } catch (eR) {}
      // Recall-driven dimming (study/review mode only — NEVER during a recall quiz,
      // which would leak "you struggled here"): loci the student recalled weakly in
      // past walks render dimmer, so re-study focuses where their OWN measured
      // memory is fragile (docs §4.5). Re-walking correctly brightens them.
      if (!recall && opts.mastery) {
        var _st = masteryStrength(opts.mastery, l.id);
        if (_st != null) {
          var _op = 0.32 + Math.max(0, Math.min(1, _st)) * 0.68;
          borderMat.transparent = true; borderMat.opacity = _op;
          mat.transparent = true; mat.opacity = _op;
          if (lab.material) { lab.material.opacity = _op; }
        }
      }
      group.add(g2);
      frameMeshes.push(canvasMesh);
      frameRefs[l.id] = { group: g2, label: lab, borderMat: borderMat, baseColor: color, locus: l, mat: mat, canvasMesh: canvasMesh, idx: li };
      // Existing relief pair (reload path): upgrade the flat frame in place.
      if (img && depths[l.id]) applyRelief(frameRefs[l.id], li, color, img, depths[l.id]);
    });

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
        ref.mat.map = tx; ref.mat.needsUpdate = true;
        // A flat image replacing a relief must also drop the old depth map, or the
        // new picture renders warped over the previous subject's displacement bumps.
        if (ref.mat.displacementMap) {
          try { ref.mat.displacementMap.dispose(); } catch (eD) {}
          ref.mat.displacementMap = null; ref.mat.needsUpdate = true;
        }
        if (oldMap && oldMap.dispose && oldMap !== tx) { try { oldMap.dispose(); } catch (e) {} }   // free the placeholder card
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
      if (!depth || !applyRelief(ref, ref.idx || 0, ref.baseColor, img, depth)) state.setLocusImage(id, img);
    };
    state.setLocusObject = function (id, recipe) {
      var l = locusById(palace, id);
      if (l) placeSculpture(l, recipe);
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
      placeSculpture(l, recipe);
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
        if (!reduce) {
          var now = (window.performance && window.performance.now) ? window.performance.now() : 0;
          for (var si = 0; si < _starMats.length; si++) {
            _starMats[si].opacity = 0.42 + 0.18 * Math.sin(now * 0.0012 + (_starMats[si].userData.phase || 0));
          }
          if (_motes) { _motes.rotation.y += 0.00035; _motes.position.y = Math.sin(now * 0.0005) * 6; }
          if (_orbRing) { _orbRing.rotation.y += 0.012; }
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
        ref.group.remove(ref.label);
        // Free the old '?' sprite's texture+material — otherwise every reveal during
        // a recall game leaks a CanvasTexture before destroy() ever runs.
        try { if (ref.label.material) { if (ref.label.material.map) ref.label.material.map.dispose(); ref.label.material.dispose(); } } catch (e2) {}
        ref.label = makeLabelSprite(THREE, ref.locus.label, ref.baseColor, 24);
        ref.label.position.set(0, -(FRAME_H / 2 + 34), 10);
        ref.group.add(ref.label);
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
    var look = new THREE.Vector3(), lookT = new THREE.Vector3();
    var yawOff = 0, pitchOff = 0;   // drag look-around at a stop
    var overview = false;
    // ── Free-roam (WASD) layered over the guided route ──
    // WASD walks; drag looks around; the ◀▶ buttons / arrow keys / clicking a frame
    // are the GUIDED tour (ease to a locus). Pressing a movement key enters free mode;
    // any guided nav returns to the rails.
    var freeMode = false, freeYaw = 0, freePitch = 0, moveF = 0, moveR = 0;
    var MOVE_SPEED = 14;
    function _cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function enterFree() {
      if (freeMode) return;
      var dx = look.x - camPos.x, dy = look.y - camPos.y, dz = look.z - camPos.z;
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      freeYaw = Math.atan2(dx, dz);
      freePitch = _cl(dy / len, -0.99, 0.99); freePitch = Math.asin(freePitch);
      overview = false; freeMode = true;
    }

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
      try { live.textContent = recall ? describeLocusForRecall(palace, palace.route[idx], t2, decor) : describeLocusForSR(palace, palace.route[idx], t2, decor); } catch (e) {}
      if (typeof opts.onLocusChange === 'function') {
        try { opts.onLocusChange(locusById(palace, palace.route[idx]), idx, palace.route.length); } catch (e) {}
      }
    }
    // Current-locus glow: the active frame's border emissive pulses gently so the
    // student always sees WHICH locus the walk is on (reduced motion ⇒ steady glow).
    var _hlRef = null;
    function _setHighlight(id) {
      if (_hlRef && _hlRef.borderMat) { try { _hlRef.borderMat.emissiveIntensity = 0; } catch (e) {} }
      _hlRef = frameRefs[id] || null;
      if (_hlRef && _hlRef.borderMat && reduce) { try { _hlRef.borderMat.emissiveIntensity = 0.45; } catch (e) {} }
    }
    function _pulseHl() {
      if (reduce || !_hlRef || !_hlRef.borderMat) return;
      try {
        var now = (window.performance && window.performance.now) ? window.performance.now() : 0;
        _hlRef.borderMat.emissiveIntensity = 0.24 + 0.2 * (0.5 + 0.5 * Math.sin(now * 0.004));
      } catch (e) {}
    }
    function goTo(idx, skipAnnounce) {
      try { if (typeof _xrHideBank === 'function') _xrHideBank(); } catch (eB) {}   // navigating away closes an open VR answer bank
      curIdx = Math.max(0, Math.min(palace.route.length - 1, idx));
      overview = false; freeMode = false; moveF = 0; moveR = 0; yawOff = 0; pitchOff = 0;   // guided nav returns to the rails
      stopTargets(curIdx);
      _setHighlight(palace.route[curIdx]);
      if (reduce) { camPos.copy(camPosT); look.copy(lookT); }
      updateHud();
      if (!skipAnnounce) announce(curIdx);
    }
    _setHighlight(palace.route[curIdx]);   // glow the starting locus too

    // ── DOM chrome: prev/next + progress + overview ──
    var hud = document.createElement('div');
    hud.style.cssText = 'position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:8px;max-width:calc(100% - 24px);background:rgba(2,6,23,0.9);border:1px solid #475569;border-radius:999px;padding:6px 10px;color:#e2e8f0;';
    function mkBtn(txt, label, fn) {
      var b = document.createElement('button');
      b.textContent = txt; b.setAttribute('aria-label', label);
      b.style.cssText = 'border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:999px;min-width:44px;min-height:44px;padding:8px 13px;font-size:13px;font-weight:800;cursor:pointer;';
      b.onclick = fn; return b;
    }
    var prevBtn = mkBtn('◀', _tr(t, 'memory_palace.prev', 'Previous locus'), function () { goTo(curIdx - 1); });
    var progress = document.createElement('span'); progress.style.cssText = 'font-size:12px;font-weight:800;min-width:76px;text-align:center;';
    var nextBtn = mkBtn('▶', _tr(t, 'memory_palace.next', 'Next locus'), function () { goTo(curIdx + 1); });
    var ovBtn = mkBtn('🗺', _tr(t, 'memory_palace.overview', 'Overview'), function () {
      overview = !overview;
      if (overview) { applyOverview(); if (reduce) { camPos.copy(camPosT); look.copy(lookT); } } else { goTo(curIdx, true); }
    });
    var routeVisible = false;
    var routePanel = buildRouteDom(palace, t, true, recall, decor, function (index) {
      goTo(index);
      setRouteVisible(false, true);
    });
    routePanel.id = 'palace-route-panel-' + (window.__palaceRouteSeq = (window.__palaceRouteSeq || 0) + 1);
    routePanel.hidden = true;
    routePanel.style.cssText = 'position:absolute;right:12px;top:12px;bottom:78px;z-index:7;width:min(360px,calc(100% - 24px));color:#e2e8f0;padding:14px 18px;overflow:auto;background:rgba(2,6,23,0.94);border:1px solid #475569;border-radius:12px;box-sizing:border-box;';
    routePanel.setAttribute('role', 'region');
    routePanel.setAttribute('aria-label', _tr(t, 'memory_palace.route_title', 'Palace route'));
    holder.appendChild(routePanel);
    function setRouteVisible(visible, moveFocus) {
      routeVisible = !!visible;
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
      live.textContent = routeVisible ? 'Walking route shown. Current stop focused.' : 'Walking route hidden.';
    }
    var routeBtn = mkBtn('Route', _tr(t, 'memory_palace.route_title', 'Palace route'), function () {
      setRouteVisible(!routeVisible, true);
    });
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
    hud.appendChild(prevBtn); hud.appendChild(progress); hud.appendChild(nextBtn); hud.appendChild(ovBtn); hud.appendChild(routeBtn);
    holder.appendChild(hud);
    function updateHud() {
      var totalStops = Math.max(0, palace.route.length - 1);
      progress.textContent = curIdx === 0 ? 'Entrance' : (curIdx + ' of ' + totalStops);
      progress.setAttribute('aria-label', curIdx === 0 ? ('Palace entrance. ' + totalStops + ' loci.') : ('Locus ' + curIdx + ' of ' + totalStops));
      ovBtn.setAttribute('aria-pressed', overview ? 'true' : 'false');
      prevBtn.disabled = curIdx <= 0; nextBtn.disabled = curIdx >= palace.route.length - 1;
      Array.prototype.forEach.call(routePanel.querySelectorAll('[data-route-index]'), function (button) {
        if (Number(button.getAttribute('data-route-index')) === curIdx) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.style.backgroundColor = button.hasAttribute('aria-current') ? '#3730a3' : '#1e293b';
        button.style.borderColor = button.hasAttribute('aria-current') ? '#a5b4fc' : '#475569';
      });
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
    instr.textContent = _tr(t, 'memory_palace.canvas_instructions', 'W A S D keys walk you around the palace and dragging looks around. The right and left arrow keys jump to the next or previous locus in order; Home returns to the entrance and End jumps to the last locus. O toggles the overview map. Each stop announces the room, the item, and its mnemonic image.');
    holder.appendChild(instr);
    el.setAttribute('aria-describedby', instrId);
    // Visible control hint (fades after a few seconds) — WASD isn't discoverable otherwise.
    var ctrlHint = document.createElement('div');
    ctrlHint.setAttribute('aria-hidden', 'true');
    ctrlHint.style.cssText = 'position:absolute;left:12px;top:12px;z-index:6;max-width:calc(100% - 24px);background:rgba(2,6,23,0.82);color:#e2e8f0;border:1px solid #475569;border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.35;pointer-events:none;';
    ctrlHint.textContent = _tr(t, 'memory_palace.controls_hint', 'WASD to walk · drag to look · ◀ ▶ for the guided tour');
    holder.appendChild(ctrlHint);

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
      else if (k === 'o' || k === 'O') { e.preventDefault(); ovBtn.onclick(); }
    }
    function onKeyUp(e) {
      var lk = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
      if (lk === 'w' || lk === 's') moveF = 0;
      else if (lk === 'a' || lk === 'd') moveR = 0;
    }
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);

    var dragging = false, moved = false, lx = 0, ly = 0;
    var raycaster = new THREE.Raycaster(); var ndc = new THREE.Vector2();
    function onDown(e) { dragging = true; moved = false; lx = e.clientX; ly = e.clientY; el.style.cursor = 'grabbing'; try { el.focus(); } catch (er) {} }   // focus so WASD/arrows work after a click
    function onMove(e) {
      if (!dragging) return;
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
    // Scroll to zoom the lens (narrower FOV = zoom in) — lets you zoom into a
    // sculpture or frame from where you stand, in either walk mode.
    function onWheel(e) {
      e.preventDefault();
      camera.fov = Math.max(22, Math.min(78, camera.fov + (e.deltaY > 0 ? 3 : -3)));
      camera.updateProjectionMatrix();
    }
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    state.cleanup.push(function () {
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('keyup', onKeyUp);
      routePanel.removeEventListener('keydown', onRouteKeyDown);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      [hud, live, instr, ctrlHint, routePanel].forEach(function (nd) { try { if (nd.parentNode) nd.parentNode.removeChild(nd); } catch (e) {} });
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
          var s = makeLabelSprite(THREE, ch.label, '#a5b4fc', VR_BANK_FONT);
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
          xrRig.position.x = _cl(_teleTmp.x, palace.bounds.minX + 40, palace.bounds.maxX - 40);
          xrRig.position.z = _cl(_teleTmp.z, palace.bounds.minZ + 40, palace.bounds.maxZ - 40);
          _teleFlash = 1; _xrHapticPulse(0.6, 30);
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
          xrRig.position.x += (fwd * -sinY + str * cosY) * stepW;
          xrRig.position.z += (fwd * -cosY + str * -sinY) * stepW;
          xrRig.position.x = _cl(xrRig.position.x, palace.bounds.minX + 40, palace.bounds.maxX - 40);
          xrRig.position.z = _cl(xrRig.position.z, palace.bounds.minZ + 40, palace.bounds.maxZ - 40);
        }
        if (Math.abs(snap) > 0.7) { if (_xrSnapArmed) { xrRig.rotation.y -= (snap > 0 ? 1 : -1) * VR_SNAP_DEG * Math.PI / 180; _xrSnapArmed = false; } }
        else if (Math.abs(snap) < 0.3) { _xrSnapArmed = true; }
        // Teleport aim marker: show where a downward-pointing controller would land.
        if (_teleMarker) {
          if (!_teleTmp) _teleTmp = new THREE.Vector3();
          var shown = false;
          if (_xrCtrls) for (var k = 0; k < _xrCtrls.length; k++) {
            if (_xrFloorHit(_xrCtrls[k], _teleTmp)) {
              _teleMarker.position.set(_cl(_teleTmp.x, palace.bounds.minX + 40, palace.bounds.maxX - 40), 2, _cl(_teleTmp.z, palace.bounds.minZ + 40, palace.bounds.maxZ - 40));
              _teleMarker.visible = true; shown = true; break;
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
    function tick() {
      if (state.disposed) return;
      // While an immersive session drives the frame loop (state.xrActive), the
      // HEADSET owns the camera pose — skip all rail/free-roam camera writes and
      // let the XR compositor schedule frames (no window rAF). Controllers still
      // drive locomotion (thumbstick) each frame.
      if (state.xrActive) { _xrLocomotion(); _pulseHl(); _animateFlourish(); renderer.render(root, camera); return; }
      if (freeMode) {
        // WASD free walk on the floor plane; free-look via freeYaw/freePitch.
        if (moveF || moveR) {
          var sinY = Math.sin(freeYaw), cosY = Math.cos(freeYaw);
          camPos.x += (moveF * sinY + moveR * cosY) * MOVE_SPEED;
          camPos.z += (moveF * cosY - moveR * sinY) * MOVE_SPEED;
          var b = palace.bounds;
          camPos.x = _cl(camPos.x, b.minX + 40, b.maxX - 40);   // stay inside the palace footprint
          camPos.z = _cl(camPos.z, b.minZ + 40, b.maxZ - 40);
        }
        camPos.y = EYE;
        var cp = Math.cos(freePitch);
        lookBase.set(camPos.x + Math.sin(freeYaw) * cp, camPos.y + Math.sin(freePitch), camPos.z + Math.cos(freeYaw) * cp);
        camPosT.copy(camPos); lookT.copy(lookBase); look.copy(lookBase);   // sync rails so a later ◀▶ eases from here
        camera.position.copy(camPos);
        camera.lookAt(lookBase);
      } else {
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
      }
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
  }

  // ── render — public imperative API. Returns { destroy, goTo, fellBack }. ──
  function render(container, data, opts) {
    opts = opts || {};
    var t = opts.t || function (k) { return k; };
    if (!container) return { destroy: function () {}, goTo: function () {}, fellBack: true };
    var palace = (data && data.version === VERSION && data.route) ? data : buildPalace(data, opts);
    while (container.firstChild) container.removeChild(container.firstChild);

    var routeEl = buildRouteDom(palace, t, false, !!opts.recall, opts.decor);   // sr-only while 3D is live
    container.appendChild(routeEl);

    var state = { raf: 0, renderer: null, scene: null, disposed: false, onResize: null, cleanup: [], goTo: null, revealLocus: null, setLocusStatus: null };
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
    function revealLocus(id) { try { if (state.revealLocus) state.revealLocus(id); } catch (e) {} }
    function setLocusStatus(id, status) { try { if (state.setLocusStatus) state.setLocusStatus(id, status); } catch (e) {} }
    function setLocusImage(id, img) { try { if (state.setLocusImage) state.setLocusImage(id, img); } catch (e) {} }
    function setLocusRelief(id, img, depth) { try { if (state.setLocusRelief) state.setLocusRelief(id, img, depth); else if (state.setLocusImage) state.setLocusImage(id, img); } catch (e) {} }
    function setLocusObject(id, recipe) { try { if (state.setLocusObject) state.setLocusObject(id, recipe); } catch (e) {} }
    function replaceLocusObject(id, recipe) { try { if (state.replaceLocusObject) state.replaceLocusObject(id, recipe); } catch (e) {} }
    function clearLocus(id) { try { if (state.clearLocus) state.clearLocus(id); } catch (e) {} }
    function setDecor(d) { try { if (state.setDecor) state.setDecor(d); } catch (e) {} }
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
      return { destroy: destroy, goTo: goTo, revealLocus: revealLocus, setLocusStatus: setLocusStatus, setLocusImage: setLocusImage, setLocusRelief: setLocusRelief, setLocusObject: setLocusObject, replaceLocusObject: replaceLocusObject, clearLocus: clearLocus, setDecor: setDecor, fellBack: true };
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

    return { destroy: destroy, goTo: goTo, revealLocus: revealLocus, setLocusStatus: setLocusStatus, setLocusImage: setLocusImage, setLocusRelief: setLocusRelief, setLocusObject: setLocusObject, replaceLocusObject: replaceLocusObject, clearLocus: clearLocus, setDecor: setDecor, fellBack: false };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.MemoryPalace = {
    version: VERSION,
    PALETTE: PALETTE,
    THEME_KEYS: THEME_KEYS,
    buildPalace: buildPalace,
    navigateRoute: navigateRoute,
    decorSpot: decorSpot,
    landmarkSpot: landmarkSpot,
    describeLocusForSR: describeLocusForSR,
    describeLocusForRecall: describeLocusForRecall,
    buildRecallBank: buildRecallBank,
    matchAnswer: matchAnswer,
    scoreRecall: scoreRecall,
    buildPromptEvalPrompt: buildPromptEvalPrompt,
    parsePromptEval: parsePromptEval,
    buildRefinePrompt: buildRefinePrompt,
    buildDepthPrompt: buildDepthPrompt,
    updateMastery: updateMastery,
    dueLoci: dueLoci,
    masteryStrength: masteryStrength,
    isWebGLAvailable: isWebGLAvailable,
    loadThree: loadThree,
    render: render
  };
  console.log('[MemoryPalace] Registered (method-of-loci 3D walk; lazy three.js, route-list fallback)');
})();
