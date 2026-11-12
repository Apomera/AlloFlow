// Road Ready zn34: invariant checker over recorded actor states.
//
// Input: { meta, frames }. One frame per simulation step:
//   { t, oneWay, car: { st, lat, dir, v, len, wid, box },
//     actors: [{ id, kind: 'vehicle'|'rider', type, st, lat, dir, v, len, wid, cross, turning, box }],
//     zones: [{ chunk, lo, hi, coneLo, coneHi, state, flaggers }],
//     controls: [{ type: 'light'|'stop', st, line, main }] }
// st = station along the main road (metres), lat = metres from the road centre (+ = the side of
// traffic that travels toward -station), dir = +1 / -1 travel along the station axis (0 = on a
// cross street), box = [stMin, stMax, latMin, latMax] of the body. A work zone's one-lane section
// runs from stop line `lo` to stop line `hi`; state 'green' = traffic travelling -1 has SLOW (go),
// 'red' = traffic travelling +1 has the go, 'yellow' = both paddles at STOP.
// meta: { weather, hardBrakeLine (m/s2, the tool's hard-brake line for this weather), reactionSec }.
//
// Three invariants:
//   workZone : no AI vehicle is inside a one-lane section travelling against the direction that has
//              the go, none enters past a STOP paddle, and two opposite drivers are never inside together.
//   headOn   : no AI vehicle is on the learner's side of the centre line, in the learner's path,
//              heading toward the learner (work-zone single lane excepted: that is the first invariant).
//   gap      : no AI vehicle enters or crosses the learner's path where the learner, reacting after
//              reactionSec, would have to brake harder than the comfortable rate to stay clear of it.
//              Comfortable = half the tool's hard-brake line (2.6 m/s2 dry).
'use strict';

var COMFORT_SHARE = 0.5;       // comfortable braking = this share of the hard-brake line
var ZONE_EDGE_METERS = 2;      // a centre this far inside a stop line is "inside the section"
// a front this far over a stop line has entered (a driver held at its line may be nudged up to here;
// the tool holds such a driver: RR_WORK_ZONE_HOLD_PAST_LINE_METERS)
var ENTRY_TOLERANCE_METERS = 2.5;
var PATH_MARGIN_METERS = 0.3;  // the learner's path is its body width plus this each side
var LOOK_AHEAD_METERS = 100;
var GAP_HORIZON_SECONDS = 12;

function comfortDecel(meta) {
  return COMFORT_SHARE * (Number(meta && meta.hardBrakeLine) || 5.2);
}
function goDirection(state) { return state === 'green' ? -1 : state === 'red' ? 1 : 0; }

// Distance the learner covers in `time` seconds: full speed for the reaction time, then slowing at `decel`.
function learnerTravel(speed, time, decel, reaction) {
  if (time <= reaction) return speed * time;
  var braking = time - reaction;
  var stopTime = decel > 0 ? speed / decel : Infinity;
  if (braking >= stopTime) return speed * reaction + speed * speed / (2 * decel);
  return speed * reaction + speed * braking - 0.5 * decel * braking * braking;
}

// The least constant deceleration (after the reaction time) that keeps the learner's front behind
// every recorded position of the obstacle. `track` = [{ dt, gap }]: at dt seconds after the entry the
// obstacle's near edge is `gap` metres ahead of where the learner's front was at the entry.
function requiredDecel(speed, track, reaction) {
  var clear = function(decel) {
    for (var i = 0; i < track.length; i++) {
      if (learnerTravel(speed, track[i].dt, decel, reaction) > track[i].gap) return false;
    }
    return true;
  };
  if (clear(0)) return 0;
  if (!clear(40)) return Infinity;
  var low = 0, high = 40;
  for (var n = 0; n < 40; n++) { var mid = (low + high) / 2; if (clear(mid)) high = mid; else low = mid; }
  return high;
}

