// seating_chart_source.jsx — teacher seating chart over the class roster (Ring 0+1).
//
// Design (2026-07-21, Aaron): a malleable classroom map bound to rosterKey —
// drag desks/furniture freely or start from templates (rows/pairs/pods/
// horseshoe), click-assign students, then declare seating constraints
// (keep apart / keep together / front of room / near teacher / near door /
// away from windows / fixed seat) and let a LOCAL deterministic solver
// (greedy + swap repair) produce an arrangement that satisfies them.
//
// Deliberate non-goals, pinned:
//   * NO AI in the loop. "Optimal" here means "satisfies the constraints the
//     educator declared" — the solver never claims pedagogy. Constraint labels
//     encode sensitive facts (behavior conflicts, IEP/504 preferential
//     seating), so nothing in this module ever leaves the device: the chart,
//     constraints, and names live inside rosterKey (localStorage +
//     teacher-managed JSON export), same boundary as the roster itself.
//   * tr() runtime-AI localization translates UI CHROME only — student names,
//     class names, and constraint contents are DATA and are never sent.
//   * Every map is also a list: the List view renders the same seats as a
//     row-major table of native <select>s for full keyboard/AT parity.
//
// Persistence: rosterKey.seating = normalizeSeating(...) — travels with the
// roster's existing export/import JSON (exportVersion 2 spreads it; import
// preserves it explicitly in teacher_source.jsx).
//
// This module is build-generated — edit THIS .jsx, then run
// node _build_seating_chart_module.js.

// ── UI localization (runtime-AI, self-contained; NEVER touches lang/*.js) ──
// English text IS the key; tr() collects display strings and a per-render
// effect batch-translates missing ones into the teacher's interface language
// via window.callGemini, cached per-device. English fallback. (Pattern:
// view_submission_inbox_source.jsx.)
var SC_I18N_KEY = 'allo_seatingchart_ui_i18n_v1';
var LANG_CTX = (typeof window !== 'undefined' && window.AlloLanguageContext) || (typeof window !== 'undefined' && window.React ? window.React.createContext(null) : null);
var STR_REG = {};
var LL_CUR = { lang: 'English', cache: {} };
function llLoad() { try { return JSON.parse(localStorage.getItem(SC_I18N_KEY)) || {}; } catch (e) { return {}; } }
function llStore(v) { try { localStorage.setItem(SC_I18N_KEY, JSON.stringify(v)); } catch (e) {} }
function llInterp(s, params) { if (s == null || !params) return s; Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); return s; }
function tr(en, params) { if (en && typeof en === 'string') STR_REG[en] = true; var p = LL_CUR.cache[LL_CUR.lang]; return llInterp((p && p[en] != null) ? p[en] : en, params); }
function llCleanJson(raw) { var s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''); var f = s.indexOf('{'), l = s.lastIndexOf('}'); return f >= 0 && l > f ? s.slice(f, l + 1) : s; }
function llSanitize(obj, wanted) { if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null; var out = {}, n = 0; wanted.forEach(function (k) { var v = obj[k]; if (typeof v === 'string') { v = v.slice(0, 400); if (v) { out[k] = v; n++; } } }); return n ? out : null; }
function llPrompt(langName, list) { return ['Translate these user-interface labels for a teacher classroom seating chart tool into natural, concise ' + langName + ' (buttons, headings, hints — keep them short and professional).', 'Keep any {tokens}, numbers, and any emoji EXACTLY as written. No commentary.', 'Return ONLY a JSON object mapping each ENGLISH string (used verbatim as the key) to its ' + langName + ' translation.', JSON.stringify(list)].join(String.fromCharCode(10)); }

// ═══════════════════════════════════════════════════════════════
// PURE MODEL — geometry, templates, constraints, scoring, solver.
// Everything above the UI takes plain data and returns plain data
// (unit-tested in tests/seating_chart.test.js).
// ═══════════════════════════════════════════════════════════════

// Abstract room units (not pixels): room is 100 × 62, board along the top
// edge (y = 0 is the FRONT of the room). Default desk footprint 10 × 7.
var ROOM_W = 100;
var ROOM_H = 62;
var SEAT_W = 10;
var SEAT_H = 7;
// Two seats are "adjacent" when their centers are closer than this — used by
// keep-apart / keep-together. A hair over one diagonal desk pitch so diagonal
// neighbors in a tight grid still count as adjacent.
var ADJ_DIST = 14;
// Pod membership uses a TIGHTER radius than constraint adjacency: template
// pitch is 11 within a pod/pair but 13 between stacked rows, so 12 groups
// true pods without chaining whole columns of a tight grid into one blob.
var POD_DIST = 12;
// "Near" a furniture anchor (teacher desk / door) — about a third of the room.
var NEAR_RADIUS = 32;
// "Away from windows" — violated inside this radius of any window.
var WINDOW_RADIUS = 20;

var FURNITURE_KINDS = [
  { kind: 'teacher_desk', w: 16, h: 8 },
  { kind: 'table', w: 16, h: 10 },
  { kind: 'rug', w: 20, h: 14 },
  { kind: 'shelf', w: 14, h: 4 },
  { kind: 'door', w: 8, h: 3 },
  { kind: 'window', w: 14, h: 3 },
];

var CONSTRAINT_TYPES = [
  { type: 'keep_apart', pair: true },
  { type: 'keep_together', pair: true },
  { type: 'front_row', pair: false },
  { type: 'near_teacher', pair: false, anchor: 'teacher_desk' },
  { type: 'near_door', pair: false, anchor: 'door' },
  { type: 'avoid_window', pair: false, anchor: 'window' },
  { type: 'fixed_seat', pair: false },
];

var CONSTRAINT_WEIGHTS = {
  fixed_seat: 500,
  keep_apart: 120,
  keep_together: 60,
  front_row: 50,
  near_teacher: 40,
  near_door: 40,
  avoid_window: 40,
};

function clampNum(v, lo, hi, d) {
  var n = typeof v === 'number' && isFinite(v) ? v : d;
  return Math.max(lo, Math.min(hi, n));
}

// Deterministic PRNG — solver results must be reproducible per seed so
// "Reshuffle" is just seed+1 and tests can pin outcomes.
function makeRng(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffled(arr, rng) {
  var out = arr.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// Smallest unused "<prefix><n>" id — pure, collision-free against existing.
function nextId(existingIds, prefix) {
  var max = 0;
  (existingIds || []).forEach(function (id) {
    var m = /^(.*?)(\d+)$/.exec(String(id || ''));
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  });
  return prefix + (max + 1);
}

function seatCenter(s) { return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }
function centerDist(a, b) {
  var ca = seatCenter(a), cb = seatCenter(b);
  var dx = ca.x - cb.x, dy = ca.y - cb.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeSeat(raw, taken) {
  if (!raw || typeof raw !== 'object') return null;
  var id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id || taken[id]) return null;
  taken[id] = 1;
  var w = clampNum(raw.w, 4, 30, SEAT_W);
  var h = clampNum(raw.h, 3, 30, SEAT_H);
  return {
    id: id,
    x: clampNum(raw.x, 0, ROOM_W - w, 0),
    y: clampNum(raw.y, 0, ROOM_H - h, 0),
    w: w,
    h: h,
  };
}

function normalizeFurniture(raw, taken) {
  if (!raw || typeof raw !== 'object') return null;
  var id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id || taken[id]) return null;
  var kind = FURNITURE_KINDS.some(function (k) { return k.kind === raw.kind; }) ? raw.kind : 'table';
  var spec = FURNITURE_KINDS.filter(function (k) { return k.kind === kind; })[0];
  taken[id] = 1;
  var w = clampNum(raw.w, 2, 60, spec.w);
  var h = clampNum(raw.h, 2, 40, spec.h);
  return {
    id: id,
    kind: kind,
    x: clampNum(raw.x, 0, ROOM_W - w, 0),
    y: clampNum(raw.y, 0, ROOM_H - h, 0),
    w: w,
    h: h,
    label: raw.label != null ? String(raw.label).slice(0, 40) : '',
  };
}

function normalizeConstraint(raw, studentSet, seatSet, taken) {
  if (!raw || typeof raw !== 'object') return null;
  var spec = CONSTRAINT_TYPES.filter(function (c) { return c.type === raw.type; })[0];
  if (!spec) return null;
  var id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id || taken[id]) return null;
  var students = Array.isArray(raw.students) ? raw.students.filter(function (s) { return typeof s === 'string' && studentSet[s]; }) : [];
  if (spec.pair) {
    if (students.length < 2 || students[0] === students[1]) return null;
    students = students.slice(0, 2);
  } else {
    if (students.length < 1) return null;
    students = students.slice(0, 1);
  }
  var out = { id: id, type: raw.type, students: students };
  if (raw.type === 'fixed_seat') {
    var seatId = typeof raw.seatId === 'string' ? raw.seatId : null;
    if (!seatId || !seatSet[seatId]) return null;
    out.seatId = seatId;
  }
  taken[id] = 1;
  return out;
}

