// ═══════════════════════════════════════════
// stem_tool_throwlab.js — Sports Physics Lab
// Headline mode: Pitcher's Mound (baseball)
// Teaches: projectile motion + drag + Magnus effect
// "Same arm, different ball, different game. See why."
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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7 Focus Visible) ──
  // Inline styles on buttons/sliders below would suppress the browser's default
  // focus ring. This scoped CSS restores a visible 3px amber outline on
  // keyboard focus only (mouse clicks won't trigger it). Limited to elements
  // tagged `data-tl-focusable` so we don't fight any host-app focus styles.
  (function() {
    if (document.getElementById('allo-throwlab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-throwlab-focus-css';
    st.textContent = '[data-tl-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();


  // ── Audio (whoosh on throw, thwack on hit) ─────────────────
  var _tlAC = null;
  function getTlAC() {
    if (!_tlAC) {
      try { _tlAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (_tlAC && _tlAC.state === 'suspended') { try { _tlAC.resume(); } catch (e) {} }
    return _tlAC;
  }
  function tlTone(f, d, tp, v) {
    var ac = getTlAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(); var g = ac.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.07, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.1));
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + (d || 0.1));
    } catch (e) {}
  }
  function sfxThrow() { tlTone(420, 0.20, 'sine', 0.05); tlTone(280, 0.25, 'sine', 0.04); }
  function sfxStrike() { tlTone(900, 0.05, 'square', 0.08); tlTone(600, 0.10, 'sine', 0.06); }
  function sfxBall() { tlTone(180, 0.18, 'sawtooth', 0.05); }
  function sfxCatch() { tlTone(150, 0.08, 'sine', 0.06); }

  // ── ARIA live region for screen-reader announcements ───────
  (function() {
    if (document.getElementById('allo-live-throwlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-throwlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  // Live-region announcer with rapid-fire protection.
  // Setting textContent twice within ~500ms can drop the first announcement
  // before the SR engine picks it up. We clear → wait one frame → set, so
  // each call produces a distinct mutation the SR will read. Pending
  // announcements stack via micro-queue: only the LAST queued message wins
  // (we don't want to read 3 stale messages back-to-back), but it always
  // fires in a fresh tick so it can't get clobbered by a same-tick second
  // call.
  var _tlAnnounceTimer = null;
  function tlAnnounce(msg) {
    var lr = document.getElementById('allo-live-throwlab');
    if (!lr) return;
    if (_tlAnnounceTimer) clearTimeout(_tlAnnounceTimer);
    lr.textContent = '';
    _tlAnnounceTimer = setTimeout(function() {
      lr.textContent = msg;
      _tlAnnounceTimer = null;
    }, 60);
  }

  // ═══════════════════════════════════════════
  // PHYSICS ENGINE
  // ═══════════════════════════════════════════

  // Air density at sea level, room temperature (kg/m³)
  var RHO = 1.225;
  // Gravity (m/s² Earth)
  var G = 9.81;
  // Conversion helpers
  var MPH_PER_MPS = 2.23694;
  var FT_PER_M = 3.28084;

  // Ball specs — real-world (mass kg, radius m, drag coefficient, Magnus coefficient scaler)
  // Cd values are approximate flight averages; real Cd varies with Reynolds number + spin.
  // Cm scaler tunes Magnus lift response — calibrated so default pitches produce
  // visually-recognizable break (curveball drops ~12 inches more than fastball over 60.5 ft).
  var BALLS = {
    baseball: {
      label: 'Baseball', mass: 0.145, radius: 0.0366,
      cd: 0.35, cm: 0.95,
      color: '#fafafa', seamColor: '#dc2626',
      icon: '⚾'
    },
    basketball: {
      label: 'Basketball', mass: 0.624, radius: 0.119,
      cd: 0.50, cm: 0.40,
      color: '#f97316', seamColor: '#1a1a1a',
      icon: '🏀'
    },
    soccer: {
      label: 'Soccer Ball', mass: 0.430, radius: 0.110,
      cd: 0.22, cm: 1.20,
      color: '#fafafa', seamColor: '#1a1a1a',
      icon: '⚽'
    },
    // Football is a prolate spheroid; we approximate as a sphere for trajectory.
    // Cm is intentionally low — a tight spiral spins ALONG the axis of motion, so
    // the ω×v cross product is near zero (no Magnus lift). Wobbles get drag bumps
    // we don't model yet but could in a v2 wobble pass.
    football: {
      label: 'Football', mass: 0.410, radius: 0.110,
      cd: 0.20, cm: 0.10,
      color: '#7c2d12', seamColor: '#fafafa',
      icon: '🏈'
    }
  };

  // Pitch type presets — speed mph, spin rate rpm, spin axis (degrees relative to backspin)
  // axis 0° = pure backspin (4-seam fastball); axis 90° = pure sidespin (slider);
  // axis 180° = pure topspin (curveball drops faster). Spin axis is what the
  // student tweaks via grip preset; the underlying physics treats it as a unit
  // vector in 3D world space.
  var PITCH_TYPES = [
    { id: '4seam', label: '4-Seam Fastball', icon: '🚀',
      speedMph: 92, spinRpm: 2300, spinAxisDeg: 0,
      grip: 'Across the horseshoe, two fingers on the seams',
      teach: 'Pure backspin → maximum lift. Fastest, straightest pitch. Magnus lift fights gravity ~10% so it "rises" relative to a no-spin trajectory.' },
    { id: '2seam', label: '2-Seam Fastball', icon: '🎯',
      speedMph: 90, spinRpm: 2150, spinAxisDeg: 25,
      grip: 'Along the seams where they come closest',
      teach: 'Tilted backspin → small lateral run (3-6 inches) toward the throwing arm side. Slightly slower than 4-seam.' },
    { id: 'curve', label: 'Curveball (12-6)', icon: '🌀',
      speedMph: 78, spinRpm: 2600, spinAxisDeg: 180,
      grip: 'Middle finger along the seam, snap downward',
      teach: 'Pure topspin → Magnus pushes the ball DOWN. Curveballs drop ~12 inches more than a fastball over 60.5 ft.' },
    { id: 'slider', label: 'Slider', icon: '↔️',
      speedMph: 84, spinRpm: 2400, spinAxisDeg: 90,
      grip: 'Off-center, fingers along the side seam',
      teach: 'Pure sidespin → lateral break (~6 inches), little vertical drop. The "bullet spin" pitch.' },
    { id: 'knuckle', label: 'Knuckleball', icon: '🦋',
      speedMph: 65, spinRpm: 100, spinAxisDeg: 0,
      grip: 'Knuckles on the ball, no wrist snap',
      teach: 'Almost no spin → unpredictable wobble from seam-induced drag asymmetry. Slow but un-hittable when it works.' },
    { id: 'changeup', label: 'Change-Up', icon: '🐢',
      speedMph: 80, spinRpm: 1800, spinAxisDeg: 15,
      grip: 'Circle change — ball deeper in the palm',
      teach: 'Looks like a fastball at release but ~12 mph slower. Hitter\'s timing is wrecked.' }
  ];

  // Basketball shot presets — speed mph, release angle, release height, spin (almost always
  // backspin for basketball; spin axis stays at 0°). The teaching surface here is RELEASE
  // ANGLE + RELEASE HEIGHT, not pitch type — that's the whole free-throw lesson.
  var SHOT_TYPES = [
    { id: 'freethrow', label: 'Free Throw', icon: '🆓',
      speedMph: 16, spinRpm: 180, spinAxisDeg: 0, aimDegV: 52, releaseHeight: 2.2,
      grip: 'Square stance, ball balanced on shooting hand fingertips',
      teach: 'Standard free-throw form: high arc (~52°), backspin to "soften" the ball if it hits the rim. The taller you are, the flatter you can shoot — Shaq vs Steph.' },
    { id: 'jumper', label: 'Jump Shot', icon: '🦘',
      speedMph: 18, spinRpm: 200, spinAxisDeg: 0, aimDegV: 48, releaseHeight: 2.6,
      grip: 'Released at the top of the jump for higher release point',
      teach: 'Jumping raises your release point ~0.4m. Same arc but harder to defend — defender\'s arms can\'t reach the higher release.' },
    { id: 'hook', label: 'Hook Shot', icon: '🪝',
      speedMph: 17, spinRpm: 150, spinAxisDeg: 30, aimDegV: 55, releaseHeight: 2.8,
      grip: 'One-handed sweep across the body, very high release',
      teach: 'Shaq, Kareem, Jokic. The release point is so high (~2.8m) that defenders can\'t block it; tradeoff is some lateral spin so accuracy is harder.' },
    { id: 'bank', label: 'Bank Shot', icon: '🪞',
      speedMph: 19, spinRpm: 220, spinAxisDeg: 0, aimDegV: 45, releaseHeight: 2.3,
      grip: 'Aim for the upper square painted on the backboard',
      teach: 'Off the backboard. Lower arc + harder shot, but the backboard absorbs error — geometry forgives a wider release angle than a swish would.' },
    { id: 'three', label: '3-Pointer', icon: '🎯',
      speedMph: 21, spinRpm: 220, spinAxisDeg: 0, aimDegV: 49, releaseHeight: 2.5,
      grip: 'Same form as a free throw but with more leg drive',
      teach: '3-point line is 6.75m (NBA). Speed scales linearly with distance; arc stays similar (~49°) so the ball still drops "in" rather than skips off the back of the rim.' }
  ];

  // Soccer free-kick presets — the headline lesson is SPIN AXIS:
  //   90° ≈ pure sidespin (curling shot, ball bends around the wall)
  //    0° ≈ backspin (lifts a low chip)
  //   ~30° wobble = knuckle (Cristiano Ronaldo, near-zero spin)
  // Curve magnitude over a 22m kick is ~1-1.5m for ~600 rpm of sidespin —
  // recognizably "Beckham" without being a cartoon.
  var KICK_TYPES = [
    { id: 'curling', label: 'Curling Shot', icon: '🌀',
      speedMph: 60, spinRpm: 600, spinAxisDeg: 105, aimDegV: 12, releaseHeight: 0.11,
      grip: 'Strike with the inside of the foot, follow through across the body',
      teach: 'Bend it like Beckham: ~600 rpm of sidespin curls the ball around the wall. Magnus pushes the ball ~1-1.5 m laterally over a 22m kick. More spin = more curl, but harder to control.' },
    { id: 'knuckle', label: 'Knuckle Shot', icon: '🦋',
      speedMph: 70, spinRpm: 30, spinAxisDeg: 0, aimDegV: 8, releaseHeight: 0.11,
      grip: 'Strike dead-center with the laces, no follow-through',
      teach: 'Cristiano Ronaldo\'s shot. Almost no spin → seam-induced drag asymmetry makes the ball wobble unpredictably mid-flight. Hard to hit, harder to defend.' },
    { id: 'power', label: 'Power Drive', icon: '💥',
      speedMph: 78, spinRpm: 200, spinAxisDeg: 0, aimDegV: 5, releaseHeight: 0.11,
      grip: 'Full-foot strike, low backswing, ankle locked',
      teach: 'Pure speed (~78 mph). Low arc — ball rockets straight at goal. No curve, but the keeper has only ~0.5 s to react.' },
    { id: 'chip', label: 'Chip / Lob', icon: '🥄',
      speedMph: 35, spinRpm: 400, spinAxisDeg: 0, aimDegV: 35, releaseHeight: 0.11,
      grip: 'Underneath the ball with the toe, short backswing',
      teach: 'High arc (~35°) over the wall. Backspin keeps the ball in the air longer, makes it drop late. Used when the keeper is off the line.' }
  ];

  // Football field goal presets — distance + power tradeoff. The headline lesson
  // is the angle ↔ distance tradeoff: too flat and the ball crashes into the
  // crossbar; too steep and you lose distance to vertical wastage. Each preset
  // sets a target distance the player should TRY to clear by adjusting speed
  // and angle. Spin axis = 0 (no Magnus); spinRpm scales kick power slightly.
  // distanceYd is metadata used for UI label + scenario distance setup.
  var GOAL_TYPES = [
    { id: 'chipshot', label: 'Chip Shot (20 yd)', icon: '🥧',
      speedMph: 50, spinRpm: 0, spinAxisDeg: 0, aimDegV: 35, releaseHeight: 0.0,
      distanceYd: 20,
      grip: 'Hold the laces away, plant foot beside the ball',
      teach: 'Easy money. From 20 yards (~30 ft from crossbar) any pro kicker is automatic. The lesson: you don\'t need raw power — you need a clean strike + correct angle.' },
    { id: 'midrange', label: 'Mid-Range (35 yd)', icon: '🎯',
      speedMph: 60, spinRpm: 0, spinAxisDeg: 0, aimDegV: 38, releaseHeight: 0.0,
      distanceYd: 35,
      grip: 'Standard placement, full leg drive',
      teach: 'The sweet spot for most NFL kickers. ~38° launch angle is the optimal balance of distance and clearance — too flat hits the line; too steep wastes distance to vertical motion.' },
    { id: 'long', label: 'Long Field Goal (50 yd)', icon: '💪',
      speedMph: 70, spinRpm: 0, spinAxisDeg: 0, aimDegV: 40, releaseHeight: 0.0,
      distanceYd: 50,
      grip: 'Full backswing, dig the toe under the ball',
      teach: '50-yard FG is the modern NFL average. Speed scales linearly with distance, but ANGLE has a sweet spot near 40° — drag is enough that you can\'t just tilt up and add power.' },
    { id: 'hailmary', label: 'Hail Mary (60+ yd)', icon: '🌠',
      speedMph: 80, spinRpm: 0, spinAxisDeg: 0, aimDegV: 42, releaseHeight: 0.0,
      distanceYd: 60,
      grip: 'Maximum power; risk of pulling the kick',
      teach: 'Justin Tucker territory (longest NFL FG: 66 yards). At this distance every variable matters — wind, snap timing, the kicker\'s leg fatigue. Drag eats ~12% of horizontal range.' }
  ];

  // Mode metadata — controls which target / preset list / distances apply.
  var MODES = {
    pitching: {
      label: "Pitcher's Mound", icon: '⚾', ball: 'baseball', presets: PITCH_TYPES,
      targetZ: 18.44, // 60 ft 6 in
      releaseStrideDefault: 1.5,
      releaseHeightRange: [1.4, 2.4],
      speedRange: [50, 105]
    },
    freethrow: {
      label: 'Free Throw', icon: '🏀', ball: 'basketball', presets: SHOT_TYPES,
      targetZ: 4.57, // 15 ft = NBA free throw line to backboard, rim ~ 4.34m
      rimY: 3.05, rimZ: 4.34, rimRadius: 0.23,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [1.8, 3.0],
      speedRange: [10, 28]
    },
    freekick: {
      label: 'Free Kick', icon: '⚽', ball: 'soccer', presets: KICK_TYPES,
      targetZ: 22.0, // 22m typical free-kick distance (just outside the box)
      // Goal: 7.32m wide × 2.44m tall — FIFA spec
      goalHalfWidth: 3.66, goalHeight: 2.44,
      // Defender wall: 9.15m (10 yd) from ball, 4 silhouettes shoulder-to-shoulder
      wallZ: 9.15, wallHalfWidth: 1.0, wallHeight: 1.7,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.11, 0.11], // ball sits on ground; not user-adjustable
      speedRange: [25, 90]
    },
    fieldgoal: {
      label: 'Field Goal', icon: '🏈', ball: 'football', presets: GOAL_TYPES,
      // Default mid-range. Actual goal-line distance comes from the active
      // preset's distanceYd (the side-view canvas + classifier read it from
      // d.fgDistanceYd, set by applyGoalPreset).
      targetZ: 35 * 0.9144, // 35 yd in m — overridden per preset
      goalHalfWidth: 5.64 / 2, // 18.5 ft (NFL pro hash) → 5.64m → ±2.82
      crossbarHeight: 3.05,    // 10 ft
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.0, 0.0],
      speedRange: [30, 95]
    }
  };

  // Score classifier for field goal mode. Walks samples for the first crossing
  // of z = goalLineZ, then checks: ball must be UNDER the crossbar (y > 0) for
  // a missed/short FG, ABOVE the crossbar (y > crossbarHeight) AND between
  // posts (|x| ≤ goalHalfWidth) for a make. "Doink" if it kisses the post or
  // crossbar within a small tolerance.
  function classifyFieldGoalResult(samples, goalLineZ, crossbarHeight, goalHalfWidth) {
    if (!samples || samples.length < 2) return 'short';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Short bounce before reaching goal line
      if (cur.y <= 0 && cur.z < goalLineZ) return 'short';
      // Goal-line crossing
      if (prev.z < goalLineZ && cur.z >= goalLineZ) {
        var f = (goalLineZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * f;
        var gy = prev.y + (cur.y - prev.y) * f;
        // Must clear the crossbar
        if (gy < crossbarHeight) {
          // Hit the bar?
          if (Math.abs(gy - crossbarHeight) < 0.30 && Math.abs(gx) < goalHalfWidth) return 'doink';
          return 'shortbar';
        }
        // Must be between the uprights
        if (Math.abs(gx) > goalHalfWidth) {
          // Just outside the post?
          if (Math.abs(gx) - goalHalfWidth < 0.30) return 'doink';
          return Math.abs(gx) > goalHalfWidth + 2 ? 'wide' : 'wideclose';
        }
        return 'good';
      }
    }
    return 'short';
  }

  // Score classifier for free kick mode. Walks samples for the first crossing
  // of z = goal-line plane (targetZ). If at that crossing the ball is inside
  // the goal mouth (|x| ≤ goalHalfWidth, 0 < y ≤ goalHeight) → goal. Otherwise
  // miss. Also detects wall-block (ball intersects wall plane below wallHeight
  // with |x| ≤ wallHalfWidth) and short-bounce (y ≤ 0 before reaching goal).
  function classifyKickResult(samples, mm) {
    if (!samples || samples.length < 2) return 'miss';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Wall block? (z crosses wallZ before reaching goal)
      if (prev.z < mm.wallZ && cur.z >= mm.wallZ) {
        var fw = (mm.wallZ - prev.z) / (cur.z - prev.z);
        var wx = prev.x + (cur.x - prev.x) * fw;
        var wy = prev.y + (cur.y - prev.y) * fw;
        if (Math.abs(wx) <= mm.wallHalfWidth && wy > 0 && wy <= mm.wallHeight) return 'blocked';
        // Otherwise the ball cleared the wall — keep walking
      }
      // Short bounce?
      if (cur.y <= 0 && cur.z < mm.targetZ) return 'short';
      // Goal-line crossing?
      if (prev.z < mm.targetZ && cur.z >= mm.targetZ) {
        var fg = (mm.targetZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * fg;
        var gy = prev.y + (cur.y - prev.y) * fg;
        if (Math.abs(gx) <= mm.goalHalfWidth && gy > 0 && gy <= mm.goalHeight) return 'goal';
        if (Math.abs(gx) <= mm.goalHalfWidth + 0.5 && gy <= mm.goalHeight + 0.5) return 'post';
        if (gy > mm.goalHeight) return 'over';
        return 'wide';
      }
    }
    return 'short';
  }

  // Score classifier for free throw mode: "swish" / "rim" / "backboard" / "miss".
  // We classify by walking the trajectory and looking for the first downward
  // crossing of rim height that lands within rim radius. Rim is centered at
  // (x=0, z=rimZ); ball must descend through it (vy < 0).
  function classifyShotResult(samples, rimY, rimZ, rimRadius) {
    if (!samples || samples.length < 2) return 'miss';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Look for downward crossing of rim plane
      if (prev.y > rimY && cur.y <= rimY && cur.vy < 0) {
        // Lerp to exact crossing
        var f = (prev.y - rimY) / (prev.y - cur.y);
        var cx = prev.x + (cur.x - prev.x) * f;
        var cz = prev.z + (cur.z - prev.z) * f;
        var dx = cx - 0;
        var dz = cz - rimZ;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= rimRadius * 0.85) return 'swish';     // clean center
        if (dist <= rimRadius) return 'made';              // in but kissed rim
        if (dist <= rimRadius + 0.18) return 'rim';        // off the rim, may bounce in
        // Backboard plane is at z = rimZ + 0.10 (backboard sits behind rim)
        if (cz > rimZ + 0.10 && Math.abs(cx) < 0.9) return 'backboard';
        return 'miss';
      }
    }
    return 'air';
  }

  // Convert pitch axis (degrees) into a 3D angular velocity unit vector.
  // World coords: +X = toward right-handed batter (3rd-base side from mound),
  // +Y = up, +Z = toward catcher (mound to plate axis).
  // axis 0°   = backspin (ω points in +X for a RHP)
  // axis 180° = topspin (ω points in -X)
  // axis 90°  = sidespin (ω points in +Y for a slider that breaks toward 3B)
  function spinAxisVector(axisDeg, throwerHand) {
    var rad = axisDeg * Math.PI / 180;
    var sign = throwerHand === 'left' ? -1 : 1;
    // Lerp between backspin axis (1, 0, 0) and topspin (-1, 0, 0) through sidespin (0, 1, 0)
    var x = Math.cos(rad) * sign;
    var y = Math.sin(rad);
    return { x: x, y: y, z: 0 };
  }

  // Simulate pitch flight: from release point to plate.
  // Returns array of {t, x, y, z, vx, vy, vz} samples and outcome metadata.
  // Coordinate system:
  //   x: lateral (+ = catcher's right = batter's left = 1B-side from mound)
  //   y: vertical (+ = up; ground = 0)
  //   z: forward (+ = toward plate; release ~ 0, plate ~ 18.4 m for MLB)
  function simulatePitch(opts) {
    var ball = BALLS[opts.ball || 'baseball'];
    var v0Mph = opts.speedMph || 90;
    var v0 = v0Mph / MPH_PER_MPS; // m/s
    var releaseHeight = opts.releaseHeight !== undefined ? opts.releaseHeight : 1.85; // m (typical MLB ~6 ft)
    var releaseSide = opts.releaseSide !== undefined ? opts.releaseSide : 0.0; // m off centerline
    var releaseStride = opts.releaseStride !== undefined ? opts.releaseStride : 1.5; // m forward of mound rubber
    var aimDegV = opts.aimDegV !== undefined ? opts.aimDegV : -1.5; // small downward tilt
    var aimDegH = opts.aimDegH !== undefined ? opts.aimDegH : 0;
    var spinRpm = opts.spinRpm || 2300;
    var spinAxis = spinAxisVector(opts.spinAxisDeg || 0, opts.throwerHand || 'right');
    var omegaMag = spinRpm * 2 * Math.PI / 60; // rad/s
    var omega = { x: spinAxis.x * omegaMag, y: spinAxis.y * omegaMag, z: spinAxis.z * omegaMag };
    var area = Math.PI * ball.radius * ball.radius;
    var massInv = 1 / ball.mass;
    // Initial velocity vector (release direction)
    var radV = aimDegV * Math.PI / 180;
    var radH = aimDegH * Math.PI / 180;
    var vx = v0 * Math.sin(radH);
    var vy = v0 * Math.sin(radV);
    var vz = v0 * Math.cos(radV) * Math.cos(radH);
    var pos = { x: releaseSide, y: releaseHeight, z: releaseStride };
    var samples = [{ t: 0, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz }];
    var dt = 1 / 240; // small step for Magnus stability
    var t = 0;
    var maxT = opts.maxT !== undefined ? opts.maxT : 2.0;
    var plateZ = opts.targetZ !== undefined ? opts.targetZ : 18.44; // baseball plate default
    // Wind vector in m/s (world frame). Headwind in -Z direction (0°),
    // tailwind +Z (180°), crosswinds ±X. Drag uses RELATIVE air-frame
    // velocity (ball minus wind), so a tailwind shrinks |v_rel| and reduces
    // drag (extends range); a crosswind pushes the ball laterally even
    // without spin.
    var windMph = opts.windMph || 0;
    var windDirDeg = opts.windDirDeg || 0;
    var windMps = windMph / MPH_PER_MPS;
    var windRad = windDirDeg * Math.PI / 180;
    var wVx = -Math.sin(windRad) * windMps; // 90° → -X is wrong, 90° = +X cross. Convention: 0°=headwind (-Z), 90°=crossX +X, 180°=tail +Z, 270°=crossX -X.
    var wVy = 0;
    var wVz = -Math.cos(windRad) * windMps;
    // Quick fix: standard convention 0°=headwind means wind blows toward the
    // pitcher (in -Z), so wind vector should be (0, 0, -|w|). Re-derive:
    // 0°=head: wind in -Z; 180°=tail: wind in +Z. So:
    wVx = Math.sin(windRad) * windMps;  // 90° → +X
    wVy = 0;
    wVz = -Math.cos(windRad) * windMps; // 0° → -Z (headwind), 180° → +Z (tailwind)
    var outcome = null;
    while (t < maxT) {
      // Relative-to-air velocity (used by drag + Magnus). Without wind this
      // collapses to ball velocity. With wind, |v_rel| > |v| if headwind,
      // |v_rel| < |v| if tailwind, and crosswind pushes the drag vector
      // sideways without spin.
      var rvx = vx - wVx;
      var rvy = vy - wVy;
      var rvz = vz - wVz;
      var spd = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);
      // Drag: F = -½ρ|v_rel|²·Cd·A · v_rel̂
      var dragMag = 0.5 * RHO * spd * spd * ball.cd * area;
      var dragFx = spd > 0 ? -dragMag * (rvx / spd) : 0;
      var dragFy = spd > 0 ? -dragMag * (rvy / spd) : 0;
      var dragFz = spd > 0 ? -dragMag * (rvz / spd) : 0;
      // Magnus: F = ½ρ|v_rel|²·Cm·A · (ω̂ × v_rel̂)
      // The ω × v̂ direction gives the lift sense; Cm scales magnitude.
      // Use relative-to-air velocity so wind shifts the Magnus direction
      // realistically (e.g., a tailwind reduces effective Magnus).
      var vhx = spd > 0 ? rvx / spd : 0;
      var vhy = spd > 0 ? rvy / spd : 0;
      var vhz = spd > 0 ? rvz / spd : 0;
      var crossX = omega.y * vhz - omega.z * vhy;
      var crossY = omega.z * vhx - omega.x * vhz;
      var crossZ = omega.x * vhy - omega.y * vhx;
      var magnusMag = 0.5 * RHO * spd * spd * ball.cm * area * 0.0001; // 0.0001 brings ω rad/s into a force-scaler range that matches real break
      var magFx = magnusMag * crossX;
      var magFy = magnusMag * crossY;
      var magFz = magnusMag * crossZ;
      // Total acceleration
      var ax = (dragFx + magFx) * massInv;
      var ay = (dragFy + magFy) * massInv - G;
      var az = (dragFz + magFz) * massInv;
      // Euler integrate
      vx += ax * dt; vy += ay * dt; vz += az * dt;
      pos.x += vx * dt; pos.y += vy * dt; pos.z += vz * dt;
      t += dt;
      // Sample every 10ms for trajectory rendering
      if (samples.length === 0 || t - samples[samples.length - 1].t > 0.01) {
        samples.push({ t: t, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz });
      }
      // Reached plate?
      // Record plate-plane crossing the FIRST time z reaches plateZ — but DON'T
      // truncate the simulation. Free Throw mode wants the trajectory to keep
      // arcing past the rim plane until it lands; pitching mode just uses the
      // recorded crossing for strike/ball classification.
      if (!outcome && pos.z >= plateZ) {
        var prev = samples[samples.length - 2] || samples[0];
        var dz = pos.z - prev.z;
        var f = dz > 0 ? (plateZ - prev.z) / dz : 0;
        var px = prev.x + (pos.x - prev.x) * f;
        var py = prev.y + (pos.y - prev.y) * f;
        var pt = prev.t + (t - prev.t) * f;
        outcome = { reachedPlate: true, plateX: px, plateY: py, plateT: pt };
        // Insert the exact crossing sample so the trail draws to the right spot.
        samples.push({ t: pt, x: px, y: py, z: plateZ, vx: vx, vy: vy, vz: vz });
        // For pitching mode (truncateAtTarget), stop here. Free Throw passes
        // truncateAtTarget=false so the arc continues to the ground.
        if (opts.truncateAtTarget !== false) break;
      }
      // Bounced (hit the ground)?
      if (pos.y <= 0) {
        if (!outcome) outcome = { bounced: true, bounceX: pos.x, bounceZ: pos.z, bounceT: t };
        else { outcome.bounced = true; outcome.bounceX = pos.x; outcome.bounceZ = pos.z; outcome.bounceT = t; }
        break;
      }
    }
    if (!outcome) outcome = { lostInFlight: true };
    return { samples: samples, outcome: outcome, opts: opts };
  }

  // Strike zone (MLB approximate, in meters)
  // Width: ±0.2159 m (= half of 17 in plate)
  // Height: 0.45 m (knees) to 1.05 m (mid-chest), assumes ~6 ft batter
  var STRIKE_ZONE = { xMin: -0.2159, xMax: 0.2159, yMin: 0.45, yMax: 1.05 };

  function classifyPlateLocation(plateX, plateY) {
    if (plateX === undefined || plateY === undefined) return 'wild';
    var inX = plateX >= STRIKE_ZONE.xMin && plateX <= STRIKE_ZONE.xMax;
    var inY = plateY >= STRIKE_ZONE.yMin && plateY <= STRIKE_ZONE.yMax;
    if (inX && inY) return 'strike';
    var nearX = plateX >= STRIKE_ZONE.xMin - 0.08 && plateX <= STRIKE_ZONE.xMax + 0.08;
    var nearY = plateY >= STRIKE_ZONE.yMin - 0.10 && plateY <= STRIKE_ZONE.yMax + 0.10;
    if (nearX && nearY) return 'borderline';
    return 'ball';
  }

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('throwlab', {
    icon: '⚾',
    label: 'ThrowLab',
    desc: 'Sports physics: how spin, speed, and release point shape the ball\'s path',
    color: 'amber',
    category: 'science',
    questHooks: [
      { id: 'tl_throw_5',
        label: 'Throw 5 pitches',
        icon: '⚾',
        check: function(d) { return (d.throwCount || 0) >= 5; },
        progress: function(d) { return (d.throwCount || 0) + '/5 pitches'; } },
      { id: 'tl_strike_3',
        label: 'Land 3 pitches in the strike zone',
        icon: '🎯',
        check: function(d) { return (d.strikeCount || 0) >= 3; },
        progress: function(d) { return (d.strikeCount || 0) + '/3 strikes'; } },
      { id: 'tl_throw_each',
        label: 'Throw every pitch type at least once',
        icon: '🏆',
        check: function(d) { return (d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length >= PITCH_TYPES.length); },
        progress: function(d) { return ((d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length) || 0) + '/' + PITCH_TYPES.length + ' types'; } }
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
      var celebrate = ctx.celebrate;

      // ── State init guard ─────────────────────────────────
      if (!labToolData || !labToolData.throwlab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: {
            pitchType: '4seam',
            speedMph: 92,
            releaseHeight: 1.85,
            aimDegV: -1.5,
            aimDegH: 0,
            spinRpm: 2300,
            spinAxisDeg: 0,
            throwerHand: 'right',
            showPhysics: false,
            scaffoldTier: 3, // 1 = speed only, 2 = +angle, 3 = +spin (full)
            lastResult: null,
            replayActive: false,
            replayT: 0,
            throwCount: 0,
            strikeCount: 0,
            pitchTypesUsed: {},
            // Mode + per-mode extras
            mode: 'pitching',          // 'pitching' | 'freethrow' | 'freekick'
            shotType: 'freethrow',
            shotMakeCount: 0,          // free-throw scoring
            kickType: 'curling',
            goalCount: 0,              // free-kick scoring
            goalType: 'midrange',
            fgDistanceYd: 35,          // active field-goal distance
            fgMakeCount: 0,            // field-goal scoring
            // Compare Mode — pinned reference trajectory drawn behind the
            // current one so students can change ONE variable and see the
            // effect against a held-constant baseline.
            referenceResult: null,
            referenceLabel: '',        // "92 mph 4-Seam" etc.
            // Wind — defaults to calm. Outdoor modes (freekick, fieldgoal)
            // show the controls in the UI; indoor modes hide them. 0° =
            // headwind (against the throw), 90° = crosswind right, 180° =
            // tailwind, 270° = crosswind left.
            windMph: 0,
            windDirDeg: 0
          }});
        });
        return h('div', { className: 'p-8 text-center text-slate-600' }, 'Loading ThrowLab…');
      }
      var d = labToolData.throwlab;
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab); next[key] = val;
          return Object.assign({}, prev, { throwlab: next });
        });
      };

      // ── Helpers ─────────────────────────────────────────
      function applyPitchPreset(pid) {
        var pt = PITCH_TYPES.find(function(p) { return p.id === pid; });
        if (!pt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            pitchType: pid,
            speedMph: pt.speedMph,
            spinRpm: pt.spinRpm,
            spinAxisDeg: pt.spinAxisDeg
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected pitch: ' + pt.label + '. Speed ' + pt.speedMph + ' mph, ' + pt.spinRpm + ' rpm.');
      }

      function applyShotPreset(sid) {
        var st = SHOT_TYPES.find(function(s) { return s.id === sid; });
        if (!st) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            shotType: sid,
            speedMph: st.speedMph,
            spinRpm: st.spinRpm,
            spinAxisDeg: st.spinAxisDeg,
            aimDegV: st.aimDegV,
            releaseHeight: st.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected shot: ' + st.label + '. Release angle ' + st.aimDegV + ' degrees, height ' + st.releaseHeight + ' meters.');
      }

      function applyKickPreset(kid) {
        var kt = KICK_TYPES.find(function(k) { return k.id === kid; });
        if (!kt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            kickType: kid,
            speedMph: kt.speedMph,
            spinRpm: kt.spinRpm,
            spinAxisDeg: kt.spinAxisDeg,
            aimDegV: kt.aimDegV,
            releaseHeight: kt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected kick: ' + kt.label + '. Speed ' + kt.speedMph + ' mph, spin axis ' + kt.spinAxisDeg + ' degrees.');
      }

      // ── Compare Mode helpers ──
      // Pin the most recent trajectory as a "reference ghost" — drawn behind
      // the next throw in a faded color so students can change one parameter
      // and see its isolated effect.
      function saveReference() {
        if (!d.lastResult) {
          tlAnnounce('Throw a pitch first, then you can save it as a reference.');
          if (addToast) addToast('No throw to save yet');
          return;
        }
        // Build a short human-readable label from the current parameters.
        var ballLabel = (BALLS[modeMeta.ball] || {}).label || 'ball';
        var modeLabel = isPitching ? (currentPitch && currentPitch.label) || 'pitch'
                      : isFreeThrow ? (currentShot && currentShot.label) || 'shot'
                      : isFreeKick ? (currentKick && currentKick.label) || 'kick'
                      : isFieldGoal ? (currentGoal && currentGoal.label) || 'kick'
                      : 'throw';
        var label = d.speedMph + ' mph · ' + modeLabel
                  + (isPitching || isFreeKick ? ' · ' + d.spinRpm + ' rpm @ ' + d.spinAxisDeg + '°' : '')
                  + (isFreeThrow || isFieldGoal ? ' · ' + d.aimDegV.toFixed(1) + '°' : '');
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            referenceResult: prev.throwlab.lastResult,
            referenceLabel: label
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Saved as reference: ' + label + '. Change one parameter and throw again to compare.');
        if (addToast) addToast('📌 Reference saved');
      }

      function clearReference() {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, { referenceResult: null, referenceLabel: '' });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Reference cleared.');
      }

      function applyGoalPreset(gid) {
        var gt = GOAL_TYPES.find(function(g) { return g.id === gid; });
        if (!gt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            goalType: gid,
            fgDistanceYd: gt.distanceYd,
            speedMph: gt.speedMph,
            spinRpm: gt.spinRpm,
            spinAxisDeg: gt.spinAxisDeg,
            aimDegV: gt.aimDegV,
            releaseHeight: gt.releaseHeight,
            lastResult: null            // distance change → invalidate previous result
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected field goal: ' + gt.label + '. Distance ' + gt.distanceYd + ' yards, launch angle ' + gt.aimDegV + ' degrees.');
      }

      function switchMode(newMode) {
        var modeMeta = MODES[newMode];
        if (!modeMeta) return;
        setLabToolData(function(prev) {
          var defaults;
          if (newMode === 'pitching') {
            defaults = { speedMph: 92, releaseHeight: 1.85, aimDegV: -1.5, aimDegH: 0, spinRpm: 2300, spinAxisDeg: 0 };
          } else if (newMode === 'freethrow') {
            defaults = { speedMph: 16, releaseHeight: 2.2, aimDegV: 52, aimDegH: 0, spinRpm: 180, spinAxisDeg: 0 };
          } else if (newMode === 'freekick') {
            defaults = { speedMph: 60, releaseHeight: 0.11, aimDegV: 12, aimDegH: 0, spinRpm: 600, spinAxisDeg: 105 };
          } else { // fieldgoal
            defaults = { speedMph: 60, releaseHeight: 0.0, aimDegV: 38, aimDegH: 0, spinRpm: 0, spinAxisDeg: 0, fgDistanceYd: 35 };
          }
          var next = Object.assign({}, prev.throwlab, defaults, {
            mode: newMode, lastResult: null, replayActive: false, replayT: 0
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Switched to ' + modeMeta.label + ' mode.');
      }

      // Plain-language trajectory shape for screen-reader narration.
      // WCAG 1.1.1 Non-text Content: the canvas trajectory has no SR
      // equivalent without this — describes apex height + distance + duration
      // so a blind student gets the same shape information a sighted student
      // sees in the line. ~1 sentence, appended to outcome-specific text.
      function describeShape(rs) {
        if (!rs || !rs.samples || rs.samples.length < 2) return '';
        var apex = Math.max.apply(null, rs.samples.map(function(s) { return s.y; }));
        var maxZ = Math.max.apply(null, rs.samples.map(function(s) { return s.z; }));
        var hangT = rs.samples[rs.samples.length - 1].t || 0;
        return ' Trajectory peaked at ' + apex.toFixed(1) + ' meters, traveled ' + maxZ.toFixed(1) + ' meters forward over ' + hangT.toFixed(2) + ' seconds.';
      }

      function throwPitch() {
        var modeMeta = MODES[d.mode] || MODES.pitching;
        // Field goal distance is preset-driven so the goal line moves per kick type.
        var effectiveTargetZ = d.mode === 'fieldgoal'
          ? (d.fgDistanceYd || 35) * 0.9144  // yd → m
          : modeMeta.targetZ;
        var simOpts = {
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: d.spinRpm,
          spinAxisDeg: d.spinAxisDeg,
          throwerHand: d.throwerHand,
          targetZ: effectiveTargetZ,
          releaseStride: modeMeta.releaseStrideDefault,
          truncateAtTarget: d.mode === 'pitching', // free throw / free kick / field goal need the full arc to land
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0
        };
        // Free kick + field goal let the arc continue past the goal line so we
        // can detect missed-over / wide / post cases.
        if (d.mode === 'freekick' || d.mode === 'fieldgoal') simOpts.truncateAtTarget = false;
        var result = simulatePitch(simOpts);
        var loc;
        if (d.mode === 'freethrow') {
          loc = classifyShotResult(result.samples, modeMeta.rimY, modeMeta.rimZ, modeMeta.rimRadius);
        } else if (d.mode === 'freekick') {
          loc = classifyKickResult(result.samples, modeMeta);
        } else if (d.mode === 'fieldgoal') {
          loc = classifyFieldGoalResult(result.samples, effectiveTargetZ, modeMeta.crossbarHeight, modeMeta.goalHalfWidth);
        } else {
          loc = result.outcome.reachedPlate
            ? classifyPlateLocation(result.outcome.plateX, result.outcome.plateY)
            : 'wild';
        }
        result.location = loc;
        // Compute break stats relative to a no-spin baseline. Pass through
        // the same wind so the baseline is "what would happen WITHOUT spin
        // but WITH the same conditions" — break attribution stays clean.
        var noSpin = simulatePitch({
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: 0,
          spinAxisDeg: 0,
          throwerHand: d.throwerHand,
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0
        });
        if (result.outcome.reachedPlate && noSpin.outcome.reachedPlate) {
          result.vBreakIn = (noSpin.outcome.plateY - result.outcome.plateY) * FT_PER_M * 12;
          result.hBreakIn = (result.outcome.plateX - noSpin.outcome.plateX) * FT_PER_M * 12;
        } else {
          result.vBreakIn = null; result.hBreakIn = null;
        }
        sfxThrow();
        var newThrowCount = (d.throwCount || 0) + 1;
        var isMakeOutcome = loc === 'strike' || loc === 'swish' || loc === 'made' || loc === 'goal';
        var newStrikeCount = (d.mode === 'pitching' && loc === 'strike') ? (d.strikeCount || 0) + 1 : (d.strikeCount || 0);
        var newMakeCount = (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made')) ? (d.shotMakeCount || 0) + 1 : (d.shotMakeCount || 0);
        var newGoalCount = (d.mode === 'freekick' && loc === 'goal') ? (d.goalCount || 0) + 1 : (d.goalCount || 0);
        var newFgMakeCount = (d.mode === 'fieldgoal' && loc === 'good') ? (d.fgMakeCount || 0) + 1 : (d.fgMakeCount || 0);
        var newTypesUsed = Object.assign({}, d.pitchTypesUsed || {});
        if (d.mode === 'pitching') newTypesUsed[d.pitchType] = true;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            lastResult: result,
            replayActive: true,
            replayT: 0,
            throwCount: newThrowCount,
            strikeCount: newStrikeCount,
            shotMakeCount: newMakeCount,
            goalCount: newGoalCount,
            fgMakeCount: newFgMakeCount,
            pitchTypesUsed: newTypesUsed
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        // Outcome SFX + announcement after a tiny delay so it doesn't talk over the throw
        setTimeout(function() {
          if (d.mode === 'pitching') {
            if (loc === 'strike') {
              sfxStrike();
              tlAnnounce('Strike! Pitch crossed the plate ' + Math.round((result.outcome.plateY || 0) * 39.37) + ' inches up.' + describeShape(result));
              if (addToast) addToast('🎯 STRIKE!');
              if (awardXP) awardXP('throwlab', 5, 'Strike thrown');
            } else if (loc === 'borderline') {
              sfxCatch();
              tlAnnounce('Borderline pitch. Just outside the strike zone.');
              if (addToast) addToast('⚪ Borderline pitch');
            } else if (loc === 'ball') {
              sfxBall();
              tlAnnounce('Ball. Pitch missed the strike zone.');
              if (addToast) addToast('Ball — outside the zone');
            } else {
              sfxBall();
              tlAnnounce('Wild pitch. Bounced or sailed past the catcher.');
              if (addToast) addToast('Wild pitch!');
            }
            if (newStrikeCount === 3 && (d.strikeCount || 0) < 3 && celebrate) celebrate();
          } else if (d.mode === 'freethrow') {
            if (loc === 'swish') {
              sfxStrike(); sfxStrike();
              tlAnnounce('Swish! Clean shot through the center of the rim.' + describeShape(result));
              if (addToast) addToast('🏀 SWISH!');
              if (awardXP) awardXP('throwlab', 8, 'Swish');
              if (celebrate) celebrate();
            } else if (loc === 'made') {
              sfxStrike();
              tlAnnounce('Made it! Ball kissed the rim and dropped through.');
              if (addToast) addToast('🏀 SCORE!');
              if (awardXP) awardXP('throwlab', 5, 'Shot made');
            } else if (loc === 'rim') {
              sfxBall();
              tlAnnounce('Off the rim. Close — adjust your arc.');
              if (addToast) addToast('Rim out');
            } else if (loc === 'backboard') {
              sfxCatch();
              tlAnnounce('Off the backboard. Try a softer shot or shorter arc.');
              if (addToast) addToast('Off the backboard');
            } else if (loc === 'air') {
              sfxBall();
              tlAnnounce('Airball — short of the rim entirely.');
              if (addToast) addToast('Airball');
            } else {
              sfxBall();
              tlAnnounce('Missed the rim.');
              if (addToast) addToast('Miss');
            }
          } else if (d.mode === 'fieldgoal') {
            if (loc === 'good') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOOD! Field goal from ' + d.fgDistanceYd + ' yards is up and through.' + describeShape(result));
              if (addToast) addToast('🏈 GOOD!');
              if (awardXP) awardXP('throwlab', 10, 'Field goal made');
              if (celebrate) celebrate();
            } else if (loc === 'doink') {
              sfxStrike();
              tlAnnounce('Doink! Off the post or crossbar — inches from a make.');
              if (addToast) addToast('🥁 DOINK');
            } else if (loc === 'shortbar') {
              sfxBall();
              tlAnnounce('Short. Kick failed to clear the crossbar — needs more power or steeper angle.');
              if (addToast) addToast('Short — under the bar');
            } else if (loc === 'wideclose') {
              sfxBall();
              tlAnnounce('No good — wide of the upright by inches.');
              if (addToast) addToast('Wide — barely');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('No good — wide of the goalposts.');
              if (addToast) addToast('Wide');
            } else {
              sfxBall();
              tlAnnounce('Short — kick didn\'t reach the goal line.');
              if (addToast) addToast('Short of the line');
            }
          } else if (d.mode === 'freekick') {
            if (loc === 'goal') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOAL! Free kick found the back of the net.' + describeShape(result));
              if (addToast) addToast('⚽ GOAL!');
              if (awardXP) awardXP('throwlab', 10, 'Free kick goal');
              if (celebrate) celebrate();
            } else if (loc === 'post') {
              sfxStrike();
              tlAnnounce('Off the post! Inches from a goal.');
              if (addToast) addToast('🥅 Off the post');
            } else if (loc === 'over') {
              sfxBall();
              tlAnnounce('Over the bar. Reduce your launch angle.');
              if (addToast) addToast('Over the bar');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('Wide of the goal. Adjust your aim or curl.');
              if (addToast) addToast('Wide');
            } else if (loc === 'blocked') {
              sfxCatch();
              tlAnnounce('Blocked by the wall. Add more curl or arc.');
              if (addToast) addToast('Wall block');
            } else {
              sfxBall();
              tlAnnounce('Short — kick didn\'t reach the goal line.');
              if (addToast) addToast('Short');
            }
          }
        }, 350);
      }

      // ── Side-view canvas (Z = horizontal axis = mound→plate, Y = vertical) ──
      var canvasRef = React.useRef(null);
      React.useEffect(function() {
        var canvas = canvasRef.current; if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        gfx.clearRect(0, 0, W, H);

        var modeMeta = MODES[d.mode] || MODES.pitching;
        // FREE KICK uses a TOP-DOWN view (z forward / x lateral) so the curl
        // around the wall is visible. Pitching + Free Throw + Field Goal stay
        // side-view (z forward / y vertical) so the arc reads.
        var isTopDown = d.mode === 'freekick';
        // For field goal mode the goal line is preset-driven (20-60 yd).
        var fgGoalZ = d.mode === 'fieldgoal' ? (d.fgDistanceYd || 35) * 0.9144 : 0;
        // Layout
        var marginL = 40, marginR = 80, marginT = 30, marginB = 60;
        var fieldW = W - marginL - marginR;
        var fieldH = H - marginT - marginB;
        // Render-window Z extent — pitching shows the full 60.5 ft, free throw
        // zooms in on the much shorter 15-ft court so the arc reads clearly,
        // free kick shows ~25m so the goal mouth fits with margin, field goal
        // adds ~5m beyond the goalposts so a missed-over kick is still visible.
        var renderMaxZ = d.mode === 'pitching' ? modeMeta.targetZ
                       : d.mode === 'freekick' ? 25
                       : d.mode === 'fieldgoal' ? (fgGoalZ + 5)
                       : 6.5;
        // For top-down: maxB = lateral half-width × 2 ≈ 12m so a curling shot
        // with 1.5m of curl + the 7.32m goal both fit. Field goal apex can hit
        // 15m+ on a 60-yd kick so we need extra vertical room.
        var maxB = isTopDown ? 6.0
                 : d.mode === 'pitching' ? 3.0
                 : d.mode === 'fieldgoal' ? 18
                 : 4.5;
        // For top-down, B is symmetrical around 0 (lateral X); we map [-maxB, +maxB] to canvas height.
        // For side-view, B is from 0 (ground) up to +maxB.
        // World (z, b) → canvas (px, py). b = y for side-view, b = x for top-down.
        function worldToCanvas(z, b) {
          var px = marginL + (z / renderMaxZ) * fieldW;
          var py;
          if (isTopDown) {
            // Center 0 vertically; +x maps to top of canvas, -x to bottom (so the
            // curling shot bending +X visually bends UP on screen).
            py = (marginT + fieldH / 2) - (b / maxB) * (fieldH / 2);
          } else {
            py = (marginT + fieldH) - (b / maxB) * fieldH;
          }
          return [px, py];
        }
        // Helper: pull the right "b" component from a sample for the active view.
        function sampleB(s) { return isTopDown ? s.x : s.y; }
        if (isTopDown) {
          // Top-down pitch view: full canvas is grass, bird's-eye.
          gfx.fillStyle = '#3a7a26';
          gfx.fillRect(0, 0, W, H);
          // Mowing stripes for top-down readability — alternating bands
          gfx.fillStyle = 'rgba(0, 0, 0, 0.06)';
          for (var ms = 0; ms < W; ms += 60) gfx.fillRect(ms, 0, 30, H);
        } else {
          // Side view: sky gradient + ground band
          var skyTop = d.mode === 'pitching' ? '#1e3a5f' : '#3a2e2a';
          var skyBot = d.mode === 'pitching' ? '#5a7ba8' : '#6e5a48';
          var skyGrad = gfx.createLinearGradient(0, 0, 0, marginT + fieldH);
          skyGrad.addColorStop(0, skyTop);
          skyGrad.addColorStop(1, skyBot);
          gfx.fillStyle = skyGrad;
          gfx.fillRect(0, 0, W, marginT + fieldH);
          gfx.fillStyle = d.mode === 'pitching' ? '#3a7a26' : '#c8965a';
          gfx.fillRect(0, marginT + fieldH, W, H - (marginT + fieldH));
          if (d.mode === 'freethrow') {
            // Hardwood plank lines for the gym floor
            gfx.strokeStyle = 'rgba(0,0,0,0.18)';
            gfx.lineWidth = 1;
            for (var hp = 0; hp < W; hp += 22) {
              gfx.beginPath();
              gfx.moveTo(hp, marginT + fieldH);
              gfx.lineTo(hp, H);
              gfx.stroke();
            }
          }
        }

        if (d.mode === 'pitching') {
          var plateZ = modeMeta.targetZ;
          // Pitcher's mound (small bump on left)
          gfx.fillStyle = '#a16207';
          var moundPts = worldToCanvas(0, 0);
          gfx.beginPath();
          gfx.moveTo(moundPts[0] - 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 30, moundPts[1] + 10);
          gfx.lineTo(moundPts[0] - 30, moundPts[1] + 10);
          gfx.closePath();
          gfx.fill();
          // Home plate (white)
          gfx.fillStyle = '#ffffff';
          var plPts = worldToCanvas(plateZ, 0);
          gfx.fillRect(plPts[0] - 10, plPts[1] - 4, 20, 8);
          // Strike zone (dashed box ABOVE the plate)
          var szTop = worldToCanvas(plateZ, STRIKE_ZONE.yMax);
          var szBot = worldToCanvas(plateZ, STRIKE_ZONE.yMin);
          gfx.strokeStyle = '#fbbf24';
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 4]);
          gfx.strokeRect(plPts[0] - 14, szTop[1], 28, szBot[1] - szTop[1]);
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('60 ft 6 in →', (moundPts[0] + plPts[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Mound', moundPts[0], marginT + fieldH + 22);
          gfx.fillText('Plate', plPts[0], marginT + fieldH + 36);
        } else if (d.mode === 'freethrow') {
          // Free Throw rendering: shooter on left, hoop + backboard on right
          var ftLineZ = modeMeta.targetZ;
          var rimZ = modeMeta.rimZ;
          var rimY = modeMeta.rimY;
          var rimRadius = modeMeta.rimRadius;
          // Free throw line marker on the floor
          var ftLinePts = worldToCanvas(0, 0);
          var ftPlPts = worldToCanvas(ftLineZ, 0);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(ftLinePts[0] - 18, ftLinePts[1]);
          gfx.lineTo(ftLinePts[0] + 18, ftLinePts[1]);
          gfx.stroke();
          // Backboard (white rectangle behind rim)
          var bbBot = worldToCanvas(rimZ + 0.10, rimY - 0.30);
          var bbTop = worldToCanvas(rimZ + 0.10, rimY + 1.05);
          gfx.fillStyle = '#fafafa';
          gfx.fillRect(bbBot[0] - 1, bbTop[1], 6, bbBot[1] - bbTop[1]);
          // Backboard square (small painted target on glass)
          gfx.strokeStyle = '#dc2626';
          gfx.lineWidth = 2;
          var sqL = worldToCanvas(rimZ + 0.09, rimY + 0.45);
          var sqR = worldToCanvas(rimZ + 0.09, rimY + 0.05);
          gfx.strokeRect(sqL[0] - 12, sqL[1], 24, sqR[1] - sqL[1]);
          // Rim (orange horizontal bar at rim height) + net hash
          var rimLeft = worldToCanvas(rimZ - rimRadius, rimY);
          var rimRight = worldToCanvas(rimZ + rimRadius, rimY);
          gfx.strokeStyle = '#f97316';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]);
          gfx.lineTo(rimRight[0], rimRight[1]);
          gfx.stroke();
          // Net (dashed lines hanging down from rim)
          gfx.strokeStyle = 'rgba(255,255,255,0.7)';
          gfx.lineWidth = 1;
          gfx.setLineDash([3, 3]);
          var netBot = worldToCanvas(rimZ, rimY - 0.35);
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]); gfx.lineTo(netBot[0] - 4, netBot[1]);
          gfx.moveTo(rimRight[0], rimRight[1]); gfx.lineTo(netBot[0] + 4, netBot[1]);
          gfx.moveTo((rimLeft[0] + rimRight[0]) / 2, rimLeft[1]); gfx.lineTo(netBot[0], netBot[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Pole (gray vertical from floor to backboard top)
          gfx.fillStyle = '#475569';
          var poleX = bbTop[0] + 6;
          var poleBot = worldToCanvas(rimZ + 0.10, 0);
          gfx.fillRect(poleX, bbTop[1], 4, poleBot[1] - bbTop[1]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('FT line', ftLinePts[0], marginT + fieldH + 22);
          gfx.fillText('15 ft to backboard →', (ftLinePts[0] + ftPlPts[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Hoop', ftPlPts[0], marginT + fieldH + 36);
        } else if (d.mode === 'fieldgoal') {
          // Side-view field goal scene: kicker on left (z=0), goalposts at fgGoalZ.
          // Hash-marked field every 10 yards so distance reads at a glance.
          var hashCb = modeMeta.crossbarHeight;
          // Hash marks on the field (every 10 yd, in m: 10yd ≈ 9.14m)
          gfx.fillStyle = 'rgba(255,255,255,0.4)';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'center';
          for (var hyd = 10; hyd < d.fgDistanceYd + 6; hyd += 10) {
            var hzm = hyd * 0.9144;
            if (hzm > renderMaxZ) break;
            var hpos = worldToCanvas(hzm, 0);
            gfx.fillRect(hpos[0] - 0.5, hpos[1] - 4, 1, 8);
            gfx.fillText(hyd + ' yd', hpos[0], marginT + fieldH + 14);
          }
          // Tee + ball spot at z=0
          var teePts = worldToCanvas(0, 0);
          gfx.fillStyle = '#fef3c7';
          gfx.beginPath(); gfx.ellipse(teePts[0], teePts[1], 6, 3, 0, 0, Math.PI * 2); gfx.fill();
          // Goalposts: vertical uprights at fgGoalZ rising to (canvas) above crossbar.
          // Side view: only one upright is visible from the side, but we draw a small
          // depth offset so both posts read as a "Y" frame.
          var postBase = worldToCanvas(fgGoalZ, 0);
          var crossbar = worldToCanvas(fgGoalZ, hashCb);
          var postTop = worldToCanvas(fgGoalZ, hashCb + 4);
          gfx.strokeStyle = '#fde047';
          gfx.lineWidth = 4;
          gfx.beginPath();
          // Single base post (gooseneck base)
          gfx.moveTo(postBase[0], postBase[1]); gfx.lineTo(crossbar[0], crossbar[1]);
          // Crossbar (a short horizontal stub since this is side view; the whole
          // crossbar + uprights extend toward + away from the camera)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, crossbar[1]);
          // Two uprights rising from the crossbar (front + back)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] - 14, postTop[1]);
          gfx.moveTo(crossbar[0] + 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, postTop[1]);
          gfx.stroke();
          // Crossbar height label (10 ft)
          gfx.fillStyle = '#fde047';
          gfx.font = '10px system-ui';
          gfx.textAlign = 'right';
          gfx.fillText('10 ft →', crossbar[0] - 18, crossbar[1] + 3);
          // Distance label (centered between tee + posts)
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '12px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(d.fgDistanceYd + ' yd', (teePts[0] + postBase[0]) / 2, marginT + fieldH + 28);
        } else if (d.mode === 'freekick') {
          // Top-down free-kick scene: ball at left (z=0), wall at z=9.15m,
          // goal at z=22m. Centerline = canvas vertical center.
          var goalLineZ = modeMeta.targetZ;
          // Pitch markings — penalty area arc and centerline
          gfx.strokeStyle = 'rgba(255,255,255,0.55)';
          gfx.lineWidth = 1;
          // Centerline (helps reading lateral curve)
          var cl = worldToCanvas(0, 0);
          var clEnd = worldToCanvas(renderMaxZ, 0);
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          gfx.moveTo(cl[0], cl[1]); gfx.lineTo(clEnd[0], clEnd[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Ball spot (small white circle at z=0, x=0)
          var ballSpot = worldToCanvas(0, 0);
          gfx.fillStyle = '#fafafa';
          gfx.beginPath(); gfx.arc(ballSpot[0], ballSpot[1], 4, 0, Math.PI * 2); gfx.fill();
          // Defender wall — 4 silhouettes shoulder-to-shoulder at z = wallZ.
          // Each defender ~ 0.5m wide; total wall ~ 2m (centered).
          var wallLeftEdge = worldToCanvas(modeMeta.wallZ, -modeMeta.wallHalfWidth);
          var wallRightEdge = worldToCanvas(modeMeta.wallZ, modeMeta.wallHalfWidth);
          gfx.fillStyle = '#1e293b';
          gfx.fillRect(wallLeftEdge[0] - 2, wallRightEdge[1], 4, wallLeftEdge[1] - wallRightEdge[1]);
          // Defender heads (4 small circles along the wall)
          gfx.fillStyle = '#cbd5e1';
          for (var di = 0; di < 4; di++) {
            var dt = (di + 0.5) / 4;
            var dx = -modeMeta.wallHalfWidth + dt * (modeMeta.wallHalfWidth * 2);
            var dpos = worldToCanvas(modeMeta.wallZ, dx);
            gfx.beginPath(); gfx.arc(dpos[0], dpos[1], 5, 0, Math.PI * 2); gfx.fill();
          }
          // Goal mouth — white posts at z=22m, x=±3.66m (FIFA goal)
          var postL = worldToCanvas(goalLineZ, -modeMeta.goalHalfWidth);
          var postR = worldToCanvas(goalLineZ, modeMeta.goalHalfWidth);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(postL[0], postL[1] - 12); gfx.lineTo(postL[0], postL[1] + 12);
          gfx.moveTo(postR[0], postR[1] - 12); gfx.lineTo(postR[0], postR[1] + 12);
          // Crossbar (between posts, drawn as a single horizontal line on top-down)
          gfx.moveTo(postL[0], postL[1]); gfx.lineTo(postR[0], postR[1]);
          gfx.stroke();
          // Net (subtle hatch behind the goal line)
          gfx.strokeStyle = 'rgba(255,255,255,0.25)';
          gfx.lineWidth = 1;
          for (var nh = -2; nh <= 2; nh++) {
            var nh1 = worldToCanvas(goalLineZ, nh * 1.5);
            var nh2 = worldToCanvas(goalLineZ + 1.5, nh * 1.5);
            gfx.beginPath(); gfx.moveTo(nh1[0], nh1[1]); gfx.lineTo(nh2[0], nh2[1]); gfx.stroke();
          }
          // Distance + label
          gfx.fillStyle = '#fafafa';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Ball', ballSpot[0], ballSpot[1] + 16);
          gfx.fillText('Wall (10 yd)', (wallLeftEdge[0] + wallRightEdge[0]) / 2, marginT + fieldH + 18);
          gfx.fillText('Goal — 7.32 m wide', (postL[0] + postR[0]) / 2, marginT + fieldH + 18);
        }

        // ── Wind indicator (outdoor modes only, when wind is on) ──
        // Small compass-style arrow + speed label in the upper-right of the
        // canvas. Only renders when wind is non-zero so calm scenes stay
        // clean. Direction matches the simulator's convention (0° = headwind
        // pointing toward the thrower / down on the canvas in side-view).
        if ((d.mode === 'freekick' || d.mode === 'fieldgoal') && (d.windMph || 0) > 0) {
          var wIndW = 60, wIndH = 60;
          var wcx = W - 20 - wIndW / 2;
          var wcy = 20 + wIndH / 2;
          // Background card
          gfx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          gfx.strokeStyle = '#475569';
          gfx.lineWidth = 1;
          gfx.beginPath(); gfx.roundRect ? gfx.roundRect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH, 6) : gfx.rect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH);
          gfx.fill(); gfx.stroke();
          // Arrow direction: pointing in the direction the wind BLOWS toward.
          // Convention used by sim: 0° = headwind = wind blows in -Z
          // direction (= toward the thrower). On the side-view canvas, +Z
          // is to the right, so a 0° headwind arrow should point LEFT.
          // Top-down (free kick) view: +Z is to the right too. So same
          // direction convention works.
          var wDeg = d.windDirDeg || 0;
          // Math.cos(0)=1, sin(0)=0. We want 0° → arrow points left (-X) so:
          var arx = -Math.cos(wDeg * Math.PI / 180);
          var ary = -Math.sin(wDeg * Math.PI / 180);
          var arLen = 18;
          gfx.strokeStyle = '#60a5fa';
          gfx.fillStyle = '#60a5fa';
          gfx.lineWidth = 2.5;
          gfx.beginPath();
          gfx.moveTo(wcx - arx * arLen / 2, wcy - ary * arLen / 2);
          gfx.lineTo(wcx + arx * arLen / 2, wcy + ary * arLen / 2);
          gfx.stroke();
          // Arrowhead
          var ahead = arLen / 2;
          var perpX = -ary, perpY = arx;
          gfx.beginPath();
          gfx.moveTo(wcx + arx * ahead, wcy + ary * ahead);
          gfx.lineTo(wcx + arx * (ahead - 5) + perpX * 4, wcy + ary * (ahead - 5) + perpY * 4);
          gfx.lineTo(wcx + arx * (ahead - 5) - perpX * 4, wcy + ary * (ahead - 5) - perpY * 4);
          gfx.closePath();
          gfx.fill();
          // Speed label
          gfx.fillStyle = '#cbd5e1';
          gfx.font = 'bold 10px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Wind', wcx, wcy - 22);
          gfx.fillText(d.windMph + ' mph', wcx, wcy + 25);
        }

        // ── Saved REFERENCE trajectory (Compare Mode) ──
        // Drawn FIRST so it sits behind the current trajectory + no-spin guide.
        // Faded magenta dashed line with a small "REF" tag at its end.
        var rr = d.referenceResult;
        if (rr && rr.samples && rr.samples.length > 1) {
          gfx.strokeStyle = 'rgba(217, 70, 239, 0.55)'; // fuchsia-500 @ 55% — distinct from the green/yellow/red palette
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 5]);
          gfx.beginPath();
          for (var ri = 0; ri < rr.samples.length; ri++) {
            var rs = rr.samples[ri];
            if (rs.z > renderMaxZ + 0.5) break;
            var rp = worldToCanvas(rs.z, sampleB(rs));
            if (ri === 0) gfx.moveTo(rp[0], rp[1]); else gfx.lineTo(rp[0], rp[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
          // "REF" tag near the trajectory's end-of-render point
          var lastRef = rr.samples[Math.min(rr.samples.length - 1, rr.samples.length - 1)];
          for (var rj = rr.samples.length - 1; rj >= 0; rj--) {
            if (rr.samples[rj].z <= renderMaxZ + 0.5) { lastRef = rr.samples[rj]; break; }
          }
          var refTagPos = worldToCanvas(lastRef.z, sampleB(lastRef));
          gfx.fillStyle = 'rgba(217, 70, 239, 0.85)';
          gfx.font = 'bold 10px system-ui';
          gfx.textAlign = 'left';
          gfx.fillText('REF', refTagPos[0] + 6, refTagPos[1] + 3);
        }

        // No-spin reference trajectory (gray, dashed) — only when there's a result
        var lr = d.lastResult;
        if (lr && d.showPhysics) {
          var noSpin = simulatePitch({
            ball: modeMeta.ball,
            speedMph: d.speedMph, releaseHeight: d.releaseHeight,
            aimDegV: d.aimDegV, aimDegH: d.aimDegH,
            spinRpm: 0, spinAxisDeg: 0,
            throwerHand: d.throwerHand,
            targetZ: modeMeta.targetZ,
            releaseStride: modeMeta.releaseStrideDefault,
            windMph: d.windMph || 0, windDirDeg: d.windDirDeg || 0,
            truncateAtTarget: d.mode === 'pitching'
          });
          gfx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
          gfx.lineWidth = 1.5;
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          for (var i = 0; i < noSpin.samples.length; i++) {
            var s = noSpin.samples[i];
            if (s.z > renderMaxZ) break;
            var p = worldToCanvas(s.z, sampleB(s));
            if (i === 0) gfx.moveTo(p[0], p[1]); else gfx.lineTo(p[0], p[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
        }

        // Actual trajectory (color by outcome — palette per mode).
        if (lr) {
          var trajColor;
          if (d.mode === 'freethrow') {
            trajColor = lr.location === 'swish' ? '#10b981'
                      : lr.location === 'made' ? '#3b82f6'
                      : lr.location === 'rim' ? '#fbbf24'
                      : lr.location === 'backboard' ? '#94a3b8'
                      : '#ef4444';
          } else if (d.mode === 'freekick') {
            trajColor = lr.location === 'goal' ? '#10b981'
                      : lr.location === 'post' ? '#fbbf24'
                      : lr.location === 'blocked' ? '#94a3b8'
                      : '#ef4444';
          } else if (d.mode === 'fieldgoal') {
            trajColor = lr.location === 'good' ? '#10b981'
                      : lr.location === 'doink' ? '#fbbf24'
                      : lr.location === 'wideclose' ? '#f97316'
                      : '#ef4444';
          } else {
            trajColor = lr.location === 'strike' ? '#10b981'
                      : lr.location === 'borderline' ? '#fbbf24'
                      : lr.location === 'ball' ? '#94a3b8'
                      : '#ef4444';
          }
          gfx.strokeStyle = trajColor;
          gfx.lineWidth = 2.5;
          gfx.beginPath();
          var renderUpTo = d.replayActive ? Math.floor(lr.samples.length * Math.min(1, d.replayT)) : lr.samples.length;
          for (var j = 0; j < renderUpTo; j++) {
            var sj = lr.samples[j];
            if (sj.z > renderMaxZ + 0.5) break;
            var pj = worldToCanvas(sj.z, sampleB(sj));
            if (j === 0) gfx.moveTo(pj[0], pj[1]); else gfx.lineTo(pj[0], pj[1]);
          }
          gfx.stroke();
          // Ball at the leading edge of the trajectory
          if (renderUpTo > 0) {
            var ballSample = lr.samples[Math.min(renderUpTo - 1, lr.samples.length - 1)];
            var bp = worldToCanvas(ballSample.z, sampleB(ballSample));
            gfx.fillStyle = '#fafafa';
            gfx.beginPath();
            gfx.arc(bp[0], bp[1], 5, 0, Math.PI * 2);
            gfx.fill();
            gfx.strokeStyle = '#dc2626';
            gfx.lineWidth = 1;
            gfx.stroke();
          }
        }
      }, [
        d.lastResult, d.replayActive, d.replayT,
        d.speedMph, d.releaseHeight, d.aimDegV, d.aimDegH,
        d.spinRpm, d.spinAxisDeg, d.throwerHand, d.showPhysics,
        d.referenceResult, d.mode, d.fgDistanceYd,
        d.windMph, d.windDirDeg
      ]);

      // ── Space-key hotkey for throw/shoot/kick ──
      // WCAG 2.1.1 Keyboard: the throw button is already keyboard-reachable,
      // but power users want a single-key shortcut. Listen on window so the
      // hotkey works regardless of whether a slider has focus. Skip when the
      // user is typing in an input that handles Space natively (none in this
      // tool, but defensive against future text inputs).
      React.useEffect(function() {
        function onKey(e) {
          if (e.key !== ' ' && e.code !== 'Space') return;
          var tag = e.target && e.target.tagName;
          if (tag === 'INPUT' && e.target.type !== 'range') return;
          if (tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
          e.preventDefault();
          throwPitch();
        }
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [d.mode, d.speedMph, d.releaseHeight, d.aimDegV, d.aimDegH, d.spinRpm, d.spinAxisDeg, d.fgDistanceYd]);

      // ── Replay animator: walk replayT from 0 → 1 over ~1s ──
      // WCAG 2.3.3 (Animation from Interactions): if the user prefers reduced
      // motion, skip the replay walk and snap straight to the final trajectory.
      // The CSS guard at the top of the IIFE only handles CSS animations; the
      // canvas trajectory is JS-driven so we have to honor the preference here.
      React.useEffect(function() {
        if (!d.replayActive) return;
        var prefersReduced = false;
        try {
          prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {}
        if (prefersReduced) {
          // Snap to end immediately
          upd('replayT', 1);
          upd('replayActive', false);
          return;
        }
        var start = performance.now();
        var raf;
        function step() {
          var t = (performance.now() - start) / 1000;
          var prog = Math.min(1, t / 1.0);
          upd('replayT', prog);
          if (prog < 1) {
            raf = requestAnimationFrame(step);
          } else {
            upd('replayActive', false);
          }
        }
        raf = requestAnimationFrame(step);
        return function() { if (raf) cancelAnimationFrame(raf); };
      }, [d.replayActive]);

      // ── UI ──────────────────────────────────────────────
      var currentPitch = PITCH_TYPES.find(function(p) { return p.id === d.pitchType; }) || PITCH_TYPES[0];

      function slider(label, value, min, max, step, onChange, suffix) {
        // WCAG 1.3.1 Info & Relationships: bind the visible label to the
        // <input type=range> via htmlFor + id so screen readers announce the
        // label when the slider gets focus. WCAG 4.1.2 Name, Role, Value:
        // aria-valuetext gives the live value with units (otherwise the SR
        // would read "92" instead of "92 mph").
        // Mode prefix on the ID protects against collisions if a future
        // refactor renders multiple modes' sliders simultaneously.
        var inputId = 'tl-' + d.mode + '-slider-' + label.replace(/\s+/g, '-').toLowerCase();
        return h('div', { style: { marginBottom: 10 } },
          h('label', {
            htmlFor: inputId,
            style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 4, cursor: 'pointer' }
          },
            h('span', null, label),
            h('span', { style: { color: '#fbbf24', fontWeight: 600 } }, value + (suffix || ''))
          ),
          h('input', {
            id: inputId,
            'data-tl-focusable': 'true',
            type: 'range', min: min, max: max, step: step, value: value,
            'aria-valuetext': value + (suffix || ''),
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#fbbf24' }
          })
        );
      }

      var lr = d.lastResult;
      var modeMeta = MODES[d.mode] || MODES.pitching;
      var isPitching = d.mode === 'pitching';
      var isFreeThrow = d.mode === 'freethrow';
      var isFreeKick = d.mode === 'freekick';
      var isFieldGoal = d.mode === 'fieldgoal';
      // Active preset for the bottom-of-canvas teach blurb
      var currentShot = SHOT_TYPES.find(function(s) { return s.id === d.shotType; }) || SHOT_TYPES[0];
      var currentKick = KICK_TYPES.find(function(k) { return k.id === d.kickType; }) || KICK_TYPES[0];
      var currentGoal = GOAL_TYPES.find(function(g) { return g.id === d.goalType; }) || GOAL_TYPES[0];
      var activePreset = isPitching ? currentPitch
                       : isFreeThrow ? currentShot
                       : isFreeKick ? currentKick
                       : currentGoal;

      // Outcome label + color (mode-specific)
      function outcomeLabel(loc) {
        if (isPitching) {
          return loc === 'strike' ? '🎯 STRIKE'
               : loc === 'borderline' ? '⚪ Borderline'
               : loc === 'ball' ? '⚾ Ball (outside zone)'
               : '😬 Wild pitch';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '⚽ GOAL'
               : loc === 'post' ? '🥅 Off the post'
               : loc === 'over' ? '⬆️ Over the bar'
               : loc === 'wide' ? '↔️ Wide of the goal'
               : loc === 'blocked' ? '🧱 Blocked by the wall'
               : '😬 Short';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '🏈 IT IS GOOD'
               : loc === 'doink' ? '🥁 DOINK'
               : loc === 'shortbar' ? '⬇️ Short — under the bar'
               : loc === 'wideclose' ? '↔️ No good — wide by inches'
               : loc === 'wide' ? '↔️ No good — wide'
               : '😬 Short of the line';
        }
        return loc === 'swish' ? '🌊 SWISH (clean center)'
             : loc === 'made' ? '🏀 MADE IT'
             : loc === 'rim' ? '〰️ Off the rim'
             : loc === 'backboard' ? '🪞 Off the backboard'
             : loc === 'air' ? '💨 Airball (short)'
             : '😬 Miss';
      }
      // Dynamic explainer — generates outcome-specific feedback after a throw.
      // Combines what JUST happened (location, parameters) with the underlying
      // physics so the student gets coaching without needing a Gemini call.
      // Returns null when there's no result yet (we fall back to the static
      // grip/teach blurb of the active preset).
      function explainResult(lr) {
        if (!lr) return null;
        var loc = lr.location;
        // Pitching
        if (isPitching) {
          if (loc === 'strike') {
            var heightIn = Math.round((lr.outcome.plateY || 0) * 39.37);
            var lateralIn = Math.round(((lr.outcome.plateX || 0)) * 39.37);
            var lateralWord = Math.abs(lateralIn) < 2 ? 'right down the middle' : (lateralIn > 0 ? lateralIn + ' in to the throwing-arm side' : Math.abs(lateralIn) + ' in to the glove side');
            return 'Pitch crossed the plate ' + heightIn + ' in up, ' + lateralWord + '. ' + (lr.vBreakIn !== null && Math.abs(lr.vBreakIn) > 4 ? 'That ' + lr.vBreakIn.toFixed(1) + ' in of vertical break is the spin doing its job — Magnus pushing the ball ' + (lr.vBreakIn > 0 ? 'down (topspin)' : 'up (backspin)') + '.' : 'Spin had small effect at this speed.');
          }
          if (loc === 'borderline') return 'Just nicked the edge of the strike zone. Real umps would call this either way.';
          if (loc === 'ball') {
            var off = (lr.outcome.plateY < 0.45) ? 'low' : lr.outcome.plateY > 1.05 ? 'high' : Math.abs(lr.outcome.plateX) > 0.22 ? 'outside' : 'off-center';
            return 'Pitch missed ' + off + '. Adjust your release angle: try ' + (lr.outcome.plateY < 0.45 ? 'a higher release point or less negative vertical aim' : 'a lower release or more downward aim') + '.';
          }
          return 'Wild pitch. Either the angle was extreme or the spin axis pulled the ball off-target — try a smaller spin axis change next.';
        }
        // Free throw
        if (isFreeThrow) {
          if (loc === 'swish') return 'Clean swish! Your release angle (' + d.aimDegV.toFixed(1) + '°) and speed (' + d.speedMph + ' mph) line up perfectly for a 15 ft shot from ' + d.releaseHeight.toFixed(2) + ' m.';
          if (loc === 'made') return 'In with a friendly bounce. Your arc was close to ideal — backspin helped soften the rim contact.';
          if (loc === 'rim') {
            var apex = Math.max.apply(null, lr.samples.map(function(s) { return s.y; }));
            return 'Rim out. Apex was ' + apex.toFixed(2) + ' m. ' + (apex < 3.6 ? 'Try a higher arc — increase release angle by ~3°.' : 'Arc was OK — speed was the issue. Increase by ~1 mph.');
          }
          if (loc === 'backboard') return 'Backboard catch. Your shot was too hard or too flat — bank shots need a flatter angle, but your apex still has to clear the rim.';
          if (loc === 'air') return 'Airball — short of the rim entirely. You need either more speed or steeper release angle.';
          return 'Missed the rim. Most likely lateral aim was off.';
        }
        // Free kick
        if (isFreeKick) {
          var curlM = lr.samples ? (Math.max.apply(null, lr.samples.map(function(s) { return s.x; })) - Math.min.apply(null, lr.samples.map(function(s) { return s.x; }))) : 0;
          if (loc === 'goal') {
            return 'GOAL! Magnus curl bent the ball ' + curlM.toFixed(2) + ' m laterally — that\'s ' + (d.spinRpm > 400 ? 'classic Beckham work.' : 'a low-spin power finish.');
          }
          if (loc === 'post') return 'Inches from glory. Tweak spin axis by ±5° or speed by 1-2 mph and you\'ll find the net.';
          if (loc === 'over') return 'Over the bar. Reduce launch angle (vertical aim) by 4-6° or lower speed slightly.';
          if (loc === 'wide') return 'Wide of the goal. Either your aim was off or your spin axis curled the ball away from goal — flip the axis sign.';
          if (loc === 'blocked') return 'Wall block. The wall is at 9.15 m and ~1.7 m tall. You need either MORE arc (chip over) or MORE spin (curl around).';
          return 'Short of the goal line. Add 5-10 mph or steepen launch by 3-5°.';
        }
        // Field goal
        if (isFieldGoal) {
          var apexFG = Math.max.apply(null, lr.samples.map(function(s) { return s.y; }));
          if (loc === 'good') {
            return 'GOOD from ' + d.fgDistanceYd + ' yards. Peak height ' + apexFG.toFixed(1) + ' m. Optimal launch angle for this distance was around ' + (d.fgDistanceYd < 30 ? '38°' : d.fgDistanceYd < 45 ? '40°' : '42°') + ' — you used ' + d.aimDegV.toFixed(0) + '°.';
          }
          if (loc === 'doink') return 'Doink! The post or crossbar got it by inches. Move your speed up 1-2 mph or shift launch angle by 1-2°.';
          if (loc === 'shortbar') return 'Under the crossbar. You needed either more launch angle (try ' + Math.min(60, (d.aimDegV + 5)).toFixed(0) + '°) or more power.';
          if (loc === 'wideclose') return 'Just wide of the upright. Lateral aim is the lever here — check your horizontal aim slider.';
          if (loc === 'wide') return 'No good — well wide of the goalposts. Reset horizontal aim toward 0°.';
          return 'Short of the goal line — kick didn\'t carry the distance. Add power, or accept a shorter distance preset.';
        }
        return null;
      }

      function outcomeColor(loc) {
        if (isPitching) {
          return loc === 'strike' ? '#10b981' : loc === 'borderline' ? '#fbbf24' : loc === 'ball' ? '#94a3b8' : '#ef4444';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '#10b981' : loc === 'post' ? '#fbbf24' : loc === 'blocked' ? '#94a3b8' : '#ef4444';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '#10b981' : loc === 'doink' ? '#fbbf24' : loc === 'wideclose' ? '#f97316' : '#ef4444';
        }
        return loc === 'swish' ? '#10b981' : loc === 'made' ? '#3b82f6' : loc === 'rim' ? '#fbbf24' : loc === 'backboard' ? '#94a3b8' : '#ef4444';
      }

      return h('div', { style: { padding: 16, color: '#f1f5f9', maxWidth: 1100, margin: '0 auto' } },
        // Header — mode-aware title
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && h('button', {
            onClick: function() { setStemLabTool && setStemLabTool(null); },
            'data-tl-focusable': 'true',
            'aria-label': 'Back to STEM Lab',
            style: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }
          }, '← Back'),
          h('h2', { style: { margin: 0, fontSize: 20 } }, modeMeta.icon + ' ThrowLab — ' + modeMeta.label),
          h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, 'Same arm, different ball, different game.')
        ),

        // Mode picker — pill row, prominent under header. role=tablist makes
        // assistive-tech treat it as a single-select control group.
        h('div', { role: 'tablist', 'aria-label': 'Sport modes', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
          Object.keys(MODES).map(function(mid) {
            var mm = MODES[mid];
            var sel = d.mode === mid;
            return h('button', {
              key: mid,
              role: 'tab',
              onClick: function() { switchMode(mid); },
              'aria-selected': sel,
              'data-tl-focusable': 'true',
              style: {
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 13, fontWeight: 600
              }
            }, mm.icon + ' ' + mm.label);
          })
        ),

        // Difficulty / scaffold tier selector — IEP / UDL onramp.
        // Tier 1 = speed only (early elementary, "more push = farther").
        // Tier 2 = + release height + angle (when angle starts mattering).
        // Tier 3 = + spin (full physics, MS / HS / AP).
        // Wind controls follow tier 2+ so the wind panel doesn't confuse a
        // Tier 1 student. Stored on d.scaffoldTier; defaults to 3.
        h('div', { role: 'group', 'aria-label': 'Difficulty / scaffold tier',
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }
        },
          h('span', { style: { color: '#cbd5e1' } }, 'Difficulty:'),
          [
            { tier: 1, label: 'Tier 1 · Speed only', short: '1' },
            { tier: 2, label: 'Tier 2 · + Angle', short: '2' },
            { tier: 3, label: 'Tier 3 · + Spin', short: '3' }
          ].map(function(opt) {
            var sel = (d.scaffoldTier || 3) === opt.tier;
            return h('button', {
              key: 'tier' + opt.tier,
              onClick: function() {
                upd('scaffoldTier', opt.tier);
                tlAnnounce('Scaffold tier set to ' + opt.label);
              },
              'aria-pressed': sel,
              'aria-label': opt.label,
              'data-tl-focusable': 'true',
              style: {
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 12
              }
            }, opt.label);
          })
        ),

        // Two-column layout
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 } },

          // LEFT: side-view canvas + result panel
          h('div', null,
            h('canvas', {
              ref: canvasRef, width: 720, height: 360,
              role: 'img',
              tabIndex: 0,
              'data-tl-focusable': 'true',
              'aria-label': (isPitching
                ? 'Pitcher\'s mound side view. Mound on the left, home plate on the right, dashed yellow strike zone above the plate.'
                : isFreeKick
                  ? 'Soccer pitch top-down view. Ball at bottom, four-defender wall in the middle at 10 yards, goalposts 7.32 meters wide at the top. Spin curls the ball laterally.'
                  : isFieldGoal
                    ? 'Football field side view with hash-mark distance labels, yellow tee on the left, and yellow goalposts at ' + d.fgDistanceYd + ' yards.'
                    : 'Basketball court side view. Free-throw line on the left, hoop with backboard on the right. Orange bar is the rim at 10 feet.')
                + (lr ? ' Last throw outcome: ' + outcomeLabel(lr.location).replace(/^[^A-Za-z]+/, '') + '.' : ''),
              style: { width: '100%', maxWidth: 720, height: 'auto', borderRadius: 10, border: '1px solid #334155', background: '#0f172a' }
            }),
            // Result panel — given an h3 so AT users tabbing into the section
            // know what they're reading. region role makes the panel announce
            // its label when entered.
            h('section', {
              'aria-labelledby': 'tl-result-heading',
              style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }
            },
              h('h3', {
                id: 'tl-result-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, lr ? 'Last throw' : 'Ready to throw'),
              lr ? (
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: outcomeColor(lr.location), marginBottom: 6 } }, outcomeLabel(lr.location)),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } }, 'Speed'), h('div', { style: { fontWeight: 700 } }, d.speedMph + ' mph')),
                    h('div', null,
                      h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Time to plate'
                        : isFreeKick ? 'Time to goal'
                        : isFieldGoal ? 'Hang time'
                        : 'Hang time'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.outcome.plateT ? lr.outcome.plateT.toFixed(2) + ' s' : '—')
                        : (lr.samples && lr.samples.length ? lr.samples[lr.samples.length - 1].t.toFixed(2) + ' s' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Vert. break' : isFreeKick ? 'Curl' : isFieldGoal ? 'Peak height' : 'Apex'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.vBreakIn !== null ? lr.vBreakIn.toFixed(1) + ' in' : '—')
                        : isFreeKick
                          ? (lr.samples ? (Math.max.apply(null, lr.samples.map(function(s) { return s.x; })) - Math.min.apply(null, lr.samples.map(function(s) { return s.x; }))).toFixed(2) + ' m' : '—')
                          : (lr.samples ? Math.max.apply(null, lr.samples.map(function(s) { return s.y; })).toFixed(2) + ' m' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Horiz. break' : isFreeKick ? 'Spin axis' : isFieldGoal ? 'Launch ∠' : 'Release ∠'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.hBreakIn !== null ? lr.hBreakIn.toFixed(1) + ' in' : '—')
                        : isFreeKick
                          ? (d.spinAxisDeg + '°')
                          : (d.aimDegV.toFixed(1) + '°')))
                  ),
                  // Dynamic explainer — outcome-specific feedback after a throw,
                  // generated from the actual physics result. Falls through to
                  // the active preset's static teach blurb if there's no result.
                  h('div', { style: { marginTop: 8, fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } },
                    explainResult(lr) || activePreset.teach)
                )
              ) : h('div', { style: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 16 } },
                isPitching
                  ? 'Pick a pitch type, set your release, and click THROW to see the path.'
                  : isFreeKick
                    ? 'Pick a kick style and click STRIKE — watch the ball curl around the wall.'
                    : isFieldGoal
                      ? 'Pick a distance, set your launch angle and power, and click KICK — clear the bar and split the uprights.'
                      : 'Pick a shot, set your release angle, and click SHOOT to see the arc.')
            ),
            // "Show physics" toggle + keyboard shortcuts hint.
            // Bumped to slate-300 (#cbd5e1) for AA contrast on dark panel.
            h('div', { style: { marginTop: 10, fontSize: 12, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
              h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', {
                  type: 'checkbox',
                  'data-tl-focusable': 'true',
                  checked: !!d.showPhysics,
                  onChange: function(e) { upd('showPhysics', e.target.checked); }
                }),
                'Show physics overlays (no-spin reference trajectory)'),
              h('span', { style: { fontSize: 11, color: '#94a3b8' } },
                'Hotkey: ',
                h('kbd', { style: { padding: '1px 5px', borderRadius: 3, border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontFamily: 'monospace' } }, 'Space'),
                ' to throw')
            )
          ),

          // RIGHT: preset picker + sliders + throw button
          h('div', null,
            // Preset picker (pitches OR shots, mode-driven)
            h('div', { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
                isPitching ? 'Pitch type' : isFreeKick ? 'Kick style' : isFieldGoal ? 'Distance' : 'Shot type'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
                modeMeta.presets.map(function(pt) {
                  var sel = isPitching ? d.pitchType === pt.id
                          : isFreeKick ? d.kickType === pt.id
                          : isFieldGoal ? d.goalType === pt.id
                          : d.shotType === pt.id;
                  return h('button', {
                    key: pt.id,
                    onClick: function() {
                      if (isPitching) applyPitchPreset(pt.id);
                      else if (isFreeKick) applyKickPreset(pt.id);
                      else if (isFieldGoal) applyGoalPreset(pt.id);
                      else applyShotPreset(pt.id);
                    },
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 12, textAlign: 'left'
                    }
                  }, h('div', { style: { fontSize: 14 } }, pt.icon + ' ' + pt.label),
                     h('div', { style: { fontSize: 10, color: '#94a3b8' } },
                       pt.speedMph + ' mph' + (isPitching ? ' · ' + pt.spinRpm + ' rpm'
                                              : isFreeKick ? ' · spin ' + pt.spinAxisDeg + '°'
                                              : isFieldGoal ? ' · ' + pt.aimDegV + '° launch'
                                              : ' · ' + pt.aimDegV + '° arc')));
                })
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 8, padding: 8, background: '#1e293b', borderRadius: 6 } },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, 'Grip:'),
                activePreset.grip)
            ),
            // Sliders — ranges scale with mode
            h('div', { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Release controls'),
              slider('Speed', d.speedMph, modeMeta.speedRange[0], modeMeta.speedRange[1], 1, function(v) { upd('speedMph', v); }, ' mph'),
              // Tier 2+: release height + angles. Tier 1 hides them so the
              // student can focus on the speed-distance relationship alone.
              (d.scaffoldTier || 3) >= 2 ? slider('Release height', d.releaseHeight.toFixed(2), modeMeta.releaseHeightRange[0], modeMeta.releaseHeightRange[1], 0.05, function(v) { upd('releaseHeight', v); }, ' m') : null,
              (d.scaffoldTier || 3) >= 2 ? slider('Vertical aim', d.aimDegV.toFixed(1),
                isPitching ? -8 : isFreeKick ? -2 : isFieldGoal ? 20 : 30,
                isPitching ? 4 : isFreeKick ? 45 : isFieldGoal ? 60 : 70,
                0.5, function(v) { upd('aimDegV', v); }, '°') : null,
              (d.scaffoldTier || 3) >= 2 ? slider('Horizontal aim', d.aimDegH.toFixed(1), -5, 5, 0.1, function(v) { upd('aimDegH', v); }, '°') : null,
              // Tier 3: spin (the full physics surface).
              (d.scaffoldTier || 3) >= 3 ? slider('Spin rate', d.spinRpm, 0, 3500, 50, function(v) { upd('spinRpm', v); }, ' rpm') : null,
              (d.scaffoldTier || 3) >= 3 ? slider('Spin axis', d.spinAxisDeg, 0, 360, 5, function(v) { upd('spinAxisDeg', v); }, '°') : null
            ),
            // ── Wind (outdoor modes only, Tier 2+) ──
            // Free kick + field goal happen outdoors so wind is part of the
            // physics. Indoor modes (basketball is indoor) keep the panel
            // hidden so the UI doesn't clutter with irrelevant sliders.
            // Tier 1 students stick to "more speed = more distance"; wind
            // joins at Tier 2 once they've grasped the basic relationship.
            ((isFreeKick || isFieldGoal) && (d.scaffoldTier || 3) >= 2) ? h('div', {
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 }
            },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
                'Wind (relative to throw)'),
              slider('Wind speed', d.windMph || 0, 0, 25, 1, function(v) { upd('windMph', v); }, ' mph'),
              // Wind direction: 0° head, 90° R, 180° tail, 270° L
              slider('Wind direction', d.windDirDeg || 0, 0, 359, 5, function(v) { upd('windDirDeg', v); }, '°'),
              h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 4 } },
                (function() {
                  var deg = d.windDirDeg || 0;
                  if (deg < 22 || deg >= 338) return '↓ Headwind (slows the ball)';
                  if (deg < 68) return '↘ Quartering head/right';
                  if (deg < 112) return '→ Crosswind from left';
                  if (deg < 158) return '↗ Quartering tail/right';
                  if (deg < 202) return '↑ Tailwind (extends range)';
                  if (deg < 248) return '↖ Quartering tail/left';
                  if (deg < 292) return '← Crosswind from right';
                  return '↙ Quartering head/left';
                })())
            ) : null,
            // Throw / Shoot button — mode-aware label
            h('button', {
              onClick: throwPitch,
              'data-tl-focusable': 'true',
              'aria-keyshortcuts': 'Space',
              style: {
                width: '100%', padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid #fbbf24', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1a1a2e', fontSize: 16, fontWeight: 800
              }
            }, isPitching ? '⚾ THROW PITCH' : isFreeKick ? '⚽ STRIKE' : isFieldGoal ? '🏈 KICK' : '🏀 SHOOT'),
            // ── Compare Mode controls ──
            // Save the latest trajectory as a reference ghost for the next throw,
            // OR clear the existing reference. Sits between the throw button and
            // the stats so it reads as a secondary action.
            h('div', { style: { marginTop: 8, display: 'flex', gap: 6 } },
              h('button', {
                onClick: saveReference,
                'aria-label': d.referenceResult ? 'Replace saved reference with current throw' : 'Save current throw as reference',
                'data-tl-focusable': 'true',
                style: {
                  // WCAG 2.5.8 Target Size (Minimum) AA: ≥24×24 CSS px.
                  flex: 1, padding: '10px 12px', minHeight: 32, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #d946ef',
                  background: d.referenceResult ? 'rgba(217,70,239,0.18)' : '#1e293b',
                  color: '#f1f5f9', fontSize: 11, fontWeight: 600
                }
              }, d.referenceResult ? '📌 Replace reference' : '📌 Save as reference'),
              d.referenceResult ? h('button', {
                onClick: clearReference,
                'aria-label': 'Clear saved reference trajectory',
                'data-tl-focusable': 'true',
                style: {
                  // WCAG 2.5.8: small lone X needs at least 32×32 to be tappable.
                  minWidth: 32, minHeight: 32, padding: '10px 12px',
                  borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 14
                }
              }, '✕') : null
            ),
            d.referenceResult ? h('div', { style: { marginTop: 4, fontSize: 10, color: '#d946ef', fontStyle: 'italic' } },
              'REF: ' + d.referenceLabel) : null,
            // Stats line — mode-aware. Bumped slate-400 → slate-300 (#cbd5e1)
            // for AA contrast on the dark panel background.
            h('div', { style: { marginTop: 12, fontSize: 11, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' } },
              h('span', null, (isPitching ? 'Pitches: ' : isFreeKick ? 'Kicks: ' : isFieldGoal ? 'FGs: ' : 'Shots: ') + (d.throwCount || 0)),
              h('span', null, isPitching ? 'Strikes: ' + (d.strikeCount || 0)
                            : isFreeKick ? 'Goals: ' + (d.goalCount || 0)
                            : isFieldGoal ? 'Made: ' + (d.fgMakeCount || 0)
                            : 'Made: ' + (d.shotMakeCount || 0)),
              h('span', null, isPitching
                ? 'Types: ' + Object.keys(d.pitchTypesUsed || {}).length + '/' + PITCH_TYPES.length
                : isFreeKick ? 'Kick: ' + currentKick.label
                : isFieldGoal ? d.fgDistanceYd + ' yd'
                : 'Shot: ' + currentShot.label)
            )
          )
        )
      );
    }
  });

})();
