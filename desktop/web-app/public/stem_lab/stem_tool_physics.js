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
  function physFinite(v) { return typeof v === 'number' && isFinite(v); }
  function physValidLaunch(angle, vel, grav, mass) {
    return physFinite(angle) && angle >= 0 && angle <= 90 &&
      physFinite(vel) && vel >= 0 && vel <= 200 &&
      physFinite(grav) && grav >= 0 && physFinite(mass) && mass > 0;
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
  function physSimulate(angle, vel, grav, dragOn, mass) {
    mass = mass == null ? 1 : mass;
    if (!physValidLaunch(angle, vel, grav, mass)) return physOutcome('invalid');
    var rad = angle * Math.PI / 180;
    var b = { mX: 0, mY: 0, mVx: vel * Math.cos(rad), mVy: vel * Math.sin(rad), grav: grav, drag: dragOn ? PHYS_DRAG_K : 0, mass: mass, t: 0 };
    if (grav === 0 && b.mVy > 0) return physOutcome('no-impact');
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
  function physSolveVelocity(angle, R, grav, dragOn, mass) {
    mass = mass == null ? 1 : mass;
    if (!physValidLaunch(angle, 0, grav, mass) || !physFinite(R) || R < 0 || grav <= 0) return null;
    if (R === 0) return 0;
    if (angle <= 0 || angle >= 90) return null;
    var lo = 0, hi = 200;
    var upper = physSimulate(angle, hi, grav, dragOn, mass);
    if (upper.status !== 'landed' || upper.range < R) return null;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      var result = physSimulate(angle, mid, grav, dragOn, mass);
      if (result.status !== 'landed') return null;
      if (result.range < R) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Lowest angle that lands at range R for a fixed velocity (scan then
  // bisect on the rising side of R(θ)). Returns null if unreachable.
  function physSolveAngle(vel, R, grav, dragOn, mass) {
    mass = mass == null ? 1 : mass;
    if (!physValidLaunch(0, vel, grav, mass) || !physFinite(R) || R < 0 || grav <= 0) return null;
    if (R === 0) return 0;
    if (vel === 0) return null;
    // Locate the continuous maximum before solving its rising branch. An
    // integer-angle scan can incorrectly reject reachable near-maximum shots.
    var peakLo = 0, peakHi = 90;
    for (var a = 0; a < 32; a++) {
      var left = peakLo + (peakHi - peakLo) / 3, right = peakHi - (peakHi - peakLo) / 3;
      var leftResult = physSimulate(left, vel, grav, dragOn, mass);
      var rightResult = physSimulate(right, vel, grav, dragOn, mass);
      if (leftResult.status !== 'landed' || rightResult.status !== 'landed') return null;
      if (leftResult.range < rightResult.range) peakLo = left; else peakHi = right;
    }
    var bestA = (peakLo + peakHi) / 2;
    var best = physSimulate(bestA, vel, grav, dragOn, mass);
    if (best.status !== 'landed' || best.range + 1e-9 < R) return null;
    var lo = 0, hi = bestA;
    for (var i = 0; i < 30; i++) {
      var mid = (lo + hi) / 2;
      var result = physSimulate(mid, vel, grav, dragOn, mass);
      if (result.status !== 'landed') return null;
      if (result.range < R) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Investigation evidence is copied from completed runs, never recomputed
  // from current controls. Only primitives enter an archived observation.
  function physRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function physEvidenceRun(v) {
    if (!physRecord(v) || !Number.isSafeInteger(v.n) || v.n <= 0 || typeof v.drag !== 'boolean') return null;
    if (!['angle', 'vel', 'grav', 'mass', 'range', 'maxH', 'time'].every(function(k) { return physFinite(v[k]); })) return null;
    if (v.angle < 5 || v.angle > 85 || v.vel < 5 || v.vel > 50 || v.grav < 1 || v.grav > 25 || v.mass < 1 || v.mass > 10 || v.range < 0 || v.maxH < 0 || v.time <= 0) return null;
    var copy = { n: v.n, angle: v.angle, vel: v.vel, grav: v.grav, mass: v.mass, drag: v.drag, range: v.range, maxH: v.maxH, time: v.time };
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
    var units = { angle: 'deg', vel: 'm/s', grav: 'm/s²', drag: '', mass: 'kg' };
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
      angle: __alloT('stem.physics.report_angle', 'Angle'), vel: __alloT('stem.physics.report_speed', 'Launch speed'), grav: __alloT('stem.physics.report_gravity', 'Gravity'), drag: __alloT('stem.physics.report_drag', 'Air drag'), mass: __alloT('stem.physics.report_mass', 'Mass'),
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
        labels.angle + ': ' + r.angle + ' deg; ' + labels.vel + ': ' + r.vel + ' m/s; ' + labels.grav + ': ' + r.grav + ' m/s²; ' + labels.mass + ': ' + r.mass + ' kg',
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
    lines.push('', '## ' + __alloT('stem.physics.report_assumptions', 'Model assumptions'), __alloT('stem.physics.report_common_model', 'Launch and landing are at ground level. Gravity is uniform. Wind, spin, and buoyancy are omitted.'));
    if (saved.runs.some(function(r) { return !r.drag; })) lines.push(__alloT('stem.physics.report_vacuum_model', 'Drag off: only gravity acts; horizontal velocity is constant and mechanical energy is conserved.'));
    if (saved.runs.some(function(r) { return r.drag; })) lines.push(__alloT('stem.physics.report_drag_model', 'Drag on: force opposes velocity with magnitude k × speed². Drag acceleration is force divided by mass. Mechanical energy decreases.'), 'k = ' + PHYS_DRAG_K + ' kg/m');
    return lines.join('\n');
  }
  try {
    window.StemLab._physics = { DT: PHYS_DT, DRAG_K: PHYS_DRAG_K, step: physStep, simulate: physSimulate, solveVelocity: physSolveVelocity, solveAngle: physSolveAngle,
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
                angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false,
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
              if (v.angle <= 0 || v.angle >= 90 || v.vel <= 0 || v.grav <= 0 || v.mass <= 0 || v.range < 0 || v.maxH < 0 || v.time <= 0) return null;
              return Object.assign({}, v, { drag: v.drag === true });
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
            var state = Object.assign({}, raw, {
              gravity: num(raw.gravity, 1, 25, 9.8),
              mass: num(raw.mass, 1, 10, 1),
              angle: num(raw.angle, 5, 85, 45),
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
              var bounds = { angle: [5, 85], velocity: [5, 50], gravity: [1, 25], mass: [1, 10] };
              var validParameters = Object.keys(bounds).every(function(k) { return finite(parameters[k]) && parameters[k] >= bounds[k][0] && parameters[k] <= bounds[k][1]; });
              var validResults = ['vacuum', 'drag'].every(function(k) { var r = paired[k]; return isRecord(r) && finite(r.range) && r.range >= 0 && finite(r.maxH) && r.maxH >= 0 && finite(r.time) && r.time > 0; });
              if (validParameters && validResults) state.modelComparison = {
                parameters: { angle: parameters.angle, velocity: parameters.velocity, gravity: parameters.gravity, mass: parameters.mass },
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
            if (!d.targetMode || !d.targetPrev) upd('targetPrev', { gravity: d.gravity, airResist: !!d.airResist });
            // Apply level conditions
            upd('gravity', level.gravity);
            upd('airResist', level.drag);
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
            if (prev) { upd('gravity', prev.gravity); upd('airResist', !!prev.airResist); upd('targetPrev', null); }
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
            var settingsKey = [d.angle, d.velocity, d.gravity, d.mass, !!d.airResist, !!d.targetMode, d.targetRound, !!d.challengeActive, d.challengeTier, !!d.battleMode, d.battleRound].join('|');
            if (canvasEl._demo && canvasEl._demo.controlKey !== settingsKey && canvasEl._cancelSymmetryDemo) canvasEl._cancelSymmetryDemo();
            canvasEl._settingsKey = settingsKey;
            canvasEl._settings = {
              angle: d.angle, velocity: d.velocity, gravity: d.gravity, mass: d.mass,
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
                parameters: { angle: settings.angle, velocity: settings.velocity, gravity: settings.gravity, mass: settings.mass },
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
                      drag: !!summary.drag, mass: summary.mass,
                      range: summary.range, maxH: summary.maxH, time: summary.time,
                      modelVersion: summary.modelVersion || 'projectile-v2'
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
              energyConserved: __alloT('stem.physics.cv_energy_conserved', 'Energy (KE + PE conserved)'),
              ke: __alloT('stem.physics.cv_ke', 'KE'),
              pe: __alloT('stem.physics.cv_pe', 'PE'),
              dragLoss: __alloT('stem.physics.cv_drag_loss', 'Drag'),
              slow: __alloT('stem.physics.cv_slow', 'SLOW'),
              fast: __alloT('stem.physics.cv_fast', 'FAST'),
              dragOn: __alloT('stem.physics.cv_drag_on', 'Drag ON'),
              shots: __alloT('stem.physics.cv_shots', 'Shots: '),
              runPrefix: __alloT('stem.physics.cv_run_prefix', 'Run '),
              narrLaunchFirst: __alloT('stem.physics.narr_launch_first', 'Projectile launched at {angle} degrees with a velocity of {vel} meters per second. Gravity is {grav} meters per second squared.'),
              narrLaunchDrag: __alloT('stem.physics.narr_launch_drag', ' Air resistance is on.'),
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
            if (typeof canvasA11yDesc === 'function') canvasA11yDesc(canvasEl, __alloT('stem.physics.a11y_canvas_desc', 'Physics projectile simulator canvas. Cannon on left fires projectiles across a landscape with target flags at 50m, 100m, 200m, 300m. Shows trajectory trail, velocity vectors, and impact particles.'));
            // Canvas Narration: tool init
            if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'init', {
              first: __alloT('stem.physics.narr_init_first', 'Physics Simulator loaded. Cannon on the left fires projectiles. Adjust angle and velocity with sliders, then press Launch. Target flags at 50, 100, 200 and 300 meters.'),
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

            var groundYCSS = cH / dpr - 40; // CSS-px y of ground line

            function resizePhysicsCanvas() {
              var nextDpr = Math.min(2, window.devicePixelRatio || 1);
              var nextW = Math.max(1, Math.round(canvasEl.offsetWidth * nextDpr));
              var nextH = Math.max(1, Math.round(canvasEl.offsetHeight * nextDpr));
              if (nextW === cW && nextH === cH && dpr === nextDpr) return;
              dpr = nextDpr; cW = canvasEl.width = nextW; cH = canvasEl.height = nextH;
              baseScale = Math.max(0.01, (cW / dpr - 80) / 350);
              groundYCSS = cH / dpr - 40;
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

            function launch(settings) {
              var launchSettings = Object.assign({}, canvasEl._settings, settings || {});
              var constraint = launchSettings.targetMode && launchSettings.targetConstraint;
              if (constraint && constraint.type === 'fixedAngle') launchSettings.angle = constraint.value;
              if (constraint && constraint.type === 'fixedVelocity') launchSettings.velocity = constraint.value;

              var angle = launchSettings.angle;

              var vel = launchSettings.velocity;

              var grav = launchSettings.gravity;

              var drag = launchSettings.airResist ? PHYS_DRAG_K : 0;

              var mass = launchSettings.mass;
              canvasEl._accumulator = 0;
              canvasEl._prevTs = null;
              canvasEl._stepNext = false;

              var rad = angle * Math.PI / 180;

              // Pre-compute theoretical trajectory bounds (no-drag ideal)

              var theoreticalRange = (vel * vel * Math.sin(2 * rad)) / grav;

              var theoreticalMaxH = (vel * vel * Math.pow(Math.sin(rad), 2)) / (2 * grav);

              // Add 20% padding so trajectory doesn't hug edges

              var neededRangeM = theoreticalRange * 1.2;

              var neededHeightM = theoreticalMaxH * 1.2;

              // Scale needed to fit range horizontally (canvas width minus launcher offset and right padding)

              var availableW = cW / dpr - 80; // px available for range

              var availableH = cH / dpr - 80; // px available for height (ground + top margin)

              var scaleForRange = neededRangeM > 0 ? availableW / neededRangeM : baseScale;

              var scaleForHeight = neededHeightM > 0 ? availableH / neededHeightM : baseScale;

              // Use the more restrictive (smaller) scale, but never zoom in beyond baseline

              var dynScale = Math.min(baseScale, scaleForRange, scaleForHeight);

              scale = dynScale;

              canvasEl._dynScale = dynScale;

              // Ball state in METERS: mX = horizontal distance from launcher, mY = height above ground

              ball = {

                mX: 0, mY: 0,

                mVx: vel * Math.cos(rad), mVy: vel * Math.sin(rad),

                grav: grav, drag: drag, speed: vel,

                // Launch-time mass and energy: the energy bar measures drag
                // loss against THIS, not against wherever the sliders sit now.
                mass: mass, t: 0, E0: 0.5 * mass * vel * vel, maxH: 0, landed: false

              };

              // Trail tagging for comparison overlay: stash launch params
              // as named properties on the array itself so the draw loop can
              // color/label each trail by what produced it. Plain JS arrays
              // accept arbitrary properties, so trail[i] indexing still works.
              var _newTrail = [{ mX: 0, mY: 0, mVx: ball.mVx, mVy: ball.mVy, t: 0 }];
              _newTrail.angle = angle;
              _newTrail.velocity = vel;
              _newTrail.gravity = grav;
              _newTrail.drag = drag > 0;
              _newTrail.mass = mass;
              _newTrail.modelVersion = 'projectile-v2';
              _newTrail.prediction = launchSettings.prediction;
              _newTrail.mission = Object.freeze({ targetMode: !!launchSettings.targetMode, targetRound: launchSettings.targetRound, challengeTier: launchSettings.challengeTier });
              _newTrail.parameters = Object.freeze({ angle: angle, velocity: vel, gravity: grav, drag: drag > 0, mass: mass });
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
              var _lv = { angle: angle, vel: vel, grav: grav };
              if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'launch', {
                first: _fill(_Ll.narrLaunchFirst, _lv) + (drag > 0 ? _Ll.narrLaunchDrag : ''),
                repeat: _fill(_Ll.narrLaunchRepeat, _lv),
                terse: _fill(_Ll.narrLaunchTerse, _lv)
              }, { debounce: 500 });

            }

            canvasEl._launch = launch;
            canvasEl._cancelSymmetryDemo = function () {
              canvasEl._demo = null;
              if (canvasEl._demoTimer) clearTimeout(canvasEl._demoTimer);
              canvasEl._demoTimer = null;
            };
            canvasEl._cancelFlight = function () {
              canvasEl._cancelSymmetryDemo();
              launched = false; canvasEl._launched = false;
              canvasEl._accumulator = 0;
              schedulePhysicsFrame();
            };
            canvasEl._startSymmetryDemo = function () {
              if (!physAlive || canvasEl._settings.targetMode) return;
              canvasEl._cancelSymmetryDemo();
              var settings = Object.assign({}, canvasEl._settings, { angle: 30, airResist: false, prediction: null, targetMode: false, challengeTier: null });
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
              var flightTrail = launched && trails.length ? trails[trails.length - 1] : null;
              var displayParams = flightTrail ? { angle: flightTrail.angle, velocity: flightTrail.velocity, gravity: flightTrail.gravity, mass: flightTrail.mass, airResist: flightTrail.drag } : canvasEl._settings;

              ctx.clearRect(0, 0, cW, cH);

              // ── Sky gradient ──

              var skyGrad = ctx.createLinearGradient(0, 0, 0, cH);

              skyGrad.addColorStop(0, '#0c1445');

              skyGrad.addColorStop(0.3, '#1e3a5f');

              skyGrad.addColorStop(0.65, '#87ceeb');

              skyGrad.addColorStop(0.85, '#a7d8de');

              skyGrad.addColorStop(1, '#228B22');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, cW, cH);

              // ── Twinkling stars ──

              if (!canvasEl._stars) {

                canvasEl._stars = [];

                for (var si = 0; si < 60; si++) {

                  canvasEl._stars.push({

                    x: Math.random() * cW, y: Math.random() * cH * 0.35,

                    r: 0.4 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2

                  });

                }

              }

              canvasEl._stars.forEach(function (s) {

                var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + s.phase));

                ctx.globalAlpha = twinkle * (1 - s.y / (cH * 0.35));

                ctx.fillStyle = '#fff';

                ctx.beginPath(); ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2); ctx.fill();

              });

              ctx.globalAlpha = 1;

              // ── Sun glow ──

              var sunX = cW * 0.82, sunY = cH * 0.28;

              var sunG = ctx.createRadialGradient(sunX, sunY, 6 * dpr, sunX, sunY, 60 * dpr);

              sunG.addColorStop(0, 'rgba(255,250,200,0.9)');

              sunG.addColorStop(0.3, 'rgba(255,220,100,0.4)');

              sunG.addColorStop(0.7, 'rgba(255,180,60,0.1)');

              sunG.addColorStop(1, 'rgba(255,140,0,0)');

              ctx.fillStyle = sunG;

              ctx.beginPath(); ctx.arc(sunX, sunY, 60 * dpr, 0, Math.PI * 2); ctx.fill();

              // Sun core

              ctx.fillStyle = '#fffbe6';

              ctx.beginPath(); ctx.arc(sunX, sunY, 8 * dpr, 0, Math.PI * 2); ctx.fill();

              // ── Drifting clouds ──

              var cloudDrift = tick * 0.15;

              function drawCloud(cx, cy, sz) {

                ctx.save(); ctx.globalAlpha = 0.35;

                ctx.fillStyle = '#fff';

                [[0, 0, sz], [-sz * 0.7, sz * 0.15, sz * 0.7], [sz * 0.6, sz * 0.1, sz * 0.65], [-sz * 0.3, -sz * 0.3, sz * 0.5], [sz * 0.25, -sz * 0.25, sz * 0.55]].forEach(function (b) {

                  ctx.beginPath(); ctx.arc(cx + b[0], cy + b[1], b[2], 0, Math.PI * 2); ctx.fill();

                });

                ctx.restore();

              }

              drawCloud(((cloudDrift + cW * 0.25) % (cW + 100)) - 50, cH * 0.38, 18 * dpr);

              drawCloud(((cloudDrift * 0.7 + cW * 0.6) % (cW + 120)) - 60, cH * 0.42, 14 * dpr);

              drawCloud(((cloudDrift * 0.5 + cW * 0.1) % (cW + 80)) - 40, cH * 0.33, 12 * dpr);

              // Distant mountains silhouette

              ctx.fillStyle = 'rgba(30,58,95,0.3)';

              ctx.beginPath(); ctx.moveTo(0, cH * 0.72);

              for (var mx = 0; mx <= cW; mx += 20) {

                var mh = Math.sin(mx * 0.005) * cH * 0.08 + Math.sin(mx * 0.002 + 2) * cH * 0.05;

                ctx.lineTo(mx, cH * 0.72 - mh);

              }

              ctx.lineTo(cW, cH * 0.82); ctx.lineTo(0, cH * 0.82); ctx.closePath(); ctx.fill();

              // ── Ground ──

              var groundY = cH - 40 * dpr;

              var grdGrad = ctx.createLinearGradient(0, groundY, 0, cH);

              grdGrad.addColorStop(0, '#3a8a2e');

              grdGrad.addColorStop(0.1, '#2d6a1e');

              grdGrad.addColorStop(1, '#1a4a12');

              ctx.fillStyle = grdGrad;

              ctx.fillRect(0, groundY, cW, 40 * dpr);

              // Grass edge

              ctx.fillStyle = '#4ade80';

              for (var gi = 0; gi < cW; gi += 6 * dpr) {

                var gh = 3 + Math.sin(gi * 0.1 + tick * 0.02) * 2;

                ctx.fillRect(gi, groundY - gh * dpr, 2 * dpr, gh * dpr);

              }

              // ── Grid ──

              ctx.strokeStyle = 'rgba(255,255,255,0.05)';

              ctx.lineWidth = 1;

              for (var gx = 0; gx < cW; gx += 40 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, groundY); ctx.stroke(); }

              for (var gy = 0; gy < groundY; gy += 40 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }

              // ── Distance markers ──

              ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';

              ctx.textAlign = 'center';

              // Dynamic max range for distance markers based on current scale

              var maxMarkerDist = Math.ceil((cW / dpr - 80) / scale / 50) * 50;

              var markerStep = maxMarkerDist > 600 ? 200 : maxMarkerDist > 300 ? 100 : 50;

              for (var dm = markerStep; dm <= maxMarkerDist; dm += markerStep) {

                var dmx = mToScreenX(dm) * dpr;

                if (dmx > cW - 20) continue;

                ctx.strokeStyle = 'rgba(255,255,255,0.15)';

                ctx.setLineDash([3, 5]);

                ctx.beginPath(); ctx.moveTo(dmx, groundY); ctx.lineTo(dmx, groundY - 12 * dpr); ctx.stroke();

                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(255,255,255,0.3)';

                ctx.fillText(dm + 'm', dmx, groundY + 12 * dpr);

              }

              // ── Target flags ──

              targets.forEach(function (tgt) {

                var tx = mToScreenX(tgt.dist) * dpr;

                if (tx > cW - 10) return;

                // Flag pole

                if (tgt.hit) { ctx.save(); ctx.shadowColor = tgt.color; ctx.shadowBlur = 10; }
                ctx.strokeStyle = tgt.hit ? tgt.color : 'rgba(255,255,255,0.4)';

                ctx.lineWidth = 2 * dpr;

                ctx.beginPath(); ctx.moveTo(tx, groundY); ctx.lineTo(tx, groundY - 28 * dpr); ctx.stroke();

                // Flag

                ctx.fillStyle = tgt.hit ? tgt.color : tgt.color + '60';

                ctx.beginPath();

                ctx.moveTo(tx, groundY - 28 * dpr);

                ctx.lineTo(tx + 16 * dpr, groundY - 22 * dpr);

                ctx.lineTo(tx, groundY - 16 * dpr);

                ctx.closePath(); ctx.fill();
                if (tgt.hit) { ctx.restore(); }

                // Label

                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';

                ctx.fillStyle = tgt.hit ? '#ffffff' : 'rgba(255,255,255,0.5)';

                ctx.textAlign = 'center';

                ctx.fillText(tgt.label, tx, groundY - 30 * dpr);

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
                var _predictionKey = [_pAng, _pVel, _pGrav, _pDrag, displayParams.mass].join('|');
                if (!canvasEl._predictionCache || canvasEl._predictionCache.key !== _predictionKey) {
                  canvasEl._predictionCache = { key: _predictionKey, range: physSimulate(_pAng, _pVel, _pGrav, _pDrag, displayParams.mass).range };
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
                    // Label
                    ctx.font = 'bold ' + (4.5 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    var _predLbl = (_pDrag ? ((canvasEl._L || {}).predictedDrag || 'predicted R (with drag) = ') : ((canvasEl._L || {}).predicted || 'predicted R = ')) + _predR.toFixed(1) + 'm';
                    var _predLblW = ctx.measureText(_predLbl).width;
                    ctx.fillStyle = 'rgba(15,23,42,0.78)';
                    ctx.fillRect(_predX - _predLblW / 2 - 3 * dpr, groundY - 44 * dpr, _predLblW + 6 * dpr, 8 * dpr);
                    ctx.fillStyle = '#f0abfc';
                    ctx.fillText(_predLbl, _predX, groundY - 38 * dpr);
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
              if (ball && launched && ball.drag > 0) {
                var _gAng = displayParams.angle;
                var _gVel = displayParams.velocity;
                var _gGrav = displayParams.gravity;
                var _gRad = _gAng * Math.PI / 180;
                var _gVx = _gVel * Math.cos(_gRad);
                var _gVy0 = _gVel * Math.sin(_gRad);
                // Closed-form parabola: y(x) = x·tan(θ) − g·x² / (2v²cos²θ)
                var _gRange = (_gVel * _gVel * Math.sin(2 * _gRad)) / _gGrav;
                if (_gRange > 0 && isFinite(_gRange)) {
                  ctx.save();
                  ctx.globalAlpha = 0.45;
                  ctx.setLineDash([4 * dpr, 4 * dpr]);
                  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                  ctx.lineWidth = 1.2 * dpr;
                  ctx.beginPath();
                  var _gSteps = 40;
                  for (var _gi = 0; _gi <= _gSteps; _gi++) {
                    var _gx = (_gRange / _gSteps) * _gi;
                    var _gt = _gVx > 0 ? _gx / _gVx : 0;
                    var _gy = _gVy0 * _gt - 0.5 * _gGrav * _gt * _gt;
                    if (_gy < 0) _gy = 0;
                    var _gsX = mToScreenX(_gx) * dpr;
                    var _gsY = mToScreenY(_gy) * dpr;
                    if (_gi === 0) ctx.moveTo(_gsX, _gsY);
                    else ctx.lineTo(_gsX, _gsY);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);
                  // Label the ghost
                  var _gMidT = _gVy0 / _gGrav; // apex time
                  var _gMidX = _gVx * _gMidT;
                  var _gMidY = _gVy0 * _gMidT - 0.5 * _gGrav * _gMidT * _gMidT;
                  var _gMidSX = mToScreenX(_gMidX) * dpr;
                  var _gMidSY = mToScreenY(_gMidY) * dpr;
                  ctx.font = 'italic ' + (4 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'left';
                  ctx.fillStyle = 'rgba(15,23,42,0.78)';
                  var _gLbl = (canvasEl._L || {}).noDragIdeal || 'no-drag ideal';
                  var _gLblW = ctx.measureText(_gLbl).width;
                  ctx.fillRect(_gMidSX + 4 * dpr, _gMidSY - 10 * dpr, _gLblW + 6 * dpr, 7 * dpr);
                  ctx.fillStyle = 'rgba(255,255,255,0.85)';
                  ctx.fillText(_gLbl, _gMidSX + 7 * dpr, _gMidSY - 5 * dpr);
                  ctx.restore();
                }
              }

              // ── Trails with glow & speed-based color (stored in meters, convert at draw time) ──

              var overlayMode = canvasEl.dataset.showOverlay === 'true';

              trails.forEach(function (trail, idx) {

                if (trail.length < 2) return;

                var isActive = idx === trails.length - 1;

                // Overlay mode boosts past-trail alpha so the comparison is
                // legible, not a faint ghost. Off-mode keeps the original
                // faded look (single-trajectory focus).
                var alpha = isActive ? 1 : (overlayMode ? 0.65 : 0.18);

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
                    ctx.strokeStyle = 'hsla(' + trailHue + ', 80%, 55%, ' + alpha + ')';
                  } else {
                    var speed = Math.sqrt(Math.pow(p1.mVx || 0, 2) + Math.pow(p1.mVy || 0, 2));

                    var speedNorm = Math.min(1, speed / 60);

                    var r, g, b;

                    if (speedNorm > 0.5) { r = 239; g = Math.round(68 + (1 - speedNorm) * 2 * 187); b = 68; }

                    else { r = Math.round(34 + speedNorm * 2 * 205); g = Math.round(197 - speedNorm * 2 * 129); b = Math.round(94 - speedNorm * 2 * 26); }

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
                    ctx.strokeStyle = 'hsla(' + trailHue + ', 70%, 55%, 0.6)';
                    ctx.lineWidth = 1 * dpr;
                  } else {
                    ctx.globalAlpha = 0.35;
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                  }

                  ctx.setLineDash([2, 4]);

                  ctx.beginPath(); ctx.moveTo(apexSX, apexSY); ctx.lineTo(apexSX, groundY); ctx.stroke();

                  ctx.setLineDash([]);

                  if (overlayMode && trail.angle != null) {
                    // Lead with the run number so the trail and its row in the
                    // experiment log identify each other. Colour matches the
                    // row's swatch, but the number is the link a student reads.
                    var lbl = (trail.run ? (canvasEl._L && canvasEl._L.runPrefix ? canvasEl._L.runPrefix : 'Run ') + trail.run + ' · ' : '')
                      + 'θ=' + trail.angle + '°, v=' + trail.velocity + ' m/s';
                    ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    var lblY = apexSY - 8 * dpr;
                    var lblW = ctx.measureText(lbl).width;
                    // Backdrop chip so the label reads against any sky/ground
                    ctx.fillStyle = 'rgba(15,23,42,0.78)';
                    ctx.fillRect(apexSX - lblW / 2 - 3 * dpr, lblY - 6 * dpr, lblW + 6 * dpr, 8 * dpr);
                    ctx.fillStyle = 'hsl(' + trailHue + ', 80%, 70%)';
                    ctx.fillText(lbl, apexSX, lblY);
                  } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.font = (4 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText((canvasEl._L || {}).apex || 'apex', apexSX, apexSY - 6 * dpr);
                  }

                  ctx.restore();

                }

              });

              // ── Apex annotation (drawn after trails so it sits on top) ──
              // When the ball crosses Vy=0, we snapshot the apex point with
              // its world coords + time + horizontal velocity. Tag fades out
              // ~3 sec after apex so it doesn't crowd subsequent flights.
              if (canvasEl._apex && tick < canvasEl._apex.fadeAt) {
                var _ap = canvasEl._apex;
                var _apFade = Math.max(0, (canvasEl._apex.fadeAt - tick) / 90);
                var _apSX = mToScreenX(_ap.mX) * dpr;
                var _apSY = mToScreenY(_ap.mY) * dpr;
                ctx.save();
                ctx.globalAlpha = _apFade;
                // Crosshair pin
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath();
                ctx.arc(_apSX, _apSY, 5 * dpr, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(_apSX - 8 * dpr, _apSY); ctx.lineTo(_apSX + 8 * dpr, _apSY);
                ctx.moveTo(_apSX, _apSY - 8 * dpr); ctx.lineTo(_apSX, _apSY + 8 * dpr);
                ctx.stroke();
                // Info chip
                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';
                ctx.textAlign = 'left';
                var _apLines = [
                  (canvasEl._L || {}).apexCap || '▲ APEX',
                  'H = ' + _ap.mY.toFixed(1) + ' m',
                  't = ' + _ap.tSec.toFixed(2) + ' s',
                  'Vy = 0  (Vx = ' + _ap.vx.toFixed(1) + ' m/s)'
                ];
                var _apW = 0;
                _apLines.forEach(function (ln) {
                  var w = ctx.measureText(ln).width;
                  if (w > _apW) _apW = w;
                });
                var _apChipX = _apSX + 12 * dpr;
                var _apChipY = _apSY - 28 * dpr;
                ctx.fillStyle = 'rgba(15,23,42,0.85)';
                ctx.fillRect(_apChipX - 4 * dpr, _apChipY - 6 * dpr, _apW + 10 * dpr, _apLines.length * 7 * dpr + 4 * dpr);
                _apLines.forEach(function (ln, _i) {
                  ctx.fillStyle = _i === 0 ? '#fbbf24' : '#e2e8f0';
                  ctx.fillText(ln, _apChipX, _apChipY + _i * 7 * dpr);
                });
                ctx.restore();
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

                ctx.save();

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

                // Velocity vector arrow (scaled for visual, in screen space)

                var arrowLen = Math.min(ball.speed * 0.6, 30); // cap arrow length in CSS px

                var velAngle = Math.atan2(-ball.mVy, ball.mVx);

                var arrowEndX = ballScreenX + Math.cos(velAngle) * arrowLen;

                var arrowEndY = ballScreenY + Math.sin(velAngle) * arrowLen;

                ctx.strokeStyle = '#60a5fa';

                ctx.lineWidth = 2 * dpr;

                ctx.beginPath(); ctx.moveTo(bx, by);

                ctx.lineTo(arrowEndX * dpr, arrowEndY * dpr); ctx.stroke();

                // Arrow head

                var aAngle = velAngle;

                ctx.beginPath();

                ctx.moveTo(arrowEndX * dpr, arrowEndY * dpr);

                ctx.lineTo((arrowEndX - Math.cos(aAngle - 0.4) * 6) * dpr, (arrowEndY - Math.sin(aAngle - 0.4) * 6) * dpr);

                ctx.moveTo(arrowEndX * dpr, arrowEndY * dpr);

                ctx.lineTo((arrowEndX - Math.cos(aAngle + 0.4) * 6) * dpr, (arrowEndY - Math.sin(aAngle + 0.4) * 6) * dpr);

                ctx.stroke();

                // ── Vx / Vy component vectors (dashed) ──
                if (canvasEl.dataset.showVectors === 'true') {
                  var compLen = 0.6; // same scale as main arrow
                  // Vx horizontal component (green)
                  var vxLen = Math.min(Math.abs(ball.mVx) * compLen, 30);
                  var vxEndX = ballScreenX + Math.sign(ball.mVx) * vxLen;
                  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(vxEndX * dpr, by); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.font = (4.5 * dpr) + 'px sans-serif'; ctx.fillStyle = '#22c55e'; ctx.textAlign = 'center';
                  ctx.fillText('Vx=' + Math.abs(ball.mVx).toFixed(1), (ballScreenX + vxLen/2) * dpr, by + 10 * dpr);

                  // Vy vertical component (violet)
                  var vyLen = Math.min(Math.abs(ball.mVy) * compLen, 30);
                  var vyEndY = ballScreenY + (ball.mVy > 0 ? -vyLen : vyLen);
                  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(bx, vyEndY * dpr); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#a855f7';
                  ctx.fillText('Vy=' + Math.abs(ball.mVy).toFixed(1), bx + 16 * dpr, ((ballScreenY + vyEndY) / 2) * dpr);

                  // Acceleration vector (gravity arrow, red, pointing down)
                  var gArrowLen = Math.min(ball.grav * 1.5, 25);
                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([2, 3]);
                  ctx.beginPath(); ctx.moveTo(bx, by);
                  ctx.lineTo(bx, (ballScreenY + gArrowLen) * dpr); ctx.stroke();
                  ctx.setLineDash([]);
                  // arrowhead
                  ctx.beginPath();
                  ctx.moveTo(bx, (ballScreenY + gArrowLen) * dpr);
                  ctx.lineTo(bx - 3 * dpr, (ballScreenY + gArrowLen - 4) * dpr);
                  ctx.moveTo(bx, (ballScreenY + gArrowLen) * dpr);
                  ctx.lineTo(bx + 3 * dpr, (ballScreenY + gArrowLen - 4) * dpr);
                  ctx.stroke();
                  ctx.fillStyle = '#ef4444'; ctx.font = (4 * dpr) + 'px sans-serif';
                  ctx.fillText('g=' + ball.grav.toFixed(1), bx + 12 * dpr, (ballScreenY + gArrowLen) * dpr);
                }

                // Speed label on ball

                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';

                ctx.fillStyle = '#fef3c7';

                ctx.textAlign = 'center';

                ctx.fillText(ball.speed.toFixed(0) + ' m/s', bx, (ballScreenY - 12) * dpr);

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
                    drag: ball.drag > 0, mass: ball.mass || 1,
                    prediction: _trL ? _trL.prediction : null, mission: _trL ? _trL.mission : null,
                    modelVersion: 'projectile-v2'
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

              // ── Landing markers (crater + label) ──

              landingMarkers.forEach(function (lm) {

                lm.alpha *= 0.995;

                if (lm.ring > 0) lm.ring = Math.max(0, lm.ring - 0.015);

                if (lm.alpha < 0.03) return;

                var lmx = mToScreenX(lm.mX) * dpr, lmy = groundY;

                // Shockwave ring

                if (lm.ring > 0.2) {

                  ctx.save(); ctx.globalAlpha = lm.ring * 0.5;

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5 * dpr;

                  var ringR = (1 - lm.ring) * 30 * dpr;

                  ctx.beginPath(); ctx.ellipse(lmx, lmy, ringR, ringR * 0.25, 0, 0, Math.PI * 2); ctx.stroke();

                  ctx.restore();

                }

                // Crater scorch mark

                ctx.save(); ctx.globalAlpha = lm.alpha * 0.7;

                var crGrad = ctx.createRadialGradient(lmx, lmy, 0, lmx, lmy, 6 * dpr);

                crGrad.addColorStop(0, 'rgba(40,20,5,0.6)');

                crGrad.addColorStop(0.5, 'rgba(80,50,20,0.3)');

                crGrad.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = crGrad;

                ctx.beginPath(); ctx.ellipse(lmx, lmy, 6 * dpr, 2.5 * dpr, 0, 0, Math.PI * 2); ctx.fill();

                ctx.restore();

                // Distance label

                if (lm.dist) {

                  ctx.save(); ctx.globalAlpha = Math.min(lm.alpha, 0.7);

                  ctx.font = 'bold ' + (4.5 * dpr) + 'px sans-serif';

                  ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';

                  ctx.fillText(lm.dist + 'm', lmx, lmy + 10 * dpr);

                  ctx.restore();

                }

              });

              // ── Enhanced Launcher Cannon ──

              var angle = parseFloat(canvasEl.dataset.angle || '45');

              var rad = angle * Math.PI / 180;

              var cxC = 40, cyC = cH / dpr - 40;

              // Wheel / carriage

              ctx.save();

              ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3 * dpr;

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 10 * dpr, 0, Math.PI * 2); ctx.stroke();

              // Wheel spokes

              for (var ws = 0; ws < 6; ws++) {

                var wa = ws * Math.PI / 3 + tick * 0.005;

                ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5 * dpr;

                ctx.beginPath();

                ctx.moveTo(cxC * dpr, cyC * dpr);

                ctx.lineTo((cxC + Math.cos(wa) * 9) * dpr, (cyC + Math.sin(wa) * 9) * dpr);

                ctx.stroke();

              }

              // Wheel hub

              ctx.fillStyle = '#475569';

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 3 * dpr, 0, Math.PI * 2); ctx.fill();

              // Barrel with metallic gradient

              ctx.save();

              ctx.translate(cxC * dpr, cyC * dpr);

              ctx.rotate(-rad);

              var barrelLen = 38 * dpr;

              var barrelW = 5 * dpr;

              var mbGrad = ctx.createLinearGradient(0, -barrelW, 0, barrelW);

              mbGrad.addColorStop(0, '#94a3b8');

              mbGrad.addColorStop(0.3, '#cbd5e1');

              mbGrad.addColorStop(0.5, '#f1f5f9');

              mbGrad.addColorStop(0.7, '#cbd5e1');

              mbGrad.addColorStop(1, '#94a3b8');

              ctx.fillStyle = mbGrad;

              ctx.beginPath();

              ctx.moveTo(4 * dpr, -barrelW);

              ctx.lineTo(barrelLen, -barrelW * 0.8);

              ctx.lineTo(barrelLen, barrelW * 0.8);

              ctx.lineTo(4 * dpr, barrelW);

              ctx.closePath(); ctx.fill();

              // Muzzle ring

              ctx.strokeStyle = '#475569'; ctx.lineWidth = 2 * dpr;

              ctx.beginPath(); ctx.moveTo(barrelLen, -barrelW * 0.9); ctx.lineTo(barrelLen, barrelW * 0.9); ctx.stroke();

              // Barrel bands (decorative)

              ctx.strokeStyle = 'rgba(71,85,105,0.5)'; ctx.lineWidth = 1 * dpr;

              ctx.beginPath(); ctx.moveTo(barrelLen * 0.35, -barrelW * 0.9); ctx.lineTo(barrelLen * 0.35, barrelW * 0.9); ctx.stroke();

              ctx.beginPath(); ctx.moveTo(barrelLen * 0.65, -barrelW * 0.85); ctx.lineTo(barrelLen * 0.65, barrelW * 0.85); ctx.stroke();

              ctx.restore();

              // Cannon base / housing

              ctx.fillStyle = '#334155';

              ctx.beginPath();

              ctx.moveTo((cxC - 14) * dpr, cyC * dpr);

              ctx.quadraticCurveTo(cxC * dpr, (cyC - 16) * dpr, (cxC + 14) * dpr, cyC * dpr);

              ctx.closePath(); ctx.fill();

              ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();

              // Rivet dots

              ctx.fillStyle = '#94a3b8';

              [[-8, -3], [8, -3], [0, -10]].forEach(function (rv) {

                ctx.beginPath(); ctx.arc((cxC + rv[0]) * dpr, (cyC + rv[1]) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

              });

              // Fuse spark

              var sparkX = (cxC - 6) * dpr, sparkY = (cyC - 14) * dpr;

              ctx.fillStyle = 'rgba(251,191,36,' + (0.5 + 0.5 * Math.sin(tick * 0.15)) + ')';

              ctx.beginPath(); ctx.arc(sparkX, sparkY, (2 + Math.sin(tick * 0.2)) * dpr, 0, Math.PI * 2); ctx.fill();

              ctx.restore();

              // Angle arc

              ctx.strokeStyle = 'rgba(251,191,36,0.4)';

              ctx.lineWidth = 1.5 * dpr;

              ctx.beginPath(); ctx.arc(cxC * dpr, cyC * dpr, 20 * dpr, -rad, 0); ctx.stroke();

              ctx.font = (5 * dpr) + 'px sans-serif';

              ctx.fillStyle = '#fbbf24';

              ctx.textAlign = 'left';

              ctx.fillText(angle + '\u00B0', (cxC + 22) * dpr, (cyC - 5) * dpr);

              // ── Glassmorphic HUD ──

              ctx.save();

              var hudX = 4 * dpr, hudY = 4 * dpr, hudW = 150 * dpr, hudH = 50 * dpr, hudR = 8 * dpr;

              ctx.fillStyle = 'rgba(15,23,42,0.7)';

              ctx.beginPath();

              ctx.moveTo(hudX + hudR, hudY); ctx.lineTo(hudX + hudW - hudR, hudY);

              ctx.arcTo(hudX + hudW, hudY, hudX + hudW, hudY + hudR, hudR);

              ctx.lineTo(hudX + hudW, hudY + hudH - hudR);

              ctx.arcTo(hudX + hudW, hudY + hudH, hudX + hudW - hudR, hudY + hudH, hudR);

              ctx.lineTo(hudX + hudR, hudY + hudH);

              ctx.arcTo(hudX, hudY + hudH, hudX, hudY + hudH - hudR, hudR);

              ctx.lineTo(hudX, hudY + hudR);

              ctx.arcTo(hudX, hudY, hudX + hudR, hudY, hudR);

              ctx.closePath(); ctx.fill();

              // Border glow

              ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.lineWidth = 1; ctx.stroke();

              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

              ctx.textAlign = 'left';

              ctx.fillStyle = '#fbbf24';

              ctx.fillText('\u26A1 ' + displayParams.angle + '\u00B0  v=' + displayParams.velocity + 'm/s', 10 * dpr, 18 * dpr);

              ctx.fillStyle = '#94a3b8'; ctx.font = (6 * dpr) + 'px sans-serif';

              ctx.fillText('g=' + displayParams.gravity + 'm/s\u00B2', 10 * dpr, 30 * dpr);

              if (displayParams.airResist) {

                ctx.fillStyle = '#f97316'; ctx.font = 'bold ' + (5.5 * dpr) + 'px sans-serif';

                ctx.fillText('\uD83C\uDF2C\uFE0F ' + ((canvasEl._L || {}).dragOn || 'Drag ON'), 10 * dpr, 42 * dpr);
                // Wind direction indicator arrow
                var windArrowX = 120 * dpr, windArrowY = 38 * dpr;
                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath(); ctx.moveTo(windArrowX, windArrowY);
                ctx.lineTo(windArrowX - 18 * dpr, windArrowY); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(windArrowX - 18 * dpr, windArrowY);
                ctx.lineTo(windArrowX - 14 * dpr, windArrowY - 3 * dpr);
                ctx.moveTo(windArrowX - 18 * dpr, windArrowY);
                ctx.lineTo(windArrowX - 14 * dpr, windArrowY + 3 * dpr);
                ctx.stroke();

              }

              // Shot counter

              ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = (5 * dpr) + 'px sans-serif'; ctx.textAlign = 'right';

              ctx.fillText(((canvasEl._L || {}).shots || 'Shots: ') + trails.length, (hudX + hudW - 6 * dpr) / dpr * dpr, 42 * dpr);

              ctx.restore();

              // ── Energy bar (KE vs PE vs Drag Loss) ──
              if (ball && canvasEl.dataset.showEnergy === 'true') {
                var _Le = canvasEl._L || {};
                // Launch-time mass and energy, so moving a slider mid-flight
                // cannot invent a phantom drag loss or overflow the bar.
                var mass = ball.mass || parseFloat(canvasEl.dataset.mass || 1);
                var dragOn = ball.drag > 0;
                var KE = 0.5 * mass * ball.speed * ball.speed;
                var PE = mass * ball.grav * Math.max(0, ball.mY);
                var totalE = ball.E0 || (0.5 * mass * (parseFloat(canvasEl.dataset.velocity || 25)) * (parseFloat(canvasEl.dataset.velocity || 25)));
                // With NO drag, mechanical energy is conserved: KE + PE = totalE throughout the flight.
                // Only attribute a red "Drag" segment when drag is actually ON — otherwise tiny Euler-
                // integration drift used to render as a phantom red loss. Clamp totalE up to KE+PE so
                // the bar never visually overflows from that drift.
                var dragLoss = dragOn ? Math.max(0, totalE - KE - PE) : 0;
                if (!dragOn) totalE = Math.max(totalE, KE + PE);
                var ebX = (cW / dpr - 160) * dpr, ebY = (cH / dpr - 65) * dpr;
                var ebW = 140 * dpr, ebH = 14 * dpr;
                // Background
                ctx.fillStyle = 'rgba(15,23,42,0.7)';
                ctx.fillRect(ebX - 4 * dpr, ebY - 14 * dpr, ebW + 8 * dpr, ebH + 28 * dpr);
                ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
                ctx.fillStyle = '#94a3b8'; ctx.fillText(dragOn ? (_Le.energy || 'Energy') : (_Le.energyConserved || 'Energy (KE + PE conserved)'), ebX, ebY - 4 * dpr);
                // Stacked bar
                var keW = totalE > 0 ? (KE / totalE) * ebW : 0;
                var peW = totalE > 0 ? (PE / totalE) * ebW : 0;
                var dlW = totalE > 0 ? (dragLoss / totalE) * ebW : 0;
                ctx.fillStyle = '#3b82f6'; ctx.fillRect(ebX, ebY, keW, ebH); // KE blue
                ctx.fillStyle = '#22c55e'; ctx.fillRect(ebX + keW, ebY, peW, ebH); // PE green
                ctx.fillStyle = '#ef4444'; ctx.fillRect(ebX + keW + peW, ebY, dlW, ebH); // Drag red
                // Labels
                ctx.font = (4 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
                ctx.fillStyle = '#93c5fd'; ctx.fillText((_Le.ke || 'KE') + ' ' + KE.toFixed(0) + 'J', ebX, ebY + ebH + 10 * dpr);
                ctx.fillStyle = '#86efac'; ctx.fillText((_Le.pe || 'PE') + ' ' + PE.toFixed(0) + 'J', ebX + 46 * dpr, ebY + ebH + 10 * dpr);
                if (dragLoss > 1) { ctx.fillStyle = '#fca5a5'; ctx.fillText((_Le.dragLoss || 'Drag') + ' ' + dragLoss.toFixed(0) + 'J', ebX + 92 * dpr, ebY + ebH + 10 * dpr); }
              }

              // ── Trail color legend (glassmorphic) ──

              ctx.save();

              var legX = (cW / dpr - 94) * dpr, legY = 4 * dpr, legW = 90 * dpr, legH = 20 * dpr;

              ctx.fillStyle = 'rgba(15,23,42,0.6)';

              ctx.beginPath();

              ctx.moveTo(legX + 6 * dpr, legY); ctx.lineTo(legX + legW - 6 * dpr, legY);

              ctx.arcTo(legX + legW, legY, legX + legW, legY + 6 * dpr, 6 * dpr);

              ctx.lineTo(legX + legW, legY + legH - 6 * dpr);

              ctx.arcTo(legX + legW, legY + legH, legX + legW - 6 * dpr, legY + legH, 6 * dpr);

              ctx.lineTo(legX + 6 * dpr, legY + legH);

              ctx.arcTo(legX, legY + legH, legX, legY + legH - 6 * dpr, 6 * dpr);

              ctx.lineTo(legX, legY + 6 * dpr);

              ctx.arcTo(legX, legY, legX + 6 * dpr, legY, 6 * dpr);

              ctx.closePath(); ctx.fill();

              ctx.font = (5 * dpr) + 'px sans-serif';

              var _Lg = canvasEl._L || {};
              ctx.fillStyle = '#22c55e'; ctx.textAlign = 'left'; ctx.fillText(_Lg.slow || 'SLOW', legX + 4 * dpr, legY + 14 * dpr);

              var lgw = 36 * dpr;

              var lgx = legX + 28 * dpr;

              var lg = ctx.createLinearGradient(lgx, 0, lgx + lgw, 0);

              lg.addColorStop(0, '#22c55e'); lg.addColorStop(0.5, '#eab308'); lg.addColorStop(1, '#ef4444');

              ctx.fillStyle = lg;

              ctx.fillRect(lgx, legY + 9 * dpr, lgw, 4 * dpr);

              ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.fillText(_Lg.fast || 'FAST', legX + legW - 4 * dpr, legY + 14 * dpr);

              ctx.restore();


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
                        ctx.font = 'bold ' + (5 * dpr) + 'px sans-serif';
                        ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';
                        ctx.fillText(tgt.x + 'm', tx, ty - crH - 4 * dpr);
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

                // Constraint badge near cannon
                var conStr = canvasEl.dataset.constraintType;
                var conVal = canvasEl.dataset.constraintValue;
                if (conStr) {
                  ctx.save();
                  var bx = 10 * dpr, by2 = 54 * dpr;
                  ctx.fillStyle = 'rgba(239,68,68,0.85)';
                  ctx.beginPath();
                  var bw = 110 * dpr, bh = 16 * dpr, br2 = 4 * dpr;
                  ctx.moveTo(bx + br2, by2); ctx.lineTo(bx + bw - br2, by2);
                  ctx.arcTo(bx + bw, by2, bx + bw, by2 + br2, br2);
                  ctx.lineTo(bx + bw, by2 + bh - br2);
                  ctx.arcTo(bx + bw, by2 + bh, bx + bw - br2, by2 + bh, br2);
                  ctx.lineTo(bx + br2, by2 + bh);
                  ctx.arcTo(bx, by2 + bh, bx, by2 + bh - br2, br2);
                  ctx.lineTo(bx, by2 + br2);
                  ctx.arcTo(bx, by2, bx + br2, by2, br2);
                  ctx.closePath(); ctx.fill();
                  ctx.font = 'bold ' + (5.5 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
                  var lockLabel = conStr === 'fixedAngle' ? '\u{1F512} \u03B8 = ' + conVal + '\u00B0' : '\u{1F512} v = ' + conVal + ' m/s';
                  ctx.fillText(lockLabel, bx + 4 * dpr, by2 + 12 * dpr);
                  ctx.restore();
                }
              }

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
            { k: 'mass', label: __alloT('stem.physics.var_mass', 'mass') }
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
            if (prev.drag || cur.drag) return null;
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
            var lines = ['run,angle_deg,velocity_mps,gravity_mps2,air_drag,mass_kg,range_m,max_height_m,flight_time_s'];
            log.forEach(function (r) {
              lines.push([r.n, r.angle, r.vel, r.grav, r.drag ? 'on' : 'off', r.mass, r.range.toFixed(2), r.maxH.toFixed(2), r.time.toFixed(3)].join(','));
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
            var lines = ['# run=' + (tr.run == null ? '' : tr.run) + ',angle_deg=' + tr.angle + ',velocity_mps=' + tr.velocity + ',gravity_mps2=' + tr.gravity + ',air_drag=' + (tr.drag ? 'on' : 'off') + ',mass_kg=' + tr.mass + ',model=' + (tr.modelVersion || 'projectile-v1')];
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
            (ctx.renderTutorial || function () { return null; })('physics', ctx._tutPhysics || []),


            React.createElement("section", { "data-physics-command": "true", className: "mb-4 overflow-hidden rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950 text-white shadow-xl" },
              React.createElement("div", { className: "p-4 sm:p-5" },
                React.createElement("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" },
                  React.createElement("div", { className: "min-w-0" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("button", { onClick: () => setStemLabTool(null), className: "shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300", 'aria-label': __alloT('stem.physics.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                      React.createElement("span", { className: "rounded-full bg-cyan-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-cyan-200/30" }, __alloT('stem.physics.projectile_mission', 'Projectile mission'))
                    ),
                    React.createElement("h3", { className: "mt-3 text-xl font-black tracking-tight sm:text-2xl" }, "\u26A1 " + __alloT('stem.physics.physics_simulator', 'Physics Simulator')),
                    React.createElement("p", { className: "mt-1 max-w-2xl text-sm leading-6 text-cyan-100" }, __alloT('stem.physics.tool_intro_blurb', 'Investigate how launch conditions shape motion, then support each claim with trajectory evidence.')),
                    React.createElement("div", { className: "mt-3 rounded-xl border border-white/15 bg-white/10 p-3" },
                      React.createElement("p", { className: "text-[0.625rem] font-black uppercase tracking-[0.16em] text-cyan-200" }, __alloT('stem.physics.recommended_next_move', 'Recommended next move')),
                      React.createElement("p", { className: "mt-1 text-sm font-semibold text-white" }, physicsNext),
                      React.createElement("button", {
                        type: "button",
                        "data-physics-next-cta": "true",
                        onClick: physicsNextStep.run,
                        className: "mt-2 rounded-lg border border-cyan-300/50 bg-cyan-300/15 px-2.5 py-1 text-[0.6875rem] font-bold text-cyan-50 transition hover:bg-cyan-300/25 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      }, physicsNextStep.cta + " →")
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2 lg:w-[22rem]" },
                    [
                      { label: __alloT('stem.physics.metric_angle', 'Angle'), value: String((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) + '\u00B0' },
                      { label: __alloT('stem.physics.metric_speed', 'Speed'), value: String(d.velocity || 25) + ' m/s' },
                      { label: __alloT('stem.physics.metric_launches', 'Launches'), value: String(d.launchCount || 0) }
                    ].map(function(metric) {
                      return React.createElement("div", { key: metric.label, className: "min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center" },
                        React.createElement("div", { className: "truncate text-sm font-black text-white", title: metric.value }, metric.value),
                        React.createElement("div", { className: "mt-1 text-[0.625rem] leading-snug font-bold uppercase tracking-wider text-cyan-200" }, metric.label)
                      );
                    })
                  )
                ),
                React.createElement("ol", { className: "mt-4 grid gap-2 text-xs sm:grid-cols-3", "aria-label": __alloT('stem.physics.investigation_pathway', 'Projectile investigation pathway') },
                  [
                    { n: '1', title: __alloT('stem.physics.step_predict', 'Estimate'), detail: __alloT('stem.physics.step_predict_detail', 'Use the variables to estimate a range.') },
                    { n: '2', title: __alloT('stem.physics.step_launch', 'Launch'), detail: __alloT('stem.physics.step_launch_detail', 'Observe motion and collect evidence.') },
                    { n: '3', title: __alloT('stem.physics.step_explain', 'Explain'), detail: __alloT('stem.physics.step_explain_detail', 'Connect forces to the trajectory.') }
                  ].map(function(step) {
                    return React.createElement("li", { key: step.n, className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5" },
                      React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-black text-slate-950" }, step.n),
                      React.createElement("span", null, React.createElement("strong", { className: "block text-white" }, step.title), React.createElement("span", { className: "text-cyan-200" }, step.detail))
                    );
                  })
                )
              )
            ),

            React.createElement("div", { id: "physics-fs-wrap", className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: d.physFsMode ? { position: 'relative', height: '70vh' } : { height: "420px" } },

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

                "data-angle": d.angle, "data-velocity": d.velocity, "data-gravity": d.gravity,

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

                  else if (e.key === 'ArrowDown') { e.preventDefault(); if (!angleLocked) upd('angle', Math.max(5, ((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) - 5)); }

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

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              React.createElement("button", { "aria-label": __alloT('stem.physics.launch', 'Launch!'),

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

              React.createElement("button", { "aria-label": __alloT('stem.physics.aria_air_drag_currently', 'Air drag, currently ') + (d.airResist ? __alloT('stem.physics.state_on_lc', 'on') : __alloT('stem.physics.state_off_lc', 'off')) + __alloT('stem.physics.aria_click_to_toggle', '. Click to toggle.'),

                "aria-pressed": !!d.airResist,

                onClick: function () { upd('airResist', !d.airResist); },

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.airResist ? 'bg-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-200')

              }, "\uD83C\uDF2C\uFE0F " + __alloT('stem.physics.label_air_drag', 'Air Drag ') + (d.airResist ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF'))),

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
                    onClick: function () { upd('simSpeed', sp.v); },
                    className: "px-2.5 py-1.5 text-xs font-bold transition-all " + (isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')
                  }, sp.label);
                }),
                // Step button — only useful when paused. Sets a one-shot
                // flag on the canvas that the draw loop consumes to advance
                // exactly one physics tick before re-pausing. Lets students
                // walk through flight a frame at a time.
                React.createElement("button", {
                  type: "button", style: { minHeight: 44 }, "data-physics-step": true,
                  "aria-label": __alloT('stem.physics.aria_step_frame', 'Step one frame forward (only useful when paused)'),
                  disabled: ((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0) !== 0,
                  onClick: function () {
                    var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
                    if (cv) {
                      cv._stepNext = true;
                      if (cv._physScheduleFrame) cv._physScheduleFrame();
                    }
                  },
                  className: "px-2.5 py-1.5 text-xs font-bold transition-all border-l border-slate-300 " +
                    (((typeof d.simSpeed === 'number' && isFinite(d.simSpeed)) ? d.simSpeed : 1.0) === 0
                      ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                      : 'bg-slate-100 text-slate-600 cursor-not-allowed')
                }, "⏭ " + __alloT('stem.physics.step_frame', 'Step one frame')),
                React.createElement('button', { type: 'button', 'data-physics-inspect': true, disabled: d.simSpeed !== 0, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold bg-white border border-indigo-300 text-indigo-700 disabled:opacity-50', onClick: function() {
                  if (d.simSpeed !== 0) return;
                  var cv = document.getElementById('physicsCanvas');
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
                typeof d.inspectionSnapshot === 'string' && d.inspectionSnapshot && React.createElement('p', { 'data-physics-inspection': true, role: 'status', 'aria-live': 'polite', style: { flexBasis: '100%' }, className: 'text-xs leading-relaxed text-indigo-800 rounded-lg bg-white p-3 border border-indigo-200' }, d.inspectionSnapshot),
                React.createElement('p', { id: 'physics-playback-help', style: { flexBasis: '100%' }, className: 'text-xs text-slate-600' }, __alloT('stem.physics.playback_help', 'Changes animation pace, not launch velocity. Pause to inspect the flight, then use Step one frame to advance it.'))
              ),

              // The controller advances this comparison after each landing,
              // preserving pause, stepping and playback-speed behavior.
              React.createElement("button", {
                "aria-label": __alloT('stem.physics.aria_vacuum_symmetry_demo', 'Vacuum symmetry comparison: launch at 30 and 60 degrees with the same speed and gravity'),
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
              }, "\u{1F500} " + __alloT('stem.physics.vacuum_symmetry_demo', 'Compare 30° & 60° (no drag)')),

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
                  { key: 'maxH', label: __alloT('stem.physics.model_comparison_height', 'Maximum height (m)') },
                  { key: 'time', label: __alloT('stem.physics.model_comparison_time', 'Flight time (s)') }
                ];
                return React.createElement('section', {
                  'data-physics-model-comparison': true, 'aria-labelledby': 'physics-model-comparison-heading',
                  style: { flexBasis: '100%', minWidth: 0, backgroundColor: themeSurface, color: themeInk, borderColor: isContrast ? '#ffffff' : (isDark ? '#67e8f9' : '#0e7490') }, className: 'rounded-xl border p-3'
                },
                  React.createElement('h3', { id: 'physics-model-comparison-heading', style: { color: themeInk }, className: 'text-sm font-bold' }, __alloT('stem.physics.model_comparison_heading', 'Measured model comparison')),
                  React.createElement('p', { 'data-physics-model-comparison-settings': true, className: 'mt-1 text-xs leading-relaxed' },
                    __alloT('stem.physics.model_comparison_settings', 'Both flights used:') + ' ' + parameters.angle + '°, ' + parameters.velocity + ' m/s, g = ' + parameters.gravity + ' m/s², ' + parameters.mass + ' kg.'),
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

            React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3", "data-physics-sliders": "true" },

              [{ k: 'angle', label: __alloT('stem.physics.slider_angle', 'Angle (\u00B0)'), min: 5, max: 85, step: 1 }, { k: 'velocity', label: __alloT('stem.physics.slider_velocity', 'Velocity (m/s)'), min: 5, max: 50, step: 1 }, { k: 'gravity', label: __alloT('stem.physics.slider_gravity', 'Gravity (m/s\u00B2)'), min: 1, max: 25, step: 0.1 }, { k: 'mass', label: __alloT('stem.physics.slider_mass', 'Mass (kg)'), min: 1, max: 10, step: 1 }].map(function (s) {
                var isLocked = d.targetMode && d.targetConstraint && (
                  (d.targetConstraint.type === 'fixedAngle' && s.k === 'angle') ||
                  (d.targetConstraint.type === 'fixedVelocity' && s.k === 'velocity')
                );
                return React.createElement("div", { key: s.k, className: "text-center rounded-lg p-2 border " + (isLocked ? 'bg-red-50 border-red-300' : 'bg-slate-50') },

                  React.createElement("label", { className: "text-[0.6875rem] font-bold block " + (isLocked ? 'text-red-700' : 'text-slate-600') }, isLocked ? '\u{1F512} ' + s.label : s.label),

                  React.createElement("span", { className: "text-sm font-bold block " + (isLocked ? 'text-red-700' : 'text-slate-700') }, d[s.k]),

                  React.createElement("input", { type: "range", "aria-valuetext": (d[s.k] + " " + ((s.label.match(/\(([^)]+)\)/) || ["", ""])[1])), "aria-label": s.label, min: s.min, max: s.max, step: s.step, value: d[s.k], disabled: isLocked, onChange: function (e) {
                    if (!isLocked) {
                      var newVal = parseFloat(e.target.value);
                      upd(s.k, newVal);
                      // Canvas Narration: parameter change (high debounce to avoid spam during drag)
                      if (typeof canvasNarrate === 'function') canvasNarrate('physics', 'param_' + s.k, s.label.split(' ')[0] + ': ' + newVal, { debounce: 800 });
                    }
                  }, className: "w-full " + (isLocked ? 'accent-red-400 opacity-50 cursor-not-allowed' : 'accent-sky-600') })

                );

              })

            ),

            // ── XP & Stats Bar ──
            React.createElement("div", { className: "flex items-center gap-3 mb-2 px-1" },
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
              var rad = hasParams ? lf.angle * Math.PI / 180 : 0;
              var idealR = hasParams ? (lf.vel * lf.vel * Math.sin(2 * rad)) / lf.grav : null;
              var idealH = hasParams ? (lf.vel * lf.vel * Math.sin(rad) * Math.sin(rad)) / (2 * lf.grav) : null;
              var idealT = hasParams ? (2 * lf.vel * Math.sin(rad)) / lf.grav : null;
              var lossR = idealR != null ? idealR - lf.range : null;
              var lossPct = idealR > 0 && lossR != null ? (lossR / idealR) * 100 : null;
              var tile = function (key, label, value, sub, cls) {
                return React.createElement("div", { key: key, className: "rounded-lg border px-2 py-1.5 text-center " + (cls || 'bg-white border-slate-200') },
                  React.createElement("div", { className: "text-[0.625rem] font-bold uppercase tracking-wide text-slate-600" }, label),
                  React.createElement("div", { className: "text-sm font-black text-slate-800" }, value),
                  sub ? React.createElement("div", { className: "text-[0.625rem] text-slate-600" }, sub) : null
                );
              };
              var vsLabel = idealR != null ? (__alloT('stem.physics.lf_formula_says', 'formula: ') + idealR.toFixed(1) + ' m') : null;
              return React.createElement("section", { className: "mb-3 rounded-xl border border-sky-200 bg-sky-50 p-2", "data-physics-last-flight": "true", role: "status", "aria-label": __alloT('stem.physics.lf_aria', 'Last flight results') },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-1.5 px-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold uppercase tracking-wider text-sky-800" }, "📐 " + __alloT('stem.physics.lf_title', 'Last flight') + (hasParams ? ' — ' + lf.angle + '°, ' + lf.vel + ' m/s, g=' + lf.grav + (lf.drag ? ', ' + __alloT('stem.physics.lf_drag_on', 'air drag on') + ', ' + lf.mass + ' kg' : '') : '')),
                  React.createElement("span", { className: "text-[0.625rem] text-sky-700" }, lf.drag ? __alloT('stem.physics.lf_measured_vs_formula', 'measured vs no-drag formula') : __alloT('stem.physics.lf_measured', 'measured'))
                ),
                React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
                  tile('r', __alloT('stem.physics.label_range', 'Range'), lf.range.toFixed(1) + ' m', vsLabel),
                  tile('h', __alloT('stem.physics.label_max_height', 'Max Height'), lf.maxH.toFixed(1) + ' m', idealH != null ? __alloT('stem.physics.lf_formula_says', 'formula: ') + idealH.toFixed(1) + ' m' : null),
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
                  ? { surface: '#0f172a', panel: '#1e293b', ink: '#e2e8f0', accent: '#c7d2fe', border: '#94a3b8' }
                  : { surface: '#ffffff', panel: '#f8fafc', ink: '#0f172a', accent: '#3730a3', border: '#64748b' };
              var fieldStyle = { width: '100%', minWidth: 0, background: palette.panel, color: palette.ink, border: '1px solid ' + palette.border, borderRadius: 6, padding: 8, fontSize: 14 };
              var actionStyle = { minHeight: 44, padding: '8px 12px', borderRadius: 6, border: '1px solid ' + palette.border, background: palette.surface, color: palette.accent, fontSize: 13, fontWeight: 700 };
              var cardStyle = { background: palette.panel, color: palette.ink, border: '1px solid ' + palette.border, borderRadius: 8, padding: 12, minWidth: 0 };
              var activeMode = !!(d.targetMode || d.challengeActive || d.battleMode);
              var activities = [
                { id: 'speed_squared', title: __alloT('stem.physics.investigation_speed_title', 'Does doubling speed quadruple range?'),
                  question: __alloT('stem.physics.investigation_speed_question', 'How does doubling launch speed change range when air drag is off?'),
                  changed: __alloT('stem.physics.investigation_speed_changed', 'Change speed: 15 → 30 m/s.'),
                  held: __alloT('stem.physics.investigation_speed_held', 'Hold angle at 45°, gravity at 9.8 m/s², mass at 1 kg, and air drag off.'),
                  trials: [{ angle: 45, velocity: 15, gravity: 9.8, mass: 1, airResist: false }, { angle: 45, velocity: 30, gravity: 9.8, mass: 1, airResist: false }],
                  labels: ['15 m/s', '30 m/s'] },
                { id: 'inverse_gravity', title: __alloT('stem.physics.investigation_gravity_title', 'What happens when gravity is halved?'),
                  question: __alloT('stem.physics.investigation_gravity_question', 'How does halving gravity change range when air drag is off?'),
                  changed: __alloT('stem.physics.investigation_gravity_changed', 'Change gravity: 9.8 → 4.9 m/s².'),
                  held: __alloT('stem.physics.investigation_gravity_held', 'Hold angle at 45°, speed at 25 m/s, mass at 1 kg, and air drag off.'),
                  trials: [{ angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false }, { angle: 45, velocity: 25, gravity: 4.9, mass: 1, airResist: false }],
                  labels: ['9.8 m/s²', '4.9 m/s²'] },
                { id: 'mass_drag', title: __alloT('stem.physics.investigation_mass_title', 'Does mass change range through air?'),
                  question: __alloT('stem.physics.investigation_mass_question', 'How does mass change range when the drag coefficient and launch conditions stay the same?'),
                  changed: __alloT('stem.physics.investigation_mass_changed', 'Change mass: 1 → 5 kg.'),
                  held: __alloT('stem.physics.investigation_mass_held', 'Hold angle at 45°, speed at 25 m/s, gravity at 9.8 m/s², and air drag on with the same drag coefficient.'),
                  trials: [{ angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: true }, { angle: 45, velocity: 25, gravity: 9.8, mass: 5, airResist: true }],
                  labels: ['1 kg', '5 kg'] }
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
              var changesLabel = { angle: __alloT('stem.physics.var_angle', 'angle'), vel: __alloT('stem.physics.var_velocity', 'velocity'), grav: __alloT('stem.physics.var_gravity', 'gravity'), drag: __alloT('stem.physics.var_drag', 'air drag'), mass: __alloT('stem.physics.var_mass', 'mass') };
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
                        h('span', { id: detailId }, runLabel + ' ' + run.n + ': ' + run.angle + '°, ' + run.vel + ' m/s, g=' + run.grav + ' m/s², ' + run.mass + ' kg, ' + __alloT('stem.physics.var_drag', 'air drag') + ' ' + (run.drag ? __alloT('stem.physics.on', 'ON') : __alloT('stem.physics.off', 'OFF')) + ' → ' + run.range.toFixed(2) + ' m')
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
                      h('tbody', null, [{ key: 'range', label: __alloT('stem.physics.label_range', 'Range') }, { key: 'maxH', label: __alloT('stem.physics.label_max_height', 'Max Height') }, { key: 'time', label: __alloT('stem.physics.label_flight_time', 'Flight Time') }].map(function(row) {
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
              log.forEach(function (r, i) { if (i > 0 && (physRunChanges(log[i - 1], r) || []).length === 1) oneVarRuns++; });
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
                        __alloT('stem.physics.runlog_col_measured', 'Measured range'),
                        __alloT('stem.physics.runlog_col_changed', 'Changed since previous')
                      ].map(function (c, i) {
                        return React.createElement("th", { key: 'rh' + i, scope: "col", className: "px-2 py-1 text-left font-bold" }, c);
                      })
                    )
                  ),
                  React.createElement("tbody", null, log.map(function (r, i) {
                    var changes = physRunChanges(i > 0 ? log[i - 1] : null, r);
                    var verdict;
                    if (changes == null) verdict = { text: __alloT('stem.physics.runlog_first', 'first run — the baseline'), cls: 'text-slate-600' };
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
                    ? '🔬 ' + oneVarRuns + ' ' + __alloT('stem.physics.runlog_fair_count', 'of your comparisons changed exactly one variable. Those are the ones you can draw a conclusion from.')
                    : '🔬 ' + __alloT('stem.physics.runlog_none_fair', 'No comparison yet changed exactly one variable. Repeat a run and move a single slider to make one.')
                )
              );
            })(),

            d.showFormulas && (function() {
              var ang = parseFloat((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45);
              var vel = parseFloat(d.velocity || 25);
              var grav = parseFloat((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8);
              var rad = ang * Math.PI / 180;
              var sinT = Math.sin(rad);
              var sin2T = Math.sin(2 * rad);
              var range = (vel * vel * sin2T) / grav;
              var maxH = (vel * vel * sinT * sinT) / (2 * grav);
              var flightT = (2 * vel * sinT) / grav;
              var Row = function(label, color, sym, sub, calc, numeric, unit) {
                return React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-fuchsia-100 mb-1.5" },
                  React.createElement("div", { className: "flex items-baseline gap-2 mb-1" },
                    React.createElement("span", { className: "text-[0.6875rem] font-bold " + color }, label),
                    React.createElement("span", { className: "font-mono text-[0.75rem] text-slate-700" }, sym)
                  ),
                  React.createElement("div", { className: "font-mono text-[0.6875rem] text-slate-500 ml-3" }, "= " + sub),
                  calc && React.createElement("div", { className: "font-mono text-[0.6875rem] text-slate-500 ml-3" }, "= " + calc),
                  React.createElement("div", { className: "font-mono text-[0.75rem] font-bold text-fuchsia-700 ml-3" }, "= " + numeric.toFixed(2) + " " + unit)
                );
              };
              return React.createElement("div", { className: "bg-fuchsia-50 rounded-xl border border-fuchsia-200 p-3 mb-3 animate-in fade-in duration-200", role: "region", "aria-label": __alloT('stem.physics.aria_show_work_panel', 'Show your work formulas panel') },
                React.createElement("p", { className: "text-[0.6875rem] font-bold text-fuchsia-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCDD " + __alloT('stem.physics.show_your_work_title', 'Show Your Work (no-drag ideal)')),
                Row(
                  __alloT('stem.physics.row_range', 'Range:'),
                  "text-blue-600",
                  "R = v\u00B2 \u00B7 sin(2\u03B8) / g",
                  "(" + vel + ")\u00B2 \u00B7 sin(2 \u00B7 " + ang + "\u00B0) / " + grav,
                  (vel * vel).toFixed(0) + " \u00B7 " + sin2T.toFixed(3) + " / " + grav,
                  range, "m"
                ),
                Row(
                  __alloT('stem.physics.row_max_height', 'Max Height:'),
                  "text-purple-600",
                  "H = v\u00B2 \u00B7 sin\u00B2(\u03B8) / (2g)",
                  "(" + vel + ")\u00B2 \u00B7 sin\u00B2(" + ang + "\u00B0) / (2 \u00B7 " + grav + ")",
                  (vel * vel).toFixed(0) + " \u00B7 " + (sinT * sinT).toFixed(3) + " / " + (2 * grav).toFixed(1),
                  maxH, "m"
                ),
                Row(
                  __alloT('stem.physics.row_flight_time', 'Flight Time:'),
                  "text-emerald-600",
                  "t = 2v \u00B7 sin(\u03B8) / g",
                  "2 \u00B7 " + vel + " \u00B7 sin(" + ang + "\u00B0) / " + grav,
                  (2 * vel * sinT).toFixed(2) + " / " + grav,
                  flightT, "s"
                ),
                d.airResist && React.createElement("p", { className: "text-[0.625rem] text-orange-700 italic mt-1" },
                  "\u26A0\uFE0F " + __alloT('stem.physics.air_drag_warning', 'Air drag is ON. Actual values will be lower than these no-drag predictions.')
                )
              );
            })(),

            // ── Motion Component Graphs (Vx-vs-t, Vy-vs-t) ──
            // Explain the recorded model, even after launch controls change.
            d.showGraphs && (function() {
              var cv = typeof document !== 'undefined' ? document.getElementById('physicsCanvas') : null;
              var trails = cv && cv._trails ? cv._trails : [];
              var lastTrail = trails.length > 0 ? trails[trails.length - 1] : null;
              if (!lastTrail || lastTrail.length < 2) {
                return React.createElement("div", { className: "bg-teal-50 rounded-xl border border-teal-200 p-3 mb-3" },
                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-teal-700 uppercase tracking-wider mb-1" }, "\u{1F4C9} " + __alloT('stem.physics.motion_components', 'Motion Components')),
                  React.createElement("p", { className: "text-xs text-teal-600 italic" }, __alloT('stem.physics.launch_to_see_vx_vy', 'Launch a projectile to see Vx-vs-t and Vy-vs-t.'))
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
              var nSamples = Math.min(30, pts.length);
              for (var si = 0; si < nSamples; si++) {
                var pi = Math.floor((si / Math.max(1, nSamples - 1)) * (pts.length - 1));
                // Each point carries its own flight time, so slow-motion and
                // stepped flights plot on the same axis as real-time ones.
                samples.push({ t: pts[pi].t != null ? pts[pi].t : pi * PHYS_DT, vx: pts[pi].mVx || 0, vy: pts[pi].mVy || 0 });
              }
              var tMax = samples[samples.length - 1].t || 1;
              var vxAbs = 0, vyMax = 0, vyMin = 0;
              samples.forEach(function (s) {
                if (Math.abs(s.vx) > vxAbs) vxAbs = Math.abs(s.vx);
                if (s.vy > vyMax) vyMax = s.vy;
                if (s.vy < vyMin) vyMin = s.vy;
              });
              var W = 240, H = 140, padL = 38, padR = 10, padT = 12, padB = 30;
              var innerW = W - padL - padR, innerH = H - padT - padB;
              var vxYScale = vxAbs > 0 ? innerH / (vxAbs * 1.2) : 1;
              var vxY0 = padT + innerH;
              var vxPath = samples.map(function (s, i) {
                var x = padL + (s.t / tMax) * innerW;
                var y = vxY0 - s.vx * vxYScale;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
              }).join(' ');
              var vyRange = Math.max(Math.abs(vyMin), Math.abs(vyMax)) || 1;
              var vyYScale = innerH / (vyRange * 2.1);
              var vyY0 = padT + innerH / 2;
              var vyPath = samples.map(function (s, i) {
                var x = padL + (s.t / tMax) * innerW;
                var y = vyY0 - s.vy * vyYScale;
                return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
              }).join(' ');
              // SVG fills/strokes do not inherit the host's themed text tokens.
              // Give each chart an explicit surface and matching accessible ink.
              var graphColors = isContrast
                ? { surface: '#000000', ink: '#ffff00', axis: '#ffffff', vx: '#ffff00', vy: '#ffffff', range: '#ffff00', marker: '#ffffff' }
                : isDark
                  ? { surface: '#0f172a', ink: '#e2e8f0', axis: '#94a3b8', vx: '#60a5fa', vy: '#d8b4fe', range: '#fbbf24', marker: '#67e8f9' }
                  : { surface: '#ffffff', ink: '#475569', axis: '#64748b', vx: '#2563eb', vy: '#9333ea', range: '#b45309', marker: '#0e7490' };
              var axisLine = function (x1, y1, x2, y2) {
                return React.createElement('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: graphColors.axis, strokeWidth: 1 });
              };
              var lbl = function (x, y, text, color, size, anchor) {
                return React.createElement('text', { x: x, y: y, fontSize: 14, fill: graphColors.ink, textAnchor: anchor || 'middle', fontFamily: 'monospace' }, text);
              };
              return React.createElement("div", { className: "bg-teal-50 rounded-xl border border-teal-200 p-3 mb-3 animate-in fade-in duration-200" },
                React.createElement("p", { className: "text-[0.6875rem] font-bold text-teal-700 uppercase tracking-wider mb-2" },
                  "\u{1F4C9} " + __alloT('stem.physics.motion_components_recent', 'Motion Components (most recent launch)')
                ),
                React.createElement("div", { "data-physics-component-graphs": true, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 } },
                  React.createElement("div", { className: "bg-white rounded-lg p-2 border border-teal-100" },
                    React.createElement("p", { className: "text-xs font-bold text-blue-600 mb-1" }, __alloT('stem.physics.graph_vx_title', 'Vx (m/s) — horizontal velocity')),
                    React.createElement("svg", { "data-physics-graph": "vx", style: { background: graphColors.surface, borderRadius: 4 }, viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": vxDescription },
                      axisLine(padL, padT, padL, padT + innerH, '#94a3b8'),
                      axisLine(padL, padT + innerH, W - padR, padT + innerH, '#94a3b8'),
                      React.createElement('path', { d: vxPath, stroke: graphColors.vx, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      lbl(padL - 4, vxY0 - vxAbs * vxYScale + 4, vxAbs.toFixed(0), '#475569', 14, 'end'),
                      lbl(padL - 4, padT + innerH, '0', '#475569', 8, 'end'),
                      lbl(padL, H - 4, '0', '#475569', 8, 'start'),
                      lbl(W - padR, H - 4, tMax.toFixed(1) + 's', '#475569', 8, 'end'),
                      lbl(padL + innerW / 2, H - 4, __alloT('stem.physics.axis_time_s', 'time (s)'), '#475569', 14, 'middle')
                    ),
                    React.createElement("p", { className: "text-xs text-blue-700 mt-1" }, vxDescription)
                  ),
                  React.createElement("div", { className: "bg-white rounded-lg p-2 border border-teal-100" },
                    React.createElement("p", { className: "text-xs font-bold text-purple-600 mb-1" }, __alloT('stem.physics.graph_vy_title', 'Vy (m/s) — vertical velocity')),
                    React.createElement("svg", { "data-physics-graph": "vy", style: { background: graphColors.surface, borderRadius: 4 }, viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img", "aria-label": vyDescription },
                      axisLine(padL, padT, padL, padT + innerH, '#94a3b8'),
                      axisLine(padL, vyY0, W - padR, vyY0, '#cbd5e1'),
                      React.createElement('path', { d: vyPath, stroke: graphColors.vy, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      lbl(padL - 4, vyY0 - vyRange * vyYScale + 4, '+' + vyRange.toFixed(0), '#475569', 14, 'end'),
                      lbl(padL - 4, vyY0 + 3, '0', '#475569', 8, 'end'),
                      lbl(padL - 4, vyY0 + vyRange * vyYScale + 4, '−' + vyRange.toFixed(0), '#475569', 14, 'end'),
                      lbl(padL, H - 4, '0', '#475569', 8, 'start'),
                      lbl(W - padR, H - 4, tMax.toFixed(1) + 's', '#475569', 8, 'end'),
                      lbl(padL + innerW / 2, H - 4, __alloT('stem.physics.axis_time_s', 'time (s)'), '#475569', 14, 'middle')
                    ),
                    React.createElement("p", { className: "text-xs text-purple-700 mt-1" }, vyDescription)
                  )
                ),
                React.createElement("p", { className: "text-xs text-teal-700 mt-2" },
                  graphHasDrag
                    ? __alloT('stem.physics.graph_drag_model_note', 'This flight includes air drag. The drag force depends on total speed, coupling horizontal and vertical motion. Gravity stays constant; total acceleration changes.')
                    : __alloT('stem.physics.graph_vacuum_model_note', 'This flight has no air drag. Horizontal and vertical motion are independent; gravity changes only vertical velocity.')
                ),
                React.createElement('button', { type: 'button', onClick: function() { upd('showFlightData', true); }, className: 'mt-2 px-3 py-2 rounded-lg text-xs font-bold border border-teal-300 text-teal-800 bg-white' }, __alloT('stem.physics.graph_open_data', 'Open the flight data table')),

                // ── Range vs Angle parameter sweep ──
                // Side-eye proof of the "45° gives max range without drag"
                // insight. Plots R(θ) = v²·sin(2θ)/g across θ ∈ [0°, 90°]
                // with the current angle marked. Students literally see the
                // parabolic relationship and where they sit on the curve.
                // No-drag closed-form (the formulas panel disclaimer applies).
                (function() {
                  var ang = parseFloat((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45);
                  var vel = parseFloat(d.velocity || 25);
                  var grav = parseFloat((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8);
                  var maxR = (vel * vel) / grav; // peaks at θ = 45°
                  if (!isFinite(maxR) || maxR <= 0) return null;
                  var rW = 300, rH = 200, rPL = 42, rPR = 16, rPT = 28, rPB = 56;
                  var rIW = rW - rPL - rPR, rIH = rH - rPT - rPB;
                  // Build sweep curve every 2°
                  var pathPts = [];
                  for (var ra = 0; ra <= 90; ra += 2) {
                    var rRad = ra * Math.PI / 180;
                    var rVal = (vel * vel * Math.sin(2 * rRad)) / grav;
                    var sx = rPL + (ra / 90) * rIW;
                    var sy = rPT + rIH - (rVal / maxR) * rIH;
                    pathPts.push((pathPts.length === 0 ? 'M' : 'L') + sx.toFixed(1) + ',' + sy.toFixed(1));
                  }
                  var rangePath = pathPts.join(' ');
                  // Current-angle marker
                  var curRad = ang * Math.PI / 180;
                  var curR = (vel * vel * Math.sin(2 * curRad)) / grav;
                  var curSX = rPL + (ang / 90) * rIW;
                  var curSY = rPT + rIH - (curR / maxR) * rIH;
                  // 45° optimum line
                  var optSX = rPL + (45 / 90) * rIW;
                  var axisLine2 = function (x1, y1, x2, y2, color, dash) {
                    var p = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || graphColors.axis, strokeWidth: 1 };
                    if (dash) p.strokeDasharray = dash;
                    return React.createElement('line', p);
                  };
                  var lbl2 = function (x, y, text, color, size, anchor) {
                    return React.createElement('text', { x: x, y: y, fontSize: 16, fill: graphColors.ink, textAnchor: anchor || 'middle', fontFamily: 'monospace' }, text);
                  };
                  return React.createElement("div", { className: "bg-white rounded-lg p-2 border border-teal-100 mt-2" },
                    React.createElement("p", { className: "text-[0.625rem] font-bold text-amber-700 mb-1" },
                      __alloT('stem.physics.range_vs_angle_title', 'R vs θ — range across all angles at') + " v=" + vel + " m/s, g=" + grav + " m/s²"
                    ),
                    React.createElement("svg", { "data-physics-graph": "range", style: { background: graphColors.surface, borderRadius: 4 }, viewBox: "0 0 " + rW + " " + rH, width: "100%", height: rH, role: "img", "aria-label": __alloT('stem.physics.aria_range_angle_graph', 'Range as a function of launch angle, peaking at 45 degrees') },
                      // Y/X axes
                      axisLine2(rPL, rPT, rPL, rPT + rIH),
                      axisLine2(rPL, rPT + rIH, rW - rPR, rPT + rIH),
                      // 45° optimum dashed vertical reference
                      axisLine2(optSX, rPT, optSX, rPT + rIH, graphColors.axis, '3,3'),
                      lbl2(optSX, rPT + rIH + 16, __alloT('stem.physics.axis_45_max', '45° (max)'), '#475569', 16, 'middle'),
                      // Range curve
                      React.createElement('path', { d: rangePath, stroke: graphColors.range, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                      // Current-angle marker line + dot
                      axisLine2(curSX, rPT, curSX, rPT + rIH, graphColors.marker, '4,2'),
                      React.createElement('circle', { cx: curSX, cy: curSY, r: 4, fill: graphColors.marker, stroke: graphColors.surface, strokeWidth: 1 }),
                      // Y labels
                      lbl2(rPL - 4, rPT + 4, maxR.toFixed(0), '#475569', 8, 'end'),
                      lbl2(rPL - 4, rPT + rIH, '0', '#475569', 8, 'end'),
                      // Fewer ticks keep the same labels readable on phones.
                      [0, 30, 60, 90].map(function (a) {
                        var ax = rPL + (a / 90) * rIW;
                        return React.createElement('text', { key: a, x: ax, y: rH - 24, fontSize: 16, fill: graphColors.ink, textAnchor: 'middle', fontFamily: 'monospace' }, a + '°');
                      }),
                      // Axis title
                      lbl2(rPL + rIW / 2, rH - 2, __alloT('stem.physics.axis_launch_angle', 'launch angle (θ)'), '#94a3b8', 8, 'middle'),
                      // Current-angle callout
                      React.createElement('text', { x: rW - rPR, y: 17, fontSize: 16, fill: graphColors.ink, fontWeight: 'bold', textAnchor: 'end', fontFamily: 'monospace' },
                        __alloT('stem.physics.range_vs_angle_you', 'you:') + ' ' + ang + '° → R=' + curR.toFixed(1) + 'm'
                      )
                    ),
                    React.createElement("p", { className: "text-[0.625rem] text-amber-700 mt-1 italic" },
                      d.airResist
                        ? __alloT('stem.physics.sweep_note_drag', 'With drag the real optimum sits below 45°, and the faster the launch the lower it drops (about 42° at 50 m/s for a 1 kg ball). This chart is no-drag.')
                        : __alloT('stem.physics.sweep_note_nodrag', 'Range peaks at exactly 45° without drag. Complementary angles (e.g. 30° and 60°) hit the same R.')
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
                card('3-5', 'optimal', 'text-amber-600', '🎯 ' + __alloT('stem.physics.concept_optimal_label', 'Optimal Angle: '), __alloT('stem.physics.concept_optimal_body', 'Without air resistance, 45° gives maximum range. With drag the best angle drops below 45° — the faster the launch, the lower it goes (about 42° at 50 m/s). Try it!')),
                card('6-8', 'energy', 'text-purple-600', '⚡ ' + __alloT('stem.physics.concept_energy_label', 'Energy Conservation: '), __alloT('stem.physics.concept_energy_models', 'Without air drag, kinetic energy (½mv²) and gravitational potential energy (mgh) exchange while their sum stays constant. Drag transfers mechanical energy to the surroundings, so KE + PE decreases.')),
                card('9-12', 'air', 'text-orange-600', '🌬️ ' + __alloT('stem.physics.concept_air_label', 'Air Resistance: '), __alloT('stem.physics.concept_air_body', 'Drag force opposes motion and increases with speed (F_drag ∝ v²). It shortens range, lowers max height, and makes the trajectory asymmetric.')),
                card('3-5', 'gravity', 'text-sky-700', '🌑 ' + __alloT('stem.physics.concept_gravity_label', 'Gravity Varies: '), __alloT('stem.physics.concept_gravity_vacuum', 'With air drag off and the same launch speed and angle, Moon gravity (1.6 m/s²) gives about 6 times the range of Earth gravity (9.8 m/s²).')),
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
            d.showFlightData && React.createElement("div", { className: "bg-cyan-50 rounded-xl border border-cyan-200 p-3 mb-3 overflow-x-auto animate-in fade-in duration-200" },
              React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase tracking-wider" }, "\uD83D\uDCCA " + __alloT('stem.physics.flight_data_title', 'Flight Data')),
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
                // cyan-700: this sits on a fixed bg-cyan-50 panel, and cyan-400 measured
                // 1.74:1 there. The file's other cyan inks are already 700/800.
                // (Keep `return` and its expression on ONE line: a comment between
                // them once triggered semicolon insertion and this hint went dead.)
                if (lastTrail.length === 0) {
                  return React.createElement("p", { className: "text-xs text-cyan-700 italic" }, __alloT('stem.physics.launch_to_see_flight_data', 'Launch a projectile to see flight data'));
                }
                // Sample ~10 evenly spaced points
                var step = Math.max(1, Math.floor(lastTrail.length / 10));
                var rows = [];
                for (var ri = 0; ri < lastTrail.length; ri += step) {
                  var pt = lastTrail[ri];
                  var t_sec = pt.t != null ? pt.t : ri * PHYS_DT;
                  rows.push(React.createElement("tr", { key: ri, className: "border-b border-cyan-100 hover:bg-cyan-100 transition-colors" },
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, t_sec.toFixed(2)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, pt.mX.toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-slate-700" }, pt.mY.toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-green-700" }, (pt.mVx || 0).toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-purple-700" }, (pt.mVy || 0).toFixed(1)),
                    React.createElement("td", { className: "px-2 py-0.5 font-mono text-blue-700" }, Math.sqrt((pt.mVx||0)*(pt.mVx||0) + (pt.mVy||0)*(pt.mVy||0)).toFixed(1))
                  ));
                }
                return React.createElement("table", { className: "w-full text-xs" },
                  React.createElement("caption", { className: "sr-only" }, __alloT('stem.physics.caption_data_table', 'physics data table')), React.createElement("thead", null,
                    React.createElement("tr", { className: "border-b-2 border-cyan-300" },
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, "t (s)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-slate-600" }, "x (m)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-slate-600" }, "y (m)"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-green-700" }, "Vx"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-purple-700" }, "Vy"),
                      React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-blue-700" }, "|v|")
                    )
                  ),
                  React.createElement("tbody", null, rows)
                );
              })()
            ),


            // ═══ TARGET DESTRUCTION MODE UI ═══
            React.createElement("div", { className: "bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 p-3 mb-3" },
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
            React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200 p-3 mb-3" },
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

            React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl border border-sky-200 p-3 mb-3" },

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCDD " + __alloT('stem.physics.kinematic_equations', 'Kinematic Equations')),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_range', 'Range')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "R = v\u00B2sin(2\u03B8)/g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_max_height', 'Max Height')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "H = v\u00B2sin\u00B2(\u03B8)/2g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_flight_time', 'Flight Time')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "T = 2v\u00B7sin(\u03B8)/g")

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 border text-center" },

                  React.createElement("p", { className: "text-[0.6875rem] text-sky-700 font-bold" }, __alloT('stem.physics.label_position', 'Position')),

                  React.createElement("p", { className: "text-xs font-mono font-bold text-sky-800" }, "y = v\u2080t - \u00BDgt\u00B2")

                )

              ),

              d.airResist && React.createElement("p", { className: "mt-2 text-[0.6875rem] text-orange-500 italic" }, "\u26A0\uFE0F " + __alloT('stem.physics.air_drag_modifies', 'Air drag modifies these equations — real range will be shorter than the idealized calculation below.'))

            ),

            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3 text-center" },

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_range', 'Range')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var r = d.angle * Math.PI / 180; return ((d.velocity * d.velocity * Math.sin(2 * r)) / d.gravity).toFixed(1); })() + " m")

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_max_height', 'Max Height')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (vy * vy / (2 * d.gravity)).toFixed(1); })() + " m")

              ),

              React.createElement("div", { className: "p-2 bg-sky-50 rounded-lg border border-sky-200" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-sky-700 uppercase" }, __alloT('stem.physics.label_flight_time', 'Flight Time')),

                React.createElement("p", { className: "text-sm font-bold text-sky-800" }, (function () { var vy = d.velocity * Math.sin(d.angle * Math.PI / 180); return (2 * vy / d.gravity).toFixed(2); })() + " s")

              )

            ),

            // ── Calculate the Landing Quiz ──

            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3" },

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
                { s: __alloT('stem.physics.myth35_4_s', 'Aiming at 45\u00B0 throws the farthest (no air).'), t: true, why: __alloT('stem.physics.myth35_4_why', 'Lower angles fly flat but fall too soon; higher angles waste speed going up. 45\u00B0 is the perfect trade.'), tryIt: __alloT('stem.physics.myth35_4_tryit', 'Run the complementary-angles demo \u2014 30\u00B0 and 60\u00B0 even land on the SAME spot.') }
              ];
              var MYTHS_68 = MYTHS_35.concat([
                { s: __alloT('stem.physics.myth68_1_s', 'After launch, a force keeps pushing the ball forward.'), t: false, why: __alloT('stem.physics.myth68_1_why', 'Once it leaves the cannon, the ONLY force is gravity, pulling straight down. Forward motion continues because nothing stops it \u2014 Newton\u2019s first law.'), tryIt: __alloT('stem.physics.myth68_1_tryit', 'Watch the vector overlay in flight: there is no forward force, yet Vx stays perfectly constant.') },
                { s: __alloT('stem.physics.myth68_2_s', 'A ball fired horizontally and a ball dropped from the same height hit the ground at the same time.'), t: true, why: __alloT('stem.physics.myth68_2_why', 'Horizontal and vertical motion are independent. Both balls fall with the same gravity from the same height, so they land together.'), tryIt: __alloT('stem.physics.myth68_2_tryit', 'Fire at a very low angle and compare the flight time with a steep, short lob from the same height.') }
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
              return React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-3" },
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
              return h('div', { className: 'mt-4 p-4 rounded-xl bg-white border border-indigo-200 shadow-sm' },
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
                  h('button', { type: 'button', 'data-physics-apply-inquiry': true, disabled: !!d.targetMode, title: d.targetMode ? __alloT('stem.physics.inquiry_target_disabled', 'End the target mission to apply all calculator settings.') : undefined, onClick: function() {
                    if (d.targetMode) return;
                    upd('angle', iq.angle);
                    upd('velocity', iq.velocity);
                    upd('gravity', iq.gravity);
                    upd('airResist', false);
                    var cv = document.getElementById('physicsCanvas');
                    if (cv && cv.focus) cv.focus();
                  }, className: 'px-3 py-2 rounded bg-indigo-700 text-white text-xs font-bold disabled:opacity-50' }, __alloT('stem.physics.iq_apply_vacuum', 'Apply to simulator (no drag)')),
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
                  + 'Launch angle: ' + ((typeof d.angle === 'number' && isFinite(d.angle)) ? d.angle : 45) + '\u00B0. Initial velocity: ' + (d.velocity || 25) + ' m/s. Gravity: ' + ((typeof d.gravity === 'number' && isFinite(d.gravity)) ? d.gravity : 9.8) + ' m/s\u00B2. Air resistance: ' + (d.airResist ? 'on' : 'off') + '. '
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
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
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
