// ═══════════════════════════════════════════
// stem_tool_bikelab.js — BikeLab: Physics & Repair
// A side-view 2D physics sandbox + interactive gearing lab + hands-on repair
// simulator. Teaches Newton's laws, mechanical advantage, energy conservation,
// and procedural bike-maintenance skills. No three.js — everything renders on a
// single HTML canvas for lightweight load.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('bikeLab'))) {

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-bikelab-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-bikelab-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-bikelab-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"bikeLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"bikeLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"bikeLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // Detect prefers-reduced-motion at module load — used to gate canvas-level
  // cosmetic motion (rotating pedal crank, particle emitters) for vestibular-
  // sensitive users. The simulation itself still runs; only purely decorative
  // animation is suppressed.
  var _prefersReducedMotion = (function() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-bikelab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-bikelab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  (function() {
    if (document.getElementById('allo-stem-bikelab-refine-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-bikelab-refine-css';
    st.textContent = [
      '.bikelab-sandbox-grid{display:grid;grid-template-columns:minmax(250px,300px) minmax(0,1fr);gap:12px}',
      '.bikelab-ride-focus-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr);gap:12px}',
      '.bikelab-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.bikelab-canvas-shell{position:relative;border-radius:18px;padding:10px;background:linear-gradient(180deg,rgba(15,23,42,.98),#07111f);border:1px solid rgba(34,211,238,.34);box-shadow:0 18px 40px rgba(15,23,42,.32),inset 0 1px 0 rgba(255,255,255,.08)}',
      '.bikelab-canvas-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.bikelab-fit-canvas{width:100%!important;height:auto!important;display:block}',
      '.bikelab-root button,.bikelab-root [role=button],.bikelab-root select{min-height:44px}',
      '.bikelab-root table button{min-height:24px}',
      '.bikelab-root button.w-10,.bikelab-root button[aria-label*="ullscreen"]{min-width:44px}',
      '.bikelab-root [data-bikelab-view-title]:focus-visible{outline:3px solid #0ea5e9;outline-offset:4px;border-radius:6px}',
      '.bikelab-control-card{border-radius:14px!important;border-color:rgba(100,116,139,.45)!important;box-shadow:0 10px 24px rgba(15,23,42,.10)!important}',
      '@media(max-width:920px){.bikelab-sandbox-grid,.bikelab-ride-focus-grid{grid-template-columns:1fr!important}.bikelab-metric-grid{grid-template-columns:1fr!important}.bikelab-canvas-shell{padding:6px!important}.bikelab-canvas-toolbar{justify-content:flex-start!important}}'
    ].join('');
    document.head.appendChild(st);
  })();


  // ─────────────────────────────────────────────────────────
  // SECTION 1: BIKES — spec sheet drives the physics sim
  // ─────────────────────────────────────────────────────────
  // mass = rider(70 kg) + bike; crr = rolling-resistance coefficient;
  // cdA = drag coefficient × frontal area (m²); wheelR = wheel radius (m);
  // chainringT / cassetteT = stock gearing (teeth); maxPower = sustained watts.
  var BIKES = [
    {
      id: 'cruiser', name: 'Beach Cruiser', icon: '🚲',
      mass: 85, crr: 0.008, cdA: 0.68, wheelR: 0.336,
      chainringT: [44], cassetteT: [28, 24, 22, 20, 18, 16, 14],
      maxPower: 150,
      desc: 'Upright posture, wide tires, relaxed geometry. Heavy but forgiving.',
      tip: 'High Crr + upright posture = lots of rolling & drag loss. Great for flat neighborhoods, painful on hills.'
    },
    {
      id: 'hybrid', name: 'Hybrid Commuter', icon: '🚴',
      mass: 80, crr: 0.006, cdA: 0.52, wheelR: 0.340,
      chainringT: [48, 38, 28], cassetteT: [34, 28, 24, 21, 19, 17, 15, 13, 11],
      maxPower: 200,
      desc: 'Middle-ground bike: upright-ish, medium-width tires, wide gear range. The all-rounder.',
      tip: '27 possible gear combos! Most riders only use ~8. Avoiding cross-chain (big-big / small-small) saves wear.'
    },
    {
      id: 'road', name: 'Road Bike', icon: '🏁',
      mass: 78, crr: 0.004, cdA: 0.40, wheelR: 0.337,
      chainringT: [50, 34], cassetteT: [32, 28, 25, 22, 19, 17, 15, 13, 12, 11],
      maxPower: 280,
      desc: 'Drop bars, skinny slick tires, aero tuck. Built for speed on pavement.',
      tip: 'Cd×A can drop to 0.32 in a full tuck — 20% less drag than riding on the hoods (0.40), and almost 40% less than a hybrid.'
    },
    {
      id: 'mtb', name: 'Mountain Bike', icon: '⛰️',
      mass: 90, crr: 0.012, cdA: 0.57, wheelR: 0.355,
      chainringT: [32], cassetteT: [50, 42, 36, 30, 26, 22, 19, 16, 14, 12, 10],
      maxPower: 230,
      desc: 'Fat knobby tires, suspension, wide 1× gearing. Made for dirt and roots.',
      tip: 'Knobbies triple the rolling resistance on pavement. Run 28+ psi on road to help.'
    },
    {
      id: 'ebike', name: 'Pedal-Assist E-Bike', icon: '⚡',
      mass: 100, crr: 0.007, cdA: 0.56, wheelR: 0.340,
      chainringT: [42], cassetteT: [32, 28, 24, 21, 19, 17, 15, 13, 11],
      maxPower: 250, assistW: 250,
      desc: 'Commuter with a 250 W motor that helps while you pedal, up to 20 mph.',
      tip: 'The motor matches your own pedal power, up to 250 W, and cuts out at 20 mph. Heavier, but hills get much easier.'
    },
    {
      id: 'cargo', name: 'Cargo Bike', icon: '📦',
      mass: 135, crr: 0.009, cdA: 0.72, wheelR: 0.325,
      chainringT: [38, 28], cassetteT: [34, 28, 24, 21, 18, 15, 13, 11],
      maxPower: 220,
      desc: 'Long-tail or front-loader built to haul groceries, kids, or 80 kg of payload. Very heavy, very stable.',
      tip: 'Mass dominates climbing — on a 6% grade the extra 50 kg adds about 30 N of hill force, roughly 90 W more at a 7 mph climb.'
    },
    {
      id: 'bmx', name: 'BMX', icon: '🤘',
      mass: 81, crr: 0.011, cdA: 0.55, wheelR: 0.254,
      chainringT: [25], cassetteT: [9],
      maxPower: 180,
      desc: 'Single-speed, 20″ wheels, super short wheelbase. Built for tricks and pump tracks, not commuting.',
      tip: 'Single gear + tiny wheels = low top speed but insane acceleration and control at low speed.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2: TERRAINS — define the sandbox course
  // ─────────────────────────────────────────────────────────
  // Each terrain is a function x → (elevation in m, surface kind).
  // Surface kind maps to a Crr multiplier (pavement=1, dirt=1.8, sand=3.0, wet=1.2).
  var TERRAINS = [
    {
      id: 'flat', name: 'Flat Pavement', icon: '🛣️',
      desc: 'Perfectly level smooth asphalt for 400 m. The control case.',
      // x param is unused for flat terrain (y always 0); kept to match interface.
      profile: function(_x) { return { y: 0, kind: 'pavement' }; }
    },
    {
      id: 'rollinghills', name: 'Rolling Hills', icon: '⛰️',
      desc: 'Gentle rolling hills (4 m from peak to dip, 5% at the steepest). Learn how gravity stores and releases energy.',
      // Starts on a flat crest (y=0, slope 0), dips 4 m and climbs back: PE → KE → PE.
      // Steepest slope = 2/40 = 5%. (Earlier profiles peaked at 20%, a wall, not a rolling hill.)
      profile: function(x) { return { y: 2 * Math.cos(x / 40) - 2, kind: 'pavement' }; }
    },
    {
      id: 'steephill', name: 'Steep Climb', icon: '🏔️',
      desc: 'A single 6 % grade climb for 200 m, then flat. Tests your sustained power.',
      profile: function(x) {
        if (x < 200) return { y: x * 0.06, kind: 'pavement' };
        return { y: 12, kind: 'pavement' };
      }
    },
    {
      id: 'dirt', name: 'Dirt Trail', icon: '🌲',
      desc: 'Mildly rolling terrain with loose dirt (Crr ≈ 1.8× pavement).',
      profile: function(x) { return { y: 3 * Math.sin(x / 25), kind: 'dirt' }; }
    },
    {
      id: 'wet', name: 'Rainy Road', icon: '🌧️',
      desc: 'Flat but wet. Slightly higher Crr + lower braking friction.',
      // x param is unused for flat-wet terrain (y always 0); kept to match interface.
      profile: function(_x) { return { y: 0, kind: 'wet' }; }
    }
  ];

  var SURFACE_CRR_MULT = { pavement: 1.0, dirt: 1.8, sand: 3.0, wet: 1.2 };
  var G = 9.81;        // m/s²
  var RHO_AIR = 1.225; // kg/m³ at sea level, 15°C

  // ── Drawing helpers shared by the Braking and Neighborhood Ride scenes ──
  // A bike and rider drawn with lines, wheels resting on (x, y). o: { scale, alpha, wheelRot, pedal, frame, braking }.
  function drawBikeFigure(c, x, y, o) {
    o = o || {};
    var k = o.scale || 1, rot = o.wheelRot || 0, ped = o.pedal || 0;
    c.save();
    c.translate(x, y); c.scale(k, k);
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.lineCap = 'round'; c.lineJoin = 'round';
    var wheel = function(cx) {
      c.strokeStyle = '#0f172a'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, -10, 10, 0, 2 * Math.PI); c.stroke();
      c.strokeStyle = 'rgba(15,23,42,0.45)'; c.lineWidth = 1;
      for (var i = 0; i < 4; i++) {
        var a = rot + i * Math.PI / 4;
        c.beginPath(); c.moveTo(cx - 9 * Math.cos(a), -10 - 9 * Math.sin(a)); c.lineTo(cx + 9 * Math.cos(a), -10 + 9 * Math.sin(a)); c.stroke();
      }
    };
    wheel(-17); wheel(17);
    if (o.braking) { c.fillStyle = '#ef4444'; c.beginPath(); c.arc(-27, -22, 3.2, 0, 2 * Math.PI); c.fill(); }
    // frame
    c.strokeStyle = o.frame || '#e11d48'; c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(-17, -10); c.lineTo(0, -10); c.lineTo(-6, -29); c.lineTo(-17, -10);
    c.moveTo(-6, -29); c.lineTo(11, -29); c.lineTo(0, -10);
    c.moveTo(11, -29); c.lineTo(17, -10);
    c.stroke();
    c.strokeStyle = '#0f172a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-11, -31); c.lineTo(-2, -31); c.moveTo(10, -30); c.lineTo(15, -36); c.stroke();
    // rider: legs follow the pedals
    var px = 5 * Math.cos(ped), py = -10 + 5 * Math.sin(ped);
    c.strokeStyle = '#1e3a8a'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-6, -33); c.lineTo(3 + px * 0.4, -21 + (py + 10) * 0.5); c.lineTo(px, py); c.stroke();
    c.strokeStyle = '#2563eb'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(-6, -33); c.lineTo(5, -47); c.stroke();
    c.strokeStyle = '#fbbf77'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(5, -46); c.lineTo(14, -36); c.stroke();
    c.fillStyle = '#fbbf77'; c.beginPath(); c.arc(8, -53, 4.6, 0, 2 * Math.PI); c.fill();
    c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(8, -54.5, 5.4, Math.PI, 2 * Math.PI); c.fill();   // helmet
    c.restore();
  }
  // Sky, sun, drifting clouds and two layers of far hills. shift moves the layers slowly (parallax); mood: 'clear' | 'rain' | 'cold'.
  function drawSkyBackdrop(c, W, horizonY, shift, mood) {
    var sky = c.createLinearGradient(0, 0, 0, horizonY);
    if (mood === 'rain') { sky.addColorStop(0, '#64748b'); sky.addColorStop(1, '#cbd5e1'); }
    else if (mood === 'cold') { sky.addColorStop(0, '#93c5fd'); sky.addColorStop(1, '#f1f5f9'); }
    else { sky.addColorStop(0, '#38bdf8'); sky.addColorStop(1, '#e0f2fe'); }
    c.fillStyle = sky; c.fillRect(0, 0, W, horizonY);
    if (mood !== 'rain') {
      var glow = c.createRadialGradient(W * 0.82, horizonY * 0.28, 4, W * 0.82, horizonY * 0.28, 70);
      glow.addColorStop(0, 'rgba(254,249,195,0.95)'); glow.addColorStop(0.25, 'rgba(253,224,71,0.6)'); glow.addColorStop(1, 'rgba(253,224,71,0)');
      c.fillStyle = glow; c.fillRect(W * 0.82 - 70, horizonY * 0.28 - 70, 140, 140);
    }
    c.fillStyle = mood === 'rain' ? 'rgba(226,232,240,0.85)' : 'rgba(255,255,255,0.9)';
    for (var i = 0; i < 5; i++) {
      var cx = (((i * 263 + 90) - shift * 0.08) % (W + 220) + (W + 220)) % (W + 220) - 110, cy = horizonY * (0.16 + (i % 3) * 0.13);
      c.beginPath(); c.ellipse(cx, cy, 44, 14, 0, 0, 2 * Math.PI); c.ellipse(cx + 26, cy - 9, 30, 13, 0, 0, 2 * Math.PI); c.ellipse(cx - 28, cy - 5, 26, 11, 0, 0, 2 * Math.PI); c.fill();
    }
    var ridge = function(amp, period, speed, base, color) {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, horizonY);
      for (var x = 0; x <= W; x += 8) {
        var u = (x + shift * speed) / period;
        c.lineTo(x, base - amp * (0.6 * Math.sin(u) + 0.4 * Math.sin(u * 2.3 + 1.7)));
      }
      c.lineTo(W, horizonY); c.closePath(); c.fill();
    };
    ridge(26, 150, 0.15, horizonY - 30, mood === 'rain' ? '#94a3b8' : '#a5b4fc');
    ridge(18, 95, 0.3, horizonY - 12, mood === 'rain' ? '#64748b' : '#6ee7b7');
  }
  function drawStopSign(c, x, groundY, size) {
    c.fillStyle = '#64748b'; c.fillRect(x - 2, groundY - size * 2.6, 4, size * 2.6);
    c.fillStyle = '#dc2626'; c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.beginPath();
    for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; var px = x + size * Math.cos(a), py = groundY - size * 2.6 + size * Math.sin(a); if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffffff'; c.font = 'bold ' + Math.round(size * 0.62) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('STOP', x, groundY - size * 2.6 + 1); c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  }

  // ── Gear model, shared by the Sandbox, the Neighborhood Ride and the Climb Simulator ──
  // A gear never changes how much power the rider makes. It changes how fast the legs must
  // turn (cadence = wheel turns ÷ gear ratio) and how hard they must push (force at the
  // tire = pedal force × crank length ÷ (gear ratio × wheel radius)). Too hard a gear on a
  // hill: the rider cannot push the pedals round. Too easy a gear on the flat: the legs spin out.
  var CRANK_M = 0.17;        // crank length, m
  var BEST_CADENCE = 85;     // rpm where a rider makes full power
  function bikeGearRange(bike) {
    var rings = bike.chainringT, cogs = bike.cassetteT;
    return { lo: Math.min.apply(null, rings) / Math.max.apply(null, cogs), hi: Math.max.apply(null, rings) / Math.min.apply(null, cogs) };
  }
  // The 0.2–1.0 gear slider picks a ratio between the bike's easiest and hardest gear (even steps in feel).
  function gearRatioFor(bike, slider) {
    var r = bikeGearRange(bike);
    var f = Math.max(0, Math.min(1, ((+slider || 0) - 0.2) / 0.8));
    return r.lo * Math.pow(r.hi / r.lo, f);
  }
  function cadenceRpmFor(v, wheelR, ratio) {
    return (v > 0 && wheelR > 0 && ratio > 0) ? (v / (2 * Math.PI * wheelR * ratio)) * 60 : 0;
  }
  // Share of full power the legs can make at a cadence: best near 85 rpm, less when grinding slowly, collapsing when spinning out.
  function cadenceEfficiency(rpm) {
    if (!(rpm >= 0)) return 0.3;
    if (rpm <= BEST_CADENCE) return Math.max(0.3, 1 - Math.pow((BEST_CADENCE - rpm) / 100, 2));
    return Math.max(0.05, 1 - Math.pow((rpm - BEST_CADENCE) / 65, 2));
  }
  // Most force the rider can put on the road in this gear, whatever the speed (N): about 60% of body weight on the pedals, on average.
  function gearForceLimit(bike, ratio, riderMassKg) {
    return (0.6 * (riderMassKg || 70) * G) * CRANK_M / (ratio * bike.wheelR);
  }
  // Pedal-assist motor: matches the rider's own power up to bike.assistW, only while pedaling, and cuts out at 20 mph.
  var ASSIST_CUTOFF = 8.94; // m/s
  function motorAssistForce(bike, v, riderPower) {
    if (!bike.assistW || !(riderPower > 0) || v >= ASSIST_CUTOFF) return 0;
    return Math.min(bike.assistW, riderPower) / Math.max(v, 2);
  }
  // Force put on the road in this gear at this speed (N): the rider's legs, plus the motor on a pedal-assist bike.
  function pedalDriveForce(bike, ratio, v, riderPower, riderMassKg) {
    var P = Math.min(riderPower, bike.maxPower);
    // Near a standstill this is huge, so the gear's force limit below is what counts: starting off is about push, not power.
    var powerForce = (P * cadenceEfficiency(cadenceRpmFor(v, bike.wheelR, ratio))) / Math.max(v, 0.05);
    return Math.max(0, Math.min(powerForce, gearForceLimit(bike, ratio, riderMassKg))) + motorAssistForce(bike, v, P);
  }
  // ── Stopping model, shared by the Braking view and its challenges ──
  // Typical commuter geometry: wheelbase L, center of mass height h and its distance a ahead of the rear axle.
  // Front-wheel braking is limited by tipping over the bars (g·(L − a)/h) as well as by grip (μ·g).
  var BRAKE_MU = { dry: 0.80, wet: 0.45, gravel: 0.35, ice: 0.10 };
  function brakingStop(mph, surfaceKey, split, reactionSec) {
    var mu = BRAKE_MU[surfaceKey] != null ? BRAKE_MU[surfaceKey] : BRAKE_MU.dry;
    var L = 1.05, hCom = 1.1, aCom = 0.42 * L;
    var endoA = G * (L - aCom) / hCom, frictionA = mu * G;
    var achieved = split === 'rear' ? 0.3 * frictionA : split === 'front' ? Math.min(endoA, frictionA) : Math.min(0.95 * endoA, 0.9 * frictionA);
    var v = mph / 2.237;
    var braking = (v * v) / (2 * achieved), reactionDist = v * reactionSec;
    return { mu: mu, endoA: endoA, frictionA: frictionA, achieved: achieved, speedMs: v, braking: braking, reaction: reactionDist, total: braking + reactionDist, time: reactionSec + v / achieved };
  }
  // Each challenge asks for a prediction, then runs both setups through brakingStop. The right answer is the option
  // nearest the measured ratio, so it always agrees with the model.
  var BRAKE_CHALLENGES = [
    { id: 'double-speed', measure: 'braking', q: 'You brake hard from 10 mph. Then you try again from 20 mph. How does the BRAKING distance change?',
      from: { mph: 10, surf: 'dry', split: 'both', react: 1 }, to: { mph: 20, surf: 'dry', split: 'both', react: 1 },
      options: [[2, 'About 2× longer'], [3, 'About 3× longer'], [4, 'About 4× longer']],
      why: 'Braking distance grows with speed × speed. Twice the speed needs four times the distance.' },
    { id: 'wet-road', measure: 'braking', q: 'Same 15 mph ride, but the road is wet instead of dry. How does the BRAKING distance change?',
      from: { mph: 15, surf: 'dry', split: 'both', react: 1 }, to: { mph: 15, surf: 'wet', split: 'both', react: 1 },
      options: [[1, 'About the same'], [1.3, 'About 1.3× longer'], [3, 'About 3× longer']],
      why: 'On a dry road the limit is tipping over the front wheel, not grip. On a wet road the tires slip first, so you cannot brake as hard and you need more room.' },
    { id: 'distracted', measure: 'total', q: 'At 15 mph you glance at a phone, so your reaction time goes from 1 second to 2 seconds. How does the TOTAL stopping distance change?',
      from: { mph: 15, surf: 'dry', split: 'both', react: 1 }, to: { mph: 15, surf: 'dry', split: 'both', react: 2 },
      options: [[1, 'About the same'], [1.6, 'About 1.6× longer'], [2, 'About 2× longer']],
      why: 'Until you react, the bike keeps going at full speed. One extra second at 15 mph is almost 7 meters before the brakes even start.' }
  ];
  function brakeChallengeResult(ch) {
    var a = brakingStop(ch.from.mph, ch.from.surf, ch.from.split, ch.from.react), b = brakingStop(ch.to.mph, ch.to.surf, ch.to.split, ch.to.react);
    var before = a[ch.measure], after = b[ch.measure], ratio = after / before;
    var best = ch.options.slice().sort(function(x, y) { return Math.abs(x[0] - ratio) - Math.abs(y[0] - ratio); })[0][0];
    return { before: before, after: after, ratio: ratio, answer: best };
  }
  // Steady speed up a constant grade in one gear (m/s); 0 means the rider cannot keep the pedals turning.
  function steadyClimbSpeed(bike, ratio, riderPower, grade, riderMassKg) {
    var m = (bike.mass - 70) + (riderMassKg || 70), angle = Math.atan(grade);
    var resist0 = m * G * Math.sin(angle) + bike.crr * m * G * Math.cos(angle);
    var v = 0, dt = 0.05;
    for (var i = 0; i < 2400; i++) {
      var net = pedalDriveForce(bike, ratio, v, riderPower, riderMassKg) - resist0 - 0.5 * RHO_AIR * bike.cdA * v * v;
      v = Math.max(0, v + (net / m) * dt);
    }
    return v < 0.2 ? 0 : v;
  }

  // "Pick the gear" challenges. Each offers the easiest, a middle and the hardest gear of one bike.
  // The right answer is whichever gear the climb model says is fastest, so the answers cannot drift from the simulator.
  var GEAR_CHALLENGES = [
    { id: 'steep-hill', bike: 'hybrid', grade: 0.08, power: 100, q: 'You reach a steep hill (8%) and pedal at an easy pace. Which gear gets you up it fastest?',
      why: 'A steep hill pushes back hard. Only the easy gear lets your legs keep turning. In the hardest gear you cannot push the pedals round at all.' },
    { id: 'flat-road', bike: 'hybrid', grade: 0, power: 100, q: 'Now the road is flat and you pedal at the same easy pace. Which gear is fastest?',
      why: 'On the flat, the middle gear lets your legs turn at a comfortable speed, which is where they make the most power. The easy gear has you spinning with nothing to push against. The hardest gear has you grinding slowly.' },
    { id: 'gentle-rise', bike: 'hybrid', grade: 0.03, power: 100, q: 'The road tips up gently (3%). Same easy pace. Which gear is fastest?',
      why: 'Even a gentle hill slows the bike enough that the middle gear leaves your legs turning too slowly to make full power. Shift down before the hill, not halfway up it.' },
    { id: 'downhill', bike: 'hybrid', grade: -0.03, power: 150, q: 'You are rolling down a gentle hill (3%) and pedalling steadily. Which gear is fastest?',
      why: 'Gravity is helping, so the bike is already moving fast. Only the hardest gear lets your legs keep up and still add some push. In the easy gear your legs cannot spin fast enough to help.' }
  ];
  function gearChallengeResult(ch) {
    var bike = BIKES.filter(function(b) { return b.id === ch.bike; })[0] || BIKES[1];
    var rings = bike.chainringT.slice().sort(function(a, b) { return a - b; }), cogs = bike.cassetteT.slice().sort(function(a, b) { return a - b; });
    var gears = [
      { key: 'easy', label: 'Easiest gear', ring: rings[0], cog: cogs[cogs.length - 1] },
      { key: 'middle', label: 'Middle gear', ring: rings[Math.floor(rings.length / 2)], cog: cogs[Math.floor((cogs.length - 1) / 2)] },
      { key: 'hard', label: 'Hardest gear', ring: rings[rings.length - 1], cog: cogs[0] }
    ];
    gears.forEach(function(g) {
      g.ratio = g.ring / g.cog;
      g.v = steadyClimbSpeed(bike, g.ratio, ch.power, ch.grade, 70);
      g.mph = g.v * 2.237;
      g.rpm = Math.round(cadenceRpmFor(g.v, bike.wheelR, g.ratio));
      g.feel = g.v <= 0 ? 'cannot turn the pedals' : g.rpm < 50 ? 'grinding slowly' : g.rpm > 150 ? 'legs cannot keep up' : g.rpm > 110 ? 'spinning too fast' : 'comfortable';
    });
    var best = gears.slice().sort(function(a, b) { return b.v - a.v; });
    return { bike: bike, gears: gears, answer: best[0].key, margin: best[1].v > 0 ? best[0].v / best[1].v : Infinity };
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3: REPAIR PROCEDURES — each a stepwise mini-sim
  // ─────────────────────────────────────────────────────────
  // Each step: id, label, instruction, (optional) tool chip to place,
  // verify() function, mistakeHint. The simulator advances when verify() passes.
  // ─────────────────────────────────────────────────────────
  // 3D bike for the Parts Inspector
  // ─────────────────────────────────────────────────────────
  // bikeModelSpec() is plain data (no 3D engine needed), so it can be checked on its own. One unit = 10 cm.
  // x points forward, y up, z toward the rider's right, which is the side the chain is on.
  // Each piece: part = the Parts Inspector id it belongs to (null for pieces that are not one of the 20 parts),
  // ex = how far it moves when the model is pulled apart.
  function bikeModelSpec() {
    var BB = [0, 2.8, 0], RA = [-4.3, 3.4, 0], FA = [6.0, 3.4, 0], SC = [-1.52, 7.77, 0], HT = [4.15, 8.3, 0], HB = [4.55, 7.0, 0], CR = [4.59, 6.87, 0];
    var TEAL = '#0d9488', DARK = '#334155', VIOLET = '#7c3aed';
    var out = [];
    var add = function(part, kind, o) { o.part = part; o.kind = kind; o.ex = o.ex || [0, 0, 0]; out.push(o); };
    var z = function(p, zz) { return [p[0], p[1], zz]; };
    // frame
    add('top_tube', 'tube', { a: SC, b: [4.2, 8.1, 0], r: 0.17, color: TEAL, ex: [0, 0.6, 0] });
    add('down_tube', 'tube', { a: BB, b: [4.5, 7.2, 0], r: 0.2, color: TEAL, ex: [0.3, -0.6, 0] });
    add('seat_tube', 'tube', { a: BB, b: SC, r: 0.18, color: TEAL });
    add('head_tube', 'tube', { a: HB, b: HT, r: 0.25, color: '#115e59', ex: [0.6, 0.2, 0] });
    [-1, 1].forEach(function(s) {
      add('chainstay', 'tube', { a: z(BB, 0.3 * s), b: z(RA, 0.62 * s), r: 0.1, color: '#0f766e', ex: [0, -0.8, 0] });
      add('seatstay', 'tube', { a: [SC[0], 7.6, 0.2 * s], b: z(RA, 0.62 * s), r: 0.09, color: '#0f766e', ex: [-0.8, 0.5, 0] });
      add(null, 'tube', { a: z(CR, 0.5 * s), b: z(FA, 0.5 * s), r: 0.11, color: DARK, ex: [1.3, 0, 0] });
    });
    add(null, 'tube', { a: z(CR, -0.5), b: z(CR, 0.5), r: 0.13, color: DARK, ex: [1.3, 0, 0] });
    add(null, 'tube', { a: HB, b: CR, r: 0.13, color: DARK, ex: [1.3, 0, 0] });
    add(null, 'tube', { a: SC, b: [-1.88, 8.95, 0], r: 0.12, color: '#64748b', ex: [0, 0.9, 0] });
    // cockpit
    add('saddle', 'ball', { c: [-2.0, 9.15, 0], scale: [1.4, 0.18, 0.7], color: '#1e293b', ex: [0, 1.8, 0] });
    add('stem', 'tube', { a: HT, b: [4.08, 8.7, 0], r: 0.14, color: '#475569', ex: [0.3, 1.1, 0] });
    add('stem', 'tube', { a: [4.08, 8.7, 0], b: [4.9, 8.95, 0], r: 0.14, color: '#475569', ex: [0.3, 1.1, 0] });
    add('handlebar', 'tube', { a: [4.9, 8.95, -3], b: [4.9, 8.95, 3], r: 0.11, color: '#94a3b8', ex: [0.6, 2.0, 0] });
    [-1, 1].forEach(function(s) {
      add('handlebar', 'tube', { a: [4.9, 8.95, 2.15 * s], b: [4.9, 8.95, 3.05 * s], r: 0.16, color: '#111827', ex: [0.6, 2.0, 0] });
      add('brake_lever', 'tube', { a: [5.0, 8.9, 1.9 * s], b: [5.75, 8.45, 2.7 * s], r: 0.11, color: '#e2e8f0', ex: [1.5, 2.0, 0] });
      add('brake_lever', 'box', { c: [5.05, 8.92, 1.85 * s], size: [0.4, 0.34, 0.4], color: '#64748b', ex: [1.5, 2.0, 0] });
    });
    add('shifter', 'box', { c: [4.85, 9.15, 1.7], size: [0.5, 0.3, 0.45], color: '#f59e0b', ex: [0.6, 3.0, 0] });
    // brakes: one over each tire
    add('caliper', 'box', { c: [4.92, 6.95, 0], size: [0.35, 0.5, 1.1], color: '#f43f5e', ex: [1.6, 0.9, 0] });
    add('caliper', 'box', { c: [-2.26, 6.61, 0], size: [0.35, 0.5, 1.0], color: '#f43f5e', ex: [-1.0, 1.2, 0] });
    // wheels
    [[FA, 1], [RA, -1]].forEach(function(w) {
      var A = w[0], sx = 2.6 * w[1];
      add('tire', 'torus', { c: A, R: 3.2, r: 0.22, color: '#1f2937', ex: [sx, 0, -2.4] });
      add('rim', 'torus', { c: A, R: 2.93, r: 0.1, color: '#cbd5e1', ex: [sx, 0, -1.6] });
      for (var i = 0; i < 12; i++) {
        var ang = i * Math.PI / 6, side = i % 2 ? 0.3 : -0.3;
        add('spokes', 'tube', { a: [A[0] + 0.2 * Math.cos(ang), A[1] + 0.2 * Math.sin(ang), side], b: [A[0] + 2.9 * Math.cos(ang), A[1] + 2.9 * Math.sin(ang), 0], r: 0.025, color: '#94a3b8', ex: [sx, 0, -0.8] });
      }
      add('spokes', 'disc', { c: A, R: 2.8, len: 0.04, color: '#94a3b8', hidden: true, ex: [sx, 0, -0.8] });
      add('hub', 'disc', { c: A, R: 0.24, len: w[1] > 0 ? 1.0 : 1.24, color: '#475569', ex: [sx, 0, 0] });
    });
    // drivetrain, on the +z side
    add('chainring', 'disc', { c: z(BB, 0.5), R: 0.97, len: 0.05, color: '#c4b5fd', ex: [0, 0, 1.6] });
    add('chainring', 'torus', { c: z(BB, 0.5), R: 0.97, r: 0.06, color: '#6d28d9', ex: [0, 0, 1.6] });
    add(null, 'tube', { a: z(BB, -0.75), b: z(BB, 0.75), r: 0.12, color: DARK });
    add(null, 'tube', { a: z(BB, 0.8), b: [1.2, 1.6, 0.8], r: 0.1, color: DARK, ex: [0, 0, 2.3] });
    add(null, 'box', { c: [1.2, 1.6, 1.25], size: [0.9, 0.15, 0.7], color: '#111827', ex: [0, 0, 2.3] });
    add(null, 'tube', { a: z(BB, -0.8), b: [-1.2, 4.0, -0.8], r: 0.1, color: DARK, ex: [0, 0, -1.0] });
    add(null, 'box', { c: [-1.2, 4.0, -1.25], size: [0.9, 0.15, 0.7], color: '#111827', ex: [0, 0, -1.0] });
    for (var ci = 0; ci < 6; ci++) add('cassette', 'disc', { c: z(RA, 0.3 + 0.07 * ci), R: 0.85 - 0.09 * ci, len: 0.05, color: ci % 2 ? VIOLET : '#a78bfa', ex: [-2.6, 0, 1.6] });
    add('rd', 'box', { c: [-4.35, 2.75, 0.78], size: [0.5, 0.45, 0.3], color: VIOLET, ex: [-2.6, -0.9, 2.5] });
    add('rd', 'tube', { a: [-4.3, 2.5, 0.64], b: [-4.05, 1.55, 0.64], r: 0.06, color: '#4c1d95', ex: [-2.6, -0.9, 2.5] });
    add('rd', 'disc', { c: [-4.3, 2.45, 0.5], R: 0.22, len: 0.1, color: '#c4b5fd', ex: [-2.6, -0.9, 2.5] });
    add('rd', 'disc', { c: [-4.05, 1.55, 0.5], R: 0.22, len: 0.1, color: '#c4b5fd', ex: [-2.6, -0.9, 2.5] });
    var CH = '#1e1b4b', chainEx = [0, -0.5, 3.2];
    add('chain', 'tube', { a: [-4.3, 4.02, 0.5], b: [0, 3.79, 0.5], r: 0.065, color: CH, ex: chainEx });
    add('chain', 'tube', { a: [0, 1.81, 0.5], b: [-4.05, 1.31, 0.5], r: 0.065, color: CH, ex: chainEx });
    add('chain', 'tube', { a: [-4.27, 1.5, 0.5], b: [-4.52, 2.45, 0.5], r: 0.065, color: CH, ex: chainEx });
    add('chain', 'tube', { a: [-4.52, 2.45, 0.5], b: [-4.86, 3.1, 0.5], r: 0.065, color: CH, ex: chainEx });
    add('chain', 'arc', { c: z(BB, 0.5), R: 0.99, r: 0.065, start: -Math.PI / 2, sweep: Math.PI, color: CH, ex: chainEx });
    add('chain', 'arc', { c: z(RA, 0.5), R: 0.62, r: 0.065, start: Math.PI / 2, sweep: Math.PI * 0.72, color: CH, ex: chainEx });
    return out;
  }
  // Turn the spec into meshes. Returns the group, a list of pickable meshes and one material list per part.
  function buildBike3D(THREE) {
    var group = new THREE.Group(), meshes = [], partMats = {};
    var up = new THREE.Vector3(0, 1, 0);
    bikeModelSpec().forEach(function(p) {
      var geo, mesh;
      var mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, metalness: 0.25 });
      if (p.hidden) { mat.transparent = true; mat.opacity = 0; mat.depthWrite = false; }
      if (p.kind === 'tube') {
        var a = new THREE.Vector3(p.a[0], p.a[1], p.a[2]), b = new THREE.Vector3(p.b[0], p.b[1], p.b[2]);
        var dir = b.clone().sub(a), len = dir.length();
        geo = new THREE.CylinderGeometry(p.r, p.r, len, 12);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(up, dir.normalize());
      } else if (p.kind === 'torus' || p.kind === 'arc') {
        geo = new THREE.TorusGeometry(p.R, p.r, 10, p.kind === 'arc' ? 24 : 56, p.kind === 'arc' ? p.sweep : Math.PI * 2);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.c[0], p.c[1], p.c[2]);
        if (p.kind === 'arc') mesh.rotation.z = p.start;
      } else if (p.kind === 'disc') {
        geo = new THREE.CylinderGeometry(p.R, p.R, p.len, 32);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.c[0], p.c[1], p.c[2]);
        mesh.rotation.x = Math.PI / 2;
      } else if (p.kind === 'box') {
        geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.c[0], p.c[1], p.c[2]);
      } else {
        geo = new THREE.SphereGeometry(1, 24, 16);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.c[0], p.c[1], p.c[2]);
        mesh.scale.set(p.scale[0], p.scale[1], p.scale[2]);
      }
      mesh.userData = { partId: p.part, base: mesh.position.clone(), ex: new THREE.Vector3(p.ex[0], p.ex[1], p.ex[2]) };
      if (p.part) { (partMats[p.part] = partMats[p.part] || []).push(mat); meshes.push(mesh); }
      group.add(mesh);
    });
    return { group: group, meshes: meshes, partMats: partMats };
  }

  var REPAIR_JOBS = [
    {
      id: 'patch_tube',
      name: 'Patch a Flat Tube',
      icon: '🩹',
      difficulty: 'Beginner',
      minutes: 15,
      description: 'The #1 roadside repair. Find the puncture, rough it up, glue, patch, reassemble.',
      steps: [
        { id: 'remove_wheel', label: 'Remove wheel', instruction: 'Open the quick-release lever (or unscrew axle nuts) and pull the wheel out of the dropouts. On rear wheels, shift into the smallest cog first so the chain lifts off easily.', tool: 'hand' },
        { id: 'deflate', label: 'Fully deflate tube', instruction: 'Unscrew the valve cap and press the valve core to release any remaining air. You can\'t remove the tire with air inside.', tool: 'hand' },
        { id: 'lever_tire', label: 'Pry tire off rim', instruction: 'Slide a plastic tire lever between the bead and rim. Hook it on a spoke. Use a second lever ~10 cm along to walk the bead over.', tool: 'tire-lever' },
        { id: 'locate_hole', label: 'Find the puncture', instruction: 'Re-inflate the tube a bit and listen / feel for escaping air. No luck? Submerge sections in water and watch for bubbles.', tool: 'pump' },
        { id: 'rough_patch', label: 'Sand the area', instruction: 'Scuff the rubber around the hole with the patch-kit sandpaper. This lets glue bond — don\'t skip it.', tool: 'sandpaper' },
        { id: 'apply_glue', label: 'Apply vulcanizing glue', instruction: 'Spread a thin layer of glue, larger than the patch. Wait 60–90 s until it turns from shiny to matte — that\'s when it\'s ready.', tool: 'glue' },
        { id: 'press_patch', label: 'Press on the patch', instruction: 'Peel the foil from one side of the patch, press it onto the glued area, and squeeze firmly for 30 seconds. Peel the clear film off only after it\'s stuck.', tool: 'patch' },
        { id: 'check_tire', label: 'Inspect the tire casing', instruction: 'Run your fingers inside the tire — carefully. Pull out any thorn, glass shard, or staple that caused the flat. Skipping this = immediate re-puncture.', tool: 'hand' },
        { id: 'reseat', label: 'Reseat the tube + tire', instruction: 'Inflate the tube just enough to hold its shape, tuck it into the tire, then walk the bead back onto the rim by hand. Levers can pinch the tube.', tool: 'hand' },
        { id: 'inflate', label: 'Inflate to spec', instruction: 'Read the pressure range printed on the tire sidewall and stay inside it. Rough guide: road tires 60–100 psi, mountain bike tires 25–40 psi. Use a gauge — a squeeze with your thumb is not accurate.', tool: 'pump' }
      ]
    },
    {
      id: 'brake_adjust',
      name: 'Adjust Rim Brakes',
      icon: '🛑',
      difficulty: 'Beginner',
      minutes: 10,
      description: 'Rim brakes rubbing, soft lever, or uneven pads? Fix cable tension and pad alignment.',
      steps: [
        { id: 'squeeze_test', label: 'Squeeze-test the lever', instruction: 'Pull the brake lever. If it hits the bar, cable is too loose. If pads touch rim without pulling, too tight.', tool: 'hand' },
        { id: 'barrel', label: 'Turn the barrel adjuster', instruction: 'Counter-clockwise = more cable tension (pads closer to rim). Clockwise = less. Quarter-turn at a time.', tool: 'hand' },
        { id: 'center_caliper', label: 'Center the caliper', instruction: 'Loosen the mounting bolt slightly. Squeeze the brake, hold, then retighten. This centers the caliper over the rim.', tool: 'allen' },
        { id: 'pad_alignment', label: 'Align pad with rim', instruction: 'Pad should hit the rim\'s braking surface squarely — not the tire (blowout!) and not below the rim (ineffective). Use the eccentric washer to adjust.', tool: 'allen' },
        { id: 'toe_in', label: 'Set a small toe-in', instruction: 'Front of the pad should touch first (1 mm of toe). Prevents brake squeal. Hold a business card under the back of the pad while tightening.', tool: 'allen' },
        { id: 'test_ride', label: 'Test ride at low speed', instruction: 'Roll slowly in a clear area. Brakes should grip firmly without squeal or pulsation. Re-adjust barrel if needed as the cable stretches in.', tool: 'hand' }
      ]
    },
    {
      id: 'chain_clean',
      name: 'Clean & Lube Chain',
      icon: '🔗',
      difficulty: 'Beginner',
      minutes: 15,
      description: 'A clean chain shifts quieter and lasts 3× longer. Degrease, dry, re-lube.',
      steps: [
        { id: 'inspect', label: 'Check chain wear', instruction: 'Use a chain-wear gauge or ruler: 12 links (= 12 inches) should measure exactly 12″. At 12 1/16″ it\'s time to replace.', tool: 'ruler' },
        { id: 'degrease', label: 'Apply degreaser', instruction: 'Spray or brush degreaser onto the chain while backpedaling. Let it sit 2–3 minutes to dissolve old grease & grit.', tool: 'degreaser' },
        { id: 'scrub', label: 'Scrub the links', instruction: 'Use an old toothbrush or chain-cleaning tool to scrub each link section. Rotate slowly — don\'t sling degreaser everywhere.', tool: 'brush' },
        { id: 'rinse', label: 'Rinse with water', instruction: 'Light spray from a bottle, not a pressure washer (which blasts grease out of internal bushings). Wipe the frame dry.', tool: 'water' },
        { id: 'dry', label: 'Dry thoroughly', instruction: 'Chain must be bone dry before lube. Wipe with a rag while rotating the pedals. Wet chain + lube = washed out immediately.', tool: 'rag' },
        { id: 'lube', label: 'Apply lube drop-by-drop', instruction: 'One drop on each roller while slowly backpedaling. Wet lube for wet weather, dry lube for dusty. Two full chain rotations.', tool: 'lube' },
        { id: 'wipe_excess', label: 'Wipe off excess', instruction: 'Hold a rag around the chain and backpedal several rotations. Excess lube attracts grit — the outside should look dry, only the rollers lubed.', tool: 'rag' }
      ]
    },
    {
      id: 'derailleur_index',
      name: 'Index the Rear Derailleur',
      icon: '⚙️',
      difficulty: 'Intermediate',
      minutes: 10,
      description: 'Chain skipping or slow to shift? Dial in cable tension one click at a time.',
      steps: [
        { id: 'smallest_cog', label: 'Shift to smallest cog', instruction: 'Shift until the chain is on the smallest cog (the hardest gear, usually the highest number on the shifter). The chain should sit cleanly on that cog.', tool: 'hand' },
        { id: 'barrel_zero', label: 'Seat the barrel adjuster', instruction: 'On the derailleur or shifter, turn the barrel adjuster clockwise until snug, then back out 2 full turns as a starting zero.', tool: 'hand' },
        { id: 'limit_h', label: 'Set the H-limit screw', instruction: 'The H screw sets how far out the derailleur can travel. Adjust until the top pulley sits directly under the smallest cog.', tool: 'phillips' },
        { id: 'limit_l', label: 'Set the L-limit screw', instruction: 'Shift into the largest cog. The L screw prevents the derailleur from going into the spokes. Adjust until the top pulley sits under the largest cog.', tool: 'phillips' },
        { id: 'tension_cable', label: 'Tension the cable', instruction: 'Loosen the cable pinch bolt, pull any slack out by hand, then retighten. You want snug, not piano-wire tight.', tool: 'allen' },
        { id: 'test_shift_up', label: 'Click one shift up', instruction: 'Pedal and click one shift. Chain should move to the 2nd cog within half a pedal rotation. Slow? Turn barrel counter-clockwise 1/4 turn to add tension.', tool: 'hand' },
        { id: 'test_all_gears', label: 'Shift through all gears', instruction: 'Cycle up then down through every cog. Each should land cleanly. Tune the barrel in tiny increments until every shift is quiet.', tool: 'hand' },
      ]
    },
    {
      id: 'pedal_change',
      name: 'Swap the Pedals',
      icon: '🦶',
      difficulty: 'Beginner',
      minutes: 8,
      description: 'Pedals wear out or you want to switch between flat, clipless, or platform. The trick: opposite threads on the left side.',
      steps: [
        { id: 'id_side', label: 'Identify left vs right', instruction: 'Pedals are stamped "L" or "R" on the spindle. The LEFT pedal uses REVERSE (counter-clockwise to tighten) threads so pedaling doesn\'t unscrew it.', tool: 'hand' },
        { id: 'wrench_on', label: 'Fit a 15mm pedal wrench', instruction: 'Use a proper pedal wrench (thinner than a normal wrench so it fits the flats). Or a 6/8mm hex on the back of the spindle if there\'s a socket.', tool: 'allen' },
        { id: 'loosen_right', label: 'Loosen the RIGHT pedal', instruction: 'Standard threads: turn counter-clockwise (toward the rear of the bike) to loosen. Use your body weight — don\'t jerk.', tool: 'allen' },
        { id: 'loosen_left', label: 'Loosen the LEFT pedal', instruction: 'Reverse threads! Turn CLOCKWISE (still toward the rear of the bike) to loosen. Getting this wrong rounds the spindle flats.', tool: 'allen' },
        { id: 'grease', label: 'Grease the new spindles', instruction: 'Dab bike grease on the threads of each new pedal. Prevents galling and makes removal easy in a year.', tool: 'lube' },
        { id: 'thread_by_hand', label: 'Thread each pedal in BY HAND', instruction: 'Start the threads by hand for a full turn or two before reaching for the wrench. If it resists, you are cross-threading — stop and restart.', tool: 'hand' },
        { id: 'torque_spec', label: 'Tighten to 35 Nm', instruction: 'Right pedal: clockwise. Left pedal: counter-clockwise. Spec is ~35 Nm — firm, not stripped. No need to lean with your whole body.', tool: 'allen' }
      ]
    },
    {
      id: 'wheel_true',
      name: 'True a Wobbly Wheel',
      icon: '🎯',
      difficulty: 'Intermediate',
      minutes: 20,
      description: 'Bent rim causing brake rub? A basic true fixes side-to-side wobble with a spoke wrench. Introduces the real truing stand workflow.',
      steps: [
        { id: 'find_wobble', label: 'Spin the wheel, find the wobble', instruction: 'Lift the bike. Spin the wheel slowly. Watch where the rim is closest to the brake pad — that\'s where the wobble is largest. Mark it with a piece of tape.', tool: 'hand' },
        { id: 'id_spokes', label: 'Identify which spokes to adjust', instruction: 'Spokes from the RIGHT side of the hub pull the rim to the right. If the rim wobbles to the right, move it LEFT: TIGHTEN the left-side spokes at the wobble (or loosen the right-side ones).', tool: 'hand' },
        { id: 'match_wrench', label: 'Match the spoke wrench to nipple size', instruction: 'Spoke nipples come in 3.2mm, 3.3mm, 3.4mm (most common) — use exactly the right size or you\'ll round them off. Park Tool color-codes theirs.', tool: 'allen' },
        { id: 'small_turns', label: 'Turn spokes 1/4 turn max', instruction: 'Small adjustments only. From above the spoke: clockwise = tighten. Do 2–3 adjacent spokes a quarter turn each, then re-check the wobble.', tool: 'allen' },
        { id: 'respin_check', label: 'Re-spin, re-evaluate', instruction: 'Spin the wheel. Did the wobble move or shrink? Good. Did it get worse? You tightened the wrong side — undo and switch.', tool: 'hand' },
        { id: 'tension_check', label: 'Check final spoke tension', instruction: 'Squeeze pairs of spokes. They should feel similar and sing a similar tone if plucked. One loose spoke = next wobble waiting to happen.', tool: 'hand' }
      ]
    },
    {
      id: 'headset_adjust',
      name: 'Adjust a Loose Headset',
      icon: '🎩',
      difficulty: 'Advanced',
      minutes: 15,
      description: 'Clunking from the front end under braking? The headset (steering bearings) needs preload adjustment. Critical safety fix.',
      steps: [
        { id: 'diagnose', label: 'Diagnose the play', instruction: 'Hold the front brake and rock the bike forward/back. Clunk + fork moving = loose headset. Binding when you turn the bar = overtight.', tool: 'hand' },
        { id: 'loosen_stem', label: 'Loosen stem pinch bolts', instruction: 'With a hex key, loosen (do NOT remove) the 2 pinch bolts clamping the stem to the steerer tube. The stem should rotate freely on the steerer.', tool: 'allen' },
        { id: 'top_cap', label: 'Snug the top-cap bolt', instruction: 'Turn the top-cap bolt clockwise gently. This pulls the stem DOWN on the spacers and preloads the bearings. Quarter-turn at a time.', tool: 'allen' },
        { id: 'recheck_play', label: 'Re-check for play', instruction: 'Front brake + rock test again. No clunk? Good. Still clunks? Quarter-turn more. Over-tight causes rough steering — feel for it.', tool: 'hand' },
        { id: 'align_stem', label: 'Align the stem to the wheel', instruction: 'Sight down the stem to the front wheel. Adjust left/right until perfectly perpendicular to the tire. Stand in front of the bike to sight it.', tool: 'hand' },
        { id: 'torque_pinch', label: 'Torque stem pinch bolts', instruction: 'Tighten each pinch bolt alternately in small increments to 5 Nm (carbon steerer) or 7 Nm (aluminum). Over-torque can crack carbon.', tool: 'allen' },
        { id: 'final_test', label: 'Full steering test', instruction: 'Lift the front end and turn the bar lock-to-lock — should rotate smoothly without catches. Drop the bike front: bar should swing freely to the side from vertical.', tool: 'hand' }
      ]
    }
  ];

  // What each tool is for: shown when a student picks the wrong one, so a miss teaches something.
  var TOOL_PURPOSE = {
    'hand': 'Your hands are for steps with no tool: looking, feeling, shifting, pulling, threading by hand.',
    'tire-lever': 'A tire lever pries the edge of the tire off the rim.',
    'pump': 'A pump puts air in the tube.',
    'sandpaper': 'Sandpaper roughens the rubber so glue can grip it.',
    'glue': 'Glue (rubber cement) bonds a patch to the tube.',
    'patch': 'A patch covers the hole in the tube.',
    'allen': 'A hex (Allen) key turns bolts with a six-sided hole.',
    'phillips': 'A Phillips screwdriver turns cross-head screws, like derailleur limit screws.',
    'ruler': 'A ruler measures, for example chain wear.',
    'degreaser': 'Degreaser dissolves old oil and grime.',
    'brush': 'A brush scrubs dirt out of the chain and gears.',
    'water': 'Water rinses off degreaser and dirt.',
    'rag': 'A rag dries parts and wipes off extra oil.',
    'lube': 'Lube oils the chain so the links move freely.'
  };
  // One "why" question per job, asked after the last step. The first option is the right one; the view rotates the order.
  var JOB_CHECKS = {
    patch_tube: { q: 'Why do you run your fingers inside the tire before the tube goes back in?',
      options: ['To find the thorn or glass that made the hole, so it does not puncture the tube again', 'To warm the rubber so the patch sticks', 'To check how much air is in the tire'],
      why: 'Whatever made the hole is often still stuck in the tire. Leave it there and the tube goes flat again right away.' },
    brake_adjust: { q: 'Where should the brake pads touch when you squeeze the lever?',
      options: ['Flat on the metal rim: not on the tire, and not hanging below the rim', 'On the rubber tire, for more grip', 'Anywhere, as long as they squeeze hard'],
      why: 'A pad rubbing the tire can wear through it. A pad below the rim can slip into the spokes.' },
    chain_clean: { q: 'After you put lube on the chain, what do you do with the extra?',
      options: ['Wipe it off: the oil belongs inside the links, and oil left outside collects grit', 'Leave it on thick so it lasts longer', 'Rinse it off with water'],
      why: 'Oil on the outside of the chain picks up dirt, and gritty oil grinds the chain and gears away.' },
    derailleur_index: { q: 'Why set both limit screws before shifting through all the gears?',
      options: ['They stop the chain going past the last cog: into the spokes, or off the smallest cog', 'They make the chain move faster', 'They tighten the shift cable'],
      why: 'With a limit unset, the first full shift can throw the chain into the spokes and damage the wheel.' },
    pedal_change: { q: 'Which way does the LEFT pedal tighten?',
      options: ['Counter-clockwise: the left pedal has a reverse thread', 'Clockwise, like most bolts', 'Either way works'],
      why: 'The left pedal is reverse-threaded so that pedaling does not slowly unscrew it.' },
    wheel_true: { q: 'The rim wobbles to the RIGHT at one spot. What do you do there?',
      options: ['Tighten the spokes that go to the LEFT side of the hub, a quarter turn at a time', 'Tighten the spokes that go to the right side of the hub', 'Loosen every spoke on the wheel'],
      why: 'Each spoke pulls the rim toward its own side of the hub. Small turns, then spin and check again.' },
    headset_adjust: { q: 'Why loosen the stem pinch bolts BEFORE turning the top-cap bolt?',
      options: ['So the stem can slide down and press on the bearings; clamped tight, the top cap cannot take up the play', 'So the handlebar can be taken off', 'To make the top-cap bolt easier to reach'],
      why: 'The top cap only sets how tightly the bearings are pressed together. The pinch bolts are what hold the stem, so they are tightened last.' }
  };

  var TOOL_ICONS = {
    'hand': '✋', 'tire-lever': '🥄', 'pump': '💨', 'sandpaper': '🟫',
    'glue': '🧴', 'patch': '🩹', 'allen': '🔧', 'phillips': '🪛',
    'ruler': '📏', 'degreaser': '🧪', 'brush': '🖌️', 'water': '💧',
    'rag': '🧻', 'lube': '🛢️'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 4: REGISTER TOOL & TOP-LEVEL RENDER
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('bikeLab', {
    name: 'BikeLab: Physics & Repair',
    icon: '🚲',
    category: 'life-skills',
    description: 'Side-view bike physics sandbox + gearing math lab + hands-on repair simulator. Teaches Newton\'s laws, mechanical advantage, and real maintenance skills.',
    tags: ['physics', 'mechanics', 'life-skills', 'repair', 'energy', 'gearing'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // The hub screen paints no ground, so its title, subtitle, section label
      // and footer sit on the HOST surface - white in light and dark, pure
      // BLACK in the contrast theme, where 'BikeLab' measured 1.44:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;
      var useCallback = React.useCallback;

      var d = (ctx.toolData && ctx.toolData['bikeLab']) || {};
      var upd = function(key, val) { ctx.update && ctx.update('bikeLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[BikeLab]', msg); };
      // Voice narration helper — reads a string aloud via the host's TTS. Silently
      // no-ops when TTS isn't available. Throttled to avoid spam.
      var callTTS = ctx.callTTS || null;
      var _lastTtsRef = useRef(0);
      var speak = function(text) {
        if (!callTTS || !text) return;
        var now = Date.now();
        if (now - _lastTtsRef.current < 800) return;
        _lastTtsRef.current = now;
        try { callTTS(text, null, 1.0, { force: true }).catch(function() {}); }
        catch (_) {}
      };

      // Top-level view selector. 'menu' | 'sandbox' | 'gearing' | 'repair'
      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];
      var lastViewRef = useRef(view);
      useEffect(function() {
        if (lastViewRef.current === view) return undefined;
        var cameFrom = lastViewRef.current; lastViewRef.current = view;
        var timer = setTimeout(function() {
          var el = view === 'menu' ? document.querySelector('[data-bikelab-card="' + cameFrom + '"]') : document.querySelector('[data-bikelab-view-title]');
          if (el && typeof el.focus === 'function') { try { el.focus({ preventScroll: view === 'menu' ? false : true }); } catch (_) { el.focus(); } }
        }, 40);
        return function() { clearTimeout(timer); };
      }, [view]);
      var bikeRoot = function(el) { return h('div', { className: 'bikelab-root h-full', 'data-bikelab-root': view }, el); };
      // ── Stable view identities ──
      // Components defined inside render() get a new function identity every
      // host re-render, so React unmounts/remounts the open view on ANY
      // toolData write — wiping its local useState (see
      // dev-tools/scan_render_scoped_components.cjs). stableType() hands React
      // a per-mount stable wrapper type and swaps the fresh closure in each
      // render, so views reconcile in place instead of remounting.
      // Gate: tests/stem_view_identity_stability.test.js.
      var _stableViewTypesRef = useRef({});
      function stableType(name, impl) {
        var slot = _stableViewTypesRef.current[name];
        if (!slot) {
          slot = _stableViewTypesRef.current[name] = { impl: null, Type: null };
          slot.Type = function StableView(props) { return slot.impl(props); };
        }
        slot.impl = impl;
        return slot.Type;
      }
      // Stabilize stateless chrome/view identities too (declarations hoist,
      // so re-binding them here covers every later use). Without this the
      // shared chrome (back bars, stat cards, sliders) still remounts inside
      // otherwise-stable views on every host re-render, tearing DOM and
      // dropping keyboard focus.
      MainMenu = stableType('MainMenu', MainMenu);
      // Badge ids match module view ids — when a user visits a module, mark it
      // explored. This drives the progress banner on MainMenu and the per-card
      // checkmark indicator. Persisted via ctx.update so progress survives reload.
      var BADGE_IDS = ['sandbox','gearing','repair','ride','fit','braking','safety','parts','helmetFit','winterBike','signalDrill'];
      var goto = function(v) {
        setView(v);
        upd('view', v);
        if (BADGE_IDS.indexOf(v) !== -1) {
          var prev = d.bikeBadges || {};
          if (!prev[v]) {
            var next = Object.assign({}, prev);
            next[v] = true;
            upd('bikeBadges', next);
          }
        }
      };

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var bigCards = [
          {
            id: 'sandbox', title: t('stem.bikelab.physics_sandbox', 'Physics Sandbox'), icon: '🧪',
            subtitle: t('stem.bikelab.side_view_ride_with_visible_force_vect', 'Side-view ride with visible force vectors'),
            desc: t('stem.bikelab.pedal_through_flat_hilly_and_off_road_', 'Pedal through flat, hilly, and off-road terrain. Toggle force arrows for pedal force, gravity, drag, rolling resistance, and normal force. Watch kinetic and potential energy swap as you climb and descend.'),
            bullets: ['Newton\'s 2nd law in real time', 'Vector decomposition on slopes', 'Energy conservation (KE ↔ PE)', 'Drag scales with v²'],
            color: 'from-cyan-700 to-blue-700',
            ring: 'ring-cyan-500/40'
          },
          {
            id: 'gearing', title: t('stem.bikelab.gearing_lab', 'Gearing Lab'), icon: '⚙️',
            subtitle: t('stem.bikelab.gearing_card_subtitle_v2', 'Which gear is fastest, and why'),
            desc: t('stem.bikelab.gearing_card_desc_v2', 'Pick a chainring and a cog and watch the wheel turn. Predict the fastest gear for a steep hill, a flat road and a downhill, then test it. Change the hill and the rider to see when a gear stalls.'),
            bullets: ['Gear ratio = chainring ÷ cog', 'Distance per pedal turn', 'A gear trades push for speed', 'Four pick-the-gear challenges'],
            color: 'from-violet-600 to-purple-700',
            ring: 'ring-violet-500/40'
          },
          {
            id: 'repair', title: t('stem.bikelab.repair_simulator', 'Repair Simulator'), icon: '🔧',
            subtitle: t('stem.bikelab.hands_on_procedural_practice', 'Hands-on procedural practice'),
            desc: t('stem.bikelab.seven_step_by_step_procedures_with_dra', 'Seven step-by-step procedures with drag-and-drop tool placement, step verification, and read-aloud instructions: patch a tube, brakes, chain, derailleur, pedal swap, wheel true, headset adjust. Builds real mechanical literacy.'),
            bullets: ['Patch a flat tube · Adjust rim brakes', 'Clean & lube chain · Index derailleur', 'Swap pedals · True a wobbly wheel', 'Headset adjust · TTS narration'],
            color: 'from-amber-700 to-orange-700',
            ring: 'ring-amber-500/40'
          },
          {
            id: 'ride', title: t('stem.bikelab.neighborhood_ride', 'Neighborhood Ride'), icon: '🏘️',
            subtitle: t('stem.bikelab.applied_physics_commute_demo', 'Applied-physics commute demo'),
            desc: t('stem.bikelab.a_scripted_600_m_commute_to_school_fla', 'A scripted 600 m commute to school: flat block → stop sign → Oak Hill (7% grade) → descent → wet patch → school. Apply Sandbox + Gearing + Braking concepts in one scored run.'),
            bullets: ['Keyboard controls: ↑/↓ gears, Space brakes', 'Three scored events + coach feedback', 'Tracks personal best time', 'Reuses live bike physics engine'],
            color: 'from-green-700 to-emerald-700',
            ring: 'ring-green-500/40'
          }
        ];
        var miniCards = [
          {
            id: 'fit', title: t('stem.bikelab.bike_fit_calculator', 'Bike Fit Calculator'), icon: '📏',
            subtitle: t('stem.bikelab.fit_card_subtitle_v2', 'Bike size, saddle height, reach'),
            desc: t('stem.bikelab.fit_card_desc_v2', 'Enter a rider\'s height and inside leg. See the bike size that suits them, then move the saddle up and down and watch what happens to the knee.'),
            color: 'from-emerald-700 to-teal-700',
            ring: 'ring-emerald-500/40'
          },
          {
            id: 'braking', title: t('stem.bikelab.braking_physics', 'Braking Physics'), icon: '🛑',
            subtitle: t('stem.bikelab.stopping_distance_weight_transfer', 'Stopping distance & weight transfer'),
            desc: t('stem.bikelab.dry_wet_gravel_ice_surfaces_front_both', 'Dry/wet/gravel/ice surfaces × front/both/rear brake choice. Solves d = v²/(2a) with endo-limit gating.'),
            color: 'from-rose-700 to-red-700',
            ring: 'ring-rose-500/40'
          },
          {
            id: 'safety', title: t('stem.bikelab.hand_signals_safety', 'Hand Signals & Safety'), icon: '🛡️',
            subtitle: t('stem.bikelab.road_safety_quiz_count_v3', '13-question road safety quiz'),
            desc: t('stem.bikelab.safety_card_desc_v2', 'Hand signals, where to ride, stop signs, parked cars, driveways and lights. Each answer is explained, and you can review the ones you missed.'),
            color: 'from-sky-700 to-indigo-700',
            ring: 'ring-sky-500/40'
          },
          {
            id: 'parts', title: t('stem.bikelab.bike_parts_inspector', 'Bike Parts Inspector'), icon: '🔍',
            subtitle: t('stem.bikelab.parts_count_v2', '20 parts on a clickable bike'),
            desc: t('stem.bikelab.parts_card_desc_v2', 'Click any part on a diagram or a 3D model you can turn and pull apart. Each part shows what it does, what goes wrong with it, and a link to the repair job.'),
            color: 'from-slate-600 to-slate-800',
            ring: 'ring-slate-500/40'
          },
          {
            id: 'helmetFit', title: t('stem.bikelab.helmet_fit_checker', 'Helmet Fit Checker'), icon: '⛑️',
            subtitle: t('stem.bikelab.helmet_card_subtitle_v2', 'Fit it, then spot the problem'),
            desc: t('stem.bikelab.helmet_fit_card_desc_v2', 'Fit a helmet on a rider: position, side straps, chin strap and size. Then check six riders and say what is wrong with each helmet.'),
            color: 'from-pink-700 to-rose-700',
            ring: 'ring-pink-500/40'
          },
          {
            id: 'winterBike', title: t('stem.bikelab.maine_winter_biking', 'Maine Winter Biking'), icon: '❄️',
            subtitle: t('stem.bikelab.winter_card_subtitle_v2', 'Dark, ice, cold: ride or wait?'),
            desc: t('stem.bikelab.winter_card_desc_v2', 'Decide whether to ride in six winter situations. See how much farther it takes to stop on ice, how early it gets dark in Maine, and what to wear.'),
            color: 'from-sky-700 to-blue-800',
            ring: 'ring-sky-500/40'
          },
          {
            id: 'signalDrill', title: t('stem.bikelab.signal_reaction_drill', 'Signal Reaction Drill'), icon: '✋',
            subtitle: t('stem.bikelab.match_the_signal_under_time_pressure', 'Match the signal under time pressure'),
            desc: t('stem.bikelab.a_traffic_situation_flashes_you_press_', 'A traffic-situation flashes; you press the matching hand signal as fast as possible. Tracks reaction time across 10 rounds, with a personal-best leaderboard.'),
            color: 'from-yellow-700 to-amber-700',
            ring: 'ring-yellow-500/40'
          }
        ];

        var badges = d.bikeBadges || {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;
        var solvedIn = function(o) { return (o && typeof o === 'object') ? Object.keys(o).filter(function(k) { return o[k]; }).length : 0; };
        var mastered = {
          repair: solvedIn(d.repairCompleted) >= 1,
          braking: solvedIn(d.brakingChallenges) >= BRAKE_CHALLENGES.length,
          gearing: solvedIn(d.gearChallenges) >= GEAR_CHALLENGES.length,
          ride: typeof d.rideBestTime === 'number' && d.rideBestTime > 0,
          signalDrill: typeof d.signalDrillBestMs === 'number' && d.signalDrillBestMs > 0,
          safety: (+d.safetyBest || 0) >= 10,
          helmetFit: !!d.helmetFitDone && (+d.helmetSpotBest || 0) >= 5,
          winterBike: (+d.winterBest || 0) >= 5
        };
        var MASTERY_GOAL = {
          repair: 'Finish a repair job without skipping a step', gearing: 'Pick the fastest gear in all ' + GEAR_CHALLENGES.length + ' gear challenges', braking: 'Predict all ' + BRAKE_CHALLENGES.length + ' braking challenges correctly',
          ride: 'Finish a clean ride: full stop, steady climb, gentle in the wet', signalDrill: 'Get 8 of 10 right in a timed drill',
          safety: 'Score 10 of 13 on the quiz', helmetFit: 'Fit the helmet, then spot the problem on 5 of 6 riders', winterBike: 'Make the safe choice in 5 of 6 winter situations'
        };
        var masteryTotal = Object.keys(MASTERY_GOAL).length;
        var masteredCount = Object.keys(MASTERY_GOAL).filter(function(k) { return mastered[k]; }).length;

        // A suggested order for a class: safety first, then the rules, then the science, then putting it together.
        var CLASS_PATH = [
          { name: 'Lesson 1 · Get ready to ride', ids: ['helmetFit', 'parts', 'fit'],
            teach: 'Students fit a helmet, learn the names of the parts of a bike, and check that a bike is the right size for its rider.',
            ask: 'Why does a helmet that is tipped back protect you less?' },
          { name: 'Lesson 2 · Rules of the road', ids: ['safety', 'signalDrill', 'winterBike'],
            teach: 'Students learn the hand signals and road rules, practice signals at speed, and decide when it is safe to ride in winter.',
            ask: 'A road looks wet and it is 30°F. What might it really be, and what should you do?' },
          { name: 'Lesson 3 · The science of riding', ids: ['gearing', 'braking', 'sandbox'],
            teach: 'Students predict, then test: which gear is fastest on a hill, and how speed and road surface change the distance it takes to stop.',
            ask: 'If you double your speed, what happens to your braking distance? Why?' },
          { name: 'Lesson 4 · Put it together', ids: ['ride', 'repair'],
            teach: 'Students use gears and brakes on a ride to school, then work through a repair job one step at a time.',
            ask: 'Where on the ride did you change gear, and why there?' }
        ];
        var SCIENCE_LINKS = [
          ['3-PS2-1', 'Balanced and unbalanced forces change how an object moves', 'Physics Sandbox'],
          ['4-PS3-1', 'The faster an object moves, the more energy it has', 'Braking Physics, Physics Sandbox'],
          ['MS-PS2-2', 'A change in motion depends on the total force and on the mass', 'Physics Sandbox, Gearing Lab'],
          ['MS-PS3-1', 'Kinetic energy depends on mass and on speed', 'Braking Physics'],
          ['MS-PS3-5', 'When kinetic energy changes, energy has been transferred', 'Braking Physics, Physics Sandbox']
        ];
        var cardById = {};
        bigCards.concat(miniCards).forEach(function(c) { cardById[c.id] = c; });
        var renderCard = function(c, isBig) {
          var visited = !!badges[c.id];
          return h('button', {
            key: c.id, 'data-bikelab-card': c.id,
            onClick: function() { goto(c.id); },
            'aria-label': c.title + (mastered[c.id] ? ' (mastered)' : visited ? ' (explored)' : ''),
            className: 'relative text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 ' + (visited ? 'border-emerald-600' : 'border-slate-200') + ' hover:border-slate-400 overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-emerald-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md'
            }, '✓'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-black/25 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Mini')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              MASTERY_GOAL[c.id] && h('p', { 'data-bikelab-mastery': mastered[c.id] ? 'yes' : 'no', className: 'text-xs font-bold mt-2 mb-2 ' + (mastered[c.id] ? 'text-amber-800' : 'text-slate-600') }, mastered[c.id] ? '★ Mastered' : 'To master: ' + MASTERY_GOAL[c.id] + '.'),
              isBig && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-600 flex items-start gap-1.5' },
                    h('span', { className: 'text-emerald-500 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'text-center mb-6' },
            h('div', { className: 'text-6xl mb-3' }, '🚲'),
            h('h1', { className: 'text-4xl font-black text-slate-800 mb-2' + onHostInk }, 'BikeLab'),
            h('p', { className: 'text-lg text-slate-600 max-w-2xl mx-auto' + onHostInk },
              t('stem.bikelab.physics_mechanics_and_maintenance_lear', 'Physics, mechanics, and maintenance — learn the science of cycling and the real-world skills to keep a bike rolling.'))
          ),
          // Progress banner — encourages exploration of all 8 modules.
          h('div', {
            'aria-live': 'polite',
            className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200') + ' flex flex-wrap items-center justify-between gap-4'
          },
            h('div', { className: 'flex min-w-0 flex-1 items-center gap-3' },
              h('span', { className: 'text-3xl' }, allDone ? '🏆' : '🎯'),
              h('div', null,
                h('div', { className: 'font-bold text-slate-800' },
                  (allDone ? 'All ' + totalCount + ' modules explored' : (visitedCount + ' of ' + totalCount + ' modules explored')) + ' · ' + masteredCount + ' of ' + masteryTotal + ' mastered'
                ),
                h('div', { className: 'text-xs text-slate-600' },
                  masteredCount === masteryTotal ? 'Every challenge mastered. Nice riding.' : 'A ★ means you met that module\'s goal. Each card says how to earn it.')
              )
            ),
            // Progress bar
            h('div', { className: 'flex-shrink-0 w-32 h-3 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
              h('div', {
                className: 'h-full ' + (allDone ? 'bg-emerald-500' : 'bg-cyan-500') + ' transition-all',
                style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
              })
            )
          ),
          h('section', { 'data-bikelab-path': 'true', 'aria-labelledby': 'bikelab-path-title', className: 'mb-6 p-4 rounded-2xl border-2 border-slate-200 bg-white' },
            h('h2', { id: 'bikelab-path-title', className: 'text-sm font-black uppercase tracking-wider text-slate-800' }, '🧭 Not sure where to start? Try this order'),
            h('ol', { className: 'mt-3 space-y-3' },
              CLASS_PATH.map(function(step) {
                return h('li', { key: step.name, className: 'flex flex-wrap items-center gap-2' },
                  h('span', { className: 'w-full md:w-56 text-sm font-bold text-slate-800' }, step.name),
                  step.ids.map(function(id) {
                    var c = cardById[id]; if (!c) return null;
                    var done = mastered[id], seen = !!badges[id];
                    return h('button', { key: id, type: 'button', 'data-bikelab-path-step': id,
                      onClick: function() { goto(id); },
                      'aria-label': c.title + (done ? ' (mastered)' : seen ? ' (explored)' : ''),
                      className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (done ? 'border-amber-500 bg-amber-50 text-amber-900' : seen ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500')
                    }, h('span', { 'aria-hidden': 'true' }, c.icon + ' '), c.title, done ? ' ★' : seen ? ' ✓' : '');
                  }));
              })),
            h('details', { 'data-bikelab-teacher-notes': 'true', className: 'mt-4 border-t border-slate-200 pt-3' },
              h('summary', { className: 'cursor-pointer text-sm font-bold text-indigo-800 py-2' }, 'For teachers: what each lesson covers'),
              h('div', { className: 'mt-2 space-y-3 text-sm text-slate-700 leading-relaxed' },
                h('p', null, 'Each lesson fits about one class period. Students can also explore in any order. A ★ on a card means the student met that activity\'s goal, and each card says what the goal is.'),
                CLASS_PATH.map(function(step) {
                  return h('div', { key: step.name },
                    h('div', { className: 'font-bold text-slate-800' }, step.name),
                    h('p', null, step.teach),
                    h('p', null, h('strong', null, 'Ask the class: '), step.ask));
                }),
                h('div', null,
                  h('div', { className: 'font-bold text-slate-800' }, 'Science connections (NGSS)'),
                  h('ul', { className: 'list-disc pl-5 space-y-1 mt-1' },
                    SCIENCE_LINKS.map(function(l) { return h('li', { key: l[0] }, h('strong', null, l[0] + ': '), l[1] + '. ', h('span', { className: 'text-slate-600' }, '(' + l[2] + ')')); }))),
                h('p', null, h('strong', null, 'Good to know: '), 'the rider and bike are simplified models, so the speeds and distances are close to real life but not exact. The road rules are for Maine. The 3D bike is optional, and every activity works without it.')
              )
            )
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' + onHostInk }, t('stem.bikelab.core_modules', 'Core Modules')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-600 mb-2 px-1' + onHostInk }, t('stem.bikelab.quick_labs', 'Quick Labs')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-600' + onHostInk },
            t('stem.bikelab.menu_footer_v2', 'STEAM Lab tool · Works with a keyboard · The 3D bike is optional')
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // BACK-TO-MENU BAR (shared across sub-views)
      // ─────────────────────────────────────────────────────
      function BackBar(props) {
        return h('div', { className: 'flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm' },
          h('button', {
            onClick: function() { goto('menu'); },
            className: 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors'
          }, h('span', null, '←'), t('stem.bikelab.bikelab_menu', ' BikeLab Menu')),
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-2xl' }, props.icon),
            h('h1', { className: 'font-black text-slate-800 text-lg', tabIndex: -1, 'data-bikelab-view-title': 'true' }, props.title)
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: PHYSICS SANDBOX
      // ─────────────────────────────────────────────────────
      function PhysicsSandbox() {
        var bikeState = useState(d.sandboxBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var terrainState = useState(d.sandboxTerrainId || 'rollinghills');
        var terrainId = terrainState[0], setTerrainId = terrainState[1];
        var vecState = useState(d.sandboxShowVectors !== false);
        var showVectors = vecState[0], setShowVectors = vecState[1];
        var graphState = useState(d.sandboxShowEnergyGraph !== false);
        var showGraph = graphState[0], setShowGraph = graphState[1];
        var runningState = useState(false);
        var running = runningState[0], setRunning = runningState[1];
        var powerState = useState(150);
        var power = powerState[0], setPower = powerState[1];
        var gearState = useState(0.7); // 0.2 = the bike's easiest gear, 1.0 = its hardest
        var gear = gearState[0], setGear = gearState[1];
        var hudAtRef = useRef(0);
        var budgetRef = useRef({ pedal: 0, rolling: 0, air: 0, hill: 0, speedUp: 0, cadence: 0, ratio: 1, slopePct: 0, stalled: false });
        // Wind: positive = headwind (m/s felt by rider above ground speed),
        // negative = tailwind. Drag scales with |v + wind|² so students can
        // see why a 10 mph headwind erases more power than a 10% grade.
        var windState = useState(0);
        var wind = windState[0], setWind = windState[1];
        // Rider mass: lets students see how a heavier vs lighter rider changes
        // climb speed (gravity load = m·g·sinθ) and acceleration (a = F/m).
        // Default 70 kg matches the implicit rider weight baked into each
        // bike's `mass` field, so the slider at 70 reproduces existing physics.
        // System mass is computed inline as (bike.mass - 70) + riderMass.
        var riderMassState = useState(70);
        var riderMass = riderMassState[0], setRiderMass = riderMassState[1];
        // Coast-down: when true, pedal force is forced to zero so students can
        // watch pure drag + rolling + gravity decelerate the bike \u2014 the
        // classic physics-lab demo where you let a cart roll and time its
        // stopping distance.
        var coastState = useState(false);
        var coasting = coastState[0], setCoasting = coastState[1];

        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];
        var terrain = TERRAINS.find(function(t) { return t.id === terrainId; }) || TERRAINS[1];

        // Simulation state — refs so the animation loop doesn't trigger re-renders.
        var posRef = useRef(0);    // x position in meters
        var velRef = useRef(0);    // m/s
        var timeRef = useRef(0);   // seconds elapsed
        var rafRef = useRef(null);
        var lastTsRef = useRef(0);
        var hudTickState = useState(0);
        var hudTick = hudTickState[0], setHudTick = hudTickState[1]; // force HUD re-render ~10Hz
        var energyHistoryRef = useRef([]); // [{t, ke, pe, total}]
        var canvasRef = useRef(null);
        // Particle system for surface-specific spray/dust behind rear wheel.
        // Each particle: {x, y, vx, vy, life, maxLife, size, color}. World-space.
        var particlesRef = useRef([]);
        // Milestone teaching callouts: a set of string keys already triggered
        // this session so each concept fires a toast at most once per ride.
        // Cleared on reset. Teaches the physics in context as students discover
        // it rather than front-loading a wall of instruction.
        var milestonesRef = useRef({});

        var reset = function() {
          posRef.current = 0; velRef.current = 0; timeRef.current = 0;
          energyHistoryRef.current = []; budgetRef.current = { pedal: 0, rolling: 0, air: 0, hill: 0, speedUp: 0, cadence: 0, ratio: gearRatioFor(bike, gear), slopePct: 0, stalled: false };
          particlesRef.current = [];
          setCoasting(false);
          milestonesRef.current = {};
          setHudTick(function(x) { return x + 1; });
        };

        useEffect(function() { reset(); }, [bikeId, terrainId]);

        // Physics tick. Called every animation frame while running.
        var step = useCallback(function(dt) {
          // System mass = bike frame (= bike.mass minus the implicit 70 kg
          // default rider) plus the user-chosen rider mass. Slider at 70
          // reproduces the original calibration.
          var m = (bike.mass - 70) + riderMass;
          var v = velRef.current;
          var x = posRef.current;
          // Terrain gives slope via finite-diff over 0.5 m.
          var y0 = terrain.profile(x).y;
          var y1 = terrain.profile(x + 0.5).y;
          var slope = (y1 - y0) / 0.5;
          var angle = Math.atan(slope);
          var surf = terrain.profile(x).kind;
          var crrMult = SURFACE_CRR_MULT[surf] || 1;
          var normalN = m * G * Math.cos(angle);
          var gravParallel = m * G * Math.sin(angle); // opposes motion when climbing
          var rollingF = bike.crr * crrMult * normalN;
          // Drag scales with relative air velocity (headwind adds, tailwind
          // subtracts). Keep the quadratic sign so a strong tailwind can push.
          var vRel = v + wind;
          var dragF = 0.5 * RHO_AIR * bike.cdA * vRel * Math.abs(vRel); // v_rel²
          // Pedal force: full power only near a comfortable cadence, and never more than the legs can push in this gear.
          var ratio = gearRatioFor(bike, gear);
          var pedalF = coasting ? 0 : pedalDriveForce(bike, ratio, v, power, riderMass);
          var netF = pedalF - rollingF - dragF - gravParallel;
          var a = netF / m;
          // Where the power is going right now (W), for the "Where does my power go?" panel.
          budgetRef.current = { pedal: pedalF * v, rolling: rollingF * v, air: dragF * v, hill: gravParallel * v, speedUp: m * a * v,
            cadence: cadenceRpmFor(v, bike.wheelR, ratio), ratio: ratio, slopePct: slope * 100,
            stalled: !coasting && v < 0.3 && netF <= 0 };
          var newV = v + a * dt;
          if (newV < 0) newV = 0;
          var newX = x + newV * dt;
          velRef.current = newV;
          posRef.current = newX;
          timeRef.current += dt;
          // Energy tracking (PE relative to start elevation y=0).
          var ke = 0.5 * m * newV * newV;
          var pe = m * G * terrain.profile(newX).y;
          var hist = energyHistoryRef.current;
          hist.push({ t: timeRef.current, ke: ke, pe: pe, total: ke + pe });
          if (hist.length > 600) hist.shift();
        }, [bike, terrain, power, gear, wind, coasting, riderMass]);

        // Check milestone teaching callouts. Fires each concept at most once
        // per reset. Keeps toasts as one-shot "gotcha!" moments rather than
        // repeating mid-ride.
        var checkMilestones = function() {
          var ms = milestonesRef.current;
          var v = velRef.current;
          var x = posRef.current;
          var p = terrain.profile(x);
          var pAhead = terrain.profile(x + 1);
          var slopeLocal = pAhead.y - p.y;
          var fire = function(key, msg) {
            if (ms[key]) return;
            ms[key] = true;
            if (addToast) addToast(msg, 'info');
          };
          if (v * 2.23694 >= 10) fire('mph10', '\uD83D\uDCA8 10 mph \u2014 air drag is catching up to rolling resistance. From here, drag grows with v\u00B2.');
          if (v * 2.23694 >= 20) fire('mph20', '\uD83D\uDCA8 20 mph \u2014 drag just quadrupled vs. 10 mph. That\u2019s why pros tuck and wear skin-tight kit.');
          if (x >= 100) fire('dist100', '\uD83D\uDCCF 100 m rolled. Work done \u2248 pedal power \u00D7 time, minus everything drag + rolling dissipated as heat.');
          if (slopeLocal > 0.05) fire('climb', '\u26F0\uFE0F Climbing! Gravity now works against motion: F_grav = m\u00B7g\u00B7sin\u03B8. Every meter of rise = m\u00B7g\u00B7h stored as PE.');
          if (slopeLocal < -0.05) fire('descend', '\uD83D\uDD3D Descending. PE \u2192 KE: your altitude is converting straight into speed even with no pedaling.');
          if (p.kind === 'sand') fire('surfSand', '\uD83C\uDFDC\uFE0F Sand \u2014 rolling resistance ~3\u00D7 pavement. Speed bleeds fast even on flat ground.');
          if (p.kind === 'wet') fire('surfWet', '\uD83D\uDCA7 Wet pavement \u2014 rolling up ~20%. Grip drops more than that, so corner gently.');
          if (p.kind === 'dirt') fire('surfDirt', '\uD83C\uDFDE\uFE0F Dirt \u2014 rolling resistance ~1.8\u00D7 pavement. Knobby tires cost you on smooth roads too.');
          if (coasting && v < 0.5 && x > 5) fire('stopped', '\uD83D\uDED1 Stopped coasting. All the KE you had went to drag + rolling + uphill work \u2014 none vanished, just moved form.');
        };

        // Animation loop
        useEffect(function() {
          if (!running) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
          }
          var loop = function(ts) {
            if (!canvasRef.current || !canvasRef.current.isConnected) { rafRef.current = null; return; } // stop if the canvas detached
            if (!lastTsRef.current) lastTsRef.current = ts;
            var dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
            lastTsRef.current = ts;
            // Substep for stability at high power
            var sub = 4;
            for (var i = 0; i < sub; i++) step(dt / sub);
            checkMilestones();
            draw();
            if (ts - hudAtRef.current > 100) { hudAtRef.current = ts; setHudTick(function(x) { return (x + 1) % 1000; }); }
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
        }, [running, step]); // eslint-disable-line

        // Draw the scene.
        var draw = function() {
          var cvs = canvasRef.current;
          if (!cvs) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(cvs, cvs._logicalW || cvs.width, cvs._logicalH || cvs.height);
          }
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = cvs._logicalW || cvs.width, H = cvs._logicalH || cvs.height;
          ctx2d.fillStyle = '#0f172a';
          ctx2d.fillRect(0, 0, W, H);
          // Sky gradient
          var sky = ctx2d.createLinearGradient(0, 0, 0, H * 0.75);
          sky.addColorStop(0, '#0ea5e9'); sky.addColorStop(1, '#bae6fd');
          ctx2d.fillStyle = sky;
          ctx2d.fillRect(0, 0, W, H * 0.75);
          // Warm sun with a soft glow, high on the right (atmosphere; clouds drift over it)
          var sunX = W * 0.84, sunY = H * 0.16;
          var sunGlow = ctx2d.createRadialGradient(sunX, sunY, 2, sunX, sunY, 70);
          sunGlow.addColorStop(0, 'rgba(254,240,138,0.95)');
          sunGlow.addColorStop(0.25, 'rgba(253,224,71,0.45)');
          sunGlow.addColorStop(1, 'rgba(253,224,71,0)');
          ctx2d.fillStyle = sunGlow;
          ctx2d.fillRect(sunX - 70, sunY - 70, 140, 140);
          ctx2d.fillStyle = 'rgba(255,251,235,0.95)';
          ctx2d.beginPath(); ctx2d.arc(sunX, sunY, 14, 0, 2 * Math.PI); ctx2d.fill();

          // World → screen mapping. Camera follows bike, vertical origin at mid-height.
          var camX = posRef.current;
          var pxPerMeter = 10;
          var centerY = H * 0.7;
          var worldToScreenX = function(wx) { return W * 0.3 + (wx - camX) * pxPerMeter; };
          var worldToScreenY = function(wy) { return centerY - wy * pxPerMeter; };

          // ── Parallax backdrop: clouds + two distant hill layers ──
          // Clouds drift 5% of bike speed, far hills 20%, near hills 50% — gives
          // the scene depth and reinforces that the rider is the one moving.
          var cloudOffset = camX * 0.05;
          ctx2d.fillStyle = 'rgba(255,255,255,0.85)';
          for (var ci = 0; ci < 8; ci++) {
            var cBaseX = (ci * 220 - (cloudOffset * pxPerMeter) % (W + 200)) % (W + 200);
            if (cBaseX < -200) cBaseX += W + 200;
            var cY = 40 + (ci % 3) * 22;
            var cSz = 18 + (ci % 4) * 4;
            ctx2d.beginPath();
            ctx2d.arc(cBaseX, cY, cSz, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 0.8, cY - 3, cSz * 0.8, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 1.6, cY, cSz * 0.7, 0, 2 * Math.PI);
            ctx2d.arc(cBaseX + cSz * 0.4, cY + 2, cSz * 0.9, 0, 2 * Math.PI);
            ctx2d.fill();
          }
          // Far hills (blue-gray silhouette, slow parallax)
          var farOff = camX * 0.20;
          ctx2d.fillStyle = 'rgba(71,85,105,0.55)';
          ctx2d.beginPath();
          ctx2d.moveTo(0, H * 0.62);
          for (var fhX = 0; fhX <= W + 20; fhX += 20) {
            var fhWorld = fhX + farOff * pxPerMeter;
            var fhY = H * 0.58 + Math.sin(fhWorld * 0.015) * 18 + Math.sin(fhWorld * 0.004) * 30;
            ctx2d.lineTo(fhX, fhY);
          }
          ctx2d.lineTo(W, H * 0.75); ctx2d.lineTo(0, H * 0.75);
          ctx2d.closePath(); ctx2d.fill();
          // Near hills (darker, faster parallax)
          var nearOff = camX * 0.50;
          ctx2d.fillStyle = 'rgba(51,65,85,0.78)';
          ctx2d.beginPath();
          ctx2d.moveTo(0, H * 0.68);
          for (var nhX = 0; nhX <= W + 20; nhX += 16) {
            var nhWorld = nhX + nearOff * pxPerMeter;
            var nhY = H * 0.64 + Math.sin(nhWorld * 0.025) * 12 + Math.sin(nhWorld * 0.007) * 22;
            ctx2d.lineTo(nhX, nhY);
          }
          ctx2d.lineTo(W, H * 0.75); ctx2d.lineTo(0, H * 0.75);
          ctx2d.closePath(); ctx2d.fill();

          // Draw terrain — sample every 1 meter from camX-50 to camX+50
          ctx2d.beginPath();
          ctx2d.moveTo(0, H);
          for (var wx = camX - 50; wx <= camX + 80; wx += 1) {
            var p = terrain.profile(wx);
            ctx2d.lineTo(worldToScreenX(wx), worldToScreenY(p.y));
          }
          ctx2d.lineTo(W, H);
          ctx2d.closePath();
          // Ground fill — color by surface at camera position
          var cSurf = terrain.profile(camX).kind;
          var fill = cSurf === 'dirt' ? '#78350f' : cSurf === 'wet' ? '#475569' : cSurf === 'sand' ? '#fcd34d' : '#334155';
          ctx2d.fillStyle = fill;
          ctx2d.fill();
          // Surface line highlight
          ctx2d.beginPath();
          for (var wx2 = camX - 50; wx2 <= camX + 80; wx2 += 1) {
            var p2 = terrain.profile(wx2);
            if (wx2 === camX - 50) ctx2d.moveTo(worldToScreenX(wx2), worldToScreenY(p2.y));
            else ctx2d.lineTo(worldToScreenX(wx2), worldToScreenY(p2.y));
          }
          ctx2d.strokeStyle = cSurf === 'pavement' ? '#fbbf24' : '#f59e0b';
          ctx2d.lineWidth = 2;
          ctx2d.stroke();

          // Distance markers every 10 m
          ctx2d.font = 'bold 10px monospace';
          ctx2d.fillStyle = 'rgba(255,255,255,0.5)';
          for (var mx = Math.floor((camX - 50) / 10) * 10; mx <= camX + 80; mx += 10) {
            if (mx < 0) continue;
            var p3 = terrain.profile(mx);
            var sx = worldToScreenX(mx);
            var sy = worldToScreenY(p3.y);
            ctx2d.fillRect(sx - 1, sy - 10, 2, 10);
            ctx2d.fillText(mx + 'm', sx - 10, sy - 14);
          }

          // ── Roadside scenery (trees, signs, cones) ──
          // Each object is anchored at a deterministic world x (every 15m) so
          // its identity and position are stable as the camera scrolls. Sits
          // on the terrain surface (follows the profile curve). Drawn before
          // the bike so the bike occludes when passing.
          for (var scX = Math.floor((camX - 60) / 15) * 15; scX <= camX + 100; scX += 15) {
            if (scX < 5) continue;
            var scHash = (Math.floor(scX / 15) * 2654435761) >>> 0; // unsigned hash
            var scKind = scHash % 6; // 0-2 tree, 3 sign, 4 bench, 5 cone
            var scP = terrain.profile(scX);
            var scSide = (scHash & 2) ? 1 : -1; // left or right of path
            var scBaseX = worldToScreenX(scX);
            var scBaseY = worldToScreenY(scP.y);
            if (scBaseX < -30 || scBaseX > W + 30) continue;
            if (scKind <= 2) {
              // Tree: trunk + leafy top. Size varies with hash.
              var trH = 18 + (scHash % 12);
              var trW = 3 + (scHash % 2);
              ctx2d.fillStyle = '#78350f';
              ctx2d.fillRect(scBaseX - trW / 2, scBaseY - trH, trW, trH);
              ctx2d.fillStyle = scP.kind === 'sand' ? '#65a30d' : (scHash & 4 ? '#166534' : '#15803d');
              ctx2d.beginPath();
              ctx2d.arc(scBaseX, scBaseY - trH - 2, 10 + (scHash % 5), 0, 2 * Math.PI);
              ctx2d.fill();
              // Small highlight dot on canopy for sun
              ctx2d.fillStyle = 'rgba(255,255,255,0.18)';
              ctx2d.beginPath();
              ctx2d.arc(scBaseX - 4, scBaseY - trH - 5, 3, 0, 2 * Math.PI);
              ctx2d.fill();
            } else if (scKind === 3) {
              // Wooden signpost with a distance badge
              ctx2d.fillStyle = '#57534e';
              ctx2d.fillRect(scBaseX - 1, scBaseY - 22, 2, 22);
              ctx2d.fillStyle = '#fde68a';
              ctx2d.fillRect(scBaseX - 11, scBaseY - 26, 22, 10);
              ctx2d.strokeStyle = '#78350f'; ctx2d.lineWidth = 1;
              ctx2d.strokeRect(scBaseX - 11, scBaseY - 26, 22, 10);
              ctx2d.fillStyle = '#78350f';
              ctx2d.font = 'bold 7px monospace';
              // Save/restore around textAlign change so an exception inside the fillText
              // (or any future code added between save/restore) doesn't leave 'center'
              // active and shift subsequent HUD/label text off-screen.
              ctx2d.save();
              ctx2d.textAlign = 'center';
              ctx2d.fillText(Math.round(scX) + 'm', scBaseX, scBaseY - 19);
              ctx2d.restore();
            } else if (scKind === 4) {
              // Park bench
              ctx2d.fillStyle = '#57534e';
              ctx2d.fillRect(scBaseX - 9, scBaseY - 5, 18, 2);
              ctx2d.fillRect(scBaseX - 9, scBaseY - 10, 18, 2);
              ctx2d.fillRect(scBaseX - 8, scBaseY - 5, 1, 5);
              ctx2d.fillRect(scBaseX + 7, scBaseY - 5, 1, 5);
              ctx2d.fillRect(scBaseX - 9, scBaseY - 11, 1, 6);
              ctx2d.fillRect(scBaseX + 8, scBaseY - 11, 1, 6);
            } else {
              // Traffic cone
              ctx2d.fillStyle = '#f97316';
              ctx2d.beginPath();
              ctx2d.moveTo(scBaseX, scBaseY - 12);
              ctx2d.lineTo(scBaseX + 4, scBaseY);
              ctx2d.lineTo(scBaseX - 4, scBaseY);
              ctx2d.closePath();
              ctx2d.fill();
              ctx2d.fillStyle = '#fff';
              ctx2d.fillRect(scBaseX - 3, scBaseY - 8, 6, 1.5);
            }
            // Each scenery piece ignores scSide currently (sits on path); could
            // be parameterized later if lateral positioning is added.
            void scSide;
          }

          // Bike at world position camX (on the ground)
          var gp = terrain.profile(camX);
          var bx = worldToScreenX(camX);
          var by = worldToScreenY(gp.y);
          var bxAhead = worldToScreenX(camX + 0.5);
          var byAhead = worldToScreenY(terrain.profile(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);

          // Shadow under bike — soft oval grounded to terrain directly below
          var shadowGrad = ctx2d.createRadialGradient(bx, by + 1, 2, bx, by + 1, 26);
          shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
          shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx2d.fillStyle = shadowGrad;
          ctx2d.beginPath(); ctx2d.ellipse(bx, by + 1, 24, 4, 0, 0, 2 * Math.PI); ctx2d.fill();

          // Wheel angular position: phi = distance / wheelR. Drives the spoke
          // angles so students see the wheel rotating at the correct rate —
          // ties the visual back to v = ω·r.
          var wheelPhi = camX / bike.wheelR;
          // Pedal cadence (rad/s) from linear speed and gear ratio. Simplified
          // effective cadence for the animation (cap so it stays readable).
          var cadenceRate = Math.min(16, cadenceRpmFor(velRef.current, bike.wheelR, gearRatioFor(bike, gear)) * 2 * Math.PI / 60);
          // Freeze the pedal crank rotation for users who prefer reduced motion —
          // it's purely cosmetic; bike position + speed still convey pedaling progress.
          var pedalPhi = _prefersReducedMotion ? 0 : timeRef.current * cadenceRate;

          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          // Spoked wheels (rear at -18, front at 18)
          [ { cx: -18, phiOffset: 0 }, { cx: 18, phiOffset: 0.4 } ].forEach(function(wh) {
            // Tire
            ctx2d.strokeStyle = '#111827';
            ctx2d.lineWidth = 3.5;
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 7.5, 0, 2 * Math.PI); ctx2d.stroke();
            // Rim
            ctx2d.strokeStyle = '#cbd5e1';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 6.2, 0, 2 * Math.PI); ctx2d.stroke();
            // Spokes (6, rotating with wheelPhi)
            ctx2d.strokeStyle = 'rgba(203,213,225,0.85)';
            ctx2d.lineWidth = 0.7;
            for (var sp = 0; sp < 6; sp++) {
              var ang = wheelPhi + wh.phiOffset + (sp * Math.PI) / 3;
              ctx2d.beginPath();
              ctx2d.moveTo(wh.cx, -7);
              ctx2d.lineTo(wh.cx + Math.cos(ang) * 6.2, -7 + Math.sin(ang) * 6.2);
              ctx2d.stroke();
            }
            // Hub
            ctx2d.fillStyle = '#475569';
            ctx2d.beginPath(); ctx2d.arc(wh.cx, -7, 1.3, 0, 2 * Math.PI); ctx2d.fill();
          });
          // Frame (triangles)
          ctx2d.strokeStyle = '#f43f5e';
          ctx2d.lineWidth = 3;
          ctx2d.beginPath();
          ctx2d.moveTo(-18, -7); ctx2d.lineTo(0, -22); ctx2d.lineTo(18, -7);
          ctx2d.lineTo(0, -14); ctx2d.lineTo(-10, -22); ctx2d.lineTo(0, -22);
          ctx2d.stroke();
          // Crankset at bottom bracket (0, -14) + rotating pedal crank
          var crankR = 4;
          var pedalX = 0 + Math.cos(pedalPhi) * crankR;
          var pedalY = -14 + Math.sin(pedalPhi) * crankR;
          var pedalX2 = 0 - Math.cos(pedalPhi) * crankR;
          var pedalY2 = -14 - Math.sin(pedalPhi) * crankR;
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.beginPath(); ctx2d.arc(0, -14, 2.2, 0, 2 * Math.PI); ctx2d.fill();
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 1.5;
          ctx2d.beginPath();
          ctx2d.moveTo(pedalX, pedalY); ctx2d.lineTo(0, -14); ctx2d.lineTo(pedalX2, pedalY2);
          ctx2d.stroke();
          // Rider
          ctx2d.beginPath(); ctx2d.arc(0, -32, 4, 0, 2 * Math.PI);
          ctx2d.fillStyle = '#fed7aa'; ctx2d.fill();
          // Torso + arms to handlebar
          ctx2d.strokeStyle = '#1e40af';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.moveTo(0, -28); ctx2d.lineTo(2, -22);
          ctx2d.moveTo(2, -22); ctx2d.lineTo(10, -16);
          ctx2d.stroke();
          // Pedaling legs — upper leg from hip to knee, lower leg from knee to
          // the moving pedal position. Second leg is 180° out of phase.
          ctx2d.lineWidth = 2.2;
          var hipX = 1, hipY = -22;
          [{ px: pedalX, py: pedalY }, { px: pedalX2, py: pedalY2 }].forEach(function(pd, pi) {
            var kneeX = hipX + (pd.px - hipX) * 0.5 + (pi === 0 ? 2 : -2);
            var kneeY = hipY + (pd.py - hipY) * 0.5 - 2;
            ctx2d.strokeStyle = pi === 0 ? '#1e40af' : '#1d4ed8';
            ctx2d.beginPath();
            ctx2d.moveTo(hipX, hipY);
            ctx2d.lineTo(kneeX, kneeY);
            ctx2d.lineTo(pd.px, pd.py);
            ctx2d.stroke();
          });
          ctx2d.restore();

          // ── Surface-specific particles from rear wheel ──
          // Moving on dirt kicks up dust, on wet leaves a mist, on sand tosses
          // grains. Emission rate scales with speed — so students physically
          // see that higher velocity = more energy dissipated into the surface.
          // Suppressed for users who prefer reduced motion (purely decorative).
          var emitSurf = terrain.profile(camX).kind;
          var vNow = velRef.current;
          var emitRate = 0;
          var emitColor = '#fbbf24';
          var emitSpread = 0.7;
          if (_prefersReducedMotion) { /* no emission */ }
          else if (emitSurf === 'dirt' && vNow > 1.5) { emitRate = Math.min(3, vNow * 0.25); emitColor = '#a8774a'; }
          else if (emitSurf === 'wet' && vNow > 2) { emitRate = Math.min(4, vNow * 0.35); emitColor = '#94a3b8'; emitSpread = 1.1; }
          else if (emitSurf === 'sand' && vNow > 1) { emitRate = Math.min(5, vNow * 0.45); emitColor = '#fcd34d'; emitSpread = 0.9; }
          if (emitRate > 0) {
            for (var em = 0; em < emitRate; em++) {
              if (Math.random() > 0.7) continue;
              var rwWorldX = camX - (18 / pxPerMeter);
              var rwWorldY = terrain.profile(rwWorldX).y + 0.3;
              particlesRef.current.push({
                x: rwWorldX,
                y: rwWorldY,
                vx: -(0.5 + Math.random() * vNow * 0.4),
                vy: 0.5 + Math.random() * 1.2 * emitSpread,
                life: 0,
                maxLife: 0.8 + Math.random() * 0.8,
                size: 1 + Math.random() * 2,
                color: emitColor
              });
            }
          }
          // Advance + render particles
          var pArr = particlesRef.current;
          var newP = [];
          var pdt = 1 / 60;
          for (var pi2 = 0; pi2 < pArr.length; pi2++) {
            var p = pArr[pi2];
            p.life += pdt;
            if (p.life >= p.maxLife) continue;
            p.x += p.vx * pdt;
            p.y += p.vy * pdt - 0.8 * pdt; // gravity pulls down visually
            p.vy -= 3 * pdt; // decelerate upward
            var fade = 1 - (p.life / p.maxLife);
            var psX = worldToScreenX(p.x);
            var psY = worldToScreenY(p.y);
            ctx2d.fillStyle = p.color;
            ctx2d.globalAlpha = fade * 0.7;
            ctx2d.beginPath();
            ctx2d.arc(psX, psY, p.size, 0, 2 * Math.PI);
            ctx2d.fill();
            newP.push(p);
          }
          ctx2d.globalAlpha = 1;
          particlesRef.current = newP.slice(-80); // cap so memory stays bounded

          // ── Speed lines at high velocity ──
          // Thin horizontal streaks sweeping past the bike, brighter when the
          // relative air velocity (v + headwind) is high. Gives students a
          // visceral sense of speed and reinforces that headwind compounds
          // with ground speed to increase drag.
          var slVRel = Math.abs(velRef.current + wind);
          if (slVRel > 4) {
            var slIntensity = Math.min(1, (slVRel - 4) / 12);
            ctx2d.save();
            ctx2d.strokeStyle = 'rgba(255,255,255,' + (0.25 * slIntensity) + ')';
            ctx2d.lineWidth = 1.2;
            for (var sl = 0; sl < 10; sl++) {
              var slPhase = (timeRef.current * slVRel * 0.8 + sl * 71) % 200;
              var slX = W * 1.1 - slPhase;
              var slY = by - 30 + ((sl * 37) % 70) - 35;
              var slLen = 14 + slIntensity * 22;
              ctx2d.beginPath();
              ctx2d.moveTo(slX, slY);
              ctx2d.lineTo(slX + slLen, slY + 1);
              ctx2d.stroke();
            }
            ctx2d.restore();
          }

          // Force vectors — scale so the longest ≈ 100 px
          if (showVectors) {
            var v = velRef.current;
            var m = (bike.mass - 70) + riderMass;
            var y0v = terrain.profile(camX).y;
            var y1v = terrain.profile(camX + 0.5).y;
            var slope = (y1v - y0v) / 0.5;
            var a = Math.atan(slope);
            var normalN = m * G * Math.cos(a);
            var gravP = m * G * Math.sin(a);
            var surf = terrain.profile(camX).kind;
            var crr = bike.crr * (SURFACE_CRR_MULT[surf] || 1);
            var rollingF = crr * normalN;
            var vRelVec = v + wind;
            var dragF = 0.5 * RHO_AIR * bike.cdA * vRelVec * Math.abs(vRelVec);
            var pedalF = coasting ? 0 : pedalDriveForce(bike, gearRatioFor(bike, gear), v, power, riderMass); // same model as the physics step
            var maxF = Math.max(50, Math.abs(pedalF), rollingF, dragF, Math.abs(gravP), normalN);
            var pxScale = 80 / maxF;

            // Gravity (straight down)
            drawVector(ctx2d, bx, by - 22, 0, m * G * pxScale, '#ef4444', 'mg');
            // Normal (perpendicular to ground, away)
            drawVector(ctx2d, bx, by - 22, -Math.sin(a) * normalN * pxScale, -Math.cos(a) * normalN * pxScale, '#3b82f6', 'N');
            // Pedal thrust (along ground, forward)
            drawVector(ctx2d, bx, by - 22, Math.cos(a) * pedalF * pxScale, Math.sin(a) * pedalF * pxScale, '#10b981', 'F_pedal');
            // Drag (opposing motion)
            drawVector(ctx2d, bx, by - 22, -Math.cos(a) * dragF * pxScale, -Math.sin(a) * dragF * pxScale, '#a855f7', 'F_drag');
            // Rolling (opposing motion)
            drawVector(ctx2d, bx, by - 10, -Math.cos(a) * rollingF * pxScale, -Math.sin(a) * rollingF * pxScale, '#f59e0b', 'F_roll');
          }

          // Energy graph (top-right corner)
          if (showGraph) {
            drawEnergyGraph(ctx2d, W, H);
          }

          // ── Elevation minimap (bottom-right) ──
          // Samples terrain profile from 0-400m and draws it as a filled curve,
          // with a marker at the rider\u2019s current x. Students see the course
          // shape AND their position on it \u2014 crucial for the sandbox\u2019s energy
          // conservation lesson (PE ? KE as you roll into valleys).
          (function() {
            var mmW = 180, mmH = 52;
            var mmX = W - mmW - 10;
            var mmY = H - mmH - 10;
            var mmXMin = 0, mmXMax = 400;
            // Find elevation range for y-scaling
            var mmYMin = Infinity, mmYMax = -Infinity;
            for (var mmSample = mmXMin; mmSample <= mmXMax; mmSample += 8) {
              var me = terrain.profile(mmSample).y;
              if (me < mmYMin) mmYMin = me;
              if (me > mmYMax) mmYMax = me;
            }
            if (mmYMax - mmYMin < 4) { mmYMax = mmYMin + 4; } // pad flat terrain
            var mmToX = function(wx) { return mmX + ((wx - mmXMin) / (mmXMax - mmXMin)) * mmW; };
            var mmToY = function(wy) { return mmY + mmH - 6 - ((wy - mmYMin) / (mmYMax - mmYMin)) * (mmH - 10); };
            // Background panel
            ctx2d.fillStyle = 'rgba(15,23,42,0.78)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.3)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(mmX, mmY, mmW, mmH, 6); else ctx2d.rect(mmX, mmY, mmW, mmH);
            ctx2d.fill(); ctx2d.stroke();
            // Label
            ctx2d.fillStyle = '#fbbf24';
            ctx2d.font = 'bold 9px monospace';
            ctx2d.textAlign = 'left';
            ctx2d.fillText('COURSE', mmX + 6, mmY + 11);
            ctx2d.fillStyle = '#94a3b8';
            ctx2d.fillText(Math.round(mmXMax) + ' m', mmX + mmW - 34, mmY + 11);
            // Terrain curve (filled)
            ctx2d.fillStyle = 'rgba(56,189,248,0.22)';
            ctx2d.strokeStyle = 'rgba(56,189,248,0.9)';
            ctx2d.lineWidth = 1.2;
            ctx2d.beginPath();
            ctx2d.moveTo(mmToX(mmXMin), mmY + mmH - 2);
            for (var mmx = mmXMin; mmx <= mmXMax; mmx += 4) {
              var my = terrain.profile(mmx).y;
              ctx2d.lineTo(mmToX(mmx), mmToY(my));
            }
            ctx2d.lineTo(mmToX(mmXMax), mmY + mmH - 2);
            ctx2d.closePath();
            ctx2d.fill();
            // Stroke just the top edge
            ctx2d.beginPath();
            for (var mmx2 = mmXMin; mmx2 <= mmXMax; mmx2 += 4) {
              var my2 = terrain.profile(mmx2).y;
              if (mmx2 === mmXMin) ctx2d.moveTo(mmToX(mmx2), mmToY(my2));
              else ctx2d.lineTo(mmToX(mmx2), mmToY(my2));
            }
            ctx2d.stroke();
            // Rider position marker
            var mmRiderX = mmToX(Math.max(mmXMin, Math.min(mmXMax, camX)));
            var mmRiderY = mmToY(terrain.profile(Math.max(mmXMin, Math.min(mmXMax, camX))).y);
            ctx2d.fillStyle = '#f43f5e';
            ctx2d.beginPath();
            ctx2d.arc(mmRiderX, mmRiderY - 2, 3, 0, 2 * Math.PI);
            ctx2d.fill();
            ctx2d.strokeStyle = 'rgba(244,63,94,0.45)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(mmRiderX, mmY + 16); ctx2d.lineTo(mmRiderX, mmY + mmH - 2);
            ctx2d.stroke();
          })();

          // ── Wind indicator (top-center) ──
          // Large arrow showing wind direction and magnitude. Wind > 0 means
          // the air is moving TOWARD the rider (headwind) so the arrow points
          // left (against the direction of travel). Stronger winds get a longer
          // arrow with visible streaks.
          if (Math.abs(wind) > 0.1) {
            var wiCx = W * 0.5;
            var wiCy = 28;
            var wiMag = Math.min(1, Math.abs(wind) / 11);
            var wiLen = 28 + wiMag * 60;
            var wiDir = wind > 0 ? -1 : 1; // headwind points left (against motion)
            var wiCol = wind > 0 ? 'rgba(248,113,113,0.9)' : 'rgba(74,222,128,0.9)';
            ctx2d.save();
            // Box
            ctx2d.fillStyle = 'rgba(15,23,42,0.6)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.25)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(wiCx - 82, wiCy - 16, 164, 32, 6); else ctx2d.rect(wiCx - 82, wiCy - 16, 164, 32);
            ctx2d.fill(); ctx2d.stroke();
            // Label
            ctx2d.fillStyle = '#cbd5e1';
            ctx2d.font = 'bold 9px monospace';
            ctx2d.textAlign = 'center';
            ctx2d.fillText((wind > 0 ? 'HEADWIND ' : 'TAILWIND ') + Math.abs(wind * 2.23694).toFixed(0) + ' mph', wiCx, wiCy - 4);
            // Arrow
            ctx2d.strokeStyle = wiCol;
            ctx2d.fillStyle = wiCol;
            ctx2d.lineWidth = 2.5;
            ctx2d.beginPath();
            ctx2d.moveTo(wiCx - (wiLen / 2) * wiDir, wiCy + 8);
            ctx2d.lineTo(wiCx + (wiLen / 2) * wiDir, wiCy + 8);
            ctx2d.stroke();
            // Arrowhead
            ctx2d.beginPath();
            var tipX = wiCx + (wiLen / 2) * wiDir;
            ctx2d.moveTo(tipX, wiCy + 8);
            ctx2d.lineTo(tipX - 6 * wiDir, wiCy + 4);
            ctx2d.lineTo(tipX - 6 * wiDir, wiCy + 12);
            ctx2d.closePath();
            ctx2d.fill();
            // Streak lines to imply speed
            ctx2d.strokeStyle = wiCol;
            ctx2d.lineWidth = 1;
            ctx2d.globalAlpha = 0.6;
            for (var ws = 0; ws < 3; ws++) {
              var wy = wiCy + 8 + (ws - 1) * 4;
              var wx0 = wiCx - (wiLen / 2) * wiDir + ws * 4 * wiDir;
              ctx2d.beginPath();
              ctx2d.moveTo(wx0, wy);
              ctx2d.lineTo(wx0 + 10 * wiDir, wy);
              ctx2d.stroke();
            }
            ctx2d.globalAlpha = 1;
            ctx2d.textAlign = 'left';
            ctx2d.restore();
          }

          // ── Telemetry HUD (top-left) ──
          // Live readout of the quantities students are manipulating. Cadence
          // derived from v = ω·r so they can see the rotational-linear tie.
          var hudV = velRef.current;
          var hudMph = hudV * 2.23694;
          var hudKph = hudV * 3.6;
          var hudCadRpm = Math.round(cadenceRpmFor(hudV, bike.wheelR, gearRatioFor(bike, gear)));
          var hudSurfLabel = { pavement: 'Pavement', dirt: 'Dirt', wet: 'Wet Road', sand: 'Sand' }[terrain.profile(camX).kind] || 'Pavement';
          var hudSlopePct = (function() {
            var a = terrain.profile(camX);
            var b2 = terrain.profile(camX + 1);
            return Math.round((b2.y - a.y) * 100);
          })();
          var hudX = 10, hudY = 10;
          var hudW = 164, hudH = 88;
          ctx2d.fillStyle = 'rgba(15,23,42,0.78)';
          ctx2d.strokeStyle = 'rgba(148,163,184,0.3)';
          ctx2d.lineWidth = 1;
          ctx2d.beginPath();
          ctx2d.roundRect ? ctx2d.roundRect(hudX, hudY, hudW, hudH, 8) : ctx2d.rect(hudX, hudY, hudW, hudH);
          ctx2d.fill(); ctx2d.stroke();
          ctx2d.fillStyle = '#fbbf24';
          ctx2d.font = 'bold 10px monospace';
          ctx2d.fillText('TELEMETRY', hudX + 8, hudY + 14);
          ctx2d.fillStyle = '#e2e8f0';
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillText('v ' + hudMph.toFixed(1) + ' mph', hudX + 8, hudY + 30);
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.font = '9px monospace';
          ctx2d.fillText('(' + hudKph.toFixed(1) + ' km/h)', hudX + 88, hudY + 30);
          ctx2d.fillStyle = '#e2e8f0';
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillText('cad ' + hudCadRpm + ' rpm', hudX + 8, hudY + 44);
          ctx2d.fillText(coasting ? 'pwr 0 W (COAST)' : ('pwr ' + Math.round(Math.min(power, bike.maxPower)) + ' W'), hudX + 8, hudY + 58);
          ctx2d.fillStyle = '#a5b4fc';
          ctx2d.font = '9px monospace';
          ctx2d.fillText('surface: ' + hudSurfLabel, hudX + 8, hudY + 72);
          var hudSurfW = ctx2d.measureText('surface: ' + hudSurfLabel + '  ').width;
          ctx2d.fillStyle = hudSlopePct > 3 ? '#f87171' : hudSlopePct < -3 ? '#4ade80' : '#94a3b8';
          ctx2d.fillText('slope: ' + (hudSlopePct > 0 ? '+' : '') + hudSlopePct + '%', hudX + 8 + hudSurfW, hudY + 72);
          // Distance rolled
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.font = 'bold 9px monospace';
          ctx2d.fillText('dist ' + Math.round(camX) + ' m', hudX + 8, hudY + 84);
        };

        var drawVector = function(ctx2d, x, y, dx, dy, color, label) {
          var len = Math.sqrt(dx * dx + dy * dy);
          if (len < 2) return;
          ctx2d.strokeStyle = color;
          ctx2d.fillStyle = color;
          ctx2d.lineWidth = 2.5;
          ctx2d.beginPath();
          ctx2d.moveTo(x, y);
          ctx2d.lineTo(x + dx, y + dy);
          ctx2d.stroke();
          // arrowhead
          var ang = Math.atan2(dy, dx);
          ctx2d.beginPath();
          ctx2d.moveTo(x + dx, y + dy);
          ctx2d.lineTo(x + dx - 8 * Math.cos(ang - 0.4), y + dy - 8 * Math.sin(ang - 0.4));
          ctx2d.lineTo(x + dx - 8 * Math.cos(ang + 0.4), y + dy - 8 * Math.sin(ang + 0.4));
          ctx2d.closePath(); ctx2d.fill();
          // label
          ctx2d.font = 'bold 11px monospace';
          ctx2d.fillStyle = '#0f172a';
          ctx2d.fillRect(x + dx + 4, y + dy - 8, 50, 14);
          ctx2d.fillStyle = color;
          ctx2d.fillText(label, x + dx + 8, y + dy + 3);
        };

        var drawEnergyGraph = function(ctx2d, W, _H) {
          var gw = 250, gh = 116;
          var gx = W - gw - 56, gy = 12;                       // clear of the fullscreen button
          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx2d.fillRect(gx, gy, gw, gh);
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 1; ctx2d.setLineDash([]);
          ctx2d.strokeRect(gx, gy, gw, gh);
          ctx2d.font = 'bold 11px sans-serif';
          ctx2d.fillStyle = '#e2e8f0';
          ctx2d.fillText('Energy (J)', gx + 8, gy + 14);
          // Each line has its own color AND its own dash pattern, so color is not the only cue.
          var SERIES = [['ke', '#22d3ee', [], 'Motion (KE)'], ['pe', '#fbbf24', [7, 4], 'Height (PE)'], ['total', '#f472b6', [2, 3], 'Total']];
          var lx = gx + 8;
          SERIES.forEach(function(sr) {
            ctx2d.strokeStyle = sr[1]; ctx2d.lineWidth = 2; ctx2d.setLineDash(sr[2]);
            ctx2d.beginPath(); ctx2d.moveTo(lx, gy + 25); ctx2d.lineTo(lx + 16, gy + 25); ctx2d.stroke();
            ctx2d.setLineDash([]); ctx2d.fillStyle = sr[1]; ctx2d.font = 'bold 10px sans-serif';
            ctx2d.fillText(sr[3], lx + 19, gy + 29); lx += 19 + ctx2d.measureText(sr[3]).width + 10;
          });
          var hist = energyHistoryRef.current;
          if (hist.length < 2) return;
          // Height energy goes negative below the start line, so the scale covers both sides of zero.
          var maxE = 100, minE = 0;
          hist.forEach(function(pt) { maxE = Math.max(maxE, pt.ke, pt.pe, pt.total); minE = Math.min(minE, pt.pe, pt.total); });
          var top = gy + 38, bottom = gy + gh - 6, span = maxE - minE;
          var yOf = function(e) { return bottom - ((e - minE) / span) * (bottom - top); };
          ctx2d.save();
          ctx2d.beginPath(); ctx2d.rect(gx + 1, top - 2, gw - 2, bottom - top + 6); ctx2d.clip();
          ctx2d.strokeStyle = 'rgba(226,232,240,0.45)'; ctx2d.lineWidth = 1; ctx2d.setLineDash([]);
          ctx2d.beginPath(); ctx2d.moveTo(gx, yOf(0)); ctx2d.lineTo(gx + gw, yOf(0)); ctx2d.stroke();   // zero line
          SERIES.forEach(function(sr) {
            ctx2d.strokeStyle = sr[1]; ctx2d.lineWidth = 2; ctx2d.setLineDash(sr[2]);
            ctx2d.beginPath();
            hist.forEach(function(pt, i) {
              var px = gx + 2 + (i / (hist.length - 1)) * (gw - 4), py = yOf(pt[sr[0]]);
              if (i === 0) ctx2d.moveTo(px, py); else ctx2d.lineTo(px, py);
            });
            ctx2d.stroke();
          });
          ctx2d.restore(); ctx2d.setLineDash([]);
          ctx2d.fillStyle = '#cbd5e1'; ctx2d.font = '10px sans-serif';
          ctx2d.fillText('0', gx + 4, yOf(0) - 3);
        };

        // Draw on HUD tick even when paused
        useEffect(function() { draw(); }, [hudTick, bikeId, terrainId, showVectors, showGraph]); // eslint-disable-line

        // Stats panel
        var v = velRef.current;
        var mph = v * 2.237;
        var kph = v * 3.6;
        var elev = terrain.profile(posRef.current).y;
        var systemMass = (bike.mass - 70) + riderMass;
        var ke = 0.5 * systemMass * v * v;
        var pe = systemMass * G * elev;

        function renderRideFocus() {
          var currentProfile = terrain.profile(posRef.current);
          var aheadProfile = terrain.profile(posRef.current + 1);
          var slopePct = Math.round((aheadProfile.y - currentProfile.y) * 100);
          var cadenceRpm = Math.round(cadenceRpmFor(v, bike.wheelR, gearRatioFor(bike, gear)));
          var status = running ? (coasting ? 'Coasting' : 'Pedaling') : 'Ready to ride';
          var cue = !running
            ? 'Start the ride and watch the force arrows respond to each change.'
            : coasting
            ? 'Coast-down mode: drag, rolling resistance, and gravity are in charge.'
            : slopePct > 4
            ? 'Climb ahead: shift to an easier gear so your legs can keep turning.'
            : wind > 2
            ? 'Headwind: drag rises fast as relative air speed increases.'
            : 'Tune power, gear, wind, or terrain and compare the ride.';
          var progressWidth = Math.min(100, Math.max(4, (posRef.current / 400) * 100));
          var surfaceLabel = currentProfile.kind.charAt(0).toUpperCase() + currentProfile.kind.slice(1);
          var metricItems = [
            ['Speed', mph.toFixed(1) + ' mph', kph.toFixed(1) + ' km/h'],
            ['Cadence', Math.max(0, cadenceRpm) + ' rpm', 'gear ' + gearRatioFor(bike, gear).toFixed(2) + ' : 1'],
            ['Energy', (ke / 1000).toFixed(2) + ' kJ KE', (pe / 1000).toFixed(2) + ' kJ PE']
          ];
          return h('div', { className: 'p-3 pb-0', 'data-bikelab-ride-focus': 'true' },
            h('div', { className: 'bikelab-ride-focus-grid bg-white border border-cyan-200 rounded-2xl p-3 shadow-sm' },
              h('div', { className: 'space-y-3' },
                h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
                  h('div', null,
                    h('div', { className: 'text-xs font-black uppercase tracking-wider text-cyan-700' }, 'Ride lab'),
                    h('div', { className: 'text-2xl font-black text-slate-900 leading-tight' }, status)
                  ),
                  h('div', { className: 'flex gap-2 flex-wrap text-xs font-bold' },
                    h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700' }, bike.name),
                    h('span', { className: 'px-2 py-1 rounded-full bg-sky-100 text-sky-800' }, terrain.name),
                    h('span', { className: 'px-2 py-1 rounded-full bg-amber-100 text-amber-800' }, surfaceLabel + ' surface')
                  )
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed max-w-3xl' }, cue),
                h('div', { className: 'h-2 rounded-full bg-slate-200 overflow-hidden', 'aria-hidden': true },
                  h('div', { className: 'h-full bg-gradient-to-r from-cyan-500 to-emerald-500', style: { width: progressWidth + '%' } })
                )
              ),
              h('div', { className: 'space-y-3' },
                h('div', { className: 'bikelab-metric-grid' },
                  metricItems.map(function(item) {
                    return h('div', { key: item[0], className: 'rounded-xl border border-slate-200 bg-slate-50 p-3' },
                      h('div', { className: 'text-xs font-black uppercase tracking-wider text-slate-500' }, item[0]),
                      h('div', { className: 'text-lg font-black text-slate-900 mt-1' }, item[1]),
                      h('div', { className: 'text-xs font-mono text-slate-500' }, item[2])
                    );
                  })
                ),
                h('div', { className: 'flex gap-2 flex-wrap' },
                  h('button', {
                    onClick: function() { setRunning(!running); },
                    className: 'flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold transition-colors shadow ' + (running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                  }, running ? 'Pause ride' : 'Start ride'),
                  h('button', {
                    onClick: function() { setRunning(false); reset(); },
                    className: 'py-2.5 px-4 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
                  }, t('stem.bikelab.reset', 'Reset'))
                )
              )
            )
          );
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🧪', title: t('stem.bikelab.physics_sandbox_2', 'Physics Sandbox') }),
          renderRideFocus(),
          h('div', { className: 'bikelab-sandbox-grid p-3 flex-1 overflow-auto', 'data-bikelab-sandbox-grid': 'true' },
            // Controls column
            h('div', { className: 'space-y-3', 'data-bikelab-controls': 'true' },
              h('div', { className: 'bikelab-control-card bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.bikelab.bike', 'Bike')),
                BIKES.map(function(b) {
                  return h('button', {
                    key: b.id,
                    onClick: function() { setBikeId(b.id); upd('sandboxBikeId', b.id); },
                    className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 mb-1.5 text-left transition-colors ' + (bikeId === b.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300')
                  },
                    h('span', { className: 'text-xl' }, b.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'text-sm font-bold text-slate-800 truncate' }, b.name),
                      h('div', { className: 'text-xs text-slate-600' }, 'm=' + b.mass + 'kg · Cd·A=' + b.cdA.toFixed(2) + ' · Crr=' + b.crr)
                    )
                  );
                })
              ),
              h('div', { className: 'bikelab-control-card bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.bikelab.terrain', 'Terrain')),
                TERRAINS.map(function(tr) {
                  return h('button', {
                    key: tr.id,
                    onClick: function() { setTerrainId(tr.id); upd('sandboxTerrainId', tr.id); },
                    className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 mb-1.5 text-left transition-colors ' + (terrainId === tr.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')
                  },
                    h('span', { className: 'text-xl' }, tr.icon),
                    h('div', { className: 'text-sm font-bold text-slate-800' }, tr.name)
                  );
                })
              ),
              h('div', { className: 'bikelab-control-card bg-white rounded-xl p-4 shadow border border-slate-400' },
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                  h('span', null, t('stem.bikelab.rider_power', 'Rider Power')), h('span', { className: 'text-cyan-600' }, power > bike.maxPower ? bike.maxPower + ' W (most this bike can use)' : power + ' W')),
                h('input', { type: 'range', min: 0, max: 400, value: power,
                  onChange: function(e) { setPower(parseInt(e.target.value)); },
                  className: 'w-full mt-1 accent-cyan-500',
                  'aria-label': t('stem.bikelab.rider_power_watts', 'Rider power in watts') }),
                h('div', { className: 'text-xs text-slate-600 mt-1' }, t('stem.bikelab.pro_300_w_amateur_150_w_casual_80_w', 'Pro: ~300 W · Amateur: ~150 W · Casual: ~80 W')),
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, t('stem.bikelab.gear_ratio', 'Gear Ratio')), h('span', { className: 'text-violet-600' }, gearRatioFor(bike, gear).toFixed(2) + ' : 1')),
                h('input', { type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                  onChange: function(e) { setGear(parseFloat(e.target.value)); },
                  className: 'w-full mt-1 accent-violet-500',
                  'aria-label': t('stem.bikelab.gear_ratio_slider', 'Gear ratio') }),
                h('div', { className: 'text-xs text-slate-600 mt-1' }, t('stem.bikelab.low_gear_more_torque_less_top_speed_se', 'Low gear = more torque, less top speed. See Gearing Lab for math.')),
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, t('stem.bikelab.wind', 'Wind')),
                  h('span', { className: wind > 0 ? 'text-rose-600' : wind < 0 ? 'text-emerald-600' : 'text-slate-600' },
                    wind === 0 ? 'calm' : (Math.abs(wind * 2.23694).toFixed(0) + ' mph ' + (wind > 0 ? 'headwind' : 'tailwind')))),
                h('input', { type: 'range', min: -11, max: 11, step: 0.5, value: wind,
                  onChange: function(e) { setWind(parseFloat(e.target.value)); },
                  className: 'w-full mt-1 accent-rose-500',
                  'aria-label': t('stem.bikelab.wind_speed_slider', 'Wind speed and direction') }),
                h('div', { className: 'text-xs text-slate-600 mt-1' }, t('stem.bikelab.drag_scales_with_v_wind_a_10_mph_headw', 'Drag scales with (v + wind)² \u2014 a 10 mph headwind at 15 mph feels like 25 mph worth of drag.')),
                h('label', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between mt-3' },
                  h('span', null, t('stem.bikelab.rider_mass', 'Rider Mass')),
                  h('span', { className: 'text-amber-600' }, riderMass + ' kg · ' + Math.round(riderMass * 2.20462) + ' lb')),
                h('input', { type: 'range', min: 30, max: 120, step: 1, value: riderMass,
                  onChange: function(e) { setRiderMass(parseInt(e.target.value, 10)); },
                  className: 'w-full mt-1 accent-amber-500',
                  'aria-label': t('stem.bikelab.rider_mass_in_kilograms', 'Rider mass in kilograms') }),
                h('div', { className: 'text-xs text-slate-600 mt-1' }, 'System mass = ' + ((bike.mass - 70) + riderMass) + ' kg (frame ' + (bike.mass - 70) + ' + rider ' + riderMass + '). Heavier riders climb slower (F=m·g·sinθ) and accelerate slower (a=F/m).')
              )
            ),
            // Canvas column
            h('div', { className: 'space-y-3', 'data-bikelab-ride-column': 'true' },
              h('div', { className: 'bikelab-canvas-toolbar', 'data-bikelab-canvas-toolbar': 'true' },
                h('div', { className: 'text-xs font-black uppercase tracking-wider text-slate-700' }, 'Live ride surface'),
                h('div', { className: 'flex gap-2 flex-wrap text-xs font-bold' },
                  h('span', { className: 'px-2 py-1 rounded-full bg-slate-200 text-slate-700' }, bike.name),
                  h('span', { className: 'px-2 py-1 rounded-full bg-cyan-100 text-cyan-800' }, terrain.name),
                  h('span', { className: 'px-2 py-1 rounded-full ' + (running ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700') }, running ? (coasting ? 'Coasting' : 'Pedaling') : 'Ready')
                )
              ),
              h('div', { id: 'bikelab-sandbox-fs', className: 'bikelab-canvas-shell bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800', 'data-bikelab-sim-surface': 'true', style: { position: 'relative' } },
                h('p', { id: 'bikelab-ride-canvas-description', className: 'sr-only' }, 'Live physics ride for ' + bike.name + ' on ' + terrain.name + '. Current speed ' + mph.toFixed(1) + ' miles per hour. The graphic shows terrain, force vectors, and energy. Use the nearby Bike, Terrain, Rider Power, Gear Ratio, Wind, Rider Mass, Start or Pause, and Reset controls to change the simulation.'),
                h('canvas', { ref: canvasRef, width: 900, height: 440, className: 'bikelab-fit-canvas w-full block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300', role: 'img', tabIndex: 0, 'data-bikelab-canvas': 'true', style: { width: '100%', height: 'auto', aspectRatio: '900 / 440', borderRadius: 12, border: '1px solid rgba(148,163,184,0.26)', boxShadow: 'inset 0 0 44px rgba(14,165,233,0.08)' }, 'aria-label': t('stem.bikelab.physics_sandbox_simulation_bicycle_on_', 'Physics sandbox simulation: bicycle on terrain with live force vectors (gravity, drag, rolling resistance, propulsion) and energy graphs.'), 'aria-describedby': 'bikelab-ride-canvas-description' }),
                // Fullscreen toggle (top-right)
                h('button', {
                  'aria-label': t('stem.bikelab.toggle_fullscreen_for_the_physics_sand', 'Toggle fullscreen for the physics sandbox'),
                  title: t('stem.bikelab.fullscreen', 'Fullscreen'),
                  onClick: function() {
                    var el = document.getElementById('bikelab-sandbox-fs');
                    if (!el) return;
                    var inFull = document.fullscreenElement === el || document.webkitFullscreenElement === el || document.mozFullScreenElement === el;
                    if (inFull) { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) ex.call(document); }
                    else { if (window.__alloStemFS) window.__alloStemFS(el); }
                  },
                  style: {
                    position: 'absolute', top: 8, right: 8, zIndex: 10,
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                    border: '1px solid rgba(148,163,184,0.45)', color: 'var(--allo-stem-text, #cbd5e1)',
                    fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }
                }, '⛶')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', {
                  onClick: function() { setRunning(!running); },
                  className: 'flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors shadow ' + (running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                }, running ? '⏸ Pause' : '▶ Start'),
                h('button', {
                  onClick: function() { setRunning(false); reset(); },
                  className: 'py-2.5 px-4 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
                }, t('stem.bikelab.reset', '↺ Reset')),
                h('button', {
                  onClick: function() { setShowVectors(!showVectors); upd('sandboxShowVectors', !showVectors); },
                  'aria-pressed': showVectors,
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showVectors ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600')
                }, t('stem.bikelab.force_vectors', '→ Force Vectors')),
                h('button', {
                  onClick: function() { setShowGraph(!showGraph); upd('sandboxShowEnergyGraph', !showGraph); },
                  'aria-pressed': showGraph,
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showGraph ? 'bg-pink-700 text-white' : 'bg-slate-200 text-slate-600')
                }, t('stem.bikelab.energy_graph', '📈 Energy Graph')),
                h('button', {
                  onClick: function() { setCoasting(!coasting); },
                  'aria-pressed': coasting,
                  title: t('stem.bikelab.stop_pedaling_watch_drag_rolling_and_g', 'Stop pedaling \u2014 watch drag, rolling, and gravity decelerate the bike on their own.'),
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (coasting ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600')
                }, coasting ? '\uD83D\uDED1 Coasting' : '\uD83D\uDECC\uFE0F Coast Down')
              ),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-2' },
                [['Speed', mph.toFixed(1) + ' mph', kph.toFixed(1) + ' km/h'],
                 ['Distance', (posRef.current).toFixed(0) + ' m', ((posRef.current) * 3.281).toFixed(0) + ' ft'],
                 ['Elevation', elev.toFixed(1) + ' m', (elev * 3.281).toFixed(1) + ' ft'],
                 ['Kinetic E', (ke / 1000).toFixed(2) + ' kJ', (0.5 * systemMass * v * v).toFixed(0) + ' J'],
                 ['Potential E', (pe / 1000).toFixed(2) + ' kJ', (systemMass * G * elev).toFixed(0) + ' J']
                ].map(function(stat, i) {
                  return h('div', { key: i, className: 'bg-white rounded-lg p-3 shadow border border-slate-400' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, stat[0]),
                    h('div', { className: 'text-lg font-black text-slate-800 mt-0.5' }, stat[1]),
                    h('div', { className: 'text-xs text-slate-600 font-mono' }, stat[2])
                  );
                })
              ),
              (function() {
                var bud = budgetRef.current;
                var rows = [
                  ['Tires rolling', bud.rolling, 'bg-amber-600'],
                  ['Pushing through air', bud.air, 'bg-violet-600'],
                  [bud.hill >= 0 ? 'Climbing the hill' : 'Hill helping you', bud.hill, 'bg-rose-600'],
                  [bud.speedUp >= 0 ? 'Speeding up' : 'Slowing down', bud.speedUp, 'bg-emerald-600']
                ];
                var sinks = rows.filter(function(r) { return r[1] > 0.5; });
                var sinkTotal = sinks.reduce(function(a, r) { return a + r[1]; }, 0);
                var top = sinks.slice().sort(function(a, b) { return b[1] - a[1]; })[0];
                var msg = (!running && v < 0.1) ? 'Start the ride to see where your watts go: the tires, the air, the hill, and speeding up.'
                  : bud.stalled ? 'This gear is too hard for this hill: your legs cannot turn the pedals. Pick an easier gear.'
                  : (!coasting && bud.cadence > 115) ? 'Your legs are spinning out at ' + Math.round(bud.cadence) + ' rpm. Pick a harder gear to go faster.'
                  : (!coasting && running && v > 0.5 && bud.cadence < 45) ? 'You are grinding at ' + Math.round(bud.cadence) + ' rpm. An easier gear would let your legs make more power.'
                  : top ? 'Right now the biggest share is ' + top[0].toLowerCase() + ' (' + Math.round(100 * top[1] / sinkTotal) + '%).'
                  : 'Nothing is using power right now.';
                var watts = function(w) { return (w < -0.5 ? '\u2212' : '') + Math.round(Math.abs(w)) + ' W'; };
                return h('section', { 'data-bikelab-power-budget': 'true', 'aria-labelledby': 'bikelab-power-budget-title', className: 'bg-white rounded-xl p-3 shadow border border-slate-400' },
                  h('h3', { id: 'bikelab-power-budget-title', className: 'text-sm font-black text-slate-800' }, 'Where does my power go?'),
                  h('p', { 'data-bikelab-power-message': 'true', className: 'text-xs text-slate-700 mt-0.5' }, msg),
                  h('div', { 'aria-hidden': 'true', className: 'flex h-4 w-full overflow-hidden rounded-full bg-slate-200 mt-2' },
                    sinks.map(function(r) { return h('div', { key: r[0], className: r[2], style: { width: (100 * r[1] / sinkTotal) + '%' } }); })),
                  h('table', { className: 'w-full text-xs mt-2' },
                    h('caption', { className: 'sr-only' }, 'Power in watts right now'),
                    h('tbody', null,
                      h('tr', null,
                        h('th', { scope: 'row', className: 'text-left font-bold py-0.5 text-slate-800' }, bike.assistW ? 'From your legs + the motor' : 'From your legs'),
                        h('td', { className: 'text-right font-mono font-bold text-slate-800' }, watts(bud.pedal))),
                      rows.map(function(r) {
                        return h('tr', { key: r[0] },
                          h('th', { scope: 'row', className: 'text-left font-normal py-0.5 text-slate-700' },
                            h('span', { 'aria-hidden': 'true', className: 'inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle ' + r[2] }), r[0]),
                          h('td', { className: 'text-right font-mono text-slate-700' }, watts(r[1])));
                      }))),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, 'The four rows add up to the top row. A minus sign means that row is giving energy back.'));
              })(),
              h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-400' },
                h('span', { className: 'font-bold text-slate-700' }, t('stem.bikelab.physics_notes', '💡 Physics notes: ')),
                'Newton\'s 2nd law: F_net = m·a. Forces shown: pedal thrust (green), gravity component parallel to slope (red), rolling resistance (amber), air drag (purple, scales with v²). Normal force (blue) keeps the bike on the ground — it doesn\'t do work. ' + bike.tip
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: GEARING LAB
      // ─────────────────────────────────────────────────────
      function GearingLab() {
        var bikeState = useState(d.gearingBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];

        var ringIdxState = useState(0);
        var ringIdx = ringIdxState[0], setRingIdx = ringIdxState[1];
        var cogIdxState = useState(Math.floor(bike.cassetteT.length / 2));
        var cogIdx = cogIdxState[0], setCogIdx = cogIdxState[1];

        // Reset cog when bike changes
        useEffect(function() {
          setRingIdx(0);
          setCogIdx(Math.floor(bike.cassetteT.length / 2));
        }, [bikeId]);

        var cadenceState = useState(85);
        var cadence = cadenceState[0], setCadence = cadenceState[1];

        var chainringT = bike.chainringT[ringIdx];
        var cogT = bike.cassetteT[cogIdx];
        var ratio = chainringT / cogT;
        // Wheel circumference (m)
        var wheelCirc = 2 * Math.PI * bike.wheelR;
        // Development per pedal rev (meters traveled)
        var dev = ratio * wheelCirc;
        // Speed at cadence
        var speedMs = dev * (cadence / 60);
        var speedMph = speedMs * 2.237;
        var speedKph = speedMs * 3.6;
        // Mechanical advantage on rear wheel (inverse of ratio — low gear = high MA)
        var ma = cogT / chainringT;
        // Push at the tire for every 100 N on the pedal: the crank is a lever, and the gear and wheel trade push for distance.
        var tirePush = 100 * CRANK_M / (ratio * bike.wheelR);
        // Drivetrain picture. The crank and the wheel turn at their true ratio, at a quarter of real speed so the eye can follow.
        var DT = { wx: 124, cx: 322, y: 104, ringR: chainringT * 0.8, cogR: cogT * 0.8, crankLen: 48 };
        var playState = useState(!_prefersReducedMotion);
        var playing = playState[0], setPlaying = playState[1];
        var crankRef = useRef(null), wheelRef = useRef(null), chainRef = useRef(null), turnsRef = useRef(null);
        var spinRef = useRef({ crank: 0, wheel: 0 });
        var liveRef = useRef(null);
        liveRef.current = { ratio: ratio, cadence: cadence, pitch: 2 * Math.PI * DT.ringR / chainringT, teeth: chainringT };
        var paintDrivetrain = function() {
          var sp = spinRef.current, L = liveRef.current;
          if (crankRef.current) crankRef.current.setAttribute('transform', 'rotate(' + ((sp.crank * 360) % 360).toFixed(1) + ' ' + DT.cx + ' ' + DT.y + ')');
          if (wheelRef.current) wheelRef.current.setAttribute('transform', 'rotate(' + ((sp.wheel * 360) % 360).toFixed(1) + ' ' + DT.wx + ' ' + DT.y + ')');
          if (chainRef.current) chainRef.current.setAttribute('stroke-dashoffset', (-((sp.crank * L.teeth) % 1) * L.pitch).toFixed(2));
          if (turnsRef.current) turnsRef.current.textContent = 'Pedal turns: ' + sp.crank.toFixed(1) + ' · Wheel turns: ' + sp.wheel.toFixed(1);
        };
        // A new gear starts the two counters again, so they always show this gear's ratio.
        useEffect(function() { spinRef.current = { crank: 0, wheel: 0 }; paintDrivetrain(); }, [bikeId, ringIdx, cogIdx]);
        useEffect(function() {
          if (!playing) return undefined;
          var raf = 0, last = 0;
          var step = function(ts) {
            var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
            var L = liveRef.current, turn = dt * (L.cadence / 60) * 0.25;
            spinRef.current.crank += turn; spinRef.current.wheel += turn * L.ratio;
            paintDrivetrain();
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
          return function() { cancelAnimationFrame(raf); };
        }, [playing]);
        // The chain: straight runs along the two shared tangents, wrapped round the back of the cog and the front of the chainring.
        var chainPath = (function() {
          var dd = DT.cx - DT.wx, nx = -(DT.ringR - DT.cogR) / dd, ny = Math.sqrt(1 - nx * nx);
          var p = function(cxv, rr, sgn) { return (cxv + rr * nx).toFixed(1) + ' ' + (DT.y + sgn * rr * ny).toFixed(1); };
          return 'M ' + p(DT.wx, DT.cogR, -1) + ' L ' + p(DT.cx, DT.ringR, -1) +
            ' A ' + DT.ringR + ' ' + DT.ringR + ' 0 ' + (DT.ringR >= DT.cogR ? 1 : 0) + ' 1 ' + p(DT.cx, DT.ringR, 1) +
            ' L ' + p(DT.wx, DT.cogR, 1) +
            ' A ' + DT.cogR + ' ' + DT.cogR + ' 0 ' + (DT.cogR > DT.ringR ? 1 : 0) + ' 1 ' + p(DT.wx, DT.cogR, -1);
        })();
        // Cross-chain penalty: large ring + large cog, or small ring + small cog
        var chainringCount = bike.chainringT.length;
        var cogCount = bike.cassetteT.length;
        var crossChainScore = 0;
        if (chainringCount > 1) {
          if (ringIdx === 0 && cogIdx <= 1) crossChainScore = 2;
          else if (ringIdx === 0 && cogIdx <= 3) crossChainScore = 1;
          else if (ringIdx === chainringCount - 1 && cogIdx >= cogCount - 2) crossChainScore = 2;
          else if (ringIdx === chainringCount - 1 && cogIdx >= cogCount - 4) crossChainScore = 1;
        }

        // Climb simulator: the student picks the hill and how hard the rider pedals.
        var hillState = useState(0.06), hill = hillState[0], setHill = hillState[1];
        var riderWState = useState(120), riderW = riderWState[0], setRiderW = riderWState[1];
        var climbSim = useCallback(function(gearRatio) {
          return steadyClimbSpeed(bike, gearRatio, riderW, hill, 70);
        }, [bike, hill, riderW]);
        // "Pick the gear" challenges
        var gcIdxState = useState(0), gcIdx = gcIdxState[0], setGcIdx = gcIdxState[1];
        var gcPickState = useState(null), gcPick = gcPickState[0], setGcPick = gcPickState[1];
        var gcTestedState = useState(false), gcTested = gcTestedState[0], setGcTested = gcTestedState[1];
        var gearCh = GEAR_CHALLENGES[gcIdx % GEAR_CHALLENGES.length];
        var gcResult = gearChallengeResult(gearCh);
        var gcSolved = (d.gearChallenges && typeof d.gearChallenges === 'object') ? d.gearChallenges : {};
        var gcTopMph = Math.max.apply(null, gcResult.gears.map(function(g) { return g.mph; }).concat([1]));
        var testGearChallenge = function() {
          if (gcPick == null) return;
          setGcTested(true);
          if (gcPick === gcResult.answer && !gcSolved[gearCh.id]) { var nextSolved = Object.assign({}, gcSolved); nextSolved[gearCh.id] = true; upd('gearChallenges', nextSolved); }
        };
        var nextGearChallenge = function() { setGcIdx((gcIdx + 1) % GEAR_CHALLENGES.length); setGcPick(null); setGcTested(false); };
        // Put the tested gear on the picture above, so the student can see it turn.
        var showGearOnPicture = function(g) {
          if (bikeId !== gcResult.bike.id) { setBikeId(gcResult.bike.id); upd('gearingBikeId', gcResult.bike.id); }
          var ri = gcResult.bike.chainringT.indexOf(g.ring), ci = gcResult.bike.cassetteT.indexOf(g.cog);
          setTimeout(function() { if (ri >= 0) setRingIdx(ri); if (ci >= 0) setCogIdx(ci); }, 80);
        };

        // Speed-vs-cadence curve samples
        var cadenceCurve = [];
        for (var c = 40; c <= 120; c += 10) {
          cadenceCurve.push({ c: c, v: ratio * wheelCirc * (c / 60) * 2.237 });
        }

        var crossHint = crossChainScore === 2
          ? h('span', { className: 'bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-xs font-bold' }, t('stem.bikelab.extreme_cross_chain_avoid', '⚠ Extreme cross-chain — avoid'))
          : crossChainScore === 1
          ? h('span', { className: 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-xs font-bold' }, t('stem.bikelab.mild_cross_chain', '⚠ Mild cross-chain'))
          : h('span', { className: 'bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold' }, t('stem.bikelab.chainline_ok', '✓ Chainline OK'));

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '⚙️', title: t('stem.bikelab.gearing_lab_2', 'Gearing Lab') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            // Bike picker
            h('div', { className: 'flex flex-wrap gap-2' },
              BIKES.map(function(b) {
                return h('button', {
                  key: b.id,
                  onClick: function() { setBikeId(b.id); upd('gearingBikeId', b.id); },
                  className: 'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ' + (bikeId === b.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-slate-300')
                },
                  h('span', { className: 'text-xl' }, b.icon),
                  h('span', { className: 'font-bold text-sm text-slate-700' }, b.name),
                  h('span', { className: 'text-xs text-slate-600 font-mono' }, b.chainringT.length + '×' + b.cassetteT.length)
                );
              })
            ),
            // Main layout: gear picker + stats + climb sim
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              // Gear picker card
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, t('stem.bikelab.gear_selection', 'Gear Selection')),
                h('div', { className: 'space-y-4' },
                  h('div', null,
                    h('div', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Chainring (front): ' + chainringT + 'T'),
                    h('div', { className: 'flex gap-2 flex-wrap' },
                      bike.chainringT.map(function(t, i) {
                        return h('button', {
                          key: i,
                          onClick: function() { setRingIdx(i); },
                          className: 'w-12 h-12 rounded-full border-2 font-black transition-colors ' + (ringIdx === i ? 'border-violet-700 bg-violet-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                        }, t);
                      })
                    )
                  ),
                  h('div', null,
                    h('div', { className: 'text-sm font-bold text-slate-700 mb-2' }, 'Cassette cog (rear): ' + cogT + 'T'),
                    h('div', { className: 'flex gap-1 flex-wrap' },
                      bike.cassetteT.map(function(t, i) {
                        return h('button', {
                          key: i,
                          onClick: function() { setCogIdx(i); },
                          className: 'w-10 h-10 rounded-full border-2 font-bold text-sm transition-colors ' + (cogIdx === i ? 'border-fuchsia-800 bg-fuchsia-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                        }, t);
                      })
                    ),
                    h('div', { className: 'text-xs text-slate-600 mt-2' }, t('stem.bikelab.leftmost_largest_easiest_to_climb_righ', 'Leftmost = largest = easiest to climb. Rightmost = smallest = fastest top speed.'))
                  ),
                  h('div', { className: 'pt-2' }, crossHint),
                  h('label', { className: 'text-sm font-bold text-slate-700 flex justify-between pt-2' },
                    h('span', null, t('stem.bikelab.pedal_cadence_rpm', 'Pedal Cadence (RPM)')),
                    h('span', { className: 'text-violet-600' }, cadence)),
                  h('input', { type: 'range', min: 40, max: 120, value: cadence,
                    onChange: function(e) { setCadence(parseInt(e.target.value)); },
                    className: 'w-full accent-violet-500',
                    'aria-label': t('stem.bikelab.pedal_cadence_rpm_slider', 'Pedal cadence in RPM') }),
                  h('div', { className: 'text-xs text-slate-600' }, t('stem.bikelab.casual_riders_60_80_trained_80_100_spi', 'Casual riders: 60–80. Trained: 80–100. Spin classes: 100+.'))
                )
              ),
              // Stats card
              h('div', { className: 'bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-lg text-white p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80 mb-3' }, t('stem.bikelab.this_gear', 'This Gear')),
                h('div', { className: 'grid grid-cols-2 gap-4' },
                  h('div', null,
                    h('div', { className: 'text-xs opacity-80 uppercase tracking-wider' }, t('stem.bikelab.gear_ratio_2', 'Gear Ratio')),
                    h('div', { className: 'text-3xl font-black font-mono' }, ratio.toFixed(2)),
                    h('div', { className: 'text-xs opacity-70 font-mono' }, chainringT + ' ÷ ' + cogT)
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs opacity-80 uppercase tracking-wider' }, 'Push at the tire'),
                    h('div', { 'data-gear-tire-push': 'true', className: 'text-3xl font-black font-mono' }, tirePush.toFixed(0) + ' N'),
                    h('div', { className: 'text-xs opacity-70' }, 'for every 100 N on the pedal')
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs opacity-80 uppercase tracking-wider' }, t('stem.bikelab.distance_per_rev', 'Distance per Rev')),
                    h('div', { className: 'text-2xl font-black font-mono' }, dev.toFixed(2) + ' m'),
                    h('div', { className: 'text-xs opacity-70 font-mono' }, 'ratio × 2πr = ' + ratio.toFixed(2) + ' × ' + wheelCirc.toFixed(2))
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs opacity-80 uppercase tracking-wider' }, 'Speed @ ' + cadence + ' RPM'),
                    h('div', { className: 'text-2xl font-black font-mono' }, speedMph.toFixed(1) + ' mph'),
                    h('div', { className: 'text-xs opacity-70 font-mono' }, speedKph.toFixed(1) + ' km/h · ' + speedMs.toFixed(2) + ' m/s')
                  )
                ),
                h('div', { 'data-gear-drivetrain': chainringT + 'x' + cogT, className: 'mt-4 pt-3 border-t border-white/30' },
                  h('svg', { viewBox: '0 0 440 222', className: 'w-full h-auto', role: 'img', 'aria-label': 'Drivetrain picture. A ' + chainringT + '-tooth chainring at the pedals drives a ' + cogT + '-tooth cog on the back wheel. One turn of the pedals turns the wheel ' + ratio.toFixed(2) + ' times.' },
                    // back wheel and its cog turn together
                    h('g', { ref: wheelRef },
                      h('circle', { cx: DT.wx, cy: DT.y, r: 88, fill: 'none', stroke: '#1e1b4b', strokeWidth: 10 }),
                      h('circle', { cx: DT.wx, cy: DT.y, r: 80, fill: 'none', stroke: '#c4b5fd', strokeWidth: 3 }),
                      [0, 1, 2, 3, 4, 5].map(function(i) {
                        var ang = i * Math.PI / 6;
                        return h('line', { key: i, x1: DT.wx - 79 * Math.cos(ang), y1: DT.y - 79 * Math.sin(ang), x2: DT.wx + 79 * Math.cos(ang), y2: DT.y + 79 * Math.sin(ang), stroke: '#a78bfa', strokeWidth: 1 });
                      }),
                      h('circle', { cx: DT.wx, cy: DT.y - 88, r: 6, fill: '#fde047', stroke: '#1e1b4b', strokeWidth: 1.5 }),
                      h('circle', { cx: DT.wx, cy: DT.y, r: DT.cogR, fill: '#f5d0fe', stroke: '#701a75', strokeWidth: 2 }),
                      h('circle', { cx: DT.wx, cy: DT.y, r: DT.cogR, fill: 'none', stroke: '#701a75', strokeWidth: 3, strokeDasharray: '2 3' }),
                      h('line', { x1: DT.wx, y1: DT.y, x2: DT.wx, y2: DT.y - DT.cogR, stroke: '#701a75', strokeWidth: 2 }),
                      h('circle', { cx: DT.wx, cy: DT.y, r: 4, fill: '#701a75' })
                    ),
                    h('line', { x1: DT.wx, y1: DT.y, x2: DT.cx, y2: DT.y, stroke: '#a78bfa', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.55 }),
                    h('path', { ref: chainRef, d: chainPath, fill: 'none', stroke: '#fde047', strokeWidth: 3.5, strokeDasharray: (liveRef.current.pitch / 2).toFixed(2) + ' ' + (liveRef.current.pitch / 2).toFixed(2) }),
                    // chainring, cranks and pedals turn together
                    h('g', { ref: crankRef },
                      h('circle', { cx: DT.cx, cy: DT.y, r: DT.ringR, fill: '#ede9fe', stroke: '#4c1d95', strokeWidth: 2 }),
                      h('circle', { cx: DT.cx, cy: DT.y, r: DT.ringR, fill: 'none', stroke: '#4c1d95', strokeWidth: 3, strokeDasharray: '2 3' }),
                      h('line', { x1: DT.cx, y1: DT.y, x2: DT.cx, y2: DT.y - DT.crankLen, stroke: '#cbd5e1', strokeWidth: 5, strokeLinecap: 'round' }),
                      h('line', { x1: DT.cx, y1: DT.y, x2: DT.cx, y2: DT.y + DT.crankLen, stroke: '#f8fafc', strokeWidth: 6, strokeLinecap: 'round' }),
                      h('rect', { x: DT.cx - 11, y: DT.y + DT.crankLen - 3, width: 22, height: 7, rx: 3, fill: '#0f172a', stroke: '#f8fafc', strokeWidth: 1 }),
                      h('rect', { x: DT.cx - 11, y: DT.y - DT.crankLen - 4, width: 22, height: 7, rx: 3, fill: '#0f172a', stroke: '#cbd5e1', strokeWidth: 1 }),
                      h('circle', { cx: DT.cx, cy: DT.y, r: 5, fill: '#4c1d95' })
                    ),
                    h('text', { x: DT.wx, y: 217, textAnchor: 'middle', fill: '#ffffff', fontSize: 13, fontWeight: 'bold' }, 'Cog: ' + cogT + ' teeth'),
                    h('text', { x: DT.cx, y: 217, textAnchor: 'middle', fill: '#ffffff', fontSize: 13, fontWeight: 'bold' }, 'Chainring: ' + chainringT + ' teeth')
                  ),
                  h('div', { className: 'flex flex-wrap items-center gap-3 mt-2' },
                    h('button', { type: 'button', 'data-gear-play': playing ? 'playing' : 'paused', 'aria-pressed': playing ? 'true' : 'false',
                      onClick: function() { setPlaying(!playing); },
                      className: 'px-3 py-2 rounded-lg bg-white text-violet-900 font-bold text-sm hover:bg-violet-100' }, playing ? '⏸ Pause' : '▶ Play'),
                    h('span', { ref: turnsRef, 'data-gear-turns': 'true', className: 'text-sm font-mono font-bold' }, 'Pedal turns: 0.0 · Wheel turns: 0.0'),
                    h('span', { className: 'text-xs opacity-90' }, 'Shown at quarter speed')
                  ),
                  h('p', { className: 'text-sm mt-2 leading-relaxed' }, 'One turn of the pedals turns the back wheel ' + ratio.toFixed(2) + ' times, so the bike rolls ' + dev.toFixed(2) + ' m. Watch the yellow dot on the tire.')
                )
              )
            ),
            h('section', { 'data-bikelab-gear-challenge': gearCh.id, 'aria-labelledby': 'bikelab-gear-challenge-title', className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('h3', { id: 'bikelab-gear-challenge-title', className: 'text-sm font-black text-slate-800' }, 'Pick the gear (' + ((gcIdx % GEAR_CHALLENGES.length) + 1) + ' of ' + GEAR_CHALLENGES.length + ')'),
                h('span', { className: 'text-xs font-bold text-slate-600' }, Object.keys(gcSolved).length + ' of ' + GEAR_CHALLENGES.length + ' picked correctly')),
              h('p', { className: 'text-sm text-slate-800 mt-1' }, gearCh.q),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Bike: ' + gcResult.bike.name + '. Rider power: ' + gearCh.power + ' watts.'),
              h('div', { role: 'group', 'aria-label': 'Your prediction', className: 'mt-2 flex flex-wrap gap-2' },
                gcResult.gears.map(function(g) {
                  var on = gcPick === g.key;
                  return h('button', { key: g.key, type: 'button', 'data-gear-option': g.key, 'aria-pressed': on, disabled: gcTested,
                    onClick: function() { setGcPick(g.key); },
                    className: 'min-h-11 px-3 rounded-lg border-2 text-sm font-bold ' + (on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100') + (gcTested ? ' opacity-80' : '')
                  }, (on ? '✓ ' : '') + g.label + ' (' + g.ring + ' × ' + g.cog + ')');
                })),
              h('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
                !gcTested && h('button', { type: 'button', 'data-gear-test': 'true', disabled: gcPick == null, onClick: testGearChallenge,
                  className: 'min-h-11 px-4 rounded-lg text-sm font-bold ' + (gcPick == null ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 text-white') },
                  gcPick == null ? 'Pick a gear first' : 'Test it'),
                gcTested && h('button', { type: 'button', 'data-gear-next': 'true', onClick: nextGearChallenge, className: 'min-h-11 px-4 rounded-lg text-sm font-bold bg-indigo-700 hover:bg-indigo-800 text-white' }, 'Next challenge')),
              h('div', { role: 'status', 'aria-live': 'polite', 'data-bikelab-gear-verdict': gcTested ? (gcPick === gcResult.answer ? 'right' : 'wrong') : 'waiting', className: 'mt-2 text-sm text-slate-800' },
                gcTested ? h('div', null,
                  h('p', { className: 'font-bold ' + (gcPick === gcResult.answer ? 'text-emerald-800' : 'text-rose-800') }, gcPick === gcResult.answer ? '✓ Your pick was the fastest gear.' : '✗ Not quite. Here is how each gear did.'),
                  h('ul', { className: 'mt-2 space-y-2' },
                    gcResult.gears.map(function(g) {
                      var isBest = g.key === gcResult.answer;
                      return h('li', { key: g.key, className: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
                        h('span', { className: 'w-40 text-sm ' + (isBest ? 'font-black text-emerald-800' : 'font-bold text-slate-700') }, (isBest ? '★ ' : '') + g.label),
                        h('span', { 'aria-hidden': 'true', className: 'flex-1 min-w-24 h-4 bg-slate-100 rounded overflow-hidden border border-slate-300' },
                          h('span', { className: 'block h-full ' + (isBest ? 'bg-emerald-600' : 'bg-slate-500'), style: { width: Math.round(100 * g.mph / gcTopMph) + '%' } })),
                        h('span', { className: 'text-sm font-mono text-slate-800' }, g.v > 0 ? g.mph.toFixed(1) + ' mph · ' + g.rpm + ' rpm · ' + g.feel : 'stalls · ' + g.feel),
                        h('button', { type: 'button', onClick: function() { showGearOnPicture(g); }, 'aria-label': 'Show the ' + g.label.toLowerCase() + ' on the drivetrain picture', className: 'px-2 rounded border border-slate-400 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100' }, 'Show it'));
                    })),
                  h('p', { className: 'mt-2' }, gearCh.why)) : null)),
            // Full gearing MATRIX — every chainring × cog at once, as gear inches (the classic
            // single-number gear size = ratio × wheel diameter). Reveals the bike's total range,
            // gaps and overlaps; the cadence curve below is just ONE cell of this. Click to select.
            (function() {
              var wheelIn = 2 * bike.wheelR * 39.3701;
              var giOf = function(ct, cg) { return (ct / cg) * wheelIn; };
              var allGi = [];
              bike.chainringT.forEach(function(ct) { bike.cassetteT.forEach(function(cg) { allGi.push(giOf(ct, cg)); }); });
              var giMin = Math.min.apply(null, allGi), giMax = Math.max.apply(null, allGi);
              var heat = function(gi) { var t = giMax > giMin ? (gi - giMin) / (giMax - giMin) : 0.5; return 'hsl(' + Math.round(140 - t * 140) + ', 72%, 87%)'; };
              return h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-1' }, t('stem.bikelab.gearing_matrix_gear_inches_every_ring_', 'Gearing Matrix — gear inches (every ring × cog)')),
                h('div', { className: 'text-xs text-slate-600 mb-3' }, t('stem.bikelab.lower_easier_climbing_higher_faster_to', 'Lower = easier (climbing); higher = faster (top speed). Green→red = easy→hard. Click any cell to select that gear.')),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'border-collapse text-xs' },
                    h('caption', { className: 'sr-only' }, 'Bike gearing matrix in gear inches. Choose a chainring and cog combination.'),
                    h('thead', null,
                      h('tr', null,
                        h('th', { scope: 'col', className: 'p-1 text-slate-500 font-mono text-right' }, t('stem.bikelab.ring_cog', 'ring \ cog')),
                        bike.cassetteT.map(function(cg, j) { return h('th', { key: j, scope: 'col', className: 'p-1 text-center font-mono font-bold ' + (j === cogIdx ? 'text-fuchsia-600' : 'text-slate-500') }, cg); })
                      )
                    ),
                    h('tbody', null,
                      bike.chainringT.map(function(ct, i) {
                        return h('tr', { key: i },
                          h('th', { scope: 'row', className: 'p-1 text-right font-mono font-bold ' + (i === ringIdx ? 'text-violet-600' : 'text-slate-500') }, ct + 'T'),
                          bike.cassetteT.map(function(cg, j) {
                            var gi = giOf(ct, cg), isCur = i === ringIdx && j === cogIdx;
                            return h('td', { key: j, className: 'p-0 text-center font-mono' },
                              h('button', {
                                type: 'button',
                                'aria-label': 'Select ' + ct + '-tooth chainring and ' + cg + '-tooth cog, ' + Math.round(gi) + ' gear inches',
                                'aria-pressed': isCur ? 'true' : 'false',
                                onClick: function() { setRingIdx(i); setCogIdx(j); },
                                className: 'w-full min-h-6 p-1 text-center font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-600 ' + (isCur ? 'ring-2 ring-violet-600 font-black text-slate-900' : 'text-slate-700 hover:opacity-80'),
                                style: { background: heat(gi) }
                              }, Math.round(gi))
                            );
                          })
                        );
                      })
                    )
                  )
                )
              );
            })(),
            // Cadence→speed curve
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, t('stem.bikelab.speed_vs_cadence_this_gear', 'Speed vs. Cadence (this gear)')),
              h('div', { className: 'flex items-end gap-2 h-32' },
                cadenceCurve.map(function(pt, i) {
                  var pct = pt.v / (cadenceCurve[cadenceCurve.length - 1].v + 1);
                  var isCurrent = Math.abs(pt.c - cadence) < 5;
                  return h('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end' },
                    h('div', { className: 'w-full rounded-t transition-all duration-300 ' + (isCurrent ? 'bg-violet-500' : 'bg-violet-200'),
                      'data-cadence-bar': pt.c, style: { height: Math.max(4, Math.round(pct * 84)) + 'px' } },
                      isCurrent && h('div', { className: 'text-xs font-bold text-white text-center pt-1' }, pt.v.toFixed(0))
                    ),
                    h('div', { className: 'text-xs text-slate-600 font-mono mt-1' }, pt.c),
                    h('div', { className: 'text-xs text-slate-400' }, pt.v.toFixed(0) + ' mph')
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-600 mt-2' }, t('stem.bikelab.x_axis_pedal_cadence_rpm_y_axis_bike_s', 'X axis: pedal cadence (RPM). Y axis: bike speed (mph). Linear in this gear — double the cadence, double the speed.'))
            ),
            // Climb simulator
            h('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-2' }, '⛰️ Hill Simulator'),
              h('div', { className: 'text-sm text-slate-700 mb-3' }, 'The rider makes the same power in every gear. What changes is how fast the legs must turn, and whether they can push hard enough. Choose a hill and a rider.'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
                [
                  { name: 'Hill', value: hill, set: setHill, attr: 'data-climb-hill', opts: [[-0.03, 'Downhill 3%'], [0, 'Flat'], [0.03, 'Gentle 3%'], [0.06, 'Steep 6%'], [0.1, 'Very steep 10%']] },
                  { name: 'Rider', value: riderW, set: setRiderW, attr: 'data-climb-rider', opts: [[75, 'Easy pace · 75 W'], [120, 'Steady · 120 W'], [200, 'Strong · 200 W']] }
                ].map(function(grp) {
                  return h('div', { key: grp.name, role: 'group', 'aria-label': grp.name },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, grp.name),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      grp.opts.map(function(o) {
                        var props = { key: String(o[0]), type: 'button', 'aria-pressed': grp.value === o[0] ? 'true' : 'false',
                          onClick: function() { grp.set(o[0]); },
                          className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (grp.value === o[0] ? 'border-amber-800 bg-amber-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500') };
                        props[grp.attr] = String(o[0]);
                        return h('button', props, o[1]);
                      })));
                })
              ),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                [
                  { label: 'Easiest gear', ratio: bikeGearRange(bike).lo, color: 'from-emerald-700 to-emerald-900' },
                  { label: 'This gear', ratio: ratio, color: 'from-violet-700 to-violet-900' },
                  { label: 'Hardest gear', ratio: bikeGearRange(bike).hi, color: 'from-rose-700 to-rose-900' }
                ].map(function(g, i) {
                  var climbV = climbSim(g.ratio);
                  var climbRpm = Math.round(cadenceRpmFor(climbV, bike.wheelR, g.ratio));
                  var feel = climbV <= 0 ? 'legs cannot turn the pedals' : climbRpm < 50 ? climbRpm + ' rpm · grinding' : climbRpm > 110 ? climbRpm + ' rpm · spinning out' : climbRpm + ' rpm · comfortable';
                  return h('div', { key: i, 'data-climb-card': g.label, className: 'bg-gradient-to-br ' + g.color + ' text-white rounded-lg p-4 shadow' },
                    h('div', { className: 'text-xs uppercase tracking-wider font-bold' }, g.label + ' (' + g.ratio.toFixed(2) + ' : 1)'),
                    h('div', { className: 'text-3xl font-black font-mono mt-1' }, climbV > 0 ? (climbV * 2.237).toFixed(1) : 'Stalls'),
                    h('div', { className: 'text-xs font-mono' }, climbV > 0 ? (hill > 0 ? 'mph up the hill' : hill < 0 ? 'mph down the hill' : 'mph on the flat') : 'cannot turn the pedals in this gear'),
                    h('div', { className: 'text-xs mt-1 font-bold' }, feel)
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-700 mt-3 leading-relaxed' },
                h('span', { className: 'font-bold' }, 'Why: '),
                'A gear does not add power. It trades leg speed for push. In an easy gear your legs spin fast and each push is light, so you can keep climbing. In a hard gear each pedal turn moves you far, but the hill pushes back harder than your legs can push, so you slow down or stall. On flat ground it flips: an easy gear spins out, and a harder gear lets you go faster. The best gear is the one that keeps your legs turning at a comfortable speed.'
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: REPAIR SIMULATOR
      // ─────────────────────────────────────────────────────
      function RepairSim() {
        var jobState = useState(d.repairJobId || null);
        var jobId = jobState[0], setJobId = jobState[1];
        var stepState = useState(0);
        var step = stepState[0], setStep = stepState[1];
        var placedToolsState = useState([]);
        var placedTools = placedToolsState[0], setPlacedTools = placedToolsState[1];
        var completedState = useState(d.repairCompleted || {});
        var completed = completedState[0], setCompleted = completedState[1];
        var draggedState = useState(null);
        var dragged = draggedState[0], setDragged = draggedState[1];

        var job = jobId ? REPAIR_JOBS.find(function(j) { return j.id === jobId; }) : null;

        var startJob = function(id) {
          setJobId(id); setStep(0); setPlacedTools([]);
          upd('repairJobId', id);
        };
        var wrongNoteState = useState(''), wrongNote = wrongNoteState[0], setWrongNote = wrongNoteState[1];
        var checkOpenState = useState(false), checkOpen = checkOpenState[0], setCheckOpen = checkOpenState[1];
        var checkPickState = useState(null), checkPick = checkPickState[0], setCheckPick = checkPickState[1];
        var missesRef = useRef(0);         // wrong tools or wrong check answers in this job
        var skippedRef = useRef(false);    // any step skipped in this job
        var advancingRef = useRef(false);  // a correct tool is already moving the job on
        var advanceTimerRef = useRef(null);
        useEffect(function() { return function() { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); }; }, []);
        var exitJob = function() {
          skippedRef.current = false; advancingRef.current = false; missesRef.current = 0;
          setWrongNote(''); setCheckOpen(false); setCheckPick(null);
          setJobId(null); setStep(0); setPlacedTools([]);
          upd('repairJobId', null);
        };
        var nextStep = function() {
          if (!job) return;
          if (step >= job.steps.length - 1) {
            if (skippedRef.current) {
              addToast(job.name + ': practice run. Do every step with the right tool, without skipping, to complete the job.', 'info');
            } else if (JOB_CHECKS[job.id] && !checkOpen) {
              setCheckOpen(true); setCheckPick(null); setWrongNote('');
              return;
            } else {
              var firstTime = !completed[job.id];
              var updated = Object.assign({}, completed);
              updated[job.id] = true;
              setCompleted(updated); upd('repairCompleted', updated);
              addToast('✓ ' + job.name + ' complete!' + (missesRef.current === 0 ? ' Every choice right first time.' : '') + (firstTime ? ' +5 XP' : ''), 'success');
              if (firstTime && ctx.awardXP) ctx.awardXP('bikeLab', 5, job.name + ' repair');
            }
            exitJob();
          } else {
            setStep(step + 1); setPlacedTools([]); setWrongNote('');
          }
        };
        var prevStep = function() { if (step > 0) { setStep(step - 1); setPlacedTools([]); setWrongNote(''); } };

        var handleDrop = function(toolId) {
          if (!job) return;
          var s = job.steps[step];
          if (s.tool === toolId) {
            if (advancingRef.current) return;
            advancingRef.current = true;
            setPlacedTools([toolId]); setWrongNote('');
            advanceTimerRef.current = setTimeout(function() { advanceTimerRef.current = null; advancingRef.current = false; nextStep(); }, 350);
          } else {
            missesRef.current += 1;
            setWrongNote('Not that one. ' + (TOOL_PURPOSE[toolId] || '') + ' Read the step again: what does it need?');
            setPlacedTools([]);
          }
        };

        if (!job) {
          // Job selection grid
          return h('div', { className: 'flex flex-col h-full bg-slate-50' },
            BackBar({ icon: '🔧', title: t('stem.bikelab.repair_simulator_2', 'Repair Simulator') }),
            h('div', { className: 'p-6 max-w-5xl mx-auto w-full' },
              h('p', { className: 'text-slate-600 mb-6 text-center' }, t('stem.bikelab.pick_a_procedure_each_has_step_by_step', 'Pick a procedure. Each has step-by-step instructions and tool verification — drag the right tool to the job to advance.')),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                REPAIR_JOBS.map(function(j) {
                  var isDone = completed[j.id];
                  return h('button', {
                    key: j.id,
                    onClick: function() { startJob(j.id); },
                    className: 'text-left bg-white rounded-xl shadow hover:shadow-lg border-2 transition-all overflow-hidden ' + (isDone ? 'border-emerald-400' : 'border-slate-200 hover:border-slate-400')
                  },
                    h('div', { className: 'p-5' },
                      h('div', { className: 'flex items-start justify-between mb-2' },
                        h('div', { className: 'flex items-center gap-3' },
                          h('span', { className: 'text-4xl' }, j.icon),
                          h('div', null,
                            h('h3', { className: 'text-lg font-black text-slate-800' }, j.name),
                            h('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
                              h('span', null, j.difficulty),
                              h('span', null, '·'),
                              h('span', null, '⏱ ' + j.minutes + ' min'),
                              h('span', null, '·'),
                              h('span', null, j.steps.length + ' steps')
                            )
                          )
                        ),
                        isDone && h('span', { className: 'bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold' }, t('stem.bikelab.done', '✓ Done'))
                      ),
                      h('p', { className: 'text-sm text-slate-600 mt-2' }, __alloT('stem.bikelab.' + (j.id) + '_description', j.description))
                    )
                  );
                })
              )
            )
          );
        }

        // In-progress job view
        if (checkOpen && JOB_CHECKS[job.id]) {
          var chk = JOB_CHECKS[job.id];
          var rot = job.id.length % chk.options.length;   // fixed per job, so the right answer is not always first
          var shown = chk.options.map(function(text, i) { return { text: text, right: i === 0 }; });
          shown = shown.slice(rot).concat(shown.slice(0, rot));
          var picked = checkPick == null ? null : shown[checkPick];
          return h('div', { className: 'flex flex-col h-full bg-slate-50' },
            BackBar({ icon: '🔧', title: job.name }),
            h('div', { className: 'p-4 max-w-2xl mx-auto w-full space-y-4' },
              h('section', { 'data-bikelab-repair-check': job.id, 'aria-labelledby': 'bikelab-repair-check-q', className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800' }, 'Last step: one question'),
                h('h3', { id: 'bikelab-repair-check-q', className: 'text-lg font-black text-slate-800 mt-1' }, chk.q),
                h('div', { role: 'group', 'aria-label': 'Answers', className: 'mt-3 space-y-2' },
                  shown.map(function(opt, i) {
                    var on = checkPick === i;
                    return h('button', { key: i, type: 'button', 'aria-pressed': on, disabled: !!(picked && picked.right),
                      onClick: function() { if (!opt.right) missesRef.current += 1; setCheckPick(i); },
                      className: 'w-full min-h-11 text-left px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (on ? (opt.right ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-rose-700 bg-rose-50 text-rose-900') : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100')
                    }, (on ? (opt.right ? '✓ ' : '✗ ') : '') + opt.text);
                  })),
                h('div', { role: 'status', 'aria-live': 'polite', 'data-bikelab-repair-check-verdict': 'true', className: 'mt-3 text-sm text-slate-800 min-h-[1.5rem]' },
                  picked ? (picked.right ? chk.why : 'Not quite. Think about what could go wrong, then pick again.') : ''),
                h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                  picked && picked.right && h('button', { type: 'button', onClick: nextStep, className: 'min-h-11 px-4 rounded-lg text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white' }, 'Finish job ✓'),
                  h('button', { type: 'button', onClick: function() { setCheckOpen(false); setCheckPick(null); }, className: 'min-h-11 px-4 rounded-lg text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-800' }, '← Back to the steps')))));
        }
        var currStep = job.steps[step];
        var progressPct = ((step + 1) / job.steps.length) * 100;
        // Build a small toolbox of distractor tools alongside the correct one
        var allTools = Object.keys(TOOL_ICONS);
        // Pick the correct tool + 4 random distractors (stable order by step)
        var seed = (job.id + step).split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0);
        var distractors = allTools.filter(function(t) { return t !== currStep.tool; });
        for (var i = distractors.length - 1; i > 0; i--) {
          var jj = Math.abs((seed * (i + 1)) * 9301 + 49297) % (i + 1);
          var tmp = distractors[i]; distractors[i] = distractors[jj]; distractors[jj] = tmp;
        }
        var toolbox = [currStep.tool].concat(distractors.slice(0, 4));
        // Re-shuffle so the correct tool isn't always first
        for (var k = toolbox.length - 1; k > 0; k--) {
          var jk = Math.abs((seed * (k + 2)) * 9301 + 49297) % (k + 1);
          var tmp2 = toolbox[k]; toolbox[k] = toolbox[jk]; toolbox[jk] = tmp2;
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🔧', title: t('stem.bikelab.repair_simulator_3', 'Repair Simulator') }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-4' },
            // Job header + progress
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-3xl' }, job.icon),
                  h('div', null,
                    h('h2', { className: 'text-xl font-black text-slate-800' }, job.name),
                    h('div', { className: 'text-xs text-slate-600' }, 'Step ' + (step + 1) + ' of ' + job.steps.length)
                  )
                ),
                h('button', {
                  onClick: exitJob,
                  className: 'text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold'
                }, t('stem.bikelab.exit_job', 'Exit Job'))
              ),
              h('div', { className: 'w-full h-2 bg-slate-100 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500',
                  style: { width: progressPct + '%' } })
              )
            ),
            // Current step instruction
            h('div', { className: 'bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl shadow-lg text-white p-6' },
              h('div', { className: 'flex items-start justify-between gap-3 mb-1' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80' }, t('stem.bikelab.current_step', 'Current Step')),
                callTTS && h('button', {
                  onClick: function() { speak(currStep.label + '. ' + currStep.instruction); },
                  className: 'bg-white/15 hover:bg-white/25 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
                  title: t('stem.bikelab.read_this_step_aloud', 'Read this step aloud')
                }, h('span', null, '🔊'), h('span', null, t('stem.bikelab.read_aloud', 'Read Aloud')))
              ),
              h('h3', { className: 'text-2xl font-black mb-3' }, currStep.label),
              h('p', { className: 'text-sm leading-relaxed opacity-95' }, currStep.instruction),
              h('div', { role: 'status', 'aria-live': 'polite', 'data-bikelab-repair-feedback': 'true', className: 'mt-4 pt-3 border-t border-white/20 text-sm font-bold min-h-[2.5rem]' },
                wrongNote || 'Which tool does this step need? Pick it from the toolbox.')
            ),
            // Toolbox — drag source
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, t('stem.bikelab.toolbox_drag_the_right_tool_to_the_job', 'Toolbox (drag the right tool to the job)')),
              h('div', { className: 'flex flex-wrap gap-3' },
                toolbox.map(function(t, i) {
                  return h('div', {
                    key: i,
                    draggable: true,
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': 'Use ' + t.replace(/-/g, ' ') + ' tool',
                    onDragStart: function() { setDragged(t); },
                    onDragEnd: function() { setDragged(null); },
                    onClick: function() { handleDrop(t); },
                    onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDrop(t); } },
                    className: 'w-20 h-20 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-600 ' + (dragged === t ? 'opacity-40 scale-95' : '')
                  },
                    h('span', { className: 'text-3xl' }, TOOL_ICONS[t] || '🔧'),
                    h('span', { className: 'text-xs font-bold text-slate-600 capitalize' }, t.replace(/-/g, ' '))
                  );
                })
              ),
              h('div', { className: 'text-xs text-slate-600 mt-3' }, t('stem.bikelab.tip_click_or_drag_if_your_choice_match', 'Tip: click or drag. If your choice matches the step, the job advances. Wrong choice = no penalty, try again.'))
            ),
            // Drop zone / job area
            h('div', {
              onDragOver: function(e) { e.preventDefault(); },
              onDrop: function(e) { e.preventDefault(); if (dragged) handleDrop(dragged); },
              className: 'rounded-xl border-4 border-dashed p-8 text-center transition-colors ' + (placedTools.length > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50')
            },
              placedTools.length > 0
                ? h('div', null,
                    h('div', { className: 'text-5xl mb-2' }, '✨'),
                    h('div', { className: 'text-lg font-black text-emerald-700' }, 'Correct!'),
                    h('div', { className: 'text-sm text-emerald-600 mt-1' }, t('stem.bikelab.advancing_to_next_step', 'Advancing to next step…')))
                : h('div', null,
                    h('div', { className: 'text-5xl mb-2 opacity-40', 'aria-hidden': 'true' }, '🧰'),
                    h('div', { className: 'text-sm text-slate-600' }, t('stem.bikelab.drop_the_correct_tool_here', 'Drop the correct tool here')))
            ),
            // Step controls
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                onClick: prevStep,
                disabled: step === 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (step === 0 ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, t('stem.bikelab.previous_step', '← Previous Step')),
              h('div', { className: 'flex-1 text-center text-sm text-slate-600' },
                'Step ' + (step + 1) + ' / ' + job.steps.length),
              h('button', {
                onClick: function() { if (advancingRef.current) return; skippedRef.current = true; nextStep(); },
                className: 'px-4 py-2 rounded-lg font-bold text-sm bg-amber-700 hover:bg-amber-800 text-white'
              }, step === job.steps.length - 1 ? 'Skip and end practice' : 'Skip Step →')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BIKE FIT CALCULATOR
      // ─────────────────────────────────────────────────────
      // LeMond method: saddle height = inseam × 0.883 (measured BB center to
      // top of saddle along the seat tube). Reach and drop scale with rider
      // height and bike type / flexibility.
      // Bike fit numbers plus a side-view rider, all in centimeters. Origin = the center of the cranks, x forward, y up.
      // The rider's leg is two equal links from the hip joint to the ankle; every body length scales with inseam, so the
      // suggested saddle height (0.883 x inseam) gives the same slight knee bend for a small child and a tall adult.
      function bikeFitModel(heightCm, inseamCm, bikeType, flexibility, offsetCm) {
        var off = offsetCm || 0;
        var saddleHeight = inseamCm * 0.883;
        var setback = bikeType === 'road' ? 4 : bikeType === 'mtb' ? 1 : 2;
        var reachCm = heightCm * (bikeType === 'road' ? 0.234 : bikeType === 'mtb' ? 0.221 : 0.215);
        var drop = bikeType === 'road' ? (flexibility === 'high' ? 10 : flexibility === 'medium' ? 6 : 3) : bikeType === 'mtb' ? 2 : 0;
        var size = heightCm < 115 ? { label: '16-inch wheels', r: 20 }
          : heightCm < 130 ? { label: '20-inch wheels', r: 25 }
          : heightCm < 145 ? { label: '24-inch wheels', r: 30 }
          : heightCm < 158 ? { label: '26-inch wheels or an extra-small adult frame', r: 33 }
          : { label: 'Adult bike (700c, 27.5-inch or 29-inch wheels)', r: 34 };
        var standover = inseamCm - (bikeType === 'mtb' ? 5 : 3);
        var crank = inseamCm * 0.218, sa = 73 * Math.PI / 180;
        var at = function(len) { return { x: -len * Math.cos(sa), y: len * Math.sin(sa) }; };
        var saddle = at(saddleHeight + off), saddleRec = at(saddleHeight);
        var hip = { x: saddle.x + inseamCm * 0.026, y: saddle.y + inseamCm * 0.12 };
        // As the saddle rises the rider points the toes, which lifts the ankle and takes up over half the change (up to a limit).
        // Going lower, the heel can only drop a little.
        var ankleLift = inseamCm * 0.19 + (off > 0 ? Math.min(inseamCm * 0.05, off * 0.6) : off * 0.25);
        var pedal = { x: 0, y: -crank }, ankle = { x: pedal.x - inseamCm * 0.05, y: pedal.y + ankleLift };
        var link = inseamCm * 0.5155;
        var dist = Math.sqrt(Math.pow(hip.x - ankle.x, 2) + Math.pow(hip.y - ankle.y, 2));
        var reachable = dist <= 2 * link;
        var kneeBend = reachable ? 2 * Math.acos(dist / (2 * link)) * 180 / Math.PI : 0;
        var verdict = !reachable ? 'unreachable' : kneeBend < 17 ? 'high' : kneeBend <= 37 ? 'ok' : 'low';
        var bar = { x: reachCm, y: saddleRec.y - drop };
        return { saddleHeight: saddleHeight, setback: setback, reachCm: reachCm, drop: drop, size: size, standover: standover, crank: crank,
          saddle: saddle, saddleRec: saddleRec, hip: hip, pedal: pedal, ankle: ankle, link: link, reachable: reachable, kneeBend: kneeBend, verdict: verdict, bar: bar };
      }
      // The joint between two equal links, bent toward the front of the bike.
      function fitJoint(a, b, link, bendForward) {
        var dx = b.x - a.x, dy = b.y - a.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
        var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (dd >= 2 * link) return mid;
        var rise = Math.sqrt(link * link - dd * dd / 4), nx = -dy / dd, ny = dx / dd;
        if ((nx > 0) !== !!bendForward) { nx = -nx; ny = -ny; }
        return { x: mid.x + nx * rise, y: mid.y + ny * rise };
      }

      function BikeFit() {
        var heightState = useState(d.fitHeightCm || 170);
        var heightCm = heightState[0], setHeightCm = heightState[1];
        var inseamState = useState(d.fitInseamCm || 78);
        var inseamCm = inseamState[0], setInseamCm = inseamState[1];
        var bikeTypeState = useState(d.fitBikeType || 'road');
        var bikeType = bikeTypeState[0], setBikeType = bikeTypeState[1];
        var flexibilityState = useState(d.fitFlexibility || 'medium');
        var flexibility = flexibilityState[0], setFlexibility = flexibilityState[1];
        var offsetState = useState(0);
        var saddleOffset = offsetState[0], setSaddleOffset = offsetState[1];

        var M = bikeFitModel(heightCm, inseamCm, bikeType, flexibility, saddleOffset);
        var saddleHeight = M.saddleHeight, setback = M.setback, reachCm = M.reachCm, drop = M.drop;
        var kneeDeg = Math.round(M.kneeBend);
        var verdictText = M.verdict === 'unreachable' ? '✗ Much too high: the foot cannot reach the pedal at the bottom of the stroke.'
          : M.verdict === 'high' ? '⚠ Too high: the leg is almost straight (knee bend about ' + kneeDeg + '°). The hips rock from side to side to reach.'
          : M.verdict === 'low' ? '⚠ Too low: the knee stays bent (about ' + kneeDeg + '°). The legs tire quickly and the knees can get sore.'
          : '✓ About right: the knee is slightly bent (about ' + kneeDeg + '°) at the bottom of the pedal stroke.';
        var verdictTone = M.verdict === 'ok' ? 'bg-emerald-50 border-emerald-400 text-emerald-900' : M.verdict === 'unreachable' ? 'bg-rose-50 border-rose-400 text-rose-900' : 'bg-amber-50 border-amber-400 text-amber-900';
        var offsetText = saddleOffset === 0 ? 'At the suggested height' : Math.abs(saddleOffset) + ' cm ' + (saddleOffset > 0 ? 'above' : 'below') + ' the suggested height';

        // ── the picture
        var fitPicture = (function() {
          var r = M.size.r, axleY = r * 0.2, groundY = axleY - r;
          var rearX = -(r + 9), frontX = Math.max(M.bar.x + 14, r * 1.75);
          var torso = heightCm * 0.29, arm = heightCm * 0.33;
          // shoulder: where the torso (from the hip) and the arm (from the bar) meet
          var bx = M.bar.x - M.hip.x, by = M.bar.y - M.hip.y, bd = Math.sqrt(bx * bx + by * by) || 1;
          var shoulder;
          if (bd >= torso + arm) shoulder = { x: M.hip.x + bx / bd * torso, y: M.hip.y + by / bd * torso };
          else if (bd <= Math.abs(torso - arm)) shoulder = { x: M.hip.x + torso * 0.5, y: M.hip.y + torso * 0.866 };
          else {
            var along = (torso * torso - arm * arm + bd * bd) / (2 * bd), up = Math.sqrt(Math.max(0, torso * torso - along * along));
            var px = -by / bd, py = bx / bd; if (py < 0) { px = -px; py = -py; }
            shoulder = { x: M.hip.x + bx / bd * along + px * up, y: M.hip.y + by / bd * along + py * up };
          }
          var tx = (shoulder.x - M.hip.x) / torso, ty = (shoulder.y - M.hip.y) / torso;
          var headR = heightCm * 0.065;
          var head = { x: shoulder.x + tx * headR * 1.5 + headR * 0.35, y: shoulder.y + ty * headR * 1.5 + headR * 0.5 };
          var elbow = fitJoint(shoulder, M.bar, arm / 2 * 1.04, false);
          var knee = fitJoint(M.hip, M.ankle, M.link, true);
          var farPedal = { x: 0, y: M.crank }, farAnkle = { x: farPedal.x - inseamCm * 0.03, y: farPedal.y + inseamCm * 0.17 };
          var farKnee = fitJoint(M.hip, farAnkle, M.link, true);
          var topY = head.y + headR + 3;
          var k = Math.min(214 / (topY - groundY), 380 / ((frontX + r) - (rearX - r)));
          var ox = 210 - ((frontX + r) + (rearX - r)) / 2 * k;
          var X = function(p) { return +(ox + p.x * k).toFixed(1); }, Y = function(p) { return +(246 - (p.y - groundY) * k).toFixed(1); };
          var ln = function(a, b, stroke, w, extra) { return h('line', Object.assign({ x1: X(a), y1: Y(a), x2: X(b), y2: Y(b), stroke: stroke, strokeWidth: w, strokeLinecap: 'round' }, extra || {})); };
          var rear = { x: rearX, y: axleY }, front = { x: frontX, y: axleY }, bb = { x: 0, y: 0 };
          var cluster = { x: M.saddleRec.x * 0.8, y: M.saddleRec.y * 0.8 };
          var headTop = { x: M.bar.x + 4, y: M.bar.y - 5 };
          var headLow = { x: headTop.x + (front.x - headTop.x) * 0.28, y: headTop.y + (front.y - headTop.y) * 0.28 };
          var limb = Math.max(4, k * heightCm * 0.03);
          var wheel = function(c, key) {
            return h('g', { key: key },
              h('circle', { cx: X(c), cy: Y(c), r: r * k, fill: 'none', stroke: '#0f172a', strokeWidth: Math.max(4, k * 3.2) }),
              h('circle', { cx: X(c), cy: Y(c), r: r * k * 0.8, fill: 'none', stroke: '#bae6fd', strokeWidth: 1.5 }),
              h('circle', { cx: X(c), cy: Y(c), r: 4, fill: '#e0f2fe' }));
          };
          var kneeColor = M.verdict === 'ok' ? '#86efac' : M.verdict === 'unreachable' ? '#fda4af' : '#fde047';
          return h('svg', { role: 'img', 'aria-label': 'Bike fit diagram showing saddle height ' + (saddleHeight + saddleOffset).toFixed(1) + ' centimeters, reach ' + reachCm.toFixed(1) + ' centimeters, saddle setback ' + setback + ' centimeters, and handlebar drop ' + drop + ' centimeters. A rider sits on the bike with one foot at the bottom of the pedal stroke. ' + verdictText, viewBox: '0 0 420 260', className: 'w-full h-auto', 'data-fit-verdict': M.verdict },
            h('line', { x1: 14, y1: 247, x2: 406, y2: 247, stroke: '#bae6fd', strokeWidth: 2, strokeLinecap: 'round' }),
            wheel(rear, 'rw'), wheel(front, 'fw'),
            // frame
            ln(bb, rear, '#e0f2fe', 4), ln(rear, cluster, '#e0f2fe', 3), ln(bb, cluster, '#ffffff', 5), ln(cluster, headLow, '#ffffff', 5), ln(bb, headLow, '#ffffff', 5),
            ln(front, headTop, '#e0f2fe', 4), ln(headTop, M.bar, '#f472b6', 4),
            h('circle', { cx: X(M.bar), cy: Y(M.bar), r: 5, fill: '#f472b6' }),
            // seat post and saddle (the part the slider moves)
            ln(cluster, M.saddle, '#fde047', 3),
            h('line', { x1: X(M.saddle) - 13, y1: Y(M.saddle), x2: X(M.saddle) + 15, y2: Y(M.saddle), stroke: '#fde047', strokeWidth: 6, strokeLinecap: 'round' }),
            saddleOffset !== 0 && h('line', { x1: X(M.saddleRec) - 22, y1: Y(M.saddleRec), x2: X(M.saddleRec) + 24, y2: Y(M.saddleRec), stroke: '#fde047', strokeWidth: 1.5, strokeDasharray: '4 3' }),
            // cranks and pedals
            ln(bb, M.pedal, '#cbd5e1', 4), ln(bb, farPedal, '#94a3b8', 4),
            h('rect', { x: X(M.pedal) - 9, y: Y(M.pedal) - 2.5, width: 18, height: 5, rx: 2, fill: '#0f172a' }),
            h('circle', { cx: X(bb), cy: Y(bb), r: 5, fill: '#ffffff' }),
            // rider: far leg first, then body, then the near leg
            h('g', { opacity: 0.45 }, ln(M.hip, farKnee, '#1e3a8a', limb), ln(farKnee, farAnkle, '#1e3a8a', limb)),
            ln(M.hip, shoulder, '#f97316', limb * 1.5),
            ln(shoulder, elbow, '#fdba74', limb * 0.8), ln(elbow, M.bar, '#fdba74', limb * 0.8),
            h('circle', { cx: X(head), cy: Y(head), r: headR * k, fill: '#fed7aa', stroke: '#9a6c4a', strokeWidth: 1 }),
            h('path', { d: 'M ' + (X(head) - headR * k * 1.08) + ' ' + (Y(head) + headR * k * 0.1) + ' A ' + (headR * k * 1.1) + ' ' + (headR * k * 1.15) + ' 0 0 1 ' + (X(head) + headR * k * 1.12) + ' ' + (Y(head) - headR * k * 0.25) + ' Z', fill: '#ec4899', stroke: '#831843', strokeWidth: 1 }),
            ln(M.hip, knee, '#1d4ed8', limb * 1.15), ln(knee, M.ankle, '#1d4ed8', limb),
            h('line', { x1: X(M.ankle), y1: Y(M.ankle), x2: X(M.pedal) + 7, y2: Y(M.pedal) - 4, stroke: '#0f172a', strokeWidth: limb * 0.8, strokeLinecap: 'round' }),
            h('circle', { cx: X(knee), cy: Y(knee), r: limb * 0.85, fill: kneeColor, stroke: '#0f172a', strokeWidth: 1.5 }),
            h('text', { x: Math.min(330, X(knee) + limb + 6), y: Y(knee) + 4, fill: kneeColor, fontSize: 12, fontWeight: 'bold', stroke: '#0c4a6e', strokeWidth: 3.5, paintOrder: 'stroke', strokeLinejoin: 'round' }, M.reachable ? 'knee bend ' + kneeDeg + '°' : 'cannot reach'),
            h('text', { x: 10, y: 16, fill: '#fde047', fontSize: 11, fontWeight: 'bold' }, '● Saddle ' + (saddleHeight + saddleOffset).toFixed(1) + ' cm'),
            h('text', { x: 10, y: 31, fill: '#f9a8d4', fontSize: 11, fontWeight: 'bold' }, '● Handlebar, reach ' + reachCm.toFixed(1) + ' cm')
          );
        })();

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '📏', title: t('stem.bikelab.bike_fit_calculator_2', 'Bike Fit Calculator') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full' },
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-5 gap-4' },
              h('div', { className: 'lg:col-span-2 space-y-3' },
                h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, t('stem.bikelab.rider_measurements', 'Rider Measurements')),
                  h('label', { htmlFor: 'bikelab-fit-height', className: 'text-sm font-bold text-slate-700 flex justify-between' },
                    h('span', null, t('stem.bikelab.height', 'Height')), h('span', { className: 'text-sky-700' }, heightCm + ' cm · ' + Math.floor(heightCm / 2.54 / 12) + ' ft ' + Math.round(heightCm / 2.54 % 12) + ' in')),
                  h('input', { id: 'bikelab-fit-height', type: 'range', min: 105, max: 210, value: heightCm,
                    onChange: function(e) { var v = parseInt(e.target.value); setHeightCm(v); upd('fitHeightCm', v); },
                    className: 'w-full mt-1 accent-sky-500' }),
                  h('label', { htmlFor: 'bikelab-fit-inseam', className: 'text-sm font-bold text-slate-700 flex justify-between mt-3' },
                    h('span', null, 'Inside leg (inseam)'), h('span', { className: 'text-emerald-700' }, inseamCm + ' cm · ' + (inseamCm / 2.54).toFixed(1) + '″')),
                  h('input', { id: 'bikelab-fit-inseam', type: 'range', min: 45, max: 100, value: inseamCm,
                    onChange: function(e) { var v = parseInt(e.target.value); setInseamCm(v); upd('fitInseamCm', v); },
                    className: 'w-full mt-1 accent-emerald-500' }),
                  h('div', { className: 'text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2 rounded' },
                    h('strong', null, t('stem.bikelab.how_to_measure_inseam', 'How to measure inseam: ')),
                    t('stem.bikelab.stand_barefoot_against_a_wall_place_a_', 'Stand barefoot against a wall. Place a hardcover book snug between your legs. Measure from floor to the top spine of the book.')),
                  h('div', { className: 'mt-4 pt-3 border-t border-slate-200' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.bike_type', 'Bike Type')),
                    h('div', { className: 'grid grid-cols-3 gap-2' },
                      [['road', '🏁 Road'], ['hybrid', '🚴 Hybrid'], ['mtb', '⛰️ MTB']].map(function(opt) {
                        return h('button', {
                          key: opt[0], 'aria-pressed': bikeType === opt[0] ? 'true' : 'false',
                          onClick: function() { setBikeType(opt[0]); upd('fitBikeType', opt[0]); },
                          className: 'py-2 rounded-lg border-2 font-bold text-sm transition-colors ' + (bikeType === opt[0] ? 'border-indigo-700 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                        }, opt[1]);
                      })
                    )
                  ),
                  h('div', { className: 'mt-3' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, 'Riding style'),
                    h('div', { className: 'grid grid-cols-3 gap-2' },
                      [['low', 'Relaxed'], ['medium', 'Regular'], ['high', 'Racing']].map(function(opt) {
                        return h('button', {
                          key: opt[0], 'aria-pressed': flexibility === opt[0] ? 'true' : 'false',
                          onClick: function() { setFlexibility(opt[0]); upd('fitFlexibility', opt[0]); },
                          className: 'py-2 rounded-lg border-2 font-bold text-xs transition-colors ' + (flexibility === opt[0] ? 'border-fuchsia-800 bg-fuchsia-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                        }, opt[1]);
                      })
                    ),
                    h('div', { className: 'text-xs text-slate-600 mt-2' }, 'On a road bike, a racing style puts the handlebar lower than the saddle. A relaxed style keeps it higher.')
                  )
                ),
                h('div', { className: 'bg-sky-50 border border-sky-300 rounded-xl p-4 text-sm text-slate-700 leading-relaxed' },
                  h('strong', { className: 'text-sky-900' }, 'New to riding? '),
                  'Start with the saddle low enough that the balls of both feet touch the ground. Raise it toward the suggested height as you get more confident.')
              ),
              h('div', { className: 'lg:col-span-3 space-y-3' },
                h('div', { 'data-fit-picture-card': 'true', className: 'rounded-xl shadow-lg text-white p-5', style: { background: 'linear-gradient(135deg, #075985, #1d4ed8)' } },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-90 mb-2' }, t('stem.bikelab.your_fit', 'Your Fit')),
                  fitPicture,
                  h('label', { htmlFor: 'bikelab-fit-saddle-offset', className: 'text-sm font-bold flex flex-wrap justify-between gap-x-3 mt-3' },
                    h('span', null, 'Try it: move the saddle'), h('span', { className: 'text-yellow-200' }, offsetText)),
                  h('input', { id: 'bikelab-fit-saddle-offset', type: 'range', min: -8, max: 8, step: 1, value: saddleOffset,
                    onChange: function(e) { var v = parseInt(e.target.value); setSaddleOffset(isFinite(v) ? v : 0); },
                    'aria-valuetext': offsetText + '. ' + verdictText,
                    className: 'w-full mt-1 accent-yellow-300' }),
                  h('div', { 'aria-hidden': 'true', className: 'flex justify-between text-xs opacity-90' }, h('span', null, 'Lower'), h('span', null, 'Higher')),
                  h('div', { 'aria-live': 'polite', className: 'mt-3 p-3 rounded-lg border-2 text-sm font-bold ' + verdictTone }, verdictText)
                ),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  [
                    { label: 'Bike size', main: M.size.label, sub: 'A usual match for a rider ' + heightCm + ' cm tall', formula: 'Sit on the bike to be sure', color: 'from-rose-600 to-pink-700', small: true },
                    { label: 'Standover check', main: M.standover + ' cm', sub: 'The top bar of the frame should be no higher than this', formula: 'inseam − ' + (bikeType === 'mtb' ? '5' : '3') + ' cm', color: 'from-slate-600 to-slate-800' },
                    { label: t('stem.bikelab.saddle_height', 'Saddle Height'), main: saddleHeight.toFixed(1) + ' cm', sub: '(center of the cranks → top of the saddle)', formula: 'LeMond: inseam × 0.883', color: 'from-emerald-600 to-teal-700' },
                    { label: t('stem.bikelab.saddle_setback', 'Saddle Setback'), main: setback + ' cm', sub: '(saddle nose behind the cranks)', formula: bikeType === 'road' ? 'Road: 4 cm' : bikeType === 'mtb' ? 'MTB: 1 cm' : 'Hybrid: 2 cm', color: 'from-violet-600 to-purple-700' },
                    { label: t('stem.bikelab.reach_horizontal', 'Reach (horizontal)'), main: reachCm.toFixed(1) + ' cm', sub: '(cranks → handlebar)', formula: 'height × ' + (bikeType === 'road' ? '0.234' : bikeType === 'mtb' ? '0.221' : '0.215'), color: 'from-sky-600 to-blue-700' },
                    { label: t('stem.bikelab.bar_drop', 'Bar Drop'), main: drop + ' cm', sub: '(handlebar below the saddle)', formula: bikeType === 'road' ? 'Changes with riding style' : bikeType === 'mtb' ? 'MTB: slightly below' : 'Hybrid: level', color: 'from-amber-700 to-orange-700' }
                  ].map(function(r, i) {
                    return h('div', { key: i, 'data-fit-card': r.label, className: 'bg-gradient-to-br ' + r.color + ' text-white rounded-xl p-4 shadow' },
                      h('div', { className: 'text-xs uppercase tracking-wider font-bold' }, r.label),
                      h('div', { className: (r.small ? 'text-base leading-snug' : 'text-2xl font-mono') + ' font-black mt-1' }, r.main),
                      h('div', { className: 'text-xs' }, r.sub),
                      h('div', { className: 'text-xs font-mono mt-1 border-t border-white/30 pt-1' }, r.formula)
                    );
                  })
                ),
                h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed' },
                  h('strong', { className: 'text-amber-800' }, t('stem.bikelab.the_science', '📚 The science: ')),
                  'Saddle height sets how far your knee straightens at the bottom of each pedal stroke. Too low and the knee stays bent, so the thigh muscles do extra work. Too high and the leg locks out, so the hips rock to reach. A well-known rule of thumb from racer Greg LeMond is 0.883 × inseam, measured from the center of the cranks to the top of the saddle. It leaves the knee slightly bent, about 25° to 35°. The reach, setback and bar-drop numbers here are starting points, not rules. Comfort decides.')
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BRAKING PHYSICS
      // ─────────────────────────────────────────────────────
      function BrakingPhysics() {
        var speedState = useState(isFinite(parseFloat(d.brakingMph)) ? parseFloat(d.brakingMph) : 20);
        var speedMph = speedState[0], setSpeedMph = speedState[1];
        var surfState = useState(d.brakingSurface || 'dry');
        var surf = surfState[0], setSurf = surfState[1];
        var brakeState = useState(d.brakingSplit || 'both');
        var brakeSplit = brakeState[0], setBrakeSplit = brakeState[1];
        var reactionState = useState(isFinite(parseFloat(d.brakingReactionSec)) ? parseFloat(d.brakingReactionSec) : 1.0);
        var reaction = reactionState[0], setReaction = reactionState[1];

        var SURFACES = {
          dry:    { label: t('stem.bikelab.dry_pavement', 'Dry Pavement'), mu: BRAKE_MU.dry },
          wet:    { label: t('stem.bikelab.wet_pavement', 'Wet Pavement'), mu: BRAKE_MU.wet },
          gravel: { label: t('stem.bikelab.loose_gravel', 'Loose Gravel'), mu: BRAKE_MU.gravel },
          ice:    { label: 'Ice',          mu: BRAKE_MU.ice }
        };
        // ★ `d.brakingSurface || 'dry'` accepts any truthy string, so a project
        // file carrying a surface this tool does not know made SURFACES[surf]
        // undefined and `.mu` threw. Fall back to the default surface rather
        // than crashing — one tool's throw blanks the whole lab.
        var stop = brakingStop(speedMph, SURFACES[surf] ? surf : 'dry', brakeSplit, reaction);
        var mu = stop.mu, endoA = stop.endoA, frictionA = stop.frictionA, achieved = stop.achieved;
        var speedMs = stop.speedMs, brakingDist = stop.braking, reactionDist = stop.reaction, totalDist = stop.total;
        var timeToStop = stop.time; // reaction time counts: the total distance includes it

        // Predict-then-test challenges
        var chIdxState = useState(0), chIdx = chIdxState[0], setChIdx = chIdxState[1];
        var chPickState = useState(null), chPick = chPickState[0], setChPick = chPickState[1];
        var chTestedState = useState(false), chTested = chTestedState[0], setChTested = chTestedState[1];
        var challenge = BRAKE_CHALLENGES[chIdx % BRAKE_CHALLENGES.length];
        var chResult = brakeChallengeResult(challenge);
        var chSolved = (d.brakingChallenges && typeof d.brakingChallenges === 'object') ? d.brakingChallenges : {};
        var applySetup = function(cfg) {
          setSpeedMph(cfg.mph); upd('brakingMph', cfg.mph);
          setSurf(cfg.surf); upd('brakingSurface', cfg.surf);
          setBrakeSplit(cfg.split); upd('brakingSplit', cfg.split);
          setReaction(cfg.react); upd('brakingReactionSec', cfg.react);
        };
        var testChallenge = function() {
          if (chPick == null) return;
          applySetup(challenge.to);
          setChTested(true);
          if (chPick === chResult.answer && !chSolved[challenge.id]) {
            var next = Object.assign({}, chSolved); next[challenge.id] = true; upd('brakingChallenges', next);
          }
        };
        var nextChallenge = function() { setChIdx((chIdx + 1) % BRAKE_CHALLENGES.length); setChPick(null); setChTested(false); };

        var cvsRef = useRef(null);
        useEffect(function() {
          var cvs = cvsRef.current;
          if (!cvs) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(cvs, cvs._logicalW || cvs.width, cvs._logicalH || cvs.height);
          }
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = cvs._logicalW || cvs.width, H = cvs._logicalH || cvs.height;
          ctx2d.clearRect(0, 0, W, H);
          var roadH = 58, roadTop = H - roadH, grassTop = roadTop - 14;
          drawSkyBackdrop(ctx2d, W, grassTop, 0, surf === 'wet' ? 'rain' : surf === 'ice' ? 'cold' : 'clear');
          ctx2d.fillStyle = surf === 'ice' ? '#e2e8f0' : '#4d7c0f'; ctx2d.fillRect(0, grassTop, W, 14);
          // road surface
          var roadColor = surf === 'dry' ? '#3f4a5a' : surf === 'wet' ? '#33496b' : surf === 'gravel' ? '#7a5c3a' : '#cfe8f5';
          ctx2d.fillStyle = roadColor; ctx2d.fillRect(0, roadTop, W, roadH);
          if (surf === 'gravel') { ctx2d.fillStyle = 'rgba(255,237,213,0.55)'; for (var gi = 0; gi < 260; gi++) ctx2d.fillRect((gi * 97) % W, roadTop + 4 + (gi * 53) % (roadH - 8), 2, 2); }
          if (surf === 'wet') { ctx2d.strokeStyle = 'rgba(255,255,255,0.28)'; ctx2d.lineWidth = 1; for (var wi = 0; wi < 60; wi++) { var rx = (wi * 131) % W, ry = roadTop + 6 + (wi * 37) % (roadH - 12); ctx2d.beginPath(); ctx2d.moveTo(rx, ry); ctx2d.lineTo(rx + 22, ry); ctx2d.stroke(); }
            ctx2d.strokeStyle = 'rgba(226,232,240,0.5)'; for (var ri = 0; ri < 70; ri++) { var sx = (ri * 173) % W, sy = (ri * 61) % (grassTop - 8); ctx2d.beginPath(); ctx2d.moveTo(sx, sy); ctx2d.lineTo(sx - 4, sy + 12); ctx2d.stroke(); } }
          if (surf === 'ice') { ctx2d.strokeStyle = 'rgba(255,255,255,0.9)'; ctx2d.lineWidth = 2; for (var ii = 0; ii < 26; ii++) { var ix = (ii * 211) % W, iy = roadTop + 8 + (ii * 29) % (roadH - 16); ctx2d.beginPath(); ctx2d.moveTo(ix, iy); ctx2d.lineTo(ix + 30, iy - 5); ctx2d.stroke(); } }
          ctx2d.strokeStyle = surf === 'ice' ? '#64748b' : '#fde68a'; ctx2d.lineWidth = 2; ctx2d.setLineDash([18, 14]);
          ctx2d.beginPath(); ctx2d.moveTo(0, roadTop + roadH / 2); ctx2d.lineTo(W, roadTop + roadH / 2); ctx2d.stroke(); ctx2d.setLineDash([]);
          var maxD = Math.max(totalDist * 1.12, 30);
          var bikeX = 60, pxPerM = (W - bikeX - 60) / maxD;
          var reactX = bikeX + reactionDist * pxPerM, stopX = bikeX + totalDist * pxPerM;
          // zones: reaction (still at full speed), then braking (with skid marks)
          ctx2d.fillStyle = 'rgba(251,191,36,0.45)'; ctx2d.fillRect(bikeX, roadTop, reactX - bikeX, roadH);
          ctx2d.fillStyle = 'rgba(239,68,68,0.45)'; ctx2d.fillRect(reactX, roadTop, stopX - reactX, roadH);
          var skid = ctx2d.createLinearGradient(reactX, 0, stopX, 0); skid.addColorStop(0, 'rgba(15,23,42,0)'); skid.addColorStop(1, 'rgba(15,23,42,0.75)');
          ctx2d.strokeStyle = skid; ctx2d.lineWidth = 3; ctx2d.beginPath(); ctx2d.moveTo(reactX, roadTop + 12); ctx2d.lineTo(stopX, roadTop + 12); ctx2d.stroke();
          // distance ticks along the curb
          ctx2d.font = 'bold 12px sans-serif'; ctx2d.fillStyle = '#ffffff'; ctx2d.strokeStyle = '#ffffff'; ctx2d.lineWidth = 1.5;
          var tickStep = maxD > 60 ? 10 : 5;
          for (var d_m = 0; d_m <= maxD; d_m += tickStep) {
            var tx = bikeX + d_m * pxPerM;
            ctx2d.beginPath(); ctx2d.moveTo(tx, H - 16); ctx2d.lineTo(tx, H - 8); ctx2d.stroke();
            ctx2d.fillText(d_m + ' m', tx + 4, H - 6);
          }
          // zone labels, inside the zones when they fit
          var zoneLabel = function(x0, x1, text, color) {
            ctx2d.font = 'bold 13px sans-serif'; var tw = ctx2d.measureText(text).width;
            var lx = (x1 - x0 > tw + 12) ? x0 + (x1 - x0 - tw) / 2 : Math.min(W - tw - 8, x0 + 4), ly = roadTop - 22;
            ctx2d.fillStyle = 'rgba(255,255,255,0.92)'; ctx2d.fillRect(lx - 5, ly - 14, tw + 10, 19);
            ctx2d.fillStyle = color; ctx2d.fillText(text, lx, ly);
            ctx2d.strokeStyle = color; ctx2d.lineWidth = 2; ctx2d.beginPath(); ctx2d.moveTo(x0, roadTop - 14); ctx2d.lineTo(x0, roadTop + 4); ctx2d.moveTo(x1, roadTop - 14); ctx2d.lineTo(x1, roadTop + 4); ctx2d.moveTo(x0, roadTop - 6); ctx2d.lineTo(x1, roadTop - 6); ctx2d.stroke();
          };
          zoneLabel(bikeX, reactX, 'Reacting: ' + reactionDist.toFixed(1) + ' m', '#92400e');
          ctx2d.save(); ctx2d.translate(0, -24); zoneLabel(reactX, stopX, 'Braking: ' + brakingDist.toFixed(1) + ' m', '#991b1b'); ctx2d.restore();
          // the bike at three moments: sees the hazard, brakes go on, stopped
          var wheelY = roadTop + roadH / 2 + 12;
          drawBikeFigure(ctx2d, bikeX, wheelY, { scale: 1.15, alpha: 0.55, pedal: 0.6 });
          drawBikeFigure(ctx2d, reactX, wheelY, { scale: 1.15, alpha: 0.75, pedal: 1.9, braking: true });
          drawBikeFigure(ctx2d, stopX, wheelY, { scale: 1.15, pedal: 3.1, braking: true, frame: '#7c3aed' });
          ctx2d.strokeStyle = '#ffffff'; ctx2d.lineWidth = 4; ctx2d.beginPath(); ctx2d.moveTo(stopX + 26, roadTop + 3); ctx2d.lineTo(stopX + 26, H - 20); ctx2d.stroke();
          // headline
          var head = 'Stopped after ' + totalDist.toFixed(1) + ' m (' + (totalDist * 3.281).toFixed(0) + ' ft)';
          ctx2d.font = 'bold 16px sans-serif'; var hw = ctx2d.measureText(head).width;
          ctx2d.fillStyle = 'rgba(15,23,42,0.85)'; ctx2d.fillRect(12, 10, hw + 20, 28);
          ctx2d.fillStyle = '#ffffff'; ctx2d.fillText(head, 22, 30);
        }, [speedMph, surf, brakeSplit, reaction, achieved]); // eslint-disable-line

        var endoWarn = brakeSplit === 'front' && frictionA > endoA; // only front-only braking can pitch the rider over

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🛑', title: t('stem.bikelab.braking_physics_2', 'Braking Physics') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 overflow-hidden' },
              h('canvas', { ref: cvsRef, width: 1000, height: 250, className: 'bikelab-fit-canvas w-full block', role: 'img', 'aria-label': t('stem.bikelab.braking_distance_visualization_bicycle', 'Braking distance visualization: bicycle stops over the calculated reaction-plus-braking distance for the selected speed and surface.') })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-3' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, t('stem.bikelab.initial_speed', 'Initial Speed')), h('span', { className: 'text-rose-600' }, speedMph + ' mph')),
                h('input', { type: 'range', min: 5, max: 40, value: speedMph,
                  onChange: function(e) { var v = parseInt(e.target.value); setSpeedMph(v); upd('brakingMph', v); },
                  className: 'w-full mt-2 accent-rose-500',
                  'aria-label': t('stem.bikelab.initial_speed_mph_slider', 'Initial speed in miles per hour') }),
                h('div', { className: 'text-xs text-slate-600' }, (speedMph / 2.237).toFixed(1) + ' m/s · ' + (speedMph * 1.609).toFixed(1) + ' km/h')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.surface', 'Surface')),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  Object.keys(SURFACES).map(function(k) {
                    return h('button', {
                      key: k,
                      onClick: function() { setSurf(k); upd('brakingSurface', k); },
                      className: 'py-1.5 rounded border-2 text-xs font-bold transition-colors ' + (surf === k ? 'border-indigo-700 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                    }, SURFACES[k].label);
                  })
                ),
                h('div', { className: 'text-xs text-slate-600 font-mono mt-2' }, 'μ = ' + mu.toFixed(2))
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.brake_used', 'Brake Used')),
                h('div', { className: 'grid grid-cols-3 gap-1' },
                  [['front', 'Front'], ['both', 'Both'], ['rear', 'Rear']].map(function(opt) {
                    return h('button', {
                      key: opt[0],
                      onClick: function() { setBrakeSplit(opt[0]); upd('brakingSplit', opt[0]); },
                      className: 'py-1.5 rounded border-2 text-xs font-bold transition-colors ' + (brakeSplit === opt[0] ? 'border-rose-700 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')
                    }, opt[1]);
                  })
                ),
                h('div', { className: 'text-xs text-slate-600 mt-2' }, t('stem.bikelab.rear_only_distance_v2', 'Rear-only braking needs about 3× the distance of front braking.'))
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, t('stem.bikelab.reaction_time', 'Reaction Time')), h('span', { className: 'text-amber-600' }, reaction.toFixed(1) + ' s')),
                h('input', { type: 'range', min: 0.3, max: 2.5, step: 0.1, value: reaction,
                  onChange: function(e) { var v = parseFloat(e.target.value); setReaction(v); upd('brakingReactionSec', v); },
                  className: 'w-full mt-2 accent-amber-500',
                  'aria-label': t('stem.bikelab.reaction_time_seconds_slider', 'Reaction time in seconds') }),
                h('div', { className: 'text-xs text-slate-600' }, t('stem.bikelab.alert_adult_1_0_s_pro_racer_0_3_s', 'Alert adult: 1.0 s · Pro racer: 0.3 s'))
              )
            ),
            h('section', { 'data-bikelab-brake-challenge': challenge.id, 'aria-labelledby': 'bikelab-brake-challenge-title', className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('h3', { id: 'bikelab-brake-challenge-title', className: 'text-sm font-black text-slate-800' }, 'Predict, then test (' + ((chIdx % BRAKE_CHALLENGES.length) + 1) + ' of ' + BRAKE_CHALLENGES.length + ')'),
                h('span', { className: 'text-xs font-bold text-slate-600' }, Object.keys(chSolved).length + ' of ' + BRAKE_CHALLENGES.length + ' predicted correctly')),
              h('p', { className: 'text-sm text-slate-800 mt-1' }, challenge.q),
              h('div', { role: 'group', 'aria-label': 'Your prediction', className: 'mt-2 flex flex-wrap gap-2' },
                challenge.options.map(function(opt) {
                  var on = chPick === opt[0];
                  return h('button', { key: opt[0], type: 'button', 'aria-pressed': on, disabled: chTested,
                    onClick: function() { setChPick(opt[0]); },
                    className: 'min-h-11 px-3 rounded-lg border-2 text-sm font-bold ' + (on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100') + (chTested ? ' opacity-80' : '')
                  }, (on ? '✓ ' : '') + opt[1]);
                })),
              h('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
                !chTested && h('button', { type: 'button', disabled: chPick == null, onClick: testChallenge,
                  className: 'min-h-11 px-4 rounded-lg text-sm font-bold ' + (chPick == null ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 text-white') },
                  chPick == null ? 'Pick a prediction first' : 'Test it'),
                chTested && h('button', { type: 'button', onClick: nextChallenge, className: 'min-h-11 px-4 rounded-lg text-sm font-bold bg-indigo-700 hover:bg-indigo-800 text-white' }, 'Next challenge')),
              h('div', { role: 'status', 'aria-live': 'polite', 'data-bikelab-brake-verdict': 'true', className: 'mt-2 text-sm text-slate-800' },
                chTested ? h('div', null,
                  h('p', { className: 'font-bold ' + (chPick === chResult.answer ? 'text-emerald-800' : 'text-rose-800') },
                    (chPick === chResult.answer ? '✓ Your prediction was right. ' : '✗ Not quite. ') +
                    'Measured: ' + chResult.before.toFixed(1) + ' m, then ' + chResult.after.toFixed(1) + ' m. That is ' + chResult.ratio.toFixed(1) + '× as far.'),
                  h('p', { className: 'mt-1' }, challenge.why),
                  h('p', { className: 'mt-1 text-xs text-slate-600' }, 'The controls below now show the second setup. Change them to explore.')) : null)),
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
              [
                { label: t('stem.bikelab.total_stopping_distance', 'Total Stopping Distance'), val: totalDist.toFixed(1) + ' m', sub: (totalDist * 3.281).toFixed(1) + ' ft', color: 'from-rose-500 to-red-600' },
                { label: t('stem.bikelab.braking_distance', 'Braking Distance'), val: brakingDist.toFixed(1) + ' m', sub: 'd = v²/(2a)', color: 'from-orange-500 to-amber-600' },
                { label: t('stem.bikelab.reaction_distance', 'Reaction Distance'), val: reactionDist.toFixed(1) + ' m', sub: 'd = v · t_react', color: 'from-yellow-500 to-amber-500' },
                { label: t('stem.bikelab.time_to_stop', 'Time to Stop'), val: timeToStop.toFixed(2) + ' s', sub: 't = t_react + v / a', color: 'from-purple-500 to-fuchsia-600' }
              ].map(function(s, i) {
                return h('div', { key: i, className: 'bg-gradient-to-br ' + s.color + ' text-white rounded-xl p-4 shadow' },
                  h('div', { className: 'text-xs opacity-80 uppercase tracking-wider font-bold' }, s.label),
                  h('div', { className: 'text-2xl font-black font-mono mt-1' }, s.val),
                  h('div', { className: 'text-xs opacity-75 font-mono' }, s.sub)
                );
              })
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2' }, t('stem.bikelab.weight_transfer_endo_limit', '📐 Weight Transfer & Endo Limit')),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' },
                  t('stem.bikelab.hard_front_braking_transfers_weight_fo', 'Hard front braking transfers weight forward. If deceleration exceeds a = g·(L − a_cm)/h_cm, the rear wheel lifts (endo).')),
                h('div', { className: 'font-mono text-xs text-slate-800 bg-white p-2 rounded border border-indigo-100' },
                  'endo limit = ' + endoA.toFixed(2) + ' m/s²'),
                endoWarn && h('div', { className: 'mt-2 text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded border border-rose-200' },
                  t('stem.bikelab.at_this_friction_pure_front_braking_wi', '⚠ At this friction, pure front braking will flip you. Shift weight back or use both brakes.'))
              ),
              h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4' },
                h('div', { className: 'text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2' }, t('stem.bikelab.real_world_lesson', '🎯 Real-World Lesson')),
                h('ul', { className: 'text-xs text-slate-700 leading-relaxed space-y-1' },
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.doubling_speed_quadruples_stopping_dis', 'Doubling speed quadruples stopping distance')), t('stem.bikelab.d_v', ' (d ∝ v²).')),
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.front_brake_does_70_of_the_work', 'Front brake does ~70% of the work')), t('stem.bikelab.on_pavement', ' on pavement.')),
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.wet_cuts_grip_nearly_in_half', 'Wet cuts grip nearly in half.'))),
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.on_gravel_ice_rear_brake_is_safer', 'On gravel/ice, rear brake is safer')), t('stem.bikelab.locked_rear_skids_locked_front_over_th', ' — locked rear skids; locked front = over the bars.'))
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: HAND SIGNALS & SAFETY QUIZ
      // ─────────────────────────────────────────────────────
      function SafetyQuiz() {
        var QUESTIONS = [
          {
            q: 'You want to turn LEFT at an upcoming intersection. What hand signal do you use?',
            choices: [
              { id: 'a', label: t('stem.bikelab.left_arm_straight_out_to_the_side', 'Left arm straight out to the side'), svg: 'left_straight', correct: true },
              { id: 'b', label: t('stem.bikelab.left_arm_bent_up_at_90', 'Left arm bent up at 90°'), svg: 'left_up' },
              { id: 'c', label: t('stem.bikelab.left_arm_bent_down_at_90', 'Left arm bent down at 90°'), svg: 'left_down' }
            ],
            explain: 'Left arm straight out = left turn. Universal in the US.'
          },
          {
            q: 'You want to turn RIGHT. What\'s the primary hand signal?',
            choices: [
              { id: 'a', label: t('stem.bikelab.left_arm_bent_up_at_90_forearm_vertica', 'Left arm bent up at 90° (forearm vertical)'), svg: 'left_up', correct: true },
              { id: 'b', label: t('stem.bikelab.both_arms_out_to_the_sides', 'Both arms out to the sides'), svg: 'both_out' },
              { id: 'c', label: t('stem.bikelab.left_arm_bent_down', 'Left arm bent down'), svg: 'left_down' }
            ],
            explain: 'Left arm bent up = right turn. Pointing straight out with your RIGHT arm also means a right turn, and is legal in Maine and most states.'
          },
          {
            q: 'You\'re slowing or stopping. What hand signal do you use?',
            choices: [
              { id: 'a', label: t('stem.bikelab.stop_signal_answer_v2', 'Left arm bent down at the elbow, palm facing back'), svg: 'left_down', correct: true },
              { id: 'b', label: t('stem.bikelab.both_arms_out_to_the_sides', 'Both arms out to the sides'), svg: 'both_out' },
              { id: 'c', label: t('stem.bikelab.left_arm_straight_out', 'Left arm straight out'), svg: 'left_straight' }
            ],
            explain: 'Left arm out and bent down at the elbow, with your palm facing back, means you are slowing or stopping. The open palm is what drivers behind you see.'
          },
          {
            q: 'Where should you ride on a 2-lane road with no bike lane?',
            choices: [
              { id: 'a', label: t('stem.bikelab.on_the_sidewalk_safer_from_cars', 'On the sidewalk — safer from cars') },
              { id: 'b', label: t('stem.bikelab.far_right_of_the_road_with_traffic', 'Far right of the road, with traffic'), correct: true },
              { id: 'c', label: t('stem.bikelab.in_the_middle_of_the_right_lane', 'In the middle of the right lane') },
              { id: 'd', label: t('stem.bikelab.against_traffic_so_you_can_see_cars_co', 'Against traffic so you can see cars coming') }
            ],
            explain: 'Ride WITH traffic, as far right as is practical (not so close you hit the curb or open doors). Against-traffic is illegal in most states AND more dangerous.'
          },
          {
            q: 'You\'re approaching a 4-way stop sign on a bike. What should you do?',
            choices: [
              { id: 'a', label: t('stem.bikelab.speed_through_momentum_helps_balance', 'Speed through — momentum helps balance') },
              { id: 'b', label: t('stem.bikelab.come_to_a_full_stop_then_proceed_in_or', 'Come to a FULL stop, then proceed in order'), correct: true },
              { id: 'c', label: t('stem.bikelab.slow_to_5_mph_but_don_t_fully_stop', 'Slow to 5 mph but don\'t fully stop') },
              { id: 'd', label: t('stem.bikelab.wait_for_cars_to_go_first_always', 'Wait for cars to go first, always') }
            ],
            explain: 'Cyclists must obey the same traffic laws as cars. Full stop at stop signs. "Idaho stop" is legal in some states but not most.'
          },
          {
            q: 'When should you wear a helmet?',
            choices: [
              { id: 'a', label: t('stem.bikelab.only_on_long_rides', 'Only on long rides') },
              { id: 'b', label: t('stem.bikelab.only_at_night', 'Only at night') },
              { id: 'c', label: t('stem.bikelab.every_ride_every_time', 'EVERY ride, every time'), correct: true },
              { id: 'd', label: t('stem.bikelab.only_when_you_ride_fast', 'Only when you ride fast') }
            ],
            explain: 'Every ride. In Maine, helmets are LEGALLY REQUIRED for riders under 16 (Title 29-A §2323). Even where not required by law, most bike crashes happen close to home on low-speed rides. Fit check: 2 fingers above eyebrows, straps form a Y under each ear, chin strap allows only 1 finger of slack.'
          },
          {
            q: 'In Maine, the minimum legal passing distance when a car overtakes a cyclist is:',
            choices: [
              { id: 'a', label: t('stem.bikelab.1_foot', '1 foot') },
              { id: 'b', label: t('stem.bikelab.2_feet', '2 feet') },
              { id: 'c', label: t('stem.bikelab.3_feet', '3 feet'), correct: true },
              { id: 'd', label: t('stem.bikelab.no_specific_distance_just_safe', 'No specific distance — just safe')}
            ],
            explain: 'Maine\'s 3-foot passing law (Title 29-A §2070) requires drivers to give cyclists at least 3 feet of clearance when overtaking. Crossing a double-yellow centerline to provide that 3 feet is legal in Maine if it\'s safe to do so. As a cyclist, ride predictably and signal — drivers need to see your intentions to safely pass.'
          },
          {
            q: 'Maine law requires bicycles ridden after dark (or in low visibility) to have:',
            choices: [
              { id: 'a', label: t('stem.bikelab.reflectors_only_no_lights_needed', 'Reflectors only — no lights needed') },
              { id: 'b', label: t('stem.bikelab.night_lights_answer_v2', 'A white front light AND a red or amber rear light or reflector'), correct: true },
              { id: 'c', label: t('stem.bikelab.just_a_rear_reflector', 'Just a rear reflector') },
              { id: 'd', label: t('stem.bikelab.no_lights_the_rider_just_has_to_wear_b', 'No lights — the rider just has to wear bright clothing') }
            ],
            explain: 'Maine law (Title 29-A §2084) says a bike ridden at night needs a white front light that can be seen from 200 feet, a red or amber rear light or reflector that can be seen from 200 feet, and reflectors on the pedals (or reflective material on your feet or ankles). A real rear light is better than a reflector alone. Many night crashes happen because the driver did not see the rider.'
          },
          {
            q: 'You\'re approaching a turn from a bike lane. What\'s the safest way to signal a left turn?',
            choices: [
              { id: 'a', label: t('stem.bikelab.yell_at_drivers', 'Yell at drivers') },
              { id: 'b', label: t('stem.bikelab.stick_your_left_arm_straight_out_check', 'Stick your left arm straight out, check over your shoulder, signal early'), correct: true },
              { id: 'c', label: t('stem.bikelab.just_turn_drivers_will_see_you', 'Just turn — drivers will see you') },
              { id: 'd', label: t('stem.bikelab.brake_first_then_turn_the_wheel', 'Brake first, then turn the wheel') }
            ],
            explain: 'Left arm straight out is the left-turn signal. Signal early, and check over your shoulder for traffic before you move across. Clear signals and eye contact with drivers help them know what you are about to do.'
          },
          {
            q: 'You are riding past a row of parked cars. Where should you ride?',
            choices: [
              { id: 'a', label: 'As close to the parked cars as you can' },
              { id: 'b', label: 'In and out of the gaps between the cars' },
              { id: 'c', label: 'About a door\'s width out from the cars', correct: true },
              { id: 'd', label: 'Anywhere, as long as you ride slowly' }
            ],
            explain: 'A car door can swing open with no warning. Ride about a door\'s width out from parked cars, in a straight line, so an opening door cannot hit you. Weaving in and out of the gaps hides you from the drivers behind.'
          },
          {
            q: 'A car just ahead of you has its right turn signal on. You are going straight. What is the safest choice?',
            choices: [
              { id: 'a', label: 'Slow down and stay behind it until it has turned', correct: true },
              { id: 'b', label: 'Speed up and pass it on the right before it turns' },
              { id: 'c', label: 'Ride up beside it so the driver notices you' },
              { id: 'd', label: 'Keep your speed, because the driver has to wait' }
            ],
            explain: 'Stay behind a car that is about to turn. A driver turning right often cannot see a rider alongside. Riders call this crash the "right hook". Being in the right does not protect you, so let the car turn first.'
          },
          {
            q: 'You are about to ride out of a driveway onto the street. What should you do first?',
            choices: [
              { id: 'a', label: 'Stop, then look left, right and left again', correct: true },
              { id: 'b', label: 'Roll out slowly while you look both ways' },
              { id: 'c', label: 'Go quickly to spend less time in the road' },
              { id: 'd', label: 'Ring your bell, then ride straight out' }
            ],
            explain: 'Stop at the end of the driveway every time. When a rider rolls out of a driveway or from between parked cars, drivers have almost no time to see them. Stop, look left, right and left again, and go when it is clear.'
          },
          {
            q: 'Is it a good idea to ride with earbuds or headphones in both ears?',
            choices: [
              { id: 'a', label: 'Yes, music helps you concentrate on riding' },
              { id: 'b', label: 'Yes, as long as you look around more often' },
              { id: 'c', label: 'No, you need to hear what is around you', correct: true },
              { id: 'd', label: 'Only when you are riding on a busy road' }
            ],
            explain: 'Your ears tell you about things you cannot see, like a car coming up behind you or a siren. Keep your ears free when you ride. The same goes for a phone: stop and pull over before you look at it.'
          }
        ];
        var SAFETY_PASS = 10;

        var idxState = useState(0);
        var idx = idxState[0], setIdx = idxState[1];
        var answersState = useState({});
        var answers = answersState[0], setAnswers = answersState[1];
        var revealState = useState(false);
        var reveal = revealState[0], setReveal = revealState[1];
        var resultsState = useState(false);
        var showResults = resultsState[0], setShowResults = resultsState[1];

        // Boundary guard: if idx ever lands outside QUESTIONS (corrupted state, hot-reload
        // after questions array shrunk), don't crash — clamp to the last valid index.
        if (idx < 0 || idx >= QUESTIONS.length) {
          var safeIdx = Math.max(0, Math.min(QUESTIONS.length - 1, idx));
          if (safeIdx !== idx) { setIdx(safeIdx); }
          return h('div', { className: 'p-6 text-center text-slate-600' }, t('stem.bikelab.loading_quiz', 'Loading quiz…'));
        }
        var q = QUESTIONS[idx];
        // Show each question's choices in a fixed rotated order, so the right answer lands in every position across the quiz.
        // Answers are stored by choice id, so the order on screen does not affect scoring.
        var quizOrder = function(choices, i) { var k = (i * 2 + 1) % choices.length; return choices.slice(k).concat(choices.slice(0, k)); };
        var hasAnswered = answers[idx] !== undefined;
        var chosenId = answers[idx];
        // Null-guard: if answers state somehow contains a chosenId not in choices
        // (corrupted state, hot-reload mid-answer), fall back to incorrect.
        var chosenChoice = hasAnswered ? q.choices.find(function(c) { return c.id === chosenId; }) : null;
        var isCorrect = !!(chosenChoice && chosenChoice.correct);

        var pickChoice = function(cid) {
          if (hasAnswered) return;
          // Immutable update via Object.assign so React detects the change.
          setAnswers(Object.assign({}, answers, (function() { var o = {}; o[idx] = cid; return o; })()));
          setReveal(true);
        };
        var goNext = function() { if (idx < QUESTIONS.length - 1) { setIdx(idx + 1); setReveal(false); } };
        var goPrev = function() { if (idx > 0) { setIdx(idx - 1); setReveal(false); } };
        var restartQuiz = function() { setAnswers({}); setIdx(0); setReveal(false); setShowResults(false); };
        var correctLabelOf = function(qq) { var c = qq.choices.filter(function(x) { return x.correct; })[0]; return c ? c.label : ''; };
        var correctCount = Object.keys(answers).filter(function(k) {
          var ci = answers[k];
          var ch = QUESTIONS[k] && QUESTIONS[k].choices.find(function(c) { return c.id === ci; });
          return !!(ch && ch.correct);
        }).length;
        // Best score counts once every question has an answer.
        useEffect(function() {
          if (Object.keys(answers).length >= QUESTIONS.length && correctCount > (+d.safetyBest || 0)) upd('safetyBest', correctCount);
        }, [correctCount, Object.keys(answers).length]);

        function signalSvg(kind) {
          var signalLabels = { left_straight: 'Left arm straight out to the side', left_up: 'Left arm out and bent up at the elbow', left_down: 'Left arm out and bent down at the elbow', right_straight: 'Right arm straight out to the side', both_out: 'Both arms straight out to the sides' };
          return h('div', { role: 'img', 'aria-label': signalLabels[kind] || 'Rider seen from behind' }, armPoseSvg(kind));
        }

        if (showResults) {
          var missed = QUESTIONS.map(function(qq, qi) { return { qq: qq, qi: qi }; }).filter(function(m) {
            var ch = m.qq.choices.filter(function(c) { return c.id === answers[m.qi]; })[0];
            return !(ch && ch.correct);
          });
          var passed = correctCount >= SAFETY_PASS;
          return h('div', { className: 'flex flex-col h-full bg-slate-50' },
            BackBar({ icon: '🛡️', title: t('stem.bikelab.hand_signals_safety_2', 'Hand Signals & Safety') }),
            h('div', { 'data-quiz-results': 'true', className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
              h('div', { role: 'status', className: 'rounded-xl shadow border-2 p-5 text-center ' + (passed ? 'bg-emerald-50 border-emerald-400' : 'bg-amber-50 border-amber-400') },
                h('div', { className: 'text-2xl font-black text-slate-800' }, 'You got ' + correctCount + ' of ' + QUESTIONS.length),
                h('p', { className: 'text-sm text-slate-700 mt-1' }, passed ? 'That is a pass. You know the rules of the road.' : 'You need ' + SAFETY_PASS + ' to pass. Read the ones you missed, then try again.')
              ),
              missed.length > 0 && h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
                h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, 'Questions to look at again'),
                h('ul', { className: 'space-y-4' },
                  missed.map(function(m) {
                    return h('li', { key: m.qi, className: 'text-sm text-slate-700' },
                      h('div', { className: 'font-bold text-slate-800' }, (m.qi + 1) + '. ' + m.qq.q),
                      h('div', { className: 'mt-1' }, h('span', { className: 'font-bold text-emerald-700' }, 'Right answer: '), correctLabelOf(m.qq)),
                      h('div', { className: 'mt-1 leading-relaxed' }, m.qq.explain));
                  })
                )
              ),
              h('button', { type: 'button', 'data-quiz-retry': 'true', onClick: restartQuiz, className: 'px-4 py-2 rounded-lg font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white' }, 'Try the quiz again')
            )
          );
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🛡️', title: t('stem.bikelab.hand_signals_safety_2', 'Hand Signals & Safety') }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, 'Question ' + (idx + 1) + ' / ' + QUESTIONS.length),
                h('div', { className: 'text-sm font-bold' },
                  h('span', { className: 'text-emerald-600' }, '✓ ' + correctCount),
                  h('span', { className: 'text-slate-400 mx-1' }, '/'),
                  h('span', { className: 'text-slate-600' }, Object.keys(answers).length + ' answered'))
              ),
              h('div', { className: 'w-full h-2 bg-slate-100 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all',
                  style: { width: (((idx + 1) / QUESTIONS.length) * 100) + '%' } })
              )
            ),
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-5' },
              h('div', { className: 'text-base font-bold text-slate-800 mb-4' }, q.q),
              h('div', { className: 'grid grid-cols-1 ' + (q.choices[0].svg ? 'md:grid-cols-3' : 'md:grid-cols-2') + ' gap-3' },
                quizOrder(q.choices, idx).map(function(c) {
                  var isPicked = chosenId === c.id;
                  var borderColor = 'border-slate-200 hover:border-slate-400';
                  if (hasAnswered && c.correct) borderColor = 'border-emerald-500 bg-emerald-50';
                  else if (hasAnswered && isPicked && !c.correct) borderColor = 'border-rose-500 bg-rose-50';
                  else if (isPicked) borderColor = 'border-indigo-500 bg-indigo-50';
                  return h('button', {
                    key: c.id,
                    onClick: function() { pickChoice(c.id); },
                    disabled: hasAnswered,
                    className: 'text-left p-4 rounded-xl border-2 transition-all ' + borderColor + (hasAnswered ? ' cursor-default' : ' cursor-pointer')
                  },
                    c.svg && signalSvg(c.svg),
                    h('div', { className: 'text-sm font-medium text-slate-700 mt-2' }, c.label),
                    hasAnswered && c.correct && h('div', { className: 'text-xs text-emerald-700 font-bold mt-2' }, t('stem.bikelab.correct', '✓ Correct')),
                    hasAnswered && isPicked && !c.correct && h('div', { className: 'text-xs text-rose-700 font-bold mt-2' }, t('stem.bikelab.your_answer', '✗ Your answer'))
                  );
                })
              ),
              reveal && h('div', { role: 'status', className: 'mt-4 p-4 rounded-lg border ' + (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1 ' + (isCorrect ? 'text-emerald-700' : 'text-amber-700') }, isCorrect ? '✓ Why that\'s right' : '📖 The correct answer'),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, q.explain)
              )
            ),
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                onClick: goPrev,
                disabled: idx === 0,
                className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (idx === 0 ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
              }, t('stem.bikelab.previous', '← Previous')),
              h('div', { className: 'flex-1' }),
              idx === QUESTIONS.length - 1
                ? h('button', {
                    type: 'button', 'data-quiz-finish': 'true',
                    onClick: function() { setShowResults(true); },
                    disabled: !hasAnswered,
                    className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (!hasAnswered ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                  }, 'See your results')
                : h('button', {
                    onClick: goNext,
                    disabled: !hasAnswered,
                    className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (!hasAnswered ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                  }, t('stem.bikelab.next', 'Next →'))
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: NEIGHBORHOOD RIDE DEMO
      // ─────────────────────────────────────────────────────
      // Applied-physics capstone. Ride a scripted 600 m "commute to school"
      // course that reuses the Sandbox physics engine. Three scored events
      // along the way (stop sign, steep climb, wet section) teach real-world
      // gear + braking decisions.
      function NeighborhoodRide() {
        var bikeState = useState(d.rideBikeId || 'hybrid');
        var bikeId = bikeState[0], setBikeId = bikeState[1];
        var bike = BIKES.find(function(b) { return b.id === bikeId; }) || BIKES[1];
        var powerState = useState(150);
        var power = powerState[0], setPower = powerState[1];
        var gearState = useState(0.7);
        var gear = gearState[0], setGear = gearState[1];
        var brakingState = useState(false);
        var braking = brakingState[0], setBraking = brakingState[1];
        var runningState = useState(false);
        var running = runningState[0], setRunning = runningState[1];
        var finishedState = useState(false);
        var finished = finishedState[0], setFinished = finishedState[1];

        var COURSE_LENGTH = 600;
        var COURSE_SEGMENTS = [
          { from: 0,   to: 180, kind: 'pavement', label: t('stem.bikelab.your_block', 'Your block'), elevFn: function(_x) { return 0; } },
          { from: 180, to: 220, kind: 'pavement', label: t('stem.bikelab.stop_sign', 'STOP SIGN'),  elevFn: function(_x) { return 0; }, stopSign: { at: 205, windowStart: 195, windowEnd: 215 } },
          { from: 220, to: 280, kind: 'pavement', label: t('stem.bikelab.flat_run', 'Flat run'),   elevFn: function(_x) { return 0; } },
          { from: 280, to: 380, kind: 'pavement', label: t('stem.bikelab.oak_hill', 'Oak Hill'),   elevFn: function(x) { return (x - 280) * 0.07; }, hill: { start: 280, end: 380 } },
          { from: 380, to: 450, kind: 'pavement', label: t('stem.bikelab.descent', 'Descent'),    elevFn: function(x) { return 7 - (x - 380) * 0.03; } },
          { from: 450, to: 520, kind: 'wet',      label: t('stem.bikelab.wet_patch', 'Wet patch'),  elevFn: function(x) { return 4.9 - (x - 450) * 0.04; }, wet: { start: 450, end: 520 } },
          { from: 520, to: 600, kind: 'pavement', label: t('stem.bikelab.school_st', 'School St.'), elevFn: function(x) { return 2.1 - (x - 520) * 0.026; } }
        ];
        var DECOR = [
          { x: 20,  emoji: '🏠', h: 3.5 }, { x: 60,  emoji: '🏡', h: 3.5 },
          { x: 100, emoji: '🌳', h: 2.5 }, { x: 140, emoji: '🏠', h: 3.5 },
          { x: 250, emoji: '🌳', h: 2.5 },
          { x: 300, emoji: '🌳', h: 2.5 }, { x: 340, emoji: '🌳', h: 2.5 },
          { x: 420, emoji: '🏡', h: 3.5 }, { x: 470, emoji: '🌧️', h: 4.0 },
          { x: 560, emoji: '🏡', h: 3.5 }, { x: 600, emoji: '🏫', h: 4.5 }
        ];

        var scoreRef = useRef({ stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false });
        var posRef = useRef(0);
        var velRef = useRef(0);
        var timeRef = useRef(0);
        var prevVelRef = useRef(0);
        var rafRef = useRef(null);
        var lastTsRef = useRef(0);
        var hudTickState = useState(0);
        var hudTick = hudTickState[0], setHudTick = hudTickState[1];
        var canvasRef = useRef(null);

        var terrainAt = function(x) {
          var clamped = Math.max(0, Math.min(COURSE_LENGTH, x));
          var seg = COURSE_SEGMENTS.find(function(s) { return clamped >= s.from && clamped <= s.to; }) || COURSE_SEGMENTS[0];
          return { y: seg.elevFn(clamped), kind: seg.kind, seg: seg };
        };

        var reset = function() {
          posRef.current = 0; velRef.current = 0; timeRef.current = 0; prevVelRef.current = 0;
          scoreRef.current = { stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false };
          setFinished(false);
          setHudTick(function(x) { return x + 1; });
        };

        useEffect(function() { reset(); }, [bikeId]);

        useEffect(function() {
          if (!running) return;
          var onKey = function(e) {
            // WCAG 2.1.4: Space-to-brake acts only while focus is inside the ride view.
            var rideRoot = document.querySelector('[data-bikelab-ride-root]');
            if (!rideRoot || !e.target || !rideRoot.contains(e.target)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') || e.target.isContentEditable) return;
            if (e.key === 'ArrowUp') { setGear(function(g) { return Math.min(1, g + 0.1); }); e.preventDefault(); }
            if (e.key === 'ArrowDown') { setGear(function(g) { return Math.max(0.2, g - 0.1); }); e.preventDefault(); }
            if (e.key === ' ') { setBraking(true); e.preventDefault(); }
          };
          var onKeyUp = function(e) { if (e.key === ' ') setBraking(false); };
          window.addEventListener('keydown', onKey);
          window.addEventListener('keyup', onKeyUp);
          return function() {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKeyUp);
          };
        }, [running]);

        var step = useCallback(function(dt) {
          var m = bike.mass;
          var v = velRef.current;
          var x = posRef.current;
          var t = terrainAt(x);
          var y0 = t.y;
          var y1 = terrainAt(x + 0.5).y;
          var slope = (y1 - y0) / 0.5;
          var angle = Math.atan(slope);
          var crrMult = SURFACE_CRR_MULT[t.kind] || 1;
          var normalN = m * G * Math.cos(angle);
          var gravParallel = m * G * Math.sin(angle);
          var rollingF = bike.crr * crrMult * normalN;
          var dragF = 0.5 * RHO_AIR * bike.cdA * v * Math.abs(v);
          var pedalF = braking ? 0 : pedalDriveForce(bike, gearRatioFor(bike, gear), v, power, 70);
          // Brakes cannot slow you harder than the tires grip: wet road has about half the grip of dry.
          var brakeF = braking ? m * Math.min(5.0, (t.kind === 'wet' ? 0.45 : 0.8) * G * 0.9) : 0;
          var netF = pedalF - rollingF - dragF - gravParallel - brakeF;
          var a = netF / m;
          var newV = v + a * dt;
          if (newV < 0) newV = 0;
          var newX = x + newV * dt;

          var s = scoreRef.current;
          // Stuck on a climb in too hard a gear: say so once, so the rider knows to shift down.
          if (!braking && newV < 0.05 && gravParallel > 1 && pedalF < gravParallel + rollingF && !s.stallHinted) {
            s.stallHinted = true;
            addToast('This gear is too hard for the hill. Shift to a lower gear (↓) so your legs can turn the pedals.', 'info');
          }
          if (t.seg.stopSign && newX >= t.seg.stopSign.windowStart && newX <= t.seg.stopSign.windowEnd) {
            if (s.stopSignMinV == null || newV < s.stopSignMinV) s.stopSignMinV = newV;
          }
          if (t.seg.stopSign && newX >= t.seg.stopSign.windowEnd && s.stopSignObeyed === null) {
            s.stopSignObeyed = (s.stopSignMinV != null && s.stopSignMinV <= 0.3);
            if (s.stopSignObeyed) addToast('✓ Stopped at the stop sign', 'success');
            else addToast('✗ You ran the stop sign', 'warning');
          }
          if (t.seg.hill && newX >= t.seg.hill.start && newX <= t.seg.hill.end) {
            if (newV < s.hillMinSpeed) s.hillMinSpeed = newV;
            if (newV < 2.0) s.hillCrawlTime += dt;
          }
          if (t.seg.wet && newX >= t.seg.wet.start && newX <= t.seg.wet.start + 5) {
            var decel = (prevVelRef.current - newV) / dt;
            if (braking && newV > 3 && decel > 3.5) s.wetBrakingHard = true;
          }

          velRef.current = newV;
          posRef.current = newX;
          prevVelRef.current = newV;
          timeRef.current += dt;

          if (newX >= COURSE_LENGTH) {
            setRunning(false);
            setFinished(true);
            // A best time only counts for a safe ride: full stop at the sign, no crawling on the hill, no hard braking in the wet.
            var cleanRide = s.stopSignObeyed === true && s.hillCrawlTime <= 5 && !s.wetBrakingHard;
            var bestT = d.rideBestTime;
            if (cleanRide && (!bestT || timeRef.current < bestT)) upd('rideBestTime', timeRef.current);
          }
        }, [bike, power, gear, braking, d.rideBestTime]);

        useEffect(function() {
          if (!running) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
          var loop = function(ts) {
            if (!canvasRef.current || !canvasRef.current.isConnected) { rafRef.current = null; return; } // stop if the canvas detached
            if (!lastTsRef.current) lastTsRef.current = ts;
            var dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
            lastTsRef.current = ts;
            var sub = 4;
            for (var i = 0; i < sub; i++) step(dt / sub);
            draw();
            setHudTick(function(x) { return (x + 1) % 1000; });
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
        }, [running, step]); // eslint-disable-line

        var draw = function() {
          var cvs = canvasRef.current;
          if (!cvs) return;
          if (window.StemLab && window.StemLab.setupHiDPI) {
            window.StemLab.setupHiDPI(cvs, cvs._logicalW || cvs.width, cvs._logicalH || cvs.height);
          }
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = cvs._logicalW || cvs.width, H = cvs._logicalH || cvs.height;
          var tNow0 = terrainAt(posRef.current);
          drawSkyBackdrop(ctx2d, W, H * 0.78, posRef.current * 8, tNow0.kind === 'wet' ? 'rain' : 'clear');
          var camX = posRef.current;
          var pxPerMeter = 8;
          var centerY = H * 0.75;
          var w2sX = function(wx) { return W * 0.25 + (wx - camX) * pxPerMeter; };
          var w2sY = function(wy) { return centerY - wy * pxPerMeter; };

          // ground: grass body, then the road drawn along the terrain so wet and dry stretches show where they really are
          var roadPts = [];
          for (var wx = camX - 50; wx <= camX + 110; wx += 2) roadPts.push([wx, w2sX(wx), w2sY(terrainAt(wx).y), terrainAt(wx).kind]);
          var grass = ctx2d.createLinearGradient(0, H * 0.45, 0, H);
          grass.addColorStop(0, '#4d7c0f'); grass.addColorStop(1, '#1a2e05');
          ctx2d.fillStyle = grass; ctx2d.beginPath(); ctx2d.moveTo(roadPts[0][1], H);
          roadPts.forEach(function(p) { ctx2d.lineTo(p[1], p[2]); });
          ctx2d.lineTo(roadPts[roadPts.length - 1][1], H); ctx2d.closePath(); ctx2d.fill();
          var roadStroke = function(kindWanted, color, width, dy, dash) {
            ctx2d.strokeStyle = color; ctx2d.lineWidth = width; ctx2d.lineCap = 'butt'; ctx2d.lineJoin = 'round'; ctx2d.setLineDash(dash || []);
            ctx2d.beginPath(); var open = false;
            roadPts.forEach(function(p) {
              if (kindWanted && p[3] !== kindWanted) { open = false; return; }
              if (open) ctx2d.lineTo(p[1], p[2] + dy); else { ctx2d.moveTo(p[1], p[2] + dy); open = true; }
            });
            ctx2d.stroke(); ctx2d.setLineDash([]);
          };
          roadStroke(null, '#1e293b', 26, 11);          // road bed
          roadStroke(null, '#3f4a5a', 22, 11);          // asphalt
          roadStroke('wet', '#33496b', 22, 11);         // wet stretch
          roadStroke('wet', 'rgba(255,255,255,0.35)', 2, 6, [10, 16]);
          roadStroke(null, '#e2e8f0', 2, 1);            // near edge line
          roadStroke('pavement', '#fbbf24', 2, 12, [14, 12]);
          var tNow = terrainAt(camX);
          if (tNow.kind === 'wet' && !_prefersReducedMotion) {
            ctx2d.strokeStyle = 'rgba(226,232,240,0.55)'; ctx2d.lineWidth = 1;
            for (var rn = 0; rn < 90; rn++) { var rnx = (rn * 173 + timeRef.current * 240) % W, rny = (rn * 61 + timeRef.current * 420) % (H * 0.8); ctx2d.beginPath(); ctx2d.moveTo(rnx, rny); ctx2d.lineTo(rnx - 4, rny + 12); ctx2d.stroke(); }
          }

          DECOR.forEach(function(dec) {
            var dx = w2sX(dec.x);
            if (dx < -30 || dx > W + 30) return;
            var dp = terrainAt(dec.x);
            var dy = w2sY(dp.y + dec.h);
            ctx2d.font = (dec.h * 8) + 'px serif';
            ctx2d.fillText(dec.emoji, dx - 16, dy);
          });

          COURSE_SEGMENTS.forEach(function(seg) {
            if (seg.stopSign) {
              var sx1 = w2sX(seg.stopSign.windowStart);
              var sx2 = w2sX(seg.stopSign.windowEnd);
              if (sx2 < 0 || sx1 > W) return;
              var signX = w2sX(seg.stopSign.at), signY = w2sY(terrainAt(seg.stopSign.at).y);
              ctx2d.strokeStyle = '#ffffff'; ctx2d.lineWidth = 5; ctx2d.beginPath(); ctx2d.moveTo(signX, signY + 1); ctx2d.lineTo(signX, signY + 21); ctx2d.stroke();
              drawStopSign(ctx2d, signX + 14, signY - 2, 15);
            }
            if (seg.wet) {
              var wx1 = w2sX(seg.wet.start);
              var wxE = w2sX(seg.wet.end);
              if (wxE < 0 || wx1 > W) return;
              /* the wet stretch is painted on the road itself */
            }
          });

          var gp = terrainAt(camX);
          var bx = w2sX(camX);
          var by = w2sY(gp.y);
          var bxAhead = w2sX(camX + 0.5);
          var byAhead = w2sY(terrainAt(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);
          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          var ridePedal = _prefersReducedMotion ? 0.6 : (braking ? 0.6 : posRef.current / (2 * Math.PI * bike.wheelR * gearRatioFor(bike, gear)) * 2 * Math.PI);
          drawBikeFigure(ctx2d, 0, 0, { scale: 1.25, wheelRot: _prefersReducedMotion ? 0 : posRef.current / bike.wheelR, pedal: ridePedal, braking: braking });
          ctx2d.restore();

          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx2d.fillRect(0, 0, W, 28);
          var pct = Math.min(1, posRef.current / COURSE_LENGTH);
          ctx2d.fillStyle = '#22c55e';
          ctx2d.fillRect(0, 0, W * pct, 28);
          ctx2d.font = 'bold 13px monospace';
          ctx2d.fillStyle = '#fff';
          ctx2d.fillText('🏠 ' + posRef.current.toFixed(0) + ' / ' + COURSE_LENGTH + ' m · ' + timeRef.current.toFixed(1) + 's · ' + (velRef.current * 2.237).toFixed(1) + ' mph 🏫', 12, 19);

          var nextEventDist = null;
          var nextEventLabel = '';
          COURSE_SEGMENTS.forEach(function(seg) {
            if (seg.stopSign && seg.stopSign.at > posRef.current && (nextEventDist == null || seg.stopSign.at - posRef.current < nextEventDist)) {
              nextEventDist = seg.stopSign.at - posRef.current;
              nextEventLabel = '🛑 Stop sign';
            }
            if (seg.hill && seg.hill.start > posRef.current && (nextEventDist == null || seg.hill.start - posRef.current < nextEventDist)) {
              nextEventDist = seg.hill.start - posRef.current;
              nextEventLabel = '⛰️ Steep climb';
            }
            if (seg.wet && seg.wet.start > posRef.current && (nextEventDist == null || seg.wet.start - posRef.current < nextEventDist)) {
              nextEventDist = seg.wet.start - posRef.current;
              nextEventLabel = '🌧️ Wet section';
            }
          });
          if (nextEventDist != null && nextEventDist < 80) {
            ctx2d.fillStyle = 'rgba(234, 88, 12, 0.9)';
            ctx2d.fillRect(W - 260, 36, 250, 32);
            ctx2d.fillStyle = '#fff';
            ctx2d.font = 'bold 13px sans-serif';
            ctx2d.fillText(nextEventLabel + ' in ' + nextEventDist.toFixed(0) + ' m', W - 250, 56);
          }
        };

        useEffect(function() { draw(); }, [hudTick, bikeId, running]); // eslint-disable-line

        var advice = [];
        if (scoreRef.current.stopSignObeyed === false) advice.push('Brake earlier and come to a full stop at the sign. A rolling stop does not count.');
        if (scoreRef.current.hillCrawlTime > 5) advice.push('Shift to a lower gear before the climb. In a hard gear your legs could not keep the pedals turning, so you slowed to a crawl.');
        if (scoreRef.current.wetBrakingHard) advice.push('Wet pavement has half the grip of dry. Ease off the brake before entering puddles.');
        if (advice.length === 0 && finished) advice.push('Clean ride! Full stop, steady climb, gentle in the wet.');
        else if (finished) advice.push('Best times are saved for clean rides only.');
        // `bestTime &&` guards null but not type: a string is truthy and has no
        // toFixed, which is exactly how this crashed.
        var bestTime = (typeof d.rideBestTime === 'number' && isFinite(d.rideBestTime))
          ? d.rideBestTime : null;

        return h('div', { className: 'flex flex-col h-full bg-slate-50', 'data-bikelab-ride-root': 'true', tabIndex: -1 }, // tabIndex -1: a click on the canvas keeps focus (and Space-to-brake) in the ride
          BackBar({ icon: '🏘️', title: t('stem.bikelab.neighborhood_ride_2', 'Neighborhood Ride') }),
          h('div', { className: 'p-3 max-w-7xl mx-auto w-full space-y-3' },
            h('div', { id: 'bikelab-neighborhood-fs', className: 'bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800', style: { position: 'relative' } },
              h('canvas', { ref: canvasRef, width: 1000, height: 380, className: 'bikelab-fit-canvas w-full block', role: 'img', 'aria-label': t('stem.bikelab.neighborhood_ride_bicycle_traverses_st', 'Neighborhood ride: bicycle traverses streets with hills, stop signs, traffic, and weather. Use the brake button or arrow keys to control.') }),
              // Fullscreen toggle for the neighborhood ride
              h('button', {
                'aria-label': t('stem.bikelab.toggle_fullscreen_for_the_neighborhood', 'Toggle fullscreen for the neighborhood ride'),
                title: t('stem.bikelab.fullscreen_2', 'Fullscreen'),
                onClick: function() {
                  var el = document.getElementById('bikelab-neighborhood-fs');
                  if (!el) return;
                  var inFull = document.fullscreenElement === el || document.webkitFullscreenElement === el || document.mozFullScreenElement === el;
                  if (inFull) { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) ex.call(document); }
                  else { if (window.__alloStemFS) window.__alloStemFS(el); }
                },
                style: {
                  position: 'absolute', top: 8, right: 8, zIndex: 10,
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(148,163,184,0.45)', color: 'var(--allo-stem-text, #cbd5e1)',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }
              }, '⛶')
            ),
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-4 gap-3' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3 flex flex-col gap-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, t('stem.bikelab.session', 'Session')),
                !finished && h('button', {
                  onClick: function() { setRunning(!running); },
                  className: 'py-2.5 px-4 rounded-lg font-bold transition-colors shadow ' + (running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                }, running ? '⏸ Pause' : (posRef.current > 0 && posRef.current < COURSE_LENGTH ? '▶ Resume' : '▶ Start Ride')),
                finished && h('button', {
                  onClick: function() { reset(); setRunning(true); },
                  className: 'py-2.5 px-4 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow'
                }, t('stem.bikelab.ride_again', '↻ Ride Again')),
                h('button', {
                  onClick: function() { setRunning(false); reset(); },
                  className: 'py-2 px-4 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm transition-colors'
                }, t('stem.bikelab.reset_2', '↺ Reset')),
                bestTime && h('div', { className: 'text-xs text-slate-600 text-center border-t border-slate-200 pt-2' },
                  '🏆 Best: ' + bestTime.toFixed(1) + 's')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.bike_2', 'Bike')),
                h('div', { className: 'grid grid-cols-2 gap-1' },
                  BIKES.map(function(b) {
                    return h('button', {
                      key: b.id,
                      onClick: function() { setBikeId(b.id); upd('rideBikeId', b.id); },
                      className: 'flex items-center gap-1 px-1.5 py-1 rounded border text-xs transition-colors ' + (bikeId === b.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300')
                    }, h('span', null, b.icon), h('span', { className: 'truncate' }, b.name.split(' ')[0]));
                  })
                )
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, t('stem.bikelab.gear', 'Gear (↑/↓)')), h('span', { className: 'text-violet-600' }, gearRatioFor(bike, gear).toFixed(2) + ' : 1')),
                h('input', { type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                  onChange: function(e) { setGear(parseFloat(e.target.value)); },
                  className: 'w-full accent-violet-500',
                  'aria-label': t('stem.bikelab.neighborhood_ride_gear_ratio', 'Neighborhood ride gear ratio') }),
                // Discrete gear-step buttons — easier on touch devices (no precise
                // drag needed) and don't require looking at the slider mid-ride.
                h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                  h('button', {
                    'aria-label': t('stem.bikelab.shift_to_a_lower_gear_easier_pedaling_', 'Shift to a lower gear (easier pedaling, less top speed)'),
                    onClick: function() { setGear(function(g) { return Math.max(0.2, +(g - 0.1).toFixed(2)); }); },
                    className: 'py-2 rounded-lg font-bold bg-violet-100 hover:bg-violet-200 text-violet-800 text-sm shadow-sm transition-colors'
                  }, t('stem.bikelab.lower', '↓ Lower')),
                  h('button', {
                    'aria-label': t('stem.bikelab.shift_to_a_higher_gear_more_top_speed_', 'Shift to a higher gear (more top speed, harder pedaling)'),
                    onClick: function() { setGear(function(g) { return Math.min(1.0, +(g + 0.1).toFixed(2)); }); },
                    className: 'py-2 rounded-lg font-bold bg-violet-100 hover:bg-violet-200 text-violet-800 text-sm shadow-sm transition-colors'
                  }, t('stem.bikelab.higher', '↑ Higher'))
                ),
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between mt-2' },
                  h('span', null, t('stem.bikelab.pedal_power', 'Pedal Power')), h('span', { className: 'text-cyan-600' }, power + ' W')),
                h('input', { type: 'range', min: 0, max: 400, value: power,
                  // NaN-guard: parseInt('') returns NaN; clamp to 0 so an empty
                  // keyboard-edited slider value can't poison physics.
                  onChange: function(e) { var v = parseInt(e.target.value, 10); setPower(isFinite(v) ? v : 0); },
                  className: 'w-full accent-cyan-500',
                  'aria-label': t('stem.bikelab.neighborhood_ride_pedal_power_watts', 'Neighborhood ride pedal power in watts') })
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3 flex flex-col' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.brake_space', 'Brake (Space)')),
                h('button', {
                  'aria-label': braking ? 'Brake engaged. Release Space to stop braking.' : 'Brake. Hold Space or click to brake.',
                  'aria-pressed': braking,
                  onMouseDown: function() { setBraking(true); },
                  onMouseUp: function() { setBraking(false); },
                  onMouseLeave: function() { setBraking(false); },
                  onTouchStart: function() { setBraking(true); },
                  onTouchEnd: function() { setBraking(false); },
                  onKeyDown: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!braking) setBraking(true); } },
                  onKeyUp: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setBraking(false); } },
                  onBlur: function() { setBraking(false); },
                  className: 'flex-1 rounded-lg font-black text-white transition-colors shadow ' + (braking ? 'bg-rose-700' : 'bg-rose-500 hover:bg-rose-600')
                }, braking ? '🛑 BRAKING' : '🛑 Hold to Brake'),
                h('div', { className: 'text-xs text-slate-600 mt-2 text-center' }, t('stem.bikelab.hold_to_slow_or_stop', 'Hold to slow or stop'))
              )
            ),
            finished && h('div', { className: 'bg-gradient-to-br from-emerald-700 to-teal-700 rounded-xl shadow-lg text-white p-5' },
              h('div', { className: 'flex items-center gap-3 mb-3' },
                h('span', { className: 'text-5xl' }, '🏫'),
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80' }, t('stem.bikelab.you_made_it_to_school', 'You made it to school')),
                  h('div', { className: 'text-3xl font-black font-mono' }, timeRef.current.toFixed(1) + 's'),
                  bestTime === timeRef.current && h('div', { className: 'text-xs font-bold' }, t('stem.bikelab.new_personal_best', '🏆 New personal best!'))
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase opacity-80' }, t('stem.bikelab.stop_sign_2', 'Stop Sign')),
                  h('div', { className: 'text-xl' }, scoreRef.current.stopSignObeyed ? '✓' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase opacity-80' }, t('stem.bikelab.hill_crawl', 'Hill Crawl')),
                  h('div', { className: 'text-xl' }, scoreRef.current.hillCrawlTime <= 5 ? '✓' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase opacity-80' }, t('stem.bikelab.wet_section', 'Wet Section')),
                  h('div', { className: 'text-xl' }, !scoreRef.current.wetBrakingHard ? '✓' : '✗')
                )
              ),
              advice.length > 0 && h('div', { className: 'bg-white/20 rounded-lg p-3 text-sm' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80 mb-1' }, t('stem.bikelab.coach', 'Coach')),
                advice.map(function(a, i) { return h('div', { key: i, className: 'leading-relaxed' }, '• ' + a); })
              )
            ),
            h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-400' },
              h('span', { className: 'font-bold text-slate-700' }, t('stem.bikelab.course', '🧭 Course: ')),
              t('stem.bikelab.180_m_flat_stop_sign_flat_run_oak_hill', '180 m flat → 🛑 stop sign → flat run → ⛰️ Oak Hill (7% grade) → descent → 🌧️ wet patch → 🏫 school (600 m total). Use ↑/↓ to shift gears, Space to brake. Apply the physics you learned in Sandbox, Gearing, and Braking labs.')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BIKE PARTS INSPECTOR
      // ─────────────────────────────────────────────────────
      function PartsInspector() {
        // Hotspot shapes that follow the drawing. Parts not listed here use their hx/hy/hw/hh rectangle.
        // ring = [cx, cy, radius, band width]; circle = [cx, cy, radius]; poly = corner points.
        var PART_SHAPES = {
          tire: { ring: [120, 250, 44, 12] }, rim: { ring: [120, 250, 34, 8] }, hub: { circle: [120, 250, 10] },
          spokes: { circle: [425, 250, 31] }, cassette: { circle: [425, 250, 15] }, chainring: { circle: [300, 240, 19] },
          down_tube: { poly: '170,172 180,158 304,232 294,246' }, seatstay: { poly: '294,100 308,90 432,244 418,254' },
          chainstay: { poly: '320,237 410,244 410,256 320,249' }, chain: { poly: '302,215 424,229 424,241 302,227' },
          seat_tube: { rect: [290, 98, 20, 134] }, top_tube: { rect: [182, 87, 112, 16] },
          handlebar: { rect: [84, 80, 62, 15] }, stem: { rect: [148, 82, 24, 16] }, shifter: { rect: [118, 92, 19, 12] }, brake_lever: { poly: '108,88 118,92 105,110 95,105' },
          caliper: { rect: [129, 202, 26, 18] }
        };
        var partArea = function(p) {
          var sh = PART_SHAPES[p.id] || {};
          if (sh.ring) return 2 * Math.PI * sh.ring[2] * sh.ring[3];
          if (sh.circle) return Math.PI * sh.circle[2] * sh.circle[2];
          if (sh.poly) return 1500;
          if (sh.rect) return sh.rect[2] * sh.rect[3];
          return p.hw * p.hh;
        };
        // hit = a transparent click target; outline = the yellow selection mark
        var partShape = function(p, props, outline, child) {
          var sh = PART_SHAPES[p.id] || {};
          var paint = outline ? {} : { fill: 'transparent' };
          if (sh.ring) return h('circle', Object.assign({ cx: sh.ring[0], cy: sh.ring[1], r: sh.ring[2] }, outline ? { fill: 'none' } : { fill: 'none', stroke: 'transparent', strokeWidth: sh.ring[3], pointerEvents: 'stroke' }, props, outline ? { strokeWidth: sh.ring[3] * 0.5, strokeOpacity: 0.85 } : {}), child);
          if (sh.circle) return h('circle', Object.assign({ cx: sh.circle[0], cy: sh.circle[1], r: sh.circle[2] }, paint, props), child);
          if (sh.poly) return h('polygon', Object.assign({ points: sh.poly }, paint, props), child);
          var r = sh.rect || [p.hx, p.hy, p.hw, p.hh];
          return h('rect', Object.assign({ x: r[0], y: r[1], width: r[2], height: r[3], rx: 4 }, paint, props), child);
        };
        var BIKE_PARTS = [
          { id: 'top_tube',   name: t('stem.bikelab.top_tube', 'Top Tube'),        cat: 'Frame', hx: 195, hy: 80, hw: 120, hh: 20,
            fn: 'Horizontal frame tube connecting head tube to seat tube. Defines the "standover height" — you should have 2-5 cm clearance when straddling the bike flat-footed.',
            issues: 'Structural cracks after a crash. Dents from rack-hauling. Carbon tubes show stress as hairline fractures; aluminum shows dents.' },
          { id: 'down_tube',  name: t('stem.bikelab.down_tube', 'Down Tube'),       cat: 'Frame', hx: 170, hy: 140, hw: 160, hh: 24,
            fn: 'Diagonal tube from head tube to bottom bracket — the main load-bearing member. Takes pedaling forces and braking loads.',
            issues: 'Rock strikes leave dents that can fail under stress. Inspect after any crash. Check for paint cracks around tube junctions.' },
          { id: 'seat_tube',  name: t('stem.bikelab.seat_tube', 'Seat Tube'),       cat: 'Frame', hx: 290, hy: 80, hw: 24, hh: 110,
            fn: 'Vertical tube that holds the seatpost. Its angle determines your riding posture (steeper = more forward).',
            issues: 'Seatpost seized from corrosion — grease the post every year. Clamp area cracks from over-tightening.' },
          { id: 'chainstay',  name: t('stem.bikelab.chainstay', 'Chainstay'),       cat: 'Frame', hx: 300, hy: 210, hw: 120, hh: 16,
            fn: 'Rear frame tubes running from bottom bracket to rear axle. Shorter chainstays = quicker acceleration and snappier handling.',
            issues: 'Chain slap wears the paint. Dropout threads can strip — use a threadless hanger on aluminum frames.' },
          { id: 'seatstay',   name: t('stem.bikelab.seatstay', 'Seatstay'),        cat: 'Frame', hx: 300, hy: 130, hw: 110, hh: 16,
            fn: 'Tubes from seat tube top to rear axle. Form the rear triangle with chainstay and seat tube.',
            issues: 'Carbon seatstays can crack at the dropout on impact. Rim brakes wear a groove in the mounting bosses over time.' },
          { id: 'head_tube',  name: t('stem.bikelab.head_tube', 'Head Tube'),       cat: 'Frame', hx: 160, hy: 95, hw: 26, hh: 70,
            fn: 'Short vertical tube at the front — houses the headset bearings that let the fork swivel. Its angle determines steering quickness.',
            issues: 'Creaking headset = loose preload. Cracks at tube junctions after a hard front impact.',
            repairJob: 'headset_adjust' },
          { id: 'rim',        name: 'Rim',             cat: 'Wheels', hx: 70, hy: 210, hw: 90, hh: 90,
            fn: 'Aluminum or carbon hoop holding the tire and transferring braking force (rim brakes) or offering a true surface (disc brakes).',
            issues: 'Bends from pothole hits. Rim-brake wear grooves — replace when the indicator disappears.',
            repairJob: 'wheel_true' },
          { id: 'spokes',     name: t('stem.bikelab.spokes', 'Spokes'),          cat: 'Wheels', hx: 420, hy: 220, hw: 70, hh: 80,
            fn: 'Wire members connecting rim to hub in tension. Transfer weight from the hub to the ground through the rim.',
            issues: 'A broken spoke throws the wheel out of true immediately — zip-tie it to a neighbor and ride gently home.' },
          { id: 'hub',        name: 'Hub',             cat: 'Wheels', hx: 108, hy: 248, hw: 24, hh: 24,
            fn: 'Wheel center containing the axle and bearings. Rear hub also holds the cassette body and ratchet mechanism.',
            issues: 'Grinding = worn bearings. Free-hub pawls can fail — you pedal but the wheel doesn\'t move.' },
          { id: 'tire',       name: t('stem.bikelab.tire', 'Tire'),            cat: 'Wheels', hx: 60, hy: 250, hw: 100, hh: 36,
            fn: 'Rubber-and-casing air-chamber sleeve that provides grip and cushioning. Width, tread, and pressure all shape the ride.',
            issues: 'Sidewall cuts from glass. Thread showing = replace. Low pressure invites pinch flats on potholes.',
            repairJob: 'patch_tube' },
          { id: 'chainring',  name: t('stem.bikelab.chainring', 'Chainring'),       cat: 'Drivetrain', hx: 285, hy: 220, hw: 40, hh: 40,
            fn: 'Front gear attached to the crank. Its tooth count combined with the cassette cog sets your gear ratio (see Gearing Lab).',
            issues: 'Teeth turn into shark-fins at wear. A chain that jumps teeth under load = replace chainring AND chain together.' },
          { id: 'cassette',   name: t('stem.bikelab.cassette', 'Cassette'),        cat: 'Drivetrain', hx: 415, hy: 232, hw: 28, hh: 36,
            fn: 'Cluster of rear gears. Each cog changes the gear ratio. Shifting up = smaller cog = harder, more speed per pedal stroke.',
            issues: 'Worn cassettes cause skipping under load. Replace with chain every ~2 chain changes.',
            repairJob: 'chain_clean' },
          { id: 'chain',      name: t('stem.bikelab.chain', 'Chain'),           cat: 'Drivetrain', hx: 315, hy: 230, hw: 100, hh: 20,
            fn: 'Roller chain that transfers power from chainring to cassette. Wears 0.5% — 1% over ~1500 miles, needs replacement when it stretches.',
            issues: 'Use a chain-wear gauge. Clean and lube every 150 miles.',
            repairJob: 'chain_clean' },
          { id: 'rd',         name: t('stem.bikelab.rear_derailleur', 'Rear Derailleur'), cat: 'Drivetrain', hx: 408, hy: 265, hw: 28, hh: 28,
            fn: 'Spring-loaded parallelogram that guides the chain between cassette cogs and maintains chain tension.',
            issues: 'Sluggish shifting = cable tension off. Bent hanger = shift is impossible to tune — replace the hanger.',
            repairJob: 'derailleur_index' },
          { id: 'shifter',    name: t('stem.bikelab.shifter', 'Shifter'),         cat: 'Drivetrain', hx: 128, hy: 78, hw: 26, hh: 20,
            fn: 'Handlebar-mounted lever that pulls (or releases) cable to move the derailleur. Each click = one cog.',
            issues: 'Grit in the ratchet causes missed shifts. Replace cable every 2 years.' },
          { id: 'handlebar',  name: t('stem.bikelab.handlebar_2', 'Handlebar'),       cat: 'Cockpit', hx: 80, hy: 82, hw: 80, hh: 16,
            fn: 'Provides steering input and mounting for shifters, brake levers, and lights. Shapes: flat (MTB/hybrid), drop (road), riser.',
            issues: 'Aluminum bars have fatigue life — replace after 5-10 years or a crash. Carbon cracks invisibly.' },
          { id: 'stem',       name: t('stem.bikelab.stem', 'Stem'),            cat: 'Cockpit', hx: 136, hy: 78, hw: 30, hh: 16,
            fn: 'Clamps handlebar to fork steerer. Length and angle change your reach and bar height — swap it for a better fit.',
            issues: 'Over-torqued bolts crack carbon bars. Re-grease steerer clamp on every service.',
            repairJob: 'headset_adjust' },
          { id: 'saddle',     name: t('stem.bikelab.saddle_2', 'Saddle'),          cat: 'Cockpit', hx: 282, hy: 58, hw: 46, hh: 14,
            fn: 'Seat. Supports your weight via your "sit bones" (ischial tuberosities). Width should match your sit-bone spacing.',
            issues: 'Wear-through at corners. Creaking rails need grease. Numbness = adjust angle slightly nose-down.' },
          { id: 'brake_lever',name: t('stem.bikelab.brake_lever', 'Brake Lever'),     cat: 'Brakes', hx: 115, hy: 82, hw: 16, hh: 22,
            fn: 'Pulls the brake cable or hydraulic pistons. Position matters — adjust reach so you can brake without straining your fingers.',
            issues: 'Mushy lever = air in hydraulic line (bleed) or stretched cable (tighten).',
            repairJob: 'brake_adjust' },
          { id: 'caliper',    name: t('stem.bikelab.brake_caliper', 'Brake Caliper'),   cat: 'Brakes', hx: 100, hy: 180, hw: 38, hh: 22,
            fn: 'Clamps the pads onto the rim (rim brakes) or rotor (disc brakes) when cable is pulled. The actual braking force originates here.',
            issues: 'Squealing = pad toe-in wrong or contamination. Grinding = worn pads or misaligned caliper.',
            repairJob: 'brake_adjust' }
        ];

        var selectedState = useState(d.partsLastId || 'chain');
        var selectedId = selectedState[0], setSelectedId = selectedState[1];
        var selected = BIKE_PARTS.find(function(p) { return p.id === selectedId; }) || BIKE_PARTS[0];

        // ── 3D model. Optional: the 2D diagram is the default, and the part buttons work in both views.
        var view3dState = useState(false), view3d = view3dState[0], setView3d = view3dState[1];
        var threeStatusState = useState('idle'), threeStatus = threeStatusState[0], setThreeStatus = threeStatusState[1];
        var explodeState = useState(0), explode = explodeState[0], setExplode = explodeState[1];
        var mountRef = useRef(null), hoverRef = useRef(null), sceneRef = useRef(null), pickRef = useRef(null);
        pickRef.current = {
          select: function(id) { setSelectedId(id); upd('partsLastId', id); },
          name: function(id) { var p = BIKE_PARTS.filter(function(x) { return x.id === id; })[0]; return p ? p.name : ''; }
        };
        useEffect(function() {
          if (!view3d) return undefined;
          var host = mountRef.current, dead = false, cleanup = null;
          setThreeStatus('loading');
          var loader = (window.StemLab && typeof window.StemLab.ensureThree === 'function') ? window.StemLab.ensureThree({ orbit: false })
            : (window.THREE ? Promise.resolve(window.THREE) : Promise.reject(new Error('The 3D engine is unavailable.')));
          Promise.resolve(loader).then(function(THREE) {
            if (dead || !host) return;
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { setThreeStatus('error'); return; }
            var W = Math.max(280, host.clientWidth), H = Math.round(W * 0.6);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setSize(W, H, false);
            var canvas = renderer.domElement;
            canvas.className = 'bikelab-fit-canvas block';
            canvas.setAttribute('aria-hidden', 'true');
            canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
            host.appendChild(canvas);
            var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
            scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.95));
            var sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(6, 14, 10); scene.add(sun);
            var ground = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), new THREE.MeshBasicMaterial({ color: 0xdbe3ec }));
            ground.rotation.x = -Math.PI / 2; ground.position.set(0.85, -0.03, 0); scene.add(ground);
            var bike = buildBike3D(THREE); scene.add(bike.group);
            var target = new THREE.Vector3(0.85, 4.7, 0), ray = new THREE.Raycaster();
            var S = { az: 0.55, el: 0.22, dist: 27, raf: 0 };
            var aim = function() {
              camera.position.set(target.x + S.dist * Math.sin(S.az) * Math.cos(S.el), target.y + S.dist * Math.sin(S.el), target.z + S.dist * Math.cos(S.az) * Math.cos(S.el));
              camera.lookAt(target); camera.updateMatrixWorld();
            };
            var draw = function() { S.raf = 0; aim(); renderer.render(scene, camera); };
            var request = function() { if (!S.raf) S.raf = requestAnimationFrame(draw); };
            var clampView = function() { S.el = Math.max(-0.05, Math.min(1.45, S.el)); S.dist = Math.max(13, Math.min(42, S.dist)); };
            var pick = function(ev) {
              var r = canvas.getBoundingClientRect();
              ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
              var hits = ray.intersectObjects(bike.meshes, false);
              return hits.length ? hits[0].object.userData.partId : null;
            };
            var showHover = function(id) {
              var el = hoverRef.current; if (!el) return;
              el.textContent = id ? pickRef.current.name(id) : ''; el.style.display = id ? 'block' : 'none';
              canvas.style.cursor = id ? 'pointer' : 'grab';
            };
            var drag = null;
            var onDown = function(ev) { drag = { x: ev.clientX, y: ev.clientY, az: S.az, el: S.el, moved: false }; try { canvas.setPointerCapture(ev.pointerId); } catch (e) {} };
            var onMove = function(ev) {
              if (!drag) { showHover(pick(ev)); return; }
              var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
              if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
              if (drag.moved) { S.az = drag.az - dx * 0.01; S.el = drag.el + dy * 0.008; clampView(); canvas.style.cursor = 'grabbing'; request(); }
            };
            var onUp = function(ev) {
              if (drag && !drag.moved) { var id = pick(ev); if (id) pickRef.current.select(id); }
              drag = null; canvas.style.cursor = 'grab';
            };
            var onLeave = function() { if (!drag) showHover(null); };
            canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
            canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('pointerleave', onLeave);
            var ro = null;
            if (typeof ResizeObserver === 'function') {
              ro = new ResizeObserver(function() {
                var w = Math.max(280, host.clientWidth), hh = Math.round(w * 0.6);
                renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); request();
              });
              ro.observe(host);
            }
            sceneRef.current = {
              view: function(az, el, dist) { S.az = az; S.el = el; if (dist) S.dist = dist; clampView(); request(); },
              turn: function(daz, del) { S.az += daz; S.el += del; clampView(); request(); },
              zoom: function(f) { S.dist *= f; clampView(); request(); },
              explode: function(v) { bike.group.children.forEach(function(m) { m.position.copy(m.userData.base).addScaledVector(m.userData.ex, v); }); request(); },
              select: function(id) { Object.keys(bike.partMats).forEach(function(k) { bike.partMats[k].forEach(function(m) { m.emissive.setHex(k === id ? 0xf59e0b : 0x000000); m.emissiveIntensity = k === id ? 0.65 : 1; }); }); request(); },
              pickAt: function(clientX, clientY) { aim(); return pick({ clientX: clientX, clientY: clientY }); },
              state: S
            };
            cleanup = function() {
              if (S.raf) cancelAnimationFrame(S.raf);
              if (ro) ro.disconnect();
              canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
              canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('pointerleave', onLeave);
              scene.traverse(function(o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
              renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
              if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            };
            setThreeStatus('ready');
          }).catch(function() { if (!dead) setThreeStatus('error'); });
          return function() { dead = true; if (cleanup) cleanup(); sceneRef.current = null; };
        }, [view3d]);
        useEffect(function() { if (threeStatus === 'ready' && sceneRef.current) sceneRef.current.select(selectedId); }, [selectedId, threeStatus]);
        useEffect(function() { if (threeStatus === 'ready' && sceneRef.current) sceneRef.current.explode(explode / 100); }, [explode, threeStatus]);
        var cam = function(fn) { return function() { if (sceneRef.current) fn(sceneRef.current); }; };
        var camBtn = function(label, aria, fn) {
          return h('button', { key: aria, type: 'button', 'aria-label': aria, onClick: cam(fn), className: 'px-3 py-2 rounded-lg border border-slate-400 bg-white text-slate-800 text-sm font-bold hover:bg-slate-100' }, label);
        };

        var CATEGORIES = [
          { id: 'Frame', color: 'bg-slate-500' },
          { id: 'Wheels', color: 'bg-blue-500' },
          { id: 'Drivetrain', color: 'bg-violet-500' },
          { id: 'Cockpit', color: 'bg-emerald-500' },
          { id: 'Brakes', color: 'bg-rose-500' }
        ];

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🔍', title: t('stem.bikelab.bike_parts_inspector_2', 'Bike Parts Inspector') }),
          h('div', { className: 'p-4 max-w-7xl mx-auto w-full' },
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-5 gap-4' },
              h('div', { className: 'lg:col-span-3 bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, t('stem.bikelab.click_any_part_of_the_bike', 'Click any part of the bike')),
                  h('div', { role: 'group', 'aria-label': 'Diagram or 3D model', className: 'flex gap-1' },
                    [[false, 'Diagram'], [true, '3D model']].map(function(opt) {
                      return h('button', { key: String(opt[0]), type: 'button', 'data-bikelab-parts-view': opt[0] ? '3d' : '2d', 'aria-pressed': view3d === opt[0] ? 'true' : 'false',
                        onClick: function() { setView3d(opt[0]); },
                        className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (view3d === opt[0] ? 'border-indigo-700 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500') }, opt[1]);
                    })
                  )
                ),
                h('svg', { role: 'img', 'aria-label': 'Bicycle parts diagram. Selected part: ' + selected.name + '. Use the Parts by category buttons to select a part.', viewBox: '0 0 500 300', className: 'w-full h-auto', style: { maxHeight: '420px', display: view3d ? 'none' : 'block' } },
                 // Mirrored, so the bike faces right and the chain is on its right-hand side, as on a real bike.
                 h('g', { transform: 'matrix(-1 0 0 1 500 0)' },
                  // ground
                  h('ellipse', { cx: 120, cy: 296, rx: 46, ry: 4, fill: '#e2e8f0' }), h('ellipse', { cx: 425, cy: 296, rx: 46, ry: 4, fill: '#e2e8f0' }),
                  h('line', { x1: 40, y1: 295, x2: 480, y2: 295, stroke: '#cbd5e1', strokeWidth: 2, strokeLinecap: 'round' }),
                  // wheels: tire, rim, spokes, hub
                  [120, 425].map(function(wx) {
                    return h('g', { key: 'wheel' + wx },
                      h('circle', { cx: wx, cy: 250, r: 44, fill: 'none', stroke: '#1f2937', strokeWidth: 9 }),
                      h('circle', { cx: wx, cy: 250, r: 44, fill: 'none', stroke: '#4b5563', strokeWidth: 1.5, strokeDasharray: '3 5' }),
                      h('circle', { cx: wx, cy: 250, r: 35, fill: 'none', stroke: '#94a3b8', strokeWidth: 4 }),
                      [0, 1, 2, 3, 4, 5, 6, 7].map(function(i) {
                        var ang = i * Math.PI / 8;
                        return h('line', { key: i, x1: wx - 33 * Math.cos(ang), y1: 250 - 33 * Math.sin(ang), x2: wx + 33 * Math.cos(ang), y2: 250 + 33 * Math.sin(ang), stroke: '#94a3b8', strokeWidth: 1 });
                      }),
                      h('circle', { cx: wx, cy: 250, r: 7, fill: '#475569', stroke: '#1e293b', strokeWidth: 1.5 }));
                  }),
                  // frame: rear triangle first, then the main tubes
                  h('line', { x1: 300, y1: 95, x2: 425, y2: 250, stroke: '#0f766e', strokeWidth: 5, strokeLinecap: 'round' }),
                  h('line', { x1: 300, y1: 240, x2: 425, y2: 250, stroke: '#0f766e', strokeWidth: 5, strokeLinecap: 'round' }),
                  h('line', { x1: 175, y1: 96, x2: 300, y2: 95, stroke: '#0d9488', strokeWidth: 8, strokeLinecap: 'round' }),
                  h('line', { x1: 176, y1: 164, x2: 300, y2: 240, stroke: '#0d9488', strokeWidth: 9, strokeLinecap: 'round' }),
                  h('line', { x1: 300, y1: 95, x2: 300, y2: 240, stroke: '#0d9488', strokeWidth: 8, strokeLinecap: 'round' }),
                  h('line', { x1: 171, y1: 97, x2: 175, y2: 163, stroke: '#115e59', strokeWidth: 11, strokeLinecap: 'round' }),
                  // fork
                  h('line', { x1: 174, y1: 166, x2: 120, y2: 250, stroke: '#334155', strokeWidth: 6, strokeLinecap: 'round' }),
                  // seatpost + saddle
                  h('line', { x1: 300, y1: 68, x2: 300, y2: 96, stroke: '#64748b', strokeWidth: 5, strokeLinecap: 'round' }),
                  h('path', { d: 'M 277 63 Q 300 52 327 60 Q 329 67 318 67 L 285 68 Q 275 69 277 63 Z', fill: '#1e293b' }),
                  // stem, handlebar, grip, brake lever, shifter
                  h('line', { x1: 171, y1: 96, x2: 150, y2: 88, stroke: '#475569', strokeWidth: 6, strokeLinecap: 'round' }),
                  h('line', { x1: 150, y1: 88, x2: 90, y2: 88, stroke: '#334155', strokeWidth: 5, strokeLinecap: 'round' }),
                  h('line', { x1: 88, y1: 88, x2: 108, y2: 88, stroke: '#111827', strokeWidth: 8, strokeLinecap: 'round' }),
                  h('line', { x1: 113, y1: 90, x2: 100, y2: 107, stroke: '#64748b', strokeWidth: 4, strokeLinecap: 'round' }),
                  h('rect', { x: 120, y: 93, width: 15, height: 9, rx: 2, fill: '#f59e0b', stroke: '#92400e', strokeWidth: 1 }),
                  // front brake: cable from the lever, caliper where the fork meets the rim
                  h('path', { d: 'M 111 93 Q 152 140 143 203', fill: 'none', stroke: '#64748b', strokeWidth: 1.5 }),
                  h('rect', { x: 132, y: 204, width: 20, height: 13, rx: 3, fill: '#f43f5e', stroke: '#881337', strokeWidth: 1.5 }),
                  // drivetrain: chain, chainring + crank + pedal, cassette, rear derailleur
                  h('line', { x1: 300, y1: 221, x2: 425, y2: 236, stroke: '#7c3aed', strokeWidth: 3, strokeDasharray: '4 2' }),
                  h('path', { d: 'M 300 259 L 419 291 L 426 264', fill: 'none', stroke: '#7c3aed', strokeWidth: 3, strokeDasharray: '4 2' }),
                  h('circle', { cx: 300, cy: 240, r: 19, fill: '#ede9fe', stroke: '#6d28d9', strokeWidth: 3 }),
                  h('circle', { cx: 300, cy: 240, r: 19, fill: 'none', stroke: '#4c1d95', strokeWidth: 2, strokeDasharray: '2 3' }),
                  h('circle', { cx: 300, cy: 240, r: 5, fill: '#4c1d95' }),
                  h('line', { x1: 300, y1: 240, x2: 318, y2: 266, stroke: '#334155', strokeWidth: 5, strokeLinecap: 'round' }),
                  h('rect', { x: 311, y: 264, width: 18, height: 6, rx: 2, fill: '#111827' }),
                  h('circle', { cx: 425, cy: 250, r: 14, fill: '#ede9fe', stroke: '#6d28d9', strokeWidth: 2 }),
                  h('circle', { cx: 425, cy: 250, r: 9, fill: 'none', stroke: '#6d28d9', strokeWidth: 1.5 }),
                  h('rect', { x: 414, y: 267, width: 13, height: 9, rx: 2, fill: '#7c3aed', stroke: '#4c1d95', strokeWidth: 1 }),
                  h('line', { x1: 420, y1: 276, x2: 420, y2: 290, stroke: '#4c1d95', strokeWidth: 2 }),
                  h('circle', { cx: 420, cy: 279, r: 3.5, fill: '#c4b5fd', stroke: '#4c1d95', strokeWidth: 1 }),
                  h('circle', { cx: 420, cy: 290, r: 3.5, fill: '#c4b5fd', stroke: '#4c1d95', strokeWidth: 1 }),
                  selected && partShape(selected, { key: 'sel', fill: 'none', stroke: '#f59e0b', strokeWidth: 4, 'aria-hidden': 'true', style: { pointerEvents: 'none' } }, true),
                  BIKE_PARTS.slice().sort(function(a, b) { return partArea(b) - partArea(a); }).map(function(p) {
                    return partShape(p, { key: p.id, 'data-bikelab-part': p.id, style: { cursor: 'pointer' },
                      onClick: function() { setSelectedId(p.id); upd('partsLastId', p.id); } }, false, h('title', null, p.name));
                  })
                 )
                ),
                view3d && h('div', { 'data-bikelab-3d': threeStatus },
                  h('div', { ref: mountRef, role: 'img', 'aria-label': '3D model of a bicycle. Selected part: ' + selected.name + '. Use the Parts by category buttons to select a part, and the buttons under the model to turn it.', className: 'relative w-full rounded-lg overflow-hidden', style: { background: 'linear-gradient(#f8fafc, #e2e8f0)', minHeight: '160px' } },
                    h('div', { ref: hoverRef, 'aria-hidden': 'true', className: 'absolute top-2 left-2 px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold', style: { display: 'none', pointerEvents: 'none', zIndex: 2 } })
                  ),
                  threeStatus === 'loading' && h('p', { role: 'status', className: 'text-sm text-slate-700 mt-2' }, 'Loading the 3D model…'),
                  threeStatus === 'error' && h('div', { role: 'alert', className: 'text-sm text-slate-800 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-300' },
                    'The 3D model could not start on this device. The diagram shows the same parts. ',
                    h('button', { type: 'button', onClick: function() { setView3d(false); }, className: 'underline font-bold text-indigo-800' }, 'Back to the diagram')),
                  threeStatus === 'ready' && h('div', { className: 'mt-3 space-y-2' },
                    h('p', { className: 'text-sm text-slate-700' }, 'Drag the bike to turn it. Click a part to read about it.'),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      camBtn('Chain side', 'Show the chain side', function(sc) { sc.view(0, 0.08, 27); }),
                      camBtn('Other side', 'Show the side without the chain', function(sc) { sc.view(Math.PI, 0.08, 27); }),
                      camBtn('Front', 'Show the bike from the front', function(sc) { sc.view(Math.PI / 2, 0.12, 27); }),
                      camBtn('From above', 'Show the bike from above', function(sc) { sc.view(0.3, 1.3, 27); }),
                      camBtn('Reset view', 'Reset the view', function(sc) { sc.view(0.55, 0.22, 27); })
                    ),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      camBtn('◀ Turn', 'Turn the bike left', function(sc) { sc.turn(-0.3, 0); }),
                      camBtn('Turn ▶', 'Turn the bike right', function(sc) { sc.turn(0.3, 0); }),
                      camBtn('▲ Tilt', 'Look from higher up', function(sc) { sc.turn(0, 0.2); }),
                      camBtn('▼ Tilt', 'Look from lower down', function(sc) { sc.turn(0, -0.2); }),
                      camBtn('＋ Zoom', 'Zoom in', function(sc) { sc.zoom(0.85); }),
                      camBtn('－ Zoom', 'Zoom out', function(sc) { sc.zoom(1.18); })
                    ),
                    h('label', { htmlFor: 'bikelab-parts-explode', className: 'flex flex-wrap justify-between gap-x-3 text-sm font-bold text-slate-700 pt-1' },
                      h('span', null, 'Pull the bike apart'), h('span', { className: 'text-indigo-700' }, explode === 0 ? 'Assembled' : explode + '%')),
                    h('input', { id: 'bikelab-parts-explode', type: 'range', min: 0, max: 100, step: 5, value: explode,
                      onChange: function(e) { var v = parseInt(e.target.value); setExplode(isFinite(v) ? v : 0); },
                      className: 'w-full accent-indigo-600' })
                  )
                )
              ),
              h('div', { className: 'lg:col-span-2 space-y-3' },
                h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 overflow-hidden' },
                  h('div', { className: 'p-4 bg-gradient-to-br from-slate-700 to-slate-900 text-white' },
                    h('div', { className: 'flex items-center justify-between mb-1' },
                      h('span', { className: 'text-xs font-bold uppercase tracking-wider opacity-70' }, selected.cat),
                      selected.repairJob && h('span', { className: 'bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider' }, t('stem.bikelab.has_repair_job', 'Has repair job'))
                    ),
                    h('h3', { className: 'text-2xl font-black' }, selected.name)
                  ),
                  h('div', { className: 'p-4 space-y-3' },
                    h('div', null,
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-1' }, t('stem.bikelab.function', 'Function')),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, selected.fn)
                    ),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-1' }, t('stem.bikelab.common_issues', 'Common Issues')),
                      h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, selected.issues)
                    ),
                    selected.repairJob && h('button', {
                      onClick: function() {
                        upd('repairJobId', selected.repairJob);
                        goto('repair');
                      },
                      className: 'w-full py-2.5 px-4 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm transition-colors shadow'
                    }, t('stem.bikelab.open_related_repair_job', '🔧 Open related repair job →'))
                  )
                ),
                h('div', { className: 'bg-slate-100 rounded-xl p-3' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.bikelab.parts_by_category', 'Parts by category')),
                  CATEGORIES.map(function(c) {
                    var parts = BIKE_PARTS.filter(function(p) { return p.cat === c.id; });
                    return h('div', { key: c.id, className: 'mb-2' },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', { className: 'w-3 h-3 rounded ' + c.color }),
                        h('span', { className: 'text-xs font-bold text-slate-700' }, c.id + ' (' + parts.length + ')')
                      ),
                      h('div', { className: 'flex flex-wrap gap-1 pl-5' },
                        parts.map(function(p) {
                          return h('button', {
                            key: p.id,
                            onClick: function() { setSelectedId(p.id); upd('partsLastId', p.id); },
                            className: 'text-xs px-2 py-0.5 rounded border transition-colors ' + (selectedId === p.id ? 'border-indigo-700 bg-indigo-600 text-white font-bold' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                          }, p.name);
                        })
                      )
                    );
                  })
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // HELMET FIT CHECKER
      // ─────────────────────────────────────────────────────
      // Interactive helmet fit using the "2V1 rule": helmet sits 2 fingers above
      // the eyebrows, side straps form a V (or Y) under each ear, and the chin
      // strap allows only 1 finger of slack. Three sliders drive an SVG diagram;
      // a live verdict tells the student which adjustment is off.
      // A rider's head seen from the side, facing right. v = { tilt, strap, chin, snug }.
      //   tilt:  -1 pulled down over the eyes · 0 level · +1 tipped back
      //   strap: -1 buckle up on the ear · 0 the Y meets just under the ear · +1 hanging by the jaw
      //   chin:  0 too tight · 0.5 one finger fits · 1 hanging loose
      //   snug:  0 pinching · 0.5 snug · 1 loose on the head
      // One drawing serves both the sliders and the "check these riders" cases, so the picture and the labels cannot disagree.
      function helmetChecks(v) {
        return { tilt: Math.abs(v.tilt) < 0.25, strap: Math.abs(v.strap) < 0.25, chin: v.chin > 0.35 && v.chin < 0.65, snug: v.snug > 0.35 && v.snug < 0.65 };
      }
      function helmetSideSvg(v, o) {
        o = o || {};
        var ok = helmetChecks(v), plain = !!o.plain;
        var deg = -v.tilt * 24;                                  // tipped back = the front edge rises
        var drop = v.tilt < 0 ? -v.tilt * 12 : -v.tilt * 3;      // pulled down over the eyes, or riding up
        var scale = 1 + Math.max(0, v.snug - 0.5) * 0.36;        // a helmet that is too big stands off the head
        var cx = 116, cy = 118, rad = deg * Math.PI / 180;
        var place = function(x, y) {
          var dx = (x - cx) * scale, dy = (y - cy) * scale;
          return [cx + dx * Math.cos(rad) - dy * Math.sin(rad), cy + dx * Math.sin(rad) + dy * Math.cos(rad) + drop];
        };
        var F = place(134, 104), R = place(78, 127);             // where the two side straps leave the helmet
        var J = [110, 150 + v.strap * (v.strap > 0 ? 22 : 20)];  // where they meet
        var chinY = v.chin <= 0.5 ? 176 + v.chin * 14 : 183 + (v.chin - 0.5) * 42;
        var dark = '#1e293b', bad = '#dc2626', skin = '#fed7aa', skinLine = '#9a6c4a';
        var sideColor = plain || ok.strap ? dark : bad, chinColor = plain || ok.chin ? dark : bad;
        var shellColor = plain || (ok.tilt && ok.snug) ? '#ec4899' : '#f59e0b';
        return h('svg', { viewBox: '0 0 240 260', className: o.className || 'w-full h-64 mx-auto', role: 'img', 'aria-label': o.label || 'Rider with a helmet, seen from the side' },
          h('rect', { x: 0, y: 0, width: 240, height: 260, fill: '#f8fafc' }),
          h('path', { d: 'M 34 260 Q 52 224 110 218 Q 172 222 198 260 Z', fill: '#cbd5e1' }),
          h('rect', { x: 94, y: 180, width: 38, height: 46, fill: skin }),
          h('ellipse', { cx: 116, cy: 124, rx: 52, ry: 60, fill: skin, stroke: skinLine, strokeWidth: 1 }),
          h('path', { d: 'M 165 132 L 181 149 L 164 153 Z', fill: skin, stroke: skinLine, strokeWidth: 1, strokeLinejoin: 'round' }),
          h('ellipse', { cx: 108, cy: 132, rx: 8, ry: 12, fill: '#fdba74', stroke: skinLine, strokeWidth: 1 }),
          h('line', { x1: 141, y1: 118, x2: 159, y2: 116, stroke: '#7c4a2d', strokeWidth: 3, strokeLinecap: 'round' }),
          h('circle', { cx: 151, cy: 128, r: 3, fill: dark }),
          h('line', { x1: 146, y1: 163, x2: 157, y2: 161, stroke: skinLine, strokeWidth: 2, strokeLinecap: 'round' }),
          // guides: two fingers above the eyebrow, one finger under the chin
          !plain && h('g', { 'aria-hidden': 'true' },
            h('rect', { x: 180, y: 103.5, width: 18, height: 6, rx: 3, fill: '#fef3c7', stroke: '#b45309', strokeWidth: 1, strokeDasharray: '2 2' }),
            h('rect', { x: 180, y: 110.5, width: 18, height: 6, rx: 3, fill: '#fef3c7', stroke: '#b45309', strokeWidth: 1, strokeDasharray: '2 2' }),
            h('text', { x: 201, y: 114, fill: '#92400e', fontSize: 9, fontWeight: 'bold' }, '2 fingers'),
            h('line', { x1: 160, y1: 117, x2: 200, y2: 117, stroke: '#b45309', strokeWidth: 0.75, strokeDasharray: '2 2' })),
          // side straps, then the chin strap with its buckle
          h('line', { x1: F[0], y1: F[1], x2: J[0], y2: J[1], stroke: sideColor, strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('line', { x1: R[0], y1: R[1], x2: J[0], y2: J[1], stroke: sideColor, strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('path', { d: 'M ' + J[0] + ' ' + J[1] + ' Q 116 ' + (chinY + 3) + ' 138 ' + chinY + ' Q 148 ' + (chinY - 1) + ' 152 ' + (chinY - 8), fill: 'none', stroke: chinColor, strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('rect', { x: J[0] - 4, y: J[1] - 3, width: 8, height: 6, rx: 1.5, fill: sideColor }),
          // the helmet itself
          h('g', { transform: 'translate(0 ' + drop.toFixed(2) + ') rotate(' + deg.toFixed(2) + ' ' + cx + ' ' + cy + ') translate(' + cx + ' ' + cy + ') scale(' + scale.toFixed(3) + ') translate(' + (-cx) + ' ' + (-cy) + ')' },
            h('path', { d: 'M 58 130 Q 52 56 116 54 Q 172 54 176 102 L 158 106 Q 116 98 84 122 L 66 136 Z', fill: shellColor, stroke: '#831843', strokeWidth: 1.5, strokeLinejoin: 'round' }),
            h('rect', { x: 84, y: 74, width: 16, height: 5, rx: 2.5, fill: '#831843', transform: 'rotate(-28 92 76)' }),
            h('rect', { x: 108, y: 66, width: 16, height: 5, rx: 2.5, fill: '#831843' }),
            h('rect', { x: 132, y: 72, width: 16, height: 5, rx: 2.5, fill: '#831843', transform: 'rotate(24 140 74)' })),
          // a helmet that is too big wobbles
          v.snug >= 0.65 && h('g', { 'aria-hidden': 'true', fill: 'none', stroke: '#64748b', strokeWidth: 2, strokeLinecap: 'round' },
            h('path', { d: 'M 36 84 Q 28 100 36 116' }), h('path', { d: 'M 26 78 Q 15 100 26 122' }),
            h('path', { d: 'M 200 62 Q 208 76 202 90' })),
          // a helmet that is too small pinches
          v.snug <= 0.35 && h('g', { 'aria-hidden': 'true', stroke: plain ? '#64748b' : bad, strokeWidth: 2, strokeLinecap: 'round' },
            h('line', { x1: 176, y1: 92, x2: 186, y2: 88 }), h('line', { x1: 177, y1: 98, x2: 188, y2: 98 }), h('line', { x1: 50, y1: 112, x2: 40, y2: 110 }))
        );
      }
      var HELMET_PROBLEMS = [
        { id: 'tilt_back', label: 'It is tipped back, so the forehead is bare' },
        { id: 'tilt_low', label: 'It is pulled down over the eyes' },
        { id: 'strap', label: 'The side straps do not meet under the ear' },
        { id: 'chin', label: 'The chin strap is too loose' },
        { id: 'loose', label: 'The helmet is too big and wobbles' },
        { id: 'ok', label: 'Nothing. This rider is ready to go' }
      ];
      var HELMET_CASES = [
        { id: 'back', v: { tilt: 0.9, strap: 0, chin: 0.5, snug: 0.5 }, answer: 'tilt_back', look: 'The front edge of the helmet sits far above the eyebrows.', why: 'A helmet that is tipped back leaves the forehead with no protection. Pull it forward until it is level, two fingers above the eyebrows.' },
        { id: 'chin', v: { tilt: 0, strap: 0, chin: 0.97, snug: 0.5 }, answer: 'chin', look: 'The chin strap hangs well below the chin.', why: 'With a loose chin strap the helmet can come off in a crash. Tighten it until only one finger fits between the strap and the chin.' },
        { id: 'fine', v: { tilt: 0, strap: 0, chin: 0.5, snug: 0.5 }, answer: 'ok', look: 'The helmet is level and the straps sit close to the head.', why: 'Level, two fingers above the eyebrows, side straps meeting under the ear, one finger under the chin strap, and snug. Nothing to fix.' },
        { id: 'low', v: { tilt: -0.9, strap: 0, chin: 0.5, snug: 0.5 }, answer: 'tilt_low', look: 'The front edge of the helmet is down at the eyes.', why: 'A helmet pulled too far down blocks your view of the road. Lift the front until it sits two fingers above the eyebrows.' },
        { id: 'strap', v: { tilt: 0, strap: 0.95, chin: 0.5, snug: 0.5 }, answer: 'strap', look: 'The side straps meet low down, near the jaw.', why: 'The two side straps should meet in a Y just under the ear. When they meet lower, the helmet can rock forward and back. Slide the strap buckle up.' },
        { id: 'big', v: { tilt: 0, strap: 0, chin: 0.5, snug: 0.97 }, answer: 'loose', look: 'There is a gap between the helmet and the head.', why: 'A helmet that is too big moves around and can slide out of place. Tighten the dial at the back, or add pads, until it stays put when you shake your head.' }
      ];
      var HELMET_SPOT_PASS = 5;

      function HelmetFit() {
        var tiltState = useState(0.7), tilt = tiltState[0], setTilt = tiltState[1];
        var strapState = useState(0.6), strap = strapState[0], setStrap = strapState[1];
        var chinState = useState(0.8), chin = chinState[0], setChin = chinState[1];
        var snugState = useState(0.85), snug = snugState[0], setSnug = snugState[1];
        var vals = { tilt: tilt, strap: strap, chin: chin, snug: snug };
        var ok = helmetChecks(vals);
        var allOk = ok.tilt && ok.strap && ok.chin && ok.snug;
        useEffect(function() { if (allOk && !d.helmetFitDone) upd('helmetFitDone', true); }, [allOk]);

        var tiltLabel = tilt <= -0.6 ? '✗ Too low: it covers the eyes' : tilt <= -0.25 ? '⚠ A bit low' : tilt < 0.25 ? '✓ Level, two fingers above the eyebrows' : tilt < 0.6 ? '⚠ Tipping back' : '✗ Tipped back: the forehead is bare';
        var strapLabel = strap <= -0.6 ? '✗ The buckle sits on the ear' : strap <= -0.25 ? '⚠ A bit high' : strap < 0.25 ? '✓ The Y meets just under the ear' : strap < 0.6 ? '⚠ A bit low' : '✗ The straps hang down by the jaw';
        var chinLabel = chin < 0.2 ? '✗ Too tight to be comfortable' : chin <= 0.35 ? '⚠ A little tight' : chin < 0.65 ? '✓ One finger fits' : chin < 0.85 ? '⚠ A little loose' : '✗ Too loose: the helmet can come off';
        var snugLabel = snug < 0.2 ? '✗ Too tight: it pinches' : snug <= 0.35 ? '⚠ A little tight' : snug < 0.65 ? '✓ Snug: it stays put when you shake your head' : snug < 0.85 ? '⚠ A little loose' : '✗ Too big: it slides around';
        var tone = function(good, label) { return good ? 'text-emerald-700' : label.charAt(0) === '⚠' ? 'text-amber-700' : 'text-rose-700'; };

        var sliderRow = function(id, label, value, setter, min, max, step, statusText, statusColor, ends) {
          return h('div', { className: 'bg-white rounded-xl p-4 shadow border border-slate-300' },
            h('label', { htmlFor: id, className: 'flex flex-wrap items-center justify-between gap-x-3 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' },
              h('span', null, label),
              h('span', { className: 'normal-case text-xs font-semibold ' + statusColor }, statusText)
            ),
            h('input', {
              id: id, type: 'range', min: min, max: max, step: step, value: value,
              onChange: function(e) {
                var nv = parseFloat(e.target.value);
                setter(isFinite(nv) ? nv : 0);
              },
              'aria-valuetext': statusText,
              className: 'w-full accent-pink-500'
            }),
            h('div', { 'aria-hidden': 'true', className: 'flex justify-between text-xs text-slate-600' }, h('span', null, ends[0]), h('span', null, ends[1]))
          );
        };

        // ── Check these riders: name what is wrong before the answer is shown
        var attemptState = useState(0), attempt = attemptState[0], setAttempt = attemptState[1];
        var caseIdxState = useState(0), caseIdx = caseIdxState[0], setCaseIdx = caseIdxState[1];
        var picksState = useState({}), picks = picksState[0], setPicks = picksState[1];
        var shiftBy = (attempt * 2) % HELMET_CASES.length;
        var cases = HELMET_CASES.slice(shiftBy).concat(HELMET_CASES.slice(0, shiftBy));
        var answeredCount = cases.filter(function(c) { return picks[c.id]; }).length;
        var spotScore = cases.filter(function(c) { return picks[c.id] === c.answer; }).length;
        var spotFinished = answeredCount === cases.length;
        var showSummary = spotFinished && caseIdx >= cases.length;
        var cur = cases[Math.min(caseIdx, cases.length - 1)];
        var curPick = picks[cur.id];
        var pickProblem = function(pid) {
          if (curPick) return;
          var next = Object.assign({}, picks); next[cur.id] = pid;
          setPicks(next);
          var score = cases.filter(function(c) { return next[c.id] === c.answer; }).length;
          if (cases.every(function(c) { return next[c.id]; }) && score > (+d.helmetSpotBest || 0)) upd('helmetSpotBest', score);
        };
        var retrySpot = function() { setPicks({}); setCaseIdx(0); setAttempt(attempt + 1); };
        var problemLabel = function(pid) { var p = HELMET_PROBLEMS.filter(function(x) { return x.id === pid; })[0]; return p ? p.label : ''; };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '⛑️', title: t('stem.bikelab.helmet_fit_checker_2', 'Helmet Fit Checker') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-4 self-start' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '1. Fit this helmet'),
                helmetSideSvg(vals, { label: 'Rider seen from the side. Helmet position: ' + tiltLabel + '. Side straps: ' + strapLabel + '. Chin strap: ' + chinLabel + '. Size: ' + snugLabel }),
                h('div', { 'aria-live': 'polite', 'data-helmet-verdict': allOk ? 'good' : 'adjust', className: 'mt-3 p-3 rounded-lg text-center font-bold ' + (allOk ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800' : 'bg-amber-50 border-2 border-amber-400 text-amber-800') },
                  allOk ? '✓ Good fit. Ready to ride.' : '⚠ Move the sliders until all four checks pass.'
                )
              ),
              h('div', { className: 'space-y-3' },
                sliderRow('bikelab-helmet-position', 'Helmet position', tilt, setTilt, -1, 1, 0.02, tiltLabel, tone(ok.tilt, tiltLabel), ['Down over the eyes', 'Tipped back']),
                sliderRow('bikelab-strap-angle', 'Side straps', strap, setStrap, -1, 1, 0.02, strapLabel, tone(ok.strap, strapLabel), ['Up on the ear', 'Down by the jaw']),
                sliderRow('bikelab-chin-slack', 'Chin strap', chin, setChin, 0, 1, 0.01, chinLabel, tone(ok.chin, chinLabel), ['Tight', 'Loose']),
                sliderRow('bikelab-helmet-snug', 'Size dial', snug, setSnug, 0, 1, 0.01, snugLabel, tone(ok.snug, snugLabel), ['Tight', 'Loose']),
                h('div', { className: 'bg-pink-50 border border-pink-300 rounded-xl p-4' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-pink-800 mb-2' }, '📏 The four checks'),
                  h('ul', { className: 'space-y-2 text-sm text-slate-700' },
                    h('li', null, h('strong', null, 'Eyes: '), 'the helmet sits level, two fingers above your eyebrows. Not tipped back, not down over your eyes.'),
                    h('li', null, h('strong', null, 'Ears: '), 'the two side straps meet in a Y just under each ear.'),
                    h('li', null, h('strong', null, 'Mouth: '), 'buckle the chin strap. Only one finger should fit between the strap and your chin.'),
                    h('li', null, h('strong', null, 'Shake: '), 'shake your head. A helmet that fits stays put. If it slides, tighten the dial at the back.')
                  ),
                  h('div', { className: 'text-xs text-slate-600 mt-3' },
                    h('strong', null, t('stem.bikelab.why_it_matters', 'Why it matters: ')),
                    t('stem.bikelab.helmet_fit_why_v2', 'A loose or tilted helmet can slide out of place in a crash and leave part of your head unprotected. A helmet protects you best when it sits level, feels snug, and the straps are buckled.')
                  )
                )
              )
            ),
            h('div', { 'data-helmet-spot': showSummary ? 'summary' : 'case', className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700' }, '2. Check these riders'),
                h('div', { className: 'text-xs font-bold text-slate-600' }, showSummary ? 'Finished' : 'Rider ' + (caseIdx + 1) + ' of ' + cases.length)
              ),
              showSummary
                ? h('div', { role: 'status', className: 'text-center py-4' },
                    h('div', { className: 'text-2xl font-black text-slate-800' }, 'You spotted ' + spotScore + ' of ' + cases.length),
                    h('p', { className: 'text-sm text-slate-700 mt-1' }, spotScore >= HELMET_SPOT_PASS ? 'You can check a friend\'s helmet before a ride.' : 'Get ' + HELMET_SPOT_PASS + ' of ' + cases.length + ' to master this. Have another go.'),
                    h('button', { type: 'button', onClick: retrySpot, className: 'mt-3 px-4 py-2 rounded-lg font-bold text-sm bg-pink-700 hover:bg-pink-800 text-white' }, 'Try again')
                  )
                : h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start' },
                    helmetSideSvg(cur.v, { plain: true, className: 'w-full h-56 mx-auto', label: 'Rider ' + (caseIdx + 1) + ', seen from the side. ' + cur.look }),
                    h('div', null,
                      h('div', { className: 'text-sm font-bold text-slate-800 mb-2' }, 'What is wrong with this rider\'s helmet?'),
                      h('div', { className: 'space-y-2' },
                        HELMET_PROBLEMS.map(function(p) {
                          var isPick = curPick === p.id, isAnswer = cur.answer === p.id;
                          var look = !curPick ? 'border-slate-300 bg-white hover:border-slate-500' : isAnswer ? 'border-emerald-500 bg-emerald-50' : isPick ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white';
                          return h('button', {
                            key: p.id, type: 'button', 'data-helmet-problem': p.id,
                            onClick: function() { pickProblem(p.id); },
                            'aria-disabled': curPick ? 'true' : 'false', 'aria-pressed': isPick ? 'true' : 'false',
                            className: 'w-full text-left px-3 py-2 rounded-lg border-2 text-sm font-medium text-slate-800 ' + look
                          }, p.label, curPick && isAnswer ? ' ✓' : curPick && isPick ? ' ✗' : '');
                        })
                      ),
                      curPick && h('div', { role: 'status', className: 'mt-3 p-3 rounded-lg border text-sm text-slate-700 ' + (curPick === cur.answer ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') },
                        h('strong', null, curPick === cur.answer ? 'Right. ' : 'Not quite. The answer is: ' + problemLabel(cur.answer) + '. '), cur.why),
                      curPick && h('button', { type: 'button', 'data-helmet-next': 'true', onClick: function() { setCaseIdx(caseIdx + 1); }, className: 'mt-3 px-4 py-2 rounded-lg font-bold text-sm bg-pink-700 hover:bg-pink-800 text-white' },
                        caseIdx >= cases.length - 1 ? 'See your score' : 'Next rider →')
                    )
                  )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAINE WINTER BIKING GUIDE
      // ─────────────────────────────────────────────────────
      // Maine-specific cold-weather cycling content. Sectioned guide with a
      // winterization checklist the user can tick through. Targets the gap
      // identified in the audit: existing safety quiz mentions winter conditions
      // but no module dedicated to year-round Maine riding.
      // "Should you ride?" situations. One safest choice each: go, fix one thing first, or not today.
      var WINTER_CHOICES = [
        { id: 'go', label: 'Good to go' },
        { id: 'fix', label: 'Fix one thing first' },
        { id: 'no', label: 'Not today' }
      ];
      var WINTER_CASES = [
        { id: 'dry-cold', answer: 'go', scene: 'Saturday at noon. It is 34°F and sunny. The roads are dry and clear. You have a helmet, gloves and warm layers.',
          why: 'Cold on its own is not a reason to stay home. The road is dry, it is daylight, and you are dressed for it.' },
        { id: 'dusk', answer: 'fix', scene: 'A December school day. You are leaving a friend\'s house at 4:15 pm. The roads are dry. Your lights are in your backpack, not on your bike.',
          why: 'In a Maine December the sun sets at about 4 o\'clock, so it is already getting dark. Put the lights on the bike and switch them on before you go: white at the front, red at the back.' },
        { id: 'black-ice', answer: 'no', scene: 'Early morning. It is 30°F and it rained last night. The road looks dark and wet, and shiny in the shade.',
          why: 'A road that looks wet when it is below freezing may be black ice: thin, clear ice you cannot see. Tires have almost no grip on it. Walk, or get a ride.' },
        { id: 'no-gloves', answer: 'fix', scene: 'It is 28°F, the roads are dry, and it is daytime. You are wearing a hoodie and no gloves. The ride takes 20 minutes.',
          why: 'Riding makes its own wind, so your hands get cold fast. Numb fingers cannot squeeze the brakes properly. Put on gloves and a wind-blocking layer first.' },
        { id: 'fresh-snow', answer: 'no', scene: 'Four inches of new snow fell overnight and the plow has not come yet. Your bike has ordinary smooth tires.',
          why: 'Smooth tires slide in deep snow, and you cannot see ice or potholes under it. Drivers also have less control. Wait until the road is plowed.' },
        { id: 'cleared', answer: 'go', scene: 'Two days after a storm. The roads are plowed, dry and salted. It is 25°F and sunny at 1 pm. Your lights are on and you have a bright jacket and gloves.',
          why: 'The road is clear and dry, it is daylight, you can be seen and you are dressed for the cold. Remember to rinse the salt off your bike afterwards.' }
      ];
      var WINTER_PASS = 5;
      // About when the sun sets in Portland, Maine, mid-month (clock time, to the nearest five minutes).
      var MAINE_SUNSETS = [
        { month: 'October', label: '5:55 pm', hour: 17.92 }, { month: 'November', label: '4:15 pm', hour: 16.25 }, { month: 'December', label: '4:05 pm', hour: 16.08 },
        { month: 'January', label: '4:30 pm', hour: 16.5 }, { month: 'February', label: '5:10 pm', hour: 17.17 }, { month: 'March', label: '6:45 pm', hour: 18.75 }
      ];

      function WinterBike() {
        var checkState = useState((d.winterChecks && typeof d.winterChecks === 'object') ? d.winterChecks : {}), checks = checkState[0], setChecks = checkState[1];
        var toggleCheck = function(id) {
          var next = Object.assign({}, checks);
          next[id] = !next[id];
          setChecks(next); upd('winterChecks', next);
        };
        var checklistItems = [
          { id: 'lights', label: 'Lights are on the bike and working: white at the front, red at the back' },
          { id: 'visibility', label: 'I am wearing something bright or reflective' },
          { id: 'brakes', label: 'Both brakes work, and I can squeeze them with my gloves on' },
          { id: 'tires', label: 'Tires are pumped up and not worn smooth' },
          { id: 'layering', label: 'I have layers on, with gloves and something over my ears' },
          { id: 'route', label: 'An adult knows my route, and the roads on it are plowed' },
          { id: 'wash', label: 'After the ride: rinse off the road salt, dry the chain and oil it' }
        ];
        var doneCount = checklistItems.filter(function(it) { return checks[it.id]; }).length;
        var allChecked = doneCount === checklistItems.length;

        // ── Should you ride?
        var attemptState = useState(0), attempt = attemptState[0], setAttempt = attemptState[1];
        var caseIdxState = useState(0), caseIdx = caseIdxState[0], setCaseIdx = caseIdxState[1];
        var picksState = useState({}), picks = picksState[0], setPicks = picksState[1];
        var shiftBy = (attempt * 2) % WINTER_CASES.length;
        var cases = WINTER_CASES.slice(shiftBy).concat(WINTER_CASES.slice(0, shiftBy));
        var score = cases.filter(function(c) { return picks[c.id] === c.answer; }).length;
        var showSummary = caseIdx >= cases.length;
        var cur = cases[Math.min(caseIdx, cases.length - 1)];
        var curPick = picks[cur.id];
        var pickChoice = function(cid) {
          if (curPick) return;
          var next = Object.assign({}, picks); next[cur.id] = cid;
          setPicks(next);
          var nextScore = cases.filter(function(c) { return next[c.id] === c.answer; }).length;
          if (cases.every(function(c) { return next[c.id]; }) && nextScore > (+d.winterBest || 0)) upd('winterBest', nextScore);
        };
        var retryCases = function() { setPicks({}); setCaseIdx(0); setAttempt(attempt + 1); };
        var choiceLabel = function(cid) { var c = WINTER_CHOICES.filter(function(x) { return x.id === cid; })[0]; return c ? c.label : ''; };

        // ── How far to stop? Uses the same stopping model as the Braking lab.
        var stopMphState = useState(10), stopMph = stopMphState[0], setStopMph = stopMphState[1];
        var stops = [['dry', 'Dry road', 'bg-emerald-600'], ['wet', 'Wet road', 'bg-sky-600'], ['ice', 'Ice', 'bg-rose-600']].map(function(sf) {
          var r = brakingStop(stopMph, sf[0], 'both', 1);
          return { key: sf[0], label: sf[1], color: sf[2], total: r.total, braking: r.braking };
        });
        var longest = stops[stops.length - 1].total, iceTimes = stops[2].braking / stops[0].braking;

        var section = function(icon, title, body, accent) {
          return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl', 'aria-hidden': 'true' }, icon),
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider ' + (accent || 'text-slate-700') }, title)
            ),
            body
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '❄️', title: t('stem.bikelab.maine_winter_biking_2', 'Maine Winter Biking') }),
          h('div', { className: 'p-4 max-w-5xl mx-auto w-full space-y-3' },
            h('div', { className: 'rounded-2xl p-5 text-white shadow-lg', style: { background: 'linear-gradient(135deg, #0369a1, #1e40af)' } },
              h('h2', { className: 'text-2xl font-black' }, 'Riding in a Maine winter'),
              h('p', { className: 'text-sm mt-1 leading-relaxed' }, 'You can ride on many winter days. Three things change: it gets dark early, roads can be slippery, and you get cold fast. This page helps you decide when to ride, and when to leave the bike at home. If you are not sure, ask an adult.')
            ),
            // 1. decisions
            h('section', { 'data-winter-cases': showSummary ? 'summary' : cur.id, 'aria-labelledby': 'bikelab-winter-cases-title', className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                h('h3', { id: 'bikelab-winter-cases-title', className: 'text-sm font-bold uppercase tracking-wider text-slate-700' }, '🤔 Should you ride?'),
                h('div', { className: 'text-xs font-bold text-slate-600' }, showSummary ? 'Finished' : 'Situation ' + (caseIdx + 1) + ' of ' + cases.length)
              ),
              showSummary
                ? h('div', { role: 'status', className: 'text-center py-3' },
                    h('div', { className: 'text-2xl font-black text-slate-800' }, 'You made the safe choice ' + score + ' times out of ' + cases.length),
                    h('p', { className: 'text-sm text-slate-700 mt-1' }, score >= WINTER_PASS ? 'You know when to ride and when to wait.' : 'Get ' + WINTER_PASS + ' of ' + cases.length + ' to master this. Have another go.'),
                    h('button', { type: 'button', 'data-winter-retry': 'true', onClick: retryCases, className: 'mt-3 px-4 py-2 rounded-lg font-bold text-sm bg-sky-800 hover:bg-sky-900 text-white' }, 'Try again'))
                : h('div', null,
                    h('p', { className: 'text-base text-slate-800 leading-relaxed' }, cur.scene),
                    h('div', { role: 'group', 'aria-label': 'Your choice', className: 'mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2' },
                      WINTER_CHOICES.map(function(c) {
                        var isPick = curPick === c.id, isAnswer = cur.answer === c.id;
                        var look = !curPick ? 'border-slate-300 bg-white hover:border-slate-500' : isAnswer ? 'border-emerald-500 bg-emerald-50' : isPick ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white';
                        return h('button', { key: c.id, type: 'button', 'data-winter-choice': c.id, 'aria-pressed': isPick ? 'true' : 'false', 'aria-disabled': curPick ? 'true' : 'false',
                          onClick: function() { pickChoice(c.id); },
                          className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold text-slate-800 ' + look }, c.label, curPick && isAnswer ? ' ✓' : curPick && isPick ? ' ✗' : '');
                      })),
                    curPick && h('div', { role: 'status', className: 'mt-3 p-3 rounded-lg border text-sm text-slate-700 ' + (curPick === cur.answer ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') },
                      h('strong', null, curPick === cur.answer ? 'Right. ' : 'The safest choice is "' + choiceLabel(cur.answer) + '". '), cur.why),
                    curPick && h('button', { type: 'button', 'data-winter-next': 'true', onClick: function() { setCaseIdx(caseIdx + 1); }, className: 'mt-3 px-4 py-2 rounded-lg font-bold text-sm bg-sky-800 hover:bg-sky-900 text-white' },
                      caseIdx >= cases.length - 1 ? 'See your score' : 'Next situation →'))
            ),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              // 2. stopping
              section('🛑', 'How far to stop?', h('div', { 'data-winter-stop': stopMph },
                h('label', { htmlFor: 'bikelab-winter-speed', className: 'flex justify-between text-sm font-bold text-slate-700' },
                  h('span', null, 'Your speed'), h('span', { className: 'text-sky-800' }, stopMph + ' mph')),
                h('input', { id: 'bikelab-winter-speed', type: 'range', min: 4, max: 16, step: 1, value: stopMph,
                  onChange: function(e) { var v = parseInt(e.target.value); setStopMph(isFinite(v) ? v : 10); },
                  className: 'w-full accent-sky-600' }),
                h('ul', { className: 'mt-2 space-y-2' },
                  stops.map(function(sp) {
                    return h('li', { key: sp.key },
                      h('div', { className: 'flex justify-between text-sm text-slate-800' }, h('span', { className: 'font-bold' }, sp.label), h('span', { className: 'font-mono' }, sp.total.toFixed(1) + ' m · ' + Math.round(sp.total * 3.281) + ' ft')),
                      h('div', { 'aria-hidden': 'true', className: 'h-3 bg-slate-100 rounded overflow-hidden border border-slate-300' },
                        h('div', { className: 'h-full ' + sp.color, style: { width: Math.max(2, Math.round(100 * sp.total / longest)) + '%' } })));
                  })),
                h('p', { className: 'text-sm text-slate-700 mt-2 leading-relaxed' }, 'This is the whole distance: one second to react, then braking with both brakes. On ice the braking part is about ' + iceTimes.toFixed(0) + ' times longer than on a dry road, because the tires have so little grip. Slow down early, and leave a lot more room.')
              ), 'text-rose-800'),
              // 3. daylight
              section('🌇', 'It gets dark early', h('div', null,
                h('table', { className: 'w-full text-sm text-slate-800' },
                  h('caption', { className: 'sr-only' }, 'About when the sun sets in Portland, Maine, in the middle of each month'),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col', className: 'text-left font-bold pb-1' }, 'Month'),
                    h('th', { scope: 'col', className: 'text-left font-bold pb-1' }, 'Sunset'),
                    h('th', { scope: 'col', className: 'text-left font-bold pb-1' }, 'Daylight after 3 pm'))),
                  h('tbody', null,
                    MAINE_SUNSETS.map(function(m) {
                      var after = Math.max(0, m.hour - 15), mins = Math.round(after * 60 / 5) * 5;
                      return h('tr', { key: m.month, className: 'border-t border-slate-200' },
                        h('th', { scope: 'row', className: 'text-left font-normal py-1 pr-2' }, m.month),
                        h('td', { className: 'py-1 pr-2 font-mono' }, m.label),
                        h('td', { className: 'py-1' },
                          h('div', { className: 'flex items-center gap-2' },
                            h('div', { 'aria-hidden': 'true', className: 'h-3 rounded bg-amber-500', style: { width: Math.round(after / 4 * 100) + '%', minWidth: '4px' } }),
                            h('span', { className: 'font-mono text-xs whitespace-nowrap' }, Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min'))));
                    }))),
                h('p', { className: 'text-sm text-slate-700 mt-2 leading-relaxed' }, 'Times are for Portland, Maine, and are approximate. In December there is only about an hour of daylight after school. If you might still be out at sunset, take your lights.'),
                h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Maine law (Title 29-A §2084): at night a bike needs a white front light, and a red or amber rear light or reflector.')
              ), 'text-amber-800')
            ),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              section('🧊', 'Ice you cannot see', h('div', { className: 'space-y-2 text-sm text-slate-700 leading-relaxed' },
                h('p', null, h('strong', null, 'Black ice '), 'is thin, clear ice. The road just looks wet. It forms first on bridges and in the shade, and it is most slippery when the temperature is close to freezing (around 32°F), because a film of water sits on top.'),
                h('p', null, h('strong', null, 'If you hit ice: '), 'do not brake hard and do not turn. Keep the bike straight, stop pedalling, and let it roll until the tires grip again.'),
                h('p', null, h('strong', null, 'Snowbanks '), 'make the road narrower and hide you from drivers at corners and driveways. Ride where you can be seen, and slow down at every driveway.')
              ), 'text-sky-800'),
              section('🧥', 'Dress for the wind you make', h('div', { className: 'space-y-2 text-sm text-slate-700 leading-relaxed' },
                h('p', null, h('strong', null, 'Three layers: '), 'a thin layer that stays dry next to your skin (not cotton, which stays wet and cold), a warm layer like fleece, and a jacket that blocks the wind.'),
                h('p', null, h('strong', null, 'Hands, ears, feet: '), 'these get cold first. Wear gloves you can still brake in, something over your ears that fits under your helmet, and warm socks.'),
                h('p', null, h('strong', null, 'Start a little cool. '), 'You warm up once you are pedalling. If you start out too warm, you sweat, and sweat makes you cold later.')
              ), 'text-emerald-800')
            ),
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-amber-900 mb-1' }, '🧂 Salt and your bike'),
              h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, 'Road salt melts ice, but salty water makes steel rust quickly. After a wet or slushy ride, rinse the bike with clean water, dry the chain, and put a little oil on it. Some winter riders use tires with small metal studs for ice, or fat tires that float on packed snow.')
            ),
            // personal checklist (a reminder, not a test)
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-3' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700' }, '✅ Before a winter ride'),
                h('div', { 'aria-live': 'polite', className: 'text-xs font-bold ' + (allChecked ? 'text-emerald-700' : 'text-slate-600') },
                  doneCount + ' of ' + checklistItems.length + (allChecked ? ' checked. Ready to ride.' : ' checked')
                )
              ),
              h('ul', { className: 'space-y-2' },
                checklistItems.map(function(it) {
                  var done = !!checks[it.id];
                  return h('li', { key: it.id },
                    h('label', { className: 'flex items-start gap-3 p-2 rounded-lg hover:bg-sky-50 cursor-pointer ' + (done ? 'bg-emerald-50' : '') },
                      h('input', { type: 'checkbox', checked: done, onChange: function() { toggleCheck(it.id); }, className: 'mt-1 accent-sky-600' }),
                      h('span', { className: 'text-sm text-slate-700' }, it.label)
                    )
                  );
                })
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SIGNAL REACTION DRILL
      // ─────────────────────────────────────────────────────
      // A traffic situation prompt appears; the student must press the matching
      // hand signal (left, right, stop) as fast as possible. Tracks reaction
      // time across 10 rounds, awards a "best avg" personal best.
      // A rider seen from behind, so the rider's left arm is on the left of the picture.
      var ARM_POSES = {
        left_straight: { means: 'left', name: 'Left arm straight out' },
        left_up: { means: 'right', name: 'Left arm bent up' },
        right_straight: { means: 'right', name: 'Right arm straight out' },
        left_down: { means: 'stop', name: 'Left arm bent down' }
      };
      function armPoseSvg(kind) {
        var line = function(pts, key) { return h('polyline', { key: key, points: pts, fill: 'none', stroke: '#0f172a', strokeWidth: 7, strokeLinecap: 'round', strokeLinejoin: 'round' }); };
        var leftArm = kind === 'left_straight' || kind === 'both_out' ? '32,34 6,34' : kind === 'left_up' ? '32,34 16,34 16,10' : kind === 'left_down' ? '32,34 16,34 16,58' : '32,34 26,56';
        var rightArm = kind === 'right_straight' || kind === 'both_out' ? '48,34 74,34' : '48,34 54,56';
        return h('svg', { viewBox: '0 0 80 80', 'aria-hidden': 'true', className: 'w-20 h-20 mx-auto' },
          h('circle', { cx: 40, cy: 16, r: 9, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 3 }),
          h('rect', { x: 31, y: 27, width: 18, height: 34, rx: 5, fill: '#2563eb', stroke: '#0f172a', strokeWidth: 3 }),
          line(leftArm, 'l'), line(rightArm, 'r'),
          h('rect', { x: 22, y: 62, width: 36, height: 8, rx: 4, fill: '#475569' }));
      }
      function SignalDrill() {
        var SCENARIOS = [
          { id: 'turn-left',  prompt: t('stem.bikelab.turning_left_at_the_upcoming_intersect', 'Turning left at the upcoming intersection'), answer: 'left' },
          { id: 'turn-right', prompt: t('stem.bikelab.turning_right_onto_the_side_street', 'Turning right onto the side street'), answer: 'right' },
          { id: 'stop-light', prompt: t('stem.bikelab.stopping_for_a_red_light_ahead', 'Stopping for a red light ahead'), answer: 'stop' },
          { id: 'stop-sign',  prompt: t('stem.bikelab.approaching_a_stop_sign', 'Approaching a stop sign'), answer: 'stop' },
          { id: 'lane-left',  prompt: t('stem.bikelab.changing_to_the_left_lane_to_pass_a_pa', 'Changing to the left lane to pass a parked car'), answer: 'left' },
          { id: 'lane-right', prompt: t('stem.bikelab.merging_right_into_the_bike_lane', 'Merging right into the bike lane'), answer: 'right' },
          { id: 'stop-ped',   prompt: t('stem.bikelab.slowing_for_a_pedestrian_in_the_crossw', 'Slowing for a pedestrian in the crosswalk'), answer: 'stop' },
          { id: 'turn-l2',    prompt: t('stem.bikelab.turning_left_into_a_driveway_v2', 'Turning left into a driveway'), answer: 'left' },
          { id: 'turn-r2',    prompt: t('stem.bikelab.turning_right_after_the_next_utility_p', 'Turning right after the next utility pole'), answer: 'right' },
          { id: 'stop-haz',   prompt: t('stem.bikelab.stopping_for_an_obstacle_ahead_downed_', 'Stopping for an obstacle ahead (downed branch)'), answer: 'stop' }
        ];
        var ROUND_COUNT = 10;
        var roundIdxState = useState(0), roundIdx = roundIdxState[0], setRoundIdx = roundIdxState[1];
        var startTimeState = useState(0), startTime = startTimeState[0], setStartTime = startTimeState[1];
        var resultsState = useState([]), results = resultsState[0], setResults = resultsState[1];
        var gameState = useState('idle'), gameMode = gameState[0], setGameMode = gameState[1]; // idle | playing | done
        var feedbackState = useState(''), feedback = feedbackState[0], setFeedback = feedbackState[1];
        var untimedState = useState(false), untimed = untimedState[0], setUntimed = untimedState[1];
        var poseOrderRef = useRef(['left_straight', 'left_up', 'left_down', 'right_straight']);

        var sequenceRef = useRef([]);
        // On first 'play' click, randomize a sequence of ROUND_COUNT scenarios
        var startGame = function() {
          // Fisher-Yates: the Math.random()-0.5 comparator sampled the round
          // sequence non-uniformly (early scenarios were over-served).
          var pool = SCENARIOS.slice();
          for (var fy = pool.length - 1; fy > 0; fy--) {
            var fj = Math.floor(Math.random() * (fy + 1));
            var ft = pool[fy]; pool[fy] = pool[fj]; pool[fj] = ft;
          }
          sequenceRef.current = pool.slice(0, ROUND_COUNT);
          var poses = Object.keys(ARM_POSES);
          for (var py = poses.length - 1; py > 0; py--) { var pj = Math.floor(Math.random() * (py + 1)); var pt = poses[py]; poses[py] = poses[pj]; poses[pj] = pt; }
          poseOrderRef.current = poses;
          setRoundIdx(0);
          setResults([]);
          setGameMode('playing');
          setStartTime(Date.now());
          setFeedback('');
        };

        var current = gameMode === 'playing' ? sequenceRef.current[roundIdx] : null;

        var SIGNAL_FOR = { left: 'left arm straight out', right: 'left arm bent up, or right arm straight out', stop: 'left arm bent down' };
        var pickAnswer = function(pose) {
          if (gameMode !== 'playing' || !current || !ARM_POSES[pose]) return;
          var ms = Date.now() - startTime;
          var correct = ARM_POSES[pose].means === current.answer;
          var newResults = results.concat([{ correct: correct, ms: ms, scenario: current.id, untimed: untimed }]);
          setResults(newResults);
          setFeedback((correct ? '✓ Right' : '✗ The signal was: ' + SIGNAL_FOR[current.answer]) + (untimed ? '' : ' (' + (ms / 1000).toFixed(2) + ' s)'));
          if (roundIdx + 1 >= ROUND_COUNT) {
            setGameMode('done');
            // Compute avg reaction time on correct answers; persist personal best.
            var correctOnly = newResults.filter(function(r) { return r.correct; });
            // A personal best needs accuracy first: at least 8 of 10 correct.
            if (!untimed && correctOnly.length >= 8) {
              var avgMs = correctOnly.reduce(function(s, r) { return s + r.ms; }, 0) / correctOnly.length;
              var prev = d.signalDrillBestMs;
              if (!prev || avgMs < prev) upd('signalDrillBestMs', avgMs);
            }
          } else {
            setRoundIdx(roundIdx + 1);
            setStartTime(Date.now());
          }
        };

        var avgCorrect = (function() {
          var correctOnly = results.filter(function(r) { return r.correct; });
          if (correctOnly.length === 0) return null;
          return correctOnly.reduce(function(s, r) { return s + r.ms; }, 0) / correctOnly.length;
        })();
        var bestMs = d.signalDrillBestMs;

        var signalButton = function(label, ans, color, icon) {
          return h('button', {
            type: 'button', 'data-bikelab-pose': ans,
            onClick: function() { pickAnswer(ans); },
            disabled: gameMode !== 'playing',
            'aria-label': label,
            className: 'flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 ' + color + ' shadow-lg transition-all ' + (gameMode === 'playing' ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed')
          },
            icon,
            h('span', { className: 'font-bold text-sm' }, label)
          );
        };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '✋', title: t('stem.bikelab.signal_reaction_drill_2', 'Signal Reaction Drill') }),
          h('div', { className: 'p-4 max-w-4xl mx-auto w-full space-y-4' },
            // Scoreboard
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
                h('div', { className: 'text-xs uppercase font-bold tracking-wider text-slate-600' }, t('stem.bikelab.round', 'Round')),
                h('div', { className: 'text-2xl font-black text-amber-700' }, gameMode === 'idle' ? '—' : (Math.min(roundIdx + (gameMode === 'done' ? 0 : 1), ROUND_COUNT) + ' / ' + ROUND_COUNT))
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
                h('div', { className: 'text-xs uppercase font-bold tracking-wider text-slate-600' }, t('stem.bikelab.avg_correct', 'Avg (Correct)')),
                h('div', { className: 'text-2xl font-black text-cyan-700' }, avgCorrect ? (avgCorrect / 1000).toFixed(2) + 's' : '—')
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
                h('div', { className: 'text-xs uppercase font-bold tracking-wider text-slate-600' }, t('stem.bikelab.personal_best', '🏆 Personal Best')),
                h('div', { className: 'text-2xl font-black text-emerald-700' }, bestMs ? (bestMs / 1000).toFixed(2) + 's' : '—')
              )
            ),
            // Prompt area
            h('div', { className: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 min-h-[140px] flex items-center justify-center' },
              gameMode === 'idle' ? h('div', { className: 'text-center' },
                h('div', { className: 'text-3xl mb-2' }, '✋'),
                h('p', { className: 'text-slate-700 mb-4 max-w-md' }, t('stem.bikelab.a_traffic_situation_will_appear_press_', 'A traffic situation will appear. Press the matching hand signal as fast as you can. 10 rounds. Best correct-only average is your personal best.')),
                h('button', {
                  onClick: startGame,
                  className: 'px-6 py-3 rounded-xl font-bold bg-amber-700 hover:bg-amber-800 text-white shadow-lg'
                }, t('stem.bikelab.start_drill', '▶ Start Drill'))
              ) : gameMode === 'playing' ? h('div', { className: 'text-center', 'aria-live': 'polite' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-2' }, 'Round ' + (roundIdx + 1)),
                h('p', { className: 'text-xl font-bold text-slate-800' }, current ? current.prompt : ''),
                feedback && h('div', { className: 'text-sm text-slate-600 mt-2' }, feedback)
              ) : h('div', { className: 'text-center' },
                h('div', { className: 'text-3xl mb-2' }, avgCorrect && avgCorrect < 1500 ? '⚡' : avgCorrect && avgCorrect < 2500 ? '🎯' : '👍'),
                h('p', { className: 'text-lg font-bold text-slate-800 mb-1' }, t('stem.bikelab.drill_complete', 'Drill complete!')),
                h('p', { className: 'text-sm text-slate-700' },
                  results.filter(function(r) { return r.correct; }).length + ' of ' + ROUND_COUNT + ' correct · avg ' + (avgCorrect ? (avgCorrect / 1000).toFixed(2) + 's' : '—')
                ),
                h('button', {
                  onClick: startGame,
                  className: 'mt-3 px-5 py-2 rounded-xl font-bold bg-amber-700 hover:bg-amber-800 text-white shadow'
                }, t('stem.bikelab.run_again', '↻ Run Again'))
              )
            ),
            // Three signal buttons
            h('p', { className: 'text-xs text-slate-700' }, 'The pictures show a rider from behind. Pick the arm signal the rider should give.'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' },
              poseOrderRef.current.map(function(pose) {
                var el = signalButton(ARM_POSES[pose].name, pose, 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100', armPoseSvg(pose));
                return h('div', { key: pose, className: 'contents' }, el);
              })
            ),
            h('label', { className: 'flex items-center gap-2 text-sm text-slate-800 min-h-11' },
              h('input', { type: 'checkbox', checked: untimed, disabled: gameMode === 'playing', onChange: function(e) { setUntimed(e.target.checked); }, className: 'w-5 h-5' }),
              'Practice without the timer (no personal best)'),
            // Reference (hidden during a drill: it answers every question)
            gameMode !== 'playing' && h('div', { 'data-bikelab-signal-reference': 'true', className: 'bg-white rounded-xl shadow border border-slate-300 p-4' },
              h('h3', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, t('stem.bikelab.hand_signal_reference', '📖 Hand Signal Reference')),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-700' },
                h('div', null, h('strong', null, t('stem.bikelab.left_turn', 'Left turn: ')), t('stem.bikelab.left_arm_extended_straight_out_to_the_', 'left arm extended straight out to the side.')),
                h('div', null, h('strong', null, t('stem.bikelab.right_turn', 'Right turn: ')), t('stem.bikelab.left_arm_bent_up_at_90_or_right_arm_ou', 'left arm bent up at 90° (or right arm out — both legal in Maine).')),
                h('div', null, h('strong', null, t('stem.bikelab.stop_slow', 'Stop / slow: ')), t('stem.bikelab.left_arm_bent_down_at_90_with_palm_fac', 'left arm bent down at 90° with palm facing back.'))
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN VIEW DISPATCH
      // ─────────────────────────────────────────────────────
      if (view === 'sandbox') return bikeRoot(h(stableType('PhysicsSandbox', PhysicsSandbox)));
      if (view === 'gearing') return bikeRoot(h(stableType('GearingLab', GearingLab)));
      if (view === 'repair') return bikeRoot(h(stableType('RepairSim', RepairSim)));
      if (view === 'fit') return bikeRoot(h(stableType('BikeFit', BikeFit)));
      if (view === 'braking') return bikeRoot(h(stableType('BrakingPhysics', BrakingPhysics)));
      if (view === 'safety') return bikeRoot(h(stableType('SafetyQuiz', SafetyQuiz)));
      if (view === 'ride') return bikeRoot(h(stableType('NeighborhoodRide', NeighborhoodRide)));
      if (view === 'parts') return bikeRoot(h(stableType('PartsInspector', PartsInspector)));
      if (view === 'helmetFit') return bikeRoot(h(stableType('HelmetFit', HelmetFit)));
      if (view === 'winterBike') return bikeRoot(h(stableType('WinterBike', WinterBike)));
      if (view === 'signalDrill') return bikeRoot(h(stableType('SignalDrill', SignalDrill)));
      // (An unfinished, unreachable 'cadenceHunt' view was removed 2026-11-09: no menu entry, and no way back out.)
      return bikeRoot(h(MainMenu));
    }
  });

})();

} // end isRegistered guard
