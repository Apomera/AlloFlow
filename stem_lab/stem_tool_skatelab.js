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

  // ── Coach personas ────────────────────────────────────────────────
  // Four voice options for the AI coach. Each persona's `prepend`
  // string is injected at the top of every Gemini prompt so the
  // response feels distinct. Mirrors ThrowLab's COACH_PERSONAS pattern.
  var COACH_PERSONAS = [
    {
      id: 'analyst', label: 'Analyst', icon: '📊',
      prepend: 'You are a calm, broadcast-style sports analyst — measured, observational, focused on what the data shows. Use second-person ("you"), 2-3 short sentences, no exclamation points. Reference one specific number from the attempt.'
    },
    {
      id: 'oldschool', label: 'Old School', icon: '🎤',
      prepend: 'You are a terse, demanding old-school skate coach. Direct, no-nonsense, "do it again, this time better" energy. 2 sentences max. Reference one mistake or one strength specifically. No emojis.'
    },
    {
      id: 'hype', label: 'Hype Man', icon: '🔥',
      prepend: 'You are an energetic hype man — celebrate effort, encourage the next attempt. 2-3 short sentences with energy. Reference one specific physics insight in plain language. ONE emoji max.'
    },
    {
      id: 'zen', label: 'Zen', icon: '🧘',
      prepend: 'You are a Zen master coach — Phil Jackson reflective. Speak about flow, intention, the relationship between body and physics. 2-3 sentences, calm cadence. Reference one specific number in a contemplative way. No emojis.'
    }
  ];
  function getPersona(id) {
    for (var i = 0; i < COACH_PERSONAS.length; i++) if (COACH_PERSONAS[i].id === id) return COACH_PERSONAS[i];
    return COACH_PERSONAS[0];
  }

  // ── Surface presets ──────────────────────────────────────────────
  // The KE → PE conversion in the halfpipe loses energy to friction +
  // drag on the way up. v1 hardcoded this loss as 15% (efficiency 0.85).
  // SURFACES lets the student see how the same ramp behaves with a
  // freshly-waxed coping (almost no loss) vs a dusty backyard pool
  // (heavy loss). Same physics, different one knob.
  var SURFACES = [
    { id: 'wax',      label: 'Waxed',    icon: '✨', efficiency: 0.95, blurb: 'Smooth coping, freshly waxed. Almost no friction.' },
    { id: 'standard', label: 'Standard', icon: '🛹', efficiency: 0.85, blurb: 'Typical concrete halfpipe — what v1 assumed.' },
    { id: 'rough',    label: 'Rough',    icon: '🌵', efficiency: 0.72, blurb: 'Dusty backyard pool, lots of energy lost to friction.' }
  ];
  function getSurface(id) {
    for (var i = 0; i < SURFACES.length; i++) if (SURFACES[i].id === id) return SURFACES[i];
    return SURFACES[1]; // standard default
  }

  // ── Wind presets (gap-jump only) ──────────────────────────────────
  // Wind adds a constant horizontal acceleration during the parabolic
  // flight. Tailwind helps you clear the gap; headwind cuts your range.
  // Modeled as `aWind` (m/s² along takeoff direction): + tailwind, − headwind.
  // Pedagogically teaches relative velocity and lets students see why
  // outdoor skaters check the wind before a big gap attempt.
  var WIND_PRESETS = [
    { id: 'calm',       label: 'Calm',          icon: '☀️', mph: 0,   blurb: 'Indoor or perfectly still day.' },
    { id: 'tail_light', label: 'Light Tailwind', icon: '🍃', mph: 6,   blurb: '6 mph behind you. Adds a little range.' },
    { id: 'tail_strong',label: 'Strong Tailwind',icon: '💨', mph: 14,  blurb: '14 mph push from behind.' },
    { id: 'head_light', label: 'Light Headwind', icon: '🌬️', mph: -6,  blurb: '6 mph against you. Cuts a little range.' },
    { id: 'head_strong',label: 'Strong Headwind',icon: '🌪️', mph: -14, blurb: '14 mph straight in your face.' }
  ];
  function getWind(id) {
    for (var i = 0; i < WIND_PRESETS.length; i++) if (WIND_PRESETS[i].id === id) return WIND_PRESETS[i];
    return WIND_PRESETS[0];
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
    // Convert KE → vertical air at the lip. Surface preset dictates
    // how much of the kinetic energy survives the climb. Waxed coping
    // ≈ 0.95, standard concrete ≈ 0.85, rough/dusty ≈ 0.72.
    var surface = getSurface(opts.surfaceId || 'standard');
    var efficiency = surface.efficiency;
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
      vehicle: vehicle, gravity: g, surface: surface,
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
    var g = opts.gravity || G;
    var vehicle = getVehicle(opts.vehicle || 'skate');
    var wind = getWind(opts.windId || 'calm');
    var windMs = wind.mph / MPS2MPH; // m/s, positive = tailwind
    // Hang time depends only on vertical velocity + gravity (wind is
    // horizontal). Range is the standard projectile + horizontal wind
    // contribution: x(t) = v·cosθ·t + 0.5·a_wind·t². We approximate
    // a_wind as 0.18·windMs (a calibration that makes a 14 mph wind
    // shift a 50 ft gap by ~6-8 ft, roughly matching real outdoor
    // skate-gap experience).
    var hangTime = (2 * v * Math.sin(theta)) / g; // s
    var aWind = 0.18 * windMs; // m/s², along takeoff direction
    var rangeCalm = (v * v * Math.sin(2 * theta)) / g; // m
    var range = rangeCalm + 0.5 * aWind * hangTime * hangTime; // m, with wind
    var peakH = (v * v * Math.sin(theta) * Math.sin(theta)) / (2 * g); // m
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
      rangeCalmFt: rangeCalm * M2FT, windDeltaFt: (range - rangeCalm) * M2FT,
      peakHM: peakH, peakHFt: peakH * M2FT,
      hangTime: hangTime, clearance: clearance,
      vehicle: vehicle, gravity: g, wind: wind,
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
    // Wind indicator (top-right) — arrow points the direction the air
    // is moving relative to the skater. Tailwind: arrow points right
    // (with takeoff). Headwind: arrow points left (against takeoff).
    if (state.wind && state.wind.id !== 'calm') {
      var w = state.wind;
      var wx = W - 96, wy = 38;
      var dir = w.mph > 0 ? 1 : -1;
      var len = Math.min(28, 12 + Math.abs(w.mph) * 1.0);
      ctx.save();
      ctx.strokeStyle = w.mph > 0 ? 'rgba(134,239,172,0.85)' : 'rgba(252,165,165,0.85)';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + dir * len, wy);
      ctx.stroke();
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(wx + dir * len, wy);
      ctx.lineTo(wx + dir * (len - 6), wy - 4);
      ctx.lineTo(wx + dir * (len - 6), wy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillText(w.icon + ' ' + Math.abs(w.mph) + ' mph', wx + dir * (len + 6), wy + 4);
      ctx.restore();
    }
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
    // Slow-mo support — opts.speedMul scales dt during the AIR phase
    // only, so the educational moment (parabolic arc + rotation
    // completion) plays at 0.5x or 0.25x. Pump/descent stay full
    // speed to keep the loop tight.
    var speedMul = (opts && opts.speedMul) || 1.0;
    var dt = (1 / 60) * speedMul;
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
        // BUG FIX (v6 audit): drive height directly from sim.hAir with
        // a normalized parametric arc instead of hardcoded G + 0.85.
        // The previous formula `h = (vTakeoff * 0.85) * t - 0.5 * G * t²`
        // ignored opts.gravity and opts.surfaceId, which meant Moonshot
        // Kickflip and Rough-surface scenarios animated at Earth-gravity
        // / standard-efficiency even though the math underneath used the
        // right values. Now the visual peak always matches sim.hAir at
        // p=0.5 regardless of gravity / surface / vehicle.
        var p = sim.airTime > 0 ? Math.min(1, airT / sim.airTime) : 0;
        var h = sim.hAir * 4 * p * (1 - p);  // parabola peaks at p = 0.5
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
      t += (phase === 'air') ? dt : (1 / 60);  // only the air phase is slowed
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
    // Slow-mo support: opts.speedMul = 1.0 (default), 0.5 (half speed),
    // 0.25 (quarter speed). Reduces dt per frame so the same animation
    // plays back at human-friendly tempo for inspection.
    var speedMul = (opts && opts.speedMul) || 1.0;
    var dt = (1 / 60) * speedMul;
    // Wind acceleration during flight (m/s², horizontal). Pulled from
    // sim so the visual matches the math: tailwind pushes the skater
    // farther along the parabola than the calm trajectory would.
    var aWind = sim.wind ? (0.18 * (sim.wind.mph / MPS2MPH)) : 0;
    var g = sim.gravity || G;
    var t = 0;
    var phase = 'roll'; // roll → launch → flight → land
    var doneCb = opts && opts.onDone;
    var raf = 0;
    function step() {
      var state = { gapFt: sim.gapFt, speedMph: sim.v_mph, angleDeg: sim.thetaDeg, label: '', wind: sim.wind };
      if (phase === 'roll') {
        // Roll up the ramp (roll phase isn't slowed — only flight is)
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
        var x = sim.vM * Math.cos(sim.theta) * t + 0.5 * aWind * t * t;
        var y = sim.vM * Math.sin(sim.theta) * t - 0.5 * g * t * t;
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
      t += (phase === 'flight') ? dt : (1 / 60);  // only flight is slowed
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
        progress: function(d) { return (d.longestGap || 0) + ' ft best'; } },
      { id: 'sk_bmx_first_land', label: 'Land a trick on BMX', icon: '🚲',
        check: function(d) { return !!(d.bmxLanded); },
        progress: function(d) { return d.bmxLanded ? '✓' : 'pending'; } },
      { id: 'sk_scenarios_5', label: 'Try 5 famous-trick scenarios', icon: '🎬',
        check: function(d) { return (d.scenariosTried && Object.keys(d.scenariosTried).length >= 5); },
        progress: function(d) { return ((d.scenariosTried && Object.keys(d.scenariosTried).length) || 0) + '/5 tried'; } },
      { id: 'sk_coach_3', label: 'Ask the AI coach 3 times', icon: '🎙️',
        check: function(d) { return (d.coachOpens || 0) >= 3; },
        progress: function(d) { return (d.coachOpens || 0) + '/3 asks'; } }
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
      var callGemini = ctx.callGemini;

      // ── State init ──────────────────────────────────────────────
      if (!labToolData || !labToolData.skatelab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { skatelab: {
            mode: 'halfpipe',
            vehicle: 'skate',
            gravity: 9.81,
            surfaceId: 'standard',
            windId: 'calm',
            activeScenarioId: null,
            // Cached last sim for slow-mo replay
            lastSim: null,
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
            scenariosTried: {},
            bmxLanded: false,
            // Personal bests across the lifetime of the toolData
            bestHalfpipeScore: 0,
            bestGapScore: 0,
            bestAirFt: 0,
            // Coach state
            coachPersona: 'analyst',
            coachLoading: false,
            coachResponse: null,   // { text, persona, attemptId } — most recent reply
            coachOpens: 0,         // count of "Ask Coach" presses, for quest
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

      // ── Load a famous-trick scenario ─────────────────────────────
      // Sets every relevant key in toolData.skatelab from the
      // scenario's `presets` block, surfaces the scenario id so the
      // Lesson card renders, and announces the load to screen readers.
      function loadScenario(scenarioId) {
        var sc = getScenario(scenarioId);
        if (!sc) return;
        var p = sc.presets || {};
        var bumps = {
          activeScenarioId: sc.id,
          mode: sc.mode,
          vehicle: p.vehicle || 'skate',
          gravity: p.gravity || 9.81,
          lastResult: null
        };
        if (sc.mode === 'halfpipe') {
          if (p.pumps != null) bumps.pumps = p.pumps;
          if (p.trickId) bumps.trickId = p.trickId;
        } else {
          if (p.speedMph != null) bumps.speedMph = p.speedMph;
          if (p.angleDeg != null) bumps.angleDeg = p.angleDeg;
          if (p.gapFt != null) bumps.gapFt = p.gapFt;
        }
        // Track tried-scenarios for quest progress.
        var tried = Object.assign({}, d.scenariosTried || {});
        tried[sc.id] = (tried[sc.id] || 0) + 1;
        bumps.scenariosTried = tried;
        upd(bumps);
        skAnnounce('Loaded ' + sc.label + '. ' + (sc.mode === 'halfpipe' ? 'Halfpipe' : 'Gap jump') + ' mode, ' +
          (p.vehicle === 'bmx' ? 'BMX' : 'skateboard') + '.');
      }

      // ── printActivitySheet: classroom-friendly handout ──────────
      // Opens a popup window with a clean print-ready page containing
      // the active scenario's title, teach paragraph, and 3 questions
      // formatted with answer space. Mirrors ThrowLab's pattern. The
      // window has a print button + a brief CSS reset so the printed
      // sheet matches the on-screen preview.
      function printActivitySheet() {
        var sc = getScenario(d.activeScenarioId);
        if (!sc) {
          if (addToast) addToast('Load a scenario first to print its activity sheet.', 'info');
          return;
        }
        var win = window.open('', '_blank', 'width=720,height=900');
        if (!win) {
          if (addToast) addToast('Popup blocked — allow popups to print activity sheets.', 'error');
          return;
        }
        var p = sc.presets || {};
        var presetLines = [];
        if (sc.mode === 'halfpipe') {
          presetLines.push('Mode: Halfpipe');
          if (p.pumps != null) presetLines.push('Pumps: ' + p.pumps);
          if (p.trickId) presetLines.push('Trick: ' + getTrick(p.trickId).label);
        } else {
          presetLines.push('Mode: Gap Jump');
          if (p.speedMph != null) presetLines.push('Takeoff speed: ' + p.speedMph + ' mph');
          if (p.angleDeg != null) presetLines.push('Ramp angle: ' + p.angleDeg + '°');
          if (p.gapFt != null) presetLines.push('Gap: ' + p.gapFt + ' ft');
        }
        if (p.vehicle === 'bmx') presetLines.push('Vehicle: BMX (12 kg, slower rotation)');
        else presetLines.push('Vehicle: Skateboard (4 kg)');
        if (p.gravity && p.gravity !== 9.81) presetLines.push('Gravity: ' + p.gravity + ' m/s² (' + (p.gravity < 5 ? 'Moon' : 'Earth') + ')');
        var body = '' +
          '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<title>SkateLab — ' + sc.label + '</title>' +
          '<style>' +
            '*{box-sizing:border-box}' +
            'body{font-family:Georgia,serif;color:#1f2937;margin:0;padding:32px;background:#fff;line-height:1.5}' +
            'h1{font-size:22px;margin:0 0 4px;letter-spacing:0.02em}' +
            'h2{font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7c3aed;margin:18px 0 6px}' +
            '.icon{font-size:36px;display:inline-block;margin-right:6px;vertical-align:middle}' +
            '.meta{font-size:12px;color:#6b7280;margin:0 0 14px}' +
            '.preset{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:13px;margin:0 0 14px}' +
            '.preset div{margin:2px 0}' +
            'p{margin:0 0 10px;font-size:14px}' +
            'ol{padding-left:24px;margin:0 0 12px}' +
            'ol li{margin-bottom:14px;font-size:14px}' +
            '.lines{display:block;margin-top:6px;height:46px;background-image:repeating-linear-gradient(transparent,transparent 22px,#cbd5e1 23px);background-size:100% 23px;border-bottom:none}' +
            '.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}' +
            '.print-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer;margin:8px 0}' +
            '@media print{.print-btn{display:none}body{padding:24px}}' +
          '</style></head><body>' +
          '<button class="print-btn" onclick="window.print()">🖨️ Print</button>' +
          '<h1><span class="icon">' + sc.icon + '</span>SkateLab — ' + escapeHtml(sc.label) + '</h1>' +
          '<p class="meta">Name: ____________________________&nbsp;&nbsp;&nbsp;&nbsp;Date: __________________</p>' +
          '<h2>Setup</h2>' +
          '<div class="preset">' + presetLines.map(function(line) { return '<div>' + escapeHtml(line) + '</div>'; }).join('') + '</div>' +
          '<h2>The Scenario</h2>' +
          '<p>' + escapeHtml(sc.teach) + '</p>' +
          '<h2>Questions</h2>' +
          '<ol>' +
            sc.questions.map(function(q) {
              return '<li>' + escapeHtml(q) + '<span class="lines"></span></li>';
            }).join('') +
          '</ol>' +
          '<div class="foot"><span>SkateLab · STEM Lab · AlloFlow</span><span>Generated ' + new Date().toLocaleDateString() + '</span></div>' +
          '</body></html>';
        win.document.open();
        win.document.write(body);
        win.document.close();
        skAnnounce('Activity sheet opened for ' + sc.label + '. Use the print button or browser shortcut to send it to a printer.');
      }
      function escapeHtml(s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // ── askCoach: persona-flavored Gemini feedback ───────────────
      // Builds a prompt from: persona prepend + active scenario teach +
      // last attempt's physics. The model returns a 2-3 sentence
      // pedagogical note. Aborts cleanly if callGemini isn't wired.
      function askCoach() {
        if (!callGemini) {
          if (addToast) addToast('Coach is offline (no AI backend).', 'info');
          return;
        }
        if (d.coachLoading) return;
        if (!d.lastResult) {
          if (addToast) addToast('Take an attempt first — coach reviews your last run.', 'info');
          return;
        }
        var persona = getPersona(d.coachPersona);
        var sc = getScenario(d.activeScenarioId);
        var r = d.lastResult;

        // Compose the per-attempt physics summary in plain language.
        var attemptLine;
        if (r.mode === 'halfpipe') {
          attemptLine = (r.landed ? 'Landed' : 'Bailed') + ' a ' + r.trick +
            ' on the halfpipe. Takeoff speed ' + r.vMph.toFixed(1) + ' mph, air height ' + r.hFt.toFixed(2) + ' ft, ' +
            'hang time ' + r.airTime.toFixed(2) + ' s, completed ' + Math.round(r.completed) + '° of ' + r.rotation + '° needed. ' +
            'Vehicle: ' + (r.vehicle || 'skateboard') + '. Gravity: ' + (r.gravity || 9.81).toFixed(2) + ' m/s².';
        } else {
          attemptLine = (r.landed ? 'Cleared the' : 'Missed the') + ' ' + r.gapFt + ' ft gap. ' +
            'Took off at ' + r.vMph + ' mph at ' + r.angleDeg + '°, range ' + r.rangeFt.toFixed(1) + ' ft, ' +
            'peak height ' + r.peakFt.toFixed(1) + ' ft, hang time ' + r.hangTime.toFixed(2) + ' s. ' +
            'Clearance: ' + r.clearance.toFixed(1) + ' ft.';
        }
        var ctxLine = sc ? 'The student is working on the "' + sc.label + '" scenario. Teaching focus: ' + sc.teach : '';

        var prompt = persona.prepend + '\n\n' +
          'Context: ' + ctxLine + '\n\n' +
          'Attempt: ' + attemptLine + '\n\n' +
          'Give the student concise feedback on what worked or didn\'t, grounded in the physics. ' +
          'If they bailed, suggest one specific change (more pumps, different angle, etc.). ' +
          'If they landed, reinforce the physics concept they just demonstrated. ' +
          'Do NOT use markdown. Do NOT preface with "Here\'s your feedback" — speak directly to the student.';

        upd({ coachLoading: true, coachOpens: (d.coachOpens || 0) + 1 });
        skAnnounce(persona.label + ' coach is thinking.');
        // ThrowLab-pattern: callGemini returns a Promise<string>.
        Promise.resolve(callGemini(prompt, false)).then(function(reply) {
          var text = (typeof reply === 'string' ? reply : (reply && reply.text) || '').trim();
          if (!text) text = '(Coach had no comment — try again.)';
          upd({ coachLoading: false, coachResponse: { text: text, persona: persona.id, attemptId: d.attempts || 0 } });
          skAnnounce(persona.label + ' coach: ' + text);
        }).catch(function(err) {
          console.warn('[SkateLab] Coach call failed:', err);
          upd({ coachLoading: false, coachResponse: { text: '(Coach is offline. Try again in a moment.)', persona: persona.id, attemptId: d.attempts || 0 } });
        });
      }

      // ── Slow-motion replay ──────────────────────────────────────
      // Re-runs the most recent attempt's animation at a fractional
      // speed. Doesn't bump attempts/landings/score — purely visual
      // for inspection. Only the air/flight phase is slowed; the
      // pump-and-roll prelude stays full speed so students don't
      // wait through it.
      function replayLast(speedMul) {
        var sim = d.lastSim;
        if (!sim) return;
        if (d.running) return;
        // BUG FIX (v6 audit): if the last attempt was halfpipe and the
        // user has switched to gap-jump (or vice-versa), replaying
        // would draw the wrong scene on top of the current preview.
        // Auto-switch modes on replay so the student sees what they
        // expect — and announce the switch to screen readers.
        var simMode = sim.trick ? 'halfpipe' : 'gap';
        if (simMode !== d.mode) {
          upd({ mode: simMode });
          skAnnounce('Switching back to ' + (simMode === 'halfpipe' ? 'halfpipe' : 'gap jump') + ' for the replay.');
        }
        upd({ running: true });
        if (cancelAnimRef.current) cancelAnimRef.current();
        var animator = (sim.trick) ? animateHalfpipe : animateGapJump;
        cancelAnimRef.current = animator(canvasRef.current, sim, {
          speedMul: speedMul,
          onDone: function() { upd({ running: false }); }
        });
        skAnnounce('Replay at ' + Math.round(speedMul * 100) + ' percent speed.');
      }

      function runHalfpipe() {
        if (d.running) return;
        var sim = simHalfpipe({
          pumps: d.pumps, trickId: d.trickId,
          vehicle: d.vehicle, gravity: d.gravity,
          surfaceId: d.surfaceId
        });
        upd({ running: true, lastResult: null, lastSim: sim, attempts: (d.attempts || 0) + 1 });
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
              rotation: sim.trick.rotation, completed: sim.rotationCompleted,
              vehicle: sim.vehicle.label, gravity: sim.gravity,
              surface: sim.surface ? sim.surface.label : 'Standard',
              effMinAir: sim.effMinAir
            };
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.tricksUsed = Object.assign({}, d.tricksUsed || {}, { [sim.trick.id]: ((d.tricksUsed || {})[sim.trick.id] || 0) + 1 });
              bumps.landedTricks = Object.assign({}, d.landedTricks || {}, { [sim.trick.id]: true });
              bumps.biggestSpin = Math.max(d.biggestSpin || 0, sim.trick.rotation);
              bumps.bestHalfpipeScore = Math.max(d.bestHalfpipeScore || 0, sim.score);
              bumps.bestAirFt = Math.max(d.bestAirFt || 0, +(sim.hAir * M2FT).toFixed(2));
              if (sim.vehicle.id === 'bmx') bumps.bmxLanded = true;
              if (awardXP) awardXP(sim.score, 'SkateLab — ' + sim.trick.label, 'skatelab');
              if (addToast) addToast('🛹 Landed ' + sim.trick.label + ' on ' + sim.vehicle.label + '! +' + sim.score + ' XP', 'success');
            } else {
              bumps.bails = (d.bails || 0) + 1;
              if (addToast) addToast('💥 Bail. ' + (sim.airTime < sim.effMinAir ? 'Need ' + sim.effMinAir.toFixed(2) + 's air, only got ' + sim.airTime.toFixed(2) + 's.' : 'Almost!'), 'info');
            }
            upd(bumps);
          }
        });
      }

      function runGapJump() {
        if (d.running) return;
        var sim = simGapJump({
          speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt,
          vehicle: d.vehicle, gravity: d.gravity, windId: d.windId
        });
        upd({ running: true, lastResult: null, lastSim: sim, attempts: (d.attempts || 0) + 1 });
        if (cancelAnimRef.current) cancelAnimRef.current();
        cancelAnimRef.current = animateGapJump(canvasRef.current, sim, {
          onDone: function() {
            var bumps = { running: false };
            bumps.lastResult = {
              mode: 'gap',
              landed: sim.landed, score: sim.score,
              vMph: sim.v_mph, angleDeg: sim.thetaDeg, gapFt: sim.gapFt,
              rangeFt: sim.rangeFt, peakFt: sim.peakHFt, hangTime: sim.hangTime,
              clearance: sim.clearance * M2FT,
              wind: sim.wind ? sim.wind.label : 'Calm',
              windDeltaFt: sim.windDeltaFt
            };
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.longestGap = Math.max(d.longestGap || 0, sim.gapFt);
              bumps.bestGapScore = Math.max(d.bestGapScore || 0, sim.score);
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
          // Pre-compute predicted trajectory for visual feedback —
          // includes current gravity + vehicle so the parabola
          // updates when a Moonshot scenario or BMX toggle is active.
          var sim = simGapJump({
            speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt,
            vehicle: d.vehicle, gravity: d.gravity, windId: d.windId
          });
          drawGapJump(canvasRef.current, {
            skX: null, skY: null, skRot: 0,
            speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt,
            preview: true, previewV: sim.vM, previewTheta: sim.theta, previewHang: sim.hangTime,
            wind: sim.wind,
            label: 'Ready'
          });
        }
        return function() {
          if (cancelAnimRef.current) cancelAnimRef.current();
        };
      }, [d.mode, d.speedMph, d.angleDeg, d.gapFt, d.pumps, d.trickId, d.vehicle, d.gravity, d.surfaceId, d.windId, d.running]);

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
        // Famous-trick scenario pills — clicking loads a real-world
        // moment into the simulator. Active scenario gets a bright ring;
        // others sit on a subtle base. Mirrors ThrowLab's scenario row.
        h('div', { style: { marginBottom: 10 } },
          h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' } }, '🎬 Famous tricks'),
          h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' } },
            SCENARIOS.map(function(sc) {
              var active = d.activeScenarioId === sc.id;
              return h('button', {
                key: sc.id,
                onClick: function() { loadScenario(sc.id); },
                'aria-pressed': active,
                'aria-label': 'Load scenario: ' + sc.label,
                'data-sk-focusable': 'true',
                title: sc.teach,
                style: {
                  padding: '5px 10px', fontSize: 11, fontWeight: 700,
                  background: active ? 'linear-gradient(135deg,#d97706,#b45309)' : 'rgba(254,243,199,0.08)',
                  color: active ? '#fff' : '#fef3c7',
                  border: '1px solid ' + (active ? '#fbbf24' : 'rgba(254,243,199,0.25)'),
                  borderRadius: 999, cursor: 'pointer',
                  boxShadow: active ? '0 0 12px rgba(251,191,36,0.4)' : 'none'
                }
              }, sc.icon + ' ' + sc.label);
            })
          )
        ),
        // Surface picker — affects halfpipe energy efficiency only.
        // Only shown in halfpipe mode (gap-jump physics doesn't model
        // approach-roll friction; that's a separate sandbox).
        d.mode === 'halfpipe' && h('div', { role: 'radiogroup', 'aria-label': 'Halfpipe surface', style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' } },
          SURFACES.map(function(sf) {
            var sel = (d.surfaceId || 'standard') === sf.id;
            return h('button', {
              key: 'sf-' + sf.id,
              onClick: function() { upd('surfaceId', sf.id); skAnnounce('Surface: ' + sf.label + '. ' + sf.blurb); },
              role: 'radio',
              'aria-checked': sel,
              'data-sk-focusable': 'true',
              title: sf.blurb + ' (efficiency ' + sf.efficiency.toFixed(2) + ')',
              style: {
                padding: '4px 11px', fontSize: 11, fontWeight: 700,
                background: sel ? 'linear-gradient(135deg,#0891b2,#0e7490)' : 'rgba(254,243,199,0.08)',
                color: sel ? '#fff' : '#fef3c7',
                border: '1px solid ' + (sel ? '#155e75' : 'rgba(254,243,199,0.25)'),
                borderRadius: 999, cursor: 'pointer'
              }
            }, sf.icon + ' ' + sf.label);
          })
        ),
        // Vehicle toggle — skateboard vs BMX. Different mass, different
        // pump efficiency, different rotation moment. Same physics.
        h('div', { role: 'radiogroup', 'aria-label': 'Vehicle', style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 } },
          ['skate', 'bmx'].map(function(vid) {
            var v = VEHICLES[vid];
            var sel = d.vehicle === vid;
            return h('button', {
              key: vid,
              onClick: function() {
                upd('vehicle', vid);
                skAnnounce('Switched to ' + v.label + '. ' + (vid === 'bmx' ? 'Heavier vehicle, slower rotation, slightly more air needed per trick.' : 'Standard skateboard physics.'));
              },
              role: 'radio',
              'aria-checked': sel,
              'data-sk-focusable': 'true',
              title: v.label + ' — mass ' + v.mass + ' kg · pump efficiency ' + v.pumpEfficiency + ' m/s · rotation ×' + v.rotationScale,
              style: {
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                background: sel ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(254,243,199,0.08)',
                color: sel ? '#fff' : '#fef3c7',
                border: '1px solid ' + (sel ? '#0369a1' : 'rgba(254,243,199,0.25)'),
                borderRadius: 999, cursor: 'pointer'
              }
            }, v.icon + ' ' + v.label);
          })
        ),
        // Mode selector
        h('div', { role: 'tablist', 'aria-label': 'SkateLab mode', style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          modeBtn('halfpipe', 'Halfpipe', '🛹'),
          modeBtn('gap', 'Gap Jump', '🦘')
        ),
        // Lesson card — surfaces the active scenario's teach text plus
        // its 3 questions. Dismissible. Renders only when a scenario
        // has been loaded (activeScenarioId set).
        d.activeScenarioId && (function() {
          var sc = getScenario(d.activeScenarioId);
          if (!sc) return null;
          return h('div', {
            style: { background: 'rgba(251,191,36,0.10)', border: '1px solid #fbbf24', borderRadius: 10, padding: 12, marginBottom: 12 },
            role: 'region',
            'aria-label': 'Lesson: ' + sc.label
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 18 } }, sc.icon),
              h('div', { style: { flex: 1, fontWeight: 800, color: '#fbbf24', fontSize: 13, letterSpacing: '0.04em' } }, sc.label),
              h('button', {
                onClick: printActivitySheet,
                'aria-label': 'Print this scenario as a student activity sheet',
                'data-sk-focusable': 'true',
                title: 'Print classroom-friendly activity sheet with the questions',
                style: { background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.45)', color: '#fef3c7', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 28 }
              }, '🖨️ Print'),
              h('button', {
                onClick: function() { upd('activeScenarioId', null); skAnnounce('Lesson dismissed.'); },
                'aria-label': 'Dismiss lesson card',
                'data-sk-focusable': 'true',
                style: { background: 'transparent', border: '1px solid rgba(254,243,199,0.30)', color: '#fef3c7', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 28 }
              }, '✕ Dismiss')
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12, color: '#fef3c7', lineHeight: 1.55 } }, sc.teach),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', color: '#fbbf24', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' } }, '📝 Questions'),
              h('ol', { style: { margin: '8px 0 0', paddingLeft: 20, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } },
                sc.questions.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })
              )
            )
          );
        })(),
        // Canvas
        h('div', { style: { background: '#0f172a', borderRadius: 12, border: '2px solid #78350f', padding: 8, marginBottom: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' } },
          h('canvas', {
            ref: canvasRef,
            width: 720, height: 320,
            // WCAG 1.1.1 — aria-label rolls up the canvas's current
            // environmental state so screen-reader users know what the
            // simulation is configured to show without watching it.
            'aria-label': (function() {
              var veh = getVehicle(d.vehicle).label;
              if (d.mode === 'halfpipe') {
                var sf = getSurface(d.surfaceId).label;
                return 'Halfpipe simulation. ' + veh + ' on ' + sf + ' surface. ' +
                  d.pumps + ' pump' + (d.pumps === 1 ? '' : 's') + ', ' + getTrick(d.trickId).label + '. ' +
                  (d.gravity && d.gravity !== 9.81 ? 'Gravity ' + d.gravity.toFixed(2) + ' meters per second squared.' : '');
              }
              var w = getWind(d.windId);
              return 'Gap jump simulation. ' + veh + ', ' + d.speedMph + ' miles per hour at ' + d.angleDeg + ' degrees, ' +
                d.gapFt + ' foot gap. Wind: ' + w.label + '.' +
                (d.gravity && d.gravity !== 9.81 ? ' Gravity ' + d.gravity.toFixed(2) + ' meters per second squared.' : '');
            })(),
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
        // Wind picker — gap-jump only. Mirrors the surface picker.
        // Adds horizontal acceleration during flight; tailwind helps,
        // headwind hurts. Shows up below the speed/angle/gap row so
        // it's clearly an environmental modifier, not a control.
        d.mode === 'gap' && h('div', { role: 'radiogroup', 'aria-label': 'Wind condition', style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' } },
          WIND_PRESETS.map(function(wp) {
            var sel = (d.windId || 'calm') === wp.id;
            return h('button', {
              key: 'wp-' + wp.id,
              onClick: function() { upd('windId', wp.id); skAnnounce('Wind: ' + wp.label + '. ' + wp.blurb); },
              role: 'radio',
              'aria-checked': sel,
              'data-sk-focusable': 'true',
              title: wp.blurb + (wp.mph !== 0 ? ' (' + (wp.mph > 0 ? '+' : '') + wp.mph + ' mph)' : ''),
              style: {
                padding: '4px 10px', fontSize: 10, fontWeight: 700,
                background: sel
                  ? (wp.mph > 0 ? 'linear-gradient(135deg,#16a34a,#15803d)' : wp.mph < 0 ? 'linear-gradient(135deg,#b91c1c,#7f1d1d)' : 'linear-gradient(135deg,#475569,#334155)')
                  : 'rgba(254,243,199,0.08)',
                color: sel ? '#fff' : '#fef3c7',
                border: '1px solid ' + (sel
                  ? (wp.mph > 0 ? '#15803d' : wp.mph < 0 ? '#7f1d1d' : '#334155')
                  : 'rgba(254,243,199,0.25)'),
                borderRadius: 999, cursor: 'pointer'
              }
            }, wp.icon + ' ' + wp.label);
          })
        ),
        // Run button
        h('button', {
          onClick: d.mode === 'halfpipe' ? runHalfpipe : runGapJump,
          disabled: d.running,
          'aria-label': d.mode === 'halfpipe' ? 'Drop in and attempt the trick' : 'Send it across the gap',
          'aria-busy': d.running,
          'data-sk-focusable': 'true',
          style: {
            width: '100%', padding: '12px 20px', marginBottom: 12,
            // WCAG 1.4.3 — bump disabled background from slate-600 to
            // slate-500 + darker text so the disabled label still
            // meets AA contrast on the dimmer background.
            background: d.running ? '#64748b' : 'linear-gradient(135deg, #b45309, #7c2d12)',
            color: d.running ? '#0f172a' : '#fef3c7',
            border: '2px solid ' + (d.running ? '#475569' : '#78350f'),
            borderRadius: 12,
            fontSize: 16, fontWeight: 800, cursor: d.running ? 'wait' : 'pointer',
            boxShadow: d.running ? 'none' : '0 4px 15px rgba(120,53,15,0.4), inset 0 1px 0 rgba(255,235,170,0.3)',
            letterSpacing: '0.04em', opacity: d.running ? 0.85 : 1
          }
        }, d.running ? '⏳ Sending it...' : (d.mode === 'halfpipe' ? '🛹 Drop In!' : '🦘 Send It!')),
        // Last-result analysis panel — pedagogically valuable, shows
        // the actual physics that produced what the student just saw.
        d.lastResult && h('div', { style: { background: d.lastResult.landed ? 'rgba(22,163,74,0.12)' : 'rgba(180,83,9,0.12)', border: '1px solid ' + (d.lastResult.landed ? '#22c55e' : '#d97706'), borderRadius: 10, padding: 12, marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: d.lastResult.landed ? '#86efac' : '#fbbf24' } },
              d.lastResult.landed ? '✅ Clean landing — what made it work' : '💥 Bail — here\'s why'),
            // Slow-motion replay buttons — re-run the cached lastSim
            // at half / quarter speed. Disabled when an animation is
            // already in flight or there's no sim yet.
            d.lastSim && h('div', { style: { display: 'flex', gap: 4 } },
              [{ mul: 0.5, label: '🎬 0.5×' }, { mul: 0.25, label: '🐌 0.25×' }].map(function(opt) {
                return h('button', {
                  key: 'rp-' + opt.mul,
                  onClick: function() { replayLast(opt.mul); },
                  disabled: !!d.running,
                  'aria-label': 'Replay last attempt at ' + Math.round(opt.mul * 100) + ' percent speed',
                  'data-sk-focusable': 'true',
                  style: {
                    padding: '6px 11px', fontSize: 11, fontWeight: 700,
                    background: d.running ? '#475569' : 'rgba(167,139,250,0.18)',
                    color: d.running ? '#94a3b8' : '#fef3c7',
                    border: '1px solid rgba(167,139,250,0.45)',
                    borderRadius: 6, cursor: d.running ? 'not-allowed' : 'pointer',
                    minHeight: 28, opacity: d.running ? 0.6 : 1
                  }
                }, opt.label);
              })
            )
          ),
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
                d.lastResult.wind && d.lastResult.wind !== 'Calm' && h('div', null, '🌬️ Wind: ', h('b', { style: { color: d.lastResult.windDeltaFt > 0 ? '#86efac' : '#fca5a5' } }, d.lastResult.wind + ' (' + (d.lastResult.windDeltaFt > 0 ? '+' : '') + d.lastResult.windDeltaFt.toFixed(2) + ' ft)')),
                h('div', null, '⛰ Peak height: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.peakFt.toFixed(2) + ' ft')),
                h('div', null, '⏱ Hang time: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.hangTime.toFixed(2) + ' s')),
                h('div', null, '🎯 Clearance: ', h('b', { style: { color: d.lastResult.landed ? '#86efac' : '#fbbf24' } }, (d.lastResult.clearance >= 0 ? '+' : '') + d.lastResult.clearance.toFixed(2) + ' ft')),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
        ),
        // ── Coach panel ─────────────────────────────────────────
        // Persona pills + Ask Coach button + response card. Only
        // shows the Ask button after at least one attempt so students
        // get the analysis-then-feedback rhythm right.
        d.lastResult && h('div', {
          style: {
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(167,139,250,0.4)',
            borderRadius: 10, padding: 12, marginBottom: 12
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase' } }, '🎙️ AI Coach'),
            // Persona picker — hidden when no AI backend is wired,
            // since persona choice has no effect without callGemini.
            // Touch targets bumped to ≥28px (WCAG 2.5.5 AA).
            callGemini && h('div', { role: 'radiogroup', 'aria-label': 'Coach voice', style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
              COACH_PERSONAS.map(function(p) {
                var sel = (d.coachPersona || 'analyst') === p.id;
                return h('button', {
                  key: 'cp-' + p.id,
                  onClick: function() { upd('coachPersona', p.id); skAnnounce('Coach voice: ' + p.label); },
                  role: 'radio',
                  'aria-checked': sel,
                  'data-sk-focusable': 'true',
                  title: p.label + ' — ' + p.prepend.split('.')[0],
                  style: {
                    padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                    background: sel ? 'rgba(167,139,250,0.25)' : 'rgba(254,243,199,0.06)',
                    color: sel ? '#fff' : '#c4b5fd',
                    border: '1px solid ' + (sel ? '#a78bfa' : 'rgba(167,139,250,0.30)'),
                    fontSize: 11, fontWeight: 700,
                    minHeight: 28
                  }
                }, p.icon + ' ' + p.label);
              })
            )
          ),
          h('button', {
            onClick: askCoach,
            disabled: !!d.coachLoading || !callGemini,
            'aria-busy': !!d.coachLoading,
            'aria-label': d.coachLoading ? 'Coach is thinking' : 'Ask the coach for feedback on your last attempt',
            'data-sk-focusable': 'true',
            style: {
              width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 800,
              background: d.coachLoading ? '#475569' : (callGemini ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : '#374151'),
              color: '#fef3c7', border: '1px solid #6d28d9', borderRadius: 8,
              cursor: d.coachLoading || !callGemini ? 'not-allowed' : 'pointer',
              boxShadow: d.coachLoading ? 'none' : '0 2px 8px rgba(91,33,182,0.35)'
            }
          }, d.coachLoading ? '⏳ Coach is thinking…' : (callGemini ? '🎙️ Ask the Coach' : '🚫 Coach offline (no AI)')),
          // Response card
          d.coachResponse && d.coachResponse.text && h('div', {
            style: {
              marginTop: 10, padding: 10,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(167,139,250,0.30)',
              borderRadius: 8,
              fontSize: 12, color: '#e2e8f0', lineHeight: 1.6,
              fontStyle: d.coachResponse.persona === 'zen' ? 'italic' : 'normal'
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 } },
              getPersona(d.coachResponse.persona).icon + ' ' + getPersona(d.coachResponse.persona).label),
            d.coachResponse.text
          )
        ),
        // Stats footer
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 } },
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
        // Personal bests row — only renders if at least one best
        // exists. Three cells: best halfpipe score, best gap score,
        // best air height. Mirrors the "Personal Best" panel pattern
        // teachers asked for in earlier rounds.
        ((d.bestHalfpipeScore || d.bestGapScore || d.bestAirFt) ? h('div', {
          style: {
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            marginBottom: 10,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(180,83,9,0.10))',
            border: '1px solid rgba(251,191,36,0.40)',
            borderRadius: 8, padding: '8px 10px'
          },
          'aria-label': 'Personal bests'
        },
          [
            { label: '🏆 Best Halfpipe', val: d.bestHalfpipeScore || 0, suffix: ' pts', color: '#fbbf24' },
            { label: '🏆 Best Gap',      val: d.bestGapScore || 0,      suffix: ' pts', color: '#fbbf24' },
            { label: '🏆 Best Air',      val: (d.bestAirFt || 0).toFixed(2), suffix: ' ft', color: '#fde68a' }
          ].map(function(s, i) {
            return h('div', { key: i, style: { textAlign: 'center' } },
              h('div', { style: { fontSize: 16, fontWeight: 900, color: s.color } }, s.val + s.suffix),
              h('div', { style: { fontSize: 9, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, s.label)
            );
          })
        ) : null),
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
                  h('p', { key: 3, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, 'Peak height: '),
                    'h_peak = (v · sinθ)² / (2g). At 30° and 15 mph you peak ~3 ft above takeoff; at 45° you peak ~6 ft. More vertical means more time to spot the landing.')
                ],
            // BMX-specific physics paragraph — only shows when BMX is
            // active. Frames moment of inertia in plain language tied
            // to the toggle the student just flipped.
            d.vehicle === 'bmx' && h('p', { style: { margin: '12px 0 0', padding: '8px 10px', background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.40)', borderRadius: 8 } },
              h('b', { style: { color: '#7dd3fc' } }, '🚲 BMX = bigger moment of inertia. '),
              'A BMX bike weighs ~12 kg vs a skateboard\'s ~4 kg, and the wheels are much bigger. Moment of inertia I = m·r² determines how much torque you need to spin. Same arm strength → less rotation per second. That\'s why BMX flips and spins look more deliberate than skate spins — the rider is fighting more rotational mass for the same air time.'
            )
          )
        )
      );
    }
  });
})();
