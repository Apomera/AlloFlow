// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Heat & Thermodynamics Lab
//
// Fills the largest remaining curriculum hole in the lab: NGSS MS-PS3 and
// HS-PS3 had no home. Plate Tectonics teaches mantle convection and the
// chemistry suite mentions heat transfer, but nothing owned the subject.
//
// Five modules, each with a real model rather than an animation:
//   1. Heat Transfer     — 1-D explicit finite-difference heat equation over a
//                          bar of a chosen material; convection and radiation
//                          modes for the other two mechanisms.
//   2. Insulation        — Newton's law of cooling driven by a real R-value,
//                          so thickness and material change the curve honestly.
//   3. Specific Heat     — calorimetry mixing, predict-then-reveal:
//                          Tf = (m1c1T1 + m2c2T2) / (m1c1 + m2c2)
//   4. Heating Curve     — water from ice to steam, including the two latent
//                          plateaus that make the graph counter-intuitive.
//   5. Heat Engines      — Carnot limit eta = 1 - Tc/Th against real engines,
//                          i.e. why 100 percent is not an engineering problem.
//
// House rules followed from the rest of the lab: every control is a real
// button or labelled input (never div + role + tabIndex), the canvas answers
// arrow keys, animation respects prefers-reduced-motion, and the quest hooks
// measure what the learner DID, never what they merely opened.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ── Materials. k = thermal conductivity (W/m-K), c = specific heat (J/kg-K),
  //    rho = density (kg/m^3). Diffusivity alpha = k / (rho * c) drives module 1.
  var MATERIALS = [
    { id: 'copper',   name: 'Copper',       k: 401,   c: 385,  rho: 8960, colour: '#f97316', note: 'The best common conductor. Used for pan bases and heat sinks precisely because heat races through it.' },
    { id: 'aluminium',name: 'Aluminium',    k: 237,   c: 897,  rho: 2700, colour: '#94a3b8', note: 'Two-thirds of copper’s conductivity at a third of the weight, which is why radiators and laptop bodies use it.' },
    { id: 'steel',    name: 'Steel',        k: 50,    c: 490,  rho: 7850, colour: '#64748b', note: 'Eight times worse than copper. A steel pan handle stays touchable far longer than a copper one.' },
    { id: 'glass',    name: 'Glass',        k: 1.0,   c: 840,  rho: 2500, colour: '#7dd3fc', note: 'Four hundred times worse than copper. Single-pane windows still lose heat fast because they are thin.' },
    { id: 'water',    name: 'Water',        k: 0.6,   c: 4186, rho: 1000, colour: '#38bdf8', note: 'A poor conductor but an enormous heat store. That huge specific heat is why oceans steady the climate.' },
    { id: 'wood',     name: 'Wood',         k: 0.12,  c: 1700, rho: 600,  colour: '#a16207', note: 'A natural insulator. A wooden spoon in a hot pan never burns your hand the way a metal one does.' },
    { id: 'fibre',    name: 'Fibreglass',   k: 0.04,  c: 840,  rho: 20,   colour: '#fbbf24', note: 'Loft insulation. The glass itself conducts; the trapped still air between the fibres is what actually insulates.' },
    { id: 'aerogel',  name: 'Aerogel',      k: 0.015, c: 1000, rho: 150,  colour: '#c4b5fd', note: 'Almost entirely air held in a silica lattice. NASA used it on Mars rovers to survive the overnight cold.' }
  ];

  // Specific heats for the calorimetry module (J/kg-K)
  var SUBSTANCES = [
    { id: 'water',   name: 'Water',        c: 4186, colour: '#38bdf8' },
    { id: 'oil',     name: 'Olive oil',    c: 1970, colour: '#a3a635' },
    { id: 'ethanol', name: 'Ethanol',      c: 2440, colour: '#c4b5fd' },
    { id: 'sand',    name: 'Dry sand',     c: 830,  colour: '#d6b370' },
    { id: 'alum',    name: 'Aluminium',    c: 897,  colour: '#94a3b8' },
    { id: 'iron',    name: 'Iron',         c: 449,  colour: '#71717a' },
    { id: 'copper',  name: 'Copper',       c: 385,  colour: '#f97316' }
  ];

  // Real engines, for the second-law module
  var ENGINES = [
    { name: 'Car petrol engine',      hot: 2500, cold: 350, real: 25, note: 'Most of the fuel energy leaves as hot exhaust and radiator heat, not motion.' },
    { name: 'Coal power station',     hot: 850,  cold: 320, real: 37, note: 'Steam turbines run near their practical ceiling; the waste heat goes up the cooling towers.' },
    { name: 'Combined-cycle gas',     hot: 1700, cold: 300, real: 62, note: 'A gas turbine’s exhaust drives a second steam turbine, so less heat is thrown away.' },
    { name: 'Nuclear (PWR)',          hot: 600,  cold: 310, real: 33, note: 'Limited by how hot the water loop is allowed to get, not by the reaction itself.' },
    { name: 'Human body (muscle)',    hot: 310,  cold: 295, real: 25, note: 'Not a heat engine at all — muscle converts chemical energy directly, which is why it beats its Carnot figure.' }
  ];

  // Everyday cases, for the spotlight list
  var EVERYDAY = [
    { name: 'Vacuum flask',      mech: 'All three, blocked',   desc: 'The vacuum stops conduction and convection because there is no matter to carry heat. The silvered wall reflects radiation back. The only real leak is the stopper and the thin glass neck.', icon: '🥤' },
    { name: 'Double glazing',    mech: 'Convection, slowed',   desc: 'The gap is too narrow for a convection current to get going, and it is often filled with argon, which conducts worse than air.', icon: '🪟' },
    { name: 'Car radiator',      mech: 'Convection, forced',   desc: 'Fins add surface area and the fan forces air across them. Forced convection moves far more heat than letting air drift past.', icon: '🚗' },
    { name: 'Penguin huddle',    mech: 'Conduction + wind',    desc: 'Huddling cuts the exposed surface area per bird and blocks wind chill. Penguins rotate so nobody stays on the cold edge.', icon: '🐧' },
    { name: 'Wetsuit',           mech: 'Conduction, trapped',  desc: 'Neoprene traps a thin layer of water your body warms. Water conducts heat about 25 times better than air, so without the suit you lose heat fast.', icon: '🌊' },
    { name: 'Sweating',          mech: 'Evaporation',          desc: 'Turning sweat to vapour costs 2,260 kJ per kilogram, taken straight from your skin. It stops working when humidity is too high for the vapour to leave.', icon: '💦' },
    { name: 'Sea breeze',        mech: 'Convection, driven',   desc: 'Land heats faster than sea because rock has a much lower specific heat. The warm air over land rises and cool sea air flows in underneath.', icon: '🏖️' },
    { name: 'Oven mitt',         mech: 'Conduction, resisted', desc: 'Thick fabric full of still air. It fails the moment it gets wet, because water conducts heat far better than the trapped air it replaces.', icon: '🧤' }
  ];

  // Linear expansion coefficients, per kelvin. dL = alpha * L * dT.
  var EXPANSION = [
    { id: 'invar',    name: 'Invar',           alpha: 1.2e-6,  note: 'A nickel-iron alloy designed to barely move. Used in precision instruments and old clock pendulums.' },
    { id: 'pyrex',    name: 'Borosilicate',    alpha: 3.3e-6,  note: 'Pyrex. It survives the oven-to-worktop shock that shatters ordinary glass, because the inside and outside expand almost equally.' },
    { id: 'glass',    name: 'Window glass',    alpha: 9.0e-6,  note: 'Nearly three times more than borosilicate, which is exactly why pouring boiling water into a cold tumbler cracks it.' },
    { id: 'steel',    name: 'Steel',           alpha: 12e-6,   note: 'Rails, bridges and reinforcing bar. Its near-match to concrete is what makes reinforced concrete possible at all.' },
    { id: 'concrete', name: 'Concrete',        alpha: 12e-6,   note: 'Almost identical to steel. If the two differed much, every reinforced structure would tear itself apart through the seasons.' },
    { id: 'copper',   name: 'Copper',          alpha: 17e-6,   note: 'Copper pipe in a long hot-water run needs expansion loops, or it buckles and creaks.' },
    { id: 'alum',     name: 'Aluminium',       alpha: 23e-6,   note: 'Twice steel. Aircraft skins and large aluminium roofs need generous allowance for movement.' }
  ];

  // Composite wall layers. Real insulation is layers in series, and the total
  // resistance is their sum — which is why one weak layer ruins a good wall.
  var WALL_LAYERS = [
    { id: 'brick',    name: 'Brick, 100 mm',        r: 0.13, note: 'Structural, not insulating. A solid brick wall is a poor thermal barrier however thick it looks.' },
    { id: 'block',    name: 'Concrete block, 100 mm', r: 0.11, note: 'Even worse than brick per millimetre. Dense materials conduct.' },
    { id: 'cavity',   name: 'Air cavity, 50 mm',    r: 0.18, note: 'Still air insulates well. The catch is that a wide cavity lets convection start, which is why 50 mm beats 200 mm.' },
    { id: 'mineral',  name: 'Mineral wool, 100 mm', r: 2.50, note: 'The workhorse. Traps air in fibres so it cannot circulate — you get the air’s low conductivity without the convection.' },
    { id: 'pir',      name: 'PIR board, 50 mm',     r: 2.27, note: 'Rigid foam with low-conductivity gas in closed cells. Half the thickness of mineral wool for the same resistance.' },
    { id: 'plaster',  name: 'Plasterboard, 12 mm',  r: 0.06, note: 'Finish, not insulation. Included because it is easy to imagine it helping when it barely does.' },
    { id: 'timber',   name: 'Timber, 20 mm',        r: 0.14, note: 'Modest but not nothing. Timber studs bridging the insulation are a real weak point in a wall.' },
    { id: 'glazing',  name: 'Double glazing unit',  r: 0.35, note: 'Far better than single glass, far worse than any insulated wall. Windows are usually the weakest element.' }
  ];
  var WALL_SURFACE_R = 0.17;   // inside + outside still-air films

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(n, dp) { var f = Math.pow(10, dp || 0); return (Math.round(n * f) / f).toLocaleString(); }

  // ── 3D convection tank ──────────────────────────────────────────────
  // Convection is the mechanism a flat diagram serves worst. In 2D it looks like
  // a circle of arrows; in reality it is a closed toroidal roll, and you only
  // believe that once you can turn it over. The viewer shell (WebGL setup,
  // orbit, picking, labels, context-loss recovery, no-WebGL fallback) belongs to
  // the host — window.StemLab.makeBayViewer — so this file only builds geometry.
  var HEAT_3D_PARTS = [
    { id: 'heater',    label: 'Heated base',   color: '#ef4444', desc: 'Energy enters here. The fluid touching the plate warms, expands, and becomes less dense than the fluid above it.' },
    { id: 'plume',     label: 'Rising plume',  color: '#fb923c', desc: 'Warm, less dense fluid is pushed upward by the denser fluid around it. Nothing pulls it up — it is buoyancy, the same force that lifts a cork.' },
    { id: 'ceiling',   label: 'Cool ceiling',  color: '#38bdf8', desc: 'At the top the fluid gives its heat to the cold surface, contracts, and becomes dense again.' },
    { id: 'downdraft', label: 'Sinking edges', color: '#7dd3fc', desc: 'Cooled dense fluid falls back down the sides. This is the return half of the loop, and it is why the middle can keep rising.' },
    { id: 'tank',      label: 'Tank walls',    color: '#94a3b8', desc: 'The container. Change its shape and the roll changes with it — convection cells take the form the boundary allows.' }
  ];

  function heatBuildScene(THREE, api) {
    // Every variable is declared before it is used. A declaration sitting below
    // its first use is what silently broke another 3D tool in this lab for most
    // of its shapes, and the failure surfaced as "your device lacks WebGL".
    var meshes = {};
    var picks = [];
    var anchor = new THREE.Group();
    api.scene.add(anchor);

    var contrast = !!api.contrast;
    var colourOf = function (id) {
      if (contrast) return '#ffffff';
      for (var i = 0; i < HEAT_3D_PARTS.length; i++) if (HEAT_3D_PARTS[i].id === id) return HEAT_3D_PARTS[i].color;
      return '#94a3b8';
    };
    var mat = function (id, opts) {
      var o = opts || {};
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(colourOf(id)),
        shininess: contrast ? 0 : (o.shininess == null ? 26 : o.shininess),
        specular: contrast ? 0x000000 : 0x5b6472,
        transparent: !!o.opacity && o.opacity < 1,
        opacity: o.opacity == null ? 1 : o.opacity,
        emissive: new THREE.Color(o.emissive || '#000000'),
        side: o.side || THREE.FrontSide
      });
    };

    var W = 2.6, D = 2.6, H = 2.0;

    // Tank: four thin walls, left open at top and bottom so the plates read as
    // the hot and cold surfaces rather than as part of the glass.
    var wallMat = mat('tank', { opacity: contrast ? 1 : 0.16, shininess: 60 });
    var wallGeo = [
      [W, H, 0.05, 0, 0, -D / 2],
      [W, H, 0.05, 0, 0, D / 2],
      [0.05, H, D, -W / 2, 0, 0],
      [0.05, H, D, W / 2, 0, 0]
    ];
    var tankGroup = new THREE.Group();
    var gi, wg, wm;
    for (gi = 0; gi < wallGeo.length; gi++) {
      wg = wallGeo[gi];
      wm = new THREE.Mesh(new THREE.BoxGeometry(wg[0], wg[1], wg[2]), wallMat);
      wm.position.set(wg[3], wg[4], wg[5]);
      tankGroup.add(wm);
    }
    anchor.add(tankGroup);
    meshes.tank = tankGroup;
    picks.push(tankGroup);

    // Hot plate below, cold plate above
    var plate = function (id, y, emissive) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), mat(id, { emissive: emissive, shininess: 8 }));
      m.position.set(0, y, 0);
      if (api.wantShadow) { m.castShadow = true; m.receiveShadow = true; }
      anchor.add(m);
      meshes[id] = m;
      picks.push(m);
      return m;
    };
    plate('heater', -H / 2 - 0.06, contrast ? '#000000' : '#5a1010');
    plate('ceiling', H / 2 + 0.06, contrast ? '#000000' : '#0b2b3d');

    // The rising column in the middle and the falling sheets at the walls, drawn
    // as stacked spheres so the roll reads as moving fluid, not as solid pipe.
    var sphereGeo = new THREE.SphereGeometry(0.13, 14, 12);
    var plumeGroup = new THREE.Group();
    var downGroup = new THREE.Group();
    var n, fy, ring, ang, rx, rz, s;
    for (n = 0; n < 9; n++) {
      fy = -H / 2 + 0.18 + (n / 8) * (H - 0.36);
      s = new THREE.Mesh(sphereGeo, mat('plume', { emissive: contrast ? '#000000' : '#3d1a05' }));
      s.position.set(0, fy, 0);
      if (api.wantShadow) s.castShadow = true;
      plumeGroup.add(s);
    }
    for (ring = 0; ring < 8; ring++) {
      ang = (ring / 8) * Math.PI * 2;
      rx = Math.cos(ang) * (W / 2 - 0.28);
      rz = Math.sin(ang) * (D / 2 - 0.28);
      for (n = 0; n < 5; n++) {
        fy = H / 2 - 0.18 - (n / 4) * (H - 0.36);
        s = new THREE.Mesh(sphereGeo, mat('downdraft', { emissive: contrast ? '#000000' : '#082131' }));
        s.position.set(rx, fy, rz);
        s.scale.setScalar(0.82);
        downGroup.add(s);
      }
    }
    anchor.add(plumeGroup);
    anchor.add(downGroup);
    meshes.plume = plumeGroup;
    meshes.downdraft = downGroup;
    picks.push(plumeGroup);
    picks.push(downGroup);

    // Direction cones. Without these the roll is ambiguous — a ring of spheres
    // says nothing about which way anything is going.
    var coneGeo = new THREE.ConeGeometry(0.16, 0.34, 12);
    var upCone = new THREE.Mesh(coneGeo, mat('plume'));
    upCone.position.set(0, H / 2 - 0.05, 0);
    plumeGroup.add(upCone);
    var dc, dcAng;
    for (dc = 0; dc < 4; dc++) {
      dcAng = (dc / 4) * Math.PI * 2 + Math.PI / 4;
      var down = new THREE.Mesh(coneGeo, mat('downdraft'));
      down.position.set(Math.cos(dcAng) * (W / 2 - 0.28), -H / 2 + 0.05, Math.sin(dcAng) * (D / 2 - 0.28));
      down.rotation.z = Math.PI;
      downGroup.add(down);
    }

    // Curved returns along the base and ceiling, closing the loop visually
    var torusGeo = new THREE.TorusGeometry(W / 2 - 0.3, 0.045, 8, 40);
    var topRing = new THREE.Mesh(torusGeo, mat('ceiling'));
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = H / 2 - 0.22;
    anchor.add(topRing);
    var botRing = new THREE.Mesh(torusGeo, mat('heater'));
    botRing.rotation.x = Math.PI / 2;
    botRing.position.y = -H / 2 + 0.22;
    anchor.add(botRing);

    return { meshes: meshes, picks: picks, anchor: anchor };
  }

  var HEAT_3D_NULL = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  var HEAT_3D_MISSING = null;
  var HEAT_VIEWER = (function () {
    var mk = window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) {
      // Two different failures used to share one message. If the HOST is older
      // than the tool, no amount of network access fixes it, and saying "check
      // your connection" sends the reader the wrong way.
      HEAT_3D_MISSING = 'host';
      return HEAT_3D_NULL;
    }
    return mk({
      parts: HEAT_3D_PARTS.map(function (p) { return { id: p.id, label: p.label, color: p.color }; }),
      buildScene: heatBuildScene,
      home: { yaw: -0.7, pitch: 0.42, dist: 6.4 },
      failMessage: '3D convection tank unavailable'
    });
  })();

  // Stable identity. A fresh callback each render makes React tear the viewer
  // down and rebuild it on every state change.
  function heat3dAttach(node) { HEAT_VIEWER.attach(node || null); }

  window.StemLab.registerTool('heatLab', {
    icon: '🌡️',
    label: 'Heat & Thermodynamics Lab',
    desc: 'Conduction, convection and radiation on a real heat-equation model; insulation R-values; calorimetry mixing; the water heating curve with its two latent plateaus; and why no heat engine reaches 100 percent.',
    color: 'orange',
    category: 'science',
    aliases: ['thermodynamics', 'heat', 'heat transfer', 'conduction', 'convection', 'radiation', 'insulation',
      'specific heat', 'calorimetry', 'latent heat', 'phase change', 'heating curve', 'entropy', 'carnot',
      'heat engine', 'thermal', 'temperature', 'R-value', 'second law'],

    // Quest hooks measure deliberate acts, never "you opened the panel".
    questHooks: [
      { id: 'heat_transfer_run', label: 'Run all three heat transfer modes', icon: '🔥',
        check: function (d) { return !!(d && d.modesSeen && d.modesSeen.length >= 3); } },
      { id: 'heat_material_compare', label: 'Compare three materials in the bar', icon: '🧱',
        check: function (d) { return !!(d && d.materialsTried && d.materialsTried.length >= 3); } },
      { id: 'heat_insulation', label: 'Keep the mug above 65 °C for an hour', icon: '🧣',
        check: function (d) { return !!(d && d.insulationWin); } },
      { id: 'heat_calorimetry', label: 'Predict a mixing temperature within 2 °C', icon: '⚖️',
        check: function (d) { return !!(d && (d.mixWins || 0) >= 1); } },
      { id: 'heat_curve', label: 'Take water all the way from ice to steam', icon: '♨️',
        check: function (d) { return !!(d && d.curveComplete); } },
      { id: 'heat_engine', label: 'Compare three engines against the Carnot limit', icon: '⚙️',
        check: function (d) { return !!(d && d.enginesSeen && d.enginesSeen.length >= 3); } },
      { id: 'heat_wall', label: 'Build a wall that meets 0.18 W/m²K', icon: '🧱',
        check: function (d) { return !!(d && d.wallMet); } },
      { id: 'heat_3d', label: 'Inspect three parts of the 3D convection tank', icon: '🧊',
        check: function (d) { return !!(d && (d.parts3d || []).length >= 3); } },
      { id: 'heat_everyday', label: 'Explain three everyday cases', icon: '🌍',
        check: function (d) { return !!(d && (d.everydaySeen || []).length >= 3); } }
    ],

    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var isDark = ctx.theme !== 'light';

      // Every hook is declared unconditionally, before any branching. Declaring a
      // hook after a render-time conditional is the TDZ crash class that has bitten
      // other tools in this lab on navigation.
      var canvasRef = React.useRef(null);
      var animRef = React.useRef(0);
      var roRef = React.useRef(null);
      var coolRef = React.useRef(null);
      var curveRef = React.useRef(null);
      var entropyRef = React.useRef(null);
      var stPredict = React.useState('');
      var predictText = stPredict[0], setPredictText = stPredict[1];
      var stReveal = React.useState(false);
      var revealed = stReveal[0], setRevealed = stReveal[1];
      var st3d = React.useState(HEAT_VIEWER.status ? HEAT_VIEWER.status() : 'idle');
      var view3dStatus = st3d[0], setView3dStatus = st3d[1];
      var stTable = React.useState(false);
      var showTables = stTable[0], setShowTables = stTable[1];

      var d = (ctx.toolData && ctx.toolData._heatLab) || {};

      function upd(patch) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._heatLab) || {}, patch);
          var next = Object.assign({}, prev);
          next._heatLab = cur;
          return next;
        });
      }
      function pushOnce(key, value) {
        var list = d[key] || [];
        if (list.indexOf(value) !== -1) return;
        var patch = {};
        patch[key] = list.concat([value]);
        upd(patch);
      }

      var mode = d.mode || 'conduction';
      var matId = d.matId || 'copper';
      var matBId = d.matBId || 'wood';
      var material = MATERIALS.filter(function (m) { return m.id === matId; })[0] || MATERIALS[0];
      var materialB = MATERIALS.filter(function (m) { return m.id === matBId; })[0] || MATERIALS[5];
      var raceOn = !!d.raceOn;
      var hotEnd = typeof d.hotEnd === 'number' ? d.hotEnd : 200;

      // ── Module 1 canvas ──────────────────────────────────────────────
      React.useEffect(function () {
        var el = canvasRef.current;
        if (!el) return;
        var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0;
        function size() {
          var ow = el.offsetWidth || 600, oh = el.offsetHeight || 220;
          W = el.width = Math.round(ow * dpr);
          H = el.height = Math.round(oh * dpr);
        }
        size();
        var c = el.getContext('2d');

        // Two bars, not one. Switching material and comparing from memory is a
        // poor test; racing them side by side is the demonstration itself, and it
        // turns "copper is better" into a number.
        // Geometry and finish line are chosen from the physics, not from taste.
        // A 30 cm bar needs 195 s of simulated time for copper's midpoint to pass
        // 100 C and steel never gets there at all, so nothing ever finished. A
        // 20 cm bar with the line at 50 C gives copper 22 s, aluminium 27 s,
        // steel 201 s and the insulators never — which is exactly the lesson.
        var BAR_LEN = 0.20;              // metres
        var FINISH_C = 50;               // midpoint temperature that stops the clock
        var TIME_SCALE = 10;             // simulated seconds per real second
        var N = 90;
        var TA = new Float64Array(N);
        var TB = new Float64Array(N);
        var clockA = 0, clockB = 0;      // seconds of simulated time
        var reachA = null, reachB = null; // seconds for the midpoint to pass FINISH_C
        function reset() {
          for (var i = 0; i < N; i++) { TA[i] = 20; TB[i] = 20; }
          clockA = 0; clockB = 0; reachA = null; reachB = null;
        }
        reset();

        function matOf(id, fallback) {
          return MATERIALS.filter(function (x) { return x.id === id; })[0] || fallback;
        }
        function advance(T, mat, hot, dt) {
          // alpha = k / (rho * c). The explicit scheme needs sub-steps or it blows
          // up: copper's diffusivity is 27,000x aerogel's, so one dt cannot serve both.
          var alpha = mat.k / (mat.rho * mat.c);
          var dx = BAR_LEN / N;
          var stable = 0.4 * dx * dx / alpha;
          var sub = Math.min(400, Math.max(1, Math.ceil(dt / stable)));
          var sdt = dt / sub;
          for (var s = 0; s < sub; s++) {
            T[0] = hot;
            T[N - 1] = 20;                              // held at room temperature
            var prev = T.slice();
            for (var i = 1; i < N - 1; i++) {
              T[i] = prev[i] + alpha * sdt * (prev[i + 1] - 2 * prev[i] + prev[i - 1]) / (dx * dx);
            }
          }
        }
        var last = 0;
        function step(dt) {
          var hot = parseFloat(el.dataset.hot || '200');
          var mid = Math.floor(N / 2);
          var mA = matOf(el.dataset.material, MATERIALS[0]);
          advance(TA, mA, hot, dt);
          clockA += dt;
          if (reachA === null && TA[mid] >= FINISH_C) reachA = clockA;
          if (el.dataset.race === 'on') {
            var mB = matOf(el.dataset.materialB, MATERIALS[5]);
            advance(TB, mB, hot, dt);
            clockB += dt;
            if (reachB === null && TB[mid] >= FINISH_C) reachB = clockB;
          }
        }

        function colourFor(temp) {
          var f = clamp((temp - 20) / 260, 0, 1);
          var r = Math.round(30 + f * 225), g = Math.round(60 + f * 120 * (1 - f)), b = Math.round(200 - f * 190);
          return 'rgb(' + r + ',' + g + ',' + b + ')';
        }

        function oneBar(T, mat, top, barH, pad, reached, label) {
          var cellW = (W - pad * 2) / N, i;
          for (i = 0; i < N; i++) {
            c.fillStyle = colourFor(T[i]);
            c.fillRect(pad + i * cellW, top, cellW + 1, barH);
          }
          c.strokeStyle = 'rgba(226,232,240,0.5)';
          c.lineWidth = Math.max(1, dpr);
          c.strokeRect(pad, top, W - pad * 2, barH);
          // midpoint marker, the line the race is timed to
          c.strokeStyle = 'rgba(226,232,240,0.75)';
          c.setLineDash([3 * dpr, 3 * dpr]);
          c.beginPath();
          c.moveTo(W / 2, top - 2 * dpr); c.lineTo(W / 2, top + barH + 2 * dpr);
          c.stroke();
          c.setLineDash([]);

          c.font = '700 ' + (10 * dpr) + 'px system-ui, sans-serif';
          c.textBaseline = 'alphabetic';
          c.textAlign = 'left';
          c.fillStyle = 'rgba(226,232,240,0.92)';
          c.fillText(label, pad, top - 6 * dpr);
          c.textAlign = 'right';
          c.fillStyle = reached === null ? 'rgba(148,163,184,0.85)' : '#4ade80';
          c.fillText(reached === null
            ? fmt(T[Math.floor(N / 2)], 0) + '°C at the middle, still climbing'
            : 'middle hit ' + FINISH_C + '°C in ' + reached.toFixed(1) + ' s', W - pad, top - 6 * dpr);
        }

        function drawBar(ts) {
          var racing = el.dataset.race === 'on';
          var pad = 26 * dpr;
          c.clearRect(0, 0, W, H);
          c.fillStyle = isDark ? '#0b1120' : '#0f172a';
          c.fillRect(0, 0, W, H);

          var mA = matOf(el.dataset.material, MATERIALS[0]);
          if (racing) {
            var mB = matOf(el.dataset.materialB, MATERIALS[5]);
            var bh = H * 0.24;
            oneBar(TA, mA, H * 0.20, bh, pad, reachA, mA.name);
            oneBar(TB, mB, H * 0.60, bh, pad, reachB, mB.name);
          } else {
            oneBar(TA, mA, H * 0.28, H * 0.34, pad, reachA, mA.name);
          }
          c.textAlign = 'center';
          c.fillStyle = 'rgba(148,163,184,0.9)';
          c.font = '600 ' + (10 * dpr) + 'px system-ui, sans-serif';
          c.fillText('20 cm bar, held at ' + fmt(parseFloat(el.dataset.hot || '200'), 0) + '°C and 20°C — running at ' + TIME_SCALE + '× real time', W / 2, H - 12 * dpr);
        }

        function drawConvection(ts) {
          c.clearRect(0, 0, W, H);
          var g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, '#0b1120'); g.addColorStop(1, '#7c2d12');
          c.fillStyle = g; c.fillRect(0, 0, W, H);
          var tt = reduce ? 0 : ts / 1000;
          for (var i = 0; i < 26; i++) {
            var phase = (i * 0.37 + tt * 0.35) % 1;
            var x = (W / 26) * i + (W / 52) + Math.sin(tt + i) * 8 * dpr;
            var y = H - phase * H;
            var warm = phase > 0.5;
            c.globalAlpha = 0.75 * (1 - Math.abs(phase - 0.5) * 1.2);
            c.fillStyle = warm ? '#fb923c' : '#38bdf8';
            c.beginPath();
            c.arc(x, warm ? y : H - y, (7 - i % 3) * dpr, 0, 6.2832);
            c.fill();
          }
          c.globalAlpha = 1;
          c.fillStyle = 'rgba(226,232,240,0.92)';
          c.font = '700 ' + (12 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.fillText('Warm fluid rises, cool fluid sinks, and the loop carries the heat', W / 2, 26 * dpr);
          c.font = '600 ' + (10 * dpr) + 'px system-ui, sans-serif';
          c.fillStyle = 'rgba(226,232,240,0.7)';
          c.fillText('This only works in fluids. A solid cannot convect — its particles cannot move past each other.', W / 2, H - 14 * dpr);
        }

        function drawRadiation(ts) {
          c.clearRect(0, 0, W, H);
          c.fillStyle = '#05070f';
          c.fillRect(0, 0, W, H);
          var tt = reduce ? 0 : ts / 1000;
          var cx = W * 0.24, cy = H * 0.5;
          for (var r = 0; r < 6; r++) {
            var rad = ((tt * 60 + r * 34) % 200) * dpr;
            c.globalAlpha = clamp(1 - rad / (200 * dpr), 0, 1) * 0.6;
            c.strokeStyle = '#fbbf24';
            c.lineWidth = 2 * dpr;
            c.beginPath(); c.arc(cx, cy, rad, -0.9, 0.9); c.stroke();
          }
          c.globalAlpha = 1;
          c.fillStyle = '#f59e0b';
          c.beginPath(); c.arc(cx, cy, 22 * dpr, 0, 6.2832); c.fill();
          c.fillStyle = '#1e293b';
          c.fillRect(W * 0.72, cy - H * 0.22, 26 * dpr, H * 0.44);
          c.fillStyle = 'rgba(226,232,240,0.92)';
          c.font = '700 ' + (12 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.fillText('Radiation needs no medium at all', W / 2, 26 * dpr);
          c.font = '600 ' + (10 * dpr) + 'px system-ui, sans-serif';
          c.fillStyle = 'rgba(226,232,240,0.7)';
          c.fillText('This is how the Sun’s energy crosses 150 million km of vacuum to reach you', W / 2, H - 14 * dpr);
        }

        function frame(ts) {
          if (!el.isConnected) { cancelAnimationFrame(animRef.current); return; }
          try {
            var m = el.dataset.mode || 'conduction';
            if (m === 'conduction') {
              var dt = last ? Math.min(0.25, (ts - last) / 1000) : 0.016;
              step(dt * TIME_SCALE);
              drawBar(ts);
            } else if (m === 'convection') { drawConvection(ts); }
            else { drawRadiation(ts); }
          } catch (err) { console.error('Heat lab draw error:', err); }
          last = ts;
          animRef.current = requestAnimationFrame(frame);
        }
        animRef.current = requestAnimationFrame(frame);

        el._heatReset = reset;
        if (typeof ResizeObserver === 'function') {
          var ro = new ResizeObserver(size);
          ro.observe(el);
          roRef.current = ro;
        }
        return function () {
          cancelAnimationFrame(animRef.current);
          if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
        };
      }, [isDark]);

      // keep the canvas fed without re-creating the loop
      React.useEffect(function () {
        var el = canvasRef.current;
        if (!el) return;
        el.dataset.mode = mode;
        el.dataset.material = matId;
        el.dataset.materialB = matBId;
        el.dataset.race = raceOn ? 'on' : 'off';
        el.dataset.hot = String(hotEnd);
      }, [mode, matId, matBId, raceOn, hotEnd]);

      // ── Shared line chart. Both curves are the point of their module, and a
      //    row of numbers cannot show a plateau or an exponential tail. ──
      function drawChart(el, cfg) {
        if (!el) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var ow = el.offsetWidth || 560, oh = el.offsetHeight || 190;
        var W = el.width = Math.round(ow * dpr);
        var H = el.height = Math.round(oh * dpr);
        var c = el.getContext('2d');
        var padL = 42 * dpr, padR = 12 * dpr, padT = 14 * dpr, padB = 30 * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;

        c.clearRect(0, 0, W, H);
        c.fillStyle = isDark ? '#0b1120' : '#f8fafc';
        c.fillRect(0, 0, W, H);

        function px(v) { return padL + (v - cfg.xMin) / (cfg.xMax - cfg.xMin) * pw; }
        function py(v) { return padT + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * ph; }

        // gridlines and axis labels
        c.strokeStyle = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';
        c.lineWidth = Math.max(1, dpr);
        c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
        c.fillStyle = isDark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.9)';
        c.textAlign = 'right';
        c.textBaseline = 'middle';
        for (var g = 0; g <= 4; g++) {
          var yv = cfg.yMin + (cfg.yMax - cfg.yMin) * g / 4;
          var y = py(yv);
          c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
          c.fillText(Math.round(yv) + cfg.yUnit, padL - 5 * dpr, y);
        }
        c.textAlign = 'center';
        c.textBaseline = 'top';
        for (var gx = 0; gx <= 4; gx++) {
          var xv = cfg.xMin + (cfg.xMax - cfg.xMin) * gx / 4;
          c.fillText(Math.round(xv) + cfg.xUnit, px(xv), H - padB + 6 * dpr);
        }

        // shaded bands, used to mark the two latent plateaus
        (cfg.bands || []).forEach(function (b) {
          c.fillStyle = b.colour;
          c.fillRect(px(b.from), padT, px(b.to) - px(b.from), ph);
          c.save();
          c.fillStyle = b.label_colour || b.colour;
          c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'top';
          c.fillText(b.label, (px(b.from) + px(b.to)) / 2, padT + 4 * dpr);
          c.restore();
        });

        // series
        (cfg.series || []).forEach(function (s) {
          c.strokeStyle = s.colour;
          c.lineWidth = (s.width || 2) * dpr;
          if (s.dash) c.setLineDash([4 * dpr, 4 * dpr]); else c.setLineDash([]);
          c.beginPath();
          s.points.forEach(function (p, i) {
            var x = px(p[0]), y = py(p[1]);
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
          });
          c.stroke();
          c.setLineDash([]);
        });

        // marker for the current position
        if (cfg.marker) {
          c.fillStyle = cfg.marker.colour;
          c.beginPath();
          c.arc(px(cfg.marker.x), py(cfg.marker.y), 4 * dpr, 0, 6.2832);
          c.fill();
          c.strokeStyle = cfg.marker.colour + '80';
          c.lineWidth = dpr;
          c.beginPath(); c.moveTo(px(cfg.marker.x), padT); c.lineTo(px(cfg.marker.x), H - padB); c.stroke();
        }

        // axis frame last so nothing paints over it
        c.strokeStyle = isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
        c.lineWidth = Math.max(1, dpr);
        c.beginPath();
        c.moveTo(padL, padT); c.lineTo(padL, H - padB); c.lineTo(W - padR, H - padB);
        c.stroke();
      }

      // ── Module 2: cooling with a real R-value ────────────────────────
      var insMatId = d.insMatId || 'fibre';
      var insMat = MATERIALS.filter(function (m) { return m.id === insMatId; })[0] || MATERIALS[6];
      var thickness = typeof d.thickness === 'number' ? d.thickness : 10;   // mm
      function coolingCurve(mat, mm) {
        // A 350 ml mug at 90 C in a 20 C room, wrapped in `mm` of `mat`.
        var area = 0.045;                       // m^2 of mug wall
        var rWrap = (mm / 1000) / mat.k;        // R = L / k
        var rSurface = 0.12;                    // still-air film on the outside
        var U = 1 / (rWrap + rSurface);         // W/m^2-K
        var mass = 0.35, cW = 4186;
        var pts = [], temp = 90;
        for (var min = 0; min <= 60; min++) {
          pts.push(temp);
          var q = U * area * (temp - 20);       // watts
          temp -= (q * 60) / (mass * cW);       // one minute
        }
        return pts;
      }
      var curve = coolingCurve(insMat, thickness);
      var after60 = curve[curve.length - 1];

      React.useEffect(function () {
        if (after60 >= 65 && !d.insulationWin) upd({ insulationWin: true });
      }, [after60, d.insulationWin]);

      // ── Module 3: calorimetry ────────────────────────────────────────
      var sub1 = SUBSTANCES.filter(function (s) { return s.id === (d.sub1 || 'water'); })[0] || SUBSTANCES[0];
      var sub2 = SUBSTANCES.filter(function (s) { return s.id === (d.sub2 || 'iron'); })[0] || SUBSTANCES[5];
      var m1 = typeof d.m1 === 'number' ? d.m1 : 0.5;
      var m2 = typeof d.m2 === 'number' ? d.m2 : 0.5;
      var t1 = typeof d.t1 === 'number' ? d.t1 : 20;
      var t2 = typeof d.t2 === 'number' ? d.t2 : 90;
      var finalT = (m1 * sub1.c * t1 + m2 * sub2.c * t2) / (m1 * sub1.c + m2 * sub2.c);

      // ── Module 4: heating curve ──────────────────────────────────────
      var energyIn = typeof d.energyIn === 'number' ? d.energyIn : 0;   // kJ per kg
      function waterState(kJ) {
        var e = kJ * 1000;
        if (e < 2090 * 20) return { phase: 'Ice', temp: -20 + e / 2090, frac: 0 };
        e -= 2090 * 20;
        if (e < 334000) return { phase: 'Ice melting', temp: 0, frac: e / 334000 };
        e -= 334000;
        if (e < 4186 * 100) return { phase: 'Liquid water', temp: e / 4186, frac: 0 };
        e -= 4186 * 100;
        if (e < 2260000) return { phase: 'Water boiling', temp: 100, frac: e / 2260000 };
        e -= 2260000;
        return { phase: 'Steam', temp: 100 + e / 2010, frac: 0 };
      }
      var wstate = waterState(energyIn);

      React.useEffect(function () {
        if (wstate.phase === 'Steam' && !d.curveComplete) upd({ curveComplete: true });
      }, [wstate.phase, d.curveComplete]);

      // Sample the curve across the full energy range so the plateaus are visible
      var CURVE_MAX = 3100;
      var curvePts = [];
      for (var ce = 0; ce <= CURVE_MAX; ce += 10) curvePts.push([ce, waterState(ce).temp]);

      React.useEffect(function () {
        drawChart(curveRef.current, {
          xMin: 0, xMax: CURVE_MAX, yMin: -25, yMax: 160, xUnit: '', yUnit: '°',
          bands: [
            { from: 41.8, to: 375.8, colour: 'rgba(96,165,250,0.16)', label_colour: '#60a5fa', label: 'melting' },
            { from: 794.4, to: 3054.4, colour: 'rgba(251,146,60,0.16)', label_colour: '#fb923c', label: 'boiling' }
          ],
          series: [{ points: curvePts, colour: '#a78bfa', width: 2.4 }],
          marker: { x: energyIn, y: wstate.temp, colour: '#f472b6' }
        });
      }, [energyIn, isDark]);

      // ── Module 2 chart: this material against the two extremes ──
      React.useEffect(function () {
        var best = MATERIALS[MATERIALS.length - 1], worst = MATERIALS[0];
        function toPts(mat) {
          return coolingCurve(mat, thickness).map(function (v, i) { return [i, v]; });
        }
        drawChart(coolRef.current, {
          xMin: 0, xMax: 60, yMin: 20, yMax: 92, xUnit: '', yUnit: '°',
          bands: [{ from: 0, to: 60, colour: 'rgba(0,0,0,0)', label: '', label_colour: 'rgba(0,0,0,0)' }],
          series: [
            { points: toPts(worst), colour: '#f97316', width: 1.4, dash: true },
            { points: toPts(best), colour: '#c4b5fd', width: 1.4, dash: true },
            { points: toPts(insMat), colour: '#fbbf24', width: 2.6 }
          ],
          marker: { x: 60, y: after60, colour: '#fbbf24' }
        });
      }, [insMatId, thickness, isDark]);

      // ── 3D bay: keep the host viewer in step with theme and selection ──
      var pick3d = d.pick3d || null;
      var part3d = HEAT_3D_PARTS.filter(function (p) { return p.id === pick3d; })[0] || null;
      React.useEffect(function () {
        HEAT_VIEWER.sync({
          selected: pick3d,
          dark: isDark,
          contrast: ctx.theme === 'contrast',
          onPick: function (id) {
            upd({ pick3d: id });
            pushOnce('parts3d', id);
            var p = HEAT_3D_PARTS.filter(function (x) { return x.id === id; })[0];
            if (p && typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
          },
          onStatus: function (next) { setView3dStatus(next); }
        });
      }, [pick3d, isDark, ctx.theme]);

      // ── Composite wall: resistances in series ────────────────────────
      var wallStack = d.wallStack || ['brick', 'cavity', 'block', 'plaster'];
      var wallTotalR = WALL_SURFACE_R;
      wallStack.forEach(function (id) {
        var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0];
        if (L) wallTotalR += L.r;
      });
      var wallU = 1 / wallTotalR;                       // W/m²K
      var wallLoss = wallU * 100 * 19;                  // 100 m² of wall, 19 K indoor-outdoor gap
      // UK building regs want about 0.18 W/m²K for a new-build wall
      var wallTarget = 0.18;

      React.useEffect(function () {
        if (wallU <= wallTarget && !d.wallMet) upd({ wallMet: true });
      }, [wallU, d.wallMet]);

      // ── Entropy, by counting ──────────────────────────────────────────
      // The tool advertised "entropy" in its search aliases and never taught it.
      // Rather than hand-wave about disorder, count microstates directly: two
      // blocks of oscillators share a fixed pot of energy quanta, and
      //   ln(multiplicity) = ln C(q+N-1, q)
      // computed in logs because the raw numbers overflow a double almost at once.
      var ENT_NA = 60, ENT_NB = 60, ENT_Q = 80;
      function lnChoose(n, k) {
        if (k < 0 || k > n) return -Infinity;
        var s = 0;
        for (var i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
        return s;
      }
      function lnMultiplicity(q, N) { return lnChoose(q + N - 1, q); }
      var entSplit = typeof d.entSplit === 'number' ? d.entSplit : 4;   // quanta in block A
      var entPts = [], entPeak = -Infinity, entPeakAt = 0, eq;
      for (eq = 0; eq <= ENT_Q; eq++) {
        var lnW = lnMultiplicity(eq, ENT_NA) + lnMultiplicity(ENT_Q - eq, ENT_NB);
        entPts.push([eq, lnW]);
        if (lnW > entPeak) { entPeak = lnW; entPeakAt = eq; }
      }
      var entHere = lnMultiplicity(entSplit, ENT_NA) + lnMultiplicity(ENT_Q - entSplit, ENT_NB);
      // how many times more likely the even split is than the current one
      var entOddsLog10 = (entPeak - entHere) / Math.LN10;

      React.useEffect(function () {
        drawChart(entropyRef.current, {
          xMin: 0, xMax: ENT_Q, yMin: Math.max(0, entPeak - 60), yMax: entPeak + 4,
          xUnit: '', yUnit: '',
          series: [{ points: entPts, colour: '#f472b6', width: 2.4 }],
          marker: { x: entSplit, y: entHere, colour: '#fbbf24' }
        });
      }, [entSplit, isDark]);

      // ── Heat pumps: the engine run backwards ─────────────────────────
      var hpOut = typeof d.hpOut === 'number' ? d.hpOut : 2;    // outdoor °C
      var hpIn = typeof d.hpIn === 'number' ? d.hpIn : 21;      // indoor °C
      var hpTh = hpIn + 273.15, hpTc = hpOut + 273.15;
      var hpIdealCOP = hpTh > hpTc ? hpTh / (hpTh - hpTc) : Infinity;
      // Real units reach roughly 45% of the ideal figure across a season
      var hpRealCOP = hpIdealCOP * 0.45;

      // ── Module 5: engines ────────────────────────────────────────────
      var enginePick = typeof d.enginePick === 'number' ? d.enginePick : null;

      // ── Module 6: radiation is the one mechanism with a fourth-power law,
      //    which is why a small temperature rise changes so much. ──
      // 33 C is SKIN temperature. Core body temperature is 37 C, but skin is what
      // actually radiates, and using the core figure overstates the loss by a third.
      var radT = typeof d.radT === 'number' ? d.radT : 33;
      var SIGMA = 5.670374419e-8;
      function radiatedW(celsius, area, emissivity) {
        var K = celsius + 273.15;
        return (emissivity || 0.95) * SIGMA * (area || 1.8) * Math.pow(K, 4);
      }
      var radGross = radiatedW(radT, 1.8, 0.98);
      var radNet = radGross - radiatedW(20, 1.8, 0.98);
      // Wien's displacement law: where the emitted spectrum peaks
      var wienUm = 2897.77 / (radT + 273.15);

      // ── Module 7: thermal expansion ──────────────────────────────────
      var expMatId = d.expMatId || 'steel';
      var expMat = EXPANSION.filter(function (e) { return e.id === expMatId; })[0] || EXPANSION[0];
      var expLen = typeof d.expLen === 'number' ? d.expLen : 100;     // metres
      var expDT = typeof d.expDT === 'number' ? d.expDT : 40;         // kelvin swing
      var expDelta = expMat.alpha * expLen * expDT;                    // metres

      // ── shared UI helpers ────────────────────────────────────────────
      // Takes any number of children after the accent. Declaring this as
      // (accent, children) silently dropped every argument past the second and
      // rendered nothing but the heading.
      var card = function (accent) {
        var children = Array.prototype.slice.call(arguments, 1);
        // Spread as separate arguments, not as one array child: an array makes
        // React treat static siblings as a dynamic list and demand keys.
        return h.apply(null, ['div', {
          className: 'rounded-xl border p-3 mt-3',
          style: {
            borderColor: accent + '55',
            background: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.92)',
            boxShadow: '0 1px 2px rgba(15,23,42,0.05), 0 12px 28px -22px rgba(15,23,42,0.5)'
          }
        }].concat(children));
      };
      // Same card, plus the anchor the topic index jumps to. scroll-margin keeps
      // the heading clear of the sticky index bar instead of hiding under it.
      var sec = function (id, accent) {
        var children = Array.prototype.slice.call(arguments, 2);
        var node = card.apply(null, [accent].concat(children));
        return React.cloneElement(node, {
          id: 'htsec-' + id,
          'data-ht-sec': id,
          style: Object.assign({}, node.props.style, { scrollMarginTop: '188px' })
        });
      };
      var heading = function (accent, text) {
        return h('p', { className: 'text-xs font-black mb-2', style: { color: accent } }, text);
      };
      var pill = function (on, accent, label, onClick, ariaLabel) {
        return h('button', {
          key: label, type: 'button',
          'aria-pressed': on ? 'true' : 'false',
          'aria-label': ariaLabel || label,
          onClick: onClick,
          className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
          style: on
            ? { background: accent, color: '#0b1020', border: '1px solid ' + accent }
            : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
        }, label);
      };
      var slider = function (id, label, min, max, step, value, onChange, suffix) {
        return h('div', { className: 'flex items-center gap-2 mt-1.5' },
          h('label', { htmlFor: id, className: 'text-[11px] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
          h('input', {
            id: id, type: 'range', min: min, max: max, step: step, value: value,
            onChange: onChange, className: 'flex-1 h-6 accent-orange-500'
          }),
          h('span', { className: 'text-[11px] font-bold w-20 text-right', style: { color: isDark ? '#fdba74' : '#c2410c' } }, suffix)
        );
      };

      // A prose aria-label describes a chart's shape but never its numbers. This
      // gives the same data as a real table, for a screen reader or for anyone who
      // would rather read values than squint at a line.
      var dataTable = function (caption, cols, rows) {
        return h('div', { className: 'mt-2' },
          h('button', {
            type: 'button',
            'aria-expanded': showTables ? 'true' : 'false',
            onClick: function () { setShowTables(!showTables); },
            className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
            style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
          }, showTables ? '▾ Hide the numbers' : '▸ Show the numbers'),
          showTables ? h('div', { className: 'mt-2 overflow-x-auto' },
            h('table', { className: 'w-full text-[11px]', style: { borderCollapse: 'collapse' } },
              h('caption', { className: 'text-left text-[11px] mb-1', style: { color: isDark ? '#94a3b8' : '#64748b' } }, caption),
              h('thead', null, h('tr', null, cols.map(function (c) {
                return h('th', { key: c, scope: 'col', className: 'text-left py-1 pr-3 font-bold', style: { color: isDark ? '#cbd5e1' : '#475569', borderBottom: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)') } }, c);
              }))),
              h('tbody', null, rows.map(function (r, i) {
                return h('tr', { key: i }, r.map(function (cell, ci) {
                  return h('td', { key: ci, className: 'py-1 pr-3', style: { color: isDark ? '#e2e8f0' : '#334155', borderBottom: '1px solid ' + (isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.12)') } }, cell);
                }));
              }))
            )
          ) : null
        );
      };

      var MODES = [
        { id: 'conduction', label: 'Conduction', why: 'Particles jostle their neighbours. Needs direct contact, works best in solids.' },
        { id: 'convection', label: 'Convection', why: 'The fluid itself moves and carries its heat along with it.' },
        { id: 'radiation', label: 'Radiation', why: 'Infrared light. The only one that crosses a vacuum.' }
      ];
      var activeMode = MODES.filter(function (m) { return m.id === mode; })[0] || MODES[0];

      // ── topic index ──
      // Order here MUST match DOM order — the heading numbers are read off it.
      var HT_GROUPS = [
        { id: 'all', label: 'All' },
        { id: 'transfer', label: 'How heat moves' },
        { id: 'energy', label: 'Energy & temperature' },
        { id: 'engines', label: 'Engines & entropy' },
        { id: 'practice', label: 'Practice' }
      ];
      var HT_SECTIONS = [
        { id: 'conduction', grp: 'transfer', icon: '🔥', label: 'Three ways heat moves', kw: 'conduction convection radiation mechanism transfer race bar' },
        { id: 'insulation', grp: 'transfer', icon: '🧣', label: 'Insulation', kw: 'mug keep hot foam wool material conductivity lag cooling' },
        { id: 'wall', grp: 'transfer', icon: '🧱', label: 'Build a wall', kw: 'r-value resistance layers brick cavity plaster u-value adds up' },
        { id: 'range', grp: 'transfer', icon: '📊', label: 'Conductivity range', kw: 'orders of magnitude diamond copper air scale log bigger than it looks' },
        { id: 'mixing', grp: 'energy', icon: '⚖️', label: 'Mix two things', kw: 'final temperature calorimetry specific heat capacity equilibrium hot cold' },
        { id: 'heatingcurve', grp: 'energy', icon: '♨️', label: 'The heating curve', kw: 'latent heat fusion vaporisation plateau melting boiling phase change' },
        { id: 'engines', grp: 'engines', icon: '⚙️', label: 'Why no engine reaches 100%', kw: 'carnot efficiency limit petrol diesel turbine hot cold reservoir' },
        { id: 'convection3d', grp: 'transfer', icon: '🧊', label: 'Convection in 3D', kw: 'three dimensional rolling cell plume buoyancy turn it over simulation' },
        { id: 'radiation', grp: 'transfer', icon: '📡', label: 'Radiation & the fourth power', kw: 'stefan boltzmann t4 emissivity infrared black body vacuum sun' },
        { id: 'expansion', grp: 'energy', icon: '📏', label: 'Thermal expansion', kw: 'bridges gaps rails coefficient linear expand contract buckle' },
        { id: 'spot', grp: 'practice', icon: '🌍', label: 'Spot the mechanism', kw: 'quiz practice identify scenario which one test yourself' },
        { id: 'entropy', grp: 'engines', icon: '🎲', label: 'Entropy', kw: 'second law disorder one way arrow of time irreversible microstates' },
        { id: 'heatpumps', grp: 'engines', icon: '🔄', label: 'Heat pumps', kw: 'cop coefficient of performance reverse fridge air source ground heating' }
      ];
      var htQuery = (d.htQuery || '').trim().toLowerCase();
      var htGroup = d.htGroup || 'all';
      function htMatches(s) {
        if (htGroup !== 'all' && s.grp !== htGroup) return false;
        if (!htQuery) return true;
        return (s.id + ' ' + s.label + ' ' + s.kw).toLowerCase().indexOf(htQuery) !== -1;
      }
      var htVisible = HT_SECTIONS.filter(htMatches);
      function htGoTo(s) {
        var target = typeof document !== 'undefined' && document.getElementById('htsec-' + s.id);
        if (target) {
          var rm = !!(typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
          try { target.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); }
          catch (e) { target.scrollIntoView(); }
        }
        if (typeof announceToSR === 'function') announceToSR('Jumped to ' + s.label + '.');
      }
      var htIndex = h('nav', {
        'aria-label': 'Heat lab topics',
        className: 'rounded-xl border px-2.5 py-2 mt-1',
        style: {
          position: 'sticky', top: 0, zIndex: 30,
          borderColor: 'rgba(251,146,60,0.4)',
          background: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(6px)'
        }
      },
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('span', { className: 'text-[11px] font-black', style: { color: isDark ? '#fdba74' : '#c2410c' } },
            '🧭 ' + HT_SECTIONS.length + ' topics'),
          h('label', { htmlFor: 'ht-topic-search', className: 'sr-only' }, 'Search topics'),
          h('input', {
            id: 'ht-topic-search', type: 'search', value: d.htQuery || '',
            placeholder: 'Search topics…',
            'aria-label': 'Search the ' + HT_SECTIONS.length + ' topics by name or keyword',
            onChange: function (e) { upd({ htQuery: e.target.value }); },
            className: 'flex-1 min-w-[8rem] rounded-lg px-2 py-1 text-[11px]',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)',
              color: isDark ? '#e2e8f0' : '#1e293b',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
            }
          }),
          h('span', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            htVisible.length === HT_SECTIONS.length ? 'showing all' : 'showing ' + htVisible.length)
        ),
        h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
          HT_GROUPS.map(function (g) {
            var n = g.id === 'all' ? HT_SECTIONS.length : HT_SECTIONS.filter(function (s) { return s.grp === g.id; }).length;
            return pill(htGroup === g.id, '#fb923c', g.label + ' (' + n + ')', function () {
              upd({ htGroup: g.id });
            }, 'Show ' + g.label + ', ' + n + ' topics');
          })
        ),
        // Cap the list height: 13 pills wrap to several rows, and an uncapped
        // sticky bar would sit on a third of a phone screen permanently.
        h('div', { className: 'flex flex-wrap gap-1 mt-1.5', style: { maxHeight: '92px', overflowY: 'auto' } },
          htVisible.length === 0
            ? h('span', { className: 'text-[11px]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                'No topic matches “' + (d.htQuery || '') + '”.')
            : htVisible.map(function (s) {
                return h('button', {
                  key: s.id, type: 'button',
                  onClick: function () { htGoTo(s); },
                  'aria-label': 'Jump to ' + s.label,
                  className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                  style: {
                    background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(251,146,60,0.09)',
                    color: isDark ? '#e2e8f0' : '#334155',
                    border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(251,146,60,0.35)')
                  }
                }, s.icon + ' ' + (HT_SECTIONS.indexOf(s) + 1) + '. ' + s.label);
              })
        )
      );

      return h('div', { 'data-heat-lab': 'true', className: 'max-w-5xl mx-auto animate-in fade-in duration-200' },

        // ── header ──
        h('div', { className: 'relative overflow-hidden rounded-xl border mb-1 px-3 py-2.5', style: { background: 'linear-gradient(115deg, #2a0f04 0%, #451a03 46%, #0c1a2e 100%)', borderColor: 'rgba(251,146,60,0.4)' } },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            ArrowLeft ? h('button', {
              onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
              className: 'p-1.5 rounded-lg transition-colors',
              style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(226,232,240,0.18)' },
              'aria-label': t('stem.common.back_to_tools', 'Back to tools')
            }, h(ArrowLeft, { size: 18, className: 'text-slate-100' })) : null,
            h('div', null,
              h('h3', { className: 'text-lg font-black tracking-tight text-white' }, '🌡️ Heat & Thermodynamics Lab'),
              h('span', { className: 'text-xs', style: { color: 'rgba(253,186,116,0.9)' } }, 'Why heat moves, where it goes, and why you never get all of it back')
            )
          )
        ),

        htIndex,

        // ── 1. heat transfer ──
        sec('conduction', '#f97316',
          heading('#fb923c', '🔥 1. The three ways heat moves'),
          h('div', { role: 'group', 'aria-label': 'Heat transfer mechanism', className: 'flex flex-wrap gap-1.5 mb-2' },
            MODES.map(function (m) {
              return pill(mode === m.id, '#fb923c', m.label, function () {
                upd({ mode: m.id });
                pushOnce('modesSeen', m.id);
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(m.label + '. ' + m.why);
              }, 'Show ' + m.label);
            })
          ),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } }, activeMode.why),

          h('div', { className: 'rounded-lg overflow-hidden border', style: { borderColor: 'rgba(251,146,60,0.35)', height: '220px' } },
            h('canvas', {
              ref: canvasRef,
              tabIndex: 0,
              role: 'img',
              'aria-label': 'Heat transfer visualisation, currently showing ' + activeMode.label + '. ' + activeMode.why +
                (mode === 'conduction' ? ' The bar is ' + material.name + ', heated to ' + hotEnd + ' degrees Celsius at the left end. Use arrow keys to change the hot end temperature.' : ''),
              onKeyDown: function (e) {
                if (mode !== 'conduction') return;
                var step = 0;
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') step = 10;
                else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') step = -10;
                else return;
                e.preventDefault();
                var next = clamp(hotEnd + step, 30, 300);
                upd({ hotEnd: next });
                if (typeof announceToSR === 'function') announceToSR('Hot end ' + next + ' degrees Celsius.');
              },
              style: { width: '100%', height: '100%', display: 'block' }
            })
          ),

          mode === 'conduction' ? h('div', { className: 'mt-2' },
            h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
              h('button', {
                type: 'button',
                'aria-pressed': raceOn ? 'true' : 'false',
                'aria-label': raceOn ? 'Switch back to a single bar' : 'Race two materials side by side',
                onClick: function () {
                  upd({ raceOn: !raceOn });
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                  if (typeof announceToSR === 'function') {
                    announceToSR(raceOn ? 'Single bar.' : 'Racing ' + material.name + ' against ' + materialB.name + '. Both start at 20 degrees; the clock stops when the middle of each bar passes 100 degrees.');
                  }
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-black transition-colors',
                style: raceOn
                  ? { background: '#fb923c', color: '#0b1020', border: '1px solid #fb923c' }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, raceOn ? '⏱ Racing two bars' : '⏱ Race two materials'),
              h('button', {
                type: 'button',
                'aria-label': 'Restart the bars from room temperature',
                onClick: function () {
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                  if (typeof announceToSR === 'function') announceToSR('Bars reset to 20 degrees.');
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, '↺ Restart'),
              raceOn ? h('span', { className: 'text-[11px]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                'Predicted gap: about ' + Math.round((material.k / (material.rho * material.c)) / (materialB.k / (materialB.rho * materialB.c))) + '× — does the clock agree?') : null
            ),
            h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, raceOn ? 'Top bar' : 'Bar material'),
            h('div', { className: 'flex flex-wrap gap-1' },
              MATERIALS.map(function (m) {
                return pill(matId === m.id, m.colour, m.name, function () {
                  upd({ matId: m.id });
                  pushOnce('materialsTried', m.id);
                  var el = canvasRef.current;
                  if (el && el._heatReset) el._heatReset();
                  if (typeof beep === 'function') beep();
                }, 'Use a ' + m.name + ' bar');
              })
            ),
            raceOn ? h('div', { className: 'mt-2' },
              h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Bottom bar'),
              h('div', { className: 'flex flex-wrap gap-1' },
                MATERIALS.map(function (m) {
                  return pill(matBId === m.id, m.colour, m.name, function () {
                    upd({ matBId: m.id });
                    pushOnce('materialsTried', m.id);
                    var el = canvasRef.current;
                    if (el && el._heatReset) el._heatReset();
                    if (typeof beep === 'function') beep();
                  }, 'Race against a ' + m.name + ' bar');
                })
              )
            ) : null,
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              h('b', null, material.name + ': '), material.note),
            h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#fdba74' : '#c2410c' } },
              'k = ' + material.k + ' W/m·K   c = ' + material.c + ' J/kg·K   diffusivity = ' +
              (material.k / (material.rho * material.c) * 1e6).toFixed(2) + ' mm²/s'),
            slider('heat-hot-end', 'Hot end', 30, 300, 5, hotEnd,
              function (e) { upd({ hotEnd: parseFloat(e.target.value) }); }, hotEnd + ' °C')
          ) : null
        ),

        // ── 2. insulation ──
        sec('insulation', '#fbbf24',
          heading('#fbbf24', '🧣 2. Insulation: keep the mug hot'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A 350 ml mug of tea at 90 °C in a 20 °C room. Wrap it and see how much you can slow the loss. Getting it above 65 °C after a full hour earns the badge — only a genuine insulator manages that, and thickness alone will not rescue a metal.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            MATERIALS.map(function (m) {
              return pill(insMatId === m.id, m.colour, m.name, function () {
                upd({ insMatId: m.id });
                if (typeof beep === 'function') beep();
              }, 'Wrap the mug in ' + m.name);
            })
          ),
          slider('heat-thickness', 'Thickness', 1, 60, 1, thickness,
            function (e) { upd({ thickness: parseFloat(e.target.value) }); }, thickness + ' mm'),
          h('div', { className: 'mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2' },
            [['After 10 min', fmt(curve[10], 1) + ' °C'], ['After 30 min', fmt(curve[30], 1) + ' °C'],
             ['After 60 min', fmt(after60, 1) + ' °C'], ['R-value', ((thickness / 1000) / insMat.k).toFixed(3) + ' m²·K/W']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' } },
                h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: isDark ? '#fbbf24' : '#b45309' } }, p[1]));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg overflow-hidden border', style: { borderColor: 'rgba(251,191,36,0.35)', height: '190px' } },
            h('canvas', {
              ref: coolRef, role: 'img',
              'aria-label': 'Cooling curve over one hour. With ' + thickness + ' millimetres of ' + insMat.name +
                ' the tea falls from 90 degrees to ' + after60.toFixed(0) + ' degrees. The dashed lines show copper, the worst choice, and aerogel, the best, at the same thickness.',
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'Solid line: your choice. Dashed: copper (worst) and aerogel (best) at the same thickness. The curve is steepest at the start, because heat flow is proportional to the temperature gap.'),
          dataTable('Tea temperature every ten minutes, ' + thickness + ' mm of ' + insMat.name,
            ['Minutes', 'Your wrap', 'Copper', 'Aerogel'],
            [0, 10, 20, 30, 40, 50, 60].map(function (min) {
              return [String(min),
                coolingCurve(insMat, thickness)[min].toFixed(1) + ' °C',
                coolingCurve(MATERIALS[0], thickness)[min].toFixed(1) + ' °C',
                coolingCurve(MATERIALS[MATERIALS.length - 1], thickness)[min].toFixed(1) + ' °C'];
            })),
          h('p', { className: 'text-[11px] mt-2', style: { color: after60 >= 65 ? '#16a34a' : (isDark ? '#cbd5e1' : '#475569') } },
            after60 >= 65
              ? '✅ Still ' + fmt(after60, 1) + ' °C after an hour. Doubling the thickness halves the heat flow, but the still-air film on the outside sets a floor you cannot beat by wrapping alone.'
              : 'Down to ' + fmt(after60, 1) + ' °C. Try a material with a lower k, or more of it.')
        ),

        // ── 2b. composite wall ──
        sec('wall', '#84cc16',
          heading('#84cc16', '🧱 3. Build a wall: resistances add up'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A real wall is layers in series, and their R-values simply add. Tap to add or remove a layer and watch the U-value. New-build regulations here want 0.18 W/m²K or lower.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            WALL_LAYERS.map(function (L) {
              var count = wallStack.filter(function (x) { return x === L.id; }).length;
              return h('button', {
                key: L.id, type: 'button',
                'aria-label': 'Add a layer of ' + L.name + ', R-value ' + L.r + (count ? '. Currently ' + count + ' in the wall' : ''),
                onClick: function () {
                  upd({ wallStack: wallStack.concat([L.id]) });
                  pushOnce('wallTried', L.id);
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-2.5 py-2 rounded-lg text-[11px] font-bold transition-colors',
                style: { background: count ? 'rgba(132,204,22,0.18)' : (isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)'), color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (count ? '#84cc16' : (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')) }
              }, '+ ' + L.name + (count > 1 ? ' ×' + count : ''));
            })
          ),
          h('div', { role: 'list', 'aria-label': 'Wall layers from inside to outside', className: 'space-y-1' },
            wallStack.length === 0
              ? h('p', { className: 'text-[11px] italic', style: { color: isDark ? '#94a3b8' : '#64748b' } }, 'No layers yet. Even an empty opening has some resistance from the still air on each face.')
              : wallStack.map(function (id, i) {
                var L = WALL_LAYERS.filter(function (x) { return x.id === id; })[0];
                if (!L) return null;
                return h('div', { key: i + '-' + id, role: 'listitem', className: 'flex items-center gap-2 rounded-lg px-2.5 py-1.5', style: { background: isDark ? 'rgba(148,163,184,0.09)' : 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.3)' } },
                  h('span', { className: 'flex-1 text-[11px] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, L.name),
                  h('span', { className: 'text-[11px] font-mono', style: { color: '#84cc16' } }, 'R ' + L.r.toFixed(2)),
                  h('button', {
                    type: 'button',
                    'aria-label': 'Remove this layer of ' + L.name,
                    onClick: function () {
                      var next = wallStack.slice();
                      next.splice(i, 1);
                      upd({ wallStack: next });
                      if (typeof beep === 'function') beep();
                    },
                    className: 'min-h-11 px-2 rounded text-[11px] font-black',
                    style: { color: '#f43f5e', background: 'transparent', border: 'none' }
                  }, '✕')
                );
              })
          ),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            [['Total R', wallTotalR.toFixed(2) + ' m²K/W'], ['U-value', wallU.toFixed(3) + ' W/m²K'], ['Loss, 100 m² wall', fmt(wallLoss, 0) + ' W']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.32)' } },
                h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: isDark ? '#a3e635' : '#4d7c0f' } }, p[1]));
            })
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: wallU <= wallTarget ? '#16a34a' : (isDark ? '#e2e8f0' : '#334155') } },
            wallU <= wallTarget
              ? '✅ ' + wallU.toFixed(3) + ' W/m²K meets the 0.18 target. Notice how much of that came from one insulating layer — the brick and plaster contribute almost nothing.'
              : 'At ' + wallU.toFixed(3) + ' W/m²K this wall is above the 0.18 target. Adding more brick will barely move it. Which layer would you reach for — and how much of it? One 100 mm batt is not enough on its own.'),
          h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'R_total = R_surfaces + ΣR_layers = ' + wallTotalR.toFixed(2) + '   U = 1 / R_total')
        ),

        // ── 2c. how far apart are these materials? ──
        sec('range', '#f97316',
          heading('#fb923c', '📊 4. The range is bigger than it looks'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Conductivity is plotted on a logarithmic scale, because a linear one would squash everything below copper into a single line at the bottom.'),
          h('div', { role: 'list', 'aria-label': 'Thermal conductivity of each material', className: 'space-y-1' },
            MATERIALS.slice().sort(function (a, b) { return b.k - a.k; }).map(function (m) {
              // log scale across the full 0.015 to 401 W/m-K span
              var frac = (Math.log10(m.k) - Math.log10(0.01)) / (Math.log10(500) - Math.log10(0.01));
              return h('div', {
                key: m.id, role: 'listitem',
                'aria-label': m.name + ', ' + m.k + ' watts per metre kelvin',
                className: 'flex items-center gap-2'
              },
                h('span', { className: 'text-[11px] font-bold w-20 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, m.name),
                h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(2, frac * 100).toFixed(1) + '%', background: m.colour, borderRadius: '999px' } })),
                h('span', { className: 'text-[11px] font-mono w-16 text-right', style: { color: m.colour } }, m.k >= 1 ? m.k : m.k.toFixed(3))
              );
            })
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Copper conducts about ' + Math.round(MATERIALS[0].k / MATERIALS[MATERIALS.length - 1].k).toLocaleString() +
            ' times better than aerogel. Every bar is one step of ten, so neighbouring bars are further apart than they look.')
        ),

        // ── 3. calorimetry ──
        sec('mixing', '#38bdf8',
          heading('#38bdf8', '⚖️ 5. Mix two things: what temperature do you get?'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Energy lost by the hot one equals energy gained by the cold one. Predict the final temperature before you reveal it.'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            [[1, sub1, m1, t1, 'sub1', 'm1', 't1'], [2, sub2, m2, t2, 'sub2', 'm2', 't2']].map(function (row) {
              var n = row[0], sub = row[1];
              return h('div', { key: n, className: 'rounded-lg p-2', style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.28)' } },
                h('p', { className: 'text-[11px] font-black mb-1', style: { color: sub.colour } }, 'Sample ' + n + ': ' + sub.name),
                h('div', { className: 'flex flex-wrap gap-1 mb-1' },
                  SUBSTANCES.map(function (s) {
                    return pill(sub.id === s.id, s.colour, s.name, function () {
                      var patch = {}; patch[row[4]] = s.id; patch.reveal = false;
                      upd(patch); setRevealed(false);
                    }, 'Set sample ' + n + ' to ' + s.name);
                  })
                ),
                slider('heat-mass-' + n, 'Mass', 0.1, 2, 0.1, row[2],
                  function (e) { var p = {}; p[row[5]] = parseFloat(e.target.value); upd(p); setRevealed(false); }, row[2].toFixed(1) + ' kg'),
                slider('heat-temp-' + n, 'Start temp', 0, 100, 1, row[3],
                  function (e) { var p = {}; p[row[6]] = parseFloat(e.target.value); upd(p); setRevealed(false); }, row[3] + ' °C'),
                h('p', { className: 'text-[10px] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } }, 'c = ' + sub.c + ' J/kg·K'));
            })
          ),
          h('div', { className: 'flex flex-wrap items-end gap-2 mt-2' },
            h('div', { className: 'flex-1 min-w-[160px]' },
              h('label', { htmlFor: 'heat-predict', className: 'block text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Your prediction (°C)'),
              h('input', {
                id: 'heat-predict', type: 'number', value: predictText,
                placeholder: 'e.g. 45',
                onChange: function (e) { setPredictText(e.target.value); },
                className: 'w-full min-h-11 px-3 py-2 rounded-lg text-[11px]',
                style: { border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.32)' : 'rgba(100,116,139,0.3)'), background: isDark ? 'rgba(15,23,42,0.8)' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' }
              })),
            h('button', {
              type: 'button',
              'aria-label': 'Reveal the final mixing temperature',
              onClick: function () {
                setRevealed(true);
                var guess = parseFloat(predictText);
                if (!isNaN(guess) && Math.abs(guess - finalT) <= 2) {
                  upd({ mixWins: (d.mixWins || 0) + 1 });
                  if (typeof celebrate === 'function') celebrate();
                  if (typeof awardXP === 'function') awardXP('heatlab_mix', 10, 'Predicted a mixing temperature');
                  if (typeof announceToSR === 'function') announceToSR('Within two degrees. The answer is ' + finalT.toFixed(1) + ' degrees Celsius.');
                } else if (typeof announceToSR === 'function') {
                  announceToSR('The final temperature is ' + finalT.toFixed(1) + ' degrees Celsius.');
                }
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black text-white',
              style: { background: '#0284c7', border: '1px solid #0284c7' }
            }, revealed ? 'Recalculate' : 'Reveal')
          ),
          revealed ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(240,249,255,0.9)' } },
            h('p', { className: 'text-sm font-black', style: { color: '#0284c7' } }, 'Final temperature: ' + finalT.toFixed(1) + ' °C'),
            h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#cbd5e1' : '#475569' } },
              'Tf = (m₁c₁T₁ + m₂c₂T₂) / (m₁c₁ + m₂c₂)'),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              sub1.c === sub2.c
                ? 'Same substance both sides, so the answer sits at the mass-weighted midpoint.'
                : (sub1.c > sub2.c
                  ? sub1.name + ' has the larger specific heat, so it barely shifts while the ' + sub2.name.toLowerCase() + ' moves a long way. Specific heat is stubbornness against temperature change.'
                  : sub2.name + ' has the larger specific heat, so it barely shifts while the ' + sub1.name.toLowerCase() + ' moves a long way. Specific heat is stubbornness against temperature change.'))
          ) : null
        ),

        // ── 4. heating curve ──
        sec('heatingcurve', '#a78bfa',
          heading('#a78bfa', '♨️ 6. The heating curve: where the energy hides'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Pour energy into 1 kg of ice at −20 °C and watch the temperature. It does not rise steadily, and the reason is the most useful idea in this whole tool.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(167,139,250,0.35)', height: '190px' } },
            h('canvas', {
              ref: curveRef, role: 'img',
              'aria-label': 'Heating curve for one kilogram of water, temperature against energy added. ' +
                'The line rises through ice, then holds flat at zero degrees for 334 kilojoules while the ice melts, ' +
                'rises again through liquid water, then holds flat at 100 degrees for 2,260 kilojoules while it boils, ' +
                'then rises as steam. Currently at ' + fmt(energyIn, 0) + ' kilojoules, ' + wstate.temp.toFixed(0) + ' degrees, ' + wstate.phase + '.',
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          slider('heat-energy', 'Energy added', 0, 3100, 10, energyIn,
            function (e) { upd({ energyIn: parseFloat(e.target.value) }); }, fmt(energyIn, 0) + ' kJ'),
          h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'State'),
              h('p', { className: 'text-sm font-black', style: { color: '#a78bfa' } }, wstate.phase)),
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.35)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Temperature'),
              h('p', { className: 'text-sm font-black', style: { color: '#a78bfa' } }, wstate.temp.toFixed(1) + ' °C'))
          ),
          wstate.frac > 0 ? h('div', { className: 'mt-2' },
            h('div', { className: 'h-2 rounded-full overflow-hidden', style: { background: 'rgba(148,163,184,0.25)' } },
              h('div', { style: { height: '100%', width: (wstate.frac * 100).toFixed(0) + '%', background: '#a78bfa', borderRadius: '999px' } })),
            h('p', { className: 'text-[11px] mt-1 font-bold', style: { color: '#a78bfa' } },
              (wstate.frac * 100).toFixed(0) + '% of the way through the change of state — and the temperature is not moving at all.')
          ) : null,
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wstate.phase.indexOf('melting') !== -1 || wstate.phase.indexOf('boiling') !== -1
              ? 'The energy is going into breaking bonds between molecules, not speeding them up. Temperature measures average molecular motion, so it stalls until every last bond has gone.'
              : 'Here the energy raises the temperature directly. Notice the slope differs by state: ice warms about twice as fast per kilojoule as liquid water, because its specific heat is roughly half.'),
          h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'Melting 1 kg of ice: 334 kJ. Boiling 1 kg of water: 2,260 kJ — nearly seven times more.'),
          dataTable('Every stage of the curve, for 1 kg of water',
            ['Stage', 'Energy needed', 'Running total', 'Temperature'],
            [['Warm ice, −20 to 0 °C', '42 kJ', '42 kJ', '−20 → 0 °C'],
             ['Melt the ice', '334 kJ', '376 kJ', 'stays at 0 °C'],
             ['Warm water, 0 to 100 °C', '419 kJ', '795 kJ', '0 → 100 °C'],
             ['Boil the water', '2,260 kJ', '3,055 kJ', 'stays at 100 °C'],
             ['Superheat the steam', '90 kJ', '3,145 kJ', '100 → 145 °C']])
        ),

        // ── 5. engines ──
        sec('engines', '#34d399',
          heading('#34d399', '⚙️ 7. Why no engine reaches 100 percent'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Carnot showed the ceiling depends only on the two temperatures: η = 1 − Tc/Th, in kelvin. No amount of engineering beats it — this is the second law, not a design flaw.'),
          h('div', { className: 'space-y-1' },
            ENGINES.map(function (en, i) {
              var carnot = (1 - en.cold / en.hot) * 100;
              var on = enginePick === i;
              return h('button', {
                key: en.name, type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Hide' : 'Show') + ' details for ' + en.name + ', Carnot limit ' + carnot.toFixed(0) + ' percent, real efficiency ' + en.real + ' percent',
                onClick: function () {
                  upd({ enginePick: on ? null : i });
                  pushOnce('enginesSeen', en.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors',
                style: on
                  ? { background: 'rgba(52,211,153,0.16)', borderColor: '#34d399' }
                  : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'flex-1 text-[11px] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, en.name),
                  h('span', { className: 'text-[11px] font-mono', style: { color: '#34d399' } }, 'limit ' + carnot.toFixed(0) + '%'),
                  h('span', { className: 'text-[11px] font-mono', style: { color: isDark ? '#fbbf24' : '#b45309' } }, 'real ' + en.real + '%')
                ),
                on ? h('span', { className: 'block text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                  'Hot side ' + en.hot + ' K, cold side ' + en.cold + ' K. ' + en.note) : null
              );
            })
          ),
          // Where the fuel actually goes. The table gives two percentages; this
          // shows that the waste is the majority, which the numbers alone do not.
          enginePick !== null ? (function () {
            var en = ENGINES[enginePick];
            var carnot = (1 - en.cold / en.hot) * 100;
            var useful = en.real;
            // The body beats its Carnot figure because it is not a heat engine, so
            // splitting its fuel into "second law" and "engineering" losses would be
            // arithmetic nonsense (the three shares would come to 120%). Say why
            // instead of drawing a broken chart.
            if (useful > carnot) {
              return h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.45)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
                h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#f59e0b' } }, 'No energy-flow chart for this one — and that is the point'),
                h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                  en.name + ' converts ' + useful + '% of its chemical energy to work while the Carnot limit for its temperatures is only ' + carnot.toFixed(1) + '%. Nothing is broken: Carnot applies to engines that take in heat and dump some to a cold sink. Muscle skips that step and converts chemical energy directly, so the limit simply does not apply to it.'),
                h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#f59e0b' } },
                  '🤔 If the second law does not cap muscle at 4.8%, what does cap it at around 25%?')
              );
            }
            var lostToLaw = Math.max(0, 100 - carnot);
            var lostToEngineering = Math.max(0, carnot - useful);
            var bar = function (label, pct, colour, note) {
              return h('div', { className: 'mb-1.5' },
                h('div', { className: 'flex items-baseline gap-2' },
                  h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, label),
                  h('span', { className: 'text-[11px] font-black', style: { color: colour } }, pct.toFixed(0) + '%')),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden mt-0.5', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(1, pct) + '%', background: colour, borderRadius: '999px' } })),
                h('p', { className: 'text-[10px] mt-0.5', style: { color: isDark ? '#94a3b8' : '#64748b' } }, note));
            };
            return h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(52,211,153,0.4)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.85)' } },
              h('p', { className: 'text-[11px] font-black mb-2', style: { color: '#34d399' } }, 'Where 100 units of fuel energy go in a ' + en.name.toLowerCase()),
              bar('Useful work out', useful, '#34d399', 'What you actually paid for.'),
              bar('Lost to engineering', lostToEngineering, '#fbbf24', 'Friction, incomplete combustion, pumping losses. In principle recoverable — this is where engineers work.'),
              bar('Lost to the second law', lostToLaw, '#f87171', 'Waste heat that must be dumped to the cold sink. No design can recover this; it is the price of running between two temperatures.'),
              h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#34d399' } },
                '🤔 The only ways to raise the ceiling are a hotter source or a colder sink. Which is easier to change on Earth, and why?')
            );
          })() : null
        ),

        // ── 3D convection tank ──
        sec('convection3d', '#fb923c',
          heading('#fb923c', '🧊 8. Turn it over: convection in 3D'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A flat arrow diagram makes convection look like a circle. It is not — it is a closed roll wrapping all the way round the tank. Drag to rotate, or use the buttons and arrow keys.'),

          h('div', { className: 'relative rounded-xl overflow-hidden border', style: { borderColor: 'rgba(251,146,60,0.4)', height: '300px', background: isDark ? '#0b1220' : '#dfe6ef' } },
            h('div', { ref: heat3dAttach, style: { position: 'absolute', inset: 0 } }),
            view3dStatus !== 'ready' ? h('div', {
              role: 'status',
              className: 'absolute inset-0 flex items-center justify-center text-center p-4',
              style: { background: isDark ? 'rgba(11,18,32,0.92)' : 'rgba(223,230,239,0.92)' }
            },
              h('p', { className: 'text-[11px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                view3dStatus === 'loading' ? 'Loading the 3D tank…'
                  : (HEAT_3D_MISSING === 'host'
                    ? 'The 3D tank needs a newer host module than this build has. Everything else on this page still works — the 2D convection mode above shows the same loop in cross-section.'
                    : 'The 3D tank could not start on this device, usually because WebGL is unavailable or blocked. The 2D convection mode above shows the same loop in cross-section.'))
            ) : null
          ),

          h('div', { role: 'group', 'aria-label': '3D view controls', className: 'flex flex-wrap gap-1 mt-2' },
            [['◀', 'Rotate left', function () { HEAT_VIEWER.nudge(-0.3, 0); }],
             ['▶', 'Rotate right', function () { HEAT_VIEWER.nudge(0.3, 0); }],
             ['▲', 'Tilt up', function () { HEAT_VIEWER.nudge(0, 0.2); }],
             ['▼', 'Tilt down', function () { HEAT_VIEWER.nudge(0, -0.2); }],
             ['＋', 'Zoom in', function () { HEAT_VIEWER.zoom(-0.6); }],
             ['－', 'Zoom out', function () { HEAT_VIEWER.zoom(0.6); }],
             ['↺', 'Reset view', function () { HEAT_VIEWER.reset(); }]
            ].map(function (b) {
              return h('button', {
                key: b[1], type: 'button', 'aria-label': b[1], title: b[1],
                disabled: view3dStatus !== 'ready',
                onClick: b[2],
                className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
                style: {
                  background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)',
                  color: isDark ? '#e2e8f0' : '#334155',
                  border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)'),
                  opacity: view3dStatus === 'ready' ? 1 : 0.45
                }
              }, b[0]);
            })
          ),

          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Pick a part of the loop'),
          h('div', { className: 'flex flex-wrap gap-1' },
            HEAT_3D_PARTS.map(function (p) {
              var on = pick3d === p.id;
              return h('button', {
                key: p.id, type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Hide' : 'Show') + ' details for ' + p.label,
                onClick: function () {
                  upd({ pick3d: on ? null : p.id });
                  if (!on) {
                    pushOnce('parts3d', p.id);
                    if (typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
                  }
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
                style: on
                  ? { background: p.color, color: '#0b1020', border: '1px solid ' + p.color }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, p.label);
            })
          ),
          part3d ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: part3d.color + '80', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: part3d.color } }, part3d.label),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, part3d.desc)
          ) : h('p', { className: 'text-[11px] mt-2', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'Pick a part above, or click it directly in the 3D view.'),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#fb923c' } },
            '🤔 Rotate until you are looking straight down. What shape is the flow from above, and why can this never happen in a solid?')
        ),

        // ── 6. Stefan-Boltzmann ──
        sec('radiation', '#f472b6',
          heading('#f472b6', '📡 9. Radiation has a fourth-power law'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everything above absolute zero radiates. The power goes as T⁴ in kelvin, so a modest temperature rise makes a startling difference — and that single exponent explains thermal cameras, why embers glow, and why a small planet-wide warming matters.'),
          slider('heat-radt', 'Surface temp', -20, 900, 5, radT,
            function (e) { upd({ radT: parseFloat(e.target.value) }); }, radT + ' °C'),
          h('div', { className: 'mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2' },
            [['Radiated', fmt(radGross, 0) + ' W'], ['Net into a 20 °C room', fmt(radNet, 0) + ' W'],
             ['Peak wavelength', wienUm.toFixed(1) + ' µm']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.3)' } },
                h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: '#f472b6' } }, p[1]));
            })
          ),
          h('p', { className: 'text-[11px] mt-2 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'P = εσAT⁴   σ = 5.67 × 10⁻⁸ W/m²K⁴   A = 1.8 m² (a person)   ε = 0.98 (skin)   λmax = 2898/T'),
          h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            radT <= 40
              ? 'Bare skin sits near 33 °C, not the 37 °C of your core, and nets about ' + fmt(radNet, 0) + ' W into a cool room. Clothing cuts that sharply, which is why the figure usually quoted for a dressed person is nearer 100 W. It peaks at ' + wienUm.toFixed(0) + ' µm — deep infrared, invisible to your eye but exactly what a thermal camera is built to see.'
              : (radT < 500
                ? 'Doubling the absolute temperature multiplies radiated power by sixteen, not two. That is why an oven element at 300 °C throws far more heat than its temperature alone suggests — and why it still looks dark, since the peak is at ' + wienUm.toFixed(1) + ' µm, well outside visible light.'
                : 'The peak has moved to ' + wienUm.toFixed(1) + ' µm and the short-wavelength tail now reaches visible red, so the object glows — dull red, then orange, then white as it climbs. Nothing changed but the temperature.'))
        ),

        // ── 7. thermal expansion ──
        sec('expansion', '#22d3ee',
          heading('#22d3ee', '📏 10. Thermal expansion: why bridges have gaps'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Heat something and it grows. The effect is tiny per metre and per degree, which is exactly why it catches engineers out over long spans and wide temperature swings.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            EXPANSION.map(function (e) {
              return pill(expMatId === e.id, '#22d3ee', e.name, function () {
                upd({ expMatId: e.id });
                pushOnce('expTried', e.id);
                if (typeof beep === 'function') beep();
              }, 'Use ' + e.name);
            })
          ),
          slider('heat-explen', 'Length', 1, 1000, 1, expLen,
            function (e) { upd({ expLen: parseFloat(e.target.value) }); }, fmt(expLen, 0) + ' m'),
          slider('heat-expdt', 'Temp swing', 1, 120, 1, expDT,
            function (e) { upd({ expDT: parseFloat(e.target.value) }); }, expDT + ' K'),
          h('div', { className: 'mt-2 rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(34,211,238,0.09)', border: '1px solid rgba(34,211,238,0.35)' } },
            h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'It grows by'),
            h('p', { className: 'text-lg font-black', style: { color: '#22d3ee' } },
              expDelta >= 1 ? expDelta.toFixed(2) + ' m' : (expDelta * 1000).toFixed(1) + ' mm'),
            h('p', { className: 'text-[10px] font-mono mt-0.5', style: { color: isDark ? '#94a3b8' : '#64748b' } },
              'ΔL = αLΔT = ' + expMat.alpha.toExponential(1) + ' × ' + fmt(expLen, 0) + ' × ' + expDT)
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, expMat.name + ': '), expMat.note),
          expDelta > 0.05 ? h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: '#22d3ee' } },
            '🤔 That is ' + (expDelta * 1000).toFixed(0) + ' mm of movement. Where does it go if the ends are bolted down — and what happens to the material instead?') : null
        ),

        // ── 8. everyday cases ──
        sec('spot', '#60a5fa',
          heading('#60a5fa', '🌍 11. Spot the mechanism'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Each of these beats heat transfer in a different way. Pick one and name the mechanism before you read the answer.'),
          h('div', { className: 'space-y-1 max-h-56 overflow-y-auto pr-1' },
            EVERYDAY.map(function (ev, i) {
              var on = d.everydayPick === i;
              return h('button', {
                key: ev.name, type: 'button',
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Hide' : 'Show') + ' the explanation for ' + ev.name,
                onClick: function () {
                  upd({ everydayPick: on ? null : i });
                  if (!on) pushOnce('everydaySeen', ev.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors',
                style: on
                  ? { background: 'rgba(96,165,250,0.16)', borderColor: '#60a5fa' }
                  : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm', 'aria-hidden': 'true' }, ev.icon),
                  h('span', { className: 'flex-1' },
                    h('span', { className: 'block text-[11px] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, ev.name),
                    h('span', { className: 'block text-[11px]', style: { color: isDark ? '#cbd5e1' : '#64748b' } }, ev.mech)),
                  h('span', { className: 'text-[11px] font-bold', style: { color: '#60a5fa' } }, on ? '▾' : '›')
                ),
                on ? h('span', { className: 'block text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, ev.desc) : null
              );
            })
          )
        ),

        // ── entropy ──
        sec('entropy', '#f472b6',
          heading('#f472b6', '🎲 12. Entropy: why heat only goes one way'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Nothing forbids a cold cup warming itself by cooling the room — energy would still be conserved. It does not happen because of counting. Two blocks share 80 units of energy; the graph plots how many ways each split can be arranged.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(244,114,182,0.35)', height: '190px' } },
            h('canvas', {
              ref: entropyRef, role: 'img',
              'aria-label': 'Log of the number of arrangements against how the 80 energy units are split between two equal blocks. ' +
                'The curve peaks sharply at an even split of ' + entPeakAt + ' units each. ' +
                'The current split of ' + entSplit + ' units is ' + (entOddsLog10 > 1 ? '10 to the power ' + entOddsLog10.toFixed(0) + ' times' : 'only slightly') + ' less likely than the peak.',
              style: { width: '100%', height: '100%', display: 'block' }
            })),
          slider('heat-entropy', 'Units in block A', 0, ENT_Q, 1, entSplit,
            function (e) { upd({ entSplit: parseFloat(e.target.value) }); }, entSplit + ' / ' + ENT_Q),
          h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.32)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Arrangements at this split'),
              h('p', { className: 'text-sm font-black', style: { color: '#f472b6' } }, '10^' + (entHere / Math.LN10).toFixed(1))),
            h('div', { className: 'rounded-lg p-2.5 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(244,114,182,0.09)', border: '1px solid rgba(244,114,182,0.32)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Times rarer than even'),
              h('p', { className: 'text-sm font-black', style: { color: entOddsLog10 < 0.5 ? '#34d399' : '#fbbf24' } }, entOddsLog10 < 0.05 ? 'at the peak' : '10^' + entOddsLog10.toFixed(1)))
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            entOddsLog10 < 0.5
              ? 'You are at the peak — the two blocks are at the same temperature. Nothing stops the energy sloshing away from here, but there are so few ways to do it that you would never see it.'
              : 'This lopsided split is about 10^' + entOddsLog10.toFixed(0) + ' times rarer than the even one. That is the whole of the second law: heat flows toward the split with more arrangements, not because it is forced to, but because the alternatives are outnumbered beyond counting.'),
          h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'S = k ln Ω    Ω = C(q+N−1, q) for q units among N oscillators'),
          h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Entropy is not mess. It is how many ways the energy can be arranged — and spreading it out simply wins by an overwhelming margin.')
        ),

        // ── heat pumps ──
        sec('heatpumps', '#22d3ee',
          heading('#22d3ee', '🔄 13. Heat pumps: the engine in reverse'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Run a heat engine backwards and you spend work to move heat up the temperature gradient. Because you are moving heat rather than making it, you get out more than you put in — and no law is broken.'),
          slider('heat-hp-out', 'Outdoor temp', -20, 20, 1, hpOut,
            function (e) { upd({ hpOut: parseFloat(e.target.value) }); }, hpOut + ' °C'),
          slider('heat-hp-in', 'Indoor temp', 15, 26, 1, hpIn,
            function (e) { upd({ hpIn: parseFloat(e.target.value) }); }, hpIn + ' °C'),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            [['Ideal COP', isFinite(hpIdealCOP) ? hpIdealCOP.toFixed(1) : '∞', '#22d3ee'],
             ['Realistic COP', hpRealCOP.toFixed(1), '#0891b2'],
             ['Heat per 1 kW in', hpRealCOP.toFixed(1) + ' kW', '#f59e0b']
            ].map(function (p) {
              return h('div', { key: p[0], className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(34,211,238,0.09)', border: '1px solid rgba(34,211,238,0.32)' } },
                h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, p[0]),
                h('p', { className: 'text-sm font-black', style: { color: p[2] } }, p[1]));
            })
          ),
          h('p', { className: 'text-[11px] mt-2 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'COP_ideal = T_hot / (T_hot − T_cold) = ' + hpTh.toFixed(0) + ' / ' + (hpTh - hpTc).toFixed(0) + ' K'),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'An electric bar heater is exactly 1.0: every joule of electricity becomes one joule of heat, and it cannot do better. This heat pump delivers ' + hpRealCOP.toFixed(1) + ' — roughly ' + Math.round(hpRealCOP * 100) + '% of a bar heater\'s output for the same electricity, because most of the heat was already outside and only needed carrying in.'),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: hpOut <= -10 ? '#fbbf24' : (isDark ? '#cbd5e1' : '#475569') } },
            hpOut <= -10
              ? '⚠️ Notice what the cold does. As the outdoor temperature falls the gap widens, the COP collapses, and the pump has to work far harder for the same warmth. This is the real engineering problem with heat pumps in cold climates, and it falls straight out of the Carnot expression.'
              : 'Drag the outdoor temperature down towards −20 °C and watch what happens to the COP. The reason is the same denominator that caps every heat engine.'),
          h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: '#22d3ee' } },
            '🤔 A fridge is the same machine pointed the other way. Where does the heat it removes actually go, and why does leaving the door open warm the kitchen?')
        ),

        // ── where this goes next ──
        // Four tools in this lab lean hard on heat and had nowhere to point back to.
        sec('next', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🔗 Take this somewhere'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every one of these runs on the ideas above. Open one and look for them.'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [{ id: 'renewablesLab', icon: '⚡', name: 'Renewables Lab', why: 'Every thermal power source is a heat engine. Carnot sets the ceiling on all of them.' },
             { id: 'plateTectonics', icon: '🌋', name: 'Plate Tectonics', why: 'Mantle convection is the same roll as the 3D tank, running for hundreds of millions of years.' },
             { id: 'weldLab', icon: '⚒️', name: 'WeldLab', why: 'Heat input, conduction away from the bead and thermal expansion decide whether a weld holds.' },
             { id: 'kitchenLab', icon: '🍳', name: 'Kitchen Lab', why: 'Conduction, convection and radiation are three ways to cook, and specific heat is why oil burns you worse than water.' }
            ].map(function (b) {
              return h('button', {
                key: b.id, type: 'button',
                'aria-label': 'Open ' + b.name + '. ' + b.why,
                onClick: function () {
                  pushOnce('bridged', b.id);
                  if (typeof setStemLabTool === 'function') setStemLabTool(b.id);
                },
                className: 'text-left rounded-lg p-2.5 border transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                  h('span', { className: 'text-[11px] font-black', style: { color: isDark ? '#fff' : '#1e293b' } }, b.name),
                  h('span', { className: 'ml-auto text-[11px] font-bold', style: { color: '#94a3b8' } }, '→')),
                h('span', { className: 'block text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, b.why)
              );
            })
          )
        ),

        h('p', { className: 'text-[10px] mt-3 text-center', style: { color: isDark ? '#64748b' : '#94a3b8' } },
          'Models are real: 1-D heat equation, R-values, Q = mcΔT, latent heats of water, and the Carnot limit. Figures are order-of-magnitude accurate for teaching, not for engineering design.')
      );
    }
  });
})();