function checkWorkZone(run) {
  var out = [], seen = {}, prev = null;
  var note = function(key, v) { if (seen[key]) return; seen[key] = true; out.push(v); };
  (run.frames || []).forEach(function(fr) {
    (fr.zones || []).forEach(function(z) {
      var inside = function(a) { return a.st > z.lo + ZONE_EDGE_METERS && a.st < z.hi - ZONE_EDGE_METERS; };
      var go = goDirection(z.state);
      var ai = (fr.actors || []).filter(function(a) { return a.kind === 'vehicle' && !a.cross && !a.round && inside(a); });
      if (ai.length && z.state == null) note('nf' + z.chunk, { rule: 'zone_without_flagger', t: fr.t, chunk: z.chunk, id: ai[0].id });
      ai.forEach(function(a) {
        if (go && a.dir === -go) note('ag' + z.chunk + a.id, { rule: 'against_go', t: fr.t, chunk: z.chunk, id: a.id, st: a.st, lat: a.lat, dir: a.dir, v: a.v, state: z.state });
      });
      var learnerIn = fr.car && inside(fr.car);
      var up = ai.filter(function(a) { return a.dir > 0; }), down = ai.filter(function(a) { return a.dir < 0; });
      if (up.length && down.length) note('op' + z.chunk + up[0].id + down[0].id, { rule: 'opposed_pair', t: fr.t, chunk: z.chunk, id: up[0].id, other: down[0].id, state: z.state });
      if (learnerIn) ai.forEach(function(a) {
        if (a.dir === -fr.car.dir) note('ol' + z.chunk + a.id, { rule: 'opposed_learner', t: fr.t, chunk: z.chunk, id: a.id, st: a.st, lat: a.lat, v: a.v, state: z.state,
          learnerSt: fr.car.st, learnerAgainstGo: !!(go && fr.car.dir === -go) });
      });
      // entering past a STOP paddle: the front crosses the entry line while this direction has no go
      if (prev) {
        var before = {}; (prev.actors || []).forEach(function(a) { before[a.id] = a; });
        var was = null; (prev.zones || []).forEach(function(p) { if (p.chunk === z.chunk) was = p; });
        (fr.actors || []).forEach(function(a) {
          var b = before[a.id];
          if (!b || a.kind !== 'vehicle' || a.cross || b.cross || !a.dir || Math.abs(a.st - b.st) > 6) return;
          var line = a.dir > 0 ? z.lo : z.hi;
          var frontNow = a.st + a.dir * a.len / 2, frontBefore = b.st + a.dir * b.len / 2;
          var tol = ENTRY_TOLERANCE_METERS;
          var crossed = a.dir > 0 ? (frontBefore <= line + tol && frontNow > line + tol) : (frontBefore >= line - tol && frontNow < line - tol);
          if (!crossed) return;
          var stateThen = was ? was.state : z.state;
          if (stateThen != null && goDirection(stateThen) !== a.dir) note('en' + z.chunk + a.id + Math.round(fr.t), { rule: 'entered_on_stop', t: fr.t, chunk: z.chunk, id: a.id, dir: a.dir, v: a.v, state: stateThen });
        });
      }
    });
    prev = fr;
  });
  return out;
}

function checkHeadOn(run) {
  var out = [], active = {};
  (run.frames || []).forEach(function(fr) {
    var car = fr.car, now = {};
    if (car && !fr.oneWay) (fr.actors || []).forEach(function(a) {
      if (a.cross || a.turning || a.round || !a.dir || a.dir === car.dir) return;
      // wrong side of the centre line: its body reaches 0.2 m or more onto the learner's side
      var over = car.dir < 0 ? a.box[3] : -a.box[2];
      if (!(over > 0.2)) return;
      var ahead = (a.st - car.st) * car.dir - (a.len + car.len) / 2;
      if (!(ahead > 0 && ahead < LOOK_AHEAD_METERS)) return;
      var overlap = Math.min(a.box[3], car.box[3] + PATH_MARGIN_METERS) - Math.max(a.box[2], car.box[2] - PATH_MARGIN_METERS);
      if (!(overlap > 0)) return;
      var inZone = (fr.zones || []).some(function(z) { return a.st > z.lo && a.st < z.hi; });
      if (inZone) return; // the single lane: judged by checkWorkZone
      now[a.id] = true;
      if (!active[a.id]) out.push({ rule: 'head_on', t: fr.t, id: a.id, kind: a.kind, type: a.type, ahead: +ahead.toFixed(1), lat: a.lat, v: a.v, learnerLat: car.lat, learnerV: car.v });
    });
    active = now;
  });
  return out;
}

