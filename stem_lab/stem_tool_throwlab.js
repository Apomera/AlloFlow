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
  function tlAnnounce(msg) {
    var lr = document.getElementById('allo-live-throwlab');
    if (lr) lr.textContent = msg;
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
    }
  };

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
    var outcome = null;
    while (t < maxT) {
      var spd = Math.sqrt(vx * vx + vy * vy + vz * vz);
      // Drag: F = -½ρv²·Cd·A · v̂
      var dragMag = 0.5 * RHO * spd * spd * ball.cd * area;
      var dragFx = spd > 0 ? -dragMag * (vx / spd) : 0;
      var dragFy = spd > 0 ? -dragMag * (vy / spd) : 0;
      var dragFz = spd > 0 ? -dragMag * (vz / spd) : 0;
      // Magnus: F = ½ρv²·Cm·A · (ω̂ × v̂)
      // The ω × v̂ direction gives the lift sense; Cm scales magnitude.
      // Cross product (ω × v̂):
      var vhx = spd > 0 ? vx / spd : 0;
      var vhy = spd > 0 ? vy / spd : 0;
      var vhz = spd > 0 ? vz / spd : 0;
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
            // Mode + free-throw extras
            mode: 'pitching',          // 'pitching' | 'freethrow'
            shotType: 'freethrow',
            shotMakeCount: 0           // free-throw scoring
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

      function switchMode(newMode) {
        var modeMeta = MODES[newMode];
        if (!modeMeta) return;
        setLabToolData(function(prev) {
          var defaults = newMode === 'pitching'
            ? { speedMph: 92, releaseHeight: 1.85, aimDegV: -1.5, aimDegH: 0, spinRpm: 2300, spinAxisDeg: 0 }
            : { speedMph: 16, releaseHeight: 2.2, aimDegV: 52, aimDegH: 0, spinRpm: 180, spinAxisDeg: 0 };
          var next = Object.assign({}, prev.throwlab, defaults, {
            mode: newMode, lastResult: null, replayActive: false, replayT: 0
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Switched to ' + modeMeta.label + ' mode.');
      }

      function throwPitch() {
        var modeMeta = MODES[d.mode] || MODES.pitching;
        var simOpts = {
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: d.spinRpm,
          spinAxisDeg: d.spinAxisDeg,
          throwerHand: d.throwerHand,
          targetZ: modeMeta.targetZ,
          releaseStride: modeMeta.releaseStrideDefault,
          truncateAtTarget: d.mode === 'pitching' // free throw needs the full arc to land
        };
        var result = simulatePitch(simOpts);
        var loc;
        if (d.mode === 'freethrow') {
          loc = classifyShotResult(result.samples, modeMeta.rimY, modeMeta.rimZ, modeMeta.rimRadius);
        } else {
          loc = result.outcome.reachedPlate
            ? classifyPlateLocation(result.outcome.plateX, result.outcome.plateY)
            : 'wild';
        }
        result.location = loc;
        // Compute break stats relative to a no-spin baseline
        var noSpin = simulatePitch({
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: 0,
          spinAxisDeg: 0,
          throwerHand: d.throwerHand
        });
        if (result.outcome.reachedPlate && noSpin.outcome.reachedPlate) {
          result.vBreakIn = (noSpin.outcome.plateY - result.outcome.plateY) * FT_PER_M * 12;
          result.hBreakIn = (result.outcome.plateX - noSpin.outcome.plateX) * FT_PER_M * 12;
        } else {
          result.vBreakIn = null; result.hBreakIn = null;
        }
        sfxThrow();
        var newThrowCount = (d.throwCount || 0) + 1;
        var isMakeOutcome = loc === 'strike' || loc === 'swish' || loc === 'made';
        var newStrikeCount = (d.mode === 'pitching' && loc === 'strike') ? (d.strikeCount || 0) + 1 : (d.strikeCount || 0);
        var newMakeCount = (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made')) ? (d.shotMakeCount || 0) + 1 : (d.shotMakeCount || 0);
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
            pitchTypesUsed: newTypesUsed
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        // Outcome SFX + announcement after a tiny delay so it doesn't talk over the throw
        setTimeout(function() {
          if (d.mode === 'pitching') {
            if (loc === 'strike') {
              sfxStrike();
              tlAnnounce('Strike! Pitch crossed the plate ' + Math.round((result.outcome.plateY || 0) * 39.37) + ' inches up.');
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
          } else { // freethrow
            if (loc === 'swish') {
              sfxStrike(); sfxStrike();
              tlAnnounce('Swish! Clean shot through the center of the rim.');
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
        // Layout
        var marginL = 40, marginR = 80, marginT = 30, marginB = 60;
        var fieldW = W - marginL - marginR;
        var fieldH = H - marginT - marginB;
        // Render-window Z extent — pitching shows the full 60.5 ft, free throw
        // zooms in on the much shorter 15-ft court so the arc reads clearly.
        var renderMaxZ = d.mode === 'pitching' ? modeMeta.targetZ : 6.5;
        var maxY = d.mode === 'pitching' ? 3.0 : 4.5;
        // World (z, y) → canvas (px, py)
        function worldToCanvas(z, y) {
          var px = marginL + (z / renderMaxZ) * fieldW;
          var py = (marginT + fieldH) - (y / maxY) * fieldH;
          return [px, py];
        }
        // Sky gradient (court air for free throw is indoor — gym roof)
        var skyTop = d.mode === 'pitching' ? '#1e3a5f' : '#3a2e2a';
        var skyBot = d.mode === 'pitching' ? '#5a7ba8' : '#6e5a48';
        var skyGrad = gfx.createLinearGradient(0, 0, 0, marginT + fieldH);
        skyGrad.addColorStop(0, skyTop);
        skyGrad.addColorStop(1, skyBot);
        gfx.fillStyle = skyGrad;
        gfx.fillRect(0, 0, W, marginT + fieldH);
        // Floor — grass for pitching, hardwood for free throw
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
        } else {
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
            truncateAtTarget: d.mode === 'pitching'
          });
          gfx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
          gfx.lineWidth = 1.5;
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          for (var i = 0; i < noSpin.samples.length; i++) {
            var s = noSpin.samples[i];
            if (s.z > renderMaxZ) break;
            var p = worldToCanvas(s.z, s.y);
            if (i === 0) gfx.moveTo(p[0], p[1]); else gfx.lineTo(p[0], p[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
        }

        // Actual trajectory (color by outcome — pitching strike-zone palette OR
        // free-throw make/miss palette).
        if (lr) {
          var trajColor;
          if (d.mode === 'freethrow') {
            trajColor = lr.location === 'swish' ? '#10b981'
                      : lr.location === 'made' ? '#3b82f6'
                      : lr.location === 'rim' ? '#fbbf24'
                      : lr.location === 'backboard' ? '#94a3b8'
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
            var pj = worldToCanvas(sj.z, sj.y);
            if (j === 0) gfx.moveTo(pj[0], pj[1]); else gfx.lineTo(pj[0], pj[1]);
          }
          gfx.stroke();
          // Ball at the leading edge of the trajectory
          if (renderUpTo > 0) {
            var ballSample = lr.samples[Math.min(renderUpTo - 1, lr.samples.length - 1)];
            var bp = worldToCanvas(ballSample.z, ballSample.y);
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
        d.spinRpm, d.spinAxisDeg, d.throwerHand, d.showPhysics
      ]);

      // ── Replay animator: walk replayT from 0 → 1 over ~1s ──
      React.useEffect(function() {
        if (!d.replayActive) return;
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
        return h('div', { style: { marginBottom: 10 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 4 } },
            h('span', null, label),
            h('span', { style: { color: '#fbbf24', fontWeight: 600 } }, value + (suffix || ''))
          ),
          h('input', {
            type: 'range', min: min, max: max, step: step, value: value,
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#fbbf24' }
          })
        );
      }

      var lr = d.lastResult;
      var modeMeta = MODES[d.mode] || MODES.pitching;
      var isPitching = d.mode === 'pitching';
      var isFreeThrow = d.mode === 'freethrow';
      // Active preset for the bottom-of-canvas teach blurb
      var currentShot = SHOT_TYPES.find(function(s) { return s.id === d.shotType; }) || SHOT_TYPES[0];
      var activePreset = isPitching ? currentPitch : currentShot;

      // Outcome label + color (mode-specific)
      function outcomeLabel(loc) {
        if (isPitching) {
          return loc === 'strike' ? '🎯 STRIKE'
               : loc === 'borderline' ? '⚪ Borderline'
               : loc === 'ball' ? '⚾ Ball (outside zone)'
               : '😬 Wild pitch';
        }
        return loc === 'swish' ? '🌊 SWISH (clean center)'
             : loc === 'made' ? '🏀 MADE IT'
             : loc === 'rim' ? '〰️ Off the rim'
             : loc === 'backboard' ? '🪞 Off the backboard'
             : loc === 'air' ? '💨 Airball (short)'
             : '😬 Miss';
      }
      function outcomeColor(loc) {
        if (isPitching) {
          return loc === 'strike' ? '#10b981' : loc === 'borderline' ? '#fbbf24' : loc === 'ball' ? '#94a3b8' : '#ef4444';
        }
        return loc === 'swish' ? '#10b981' : loc === 'made' ? '#3b82f6' : loc === 'rim' ? '#fbbf24' : loc === 'backboard' ? '#94a3b8' : '#ef4444';
      }

      return h('div', { style: { padding: 16, color: '#f1f5f9', maxWidth: 1100, margin: '0 auto' } },
        // Header — mode-aware title
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && h('button', {
            onClick: function() { setStemLabTool && setStemLabTool(null); },
            style: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }
          }, '← Back'),
          h('h2', { style: { margin: 0, fontSize: 20 } }, modeMeta.icon + ' ThrowLab — ' + modeMeta.label),
          h('span', { style: { fontSize: 12, color: '#94a3b8' } }, 'Same arm, different ball, different game.')
        ),

        // Mode picker — pill row, prominent under header
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
          Object.keys(MODES).map(function(mid) {
            var mm = MODES[mid];
            var sel = d.mode === mid;
            return h('button', {
              key: mid,
              onClick: function() { switchMode(mid); },
              'aria-pressed': sel,
              style: {
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 13, fontWeight: 600
              }
            }, mm.icon + ' ' + mm.label);
          })
        ),

        // Two-column layout
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 } },

          // LEFT: side-view canvas + result panel
          h('div', null,
            h('canvas', {
              ref: canvasRef, width: 720, height: 360,
              'aria-label': isPitching
                ? 'Side view of pitcher\'s mound and home plate. The strike zone is the dashed yellow box above the plate.'
                : 'Side view of free-throw line and basketball hoop. The orange bar is the rim at 10 feet.',
              style: { width: '100%', maxWidth: 720, height: 'auto', borderRadius: 10, border: '1px solid #334155', background: '#0f172a' }
            }),
            // Result panel
            h('div', { style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 } },
              lr ? (
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: outcomeColor(lr.location), marginBottom: 6 } }, outcomeLabel(lr.location)),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } }, 'Speed'), h('div', { style: { fontWeight: 700 } }, d.speedMph + ' mph')),
                    h('div', null,
                      h('div', { style: { color: '#94a3b8', fontSize: 11 } }, isPitching ? 'Time to plate' : 'Hang time'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.outcome.plateT ? lr.outcome.plateT.toFixed(2) + ' s' : '—')
                        : (lr.samples && lr.samples.length ? lr.samples[lr.samples.length - 1].t.toFixed(2) + ' s' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } }, isPitching ? 'Vert. break' : 'Apex'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.vBreakIn !== null ? lr.vBreakIn.toFixed(1) + ' in' : '—')
                        : (lr.samples ? Math.max.apply(null, lr.samples.map(function(s) { return s.y; })).toFixed(2) + ' m' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } }, isPitching ? 'Horiz. break' : 'Release ∠'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.hBreakIn !== null ? lr.hBreakIn.toFixed(1) + ' in' : '—')
                        : (d.aimDegV.toFixed(1) + '°')))
                  ),
                  h('div', { style: { marginTop: 8, fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } }, activePreset.teach)
                )
              ) : h('div', { style: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 16 } },
                isPitching
                  ? 'Pick a pitch type, set your release, and click THROW to see the path.'
                  : 'Pick a shot, set your release angle, and click SHOOT to see the arc.')
            ),
            // "Show physics" toggle
            h('div', { style: { marginTop: 10, fontSize: 12, color: '#94a3b8' } },
              h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'checkbox', checked: !!d.showPhysics, onChange: function(e) { upd('showPhysics', e.target.checked); } }),
                'Show physics overlays (no-spin reference trajectory)')
            )
          ),

          // RIGHT: preset picker + sliders + throw button
          h('div', null,
            // Preset picker (pitches OR shots, mode-driven)
            h('div', { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
                isPitching ? 'Pitch type' : 'Shot type'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
                modeMeta.presets.map(function(pt) {
                  var sel = isPitching ? d.pitchType === pt.id : d.shotType === pt.id;
                  return h('button', {
                    key: pt.id,
                    onClick: function() { isPitching ? applyPitchPreset(pt.id) : applyShotPreset(pt.id); },
                    'aria-pressed': sel,
                    style: {
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 12, textAlign: 'left'
                    }
                  }, h('div', { style: { fontSize: 14 } }, pt.icon + ' ' + pt.label),
                     h('div', { style: { fontSize: 10, color: '#94a3b8' } }, pt.speedMph + ' mph' + (isPitching ? ' · ' + pt.spinRpm + ' rpm' : ' · ' + pt.aimDegV + '° arc')));
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
              slider('Release height', d.releaseHeight.toFixed(2), modeMeta.releaseHeightRange[0], modeMeta.releaseHeightRange[1], 0.05, function(v) { upd('releaseHeight', v); }, ' m'),
              slider('Vertical aim', d.aimDegV.toFixed(1), isPitching ? -8 : 30, isPitching ? 4 : 70, 0.5, function(v) { upd('aimDegV', v); }, '°'),
              slider('Horizontal aim', d.aimDegH.toFixed(1), -5, 5, 0.1, function(v) { upd('aimDegH', v); }, '°'),
              d.scaffoldTier >= 3 ? slider('Spin rate', d.spinRpm, 0, 3500, 50, function(v) { upd('spinRpm', v); }, ' rpm') : null,
              d.scaffoldTier >= 3 ? slider('Spin axis', d.spinAxisDeg, 0, 360, 5, function(v) { upd('spinAxisDeg', v); }, '°') : null
            ),
            // Throw / Shoot button — mode-aware label
            h('button', {
              onClick: throwPitch,
              style: {
                width: '100%', padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid #fbbf24', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1a1a2e', fontSize: 16, fontWeight: 800
              }
            }, isPitching ? '⚾ THROW PITCH' : '🏀 SHOOT'),
            // Stats line — mode-aware
            h('div', { style: { marginTop: 12, fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' } },
              h('span', null, (isPitching ? 'Pitches: ' : 'Shots: ') + (d.throwCount || 0)),
              h('span', null, isPitching ? 'Strikes: ' + (d.strikeCount || 0) : 'Made: ' + (d.shotMakeCount || 0)),
              h('span', null, isPitching
                ? 'Types: ' + Object.keys(d.pitchTypesUsed || {}).length + '/' + PITCH_TYPES.length
                : 'Shot: ' + currentShot.label)
            )
          )
        )
      );
    }
  });

})();