function normalizeLayout(raw, taken) {
  if (!raw || typeof raw !== 'object') return null;
  var id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id || taken[id]) return null;
  taken[id] = 1;
  var idsTaken = {};
  var seats = (Array.isArray(raw.seats) ? raw.seats : []).map(function (s) { return normalizeSeat(s, idsTaken); }).filter(Boolean).slice(0, 60);
  var furniture = (Array.isArray(raw.furniture) ? raw.furniture : []).map(function (f) { return normalizeFurniture(f, idsTaken); }).filter(Boolean).slice(0, 30);
  var seatSet = {};
  seats.forEach(function (s) { seatSet[s.id] = 1; });
  var assignments = {};
  if (raw.assignments && typeof raw.assignments === 'object') {
    var used = {};
    Object.keys(raw.assignments).forEach(function (seatId) {
      var name = raw.assignments[seatId];
      if (seatSet[seatId] && typeof name === 'string' && name && !used[name]) {
        assignments[seatId] = name;
        used[name] = 1;
      }
    });
  }
  return {
    id: id,
    name: raw.name != null && String(raw.name).trim() ? String(raw.name).slice(0, 60) : 'Layout',
    seats: seats,
    furniture: furniture,
    assignments: assignments,
  };
}

// rosterKey.seating → validated model. Tolerates anything (bad JSON imports,
// older versions); never throws. Constraints are chart-level (shared by all
// layouts) because they describe STUDENTS, not rooms.
function normalizeSeating(raw, studentNames) {
  var src = raw && typeof raw === 'object' ? raw : {};
  var layoutsTaken = {};
  var layoutsRaw = src.layouts && typeof src.layouts === 'object' ? src.layouts : {};
  var layouts = {};
  Object.keys(layoutsRaw).forEach(function (k) {
    var l = normalizeLayout(layoutsRaw[k], layoutsTaken);
    if (l && l.id === k) layouts[k] = l;
  });
  var layoutIds = Object.keys(layouts);
  var activeLayoutId = typeof src.activeLayoutId === 'string' && layouts[src.activeLayoutId] ? src.activeLayoutId : (layoutIds[0] || null);
  var studentSet = {};
  (studentNames || []).forEach(function (n) { studentSet[n] = 1; });
  var seatSet = {};
  if (activeLayoutId) layouts[activeLayoutId].seats.forEach(function (s) { seatSet[s.id] = 1; });
  var cTaken = {};
  var constraints = (Array.isArray(src.constraints) ? src.constraints : [])
    .map(function (c) { return normalizeConstraint(c, studentSet, seatSet, cTaken); })
    .filter(Boolean)
    .slice(0, 80);
  // Arrangement history — class-level "the room changed" events (auto-arrange
  // runs, new layouts). BehaviorLens reads these as candidate phase markers on
  // single-case graphs: a seating change is an environmental intervention and
  // deserves a visible line, not a memory.
  var history = (Array.isArray(src.history) ? src.history : [])
    .filter(function (e) { return e && typeof e === 'object' && typeof e.at === 'string' && !isNaN(Date.parse(e.at)); })
    .map(function (e) {
      return {
        at: e.at,
        layoutId: typeof e.layoutId === 'string' ? e.layoutId : '',
        layoutName: e.layoutName != null ? String(e.layoutName).slice(0, 60) : '',
        kind: e.kind === 'created' ? 'created' : 'solve',
      };
    })
    .slice(-50);
  return {
    version: 1,
    activeLayoutId: activeLayoutId,
    layouts: layouts,
    constraints: constraints,
    solveSeed: clampNum(src.solveSeed, 1, 1e9, 1),
    history: history,
  };
}

// Append an arrangement-history event (pure; caller commits the result).
function pushHistory(seating, layout, kind, atIso) {
  var entry = { at: atIso, layoutId: layout.id, layoutName: layout.name, kind: kind === 'created' ? 'created' : 'solve' };
  var history = (seating.history || []).concat([entry]).slice(-50);
  return Object.assign({}, seating, { history: history });
}

// ── Templates ── deterministic seat generators sized to the class.
function buildTemplate(kind, count) {
  var n = Math.max(1, Math.min(60, Math.round(count) || 0));
  var seats = [];
  var marginX = 6, topY = 10, gapY = 4;
  var i, r, c;
  function push(x, y) {
    seats.push({ id: 'seat' + (seats.length + 1), x: Math.round(x), y: Math.round(y), w: SEAT_W, h: SEAT_H });
  }
  if (kind === 'pods') {
    // Pods of 4 (2×2), pods laid out in a grid.
    var pods = Math.ceil(n / 4);
    var podCols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(pods * 1.6))));
    var podRows = Math.ceil(pods / podCols);
    var podW = SEAT_W * 2 + 1, podH = SEAT_H * 2 + 1;
    var spanX = (ROOM_W - 2 * marginX - podW) / Math.max(1, podCols - 1);
    var spanY = (ROOM_H - topY - 6 - podH) / Math.max(1, podRows - 1);
    for (i = 0; i < n; i++) {
      var pod = Math.floor(i / 4), slot = i % 4;
      var px = podCols > 1 ? marginX + (pod % podCols) * spanX : (ROOM_W - podW) / 2;
      var py = podRows > 1 ? topY + Math.floor(pod / podCols) * spanY : (ROOM_H - topY - podH) / 2 + topY;
      push(px + (slot % 2) * (SEAT_W + 1), py + Math.floor(slot / 2) * (SEAT_H + 1));
    }
  } else if (kind === 'horseshoe') {
    // U open toward the board: left column ↓, bottom row →, right column ↑.
    var sideCount = Math.floor(n / 3);
    var bottomCount = n - 2 * sideCount;
    var leftX = marginX, rightX = ROOM_W - marginX - SEAT_W;
    var sideSpan = (ROOM_H - topY - 8 - SEAT_H) / Math.max(1, sideCount - 1 || 1);
    for (i = 0; i < sideCount; i++) push(leftX, topY + i * sideSpan);
    var bottomSpan = (ROOM_W - 2 * (marginX + SEAT_W + 3) - SEAT_W) / Math.max(1, bottomCount - 1 || 1);
    for (i = 0; i < bottomCount; i++) push(marginX + SEAT_W + 3 + i * bottomSpan, ROOM_H - SEAT_H - 4);
    for (i = sideCount - 1; i >= 0; i--) push(rightX, topY + i * sideSpan);
  } else {
    // rows (default) and pairs: grid, front-filled.
    var pair = kind === 'pairs';
    var cols = pair ? 2 * Math.max(1, Math.min(4, Math.ceil(n / 8))) : Math.max(1, Math.min(8, Math.ceil(Math.sqrt(n * 1.6))));
    var rows = Math.ceil(n / cols);
    var unitW = pair ? SEAT_W * 2 + 1 : SEAT_W;
    var units = pair ? cols / 2 : cols;
    var spanX = units > 1 ? (ROOM_W - 2 * marginX - unitW) / (units - 1) : 0;
    var spanY = rows > 1 ? Math.min(SEAT_H + gapY + 3, (ROOM_H - topY - 6 - SEAT_H) / (rows - 1)) : 0;
    for (i = 0; i < n; i++) {
      r = Math.floor(i / cols); c = i % cols;
      var x;
      if (pair) {
        var unit = Math.floor(c / 2);
        x = (units > 1 ? marginX + unit * spanX : (ROOM_W - unitW) / 2) + (c % 2) * (SEAT_W + 1);
      } else {
        x = units > 1 ? marginX + c * spanX : (ROOM_W - unitW) / 2;
      }
      push(x, topY + r * spanY);
    }
  }
  // Every template ships a teacher desk + door so anchor constraints work
  // out of the box; teachers drag them to match their actual room.
  var furniture = [
    { id: 'furn1', kind: 'teacher_desk', x: ROOM_W - 22, y: 1, w: 16, h: 8, label: '' },
    { id: 'furn2', kind: 'door', x: 2, y: 1, w: 8, h: 3, label: '' },
  ];
  return { seats: seats, furniture: furniture };
}

