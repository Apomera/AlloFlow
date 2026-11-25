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
      '.bikelab-ride-pad{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:8px}','.bikelab-root .bikelab-ride-pad button{min-height:56px}','.bikelab-root input[type=range]{min-height:44px}','.bikelab-root summary{min-height:44px;display:flex;align-items:center;gap:8px}','.bikelab-root summary::before{content:"▸";display:inline-block}','.bikelab-root details[open]>summary::before{content:"▾"}','.bikelab-root summary::-webkit-details-marker{display:none}',
      '.bikelab-sandbox-main{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);gap:12px;align-items:start}',
      '.bikelab-sandbox-main input[type=range]:disabled{opacity:.55;cursor:not-allowed}',
      '.bikelab-ride-focus-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr);gap:12px}',
      '.bikelab-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.bikelab-canvas-shell{position:relative;border-radius:18px;padding:10px;background:linear-gradient(180deg,rgba(15,23,42,.98),#07111f);border:1px solid rgba(34,211,238,.34);box-shadow:0 18px 40px rgba(15,23,42,.32),inset 0 1px 0 rgba(255,255,255,.08)}',
      '.bikelab-canvas-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.bikelab-fit-canvas{width:100%!important;height:auto!important;display:block}',
      // Fullscreen: the host stretches the canvas box to fill the screen, which pulled the Ride 48% taller (and the
      // Sandbox 13%). object-fit keeps the drawing's shape, centered. One rule per selector: an unknown one drops its rule.
      ':fullscreen .bikelab-fit-canvas{object-fit:contain;background:#0f172a}',
      ':-webkit-full-screen .bikelab-fit-canvas{object-fit:contain;background:#0f172a}',
      '[data-allo-fullscreen-active] .bikelab-fit-canvas{object-fit:contain;background:#0f172a}',
      '.bikelab-repair-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}',
      '@media(min-width:1000px){.bikelab-repair-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);grid-template-rows:auto auto 1fr;align-items:start}.bikelab-repair-pic{grid-column:1;grid-row:1 / span 3}.bikelab-repair-step,.bikelab-repair-tools,.bikelab-repair-nav{grid-column:2}}',
      '.bikelab-root button,.bikelab-root [role=button],.bikelab-root select{min-height:44px}',
      '.bikelab-root table button{min-height:24px}',
      '.bikelab-root button.w-10,.bikelab-root button[aria-label*="ullscreen"]{min-width:44px}',
      '.bikelab-root button:focus-visible,.bikelab-root [role=button]:focus-visible,.bikelab-root summary:focus-visible{outline:3px solid #0ea5e9;outline-offset:2px}',
      '.bikelab-root [data-bikelab-view-title]:focus-visible{outline:3px solid #0ea5e9;outline-offset:4px;border-radius:6px}',
      '.bikelab-control-card{border-radius:14px!important;border-color:rgba(100,116,139,.45)!important;box-shadow:0 10px 24px rgba(15,23,42,.10)!important}',
      '.bikelab-hero-deck{position:relative;overflow:hidden;border-radius:20px;padding:22px 24px;background:linear-gradient(135deg,#0f172a 0%,#0c4a6e 56%,#134e4a 100%);border:1px solid rgba(56,189,248,.42);box-shadow:0 16px 36px rgba(15,23,42,.24);color:#f8fafc}',
      '.bikelab-telemetry-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(15,23,42,.58);border:1px solid rgba(148,163,184,.36);color:#e2e8f0;white-space:nowrap}',
      '.bikelab-preset-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;background:#f1f5f9;border:1px solid #64748b;color:#0f172a;cursor:pointer;transition:background-color .15s,border-color .15s,transform .12s;min-height:44px!important}',
      '.bikelab-preset-chip:hover{background:#e0f2fe;border-color:#0284c7;color:#0c4a6e}',
      '.bikelab-fleet-strip{border-radius:16px;padding:16px 18px;background:#ffffff;border:1px solid #cbd5e1;box-shadow:0 6px 18px rgba(15,23,42,.06)}',
      '.theme-contrast .bikelab-hero-deck{background:#000000!important;border:2px solid #00ff00!important;box-shadow:none!important;color:#ffffff!important}',
      '.theme-contrast .bikelab-telemetry-pill{background:#000000!important;border:1px solid #ffff00!important;color:#ffff00!important}',
      '.theme-contrast .bikelab-preset-chip{background:#000000!important;border:2px solid #00ff00!important;color:#ffffff!important}',
      '.theme-contrast .bikelab-fleet-strip{background:#000000!important;border:2px solid #ffffff!important;color:#ffffff!important}',
      // Contrast theme: light chips and tinted panels the host leaves light turn black, and dark inks turn yellow
      // (the status chips, Reset and Stop pedaling were white text on light grey; "More settings" was dark indigo on black).
      '.theme-contrast .bikelab-root :is(.bg-slate-200,.bg-slate-300,.bg-amber-50,.bg-amber-100,.bg-emerald-50,.bg-emerald-100,.bg-rose-50,.bg-indigo-50,.bg-sky-50,.bg-cyan-100,.bg-yellow-50,.bg-violet-100,.from-amber-50,.from-indigo-50,.from-emerald-50,.bg-violet-50,.bg-pink-50,.bg-rose-100,.bg-cyan-50,.bg-blue-50,.to-orange-50,.to-yellow-50){background-color:#000000!important;background-image:none!important;border-color:#ffff00!important}',
      // Round 3 (Gearing, Fit, Helmet, Winter, Parts, Quiz): faded white labels go solid, dark fills and borderless
      // buttons get an edge you can see on black, and the "This Gear" card turns black so its labels read.
      '.theme-contrast .bikelab-root :is(.opacity-70,.opacity-75,.opacity-80,.opacity-90,.opacity-95){opacity:1!important}',
      '.theme-contrast .bikelab-root button:is(.bg-indigo-700,.bg-sky-800,.bg-fuchsia-700,.bg-violet-700){box-shadow:0 0 0 2px #ffffff!important}',
      '.theme-contrast .bikelab-root button:is(.bg-white,.bg-slate-100):not(.border):not(.border-2):not(:disabled){border:2px solid #ffff00!important}',
      '.theme-contrast .bikelab-hc-panel{background:#000000!important;background-image:none!important;border:2px solid #ffffff!important;box-shadow:none!important}',
      '.theme-contrast .bikelab-root button:is(.bg-slate-200,.bg-slate-300,.bg-violet-100){border:2px solid #ffff00!important}',
      '.theme-contrast .bikelab-root :is(.text-indigo-700,.text-indigo-800,.text-amber-600,.text-amber-700,.text-amber-800,.text-amber-900,.text-emerald-700,.text-emerald-800,.text-emerald-900,.text-rose-600,.text-rose-700,.text-rose-800,.text-rose-900,.text-cyan-700,.text-cyan-800,.text-sky-700,.text-violet-700,.text-violet-800,.text-teal-700,.text-indigo-900,.text-violet-600,.text-violet-900,.text-fuchsia-600,.text-sky-800,.text-sky-900,.text-pink-800){color:#ffff00!important}',
      '.theme-contrast .bikelab-root button:focus-visible,.theme-contrast .bikelab-root summary:focus-visible{outline:3px solid #ffff00!important;outline-offset:2px}',
      // Final round: disclosure summaries get an edge of their own (they were bare text), option buttons keep a
      // 3:1 edge (slate-500), and the canvas fullscreen buttons draw a solid edge (2.4:1 before) in every theme.
      '.bikelab-root summary.bikelab-disclosure{border:2px solid #4f46e5;border-radius:10px;padding-left:12px;padding-right:12px;min-height:44px;background:#ffffff}',
      '.theme-contrast .bikelab-root summary.bikelab-disclosure{border-color:#ffff00!important;background:#000000!important;color:#ffff00!important}',
      '.theme-contrast .bikelab-root button.border-slate-500{border-color:#ffff00!important}',
      // Light theme: pale slate edges on white buttons read 1.2-2.6:1, so they draw in slate-500 (4.8:1). Borderless
      // pale buttons get that edge too. No !important, so the contrast theme's yellow edges still win.
      '.bikelab-root button:is(.border-slate-100,.border-slate-200,.border-slate-300,.border-slate-400){border-color:#64748b}',
      '.bikelab-root button:is(.bg-slate-100,.bg-slate-200,.bg-violet-100):not(.border):not(.border-2){border:2px solid #64748b}',
      '.bikelab-root button.border-cyan-500{border-color:#0e7490}',
      '.theme-contrast .bikelab-root button.bikelab-fs-btn{background:#000000!important;border:2px solid #ffff00!important;color:#ffff00!important}',
      '@media(max-width:920px){.bikelab-sandbox-grid,.bikelab-sandbox-main,.bikelab-ride-focus-grid{grid-template-columns:1fr!important}.bikelab-metric-grid{grid-template-columns:1fr!important}.bikelab-canvas-shell{padding:6px!important}.bikelab-canvas-toolbar{justify-content:flex-start!important}.bikelab-hero-deck{padding:16px!important}}'
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
      tip: 'Wide tires and an upright seat make this bike comfy, but both cost speed. Great on flat streets, hard work on hills.'
    },
    {
      id: 'hybrid', name: 'Hybrid Commuter', icon: '🚴',
      mass: 80, crr: 0.006, cdA: 0.52, wheelR: 0.340,
      chainringT: [48, 38, 28], cassetteT: [34, 28, 24, 21, 19, 17, 15, 13, 11],
      maxPower: 200,
      desc: 'Middle-ground bike: upright-ish, medium-width tires, wide gear range. The all-rounder.',
      tip: 'This bike has 27 gear combinations (3 chainrings × 9 cogs), and some of them overlap. It is a good all-rounder.'
    },
    {
      id: 'road', name: 'Road Bike', icon: '🏁',
      mass: 78, crr: 0.004, cdA: 0.40, wheelR: 0.337,
      chainringT: [50, 34], cassetteT: [32, 28, 25, 22, 19, 17, 15, 13, 12, 11],
      maxPower: 280,
      desc: 'Drop bars, skinny slick tires, aero tuck. Built for speed on pavement.',
      // Source audit 2026-11-23: "by about a fifth" removed. Wind-tunnel figures for hoods-to-drops range from about 3% to 20%
      // (e.g. Barry et al., Monash, J Sci Eng Tech 2015: up to 12%), so no single share is stated.
      tip: 'Crouching low on the drop bars makes you smaller to the air, so it pushes back less. That is free speed.'
    },
    {
      id: 'mtb', name: 'Mountain Bike', icon: '⛰️',
      mass: 90, crr: 0.012, cdA: 0.57, wheelR: 0.355,
      chainringT: [32], cassetteT: [50, 42, 36, 30, 26, 22, 19, 16, 14, 12, 10],
      maxPower: 230,
      desc: 'Fat knobby tires, suspension, wide 1× gearing. Made for dirt and roots.',
      // Source audit 2026-11-23: "about three times" removed. Drum tests put knobby tires well above road tires, but by
      // different amounts per tire and lab (bicyclerollingresistance.com); the 3x is only this model's Crr choice.
      tip: 'Knobby tires grip dirt. On pavement they take much more push to roll than smooth road tires.'
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
      tip: 'Weight matters most on hills. On a 6% climb the extra 50 kg adds about 30 N to the pull of the hill.'
    },
    {
      id: 'bmx', name: 'BMX', icon: '🤘',
      mass: 81, crr: 0.011, cdA: 0.55, wheelR: 0.254,
      chainringT: [25], cassetteT: [9],
      maxPower: 180,
      desc: 'Single-speed, 20″ wheels, super short wheelbase. Built for tricks and pump tracks, not commuting.',
      tip: 'One gear and small wheels: quick off the line and easy to control, but your legs spin out before you go fast.'
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
      c.strokeStyle = '#0f172a'; c.lineWidth = 3.2;
      c.beginPath(); c.arc(cx, -10, 10, 0, 2 * Math.PI); c.stroke();
      // Brushed alloy wheel rim highlight
      c.strokeStyle = 'rgba(226,232,240,0.85)'; c.lineWidth = 1.1;
      c.beginPath(); c.arc(cx, -10, 8.2, 0, 2 * Math.PI); c.stroke();
      c.strokeStyle = 'rgba(148,163,184,0.55)'; c.lineWidth = 0.85;
      for (var i = 0; i < 4; i++) {
        var a = rot + i * Math.PI / 4;
        c.beginPath(); c.moveTo(cx - 8 * Math.cos(a), -10 - 8 * Math.sin(a)); c.lineTo(cx + 8 * Math.cos(a), -10 + 8 * Math.sin(a)); c.stroke();
      }
      c.fillStyle = '#cbd5e1'; c.beginPath(); c.arc(cx, -10, 1.8, 0, 2 * Math.PI); c.fill();
    };
    wheel(-17); wheel(17);
    // Machined silver rear cassette + front chainring + chain line
    c.fillStyle = '#cbd5e1'; c.strokeStyle = '#475569'; c.lineWidth = 0.8;
    c.beginPath(); c.arc(-17, -10, 3.3, 0, 2 * Math.PI); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -10, 4.4, 0, 2 * Math.PI); c.fill(); c.stroke();
    c.strokeStyle = '#334155'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-17, -13.2); c.lineTo(0, -14.3); c.moveTo(-17, -6.8); c.lineTo(0, -5.7); c.stroke();
    if (o.braking) { c.fillStyle = '#ef4444'; c.beginPath(); c.arc(-27, -22, 3.2, 0, 2 * Math.PI); c.fill(); }
    // Anodized metallic frame + crisp specular tube highlight
    c.strokeStyle = o.frame || '#e11d48'; c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(-17, -10); c.lineTo(0, -10); c.lineTo(-6, -29); c.lineTo(-17, -10);
    c.moveTo(-6, -29); c.lineTo(11, -29); c.lineTo(0, -10);
    c.moveTo(11, -29); c.lineTo(17, -10);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.42)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-6, -29.5); c.lineTo(11, -29.5); c.moveTo(11, -29); c.lineTo(0, -10.5);
    c.stroke();
    c.strokeStyle = '#0f172a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-11, -31); c.lineTo(-2, -31); c.moveTo(10, -30); c.lineTo(15, -36); c.stroke();
    // rider: legs follow the pedals
    var px = 5 * Math.cos(ped), py = -10 + 5 * Math.sin(ped);
    c.strokeStyle = '#1e3a8a'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-6, -33); c.lineTo(3 + px * 0.4, -21 + (py + 10) * 0.5); c.lineTo(px, py); c.stroke();
    if (o.footDown) {    // stopped: the near leg reaches down and the shoe rests on the road
      c.beginPath(); c.moveTo(-6, -33); c.lineTo(4, -19); c.lineTo(6, -1.8); c.stroke();
      c.fillStyle = '#0f172a'; c.beginPath(); c.ellipse(8, -1.8, 4.4, 1.9, 0, 0, 2 * Math.PI); c.fill();
    }
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

  // A house (or the school), a tree, and a car seen from the front, for the Neighborhood Ride street.
  function drawHouse(c, x, groundY, k, wall, roof, school) {
    c.save(); c.translate(x, groundY); c.scale(k, k);
    var w = school ? 100 : 56, tall = school ? 48 : 36;
    c.fillStyle = wall || '#fecaca'; c.fillRect(-w / 2, -tall, w, tall);
    c.fillStyle = roof || '#9f1239';
    c.beginPath(); c.moveTo(-w / 2 - 6, -tall); c.lineTo(0, -tall - (school ? 20 : 24)); c.lineTo(w / 2 + 6, -tall); c.closePath(); c.fill();
    c.fillStyle = '#7c2d12'; c.fillRect(-6, -20, 12, 20);
    c.fillStyle = '#bae6fd'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
    (school ? [-38, -22, 22, 38] : [-18, 18]).forEach(function(wx) { c.fillRect(wx - 5, -tall + 9, 10, 10); c.strokeRect(wx - 5, -tall + 9, 10, 10); });
    if (school) {
      c.strokeStyle = '#475569'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2 + 14, 0); c.lineTo(w / 2 + 14, -78); c.stroke();
      c.fillStyle = '#dc2626'; c.fillRect(w / 2 + 15, -78, 20, 12);
    }
    c.restore();
  }
  function drawTree(c, x, groundY, k, leaf) {
    c.save(); c.translate(x, groundY); c.scale(k, k);
    c.fillStyle = '#78350f'; c.fillRect(-3, -24, 6, 24);
    c.fillStyle = leaf || '#15803d';
    c.beginPath(); c.arc(0, -38, 17, 0, 2 * Math.PI); c.arc(-12, -28, 12, 0, 2 * Math.PI); c.arc(12, -28, 12, 0, 2 * Math.PI); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(-5, -43, 5, 0, 2 * Math.PI); c.fill();
    c.restore();
  }
  function drawCarFront(c, x, y, k, color, o) {
    o = o || {};
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, 1, 27, 5, 0, 0, 2 * Math.PI); c.fill();
    c.fillStyle = '#0f172a'; c.fillRect(-22, -9, 9, 10); c.fillRect(13, -9, 9, 10);
    c.fillStyle = color || '#2563eb';
    c.fillRect(-24, -25, 48, 20);
    c.beginPath(); c.moveTo(-18, -25); c.lineTo(-12, -40); c.lineTo(12, -40); c.lineTo(18, -25); c.closePath(); c.fill();
    c.fillStyle = '#bae6fd'; c.beginPath(); c.moveTo(-14, -26); c.lineTo(-10, -37); c.lineTo(10, -37); c.lineTo(14, -26); c.closePath(); c.fill();
    c.fillStyle = '#fef08a'; c.beginPath(); c.arc(-16, -16, 4, 0, 2 * Math.PI); c.arc(16, -16, 4, 0, 2 * Math.PI); c.fill();
    c.fillStyle = '#1e293b'; c.fillRect(-8, -14, 16, 5);
    if (o.braking) {   // stopped hard: a warning mark over the roof
      c.fillStyle = '#dc2626'; c.beginPath(); c.arc(0, -54, 9, 0, 2 * Math.PI); c.fill();
      c.fillStyle = '#ffffff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('!', 0, -49); c.textAlign = 'start';
    }
    c.restore();
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
  // ── Braking: "Test your own reaction time" ──
  // The hazard appears after a wait the student cannot predict. A tap sooner than REACTION_MIN_MS after it is a
  // guess, and no tap within REACTION_TIMEOUT_MS is a miss: neither is counted. The average of the counted tries
  // goes into brakingStop(), next to the usual 1.0 to 1.5 s for a surprise on a real road.
  var REACTION_TRIALS = 5, REACTION_MIN_MS = 100, REACTION_TIMEOUT_MS = 3000, REACTION_TYPICAL = [1.0, 1.5];
  function reactionWaitMs(rand) { return Math.round(1500 + 3000 * Math.min(1, Math.max(0, +rand || 0))); }
  function reactionCounted(ms) { return typeof ms === 'number' && isFinite(ms) && ms >= REACTION_MIN_MS && ms <= REACTION_TIMEOUT_MS; }
  function reactionSummary(trials) {
    var ok = (Array.isArray(trials) ? trials : []).filter(reactionCounted);
    var sum = ok.reduce(function(a, b) { return a + b; }, 0);
    return { count: ok.length, avgSec: ok.length ? sum / ok.length / 1000 : null, bestSec: ok.length ? Math.min.apply(null, ok) / 1000 : null };
  }
  // Rows for the comparison: the student's own time (when there is one) and the two usual surprise times.
  function reactionCompare(mph, surf, split, mySec) {
    var rows = [];
    if (typeof mySec === 'number' && isFinite(mySec) && mySec > 0) rows.push({ key: 'me', sec: mySec, stop: brakingStop(mph, surf, split, mySec) });
    REACTION_TYPICAL.forEach(function(s) { rows.push({ key: 'typical' + s, sec: s, stop: brakingStop(mph, surf, split, s) }); });
    return rows;
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

  // ── One moment of a Sandbox ride ──
  // The forces along the road (N) on a bike at position x moving at v. The physics step, the force arrows and the
  // experiments all read this one function, so the picture cannot disagree with the motion.
  // o: { power (W), gear (0.2–1 slider), wind (m/s, + is a headwind), riderMass (kg), coasting }
  function rideForces(bike, terrain, x, v, o) {
    var riderMass = o.riderMass || 70, m = (bike.mass - 70) + riderMass;
    var here = terrain.profile(x), slope = (terrain.profile(x + 0.5).y - here.y) / 0.5, angle = Math.atan(slope);
    var normal = m * G * Math.cos(angle);
    var hill = m * G * Math.sin(angle);                 // + pulls back (climbing), − pushes forward (descending)
    var tires = bike.crr * (SURFACE_CRR_MULT[here.kind] || 1) * normal;
    var vRel = v + (o.wind || 0);
    var air = 0.5 * RHO_AIR * bike.cdA * vRel * Math.abs(vRel);
    var ratio = gearRatioFor(bike, o.gear);
    var push = o.coasting ? 0 : pedalDriveForce(bike, ratio, v, o.power, riderMass);
    return { mass: m, slope: slope, angle: angle, kind: here.kind, weight: m * G, normal: normal, hill: hill, tires: tires, air: air, push: push, ratio: ratio, net: push - tires - air - hill };
  }
  // Move a ride on by dt seconds. s: { x, v, t, lowY }. Returns the forces it used and where the power went (W).
  var SANDBOX_DT = 1 / 120;
  function sandboxStep(s, bike, terrain, o, dt) {
    var f = rideForces(bike, terrain, s.x, s.v, o), a = f.net / f.mass, v0 = s.v;
    s.v = Math.max(0, s.v + a * dt); s.x += s.v * dt; s.t += dt;
    s.lowY = Math.min(s.lowY || 0, terrain.profile(s.x).y);
    f.accel = a;
    f.budget = { pedal: f.push * v0, rolling: f.tires * v0, air: f.air * v0, hill: f.hill * v0, speedUp: f.mass * a * v0,
      cadence: cadenceRpmFor(v0, bike.wheelR, f.ratio), ratio: f.ratio, slopePct: f.slope * 100, stalled: !o.coasting && v0 < 0.3 && f.net <= 0 };
    // Stopped. The model never runs backward: a stopped bike cannot balance, so the rider puts a foot down. rollBack says
    // whether a bike on its own would roll back down (the hill pulls back harder than the tires and the pedals hold).
    f.rest = s.v === 0;
    f.rollBack = f.rest && f.hill > f.tires + f.push;
    f.budget.rest = f.rest; f.budget.rollBack = f.rollBack; f.budget.hillN = f.hill; f.budget.holdN = f.tires + f.push;
    return f;
  }

  // ── Sandbox experiments: predict, then test ──
  // Each one sets up a ride, asks for a prediction and then runs the ride in the Sandbox. The right answer is read
  // from the finished run by sandboxExperimentRead, so it always agrees with what the student just watched.
  // Options are [key, text, what a student who picks it wrongly is probably thinking].
  var SANDBOX_EXPERIMENTS = [
    { id: 'steady-flat', title: 'Where do your watts go?', look: 'power',
      setup: { bike: 'hybrid', terrain: 'flat', power: 150, gear: 0.7, wind: 0, riderMass: 70, coasting: false, v0: 0 }, until: 'steady',
      ask: 'You pedal at a steady effort on a flat road until your speed stops changing. What takes most of your power then?',
      options: [['tires', 'The tires rolling along', 'Tires take about the same push at any speed. At this speed the air takes much more.'],
        ['air', 'Pushing through the air', ''],
        ['speedUp', 'Getting up to speed', 'Speeding up only costs power while your speed is still changing. Once it is steady, that share is zero.']],
      watch: 'Watch the “Where does my power go?” bar while the bike gets up to speed.',
      why: 'The push from the air grows with speed × speed. At a steady speed nothing is left over for speeding up, so nearly all your power goes into moving air out of the way.' },
    { id: 'slow-knobby', title: 'Slow ride, knobby tires', look: 'power',
      setup: { bike: 'mtb', terrain: 'flat', power: 45, gear: 0.4, wind: 0, riderMass: 70, coasting: false, v0: 0 }, until: 'steady',
      ask: 'Now a mountain bike with knobby tires, ridden gently at about 7 mph. What takes most of the power this time?',
      options: [['air', 'Pushing through the air', 'Air only pushes back hard when you are going fast. At this speed it is the small share.'],
        ['speedUp', 'Getting up to speed', 'Speeding up only costs power while your speed is still changing. Once it is steady, that share is zero.'],
        ['tires', 'The tires rolling along', '']],
      watch: 'Watch the bar again. Is the biggest share the same color as last time?',
      why: 'Knobby tires squash and grip the road, and that costs the same push at any speed. Going slowly, the air hardly pushes back, so the tires take the biggest share.' },
    { id: 'headwind', title: 'Into the wind', look: 'speed',
      setup: { bike: 'hybrid', terrain: 'flat', power: 150, gear: 0.7, wind: 4.47, riderMass: 70, coasting: false, v0: 0 }, until: 'steady',
      ask: 'Same bike and same effort as the first experiment, but now a 10 mph wind blows in your face. What happens to your top speed?',
      options: [['some', 'It drops, but by less than 10 mph', ''],
        ['full', 'It drops by the full 10 mph or more', 'You do slow down, but a slower bike also meets less air and its tires waste less. So you lose less than the whole wind speed.'],
        ['same', 'It stays about the same as before', 'The air pushes on you with your speed plus the wind speed, so a headwind costs a lot of power.']],
      watch: 'Watch the speed and the purple “air” arrow. The air arrow is long even though the bike is slow.',
      why: 'The air pushes back with your speed plus the wind speed. You slow down until that push fits your power again, which happens before you have lost the whole 10 mph.' },
    { id: 'coast-dip', title: 'Coast through the dip', look: 'energy',
      setup: { bike: 'hybrid', terrain: 'rollinghills', power: 0, gear: 0.7, wind: 0, riderMass: 70, coasting: true, v0: 3 }, until: 'stopped',
      ask: 'You get a push to 7 mph at the top of a dip, then coast with no pedaling. How far up the other side do you roll?',
      options: [['top', 'All the way back up to the start', 'That would need every bit of energy to come back. The tires and the air keep some.'],
        ['less', 'Less than half way back up', ''],
        ['most', 'More than half way back up', 'The tires and the air take more than you might think, most of it at the fast part at the bottom.']],
      watch: 'Watch the energy graph. Height energy turns into motion energy on the way down. Does the total stay level?',
      why: 'Going down, height energy turns into motion energy. Going up, it turns back. But the tires and the air take some the whole way, so the total line on the graph slopes down and you stop well short of the top.' }
  ];
  function sandboxExperimentDone(exp, s, f) {
    if (s.t > 240) return true;
    if (exp.until === 'stopped') return s.t > 2 && s.v < 0.05;
    return s.t > 8 && Math.abs(f.accel) < 0.004;       // 'steady': the speed has stopped changing
  }
  // Run one experiment setup from start to finish with the Sandbox's own step.
  function sandboxExperimentRun(exp, setupOverride) {
    var o = setupOverride || exp.setup;
    var bike = BIKES.filter(function(b) { return b.id === o.bike; })[0] || BIKES[1];
    var terrain = TERRAINS.filter(function(t) { return t.id === o.terrain; })[0] || TERRAINS[0];
    var s = { x: 0, v: o.v0 || 0, t: 0, lowY: 0 }, f = null;
    for (var i = 0; i < 240 * 120 + 2; i++) { f = sandboxStep(s, bike, terrain, o, SANDBOX_DT); if (sandboxExperimentDone(exp, s, f)) break; }
    return { s: s, f: f, terrain: terrain };
  }
  // Read the result of a finished run: the right option, plus the numbers to show.
  function sandboxExperimentRead(exp, s, f, terrain) {
    var mph = s.v * 2.237;
    if (exp.id === 'headwind') {
      var calm = {}; Object.keys(exp.setup).forEach(function(k) { calm[k] = exp.setup[k]; }); calm.wind = 0;
      var base = sandboxExperimentRun(exp, calm).s.v * 2.237, windMph = exp.setup.wind * 2.237, drop = base - mph;
      return { answer: drop < 1 ? 'same' : drop >= windMph - 1 ? 'full' : 'some', mph: mph, baseMph: base, drop: drop, windMph: windMph };
    }
    if (exp.id === 'coast-dip') {
      var endY = terrain.profile(s.x).y, low = Math.min(s.lowY || 0, -0.01);
      var back = Math.max(0, Math.min(1, (endY - low) / (0 - low)));
      return { answer: endY >= -0.05 ? 'top' : back > 0.5 ? 'most' : 'less', back: back, lowM: -low, distance: s.x };
    }
    var b = f.budget, sinks = [['tires', b.rolling], ['air', b.air], ['hill', b.hill], ['speedUp', b.speedUp]].filter(function(r) { return r[1] > 0.5; });
    var total = sinks.reduce(function(a, r) { return a + r[1]; }, 0) || 1, share = {};
    sinks.forEach(function(r) { share[r[0]] = r[1] / total; });
    sinks.sort(function(x, y) { return y[1] - x[1]; });
    return { answer: sinks.length ? sinks[0][0] : 'tires', mph: mph, share: share };
  }
  function sandboxExperimentResult(exp) {
    var run = sandboxExperimentRun(exp);
    return sandboxExperimentRead(exp, run.s, run.f, run.terrain);
  }

  // ── Canvas size ──
  // A 900 px drawing squeezed into a 350 px phone frame shrinks its 12 px labels to under 5 px. Wide frames keep the
  // wide drawing; narrow frames get a drawing as wide as the frame, and relatively taller, so text stays readable.
  function canvasLogicalSize(shownPx, wideW, wideH, narrowRatio) {
    if (!(shownPx > 0) || shownPx >= wideW * 0.8) return { w: wideW, h: wideH, narrow: false };
    var w = Math.max(300, Math.round(shownPx)), narrow = w < 560;
    return { w: w, h: Math.round(w * (narrow ? narrowRatio : wideH / wideW)), narrow: narrow };
  }
  function fitCanvasLogical(cvs, wideW, wideH, narrowRatio) {
    var shown = 0;
    try { shown = cvs.getBoundingClientRect().width; } catch (e) { shown = 0; }
    var size = canvasLogicalSize(shown, wideW, wideH, narrowRatio);
    if (window.StemLab && window.StemLab.setupHiDPI) window.StemLab.setupHiDPI(cvs, size.w, size.h);
    else if (cvs.width !== size.w || cvs.height !== size.h) { cvs.width = size.w; cvs.height = size.h; }
    try { if (cvs.style) cvs.style.aspectRatio = size.w + ' / ' + size.h; } catch (e) { /* keep the drawing even if the style cannot be set */ }
    return size;
  }
  // Reduced motion, read when it is needed: a student can switch it on while the tool is open.
  function reducedMotionNow() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
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
  function buildBike3D(THREE, shaderUniforms, isContrast) {
    var group = new THREE.Group(), meshes = [], partMats = {};
    var up = new THREE.Vector3(0, 1, 0);
    var hasPhys = typeof THREE.MeshPhysicalMaterial === 'function';
    var anodizedParts = {
      frame: 1, fork: 1, stem: 1, bars: 1, handlebar: 1, seatpost: 1, headtube: 1,
      top_tube: 1, down_tube: 1, seat_tube: 1, head_tube: 1, chainstay: 1, seatstay: 1, caliper: 1
    };
    var alloyParts = {
      chainring: 1, cassette: 1, crank: 1, pedals: 1, brakes: 1, brake_lever: 1,
      rd: 1, fd: 1, chain: 1, wheels: 1, hubs: 1, hub: 1, rims: 1, rim: 1, spokes: 1
    };
    var matteParts = { tires: 1, tire: 1, saddle: 1, grips: 1 };

    function applyBikeSheenShader(mat, kind) {
      if (isContrast || !shaderUniforms || !mat || typeof mat.onBeforeCompile !== 'function') return mat;
      mat.customProgramCacheKey = function() { return 'bikelab-sheen-' + kind + '-v1'; };
      mat.onBeforeCompile = function(shader) {
        shader.uniforms.uTime = shaderUniforms.uTime;
        shader.uniforms.uSpeed = shaderUniforms.uSpeed;
        shader.uniforms.uKind = { value: kind === 'anodized' ? 0.0 : 1.0 };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', [
            '#include <common>',
            'varying vec3 vBkWorldPos;',
            'varying vec3 vBkWorldNorm;'
          ].join('\n'))
          .replace('#include <begin_vertex>', [
            '#include <begin_vertex>',
            'vec4 bkWp = modelMatrix * vec4(transformed, 1.0);',
            'vBkWorldPos = bkWp.xyz;',
            'vBkWorldNorm = normalize(mat3(modelMatrix) * objectNormal);'
          ].join('\n'));
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', [
            '#include <common>',
            'uniform float uTime;',
            'uniform float uSpeed;',
            'uniform float uKind;',
            'varying vec3 vBkWorldPos;',
            'varying vec3 vBkWorldNorm;'
          ].join('\n'))
          .replace('#include <dithering_fragment>', [
            'vec3 bkN = normalize(vBkWorldNorm);',
            'vec3 bkV = normalize(cameraPosition - vBkWorldPos);',
            'float bkNdotV = clamp(abs(dot(bkN, bkV)), 0.0, 1.0);',
            'float bkFres = pow(1.0 - bkNdotV, 2.7);',
            'vec3 bkL = normalize(vec3(0.45, 0.80, 0.55));',
            'vec3 bkH = normalize(bkV + bkL);',
            'if (uKind < 0.5) {',
            '  // Anodized clearcoat metallic frame: dual-tone cyan/teal flake & clearcoat Fresnel rim',
            '  float bkSweep = 0.65 + 0.35 * sin(vBkWorldPos.x * 0.9 - uTime * (1.2 + uSpeed * 0.8));',
            '  float bkSpec = pow(clamp(dot(bkN, bkH), 0.0, 1.0), 36.0);',
            '  vec3 bkRim = mix(vec3(0.18, 0.86, 0.92), vec3(0.95, 0.99, 1.0), bkFres);',
            '  gl_FragColor.rgb += bkRim * bkFres * 0.30 * bkSweep + vec3(0.94, 0.98, 1.0) * bkSpec * 0.24;',
            '} else {',
            '  // Brushed-alloy drivetrain: anisotropic machined highlight streak',
            '  vec3 bkRef = abs(bkN.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);',
            '  vec3 bkT = normalize(cross(bkN, bkRef));',
            '  float bkAniso = pow(1.0 - abs(dot(bkT, bkH)), 10.0);',
            '  float bkBrush = 0.78 + 0.22 * sin(dot(vBkWorldPos, vec3(12.0, 14.0, 8.0)) + uTime * 0.9);',
            '  gl_FragColor.rgb += vec3(0.90, 0.95, 1.0) * (bkAniso * bkBrush * 0.28 + bkFres * 0.16);',
            '}',
            '#include <dithering_fragment>'
          ].join('\n'));
      };
      return mat;
    }

    bikeModelSpec().forEach(function(p) {
      var geo, mesh, mat;
      var pid = p.part || '';
      var isAnodized = !!anodizedParts[pid];
      var isAlloy = !!alloyParts[pid] || p.kind === 'disc';
      var isMatte = !!matteParts[pid] || p.color === '#111827' || p.color === '#0f172a' || p.color === '#1e293b';
      if (hasPhys && isAnodized && !isMatte) {
        mat = applyBikeSheenShader(new THREE.MeshPhysicalMaterial({
          color: p.color, roughness: 0.22, metalness: 0.74,
          clearcoat: 0.92, clearcoatRoughness: 0.10
        }), 'anodized');
      } else if (hasPhys && isAlloy && !isMatte) {
        mat = applyBikeSheenShader(new THREE.MeshPhysicalMaterial({
          color: p.color, roughness: 0.20, metalness: 0.88,
          clearcoat: 0.45, clearcoatRoughness: 0.18
        }), 'alloy');
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: p.color,
          roughness: isMatte ? 0.82 : (isAlloy ? 0.24 : 0.46),
          metalness: isMatte ? 0.06 : (isAlloy ? 0.84 : 0.45)
        });
        if (!isMatte && (isAnodized || isAlloy)) applyBikeSheenShader(mat, isAnodized ? 'anodized' : 'alloy');
      }
      if (p.hidden) { mat.transparent = true; mat.opacity = 0; mat.depthWrite = false; }
      if (p.kind === 'tube') {
        var a = new THREE.Vector3(p.a[0], p.a[1], p.a[2]), b = new THREE.Vector3(p.b[0], p.b[1], p.b[2]);
        var dir = b.clone().sub(a), len = dir.length();
        geo = new THREE.CylinderGeometry(p.r, p.r, len, 14);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(up, dir.normalize());
      } else if (p.kind === 'torus' || p.kind === 'arc') {
        geo = new THREE.TorusGeometry(p.R, p.r, 12, p.kind === 'arc' ? 24 : 56, p.kind === 'arc' ? p.sweep : Math.PI * 2);
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.c[0], p.c[1], p.c[2]);
        if (p.kind === 'arc') mesh.rotation.z = p.start;
      } else if (p.kind === 'disc') {
        geo = new THREE.CylinderGeometry(p.R, p.R, p.len, 36);
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
      description: 'A roadside repair every rider can learn. Find the puncture, rough it up, glue, patch, reassemble.',
      steps: [
        { id: 'remove_wheel', label: 'Remove wheel', instruction: 'Open the quick-release lever (or unscrew axle nuts) and pull the wheel out of the dropouts. On rear wheels, shift into the smallest cog first so the chain lifts off easily.', tool: 'hand' },
        { id: 'deflate', label: 'Fully deflate tube', instruction: 'Unscrew the valve cap and press the valve core to release any remaining air. You can\'t remove the tire with air inside.', tool: 'hand' },
        { id: 'lever_tire', label: 'Pry tire off rim', instruction: 'Slide a plastic tire lever between the bead and rim. Hook it on a spoke. Use a second lever ~10 cm along to walk the bead over.', tool: 'tire-lever' },
        { id: 'locate_hole', label: 'Find the puncture', instruction: 'Re-inflate the tube a bit and listen / feel for escaping air. No luck? Submerge sections in water and watch for bubbles.', tool: 'pump' },
        { id: 'rough_patch', label: 'Sand the area', instruction: 'Scuff the rubber around the hole with the patch-kit sandpaper. This lets glue bond — don\'t skip it.', tool: 'sandpaper' },
        // Source audit 2026-11-23, Park Tool "How to Patch a Tire and Tube" (parktool.com/en-us/blog/repair-help/inner-tube-repair):
        // let the glue dry (no fixed time; test the outer edge), press for over a minute, leave the clear cover on.
        { id: 'apply_glue', label: 'Apply vulcanizing glue', instruction: 'Spread a thin layer of glue, larger than the patch. Let it dry until it is no longer wet or sticky. This can take a few minutes. Test the outer edge, not the middle.', tool: 'glue' },
        { id: 'press_patch', label: 'Press on the patch', instruction: 'Peel the foil from one side of the patch, press it onto the glued area, and squeeze firmly, edges too, for over a minute. You can leave the clear film on top.', tool: 'patch' },
        { id: 'check_tire', label: 'Inspect the tire casing', instruction: 'Run your fingers inside the tire — carefully. Pull out any thorn, glass shard, or staple that caused the flat. Skipping this = immediate re-puncture.', tool: 'hand' },
        { id: 'reseat', label: 'Reseat the tube + tire', instruction: 'Inflate the tube just enough to hold its shape, tuck it into the tire, then walk the bead back onto the rim by hand. Levers can pinch the tube.', tool: 'hand' },
        // Rough guide checked 2026-11-23 against Canyon's tire-pressure guide (canyon.com/en-us/blog-content/advice/bike-tire-pressure/b21062021.html):
        // road about 60-110 psi by tire width, mountain bike about 20-50 psi across guides. The sidewall range always wins.
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
        // Park Tool (Dual Pivot / Sidepull Brake Service) asks only for "a slight gap" at the back of the pad; the 1 mm figure was removed 2026-11-23.
        { id: 'toe_in', label: 'Set a small toe-in', instruction: 'The front of the pad should touch the rim first, with a slight gap at the back. This helps stop brake squeal. Hold a business card under the back of the pad while tightening.', tool: 'allen' },
        { id: 'test_ride', label: 'Test ride at low speed', instruction: 'Roll slowly in a clear area. Brakes should grip firmly without squeal or pulsation. Re-adjust barrel if needed as the cable stretches in.', tool: 'hand' }
      ]
    },
    {
      id: 'chain_clean',
      name: 'Clean & Lube Chain',
      icon: '🔗',
      difficulty: 'Beginner',
      minutes: 15,
      description: 'A clean chain shifts quieter and wears more slowly. Degrease, dry, re-lube.',
      steps: [
        // Corrected 2026-11-23 from Park Tool "When to Replace a Chain" (parktool.com/en-us/blog/repair-help/when-to-replace-a-chain-on-a-bicycle):
        // 24 rivets past the zero span 12 inches; 1/16 inch more means replace. (The old "12 links = 12 inches" miscounted.)
        { id: 'inspect', label: 'Check chain wear', instruction: 'Use a chain-wear gauge or a ruler. Line up one rivet with the zero mark and count 24 more rivets: the last one should sit on the 12-inch mark. If it is 1/16 inch or more past it, replace the chain.', tool: 'ruler' },
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
        { id: 'barrel_zero', label: 'Seat the barrel adjuster', instruction: 'On the derailleur or shifter, turn the barrel adjuster clockwise until snug, then back out one or two full turns as a starting zero.', tool: 'hand' },   // BikeRadar "How to adjust a rear derailleur": "out by one or two turns" (checked 2026-11-23)
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
        // Park Tool "Torque Specifications and Concepts" table (checked 2026-11-23): pedal into crank, Shimano 35 Nm minimum, Campagnolo 40 Nm.
        { id: 'torque_spec', label: 'Tighten to 35 Nm', instruction: 'Right pedal: clockwise. Left pedal: counter-clockwise. Many pedal makers ask for about 35 to 40 Nm: firm, not stripped. Check the number for your pedals. No need to lean with your whole body.', tool: 'allen' }
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
        { id: 'match_wrench', label: 'Match the spoke wrench to nipple size', instruction: 'Spoke nipples come in a few sizes, such as 3.23 mm, 3.30 mm and 3.45 mm. Use exactly the right size or you\'ll round them off. Park Tool color-codes its wrenches.', tool: 'allen' },   // sizes: Park Tool "Spoke Wrench Selection"; "3.4mm most common" had no source (2026-11-23)
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
        { id: 'torque_pinch', label: 'Torque stem pinch bolts', instruction: 'Tighten each pinch bolt a little at a time, back and forth, to the torque printed on the stem. Over-torque can crack carbon.', tool: 'allen' },   // 5 / 7 Nm removed 2026-11-23: no source; stems print their own value
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
  // REPAIR PICTURES: where on the bike, and what each step looks like
  // ─────────────────────────────────────────────────────────
  // Hotspot shapes that follow the parts drawing. The Parts Inspector and the repair work stand share them.
  // ring = [cx, cy, radius, band width]; circle = [cx, cy, radius]; poly = corner points; rect = [x, y, width, height].
  // Parts not listed here use their own hx/hy/hw/hh rectangle.
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
  // Work stand focus: which part of the bike each repair job (and some single steps) is about. `parts` are Parts
  // Inspector ids, so the ring sits exactly on that part's hotspot; `shapes` cover places that are not one of the
  // 20 parts (the pedal, the head tube). An empty focus means the whole bike.
  var REPAIR_FOCUS = {
    patch_tube: { where: 'the front wheel', parts: ['tire'],
      steps: { remove_wheel: { where: 'the axle, at the center of the front wheel', parts: ['hub'] },
        locate_hole: { where: 'the inner tube, out of the tire', shapes: [{ rect: [168, 293, 84, 16] }] },
        rough_patch: { where: 'the inner tube, around the hole', shapes: [{ rect: [168, 293, 84, 16] }] },
        apply_glue: { where: 'the inner tube, around the hole', shapes: [{ rect: [168, 293, 84, 16] }] },
        press_patch: { where: 'the inner tube, over the hole', shapes: [{ rect: [168, 293, 84, 16] }] },
        check_tire: { where: 'the inside of the tire', parts: ['tire'] } } },
    brake_adjust: { where: 'the front brake, where the pads meet the rim', parts: ['caliper'],
      steps: { squeeze_test: { where: 'the brake lever on the handlebar', parts: ['brake_lever'] },
        barrel: { where: 'the barrel adjuster on the brake lever', parts: ['brake_lever'] },
        test_ride: { where: 'the whole bike', parts: [] } } },
    chain_clean: { where: 'the chain, from the front chainring to the back gears', shapes: [{ rect: [278, 216, 164, 78] }] },
    derailleur_index: { where: 'the rear derailleur, under the back gears', shapes: [{ rect: [408, 265, 28, 28] }],
      steps: { smallest_cog: { where: 'the shifter and the back gears', parts: ['shifter', 'cassette'] },
        test_shift_up: { where: 'the shifter and the rear derailleur', parts: ['shifter'], shapes: [{ rect: [408, 265, 28, 28] }] },
        test_all_gears: { where: 'the shifter and the back gears', parts: ['shifter', 'cassette'] } } },
    pedal_change: { where: 'the pedal, at the end of the crank arm', shapes: [{ circle: [311, 255, 20] }] },
    wheel_true: { where: 'the front wheel: the rim and its spokes', parts: ['rim'],
      steps: { find_wobble: { where: 'the rim, next to the brake pad', parts: ['rim', 'caliper'] } } },
    headset_adjust: { where: 'the headset: the bearings at the top and bottom of the head tube', shapes: [{ rect: [160, 95, 26, 70] }],
      steps: { loosen_stem: { where: 'the stem, where its pinch bolts clamp the fork', parts: ['stem'] },
        top_cap: { where: 'the top cap, on top of the stem', shapes: [{ circle: [172, 94, 7] }] },
        align_stem: { where: 'the stem and the handlebar', parts: ['stem', 'handlebar'] },
        torque_pinch: { where: 'the stem, where its pinch bolts clamp the fork', parts: ['stem'] } } }
  };
  // The ring drawn round one focus shape: a little bigger than the part, so the part itself stays visible.
  function focusOutline(sh) {
    if (sh.ring) return { circle: [sh.ring[0], sh.ring[1], sh.ring[2] + sh.ring[3] / 2 + 5] };
    if (sh.circle) return { circle: [sh.circle[0], sh.circle[1], sh.circle[2] + 6] };
    var r = sh.rect;
    if (sh.poly) {
      var xs = [], ys = [];
      sh.poly.split(' ').forEach(function(pt) { var xy = pt.split(','); xs.push(+xy[0]); ys.push(+xy[1]); });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
      r = [x0, y0, Math.max.apply(null, xs) - x0, Math.max.apply(null, ys) - y0];
    }
    return { rect: [r[0] - 6, r[1] - 6, r[2] + 12, r[3] + 12] };
  }
  // What is off the bike on the work stand. Each entry: [the step that takes it off, the step that puts it back (or
  // null)]. A step counts once it is done, so the picture shows the bike as the student left it and never which tool
  // the current step needs. stepIdx = the current step; done = the right tool was picked for it.
  var REPAIR_BIKE_STATE = {
    patch_tube: { wheelOff: ['remove_wheel', null], tubeOut: ['lever_tire', 'reseat'], patched: ['press_patch', null] },
    pedal_change: { pedalOff: ['loosen_right', 'thread_by_hand'] }
  };
  var REPAIR_STATE_WORDS = { wheelOff: 'The front wheel is off the bike, on the floor.', tubeOut: 'The inner tube is out of the tire, on the floor.', patched: 'The tube has a patch on it.', pedalOff: 'The pedal is off the crank.' };
  function repairBikeState(jobId, stepIdx, done) {
    var out = {}, rules = REPAIR_BIKE_STATE[jobId];
    var job = REPAIR_JOBS.filter(function(j) { return j.id === jobId; })[0];
    if (!rules || !job || typeof stepIdx !== 'number') return out;
    var finished = stepIdx + (done ? 1 : 0);
    var at = function(id) { for (var i = 0; i < job.steps.length; i++) { if (job.steps[i].id === id) return i; } return Infinity; };
    Object.keys(rules).forEach(function(key) {
      var r = rules[key];
      if (at(r[0]) < finished && !(r[1] && at(r[1]) < finished)) out[key] = true;
    });
    if (out.patched && !out.tubeOut) delete out.patched;   // the patch is hidden inside the tire once the tube is back in
    return out;
  }
  function repairFocus(jobId, stepId) {
    var job = REPAIR_FOCUS[jobId];
    if (!job) return { where: 'the whole bike', outlines: [] };
    var f = (stepId && job.steps && job.steps[stepId]) || job;
    var shapes = (f.parts || []).map(function(id) { return PART_SHAPES[id]; }).filter(Boolean).concat(f.shapes || []);
    return { where: f.where, outlines: shapes.map(focusOutline) };
  }

  // Small SVG builders. h is React.createElement, passed in so the drawings can be checked without a browser.
  function svgKit(h) {
    var withKids = function(tag, a, list) { return h.apply(null, [tag, a || null].concat(list || [])); };
    var paint = function(base, fill, stroke, w, extra) {
      base.fill = fill || 'none';
      if (stroke) { base.stroke = stroke; base.strokeWidth = w || 1; base.strokeLinecap = 'round'; base.strokeLinejoin = 'round'; }
      return Object.assign(base, extra || {});
    };
    var k = {
      g: function(a, list) { return withKids('g', a, list); },
      line: function(x1, y1, x2, y2, stroke, w, extra) { return h('line', Object.assign({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, strokeWidth: w, strokeLinecap: 'round' }, extra || {})); },
      circle: function(cx, cy, r, fill, stroke, w, extra) { return h('circle', paint({ cx: cx, cy: cy, r: r }, fill, stroke, w, extra)); },
      ellipse: function(cx, cy, rx, ry, fill, stroke, w, extra) { return h('ellipse', paint({ cx: cx, cy: cy, rx: rx, ry: ry }, fill, stroke, w, extra)); },
      rect: function(x, y, w, hh, rx, fill, stroke, sw, extra) { return h('rect', paint({ x: x, y: y, width: w, height: hh, rx: rx || 0 }, fill, stroke, sw, extra)); },
      path: function(d, fill, stroke, w, extra) { return h('path', paint({ d: d }, fill, stroke, w, extra)); },
      // An arc of a circle between two angles (degrees; 0 = straight up, positive = clockwise).
      arc: function(cx, cy, r, a0, a1, stroke, w, extra) {
        var pt = function(a) { var t = (a - 90) * Math.PI / 180; return (cx + r * Math.cos(t)).toFixed(1) + ' ' + (cy + r * Math.sin(t)).toFixed(1); };
        return k.path('M ' + pt(a0) + ' A ' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' + pt(a1), 'none', stroke, w, extra);
      },
      // A straight arrow from (x1, y1) to (x2, y2).
      arrow: function(x1, y1, x2, y2, color, w) {
        var a = Math.atan2(y2 - y1, x2 - x1), s = (w || 3) * 2.6;
        var p = function(da, len) { return (x2 - len * Math.cos(a + da)).toFixed(1) + ',' + (y2 - len * Math.sin(a + da)).toFixed(1); };
        return k.g(null, [k.line(x1, y1, x2 - s * 0.6 * Math.cos(a), y2 - s * 0.6 * Math.sin(a), color, w || 3),
          h('polygon', { points: x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' + p(0.5, s) + ' ' + p(-0.5, s), fill: color })]);
      }
    };
    return k;
  }

  // The 14 tools, each drawn in a box about 40 wide with its center at (0, 0). The toolbox and the step pictures
  // use the same drawings, so a student sees the tool they picked doing its job.
  function repairToolArt(h, id) {
    var k = svgKit(h), GLOVE = '#fb923c', GLOVE_D = '#9a3412', STEEL = '#64748b', DARK = '#1e293b', parts;
    if (id === 'hand') parts = [   // a work glove
      k.rect(-10, -17, 4.6, 18, 2.3, GLOVE, GLOVE_D, 1.4), k.rect(-4.9, -20, 4.6, 21, 2.3, GLOVE, GLOVE_D, 1.4),
      k.rect(0.3, -19, 4.6, 20, 2.3, GLOVE, GLOVE_D, 1.4), k.rect(5.4, -15, 4.6, 16, 2.3, GLOVE, GLOVE_D, 1.4),
      k.path('M -9 4 Q -20 -1 -17 -9 Q -13 -12 -11 -6 L -7 1 Z', GLOVE, GLOVE_D, 1.4),
      k.rect(-10, -3, 20, 17, 6, GLOVE, GLOVE_D, 1.4), k.rect(-9, 13, 18, 6, 2, GLOVE_D)
    ];
    else if (id === 'tire-lever') parts = [
      k.path('M -17 11 L 8 -9 Q 14 -15 18 -10 Q 18 -4 12 -3 L -12 16 Q -18 17 -17 11 Z', '#2563eb', '#1e3a8a', 1.5),
      k.circle(-13, 13, 2, '#dbeafe', '#1e3a8a', 1), k.line(-6, 6, 6, -4, '#93c5fd', 1.5)
    ];
    else if (id === 'pump') parts = [   // a floor pump
      k.line(0, -17, 0, -8, STEEL, 2.5), k.line(-10, -17, 10, -17, DARK, 4),
      k.rect(-4.5, -9, 9, 23, 2, '#dc2626', '#7f1d1d', 1.4), k.rect(-13, 14, 26, 4, 2, DARK),
      k.circle(0, 8, 3.4, '#ffffff', DARK, 1.2), k.line(0, 8, 2, 6, '#dc2626', 1.2),
      k.path('M 4 11 Q 17 13 16 0 Q 15 -7 19 -9', 'none', DARK, 2)
    ];
    else if (id === 'sandpaper') parts = [
      k.rect(-15, -10, 30, 20, 2, '#d6a25e', '#92400e', 1.5), k.path('M 8 10 L 15 10 L 15 3 Z', '#f5deb3', '#92400e', 1),
      k.g(null, [[-9, -4], [-2, -6], [5, -3], [-6, 3], [1, 1], [9, -6], [-11, 6], [3, 6]].map(function(p) { return k.circle(p[0], p[1], 1.1, '#92400e'); }))
    ];
    else if (id === 'glue') parts = [   // a small tube of rubber cement
      k.path('M -16 -5 L 5 -9 L 5 9 L -16 5 Z', '#e2e8f0', STEEL, 1.5), k.rect(-18, -6, 3, 12, 1, STEEL),
      k.rect(-7, -8, 7, 16, 0, '#f59e0b'), k.path('M 5 -4 L 13 -2 L 13 2 L 5 4 Z', '#f59e0b', '#92400e', 1.2),
      k.circle(17, 0, 2.3, '#93c5fd', '#1d4ed8', 1)
    ];
    else if (id === 'patch') parts = [k.circle(0, 0, 14, '#f97316', '#9a3412', 1.5), k.circle(0, 0, 9, '#1f2937')];
    else if (id === 'allen') parts = [   // an L-shaped hex key
      k.path('M -12 -15 L -12 9 Q -12 14 -7 14 L 15 14', 'none', '#0f172a', 6.5),
      k.path('M -12 -15 L -12 9 Q -12 14 -7 14 L 15 14', 'none', '#64748b', 4),
      k.path('M -12.8 -14 L -12.8 8', 'none', '#cbd5e1', 1.2)
    ];
    else if (id === 'phillips') parts = [   // a cross-head screwdriver
      k.rect(-19, -5, 17, 10, 4, '#dc2626', '#7f1d1d', 1.5), k.line(-14, -2, -6, -2, '#fca5a5', 1.5),
      k.line(-2, 0, 15, 0, STEEL, 3.4), k.line(15, 0, 19, 0, DARK, 2.4), k.line(17, -3, 17, 3, DARK, 2)
    ];
    else if (id === 'ruler') parts = [
      k.rect(-19, -6, 38, 12, 1.5, '#fde047', '#854d0e', 1.5),
      k.g(null, [0, 1, 2, 3, 4, 5, 6, 7].map(function(i) { return k.line(-15.5 + i * 4.4, -6, -15.5 + i * 4.4, i % 2 ? -2.5 : 0, '#854d0e', 1.2); }))
    ];
    else if (id === 'degreaser') parts = [   // a spray bottle
      k.rect(-9, -2, 16, 19, 3, '#22c55e', '#14532d', 1.5), k.rect(-5, 4, 8, 7, 1, '#dcfce7'),
      k.rect(-5, -8, 8, 6, 1, '#e2e8f0', STEEL, 1.2), k.path('M -7 -15 L 7 -15 L 7 -8 L -7 -8 Z', DARK),
      k.line(7, -12.5, 12, -12.5, DARK, 3), k.path('M 3 -8 Q 8 -4 5 1', 'none', DARK, 2),
      k.g(null, [[16, -16], [18, -12.5], [16, -9]].map(function(p) { return k.circle(p[0], p[1], 1.2, '#22c55e'); }))
    ];
    else if (id === 'brush') parts = [
      k.rect(-19, -1, 25, 5.5, 2.7, '#0ea5e9', '#075985', 1.2), k.rect(5, -1.5, 14, 6.5, 2, '#e2e8f0', STEEL, 1.2),
      k.g(null, [0, 1, 2, 3, 4].map(function(i) { return k.line(7.5 + i * 2.4, -2, 7.5 + i * 2.4, -10, '#475569', 1.6); }))
    ];
    else if (id === 'water') parts = [   // a squeeze bottle of water
      k.rect(-8, -6, 14, 23, 4, '#e0f2fe', '#0369a1', 1.5), k.rect(-6.5, 3, 11, 12.5, 3, '#38bdf8'),
      k.rect(-5, -12, 8, 6, 1.5, '#0369a1'), k.rect(-2.5, -17, 3, 5, 1, '#0369a1'),
      k.path('M 13 -10 Q 18 -2 13 0 Q 8 -2 13 -10 Z', '#38bdf8', '#0369a1', 1)
    ];
    else if (id === 'rag') parts = [
      k.path('M -17 -8 Q -8 -15 0 -9 Q 8 -3 17 -10 L 15 8 Q 7 15 -1 9 Q -9 3 -18 10 Z', '#fca5a5', '#991b1b', 1.5),
      k.path('M -6 -9 Q -2 0 -7 7', 'none', '#991b1b', 1), k.path('M 8 -5 Q 11 2 7 11', 'none', '#991b1b', 1)
    ];
    else if (id === 'lube') parts = [   // a small bottle of chain oil with a thin spout
      k.rect(-9, -3, 15, 20, 3, '#facc15', '#854d0e', 1.5), k.rect(-6.5, 5, 10, 7, 1, '#fef9c3'),
      k.path('M -5 -3 L -3 -8 L 0 -8 L 2 -3 Z', '#854d0e'), k.line(-1.5, -8, 6, -17, '#854d0e', 2.6),
      k.path('M 12 -14 Q 16 -7 12 -5 Q 8 -7 12 -14 Z', '#f59e0b', '#854d0e', 1)
    ];
    else parts = [k.circle(0, 0, 12, '#e2e8f0', STEEL, 1.5)];
    return k.g({ 'data-bikelab-tool-art': id }, parts);
  }
  // A tool placed in a step picture.
  function placeTool(h, id, x, y, scale, turn) {
    return h('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + (turn || 0) + ') scale(' + (scale || 1) + ')' }, repairToolArt(h, id));
  }

  // ── Step scenes ──
  // Each scene draws the STATE of the bike. A tool (or a gloved hand) is drawn only when o.tool is set, which the
  // step picture does only after the student has picked the right one: the picture must never answer the question.
  var ART = { tire: '#1f2937', tube: '#4b5563', rim: '#94a3b8', rimDark: '#64748b', steel: '#475569', fork: '#334155',
    pad: '#f43f5e', padDark: '#881337', glove: '#fb923c', gloveDark: '#9a3412', air: '#0ea5e9', warn: '#dc2626', good: '#15803d', sky: '#eef2f7', floor: '#cbd5e1' };
  function sceneBackdrop(k) { return k.rect(0, 0, 320, 200, 12, ART.sky); }

  // Side view of the front wheel under its fork. o: { flat, out, qrOpen, pumped, tool }
  function sceneWheel(h, o) {
    var k = svgKit(h), cx = 138, cy = o.flat ? 121 : 116, R = 60, lift = o.out ? -34 : 0, kids = [sceneBackdrop(k)];
    kids.push(k.line(14, 186, 306, 186, ART.floor, 3));
    // fork (lifted clear of the wheel once the wheel is out)
    var fx = cx, fy = (o.flat ? 121 : 116) + lift;
    kids.push(k.line(fx + 40, fy - 112, fx, fy, ART.fork, 10));
    kids.push(k.line(fx + 40, fy - 112, fx + 46, fy - 128, '#0d9488', 14));
    if (o.flat) kids.push(k.ellipse(cx, 183, 31, 6, ART.tire));
    kids.push(k.circle(cx, cy, R, 'none', ART.tire, 13));
    kids.push(k.circle(cx, cy, R, 'none', '#4b5563', 1.5, { strokeDasharray: '3 5' }));
    kids.push(k.circle(cx, cy, R - 11, 'none', ART.rim, 5));
    kids.push(k.g(null, [0, 1, 2, 3, 4, 5, 6, 7].map(function(i) { var a = i * Math.PI / 8 + 0.2; return k.line(cx - (R - 13) * Math.cos(a), cy - (R - 13) * Math.sin(a), cx + (R - 13) * Math.cos(a), cy + (R - 13) * Math.sin(a), ART.rim, 1.2); })));
    kids.push(k.line(cx, cy + R - 14, cx, cy + R - 28, '#111827', 3.5));          // valve, at the bottom of the wheel
    kids.push(k.circle(cx, cy, 7, ART.steel, '#1e293b', 1.5));
    // fork end: closed round the axle, or an open slot once the wheel is out
    kids.push(o.out ? k.path('M ' + (fx - 6) + ' ' + (fy + 5) + ' L ' + (fx - 6) + ' ' + (fy - 5) + ' L ' + (fx + 6) + ' ' + (fy - 5) + ' L ' + (fx + 6) + ' ' + (fy + 5), 'none', ART.fork, 4)
      : k.circle(fx, fy, 9, 'none', ART.fork, 4));
    // quick-release lever at the axle: closed lies along the fork, open sticks straight out
    kids.push(o.qrOpen ? k.line(cx, cy, cx - 30, cy + 6, '#e2e8f0', 5, { stroke: '#e2e8f0' }) : k.line(cx + 2, cy - 2, cx + 12, cy - 28, '#e2e8f0', 5));
    kids.push(o.qrOpen ? k.line(cx, cy, cx - 30, cy + 6, '#1e293b', 1.5) : k.line(cx + 2, cy - 2, cx + 12, cy - 28, '#1e293b', 1.5));
    if (o.out) kids.push(k.arrow(fx + 34, cy - 14, fx + 34, fy - 4, ART.good, 4));      // the fork lifts away
    if (o.pumped) {      // pump on the valve, and a gauge with its needle inside the green range
      kids.push(k.path('M ' + cx + ' ' + (cy + R - 28) + ' Q ' + (cx + 40) + ' ' + (cy + 10) + ' 248 150', 'none', '#1e293b', 3));
      kids.push(k.rect(cx - 5, cy + R - 36, 10, 9, 2, '#1e293b'));
      kids.push(placeTool(h, 'pump', 262, 138, 2.3, 0));
      kids.push(k.circle(262, 48, 30, '#ffffff', '#1e293b', 2.5));
      kids.push(k.arc(262, 48, 22, -120, 120, '#cbd5e1', 6));
      kids.push(k.arc(262, 48, 22, 10, 80, ART.good, 6));
      kids.push(k.line(262, 48, 262 + 19 * Math.sin(0.8), 48 - 19 * Math.cos(0.8), '#dc2626', 2.5));
      kids.push(k.circle(262, 48, 3, '#1e293b'));
    }
    if (o.tool === 'hand') kids.push(placeTool(h, 'hand', cx - 58, cy + 34, 1.4, 62));
    return kids;
  }

  // Close-up of the valve, standing up from the rim. o: { capOn, tool }
  function sceneValve(h, o) {
    var k = svgKit(h), kids = [sceneBackdrop(k)];
    kids.push(k.line(70, 158, 122, 0, '#cbd5e1', 3), k.line(250, 158, 198, 0, '#cbd5e1', 3));       // two spokes
    kids.push(k.rect(-6, 176, 332, 30, 0, ART.tire));
    kids.push(k.rect(-6, 154, 332, 24, 0, ART.rim, ART.rimDark, 2));
    kids.push(k.rect(150, 142, 20, 14, 3, '#111827'));                                                // nut at the rim
    kids.push(k.rect(153, 86, 14, 58, 3, '#1f2937'));
    kids.push(k.g(null, [96, 104, 112, 120, 128].map(function(y) { return k.line(153, y, 167, y, '#475569', 1.2); })));
    if (o.capOn) {
      kids.push(k.rect(149, 66, 22, 26, 6, '#111827', '#475569', 1.5));
      kids.push(k.g(null, [154, 160, 166].map(function(x) { return k.line(x, 72, x, 88, '#475569', 1.5); })));
    } else {
      kids.push(k.rect(156, 76, 8, 11, 2, '#b45309', '#78350f', 1.2));                                // brass tip
      kids.push(k.rect(158.5, 70, 3, 7, 1, '#fbbf24'));                                               // the pin
      kids.push(h('g', { transform: 'translate(236 144) rotate(72)' }, k.rect(-11, -13, 22, 26, 6, '#111827', '#475569', 1.5)));   // cap, set down on the rim
    }
    if (o.tool === 'hand') {     // one gloved finger pressing the pin, and air coming out
      kids.push(k.g({ 'data-bikelab-tool-art': 'hand' }, [k.rect(151, 8, 18, 62, 9, ART.glove, ART.gloveDark, 1.8), k.rect(150, 0, 20, 12, 3, ART.gloveDark)]));
      kids.push(k.g(null, [[-1, 0], [-1, 1], [1, 0], [1, 1]].map(function(p) {
        var x0 = 160 + p[0] * 14, y0 = 80 - p[1] * 6;
        return k.line(x0, y0, x0 + p[0] * 26, y0 - 8 - p[1] * 14, ART.air, 3.5);
      })));
    }
    return kids;
  }

  // Close-up of the top of the wheel: an arc of tire on its rim. o: { lifted, tubeShows, tool }
  function sceneRimArc(h, o) {
    var k = svgKit(h), cx = 160, cy = 372, kids = [sceneBackdrop(k)];
    kids.push(k.g(null, [-27, -15, -3, 9, 21, 33].map(function(a, i) {
      var t = (a - 90) * Math.PI / 180, bend = (i % 2 ? 1 : -1) * 16;
      return k.line(cx + 240 * Math.cos(t), cy + 240 * Math.sin(t), cx + bend + 150 * Math.cos(t), cy + 150 * Math.sin(t), '#cbd5e1', 2.5);
    })));
    if (o.tubeShows) {   // the tire edge is off the rim, and the tube shows in the gap
      kids.push(k.arc(cx, cy, 290, -40, 40, ART.tire, 34));
      kids.push(k.arc(cx, cy, 268, -40, 40, '#6b7280', 12));
      var pt = (14 - 90) * Math.PI / 180;
      kids.push(k.circle(cx + 268 * Math.cos(pt), cy + 268 * Math.sin(pt), 5.5, '#f97316', '#9a3412', 1));        // the patch
    } else {
      kids.push(k.arc(cx, cy, 277, -40, 40, ART.tire, 34));
      kids.push(k.arc(cx, cy, 291, -40, 40, '#4b5563', 1.5, { strokeDasharray: '4 6' }));
    }
    kids.push(k.arc(cx, cy, 252, -40, 40, ART.rim, 15));
    kids.push(k.arc(cx, cy, 258.5, -40, 40, ART.rimDark, 2));
    if (o.tool === 'tire-lever') {
      kids.push(k.arc(cx, cy, 252, -17, 3, ART.tire, 19));                                            // the edge of the tire, lifted over the rim
      var lever = function(a, hookX, hookY) {
        var t = (a - 90) * Math.PI / 180, tx = cx + 262 * Math.cos(t), ty = cy + 262 * Math.sin(t);
        return k.g({ 'data-bikelab-tool-art': 'tire-lever' }, [k.line(tx, ty, hookX, hookY, '#1e3a8a', 12), k.line(tx, ty, hookX, hookY, '#2563eb', 8.5), k.line(tx + 2, ty + 6, (tx + hookX) / 2, (ty + hookY) / 2, '#93c5fd', 2)]);
      };
      kids.push(lever(-8, 116, 190), lever(11, 238, 172));
      kids.push(k.arrow(262, 150, 244, 128, ART.good, 3));
    }
    if (o.tool === 'hand') {
      kids.push(placeTool(h, 'hand', 104, 58, 2, 172), placeTool(h, 'hand', 214, 58, 2, 188));
      kids.push(k.arrow(160, 30, 160, 62, ART.good, 3));
    }
    return kids;
  }

  // Close-up of the tube. o: { limp, hole: 'hidden' | 'marked' | 'plain', scuffed, glue: 'wet' | 'dull', patched, tool }
  function sceneTube(h, o) {
    var k = svgKit(h), w = o.limp ? 42 : 60, kids = [sceneBackdrop(k)], HX = 160, HY = 104;
    kids.push(k.path('M -20 128 Q 160 82 340 128', 'none', ART.tube, w));
    kids.push(k.path('M -20 ' + (128 - w * 0.28) + ' Q 160 ' + (82 - w * 0.28) + ' 340 ' + (128 - w * 0.28), 'none', 'rgba(255,255,255,0.16)', 5));
    if (o.limp) kids.push(k.path('M 60 112 Q 70 118 62 126 M 236 104 Q 246 112 240 122', 'none', '#1f2937', 2));     // wrinkles: no air inside
    kids.push(k.rect(40, 62, 10, 40, 3, '#111827'));                                                                  // the valve
    if (o.scuffed) {
      kids.push(k.ellipse(HX, HY, 34, 21, '#6b7280'));
      kids.push(k.g(null, [-24, -14, -4, 6, 16, 26].map(function(dx) { return k.line(HX + dx - 5, HY + 10, HX + dx + 5, HY - 10, '#9ca3af', 1.4); })));
    }
    if (o.glue) {
      kids.push(k.ellipse(HX, HY, 40, 25, o.glue === 'wet' ? 'rgba(186,230,253,0.92)' : 'rgba(203,213,225,0.82)', o.glue === 'wet' ? '#38bdf8' : '#94a3b8', 1.5));
      if (o.glue === 'wet') kids.push(k.path('M ' + (HX - 24) + ' ' + (HY - 8) + ' Q ' + (HX - 6) + ' ' + (HY - 19) + ' ' + (HX + 16) + ' ' + (HY - 14), 'none', '#ffffff', 3));   // the shine of wet glue
    }
    if (o.hole === 'marked' || o.hole === 'plain') kids.push(k.circle(HX, HY, 2.6, '#020617'));
    if (o.hole === 'marked') kids.push(k.circle(HX, HY, 15, 'none', '#fde047', 2.5, { strokeDasharray: '5 4' }));     // chalk ring
    if (o.patched) kids.push(k.circle(HX, HY, 24, '#f97316', '#9a3412', 1.5), k.circle(HX, HY, 16, '#1f2937'));
    if (o.tool === 'pump') {      // air in, and air hissing out of the hole
      kids.push(k.rect(38, 48, 14, 16, 3, '#1e293b'), k.path('M 45 48 Q 4 40 10 110 Q 16 168 70 176', 'none', '#1e293b', 3.5));
      kids.push(placeTool(h, 'pump', 92, 170, 1.4, 0));
      kids.push(k.g(null, [-1, 0, 1].map(function(i) { return k.line(HX + i * 9, HY - 14, HX + i * 24, HY - 46 + Math.abs(i) * 8, ART.air, 3.5); })));
      kids.push(k.circle(HX, HY, 2.6, '#020617'));
    }
    if (o.tool === 'sandpaper') kids.push(placeTool(h, 'sandpaper', HX + 44, HY - 34, 1.7, -24), k.path('M ' + (HX + 6) + ' ' + (HY - 34) + ' q 8 -8 16 0 M ' + (HX + 2) + ' ' + (HY - 44) + ' q 10 -9 20 0', 'none', ART.good, 2.5));
    if (o.tool === 'glue') kids.push(placeTool(h, 'glue', HX + 62, HY - 52, 2, 140));
    if (o.tool === 'patch') kids.push(placeTool(h, 'hand', HX, HY - 62, 1.9, 180), k.arrow(HX + 46, HY - 58, HX + 46, HY - 26, ART.good, 3));
    return kids;
  }

  // Looking into the empty tire, cut across. o: { thorn: 'in' | 'out', tool }
  function sceneTireInside(h, o) {
    var k = svgKit(h), kids = [sceneBackdrop(k)];
    kids.push(k.g(null, [96, 118, 140, 162, 184, 206].map(function(x) { return k.rect(x, 14, 14, 9, 2, '#111827'); })));      // tread blocks
    kids.push(k.path('M 72 190 L 72 112 A 88 88 0 0 1 248 112 L 248 190', 'none', ART.tire, 26));
    kids.push(k.path('M 86 190 L 86 112 A 74 74 0 0 1 234 112 L 234 190', 'none', '#374151', 2));
    if (o.thorn === 'in') kids.push(k.path('M 176 -4 L 186 -4 L 181 64 Z', '#92400e', '#451a03', 1.2));                          // still stuck through the tire
    else {
      kids.push(k.circle(181, 24, 2.6, '#020617'));
      kids.push(h('g', { transform: 'translate(284 54) rotate(64)' }, k.path('M -5 -30 L 5 -30 L 0 34 Z', '#92400e', '#451a03', 1.2)));
    }
    if (o.tool === 'hand') {
      kids.push(placeTool(h, 'hand', 150, 96, 2.4, 0));
      kids.push(k.path('M 104 66 q 14 -18 34 -22 M 196 46 q 16 6 24 22', 'none', ART.good, 2.5));
    }
    return kids;
  }

  // The brake lever under the handlebar grip. o: { pull (0 = at rest, 1 = back at the grip), ghost (where it stops
  // when squeezed, drawn dashed), ghostOk, barrelOut, squeeze: a gloved hand on the lever, turn: gloved fingers on the barrel }
  function sceneLever(h, o) {
    var k = svgKit(h), kids = [sceneBackdrop(k)];
    var tipY = function(p) { return 142 - 50 * p; };
    var blade = function(p) { return 'M 196 96 Q 150 ' + (tipY(p) + 2) + ' 52 ' + tipY(p); };
    kids.push(k.line(110, 74, 330, 74, ART.fork, 14));
    kids.push(k.line(24, 74, 136, 74, '#111827', 22));
    kids.push(k.g(null, [40, 56, 72, 88, 104, 120].map(function(x) { return k.line(x, 65, x, 83, '#374151', 2); })));
    // cable and its barrel adjuster
    var bx = o.barrelOut ? 232 : 220;
    kids.push(k.path('M ' + (bx + 16) + ' 92 Q 290 96 312 190', 'none', '#1f2937', 5));
    if (o.barrelOut) kids.push(k.rect(218, 88.5, 16, 7, 0, '#e2e8f0', '#64748b', 1), k.g(null, [221, 225, 229].map(function(x) { return k.line(x, 88.5, x, 95.5, '#64748b', 1.2); })));
    kids.push(k.rect(bx, 85, 16, 14, 3, '#cbd5e1', '#475569', 1.5));
    kids.push(k.g(null, [bx + 4, bx + 8, bx + 12].map(function(x) { return k.line(x, 86, x, 98, '#475569', 1.2); })));
    kids.push(k.rect(184, 62, 36, 42, 6, ART.steel, '#1e293b', 1.5));
    if (o.ghost != null) kids.push(k.path(blade(o.ghost), 'none', o.ghostOk ? ART.good : ART.warn, 3, { strokeDasharray: '7 6' }));
    kids.push(k.path(blade(o.pull || 0), 'none', '#1e293b', 11), k.path(blade(o.pull || 0), 'none', '#cbd5e1', 7.5));
    kids.push(k.circle(196, 96, 4, '#1e293b'));
    if (o.squeeze) {               // a gloved hand round the grip and the lever
      var ty = tipY(o.pull || 0);
      kids.push(k.g({ 'data-bikelab-tool-art': 'hand' }, [k.rect(48, 52, 86, 20, 10, ART.glove, ART.gloveDark, 1.8)].concat([58, 77, 96, 115].map(function(x, i) {
        return k.rect(x, 70, 15, ty - 70 + 12 - i * 2.5, 7.5, ART.glove, ART.gloveDark, 1.8);
      }))));
      if ((o.pull || 0) >= 0.95) kids.push(k.g(null, [[30, 96], [26, 106], [34, 112]].map(function(p) { return k.line(p[0], p[1], p[0] + 12, p[1] - 3, ART.warn, 3); })));
    }
    if (o.turn) {                  // fingers turning the barrel adjuster, and which way
      kids.push(placeTool(h, 'hand', bx + 12, 132, 1.5, 0));
      kids.push(k.arc(bx + 8, 92, 19, -150, -20, ART.good, 3), h('polygon', { points: (bx - 2) + ',' + 109 + ' ' + (bx + 1) + ',' + 97 + ' ' + (bx - 12) + ',' + 101, fill: ART.good }));
    }
    return kids;
  }

  // The brake seen from the front: tire on its rim, a pad each side. o: { gapL, gapR, padUp (pads sit too high),
  // tool: 'allen', at: 'center' | 'pad' }
  function sceneBrakeFront(h, o) {
    var k = svgKit(h), kids = [sceneBackdrop(k)];
    var gapL = o.gapL == null ? 7 : o.gapL, gapR = o.gapR == null ? 7 : o.gapR, dy = o.padUp ? -19 : 0;
    var padL = 143 - gapL - 16, padR = 177 + gapR, mid = (padL + padR + 16) / 2, armL = padL - 8, armR = padR + 24;
    kids.push(k.rect(mid - 26, -6, 52, 16, 4, ART.fork));                                              // fork crown
    kids.push(k.line(154, 126, 146, 200, '#cbd5e1', 2.5), k.line(166, 126, 174, 200, '#cbd5e1', 2.5));
    kids.push(k.path('M ' + armL + ' ' + (104 + dy) + ' L ' + armL + ' 52 Q ' + armL + ' 18 ' + mid + ' 18 Q ' + armR + ' 18 ' + armR + ' 52 L ' + armR + ' ' + (104 + dy), 'none', '#1e293b', 11));
    kids.push(k.path('M ' + armL + ' ' + (104 + dy) + ' L ' + armL + ' 52 Q ' + armL + ' 18 ' + mid + ' 18 Q ' + armR + ' 18 ' + armR + ' 52 L ' + armR + ' ' + (104 + dy), 'none', '#94a3b8', 7));
    kids.push(k.circle(160, 62, 27, ART.tire));
    kids.push(k.rect(143, 82, 34, 46, 4, ART.rim, ART.rimDark, 2));
    kids.push(k.line(146, 88, 146, 122, '#e2e8f0', 2), k.line(174, 88, 174, 122, '#e2e8f0', 2));       // the braking surfaces
    kids.push(k.rect(padL, 92 + dy, 16, 24, 3, ART.pad, ART.padDark, 1.5), k.rect(padR, 92 + dy, 16, 24, 3, ART.pad, ART.padDark, 1.5));
    kids.push(k.line(armL, 104 + dy, padL, 104 + dy, '#1e293b', 5), k.line(armR, 104 + dy, padR + 16, 104 + dy, '#1e293b', 5));
    kids.push(k.circle(armL, 104 + dy, 5, '#cbd5e1', '#1e293b', 1.5), k.circle(armR, 104 + dy, 5, '#cbd5e1', '#1e293b', 1.5));
    kids.push(k.circle(mid, 18, 7, '#cbd5e1', '#1e293b', 1.5));                                        // the bolt that holds the brake to the fork
    var rub = function(x) { return k.g(null, [96, 104, 112].map(function(y) { return k.line(x - 4, y + dy - 3, x + 4, y + dy + 3, ART.warn, 2.5); })); };
    if (gapL <= 0.5 && !o.grip) kids.push(rub(141));
    if (gapR <= 0.5 && !o.grip) kids.push(rub(179));
    if (o.tool === 'allen') {      // the hex key, in the bolt it turns
      var key = o.at === 'pad' ? 'M ' + armL + ' ' + (104 + dy) + ' L ' + (armL - 44) + ' ' + (104 + dy) + ' L ' + (armL - 44) + ' ' + (76 + dy)
        : 'M ' + mid + ' 18 L ' + (mid + 62) + ' 18 L ' + (mid + 62) + ' 46';
      kids.push(k.g({ 'data-bikelab-tool-art': 'allen' }, [k.path(key, 'none', '#0f172a', 8), k.path(key, 'none', '#64748b', 5)]));
    }
    return kids;
  }

  // One brake pad and the rim, seen from above. The arrow points to the front of the bike. o: { toe, tool }
  function scenePadTop(h, o) {
    var k = svgKit(h), kids = [sceneBackdrop(k)];
    kids.push(k.arrow(96, 34, 224, 34, '#475569', 4));
    kids.push(k.rect(-6, 60, 332, 30, 0, ART.rim, ART.rimDark, 2), k.line(-6, 68, 326, 68, '#e2e8f0', 2));
    var turn = o.toe ? -4.5 : 0;
    if (o.toe) kids.push(k.rect(78, 90.5, 44, 9, 1, '#ffffff', '#475569', 1.5));                       // a card under the back end of the pad
    kids.push(h('g', { transform: 'rotate(' + turn + ' 160 114)' },
      k.rect(96, 100, 128, 28, 7, ART.pad, ART.padDark, 2),
      k.g(null, [118, 140, 180, 202].map(function(x) { return k.line(x, 101, x, 110, ART.padDark, 2); })),
      k.rect(146, 124, 28, 20, 3, ART.steel, '#1e293b', 1.5), k.circle(160, 134, 6, '#cbd5e1', '#1e293b', 1.5)));
    if (o.tool === 'allen') kids.push(placeTool(h, 'allen', 182, 158, 1.6, 180));
    return kids;
  }

  // Step pictures for the two most-used jobs. `before` is what the student sees while choosing a tool: it shows the
  // bike, never a tool. `after` adds the right tool at work. cap = [what the first picture shows, what the second shows].
  var REPAIR_PICTURES = {
    patch_tube: {
      remove_wheel: { scene: sceneWheel, before: { flat: true }, after: { flat: true, out: true, qrOpen: true, tool: 'hand' },
        cap: ['The front wheel is in the fork. The tire is flat.', 'The lever at the axle is flipped open, and the fork lifts off the wheel.'] },
      deflate: { scene: sceneValve, before: { capOn: true }, after: { tool: 'hand' },
        cap: ['The valve, with its cap on. Some air is still inside the tube.', 'Cap off. Pressing the pin in the valve lets the last air out.'] },
      lever_tire: { scene: sceneRimArc, before: {}, after: { tool: 'tire-lever' },
        cap: ['The top of the wheel, close up. The tire sits tight on the rim.', 'One lever lifts the edge of the tire over the rim. A second lever goes in a little way along.'] },
      locate_hole: { scene: sceneTube, before: { limp: true, hole: 'hidden' }, after: { tool: 'pump' },
        cap: ['The tube is out of the tire. It is limp, and the hole is too small to see.', 'With some air in the tube, air hisses out of the hole. Now you can find it.'] },
      rough_patch: { scene: sceneTube, before: { hole: 'marked' }, after: { hole: 'plain', scuffed: true, tool: 'sandpaper' },
        cap: ['The hole is found and marked with a ring.', 'The rubber around the hole is scuffed and dull, ready for glue.'] },
      apply_glue: { scene: sceneTube, before: { hole: 'plain', scuffed: true }, after: { hole: 'plain', scuffed: true, glue: 'wet', tool: 'glue' },
        cap: ['The scuffed rubber around the hole.', 'A thin layer of glue, wider than the patch. It is still wet and shiny: wait until the shine has gone.'] },
      press_patch: { scene: sceneTube, before: { hole: 'plain', scuffed: true, glue: 'dull' }, after: { scuffed: true, glue: 'dull', patched: true, tool: 'patch' },
        cap: ['The glue has gone dull. It is ready.', 'The patch covers the hole, pressed down hard.'] },
      check_tire: { scene: sceneTireInside, before: { thorn: 'in' }, after: { thorn: 'out', tool: 'hand' },
        cap: ['The empty tire, cut across so you can see inside. Something sharp is still stuck through it.', 'Fingers sweep the inside of the tire. The thorn is out.'] },
      reseat: { scene: sceneRimArc, before: { tubeShows: true }, after: { tool: 'hand' },
        cap: ['The patched tube sits between the rim and the tire. The edge of the tire is still off the rim.', 'The edge of the tire is pushed back over the rim, with the tube tucked inside.'] },
      inflate: { scene: sceneWheel, before: { flat: true }, after: { pumped: true, tool: 'pump' },
        cap: ['The tire is back on the rim, but it is still flat.', 'The tire is round and firm. The needle on the gauge is inside the green range.'] }
    },
    brake_adjust: {
      squeeze_test: { scene: sceneLever, before: { pull: 0 }, after: { pull: 1, squeeze: true, tool: 'hand' },
        cap: ['The brake lever at rest, under the handlebar grip.', 'Squeezed, this lever comes all the way back to the grip. The cable is too loose.'] },
      barrel: { scene: sceneLever, before: { pull: 0, ghost: 1 }, after: { pull: 0, ghost: 0.5, ghostOk: true, barrelOut: true, turn: true, tool: 'hand' },
        cap: ['The dashed line shows where the lever stops when squeezed: at the grip. The ribbed barrel adjuster is where the cable leaves the lever.', 'The barrel adjuster is turned out a little. The cable is tighter, so the lever now stops half way.'] },
      center_caliper: { scene: sceneBrakeFront, before: { gapL: 0, gapR: 15 }, after: { tool: 'allen', at: 'center' },
        cap: ['The brake seen from the front. One pad rubs the rim and the other is far away: the brake is off center.', 'The brake sits in the middle. Both pads are the same small distance from the rim.'] },
      pad_alignment: { scene: sceneBrakeFront, before: { gapL: 3, gapR: 3, padUp: true }, after: { tool: 'allen', at: 'pad' },
        cap: ['The pads sit too high. Part of each pad would press on the tire.', 'Each pad now sits flat on the metal rim, below the tire.'] },
      toe_in: { scene: scenePadTop, before: {}, after: { toe: true, tool: 'allen' },
        cap: ['One pad and the rim, seen from above. The arrow points to the front of the bike. The pad is level with the rim.', 'The front end of the pad is a tiny bit closer to the rim. A card under the back end sets the gap.'] },
      test_ride: { scene: sceneLever, before: { pull: 0, ghost: 0.5, ghostOk: true }, after: { pull: 0.5, squeeze: true, tool: 'hand' },
        cap: ['The dashed line shows where the lever stops now: half way to the grip.', 'A squeeze stops the wheel firmly, with room left between the lever and the grip.'] }
    }
  };
  // The picture for one step, or null when the job has none. done = the student has picked the right tool.
  function repairStepArt(h, jobId, stepId, done) {
    var pic = REPAIR_PICTURES[jobId] && REPAIR_PICTURES[jobId][stepId];
    if (!pic) return null;
    var o = done ? pic.after : pic.before, clean = {};
    Object.keys(o).forEach(function(key) { if (done || (key !== 'tool' && key !== 'turn' && key !== 'squeeze')) clean[key] = o[key]; });
    return { kids: pic.scene(h, clean), caption: pic.cap[done ? 1 : 0], tool: done ? (pic.after.tool || null) : null };
  }

  // ─────────────────────────────────────────────────────────
  // SIGNAL DRILL: the street ahead, seen from behind the rider
  // ─────────────────────────────────────────────────────────
  // Each scene shows WHY a signal is needed (the turn, the stop, the lane change). The rider keeps both hands on the
  // bars, so the picture never shows which arm pose to pick. US roads: the rider keeps to the right.
  var SIGNAL_SCENES = {
    'turn-left': { side: 'both', route: 'left', caption: 'A street crosses ahead. The green line is your route: it turns left.' },
    'turn-right': { side: 'right', route: 'right', caption: 'A side street on the right. The green line is your route: it turns right.' },
    'stop-light': { side: 'both', light: true, caption: 'A street crosses ahead, and the traffic light is red.' },
    'stop-sign': { side: 'both', sign: true, caption: 'A street crosses ahead, with a stop sign at the corner.' },
    'lane-left': { parked: true, route: 'aroundLeft', caption: 'A car is parked in your lane. The green line is your route: it moves left to pass it.' },
    'lane-right': { bikeLane: true, route: 'intoLane', caption: 'A bike lane starts on the right. The green line is your route: it moves right into it.' },
    'stop-ped': { crosswalk: true, walker: true, caption: 'A person is walking across the crosswalk ahead.' },
    'turn-l2': { driveway: true, route: 'left', caption: 'A driveway on the left. The green line is your route: it turns left into it.' },
    'turn-r2': { side: 'right', pole: true, route: 'right', caption: 'A pole on the right, with a side street just after it. The green line is your route: it turns right there.' },
    'stop-haz': { branch: true, caption: 'A fallen branch lies across your lane ahead.' }
  };
  function signalSceneSvg(h, id) {
    var sc = SIGNAL_SCENES[id] || {}, k = svgKit(h), kids = [];
    var HZ = 60, half = function(y) { return 10 + (y - HZ) * 1.15; };          // road half-width at screen height y
    kids.push(k.rect(0, 0, 320, HZ + 1, 0, '#bae6fd'), k.rect(0, HZ, 320, 120, 0, '#86c06c'));
    kids.push(k.path('M 0 ' + (HZ - 6) + ' Q 60 ' + (HZ - 22) + ' 120 ' + (HZ - 8) + ' T 240 ' + (HZ - 10) + ' T 320 ' + (HZ - 14) + ' L 320 ' + HZ + ' L 0 ' + HZ + ' Z', '#4d7c0f'));
    if (sc.side) {        // the cross street, on one side or both
      var x0 = sc.side === 'right' ? 160 : 0, x1 = sc.side === 'left' ? 160 : 320;
      kids.push(k.rect(x0, 82, x1 - x0, 14, 0, '#64748b'));
    }
    if (sc.driveway) kids.push(k.path('M 0 84 L 132 84 L 128 96 L 0 96 Z', '#94a3b8'), k.rect(22, 50, 46, 30, 2, '#fef3c7', '#92400e', 1.5), k.path('M 16 52 L 45 32 L 74 52 Z', '#b91c1c'), k.rect(40, 62, 12, 18, 1, '#92400e'));
    kids.push(k.path('M ' + (160 - half(HZ)) + ' ' + HZ + ' L ' + (160 + half(HZ)) + ' ' + HZ + ' L ' + (160 + half(180)) + ' 180 L ' + (160 - half(180)) + ' 180 Z', '#475569'));
    if (sc.side) {        // repaint the crossing over the road, so it reads as an intersection
      kids.push(k.rect(160 - half(82), 82, half(82) * 2, 14, 0, '#64748b'));
    }
    kids.push(k.line(160, HZ + 2, 160, 180, '#fde047', 2.5, { strokeDasharray: '7 7' }));      // center line
    kids.push(k.line(160 - half(HZ) + 2, HZ, 160 - half(180) + 8, 180, '#e2e8f0', 2), k.line(160 + half(HZ) - 2, HZ, 160 + half(180) - 8, 180, '#e2e8f0', 2));
    if (sc.bikeLane) {
      kids.push(k.line(160 + half(HZ) * 0.62, HZ, 160 + half(180) * 0.62, 180, '#ffffff', 3));
      kids.push(h('g', { transform: 'translate(' + (160 + half(150) * 0.82) + ' 150) scale(0.9)' },
        k.circle(-7, 0, 5, 'none', '#ffffff', 2), k.circle(7, 0, 5, 'none', '#ffffff', 2), k.path('M -7 0 L -1 -8 L 7 0 M -1 -8 L 4 -8', 'none', '#ffffff', 2)));
    }
    if (sc.crosswalk) kids.push(k.g(null, [-4, -3, -2, -1, 0, 1, 2, 3].map(function(i) { var w = half(100) * 2 / 9; return k.rect(160 + i * w * 1.1 - w * 0.25, 94, w * 0.6, 12, 0, '#f8fafc'); })));
    if (sc.walker) kids.push(k.g(null, [k.circle(176, 70, 4.5, '#fbbf77'), k.line(176, 75, 176, 89, '#7c3aed', 5), k.line(176, 89, 171, 100, '#1e293b', 3), k.line(176, 89, 182, 100, '#1e293b', 3), k.line(176, 78, 170, 86, '#7c3aed', 2.5), k.line(176, 78, 183, 85, '#7c3aed', 2.5)]));
    if (sc.light) kids.push(k.line(214, 30, 214, 98, '#334155', 3), k.rect(205, 14, 18, 42, 4, '#0f172a'), k.circle(214, 24, 5.5, '#ef4444', '#fecaca', 1.5), k.circle(214, 35, 5.5, '#3f3f46'), k.circle(214, 46, 5.5, '#3f3f46'));
    if (sc.sign) {
      var oct = [0, 1, 2, 3, 4, 5, 6, 7].map(function(i) { var a = (i * 45 + 22.5) * Math.PI / 180; return (214 + 13 * Math.cos(a)).toFixed(1) + ',' + (40 + 13 * Math.sin(a)).toFixed(1); }).join(' ');
      kids.push(k.line(214, 52, 214, 98, '#64748b', 3), h('polygon', { points: oct, fill: '#dc2626', stroke: '#ffffff', strokeWidth: 2 }),
        h('text', { x: 214, y: 43, textAnchor: 'middle', fontSize: 8, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'sans-serif' }, 'STOP'));
    }
    if (sc.pole) kids.push(k.line(204, 14, 204, 86, '#78350f', 4), k.line(194, 22, 214, 22, '#78350f', 3));
    if (sc.parked) kids.push(k.g(null, [k.rect(166, 98, 34, 22, 4, '#2563eb', '#1e3a8a', 1.5), k.rect(171, 101, 24, 7, 2, '#bfdbfe'), k.rect(168, 112, 6, 3, 1, '#ef4444'), k.rect(192, 112, 6, 3, 1, '#ef4444'), k.rect(167, 120, 7, 4, 1, '#111827'), k.rect(192, 120, 7, 4, 1, '#111827')]));
    if (sc.branch) kids.push(k.path('M 158 116 Q 190 108 228 118', 'none', '#78350f', 6), k.path('M 180 112 L 188 100 M 206 113 L 214 101 M 196 112 L 200 122', 'none', '#78350f', 3),
      k.circle(190, 99, 6, '#4d7c0f'), k.circle(215, 100, 6, '#4d7c0f'), k.circle(229, 116, 5, '#4d7c0f'));
    // the route the rider is about to take: a dashed green line ending in an arrow
    var R = { left: ['M 214 150 Q 206 102 176 92 L 40 90', [70, 90, 30, 90]], right: ['M 214 150 Q 214 104 196 92 L 286 90', [256, 90, 300, 90]],
      aroundLeft: ['M 214 150 Q 210 128 172 124 Q 150 118 152 96 L 156 78', [154, 88, 157, 70]], intoLane: ['M 214 150 Q 222 134 232 122 L 212 90', [219, 101, 206, 80]] }[sc.route];
    if (R) kids.push(k.path(R[0], 'none', '#15803d', 4, { strokeDasharray: '8 6' }), k.arrow(R[1][0], R[1][1], R[1][2], R[1][3], '#15803d', 4));
    // the rider from behind, hands on the bars (the same drawing as the signal buttons, without a signal)
    kids.push(h('g', { transform: 'translate(190 118) scale(0.62)' },
      k.rect(36, 60, 8, 34, 3, '#111827'),
      k.circle(40, 16, 9, '#fde68a', '#0f172a', 3), k.path('M29,16 A11,11 0 0 1 51,16 Z', '#f59e0b', '#0f172a', 3),
      k.rect(31, 27, 18, 34, 5, '#2563eb', '#0f172a', 3),
      h('polyline', { points: '32,34 26,56', fill: 'none', stroke: '#0f172a', strokeWidth: 7, strokeLinecap: 'round' }),
      h('polyline', { points: '48,34 54,56', fill: 'none', stroke: '#0f172a', strokeWidth: 7, strokeLinecap: 'round' }),
      k.rect(22, 54, 36, 8, 4, '#475569')));
    return h.apply(null, ['svg', { viewBox: '0 0 320 180', role: 'img', 'aria-label': sc.caption || 'A street seen from behind a rider.', 'data-bikelab-signal-scene': id, className: 'w-full h-auto block rounded-lg' }].concat(kids));
  }

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
      var __alloAriaFill = function (template, values) { return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m; }); };
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

      var rawD = ctx.toolData && ctx.toolData['bikeLab'];
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : {};
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

      // Top-level view selector. 'menu' | 'sandbox' | 'gearing' | 'repair' | ...
      var VALID_VIEWS = ['menu','sandbox','gearing','repair','fit','braking','safety','ride','parts','helmetFit','winterBike','signalDrill'];
      var initView = (typeof d.view === 'string' && VALID_VIEWS.indexOf(d.view) !== -1) ? d.view : 'menu';
      var viewState = useState(initView);
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
            subtitle: t('stem.bikelab.sandbox_card_subtitle_v2', 'Ride and see the forces'),
            desc: t('stem.bikelab.sandbox_card_desc_v2', 'Ride on flat roads, hills and dirt. Arrows show your push and what pushes back: the air, the tires and the hill. Then predict what will happen in four experiments, and test it.'),
            bullets: ['Change gear and effort as you ride', 'See where your power goes', 'Watch energy swap on a hill', 'Four predict-then-test experiments'],
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
            subtitle: t('stem.bikelab.repair_card_subtitle_v2', 'Fix a bike, one step at a time'),
            desc: t('stem.bikelab.repair_card_desc_v2', 'Seven repair jobs. At each step you pick the right tool, and at the end you answer one question about why the fix works. A wrong tool gets an explanation, not a penalty.'),
            bullets: ['Patch a flat tube · Adjust rim brakes', 'Clean & lube chain · Index derailleur', 'Swap pedals · True a wobbly wheel', 'Adjust a headset · Steps read aloud'],
            color: 'from-amber-700 to-orange-700',
            ring: 'ring-amber-500/40'
          },
          {
            id: 'ride', title: t('stem.bikelab.neighborhood_ride', 'Neighborhood Ride'), icon: '🏘️',
            subtitle: t('stem.bikelab.ride_card_subtitle_v2', 'Ride to school and earn 3 stars'),
            desc: t('stem.bikelab.ride_card_desc_v2', 'A 600 m ride to school: a stop sign with a car on the cross street, then Oak Hill, then a wet road. Change gear and brake at the right moments to earn 3 stars.'),
            bullets: ['Arrow keys or on-screen buttons', 'A coach tip at each tricky spot', 'Saves your stars and best time', 'Same physics as the Sandbox'],
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
            subtitle: t('stem.bikelab.braking_card_subtitle_v2', 'How far does it take to stop?'),
            desc: t('stem.bikelab.braking_card_desc_v2', 'Pick a speed, a road surface and which brake to use. See how far the bike travels before it stops. Then predict three what-ifs and test them.'),
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
            color: 'bg-rose-700 from-pink-700 to-rose-700',
            bg: 'linear-gradient(135deg, #be185d, #be123c)',
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
            subtitle: t('stem.bikelab.drill_card_subtitle_v2', 'Pick the right arm signal, fast'),
            desc: t('stem.bikelab.drill_card_desc_v2', 'A traffic situation appears. Pick the arm signal the rider should give, as fast as you can. Ten rounds, and your best average time is saved.'),
            color: 'from-yellow-700 to-amber-700',
            ring: 'ring-yellow-500/40'
          }
        ];

        var badges = (d.bikeBadges && typeof d.bikeBadges === 'object' && !Array.isArray(d.bikeBadges)) ? d.bikeBadges : {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;
        var solvedIn = function(o) { return (o && typeof o === 'object' && !Array.isArray(o)) ? Object.keys(o).filter(function(k) { return o[k]; }).length : 0; };
        var mastered = {
          sandbox: solvedIn(d.sandboxExperiments) >= SANDBOX_EXPERIMENTS.length,
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
          sandbox: 'Predict all ' + SANDBOX_EXPERIMENTS.length + ' Sandbox experiments correctly',
          repair: 'Finish a repair job without skipping a step', gearing: 'Pick the fastest gear in all ' + GEAR_CHALLENGES.length + ' gear challenges', braking: 'Predict all ' + BRAKE_CHALLENGES.length + ' braking challenges correctly',
          ride: 'Earn 3 stars on one ride: full stop, steady climb, gentle in the wet', signalDrill: 'Get 8 of 10 right in a timed drill',
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
            'aria-label': (mastered[c.id] ? __alloAriaFill(__alloT('stem.bikelab.a11y_mastered', '{title} (mastered)'), { title: c.title }) : (visited ? __alloAriaFill(__alloT('stem.bikelab.a11y_explored', '{title} (explored)'), { title: c.title }) : c.title + '')),
            className: 'relative min-w-0 break-words text-left flex flex-col justify-start bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 ' + (visited ? 'border-emerald-600' : 'border-slate-200') + ' hover:border-slate-400 overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring,
            style: { overflowWrap: 'anywhere' }
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-emerald-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md'
            }, '✓'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white', style: (!isContrast && c.bg) ? { background: c.bg } : undefined },
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
                    h('span', { className: 'text-emerald-700 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        var heroEmblem = h('svg', {
          viewBox: '0 0 68 68', width: 64, height: 64, 'aria-hidden': 'true', focusable: 'false',
          style: { flexShrink: 0 }
        },
          h('rect', { x: 2, y: 2, width: 64, height: 64, rx: 16, fill: 'rgba(15,23,42,0.55)', stroke: 'rgba(56,189,248,0.55)', strokeWidth: 1.5 }),
          // Tensioned chain tangents between rear cassette (20,38) and front chainring (46,38)
          h('line', { x1: 20, y1: 29, x2: 46, y2: 24, stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '3 2' }),
          h('line', { x1: 20, y1: 47, x2: 46, y2: 52, stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '3 2' }),
          // Rear cassette cog
          h('circle', { cx: 20, cy: 38, r: 9, fill: 'rgba(56,189,248,0.18)', stroke: '#38bdf8', strokeWidth: 2.2, strokeDasharray: '3 2' }),
          h('circle', { cx: 20, cy: 38, r: 3.5, fill: '#38bdf8' }),
          // Front chainring
          h('circle', { cx: 46, cy: 38, r: 14, fill: 'rgba(16,185,129,0.16)', stroke: '#34d399', strokeWidth: 2.5, strokeDasharray: '4 2.2' }),
          h('circle', { cx: 46, cy: 38, r: 8.5, fill: 'none', stroke: 'rgba(226,232,240,0.45)', strokeWidth: 1.2 }),
          // Crank arm + pedal
          h('line', { x1: 46, y1: 38, x2: 55, y2: 22, stroke: '#f8fafc', strokeWidth: 3.2, strokeLinecap: 'round' }),
          h('rect', { x: 51, y: 17, width: 10, height: 4, rx: 2, fill: '#fbbf24' }),
          h('circle', { cx: 46, cy: 38, r: 3.2, fill: '#f8fafc' })
        );

        var fleetChartSvg = (function() {
          var maxCda = 0.85, maxCrr = 0.015;
          var W = 640, H = 176, padL = 96, padR = 26, padT = 20, padB = 34;
          var plotW = W - padL - padR, plotH = H - padT - padB;
          var xOf = function(cda) { return +(padL + (cda / maxCda) * plotW).toFixed(1); };
          var yOf = function(crr) { return +(padT + plotH - (crr / maxCrr) * plotH).toFixed(1); };
          var dotColors = ['#38bdf8', '#10b981', '#f43f5e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899'];
          // Per-bike label offsets prevent overlapping text/dots where bikes cluster on the chart
          var labelPlacement = {
            road:    { dx: 9,  dy: 4,  anchor: 'start' },
            hybrid:  { dx: -9, dy: 4,  anchor: 'end' },
            ebike:   { dx: 0,  dy: -10, anchor: 'middle' },   // above its dot: to the right, "Pedal-Assist" ran into the Beach dot and label
            bmx:     { dx: -9, dy: 4,  anchor: 'end' },
            mtb:     { dx: 9,  dy: 3,  anchor: 'start' },
            cruiser: { dx: 9,  dy: 14, anchor: 'start' },
            cargo:   { dx: 8,  dy: -7, anchor: 'start' }
          };
          return h('svg', {
            viewBox: '0 0 640 176', className: 'w-full h-auto block', style: { minWidth: 560 }, 'aria-hidden': 'true', focusable: 'false'
          },
            h('rect', { x: padL, y: padT, width: plotW, height: plotH, rx: 8, fill: isContrast ? '#000000' : '#0f172a', stroke: isContrast ? '#ffffff' : '#334155', strokeWidth: 1 }),
            [0.25, 0.5, 0.75].map(function(f, idx) {
              var gx = +(padL + f * plotW).toFixed(1), gy = +(padT + f * plotH).toFixed(1);
              return h('g', { key: idx },
                h('line', { x1: gx, y1: padT, x2: gx, y2: padT + plotH, stroke: 'rgba(148,163,184,0.18)', strokeWidth: 1, strokeDasharray: '3 3' }),
                h('line', { x1: padL, y1: gy, x2: padL + plotW, y2: gy, stroke: 'rgba(148,163,184,0.18)', strokeWidth: 1, strokeDasharray: '3 3' })
              );
            }),
            h('text', { x: 6, y: padT + 14, fill: isContrast ? '#ffffff' : '#334155', fontSize: 14, fontWeight: 'bold' }, 'Tires hard'),
            h('text', { x: 6, y: padT + 30, fill: isContrast ? '#ffffff' : '#334155', fontSize: 14, fontWeight: 'bold' }, 'to roll ↑'),
            h('text', { x: 6, y: padT + plotH, fill: isContrast ? '#ffffff' : '#334155', fontSize: 14, fontWeight: 'bold' }, 'Tires easy'),
            h('text', { x: padL, y: H - 8, fill: isContrast ? '#ffffff' : '#334155', fontSize: 14, fontWeight: 'bold' }, '← slips through the air'),
            h('text', { x: padL + plotW, y: H - 8, fill: isContrast ? '#ffffff' : '#334155', fontSize: 14, fontWeight: 'bold', textAnchor: 'end' }, 'catches a lot of air →'),
            BIKES.map(function(b, idx) {
              var cx = xOf(Math.min(maxCda - 0.04, b.cdA));
              var cy = yOf(Math.min(maxCrr - 0.001, b.crr));
              var col = isContrast ? '#00ff00' : dotColors[idx % dotColors.length];
              var pos = labelPlacement[b.id];
              var lblAnchor = pos ? pos.anchor : (cx > padL + plotW - 95 ? 'end' : 'start');
              var lblX = pos ? cx + pos.dx : (lblAnchor === 'end' ? cx - 9 : cx + 9);
              var lblY = pos ? cy + pos.dy : (cy < padT + 18 ? cy + 12 : cy + 4);
              return h('g', { key: b.id },
                h('circle', { cx: cx, cy: cy, r: 5.5, fill: col, stroke: '#ffffff', strokeWidth: 1.5 }),
                h('text', { x: lblX, y: lblY, fill: '#f8fafc', fontSize: 14, fontWeight: 'bold', textAnchor: lblAnchor }, b.name.split(' ')[0])
              );
            })
          );
        })();

        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          h('div', { className: 'bikelab-hero-deck mb-6', 'data-bikelab-hero': 'true' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-4' },
              h('div', { className: 'flex items-center gap-4 min-w-0 flex-1' },
                heroEmblem,
                h('div', { className: 'min-w-0' },
                  h('div', { className: 'inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5', style: { background: isContrast ? '#000' : 'rgba(56,189,248,0.18)', border: isContrast ? '1px solid #00ff00' : '1px solid rgba(56,189,248,0.45)', color: isContrast ? '#00ff00' : '#bae6fd' } },
                    t('stem.bikelab.studio_badge', 'Engineering · Physics · Cycling Mechanics Lab')
                  ),
                  h('h1', { className: 'text-3xl md:text-4xl font-black text-white leading-tight' }, 'BikeLab'),
                  h('p', { className: 'text-sm md:text-base mt-1 max-w-2xl leading-relaxed', style: { color: isContrast ? '#ffffff' : '#e0f2fe' } },
                    t('stem.bikelab.physics_mechanics_and_maintenance_lear', 'Physics, mechanics, and maintenance — learn the science of cycling and the real-world skills to keep a bike rolling.'))
                )
              ),
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('span', { className: 'bikelab-telemetry-pill' }, '🧭 ' + visitedCount + '/' + totalCount + ' ' + t('stem.bikelab.explored_short', 'explored')),
                h('span', { className: 'bikelab-telemetry-pill' }, '★ ' + masteredCount + '/' + masteryTotal + ' ' + t('stem.bikelab.mastered_short', 'mastered')),
                h('span', { className: 'bikelab-telemetry-pill' }, '🚲 ' + BIKES.length + ' ' + t('stem.bikelab.bikes_short', 'bikes')),
                h('span', { className: 'bikelab-telemetry-pill' }, '🔧 ' + REPAIR_JOBS.length + ' ' + t('stem.bikelab.repairs_short', 'repairs'))
              )
            )
          ),
          // Ride within seconds: the two riding activities, one tap from the top of the page.
          h('section', { 'data-bikelab-quickstart': 'true', 'aria-labelledby': 'bikelab-quickstart-title', className: 'bikelab-fleet-strip mb-6' },
            h('h2', { id: 'bikelab-quickstart-title', className: 'text-sm font-black uppercase tracking-wider text-slate-800' }, '🚲 Jump on and ride'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-3' },
              [
                { id: 'ride', icon: '🏘️', title: 'Ride to school', line: 'A stop sign, a hill and a wet road. Can you earn 3 stars?', bg: 'linear-gradient(135deg,#15803d,#047857)', best: (+d.rideBestStars || 0) > 0 ? 'Your best: ' + '★★★'.slice(0, Math.min(3, Math.round(+d.rideBestStars))) : '' },
                { id: 'sandbox', icon: '🧪', title: 'Free ride with force arrows', line: 'Change the gear and your effort. See what pushes back.', bg: 'linear-gradient(135deg,#0e7490,#1d4ed8)', best: solvedIn(d.sandboxExperiments) > 0 ? solvedIn(d.sandboxExperiments) + ' of ' + SANDBOX_EXPERIMENTS.length + ' experiments right' : '' }
              ].map(function(q) {
                return h('button', { key: q.id, type: 'button', 'data-bikelab-quick': q.id,
                  onClick: function() { goto(q.id); },
                  className: 'text-left rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 focus:outline-none focus:ring-4 ring-cyan-500/40',
                  style: isContrast ? { background: '#000000', border: '2px solid #00ff00', color: '#ffffff', minHeight: 76 } : { background: q.bg, color: '#ffffff', minHeight: 76 }
                },
                  h('span', { className: 'text-4xl', 'aria-hidden': 'true' }, q.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xl font-black leading-tight' }, q.title + ' ▶'),
                    h('span', { className: 'block text-sm font-medium' }, q.line),
                    q.best && h('span', { className: 'block text-xs font-bold mt-0.5' }, q.best)));
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
                      'aria-label': (done ? __alloAriaFill(__alloT('stem.bikelab.a11y_mastered', '{title} (mastered)'), { title: c.title }) : (seen ? __alloAriaFill(__alloT('stem.bikelab.a11y_explored', '{title} (explored)'), { title: c.title }) : c.title + '')),
                      className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (done ? 'border-amber-500 bg-amber-50 text-amber-900' : seen ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500')
                    }, h('span', { 'aria-hidden': 'true' }, c.icon + ' '), c.title, done ? ' ★' : seen ? ' ✓' : '');
                  }));
              })),
            h('details', { 'data-bikelab-teacher-notes': 'true', className: 'mt-4 border-t border-slate-200 pt-3' },
              h('summary', { className: 'bikelab-disclosure cursor-pointer text-sm font-bold text-indigo-800 py-2' }, 'For teachers: what each lesson covers'),
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
          h('details', { 'data-bikelab-fleet-strip': 'true', className: 'bikelab-fleet-strip mb-6' },
            h('summary', { id: 'bikelab-fleet-strip-title', className: 'bikelab-disclosure cursor-pointer text-sm font-bold text-indigo-800 py-2' },
              t('stem.bikelab.fleet_compare_title_v2', 'Compare the 7 bikes: which slips through the air, which rolls easiest')),
            h('p', { className: 'text-sm text-slate-700 mt-2' },
              t('stem.bikelab.fleet_compare_intro_v2', 'Each dot is a bike. Lower means its tires roll more easily. Further left means it slips through the air more easily. Pick a bike to try it in the Physics Sandbox.')),
            h('div', { className: 'mt-2', style: { overflowX: 'auto' } }, fleetChartSvg),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              BIKES.map(function(b) {
                return h('button', {
                  key: b.id, type: 'button',
                  onClick: function() { upd('sandboxBikeId', b.id); goto('sandbox'); },
                  className: 'bikelab-preset-chip'
                }, h('span', { 'aria-hidden': 'true' }, b.icon), h('span', null, b.name));
              })
            )
          ),
          h('p', { className: 'text-xs text-slate-600 mb-3 px-1' + onHostInk }, 'A ★ on a card means you met its goal. Each card says how to earn it.'),
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
        // climb speed (the pull of the hill grows with mass) and acceleration (a = F/m).
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
        var lowYRef = useRef(0);          // lowest point reached this ride (the coasting experiment reads it)
        var stepDebtRef = useRef(0);      // ride time owed to the fixed-step loop
        var sampleAtRef = useRef(-1);     // ride time of the last energy-graph sample
        var sizeRef = useRef({ w: 900, h: 440, narrow: false });
        var forceNowRef = useRef({});     // forces behind the arrows now on screen (N)
        // Experiments: which one is open, the prediction, and where it is up to ('predict' | 'running' | 'done').
        var expIdState = useState(null);
        var expId = expIdState[0], setExpId = expIdState[1];
        var expPickState = useState(null);
        var expPick = expPickState[0], setExpPick = expPickState[1];
        var expPhaseState = useState('predict');
        var expPhase = expPhaseState[0], setExpPhase = expPhaseState[1];
        var expResultState = useState(null);
        var expResult = expResultState[0], setExpResult = expResultState[1];
        var exp = expId ? (SANDBOX_EXPERIMENTS.filter(function(e) { return e.id === expId; })[0] || null) : null;
        var expRunRef = useRef(null);     // the experiment being run right now, read by the animation loop
        var solvedExps = (d.sandboxExperiments && typeof d.sandboxExperiments === 'object' && !Array.isArray(d.sandboxExperiments)) ? d.sandboxExperiments : {};

        var reset = function(v0, coast) {
          posRef.current = 0; velRef.current = +v0 || 0; timeRef.current = 0; lowYRef.current = 0; stepDebtRef.current = 0; sampleAtRef.current = -1;
          energyHistoryRef.current = []; budgetRef.current = { pedal: 0, rolling: 0, air: 0, hill: 0, speedUp: 0, cadence: 0, ratio: gearRatioFor(bike, gear), slopePct: 0, stalled: false };
          particlesRef.current = [];
          setCoasting(!!coast);
          milestonesRef.current = {};
          setHudTick(function(x) { return x + 1; });
        };

        useEffect(function() { if (exp) reset(exp.setup.v0, exp.setup.coasting); else reset(); }, [bikeId, terrainId]); // eslint-disable-line

        // Physics tick: one fixed step of the shared ride model.
        var step = useCallback(function(dt) {
          var s = { x: posRef.current, v: velRef.current, t: timeRef.current, lowY: lowYRef.current };
          var f = sandboxStep(s, bike, terrain, { power: power, gear: gear, wind: wind, riderMass: riderMass, coasting: coasting }, dt);
          posRef.current = s.x; velRef.current = s.v; timeRef.current = s.t; lowYRef.current = s.lowY;
          // Where the power is going right now (W), for the "Where does my power go?" panel.
          budgetRef.current = f.budget;
          // Energy graph: four samples a second, so 600 samples cover a whole hill (height energy is measured from the start line).
          if (s.t - sampleAtRef.current >= 0.25) {
            sampleAtRef.current = s.t;
            var ke = 0.5 * f.mass * s.v * s.v, pe = f.mass * G * terrain.profile(s.x).y;
            var hist = energyHistoryRef.current;
            hist.push({ t: s.t, ke: ke, pe: pe, total: ke + pe });
            if (hist.length > 600) hist.shift();
          }
          return { s: s, f: f };
        }, [bike, terrain, power, gear, wind, coasting, riderMass]);

        // Experiments. Opening one sets the ride up; the student commits to a prediction; then the ride runs
        // (fast-forwarded) until the experiment's end condition, and the same model reads off the answer.
        var bringIntoView = function(el) {
          try {
            if (!el || !el.getBoundingClientRect) return;
            var r = el.getBoundingClientRect(), vh = window.innerHeight || 0;
            if (r.top >= 0 && r.bottom <= vh) return;
            el.scrollIntoView({ block: 'center', behavior: reducedMotionNow() ? 'auto' : 'smooth' });
          } catch (e) { /* scrolling is a convenience */ }
        };
        var applySetup = function(su) {
          setBikeId(su.bike); upd('sandboxBikeId', su.bike);
          setTerrainId(su.terrain); upd('sandboxTerrainId', su.terrain);
          setPower(su.power); setGear(su.gear); setWind(su.wind); setRiderMass(su.riderMass);
        };
        var openExperiment = function(e) {
          setRunning(false); expRunRef.current = null;
          setExpId(e.id); setExpPick(null); setExpPhase('predict'); setExpResult(null);
          applySetup(e.setup); reset(e.setup.v0, e.setup.coasting);
        };
        var closeExperiment = function() {
          setRunning(false); expRunRef.current = null;
          setExpId(null); setExpPick(null); setExpPhase('predict'); setExpResult(null); reset();
        };
        var runExperiment = function() {
          if (!exp || !expPick) return;
          applySetup(exp.setup); reset(exp.setup.v0, exp.setup.coasting);
          expRunRef.current = exp; setExpResult(null); setExpPhase('running'); setRunning(true);
          bringIntoView(canvasRef.current);   // on a phone the scene is above the experiment box
        };
        var finishExperiment = function(e, s, f) {
          expRunRef.current = null;
          var res = sandboxExperimentRead(e, s, f, terrain);
          res.right = res.answer === expPick;
          setRunning(false); setExpResult(res); setExpPhase('done');
          if (res.right && !solvedExps[e.id]) {
            var nextSolved = Object.assign({}, solvedExps); nextSolved[e.id] = true;
            upd('sandboxExperiments', nextSolved);
          }
          var live = document.getElementById('allo-live-bikelab');
          if (live) live.textContent = (res.right ? 'Your prediction was right. ' : 'Not this time. ') + e.why;
          setTimeout(function() { bringIntoView(document.querySelector('[data-bikelab-exp-result]')); }, 120);
        };

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
          if (expRunRef.current) return;   // an experiment explains itself at the end; no pop-ups while it runs
          // Fires when the model's air push really passes the tires' push. A fixed "10 mph" was wrong for the Mountain, Cargo and
          // BMX bikes, whose tires still take more than the air at 10 mph.
          var fNow = rideForces(bike, terrain, x, v, { power: 0, gear: gear, wind: wind, riderMass: riderMass, coasting: true });
          if (v > 0.5 && fNow.air > fNow.tires) fire('mph10', '\uD83D\uDCA8 ' + Math.round(v * 2.23694) + ' mph. From here the air pushes back harder than the tires do. Watch the purple arrow grow.');
          if (v * 2.23694 >= 20) fire('mph20', '\uD83D\uDCA8 20 mph. Twice the speed of 10 mph, but four times the push from the air. That is why racers crouch low.');
          if (x >= 100) fire('dist100', '\uD83D\uDCCF 100 meters. The energy from your legs did not vanish: the tires and the air turned it into a little heat.');
          if (slopeLocal > 0.05) fire('climb', '\u26F0\uFE0F Climbing. Gravity now pulls you back down the road: see the red \u201Chill\u201D arrow. Your legs are storing height energy.');
          if (slopeLocal < -0.05) fire('descend', '\uD83D\uDD3D Going down. Height energy is turning into speed, even if you stop pedaling.');
          if (p.kind === 'sand') fire('surfSand', '\uD83C\uDFDC\uFE0F Sand. The tires sink in, so they take about three times the push they need on pavement.');
          if (p.kind === 'wet') fire('surfWet', '\uD83D\uDCA7 Wet road. The tires roll a little harder, and they grip much less. Brake and turn gently.');
          if (p.kind === 'dirt') fire('surfDirt', '\uD83C\uDFDE\uFE0F Dirt. The tires take almost twice the push they need on pavement.');
          if (coasting && v < 0.5 && x > 5) fire('stopped', '\uD83D\uDED1 You coasted to a stop. Your motion energy did not vanish: the air, the tires and the hill took it.');
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
            // Fixed steps of 1/120 s, so a ride plays out the same on a fast and a slow device. Experiments run fast-forward.
            var running_exp = expRunRef.current, ended = null;
            stepDebtRef.current += dt * (running_exp ? 6 : 1);
            for (var i = 0; i < 48 && stepDebtRef.current >= SANDBOX_DT; i++) {
              stepDebtRef.current -= SANDBOX_DT;
              var out = step(SANDBOX_DT);
              if (running_exp && sandboxExperimentDone(running_exp, out.s, out.f)) { ended = out; break; }
            }
            if (stepDebtRef.current > 0.25) stepDebtRef.current = 0;   // never try to catch up after a long stall
            checkMilestones();
            draw();
            if (ended) { finishExperiment(running_exp, ended.s, ended.f); rafRef.current = null; return; }
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
          // The drawing is as wide as its frame on small screens, so labels stay readable on a phone.
          var size = fitCanvasLogical(cvs, 900, 440, 0.72);
          sizeRef.current = size;
          var narrow = size.narrow, stillMotion = reducedMotionNow();
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = size.w, H = size.h;
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
          var pxPerMeter = narrow ? 9 : 13;
          var centerY = H * 0.74;
          var worldToScreenX = function(wx) { return W * (narrow ? 0.4 : 0.36) + (wx - camX) * pxPerMeter; };
          // The camera follows most of the climb, so the rider stays in view at the top of the Steep Climb.
          var camY = terrain.profile(camX).y * 0.85;
          var worldToScreenY = function(wy) { return centerY - (wy - camY) * pxPerMeter; };

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
          // Ground fill — gradient depth by surface at camera position
          var cSurf = terrain.profile(camX).kind;
          var gGrad = ctx2d.createLinearGradient(0, centerY - 24, 0, H);
          if (cSurf === 'dirt') { gGrad.addColorStop(0, '#92400e'); gGrad.addColorStop(1, '#451a03'); }
          else if (cSurf === 'wet') { gGrad.addColorStop(0, '#475569'); gGrad.addColorStop(1, '#1e293b'); }
          else if (cSurf === 'sand') { gGrad.addColorStop(0, '#fcd34d'); gGrad.addColorStop(1, '#b45309'); }
          else { gGrad.addColorStop(0, '#334155'); gGrad.addColorStop(1, '#0f172a'); }
          ctx2d.fillStyle = gGrad;
          ctx2d.fill();
          // Rolling-road motion parallax stripes along the terrain contour
          ctx2d.save();
          ctx2d.strokeStyle = cSurf === 'pavement' ? 'rgba(253,224,71,0.52)' : 'rgba(255,255,255,0.22)';
          ctx2d.lineWidth = 2;
          for (var rdx = Math.floor((camX - 50) / 4) * 4; rdx <= camX + 80; rdx += 4) {
            var rp1 = terrain.profile(rdx), rp2 = terrain.profile(rdx + 2.1);
            ctx2d.beginPath();
            ctx2d.moveTo(worldToScreenX(rdx), worldToScreenY(rp1.y) + 8);
            ctx2d.lineTo(worldToScreenX(rdx + 2.1), worldToScreenY(rp2.y) + 8);
            ctx2d.stroke();
          }
          ctx2d.restore();
          // Surface line highlight
          ctx2d.beginPath();
          for (var wx2 = camX - 50; wx2 <= camX + 80; wx2 += 1) {
            var p2 = terrain.profile(wx2);
            if (wx2 === camX - 50) ctx2d.moveTo(worldToScreenX(wx2), worldToScreenY(p2.y));
            else ctx2d.lineTo(worldToScreenX(wx2), worldToScreenY(p2.y));
          }
          ctx2d.strokeStyle = cSurf === 'pavement' ? '#fbbf24' : '#f59e0b';
          ctx2d.lineWidth = 2.4;
          ctx2d.stroke();

          // Distance markers every 10 m
          ctx2d.font = 'bold 12px sans-serif';
          ctx2d.fillStyle = 'rgba(255,255,255,0.78)';
          for (var mx = Math.floor((camX - 50) / 10) * 10; mx <= camX + 80; mx += 10) {
            if (mx < 0) continue;
            var p3 = terrain.profile(mx);
            var sx = worldToScreenX(mx);
            var sy = worldToScreenY(p3.y);
            ctx2d.fillRect(sx - 1, sy + 14, 2, 8);
            ctx2d.fillText(mx + ' m', sx - 12, H - 8);   // a ruler along the bottom edge, clear of the rider and the force arrows
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
            if (scBaseX < -60 || scBaseX > W + 60) continue;
            ctx2d.save(); ctx2d.translate(scBaseX, scBaseY); ctx2d.scale(narrow ? 1.3 : 1.9, narrow ? 1.3 : 1.9); ctx2d.translate(-scBaseX, -scBaseY);   // sized to the bigger rider
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
              // (the sign is blank: 7 px lettering could not be read; the distance is marked along the road)
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
            ctx2d.restore();
          }

          // Bike at world position camX (on the ground)
          var gp = terrain.profile(camX);
          var bx = worldToScreenX(camX);
          var by = worldToScreenY(gp.y);
          var bxAhead = worldToScreenX(camX + 0.5);
          var byAhead = worldToScreenY(terrain.profile(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);

          // Shadow under the bike
          var bikeK = narrow ? 1.35 : 2.1;
          var shadowGrad = ctx2d.createRadialGradient(bx, by + 2, 2, bx, by + 2, 30 * bikeK);
          shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
          shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx2d.fillStyle = shadowGrad;
          ctx2d.beginPath(); ctx2d.ellipse(bx, by + 2, 30 * bikeK, 4 * bikeK, 0, 0, 2 * Math.PI); ctx2d.fill();
          // The shared rider (helmet on), tilted to the road. The wheels turn with distance (v = ω·r) and the legs
          // turn as fast as this gear makes them, so a low gear visibly spins. Coasting holds the legs still, and so
          // does reduced motion (the speed readout and the scenery still show the ride).
          var wheelPhi = camX / bike.wheelR;
          var crankPhi = camX / (bike.wheelR * gearRatioFor(bike, gear));
          var frameColors = { cruiser: '#0ea5e9', hybrid: '#e11d48', road: '#f59e0b', mtb: '#16a34a', ebike: '#7c3aed', cargo: '#0d9488', bmx: '#db2777' };
          ctx2d.save();
          ctx2d.translate(bx, by);
          ctx2d.rotate(bikeAngle);
          drawBikeFigure(ctx2d, 0, 0, { scale: bikeK, wheelRot: stillMotion ? 0 : wheelPhi, pedal: (stillMotion || coasting) ? 0.6 : crankPhi, frame: frameColors[bike.id], footDown: velRef.current === 0 });
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
          if (stillMotion) { /* no emission */ }
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

          // ── Aerodynamic slipstream airflow ribbons colored by drag velocity ──
          // Smooth curved streamlines deflecting over the rider's helmet & frame,
          // shifting color smoothly from laminar cyan (low drag) -> amber (mid)
          // -> crimson-magenta (high aerodynamic drag velocity v + headwind).
          var slVRel = Math.abs(velRef.current + wind);
          if (slVRel > 1.8 && !showVectors) {   // the airflow ribbons would tangle with the force arrows, so they show when the arrows are off
            var slIntensity = Math.min(1, (slVRel - 1.8) / 14);
            var aeroCol = slVRel < 6 ? '56,189,248' : slVRel < 11 ? '251,191,36' : '244,63,94';
            var flowPhase = stillMotion ? 0 : (timeRef.current * slVRel * 24) % 48;
            ctx2d.save();
            ctx2d.translate(bx, by); ctx2d.scale(bikeK * 1.2, bikeK * 1.2); ctx2d.translate(-bx, -by);
            ctx2d.lineCap = 'round';
            var streamOffsets = [-42, -32, -21, -11];
            streamOffsets.forEach(function(offY, si) {
              var yBase = by + offY;
              var lift = si === 0 ? -14 : si === 1 ? -10 : si === 2 ? -5 : 2;
              var wakeAmp = (si >= 1 ? 5 : 2.5) * (0.4 + slIntensity * 0.8);
              var wakeWave = stillMotion ? 0 : Math.sin(timeRef.current * 9 + si * 1.7) * wakeAmp;
              var grad = ctx2d.createLinearGradient(bx + 76, yBase, bx - 92, yBase);
              grad.addColorStop(0, 'rgba(' + aeroCol + ',0)');
              grad.addColorStop(0.28, 'rgba(' + aeroCol + ',' + (0.28 + 0.44 * slIntensity).toFixed(2) + ')');
              grad.addColorStop(0.65, 'rgba(' + aeroCol + ',' + (0.36 + 0.48 * slIntensity).toFixed(2) + ')');
              grad.addColorStop(1, 'rgba(' + aeroCol + ',0)');
              // Soft aerodynamic ribbon halo
              ctx2d.strokeStyle = grad;
              ctx2d.lineWidth = 4.2 + slIntensity * 2;
              ctx2d.globalAlpha = 0.32;
              ctx2d.beginPath();
              ctx2d.moveTo(bx + 76, yBase);
              ctx2d.quadraticCurveTo(bx + 18, yBase + lift * 0.8, bx - 10, yBase + lift);
              ctx2d.quadraticCurveTo(bx - 48, yBase + lift * 0.4 + wakeWave, bx - 92, yBase - wakeWave * 0.7);
              ctx2d.stroke();
              // Crisp laminar-to-wake streamline core
              ctx2d.globalAlpha = 0.88;
              ctx2d.lineWidth = 1.5;
              ctx2d.setLineDash([18, 12]);
              ctx2d.lineDashOffset = flowPhase;
              ctx2d.stroke();
              ctx2d.setLineDash([]);
            });
            // Subtle turbulent trailing vortex curls in the rider's low-pressure slipstream pocket
            if (slVRel > 5) {
              ctx2d.globalAlpha = 0.25 + slIntensity * 0.35;
              ctx2d.strokeStyle = 'rgb(' + aeroCol + ')';
              ctx2d.lineWidth = 1.3;
              for (var vi = 0; vi < 2; vi++) {
                var vx = bx - 36 - vi * 20;
                var vy = by - 25 + (vi === 0 ? -4 : 6);
                var vRot = stillMotion ? vi : (timeRef.current * (6 + slVRel * 0.3) * (vi === 0 ? 1 : -1));
                ctx2d.beginPath();
                ctx2d.arc(vx, vy, 4.5 + slIntensity * 2.5, vRot, vRot + Math.PI * 1.45);
                ctx2d.stroke();
              }
            }
            ctx2d.restore();
          }

          // Force arrows. The four forces along the road share one scale, so their lengths can be compared.
          // Weight and the ground's push are about ten times bigger and cancel each other. Drawn to the same scale
          // they hid every force that changes the ride, so they are a short dashed pair under the bike instead.
          if (showVectors) {
            var v = velRef.current;
            var fNow = rideForces(bike, terrain, camX, v, { power: power, gear: gear, wind: wind, riderMass: riderMass, coasting: coasting }); // same model as the physics step
            var a = fNow.angle, pedalF = fNow.push, dragF = fNow.air, rollingF = fNow.tires, gravP = fNow.hill;
            var maxF = Math.max(30, Math.abs(pedalF), rollingF, Math.abs(dragF), Math.abs(gravP));
            var pxScale = (narrow ? 62 : 110) / maxF;
            forceNowRef.current = { F_pedal: pedalF, F_drag: dragF, F_roll: rollingF, F_hill: gravP };
            // Weight and the ground's push (not to scale)
            ctx2d.save();
            ctx2d.strokeStyle = '#e2e8f0'; ctx2d.fillStyle = '#e2e8f0'; ctx2d.lineWidth = 2; ctx2d.setLineDash([5, 4]);
            var pairTop = by + 8, pairLen = narrow ? 26 : 36;
            ctx2d.beginPath(); ctx2d.moveTo(bx - 7, pairTop); ctx2d.lineTo(bx - 7, pairTop + pairLen); ctx2d.moveTo(bx + 7, pairTop + pairLen); ctx2d.lineTo(bx + 7, pairTop); ctx2d.stroke();
            ctx2d.setLineDash([]);
            ctx2d.beginPath(); ctx2d.moveTo(bx - 7, pairTop + pairLen + 5); ctx2d.lineTo(bx - 12, pairTop + pairLen - 3); ctx2d.lineTo(bx - 2, pairTop + pairLen - 3); ctx2d.closePath(); ctx2d.fill();
            ctx2d.beginPath(); ctx2d.moveTo(bx + 7, pairTop - 5); ctx2d.lineTo(bx + 2, pairTop + 3); ctx2d.lineTo(bx + 12, pairTop + 3); ctx2d.closePath(); ctx2d.fill();
            if (!narrow) { ctx2d.font = 'bold 12px sans-serif'; ctx2d.fillText('Weight down, ground up: these two cancel', bx + 20, pairTop + pairLen - 6); }
            ctx2d.restore();
            (function(by) {   // at chest height: your push forward, the air pushing back
              // Pedal thrust (along ground, forward; canvas y increases downward)
              drawVector(ctx2d, bx, by - 22, Math.cos(a) * pedalF * pxScale, -Math.sin(a) * pedalF * pxScale, '#10b981', 'F_pedal');
              // Drag (opposing motion; canvas y increases downward)
              drawVector(ctx2d, bx, by - 22, -Math.cos(a) * dragF * pxScale, Math.sin(a) * dragF * pxScale, '#a855f7', 'F_drag');
            })(by - Math.round(16 * bikeK));
            // Rolling (opposing motion; canvas y increases downward), down at the tires
            drawVector(ctx2d, bx, by - 10, -Math.cos(a) * rollingF * pxScale, Math.sin(a) * rollingF * pxScale, '#f59e0b', 'F_roll');
            // The hill: the part of gravity that acts along the road. It points back down the slope when you climb and forward when you descend.
            drawVector(ctx2d, bx, by - Math.round(14 * bikeK), -Math.cos(a) * gravP * pxScale, Math.sin(a) * gravP * pxScale, '#ef4444', 'F_hill');
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
            var mmW = narrow ? 118 : 180, mmH = narrow ? 44 : 52;
            var mmX = W - mmW - (narrow ? 6 : 10);
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
            ctx2d.font = 'bold 12px sans-serif';
            ctx2d.textAlign = 'left';
            ctx2d.fillText(narrow ? 'Map' : 'Map of the road', mmX + 6, mmY + 13);
            ctx2d.fillStyle = '#cbd5e1';
            ctx2d.fillText(Math.round(mmXMax) + ' m', mmX + mmW - 42, mmY + 13);
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
            var wiCx = narrow ? 56 : W * 0.5;
            var wiCy = 28;
            var wiHalf = narrow ? 50 : 82;
            var wiMag = Math.min(1, Math.abs(wind) / 11);
            var wiLen = narrow ? 20 + wiMag * 46 : 28 + wiMag * 60;
            var wiDir = wind > 0 ? -1 : 1; // headwind points left (against motion)
            var wiCol = wind > 0 ? 'rgba(248,113,113,0.9)' : 'rgba(74,222,128,0.9)';
            ctx2d.save();
            // Box
            ctx2d.fillStyle = 'rgba(15,23,42,0.6)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.25)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            if (ctx2d.roundRect) ctx2d.roundRect(wiCx - wiHalf, wiCy - 20, wiHalf * 2, 40, 6); else ctx2d.rect(wiCx - wiHalf, wiCy - 20, wiHalf * 2, 40);
            ctx2d.fill(); ctx2d.stroke();
            // Label
            ctx2d.fillStyle = '#cbd5e1';
            ctx2d.font = 'bold 12px sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText((wind > 0 ? (narrow ? 'Head ' : 'Headwind ') : (narrow ? 'Tail ' : 'Tailwind ')) + Math.abs(wind * 2.23694).toFixed(0) + ' mph', wiCx, wiCy - 5);
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

          // ── Readout (top-left) ──
          // Speed, leg speed and power, drawn on the scene so fullscreen still has them. A narrow drawing skips the box:
          // the same numbers are in the cards under the canvas, and the box would cover the rider.
          if (!narrow) {
            var hudV = velRef.current;
            var hudCadRpm = Math.round(cadenceRpmFor(hudV, bike.wheelR, gearRatioFor(bike, gear)));
            var hudSurfLabel = { pavement: 'Pavement', dirt: 'Dirt', wet: 'Wet road', sand: 'Sand' }[terrain.profile(camX).kind] || 'Pavement';
            var hudSlopePct = Math.round((terrain.profile(camX + 1).y - terrain.profile(camX).y) * 100);
            var hudX = 10, hudY = 10, hudW = 176, hudH = 92;
            ctx2d.fillStyle = 'rgba(15,23,42,0.82)';
            ctx2d.strokeStyle = 'rgba(148,163,184,0.3)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.roundRect ? ctx2d.roundRect(hudX, hudY, hudW, hudH, 8) : ctx2d.rect(hudX, hudY, hudW, hudH);
            ctx2d.fill(); ctx2d.stroke();
            ctx2d.fillStyle = '#ffffff';
            ctx2d.font = 'bold 16px sans-serif';
            ctx2d.fillText((hudV * 2.23694).toFixed(1) + ' mph', hudX + 10, hudY + 22);
            ctx2d.fillStyle = '#e2e8f0';
            ctx2d.font = 'bold 12px sans-serif';
            ctx2d.fillText('Legs: ' + hudCadRpm + ' turns a minute', hudX + 10, hudY + 40);
            ctx2d.fillText(coasting ? 'Power: 0 W (coasting)' : ('Power: ' + Math.round(Math.min(power, bike.maxPower)) + ' W'), hudX + 10, hudY + 56);
            ctx2d.fillStyle = hudSlopePct > 3 ? '#fca5a5' : hudSlopePct < -3 ? '#86efac' : '#cbd5e1';
            ctx2d.fillText(hudSurfLabel + ' · slope ' + (hudSlopePct > 0 ? '+' : '') + hudSlopePct + '%', hudX + 10, hudY + 72);
            ctx2d.fillStyle = '#cbd5e1';
            ctx2d.fillText(Math.round(camX) + ' m ridden', hudX + 10, hudY + 86);
          }
        };

        // Arrow names in plain words. The value in newtons comes from the same rideForces call that set the length.
        var FORCE_NAMES = { F_pedal: 'Your push', F_drag: 'Air', F_roll: 'Tires', F_hill: 'Hill' };
        var drawVector = function(ctx2d, x, y, dx, dy, color, label) {
          var len = Math.sqrt(dx * dx + dy * dy);
          var newtons = Math.abs((forceNowRef.current || {})[label] || 0);
          if (len < 2 && newtons < 0.5) return;
          ctx2d.save();
          ctx2d.lineCap = 'round';
          if (len >= 2) {
            // soft underlay, then the shaft
            ctx2d.strokeStyle = color;
            ctx2d.globalAlpha = 0.32;
            ctx2d.lineWidth = 9;
            ctx2d.beginPath(); ctx2d.moveTo(x, y); ctx2d.lineTo(x + dx, y + dy); ctx2d.stroke();
            ctx2d.globalAlpha = 1;
            ctx2d.fillStyle = color;
            ctx2d.lineWidth = 3.4;
            ctx2d.beginPath(); ctx2d.moveTo(x, y); ctx2d.lineTo(x + dx, y + dy); ctx2d.stroke();
            var ang = Math.atan2(dy, dx), head = Math.min(11, Math.max(5, len * 0.6));
            ctx2d.beginPath();
            ctx2d.moveTo(x + dx + 3 * Math.cos(ang), y + dy + 3 * Math.sin(ang));
            ctx2d.lineTo(x + dx - head * Math.cos(ang - 0.45), y + dy - head * Math.sin(ang - 0.45));
            ctx2d.lineTo(x + dx - head * Math.cos(ang + 0.45), y + dy - head * Math.sin(ang + 0.45));
            ctx2d.closePath(); ctx2d.fill();
          }
          // Name and size, past the tip on the side the arrow points to. The tires label sits under its arrow so it
          // cannot land on the hill label when both point back up a climb.
          var text = (FORCE_NAMES[label] || label) + ' ' + Math.round(newtons) + ' N';
          ctx2d.font = 'bold 12px sans-serif';
          var tw = ctx2d.measureText(text).width + 12;
          var lx = dx < 0 ? x + dx - 8 - tw : x + dx + 8;
          var ly = label === 'F_roll' ? y + dy + 3 : y + dy - 21;
          lx = Math.max(4, Math.min((sizeRef.current.w || 900) - tw - 4, lx));
          ctx2d.globalAlpha = 1;
          ctx2d.fillStyle = 'rgba(15,23,42,0.92)';
          ctx2d.strokeStyle = color;
          ctx2d.lineWidth = 1.5;
          ctx2d.beginPath();
          if (ctx2d.roundRect) ctx2d.roundRect(lx, ly, tw, 18, 5); else ctx2d.rect(lx, ly, tw, 18);
          ctx2d.fill(); ctx2d.stroke();
          ctx2d.fillStyle = '#ffffff';
          ctx2d.fillText(text, lx + 6, ly + 13);
          ctx2d.restore();
        };

        var drawEnergyGraph = function(ctx2d, W, _H) {
          var slim = W < 560;
          var gw = slim ? Math.min(206, W - 162) : 280, gh = slim ? 92 : 124;
          var gx = W - gw - 54, gy = 10;                       // clear of the fullscreen button
          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx2d.fillRect(gx, gy, gw, gh);
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 1; ctx2d.setLineDash([]);
          ctx2d.strokeRect(gx, gy, gw, gh);
          ctx2d.font = 'bold 12px sans-serif';
          ctx2d.fillStyle = '#e2e8f0';
          if (!slim) ctx2d.fillText('Energy', gx + 8, gy + 15);
          // Each line has its own color AND its own dash pattern, so color is not the only cue.
          var SERIES = [['ke', '#22d3ee', [], 'Motion (KE)'], ['pe', '#fbbf24', [7, 4], 'Height (PE)'], ['total', '#f472b6', [2, 3], 'Total']];
          var lx = gx + (slim ? 6 : 8), legY = slim ? gy + 11 : gy + 29, sample = gw >= 186;
          SERIES.forEach(function(sr) {
            var name = slim ? sr[3].replace(/ \(.*\)$/, '') : sr[3];   // 'Motion (KE)' is 'Motion' where there is less room
            ctx2d.strokeStyle = sr[1]; ctx2d.lineWidth = 2; ctx2d.setLineDash(sr[2]);
            if (sample) { ctx2d.beginPath(); ctx2d.moveTo(lx, legY); ctx2d.lineTo(lx + 14, legY); ctx2d.stroke(); }
            ctx2d.setLineDash([]); ctx2d.fillStyle = sr[1]; ctx2d.font = 'bold 12px sans-serif';
            ctx2d.fillText(name, lx + (sample ? 17 : 0), legY + 4); lx += (sample ? 17 : 0) + ctx2d.measureText(name).width + (slim ? 7 : 9);
          });
          var hist = energyHistoryRef.current;
          if (hist.length < 2) return;
          // Height energy goes negative below the start line, so the scale covers both sides of zero.
          var maxE = 100, minE = 0;
          hist.forEach(function(pt) { maxE = Math.max(maxE, pt.ke, pt.pe, pt.total); minE = Math.min(minE, pt.pe, pt.total); });
          var top = gy + (slim ? 24 : 40), bottom = gy + gh - 6, span = maxE - minE;
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
          ctx2d.fillStyle = '#cbd5e1'; ctx2d.font = '12px sans-serif';
          ctx2d.fillText('0', gx + 4, yOf(0) - 3);
        };

        // Draw on HUD tick even when paused
        useEffect(function() { draw(); }, [hudTick, bikeId, terrainId, showVectors, showGraph]); // eslint-disable-line
        // A turned phone or a resized window changes the frame: draw again at the new size.
        useEffect(function() {
          var onResize = function() { setHudTick(function(x) { return (x + 1) % 1000; }); };
          window.addEventListener('resize', onResize);
          return function() { window.removeEventListener('resize', onResize); };
        }, []);

        // Stats panel
        var v = velRef.current;
        var mph = v * 2.237;
        var kph = v * 3.6;
        var elev = terrain.profile(posRef.current).y;
        var systemMass = (bike.mass - 70) + riderMass;
        var ke = 0.5 * systemMass * v * v;
        var pe = systemMass * G * elev;

        function sandboxStatusBar() {
          var slopePct = Math.round((terrain.profile(posRef.current + 1).y - terrain.profile(posRef.current).y) * 100);
          var status = running ? (exp ? 'Running the test' : coasting ? 'Coasting' : 'Pedaling') : (v > 0.1 ? 'Paused' : 'Ready to ride');
          var cue = exp ? (expPhase === 'running' ? exp.watch : expPhase === 'done' ? 'Test finished. Read what happened in the experiment box.' : 'Experiment open: make your prediction, then run the test.')
            : !running ? 'Press Start, then change the gear and your effort and watch the arrows.'
            : budgetRef.current.stalled ? 'Stuck! This gear is too hard here. Slide the gear toward Easy.'
            : (budgetRef.current.rest && budgetRef.current.rollBack) ? 'Stopped on a slope, so the rider puts a foot down. The hill pulls back with ' + Math.round(budgetRef.current.hillN) + ' N and rolling takes only ' + Math.round(budgetRef.current.holdN) + ' N, so a bike on its own would roll back down.'
            : budgetRef.current.rest ? 'Stopped, so the rider puts a foot down: a bike that is not moving cannot balance.'
            : coasting ? 'Coasting: no push from your legs. The air, the tires and the hill decide what happens.'
            : slopePct > 3 ? 'Climbing: the red hill arrow pulls you back. An easier gear keeps your legs turning.'
            : slopePct < -3 ? 'Downhill: the hill arrow now points forward and helps you.'
            : wind > 2 ? 'Headwind: the air arrow is long even at a slow speed.'
            : 'Compare the arrows. When your push matches the others, your speed stays steady.';
          return h('div', { className: 'bikelab-canvas-toolbar', 'data-bikelab-canvas-toolbar': 'true', 'data-bikelab-ride-focus': 'true' },
            h('div', { className: 'flex gap-2 flex-wrap text-xs font-bold' },
              h('span', { className: 'px-2 py-1 rounded-full ' + (running ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700') }, status),
              h('span', { className: 'px-2 py-1 rounded-full bg-slate-200 text-slate-700' }, bike.name),
              h('span', { className: 'px-2 py-1 rounded-full bg-cyan-100 text-cyan-800' }, terrain.name)
            ),
            h('p', { className: 'text-sm text-slate-700 leading-snug w-full', 'data-bikelab-ride-cue': 'true' }, cue)
          );
        }

        var locked = !!exp;   // an open experiment owns the setup, so the result matches the question
        var lockNote = locked ? h('p', { className: 'text-xs font-bold text-amber-800 mt-1' }, 'Locked while an experiment is open. Close the experiment to change the setup.') : null;
        var gearWord = gear <= 0.4 ? 'Easy' : gear >= 0.8 ? 'Hard' : 'Middle';
        var bikeWords = function(b) {
          return 'Bike ' + (b.mass - 70) + ' kg · Air: ' + (b.cdA < 0.45 ? 'slips through' : b.cdA < 0.6 ? 'medium' : 'catches a lot') + ' · Tires: ' + (b.crr < 0.006 ? 'roll easily' : b.crr < 0.01 ? 'medium' : 'roll hard');
        };
        var pctText = function(x) { return Math.round((x || 0) * 100) + '%'; };
        var expMeasured = function(e, r) {
          if (e.id === 'headwind') return 'No wind: ' + r.baseMph.toFixed(1) + ' mph. Into the ' + Math.round(r.windMph) + ' mph wind: ' + r.mph.toFixed(1) + ' mph. You lost ' + r.drop.toFixed(1) + ' mph.';
          if (e.id === 'coast-dip') return 'You rolled ' + Math.round(r.distance) + ' m and got ' + pctText(r.back) + ' of the way back up the ' + r.lowM.toFixed(0) + ' m dip. From there the bike would roll back down.';
          return 'Steady at ' + r.mph.toFixed(1) + ' mph: air ' + pctText(r.share.air) + ', tires ' + pctText(r.share.tires) + ', speeding up ' + pctText(r.share.speedUp) + '.';
        };
        var solvedCount = SANDBOX_EXPERIMENTS.filter(function(e) { return solvedExps[e.id]; }).length;

        function experimentsCard() {
          var head = h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
            h('h3', { id: 'bikelab-exp-title', className: 'text-sm font-black text-slate-800' }, 'Experiments: predict, then test'),
            h('span', { className: 'text-xs font-bold text-slate-700', 'data-bikelab-exp-count': solvedCount }, solvedCount + ' of ' + SANDBOX_EXPERIMENTS.length + ' predicted right'));
          if (!exp) {
            return h('section', { 'data-bikelab-experiments': 'list', 'aria-labelledby': 'bikelab-exp-title', className: 'bg-white rounded-xl p-3 shadow border border-slate-400' },
              head,
              h('p', { className: 'text-xs text-slate-700 mt-1' }, 'Pick one. Say what you think will happen, then the ride shows you.'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
                SANDBOX_EXPERIMENTS.map(function(e, i) {
                  return h('button', { key: e.id, type: 'button', 'data-bikelab-exp-open': e.id,
                    onClick: function() { setShowVectors(true); setShowGraph(true); openExperiment(e); },
                    className: 'text-left px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (solvedExps[e.id] ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500')
                  }, (i + 1) + '. ' + e.title + (solvedExps[e.id] ? ' ★' : ''));
                })));
          }
          var done = expPhase === 'done' && expResult;
          var picked = exp.options.filter(function(o) { return o[0] === expPick; })[0];
          return h('section', { 'data-bikelab-experiments': exp.id, 'data-bikelab-exp-phase': expPhase, 'aria-labelledby': 'bikelab-exp-title', className: 'bg-white rounded-xl p-3 shadow border-2 border-indigo-400' },
            head,
            h('div', { className: 'text-sm font-black text-indigo-900 mt-2' }, exp.title),
            h('p', { className: 'text-sm text-slate-800 mt-1 leading-snug' }, exp.ask),
            h('div', { className: 'grid grid-cols-1 gap-2 mt-2', role: 'group', 'aria-label': 'Your prediction' },
              exp.options.map(function(o) {
                var isPick = expPick === o[0], isAnswer = done && expResult.answer === o[0];
                return h('button', { key: o[0], type: 'button', 'data-bikelab-exp-option': o[0], 'aria-pressed': isPick ? 'true' : 'false',
                  disabled: expPhase !== 'predict',
                  onClick: function() { setExpPick(o[0]); },
                  className: 'text-left px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (isAnswer ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : (done && isPick) ? 'border-rose-700 bg-rose-50 text-rose-900' : isPick ? 'border-indigo-700 bg-indigo-50 text-indigo-900' : 'border-slate-300 bg-white text-slate-800')
                }, (isAnswer ? '✓ ' : (done && isPick) ? '✗ ' : '') + o[1] + (isPick && !done ? ' (your prediction)' : ''));
              })),
            expPhase === 'predict' && h('button', { type: 'button', 'data-bikelab-exp-run': 'true', disabled: !expPick, onClick: runExperiment,
              className: 'mt-3 w-full py-2.5 px-4 rounded-xl font-bold ' + (expPick ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600 cursor-not-allowed') },
              expPick ? '▶ Run the test' : 'Pick a prediction first'),
            expPhase === 'running' && h('p', { className: 'mt-3 text-sm font-bold text-indigo-900' }, 'Running the test, fast-forward… ' + exp.watch),
            done && h('div', { 'data-bikelab-exp-result': expResult.right ? 'right' : 'wrong', className: 'mt-3 p-3 rounded-lg border-2 ' + (expResult.right ? 'border-emerald-600 bg-emerald-50' : 'border-amber-500 bg-amber-50') },
              h('div', { className: 'text-sm font-black ' + (expResult.right ? 'text-emerald-900' : 'text-amber-900') }, expResult.right ? '✓ Your prediction was right.' : '✗ Not this time. Look at what the ride did:'),
              h('p', { className: 'text-sm text-slate-800 mt-1 font-mono' }, expMeasured(exp, expResult)),
              !expResult.right && picked && picked[2] && h('p', { className: 'text-sm text-slate-800 mt-1' }, picked[2]),
              h('p', { className: 'text-sm text-slate-800 mt-1' }, h('strong', null, 'Why: '), exp.why)),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              done && h('button', { type: 'button', 'data-bikelab-exp-again': 'true', onClick: function() { setExpPick(null); setExpResult(null); setExpPhase('predict'); reset(exp.setup.v0, exp.setup.coasting); },
                className: 'py-2 px-3 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm' }, '↺ Try it again'),
              expPhase !== 'running' && h('button', { type: 'button', 'data-bikelab-exp-close': 'true', onClick: closeExperiment,
                className: 'py-2 px-3 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm' }, done ? 'Pick another experiment' : 'Close the experiment'))
          );
        }

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🧪', title: t('stem.bikelab.physics_sandbox_2', 'Physics Sandbox') }),
          h('div', { className: 'bikelab-sandbox-main p-3 flex-1 overflow-auto', 'data-bikelab-sandbox-grid': 'true' },
            // Ride column: the scene first, then the few controls a rider needs
            h('div', { className: 'space-y-3 min-w-0', 'data-bikelab-ride-column': 'true' },
              sandboxStatusBar(),
              h('div', { id: 'bikelab-sandbox-fs', className: 'bikelab-canvas-shell bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800', 'data-bikelab-sim-surface': 'true', style: { position: 'relative' } },
                h('p', { id: 'bikelab-ride-canvas-description', className: 'sr-only' }, 'A rider on a ' + bike.name + ' on ' + terrain.name + ', going ' + mph.toFixed(1) + ' miles per hour. Arrows show the forces along the road: your push forward, and the air, the tires and the hill pushing back. The same numbers are in the “Where does my power go?” table below. Use Start, Reset, the Gear and Effort sliders and More settings to change the ride.'),
                h('canvas', { ref: canvasRef, width: 900, height: 440, className: 'bikelab-fit-canvas w-full block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300', role: 'img', tabIndex: 0, 'data-bikelab-canvas': 'true', style: { width: '100%', height: 'auto', aspectRatio: '900 / 440', borderRadius: 12, border: '1px solid rgba(148,163,184,0.26)', boxShadow: 'inset 0 0 44px rgba(14,165,233,0.08)' }, 'aria-label': t('stem.bikelab.physics_sandbox_canvas_v2', 'Physics Sandbox: a rider on a bike with arrows for the push from the legs, the air, the tires and the hill.'), 'aria-describedby': 'bikelab-ride-canvas-description' }),
                // Fullscreen toggle (top-right)
                h('button', {
                  'aria-label': t('stem.bikelab.toggle_fullscreen_for_the_physics_sand', 'Toggle fullscreen for the physics sandbox'),
                  title: t('stem.bikelab.fullscreen', 'Fullscreen'), className: 'bikelab-fs-btn',
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
                    border: '2px solid #e2e8f0', color: '#f8fafc',
                    fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }
                }, '⛶')
              ),
              h('div', { className: 'flex flex-wrap gap-2', 'data-bikelab-ride-buttons': 'true' },
                h('button', {
                  disabled: locked, 'data-bikelab-start': 'true',
                  onClick: function() { setRunning(!running); },
                  className: 'flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors shadow ' + (locked ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
                }, running ? '⏸ Pause' : (v > 0.1 ? '▶ Keep riding' : '▶ Start')),
                h('button', {
                  disabled: locked,
                  onClick: function() { setRunning(false); reset(); },
                  className: 'py-2.5 px-4 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'
                }, t('stem.bikelab.reset', '↺ Reset')),
                h('button', {
                  disabled: locked,
                  onClick: function() { setCoasting(!coasting); },
                  'aria-pressed': coasting,
                  title: t('stem.bikelab.coast_title_v2', 'Stop pedaling and watch the air, the tires and the hill slow the bike on their own.'),
                  className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (coasting ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600')
                }, coasting ? '🦶 Coasting (legs still)' : '🦶 Stop pedaling')
              ),
              h('div', { className: 'bikelab-control-card bg-white rounded-xl p-4 shadow border border-slate-400', 'data-bikelab-controls': 'true' },
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
                  h('div', null,
                    h('label', { htmlFor: 'bikelab-sandbox-gear', className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                      h('span', null, t('stem.bikelab.gear_v2', 'Gear')), h('span', { className: 'text-violet-700' }, gearWord + ' · ' + gearRatioFor(bike, gear).toFixed(2) + ' : 1')),
                    h('input', { id: 'bikelab-sandbox-gear', type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear, disabled: locked,
                      onChange: function(e) { setGear(parseFloat(e.target.value)); },
                      className: 'w-full mt-1 accent-violet-500', style: { minHeight: 44 },
                      'aria-label': t('stem.bikelab.gear_ratio_slider', 'Gear ratio') }),
                    h('div', { className: 'text-xs text-slate-600 flex justify-between' }, h('span', null, '← Easy: legs spin, big push'), h('span', null, 'Hard: more speed →'))),
                  h('div', null,
                    h('label', { htmlFor: 'bikelab-sandbox-power', className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                      h('span', null, t('stem.bikelab.pedal_effort_v2', 'Pedal effort')), h('span', { className: 'text-cyan-700' }, power > bike.maxPower ? bike.maxPower + ' W (most this bike can use)' : power + ' W')),
                    h('input', { id: 'bikelab-sandbox-power', type: 'range', min: 0, max: 400, value: power, disabled: locked,
                      onChange: function(e) { var pv = parseInt(e.target.value, 10); setPower(isFinite(pv) ? pv : 0); },
                      className: 'w-full mt-1 accent-cyan-500', style: { minHeight: 44 },
                      'aria-label': t('stem.bikelab.rider_power_watts', 'Rider power in watts') }),
                    h('div', { className: 'text-xs text-slate-600' }, t('stem.bikelab.effort_hint_v2', 'Easy ride: about 80 W · Steady: 150 W · Racer: 300 W')))
                ),
                lockNote
              )
            ),
            // Learn column: experiments, the power table, then everything else behind one disclosure
            h('div', { className: 'space-y-3 min-w-0', 'data-bikelab-learn-column': 'true' },
              experimentsCard(),
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
              h('div', { className: 'grid grid-cols-2 gap-2', 'data-bikelab-sandbox-stats': 'true' },
                [['Speed', mph.toFixed(1) + ' mph', kph.toFixed(1) + ' km/h'],
                 ['Distance', (posRef.current).toFixed(0) + ' m', ((posRef.current) * 3.281).toFixed(0) + ' ft'],
                 ['Height', elev.toFixed(1) + ' m', 'from the start line'],
                 ['Legs', Math.round(budgetRef.current.cadence || 0) + ' rpm', 'pedal turns a minute'],
                 ['Motion energy', (ke / 1000).toFixed(2) + ' kJ', (0.5 * systemMass * v * v).toFixed(0) + ' J'],
                 ['Height energy', (pe / 1000).toFixed(2) + ' kJ', (systemMass * G * elev).toFixed(0) + ' J']
                ].map(function(stat, i) {
                  return h('div', { key: i, className: 'bg-white rounded-lg p-2 shadow border border-slate-400' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, stat[0]),
                    h('div', { className: 'text-base font-black text-slate-800' }, stat[1]),
                    h('div', { className: 'text-xs text-slate-600' }, stat[2])
                  );
                })
              ),
              h('details', { 'data-bikelab-more-settings': 'true', className: 'bg-white rounded-xl shadow border border-slate-400' },
                h('summary', { className: 'bikelab-disclosure cursor-pointer text-sm font-bold text-indigo-800 px-4 py-3' }, 'More settings: bike, road, wind, rider, what to show'),
                h('div', { className: 'px-4 pb-4 space-y-4' },
                  lockNote,
                  h('div', { 'data-bikelab-sandbox-presets': 'true' },
                    h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.bikelab.quick_setups_v2', 'Quick setups')),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      [
                        { id: 'sprint', label: t('stem.bikelab.preset_aero_sprint', '🏁 Aero Sprint'), bike: 'road', terrain: 'flat', power: 260, gear: 0.95, wind: 0 },
                        { id: 'climb', label: t('stem.bikelab.preset_steep_climb', '⛰️ Steep Climb'), bike: 'mtb', terrain: 'steephill', power: 180, gear: 0.25, wind: 0 },
                        { id: 'headwind', label: t('stem.bikelab.preset_headwind', '💨 Headwind Test'), bike: 'hybrid', terrain: 'flat', power: 160, gear: 0.65, wind: 7 },
                        { id: 'ebike', label: t('stem.bikelab.preset_ebike_commute', '⚡ E-Bike Hills'), bike: 'ebike', terrain: 'rollinghills', power: 140, gear: 0.6, wind: 0 }
                      ].map(function(pr) {
                        return h('button', {
                          key: pr.id, type: 'button', disabled: locked,
                          onClick: function() {
                            setBikeId(pr.bike); upd('sandboxBikeId', pr.bike);
                            setTerrainId(pr.terrain); upd('sandboxTerrainId', pr.terrain);
                            setPower(pr.power); setGear(pr.gear); setWind(pr.wind); setCoasting(false);
                          },
                          className: 'bikelab-preset-chip'
                        }, pr.label);
                      }))
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.bikelab.bike', 'Bike')),
                    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-1.5' },
                      BIKES.map(function(b) {
                        return h('button', {
                          key: b.id, disabled: locked, 'aria-pressed': bikeId === b.id ? 'true' : 'false',
                          onClick: function() { setBikeId(b.id); upd('sandboxBikeId', b.id); },
                          className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 text-left transition-colors ' + (bikeId === b.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300')
                        },
                          h('span', { className: 'text-xl', 'aria-hidden': 'true' }, b.icon),
                          h('div', { className: 'flex-1 min-w-0' },
                            h('div', { className: 'text-sm font-bold text-slate-800' }, b.name),
                            h('div', { className: 'text-xs text-slate-600' }, bikeWords(b))
                          )
                        );
                      }))
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.bikelab.road_v2', 'Road')),
                    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-1.5' },
                      TERRAINS.map(function(tr) {
                        return h('button', {
                          key: tr.id, disabled: locked, 'aria-pressed': terrainId === tr.id ? 'true' : 'false',
                          onClick: function() { setTerrainId(tr.id); upd('sandboxTerrainId', tr.id); },
                          className: 'w-full flex items-center gap-2 p-2 rounded-lg border-2 text-left transition-colors ' + (terrainId === tr.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')
                        },
                          h('span', { className: 'text-xl', 'aria-hidden': 'true' }, tr.icon),
                          h('div', { className: 'text-sm font-bold text-slate-800' }, tr.name)
                        );
                      }))
                  ),
                  h('div', null,
                    h('label', { htmlFor: 'bikelab-sandbox-wind', className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                      h('span', null, t('stem.bikelab.wind', 'Wind')),
                      h('span', { className: wind > 0 ? 'text-rose-700' : wind < 0 ? 'text-emerald-700' : 'text-slate-600' },
                        wind === 0 ? 'calm' : (Math.abs(wind * 2.23694).toFixed(0) + ' mph ' + (wind > 0 ? 'headwind' : 'tailwind')))),
                    h('input', { id: 'bikelab-sandbox-wind', type: 'range', min: -11, max: 11, step: 0.5, value: wind, disabled: locked,
                      onChange: function(e) { setWind(parseFloat(e.target.value)); },
                      className: 'w-full mt-1 accent-rose-500', style: { minHeight: 44 },
                      'aria-label': t('stem.bikelab.wind_speed_slider', 'Wind speed and direction') }),
                    h('div', { className: 'text-xs text-slate-600' }, t('stem.bikelab.wind_hint_v2', 'The air pushes on you with your speed plus the wind. Riding 15 mph into a 10 mph wind feels like 25 mph.'))),
                  h('div', null,
                    h('label', { htmlFor: 'bikelab-sandbox-mass', className: 'text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between' },
                      h('span', null, t('stem.bikelab.rider_weight_v2', 'Rider')),
                      h('span', { className: 'text-amber-700' }, riderMass + ' kg · ' + Math.round(riderMass * 2.20462) + ' lb')),
                    h('input', { id: 'bikelab-sandbox-mass', type: 'range', min: 30, max: 120, step: 1, value: riderMass, disabled: locked,
                      onChange: function(e) { setRiderMass(parseInt(e.target.value, 10)); },
                      className: 'w-full mt-1 accent-amber-500', style: { minHeight: 44 },
                      'aria-label': t('stem.bikelab.rider_mass_in_kilograms', 'Rider mass in kilograms') }),
                    h('div', { className: 'text-xs text-slate-600' }, 'Bike and rider together: ' + ((bike.mass - 70) + riderMass) + ' kg. More weight means a slower start and a much slower climb.')),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2' }, 'Show on the picture'),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      h('button', {
                        onClick: function() { setShowVectors(!showVectors); upd('sandboxShowVectors', !showVectors); },
                        'aria-pressed': showVectors,
                        className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showVectors ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600')
                      }, t('stem.bikelab.force_arrows_v2', '→ Force arrows')),
                      h('button', {
                        onClick: function() { setShowGraph(!showGraph); upd('sandboxShowEnergyGraph', !showGraph); },
                        'aria-pressed': showGraph,
                        className: 'py-2.5 px-4 rounded-xl font-bold transition-colors ' + (showGraph ? 'bg-pink-700 text-white' : 'bg-slate-200 text-slate-600')
                      }, t('stem.bikelab.energy_graph', '📈 Energy Graph'))),
                    h('div', { className: 'text-xs text-slate-600 mt-1' }, 'With the arrows off, ribbons show the air flowing past the rider.'))
                )
              ),
              h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-700 leading-relaxed border border-slate-400' },
                h('span', { className: 'font-bold text-slate-800' }, t('stem.bikelab.reading_the_arrows_v2', '💡 Reading the arrows: ')),
                'Green is your push. Purple is the air, which grows fast as you speed up. Amber is the tires. Red is the hill: it pulls you back on a climb and helps you on the way down. If the green arrow is longer than the others put together, you speed up. Your weight and the ground\'s push (dashed, under the bike) are much bigger, but they cancel, so they are not drawn to size. ' + bike.tip
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

        var safeRingIdx = Math.max(0, Math.min(ringIdx, bike.chainringT.length - 1));
        var safeCogIdx = Math.max(0, Math.min(cogIdx, bike.cassetteT.length - 1));
        var chainringT = bike.chainringT[safeRingIdx];
        var cogT = bike.cassetteT[safeCogIdx];
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
        // Reduced motion is read when the lab opens (not once at page load), and switching it on while the lab is open pauses the picture.
        var playState = useState(function() { return !reducedMotionNow(); });
        var playing = playState[0], setPlaying = playState[1];
        useEffect(function() {
          var mq = null;
          try { mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { mq = null; }
          if (!mq) return undefined;
          var onChange = function() { if (mq.matches) setPlaying(false); };
          if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
          return function() { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else if (mq.removeListener) mq.removeListener(onChange); };
        }, []);
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
                // The chosen bike carries a check mark, so its state is not shown by border color alone (the contrast theme draws every border yellow).
                return h('button', {
                  key: b.id, type: 'button', 'aria-pressed': bikeId === b.id ? 'true' : 'false',
                  onClick: function() { setBikeId(b.id); upd('gearingBikeId', b.id); },
                  className: 'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ' + (bikeId === b.id ? 'border-violet-500 bg-violet-50' : 'border-slate-500 bg-white hover:border-slate-700')
                },
                  bikeId === b.id && h('span', { 'aria-hidden': 'true', 'data-gear-bike-check': 'true', className: 'font-black text-violet-800' }, '✓'),
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
                          className: 'w-12 h-12 rounded-full border-2 font-black transition-colors ' + (ringIdx === i ? 'border-violet-700 bg-violet-600 text-white' : 'border-slate-500 bg-white text-slate-700 hover:border-slate-700')
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
                          className: 'w-10 h-10 rounded-full border-2 font-bold text-sm transition-colors ' + (cogIdx === i ? 'border-fuchsia-800 bg-fuchsia-700 text-white' : 'border-slate-500 bg-white text-slate-700 hover:border-slate-700')
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
              h('div', { className: 'bikelab-hc-panel bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-lg text-white p-5' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-3' }, t('stem.bikelab.this_gear', 'This Gear')),
                h('div', { className: 'grid grid-cols-2 gap-4' },
                  h('div', null,
                    h('div', { className: 'text-xs uppercase tracking-wider' }, t('stem.bikelab.gear_ratio_2', 'Gear Ratio')),
                    h('div', { className: 'text-3xl font-black font-mono' }, ratio.toFixed(2)),
                    h('div', { className: 'text-xs font-mono' }, chainringT + ' ÷ ' + cogT)
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs uppercase tracking-wider' }, 'Push at the tire'),
                    h('div', { 'data-gear-tire-push': 'true', className: 'text-3xl font-black font-mono' }, tirePush.toFixed(0) + ' N'),
                    h('div', { className: 'text-xs' }, 'for every 100 N on the pedal')
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs uppercase tracking-wider' }, t('stem.bikelab.distance_per_rev', 'Distance per Rev')),
                    h('div', { className: 'text-2xl font-black font-mono' }, dev.toFixed(2) + ' m'),
                    h('div', { className: 'text-xs font-mono' }, 'ratio × 2πr = ' + ratio.toFixed(2) + ' × ' + wheelCirc.toFixed(2))
                  ),
                  h('div', null,
                    h('div', { className: 'text-xs uppercase tracking-wider' }, 'Speed @ ' + cadence + ' RPM'),
                    h('div', { className: 'text-2xl font-black font-mono' }, speedMph.toFixed(1) + ' mph'),
                    h('div', { className: 'text-xs font-mono' }, speedKph.toFixed(1) + ' km/h · ' + speedMs.toFixed(2) + ' m/s')
                  )
                ),
                h('div', { 'data-gear-drivetrain': chainringT + 'x' + cogT, className: 'mt-4 pt-3 border-t border-white/30' },
                  h('svg', { viewBox: '0 0 440 222', className: 'w-full h-auto', role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_drivetrain_picture_a_tooth_chainring_at_the_pedals_drives', 'Drivetrain picture. A {chainringT}-tooth chainring at the pedals drives a {cogT}-tooth cog on the back wheel. One turn of the pedals turns the wheel {ratio} times.'), { chainringT: chainringT, cogT: cogT, ratio: ratio.toFixed(2) }) },
                    // back wheel and its cog turn together
                    h('g', { ref: wheelRef },
                      h('circle', { cx: DT.wx, cy: DT.y, r: 88, fill: 'none', stroke: isContrast ? '#ffffff' : '#1e1b4b', strokeWidth: 10 }),
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
              h('div', { role: 'group', 'aria-label': __alloT('stem.bikelab.yourPrediction', 'Your prediction'), className: 'mt-2 flex flex-wrap gap-2' },
                gcResult.gears.map(function(g) {
                  var on = gcPick === g.key;
                  return h('button', { key: g.key, type: 'button', 'data-gear-option': g.key, 'aria-pressed': on, disabled: gcTested,
                    onClick: function() { setGcPick(g.key); },
                    className: 'min-h-11 px-3 rounded-lg border-2 text-sm font-bold ' + (on ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-500 bg-white text-slate-800 hover:bg-slate-100') + (gcTested ? ' opacity-80' : '')
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
                        h('button', { type: 'button', onClick: function() { showGearOnPicture(g); }, 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_show_the_on_the_drivetrain_picture', 'Show the {label} on the drivetrain picture'), { label: g.label.toLowerCase() }), className: 'px-2 rounded border-2 border-slate-500 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100' }, 'Show it'));
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
                                'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_select_tooth_chainring_and_tooth_cog_gear_inches', 'Select {ct}-tooth chainring and {cg}-tooth cog, {gi} gear inches'), { ct: ct, cg: cg, gi: Math.round(gi) }),
                                'aria-pressed': isCur ? 'true' : 'false',
                                onClick: function() { setRingIdx(i); setCogIdx(j); },
                                className: 'w-full min-h-6 p-1 text-center font-mono cursor-pointer border border-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-600 ' + (isCur ? 'ring-2 ring-violet-600 font-black' + (isContrast ? '' : ' text-slate-900') : (isContrast ? '' : 'text-slate-700 ') + 'hover:opacity-80'),
                                // Contrast theme: the host turns slate text white, which vanished on these pale cells (1.1:1).
                                style: isContrast ? { background: heat(gi), color: '#000000', boxShadow: isCur ? 'inset 0 0 0 3px #000000' : 'none' } : { background: heat(gi) }
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
                  // The bar nearest the slider (85 rpm, the default, lit no bar at all before).
                  var isCurrent = pt.c === 40 + 10 * Math.round((cadence - 40) / 10);
                  return h('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end' },
                    h('div', { className: 'w-full rounded-t transition-all duration-300 ' + (isCurrent ? 'bg-violet-700' : 'bg-violet-200'),
                      'data-cadence-bar': pt.c, style: { height: Math.max(4, Math.round(pct * 84)) + 'px' } },
                      isCurrent && h('div', { className: 'text-xs font-bold text-white text-center pt-1' }, pt.v.toFixed(0))
                    ),
                    h('div', { className: 'text-xs text-slate-600 font-mono mt-1' }, pt.c),
                    h('div', { className: 'text-xs text-slate-600' }, pt.v.toFixed(0) + ' mph')
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
                          className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (grp.value === o[0] ? 'border-amber-800 bg-amber-700 text-white' : 'border-slate-500 bg-white text-slate-700 hover:border-slate-700') };
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
        // Keyboard focus follows the work: to the Next button when a step picture shows the tool in use, then to the new step's title.
        var stepTitleRef = useRef(null), nextBtnRef = useRef(null), focusWantRef = useRef('');
        useEffect(function() {
          var want = focusWantRef.current; focusWantRef.current = '';
          var el = want === 'next' ? nextBtnRef.current : want === 'title' ? stepTitleRef.current : null;
          if (el && typeof el.focus === 'function') { try { el.focus(); } catch (e) { /* focus is a convenience */ } }
        });
        // The bike on a work stand: the part this job (or this step) is about is ringed and in full color, the rest is dimmed.
        var workStand = function(standJobId, stepId, o) {
          o = o || {};
          var f = repairFocus(standJobId, stepId), whole = f.outlines.length === 0;
          var state = o.state || {};
          // With the front wheel off, a ring meant for the wheel follows it to the floor.
          if (state.wheelOff) f = { where: f.where, outlines: f.outlines.map(function(out) {
            return out.circle && out.circle[0] === 120 && out.circle[1] === 250 ? { rect: [44, 286, 112, 30] } : out; }) };
          var stateKeys = Object.keys(state).filter(function(k) { return state[k]; });
          var stateWords = stateKeys.map(function(k) { return REPAIR_STATE_WORDS[k] || ''; }).join(' ');
          var clipId = 'bikelab-stand-' + standJobId + '-' + (stepId || 'job') + (o.thumb ? '-thumb' : '');
          var shapeEl = function(out, key, props) {
            return out.circle ? h('circle', Object.assign({ key: key, cx: out.circle[0], cy: out.circle[1], r: out.circle[2] }, props))
              : h('rect', Object.assign({ key: key, x: out.rect[0], y: out.rect[1], width: out.rect[2], height: out.rect[3], rx: 8 }, props));
          };
          return h('svg', Object.assign({ viewBox: '0 0 500 300', className: 'w-full h-auto block', 'data-bikelab-work-stand': standJobId, 'data-bikelab-stand-state': stateKeys.join(' ') || 'whole' },
            o.thumb ? { 'aria-hidden': 'true', focusable: 'false' } : { role: 'img', 'aria-label': 'A bike on a work stand. Ringed: ' + f.where + '.' + (stateWords ? ' ' + stateWords : '') }),
            h('rect', { x: 0, y: 0, width: 500, height: 300, rx: 14, fill: '#f8fafc' }),
            h('g', { transform: 'matrix(-1 0 0 1 500 0)' },
              // the stand: floor, foot, post, arm
              h('line', { x1: 30, y1: 293, x2: 470, y2: 293, stroke: '#cbd5e1', strokeWidth: 3, strokeLinecap: 'round' }),
              h('line', { x1: 322, y1: 291, x2: 386, y2: 291, stroke: '#475569', strokeWidth: 7, strokeLinecap: 'round' }),
              h('line', { x1: 354, y1: 289, x2: 354, y2: 66, stroke: '#64748b', strokeWidth: 8, strokeLinecap: 'round' }),
              h('line', { x1: 354, y1: 66, x2: 312, y2: 66, stroke: '#64748b', strokeWidth: 7, strokeLinecap: 'round' }),
              h('g', { transform: 'translate(0 -16)' },
                !whole && h('defs', null, h('clipPath', { id: clipId }, f.outlines.map(function(out, i) { return shapeEl(out, i, {}); }))),
                h('g', { opacity: whole ? 1 : 0.3 }, bikeDiagramArt({ lifted: true, state: state })),
                !whole && h('g', { clipPath: 'url(#' + clipId + ')' }, bikeDiagramArt({ lifted: true, state: state })),
                !whole && f.outlines.map(function(out, i) { return shapeEl(out, 'ring' + i, { fill: 'none', stroke: '#b45309', strokeWidth: o.thumb ? 7 : 4, 'data-bikelab-stand-ring': 'true' }); })),
              // the clamp that grips the seatpost
              h('rect', { x: 288, y: 58, width: 28, height: 16, rx: 4, fill: '#f97316', stroke: '#9a3412', strokeWidth: 1.5 })));
        };
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
          if (placedTools.length > 0) return;      // this step is already done
          if (s.tool === toolId) {
            if (advancingRef.current) return;
            setPlacedTools([toolId]); setWrongNote('');
            // A step with a picture stops here, so the student can look at the tool at work and move on when ready.
            if (REPAIR_PICTURES[job.id] && REPAIR_PICTURES[job.id][s.id]) { focusWantRef.current = 'next'; return; }
            advancingRef.current = true;
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
              h('p', { className: 'text-slate-600 mb-6 text-center' }, t('stem.bikelab.pick_a_procedure_v2', 'Pick a job. The small picture shows where on the bike you will work. At each step, choose the tool the step needs.')),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                REPAIR_JOBS.map(function(j) {
                  var isDone = completed[j.id];
                  return h('button', {
                    key: j.id,
                    onClick: function() { startJob(j.id); },
                    className: 'text-left bg-white rounded-xl shadow hover:shadow-lg border-2 transition-all overflow-hidden ' + (isDone ? 'border-emerald-400' : 'border-slate-200 hover:border-slate-400')
                  },
                    h('div', { className: 'p-5 flex items-start gap-3' },
                     h('div', { className: 'flex-1 min-w-0' },
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
                     ),
                     h('div', { className: 'shrink-0', style: { width: 132 }, 'data-bikelab-job-thumb': j.id }, workStand(j.id, null, { thumb: true }))
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
                h('div', { role: 'group', 'aria-label': __alloT('stem.bikelab.a11y_answers', 'Answers'), className: 'mt-3 space-y-2' },
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
        // Pictures. While the student is choosing, the step picture shows the bike and never a tool. Once the right
        // tool is picked it shows that tool at work, and (for jobs with step pictures) waits for the student to move on.
        var stepDone = placedTools.length > 0;
        var pic = repairStepArt(h, job.id, currStep.id, stepDone);
        var focus = repairFocus(job.id, currStep.id);
        var lastStep = step === job.steps.length - 1;
        var goOn = function() { if (advancingRef.current) return; focusWantRef.current = 'title'; nextStep(); };

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🔧', title: t('stem.bikelab.repair_simulator_3', 'Repair Simulator') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            // Job header + progress
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-3xl', 'aria-hidden': 'true' }, job.icon),
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
            h('div', { className: 'bikelab-repair-grid' },
              // Current step instruction
              h('div', { className: 'bikelab-repair-step bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl shadow-lg text-white p-5' },
                h('div', { className: 'flex items-start justify-between gap-3 mb-1' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider opacity-80' }, t('stem.bikelab.current_step', 'Current Step')),
                  callTTS && h('button', {
                    onClick: function() { speak(currStep.label + '. ' + currStep.instruction); },
                    className: 'bg-white/15 hover:bg-white/25 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
                    title: t('stem.bikelab.read_this_step_aloud', 'Read this step aloud')
                  }, h('span', null, '🔊'), h('span', null, t('stem.bikelab.read_aloud', 'Read Aloud')))
                ),
                h('h3', { ref: stepTitleRef, tabIndex: -1, 'data-bikelab-repair-step-title': currStep.id, className: 'text-2xl font-black mb-3 focus:outline-none' }, currStep.label),
                h('p', { className: 'text-sm leading-relaxed opacity-95' }, currStep.instruction),
                h('div', { role: 'status', 'aria-live': 'polite', 'data-bikelab-repair-feedback': 'true', className: 'mt-4 pt-3 border-t border-white/20 text-sm font-bold min-h-[2.5rem]' },
                  wrongNote || (stepDone ? 'Right tool. ' + (pic ? pic.caption : '') : 'Which tool does this step need? Pick it from the toolbox.'))
              ),
              // Pictures: the step close up (two jobs so far) and the bike on its work stand. Tools can be dropped here.
              h('div', {
                'data-bikelab-repair-picture': pic ? (stepDone ? 'after' : 'before') : 'stand',
                onDragOver: function(e) { e.preventDefault(); },
                onDrop: function(e) { e.preventDefault(); if (dragged) handleDrop(dragged); },
                className: 'bikelab-repair-pic bg-white rounded-xl shadow p-3 border-2 ' + (stepDone ? 'border-emerald-600' : 'border-dashed border-slate-400')
              },
                pic && h('figure', { className: 'm-0' },
                  h.apply(null, ['svg', { viewBox: '0 0 320 200', role: 'img', 'aria-label': pic.caption, 'data-bikelab-step-art': currStep.id, className: 'w-full h-auto block rounded-lg' }].concat(pic.kids)),
                  h('figcaption', { className: 'text-sm text-slate-800 mt-2' }, pic.caption)),
                h('figure', { className: 'm-0 ' + (pic ? 'mt-3 pt-3 border-t border-slate-200 flex items-center gap-3' : '') },
                  h('div', { className: pic ? 'shrink-0' : '', style: pic ? { width: '44%', maxWidth: 230 } : null }, workStand(job.id, currStep.id, { state: repairBikeState(job.id, step, stepDone) })),
                  h('figcaption', { className: 'text-sm text-slate-700 ' + (pic ? '' : 'mt-2') }, h('strong', { className: 'text-slate-900' }, 'Where on the bike: '), focus.where + '.')),
                h('div', { className: 'mt-3 flex flex-wrap items-center gap-3 min-h-11' },
                  !stepDone ? h('p', { className: 'text-sm text-slate-700' }, 'Pick a tool from the toolbox, or drag it onto the picture.')
                    : pic ? [
                      h('span', { key: 'ok', className: 'text-sm font-black text-emerald-800' }, '✓ Right tool'),
                      h('button', { key: 'next', type: 'button', ref: nextBtnRef, 'data-bikelab-repair-next': 'true', onClick: goOn,
                        className: 'px-4 rounded-lg text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white' }, lastStep ? 'Finish the steps →' : 'Next step →')]
                    : h('p', { className: 'text-sm font-black text-emerald-800' }, '✓ Correct! ' + t('stem.bikelab.advancing_to_next_step', 'Advancing to next step…')))
              ),
              // Toolbox — drag source
              h('div', { className: 'bikelab-repair-tools bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mb-3' }, t('stem.bikelab.toolbox_v2', 'Toolbox')),
                h('div', { className: 'flex flex-wrap gap-3' },
                  toolbox.map(function(t, i) {
                    return h('div', {
                      key: i,
                      draggable: !stepDone,
                      role: 'button',
                      tabIndex: 0,
                      'aria-disabled': stepDone ? 'true' : undefined,
                      'data-bikelab-tool': t,
                      'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_use_tool', 'Use {value1} tool'), { value1: t.replace(/-/g, ' ') }),
                      onDragStart: function() { setDragged(t); },
                      onDragEnd: function() { setDragged(null); },
                      onClick: function() { handleDrop(t); },
                      onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDrop(t); } },
                      className: 'w-20 h-20 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-600 ' + (dragged === t ? 'opacity-40 scale-95' : stepDone ? 'opacity-60' : '')
                    },
                      h('svg', { viewBox: '-24 -24 48 48', width: 40, height: 40, 'aria-hidden': 'true', focusable: 'false' }, repairToolArt(h, t)),
                      h('span', { className: 'text-xs font-bold text-slate-700 capitalize' }, t.replace(/-/g, ' '))
                    );
                  })
                ),
                h('div', { className: 'text-xs text-slate-600 mt-3' }, t('stem.bikelab.tool_tip_v2', 'A wrong pick costs nothing: you get a hint, and you try again.'))
              ),
              // Step controls
              h('div', { className: 'bikelab-repair-nav flex items-center gap-3' },
                h('button', {
                  onClick: prevStep,
                  disabled: step === 0,
                  className: 'px-4 py-2 rounded-lg font-bold text-sm ' + (step === 0 ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-200 hover:bg-slate-300 text-slate-700')
                }, t('stem.bikelab.previous_step', '← Previous Step')),
                h('div', { className: 'flex-1 text-center text-sm text-slate-600' },
                  'Step ' + (step + 1) + ' / ' + job.steps.length),
                h('button', {
                  onClick: function() { if (advancingRef.current) return; if (stepDone) { goOn(); return; } skippedRef.current = true; nextStep(); },
                  className: 'px-4 py-2 rounded-lg font-bold text-sm bg-amber-700 hover:bg-amber-800 text-white'
                }, stepDone ? (lastStep ? 'Finish the steps →' : 'Next step →') : lastStep ? 'Skip and end practice' : 'Skip Step →')
              )
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
        // Wheel size by height sits inside maker charts checked 2026-11-23 (Trek kids' buyer's guide; Raleigh: 20-inch for 114-129 cm).
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
        // A saved value that is not a number in the slider's range falls back to the default (a hostile save drew NaN).
        var fitNum = function(v, lo, hi, dflt) { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? v : dflt; };
        var heightState = useState(fitNum(d.fitHeightCm, 105, 210, 170));
        var heightCm = heightState[0], setHeightCm = heightState[1];
        var inseamState = useState(fitNum(d.fitInseamCm, 45, 100, 78));
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
          return h('svg', { role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_bike_fit_diagram_showing_saddle_height_centimeters_reach', 'Bike fit diagram showing saddle height {value1} centimeters, reach {reachCm} centimeters, saddle setback {setback} centimeters, and handlebar drop {drop} centimeters. A rider sits on the bike with one foot at the bottom of the pedal stroke. {verdictText}'), { value1: (saddleHeight + saddleOffset).toFixed(1), reachCm: reachCm.toFixed(1), setback: setback, drop: drop, verdictText: verdictText }), viewBox: '0 0 420 260', className: 'w-full h-auto', 'data-fit-verdict': M.verdict },
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
                    h('span', null, t('stem.bikelab.height', 'Height')), h('span', { className: 'text-sky-700' }, (function() { var totalIn = Math.round(heightCm / 2.54); return heightCm + ' cm · ' + Math.floor(totalIn / 12) + ' ft ' + (totalIn % 12) + ' in'; })())),
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
                    { label: t('stem.bikelab.saddle_height', 'Saddle Height'), main: saddleHeight.toFixed(1) + ' cm', sub: '(center of the cranks → top of the saddle)', formula: 'LeMond: inseam × 0.883', color: 'from-emerald-700 to-teal-800' },
                    { label: t('stem.bikelab.saddle_setback', 'Saddle Setback'), main: setback + ' cm', sub: '(saddle nose behind the cranks)', formula: bikeType === 'road' ? 'Road: 4 cm' : bikeType === 'mtb' ? 'MTB: 1 cm' : 'Hybrid: 2 cm', color: 'from-violet-600 to-purple-700' },
                    { label: t('stem.bikelab.reach_horizontal', 'Reach (horizontal)'), main: reachCm.toFixed(1) + ' cm', sub: '(cranks → handlebar)', formula: 'height × ' + (bikeType === 'road' ? '0.234' : bikeType === 'mtb' ? '0.221' : '0.215'), color: 'from-sky-700 to-blue-800' },
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

        // "Test your own reaction time". One button does everything, so keyboard focus never has to move:
        // 'idle' / 'shown' -> start a try; 'waiting' (nothing on the road yet) / 'hazard' (the ball is out) -> brake.
        var rtPhaseState = useState('idle'), rtPhase = rtPhaseState[0], setRtPhase = rtPhaseState[1];
        var rtTrialsState = useState([]), rtTrials = rtTrialsState[0], setRtTrials = rtTrialsState[1];
        var rtNoteState = useState(''), rtNote = rtNoteState[0], setRtNote = rtNoteState[1];
        var rtBallState = useState(null), rtBall = rtBallState[0], setRtBall = rtBallState[1];     // null | 'left' | 'right'
        var rtTimerRef = useRef(null), rtT0Ref = useRef(0), rtLastRef = useRef(-1e9), rtDashRef = useRef(null), rtPtrRef = useRef(false);
        var rtSaved = parseFloat(d.brakingMyReactionSec);
        rtSaved = isFinite(rtSaved) && rtSaved > 0 && rtSaved <= 3 ? rtSaved : null;
        var rtSum = reactionSummary(rtTrials);
        var rtMine = rtSum.avgSec != null ? rtSum.avgSec : rtSaved;
        var surfKey = SURFACES[surf] ? surf : 'dry';
        var rtClock = function() { try { return window.performance.now(); } catch (e) { return Date.now(); } };
        var rtClear = function() { if (rtTimerRef.current) { clearTimeout(rtTimerRef.current); rtTimerRef.current = null; } };
        useEffect(function() { return rtClear; }, []);
        // The clock starts when the ball is on screen: this runs after React has drawn it.
        useEffect(function() { if (rtPhase === 'hazard') rtT0Ref.current = rtClock(); }, [rtPhase]);
        // The road's center line slides past while riding. Reduced motion is read every frame; the road then stands still.
        useEffect(function() {
          if (rtPhase !== 'waiting' && rtPhase !== 'hazard') return undefined;
          var raf = 0, last = 0, off = 0;
          var tick = function(ts) {
            var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
            if (!reducedMotionNow()) { off = (off + dt * 60) % 28; if (rtDashRef.current) rtDashRef.current.setAttribute('stroke-dashoffset', (-off).toFixed(1)); }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return function() { cancelAnimationFrame(raf); };
        }, [rtPhase]);
        var rtStartTry = function() {
          rtClear();
          var trials = rtSum.count >= REACTION_TRIALS ? [] : rtTrials;
          if (trials !== rtTrials) setRtTrials(trials);
          setRtBall(null); setRtPhase('waiting');
          setRtNote('Riding. Watch the road and brake as soon as something comes out.');
          var side = Math.random() < 0.5 ? 'left' : 'right';
          rtTimerRef.current = setTimeout(function() {
            rtT0Ref.current = rtClock();
            setRtBall(side); setRtPhase('hazard'); setRtNote('A ball is rolling into the road. Brake!');
            rtTimerRef.current = setTimeout(function() {
              rtTimerRef.current = null; setRtPhase('shown');
              setRtNote('No brake within 3 seconds. That try is not counted. Try again whenever you are ready.');
            }, REACTION_TIMEOUT_MS);
          }, reactionWaitMs(Math.random()));
        };
        var rtPress = function(e) {
          var type = e && e.type;
          if (type === 'keydown') {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            if (e.repeat) return;
          }
          // A pointer or key press is followed by a click: that click is the same press. A click on its own (a screen
          // reader, a switch) still counts.
          if (type === 'click') { if (rtPtrRef.current) { rtPtrRef.current = false; return; } }
          else if (e && e.currentTarget && e.currentTarget.tagName === 'BUTTON') rtPtrRef.current = true;
          var now = rtClock();
          if (now - rtLastRef.current < 300) return;      // a double tap is one press
          rtLastRef.current = now;
          if (rtPhase === 'idle' || rtPhase === 'shown') { rtStartTry(); return; }
          rtClear();
          if (rtPhase === 'waiting') {
            setRtPhase('shown');
            setRtNote('That was before anything came out, so it is not counted. Wait for the hazard, then brake.');
            return;
          }
          var ms = now - rtT0Ref.current;
          setRtPhase('shown');
          if (!reactionCounted(ms)) { setRtNote('That was quicker than a hand can answer, so it was a guess and is not counted. Try again.'); return; }
          var next = rtTrials.concat([Math.round(ms)]), sum = reactionSummary(next);
          setRtTrials(next);
          var st = brakingStop(speedMph, surfKey, brakeSplit, ms / 1000);
          setRtNote((ms / 1000).toFixed(2) + ' s. At ' + speedMph + ' mph the bike rolls ' + st.reaction.toFixed(1) + ' m in that time, before the brakes even start.' +
            (sum.count >= REACTION_TRIALS ? ' That was your last try. Your average is with your results.' : ''));
          if (sum.count >= 3) upd('brakingMyReactionSec', Math.round(sum.avgSec * 1000) / 1000);
        };
        var rtUseTime = function(sec) {
          var v = Math.max(0.1, Math.min(2.5, Math.round(sec * 100) / 100));
          setReaction(v); upd('brakingReactionSec', v);
          try { if (cvsRef.current && cvsRef.current.scrollIntoView) cvsRef.current.scrollIntoView({ block: 'center', behavior: reducedMotionNow() ? 'auto' : 'smooth' }); } catch (e) { /* scrolling is a convenience */ }
        };

        var cvsRef = useRef(null);
        var frameTickState = useState(0);
        var frameTick = frameTickState[0], setFrameTick = frameTickState[1];
        useEffect(function() {
          var cvs = cvsRef.current;
          if (!cvs) return;
          // On a phone the drawing is as wide as its frame (and relatively taller), so the distances can be read.
          var size = fitCanvasLogical(cvs, 1000, 250, 0.62);
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = size.w, H = size.h;
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
          // On a narrow drawing the riders stand close together, so the two labels are lifted above their heads.
          var labelLift = size.narrow ? 50 : 0, figK = size.narrow ? 0.9 : 1.15;
          var zoneLabel = function(x0, x1, text, color) {
            ctx2d.font = 'bold 13px sans-serif'; var tw = ctx2d.measureText(text).width;
            var lx = (x1 - x0 > tw + 12) ? x0 + (x1 - x0 - tw) / 2 : Math.max(4, Math.min(W - tw - 8, x0 + 4)), ly = roadTop - 22 - labelLift;
            ctx2d.fillStyle = 'rgba(255,255,255,0.92)'; ctx2d.fillRect(lx - 5, ly - 14, tw + 10, 19);
            ctx2d.fillStyle = color; ctx2d.fillText(text, lx, ly);
            ctx2d.strokeStyle = color; ctx2d.lineWidth = 2; ctx2d.beginPath(); ctx2d.moveTo(x0, roadTop - 14); ctx2d.lineTo(x0, roadTop + 4); ctx2d.moveTo(x1, roadTop - 14); ctx2d.lineTo(x1, roadTop + 4); ctx2d.moveTo(x0, roadTop - 6); ctx2d.lineTo(x1, roadTop - 6); ctx2d.stroke();
          };
          zoneLabel(bikeX, reactX, 'Reacting: ' + reactionDist.toFixed(1) + ' m', '#92400e');
          ctx2d.save(); ctx2d.translate(0, -24); zoneLabel(reactX, stopX, 'Braking: ' + brakingDist.toFixed(1) + ' m', '#991b1b'); ctx2d.restore();
          // the bike at three moments: sees the hazard, brakes go on, stopped
          var wheelY = roadTop + roadH / 2 + 12;
          drawBikeFigure(ctx2d, bikeX, wheelY, { scale: figK, alpha: 0.55, pedal: 0.6 });
          drawBikeFigure(ctx2d, reactX, wheelY, { scale: figK, alpha: 0.75, pedal: 1.9, braking: true });
          drawBikeFigure(ctx2d, stopX, wheelY, { scale: figK, pedal: 3.1, braking: true, frame: '#7c3aed' });
          ctx2d.strokeStyle = '#ffffff'; ctx2d.lineWidth = 4; ctx2d.beginPath(); ctx2d.moveTo(stopX + 26, roadTop + 3); ctx2d.lineTo(stopX + 26, H - 20); ctx2d.stroke();
          // headline
          var head = 'Stopped after ' + totalDist.toFixed(1) + ' m (' + (totalDist * 3.281).toFixed(0) + ' ft)';
          ctx2d.font = 'bold ' + (size.narrow ? 14 : 16) + 'px sans-serif'; var hw = ctx2d.measureText(head).width;
          ctx2d.fillStyle = 'rgba(15,23,42,0.85)'; ctx2d.fillRect(12, 10, hw + 20, 28);
          ctx2d.fillStyle = '#ffffff'; ctx2d.fillText(head, 22, 30);
        }, [speedMph, surf, brakeSplit, reaction, achieved, frameTick]); // eslint-disable-line
        useEffect(function() {
          var onResize = function() { setFrameTick(function(x) { return (x + 1) % 1000; }); };
          window.addEventListener('resize', onResize);
          return function() { window.removeEventListener('resize', onResize); };
        }, []);

        var endoWarn = brakeSplit === 'front' && frictionA > endoA; // only front-only braking can pitch the rider over

        return h('div', { className: 'flex flex-col h-full bg-slate-50' },
          BackBar({ icon: '🛑', title: t('stem.bikelab.braking_physics_2', 'Braking Physics') }),
          h('div', { className: 'p-4 max-w-6xl mx-auto w-full space-y-4' },
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 overflow-hidden' },
              h('canvas', { ref: cvsRef, width: 1000, height: 250, className: 'bikelab-fit-canvas w-full block', role: 'img', 'aria-label': t('stem.bikelab.braking_distance_visualization_bicycle', 'Braking distance visualization: bicycle stops over the calculated reaction-plus-braking distance for the selected speed and surface.') })
            ),
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3 flex flex-wrap items-center justify-between gap-3', 'data-bikelab-braking-presets': 'true' },
              h('div', { className: 'flex flex-wrap items-center gap-1.5' },
                h('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mr-1' }, t('stem.bikelab.test_scenarios', 'Test scenarios:')),
                [
                  { id: 'dry15', label: t('stem.bikelab.brake_preset_dry', '☀️ Dry 15 mph'), mph: 15, surf: 'dry', split: 'both', react: 1.0 },
                  { id: 'wet20', label: t('stem.bikelab.brake_preset_wet', '🌧️ Wet 20 mph'), mph: 20, surf: 'wet', split: 'both', react: 1.0 },
                  { id: 'ice12', label: t('stem.bikelab.brake_preset_ice', '🧊 Ice 12 mph'), mph: 12, surf: 'ice', split: 'rear', react: 1.0 },
                  { id: 'endo25', label: t('stem.bikelab.brake_preset_front', '⚠️ Front-Only 25 mph'), mph: 25, surf: 'dry', split: 'front', react: 0.8 }
                ].map(function(bp) {
                  return h('button', {
                    key: bp.id, type: 'button',
                    onClick: function() {
                      setSpeedMph(bp.mph); upd('brakingMph', bp.mph);
                      setSurf(bp.surf); upd('brakingSurface', bp.surf);
                      setBrakeSplit(bp.split); upd('brakingSplit', bp.split);
                      setReaction(bp.react); upd('brakingReactionSec', bp.react);
                    },
                    className: 'bikelab-preset-chip'
                  }, bp.label);
                })
              ),
              (function() {
                var reactPct = totalDist > 0 ? Math.max(4, Math.min(96, (reactionDist / totalDist) * 100)) : 50;
                var reactW = +(3.4 * reactPct).toFixed(1);
                return h('svg', { viewBox: '0 0 360 40', width: 360, height: 40, 'aria-hidden': 'true', focusable: 'false', className: 'shrink-0 max-w-full' },
                  h('rect', { x: 10, y: 4, width: 340, height: 14, rx: 7, fill: '#e2e8f0' }),
                  h('rect', { x: 10, y: 4, width: reactW, height: 14, rx: 7, fill: '#f59e0b' }),
                  h('rect', { x: 10 + reactW, y: 4, width: Math.max(0, 340 - reactW), height: 14, rx: 7, fill: '#dc2626' }),
                  h('text', { x: 12, y: 34, fill: isContrast ? '#ffffff' : '#92400e', fontSize: 14, fontWeight: 'bold' }, 'Reacting ' + Math.round(reactPct) + '%'),
                  h('text', { x: 348, y: 34, fill: isContrast ? '#ffffff' : '#991b1b', fontSize: 14, fontWeight: 'bold', textAnchor: 'end' }, 'Braking ' + Math.round(100 - reactPct) + '%')
                );
              })()
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
                // The ratio comes from brakingStop for the chosen surface: a fixed "3×" was only true off dry pavement (dry gives 2.3×).
                h('div', { className: 'text-xs text-slate-600 mt-2', 'data-bikelab-rear-ratio': 'true' }, __alloAriaFill(__alloT('stem.bikelab.rear_only_distance_v3', 'On this surface, rear-only braking needs about {ratio}× the distance of front braking.'),
                  { ratio: (brakingStop(speedMph, surfKey, 'rear', reaction).braking / brakingStop(speedMph, surfKey, 'front', reaction).braking).toFixed(1) }))
              ),
              h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('label', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                  h('span', null, t('stem.bikelab.reaction_time', 'Reaction Time')), h('span', { className: 'text-amber-700' }, (Math.abs(reaction * 10 - Math.round(reaction * 10)) < 1e-6 ? reaction.toFixed(1) : reaction.toFixed(2)) + ' s')),
                h('input', { type: 'range', min: 0.3, max: 2.5, step: 0.1, value: reaction,
                  onChange: function(e) { var v = parseFloat(e.target.value); setReaction(v); upd('brakingReactionSec', v); },
                  className: 'w-full mt-2 accent-amber-500',
                  'aria-label': t('stem.bikelab.reaction_time_seconds_slider', 'Reaction time in seconds') }),
                // Green (2000), "How long does it take to stop?", Transportation Human Factors 2(3): about 1.25 s for an unexpected
                // event and about 1.5 s for a surprise. "Pro racer: 0.3 s" had no source and was removed (2026-11-23).
                h('div', { className: 'text-xs text-slate-600' }, t('stem.bikelab.reaction_typical_note_v2', 'A surprise on the road: about 1 to 1.5 s'))
              )
            ),
            h('section', { 'data-bikelab-brake-challenge': challenge.id, 'aria-labelledby': 'bikelab-brake-challenge-title', className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('h3', { id: 'bikelab-brake-challenge-title', className: 'text-sm font-black text-slate-800' }, 'Predict, then test (' + ((chIdx % BRAKE_CHALLENGES.length) + 1) + ' of ' + BRAKE_CHALLENGES.length + ')'),
                h('span', { className: 'text-xs font-bold text-slate-600' }, Object.keys(chSolved).length + ' of ' + BRAKE_CHALLENGES.length + ' predicted correctly')),
              h('p', { className: 'text-sm text-slate-800 mt-1' }, challenge.q),
              h('div', { role: 'group', 'aria-label': __alloT('stem.bikelab.yourPrediction', 'Your prediction'), className: 'mt-2 flex flex-wrap gap-2' },
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
            (function() {
              // Test your own reaction time: the road seen over the handlebars, a ball that rolls out at a moment
              // nobody can predict, and one big button. It measures; it is not a race.
              var riding = rtPhase === 'waiting' || rtPhase === 'hazard';
              var allDone = rtSum.count >= REACTION_TRIALS;
              var btnLabel = riding ? 'Brake!' : rtPhase === 'idle' ? 'Start a try' : allDone ? 'Test again from the start' : 'Next try';
              var k = svgKit(h), HZ = 46, half = function(y) { return 8 + (y - HZ) * 1.7; };
              var scene = h('svg', { viewBox: '0 0 320 140', role: 'img', 'data-bikelab-reaction-scene': rtBall ? 'hazard' : 'clear', onPointerDown: riding ? rtPress : undefined,
                  'aria-label': rtBall ? 'The road seen over the handlebars. A ball is rolling into the road from the ' + rtBall + '.' : 'The road seen over the handlebars. Nothing is on the road.',
                  className: 'w-full h-auto block rounded-lg', style: { touchAction: 'manipulation', cursor: riding ? 'pointer' : 'default' } },
                k.rect(0, 0, 320, HZ + 1, 0, '#bae6fd'), k.rect(0, HZ, 320, 100, 0, '#86c06c'),
                k.path('M ' + (160 - half(HZ)) + ' ' + HZ + ' L ' + (160 + half(HZ)) + ' ' + HZ + ' L ' + (160 + half(140)) + ' 140 L ' + (160 - half(140)) + ' 140 Z', '#475569'),
                h('line', { ref: rtDashRef, x1: 160, y1: HZ + 2, x2: 160, y2: 140, stroke: '#fde047', strokeWidth: 3, strokeDasharray: '12 16' }),
                k.line(160 - half(HZ) + 2, HZ, 160 - half(140) + 10, 140, '#e2e8f0', 2), k.line(160 + half(HZ) - 2, HZ, 160 + half(140) - 10, 140, '#e2e8f0', 2),
                k.rect(40, 26, 30, 22, 2, '#fef3c7', '#92400e', 1.2), k.path('M 36 28 L 55 14 L 74 28 Z', '#b91c1c'), k.circle(262, 34, 13, '#15803d'), k.line(262, 40, 262, 52, '#78350f', 3),
                rtBall && k.g({ 'data-bikelab-reaction-ball': rtBall }, [
                  k.circle(rtBall === 'left' ? 128 : 196, 84, 11, '#ef4444', '#7f1d1d', 1.5),
                  k.path(rtBall === 'left' ? 'M 118 80 Q 128 88 138 80' : 'M 186 80 Q 196 88 206 80', 'none', '#ffffff', 2.5),
                  k.path(rtBall === 'left' ? 'M 104 92 L 112 90 M 100 84 L 110 84' : 'M 212 90 L 220 92 M 214 84 L 224 84', 'none', '#ffffff', 2)]),
                // the handlebars, with a brake lever at each grip
                k.line(60, 128, 260, 128, '#1e293b', 7), k.line(48, 130, 84, 129, '#111827', 12), k.line(236, 129, 272, 130, '#111827', 12),
                k.line(92, 132, 64, 140, '#94a3b8', 4), k.line(228, 132, 256, 140, '#94a3b8', 4), k.rect(150, 118, 20, 16, 3, '#334155'));
              var rows = reactionCompare(speedMph, surfKey, brakeSplit, rtMine);
              var maxTotal = Math.max.apply(null, rows.map(function(r) { return r.stop.total; })) || 1;
              return h('section', { 'data-bikelab-reaction-test': rtPhase, 'aria-labelledby': 'bikelab-reaction-title', className: 'bg-white rounded-xl shadow border border-slate-400 p-4' },
                h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                  h('h3', { id: 'bikelab-reaction-title', className: 'text-sm font-black text-slate-800' }, 'Test your own reaction time'),
                  h('span', { className: 'text-xs font-bold text-slate-700', 'data-bikelab-reaction-count': rtSum.count }, 'Try ' + Math.min(rtSum.count + (riding ? 1 : 0), REACTION_TRIALS) + ' of ' + REACTION_TRIALS)),
                h('p', { className: 'text-sm text-slate-700 mt-1' }, 'You ride along a street. At a moment you cannot guess, a ball rolls out. Brake as soon as you see it: press the big button, tap the road, or press Space or Enter. This measures your time. It is not a race, and any time is fine.'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 items-start' },
                  h('div', null,
                    scene,
                    h('button', { type: 'button', 'data-bikelab-reaction-button': riding ? 'brake' : 'start', onPointerDown: rtPress, onKeyDown: rtPress, onClick: rtPress,
                      className: 'mt-2 w-full rounded-xl font-black text-lg text-white ' + (riding ? 'bg-rose-700 hover:bg-rose-800' : 'bg-indigo-700 hover:bg-indigo-800'), style: { minHeight: 64, touchAction: 'manipulation' } }, btnLabel),
                    h('div', { role: 'status', 'aria-live': 'assertive', 'data-bikelab-reaction-note': 'true', className: 'mt-2 text-sm font-bold text-slate-800 min-h-[2.5rem]' }, rtNote)),
                  h('div', { 'data-bikelab-reaction-results': rtMine != null ? 'yes' : 'no' },
                    rtTrials.length > 0 && h('p', { className: 'text-sm text-slate-800' }, h('strong', null, 'Your tries: '), rtTrials.map(function(ms) { return (ms / 1000).toFixed(2) + ' s'; }).join(' · ')),
                    rtMine != null && h('p', { className: 'text-sm text-slate-800 mt-1' }, h('strong', null, rtSum.count ? 'Your average: ' : 'Your saved average: '), rtMine.toFixed(2) + ' s' + (rtSum.count ? ' (' + rtSum.count + (rtSum.count === 1 ? ' try)' : ' tries)') : '')),
                    h('p', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600 mt-2' }, 'Stopping at ' + speedMph + ' mph on ' + SURFACES[surfKey].label.toLowerCase()),
                    h('div', { className: 'space-y-2 mt-1' }, rows.map(function(r) {
                      var reactPct = 100 * r.stop.reaction / maxTotal, brakePct = 100 * r.stop.braking / maxTotal;
                      return h('div', { key: r.key, 'data-bikelab-reaction-row': r.key },
                        h('div', { className: 'text-sm text-slate-800' }, h('strong', null, r.key === 'me' ? 'You, ready for it: ' : 'A surprise on the road: '), r.sec.toFixed(2) + ' s → ' + r.stop.reaction.toFixed(1) + ' m reacting + ' + r.stop.braking.toFixed(1) + ' m braking = ' + r.stop.total.toFixed(1) + ' m'),
                        h('div', { className: 'flex h-3 rounded-full overflow-hidden bg-slate-200 mt-1', 'aria-hidden': 'true' },
                          h('div', { style: { width: reactPct + '%', background: '#d97706' } }), h('div', { style: { width: brakePct + '%', background: '#dc2626' } })));
                    })),
                    h('p', { className: 'text-sm text-slate-700 mt-2' }, 'Here you knew a hazard was coming and your finger was ready. On a real ride you do not know: you have to notice it, decide, and move your hands. That is why 1 to 1.5 seconds is the usual time for a surprise. The braking part stays the same, because it depends on speed and grip, not on you.'),
                    h('div', { className: 'mt-2 flex flex-wrap gap-2' },
                      rtMine != null && h('button', { type: 'button', 'data-bikelab-reaction-use': 'mine', onClick: function() { rtUseTime(rtMine); }, className: 'min-h-11 px-3 rounded-lg text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white' }, 'Show my time on the road above'),
                      h('button', { type: 'button', 'data-bikelab-reaction-use': 'typical', onClick: function() { rtUseTime(1.0); }, className: 'min-h-11 px-3 rounded-lg text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-800' }, 'Skip the test: use a typical 1.0 s')))));
            })(),
            h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
              [
                { label: t('stem.bikelab.total_stopping_distance', 'Total Stopping Distance'), val: totalDist.toFixed(1) + ' m', sub: (totalDist * 3.281).toFixed(1) + ' ft', color: 'from-rose-600 to-red-700' },
                { label: t('stem.bikelab.braking_distance', 'Braking Distance'), val: brakingDist.toFixed(1) + ' m', sub: 'd = v²/(2a)', color: 'from-orange-700 to-amber-800' },
                { label: t('stem.bikelab.reaction_distance', 'Reaction Distance'), val: reactionDist.toFixed(1) + ' m', sub: 'd = v · t_react', color: 'from-yellow-700 to-amber-700' },
                { label: t('stem.bikelab.time_to_stop', 'Time to Stop'), val: timeToStop.toFixed(2) + ' s', sub: 't = t_react + v / a', color: 'from-purple-600 to-fuchsia-700' }
              ].map(function(s, i) {
                return h('div', { key: i, className: 'bg-gradient-to-br ' + s.color + ' text-white rounded-xl p-4 shadow' },
                  h('div', { className: 'text-xs uppercase tracking-wider font-bold' }, s.label),
                  h('div', { className: 'text-2xl font-black font-mono mt-1' }, s.val),
                  h('div', { className: 'text-xs font-mono' }, s.sub)
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
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.doubling_speed_quadruples_braking_dist_v2', 'Doubling speed quadruples braking distance')), t('stem.bikelab.d_v', ' (d ∝ v²).')),
                  // Source audit 2026-11-23, Sheldon Brown "Braking and Turning Your Bicycle" (sheldonbrown.com/brakturn.html): on dry
                  // pavement the front brake alone gives the most stopping power (no percentage is given, so "~70%" was removed);
                  // on slippery surfaces control speed with the rear brake, because "a front wheel skid almost always leads to a fall".
                  // (On ice the tire slides long before the bike could tip, so "locked front = over the bars" was wrong there.)
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.front_brake_most_work_v2', 'The front brake does most of the stopping')), t('stem.bikelab.on_dry_pavement_v2', ' on dry pavement.')),
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.wet_cuts_grip_nearly_in_half', 'Wet cuts grip nearly in half.'))),
                  h('li', null, '• ', h('strong', null, t('stem.bikelab.on_gravel_ice_rear_brake_is_safer_v2', 'On gravel or ice, use more rear brake')), t('stem.bikelab.front_skid_falls_v2', ': a skidding front wheel almost always means a fall.'))
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
            explain: 'Left arm straight out = left turn. Maine law sets this signal (Title 29-A §2071).'   // §2071(5)(A), checked 2026-11-23
          },
          {
            q: 'You want to turn RIGHT. What\'s the primary hand signal?',
            choices: [
              { id: 'a', label: t('stem.bikelab.left_arm_bent_up_at_90_forearm_vertica', 'Left arm bent up at 90° (forearm vertical)'), svg: 'left_up', correct: true },
              { id: 'b', label: t('stem.bikelab.both_arms_out_to_the_sides', 'Both arms out to the sides'), svg: 'both_out' },
              { id: 'c', label: t('stem.bikelab.left_arm_bent_down', 'Left arm bent down'), svg: 'left_down' }
            ],
            // 29-A §2071(5)(B) lets a bicyclist signal a right turn with the right arm extended horizontally (checked 2026-11-23).
            // "and most states" had no state survey behind it and was removed.
            explain: 'Left arm bent up = right turn. In Maine, a bike rider may also point the RIGHT arm straight out for a right turn (Title 29-A §2071).'
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
            // Maine 29-A §2063(2): ride on the right portion of the way as far as practicable. Wrong-way risk: Wachtel & Lewiston,
            // "Risk Factors for Bicycle-Motor Vehicle Collisions at Intersections", ITE Journal 1994. "illegal in most states" reworded (2026-11-23).
            explain: 'Ride WITH traffic, as far right as is practical (not so close you hit the curb or open doors). Maine law says to ride on the right (Title 29-A §2063), and riding against traffic makes a crash more likely.'
          },
          {
            q: 'You\'re approaching a 4-way stop sign on a bike. What should you do?',
            choices: [
              { id: 'a', label: t('stem.bikelab.speed_through_momentum_helps_balance', 'Speed through — momentum helps balance') },
              { id: 'b', label: t('stem.bikelab.come_to_a_full_stop_then_proceed_in_or', 'Come to a FULL stop, then proceed in order'), correct: true },
              { id: 'c', label: t('stem.bikelab.slow_to_5_mph_but_don_t_fully_stop', 'Slow to 5 mph but don\'t fully stop') },
              { id: 'd', label: t('stem.bikelab.wait_for_cars_to_go_first_always', 'Wait for cars to go first, always') }
            ],
            // Maine 29-A §2063(5) (a bicyclist has the duties of a vehicle operator) and §2063(12) (stop at a stop sign), checked 2026-11-23.
            // Stop-as-yield ("Idaho stop") states: about ten, per NHTSA's "Bicyclist Stop-as-Yield Laws and Safety" fact sheet plus later laws.
            explain: 'In Maine, bike riders have the same duties as drivers, so you come to a full stop at stop signs (Title 29-A §2063). A few states let riders treat a stop sign like a yield sign (the "Idaho stop"). Maine does not.'
          },
          {
            q: 'When should you wear a helmet?',
            choices: [
              { id: 'a', label: t('stem.bikelab.only_on_long_rides', 'Only on long rides') },
              { id: 'b', label: t('stem.bikelab.only_at_night', 'Only at night') },
              { id: 'c', label: t('stem.bikelab.every_ride_every_time', 'EVERY ride, every time'), correct: true },
              { id: 'd', label: t('stem.bikelab.only_when_you_ride_fast', 'Only when you ride fast') }
            ],
            // §2323 (under 16, operator or passenger) checked 2026-11-23. "most bike crashes happen close to home" had no source and was
            // removed. Fit check per NHTSA "Fitting Your Bike Helmet": two fingers above the eyebrows, V around each ear, one or two fingers under the strap.
            explain: 'Every ride. In Maine, riders and passengers under 16 must wear a helmet by law (Title 29-A §2323). A crash can happen on any ride, even a short, slow one. Fit check: 2 fingers above eyebrows, straps form a V under each ear, and no more than 1 or 2 fingers fit under the chin strap.'
          },
          {
            q: 'In Maine, the minimum legal passing distance when a car overtakes a cyclist is:',
            choices: [
              { id: 'a', label: t('stem.bikelab.1_foot', '1 foot') },
              { id: 'b', label: t('stem.bikelab.2_feet', '2 feet') },
              { id: 'c', label: t('stem.bikelab.3_feet', '3 feet'), correct: true },
              { id: 'd', label: t('stem.bikelab.no_specific_distance_just_safe', 'No specific distance — just safe')}
            ],
            // Corrected 2026-11-23 to the words of 29-A §2070(1-A): a driver may pass a bicycle in a no-passing zone only when it is
            // safe. The statute does not mention a "double-yellow centerline".
            explain: 'Maine\'s 3-foot passing law (Title 29-A §2070) requires drivers to give cyclists at least 3 feet of clearance when passing. The same law lets a driver pass a bike in a no-passing zone, but only when it is safe. As a cyclist, ride predictably and signal — drivers need to see your intentions to safely pass.'
          },
          {
            q: 'Maine law requires bicycles ridden after dark (or in low visibility) to have:',
            choices: [
              { id: 'a', label: t('stem.bikelab.reflectors_only_no_lights_needed', 'Reflectors only — no lights needed') },
              { id: 'b', label: t('stem.bikelab.night_lights_answer_v2', 'A white front light AND a red or amber rear light or reflector'), correct: true },
              { id: 'c', label: t('stem.bikelab.just_a_rear_reflector', 'Just a rear reflector') },
              { id: 'd', label: t('stem.bikelab.no_lights_the_rider_just_has_to_wear_b', 'No lights — the rider just has to wear bright clothing') }
            ],
            explain: 'Maine law (Title 29-A §2084) says a bike ridden at night needs a white front light that can be seen from 200 feet, a red or amber rear light or reflector that can be seen from 200 feet, and reflectors on the pedals (or reflective material on your feet or ankles). A real rear light is better than a reflector alone, because drivers need to see you in time.'   // §2084 text re-checked 2026-11-23 (last amended 2003); unsourced crash-cause sentence reworded
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
          return h('div', { role: 'img', 'aria-label': signalLabels[kind] || __alloT('stem.bikelab.a11y_rider_seen_from_behind', 'Rider seen from behind') }, armPoseSvg(kind));
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
                  h('span', { className: 'text-emerald-700' }, '✓ ' + correctCount),
                  h('span', { className: 'text-slate-600 mx-1' }, '/'),
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
          { x: 16, kind: 'house', wall: '#fecaca', roof: '#9f1239' }, { x: 44, kind: 'tree' }, { x: 70, kind: 'house', wall: '#bfdbfe', roof: '#1e3a8a' },
          { x: 98, kind: 'tree', big: true, leaf: '#166534' }, { x: 126, kind: 'house', wall: '#fef3c7', roof: '#92400e' }, { x: 156, kind: 'tree' }, { x: 178, kind: 'house', wall: '#ddd6fe', roof: '#5b21b6' },
          { x: 244, kind: 'house', wall: '#bbf7d0', roof: '#166534' }, { x: 268, kind: 'tree', big: true },
          { x: 300, kind: 'tree', leaf: '#166534' }, { x: 322, kind: 'tree', big: true }, { x: 348, kind: 'tree' }, { x: 372, kind: 'tree', leaf: '#166534' },
          { x: 404, kind: 'house', wall: '#fed7aa', roof: '#9a3412' }, { x: 432, kind: 'tree' }, { x: 478, kind: 'tree', leaf: '#3f6212' }, { x: 506, kind: 'tree', big: true, leaf: '#3f6212' },
          { x: 540, kind: 'house', wall: '#bfdbfe', roof: '#1e3a8a' }, { x: 566, kind: 'tree' }, { x: 616, kind: 'school' }
        ];
        var CROSS_STREET_X = 222;       // the cross street sits just past the stop line (the stop window ends at 215 m)
        var CAR_CROSS_SECONDS = 1.6;    // how long the rider waits while the car goes first
        var WET_ENTRY_MAX = 12 / 2.237; // m/s: reach the wet road at 12 mph or less

        var scoreRef = useRef({ stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false, car: 'coming', carT: 0 });
        var hudAtRef = useRef(0);
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
          scoreRef.current = { stopSignObeyed: null, stopSignMinV: null, hillMinSpeed: 999, hillCrawlTime: 0, wetBrakingHard: false, car: 'coming', carT: 0 };
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
          // Stopped at the sign: the car on the cross street goes first, and the rider waits for it.
          var waiting = scoreRef.current;
          if (waiting.car === 'crossing') {
            waiting.carT += dt; velRef.current = 0; prevVelRef.current = 0; timeRef.current += dt;
            if (waiting.carT >= CAR_CROSS_SECONDS) waiting.car = 'gone';
            return;
          }
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
            if (s.car === 'coming' && newV <= 0.3) { s.car = 'crossing'; s.carT = 0; newV = 0; say('Good stop. The car goes first.'); }
          }
          if (t.seg.stopSign && newX >= t.seg.stopSign.windowEnd && s.stopSignObeyed === null) {
            s.stopSignObeyed = (s.stopSignMinV != null && s.stopSignMinV <= 0.3);
            if (s.stopSignObeyed) addToast('✓ Stopped at the stop sign', 'success');
            else { addToast('✗ You ran the stop sign', 'warning'); if (s.car === 'coming') { s.car = 'braked'; say('Close call! The car had to brake hard for you.'); } }
          }
          if (t.seg.hill && newX >= t.seg.hill.start && newX <= t.seg.hill.end) {
            if (newV < s.hillMinSpeed) s.hillMinSpeed = newV;
            if (newV < 2.0) s.hillCrawlTime += dt;
            if (s.hillCrawlTime > 2 && !s.hillHinted) {
              s.hillHinted = true;
              // Would the easiest gear keep this rider above a crawl? If not, the fix is effort, not gear.
              say(steadyClimbSpeed(bike, bikeGearRange(bike).lo, power, 0.07, 70) >= 2.0 ? 'Slow climb. Shift to an easier gear.' : 'Slow climb. This hill needs more pedal effort.');
            }
          }
          if (!s.hillWarned && newX >= 262 && newX < 280) { s.hillWarned = true; if (gear > 0.4) say('Hill ahead. Shift down before it gets steep.'); }
          // The wet road. Braking on it uses nearly all the grip there is, so the safe plan is to slow down first, on the dry road.
          if (!s.wetWarned && newX >= 405 && newX < 450) { s.wetWarned = true; say('Wet road ahead. Slow to 12 mph while it is dry.'); }
          if (s.wetEntryV == null && newX >= 450) {
            s.wetEntryV = newV;
            if (newV > WET_ENTRY_MAX) { s.wetTooFast = true; say('Too fast for a wet road: half the grip here.'); }
            else say('Good speed for the wet road.');
          }
          if (t.seg.wet && newX >= t.seg.wet.start && newX <= t.seg.wet.end && dt > 0) {
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
            var cleanRide = s.stopSignObeyed === true && s.hillCrawlTime <= 5 && !s.wetBrakingHard && !s.wetTooFast;
            var bestT = d.rideBestTime;
            if (cleanRide && (!bestT || timeRef.current < bestT)) upd('rideBestTime', timeRef.current);
            var stars = (s.stopSignObeyed === true ? 1 : 0) + (s.hillCrawlTime <= 5 ? 1 : 0) + ((!s.wetBrakingHard && !s.wetTooFast) ? 1 : 0);
            if (stars > (+d.rideBestStars || 0)) upd('rideBestStars', stars);
          }
        }, [bike, power, gear, braking, d.rideBestTime, d.rideBestStars]);

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
            // The page around the scene updates ten times a second, not sixty: the canvas itself is drawn every frame.
            if (ts - hudAtRef.current > 100) { hudAtRef.current = ts; setHudTick(function(x) { return (x + 1) % 1000; }); }
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
          return function() { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
        }, [running, step]); // eslint-disable-line

        // A short line of coaching on the scene, also sent to the screen-reader live region.
        var say = function(text) {
          var s = scoreRef.current;
          s.note = text; s.noteUntil = timeRef.current + 3.5;
          var live = document.getElementById('allo-live-bikelab');
          if (live) live.textContent = text;
        };

        var draw = function() {
          var cvs = canvasRef.current;
          if (!cvs) return;
          // The drawing is as wide as its frame on small screens, so the rider and the labels stay readable on a phone.
          var size = fitCanvasLogical(cvs, 1000, 380, 0.62);
          var narrow = size.narrow, stillMotion = reducedMotionNow();
          var ctx2d = cvs.getContext('2d');
          if (cvs._dpr) ctx2d.setTransform(cvs._dpr, 0, 0, cvs._dpr, 0, 0);
          var W = size.w, H = size.h;
          var s = scoreRef.current;
          var tNow0 = terrainAt(posRef.current);
          drawSkyBackdrop(ctx2d, W, H * 0.78, posRef.current * 8, tNow0.kind === 'wet' ? 'rain' : 'clear');
          var camX = posRef.current;
          var pxPerMeter = narrow ? 7.5 : 11;
          var centerY = H * 0.75;
          var camY = terrainAt(camX).y * 0.6;       // the camera follows most of the climb
          var w2sX = function(wx) { return W * 0.25 + (wx - camX) * pxPerMeter; };
          var w2sY = function(wy) { return centerY - (wy - camY) * pxPerMeter; };
          var sceneK = narrow ? 0.8 : 1.25;

          // houses, trees and the school stand behind the road
          DECOR.forEach(function(dec) {
            var dx = w2sX(dec.x);
            if (dx < -130 || dx > W + 130) return;
            var gy = w2sY(terrainAt(dec.x).y) - 2;
            if (dec.kind === 'house') drawHouse(ctx2d, dx, gy, sceneK, dec.wall, dec.roof, false);
            else if (dec.kind === 'school') drawHouse(ctx2d, dx, gy, sceneK * 1.15, '#fde68a', '#b45309', true);
            else drawTree(ctx2d, dx, gy, sceneK * (dec.big ? 1.25 : 1), dec.leaf);
          });

          // ground: grass body, then the road drawn along the terrain so wet and dry stretches show where they really are
          var roadPts = [];
          for (var wx = camX - 50; wx <= camX + 140; wx += 2) roadPts.push([wx, w2sX(wx), w2sY(terrainAt(wx).y), terrainAt(wx).kind]);
          var grass = ctx2d.createLinearGradient(0, H * 0.45, 0, H);
          grass.addColorStop(0, '#4d7c0f'); grass.addColorStop(1, '#1a2e05');
          ctx2d.fillStyle = grass; ctx2d.beginPath(); ctx2d.moveTo(roadPts[0][1], H);
          roadPts.forEach(function(p) { ctx2d.lineTo(p[1], p[2]); });
          ctx2d.lineTo(roadPts[roadPts.length - 1][1], H); ctx2d.closePath(); ctx2d.fill();

          // the cross street at the stop sign: it runs away from you on the far side and toward you on the near side
          var crossX = w2sX(CROSS_STREET_X), crossY = w2sY(terrainAt(CROSS_STREET_X).y);
          var crossOn = crossX > -90 && crossX < W + 90;
          if (crossOn) {
            ctx2d.fillStyle = '#3f4a5a';
            ctx2d.beginPath();
            ctx2d.moveTo(crossX - 13 * sceneK, crossY - 60 * sceneK); ctx2d.lineTo(crossX + 13 * sceneK, crossY - 60 * sceneK);
            ctx2d.lineTo(crossX + 34 * sceneK, crossY + 24); ctx2d.lineTo(crossX + 70 * sceneK, H); ctx2d.lineTo(crossX - 70 * sceneK, H); ctx2d.lineTo(crossX - 34 * sceneK, crossY + 24);
            ctx2d.closePath(); ctx2d.fill();
            ctx2d.strokeStyle = '#fbbf24'; ctx2d.lineWidth = 2; ctx2d.setLineDash([8, 8]);
            ctx2d.beginPath(); ctx2d.moveTo(crossX, crossY - 56 * sceneK); ctx2d.lineTo(crossX, crossY - 4); ctx2d.moveTo(crossX, crossY + 28); ctx2d.lineTo(crossX, H); ctx2d.stroke();
            ctx2d.setLineDash([]);
          }

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
          roadStroke(null, '#e2e8f0', 2, 1);            // far edge line
          roadStroke('pavement', '#fbbf24', 2, 12, [14, 12]);
          var tNow = terrainAt(camX);
          if (tNow.kind === 'wet' && !stillMotion) {
            ctx2d.strokeStyle = 'rgba(226,232,240,0.55)'; ctx2d.lineWidth = 1;
            for (var rn = 0; rn < 90; rn++) { var rnx = (rn * 173 + timeRef.current * 240) % W, rny = (rn * 61 + timeRef.current * 420) % (H * 0.8); ctx2d.beginPath(); ctx2d.moveTo(rnx, rny); ctx2d.lineTo(rnx - 4, rny + 12); ctx2d.stroke(); }
          }

          // the car on the cross street. It rolls up as you approach. Stop, and it crosses in front of you. Run the
          // sign, and it has to brake hard at the edge of your road.
          var carU = s.car === 'crossing' ? 0.8 + (s.carT / CAR_CROSS_SECONDS) * 1.0 : s.car === 'braked' ? 0.84 : s.car === 'gone' ? 9 : 0.8 * Math.max(0, Math.min(1, (camX - 150) / 45));
          var drawCar = function() {
            if (!crossOn || carU > 1.8) return;
            var near = Math.max(0, carU - 1);
            var cy = carU <= 1 ? crossY - 60 * sceneK + carU * (60 * sceneK + 16) : crossY + 16 + near * (H - crossY + 30);
            drawCarFront(ctx2d, crossX, cy, (0.4 + 0.6 * Math.min(1, carU) + near * 0.7) * sceneK, '#2563eb', { braking: s.car === 'braked' });
          };
          if (carU < 1) drawCar();

          COURSE_SEGMENTS.forEach(function(seg) {
            if (seg.stopSign) {
              var sx1 = w2sX(seg.stopSign.windowStart);
              var sx2 = w2sX(seg.stopSign.windowEnd);
              if (sx2 < -40 || sx1 > W + 40) return;
              var signX = w2sX(seg.stopSign.at), signY = w2sY(terrainAt(seg.stopSign.at).y);
              ctx2d.strokeStyle = '#ffffff'; ctx2d.lineWidth = 5; ctx2d.beginPath(); ctx2d.moveTo(signX, signY + 1); ctx2d.lineTo(signX, signY + 21); ctx2d.stroke();   // stop line
              drawStopSign(ctx2d, signX + 14, signY - 2, narrow ? 13 : 17);
            }
          });

          var gp = terrainAt(camX);
          var bx = w2sX(camX);
          var by = w2sY(gp.y);
          var bxAhead = w2sX(camX + 0.5);
          var byAhead = w2sY(terrainAt(camX + 0.5).y);
          var bikeAngle = Math.atan2(byAhead - by, bxAhead - bx);
          ctx2d.save();
          ctx2d.translate(bx, by + 11);    // riding in the middle of the lane
          ctx2d.rotate(bikeAngle);
          var ridePedal = stillMotion ? 0.6 : (braking ? 0.6 : posRef.current / (2 * Math.PI * bike.wheelR * gearRatioFor(bike, gear)) * 2 * Math.PI);
          drawBikeFigure(ctx2d, 0, 0, { scale: narrow ? 1.15 : 1.6, wheelRot: stillMotion ? 0 : posRef.current / bike.wheelR, pedal: ridePedal, braking: braking });
          ctx2d.restore();
          if (carU >= 1) drawCar();

          // a low fence on the near side: close things rush past, which is what gives the feeling of speed
          ctx2d.strokeStyle = '#e7e5e4'; ctx2d.lineWidth = 2;
          var railOpen = false;
          ctx2d.beginPath();
          for (var fx = Math.floor((camX - 40) / 6) * 6; fx <= camX + 140; fx += 6) {
            if (Math.abs(fx - CROSS_STREET_X) < 9) { railOpen = false; continue; }   // the fence stops for the cross street
            var fpx = w2sX(fx), fpy = w2sY(terrainAt(fx).y) + 30;
            ctx2d.moveTo(fpx, fpy); ctx2d.lineTo(fpx, fpy + 13);
            if (railOpen) { ctx2d.moveTo(w2sX(fx - 6), w2sY(terrainAt(fx - 6).y) + 34); ctx2d.lineTo(fpx, fpy + 4); }
            railOpen = true;
          }
          ctx2d.stroke();

          ctx2d.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx2d.fillRect(0, 0, W, 28);
          var pct = Math.min(1, posRef.current / COURSE_LENGTH);
          ctx2d.fillStyle = '#15803d';
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
            ctx2d.fillStyle = 'rgba(194, 65, 12, 0.95)';
            ctx2d.fillRect(W - 286, 36, 222, 30);                                   // left of the fullscreen button
            ctx2d.fillStyle = '#fff';
            ctx2d.font = 'bold 13px sans-serif';
            ctx2d.fillText(nextEventLabel + ' in ' + nextEventDist.toFixed(0) + ' m', W - 276, 56);
          }
          // coaching line (also in the live region)
          if (s.note && timeRef.current < s.noteUntil) {
            ctx2d.font = 'bold 14px sans-serif';
            var nw = Math.min(W - 12, ctx2d.measureText(s.note).width + 24);
            ctx2d.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx2d.fillRect((W - nw) / 2, 72, nw, 28);
            ctx2d.fillStyle = '#fde68a';
            ctx2d.textAlign = 'center'; ctx2d.fillText(s.note, W / 2, 91, W - 24); ctx2d.textAlign = 'start';
          }
        };

        useEffect(function() { draw(); }, [hudTick, bikeId, running, finished]); // eslint-disable-line
        useEffect(function() {
          var onResize = function() { setHudTick(function(x) { return (x + 1) % 1000; }); };
          window.addEventListener('resize', onResize);
          return function() { window.removeEventListener('resize', onResize); };
        }, []);

        var advice = [];
        if (scoreRef.current.stopSignObeyed === false) advice.push('Brake earlier and come to a full stop at the sign. A rolling stop does not count.');
        if (scoreRef.current.hillCrawlTime > 5) advice.push(steadyClimbSpeed(bike, bikeGearRange(bike).lo, power, 0.07, 70) >= 2.0
          ? 'Shift to an easier gear before the climb. In a hard gear your legs could not keep the pedals turning, so you slowed to a crawl.'
          : 'At ' + power + ' W this bike crawls up Oak Hill even in its easiest gear. Raise the pedal effort for the climb, and use the easiest gear.');
        if (scoreRef.current.wetTooFast) advice.push('You reached the wet road at ' + ((scoreRef.current.wetEntryV || 0) * 2.237).toFixed(0) + ' mph. Brake on the dry road just before it, and roll onto the wet part at 12 mph or less.');
        if (scoreRef.current.wetBrakingHard) advice.push('Wet pavement has half the grip of dry. Do your braking before the wet part, not on it.');
        if (advice.length === 0 && finished) advice.push('Clean ride! Full stop, steady climb, slow and gentle in the wet.');
        else if (finished) advice.push('Best times are saved for clean rides only.');
        // `bestTime &&` guards null but not type: a string is truthy and has no
        // toFixed, which is exactly how this crashed.
        var bestTime = (typeof d.rideBestTime === 'number' && isFinite(d.rideBestTime))
          ? d.rideBestTime : null;

        var wetOk = !scoreRef.current.wetBrakingHard && !scoreRef.current.wetTooFast;
        var starsNow = (scoreRef.current.stopSignObeyed === true ? 1 : 0) + (scoreRef.current.hillCrawlTime <= 5 ? 1 : 0) + (wetOk ? 1 : 0);
        var bestStars = Math.max(0, Math.min(3, Math.round(+d.rideBestStars || 0)));
        var starText = function(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); };
        var rideGearWord = gear <= 0.4 ? 'Easy' : gear >= 0.8 ? 'Hard' : 'Middle';

        return h('div', { className: 'flex flex-col h-full bg-slate-50', 'data-bikelab-ride-root': 'true', tabIndex: -1 }, // tabIndex -1: a click on the canvas keeps focus (and Space-to-brake) in the ride
          BackBar({ icon: '🏘️', title: t('stem.bikelab.neighborhood_ride_2', 'Neighborhood Ride') }),
          h('div', { className: 'p-3 max-w-5xl mx-auto w-full space-y-3' },
            h('div', { id: 'bikelab-neighborhood-fs', className: 'bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800', style: { position: 'relative' } },
              h('p', { id: 'bikelab-neighborhood-description', className: 'sr-only', 'data-bikelab-ride-progress': Math.round(posRef.current), 'data-bikelab-ride-speed': (velRef.current * 2.237).toFixed(1), 'data-bikelab-ride-car': scoreRef.current.car },
                'You have ridden ' + Math.round(posRef.current) + ' of ' + COURSE_LENGTH + ' meters at ' + (velRef.current * 2.237).toFixed(1) + ' miles per hour. ' + (posRef.current < 205 ? 'A stop sign is ' + Math.round(205 - posRef.current) + ' meters ahead.' : posRef.current < 280 ? 'Oak Hill starts in ' + Math.round(280 - posRef.current) + ' meters.' : posRef.current < 380 ? 'You are climbing Oak Hill.' : posRef.current < 450 ? 'You are going downhill. A wet stretch is ' + Math.round(450 - posRef.current) + ' meters ahead.' : posRef.current < 520 ? 'The road is wet.' : 'The school is just ahead.')),
              h('canvas', { ref: canvasRef, width: 1000, height: 380, 'aria-describedby': 'bikelab-neighborhood-description', className: 'bikelab-fit-canvas w-full block', role: 'img', 'aria-label': t('stem.bikelab.neighborhood_ride_canvas_v2', 'Neighborhood ride: a rider on a street with a stop sign and a cross street, a hill and a wet stretch on the way to school. Use the gear and brake buttons below, or the arrow keys and Space.') }),
              // Fullscreen toggle for the neighborhood ride
              h('button', {
                'aria-label': t('stem.bikelab.toggle_fullscreen_for_the_neighborhood', 'Toggle fullscreen for the neighborhood ride'),
                title: t('stem.bikelab.fullscreen_2', 'Fullscreen'), className: 'bikelab-fs-btn',
                onClick: function() {
                  var el = document.getElementById('bikelab-neighborhood-fs');
                  if (!el) return;
                  var inFull = document.fullscreenElement === el || document.webkitFullscreenElement === el || document.mozFullScreenElement === el;
                  if (inFull) { var ex = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen; if (ex) ex.call(document); }
                  else { if (window.__alloStemFS) window.__alloStemFS(el); }
                },
                style: {
                  position: 'absolute', top: 34, right: 8, zIndex: 10,
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  border: '2px solid #e2e8f0', color: '#f8fafc',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }
              }, '⛶')
            ),
            // Ride pad: everything a rider needs while moving sits right under the scene, in thumb reach on a phone
            h('div', { className: 'bikelab-ride-pad', 'data-bikelab-ride-pad': 'true' },
              h('button', {
                'aria-label': t('stem.bikelab.shift_to_a_lower_gear_easier_pedaling_', 'Shift to a lower gear (easier pedaling, less top speed)'),
                onClick: function() { setGear(function(g) { return Math.max(0.2, +(g - 0.1).toFixed(2)); }); },
                className: 'rounded-xl font-bold bg-violet-100 hover:bg-violet-200 text-violet-800 text-sm shadow-sm transition-colors px-2'
              }, t('stem.bikelab.easier_gear_v2', '↓ Easier gear')),
              h('button', {
                'aria-label': braking ? __alloT('stem.bikelab.a11y_brake_engaged_release_space_to_stop_braking', 'Brake engaged. Release Space to stop braking.') : __alloT('stem.bikelab.a11y_brake_hold_space_or_click_to_brake', 'Brake. Hold Space or click to brake.'),
                'aria-pressed': braking, 'data-bikelab-brake': 'true',
                onMouseDown: function() { setBraking(true); },
                onMouseUp: function() { setBraking(false); },
                onMouseLeave: function() { setBraking(false); },
                onTouchStart: function() { setBraking(true); },
                onTouchEnd: function() { setBraking(false); },
                onTouchCancel: function() { setBraking(false); },
                onContextMenu: function(e) { e.preventDefault(); },   // a long press is a brake, not a menu
                onKeyDown: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!braking) setBraking(true); } },
                onKeyUp: function(e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setBraking(false); } },
                onBlur: function() { setBraking(false); },
                style: { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', background: braking ? '#881337' : '#be123c', color: '#ffffff' },
                className: 'rounded-xl font-black transition-colors shadow px-2'
              }, braking ? '🛑 BRAKING' : '🛑 Hold to brake'),
              h('button', {
                'aria-label': t('stem.bikelab.shift_to_a_higher_gear_more_top_speed_', 'Shift to a higher gear (more top speed, harder pedaling)'),
                onClick: function() { setGear(function(g) { return Math.min(1.0, +(g + 0.1).toFixed(2)); }); },
                className: 'rounded-xl font-bold bg-violet-100 hover:bg-violet-200 text-violet-800 text-sm shadow-sm transition-colors px-2'
              }, t('stem.bikelab.harder_gear_v2', '↑ Harder gear'))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              !finished && h('button', {
                onClick: function() { setRunning(!running); }, 'data-bikelab-ride-start': 'true',
                className: 'flex-1 py-2.5 px-4 rounded-lg font-bold transition-colors shadow ' + (running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white')
              }, running ? '⏸ Pause' : (posRef.current > 0 && posRef.current < COURSE_LENGTH ? '▶ Resume' : '▶ Start Ride')),
              finished && h('button', {
                onClick: function() { reset(); setRunning(true); }, 'data-bikelab-ride-start': 'true',
                className: 'flex-1 py-2.5 px-4 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow'
              }, t('stem.bikelab.ride_again', '↻ Ride Again')),
              h('button', {
                onClick: function() { setRunning(false); reset(); },
                className: 'py-2 px-4 rounded-lg font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm transition-colors'
              }, t('stem.bikelab.reset_2', '↺ Reset')),
              h('div', { className: 'text-sm font-bold text-slate-700', 'data-bikelab-ride-status': 'true' },
                'Gear: ' + rideGearWord + ' · ' + gearRatioFor(bike, gear).toFixed(2) + ' : 1',
                (bestStars > 0 || bestTime) ? ' · Best: ' + (bestStars > 0 ? starText(bestStars) : '') + (bestTime ? ' ' + bestTime.toFixed(1) + 's' : '') : '')
            ),
            finished && h('div', { className: 'bg-gradient-to-br from-emerald-700 to-teal-700 rounded-xl shadow-lg text-white p-5', 'data-bikelab-ride-finish': starsNow, role: 'status' },
              h('div', { className: 'flex items-center gap-3 mb-3' },
                h('span', { className: 'text-5xl', 'aria-hidden': 'true' }, '🏫'),
                h('div', null,
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider' }, t('stem.bikelab.you_made_it_to_school', 'You made it to school')),
                  h('div', { className: 'text-3xl font-black', 'aria-label': starsNow + ' of 3 stars' }, starText(starsNow)),
                  h('div', { className: 'text-sm font-bold font-mono' }, timeRef.current.toFixed(1) + 's' + (starsNow === 3 ? '' : ' · times only count on a 3-star ride')),
                  bestTime === timeRef.current && h('div', { className: 'text-xs font-bold' }, t('stem.bikelab.new_personal_best', '🏆 New personal best!'))
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase' }, t('stem.bikelab.stop_sign_2', 'Stop Sign')),
                  h('div', { className: 'text-xl' }, scoreRef.current.stopSignObeyed ? '★' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase' }, t('stem.bikelab.hill_climb_v2', 'Hill Climb')),
                  h('div', { className: 'text-xl' }, scoreRef.current.hillCrawlTime <= 5 ? '★' : '✗')
                ),
                h('div', { className: 'bg-white/15 rounded-lg p-2 text-center' },
                  h('div', { className: 'text-xs uppercase' }, t('stem.bikelab.wet_section', 'Wet Section')),
                  h('div', { className: 'text-xl' }, wetOk ? '★' : '✗')
                )
              ),
              advice.length > 0 && h('div', { className: 'bg-white/20 rounded-lg p-3 text-sm' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1' }, t('stem.bikelab.coach', 'Coach')),
                advice.map(function(a, i) { return h('div', { key: i, className: 'leading-relaxed' }, '• ' + a); })
              )
            ),
            h('div', { className: 'bg-white rounded-xl shadow border border-slate-400 p-3' },
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
                h('div', null,
                  h('label', { htmlFor: 'bikelab-ride-gear', className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                    h('span', null, t('stem.bikelab.gear', 'Gear (↑/↓)')), h('span', { className: 'text-violet-700' }, rideGearWord + ' · ' + gearRatioFor(bike, gear).toFixed(2) + ' : 1')),
                  h('input', { id: 'bikelab-ride-gear', type: 'range', min: 0.2, max: 1.0, step: 0.05, value: gear,
                    onChange: function(e) { setGear(parseFloat(e.target.value)); },
                    className: 'w-full accent-violet-500', style: { minHeight: 44 },
                    'aria-label': t('stem.bikelab.neighborhood_ride_gear_ratio', 'Neighborhood ride gear ratio') })),
                h('div', null,
                  h('label', { htmlFor: 'bikelab-ride-power', className: 'text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between' },
                    h('span', null, t('stem.bikelab.pedal_effort_v2', 'Pedal effort')), h('span', { className: 'text-cyan-700' }, power + ' W')),
                  h('input', { id: 'bikelab-ride-power', type: 'range', min: 0, max: 400, value: power,
                    // NaN-guard: parseInt('') returns NaN; clamp to 0 so an empty
                    // keyboard-edited slider value can't poison physics.
                    onChange: function(e) { var v = parseInt(e.target.value, 10); setPower(isFinite(v) ? v : 0); },
                    className: 'w-full accent-cyan-500', style: { minHeight: 44 },
                    'aria-label': t('stem.bikelab.neighborhood_ride_pedal_power_watts', 'Neighborhood ride pedal power in watts') }))
              ),
              h('details', { 'data-bikelab-ride-more': 'true', className: 'mt-2 border-t border-slate-200 pt-1' },
                h('summary', { className: 'bikelab-disclosure cursor-pointer text-sm font-bold text-indigo-800 py-3' }, 'Change the bike'),
                h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-1' },
                  BIKES.map(function(b) {
                    return h('button', {
                      key: b.id, 'aria-pressed': bikeId === b.id ? 'true' : 'false',
                      onClick: function() { setBikeId(b.id); upd('rideBikeId', b.id); },
                      className: 'flex items-center gap-1 px-1.5 py-1 rounded border text-xs transition-colors ' + (bikeId === b.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300')
                    }, h('span', { 'aria-hidden': 'true' }, b.icon), h('span', { className: 'truncate' }, b.name.split(' ')[0]));
                  })
                ),
                h('p', { className: 'text-xs text-slate-600 mt-2' }, 'Changing the bike starts the ride again.')
              )
            ),
            h('div', { className: 'bg-slate-100 rounded-xl p-3 text-xs text-slate-700 leading-relaxed border border-slate-400' },
              h('span', { className: 'font-bold text-slate-800' }, t('stem.bikelab.course', '🧭 Course: ')),
              t('stem.bikelab.ride_course_v2', 'Ride 600 m to school and earn 3 stars. ★ Stop fully at the stop sign and let the car go first. ★ Shift to an easy gear for Oak Hill so you never crawl. ★ Slow to 12 mph before the wet road, so you do not need to brake on it. Keys: ↑ and ↓ change gear, hold Space to brake.')
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // SUB-VIEW: BIKE PARTS INSPECTOR
      // ─────────────────────────────────────────────────────
      function PartsInspector() {
        // PART_SHAPES and partArea (the hotspot shapes) live at module scope: the repair work stand rings the same shapes.
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
            issues: 'Chain slap wears the paint. Check for cracks near the dropouts after a crash.' },   // "use a threadless hanger" had no source (2026-11-23)
          { id: 'seatstay',   name: t('stem.bikelab.seatstay', 'Seatstay'),        cat: 'Frame', hx: 300, hy: 130, hw: 110, hh: 16,
            fn: 'Tubes from seat tube top to rear axle. Form the rear triangle with chainstay and seat tube.',
            issues: 'Carbon seatstays can crack at the dropout on impact. Check the brake mounts are tight.' },   // "rim brakes wear a groove in the bosses" had no source (2026-11-23)
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
            issues: 'Worn cassettes cause skipping under load. Replacing a worn chain on time makes the cassette last longer.',   // Park Tool: a chain past its wear limit "will prematurely wear out your cogs"; "every ~2 chain changes" had no source
            repairJob: 'chain_clean' },
          { id: 'chain',      name: t('stem.bikelab.chain', 'Chain'),           cat: 'Drivetrain', hx: 315, hy: 230, hw: 100, hh: 20,
            // Corrected 2026-11-23 to Park Tool "When to Replace a Chain": replace at 0.5% wear (11 speeds or more) or 0.75% (10 or fewer).
            // The "~1500 miles" and "every 150 miles" figures had no source; Park gives no mileage.
            fn: 'Roller chain that transfers power from chainring to cassette. As it wears, it gets a little longer. Replace it at about 0.5% wear (11 or more gears at the back) or 0.75% (10 or fewer).',
            issues: 'Use a chain-wear gauge. Clean and lube it often, and after wet rides.',
            repairJob: 'chain_clean' },
          { id: 'rd',         name: t('stem.bikelab.rear_derailleur', 'Rear Derailleur'), cat: 'Drivetrain', hx: 408, hy: 265, hw: 28, hh: 28,
            fn: 'Spring-loaded parallelogram that guides the chain between cassette cogs and maintains chain tension.',
            issues: 'Sluggish shifting = cable tension off. Bent hanger = shift is impossible to tune — replace the hanger.',
            repairJob: 'derailleur_index' },
          { id: 'shifter',    name: t('stem.bikelab.shifter', 'Shifter'),         cat: 'Drivetrain', hx: 128, hy: 78, hw: 26, hh: 20,
            fn: 'Handlebar-mounted lever that pulls (or releases) cable to move the derailleur. Each click = one cog.',
            issues: 'Grit in the ratchet causes missed shifts. Replace a cable that is frayed, rusty or sticky.' },   // "every 2 years" had no source (2026-11-23)
          { id: 'handlebar',  name: t('stem.bikelab.handlebar_2', 'Handlebar'),       cat: 'Cockpit', hx: 80, hy: 82, hw: 80, hh: 16,
            fn: 'Provides steering input and mounting for shifters, brake levers, and lights. Shapes: flat (MTB/hybrid), drop (road), riser.',
            issues: 'Aluminum bars can wear out from years of flexing. Replace a bar after a crash. Carbon can crack where you cannot see it.' },   // "5-10 years" had no source (2026-11-23)
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
        // 'lost' = the context died after start; Restart bumps glGen to rebuild on a fresh canvas.
        var glGenState = useState(0), glGen = glGenState[0], setGlGen = glGenState[1];
        var glRestartRef = useRef(null);
        useEffect(function() { if (threeStatus === 'lost' && glRestartRef.current) glRestartRef.current.focus({ preventScroll: true }); }, [threeStatus]);
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
            var isHC3d = !!(isContrast || (typeof document !== 'undefined' && ((document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('theme-contrast')) || (document.body && document.body.classList && document.body.classList.contains('theme-contrast')))));
            var isReduced3d = (function() {
              try { return !!(_prefersReducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)); }
              catch (e) { return !!_prefersReducedMotion; }
            })();
            var hasShaderMat3d = typeof THREE.ShaderMaterial === 'function';
            var windUniforms = {
              uTime: { value: 2.1 },
              uSpeed: { value: 1.0 },
              uDrag: { value: 0.46 },
              uHC: { value: isHC3d ? 1.0 : 0.0 }
            };
            // Studio 3-point lighting rig for crisp brushed alloy & anodized frame speculars
            scene.add(new THREE.HemisphereLight(0xf0f9ff, 0x64748b, 1.05));
            var sun = new THREE.DirectionalLight(0xfff4e0, 1.25); sun.position.set(8, 15, 11); scene.add(sun);
            var rimL = new THREE.DirectionalLight(0x7dd3fc, 0.85); rimL.position.set(-10, 9, -9); scene.add(rimL);

            // Animated rolling-road tarmac perspective-stripe advection deck (WebGL1/GLSL ES 1.00)
            var groundMat;
            if (!isHC3d && hasShaderMat3d) {
              groundMat = new THREE.ShaderMaterial({
                uniforms: {
                  uTime: windUniforms.uTime,
                  uSpeed: windUniforms.uSpeed
                },
                vertexShader: [
                  'varying vec2 vUv;',
                  'varying vec3 vWorldPos;',
                  'void main() {',
                  '  vUv = uv;',
                  '  vec4 wp = modelMatrix * vec4(position, 1.0);',
                  '  vWorldPos = wp.xyz;',
                  '  gl_Position = projectionMatrix * viewMatrix * wp;',
                  '}'
                ].join('\n'),
                fragmentShader: [
                  'uniform float uTime;',
                  'uniform float uSpeed;',
                  'varying vec2 vUv;',
                  'varying vec3 vWorldPos;',
                  'float bkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
                  'void main() {',
                  '  vec2 d = (vUv - 0.5) * 2.0;',
                  '  float r = length(d);',
                  '  if (r > 1.0) discard;',
                  '  float advX = vWorldPos.x + uTime * (4.6 * uSpeed);',
                  '  float grain = bkHash(floor(vec2(advX * 7.5, vWorldPos.z * 7.5))) * 0.055;',
                  '  vec3 tarmac = vec3(0.11, 0.15, 0.21) + vec3(grain);',
                  '  // Perspective rolling-road lane stripes & wind-tunnel calibration grid',
                  '  float centerLane = exp(-pow(vWorldPos.z * 7.5, 2.0)) * smoothstep(0.15, 0.35, sin(advX * 2.1));',
                  '  float sideRails = exp(-pow((abs(vWorldPos.z) - 2.95) * 9.0, 2.0));',
                  '  float crossTicks = smoothstep(0.94, 0.99, abs(cos(advX * 1.65))) * smoothstep(4.2, 0.5, abs(vWorldPos.z));',
                  '  vec3 col = tarmac;',
                  '  col = mix(col, vec3(0.95, 0.78, 0.24), centerLane * 0.78);',
                  '  col = mix(col, vec3(0.24, 0.78, 0.96), (sideRails * 0.65 + crossTicks * 0.28));',
                  '  // Soft tire contact shadows beneath rear (-4.3) and front (+6.0) axles',
                  '  float shRear = exp(-pow((vWorldPos.x + 4.3) * 0.65, 2.0) - pow(vWorldPos.z * 1.4, 2.0));',
                  '  float shFront = exp(-pow((vWorldPos.x - 6.0) * 0.65, 2.0) - pow(vWorldPos.z * 1.4, 2.0));',
                  '  col *= (1.0 - clamp((shRear + shFront) * 0.52, 0.0, 0.6));',
                  '  float rimGlow = exp(-pow((r - 0.97) * 26.0, 2.0));',
                  '  col += vec3(0.22, 0.74, 0.97) * rimGlow * 0.45;',
                  '  float alpha = smoothstep(1.0, 0.92, r);',
                  '  gl_FragColor = vec4(col, alpha);',
                  '}'
                ].join('\n'),
                transparent: true
              });
            } else {
              groundMat = new THREE.MeshStandardMaterial({ color: 0xdbe5f0, roughness: 0.55, metalness: 0.12 });
            }
            var ground = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), groundMat);
            ground.rotation.x = -Math.PI / 2; ground.position.set(0.85, -0.03, 0); scene.add(ground);
            var stageRing = new THREE.Mesh(new THREE.TorusGeometry(9.3, 0.06, 8, 64), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.75, emissive: 0x0284c7, emissiveIntensity: 0.3 }));
            stageRing.rotation.x = Math.PI / 2; stageRing.position.set(0.85, -0.01, 0); scene.add(stageRing);

            var bike = buildBike3D(THREE, windUniforms, isHC3d); scene.add(bike.group);

            // Laminar-to-turbulent wind-tunnel drag slipstream ribbons + glowing force-vector plasma sleeves
            if (!isHC3d && hasShaderMat3d) {
              var ribbonGeo = new THREE.PlaneGeometry(17.0, 0.36, 44, 3);
              var ribbonSpecs = [
                { y: 9.2, z: 0.0, lift: 1.45, phase: 0.0 },
                { y: 7.4, z: 1.15, lift: 1.15, phase: 1.3 },
                { y: 7.4, z: -1.15, lift: 1.15, phase: 2.5 },
                { y: 5.0, z: 1.45, lift: 0.75, phase: 3.7 },
                { y: 4.8, z: -1.45, lift: 0.75, phase: 4.9 }
              ];
              ribbonSpecs.forEach(function(rs) {
                var rMat = new THREE.ShaderMaterial({
                  uniforms: {
                    uTime: windUniforms.uTime,
                    uSpeed: windUniforms.uSpeed,
                    uDrag: windUniforms.uDrag,
                    uLift: { value: rs.lift },
                    uPhase: { value: rs.phase }
                  },
                  vertexShader: [
                    'uniform float uTime;',
                    'uniform float uSpeed;',
                    'uniform float uDrag;',
                    'uniform float uLift;',
                    'uniform float uPhase;',
                    'varying vec2 vUv;',
                    'varying float vWake;',
                    'void main() {',
                    '  vUv = uv;',
                    '  vec3 pos = position;',
                    '  // Streamline curves smoothly over the bicycle silhouette',
                    '  float deflect = exp(-pow((pos.x - 1.6) * 0.25, 2.0)) * uLift;',
                    '  // Downstream laminar-to-turbulent vortex wake oscillation behind x < -0.6',
                    '  float wake = smoothstep(0.5, -5.5, pos.x);',
                    '  float freq = 1.35 + uDrag * 1.1;',
                    '  float turbY = sin(pos.x * freq + uTime * (4.2 * uSpeed) + uPhase) * (0.32 + uDrag * 0.45) * wake;',
                    '  float turbZ = cos(pos.x * (freq * 0.85) + uTime * (3.6 * uSpeed) + uPhase * 1.4) * (0.28 + uDrag * 0.36) * wake;',
                    '  pos.y += deflect + turbY;',
                    '  pos.z += turbZ;',
                    '  vWake = wake;',
                    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
                    '}'
                  ].join('\n'),
                  fragmentShader: [
                    'uniform float uTime;',
                    'uniform float uSpeed;',
                    'uniform float uDrag;',
                    'uniform float uPhase;',
                    'varying vec2 vUv;',
                    'varying float vWake;',
                    'void main() {',
                    '  float flow = fract(vUv.x * 3.5 + uTime * (0.62 * uSpeed) + uPhase * 0.17);',
                    '  float packet = smoothstep(0.0, 0.22, flow) * smoothstep(1.0, 0.58, flow);',
                    '  float coreY = exp(-pow((vUv.y - 0.5) * 4.8, 2.0));',
                    '  float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);',
                    '  vec3 laminarCol = vec3(0.20, 0.86, 1.0);',
                    '  vec3 turbulentCol = vec3(0.98, 0.36, 0.28);',
                    '  vec3 col = mix(laminarCol, turbulentCol, clamp(vWake * (0.55 + uDrag * 0.85), 0.0, 1.0));',
                    '  float alpha = clamp((0.22 + packet * 0.78) * coreY * ends * 0.58, 0.0, 0.72);',
                    '  if (alpha < 0.015) discard;',
                    '  gl_FragColor = vec4(col, alpha);',
                    '}'
                  ].join('\n'),
                  transparent: true,
                  depthWrite: false,
                  side: THREE.DoubleSide,
                  blending: THREE.AdditiveBlending || THREE.NormalBlending
                });
                var rMesh = new THREE.Mesh(ribbonGeo, rMat);
                rMesh.position.set(0.5, rs.y, rs.z);
                rMesh.renderOrder = 3;
                scene.add(rMesh);
              });

              // Glowing force-vector plasma sleeves (forward drive thrust & opposing aerodynamic drag)
              var makeForceSleeve = function(x, y, z, dirX, colHex) {
                var sleeveGroup = new THREE.Group();
                var fMat = new THREE.ShaderMaterial({
                  uniforms: {
                    uTime: windUniforms.uTime,
                    uCol: { value: new THREE.Color(colHex) }
                  },
                  vertexShader: [
                    'varying vec2 vUv;',
                    'varying vec3 vNorm;',
                    'varying vec3 vView;',
                    'void main() {',
                    '  vUv = uv;',
                    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
                    '  vNorm = normalize(mat3(modelMatrix) * normal);',
                    '  vView = normalize(cameraPosition - wp.xyz);',
                    '  gl_Position = projectionMatrix * viewMatrix * wp;',
                    '}'
                  ].join('\n'),
                  fragmentShader: [
                    'uniform float uTime;',
                    'uniform vec3 uCol;',
                    'varying vec2 vUv;',
                    'varying vec3 vNorm;',
                    'varying vec3 vView;',
                    'void main() {',
                    '  float fres = pow(1.0 - clamp(abs(dot(normalize(vNorm), normalize(vView))), 0.0, 1.0), 1.8);',
                    '  float pulse = 0.55 + 0.45 * sin(vUv.y * 16.0 - uTime * 5.2);',
                    '  vec3 col = mix(uCol, vec3(0.98, 0.99, 1.0), fres * 0.55 + pulse * 0.20);',
                    '  float alpha = clamp((0.36 + fres * 0.54) * (0.72 + pulse * 0.28), 0.0, 0.85);',
                    '  gl_FragColor = vec4(col, alpha);',
                    '}'
                  ].join('\n'),
                  transparent: true,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending || THREE.NormalBlending
                });
                var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.2, 14, 1, true), fMat);
                shaft.rotation.z = dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
                sleeveGroup.add(shaft);
                var head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.68, 14), fMat);
                head.rotation.z = dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
                head.position.x = dirX * 1.42;
                sleeveGroup.add(head);
                sleeveGroup.position.set(x, y, z);
                sleeveGroup.renderOrder = 4;
                scene.add(sleeveGroup);
              };
              makeForceSleeve(9.0, 3.4, 0, 1, 0x22d3ee);   // Forward drive thrust plasma vector
              makeForceSleeve(-7.6, 6.2, 0, -1, 0xfb7185); // Aerodynamic drag wake plasma vector
            }

            var target = new THREE.Vector3(0.85, 4.7, 0), ray = new THREE.Raycaster();
            var S = { az: 0.55, el: 0.22, dist: 27, raf: 0, liveLoop: !isReduced3d && !isHC3d };
            var aim = function() {
              camera.position.set(target.x + S.dist * Math.sin(S.az) * Math.cos(S.el), target.y + S.dist * Math.sin(S.el), target.z + S.dist * Math.cos(S.az) * Math.cos(S.el));
              camera.lookAt(target); camera.updateMatrixWorld();
            };
            var draw = function(now) {
              S.raf = 0;
              if (dead) return;
              if (S.liveLoop && typeof now === 'number') {
                windUniforms.uTime.value = (now * 0.001) % 1000.0;
              }
              aim();
              renderer.render(scene, camera);
              if (S.liveLoop && (typeof document === 'undefined' || !document.hidden)) {
                S.raf = requestAnimationFrame(draw);
              }
            };
            var request = function() { if (!S.raf) S.raf = requestAnimationFrame(draw); };
            var onVis3d = function() {
              if (typeof document !== 'undefined' && document.hidden) {
                if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
              } else if (S.liveLoop) {
                request();
              }
            };
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis3d);
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
            // A lost context (GPU reset, low memory) left a black box: stop, run the
            // cleanup below once, and show the paused panel.
            canvas.addEventListener('webglcontextlost', function(ev) {
              if (!canvas.isConnected) return;
              ev.preventDefault();
              if (canvas._bikelabTearingDown || dead) return;
              if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
              setTimeout(function() {
                if (dead) return;
                var c = cleanup; cleanup = null; sceneRef.current = null;
                if (c) c();
                setThreeStatus('lost');
              }, 0);
            });
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
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis3d);
              if (ro) ro.disconnect();
              canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
              canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('pointerleave', onLeave);
              scene.traverse(function(o) {
                if (o.geometry && typeof o.geometry.dispose === 'function') o.geometry.dispose();
                if (o.material) {
                  var ms = Array.isArray(o.material) ? o.material : [o.material];
                  ms.forEach(function(m) {
                    if (!m) return;
                    ['map', 'roughnessMap', 'metalnessMap', 'normalMap', 'emissiveMap'].forEach(function(slot) {
                      if (m[slot] && typeof m[slot].dispose === 'function') m[slot].dispose();
                    });
                    if (typeof m.dispose === 'function') m.dispose();
                  });
                }
              });
              canvas._bikelabTearingDown = true; // our own loss must not raise the paused panel
              renderer.dispose(); try { var gl = renderer.getContext(); if (!gl.isContextLost()) renderer.forceContextLoss(); } catch (e) {}
              if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            };
            setThreeStatus('ready');
          }).catch(function() { if (!dead) setThreeStatus('error'); });
          return function() { dead = true; if (cleanup) cleanup(); sceneRef.current = null; };
        }, [view3d, glGen]);
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
                  h('div', { role: 'group', 'aria-label': __alloT('stem.bikelab.diagramOr3d', 'Diagram or 3D model'), className: 'flex gap-1' },
                    [[false, 'Diagram'], [true, '3D model']].map(function(opt) {
                      return h('button', { key: String(opt[0]), type: 'button', 'data-bikelab-parts-view': opt[0] ? '3d' : '2d', 'aria-pressed': view3d === opt[0] ? 'true' : 'false',
                        onClick: function() { setView3d(opt[0]); },
                        className: 'px-3 py-2 rounded-lg border-2 text-sm font-bold ' + (view3d === opt[0] ? 'border-indigo-700 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500') }, opt[1]);
                    })
                  )
                ),
                h('svg', { role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_bicycle_parts_diagram_selected_part_use_the_parts_by', 'Bicycle parts diagram. Selected part: {name}. Use the Parts by category buttons to select a part.'), { name: selected.name }), viewBox: '0 0 500 300', className: 'w-full h-auto', style: { maxHeight: '420px', display: view3d ? 'none' : 'block' } },
                 // Mirrored, so the bike faces right and the chain is on its right-hand side, as on a real bike.
                 // A pale ground under the drawing, as on the work stand: on the black contrast theme the tires, saddle and bars vanished.
                 h('rect', { x: 0, y: 0, width: 500, height: 300, rx: 14, fill: '#f8fafc', 'data-bikelab-parts-ground': 'true' }),
                 h('g', { transform: 'matrix(-1 0 0 1 500 0)' },
                  bikeDiagramArt(),
                  selected && partShape(selected, { key: 'sel', fill: 'none', stroke: '#b45309', strokeWidth: 4, 'aria-hidden': 'true', style: { pointerEvents: 'none' } }, true),
                  BIKE_PARTS.slice().sort(function(a, b) { return partArea(b) - partArea(a); }).map(function(p) {
                    return partShape(p, { key: p.id, 'data-bikelab-part': p.id, style: { cursor: 'pointer' },
                      onClick: function() { setSelectedId(p.id); upd('partsLastId', p.id); } }, false, h('title', null, p.name));
                  })
                 )
                ),
                view3d && h('div', { 'data-bikelab-3d': threeStatus },
                  h('div', { ref: mountRef, role: 'img', 'aria-label': __alloAriaFill(__alloT('stem.bikelab.a11y_3d_model_of_a_bicycle_selected_part_use_the', '3D model of a bicycle. Selected part: {name}. Use the Parts by category buttons to select a part, and the buttons under the model to turn it.'), { name: selected.name }), className: 'relative w-full rounded-lg overflow-hidden', style: { background: 'linear-gradient(#f8fafc, #e2e8f0)', minHeight: '160px' } },
                    h('div', { ref: hoverRef, 'aria-hidden': 'true', className: 'absolute top-2 left-2 px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold', style: { display: 'none', pointerEvents: 'none', zIndex: 2 } })
                  ),
                  threeStatus === 'loading' && h('p', { role: 'status', className: 'text-sm text-slate-700 mt-2' }, 'Loading the 3D model…'),
                  threeStatus === 'error' && h('div', { role: 'alert', className: 'text-sm text-slate-800 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-300' },
                    'The 3D model could not start on this device. The diagram shows the same parts. ',
                    h('button', { type: 'button', onClick: function() { setView3d(false); }, className: 'underline font-bold text-indigo-800' }, 'Back to the diagram')),
                  threeStatus === 'lost' && h('div', { role: 'alert', 'data-bikelab-gl-lost': 'true', className: 'text-sm text-slate-800 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-300' },
                    h('h3', { className: 'font-bold' }, __alloT('stem.bikelab.webgl_lost_title', '3D view paused')),
                    h('p', { className: 'mt-1' }, __alloT('stem.bikelab.webgl_lost_body', 'This device ran low on graphics memory, so the 3D view stopped. Your work is saved.')
                      + ' ' + __alloT('stem.bikelab.webgl_lost_diagram', 'The diagram shows the same parts.')),
                    h('div', { className: 'flex flex-wrap gap-2 mt-2' },
                      h('button', { type: 'button', ref: glRestartRef, 'data-bikelab-gl-restart': 'true',
                        onClick: function() {
                          setGlGen(function(n) { return n + 1; });
                          setTimeout(function() { var b = document.querySelector('[data-bikelab-parts-view="3d"]'); if (b) b.focus({ preventScroll: true }); }, 0);
                        },
                        className: 'px-3 py-2 rounded-lg border-2 border-indigo-700 bg-indigo-600 text-white text-sm font-bold' }, __alloT('stem.bikelab.webgl_lost_restart', 'Restart 3D view')),
                      h('button', { type: 'button', onClick: function() { setView3d(false); }, className: 'px-3 py-2 underline font-bold text-indigo-800' }, __alloT('stem.bikelab.webgl_lost_back', 'Back to the diagram')))),
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
                            className: 'text-xs px-2 py-0.5 rounded border transition-colors ' + (selectedId === p.id ? 'border-indigo-700 bg-indigo-600 text-white font-bold' : 'border-slate-500 bg-white text-slate-700 hover:border-slate-700')
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

      // The illustrated bike, drawn facing left (both users mirror it, so the chain is on the bike's right-hand side).
      // The Parts Inspector and the Repair Simulator's work stand draw this one picture. o.lifted leaves out the ground.
      function bikeDiagramArt(o) {
        o = o || {};
        var st = o.state || {};
        return h('g', { 'data-bikelab-bike-art': 'true' },
          // ground (left out when the bike hangs on the work stand)
          !o.lifted && h('g', null, h('ellipse', { cx: 120, cy: 296, rx: 46, ry: 4, fill: '#e2e8f0' }), h('ellipse', { cx: 425, cy: 296, rx: 46, ry: 4, fill: '#e2e8f0' }),
            h('line', { x1: 40, y1: 295, x2: 480, y2: 295, stroke: '#cbd5e1', strokeWidth: 2, strokeLinecap: 'round' })),
          // wheels: tire, rim, spokes, hub. o.state (the repair work stand): a front wheel that is off lies flat on the
          // floor under the empty fork, and a tube that is out lies on the floor under the frame.
          st.wheelOff && h('g', { 'data-bikelab-wheel-at': 'floor' },
            h('ellipse', { cx: 100, cy: 301, rx: 48, ry: 9, fill: 'none', stroke: '#1f2937', strokeWidth: 7 }),
            h('ellipse', { cx: 100, cy: 301, rx: 37, ry: 6, fill: 'none', stroke: '#94a3b8', strokeWidth: 3 }),
            h('ellipse', { cx: 100, cy: 301, rx: 6, ry: 2.5, fill: '#475569', stroke: '#1e293b', strokeWidth: 1 })),
          [120, 425].map(function(wx) {
            if (st.wheelOff && wx === 120) return null;
            var wy = 250;
            return h('g', { key: 'wheel' + wx, 'data-bikelab-wheel-at': wx + ',' + wy },
              h('circle', { cx: wx, cy: wy, r: 44, fill: 'none', stroke: '#1f2937', strokeWidth: 9 }),
              h('circle', { cx: wx, cy: wy, r: 44, fill: 'none', stroke: '#4b5563', strokeWidth: 1.5, strokeDasharray: '3 5' }),
              h('circle', { cx: wx, cy: wy, r: 35, fill: 'none', stroke: '#94a3b8', strokeWidth: 4 }),
              [0, 1, 2, 3, 4, 5, 6, 7].map(function(i) {
                var ang = i * Math.PI / 8;
                return h('line', { key: i, x1: wx - 33 * Math.cos(ang), y1: wy - 33 * Math.sin(ang), x2: wx + 33 * Math.cos(ang), y2: wy + 33 * Math.sin(ang), stroke: '#94a3b8', strokeWidth: 1 });
              }),
              h('circle', { cx: wx, cy: wy, r: 7, fill: '#475569', stroke: '#1e293b', strokeWidth: 1.5 }));
          }),
          st.tubeOut && h('g', { 'data-bikelab-tube-out': 'true' },
            h('ellipse', { cx: 210, cy: 302, rx: 40, ry: 6, fill: 'none', stroke: '#1f2937', strokeWidth: 4 }),
            h('line', { x1: 174, y1: 301, x2: 168, y2: 293, stroke: '#64748b', strokeWidth: 3, strokeLinecap: 'round' }),
            st.patched && h('rect', { x: 230, y: 301, width: 12, height: 8, rx: 1.5, fill: '#f97316', stroke: '#9a3412', strokeWidth: 1, 'data-bikelab-tube-patch': 'true' })),
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
          !st.pedalOff && h('rect', { x: 311, y: 264, width: 18, height: 6, rx: 2, fill: '#111827', 'data-bikelab-pedal': 'true' }),
          h('circle', { cx: 425, cy: 250, r: 14, fill: '#ede9fe', stroke: '#6d28d9', strokeWidth: 2 }),
          h('circle', { cx: 425, cy: 250, r: 9, fill: 'none', stroke: '#6d28d9', strokeWidth: 1.5 }),
          h('rect', { x: 414, y: 267, width: 13, height: 9, rx: 2, fill: '#7c3aed', stroke: '#4c1d95', strokeWidth: 1 }),
          h('line', { x1: 420, y1: 276, x2: 420, y2: 290, stroke: '#4c1d95', strokeWidth: 2 }),
          h('circle', { cx: 420, cy: 279, r: 3.5, fill: '#c4b5fd', stroke: '#4c1d95', strokeWidth: 1 }),
          h('circle', { cx: 420, cy: 290, r: 3.5, fill: '#c4b5fd', stroke: '#4c1d95', strokeWidth: 1 })
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
        return h('svg', { viewBox: '0 0 240 260', className: o.className || 'w-full h-64 mx-auto', role: 'img', 'aria-label': o.label || __alloT('stem.bikelab.a11y_rider_with_a_helmet_seen_from_the_side', 'Rider with a helmet, seen from the side') },
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
            h('text', { x: 196, y: 114, fill: '#92400e', fontSize: 10, fontWeight: 'bold' }, '2 fingers'),
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
      // Checked 2026-11-23 against timeanddate.com/sun/usa/portland-me: 5:57, 4:15, 4:04, 4:29, 5:11, 6:47 pm (15th of each month).
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
                    h('div', { role: 'group', 'aria-label': __alloT('stem.bikelab.yourChoice', 'Your choice'), className: 'mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2' },
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
                // Bridges and shade: NWS "Winter Weather Safety: Ice and Frost" (weather.gov/safety/winter-ice-frost). The old "most slippery
                // near 32°F because a film of water sits on top" was removed 2026-11-23: why ice is slippery is still debated in the research.
                h('p', null, h('strong', null, 'Black ice '), 'is thin, clear ice. The road just looks wet. Bridges freeze before other roads, and ice can stay in the shade after the sun melts it elsewhere.'),
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
        // A pale tile behind the rider: the dark arms were lost on the black contrast theme, and the arm IS the answer.
        return h('svg', { viewBox: '0 0 80 80', 'aria-hidden': 'true', className: 'w-20 h-20 mx-auto' },
          h('rect', { x: 0, y: 0, width: 80, height: 80, rx: 10, fill: '#f1f5f9', 'data-bikelab-pose-tile': 'true' }),
          h('circle', { cx: 40, cy: 16, r: 9, fill: '#fde68a', stroke: '#0f172a', strokeWidth: 3 }),
          h('path', { d: 'M29,16 A11,11 0 0 1 51,16 Z', fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 3, strokeLinejoin: 'round' }),   // helmet: every rider in this tool wears one
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
                h('div', { className: 'text-2xl font-black text-amber-700' }, gameMode === 'idle' ? '—' : gameMode === 'done' ? (ROUND_COUNT + ' / ' + ROUND_COUNT) : (Math.min(roundIdx + 1, ROUND_COUNT) + ' / ' + ROUND_COUNT))
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
              ) : gameMode === 'playing' ? h('div', { className: 'w-full flex flex-col sm:flex-row items-center gap-4' },
                // the street ahead: why a signal is needed, never which arm pose
                current && h('div', { className: 'w-full shrink-0', style: { maxWidth: 340 } }, signalSceneSvg(h, current.id)),
                h('div', { className: 'flex-1 text-center sm:text-left', 'aria-live': 'polite' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-2' }, 'Round ' + (roundIdx + 1)),
                  h('p', { className: 'text-xl font-bold text-slate-800' }, current ? current.prompt : ''),
                  feedback && h('div', { className: 'text-sm text-slate-600 mt-2' }, feedback))
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
