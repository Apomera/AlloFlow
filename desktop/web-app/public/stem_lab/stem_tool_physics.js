// ═══════════════════════════════════════════
// stem_tool_physics.js — Physics Simulator Plugin
// Standalone plugin extracted from stem_tool_science.js
// Enhanced: vector decomposition, energy bar, learn panel, XP
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// stem_tool_science.js — STEAM Lab Science Tools
// 29 registered tools
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio System (auto-injected) ──
  var _phyAC = null;
  function getPhyAC() { if (!_phyAC) { try { _phyAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_phyAC && _phyAC.state === "suspended") { try { _phyAC.resume(); } catch(e) {} } return _phyAC; }
  function phyTone(f,d,tp,v) { var ac = getPhyAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxPhyLaunch() { phyTone(200,0.15,"sine",0.07); }
  function sfxPhyCollide() { phyTone(150,0.1,"sawtooth",0.08); }
  function sfxPhyTick() { phyTone(600,0.03,"sine",0.04); }

  // ── Shared projectile integrator ──
  // ONE derivation of the flight, used by the canvas loop, the drag-aware
  // landing prediction, and the Target Mode calculation helper, so the
  // number the student is told to aim for is the number the sim produces.
  //
  // Quadratic drag: a_drag = -PHYS_DRAG_K · |v| · v / m. Vacuum motion is
  // exact; drag uses fourth-order Runge–Kutta. Apex and descending ground
  // contact are resolved inside the step, including flights shorter than DT.
  var PHYS_DT = 0.035;        // seconds of flight per simulation step
  var PHYS_DRAG_K = 0.004;    // effective quadratic drag factor (kg/m)
  var PHYS_MODEL_VERSION = 'projectile-v3';
  function physFinite(v) { return typeof v === 'number' && isFinite(v); }
  function physValidLaunch(angle, vel, grav, mass, height) {
    height = height === undefined ? 0 : height;
    return physFinite(angle) && angle >= 0 && angle <= 90 &&
      physFinite(vel) && vel >= 0 && vel <= 200 &&
      physFinite(grav) && grav >= 0 && physFinite(mass) && mass > 0 &&
      physFinite(height) && height >= 0 && height <= 50;
  }
  function physPoint(b) {
    return { mX: b.mX, mY: b.mY, mVx: b.mVx, mVy: b.mVy, t: b.t || 0 };
  }
  function physStateAt(b, dt) {
    var t = (b.t || 0) + dt;
    if (!(b.drag > 0)) return {
      mX: b.mX + b.mVx * dt, mY: b.mY + b.mVy * dt - 0.5 * b.grav * dt * dt,
      mVx: b.mVx, mVy: b.mVy - b.grav * dt, t: t
    };
    var k = b.drag / (b.mass == null ? 1 : b.mass);
    function deriv(vx, vy) {
      var a = k * Math.sqrt(vx * vx + vy * vy);
      return { x: vx, y: vy, vx: -a * vx, vy: -b.grav - a * vy };
    }
    var a = deriv(b.mVx, b.mVy);
    var c = deriv(b.mVx + a.vx * dt / 2, b.mVy + a.vy * dt / 2);
    var d = deriv(b.mVx + c.vx * dt / 2, b.mVy + c.vy * dt / 2);
    var e = deriv(b.mVx + d.vx * dt, b.mVy + d.vy * dt);
    return {
      mX: b.mX + dt * (a.x + 2 * c.x + 2 * d.x + e.x) / 6,
      mY: b.mY + dt * (a.y + 2 * c.y + 2 * d.y + e.y) / 6,
      mVx: b.mVx + dt * (a.vx + 2 * c.vx + 2 * d.vx + e.vx) / 6,
      mVy: b.mVy + dt * (a.vy + 2 * c.vy + 2 * d.vy + e.vy) / 6,
      t: t
    };
  }
  // Find the first descending zero of height or vertical velocity within
  // one integration slice. Every probe starts from the same initial state.
  function physEventTime(b, dt, field) {
    var lo = 0, hi = dt;
    for (var i = 0; i < 44; i++) {
      var mid = (lo + hi) / 2;
      if (physStateAt(b, mid)[field] > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function physStep(b, dt) {
    if (!physFinite(dt) || dt <= 0 || !b || b.landed) return;
    var mass = b.mass == null ? 1 : b.mass;
    if (!physFinite(b.mX) || !physFinite(b.mY) || b.mY < 0 ||
        !physFinite(b.mVx) || !physFinite(b.mVy) || !physFinite(b.grav) || b.grav < 0 ||
        !physFinite(b.drag) || b.drag < 0 || !physFinite(mass) || mass <= 0 ||
        (b.t != null && (!physFinite(b.t) || b.t < 0))) {
      b.status = 'invalid'; return;
    }
    b.t = b.t || 0;
    b.maxH = Math.max(physFinite(b.maxH) ? b.maxH : 0, b.mY);
    if (!b.apex && b.mVy <= 0) b.apex = physPoint(b);
    if (b.mY === 0 && b.mVy <= 0) { b.landed = true; b.status = 'landed'; return; }
    var remaining = dt, slices = 0;
    b.status = 'flying';
    while (remaining > 1e-12 && !b.landed) {
      if (++slices > 20000) { b.status = 'limit'; return; }
      // Bound drag's fractional velocity change even for unusually low mass.
      var rate = b.drag * Math.sqrt(b.mVx * b.mVx + b.mVy * b.mVy) / mass;
      var h = b.drag > 0 ? Math.min(remaining, PHYS_DT, rate > 0 ? 0.05 / rate : PHYS_DT) : remaining;
      if (!(h > 0) || b.t + h === b.t) { b.status = 'limit'; return; }
      var next = physStateAt(b, h);
      if (![next.mX, next.mY, next.mVx, next.mVy, next.t].every(physFinite)) { b.status = 'invalid'; return; }
      if (b.mVy > 0 && next.mVy <= 0) {
        var apex = physStateAt(b, physEventTime(b, h, 'mVy'));
        apex.mVy = 0;
        b.apex = apex;
        b.maxH = Math.max(b.maxH, apex.mY);
      }
      if (next.mY <= 0 && next.mVy <= 0) {
        next = physStateAt(b, physEventTime(b, h, 'mY'));
        next.mY = 0;
        b.landed = true;
        b.status = 'landed';
      }
      b.mX = next.mX; b.mY = next.mY; b.mVx = next.mVx; b.mVy = next.mVy; b.t = next.t;
      b.maxH = Math.max(b.maxH, b.mY);
      remaining -= h;
    }
  }
  function physOutcome(status) { return { status: status, range: null, maxH: null, time: null, apexT: null }; }
  // Heights are measured from the landing ground. This analytic helper also
  // serves the formula and ideal-comparison views without duplicating math.
  function physVacuum(angle, vel, grav, height) {
    height = height === undefined ? 0 : height;
    if (!physValidLaunch(angle, vel, grav, 1, height)) return Object.assign(physOutcome('invalid'), { optimumAngle: null });
    var rad = angle * Math.PI / 180;
    var vx = angle === 90 ? 0 : vel * Math.cos(rad), vy = vel * Math.sin(rad);
    if (grav === 0) {
      if (height > 0 || vy > 0) return Object.assign(physOutcome('no-impact'), { optimumAngle: null });
      return { status: 'landed', range: 0, maxH: 0, time: 0, apexT: 0, optimumAngle: null };
    }
    var time = (vy + Math.sqrt(vy * vy + 2 * grav * height)) / grav;
    var maxH = height + vy * vy / (2 * grav);
    var range = vx * time;
    var apexT = vy / grav;
    if (![time, maxH, range, apexT].every(physFinite)) return Object.assign(physOutcome('limit'), { optimumAngle: null });
    var optimumAngle = vel === 0 ? 0 : Math.atan(vel / Math.sqrt(vel * vel + 2 * grav * height)) * 180 / Math.PI;
    return { status: 'landed', range: range, maxH: maxH, time: time, apexT: apexT, optimumAngle: optimumAngle };
  }
  function physSimulate(angle, vel, grav, dragOn, mass, height) {
    mass = mass == null ? 1 : mass;
    height = height === undefined ? 0 : height;
    if (!physValidLaunch(angle, vel, grav, mass, height)) return physOutcome('invalid');
    var rad = angle * Math.PI / 180;
    var b = { mX: 0, mY: height, mVx: angle === 90 ? 0 : vel * Math.cos(rad), mVy: vel * Math.sin(rad), grav: grav, drag: dragOn ? PHYS_DRAG_K : 0, mass: mass, t: 0 };
    if (grav === 0 && (height > 0 || b.mVy > 0)) return physOutcome('no-impact');
    for (var steps = 0; steps < 20000; steps++) {
      physStep(b, PHYS_DT);
      if (b.landed) {
        return { status: 'landed', range: b.mX, maxH: b.maxH, time: b.t, apexT: b.apex ? b.apex.t : 0 };
      }
      if (b.status === 'invalid' || b.status === 'limit') return physOutcome(b.status);
    }
    return physOutcome('limit');
  }
  // Velocity that lands at range R for a fixed angle (bisection; range is
  // monotonic in v for a fixed angle). Returns null if unreachable ≤ 200 m/s.
  function physSolveVelocity(angle, R, grav, dragOn, mass, height) {
    mass = mass == null ? 1 : mass;
    height = height === undefined ? 0 : height;
    if (!physValidLaunch(angle, 0, grav, mass, height) || !physFinite(R) || R < 0 || grav <= 0) return null;
    if (R === 0) return 0;
    if ((angle === 0 && height === 0) || angle >= 90) return null;
    var lo = 0, hi = 200;
    var upper = physSimulate(angle, hi, grav, dragOn, mass, height);
    if (upper.status !== 'landed' || upper.range < R) return null;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      var result = physSimulate(angle, mid, grav, dragOn, mass, height);
      if (result.status !== 'landed') return null;
      if (result.range < R) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Lowest nonnegative angle that lands at R. From an elevated launch a
  // short target can require the descending branch of the range-angle curve.
  function physSolveAngle(vel, R, grav, dragOn, mass, height) {
    mass = mass == null ? 1 : mass;
    height = height === undefined ? 0 : height;
    if (!physValidLaunch(0, vel, grav, mass, height) || !physFinite(R) || R < 0 || grav <= 0) return null;
    if (R === 0) return height > 0 && vel > 0 ? 90 : 0;
    if (vel === 0) return null;
    var horizontal = physSimulate(0, vel, grav, dragOn, mass, height);
    if (horizontal.status !== 'landed') return null;
    if (Math.abs(horizontal.range - R) < 1e-9) return 0;
    // Locate the continuous maximum before solving its rising branch. An
    // integer-angle scan can incorrectly reject reachable near-maximum shots.
    var peakLo = 0, peakHi = 90;
    for (var a = 0; a < 32; a++) {
      var left = peakLo + (peakHi - peakLo) / 3, right = peakHi - (peakHi - peakLo) / 3;
      var leftResult = physSimulate(left, vel, grav, dragOn, mass, height);
      var rightResult = physSimulate(right, vel, grav, dragOn, mass, height);
      if (leftResult.status !== 'landed' || rightResult.status !== 'landed') return null;
      if (leftResult.range < rightResult.range) peakLo = left; else peakHi = right;
    }
    var bestA = (peakLo + peakHi) / 2;
    var best = physSimulate(bestA, vel, grav, dragOn, mass, height);
    if (best.status !== 'landed' || best.range + 1e-9 < R) return null;
    var fallingBranch = R < horizontal.range;
    var lo = fallingBranch ? bestA : 0, hi = fallingBranch ? 90 : bestA;
    for (var i = 0; i < 30; i++) {
      var mid = (lo + hi) / 2;
      var result = physSimulate(mid, vel, grav, dragOn, mass, height);
      if (result.status !== 'landed') return null;
      if (fallingBranch ? result.range > R : result.range < R) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Investigation evidence is copied from completed runs, never recomputed
  // from current controls. Only primitives enter an archived observation.
  function physRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function physRecordedHeight(v) {
    if (!Object.prototype.hasOwnProperty.call(v, 'launchHeight')) return 0;
    return physFinite(v.launchHeight) && v.launchHeight >= 0 && v.launchHeight <= 50 ? v.launchHeight : null;
  }
  function physEvidenceRun(v) {
    if (!physRecord(v) || !Number.isSafeInteger(v.n) || v.n <= 0 || typeof v.drag !== 'boolean') return null;
    if (!['angle', 'vel', 'grav', 'mass', 'range', 'maxH', 'time'].every(function(k) { return physFinite(v[k]); })) return null;
    var height = physRecordedHeight(v);
    if (height === null || v.angle < (height > 0 ? 0 : 5) || v.angle > 85 || v.vel < 5 || v.vel > 50 || v.grav < 1 || v.grav > 25 || v.mass < 1 || v.mass > 10 || v.range < 0 || v.maxH < height || v.time <= 0) return null;
    var copy = { n: v.n, angle: v.angle, vel: v.vel, grav: v.grav, mass: v.mass, launchHeight: height, drag: v.drag, range: v.range, maxH: v.maxH, time: v.time };
    if (typeof v.modelVersion === 'string') copy.modelVersion = v.modelVersion.slice(0, 80);
    return Object.freeze(copy);
  }
  function physEvidenceRuns(rows) {
    var seen = {};
    return (Array.isArray(rows) ? rows : []).map(physEvidenceRun).filter(function(r) {
      if (!r || seen[r.n]) return false;
      seen[r.n] = true;
      return true;
    }).slice(0, 8);
  }
  function physNormalizeInvestigationDraft(raw, runLog) {
    raw = physRecord(raw) ? raw : {};
    var draft = {};
    var limits = { title: 160, question: 800, prediction: 2000, observation: 2000, claim: 2000, activityId: 80 };
    Object.keys(limits).forEach(function(k) { draft[k] = typeof raw[k] === 'string' ? raw[k].slice(0, limits[k]) : ''; });
    var valid = {};
    physEvidenceRuns(runLog).forEach(function(r) { valid[r.n] = true; });
    var selected = {};
    draft.selectedRunIds = (Array.isArray(raw.selectedRunIds) ? raw.selectedRunIds : []).filter(function(n) {
      if (!Number.isSafeInteger(n) || !valid[n] || selected[n]) return false;
      selected[n] = true;
      return true;
    }).slice(0, 8);
    return draft;
  }
  function physInvestigationIdentity(id, createdAt) {
    var validId = (typeof id === 'string' && id.trim().length > 0 && id.length <= 96) || (Number.isSafeInteger(id) && id > 0);
    return validId && typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(createdAt) && isFinite(Date.parse(createdAt));
  }
  function physCreateInvestigation(draft, runLog, id, createdAt) {
    if (!physInvestigationIdentity(id, createdAt)) return null;
    var normalized = physNormalizeInvestigationDraft(draft, runLog);
    var valid = physEvidenceRuns(runLog);
    var runs = normalized.selectedRunIds.map(function(n) { return valid.find(function(r) { return r.n === n; }); });
    if (runs.length < 2) return null;
    delete normalized.selectedRunIds;
    return Object.freeze(Object.assign({}, normalized, { id: id, createdAt: new Date(createdAt).toISOString(), runs: Object.freeze(runs) }));
  }
  function physNormalizeInvestigations(raw) {
    var seen = Object.create(null);
    return (Array.isArray(raw) ? raw : []).map(function(item) {
      if (!physRecord(item) || !physInvestigationIdentity(item.id, item.createdAt)) return null;
      var runs = physEvidenceRuns(item.runs);
      var saved = physCreateInvestigation(Object.assign({}, item, { selectedRunIds: runs.map(function(r) { return r.n; }) }), runs, item.id, item.createdAt);
      if (!saved || seen[String(saved.id)]) return null;
      seen[String(saved.id)] = true;
      return saved;
    }).filter(Boolean).slice(-12);
  }
  function physCompareRuns(first, second) {
    var a = physEvidenceRun(first), b = physEvidenceRun(second);
    if (!a || !b) return null;
    var units = { angle: 'deg', vel: 'm/s', grav: 'm/s²', drag: '', mass: 'kg', launchHeight: 'm' };
    var changes = Object.keys(units).filter(function(k) { return a[k] !== b[k]; }).map(function(k) {
      return { key: k, before: a[k], after: b[k], unit: units[k] };
    });
    var measurements = {};
    ['range', 'maxH', 'time'].forEach(function(k) {
      var delta = b[k] - a[k];
      var percent = a[k] === 0 ? null : delta / a[k] * 100;
      var ratio = a[k] === 0 ? null : b[k] / a[k];
      measurements[k] = { before: a[k], after: b[k], delta: physFinite(delta) ? delta : null, percentChange: physFinite(percent) ? percent : null, ratio: physFinite(ratio) ? ratio : null, unit: k === 'time' ? 's' : 'm' };
    });
    var modelCompatible = typeof a.modelVersion === 'string' && a.modelVersion.trim().length > 0 && a.modelVersion === b.modelVersion;
    return { fromRunId: a.n, toRunId: b.n, changes: changes, measurements: measurements, modelCompatible: modelCompatible, modelWarning: !modelCompatible, fairTest: changes.length === 1 && modelCompatible };
  }
  function physFormatInvestigationReport(item, translator) {
    var saved = physNormalizeInvestigations([item])[0];
    if (!saved) return null;
    function __alloT(key, fallback) { var v; try { v = typeof translator === 'function' ? translator(key, fallback) : null; } catch(e) {} return typeof v === 'string' ? v : fallback; }
    var labels = {
      angle: __alloT('stem.physics.report_angle', 'Angle'), vel: __alloT('stem.physics.report_speed', 'Launch speed'), grav: __alloT('stem.physics.report_gravity', 'Gravity'), drag: __alloT('stem.physics.report_drag', 'Air drag'), mass: __alloT('stem.physics.report_mass', 'Mass'), launchHeight: __alloT('stem.physics.report_launch_height', 'Launch height above ground'),
      range: __alloT('stem.physics.report_range', 'Range'), maxH: __alloT('stem.physics.report_height', 'Maximum height'), time: __alloT('stem.physics.report_time', 'Flight time')
    };
    var runLabel = __alloT('stem.physics.report_run', 'Run');
    var on = __alloT('stem.physics.report_on', 'on'), off = __alloT('stem.physics.report_off', 'off');
    var unavailable = __alloT('stem.physics.report_unavailable', 'unavailable');
    var lines = ['# ' + (saved.title || __alloT('stem.physics.report_title', 'Physics investigation')), __alloT('stem.physics.report_id', 'Investigation ID') + ': ' + saved.id, __alloT('stem.physics.report_saved', 'Saved') + ': ' + saved.createdAt];
    if (saved.activityId) lines.push(__alloT('stem.physics.report_activity', 'Activity') + ': ' + saved.activityId);
    [
      ['question', __alloT('stem.physics.report_question', 'Question')], ['prediction', __alloT('stem.physics.report_prediction', 'Prediction')],
      ['observation', __alloT('stem.physics.report_observation', 'Observations')], ['claim', __alloT('stem.physics.report_claim', 'Claim and reasoning')]
    ].forEach(function(field) { lines.push('', '## ' + field[1], saved[field[0]] || __alloT('stem.physics.report_blank', 'Not recorded')); });
    lines.push('', '## ' + __alloT('stem.physics.report_evidence', 'Recorded evidence'));
    saved.runs.forEach(function(r) {
      lines.push('', runLabel + ' ' + r.n + ' (' + labels.drag + ': ' + (r.drag ? on : off) + ')',
        labels.angle + ': ' + r.angle + ' deg; ' + labels.vel + ': ' + r.vel + ' m/s; ' + labels.grav + ': ' + r.grav + ' m/s²; ' + labels.mass + ': ' + r.mass + ' kg; ' + labels.launchHeight + ': ' + r.launchHeight + ' m',
        labels.range + ': ' + r.range.toFixed(3) + ' m; ' + labels.maxH + ': ' + r.maxH.toFixed(3) + ' m; ' + labels.time + ': ' + r.time.toFixed(3) + ' s');
      if (r.modelVersion) lines.push(__alloT('stem.physics.report_model', 'Model version') + ': ' + r.modelVersion);
    });
    for (var i = 1; i < saved.runs.length; i++) {
      var comparison = physCompareRuns(saved.runs[0], saved.runs[i]);
      lines.push('', '## ' + runLabel + ' ' + comparison.fromRunId + ' → ' + runLabel + ' ' + comparison.toRunId);
      lines.push(__alloT('stem.physics.report_changed', 'Changed variables') + ': ' + (comparison.changes.map(function(c) { return labels[c.key] + ' ' + (c.key === 'drag' ? (c.before ? on : off) : c.before) + ' → ' + (c.key === 'drag' ? (c.after ? on : off) : c.after) + (c.unit ? ' ' + c.unit : ''); }).join('; ') || (comparison.modelCompatible ? __alloT('stem.physics.report_repeat', 'none; repeat trial') : __alloT('stem.physics.report_no_setting_changes', 'none'))));
      if (comparison.modelWarning) lines.push(__alloT('stem.physics.report_model_warning', 'These runs have different or unrecorded numerical model versions. Measured differences may reflect the model update, so they cannot isolate the effect of a launch setting.'));
      if (comparison.changes.length > 1) lines.push(__alloT('stem.physics.report_confounded', 'Several variables changed, so these runs cannot isolate the effect of one variable.'));
      if (comparison.changes.some(function(c) { return c.key === 'mass'; }) && !saved.runs[0].drag && !saved.runs[i].drag) lines.push(__alloT('stem.physics.report_mass_vacuum', 'Without air drag, mass does not change the trajectory.'));
      ['range', 'maxH', 'time'].forEach(function(k) {
        var m = comparison.measurements[k];
        lines.push(labels[k] + ': ' + __alloT('stem.physics.report_change', 'change') + ' ' + (m.delta == null ? unavailable : m.delta.toFixed(3)) + ' ' + m.unit + '; ' + __alloT('stem.physics.report_percent_change', 'percent change') + ' ' + (m.percentChange == null ? unavailable : m.percentChange.toFixed(2) + '%') + '; ' + __alloT('stem.physics.report_ratio', 'ratio') + ' ' + (m.ratio == null ? unavailable : m.ratio.toFixed(3)));
      });
    }
    lines.push('', '## ' + __alloT('stem.physics.report_assumptions', 'Model assumptions'), __alloT('stem.physics.report_height_model', 'Launch height and maximum height are measured above ground. Landing is at ground level. Gravity is uniform. Wind, spin, and buoyancy are omitted.'));
    if (saved.runs.some(function(r) { return r.launchHeight > 0; })) lines.push(__alloT('stem.physics.report_elevated_scaling', 'For elevated launches, the equal-height range formula and its speed-squared and inverse-gravity scaling do not apply.'));
    if (saved.runs.some(function(r) { return !r.drag; })) lines.push(__alloT('stem.physics.report_vacuum_model', 'Drag off: only gravity acts; horizontal velocity is constant and mechanical energy is conserved.'));
    if (saved.runs.some(function(r) { return r.drag; })) lines.push(__alloT('stem.physics.report_drag_model', 'Drag on: force opposes velocity with magnitude k × speed². Drag acceleration is force divided by mass. Mechanical energy decreases.'), 'k = ' + PHYS_DRAG_K + ' kg/m');
    return lines.join('\n');
  }
  // Derive an inspection from recorded evidence, never the current sliders.
  // The frozen scalar snapshot cannot change when the live flight advances.
  function physInspectSample(trail, index) {
    if (!Array.isArray(trail) || !Number.isInteger(index) || index < 0 || index >= trail.length) return null;
    var p = trail.parameters, point = trail[index];
    if (!p || typeof p.drag !== 'boolean' || trail.modelVersion !== PHYS_MODEL_VERSION ||
        !physValidLaunch(p.angle, p.velocity, p.gravity, p.mass, p.launchHeight) ||
        !physFinite(p.launchHeight) || !point || !['t', 'mX', 'mY', 'mVx', 'mVy'].every(function(k) { return physFinite(point[k]); }) ||
        point.t < 0 || point.mX < 0 || point.mY < 0) return null;
    var speed = Math.hypot(point.mVx, point.mVy);
    var dragK = p.drag ? PHYS_DRAG_K : 0;
    var fx = -dragK * speed * point.mVx;
    var fy = -p.mass * p.gravity - dragK * speed * point.mVy;
    var ke = 0.5 * p.mass * speed * speed, pe = p.mass * p.gravity * point.mY;
    var initialEnergy = 0.5 * p.mass * p.velocity * p.velocity + p.mass * p.gravity * p.launchHeight;
    if (![speed, fx, fy, ke, pe, initialEnergy, fx / p.mass, fy / p.mass].every(physFinite)) return null;
    return Object.freeze({
      index: index, count: trail.length, t: point.t, x: point.mX, y: point.mY,
      vx: point.mVx, vy: point.mVy, speed: speed, ax: fx / p.mass, ay: fy / p.mass,
      fx: fx, fy: fy, gravityForce: p.mass * p.gravity, dragForce: dragK * speed * speed,
      ke: ke, pe: pe, totalEnergy: ke + pe, initialEnergy: initialEnergy,
      dragLoss: p.drag ? Math.max(0, initialEnergy - ke - pe) : 0,
      parameters: Object.freeze({ angle: p.angle, velocity: p.velocity, gravity: p.gravity, mass: p.mass,
        launchHeight: p.launchHeight, airResist: p.drag, modelVersion: trail.modelVersion }),
      run: Number.isSafeInteger(trail.run) && trail.run > 0 ? trail.run : null,
      impact: index === trail.length - 1 && point.t > 0 && point.mY === 0 && point.mVy <= 0
    });
  }
  function physSelectedInspection(cv) {
    var selection = cv && cv._inspection;
    var latest = cv && cv._trails && cv._trails[cv._trails.length - 1];
    return selection && Array.isArray(latest) && selection.trail === latest && latest[selection.index] && selection.snapshot
      ? selection.snapshot : null;
  }
  try {
    window.StemLab._physics = { DT: PHYS_DT, DRAG_K: PHYS_DRAG_K, MODEL_VERSION: PHYS_MODEL_VERSION, step: physStep, simulate: physSimulate, vacuum: physVacuum, solveVelocity: physSolveVelocity, solveAngle: physSolveAngle, inspectSample: physInspectSample,
      normalizeInvestigationDraft: physNormalizeInvestigationDraft, normalizeInvestigations: physNormalizeInvestigations, compareRuns: physCompareRuns, createInvestigation: physCreateInvestigation, formatInvestigationReport: physFormatInvestigationReport };
  } catch (e) {}

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-physics')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-physics';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ 🔬 physics (physics) ═══
  window.StemLab.registerTool('physics', {
    icon: '\uD83C\uDFB1',
    label: 'Physics Simulator',
    desc: 'Launch projectiles, explore kinematics, and learn Newtons laws',
    color: 'sky',
    category: 'science',
    questHooks: [
      // targetsHit counts crates destroyed in Target Mode plus Challenge tiers
      // completed. (It used to compare targetScore, which is XP \u2014 15 per
      // round \u2014 so the quest fired after a single crate.)
      { id: 'hit_3_targets', label: 'Hit 3 targets in target practice', icon: '\uD83C\uDFAF', check: function(d) { return (d.targetsHit || 0) >= 3; }, progress: function(d) { return (d.targetsHit || 0) + '/3 targets'; } },
      { id: 'complete_target_round', label: 'Complete a full target round', icon: '\uD83C\uDFC6', check: function(d) { return (d.targetRound || 1) >= 2; }, progress: function(d) { return (d.targetRound || 1) >= 2 ? 'Done!' : 'Round ' + (d.targetRound || 1); } },
      { id: 'launch_10_projectiles', label: 'Launch 10 projectiles', icon: '\uD83D\uDE80', check: function(d) { return (d.launchCount || 0) >= 10; }, progress: function(d) { return (d.launchCount || 0) + '/10'; } },
      { id: 'myth_3', label: 'Answer 3 physics myths (True or False)', icon: '\uD83E\uDDE0', check: function(d) { return (d.physMythsDone || 0) >= 3; }, progress: function(d) { return (d.physMythsDone || 0) + '/3 myths'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var themeSurface = isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc');
      var themeInk = isContrast ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
      // i18n: __alloT(key, englishFallback) → ctx.t if available, else the English string.
      // Keys are stem.physics.<snake_case>; harvested by dev-tools/i18n/extract_stem_tool_en.cjs.
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      // `var t = ctx.t` removed 2026-09-21: declared, never called. This tool already uses the __alloT wrapper; the bare alias drops the English fallback, so leaving it invites a future edit to ship raw keys.
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // ── Tool body (physics) ──
      return (function() {
          // State initialization guard
          if (!labToolData || !labToolData.physics) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { physics: {
                angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false,
                showLearn: false, showFlightData: false, showEnergy: false, showVectors: false,
                challengeTier: 0, challengeActive: false, launchCount: 0, targetsHit: 0,
                // Live "show your work" formulas panel
                showFormulas: false,
                // Quantitative estimate-then-launch challenge
                predictedRange: '', lastPredictionRange: null, predictionResult: null, predictionStreak: 0,
                // Trajectory comparison overlay
                showOverlay: false,
                // Simulation time control (1.0 = real-time; 0.5 / 0.25 slow-mo; 0 = paused)
                simSpeed: 1.0,
                // X-Y motion component graphs (Vx-vs-t + Vy-vs-t side-by-side)
                showGraphs: false,
                // Target Destruction Mode
                targetMode: false, targetRound: 0, targetScore: 0, targetAttempts: 0,
                targetList: null, targetConstraint: null, targetFeedback: null, targetShowScaffold: false,
                // Battle Mode
                battleMode: false, battleType: null, battleRound: 0,
                playerHP: 3, enemyHP: 3, enemyDist: 0, aiDifficulty: 'medium',
                isPlayerTurn: true, battleConstraint: null, battleFeedback: null, battleLog: []
              }});
            });
            // This transient state owns a stable AA pair because dark theme tokens
            // can otherwise resolve to light ink over the host's white tool card.
            return React.createElement('div', { className: 'p-8 text-center', style: { color: '#475569', backgroundColor: '#ffffff' } }, __alloT('stem.physics.loading', 'Loading...'));
          }
          // Saved results are complete observations. Never fill missing result
          // fields from today's sliders: that would invent experimental evidence.
          function physNormalizeState(raw) {
            var isRecord = function(v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
            var finite = function(v) { return typeof v === 'number' && isFinite(v); };
            var num = function(v, lo, hi, fallback) { return finite(v) ? Math.min(hi, Math.max(lo, v)) : fallback; };
            var counter = function(v) { return Math.floor(num(v, 0, Number.MAX_SAFE_INTEGER - 1, 0)); };
            var validId = function(v) { return Number.isSafeInteger(v) && v > 0 && v < Number.MAX_SAFE_INTEGER; };
            raw = isRecord(raw) ? raw : {};
            function flight(v) {
              if (!isRecord(v) || !['angle', 'vel', 'grav', 'mass', 'range', 'maxH', 'time'].every(function(k) { return finite(v[k]); })) return null;
              var height = physRecordedHeight(v);
              if (height === null || v.angle < (height > 0 ? 0 : 5) || v.angle >= 90 || v.vel <= 0 || v.grav <= 0 || v.mass <= 0 || v.range < 0 || v.maxH < height || v.time <= 0) return null;
              return Object.assign({}, v, { launchHeight: height, drag: v.drag === true });
            }
            var savedLog = Array.isArray(raw.runLog) ? raw.runLog : [];
            var log = [];
            var usedIds = {};
            var savedIds = {};
            savedLog.forEach(function(row) { if (flight(row) && validId(row.n)) savedIds[row.n] = true; });
            savedLog.forEach(function(row, i) {
              var r = flight(row);
              if (!r) return;
              // Older saves may lack n. Use the saved total to recover their
              // original positions even when only the latest eight remain.
              var n = validId(r.n) ? r.n : Math.max(1, counter(raw.runCount) - savedLog.length + i + 1);
              while (usedIds[n] || (!validId(r.n) && savedIds[n])) n++;
              r.n = n;
              usedIds[n] = true;
              log.push(r);
            });
            log = log.slice(-8);
            var result = isRecord(raw.predictionResult) && ['predicted', 'actual', 'errPct'].every(function(k) {
              return finite(raw.predictionResult[k]) && raw.predictionResult[k] >= 0;
            }) ? Object.assign({}, raw.predictionResult) : null;
            if (result) {
              result.tier = ['bullseye', 'close', 'miss'].indexOf(result.tier) >= 0 ? result.tier : 'miss';
              result.xp = counter(result.xp);
              result.reason = typeof result.reason === 'string' ? result.reason.slice(0, 400) : '';
              result.revision = typeof result.revision === 'string' ? result.revision : '';
              result.reflectionComplete = result.reflectionComplete === true;
            }
            var launchHeight = raw.targetMode || raw.challengeActive || raw.battleMode ? 0 : num(raw.launchHeight, 0, 50, 0);
            var state = Object.assign({}, raw, {
              gravity: num(raw.gravity, 1, 25, 9.8),
              mass: num(raw.mass, 1, 10, 1),
              angle: num(raw.angle, launchHeight > 0 ? 0 : 5, 85, 45),
              launchHeight: launchHeight,
              velocity: num(raw.velocity, 5, 50, 25),
              airResist: raw.airResist === true,
              simSpeed: num(raw.simSpeed, 0, 1, 1),
              predictionResult: result,
              predictedRange: typeof raw.predictedRange === 'string' || finite(raw.predictedRange) ? raw.predictedRange : '',
              lastPredictionRange: finite(raw.lastPredictionRange) && raw.lastPredictionRange >= 0 ? raw.lastPredictionRange : null,
              lastFlight: flight(raw.lastFlight),
              runLog: log,
              runCount: Math.max(counter(raw.runCount), ...log.map(function(r) { return r.n; })),
              targetList: Array.isArray(raw.targetList) ? raw.targetList.filter(function(t) {
                return isRecord(t) && finite(t.x) && t.x >= 0 && finite(t.y) && finite(t.radius) && t.radius > 0;
              }).map(function(t, i) { return Object.assign({}, t, { id: counter(t.id == null ? i : t.id), destroyed: t.destroyed === true }); }) : null,
              battleLog: Array.isArray(raw.battleLog) ? raw.battleLog.filter(function(v) { return typeof v === 'string'; }) : [],
              aiExplain: typeof raw.aiExplain === 'string' ? raw.aiExplain : '',
              aiError: typeof raw.aiError === 'string' ? raw.aiError : ''
            });
            ['launchCount', 'targetsHit', 'targetScore', 'targetAttempts', 'predictionStreak', 'quizStreak', 'physMythsDone', 'liveTick', 'battleRound'].forEach(function(k) { state[k] = counter(raw[k]); });
            state.targetRound = Math.floor(num(raw.targetRound, 0, 10, 0));
            state.challengeTier = Math.floor(num(raw.challengeTier, 0, 3, 0));
            state.targetConstraint = null;
            var constraint = raw.targetConstraint;
            if (isRecord(constraint) && finite(constraint.value)) {
              if (constraint.type === 'fixedAngle' && constraint.value >= 5 && constraint.value <= 85) state.targetConstraint = { type: constraint.type, value: constraint.value };
              if (constraint.type === 'fixedVelocity' && constraint.value >= 5 && constraint.value <= 50) state.targetConstraint = { type: constraint.type, value: constraint.value };
            }
            if (state.targetMode && state.targetConstraint) state[state.targetConstraint.type === 'fixedAngle' ? 'angle' : 'velocity'] = state.targetConstraint.value;
            ['targetFeedback', 'challengeFeedback', 'battleFeedback'].forEach(function(k) {
              state[k] = isRecord(raw[k]) && typeof raw[k].msg === 'string' ? Object.assign({}, raw[k]) : null;
            });
            state.quizOptions = Array.isArray(raw.quizOptions) ? raw.quizOptions.filter(function(v) { return finite(v) && v >= 0; }) : [];
            state.quizActive = raw.quizActive === true && ['quizAngle', 'quizVel', 'quizGrav', 'quizAnswer'].every(function(k) { return finite(raw[k]) && raw[k] > 0; }) && state.quizOptions.length > 0;
            state.quizDiag = typeof raw.quizDiag === 'string' ? raw.quizDiag : '';
            state.physMyth = isRecord(raw.physMyth) && ['s', 'why', 'tryIt'].every(function(k) { return typeof raw.physMyth[k] === 'string'; }) && typeof raw.physMyth.t === 'boolean' ? Object.assign({}, raw.physMyth) : null;
            state.investigations = physNormalizeInvestigations(raw.investigations);
            state.investigationDraft = physNormalizeInvestigationDraft(raw.investigationDraft, state.runLog);
            state.investigationOpen = raw.investigationOpen === true;
            var selectedInvestigation = state.investigations.find(function(item) { return String(item.id) === String(raw.selectedInvestigationId); });
            state.selectedInvestigationId = selectedInvestigation ? selectedInvestigation.id : null;
            state.investigations.forEach(function(item) { item.runs.forEach(function(r) { state.runCount = Math.max(state.runCount, r.n); }); });
            if (state.lastFlight && validId(state.lastFlight.n)) state.runCount = Math.max(state.runCount, state.lastFlight.n);
            state.modelComparison = null;
            var paired = raw.modelComparison;
            if (isRecord(paired) && isRecord(paired.parameters)) {
              var parameters = paired.parameters;
              var pairHeight = physRecordedHeight(parameters);
              var bounds = { angle: [pairHeight > 0 ? 0 : 5, 85], velocity: [5, 50], gravity: [1, 25], mass: [1, 10] };
              var validParameters = pairHeight !== null && Object.keys(bounds).every(function(k) { return finite(parameters[k]) && parameters[k] >= bounds[k][0] && parameters[k] <= bounds[k][1]; });
              var validResults = ['vacuum', 'drag'].every(function(k) { var r = paired[k]; return isRecord(r) && finite(r.range) && r.range >= 0 && finite(r.maxH) && r.maxH >= pairHeight && finite(r.time) && r.time > 0; });
              if (validParameters && validResults) state.modelComparison = {
                parameters: { angle: parameters.angle, velocity: parameters.velocity, gravity: parameters.gravity, mass: parameters.mass, launchHeight: pairHeight },
                vacuum: { range: paired.vacuum.range, maxH: paired.vacuum.maxH, time: paired.vacuum.time },
                drag: { range: paired.drag.range, maxH: paired.drag.maxH, time: paired.drag.time }
              };
            }
            return state;
          }
          window.StemLab._physics.normalizeState = physNormalizeState;
          const d = physNormalizeState(labToolData.physics);

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, physics: { ...prev.physics, [key]: val } }));
          // Functional increment: safe from setTimeout chains (symmetry demo,
          // landing callbacks) where a captured `d` would be stale.
          const bump = (key, delta) => setLabToolData(prev => ({ ...prev, physics: { ...prev.physics, [key]: (physNormalizeState(prev.physics)[key] || 0) + (delta == null ? 1 : delta) } }));
          function physClearInspection() {
            var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
            var hadSelection = !!(cv && cv._inspection);
            if (cv) {
              cv._inspection = null;
              if (hadSelection && cv._physScheduleFrame) cv._physScheduleFrame();
            }
            setLabToolData(function(prev) {
              if (!hadSelection && !prev.physics.inspectionSnapshot) return prev;
              return Object.assign({}, prev, { physics: Object.assign({}, prev.physics, {
                inspectionSnapshot: '', liveTick: (prev.physics.liveTick || 0) + 1
              }) });
            });
          }
          function physSelectSample(index) {
            var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
            var trail = cv && cv._trails && cv._trails[cv._trails.length - 1];
            var snapshot = physInspectSample(trail, index);
            if (!snapshot) return false;
            if (cv._cancelSymmetryDemo) cv._cancelSymmetryDemo();
            cv.dataset.simSpeed = '0';
            cv._inspection = { trail: trail, index: index, snapshot: snapshot };
            if (cv._physScheduleFrame) cv._physScheduleFrame();
            var text = __alloT('stem.physics.inspect_captured', 'Captured flight state at') + ' ' + snapshot.t.toFixed(3) + ' s. ' +
              'x = ' + snapshot.x.toFixed(2) + ' m; y = ' + snapshot.y.toFixed(2) + ' m. ' +
              'Vx = ' + snapshot.vx.toFixed(2) + ' m/s; Vy = ' + snapshot.vy.toFixed(2) + ' m/s. ' +
              __alloT('stem.physics.inspect_acceleration', 'Total acceleration') + ': ax = ' + snapshot.ax.toFixed(2) + ' m/s²; ay = ' + snapshot.ay.toFixed(2) + ' m/s². ' +
              __alloT('stem.physics.inspect_gravity_force', 'Gravitational force downward') + ': ' + snapshot.gravityForce.toFixed(2) + ' N. ' +
              __alloT('stem.physics.inspect_drag_force', 'Drag force opposite velocity') + ': ' + snapshot.dragForce.toFixed(2) + ' N. ' +
              'Fx = ' + snapshot.fx.toFixed(2) + ' N; Fy = ' + snapshot.fy.toFixed(2) + ' N. ' +
              'KE = ' + snapshot.ke.toFixed(2) + ' J; PE = ' + snapshot.pe.toFixed(2) + ' J; KE + PE = ' + snapshot.totalEnergy.toFixed(2) + ' J. ' +
              __alloT('stem.physics.inspect_energy_transferred', 'Energy transferred to the air') + ': ' + snapshot.dragLoss.toFixed(2) + ' J. ' +
              __alloT('stem.physics.inspect_axes', 'Right and up are positive; potential energy is measured from the ground.');
            setLabToolData(function(prev) { return Object.assign({}, prev, { physics: Object.assign({}, prev.physics, {
              simSpeed: 0, showFlightData: true, showGraphs: true, inspectionSnapshot: text,
              liveTick: (prev.physics.liveTick || 0) + 1
            }) }); });
            return true;
          }
          // Every launch goes through here so the Launches metric, the
          // "recommended next move" ladder and the launch_10 quest all count.
          function fireLaunch(cv, settings, demoLaunch) {
            cv = cv || (typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null);
            if (!cv || !cv._launch) return false;
            if (!demoLaunch && cv._cancelSymmetryDemo) cv._cancelSymmetryDemo();
            bump('launchCount', 1);
            sfxPhyLaunch();
            cv._launch(settings);
            return true;
          }
          // Grade band drives the Learn panel and the Myths bank alike.
          var physGradeLc = (gradeLevel || '5th Grade').toLowerCase();
          var physBand = /9th|10|11|12|high/.test(physGradeLc) ? '9-12' : /6th|7th|8th/.test(physGradeLc) ? '6-8' : '3-5';
          // Tier challenges (completion is checked on landing in _onAnyLand).
          var TIER_CHALLENGES = [
            { tier: 1, label: '🥇 ' + __alloT('stem.physics.challenge_tier_1', 'Tier 1'), desc: __alloT('stem.physics.challenge_desc_1', 'Hit the 50m flag'), target: 50, tol: 10, reward: 10, req: '' },
            { tier: 2, label: '🥈 ' + __alloT('stem.physics.challenge_tier_2', 'Tier 2'), desc: __alloT('stem.physics.challenge_desc_2', 'Hit 100m with Air Drag ON'), target: 100, tol: 12, reward: 20, req: 'airResist' },
            { tier: 3, label: '🥉 ' + __alloT('stem.physics.challenge_tier_3', 'Tier 3'), desc: __alloT('stem.physics.challenge_desc_3', 'Hit 200m on Mars'), target: 200, tol: 15, reward: 35, req: 'mars' }
          ];
          // ═══ TARGET DESTRUCTION MODE — Constraint Engine ═══
          var TARGET_LEVELS = [
            { round: 1,  targets: [{x:80, y:0}],   constraint: {type:'fixedAngle', value:45},  gravity: 9.8, drag: false, label: __alloT('stem.physics.target_cadet_1', 'Cadet 1'), desc: __alloT('stem.physics.target_r1_desc', 'Angle locked at 45°. Calculate velocity to hit 80m.'), xp: 15, tol: 10 },
            { round: 2,  targets: [{x:120, y:0}],  constraint: {type:'fixedVelocity', value:35}, gravity: 9.8, drag: false, label: __alloT('stem.physics.target_cadet_2', 'Cadet 2'), desc: __alloT('stem.physics.target_r2_desc', 'Velocity locked at 35 m/s. Calculate angle to hit 120m.'), xp: 15, tol: 10 },
            { round: 3,  targets: [{x:60, y:0}],   constraint: {type:'fixedAngle', value:30},  gravity: 9.8, drag: false, label: __alloT('stem.physics.target_cadet_3', 'Cadet 3'), desc: __alloT('stem.physics.target_r3_desc', 'Angle locked at 30°. Hit the 60m crate.'), xp: 15, tol: 8 },
            { round: 4,  targets: [{x:150, y:0}],  constraint: {type:'fixedVelocity', value:40}, gravity: 9.8, drag: false, label: __alloT('stem.physics.target_gunner_1', 'Gunner 1'), desc: __alloT('stem.physics.target_r4_desc', 'Velocity locked at 40 m/s. Hit 150m.'), xp: 25, tol: 12 },
            { round: 5,  targets: [{x:100, y:0}],  constraint: {type:'fixedAngle', value:55},  gravity: 1.6, drag: false, label: __alloT('stem.physics.target_gunner_2', 'Gunner 2'), desc: __alloT('stem.physics.target_r5_desc', 'On the Moon! Angle locked at 55°. Hit 100m.'), xp: 25, tol: 12 },
            { round: 6,  targets: [{x:80, y:0}, {x:160, y:0}], constraint: {type:'fixedAngle', value:40}, gravity: 9.8, drag: false, label: __alloT('stem.physics.target_gunner_3', 'Gunner 3'), desc: __alloT('stem.physics.target_r6_desc', 'Two targets! Angle locked at 40°. Hit both.'), xp: 30, tol: 10 },
            { round: 7,  targets: [{x:90, y:0}],   constraint: {type:'fixedAngle', value:35},  gravity: 9.8, drag: true, label: __alloT('stem.physics.target_sniper_1', 'Sniper 1'), desc: __alloT('stem.physics.target_r7_desc', 'Air drag ON! Angle locked at 35°. Compensate!'), xp: 40, tol: 15 },
            { round: 8,  targets: [{x:200, y:0}],  constraint: {type:'fixedVelocity', value:45}, gravity: 3.7, drag: false, label: __alloT('stem.physics.target_sniper_2', 'Sniper 2'), desc: __alloT('stem.physics.target_r8_desc', 'Mars gravity. Velocity locked at 45 m/s. Hit 200m.'), xp: 40, tol: 15 },
            { round: 9,  targets: [{x:70, y:0}, {x:140, y:0}, {x:220, y:0}], constraint: {type:'fixedAngle', value:42}, gravity: 9.8, drag: false, label: __alloT('stem.physics.target_sniper_3', 'Sniper 3'), desc: __alloT('stem.physics.target_r9_desc', 'Triple targets! Same angle, adjust velocity each shot.'), xp: 50, tol: 10 },
            // 38 m/s through air tops out near 103 m (1 kg), so the old 130 m crate was unreachable.
            { round: 10, targets: [{x:85, y:0}],  constraint: {type:'fixedVelocity', value:38}, gravity: 9.8, drag: true, label: __alloT('stem.physics.target_ace', 'Ace'), desc: __alloT('stem.physics.target_r10_desc', 'Final challenge: drag ON, velocity locked at 38 m/s. Prove your mastery.'), xp: 60, tol: 12 },
          ];

          function startTargetRound(roundNum) {
            var activeCanvas = document.getElementById('physicsCanvas');
            if (activeCanvas && activeCanvas._cancelFlight) activeCanvas._cancelFlight();
            var level = TARGET_LEVELS[Math.min(roundNum - 1, TARGET_LEVELS.length - 1)];
            var tgts = level.targets.map(function(t, i) {
              return { x: t.x, y: t.y || 0, radius: level.tol, destroyed: false, id: i };
            });
            upd('targetRound', roundNum);
            upd('targetList', tgts);
            upd('targetConstraint', level.constraint);
            upd('targetFeedback', null);
            upd('targetAttempts', 0);
            upd('targetShowScaffold', false);
            // Remember the student's own world so End can put it back
            // (rounds switch to Moon/Mars gravity and toggle drag).
            if (!d.targetMode || !d.targetPrev) upd('targetPrev', { gravity: d.gravity, airResist: !!d.airResist, launchHeight: d.launchHeight, angle: d.angle });
            // Apply level conditions
            upd('gravity', level.gravity);
            upd('airResist', level.drag);
            upd('launchHeight', 0);
            // Apply constraint
            if (level.constraint.type === 'fixedAngle') {
              upd('angle', level.constraint.value);
            } else if (level.constraint.type === 'fixedVelocity') {
              upd('velocity', level.constraint.value);
            }
            if (addToast) addToast('\u{1F3AF} ' + level.label + ': ' + level.desc, 'info');
          }

          function endTargetMode() {
            var activeCanvas = document.getElementById('physicsCanvas');
            if (activeCanvas && activeCanvas._cancelFlight) activeCanvas._cancelFlight();
            upd('targetMode', false); upd('targetList', null); upd('targetConstraint', null); upd('targetFeedback', null); upd('targetShowScaffold', false);
            var prev = d.targetPrev;
            if (prev) {
              upd('gravity', prev.gravity); upd('airResist', !!prev.airResist);
              upd('launchHeight', typeof prev.launchHeight === 'number' ? prev.launchHeight : 0);
              if (typeof prev.angle === 'number') upd('angle', prev.angle);
              upd('targetPrev', null);
            }
          }

          function checkTargetHit(landingX) {
            if (!d.targetMode || !d.targetList) return;
            var tgts = d.targetList.map(function(t) { return Object.assign({}, t); });
            var hitAny = false;
            var newlyHit = 0;
            var closestDist = Infinity;
            for (var ti = 0; ti < tgts.length; ti++) {
              if (tgts[ti].destroyed) continue;
              var dist = Math.abs(landingX - tgts[ti].x);
              if (dist < closestDist) closestDist = dist;
              if (dist <= tgts[ti].radius) {
                tgts[ti].destroyed = true;
                hitAny = true;
                newlyHit++;
              }
            }
            upd('targetList', tgts);
            upd('targetAttempts', (d.targetAttempts || 0) + 1);
            if (newlyHit > 0) bump('targetsHit', newlyHit);
            var allDestroyed = tgts.every(function(t) { return t.destroyed; });
            if (hitAny && allDestroyed) {
              // Round complete!
              var levelData = TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)];
              upd('targetScore', (d.targetScore || 0) + levelData.xp);
              upd('targetFeedback', { type: 'success', msg: '\u2705 ' + __alloT('stem.physics.fb_all_destroyed', 'All targets destroyed!') + ' +' + levelData.xp + ' XP' });
              if (awardStemXP) awardStemXP('targetMode', levelData.xp, 'Target Mode Round ' + d.targetRound);
              if (stemCelebrate) stemCelebrate();
              if (addToast) addToast('\u{1F4A5} ' + __alloT('stem.physics.round_prefix', 'Round ') + d.targetRound + ' ' + __alloT('stem.physics.toast_round_complete', 'complete!') + ' +' + levelData.xp + ' XP', 'success');
            } else if (hitAny) {
              var remaining = tgts.filter(function(t){return !t.destroyed;}).length;
              upd('targetFeedback', { type: 'partial', msg: '\u{1F4A5} ' + __alloT('stem.physics.fb_hit_prefix', 'Hit! ') + remaining + ' ' + __alloT('stem.physics.fb_targets_remaining', 'target(s) remaining.') });
              if (addToast) addToast('\u{1F4A5} ' + __alloT('stem.physics.toast_target_hit', 'Target hit! Keep going!'), 'success');
            } else {
              var missMsg = '\u274C ' + __alloT('stem.physics.fb_missed_by', 'Missed by ') + closestDist.toFixed(1) + 'm';
              upd('targetFeedback', { type: 'miss', msg: missMsg });
              if ((d.targetAttempts || 0) >= 2 && !d.targetShowScaffold) {
                upd('targetShowScaffold', true);
              }
              phyTone(200, 0.12, 'sawtooth', 0.05); if (addToast) addToast(missMsg + ' — ' + __alloT('stem.physics.toast_try_again', 'try again!'), 'warning');
            }
          }

          // Calculate correct answer for scaffold display
          function getTargetAnswer() {
            if (!d.targetConstraint || !d.targetList) return null;
            var tgt = d.targetList.find(function(t) { return !t.destroyed; });
            if (!tgt) return null;
            var R = tgt.x;
            var g = d.gravity;
            var dragOn = !!d.airResist;
            var mass = parseFloat(d.mass) || 1;
            var unreachable = __alloT('stem.physics.scaffold_unreachable', 'Target unreachable at this velocity');
            if (d.targetConstraint.type === 'fixedAngle') {
              var theta = d.targetConstraint.value * Math.PI / 180;
              if (dragOn) {
                // No closed form once drag is on: the same integrator that
                // flies the ball solves for the launch speed instead.
                var vd = physSolveVelocity(d.targetConstraint.value, R, g, true, mass);
                return { param: 'velocity', value: vd, equation: __alloT('stem.physics.scaffold_drag_equation', 'Drag ON: no formula \u2014 solved by simulation'), steps: __alloT('stem.physics.scaffold_drag_steps_v', 'Ideal (no drag) would be ') + Math.sqrt(R * g / Math.sin(2 * theta)).toFixed(1) + ' m/s; ' + __alloT('stem.physics.scaffold_drag_steps_sim', 'through air the sim needs about ') + (vd == null ? '?' : vd.toFixed(1) + ' m/s') };
              }
              var v = Math.sqrt(R * g / Math.sin(2 * theta));
              return { param: 'velocity', value: v, equation: 'v = \u221A(R\u00B7g / sin(2\u03B8))', steps: 'v = \u221A(' + R + ' \u00D7 ' + g + ' / sin(2\u00D7' + d.targetConstraint.value + '\u00B0)) = ' + v.toFixed(1) + ' m/s' };
            } else if (d.targetConstraint.type === 'fixedVelocity') {
              var v2 = d.targetConstraint.value;
              if (dragOn) {
                var ad = physSolveAngle(v2, R, g, true, mass);
                if (ad == null) return { param: 'angle', value: null, equation: unreachable, steps: '' };
                var sinIdeal = R * g / (v2 * v2);
                var idealTxt = sinIdeal > 1 ? '\u2014' : (Math.asin(sinIdeal) / 2 * 180 / Math.PI).toFixed(1) + '\u00B0';
                return { param: 'angle', value: ad, equation: __alloT('stem.physics.scaffold_drag_equation', 'Drag ON: no formula \u2014 solved by simulation'), steps: __alloT('stem.physics.scaffold_drag_steps_v', 'Ideal (no drag) would be ') + idealTxt + '; ' + __alloT('stem.physics.scaffold_drag_steps_sim', 'through air the sim needs about ') + ad.toFixed(1) + '\u00B0' };
              }
              var sinVal = R * g / (v2 * v2);
              if (sinVal > 1) return { param: 'angle', value: null, equation: unreachable, steps: '' };
              var theta2 = Math.asin(sinVal) / 2 * 180 / Math.PI;
              return { param: 'angle', value: theta2, equation: '\u03B8 = \u00BD arcsin(R\u00B7g / v\u00B2)', steps: '\u03B8 = \u00BD arcsin(' + R + ' \u00D7 ' + g + ' / ' + v2 + '\u00B2) = ' + theta2.toFixed(1) + '\u00B0' };
            }
            return null;
          }



          // Canvas animated projectile

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {
              try {
                var prevCanvas = canvasRef._lastCanvas;
                // React detaches callback refs on ordinary renders too. Keep
                // the same controller while its canvas remains in the DOM.
                Promise.resolve().then(function () {
                  if (prevCanvas && !prevCanvas.isConnected && prevCanvas._physCleanup) prevCanvas._physCleanup();
                });
              } catch (e) {}
              return;
            }
            canvasRef._lastCanvas = canvasEl;
            if (d.simSpeed > 0 && canvasEl._inspection) physClearInspection();
            var settingsKey = [d.angle, d.velocity, d.gravity, d.mass, d.launchHeight, !!d.airResist, !!d.targetMode, d.targetRound, !!d.challengeActive, d.challengeTier, !!d.battleMode, d.battleRound].join('|');
            if (canvasEl._demo && canvasEl._demo.controlKey !== settingsKey && canvasEl._cancelSymmetryDemo) canvasEl._cancelSymmetryDemo();
            canvasEl._settingsKey = settingsKey;
            canvasEl._settings = {
              angle: d.angle, velocity: d.velocity, gravity: d.gravity, mass: d.mass, launchHeight: d.launchHeight,
              airResist: !!d.airResist, prediction: Number.isFinite(parseFloat(d.predictedRange)) && parseFloat(d.predictedRange) >= 0 ? parseFloat(d.predictedRange) : null,
              targetMode: !!d.targetMode, targetRound: d.targetRound, targetConstraint: d.targetConstraint, battleMode: !!d.battleMode,
              challengeTier: d.challengeActive ? d.challengeTier : null
            };
            canvasEl._demoLaunch = function (settings) { return fireLaunch(canvasEl, settings, true); };
            canvasEl._demoComplete = function (first, second) {
              var msg = __alloT('stem.physics.demo_measured_v2', 'Vacuum comparison complete:') + ' 30° = ' + first.toFixed(2) + ' m; 60° = ' + second.toFixed(2) + ' m.';
              if (addToast) addToast(msg, 'success');
              if (announceToSR) announceToSR(msg);
            };
            canvasEl._modelComparisonComplete = function (settings, results) {
              var comparison = {
                parameters: { angle: settings.angle, velocity: settings.velocity, gravity: settings.gravity, mass: settings.mass, launchHeight: settings.launchHeight },
                vacuum: results[0], drag: results[1]
              };
              upd('modelComparison', comparison);
              var msg = __alloT('stem.physics.model_comparison_complete', 'Vacuum and air-drag comparison complete.') + ' ' +
                __alloT('stem.physics.model_comparison_ranges', 'Measured ranges:') + ' ' + comparison.vacuum.range.toFixed(2) + ' m / ' + comparison.drag.range.toFixed(2) + ' m.';
              if (addToast) addToast(msg, 'success');
              if (announceToSR) announceToSR(msg);
            };

            // Always rebind the hit callback so it captures the LATEST
            // checkTargetHit closure (which sees the current `d`). Without
            // this, _onTargetLand pointed at the first-render checkTargetHit
            // whose `d.targetList` was null, so hits silently no-op'd AND
            // its write-back overwrote live state with a stale snapshot —
            // the cause of the "projectile passes through targets" plus
            // "first target disappears on launch" bugs.
            canvasEl._onTargetLand = function(landingMX, mission) {
              setTimeout(function() {
                if (!canvasEl.isConnected || !mission || !mission.targetMode || !canvasEl._settings.targetMode || mission.targetRound !== canvasEl._settings.targetRound) return;
                if (typeof checkTargetHit === 'function') checkTargetHit(landingMX);
              }, 0);
            };
            // Estimate-then-launch comparison. Same rebind-every-render
            // pattern as _onTargetLand: this closure captures the latest
            // `d.lastPredictionRange` and writes results back via fresh upd.
            // Scoring tiers:
            //   bullseye (within 5%) → +25 XP, streak++
            //   close    (within 15%) → +10 XP, streak++
            //   miss     (worse)      → +0 XP, streak reset to 0
            canvasEl._onAnyLand = function(actualMX, summary) {
              setTimeout(function() {
                if (!canvasEl.isConnected) return;
                // Measured results of the flight that just ended, for the
                // "Last flight" strip (measured vs formula, drag cost).
                if (summary) {
                  upd('lastFlight', summary);
                  if (summary.drag && !d.dragTried) upd('dragTried', true);
                  // Append to the experiment log. Functional update: several
                  // landings can queue inside setTimeout chains (symmetry demo
                  // fires two flights), and a captured `d.runLog` would drop one.
                  setLabToolData(function (prev) {
                    // runCount is monotonic; the log itself keeps only the last 8,
                    // so numbering must not be derived from its length or run 9
                    // would come back as run 1 and stop matching the canvas label.
                    var clean = physNormalizeState(prev.physics);
                    var nextNo = clean.runCount + 1;
                    var log = clean.runLog.concat([{
                      n: nextNo,
                      angle: summary.angle, vel: summary.vel, grav: summary.grav,
                      drag: !!summary.drag, mass: summary.mass, launchHeight: summary.launchHeight,
                      range: summary.range, maxH: summary.maxH, time: summary.time,
                      modelVersion: summary.modelVersion || PHYS_MODEL_VERSION
                    }]).slice(-8);
                    return Object.assign({}, prev, { physics: Object.assign({}, prev.physics, { runLog: log, runCount: nextNo }) });
                  });
                }
                // Tier challenge completion (50 m flag / 100 m through air /
                // 200 m on Mars). Nothing checked these before, so a tier
                // could be started but never finished.
                if (d.challengeActive && d.challengeTier && summary.mission && summary.mission.challengeTier === d.challengeTier) {
                  var ch = TIER_CHALLENGES[d.challengeTier - 1];
                  if (ch) {
                    var reqOk = ch.req === 'airResist' ? summary.drag : ch.req === 'mars' ? Math.abs(summary.grav - 3.7) < 0.05 : true;
                    var missBy = Math.abs(actualMX - ch.target);
                    if (reqOk && missBy <= ch.tol) {
                      upd('challenge' + ch.tier + 'Done', true);
                      upd('challengeActive', false);
                      upd('challengeFeedback', { tier: ch.tier, type: 'success', msg: '✅ ' + ch.desc + ' — ' + __alloT('stem.physics.fb_challenge_done', 'done!') + ' +' + ch.reward + ' XP' });
                      bump('targetsHit', 1);
                      if (awardStemXP) awardStemXP('physicsChallenge', ch.reward, 'Physics challenge tier ' + ch.tier);
                      if (stemCelebrate) stemCelebrate();
                      if (addToast) addToast('🏆 ' + ch.desc + ' — ' + __alloT('stem.physics.fb_challenge_done', 'done!') + ' +' + ch.reward + ' XP', 'success');
                    } else {
                      upd('challengeFeedback', { tier: ch.tier, type: 'miss', msg: reqOk
                        ? '❌ ' + __alloT('stem.physics.fb_missed_by', 'Missed by ') + missBy.toFixed(1) + 'm'
                        : '⚠️ ' + __alloT('stem.physics.fb_challenge_req', 'Set the condition the challenge asks for first (air drag on, or Mars gravity).') });
                    }
                  }
                }
                var predicted = summary.prediction;
                if (predicted == null || !isFinite(predicted)) return;
                var err = Math.abs(actualMX - predicted);
                var errPct = predicted > 0 ? (err / predicted) * 100 : (actualMX > 0 ? 100 : 0);
                var tier, xp;
                if (errPct <= 5) { tier = 'bullseye'; xp = 25; }
                else if (errPct <= 15) { tier = 'close'; xp = 10; }
                else { tier = 'miss'; xp = 0; }
                upd('predictionResult', { predicted: predicted, actual: actualMX, errPct: errPct, tier: tier, xp: xp, revision: '', reason: '', reflectionComplete: false });
                if (xp > 0) {
                  upd('predictionStreak', (d.predictionStreak || 0) + 1);
                  if (awardStemXP) awardStemXP('estimate', xp, tier === 'bullseye' ? 'Range Estimate Bullseye' : 'Range Estimate Close');
                } else {
                  upd('predictionStreak', 0);
                }
                // One-shot: clear the snapshot so a repeat launch without a
                // fresh prediction won't double-score.
                upd('lastPredictionRange', null);
              }, 0);
            };

            // Canvas-drawn strings, rebound every render so the draw loop
            // (captured once at init) always paints the current language.
            canvasEl._L = {
              predicted: __alloT('stem.physics.cv_predicted_r', 'predicted R = '),
              predictedDrag: __alloT('stem.physics.cv_predicted_r_drag', 'predicted R (with drag) = '),
              noDragIdeal: __alloT('stem.physics.cv_no_drag_ideal', 'no-drag ideal'),
              apex: __alloT('stem.physics.cv_apex', 'apex'),
              apexCap: '▲ ' + __alloT('stem.physics.cv_apex_cap', 'APEX'),
              energy: __alloT('stem.physics.cv_energy', 'Energy'),
              initialEnergy: __alloT('stem.physics.cv_initial_energy', 'Initial energy'),
              nextLaunch: __alloT('stem.physics.cv_next_launch', 'Next launch'),
              currentFlight: __alloT('stem.physics.cv_current_flight', 'Current flight'),
              latestFlight: __alloT('stem.physics.cv_latest_flight', 'Latest flight'),
              selectedEnergy: __alloT('stem.physics.cv_selected_energy', 'Selected point'),
              atImpact: __alloT('stem.physics.cv_at_impact', 'At impact'),
              lastRecorded: __alloT('stem.physics.cv_last_recorded', 'Last recorded state'),
              energyConserved: __alloT('stem.physics.cv_energy_conserved', 'Energy (KE + PE conserved)'),
              ke: __alloT('stem.physics.cv_ke', 'KE'),
              pe: __alloT('stem.physics.cv_pe', 'PE'),
              dragLoss: __alloT('stem.physics.cv_drag_loss', 'Drag'),
              slow: __alloT('stem.physics.cv_slow', 'SLOW'),
              fast: __alloT('stem.physics.cv_fast', 'FAST'),
              dragOn: __alloT('stem.physics.cv_drag_on', 'Drag ON'),
              shots: __alloT('stem.physics.cv_shots', 'Shots: '),
              ready: __alloT('stem.physics.cv_ready', 'Ready to launch'),
              paused: __alloT('stem.physics.cv_paused', 'Paused'),
              flying: __alloT('stem.physics.cv_flying', 'In flight'),
              landed: __alloT('stem.physics.cv_landed', 'Landed'),
              vacuum: __alloT('stem.physics.cv_vacuum', 'No air drag'),
              distance: __alloT('stem.physics.cv_distance', 'Distance (m)'),
              height: __alloT('stem.physics.cv_height', 'Height (m)'),
              preview: __alloT('stem.physics.cv_preview', 'Vacuum preview'),
              selectedPoint: __alloT('stem.physics.cv_selected_point', 'Recorded point'),
              prediction: __alloT('stem.physics.cv_prediction_short', 'Prediction'),
              runPrefix: __alloT('stem.physics.cv_run_prefix', 'Run '),
              narrLaunchFirst: __alloT('stem.physics.narr_launch_first', 'Projectile launched at {angle} degrees with a velocity of {vel} meters per second. Gravity is {grav} meters per second squared.'),
              narrLaunchDrag: __alloT('stem.physics.narr_launch_drag', ' Air resistance is on.'),
              narrLaunchHeight: __alloT('stem.physics.narr_launch_height', ' Launch height is {height} meters above ground.'),
              narrLaunchRepeat: __alloT('stem.physics.narr_launch_repeat', 'Launched. Angle: {angle} degrees, velocity: {vel} meters per second.'),
              narrLaunchTerse: __alloT('stem.physics.narr_launch_terse', 'Launched: {angle}°, {vel} m/s'),
              narrLandFirst: __alloT('stem.physics.narr_land_first', 'Projectile landed at {range} meters after {time} seconds. Maximum height was {maxH} meters. Try changing the angle or velocity to see how the trajectory changes.'),
              narrLandRepeat: __alloT('stem.physics.narr_land_repeat', 'Landed at {range} meters. Max height: {maxH} meters.'),
              narrLandTerse: __alloT('stem.physics.narr_land_terse', '{range} meters, height {maxH} meters')
            };
            canvasEl._fill = function (tpl, vals) { return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return vals[k] != null ? vals[k] : m; }); };

            if (canvasEl._physInit) {
              if (canvasEl._physScheduleFrame) canvasEl._physScheduleFrame();
              return;

            }

            canvasEl._physInit = true;
            if (typeof canvasA11yDesc === 'function') canvasA11yDesc(canvasEl, __alloT('stem.physics.a11y_plot_desc', 'Projectile motion on a meter grid. The launcher marks the release point. A white dashed curve is the vacuum prediction; the latest measured path is colored by speed from cyan through amber to rose. Flight readings are above the plot and energy is below it. Pause and inspect for a text description of the motion.'));
            // Canvas Narration: tool init
            if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'init', {
              first: __alloT('stem.physics.narr_plot_init_first', 'Physics Simulator loaded. Adjust launch conditions, then press Launch. The grid shows distance and height in meters. Pause and inspect to read the projectile motion and energy.'),
              repeat: __alloT('stem.physics.narr_init_repeat', 'Physics Simulator ready. Adjust angle and velocity, then launch.'),
              terse: __alloT('stem.physics.narr_init_terse', 'Physics Simulator ready.')
            });

            canvasEl._physAnimActive = true;

            canvasRef._lastCanvas = canvasEl;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');
            if (!ctx) { canvasEl._physInit = false; canvasEl._physAnimActive = false; return; }

            var dpr = 2;

            // Store animation state ON the canvas element so it persists across React re-renders

            var tick = canvasEl._tick || 0;

            var trails = canvasEl._trails || [];

            var ball = canvasEl._ball || null;

            var launched = canvasEl._launched || false;

            var impactParticles = canvasEl._impactParticles || [];

            var landingMarkers = canvasEl._landingMarkers || [];
            var physAlive = true;
            var physMotionReduced = false;
            try { physMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isPhysicsHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelPhysicsFrame() {
              if (canvasEl._physAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._physAnim);
              canvasEl._physAnim = null;
              canvasEl._physAnimActive = false;
            }

            function schedulePhysicsFrame() {
              if (!physAlive || canvasEl._physAnim || isPhysicsHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvasEl._physAnimActive = true;
              canvasEl._physAnim = requestAnimationFrame(draw);
            }

            function cleanupPhysicsCanvas() {
              physAlive = false;
              canvasEl._inspection = null;
              cancelPhysicsFrame();
              if (canvasEl._cancelSymmetryDemo) canvasEl._cancelSymmetryDemo();
              if (canvasEl._liveTimer) { clearTimeout(canvasEl._liveTimer); canvasEl._liveTimer = null; }
              if (canvasEl._resizeObserver) canvasEl._resizeObserver.disconnect();
              if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', updateReducedMotion);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onPhysicsVisibilityChange);
              canvasEl._physCleanup = null;
              canvasEl._physScheduleFrame = null;
              canvasEl._physInit = false;
            }

            function onPhysicsVisibilityChange() {
              if (!physAlive) return;
              if (!canvasEl.isConnected) { cleanupPhysicsCanvas(); return; }
              canvasEl._prevTs = null;
              if (isPhysicsHidden()) cancelPhysicsFrame();
              else { cancelPhysicsFrame(); schedulePhysicsFrame(); }
            }

            canvasEl._physCleanup = cleanupPhysicsCanvas;
            canvasEl._physScheduleFrame = schedulePhysicsFrame;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onPhysicsVisibilityChange);

            // Target flags

            var targets = [

              { dist: 50, color: '#22c55e', label: '50m', hit: false },

              { dist: 100, color: '#eab308', label: '100m', hit: false },

              { dist: 200, color: '#ef4444', label: '200m', hit: false },

              { dist: 300, color: '#8b5cf6', label: '300m', hit: false }

            ];

            var baseScale = (cW / dpr - 80) / 350; // px per meter (default fits 350m)

            var scale = canvasEl._dynScale || baseScale;

            // ── Coordinate helpers: convert meters to screen-space CSS pixels ──

            var launcherX = 40; // CSS-px offset from left for cannon

            var groundYCSS = cH / dpr - 122; // CSS-px y of ground line

            function resizePhysicsCanvas() {
              var nextDpr = Math.min(2, window.devicePixelRatio || 1);
              var nextW = Math.max(1, Math.round(canvasEl.offsetWidth * nextDpr));
              var nextH = Math.max(1, Math.round(canvasEl.offsetHeight * nextDpr));
              if (nextW === cW && nextH === cH && dpr === nextDpr) return;
              dpr = nextDpr; cW = canvasEl.width = nextW; cH = canvasEl.height = nextH;
              baseScale = Math.max(0.01, (cW / dpr - 80) / 350);
              groundYCSS = cH / dpr - 122;
              scale = Math.min(scale, baseScale);
              schedulePhysicsFrame();
            }
            if (typeof ResizeObserver !== 'undefined') {
              canvasEl._resizeObserver = new ResizeObserver(resizePhysicsCanvas);
              canvasEl._resizeObserver.observe(canvasEl);
            }
            resizePhysicsCanvas();
            var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
            function updateReducedMotion() {
              physMotionReduced = !!(motionQuery && motionQuery.matches) || !!canvasEl.closest('.reduce-motion');
              schedulePhysicsFrame();
            }
            if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', updateReducedMotion);
            updateReducedMotion();

            function mToScreenX(mX) { return launcherX + mX * scale; }

            function mToScreenY(mY) { return groundYCSS - mY * scale; } // mY: height in meters (0 = ground)

            function fitPhysicsView(settings, inspection) {
              var ideal = window.StemLab._physics.vacuum(settings.angle, settings.velocity, settings.gravity, settings.launchHeight);
              var rangeBound = Math.max(1, ideal.range || 0);
              var heightBound = Math.max(1, ideal.maxH || settings.launchHeight || 0);
              if (canvasEl.dataset.showOverlay === 'true') trails.forEach(function(trail) {
                trail.forEach(function(point) { rangeBound = Math.max(rangeBound, point.mX); heightBound = Math.max(heightBound, point.mY); });
              });
              if (inspection && canvasEl._inspection && Array.isArray(canvasEl._inspection.trail)) {
                canvasEl._inspection.trail.forEach(function(point) { rangeBound = Math.max(rangeBound, point.mX); heightBound = Math.max(heightBound, point.mY); });
              }
              if (!inspection && canvasEl._settings.targetMode) {
                try { JSON.parse(canvasEl.dataset.targetList || '[]').forEach(function(t) { rangeBound = Math.max(rangeBound, t.x + (t.radius || 0)); }); } catch (e) {}
              }
              if (!inspection && canvasEl._settings.challengeTier) rangeBound = Math.max(rangeBound, [50, 100, 200][canvasEl._settings.challengeTier - 1] || 0);
              var availableW = Math.max(40, cW / dpr - 88);
              var availableH = Math.max(40, groundYCSS - 138);
              // Elevated short flights need enough space to see the platform.
              // Every position, ruler and trajectory uses this same scale.
              scale = Math.max(0.001, Math.min(12,
                availableW / (rangeBound * 1.2), availableH / (heightBound * 1.2)));
              canvasEl._dynScale = scale;
              canvasEl._viewKey = [settings.angle, settings.velocity, settings.gravity, settings.launchHeight, cW, cH, canvasEl.dataset.showOverlay, canvasEl.dataset.targetList, canvasEl._settings.challengeTier, trails.length, inspection ? inspection.index + ':' + inspection.count + ':' + inspection.t : 'live'].join('|');
            }

            function launch(settings) {
              physClearInspection();
              var launchSettings = Object.assign({}, canvasEl._settings, settings || {});
              if (launchSettings.targetMode || launchSettings.challengeTier || launchSettings.battleMode) launchSettings.launchHeight = 0;
              var constraint = launchSettings.targetMode && launchSettings.targetConstraint;
              if (constraint && constraint.type === 'fixedAngle') launchSettings.angle = constraint.value;
              if (constraint && constraint.type === 'fixedVelocity') launchSettings.velocity = constraint.value;

              var angle = launchSettings.angle;

              var vel = launchSettings.velocity;

              var grav = launchSettings.gravity;

              var drag = launchSettings.airResist ? PHYS_DRAG_K : 0;

              var mass = launchSettings.mass;
              var launchHeight = launchSettings.launchHeight || 0;
              canvasEl._accumulator = 0;
              canvasEl._prevTs = null;
              canvasEl._stepNext = false;

              var rad = angle * Math.PI / 180;

              fitPhysicsView(launchSettings);

              // Ball state in METERS: mX = horizontal distance from launcher, mY = height above ground

              ball = {

                mX: 0, mY: launchHeight,

                mVx: vel * Math.cos(rad), mVy: vel * Math.sin(rad),

                grav: grav, drag: drag, speed: vel,

                // Launch-time mass and energy: the energy bar measures drag
                // loss against THIS, not against wherever the sliders sit now.
                mass: mass, launchHeight: launchHeight, t: 0, E0: 0.5 * mass * vel * vel + mass * grav * launchHeight, maxH: launchHeight, landed: false

              };

              // Trail tagging for comparison overlay: stash launch params
              // as named properties on the array itself so the draw loop can
              // color/label each trail by what produced it. Plain JS arrays
              // accept arbitrary properties, so trail[i] indexing still works.
              var _newTrail = [{ mX: 0, mY: launchHeight, mVx: ball.mVx, mVy: ball.mVy, t: 0 }];
              _newTrail.angle = angle;
              _newTrail.velocity = vel;
              _newTrail.gravity = grav;
              _newTrail.drag = drag > 0;
              _newTrail.mass = mass;
              _newTrail.launchHeight = launchHeight;
              _newTrail.modelVersion = PHYS_MODEL_VERSION;
              _newTrail.prediction = launchSettings.prediction;
              _newTrail.mission = Object.freeze({ targetMode: !!launchSettings.targetMode, targetRound: launchSettings.targetRound, challengeTier: launchSettings.challengeTier });
              _newTrail.parameters = Object.freeze({ angle: angle, velocity: vel, gravity: grav, drag: drag > 0, mass: mass, launchHeight: launchHeight });
              trails.push(_newTrail);
              // Cap to 5 most recent so the comparison view stays readable.
              while (trails.length > 5) trails.shift();

              launched = true;

              impactParticles = [];

              canvasEl._apex = null; // reset apex snapshot for new flight

              targets.forEach(function (t) { t.hit = false; });

              // Publish launch state before React updates the measurement panels.
              canvasEl._ball = ball;
              canvasEl._launched = true;
              canvasEl._trails = trails;
              canvasEl._impactParticles = impactParticles;
              schedulePhysicsFrame();

              // Canvas Narration: launch event
              var _Ll = canvasEl._L || {}, _fill = canvasEl._fill || function (s) { return s; };
              var _lv = { angle: angle, vel: vel, grav: grav, height: launchHeight };
              if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'launch', {
                first: _fill(_Ll.narrLaunchFirst, _lv) + (drag > 0 ? _Ll.narrLaunchDrag : '') + _fill(_Ll.narrLaunchHeight, _lv),
                repeat: _fill(_Ll.narrLaunchRepeat, _lv) + _fill(_Ll.narrLaunchHeight, _lv),
                terse: _fill(_Ll.narrLaunchTerse, _lv) + _fill(_Ll.narrLaunchHeight, _lv)
              }, { debounce: 500 });

            }

            canvasEl._launch = launch;
            canvasEl._cancelSymmetryDemo = function () {
              canvasEl._demo = null;
              if (canvasEl._demoTimer) clearTimeout(canvasEl._demoTimer);
              canvasEl._demoTimer = null;
            };
            canvasEl._cancelFlight = function () {
              physClearInspection();
              canvasEl._cancelSymmetryDemo();
              launched = false; canvasEl._launched = false;
              canvasEl._accumulator = 0;
              schedulePhysicsFrame();
            };
            canvasEl._startSymmetryDemo = function () {
              if (!physAlive || canvasEl._settings.targetMode) return;
              canvasEl._cancelSymmetryDemo();
              var settings = Object.assign({}, canvasEl._settings, { angle: 30, launchHeight: 0, airResist: false, prediction: null, targetMode: false, challengeTier: null });
              canvasEl._demo = { kind: 'symmetry', controlKey: canvasEl._settingsKey, settings: settings, ranges: [] };
              canvasEl._demoLaunch(settings);
            };
            canvasEl._startModelComparison = function () {
              if (!physAlive || canvasEl._settings.targetMode || canvasEl._settings.challengeTier || canvasEl._settings.battleMode) return;
              canvasEl._cancelSymmetryDemo();
              var settings = Object.freeze(Object.assign({}, canvasEl._settings, { airResist: false, prediction: null, targetMode: false, challengeTier: null }));
              canvasEl._demo = { kind: 'models', controlKey: canvasEl._settingsKey, settings: settings, ranges: [], results: [] };
              canvasEl._demoLaunch(settings);
            };
            // _onTargetLand is rebound on every canvasRef call above so it
            // sees the latest checkTargetHit closure with current state.

            // Simulation timestep (seconds per frame tick)

            var dt = PHYS_DT;
            var DT_BASE = PHYS_DT;

            function draw(nowTs) {
              if (!physAlive) return;
              canvasEl._physAnim = null;
              if (!canvasEl.isConnected) {
                cleanupPhysicsCanvas();
                return;
              }
              if (isPhysicsHidden()) { cancelPhysicsFrame(); return; }
              // Apply user-selected simulation speed (1.0 real-time, 0.5 / 0.25
              // slow-motion, 0 paused). Scales the physics dt every frame so
              // a paused projectile renders normally but advances no physics —
              // students can freeze mid-flight and inspect velocity vectors,
              // energy bars, and trail position without losing context. When
              // paused, a one-shot _stepNext flag advances exactly one tick
              // at base dt (the Step button sets this).
              // Real elapsed time, not a fixed slice per frame. Advancing a
              // constant DT_BASE every frame made the flight run at the DISPLAY's
              // refresh rate: measured 2.02x real time at 58fps, and it would be
              // ~4x on a 120Hz laptop. Two students on different machines saw
              // different speeds, "1x" was not real time, and the flight time the
              // tool reports did not match a stopwatch. Clamped to 50ms so a
              // backgrounded tab or a long GC pause cannot teleport the ball.
              var _now = (typeof nowTs === 'number' && isFinite(nowTs))
                ? nowTs
                : ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
              var _prevTs = canvasEl._prevTs;
              canvasEl._prevTs = _now;
              var _elapsed = (typeof _prevTs === 'number' && _now > _prevTs)
                ? Math.min(0.05, (_now - _prevTs) / 1000)
                : 0;
              var _ss = parseFloat(canvasEl.dataset.simSpeed);
              if (!isFinite(_ss) || _ss < 0) _ss = 1.0;
              if (_ss === 0 && canvasEl._stepNext) {
                // One deterministic tick, so stepping is reproducible.
                canvasEl._accumulator = (canvasEl._accumulator || 0) + DT_BASE;
                dt = 0;
                canvasEl._stepNext = false;
              } else {
                dt = _elapsed * _ss;
              }
              if (launched) canvasEl._accumulator = (canvasEl._accumulator || 0) + dt;
              physMotionReduced = !!(motionQuery && motionQuery.matches) || !!canvasEl.closest('.reduce-motion');
              tick += physMotionReduced ? 0 : 1;
              var inspection = physSelectedInspection(canvasEl);
              var flightTrail = launched && trails.length ? trails[trails.length - 1] : null;
              var displayParams = inspection ? inspection.parameters : flightTrail ? { angle: flightTrail.angle, velocity: flightTrail.velocity, gravity: flightTrail.gravity, mass: flightTrail.mass, launchHeight: flightTrail.launchHeight, airResist: flightTrail.drag } : canvasEl._settings;
              var viewKey = [displayParams.angle, displayParams.velocity, displayParams.gravity, displayParams.launchHeight, cW, cH, canvasEl.dataset.showOverlay, canvasEl.dataset.targetList, canvasEl._settings.challengeTier, trails.length, inspection ? inspection.index + ':' + inspection.count + ':' + inspection.t : 'live'].join('|');
              if (canvasEl._viewKey !== viewKey) fitPhysicsView(displayParams, inspection);

              ctx.clearRect(0, 0, cW, cH);

              // A meter-aligned plot with reserved telemetry and energy bands.
              var cssW = cW / dpr, cssH = cH / dpr, plotTop = 128;
              var highContrast = canvasEl.dataset.sceneTheme === 'contrast';
              var scene = { ink: '#f8fafc', muted: '#cbd5e1', grid: highContrast ? '#94a3b8' : '#25394f', axis: highContrast ? '#ffffff' : '#6e8ba6', panel: highContrast ? '#000000' : '#101f32', accent: highContrast ? '#ffff00' : '#67e8f9' };
              var groundY = groundYCSS * dpr;
              var sky = ctx.createLinearGradient(0, 0, 0, cH);
              sky.addColorStop(0, highContrast ? '#000000' : '#0a1423'); sky.addColorStop(1, highContrast ? '#000000' : '#152c43');
              ctx.fillStyle = sky; ctx.fillRect(0, 0, cW, cH);
              var tagQueue = [], tagBoxes = [], markerBoxes = [];
              canvasEl._visualVectors = null;
              canvasEl._visualPreview = null;
              canvasEl._visualInspection = null;
              function tag(id, lines, anchorX, anchorY, color, preferredX, preferredY, radius) {
                if (!pointInPlot(anchorX, anchorY)) return;
                tagQueue.push({ id: id, lines: lines, anchor: { x: anchorX, y: anchorY }, x: preferredX == null ? anchorX : preferredX, y: preferredY == null ? anchorY : preferredY, radius: radius || 0, color: color || scene.ink });
                reserveMarker(anchorX, anchorY, radius || 0);
              }
              function pointInPlot(x, y) { return x >= launcherX && x <= cssW - 20 && y >= plotTop && y <= groundYCSS; }
              function reserveMarker(x, y, radius) {
                if (!pointInPlot(x, y)) return;
                var margin = radius + 4;
                markerBoxes.push({ x: x - margin, y: y - margin, width: margin * 2, height: margin * 2 });
              }
              function niceStep(value) { var power = Math.pow(10, Math.floor(Math.log10(Math.max(.01, value)))); var unit = value / power; return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power; }
              function drawMotionVectors(point, x, y) {
                if (point.impact || canvasEl.dataset.showVectors !== 'true') return;
                var vectorScale = Math.max(0, Math.min(1.4, 62 / Math.max(1, point.speed),
                  point.vx > 0 ? (cssW - 24 - x) / point.vx : Infinity,
                  point.vy > 0 ? (y - plotTop - 12) / point.vy : point.vy < 0 ? (groundYCSS - 8 - y) / -point.vy : Infinity));
                var endX = x + point.vx * vectorScale, endY = y - point.vy * vectorScale;
                var arrowLen = point.speed * vectorScale, arrowHead = Math.min(6, arrowLen / 3);
                var direction = Math.atan2(-point.vy, point.vx);
                ctx.save(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2 * dpr;
                ctx.beginPath(); ctx.moveTo(x * dpr, y * dpr); ctx.lineTo(endX * dpr, endY * dpr);
                ctx.moveTo(endX * dpr, endY * dpr); ctx.lineTo((endX - Math.cos(direction - .4) * arrowHead) * dpr, (endY - Math.sin(direction - .4) * arrowHead) * dpr);
                ctx.moveTo(endX * dpr, endY * dpr); ctx.lineTo((endX - Math.cos(direction + .4) * arrowHead) * dpr, (endY - Math.sin(direction + .4) * arrowHead) * dpr); ctx.stroke();
                ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([4 * dpr, 3 * dpr]);
                ctx.strokeStyle = '#6ee7b7'; ctx.beginPath(); ctx.moveTo(x * dpr, y * dpr); ctx.lineTo(endX * dpr, y * dpr); ctx.stroke();
                ctx.strokeStyle = '#c4b5fd'; ctx.beginPath(); ctx.moveTo(x * dpr, y * dpr); ctx.lineTo(x * dpr, endY * dpr); ctx.stroke();
                var gravityLength = Math.max(0, Math.min(point.gravity * 1.5, 25, groundYCSS - y - 8));
                var gravityHead = Math.min(4, gravityLength / 3);
                ctx.strokeStyle = '#ef4444'; ctx.setLineDash([2 * dpr, 3 * dpr]);
                ctx.beginPath(); ctx.moveTo(x * dpr, y * dpr); ctx.lineTo(x * dpr, (y + gravityLength) * dpr); ctx.stroke();
                ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x * dpr, (y + gravityLength) * dpr);
                ctx.lineTo((x - gravityHead * .75) * dpr, (y + gravityLength - gravityHead) * dpr);
                ctx.moveTo(x * dpr, (y + gravityLength) * dpr); ctx.lineTo((x + gravityHead * .75) * dpr, (y + gravityLength - gravityHead) * dpr); ctx.stroke();
                ctx.restore();
                canvasEl._visualVectors = { x: x, y: y, vxX: endX, vyY: endY, endX: endX, endY: endY, scale: vectorScale };
              }
              var xStep = niceStep(64 / scale), yStep = niceStep(54 / scale);
              ctx.font = (12 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
              for (var xm = 0; mToScreenX(xm) < cssW - 22; xm += xStep) {
                var xx = mToScreenX(xm) * dpr;
                ctx.strokeStyle = scene.grid; ctx.lineWidth = dpr;
                ctx.beginPath(); ctx.moveTo(xx, plotTop * dpr); ctx.lineTo(xx, groundY); ctx.stroke();
                ctx.fillStyle = scene.muted; ctx.fillText(String(Math.round(xm * 10) / 10), xx, groundY + 20 * dpr);
              }
              ctx.textAlign = 'right';
              for (var ym = yStep; mToScreenY(ym) > plotTop + 16; ym += yStep) {
                var yy = mToScreenY(ym) * dpr;
                ctx.strokeStyle = scene.grid; ctx.beginPath(); ctx.moveTo(launcherX * dpr, yy); ctx.lineTo(cW - 20 * dpr, yy); ctx.stroke();
                ctx.fillStyle = scene.muted; ctx.fillText(String(Math.round(ym * 10) / 10), (launcherX - 9) * dpr, yy + 4 * dpr);
              }
              ctx.strokeStyle = scene.axis; ctx.lineWidth = 1.5 * dpr;
              ctx.beginPath(); ctx.moveTo(launcherX * dpr, plotTop * dpr); ctx.lineTo(launcherX * dpr, groundY); ctx.lineTo(cW - 20 * dpr, groundY); ctx.stroke();
              ctx.fillStyle = scene.muted; ctx.textAlign = 'left'; ctx.fillText((canvasEl._L || {}).height || 'Height (m)', 12 * dpr, (plotTop - 12) * dpr);
              ctx.textAlign = 'right'; ctx.fillText((canvasEl._L || {}).distance || 'Distance (m)', cW - 20 * dpr, groundY + 40 * dpr);
              targets.forEach(function(tgt) {
                var tx = mToScreenX(tgt.dist) * dpr;
                if (tx > cW - 26 * dpr || canvasEl._settings.targetMode) return;
                ctx.strokeStyle = tgt.hit ? '#fde68a' : '#94a3b8'; ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath(); ctx.moveTo(tx, groundY); ctx.lineTo(tx, groundY - 20 * dpr); ctx.stroke();
                ctx.fillStyle = tgt.hit ? '#fde68a' : '#94a3b8'; ctx.beginPath(); ctx.moveTo(tx, groundY - 20 * dpr); ctx.lineTo(tx + 8 * dpr, groundY - 16 * dpr); ctx.lineTo(tx, groundY - 12 * dpr); ctx.fill();
              });

              // ── Predicted-landing marker on the ground ──
              // When the formulas panel is open, draw a faint dashed pin
              // at the closed-form predicted range so the student can SEE
              // (before launching) where the math says it will land.
              // The marker uses CURRENT slider values, so it slides live
              // as the student adjusts angle/velocity/gravity.
              if (canvasEl.dataset.showFormulas === 'true') {
                var _pAng = displayParams.angle;
                var _pVel = displayParams.velocity;
                var _pGrav = displayParams.gravity;
                var _pRad = _pAng * Math.PI / 180;
                var _pDrag = displayParams.airResist;
                // Through air there is no closed form: run the shared
                // integrator so the pin lands where the ball actually will.
                var _predictionKey = [_pAng, _pVel, _pGrav, _pDrag, displayParams.mass, displayParams.launchHeight].join('|');
                if (!canvasEl._predictionCache || canvasEl._predictionCache.key !== _predictionKey) {
                  canvasEl._predictionCache = { key: _predictionKey, range: physSimulate(_pAng, _pVel, _pGrav, _pDrag, displayParams.mass, displayParams.launchHeight).range };
                }
                var _predR = canvasEl._predictionCache.range;
                if (_predR > 0 && isFinite(_predR)) {
                  var _predX = mToScreenX(_predR) * dpr;
                  if (_predX > 30 * dpr && _predX < cW - 10 * dpr) {
                    ctx.save();
                    ctx.globalAlpha = 0.65;
                    ctx.setLineDash([3 * dpr, 3 * dpr]);
                    ctx.strokeStyle = '#d946ef'; // fuchsia, matches formulas panel
                    ctx.lineWidth = 1.5 * dpr;
                    ctx.beginPath();
                    ctx.moveTo(_predX, groundY);
                    ctx.lineTo(_predX, groundY - 30 * dpr);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    // Pin head
                    ctx.fillStyle = '#d946ef';
                    ctx.beginPath();
                    ctx.arc(_predX, groundY - 30 * dpr, 3 * dpr, 0, Math.PI * 2);
                    ctx.fill();
                    tag('prediction', [((canvasEl._L || {}).prediction || 'Prediction') + ' ' + _predR.toFixed(1) + ' m'], _predX / dpr, groundYCSS - 30, '#f0abfc', _predX / dpr, groundYCSS - 44, 3);

                    ctx.restore();
                  }
                }
              }

              // ── No-drag ghost trajectory ──
              // When air drag is on AND a projectile is in flight, draw a
              // faint dashed ideal (no-drag) trajectory using the same
              // launch params for comparison. Makes drag's effect immediately
              // visible: students see exactly how much shorter and lower the
              // actual flight is. Drawn here so the active trail draws over it.
              if (!launched || (ball && ball.drag > 0)) {
                var _gAng = displayParams.angle;
                var _gVel = displayParams.velocity;
                var _gGrav = displayParams.gravity;
                var _gRad = _gAng * Math.PI / 180;
                var _gVx = _gVel * Math.cos(_gRad);
                var _gVy0 = _gVel * Math.sin(_gRad);
                var _gHeight = displayParams.launchHeight || 0;
                // The ideal ghost shares the actual flight's launch height.
                var _gRange = window.StemLab._physics.vacuum(_gAng, _gVel, _gGrav, _gHeight).range;
                if (_gRange > 0 && isFinite(_gRange)) {
                  ctx.save();
                  ctx.globalAlpha = 0.8;
                  ctx.setLineDash([4 * dpr, 4 * dpr]);
                  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                  ctx.lineWidth = 1.2 * dpr;
                  ctx.beginPath();
                  var _gSteps = 40;
                  for (var _gi = 0; _gi <= _gSteps; _gi++) {
                    var _gx = (_gRange / _gSteps) * _gi;
                    var _gt = _gVx > 0 ? _gx / _gVx : 0;
                    var _gy = _gHeight + _gVy0 * _gt - 0.5 * _gGrav * _gt * _gt;
                    if (_gy < 0) _gy = 0;
                    var _gsX = mToScreenX(_gx) * dpr;
                    var _gsY = mToScreenY(_gy) * dpr;
                    if (_gi === 0) ctx.moveTo(_gsX, _gsY);
                    else ctx.lineTo(_gsX, _gsY);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);
                  canvasEl._visualPreview = { kind: launched || inspection ? 'reference' : 'preview', angle: _gAng, velocity: _gVel, gravity: _gGrav, launchHeight: _gHeight, range: _gRange };
                  var ghostT = _gVy0 / _gGrav;
                  var ghostX = mToScreenX(_gVx * ghostT), ghostY = mToScreenY(_gHeight + _gVy0 * ghostT - .5 * _gGrav * ghostT * ghostT);
                  tag('ideal', [(canvasEl._L || {})[launched || inspection ? 'noDragIdeal' : 'preview'] || 'Vacuum preview'], ghostX, ghostY, '#cbd5e1', ghostX, ghostY - 24);

                  ctx.restore();
                }
              }

              // ── Trails with glow & speed-based color (stored in meters, convert at draw time) ──

              var overlayMode = canvasEl.dataset.showOverlay === 'true';

              // Old measurements can exceed the next launch's fitted viewport.
              // Keep their strokes inside the meter plot without changing data.
              ctx.save();
              ctx.beginPath();
              ctx.rect(launcherX * dpr, plotTop * dpr, Math.max(0, cssW - launcherX - 20) * dpr, Math.max(0, groundYCSS - plotTop) * dpr);
              ctx.clip();
              trails.forEach(function (trail, idx) {

                if (trail.length < 2) return;

                var isActive = idx === trails.length - 1;

                // Overlay mode boosts past-trail alpha so the comparison is
                // legible, not a faint ghost. Off-mode keeps the original
                // faded look (single-trajectory focus).
                var alpha = isActive ? 1 : (overlayMode ? 0.85 : 0.18);

                // Glow layer for active trail

                if (isActive) {

                  ctx.save();

                  ctx.lineWidth = 6 * dpr;

                  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                  ctx.globalAlpha = 0.25;

                  ctx.strokeStyle = '#fbbf24';

                  ctx.beginPath(); ctx.moveTo(mToScreenX(trail[0].mX) * dpr, mToScreenY(trail[0].mY) * dpr);

                  for (var tg = 1; tg < trail.length; tg++) {

                    ctx.lineTo(mToScreenX(trail[tg].mX) * dpr, mToScreenY(trail[tg].mY) * dpr);

                  }

                  ctx.stroke(); ctx.restore();

                }

                // Main speed-colored segments

                ctx.lineWidth = (isActive ? 2.5 : 1.5) * dpr;

                ctx.lineCap = 'round';

                ctx.setLineDash(isActive ? [] : [4, 3]);

                // In overlay mode, color non-active trails by their launch
                // angle (HSL hue 0..240 over 0..90°) so comparing 30° vs 45°
                // vs 60° is visually obvious. Active trail still uses the
                // speed-coded color so live physics intuition stays intact.
                var trailHue = null;
                if (overlayMode && !isActive && trail.angle != null) {
                  trailHue = Math.round(240 * (1 - Math.max(0, Math.min(90, trail.angle)) / 90));
                }

                for (var ti = 1; ti < trail.length; ti++) {

                  var p0 = trail[ti - 1], p1 = trail[ti];

                  if (trailHue != null) {
                    ctx.strokeStyle = 'hsla(' + trailHue + ', 85%, 75%, ' + alpha + ')';
                  } else {
                    var speed = Math.sqrt(Math.pow(p1.mVx || 0, 2) + Math.pow(p1.mVy || 0, 2));

                    var speedNorm = Math.min(1, speed / 60);

                    // Continuous cyan → amber → rose scale, 0–60 m/s.
                    var stops = [[103,232,249], [251,191,36], [251,113,133]];
                    var segment = speedNorm < .5 ? 0 : 1, blend = segment === 0 ? speedNorm * 2 : (speedNorm - .5) * 2;
                    var r = Math.round(stops[segment][0] + (stops[segment+1][0] - stops[segment][0]) * blend);
                    var g = Math.round(stops[segment][1] + (stops[segment+1][1] - stops[segment][1]) * blend);
                    var b = Math.round(stops[segment][2] + (stops[segment+1][2] - stops[segment][2]) * blend);

                    ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
                  }

                  var sx0 = mToScreenX(p0.mX) * dpr, sy0 = mToScreenY(p0.mY) * dpr;

                  var sx1 = mToScreenX(p1.mX) * dpr, sy1 = mToScreenY(p1.mY) * dpr;

                  ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke();

                }

                ctx.setLineDash([]);

                // Draw dotted apex marker for completed trails

                if (!isActive && trail.length > 2) {

                  var apexPt = trail[0];

                  trail.forEach(function (pt) { if (pt.mY > apexPt.mY) { apexPt = pt; } });

                  var apexSX = mToScreenX(apexPt.mX) * dpr;

                  var apexSY = mToScreenY(apexPt.mY) * dpr;

                  ctx.save();

                  // Brighter dotted leader + bolder label when overlay mode
                  // is on so each past trajectory is identifiable. Otherwise
                  // keep the original faint "apex" tag.
                  if (overlayMode && trail.angle != null) {
                    ctx.globalAlpha = 0.85;
                    ctx.strokeStyle = 'hsla(' + trailHue + ', 80%, 75%, 0.8)';
                    ctx.lineWidth = 1 * dpr;
                  } else {
                    ctx.globalAlpha = 0.35;
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                  }

                  ctx.setLineDash([2, 4]);

                  ctx.beginPath(); ctx.moveTo(apexSX, apexSY); ctx.lineTo(apexSX, groundY); ctx.stroke();

                  ctx.setLineDash([]);

                  if (overlayMode && trail.angle != null && pointInPlot(apexSX / dpr, apexSY / dpr)) {
                    // Lead with the run number so the trail and its row in the
                    // experiment log identify each other. Colour matches the
                    // row's swatch, but the number is the link a student reads.
                    var lbl = (trail.run ? (canvasEl._L && canvasEl._L.runPrefix ? canvasEl._L.runPrefix : 'Run ') + trail.run + ' · ' : '')
                      + 'θ=' + trail.angle + '°, v=' + trail.velocity + ' m/s';
                    tag('run-' + idx, [lbl], apexSX / dpr, apexSY / dpr, 'hsl(' + trailHue + ', 85%, 80%)', apexSX / dpr, apexSY / dpr - 28);
                  }


                  ctx.restore();

                }

              });
              ctx.restore();

              // Measured apex annotations stay clear of the launcher and HUD.
              if (canvasEl._apex && canvasEl._apex.tSec > .001) {
                var ap = canvasEl._apex, ax = mToScreenX(ap.mX), ay = mToScreenY(ap.mY);
                if (pointInPlot(ax, ay)) {
                  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2 * dpr;
                  ctx.beginPath(); ctx.arc(ax * dpr, ay * dpr, 5 * dpr, 0, Math.PI * 2); ctx.stroke();
                  reserveMarker(ax, ay, 5);
                  tag('apex', [((canvasEl._L || {}).apexCap || 'APEX') + ' ' + ap.mY.toFixed(1) + ' m', 't = ' + ap.tSec.toFixed(2) + ' s · Vy = 0'], ax, ay, '#fde68a', ax, ay - 32, 5);
                }
              }

              // ── Animate ball (physics in meters) ──

              if (ball && launched) {

                // Playback controls the simulation clock, never the step size.
                // The prediction and every display refresh rate use these same
                // steps and canonical event samples, including short flights.
                while (!ball.landed && (canvasEl._accumulator || 0) + 1e-12 >= PHYS_DT) {
                  canvasEl._accumulator = Math.max(0, canvasEl._accumulator - PHYS_DT);
                  physStep(ball, PHYS_DT);
                  if (trails.length > 0) trails[trails.length - 1].push({ mX: ball.mX, mY: ball.mY, mVx: ball.mVx, mVy: ball.mVy, t: ball.t });
                }

                ball.speed = Math.sqrt(ball.mVx * ball.mVx + ball.mVy * ball.mVy);

                // The engine resolves the exact apex between simulation ticks.
                if (ball.apex && !canvasEl._apex) {
                  canvasEl._apex = {
                    mX: ball.apex.mX,
                    mY: ball.apex.mY,
                    vx: ball.apex.mVx,
                    tSec: ball.apex.t,
                    fadeAt: tick + 90 // ~3 seconds at 30fps before fading out
                  };
                }

                // Targets score the actual impact within their stated tolerance;
                // they never snap the scientific trajectory to a crate center.

                // Convert to screen CSS-px for rendering

                var ballScreenX = mToScreenX(ball.mX);

                var ballScreenY = mToScreenY(ball.mY);

                // ── Adaptive auto-zoom: smoothly adjust scale if ball exceeds viewport ──

                var viewW = cW / dpr;

                var viewH = cH / dpr;

                var needZoom = false;

                if (ballScreenX > viewW - 20) {

                  var neededScale = (viewW - 80) / (ball.mX * 1.15);

                  if (neededScale < scale) { scale = scale * 0.92 + neededScale * 0.08; needZoom = true; }

                }

                if (ballScreenY < 20) {

                  var neededScaleH = (groundYCSS - 40) / (ball.mY * 1.15);

                  if (neededScaleH < scale) { scale = scale * 0.92 + neededScaleH * 0.08; needZoom = true; }

                }

                if (needZoom) {

                  canvasEl._dynScale = scale;

                  // Recompute screen position with updated scale

                  ballScreenX = mToScreenX(ball.mX);

                  ballScreenY = mToScreenY(ball.mY);

                }

                // ── Metallic cannonball ──

                reserveMarker(ballScreenX, ballScreenY, 7);
                ctx.save();
                if (inspection) ctx.globalAlpha = .3;

                var bx = ballScreenX * dpr, by = ballScreenY * dpr, br = 7 * dpr;

                // Outer glow

                ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 18 * dpr;

                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);

                var ballGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br);

                ballGrad.addColorStop(0, '#e2e8f0');

                ballGrad.addColorStop(0.35, '#94a3b8');

                ballGrad.addColorStop(0.7, '#475569');

                ballGrad.addColorStop(1, '#1e293b');

                ctx.fillStyle = ballGrad; ctx.fill();

                ctx.shadowBlur = 0;

                // Specular highlight

                ctx.beginPath(); ctx.arc(bx - br * 0.25, by - br * 0.25, br * 0.35, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();

                // Rim stroke

                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(30,41,59,0.6)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();

                ctx.restore();

                // A selected recorded point owns the vector display until inspection ends.
                if (!inspection) drawMotionVectors({ vx: ball.mVx, vy: ball.mVy, speed: ball.speed, gravity: ball.grav, impact: ball.landed }, ballScreenX, ballScreenY);

                // Check target hits

                targets.forEach(function (tgt) {

                  if (!tgt.hit && Math.abs(ball.mX - tgt.dist) < 8) tgt.hit = true;

                });

                // ── Ground collision → explosion particles ──

                if (ball.landed) {

                  // The engine already resolved position, velocity and time at
                  // impact. Use exactly that state for every view and export.
                  var exactLandX = ball.mX;

                  launched = false;

                  canvasEl.dataset.lastRange = exactLandX.toFixed(1);

                  canvasEl.dataset.lastMaxH = '0';

                  var _landMaxH = ball.maxH || 0;
                  canvasEl.dataset.lastMaxH = _landMaxH.toFixed(1);

                  sfxPhyCollide();

                  // Canvas Narration: landing event
                  var _Ld = canvasEl._L || {}, _fillD = canvasEl._fill || function (s) { return s; };
                  var _lvD = { range: exactLandX.toFixed(1), maxH: _landMaxH.toFixed(1), time: (ball.t || 0).toFixed(2) };
                  if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'landing', {
                    first: _fillD(_Ld.narrLandFirst, _lvD),
                    repeat: _fillD(_Ld.narrLandRepeat, _lvD),
                    terse: _fillD(_Ld.narrLandTerse, { range: exactLandX.toFixed(0), maxH: _landMaxH.toFixed(0) })
                  }, { debounce: 500 });

                  // ── Target Mode: check hit ──
                  if (canvasEl.dataset.targetMode === 'true') {
                    // Dispatch target hit check (deferred to avoid re-render during draw)
                    if (canvasEl._onTargetLand) canvasEl._onTargetLand(exactLandX, trails.length ? trails[trails.length - 1].mission : null);
                  }
                  // Predict-then-launch + last-flight summary: always fire
                  // (the estimate part no-ops if no prediction was set).
                  // Deferred via setTimeout in callback.
                  var _trL = trails.length > 0 ? trails[trails.length - 1] : null;
                  // Stamp the run number on the trail at LANDING, not at launch:
                  // only a flight that lands earns a log row, so a launch the
                  // student interrupts never consumes a number. data-run-next is
                  // this flight's number because the row is appended after this.
                  var _runNo = parseInt(canvasEl.dataset.runNext || '0', 10);
                  if (_trL && isFinite(_runNo) && _runNo > 0) _trL.run = _runNo;
                  if (canvasEl._onAnyLand) canvasEl._onAnyLand(exactLandX, {
                    range: exactLandX, maxH: _landMaxH, time: ball.t || 0,
                    apexT: canvasEl._apex ? canvasEl._apex.tSec : null,
                    angle: _trL ? _trL.angle : null, vel: _trL ? _trL.velocity : null, grav: ball.grav,
                    drag: ball.drag > 0, mass: ball.mass || 1, launchHeight: ball.launchHeight || 0,
                    prediction: _trL ? _trL.prediction : null, mission: _trL ? _trL.mission : null,
                    modelVersion: PHYS_MODEL_VERSION
                  });
                  if (canvasEl._demo) {
                    var demo = canvasEl._demo;
                    demo.ranges.push(exactLandX);
                    if (demo.kind === 'models') demo.results.push(Object.freeze({ range: exactLandX, maxH: _landMaxH, time: ball.t }));
                    canvasEl._demoTimer = setTimeout(function () {
                      canvasEl._demoTimer = null;
                      if (!physAlive || !canvasEl.isConnected || canvasEl._demo !== demo) return;
                      if (demo.ranges.length === 1) canvasEl._demoLaunch(Object.assign({}, demo.settings, demo.kind === 'models' ? { airResist: true } : { angle: 60 }));
                      else {
                        canvasEl._cancelSymmetryDemo();
                        if (demo.kind === 'models') canvasEl._modelComparisonComplete(demo.settings, demo.results);
                        else canvasEl._demoComplete(demo.ranges[0], demo.ranges[1]);
                      }
                    }, 0);
                  }

                  // Spawn enhanced explosion particles (in screen-px space)

                  var impactSX = mToScreenX(ball.mX);

                  var impactSY = groundYCSS;

                  for (var ep = 0; ep < 35; ep++) {

                    var epAngle = Math.random() * Math.PI;

                    var epSpeed = 1 + Math.random() * 5;

                    var pType = Math.random();

                    impactParticles.push({

                      x: impactSX, y: impactSY,

                      vx: Math.cos(epAngle) * epSpeed * (Math.random() > 0.5 ? 1 : -1),

                      vy: -Math.sin(epAngle) * epSpeed,

                      life: 0.7 + Math.random() * 0.6,

                      size: pType < 0.3 ? 0.5 + Math.random() * 1 : 1 + Math.random() * 2.5,

                      type: pType < 0.3 ? 'spark' : pType < 0.65 ? 'debris' : 'smoke'

                    });

                  }

                  // Landing marker with distance (store in meters for label)

                  landingMarkers.push({ mX: ball.mX, alpha: 1, ring: 1, dist: ball.mX.toFixed(1) });

                }

              }

              // ── Impact particles (multi-type) ──

              for (var ipi = impactParticles.length - 1; ipi >= 0; ipi--) {

                var ip = impactParticles[ipi];

                ip.x += ip.vx; ip.y += ip.vy;

                ip.vy += (ip.type === 'smoke' ? 0.02 : 0.15);

                if (ip.type === 'smoke') { ip.vy -= 0.08; ip.vx *= 0.97; }

                ip.life -= (ip.type === 'smoke' ? 0.012 : 0.02);

                if (ip.life <= 0) { impactParticles.splice(ipi, 1); continue; }

                ctx.save();

                if (ip.type === 'spark') {

                  // Bright spark with tail

                  ctx.globalCompositeOperation = 'lighter';

                  ctx.globalAlpha = ip.life;

                  ctx.strokeStyle = 'hsla(' + Math.round(30 + ip.life * 30) + ',100%,70%,' + ip.life + ')';

                  ctx.lineWidth = ip.size * dpr;

                  ctx.lineCap = 'round';

                  ctx.beginPath();

                  ctx.moveTo((ip.x - ip.vx * 1.5) * dpr, (ip.y - ip.vy * 1.5) * dpr);

                  ctx.lineTo(ip.x * dpr, ip.y * dpr);

                  ctx.stroke();

                } else if (ip.type === 'debris') {

                  ctx.globalAlpha = ip.life;

                  ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, ip.size * dpr, 0, Math.PI * 2);

                  var debrisGrad = ctx.createRadialGradient(ip.x * dpr, ip.y * dpr, 0, ip.x * dpr, ip.y * dpr, ip.size * dpr);

                  debrisGrad.addColorStop(0, 'rgba(180,100,30,' + ip.life + ')');

                  debrisGrad.addColorStop(1, 'rgba(80,40,10,' + (ip.life * 0.5) + ')');

                  ctx.fillStyle = debrisGrad; ctx.fill();

                } else {

                  // Smoke puff

                  ctx.globalAlpha = ip.life * 0.4;

                  ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, (ip.size + Math.max(0, 1 - ip.life) * 4) * dpr, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(120,120,120,' + (ip.life * 0.35) + ')'; ctx.fill();

                }

                ctx.restore();

              }

              // Release-point glyph: the muzzle coincides with x=0, y=h₀.
              var angle = displayParams.angle, rad = angle * Math.PI / 180;
              var cxC = launcherX, cyC = mToScreenY(displayParams.launchHeight || 0);
              if (displayParams.launchHeight > 0) {
                ctx.fillStyle = highContrast ? '#202020' : '#253f58';
                ctx.fillRect((cxC - 10) * dpr, cyC * dpr, 20 * dpr, (groundYCSS - cyC) * dpr);
                ctx.strokeStyle = scene.axis; ctx.setLineDash([3 * dpr, 4 * dpr]);
                ctx.beginPath(); ctx.moveTo((cxC - 18) * dpr, groundY); ctx.lineTo((cxC - 18) * dpr, cyC * dpr); ctx.stroke(); ctx.setLineDash([]);
                tag('height', ['h₀ = ' + displayParams.launchHeight + ' m'], cxC, cyC, '#e2e8f0', cxC + 35, cyC + 28, 7);
              }
              canvasEl._launchView = { height: displayParams.launchHeight || 0, scale: scale, x: cxC, y: cyC, groundY: groundYCSS };
              ctx.save(); ctx.translate(cxC * dpr, cyC * dpr); ctx.rotate(-rad);
              ctx.fillStyle = '#64748b'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5 * dpr;
              ctx.beginPath(); ctx.moveTo(-28 * dpr, -7 * dpr); ctx.lineTo(-4 * dpr, -4 * dpr); ctx.lineTo(-4 * dpr, 4 * dpr); ctx.lineTo(-28 * dpr, 7 * dpr); ctx.closePath(); ctx.fill(); ctx.stroke();
              ctx.restore(); ctx.strokeStyle = scene.accent; ctx.lineWidth = 2 * dpr;
              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 7 * dpr, 0, Math.PI * 2); ctx.stroke();
              if (!launched) { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 3 * dpr, 0, Math.PI * 2); ctx.fill(); }
              var latestLanding = landingMarkers[landingMarkers.length - 1];
              if (latestLanding) {
                var lx = mToScreenX(latestLanding.mX);
                if (pointInPlot(lx, groundYCSS)) {
                  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2 * dpr;
                  ctx.beginPath(); ctx.arc(lx * dpr, groundY, 5 * dpr, 0, Math.PI * 2); ctx.stroke();
                  reserveMarker(lx, groundYCSS, 5);
                  if (!launched) tag('landing', [((canvasEl._L || {}).landed || 'Landed') + ' ' + latestLanding.dist + ' m'], lx, groundYCSS, '#fde68a', lx, groundYCSS - 30, 5);
                }
              }
              // Inspection marks a recorded observation without moving the simulated ball.
              if (inspection) {
                var selectedX = mToScreenX(inspection.x), selectedY = mToScreenY(inspection.y);
                if (pointInPlot(selectedX, selectedY)) {
                  reserveMarker(selectedX, selectedY, 10);
                  drawMotionVectors({ vx: inspection.vx, vy: inspection.vy, speed: inspection.speed, gravity: inspection.parameters.gravity, impact: inspection.impact }, selectedX, selectedY);
                  ctx.save(); ctx.beginPath();
                  ctx.rect(launcherX * dpr, plotTop * dpr, Math.max(0, cssW - launcherX - 20) * dpr, Math.max(0, groundYCSS - plotTop) * dpr); ctx.clip();
                  ctx.strokeStyle = scene.accent; ctx.lineWidth = 2 * dpr;
                  ctx.beginPath(); ctx.arc(selectedX * dpr, selectedY * dpr, 10 * dpr, 0, Math.PI * 2); ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo((selectedX - 14) * dpr, selectedY * dpr); ctx.lineTo((selectedX - 6) * dpr, selectedY * dpr);
                  ctx.moveTo((selectedX + 6) * dpr, selectedY * dpr); ctx.lineTo((selectedX + 14) * dpr, selectedY * dpr);
                  ctx.moveTo(selectedX * dpr, (selectedY - 14) * dpr); ctx.lineTo(selectedX * dpr, (selectedY - 6) * dpr);
                  ctx.moveTo(selectedX * dpr, (selectedY + 6) * dpr); ctx.lineTo(selectedX * dpr, (selectedY + 14) * dpr); ctx.stroke();
                  ctx.restore();
                  tag('inspection', [((canvasEl._L || {}).selectedPoint || 'Recorded point'), 't = ' + inspection.t.toFixed(3) + ' s'], selectedX, selectedY, scene.accent, selectedX, selectedY - 32, 10);
                  canvasEl._visualInspection = { x: selectedX, y: selectedY, t: inspection.t, index: inspection.index };
                }
              }
              // A dedicated top band keeps live readings away from trajectory labels.
              var labels = canvasEl._L || {};
              ctx.fillStyle = scene.panel; ctx.fillRect(0, 0, cW, 100 * dpr);
              ctx.textAlign = 'left'; ctx.fillStyle = scene.ink; ctx.font = '600 ' + (14 * dpr) + 'px sans-serif';
              ctx.fillText(displayParams.angle + '°  ·  ' + displayParams.velocity + ' m/s  ·  h₀ ' + (displayParams.launchHeight || 0) + ' m', 14 * dpr, 25 * dpr);
              ctx.font = (12 * dpr) + 'px sans-serif'; ctx.fillStyle = scene.muted;
              ctx.fillText('g ' + displayParams.gravity + ' m/s²  ·  ' + displayParams.mass + ' kg', 14 * dpr, 47 * dpr);
              var scope = inspection ? labels.selectedPoint : launched ? labels.currentFlight : labels.nextLaunch;
              var status = launched && !inspection ? ' · ' + (_ss === 0 ? labels.paused : labels.flying) : '';
              ctx.fillStyle = scene.accent; ctx.fillText(scope + ' · ' + (displayParams.airResist ? labels.dragOn : labels.vacuum) + status, 14 * dpr, 68 * dpr);
              if (inspection || (ball && launched)) {
                ctx.fillStyle = scene.ink;
                var readingDecimals = inspection ? 2 : 1;
                var vectorReadout = canvasEl.dataset.showVectors === 'true';
                var reading = inspection || { t: ball.t, x: ball.mX, y: ball.mY, vx: ball.mVx, vy: ball.mVy };
                var readouts = ['t ' + reading.t.toFixed(inspection ? 3 : 2) + ' s', vectorReadout ? 'Vx ' + reading.vx.toFixed(readingDecimals) + ' m/s' : 'x ' + reading.x.toFixed(readingDecimals) + ' m', vectorReadout ? 'Vy ' + reading.vy.toFixed(readingDecimals) + ' m/s' : 'y ' + reading.y.toFixed(readingDecimals) + ' m'];
                readouts.forEach(function(reading, i) { ctx.fillStyle = vectorReadout && i > 0 ? (i === 1 ? '#6ee7b7' : '#c4b5fd') : scene.ink; ctx.fillText(reading, (14 + i * (cssW - 28) / 3) * dpr, 89 * dpr); });
              } else if (canvasEl.dataset.constraintType) {
                ctx.fillStyle = '#fde68a'; ctx.fillText('🔒 ' + (canvasEl.dataset.constraintType === 'fixedAngle' ? 'θ ' + canvasEl.dataset.constraintValue + '°' : 'v ' + canvasEl.dataset.constraintValue + ' m/s'), 14 * dpr, 89 * dpr);
              }
              // Energy stays in a footer, clear of landing points and axes.
              if ((inspection || ball) && canvasEl.dataset.showEnergy === 'true') {
                var mass = inspection ? inspection.parameters.mass : ball.mass;
                var KE = inspection ? inspection.ke : .5 * mass * ball.speed * ball.speed;
                var PE = inspection ? inspection.pe : mass * ball.grav * Math.max(0, ball.mY);
                var totalE = inspection ? inspection.initialEnergy : ball.drag > 0 ? ball.E0 : Math.max(ball.E0, KE + PE);
                var dragLoss = inspection ? inspection.dragLoss : ball.drag > 0 ? Math.max(0, totalE - KE - PE) : 0;
                var ebX = 14, ebY = cssH - 66, ebW = cssW - 28;
                ctx.fillStyle = scene.panel; ctx.fillRect(0, (cssH - 74) * dpr, cW, 74 * dpr);
                ctx.fillStyle = scene.ink; ctx.font = '600 ' + (12 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText((labels.initialEnergy || 'Initial energy') + ' · ' + totalE.toFixed(0) + ' J', ebX * dpr, (ebY + 6) * dpr);
                var energyScope = inspection ? labels.selectedEnergy : launched ? labels.currentFlight : labels.latestFlight + ' · ' + (ball.landed ? labels.atImpact : labels.lastRecorded);
                ctx.font = (12 * dpr) + 'px sans-serif'; ctx.fillStyle = scene.muted;
                ctx.fillText(energyScope, ebX * dpr, (ebY + 22) * dpr);
                var energies = [{ label: labels.ke || 'KE', value: KE, color: '#7dd3fc' }, { label: labels.pe || 'PE', value: PE, color: '#6ee7b7' }, { label: labels.dragLoss || 'Drag', value: dragLoss, color: '#fda4af' }];
                var offset = 0;
                energies.forEach(function(e, i) {
                  ctx.fillStyle = e.color; ctx.font = (12 * dpr) + 'px sans-serif';
                  ctx.fillText(e.label + ' ' + e.value.toFixed(0) + ' J', (ebX + i * ebW / 3) * dpr, (ebY + 38) * dpr);
                  var ew = totalE > 0 ? e.value / totalE * ebW : 0;
                  ctx.fillRect((ebX + offset) * dpr, (ebY + 49) * dpr, ew * dpr, 7 * dpr); offset += ew;
                });
              }

              // ── Target Mode: Draw destructible crates ──
              if (canvasEl.dataset.targetMode === 'true') {
                var tgtDataStr = canvasEl.dataset.targetList;
                if (tgtDataStr) {
                  try {
                    var tgtData = JSON.parse(tgtDataStr);
                    tgtData.forEach(function(tgt) {
                      var tx = mToScreenX(tgt.x) * dpr;
                      var ty = mToScreenY(tgt.y || 0) * dpr;
                      if (tgt.destroyed) {
                        // Destroyed crate: faded wreckage
                        ctx.save(); ctx.globalAlpha = 0.25;
                        ctx.fillStyle = '#92400e';
                        ctx.fillRect(tx - 8 * dpr, ty - 12 * dpr, 16 * dpr, 12 * dpr);
                        ctx.restore();
                      } else {
                        // Wooden crate body
                        var crW = 16 * dpr, crH = 14 * dpr;
                        ctx.fillStyle = '#b45309';
                        ctx.fillRect(tx - crW/2, ty - crH, crW, crH);
                        // Wood grain
                        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1 * dpr;
                        ctx.beginPath(); ctx.moveTo(tx - crW/2, ty - crH * 0.5); ctx.lineTo(tx + crW/2, ty - crH * 0.5); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(tx, ty - crH); ctx.lineTo(tx, ty); ctx.stroke();
                        // Bullseye
                        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5 * dpr;
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 5 * dpr, 0, Math.PI * 2); ctx.stroke();
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 2.5 * dpr, 0, Math.PI * 2); ctx.stroke();
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath(); ctx.arc(tx, ty - crH/2, 1 * dpr, 0, Math.PI * 2); ctx.fill();
                        // Distance label
                        tag('target-' + tgt.x, [tgt.x + ' m'], tx / dpr, (ty - crH / 2) / dpr, '#fde68a', tx / dpr, ty / dpr - 25, 5);
                        // Hit zone indicator (faint circle)
                        ctx.save();
                        ctx.globalAlpha = 0.12;
                        ctx.fillStyle = '#22c55e';
                        var zoneW = (tgt.radius || 10) * scale * dpr;
                        ctx.beginPath(); ctx.ellipse(tx, ty, zoneW, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                      }
                    });
                  } catch(e) {}
                }

              }
              // Clamp annotation cards inside the plot and avoid label collisions.
              ctx.font = '600 ' + (12 * dpr) + 'px sans-serif';
              var tagPriority = { inspection: -1, apex: 0, prediction: 1, landing: 2, height: 3, ideal: 5 };
              function segmentCrossesBox(from, to, rect, padding) {
                var lo = 0, hi = 1;
                var axes = [[from.x, to.x - from.x, rect.x - padding, rect.x + rect.width + padding], [from.y, to.y - from.y, rect.y - padding, rect.y + rect.height + padding]];
                for (var i = 0; i < axes.length; i++) {
                  var a = axes[i];
                  if (Math.abs(a[1]) < 1e-9) { if (a[0] < a[2] || a[0] > a[3]) return false; }
                  else {
                    var enter = (a[2] - a[0]) / a[1], leave = (a[3] - a[0]) / a[1];
                    lo = Math.max(lo, Math.min(enter, leave)); hi = Math.min(hi, Math.max(enter, leave));
                    if (hi < lo) return false;
                  }
                }
                return true;
              }
              function connectorFor(t, rect) {
                var to = { x: Math.max(rect.x, Math.min(rect.x + rect.width, t.anchor.x)), y: Math.max(rect.y, Math.min(rect.y + rect.height, t.anchor.y)) };
                var dx = to.x - t.anchor.x, dy = to.y - t.anchor.y, length = Math.sqrt(dx * dx + dy * dy);
                if (!pointInPlot(to.x, to.y) || length <= t.radius + 2) return null;
                var start = Math.min(t.radius + 2, length);
                return { from: { x: t.anchor.x + dx * start / length, y: t.anchor.y + dy * start / length }, to: to };
              }
              tagQueue.sort(function(a, b) {
                var priority = (tagPriority[a.id] == null ? 4 : tagPriority[a.id]) - (tagPriority[b.id] == null ? 4 : tagPriority[b.id]);
                if (priority) return priority;
                return a.id.indexOf('run-') === 0 && b.id.indexOf('run-') === 0 ? Number(b.id.slice(4)) - Number(a.id.slice(4)) : 0;
              });
              tagQueue.forEach(function(t) {
                var maxWidth = Math.min(240, cssW - 28), lines = [];
                t.lines.forEach(function(line) {
                  var words = String(line).split(' '), row = '';
                  words.forEach(function(word) { var next = row ? row + ' ' + word : word; if (ctx.measureText(next).width / dpr > maxWidth - 18 && row) { lines.push(row); row = word; } else row = next; });
                  if (row) lines.push(row);
                });
                var width = Math.min(maxWidth, Math.max.apply(null, lines.map(function(line) { return ctx.measureText(line).width / dpr; })) + 18), height = lines.length * 17 + 12;
                var candidates = [[t.x + 16, t.y + 12], [t.x - width - 16, t.y + 12], [t.x - width / 2, t.y - height], [t.x - width / 2, t.y - height - 50], [t.x + 16, groundYCSS - height - 8]];
                var chosen = null;
                candidates.some(function(p) {
                  var rect = { x: Math.max(10, Math.min(cssW - width - 10, p[0])), y: Math.max(plotTop + 8, Math.min(groundYCSS - height - 8, p[1])), width: width, height: height, id: t.id, fontSize: 12 };
                  if (tagBoxes.some(function(b) { return rect.x < b.x + b.width + 6 && rect.x + rect.width + 6 > b.x && rect.y < b.y + b.height + 6 && rect.y + rect.height + 6 > b.y; })) return false;
                  if (markerBoxes.some(function(b) { return rect.x < b.x + b.width && rect.x + rect.width > b.x && rect.y < b.y + b.height && rect.y + rect.height > b.y; })) return false;
                  var connector = connectorFor(t, rect);
                  if (!connector) return false;
                  if (tagBoxes.some(function(b) { return segmentCrossesBox(connector.from, connector.to, b, 2) || (b.connector && segmentCrossesBox(b.connector.from, b.connector.to, rect, 2)); })) return false;
                  if (markerBoxes.some(function(b) {
                    if (t.anchor.x >= b.x && t.anchor.x <= b.x + b.width && t.anchor.y >= b.y && t.anchor.y <= b.y + b.height) return false;
                    return segmentCrossesBox(connector.from, connector.to, b, 0);
                  })) return false;
                  rect.anchor = { x: t.anchor.x, y: t.anchor.y, radius: t.radius };
                  rect.connector = connector;
                  chosen = rect; return true;
                });
                if (!chosen) return;
                tagBoxes.push(chosen);
                ctx.save(); ctx.strokeStyle = t.color; ctx.lineWidth = dpr; ctx.globalAlpha = highContrast ? 1 : .72;
                ctx.beginPath(); ctx.moveTo(chosen.connector.from.x * dpr, chosen.connector.from.y * dpr); ctx.lineTo(chosen.connector.to.x * dpr, chosen.connector.to.y * dpr); ctx.stroke(); ctx.restore();
                ctx.fillStyle = scene.panel;
                ctx.beginPath(); ctx.roundRect(chosen.x * dpr, chosen.y * dpr, width * dpr, height * dpr, 6 * dpr); ctx.fill();
                ctx.strokeStyle = t.color; ctx.lineWidth = dpr; ctx.stroke();
                ctx.fillStyle = t.color; ctx.textAlign = 'left';
                lines.forEach(function(line, i) { ctx.fillText(line, (chosen.x + 9) * dpr, (chosen.y + 19 + i * 17) * dpr); });
              });
              canvasEl._visualLayout = { width: cssW, height: cssH, plotTop: plotTop, groundY: groundYCSS, fontMin: 12, labels: tagBoxes, vectorScale: canvasEl._visualVectors ? canvasEl._visualVectors.scale : null };


              // Sync state back to canvas element for persistence

              canvasEl._tick = tick; canvasEl._trails = trails; canvasEl._ball = ball;

              canvasEl._launched = launched; canvasEl._impactParticles = impactParticles; canvasEl._landingMarkers = landingMarkers;

              // Idle and paused canvases redraw on changes or resize. They do
              // not keep repainting a static scene sixty times per second.
              if ((launched && _ss > 0) || (!physMotionReduced && impactParticles.length > 0)) schedulePhysicsFrame();

            }

            canvasEl._drawFunc = draw;

            schedulePhysicsFrame();

          };

          var PRESETS = [

            { label: '\uD83C\uDF0D ' + __alloT('stem.physics.preset_earth', 'Earth'), gravity: 9.8 },

            { label: '\uD83C\uDF11 ' + __alloT('stem.physics.preset_moon', 'Moon'), gravity: 1.6 },

            { label: '\u2642\uFE0F ' + __alloT('stem.physics.preset_mars', 'Mars'), gravity: 3.7 },

            { label: '\u2643 ' + __alloT('stem.physics.preset_jupiter', 'Jupiter'), gravity: 24.8 },

          ];

          var CHALLENGES = [

            { target: 50, label: '\uD83C\uDFAF ' + __alloT('stem.physics.challenge_land_50m', 'Land at 50m'), tolerance: 8 },

            { target: 100, label: '\uD83C\uDFAF ' + __alloT('stem.physics.challenge_hit_100m_flag', 'Hit the 100m flag'), tolerance: 10 },

            { target: 200, label: '\uD83C\uDFAF ' + __alloT('stem.physics.challenge_reach_200m', 'Reach 200m range'), tolerance: 12 },

          ];
          // The recommendation names an action; with ~19 panels on the page a
          // student should not have to hunt for where that action lives. Each
          // step carries a `do` that performs or reveals it, so the guidance is
          // operable rather than decorative. Every action is something the
          // student could do by hand — nothing here launches or scores for them.
          function physScrollTo(sel) {
            try {
              var el = document.querySelector(sel);
              if (!el) return;
              if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              var focusTarget = el.matches('input, button, textarea, select') ? el : el.querySelector('input, button, textarea, select');
              if (focusTarget && focusTarget.focus) focusTarget.focus({ preventScroll: true });
            } catch (e) {}
          }
          var physicsNextStep = (d.launchCount || 0) === 0
            ? {
                text: __alloT('stem.physics.next_predict_then_launch', 'Estimate the range, then launch once and compare the measured result.'),
                cta: __alloT('stem.physics.next_go_estimate', 'Go to the estimate box'),
                run: function () { physScrollTo('#physPredict'); }
              }
            : !d.showVectors && !d.showEnergy
              ? {
                  text: __alloT('stem.physics.next_turn_on_vectors', 'Turn on vectors or energy and explain what changes during flight.'),
                  cta: __alloT('stem.physics.next_show_vectors', 'Turn on vectors'),
                  run: function () { upd('showVectors', true); }
                }
              : d.targetMode
                ? {
                    text: __alloT('stem.physics.next_one_controlled_change', 'Use one controlled change to improve your next target attempt.'),
                    cta: __alloT('stem.physics.next_go_sliders', 'Go to the controls'),
                    run: function () { physScrollTo('[data-physics-sliders]'); }
                  }
                : !d.dragTried
                  ? {
                      text: __alloT('stem.physics.next_try_drag', 'Turn on Air Drag and launch again: the dashed ghost is the no-drag path, and the Last flight strip shows what drag cost.'),
                      cta: __alloT('stem.physics.next_turn_on_drag', 'Turn on air drag'),
                      run: function () { upd('airResist', true); }
                    }
                  : {
                      text: __alloT('stem.physics.next_change_only_one', 'Change only angle, velocity, or gravity and compare the new trajectory.'),
                      cta: __alloT('stem.physics.next_go_log', 'Go to the experiment log'),
                      run: function () { physScrollTo('[data-physics-run-log]'); }
                    };
          var physicsNext = physicsNextStep.text;

          // Live refresh: the Data and Motion panels read the canvas trail at
          // render time, so during a flight they froze until the next state
          // change. While a panel is open AND a ball is in flight, update a few
          // times a second while retaining the same canvas controller.
          (function () {
            if (typeof document === 'undefined' || !(d.showFlightData || d.showGraphs)) return;
            var cv = document.getElementById('physicsCanvas');
            if (!cv || !cv._launched || cv._liveTimer) return;
            cv._liveTimer = setTimeout(function () {
              cv._liveTimer = null;
              if (cv.isConnected) bump('liveTick', 1);
            }, 250);
          })();

          // ── Controlled-variable checker for the experiment log ──
          // Names every launch setting that differs from the previous run.
          // Zero changes = a repeat trial; exactly one = a fair test; more than
          // one = the comparison cannot attribute the result to any single
          // cause. That judgement is the whole point of the log.
          var RUN_VARS = [
            { k: 'angle', label: __alloT('stem.physics.var_angle', 'angle') },
            { k: 'vel', label: __alloT('stem.physics.var_velocity', 'velocity') },
            { k: 'grav', label: __alloT('stem.physics.var_gravity', 'gravity') },
            { k: 'drag', label: __alloT('stem.physics.var_drag', 'air drag') },
            { k: 'mass', label: __alloT('stem.physics.var_mass', 'mass') },
            { k: 'launchHeight', label: __alloT('stem.physics.var_launch_height', 'launch height') }
          ];
          function physRunChanges(prev, cur) {
            if (!prev) return null;
            var out = [];
            RUN_VARS.forEach(function (v) {
              var a = prev[v.k], b = cur[v.k];
              if (typeof a === 'boolean' || typeof b === 'boolean') { if (!!a !== !!b) out.push({ k: v.k, label: v.label }); return; }
              if (a == null || b == null) return;
              if (Math.abs(parseFloat(a) - parseFloat(b)) > 1e-9) out.push({ k: v.k, label: v.label });
            });
            return out;
          }
          // ── What a fair test actually bought the student ──
          // Given two runs that differ in ONE multiplicative variable, the range
          // ratio against the variable ratio IS the exponent of the relationship:
          //   R = v²·sin(2θ)/g   =>   R ∝ v²  and  R ∝ 1/g
          // so ln(R2/R1) / ln(x2/x1) comes out near +2 for velocity and -1 for
          // gravity, derived from the student's own two launches rather than
          // asserted by the tool. Only offered when the algebra actually holds:
          // drag breaks the closed form, and angle is not a power law at all.
          function physRunExponent(prev, cur, key) {
            if (key !== 'vel' && key !== 'grav') return null;
            var comparison = physCompareRuns(prev, cur);
            if (!comparison || !comparison.fairTest || prev.drag || cur.drag || physRecordedHeight(prev) !== 0 || physRecordedHeight(cur) !== 0) return null;
            var x1 = parseFloat(prev[key]), x2 = parseFloat(cur[key]);
            var r1 = prev.range, r2 = cur.range;
            if (!(x1 > 0 && x2 > 0 && r1 > 0 && r2 > 0)) return null;
            if (Math.abs(x2 / x1 - 1) < 0.02) return null; // too small a change to read
            var n = Math.log(r2 / r1) / Math.log(x2 / x1);
            if (!isFinite(n)) return null;
            return {
              key: key,
              exponent: n,
              varPct: ((x2 - x1) / x1) * 100,
              rangePct: ((r2 - r1) / r1) * 100
            };
          }
          // "^2.0", plus the plain-language consequence when the measured
          // exponent lands near a whole number a student can act on. The raw
          // measured figure is always shown next to the plain-language summary.
          function physExponentLabel(n) {
            var txt = '^' + n.toFixed(1);
            if (Math.abs(n - 2) < 0.35) return txt + ' — ' + __alloT('stem.physics.runlog_law_squared', 'squared: double the speed and the range roughly quadruples');
            if (Math.abs(n + 1) < 0.35) return txt + ' — ' + __alloT('stem.physics.runlog_law_inverse', 'inverse: halve the gravity and the range roughly doubles');
            return txt;
          }
          function physRunLogCsv() {
            var log = Array.isArray(d.runLog) ? d.runLog : [];
            if (!log.length) return null;
            var lines = ['run,angle_deg,velocity_mps,gravity_mps2,air_drag,mass_kg,launch_height_m,range_m,max_height_m,flight_time_s'];
            log.forEach(function (r) {
              lines.push([r.n, r.angle, r.vel, r.grav, r.drag ? 'on' : 'off', r.mass, r.launchHeight, r.range.toFixed(2), r.maxH.toFixed(2), r.time.toFixed(3)].join(','));
            });
            return lines.join('\n');
          }

          // Flight data as CSV (every integrator point, not the sampled table)
          // so students can paste a real run into a spreadsheet for a report.
          function physFlightCsv() {
            var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
            var trails = cv && cv._trails ? cv._trails : [];
            var tr = trails.length > 0 ? trails[trails.length - 1] : null;
            if (!tr || tr.length === 0) return null;
            var height = physRecordedHeight(tr);
            if (height === null) return null;
            var lines = ['# run=' + (tr.run == null ? '' : tr.run) + ',angle_deg=' + tr.angle + ',velocity_mps=' + tr.velocity + ',gravity_mps2=' + tr.gravity + ',launch_height_m=' + height + ',air_drag=' + (tr.drag ? 'on' : 'off') + ',mass_kg=' + tr.mass + ',model=' + (tr.modelVersion || 'unrecorded')];
            lines.push('t_s,x_m,y_m,vx_mps,vy_mps,speed_mps');
            for (var i = 0; i < tr.length; i++) {
              var p = tr[i];
              var vx = p.mVx, vy = p.mVy;
              lines.push([p.t.toFixed(3), p.mX.toFixed(2), p.mY.toFixed(2), vx.toFixed(2), vy.toFixed(2), Math.sqrt(vx * vx + vy * vy).toFixed(2)].join(','));
            }
            return lines.join('\n');
          }
          function physCopyText(text) {
            // Returns a promise resolving true on success. Modern clipboard
            // first; execCommand fallback for sandboxed frames.
            return new Promise(function (resolve) {
              try {
                if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                  (window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(text).then(function () { resolve(true); }, function () { resolve(physCopyFallback(text)); });
                  return;
                }
              } catch (e) {}
              resolve(physCopyFallback(text));
            });
          }
          function physCopyFallback(text) {
            try {
              var ta = document.createElement('textarea');
              ta.value = text; ta.setAttribute('readonly', '');
              ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
              document.body.appendChild(ta); ta.select();
              var ok = document.execCommand && document.execCommand('copy');
              document.body.removeChild(ta);
              return !!ok;
            } catch (e) { return false; }
          }

          return React.createElement("div", { id: "physics-fs-outer", "data-physics-theme": isContrast ? "contrast" : (isDark ? "dark" : "light"), className: "max-w-5xl mx-auto animate-in fade-in duration-200", style: d.physFsMode ? { position: 'fixed', inset: 0, zIndex: 9998, width: '100vw', height: '100vh', maxWidth: '100vw', margin: 0, overflowY: 'auto', background: themeSurface, color: themeInk, padding: '10px' } : { position: 'relative', background: themeSurface, color: themeInk } },
            React.createElement('style', { 'data-physics-visual-styles': true }, `
              #physics-fs-outer{--phys-panel:#fff;--phys-soft:#f3f7fa;--phys-ink:#172c40;--phys-muted:#486176;--phys-line:#c4d2de;--phys-accent:#086d89;--phys-selected:#e1f4f8;--phys-shadow:0 6px 22px rgba(20,47,69,.055);width:100%;min-width:0;box-sizing:border-box;flex:1 1 100%;font-variant-numeric:tabular-nums;line-height:1.5;container-type:inline-size}
              #physics-fs-outer[data-physics-theme="dark"]{--phys-panel:#142438;--phys-soft:#1a3046;--phys-ink:#eef5fb;--phys-muted:#b9ccdd;--phys-line:#526e87;--phys-accent:#8bdcf0;--phys-selected:#204357;--phys-shadow:none;color-scheme:dark}
              #physics-fs-outer[data-physics-theme="contrast"]{--phys-panel:#000;--phys-soft:#000;--phys-ink:#fff;--phys-muted:#fff;--phys-line:#fff;--phys-accent:#ff0;--phys-selected:#000;--phys-shadow:none;color-scheme:dark}
              #physics-fs-outer :is(button,input,textarea,select,summary):focus-visible{outline:3px solid var(--phys-accent);outline-offset:3px}
              #physics-fs-outer :is(button,summary){touch-action:manipulation}
              #physics-fs-outer [data-physics-command]{background:#112d43;background-image:radial-gradient(ellipse at 95% 0,rgba(40,150,172,.24),transparent 55%);border:1px solid #355d73;border-radius:20px;box-shadow:0 12px 28px rgba(13,40,60,.12);margin-bottom:16px;overflow:hidden}
              #physics-fs-outer .phys-command-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;padding:22px 24px}
              #physics-fs-outer .phys-command-title{display:flex;align-items:center;gap:12px;min-width:0}
              #physics-fs-outer .phys-command-title>button{width:44px;height:44px;display:flex;align-items:center;justify-content:center}
              #physics-fs-outer .phys-command-title h3{font-size:clamp(24px,3.3cqi,34px);line-height:1.12;letter-spacing:-.035em;margin:0;color:#fff}
              #physics-fs-outer .phys-command-eyebrow{color:#b9eaf3;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:750;margin-bottom:5px}
              #physics-fs-outer .phys-command-intro{color:#d0e4ee;font-size:13px;line-height:1.6;max-width:570px;margin-top:10px}
              #physics-fs-outer .phys-command-metrics{display:grid;grid-template-columns:repeat(3,minmax(62px,1fr));gap:18px}
              #physics-fs-outer .phys-command-metric{text-align:left;padding-left:14px;border-left:1px solid #507487;min-width:0}
              #physics-fs-outer .phys-command-metric>div:first-child{font-size:21px;font-weight:750;letter-spacing:-.035em;color:#fff;white-space:nowrap}
              #physics-fs-outer .phys-command-metric>div:last-child{font-size:10px;font-weight:650;letter-spacing:.08em;color:#b9dce7;text-transform:uppercase;margin-top:3px}
              #physics-fs-outer .phys-next{display:flex;align-items:center;gap:16px;justify-content:space-between;padding:13px 24px;border-top:1px solid #416477;background:#18394f}
              #physics-fs-outer .phys-next-label{font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:700;color:#aee1ec}
              #physics-fs-outer .phys-next-copy{font-size:13px;line-height:1.5;color:#f2f9fd;margin-top:2px}
              #physics-fs-outer [data-physics-next-cta]{flex-shrink:0;min-height:42px;padding:8px 13px;border:1px solid #8cd8e6;border-radius:9px;background:#b3edf3;color:#113d4b;font-size:12px;font-weight:750}
              #physics-fs-outer .phys-pathway{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:13px 24px;background:#0d2538;margin:0;list-style:none}
              #physics-fs-outer .phys-pathway li{display:flex;gap:9px;align-items:flex-start;min-width:0}
              #physics-fs-outer .phys-pathway-number{border:1px solid #5b8aa1;color:#c2e5f2;border-radius:50%;width:23px;height:23px;display:flex;align-items:center;justify-content:center;flex:none;font-size:11px;font-weight:700}
              #physics-fs-outer .phys-pathway strong{display:block;font-size:12px;color:#eff8fd}
              #physics-fs-outer .phys-pathway-detail{display:block;font-size:11px;color:#bdd7e6;line-height:1.4;margin-top:2px}
              #physics-fs-outer .phys-header-guidance-toggle{display:none}
              #physics-fs-outer .phys-guidance-copy{padding:12px 24px;background:#18394f;border-top:1px solid #416477}
              #physics-fs-outer .phys-guidance-copy .phys-command-intro{margin:0;max-width:none}
              #physics-fs-outer .phys-guidance-copy .phys-next-copy{margin:6px 0 0;font-weight:650}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]){display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;padding:18px;border:1px solid var(--phys-line);border-radius:18px;background:var(--phys-panel);box-shadow:var(--phys-shadow);margin-bottom:16px}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>:is(button,div){grid-column:span 6;min-width:0}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-launch]{grid-column:span 3;min-height:54px;font-size:15px;letter-spacing:.01em;background:#086d89;color:#fff;border:1px solid #086d89;border-radius:11px;box-shadow:0 4px 12px rgba(8,109,137,.18)}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-estimation-challenge]{grid-column:span 6;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;background:var(--phys-soft);border:1px solid var(--phys-line);border-radius:11px;padding:7px 12px;color:var(--phys-ink)}
              #physics-fs-outer [data-physics-estimation-challenge] :is(label,span){color:var(--phys-muted);font-size:12px}
              #physics-fs-outer #physPredict{background:var(--phys-panel);color:var(--phys-ink);font-size:16px;min-height:36px;border-color:var(--phys-line);width:74px;text-align:center;border-radius:7px}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-air-drag]{grid-column:span 3}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-display-controls],#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-playback]{grid-column:span 6}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-gravity-presets],#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-model-comparison]{grid-column:1/-1}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) :is(fieldset,[data-physics-playback]){background:var(--phys-soft);color:var(--phys-ink);border:1px solid var(--phys-line);border-radius:12px;padding:13px}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) legend{font-size:12px;color:var(--phys-muted);letter-spacing:.015em;padding:0 6px;font-weight:750}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) button:not([data-physics-launch]){min-height:44px;padding:9px 11px;background:var(--phys-panel);color:var(--phys-ink);border:1px solid var(--phys-line);border-radius:9px;font-size:12px;line-height:1.4;box-shadow:none;white-space:normal;overflow-wrap:anywhere}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) button[aria-pressed="true"]:not([data-physics-launch]){background:var(--phys-selected);color:var(--phys-accent);border-color:var(--phys-accent);box-shadow:inset 0 -2px var(--phys-accent)}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) button:disabled{opacity:.55}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) button:not(:disabled):hover{filter:brightness(.97)}
              #physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]) p{color:var(--phys-muted);font-size:12px;line-height:1.6}
              #physics-fs-outer [data-physics-primary-controls]{padding:12px;gap:10px;margin-bottom:12px;align-items:stretch}
              #physics-fs-outer [data-physics-primary-controls]>[role="status"]{grid-column:1/-1;grid-row:2;font-size:12px;padding:10px}
              #physics-fs-outer [data-physics-plot-key]{display:flex;flex-wrap:wrap;gap:9px 22px;align-items:center;margin:-5px 0 16px;padding:10px 14px;background:#142f43;color:#e2edf5;border:1px solid #476378;border-radius:10px;font-size:12px;line-height:1.5}
              #physics-fs-outer [data-physics-plot-key]>span{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
              #physics-fs-outer .phys-speed-swatch{display:inline-block;width:45px;height:6px;border-radius:3px;background:linear-gradient(to right,#67e8f9,#fbbf24,#fb7185)}
              #physics-fs-outer .phys-vacuum-swatch{display:inline-block;width:22px;height:0;border-top:2px dashed #fff}
              #physics-fs-outer[data-physics-theme="contrast"] [data-physics-plot-key]{background:#000;color:#fff;border-color:#fff}
              @container(max-width:460px){#physics-fs-outer [data-physics-primary-controls][role="group"]>[data-physics-launch]{grid-column:span 6}#physics-fs-outer [data-physics-primary-controls][role="group"]>[data-physics-air-drag]{grid-column:span 6}#physics-fs-outer [data-physics-primary-controls][role="group"]>[data-physics-estimation-challenge]{grid-column:1/-1;grid-row:2}#physics-fs-outer [data-physics-primary-controls][role="group"]>[role="status"]{grid-row:3}#physics-fs-outer [data-physics-primary-controls][role="group"] [data-physics-estimation-challenge] label{flex:1}#physics-fs-outer [data-physics-primary-controls][role="group"]>[data-physics-launch]{min-height:48px}}
              #physics-fs-outer [data-physics-playback]>span{color:var(--phys-muted);font-size:12px}
              #physics-fs-outer [data-physics-sliders]{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px}
              #physics-fs-outer .phys-parameter{background:var(--phys-panel);border:1px solid var(--phys-line);border-radius:14px;padding:15px 14px 10px;text-align:left;min-width:0;box-shadow:var(--phys-shadow)}
              #physics-fs-outer .phys-parameter[data-locked="true"]{border-style:dashed;box-shadow:none}
              #physics-fs-outer .phys-parameter label{color:var(--phys-muted);font-size:11px;font-weight:650;display:block;min-height:32px}
              #physics-fs-outer .phys-parameter-value{font-size:29px;font-weight:730;line-height:1.15;letter-spacing:-.035em;color:var(--phys-ink);margin:2px 0 9px;display:flex;align-items:baseline;justify-content:space-between;gap:4px}
              #physics-fs-outer .phys-parameter-symbol{font-size:14px;letter-spacing:0;color:var(--phys-accent);font-weight:600}
              #physics-fs-outer .phys-parameter input[type="range"]{appearance:none;-webkit-appearance:none;width:100%;height:22px;background:transparent;margin:3px 0;cursor:pointer;accent-color:var(--phys-accent)}
              #physics-fs-outer .phys-parameter input[type="range"]::-webkit-slider-runnable-track{height:5px;border-radius:4px;background:linear-gradient(to right,var(--phys-accent) 0 var(--phys-range),var(--phys-line) var(--phys-range) 100%)}
              #physics-fs-outer .phys-parameter input[type="range"]::-moz-range-track{height:5px;border-radius:4px;background:var(--phys-line)}
              #physics-fs-outer .phys-parameter input[type="range"]::-moz-range-progress{height:5px;border-radius:4px;background:var(--phys-accent)}
              #physics-fs-outer .phys-parameter input[type="range"]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;margin-top:-6px;height:17px;width:17px;border:3px solid var(--phys-panel);border-radius:50%;background:var(--phys-accent);box-shadow:0 0 0 1px var(--phys-accent)}
              #physics-fs-outer .phys-parameter input[type="range"]::-moz-range-thumb{height:12px;width:12px;border:3px solid var(--phys-panel);border-radius:50%;background:var(--phys-accent);box-shadow:0 0 0 1px var(--phys-accent)}
              #physics-fs-outer .phys-parameter input:disabled{opacity:.5;cursor:not-allowed}
              #physics-fs-outer .phys-parameter-limits{display:flex;justify-content:space-between;color:var(--phys-muted);font-size:10px;margin-top:1px}
              #physics-fs-outer [data-physics-height-help]{grid-column:1/-1;color:var(--phys-muted);font-size:12px;line-height:1.6;margin:0;padding:2px 4px}
              #physics-fs-outer [data-physics-stats]{display:flex;flex-wrap:wrap;gap:8px 20px;padding:8px 4px 16px;margin:0}
              #physics-fs-outer :is([data-physics-last-flight],[data-physics-run-log],[data-physics-model-comparison],[data-physics-estimation-reflection],[data-physics-formulas],[data-physics-learning-panel],[data-physics-investigations]){background:var(--phys-panel)!important;background-image:none!important;color:var(--phys-ink)!important;border:1px solid var(--phys-line)!important;border-radius:16px!important;padding:18px!important;margin-bottom:16px;box-shadow:var(--phys-shadow)}
              #physics-fs-outer :is([data-physics-last-flight],[data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) :is(p,span,label,legend,th,td,h3,h4,b,strong){color:var(--phys-ink)}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) :is(p,label,legend,th,td){font-size:12px;line-height:1.6}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) :is(h3,h4){font-size:15px;line-height:1.4;font-weight:750}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) button{font-size:12px;min-height:40px;border-radius:8px;white-space:normal;overflow-wrap:anywhere}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) :is(textarea,input[type="number"],select){color:var(--phys-ink);background:var(--phys-panel);font-size:14px;border-color:var(--phys-line);border-radius:8px}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) [class*="bg-white"],#physics-fs-outer [data-physics-learning-panel] [class*="bg-slate-"]{background:var(--phys-soft);border-color:var(--phys-line)}
              #physics-fs-outer [data-physics-learning-panel]>div:first-child{flex-wrap:wrap;gap:10px}
              #physics-fs-outer [data-physics-learning-panel]>:is(p,h3):first-child{font-size:13px;letter-spacing:.035em;color:var(--phys-accent);margin-bottom:12px}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) :is([class*="bg-white"],[class*="-50"],[class*="-100"],[class*="-200"]):not(button){background-color:var(--phys-soft);border-color:var(--phys-line)}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) button{background:var(--phys-soft);color:var(--phys-ink);border:1px solid var(--phys-line);padding:8px 12px;box-shadow:none}
              #physics-fs-outer :is([data-physics-run-log],[data-physics-learning-panel],[data-physics-estimation-reflection]) button[aria-pressed="true"]{background:var(--phys-selected);color:var(--phys-accent);border-color:var(--phys-accent);box-shadow:inset 0 -2px var(--phys-accent)}
              #physics-fs-outer [data-physics-learning-panel="mission"]>div:first-child>button,#physics-fs-outer [data-physics-investigation-save]{background:var(--phys-accent)!important;color:var(--phys-panel)!important;border-color:var(--phys-accent)!important}
              #physics-fs-outer [data-physics-run-log] :is(td,th,div,span){color:var(--phys-ink)}
              #physics-fs-outer .phys-command-eyebrow,#physics-fs-outer .phys-command-metric>div:last-child,#physics-fs-outer .phys-next-label,#physics-fs-outer .phys-parameter-limits{font-size:11px}
              #physics-fs-outer .phys-parameter label,#physics-fs-outer .phys-outcome>div:nth-child(3){font-size:12px}
              #physics-fs-outer [data-physics-last-flight]>.phys-flight-heading{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 16px;margin-bottom:14px}
              #physics-fs-outer .phys-flight-heading>span:first-child{font-size:12px;letter-spacing:.015em;line-height:1.6;color:var(--phys-accent)}
              #physics-fs-outer .phys-flight-heading>span:last-child{font-size:12px;color:var(--phys-muted)}
              #physics-fs-outer .phys-outcome{background:var(--phys-soft);border:1px solid var(--phys-line);border-radius:11px;text-align:left;padding:13px 12px;min-width:0}
              #physics-fs-outer .phys-outcome>div:first-child{font-size:12px;letter-spacing:.025em;line-height:1.5;text-transform:uppercase;font-weight:700;color:var(--phys-muted);min-height:36px}
              #physics-fs-outer .phys-outcome>div:nth-child(2){font-size:24px;font-weight:750;letter-spacing:-.035em;line-height:1.3;color:var(--phys-ink)}
              #physics-fs-outer .phys-outcome>div:nth-child(3){font-size:12px;line-height:1.5;color:var(--phys-muted);margin-top:5px}
              #physics-fs-outer [data-physics-run-log] table{font-size:12px;border-collapse:collapse;font-variant-numeric:tabular-nums}
              #physics-fs-outer [data-physics-run-log] th{background:var(--phys-soft);color:var(--phys-muted);font-size:12px;letter-spacing:.01em;padding:10px 8px}
              #physics-fs-outer [data-physics-run-log] td{padding:10px 8px;border-bottom:1px solid var(--phys-line)}
              #physics-fs-outer [data-physics-investigations]>summary{font-size:16px!important;line-height:1.5;min-height:30px!important;color:var(--phys-accent)!important;letter-spacing:-.01em}
              #physics-fs-outer [data-physics-investigations] textarea{line-height:1.65;resize:vertical}
              #physics-fs-outer [data-physics-investigations] button:disabled{opacity:.55}
              #physics-fs-outer [data-physics-ideal-summary]{gap:10px;margin:0 0 16px}
              #physics-fs-outer [data-physics-ideal-summary]>div{background:var(--phys-soft);border:1px solid var(--phys-line);border-radius:12px;padding:14px 10px}
              #physics-fs-outer [data-physics-ideal-summary] p:first-child{font-size:12px;color:var(--phys-muted);min-height:36px;letter-spacing:.025em}
              #physics-fs-outer [data-physics-ideal-summary] p:last-child{font-size:24px;color:var(--phys-ink);font-weight:750;letter-spacing:-.025em}
              #physics-fs-outer[data-physics-theme="contrast"] [data-physics-command]{background:#000;border-color:#fff;box-shadow:none}
              #physics-fs-outer[data-physics-theme="contrast"] :is(.phys-next,.phys-pathway){background:#000;border-color:#fff}
              #physics-fs-outer[data-physics-theme="contrast"] [data-physics-command] :is(p,span,strong,h3,div){color:#fff}
              #physics-fs-outer[data-physics-theme="contrast"] [data-physics-next-cta],#physics-fs-outer[data-physics-theme="contrast"] [data-physics-controls]>[data-physics-launch]{background:#ff0;color:#000;border-color:#ff0}
              @container(max-width:720px){#physics-fs-outer .phys-command-top{grid-template-columns:1fr;gap:16px;padding:19px}#physics-fs-outer .phys-command-metrics{gap:10px}#physics-fs-outer .phys-command-metric:first-child{padding-left:0;border-left:0}#physics-fs-outer .phys-command-metric>div:first-child{font-size:22px}#physics-fs-outer .phys-next{padding:13px 19px}#physics-fs-outer .phys-pathway{padding:13px 19px;gap:12px}#physics-fs-outer .phys-pathway-detail{display:none}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]){padding:14px;gap:10px}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-display-controls],#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-playback]{grid-column:1/-1}#physics-fs-outer [data-physics-sliders]{grid-template-columns:repeat(3,minmax(0,1fr))}}
              @container(max-width:460px){#physics-fs-outer .phys-command-top{padding:17px;gap:15px}#physics-fs-outer .phys-command-title{gap:9px}#physics-fs-outer .phys-command-title h3{font-size:25px}#physics-fs-outer .phys-command-intro{font-size:12px}#physics-fs-outer .phys-command-metric>div:first-child{font-size:20px}#physics-fs-outer .phys-next{padding:12px 17px;align-items:flex-start;flex-direction:column;gap:9px}#physics-fs-outer [data-physics-next-cta]{width:100%;min-height:40px}#physics-fs-outer .phys-pathway{padding:12px 17px;gap:6px}#physics-fs-outer .phys-pathway li{gap:6px;align-items:center}#physics-fs-outer .phys-pathway strong{font-size:11px}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls]){padding:12px}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-launch]{grid-column:span 6}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-estimation-challenge]{grid-column:span 6;gap:4px;padding:6px}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>[data-physics-air-drag]{grid-column:1/-1}#physics-fs-outer :is([data-physics-controls],[data-physics-primary-controls])>button{grid-column:1/-1}#physics-fs-outer [data-physics-sliders]{grid-template-columns:repeat(2,minmax(0,1fr))}#physics-fs-outer .phys-parameter{padding:13px 12px 9px}#physics-fs-outer .phys-parameter-value{font-size:28px}#physics-fs-outer :is([data-physics-last-flight],[data-physics-run-log],[data-physics-model-comparison],[data-physics-estimation-reflection],[data-physics-formulas],[data-physics-learning-panel],[data-physics-investigations]){padding:13px!important}#physics-fs-outer .phys-outcome{padding:11px 10px}#physics-fs-outer .phys-outcome>div:nth-child(2){font-size:22px}#physics-fs-outer [data-physics-ideal-summary] p:last-child{font-size:20px}#physics-fs-outer [data-physics-ideal-summary] p:first-child{font-size:10px}#physics-fs-outer [data-physics-learning-panel="challenges"]>.grid{grid-template-columns:1fr}#physics-fs-outer [data-physics-learning-panel="equations"]>.grid{grid-template-columns:1fr}}
              @container(max-width:460px){#physics-fs-outer [data-physics-ideal-summary] p:first-child{font-size:12px}}
              @container(max-width:720px){
                #physics-fs-outer [data-physics-command]{border-radius:16px;margin-bottom:12px}
                #physics-fs-outer .phys-command-top{padding:12px 14px 9px;gap:4px;grid-template-columns:1fr}
                #physics-fs-outer .phys-command-title{gap:9px}
                #physics-fs-outer .phys-command-title h3{font-size:1.25rem;letter-spacing:-.02em}
                #physics-fs-outer .phys-command-eyebrow{display:none}
                #physics-fs-outer .phys-command-metrics{display:flex;justify-content:flex-end;gap:0}
                #physics-fs-outer .phys-command-metric{display:none}
                #physics-fs-outer .phys-command-metric[data-header-metric="launches"]{display:flex;align-items:baseline;gap:5px;padding:0;border:0}
                #physics-fs-outer .phys-command-metric[data-header-metric="launches"]>div:first-child{font-size:.8125rem;letter-spacing:0}
                #physics-fs-outer .phys-command-metric[data-header-metric="launches"]>div:last-child{font-size:.75rem;letter-spacing:0;text-transform:none;margin:0}
                #physics-fs-outer .phys-next{padding:10px 14px;flex-direction:row;align-items:center;gap:10px}
                #physics-fs-outer .phys-next-label{font-size:.6875rem;letter-spacing:.04em;max-width:105px}
                #physics-fs-outer [data-physics-next-cta]{width:auto;max-width:65%;min-width:0;min-height:44px;padding:8px 11px;white-space:normal;font-size:.75rem;line-height:1.4;overflow-wrap:anywhere}
                #physics-fs-outer .phys-header-guidance-toggle{display:flex;width:100%;min-height:44px;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:#0d2538;color:#c9e5f1;border:0;border-top:1px solid #416477;text-align:left;font-size:.75rem;font-weight:650;line-height:1.4}
                #physics-fs-outer .phys-header-guidance-toggle:focus-visible{outline-color:#b3edf3;outline-offset:-4px}
                #physics-fs-outer [data-physics-command][data-guidance-open="false"] [data-physics-header-guidance]{display:none}
                #physics-fs-outer .phys-guidance-copy{padding:12px 14px}
                #physics-fs-outer .phys-guidance-copy .phys-command-intro,#physics-fs-outer .phys-guidance-copy .phys-next-copy{font-size:.75rem;line-height:1.6}
                #physics-fs-outer .phys-pathway{padding:12px 14px;grid-template-columns:1fr;gap:11px}
                #physics-fs-outer .phys-pathway li{align-items:flex-start;gap:9px}
                #physics-fs-outer .phys-pathway strong,#physics-fs-outer .phys-pathway-detail{font-size:.75rem}
                #physics-fs-outer .phys-pathway-detail{display:block;margin-top:1px}
              }
              #physics-fs-outer[data-physics-theme="contrast"] :is(.phys-guidance-copy,.phys-header-guidance-toggle){background:#000;color:#fff;border-color:#fff}
              #physics-fs-outer :is([data-physics-sample-inspector],[data-physics-flight-data]){min-width:0;margin-bottom:16px;padding:18px;border:1px solid var(--phys-line);border-radius:16px;background:var(--phys-panel);color:var(--phys-ink);box-shadow:var(--phys-shadow)}
              #physics-fs-outer .phys-measured-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 18px;margin-bottom:12px}
              #physics-fs-outer .phys-measured-heading h3{margin:0;font-size:1rem;font-weight:750;color:var(--phys-ink)}
              #physics-fs-outer .phys-measured-heading p,#physics-fs-outer .phys-measured-help{font-size:.75rem;line-height:1.65;color:var(--phys-muted);margin-top:4px}
              #physics-fs-outer .phys-sample-time{font-size:1.5rem;font-weight:750;font-variant-numeric:tabular-nums;color:var(--phys-accent);white-space:nowrap}
              #physics-fs-outer .phys-capture-settings{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
              #physics-fs-outer .phys-capture-settings span{padding:4px 8px;background:var(--phys-soft);border:1px solid var(--phys-line);border-radius:7px;font-size:.75rem;color:var(--phys-muted);overflow-wrap:anywhere}
              #physics-fs-outer :is([data-physics-sample-inspector],[data-physics-flight-data]) button{min-height:44px;padding:9px 12px;border:1px solid var(--phys-line);border-radius:9px;background:var(--phys-panel);color:var(--phys-ink);font-size:.75rem;font-weight:650;line-height:1.5;white-space:normal;overflow-wrap:anywhere}
              #physics-fs-outer :is([data-physics-sample-inspector],[data-physics-flight-data]) button:disabled{opacity:.5;cursor:not-allowed}
              #physics-fs-outer :is([data-physics-sample-inspector],[data-physics-flight-data]) button[aria-pressed="true"]{background:var(--phys-selected);border-color:var(--phys-accent);color:var(--phys-accent);box-shadow:inset 0 -2px var(--phys-accent)}
              #physics-fs-outer .phys-sample-navigation{padding:12px;background:var(--phys-soft);border:1px solid var(--phys-line);border-radius:12px;margin-bottom:14px}
              #physics-fs-outer .phys-sample-navigation label{display:block;font-size:.75rem;color:var(--phys-muted);font-weight:650}
              #physics-fs-outer .phys-sample-navigation input{display:block;width:100%;min-height:30px;margin:6px 0;accent-color:var(--phys-accent)}
              #physics-fs-outer .phys-sample-buttons{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
              #physics-fs-outer .phys-measured-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}
              #physics-fs-outer .phys-measured-card{min-width:0;border:1px solid var(--phys-line);border-radius:12px;background:var(--phys-soft);padding:14px}
              #physics-fs-outer .phys-measured-card h4{margin:0 0 10px;font-size:.875rem;font-weight:750;color:var(--phys-ink)}
              #physics-fs-outer .phys-measured-card dl{margin:0;display:grid;gap:9px}
              #physics-fs-outer .phys-measured-card dl>div{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:3px 12px;padding-bottom:7px;border-bottom:1px solid var(--phys-line)}
              #physics-fs-outer .phys-measured-card dt{font-size:.75rem;color:var(--phys-muted)}
              #physics-fs-outer .phys-measured-card dd{margin:0;font-size:1rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--phys-ink)}
              #physics-fs-outer .phys-energy-budget{display:flex;width:100%;height:10px;overflow:hidden;border-radius:5px;background:var(--phys-panel);border:1px solid var(--phys-line);margin:12px 0}
              #physics-fs-outer .phys-energy-key{display:inline-block;width:9px;height:9px;margin-right:6px;border-radius:2px;border:1px solid var(--phys-line)}
              #physics-fs-outer [data-physics-sample-forces]{margin-top:12px;padding:12px;border:1px solid var(--phys-line);border-radius:12px;background:var(--phys-soft)}
              #physics-fs-outer [data-physics-sample-forces]>summary{min-height:32px;cursor:pointer;font-size:.875rem;font-weight:700;color:var(--phys-accent)}
              #physics-fs-outer [data-physics-flight-table-wrap]{position:relative;isolation:isolate;max-height:460px;overflow:auto;overflow-anchor:none;overscroll-behavior:contain;border:1px solid var(--phys-line);border-radius:11px;margin-top:12px;background:var(--phys-panel)}
              #physics-fs-outer [data-physics-flight-table]{width:100%;min-width:620px;border-collapse:separate;border-spacing:0;font-variant-numeric:tabular-nums;text-align:right;font-size:.8125rem}
              #physics-fs-outer [data-physics-flight-table] :is(th,td){padding:10px 12px;border-bottom:1px solid var(--phys-line);color:var(--phys-ink);white-space:nowrap}
              #physics-fs-outer [data-physics-flight-table] thead th{position:sticky;top:0;z-index:3;background:var(--phys-soft);color:var(--phys-muted);font-size:.75rem;font-weight:700}
              #physics-fs-outer [data-physics-flight-table] :is(th,td):first-child{text-align:left}
              #physics-fs-outer [data-physics-flight-table] tbody th{position:sticky;left:0;z-index:2;background:var(--phys-panel);border-left:3px solid transparent;box-shadow:1px 0 var(--phys-line)}
              #physics-fs-outer [data-physics-flight-table] thead th:first-child{left:0;z-index:4;box-shadow:1px 0 var(--phys-line)}
              #physics-fs-outer [data-physics-flight-table] tbody tr[data-selected="true"] :is(th,td){background:var(--phys-selected);border-bottom-color:var(--phys-accent)}
              #physics-fs-outer [data-physics-flight-table] tbody tr[data-selected="true"] th{border-left-color:var(--phys-accent)}
              #physics-fs-outer [data-physics-flight-table] button{min-width:82px;padding:7px 9px;font-variant-numeric:tabular-nums}
              #physics-fs-outer [data-physics-flight-scroll-hint]{display:none;align-items:flex-start;gap:8px;margin:12px 0 0;padding:9px 11px;border:1px solid var(--phys-line);border-radius:9px;background:var(--phys-soft);color:var(--phys-muted);font-size:.75rem;line-height:1.6}
              #physics-fs-outer [data-physics-flight-scroll-hint]>span:first-child{font-size:1.125rem;line-height:1.15;color:var(--phys-accent)}
              #physics-fs-outer [data-physics-flight-summary]{display:none;margin-top:12px;padding:12px;border:1px solid var(--phys-line);border-radius:11px;background:var(--phys-soft)}
              #physics-fs-outer [data-physics-flight-summary]>p{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;margin:0 0 10px;font-size:.75rem;line-height:1.5;color:var(--phys-muted)}
              #physics-fs-outer [data-physics-flight-summary]>p>strong{color:var(--phys-accent);font-weight:700}
              #physics-fs-outer [data-physics-flight-summary] dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;margin:0}
              #physics-fs-outer [data-physics-flight-summary] dt{font-size:.75rem;line-height:1.5;color:var(--phys-muted)}
              #physics-fs-outer [data-physics-flight-summary] dd{margin:3px 0 0;font-size:1rem;font-weight:750;line-height:1.4;font-variant-numeric:tabular-nums;color:var(--phys-ink)}
              @container(max-width:720px){#physics-fs-outer [data-physics-flight-scroll-hint]{display:flex}#physics-fs-outer [data-physics-flight-summary]{display:block}}
              @container(max-width:460px){#physics-fs-outer :is([data-physics-sample-inspector],[data-physics-flight-data]){padding:13px}#physics-fs-outer .phys-sample-buttons>button{flex:1 1 95px}#physics-fs-outer .phys-measured-card{padding:12px}}
              @media(prefers-reduced-motion:reduce){#physics-fs-outer :is(button,input,summary){transition:none!important;animation:none!important}}
            `),
            (ctx.renderTutorial || function () { return null; })('physics', ctx._tutPhysics || []),


            React.createElement("section", { "data-physics-command": "true", 'data-guidance-open': d.headerGuidanceOpen ? 'true' : 'false', className: "mb-4 overflow-hidden rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950 text-white shadow-xl" },
              React.createElement("div", null,
                React.createElement("div", { className: "phys-command-top" },
                  React.createElement("div", { className: "min-w-0" },
                    React.createElement("div", { className: "phys-command-title" },
                      React.createElement("button", { onClick: () => setStemLabTool(null), className: "shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300", 'aria-label': __alloT('stem.physics.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                      React.createElement("div", { style: { minWidth: 0 } },
                        React.createElement("p", { className: "phys-command-eyebrow" }, __alloT('stem.physics.projectile_mission', 'Projectile mission')),
                        React.createElement("h3", { className: "font-black" }, __alloT('stem.physics.physics_simulator', 'Physics Simulator')))
                    )
                  ),
                  React.createElement("div", { className: "phys-command-metrics" },
                    [
                      { id: 'angle', label: __alloT('stem.physics.metric_angle', 'Angle'), value: String((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) + '\u00B0' },
                      { id: 'speed', label: __alloT('stem.physics.metric_speed', 'Speed'), value: String(d.velocity || 25) + ' m/s' },
                      { id: 'launches', label: __alloT('stem.physics.metric_launches', 'Launches'), value: String(d.launchCount || 0) }
                    ].map(function(metric) {
                      return React.createElement("div", { key: metric.id, className: "phys-command-metric", 'data-header-metric': metric.id },
                        React.createElement("div", { title: metric.value }, metric.value),
                        React.createElement("div", null, metric.label)
                      );
                    })
                  )
                ),
                React.createElement("div", { className: "phys-next" },
                  React.createElement("div", { style: { minWidth: 0 } },
                    React.createElement("p", { className: "phys-next-label" }, __alloT('stem.physics.recommended_next_move', 'Recommended next move'))),
                  React.createElement("button", { type: "button", "data-physics-next-cta": "true", 'aria-describedby': 'physics-header-recommendation', onClick: physicsNextStep.run }, physicsNextStep.cta + " →")),
                React.createElement('button', { type: 'button', className: 'phys-header-guidance-toggle', 'data-physics-header-guidance-toggle': true, 'aria-expanded': !!d.headerGuidanceOpen, 'aria-controls': 'physics-header-guidance', onClick: function() { upd('headerGuidanceOpen', !d.headerGuidanceOpen); } },
                  React.createElement('span', null, __alloT('stem.physics.header_guidance', 'Investigation guide')),
                  React.createElement('span', { 'aria-hidden': true }, d.headerGuidanceOpen ? '−' : '+')),
                React.createElement('div', { id: 'physics-header-guidance', 'data-physics-header-guidance': true },
                  React.createElement('div', { className: 'phys-guidance-copy' },
                    React.createElement('p', { className: 'phys-command-intro' }, __alloT('stem.physics.tool_intro_blurb', 'Investigate how launch conditions shape motion, then support each claim with trajectory evidence.')),
                    React.createElement('p', { className: 'phys-next-copy', id: 'physics-header-recommendation' }, physicsNext)),
                React.createElement("ol", { className: "phys-pathway", "aria-label": __alloT('stem.physics.investigation_pathway', 'Projectile investigation pathway') },
                  [
                    { n: '1', title: __alloT('stem.physics.step_predict', 'Estimate'), detail: __alloT('stem.physics.step_predict_detail', 'Use the variables to estimate a range.') },
                    { n: '2', title: __alloT('stem.physics.step_launch', 'Launch'), detail: __alloT('stem.physics.step_launch_detail', 'Observe motion and collect evidence.') },
                    { n: '3', title: __alloT('stem.physics.step_explain', 'Explain'), detail: __alloT('stem.physics.step_explain_detail', 'Connect forces to the trajectory.') }
                  ].map(function(step) {
                    return React.createElement("li", { key: step.n },
                      React.createElement("span", { className: "phys-pathway-number", 'aria-hidden': true }, step.n),
                      React.createElement("span", null, React.createElement("strong", null, step.title), React.createElement("span", { className: "phys-pathway-detail" }, step.detail))
                    );
                  })
                ))
              )
            ),

            React.createElement("div", { 'data-physics-primary-controls': true, role: 'group', 'aria-label': __alloT('stem.physics.launch_actions', 'Launch and estimate') },

              React.createElement("button", { 'data-physics-launch': true, "aria-label": __alloT('stem.physics.launch', 'Launch!'),

                onClick: function () {

                  // Estimate-then-launch: snapshot the current estimate so the
                  // landing-event callback can score it against actual range.
                  // We capture here (not in the callback) so a student who
                  // changes prediction mid-flight can't game the comparison.
                  var pNum = parseFloat(d.predictedRange);
                  upd('lastPredictionRange', isFinite(pNum) ? pNum : null);
                  upd('predictionResult', null);

                  fireLaunch();

                }, className: "px-4 py-2 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold rounded-xl text-sm hover:from-amber-700 hover:to-orange-700 shadow-md transition-all"

              }, "\uD83D\uDE80 " + __alloT('stem.physics.launch', 'Launch!')),

              React.createElement("button", { 'data-physics-air-drag': true, "aria-label": __alloT('stem.physics.aria_air_drag_currently', 'Air drag, currently ') + (d.airResist ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),

                "aria-pressed": !!d.airResist,

                onClick: function () { upd('airResist', !d.airResist); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.airResist ? 'bg-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-200')

              }, "\uD83C\uDF2C\uFE0F " + __alloT('stem.physics.label_air_drag', 'Air Drag ') + (d.airResist ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              // \u2500\u2500 Quantitative estimation challenge \u2500\u2500
              React.createElement("div", { className: "flex items-center gap-1.5 bg-fuchsia-50 border border-fuchsia-200 rounded-lg px-2 py-1", "data-physics-estimation-challenge": "true", title: __alloT('stem.physics.estimation_title_attr', 'Quantitative estimation challenge: closeness earns XP; inquiry reflections are never graded for matching.') },
                React.createElement("label", { htmlFor: "physPredict", className: "text-[0.6875rem] font-bold text-fuchsia-700" }, "\uD83D\uDCCF " + __alloT('stem.physics.predict_landing', 'Estimate landing:')),
                React.createElement("input", {
                  id: "physPredict",
                  type: "number",
                  min: 0,
                  max: 9999,
                  step: 0.1,
                  value: d.predictedRange == null ? '' : d.predictedRange,
                  placeholder: "m",
                  "aria-label": __alloT('stem.physics.aria_predicted_landing', 'Estimated landing distance in meters'),
                  onChange: function(e) { upd('predictedRange', e.target.value); },
                  className: "w-16 px-1.5 py-0.5 text-xs font-mono border border-fuchsia-600 rounded bg-white text-slate-700 focus:outline-none focus:border-fuchsia-500"
                }),
                // fuchsia-600 on the fuchsia-50 field measured 4.39:1, just under AA.
                React.createElement("span", { className: "text-[0.625rem] text-fuchsia-700" }, "m")
              ),

              // \u2500\u2500 Estimation result feedback (shown after landing if an estimate was made) \u2500\u2500
              d.predictionResult && React.createElement("div", {
                className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold border " + (
                  d.predictionResult.tier === 'bullseye' ? 'bg-fuchsia-700 text-white border-fuchsia-800' :
                  d.predictionResult.tier === 'close' ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' :
                  'bg-slate-100 text-slate-700 border-slate-300'
                ),
                role: "status",
                "aria-live": "polite"
              },
                (d.predictionResult.tier === 'bullseye' ? '\uD83C\uDFAF ' + __alloT('stem.physics.est_bullseye', 'Bullseye!') + ' ' :
                 d.predictionResult.tier === 'close' ? '\uD83D\uDD2E ' + __alloT('stem.physics.est_close', 'Close!') + ' ' : '\uD83D\uDCCF ') +
                __alloT('stem.physics.est_estimated', 'Estimated ') + d.predictionResult.predicted.toFixed(1) + 'm, ' + __alloT('stem.physics.est_measured', 'measured ') + d.predictionResult.actual.toFixed(1) + 'm (' + d.predictionResult.errPct.toFixed(0) + '% ' + __alloT('stem.physics.est_error', 'error') + ')' +
                (d.predictionResult.xp ? ' +' + d.predictionResult.xp + ' XP' : '')
              ),


            ),

            React.createElement("div", { id: "physics-fs-wrap", className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: d.physFsMode ? { position: 'relative', height: '75vh', minHeight: 480 } : { height: "480px" } },

              // Fullscreen toggle (top-right). Real OS fullscreen only works where the host iframe
              // grants it (document.fullscreenEnabled). Inside a sandboxed iframe (e.g. Gemini
              // Canvas) it's blocked by Permissions Policy — requestFullscreen() rejects/throws
              // "Disallowed by permissions policy" — so fall back to a CSS "fill the frame" mode
              // toggled via state (physFsMode): the wrapper goes position:fixed/100vw/100vh and,
              // because the canvas is width/height:100%, the re-render re-measures it to fill.
              React.createElement("button", {
                'aria-label': (d.physFsMode ? __alloT('stem.physics.exit_fullscreen', 'Exit fullscreen') : __alloT('stem.physics.fullscreen', 'Fullscreen')) + __alloT('stem.physics.for_the_physics_canvas', ' for the physics canvas'),
                title: d.physFsMode ? __alloT('stem.physics.exit_fullscreen', 'Exit fullscreen') : __alloT('stem.physics.fullscreen', 'Fullscreen'),
                onClick: function() {
                  // Fullscreen the OUTER container (header + canvas + controls),
                  // not just the canvas, so the sim controls stay usable in
                  // fullscreen. The canvas grows to 70vh; controls flow below in
                  // the scrollable fixed container.
                  var el = document.getElementById('physics-fs-outer');
                  if (d.physFsMode) { upd('physFsMode', false); return; }        // exit CSS fill-frame
                  var inReal = el && (document.fullscreenElement === el || document.webkitFullscreenElement === el || document.mozFullScreenElement === el);
                  if (inReal) { try { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) { var pe = ex.call(document); if (pe && pe.catch) pe.catch(function(){}); } } catch (e) {} return; }
                  var rq = el && (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen);
                  if (rq && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
                    // real fullscreen where the host permits it; if it still rejects, fall back to CSS
                    try { var pr = rq.call(el); if (pr && pr.catch) pr.catch(function(){ upd('physFsMode', true); }); return; } catch (e) {}
                  }
                  upd('physFsMode', true);                                        // sandboxed iframe — CSS fill-frame
                },
                style: {
                  position: 'absolute', top: 8, right: 8, zIndex: 10,
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(125,211,252,0.5)', color: '#bae6fd',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }
              }, d.physFsMode ? '✕' : '⛶'),

              React.createElement("canvas", {

                role: "application",

                "aria-label": __alloT('stem.physics.aria_canvas', 'Physics projectile simulator — use arrow keys to adjust angle and velocity, Space to launch'),

                ref: canvasRef,

                id: "physicsCanvas",

                tabIndex: 0,

                "data-angle": d.angle, "data-velocity": d.velocity, "data-gravity": d.gravity, "data-launch-height": d.launchHeight,

                "data-scene-theme": isContrast ? "contrast" : "night",

                "data-mass": (typeof d.mass === 'number' && isFinite(d.mass)) ? d.mass : 1,

                "data-air-resist": d.airResist ? 'true' : 'false',
                "data-show-vectors": d.showVectors ? 'true' : 'false',
                "data-show-energy": d.showEnergy ? 'true' : 'false',
                "data-target-mode": d.targetMode ? 'true' : 'false',
                "data-target-list": d.targetList ? JSON.stringify(d.targetList) : '',
                "data-constraint-type": d.targetConstraint ? d.targetConstraint.type : '',
                "data-constraint-value": d.targetConstraint ? String(d.targetConstraint.value) : '',
                "data-show-overlay": d.showOverlay ? 'true' : 'false',
                "data-show-formulas": d.showFormulas ? 'true' : 'false',
                "data-sim-speed": String((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0),
                // The number the NEXT landing will claim, so the draw loop can
                // stamp the trail without reading React state.
                "data-run-next": String((d.runCount || 0) + 1),

                onKeyDown: function (e) {

                  // Keyboard and pointer controls follow the same mission locks.
                  var angleLocked = d.targetMode && d.targetConstraint && d.targetConstraint.type === 'fixedAngle';
                  var velocityLocked = d.targetMode && d.targetConstraint && d.targetConstraint.type === 'fixedVelocity';
                  if (e.key === 'ArrowUp') { e.preventDefault(); if (!angleLocked) upd('angle', Math.min(85, ((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) + 5)); }

                  else if (e.key === 'ArrowDown') { e.preventDefault(); if (!angleLocked) upd('angle', Math.max(d.launchHeight > 0 ? 0 : 5, ((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) - 5)); }

                  else if (e.key === 'ArrowRight') { e.preventDefault(); if (!velocityLocked) upd('velocity', Math.min(50, (d.velocity || 25) + 5)); }

                  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!velocityLocked) upd('velocity', Math.max(5, (d.velocity || 25) - 5)); }

                  else if (e.key === ' ') {

                    e.preventDefault();

                    var keyboardEstimate = parseFloat(d.predictedRange);
                    upd('lastPredictionRange', isFinite(keyboardEstimate) ? keyboardEstimate : null);
                    upd('predictionResult', null);

                    fireLaunch();

                  }

                },

                style: { width: "100%", height: "100%", display: "block" }

              })

            ),

            React.createElement('div', { 'data-physics-plot-key': true },
              React.createElement('span', null, __alloT('stem.physics.plot_trail_speed', 'Latest trail speed'), ' · 0 ', React.createElement('span', { className: 'phys-speed-swatch', 'aria-hidden': true }), ' ≥60 m/s'),
              React.createElement('span', null, React.createElement('span', { className: 'phys-vacuum-swatch', 'aria-hidden': true }), __alloT('stem.physics.plot_vacuum_key', 'White dashed · vacuum reference'))),

            (function() {
              var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
              var sample = physSelectedInspection(cv);
              if (!sample) return null;
              var h = React.createElement;
              var trail = cv._inspection.trail;
              var parameters = sample.parameters;
              var highest = 0;
              trail.forEach(function(point, index) { if (point.mY > trail[highest].mY) highest = index; });
              function measurement(key, label, value, unit) {
                var swatch = key === 'ke' ? 'var(--phys-accent)' : key === 'pe' ? 'var(--phys-muted)' : key === 'dragLoss' ? 'repeating-linear-gradient(135deg,var(--phys-line),var(--phys-line) 2px,var(--phys-panel) 2px,var(--phys-panel) 4px)' : null;
                return h('div', { key: key, 'data-physics-measurement': key }, h('dt', null, swatch && h('span', { className: 'phys-energy-key', 'aria-hidden': true, style: { background: swatch } }), label), h('dd', null, value.toFixed(2) + ' ' + unit));
              }
              var sampleLabel = __alloT('stem.physics.sample_number', 'Sample') + ' ' + (sample.index + 1) + ' / ' + sample.count;
              var settings = [
                'θ = ' + parameters.angle + '°', 'v₀ = ' + parameters.velocity + ' m/s',
                'g = ' + parameters.gravity + ' m/s²', 'm = ' + parameters.mass + ' kg', 'h₀ = ' + parameters.launchHeight + ' m',
                parameters.airResist ? __alloT('stem.physics.sample_drag_on', 'Air drag on') : __alloT('stem.physics.sample_drag_off', 'Air drag off')
              ];
              return h('section', { id: 'physics-sample-inspector', 'data-physics-sample-inspector': true, 'data-physics-inspection': true, 'aria-labelledby': 'physics-sample-heading', tabIndex: -1 },
                h('div', { className: 'phys-measured-heading' },
                  h('div', null,
                    h('h3', { id: 'physics-sample-heading' }, __alloT('stem.physics.sample_inspector_title', 'Explore a recorded moment')),
                    h('p', null, (sample.run != null ? __alloT('stem.physics.investigation_run', 'Run') + ' ' + sample.run + ' · ' : '') + sampleLabel + (sample.impact ? ' · ' + __alloT('stem.physics.sample_ground_impact', 'Ground impact') : ''))),
                  h('strong', { className: 'phys-sample-time' }, 't = ' + sample.t.toFixed(3) + ' s'),
                  h('button', { type: 'button', 'data-physics-sample-close': true, onClick: function() {
                    physClearInspection();
                    setTimeout(function() {
                      var opener = document.querySelector('[data-physics-inspect]');
                      if (opener) opener.focus();
                    }, 0);
                  } }, __alloT('stem.physics.sample_close', 'Close inspector'))),
                h('div', { className: 'phys-capture-settings', 'aria-label': __alloT('stem.physics.sample_recorded_settings', 'Recorded launch settings') }, settings.map(function(label, index) { return h('span', { key: index }, label); })),
                h('div', { className: 'phys-sample-navigation' },
                  h('label', { htmlFor: 'physics-sample-slider' }, __alloT('stem.physics.sample_slider_label', 'Move through the recorded flight')),
                  h('input', { type: 'range', id: 'physics-sample-slider', 'data-physics-sample-slider': true, min: 0, max: Math.max(0, trail.length - 1), step: 1, value: sample.index,
                    'aria-valuetext': sampleLabel + ', t = ' + sample.t.toFixed(3) + ' s', disabled: trail.length < 2,
                    onChange: function(e) { physSelectSample(Number(e.target.value)); } }),
                  h('div', { className: 'phys-sample-buttons' },
                    h('button', { type: 'button', 'data-physics-sample-prev': true, disabled: sample.index === 0, onClick: function() { physSelectSample(sample.index - 1); } }, __alloT('stem.physics.sample_previous', 'Previous point')),
                    h('button', { type: 'button', 'data-physics-sample-next': true, disabled: sample.index >= trail.length - 1, onClick: function() { physSelectSample(sample.index + 1); } }, __alloT('stem.physics.sample_next', 'Next point')),
                    h('button', { type: 'button', 'data-physics-sample-jump': 'launch', 'aria-pressed': sample.index === 0, onClick: function() { physSelectSample(0); } }, __alloT('stem.physics.sample_launch_point', 'Launch point')),
                    h('button', { type: 'button', 'data-physics-sample-jump': 'highest', 'aria-pressed': sample.index === highest, onClick: function() { physSelectSample(highest); } }, __alloT('stem.physics.sample_highest_point', 'Highest recorded point')),
                    h('button', { type: 'button', 'data-physics-sample-jump': 'latest', 'aria-pressed': sample.index === trail.length - 1, onClick: function() { physSelectSample(trail.length - 1); } }, __alloT('stem.physics.sample_latest_point', 'Latest point')))),
                h('div', { className: 'phys-measured-grid' },
                  h('section', { className: 'phys-measured-card', 'aria-labelledby': 'physics-sample-motion' },
                    h('h4', { id: 'physics-sample-motion' }, __alloT('stem.physics.sample_motion', 'Position & velocity')),
                    h('dl', null,
                      measurement('x', __alloT('stem.physics.sample_horizontal_position', 'Horizontal position · x'), sample.x, 'm'),
                      measurement('y', __alloT('stem.physics.sample_height', 'Height above ground · y'), sample.y, 'm'),
                      measurement('vx', __alloT('stem.physics.sample_horizontal_velocity', 'Horizontal velocity · vx'), sample.vx, 'm/s'),
                      measurement('vy', __alloT('stem.physics.sample_vertical_velocity', 'Vertical velocity · vy'), sample.vy, 'm/s'),
                      measurement('speed', __alloT('stem.physics.metric_speed', 'Speed'), sample.speed, 'm/s'))),
                  h('section', { className: 'phys-measured-card', 'aria-labelledby': 'physics-sample-energy' },
                    h('h4', { id: 'physics-sample-energy' }, __alloT('stem.physics.sample_energy', 'Energy at this moment')),
                    h('dl', null,
                      measurement('ke', __alloT('stem.physics.sample_kinetic_energy', 'Kinetic · KE'), sample.ke, 'J'),
                      measurement('pe', __alloT('stem.physics.sample_potential_energy', 'Potential · PE'), sample.pe, 'J'),
                      measurement('totalEnergy', __alloT('stem.physics.sample_mechanical_energy', 'Mechanical · KE + PE'), sample.totalEnergy, 'J'),
                      measurement('dragLoss', __alloT('stem.physics.inspect_energy_transferred', 'Energy transferred to the air'), sample.dragLoss, 'J'),
                      measurement('initialEnergy', __alloT('stem.physics.sample_initial_energy', 'Initial energy'), sample.initialEnergy, 'J')),
                    sample.initialEnergy > 0 && h('div', { className: 'phys-energy-budget', 'aria-hidden': true },
                      h('span', { style: { width: Math.max(0, Math.min(100, sample.ke / sample.initialEnergy * 100)) + '%', background: 'var(--phys-accent)' } }),
                      h('span', { style: { width: Math.max(0, Math.min(100, sample.pe / sample.initialEnergy * 100)) + '%', background: 'var(--phys-muted)' } }),
                      h('span', { style: { width: Math.max(0, Math.min(100, sample.dragLoss / sample.initialEnergy * 100)) + '%', background: 'repeating-linear-gradient(135deg,var(--phys-line),var(--phys-line) 3px,var(--phys-panel) 3px,var(--phys-panel) 6px)' } })))),
                h('details', { 'data-physics-sample-forces': true },
                  h('summary', null, __alloT('stem.physics.sample_forces', 'Forces & acceleration')),
                  h('div', { className: 'phys-measured-grid' },
                    h('div', { className: 'phys-measured-card' }, h('dl', null,
                      measurement('ax', __alloT('stem.physics.sample_horizontal_acceleration', 'Horizontal acceleration · ax'), sample.ax, 'm/s²'),
                      measurement('ay', __alloT('stem.physics.sample_vertical_acceleration', 'Vertical acceleration · ay'), sample.ay, 'm/s²'),
                      measurement('fx', __alloT('stem.physics.sample_horizontal_force', 'Net horizontal force · Fx'), sample.fx, 'N'),
                      measurement('fy', __alloT('stem.physics.sample_vertical_force', 'Net vertical force · Fy'), sample.fy, 'N'))),
                    h('div', { className: 'phys-measured-card' }, h('dl', null,
                      measurement('gravityForce', __alloT('stem.physics.inspect_gravity_force', 'Gravitational force downward'), sample.gravityForce, 'N'),
                      measurement('dragForce', __alloT('stem.physics.inspect_drag_force', 'Drag force opposite velocity'), sample.dragForce, 'N'))))),
                h('p', { className: 'phys-measured-help' }, __alloT('stem.physics.sample_inspection_help', 'These are recorded measurements. Moving the time control pauses playback and leaves the flight evidence intact. Highest recorded point selects the highest sampled position.')),
                h('p', { className: 'phys-measured-help' }, __alloT('stem.physics.inspect_axes', 'Right and up are positive; potential energy is measured from the ground.')),
                sample.impact && h('p', { className: 'phys-measured-help', 'data-physics-impact-note': true, style: { padding: '10px 12px', background: 'var(--phys-soft)', borderLeft: '3px solid var(--phys-accent)', borderRadius: 6 } }, __alloT('stem.physics.sample_impact_note', 'Impact values describe the arriving projectile immediately before ground contact. The model stops at contact and does not simulate the collision force.')),
                typeof d.inspectionSnapshot === 'string' && h('p', { className: 'sr-only' }, d.inspectionSnapshot));
            })(),

            React.createElement("div", { 'data-physics-controls': true, className: "flex flex-wrap gap-1.5 mb-2" },

              React.createElement('fieldset', { 'data-physics-display-controls': true, style: { width: '100%', minWidth: 0 }, className: 'rounded-xl border border-slate-200 p-3' },
                React.createElement('legend', { className: 'px-1 text-xs font-bold' }, __alloT('stem.physics.display_controls', 'Views and explanations')),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 8 } },
              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_motion_vectors_currently', 'Velocity and gravity vectors, currently ') + (d.showVectors ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showVectors,
                onClick: function () { upd('showVectors', !d.showVectors); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showVectors ? 'bg-purple-700 text-white shadow-md' : 'bg-purple-50 text-purple-700 border border-purple-200')
              }, "\u2197\uFE0F " + __alloT('stem.physics.label_motion_vectors', 'Velocity & gravity ') + (d.showVectors ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_energy_currently', 'Energy display, currently ') + (d.showEnergy ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showEnergy,
                onClick: function () { upd('showEnergy', !d.showEnergy); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showEnergy ? 'bg-blue-700 text-white shadow-md' : 'bg-blue-50 text-blue-700 border border-blue-200')
              }, "\u26A1 " + __alloT('stem.physics.label_energy', 'Energy display ') + (d.showEnergy ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_learn_currently', 'Physics guide, currently ') + (d.showLearn ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showLearn,
                onClick: function () { upd('showLearn', !d.showLearn); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showLearn ? 'bg-emerald-700 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
              }, "\uD83D\uDCD6 " + __alloT('stem.physics.label_learn', 'Physics guide')),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_data_currently', 'Flight data, currently ') + (d.showFlightData ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showFlightData,
                onClick: function () { upd('showFlightData', !d.showFlightData); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showFlightData ? 'bg-cyan-700 text-white shadow-md' : 'bg-cyan-50 text-cyan-700 border border-cyan-200')
              }, "\uD83D\uDCCA " + __alloT('stem.physics.label_data', 'Flight data ') + (d.showFlightData ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_show_work_currently', 'Show your work formulas panel, currently ') + (d.showFormulas ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showFormulas,
                onClick: function () { upd('showFormulas', !d.showFormulas); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showFormulas ? 'bg-fuchsia-700 text-white shadow-md' : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200')
              }, "\u{1F4DD} " + __alloT('stem.physics.label_show_work', 'Show your work ') + (d.showFormulas ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_compare_currently', 'Trajectory comparison overlay, currently ') + (d.showOverlay ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showOverlay,
                onClick: function () { upd('showOverlay', !d.showOverlay); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showOverlay ? 'bg-rose-700 text-white shadow-md' : 'bg-rose-50 text-rose-700 border border-rose-200')
              }, "\u{1F4C8} " + __alloT('stem.physics.label_compare', 'Trajectory comparison ') + (d.showOverlay ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

              React.createElement("button", { type: "button", style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" }, "aria-label": __alloT('stem.physics.aria_motion_currently', 'Motion component graphs (Vx vs t and Vy vs t), currently ') + (d.showGraphs ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),
                "aria-pressed": !!d.showGraphs,
                onClick: function () { upd('showGraphs', !d.showGraphs); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showGraphs ? 'bg-teal-700 text-white shadow-md' : 'bg-teal-50 text-teal-700 border border-teal-200')
              }, "\u{1F4C9} " + __alloT('stem.physics.label_motion', 'Motion component graphs ') + (d.showGraphs ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF')))
                )
              ),

              // ── Simulation speed control (pause + slow-motion) ──
              // Lets students freeze flight mid-arc to inspect velocity
              // vectors, energy bars, and position without losing context.
              // Active speed gets indigo background so state is obvious.
              React.createElement("div", { "data-physics-playback": true, "aria-describedby": "physics-playback-help", style: { width: "100%", minWidth: 0 }, className: "flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-300 rounded-lg", role: "group", "aria-label": __alloT('stem.physics.sim_speed', 'Simulation speed') },
                React.createElement("span", { style: { flexBasis: "100%" }, className: "text-xs font-bold text-slate-600" }, __alloT('stem.physics.playback_heading', 'Animation playback')),
                [{ v: 1.0, label: __alloT('stem.physics.playback_normal', 'Normal (1×)') }, { v: 0.5, label: __alloT('stem.physics.playback_half', 'Half speed (½×)') }, { v: 0.25, label: __alloT('stem.physics.playback_quarter', 'Quarter speed (¼×)') }, { v: 0, label: __alloT('stem.physics.pause', 'Pause') }].map(function (sp) {
                  var isActive = ((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0) === sp.v;
                  return React.createElement("button", {
                    key: sp.v, type: "button", "data-physics-playback-rate": sp.v, style: { minHeight: 44, minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere" },
                    "aria-label": sp.v === 0 ? __alloT('stem.physics.pause', 'Pause') : __alloT('stem.physics.sim_speed_prefix', 'Simulation speed ') + sp.label,
                    "aria-pressed": isActive,
                    onClick: function () { if (sp.v > 0) physClearInspection(); upd('simSpeed', sp.v); },
                    className: "px-2.5 py-1.5 text-xs font-bold transition-all " + (isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')
                  }, sp.label);
                }),
                // Step button — only useful when paused. Sets a one-shot
                // flag on the canvas that the draw loop consumes to advance
                // exactly one physics tick before re-pausing. Lets students
                // walk through flight a frame at a time.
                React.createElement("button", {
                  type: "button", style: { minHeight: 44 }, "data-physics-step": true,
                  "aria-label": __alloT('stem.physics.aria_step_time', 'Advance 0.035 seconds (available when paused)'),
                  disabled: ((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0) !== 0,
                  onClick: function () {
                    var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
                    if (cv) {
                      physClearInspection();
                      cv._stepNext = true;
                      if (cv._physScheduleFrame) cv._physScheduleFrame();
                    }
                  },
                  className: "px-2.5 py-1.5 text-xs font-bold transition-all border-l border-slate-300 " +
                    (((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0) === 0
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'bg-slate-100 text-slate-600 cursor-not-allowed')
                }, "⏭ " + __alloT('stem.physics.step_time', 'Step 0.035 s')),
                React.createElement('button', { type: 'button', 'data-physics-inspect': true, disabled: d.simSpeed !== 0, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-indigo-300 text-indigo-700 disabled:opacity-50', onClick: function() {
                  if (d.simSpeed !== 0) return;
                  var cv = document.getElementById('physicsCanvas');
                  var trails = cv && cv._trails ? cv._trails : [];
                  var latest = trails.length > 0 ? trails[trails.length - 1] : [];
                  if (physSelectSample(latest.length - 1)) {
                    setTimeout(function() {
                      var panel = document.querySelector('[data-physics-sample-inspector]');
                      if (!panel) return;
                      panel.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
                      var slider = panel.querySelector('[data-physics-sample-slider]');
                      (slider && !slider.disabled ? slider : panel).focus({ preventScroll: true });
                    }, 0);
                    return;
                  }
                  var b = cv && cv._ball;
                  if (!b || !['t', 'mX', 'mVx', 'mVy', 'mY', 'mass', 'grav', 'drag'].every(function(k) { return typeof b[k] === 'number' && isFinite(b[k]); }) || b.mass <= 0) {
                    upd('inspectionSnapshot', __alloT('stem.physics.inspect_empty', 'Launch a projectile, then pause to inspect its motion.'));
                    return;
                  }
                  var speed = Math.sqrt(b.mVx * b.mVx + b.mVy * b.mVy);
                  var dragA = b.drag * speed / b.mass;
                  var ax = -dragA * b.mVx, ay = -b.grav - dragA * b.mVy;
                  var ke = 0.5 * b.mass * speed * speed, pe = b.mass * b.grav * Math.max(0, b.mY);
                  var lost = b.drag > 0 && Number.isFinite(b.E0) ? Math.max(0, b.E0 - ke - pe) : 0;
                  upd('inspectionSnapshot', __alloT('stem.physics.inspect_captured', 'Captured flight state at') + ' ' + b.t.toFixed(3) + ' s. ' +
                    'x = ' + b.mX.toFixed(2) + ' m; y = ' + b.mY.toFixed(2) + ' m. ' +
                    'Vx = ' + b.mVx.toFixed(2) + ' m/s; Vy = ' + b.mVy.toFixed(2) + ' m/s. ' +
                    __alloT('stem.physics.inspect_acceleration', 'Total acceleration') + ': ax = ' + ax.toFixed(2) + ' m/s²; ay = ' + ay.toFixed(2) + ' m/s². ' +
                    __alloT('stem.physics.inspect_gravity_force', 'Gravitational force downward') + ': ' + (b.mass * b.grav).toFixed(2) + ' N. ' +
                    __alloT('stem.physics.inspect_drag_force', 'Drag force opposite velocity') + ': ' + (b.drag * speed * speed).toFixed(2) + ' N. ' +
                    'Fx = ' + (-b.drag * speed * b.mVx).toFixed(2) + ' N; Fy = ' + (-b.drag * speed * b.mVy).toFixed(2) + ' N. ' +
                    'KE = ' + ke.toFixed(2) + ' J; PE = ' + pe.toFixed(2) + ' J; KE + PE = ' + (ke + pe).toFixed(2) + ' J. ' +
                    __alloT('stem.physics.inspect_energy_transferred', 'Energy transferred to the air') + ': ' + lost.toFixed(2) + ' J. ' +
                    __alloT('stem.physics.inspect_axes', 'Right and up are positive; potential energy is measured from the ground.'));
                } }, __alloT('stem.physics.inspect_motion', 'Inspect paused motion & energy')),
                React.createElement("button", { "aria-label": __alloT('stem.physics.aria_clear_trails', 'Clear all trajectory trails'),
                  onClick: function () {
                    // Clear IN PLACE. The draw loop keeps its own references to
                    // these arrays and writes them back to the element every
                    // frame, so assigning fresh arrays here was undone on the
                    // next frame and this button did nothing.
                    var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
                    if (cv) {
                      if (cv._cancelFlight) cv._cancelFlight();
                      ['_trails', '_impactParticles', '_landingMarkers'].forEach(function (k) { if (Array.isArray(cv[k])) cv[k].length = 0; else cv[k] = []; });
                      cv._apex = null;
                      if (cv._physScheduleFrame) cv._physScheduleFrame();
                    }
                    upd('lastFlight', null);
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                }, "\u{1F9F9} " + __alloT('stem.physics.clear_trails', 'Clear Trails')),
                !physSelectedInspection(typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null) && typeof d.inspectionSnapshot === 'string' && d.inspectionSnapshot && React.createElement('p', { 'data-physics-inspection': true, role: 'status', 'aria-live': 'polite', style: { flexBasis: '100%' }, className: 'text-xs leading-relaxed text-indigo-800 rounded-lg bg-white p-3 border border-indigo-200' }, d.inspectionSnapshot),
                React.createElement('p', { id: 'physics-playback-help', style: { flexBasis: '100%' }, className: 'text-xs text-slate-600' }, __alloT('stem.physics.playback_time_help', 'Choose the playback pace. Pause to inspect recorded points, or use Step to advance the simulation by 0.035 seconds. The launch velocity stays the same.'))
              ),

              // The controller advances this comparison after each landing,
              // preserving pause, stepping and playback-speed behavior.
              React.createElement("button", {
                "aria-label": __alloT('stem.physics.aria_ground_symmetry_demo', 'Vacuum symmetry comparison: launch at 30 and 60 degrees from ground level with the same speed and gravity'),
                disabled: !!d.targetMode,
                title: d.targetMode ? __alloT('stem.physics.symmetry_target_disabled', 'End the target mission to compare two launch angles.') : undefined,
                onClick: function () {
                  if (d.targetMode) return;
                  var cv = document.getElementById('physicsCanvas');
                  if (!cv || !cv._startSymmetryDemo) return;
                  upd('showOverlay', true);
                  cv._startSymmetryDemo();
                },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              }, "\u{1F500} " + __alloT('stem.physics.ground_symmetry_demo', 'Compare 30° & 60° (ground level, no drag)')),

              React.createElement('button', {
                type: 'button', 'data-physics-model-comparison-start': true,
                'aria-label': __alloT('stem.physics.aria_model_comparison', 'Compare vacuum and air drag using the same launch settings'),
                disabled: !!d.targetMode || !!d.challengeActive || !!d.battleMode,
                title: d.targetMode || d.challengeActive || d.battleMode ? __alloT('stem.physics.model_comparison_mission_disabled', 'Finish or end the active mission before comparing models.') : undefined,
                onClick: function () {
                  if (d.targetMode || d.challengeActive || d.battleMode) return;
                  var cv = document.getElementById('physicsCanvas');
                  if (!cv || !cv._startModelComparison) return;
                  upd('modelComparison', null);
                  upd('showOverlay', true);
                  cv._startModelComparison();
                },
                style: { minHeight: 44, backgroundColor: isContrast ? '#000000' : (isDark ? '#164e63' : '#ecfeff'), color: themeInk, borderColor: isContrast ? '#ffffff' : (isDark ? '#67e8f9' : '#0e7490') },
                className: 'px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50 disabled:cursor-not-allowed'
              }, __alloT('stem.physics.model_comparison_start', 'Compare vacuum & air drag (2 flights)')),

              d.modelComparison && (function () {
                var comparison = d.modelComparison;
                var parameters = comparison.parameters;
                var rows = [
                  { key: 'range', label: __alloT('stem.physics.model_comparison_range', 'Range (m)') },
                  { key: 'maxH', label: __alloT('stem.physics.model_comparison_height_ground', 'Maximum height above ground (m)') },
                  { key: 'time', label: __alloT('stem.physics.model_comparison_time', 'Flight time (s)') }
                ];
                return React.createElement('section', {
                  'data-physics-model-comparison': true, 'aria-labelledby': 'physics-model-comparison-heading',
                  style: { flexBasis: '100%', minWidth: 0, backgroundColor: themeSurface, color: themeInk, borderColor: isContrast ? '#ffffff' : (isDark ? '#67e8f9' : '#0e7490') }, className: 'rounded-xl border p-3'
                },
                  React.createElement('h3', { id: 'physics-model-comparison-heading', style: { color: themeInk }, className: 'text-sm font-bold' }, __alloT('stem.physics.model_comparison_heading', 'Measured model comparison')),
                  React.createElement('p', { 'data-physics-model-comparison-settings': true, className: 'mt-1 text-xs leading-relaxed' },
                    __alloT('stem.physics.model_comparison_settings', 'Both flights used:') + ' ' + parameters.angle + '°, ' + parameters.velocity + ' m/s, g = ' + parameters.gravity + ' m/s², ' + parameters.mass + ' kg, ' + __alloT('stem.physics.var_launch_height', 'launch height') + ' = ' + (parameters.launchHeight || 0) + ' m.'),
                  React.createElement('table', { className: 'mt-2 w-full text-xs', style: { tableLayout: 'auto', borderCollapse: 'collapse', color: themeInk, fontVariantNumeric: 'tabular-nums' } },
                    React.createElement('caption', { className: 'sr-only' }, __alloT('stem.physics.model_comparison_caption', 'Two completed flights with identical launch settings. Change is the air-drag measurement minus the vacuum measurement.')),
                    React.createElement('thead', null, React.createElement('tr', null,
                      [__alloT('stem.physics.model_comparison_measure_short', 'Measure'), __alloT('stem.physics.model_comparison_vacuum_short', 'No drag'), __alloT('stem.physics.model_comparison_drag', 'Air drag'), 'Δ'].map(function (label, i) {
                        return React.createElement('th', { key: i, scope: 'col', 'aria-label': i === 3 ? __alloT('stem.physics.model_comparison_change', 'Change') : undefined, className: 'text-left border-b', style: { padding: '6px 2px', overflowWrap: 'anywhere', borderColor: isContrast ? '#ffffff' : (isDark ? '#67e8f9' : '#0e7490') } }, label);
                      }))),
                    React.createElement('tbody', null, rows.map(function (row) {
                      var delta = comparison.drag[row.key] - comparison.vacuum[row.key];
                      var change = (delta > 0.0005 ? '+' : '') + (Math.abs(delta) < 0.0005 ? 0 : delta).toFixed(3);
                      return React.createElement('tr', { key: row.key, 'data-comparison-measurement': row.key },
                        React.createElement('th', { scope: 'row', className: 'text-left font-semibold', style: { padding: '6px 2px', overflowWrap: 'anywhere' } }, row.label),
                        React.createElement('td', { style: { padding: '6px 2px', whiteSpace: 'nowrap' } }, comparison.vacuum[row.key].toFixed(3)),
                        React.createElement('td', { style: { padding: '6px 2px', whiteSpace: 'nowrap' } }, comparison.drag[row.key].toFixed(3)),
                        React.createElement('td', { style: { padding: '6px 2px', whiteSpace: 'nowrap' } }, change));
                    }))),
                  React.createElement('p', { className: 'mt-2 text-xs leading-relaxed' }, __alloT('stem.physics.model_comparison_explanation', 'Change = air drag minus vacuum. Air drag opposes motion; this model uses still air and a fixed drag coefficient. The experiment log contains both completed flights.')));
              })(),

              React.createElement('fieldset', { 'data-physics-gravity-presets': true, 'aria-describedby': 'physics-gravity-presets-help', style: { width: '100%', minWidth: 0 }, className: 'rounded-xl border border-sky-200 p-3' },
                React.createElement('legend', { className: 'px-1 text-xs font-bold' }, __alloT('stem.physics.gravity_presets', 'Gravity presets')),
                React.createElement('p', { id: 'physics-gravity-presets-help', className: 'mb-2 text-xs text-slate-600' }, __alloT('stem.physics.gravity_presets_help', 'Changes gravity only. Launch angle, velocity, mass, and air drag stay as you set them.')),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 8 } },
              PRESETS.map(function (p) {

                return React.createElement("button", { key: p.label, type: 'button', 'data-gravity-preset': p.gravity, 'aria-pressed': d.gravity === p.gravity, style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }, onClick: function () { upd('gravity', p.gravity); },

                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.gravity === p.gravity ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100')

                }, React.createElement('span', { className: 'block' }, p.label), React.createElement('span', { className: 'block mt-1 font-normal' }, p.gravity + ' m/s²'));

              })))

            ),

            d.predictionResult && React.createElement("section", { className: "mb-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3", "data-physics-estimation-reflection": "true", role: "region", "aria-label": __alloT('stem.physics.a11y_range_estimation_comparison_and_reflection', 'Range estimation comparison and reflection') },
              React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-2" },
                React.createElement("div", null,
                  React.createElement("h4", { className: "text-[0.6875rem] font-black uppercase tracking-wide text-fuchsia-800" }, __alloT('stem.physics.est_section_title', 'Quantitative estimation challenge')),
                  React.createElement("p", { className: "mt-1 text-[0.6875rem] leading-relaxed text-slate-700" }, __alloT('stem.physics.est_section_blurb', 'Closeness earns estimation XP here because numerical calibration is the skill. Your reflection earns completion credit regardless of the error.'))
                ),
                React.createElement("span", { className: "rounded-full bg-white px-2 py-1 text-[0.625rem] font-black text-fuchsia-800" }, d.predictionResult.errPct.toFixed(0) + "% " + __alloT('stem.physics.est_error', 'error'))
              ),
              React.createElement("fieldset", { className: "mt-2" },
                React.createElement("legend", { className: "text-[0.625rem] font-black text-fuchsia-900" }, __alloT('stem.physics.est_legend', 'How did the measured result affect your estimate?')),
                React.createElement("div", { className: "mt-1 grid gap-1 sm:grid-cols-3", role: "radiogroup", "aria-label": __alloT('stem.physics.a11y_how_the_measured_range_affected_the_estimate', 'How the measured range affected the estimate') },
                  [
                    { id: 'supported', label: __alloT('stem.physics.est_opt_supported', 'It supported my method') },
                    { id: 'revised', label: __alloT('stem.physics.est_opt_revised', 'I would revise my method') },
                    { id: 'uncertain', label: __alloT('stem.physics.est_opt_uncertain', 'I need another controlled trial') }
                  ].map(function(option) {
                    var selectedRevision = d.predictionResult.revision === option.id;
                    return React.createElement("label", { key: option.id, className: "flex cursor-pointer gap-1.5 rounded-lg border p-2 text-[0.625rem] font-bold " + (selectedRevision ? "border-fuchsia-500 bg-white text-fuchsia-950" : "border-fuchsia-200 bg-white/60 text-slate-700") },
                      React.createElement("input", { type: "radio", name: "physics-estimation-revision", value: option.id, checked: selectedRevision, onChange: function() { upd('predictionResult', Object.assign({}, d.predictionResult, { revision: option.id, reflectionComplete: false })); }, className: "mt-0.5 h-4 w-4 accent-fuchsia-700" }),
                      React.createElement("span", null, option.label)
                    );
                  })
                )
              ),
              React.createElement("label", { htmlFor: "physics-estimation-reason", className: "mt-2 block text-[0.625rem] font-black text-fuchsia-900" }, __alloT('stem.physics.est_reason_label', 'What will you keep or change next time?')),
              React.createElement("textarea", { id: "physics-estimation-reason", rows: 2, maxLength: 400, value: d.predictionResult.reason || '', onChange: function(e) { upd('predictionResult', Object.assign({}, d.predictionResult, { reason: e.target.value.slice(0, 400), reflectionComplete: false })); }, placeholder: __alloT('stem.physics.est_reason_placeholder', 'The measured range and percent error show... Next time I will...'), className: "mt-1 w-full rounded-lg border border-fuchsia-500 bg-white p-2 text-[0.6875rem] text-slate-800" }),
              React.createElement("button", { type: "button", disabled: !d.predictionResult.revision || String(d.predictionResult.reason || '').trim().length < 12 || d.predictionResult.reflectionComplete, "aria-disabled": d.predictionResult.revision && String(d.predictionResult.reason || '').trim().length >= 12 && !d.predictionResult.reflectionComplete ? "false" : "true", onClick: function() {
                if (!d.predictionResult.revision || String(d.predictionResult.reason || '').trim().length < 12 || d.predictionResult.reflectionComplete) return;
                upd('predictionResult', Object.assign({}, d.predictionResult, { reflectionComplete: true }));
                if (awardStemXP) awardStemXP('estimate_reflection', 5, 'Reflected on range evidence');
              }, className: "mt-2 rounded-lg bg-fuchsia-700 px-3 py-2 text-[0.625rem] font-black text-white disabled:cursor-not-allowed disabled:opacity-45" }, d.predictionResult.reflectionComplete ? __alloT('stem.physics.est_reflection_saved', 'Reflection saved') : __alloT('stem.physics.est_save_reflection', 'Save estimation reflection'))
            ),

            React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3", "data-physics-sliders": "true" },

              [{ k: 'angle', label: __alloT('stem.physics.slider_angle', 'Angle (\u00B0)'), min: d.launchHeight > 0 ? 0 : 5, max: 85, step: 1 }, { k: 'velocity', label: __alloT('stem.physics.slider_velocity', 'Velocity (m/s)'), min: 5, max: 50, step: 1 }, { k: 'gravity', label: __alloT('stem.physics.slider_gravity', 'Gravity (m/s\u00B2)'), min: 1, max: 25, step: 0.1 }, { k: 'mass', label: __alloT('stem.physics.slider_mass', 'Mass (kg)'), min: 1, max: 10, step: 1 }, { k: 'launchHeight', label: __alloT('stem.physics.slider_launch_height', 'Launch height (m)'), min: 0, max: 50, step: 1 }].map(function (s) {
                var isLocked = (s.k === 'launchHeight' && (d.targetMode || d.challengeActive || d.battleMode)) || d.targetMode && d.targetConstraint && (
                  (d.targetConstraint.type === 'fixedAngle' && s.k === 'angle') ||
                  (d.targetConstraint.type === 'fixedVelocity' && s.k === 'velocity')
                );
                return React.createElement("div", { key: s.k, className: "phys-parameter", 'data-locked': isLocked ? 'true' : 'false' },

                  React.createElement("label", { htmlFor: 'physics-parameter-' + s.k }, isLocked ? '\u{1F512} ' + s.label : s.label),

                  React.createElement("div", { className: "phys-parameter-value" },
                    React.createElement('span', null, d[s.k]),
                    React.createElement('span', { className: 'phys-parameter-symbol', 'aria-hidden': true }, { angle: 'θ', velocity: 'v₀', gravity: 'g', mass: 'm', launchHeight: 'h₀' }[s.k])),

                  React.createElement("input", { id: 'physics-parameter-' + s.k, type: "range", style: { '--phys-range': (100 * (d[s.k] - s.min) / (s.max - s.min)) + '%' }, "data-physics-parameter": s.k, "aria-valuetext": (d[s.k] + " " + ((s.label.match(/\(([^)]+)\)/) || ["", ""])[1])), "aria-label": s.label, min: s.min, max: s.max, step: s.step, value: d[s.k], disabled: isLocked, onChange: function (e) {
                    if (!isLocked) {
                      var newVal = parseFloat(e.target.value);
                      if (s.k === 'launchHeight') {
                        setLabToolData(function(prev) {
                          var current = prev.physics || {};
                          if (current.targetMode || current.challengeActive || current.battleMode) return prev;
                          return Object.assign({}, prev, { physics: Object.assign({}, current, { launchHeight: newVal, angle: newVal === 0 ? Math.max(5, current.angle == null ? 45 : current.angle) : current.angle }) });
                        });
                      } else upd(s.k, newVal);
                      // Canvas Narration: parameter change (high debounce to avoid spam during drag)
                      if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'param_' + s.k, s.label.split(' ')[0] + ': ' + newVal, { debounce: 800 });
                    }
                  }, className: "w-full " + (isLocked ? 'accent-red-400 opacity-50 cursor-not-allowed' : 'accent-sky-600') }),
                  React.createElement('div', { className: 'phys-parameter-limits', 'aria-hidden': true }, React.createElement('span', null, s.min), React.createElement('span', null, s.max))

                );

              }),
              React.createElement('p', { 'data-physics-height-help': true, className: 'col-span-2 sm:col-span-3 lg:col-span-5 text-xs text-slate-700' }, __alloT('stem.physics.launch_height_help', 'Launch height is measured above ground; every flight lands at ground level. Raise the launcher to enable a horizontal launch at 0°. Missions and challenges use ground-level launches.'))

            ),

            // ── XP & Stats Bar ──
            React.createElement("div", { 'data-physics-stats': true, className: "flex items-center gap-3 mb-2 px-1" },
              React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#475569') } }, "\uD83D\uDE80 " + __alloT('stem.physics.launches_count', 'Launches: ') + (d.launchCount || 0)),
              React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#92400e') } }, "\uD83C\uDFAF " + __alloT('stem.physics.targets_count', 'Targets: ') + (d.targetsHit || 0)),
              d.predictionStreak > 0 && React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: isContrast ? '#ffff00' : (isDark ? '#f0abfc' : '#86198f') } }, "\uD83D\uDCCF " + __alloT('stem.physics.prediction_streak_count', 'Estimation streak: ') + d.predictionStreak),
              d.quizStreak > 0 && React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: isContrast ? '#ffff00' : (isDark ? '#fdba74' : '#9a3412') } }, "\uD83D\uDD25 " + __alloT('stem.physics.streak_count', 'Streak: ') + d.quizStreak)
            ),

            // \u2500\u2500 Live "Show Your Work" Formulas Panel \u2500\u2500
            // Updates in real time as the angle/velocity/gravity sliders move.
            // Three forms per equation (symbolic \u2192 substituted \u2192 numeric) so
            // the student SEES how slider changes flow through the algebra.
            // Drag is ignored in these closed-form expressions; a note flags
            // that when air resist is on.
            // ── Last flight: measured results against the no-drag formula ──
            // The formulas panel predicts; this strip MEASURES. Putting the two
            // side by side is where drag stops being a slogan and becomes a
            // number the student can explain (range lost, height lost).
            d.lastFlight && isFinite(d.lastFlight.range) && (function () {
              var lf = d.lastFlight;
              var hasParams = lf.angle != null && lf.vel != null && lf.grav;
              var ideal = hasParams ? window.StemLab._physics.vacuum(lf.angle, lf.vel, lf.grav, lf.launchHeight || 0) : null;
              if (ideal && ideal.status !== 'landed') ideal = null;
              var idealR = ideal ? ideal.range : null;
              var idealH = ideal ? ideal.maxH : null;
              var idealT = ideal ? ideal.time : null;
              var lossR = idealR != null ? idealR - lf.range : null;
              var lossPct = idealR > 0 && lossR != null ? (lossR / idealR) * 100 : null;
              var tile = function (key, label, value, sub, cls) {
                return React.createElement("div", { key: key, className: "phys-outcome", 'data-outcome': key },
                  React.createElement("div", { className: "text-[0.625rem] font-bold uppercase tracking-wide text-slate-600" }, label),
                  React.createElement("div", { className: "text-sm font-black text-slate-800" }, value),
                  sub ? React.createElement("div", { className: "text-[0.625rem] text-slate-600" }, sub) : null
                );
              };
              var vsLabel = idealR != null ? (__alloT('stem.physics.lf_formula_says', 'formula: ') + idealR.toFixed(1) + ' m') : null;
              return React.createElement("section", { className: "mb-3 rounded-xl border border-sky-200 bg-sky-50 p-2", "data-physics-last-flight": "true", role: "status", "aria-label": __alloT('stem.physics.lf_aria', 'Last flight results') },
                React.createElement("div", { className: "phys-flight-heading" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold uppercase tracking-wider text-sky-800" }, "📐 " + __alloT('stem.physics.lf_title', 'Last flight') + (hasParams ? ' — ' + lf.angle + '°, ' + lf.vel + ' m/s, g=' + lf.grav + ', h₀=' + (lf.launchHeight || 0) + ' m' + (lf.drag ? ', ' + __alloT('stem.physics.lf_drag_on', 'air drag on') + ', ' + lf.mass + ' kg' : '') : '')),
                  React.createElement("span", { className: "text-[0.625rem] text-sky-700" }, lf.drag ? __alloT('stem.physics.lf_measured_vs_formula', 'measured vs no-drag formula') : __alloT('stem.physics.lf_measured', 'measured'))
                ),
                React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
                  tile('r', __alloT('stem.physics.label_range', 'Range'), lf.range.toFixed(1) + ' m', vsLabel),
                  tile('h', __alloT('stem.physics.label_max_height_ground', 'Max height above ground'), lf.maxH.toFixed(1) + ' m', idealH != null ? __alloT('stem.physics.lf_formula_says', 'formula: ') + idealH.toFixed(1) + ' m' : null),
                  tile('t', __alloT('stem.physics.label_flight_time', 'Flight Time'), lf.time.toFixed(2) + ' s', idealT != null ? __alloT('stem.physics.lf_formula_says', 'formula: ') + idealT.toFixed(2) + ' s' : null),
                  lf.drag && lossR != null
                    ? tile('d', __alloT('stem.physics.lf_drag_cost', 'Drag cost'), lossR.toFixed(1) + ' m', lossPct != null ? lossPct.toFixed(0) + '% ' + __alloT('stem.physics.lf_of_range', 'of the range') : null, 'bg-orange-50 border-orange-300')
                    : tile('d', __alloT('stem.physics.lf_vs_formula', 'vs formula'), lossR != null ? (lossR >= 0 ? '−' : '+') + Math.abs(lossR).toFixed(1) + ' m' : '—', __alloT('stem.physics.lf_no_drag_note', 'no drag: should match'))
                )
              );
            })(),

            // ── Guided investigation notebook ──
            // Draft selections refer to recent run IDs. Saved reports copy the
            // complete observations, so clearing the live log preserves evidence.
            (function() {
              var h = React.createElement;
              var P = window.StemLab._physics;
              var log = Array.isArray(d.runLog) ? d.runLog : [];
              var draft = P.normalizeInvestigationDraft(d.investigationDraft, log);
              var saved = P.normalizeInvestigations(d.investigations);
              var palette = isContrast
                ? { surface: '#000000', panel: '#000000', ink: '#ffffff', accent: '#ffff00', border: '#ffffff' }
                : isDark
                  ? { surface: '#142438', panel: '#1a3046', ink: '#eef5fb', accent: '#8bdcf0', border: '#526e87' }
                  : { surface: '#ffffff', panel: '#f3f7fa', ink: '#172c40', accent: '#086d89', border: '#c4d2de' };
              var fieldStyle = { width: '100%', minWidth: 0, background: palette.surface, color: palette.ink, border: '1px solid ' + (isContrast ? '#ffffff' : (isDark ? '#7895ad' : '#788d9e')), borderRadius: 9, padding: '10px 12px', fontSize: 14 };
              var actionStyle = { minHeight: 44, padding: '9px 13px', borderRadius: 9, border: '1px solid ' + palette.border, background: palette.surface, color: palette.accent, fontSize: 13, fontWeight: 700 };
              var cardStyle = { background: palette.panel, color: palette.ink, border: '1px solid ' + palette.border, borderRadius: 12, padding: 15, minWidth: 0 };
              var activeMode = !!(d.targetMode || d.challengeActive || d.battleMode);
              var activities = [
                { id: 'speed_squared', title: __alloT('stem.physics.investigation_speed_title', 'Does doubling speed quadruple range?'),
                  question: __alloT('stem.physics.investigation_speed_question', 'How does doubling launch speed change range when air drag is off?'),
                  changed: __alloT('stem.physics.investigation_speed_changed', 'Change speed: 15 → 30 m/s.'),
                  held: __alloT('stem.physics.investigation_speed_ground_held', 'Hold angle at 45°, gravity at 9.8 m/s², mass at 1 kg, launch height at ground level (0 m), and air drag off.'),
                  trials: [{ angle: 45, velocity: 15, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false }, { angle: 45, velocity: 30, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false }],
                  labels: ['15 m/s', '30 m/s'] },
                { id: 'inverse_gravity', title: __alloT('stem.physics.investigation_gravity_title', 'What happens when gravity is halved?'),
                  question: __alloT('stem.physics.investigation_gravity_question', 'How does halving gravity change range when air drag is off?'),
                  changed: __alloT('stem.physics.investigation_gravity_changed', 'Change gravity: 9.8 → 4.9 m/s².'),
                  held: __alloT('stem.physics.investigation_gravity_ground_held', 'Hold angle at 45°, speed at 25 m/s, mass at 1 kg, launch height at ground level (0 m), and air drag off.'),
                  trials: [{ angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false }, { angle: 45, velocity: 25, gravity: 4.9, mass: 1, launchHeight: 0, airResist: false }],
                  labels: ['9.8 m/s²', '4.9 m/s²'] },
                { id: 'mass_drag', title: __alloT('stem.physics.investigation_mass_title', 'Does mass change range through air?'),
                  question: __alloT('stem.physics.investigation_mass_question', 'How does mass change range when the drag coefficient and launch conditions stay the same?'),
                  changed: __alloT('stem.physics.investigation_mass_changed', 'Change mass: 1 → 5 kg.'),
                  held: __alloT('stem.physics.investigation_mass_ground_held', 'Hold angle at 45°, speed at 25 m/s, gravity at 9.8 m/s², launch height at ground level (0 m), and air drag on with the same drag coefficient.'),
                  trials: [{ angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: true }, { angle: 45, velocity: 25, gravity: 9.8, mass: 5, launchHeight: 0, airResist: true }],
                  labels: ['1 kg', '5 kg'] },
                { id: 'horizontal_motion', title: __alloT('stem.physics.investigation_horizontal_title', 'Does horizontal speed change falling time?'),
                  question: __alloT('stem.physics.investigation_horizontal_question', 'From the same height, does doubling horizontal launch speed change the time to reach the ground?'),
                  changed: __alloT('stem.physics.investigation_horizontal_changed', 'Change horizontal launch speed: 15 → 30 m/s. Compare both range and flight time.'),
                  held: __alloT('stem.physics.investigation_horizontal_held', 'Hold launch height at 10 m, angle at 0° (horizontal), gravity at 9.8 m/s², mass at 1 kg, and air drag off.'),
                  trials: [{ angle: 0, velocity: 15, gravity: 9.8, mass: 1, launchHeight: 10, airResist: false }, { angle: 0, velocity: 30, gravity: 9.8, mass: 1, launchHeight: 10, airResist: false }],
                  labels: ['15 m/s', '30 m/s'] }
              ];
              var activity = activities.find(function(a) { return a.id === draft.activityId; }) || null;
              var selectedRuns = draft.selectedRunIds.map(function(id) { return log.find(function(r) { return r.n === id; }); }).filter(Boolean);
              var comparison = selectedRuns.length >= 2 ? P.compareRuns(selectedRuns[0], selectedRuns[1]) : null;
              var selectedSaved = saved.find(function(item) { return String(item.id) === String(d.selectedInvestigationId); }) || null;
              var selectedReport = selectedSaved ? P.formatInvestigationReport(selectedSaved, __alloT) : '';
              function updateDraft(patch) {
                setLabToolData(function(prev) {
                  var current = prev.physics || {};
                  // Recover legacy run IDs exactly as the visible run picker does.
                  var currentState = physNormalizeState(current);
                  var currentDraft = currentState.investigationDraft;
                  var next = Object.assign({}, currentDraft, typeof patch === 'function' ? patch(currentDraft) : patch);
                  return Object.assign({}, prev, { physics: Object.assign({}, current, { investigationDraft: next }) });
                });
              }
              function applyTrial(index) {
                if (!activity || activeMode) return;
                var cv = document.getElementById('physicsCanvas');
                if (cv && cv._cancelFlight) cv._cancelFlight();
                setLabToolData(function(prev) {
                  var current = prev.physics || {};
                  if (current.targetMode || current.challengeActive || current.battleMode) return prev;
                  return Object.assign({}, prev, { physics: Object.assign({}, current, activity.trials[index], {
                    showGraphs: true, showOverlay: true, investigationOpen: true,
                    investigationNotice: __alloT('stem.physics.investigation_trial_ready', 'Trial settings applied. Use Launch to collect a measured flight.')
                  }) });
                });
                if (cv && cv.focus) cv.focus();
              }
              function saveInvestigation() {
                var id = 'investigation-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
                var createdAt = new Date().toISOString();
                setLabToolData(function(prev) {
                  var current = prev.physics || {};
                  var currentState = physNormalizeState(current);
                  var archives = currentState.investigations;
                  var currentDraft = currentState.investigationDraft;
                  var record = currentDraft.title.trim() ? P.createInvestigation(currentDraft, currentState.runLog, id, createdAt) : null;
                  var notice = archives.length >= 12
                    ? __alloT('stem.physics.investigation_limit', 'All 12 saved slots are in use. Delete a saved investigation to make room.')
                    : !record
                      ? __alloT('stem.physics.investigation_save_requirements', 'Add a title and select at least two completed runs before saving.')
                      : __alloT('stem.physics.investigation_saved', 'Investigation saved with copies of the selected measurements.');
                  return Object.assign({}, prev, { physics: Object.assign({}, current, {
                    investigations: record && archives.length < 12 ? archives.concat([record]) : archives,
                    selectedInvestigationId: record && archives.length < 12 ? record.id : current.selectedInvestigationId,
                    investigationNotice: notice
                  }) });
                });
              }
              function draftField(key, label, maxLength, rows) {
                var id = 'physics-investigation-' + key;
                return h('div', { key: key, style: { minWidth: 0 } },
                  h('label', { htmlFor: id, style: { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 } }, label),
                  h('textarea', { id: id, rows: rows, maxLength: maxLength, value: draft[key], style: fieldStyle, onChange: function(e) { var patch = {}; patch[key] = e.target.value.slice(0, maxLength); updateDraft(patch); } })
                );
              }
              var runLabel = __alloT('stem.physics.investigation_run', 'Run');
              var changesLabel = { angle: __alloT('stem.physics.var_angle', 'angle'), vel: __alloT('stem.physics.var_velocity', 'velocity'), grav: __alloT('stem.physics.var_gravity', 'gravity'), drag: __alloT('stem.physics.var_drag', 'air drag'), mass: __alloT('stem.physics.var_mass', 'mass'), launchHeight: __alloT('stem.physics.var_launch_height', 'launch height') };
              return h('details', { 'data-physics-investigations': true, open: !!d.investigationOpen, onToggle: function(e) { if (e.currentTarget.open !== !!d.investigationOpen) upd('investigationOpen', e.currentTarget.open); }, style: { background: palette.surface, color: palette.ink, border: '1px solid ' + palette.border, borderRadius: 12, marginBottom: 12, padding: 12 } },
                h('summary', { style: { cursor: 'pointer', minHeight: 32, fontSize: 15, fontWeight: 800, color: palette.accent } }, __alloT('stem.physics.investigation_heading', 'Guided investigations')),
                h('div', { style: { display: 'grid', gap: 14, paddingTop: 8, minWidth: 0 } },
                  h('p', { style: { fontSize: 13, lineHeight: 1.5 } }, __alloT('stem.physics.investigation_intro', 'Choose an activity or write your own question. Predict first, apply each trial and launch it, then select completed runs and explain the measured evidence. Save a report to keep your measurements and notes together.')),
                  h('div', { style: cardStyle },
                    h('label', { htmlFor: 'physics-investigation-activity', style: { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 } }, __alloT('stem.physics.investigation_activity', 'Teacher activity')),
                    h('select', { id: 'physics-investigation-activity', 'data-physics-investigation-activity': true, value: activity ? activity.id : '', style: Object.assign({}, fieldStyle, { minHeight: 44 }), onChange: function(e) {
                      var chosen = activities.find(function(a) { return a.id === e.target.value; });
                      updateDraft(function(current) { return chosen ? { activityId: chosen.id, title: current.title || chosen.title, question: chosen.question } : { activityId: '' }; });
                    } },
                      h('option', { value: '' }, __alloT('stem.physics.investigation_custom', 'My own investigation')),
                      activities.map(function(a) { return h('option', { key: a.id, value: a.id }, a.title); })
                    ),
                    activity && h('div', { style: { marginTop: 10, display: 'grid', gap: 8, fontSize: 13 } },
                      h('p', null, activity.changed), h('p', null, activity.held),
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, activity.trials.map(function(trial, index) {
                        return h('button', { key: index, type: 'button', 'data-physics-investigation-trial': String(index + 1), disabled: activeMode, style: Object.assign({}, actionStyle, { opacity: activeMode ? 0.6 : 1 }), onClick: function() { applyTrial(index); } },
                          __alloT('stem.physics.investigation_apply_trial', 'Apply trial') + ' ' + (index + 1) + ': ' + activity.labels[index]);
                      })),
                      activeMode && h('p', null, __alloT('stem.physics.investigation_mode_locked', 'Finish or leave the active mission, challenge, or battle before applying investigation settings.'))
                    )
                  ),
                  draftField('title', __alloT('stem.physics.investigation_title', 'Investigation title'), 160, 1),
                  draftField('question', __alloT('stem.physics.investigation_question', 'Investigation question'), 800, 2),
                  draftField('prediction', __alloT('stem.physics.investigation_prediction', 'Prediction — what do you expect and why?'), 2000, 2),
                  h('fieldset', { style: cardStyle },
                    h('legend', { style: { fontSize: 13, fontWeight: 700 } }, __alloT('stem.physics.investigation_select_runs', 'Select at least two completed runs')),
                    h('p', { style: { fontSize: 12, marginBottom: 8 } }, __alloT('stem.physics.investigation_selection_help', 'The first two selected runs form the comparison below. Every selected run is copied into the saved report.')),
                    log.length === 0 && h('p', { style: { fontSize: 13 } }, __alloT('stem.physics.investigation_no_runs', 'Launch a projectile to collect your first observation.')),
                    h('div', { style: { display: 'grid', gap: 8 } }, log.map(function(run) {
                      var detailId = 'physics-investigation-run-' + run.n;
                      return h('label', { key: run.n, style: { display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 44, fontSize: 13, lineHeight: 1.5, cursor: 'pointer' } },
                        h('input', { type: 'checkbox', checked: draft.selectedRunIds.indexOf(run.n) >= 0, 'aria-label': runLabel + ' ' + run.n, 'aria-describedby': detailId, style: { width: 18, height: 18, marginTop: 3, flexShrink: 0 }, onChange: function(e) {
                          var checked = e.target.checked;
                          updateDraft(function(current) { return { selectedRunIds: checked ? current.selectedRunIds.concat([run.n]).filter(function(id, i, ids) { return ids.indexOf(id) === i; }) : current.selectedRunIds.filter(function(id) { return id !== run.n; }) }; });
                        } }),
                        h('span', { id: detailId }, runLabel + ' ' + run.n + ': ' + run.angle + '°, ' + run.vel + ' m/s, g=' + run.grav + ' m/s², h₀=' + (run.launchHeight || 0) + ' m, ' + run.mass + ' kg, ' + __alloT('stem.physics.var_drag', 'air drag') + ' ' + (run.drag ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF')) + ' → ' + run.range.toFixed(2) + ' m')
                      );
                    }))
                  ),
                  comparison && h('section', { 'data-physics-investigation-comparison': true, 'aria-label': __alloT('stem.physics.investigation_comparison', 'Selected run comparison'), style: cardStyle },
                    h('h4', { style: { fontSize: 14, fontWeight: 800, marginBottom: 8 } }, runLabel + ' ' + comparison.fromRunId + ' → ' + runLabel + ' ' + comparison.toRunId),
                    comparison.modelWarning && h('p', { 'data-physics-investigation-model-warning': true, style: { fontSize: 13, fontWeight: 700, marginBottom: 8 } }, __alloT('stem.physics.investigation_model_warning', 'Recorded model versions are missing or different. Measured differences may reflect the simulation model as well as changed launch settings.')),
                    h('p', { style: { fontSize: 13, marginBottom: 8 } }, comparison.changes.length === 0
                      ? comparison.modelWarning
                        ? __alloT('stem.physics.investigation_matching_settings', 'The recorded launch settings match.')
                        : __alloT('stem.physics.investigation_repeat', 'Repeated trial: the launch settings match.')
                      : comparison.changes.length === 1
                        ? __alloT('stem.physics.investigation_one_change', 'One launch setting changed:') + ' ' + changesLabel[comparison.changes[0].key]
                        : __alloT('stem.physics.investigation_many_changes', 'Multiple launch settings changed; this comparison cannot isolate one cause:') + ' ' + comparison.changes.map(function(change) { return changesLabel[change.key]; }).join(', ')),
                    h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
                      h('caption', { style: { textAlign: 'left', marginBottom: 4 } }, __alloT('stem.physics.investigation_measured_changes', 'Measured changes between selected runs')),
                      h('thead', null, h('tr', null, [__alloT('stem.physics.investigation_measure', 'Measure'), runLabel + ' ' + comparison.fromRunId, runLabel + ' ' + comparison.toRunId, __alloT('stem.physics.investigation_difference', 'Difference')].map(function(label, i) { return h('th', { key: i, scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + palette.border } }, label); }))),
                      h('tbody', null, [{ key: 'range', label: __alloT('stem.physics.label_range', 'Range') }, { key: 'maxH', label: __alloT('stem.physics.label_max_height_ground', 'Max height above ground') }, { key: 'time', label: __alloT('stem.physics.label_flight_time', 'Flight Time') }].map(function(row) {
                        var measure = comparison.measurements[row.key];
                        return h('tr', { key: row.key },
                          h('th', { scope: 'row', style: { textAlign: 'left', padding: 6 } }, row.label),
                          h('td', { style: { padding: 6 } }, measure.before.toFixed(2) + ' ' + measure.unit),
                          h('td', { style: { padding: 6 } }, measure.after.toFixed(2) + ' ' + measure.unit),
                          h('td', { style: { padding: 6 } }, measure.delta == null ? '—' : (measure.delta > 0 ? '+' : '') + measure.delta.toFixed(2) + ' ' + measure.unit + (measure.percentChange == null ? '' : ' (' + (measure.percentChange > 0 ? '+' : '') + measure.percentChange.toFixed(1) + '%)'))
                        );
                      }))
                    )),
                    h('p', { style: { fontSize: 12, lineHeight: 1.5, marginTop: 8 } }, selectedRuns[0].drag !== selectedRuns[1].drag
                      ? __alloT('stem.physics.investigation_mixed_models', 'These runs use different air-drag models. Include that model change when explaining the difference.')
                      : selectedRuns[0].drag
                        ? __alloT('stem.physics.investigation_drag_assumption', 'Both runs include quadratic air drag. Drag depends on total speed and the same drag coefficient; changing mass changes acceleration from drag.')
                        : selectedRuns[0].launchHeight > 0 || selectedRuns[1].launchHeight > 0
                          ? __alloT('stem.physics.investigation_elevated_assumption', 'These no-drag runs include an elevated launch. Falling time depends on launch height and initial vertical velocity. With a horizontal launch from a fixed height, changing horizontal speed changes range but not flight time. The ground-level speed-squared range rule does not apply.')
                          : __alloT('stem.physics.investigation_vacuum_assumption', 'Both runs assume no air drag and equal launch and landing heights. In this model, range scales with speed squared and inversely with gravity; mass does not change the trajectory.'))
                  ),
                  draftField('observation', __alloT('stem.physics.investigation_observation', 'Observation — what did you measure?'), 2000, 2),
                  draftField('claim', __alloT('stem.physics.investigation_claim', 'Claim — how does the evidence support your explanation?'), 2000, 3),
                  h('button', { type: 'button', 'data-physics-investigation-save': true, disabled: selectedRuns.length < 2 || !draft.title.trim() || saved.length >= 12, style: actionStyle, onClick: saveInvestigation }, __alloT('stem.physics.investigation_save', 'Save investigation')),
                  h('p', { style: { fontSize: 12 } }, saved.length >= 12
                    ? __alloT('stem.physics.investigation_limit', 'All 12 saved slots are in use. Delete a saved investigation to make room.')
                    : __alloT('stem.physics.investigation_storage', 'Saved investigations keep copied measurements after the recent log is cleared. Up to 12 reports are stored with this simulator session.') + ' (' + saved.length + '/12)'),
                  typeof d.investigationNotice === 'string' && d.investigationNotice && h('p', { role: 'status', 'aria-live': 'polite', style: { fontSize: 13 } }, d.investigationNotice),
                  saved.length > 0 && h('section', { style: cardStyle, 'aria-label': __alloT('stem.physics.investigation_saved_reports', 'Saved investigations') },
                    h('label', { htmlFor: 'physics-investigation-select', style: { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 } }, __alloT('stem.physics.investigation_reopen', 'Open a saved investigation')),
                    h('select', { id: 'physics-investigation-select', 'data-physics-investigation-select': true, value: selectedSaved ? String(selectedSaved.id) : '', style: Object.assign({}, fieldStyle, { minHeight: 44 }), onChange: function(e) { upd('selectedInvestigationId', e.target.value); } },
                      h('option', { value: '' }, __alloT('stem.physics.investigation_choose_saved', 'Choose a saved report')),
                      saved.map(function(item) { return h('option', { key: item.id, value: String(item.id) }, item.title + ' — ' + item.runs.map(function(run) { return runLabel + ' ' + run.n; }).join(', ')); })
                    ),
                    selectedSaved && h('div', { style: { display: 'grid', gap: 10, marginTop: 10 } },
                      h('pre', { 'data-physics-investigation-report': true, tabIndex: 0, 'aria-label': __alloT('stem.physics.investigation_report', 'Saved investigation report'), style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, margin: 0 } }, selectedReport),
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                        h('button', { type: 'button', 'data-physics-investigation-copy': true, style: actionStyle, onClick: function() {
                          physCopyText(selectedReport).then(function(ok) { upd('investigationNotice', ok ? __alloT('stem.physics.investigation_copied', 'Investigation report copied as plain text.') : __alloT('stem.physics.investigation_copy_failed', 'Automatic copying was unavailable. Select the saved report text and copy it.')); });
                        } }, __alloT('stem.physics.investigation_copy', 'Copy report as text')),
                        h('button', { type: 'button', 'data-physics-investigation-delete': true, style: actionStyle, onClick: function() {
                          var selectedId = selectedSaved.id;
                          setLabToolData(function(prev) {
                            var current = prev.physics || {};
                            return Object.assign({}, prev, { physics: Object.assign({}, current, {
                              investigations: P.normalizeInvestigations(current.investigations).filter(function(item) { return String(item.id) !== String(selectedId); }),
                              selectedInvestigationId: '', investigationNotice: __alloT('stem.physics.investigation_deleted', 'Selected saved investigation deleted.')
                            }) });
                          });
                        } }, __alloT('stem.physics.investigation_delete', 'Delete selected saved investigation'))
                      )
                    )
                  )
                )
              );
            })(),

            // ── Experiment log: every launch, and whether it was a fair test ──
            // The tool keeps telling students to "change only one variable".
            // This is where that instruction becomes checkable: each row names
            // what changed since the run above it and says outright when a
            // comparison confounds two changes at once.
            (Array.isArray(d.runLog) ? d.runLog : []).length > 0 && (function () {
              var log = d.runLog;
              var oneVarRuns = 0;
              log.forEach(function (r, i) { var comparison = i > 0 ? physCompareRuns(log[i - 1], r) : null; if (comparison && comparison.fairTest) oneVarRuns++; });
              return React.createElement("section", { className: "mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 overflow-x-auto", "data-physics-run-log": "true" },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2 flex-wrap" },
                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-indigo-800 uppercase tracking-wider" },
                    "🧪 " + __alloT('stem.physics.runlog_title', 'Experiment log') + " (" + log.length + ")"),
                  React.createElement("div", { className: "flex gap-1.5" },
                    React.createElement("button", {
                      type: "button",
                      "aria-label": __alloT('stem.physics.aria_copy_runlog', 'Copy the experiment log as CSV for a spreadsheet'),
                      onClick: function () {
                        var csv = physRunLogCsv();
                        if (!csv) return;
                        physCopyText(csv).then(function (ok) {
                          var msg = ok ? __alloT('stem.physics.toast_runlog_copied', 'Experiment log copied as CSV.') : __alloT('stem.physics.toast_csv_failed', 'Could not copy automatically. Select the table and copy it by hand.');
                          if (addToast) addToast((ok ? '📋 ' : '⚠️ ') + msg, ok ? 'success' : 'warning');
                          if (typeof announceToSR === 'function') announceToSR(msg);
                        });
                      },
                      className: "px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-white text-indigo-800 border border-indigo-300 hover:bg-indigo-100"
                    }, "📋 " + __alloT('stem.physics.copy_csv', 'Copy CSV')),
                    React.createElement("button", {
                      type: "button",
                      "aria-label": __alloT('stem.physics.aria_clear_runlog', 'Clear the experiment log'),
                      onClick: function () { upd('runLog', []); },
                      className: "px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                    }, "🧹 " + __alloT('stem.physics.runlog_clear', 'Clear log'))
                  )
                ),
                React.createElement("table", { className: "w-full text-[0.6875rem]" },
                  React.createElement("caption", { className: "sr-only" }, __alloT('stem.physics.runlog_caption', 'Experiment log: launch settings, measured range, and which variable changed between runs')),
                  React.createElement("thead", null,
                    React.createElement("tr", { className: "border-b-2 border-indigo-300 text-indigo-900" },
                      [
                        __alloT('stem.physics.runlog_col_run', '#'),
                        __alloT('stem.physics.slider_angle', 'Angle (°)'),
                        __alloT('stem.physics.slider_velocity', 'Velocity (m/s)'),
                        __alloT('stem.physics.slider_gravity', 'Gravity (m/s²)'),
                        __alloT('stem.physics.var_drag', 'air drag'),
                        __alloT('stem.physics.slider_mass', 'Mass (kg)'),
                        __alloT('stem.physics.runlog_col_launch_height', 'Launch height (m)'),
                        __alloT('stem.physics.runlog_col_measured', 'Measured range'),
                        __alloT('stem.physics.runlog_col_changed', 'Changed since previous')
                      ].map(function (c, i) {
                        return React.createElement("th", { key: 'rh' + i, scope: "col", className: "px-2 py-1 text-left font-bold" }, c);
                      })
                    )
                  ),
                  React.createElement("tbody", null, log.map(function (r, i) {
                    var changes = physRunChanges(i > 0 ? log[i - 1] : null, r);
                    var comparison = i > 0 ? physCompareRuns(log[i - 1], r) : null;
                    var verdict;
                    if (changes == null) verdict = { text: __alloT('stem.physics.runlog_first', 'first run — the baseline'), cls: 'text-slate-600' };
                    else if (!comparison || comparison.modelWarning) verdict = { text: '⚠️ ' + __alloT('stem.physics.runlog_model_warning', 'Model versions are different or unverified. Differences may reflect the numerical model, so this is not a controlled comparison.'), cls: 'text-amber-900 font-bold' };
                    else if (changes.length === 0) verdict = { text: '🔁 ' + __alloT('stem.physics.runlog_repeat', 'nothing changed — a repeat trial'), cls: 'text-slate-700' };
                    else if (changes.length === 1) verdict = { text: '✅ ' + changes[0].label + ' — ' + __alloT('stem.physics.runlog_fair', 'a fair test'), cls: 'text-emerald-800 font-bold' };
                    else verdict = { text: '⚠️ ' + changes.map(function (c) { return c.label; }).join(', ') + ' — ' + __alloT('stem.physics.runlog_confounded', 'more than one change, so the result cannot be pinned on any single variable'), cls: 'text-amber-900 font-bold' };
                    // On a fair test of a multiplicative variable, say what the
                    // two runs together imply about the relationship.
                    var law = (changes && changes.length === 1) ? physRunExponent(log[i - 1], r, changes[0].k) : null;
                    // Same hue the Compare overlay paints this run's trail with,
                    // so the table and the canvas identify each other. The run
                    // NUMBER is the actual link; colour is a secondary cue only,
                    // and the swatch is aria-hidden so it is not read aloud.
                    var rowHue = Math.round(240 * (1 - Math.max(0, Math.min(90, r.angle)) / 90));
                    return React.createElement("tr", { key: 'rr' + i, className: "border-b border-indigo-100" },
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" },
                        React.createElement("span", { "aria-hidden": "true", style: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, marginRight: 5, background: 'hsl(' + rowHue + ', 80%, 45%)' } }),
                        r.n != null ? r.n : i + 1
                      ),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.angle),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.vel),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.grav),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.drag ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF')),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.mass),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, r.launchHeight),
                      React.createElement("td", { className: "px-2 py-0.5 font-mono font-bold text-indigo-900" }, r.range.toFixed(1) + ' m'),
                      React.createElement("td", { className: "px-2 py-0.5 " + verdict.cls },
                        verdict.text,
                        law && React.createElement("div", { className: "mt-0.5 font-normal text-indigo-900" },
                          "📐 " + __alloT('stem.physics.runlog_law_prefix', 'You changed ') + (law.varPct > 0 ? '+' : '') + law.varPct.toFixed(0) + '% ' +
                          __alloT('stem.physics.runlog_law_and_range', 'and the range moved ') + (law.rangePct > 0 ? '+' : '') + law.rangePct.toFixed(0) + '% — ' +
                          __alloT('stem.physics.runlog_law_scales', 'range scales as ') +
                          (law.key === 'vel' ? __alloT('stem.physics.var_velocity', 'velocity') : __alloT('stem.physics.var_gravity', 'gravity')) +
                          physExponentLabel(law.exponent)
                        )
                      )
                    );
                  }))
                ),
                log.length > 1 && React.createElement("p", { className: "mt-2 text-[0.625rem] text-indigo-900" },
                  oneVarRuns > 0
                    ? '🔬 ' + oneVarRuns + ' ' + __alloT('stem.physics.runlog_comparable_count', 'comparisons changed one launch setting using the same recorded numerical model.')
                    : '🔬 ' + __alloT('stem.physics.runlog_none_comparable', 'No comparable single-setting trial yet. Use the current model and change one launch setting between runs.')
                )
              );
            })(),

            d.showFormulas && (function() {
              var ang = parseFloat((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45);
              var vel = parseFloat(d.velocity || 25);
              var grav = parseFloat((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8);
              var rad = ang * Math.PI / 180;
              var sinT = Math.sin(rad);
              var height = d.launchHeight || 0;
              var vx0 = vel * Math.cos(rad), vy0 = vel * sinT;
              var ideal = window.StemLab._physics.vacuum(ang, vel, grav, height);
              if (ideal.status !== 'landed') return null;
              var range = ideal.range, maxH = ideal.maxH, flightT = ideal.time;
              var formulaColors = isContrast
                ? { surface: '#000000', row: '#000000', border: '#ffff00', ink: '#ffffff', muted: '#ffffff', accent: '#ffff00', time: '#ffff00', range: '#ffff00', height: '#ffff00', warning: '#ffff00' }
                : (isDark
                  ? { surface: '#0f172a', row: '#1e293b', border: '#64748b', ink: '#e2e8f0', muted: '#cbd5e1', accent: '#f0abfc', time: '#6ee7b7', range: '#93c5fd', height: '#d8b4fe', warning: '#fdba74' }
                  : { surface: '#fdf4ff', row: '#ffffff', border: '#e9d5ff', ink: '#334155', muted: '#475569', accent: '#86198f', time: '#047857', range: '#1d4ed8', height: '#7e22ce', warning: '#9a3412' });
              var Row = function(label, color, sym, sub, calc, numeric, unit) {
                return React.createElement("div", { className: "rounded-lg p-2.5 border mb-1.5", style: { overflowWrap: 'anywhere', backgroundColor: formulaColors.row, color: formulaColors.ink, borderColor: formulaColors.border } },
                  React.createElement("div", { className: "flex items-baseline gap-2 mb-1" },
                    React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: color } }, label),
                    React.createElement("span", { className: "font-mono text-[0.75rem]", style: { color: formulaColors.ink } }, sym)
                  ),
                  React.createElement("div", { className: "font-mono text-[0.6875rem] ml-3", style: { color: formulaColors.muted } }, "= " + sub),
                  calc && React.createElement("div", { className: "font-mono text-[0.6875rem] ml-3", style: { color: formulaColors.muted } }, "= " + calc),
                  React.createElement("div", { className: "font-mono text-[0.75rem] font-bold ml-3", style: { color: formulaColors.accent } }, "= " + numeric.toFixed(2) + " " + unit)
                );
              };
              return React.createElement("div", { 'data-physics-formulas': true, className: "rounded-xl border p-3 mb-3 animate-in fade-in duration-200", style: { backgroundColor: formulaColors.surface, color: formulaColors.ink, borderColor: formulaColors.border }, role: "region", "aria-label": __alloT('stem.physics.aria_show_work_panel', 'Show your work formulas panel') },
                React.createElement("p", { className: "text-[0.6875rem] font-bold uppercase tracking-wider mb-2", style: { color: formulaColors.accent } }, "\uD83D\uDCDD " + __alloT('stem.physics.show_your_work_title', 'Show Your Work (no-drag ideal)')),
                React.createElement('p', { className: 'text-xs mb-2', style: { color: formulaColors.ink } }, __alloT('stem.physics.formula_height_definitions', 'h₀ is launch height above ground; landing is y = 0. Initial horizontal velocity is vx₀ = v cos(θ), and initial vertical velocity is vy₀ = v sin(θ).')),
                Row(
                  __alloT('stem.physics.row_flight_time', 'Flight Time:'),
                  formulaColors.time,
                  'T = (vy₀ + √(vy₀² + 2gh₀)) / g',
                  '(' + vy0.toFixed(2) + ' + √(' + vy0.toFixed(2) + '² + 2 × ' + grav + ' × ' + height + ')) / ' + grav,
                  null, flightT, 's'
                ),
                Row(
                  __alloT('stem.physics.row_range', 'Range:'),
                  formulaColors.range,
                  'R = vx₀ × T',
                  vx0.toFixed(2) + ' × ' + flightT.toFixed(3),
                  null,
                  range, "m"
                ),
                Row(
                  __alloT('stem.physics.row_max_height_ground', 'Max height above ground:'),
                  formulaColors.height,
                  'H = h₀ + vy₀² / (2g)',
                  height + ' + ' + vy0.toFixed(2) + '² / (2 × ' + grav + ')',
                  null,
                  maxH, "m"
                ),
                d.airResist && React.createElement("p", { className: "text-[0.625rem] italic mt-1", style: { color: formulaColors.warning } },
                  "\u26A0\uFE0F " + __alloT('stem.physics.air_drag_height_warning', 'Air drag is ON. These formulas show the ideal path without drag; use measured flight results for the drag model.')
                )
              );
            })(),

            // ── Motion Component Graphs (Vx-vs-t, Vy-vs-t) ──
            // Explain the recorded model, even after launch controls change.
            d.showGraphs && (function() {
              // The charts own their surfaces because SVG paint does not inherit
              // the host theme. Grid lines remain distinct in high contrast.
              var graphColors = isContrast
                ? { panel: '#000000', surface: '#000000', ink: '#ffff00', muted: '#ffffff', border: '#ffffff', axis: '#ffffff', grid: '#ffffff', vx: '#ffff00', vy: '#ffffff', range: '#ffff00', marker: '#ffffff' }
                : isDark
                  ? { panel: '#101f32', surface: '#0b1627', ink: '#e8f1fc', muted: '#b6c8dc', border: '#38516b', axis: '#94a3b8', grid: '#73859d', vx: '#67b8ff', vy: '#cfb4ff', range: '#fbbf24', marker: '#67e8f9' }
                  : { panel: '#eef5fb', surface: '#ffffff', ink: '#1d344d', muted: '#52677e', border: '#c8d8e8', axis: '#64748b', grid: '#8492a5', vx: '#1767b2', vy: '#793dbb', range: '#a95b05', marker: '#087687' };
              var graphPanelStyle = { padding: '14px 10px', marginBottom: 16, borderRadius: 18, border: '1px solid ' + graphColors.border, background: graphColors.panel, color: graphColors.ink };
              var graphCardStyle = { minWidth: 0, padding: '12px 8px', borderRadius: 14, border: '1px solid ' + graphColors.border, background: graphColors.surface };
              var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
              var trails = cv && cv._trails ? cv._trails : [];
              var lastTrail = trails.length > 0 ? trails[trails.length - 1] : null;
              var selectedPoint = physSelectedInspection(cv);
              if (!lastTrail || lastTrail.length === 0) {
                return React.createElement("section", { 'data-physics-motion-panel': true, style: graphPanelStyle },
                  React.createElement("h3", { style: { margin: '0 0 6px', fontSize: 16, fontWeight: 800 } }, __alloT('stem.physics.motion_components', 'Motion Components')),
                  React.createElement("p", { style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: graphColors.muted } }, __alloT('stem.physics.launch_to_see_vx_vy', 'Launch a projectile to see Vx-vs-t and Vy-vs-t.'))
                );
              }
              var pts = lastTrail;
              var graphHasDrag = !!lastTrail.drag;
              var vxDescription = graphHasDrag
                ? __alloT('stem.physics.graph_vx_drag', 'Horizontal velocity decreases because drag opposes motion.')
                : __alloT('stem.physics.graph_vx_vacuum', 'Without air drag, horizontal velocity stays constant because there is no horizontal force.');
              var vyDescription = graphHasDrag
                ? __alloT('stem.physics.graph_vy_drag', 'Vertical velocity curves over time. Drag and gravity determine its slope; Vy is zero at the apex.')
                : __alloT('stem.physics.graph_vy_vacuum', 'Without air drag, vertical velocity decreases in a straight line with slope −g and reaches zero at the apex.');
              var samples = [];
              var nSamples = Math.min(80, pts.length);
              for (var si = 0; si < nSamples; si++) {
                var pi = Math.floor((si / Math.max(1, nSamples - 1)) * (pts.length - 1));
                // Each point carries its own flight time, so slow-motion and
                // stepped flights plot on the same axis as real-time ones.
                samples.push({ t: pts[pi].t != null ? pts[pi].t : pi * PHYS_DT, vx: pts[pi].mVx || 0, vy: pts[pi].mVy || 0 });
              }
              var tMax = samples[samples.length - 1].t || 1;
              var graphCanInspect = !!physInspectSample(pts, 0);
              var graphIndex = selectedPoint ? selectedPoint.index : pts.length - 1;
              var graphTime = pts[graphIndex].t != null ? pts[graphIndex].t : graphIndex * PHYS_DT;
              function selectGraphTime(event) {
                if (!graphCanInspect) return;
                var bounds = event.currentTarget.getBoundingClientRect();
                if (!(bounds.width > 0) || !isFinite(event.clientX)) return;
                var ratio = Math.max(0, Math.min(1, ((event.clientX - bounds.left) * W / bounds.width - padL) / innerW));
                var wanted = ratio * tMax;
                // Find the nearest full-resolution observation, including the
                // shortened impact interval. The plotted curve is downsampled.
                var low = 0, high = pts.length - 1;
                while (low < high) {
                  var middle = Math.floor((low + high) / 2);
                  if (pts[middle].t < wanted) low = middle + 1;
                  else high = middle;
                }
                if (low > 0 && wanted - pts[low - 1].t <= pts[low].t - wanted) low--;
                physSelectSample(low);
              }
              var vxAbs = 0, vyMax = 0, vyMin = 0;
              samples.forEach(function (s) {
                if (Math.abs(s.vx) > vxAbs) vxAbs = Math.abs(s.vx);
                if (s.vy > vyMax) vyMax = s.vy;
                if (s.vy < vyMin) vyMin = s.vy;
              });
              var W = 260, H = 210, padL = 48, padR = 12, padT = 18, padB = 52;
              var innerW = W - padL - padR, innerH = H - padT - padB;
              var roundLimit = function(value) {
                var magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(value, 0.01))));
                var scaled = value / magnitude;
                var steps = [1, 2, 2.5, 5, 10];
                for (var step = 0; step < steps.length; step++) if (scaled <= steps[step]) return steps[step] * magnitude;
                return 10 * magnitude;
              };
              var tickNumber = function(value) {
                if (Math.abs(value) < 0.000001) return '0';
                return String(Number(value.toFixed(3)));
              };
              var vxLimit = roundLimit(Math.max(vxAbs * 1.12, 1));
              var vxYScale = innerH / vxLimit;
              var vxY0 = padT + innerH;
              var vxPath = samples.map(function (s, i) {
                var x = padL + (s.t / tMax) * innerW;
                var y = vxY0 - s.vx * vxYScale;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
              }).join(' ');
              var vyRange = roundLimit(Math.max(Math.abs(vyMin), Math.abs(vyMax), 1) * 1.12);
              var vyYScale = innerH / (vyRange * 2);
              var vyY0 = padT + innerH / 2;
              var vyPath = samples.map(function (s, i) {
                var x = padL + (s.t / tMax) * innerW;
                var y = vyY0 - s.vy * vyYScale;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
              }).join(' ');
              var axisLine = function (x1, y1, x2, y2, dashed) {
                return React.createElement('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: dashed ? graphColors.grid : graphColors.axis, strokeWidth: dashed ? 0.75 : 1.25, strokeDasharray: dashed ? '2 5' : undefined });
              };
              var lbl = function (x, y, text, anchor) {
                return React.createElement('text', { x: x, y: y, fontSize: 18, fill: graphColors.ink, textAnchor: anchor || 'middle', fontFamily: 'system-ui, sans-serif', style: { fontSize: 18, fontVariantNumeric: 'tabular-nums' } }, text);
              };
              var timeAxis = function() {
                return [0, 0.5, 1].map(function(fraction) {
                  var x = padL + fraction * innerW;
                  return React.createElement('g', { key: fraction },
                    fraction > 0 && axisLine(x, padT, x, padT + innerH, true),
                    lbl(x, H - 29, tickNumber(tMax * fraction), fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle')
                  );
                });
              };
              var endpoint = function(sample, field, zero, scale, color) {
                return React.createElement('circle', { cx: padL + sample.t / tMax * innerW, cy: zero - sample[field] * scale, r: 3.5, fill: color, stroke: graphColors.surface, strokeWidth: 1.5 });
              };
              var velocityCard = function(field, title, description, color, path, limit, zero, scale) {
                var first = samples[0], latest = samples[samples.length - 1];
                var ticks = field === 'vx' ? [0, limit / 2, limit] : [-limit, 0, limit];
                // The cursor uses the actual recorded sample, independently of
                // the lighter set of points used to draw the curve.
                var selectedValue = selectedPoint ? selectedPoint[field] : null;
                var selectedX = selectedPoint ? padL + selectedPoint.t / tMax * innerW : null;
                var selectedY = selectedPoint ? zero - selectedValue * scale : null;
                var selectionText = selectedPoint ? __alloT('stem.physics.graph_selected_sample', 'Selected sample') + ': t = ' + selectedPoint.t.toFixed(3) + ' s; ' + (field === 'vx' ? 'Vx' : 'Vy') + ' = ' + selectedValue.toFixed(2) + ' m/s.' : '';
                return React.createElement('div', { style: graphCardStyle },
                  React.createElement('h4', { style: { margin: '0 0 5px', fontSize: 14, lineHeight: 1.45, fontWeight: 750, color: color } }, title),
                  React.createElement('p', { style: { margin: '0 0 8px', fontSize: 21, lineHeight: 1.2, fontWeight: 750, fontVariantNumeric: 'tabular-nums', color: graphColors.ink } },
                    first[field].toFixed(1) + ' → ' + latest[field].toFixed(1),
                    React.createElement('span', { style: { fontSize: 13, fontWeight: 500, color: graphColors.muted } }, ' m/s')
                  ),
                  selectedPoint && React.createElement('p', {
                    'data-physics-graph-selected': field, 'data-sample-index': selectedPoint.index, 'data-time': selectedPoint.t, 'data-value': selectedValue,
                    style: { margin: '0 0 10px', padding: '8px 10px', borderLeft: '3px solid ' + graphColors.marker, borderRadius: 6, background: graphColors.panel, color: graphColors.ink, fontSize: 14, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }
                  }, selectionText),
                  React.createElement('svg', { 'data-physics-graph': field, onClick: graphCanInspect ? selectGraphTime : undefined, 'aria-describedby': graphCanInspect ? 'physics-graph-time-help' : undefined, style: { cursor: graphCanInspect ? 'crosshair' : 'default', display: 'block', background: graphColors.surface, borderRadius: 8, width: '100%', maxWidth: 320, height: 'auto', margin: '0 auto' }, viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': description + (selectionText ? ' ' + selectionText : '') },
                    timeAxis(),
                    ticks.map(function(value) { return React.createElement('g', { key: value },
                      axisLine(padL, zero - value * scale, W - padR, zero - value * scale, value !== 0),
                      lbl(padL - 8, zero - value * scale + 5, tickNumber(value), 'end')
                    ); }),
                    axisLine(padL, padT, padL, padT + innerH),
                    selectedPoint && React.createElement('line', {
                      'data-physics-graph-cursor': field, 'data-sample-index': selectedPoint.index, 'data-time': selectedPoint.t,
                      x1: selectedX, x2: selectedX, y1: padT, y2: padT + innerH,
                      stroke: graphColors.marker, strokeWidth: 1.5, strokeDasharray: '6 3'
                    }),
                    React.createElement('path', { d: path, stroke: color, strokeWidth: 2.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    endpoint(first, field, zero, scale, color),
                    endpoint(latest, field, zero, scale, color),
                    selectedPoint && React.createElement('circle', {
                      'data-physics-graph-marker': field, 'data-sample-index': selectedPoint.index, 'data-time': selectedPoint.t, 'data-value': selectedValue,
                      cx: selectedX, cy: selectedY, r: 6.5, fill: graphColors.marker, stroke: graphColors.ink, strokeWidth: 2
                    }),
                    lbl(padL + innerW / 2, H - 5, __alloT('stem.physics.axis_time_s', 'time (s)'))
                  ),
                  React.createElement('p', { style: { margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: graphColors.muted } }, description)
                );
              };
              return React.createElement("section", { 'data-physics-motion-panel': true, style: graphPanelStyle },
                React.createElement("h3", { style: { margin: '0 0 12px', fontSize: 16, lineHeight: 1.4, fontWeight: 800 } },
                  __alloT('stem.physics.motion_components_recent', 'Motion Components (most recent launch)')
                ),
                graphCanInspect && React.createElement('div', { 'data-physics-graph-time-control': true, style: { marginBottom: 12, padding: '12px 14px', background: graphColors.surface, border: '1px solid ' + graphColors.border, borderRadius: 12 } },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                    React.createElement('label', { htmlFor: 'physics-graph-time', style: { fontSize: 14, fontWeight: 700, color: graphColors.ink } }, __alloT('stem.physics.graph_recorded_time', 'Recorded time')),
                    React.createElement('span', { 'data-physics-graph-time-value': true, style: { color: graphColors.ink, fontSize: 16, fontWeight: 750, fontVariantNumeric: 'tabular-nums' } }, 't = ' + graphTime.toFixed(3) + ' s')),
                  React.createElement('input', { id: 'physics-graph-time', 'data-physics-graph-time-slider': true, type: 'range', min: 0, max: pts.length - 1, step: 1, value: graphIndex, disabled: pts.length < 2,
                    'aria-valuetext': 't = ' + graphTime.toFixed(3) + ' s; ' + __alloT('stem.physics.graph_sample', 'sample') + ' ' + (graphIndex + 1) + ' / ' + pts.length,
                    'aria-describedby': 'physics-graph-time-help', onChange: function(event) { physSelectSample(Number(event.target.value)); },
                    style: { display: 'block', width: '100%', minHeight: 44, margin: '6px 0', accentColor: graphColors.marker } }),
                  React.createElement('div', { style: { display: 'flex', gap: '8px 16px', alignItems: 'center', flexWrap: 'wrap' } },
                    React.createElement('button', { type: 'button', 'data-physics-graph-inspect': true, onClick: function() { physSelectSample(graphIndex); },
                      style: { minHeight: 44, padding: '9px 12px', border: '1px solid ' + graphColors.axis, background: graphColors.panel, color: graphColors.ink, borderRadius: 9, fontSize: 12, fontWeight: 700 } }, __alloT('stem.physics.graph_inspect_time', 'Inspect this time')),
                    React.createElement('p', { id: 'physics-graph-time-help', style: { flex: '1 1 240px', margin: 0, color: graphColors.muted, fontSize: 12, lineHeight: 1.6 } },
                      __alloT('stem.physics.graph_time_help', 'Tap a graph or move the time control to inspect the nearest recorded point. Selecting a point pauses playback.')))),
                React.createElement("div", { "data-physics-component-graphs": true, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 12 } },
                  velocityCard('vx', __alloT('stem.physics.graph_vx_title', 'Vx (m/s) — horizontal velocity'), vxDescription, graphColors.vx, vxPath, vxLimit, vxY0, vxYScale),
                  velocityCard('vy', __alloT('stem.physics.graph_vy_title', 'Vy (m/s) — vertical velocity'), vyDescription, graphColors.vy, vyPath, vyRange, vyY0, vyYScale)
                ),
                React.createElement("p", { style: { margin: '12px 0', fontSize: 14, lineHeight: 1.55, color: graphColors.muted } },
                  graphHasDrag
                    ? __alloT('stem.physics.graph_drag_model_note', 'This flight includes air drag. The drag force depends on total speed, coupling horizontal and vertical motion. Gravity stays constant; total acceleration changes.')
                    : __alloT('stem.physics.graph_vacuum_model_note', 'This flight has no air drag. Horizontal and vertical motion are independent; gravity changes only vertical velocity.')
                ),
                React.createElement('button', { type: 'button', onClick: function() { upd('showFlightData', true); }, style: { minHeight: 44, padding: '9px 14px', borderRadius: 10, border: '1px solid ' + graphColors.axis, color: graphColors.ink, background: graphColors.surface, fontSize: 14, fontWeight: 700 } }, __alloT('stem.physics.graph_open_data', 'Open the flight data table')),

                // ── Ideal range vs angle at the current launch height ──
                (function() {
                  var ang = parseFloat((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45);
                  var vel = parseFloat(d.velocity || 25);
                  var grav = parseFloat((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8);
                  var height = d.launchHeight || 0;
                  var vacuum = window.StemLab._physics.vacuum;
                  var ideal = vacuum(ang, vel, grav, height);
                  if (ideal.status !== 'landed') return null;
                  var optimumAngle = ideal.optimumAngle;
                  var maxR = vacuum(optimumAngle, vel, grav, height).range;
                  if (!isFinite(maxR) || maxR <= 0) return null;
                  var rW = 260, rH = 226, rPL = 48, rPR = 12, rPT = 34, rPB = 52;
                  var rIW = rW - rPL - rPR, rIH = rH - rPT - rPB;
                  var rangeLimit = roundLimit(maxR * 1.08);
                  // Build sweep curve every 2°
                  var pathPts = [];
                  for (var ra = 0; ra <= 90; ra += 2) {
                    var rVal = vacuum(ra, vel, grav, height).range;
                    var sx = rPL + (ra / 90) * rIW;
                    var sy = rPT + rIH - (rVal / rangeLimit) * rIH;
                    pathPts.push((pathPts.length === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1));
                  }
                  var rangePath = pathPts.join(' ');
                  // Current-angle marker
                  var curR = ideal.range;
                  var curSX = rPL + (ang / 90) * rIW;
                  var curSY = rPT + rIH - (curR / rangeLimit) * rIH;
                  // Elevated launchers have a no-drag optimum below 45°.
                  var optSX = rPL + (optimumAngle / 90) * rIW;
                  var optSY = rPT + rIH - (maxR / rangeLimit) * rIH;
                  var axisLine2 = function (x1, y1, x2, y2, color, dash) {
                    var p = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || graphColors.axis, strokeWidth: dash ? 0.85 : 1.25 };
                    if (dash) p.strokeDasharray = dash;
                    return React.createElement('line', p);
                  };
                  var lbl2 = function (x, y, text, anchor) {
                    return React.createElement('text', { x: x, y: y, fontSize: 18, fill: graphColors.ink, textAnchor: anchor || 'middle', fontFamily: 'system-ui, sans-serif', style: { fontSize: 18, fontVariantNumeric: 'tabular-nums' } }, text);
                  };
                  var angleReadout = function(label, angle, range, color) {
                    return React.createElement('div', { style: { minWidth: 0, padding: '8px 10px', borderLeft: '3px solid ' + color, background: graphColors.panel, borderRadius: 6 } },
                      React.createElement('p', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 650, color: graphColors.muted } }, label),
                      React.createElement('p', { style: { margin: 0, fontSize: 17, fontWeight: 750, lineHeight: 1.4, fontVariantNumeric: 'tabular-nums', color: graphColors.ink } }, angle.toFixed(1) + '° · ' + range.toFixed(1) + ' m')
                    );
                  };
                  return React.createElement("div", { 'data-physics-range-card': true, style: Object.assign({}, graphCardStyle, { marginTop: 14 }) },
                    React.createElement("h4", { style: { margin: '0 0 5px', fontSize: 16, fontWeight: 800, color: graphColors.ink } },
                      __alloT('stem.physics.graph_range_title', 'Range across launch angles')
                    ),
                    React.createElement('p', { style: { margin: '0 0 10px', fontSize: 14, lineHeight: 1.55, color: graphColors.muted } },
                      __alloT('stem.physics.graph_range_settings', 'Ideal prediction for current settings') + ': v=' + vel + ' m/s · g=' + grav + ' m/s² · h₀=' + height + ' m'
                    ),
                    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10, marginBottom: 10 } },
                      angleReadout(__alloT('stem.physics.graph_current_angle', 'Current angle'), ang, curR, graphColors.marker),
                      angleReadout(__alloT('stem.physics.graph_optimal_angle', 'Best angle without drag'), optimumAngle, maxR, graphColors.range)
                    ),
                    React.createElement("svg", { "data-physics-graph": "range", 'data-launch-height': height, 'data-optimum-angle': optimumAngle, style: { display: 'block', background: graphColors.surface, borderRadius: 8, width: '100%', maxWidth: 360, height: 'auto', margin: '0 auto' }, viewBox: "0 0 " + rW + " " + rH, width: "100%", role: "img", "aria-label": __alloT('stem.physics.aria_range_angle_height_graph', 'Ideal range versus angle without air drag. Launch height:') + ' ' + height + ' m. ' + __alloT('stem.physics.aria_range_angle_optimum', 'Maximum range at') + ' ' + optimumAngle.toFixed(1) + '°.' },
                      [0, rangeLimit / 2, rangeLimit].map(function(value) {
                        var y = rPT + rIH - value / rangeLimit * rIH;
                        return React.createElement('g', { key: value },
                          value > 0 && axisLine2(rPL, y, rW - rPR, y, graphColors.grid, '2 5'),
                          lbl2(rPL - 8, y + 5, tickNumber(value), 'end')
                        );
                      }),
                      [30, 60, 90].map(function(a) {
                        var x = rPL + a / 90 * rIW;
                        return React.createElement('line', { key: a, x1: x, x2: x, y1: rPT, y2: rPT + rIH, stroke: graphColors.grid, strokeWidth: 0.75, strokeDasharray: '2 5' });
                      }),
                      // Y/X axes
                      axisLine2(rPL, rPT, rPL, rPT + rIH),
                      axisLine2(rPL, rPT + rIH, rW - rPR, rPT + rIH),
                      // Height-aware optimum dashed vertical reference
                      axisLine2(optSX, optSY, optSX, rPT + rIH, graphColors.range, '5 4'),
                      // Range curve
                      React.createElement('path', { d: rangePath, stroke: graphColors.range, strokeWidth: 2.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      React.createElement('circle', { cx: optSX, cy: optSY, r: 4, fill: graphColors.range, stroke: graphColors.surface, strokeWidth: 1.5 }),
                      // Current-angle marker line + dot
                      axisLine2(curSX, curSY, curSX, rPT + rIH, graphColors.marker, '3 3'),
                      React.createElement('circle', { cx: curSX, cy: curSY, r: 4.5, fill: graphColors.marker, stroke: graphColors.surface, strokeWidth: 1.5 }),
                      lbl2(rPL, 18, __alloT('stem.physics.axis_range_m', 'range (m)'), 'start'),
                      // Fewer ticks keep the same labels readable on phones.
                      [0, 30, 60, 90].map(function (a) {
                        var ax = rPL + (a / 90) * rIW;
                        return React.createElement('text', { key: a, x: ax, y: rH - 29, fontSize: 18, fill: graphColors.ink, textAnchor: a === 0 ? 'start' : a === 90 ? 'end' : 'middle', fontFamily: 'system-ui, sans-serif', style: { fontSize: 18 } }, a + '°');
                      }),
                      // Axis title
                      lbl2(rPL + rIW / 2, rH - 5, __alloT('stem.physics.axis_launch_angle', 'launch angle (θ)'))
                    ),
                    React.createElement("p", { style: { margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: graphColors.muted } },
                      height > 0
                        ? __alloT('stem.physics.sweep_note_elevated', 'An elevated launch has a no-drag optimum below 45°. Complementary angles generally have different ranges when launch and landing heights differ.')
                        : __alloT('stem.physics.sweep_note_ground', 'From ground level with no air drag, range peaks at 45°. Complementary angles such as 30° and 60° have equal range.')
                    ),
                    d.airResist && React.createElement('p', { style: { margin: '8px 0 0', paddingTop: 8, borderTop: '1px solid ' + graphColors.border, fontSize: 14, lineHeight: 1.55, color: graphColors.muted } },
                      __alloT('stem.physics.sweep_drag_model_note', 'This curve is the no-drag prediction. With air drag on, use measured launches to find the best angle.')
                    )
                  );
                })()
              );
            })(),

            // ── Learn Panel (Newton's Laws & Projectile Motion) ──
            // Grade-banded like the Myths panel: 3-5 sees the concrete cards,
            // 6-8 adds Newton's 2nd law and energy, 9-12 adds drag. A toggle
            // shows everything for a student who wants to read ahead.
            d.showLearn && (function () {
              var bandRank = { '3-5': 0, '6-8': 1, '9-12': 2 };
              var myRank = bandRank[physBand] || 0;
              var card = function (band, key, labelCls, label, body, isMyth) {
                return { band: band, key: key, node: React.createElement("div", { key: key, className: isMyth ? "rounded-lg p-2 border border-amber-300 bg-amber-100/70" : "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold " + labelCls }, label),
                  body
                ) };
              };
              var cards = [
                card('3-5', 'projectile', 'text-blue-600', '🚀 ' + __alloT('stem.physics.concept_projectile_label', 'Projectile Motion: '), __alloT('stem.physics.concept_projectile_models', 'Without air drag, the path is a parabola: horizontal velocity stays constant while gravity changes vertical velocity. With drag, both components change and the path is asymmetric.')),
                card('6-8', 'newton2', 'text-red-600', '🌍 ' + __alloT('stem.physics.concept_newton2_label', "Newton's 2nd Law: "), __alloT('stem.physics.concept_newton2_body', 'F = ma. The only force on a projectile (ignoring drag) is gravity: a = g downward. This creates the curved trajectory.')),
                card('3-5', 'optimal', 'text-amber-600', '🎯 ' + __alloT('stem.physics.concept_optimal_label', 'Optimal Angle: '), __alloT('stem.physics.concept_optimal_height', 'With no air drag and equal launch and landing heights, 45° gives maximum range and complementary angles have equal range. Raising the launcher above the landing ground lowers the best angle below 45°. Air drag also changes the best angle.')),
                card('6-8', 'energy', 'text-purple-600', '⚡ ' + __alloT('stem.physics.concept_energy_label', 'Energy Conservation: '), __alloT('stem.physics.concept_energy_models', 'Without air drag, kinetic energy (½mv²) and gravitational potential energy (mgh) exchange while their sum stays constant. Drag transfers mechanical energy to the surroundings, so KE + PE decreases.')),
                card('9-12', 'air', 'text-orange-600', '🌬️ ' + __alloT('stem.physics.concept_air_label', 'Air Resistance: '), __alloT('stem.physics.concept_air_body', 'Drag force opposes motion and increases with speed (F_drag ∝ v²). It shortens range, lowers max height, and makes the trajectory asymmetric.')),
                card('3-5', 'gravity', 'text-sky-700', '🌑 ' + __alloT('stem.physics.concept_gravity_label', 'Gravity Varies: '), __alloT('stem.physics.concept_gravity_equal_height', 'For ground-level launches with air drag off and the same speed and angle, Moon gravity (1.6 m/s²) gives about 6 times the range of Earth gravity (9.8 m/s²). Elevated launches follow the general flight-time formula instead of this simple ratio.')),
                card('3-5', 'myth1', 'text-amber-700', '⚠ ' + __alloT('stem.physics.myth1_label', 'Myth: “A moving object needs a forward push.” '), __alloT('stem.physics.myth1_models', 'With air drag off, no horizontal force is needed to keep horizontal velocity constant. The horizontal arrow shows velocity. With air drag on, a backward drag force slows that motion.'), true),
                card('3-5', 'myth2', 'text-amber-700', '⚠ ' + __alloT('stem.physics.myth2_label', 'Myth: “Heavier objects fall faster.” '), __alloT('stem.physics.myth2_body', 'Drag the Mass slider with air drag OFF — the trajectory does NOT change; every mass falls with the same g. Only with air drag ON does a heavier ball fly farther, because the same air push slows a big mass less.'), true),
                card('6-8', 'myth3', 'text-amber-700', '⚠ ' + __alloT('stem.physics.myth3_label', 'Myth: “Velocity points where the force points.” '), __alloT('stem.physics.myth3_body', "At the very top of the arc the velocity is purely horizontal, yet gravity still points straight DOWN. A force changes motion — it doesn't have to point along it."), true)
              ];
              var shown = cards.filter(function (c) { return d.learnShowAll || (bandRank[c.band] || 0) <= myRank; });
              var hidden = cards.length - shown.length;
              return React.createElement("div", { className: "bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-3 animate-in fade-in duration-200" },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                  React.createElement("h4", { className: "text-sm font-bold text-emerald-800" }, "📖 " + __alloT('stem.physics.physics_concepts', 'Physics Concepts')),
                  (hidden > 0 || d.learnShowAll) && React.createElement("button", {
                    type: "button",
                    "aria-pressed": !!d.learnShowAll,
                    onClick: function () { upd('learnShowAll', !d.learnShowAll); },
                    className: "px-2 py-1 rounded-lg text-[0.625rem] font-bold border " + (d.learnShowAll ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100')
                  }, d.learnShowAll ? __alloT('stem.physics.learn_show_my_level', 'Show my level') : __alloT('stem.physics.learn_show_all', 'Show all concepts') + ' (+' + hidden + ')')
                ),
                React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs text-emerald-900" }, shown.map(function (c) { return c.node; }))
              );
            })(),

            // ── Real-Time Flight Data Table ──
            d.showFlightData && React.createElement("section", { 'data-physics-flight-data': true, 'aria-labelledby': 'physics-flight-data-heading' },
              React.createElement("div", { className: "phys-measured-heading" },
                React.createElement("div", null,
                  React.createElement("h3", { id: 'physics-flight-data-heading' }, __alloT('stem.physics.flight_data_title', 'Flight Data')),
                  React.createElement("p", null, __alloT('stem.physics.flight_data_select_help', 'Select a time to inspect that recorded moment on the trajectory and graphs.'))),
                React.createElement("button", {
                  type: "button",
                  "aria-label": __alloT('stem.physics.aria_copy_csv', 'Copy the flight data as CSV for a spreadsheet'),
                  onClick: function () {
                    var csv = physFlightCsv();
                    if (!csv) { if (addToast) addToast(__alloT('stem.physics.csv_nothing', 'Launch a projectile first \u2014 there is no flight data yet.'), 'warning'); return; }
                    physCopyText(csv).then(function (ok) {
                      var msg = ok ? __alloT('stem.physics.toast_csv_copied', 'Flight data copied as CSV. Paste it into a spreadsheet.') : __alloT('stem.physics.toast_csv_failed', 'Could not copy automatically. Select the table and copy it by hand.');
                      if (addToast) addToast((ok ? '\uD83D\uDCCB ' : '\u26A0\uFE0F ') + msg, ok ? 'success' : 'warning');
                      if (typeof announceToSR === 'function') announceToSR(msg);
                    });
                  },
                  className: "px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-white text-cyan-800 border border-cyan-300 hover:bg-cyan-100"
                }, "\uD83D\uDCCB " + __alloT('stem.physics.copy_csv', 'Copy CSV'))
              ),
              (function() {
                var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
                var trails = cv && cv._trails ? cv._trails : [];
                var lastTrail = trails.length > 0 ? trails[trails.length - 1] : [];
                if (lastTrail.length === 0) {
                  return React.createElement("p", { className: "phys-measured-help" }, __alloT('stem.physics.launch_to_see_flight_data', 'Launch a projectile to see flight data'));
                }
                var selected = physSelectedInspection(cv);
                // Include both endpoints, then add the selected sample if it
                // falls between the evenly spaced rows. Export keeps all points.
                var sampleCount = Math.min(11, lastTrail.length);
                var indices = [];
                for (var i = 0; i < sampleCount; i++) {
                  var index = sampleCount === 1 ? 0 : Math.round(i * (lastTrail.length - 1) / (sampleCount - 1));
                  if (indices.indexOf(index) < 0) indices.push(index);
                }
                if (selected && indices.indexOf(selected.index) < 0) indices.push(selected.index);
                indices.sort(function(a, b) { return a - b; });
                var recorded = lastTrail.parameters || lastTrail;
                var settings = [];
                if (lastTrail.run != null) settings.push(__alloT('stem.physics.investigation_run', 'Run') + ' ' + lastTrail.run);
                [['angle', 'θ', '°'], ['velocity', 'v₀', 'm/s'], ['gravity', 'g', 'm/s²'], ['mass', 'm', 'kg'], ['launchHeight', 'h₀', 'm']].forEach(function(setting) {
                  if (typeof recorded[setting[0]] === 'number' && isFinite(recorded[setting[0]])) settings.push(setting[1] + ' = ' + recorded[setting[0]] + ' ' + setting[2]);
                });
                settings.push(recorded.drag || recorded.airResist ? __alloT('stem.physics.sample_drag_on', 'Air drag on') : __alloT('stem.physics.sample_drag_off', 'Air drag off'));
                var summaryIndex = selected ? selected.index : lastTrail.length - 1;
                var summaryPoint = lastTrail[summaryIndex];
                var summaryTime = summaryPoint.t != null ? summaryPoint.t : summaryIndex * PHYS_DT;
                function summaryMeasurement(key, label, value, unit) {
                  return React.createElement('div', { key: key },
                    React.createElement('dt', null, label),
                    React.createElement('dd', { 'data-physics-flight-summary-value': key }, value.toFixed(2) + ' ' + unit));
                }
                function revealSelectedRow(element) {
                  if (!element) return;
                  // Only a new user-selected point moves this scroll region.
                  // Live data refreshes retain the reader's scroll position.
                  if (!selected || d.simSpeed !== 0) { element._physicsSelectedRow = null; return; }
                  var previous = element._physicsSelectedRow;
                  if (previous && previous.trail === lastTrail && previous.index === selected.index) return;
                  var row = element.querySelector('tbody tr[data-selected="true"]');
                  var heading = element.querySelector('thead');
                  if (!row || !heading) return;
                  element._physicsSelectedRow = { trail: lastTrail, index: selected.index };
                  var viewport = element.getBoundingClientRect();
                  var rowBounds = row.getBoundingClientRect();
                  var visibleTop = viewport.top + element.clientTop + heading.getBoundingClientRect().height + 4;
                  var visibleBottom = viewport.top + element.clientTop + element.clientHeight - 4;
                  if (rowBounds.top < visibleTop) element.scrollTop = Math.max(0, element.scrollTop + rowBounds.top - visibleTop);
                  else if (rowBounds.bottom > visibleBottom) element.scrollTop += rowBounds.bottom - visibleBottom;
                }
                var rows = indices.map(function(ri) {
                  var pt = lastTrail[ri];
                  var t_sec = pt.t != null ? pt.t : ri * PHYS_DT;
                  var isSelected = !!selected && selected.index === ri;
                  return React.createElement('tr', { key: ri, 'data-selected': isSelected ? 'true' : 'false' },
                    React.createElement('th', { scope: 'row' },
                      React.createElement('button', { type: 'button', 'data-physics-sample-index': ri, 'aria-pressed': isSelected,
                        'aria-label': __alloT('stem.physics.sample_inspect_point', 'Inspect sample') + ' ' + (ri + 1) + ', t = ' + t_sec.toFixed(3) + ' s',
                        onClick: function() {
                          if (physSelectSample(ri)) setTimeout(function() {
                            var panel = document.querySelector('[data-physics-sample-inspector]');
                            if (!panel) return;
                            panel.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
                            var slider = panel.querySelector('[data-physics-sample-slider]');
                            (slider && !slider.disabled ? slider : panel).focus({ preventScroll: true });
                          }, 0);
                        } }, t_sec.toFixed(3))),
                    React.createElement('td', null, pt.mX.toFixed(2)),
                    React.createElement('td', null, pt.mY.toFixed(2)),
                    React.createElement('td', null, (pt.mVx || 0).toFixed(2)),
                    React.createElement('td', null, (pt.mVy || 0).toFixed(2)),
                    React.createElement('td', null, Math.sqrt((pt.mVx || 0) * (pt.mVx || 0) + (pt.mVy || 0) * (pt.mVy || 0)).toFixed(2)));
                });
                return React.createElement('div', null,
                  React.createElement('div', { className: 'phys-capture-settings', 'aria-label': __alloT('stem.physics.sample_recorded_settings', 'Recorded launch settings') }, settings.map(function(label, i) { return React.createElement('span', { key: i }, label); })),
                  React.createElement('div', { 'data-physics-flight-summary': selected ? 'selected' : 'latest', 'data-sample-index': summaryIndex, 'data-time': summaryTime },
                    React.createElement('p', null,
                      React.createElement('strong', null, selected ? __alloT('stem.physics.graph_selected_sample', 'Selected sample') : __alloT('stem.physics.sample_latest_point', 'Latest point')),
                      React.createElement('span', null, 't = ' + summaryTime.toFixed(3) + ' s')),
                    React.createElement('dl', null,
                      summaryMeasurement('height', __alloT('stem.physics.flight_data_height_short', 'Height · y'), summaryPoint.mY, 'm'),
                      summaryMeasurement('vx', __alloT('stem.physics.flight_data_vx_short', 'Horizontal · vx'), summaryPoint.mVx || 0, 'm/s'),
                      summaryMeasurement('vy', __alloT('stem.physics.flight_data_vy_short', 'Vertical · vy'), summaryPoint.mVy || 0, 'm/s'),
                      summaryMeasurement('speed', __alloT('stem.physics.metric_speed', 'Speed'), Math.hypot(summaryPoint.mVx || 0, summaryPoint.mVy || 0), 'm/s'))),
                  React.createElement('p', { className: 'phys-measured-help', id: 'physics-flight-sampling-help' },
                    indices.length + ' / ' + lastTrail.length + ' ' + __alloT('stem.physics.flight_data_points_shown', 'recorded points shown. The launch and latest point are included. CSV contains every point.')),
                  React.createElement('p', { 'data-physics-flight-scroll-hint': true, id: 'physics-flight-scroll-help' },
                    React.createElement('span', { 'aria-hidden': true }, '↔'),
                    React.createElement('span', null, __alloT('stem.physics.flight_data_scroll_hint', 'Swipe or scroll sideways to see every measurement. Time stays visible.'))),
                  React.createElement('div', { 'data-physics-flight-table-wrap': true, ref: revealSelectedRow, role: 'region', tabIndex: 0, 'aria-label': __alloT('stem.physics.flight_data_scroll_region', 'Recorded flight measurements; scroll for all columns'), 'aria-describedby': 'physics-flight-sampling-help physics-flight-scroll-help' },
                    React.createElement('table', { 'data-physics-flight-table': true },
                      React.createElement('caption', { className: 'sr-only' }, __alloT('stem.physics.caption_data_table', 'physics data table')),
                      React.createElement('thead', null, React.createElement('tr', null,
                        ['t (s)', 'x (m)', 'y (m)', 'vx (m/s)', 'vy (m/s)', '|v| (m/s)'].map(function(label, i) { return React.createElement('th', { key: i, scope: 'col' }, label); }))),
                      React.createElement('tbody', null, rows))));
              })()
            ),


            // ═══ TARGET DESTRUCTION MODE UI ═══
            React.createElement("div", { 'data-physics-learning-panel': 'mission', className: "bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-[0.6875rem] font-bold text-red-700 uppercase tracking-wider" }, "\u{1F3AF} " + __alloT('stem.physics.target_mode_title', 'Target Destruction Mode')),
                !d.targetMode
                  ? React.createElement("button", { "aria-label": __alloT('stem.physics.start_mission', 'Start Mission'),
                      onClick: function() { upd('targetMode', true); startTargetRound(1); },
                      className: "px-3 py-1 bg-red-600 text-white text-[0.6875rem] font-bold rounded-lg hover:bg-red-700 transition-all"
                    }, "\u25B6 " + __alloT('stem.physics.start_mission', 'Start Mission'))
                  : React.createElement("div", { className: "flex gap-1.5" },
                      React.createElement("button", { "aria-label": d.targetRound >= TARGET_LEVELS.length ? __alloT('stem.physics.restart_mission', 'Mission complete — restart') : __alloT('stem.physics.next_round', 'Next Round'),
                        onClick: function() {
                          var allDone = d.targetList && d.targetList.every(function(t){return t.destroyed;});
                          if (allDone && d.targetRound < TARGET_LEVELS.length) {
                            startTargetRound(d.targetRound + 1);
                          } else if (allDone) {
                            startTargetRound(1);
                          }
                        },
                        disabled: !(d.targetList && d.targetList.every(function(t){return t.destroyed;})),
                        className: "px-3 py-1 text-[0.6875rem] font-bold rounded-lg transition-all " +
                          (d.targetList && d.targetList.every(function(t){return t.destroyed;}) ? 'bg-emerald-700 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed')
                      }, "\u27A1 " + (d.targetRound >= TARGET_LEVELS.length ? __alloT('stem.physics.restart_mission', 'Mission complete — restart') : __alloT('stem.physics.next_round', 'Next Round'))),
                      React.createElement("button", { "aria-label": __alloT('stem.physics.retry', 'Retry'),
                        onClick: function() { startTargetRound(d.targetRound || 1); },
                        className: "px-3 py-1 bg-amber-700 text-white text-[0.6875rem] font-bold rounded-lg hover:bg-amber-800 transition-all"
                      }, "\u{1F504} " + __alloT('stem.physics.retry', 'Retry')),
                      React.createElement("button", { "aria-label": __alloT('stem.physics.end', 'End'),
                        onClick: endTargetMode,
                        className: "px-3 py-1 bg-slate-600 text-white text-[0.6875rem] font-bold rounded-lg hover:bg-slate-500 transition-all"
                      }, "\u2716 " + __alloT('stem.physics.end', 'End'))
                    )
              ),

              // Active round info
              d.targetMode && React.createElement("div", { className: "space-y-2" },
                // Round header
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-red-100" },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-xs font-bold text-red-800" },
                      __alloT('stem.physics.round_prefix', 'Round ') + (d.targetRound || 1) + "/" + TARGET_LEVELS.length + " — " +
                      (TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)] || {}).label
                    ),
                    React.createElement("span", { className: "text-[0.6875rem] font-bold text-amber-700" }, __alloT('stem.physics.score_prefix', 'Score: ') + (d.targetScore || 0) + " XP")
                  ),
                  React.createElement("p", { className: "text-[0.6875rem] text-slate-600 mt-1" },
                    (TARGET_LEVELS[Math.min((d.targetRound || 1) - 1, TARGET_LEVELS.length - 1)] || {}).desc
                  )
                ),

                // Constraint indicator
                d.targetConstraint && React.createElement("div", { className: "flex items-center gap-2 bg-red-100 rounded-lg px-3 py-1.5" },
                  React.createElement("span", { className: "text-xs font-bold text-red-700" },
                    d.targetConstraint.type === 'fixedAngle'
                      ? "\u{1F512} " + __alloT('stem.physics.lock_angle_prefix', 'Angle LOCKED at ') + d.targetConstraint.value + __alloT('stem.physics.lock_angle_suffix', '\u00B0 \u2014 adjust velocity or gravity to hit the target')
                      : "\u{1F512} " + __alloT('stem.physics.lock_velocity_prefix', 'Velocity LOCKED at ') + d.targetConstraint.value + __alloT('stem.physics.lock_velocity_suffix', ' m/s \u2014 adjust angle or gravity to hit the target')
                  )
                ),

                // Target status chips
                d.targetList && React.createElement("div", { className: "flex gap-1.5 flex-wrap" },
                  d.targetList.map(function(tgt, i) {
                    return React.createElement("span", {
                      key: i,
                      className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold " +
                        (tgt.destroyed ? 'bg-emerald-100 text-emerald-700 line-through' : 'bg-amber-100 text-amber-700')
                    }, (tgt.destroyed ? "\u2705 " : "\u{1F4E6} ") + tgt.x + "m");
                  })
                ),

                // Feedback
                d.targetFeedback && React.createElement("div", {
                  className: "px-3 py-2 rounded-lg text-xs font-bold " + (
                    d.targetFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                    d.targetFeedback.type === 'partial' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                    'bg-red-100 text-red-700 border border-red-300'
                  )
                }, d.targetFeedback.msg),

                // Calculation Scaffold (appears after 2 misses)
                d.targetShowScaffold && React.createElement("div", { className: "bg-amber-50 rounded-lg border border-amber-200 p-3 animate-in fade-in duration-300" },
                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-amber-700 uppercase tracking-wider mb-1" }, "\u{1F4DD} " + __alloT('stem.physics.calculation_helper', 'Calculation Helper')),
                  (function() {
                    var ans = getTargetAnswer();
                    if (!ans) return React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.physics.no_active_target', 'No active target'));
                    return React.createElement("div", { className: "space-y-1" },
                      React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.physics.equation_label', 'Equation: '), React.createElement("b", { className: "font-mono text-blue-700" }, ans.equation)),
                      React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.physics.substitution_label', 'Substitution: '), React.createElement("span", { className: "font-mono text-emerald-700" }, ans.steps)),
                      React.createElement("p", { className: "text-[0.6875rem] text-amber-700 italic mt-1" }, "\u{1F4A1} " + __alloT('stem.physics.try_setting_prefix', 'Try setting ') + ans.param + __alloT('stem.physics.to_approximately', ' to approximately ') + (ans.value ? ans.value.toFixed(1) : '?'))
                    );
                  })()
                ),

                // Attempt counter
                React.createElement("p", { className: "text-[0.6875rem] text-slate-600 text-right" }, __alloT('stem.physics.attempts_prefix', 'Attempts: ') + (d.targetAttempts || 0))
              )
            ),

            // ── Multi-Tier Challenges ──
            React.createElement("div", { 'data-physics-learning-panel': 'challenges', className: "bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200 p-3 mb-3" },
              React.createElement("p", { className: "text-[0.6875rem] font-bold text-violet-700 uppercase tracking-wider mb-2" }, "\uD83C\uDFC6 " + __alloT('stem.physics.challenges_title', 'Challenges')),
              React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                TIER_CHALLENGES.map(function(ch) {
                  var active = d.challengeTier === ch.tier && d.challengeActive;
                  var completed = d['challenge' + ch.tier + 'Done'];
                  return React.createElement("button", { key: ch.tier,
                    "aria-pressed": !!active,
                    onClick: function() {
                      upd('challengeTier', ch.tier);
                      upd('challengeActive', true);
                      upd('challengeFeedback', null);
                      if (ch.req === 'airResist') upd('airResist', true);
                      if (ch.req === 'mars') upd('gravity', 3.7);
                      addToast('\uD83C\uDFC6 ' + ch.desc + ' — ' + __alloT('stem.physics.toast_fire_away', 'fire away!'), 'info');
                    },
                    className: "p-2 rounded-lg text-center transition-all border-2 " +
                      (completed ? 'bg-emerald-100 border-emerald-400' : active ? 'bg-violet-100 border-violet-400 shadow-md' : 'bg-white border-slate-200 hover:border-violet-600')
                  },
                    React.createElement("p", { className: "text-xs font-bold " + (completed ? 'text-emerald-700' : 'text-violet-700') }, completed ? '\u2705 ' + ch.label : ch.label),
                    React.createElement("p", { className: "text-[0.6875rem] text-slate-600 mt-1" }, ch.desc),
                    React.createElement("p", { className: "text-[0.6875rem] font-bold text-amber-700 mt-1" }, '+' + ch.reward + ' XP')
                  );
                })
              ),
              d.challengeFeedback && React.createElement("p", {
                role: "status",
                className: "mt-2 px-3 py-1.5 rounded-lg text-xs font-bold " + (d.challengeFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300')
              }, d.challengeFeedback.msg)
            ),

            // ── Kinematic Equations ──

            React.createElement("div", { 'data-physics-learning-panel': 'equations', className: "bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-3 mb-3" },

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCDD " + __alloT('stem.physics.kinematic_equations_general', 'Kinematic equations (no air drag)')),
              React.createElement('p', { className: 'text-xs text-slate-700 mb-2' }, __alloT('stem.physics.formula_height_definitions', 'h₀ is launch height above ground; landing is y = 0. Initial horizontal velocity is vx₀ = v cos(θ), and initial vertical velocity is vy₀ = v sin(θ).')),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_range', 'Range')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, 'R = vx₀ × T')

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_max_height_ground', 'Max height above ground')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, 'H = h₀ + vy₀² / (2g)')

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_flight_time', 'Flight Time')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800", style: { overflowWrap: 'anywhere' } }, 'T = (vy₀ + √(vy₀² + 2gh₀)) / g')

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_position', 'Position')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, 'y = h₀ + vy₀t − ½gt²')

                )

              ),

              d.airResist && React.createElement("p", { className: "mt-2 text-[0.6875rem] text-orange-500 italic" }, "\u26A0\uFE0F " + __alloT('stem.physics.air_drag_modifies', 'Air drag modifies these equations — real range will be shorter than the idealized calculation below.'))

            ),

            React.createElement("div", { 'data-physics-ideal-summary': true, 'aria-label': __alloT('stem.physics.ideal_current_prediction', 'Ideal prediction for the current launch settings, without air drag'), className: "grid grid-cols-3 gap-2 mb-3 text-center" },

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_range', 'Range')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, window.StemLab._physics.vacuum(d.angle, d.velocity, d.gravity, d.launchHeight || 0).range.toFixed(1) + ' m')

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_max_height_ground', 'Max height above ground')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, window.StemLab._physics.vacuum(d.angle, d.velocity, d.gravity, d.launchHeight || 0).maxH.toFixed(1) + ' m')

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_flight_time', 'Flight Time')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, window.StemLab._physics.vacuum(d.angle, d.velocity, d.gravity, d.launchHeight || 0).time.toFixed(2) + ' s')

              )

            ),

            // ── Calculate the Landing Quiz ──

            React.createElement("div", { 'data-physics-learning-panel': 'quiz', className: "mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-amber-700 uppercase tracking-wider" }, "\uD83C\uDFAF " + __alloT('stem.physics.predict_the_landing', 'Calculate the Landing')),

                React.createElement("button", { "aria-label": __alloT('stem.physics.aria_generate_quiz', 'Generate range calculation quiz'),

                  onClick: function () {

                    var qAngles = [20, 30, 35, 40, 45, 50, 55, 60, 70];

                    var qVels = [15, 20, 25, 30, 35, 40];

                    var qGravs = [9.8, 1.6, 3.7, 24.8];

                    var qa = qAngles[Math.floor(Math.random() * qAngles.length)];

                    var qv = qVels[Math.floor(Math.random() * qVels.length)];

                    var qg = qGravs[Math.floor(Math.random() * qGravs.length)];

                    var qrad = qa * Math.PI / 180;

                    var qRange = (qv * qv * Math.sin(2 * qrad)) / qg;

                    var opts = [qRange];

                    while (opts.length < 4) {

                      var fake = qRange * (0.3 + Math.random() * 1.8);

                      if (Math.abs(fake - qRange) > qRange * 0.15) opts.push(fake);

                    }

                    opts.sort(function () { return Math.random() - 0.5; });

                    upd('quizActive', true); upd('quizAngle', qa); upd('quizVel', qv); upd('quizGrav', qg);

                    upd('quizAnswer', qRange); upd('quizOptions', opts); upd('quizPicked', null); upd('quizFeedback', null);

                  }, className: "px-3 py-1 bg-amber-700 text-white text-[0.6875rem] font-bold rounded-lg hover:bg-amber-700 transition-all"

                }, d.quizActive ? "\uD83D\uDD04 " + __alloT('stem.physics.new_question', 'New Question') : "\u25B6 " + __alloT('stem.physics.start_quiz', 'Start Quiz'))

              ),

              d.quizActive && React.createElement("div", { className: "space-y-2" },
                React.createElement('p', { className: 'text-xs text-slate-700' }, __alloT('stem.physics.quiz_ground_assumption', 'This calculation quiz assumes no air drag and launch and landing at ground level, regardless of the current simulator settings.')),

                React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.physics.quiz_q_prefix', 'A projectile is launched at '), React.createElement("b", null, d.quizAngle + "\u00B0"), __alloT('stem.physics.quiz_q_with_velocity', ' with velocity '), React.createElement("b", null, d.quizVel + " m/s"), __alloT('stem.physics.quiz_q_and_gravity', ' and gravity '), React.createElement("b", null, d.quizGrav + " m/s\u00B2" + ({ '9.8': __alloT('stem.physics.planet_earth_paren', ' (Earth)'), '1.6': __alloT('stem.physics.planet_moon_paren', ' (Moon)'), '3.7': __alloT('stem.physics.planet_mars_paren', ' (Mars)'), '24.8': __alloT('stem.physics.planet_jupiter_paren', ' (Jupiter)') }[String(d.quizGrav)] || '')), __alloT('stem.physics.quiz_q_suffix', '. How far does it land?')),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  (d.quizOptions || []).map(function (opt, oi) {

                    var picked = d.quizPicked === oi;

                    var correct = d.quizPicked !== null && Math.abs(opt - d.quizAnswer) < 0.5;

                    var wrong = picked && !correct;

                    return React.createElement("button", { key: oi, disabled: d.quizPicked !== null,

                      onClick: function () {

                        upd('quizPicked', oi);

                        var isCorrect = Math.abs(opt - d.quizAnswer) < 0.5;

                        upd('quizFeedback', isCorrect ? 'correct' : 'wrong');

                        // Diagnostic breakdown: walk the formula with THESE numbers and
                        // say how far off the pick was — velocity-squared is the usual trap.
                        if (!isCorrect) {
                          var qRatio = opt / d.quizAnswer;
                          var qSin = Math.sin(2 * d.quizAngle * Math.PI / 180);
                          var qDiag = __alloT('stem.physics.quiz_diag_walk', 'Walk it through: R = v²·sin(2θ)/g = ') + d.quizVel + '² × ' + qSin.toFixed(2) + ' / ' + d.quizGrav + ' = ' + d.quizAnswer.toFixed(1) + ' m. ' + __alloT('stem.physics.quiz_diag_pick_was', 'Your pick was ') + (qRatio > 1 ? qRatio.toFixed(1) + '× ' + __alloT('stem.physics.quiz_diag_too_far', 'too far') : __alloT('stem.physics.quiz_diag_only', 'only ') + (qRatio * 100).toFixed(0) + '% ' + __alloT('stem.physics.quiz_diag_of_true', 'of the true range')) + '. ' + __alloT('stem.physics.quiz_diag_lever', 'Remember the biggest lever: velocity enters SQUARED — small speed changes move the landing a lot.');
                          var qWorld = { '1.6': __alloT('stem.physics.quiz_world_moon', 'Moon gravity is ~6× weaker than Earth’s, so everything flies ~6× farther.'), '3.7': __alloT('stem.physics.quiz_world_mars', 'Mars gravity is ~2.6× weaker than Earth’s — ranges stretch accordingly.'), '24.8': __alloT('stem.physics.quiz_world_jupiter', 'Jupiter’s gravity is ~2.5× Earth’s — flights are short and brutal.') }[String(d.quizGrav)];
                          if (qWorld) qDiag += ' ' + qWorld;
                          upd('quizDiag', qDiag);
                        } else {
                          upd('quizDiag', null);
                        }

                        if (isCorrect) { upd('quizStreak', (d.quizStreak || 0) + 1); awardStemXP('physicsQuiz', 10, 'Solved the landing calculation'); }

                        else { upd('quizStreak', 0); }

                      },

                      className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all " +

                        (correct ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : wrong ? 'bg-red-100 border-red-400 text-red-700' : d.quizPicked !== null ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-amber-200 text-slate-700 hover:border-amber-400')

                    }, opt.toFixed(1) + " m");

                  })

                ),

                d.quizFeedback && React.createElement("p", { className: "text-xs font-bold " + (d.quizFeedback === 'correct' ? 'text-emerald-600' : 'text-red-600') },

                  d.quizFeedback === 'correct' ? '\u2705 ' + __alloT('stem.physics.quiz_correct_prefix', 'Correct! R = v\u00B2sin(2\u03B8)/g = ') + d.quizAnswer.toFixed(1) + 'm' : '\u274C ' + __alloT('stem.physics.quiz_not_quite', 'Not quite.')),

                d.quizFeedback === 'wrong' && d.quizDiag && React.createElement("p", { className: "text-xs leading-relaxed text-red-700 bg-red-50 rounded-lg p-2 border border-red-200" }, d.quizDiag),

                d.quizStreak > 1 && React.createElement("p", { className: "text-xs font-bold text-amber-600" }, "\uD83D\uDD25 " + __alloT('stem.physics.streak_count', 'Streak: ') + d.quizStreak + "!")

              )

            ),

            // \u2500\u2500 \uD83E\uDDE0 Physics Myths \u2014 grade-banded T/F misconceptions, each falsifiable IN the sim \u2500\u2500
            // Every myth here is a documented projectile misconception (impetus theory,
            // heavier-falls-faster, zero-velocity-at-apex...), and every verdict comes with
            // a "Try it" pointing at the sim feature that lets the student SEE the truth.
            (function () {
              var glp = (gradeLevel || '5th Grade').toLowerCase();
              var mythBand = /9th|10|11|12|high/.test(glp) ? '9-12' : /6th|7th|8th/.test(glp) ? '6-8' : '3-5';
              var MYTHS_35 = [
                { s: __alloT('stem.physics.myth35_1_s', 'A heavier cannonball falls faster, so it lands sooner.'), t: false, why: __alloT('stem.physics.myth35_1_why', 'Gravity speeds up EVERY mass equally (with air resistance off) \u2014 a 10 kg ball and a 1 kg ball trace the exact same arc. Galileo\u2019s big idea.'), tryIt: __alloT('stem.physics.myth35_1_tryit', 'Launch with mass = 1 kg, then slide mass to 10 kg and launch again. Same arc, same landing spot.') },
                { s: __alloT('stem.physics.myth35_2_s', 'At the very top of the arc, the ball has stopped moving.'), t: false, why: __alloT('stem.physics.myth35_2_why', 'Only the UP-DOWN part of the motion pauses at the top. The ball keeps moving forward the whole time.'), tryIt: __alloT('stem.physics.myth35_2_tryit', 'Turn on Vectors and watch the horizontal arrow at the top of the arc \u2014 it never shrinks.') },
                { s: __alloT('stem.physics.myth35_3_s', 'Doubling the launch speed doubles the distance.'), t: false, why: __alloT('stem.physics.myth35_3_why', 'Distance grows with speed \u00D7 speed. Double the speed and it lands FOUR times farther.'), tryIt: __alloT('stem.physics.myth35_3_tryit', 'Launch at 15 m/s, then at 30 m/s with the same angle \u2014 compare the landing markers.') },
                { s: __alloT('stem.physics.myth35_4_ground_s', 'From ground level, aiming at 45\u00B0 gives the greatest range without air drag.'), t: true, why: __alloT('stem.physics.myth35_4_ground_why', 'For the same launch speed with no air drag, 45\u00B0 balances upward and forward motion when launch and landing are at the same height. From above the ground, the best angle is lower.'), tryIt: __alloT('stem.physics.myth35_4_ground_tryit', 'Set launch height to 0 m and turn air drag off. Compare 30\u00B0 and 60\u00B0 at the same speed: they land at the same distance.') }
              ];
              var MYTHS_68 = MYTHS_35.concat([
                { s: __alloT('stem.physics.myth68_1_s', 'After launch, a force keeps pushing the ball forward.'), t: false, why: __alloT('stem.physics.myth68_1_why', 'Once it leaves the cannon, the ONLY force is gravity, pulling straight down. Forward motion continues because nothing stops it \u2014 Newton\u2019s first law.'), tryIt: __alloT('stem.physics.myth68_1_tryit', 'Watch the vector overlay in flight: there is no forward force, yet Vx stays perfectly constant.') },
                { s: __alloT('stem.physics.myth_horizontal_vacuum_s', 'Without air drag, a ball fired horizontally and a ball dropped from the same height hit the ground at the same time.'), t: true, why: __alloT('stem.physics.myth_horizontal_vacuum_why', 'Both balls start with zero vertical velocity and fall from the same height under the same gravity. Without air drag, horizontal speed does not change their vertical motion or falling time.'), tryIt: __alloT('stem.physics.myth_horizontal_vacuum_tryit', 'Open the Horizontal motion investigation. Launch horizontally from 10 m at 15 m/s, then at 30 m/s with air drag off. Compare the recorded flight times: both launches have the same falling time but different ranges.') }
              ]);
              var MYTHS_912 = MYTHS_68.concat([
                { s: __alloT('stem.physics.myth912_1_s', 'With air resistance ON, 45\u00B0 is still the best angle.'), t: false, why: __alloT('stem.physics.myth912_1_why', 'Drag punishes long, high flights \u2014 it bleeds v\u00B2 the whole way. The optimum slips below 45\u00B0, and the faster the launch the lower it goes (about 42\u00B0 at 50 m/s for a 1 kg ball).'), tryIt: __alloT('stem.physics.myth912_1_tryit', 'Toggle air resistance on and sweep the angle slider \u2014 watch where the landing marker actually peaks.') }
              ]);
              var mythBank = mythBand === '9-12' ? MYTHS_912 : mythBand === '6-8' ? MYTHS_68 : MYTHS_35;
              var myth = d.physMyth || null;
              function startMyth() {
                var mi = Math.floor(Math.random() * mythBank.length);
                if (myth && mi === myth.idx) mi = (mi + 1) % mythBank.length;
                var m = mythBank[mi];
                upd('physMyth', { idx: mi, s: m.s, t: m.t, why: m.why, tryIt: m.tryIt, answered: false, chosen: null });
              }
              return React.createElement("div", { 'data-physics-learning-panel': 'myths', className: "mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-3" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-violet-700 uppercase tracking-wider" }, "\uD83E\uDDE0 " + __alloT('stem.physics.physics_myths_title', 'Physics Myths \u2014 true or false?')),
                  React.createElement("button", { "aria-label": __alloT('stem.physics.aria_start_myth', 'Start a physics myth question'),
                    onClick: startMyth,
                    className: "px-3 py-1 bg-violet-600 text-white text-[0.6875rem] font-bold rounded-lg hover:bg-violet-700 transition-all"
                  }, myth ? "\uD83D\uDD04 " + __alloT('stem.physics.new_myth', 'New Myth') : "\u25B6 " + __alloT('stem.physics.start', 'Start'))
                ),
                React.createElement('p', { className: 'text-xs text-slate-700 mb-2' }, __alloT('stem.physics.myth_model_assumptions', 'Unless a question explicitly includes air resistance, assume no air drag. Range comparisons use equal launch and landing heights and hold the other launch settings constant.')),
                myth && React.createElement("div", { className: "space-y-2" },
                  React.createElement("p", { className: "text-xs font-bold text-slate-700" }, "\u201C" + myth.s + "\u201D"),
                  !myth.answered && React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    [true, false].map(function (val) {
                      return React.createElement("button", { key: String(val),
                        "aria-label": __alloT('stem.physics.aria_answer', 'Answer ') + (val ? __alloT('stem.physics.true_lc', 'true') : __alloT('stem.physics.false_lc', 'false')),
                        onClick: function () {
                          var right = val === myth.t;
                          upd('physMyth', Object.assign({}, myth, { answered: true, chosen: val }));
                          upd('physMythsDone', (d.physMythsDone || 0) + 1);
                          if (right) {
                            awardStemXP('physicsMyth', 5, 'Myth busted');
                            if (typeof stemBeep === 'function') stemBeep(784, 0.12);
                          } else if (typeof stemBeep === 'function') stemBeep(220, 0.15);
                          if (typeof announceToSR === 'function') announceToSR((right ? __alloT('stem.physics.sr_correct', 'Correct.') : __alloT('stem.physics.sr_not_quite', 'Not quite.')) + ' ' + (myth.t ? __alloT('stem.physics.true_period', 'TRUE.') : __alloT('stem.physics.false_period', 'FALSE.')) + ' ' + myth.why);
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-all"
                      }, val ? '\u2705 ' + __alloT('stem.physics.true_cap', 'True') : '\u274C ' + __alloT('stem.physics.false_cap', 'False'));
                    })
                  ),
                  myth.answered && React.createElement("div", { className: "p-2.5 rounded-lg " + (myth.chosen === myth.t ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
                    React.createElement("p", { className: "text-xs font-bold mb-1 " + (myth.chosen === myth.t ? 'text-emerald-700' : 'text-red-700') },
                      (myth.chosen === myth.t ? '\u2705 ' + __alloT('stem.physics.correct_dash', 'Correct \u2014 ') : '\u274C ' + __alloT('stem.physics.not_quite_dash', 'Not quite \u2014 ')) + (myth.t ? __alloT('stem.physics.true_period', 'TRUE.') : __alloT('stem.physics.false_period', 'FALSE.'))),
                    React.createElement("p", { className: "text-xs leading-relaxed text-slate-700 mb-1" }, myth.why),
                    React.createElement("p", { className: "text-[0.6875rem] leading-relaxed font-bold text-indigo-700" }, "\uD83D\uDD2C " + __alloT('stem.physics.try_it_in_sim', 'Try it in the sim: ') + myth.tryIt)
                  )
                )
              );
            })(),

            React.createElement("button", { "aria-label": __alloT('stem.physics.snapshot', 'Snapshot'), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ph-' + Date.now(), tool: 'physics', label: d.angle + '\u00B0 ' + d.velocity + 'm/s', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 ' + __alloT('stem.physics.toast_snapshot_saved', 'Snapshot saved!'), 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.physics.snapshot', 'Snapshot')),

            // === H7b'' inquiry widget: gravity-angle explorer ===
            (function() {
              var h = React.createElement;
              var iq = d.gravityHunt || { gravity: 9.8, angle: 45, velocity: 30, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('gravityHunt', Object.assign({}, iq, patch)); }
              // Projectile range: R = v\u00B2 sin(2\u03B8) / g
              var angleRad = iq.angle * Math.PI / 180;
              var range = (iq.velocity * iq.velocity * Math.sin(2 * angleRad)) / iq.gravity;
              // Max range at angle = 45\u00B0, R_max = v\u00B2/g
              var maxRange = (iq.velocity * iq.velocity) / iq.gravity;
              var efficiency = maxRange > 0 ? (range / maxRange) : 0;
              var state = efficiency >= 0.95 ? 'optimal' : (efficiency >= 0.75 ? 'good' : 'suboptimal');
              var stateMeta = {
                optimal:    { label: '\uD83C\uDFAF ' + __alloT('stem.physics.iq_near_optimal', 'Near-optimal range'), color: '#047857', bg: '#ecfdf5', border: '#86efac' },
                good:       { label: '\uD83D\uDFE1 ' + __alloT('stem.physics.iq_reasonable', 'Reasonable range'),   color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
                suboptimal: { label: '\uD83D\uDD34 ' + __alloT('stem.physics.iq_far_from_optimal', 'Far from optimal'),   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
              }[state];
              if (isContrast) {
                stateMeta = Object.assign({}, stateMeta, { color: '#ffff00', bg: '#000000', border: '#ffff00' });
              } else if (isDark) {
                stateMeta = Object.assign({}, stateMeta, {
                  optimal: { color: '#6ee7b7', bg: '#052e2b', border: '#34d399' },
                  good: { color: '#fcd34d', bg: '#422006', border: '#f59e0b' },
                  suboptimal: { color: '#fca5a5', bg: '#450a0a', border: '#f87171' }
                }[state]);
              }
              function logObs() {
                var obs = { g: iq.gravity, a: iq.angle, v: iq.velocity, r: parseFloat(range.toFixed(1)), st: state };
                setIQ({ log: (iq.log || []).concat([obs]).slice(-8) });
              }
              return h('div', { 'data-physics-learning-panel': 'discovery', className: 'mt-4 p-4 rounded-xl bg-white border border-indigo-200 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-indigo-700 mb-1' }, '\uD83C\uDF0D ' + __alloT('stem.physics.iq_ideal_title', 'Gravity-angle discovery — ideal calculator')),
                h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
                  __alloT('stem.physics.iq_ideal_intro', 'This calculator assumes no air drag and equal launch and landing heights. Its sliders are separate from the flight controls. Range changes with speed and gravity; the rating compares your angle with 45° at the same speed and gravity, so only angle changes the rating. Apply these settings to test the prediction in the simulator.')),
                h('div', { className: 'mb-3 p-3 rounded-lg text-center', style: { background: stateMeta.bg, border: '2px solid ' + stateMeta.border } },
                  h('div', { className: 'text-lg font-black', style: { color: stateMeta.color } }, stateMeta.label),
                  // ★ This box paints its own ground from stateMeta.bg, which is
                  // dark in BOTH themed cases — #000000 in contrast, and one of
                  // #052e2b / #422006 / #450a0a in dark. The contrast case was
                  // fixed with the yellow above; the DARK case was not, leaving
                  // slate-700 on #052e2b at 1.42:1 — measured 2026-09-07 with the
                  // real --allo-stem palette injected, which is the only way this
                  // shows up: nothing in the repo rendered a tool in dark before.
                  h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1', style: isContrast ? { color: '#ffff00' } : (isDark ? { color: '#e2e8f0' } : undefined) }, __alloT('stem.physics.iq_range_prefix', 'Range ') + range.toFixed(1) + __alloT('stem.physics.iq_range_mid', ' m (max possible at this v + g: ') + maxRange.toFixed(1) + __alloT('stem.physics.iq_range_end', ' m)'))
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 mb-3' },
                  [
                    { key: 'gravity',  label: __alloT('stem.physics.slider_gravity', 'Gravity (m/s\u00B2)'),  val: iq.gravity,  min: 1,  max: 25, step: 0.1 },
                    { key: 'angle',    label: __alloT('stem.physics.slider_launch_angle', 'Launch angle (\u00B0)'), val: iq.angle,    min: 5,  max: 85, step: 1   },
                    { key: 'velocity', label: __alloT('stem.physics.slider_velocity', 'Velocity (m/s)'),  val: iq.velocity, min: 5,  max: 50, step: 1   }
                  ].map(function(s) {
                    return h('div', { key: s.key },
                      h('label', { htmlFor: 'gh-' + s.key, className: 'block text-[0.6875rem] font-bold text-slate-700 mb-1' },
                        s.label + ': ', h('span', { className: 'font-mono text-indigo-700' }, s.val)),
                      h('input', { id: 'gh-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                        onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                        className: 'w-full', 'aria-valuetext': (s.val + ' ' + ((s.label.match(/\(([^)]+)\)/) || ['', ''])[1])), 'aria-label': s.label }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
                  h('button', { type: 'button', 'data-physics-apply-inquiry': true, disabled: !!(d.targetMode || d.challengeActive || d.battleMode), title: (d.targetMode || d.challengeActive || d.battleMode) ? __alloT('stem.physics.inquiry_mode_disabled', 'Leave the active mission, challenge, or battle before applying calculator settings.') : undefined, onClick: function() {
                    if (d.targetMode || d.challengeActive || d.battleMode) return;
                    var cv = document.getElementById('physicsCanvas');
                    if (cv && cv._cancelFlight) cv._cancelFlight();
                    setLabToolData(function(prev) {
                      var current = prev.physics || {};
                      if (current.targetMode || current.challengeActive || current.battleMode) return prev;
                      return Object.assign({}, prev, { physics: Object.assign({}, current, { angle: iq.angle, velocity: iq.velocity, gravity: iq.gravity, launchHeight: 0, airResist: false }) });
                    });
                    if (cv && cv.focus) cv.focus();
                  }, className: 'px-3 py-2 rounded bg-indigo-700 text-white text-xs font-bold disabled:opacity-50' }, __alloT('stem.physics.iq_apply_ground_vacuum', 'Apply to simulator (ground level, no drag)')),
                  h('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[0.6875rem] font-bold text-slate-700 border border-slate-300' }, '\uD83D\uDCCB ' + __alloT('stem.physics.iq_log', 'Log')),
                  h('button', { onClick: function() { setIQ({ gravity: 9.8, angle: 45, velocity: 30, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                    className: 'px-2 py-1 rounded bg-white hover:bg-slate-50 text-[0.6875rem] font-semibold text-slate-600 border border-slate-500' }, '\u21BA ' + __alloT('stem.physics.iq_reset', 'Reset')),
                  (iq.log || []).length > 0 && h('span', { className: 'text-[0.625rem] text-slate-500 italic' }, (iq.log || []).length + __alloT('stem.physics.iq_logged', ' logged'))
                ),
                (iq.log || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto' },
                  h('table', { className: 'text-[0.625rem] w-full border-collapse text-slate-700' },
                    h('thead', null, h('tr', { className: 'bg-slate-100' },
                      ['g', __alloT('stem.physics.iq_col_angle', 'angle\u00B0'), 'v', __alloT('stem.physics.iq_col_range', 'range m'), __alloT('stem.physics.iq_col_state', 'state')].map(function(c, i) {
                        return h('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 border border-slate-200 text-left' }, c);
                      }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.g),
                        h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.a),
                        h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.v),
                        h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.r),
                        h('td', { className: 'px-2 py-1 border border-slate-200' }, o.st));
                    })))
                ),
                h('div', { className: 'mb-3' },
                  h('label', { htmlFor: 'gh-hypo', className: 'block text-[0.6875rem] font-bold text-slate-700 mb-1' }, __alloT('stem.physics.iq_hypothesis_label', 'Your hypothesis (free text \u2014 no right answer):')),
                  h('textarea', { id: 'gh-hypo', value: iq.hypothesis || '',
                    onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                    placeholder: __alloT('stem.physics.iq_hypothesis_placeholder', 'Is the optimal angle the same on every planet? Does doubling velocity double range? Type your own theory.'),
                    className: 'w-full text-[0.75rem] border border-slate-500 rounded p-2 font-mono leading-snug bg-white text-slate-800', rows: 3 })
                ),
                h('div', { className: 'mb-3' },
                  !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
                    className: 'px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-[0.6875rem] font-bold text-amber-800 border border-amber-300' },
                    '\uD83E\uDD14 ' + __alloT('stem.physics.iq_stuck_btn', "I'm stuck \u2014 show me questions to think about (no answers)")),
                  iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed' },
                    h('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.physics.iq_open_prompts', 'Open prompts \u2014 investigate by manipulating:')),
                    h('ul', { className: 'list-disc pl-5 space-y-1' },
                      h('li', null, __alloT('stem.physics.iq_prompt_1', 'Hold two sliders steady. Move the third. Watch what happens.')),
                      h('li', null, __alloT('stem.physics.iq_prompt_2', 'Find two different settings that both produce the same state. What do they share?')),
                      h('li', null, __alloT('stem.physics.iq_prompt_3', 'Try switching planets via the gravity slider. Does the best angle change?')),
                      h('li', null, __alloT('stem.physics.iq_prompt_4', 'Log several "optimal" observations. What angle do they share?')),
                      h('li', null, __alloT('stem.physics.iq_prompt_5', 'Real artillery uses tables not formulas. What does that suggest about the relationship between angle and range?'))),
                    h('div', { className: 'text-[0.625rem] italic text-amber-700 mt-2' }, __alloT('stem.physics.iq_no_answers', 'No answers. Investigate.')))
                ),
                h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('input', { type: 'checkbox', id: 'gh-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                    h('label', { htmlFor: 'gh-und', className: 'text-[0.75rem] font-bold text-emerald-800 cursor-pointer' },
                      __alloT('stem.physics.iq_understand_label', 'I think I understand the trade-offs \u2014 let me explain them in my own words'))),
                  iq.understood && h('textarea', { value: iq.explanation || '',
                    onChange: function(e) { setIQ({ explanation: e.target.value }); },
                    'aria-label': __alloT('stem.physics.iq_explanation_input', 'Projectile physics explanation'), placeholder: __alloT('stem.physics.iq_explain_placeholder', 'Explain in your own words: how do gravity, angle, and velocity interact? Why is 45\u00B0 special \u2014 or is it?'),
                    className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug', rows: 4 }),
                  iq.understood && (iq.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[0.625rem] italic text-emerald-700' },
                    '\u2713 ' + __alloT('stem.physics.iq_saved_note', 'Saved. Notice \u2014 nobody checked your answer.'))
                ),
                h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[0.625rem] italic text-slate-600' },
                  __alloT('stem.physics.iq_design_note', 'Design note: no numeric range target, no reveal button. Range quality is shown as a discrete 3-state marker, not a continuous gradient \u2014 by design, to discourage optimization-gaming behavior.'))
              );
            })(),


            // ── AI Physics Tutor (reading-level aware) ──
            (function () {
              var aiLevel = d.aiLevel || 'grade5';
              var aiText = d.aiExplain || '';
              var aiLoading = !!d.aiLoading;
              var aiError = d.aiError || '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.physics.level_plain', 'Plain'), hint: 'using simple everyday words and short sentences' },
                { id: 'grade5', label: __alloT('stem.physics.level_grade5', 'Grade 5'), hint: 'for a 5th grade student, brief and friendly' },
                { id: 'hs', label: __alloT('stem.physics.level_high_school', 'High School'), hint: 'for a high school physics student, with the right equations' }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { upd('aiError', __alloT('stem.physics.ai_not_available', 'AI tutor not available.')); return; }
                upd('aiLoading', true); upd('aiError', ''); upd('aiExplain', '');
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var prompt = 'Explain this projectile motion setup ' + lv.hint + '. '
                  + 'Launch angle: ' + ((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) + '\u00B0. Initial velocity: ' + (d.velocity || 25) + ' m/s. Gravity: ' + ((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8) + ' m/s\u00B2. Launch height above ground: ' + (d.launchHeight || 0) + ' m. Landing height: 0 m. Air resistance: ' + (d.airResist ? 'on' : 'off') + '. '
                  + 'In 3 short sentences: (1) What the projectile will do. (2) Which variable most affects the range (and why). (3) One real-world analogy at this setting. '
                  + 'No markdown, no bullets, no headings. Plain prose.';
                // Answer in the learner's interface language, not the prompt's.
                var _uiLang = '';
                try { _uiLang = (document.documentElement.getAttribute('lang') || '').trim(); } catch (e) {}
                if (_uiLang && !/^en(-|$)/i.test(_uiLang)) prompt += ' Write the entire answer in the language with BCP-47 code "' + _uiLang + '".';
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  upd('aiExplain', String(resp || '').trim()); upd('aiLoading', false);
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.physics.sr_explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  upd('aiLoading', false); upd('aiError', __alloT('stem.physics.ai_could_not_reach', 'Could not reach AI tutor. Try again in a moment.'));
                });
              }
              return React.createElement("div", { 'data-physics-learning-panel': 'tutor', className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, "\u2728 " + __alloT('stem.physics.explain_at_my_level', 'Explain at my level')),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.physics.aria_reading_level', 'Reading level') },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { upd('aiLevel', L.id); },
                        "aria-label": __alloT('stem.physics.aria_reading_level_prefix', 'Reading level: ') + L.label + (active ? __alloT('stem.physics.selected_suffix', ' (selected)') : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[0.625rem] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": __alloT('stem.physics.aria_generate_ai_prefix', 'Generate AI explanation at ') + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || __alloT('stem.physics.level_grade5', 'Grade 5')) + __alloT('stem.physics.aria_level_suffix', ' level'),
                    className: "px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 ' + __alloT('stem.physics.thinking', 'Thinking...') : (aiText ? '\uD83D\uDD04 ' + __alloT('stem.physics.re_explain', 'Re-explain') : '\uD83E\uDDE0 ' + __alloT('stem.physics.explain', 'Explain')))
                ),
                aiError && React.createElement("p", { className: "text-[0.6875rem] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[0.6875rem] italic text-slate-600" }, __alloT('stem.physics.ai_empty_hint', 'Click \u201CExplain\u201D for the AI tutor to describe what happens at the current angle, velocity, and gravity settings.'))
              );
            })()

          )
      })();
    }
  });


})();