// ── Scoring ──
// assignments: {seatId → studentName}. Returns {score, violations:[{id,type,
// students, message}]}. Constraints whose anchor furniture is missing are
// SKIPPED here (surfaced separately by anchorGaps) so the solver never chases
// unfixable cost.
function scoreAssignment(layout, assignments, constraints) {
  var seatById = {};
  layout.seats.forEach(function (s) { seatById[s.id] = s; });
  var seatOf = {};
  Object.keys(assignments).forEach(function (seatId) {
    if (seatById[seatId] && assignments[seatId]) seatOf[assignments[seatId]] = seatById[seatId];
  });
  var anchors = {};
  layout.furniture.forEach(function (f) { (anchors[f.kind] = anchors[f.kind] || []).push(f); });
  var frontCutoff = null;
  if (layout.seats.length > 1) {
    var ys = layout.seats.map(function (s) { return seatCenter(s).y; });
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    frontCutoff = maxY > minY ? minY + (maxY - minY) / 3 : null;
  }
  function nearestDist(seat, kind) {
    var list = anchors[kind] || [];
    if (!list.length) return null;
    var best = Infinity;
    list.forEach(function (f) { best = Math.min(best, centerDist(seat, f)); });
    return best;
  }
  var score = 0;
  var violations = [];
  (constraints || []).forEach(function (c) {
    var a = seatOf[c.students[0]];
    var w = CONSTRAINT_WEIGHTS[c.type] || 40;
    var bad = false;
    var msg = '';
    if (c.type === 'keep_apart' || c.type === 'keep_together') {
      var b = seatOf[c.students[1]];
      if (!a || !b) return; // unseated students can't violate pair constraints
      var d = centerDist(a, b);
      if (c.type === 'keep_apart' && d < ADJ_DIST) { bad = true; msg = 'seated next to each other'; }
      if (c.type === 'keep_together' && d > ADJ_DIST) { bad = true; msg = 'not seated together'; }
    } else if (!a) {
      return; // unseated
    } else if (c.type === 'fixed_seat') {
      if (!(assignments[c.seatId] === c.students[0])) { bad = true; msg = 'not in their assigned seat'; }
    } else if (c.type === 'front_row') {
      if (frontCutoff != null && seatCenter(a).y > frontCutoff) { bad = true; msg = 'not near the front'; }
    } else if (c.type === 'near_teacher' || c.type === 'near_door') {
      var kind = c.type === 'near_teacher' ? 'teacher_desk' : 'door';
      var nd = nearestDist(a, kind);
      if (nd != null && nd > NEAR_RADIUS) { bad = true; msg = c.type === 'near_teacher' ? 'far from the teacher desk' : 'far from the door'; }
    } else if (c.type === 'avoid_window') {
      var wd = nearestDist(a, 'window');
      if (wd != null && wd < WINDOW_RADIUS) { bad = true; msg = 'seated by a window'; }
    }
    if (bad) {
      score += w;
      violations.push({ id: c.id, type: c.type, students: c.students.slice(), message: msg });
    }
  });
  return { score: score, violations: violations };
}

// Constraints that reference furniture the map doesn't have — the UI turns
// these into "add a door to the map" hints instead of silent no-ops.
function anchorGaps(layout, constraints) {
  var kinds = {};
  layout.furniture.forEach(function (f) { kinds[f.kind] = 1; });
  var gaps = [];
  (constraints || []).forEach(function (c) {
    var spec = CONSTRAINT_TYPES.filter(function (s) { return s.type === c.type; })[0];
    if (spec && spec.anchor && !kinds[spec.anchor]) gaps.push({ id: c.id, type: c.type, anchor: spec.anchor, students: c.students.slice() });
  });
  return gaps;
}

// ── Solver ── greedy most-constrained-first + pairwise swap repair.
// Deterministic per seed. Returns {assignments, score, violations}.
function solveSeating(layout, studentNames, constraints, opts) {
  opts = opts || {};
  var rng = makeRng(clampNum(opts.seed, 1, 1e9, 1));
  var seats = layout.seats;
  if (!seats.length) return { assignments: {}, score: 0, violations: [] };
  var students = (studentNames || []).slice(0, seats.length);
  var cons = constraints || [];

  var assignments = {};
  var placed = {};
  // 1. Fixed seats first (last write wins per student; first wins per seat).
  cons.forEach(function (c) {
    if (c.type !== 'fixed_seat' || placed[c.students[0]] || assignments[c.seatId]) return;
    if (students.indexOf(c.students[0]) === -1) return;
    assignments[c.seatId] = c.students[0];
    placed[c.students[0]] = 1;
  });
  // 2. Greedy: most-constrained student first, best marginal seat.
  var degree = {};
  cons.forEach(function (c) { c.students.forEach(function (s) { degree[s] = (degree[s] || 0) + 1; }); });
  var queue = students.filter(function (s) { return !placed[s]; }).sort(function (a, b) {
    var d = (degree[b] || 0) - (degree[a] || 0);
    return d !== 0 ? d : (a < b ? -1 : a > b ? 1 : 0);
  });
  var seatOrder = shuffled(seats, rng);
  queue.forEach(function (student) {
    var bestSeat = null, bestScore = Infinity;
    seatOrder.forEach(function (seat) {
      if (assignments[seat.id]) return;
      assignments[seat.id] = student;
      var s = scoreAssignment(layout, assignments, cons).score;
      delete assignments[seat.id];
      if (s < bestScore) { bestScore = s; bestSeat = seat; }
    });
    if (bestSeat) assignments[bestSeat.id] = student;
  });
  // 3. Swap repair until stable (bounded passes). Fixed-seat students stay put.
  var fixedSeats = {};
  cons.forEach(function (c) { if (c.type === 'fixed_seat' && assignments[c.seatId] === c.students[0]) fixedSeats[c.seatId] = 1; });
  var seatIds = seats.map(function (s) { return s.id; });
  var current = scoreAssignment(layout, assignments, cons).score;
  for (var pass = 0; pass < 8 && current > 0; pass++) {
    var improved = false;
    for (var i = 0; i < seatIds.length; i++) {
      for (var j = i + 1; j < seatIds.length; j++) {
        var si = seatIds[i], sj = seatIds[j];
        if (fixedSeats[si] || fixedSeats[sj]) continue;
        if (!assignments[si] && !assignments[sj]) continue;
        var vi = assignments[si], vj = assignments[sj];
        if (vj != null) assignments[si] = vj; else delete assignments[si];
        if (vi != null) assignments[sj] = vi; else delete assignments[sj];
        var s2 = scoreAssignment(layout, assignments, cons).score;
        if (s2 < current) { current = s2; improved = true; }
        else {
          if (vi != null) assignments[si] = vi; else delete assignments[si];
          if (vj != null) assignments[sj] = vj; else delete assignments[sj];
        }
      }
    }
    if (!improved) break;
  }
  var finalScore = scoreAssignment(layout, assignments, cons);
  return { assignments: assignments, score: finalScore.score, violations: finalScore.violations };
}