// Is the learner required to stop before reaching `conflictSt`? (A red or yellow light, or a stop
// sign it has not stopped at yet.) Then a vehicle crossing ahead has not taken the learner's way.
function learnerMustStopBefore(fr, conflictGap, stoppedAt) {
  var car = fr.car, front = car.st + car.dir * car.len / 2, must = false;
  (fr.controls || []).forEach(function(c) {
    var toLine = (c.line - front) * car.dir;
    if (toLine < -1 || toLine > conflictGap + 2) return;
    if (c.type === 'light' && c.main !== 'green') must = true;
    if (c.type === 'stop' && !stoppedAt[c.st]) must = true;
  });
  (fr.zones || []).forEach(function(z) {
    var line = car.dir < 0 ? z.hi : z.lo, toLine = (line - front) * car.dir;
    if (toLine < -1 || toLine > conflictGap + 2) return;
    if (goDirection(z.state) !== car.dir) must = true;
  });
  return must;
}

function checkGap(run) {
  var meta = run.meta || {}, frames = run.frames || [];
  var reaction = Number(meta.reactionSec) || 1.5, comfort = comfortDecel(meta);
  var out = [], inPath = {}, known = {}, stoppedAt = {};
  for (var i = 0; i < frames.length; i++) {
    var fr = frames[i], car = fr.car; if (!car) continue;
    var front = car.st + car.dir * car.len / 2;
    (fr.controls || []).forEach(function(c) {
      if (c.type !== 'stop') return;
      var toLine = (c.line - front) * car.dir;
      if (car.v < 0.5 && toLine > -1.5 && toLine < 15) stoppedAt[c.st] = true;
      if (toLine > 60) stoppedAt[c.st] = false;
    });
    var pathLo = car.box[2] - PATH_MARGIN_METERS, pathHi = car.box[3] + PATH_MARGIN_METERS;
    var now = {};
    (fr.actors || []).forEach(function(a) {
      if (a.kind !== 'vehicle' || a.round) return;
      var firstSeen = !known[a.id]; known[a.id] = true;
      if (!(Math.min(a.box[3], pathHi) - Math.max(a.box[2], pathLo) > 0)) return;
      var near = car.dir < 0 ? front - a.box[1] : a.box[0] - front; // gap from the learner's front to its near edge
      if (!(near > 0 && near < LOOK_AHEAD_METERS)) return;
      now[a.id] = true;
      if (inPath[a.id] || firstSeen) return;
      // it was outside this path one frame ago: did IT move in (crossing, turning, changing lane)?
      var before = null; if (i > 0) (frames[i - 1].actors || []).forEach(function(b) { if (b.id === a.id) before = b; });
      if (!before) return;
      if (Math.min(before.box[3], pathHi) - Math.max(before.box[2], pathLo) > 0) return; // the learner moved, not this vehicle
      if (Math.abs(before.st - a.st) > 8) return; // placed there (recycled): the spawn rule, not this one
      if (learnerMustStopBefore(fr, near, stoppedAt)) return;
      // follow the vehicle while it stays in that path
      var track = [];
      for (var j = i; j < frames.length && frames[j].t - fr.t <= GAP_HORIZON_SECONDS; j++) {
        var later = null; (frames[j].actors || []).forEach(function(b) { if (b.id === a.id) later = b; });
        if (!later) break;
        if (!(Math.min(later.box[3], pathHi) - Math.max(later.box[2], pathLo) > 0)) break;
        var gap = car.dir < 0 ? front - later.box[1] : later.box[0] - front;
        // keep 1 m clear of a moving learner; a stopped learner needs no braking unless the body reaches it
        track.push({ dt: frames[j].t - fr.t, gap: gap - (car.v < 0.5 ? 0.1 : 1) });
      }
      var need = requiredDecel(car.v, track, reaction);
      if (need > comfort + 1e-9) out.push({ rule: 'gap', t: fr.t, id: a.id, type: a.type, cross: !!a.cross, turning: !!a.turning, intent: a.intent || null, sameDir: a.dir === car.dir,
        gapMeters: +near.toFixed(1), learnerV: car.v, needDecel: need === Infinity ? 'cannot' : +need.toFixed(2), comfort: +comfort.toFixed(2), inPathSeconds: track.length ? +track[track.length - 1].dt.toFixed(1) : 0 });
    });
    inPath = now;
  }
  return out;
}

