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
  // Pre-attempt cue — quick 4-step rising sweep so the start of the
  // animation has a felt moment of "here we go."
  function sfxTakeoff() {
    if (isMuted()) return;
    [180, 240, 320, 460].forEach(function(f, i) {
      setTimeout(function() { skTone(f, 0.08, 'triangle', 0.05); }, i * 35);
    });
  }
  // Streak fanfare — tier picks the chord. Hot Streak = bright major
  // triad, On Fire = open fifth + brighter timbre, Going Off = full
  // arpeggio with a final overtone. Skipped if already muted.
  function sfxStreakTier(tierId) {
    if (isMuted()) return;
    var notes;
    if (tierId === 'going_off')   notes = [{ f: 392, t: 'square' }, { f: 523, t: 'square' }, { f: 659, t: 'square' }, { f: 784, t: 'sine' }, { f: 988, t: 'sine' }];
    else if (tierId === 'on_fire') notes = [{ f: 349, t: 'square' }, { f: 523, t: 'square' }, { f: 698, t: 'sine' }, { f: 880, t: 'sine' }];
    else                            notes = [{ f: 261, t: 'triangle' }, { f: 329, t: 'triangle' }, { f: 392, t: 'sine' }];
    notes.forEach(function(n, i) {
      setTimeout(function() { skTone(n.f, 0.16, n.t, 0.07); }, i * 70);
    });
  }

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
    { id: 'ollie',       label: 'Ollie',         rotation: 0,    axis: 'none',  minAir: 0.18, difficulty: 1, emoji: '🛹',
      lore: {
        origin: 'Invented by Alan "Ollie" Gelfand in 1976 in Florida. The first no-hands aerial — without it, street skating doesn\'t exist.',
        physics: 'No rotation, just airtime. The minimum demand on your kinetic-energy budget. Every other trick is built on top of this.',
        proTip: 'Snap the kicktail down hard, then drag the front foot up the grip tape. The board follows your front foot.'
      } },
    { id: 'popshove',    label: 'Pop Shove-it',  rotation: 180,  axis: 'board', minAir: 0.30, difficulty: 2, emoji: '↪️',
      lore: {
        origin: 'A 180° rotation of just the deck under your feet — body stays straight. Rodney Mullen popularized it in the early 80s.',
        physics: 'Half a board-axis spin in 0.30s = 600°/s rotation rate. The kicktail snap has to torque the board fast without lifting too high.',
        proTip: 'Scoop with the back foot, don\'t kick. Let the deck spin under you — your body is the still point.'
      } },
    { id: 'kickflip',    label: 'Kickflip',      rotation: 360,  axis: 'board', minAir: 0.36, difficulty: 3, emoji: '🔄',
      lore: {
        origin: 'Rodney Mullen, 1983 — originally called the "magic flip." The benchmark trick: if you can land kickflips, you "skate."',
        physics: '360° around the long axis in 0.36s = 1000°/s spin rate. The board flips fast because its moment of inertia is tiny along that axis.',
        proTip: 'Flick off the corner of the nose, not the side. Watch the bolts — when they re-appear under your feet, catch.'
      } },
    { id: 'spin360',     label: '360 Spin',      rotation: 360,  axis: 'body',  minAir: 0.42, difficulty: 4, emoji: '🌀',
      lore: {
        origin: 'Steve Caballero adapted it for vert in the early 80s. The first "spin" trick where the body — not just the board — rotates a full revolution.',
        physics: 'Same 360° as a kickflip but around the vertical axis with the whole body. Your moment of inertia is much higher → you need more airtime.',
        proTip: 'Wind up your shoulders before you pop. The torso starts the spin; the legs just follow.'
      } },
    { id: 'spin540',     label: '540 Spin',      rotation: 540,  axis: 'body',  minAir: 0.62, difficulty: 6, emoji: '💫',
      lore: {
        origin: 'The McTwist — Mike McGill, 1984, on a vert ramp at the Del Mar Skate Ranch. The first "double-rotation" trick most pros could land.',
        physics: 'One and a half rotations in 0.62s. To bridge from 360° to 540° you need either more air OR a tighter tuck (smaller moment of inertia).',
        proTip: 'Tuck tight at the peak — pull arms in like a figure skater. Conservation of angular momentum spins you faster.'
      } },
    { id: 'spin720',     label: '720 Spin',      rotation: 720,  axis: 'body',  minAir: 0.85, difficulty: 9, emoji: '✨',
      lore: {
        origin: 'Tony Hawk landed the first 720 at age 17 in 1985, then the 900 (2.5 rotations) at the 1999 X Games. SkateLab caps at 720 in v2 — the lesson is the same.',
        physics: 'Two full rotations needs ~0.85s of air, which means you have to clear 2.85 ft (0.87 m) above the lip. That\'s why it only works on big vert ramps.',
        proTip: 'You can\'t muscle this — it\'s all setup. Pump for max speed BEFORE the lip, then ride the air time you bought.'
      } }
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
    // opts.trickInline lets the caller pass a fully-resolved trick
    // (including custom tricks not in the built-in TRICKS array).
    // Falls back to id-lookup for the original code path.
    var trick = opts.trickInline || getTrick(opts.trickId || 'ollie');
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
        progress: function(d) { return (d.coachOpens || 0) + '/3 asks'; } },
      { id: 'sk_predict_within_10', label: 'Predict within 10% on 3 attempts', icon: '🔮',
        check: function(d) { return ((d.predictionStats && d.predictionStats.withinTen) || 0) >= 3; },
        progress: function(d) { return ((d.predictionStats && d.predictionStats.withinTen) || 0) + '/3 within 10%'; } },
      { id: 'sk_streak_5', label: 'Land a 5-trick Hot Streak', icon: '🔥',
        check: function(d) { return ((d.streak && d.streak.longest) || 0) >= 5; },
        progress: function(d) { return ((d.streak && d.streak.longest) || 0) + '/5 longest streak'; } },
      { id: 'sk_master_3', label: 'Master 3 different tricks', icon: '👑',
        check: function(d) {
          var u = d.tricksUsed || {};
          var n = 0;
          Object.keys(u).forEach(function(k) { if ((u[k] || 0) >= 5) n++; });
          return n >= 3;
        },
        progress: function(d) {
          var u = d.tricksUsed || {};
          var n = 0;
          Object.keys(u).forEach(function(k) { if ((u[k] || 0) >= 5) n++; });
          return n + '/3 mastered';
        }
      }
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
            // Per-trick attempt counter for the Mastery Tree. The
            // existing `tricksUsed` only bumps on a *landed* attempt
            // (it's effectively a per-trick lands counter despite
            // the name); this fills in the attempts side so the
            // mastery panel can show "tried but never landed" tricks.
            trickAttempts: {},
            scenariosTried: {},
            bmxLanded: false,
            // Personal bests across the lifetime of the toolData
            bestHalfpipeScore: 0,
            bestGapScore: 0,
            bestAirFt: 0,
            // Custom scenarios — teacher-saved presets that render
            // alongside the built-in famous-trick row.
            customScenarios: [],
            // Save-scenario modal state — null when closed, { label }
            // when open. Modal captures current settings on confirm.
            saveModalDraft: null,
            // Trick Lab — student-invented custom tricks. Same shape
            // as built-in TRICKS but with isCustom: true so the
            // picker can render them in a separate purple row and the
            // delete button shows. Preserved across stat resets,
            // mirrors customScenarios behavior.
            customTricks: [],
            // Trick Lab form draft — live form state. minAir +
            // difficulty are auto-derived from rotation + axis at
            // render time, so the draft only needs the inputs.
            trickLabDraft: { name: '', emoji: '🌟', rotation: 360, axis: 'body' },
            // Per-session safety acknowledgement. Re-anchors on every
            // tool re-mount (no localStorage persistence) — that's
            // the design, not a bug.
            safetyAck: false,
            // Confirm-reset state — false normally, true while the
            // student/teacher is being asked to confirm a reset.
            resetConfirmOpen: false,
            // Show-formula toggle — when true, a panel beneath the
            // canvas renders the live physics equation with current
            // values plugged in. Default true so first-time students
            // see the math; can be hidden for cleaner classroom demos.
            showFormula: true,
            // Predict-before-you-run mode — when true, students must
            // type a numeric prediction (air height for halfpipe,
            // range for gap) BEFORE the run button activates. Each
            // attempt logs an error percentage; running stats show
            // the average gap between predictions and reality so
            // students see their physics intuition sharpen.
            predictMode: false,
            predictionInput: '',
            predictionStats: { count: 0, totalErrPct: 0, bestPct: null, withinTen: 0 },
            // Hot-streak combo system — mirrors PlayLab/ThrowLab's
            // Hot-Hand pattern. Land in a row to climb tiers (3 = Hot
            // Streak ×1.5, 5 = On Fire ×2, 7 = Going Off ×2.5). Bail
            // resets current; longest is preserved as a personal best.
            // Pure engagement layer — keeps non-academic students
            // chasing a chain instead of burning out on one bail.
            streak: { current: 0, longest: 0, lastTier: null },
            // Adaptive coaching nudge — fires after 3 consecutive
            // bails to surface a one-tap fix (more pumps, smaller
            // trick, etc.). Reset on any land. nudgeDismissedAt is
            // the attempts-count when the student dismissed; we
            // suppress the nudge until the next bail after that.
            consecutiveBails: 0,
            nudgeDismissedAt: -1,
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

      // ── Mute mirror ─────────────────────────────────────────────
      // The module-level toggleMute() updates localStorage, but the
      // UI button needs a React state cell to re-render its label /
      // pressed state on flip. Initialize from localStorage so the
      // preference persists across sessions and tabs.
      var muteState = React.useState(isMuted());
      var muted = muteState[0], setMuted = muteState[1];
      function toggleMuteUI() {
        toggleMute();
        var nextMuted = isMuted();
        setMuted(nextMuted);
        skAnnounce(nextMuted ? 'Sound off.' : 'Sound on.');
        if (!nextMuted) skTone(440, 0.08, 'sine', 0.06); // sound-on chime
      }

      // 'M' keyboard shortcut. Skip when typing in inputs/textareas
      // so it doesn't hijack the prediction or scenario-name fields.
      React.useEffect(function() {
        var onKey = function(e) {
          if (e.key !== 'm' && e.key !== 'M') return;
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          toggleMuteUI();
        };
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [muted]);

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
      // Look up a scenario by id across BOTH built-in and custom pools.
      function findAnyScenario(id) {
        return getScenario(id) ||
          ((d.customScenarios || []).find(function(s) { return s.id === id; })) ||
          null;
      }
      // ── Trick Lab helpers ────────────────────────────────────
      // findAnyTrick returns built-in trick first, then custom.
      // Used everywhere the picker / mastery / lore / formula / aria
      // path needs to resolve a trick id without caring about its
      // origin (built-in vs student-invented).
      function findAnyTrick(id) {
        for (var i = 0; i < TRICKS.length; i++) {
          if (TRICKS[i].id === id) return TRICKS[i];
        }
        var ct = (d.customTricks || []).find(function(t) { return t.id === id; });
        return ct || TRICKS[0];
      }
      // Auto-derive minAir + difficulty from a draft. Spin rates
      // tuned to match the built-in catalog roughly:
      //   board axis ≈ 1500 °/s (kickflip-class)
      //   body  axis ≈ 1000 °/s (spin-class)
      //   combo axis ≈  800 °/s (both → harder)
      // Plus a 0.18s "just leaving the ground" baseline.
      function deriveTrickPhysics(draft) {
        var rot = Math.max(0, Math.min(1080, draft.rotation || 0));
        var axis = draft.axis || 'body';
        var spinRate = axis === 'board' ? 1500 : axis === 'combo' ? 800 : 1000;
        var minAir = Math.max(0.18, 0.18 + rot / spinRate);
        var difficulty = Math.max(1, Math.min(12, Math.round(minAir * 12)));
        var formula = '0.18 + ' + rot + ' ÷ ' + spinRate + ' (' + axis + ' axis) = ' + minAir.toFixed(2) + 's';
        // Find the closest built-in for an "equivalent" comparison
        var closest = null;
        var closestDelta = Infinity;
        for (var i = 0; i < TRICKS.length; i++) {
          var dRot = Math.abs(TRICKS[i].rotation - rot);
          if (dRot < closestDelta) { closestDelta = dRot; closest = TRICKS[i]; }
        }
        return { minAir: minAir, difficulty: difficulty, formula: formula, spinRate: spinRate, equivalent: closest };
      }
      // Save a custom trick. Validates name (1–30 chars after trim),
      // normalizes emoji (defaults to 🌟), derives physics from the
      // draft, pushes to customTricks, sets trickId to the new id,
      // closes the form (resets draft to defaults), fires toast +
      // skAnnounce. Mirrors saveCurrentAsScenario validation flow.
      function saveCustomTrick(draft) {
        var name = (draft.name || '').trim().slice(0, 30);
        if (!name) {
          if (addToast) addToast('Give your trick a name first.', 'info');
          skAnnounce('Trick needs a name before saving.');
          return;
        }
        var emoji = (draft.emoji || '').trim().slice(0, 4);
        if (!emoji) emoji = '🌟';
        var phys = deriveTrickPhysics(draft);
        // Generate a stable id from the timestamp (collision-safe
        // across a session; resets if the toolData is wiped).
        var id = 'custom_' + Date.now().toString(36);
        var newTrick = {
          id: id, label: name, emoji: emoji,
          rotation: Math.max(0, Math.min(1080, draft.rotation || 0)),
          axis: draft.axis || 'body',
          minAir: phys.minAir,
          difficulty: phys.difficulty,
          isCustom: true,
          lore: {
            origin: 'Your invention. Engineered ' + new Date().toLocaleDateString() + '.',
            physics: 'Custom physics — ' + phys.formula + '. Compare to ' + (phys.equivalent ? phys.equivalent.label : 'no built-in') + '.',
            proTip: 'Name it after how it feels to land. The board doesn\'t care what you call it; you do.'
          }
        };
        var nextList = (d.customTricks || []).concat([newTrick]);
        upd({
          customTricks: nextList,
          trickId: id,
          // Reset the form draft so the next invention starts clean.
          trickLabDraft: { name: '', emoji: '🌟', rotation: 360, axis: 'body' }
        });
        if (addToast) addToast('🧪 Saved + selected: ' + emoji + ' ' + name, 'success');
        skAnnounce('Saved trick: ' + name + '. Now selected.');
      }
      // Delete a custom trick. If it's the currently selected trick,
      // fall back to kickflip so the picker doesn't render an empty
      // selection.
      function deleteCustomTrick(id) {
        var nextList = (d.customTricks || []).filter(function(t) { return t.id !== id; });
        var bumps = { customTricks: nextList };
        if (d.trickId === id) bumps.trickId = 'kickflip';
        upd(bumps);
        if (addToast) addToast('Custom trick deleted.', 'info');
        skAnnounce('Custom trick deleted.');
      }
      function loadScenario(scenarioId) {
        var sc = findAnyScenario(scenarioId);
        if (!sc) return;
        var p = sc.presets || {};
        var bumps = {
          activeScenarioId: sc.id,
          mode: sc.mode,
          vehicle: p.vehicle || 'skate',
          gravity: p.gravity || 9.81,
          surfaceId: p.surfaceId || 'standard',
          windId: p.windId || 'calm',
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

      // ── Save current settings as a custom scenario ──────────────
      // Captures the current configuration (mode + all relevant
      // params) into a named preset that renders alongside the
      // built-in famous-trick row. Persists in toolData.skatelab.
      // Auto-generates a teach blurb so the Lesson card has
      // something useful to show on reload.
      function saveCurrentAsScenario(label) {
        var clean = (label || '').trim().slice(0, 40);
        if (!clean) {
          if (addToast) addToast('Give the scenario a short name first.', 'info');
          return;
        }
        var presets = {
          vehicle: d.vehicle,
          gravity: d.gravity,
          surfaceId: d.surfaceId,
          windId: d.windId
        };
        var teach;
        if (d.mode === 'halfpipe') {
          presets.pumps = d.pumps;
          presets.trickId = d.trickId;
          var tk = getTrick(d.trickId);
          var sf = getSurface(d.surfaceId);
          teach = 'Custom halfpipe scenario. ' + d.pumps + ' pump' + (d.pumps === 1 ? '' : 's') +
            ', ' + tk.label + ', ' + getVehicle(d.vehicle).label.toLowerCase() + ' on ' + sf.label.toLowerCase() + ' surface' +
            (d.gravity && Math.abs(d.gravity - 9.81) > 0.05 ? ' at ' + d.gravity.toFixed(2) + ' m/s² gravity' : '') + '.';
        } else {
          presets.speedMph = d.speedMph;
          presets.angleDeg = d.angleDeg;
          presets.gapFt = d.gapFt;
          var w = getWind(d.windId);
          teach = 'Custom gap-jump scenario. ' + d.speedMph + ' mph at ' + d.angleDeg + '°, ' + d.gapFt + ' ft gap' +
            (w.id !== 'calm' ? ' with ' + w.label.toLowerCase() : '') +
            (d.gravity && Math.abs(d.gravity - 9.81) > 0.05 ? ' at ' + d.gravity.toFixed(2) + ' m/s² gravity' : '') + '.';
        }
        var scenario = {
          id: 'cust_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36),
          label: clean, icon: '⭐', mode: d.mode,
          presets: presets, teach: teach,
          questions: [
            'Predict what will happen if you change one variable. Then test it.',
            'Which physics equation applies most directly to this setup? Write it down.',
            'How would the result change on the Moon (g = 1.62 m/s²)?'
          ],
          custom: true
        };
        var next = (d.customScenarios || []).slice();
        next.push(scenario);
        upd({ customScenarios: next, saveModalDraft: null, activeScenarioId: scenario.id });
        if (addToast) addToast('💾 Saved scenario: "' + clean + '"', 'success');
        skAnnounce('Saved scenario: ' + clean);
      }
      function deleteCustomScenario(id) {
        var next = (d.customScenarios || []).filter(function(s) { return s.id !== id; });
        var bumps = { customScenarios: next };
        if (d.activeScenarioId === id) bumps.activeScenarioId = null;
        upd(bumps);
        if (addToast) addToast('Removed custom scenario.', 'info');
      }

      // ── Reset stats — defensive, requires confirm ────────────────
      // Clears all skatelab-tracked stats but preserves customScenarios
      // (since those are teacher work, not student data).
      function performResetStats() {
        var preserved = d.customScenarios || [];
        var preservedTricks = d.customTricks || [];
        upd({
          landings: 0, bails: 0, attempts: 0,
          longestGap: 0, biggestSpin: 0,
          tricksUsed: {}, landedTricks: {}, trickAttempts: {},
          scenariosTried: {}, bmxLanded: false,
          bestHalfpipeScore: 0, bestGapScore: 0, bestAirFt: 0,
          coachOpens: 0, coachResponse: null,
          predictionStats: { count: 0, totalErrPct: 0, bestPct: null, withinTen: 0 },
          predictionInput: '',
          streak: { current: 0, longest: 0, lastTier: null },
          consecutiveBails: 0, nudgeDismissedAt: -1,
          lastResult: null, lastSim: null, activeScenarioId: null,
          resetConfirmOpen: false,
          customScenarios: preserved,
          customTricks: preservedTricks
        });
        if (addToast) addToast('SkateLab stats reset.', 'success');
        skAnnounce('Stats cleared. Custom scenarios preserved.');
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

      // ── Hot-streak combo ────────────────────────────────────────
      // Tier table — chosen to mirror the engagement curve of
      // ThrowLab's Hot-Hand: a clear early reward at 3, a louder one
      // at 5, then a peak at 7 that's reachable but not gimmie. Each
      // tier carries an XP multiplier and color/glow for visual cues.
      // Mastery tier for a single trick. Lands count is the primary
      // signal — attempts only differentiate "untried" from "tried
      // but never landed." Tiers chosen so every trick has a clear
      // next step (Tried → Landed → Solid → Mastered) without making
      // Mastered grindy (5 lands is reachable in a single session).
      // Adaptive coaching nudge — diagnoses why recent attempts
      // bailed and returns a one-tap fix. Returns null when the
      // student isn't stuck (no current bail streak, already
      // dismissed, or no obvious fix). Each suggestion includes:
      //   message: human explanation grounded in the failure
      //   fixLabel: button text
      //   fixBumps: object to upd() when the fix is applied
      // Logic prioritizes the most-likely fix in order:
      //   halfpipe: more pumps → smaller trick → grippy surface
      //   gap: more speed → 30° angle → smaller gap
      function _suggestNudge() {
        if ((d.consecutiveBails || 0) < 3) return null;
        if ((d.attempts || 0) <= (d.nudgeDismissedAt || -1)) return null;
        var r = d.lastResult;
        if (!r || r.landed) return null;
        if (r.mode === 'halfpipe') {
          // Halfpipe bails are nearly always "not enough air for
          // the trick selected." Two clean fixes: more pumps OR a
          // less-rotation trick. Prefer pumps if there's headroom.
          if ((d.pumps || 0) < 8) {
            var nextPumps = Math.min(8, (d.pumps || 0) + 2);
            return {
              message: 'Stuck? You\'ve been short on air for ' + getTrick(d.trickId).label + '. Adding pumps gives you more kinetic energy → more height → more air time.',
              fixLabel: '+ ' + (nextPumps - (d.pumps || 0)) + ' pumps (try ' + nextPumps + ')',
              fixBumps: { pumps: nextPumps }
            };
          }
          // Out of pumps room? Suggest a smaller trick.
          var current = getTrick(d.trickId);
          var smaller = null;
          for (var i = 0; i < TRICKS.length; i++) {
            if (TRICKS[i].rotation < current.rotation && (!smaller || TRICKS[i].rotation > smaller.rotation)) smaller = TRICKS[i];
          }
          if (smaller) {
            return {
              message: 'Maxed out on pumps but still bailing. Try a smaller trick to learn how much air this setup actually gives you.',
              fixLabel: 'Switch to ' + smaller.emoji + ' ' + smaller.label,
              fixBumps: { trickId: smaller.id }
            };
          }
          return null;
        }
        // Gap mode — diagnose by clearance sign.
        if (r.clearance < 0) {
          // Came up short. Two clean fixes: more speed (highest
          // leverage, since R = v² · sin(2θ) / g — quadratic in v)
          // OR set angle to 30° if it's far off (peak range angle).
          if (d.speedMph < 28) {
            var nextSpeed = Math.min(28, (d.speedMph || 0) + 5);
            return {
              message: 'Came up short by ' + Math.abs(r.clearance).toFixed(1) + ' ft. Range scales with v² — speed has the biggest leverage in the projectile equation.',
              fixLabel: '+ 5 mph (try ' + nextSpeed + ')',
              fixBumps: { speedMph: nextSpeed }
            };
          }
          if (Math.abs(d.angleDeg - 30) > 5) {
            return {
              message: 'At max speed and still short. Range peaks at 45° on flat ground but ~30° works best when you need to land at the same height. Try 30°.',
              fixLabel: 'Set angle to 30°',
              fixBumps: { angleDeg: 30 }
            };
          }
          // Last resort — shrink the gap.
          if (d.gapFt > 8) {
            return {
              message: 'Even at max speed and ideal angle, this gap is out of reach. Smaller gap to feel the calibration first.',
              fixLabel: 'Shrink gap to 10 ft',
              fixBumps: { gapFt: 10 }
            };
          }
          return null;
        }
        // Overshot. Drop speed.
        if (d.speedMph > 8) {
          var slowSpeed = Math.max(8, (d.speedMph || 0) - 3);
          return {
            message: 'Flying past the landing — too much speed. Trim it down and watch where the parabola peaks.',
            fixLabel: '− 3 mph (try ' + slowSpeed + ')',
            fixBumps: { speedMph: slowSpeed }
          };
        }
        return null;
      }

      function _trickMastery(attempts, lands) {
        if ((lands || 0) >= 5) return { id: 'mastered', label: 'Mastered', icon: '👑', color: '#a855f7', bg: 'rgba(168,85,247,0.18)' };
        if ((lands || 0) >= 3) return { id: 'solid',    label: 'Solid',    icon: '💪', color: '#22c55e', bg: 'rgba(34,197,94,0.18)' };
        if ((lands || 0) >= 1) return { id: 'landed',   label: 'Landed',   icon: '🎯', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' };
        if ((attempts || 0) >= 1) return { id: 'tried', label: 'Tried',    icon: '🔓', color: '#94a3b8', bg: 'rgba(148,163,184,0.18)' };
        return { id: 'locked', label: 'Locked', icon: '🔒', color: '#64748b', bg: 'rgba(71,85,105,0.18)' };
      }

      function _streakTier(n) {
        if (n >= 7) return { id: 'going_off', label: 'Going Off!!', icon: '🚀', mult: 2.5, color: '#fb7185', glow: 'rgba(251,113,133,0.45)' };
        if (n >= 5) return { id: 'on_fire',   label: 'On Fire!',    icon: '🌶️', mult: 2.0, color: '#f97316', glow: 'rgba(249,115,22,0.45)' };
        if (n >= 3) return { id: 'hot_streak',label: 'Hot Streak!', icon: '🔥', mult: 1.5, color: '#fbbf24', glow: 'rgba(251,191,36,0.45)' };
        return null;
      }

      // Mutates `bumps` with the next streak state. Returns
      // { totalScore, mult, tier, prev, gained } so the caller can
      // award the bonused XP and render the right hype copy.
      function _applyStreakAndScore(bumps, didLand, baseScore) {
        var prev = (d.streak && typeof d.streak.current === 'number') ? d.streak : { current: 0, longest: 0, lastTier: null };
        if (didLand) {
          var nextCurrent = (prev.current || 0) + 1;
          var tier = _streakTier(nextCurrent);
          var mult = tier ? tier.mult : 1.0;
          var totalScore = Math.round(baseScore * mult);
          // "gained" means the student just *crossed* a tier
          // boundary — used to fire the celebratory toast only on
          // the upgrade attempt rather than every land.
          var prevTier = _streakTier(prev.current || 0);
          var gained = tier && (!prevTier || prevTier.id !== tier.id);
          bumps.streak = {
            current: nextCurrent,
            longest: Math.max(prev.longest || 0, nextCurrent),
            lastTier: tier ? tier.id : null
          };
          return { totalScore: totalScore, mult: mult, tier: tier, prev: prev.current || 0, gained: !!gained };
        }
        bumps.streak = { current: 0, longest: prev.longest || 0, lastTier: null };
        return { totalScore: 0, mult: 1.0, tier: null, prev: prev.current || 0, gained: false };
      }

      // Snap the current prediction (when predict-mode is on) onto
      // a freshly-run lastResult and bump the running stats so the
      // panel + result card can render actual-vs-predicted deltas.
      // `actualValue` is the measured quantity (air height in ft for
      // halfpipe, range in ft for gap) — same units the student typed.
      function _captureAndStampPrediction(bumps, lastResult, actualValue) {
        if (!d.predictMode) return;
        var trimmed = (d.predictionInput || '').trim();
        var predicted = parseFloat(trimmed);
        if (!(isFinite(predicted) && predicted >= 0)) return;
        var denom = Math.max(0.01, Math.abs(actualValue));
        var errPct = Math.abs(predicted - actualValue) / denom * 100;
        lastResult.predicted = predicted;
        lastResult.actual = actualValue;
        lastResult.errPct = errPct;
        var prev = d.predictionStats || { count: 0, totalErrPct: 0, bestPct: null, withinTen: 0 };
        bumps.predictionStats = {
          count: (prev.count || 0) + 1,
          totalErrPct: (prev.totalErrPct || 0) + errPct,
          bestPct: (prev.bestPct === null || prev.bestPct === undefined) ? errPct : Math.min(prev.bestPct, errPct),
          withinTen: (prev.withinTen || 0) + (errPct <= 10 ? 1 : 0)
        };
        // Clear the field so the next attempt requires a fresh
        // commitment instead of re-using the last guess.
        bumps.predictionInput = '';
        if (addToast) {
          var msg = errPct <= 10
            ? '🎯 Within ' + errPct.toFixed(1) + '% — your physics intuition is dialed in.'
            : '📐 Off by ' + errPct.toFixed(1) + '% — see what changed.';
          addToast(msg, errPct <= 10 ? 'success' : 'info');
        }
      }

      function runHalfpipe() {
        if (d.running) return;
        var sim = simHalfpipe({
          pumps: d.pumps, trickId: d.trickId,
          vehicle: d.vehicle, gravity: d.gravity,
          surfaceId: d.surfaceId
        });
        // Bump per-trick attempt count up front (before sim resolves)
        // so a bail still counts as an attempt for the mastery tree.
        var nextTrickAttempts = Object.assign({}, d.trickAttempts || {});
        nextTrickAttempts[d.trickId] = (nextTrickAttempts[d.trickId] || 0) + 1;
        upd({ running: true, lastResult: null, lastSim: sim, attempts: (d.attempts || 0) + 1, trickAttempts: nextTrickAttempts });
        sfxTakeoff();
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
            _captureAndStampPrediction(bumps, bumps.lastResult, sim.hAir * M2FT);
            // Bail counter for adaptive nudge — reset on land,
            // increment on bail. Used to gate the nudge card.
            bumps.consecutiveBails = sim.landed ? 0 : (d.consecutiveBails || 0) + 1;
            var sk = _applyStreakAndScore(bumps, sim.landed, sim.score);
            // Tag the result with streak info so the result card can
            // render the multiplier badge inline.
            bumps.lastResult.streakAfter = bumps.streak.current;
            bumps.lastResult.streakTier = sk.tier ? sk.tier.id : null;
            bumps.lastResult.scoreBonused = sk.totalScore;
            bumps.lastResult.streakMult = sk.mult;
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.tricksUsed = Object.assign({}, d.tricksUsed || {}, { [sim.trick.id]: ((d.tricksUsed || {})[sim.trick.id] || 0) + 1 });
              bumps.landedTricks = Object.assign({}, d.landedTricks || {}, { [sim.trick.id]: true });
              bumps.biggestSpin = Math.max(d.biggestSpin || 0, sim.trick.rotation);
              bumps.bestHalfpipeScore = Math.max(d.bestHalfpipeScore || 0, sk.totalScore);
              bumps.bestAirFt = Math.max(d.bestAirFt || 0, +(sim.hAir * M2FT).toFixed(2));
              if (sim.vehicle.id === 'bmx') bumps.bmxLanded = true;
              if (awardXP) awardXP(sk.totalScore, 'SkateLab — ' + sim.trick.label + (sk.tier ? ' ' + sk.tier.icon : ''), 'skatelab');
              if (sk.gained) sfxStreakTier(sk.tier.id);
              if (addToast) {
                var msg = sk.gained
                  ? sk.tier.icon + ' ' + sk.tier.label + ' (×' + sk.tier.mult + ') — ' + sim.trick.label + ' +' + sk.totalScore + ' XP'
                  : sk.tier
                    ? sk.tier.icon + ' Streak ' + bumps.streak.current + '! ' + sim.trick.label + ' +' + sk.totalScore + ' XP'
                    : '🛹 Landed ' + sim.trick.label + ' on ' + sim.vehicle.label + '! +' + sk.totalScore + ' XP';
                addToast(msg, 'success');
              }
            } else {
              bumps.bails = (d.bails || 0) + 1;
              if (addToast) {
                if (sk.prev >= 3) {
                  addToast('💔 Streak ended at ' + sk.prev + '. Reset and reload.', 'info');
                } else {
                  addToast('💥 Bail. ' + (sim.airTime < sim.effMinAir ? 'Need ' + sim.effMinAir.toFixed(2) + 's air, only got ' + sim.airTime.toFixed(2) + 's.' : 'Almost!'), 'info');
                }
              }
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
        sfxTakeoff();
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
            _captureAndStampPrediction(bumps, bumps.lastResult, sim.rangeFt);
            bumps.consecutiveBails = sim.landed ? 0 : (d.consecutiveBails || 0) + 1;
            var skG = _applyStreakAndScore(bumps, sim.landed, sim.score);
            bumps.lastResult.streakAfter = bumps.streak.current;
            bumps.lastResult.streakTier = skG.tier ? skG.tier.id : null;
            bumps.lastResult.scoreBonused = skG.totalScore;
            bumps.lastResult.streakMult = skG.mult;
            if (sim.landed) {
              bumps.landings = (d.landings || 0) + 1;
              bumps.longestGap = Math.max(d.longestGap || 0, sim.gapFt);
              bumps.bestGapScore = Math.max(d.bestGapScore || 0, skG.totalScore);
              if (awardXP) awardXP(skG.totalScore, 'SkateLab — ' + sim.gapFt + 'ft gap' + (skG.tier ? ' ' + skG.tier.icon : ''), 'skatelab');
              if (skG.gained) sfxStreakTier(skG.tier.id);
              if (addToast) {
                var gMsg = skG.gained
                  ? skG.tier.icon + ' ' + skG.tier.label + ' (×' + skG.tier.mult + ') — ' + sim.gapFt + 'ft +' + skG.totalScore + ' XP'
                  : skG.tier
                    ? skG.tier.icon + ' Streak ' + bumps.streak.current + '! ' + sim.gapFt + 'ft +' + skG.totalScore + ' XP'
                    : '🦘 Cleared ' + sim.gapFt + ' ft! +' + skG.totalScore + ' XP';
                addToast(gMsg, 'success');
              }
            } else {
              bumps.bails = (d.bails || 0) + 1;
              if (addToast) {
                if (skG.prev >= 3) {
                  addToast('💔 Streak ended at ' + skG.prev + '. Reset and reload.', 'info');
                } else {
                  addToast(sim.clearance < 0 ? '💥 Came up short by ' + Math.abs(sim.clearance * M2FT).toFixed(1) + ' ft.' : '💥 Overshot by ' + (sim.clearance * M2FT - 1.2).toFixed(1) + ' ft.', 'info');
                }
              }
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
        // Custom scenarios render in a second sub-row below the
        // built-ins, each with a small × delete button.
        h('div', { style: { marginBottom: 10 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase' } }, '🎬 Famous tricks'),
            h('button', {
              onClick: function() { upd('saveModalDraft', { label: '' }); },
              'aria-label': 'Save current settings as a custom scenario',
              'data-sk-focusable': 'true',
              title: 'Capture the current setup as a reusable preset',
              style: {
                padding: '5px 10px', fontSize: 10, fontWeight: 700,
                background: 'rgba(167,139,250,0.18)', color: '#fef3c7',
                border: '1px solid rgba(167,139,250,0.45)',
                borderRadius: 999, cursor: 'pointer', minHeight: 24
              }
            }, '💾 Save current')
          ),
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
          ),
          // Custom scenario sub-row — only renders when at least one
          // custom scenario exists. Each has a tiny × on hover/focus.
          (d.customScenarios && d.customScenarios.length > 0) && h('div', {
            style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 },
            'aria-label': 'Custom scenarios'
          },
            d.customScenarios.map(function(sc) {
              var active = d.activeScenarioId === sc.id;
              return h('div', {
                key: sc.id,
                style: { display: 'inline-flex', alignItems: 'stretch' }
              },
                h('button', {
                  onClick: function() { loadScenario(sc.id); },
                  'aria-pressed': active,
                  'aria-label': 'Load custom scenario: ' + sc.label,
                  'data-sk-focusable': 'true',
                  title: sc.teach,
                  style: {
                    padding: '5px 10px', fontSize: 11, fontWeight: 700,
                    background: active ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'rgba(167,139,250,0.12)',
                    color: active ? '#fff' : '#c4b5fd',
                    border: '1px solid ' + (active ? '#a78bfa' : 'rgba(167,139,250,0.35)'),
                    borderTopLeftRadius: 999, borderBottomLeftRadius: 999,
                    borderTopRightRadius: 0, borderBottomRightRadius: 0,
                    borderRight: 'none',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 12px rgba(167,139,250,0.4)' : 'none'
                  }
                }, sc.icon + ' ' + sc.label),
                h('button', {
                  onClick: function() {
                    if (window.confirm('Remove "' + sc.label + '" from custom scenarios?')) {
                      deleteCustomScenario(sc.id);
                    }
                  },
                  'aria-label': 'Delete custom scenario: ' + sc.label,
                  'data-sk-focusable': 'true',
                  title: 'Delete this custom scenario',
                  style: {
                    padding: '5px 8px', fontSize: 10, fontWeight: 700,
                    background: active ? 'rgba(0,0,0,0.25)' : 'rgba(167,139,250,0.12)',
                    color: '#fca5a5',
                    border: '1px solid ' + (active ? '#a78bfa' : 'rgba(167,139,250,0.35)'),
                    borderTopRightRadius: 999, borderBottomRightRadius: 999,
                    borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                    cursor: 'pointer'
                  }
                }, '×')
              );
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
        // ── Hot-streak HUD chip ─────────────────────────────────
        // Renders only while a streak is alive (current ≥ 1). Tier
        // styling (color + glow) intensifies as the chain climbs;
        // streaks 1–2 show a calm amber chip, 3+ flips to the tier
        // gradient + outer glow. Live region announces upgrades to
        // screen readers via skAnnounce on attempt completion.
        ((d.streak && d.streak.current >= 1) ? (function() {
          var tier = _streakTier(d.streak.current);
          var bg = tier
            ? 'linear-gradient(135deg, ' + tier.color + ', ' + tier.color + 'cc)'
            : 'linear-gradient(135deg,#fbbf24,#f59e0b)';
          var glow = tier ? '0 0 18px ' + tier.glow + ', 0 4px 12px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.25)';
          return h('div', {
            role: 'status',
            'aria-label': 'Active streak ' + d.streak.current + (tier ? ', ' + tier.label : ''),
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginBottom: 10, padding: '10px 14px',
              background: bg, color: '#1f2937',
              border: '2px solid ' + (tier ? tier.color : '#92400e'),
              borderRadius: 12,
              boxShadow: glow,
              fontWeight: 900,
              letterSpacing: '0.04em',
              transition: 'background 200ms ease, box-shadow 200ms ease'
            }
          },
            h('span', { style: { fontSize: 22 } }, tier ? tier.icon : '⚡'),
            h('span', { style: { fontSize: 14 } }, (tier ? tier.label + ' · ' : '') + 'Streak ×' + d.streak.current),
            tier && h('span', {
              style: {
                fontSize: 11, padding: '2px 8px',
                background: 'rgba(31,41,55,0.85)', color: '#fef3c7',
                borderRadius: 999, fontWeight: 800
              }
            }, '×' + tier.mult + ' XP')
          );
        })() : null),
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
        // ── Save-scenario modal ─────────────────────────────────
        // Inline modal — when saveModalDraft is non-null, dim the
        // tool body and show a name-input card. Confirm captures the
        // current state. Mirrors ThrowLab's save-scenario flow.
        d.saveModalDraft && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-save-title',
          onClick: function(e) { if (e.target === e.currentTarget) upd('saveModalDraft', null); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: '#1e293b', border: '1px solid #78350f', borderRadius: 14,
              padding: 20, maxWidth: 380, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', {
              id: 'sk-save-title',
              style: { margin: '0 0 6px', color: '#fef3c7', fontSize: 15, fontWeight: 800, letterSpacing: '0.04em' }
            }, '💾 Save current setup as a scenario'),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 } },
              'Capture the current ' + d.mode + ' configuration so it shows in the scenario row alongside the famous tricks. Pick a short, memorable name.'),
            h('input', {
              type: 'text',
              autoFocus: true,
              maxLength: 40,
              value: d.saveModalDraft.label,
              onChange: function(e) { upd('saveModalDraft', { label: e.target.value }); },
              onKeyDown: function(e) {
                if (e.key === 'Enter') saveCurrentAsScenario(d.saveModalDraft.label);
                else if (e.key === 'Escape') upd('saveModalDraft', null);
              },
              'aria-label': 'Custom scenario name (max 40 characters)',
              placeholder: 'e.g., "Ramp out back" or "Wind tunnel test"',
              'data-sk-focusable': 'true',
              style: {
                width: '100%', padding: '8px 12px', fontSize: 13,
                background: '#0f172a', color: '#fef3c7',
                border: '1px solid #475569', borderRadius: 8, outline: 'none',
                marginBottom: 14, boxSizing: 'border-box'
              }
            }),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { upd('saveModalDraft', null); },
                'data-sk-focusable': 'true',
                style: {
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  background: 'transparent', color: '#94a3b8',
                  border: '1px solid #475569', borderRadius: 8, cursor: 'pointer', minHeight: 32
                }
              }, 'Cancel'),
              h('button', {
                onClick: function() { saveCurrentAsScenario(d.saveModalDraft.label); },
                disabled: !d.saveModalDraft.label.trim(),
                'data-sk-focusable': 'true',
                style: {
                  padding: '8px 16px', fontSize: 12, fontWeight: 800,
                  background: !d.saveModalDraft.label.trim() ? '#475569' : 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                  color: '#fef3c7',
                  border: '1px solid #6d28d9', borderRadius: 8,
                  cursor: !d.saveModalDraft.label.trim() ? 'not-allowed' : 'pointer', minHeight: 32
                }
              }, '💾 Save')
            )
          )
        ),
        // ── Reset confirm modal ─────────────────────────────────
        d.resetConfirmOpen && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-reset-title',
          onClick: function(e) { if (e.target === e.currentTarget) upd('resetConfirmOpen', false); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: '#1e293b', border: '1px solid #b91c1c', borderRadius: 14,
              padding: 20, maxWidth: 380, width: '100%'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', { id: 'sk-reset-title', style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 15, fontWeight: 800 } }, '🗑 Reset SkateLab stats?'),
            h('p', { style: { margin: '0 0 14px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } },
              'This clears your landings, bails, personal bests, and quest progress for SkateLab only. Your custom scenarios are kept. This cannot be undone.'),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { upd('resetConfirmOpen', false); },
                'data-sk-focusable': 'true',
                style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer', minHeight: 32 }
              }, 'Cancel'),
              h('button', {
                onClick: performResetStats,
                'data-sk-focusable': 'true',
                style: { padding: '8px 16px', fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg,#b91c1c,#7f1d1d)', color: '#fef3c7', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', minHeight: 32 }
              }, '🗑 Reset')
            )
          )
        ),
        // ── Show-formula panel ──────────────────────────────────
        // Renders the live physics equation with current values
        // plugged in. Mode-aware: halfpipe shows the KE→PE chain
        // ending in air time + rotation budget; gap shows the
        // projectile range formula plus the wind-adjusted variant
        // when wind ≠ calm. Updates every render so changing a
        // slider re-evaluates the math without an attempt being run.
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 } },
          // Mute toggle — gates every skTone call. Persists in
          // localStorage so a teacher who silences the classroom
          // doesn't have to re-mute every reload. Also bound to 'M'.
          h('button', {
            onClick: toggleMuteUI,
            'aria-pressed': muted,
            'aria-label': muted ? 'Sound off. Press to unmute.' : 'Sound on. Press to mute.',
            'data-sk-focusable': 'true',
            title: 'Mute / unmute (M key)',
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: muted ? 'rgba(251,191,36,0.20)' : 'rgba(254,243,199,0.06)',
              color: muted ? '#fbbf24' : '#94a3b8',
              border: '1px solid ' + (muted ? 'rgba(251,191,36,0.55)' : 'rgba(254,243,199,0.20)'),
              borderRadius: 999, cursor: 'pointer', minHeight: 26
            }
          }, muted ? '🔇 Muted' : '🔊 Sound'),
          h('button', {
            onClick: function() { upd('showFormula', !d.showFormula); skAnnounce(d.showFormula ? 'Formula panel hidden.' : 'Formula panel shown.'); },
            'aria-pressed': !!d.showFormula,
            'aria-label': d.showFormula ? 'Hide live formula panel' : 'Show live formula panel',
            'data-sk-focusable': 'true',
            title: 'Toggle the live equation that updates as you change settings',
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: d.showFormula ? 'rgba(56,189,248,0.18)' : 'rgba(254,243,199,0.06)',
              color: d.showFormula ? '#7dd3fc' : '#94a3b8',
              border: '1px solid ' + (d.showFormula ? 'rgba(56,189,248,0.50)' : 'rgba(254,243,199,0.20)'),
              borderRadius: 999, cursor: 'pointer', minHeight: 26
            }
          }, '📐 Formula: ' + (d.showFormula ? 'on' : 'off'))
        ),
        d.showFormula && (function() {
          // Compute live values once for the panel — same primitives
          // simHalfpipe / simGapJump use, but without the animation /
          // landed/score side effects.
          var v0 = 4.0;
          var vehicle = getVehicle(d.vehicle);
          var vTakeoff = v0 + d.pumps * vehicle.pumpEfficiency;          // m/s
          var surface = getSurface(d.surfaceId);
          var g = d.gravity || 9.81;
          var hAir = (surface.efficiency * vTakeoff * vTakeoff) / (2 * g);
          var airTime = 2 * Math.sqrt(2 * hAir / g);
          var trick = getTrick(d.trickId);
          var spinRate = trick.rotation > 0 ? (trick.rotation / Math.max(0.36, trick.minAir * 0.95)) * vehicle.rotationScale : 0;
          var v = d.speedMph / MPS2MPH;
          var theta = (d.angleDeg || 30) * Math.PI / 180;
          var rangeCalm = (v * v * Math.sin(2 * theta)) / g;
          var wind = getWind(d.windId || 'calm');
          var windMs = wind.mph / MPS2MPH;
          var hangG = (2 * v * Math.sin(theta)) / g;
          var aWind = 0.18 * windMs;
          var rangeWind = rangeCalm + 0.5 * aWind * hangG * hangG;
          var peakG = (v * v * Math.sin(theta) * Math.sin(theta)) / (2 * g);
          var Eq = function(label, expr, value, unit) {
            return h('div', {
              style: { fontFamily: 'monospace', fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 4 }
            },
              h('span', { style: { color: '#7dd3fc', fontWeight: 700, marginRight: 6 } }, label),
              expr,
              h('span', { style: { color: '#86efac', marginLeft: 4 } }, '= '),
              h('b', { style: { color: '#fbbf24' } }, value),
              unit ? h('span', { style: { color: '#94a3b8', marginLeft: 2 } }, ' ' + unit) : null
            );
          };
          return h('div', {
            role: 'region',
            'aria-label': 'Live physics equations',
            style: {
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.40)',
              borderRadius: 10, padding: 12, marginBottom: 12
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: '#7dd3fc', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 } }, '📐 Live equation' + (d.mode === 'halfpipe' ? ' — Energy chain' : ' — Projectile motion')),
            d.mode === 'halfpipe' ? [
              Eq('1. KE at lip',
                'v = v₀ + (pumps × pump-eff) = 4.0 + (' + d.pumps + ' × ' + vehicle.pumpEfficiency.toFixed(2) + ')',
                vTakeoff.toFixed(2), 'm/s'),
              Eq('2. Air height',
                'h = η · v² / (2g) = ' + surface.efficiency.toFixed(2) + ' · ' + vTakeoff.toFixed(2) + '² / (2 · ' + g.toFixed(2) + ')',
                hAir.toFixed(3), 'm  (' + (hAir * M2FT).toFixed(2) + ' ft)'),
              Eq('3. Hang time',
                't = 2·√(2h/g) = 2·√(2·' + hAir.toFixed(3) + '/' + g.toFixed(2) + ')',
                airTime.toFixed(3), 's'),
              Eq('4. Rotation budget',
                't · spin-rate = ' + airTime.toFixed(3) + ' · ' + spinRate.toFixed(0) + '°/s',
                (airTime * spinRate).toFixed(0), '° (need ' + trick.rotation + '°)')
            ] : [
              Eq('1. v in m/s',
                'v = ' + d.speedMph + ' mph / 2.237',
                v.toFixed(2), 'm/s'),
              Eq('2. Range (calm)',
                'R = v² · sin(2θ) / g = ' + v.toFixed(2) + '² · sin(' + (2 * d.angleDeg) + '°) / ' + g.toFixed(2),
                rangeCalm.toFixed(2), 'm  (' + (rangeCalm * M2FT).toFixed(2) + ' ft)'),
              wind.id !== 'calm' ? Eq(
                '3. Range w/ wind',
                'R + 0.5·a·t² where a = 0.18·' + windMs.toFixed(2) + ' = ' + aWind.toFixed(3),
                rangeWind.toFixed(2), 'm  (' + (rangeWind * M2FT).toFixed(2) + ' ft)'
              ) : Eq(
                '3. Hang time',
                't = 2·v·sinθ / g = 2·' + v.toFixed(2) + '·sin(' + d.angleDeg + '°) / ' + g.toFixed(2),
                hangG.toFixed(3), 's'
              ),
              Eq('4. Peak height',
                'h = (v·sinθ)² / (2g) = (' + v.toFixed(2) + '·sin(' + d.angleDeg + '°))² / (2·' + g.toFixed(2) + ')',
                peakG.toFixed(2), 'm  (' + (peakG * M2FT).toFixed(2) + ' ft)')
            ]
          );
        })(),
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
              'Selected: ' + getTrick(d.trickId).rotation + '° rotation · needs ≥ ' + getTrick(d.trickId).minAir.toFixed(2) + 's air'),
            // ── Mastery Tree ─────────────────────────────────────
            // Surfaces per-trick attempts/lands as a 6-card mastery
            // dashboard. Closed by default (uses native <details>) so
            // students who want to grind one trick aren't crowded by
            // the panel; teachers can open it for "what tricks have
            // you tried?" conversations. Click a card to select that
            // trick — turns the panel into a discovery surface for
            // students who don't know what's available.
            h('details', { style: { marginTop: 10 } },
              h('summary', {
                style: {
                  cursor: 'pointer', color: '#fbbf24', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
                  padding: '4px 0', userSelect: 'none'
                }
              },
                (function() {
                  var counts = TRICKS.reduce(function(acc, tk) {
                    var lands = (d.tricksUsed || {})[tk.id] || 0;
                    var attempts = (d.trickAttempts || {})[tk.id] || 0;
                    var m = _trickMastery(attempts, lands);
                    acc[m.id] = (acc[m.id] || 0) + 1;
                    return acc;
                  }, {});
                  var mastered = counts.mastered || 0;
                  var landed = (counts.mastered || 0) + (counts.solid || 0) + (counts.landed || 0);
                  return '🎯 Mastery Tree — ' + landed + '/' + TRICKS.length + ' landed · ' + mastered + ' mastered';
                })()
              ),
              h('div', {
                style: {
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
                  marginTop: 10
                }
              },
                TRICKS.map(function(tk) {
                  var lands = (d.tricksUsed || {})[tk.id] || 0;
                  var attempts = (d.trickAttempts || {})[tk.id] || 0;
                  // Defensive: if old toolData has landedTricks[id]=true
                  // but no count, treat as 1 land.
                  if (lands === 0 && (d.landedTricks || {})[tk.id]) lands = 1;
                  // And if attempts < lands (mid-migration), bump up.
                  if (attempts < lands) attempts = lands;
                  var m = _trickMastery(attempts, lands);
                  var nextThreshold = lands < 1 ? 1 : lands < 3 ? 3 : lands < 5 ? 5 : null;
                  var sel = d.trickId === tk.id;
                  return h('button', {
                    key: 'mt-' + tk.id,
                    onClick: function() { upd('trickId', tk.id); skAnnounce('Selected ' + tk.label); },
                    disabled: d.running,
                    'aria-label': tk.label + ', ' + m.label + ', ' + lands + ' land' + (lands === 1 ? '' : 's') + ', ' + attempts + ' attempt' + (attempts === 1 ? '' : 's'),
                    'data-sk-focusable': 'true',
                    style: {
                      textAlign: 'left', padding: 10, borderRadius: 10,
                      background: m.bg,
                      border: '2px solid ' + (sel ? '#fbbf24' : m.color),
                      cursor: d.running ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 4,
                      opacity: d.running ? 0.7 : 1
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#fef3c7' } },
                      h('span', { style: { fontSize: 18 } }, tk.emoji),
                      h('span', null, tk.label),
                      h('span', { style: { marginLeft: 'auto', fontSize: 10, padding: '1px 6px', background: 'rgba(15,23,42,0.5)', color: m.color, borderRadius: 999, border: '1px solid ' + m.color, fontWeight: 800 } }, m.icon + ' ' + m.label)
                    ),
                    h('div', { style: { fontSize: 10, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', gap: 4, fontFamily: 'monospace' } },
                      h('span', null, tk.rotation + '° · needs ' + tk.minAir.toFixed(2) + 's air'),
                      h('span', null, '🎯 ' + lands + ' / 🛹 ' + attempts)
                    ),
                    nextThreshold && h('div', {
                      role: 'progressbar',
                      'aria-valuemin': 0,
                      'aria-valuemax': nextThreshold,
                      'aria-valuenow': lands,
                      style: { height: 4, background: 'rgba(15,23,42,0.5)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }
                    },
                      h('div', { style: { height: '100%', width: Math.min(100, (lands / nextThreshold) * 100) + '%', background: m.color, transition: 'width 240ms ease' } })
                    )
                  );
                })
              )
            ),
            // ── Trick Lore ───────────────────────────────────────
            // Closed by default. Each entry: origin (skate culture),
            // physics (the tool's lesson), and a pro tip. Connects
            // the abstract simulation to the real names + people +
            // physics insight behind each move. Pure cultural
            // literacy layer — turns "kickflip" from a label into
            // "Rodney Mullen 1983, the magic flip."
            h('details', { style: { marginTop: 8 } },
              h('summary', {
                style: {
                  cursor: 'pointer', color: '#a5b4fc', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
                  padding: '4px 0', userSelect: 'none'
                }
              }, '📖 Trick Lore — origin, physics, pro tip'),
              h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
                TRICKS.map(function(tk) {
                  if (!tk.lore) return null;
                  return h('div', {
                    key: 'lore-' + tk.id,
                    style: {
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(165,180,252,0.30)',
                      borderRadius: 10, padding: '10px 12px'
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { style: { fontSize: 18 } }, tk.emoji),
                      h('span', { style: { fontSize: 13, fontWeight: 800, color: '#e0e7ff' } }, tk.label),
                      h('span', { style: { marginLeft: 'auto', fontSize: 10, color: '#a5b4fc', fontFamily: 'monospace' } }, tk.rotation + '° · needs ' + tk.minAir.toFixed(2) + 's')
                    ),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 4 } },
                      h('div', null, h('b', { style: { color: '#fbbf24' } }, '🛹 Origin: '), tk.lore.origin),
                      h('div', null, h('b', { style: { color: '#7dd3fc' } }, '📐 Physics: '), tk.lore.physics),
                      h('div', null, h('b', { style: { color: '#86efac' } }, '💡 Pro tip: '), tk.lore.proTip)
                    )
                  );
                })
              )
            )
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
        // ── Predict-mode panel ──────────────────────────────────
        // Pedagogical core: when on, students must commit to a
        // numeric prediction BEFORE the simulation runs. The result
        // card later shows actual-vs-predicted with an error %, and
        // running stats track how often they're within 10% — the
        // signal that physics intuition is forming.
        (function() {
          var predictUnit = d.mode === 'halfpipe' ? 'air height (ft)' : 'range (ft)';
          var hint = d.mode === 'halfpipe'
            ? 'How high above the lip? Typical kickflip ≈ 0.5–3 ft.'
            : 'How far will it actually go? Range = v² · sin(2θ) / g.';
          var trimmed = (d.predictionInput || '').trim();
          var parsed = trimmed === '' ? NaN : parseFloat(trimmed);
          var predValid = isFinite(parsed) && parsed >= 0;
          var ps = d.predictionStats || { count: 0, totalErrPct: 0, bestPct: null, withinTen: 0 };
          var avgErr = ps.count > 0 ? (ps.totalErrPct / ps.count) : null;
          return h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 6 } },
              h('button', {
                onClick: function() {
                  var next = !d.predictMode;
                  upd({ predictMode: next, predictionInput: '' });
                  skAnnounce(next ? 'Predict mode on. Type your prediction before each attempt.' : 'Predict mode off.');
                },
                'aria-pressed': !!d.predictMode,
                'aria-label': d.predictMode ? 'Turn off predict mode' : 'Turn on predict mode — type a number before each attempt',
                'data-sk-focusable': 'true',
                title: 'Predict, then verify. Builds the physics intuition.',
                style: {
                  padding: '4px 10px', fontSize: 10, fontWeight: 700,
                  background: d.predictMode ? 'rgba(168,85,247,0.20)' : 'rgba(254,243,199,0.06)',
                  color: d.predictMode ? '#d8b4fe' : '#94a3b8',
                  border: '1px solid ' + (d.predictMode ? 'rgba(168,85,247,0.55)' : 'rgba(254,243,199,0.20)'),
                  borderRadius: 999, cursor: 'pointer', minHeight: 26
                }
              }, '🔮 Predict: ' + (d.predictMode ? 'on' : 'off'))
            ),
            d.predictMode && h('div', {
              role: 'region',
              'aria-label': 'Prediction input',
              style: {
                background: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.45)',
                borderRadius: 10, padding: 10, marginBottom: 10
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: ps.count > 0 ? 8 : 0 } },
                h('label', {
                  htmlFor: 'sk-predict-input',
                  style: { fontSize: 11, fontWeight: 700, color: '#d8b4fe', letterSpacing: '0.04em', textTransform: 'uppercase' }
                }, '🔮 Predict ' + predictUnit),
                h('input', {
                  id: 'sk-predict-input',
                  type: 'number', step: '0.1', min: '0',
                  inputMode: 'decimal',
                  value: d.predictionInput || '',
                  onChange: function(e) { upd('predictionInput', e.target.value); },
                  disabled: d.running,
                  'data-sk-focusable': 'true',
                  'aria-describedby': 'sk-predict-hint',
                  placeholder: '0.0',
                  style: {
                    width: 90, padding: '6px 8px', fontSize: 13, fontWeight: 700,
                    background: '#0f172a', color: '#fef3c7',
                    border: '1px solid ' + (predValid ? '#a855f7' : '#475569'),
                    borderRadius: 6
                  }
                }),
                h('span', { id: 'sk-predict-hint', style: { fontSize: 10, color: '#cbd5e1', flex: 1, minWidth: 180 } }, hint)
              ),
              ps.count > 0 && h('div', { style: { fontSize: 10, color: '#c4b5fd', display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(168,85,247,0.25)' } },
                h('span', null, '📊 ', h('b', null, ps.count), ' prediction' + (ps.count === 1 ? '' : 's')),
                avgErr !== null && h('span', null, '⌀ avg off: ', h('b', { style: { color: '#fbbf24' } }, avgErr.toFixed(1) + '%')),
                ps.bestPct !== null && h('span', null, '🏆 best: ', h('b', { style: { color: '#86efac' } }, ps.bestPct.toFixed(1) + '%')),
                h('span', null, '🎯 within 10%: ', h('b', { style: { color: '#86efac' } }, (ps.withinTen || 0) + '/' + ps.count))
              )
            )
          );
        })(),
        // Run button — disabled while running OR while predict-mode
        // is on without a valid numeric prediction. The dim/disabled
        // path is the same in both cases so screen readers + visual
        // users get a consistent affordance.
        (function() {
          var predTrim = (d.predictionInput || '').trim();
          var predParsed = parseFloat(predTrim);
          var predValid = isFinite(predParsed) && predParsed >= 0;
          var blockedByPredict = d.predictMode && !predValid;
          var disabled = d.running || blockedByPredict;
          return h('button', {
            onClick: function() {
              if (blockedByPredict) {
                skAnnounce('Type a numeric prediction first.');
                if (addToast) addToast('🔮 Predict mode is on, type a number first.', 'info');
                var input = document.getElementById('sk-predict-input');
                if (input) input.focus();
                return;
              }
              (d.mode === 'halfpipe' ? runHalfpipe : runGapJump)();
            },
            disabled: disabled,
            'aria-label': blockedByPredict
              ? 'Type a prediction first'
              : (d.mode === 'halfpipe' ? 'Drop in and attempt the trick' : 'Send it across the gap'),
            'aria-busy': d.running,
            'data-sk-focusable': 'true',
            style: {
              width: '100%', padding: '12px 20px', marginBottom: 12,
              // WCAG 1.4.3 — slate-500 background + slate-900 text on
              // disabled meets AA on the dimmer state.
              background: disabled ? '#64748b' : 'linear-gradient(135deg, #b45309, #7c2d12)',
              color: disabled ? '#0f172a' : '#fef3c7',
              border: '2px solid ' + (disabled ? '#475569' : '#78350f'),
              borderRadius: 12,
              fontSize: 16, fontWeight: 800,
              cursor: d.running ? 'wait' : (blockedByPredict ? 'not-allowed' : 'pointer'),
              boxShadow: disabled ? 'none' : '0 4px 15px rgba(120,53,15,0.4), inset 0 1px 0 rgba(255,235,170,0.3)',
              letterSpacing: '0.04em', opacity: disabled ? 0.85 : 1
            }
          }, d.running
            ? '⏳ Sending it...'
            : blockedByPredict
              ? '🔮 Type a prediction first'
              : (d.mode === 'halfpipe' ? '🛹 Drop In!' : '🦘 Send It!'));
        })(),
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
                d.lastResult.errPct !== undefined && h('div', {
                  style: {
                    marginTop: 6, padding: '6px 8px', borderRadius: 6,
                    background: d.lastResult.errPct <= 10 ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                    border: '1px solid ' + (d.lastResult.errPct <= 10 ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                    color: d.lastResult.errPct <= 10 ? '#86efac' : '#d8b4fe'
                  }
                },
                  '🔮 Predicted ', h('b', null, d.lastResult.predicted.toFixed(2) + ' ft'),
                  ' · Actual ', h('b', null, d.lastResult.actual.toFixed(2) + ' ft'),
                  ' · Off ', h('b', null, d.lastResult.errPct.toFixed(1) + '%'),
                  d.lastResult.errPct <= 10 ? ' 🎯' : ''
                ),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
            : h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, fontFamily: 'monospace' } },
                h('div', null, '🚀 Takeoff: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.vMph + ' mph at ' + d.lastResult.angleDeg + '°')),
                h('div', null, '📐 Range = v² × sin(2θ) / g = ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.rangeFt.toFixed(2) + ' ft'), ' (needed ' + d.lastResult.gapFt + ' ft)'),
                d.lastResult.wind && d.lastResult.wind !== 'Calm' && h('div', null, '🌬️ Wind: ', h('b', { style: { color: d.lastResult.windDeltaFt > 0 ? '#86efac' : '#fca5a5' } }, d.lastResult.wind + ' (' + (d.lastResult.windDeltaFt > 0 ? '+' : '') + d.lastResult.windDeltaFt.toFixed(2) + ' ft)')),
                h('div', null, '⛰ Peak height: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.peakFt.toFixed(2) + ' ft')),
                h('div', null, '⏱ Hang time: ', h('b', { style: { color: '#fbbf24' } }, d.lastResult.hangTime.toFixed(2) + ' s')),
                h('div', null, '🎯 Clearance: ', h('b', { style: { color: d.lastResult.landed ? '#86efac' : '#fbbf24' } }, (d.lastResult.clearance >= 0 ? '+' : '') + d.lastResult.clearance.toFixed(2) + ' ft')),
                d.lastResult.errPct !== undefined && h('div', {
                  style: {
                    marginTop: 6, padding: '6px 8px', borderRadius: 6,
                    background: d.lastResult.errPct <= 10 ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                    border: '1px solid ' + (d.lastResult.errPct <= 10 ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                    color: d.lastResult.errPct <= 10 ? '#86efac' : '#d8b4fe'
                  }
                },
                  '🔮 Predicted ', h('b', null, d.lastResult.predicted.toFixed(2) + ' ft'),
                  ' · Actual ', h('b', null, d.lastResult.actual.toFixed(2) + ' ft'),
                  ' · Off ', h('b', null, d.lastResult.errPct.toFixed(1) + '%'),
                  d.lastResult.errPct <= 10 ? ' 🎯' : ''
                ),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
        ),
        // ── Adaptive nudge ──────────────────────────────────────
        // Rule-based hint that fires after 3 consecutive bails to
        // surface a one-tap fix (more pumps, smaller trick, etc.).
        // Sits between result panel and AI Coach so students see
        // the actionable suggestion before the heavier AI ask. The
        // "Skip" button records the current attempts count so the
        // nudge stays hidden until the next bail after that.
        (function() {
          var nudge = _suggestNudge();
          if (!nudge) return null;
          return h('div', {
            role: 'region',
            'aria-label': 'Coaching suggestion',
            style: {
              background: 'linear-gradient(135deg, rgba(56,189,248,0.10), rgba(168,85,247,0.08))',
              border: '1px solid rgba(56,189,248,0.45)',
              borderRadius: 10, padding: 12, marginBottom: 12
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', letterSpacing: '0.06em', textTransform: 'uppercase' } }, '💡 Quick fix · ' + (d.consecutiveBails || 0) + ' bails in a row'),
              h('button', {
                onClick: function() { upd('nudgeDismissedAt', d.attempts || 0); skAnnounce('Suggestion dismissed.'); },
                'aria-label': 'Dismiss this suggestion',
                'data-sk-focusable': 'true',
                style: {
                  padding: '4px 8px', fontSize: 10, fontWeight: 700,
                  background: 'transparent', color: '#94a3b8',
                  border: '1px solid rgba(148,163,184,0.35)',
                  borderRadius: 6, cursor: 'pointer', minHeight: 26
                }
              }, '✕ Skip')
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 } }, nudge.message),
            h('button', {
              onClick: function() {
                upd(Object.assign({}, nudge.fixBumps, { nudgeDismissedAt: d.attempts || 0 }));
                skAnnounce('Applied: ' + nudge.fixLabel);
                if (addToast) addToast('💡 Applied — ' + nudge.fixLabel, 'success');
              },
              'aria-label': 'Apply suggested fix: ' + nudge.fixLabel,
              'data-sk-focusable': 'true',
              style: {
                padding: '8px 14px', fontSize: 12, fontWeight: 800,
                background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                color: '#0c4a6e',
                border: '1px solid #0284c7',
                borderRadius: 8, cursor: 'pointer', minHeight: 32,
                boxShadow: '0 2px 6px rgba(14,165,233,0.35)'
              }
            }, '✨ ' + nudge.fixLabel)
          );
        })(),
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
        ((d.bestHalfpipeScore || d.bestGapScore || d.bestAirFt || (d.streak && d.streak.longest)) ? h('div', {
          style: {
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
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
            { label: '🏆 Best Air',      val: (d.bestAirFt || 0).toFixed(2), suffix: ' ft', color: '#fde68a' },
            { label: '🔥 Longest Streak', val: (d.streak && d.streak.longest) || 0, suffix: '', color: '#fb923c' }
          ].map(function(s, i) {
            return h('div', { key: i, style: { textAlign: 'center' } },
              h('div', { style: { fontSize: 16, fontWeight: 900, color: s.color } }, s.val + s.suffix),
              h('div', { style: { fontSize: 9, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, s.label)
            );
          })
        ) : null),
        // Reset stats button — small admin row, opens a confirm modal.
        // Lives below the stats grid so it's findable but not noisy.
        // Hidden until at least one attempt has been made (otherwise
        // there's nothing to reset).
        ((d.attempts || 0) > 0) && h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 } },
          h('button', {
            onClick: function() { upd('resetConfirmOpen', true); },
            'aria-label': 'Reset SkateLab stats. Custom scenarios are kept.',
            'data-sk-focusable': 'true',
            title: 'Clear landings, bails, personal bests, and quest progress for SkateLab',
            style: {
              padding: '5px 11px', fontSize: 10, fontWeight: 700,
              background: 'rgba(185,28,28,0.10)', color: '#fca5a5',
              border: '1px solid rgba(185,28,28,0.40)',
              borderRadius: 999, cursor: 'pointer', minHeight: 26
            }
          }, '🗑 Reset stats')
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
