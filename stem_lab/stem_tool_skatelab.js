// ═══════════════════════════════════════════
// stem_tool_skatelab.js — Skate / BMX Physics Lab
// Modes: Halfpipe (energy + rotation) | Gap Jump (projectile motion)
// "Same physics that lands a kickflip lands a 720."
// Reaches students who'd never sit through a lecture on momentum.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
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

  // ── Reduced motion (WCAG 2.3.3) — shared across STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (document.getElementById('allo-skatelab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-skatelab-focus-css';
    st.textContent = '[data-sk-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();

  // ── Aria-live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-skatelab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-skatelab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function skAnnounce(msg) {
    try {
      var lr = document.getElementById('allo-live-skatelab');
      if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
    } catch (e) {}
  }

  // ── Module mute mirror (honor the math-fluency mute too) ──
  function isMuted() {
    try { return localStorage.getItem('skatelab_muted') === '1'; } catch (e) { return false; }
  }
  function toggleMute() {
    try { localStorage.setItem('skatelab_muted', isMuted() ? '0' : '1'); } catch (e) {}
  }

  // ── Audio ────────────────────────────────────────────────────────
  var _skAC = null;
  function getSkAC() {
    if (!_skAC) { try { _skAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (_skAC && _skAC.state === 'suspended') { try { _skAC.resume(); } catch (e) {} }
    return _skAC;
  }
  function skTone(f, d, tp, v) {
    if (isMuted()) return;
    var ac = getSkAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(); var g = ac.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.06, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.1));
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + (d || 0.1));
    } catch (e) {}
  }
  function sfxRoll() { skTone(110, 0.18, 'triangle', 0.04); skTone(165, 0.12, 'sine', 0.03); }
  function sfxPop() { skTone(620, 0.05, 'square', 0.07); skTone(420, 0.08, 'sine', 0.05); }
  function sfxLandClean() { skTone(180, 0.12, 'triangle', 0.07); setTimeout(function() { skTone(360, 0.08, 'sine', 0.06); }, 60); }
  function sfxBail() { skTone(85, 0.32, 'sawtooth', 0.08); setTimeout(function() { skTone(60, 0.18, 'square', 0.05); }, 80); }
  function sfxPump() { skTone(220, 0.12, 'sine', 0.05); skTone(330, 0.10, 'triangle', 0.04); }

  // ── Physics constants ────────────────────────────────────────────
  // SI units throughout (meters / seconds). Visible numbers translated
  // to feet/mph via simple unit helpers so American students see what
  // their bodies are used to.
  var G = 9.81;             // gravity, m/s^2
  var M2FT = 3.281;
  var MPS2MPH = 2.237;

  // ── Trick catalog ────────────────────────────────────────────────
  // rotation = total degrees the skater spins in a single trick
  // axis = which axis the spin happens around (board vs body)
  // minAir = minimum air time (s) required to even attempt cleanly
  // difficulty = scoring multiplier
  var TRICKS = [
    { id: 'ollie',       label: 'Ollie',         rotation: 0,    axis: 'none',  minAir: 0.18, difficulty: 1, emoji: '🛹' },
    { id: 'popshove',    label: 'Pop Shove-it',  rotation: 180,  axis: 'board', minAir: 0.30, difficulty: 2, emoji: '↪️' },
    { id: 'kickflip',    label: 'Kickflip',      rotation: 360,  axis: 'board', minAir: 0.36, difficulty: 3, emoji: '🔄' },
    { id: 'spin360',     label: '360 Spin',      rotation: 360,  axis: 'body',  minAir: 0.42, difficulty: 4, emoji: '🌀' },
    { id: 'spin540',     label: '540 Spin',      rotation: 540,  axis: 'body',  minAir: 0.62, difficulty: 6, emoji: '💫' },
    { id: 'spin720',     label: '720 Spin',      rotation: 720,  axis: 'body',  minAir: 0.85, difficulty: 9, emoji: '✨' }
  ];
  function getTrick(id) {
    for (var i = 0; i < TRICKS.length; i++) if (TRICKS[i].id === id) return TRICKS[i];
    return TRICKS[0];
  }

  // ── Vehicle catalog ───────────────────────────────────────────────
  // Two-knob abstraction: heavier vehicles accelerate less per pump
  // (lower pumpEfficiency), have larger moment of inertia (lower
  // rotationScale), and demand more hang time per trick (higher
  // minAirScale). Same physics — different numbers.
  var VEHICLES = {
    skate: {
      id: 'skate', label: 'Skateboard', icon: '🛹',
      mass: 4.0,            // kg (deck + trucks + wheels)
      pumpEfficiency: 0.6,  // m/s gained per well-timed pump
      rotationScale: 1.0,   // multiplier on trick rotation rate
      minAirScale: 1.0      // multiplier on trick minimum air time
    },
    bmx: {
      id: 'bmx', label: 'BMX', icon: '🚲',
      mass: 12.0,           // kg (avg BMX bike)
      pumpEfficiency: 0.45, // heavier vehicle accelerates less per pump
      rotationScale: 0.85,  // larger I = mr^2 → slower rotation
      minAirScale: 1.15     // each trick needs slightly more air
    }
  };
  function getVehicle(id) { return VEHICLES[id] || VEHICLES.skate; }

  // ── Famous-trick scenarios ───────────────────────────────────────
  // Each scenario pre-configures the simulator to recreate a real
  // moment in skate / BMX history (or a thought experiment like the
  // Moonshot kickflip). The `presets` block fully specifies state,
  // `teach` is the 2-3 sentence learning objective surfaced as a
  // Lesson card, and `questions` are 3 short prompts a teacher can
  // assign as written work.
  var SCENARIOS = [
    {
      id: 'hawk_900', label: "Tony Hawk's 900", icon: '🏆', mode: 'halfpipe',
      presets: { pumps: 6, trickId: 'spin720', vehicle: 'skate', gravity: 9.81 },
      teach: "1999 X Games. Hawk needed enough air for 2.5 full rotations on a 13-foot vert ramp. With a 720 selected, see if 6 pumps gets you the hang time. (A real 900 = 900°; we cap at 720 in v2 — the inequality is the same.)",
      questions: [
        "If a 540 needs 0.62 s of air, what's the rotation rate in degrees per second?",
        "Doubling pump count quadruples kinetic energy. By how much does air HEIGHT change? (hint: h = v² / 2g)",
        "What pump count would be enough to actually land a 900 (900° / your rotation rate)?"
      ]
    },
    {
      id: 'way_great_wall', label: "Danny Way's Great Wall", icon: '🏯', mode: 'gap',
      presets: { speedMph: 28, angleDeg: 20, gapFt: 70, vehicle: 'skate', gravity: 9.81 },
      teach: "2005. Danny Way jumped a 70-foot gap over the Great Wall of China on a mega-ramp. Same projectile equation as a 12-foot gap — just bigger numbers. Try the launch and watch the parabola preview.",
      questions: [
        "Plug v = 28 mph and θ = 20° into range = v²·sin(2θ)/g. How does it compare to the 70 ft gap?",
        "If Way had launched at 30°, would he have cleared more or less distance? Why?",
        "What's the peak height of his arc? (h_peak = (v·sinθ)² / 2g)"
      ]
    },
    {
      id: 'burnquist_mega', label: "Bob Burnquist Mega-Ramp", icon: '🛤️', mode: 'gap',
      presets: { speedMph: 30, angleDeg: 25, gapFt: 75, vehicle: 'skate', gravity: 9.81 },
      teach: "Bob Burnquist's backyard mega-ramp launches him at 30+ mph. The same range formula scales — but at this speed even a 5° angle change moves the landing 10+ ft.",
      questions: [
        "If wind reduced effective speed by 5%, by what % does range drop? (range scales as v²)",
        "What angle gives MAX range at this speed? (Hint: derivative of sin(2θ))",
        "How does hang time at 30 mph compare to 15 mph? (Same θ.)"
      ]
    },
    {
      id: 'moonshot_kickflip', label: "Moonshot Kickflip", icon: '🌙', mode: 'halfpipe',
      presets: { pumps: 2, trickId: 'kickflip', vehicle: 'skate', gravity: 1.62 },
      teach: "What if you tried a kickflip on the Moon? Gravity = 1.62 m/s² (about 1/6 of Earth's). Even with just 2 pumps, hang time skyrockets. The board still rotates at the same rate — so on the Moon you'd land 6× rotations.",
      questions: [
        "Hang time = 2·sqrt(2h/g). If h is the same, what does dividing g by 6 do to hang time?",
        "On the Moon with 2 pumps, do you have enough air for a 720? A 1080?",
        "Why does PE = mgh stay the same on the Moon if h doesn't change? What about KE?"
      ]
    },
    {
      id: 'andy_mac_vert', label: "Andy Mac's Vert Run", icon: '🛹', mode: 'halfpipe',
      presets: { pumps: 4, trickId: 'spin540', vehicle: 'skate', gravity: 9.81 },
      teach: "Andy MacDonald is famous for sustained vert runs — 540 after 540 with no fall. Each 540 needs ~0.62 s of air. Pumping efficiency matters: lose energy on landing, lose your next trick.",
      questions: [
        "If each landing loses 10% of speed, how many 540s in a row can you chain before air drops below 0.62 s?",
        "Energy lost per landing = (1/2)·m·(v² - v_after²). At what point does pumping not recover enough?",
        "Why is the 540 (1.5 spins) the 'sweet spot' for a vert run vs a 720?"
      ]
    },
    {
      id: 'sheckler_50ft', label: "Sheckler's 50ft Gap", icon: '🦘', mode: 'gap',
      presets: { speedMph: 22, angleDeg: 25, gapFt: 50, vehicle: 'skate', gravity: 9.81 },
      teach: "Ryan Sheckler dropped a 50-foot gap on a downhill approach. Speed dominates — at 22 mph the angle barely matters. Try sliding the angle slider and watch the parabola: most of the magic is in v².",
      questions: [
        "At 22 mph, what's the angle range that clears 50 ft? (Try θ = 15°, 25°, 40°.)",
        "If you dropped to 18 mph, what angle do you need? (Hint: range ∝ v²)",
        "How does this compare to Danny Way's 70 ft? Why does adding 8 mph almost double the gap?"
      ]
    },
    {
      id: 'mat_hoffman_flair', label: "Mat Hoffman's BMX Flair", icon: '🚲', mode: 'halfpipe',
      presets: { pumps: 5, trickId: 'spin540', vehicle: 'bmx', gravity: 9.81 },
      teach: "BMX flair = back flip + 180 spin (combined-axis rotation). Heavier vehicle (12 kg vs 4 kg) means more moment of inertia — slower spin per unit force. The 540 here represents the combined-axis rotation count.",
      questions: [
        "Moment of inertia I = m·r² (roughly). Compare BMX (m=12, r=0.35) to a skateboard (m=4, r=0.04). Ratio?",
        "If torque is the same, which spins faster? (Hint: τ = I·α)",
        "Why do BMX riders pump harder on approach than skateboarders for the same height?"
      ]
    },
    {
      id: 'pool_party', label: "Vans Pool Party", icon: '🌴', mode: 'halfpipe',
      presets: { pumps: 2, trickId: 'spin360', vehicle: 'skate', gravity: 9.81 },
      teach: "Backyard pool transitions are tighter than a vert ramp — less radius, less pumping room. With only 2 pumps available, what tricks fit in your air budget? Most pool runs land on 360s and ollies, not 720s.",
      questions: [
        "With 2 pumps, what's your max trick rotation that still lands?",
        "Why does pool radius matter to pumping efficiency? (Hint: shorter arcs = less time to apply force)",
        "Why are pool sessions usually about flow (linking tricks) instead of single huge airs?"
      ]
    }
  ];
  function getScenario(id) {
    for (var i = 0; i < SCENARIOS.length; i++) if (SCENARIOS[i].id === id) return SCENARIOS[i];
    return null;
  }

  // ──────────────────────────────────────────────────────────────────
  // HALFPIPE PHYSICS
  // The student picks: number of pumps (0-5), spin trick.
  // The simulation drops the skater in, applies "pumping" physics each
  // bottom pass to add kinetic energy, then on the FINAL pass at the
  // peak of the OPPOSITE wall, launches them into the air. Air time is
  // determined by velocity at takeoff using v_y² = 2*g*h. Rotation rate
  // is set so a clean landing requires both:
  //   (a) air_time × rotation_rate ≥ trick.rotation   (full rotation)
  //   (b) air_time ≥ trick.minAir                       (enough hang)
  // Each pump adds ~0.3 m/s of speed at the bottom — calibrated so a
  // 720 needs at least 4 pumps. Pedagogically frames "pumping" as
  // doing work on the system to add kinetic energy.
  // ──────────────────────────────────────────────────────────────────

  function simHalfpipe(opts) {
    var pumps = Math.max(0, Math.min(6, opts.pumps || 0));
    var trick = getTrick(opts.trickId || 'ollie');
    var vehicle = getVehicle(opts.vehicle || 'skate');
    var g = opts.gravity || G;
    // Initial speed entering the pipe (just from rolling in).
    var v0 = 4.0;                              // m/s ≈ 9 mph
    // Each pump adds energy. Pump efficiency depends on vehicle —
    // BMX is heavier, gains less speed per pump.
    var v = v0 + pumps * vehicle.pumpEfficiency;
    // Convert KE → vertical air at the lip. Real halfpipes lose ~15%
    // to friction + drag on the way up.
    var efficiency = 0.85;
    var hAir = (efficiency * v * v) / (2 * g);  // height above lip, m
    var airTime = 2 * Math.sqrt(2 * hAir / g);  // up + down, s
    // Spin rate from the trick the student chose, scaled by vehicle
    // moment of inertia. BMX rotates slower because I = mr² is bigger.
    var baseRate = trick.rotation > 0 ? (trick.rotation / Math.max(0.36, trick.minAir * 0.95)) : 0;
    var spinRate = baseRate * vehicle.rotationScale; // deg/s
    var effMinAir = trick.minAir * vehicle.minAirScale;
    var rotationCompleted = trick.rotation === 0 ? 0 : Math.min(trick.rotation, spinRate * airTime);
    var landed = (trick.rotation === 0)
      ? airTime > 0.15
      : (rotationCompleted >= trick.rotation - 12 && airTime >= effMinAir);
    var score = 0;
    if (landed) {
      score = Math.round(10 * trick.difficulty + 5 * hAir + 4 * airTime * 10);
    }
    return {
      v0: v0, vTakeoff: v, hAir: hAir, airTime: airTime,
      trick: trick, rotationCompleted: rotationCompleted, effMinAir: effMinAir,
      vehicle: vehicle, gravity: g,
      landed: landed, score: score, pumps: pumps
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // GAP JUMP PHYSICS
  // Projectile motion: range = (v² · sin(2θ)) / g
  // Player picks takeoff speed (mph) and ramp angle (deg).
  // Gap distance is fixed per session (random 8-22 ft).
  // We compute peak height too so the visualization can show a
  // proper parabola.
  // ──────────────────────────────────────────────────────────────────
  function simGapJump(opts) {
    var v_mph = opts.speedMph || 12;
    var v = v_mph / MPS2MPH; // m/s
    var thetaDeg = opts.angleDeg || 30;
    var theta = thetaDeg * Math.PI / 180;
    var gapM = (opts.gapFt || 12) / M2FT;
    var range = (v * v * Math.sin(2 * theta)) / G; // m
    var peakH = (v * v * Math.sin(theta) * Math.sin(theta)) / (2 * G); // m
    var hangTime = (2 * v * Math.sin(theta)) / G; // s
    var clearance = range - gapM; // positive = cleared, negative = short
    // Clear on the platform if we're within +0.6 m of the gap's edge
    // (i.e. didn't overshoot wildly into a wall). Tolerance is generous
    // since real gaps have a landing zone, not a knife edge.
    var landed = clearance > -0.05 && clearance < 1.2;
    var bail = !landed;
    var score = 0;
    if (landed) {
      // Reward closeness to the gap edge — 0 clearance is perfect
      var precision = 1 - Math.min(1, Math.abs(clearance - 0.4) / 0.8);
      score = Math.round(10 + 30 * precision + 4 * (gapM * M2FT));
    }
    return {
      v_mph: v_mph, vM: v, thetaDeg: thetaDeg, theta: theta,
      gapFt: opts.gapFt || 12, gapM: gapM,
      rangeM: range, rangeFt: range * M2FT,
      peakHM: peakH, peakHFt: peakH * M2FT,
      hangTime: hangTime, clearance: clearance,
      landed: landed, bail: bail, score: score
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // CANVAS RENDER — HALFPIPE
  // Draws a side-view U-shaped halfpipe, animates the skater through
  // pump → drop → launch → spin → land. Uses requestAnimationFrame
  // when an animation is in flight (state.anim).
  // ──────────────────────────────────────────────────────────────────
  function drawHalfpipe(canvas, state) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
    // Gradient sky
    var skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    skyGrad.addColorStop(0, '#1e293b');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.65);
    // Halfpipe geometry: two arcs forming a U
    var midX = W / 2;
    var floorY = H * 0.86;
    var lipY = H * 0.30;
    var lipHalfW = W * 0.36;
    var leftLipX = midX - lipHalfW;
    var rightLipX = midX + lipHalfW;
    var radius = floorY - lipY;
    // Pipe fill
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, floorY + 40);
    ctx.lineTo(0, floorY);
    ctx.lineTo(leftLipX, floorY);
    ctx.arc(leftLipX, floorY - radius * 0.2, radius * 0.55, Math.PI / 2, Math.PI, true);
    ctx.lineTo(leftLipX - radius * 0.55, lipY);
    ctx.lineTo(rightLipX + radius * 0.55, lipY);
    ctx.arc(rightLipX, floorY - radius * 0.2, radius * 0.55, 0, Math.PI / 2);
    ctx.lineTo(rightLipX, floorY);
    ctx.lineTo(W, floorY);
    ctx.lineTo(W, floorY + 40);
    ctx.closePath();
    ctx.fill();
    // Concrete texture stripes
    ctx.strokeStyle = 'rgba(15,23,42,0.18)';
    ctx.lineWidth = 1;
    for (var s = 0; s < 8; s++) {
      ctx.beginPath();
      ctx.moveTo(leftLipX - radius * 0.55 + s * 6, lipY);
      ctx.lineTo(leftLipX, floorY);
      ctx.stroke();
    }
    // Lip rails
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftLipX - radius * 0.6, lipY);
    ctx.lineTo(leftLipX - radius * 0.45, lipY);
    ctx.moveTo(rightLipX + radius * 0.45, lipY);
    ctx.lineTo(rightLipX + radius * 0.6, lipY);
    ctx.stroke();
    // Skater — drawn at state.x, state.y with rotation state.angle
    var sx = state.skX != null ? state.skX : leftLipX;
    var sy = state.skY != null ? state.skY : lipY;
    var rot = state.skRot || 0;
    // Body
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot * Math.PI / 180);
    // Board
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-18, 6, 36, 5);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-12, 12, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 12, 2.5, 0, Math.PI * 2); ctx.fill();
    // Body (stick figure)
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, -14);
    // Arms
    ctx.moveTo(-10, -4);
    ctx.lineTo(10, -4);
    ctx.stroke();
    // Head
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // HUD overlay — speed + height labels (top-left, monospace)
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    if (state.label) {
      ctx.fillText(state.label, 10, 18);
    }
    if (state.speedMph != null) {
      ctx.fillText('Speed: ' + state.speedMph.toFixed(1) + ' mph', 10, 36);
    }
    if (state.airHeightFt != null) {
      ctx.fillText('Air: ' + state.airHeightFt.toFixed(1) + ' ft', 10, 54);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // CANVAS RENDER — GAP JUMP
  // Draws side-view: ramp on left, gap, landing platform on right.
  // Animates the skater along the parabolic arc.
  // ──────────────────────────────────────────────────────────────────
  function drawGapJump(canvas, state) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    // Sky
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1e3a8a'); grad.addColorStop(0.7, '#1e293b'); grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // Ground
    var groundY = H * 0.78;
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, groundY, W, H - groundY);
    // Ramp — left platform with sloped takeoff
    var rampX = W * 0.18;
    var rampTopY = H * 0.55;
    var rampBaseY = groundY;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, rampBaseY);
    ctx.lineTo(rampX - 30, rampBaseY);
    ctx.lineTo(rampX, rampTopY);
    ctx.lineTo(0, rampTopY);
    ctx.closePath();
    ctx.fill();
    // Gap label
    var gapStartX = rampX;
    var pxPerFt = (W * 0.6) / 25;  // 25 ft visible
    var gapWidthPx = (state.gapFt || 12) * pxPerFt;
    var gapEndX = gapStartX + gapWidthPx;
    // Landing platform
    ctx.fillStyle = '#475569';
    ctx.fillRect(gapEndX, rampTopY + 14, W - gapEndX, H - rampTopY - 14);
    // Gap ground (visible cliff)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(gapStartX, rampTopY, gapWidthPx, groundY - rampTopY);
    // Gap distance label
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gapStartX, rampTopY - 18);
    ctx.lineTo(gapEndX, rampTopY - 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((state.gapFt || 12) + ' ft', (gapStartX + gapEndX) / 2, rampTopY - 24);
    // Trajectory preview (when previewing or animating)
    if (state.preview) {
      ctx.strokeStyle = 'rgba(251,191,36,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      var v = state.previewV;
      var th = state.previewTheta;
      var x0 = rampX, y0 = rampTopY;
      var pxPerM = pxPerFt * M2FT;
      for (var t = 0; t <= state.previewHang; t += 0.05) {
        var x = x0 + (v * Math.cos(th) * t) * pxPerM;
        var y = y0 - (v * Math.sin(th) * t - 0.5 * G * t * t) * pxPerM;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Skater current position
    var sx = state.skX != null ? state.skX : rampX;
    var sy = state.skY != null ? state.skY : rampTopY;
    var rot = state.skRot || 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot * Math.PI / 180);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-14, 4, 28, 4);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-9, 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, -10);
    ctx.moveTo(-8, -2);
    ctx.lineTo(8, -2);
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath(); ctx.arc(0, -16, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // HUD
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Speed: ' + (state.speedMph || 0).toFixed(1) + ' mph', 10, 18);
    ctx.fillText('Angle: ' + (state.angleDeg || 0).toFixed(0) + '°', 10, 36);
    if (state.label) {
      ctx.textAlign = 'right';
      ctx.fillText(state.label, W - 10, 18);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ANIMATION HELPERS — Halfpipe + Gap Jump have different parametric
  // motion. Both use rAF and write into the active canvas.
  // ──────────────────────────────────────────────────────────────────
  function animateHalfpipe(canvas, sim, opts) {
    if (!canvas) return;
    var W = canvas.width, H = canvas.height;
    var midX = W / 2;
    var floorY = H * 0.86;
    var lipY = H * 0.30;
    var lipHalfW = W * 0.36;
    var leftLipX = midX - lipHalfW;
    var rightLipX = midX + lipHalfW;
    var pxPerM = (floorY - lipY) / 4.0;  // fixed scale
    var t = 0;
    var phase = 'descend'; // descend → pump → ascend → air → land
    var pumpsLeft = sim.pumps;
    var doneCb = opts && opts.onDone;
    var raf = 0;
    function step() {
      var state = { gapFt: 0 };
      if (phase === 'descend') {
        // Drop in: arc from left lip to floor center
        var p = Math.min(1, t / 0.45);
        var arc = Math.sin(p * Math.PI / 2);
        state.skX = leftLipX + arc * lipHalfW;
        state.skY = lipY + arc * (floorY - lipY - 16);
        state.skRot = 0;
        state.label = 'Drop in!';
        state.speedMph = sim.v0 * MPS2MPH * arc;
        state.airHeightFt = 0;
        if (p >= 1) { phase = 'pump'; t = 0; }
      } else if (phase === 'pump') {
        if (pumpsLeft > 0) {
          state.skX = midX;
          state.skY = floorY - 20;
          state.skRot = 0;
          state.label = '⚡ Pump! ' + (sim.pumps - pumpsLeft + 1) + '/' + sim.pumps;
          state.speedMph = sim.vTakeoff * MPS2MPH * (0.7 + 0.3 * (sim.pumps - pumpsLeft) / Math.max(1, sim.pumps));
          state.airHeightFt = 0;
          if (t > 0.4) { pumpsLeft--; sfxPump(); t = 0; }
        } else {
          phase = 'ascend'; t = 0;
        }
      } else if (phase === 'ascend') {
        // Up the right wall to launch
        var p = Math.min(1, t / 0.5);
        var arc = Math.sin(p * Math.PI / 2);
        state.skX = midX + arc * lipHalfW;
        state.skY = floorY - 16 - arc * (floorY - lipY - 16);
        state.skRot = -arc * 90;
        state.label = 'Pop!';
        state.speedMph = sim.vTakeoff * MPS2MPH * (1 - arc * 0.2);
        state.airHeightFt = 0;
        if (p >= 1) { phase = 'air'; t = 0; sfxPop(); }
      } else if (phase === 'air') {
        // Project upward and back. Parabolic.
        var airT = t;
        if (airT > sim.airTime) {
          phase = 'land'; t = 0;
          if (sim.landed) { sfxLandClean(); skAnnounce('Landed! ' + sim.trick.label); }
          else { sfxBail(); skAnnounce('Bail. Not enough air for the ' + sim.trick.label); }
          return;
        }
        // height above lip
        var h = (sim.vTakeoff * 0.85) * airT - 0.5 * G * airT * airT;
        if (h < 0) h = 0;
        state.skX = rightLipX + 6;
        state.skY = lipY - h * pxPerM;
        // Rotation: linear with air time, capped at trick.rotation
        var totalRot = Math.min(sim.trick.rotation, sim.rotationCompleted * (airT / sim.airTime));
        state.skRot = sim.trick.axis === 'body' ? -totalRot : -totalRot;
        state.label = sim.trick.emoji + ' ' + sim.trick.label;
        state.speedMph = sim.vTakeoff * MPS2MPH;
        state.airHeightFt = h * M2FT;
      } else if (phase === 'land') {
        // hold final pose briefly, then end
        state.skX = rightLipX + 6;
        state.skY = lipY + (sim.landed ? 8 : 26);
        state.skRot = sim.landed ? 0 : 80;
        state.label = sim.landed ? '✅ ' + sim.trick.label : '❌ Bail';
        state.speedMph = 0;
        state.airHeightFt = 0;
        if (t > 0.9) {
          if (doneCb) doneCb();
          return;
        }
      }
      drawHalfpipe(canvas, state);
      t += 1 / 60;
      raf = requestAnimationFrame(step);
    }
    sfxRoll();
    raf = requestAnimationFrame(step);
    return function cancel() { cancelAnimationFrame(raf); };
  }

  function animateGapJump(canvas, sim, opts) {
    if (!canvas) return;
    var W = canvas.width, H = canvas.height;
    var rampX = W * 0.18;
    var rampTopY = H * 0.55;
    var pxPerFt = (W * 0.6) / 25;
    var pxPerM = pxPerFt * M2FT;
    var t = 0;
    var phase = 'roll'; // roll → launch → flight → land
    var doneCb = opts && opts.onDone;
    var raf = 0;
    function step() {
      var state = { gapFt: sim.gapFt, speedMph: sim.v_mph, angleDeg: sim.thetaDeg, label: '' };
      if (phase === 'roll') {
        // Roll up the ramp
        var p = Math.min(1, t / 0.6);
        state.skX = -10 + p * (rampX + 10);
        state.skY = (H * 0.78) - p * ((H * 0.78) - rampTopY);
        state.skRot = -p * sim.thetaDeg * 0.4;
        state.label = 'Rolling up...';
        if (p >= 1) { phase = 'flight'; t = 0; sfxPop(); }
      } else if (phase === 'flight') {
        if (t > sim.hangTime) {
          phase = 'land'; t = 0;
          if (sim.landed) { sfxLandClean(); skAnnounce('Cleared the ' + sim.gapFt + ' foot gap!'); }
          else { sfxBail(); skAnnounce(sim.clearance < 0 ? 'Came up short. Need more speed or a steeper angle.' : 'Overshot the landing!'); }
          return;
        }
        var x = sim.vM * Math.cos(sim.theta) * t;
        var y = sim.vM * Math.sin(sim.theta) * t - 0.5 * G * t * t;
        state.skX = rampX + x * pxPerM;
        state.skY = rampTopY - y * pxPerM;
        state.skRot = -sim.thetaDeg + (t / sim.hangTime) * sim.thetaDeg * 1.7;
        state.label = '🛹 ' + (state.skY > rampTopY - sim.peakHM * pxPerM * 0.95 ? 'rising' : 'falling');
      } else if (phase === 'land') {
        // hold
        state.skX = rampX + sim.rangeM * pxPerM;
        state.skY = rampTopY + (sim.landed ? 14 : 50);
        state.skRot = sim.landed ? 0 : 65;
        state.label = sim.landed ? '✅ Cleared!' : '❌ ' + (sim.clearance < 0 ? 'Short' : 'Overshot');
        if (t > 1.0) { if (doneCb) doneCb(); return; }
      }
      drawGapJump(canvas, state);
      t += 1 / 60;
      raf = requestAnimationFrame(step);
    }
    sfxRoll();
    raf = requestAnimationFrame(step);
    return function cancel() { cancelAnimationFrame(raf); };
  }

  // ──────────────────────────────────────────────────────────────────
  // PLUGIN REGISTRATION
  // ──────────────────────────────────────────────────────────────────
  window.StemLab.registerTool('skatelab', {
    icon: '🛹',
    label: 'SkateLab',
    desc: 'Skate / BMX physics: kickflips, halfpipe pumps, and gap jumps. Same physics that lands a 720.',
    color: 'amber',
    category: 'science',
    questHooks: [
      { id: 'sk_first_land', label: 'Land your first trick', icon: '🛹',
        check: function(d) { return (d.landings || 0) >= 1; },
        progress: function(d) { return (d.landings || 0) + '/1 lands'; } },
      { id: 'sk_land_5', label: 'Land 5 tricks', icon: '🎯',
        check: function(d) { return (d.landings || 0) >= 5; },
        progress: function(d) { return (d.landings || 0) + '/5 lands'; } },
      { id: 'sk_360', label: 'Land a 360 spin', icon: '🌀',
        check: function(d) { return !!(d.landedTricks && d.landedTricks.spin360); },
        progress: function(d) { return (d.landedTricks && d.landedTricks.spin360) ? '✓' : 'pending'; } },
      { id: 'sk_clear_15', label: 'Clear a 15+ ft gap', icon: '🦘',
        check: function(d) { return (d.longestGap || 0) >= 15; },
        progress: function(d) { return (d.longestGap || 0) + ' ft best'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;

      // ── State init ──────────────────────────────────────────────
      if (!labToolData || !labToolData.skatelab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { skatelab: {
            mode: 'halfpipe',
            // Halfpipe input
            pumps: 3,
            trickId: 'kickflip',
            // Gap jump input
            speedMph: 14,
            angleDeg: 30,
            gapFt: 12,
            // Stats
            landings: 0,
            bails: 0,
            attempts: 0,
            longestGap: 0,
            biggestSpin: 0,
            tricksUsed: {},
            landedTricks: {},
            lastResult: null,
            running: false
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } }, 'Initializing SkateLab...');
      }
      var d = labToolData.skatelab;
      function upd(k, v) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev);
          next.skatelab = Object.assign({}, prev.skatelab, typeof k === 'object' ? k : { [k]: v });
          return next;
        });
      }

      var canvasRef = React.useRef(null);
      var cancelAnimRef = React.useRef(null);

      // Generate a fresh gap on each "New Gap" press
      function newGap() {
        var ft = 8 + Math.floor(Math.random() * 15); // 8-22 ft
        upd('gapFt', ft);
        skAnnounce('New gap: ' + ft + ' feet.');
      }

      function runHalfpipe() {
        if (d.running) return;
        var sim = simHalfpipe({ pumps: d.pumps, trickId: d.trickId });
        upd({ running: true, lastResult: null, attempts: (d.attempts || 0) + 1 });
        if (cancelAnimRef.current) cancelAnimRef.current();
        cancelAnimRef.current = animateHalfpipe(canvasRef.current, sim, {
          onDone: function() {
            var bumps = {};
            bumps.running = false;
            bumps.lastResult = {
              mode: 'halfpipe',
              landed: sim.landed, score: sim.score,
              vMph: sim.vTakeoff * MPS2MPH, hFt: sim.hAir * M2FT,
              airTime: sim.airTime, trick: sim.trick.label,
              rotation: sim.trick.rotation, completed: sim.rotationCompleted
            };
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.tricksUsed = Object.assign({}, d.tricksUsed || {}, { [sim.trick.id]: ((d.tricksUsed || {})[sim.trick.id] || 0) + 1 });
              bumps.landedTricks = Object.assign({}, d.landedTricks || {}, { [sim.trick.id]: true });
              bumps.biggestSpin = Math.max(d.biggestSpin || 0, sim.trick.rotation);
              if (awardXP) awardXP(sim.score, 'SkateLab — ' + sim.trick.label, 'skatelab');
              if (addToast) addToast('🛹 Landed ' + sim.trick.label + '! +' + sim.score + ' XP', 'success');
            } else {
              bumps.bails = (d.bails || 0) + 1;
              if (addToast) addToast('💥 Bail. ' + (sim.airTime < sim.trick.minAir ? 'Need ' + sim.trick.minAir.toFixed(2) + 's air, only got ' + sim.airTime.toFixed(2) + 's.' : 'Almost!'), 'info');
            }
            upd(bumps);
          }
        });
      }

      function runGapJump() {
        if (d.running) return;
        var sim = simGapJump({ speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt });
        upd({ running: true, lastResult: null, attempts: (d.attempts || 0) + 1 });
        if (cancelAnimRef.current) cancelAnimRef.current();
        cancelAnimRef.current = animateGapJump(canvasRef.current, sim, {
          onDone: function() {
            var bumps = { running: false };
            bumps.lastResult = {
              mode: 'gap',
              landed: sim.landed, score: sim.score,
              vMph: sim.v_mph, angleDeg: sim.thetaDeg, gapFt: sim.gapFt,
              rangeFt: sim.rangeFt, peakFt: sim.peakHFt, hangTime: sim.hangTime,
              clearance: sim.clearance * M2FT
            };
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.longestGap = Math.max(d.longestGap || 0, sim.gapFt);
              if (awardXP) awardXP(sim.score, 'SkateLab — ' + sim.gapFt + 'ft gap', 'skatelab');
              if (addToast) addToast('🦘 Cleared ' + sim.gapFt + ' ft! +' + sim.score + ' XP', 'success');
            } else {
              bumps.bails = (d.bails || 0) + 1;
              if (addToast) addToast(sim.clearance < 0 ? '💥 Came up short by ' + Math.abs(sim.clearance * M2FT).toFixed(1) + ' ft.' : '💥 Overshot by ' + (sim.clearance * M2FT - 1.2).toFixed(1) + ' ft.', 'info');
            }
            upd(bumps);
          }
        });
      }

      // Re-render canvas when state changes (and not animating)
      React.useEffect(function() {
        if (d.running) return;
        if (d.mode === 'halfpipe') {
          drawHalfpipe(canvasRef.current, { skX: null, skY: null, skRot: 0, speedMph: 0, airHeightFt: 0, label: 'Ready' });
        } else {
          // Pre-compute predicted trajectory for visual feedback
          var sim = simGapJump({ speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt });
          drawGapJump(canvasRef.current, {
            skX: null, skY: null, skRot: 0,
            speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt,
            preview: true, previewV: sim.vM, previewTheta: sim.theta, previewHang: sim.hangTime,
            label: 'Ready'
          });
        }
        return function() {
          if (cancelAnimRef.current) cancelAnimRef.current();
        };
      }, [d.mode, d.speedMph, d.angleDeg, d.gapFt, d.pumps, d.trickId, d.running]);

      // ── Render UI ───────────────────────────────────────────────
      var modeBtn = function(id, label, emoji) {
        var sel = d.mode === id;
        return h('button', {
          key: id,
          onClick: function() { upd('mode', id); skAnnounce(label + ' mode'); },
          'aria-pressed': sel,
          'data-sk-focusable': 'true',
          style: {
            padding: '8px 16px', borderRadius: 999,
            background: sel ? 'linear-gradient(135deg,#d97706,#b45309)' : 'rgba(254,243,199,0.10)',
            color: sel ? '#fff' : '#fef3c7',
            border: '1px solid ' + (sel ? '#92400e' : 'rgba(254,243,199,0.30)'),
            fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }
        }, emoji + ' ' + label);
      };

      return h('div', { style: { color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', maxWidth: 920, margin: '0 auto', padding: 16 } },
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && setStemLabTool ? h('button', {
            onClick: function() { setStemLabTool(null); },
            'aria-label': 'Back to STEM Lab',
            'data-sk-focusable': 'true',
            style: { padding: 6, background: 'transparent', border: '1px solid #475569', borderRadius: 8, color: '#fef3c7', cursor: 'pointer' }
          }, h(ArrowLeft, { size: 16 })) : null,
          h('div', { style: { fontSize: 30 } }, '🛹'),
          h('div', { style: { flex: 1 } },
            h('h2', { style: { margin: 0, color: '#fbbf24', fontSize: 22, fontWeight: 900, letterSpacing: '0.02em' } }, 'SkateLab'),
            h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 12 } }, 'Skate / BMX physics — same math that lands a 720.')
          )
        ),
        // Mode selector
        h('div', { role: 'tablist', 'aria-label': 'SkateLab mode', style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          modeBtn('halfpipe', 'Halfpipe', '🛹'),
          modeBtn('gap', 'Gap Jump', '🦘')
        ),
        // Canvas
        h('div', { style: { background: '#0f172a', borderRadius: 12, border: '2px solid #78350f', padding: 8, marginBottom: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' } },
          h('canvas', {
            ref: canvasRef,
            width: 720, height: 320,
            'aria-label': d.mode === 'halfpipe'
              ? 'Halfpipe simulation. Choose pumps and trick, then drop in.'
              : 'Gap jump simulation. Adjust speed and angle to clear the gap.',
            style: { width: '100%', height: 'auto', display: 'block', borderRadius: 8 }
          })
        ),
        // Mode-specific controls
        d.mode === 'halfpipe' && h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } },
          h('div', { style: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-pumps' }, '⚡ Pumps: ' + d.pumps),
            h('input', {
              id: 'sk-pumps', type: 'range', min: 0, max: 6, value: d.pumps,
              onChange: function(e) { upd('pumps', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            }),
            h('p', { style: { margin: '6px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } },
              'Each pump adds kinetic energy. KE → PE at the lip. More pumps = more air.')
          ),
          h('div', { style: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' } }, '🛹 Trick'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              TRICKS.map(function(tk) {
                var sel = d.trickId === tk.id;
                return h('button', {
                  key: tk.id,
                  onClick: function() { upd('trickId', tk.id); },
                  disabled: d.running,
                  'aria-pressed': sel,
                  'data-sk-focusable': 'true',
                  title: tk.label + ' — ' + tk.rotation + '° around ' + tk.axis + ' axis · needs ' + tk.minAir.toFixed(2) + 's air',
                  style: {
                    padding: '4px 8px', fontSize: 11, fontWeight: 700,
                    background: sel ? '#d97706' : 'rgba(254,243,199,0.10)',
                    color: sel ? '#fff' : '#fef3c7',
                    border: '1px solid ' + (sel ? '#92400e' : 'rgba(254,243,199,0.25)'),
                    borderRadius: 6, cursor: d.running ? 'not-allowed' : 'pointer'
                  }
                }, tk.emoji + ' ' + tk.label);
              })
            ),
            h('p', { style: { margin: '6px 0 0', fontSize: 10, color: '#94a3b8' } },
              'Selected: ' + getTrick(d.trickId).rotation + '° rotation · needs ≥ ' + getTrick(d.trickId).minAir.toFixed(2) + 's air')
          )
        ),
        d.mode === 'gap' && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 } },
          h('div', { style: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-speed' }, '🚀 Speed: ' + d.speedMph + ' mph'),
            h('input', {
              id: 'sk-speed', type: 'range', min: 5, max: 30, value: d.speedMph,
              onChange: function(e) { upd('speedMph', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            })
          ),
          h('div', { style: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-angle' }, '📐 Angle: ' + d.angleDeg + '°'),
            h('input', {
              id: 'sk-angle', type: 'range', min: 15, max: 60, value: d.angleDeg,
              onChange: function(e) { upd('angleDeg', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            })
          ),
          h('div', { style: { background: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' } }, '↔️ Gap: ' + d.gapFt + ' ft'),
            h('button', {
              onClick: newGap, disabled: d.running,
              'data-sk-focusable': 'true',
              style: { marginTop: 8, padding: '6px 10px', background: 'rgba(254,243,199,0.10)', color: '#fef3c7', border: '1px solid rgba(254,243,199,0.30)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
            }, '🎲 New Gap')
          )
        ),
        // Run button
        h('button', {
          onClick: d.mode === 'halfpipe' ? runHalfpipe : runGapJump,
          disabled: d.running,
          'aria-label': d.mode === 'halfpipe' ? 'Drop in and attempt the trick' : 'Send it across the gap',
          'data-sk-focusable': 'true',
          style: {
            width: '100%', padding: '12px 20px', marginBottom: 12,
            background: d.running ? '#475569' : 'linear-gradient(135deg, #b45309, #7c2d12)',
            color: '#fef3c7', border: '2px solid #78350f', borderRadius: 12,
            fontSize: 16, fontWeight: 800, cursor: d.running ? 'wait' : 'pointer',
            boxShadow: d.running ? 'none' : '0 4px 15px rgba(120,53,15,0.4), inset 0 1px 0 rgba(255,235,170,0.3)',
            letterSpacing: '0.04em'
          }
        }, d.running ? '⏳ Sending it...' : (d.mode === 'halfpipe' ? '🛹 Drop In!' : '🦘 Send It!')),
        // Last-result analysis panel — pedagogically valuable, shows
        // the actual physics that produced what the student just saw.
        d.lastResult && h('div', { style: { background: d.lastResult.landed ? 'rgba(22,163,74,0.12)' : 'rgba(180,83,9,0.12)', border: '1px solid ' + (d.lastResult.landed ? '#22c55e' : '#d97706'), borderRadius: 10, padding: 12, marginBottom: 12 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: d.lastResult.landed ? '#86efac' : '#fbbf24', marginBottom: 6 } },
            d.lastResult.landed ? '✅ Clean landing — what made it work' : '💥 Bail — here\'s why'),
          d.lastResult.mode === 'halfpipe'
            ? h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, fontFamily: 'monospace' } },
                h('div', null, '⚡ Takeoff speed: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.vMph.toFixed(1) + ' mph')),
                h('div', null, '📈 Air height (above lip): ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.hFt.toFixed(2) + ' ft')),
                h('div', null, '⏱ Hang time: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.airTime.toFixed(2) + ' s')),
                h('div', null, '🌀 Rotation: ', h('b', { style: { color: '#fbbf24' } }, Math.round(d.lastResult.completed) + '° of ' + d.lastResult.rotation + '° needed')),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
            : h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, fontFamily: 'monospace' } },
                h('div', null, '🚀 Takeoff: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.vMph + ' mph at ' + d.lastResult.angleDeg + '°')),
                h('div', null, '📐 Range = v² × sin(2θ) / g = ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.rangeFt.toFixed(2) + ' ft'), ' (needed ' + d.lastResult.gapFt + ' ft)'),
                h('div', null, '⛰ Peak height: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.peakFt.toFixed(2) + ' ft')),
                h('div', null, '⏱ Hang time: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.hangTime.toFixed(2) + ' s')),
                h('div', null, '🎯 Clearance: ', h('b', { style: { color: d.lastResult.landed ? '#86efac' : '#fbbf24' } }, (d.lastResult.clearance >= 0 ? '+' : '') + d.lastResult.clearance.toFixed(2) + ' ft')),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
        ),
        // Stats footer
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 } },
          [
            { label: 'Lands',   val: d.landings || 0, color: '#86efac' },
            { label: 'Bails',   val: d.bails || 0,    color: '#fca5a5' },
            { label: 'Best Spin', val: (d.biggestSpin || 0) + '°', color: '#fbbf24' },
            { label: 'Longest Gap', val: (d.longestGap || 0) + ' ft', color: '#a5b4fc' }
          ].map(function(s, i) {
            return h('div', { key: i, style: { background: 'rgba(254,243,199,0.06)', border: '1px solid rgba(254,243,199,0.18)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' } },
              h('div', { style: { fontSize: 18, fontWeight: 900, color: s.color } }, String(s.val)),
              h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, s.label)
            );
          })
        ),
        // Educational annotations panel — frames why this is real STEM,
        // not a game. Switches text by mode.
        h('details', { style: { background: 'rgba(254,243,199,0.04)', border: '1px solid rgba(254,243,199,0.18)', borderRadius: 10, padding: 10, marginBottom: 8 } },
          h('summary', { style: { cursor: 'pointer', color: '#fbbf24', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' } }, '📚 The physics behind this'),
          h('div', { style: { marginTop: 10, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
            d.mode === 'halfpipe'
              ? [
                  h('p', { key: 1, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, 'Pumping = doing work. '),
                    'Each time you push down at the bottom of the halfpipe, your legs add kinetic energy. KE = ½mv². More pumps → more KE → more speed at the lip.'),
                  h('p', { key: 2, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, 'Lip → air = KE → PE. '),
                    'Above the lip, the skater\'s kinetic energy converts to gravitational potential energy. Solving ½mv² = mgh gives air height: h = v² / (2g). Doubling your speed quadruples your air.'),
                  h('p', { key: 3, style: { margin: 0 } },
                    h('b', { style: { color: '#fbbf24' } }, 'Spin needs hang time. '),
                    'Your rotation rate (deg/s) is roughly fixed for a given trick. To complete a 720, you need air_time × rate ≥ 720°. That\'s why bigger spins demand more pumps.')
                ]
              : [
                  h('p', { key: 1, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, 'Range formula: '),
                    'For a takeoff at speed v and angle θ, projectile range = v² × sin(2θ) / g. Maximum range at θ = 45°. Steeper angle gives more height; shallower gives more distance per unit speed.'),
                  h('p', { key: 2, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, 'Speed scales squared. '),
                    'Doubling your takeoff speed quadruples your range — same as pumping in the halfpipe. That\'s why pros sprint hard at gaps.'),
                  h('p', { key: 3, style: { margin: 0 } },
                    h('b', { style: { color: '#fbbf24' } }, 'Peak height: '),
                    'h_peak = (v · sinθ)² / (2g). At 30° and 15 mph you peak ~3 ft above takeoff; at 45° you peak ~6 ft. More vertical means more time to spot the landing.')
                ]
          )
        )
      );
    }
  });
})();
