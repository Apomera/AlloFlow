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

  // Responsive layout helpers for the dense play surface.
  (function() {
    if (document.getElementById('allo-skatelab-responsive-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-skatelab-responsive-css';
    st.textContent = [
      '.skatelab-shell{container-type:inline-size}.skatelab-shell button,.skatelab-shell input,.skatelab-shell summary{touch-action:manipulation}.skatelab-shell button:disabled{cursor:not-allowed!important;opacity:.58}.skatelab-shell button[data-sk-focusable=true]{min-height:36px}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid #38bdf8;outline-offset:2px}',
      '.skatelab-shell button,.skatelab-shell summary{min-block-size:24px;min-inline-size:24px}',
      '.sk-run-focus-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(240px,.75fr);gap:12px}',
      '.sk-run-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.sk-park-map{position:relative;min-height:112px;margin:10px 0;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,rgba(14,165,233,.14),rgba(168,85,247,.12) 48%,rgba(22,163,74,.18));border:1px solid rgba(251,191,36,.24)}',
      '.sk-park-map:before{content:"";position:absolute;left:8%;right:8%;bottom:23px;height:3px;background:linear-gradient(90deg,rgba(251,191,36,.55),rgba(14,165,233,.65));border-radius:20px}',
      '.sk-park-map:after{content:"";position:absolute;left:16%;right:16%;bottom:27px;height:54px;border-top:3px solid rgba(251,191,36,.9);border-radius:70% 70% 0 0;filter:drop-shadow(0 0 10px rgba(251,191,36,.35))}',
      '.sk-park-point{position:absolute;z-index:1;display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:18px;background:rgba(15,23,42,.80);border:1px solid rgba(226,232,240,.18);color:#e0f2fe;font-size:11px;font-weight:850}',
      '.sk-park-start{left:7%;bottom:10px}.sk-park-apex{left:39%;top:12px}.sk-park-land{right:7%;bottom:10px}',
      '.sk-scenario-rail{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:inline proximity;padding:2px 2px 8px;justify-content:flex-start}.sk-scenario-rail>button,.sk-scenario-rail>div{flex:0 0 auto;scroll-snap-align:start}',
      '.sk-control-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}',
      '.sk-gap-control-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px}',
      '.sk-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}',
      '.sk-inquiry-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:6px}',
      '.sk-inquiry-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:8px 12px}',
      '@media(max-width:760px){.skatelab-shell{padding:10px!important}.sk-run-focus-grid,.sk-run-metric-grid{grid-template-columns:1fr!important}.sk-canvas-frame{padding:6px!important}.sk-toolbar-row{justify-content:flex-start!important}.sk-compact-label{white-space:normal!important}.skatelab-shell button[data-sk-focusable=true]{min-height:40px}}',
      '@media(max-width:480px){.sk-park-map{min-height:132px}.sk-park-point{font-size:10px;padding:4px 6px}.sk-park-start{left:4%;bottom:9px}.sk-park-apex{left:50%;transform:translateX(-50%);top:10px}.sk-park-land{right:4%;bottom:9px}.sk-run-focus-grid>div{padding:10px!important}}',
      '@media(prefers-reduced-motion:reduce){.skatelab-shell *{scroll-behavior:auto!important;transition-duration:0.01ms!important;animation-duration:0.01ms!important;animation-iteration-count:1!important}}',
      '@media(forced-colors:active){.skatelab-shell button,.skatelab-shell input,.skatelab-shell summary{border:1px solid ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.skatelab-shell button:disabled{color:GrayText!important;border-color:GrayText!important}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid Highlight!important}.sk-canvas-frame{border:2px solid CanvasText!important;background:Canvas!important;box-shadow:none!important}.sk-canvas-summary{border-color:CanvasText!important;background:Canvas!important;color:CanvasText!important}}'
    ].join('');
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

  function skPrefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
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

  // ── Protective gear catalog ────────────────────────────────────
  // Each entry: what the gear does (mechanical role), the physics
  // (the equation insight that justifies it), why-wear-it (the
  // case-making call to action), and a citation stat. Drawn from
  // CDC / AAP / SafeKids data on skate injury epidemiology.
  // Helmet: 85% reduction in head injury (CDC 2017).
  // Wrist: FOOSH (fall on outstretched hand) is the #1 skate
  //   injury — wrist guards splint axial load along the radius.
  // Knee/elbow pads: convert impact into sliding friction (energy
  //   over distance, not at one point).
  // Skate shoes: flat sole for board feel, ollie-zone reinforcement.
  // Mouthguard: ~30% concussion reduction by absorbing jaw impact
  //   transmission (AAPD).
  var GEAR = [
    { id: 'helmet', label: 'Helmet', icon: '⛑️',
      does: 'Spreads impact force across the skull and slows the head\'s deceleration via foam crush.',
      physics: 'Force = Δmomentum ÷ Δt. The foam liner increases Δt — the time over which your head stops — by roughly 5×. Force scales inversely with time, so a 5× longer stop ≈ 1/5 the peak force on the brain.',
      whyWear: 'CDC: helmets reduce skateboard head injury risk by ~85%. Single most leverage-y piece of gear you can put on. Look for CPSC or ASTM F1492 certification.',
      stat: '~85% reduction in head injury · CDC' },
    { id: 'wristguard', label: 'Wrist Guards', icon: '✋',
      does: 'Splints the wrist and distributes fall force along the forearm instead of all at the hand.',
      physics: 'Stress = Force ÷ Area. A bare wrist concentrates fall force at a small bone interface. The plastic splint multiplies the loading area, so the same force translates to less stress per square inch.',
      whyWear: 'FOOSH (Fall On Outstretched Hand) is the #1 skate injury, especially for beginners. Wrist guards have been shown to cut wrist fracture risk by over 60% in beginner skaters.',
      stat: '60%+ reduction in wrist fractures · AAP' },
    { id: 'kneepad', label: 'Knee Pads', icon: '🦵',
      does: 'Hard plastic cap turns a "stop" into a "slide" — converting impact energy into sliding friction.',
      physics: 'KE_dissipated = Friction × distance. A bare knee dissipates impact at one point (huge force). A pad slides over concrete, dissipating the same KE over meters of distance — much smaller peak force.',
      whyWear: 'Knee pads are why pros can fall a hundred times in a session without sitting out the next one. Prevents skin loss, patellar fractures, and the "knee-bursitis" that ends careers.',
      stat: 'Standard issue for vert / bowl skating' },
    { id: 'elbowpad', label: 'Elbow Pads', icon: '💪',
      does: 'Same slide-not-stop principle as knee pads, applied to the elbow joint.',
      physics: 'The olecranon (point of the elbow) is bony and unprotected — fall on it and you concentrate force on a tiny area. Pad spreads the contact patch and lets you slide.',
      whyWear: 'Elbow fractures are surgical fractures more often than wrist fractures. Pads cost $15 and save the surgery.',
      stat: 'Recommended by AAP for all skaters under 16' },
    { id: 'shoes', label: 'Skate Shoes', icon: '👟',
      does: 'Flat vulcanized soles for board feel; reinforced ollie zones to take grip-tape abrasion.',
      physics: 'Friction coefficient between sole and grip tape determines how much pop you can transmit on an ollie. Skate shoes are tuned for high static friction without slipping during the kick.',
      whyWear: 'Running shoes have curved soles (heel-to-toe rocker) that sit wrong on a board and cause ankle rolls. Skate shoes are flat for a reason. Plus they last ~5× longer against grip tape.',
      stat: 'Reduces ankle inversion injuries' },
    { id: 'mouthguard', label: 'Mouthguard', icon: '😬',
      does: 'Absorbs and dampens jaw impact before it transmits to the skull base.',
      physics: 'A blow to the chin sends shock waves up the mandible into the temporomandibular joint and on to the brainstem. The compressible mouthguard dissipates that energy in the polymer instead.',
      whyWear: 'Cuts concussion risk by roughly 30% in contact sports (AAPD data). Bonus: protects teeth — and dental work costs more than a mouthguard.',
      stat: '~30% concussion-risk reduction · AAPD' }
  ];

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

  // Rider mass — used for the live energy-budget bar. Approximate
  // average teen-skater mass; combined with vehicle.mass for total
  // m in KE = ½mv² and PE = mgh.
  var RIDER_KG = 60;

  // Skater color palette — id maps to {body, accent}. Body tints
  // the stick-figure strokes; accent is reserved for the helmet
  // shell when helmet is on. Six options keeps the picker tight.
  var SKATER_COLORS = {
    amber:  { body: '#fef3c7', accent: '#fbbf24', label: 'Amber' },
    red:    { body: '#fecaca', accent: '#ef4444', label: 'Red' },
    green:  { body: '#bbf7d0', accent: '#22c55e', label: 'Green' },
    blue:   { body: '#bfdbfe', accent: '#3b82f6', label: 'Blue' },
    purple: { body: '#e9d5ff', accent: '#a855f7', label: 'Purple' },
    pink:   { body: '#fbcfe8', accent: '#ec4899', label: 'Pink' }
  };
  function getSkaterColor(id) { return SKATER_COLORS[id] || SKATER_COLORS.amber; }

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
        "For the same takeoff speed, h = v²/(2g) and total air time = 2v/g. Why does reducing g by about 6 make both the height and air time about 6 times larger?",
        "On the Moon with 2 pumps, do you have enough air for a 720? A 1080?",
        "If height were held fixed, how would lower lunar g change PE = mgh? In this simulation speed is held fixed instead, so why does the rider rise higher while peak PE still equals the surviving launch energy?"
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
    var totalMass = RIDER_KG + vehicle.mass;
    var energyInputJ = 0.5 * totalMass * v * v;
    var mechanicalJ = efficiency * energyInputJ;
    var thermalJ = energyInputJ - mechanicalJ;
    var hAir = mechanicalJ / (totalMass * g);   // height above lip, m
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
      energyInputJ: energyInputJ, mechanicalJ: mechanicalJ, thermalJ: thermalJ,
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
  // ── Energy budget bar helper ─────────────────────────────────
  // Renders a horizontal KE / PE / thermal bar with numeric breakdown.
  // Called from drawHalfpipe + drawGapJump during the air/flight
  // phase (when state.energyTotal > 0). Skipped if showEnergyBar
  // is false. Joules are rounded to whole numbers since the
  // intuitive grain is "this many joules of motion vs height," not
  // sub-joule precision.
  function drawEnergyBar(ctx, x, y, w, h, KE, PE, thermal, total) {
    if (!total || total <= 0) return;
    var keFrac = Math.max(0, Math.min(1, KE / total));
    var peFrac = Math.max(0, Math.min(1, PE / total));
    var thermalFrac = Math.max(0, Math.min(1, thermal / total));
    var keW = w * keFrac;
    var peW = w * peFrac;
    var thermalW = w * thermalFrac;
    // Background track
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.strokeStyle = 'rgba(254,243,199,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    // KE segment — red/orange gradient (motion energy)
    if (keW > 0) {
      var keGrad = ctx.createLinearGradient(x, y, x + keW, y);
      keGrad.addColorStop(0, '#fca5a5');
      keGrad.addColorStop(1, '#f87171');
      ctx.fillStyle = keGrad;
      ctx.fillRect(x, y, keW, h);
    }
    // PE segment — blue gradient (height energy), pinned to right
    if (peW > 0) {
      var peGrad = ctx.createLinearGradient(x + w - peW, y, x + w, y);
      peGrad.addColorStop(0, '#93c5fd');
      peGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = peGrad;
      ctx.fillRect(x + keW, y, peW, h);
    }
    // Thermal energy is transferred to the wheels, ramp, and air.
    if (thermalW > 0) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + keW + peW, y, thermalW, h);
    }
    // Numeric breakdown under the bar
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('KE ' + Math.round(KE) + 'J', x, y + h + 12);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('PE ' + Math.round(PE) + 'J', x + w / 2, y + h + 12);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.fillText('HEAT ' + Math.round(thermal) + 'J', x + w, y + h + 12);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(254,243,199,0.88)';
    ctx.fillText('INPUT ' + Math.round(total) + 'J', x + w / 2, y - 4);
  }

  function drawHalfpipe(canvas, state) {
    if (!canvas) return;
    // PL7 HiDPI: ensure crisp rendering on retina displays. Idempotent.
    if (window.StemLab && window.StemLab.setupHiDPI) {
      window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
    }
    var ctx = canvas.getContext('2d');
    if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
    var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
    // ── Sky: dusk gradient with brightness modulation when high.
    // Same dusk palette as Gap Jump for visual consistency. ──
    var airBoostHp = Math.min(1, ((state.airHeightFt || 0) / 12));
    var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, airBoostHp > 0.4 ? '#3b1d6f' : '#2a1659');
    skyGrad.addColorStop(0.45, '#5b1d8a');
    skyGrad.addColorStop(0.66, airBoostHp > 0.4 ? '#c2410c' : '#9a3412');
    skyGrad.addColorStop(0.74, '#1e293b');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);
    // ── Stars: deterministic placement seeded by canvas dims. ──
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    var hpSeed = (W * 13 + H * 17) % 1000;
    for (var hpsi = 0; hpsi < 18; hpsi++) {
      var hpsxr = ((hpSeed + hpsi * 73) % 1000) / 1000 * W;
      var hpsyr = ((hpSeed + hpsi * 41) % 1000) / 1000 * (H * 0.4);
      var hpsrad = 0.6 + ((hpSeed + hpsi * 19) % 100) / 100 * 1.2;
      ctx.beginPath();
      ctx.arc(hpsxr, hpsyr, hpsrad, 0, Math.PI * 2);
      ctx.fill();
    }
    // ── Distant silhouettes — mountains + city skyline at horizon ──
    var hpHorizonY = H * 0.62;
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, hpHorizonY + 20);
    var hpMtnSeed = (W * 7) % 1000;
    for (var hpmx = 0; hpmx <= W; hpmx += 18) {
      var hpJag = ((hpMtnSeed + hpmx * 29) % 100) / 100;
      ctx.lineTo(hpmx, hpHorizonY - hpJag * 28);
    }
    ctx.lineTo(W, hpHorizonY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, hpHorizonY + 20);
    for (var hpcx = 0; hpcx <= W; hpcx += 12) {
      var hpCity = ((hpMtnSeed + hpcx * 53) % 100) / 100;
      ctx.lineTo(hpcx, hpHorizonY - hpCity * 14 + 6);
      ctx.lineTo(hpcx + 6, hpHorizonY - hpCity * 14 + 6);
    }
    ctx.lineTo(W, hpHorizonY + 20);
    ctx.closePath();
    ctx.fill();
    // ── Halfpipe geometry: two arcs forming a U ──
    var midX = W / 2;
    var floorY = H * 0.86;
    var lipY = H * 0.30;
    var lipHalfW = W * 0.36;
    var leftLipX = midX - lipHalfW;
    var rightLipX = midX + lipHalfW;
    var radius = floorY - lipY;
    // Pipe fill — radial gradient simulating tube curvature (lighter
    // center, darker at the rim) so the pipe reads as 3D. ──
    var pipeGrad = ctx.createRadialGradient(midX, floorY - radius * 0.3, radius * 0.2, midX, floorY - radius * 0.3, radius * 1.2);
    pipeGrad.addColorStop(0, '#64748b');
    pipeGrad.addColorStop(0.7, '#475569');
    pipeGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = pipeGrad;
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
    // Concrete texture stripes (left wall)
    ctx.strokeStyle = 'rgba(15,23,42,0.22)';
    ctx.lineWidth = 1;
    for (var sLeft = 0; sLeft < 10; sLeft++) {
      ctx.beginPath();
      ctx.moveTo(leftLipX - radius * 0.55 + sLeft * 6, lipY);
      ctx.lineTo(leftLipX, floorY);
      ctx.stroke();
    }
    // Concrete texture stripes (right wall, mirrored)
    for (var sRight = 0; sRight < 10; sRight++) {
      ctx.beginPath();
      ctx.moveTo(rightLipX + radius * 0.55 - sRight * 6, lipY);
      ctx.lineTo(rightLipX, floorY);
      ctx.stroke();
    }
    // Floor texture stripes (horizontal across the bottom)
    for (var hpfy = floorY + 6; hpfy < floorY + 38; hpfy += 6) {
      ctx.beginPath();
      ctx.moveTo(leftLipX, hpfy);
      ctx.lineTo(rightLipX, hpfy);
      ctx.stroke();
    }
    // Rim highlight along both top edges
    ctx.strokeStyle = 'rgba(251,191,36,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftLipX - radius * 0.55, lipY);
    ctx.lineTo(rightLipX + radius * 0.55, lipY);
    ctx.stroke();
    // Lip rails (thicker accent on outer edges)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftLipX - radius * 0.6, lipY);
    ctx.lineTo(leftLipX - radius * 0.45, lipY);
    ctx.moveTo(rightLipX + radius * 0.45, lipY);
    ctx.lineTo(rightLipX + radius * 0.6, lipY);
    ctx.shadowColor = 'rgba(251,191,36,0.85)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // ── Ghost trajectory (best run) ───────────────────────────
    // Faded arc + skater silhouette at the peak. Same parametric
    // arc the live animator uses (h = hAir * 4 * p * (1-p)) so the
    // ghost faithfully represents the previous best. Drawn before
    // the active skater so the live one always renders on top.
    if (state.ghost && state.ghost.hAir != null) {
      var gh = state.ghost;
      var ghX = rightLipX + 6;
      var ghPxPerM = (floorY - lipY) / 4.0;
      ctx.save();
      ctx.strokeStyle = 'rgba(167,139,250,0.55)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      var samples = 24;
      for (var gi = 0; gi <= samples; gi++) {
        var gp = gi / samples;
        var gh_y = lipY - gh.hAir * 4 * gp * (1 - gp) * ghPxPerM;
        if (gi === 0) ctx.moveTo(ghX, gh_y);
        else ctx.lineTo(ghX, gh_y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Peak marker — small ghost emoji + height label
      var peakY = lipY - gh.hAir * ghPxPerM;
      ctx.fillStyle = 'rgba(167,139,250,0.75)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('👻', ghX + 8, peakY + 5);
      ctx.fillStyle = 'rgba(196,181,253,0.85)';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('best ' + (gh.hAir * M2FT).toFixed(1) + 'ft', ghX + 26, peakY + 4);
      ctx.restore();
    }
    var skStyle = state.skater || { color: 'amber', helmet: false, pads: false };
    var skColors = getSkaterColor(skStyle.color);
    // ── Motion trail (drawn before skater so rider sits on top) ──
    if (Array.isArray(state.trail) && state.trail.length > 0) {
      var hpTrailColor = (skStyle && skStyle.color) || 'amber';
      var hpTrailRGB = hpTrailColor === 'rose' ? '252,165,165'
                     : hpTrailColor === 'sky' ? '125,211,252'
                     : hpTrailColor === 'emerald' ? '110,231,183'
                     : '251,191,36';
      for (var hti = 0; hti < state.trail.length; hti++) {
        var htp = state.trail[hti];
        var htAlpha = (1 - htp.age) * (1 - htp.age) * 0.6;
        var htRad = 2 + (1 - htp.age) * 4;
        ctx.fillStyle = 'rgba(' + hpTrailRGB + ',' + htAlpha.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(htp.x, htp.y, htRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ── Particles (dust on pump impact + lip takeoff + landing) ──
    if (Array.isArray(state.particles)) {
      for (var hpi = 0; hpi < state.particles.length; hpi++) {
        var hpp = state.particles[hpi];
        var hppAlpha = Math.max(0, 1 - hpp.age);
        ctx.fillStyle = hpp.color.replace('ALPHA', hppAlpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(hpp.x, hpp.y, hpp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ── Skater — drawn at state.skX, state.skY with rotation state.skRot ──
    var sx = state.skX != null ? state.skX : leftLipX;
    var sy = state.skY != null ? state.skY : lipY;
    var rot = state.skRot || 0;
    // Limb animation during airtime. flightPhase 0..1 (0 = takeoff,
    // 0.5 = peak, 1 = landing). Arms rise at peak; legs tuck before
    // landing. Subtle but adds expression to the spin.
    var hpFp = (typeof state.flightPhase === 'number') ? Math.max(0, Math.min(1, state.flightPhase)) : 0;
    var hpArmRise = (state.inFlight && hpFp < 0.5) ? Math.sin(hpFp * Math.PI) * 6 : 0;
    var hpLegTuck = (state.inFlight && hpFp > 0.6) ? (hpFp - 0.6) * 12 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot * Math.PI / 180);
    // Board with grip-tape texture
    if (state.inFlight) { ctx.shadowColor = skColors.body; ctx.shadowBlur = 14; }
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-18, 6, 36, 5);
    ctx.fillStyle = 'rgba(15,23,42,0.4)';
    for (var hpbi = -16; hpbi < 17; hpbi += 5) {
      ctx.fillRect(hpbi, 7, 1, 3);
    }
    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-12, 12, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 12, 2.5, 0, Math.PI * 2); ctx.fill();
    // Pads — render before body strokes so body lines layer on top
    if (skStyle.pads) {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-3, 2 - hpLegTuck * 0.4, 6, 4);
      ctx.fillRect(-12, -6 - hpArmRise, 4, 4);
      ctx.fillRect(8, -6 - hpArmRise, 4, 4);
    }
    // Body (stick figure) with limb animation
    ctx.strokeStyle = skColors.body;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Torso shorter when legs tuck
    ctx.moveTo(0, 6 - hpLegTuck * 0.4);
    ctx.lineTo(0, -14);
    // Arms rise during ascent, tuck near landing
    ctx.moveTo(-10, -4 - hpArmRise);
    ctx.lineTo(10, -4 - hpArmRise);
    ctx.stroke();
    // Head
    ctx.fillStyle = skColors.body;
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI * 2);
    ctx.fill();
    // Helmet
    if (skStyle.helmet) {
      ctx.fillStyle = skColors.accent;
      ctx.beginPath();
      ctx.ellipse(0, -21, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -19);
      ctx.lineTo(7, -19);
      ctx.stroke();
    }
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
    // Live energy bar — top-right area, only during air phase
    // when state.energyTotal is set. Skipped when toggle is off.
    if (state.showEnergyBar !== false && state.energyTotal > 0) {
      var ebW = 220, ebH = 14;
      var ebX = W - ebW - 10, ebY = 14;
      drawEnergyBar(ctx, ebX, ebY, ebW, ebH, state.energyKE || 0, state.energyPE || 0, state.energyThermal || 0, state.energyTotal);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // CANVAS RENDER — GAP JUMP
  // Draws side-view: ramp on left, gap, landing platform on right.
  // Animates the skater along the parabolic arc.
  // ──────────────────────────────────────────────────────────────────
  function drawGapJump(canvas, state) {
    if (!canvas) return;
    // PL7 HiDPI: ensure crisp rendering on retina displays. Idempotent.
    if (window.StemLab && window.StemLab.setupHiDPI) {
      window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
    }
    var ctx = canvas.getContext('2d');
    if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
    var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
    // ── Sky: dusk gradient (deep indigo → magenta → warm orange near
    // horizon). Brightness modulated by the skater's air height so the
    // sky subtly brightens at peak altitude — adds atmosphere without
    // breaking the physics readability. ───────────────────────────
    var airBoost = Math.min(1, ((state.airHeightFt || 0) / 25));  // 0..1
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, airBoost > 0.4 ? '#3b1d6f' : '#2a1659');     // deep indigo top
    grad.addColorStop(0.45, '#5b1d8a');                                // magenta middle
    grad.addColorStop(0.72, airBoost > 0.4 ? '#c2410c' : '#9a3412');   // warm orange near horizon
    grad.addColorStop(0.78, '#1e293b');                                // ground transition
    grad.addColorStop(1, '#0f172a');                                   // dark base
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // ── Stars: deterministic placement seeded by canvas dims so they
    // don't twinkle every frame. Only render in the upper sky band. ──
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    var seed = (W * 13 + H * 17) % 1000;
    for (var si = 0; si < 18; si++) {
      var sxr = ((seed + si * 73) % 1000) / 1000 * W;
      var syr = ((seed + si * 41) % 1000) / 1000 * (H * 0.4);
      var srad = 0.6 + ((seed + si * 19) % 100) / 100 * 1.2;
      ctx.beginPath();
      ctx.arc(sxr, syr, srad, 0, Math.PI * 2);
      ctx.fill();
    }
    // ── Distant silhouettes: procedural mountain/city skyline at the
    // horizon line. Adds depth + sense of place. Drawn before ground. ──
    var horizonY = H * 0.66;
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 20);
    var mtnSeed = (W * 7) % 1000;
    for (var mx = 0; mx <= W; mx += 18) {
      var jag = ((mtnSeed + mx * 29) % 100) / 100;
      ctx.lineTo(mx, horizonY - jag * 28);
    }
    ctx.lineTo(W, horizonY + 20);
    ctx.closePath();
    ctx.fill();
    // City silhouette layer in front of mountains (~70% as tall)
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 20);
    for (var cx = 0; cx <= W; cx += 12) {
      var citySeed = ((mtnSeed + cx * 53) % 100) / 100;
      ctx.lineTo(cx, horizonY - citySeed * 14 + 6);
      ctx.lineTo(cx + 6, horizonY - citySeed * 14 + 6);
    }
    ctx.lineTo(W, horizonY + 20);
    ctx.closePath();
    ctx.fill();
    // ── Ground with horizontal stripe texture for spatial depth ──
    var groundY = H * 0.78;
    var groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
    groundGrad.addColorStop(0, '#3a4554');
    groundGrad.addColorStop(1, '#1e2533');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = 'rgba(15,23,42,0.35)';
    ctx.lineWidth = 1;
    for (var gy = groundY + 8; gy < H; gy += 12) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
    // ── Ramp: depth gradient + cast shadow + rim light ──
    var rampX = W * 0.18;
    var rampTopY = H * 0.55;
    var rampBaseY = groundY;
    // Cast shadow on the ground beneath the ramp lip
    var shadowGrad = ctx.createRadialGradient(rampX - 8, rampBaseY + 4, 4, rampX - 8, rampBaseY + 4, 50);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(rampX - 60, rampBaseY, 80, 30);
    // Ramp body with vertical gradient (lighter top edge, darker base)
    var rampGrad = ctx.createLinearGradient(0, rampTopY, 0, rampBaseY);
    rampGrad.addColorStop(0, '#64748b');
    rampGrad.addColorStop(1, '#334155');
    ctx.fillStyle = rampGrad;
    ctx.beginPath();
    ctx.moveTo(0, rampBaseY);
    ctx.lineTo(rampX - 30, rampBaseY);
    ctx.lineTo(rampX, rampTopY);
    ctx.lineTo(0, rampTopY);
    ctx.closePath();
    ctx.fill();
    // Rim highlight on the top edge of the ramp
    ctx.strokeStyle = 'rgba(251,191,36,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, rampTopY);
    ctx.lineTo(rampX, rampTopY);
    ctx.stroke();
    // Concrete texture stripes on the ramp face
    ctx.strokeStyle = 'rgba(15,23,42,0.22)';
    ctx.lineWidth = 1;
    for (var rs = rampTopY + 6; rs < rampBaseY; rs += 8) {
      var rsX = (rampX - 30) + ((rs - rampTopY) / (rampBaseY - rampTopY)) * 30;
      ctx.beginPath();
      ctx.moveTo(0, rs);
      ctx.lineTo(rsX, rs);
      ctx.stroke();
    }
    // Gap label
    var gapStartX = rampX;
    var pxPerFt = (W * 0.6) / 25;  // 25 ft visible
    var gapWidthPx = (state.gapFt || 12) * pxPerFt;
    var gapEndX = gapStartX + gapWidthPx;
    // ── Landing platform: depth gradient + cast shadow + rim light ──
    var landShadowGrad = ctx.createRadialGradient(gapEndX + 12, rampTopY + 18, 4, gapEndX + 12, rampTopY + 18, 50);
    landShadowGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    landShadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = landShadowGrad;
    ctx.fillRect(gapEndX, rampTopY + 14, 80, 36);
    var landGrad = ctx.createLinearGradient(0, rampTopY + 14, 0, H);
    landGrad.addColorStop(0, '#64748b');
    landGrad.addColorStop(1, '#334155');
    ctx.fillStyle = landGrad;
    ctx.fillRect(gapEndX, rampTopY + 14, W - gapEndX, H - rampTopY - 14);
    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gapEndX, rampTopY + 14);
    ctx.lineTo(W, rampTopY + 14);
    ctx.stroke();
    // Gap ground (visible cliff face beneath the gap)
    var cliffGrad = ctx.createLinearGradient(0, rampTopY, 0, groundY);
    cliffGrad.addColorStop(0, '#1e293b');
    cliffGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = cliffGrad;
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
    // ── Ghost trajectory (best run) ───────────────────────────
    // Faded purple parabola of the highest-scoring landed run on
    // this mode. Uses the same projectile-motion formula as the
    // sim. Drawn before the active skater.
    if (state.ghost && state.ghost.vM != null) {
      var gh = state.ghost;
      var gx0 = rampX, gy0 = rampTopY;
      var gPxPerM = pxPerFt * M2FT;
      var gG = gh.gravity || G;
      ctx.save();
      ctx.strokeStyle = 'rgba(167,139,250,0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      var apexX = gx0, apexY = gy0;
      var apexLow = gy0;
      for (var gt = 0; gt <= gh.hangTime; gt += 0.04) {
        var gxx = gx0 + (gh.vM * Math.cos(gh.theta) * gt) * gPxPerM;
        var gyy = gy0 - (gh.vM * Math.sin(gh.theta) * gt - 0.5 * gG * gt * gt) * gPxPerM;
        if (gt === 0) ctx.moveTo(gxx, gyy); else ctx.lineTo(gxx, gyy);
        if (gyy < apexLow) { apexLow = gyy; apexX = gxx; apexY = gyy; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Apex marker
      ctx.fillStyle = 'rgba(167,139,250,0.75)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('👻', apexX - 8, apexY - 10);
      ctx.fillStyle = 'rgba(196,181,253,0.85)';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('best ' + gh.rangeFt.toFixed(1) + 'ft', apexX + 12, apexY - 8);
      ctx.restore();
    }
    // ── Motion trail: fading circles along the rider's recent path ──
    // Drawn before the skater so the rider sits on top. state.trail is
    // a small array of {x, y, age} populated by animateGapJump.
    if (Array.isArray(state.trail) && state.trail.length > 0) {
      var trailColor = (skStyleG && skStyleG.color) || 'amber';
      var trailRGB = trailColor === 'rose' ? '252,165,165'
                   : trailColor === 'sky' ? '125,211,252'
                   : trailColor === 'emerald' ? '110,231,183'
                   : '251,191,36';
      for (var ti = 0; ti < state.trail.length; ti++) {
        var tp = state.trail[ti];
        var tAlpha = (1 - tp.age) * (1 - tp.age) * 0.6;
        var tRad = 2 + (1 - tp.age) * 4;
        ctx.fillStyle = 'rgba(' + trailRGB + ',' + tAlpha.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, tRad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ── Particles: dust on takeoff, sparks on landing. Layered before
    // the skater so the rider sits on top of any clouds. ──
    if (Array.isArray(state.particles)) {
      for (var pi = 0; pi < state.particles.length; pi++) {
        var pp = state.particles[pi];
        var pAlpha = Math.max(0, 1 - pp.age);
        ctx.fillStyle = pp.color.replace('ALPHA', pAlpha.toFixed(2));
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, pp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // ── Skater current position ──
    var sx = state.skX != null ? state.skX : rampX;
    var sy = state.skY != null ? state.skY : rampTopY;
    var rot = state.skRot || 0;
    var skStyleG = state.skater || { color: 'amber', helmet: false, pads: false };
    var skColorsG = getSkaterColor(skStyleG.color);
    // ── Limb animation: during airtime, bend arms based on rotation
    // phase. flightPhase ∈ [0, 1] (0 = takeoff, 0.5 = peak, 1 = landing).
    // Arms rise at peak, tuck before landing. Subtle but adds life. ──
    var fp = (typeof state.flightPhase === 'number') ? Math.max(0, Math.min(1, state.flightPhase)) : 0;
    var armRise = (state.inFlight && fp < 0.5) ? Math.sin(fp * Math.PI) * 6 : 0;
    var legTuck = (state.inFlight && fp > 0.6) ? (fp - 0.6) * 12 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot * Math.PI / 180);
    // Board with grip-tape detail (subtle dotted texture)
    if (state.inFlight) { ctx.shadowColor = skColorsG.body; ctx.shadowBlur = 14; }
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-14, 4, 28, 4);
    ctx.fillStyle = 'rgba(15,23,42,0.4)';
    for (var bi = -12; bi < 13; bi += 4) {
      ctx.fillRect(bi, 5, 1, 2);
    }
    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-9, 9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 9, 2, 0, Math.PI * 2); ctx.fill();
    // Pads (knees + elbows) — drawn before strokes
    if (skStyleG.pads) {
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-2.5, 1 - legTuck, 5, 3.5);
      ctx.fillRect(-10, -4 - armRise, 3.5, 3.5);
      ctx.fillRect(6.5, -4 - armRise, 3.5, 3.5);
    }
    // Body strokes — torso + arms with limb animation
    ctx.strokeStyle = skColorsG.body;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Torso: shorter when legs tuck
    ctx.moveTo(0, 4 - legTuck * 0.4);
    ctx.lineTo(0, -10);
    // Arms: rise during ascent, tuck near landing
    ctx.moveTo(-8, -2 - armRise);
    ctx.lineTo(8, -2 - armRise);
    ctx.stroke();
    // Head
    ctx.fillStyle = skColorsG.body;
    ctx.beginPath(); ctx.arc(0, -16, 5, 0, Math.PI * 2); ctx.fill();
    if (skStyleG.helmet) {
      ctx.fillStyle = skColorsG.accent;
      ctx.beginPath();
      ctx.ellipse(0, -17, 6.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Helmet stripe
      ctx.strokeStyle = 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -15);
      ctx.lineTo(6, -15);
      ctx.stroke();
    }
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
    // Live energy bar — bottom-center area for gap (top-right is
    // taken by the wind indicator). Renders during flight phase
    // when state.energyTotal is set.
    if (state.showEnergyBar !== false && state.energyTotal > 0) {
      var ebW2 = 220, ebH2 = 14;
      var ebX2 = (W - ebW2) / 2, ebY2 = H - 30;
      drawEnergyBar(ctx, ebX2, ebY2, ebW2, ebH2, state.energyKE || 0, state.energyPE || 0, state.energyThermal || 0, state.energyTotal);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ANIMATION HELPERS — Halfpipe + Gap Jump have different parametric
  // motion. Both use rAF and write into the active canvas.
  // ──────────────────────────────────────────────────────────────────
  function animateHalfpipe(canvas, sim, opts) {
    if (!canvas) return;
    // PL7 HiDPI: ensure setup before reading dims (drawHalfpipe also
    // calls setupHiDPI, but the animator computes layout coords like
    // midX, floorY before any draw call). Use logical dims so layout
    // matches what drawHalfpipe will render in CSS px.
    if (window.StemLab && window.StemLab.setupHiDPI) {
      window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
    }
    var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
    var midX = W / 2;
    var floorY = H * 0.86;
    var lipY = H * 0.30;
    var lipHalfW = W * 0.36;
    var leftLipX = midX - lipHalfW;
    var rightLipX = midX + lipHalfW;
    var pxPerM = (floorY - lipY) / 4.0;  // fixed scale
    // Energy ledger pre-compute — launch input energy splits into
    // useful mechanical energy (KE+PE) and thermal energy from losses.
    // E_input = ½ m v_takeoff². Used by drawHalfpipe to render the
    // segmented bar.
    var totalMass = (sim.vehicle && sim.vehicle.mass ? sim.vehicle.mass : 4.0) + RIDER_KG;
    var energyTotal = sim.energyInputJ;
    var energyMechanical = sim.mechanicalJ;
    var energyThermal = sim.thermalJ;
    var energyG = sim.gravity || G;
    var showEnergy = !opts || opts.showEnergyBar !== false;
    var skaterStyle = (opts && opts.skater) || { color: 'amber', helmet: false, pads: false };
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
    var ghost = opts && opts.ghost;
    var raf = 0;
    // Visual state: trail + particles, persistent across rAF frames.
    var trailHp = [];
    var particlesHp = [];
    var spawnedTakeoffHp = false;
    var spawnedLandingHp = false;
    var lastPumpFired = -1;
    if (skPrefersReducedMotion()) {
      drawHalfpipe(canvas, {
        skX: rightLipX + 6,
        skY: lipY + (sim.landed ? 8 : 26),
        skRot: sim.landed ? 0 : 80,
        speedMph: 0,
        airHeightFt: 0,
        label: sim.landed ? 'Landed: ' + sim.trick.label : 'Bail: ' + sim.trick.label,
        ghost: ghost,
        showEnergyBar: false,
        skater: skaterStyle
      });
      skAnnounce(
        'Reduced motion result. ' +
        (sim.landed ? 'Landed ' : 'Bailed ') + sim.trick.label + '. ' +
        'Air height ' + (sim.hAir * M2FT).toFixed(1) + ' feet. Air time ' + sim.airTime.toFixed(2) + ' seconds.'
      );
      var reducedTimerHp = setTimeout(function() { if (doneCb) doneCb(); }, 0);
      return function cancelReducedHalfpipe() { clearTimeout(reducedTimerHp); };
    }
    function emitParticlesHp(px, py, count, kind) {
      for (var pi = 0; pi < count; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 0.6 + Math.random() * 1.6;
        var vx = kind === 'pump' ? (Math.random() - 0.5) * 1.4 : Math.cos(ang) * spd;
        var vy = kind === 'pump' ? -0.8 - Math.random() * 0.6
                : kind === 'takeoff' ? -0.4 - Math.random() * 0.8
                : Math.sin(ang) * spd - 0.6;
        particlesHp.push({
          x: px, y: py, vx: vx, vy: vy,
          r: 1.5 + Math.random() * 2.5,
          age: 0,
          maxAge: 0.5 + Math.random() * 0.4,
          color: kind === 'landing' ? 'rgba(251,191,36,ALPHA)' : 'rgba(180,180,180,ALPHA)'
        });
      }
    }
    function step() {
      if (!canvas || !canvas.isConnected) return; // stop rescheduling if the canvas detached (belt-and-suspenders vs a missed cleanup path)
      var state = { gapFt: 0, ghost: ghost, showEnergyBar: showEnergy, skater: skaterStyle };
      if (phase === 'descend') {
        // Drop in: arc from left lip to floor center. Compressed 0.45→0.2 for snappier playback.
        var p = Math.min(1, t / 0.2);
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
          // Compressed 0.4→0.2 per pump for snappier playback (6 pumps = 1.2s instead of 2.4s).
          if (t > 0.2) {
            pumpsLeft--; sfxPump(); t = 0;
            // Emit a small dust puff at the pump moment for visual feedback
            if (lastPumpFired !== pumpsLeft) {
              emitParticlesHp(midX, floorY - 4, 6, 'pump');
              lastPumpFired = pumpsLeft;
            }
          }
        } else {
          phase = 'ascend'; t = 0;
        }
      } else if (phase === 'ascend') {
        // Up the right wall to launch. Compressed 0.5→0.25 for snappier playback.
        var p = Math.min(1, t / 0.25);
        var arc = Math.sin(p * Math.PI / 2);
        state.skX = midX + arc * lipHalfW;
        state.skY = floorY - 16 - arc * (floorY - lipY - 16);
        state.skRot = -arc * 90;
        state.label = 'Pop!';
        state.speedMph = sim.vTakeoff * MPS2MPH * (1 - arc * 0.2);
        state.airHeightFt = 0;
        if (p >= 1) {
          phase = 'air'; t = 0; sfxPop();
          if (!spawnedTakeoffHp) {
            emitParticlesHp(rightLipX + 6, lipY + 2, 12, 'takeoff');
            spawnedTakeoffHp = true;
          }
        }
      } else if (phase === 'air') {
        // Project upward and back. Parabolic.
        var airT = t;
        if (airT > sim.airTime) {
          phase = 'land'; t = 0;
          if (sim.landed) { sfxLandClean(); skAnnounce('Landed! ' + sim.trick.label); }
          else { sfxBail(); skAnnounce('Bail. Not enough air for the ' + sim.trick.label); }
          if (!spawnedLandingHp) {
            emitParticlesHp(rightLipX + 6, lipY + (sim.landed ? 8 : 26), 16, 'landing');
            spawnedLandingHp = true;
          }
          // Fix: schedule next frame so the 'land' branch runs and doneCb fires.
          // Without this, the rAF loop dies and the spinner sticks (same bug
          // as the Gap Jump animation had before SK1).
          raf = requestAnimationFrame(step);
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
        state.inFlight = true;
        state.flightPhase = p;
        // Rotation: linear with air time, capped at trick.rotation
        var totalRot = Math.min(sim.trick.rotation, sim.rotationCompleted * (airT / sim.airTime));
        state.skRot = sim.trick.axis === 'body' ? -totalRot : -totalRot;
        state.label = sim.trick.emoji + ' ' + sim.trick.label;
        state.speedMph = sim.vTakeoff * MPS2MPH;
        state.airHeightFt = h * M2FT;
        // During air: PE = m·g·h and KE = E_mechanical − PE; heat remains constant.
        var pe = totalMass * energyG * h;
        state.energyKE = Math.max(0, energyMechanical - pe);
        state.energyPE = pe;
        state.energyThermal = energyThermal;
        state.energyTotal = energyTotal;
        // Trail capture during airtime
        if (Math.floor(t / dt) % 2 === 0) {
          trailHp.push({ x: state.skX, y: state.skY, age: 0 });
          if (trailHp.length > 14) trailHp.shift();
        }
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
      // Age trail + particles each frame
      for (var trI = 0; trI < trailHp.length; trI++) {
        trailHp[trI].age = Math.min(1, trailHp[trI].age + 0.06);
      }
      var aliveHp = [];
      for (var pI = 0; pI < particlesHp.length; pI++) {
        var pr = particlesHp[pI];
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.vy += 0.12;
        pr.age += (1 / 60) / pr.maxAge;
        if (pr.age < 1) aliveHp.push(pr);
      }
      particlesHp = aliveHp;
      state.trail = trailHp;
      state.particles = particlesHp;
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
    // PL7 HiDPI: same as animateHalfpipe.
    if (window.StemLab && window.StemLab.setupHiDPI) {
      window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
    }
    var ghost = opts && opts.ghost;
    var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;
    // Energy budget: total = ½ m v_launch². For projectile motion,
    // mechanical energy is conserved if we ignore the wind-induced
    // horizontal acceleration term (≪ 5% energy contribution at
    // typical winds), so KE+PE ≈ E_total throughout the flight.
    var totalMassG = (sim.vehicle && sim.vehicle.mass ? sim.vehicle.mass : 4.0) + RIDER_KG;
    var energyTotalG = 0.5 * totalMassG * sim.vM * sim.vM;
    var energyGravity = sim.gravity || G;
    var showEnergyG = !opts || opts.showEnergyBar !== false;
    var skaterStyleG = (opts && opts.skater) || { color: 'amber', helmet: false, pads: false };
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
    // Visual state: trail of recent positions during flight + particle
    // pool for takeoff/landing dust. Kept in closure so they persist
    // across rAF frames.
    var trail = [];
    var particles = [];
    var spawnedTakeoffDust = false;
    var spawnedLandingDust = false;
    if (skPrefersReducedMotion()) {
      drawGapJump(canvas, {
        skX: rampX + sim.rangeM * pxPerM,
        skY: rampTopY + (sim.landed ? 14 : 50),
        skRot: sim.landed ? 0 : 65,
        speedMph: sim.v_mph,
        angleDeg: sim.thetaDeg,
        gapFt: sim.gapFt,
        label: sim.landed ? 'Cleared' : (sim.clearance < 0 ? 'Short' : 'Overshot'),
        wind: sim.wind,
        ghost: ghost,
        showEnergyBar: false,
        skater: skaterStyleG
      });
      skAnnounce(
        'Reduced motion result. ' +
        (sim.landed ? 'Cleared the gap. ' : (sim.clearance < 0 ? 'Came up short. ' : 'Overshot the landing. ')) +
        'Range ' + sim.rangeFt.toFixed(1) + ' feet. Peak height ' + sim.peakHFt.toFixed(1) + ' feet.'
      );
      var reducedTimerGap = setTimeout(function() { if (doneCb) doneCb(); }, 0);
      return function cancelReducedGap() { clearTimeout(reducedTimerGap); };
    }
    function emitParticles(px, py, count, kind) {
      for (var pi = 0; pi < count; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 0.6 + Math.random() * 1.6;
        // Takeoff: dust kicks horizontally + slight up. Landing: radial spray.
        var vx = kind === 'takeoff' ? -Math.abs(Math.cos(ang)) * spd - 0.5 : Math.cos(ang) * spd;
        var vy = kind === 'takeoff' ? -0.4 - Math.random() * 0.8 : Math.sin(ang) * spd - 0.6;
        particles.push({
          x: px, y: py, vx: vx, vy: vy,
          r: 1.5 + Math.random() * 2.5,
          age: 0,
          maxAge: 0.6 + Math.random() * 0.4,
          color: kind === 'landing'
            ? 'rgba(251,191,36,ALPHA)'  // golden landing spark
            : 'rgba(180,180,180,ALPHA)' // gray takeoff dust
        });
      }
    }
    function step() {
      if (!canvas || !canvas.isConnected) return; // stop rescheduling if the canvas detached (belt-and-suspenders vs a missed cleanup path)
      var state = { gapFt: sim.gapFt, speedMph: sim.v_mph, angleDeg: sim.thetaDeg, label: '', wind: sim.wind, ghost: ghost, showEnergyBar: showEnergyG, skater: skaterStyleG };
      if (phase === 'roll') {
        // Roll up the ramp (roll phase isn't slowed — only flight is).
        // Compressed 0.6→0.3 for snappier takeoff. Flight phase still
        // plays at full physical hangtime so the math reads cleanly.
        var p = Math.min(1, t / 0.3);
        state.skX = -10 + p * (rampX + 10);
        state.skY = (H * 0.78) - p * ((H * 0.78) - rampTopY);
        state.skRot = -p * sim.thetaDeg * 0.4;
        state.label = 'Rolling up...';
        if (p >= 1) {
          phase = 'flight'; t = 0; sfxPop();
          // Spawn takeoff dust the moment we leave the ramp
          if (!spawnedTakeoffDust) {
            emitParticles(rampX, rampTopY + 6, 14, 'takeoff');
            spawnedTakeoffDust = true;
          }
        }
      } else if (phase === 'flight') {
        if (t > sim.hangTime) {
          phase = 'land'; t = 0;
          if (sim.landed) { sfxLandClean(); skAnnounce('Cleared the ' + sim.gapFt + ' foot gap!'); }
          else { sfxBail(); skAnnounce(sim.clearance < 0 ? 'Came up short. Need more speed or a steeper angle.' : 'Overshot the landing!'); }
          // Spawn landing dust at the impact point
          if (!spawnedLandingDust) {
            var landX = rampX + sim.rangeM * pxPerM;
            var landY = rampTopY + (sim.landed ? 14 : 50);
            emitParticles(landX, landY, 18, 'landing');
            spawnedLandingDust = true;
          }
          // Fix: schedule next frame so the 'land' branch runs and doneCb fires.
          // Without this, the rAF loop dies here and "Sending it..." sticks forever.
          raf = requestAnimationFrame(step);
          return;
        }
        var x = sim.vM * Math.cos(sim.theta) * t + 0.5 * aWind * t * t;
        var y = sim.vM * Math.sin(sim.theta) * t - 0.5 * g * t * t;
        state.skX = rampX + x * pxPerM;
        state.skY = rampTopY - y * pxPerM;
        state.skRot = -sim.thetaDeg + (t / sim.hangTime) * sim.thetaDeg * 1.7;
        state.label = '🛹 ' + (state.skY > rampTopY - sim.peakHM * pxPerM * 0.95 ? 'rising' : 'falling');
        state.airHeightFt = y * M2FT;
        state.inFlight = true;
        state.flightPhase = t / sim.hangTime;
        // Energy budget during flight: y = current height above launch
        // (in meters). PE = m·g·y, KE = E_total − PE. Conservation
        // (modulo the small wind term) makes this clean to render.
        var peG = totalMassG * energyGravity * Math.max(0, y);
        state.energyKE = Math.max(0, energyTotalG - peG);
        state.energyPE = peG;
        state.energyThermal = 0;
        state.energyTotal = energyTotalG;
        // Trail: capture every 2 frames during flight, fade older points
        if (Math.floor(t / dt) % 2 === 0) {
          trail.push({ x: state.skX, y: state.skY, age: 0 });
          if (trail.length > 14) trail.shift();
        }
      } else if (phase === 'land') {
        // hold
        state.skX = rampX + sim.rangeM * pxPerM;
        state.skY = rampTopY + (sim.landed ? 14 : 50);
        state.skRot = sim.landed ? 0 : 65;
        state.label = sim.landed ? '✅ Cleared!' : '❌ ' + (sim.clearance < 0 ? 'Short' : 'Overshot');
        if (t > 1.0) { if (doneCb) doneCb(); return; }
      }
      // Age trail + particles each frame
      for (var trI = 0; trI < trail.length; trI++) {
        trail[trI].age = Math.min(1, trail[trI].age + 0.06);
      }
      // Update particles: position + age + remove dead
      var alive = [];
      for (var pI = 0; pI < particles.length; pI++) {
        var pr = particles[pI];
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.vy += 0.12;  // gravity on dust
        pr.age += (1 / 60) / pr.maxAge;
        if (pr.age < 1) alive.push(pr);
      }
      particles = alive;
      state.trail = trail;
      state.particles = particles;
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
  window.__alloSkatePhysicsPure = {
    simHalfpipe: simHalfpipe,
    simGapJump: simGapJump,
    getSurface: getSurface,
    constants: { gravity: G, metersToFeet: M2FT, mpsToMph: MPS2MPH, riderKg: RIDER_KG }
  };
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
      },
      { id: 'sk_invented', label: 'Invent and land a custom trick', icon: '🧪',
        check: function(d) {
          var ct = d.customTricks || [];
          if (ct.length === 0) return false;
          var u = d.tricksUsed || {};
          return ct.some(function(t) { return (u[t.id] || 0) >= 1; });
        },
        progress: function(d) {
          var ct = d.customTricks || [];
          if (ct.length === 0) return 'invent first';
          var u = d.tricksUsed || {};
          var landed = ct.some(function(t) { return (u[t.id] || 0) >= 1; });
          return landed ? '✓' : 'land it';
        }
      },
      { id: 'sk_beat_best', label: 'Beat your own ghost 3 times', icon: '👻',
        check: function(d) { return (d.ghostBeatCount || 0) >= 3; },
        progress: function(d) { return (d.ghostBeatCount || 0) + '/3 ghosts beaten'; }
      },
      { id: 'sk_session_done', label: 'Complete a park session', icon: '🎯',
        check: function(d) { return ((d.session && d.session.history) || []).length >= 1; },
        progress: function(d) {
          var n = ((d.session && d.session.history) || []).length;
          return n >= 1 ? '✓ ' + n + ' session' + (n === 1 ? '' : 's') : 'pending';
        }
      },
      { id: 'sk_geared_up', label: 'Gear up your skater (helmet + pads)', icon: '⛑️',
        check: function(d) { return !!(d.skater && d.skater.helmet && d.skater.pads); },
        progress: function(d) {
          var s = d.skater || {};
          if (s.helmet && s.pads) return '✓';
          if (s.helmet) return 'helmet ✓ · pads pending';
          if (s.pads) return 'pads ✓ · helmet pending';
          return 'gear up';
        }
      },
      { id: 'sk_daily_3', label: 'Complete 3 daily challenges', icon: '🎯',
        check: function(d) { return Object.keys(d.dailyDone || {}).length >= 3; },
        progress: function(d) { return Object.keys(d.dailyDone || {}).length + '/3 days'; }
      }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      // Seed defaults, but DO NOT early-return a Loading screen: this render calls
      // hooks (useRef/useState/useEffect) below, so a conditional early-return changes
      // the hook count between the empty and seeded renders and throws "Rendered more
      // hooks than during the previous render" on that transition (the bucket is not
      // persisted, so it is empty on every reload). Seed and fall through; the body
      // reads state only via the local `d`. (Rules-of-Hooks fix, 2026-06-20.)
      var SKATELAB_DEFAULTS = {
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
            // Best-run ghost — keyed by mode. Stores the sim object
            // from the highest-scoring landed attempt so the
            // animator can render it as a faded trajectory behind
            // every subsequent run. Students see their peak as a
            // target. Cleared on stat reset (those personal bests
            // are gone, the ghost should follow).
            bestSimGhost: { halfpipe: null, gap: null },
            showGhost: true,
            // Live energy bar — renders KE / PE conversion during the
            // animation. Pure pedagogy: students see kinetic ↔
            // potential energy trade in real time as the skater
            // climbs, peaks, and falls. Default on so first-time
            // students see the math; can toggle off for cleaner demos.
            showEnergyBar: true,
            // Park Session — string N attempts together as a single
            // arc with aggregate stats. Mirrors the real skate-
            // culture concept of "having a session." active=true
            // routes each run into session.attempts. summaryOpen
            // gates the post-session modal. history is the saved
            // session list across resets.
            session: { active: false, target: 5, attempts: [], summaryOpen: false, startPromptOpen: false, history: [] },
            // Skater style — color + protective gear toggles. Pure
            // engagement layer that ties directly to v15 gear
            // science: a kid who just read why helmets work can put
            // one on their skater. Body color tints the stick-figure
            // strokes; helmet / pads render as small overlays in the
            // canvas. Persists across stat resets.
            skater: { color: 'amber', helmet: false, pads: false },
            // Daily challenge — date-seeded scenario pick. Each day
            // every student gets the same featured challenge.
            // dailyDone is keyed by YYYY-MM-DD; landing today's
            // featured scenario flips today's flag to true. Persists
            // across stat resets so the streak survives.
            dailyDone: {},
            // First-time tour — 5-step guided onboarding that
            // auto-shows on first mount. seen=true after either
            // completion or explicit skip; re-openable from a tour
            // button in the toggle row. Step is 0-indexed.
            tour: { open: false, step: 0, seen: false },
            // Confirm-reset state — false normally, true while the
            // student/teacher is being asked to confirm a reset.
            resetConfirmOpen: false,
            confirmAction: null,
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
          };
      if (!labToolData || !labToolData.skatelab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { skatelab: SKATELAB_DEFAULTS });
        });
      }
      var d = labToolData.skatelab || SKATELAB_DEFAULTS;
      function upd(k, v) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev);
          next.skatelab = Object.assign({}, prev.skatelab, typeof k === 'object' ? k : { [k]: v });
          return next;
        });
      }

      var canvasRef = React.useRef(null);
      var cancelAnimRef = React.useRef(null);

      // ── Scenario intro card ──────────────────────────────────────
      // SK3: when a famous-trick chip is clicked, show a brief context
      // card with the historical setup + teach text + discussion
      // questions, plus buttons to run-it-now or explore-manually.
      // null = no card open.
      var scenarioIntroState = React.useState(null);
      var scenarioIntro = scenarioIntroState[0];
      var setScenarioIntro = scenarioIntroState[1];
      var dialogReturnFocusRef = React.useRef(null);
      var dialogWasOpenRef = React.useRef(false);
      var anyDialogOpen = !!(
        scenarioIntro ||
        (d.tour && d.tour.open) ||
        (d.session && (d.session.startPromptOpen || d.session.summaryOpen)) ||
        d.saveModalDraft ||
        d.confirmAction ||
        d.resetConfirmOpen
      );

      React.useEffect(function() {
        var timer = null;
        if (anyDialogOpen && !dialogWasOpenRef.current) {
          dialogReturnFocusRef.current = document.activeElement;
          timer = setTimeout(function() {
            var dialog = document.querySelector('.skatelab-shell [role="dialog"]');
            if (!dialog || dialog.contains(document.activeElement)) return;
            var target = dialog.querySelector('[autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
            if (target) target.focus();
            else {
              dialog.setAttribute('tabindex', '-1');
              dialog.focus();
            }
          }, 0);
        } else if (!anyDialogOpen && dialogWasOpenRef.current) {
          var opener = dialogReturnFocusRef.current;
          timer = setTimeout(function() {
            if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
          }, 0);
          dialogReturnFocusRef.current = null;
        }
        dialogWasOpenRef.current = anyDialogOpen;
        return function() { if (timer) clearTimeout(timer); };
      }, [anyDialogOpen]);

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

      // Modifier shortcut avoids a single-character-key conflict (WCAG 2.1.4).
      // Skip while typing so Alt+M remains available to browser/assistive workflows.
      React.useEffect(function() {
        var onKey = function(e) {
          if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'm' && e.key !== 'M')) return;
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          toggleMuteUI();
        };
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [muted]);

      // The tour opens only on request. Automatic modal focus changes can
      // interrupt reading and keyboard workflows on first visit.

      // Generate a fresh gap on each "New Gap" press
      function newGap() {
        var ft = 8 + Math.floor(Math.random() * 15); // 8-22 ft
        upd('gapFt', ft);
        skAnnounce('New gap: ' + ft + ' feet.');
      }

      function getCanvasSummary() {
        var veh = getVehicle(d.vehicle).label;
        var setup;
        if (d.mode === 'halfpipe') {
          setup = veh + ' on the ' + getSurface(d.surfaceId).label + ' surface with ' + d.pumps +
            ' pump' + (d.pumps === 1 ? '' : 's') + ', attempting ' + getTrick(d.trickId).label + '.';
        } else {
          setup = veh + ' approaching a ' + d.gapFt + ' foot gap at ' + d.speedMph +
            ' miles per hour and ' + d.angleDeg + ' degrees. Wind: ' + getWind(d.windId).label + '.';
        }
        if (!d.lastResult || d.lastResult.mode !== d.mode) return 'Current setup: ' + setup;
        if (d.mode === 'halfpipe') {
          return 'Current setup: ' + setup + ' Latest attempt: ' + (d.lastResult.landed ? 'landed' : 'bailed') +
            ', reaching ' + d.lastResult.hFt.toFixed(1) + ' feet above the lip and rotating ' +
            Math.round(d.lastResult.completed) + ' degrees.';
        }
        return 'Current setup: ' + setup + ' Latest attempt: ' + (d.lastResult.landed ? 'cleared the gap' : 'missed the landing') +
          ', traveling ' + d.lastResult.rangeFt.toFixed(1) + ' feet.';
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
      // ── Daily challenge picker ──────────────────────────────────
      // Date-seeded hash → deterministic pick from SCENARIOS so
      // every student in the class gets the same challenge today,
      // and the same one again exactly N days later (where N is the
      // length of the rotation). The hash uses the date string in
      // ISO YYYY-MM-DD form so timezone shifts at midnight are
      // local-friendly without going through UTC.
      function _todayKey() {
        var now = new Date();
        var y = now.getFullYear();
        var m = String(now.getMonth() + 1).padStart(2, '0');
        var dd = String(now.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + dd;
      }
      function _todayScenario() {
        var key = _todayKey();
        // Simple djb2-ish hash so the rotation is non-monotonic
        // (otherwise consecutive dates would advance by exactly 1
        // and feel predictable). Modulo SCENARIOS.length for the
        // index pick.
        var h = 5381;
        for (var i = 0; i < key.length; i++) {
          h = ((h << 5) + h) ^ key.charCodeAt(i);
        }
        var idx = Math.abs(h) % SCENARIOS.length;
        return SCENARIOS[idx];
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
      // ── Park Session helpers ────────────────────────────────────
      // startSession: clears the attempts buffer and arms the run
      // handlers to push each subsequent run's summary into it.
      // endSession: surfaces the summary modal AND saves the run to
      // history; called automatically when target reached, or
      // manually via "End early."
      function startSession(target) {
        var n = Math.max(3, Math.min(10, target || 5));
        upd({
          session: Object.assign({}, d.session || {}, {
            active: true, target: n, attempts: [],
            startPromptOpen: false, summaryOpen: false
          })
        });
        if (addToast) addToast('🎯 Session started. ' + n + ' attempts to glory.', 'success');
        skAnnounce('Session started. ' + n + ' attempts.');
      }
      function endSession(opts) {
        var s = d.session || {};
        var attempts = s.attempts || [];
        var manuallyEnded = opts && opts.manual;
        var summary = {
          startedAt: s.startedAt || Date.now(),
          target: s.target,
          attemptCount: attempts.length,
          attempts: attempts,
          manuallyEnded: !!manuallyEnded
        };
        var nextHistory = ((s.history || []).concat([summary])).slice(-10);  // keep last 10 sessions
        upd({
          session: { active: false, target: s.target, attempts: attempts, summaryOpen: true, startPromptOpen: false, history: nextHistory, lastSummary: summary }
        });
        if (addToast) addToast('🎯 Session complete: ' + attempts.filter(function(a) { return a.landed; }).length + '/' + attempts.length + ' lands.', 'success');
        skAnnounce('Session complete. Tap to view your summary.');
      }
      // Append the current attempt's summary to the session buffer.
      // Returns the bumps object to merge so the caller can add
      // session updates atomically with run-result updates.
      function _sessionBumps(bumps, simResult) {
        if (!d.session || !d.session.active) return;
        var attempt = {
          mode: simResult.mode,
          landed: !!simResult.landed,
          score: simResult.scoreBonused || simResult.score || 0,
          predicted: simResult.predicted,
          actual: simResult.actual,
          errPct: simResult.errPct,
          ts: Date.now()
        };
        if (simResult.mode === 'halfpipe') {
          attempt.label = simResult.trick;
          attempt.hFt = simResult.hFt;
        } else {
          attempt.label = simResult.gapFt + ' ft gap';
          attempt.rangeFt = simResult.rangeFt;
        }
        var nextAttempts = (d.session.attempts || []).concat([attempt]);
        bumps.session = Object.assign({}, d.session, { attempts: nextAttempts, startedAt: d.session.startedAt || Date.now() });
        // Auto-end when target reached. Push summary into history.
        if (nextAttempts.length >= (d.session.target || 5)) {
          var summary = {
            startedAt: d.session.startedAt || Date.now(),
            target: d.session.target,
            attemptCount: nextAttempts.length,
            attempts: nextAttempts,
            manuallyEnded: false
          };
          var nextHist = (((d.session.history) || []).concat([summary])).slice(-10);
          bumps.session = { active: false, target: d.session.target, attempts: nextAttempts, summaryOpen: true, startPromptOpen: false, history: nextHist, lastSummary: summary };
          if (addToast) {
            var lands = nextAttempts.filter(function(a) { return a.landed; }).length;
            addToast('🎯 Session done: ' + lands + '/' + nextAttempts.length + ' lands. Tap the badge for stats.', 'success');
          }
        }
      }
      function loadScenario(scenarioId) {
        if (d.running) {
          skAnnounce('Finish the current attempt before changing scenarios.');
          return;
        }
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
        // SK3: surface the scenario context card with teach + questions.
        // Only for built-in scenarios (custom user-saved ones don't have
        // teach/questions content). Skip if scenario has no teach text.
        if (sc.teach) {
          setScenarioIntro({
            id: sc.id,
            label: sc.label,
            icon: sc.icon || '🛹',
            mode: sc.mode,
            teach: sc.teach,
            questions: Array.isArray(sc.questions) ? sc.questions : [],
            isCustom: !!sc.isCustom
          });
        }
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
        var preservedHistory = (d.session && d.session.history) || [];
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
          bestSimGhost: { halfpipe: null, gap: null },
          ghostBeatCount: 0,
          lastResult: null, lastSim: null, activeScenarioId: null,
          resetConfirmOpen: false,
          customScenarios: preserved,
          customTricks: preservedTricks,
          session: { active: false, target: 5, attempts: [], summaryOpen: false, startPromptOpen: false, history: preservedHistory },
          skater: d.skater || { color: 'amber', helmet: false, pads: false },
          dailyDone: d.dailyDone || {},
          tour: { open: false, step: 0, seen: !!(d.tour && d.tour.seen) }
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

      // ── printGearChecklist: classroom take-home gear sheet ──────
      // Opens a popup window with a print-formatted checklist of all
      // 6 protective-gear items, each with a "why it matters"
      // one-liner + the citation stat. Bottom: signature line for
      // student + parent/guardian commitment. Mirrors the
      // printActivitySheet pattern (same CSS approach + print button
      // hidden on @media print).
      function printGearChecklist() {
        var win = window.open('', '_blank', 'width=720,height=900');
        if (!win) {
          if (addToast) addToast('Pop-ups blocked — allow them to print the gear checklist.', 'info');
          skAnnounce('Pop-up blocked. Allow pop-ups to open the gear checklist.');
          return;
        }
        var rows = GEAR.map(function(g) {
          return '' +
            '<div class="row">' +
              '<input type="checkbox" id="g_' + g.id + '"><label for="g_' + g.id + '">' +
                '<span class="ge">' + g.icon + '</span>' +
                '<b>' + escapeHtml(g.label) + '</b>' +
                '<span class="why">' + escapeHtml(g.does) + '</span>' +
                '<span class="stat">' + escapeHtml(g.stat) + '</span>' +
              '</label>' +
            '</div>';
        }).join('');
        var body = '' +
          '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<title>SkateLab — Real-World Gear Checklist</title>' +
          '<style>' +
            '*{box-sizing:border-box}' +
            'body{font-family:Georgia,serif;color:#1f2937;margin:0;padding:32px;background:#fff;line-height:1.5}' +
            'h1{font-size:22px;margin:0 0 4px;letter-spacing:0.02em}' +
            'h2{font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#15803d;margin:18px 0 6px}' +
            '.icon{font-size:36px;display:inline-block;margin-right:6px;vertical-align:middle}' +
            '.meta{font-size:12px;color:#6b7280;margin:0 0 14px}' +
            '.intro{background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:13px;margin:0 0 14px;color:#14532d}' +
            '.row{margin:10px 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;page-break-inside:avoid}' +
            '.row label{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;cursor:pointer;line-height:1.4}' +
            '.row input[type=checkbox]{transform:scale(1.4);margin-right:8px}' +
            '.row .ge{font-size:22px;display:inline-block;vertical-align:middle;line-height:1;}' +
            '.row b{font-size:14px;color:#0f172a;min-width:120px;display:inline-block}' +
            '.row .why{font-size:12px;color:#374151;flex:1 1 280px}' +
            '.row .stat{display:block;width:100%;font-size:11px;color:#15803d;font-family:Menlo,Consolas,monospace;margin-top:4px}' +
            '.commit{margin-top:24px;padding:16px;border:2px dashed #15803d;border-radius:10px;background:#f0fdf4}' +
            '.commit p{margin:0 0 12px;font-size:14px;color:#0f172a}' +
            '.sig{display:flex;gap:20px;margin-top:14px;font-size:12px;color:#374151}' +
            '.sig div{flex:1;border-bottom:1px solid #6b7280;padding-bottom:2px;min-height:30px}' +
            '.sig small{display:block;color:#6b7280;font-size:10px;margin-top:2px}' +
            '.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}' +
            '.print-btn{background:#15803d;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:14px;font-weight:700;cursor:pointer;margin:0 0 8px}' +
            '@media print{.print-btn{display:none}body{padding:24px}}' +
          '</style></head><body>' +
          '<button class="print-btn" onclick="window.print()">🖨️ Print</button>' +
          '<h1><span class="icon">🛡️</span>SkateLab — Real-World Gear Checklist</h1>' +
          '<p class="meta">Name: ____________________________&nbsp;&nbsp;&nbsp;&nbsp;Date: __________________</p>' +
          '<div class="intro"><b>Why this matters:</b> Skateboarding is the leading cause of pediatric extremity fractures. Every piece of gear below works because of physics you can derive yourself. Tick off the gear you own, circle what you still need.</div>' +
          '<h2>My Gear</h2>' +
          rows +
          '<div class="commit">' +
            '<p><b>I commit to wearing my gear when I skate.</b> The math in the simulator is the same in real life. The consequences aren\'t.</p>' +
            '<div class="sig">' +
              '<div>&nbsp;<small>Student signature + date</small></div>' +
              '<div>&nbsp;<small>Parent / guardian signature + date</small></div>' +
            '</div>' +
          '</div>' +
          '<div class="foot"><span>SkateLab — STEM Lab · AlloFlow</span><span>Sources: CDC, AAP, AAPD, SafeKids</span></div>' +
          '</body></html>';
        win.document.write(body);
        win.document.close();
        skAnnounce('Gear checklist opened. Use the print button or browser shortcut to send it to a printer.');
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
          upd({ coachLoading: false, coachResponse: { text: __alloT('stem.skatelab.coach_is_offline_try_again_in_a_moment', '(Coach is offline. Try again in a moment.)'), persona: persona.id, attemptId: d.attempts || 0 } });
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
              message: __alloT('stem.skatelab.maxed_out_on_pumps_but_still_bailing_t', 'Maxed out on pumps but still bailing. Try a smaller trick to learn how much air this setup actually gives you.'),
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
          // OR set angle to 45° if it is far off (the same-height maximum-range angle).
          if (d.speedMph < 28) {
            var nextSpeed = Math.min(28, (d.speedMph || 0) + 5);
            return {
              message: 'Came up short by ' + Math.abs(r.clearance).toFixed(1) + ' ft. Range scales with v² — speed has the biggest leverage in the projectile equation.',
              fixLabel: '+ 5 mph (try ' + nextSpeed + ')',
              fixBumps: { speedMph: nextSpeed }
            };
          }
          if (Math.abs(d.angleDeg - 45) > 5) {
            return {
              message: __alloT('stem.skatelab.at_max_speed_and_still_short_range_pea', 'At max speed and still short. For launch and landing at the same height with no drag, range peaks at 45°. Try 45°.'),
              fixLabel: 'Set angle to 45°',
              fixBumps: { angleDeg: 45 }
            };
          }
          // Last resort — shrink the gap.
          if (d.gapFt > 8) {
            return {
              message: __alloT('stem.skatelab.even_at_max_speed_and_ideal_angle_this', 'Even at max speed and ideal angle, this gap is out of reach. Smaller gap to feel the calibration first.'),
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
            message: __alloT('stem.skatelab.flying_past_the_landing_too_much_speed', 'Flying past the landing — too much speed. Trim it down and watch where the parabola peaks.'),
            fixLabel: '− 3 mph (try ' + slowSpeed + ')',
            fixBumps: { speedMph: slowSpeed }
          };
        }
        return null;
      }

      function _trickMastery(attempts, lands) {
        if ((lands || 0) >= 5) return { id: 'mastered', label: __alloT('stem.skatelab.mastered', 'Mastered'), icon: '👑', color: '#a855f7', bg: 'rgba(168,85,247,0.18)' };
        if ((lands || 0) >= 3) return { id: 'solid',    label: __alloT('stem.skatelab.solid', 'Solid'),    icon: '💪', color: '#22c55e', bg: 'rgba(34,197,94,0.18)' };
        if ((lands || 0) >= 1) return { id: 'landed',   label: __alloT('stem.skatelab.landed', 'Landed'),   icon: '🎯', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)' };
        if ((attempts || 0) >= 1) return { id: 'tried', label: __alloT('stem.skatelab.tried', 'Tried'),    icon: '🔓', color: 'var(--allo-stem-text, #cbd5e1)', bg: 'rgba(148,163,184,0.18)' };
        return { id: 'locked', label: __alloT('stem.skatelab.locked', 'Locked'), icon: '🔒', color: 'var(--allo-stem-text-soft, #64748b)', bg: 'rgba(71,85,105,0.18)' };
      }

      function _streakTier(n) {
        if (n >= 7) return { id: 'going_off', label: __alloT('stem.skatelab.going_off', 'Going Off!!'), icon: '🚀', mult: 2.5, color: '#fb7185', glow: 'rgba(251,113,133,0.45)' };
        if (n >= 5) return { id: 'on_fire',   label: __alloT('stem.skatelab.on_fire', 'On Fire!'),    icon: '🌶️', mult: 2.0, color: '#f97316', glow: 'rgba(249,115,22,0.45)' };
        if (n >= 3) return { id: 'hot_streak',label: __alloT('stem.skatelab.hot_streak', 'Hot Streak!'), icon: '🔥', mult: 1.5, color: '#fbbf24', glow: 'rgba(251,191,36,0.45)' };
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
        // SK4: canvas-null guard. If the canvas ref is null (e.g.,
        // mode just switched and the new canvas hasn't mounted yet),
        // skip the run rather than setting running:true with no
        // animation to clear it. Without this, the spinner sticks.
        if (!canvasRef.current) {
          if (addToast) addToast('Canvas not ready — try again in a moment.', 'info');
          return;
        }
        var sim = simHalfpipe({
          pumps: d.pumps, trickId: d.trickId,
          // Resolve custom tricks here so simHalfpipe doesn't need
          // to know about toolData.customTricks.
          trickInline: findAnyTrick(d.trickId),
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
        // SK4: safety timer — if onDone never fires within 12s (max
        // legitimate trick is ~6s), force-clear running. Defensive
        // against any rAF transition path I missed. Cleared in onDone.
        var halfpipeSafety = setTimeout(function() {
          upd({ running: false });
          if (addToast) addToast('Animation stalled — reset.', 'info');
        }, 12000);
        cancelAnimRef.current = animateHalfpipe(canvasRef.current, sim, {
          ghost: (d.showGhost !== false) && d.bestSimGhost ? d.bestSimGhost.halfpipe : null,
          showEnergyBar: d.showEnergyBar !== false,
          skater: d.skater,
          onDone: function() {
            clearTimeout(halfpipeSafety);
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
              effMinAir: sim.effMinAir,
              energyInputJ: sim.energyInputJ,
              mechanicalJ: sim.mechanicalJ,
              thermalJ: sim.thermalJ
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
              // Daily challenge — landing today's featured scenario
              // flips the date flag. Only fires once per day.
              if (d.activeScenarioId === _todayScenario().id) {
                var todayKey = _todayKey();
                if (!((d.dailyDone || {})[todayKey])) {
                  bumps.dailyDone = Object.assign({}, d.dailyDone || {}, { [todayKey]: true });
                  if (addToast) addToast('🎯 Daily challenge complete! Come back tomorrow.', 'success');
                  skAnnounce('Daily challenge complete.');
                }
              }
              // Best-run ghost — promote this sim if it beats the
              // current halfpipe ghost on bonused score. Ties don't
              // promote (a slight tie-breaker bias for the older run
              // keeps the ghost stable across edge cases).
              var prevGhost = (d.bestSimGhost && d.bestSimGhost.halfpipe) || null;
              // Stamp the *previous* ghost onto the result so the
              // delta row in the result panel compares to the prior
              // best, not the just-bumped one.
              if (prevGhost) {
                bumps.lastResult.prevGhostHFt = prevGhost.hAir * M2FT;
                bumps.lastResult.prevGhostScore = prevGhost.scoreBonused || prevGhost.score || 0;
              }
              if (!prevGhost || sk.totalScore > (prevGhost.scoreBonused || prevGhost.score || 0)) {
                bumps.lastResult.newBest = true;
                bumps.bestSimGhost = Object.assign({}, d.bestSimGhost || {}, {
                  halfpipe: { mode: 'halfpipe', hAir: sim.hAir, airTime: sim.airTime, score: sim.score, scoreBonused: sk.totalScore, trick: { id: sim.trick.id, label: sim.trick.label, emoji: sim.trick.emoji, rotation: sim.trick.rotation, axis: sim.trick.axis }, vehicle: { id: sim.vehicle.id, label: sim.vehicle.label } }
                });
                // Only bump the beat-counter when there *was* a prior
                // ghost — first ghost creation isn't beating anything.
                if (prevGhost) bumps.ghostBeatCount = (d.ghostBeatCount || 0) + 1;
              }
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
            // Park Session — append this attempt to the active
            // session buffer, auto-end if target reached.
            _sessionBumps(bumps, bumps.lastResult);
            upd(bumps);
          }
        });
      }

      function runGapJump() {
        if (d.running) return;
        // SK4: canvas-null guard (see runHalfpipe for rationale).
        if (!canvasRef.current) {
          if (addToast) addToast('Canvas not ready — try again in a moment.', 'info');
          return;
        }
        var sim = simGapJump({
          speedMph: d.speedMph, angleDeg: d.angleDeg, gapFt: d.gapFt,
          vehicle: d.vehicle, gravity: d.gravity, windId: d.windId
        });
        upd({ running: true, lastResult: null, lastSim: sim, attempts: (d.attempts || 0) + 1 });
        sfxTakeoff();
        if (cancelAnimRef.current) cancelAnimRef.current();
        // SK4: safety timer (see runHalfpipe for rationale).
        var gapSafety = setTimeout(function() {
          upd({ running: false });
          if (addToast) addToast('Animation stalled — reset.', 'info');
        }, 12000);
        cancelAnimRef.current = animateGapJump(canvasRef.current, sim, {
          ghost: (d.showGhost !== false) && d.bestSimGhost ? d.bestSimGhost.gap : null,
          showEnergyBar: d.showEnergyBar !== false,
          skater: d.skater,
          onDone: function() {
            clearTimeout(gapSafety);
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
              // Daily challenge mirror — gap mode side. Same once-
              // per-day gate as halfpipe.
              if (d.activeScenarioId === _todayScenario().id) {
                var todayKeyG = _todayKey();
                if (!((d.dailyDone || {})[todayKeyG])) {
                  bumps.dailyDone = Object.assign({}, d.dailyDone || {}, { [todayKeyG]: true });
                  if (addToast) addToast('🎯 Daily challenge complete! Come back tomorrow.', 'success');
                  skAnnounce('Daily challenge complete.');
                }
              }
              // Best-run ghost for gap mode.
              var prevGhostG = (d.bestSimGhost && d.bestSimGhost.gap) || null;
              if (prevGhostG) {
                bumps.lastResult.prevGhostRangeFt = prevGhostG.rangeFt;
                bumps.lastResult.prevGhostScore = prevGhostG.scoreBonused || prevGhostG.score || 0;
              }
              if (!prevGhostG || skG.totalScore > (prevGhostG.scoreBonused || prevGhostG.score || 0)) {
                bumps.lastResult.newBest = true;
                bumps.bestSimGhost = Object.assign({}, d.bestSimGhost || {}, {
                  gap: { mode: 'gap', vM: sim.vM, theta: sim.theta, hangTime: sim.hangTime, peakHFt: sim.peakHFt, rangeFt: sim.rangeFt, gapFt: sim.gapFt, score: sim.score, scoreBonused: skG.totalScore, gravity: sim.gravity }
                });
                if (prevGhostG) bumps.ghostBeatCount = (d.ghostBeatCount || 0) + 1;
              }
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
                  addToast(sim.clearance < 0 ? '💥 Came up short by ' + Math.abs(sim.clearance * M2FT).toFixed(1) + ' ft.' : '💥 Overshot by ' + ((sim.clearance - 1.2) * M2FT).toFixed(1) + ' ft.', 'info');
                }
              }
            }
            _sessionBumps(bumps, bumps.lastResult);
            upd(bumps);
          }
        });
      }

      // Re-render canvas when state changes (and not animating)
      React.useEffect(function() {
        if (d.running) return;
        var idleGhost = (d.showGhost !== false) && d.bestSimGhost ? d.bestSimGhost[d.mode] : null;
        var idleSkater = d.skater || { color: 'amber', helmet: false, pads: false };
        if (d.mode === 'halfpipe') {
          drawHalfpipe(canvasRef.current, { skX: null, skY: null, skRot: 0, speedMph: 0, airHeightFt: 0, label: __alloT('stem.skatelab.ready', 'Ready'), ghost: idleGhost, skater: idleSkater });
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
            ghost: idleGhost,
            skater: idleSkater,
            label: __alloT('stem.skatelab.ready_2', 'Ready')
          });
        }
        return function() {
          if (cancelAnimRef.current) cancelAnimRef.current();
        };
      }, [d.mode, d.speedMph, d.angleDeg, d.gapFt, d.pumps, d.trickId, d.vehicle, d.gravity, d.surfaceId, d.windId, d.running]);

      function _predictionGate() {
        var predTrim = (d.predictionInput || '').trim();
        var predParsed = parseFloat(predTrim);
        var predValid = isFinite(predParsed) && predParsed >= 0;
        return { valid: predValid, blocked: !!(d.predictMode && !predValid) };
      }

      function _startRunFromUI() {
        var gate = _predictionGate();
        if (gate.blocked) {
          skAnnounce('Type a numeric prediction first.');
          if (addToast) addToast('Predict mode is on, type a number first.', 'info');
          var input = document.getElementById('sk-predict-input');
          if (input) input.focus();
          return;
        }
        (d.mode === 'halfpipe' ? runHalfpipe : runGapJump)();
      }

      function _renderLaunchButton(compact) {
        var gate = _predictionGate();
        var disabled = !!d.running;
        return h('button', {
          onClick: _startRunFromUI,
          disabled: disabled,
          'aria-disabled': gate.blocked || undefined,
          'aria-controls': gate.blocked ? 'sk-predict-input' : 'sk-mode-panel',
          'aria-label': gate.blocked
            ? 'Type a prediction first'
            : (d.mode === 'halfpipe' ? 'Drop in and attempt the trick' : 'Send it across the gap'),
          'aria-busy': d.running,
          'data-sk-focusable': 'true',
          'data-skatelab-launch': compact ? 'focus' : 'primary',
          style: {
            width: compact ? 'auto' : '100%',
            padding: compact ? '9px 14px' : '12px 20px',
            marginBottom: compact ? 0 : 12,
            background: disabled ? '#64748b' : gate.blocked ? '#334155' : 'linear-gradient(135deg, #b45309, #7c2d12)',
            color: disabled ? '#0f172a' : gate.blocked ? '#e2e8f0' : '#fef3c7',
            border: '2px solid ' + (disabled ? '#475569' : gate.blocked ? '#64748b' : '#78350f'),
            borderRadius: compact ? 10 : 12,
            fontSize: compact ? 13 : 16,
            fontWeight: 900,
            cursor: d.running ? 'wait' : (gate.blocked ? 'not-allowed' : 'pointer'),
            boxShadow: (disabled || gate.blocked) ? 'none' : '0 4px 15px rgba(120,53,15,0.4), inset 0 1px 0 rgba(255,235,170,0.3)',
            letterSpacing: '0.04em',
            opacity: disabled ? 0.85 : 1,
            minHeight: compact ? 38 : 46
          }
        }, d.running
          ? __alloT('stem.skatelab.sending_it', 'Sending it...')
          : gate.blocked
            ? __alloT('stem.skatelab.type_a_prediction_first', 'Type a prediction first')
            : (d.mode === 'halfpipe' ? __alloT('stem.skatelab.drop_in', 'Drop In!') : __alloT('stem.skatelab.send_it', 'Send It!')));
      }

      function _runPlan() {
        if (d.mode === 'halfpipe') {
          var hpSim = simHalfpipe({
            pumps: d.pumps,
            trickId: d.trickId,
            trickInline: findAnyTrick(d.trickId),
            vehicle: d.vehicle,
            gravity: d.gravity,
            surfaceId: d.surfaceId
          });
          var hpReserve = hpSim.airTime - hpSim.effMinAir;
          var hpSpinPct = hpSim.trick.rotation === 0 ? 100 : Math.min(100, (hpSim.rotationCompleted / Math.max(1, hpSim.trick.rotation)) * 100);
          var hpReadyPct = Math.max(0, Math.min(100, Math.min(hpSim.airTime / Math.max(0.01, hpSim.effMinAir), hpSpinPct / 100) * 100));
          var hpReady = hpSim.landed;
          var hpNext = hpReady
            ? __alloT('stem.skatelab.ready_try_chain', 'Ready. Land it clean, then raise the difficulty or start a session.')
            : (hpReserve < 0
              ? ((d.pumps || 0) < 6
                ? __alloT('stem.skatelab.need_more_air_add_pumps', 'Need more air. Add pumps to buy hang time before the lip.')
                : __alloT('stem.skatelab.need_more_air_choose_smaller_trick', 'Air budget is maxed. Try a smaller trick or a smoother surface.'))
              : __alloT('stem.skatelab.need_more_rotation_budget', 'The airtime is close, but the rotation budget is tight. Try skateboard mode or a smaller spin.'));
          return {
            ready: hpReady,
            pct: hpReadyPct,
            title: hpReady ? __alloT('stem.skatelab.ready_to_land', 'Ready to land') : __alloT('stem.skatelab.needs_tuning', 'Needs tuning'),
            subtitle: hpSim.trick.label + ' on ' + hpSim.vehicle.label + ' - ' + hpSim.surface.label + ' surface',
            next: hpNext,
            accent: hpReady ? '#22c55e' : '#f59e0b',
            status: hpReserve >= 0 ? '+' + hpReserve.toFixed(2) + 's air reserve' : Math.abs(hpReserve).toFixed(2) + 's short',
            metrics: [
              { label: __alloT('stem.skatelab.air_time_short', 'Air time'), value: hpSim.airTime.toFixed(2) + 's' },
              { label: __alloT('stem.skatelab.trick_needs', 'Trick needs'), value: hpSim.effMinAir.toFixed(2) + 's' },
              { label: __alloT('stem.skatelab.spin_budget', 'Spin budget'), value: Math.round(hpSpinPct) + '%' }
            ]
          };
        }
        var gapSim = simGapJump({
          speedMph: d.speedMph,
          angleDeg: d.angleDeg,
          gapFt: d.gapFt,
          vehicle: d.vehicle,
          gravity: d.gravity,
          windId: d.windId
        });
        var clearanceFt = gapSim.clearance * M2FT;
        var gapReady = gapSim.landed;
        var shortBy = Math.max(0, d.gapFt - gapSim.rangeFt);
        var overshoot = Math.max(0, clearanceFt - (1.2 * M2FT));
        var gapPct = gapReady ? 100 : clearanceFt < 0
          ? Math.max(0, Math.min(98, (gapSim.rangeFt / Math.max(1, d.gapFt)) * 100))
          : Math.max(0, 100 - Math.min(100, overshoot * 18));
        var gapNext = gapReady
          ? __alloT('stem.skatelab.landing_window_ready', 'Landing window is lined up. Chase a cleaner clearance or a longer gap.')
          : (clearanceFt < 0
            ? __alloT('stem.skatelab.short_more_speed', 'Short. Speed has the biggest effect because range scales with speed squared.')
            : __alloT('stem.skatelab.overshooting_trim_speed', 'Overshooting. Trim speed or flatten the angle to pull the landing back.'));
        return {
          ready: gapReady,
          pct: gapPct,
          title: gapReady ? __alloT('stem.skatelab.landing_window', 'Landing window') : __alloT('stem.skatelab.recalibrate_jump', 'Recalibrate jump'),
          subtitle: d.speedMph + ' mph at ' + d.angleDeg + ' deg across ' + d.gapFt + ' ft',
          next: gapNext,
          accent: gapReady ? '#22c55e' : '#f59e0b',
          status: gapReady ? '+' + Math.max(0, clearanceFt).toFixed(1) + ' ft clearance' : (clearanceFt < 0 ? shortBy.toFixed(1) + ' ft short' : overshoot.toFixed(1) + ' ft long'),
          metrics: [
            { label: __alloT('stem.skatelab.range_short', 'Range'), value: gapSim.rangeFt.toFixed(1) + ' ft' },
            { label: __alloT('stem.skatelab.gap_short', 'Gap'), value: d.gapFt + ' ft' },
            { label: __alloT('stem.skatelab.peak_short', 'Peak'), value: gapSim.peakHFt.toFixed(1) + ' ft' }
          ]
        };
      }

      function _renderRunFocus() {
        var plan = _runPlan();
        var barPct = Math.max(4, Math.min(100, plan.pct));
        return h('div', {
          className: 'sk-run-focus-grid',
          'data-skatelab-run-focus': 'true',
          style: { marginBottom: 12 }
        },
          h('div', {
            style: {
              background: 'linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.86))',
              border: '1px solid ' + plan.accent,
              borderRadius: 12,
              padding: 12,
              boxShadow: '0 10px 26px rgba(0,0,0,0.28)'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 } },
              h('div', { style: { flex: 1, minWidth: 210 } },
                h('div', { style: { fontSize: 10, fontWeight: 900, color: plan.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 } }, __alloT('stem.skatelab.run_focus', 'Run focus')),
                h('div', { style: { fontSize: 16, fontWeight: 900, color: '#fef3c7', lineHeight: 1.2 } }, plan.title),
                h('div', { className: 'sk-compact-label', style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, plan.subtitle)
              ),
              h('div', {
                style: {
                  padding: '5px 10px',
                  borderRadius: 20,
                  background: plan.ready ? 'rgba(34,197,94,0.18)' : 'rgba(245,158,11,0.18)',
                  border: '1px solid ' + plan.accent,
                  color: plan.ready ? '#86efac' : '#fbbf24',
                  fontSize: 11,
                  fontWeight: 900,
                  whiteSpace: 'nowrap'
                }
              }, plan.status)
            ),
            h('div', {
              role: 'progressbar',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(plan.pct),
              'aria-label': __alloT('stem.skatelab.run_readiness', 'Run readiness'),
              style: { height: 9, background: 'rgba(15,23,42,0.8)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(254,243,199,0.18)', marginBottom: 8 }
            },
              h('div', { style: { height: '100%', width: barPct + '%', background: 'linear-gradient(90deg,' + plan.accent + ',#fbbf24)', borderRadius: 20, transition: 'width 180ms ease' } })
            ),
            h('p', { style: { margin: '0 0 10px', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12, lineHeight: 1.45 } }, plan.next),
            h('div', {
              className: 'sk-park-map',
              role: 'img',
              'aria-label': d.mode === 'halfpipe'
                ? __alloT('stem.skatelab.halfpipe_run_map', 'Halfpipe run map showing drop-in, airtime, and landing')
                : __alloT('stem.skatelab.gap_jump_run_map', 'Gap jump run map showing launch, apex, and landing')
            },
              h('span', { className: 'sk-park-point sk-park-start' },
                d.mode === 'halfpipe' ? __alloT('stem.skatelab.drop_in', 'Drop in') : __alloT('stem.skatelab.launch', 'Launch')),
              h('span', { className: 'sk-park-point sk-park-apex' },
                d.mode === 'halfpipe' ? plan.metrics[1].value : plan.metrics[2].value),
              h('span', { className: 'sk-park-point sk-park-land' },
                plan.ready ? __alloT('stem.skatelab.clean_landing_short', 'Clean') : __alloT('stem.skatelab.tune_landing_short', 'Tune'))
            ),
            _renderLaunchButton(true)
          ),
          h('div', {
            className: 'sk-run-metric-grid',
            style: {
              background: 'rgba(15,23,42,0.72)',
              border: '1px solid rgba(254,243,199,0.18)',
              borderRadius: 12,
              padding: 10,
              alignContent: 'stretch'
            }
          },
            plan.metrics.map(function(m) {
              return h('div', {
                key: m.label,
                style: {
                  background: 'rgba(254,243,199,0.08)',
                  border: '1px solid rgba(254,243,199,0.16)',
                  borderRadius: 8,
                  padding: '9px 8px',
                  textAlign: 'center'
                }
              },
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, m.label),
                h('div', { style: { fontSize: 16, color: '#fef3c7', fontWeight: 900, fontFamily: 'monospace' } }, m.value)
              );
            })
          )
        );
      }


      // ── Render UI ───────────────────────────────────────────────
      function _dialogKeyDown(e, closeDialog) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeDialog();
          return;
        }
        if (e.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(e.currentTarget.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )).filter(function(el) { return el.offsetParent !== null; });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }

      function _radioKeyDown(e, ids, currentId, selectId, domPrefix) {
        if (d.running) return;
        var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (keys.indexOf(e.key) === -1) return;
        e.preventDefault();
        var current = Math.max(0, ids.indexOf(currentId));
        var next = e.key === 'Home' ? 0
          : e.key === 'End' ? ids.length - 1
          : (current + ((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1) + ids.length) % ids.length;
        var nextId = ids[next];
        selectId(nextId);
        setTimeout(function() {
          var choice = document.getElementById(domPrefix + nextId);
          if (choice) choice.focus();
        }, 0);
      }

      function _completeConfirmAction() {
        var action = d.confirmAction;
        if (!action) return;
        upd('confirmAction', null);
        setTimeout(function() {
          if (action.type === 'deleteScenario') deleteCustomScenario(action.id);
          else if (action.type === 'deleteTrick') deleteCustomTrick(action.id);
          else if (action.type === 'endSession') endSession({ manual: true });
        }, 0);
      }
      var modeOrder = ['halfpipe', 'gap'];
      var modeBtn = function(id, label, emoji) {
        var sel = d.mode === id;
        return h('button', {
          key: id,
          id: 'sk-mode-tab-' + id,
          role: 'tab',
          onClick: function() { if (!d.running) { upd('mode', id); skAnnounce(label + ' mode'); } },
          disabled: !!d.running,
          'aria-disabled': !!d.running,
          onKeyDown: function(e) {
            if (d.running) return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
            e.preventDefault();
            var current = modeOrder.indexOf(id);
            var next = e.key === 'Home' ? 0 : e.key === 'End' ? modeOrder.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + modeOrder.length) % modeOrder.length;
            var nextId = modeOrder[next];
            upd('mode', nextId);
            setTimeout(function() {
              var tab = document.getElementById('sk-mode-tab-' + nextId);
              if (tab) tab.focus();
            }, 0);
          },
          'aria-selected': sel,
          'aria-controls': 'sk-mode-panel',
          tabIndex: sel ? 0 : -1,
          'data-sk-focusable': 'true',
          style: {
            padding: '8px 16px', borderRadius: 20,
            background: sel ? 'linear-gradient(135deg,#d97706,#b45309)' : 'rgba(254,243,199,0.10)',
            color: sel ? '#fff' : '#fef3c7',
            border: '1px solid ' + (sel ? '#92400e' : 'rgba(254,243,199,0.30)'),
            fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }
        }, emoji + ' ' + label);
      };

      // SK3: Scenario intro modal — surfaces teach text + discussion
      // questions when a famous-trick chip is clicked. Buttons to run
      // immediately or explore the controls manually first.
      var scenarioIntroModal = scenarioIntro ? h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': scenarioIntro.label + ' — context',
        onClick: function(e) { if (e.target === e.currentTarget) setScenarioIntro(null); },
        onKeyDown: function(e) { _dialogKeyDown(e, function() { setScenarioIntro(null); }); },
        style: {
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.78)', padding: 16
        }
      },
        h('div', {
          style: {
            background: 'linear-gradient(180deg, var(--allo-stem-panel, #1e293b) 0%, var(--allo-stem-canvas, #0f172a) 100%)',
            color: '#fef3c7', borderRadius: 16, padding: 24, maxWidth: 580, width: '100%',
            border: '2px solid #fbbf24', boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            maxHeight: '90vh', overflowY: 'auto'
          }
        },
          // Header row: icon + label + close
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
            h('div', { style: { fontSize: 38, flexShrink: 0 }, 'aria-hidden': 'true' }, scenarioIntro.icon),
            h('div', { style: { flexGrow: 1, minWidth: 0 } },
              h('div', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#fbbf24', marginBottom: 2 } }, scenarioIntro.mode === 'halfpipe' ? 'Halfpipe scenario' : 'Gap-jump scenario'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: '#fef3c7', lineHeight: 1.2 } }, scenarioIntro.label)
            ),
            h('button', {
              onClick: function() { setScenarioIntro(null); },
              'aria-label': __alloT('stem.skatelab.close_scenario_intro', 'Close scenario intro'),
              style: {
                background: 'transparent', border: 'none', color: 'var(--allo-stem-text, #cbd5e1)',
                fontSize: 26, lineHeight: 1, cursor: 'pointer', padding: 4
              }
            }, '×')
          ),
          // Teach text — the historical / pedagogical context
          h('div', {
            style: {
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 14,
              lineHeight: 1.55, color: 'var(--allo-stem-text, #fde68a)'
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#f59e0b', marginBottom: 6 } }, __alloT('stem.skatelab.the_story', '📜 The story')),
            scenarioIntro.teach
          ),
          // Discussion questions — surface the existing pedagogical content
          (scenarioIntro.questions && scenarioIntro.questions.length > 0) && h('div', {
            style: {
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13, color: '#c7d2fe'
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#818cf8', marginBottom: 8 } }, __alloT('stem.skatelab.try_these_before_you_run_it', '🤔 Try these before you run it')),
            h('ol', { style: { margin: 0, paddingLeft: 20, lineHeight: 1.55 } },
              scenarioIntro.questions.map(function(q, qi) {
                return h('li', { key: qi, style: { marginBottom: qi < scenarioIntro.questions.length - 1 ? 6 : 0 } }, q);
              })
            )
          ),
          // Action buttons
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } },
            h('button', {
              onClick: function() { setScenarioIntro(null); },
              'aria-label': __alloT('stem.skatelab.close_and_explore_controls_manually', 'Close and explore controls manually'),
              style: {
                padding: '8px 14px', fontSize: 13, fontWeight: 700,
                background: 'transparent', color: '#fef3c7',
                border: '1px solid rgba(254,243,199,0.4)', borderRadius: 8,
                cursor: 'pointer'
              }
            }, __alloT('stem.skatelab.explore_first', '🔧 Explore first')),
            h('button', {
              onClick: function() {
                var mode = scenarioIntro.mode;
                setScenarioIntro(null);
                // SK4: trigger run synchronously. Earlier setTimeout(30)
                // could leave running:true stuck if the closure's
                // runHalfpipe was stale or canvas wasn't ready. Inline
                // call uses the live closure + the canvas-null guard
                // below catches the rare not-ready case.
                if (mode === 'halfpipe') runHalfpipe();
                else runGapJump();
              },
              'aria-label': __alloT('stem.skatelab.run_this_scenario_now', 'Run this scenario now'),
              style: {
                padding: '8px 16px', fontSize: 13, fontWeight: 800,
                background: 'linear-gradient(135deg,#d97706,#b45309)',
                color: '#fff', border: '1px solid #fbbf24', borderRadius: 8,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(251,191,36,0.35)'
              }
            }, __alloT('stem.skatelab.run_it_now', '🛹 Run it now'))
          )
        )
      ) : null;
      return h('div', { className: 'skatelab-shell', style: { color: 'var(--allo-stem-text, #f1f5f9)', fontFamily: 'system-ui, sans-serif', maxWidth: '58rem', margin: '0 auto', padding: 16 } },
        scenarioIntroModal,
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && setStemLabTool ? h('button', {
            onClick: function() { setStemLabTool(null); },
            'aria-label': __alloT('stem.skatelab.back_to_stem_lab', 'Back to STEM Lab'),
            'data-sk-focusable': 'true',
            style: { padding: 6, background: 'transparent', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 8, color: '#fef3c7', cursor: 'pointer' }
          }, h(ArrowLeft, { size: 16 })) : null,
          h('div', { style: { fontSize: 30 } }, '🛹'),
          h('div', { style: { flex: 1 } },
            h('h2', { style: { margin: 0, color: '#fbbf24', fontSize: 22, fontWeight: 900, letterSpacing: '0.02em' } }, 'SkateLab'),
            h('p', { style: { margin: 0, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 12 } }, __alloT('stem.skatelab.skate_bmx_physics_same_math_that_lands', 'Skate / BMX physics — same math that lands a 720.'))
          )
        ),
        // ── Daily Challenge banner ──────────────────────────────
        // Date-seeded scenario pick from SCENARIOS — every student
        // in the class gets the same challenge today. Banner shows
        // today's pick + a "Try it" shortcut + a ✓ when the student
        // has already landed it today.
        (function() {
          var today = _todayKey();
          var todayScene = _todayScenario();
          var done = !!(d.dailyDone && d.dailyDone[today]);
          var doneCount = Object.keys(d.dailyDone || {}).length;
          return h('div', {
            role: 'region',
            'aria-label': __alloT('stem.skatelab.today_s_daily_challenge', 'Today\'s daily challenge'),
            style: {
              background: done ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(21,128,61,0.10))' : 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(180,83,9,0.10))',
              border: '1px solid ' + (done ? 'rgba(34,197,94,0.50)' : 'rgba(251,191,36,0.50)'),
              borderRadius: 10, padding: '10px 12px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 22 } }, done ? '✅' : '🎯'),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: done ? '#86efac' : '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 } },
                done ? '✓ Daily challenge: complete · ' + doneCount + ' day' + (doneCount === 1 ? '' : 's') + ' total' : 'Today\'s Challenge · ' + today
              ),
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fef3c7', marginBottom: 2 } },
                todayScene.icon + ' ' + todayScene.label
              ),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.4 } },
                done ? 'Nice. Come back tomorrow for a new pick.' : 'Land this scenario to mark today complete. Same challenge for every student in the class.'
              )
            ),
            !done && h('button', {
              onClick: function() { loadScenario(todayScene.id); },
              disabled: !!d.running,
              'aria-label': 'Load today\'s challenge: ' + todayScene.label,
              'data-sk-focusable': 'true',
              title: todayScene.teach,
              style: {
                padding: '8px 14px', fontSize: 12, fontWeight: 800,
                background: 'linear-gradient(135deg,#fbbf24,#d97706)',
                color: '#0f172a', border: '1px solid #b45309',
                borderRadius: 8, cursor: 'pointer', minHeight: 36,
                boxShadow: '0 2px 6px rgba(180,83,9,0.35)'
              }
            }, __alloT('stem.skatelab.try_it', '🛹 Try it'))
          );
        })(),
        // Famous-trick scenario pills — clicking loads a real-world
        // moment into the simulator. Active scenario gets a bright ring;
        // others sit on a subtle base. Mirrors ThrowLab's scenario row.
        // Custom scenarios render in a second sub-row below the
        // built-ins, each with a small × delete button.
        h('div', { style: { marginBottom: 10 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase' } }, __alloT('stem.skatelab.famous_tricks', '🎬 Famous tricks')),
            h('button', {
              onClick: function() { upd('saveModalDraft', { label: '' }); },
              'aria-label': __alloT('stem.skatelab.save_current_settings_as_a_custom_scen', 'Save current settings as a custom scenario'),
              'data-sk-focusable': 'true',
              title: __alloT('stem.skatelab.capture_the_current_setup_as_a_reusabl', 'Capture the current setup as a reusable preset'),
              style: {
                padding: '5px 10px', fontSize: 10, fontWeight: 700,
                background: 'rgba(167,139,250,0.18)', color: 'var(--allo-stem-text, #fef3c7)',
                border: '1px solid rgba(167,139,250,0.45)',
                borderRadius: 20, cursor: 'pointer', minHeight: 24
              }
            }, __alloT('stem.skatelab.save_current', '💾 Save current'))
          ),
          h('div', { className: 'sk-scenario-rail', 'aria-label': 'Famous trick scenarios' },
            SCENARIOS.map(function(sc) {
              var active = d.activeScenarioId === sc.id;
              var todayId = _todayScenario().id;
              var isToday = sc.id === todayId;
              return h('button', {
                key: sc.id,
                onClick: function() { loadScenario(sc.id); },
                disabled: !!d.running,
                'aria-pressed': active,
                'aria-label': 'Load scenario: ' + sc.label + (isToday ? ' (today\'s challenge)' : ''),
                'data-sk-focusable': 'true',
                title: sc.teach + (isToday ? ' — TODAY\'S CHALLENGE' : ''),
                style: {
                  padding: '5px 10px', fontSize: 11, fontWeight: 700,
                  background: active ? 'linear-gradient(135deg,#d97706,#b45309)' : 'rgba(254,243,199,0.08)',
                  color: active ? '#fff' : '#fef3c7',
                  border: '1px solid ' + (active ? '#fbbf24' : isToday ? '#fbbf24' : 'rgba(254,243,199,0.55)'),
                  borderRadius: 20, cursor: 'pointer',
                  boxShadow: active ? '0 0 12px rgba(251,191,36,0.4)' : isToday ? '0 0 6px rgba(251,191,36,0.35)' : 'none'
                }
              }, (isToday ? '🎯 ' : '') + sc.icon + ' ' + sc.label);
            })
          ),
          // Custom scenario sub-row — only renders when at least one
          // custom scenario exists. Each has a tiny × on hover/focus.
          (d.customScenarios && d.customScenarios.length > 0) && h('div', {
            style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 },
            'aria-label': __alloT('stem.skatelab.custom_scenarios', 'Custom scenarios')
          },
            d.customScenarios.map(function(sc) {
              var active = d.activeScenarioId === sc.id;
              return h('div', {
                key: sc.id,
                style: { display: 'inline-flex', alignItems: 'stretch' }
              },
                h('button', {
                  onClick: function() { loadScenario(sc.id); },
                  disabled: !!d.running,
                  'aria-pressed': active,
                  'aria-label': 'Load custom scenario: ' + sc.label,
                  'data-sk-focusable': 'true',
                  title: sc.teach,
                  style: {
                    padding: '5px 10px', fontSize: 11, fontWeight: 700,
                    background: active ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'rgba(167,139,250,0.12)',
                    color: active ? '#fff' : '#c4b5fd',
                    border: '1px solid ' + (active ? '#a78bfa' : 'rgba(167,139,250,0.35)'),
                    borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
                    borderTopRightRadius: 0, borderBottomRightRadius: 0,
                    borderRight: 'none',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 12px rgba(167,139,250,0.4)' : 'none'
                  }
                }, sc.icon + ' ' + sc.label),
                h('button', {
                  onClick: function() {
                    upd('confirmAction', {
                      type: 'deleteScenario',
                      id: sc.id,
                      title: 'Delete custom scenario?',
                      message: 'Remove "' + sc.label + '" from your saved scenarios? This cannot be undone.',
                      confirmLabel: 'Delete scenario'
                    });
                  },
                  'aria-label': 'Delete custom scenario: ' + sc.label,
                  'data-sk-focusable': 'true',
                  title: __alloT('stem.skatelab.delete_this_custom_scenario', 'Delete this custom scenario'),
                  style: {
                    padding: '5px 8px', fontSize: 10, fontWeight: 700,
                    background: active ? 'rgba(0,0,0,0.25)' : 'rgba(167,139,250,0.12)',
                    color: '#fca5a5',
                    border: '1px solid ' + (active ? '#a78bfa' : 'rgba(167,139,250,0.35)'),
                    borderTopRightRadius: 20, borderBottomRightRadius: 20,
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
        d.mode === 'halfpipe' && h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.halfpipe_surface', 'Halfpipe surface'), style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' } },
          SURFACES.map(function(sf) {
            var sel = (d.surfaceId || 'standard') === sf.id;
            return h('button', {
              key: 'sf-' + sf.id,
              id: 'sk-surface-' + sf.id,
              onClick: function() { upd('surfaceId', sf.id); skAnnounce('Surface: ' + sf.label + '. ' + sf.blurb); },
              onKeyDown: function(e) {
                _radioKeyDown(e, SURFACES.map(function(item) { return item.id; }), d.surfaceId || 'standard', function(nextId) {
                  upd('surfaceId', nextId);
                  var nextSurface = getSurface(nextId);
                  skAnnounce('Surface: ' + nextSurface.label + '. ' + nextSurface.blurb);
                }, 'sk-surface-');
              },
              disabled: !!d.running,
              role: 'radio',
              'aria-checked': sel,
              tabIndex: sel ? 0 : -1,
              'data-sk-focusable': 'true',
              title: sf.blurb + ' (efficiency ' + sf.efficiency.toFixed(2) + ')',
              style: {
                padding: '4px 11px', fontSize: 11, fontWeight: 700,
                background: sel ? 'linear-gradient(135deg,#0891b2,#0e7490)' : 'rgba(254,243,199,0.08)',
                color: sel ? '#fff' : '#fef3c7',
                border: '1px solid ' + (sel ? '#155e75' : 'rgba(254,243,199,0.55)'),
                borderRadius: 20, cursor: 'pointer'
              }
            }, sf.icon + ' ' + sf.label);
          })
        ),
        // Vehicle toggle — skateboard vs BMX. Different mass, different
        // pump efficiency, different rotation moment. Same physics.
        h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.vehicle', 'Vehicle'), style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 } },
          ['skate', 'bmx'].map(function(vid) {
            var v = VEHICLES[vid];
            var sel = d.vehicle === vid;
            return h('button', {
              key: vid,
              id: 'sk-vehicle-' + vid,
              onClick: function() {
                upd('vehicle', vid);
                skAnnounce('Switched to ' + v.label + '. ' + (vid === 'bmx' ? 'Heavier vehicle, slower rotation, slightly more air needed per trick.' : 'Standard skateboard physics.'));
              },
              onKeyDown: function(e) {
                _radioKeyDown(e, ['skate', 'bmx'], d.vehicle || 'skate', function(nextId) {
                  upd('vehicle', nextId);
                  skAnnounce('Switched to ' + getVehicle(nextId).label + '.');
                }, 'sk-vehicle-');
              },
              disabled: !!d.running,
              role: 'radio',
              'aria-checked': sel,
              tabIndex: sel ? 0 : -1,
              'data-sk-focusable': 'true',
              title: v.label + ' — mass ' + v.mass + ' kg · pump efficiency ' + v.pumpEfficiency + ' m/s · rotation ×' + v.rotationScale,
              style: {
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                background: sel ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(254,243,199,0.08)',
                color: sel ? '#fff' : '#fef3c7',
                border: '1px solid ' + (sel ? '#0369a1' : 'rgba(254,243,199,0.55)'),
                borderRadius: 20, cursor: 'pointer'
              }
            }, v.icon + ' ' + v.label);
          })
        ),
        // Mode selector
        h('div', { role: 'tablist', 'aria-label': __alloT('stem.skatelab.skatelab_mode', 'SkateLab mode'), style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' } },
          modeBtn('halfpipe', 'Halfpipe', '🛹'),
          modeBtn('gap', 'Gap Jump', '🦘')
        ),

        // Topic-accent hero band per mode
        (function() {
          var MODE_META = {
            halfpipe: { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '🛹', title: __alloT('stem.skatelab.halfpipe_energy_conservation_in_a_curv', 'Halfpipe — energy conservation in a curved track'), hint: __alloT('stem.skatelab.drop_in_gravitational_pe_ke_at_the_bot', 'Drop in: gravitational PE → KE at the bottom. Rise on the other side: KE → PE again. Friction + air drag bleed energy each cycle, so air height decreases unless the rider pumps. Pumping = doing work against gravity at the right phase.') },
            gap:      { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '🦘', title: __alloT('stem.skatelab.gap_jump_projectile_motion_landing_phy', 'Gap jump — projectile motion + landing physics'), hint: __alloT('stem.skatelab.once_airborne_x_and_y_are_independent_', 'Once airborne, x and y are independent: x = v·cosθ·t, y = v·sinθ·t − ½gt². Landing speed depends on the height differential, not the horizontal distance. Steeper landing slope = lower impact force = safer.') }
          };
          var meta = MODE_META[d.mode] || MODE_META.halfpipe;
          return h('div', {
            style: {
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              marginBottom: 12
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),
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
                'aria-label': __alloT('stem.skatelab.print_this_scenario_as_a_student_activ', 'Print this scenario as a student activity sheet'),
                'data-sk-focusable': 'true',
                title: __alloT('stem.skatelab.print_classroom_friendly_activity_shee', 'Print classroom-friendly activity sheet with the questions'),
                style: { background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.45)', color: 'var(--allo-stem-text, #fef3c7)', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 28 }
              }, __alloT('stem.skatelab.print', '🖨️ Print')),
              h('button', {
                onClick: function() { upd('activeScenarioId', null); skAnnounce('Lesson dismissed.'); },
                'aria-label': __alloT('stem.skatelab.dismiss_lesson_card', 'Dismiss lesson card'),
                'data-sk-focusable': 'true',
                style: { background: 'transparent', border: '1px solid rgba(254,243,199,0.30)', color: '#fef3c7', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 28 }
              }, __alloT('stem.skatelab.dismiss', '✕ Dismiss'))
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12, color: '#fef3c7', lineHeight: 1.55 } }, sc.teach),
            h('details', null,
              h('summary', { style: { cursor: 'pointer', color: '#fbbf24', fontWeight: 700, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' } }, __alloT('stem.skatelab.questions', '📝 Questions')),
              h('ol', { style: { margin: '8px 0 0', paddingLeft: 20, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } },
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
              background: bg, color: '#d1d5db',
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
                borderRadius: 20, fontWeight: 800
              }
            }, '×' + tier.mult + ' XP')
          );
        })() : null),
        _renderRunFocus(),
        // Canvas
        h('div', {
          id: 'sk-mode-panel',
          role: 'tabpanel',
          'aria-labelledby': 'sk-mode-tab-' + d.mode,
          className: 'sk-canvas-frame',
          'data-skatelab-sim-surface': 'true',
          style: {
            background: 'linear-gradient(180deg, rgba(30,41,59,0.96), var(--allo-stem-canvas, #0f172a))',
            borderRadius: 12,
            border: '2px solid #78350f',
            padding: 8,
            marginBottom: 12,
            boxShadow: '0 10px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(254,243,199,0.08)'
          }
        },
          h('div', {
            className: 'sk-toolbar-row',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }
          },
            h('div', { style: { fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase' } }, __alloT('stem.skatelab.live_motion', 'Live motion')),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('span', { style: { padding: '3px 8px', borderRadius: 20, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.32)', color: '#fbbf24', fontSize: 10, fontWeight: 800 } }, d.mode === 'halfpipe' ? __alloT('stem.skatelab.energy_loop', 'Energy loop') : __alloT('stem.skatelab.projectile_arc', 'Projectile arc')),
              h('span', { style: { padding: '3px 8px', borderRadius: 20, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.32)', color: '#7dd3fc', fontSize: 10, fontWeight: 800 } }, getVehicle(d.vehicle).label)
            )
          ),
          h('canvas', {
            ref: canvasRef,
            width: 640, height: 320,
            role: 'img',
            'data-a11y-static': 'true',
            'aria-describedby': 'sk-canvas-summary',
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
            style: { width: '100%', height: 'auto', display: 'block', borderRadius: 8, border: '1px solid rgba(254,243,199,0.12)' }
          }),
          h('div', {
            id: 'sk-canvas-summary',
            className: 'sk-canvas-summary',
            style: {
              marginTop: 8, padding: '7px 9px', borderRadius: 6,
              border: '1px solid rgba(125,211,252,0.28)', background: 'rgba(14,165,233,0.08)',
              color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 11, lineHeight: 1.5
            }
          }, h('strong', null, __alloT('stem.skatelab.scene_summary', 'Scene summary: ')), getCanvasSummary())
        ),
        // ── First-time tour overlay ──────────────────────────────
        // Auto-shows on first mount (when tour.seen is false), then
        // re-openable via the 💡 Tour chip. 5 steps cover: Drop In,
        // pumps, tricks, predict mode, "explore deeper." Skip and
        // Done both flip seen=true so it doesn't auto-show again.
        (d.tour && d.tour.open) && (function() {
          var TOUR_STEPS = [
            {
              icon: '👋',
              title: __alloT('stem.skatelab.welcome_to_skatelab', 'Welcome to SkateLab'),
              body: __alloT('stem.skatelab.this_is_a_physics_simulator_where_the_', 'This is a physics simulator where the math is the same as real skating. Press 🛹 Drop In! to attempt a kickflip on Earth.')
            },
            {
              icon: '⚡',
              title: __alloT('stem.skatelab.pumps_add_kinetic_energy', 'Pumps add kinetic energy'),
              body: __alloT('stem.skatelab.more_pumps_more_ke_more_air_more_rotat', 'More pumps = more KE → more air → more rotation budget. Try 5 pumps and a 360 spin. Watch the Energy bar transform KE into PE as you climb.')
            },
            {
              icon: '🎯',
              title: __alloT('stem.skatelab.famous_tricks_today_s_challenge', 'Famous tricks + Today\'s Challenge'),
              body: __alloT('stem.skatelab.the_scenarios_row_at_the_top_loads_rea', 'The scenarios row at the top loads real moments from skate history — Tony Hawk\'s 900, Danny Way\'s Great Wall, Moonshot Kickflip. Today\'s Challenge is the same for every student in your class.')
            },
            {
              icon: '🔮',
              title: __alloT('stem.skatelab.predict_before_you_run', 'Predict before you run'),
              body: __alloT('stem.skatelab.toggle_predict_mode_type_how_high_you_', 'Toggle 🔮 Predict mode — type how high you think you\'ll go BEFORE pressing Drop In. Track how close you got. Your physics intuition will sharpen across attempts.')
            },
            {
              icon: '🛡️',
              title: __alloT('stem.skatelab.stay_safe_out_there', 'Stay safe out there'),
              body: __alloT('stem.skatelab.mastery_tree_trick_lab_gear_science_an', 'Mastery Tree, Trick Lab, Gear Science, and the Park Session live in the panels below. Play, predict, invent — and wear a helmet in real life.')
            }
          ];
          var step = Math.max(0, Math.min(TOUR_STEPS.length - 1, d.tour.step || 0));
          var s = TOUR_STEPS[step];
          var isLast = step === TOUR_STEPS.length - 1;
          var closeAndMarkSeen = function() {
            upd({ tour: { open: false, step: 0, seen: true } });
            skAnnounce('Tour closed.');
          };
          return h('div', {
            role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-tour-title',
            onKeyDown: function(e) { _dialogKeyDown(e, closeAndMarkSeen); },
            onClick: function(e) { if (e.target === e.currentTarget) closeAndMarkSeen(); },
            style: {
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }
          },
            h('div', {
              style: {
                background: 'linear-gradient(135deg, var(--allo-stem-panel, #1e293b), var(--allo-stem-canvas, #0f172a))',
                border: '2px solid #fbbf24', borderRadius: 14,
                padding: 24, maxWidth: 460, width: '100%',
                boxShadow: '0 20px 60px rgba(251,191,36,0.20)'
              },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.10em', textTransform: 'uppercase' } }, 'Quick tour · ' + (step + 1) + ' / ' + TOUR_STEPS.length),
                h('button', {
                  onClick: closeAndMarkSeen,
                  'aria-label': __alloT('stem.skatelab.skip_tour', 'Skip tour'),
                  'data-sk-focusable': 'true',
                  style: {
                    background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                    border: '1px solid rgba(148,163,184,0.40)',
                    borderRadius: 6, padding: '4px 8px',
                    fontSize: 10, fontWeight: 700, cursor: 'pointer'
                  }
                }, __alloT('stem.skatelab.skip', 'Skip'))
              ),
              h('div', { style: { fontSize: 38, marginBottom: 6 } }, s.icon),
              h('h3', { id: 'sk-tour-title', style: { margin: '0 0 8px', color: '#fef3c7', fontSize: 18, fontWeight: 900 } }, s.title),
              h('p', { style: { margin: '0 0 16px', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, lineHeight: 1.6 } }, s.body),
              // Step dots
              h('div', { style: { display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14 } },
                TOUR_STEPS.map(function(_, i) {
                  return h('div', {
                    key: 'dot-' + i,
                    style: {
                      width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                      background: i === step ? '#fbbf24' : 'rgba(148,163,184,0.45)',
                      transition: 'width 200ms ease'
                    }
                  });
                })
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
                step > 0 && h('button', {
                  onClick: function() { upd({ tour: Object.assign({}, d.tour, { step: step - 1 }) }); },
                  'data-sk-focusable': 'true',
                  style: {
                    padding: '8px 14px', fontSize: 12, fontWeight: 700,
                    background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                    border: '1px solid rgba(148,163,184,0.40)',
                    borderRadius: 8, cursor: 'pointer', minHeight: 36
                  }
                }, __alloT('stem.skatelab.back', '← Back')),
                h('button', {
                  onClick: function() {
                    if (isLast) closeAndMarkSeen();
                    else upd({ tour: Object.assign({}, d.tour, { step: step + 1 }) });
                  },
                  'data-sk-focusable': 'true',
                  autoFocus: true,
                  style: {
                    padding: '10px 22px', fontSize: 13, fontWeight: 800,
                    background: 'linear-gradient(135deg,#fbbf24,#d97706)',
                    color: '#0f172a', border: '1px solid #b45309',
                    borderRadius: 8, cursor: 'pointer', minHeight: 36
                  }
                }, isLast ? '🛹 Start skating' : 'Next →')
              )
            )
          );
        })(),
        // ── Save-scenario modal ─────────────────────────────────
        // ── Session start prompt modal ────────────────────────────
        // Pick attempt count (3/5/10) before kicking off a session.
        // Mirrors saveModalDraft visual pattern — overlay + card.
        (d.session && d.session.startPromptOpen) && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-sess-title',
          onKeyDown: function(e) { _dialogKeyDown(e, function() { upd({ session: Object.assign({}, d.session, { startPromptOpen: false }) }); }); },
          onClick: function(e) { if (e.target === e.currentTarget) upd({ session: Object.assign({}, d.session, { startPromptOpen: false }) }); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid #15803d', borderRadius: 14,
              padding: 20, maxWidth: 380, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', { id: 'sk-sess-title', style: { margin: '0 0 6px', color: '#86efac', fontSize: 15, fontWeight: 800, letterSpacing: '0.04em' } }, __alloT('stem.skatelab.start_a_park_session', '🎯 Start a park session')),
            h('p', { style: { margin: '0 0 14px', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
              __alloT('stem.skatelab.run_a_fixed_number_of_attempts_and_get', 'Run a fixed number of attempts and get aggregate stats at the end. See if your prediction accuracy improves across the session.')
            ),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 } },
              [3, 5, 10].map(function(n) {
                return h('button', {
                  key: 'sess-n-' + n,
                  onClick: function() { startSession(n); },
                  'data-sk-focusable': 'true',
                  style: {
                    padding: '12px 20px', fontSize: 14, fontWeight: 800,
                    background: 'linear-gradient(135deg,#22c55e,#15803d)',
                    color: '#fff', border: '1px solid #15803d',
                    borderRadius: 10, cursor: 'pointer', minHeight: 44,
                    flex: 1
                  }
                }, n + ' attempts');
              })
            ),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { upd({ session: Object.assign({}, d.session, { startPromptOpen: false }) }); },
                'data-sk-focusable': 'true',
                style: {
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                  border: '1px solid rgba(148,163,184,0.40)',
                  borderRadius: 8, cursor: 'pointer', minHeight: 32
                }
              }, __alloT('stem.skatelab.cancel', 'Cancel'))
            )
          )
        ),
        // ── Session summary modal ────────────────────────────────
        // Renders aggregate stats across the just-completed session.
        // Save-to-history happens in endSession before this opens, so
        // closing the modal is a pure dismiss.
        (d.session && d.session.summaryOpen && d.session.lastSummary) && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-sess-summary-title',
          onKeyDown: function(e) { _dialogKeyDown(e, function() { upd({ session: Object.assign({}, d.session, { summaryOpen: false }) }); }); },
          onClick: function(e) { if (e.target === e.currentTarget) upd({ session: Object.assign({}, d.session, { summaryOpen: false }) }); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          (function() {
            var sum = d.session.lastSummary;
            var atts = sum.attempts || [];
            var lands = atts.filter(function(a) { return a.landed; }).length;
            var totalScore = atts.reduce(function(s, a) { return s + (a.score || 0); }, 0);
            var withErr = atts.filter(function(a) { return typeof a.errPct === 'number'; });
            var avgErr = withErr.length ? (withErr.reduce(function(s, a) { return s + a.errPct; }, 0) / withErr.length) : null;
            var firstErr = withErr.length ? withErr[0].errPct : null;
            var lastErr = withErr.length ? withErr[withErr.length - 1].errPct : null;
            var improvement = (firstErr !== null && lastErr !== null) ? (firstErr - lastErr) : null;
            // Longest streak in this session
            var bestStreak = 0, curStreak = 0;
            atts.forEach(function(a) {
              if (a.landed) { curStreak++; if (curStreak > bestStreak) bestStreak = curStreak; }
              else curStreak = 0;
            });
            return h('div', {
              style: {
                background: 'var(--allo-stem-panel, #1e293b)', border: '2px solid #15803d', borderRadius: 14,
                padding: 24, maxWidth: 520, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                maxHeight: '85vh', overflow: 'auto'
              },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('h3', { id: 'sk-sess-summary-title', style: { margin: '0 0 4px', color: '#86efac', fontSize: 18, fontWeight: 900, letterSpacing: '0.04em' } }, __alloT('stem.skatelab.session_complete', '🎯 Session complete')),
              h('p', { style: { margin: '0 0 16px', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)' } },
                atts.length + ' attempts' + (sum.manuallyEnded ? ' · ended early' : '')
              ),
              // Stat grid
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 } },
                [
                  { label: __alloT('stem.skatelab.lands', 'Lands'), val: lands + ' / ' + atts.length, color: '#86efac' },
                  { label: __alloT('stem.skatelab.total_xp', 'Total XP'), val: totalScore, color: '#fbbf24' },
                  { label: __alloT('stem.skatelab.best_streak', 'Best streak'), val: bestStreak, color: '#fb923c' },
                  { label: __alloT('stem.skatelab.avg_prediction_error', 'Avg prediction error'), val: avgErr !== null ? avgErr.toFixed(1) + '%' : '—', color: '#a5b4fc' }
                ].map(function(s, i) {
                  return h('div', { key: i, style: { background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 8, padding: '10px 12px' } },
                    h('div', { style: { fontSize: 18, fontWeight: 900, color: s.color } }, String(s.val)),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, s.label)
                  );
                })
              ),
              // Improvement callout (only when there's enough prediction data)
              improvement !== null && Math.abs(improvement) > 1 && h('div', {
                style: {
                  background: improvement > 0 ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                  border: '1px solid ' + (improvement > 0 ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                  borderRadius: 8, padding: '8px 10px', marginBottom: 12,
                  fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.5
                }
              },
                h('b', null, improvement > 0 ? '📈 Your physics intuition sharpened ' : '📉 Your prediction error grew '),
                'from ', firstErr.toFixed(1) + '%', __alloT('stem.skatelab.first_attempt_to', ' (first attempt) to '), lastErr.toFixed(1) + '%', ' (last). ',
                improvement > 0 ? 'That ' + improvement.toFixed(1) + '%' + ' improvement is the loop working — you got closer to the answer with each attempt.' : 'Tomorrow, predict before changing variables and watch the gap close.'
              ),
              // Attempt strip — small cards, one per attempt
              h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text, #cbd5e1)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.skatelab.attempts', 'Attempts')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
                atts.map(function(a, i) {
                  return h('div', {
                    key: 'att-' + i,
                    style: {
                      flex: '1 1 0', minWidth: 80, padding: '6px 8px',
                      background: a.landed ? 'rgba(34,197,94,0.12)' : 'rgba(180,83,9,0.12)',
                      border: '1px solid ' + (a.landed ? '#22c55e' : '#d97706'),
                      borderRadius: 6, fontSize: 10, color: 'var(--allo-stem-text, #e2e8f0)', fontFamily: 'monospace'
                    }
                  },
                    h('div', { style: { fontWeight: 800, color: a.landed ? '#86efac' : '#fbbf24' } }, '#' + (i + 1) + ' ' + (a.landed ? '✓' : '✗')),
                    h('div', null, a.label || ''),
                    h('div', { style: { color: 'var(--allo-stem-text, #cbd5e1)' } }, '+' + (a.score || 0) + ' XP'),
                    typeof a.errPct === 'number' && h('div', { style: { color: '#a5b4fc' } }, '🔮 off ' + a.errPct.toFixed(0) + '%')
                  );
                })
              ),
              h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                h('button', {
                  onClick: function() { upd({ session: Object.assign({}, d.session, { summaryOpen: false }) }); },
                  'data-sk-focusable': 'true',
                  autoFocus: true,
                  style: {
                    padding: '10px 22px', fontSize: 13, fontWeight: 800,
                    background: 'linear-gradient(135deg,#22c55e,#15803d)',
                    color: '#fff', border: '1px solid #15803d',
                    borderRadius: 10, cursor: 'pointer', minHeight: 40
                  }
                }, __alloT('stem.skatelab.done', '✓ Done'))
              )
            );
          })()
        ),
        // Inline modal — when saveModalDraft is non-null, dim the
        // tool body and show a name-input card. Confirm captures the
        // current state. Mirrors ThrowLab's save-scenario flow.
        d.saveModalDraft && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-save-title',
          onKeyDown: function(e) { _dialogKeyDown(e, function() { upd('saveModalDraft', null); }); },
          onClick: function(e) { if (e.target === e.currentTarget) upd('saveModalDraft', null); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid #78350f', borderRadius: 14,
              padding: 20, maxWidth: 380, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', {
              id: 'sk-save-title',
              style: { margin: '0 0 6px', color: 'var(--allo-stem-text, #fef3c7)', fontSize: 15, fontWeight: 800, letterSpacing: '0.04em' }
            }, __alloT('stem.skatelab.save_current_setup_as_a_scenario', '💾 Save current setup as a scenario')),
            h('p', { style: { margin: '0 0 12px', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
              'Capture the current ' + d.mode + ' configuration so it shows in the scenario row alongside the famous tricks. Pick a short, memorable name.'),
            h('label', {
              htmlFor: 'sk-save-scenario-name',
              style: { display: 'block', marginBottom: 5, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, fontWeight: 800 }
            }, 'Scenario name'),
            h('input', {
              id: 'sk-save-scenario-name',
              type: 'text',
              autoFocus: true,
              maxLength: 40,
              value: d.saveModalDraft.label,
              onChange: function(e) { upd('saveModalDraft', { label: e.target.value }); },
              onKeyDown: function(e) {
                if (e.key === 'Enter') saveCurrentAsScenario(d.saveModalDraft.label);
                else if (e.key === 'Escape') upd('saveModalDraft', null);
              },
              'aria-label': __alloT('stem.skatelab.custom_scenario_name_max_40_characters', 'Custom scenario name (max 40 characters)'),
              placeholder: __alloT('stem.skatelab.e_g_ramp_out_back_or_wind_tunnel_test', 'e.g., "Ramp out back" or "Wind tunnel test"'),
              'data-sk-focusable': 'true',
              style: {
                width: '100%', padding: '8px 12px', fontSize: 13,
                background: 'var(--allo-stem-canvas, #0f172a)', color: 'var(--allo-stem-text, #fef3c7)',
                border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 8,
                marginBottom: 14, boxSizing: 'border-box'
              }
            }),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { upd('saveModalDraft', null); },
                'data-sk-focusable': 'true',
                style: {
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                  border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 8, cursor: 'pointer', minHeight: 32
                }
              }, __alloT('stem.skatelab.cancel_2', 'Cancel')),
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
              }, __alloT('stem.skatelab.save', '💾 Save'))
            )
          )
        ),
        // Accessible confirmation dialog for destructive or consequential actions.
        d.confirmAction && h('div', {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'sk-confirm-title',
          'aria-describedby': 'sk-confirm-description',
          onKeyDown: function(e) { _dialogKeyDown(e, function() { upd('confirmAction', null); }); },
          onClick: function(e) { if (e.target === e.currentTarget) upd('confirmAction', null); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: 'var(--allo-stem-panel, #1e293b)',
              border: '2px solid #dc2626',
              borderRadius: 14, padding: 20, maxWidth: 420, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', {
              id: 'sk-confirm-title',
              style: { margin: '0 0 8px', color: '#fecaca', fontSize: 17, fontWeight: 900 }
            }, d.confirmAction.title),
            h('p', {
              id: 'sk-confirm-description',
              style: { margin: '0 0 16px', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 13, lineHeight: 1.55 }
            }, d.confirmAction.message),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() { upd('confirmAction', null); },
                autoFocus: true,
                'data-sk-focusable': 'true',
                style: {
                  padding: '9px 15px', minHeight: 40, borderRadius: 8,
                  border: '1px solid var(--allo-stem-border, #64748b)',
                  background: 'transparent', color: 'var(--allo-stem-text, #e2e8f0)',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer'
                }
              }, 'Cancel'),
              h('button', {
                onClick: _completeConfirmAction,
                'data-sk-focusable': 'true',
                style: {
                  padding: '9px 15px', minHeight: 40, borderRadius: 8,
                  border: '1px solid #991b1b',
                  background: '#b91c1c', color: '#fff',
                  fontSize: 12, fontWeight: 900, cursor: 'pointer'
                }
              }, d.confirmAction.confirmLabel)
            )
          )
        ),
        // ── Reset confirm modal ─────────────────────────────────
        d.resetConfirmOpen && h('div', {
          role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-reset-title',
          onKeyDown: function(e) { _dialogKeyDown(e, function() { upd('resetConfirmOpen', false); }); },
          onClick: function(e) { if (e.target === e.currentTarget) upd('resetConfirmOpen', false); },
          style: {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }
        },
          h('div', {
            style: {
              background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid #b91c1c', borderRadius: 14,
              padding: 20, maxWidth: 380, width: '100%'
            },
            onClick: function(e) { e.stopPropagation(); }
          },
            h('h3', { id: 'sk-reset-title', style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 15, fontWeight: 800 } }, __alloT('stem.skatelab.reset_skatelab_stats', '🗑 Reset SkateLab stats?')),
            h('p', { style: { margin: '0 0 14px', fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
              __alloT('stem.skatelab.this_clears_your_landings_bails_person', 'This clears your landings, bails, personal bests, and quest progress for SkateLab only. Your custom scenarios are kept. This cannot be undone.')),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
              h('button', {
                onClick: function() { upd('resetConfirmOpen', false); },
                'data-sk-focusable': 'true',
                style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 8, cursor: 'pointer', minHeight: 32 }
              }, __alloT('stem.skatelab.cancel_3', 'Cancel')),
              h('button', {
                onClick: performResetStats,
                'data-sk-focusable': 'true',
                style: { padding: '8px 16px', fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg,#b91c1c,#7f1d1d)', color: '#fef3c7', border: '1px solid #991b1b', borderRadius: 8, cursor: 'pointer', minHeight: 32 }
              }, __alloT('stem.skatelab.reset', '🗑 Reset'))
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
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6, flexWrap: 'wrap' } },
          // Safety chip — amber until acknowledged this session,
          // green ✓ pill after. Click reveals the disclaimer text
          // inline below the toggle row. Re-anchors per session
          // (no localStorage), which is the design.
          h('button', {
            onClick: function() {
              upd('safetyAck', !d.safetyAck);
              skAnnounce(d.safetyAck ? 'Safety message shown again.' : 'Safety acknowledged. Wear gear when you skate.');
            },
            'aria-pressed': !!d.safetyAck,
            'aria-label': d.safetyAck ? 'Safety acknowledged this session. Click to re-read the message.' : 'Safety message — click to read about real-world skate risks.',
            'data-sk-focusable': 'true',
            title: __alloT('stem.skatelab.real_world_safety_reminder', 'Real-world safety reminder'),
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: d.safetyAck ? 'rgba(34,197,94,0.18)' : 'rgba(251,191,36,0.20)',
              color: d.safetyAck ? '#86efac' : '#fbbf24',
              border: '1px solid ' + (d.safetyAck ? 'rgba(34,197,94,0.55)' : 'rgba(251,191,36,0.55)'),
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, d.safetyAck ? '✓ Safety ack\'d' : '⚠️ Safety'),
          // Tour re-open chip — for students who skipped or want a
          // refresher. Subtle by default; doesn't compete for
          // attention with the safety chip.
          h('button', {
            onClick: function() { upd({ tour: { open: true, step: 0, seen: !!(d.tour && d.tour.seen) } }); },
            'aria-label': __alloT('stem.skatelab.open_the_skatelab_tour', 'Open the SkateLab tour'),
            'data-sk-focusable': 'true',
            title: (d.tour && d.tour.seen)
              ? __alloT('stem.skatelab.re_open_the_5_step_tour', 'Re-open the 5-step tour')
              : __alloT('stem.skatelab.start_the_5_step_tour', 'Start the 5-step tour'),
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: 'rgba(254,243,199,0.14)', color: 'var(--allo-stem-text, #cbd5e1)',
              border: '1px solid rgba(254,243,199,0.55)',
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, (d.tour && d.tour.seen)
            ? __alloT('stem.skatelab.tour', '💡 Tour')
            : __alloT('stem.skatelab.start_tour', '💡 Start tour')),
          // Mute toggle — gates every skTone call. Persists in
          // localStorage so a teacher who silences the classroom
          // doesn't have to re-mute every reload. Also bound to 'M'.
          h('button', {
            onClick: toggleMuteUI,
            'aria-pressed': muted,
            'aria-label': muted ? 'Sound off. Press to unmute.' : 'Sound on. Press to mute.',
            'data-sk-focusable': 'true',
            title: __alloT('stem.skatelab.mute_unmute_m_key', 'Mute / unmute (Alt+M)'),
            'aria-keyshortcuts': 'Alt+M',
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: muted ? 'rgba(251,191,36,0.20)' : 'rgba(254,243,199,0.14)',
              color: muted ? '#fbbf24' : '#94a3b8',
              border: '1px solid ' + (muted ? 'rgba(251,191,36,0.55)' : 'rgba(254,243,199,0.55)'),
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, muted ? '🔇 Muted' : '🔊 Sound'),
          h('button', {
            onClick: function() { upd('showFormula', !d.showFormula); skAnnounce(d.showFormula ? 'Formula panel hidden.' : 'Formula panel shown.'); },
            'aria-pressed': !!d.showFormula,
            'aria-label': d.showFormula ? 'Hide live formula panel' : 'Show live formula panel',
            'data-sk-focusable': 'true',
            title: __alloT('stem.skatelab.toggle_the_live_equation_that_updates_', 'Toggle the live equation that updates as you change settings'),
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: d.showFormula ? 'rgba(56,189,248,0.18)' : 'rgba(254,243,199,0.14)',
              color: d.showFormula ? '#7dd3fc' : '#94a3b8',
              border: '1px solid ' + (d.showFormula ? 'rgba(56,189,248,0.50)' : 'rgba(254,243,199,0.55)'),
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, '📐 Formula: ' + (d.showFormula ? 'on' : 'off')),
          // Ghost toggle — flip the faded best-run trajectory on/off
          // in the canvas. Default on. Only meaningful once a best
          // run exists; chip stays clickable but visually quieter
          // when there's no ghost yet for the current mode.
          (function() {
            var hasGhost = !!(d.bestSimGhost && d.bestSimGhost[d.mode]);
            var on = d.showGhost !== false;
            return h('button', {
              onClick: function() {
                upd('showGhost', !on);
                skAnnounce(on ? 'Ghost trajectory hidden.' : 'Ghost trajectory shown.');
              },
              'aria-pressed': on,
              'aria-label': on ? 'Hide best-run ghost' : 'Show best-run ghost',
              'data-sk-focusable': 'true',
              title: hasGhost ? 'Toggle the faded best-run trajectory in the canvas' : 'Land an attempt to set your first ghost',
              style: {
                padding: '4px 10px', fontSize: 10, fontWeight: 700,
                background: on && hasGhost ? 'rgba(168,85,247,0.20)' : 'rgba(254,243,199,0.14)',
                color: on && hasGhost ? '#c4b5fd' : '#94a3b8',
                border: '1px solid ' + (on && hasGhost ? 'rgba(168,85,247,0.55)' : 'rgba(254,243,199,0.55)'),
                borderRadius: 20, cursor: 'pointer', minHeight: 26,
                opacity: hasGhost ? 1 : 0.65
              }
            }, '👻 Ghost: ' + (on ? 'on' : 'off'));
          })(),
          // Energy bar toggle — shows live KE / PE during animation.
          // Default on. Independent of formula panel since this is
          // mid-attempt visualization, not pre-attempt math.
          h('button', {
            onClick: function() {
              upd('showEnergyBar', !d.showEnergyBar);
              skAnnounce(d.showEnergyBar ? 'Energy bar hidden.' : 'Energy bar shown.');
            },
            'aria-pressed': !!d.showEnergyBar,
            'aria-label': d.showEnergyBar ? 'Hide live energy bar' : 'Show live energy bar',
            'data-sk-focusable': 'true',
            title: __alloT('stem.skatelab.toggle_the_live_ke_pe_energy_bar_that_', 'Toggle the live KE / PE energy bar that updates during the animation'),
            style: {
              padding: '4px 10px', fontSize: 10, fontWeight: 700,
              background: d.showEnergyBar ? 'rgba(248,113,113,0.18)' : 'rgba(254,243,199,0.14)',
              color: d.showEnergyBar ? '#fda4af' : '#94a3b8',
              border: '1px solid ' + (d.showEnergyBar ? 'rgba(248,113,113,0.50)' : 'rgba(254,243,199,0.55)'),
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, '⚡ Energy: ' + (d.showEnergyBar ? 'on' : 'off')),
          // Session chip — when no session is active, opens the
          // start prompt. When active, shows progress (e.g. 3/5)
          // and lets the student tap to end early or view stats.
          (function() {
            var sess = d.session || {};
            if (sess.active) {
              return h('button', {
                onClick: function() {
                  upd('confirmAction', {
                    type: 'endSession',
                    title: 'End session early?',
                    message: 'Your ' + (sess.attempts || []).length + ' of ' + sess.target + ' attempts will still be saved.',
                    confirmLabel: 'End and save'
                  });
                },
                'aria-label': 'Session in progress: ' + (sess.attempts || []).length + ' of ' + sess.target + '. Click to end early.',
                'data-sk-focusable': 'true',
                title: __alloT('stem.skatelab.end_session_early', 'End session early'),
                style: {
                  padding: '4px 10px', fontSize: 10, fontWeight: 800,
                  background: 'linear-gradient(135deg,#22c55e,#15803d)',
                  color: '#fff',
                  border: '1px solid #15803d',
                  borderRadius: 20, cursor: 'pointer', minHeight: 26
                }
              }, '🎯 ' + (sess.attempts || []).length + '/' + sess.target);
            }
            return h('button', {
              onClick: function() {
                upd({ session: Object.assign({}, sess, { startPromptOpen: true }) });
              },
              'aria-label': __alloT('stem.skatelab.start_a_park_session_string_several_at', 'Start a park session — string several attempts together'),
              'data-sk-focusable': 'true',
              title: __alloT('stem.skatelab.run_a_park_session_aggregate_stats_acr', 'Run a park session — aggregate stats across N attempts'),
              style: {
                padding: '4px 10px', fontSize: 10, fontWeight: 700,
                background: 'rgba(34,197,94,0.10)', color: '#86efac',
                border: '1px solid rgba(34,197,94,0.40)',
                borderRadius: 20, cursor: 'pointer', minHeight: 26
              }
            }, __alloT('stem.skatelab.session', '🎯 Session'));
          })()
        ),
        // ── Safety expansion ─────────────────────────────────────
        // Renders ONLY while safetyAck is false (initial state each
        // session). Tapping the chip flips ack → true and this card
        // collapses. Tapping the green ✓ chip flips ack → false and
        // the message comes back so students can re-read.
        !d.safetyAck && h('div', {
          role: 'note',
          'aria-label': __alloT('stem.skatelab.real_world_safety_reminder_2', 'Real-world safety reminder'),
          style: {
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.45)',
            borderRadius: 10, padding: '10px 12px',
            marginBottom: 10,
            fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.55
          }
        },
          h('div', { style: { fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, __alloT('stem.skatelab.this_is_a_simulation_real_skating_isn_', '⚠️ This is a simulation. Real skating isn\'t.')),
          h('div', null,
            __alloT('stem.skatelab.skateboarding_is_the_leading_cause_of_', 'Skateboarding is the leading cause of pediatric extremity fractures (CDC). The math here is the same in real life — the consequences aren\'t. Wear a '),
            h('b', null, __alloT('stem.skatelab.helmet_wrist_guards_and_pads', 'helmet, wrist guards, and pads')),
            __alloT('stem.skatelab.skate_within_your_ability_and_learn_fa', ', skate within your ability, and learn falls before tricks. Tap the ✓ chip when you\'ve read this.')
          ),
          h('button', {
            onClick: function() { upd('safetyAck', true); skAnnounce('Safety acknowledged. Wear gear when you skate.'); },
            'aria-label': __alloT('stem.skatelab.acknowledge_safety_message', 'Acknowledge safety message'),
            'data-sk-focusable': 'true',
            style: {
              marginTop: 8,
              padding: '6px 14px', fontSize: 11, fontWeight: 800,
              background: 'linear-gradient(135deg,#22c55e,#15803d)',
              color: '#fff', border: '1px solid #15803d',
              borderRadius: 20, cursor: 'pointer', minHeight: 28
            }
          }, __alloT('stem.skatelab.got_it_wear_gear_in_real_life', '✓ Got it — wear gear in real life'))
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
          var totalMass = RIDER_KG + vehicle.mass;
          var inputEnergy = 0.5 * totalMass * vTakeoff * vTakeoff;
          var mechanicalEnergy = surface.efficiency * inputEnergy;
          var thermalEnergy = inputEnergy - mechanicalEnergy;
          var hAir = mechanicalEnergy / (totalMass * g);
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
            // Phase: derive a stable key from the label so the array-form
            // children below don't trigger React's missing-key warning.
            // Labels start with "1.", "2.", etc. so they're already unique
            // within both the halfpipe and gap-jump branches.
            return h('div', {
              key: 'eq-' + label,
              style: { fontFamily: 'monospace', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 4 }
            },
              h('span', { style: { color: '#7dd3fc', fontWeight: 700, marginRight: 6 } }, label),
              expr,
              h('span', { style: { color: '#86efac', marginLeft: 4 } }, '= '),
              h('b', { style: { color: '#fbbf24' } }, value),
              unit ? h('span', { style: { color: 'var(--allo-stem-text, #cbd5e1)', marginLeft: 2 } }, ' ' + unit) : null
            );
          };
          return h('div', {
            role: 'region',
            'aria-label': __alloT('stem.skatelab.live_physics_equations', 'Live physics equations'),
            style: {
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.40)',
              borderRadius: 10, padding: 12, marginBottom: 12
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: '#7dd3fc', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 } }, '📐 Live equation' + (d.mode === 'halfpipe' ? ' — Energy chain' : ' — Projectile motion')),
            d.mode === 'halfpipe' ? [
              Eq('1. Takeoff speed',
                'v = v₀ + (pumps × pump-eff) = 4.0 + (' + d.pumps + ' × ' + vehicle.pumpEfficiency.toFixed(2) + ')',
                vTakeoff.toFixed(2), 'm/s'),
              Eq('2. Energy ledger',
                'input = ½mv²; mechanical = η·input; thermal = (1−η)·input',
                Math.round(mechanicalEnergy) + ' J mechanical + ' + Math.round(thermalEnergy), 'J thermal = ' + Math.round(inputEnergy) + ' J input'),
              Eq('3. Air height',
                'h = E_mechanical / (mg) = ' + mechanicalEnergy.toFixed(0) + ' / (' + totalMass.toFixed(0) + ' · ' + g.toFixed(2) + ')',
                hAir.toFixed(3), 'm  (' + (hAir * M2FT).toFixed(2) + ' ft)'),
              Eq('4. Hang time',
                't = 2·√(2h/g) = 2·√(2·' + hAir.toFixed(3) + '/' + g.toFixed(2) + ')',
                airTime.toFixed(3), 's'),
              Eq('5. Rotation budget',
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
        d.mode === 'halfpipe' && h('div', { className: 'sk-control-grid', style: { marginBottom: 12 } },
          h('div', { style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-pumps' }, '⚡ Pumps: ' + d.pumps),
            h('input', {
              id: 'sk-pumps', type: 'range', min: 0, max: 6, value: d.pumps,
              onChange: function(e) { upd('pumps', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            }),
            h('p', { style: { margin: '6px 0 0', fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', fontStyle: 'italic' } },
              __alloT('stem.skatelab.each_pump_adds_kinetic_energy_ke_pe_at', 'Each pump adds kinetic energy. KE → PE at the lip. More pumps = more air.'))
          ),
          h('div', { style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' } }, __alloT('stem.skatelab.trick', '🛹 Trick')),
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
                    background: sel ? '#92400e' : 'rgba(254,243,199,0.10)',
                    color: sel ? '#fff' : '#fef3c7',
                    border: '1px solid ' + (sel ? '#fbbf24' : 'rgba(254,243,199,0.55)'),
                    borderRadius: 6, cursor: d.running ? 'not-allowed' : 'pointer'
                  }
                }, tk.emoji + ' ' + tk.label);
              })
            ),
            // Trick-demand chart — required air time (s) per trick; harder tricks need more air.
            (function() {
              var maxAir = Math.max.apply(null, TRICKS.map(function(t) { return t.minAir; })) || 1;
              return h('div', { style: { marginTop: 8 } },
                h('div', { style: { fontSize: 9, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 } }, __alloT('stem.skatelab.air_time_each_trick_needs', 'Air time each trick needs')),
                TRICKS.slice().sort(function(a, b) { return a.minAir - b.minAir; }).map(function(tk) {
                  var sel = d.trickId === tk.id;
                  return h('div', { key: tk.id, style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                    h('span', { style: { width: 86, fontSize: 10, color: sel ? '#fbbf24' : '#fef3c7', fontWeight: sel ? 800 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, tk.emoji + ' ' + tk.label),
                    h('div', { style: { flex: 1, height: 9, background: 'rgba(254,243,199,0.10)', borderRadius: 3, overflow: 'hidden' } },
                      h('div', { style: { height: '100%', width: (tk.minAir / maxAir * 100) + '%', background: sel ? '#d97706' : 'rgba(251,191,36,0.55)', borderRadius: 3 } })),
                    h('span', { style: { width: 36, textAlign: 'right', fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' } }, tk.minAir.toFixed(2) + 's'));
                })
              );
            })(),
            // ── Custom-trick second row ──────────────────────────
            // Renders student-invented tricks as purple pills with
            // an inline × delete button. Visually distinct from the
            // built-in row (purple vs amber) so students see their
            // creations and the canon side-by-side.
            ((d.customTricks || []).length > 0) && h('div', {
              style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 },
              role: 'group',
              'aria-label': __alloT('stem.skatelab.your_invented_tricks', 'Your invented tricks')
            },
              (d.customTricks || []).map(function(tk) {
                var sel = d.trickId === tk.id;
                return h('span', {
                  key: tk.id,
                  style: {
                    display: 'inline-flex', alignItems: 'center', gap: 2,
                    background: sel ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'rgba(168,85,247,0.12)',
                    color: sel ? '#fff' : '#e9d5ff',
                    border: '1px solid ' + (sel ? '#7c3aed' : 'rgba(168,85,247,0.40)'),
                    borderRadius: 6, padding: '2px 4px 2px 8px',
                    cursor: d.running ? 'not-allowed' : 'pointer',
                    opacity: d.running ? 0.6 : 1
                  }
                },
                  h('button', {
                    onClick: function() { upd('trickId', tk.id); skAnnounce('Selected ' + tk.label); },
                    disabled: d.running,
                    'aria-pressed': sel,
                    'data-sk-focusable': 'true',
                    title: tk.label + ' (custom) — ' + tk.rotation + '° ' + tk.axis + ' axis · needs ' + tk.minAir.toFixed(2) + 's air',
                    style: {
                      background: 'transparent', color: 'inherit',
                      border: 'none', padding: '2px 4px',
                      fontSize: 11, fontWeight: 700, cursor: 'inherit'
                    }
                  }, tk.emoji + ' ' + tk.label),
                  h('button', {
                    onClick: function() {
                      if (d.running) return;
                      upd('confirmAction', {
                        type: 'deleteTrick',
                        id: tk.id,
                        title: 'Delete custom trick?',
                        message: 'Remove "' + tk.label + '" from Trick Lab? Its mastery history will also be removed.',
                        confirmLabel: 'Delete trick'
                      });
                    },
                    disabled: d.running,
                    'aria-label': 'Delete custom trick ' + tk.label,
                    'data-sk-focusable': 'true',
                    title: __alloT('stem.skatelab.delete_this_custom_trick', 'Delete this custom trick'),
                    style: {
                      background: 'rgba(0,0,0,0.30)', color: '#fef3c7',
                      border: 'none', borderRadius: 4,
                      padding: '0 4px', fontSize: 11, fontWeight: 800,
                      cursor: d.running ? 'not-allowed' : 'pointer',
                      minWidth: 18, minHeight: 18, lineHeight: '16px'
                    }
                  }, '×')
                );
              })
            ),
            h('p', { style: { margin: '6px 0 0', fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)' } },
              (function() {
                var t = findAnyTrick(d.trickId);
                return 'Selected: ' + t.rotation + '° rotation · needs ≥ ' + t.minAir.toFixed(2) + 's air' + (t.isCustom ? ' (custom)' : '');
              })()),
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
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 8,
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
                      h('span', { style: { marginLeft: 'auto', fontSize: 10, padding: '1px 6px', background: 'rgba(15,23,42,0.5)', color: m.color, borderRadius: 20, border: '1px solid ' + m.color, fontWeight: 800 } }, m.icon + ' ' + m.label)
                    ),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', display: 'flex', justifyContent: 'space-between', gap: 4, fontFamily: 'monospace' } },
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
              }, __alloT('stem.skatelab.trick_lore_origin_physics_pro_tip', '📖 Trick Lore — origin, physics, pro tip')),
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
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 4 } },
                      h('div', null, h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.origin', '🛹 Origin: ')), tk.lore.origin),
                      h('div', null, h('b', { style: { color: '#7dd3fc' } }, __alloT('stem.skatelab.physics', '📐 Physics: ')), tk.lore.physics),
                      h('div', null, h('b', { style: { color: '#86efac' } }, __alloT('stem.skatelab.pro_tip', '💡 Pro tip: ')), tk.lore.proTip)
                    )
                  );
                })
              )
            ),
            // ── Trick Lab ────────────────────────────────────────
            // Student-creativity surface. Form fields drive an
            // auto-derived physics preview (minAir + difficulty +
            // formula) using deriveTrickPhysics. On save, the trick
            // joins customTricks and the picker selects it.
            // Closed by default — students who don't care about
            // inventing tricks aren't crowded.
            h('details', { style: { marginTop: 8 } },
              h('summary', {
                style: {
                  cursor: 'pointer', color: '#c4b5fd', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
                  padding: '4px 0', userSelect: 'none'
                }
              }, __alloT('stem.skatelab.trick_lab_invent_your_own_move', '🧪 Trick Lab — invent your own move')),
              h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 } },
                // Inline safety note — heavier than the chip because
                // experimentation is where over-eager students think
                // "what if I tried this on the real ramp."
                h('div', {
                  role: 'note',
                  style: {
                    background: 'rgba(245,158,11,0.10)',
                    border: '1px solid rgba(245,158,11,0.45)',
                    borderRadius: 8, padding: '8px 10px',
                    fontSize: 11, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.5
                  }
                },
                  h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.real_world_safety', '⚠️ Real-world safety: ')),
                  __alloT('stem.skatelab.inventing_tricks_here_is_creativity_in', 'Inventing tricks here is creativity. Inventing them on a real ramp without gear is hospital math. The simulator has zero risk; the real world doesn\'t. Always wear a helmet, wrist guards, and pads.')
                ),
                // Form: name + emoji
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 } },
                  h('div', null,
                    h('label', { htmlFor: 'sk-tl-name', style: { display: 'block', fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, __alloT('stem.skatelab.name', 'Name')),
                    h('input', {
                      id: 'sk-tl-name',
                      type: 'text',
                      maxLength: 30,
                      value: (d.trickLabDraft && d.trickLabDraft.name) || '',
                      onChange: function(e) {
                        upd('trickLabDraft', Object.assign({}, d.trickLabDraft, { name: e.target.value }));
                      },
                      placeholder: __alloT('stem.skatelab.e_g_tail_dragger', 'e.g. Tail Dragger'),
                      'data-sk-focusable': 'true',
                      style: {
                        width: '100%', padding: '6px 10px', fontSize: 12, fontWeight: 600,
                        background: 'var(--allo-stem-canvas, #0f172a)', color: 'var(--allo-stem-text, #fef3c7)',
                        border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 6,
                        boxSizing: 'border-box', minHeight: 32
                      }
                    })
                  ),
                  h('div', null,
                    h('label', { htmlFor: 'sk-tl-emoji', style: { display: 'block', fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, __alloT('stem.skatelab.emoji', 'Emoji')),
                    h('input', {
                      id: 'sk-tl-emoji',
                      type: 'text',
                      maxLength: 4,
                      value: (d.trickLabDraft && d.trickLabDraft.emoji) || '🌟',
                      onChange: function(e) {
                        upd('trickLabDraft', Object.assign({}, d.trickLabDraft, { emoji: e.target.value }));
                      },
                      placeholder: '🌟',
                      'aria-label': __alloT('stem.skatelab.trick_emoji', 'Trick emoji'),
                      'data-sk-focusable': 'true',
                      style: {
                        width: 64, padding: '6px 10px', fontSize: 16, fontWeight: 600,
                        background: 'var(--allo-stem-canvas, #0f172a)', color: 'var(--allo-stem-text, #fef3c7)',
                        border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 6,
                        textAlign: 'center', boxSizing: 'border-box', minHeight: 32
                      }
                    })
                  )
                ),
                // Rotation slider
                (function() {
                  var rot = (d.trickLabDraft && typeof d.trickLabDraft.rotation === 'number') ? d.trickLabDraft.rotation : 360;
                  return h('div', null,
                    h('label', { htmlFor: 'sk-tl-rot', style: { display: 'block', fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Rotation: ' + rot + '°'),
                    h('input', {
                      id: 'sk-tl-rot',
                      type: 'range', min: 0, max: 1080, step: 90,
                      value: rot,
                      onChange: function(e) {
                        upd('trickLabDraft', Object.assign({}, d.trickLabDraft, { rotation: parseInt(e.target.value) }));
                      },
                      'data-sk-focusable': 'true',
                      style: { width: '100%' }
                    })
                  );
                })(),
                // Axis radio pills
                h('div', null,
                  h('div', { style: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, __alloT('stem.skatelab.axis', 'Axis')),
                  h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.rotation_axis', 'Rotation axis'), style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                    [
                      { id: 'board', label: __alloT('stem.skatelab.board', 'Board'), icon: '🛹', desc: __alloT('stem.skatelab.fastest_spin_1500_s_flips', 'fastest spin (1500°/s) — flips') },
                      { id: 'body',  label: __alloT('stem.skatelab.body', 'Body'),  icon: '🌀', desc: __alloT('stem.skatelab.medium_spin_1000_s_full_body_rotations', 'medium spin (1000°/s) — full-body rotations') },
                      { id: 'combo', label: __alloT('stem.skatelab.combo', 'Combo'), icon: '✨', desc: __alloT('stem.skatelab.slowest_800_s_both_axes_at_once', 'slowest (800°/s) — both axes at once') }
                    ].map(function(opt) {
                      var sel = (d.trickLabDraft && d.trickLabDraft.axis) === opt.id;
                      return h('button', {
                        key: 'axis-' + opt.id,
                        id: 'sk-axis-' + opt.id,
                        onClick: function() { upd('trickLabDraft', Object.assign({}, d.trickLabDraft, { axis: opt.id })); },
                        onKeyDown: function(e) {
                          _radioKeyDown(e, ['board', 'body', 'combo'], (d.trickLabDraft && d.trickLabDraft.axis) || 'board', function(nextId) {
                            upd('trickLabDraft', Object.assign({}, d.trickLabDraft, { axis: nextId }));
                          }, 'sk-axis-');
                        },
                        disabled: !!d.running,
                        role: 'radio',
                        'aria-checked': sel,
                        tabIndex: sel ? 0 : -1,
                        'data-sk-focusable': 'true',
                        title: opt.desc,
                        style: {
                          padding: '6px 12px', fontSize: 11, fontWeight: 700,
                          background: sel ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'rgba(168,85,247,0.10)',
                          color: sel ? '#fff' : '#e9d5ff',
                          border: '1px solid ' + (sel ? '#7c3aed' : 'rgba(168,85,247,0.40)'),
                          borderRadius: 20, cursor: 'pointer', minHeight: 32
                        }
                      }, opt.icon + ' ' + opt.label);
                    })
                  )
                ),
                // Live preview card
                (function() {
                  var draft = d.trickLabDraft || { rotation: 360, axis: 'body' };
                  var phys = deriveTrickPhysics(draft);
                  return h('div', {
                    role: 'region',
                    'aria-label': __alloT('stem.skatelab.trick_physics_preview', 'Trick physics preview'),
                    style: {
                      background: 'rgba(168,85,247,0.10)',
                      border: '1px solid rgba(168,85,247,0.45)',
                      borderRadius: 10, padding: '8px 10px',
                      fontSize: 11, color: '#e9d5ff', lineHeight: 1.6,
                      fontFamily: 'monospace'
                    }
                  },
                    h('div', null, h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.min_air', '📐 Min air: ')), phys.minAir.toFixed(2) + 's · ', h('b', { style: { color: '#fbbf24' } }, 'Difficulty: '), phys.difficulty + '/12'),
                    h('div', null, h('b', { style: { color: '#7dd3fc' } }, __alloT('stem.skatelab.formula', '💡 Formula: ')), phys.formula),
                    phys.equivalent && h('div', null, h('b', { style: { color: '#86efac' } }, __alloT('stem.skatelab.closest_built_in', '🛹 Closest built-in: ')), phys.equivalent.emoji + ' ' + phys.equivalent.label + ' (' + phys.equivalent.rotation + '°)')
                  );
                })(),
                // Action buttons
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() { saveCustomTrick(d.trickLabDraft || {}); },
                    'data-sk-focusable': 'true',
                    style: {
                      flex: '1 1 auto', padding: '8px 16px', fontSize: 12, fontWeight: 800,
                      background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                      color: '#fff', border: '1px solid #7c3aed',
                      borderRadius: 8, cursor: 'pointer', minHeight: 36
                    }
                  }, __alloT('stem.skatelab.save_select', '💾 Save & Select')),
                  h('button', {
                    onClick: function() {
                      upd('trickLabDraft', { name: '', emoji: '🌟', rotation: 360, axis: 'body' });
                      skAnnounce('Trick Lab form reset.');
                    },
                    'data-sk-focusable': 'true',
                    style: {
                      padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                      border: '1px solid rgba(148,163,184,0.40)',
                      borderRadius: 8, cursor: 'pointer', minHeight: 36
                    }
                  }, __alloT('stem.skatelab.reset_form', '🔄 Reset Form'))
                )
              )
            )
          )
        ),
        d.mode === 'gap' && h('div', { className: 'sk-gap-control-grid', style: { marginBottom: 12 } },
          h('div', { style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-speed' }, '🚀 Speed: ' + d.speedMph + ' mph'),
            h('input', {
              id: 'sk-speed', type: 'range', min: 5, max: 30, value: d.speedMph,
              onChange: function(e) { upd('speedMph', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            })
          ),
          h('div', { style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 10, padding: 12 } },
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }, htmlFor: 'sk-angle' }, '📐 Angle: ' + d.angleDeg + '°'),
            h('input', {
              id: 'sk-angle', type: 'range', min: 15, max: 60, value: d.angleDeg,
              onChange: function(e) { upd('angleDeg', parseInt(e.target.value)); },
              disabled: d.running,
              'data-sk-focusable': 'true',
              style: { width: '100%' }
            })
          ),
          h('div', { style: { background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #475569)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' } }, '↔️ Gap: ' + d.gapFt + ' ft'),
            h('button', {
              onClick: newGap, disabled: d.running,
              'data-sk-focusable': 'true',
              style: { marginTop: 8, padding: '6px 10px', background: 'rgba(254,243,199,0.10)', color: 'var(--allo-stem-text, #fef3c7)', border: '1px solid rgba(254,243,199,0.30)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
            }, __alloT('stem.skatelab.new_gap', '🎲 New Gap'))
          )
        ),
        // Wind picker — gap-jump only. Mirrors the surface picker.
        // Adds horizontal acceleration during flight; tailwind helps,
        // headwind hurts. Shows up below the speed/angle/gap row so
        // it's clearly an environmental modifier, not a control.
        d.mode === 'gap' && h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.wind_condition', 'Wind condition'), style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' } },
          WIND_PRESETS.map(function(wp) {
            var sel = (d.windId || 'calm') === wp.id;
            return h('button', {
              key: 'wp-' + wp.id,
              id: 'sk-wind-' + wp.id,
              onClick: function() { upd('windId', wp.id); skAnnounce('Wind: ' + wp.label + '. ' + wp.blurb); },
              onKeyDown: function(e) {
                _radioKeyDown(e, WIND_PRESETS.map(function(item) { return item.id; }), d.windId || 'calm', function(nextId) {
                  upd('windId', nextId);
                  var nextWind = getWind(nextId);
                  skAnnounce('Wind: ' + nextWind.label + '. ' + nextWind.blurb);
                }, 'sk-wind-');
              },
              disabled: !!d.running,
              role: 'radio',
              'aria-checked': sel,
              tabIndex: sel ? 0 : -1,
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
                  : 'rgba(254,243,199,0.55)'),
                borderRadius: 20, cursor: 'pointer'
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
                title: __alloT('stem.skatelab.predict_then_verify_builds_the_physics', 'Predict, then verify. Builds the physics intuition.'),
                style: {
                  padding: '4px 10px', fontSize: 10, fontWeight: 700,
                  background: d.predictMode ? 'rgba(168,85,247,0.20)' : 'rgba(254,243,199,0.14)',
                  color: d.predictMode ? '#d8b4fe' : '#94a3b8',
                  border: '1px solid ' + (d.predictMode ? 'rgba(168,85,247,0.55)' : 'rgba(254,243,199,0.55)'),
                  borderRadius: 20, cursor: 'pointer', minHeight: 26
                }
              }, '🔮 Predict: ' + (d.predictMode ? 'on' : 'off'))
            ),
            d.predictMode && h('div', {
              role: 'region',
              'aria-label': __alloT('stem.skatelab.prediction_input', 'Prediction input'),
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
                  required: true,
                  'aria-required': 'true',
                  'aria-invalid': trimmed !== '' && !predValid ? 'true' : undefined,
                  value: d.predictionInput || '',
                  onChange: function(e) { upd('predictionInput', e.target.value); },
                  disabled: d.running,
                  'data-sk-focusable': 'true',
                  'aria-describedby': trimmed !== '' && !predValid ? 'sk-predict-hint sk-predict-error' : 'sk-predict-hint',
                  placeholder: '0.0',
                  style: {
                    width: 90, padding: '6px 8px', fontSize: 13, fontWeight: 700,
                    background: 'var(--allo-stem-canvas, #0f172a)', color: 'var(--allo-stem-text, #fef3c7)',
                    border: '1px solid ' + (predValid ? '#a855f7' : '#475569'),
                    borderRadius: 6
                  }
                }),
                h('span', { id: 'sk-predict-hint', style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', flex: 1, minWidth: 180 } }, hint),
                trimmed !== '' && !predValid && h('span', {
                  id: 'sk-predict-error',
                  role: 'alert',
                  style: { width: '100%', color: '#fca5a5', fontSize: 11, fontWeight: 700 }
                }, 'Enter a prediction of zero or greater.')
              ),
              ps.count > 0 && h('div', { style: { fontSize: 10, color: '#c4b5fd', display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(168,85,247,0.25)' } },
                h('span', null, '📊 ', h('b', null, ps.count), ' prediction' + (ps.count === 1 ? '' : 's')),
                avgErr !== null && h('span', null, __alloT('stem.skatelab.avg_off', '⌀ avg off: '), h('b', { style: { color: '#fbbf24' } }, avgErr.toFixed(1) + '%')),
                ps.bestPct !== null && h('span', null, __alloT('stem.skatelab.best', '🏆 best: '), h('b', { style: { color: '#86efac' } }, ps.bestPct.toFixed(1) + '%')),
                h('span', null, __alloT('stem.skatelab.within_10', '🎯 within 10%: '), h('b', { style: { color: '#86efac' } }, (ps.withinTen || 0) + '/' + ps.count))
              )
            )
          );
        })(),
        // Last-result analysis panel — pedagogically valuable, shows
        // the actual physics that produced what the student just saw.
        d.lastResult && h('div', { style: { background: d.lastResult.landed ? 'rgba(22,163,74,0.12)' : 'rgba(180,83,9,0.12)', border: '1px solid ' + (d.lastResult.landed ? '#22c55e' : '#d97706'), borderRadius: 10, padding: 12, marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
            h('div', { role: 'status', 'aria-atomic': 'true', style: { fontSize: 13, fontWeight: 800, color: d.lastResult.landed ? '#86efac' : '#fbbf24' } },
              d.lastResult.landed ? '✅ Clean landing — what made it work' : '💥 Bail — here\'s why'),
            // Slow-motion replay buttons — re-run the cached lastSim
            // at half / quarter speed. Disabled when an animation is
            // already in flight or there's no sim yet.
            d.lastSim && h('div', { style: { display: 'flex', gap: 4 } },
              [{ mul: 0.5, label: __alloT('stem.skatelab.0_5', '🎬 0.5×') }, { mul: 0.25, label: __alloT('stem.skatelab.0_25', '🐌 0.25×') }].map(function(opt) {
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
            ? h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, fontFamily: 'monospace' } },
                h('div', null, __alloT('stem.skatelab.takeoff_speed', '⚡ Takeoff speed: '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.vMph.toFixed(1) + ' mph')),
                h('div', null, __alloT('stem.skatelab.air_height_above_lip', '📈 Air height (above lip): '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.hFt.toFixed(2) + ' ft')),
                h('div', null, __alloT('stem.skatelab.hang_time', '⏱ Hang time: '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.airTime.toFixed(2) + ' s')),
                h('div', null, __alloT('stem.skatelab.rotation', '🌀 Rotation: '), h('b', { style: { color: '#fbbf24' } }, Math.round(d.lastResult.completed) + '° of ' + d.lastResult.rotation + '° needed')),
                d.lastResult.thermalJ != null && h('div', null, 'Heat transferred: ', h('b', { style: { color: '#fde047' } }, Math.round(d.lastResult.thermalJ) + ' J'), ' · ' + Math.round((d.lastResult.thermalJ / Math.max(1, d.lastResult.energyInputJ)) * 100) + '% of launch energy'),
                d.lastResult.errPct !== undefined && h('div', {
                  style: {
                    marginTop: 6, padding: '6px 8px', borderRadius: 6,
                    background: d.lastResult.errPct <= 10 ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                    border: '1px solid ' + (d.lastResult.errPct <= 10 ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                    color: d.lastResult.errPct <= 10 ? '#86efac' : '#d8b4fe'
                  }
                },
                  __alloT('stem.skatelab.predicted', '🔮 Predicted '), h('b', null, d.lastResult.predicted.toFixed(2) + ' ft'),
                  __alloT('stem.skatelab.actual', ' · Actual '), h('b', null, d.lastResult.actual.toFixed(2) + ' ft'),
                  __alloT('stem.skatelab.off', ' · Off '), h('b', null, d.lastResult.errPct.toFixed(1) + '%'),
                  d.lastResult.errPct <= 10 ? ' 🎯' : ''
                ),
                // Ghost delta row — only after at least one prior best
                d.lastResult.prevGhostHFt != null && (function() {
                  var delta = d.lastResult.hFt - d.lastResult.prevGhostHFt;
                  var beat = delta > 0;
                  return h('div', {
                    style: {
                      marginTop: 6, padding: '6px 8px', borderRadius: 6,
                      background: beat ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                      border: '1px solid ' + (beat ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                      color: beat ? '#86efac' : '#d8b4fe'
                    }
                  },
                    __alloT('stem.skatelab.vs_best_prev', '👻 vs best: prev '), h('b', null, d.lastResult.prevGhostHFt.toFixed(2) + ' ft'),
                    __alloT('stem.skatelab.str', ' · Δ '), h('b', null, (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' ft'),
                    d.lastResult.newBest ? ' 🏆 NEW BEST!' : ''
                  );
                })(),
                d.lastResult.landed && h('div', { style: { color: '#86efac', marginTop: 4 } }, '🏆 Score: ' + d.lastResult.score)
              )
            : h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, fontFamily: 'monospace' } },
                h('div', null, __alloT('stem.skatelab.takeoff', '🚀 Takeoff: '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.vMph + ' mph at ' + d.lastResult.angleDeg + '°')),
                h('div', null, __alloT('stem.skatelab.range_v_sin_2_g', '📐 Range = v² × sin(2θ) / g = '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.rangeFt.toFixed(2) + ' ft'), ' (needed ' + d.lastResult.gapFt + ' ft)'),
                d.lastResult.wind && d.lastResult.wind !== 'Calm' && h('div', null, __alloT('stem.skatelab.wind', '🌬️ Wind: '), h('b', { style: { color: d.lastResult.windDeltaFt > 0 ? '#86efac' : '#fca5a5' } }, d.lastResult.wind + ' (' + (d.lastResult.windDeltaFt > 0 ? '+' : '') + d.lastResult.windDeltaFt.toFixed(2) + ' ft)')),
                h('div', null, __alloT('stem.skatelab.peak_height', '⛰ Peak height: '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.peakFt.toFixed(2) + ' ft')),
                h('div', null, __alloT('stem.skatelab.hang_time_2', '⏱ Hang time: '), h('b', { style: { color: '#fbbf24' } }, d.lastResult.hangTime.toFixed(2) + ' s')),
                h('div', null, __alloT('stem.skatelab.clearance', '🎯 Clearance: '), h('b', { style: { color: d.lastResult.landed ? '#86efac' : '#fbbf24' } }, (d.lastResult.clearance >= 0 ? '+' : '') + d.lastResult.clearance.toFixed(2) + ' ft')),
                d.lastResult.errPct !== undefined && h('div', {
                  style: {
                    marginTop: 6, padding: '6px 8px', borderRadius: 6,
                    background: d.lastResult.errPct <= 10 ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                    border: '1px solid ' + (d.lastResult.errPct <= 10 ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                    color: d.lastResult.errPct <= 10 ? '#86efac' : '#d8b4fe'
                  }
                },
                  __alloT('stem.skatelab.predicted_2', '🔮 Predicted '), h('b', null, d.lastResult.predicted.toFixed(2) + ' ft'),
                  __alloT('stem.skatelab.actual_2', ' · Actual '), h('b', null, d.lastResult.actual.toFixed(2) + ' ft'),
                  __alloT('stem.skatelab.off_2', ' · Off '), h('b', null, d.lastResult.errPct.toFixed(1) + '%'),
                  d.lastResult.errPct <= 10 ? ' 🎯' : ''
                ),
                // Ghost delta row for gap — same shape as halfpipe.
                d.lastResult.prevGhostRangeFt != null && (function() {
                  var delta = d.lastResult.rangeFt - d.lastResult.prevGhostRangeFt;
                  var beat = delta > 0;
                  return h('div', {
                    style: {
                      marginTop: 6, padding: '6px 8px', borderRadius: 6,
                      background: beat ? 'rgba(34,197,94,0.18)' : 'rgba(168,85,247,0.18)',
                      border: '1px solid ' + (beat ? '#22c55e' : 'rgba(168,85,247,0.55)'),
                      color: beat ? '#86efac' : '#d8b4fe'
                    }
                  },
                    __alloT('stem.skatelab.vs_best_prev_2', '👻 vs best: prev '), h('b', null, d.lastResult.prevGhostRangeFt.toFixed(2) + ' ft'),
                    __alloT('stem.skatelab.str_2', ' · Δ '), h('b', null, (delta >= 0 ? '+' : '') + delta.toFixed(2) + ' ft'),
                    d.lastResult.newBest ? ' 🏆 NEW BEST!' : ''
                  );
                })(),
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
            'aria-label': __alloT('stem.skatelab.coaching_suggestion', 'Coaching suggestion'),
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
                'aria-label': __alloT('stem.skatelab.dismiss_this_suggestion', 'Dismiss this suggestion'),
                'data-sk-focusable': 'true',
                style: {
                  padding: '4px 8px', fontSize: 10, fontWeight: 700,
                  background: 'transparent', color: 'var(--allo-stem-text, #cbd5e1)',
                  border: '1px solid rgba(148,163,184,0.35)',
                  borderRadius: 6, cursor: 'pointer', minHeight: 26
                }
              }, __alloT('stem.skatelab.skip_2', '✕ Skip'))
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.5 } }, nudge.message),
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
            h('div', { style: { fontSize: 11, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase' } }, __alloT('stem.skatelab.ai_coach', '🎙️ AI Coach')),
            // Persona picker — hidden when no AI backend is wired,
            // since persona choice has no effect without callGemini.
            // Touch targets bumped to ≥28px (WCAG 2.5.5 AA).
            callGemini && h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.coach_voice', 'Coach voice'), style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
              COACH_PERSONAS.map(function(p) {
                var sel = (d.coachPersona || 'analyst') === p.id;
                return h('button', {
                  key: 'cp-' + p.id,
                  id: 'sk-coach-' + p.id,
                  onClick: function() { upd('coachPersona', p.id); skAnnounce('Coach voice: ' + p.label); },
                  onKeyDown: function(e) {
                    _radioKeyDown(e, COACH_PERSONAS.map(function(item) { return item.id; }), d.coachPersona || 'analyst', function(nextId) {
                      upd('coachPersona', nextId);
                      skAnnounce('Coach voice: ' + getPersona(nextId).label);
                    }, 'sk-coach-');
                  },
                  disabled: !!d.running,
                  role: 'radio',
                  'aria-checked': sel,
                  tabIndex: sel ? 0 : -1,
                  'data-sk-focusable': 'true',
                  title: p.label + ' — ' + p.prepend.split('.')[0],
                  style: {
                    padding: '6px 11px', borderRadius: 20, cursor: 'pointer',
                    background: sel ? 'rgba(167,139,250,0.25)' : 'rgba(254,243,199,0.14)',
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
              fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6,
              fontStyle: d.coachResponse.persona === 'zen' ? 'italic' : 'normal'
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 } },
              getPersona(d.coachResponse.persona).icon + ' ' + getPersona(d.coachResponse.persona).label),
            d.coachResponse.text
          )
        ),
        // ── Gear Science ────────────────────────────────────────
        // Closed by default. Opens to show 6 protective-gear cards
        // with the same 3-color-coded structure as Trick Lore (does
        // / physics / why-wear). Footer button prints a one-page
        // gear checklist for students to take home.
        h('details', {
          style: {
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.35)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 12
          }
        },
          h('summary', {
            style: {
              cursor: 'pointer', color: '#86efac', fontWeight: 800,
              fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '2px 0', userSelect: 'none'
            }
          }, __alloT('stem.skatelab.gear_science_the_physics_of_not_gettin', '🛡️ Gear Science — the physics of not getting hurt')),
          // Intro card framing the section.
          h('div', {
            style: {
              marginTop: 10, padding: '8px 10px',
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.40)',
              borderRadius: 8, fontSize: 12, color: '#bbf7d0', lineHeight: 1.55
            }
          },
            h('b', { style: { color: '#86efac' } }, __alloT('stem.skatelab.most_skate_injuries_are_preventable', 'Most skate injuries are preventable. ')),
            __alloT('stem.skatelab.each_piece_of_gear_works_because_of_ph', 'Each piece of gear works because of physics you already know — force-over-time, stress-over-area, friction-over-distance. Here\'s why each one matters.')
          ),
          // 6 gear cards
          h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
            GEAR.map(function(g) {
              return h('div', {
                key: 'gear-' + g.id,
                style: {
                  background: 'rgba(15,23,42,0.50)',
                  border: '1px solid rgba(34,197,94,0.30)',
                  borderRadius: 8, padding: '10px 12px'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 20 } }, g.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 800, color: '#fef3c7' } }, g.label),
                  h('span', { style: { marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', color: '#86efac', padding: '2px 8px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.45)', borderRadius: 20 } }, g.stat)
                ),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 4 } },
                  h('div', null, h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.what_it_does', '🛡️ What it does: ')), g.does),
                  h('div', null, h('b', { style: { color: '#7dd3fc' } }, __alloT('stem.skatelab.the_physics', '📐 The physics: ')), g.physics),
                  h('div', null, h('b', { style: { color: '#86efac' } }, __alloT('stem.skatelab.why_wear_it', '💡 Why wear it: ')), g.whyWear)
                )
              );
            })
          ),
          // Print button
          h('div', { style: { marginTop: 10, display: 'flex', justifyContent: 'flex-end' } },
            h('button', {
              onClick: function() { printGearChecklist(); },
              'aria-label': __alloT('stem.skatelab.open_the_printable_gear_checklist', 'Open the printable gear checklist'),
              'data-sk-focusable': 'true',
              style: {
                padding: '8px 14px', fontSize: 12, fontWeight: 800,
                background: 'linear-gradient(135deg,#22c55e,#15803d)',
                color: '#fff', border: '1px solid #15803d',
                borderRadius: 8, cursor: 'pointer', minHeight: 36,
                boxShadow: '0 2px 6px rgba(21,128,61,0.35)'
              }
            }, __alloT('stem.skatelab.print_gear_checklist', '📋 Print Gear Checklist'))
          )
        ),
        // ── Skater Customizer ───────────────────────────────────
        // Style your skater — body color + helmet + pads. Helmet
        // and pads are cosmetic in the canvas but pair with the
        // gear-science panel above (suit up your skater after
        // reading why each piece works in real life).
        h('details', {
          style: {
            background: 'rgba(168,85,247,0.06)',
            border: '1px solid rgba(168,85,247,0.30)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 12
          }
        },
          h('summary', {
            style: {
              cursor: 'pointer', color: '#c4b5fd', fontWeight: 800,
              fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '2px 0', userSelect: 'none'
            }
          }, __alloT('stem.skatelab.skater_customizer_color_gear', '🎨 Skater Customizer — color + gear')),
          (function() {
            var sk = d.skater || { color: 'amber', helmet: false, pads: false };
            return h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 } },
              // Color row
              h('div', null,
                h('div', { style: { fontSize: 10, fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, __alloT('stem.skatelab.body_color', 'Body color')),
                h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.skatelab.skater_body_color', 'Skater body color'), style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  Object.keys(SKATER_COLORS).map(function(cid) {
                    var c = SKATER_COLORS[cid];
                    var sel = sk.color === cid;
                    return h('button', {
                      key: 'sk-c-' + cid,
                      id: 'sk-color-' + cid,
                      onClick: function() {
                        upd({ skater: Object.assign({}, sk, { color: cid }) });
                        skAnnounce('Body color: ' + c.label);
                      },
                      onKeyDown: function(e) {
                        _radioKeyDown(e, Object.keys(SKATER_COLORS), sk.color || 'amber', function(nextId) {
                          upd({ skater: Object.assign({}, sk, { color: nextId }) });
                          skAnnounce('Body color: ' + getSkaterColor(nextId).label);
                        }, 'sk-color-');
                      },
                      disabled: !!d.running,
                      role: 'radio',
                      'aria-checked': sel,
                      tabIndex: sel ? 0 : -1,
                      'aria-label': c.label + ' body color',
                      'data-sk-focusable': 'true',
                      title: c.label,
                      style: {
                        width: 36, height: 36, borderRadius: '50%',
                        background: c.body,
                        border: '3px solid ' + (sel ? c.accent : 'transparent'),
                        cursor: 'pointer',
                        boxShadow: sel ? '0 0 0 2px rgba(255,255,255,0.18)' : 'none'
                      }
                    });
                  })
                )
              ),
              // Gear toggles
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } },
                h('button', {
                  onClick: function() {
                    upd({ skater: Object.assign({}, sk, { helmet: !sk.helmet }) });
                    skAnnounce(sk.helmet ? 'Helmet off.' : 'Helmet on. Smart move.');
                  },
                  'aria-pressed': !!sk.helmet,
                  'aria-label': sk.helmet ? 'Helmet on. Click to remove.' : 'No helmet. Click to put one on.',
                  'data-sk-focusable': 'true',
                  style: {
                    padding: '10px 12px', fontSize: 12, fontWeight: 800,
                    background: sk.helmet ? 'linear-gradient(135deg,#22c55e,#15803d)' : 'rgba(254,243,199,0.14)',
                    color: sk.helmet ? '#fff' : '#94a3b8',
                    border: '1px solid ' + (sk.helmet ? '#15803d' : 'rgba(254,243,199,0.55)'),
                    borderRadius: 10, cursor: 'pointer', minHeight: 40
                  }
                }, sk.helmet ? '⛑️ Helmet ON' : '⛑️ Helmet OFF'),
                h('button', {
                  onClick: function() {
                    upd({ skater: Object.assign({}, sk, { pads: !sk.pads }) });
                    skAnnounce(sk.pads ? 'Pads off.' : 'Pads on. Slide instead of stop.');
                  },
                  'aria-pressed': !!sk.pads,
                  'aria-label': sk.pads ? 'Pads on. Click to remove.' : 'No pads. Click to put them on.',
                  'data-sk-focusable': 'true',
                  style: {
                    padding: '10px 12px', fontSize: 12, fontWeight: 800,
                    background: sk.pads ? 'linear-gradient(135deg,#22c55e,#15803d)' : 'rgba(254,243,199,0.14)',
                    color: sk.pads ? '#fff' : '#94a3b8',
                    border: '1px solid ' + (sk.pads ? '#15803d' : 'rgba(254,243,199,0.55)'),
                    borderRadius: 10, cursor: 'pointer', minHeight: 40
                  }
                }, sk.pads ? '🦵 Pads ON' : '🦵 Pads OFF')
              ),
              sk.helmet && sk.pads && h('div', {
                role: 'status',
                style: {
                  background: 'rgba(34,197,94,0.18)',
                  border: '1px solid rgba(34,197,94,0.55)',
                  borderRadius: 8, padding: '8px 10px',
                  fontSize: 11, color: '#86efac', lineHeight: 1.5
                }
              },
                h('b', null, __alloT('stem.skatelab.suited_up', '✓ Suited up.')),
                __alloT('stem.skatelab.your_skater_s_ready_now_do_the_same_in', ' Your skater\'s ready. Now do the same in real life.')
              )
            );
          })()
        ),
        // Stats footer
        h('div', { className: 'sk-stat-grid', style: { marginBottom: 8 } },
          [
            { label: __alloT('stem.skatelab.lands_2', 'Lands'),   val: d.landings || 0, color: '#86efac' },
            { label: __alloT('stem.skatelab.bails', 'Bails'),   val: d.bails || 0,    color: '#fca5a5' },
            { label: __alloT('stem.skatelab.best_spin', 'Best Spin'), val: (d.biggestSpin || 0) + '°', color: '#fbbf24' },
            { label: __alloT('stem.skatelab.longest_gap', 'Longest Gap'), val: (d.longestGap || 0) + ' ft', color: '#a5b4fc' }
          ].map(function(s, i) {
            return h('div', { key: i, style: { background: 'rgba(254,243,199,0.14)', border: '1px solid rgba(254,243,199,0.18)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' } },
              h('div', { style: { fontSize: 18, fontWeight: 900, color: s.color } }, String(s.val)),
              h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 } }, s.label)
            );
          })
        ),
        // Personal bests row — only renders if at least one best
        // exists. Three cells: best halfpipe score, best gap score,
        // best air height. Mirrors the "Personal Best" panel pattern
        // teachers asked for in earlier rounds.
        ((d.bestHalfpipeScore || d.bestGapScore || d.bestAirFt || (d.streak && d.streak.longest)) ? h('div', {
          style: {
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8,
            marginBottom: 10,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(180,83,9,0.10))',
            border: '1px solid rgba(251,191,36,0.40)',
            borderRadius: 8, padding: '8px 10px'
          },
          'aria-label': __alloT('stem.skatelab.personal_bests', 'Personal bests')
        },
          [
            { label: __alloT('stem.skatelab.best_halfpipe', '🏆 Best Halfpipe'), val: d.bestHalfpipeScore || 0, suffix: ' pts', color: '#fbbf24' },
            { label: __alloT('stem.skatelab.best_gap', '🏆 Best Gap'),      val: d.bestGapScore || 0,      suffix: ' pts', color: '#fbbf24' },
            { label: __alloT('stem.skatelab.best_air', '🏆 Best Air'),      val: (d.bestAirFt || 0).toFixed(2), suffix: ' ft', color: '#fde68a' },
            { label: __alloT('stem.skatelab.longest_streak', '🔥 Longest Streak'), val: (d.streak && d.streak.longest) || 0, suffix: '', color: '#fb923c' }
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
            'aria-label': __alloT('stem.skatelab.reset_skatelab_stats_custom_scenarios_', 'Reset SkateLab stats. Custom scenarios are kept.'),
            'data-sk-focusable': 'true',
            title: __alloT('stem.skatelab.clear_landings_bails_personal_bests_an', 'Clear landings, bails, personal bests, and quest progress for SkateLab'),
            style: {
              padding: '5px 11px', fontSize: 10, fontWeight: 700,
              background: 'rgba(185,28,28,0.10)', color: '#fca5a5',
              border: '1px solid rgba(185,28,28,0.40)',
              borderRadius: 20, cursor: 'pointer', minHeight: 26
            }
          }, __alloT('stem.skatelab.reset_stats', '🗑 Reset stats'))
        ),
        // Educational annotations panel — frames why this is real STEM,
        // not a game. Switches text by mode.
        h('details', { style: { background: 'rgba(254,243,199,0.04)', border: '1px solid rgba(254,243,199,0.18)', borderRadius: 10, padding: 10, marginBottom: 8 } },
          h('summary', { style: { cursor: 'pointer', color: '#fbbf24', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' } }, __alloT('stem.skatelab.the_physics_behind_this', '📚 The physics behind this')),
          h('div', { style: { marginTop: 10, fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } },
            d.mode === 'halfpipe'
              ? [
                  h('p', { key: 1, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.pumping_doing_work', 'Pumping = doing work. ')),
                    __alloT('stem.skatelab.each_time_you_push_down_at_the_bottom_', 'Each time you push down at the bottom of the halfpipe, your legs add kinetic energy. KE = ½mv². More pumps → more KE → more speed at the lip.')),
                  h('p', { key: 2, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.lip_air_ke_pe', 'Lip → air = KE → PE. ')),
                    __alloT('stem.skatelab.above_the_lip_the_skater_s_kinetic_ene', 'Above the lip, the skater\'s kinetic energy converts to gravitational potential energy. Solving ½mv² = mgh gives air height: h = v² / (2g). Doubling your speed quadruples your air.')),
                  h('p', { key: 3, style: { margin: 0 } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.spin_needs_hang_time', 'Spin needs hang time. ')),
                    __alloT('stem.skatelab.your_rotation_rate_deg_s_is_roughly_fi', 'Your rotation rate (deg/s) is roughly fixed for a given trick. To complete a 720, you need air_time × rate ≥ 720°. That\'s why bigger spins demand more pumps.'))
                ]
              : [
                  h('p', { key: 1, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.range_formula', 'Range formula: ')),
                    __alloT('stem.skatelab.for_a_takeoff_at_speed_v_and_angle_pro', 'For a takeoff at speed v and angle θ, projectile range = v² × sin(2θ) / g. Maximum range at θ = 45°. Steeper angle gives more height; shallower gives more distance per unit speed.')),
                  h('p', { key: 2, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.speed_scales_squared', 'Speed scales squared. ')),
                    __alloT('stem.skatelab.doubling_your_takeoff_speed_quadruples', 'Doubling your takeoff speed quadruples your range — same as pumping in the halfpipe. That\'s why pros sprint hard at gaps.')),
                  h('p', { key: 3, style: { margin: '0 0 8px' } },
                    h('b', { style: { color: '#fbbf24' } }, __alloT('stem.skatelab.peak_height_2', 'Peak height: ')),
                    __alloT('stem.skatelab.h_peak_v_sin_2g_at_30_and_15_mph_you_p', 'h_peak = (v · sinθ)² / (2g). At 30° and 15 mph you peak ~3 ft above takeoff; at 45° you peak ~6 ft. More vertical means more time to spot the landing.'))
                ],
            // BMX-specific physics paragraph — only shows when BMX is
            // active. Frames moment of inertia in plain language tied
            // to the toggle the student just flipped.
            d.vehicle === 'bmx' && h('p', { style: { margin: '12px 0 0', padding: '8px 10px', background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.40)', borderRadius: 8 } },
              h('b', { style: { color: '#7dd3fc' } }, __alloT('stem.skatelab.bmx_bigger_moment_of_inertia', '🚲 BMX = bigger moment of inertia. ')),
              __alloT('stem.skatelab.a_bmx_bike_weighs_12_kg_vs_a_skateboar', 'A BMX bike weighs ~12 kg vs a skateboard\'s ~4 kg, and the wheels are much bigger. Moment of inertia I = m·r² determines how much torque you need to spin. Same arm strength → less rotation per second. That\'s why BMX flips and spins look more deliberate than skate spins — the rider is fighting more rotational mass for the same air time.')
            )
          )
        ),
        // ═══ AIR/SPIN INQUIRY widget (H7b'') ═══
        h('details', {
          'data-skatelab-inquiry-panel': 'true',
          style: {
            background: 'rgba(14,165,233,0.06)',
            border: '1px solid rgba(14,165,233,0.30)',
            borderRadius: 10,
            padding: 10,
            marginBottom: 12
          }
        },
          h('summary', {
            style: {
              cursor: 'pointer',
              color: '#7dd3fc',
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }
          }, __alloT('stem.skatelab.air_spin_inquiry_summary', 'Air / Spin Inquiry')),
          (function() {
          var iq = d.spinIQ || { speed: 6, angle: 45, mass: 70, rotSpeed: 360, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd({ spinIQ: Object.assign({}, iq, patch) }); }
          function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
          var g = 9.81;
          var theta = iq.angle * Math.PI / 180;
          var vy = iq.speed * Math.sin(theta);
          var hangTime = (2 * vy) / g; // seconds
          var apex = (vy * vy) / (2 * g); // meters
          var range = (iq.speed * iq.speed * Math.sin(2 * theta)) / g;
          var possibleDeg = hangTime * iq.rotSpeed;
          var ke = 0.5 * iq.mass * iq.speed * iq.speed;
          var maxTrick = possibleDeg >= 1080 ? '1080+' : possibleDeg >= 720 ? '720' : possibleDeg >= 540 ? '540' : possibleDeg >= 360 ? '360' : possibleDeg >= 180 ? '180' : 'flat';
          var state = hangTime < 0.3 ? 'flatground' : hangTime < 0.7 ? 'air180' : hangTime < 1.1 ? 'air360' : hangTime < 1.5 ? 'big540' : 'pro720';
          var sm = ({
            flatground: { label: 'Flat-ground', color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: __alloT('stem.skatelab.hang_time_0_3_s_manual_shove_it_territ', 'Hang time < 0.3 s — manual / shove-it territory. No rotation room.') },
            air180: { label: __alloT('stem.skatelab.180_class_air', '180-class air'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.skatelab.hang_0_3_0_7_s_half_rotations_and_olli', 'Hang ≈ 0.3–0.7 s. Half-rotations and ollies possible.') },
            air360: { label: __alloT('stem.skatelab.360_class_air', '360-class air'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: __alloT('stem.skatelab.hang_0_7_1_1_s_full_rotation_possible_', 'Hang ≈ 0.7–1.1 s. Full rotation possible with average spin rate.') },
            big540: { label: __alloT('stem.skatelab.big_air_540', 'Big-air 540'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.skatelab.hang_1_1_1_5_s_park_vert_range_540_and', 'Hang ≈ 1.1–1.5 s. Park/vert range. 540 and 720 possible if spin rate is high.') },
            pro720: { label: __alloT('stem.skatelab.pro_720', 'Pro 720+'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: __alloT('stem.skatelab.hang_1_5_s_mega_ramp_olympic_level_900', 'Hang > 1.5 s. Mega-ramp / Olympic-level. 900 and 1080 territory.') }
          })[state];
          // SVG: trajectory parabola
          var npts = 30;
          var pts = [];
          for (var i = 0; i <= npts; i++) {
            var t = (hangTime * i) / npts;
            var x = (iq.speed * Math.cos(theta)) * t;
            var y = (iq.speed * Math.sin(theta)) * t - 0.5 * g * t * t;
            pts.push([x, y]);
          }
          var maxX = Math.max(0.1, range);
          var maxY = Math.max(0.1, apex);
          var svgPts = pts.map(function(p) { return (20 + (p[0] / maxX) * 280) + ',' + (130 - (p[1] / maxY) * 110); }).join(' ');
          return h('div', { style: { background: sm.bg, border: '1px solid ' + sm.border, borderRadius: 12, padding: 14, marginBottom: 12, color: '#e8f0f5' } },
            h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, __alloT('stem.skatelab.air_spin_inquiry', '🔬 Air / Spin Inquiry')),
            h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, __alloT('stem.skatelab.set_takeoff_speed_angle_mass_and_your_', 'Set takeoff speed, angle, mass, and your rotation rate. Predict the biggest rotation you can land cleanly. No score, no reveal.')),
            h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label + ' · feasible max ≈ ' + maxTrick),
            h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
            h('div', { className: 'sk-inquiry-grid', style: { marginBottom: 10 } },
              [
                { label: __alloT('stem.skatelab.hang_time_3', 'Hang time'), val: hangTime.toFixed(2) + ' s' },
                { label: __alloT('stem.skatelab.apex_height', 'Apex height'), val: apex.toFixed(2) + ' m' },
                { label: __alloT('stem.skatelab.range', 'Range'), val: range.toFixed(2) + ' m' },
                { label: __alloT('stem.skatelab.takeoff_ke', 'Takeoff KE'), val: (ke / 1000).toFixed(2) + ' kJ' }
              ].map(function(m) {
                return h('div', { key: m.label, style: { padding: 6, borderRadius: 4, background: '#0a0a1a', border: '1px solid ' + sm.border, textAlign: 'center' } },
                  h('div', { style: { fontSize: 9, opacity: 0.6 } }, m.label),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: sm.color, fontFamily: 'monospace' } }, m.val)
                );
              })
            ),
            h('svg', { width: '100%', height: 160, viewBox: '0 0 320 160', role: 'img', 'aria-labelledby': 'sk-inquiry-trajectory-title sk-inquiry-trajectory-desc', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 10 } },
              h('title', { id: 'sk-inquiry-trajectory-title' }, 'Projectile trajectory'),
              h('desc', { id: 'sk-inquiry-trajectory-desc' }, 'Predicted arc with apex ' + apex.toFixed(2) + ' meters, range ' + range.toFixed(2) + ' meters, and hang time ' + hangTime.toFixed(2) + ' seconds.'),
              h('line', { x1: 20, y1: 130, x2: 310, y2: 130, stroke: '#1e293b' }),
              h('line', { x1: 20, y1: 18, x2: 20, y2: 130, stroke: '#1e293b' }),
              h('polyline', { points: svgPts, fill: 'none', stroke: sm.color, strokeWidth: 2 }),
              h('text', { x: 24, y: 28, fill: '#94a3b8', fontSize: 9 }, 'apex ' + apex.toFixed(2) + 'm'),
              h('text', { x: 160, y: 152, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'trajectory · range ' + range.toFixed(2) + 'm · hang ' + hangTime.toFixed(2) + 's')
            ),
            h('div', { className: 'sk-inquiry-controls', style: { marginBottom: 10 } },
              h('label', null,
                h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, __alloT('stem.skatelab.takeoff_speed_2', 'Takeoff speed')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.speed.toFixed(1) + ' m/s')),
                h('input', { type: 'range', min: 1, max: 18, step: 0.5, value: iq.speed, onChange: function(e) { setKey('speed', parseFloat(e.target.value)); }, style: { width: '100%' } })
              ),
              h('label', null,
                h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, __alloT('stem.skatelab.takeoff_angle', 'Takeoff angle')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.angle + '°')),
                h('input', { type: 'range', min: 5, max: 85, step: 1, value: iq.angle, onChange: function(e) { setKey('angle', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              ),
              h('label', null,
                h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, __alloT('stem.skatelab.rider_board_mass', 'Rider + board mass')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.mass + ' kg')),
                h('input', { type: 'range', min: 30, max: 120, step: 1, value: iq.mass, onChange: function(e) { setKey('mass', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              ),
              h('label', null,
                h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, __alloT('stem.skatelab.rotation_rate', 'Rotation rate')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.rotSpeed + '°/s')),
                h('input', { type: 'range', min: 90, max: 900, step: 30, value: iq.rotSpeed, onChange: function(e) { setKey('rotSpeed', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
              )
            ),
            h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
              h('button', { onClick: function() {
                var t = new Date().toISOString().slice(11, 19);
                setIQ({ log: iq.log.concat([{ t: t, v: iq.speed.toFixed(1), a: iq.angle, m: iq.mass, r: iq.rotSpeed, hang: hangTime.toFixed(2), max: maxTrick, state: sm.label }]) });
              }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, __alloT('stem.skatelab.log_this_physics_setup', '📋 Log this physics setup')),
              h('button', { onClick: function() { setIQ({ speed: 6, angle: 45, mass: 70, rotSpeed: 360 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, __alloT('stem.skatelab.reset_2', 'Reset'))
            ),
            iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
              iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · v' + e.v + ' θ' + e.a + ' m' + e.m + ' ω' + e.r + ' → hang ' + e.hang + 's, max ' + e.max); })
            ),
            h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, __alloT('stem.skatelab.your_hypothesis_which_slider_buys_hang', 'Your hypothesis (which slider buys hang time fastest — angle, speed, or mass?)')),
            h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: __alloT('stem.skatelab.e_g_angle_gives_diminishing_returns_pa', 'e.g., angle gives diminishing returns past 60° because horizontal speed vanishes...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, __alloT('stem.skatelab.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
            iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
              h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, __alloT('stem.skatelab.open_questions_no_answer_key', 'Open questions (no answer key)')),
              h('ul', { style: { margin: 0, paddingLeft: 16 } },
                h('li', null, __alloT('stem.skatelab.does_mass_appear_anywhere_in_the_air_f', 'Does mass appear anywhere in the air formulas? Why or why not?')),
                h('li', null, __alloT('stem.skatelab.at_what_angle_is_range_maximized_vs_ha', 'At what angle is RANGE maximized vs HANG TIME maximized? Are they the same?')),
                h('li', null, __alloT('stem.skatelab.why_does_the_bmx_rider_need_more_hang_', 'Why does the BMX rider need MORE hang time for the same rotation count?')),
                h('li', null, __alloT('stem.skatelab.how_would_you_choose_your_sliders_to_l', 'How would you choose your sliders to land a 540 with the least KE?'))
              )
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
              h('span', null, __alloT('stem.skatelab.i_can_explain_why_this_v_m_combination', 'I can explain why this v/θ/m combination lands at this max-rotation state.'))
            ),
            iq.understood && h('div', null,
              h('label', { htmlFor: 'sk-inquiry-explanation', style: { display: 'block', fontSize: 11, fontWeight: 700, color: sm.color, marginBottom: 4 } }, 'Your explanation'),
              h('textarea', { id: 'sk-inquiry-explanation', 'aria-label': 'Explain your air and spin prediction', value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: __alloT('stem.skatelab.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } })
            ),
            h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, __alloT('stem.skatelab.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. Treats takeoff as point projectile; real airs add drag, board-spin coupling, and rotation-rate-changes mid-air (tucking ↑ rate).'))
          );
          })()
        )
      );
    }
  });
})();