// Build one frame from live objects (same fields as harness/frames.cjs records in the app).
// RR = the tool's test exports; signals = the tool's signal list (flaggers, lights, stop signs).
function recordFrame(RR, world, t, car, carType, traffic, signals) {
  var local = function(x, y) { return RR.mainRoadLocalPoint(world, x, y); };
  var r2 = function(n) { return Math.round(n * 100) / 100; };
  var box = function(o, size) {
    var c = Math.cos(o.heading || 0), s = Math.sin(o.heading || 0), hl = size.length / 2, hw = size.width / 2;
    var a = Infinity, b = -Infinity, e = Infinity, g = -Infinity;
    [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw]].forEach(function(k) {
      var f = local(o.x + c * k[0] - s * k[1], o.y + s * k[0] + c * k[1]);
      a = Math.min(a, f.longitudinal); b = Math.max(b, f.longitudinal); e = Math.min(e, f.lateral); g = Math.max(g, f.lateral);
    });
    return [r2(a), r2(b), r2(e), r2(g)];
  };
  var pf = local(car.x, car.y), pSize = RR.vehicleFootprint(carType || 'car');
  var dir = RR.mainRoadTravelSign(world, car) < 0 ? -1 : 1;
  var fr = { t: r2(t), oneWay: false, car: { st: r2(pf.longitudinal), lat: r2(pf.lateral), dir: dir, v: r2(Math.abs(car.speed || 0)), len: pSize.length, wid: pSize.width, box: box(car, pSize) },
    actors: [], zones: [], controls: [] };
  (traffic || []).forEach(function(o) {
    var size = RR.vehicleFootprint(o.type || 'car'), f = local(o.x, o.y);
    fr.actors.push({ id: String(o.id), kind: 'vehicle', type: o.type || null, st: r2(f.longitudinal), lat: r2(f.lateral),
      dir: o.crossStreet ? 0 : (Math.sin(o.heading || 0) >= 0 ? 1 : -1), v: r2(Math.abs(o.speed || 0)), len: size.length, wid: size.width,
      cross: !!o.crossStreet, turning: !!o._turning, intent: o._turnIntent || null, box: box(o, size) });
  });
  (signals || []).forEach(function(s) {
    if (s.type === 'flagger' && s._workZoneStartY != null) {
      fr.zones.push({ chunk: s._chunk, lo: s._workZoneStartY - RR.RR_WORK_ZONE_TAPER_METERS, hi: s._workZoneEndY + RR.RR_WORK_ZONE_TAPER_METERS,
        coneLo: s._workZoneStartY, coneHi: s._workZoneEndY, flaggers: 1, state: s.state });
    } else if (s.type === 'light' || s.type === 'stop') {
      var f = local(s.x, s.y);
      fr.controls.push({ type: s.type, st: r2(f.longitudinal), line: r2(RR.intersectionStopLineCoordinate(f.longitudinal, dir)),
        main: s.type === 'light' ? RR.trafficSignalIndication(s, 'main') : 'stop' });
    }
  });
  return fr;
}

function checkAll(run) {
  var workZone = checkWorkZone(run), headOn = checkHeadOn(run), gap = checkGap(run);
  return { workZone: workZone, headOn: headOn, gap: gap, total: workZone.length + headOn.length + gap.length,
    frames: (run.frames || []).length, comfort: comfortDecel(run.meta) };
}

module.exports = { checkAll: checkAll, recordFrame: recordFrame, checkWorkZone: checkWorkZone, checkHeadOn: checkHeadOn, checkGap: checkGap,
  requiredDecel: requiredDecel, learnerTravel: learnerTravel, comfortDecel: comfortDecel, goDirection: goDirection,
  COMFORT_SHARE: COMFORT_SHARE, ZONE_EDGE_METERS: ZONE_EDGE_METERS };