// ── Printable SVG ── pure string builder (also unit-tested). Renders the
// active layout at 900×~560 with names, for the print iframe.
function escapeXml(s) {
  return String(s == null ? '' : s).replace(/[<>&"']/g, function (ch) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch];
  });
}
function buildPrintableSvg(layout, displayNameOf, title) {
  var SCALE = 9;
  var W = ROOM_W * SCALE, H = ROOM_H * SCALE + 40;
  var parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="system-ui, sans-serif">');
  parts.push('<text x="' + (W / 2) + '" y="24" text-anchor="middle" font-size="20" font-weight="bold">' + escapeXml(title || 'Seating Chart') + '</text>');
  parts.push('<g transform="translate(0,40)">');
  parts.push('<rect x="0" y="0" width="' + W + '" height="' + (ROOM_H * SCALE) + '" fill="none" stroke="#334155" stroke-width="2"/>');
  parts.push('<rect x="' + (W * 0.2) + '" y="0" width="' + (W * 0.6) + '" height="6" fill="#334155"/>');
  parts.push('<text x="' + (W / 2) + '" y="22" text-anchor="middle" font-size="12" fill="#64748b">' + escapeXml(tr('Front of room')) + '</text>');
  layout.furniture.forEach(function (f) {
    parts.push('<rect x="' + (f.x * SCALE) + '" y="' + (f.y * SCALE) + '" width="' + (f.w * SCALE) + '" height="' + (f.h * SCALE) + '" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 3"/>');
    parts.push('<text x="' + ((f.x + f.w / 2) * SCALE) + '" y="' + ((f.y + f.h / 2) * SCALE + 4) + '" text-anchor="middle" font-size="11" fill="#64748b">' + escapeXml(f.label || furnitureLabel(f.kind)) + '</text>');
  });
  layout.seats.forEach(function (s) {
    var name = layout.assignments[s.id] || '';
    parts.push('<rect x="' + (s.x * SCALE) + '" y="' + (s.y * SCALE) + '" width="' + (s.w * SCALE) + '" height="' + (s.h * SCALE) + '" rx="8" fill="' + (name ? '#eef2ff' : '#ffffff') + '" stroke="#6366f1" stroke-width="1.5"/>');
    if (name) {
      parts.push('<text x="' + ((s.x + s.w / 2) * SCALE) + '" y="' + ((s.y + s.h / 2) * SCALE + 4) + '" text-anchor="middle" font-size="13" font-weight="600" fill="#1e293b">' + escapeXml(displayNameOf ? displayNameOf(name) : name) + '</text>');
    }
  });
  parts.push('</g></svg>');
  return parts.join('');
}

// ── BehaviorLens bridge ── plain-English positional description of a
// student's seat, for ABC "Setting / Location" enrichment. PURE: takes the
// whole rosterKey, matches by roster key or display name, describes position
// only. Peer names are included ONLY with opts.includeNeighbors (deliberate
// opt-in — ABC data lives in one student's clinical record, and neighbors'
// names should arrive there intentionally, not automatically). Deliberately
// NOT localized: this string becomes clinical record DATA, not UI chrome.
function describeSeatForStudent(rosterKey, studentName, opts) {
  opts = opts || {};
  if (!rosterKey || typeof rosterKey !== 'object' || !studentName) return null;
  var students = (rosterKey.students && typeof rosterKey.students === 'object') ? rosterKey.students : {};
  var displayNames = (rosterKey.displayNames && typeof rosterKey.displayNames === 'object') ? rosterKey.displayNames : {};
  var names = Object.keys(students);
  var seating = normalizeSeating(rosterKey.seating, names);
  var layout = seating.activeLayoutId ? seating.layouts[seating.activeLayoutId] : null;
  if (!layout || !layout.seats.length) return null;
  // Resolve the student: exact roster key, then display-name match.
  var want = String(studentName).trim().toLowerCase();
  var key = null;
  names.forEach(function (n) { if (!key && n.trim().toLowerCase() === want) key = n; });
  if (!key) names.forEach(function (n) { if (!key && String(displayNames[n] || '').trim().toLowerCase() === want) key = n; });
  if (!key) return null;
  var seatId = null;
  Object.keys(layout.assignments).forEach(function (sid) { if (!seatId && layout.assignments[sid] === key) seatId = sid; });
  if (!seatId) return null;
  var seat = layout.seats.filter(function (s) { return s.id === seatId; })[0];
  var sorted = layout.seats.slice().sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
  var seatNo = sorted.indexOf(seat) + 1;
  var parts = ['Seat ' + seatNo];
  // Row band by seat-center thirds (front = board side, y small).
  if (layout.seats.length > 1) {
    var ys = layout.seats.map(function (s) { return seatCenter(s).y; });
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    if (maxY > minY) {
      var band = (seatCenter(seat).y - minY) / (maxY - minY);
      parts.push(band < 1 / 3 ? 'front of room' : band > 2 / 3 ? 'back of room' : 'middle of room');
    }
  }
  var podMates = layout.seats.filter(function (s) { return s.id !== seat.id && centerDist(s, seat) < POD_DIST; });
  parts.push(podMates.length ? 'pod of ' + (podMates.length + 1) : 'single desk');
  var anchors = {};
  layout.furniture.forEach(function (f) { (anchors[f.kind] = anchors[f.kind] || []).push(f); });
  function within(kind, radius) {
    return (anchors[kind] || []).some(function (f) { return centerDist(seat, f) <= radius; });
  }
  if (within('teacher_desk', NEAR_RADIUS)) parts.push('near teacher desk');
  if (within('door', NEAR_RADIUS)) parts.push('near door');
  if (within('window', WINDOW_RADIUS)) parts.push('by window');
  if (opts.includeNeighbors) {
    var neighborNames = podMates
      .map(function (s) { return layout.assignments[s.id]; })
      .filter(Boolean)
      .map(function (n) { return String(displayNames[n] || n); });
    if (neighborNames.length) parts.push('next to ' + neighborNames.join(', '));
  }
  return layout.name + ': ' + parts.join(', ');
}

// ── Class Goals bridge (Ring B) ── pods on the active layout, detected by
// POD_DIST clustering (tighter than constraint adjacency — see note there),
// ordered row-major by their front-most/left-most seat. PURE. A "pod" needs
// ≥2 seats; students = assigned roster names in seat order. Used by the
// Class Goals team picker — pods are positional, so callers resolve
// 'pod:<index>' against the CURRENT active layout at award time.
function listPods(rosterKey) {
  if (!rosterKey || typeof rosterKey !== 'object') return [];
  var students = (rosterKey.students && typeof rosterKey.students === 'object') ? rosterKey.students : {};
  var seating = normalizeSeating(rosterKey.seating, Object.keys(students));
  var layout = seating.activeLayoutId ? seating.layouts[seating.activeLayoutId] : null;
  if (!layout || layout.seats.length < 2) return [];
  var seats = layout.seats;
  // Union seats into adjacency clusters (BFS).
  var clusterOf = {};
  var clusters = [];
  seats.forEach(function (seed) {
    if (clusterOf[seed.id] != null) return;
    var idx = clusters.length;
    var queue = [seed];
    clusterOf[seed.id] = idx;
    var members = [];
    while (queue.length) {
      var cur = queue.pop();
      members.push(cur);
      seats.forEach(function (other) {
        if (clusterOf[other.id] != null) return;
        if (centerDist(cur, other) < POD_DIST) {
          clusterOf[other.id] = idx;
          queue.push(other);
        }
      });
    }
    clusters.push(members);
  });
  var pods = clusters
    .filter(function (members) { return members.length >= 2; })
    .map(function (members) {
      var sorted = members.slice().sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
      return {
        anchor: sorted[0],
        seatIds: sorted.map(function (s) { return s.id; }),
        students: sorted.map(function (s) { return layout.assignments[s.id]; }).filter(Boolean),
      };
    })
    .sort(function (a, b) { return (a.anchor.y - b.anchor.y) || (a.anchor.x - b.anchor.x); });
  return pods.map(function (pod, i) {
    return {
      index: i + 1,
      seatIds: pod.seatIds,
      students: pod.students,
      label: 'Pod ' + (i + 1) + ' (' + pod.seatIds.length + ' seats' + (pod.students.length ? ', ' + pod.students.length + ' seated' : '') + ')',
    };
  });
}

function furnitureLabel(kind) {
  if (kind === 'teacher_desk') return tr('Teacher desk');
  if (kind === 'table') return tr('Table');
  if (kind === 'rug') return tr('Rug');
  if (kind === 'shelf') return tr('Shelf');
  if (kind === 'door') return tr('Door');
  if (kind === 'window') return tr('Window');
  return kind;
}
function constraintTypeLabel(type) {
  if (type === 'keep_apart') return tr('Keep apart');
  if (type === 'keep_together') return tr('Keep together');
  if (type === 'front_row') return tr('Front of room');
  if (type === 'near_teacher') return tr('Near teacher desk');
  if (type === 'near_door') return tr('Near the door');
  if (type === 'avoid_window') return tr('Away from windows');
  if (type === 'fixed_seat') return tr('Fixed seat');
  return type;
}

// ═══════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════

var FURN_EMOJI = { teacher_desk: '🧑‍🏫', table: '🟫', rug: '🟪', shelf: '📚', door: '🚪', window: '🪟' };

// Resolved once at module scope (like teacher_module) so the hook identity is
// stable across renders — the host app registers __alloHooks before any CDN
// module loads.
var _scHooks = (typeof window !== 'undefined' && window.__alloHooks) || {};
var useFocusTrap = _scHooks.useFocusTrap || function () {};

function SeatingChartPanel({ isOpen, onClose, rosterKey, setRosterKey, t, addToast }) {
  // ── UI localization state (drives tr() above) ──
  var _llCtx = React.useContext(LANG_CTX);
  var uiLang = (_llCtx && _llCtx.currentUiLanguage) || (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
  var _llCacheRef = React.useRef(llLoad());
  var _llAttemptedRef = React.useRef({});
  var _setLlTick = React.useState(0)[1];
  LL_CUR.lang = uiLang; LL_CUR.cache = _llCacheRef.current;
  React.useEffect(function () {
    if (uiLang === 'English' || typeof window === 'undefined' || typeof window.callGemini !== 'function') return undefined;
    var cache = _llCacheRef.current[uiLang] || {}, attempted = _llAttemptedRef.current[uiLang] || {};
    var missing = Object.keys(STR_REG).filter(function (k) { return !cache[k] && !attempted[k]; });
    if (!missing.length) return undefined;
    var att = _llAttemptedRef.current[uiLang] || (_llAttemptedRef.current[uiLang] = {});
    var to = setTimeout(function () {
      var list = missing.slice(0, 200); list.forEach(function (k) { att[k] = true; });
      Promise.resolve().then(function () { return window.callGemini(llPrompt(uiLang, list)); }).then(function (raw) {
        var pack = null; try { pack = llSanitize(JSON.parse(llCleanJson(raw)), list); } catch (_) {}
        if (pack) { var next = Object.assign({}, _llCacheRef.current); next[uiLang] = Object.assign({}, next[uiLang] || {}, pack); _llCacheRef.current = next; llStore(next); _setLlTick(function (n) { return n + 1; }); }
      }).catch(function () {});
    }, 500);
    return function () { clearTimeout(to); };
  });

  const students = (rosterKey && rosterKey.students && typeof rosterKey.students === 'object') ? rosterKey.students : {};
  const groups = (rosterKey && rosterKey.groups) || {};
  const displayNames = (rosterKey && rosterKey.displayNames) || {};
  const studentNames = React.useMemo(() => Object.keys(students).sort(), [students]);
  const displayNameOf = (name) => (displayNames[name] && String(displayNames[name])) || name;
  const groupColorOf = (name) => {
    const g = groups[students[name]];
    return (g && g.color) || '#94a3b8';
  };

  const seating = React.useMemo(() => normalizeSeating(rosterKey && rosterKey.seating, studentNames), [rosterKey, studentNames]);
  const layout = seating.activeLayoutId ? seating.layouts[seating.activeLayoutId] : null;

  const [mode, setMode] = useState('assign');            // 'assign' | 'edit'
  const [view, setView] = useState('map');               // 'map' | 'list'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // edit mode: seat/furniture id
  const [showConstraints, setShowConstraints] = useState(false);
  const [lastSolve, setLastSolve] = useState(null);       // {score, violations}
  const [confirmState, setConfirmState] = useState(null); // {message, onYes}
  // Constraint form
  const [cType, setCType] = useState('keep_apart');
  const [cA, setCA] = useState('');
  const [cB, setCB] = useState('');
  const [cSeat, setCSeat] = useState('');

  const panelRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  useFocusTrap(panelRef, isOpen, onClose);

  const announce = (msg) => {
    try {
      var el = document.getElementById('allo-live-seating');
      if (el) { el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); }
    } catch (e) {}
  };
  const toast = (msg, kind) => {
    if (typeof addToast === 'function') addToast(msg, kind || 'info');
    else if (window.AlloFlowUX) window.AlloFlowUX.toast(msg, kind || 'info');
  };

  const commitSeating = (next) => {
    setRosterKey(prev => ({ ...(prev || { groups: {}, students: {} }), seating: next }));
  };
  const patchLayout = (patch) => {
    if (!layout) return;
    const nextLayout = { ...layout, ...patch };
    commitSeating({ ...seating, layouts: { ...seating.layouts, [layout.id]: nextLayout } });
  };

  // ── Layout management ──
  const createLayout = (templateKind) => {
    const id = nextId(Object.keys(seating.layouts), 'layout');
    const base = templateKind === 'blank'
      ? { seats: [], furniture: buildTemplate('rows', 1).furniture }
      : buildTemplate(templateKind, Math.max(studentNames.length, 4));
    const nameMap = { rows: tr('Rows'), pairs: tr('Pairs'), pods: tr('Pods'), horseshoe: tr('Horseshoe'), blank: tr('Blank room') };
    const newLayout = { id, name: (nameMap[templateKind] || tr('Layout')) + ' ' + id.replace('layout', ''), seats: base.seats, furniture: base.furniture, assignments: {} };
    commitSeating(pushHistory({ ...seating, activeLayoutId: id, layouts: { ...seating.layouts, [id]: newLayout } }, newLayout, 'created', new Date().toISOString()));
    setLastSolve(null);
  };
  const duplicateLayout = () => {
    if (!layout) return;
    const id = nextId(Object.keys(seating.layouts), 'layout');
    const copy = JSON.parse(JSON.stringify(layout));
    copy.id = id; copy.name = layout.name + ' ' + tr('copy');
    commitSeating({ ...seating, activeLayoutId: id, layouts: { ...seating.layouts, [id]: copy } });
  };
  const deleteLayout = () => {
    if (!layout) return;
    setConfirmState({
      message: tr('Delete layout "{name}"? Seat positions and its assignments are removed. Constraints are kept.', { name: layout.name }),
      onYes: () => {
        const layouts = { ...seating.layouts };
        delete layouts[layout.id];
        const remaining = Object.keys(layouts);
        commitSeating({ ...seating, layouts, activeLayoutId: remaining[0] || null });
        setLastSolve(null);
      },
    });
  };

  // ── Assignment ──
  const seatedNameSet = React.useMemo(() => {
    const s = {};
    if (layout) Object.keys(layout.assignments).forEach(id => { s[layout.assignments[id]] = id; });
    return s;
  }, [layout]);
  const unassigned = studentNames.filter(n => !seatedNameSet[n]);

  const assignToSeat = (seatId) => {
    if (!layout) return;
    const next = { ...layout.assignments };
    const occupant = next[seatId] || null;
    if (selectedStudent) {
      // Move/swap selected student into this seat.
      const fromSeat = seatedNameSet[selectedStudent];
      if (fromSeat) delete next[fromSeat];
      if (occupant && fromSeat) next[fromSeat] = occupant;   // swap
      next[seatId] = selectedStudent;
      patchLayout({ assignments: next });
      announce(tr('{name} seated', { name: displayNameOf(selectedStudent) }));
      setSelectedStudent(null);
    } else if (occupant) {
      setSelectedStudent(occupant);
      announce(tr('{name} selected — choose a seat', { name: displayNameOf(occupant) }));
    }
  };
  const unassignSeat = (seatId) => {
    if (!layout || !layout.assignments[seatId]) return;
    const next = { ...layout.assignments };
    delete next[seatId];
    patchLayout({ assignments: next });
  };

  // ── Edit-room actions ──
  const addSeat = () => {
    if (!layout) return;
    const id = nextId(layout.seats.map(s => s.id), 'seat');
    patchLayout({ seats: layout.seats.concat([{ id, x: Math.round((ROOM_W - SEAT_W) / 2), y: Math.round((ROOM_H - SEAT_H) / 2), w: SEAT_W, h: SEAT_H }]) });
    setSelectedItem(id);
  };
  const addFurniture = (kind) => {
    if (!layout) return;
    const spec = FURNITURE_KINDS.filter(k => k.kind === kind)[0] || FURNITURE_KINDS[1];
    const id = nextId(layout.furniture.map(f => f.id), 'furn');
    patchLayout({ furniture: layout.furniture.concat([{ id, kind: spec.kind, x: Math.round((ROOM_W - spec.w) / 2), y: Math.round((ROOM_H - spec.h) / 2), w: spec.w, h: spec.h, label: '' }]) });
    setSelectedItem(id);
  };
  const deleteSelectedItem = () => {
    if (!layout || !selectedItem) return;
    if (layout.seats.some(s => s.id === selectedItem)) {
      const next = { ...layout.assignments };
      delete next[selectedItem];
      patchLayout({ seats: layout.seats.filter(s => s.id !== selectedItem), assignments: next });
    } else {
      patchLayout({ furniture: layout.furniture.filter(f => f.id !== selectedItem) });
    }
    setSelectedItem(null);
  };

  // ── Dragging (edit mode) ── pointer events on the SVG; axis-aligned
  // viewBox so client→room coords is a plain ratio.
  const roomPoint = (evt) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: (evt.clientX - r.left) / r.width * ROOM_W, y: (evt.clientY - r.top) / r.height * ROOM_H };
  };
  const startDrag = (evt, item, isSeat) => {
    if (mode !== 'edit') return;
    evt.preventDefault();
    setSelectedItem(item.id);
    const p = roomPoint(evt);
    dragRef.current = { id: item.id, isSeat, dx: p.x - item.x, dy: p.y - item.y, moved: false };
    try { svgRef.current && svgRef.current.setPointerCapture(evt.pointerId); } catch (e) {}
  };
  const onSvgPointerMove = (evt) => {
    const d = dragRef.current;
    if (!d || !layout) return;
    const p = roomPoint(evt);
    const list = d.isSeat ? layout.seats : layout.furniture;
    const item = list.filter(it => it.id === d.id)[0];
    if (!item) return;
    const nx = Math.round(clampNum(p.x - d.dx, 0, ROOM_W - item.w, item.x));
    const ny = Math.round(clampNum(p.y - d.dy, 0, ROOM_H - item.h, item.y));
    if (nx === item.x && ny === item.y) return;
    d.moved = true;
    const nextList = list.map(it => it.id === d.id ? { ...it, x: nx, y: ny } : it);
    patchLayout(d.isSeat ? { seats: nextList } : { furniture: nextList });
  };
  const endDrag = () => { dragRef.current = null; };

  // Keyboard nudge for the selected item in edit mode (WCAG 2.1.1 — drag has
  // a keyboard path).
  const nudgeSelected = (evt) => {
    if (mode !== 'edit' || !layout || !selectedItem) return;
    const step = evt.shiftKey ? 5 : 1;
    let dx = 0, dy = 0;
    if (evt.key === 'ArrowLeft') dx = -step; else if (evt.key === 'ArrowRight') dx = step;
    else if (evt.key === 'ArrowUp') dy = -step; else if (evt.key === 'ArrowDown') dy = step;
    else if (evt.key === 'Delete' || evt.key === 'Backspace') { evt.preventDefault(); deleteSelectedItem(); return; }
    else return;
    evt.preventDefault();
    const isSeat = layout.seats.some(s => s.id === selectedItem);
    const list = isSeat ? layout.seats : layout.furniture;
    const nextList = list.map(it => {
      if (it.id !== selectedItem) return it;
      return { ...it, x: clampNum(it.x + dx, 0, ROOM_W - it.w, it.x), y: clampNum(it.y + dy, 0, ROOM_H - it.h, it.y) };
    });
    patchLayout(isSeat ? { seats: nextList } : { furniture: nextList });
  };

  // ── Constraints ──
  const addConstraint = () => {
    const spec = CONSTRAINT_TYPES.filter(c => c.type === cType)[0];
    if (!spec || !cA) return;
    if (spec.pair && (!cB || cB === cA)) { toast(tr('Pick two different students.'), 'info'); return; }
    if (cType === 'fixed_seat' && !cSeat) { toast(tr('Pick a seat to pin this student to.'), 'info'); return; }
    const raw = {
      id: nextId(seating.constraints.map(c => c.id), 'con'),
      type: cType,
      students: spec.pair ? [cA, cB] : [cA],
      ...(cType === 'fixed_seat' ? { seatId: cSeat } : {}),
    };
    commitSeating({ ...seating, constraints: seating.constraints.concat([raw]) });
    setCA(''); setCB(''); setCSeat('');
    announce(tr('Constraint added'));
  };
  const removeConstraint = (id) => {
    commitSeating({ ...seating, constraints: seating.constraints.filter(c => c.id !== id) });
  };

  // ── Solve ──
  const runSolve = (reshuffle) => {
    if (!layout || !layout.seats.length) { toast(tr('Add seats first — pick a template or add desks in Edit room.'), 'info'); return; }
    if (!studentNames.length) { toast(tr('The roster has no students yet.'), 'info'); return; }
    if (studentNames.length > layout.seats.length) {
      toast(tr('{extra} more students than seats — add seats or some students will stay in the tray.', { extra: studentNames.length - layout.seats.length }), 'info');
    }
    const seed = reshuffle ? seating.solveSeed + 1 : seating.solveSeed;
    const result = solveSeating(layout, studentNames, seating.constraints, { seed });
    const nextLayout = { ...layout, assignments: result.assignments };
    commitSeating(pushHistory({ ...seating, solveSeed: seed, layouts: { ...seating.layouts, [layout.id]: nextLayout } }, nextLayout, 'solve', new Date().toISOString()));
    setLastSolve({ score: result.score, violations: result.violations });
    announce(result.violations.length
      ? tr('{n} constraints could not be fully satisfied', { n: result.violations.length })
      : tr('All constraints satisfied'));
    if (result.violations.length) setShowConstraints(true);
  };
  const clearAssignments = () => {
    if (!layout) return;
    setConfirmState({ message: tr('Clear all seat assignments in this layout?'), onYes: () => { patchLayout({ assignments: {} }); setLastSolve(null); } });
  };

  // ── Print ── hidden iframe with the pure SVG string; nothing else on the
  // page is touched.
  const printChart = () => {
    if (!layout) return;
    const svg = buildPrintableSvg(layout, displayNameOf, (rosterKey && rosterKey.className ? rosterKey.className + ' — ' : '') + layout.name);
    const html = '<!DOCTYPE html><html><head><title>' + escapeXml(tr('Seating Chart')) + '</title><style>body{margin:0;padding:16px}svg{width:100%;height:auto}</style></head><body>' + svg + '</body></html>';
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) {}
      setTimeout(() => { try { document.body.removeChild(frame); } catch (e) {} }, 2000);
    };
    frame.srcdoc = html;
  };

  const gaps = layout ? anchorGaps(layout, seating.constraints) : [];
  const liveScore = React.useMemo(
    () => (layout ? scoreAssignment(layout, layout.assignments, seating.constraints) : { score: 0, violations: [] }),
    [layout, seating.constraints]
  );

  const sortedSeats = layout ? layout.seats.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)) : [];
  const seatNumberOf = {};
  sortedSeats.forEach((s, i) => { seatNumberOf[s.id] = i + 1; });

  if (!isOpen) return null;

  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[210] bg-black/60 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={tr('Seating Chart')} onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/70">
          <span className="text-2xl" aria-hidden="true">🪑</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-slate-800 truncate">{tr('Seating Chart')}{rosterKey && rosterKey.className ? ' — ' + rosterKey.className : ''}</h2>
            <p className="text-[11px] text-slate-600">{tr('Charts and constraints stay on this device inside your roster. Nothing is sent anywhere.')}</p>
          </div>
          {layout && (
            <select value={seating.activeLayoutId || ''} onChange={e => { commitSeating({ ...seating, activeLayoutId: e.target.value }); setLastSolve(null); setSelectedItem(null); }}
              aria-label={tr('Choose layout')} className="px-2 py-1.5 rounded-lg border border-slate-400 text-xs font-bold bg-white max-w-[160px]">
              {Object.keys(seating.layouts).map(id => <option key={id} value={id}>{seating.layouts[id].name}</option>)}
            </select>
          )}
          <button type="button" onClick={onClose} aria-label={t && t('common.close') || tr('Close')} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center">✕</button>
        </div>

        {!layout ? (
          /* ── Empty state: template chooser ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl" aria-hidden="true">🧭</div>
            <h3 className="text-lg font-black text-slate-800">{tr('Start your classroom map')}</h3>
            <p className="text-sm text-slate-600 max-w-md">{tr('Pick a starting arrangement for {n} students — you can drag every desk afterwards.', { n: studentNames.length })}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={() => createLayout('rows')} className={btn + ' bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}>▦ {tr('Rows')}</button>
              <button type="button" onClick={() => createLayout('pairs')} className={btn + ' bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}>⚭ {tr('Pairs')}</button>
              <button type="button" onClick={() => createLayout('pods')} className={btn + ' bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}>⊞ {tr('Pods of 4')}</button>
              <button type="button" onClick={() => createLayout('horseshoe')} className={btn + ' bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}>∪ {tr('Horseshoe')}</button>
              <button type="button" onClick={() => createLayout('blank')} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>{tr('Blank room')}</button>
            </div>
            {!studentNames.length && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{tr('Tip: add students to the roster first so seats can be assigned.')}</p>}
          </div>
        ) : (
          <React.Fragment>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100">
              <div role="group" aria-label={tr('Mode')} className="flex rounded-lg overflow-hidden border border-slate-300">
                <button type="button" aria-pressed={mode === 'assign'} onClick={() => { setMode('assign'); setSelectedItem(null); }} className={'px-3 py-1.5 text-xs font-bold ' + (mode === 'assign' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50')}>{tr('Assign')}</button>
                <button type="button" aria-pressed={mode === 'edit'} onClick={() => { setMode('edit'); setSelectedStudent(null); }} className={'px-3 py-1.5 text-xs font-bold ' + (mode === 'edit' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50')}>{tr('Edit room')}</button>
              </div>
              <div role="group" aria-label={tr('View')} className="flex rounded-lg overflow-hidden border border-slate-300">
                <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')} className={'px-3 py-1.5 text-xs font-bold ' + (view === 'map' ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50')}>{tr('Map')}</button>
                <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} className={'px-3 py-1.5 text-xs font-bold ' + (view === 'list' ? 'bg-slate-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50')}>{tr('List')}</button>
              </div>
              <button type="button" onClick={() => runSolve(false)} className={btn + ' bg-emerald-600 text-white hover:bg-emerald-700'}>✨ {tr('Auto-arrange')}</button>
              <button type="button" onClick={() => runSolve(true)} title={tr('New arrangement that still honors your constraints')} className={btn + ' bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}>🔀 {tr('Reshuffle')}</button>
              <button type="button" onClick={() => setShowConstraints(v => !v)} aria-expanded={showConstraints} className={btn + ' ' + (liveScore.violations.length ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
                ⚖️ {tr('Constraints')} ({seating.constraints.length}{liveScore.violations.length ? ' · ' + tr('{n} unmet', { n: liveScore.violations.length }) : ''})
              </button>
              <div className="ml-auto flex gap-2">
                {mode === 'edit' && (
                  <React.Fragment>
                    <button type="button" onClick={addSeat} className={btn + ' bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}>＋ {tr('Desk')}</button>
                    <select value="" onChange={e => { if (e.target.value) addFurniture(e.target.value); e.target.value = ''; }} aria-label={tr('Add furniture')} className="px-2 py-1.5 rounded-lg border border-slate-400 text-xs font-bold bg-white">
                      <option value="">＋ {tr('Furniture')}…</option>
                      {FURNITURE_KINDS.map(f => <option key={f.kind} value={f.kind}>{FURN_EMOJI[f.kind]} {furnitureLabel(f.kind)}</option>)}
                    </select>
                    <button type="button" onClick={deleteSelectedItem} disabled={!selectedItem} className={btn + ' bg-rose-50 text-rose-700 hover:bg-rose-100'}>🗑 {tr('Remove')}</button>
                    <button type="button" onClick={duplicateLayout} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>{tr('Duplicate')}</button>
                    <button type="button" onClick={deleteLayout} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>{tr('Delete layout')}</button>
                  </React.Fragment>
                )}
                <button type="button" onClick={clearAssignments} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>{tr('Clear seats')}</button>
                <button type="button" onClick={printChart} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>🖨 {tr('Print')}</button>
              </div>
            </div>

            {mode === 'edit' && (
              <div className="px-4 py-1.5 text-[11px] text-slate-600 bg-indigo-50/60 border-b border-indigo-100">
                {tr('Drag desks and furniture to match your room. Click an item then use arrow keys to nudge (Shift = faster), Delete to remove.')}
                {layout && ' '}
                <label className="inline-flex items-center gap-1 ml-2 font-bold">
                  {tr('Layout name')}:
                  <input type="text" value={layout.name} onChange={e => patchLayout({ name: e.target.value.slice(0, 60) })} className="px-2 py-0.5 rounded border border-slate-400 text-[11px] w-36" />
                </label>
              </div>
            )}

            <div className="flex-1 flex min-h-0">
              {/* ── Canvas / list ── */}
              <div className="flex-1 min-w-0 p-3 overflow-auto custom-scrollbar" onKeyDown={nudgeSelected}>
                {view === 'map' ? (
                  <svg ref={svgRef} viewBox={'0 0 ' + ROOM_W + ' ' + ROOM_H} role="application" aria-label={tr('Classroom map — {n} seats', { n: layout.seats.length })}
                    className="w-full h-auto max-h-full select-none bg-slate-50 rounded-xl border border-slate-200"
                    onPointerMove={onSvgPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
                    {/* Board / front-of-room marker */}
                    <rect x={ROOM_W * 0.2} y={0} width={ROOM_W * 0.6} height={1.4} fill="#334155" />
                    <text x={ROOM_W / 2} y={4.6} textAnchor="middle" fontSize="2.6" fill="#64748b">{tr('Front of room')}</text>
                    {/* Furniture */}
                    {layout.furniture.map(f => (
                      <g key={f.id} onPointerDown={e => startDrag(e, f, false)} onClick={() => mode === 'edit' && setSelectedItem(f.id)}
                        tabIndex={mode === 'edit' ? 0 : -1} role={mode === 'edit' ? 'button' : undefined}
                        aria-label={furnitureLabel(f.kind) + (f.label ? ' ' + f.label : '')}
                        onFocus={() => mode === 'edit' && setSelectedItem(f.id)}
                        style={{ cursor: mode === 'edit' ? 'move' : 'default', outline: 'none' }}>
                        <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="1.2"
                          fill={f.kind === 'rug' ? '#ede9fe' : f.kind === 'window' ? '#e0f2fe' : '#f1f5f9'}
                          stroke={selectedItem === f.id ? '#4f46e5' : '#94a3b8'} strokeWidth={selectedItem === f.id ? 0.8 : 0.4} strokeDasharray="1.6 1" />
                        <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 0.9} textAnchor="middle" fontSize="2.4" fill="#64748b">
                          {FURN_EMOJI[f.kind]} {f.label || furnitureLabel(f.kind)}
                        </text>
                      </g>
                    ))}
                    {/* Seats */}
                    {layout.seats.map(s => {
                      const name = layout.assignments[s.id];
                      const isSel = (mode === 'edit' && selectedItem === s.id) || (mode === 'assign' && name && selectedStudent === name);
                      return (
                        <g key={s.id}
                          onPointerDown={e => startDrag(e, s, true)}
                          onClick={() => { if (mode === 'assign') { if (dragRef.current && dragRef.current.moved) return; assignToSeat(s.id); } else setSelectedItem(s.id); }}
                          onKeyDown={e => { if (mode === 'assign' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); assignToSeat(s.id); } }}
                          onFocus={() => mode === 'edit' && setSelectedItem(s.id)}
                          tabIndex={0} role="button"
                          aria-label={tr('Seat {n}', { n: seatNumberOf[s.id] }) + ': ' + (name ? displayNameOf(name) : tr('empty'))}
                          style={{ cursor: mode === 'edit' ? 'move' : 'pointer', outline: 'none' }}>
                          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="1.4"
                            fill={name ? '#eef2ff' : '#ffffff'}
                            stroke={isSel ? '#f59e0b' : name ? groupColorOf(name) : '#94a3b8'}
                            strokeWidth={isSel ? 1 : 0.6}
                            strokeDasharray={name ? undefined : '1.6 1'} />
                          <text x={s.x + 1.2} y={s.y + 2.6} fontSize="2" fill="#94a3b8">{seatNumberOf[s.id]}</text>
                          {name
                            ? <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 1} textAnchor="middle" fontSize={displayNameOf(name).length > 10 ? 2 : 2.6} fontWeight="700" fill="#1e293b">{displayNameOf(name).slice(0, 14)}</text>
                            : <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 1} textAnchor="middle" fontSize="2.2" fill="#cbd5e1">{mode === 'assign' && selectedStudent ? '⬇' : '·'}</text>}
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  /* List view — same data, native controls, full AT parity. */
                  <table className="w-full text-sm border-collapse">
                    <caption className="sr-only">{tr('Seat assignments, front to back')}</caption>
                    <thead>
                      <tr className="text-left text-xs text-slate-600 uppercase tracking-wide">
                        <th scope="col" className="py-1.5 pr-3">{tr('Seat')}</th>
                        <th scope="col" className="py-1.5">{tr('Student')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSeats.map(s => {
                        const name = layout.assignments[s.id] || '';
                        return (
                          <tr key={s.id} className="border-t border-slate-100">
                            <th scope="row" className="py-1.5 pr-3 font-bold text-slate-700">{tr('Seat {n}', { n: seatNumberOf[s.id] })}</th>
                            <td className="py-1.5">
                              <select value={name} aria-label={tr('Student for seat {n}', { n: seatNumberOf[s.id] })}
                                onChange={e => {
                                  const v = e.target.value;
                                  const next = { ...layout.assignments };
                                  if (next[s.id]) delete next[s.id];
                                  if (v) {
                                    Object.keys(next).forEach(k => { if (next[k] === v) delete next[k]; });
                                    next[s.id] = v;
                                  }
                                  patchLayout({ assignments: next });
                                }}
                                className="px-2 py-1 rounded-lg border border-slate-400 text-sm bg-white min-w-[180px]">
                                <option value="">{tr('— empty —')}</option>
                                {name && <option value={name}>{displayNameOf(name)}</option>}
                                {unassigned.map(n2 => <option key={n2} value={n2}>{displayNameOf(n2)}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Sidebar ── */}
              <div className="w-64 shrink-0 border-l border-slate-100 flex flex-col min-h-0">
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {/* Unassigned tray */}
                  <div>
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-wide mb-1.5">{tr('Unseated')} ({unassigned.length})</h3>
                    {unassigned.length === 0 && <p className="text-[11px] text-slate-500 italic">{tr('Everyone has a seat.')}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map(n2 => (
                        <button key={n2} type="button" aria-pressed={selectedStudent === n2}
                          onClick={() => { setSelectedStudent(selectedStudent === n2 ? null : n2); setMode('assign'); }}
                          style={{ borderColor: groupColorOf(n2) }}
                          className={'px-2 py-1 rounded-full text-[11px] font-bold border-2 ' + (selectedStudent === n2 ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-700 hover:bg-slate-50')}>
                          {displayNameOf(n2)}
                        </button>
                      ))}
                    </div>
                    {selectedStudent && <p className="text-[11px] text-amber-700 mt-1.5">{tr('Now click a seat for {name}.', { name: displayNameOf(selectedStudent) })}</p>}
                  </div>

                  {/* Constraints */}
                  {showConstraints && (
                    <div className="border-t border-slate-100 pt-2">
                      <h3 className="text-xs font-black text-slate-600 uppercase tracking-wide mb-1.5">{tr('Constraints')}</h3>
                      <p className="text-[10px] text-slate-500 mb-2">{tr('Your professional judgment, encoded once — Auto-arrange honors it every time.')}</p>
                      <div className="space-y-1.5 mb-2">
                        {seating.constraints.map(c => {
                          const unmet = liveScore.violations.some(v => v.id === c.id);
                          const gap = gaps.some(g => g.id === c.id);
                          return (
                            <div key={c.id} className={'flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] ' + (unmet ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50')}>
                              <span className="flex-1">
                                <b>{constraintTypeLabel(c.type)}</b>: {c.students.map(displayNameOf).join(' + ')}
                                {c.type === 'fixed_seat' && seatNumberOf[c.seatId] ? ' → ' + tr('Seat {n}', { n: seatNumberOf[c.seatId] }) : ''}
                                {unmet && <span className="block text-amber-700">{tr('unmet in current arrangement')}</span>}
                                {gap && <span className="block text-sky-700">{tr('add a {kind} to the map for this to work', { kind: furnitureLabel(CONSTRAINT_TYPES.filter(s => s.type === c.type)[0].anchor) })}</span>}
                              </span>
                              <button type="button" onClick={() => removeConstraint(c.id)} aria-label={tr('Remove constraint')} className="text-slate-400 hover:text-rose-600 font-bold">✕</button>
                            </div>
                          );
                        })}
                        {!seating.constraints.length && <p className="text-[11px] text-slate-500 italic">{tr('None yet.')}</p>}
                      </div>
                      {/* Add form */}
                      <div className="space-y-1.5 bg-slate-50 rounded-lg p-2">
                        <select value={cType} onChange={e => setCType(e.target.value)} aria-label={tr('Constraint type')} className="w-full px-2 py-1 rounded border border-slate-400 text-[11px] bg-white">
                          {CONSTRAINT_TYPES.map(ct => <option key={ct.type} value={ct.type}>{constraintTypeLabel(ct.type)}</option>)}
                        </select>
                        <select value={cA} onChange={e => setCA(e.target.value)} aria-label={tr('Student')} className="w-full px-2 py-1 rounded border border-slate-400 text-[11px] bg-white">
                          <option value="">{tr('Student')}…</option>
                          {studentNames.map(n2 => <option key={n2} value={n2}>{displayNameOf(n2)}</option>)}
                        </select>
                        {(CONSTRAINT_TYPES.filter(ct => ct.type === cType)[0] || {}).pair && (
                          <select value={cB} onChange={e => setCB(e.target.value)} aria-label={tr('Second student')} className="w-full px-2 py-1 rounded border border-slate-400 text-[11px] bg-white">
                            <option value="">{tr('Second student')}…</option>
                            {studentNames.filter(n2 => n2 !== cA).map(n2 => <option key={n2} value={n2}>{displayNameOf(n2)}</option>)}
                          </select>
                        )}
                        {cType === 'fixed_seat' && (
                          <select value={cSeat} onChange={e => setCSeat(e.target.value)} aria-label={tr('Seat')} className="w-full px-2 py-1 rounded border border-slate-400 text-[11px] bg-white">
                            <option value="">{tr('Seat')}…</option>
                            {sortedSeats.map(s => <option key={s.id} value={s.id}>{tr('Seat {n}', { n: seatNumberOf[s.id] })}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={addConstraint} disabled={!cA} className={btn + ' w-full bg-indigo-600 text-white hover:bg-indigo-700'}>＋ {tr('Add constraint')}</button>
                      </div>
                    </div>
                  )}

                  {/* Solve result */}
                  {lastSolve && (
                    <div className={'rounded-lg px-2.5 py-2 text-[11px] ' + (lastSolve.violations.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
                      {lastSolve.violations.length
                        ? tr('{n} constraints could not be fully satisfied — they are marked in the list above.', { n: lastSolve.violations.length })
                        : '✓ ' + tr('All constraints satisfied.')}
                    </div>
                  )}
                </div>
                {/* Group legend */}
                {Object.keys(groups).length > 0 && (
                  <div className="p-2.5 border-t border-slate-100 flex flex-wrap gap-2">
                    {Object.keys(groups).map(gid => (
                      <span key={gid} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: (groups[gid] && groups[gid].color) || '#94a3b8' }} />
                        {(groups[gid] && groups[gid].name) || gid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        )}

        {/* Confirm dialog */}
        {confirmState && (
          <div className="fixed inset-0 z-[220] bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmState(null)}>
            <div role="alertdialog" aria-modal="true" aria-label={confirmState.message} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full">
              <p className="text-sm text-slate-700 font-medium">{confirmState.message}</p>
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" autoFocus data-safe-default="true" onClick={() => setConfirmState(null)} className={btn + ' bg-slate-100 text-slate-700 hover:bg-slate-200'}>{t && t('common.cancel') || tr('Cancel')}</button>
                <button type="button" onClick={() => { const fn = confirmState.onYes; setConfirmState(null); if (fn) fn(); }} className={btn + ' bg-rose-600 text-white hover:bg-rose-700'}>{tr('Yes, continue')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
