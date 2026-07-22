// ═══════════════════════════════════════════
// stem_tool_galaxy.js — Galaxy Explorer Plugin
// Standalone plugin extracted from stem_tool_science.js
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


  // ── Audio (auto-injected) ──
  var _galAC = null;
  function getGalAC() { if (!_galAC) { try { _galAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_galAC && _galAC.state === "suspended") { try { _galAC.resume(); } catch(e) {} } return _galAC; }
  function galTone(f,d,tp,v) { var ac = getGalAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxGalClick() { galTone(600, 0.03, "sine", 0.04); }
  function sfxGalSuccess() { galTone(523, 0.08, "sine", 0.07); setTimeout(function() { galTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { galTone(784, 0.1, "sine", 0.08); }, 140); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-galaxy')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-galaxy';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ 🔬 galaxy (galaxy) ═══
  window.StemLab.registerTool('galaxy', {
    icon: "🌌",
    label: "Galaxy Explorer",
    desc: "Explore galaxy types, stellar lifecycles, star classification, and metallicity in an interactive 3D Milky Way simulation.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'toggle_layers', label: 'Toggle 3 galaxy visualization layers', icon: '🌌', check: function(d) { return Object.keys(d.layersToggled || {}).length >= 3; }, progress: function(d) { return Object.keys(d.layersToggled || {}).length + '/3'; } },
      { id: 'view_lifecycle', label: 'Explore stellar lifecycle', icon: '⭐', check: function(d) { return d.showLifecycle || false; }, progress: function(d) { return d.showLifecycle ? 'Viewing!' : 'Toggle lifecycle'; } },
      { id: 'rotation_modes', label: 'Compare 2 galaxy rotation models', icon: '🌀', check: function(d) { return Object.keys(d.rotTried || {}).length >= 2; }, progress: function(d) { return Object.keys(d.rotTried || {}).length + '/2'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      // WebXR: "Enter VR" shows ONLY with a headset present, reactive to
      // connect/unplug (devicechange) — fly through the galaxy at room scale.
      var _xrSup = React.useState(false); var xrSupported = _xrSup[0]; var setXrSupported = _xrSup[1];
      React.useEffect(function() {
        var alive = true;
        var check = function() { try { if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then(function(ok){ if (alive) setXrSupported(!!ok); }).catch(function(){}); } catch(e){} };
        check();
        var dc = function() { check(); };
        try { if (navigator.xr && navigator.xr.addEventListener) navigator.xr.addEventListener('devicechange', dc); } catch(e){}
        return function() { alive = false; try { if (navigator.xr && navigator.xr.removeEventListener) navigator.xr.removeEventListener('devicechange', dc); } catch(e){} };
      }, []);
      var ensureAlloVR = function(cb) {
        if (window.AlloModules && window.AlloModules.AlloVR) { cb(window.AlloModules.AlloVR); return; }
        var base = 'https://alloflow-cdn.pages.dev/', q = '';
        try {
          var scr = document.querySelectorAll('script[src]');
          for (var i = 0; i < scr.length; i++) {
            var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:allo_vr_module|prim3d_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
            if (m) { base = m[1]; q = m[2] || ''; break; }
          }
        } catch (e) {}
        try {
          var s = document.createElement('script'); s.src = base + 'allo_vr_module.js' + q; s.async = true;
          s.onload = function(){ cb(window.AlloModules && window.AlloModules.AlloVR); };
          s.onerror = function(){ cb(null); };
          document.head.appendChild(s);
        } catch (e) { cb(null); }
      };
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      // i18n: __alloT(key, englishFallback) → ctx.t if available, else the English string.
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var renderTutorial = ctx.renderTutorial || function() { return null; };
      var _tutGalaxy = ctx._tutGalaxy || [];

      // ── Tool body (galaxy) ──
      return (function() {
var d = labToolData.galaxy || {};
if (!window._galaxyHasLoadedOnce) {
    window._galaxyHasLoadedOnce = true;
    var allowedGalaxyModes = { galaxy: true, blackHole: true, star: true, metalHunt: true, realSky: true };
    if (d.simMode && !allowedGalaxyModes[d.simMode]) {
        setTimeout(function() { ctx.setToolData(function(prev) { return Object.assign({}, prev, { galaxy: Object.assign({}, prev.galaxy || {}, {simMode: 'galaxy'})}); })}, 10);
        d.simMode = 'galaxy';
    }
}

          var patchGalaxy = function (patch) { setLabToolData(function (prev) { return Object.assign({}, prev, { galaxy: Object.assign({}, prev.galaxy || {}, patch) }); }); };
          var upd = function (key, val) { patchGalaxy((function () { var o = {}; o[key] = val; return o; })()); };



          // ── Layer toggle defaults ──

          var layers = d.layers || { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false };

          var starCount = d.starCount || 25000;

          var cosmicAge = d.cosmicAge !== undefined ? d.cosmicAge : 10;

          var showLifecycle = d.showLifecycle || false;

          var lifecycleMass = d.lifecycleMass !== undefined ? d.lifecycleMass : 1;
          var activeStage = d.activeStage || 'main_sequence';

          var showSNAnim = d.showSNAnim || false;

          var galaxyType = d.galaxyType || 'barredSpiral';

          var simMode = d.simMode || 'galaxy';

          var blackHoleSpin = d.blackHoleSpin !== undefined ? d.blackHoleSpin : 0.72;
          var blackHoleDisk = d.blackHoleDisk !== undefined ? d.blackHoleDisk : 0.78;
          var blackHolePaused = !!d.blackHolePaused;
          var blackHoleReducedMotion = false;
          try { blackHoleReducedMotion = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
          var blackHoleMotionAllowed = d.blackHoleMotionAllowed === true || !blackHoleReducedMotion;
          var blackHoleEffectivePaused = blackHolePaused || !blackHoleMotionAllowed;
          var blackHoleDropObject = d.blackHoleDropObject || 'probe';
          var blackHoleMassMode = d.blackHoleMassMode || 'stellar';

          var rotMode = d.rotMode || 'flat';

          var observeMode = d.observeMode || 'visible';

          var dopplerVelocity = d.dopplerVelocity !== undefined ? d.dopplerVelocity : 0;

          var realSkyTargetKey = d.realSkyTarget || 'm31';

          var realSkySurveyKey = d.realSkySurvey || 'P/DSS2/color';

          var realSkyCatalogKey = d.realSkyCatalog || 'simbad';

          var realSkyStatus = d.realSkyStatus || 'idle';

          var realSkyMessage = d.realSkyMessage || '';

          var realSkyRetry = d.realSkyRetry || 0;



          // ── Star type data (OBAFGKM Harvard classification) ──

          var STAR_TYPES = [

            { id: 'O', label: t('stem.galaxy.otype'), color: '#9bb0ff', temp: '30,000+', pct: 0.003, example: 'Naos', desc: __alloT('stem.galaxy.otype_desc', 'Extremely hot, blue, massive. Rarest type \u2014 short lives of only a few million years.'), whyItMatters: __alloT('stem.galaxy.otype_why', 'O-type stars produce most of a galaxy\'s ultraviolet light and ionize surrounding gas, creating the glowing emission nebulae we see. Their supernovae seed the universe with heavy elements like iron and gold.'), luminosity: '30,000-1,000,000x Sun', mass: '16-150 M\u2609', lifetime: '1-10 Myr' },

            { id: 'B', label: t('stem.galaxy.btype'), color: '#aabfff', temp: '10,000-30,000', pct: 0.13, example: 'Rigel', desc: __alloT('stem.galaxy.btype_desc', 'Blue-white giants. Often found in young OB associations and spiral arms.'), whyItMatters: __alloT('stem.galaxy.btype_why', 'B-type stars trace the spiral arms of galaxies because they are short-lived. Astronomers use them as markers for galactic structure and recent star formation.'), luminosity: '25-30,000x Sun', mass: '2.1-16 M\u2609', lifetime: '10-100 Myr' },

            { id: 'A', label: t('stem.galaxy.atype'), color: '#cad7ff', temp: '7,500-10,000', pct: 0.6, example: 'Sirius', desc: __alloT('stem.galaxy.atype_desc', 'White stars with strong hydrogen absorption lines. Many are binary systems.'), whyItMatters: __alloT('stem.galaxy.atype_why', 'A-type stars like Sirius were among the first to have their spectra analyzed, helping astronomers develop the stellar classification system we use today.'), luminosity: '5-25x Sun', mass: '1.4-2.1 M\u2609', lifetime: '1-2 Gyr' },

            { id: 'F', label: t('stem.galaxy.ftype'), color: '#f8f7ff', temp: '6,000-7,500', pct: 3, example: 'Procyon', desc: __alloT('stem.galaxy.ftype_desc', 'Yellow-white. Transition zone where convection begins in the outer layer.'), whyItMatters: __alloT('stem.galaxy.ftype_why', 'F-type stars are interesting for exoplanet searches because they have habitable zones and lifespans long enough for complex life to potentially develop.'), luminosity: '1.5-5x Sun', mass: '1.04-1.4 M\u2609', lifetime: '2-4 Gyr' },

            { id: 'G', label: t('stem.galaxy.gtype'), color: '#fff4ea', temp: '5,200-6,000', pct: 7.6, example: 'Sun', desc: __alloT('stem.galaxy.gtype_desc', 'Our Sun is a G2V star! Yellow stars with lifespans of ~10 billion years.'), whyItMatters: __alloT('stem.galaxy.gtype_why', 'G-type stars like our Sun prove that modest stars can nurture life. Their 10-billion-year lifespan gives plenty of time for biological evolution.'), luminosity: '0.6-1.5x Sun', mass: '0.8-1.04 M\u2609', lifetime: '10 Gyr' },

            { id: 'K', label: t('stem.galaxy.ktype'), color: '#ffd2a1', temp: '3,700-5,200', pct: 12.1, example: 'Arcturus', desc: __alloT('stem.galaxy.ktype_desc', 'Orange stars. Many have habitable zones \u2014 prime candidates for exoplanet searches.'), whyItMatters: __alloT('stem.galaxy.ktype_why', 'K-type stars are considered the best candidates for finding habitable exoplanets\u2014they are stable, long-lived, and common enough to offer many opportunities.'), luminosity: '0.08-0.6x Sun', mass: '0.45-0.8 M\u2609', lifetime: '15-30 Gyr' },

            { id: 'M', label: t('stem.galaxy.mtype'), color: '#ffcc6f', temp: '2,400-3,700', pct: 76.5, example: 'Proxima Centauri', desc: __alloT('stem.galaxy.mtype_desc', 'Red dwarfs \u2014 76% of all stars! Extremely long-lived (trillions of years).'), whyItMatters: __alloT('stem.galaxy.mtype_why', 'M-type red dwarfs will be the last stars shining in the universe. Proxima Centauri b, a potentially habitable exoplanet, orbits one of these stars\u2014our closest neighbor!'), luminosity: '0.001-0.08x Sun', mass: '0.08-0.45 M\u2609', lifetime: '100+ Gyr' }

          ];

          var HYDROGEN_FUSION_LIMIT = 0.08;
          var M_DWARF_LIMIT = 0.45;

          function spectralTypeForMass(mass) {
            if (mass < HYDROGEN_FUSION_LIMIT) return null;
            return mass < M_DWARF_LIMIT ? 'M' : mass < 0.8 ? 'K' : mass < 1.04 ? 'G' : mass < 1.4 ? 'F' : mass < 2.1 ? 'A' : mass < 16 ? 'B' : 'O';
          }

          function lifecycleMassCategory(mass) {
            if (mass < HYDROGEN_FUSION_LIMIT) return 'Brown dwarf';
            if (mass < M_DWARF_LIMIT) return 'Red dwarf';
            if (mass < 0.8) return 'Orange K-type star';
            if (mass < 1.04) return 'Sun-like G-type star';
            if (mass < 1.4) return 'Yellow-white F-type star';
            if (mass < 2.1) return 'White A-type star';
            if (mass < 8) return 'Hot B-type star';
            if (mass < 25) return 'Massive star';
            return 'Very massive O-type star';
          }

          function lifecycleMassBadgeClass(mass) {
            return mass < HYDROGEN_FUSION_LIMIT ? "bg-stone-800 text-stone-300 border border-stone-600" :
              mass < M_DWARF_LIMIT ? "bg-red-900/60 text-red-300 border border-red-700/50" :
              mass < 0.8 ? "bg-orange-900/60 text-orange-300 border border-orange-600/50" :
              mass < 1.04 ? "bg-amber-900/60 text-amber-300 border border-amber-600/50" :
              mass < 2.1 ? "bg-blue-900/60 text-blue-300 border border-blue-600/50" :
              mass < 8 ? "bg-sky-900/60 text-sky-300 border border-sky-600/50" :
              mass < 25 ? "bg-violet-900/60 text-violet-300 border border-violet-600/50" :
              "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-600/50";
          }

          function lifecycleMassHint(mass) {
            if (mass < HYDROGEN_FUSION_LIMIT) return "Below sustained hydrogen fusion";
            if (mass < M_DWARF_LIMIT) return "Lives for trillions of years";
            if (mass < 0.8) return "Stable, long-lived main sequence star";
            if (mass < 1.04) return "Lives roughly 10 billion years";
            if (mass < 2.1) return "Hotter and shorter-lived than the Sun";
            if (mass < 8) return "Burns bright for tens to hundreds of millions of years";
            if (mass < 25) return "Core collapse can leave a neutron star";
            return "Core collapse can form a black hole";
          }



          // ── Nebulae + deep-sky objects (expanded from 4 to 8) ──

          var NEBULAE = [

            { name: t('stem.galaxy.orion_nebula'), x: 0.35, y: 0.02, z: 0.15, r: 0.08, color: '#ff6b9d', type: 'Emission', dist: '1,344 ly', desc: __alloT('stem.galaxy.orion_nebula_desc', 'Stellar nursery 1,344 light-years away. Visible to the naked eye. Contains the Trapezium star cluster.') },

            { name: t('stem.galaxy.eagle_nebula'), x: -0.2, y: 0.01, z: -0.25, r: 0.06, color: '#7c6dff', type: 'Emission', dist: '7,000 ly', desc: __alloT('stem.galaxy.eagle_nebula_desc', 'Home of the Pillars of Creation. Star-forming region 7,000 light-years from Earth.') },

            { name: t('stem.galaxy.crab_nebula'), x: 0.4, y: 0.05, z: -0.1, r: 0.05, color: '#00d4aa', type: 'Supernova Remnant', dist: '6,500 ly', desc: __alloT('stem.galaxy.crab_nebula_desc', 'Supernova remnant from 1054 AD. Contains a pulsar spinning 30x per second.') },

            { name: t('stem.galaxy.carina_nebula'), x: -0.3, y: -0.02, z: 0.3, r: 0.07, color: '#ff9f43', type: 'Emission', dist: '8,500 ly', desc: __alloT('stem.galaxy.carina_nebula_desc', 'One of the largest nebulae. Contains Eta Carinae, a hypergiant 4 million times brighter than the Sun.') },

            { name: t('stem.galaxy.helix_nebula'), x: 0.25, y: -0.01, z: -0.3, r: 0.05, color: '#00bcd4', type: 'Planetary', dist: '655 ly', desc: __alloT('stem.galaxy.helix_nebula_desc', 'The "Eye of God." A planetary nebula \u2014 the outer shell of a dying Sun-like star.') },

            { name: t('stem.galaxy.ring_nebula'), x: -0.15, y: 0.03, z: 0.2, r: 0.04, color: '#e040fb', type: 'Planetary', dist: '2,283 ly', desc: __alloT('stem.galaxy.ring_nebula_desc', 'Classic planetary nebula in Lyra. The central white dwarf is visible at high zoom.') },

            { name: t('stem.galaxy.horsehead_nebula'), x: 0.32, y: 0.01, z: 0.05, r: 0.04, color: '#8d6e63', type: 'Dark', dist: '1,375 ly', desc: __alloT('stem.galaxy.horsehead_nebula_desc', 'Dark nebula silhouetted against the emission nebula IC 434. An iconic astronomical object.') },

            { name: t('stem.galaxy.lagoon_nebula'), x: -0.1, y: -0.01, z: -0.15, r: 0.06, color: '#ef5350', type: 'Emission', dist: '4,100 ly', desc: __alloT('stem.galaxy.lagoon_nebula_desc', 'One of the brightest emission nebulae. Visible with binoculars in Sagittarius.') }

          ];



          // ── Galaxy type definitions ──

          var GALAXY_TYPES = {

            barredSpiral: { label: t('stem.galaxy.barred_spiral'), icon: '\uD83C\uDF00', desc: __alloT('stem.galaxy.barred_spiral_desc', 'Like our Milky Way. A central bar of stars with spiral arms winding outward. ~60% of spirals have bars.'), example: 'Milky Way, NGC 1300', arms: 4, barLength: 0.15, windTightness: 2.5 },

            grandDesign: { label: t('stem.galaxy.grand_design_spiral'), icon: '\uD83C\uDF00', desc: __alloT('stem.galaxy.grand_design_spiral_desc', 'Prominent, well-defined spiral arms. Usually triggered by gravitational interaction with a companion galaxy.'), example: 'M51 (Whirlpool), M81', arms: 2, barLength: 0, windTightness: 3.5 },

            elliptical: { label: t('stem.galaxy.elliptical'), icon: '\u2B2D\uFE0F', desc: __alloT('stem.galaxy.elliptical_desc', 'Smooth, featureless ellipsoidal shape. Contain old, red stars with little gas or dust. Formed from galaxy mergers.'), example: 'M87, M49', arms: 0, barLength: 0, windTightness: 0 },

            irregular: { label: t('stem.galaxy.irregular'), icon: '\u2728', desc: __alloT('stem.galaxy.irregular_desc', 'No distinct shape. Rich in gas and dust with active star formation. Often satellites of larger galaxies.'), example: 'LMC, SMC', arms: 0, barLength: 0, windTightness: 0 }

          };

          var gType = GALAXY_TYPES[galaxyType] || GALAXY_TYPES.barredSpiral;

          var OBSERVE_MODES = [
            { key: 'visible', icon: '\uD83D\uDC41\uFE0F', label: __alloT('stem.galaxy.observe_visible_label', 'Visible'), target: 'galaxyType', accent: '#6366f1', desc: __alloT('stem.galaxy.observe_visible_desc', 'Human-eye color shows stars, dust shadows, and the overall shape of the galaxy.'), note: __alloT('stem.galaxy.observe_visible_note', 'Best for classifying galaxy shape and comparing star colors.') },
            { key: 'infrared', icon: '\uD83D\uDD25', label: __alloT('stem.galaxy.observe_infrared_label', 'Infrared'), target: 'dustLanes', accent: '#f97316', desc: __alloT('stem.galaxy.observe_infrared_desc', 'Infrared light passes through dusty lanes and reveals warm star-forming regions.'), note: __alloT('stem.galaxy.observe_infrared_note', 'Great for seeing through dust that blocks visible light.') },
            { key: 'radio', icon: '\uD83D\uDCE1', label: __alloT('stem.galaxy.observe_radio_label', 'Radio'), target: 'gasClouds', accent: '#06b6d4', desc: __alloT('stem.galaxy.observe_radio_desc', 'Radio maps trace cold hydrogen gas that outlines spiral arms and future star birth.'), note: __alloT('stem.galaxy.observe_radio_note', 'Hydrogen at 21 cm is one of the best maps of hidden galactic gas.') },
            { key: 'xray', icon: '\u26A1', label: __alloT('stem.galaxy.observe_xray_label', 'X-ray'), target: 'blackHole', accent: '#38bdf8', desc: __alloT('stem.galaxy.observe_xray_desc', 'X-rays highlight the hottest, most energetic regions near compact objects and young massive stars.'), note: __alloT('stem.galaxy.observe_xray_note', 'Useful for black-hole accretion, neutron stars, and supernova remnants.') },
            { key: 'gravity', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.observe_gravity_label', 'Gravity'), target: 'darkMatter', accent: '#c084fc', desc: __alloT('stem.galaxy.observe_gravity_desc', 'A gravity view shows the invisible mass halo inferred from star motions.'), note: __alloT('stem.galaxy.observe_gravity_note', 'This is evidence-based, not a photograph: motion reveals the dark matter halo.') }
          ];
          var activeObserve = OBSERVE_MODES.find(function (m) { return m.key === observeMode; }) || OBSERVE_MODES[0];

          var DOPPLER_PRESETS = [
            { label: __alloT('stem.galaxy.doppler_approaching_star', 'Approaching star'), value: -450, icon: '\uD83D\uDD35' },
            { label: __alloT('stem.galaxy.doppler_no_motion', 'No motion'), value: 0, icon: '\u26AA' },
            { label: __alloT('stem.galaxy.doppler_receding_galaxy', 'Receding galaxy'), value: 900, icon: '\uD83D\uDD34' },
            { label: __alloT('stem.galaxy.doppler_fast_quasar', 'Fast quasar'), value: 1800, icon: '\u2728' }
          ];
          var dopplerDirection = dopplerVelocity < -8 ? 'blueshift' : dopplerVelocity > 8 ? 'redshift' : 'no shift';
          var dopplerColor = dopplerVelocity < -8 ? '#2563eb' : dopplerVelocity > 8 ? '#dc2626' : '#64748b';
          var dopplerZ = dopplerVelocity / 299792.458;

          var REAL_SKY_TARGETS = [
            { key: 'm31', name: __alloT('stem.galaxy.rst_m31_name', 'Andromeda Galaxy'), short: 'M31', target: 'M 31', ra: 10.6847, dec: 41.2692, fov: 4.2, type: __alloT('stem.galaxy.rst_m31_type', 'Local Group spiral'), bridge: __alloT('stem.galaxy.rst_m31_bridge', 'Naked-eye smudge in dark skies; huge in binoculars.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_m31_story', 'Use this to compare the simulated Milky Way disk with a real neighboring spiral galaxy.'), lesson: [__alloT('stem.galaxy.rst_m31_lesson1', 'Classify the shape: bulge, disk, spiral arms, and dust lanes.'), __alloT('stem.galaxy.rst_m31_lesson2', 'Switch to infrared and look for dust-hidden structure.'), __alloT('stem.galaxy.rst_m31_lesson3', 'Ask what evidence shows this galaxy is not inside the Milky Way.')] },
            { key: 'm51', name: __alloT('stem.galaxy.rst_m51_name', 'Whirlpool Galaxy'), short: 'M51', target: 'M 51', ra: 202.4696, dec: 47.1953, fov: 0.75, type: __alloT('stem.galaxy.rst_m51_type', 'Interacting grand-design spiral'), bridge: __alloT('stem.galaxy.rst_m51_bridge', 'A telescope/photography classic; spiral arms are easier in images than eyepieces.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_m51_story', 'A dramatic case where interaction with a companion sharpens spiral structure.'), lesson: [__alloT('stem.galaxy.rst_m51_lesson1', 'Trace the spiral arms and find the companion galaxy.'), __alloT('stem.galaxy.rst_m51_lesson2', 'Compare the bridge of material with the Galaxy Explorer interaction model.'), __alloT('stem.galaxy.rst_m51_lesson3', 'Predict where star formation is strongest before changing surveys.')] },
            { key: 'm87', name: __alloT('stem.galaxy.rst_m87_name', 'M87'), short: 'M87', target: 'M 87', ra: 187.7059, dec: 12.3911, fov: 0.7, type: __alloT('stem.galaxy.rst_m87_type', 'Giant elliptical galaxy'), bridge: __alloT('stem.galaxy.rst_m87_bridge', 'Home of the first imaged black-hole shadow, M87*.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_m87_story', 'A smooth elliptical galaxy that anchors the Virgo Cluster and hosts a supermassive black hole.'), lesson: [__alloT('stem.galaxy.rst_m87_lesson1', 'Compare its smooth light to spiral galaxies.'), __alloT('stem.galaxy.rst_m87_lesson2', 'Use the catalog overlay to notice the crowded Virgo Cluster field.'), __alloT('stem.galaxy.rst_m87_lesson3', 'Connect the bright core to black-hole evidence, not a visible event horizon.')] },
            { key: 'm104', name: __alloT('stem.galaxy.rst_m104_name', 'Sombrero Galaxy'), short: 'M104', target: 'M 104', ra: 189.9976, dec: -11.6231, fov: 0.9, type: __alloT('stem.galaxy.rst_m104_type', 'Dust-lane galaxy'), bridge: __alloT('stem.galaxy.rst_m104_bridge', 'A bright galaxy where dust lanes make structure visible.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_m104_story', 'A striking real example of how dust can reveal a galaxy disk in silhouette.'), lesson: [__alloT('stem.galaxy.rst_m104_lesson1', 'Find the dark lane and infer the disk orientation.'), __alloT('stem.galaxy.rst_m104_lesson2', 'Compare visible and infrared: what changes when dust is less opaque?'), __alloT('stem.galaxy.rst_m104_lesson3', 'Decide whether this looks more spiral-like or elliptical-like.')] },
            { key: 'm82', name: __alloT('stem.galaxy.rst_m82_name', 'Cigar Galaxy'), short: 'M82', target: 'M 82', ra: 148.9685, dec: 69.6797, fov: 0.8, type: __alloT('stem.galaxy.rst_m82_type', 'Starburst galaxy'), bridge: __alloT('stem.galaxy.rst_m82_bridge', 'Best understood with multiwavelength views of gas and dust.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_m82_story', 'A galaxy-wide starburst: intense star formation is driving material out of the disk.'), lesson: [__alloT('stem.galaxy.rst_m82_lesson1', 'Look for the disturbed shape instead of neat spiral arms.'), __alloT('stem.galaxy.rst_m82_lesson2', 'Ask how a nearby galaxy interaction could trigger star birth.'), __alloT('stem.galaxy.rst_m82_lesson3', 'Use infrared to hunt for dusty star-forming regions.')] },
            { key: 'm1', name: __alloT('stem.galaxy.rst_m1_name', 'Crab Nebula'), short: 'M1', target: 'M 1', ra: 83.6331, dec: 22.0145, fov: 0.35, type: __alloT('stem.galaxy.rst_m1_type', 'Supernova remnant'), bridge: __alloT('stem.galaxy.rst_m1_bridge', 'A real supernova remnant from the 1054 event.'), astronomyTarget: 'orion-nebula', story: __alloT('stem.galaxy.rst_m1_story', 'The afterglow of stellar death: a pulsar powers a tangled nebula of expanding debris.'), lesson: [__alloT('stem.galaxy.rst_m1_lesson1', 'Connect the filaments to expanding supernova ejecta.'), __alloT('stem.galaxy.rst_m1_lesson2', 'Compare this remnant with Star Life supernova and neutron-star stages.'), __alloT('stem.galaxy.rst_m1_lesson3', 'Ask what data would reveal the hidden pulsar.')] },
            { key: 'm42', name: __alloT('stem.galaxy.rst_m42_name', 'Orion Nebula'), short: 'M42', target: 'M 42', ra: 83.8221, dec: -5.3911, fov: 1.25, type: __alloT('stem.galaxy.rst_m42_type', 'Stellar nursery'), bridge: __alloT('stem.galaxy.rst_m42_bridge', 'One of the best beginner telescope targets.'), astronomyTarget: 'orion-nebula', story: __alloT('stem.galaxy.rst_m42_story', 'A nearby star-forming cloud where hot young stars light the gas around them.'), lesson: [__alloT('stem.galaxy.rst_m42_lesson1', 'Find the bright core and surrounding gas wings.'), __alloT('stem.galaxy.rst_m42_lesson2', 'Compare optical and infrared views to see through dust.'), __alloT('stem.galaxy.rst_m42_lesson3', 'Ask why this is a star nursery rather than a galaxy.')] },
            { key: 'pleiades', name: __alloT('stem.galaxy.rst_pleiades_name', 'Pleiades'), short: 'M45', target: 'M 45', ra: 56.75, dec: 24.1167, fov: 3.2, type: __alloT('stem.galaxy.rst_pleiades_type', 'Open cluster'), bridge: __alloT('stem.galaxy.rst_pleiades_bridge', 'Gorgeous in binoculars; too wide for many telescopes.'), astronomyTarget: 'pleiades', story: __alloT('stem.galaxy.rst_pleiades_story', 'A young cluster showing how stars are born together and drift apart over time.'), lesson: [__alloT('stem.galaxy.rst_pleiades_lesson1', 'Count bright blue stars and infer a young age.'), __alloT('stem.galaxy.rst_pleiades_lesson2', 'Notice why binoculars can be better than high magnification.'), __alloT('stem.galaxy.rst_pleiades_lesson3', 'Ask how an open cluster differs from a globular cluster.')] },
            { key: 'carina', name: __alloT('stem.galaxy.rst_carina_name', 'Carina Nebula'), short: 'NGC 3372', target: 'NGC 3372', ra: 161.2875, dec: -59.8667, fov: 1.7, type: __alloT('stem.galaxy.rst_carina_type', 'Massive stellar nursery'), bridge: __alloT('stem.galaxy.rst_carina_bridge', 'A southern-sky showpiece made famous by Hubble and JWST imagery.'), astronomyTarget: 'orion-nebula', story: __alloT('stem.galaxy.rst_carina_story', 'A huge star-forming complex where massive stars sculpt dust pillars and glowing gas.'), lesson: [__alloT('stem.galaxy.rst_carina_lesson1', 'Look for bright cavities carved by young massive stars.'), __alloT('stem.galaxy.rst_carina_lesson2', 'Switch surveys and compare where dust is visible versus transparent.'), __alloT('stem.galaxy.rst_carina_lesson3', 'Ask why massive stars reshape their birth clouds so quickly.')] },
            { key: 'm16', name: __alloT('stem.galaxy.rst_m16_name', 'Eagle Nebula'), short: 'M16', target: 'M 16', ra: 274.7, dec: -13.8067, fov: 0.85, type: __alloT('stem.galaxy.rst_m16_type', 'Pillars of Creation field'), bridge: __alloT('stem.galaxy.rst_m16_bridge', 'The Hubble/JWST Pillars are a famous close-up inside this star-forming region.'), astronomyTarget: 'orion-nebula', story: __alloT('stem.galaxy.rst_m16_story', 'Dense columns of gas and dust are being eroded by newborn stars while new stars form inside them.'), lesson: [__alloT('stem.galaxy.rst_m16_lesson1', 'Search for dark columns and bright ionized edges.'), __alloT('stem.galaxy.rst_m16_lesson2', 'Predict which wavelengths reveal embedded protostars.'), __alloT('stem.galaxy.rst_m16_lesson3', 'Compare pillar erosion to stellar feedback in Star Life.')] },
            { key: 'stephan', name: __alloT('stem.galaxy.rst_stephan_name', 'Stephan\'s Quintet'), short: 'HCG 92', target: 'Stephan Quintet', ra: 339.014, dec: 33.975, fov: 0.45, type: __alloT('stem.galaxy.rst_stephan_type', 'Compact interacting galaxy group'), bridge: __alloT('stem.galaxy.rst_stephan_bridge', 'A JWST showcase for colliding galaxies, shock fronts, and tidal debris.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_stephan_story', 'A small patch of sky where multiple galaxies are gravitationally disturbing one another.'), lesson: [__alloT('stem.galaxy.rst_stephan_lesson1', 'Identify which galaxies look distorted by interaction.'), __alloT('stem.galaxy.rst_stephan_lesson2', 'Ask what a shock front would look like in non-visible wavelengths.'), __alloT('stem.galaxy.rst_stephan_lesson3', 'Compare the group to M51: one companion versus several galaxies.')] },
            { key: 'cartwheel', name: __alloT('stem.galaxy.rst_cartwheel_name', 'Cartwheel Galaxy'), short: 'ESO 350-40', target: 'Cartwheel Galaxy', ra: 9.421, dec: -33.716, fov: 0.42, type: __alloT('stem.galaxy.rst_cartwheel_type', 'Ring galaxy after collision'), bridge: __alloT('stem.galaxy.rst_cartwheel_bridge', 'A JWST/Hubble-friendly example of a collision-generated ring wave.'), astronomyTarget: 'andromeda', story: __alloT('stem.galaxy.rst_cartwheel_story', 'A smaller galaxy likely punched through the disk, sending a star-forming ring outward.'), lesson: [__alloT('stem.galaxy.rst_cartwheel_lesson1', 'Find the ring and compare it to ordinary spiral arms.'), __alloT('stem.galaxy.rst_cartwheel_lesson2', 'Ask why collisions can trigger new stars instead of only destroying structure.'), __alloT('stem.galaxy.rst_cartwheel_lesson3', 'Use the ring as evidence of a past encounter.')] }
          ];

          var REAL_SKY_SURVEYS = [
            { id: 'P/DSS2/color', label: __alloT('stem.galaxy.survey_optical_label', 'Optical'), desc: __alloT('stem.galaxy.survey_optical_desc', 'Visible-light plates reveal star color, dust lanes, and galaxy structure.') },
            { id: 'P/2MASS/color', label: __alloT('stem.galaxy.survey_near_infrared_label', 'Near infrared'), desc: __alloT('stem.galaxy.survey_near_infrared_desc', 'Infrared light cuts through dust and highlights cooler stars.') },
            { id: 'P/allWISE/color', label: __alloT('stem.galaxy.survey_mid_infrared_label', 'Mid infrared'), desc: __alloT('stem.galaxy.survey_mid_infrared_desc', 'Warm dust and star-forming regions become easier to spot.') }
          ];

          var REAL_SKY_CATALOGS = [
            { id: 'simbad', label: __alloT('stem.galaxy.catalog_simbad_label', 'SIMBAD objects'), desc: __alloT('stem.galaxy.catalog_simbad_desc', 'Scientific object IDs around the target.') },
            { id: 'none', label: __alloT('stem.galaxy.catalog_clean_survey_label', 'Clean survey'), desc: __alloT('stem.galaxy.catalog_clean_survey_desc', 'Image-only mode for careful visual inspection.') }
          ];

          var activeRealSkyTarget = REAL_SKY_TARGETS.find(function (x) { return x.key === realSkyTargetKey; }) || REAL_SKY_TARGETS[0];
          var activeRealSkySurvey = REAL_SKY_SURVEYS.find(function (x) { return x.id === realSkySurveyKey; }) || REAL_SKY_SURVEYS[0];
          var activeRealSkyCatalog = REAL_SKY_CATALOGS.find(function (x) { return x.id === realSkyCatalogKey; }) || REAL_SKY_CATALOGS[0];
          var activeAladinUrl = 'https://aladin.cds.unistra.fr/AladinLite/?target=' + encodeURIComponent(activeRealSkyTarget.target) + '&fov=' + encodeURIComponent(activeRealSkyTarget.fov);
          var activeRealSkyUniverseStop = activeRealSkyTarget.key === 'm87' ? 'm87' : activeRealSkyTarget.key === 'm51' ? 'm51' : 'deep-field';
          var activeRealSkyEvidenceThread = activeRealSkyTarget.key === 'm87' ? 'blackholes' : activeRealSkyTarget.key === 'm1' ? 'candles' : 'redshift';
          var activeRealSkyUniverseTime = activeRealSkyEvidenceThread === 'candles' ? 8.8 : 13.8;
          var activeRealSkyMission = activeRealSkyTarget.key === 'm87' ? 'black-hole-proof' : activeRealSkyTarget.key === 'm1' ? 'stellar-rulers' : 'expansion';

          function ensureGalaxyAladinLite(cb) {
            if (window.A && window.A.aladin) { cb(true); return; }
            if (typeof document === 'undefined') { cb(false); return; }
            window._galaxyAladinCallbacks = window._galaxyAladinCallbacks || [];
            window._galaxyAladinCallbacks.push(cb);
            if (window._galaxyAladinLoading) return;
            window._galaxyAladinLoading = true;
            var finish = function (ok) {
              window._galaxyAladinLoading = false;
              var callbacks = window._galaxyAladinCallbacks || [];
              window._galaxyAladinCallbacks = [];
              callbacks.forEach(function (fn) { try { fn(ok); } catch (e) {} });
            };
            try {
              if (!document.getElementById('galaxy-aladin-lite-css')) {
                var css = document.createElement('link');
                css.id = 'galaxy-aladin-lite-css';
                css.rel = 'stylesheet';
                css.href = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.css';
                document.head.appendChild(css);
              }
              var existing = document.getElementById('galaxy-aladin-lite-js');
              if (existing && window._galaxyAladinFailed) {
                try { existing.parentNode && existing.parentNode.removeChild(existing); } catch (e1) {}
                existing = null;
              }
              if (existing) {
                existing.addEventListener('load', function () { window._galaxyAladinFailed = false; finish(!!(window.A && window.A.aladin)); }, { once: true });
                existing.addEventListener('error', function () { window._galaxyAladinFailed = true; finish(false); }, { once: true });
                return;
              }
              var script = document.createElement('script');
              script.id = 'galaxy-aladin-lite-js';
              script.async = true;
              script.src = 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js';
              script.onload = function () { window._galaxyAladinFailed = false; finish(!!(window.A && window.A.aladin)); };
              script.onerror = function () { window._galaxyAladinFailed = true; finish(false); };
              document.head.appendChild(script);
            } catch (e) {
              finish(false);
            }
          }



          // ── Warp points ──

          var WARP_POINTS = [

            { label: t('stem.galaxy.galactic_core'), x: 0, y: 0, z: 0, zoom: 2 },

            { label: t('stem.galaxy.orion_arm_us'), x: 0.35, y: 0, z: 0.1, zoom: 4, desc: __alloT('stem.galaxy.orion_arm_us_desc', 'Our Solar System is here, about 26,000 light-years from the center.') },

            { label: t('stem.galaxy.perseus_arm'), x: 0.5, y: 0, z: -0.2, zoom: 3, desc: __alloT('stem.galaxy.perseus_arm_desc', 'The next spiral arm outward from us. Contains many young, hot stars.') },

            { label: t('stem.galaxy.sagittarius_arm'), x: -0.15, y: 0, z: 0.35, zoom: 3, desc: t('stem.galaxy.the_next_arm_inward_toward') },

            { label: t('stem.galaxy.overview'), x: 0, y: 0.8, z: 0, zoom: 0.8, desc: t('stem.galaxy.full_view_of_the_galaxy') }

          ];



          // ── Quiz bank (expanded from 10 to 15) ──

          var QUIZ_BANK = [

            { q: __alloT('stem.galaxy.quiz_sun_type', 'What type of star is our Sun?'), a: t('stem.galaxy.gtype'), options: [t('stem.galaxy.otype'), t('stem.galaxy.atype'), t('stem.galaxy.gtype'), t('stem.galaxy.mtype')] },

            { q: __alloT('stem.galaxy.quiz_mw_center', 'What is at the center of the Milky Way?'), a: 'Supermassive black hole', options: ['Supermassive black hole', 'Giant star', 'Neutron star', t('stem.galaxy.nebula')] },

            { q: __alloT('stem.galaxy.quiz_hottest_type', 'Which star type is the hottest?'), a: t('stem.galaxy.otype'), options: [t('stem.galaxy.mtype'), t('stem.galaxy.gtype'), t('stem.galaxy.atype'), t('stem.galaxy.otype')] },

            { q: __alloT('stem.galaxy.quiz_our_arm', 'Which spiral arm contains our Solar System?'), a: 'Orion Arm', options: [t('stem.galaxy.perseus_arm'), 'Orion Arm', t('stem.galaxy.sagittarius_arm'), 'Norma Arm'] },

            { q: __alloT('stem.galaxy.quiz_mtype_pct', 'What percentage of stars are M-type red dwarfs?'), a: '~76%', options: ['~10%', '~30%', '~50%', '~76%'] },

            { q: __alloT('stem.galaxy.quiz_what_nebula', 'What is a nebula?'), a: 'A cloud of gas and dust', options: ['A dead star', 'A cloud of gas and dust', 'A type of galaxy', 'A black hole'] },

            { q: __alloT('stem.galaxy.quiz_star_count', 'How many stars are in the Milky Way?'), a: '100-400 billion', options: ['1 million', '100 million', '100-400 billion', '1 trillion'] },

            { q: __alloT('stem.galaxy.quiz_mw_type', 'What type of galaxy is the Milky Way?'), a: 'Barred spiral', options: [t('stem.galaxy.elliptical'), t('stem.galaxy.irregular'), 'Spiral', 'Barred spiral'] },

            { q: __alloT('stem.galaxy.quiz_closest_star', 'Which star is closest to our Sun?'), a: 'Proxima Centauri', options: ['Sirius', 'Proxima Centauri', 'Alpha Centauri A', 'Barnards Star'] },

            { q: __alloT('stem.galaxy.quiz_hottest_color', 'What color are the hottest stars?'), a: 'Blue', options: ['Red', 'Yellow', 'White', 'Blue'] },

            { q: __alloT('stem.galaxy.quiz_planetary_nebula', 'What is a planetary nebula?'), a: 'Outer layers shed by a dying star', options: ['A nebula with planets', 'Outer layers shed by a dying star', 'Gas around a planet', 'A type of dark matter'] },

            { q: __alloT('stem.galaxy.quiz_mw_width', 'How wide is the Milky Way?'), a: '~100,000 light-years', options: ['~1,000 light-years', '~10,000 light-years', '~100,000 light-years', '~1 million light-years'] },

            { q: __alloT('stem.galaxy.quiz_supernova_cause', 'What causes a supernova?'), a: 'A massive star exploding', options: ['Two galaxies colliding', 'A massive star exploding', 'A nebula igniting', 'A black hole evaporating'] },

            { q: __alloT('stem.galaxy.quiz_dark_matter', 'What is dark matter?'), a: 'Invisible matter detected by gravity', options: ['Black holes', 'Invisible matter detected by gravity', 'Empty space', 'Antimatter'] },

            { q: __alloT('stem.galaxy.quiz_light_cross', 'How long does it take light to cross the Milky Way?'), a: '~100,000 years', options: ['~1,000 years', '~10,000 years', '~100,000 years', '~1 million years'] },

            { q: __alloT('stem.galaxy.quiz_sun_fate', 'What will our Sun become at the end of its life?'), a: 'White dwarf', options: ['Black hole', 'Neutron star', 'White dwarf', 'Red dwarf'] },

            { q: __alloT('stem.galaxy.quiz_after_red_giant', 'What stage comes after a Red Giant for a massive star?'), a: 'Supernova', options: ['White dwarf', 'Planetary nebula', 'Supernova', 'Protostar'] },

            { q: __alloT('stem.galaxy.quiz_solar_mass_life', 'How long does a star with 1 solar mass live?'), a: '~10 billion years', options: ['~1 million years', '~100 million years', '~10 billion years', '~1 trillion years'] },

            { q: __alloT('stem.galaxy.quiz_what_protostar', 'What is a protostar?'), a: 'A star forming from a collapsing gas cloud', options: ['A dying star', 'A star forming from a collapsing gas cloud', 'A type of neutron star', 'A binary star system'] },

            { q: __alloT('stem.galaxy.quiz_final_fate', 'What determines a star\'s final fate?'), a: 'Its mass', options: ['Its color', 'Its mass', 'Its age', 'Its distance from Earth'] }

          ];



          // ── Scale data ──

          var SCALE_INFO = [

            { label: t('stem.galaxy.galaxy_diameter'), value: '~100,000 light-years' },

            { label: t('stem.galaxy.disk_thickness'), value: '~2,000 light-years' },

            { label: t('stem.galaxy.central_bulge'), value: '~10,000 light-years' },

            { label: t('stem.galaxy.sun_to_center'), value: '~26,000 light-years' },

            { label: t('stem.galaxy.stars'), value: '100\u2013400 billion' },

            { label: __alloT('stem.galaxy.scale_age', 'Age'), value: '~13.6 billion years' }

          ];



          // ── Epoch narration for time-lapse ──

          var EPOCH_NARRATION = [

            { age: 0.1, title: t('stem.galaxy.cosmic_dawn'), emoji: '\u2728', desc: __alloT('stem.galaxy.cosmic_dawn_desc', 'The first stars ignite, ending the cosmic dark ages. These massive Population III stars forge the first heavy elements.') },

            { age: 0.4, title: t('stem.galaxy.first_galaxies'), emoji: '\uD83C\uDF0C', desc: __alloT('stem.galaxy.first_galaxies_desc', 'Protogalaxies begin to coalesce from dark matter halos. The first quasars blaze to life, powered by supermassive black holes.') },

            { age: 1.0, title: t('stem.galaxy.galaxy_assembly'), emoji: '\uD83C\uDF00', desc: __alloT('stem.galaxy.galaxy_assembly_desc', 'Galaxies collide and merge, building larger structures. Spiral arms begin to form as gas settles into rotating disks.') },

            { age: 4.6, title: t('stem.galaxy.milky_way_forms'), emoji: '\uD83C\uDF1F', desc: __alloT('stem.galaxy.milky_way_forms_desc', 'Our galaxy takes shape. The galactic bar forms, organizing the inner structure. Star formation peaks in the spiral arms.') },

            { age: 9.2, title: t('stem.galaxy.sun_is_born'), emoji: '\u2600\uFE0F', desc: __alloT('stem.galaxy.sun_is_born_desc', 'A cloud of gas collapses in the Orion Arm, forming our Sun and Solar System 4.6 billion years ago. Life will eventually arise on Earth.') },

            { age: 10.0, title: t('stem.galaxy.mature_galaxy'), emoji: '\uD83D\uDD2D', desc: __alloT('stem.galaxy.mature_galaxy_desc', 'The Milky Way settles into its current form with 200-400 billion stars. Star formation slows as gas reserves deplete.') },

            { age: 13.0, title: t('stem.galaxy.present_era'), emoji: '\uD83C\uDF0D', desc: __alloT('stem.galaxy.present_era_desc', 'We are here! Humanity looks outward. The universe continues expanding, and dark energy accelerates its growth.') },

            { age: 13.8, title: t('stem.galaxy.right_now'), emoji: '\uD83D\uDE80', desc: __alloT('stem.galaxy.right_now_desc', 'The observable universe is 93 billion light-years across. We can see the cosmic microwave background\u2014the afterglow of the Big Bang.') }

          ];

          function getEpochNarration(age) {

            var best = null;

            for (var i = EPOCH_NARRATION.length - 1; i >= 0; i--) {

              if (age >= EPOCH_NARRATION[i].age) { best = EPOCH_NARRATION[i]; break; }

            }

            return best;

          }



          // ── Cosmic age ↔ star distribution ──

          function getAgeDistribution(age) {

            var t = Math.max(0, Math.min(14, age));

            var early = Math.max(0, 1 - t / 5);

            var late = Math.min(1, t / 8);

            return [

              0.003 + early * 0.05,

              0.13 + early * 1.5,

              0.6 + early * 3.0,

              3 + early * 4.0,

              7.6 - late * 2,

              12.1 + late * 3,

              76.5 + late * 10

            ];

          }



          // ── Stellar lifecycle data (Dynamic) ──

          function getStagesForMass(mass) {
            var stages = [
              { id: 'nebula', name: t('stem.galaxy.nebula'), emoji: '\u2601\uFE0F', desc: t('stem.galaxy.a_vast_cloud_of_gas'), color: '#a855f7' },
              { id: 'protostar', name: t('stem.galaxy.protostar'), emoji: '\uD83D\uDFE0', desc: t('stem.galaxy.core_heats_up_from_gravitational'), color: '#fb923c' }
            ];
            if (mass < HYDROGEN_FUSION_LIMIT) {
              stages.push({ id: 'main_sequence', name: __alloT('stem.galaxy.stage_brown_dwarf_name', 'Brown Dwarf'), emoji: '\uD83E\uDDF4', desc: __alloT('stem.galaxy.stage_brown_dwarf_desc', 'Too small for sustained hydrogen fusion; it glows faintly while cooling.'), color: '#a16207' });
              stages.push({ id: 'black_dwarf', name: __alloT('stem.galaxy.stage_cooling_brown_dwarf_name', 'Cooling Brown Dwarf'), emoji: '\u26AB', desc: __alloT('stem.galaxy.stage_cooling_brown_dwarf_desc', 'A substellar ember fading slowly over cosmic time.'), color: '#18181b' });
            } else if (mass < M_DWARF_LIMIT) {
              stages.push({ id: 'main_sequence', name: __alloT('stem.galaxy.stage_red_dwarf_name', 'Red Dwarf'), emoji: '\uD83D\uDD34', desc: __alloT('stem.galaxy.stage_red_dwarf_desc', 'Burns slowly for hundreds of billions of years.'), color: '#dc2626' });
              stages.push({ id: 'blue_dwarf', name: __alloT('stem.galaxy.stage_blue_dwarf_name', 'Blue Dwarf'), emoji: '\uD83D\uDD35', desc: __alloT('stem.galaxy.stage_blue_dwarf_desc', 'Theoretical phase where a red dwarf heats up as its opacity changes.'), color: '#3b82f6' });
              stages.push({ id: 'white_dwarf', name: t('stem.galaxy.white_dwarf'), emoji: '\u26AA', desc: t('stem.galaxy.dense_stellar_core_slowly_cools'), color: 'var(--allo-stem-text, #e2e8f0)' });
              stages.push({ id: 'black_dwarf', name: __alloT('stem.galaxy.stage_black_dwarf_name', 'Black Dwarf'), emoji: '\u26AB', desc: __alloT('stem.galaxy.stage_black_dwarf_desc', 'Theoretical future: a white dwarf cooled after far longer than the universe has existed.'), color: '#18181b' });
            } else if (mass < 8) {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: __alloT('stem.galaxy.stage_ms_desc_sunlike', 'Hydrogen fusion ignites! Stable for billions of years.'), color: '#fbbf24' });
              stages.push({ id: 'red_giant', name: t('stem.galaxy.red_giant'), emoji: '\uD83D\uDD34', desc: t('stem.galaxy.core_contracts_outer_layers_expand'), color: '#ef4444' });
              stages.push({ id: 'planetary_nebula', name: t('stem.galaxy.planetary_nebula'), emoji: '\uD83D\uDFE3', desc: t('stem.galaxy.outer_layers_shed_gently_into'), color: '#818cf8' });
              stages.push({ id: 'white_dwarf', name: t('stem.galaxy.white_dwarf'), emoji: '\u26AA', desc: t('stem.galaxy.dense_stellar_core_slowly_cools'), color: 'var(--allo-stem-text, #e2e8f0)' });
              stages.push({ id: 'black_dwarf', name: __alloT('stem.galaxy.stage_black_dwarf_name', 'Black Dwarf'), emoji: '\u26AB', desc: __alloT('stem.galaxy.stage_black_dwarf_desc', 'Theoretical future: a white dwarf cooled after far longer than the universe has existed.'), color: '#18181b' });
            } else if (mass < 25) {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: __alloT('stem.galaxy.stage_ms_desc_massive', 'Hot and enormous. Burns through fuel in millions of years.'), color: '#60a5fa' });
              stages.push({ id: 'red_supergiant', name: __alloT('stem.galaxy.stage_red_supergiant_name', 'Red Supergiant'), emoji: '\uD83D\uDD34', desc: __alloT('stem.galaxy.stage_red_supergiant_desc', 'Expands to massive proportions, large enough to swallow Jupiter!'), color: '#b91c1c' });
              stages.push({ id: 'supernova', name: t('stem.galaxy.supernova'), emoji: '\uD83D\uDCA5', desc: __alloT('stem.galaxy.stage_supernova_desc_core', 'Core collapses! A catastrophic explosion outshining entire galaxies.'), color: '#fbbf24' });
              stages.push({ id: 'neutron_star', name: t('stem.galaxy.neutron_star'), emoji: '\u2B50', desc: t('stem.galaxy.ultradense_remnant_a_teaspoon_weighs'), color: '#38bdf8' });
            } else {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: __alloT('stem.galaxy.stage_ms_desc_ultramassive', 'An ultra-hot blue giant blazing with intense radiation.'), color: '#818cf8' });
              stages.push({ id: 'blue_supergiant', name: __alloT('stem.galaxy.stage_blue_supergiant_name', 'Blue Supergiant'), emoji: '\uD83D\uDD35', desc: __alloT('stem.galaxy.stage_blue_supergiant_desc', 'Sheds immense mass through violent stellar winds.'), color: '#3b82f6' });
              stages.push({ id: 'supernova', name: t('stem.galaxy.supernova'), emoji: '\uD83D\uDCA5', desc: __alloT('stem.galaxy.stage_supernova_desc_hyper', 'A hypernova explosion obliterates the star.'), color: '#fbbf24' });
              stages.push({ id: 'black_hole', name: t('stem.galaxy.black_hole'), emoji: '\uD83D\uDD73\uFE0F', desc: t('stem.galaxy.gravity_so_strong_nothing_escapes'), color: '#1e1b4b' });
            }
            return stages;
          }



          // ── Three.js init with layer groups ──

          // Post-processing script loader

          function loadGalaxyPP(cb) {

            if (window._galaxyPPLoaded) { cb(); return; }

            var urls = [

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js',

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js',

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js',

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js',

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js',

              'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js'

            ];

            var idx = 0;

            function next() {

              if (idx >= urls.length) { window._galaxyPPLoaded = true; cb(); return; }

              var s = document.createElement('script');

              s.src = urls[idx]; s.onload = function () { idx++; next(); };

              s.onerror = function () { idx++; next(); };

              document.head.appendChild(s);

            }

            next();

          }



          var canvasRefCb = function (canvasEl) {

            if (!canvasEl) {

              var prev = document.querySelector('[data-galaxy-canvas]');

              if (prev && prev._galaxyCleanup) { prev._galaxyCleanup(); prev._galaxyInit = false; }

              return;

            }

            if (canvasEl._galaxyInit) return;

            canvasEl._galaxyInit = true;
            // Canvas Narration: galaxy init
            if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'init', {
              first: 'Galaxy Explorer loaded. A 3-D view of the Milky Way with ' + starCount.toLocaleString() + ' stars. Drag to orbit, scroll to zoom. Explore galaxy types, warp to locations, and travel through cosmic time.',
              repeat: 'Galaxy Explorer ready.',
              terse: 'Galaxy Explorer ready.'
            });

            var doInit = function () { loadGalaxyPP(function () { initGalaxy(canvasEl); }); };

            if (window.THREE) { doInit(); } else {

              window.StemLab.ensureThree({ orbit: false }).then(doInit).catch(function () { console.error('[Galaxy] Three.js failed to load'); });

            }

          };



          var blackHoleCanvasActive = React.useRef(null);
          var blackHoleRefCb = React.useCallback(function(canvas) {
            if (!canvas) { if (blackHoleCanvasActive.current && blackHoleCanvasActive.current._blackHoleCleanup) blackHoleCanvasActive.current._blackHoleCleanup(); blackHoleCanvasActive.current = null; return; }
            if (canvas._blackHoleInit) return;
            blackHoleCanvasActive.current = canvas;
            canvas._blackHoleInit = true;
            var stopped = false, frame = 0, renderer, scene, camera, disk, stars, photonRing, corona, lensArcA, lensArcB, coreGlow, fallingObjects = [], lastFrameTime = 0, updateFalling = function(){}, disposeFalling = function(){};
            var spin = parseFloat(canvas.getAttribute('data-spin')); if (isNaN(spin)) spin = 0.72;
            var diskPower = parseFloat(canvas.getAttribute('data-disk')); if (isNaN(diskPower)) diskPower = 0.78;
            var paused = canvas.getAttribute('data-paused') === 'true';
            var drag = false, lastX = 0, lastY = 0, yaw = 0.28, pitch = 0.28, distance = 3.25, inView = true, pageHidden = !!document.hidden, observer = null;

            function init() {
              if (stopped || !window.THREE) return;
              var THREE = window.THREE;
              scene = new THREE.Scene();
              camera = new THREE.PerspectiveCamera(48, 1, 0.01, 100);
              try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (webglError) { var fallback = document.getElementById('black-hole-status'); if (fallback) fallback.textContent = 'The interactive 3-D view is unavailable because WebGL could not start. The labeled explanation remains available.'; canvas.setAttribute('aria-label', 'Black hole simulation unavailable because WebGL could not start. Read the adjacent explanation for the event horizon, photon ring, accretion disk, and jets.'); return; }
              renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
              renderer.setClearColor(0x010208, 1);
              if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
              if ('toneMapping' in renderer) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.28; }

              var starGeo = new THREE.BufferGeometry(), count = 2600, pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
              for (var i = 0; i < count; i++) {
                var radius = 7 + Math.random() * 18, a = Math.random() * Math.PI * 2, z = Math.random() * 2 - 1, rr = Math.sqrt(1 - z * z);
                pos[i*3] = radius * rr * Math.cos(a); pos[i*3+1] = radius * z; pos[i*3+2] = radius * rr * Math.sin(a);
                var tint = Math.random(); col[i*3] = 0.55 + tint * 0.45; col[i*3+1] = 0.65 + tint * 0.3; col[i*3+2] = 1;
              }
              starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
              stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.032, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })); scene.add(stars);

              var horizon = new THREE.Mesh(new THREE.SphereGeometry(0.43, 96, 64), new THREE.MeshBasicMaterial({ color: 0x000000 }));
              horizon.renderOrder = 5; scene.add(horizon);
              var shadow = new THREE.Mesh(new THREE.SphereGeometry(0.49, 96, 64), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.96, side: THREE.BackSide })); scene.add(shadow);

              var ringMat = new THREE.MeshBasicMaterial({ color: 0xffe8a3, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
              photonRing = new THREE.Mesh(new THREE.TorusGeometry(0.535, 0.012, 12, 192), ringMat); photonRing.rotation.x = Math.PI / 2; scene.add(photonRing);
              var lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.018, 10, 192), new THREE.MeshBasicMaterial({ color: 0x8fc7ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })); lensRing.rotation.x = Math.PI / 2; scene.add(lensRing);

              var diskMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { uTime: { value: 0 }, uSpin: { value: spin }, uPower: { value: diskPower } },
                vertexShader: 'varying vec2 vUv; void main(){vUv=uv; vec3 p=position; float r=length(p.xy); p.z += sin(atan(p.y,p.x)*7.0+r*12.0)*0.012; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
                fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uSpin; uniform float uPower; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);} void main(){vec2 p=(vUv-.5)*2.; float r=length(p); if(r<.25||r>1.)discard; float a=atan(p.y,p.x); float speed=2.5+uSpin*8.; float spiral=sin(a*16.-r*115.-uTime*speed); float fine=sin(a*43.+r*210.+uTime*speed*.42); float turbulence=noise(vec2(a*9.+uTime*.18,r*72.-uTime*.7)); float bands=.22+.34*spiral+.18*fine+.5*turbulence; float edge=smoothstep(.25,.285,r)*(1.-smoothstep(.86,1.,r)); float heat=clamp((.92-r)/.68,0.,1.); vec3 outer=vec3(.08,.22,1.); vec3 mid=vec3(1.,.12,.018); vec3 inner=vec3(1.,.97,.72); vec3 c=mix(outer,mid,smoothstep(.05,.62,heat)); c=mix(c,inner,pow(heat,3.2)); float approaching=.5+.5*cos(a-.25); vec3 beam=mix(vec3(1.,.18,.03),vec3(.55,.82,1.),approaching); c=mix(c,beam,uSpin*.28*approaching); float doppler=.58+(0.34+uSpin*.34)*approaching; float hotSpot=pow(max(0.,sin(a*5.-uTime*speed*1.4+r*18.)),10.)*heat; c+=vec3(1.,.72,.3)*hotSpot*1.7; float alpha=edge*clamp(.34+bands,0.08,1.)*doppler*uPower; gl_FragColor=vec4(c,alpha);}'
              });
              disk = new THREE.Mesh(new THREE.RingGeometry(0.54, 2.15, 256, 8), diskMat); disk.rotation.x = -Math.PI / 2.45; scene.add(disk);
              var rimMat = new THREE.MeshBasicMaterial({ color: 0xfff0bd, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false });
              var innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.555, 0.018, 12, 256), rimMat); innerRim.rotation.x = disk.rotation.x; scene.add(innerRim);

              var glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
              var glowCtx = glowCanvas.getContext('2d'), glowGradient = glowCtx.createRadialGradient(128,128,34,128,128,128);
              glowGradient.addColorStop(0,'rgba(255,245,195,0.7)'); glowGradient.addColorStop(.18,'rgba(255,118,35,0.34)'); glowGradient.addColorStop(.48,'rgba(82,126,255,0.12)'); glowGradient.addColorStop(1,'rgba(10,20,80,0)'); glowCtx.fillStyle=glowGradient; glowCtx.fillRect(0,0,256,256);
              coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(glowCanvas), transparent:true, opacity:.7, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:true })); coreGlow.scale.set(2.35,2.35,1); coreGlow.position.z=-.16; scene.add(coreGlow);

              var arcMatA = new THREE.MeshBasicMaterial({ color:0xffd98a, transparent:true, opacity:.46, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
              var arcMatB = new THREE.MeshBasicMaterial({ color:0x72b7ff, transparent:true, opacity:.28, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
              lensArcA = new THREE.Mesh(new THREE.TorusGeometry(.69,.014,10,144,Math.PI*1.36),arcMatA); lensArcA.rotation.z=-.52; lensArcA.position.set(0,0,0); scene.add(lensArcA);
              lensArcB = new THREE.Mesh(new THREE.TorusGeometry(.76,.01,8,128,Math.PI*1.05),arcMatB); lensArcB.rotation.z=2.42; lensArcB.position.set(0,0,0); scene.add(lensArcB);

              var coronaCount=900, coronaGeo=new THREE.BufferGeometry(), coronaPos=new Float32Array(coronaCount*3), coronaCol=new Float32Array(coronaCount*3);
              for(var ci=0;ci<coronaCount;ci++){ var ca=Math.random()*Math.PI*2, cr=.58+Math.pow(Math.random(),1.7)*1.7, cy=(Math.random()-.5)*.075*(1+cr); coronaPos[ci*3]=Math.cos(ca)*cr; coronaPos[ci*3+1]=Math.sin(ca)*cr; coronaPos[ci*3+2]=cy; var ch=1-(cr-.58)/1.7; coronaCol[ci*3]=.45+.55*ch; coronaCol[ci*3+1]=.18+.7*ch; coronaCol[ci*3+2]=.35+.65*(1-ch); }
              coronaGeo.setAttribute('position',new THREE.BufferAttribute(coronaPos,3)); coronaGeo.setAttribute('color',new THREE.BufferAttribute(coronaCol,3));
              corona=new THREE.Points(coronaGeo,new THREE.PointsMaterial({size:.018,vertexColors:true,transparent:true,opacity:.46,blending:THREE.AdditiveBlending,depthWrite:false})); corona.rotation.x=-Math.PI/2.45; scene.add(corona);

              var jetMat = new THREE.MeshBasicMaterial({ color: 0x65bfff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
              var jet1 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 4.2, 48, 1, true), jetMat); jet1.position.y = 2.1; scene.add(jet1);
              var jet2 = jet1.clone(); jet2.rotation.z = Math.PI; jet2.position.y = -2.1; scene.add(jet2);
              var jetCoreMat = new THREE.MeshBasicMaterial({ color:0xd7f4ff, transparent:true, opacity:.25, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
              var jetCore1=new THREE.Mesh(new THREE.ConeGeometry(.022,4.8,32,1,true),jetCoreMat); jetCore1.position.y=2.4; scene.add(jetCore1);
              var jetCore2=jetCore1.clone(); jetCore2.rotation.z=Math.PI; jetCore2.position.y=-2.4; scene.add(jetCore2);
              var jetCount=320, jetGeo=new THREE.BufferGeometry(), jetPos=new Float32Array(jetCount*3);
              for(var ji=0;ji<jetCount;ji++){ var side=ji%2?1:-1, jy=side*(.5+Math.random()*4.6), spread=.014+Math.abs(jy)*.025, ja=Math.random()*Math.PI*2, jr=Math.pow(Math.random(),2)*spread; jetPos[ji*3]=Math.cos(ja)*jr; jetPos[ji*3+1]=jy; jetPos[ji*3+2]=Math.sin(ja)*jr; }
              jetGeo.setAttribute('position',new THREE.BufferAttribute(jetPos,3));
              var jetParticles=new THREE.Points(jetGeo,new THREE.PointsMaterial({color:0x9bdcff,size:.025,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false})); scene.add(jetParticles);
              function makeDropMaterial(color){ return new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:1,depthWrite:false}); }
              disposeFalling=function(item){ scene.remove(item.group); scene.remove(item.trail); item.group.traverse(function(node){if(node.geometry)node.geometry.dispose();if(node.material)node.material.dispose();}); item.trail.geometry.dispose(); item.trail.material.dispose(); };
              canvas._dropIntoBlackHole=function(type,massMode){
                if(fallingObjects.length>=4)disposeFalling(fallingObjects.shift());
                var group=new THREE.Group(), mainMat, mesh;
                if(type==='astronaut'){
                  mainMat=makeDropMaterial(0x72d7ff); mesh=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.18,16),mainMat); mesh.rotation.x=Math.PI/2; group.add(mesh);
                  var helmet=new THREE.Mesh(new THREE.SphereGeometry(.065,16,12),makeDropMaterial(0xe8f7ff)); helmet.position.z=.14; group.add(helmet);
                  var pack=new THREE.Mesh(new THREE.BoxGeometry(.09,.055,.13),makeDropMaterial(0x7c8da8)); pack.position.y=-.055; group.add(pack);
                }else if(type==='star'){
                  mainMat=makeDropMaterial(0xffc35a); mesh=new THREE.Mesh(new THREE.SphereGeometry(.115,24,18),mainMat); group.add(mesh);
                  var starHalo=new THREE.Mesh(new THREE.SphereGeometry(.16,20,14),new THREE.MeshBasicMaterial({color:0xff5a18,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false})); group.add(starHalo);
                }else{
                  mainMat=makeDropMaterial(0xd7e3f4); mesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,.2,16),mainMat); mesh.rotation.x=Math.PI/2; group.add(mesh);
                  var panelMat=makeDropMaterial(0x4f8fff), panelGeo=new THREE.BoxGeometry(.23,.055,.012);
                  var panelA=new THREE.Mesh(panelGeo,panelMat); panelA.position.x=.14; group.add(panelA); var panelB=panelA.clone(); panelB.position.x=-.14; group.add(panelB);
                }
                var trailArray=new Float32Array(96*3), trailGeo=new THREE.BufferGeometry(); trailGeo.setAttribute('position',new THREE.BufferAttribute(trailArray,3)); trailGeo.setDrawRange(0,0);
                var trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:massMode==='stellar'?0xff9b55:0x77bfff,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false})); scene.add(group); scene.add(trail);
                var item={group:group,trail:trail,trailArray:trailArray,trailCount:0,progress:0,phase:0,launchAngle:.42+Math.random()*.62,lift:.45+Math.random()*.35,strength:massMode==='stellar'?1:.23,label:type==='astronaut'?'Astronaut':type==='star'?'Star':'Probe'}; fallingObjects.push(item);
                var signalBar=document.getElementById('black-hole-signal-bar'),signalLabel=document.getElementById('black-hole-signal-label');if(signalBar){signalBar.style.width='100%';signalBar.style.backgroundColor='#38bdf8';}if(signalLabel)signalLabel.textContent='Distant received signal: 100%'; var status=document.getElementById('black-hole-status'); if(status)status.textContent=item.label+(paused?' is ready to fall. Start animation to begin.':' released. Watch radial stretching and sideways compression increase toward the horizon.');
              };
              updateFalling=function(dt){
                for(var fi=fallingObjects.length-1;fi>=0;fi--){
                  var item=fallingObjects[fi]; item.progress=Math.min(1,item.progress+dt*.19); var p=item.progress, eased=1-Math.pow(1-p,1.55), radius=2.65-2.36*eased, angle=item.launchAngle+p*2.55;
                  item.group.position.set(Math.cos(angle)*radius,item.lift*(1-p),Math.sin(angle)*radius); item.group.lookAt(0,0,0);
                  var close=Math.max(0,(1.55-radius)/1.18), stretch=1+item.strength*close*close*10; item.group.scale.set(1/Math.sqrt(stretch),1/Math.sqrt(stretch),stretch);
                  var fade=Math.max(0,Math.min(1,(radius-.3)/.34)); item.group.traverse(function(node){if(node.material){node.material.opacity=Math.min(node.material.opacity,fade);}});
                  if(item.trailCount<96 && p>=item.trailCount/95){var ti=item.trailCount++;item.trailArray[ti*3]=item.group.position.x;item.trailArray[ti*3+1]=item.group.position.y;item.trailArray[ti*3+2]=item.group.position.z;item.trail.geometry.attributes.position.needsUpdate=true;item.trail.geometry.setDrawRange(0,item.trailCount);}
                  if(fi===fallingObjects.length-1){var readout=document.getElementById('black-hole-drop-readout');if(readout)readout.textContent=item.label+' | '+(radius>.43?(radius/.43).toFixed(1)+' horizon radii':'inside horizon')+' | tidal stretch '+stretch.toFixed(1)+'x'; var signalRate=Math.max(0,Math.min(1,(radius-.43)/1.6)),signalBar=document.getElementById('black-hole-signal-bar'),signalLabel=document.getElementById('black-hole-signal-label');if(signalBar){signalBar.style.width=(signalRate*100).toFixed(0)+'%';signalBar.style.backgroundColor=signalRate>.55?'#38bdf8':signalRate>.2?'#f59e0b':'#ef4444';}if(signalLabel)signalLabel.textContent='Distant received signal: '+(signalRate*100).toFixed(0)+'%';}
                  if(close>.08&&item.phase<1){item.phase=1;if(fi===fallingObjects.length-1){var status=document.getElementById('black-hole-status');if(status)status.textContent='Tidal forces are now visibly stretching the '+item.label.toLowerCase()+' radially and squeezing it sideways.';}}
                  if(radius<.75&&item.phase<2){item.phase=2;if(fi===fallingObjects.length-1){var status=document.getElementById('black-hole-status');if(status)status.textContent=item.label+' is approaching the event horizon. Its light is fading from the distant observer view.';}}
                  if(radius<=.43&&item.phase<3){item.phase=3;if(fi===fallingObjects.length-1){var status=document.getElementById('black-hole-status');if(status)status.textContent=item.label+' crossed the event horizon. No signal from it can return.';}}
                  if(p>=1){if(fi===fallingObjects.length-1){var readout=document.getElementById('black-hole-drop-readout');if(readout)readout.textContent='Drop complete | object no longer visible';var signalBar=document.getElementById('black-hole-signal-bar'),signalLabel=document.getElementById('black-hole-signal-label');if(signalBar)signalBar.style.width='0%';if(signalLabel)signalLabel.textContent='Distant received signal: 0%';}disposeFalling(item);fallingObjects.splice(fi,1);}
                }
              }

              canvas._setBlackHoleSpin = function(v) { spin = v; diskMat.uniforms.uSpin.value = v; };
              canvas._setBlackHoleDisk = function(v) { diskPower = v; diskMat.uniforms.uPower.value = v; };
              canvas._setBlackHolePaused = function(v) { paused = v; };
              resize(); animate();
            }
            function resize() { if (!renderer) return; var w = canvas.clientWidth || 800, h = canvas.clientHeight || 540; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
            function updateCamera() { pitch = Math.max(-1.05, Math.min(1.05, pitch)); camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance, Math.sin(pitch)*distance, Math.cos(yaw)*Math.cos(pitch)*distance); camera.lookAt(0,0,0); if(lensArcA){lensArcA.quaternion.copy(camera.quaternion);lensArcA.rotateZ(-.52);} if(lensArcB){lensArcB.quaternion.copy(camera.quaternion);lensArcB.rotateZ(2.42);} if(coreGlow)coreGlow.position.copy(camera.position).normalize().multiplyScalar(-.16); }
            function animate(t) { if (stopped) return; frame = requestAnimationFrame(animate); if (!renderer || !inView) return; var delta=lastFrameTime?Math.min(.04,((t||0)-lastFrameTime)/1000):0; lastFrameTime=t||0; if (!paused && !pageHidden) { updateFalling(delta); disk.material.uniforms.uTime.value = (t || 0) * .001; stars.rotation.y += .00012; photonRing.rotation.z += .001 + spin*.002; if(corona)corona.rotation.z += .0015 + spin*.003; if(lensArcA)lensArcA.material.opacity=.38+Math.sin((t||0)*.0017)*.08; if(lensArcB)lensArcB.material.opacity=.23+Math.cos((t||0)*.0013)*.05; if(coreGlow)coreGlow.material.opacity=.64+Math.sin((t||0)*.002)*.06; } updateCamera(); renderer.render(scene,camera); }
            canvas.addEventListener('pointerdown', function(e){ drag=true; lastX=e.clientX; lastY=e.clientY; canvas.setPointerCapture(e.pointerId); });
            canvas.addEventListener('pointermove', function(e){ if(!drag)return; yaw-=(e.clientX-lastX)*.006; pitch+=(e.clientY-lastY)*.006; lastX=e.clientX; lastY=e.clientY; });
            canvas.addEventListener('pointerup', function(){drag=false;});
            canvas.addEventListener('pointercancel', function(){drag=false;});
            canvas.addEventListener('wheel', function(e){e.preventDefault(); distance=Math.max(1.6,Math.min(6,distance+e.deltaY*.002));},{passive:false});
            canvas.addEventListener('keydown', function(e){ var handled=true; if(e.key==='ArrowLeft')yaw-=.1; else if(e.key==='ArrowRight')yaw+=.1; else if(e.key==='ArrowUp')pitch+=.1; else if(e.key==='ArrowDown')pitch-=.1; else if(e.key==='+'||e.key==='=')distance=Math.max(1.6,distance-.2); else if(e.key==='-')distance=Math.min(6,distance+.2); else if(e.key==='Home'){yaw=.28;pitch=.28;distance=3.25; var status=document.getElementById('black-hole-status'); if(status)status.textContent='Camera reset to the starting view.';} else handled=false; if(handled)e.preventDefault(); });
            function onContextLost(e){ e.preventDefault(); paused=true; var status=document.getElementById('black-hole-status'); if(status)status.textContent='The 3-D graphics context was interrupted. The simulation is paused while it recovers.'; }
            function onContextRestored(){ paused=canvas.getAttribute('data-paused')==='true'; var status=document.getElementById('black-hole-status'); if(status)status.textContent=paused?'The 3-D view recovered and remains paused.':'The 3-D view recovered and is running.'; }
            canvas.addEventListener('webglcontextlost',onContextLost,false);
            canvas.addEventListener('webglcontextrestored',onContextRestored,false);
            function onVisibilityChange(){ pageHidden=!!document.hidden; }
            document.addEventListener('visibilitychange', onVisibilityChange);
            if (window.IntersectionObserver) { observer=new IntersectionObserver(function(entries){ inView=!!(entries[0]&&entries[0].isIntersecting); },{rootMargin:'100px'}); observer.observe(canvas); }
            window.addEventListener('resize', resize);
            canvas._blackHoleCleanup = function(){ stopped=true; cancelAnimationFrame(frame); window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',onVisibilityChange); canvas.removeEventListener('webglcontextlost',onContextLost); canvas.removeEventListener('webglcontextrestored',onContextRestored); if(observer)observer.disconnect(); while(fallingObjects.length)disposeFalling(fallingObjects.pop()); if(renderer)renderer.dispose(); };
            if (window.THREE) init(); else { window.StemLab.ensureThree({ orbit: false }).then(init).catch(function(){ var fallback=document.getElementById('black-hole-status'); if(fallback)fallback.textContent='The 3-D library could not load. The labeled black-hole explanation remains available.'; }); }
          }, []);
          function generateStars(THREE, count, gType, galaxyType, ageDist) {

            var starGeo = new THREE.BufferGeometry();

            var starPos = new Float32Array(count * 3), starColors = new Float32Array(count * 3), starData = [];

            var starTypeArr = new Float32Array(count), starPhaseArr = new Float32Array(count);

            for (var i = 0; i < count; i++) {

              var x, y, z;

              if (galaxyType === 'elliptical') {

                var r = Math.pow(Math.random(), 0.5) * 0.6;

                var theta = Math.random() * Math.PI * 2;

                var phi = (Math.random() - 0.5) * Math.PI;

                x = Math.cos(theta) * Math.cos(phi) * r;

                z = Math.sin(theta) * Math.cos(phi) * r;

                y = Math.sin(phi) * r * 0.6;

              } else if (galaxyType === 'irregular') {

                x = (Math.random() - 0.5) * 0.8;

                z = (Math.random() - 0.5) * 0.6;

                y = (Math.random() - 0.5) * 0.3;

                var clumpChance = Math.random();

                if (clumpChance < 0.3) { var cx = (Math.random() - 0.5) * 0.4; var cz = (Math.random() - 0.5) * 0.3; x = cx + (Math.random() - 0.5) * 0.15; z = cz + (Math.random() - 0.5) * 0.15; y *= 0.5; }

              } else {

                var arm = i % (gType.arms || 4);

                var armAngle = (arm / (gType.arms || 4)) * Math.PI * 2;

                var dist = Math.pow(Math.random(), 0.6) * 0.8;

                var windTight = gType.windTightness || 2.5;

                var barLen = gType.barLength || 0;

                var spread = 0.12 * dist + 0.04;

                var angle = armAngle + dist * windTight + (Math.random() - 0.5) * spread;

                if (barLen > 0 && dist < barLen) {

                  var barAngle = (arm % 2 === 0) ? 0 : Math.PI;

                  x = Math.cos(barAngle) * dist + (Math.random() - 0.5) * 0.04;

                  z = Math.sin(barAngle) * dist * 0.15 + (Math.random() - 0.5) * 0.03;

                } else {

                  var armSpread = 0.02 + dist * 0.05;

                  x = Math.cos(angle) * dist + (Math.random() - 0.5) * armSpread;

                  z = Math.sin(angle) * dist + (Math.random() - 0.5) * armSpread;

                }

                y = (Math.random() - 0.5) * 0.06 * (1 - dist * 0.7);

              }

              starPos[i * 3] = x; starPos[i * 3 + 1] = y; starPos[i * 3 + 2] = z;

              var pcts = ageDist || [0.003, 0.13, 0.6, 3, 7.6, 12.1, 76.5];

              var pctTotal = pcts.reduce(function (a, b) { return a + b; }, 0);

              var cum = 0, roll = Math.random() * pctTotal, typeIdx = 6;

              for (var ti = 0; ti < pcts.length; ti++) { cum += pcts[ti]; if (roll < cum) { typeIdx = ti; break; } }

              var st = STAR_TYPES[typeIdx], c = new THREE.Color(st.color);

              starColors[i * 3] = c.r; starColors[i * 3 + 1] = c.g; starColors[i * 3 + 2] = c.b;

              starTypeArr[i] = typeIdx; starPhaseArr[i] = Math.random();

              starData.push({ type: st, x: x, y: y, z: z, idx: i });

            }

            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

            starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

            starGeo.setAttribute('aStarType', new THREE.BufferAttribute(starTypeArr, 1));

            starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhaseArr, 1));

            return { geo: starGeo, data: starData };

          }



          function initGalaxy(canvasEl) {

            var THREE = window.THREE;

            var W = canvasEl.offsetWidth, H = canvasEl.offsetHeight;

            var scene = new THREE.Scene();

            var camera = new THREE.PerspectiveCamera(60, W / H, 0.01, 100);

            camera.position.set(0, 0.5, 1.2); camera.lookAt(0, 0, 0);
            scene.add(camera);

            var renderer;
            try {
              renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' });
            } catch (e) {
              console.error('[Galaxy] WebGLRenderer creation failed:', e);
              setTimeout(function() {
                upd('webglError', true);
              }, 0);
              return;
            }

            renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            if (THREE.ACESFilmicToneMapping) {
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 1.12;
            }
            renderer.setClearColor(0x020208, 1);



            // ── Layer groups ──

            var bgGroup = new THREE.Group(); bgGroup.name = 'bgStars';

            var armGroup = new THREE.Group(); armGroup.name = 'arms';

            var bulgeGroup = new THREE.Group(); bulgeGroup.name = 'bulge';

            var bhGroup = new THREE.Group(); bhGroup.name = 'blackHole';

            var nebGroup = new THREE.Group(); nebGroup.name = 'nebulae';

            var gridGroup = new THREE.Group(); gridGroup.name = 'grid'; gridGroup.visible = false;

            var labelGroup = new THREE.Group(); labelGroup.name = 'labels'; labelGroup.visible = false;

            var infraredGroup = new THREE.Group(); infraredGroup.name = 'infrared';

            var radioGroup = new THREE.Group(); radioGroup.name = 'radio';

            var xrayGroup = new THREE.Group(); xrayGroup.name = 'xray';

            var darkHaloGroup = new THREE.Group(); darkHaloGroup.name = 'darkMatterHalo';

            scene.add(bgGroup); scene.add(armGroup); scene.add(bulgeGroup);

            scene.add(bhGroup); scene.add(nebGroup); scene.add(gridGroup); scene.add(labelGroup);

            scene.add(infraredGroup); scene.add(radioGroup); scene.add(xrayGroup); scene.add(darkHaloGroup);



            // Background stars

            var bgGeo = new THREE.BufferGeometry(), bgCount = 2000, bgPos = new Float32Array(bgCount * 3);

            for (var i = 0; i < bgCount; i++) { bgPos[i * 3] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 1] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 2] = (Math.random() - 0.5) * 20; }

            bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));

            bgGroup.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0xccccff, size: 0.015, transparent: true, opacity: 0.3, sizeAttenuation: true })));

            var deepFieldGroup = new THREE.Group(); deepFieldGroup.name = 'deepField';
            var cosmicFilamentGroup = new THREE.Group(); cosmicFilamentGroup.name = 'cosmicFilaments';
            bgGroup.add(deepFieldGroup); bgGroup.add(cosmicFilamentGroup);
            var deepFieldMats = [], distantGalaxySprites = [], filamentMats = [];
            var deepFieldGlow = { galaxies: 0.28, filaments: 0.16 };
            var foregroundGroup = new THREE.Group(); foregroundGroup.name = 'cinematicForeground';
            var warpStreakGroup = new THREE.Group(); warpStreakGroup.name = 'warpStreaks'; warpStreakGroup.visible = false;
            var warpShockGroup = new THREE.Group(); warpShockGroup.name = 'warpArrivalShock'; warpShockGroup.visible = false;
            var apertureSweepGroup = new THREE.Group(); apertureSweepGroup.name = 'cinematicApertureSweep';
            warpStreakGroup.position.set(0, 0, -0.62);
            warpShockGroup.position.set(0, 0, -0.86);
            apertureSweepGroup.position.set(0, 0, -0.72);
            bgGroup.add(foregroundGroup); camera.add(warpStreakGroup); camera.add(warpShockGroup); camera.add(apertureSweepGroup);
            var foregroundSprites = [], warpStreakSprites = [], warpShockRings = [], apertureSweepSprites = [];
            var cinematicMotion = { warp: 0, shock: 0, aperture: 0, foreground: 1 };

            (function () {
              var fgCv = document.createElement('canvas'); fgCv.width = 96; fgCv.height = 96;
              var fgCtx = fgCv.getContext('2d');
              fgCtx.translate(48, 48);
              var fgCore = fgCtx.createRadialGradient(0, 0, 0, 0, 0, 45);
              fgCore.addColorStop(0, 'rgba(255,255,255,1)');
              fgCore.addColorStop(0.2, 'rgba(191,219,254,0.52)');
              fgCore.addColorStop(0.55, 'rgba(125,211,252,0.12)');
              fgCore.addColorStop(1, 'rgba(0,0,0,0)');
              fgCtx.fillStyle = fgCore; fgCtx.fillRect(-48, -48, 96, 96);
              for (var fsr = 0; fsr < 2; fsr++) {
                var fgLine = fgCtx.createLinearGradient(-44, 0, 44, 0);
                fgLine.addColorStop(0, 'rgba(255,255,255,0)');
                fgLine.addColorStop(0.5, 'rgba(255,255,255,0.52)');
                fgLine.addColorStop(1, 'rgba(255,255,255,0)');
                fgCtx.strokeStyle = fgLine; fgCtx.lineWidth = 1.4;
                fgCtx.beginPath(); fgCtx.moveTo(-44, 0); fgCtx.lineTo(44, 0); fgCtx.stroke();
                fgCtx.rotate(Math.PI * 0.5);
              }
              var fgTex = new THREE.CanvasTexture(fgCv);

              var streakCv = document.createElement('canvas'); streakCv.width = 192; streakCv.height = 32;
              var streakCtx = streakCv.getContext('2d');
              var streakGrad = streakCtx.createLinearGradient(0, 16, 192, 16);
              streakGrad.addColorStop(0, 'rgba(255,255,255,0)');
              streakGrad.addColorStop(0.28, 'rgba(96,165,250,0.18)');
              streakGrad.addColorStop(0.52, 'rgba(255,255,255,0.92)');
              streakGrad.addColorStop(0.72, 'rgba(244,114,182,0.18)');
              streakGrad.addColorStop(1, 'rgba(255,255,255,0)');
              streakCtx.fillStyle = streakGrad; streakCtx.fillRect(0, 13, 192, 6);
              streakCtx.fillStyle = 'rgba(255,255,255,0.32)'; streakCtx.fillRect(44, 15, 104, 2);
              var streakTex = new THREE.CanvasTexture(streakCv);

              var sweepCv = document.createElement('canvas'); sweepCv.width = 384; sweepCv.height = 48;
              var sweepCtx = sweepCv.getContext('2d');
              var sweepGrad = sweepCtx.createLinearGradient(0, 24, 384, 24);
              sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
              sweepGrad.addColorStop(0.34, 'rgba(125,211,252,0.06)');
              sweepGrad.addColorStop(0.5, 'rgba(255,255,255,0.46)');
              sweepGrad.addColorStop(0.66, 'rgba(244,114,182,0.08)');
              sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
              sweepCtx.fillStyle = sweepGrad; sweepCtx.fillRect(0, 20, 384, 8);
              sweepCtx.fillStyle = 'rgba(255,255,255,0.2)'; sweepCtx.fillRect(118, 23, 148, 2);
              var sweepTex = new THREE.CanvasTexture(sweepCv);

              for (var fg = 0; fg < 42; fg++) {
                var fgMat = new THREE.SpriteMaterial({ map: fgTex, transparent: true, opacity: 0.06 + Math.random() * 0.16, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: Math.random() < 0.6 ? 0xdbeafe : 0xfbcfe8, rotation: Math.random() * Math.PI });
                var fgSprite = new THREE.Sprite(fgMat);
                var fgA = Math.random() * Math.PI * 2;
                var fgR = 1.35 + Math.random() * 2.2;
                fgSprite.position.set(Math.cos(fgA) * fgR, (Math.random() - 0.5) * 1.7, Math.sin(fgA) * fgR + 0.35);
                var fgScale = 0.018 + Math.random() * 0.052;
                fgSprite.scale.set(fgScale, fgScale, 1);
                fgSprite.userData = { baseOpacity: fgMat.opacity, baseScale: fgScale, phase: Math.random() * Math.PI * 2, drift: 0.00016 + Math.random() * 0.00026 };
                foregroundGroup.add(fgSprite);
                foregroundSprites.push(fgSprite);
              }

              for (var ws = 0; ws < 54; ws++) {
                var wsMat = new THREE.SpriteMaterial({ map: streakTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
                var wsSprite = new THREE.Sprite(wsMat);
                var wsA = Math.random() * Math.PI * 2;
                var wsR = 0.08 + Math.random() * 0.82;
                wsSprite.position.set(Math.cos(wsA) * wsR, Math.sin(wsA) * wsR * 0.58, -0.16 - Math.random() * 0.5);
                wsSprite.scale.set(0.22 + Math.random() * 0.28, 0.025 + Math.random() * 0.018, 1);
                wsSprite.userData = { angle: wsA, radius: wsR, speed: 0.006 + Math.random() * 0.012, baseScaleX: wsSprite.scale.x, baseScaleY: wsSprite.scale.y };
                warpStreakGroup.add(wsSprite);
                warpStreakSprites.push(wsSprite);
              }

              for (var wr = 0; wr < 3; wr++) {
                var wrGeo = new THREE.RingGeometry(0.18 + wr * 0.035, 0.188 + wr * 0.035, 96);
                var wrMat = new THREE.MeshBasicMaterial({ color: wr === 1 ? 0xf0abfc : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                var wrMesh = new THREE.Mesh(wrGeo, wrMat);
                wrMesh.userData = { delay: wr * 0.12, baseOpacity: wr === 1 ? 0.18 : 0.24, spin: wr % 2 ? -0.0018 : 0.0022 };
                wrMesh.renderOrder = 8;
                warpShockGroup.add(wrMesh);
                warpShockRings.push(wrMesh);
              }

              for (var swp = 0; swp < 3; swp++) {
                var swpMat = new THREE.SpriteMaterial({ map: sweepTex, transparent: true, opacity: 0.035 + swp * 0.012, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: (swp - 1) * 0.11 });
                var swpSprite = new THREE.Sprite(swpMat);
                swpSprite.position.set((swp - 1) * 0.12, -0.2 + swp * 0.18, -0.04);
                swpSprite.scale.set(1.1 + swp * 0.18, 0.05 + swp * 0.01, 1);
                swpSprite.userData = { baseOpacity: swpMat.opacity, baseX: swpSprite.position.x, baseY: swpSprite.position.y, baseScaleX: swpSprite.scale.x, baseScaleY: swpSprite.scale.y, phase: swp * 1.7 };
                swpSprite.renderOrder = 9;
                apertureSweepGroup.add(swpSprite);
                apertureSweepSprites.push(swpSprite);
              }

              var cloudCv = document.createElement('canvas'); cloudCv.width = 256; cloudCv.height = 256;
              var cloudCtx = cloudCv.getContext('2d');
              var cloudGrad = cloudCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
              cloudGrad.addColorStop(0, 'rgba(125,211,252,0.36)');
              cloudGrad.addColorStop(0.28, 'rgba(244,114,182,0.18)');
              cloudGrad.addColorStop(0.58, 'rgba(167,139,250,0.08)');
              cloudGrad.addColorStop(1, 'rgba(0,0,0,0)');
              cloudCtx.fillStyle = cloudGrad; cloudCtx.fillRect(0, 0, 256, 256);
              for (var cs = 0; cs < 95; cs++) {
                var ca = Math.random() * Math.PI * 2;
                var cr = Math.pow(Math.random(), 0.55) * 118;
                var cx = 128 + Math.cos(ca) * cr;
                var cy = 128 + Math.sin(ca) * cr * 0.72;
                cloudCtx.fillStyle = cs % 3 === 0 ? 'rgba(253,224,71,0.06)' : cs % 3 === 1 ? 'rgba(96,165,250,0.07)' : 'rgba(244,114,182,0.06)';
                cloudCtx.beginPath(); cloudCtx.arc(cx, cy, 2 + Math.random() * 9, 0, Math.PI * 2); cloudCtx.fill();
              }
              var cloudTex = new THREE.CanvasTexture(cloudCv);
              for (var cvI = 0; cvI < 5; cvI++) {
                var cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.07 + cvI * 0.012, depthWrite: false, blending: THREE.AdditiveBlending, rotation: cvI * 0.7 });
                var cloud = new THREE.Sprite(cloudMat);
                cloud.position.set(Math.cos(cvI * 1.37) * (2.5 + cvI * 0.28), (cvI - 2) * 0.34, Math.sin(cvI * 1.1) * 2.2 - 2.2);
                cloud.scale.set(1.7 + cvI * 0.28, 1.05 + cvI * 0.2, 1);
                cloud.userData = { baseOpacity: cloudMat.opacity, phase: cvI * 1.9 };
                deepFieldGroup.add(cloud);
                deepFieldMats.push(cloudMat);
              }

              var galaxyCv = document.createElement('canvas'); galaxyCv.width = 128; galaxyCv.height = 128;
              var galaxyCtx = galaxyCv.getContext('2d');
              galaxyCtx.translate(64, 64);
              var gBack = galaxyCtx.createRadialGradient(0, 0, 0, 0, 0, 58);
              gBack.addColorStop(0, 'rgba(255,255,255,0.95)');
              gBack.addColorStop(0.14, 'rgba(254,240,138,0.58)');
              gBack.addColorStop(0.35, 'rgba(125,211,252,0.2)');
              gBack.addColorStop(0.7, 'rgba(168,85,247,0.1)');
              gBack.addColorStop(1, 'rgba(0,0,0,0)');
              galaxyCtx.fillStyle = gBack; galaxyCtx.fillRect(-64, -64, 128, 128);
              for (var ga2 = 0; ga2 < 2; ga2++) {
                galaxyCtx.beginPath();
                for (var gst = 0; gst <= 80; gst++) {
                  var gf = gst / 80;
                  var gr2 = 5 + gf * 52;
                  var gt2 = ga2 * Math.PI + gf * 4.7;
                  var gx2 = Math.cos(gt2) * gr2;
                  var gy2 = Math.sin(gt2) * gr2 * 0.38;
                  if (gst === 0) galaxyCtx.moveTo(gx2, gy2);
                  else galaxyCtx.lineTo(gx2, gy2);
                }
                galaxyCtx.strokeStyle = ga2 ? 'rgba(244,114,182,0.34)' : 'rgba(125,211,252,0.38)';
                galaxyCtx.lineWidth = 5.5;
                galaxyCtx.lineCap = 'round';
                galaxyCtx.stroke();
              }
              var distantGalaxyTex = new THREE.CanvasTexture(galaxyCv);
              for (var dg = 0; dg < 22; dg++) {
                var dgMat = new THREE.SpriteMaterial({ map: distantGalaxyTex, transparent: true, opacity: 0.1 + Math.random() * 0.16, depthWrite: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
                var dgSprite = new THREE.Sprite(dgMat);
                var dgAng = Math.random() * Math.PI * 2;
                var dgRad = 2.3 + Math.random() * 4.6;
                dgSprite.position.set(Math.cos(dgAng) * dgRad, (Math.random() - 0.5) * 3.8, Math.sin(dgAng) * dgRad - 2.7);
                var dgScale = 0.08 + Math.random() * 0.2;
                dgSprite.scale.set(dgScale * (1.2 + Math.random()), dgScale, 1);
                dgSprite.userData = { baseOpacity: dgMat.opacity, phase: Math.random() * Math.PI * 2 };
                deepFieldGroup.add(dgSprite);
                distantGalaxySprites.push(dgSprite);
                deepFieldMats.push(dgMat);
              }

              for (var fi = 0; fi < 6; fi++) {
                var fGeo = new THREE.BufferGeometry();
                var fPos = new Float32Array(90 * 3);
                for (var fp = 0; fp < 90; fp++) {
                  var ff = fp / 89;
                  var fa = -1.1 + ff * 2.2 + fi * 0.36;
                  var fr2 = 1.6 + fi * 0.18 + 0.08 * Math.sin(ff * Math.PI * 3 + fi);
                  fPos[fp * 3] = Math.cos(fa) * fr2;
                  fPos[fp * 3 + 1] = -0.78 + fi * 0.31 + 0.05 * Math.sin(ff * Math.PI * 4);
                  fPos[fp * 3 + 2] = Math.sin(fa) * fr2 - 0.55;
                }
                fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
                var fMat = new THREE.LineBasicMaterial({ color: fi % 2 ? 0x60a5fa : 0xe879f9, transparent: true, opacity: 0.1 + fi * 0.011, blending: THREE.AdditiveBlending, depthWrite: false });
                var line = new THREE.Line(fGeo, fMat);
                line.userData = { phase: fi * 1.3 };
                cosmicFilamentGroup.add(line);
                filamentMats.push(fMat);
              }
            })();



            // Spiral galaxy stars

            var starResult = generateStars(THREE, starCount, gType, galaxyType);

            var starShaderMat = new THREE.ShaderMaterial({

              uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uRotMode: { value: rotMode === 'rigid' ? 0 : rotMode === 'keplerian' ? 1 : 2 }, uObserve: { value: observeMode === 'infrared' ? 1 : observeMode === 'radio' ? 2 : observeMode === 'xray' ? 3 : observeMode === 'gravity' ? 4 : 0 } },

              vertexShader: [

                'attribute float aStarType;',

                'attribute float aPhase;',

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'uniform float uTime;',

                'uniform float uPR;',

                'uniform float uRotMode;',

                'void main() {',

                '  vSC = color;',

                '  vType = aStarType;',

                '  float sz = 5.0 - aStarType * 0.5;',

                '  float twinkleSpeed = 0.8 + aStarType * 0.3;',

                '  vA = 0.6 + 0.4 * sin(uTime * twinkleSpeed + aPhase * 6.283);',

                // Per-star orbital motion: each star circles the center at an angular speed
                // set by the rotation-curve model (0 rigid disk, 1 Keplerian, 2 observed flat).
                '  vec3 p = position;',

                '  float rr = length(position.xz);',

                '  if (rr > 0.001) {',

                '    float a0 = atan(position.z, position.x);',

                '    float omega = uRotMode < 0.5 ? 0.018 : (uRotMode < 1.5 ? 0.012 / pow(max(rr, 0.06), 1.5) : 0.03 / max(rr, 0.06));',

                '    float aa = a0 + uTime * omega;',

                '    p = vec3(cos(aa) * rr, position.y, sin(aa) * rr);',

                '  }',

                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',

                '  gl_PointSize = min(sz * uPR * (80.0 / max(-mv.z, 1.0)), 14.0);',

                '  gl_Position = projectionMatrix * mv;',

                '}'

              ].join('\n'),

              fragmentShader: [

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'uniform float uObserve;',

                'void main() {',

                '  float d = length(gl_PointCoord - 0.5) * 2.0;',

                '  if (d > 1.0) discard;',

                '  float glow = exp(-d * d * 8.0);',

                '  float core = smoothstep(1.0, 0.0, d);',

                '  float brightness = mix(1.0, 0.5, vType / 6.0);',

                '  vec3 col = vSC * (0.2 + 0.8 * glow) * brightness;',

                '  float alpha = core * vA * 0.75;',

                '  if (uObserve > 0.5 && uObserve < 1.5) {',

                '    col = mix(col, vec3(1.0, 0.42, 0.12), 0.42) * mix(1.24, 0.75, vType / 6.0);',

                '    alpha *= 0.9;',

                '  } else if (uObserve > 1.5 && uObserve < 2.5) {',

                '    col = vec3(0.07, 0.72, 0.88) * (0.16 + 0.35 * glow);',

                '    alpha *= 0.42;',

                '  } else if (uObserve > 2.5 && uObserve < 3.5) {',

                '    float hot = 1.0 - smoothstep(0.0, 2.6, vType);',

                '    col = mix(vec3(0.02, 0.04, 0.08), vec3(0.55, 0.85, 1.0), hot) * (0.25 + glow);',

                '    alpha *= max(0.05, hot);',

                '  } else if (uObserve > 3.5) {',

                '    col = vec3(0.58, 0.28, 0.95) * (0.12 + 0.25 * glow);',

                '    alpha *= 0.34;',

                '  }',

                '  gl_FragColor = vec4(col, alpha);',

                '}'

              ].join('\n'),

              vertexColors: true,

              transparent: true,

              depthWrite: false,

              blending: THREE.AdditiveBlending

            });

            var starPoints = new THREE.Points(starResult.geo, starShaderMat);

            armGroup.add(starPoints);
            starPoints.renderOrder = 2;

            var starData = starResult.data;

            var visualGlow = { disk: 0.16, arms: 0.18, core: 0.42 };
            var diskSheenMat = null, armGlowMat = null, coreFlare = null;
            var coreLightBars = [];
            var streamlineGroup = new THREE.Group(); streamlineGroup.name = 'orbitalStreamlines'; streamlineGroup.renderOrder = 3; armGroup.add(streamlineGroup);
            var streamlineMats = [], streamlineGlow = 1;
            (function () {
              var streamCount = galaxyType === 'irregular' ? 5 : galaxyType === 'elliptical' ? 5 : 7;
              var segments = 176;
              for (var si = 0; si < streamCount; si++) {
                var pts = [];
                var baseR = (galaxyType === 'elliptical' ? 0.16 : 0.18) + si * (galaxyType === 'elliptical' ? 0.1 : 0.092);
                for (var stp = 0; stp <= segments; stp++) {
                  var t = stp / segments;
                  var angle = t * Math.PI * 2;
                  var radius = baseR;
                  var y = Math.sin(angle * 2 + si) * 0.003;
                  var zScale = galaxyType === 'elliptical' ? 0.68 : 1;
                  if (galaxyType === 'irregular') {
                    radius += Math.sin(angle * 2.7 + si * 1.4) * 0.05 + Math.sin(angle * 5.1 + si) * 0.016;
                    y += Math.sin(angle * 3.2 + si) * 0.016;
                    zScale = 0.82 + 0.08 * Math.sin(si);
                  } else if (galaxyType !== 'elliptical') {
                    var armCount = gType.arms || 4;
                    radius += 0.026 * Math.sin(angle * armCount + si * 0.9);
                    angle += 0.08 * Math.sin(t * Math.PI * 2 + si * 0.7);
                  }
                  pts.push(new THREE.Vector3(Math.cos(angle) * radius, y + 0.006, Math.sin(angle) * radius * zScale));
                }
                var streamGeo = new THREE.BufferGeometry().setFromPoints(pts);
                var streamMat = new THREE.LineBasicMaterial({ color: si % 3 === 1 ? 0xf0abfc : si % 3 === 2 ? 0xfde68a : 0x93c5fd, transparent: true, opacity: 0.035 + si * 0.006, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                streamMat.userData = { baseOpacity: streamMat.opacity, phase: Math.random() * Math.PI * 2 };
                var streamLine = new THREE.Line(streamGeo, streamMat);
                streamLine.userData = { drift: (si % 2 ? -1 : 1) * (0.00008 + si * 0.000012) };
                streamLine.renderOrder = 3;
                streamlineGroup.add(streamLine);
                streamlineMats.push(streamMat);
              }
            })();
            var sparkleGroup = new THREE.Group(); sparkleGroup.name = 'stellarGlints'; sparkleGroup.renderOrder = 3; armGroup.add(sparkleGroup);
            var sparkleSprites = [];
            var sparkleTex = null;

            (function () {
              var softCv = document.createElement('canvas'); softCv.width = 64; softCv.height = 64;
              var softCtx = softCv.getContext('2d');
              var softGrad = softCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
              softGrad.addColorStop(0, 'rgba(255,255,255,1)');
              softGrad.addColorStop(0.28, 'rgba(255,255,255,0.42)');
              softGrad.addColorStop(1, 'rgba(255,255,255,0)');
              softCtx.fillStyle = softGrad; softCtx.fillRect(0, 0, 64, 64);
              var softTex = new THREE.CanvasTexture(softCv);

              var diskCv = document.createElement('canvas'); diskCv.width = 512; diskCv.height = 512;
              var diskCtx = diskCv.getContext('2d');
              var diskGrad = diskCtx.createRadialGradient(256, 256, 0, 256, 256, 245);
              diskGrad.addColorStop(0, 'rgba(255,239,196,0.56)');
              diskGrad.addColorStop(0.16, 'rgba(251,191,36,0.24)');
              diskGrad.addColorStop(0.44, 'rgba(96,165,250,0.13)');
              diskGrad.addColorStop(0.72, 'rgba(217,70,239,0.08)');
              diskGrad.addColorStop(1, 'rgba(2,6,23,0)');
              diskCtx.fillStyle = diskGrad; diskCtx.fillRect(0, 0, 512, 512);
              diskCtx.save(); diskCtx.translate(256, 256); diskCtx.scale(1, 0.68);
              var diskArms = Math.max(2, gType.arms || (galaxyType === 'elliptical' ? 2 : 3));
              for (var da = 0; da < diskArms; da++) {
                for (var pass = 0; pass < 3; pass++) {
                  diskCtx.beginPath();
                  for (var step = 0; step <= 95; step++) {
                    var frac = step / 95;
                    var rr = 18 + frac * 224;
                    var aa = da / diskArms * Math.PI * 2 + frac * (gType.windTightness || 2.4) * 2.2 + pass * 0.038;
                    var px = Math.cos(aa) * rr;
                    var py = Math.sin(aa) * rr;
                    if (step === 0) diskCtx.moveTo(px, py);
                    else diskCtx.lineTo(px, py);
                  }
                  diskCtx.strokeStyle = pass === 0 ? 'rgba(125,211,252,0.22)' : pass === 1 ? 'rgba(244,114,182,0.16)' : 'rgba(253,224,71,0.11)';
                  diskCtx.lineWidth = pass === 0 ? 16 : 9;
                  diskCtx.lineCap = 'round';
                  diskCtx.stroke();
                }
              }
              diskCtx.restore();
              var diskTex = new THREE.CanvasTexture(diskCv);
              diskSheenMat = new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, opacity: visualGlow.disk, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
              var diskSheen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), diskSheenMat);
              diskSheen.rotation.x = Math.PI * 0.5;
              diskSheen.position.y = -0.012;
              diskSheen.renderOrder = -2;
              armGroup.add(diskSheen);

              var glowCount = galaxyType === 'elliptical' ? 1800 : galaxyType === 'irregular' ? 2400 : 4200;
              var glowGeo = new THREE.BufferGeometry();
              var glowPos = new Float32Array(glowCount * 3);
              var glowCol = new Float32Array(glowCount * 3);
              for (var gi2 = 0; gi2 < glowCount; gi2++) {
                var gx, gy, gz, hue;
                if (galaxyType === 'elliptical') {
                  var er = Math.pow(Math.random(), 0.38) * 0.74;
                  var et = Math.random() * Math.PI * 2;
                  var ep = (Math.random() - 0.5) * Math.PI * 0.72;
                  gx = Math.cos(et) * Math.cos(ep) * er;
                  gy = Math.sin(ep) * er * 0.34;
                  gz = Math.sin(et) * Math.cos(ep) * er * 0.78;
                  hue = 0.10 + Math.random() * 0.05;
                } else if (galaxyType === 'irregular') {
                  var clumpA = (gi2 % 7) / 7 * Math.PI * 2 + Math.sin(gi2) * 0.3;
                  var clumpR = 0.12 + ((gi2 * 37) % 100) / 100 * 0.48;
                  gx = Math.cos(clumpA) * clumpR + (Math.random() - 0.5) * 0.18;
                  gy = (Math.random() - 0.5) * 0.18;
                  gz = Math.sin(clumpA) * clumpR * 0.74 + (Math.random() - 0.5) * 0.16;
                  hue = Math.random() < 0.5 ? 0.55 + Math.random() * 0.05 : 0.90 + Math.random() * 0.07;
                } else {
                  var ga = gi2 % (gType.arms || 4);
                  var ga0 = ga / (gType.arms || 4) * Math.PI * 2;
                  var gr = Math.pow(Math.random(), 0.58) * 0.86;
                  var gw = gType.windTightness || 2.5;
                  var armWidth = 0.035 + gr * 0.07;
                  var gang = ga0 + gr * gw + (Math.random() - 0.5) * armWidth;
                  if (gType.barLength && gr < gType.barLength) {
                    var barAng = ga % 2 === 0 ? 0 : Math.PI;
                    gx = Math.cos(barAng) * gr + (Math.random() - 0.5) * 0.05;
                    gz = Math.sin(barAng) * gr * 0.18 + (Math.random() - 0.5) * 0.04;
                  } else {
                    gx = Math.cos(gang) * gr + (Math.random() - 0.5) * armWidth;
                    gz = Math.sin(gang) * gr + (Math.random() - 0.5) * armWidth;
                  }
                  gy = (Math.random() - 0.5) * 0.045 * (1 - gr * 0.45);
                  hue = Math.random() < 0.54 ? 0.56 + Math.random() * 0.05 : Math.random() < 0.78 ? 0.91 + Math.random() * 0.06 : 0.12;
                }
                glowPos[gi2 * 3] = gx; glowPos[gi2 * 3 + 1] = gy; glowPos[gi2 * 3 + 2] = gz;
                var glowColor = new THREE.Color().setHSL(hue, 0.88, galaxyType === 'elliptical' ? 0.44 : 0.5 + Math.random() * 0.14);
                glowCol[gi2 * 3] = glowColor.r; glowCol[gi2 * 3 + 1] = glowColor.g; glowCol[gi2 * 3 + 2] = glowColor.b;
              }
              glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
              glowGeo.setAttribute('color', new THREE.BufferAttribute(glowCol, 3));
              armGlowMat = new THREE.PointsMaterial({ size: galaxyType === 'elliptical' ? 0.06 : 0.046, map: softTex, vertexColors: true, transparent: true, opacity: visualGlow.arms, depthWrite: false, blending: THREE.AdditiveBlending });
              var armGlowPoints = new THREE.Points(glowGeo, armGlowMat);
              armGlowPoints.renderOrder = 0;
              armGroup.add(armGlowPoints);

              var spCv = document.createElement('canvas'); spCv.width = 96; spCv.height = 96;
              var spCtx = spCv.getContext('2d');
              spCtx.translate(48, 48);
              var spGrad = spCtx.createRadialGradient(0, 0, 0, 0, 0, 42);
              spGrad.addColorStop(0, 'rgba(255,255,255,1)');
              spGrad.addColorStop(0.18, 'rgba(191,219,254,0.74)');
              spGrad.addColorStop(0.54, 'rgba(244,114,182,0.2)');
              spGrad.addColorStop(1, 'rgba(255,255,255,0)');
              spCtx.fillStyle = spGrad; spCtx.fillRect(-48, -48, 96, 96);
              for (var sr = 0; sr < 4; sr++) {
                spCtx.rotate(Math.PI * 0.25);
                var rayGrad = spCtx.createLinearGradient(-44, 0, 44, 0);
                rayGrad.addColorStop(0, 'rgba(255,255,255,0)');
                rayGrad.addColorStop(0.48, 'rgba(255,255,255,0.65)');
                rayGrad.addColorStop(0.52, 'rgba(255,255,255,0.65)');
                rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
                spCtx.strokeStyle = rayGrad; spCtx.lineWidth = sr < 2 ? 2.2 : 1.2;
                spCtx.beginPath(); spCtx.moveTo(-44, 0); spCtx.lineTo(44, 0); spCtx.stroke();
              }
              sparkleTex = new THREE.CanvasTexture(spCv);

              var flareCv = document.createElement('canvas'); flareCv.width = 192; flareCv.height = 192;
              var flareCtx = flareCv.getContext('2d');
              flareCtx.translate(96, 96);
              var flareGrad = flareCtx.createRadialGradient(0, 0, 0, 0, 0, 92);
              flareGrad.addColorStop(0, 'rgba(255,255,255,0.98)');
              flareGrad.addColorStop(0.12, 'rgba(254,240,138,0.76)');
              flareGrad.addColorStop(0.36, 'rgba(251,146,60,0.28)');
              flareGrad.addColorStop(0.72, 'rgba(96,165,250,0.1)');
              flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
              flareCtx.fillStyle = flareGrad; flareCtx.fillRect(-96, -96, 192, 192);
              for (var fr = 0; fr < 18; fr++) {
                flareCtx.rotate(Math.PI * 2 / 18);
                var fg = flareCtx.createLinearGradient(0, 0, 86, 0);
                fg.addColorStop(0, 'rgba(255,255,255,0.32)');
                fg.addColorStop(1, 'rgba(255,255,255,0)');
                flareCtx.strokeStyle = fg; flareCtx.lineWidth = fr % 3 === 0 ? 3 : 1.3;
                flareCtx.beginPath(); flareCtx.moveTo(10, 0); flareCtx.lineTo(86, 0); flareCtx.stroke();
              }
              var flareTex = new THREE.CanvasTexture(flareCv);
              coreFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: visualGlow.core, depthWrite: false, blending: THREE.AdditiveBlending, rotation: 0 }));
              coreFlare.scale.set(0.58, 0.24, 1);
              coreFlare.renderOrder = 4;
              bulgeGroup.add(coreFlare);

              var barCv = document.createElement('canvas'); barCv.width = 384; barCv.height = 48;
              var barCtx = barCv.getContext('2d');
              var barGrad = barCtx.createLinearGradient(0, 24, 384, 24);
              barGrad.addColorStop(0, 'rgba(255,255,255,0)');
              barGrad.addColorStop(0.36, 'rgba(96,165,250,0.1)');
              barGrad.addColorStop(0.5, 'rgba(255,255,255,0.66)');
              barGrad.addColorStop(0.64, 'rgba(244,114,182,0.12)');
              barGrad.addColorStop(1, 'rgba(255,255,255,0)');
              barCtx.fillStyle = barGrad; barCtx.fillRect(0, 18, 384, 12);
              var barCore = barCtx.createRadialGradient(192, 24, 0, 192, 24, 40);
              barCore.addColorStop(0, 'rgba(255,246,209,0.55)');
              barCore.addColorStop(1, 'rgba(255,255,255,0)');
              barCtx.fillStyle = barCore; barCtx.fillRect(144, 0, 96, 48);
              var barTex = new THREE.CanvasTexture(barCv);
              [0, 1].forEach(function (barIdx) {
                var barMat = new THREE.SpriteMaterial({ map: barTex, transparent: true, opacity: barIdx ? 0.16 : 0.24, depthWrite: false, blending: THREE.AdditiveBlending, rotation: barIdx ? 0.08 : -0.05 });
                var barSprite = new THREE.Sprite(barMat);
                barSprite.scale.set(barIdx ? 0.82 : 1.12, barIdx ? 0.065 : 0.08, 1);
                barSprite.userData = { baseOpacity: barMat.opacity, baseScaleX: barSprite.scale.x, baseScaleY: barSprite.scale.y, phase: barIdx * 1.7 };
                barSprite.renderOrder = 5;
                bulgeGroup.add(barSprite);
                coreLightBars.push(barSprite);
              });
            })();

            function rebuildSparkles() {
              sparkleSprites.forEach(function (s) { sparkleGroup.remove(s); if (s.material && s.material.dispose) s.material.dispose(); });
              sparkleSprites = [];
              if (!sparkleTex || !starData || !starData.length) return;
              var sparkleCount = Math.min(72, Math.max(30, Math.floor(starData.length / 650)));
              for (var si2 = 0; si2 < sparkleCount; si2++) {
                var idx = Math.floor(Math.random() * starData.length);
                for (var tries = 0; tries < 8 && starData[idx].type && ['O', 'B', 'A', 'F'].indexOf(starData[idx].type.id) < 0; tries++) idx = Math.floor(Math.random() * starData.length);
                var sd2 = starData[idx];
                var sm = new THREE.SpriteMaterial({ map: sparkleTex, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, color: sd2.type && sd2.type.color ? sd2.type.color : '#ffffff' });
                var sprite = new THREE.Sprite(sm);
                sprite.position.set(sd2.x, sd2.y + 0.002, sd2.z);
                var baseScale = 0.018 + Math.random() * 0.026;
                sprite.scale.set(baseScale, baseScale, 1);
                sprite.userData = { baseScale: baseScale, phase: Math.random() * Math.PI * 2, baseOpacity: 0.12 + Math.random() * 0.18 };
                sparkleGroup.add(sprite);
                sparkleSprites.push(sprite);
              }
            }

            rebuildSparkles();



            // Central bulge

            var bulgeGeo = new THREE.BufferGeometry(), bulgeCount = 800;

            var bulgePos = new Float32Array(bulgeCount * 3), bulgeCol = new Float32Array(bulgeCount * 3);

            for (var i = 0; i < bulgeCount; i++) {

              var r = Math.pow(Math.random(), 2) * 0.12, th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI * 0.4;

              bulgePos[i * 3] = Math.cos(th) * Math.cos(ph) * r; bulgePos[i * 3 + 1] = Math.sin(ph) * r * 0.5; bulgePos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;

              var warmth = 0.8 + Math.random() * 0.2; bulgeCol[i * 3] = warmth; bulgeCol[i * 3 + 1] = warmth * 0.85; bulgeCol[i * 3 + 2] = warmth * 0.5;

            }

            bulgeGeo.setAttribute('position', new THREE.BufferAttribute(bulgePos, 3));

            bulgeGeo.setAttribute('color', new THREE.BufferAttribute(bulgeCol, 3));

            bulgeGroup.add(new THREE.Points(bulgeGeo, new THREE.PointsMaterial({ size: 0.01, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); // bulge stars sum to a radiant core (dust lanes untouched — absorption physics)

            // Bulge glow sprite

            var bgCv = document.createElement('canvas'); bgCv.width = 128; bgCv.height = 128;

            var bgCtx = bgCv.getContext('2d');

            var bgGrad = bgCtx.createRadialGradient(64, 64, 0, 64, 64, 64);

            bgGrad.addColorStop(0, 'rgba(255,230,200,1.0)'); bgGrad.addColorStop(0.15, 'rgba(255,180,100,0.5)'); bgGrad.addColorStop(0.4, 'rgba(200,100,50,0.15)');

            bgGrad.addColorStop(0.6, 'rgba(200,150,80,0.05)'); bgGrad.addColorStop(1, 'rgba(0,0,0,0)');

            bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 128, 128);

            var bulgeTex = new THREE.CanvasTexture(bgCv);

            var bulgeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bulgeTex, transparent: true, blending: THREE.AdditiveBlending }));

            bulgeGlow.scale.set(0.9, 0.3, 1); bulgeGroup.add(bulgeGlow);



            // ── Dust lanes (dark absorption bands between arms) ──

            var dustGroup = new THREE.Group(); dustGroup.name = 'dust';

            scene.add(dustGroup);

            (function () {

              var dustCount = 12000;

              var dustGeo = new THREE.BufferGeometry();

              var dustPos = new Float32Array(dustCount * 3);

              for (var di = 0; di < dustCount; di++) {

                var dArm = di % (gType.arms || 4);

                var dArmAngle = (dArm / (gType.arms || 4)) * Math.PI * 2;

                var dDist = Math.pow(Math.random(), 0.5) * 0.7;

                var dWind = gType.windTightness || 2.5;

                var dOffset = 0.15 + Math.random() * 0.1;

                var dAngle = dArmAngle + dDist * dWind + dOffset;

                dustPos[di * 3] = Math.cos(dAngle) * dDist + (Math.random() - 0.5) * 0.02;

                dustPos[di * 3 + 1] = (Math.random() - 0.5) * 0.01;

                dustPos[di * 3 + 2] = Math.sin(dAngle) * dDist + (Math.random() - 0.5) * 0.02;

              }

              dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

              var dustMat = new THREE.PointsMaterial({ color: 0x030305, size: 0.025, transparent: true, opacity: 0.12 });

              dustGroup.add(new THREE.Points(dustGeo, dustMat));

            })();

            // ── Volumetric Emission Gas Clouds ──
            var gasGroup = new THREE.Group(); gasGroup.name = 'gas';
            scene.add(gasGroup);
            (function () {
              var gasCount = 8000;
              var gasGeo = new THREE.BufferGeometry();
              var gasPos = new Float32Array(gasCount * 3);
              var gasCol = new Float32Array(gasCount * 3);
              for (var gi = 0; gi < gasCount; gi++) {
                var gArm = gi % (gType.arms || 4);
                var gArmAngle = (gArm / (gType.arms || 4)) * Math.PI * 2;
                var gDist = Math.pow(Math.random(), 0.6) * 0.9;
                var gWind = gType.windTightness || 2.5;
                var gOffset = (Math.random() - 0.5) * 0.15;
                var gAngle = gArmAngle + gDist * gWind + gOffset;
                gasPos[gi * 3] = Math.cos(gAngle) * gDist + (Math.random() - 0.5) * 0.05;
                gasPos[gi * 3 + 1] = (Math.random() - 0.5) * 0.03;
                gasPos[gi * 3 + 2] = Math.sin(gAngle) * gDist + (Math.random() - 0.5) * 0.05;
                
                var hue = Math.random() < 0.6 ? 330 : 190;
                var c = new THREE.Color().setHSL(hue / 360, Math.random() * 0.5 + 0.5, 0.4);
                gasCol[gi * 3] = c.r; gasCol[gi * 3 + 1] = c.g; gasCol[gi * 3 + 2] = c.b;
              }
              gasGeo.setAttribute('position', new THREE.BufferAttribute(gasPos, 3));
              gasGeo.setAttribute('color', new THREE.BufferAttribute(gasCol, 3));
              
              var gasCv = document.createElement('canvas'); gasCv.width = 32; gasCv.height = 32;
              var gCtx = gasCv.getContext('2d');
              var gGrad = gCtx.createRadialGradient(16,16,0,16,16,16);
              gGrad.addColorStop(0, 'rgba(255,255,255,1)');
              gGrad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
              gGrad.addColorStop(1, 'rgba(0,0,0,0)');
              gCtx.fillStyle = gGrad; gCtx.fillRect(0,0,32,32);
              var gasTex = new THREE.CanvasTexture(gasCv);
              
              var gasMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, map: gasTex });
              gasGroup.add(new THREE.Points(gasGeo, gasMat));
            })();

            // ── Multiwavelength observing overlays ──
            (function () {
              var irCount = 1400;
              var irGeo = new THREE.BufferGeometry();
              var irPos = new Float32Array(irCount * 3);
              var irCol = new Float32Array(irCount * 3);
              for (var ii = 0; ii < irCount; ii++) {
                var irArm = ii % (gType.arms || 4);
                var irAngle = (irArm / (gType.arms || 4)) * Math.PI * 2;
                var irDist = 0.12 + Math.pow(Math.random(), 0.72) * 0.72;
                var irWind = gType.windTightness || 2.5;
                var irA = irAngle + irDist * irWind + (Math.random() - 0.5) * 0.18;
                irPos[ii * 3] = Math.cos(irA) * irDist + (Math.random() - 0.5) * 0.035;
                irPos[ii * 3 + 1] = (Math.random() - 0.5) * 0.028;
                irPos[ii * 3 + 2] = Math.sin(irA) * irDist + (Math.random() - 0.5) * 0.035;
                var irC = new THREE.Color().setHSL(0.06 + Math.random() * 0.04, 0.95, 0.45 + Math.random() * 0.18);
                irCol[ii * 3] = irC.r; irCol[ii * 3 + 1] = irC.g; irCol[ii * 3 + 2] = irC.b;
              }
              irGeo.setAttribute('position', new THREE.BufferAttribute(irPos, 3));
              irGeo.setAttribute('color', new THREE.BufferAttribute(irCol, 3));
              infraredGroup.add(new THREE.Points(irGeo, new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));

              for (var rr = 0; rr < 6; rr++) {
                var rad = 0.18 + rr * 0.115;
                var ringMat = new THREE.MeshBasicMaterial({ color: rr % 2 ? 0x22d3ee : 0x67e8f9, side: THREE.DoubleSide, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
                var hRing = new THREE.Mesh(new THREE.RingGeometry(rad, rad + 0.0035, 160), ringMat);
                hRing.rotation.x = Math.PI * 0.5;
                hRing.scale.set(1, 1, 0.35);
                radioGroup.add(hRing);
              }
              var radioCount = 900;
              var radioGeo = new THREE.BufferGeometry();
              var radioPos = new Float32Array(radioCount * 3);
              for (var ri = 0; ri < radioCount; ri++) {
                var rDist = 0.12 + Math.pow(Math.random(), 0.6) * 0.78;
                var rAngle = Math.random() * Math.PI * 2;
                radioPos[ri * 3] = Math.cos(rAngle) * rDist;
                radioPos[ri * 3 + 1] = (Math.random() - 0.5) * 0.02;
                radioPos[ri * 3 + 2] = Math.sin(rAngle) * rDist;
              }
              radioGeo.setAttribute('position', new THREE.BufferAttribute(radioPos, 3));
              radioGroup.add(new THREE.Points(radioGeo, new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.01, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })));

              var xrayCount = 520;
              var xrayGeo = new THREE.BufferGeometry();
              var xrayPos = new Float32Array(xrayCount * 3);
              for (var xi = 0; xi < xrayCount; xi++) {
                var xHot = Math.random() < 0.68;
                var xR = xHot ? Math.pow(Math.random(), 2.2) * 0.16 : 0.2 + Math.random() * 0.55;
                var xA = Math.random() * Math.PI * 2;
                xrayPos[xi * 3] = Math.cos(xA) * xR;
                xrayPos[xi * 3 + 1] = (Math.random() - 0.5) * (xHot ? 0.035 : 0.08);
                xrayPos[xi * 3 + 2] = Math.sin(xA) * xR;
              }
              xrayGeo.setAttribute('position', new THREE.BufferAttribute(xrayPos, 3));
              xrayGroup.add(new THREE.Points(xrayGeo, new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.012, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending })));
              var jetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
              var jetA = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.34, 32, 1, true), jetMat);
              jetA.position.y = 0.16;
              var jetB = jetA.clone(); jetB.rotation.x = Math.PI; jetB.position.y = -0.16;
              xrayGroup.add(jetA); xrayGroup.add(jetB);

              var haloMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
              var halo = new THREE.Mesh(new THREE.SphereGeometry(0.94, 48, 24), haloMat);
              halo.scale.set(1.15, 0.62, 1.15);
              darkHaloGroup.add(halo);
              var haloGlowMat = new THREE.MeshBasicMaterial({ color: 0x6d28d9, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending });
              var haloGlow = new THREE.Mesh(new THREE.SphereGeometry(0.86, 48, 24), haloGlowMat);
              haloGlow.scale.set(1.2, 0.7, 1.2);
              darkHaloGroup.add(haloGlow);
            })();



            // Black hole + enhanced accretion disk

            bhGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.01, 24, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })));

            // Multi-ring accretion disk with color gradient

            // High-speed particle accretion disk
            var accCount = 2000;
            var accGeo = new THREE.BufferGeometry();
            var accPos = new Float32Array(accCount * 3);
            var accCol = new Float32Array(accCount * 3);
            for (var ai=0; ai<accCount; ai++) {
                var ar = 0.015 + Math.pow(Math.random(), 2) * 0.06;
                var ath = Math.random() * Math.PI * 2;
                accPos[ai*3] = Math.cos(ath)*ar;
                accPos[ai*3+1] = (Math.random()-0.5)*0.002;
                accPos[ai*3+2] = Math.sin(ath)*ar;
                var intensity = 1.0 - (ar - 0.015)/0.06;
                accCol[ai*3] = 1.0; 
                accCol[ai*3+1] = 0.4 + intensity*0.6;
                accCol[ai*3+2] = intensity*0.5;
            }
            accGeo.setAttribute('position', new THREE.BufferAttribute(accPos, 3));
            accGeo.setAttribute('color', new THREE.BufferAttribute(accCol, 3));
            var accMat = new THREE.PointsMaterial({size: 0.003, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending});
            var accPoints = new THREE.Points(accGeo, accMat);
            bhGroup.add(accPoints);
            var rings = [accPoints]; // Keep variable for animate loop

            var ring = rings[0];

            // Black hole glow sprite

            var bhGlowCv = document.createElement('canvas'); bhGlowCv.width = 64; bhGlowCv.height = 64;

            var bhGc = bhGlowCv.getContext('2d');

            var bhGrad = bhGc.createRadialGradient(32, 32, 0, 32, 32, 32);

            bhGrad.addColorStop(0, 'rgba(255,255,255,1.0)'); bhGrad.addColorStop(0.1, 'rgba(255,200,100,0.8)'); bhGrad.addColorStop(0.4, 'rgba(255,120,40,0.3)'); bhGrad.addColorStop(1, 'rgba(0,0,0,0)');

            bhGc.fillStyle = bhGrad; bhGc.fillRect(0, 0, 64, 64);

            var bhGlowTex = new THREE.CanvasTexture(bhGlowCv);

            var bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bhGlowTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.7 }));

            bhGlow.scale.set(0.25, 0.25, 1); bhGroup.add(bhGlow);

            var blackHoleDrama = { photon: 0.36, lens: 0.18, jet: 0.1, hotspot: 0.32 };
            var photonRings = [], lensingArcs = [], coreJets = [], accretionHotspots = [];
            var horizon = new THREE.Mesh(new THREE.SphereGeometry(0.018, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.96 }));
            bhGroup.add(horizon);

            var hotCv = document.createElement('canvas'); hotCv.width = 96; hotCv.height = 32;
            var hotCtx = hotCv.getContext('2d');
            var hotGrad = hotCtx.createLinearGradient(0, 16, 96, 16);
            hotGrad.addColorStop(0, 'rgba(255,255,255,0)');
            hotGrad.addColorStop(0.32, 'rgba(251,146,60,0.34)');
            hotGrad.addColorStop(0.5, 'rgba(255,255,255,0.92)');
            hotGrad.addColorStop(0.7, 'rgba(125,211,252,0.22)');
            hotGrad.addColorStop(1, 'rgba(255,255,255,0)');
            hotCtx.fillStyle = hotGrad; hotCtx.fillRect(0, 11, 96, 10);
            var hotCore = hotCtx.createRadialGradient(48, 16, 0, 48, 16, 18);
            hotCore.addColorStop(0, 'rgba(255,247,173,0.72)');
            hotCore.addColorStop(1, 'rgba(255,255,255,0)');
            hotCtx.fillStyle = hotCore; hotCtx.fillRect(28, 0, 40, 32);
            var hotTex = new THREE.CanvasTexture(hotCv);
            for (var hi = 0; hi < 16; hi++) {
              var hotMat = new THREE.SpriteMaterial({ map: hotTex, transparent: true, opacity: 0.12, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
              var hotSpot = new THREE.Sprite(hotMat);
              var hotRadius = 0.033 + Math.pow(Math.random(), 0.8) * 0.052;
              hotSpot.scale.set(0.034 + Math.random() * 0.018, 0.008 + Math.random() * 0.004, 1);
              hotSpot.userData = { angle: Math.random() * Math.PI * 2, radius: hotRadius, speed: 1.8 + Math.random() * 2.3, baseScaleX: hotSpot.scale.x, baseScaleY: hotSpot.scale.y, phase: Math.random() * Math.PI * 2 };
              hotSpot.renderOrder = 6;
              bhGroup.add(hotSpot);
              accretionHotspots.push(hotSpot);
            }

            for (var pr = 0; pr < 3; pr++) {
              var prMat = new THREE.MeshBasicMaterial({ color: pr === 0 ? 0xfff7ad : pr === 1 ? 0xf97316 : 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: blackHoleDrama.photon - pr * 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
              var prRing = new THREE.Mesh(new THREE.RingGeometry(0.074 + pr * 0.014, 0.078 + pr * 0.014, 160), prMat);
              prRing.rotation.x = Math.PI * 0.5;
              prRing.rotation.z = pr * 0.35;
              prRing.scale.set(1.55 - pr * 0.16, 0.62 + pr * 0.1, 1);
              bhGroup.add(prRing);
              photonRings.push(prRing);
            }

            for (var la = 0; la < 5; la++) {
              var arcMat = new THREE.MeshBasicMaterial({ color: la % 2 ? 0x60a5fa : 0xe879f9, side: THREE.DoubleSide, transparent: true, opacity: blackHoleDrama.lens, depthWrite: false, blending: THREE.AdditiveBlending });
              var arc = new THREE.Mesh(new THREE.RingGeometry(0.14 + la * 0.018, 0.143 + la * 0.018, 96, 1, la * 0.92, Math.PI * (0.42 + (la % 2) * 0.16)), arcMat);
              arc.rotation.x = Math.PI * 0.5 + (la - 2) * 0.04;
              arc.rotation.z = la * 0.74;
              arc.scale.set(1.18 + la * 0.06, 0.5 + la * 0.045, 1);
              bhGroup.add(arc);
              lensingArcs.push(arc);
            }

            var jetMatA = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: blackHoleDrama.jet, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            var jetMatB = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: blackHoleDrama.jet * 0.72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            var jetTop = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.62, 36, 1, true), jetMatA);
            jetTop.position.y = 0.31;
            var jetBottom = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.62, 36, 1, true), jetMatB);
            jetBottom.position.y = -0.31; jetBottom.rotation.x = Math.PI;
            bhGroup.add(jetTop); bhGroup.add(jetBottom);
            coreJets.push(jetTop); coreJets.push(jetBottom);



            // Scale grid

            var gridHelper = new THREE.GridHelper(2, 20, 0x223366, 0x112244);

            gridHelper.position.y = -0.03;

            gridGroup.add(gridHelper);

            var ringScale = new THREE.Mesh(new THREE.RingGeometry(0.49, 0.5, 64), new THREE.MeshBasicMaterial({ color: 0x4488ff, side: THREE.DoubleSide, transparent: true, opacity: 0.2 }));

            ringScale.rotation.x = Math.PI * 0.5; ringScale.position.y = -0.02;

            gridGroup.add(ringScale);



            // Nebulae as sprites

            var nebCanvas = document.createElement('canvas'); nebCanvas.width = 64; nebCanvas.height = 64;

            var nCtx = nebCanvas.getContext('2d'), nebulaSprites = [], nebulaWispSprites = [];

            NEBULAE.forEach(function (neb) {

              nCtx.clearRect(0, 0, 64, 64);

              var grad = nCtx.createRadialGradient(32, 32, 0, 32, 32, 32);

              grad.addColorStop(0, neb.color + 'aa'); grad.addColorStop(0.5, neb.color + '44'); grad.addColorStop(1, neb.color + '00');

              nCtx.fillStyle = grad; nCtx.fillRect(0, 0, 64, 64);

              var tex = new THREE.CanvasTexture(nebCanvas); tex.needsUpdate = true;

              var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.clone(), transparent: true, opacity: 0.5 }));

              sprite.position.set(neb.x, neb.y, neb.z); sprite.scale.set(neb.r * 2, neb.r * 2, 1);

              sprite.userData = neb; nebGroup.add(sprite); nebulaSprites.push(sprite);

              for (var wi = 0; wi < 3; wi++) {
                var wCv = document.createElement('canvas'); wCv.width = 96; wCv.height = 96;
                var wCtx = wCv.getContext('2d');
                wCtx.translate(48, 48);
                wCtx.rotate((wi + 1) * 0.58);
                wCtx.scale(1.4, 0.72);
                var wGrad = wCtx.createRadialGradient(0, 0, 0, 0, 0, 42);
                wGrad.addColorStop(0, 'rgba(255,255,255,0.42)');
                wGrad.addColorStop(0.18, neb.color + '88');
                wGrad.addColorStop(0.58, neb.color + '28');
                wGrad.addColorStop(1, neb.color + '00');
                wCtx.fillStyle = wGrad;
                wCtx.beginPath(); wCtx.arc(0, 0, 42, 0, Math.PI * 2); wCtx.fill();
                for (var wh = 0; wh < 26; wh++) {
                  wCtx.fillStyle = wh % 2 ? 'rgba(255,255,255,0.06)' : neb.color + '18';
                  wCtx.beginPath(); wCtx.arc((Math.random() - 0.5) * 62, (Math.random() - 0.5) * 38, 2 + Math.random() * 6, 0, Math.PI * 2); wCtx.fill();
                }
                var wTex = new THREE.CanvasTexture(wCv);
                var wMat = new THREE.SpriteMaterial({ map: wTex, transparent: true, opacity: 0.14 + wi * 0.035, depthWrite: false, blending: THREE.AdditiveBlending, rotation: wi * 0.8 });
                var wSprite = new THREE.Sprite(wMat);
                wSprite.position.set(neb.x + (Math.random() - 0.5) * neb.r * 0.75, neb.y + (Math.random() - 0.5) * neb.r * 0.34, neb.z + (Math.random() - 0.5) * neb.r * 0.75);
                wSprite.scale.set(neb.r * (3.1 + wi * 0.55), neb.r * (1.7 + wi * 0.42), 1);
                wSprite.userData = { baseOpacity: wMat.opacity, baseScaleX: wSprite.scale.x, baseScaleY: wSprite.scale.y, phase: Math.random() * Math.PI * 2 };
                nebGroup.add(wSprite);
                nebulaWispSprites.push(wSprite);
              }

            });



            // Labels for nebulae

            NEBULAE.forEach(function (neb) {

              var labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 48;

              var lCtx = labelCanvas.getContext('2d');

              lCtx.fillStyle = 'rgba(0,0,0,0.5)'; lCtx.fillRect(0, 0, 256, 48);

              lCtx.font = '18px sans-serif'; lCtx.fillStyle = neb.color; lCtx.textAlign = 'center'; lCtx.fillText(neb.name, 128, 32);

              var labelTex = new THREE.CanvasTexture(labelCanvas);

              var labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));

              labelSprite.position.set(neb.x, neb.y + neb.r + 0.03, neb.z);

              labelSprite.scale.set(0.15, 0.03, 1);

              labelGroup.add(labelSprite);

            });



            // Store layer references on canvas for toggle access

            canvasEl._layers = { bgStars: bgGroup, arms: armGroup, bulge: bulgeGroup, blackHole: bhGroup, nebulae: nebGroup, grid: gridGroup, labels: labelGroup, dust: dustGroup, gas: gasGroup };



            // Function to regenerate stars with new count

            canvasEl._setStarCount = function (count) {

              armGroup.remove(starPoints);

              starPoints.geometry.dispose();

              var result = generateStars(THREE, count, gType, galaxyType);

              starPoints = new THREE.Points(result.geo, starShaderMat);
              starPoints.renderOrder = 2;

              armGroup.add(starPoints);

              starData = result.data;
              rebuildSparkles();

            };



            canvasEl._setRotMode = function (mode) {

              starShaderMat.uniforms.uRotMode.value = mode === 'rigid' ? 0 : mode === 'keplerian' ? 1 : 2;

            };



            // Post-processing bloom

            var composer = null;

            if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {

              composer = new THREE.EffectComposer(renderer);

              composer.addPass(new THREE.RenderPass(scene, camera));

              var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 1.35, 0.3, 0.84);

              composer.addPass(bloomPass);

              canvasEl._bloomPass = bloomPass;

            }

            var currentObserveMode = observeMode || 'visible';
            function setObserveMode(mode) {
              currentObserveMode = mode || 'visible';
              var obsIndex = currentObserveMode === 'infrared' ? 1 : currentObserveMode === 'radio' ? 2 : currentObserveMode === 'xray' ? 3 : currentObserveMode === 'gravity' ? 4 : 0;
              starShaderMat.uniforms.uObserve.value = obsIndex;
              infraredGroup.visible = currentObserveMode === 'infrared';
              radioGroup.visible = currentObserveMode === 'radio';
              xrayGroup.visible = currentObserveMode === 'xray';
              darkHaloGroup.visible = currentObserveMode === 'gravity';
              if (gasGroup.children[0] && gasGroup.children[0].material) gasGroup.children[0].material.opacity = currentObserveMode === 'radio' ? 0.18 : currentObserveMode === 'infrared' ? 0.1 : 0.06;
              if (dustGroup.children[0] && dustGroup.children[0].material) dustGroup.children[0].material.opacity = currentObserveMode === 'infrared' ? 0.04 : currentObserveMode === 'visible' ? 0.12 : 0.07;
              if (bulgeGlow && bulgeGlow.material) bulgeGlow.material.opacity = currentObserveMode === 'xray' ? 0.35 : currentObserveMode === 'gravity' ? 0.2 : 1;
              if (bhGlow && bhGlow.material) bhGlow.material.opacity = currentObserveMode === 'xray' ? 0.95 : currentObserveMode === 'gravity' ? 0.45 : 0.7;
              visualGlow.disk = currentObserveMode === 'infrared' ? 0.24 : currentObserveMode === 'radio' ? 0.08 : currentObserveMode === 'xray' ? 0.05 : currentObserveMode === 'gravity' ? 0.07 : 0.16;
              visualGlow.arms = currentObserveMode === 'infrared' ? 0.32 : currentObserveMode === 'radio' ? 0.1 : currentObserveMode === 'xray' ? 0.07 : currentObserveMode === 'gravity' ? 0.08 : 0.18;
              visualGlow.core = currentObserveMode === 'xray' ? 0.72 : currentObserveMode === 'infrared' ? 0.48 : currentObserveMode === 'gravity' ? 0.24 : currentObserveMode === 'radio' ? 0.16 : 0.42;
              sparkleGroup.visible = currentObserveMode !== 'radio' && currentObserveMode !== 'gravity';
              if (diskSheenMat) diskSheenMat.opacity = visualGlow.disk;
              if (armGlowMat) armGlowMat.opacity = visualGlow.arms;
              if (coreFlare && coreFlare.material) coreFlare.material.opacity = visualGlow.core;
              cinematicMotion.foreground = currentObserveMode === 'radio' ? 0.55 : currentObserveMode === 'gravity' ? 0.68 : currentObserveMode === 'xray' ? 0.72 : 1;
              streamlineGlow = currentObserveMode === 'radio' ? 1.45 : currentObserveMode === 'gravity' ? 1.18 : currentObserveMode === 'infrared' ? 1.05 : currentObserveMode === 'xray' ? 0.62 : 1;
              coreLightBars.forEach(function (bar, idx) { if (bar.material) bar.material.opacity = (bar.userData.baseOpacity || 0.18) * (visualGlow.core / 0.42) * (idx ? 0.82 : 1); });
              deepFieldGlow.galaxies = currentObserveMode === 'xray' ? 0.16 : currentObserveMode === 'radio' ? 0.18 : currentObserveMode === 'gravity' ? 0.24 : currentObserveMode === 'infrared' ? 0.26 : 0.28;
              deepFieldGlow.filaments = currentObserveMode === 'gravity' ? 0.28 : currentObserveMode === 'radio' ? 0.22 : currentObserveMode === 'xray' ? 0.1 : 0.16;
              blackHoleDrama.photon = currentObserveMode === 'xray' ? 0.62 : currentObserveMode === 'gravity' ? 0.28 : currentObserveMode === 'radio' ? 0.18 : 0.36;
              blackHoleDrama.lens = currentObserveMode === 'gravity' ? 0.36 : currentObserveMode === 'xray' ? 0.26 : currentObserveMode === 'radio' ? 0.12 : 0.18;
              blackHoleDrama.jet = currentObserveMode === 'xray' ? 0.28 : currentObserveMode === 'gravity' ? 0.12 : currentObserveMode === 'radio' ? 0.06 : 0.1;
              blackHoleDrama.hotspot = currentObserveMode === 'xray' ? 0.62 : currentObserveMode === 'infrared' ? 0.38 : currentObserveMode === 'gravity' ? 0.24 : currentObserveMode === 'radio' ? 0.1 : 0.32;
              photonRings.forEach(function (r, idx) { if (r.material) r.material.opacity = Math.max(0, blackHoleDrama.photon - idx * 0.08); });
              lensingArcs.forEach(function (a, idx) { if (a.material) a.material.opacity = Math.max(0, blackHoleDrama.lens - idx * 0.018); });
              coreJets.forEach(function (j, idx) { if (j.material) j.material.opacity = blackHoleDrama.jet * (idx ? 0.72 : 1); });
              accretionHotspots.forEach(function (h) { if (h.material) h.material.opacity = blackHoleDrama.hotspot * 0.34; });
              if (composer && canvasEl._bloomPass) {
                canvasEl._bloomPass.strength = currentObserveMode === 'xray' ? 1.85 : currentObserveMode === 'infrared' ? 1.5 : currentObserveMode === 'radio' ? 1.05 : currentObserveMode === 'gravity' ? 1.24 : 1.35;
              }
            }
            canvasEl._setObserveMode = setObserveMode;
            setObserveMode(currentObserveMode);



            // Supernova flash system for time-lapse

            var supernovae = [];
            var disposeSNPart = function (obj) {
              if (!obj) return;
              scene.remove(obj);
              if (obj.material) {
                if (obj.material.map && obj.material.map.dispose) obj.material.map.dispose();
                if (obj.material.dispose) obj.material.dispose();
              }
              if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
            };

            canvasEl._triggerSupernova = function () {

              if (starData.length === 0) return null;

              var idx = Math.floor(Math.random() * starData.length);

              var sd = starData[idx];

              var snCv = document.createElement('canvas'); snCv.width = 160; snCv.height = 160;

              var sc = snCv.getContext('2d');

              var sg = sc.createRadialGradient(80, 80, 0, 80, 80, 80);

              sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.13, 'rgba(255,244,214,0.98)');

              sg.addColorStop(0.34, 'rgba(251,191,36,0.64)'); sg.addColorStop(0.62, 'rgba(96,165,250,0.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)');

              sc.fillStyle = sg; sc.fillRect(0, 0, 160, 160);
              sc.save();
              sc.translate(80, 80);
              for (var ray = 0; ray < 18; ray++) {
                var a = (ray / 18) * Math.PI * 2;
                var len = 42 + (ray % 3) * 12;
                sc.rotate(a);
                var rg = sc.createLinearGradient(0, 0, len, 0);
                rg.addColorStop(0, 'rgba(255,255,255,0.7)');
                rg.addColorStop(1, 'rgba(251,191,36,0)');
                sc.strokeStyle = rg;
                sc.lineWidth = ray % 2 ? 2 : 3;
                sc.beginPath(); sc.moveTo(10, 0); sc.lineTo(len, 0); sc.stroke();
                sc.rotate(-a);
              }
              sc.restore();

              var snTex = new THREE.CanvasTexture(snCv);

              var snSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: snTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));

              snSprite.position.set(sd.x, sd.y, sd.z);

              snSprite.scale.set(0.001, 0.001, 1);

              scene.add(snSprite);

              var shockRing = new THREE.Mesh(
                new THREE.RingGeometry(0.52, 0.56, 96),
                new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
              );
              shockRing.position.set(sd.x, sd.y, sd.z);
              shockRing.rotation.x = Math.PI * 0.5;
              shockRing.scale.set(0.001, 0.001, 0.001);
              scene.add(shockRing);

              var labelCv = document.createElement('canvas'); labelCv.width = 256; labelCv.height = 64;
              var labelCtx = labelCv.getContext('2d');
              labelCtx.fillStyle = 'rgba(15,23,42,0.72)'; labelCtx.fillRect(24, 10, 208, 38);
              labelCtx.strokeStyle = 'rgba(251,191,36,0.8)'; labelCtx.strokeRect(24.5, 10.5, 207, 37);
              labelCtx.font = 'bold 20px sans-serif'; labelCtx.textAlign = 'center';
              labelCtx.fillStyle = '#fef3c7'; labelCtx.fillText('SUPERNOVA', 128, 35);
              var labelTex = new THREE.CanvasTexture(labelCv);
              var labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, opacity: 0 }));
              labelSprite.position.set(sd.x, sd.y + 0.075, sd.z);
              labelSprite.scale.set(0.16, 0.04, 1);
              scene.add(labelSprite);

              var flashLight = THREE.PointLight ? new THREE.PointLight(0xfff1b8, 0, 0.9) : null;
              if (flashLight) { flashLight.position.set(sd.x, sd.y, sd.z); scene.add(flashLight); }

              supernovae.push({ sprite: snSprite, ring: shockRing, label: labelSprite, light: flashLight, birth: Date.now(), duration: 3000 });
              return { type: (sd.type && sd.type.label) || 'unknown', spectral: (sd.type && sd.type.id) || '?' };

            };



            // Time-lapse age update

            canvasEl._updateAge = function (age) {

              var dist = getAgeDistribution(age);

              var cumul = [], cum2 = 0, tot = dist.reduce(function (a, b) { return a + b; }, 0);

              for (var t2 = 0; t2 < dist.length; t2++) { cum2 += dist[t2]; cumul.push(cum2 / tot * 100); }

              var colors = starPoints.geometry.attributes.color.array;

              var types = starPoints.geometry.attributes.aStarType.array;

              for (var si = 0; si < starData.length; si++) {

                var roll2 = ((si * 7919 + 1) % 10000) / 100;

                var ti2 = 6;

                for (var tt = 0; tt < cumul.length; tt++) { if (roll2 < cumul[tt]) { ti2 = tt; break; } }

                var stc = new THREE.Color(STAR_TYPES[ti2].color);

                colors[si * 3] = stc.r; colors[si * 3 + 1] = stc.g; colors[si * 3 + 2] = stc.b;

                types[si] = ti2;

              }

              starPoints.geometry.attributes.color.needsUpdate = true;

              starPoints.geometry.attributes.aStarType.needsUpdate = true;

              var nebOp = 0.2 + 0.5 * Math.max(0, 1 - age / 10);

              nebulaSprites.forEach(function (s) { s.material.opacity = nebOp; });

            };



            // Orbit controls

            var isDragging = false, prevX = 0, prevY = 0;

            var spherical = { theta: Math.PI * 0.1, phi: Math.PI * 0.35, r: 1.2 };

            function updateCamera() {

              camera.position.x = spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta);

              camera.position.y = spherical.r * Math.cos(spherical.phi);

              camera.position.z = spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta);

              camera.lookAt(0, 0, 0);

            }

            updateCamera();

            canvasEl._galaxyOrbit = spherical;

            canvasEl._galaxyUpdateCam = updateCamera;

            function onGalDown(e) { isDragging = true; warpTween = null; prevX = e.clientX; prevY = e.clientY; }

            function onGalMove(e) {

              if (!isDragging) return;

              spherical.theta += (e.clientX - prevX) * 0.005;

              spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - (e.clientY - prevY) * 0.005));

              prevX = e.clientX; prevY = e.clientY; updateCamera();

            }

            function onGalUp() { isDragging = false; }

            function onGalWheel(e) { e.preventDefault(); spherical.r = Math.max(0.2, Math.min(3, spherical.r * (e.deltaY > 0 ? 1.1 : 0.9))); updateCamera(); }

            canvasEl.addEventListener('mousedown', onGalDown);

            canvasEl.addEventListener('mousemove', onGalMove);

            canvasEl.addEventListener('mouseup', onGalUp);

            canvasEl.addEventListener('wheel', onGalWheel, { passive: false });



            // Raycaster for click selection

            var raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold = 0.02;

            var mouse = new THREE.Vector2();

            function onGalClick(e) {

              var rect = canvasEl.getBoundingClientRect();

              mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

              mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, camera);

              var hits = raycaster.intersectObject(starPoints);

              if (hits.length > 0 && canvasEl._onSelectStar) canvasEl._onSelectStar(starData[hits[0].index]);

              var nebHits = raycaster.intersectObjects(nebulaSprites);

              if (nebHits.length > 0 && canvasEl._onSelectNebula) canvasEl._onSelectNebula(nebHits[0].object.userData);

            }

            canvasEl.addEventListener('click', onGalClick);

            // Cinematic warp: ease the camera to the target over ~1.6s instead of teleporting.

            var warpTween = null;

            canvasEl._galaxyWarp = function (wp) {

              var toTheta = Math.atan2(wp.x, wp.z) || 0.1;

              var toPhi = Math.acos(Math.max(-0.99, Math.min(0.99, wp.y / (Math.hypot(wp.x, wp.y, wp.z) || 1))));

              var toR = wp.zoom || 1;

              var dTheta = toTheta - spherical.theta;

              while (dTheta > Math.PI) dTheta -= Math.PI * 2;

              while (dTheta < -Math.PI) dTheta += Math.PI * 2;

              warpTween = { t0: spherical.theta, p0: spherical.phi, r0: spherical.r, dt: dTheta, dp: toPhi - spherical.phi, dr: toR - spherical.r, start: Date.now(), dur: 1600 };
              cinematicMotion.warp = 1;
              cinematicMotion.shock = 0;
              cinematicMotion.aperture = 1;
              warpStreakGroup.visible = true;

            };

            var animId, startT = Date.now();

            function animate() {

              // Guard against RAF leak after React unmounts the canvas — without this,
              // the loop keeps running 60×/s, holding refs to disposed three.js objects.
              if (!canvasEl.isConnected) { if (animId) cancelAnimationFrame(animId); return; }

              animId = requestAnimationFrame(animate);

              var elapsed = (Date.now() - startT) * 0.001;
              if (warpTween) {

                var wk = Math.min(1, (Date.now() - warpTween.start) / warpTween.dur);

                var we = wk < 0.5 ? 4 * wk * wk * wk : 1 - Math.pow(-2 * wk + 2, 3) / 2;

                spherical.theta = warpTween.t0 + warpTween.dt * we;

                spherical.phi = warpTween.p0 + warpTween.dp * we;

                spherical.r = warpTween.r0 + warpTween.dr * we;

                updateCamera();

                if (wk > 0.72 && !warpTween.arrivalShock) {
                  warpTween.arrivalShock = true;
                  cinematicMotion.shock = 1;
                  warpShockGroup.visible = true;
                }

                if (wk >= 1) warpTween = null;

              } else if (!isDragging) { spherical.theta -= 0.0003; updateCamera(); }
              starShaderMat.uniforms.uTime.value = elapsed;
              var targetFov = 60 - cinematicMotion.warp * 4.5 + Math.sin(elapsed * 0.18) * 0.35;
              if (Math.abs(camera.fov - targetFov) > 0.02) { camera.fov = targetFov; camera.updateProjectionMatrix(); }
              if (cinematicMotion.aperture > 0.01) cinematicMotion.aperture *= 0.94;
              var apertureMode = currentObserveMode === 'xray' ? 0.46 : currentObserveMode === 'gravity' ? 0.22 : currentObserveMode === 'infrared' ? 0.14 : currentObserveMode === 'radio' ? 0.1 : 0.06;
              var apertureLevel = Math.min(1.5, apertureMode + cinematicMotion.aperture * 0.66 + cinematicMotion.warp * 0.34 + cinematicMotion.shock * 0.24);
              apertureSweepGroup.visible = apertureLevel > 0.035;
              apertureSweepSprites.forEach(function (swp, idx) {
                var su = swp.userData || {};
                var sweepPulse = 0.7 + 0.3 * Math.sin(elapsed * (0.45 + idx * 0.12) + su.phase);
                swp.position.x = (su.baseX || 0) + Math.sin(elapsed * 0.18 + idx) * 0.045 + cinematicMotion.warp * (idx - 1) * 0.05;
                swp.position.y = (su.baseY || 0) + Math.sin(elapsed * 0.24 + su.phase) * 0.018;
                swp.scale.set((su.baseScaleX || 1) * (1 + apertureLevel * 0.12), (su.baseScaleY || 0.05) * (0.92 + sweepPulse * 0.18), 1);
                swp.material.rotation = (idx - 1) * 0.11 + Math.sin(elapsed * 0.12 + idx) * 0.025;
                swp.material.opacity = Math.max(0, (su.baseOpacity || 0.035) * apertureLevel * sweepPulse);
              });

              // Stars orbit per-vertex in the shader (rotation-curve model); the dust/gas
              // pattern deliberately stays fixed so stars visibly stream through the arms —
              // the density-wave picture of spiral structure.

              if (diskSheenMat) diskSheenMat.opacity = Math.max(0, visualGlow.disk + 0.018 * Math.sin(elapsed * 0.45));
              if (armGlowMat) armGlowMat.opacity = Math.max(0, visualGlow.arms + 0.035 * Math.sin(elapsed * 0.62 + 0.8));
              streamlineGroup.rotation.y += 0.00018 + cinematicMotion.warp * 0.001;
              streamlineGroup.children.forEach(function (line, idx) {
                if (!line.material || !line.material.userData) return;
                line.rotation.y += line.userData.drift;
                var streamPulse = 0.74 + 0.26 * Math.sin(elapsed * 0.5 + line.material.userData.phase + idx * 0.4);
                line.material.opacity = Math.max(0, (line.material.userData.baseOpacity || 0.04) * streamlineGlow * streamPulse);
              });
              if (coreFlare && coreFlare.material) {
                coreFlare.material.opacity = Math.max(0, visualGlow.core + 0.08 * Math.sin(elapsed * 1.1));
                coreFlare.material.rotation = elapsed * 0.08;
                var coreScale = 1 + 0.035 * Math.sin(elapsed * 1.35);
                coreFlare.scale.set(0.58 * coreScale, 0.24 * coreScale, 1);
              }
              coreLightBars.forEach(function (bar, idx) {
                var barPulse = 0.72 + 0.28 * Math.sin(elapsed * 0.95 + bar.userData.phase);
                bar.material.opacity = (bar.userData.baseOpacity || 0.18) * (visualGlow.core / 0.42) * barPulse;
                bar.material.rotation += idx ? 0.0007 : -0.0005;
                var barScale = 1 + 0.05 * Math.sin(elapsed * 0.7 + idx);
                bar.scale.set(bar.userData.baseScaleX * barScale, bar.userData.baseScaleY, 1);
              });
              if (sparkleGroup.visible) {
                sparkleSprites.forEach(function (sp, idx) {
                  var phase = elapsed * (1.4 + (idx % 5) * 0.11) + sp.userData.phase;
                  var pulse = 0.5 + 0.5 * Math.sin(phase);
                  var scalePulse = sp.userData.baseScale * (0.78 + pulse * 0.62);
                  sp.scale.set(scalePulse, scalePulse, 1);
                  sp.material.opacity = sp.userData.baseOpacity * (0.55 + pulse * 0.8);
                });
              }

              foregroundGroup.rotation.y += 0.00034 + cinematicMotion.warp * 0.0024;
              foregroundGroup.rotation.x = Math.sin(elapsed * 0.16) * 0.018;
              foregroundSprites.forEach(function (fg, idx) {
                fg.material.rotation += fg.userData.drift * (1 + cinematicMotion.warp * 9);
                var fgPulse = 0.64 + 0.36 * Math.sin(elapsed * (0.55 + (idx % 4) * 0.08) + fg.userData.phase);
                fg.material.opacity = fg.userData.baseOpacity * cinematicMotion.foreground * fgPulse;
                var fgScale = fg.userData.baseScale * (0.82 + fgPulse * 0.42 + cinematicMotion.warp * 1.4);
                fg.scale.set(fgScale, fgScale, 1);
              });

              if (cinematicMotion.warp > 0.01) {
                cinematicMotion.warp *= 0.94;
                warpStreakGroup.visible = true;
                warpStreakGroup.rotation.z += 0.018;
                warpStreakSprites.forEach(function (ws, idx) {
                  var wd = ws.userData;
                  wd.radius += wd.speed * (1 + cinematicMotion.warp * 7);
                  if (wd.radius > 1.16) wd.radius = 0.08 + (idx % 6) * 0.018;
                  ws.position.x = Math.cos(wd.angle) * wd.radius;
                  ws.position.y = Math.sin(wd.angle) * wd.radius * 0.6;
                  ws.material.rotation = Math.atan2(ws.position.y, ws.position.x);
                  ws.material.opacity = cinematicMotion.warp * (0.22 + (idx % 5) * 0.035);
                  ws.scale.set(wd.baseScaleX * (1 + cinematicMotion.warp * 2.8), wd.baseScaleY * (1 + cinematicMotion.warp * 0.4), 1);
                });
              } else if (warpStreakGroup.visible) {
                warpStreakGroup.visible = false;
                warpStreakSprites.forEach(function (ws) { if (ws.material) ws.material.opacity = 0; });
              }

              if (cinematicMotion.shock > 0.01) {
                var shockAge = 1 - cinematicMotion.shock;
                cinematicMotion.shock *= 0.91;
                warpShockGroup.visible = true;
                warpShockRings.forEach(function (ring, idx) {
                  var ringAge = Math.max(0, Math.min(1, shockAge * 1.35 - ring.userData.delay));
                  var ringScale = 0.7 + ringAge * (3.2 + idx * 0.45);
                  ring.scale.set(ringScale, ringScale, 1);
                  ring.rotation.z += ring.userData.spin;
                  ring.material.opacity = Math.max(0, (ring.userData.baseOpacity || 0.2) * (1 - ringAge) * cinematicMotion.foreground);
                });
              } else if (warpShockGroup.visible) {
                warpShockGroup.visible = false;
                warpShockRings.forEach(function (ring) { if (ring.material) ring.material.opacity = 0; });
              }

              deepFieldGroup.rotation.y += 0.00008;
              deepFieldGroup.children.forEach(function (obj, idx) {
                if (!obj.material || obj.material.opacity === undefined || !obj.userData) return;
                var base = obj.userData.baseOpacity || 0.08;
                obj.material.opacity = Math.max(0, base * (deepFieldGlow.galaxies / 0.28) * (0.86 + 0.14 * Math.sin(elapsed * 0.28 + (obj.userData.phase || idx))));
                if (obj.material.rotation !== undefined) obj.material.rotation += 0.00055 + idx * 0.000015;
              });
              cosmicFilamentGroup.rotation.y -= 0.00012;
              cosmicFilamentGroup.children.forEach(function (line, idx) {
                if (line.material && line.material.opacity !== undefined) line.material.opacity = Math.max(0, deepFieldGlow.filaments * (0.38 + 0.22 * Math.sin(elapsed * 0.5 + line.userData.phase)));
              });

              nebulaSprites.forEach(function (s, i) {
                var nebBase = currentObserveMode === 'radio' ? 0.1 : currentObserveMode === 'xray' ? 0.05 : currentObserveMode === 'infrared' ? 0.18 : 0.25;
                var nebPulse = currentObserveMode === 'radio' ? 0.06 : currentObserveMode === 'xray' ? 0.03 : 0.15;
                s.material.opacity = nebBase + nebPulse * Math.sin(elapsed * 0.5 + i * 1.8);
              });
              nebulaWispSprites.forEach(function (w, i) {
                var wMode = currentObserveMode === 'infrared' ? 1.45 : currentObserveMode === 'radio' ? 0.62 : currentObserveMode === 'xray' ? 0.38 : currentObserveMode === 'gravity' ? 0.5 : 1;
                var wPulse = 0.72 + 0.28 * Math.sin(elapsed * 0.44 + w.userData.phase);
                w.material.opacity = w.userData.baseOpacity * wMode * wPulse;
                w.material.rotation += 0.0009 + (i % 3) * 0.00035;
                var wScale = 0.96 + 0.05 * Math.sin(elapsed * 0.38 + w.userData.phase);
                w.scale.set(w.userData.baseScaleX * wScale, w.userData.baseScaleY * (1.02 - (wScale - 0.96)), 1);
              });

              if (infraredGroup.visible) infraredGroup.rotation.y += 0.0009;

              if (radioGroup.visible) radioGroup.rotation.y -= 0.0012;

              if (xrayGroup.visible) {
                xrayGroup.rotation.y += 0.006;
                xrayGroup.children.forEach(function (obj, idx) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = idx === 0 ? 0.68 + 0.18 * Math.sin(elapsed * 2.4) : 0.14 + 0.08 * Math.sin(elapsed * 3.2 + idx); });
              }

              if (darkHaloGroup.visible) {
                darkHaloGroup.rotation.y += 0.001;
                darkHaloGroup.children.forEach(function (obj, idx) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = idx === 0 ? 0.18 + 0.04 * Math.sin(elapsed * 0.9) : 0.045 + 0.018 * Math.sin(elapsed * 0.7); });
              }

              if (bhGroup.visible) {

                rings.forEach(function (r) { r.rotation.y -= 0.03; });

                bhGlow.material.opacity = 0.6 + 0.3 * Math.sin(elapsed * 0.8);

                bhGlow.scale.set(0.12 + 0.01 * Math.sin(elapsed * 1.5), 0.12 + 0.01 * Math.sin(elapsed * 1.5), 1);

                photonRings.forEach(function (r, idx) {
                  r.rotation.z += 0.012 + idx * 0.004;
                  if (r.material) r.material.opacity = Math.max(0, blackHoleDrama.photon - idx * 0.08 + 0.045 * Math.sin(elapsed * 1.9 + idx));
                });
                lensingArcs.forEach(function (a, idx) {
                  a.rotation.z += (idx % 2 ? -0.006 : 0.0045);
                  if (a.material) a.material.opacity = Math.max(0, blackHoleDrama.lens - idx * 0.015 + 0.035 * Math.sin(elapsed * 1.25 + idx * 0.8));
                });
                coreJets.forEach(function (j, idx) {
                  var jetPulse = 1 + 0.08 * Math.sin(elapsed * 2.1 + idx);
                  j.scale.set(1, jetPulse, 1);
                  if (j.material) j.material.opacity = blackHoleDrama.jet * (idx ? 0.72 : 1) * (0.78 + 0.22 * Math.sin(elapsed * 1.7 + idx));
                });
                accretionHotspots.forEach(function (hot, idx) {
                  var hu = hot.userData || {};
                  var ha = (hu.angle || 0) + elapsed * (hu.speed || 2);
                  var hr = (hu.radius || 0.05) * (1 + 0.08 * Math.sin(elapsed * 1.3 + hu.phase));
                  var hp = 0.62 + 0.38 * Math.sin(elapsed * (1.8 + (idx % 4) * 0.15) + hu.phase);
                  hot.position.set(Math.cos(ha) * hr, 0.003 * Math.sin(ha * 2.4 + idx), Math.sin(ha) * hr * 0.58);
                  hot.material.rotation = Math.PI * 0.5 - ha;
                  hot.material.opacity = Math.max(0, blackHoleDrama.hotspot * (0.38 + hp * 0.58));
                  hot.scale.set((hu.baseScaleX || 0.035) * (0.82 + hp * 0.42), (hu.baseScaleY || 0.008) * (0.9 + hp * 0.22), 1);
                });

              }

              // Animate supernovae

              for (var sni = supernovae.length - 1; sni >= 0; sni--) {

                var sn = supernovae[sni];

                var prog = (Date.now() - sn.birth) / sn.duration;

                if (prog > 1) { disposeSNPart(sn.sprite); disposeSNPart(sn.ring); disposeSNPart(sn.label); if (sn.light) scene.remove(sn.light); supernovae.splice(sni, 1); continue; }

                var grow = 1 - Math.pow(1 - prog, 3);
                var flash = prog < 0.22 ? prog / 0.22 : Math.max(0, 1 - (prog - 0.22) / 0.78);
                var scale = 0.025 + grow * 0.18;

                sn.sprite.scale.set(scale, scale, 1);

                sn.sprite.material.opacity = Math.min(1, flash * 1.25);
                if (sn.ring) {
                  var ringScale = 0.001 + grow * 0.55;
                  sn.ring.scale.set(ringScale, ringScale, ringScale);
                  sn.ring.material.opacity = Math.max(0, 0.82 * (1 - prog));
                }
                if (sn.label) {
                  sn.label.position.y += 0.00008;
                  sn.label.material.opacity = prog < 0.18 ? prog / 0.18 : Math.max(0, 1 - Math.max(0, prog - 0.46) / 0.54);
                }
                if (sn.light) sn.light.intensity = 2.4 * flash;

              }

              if (composer) composer.render();

              else renderer.render(scene, camera);

            }

            animate();

            // ── WebXR (optional): fly THROUGH the galaxy at room scale (thumbstick
            //    glide + teleport across the disk + comfort vignette). Loads AlloVR
            //    only when a headset is present; presenting-only, so 2D is untouched.
            //    The galaxy is ~2 world-units, so the rig is scaled DOWN to make it
            //    huge around you (on-device tunable). ──
            try {
              if (navigator.xr && navigator.xr.isSessionSupported) {
                navigator.xr.isSessionSupported('immersive-vr').then(function(ok) {
                  if (!ok || !canvasEl.isConnected) return;
                  ensureAlloVR(function(V) {
                    if (!V || !canvasEl.isConnected) return;
                    try {
                      window._galaxyVR = V.enable({
                        THREE: THREE, renderer: renderer, scene: scene, camera: camera,
                        seat: { position: [0, 0, 0.8], scale: 0.08, moveSpeed: 3.0 },
                        bounds: { minX: -1.5, maxX: 1.5, minZ: -1.5, maxZ: 1.5 },
                        render: function() { if (composer) { try { composer.render(); return; } catch (e) {} } renderer.render(scene, camera); },
                        pauseLoop: function() { if (animId) { cancelAnimationFrame(animId); animId = null; } },
                        resumeLoop: function() { animate(); }
                      });
                    } catch(e){}
                  });
                }).catch(function(){});
              }
            } catch(e){}

            var ro = new ResizeObserver(function () { W = canvasEl.offsetWidth; H = canvasEl.offsetHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); });

            ro.observe(canvasEl);

            canvasEl._galaxyCleanup = function () {

              try { if (window._galaxyVR && window._galaxyVR.destroy) window._galaxyVR.destroy(); window._galaxyVR = null; } catch(e){}
              if (animId) cancelAnimationFrame(animId);

              canvasEl.removeEventListener('mousedown', onGalDown);

              canvasEl.removeEventListener('mousemove', onGalMove);

              canvasEl.removeEventListener('mouseup', onGalUp);

              canvasEl.removeEventListener('wheel', onGalWheel);

              canvasEl.removeEventListener('click', onGalClick);

              ro.disconnect();

              if (composer) { composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); }); }

              supernovae.forEach(function (sn) { disposeSNPart(sn.sprite); disposeSNPart(sn.ring); disposeSNPart(sn.label); if (sn.light) scene.remove(sn.light); });

              renderer.dispose();

            };

          }



          var selStar = d.selectedStar ? STAR_TYPES.find(function (s) { return s.id === d.selectedStar; }) : null;

          var selNeb = d.selectedNebula ? NEBULAE.find(function (n) { return n.name === d.selectedNebula; }) : null;

          var ACTIVE_BANK = d.dynamicQuiz || QUIZ_BANK; var quizQ = d.quizMode && ACTIVE_BANK[d.quizIdx || 0] ? ACTIVE_BANK[d.quizIdx || 0] : null;

          var inspectLog = d.inspectLog || {};
          var addInspectKey = function (key) {
            var next = Object.assign({}, d.inspectLog || {});
            next[key] = true;
            return next;
          };
          var inspectTarget = d.inspectTarget || (selStar ? 'star:' + selStar.id : selNeb ? 'nebula:' + selNeb.name : 'galaxyType');
          var INSPECT_TARGETS = {
            galaxyType: {
              icon: gType.icon,
              title: gType.label,
              type: __alloT('stem.galaxy.inspect_galaxytype_type', 'Galaxy shape'),
              color: '#6366f1',
              desc: gType.desc,
              facts: ['Example: ' + gType.example, (gType.arms ? gType.arms + ' visible arm pattern' : 'No spiral arm pattern'), gType.barLength ? 'Central stellar bar present' : 'No central bar'],
              evidence: __alloT('stem.galaxy.inspect_galaxytype_evidence', 'Astronomers classify galaxies by wide-field images, color, gas content, and the motion of stars and dust.'),
              question: __alloT('stem.galaxy.inspect_galaxytype_question', 'Which visible features helped you classify this galaxy?')
            },
            blackHole: {
              icon: '\uD83D\uDD73\uFE0F',
              title: __alloT('stem.galaxy.inspect_blackhole_title', 'Central black hole'),
              type: __alloT('stem.galaxy.inspect_blackhole_type', 'Galactic core'),
              color: '#f59e0b',
              desc: __alloT('stem.galaxy.inspect_blackhole_desc', 'The Milky Way contains Sagittarius A*, a compact object of about four million solar masses at the galactic center.'),
              facts: [__alloT('stem.galaxy.inspect_blackhole_fact1', 'Invisible event horizon'), __alloT('stem.galaxy.inspect_blackhole_fact2', 'Bright accretion disk when gas falls in'), __alloT('stem.galaxy.inspect_blackhole_fact3', 'Nearby stars orbit at extreme speeds')],
              evidence: __alloT('stem.galaxy.inspect_blackhole_evidence', 'The strongest evidence is motion: stars whip around an unseen, tiny, massive object in the core.'),
              question: __alloT('stem.galaxy.inspect_blackhole_question', 'What evidence would convince you the mass is compact instead of spread out?')
            },
            spiralArms: {
              icon: '\uD83C\uDF00',
              title: __alloT('stem.galaxy.inspect_spiralarms_title', 'Spiral arms'),
              type: __alloT('stem.galaxy.inspect_spiralarms_type', 'Density wave'),
              color: '#60a5fa',
              desc: __alloT('stem.galaxy.inspect_spiralarms_desc', 'Spiral arms are traffic jams of stars, gas, and dust. Stars move through them while gas compresses and forms new stars.'),
              facts: [__alloT('stem.galaxy.inspect_spiralarms_fact1', 'Young blue stars trace arms'), __alloT('stem.galaxy.inspect_spiralarms_fact2', 'Gas clouds collect there'), __alloT('stem.galaxy.inspect_spiralarms_fact3', 'Dust lanes outline the wave')],
              evidence: __alloT('stem.galaxy.inspect_spiralarms_evidence', 'Blue star clusters, emission nebulae, and radio maps of hydrogen reveal where arms are strongest.'),
              question: __alloT('stem.galaxy.inspect_spiralarms_question', 'Why do blue stars mark recent star formation better than red stars?')
            },
            gasClouds: {
              icon: '\uD83C\uDF0C',
              title: __alloT('stem.galaxy.inspect_gasclouds_title', 'Gas clouds'),
              type: __alloT('stem.galaxy.inspect_gasclouds_type', 'Star-forming material'),
              color: '#22d3ee',
              desc: __alloT('stem.galaxy.inspect_gasclouds_desc', 'Cold hydrogen and glowing ionized gas are the raw materials for new stars and nebulae.'),
              facts: [__alloT('stem.galaxy.inspect_gasclouds_fact1', 'Compressed gas can collapse'), __alloT('stem.galaxy.inspect_gasclouds_fact2', 'Massive stars ionize nearby gas'), __alloT('stem.galaxy.inspect_gasclouds_fact3', 'Radio telescopes map hidden hydrogen')],
              evidence: __alloT('stem.galaxy.inspect_gasclouds_evidence', 'Hydrogen emission and radio wavelengths show gas that visible-light images can miss.'),
              question: __alloT('stem.galaxy.inspect_gasclouds_question', 'Where would you look for the next generation of stars?')
            },
            dustLanes: {
              icon: '\uD83C\uDF2B\uFE0F',
              title: __alloT('stem.galaxy.inspect_dustlanes_title', 'Dust lanes'),
              type: __alloT('stem.galaxy.inspect_dustlanes_type', 'Light-blocking grains'),
              color: '#a16207',
              desc: __alloT('stem.galaxy.inspect_dustlanes_desc', 'Dust is not empty darkness. Tiny grains absorb visible light and help cool gas clouds so stars can form.'),
              facts: [__alloT('stem.galaxy.inspect_dustlanes_fact1', 'Blocks visible starlight'), __alloT('stem.galaxy.inspect_dustlanes_fact2', 'Glows in infrared'), __alloT('stem.galaxy.inspect_dustlanes_fact3', 'Outlines spiral structure')],
              evidence: __alloT('stem.galaxy.inspect_dustlanes_evidence', 'Compare visible and infrared views: dust hides stars in one wavelength and glows in another.'),
              question: __alloT('stem.galaxy.inspect_dustlanes_question', 'Why can infrared telescopes see deeper through dusty regions?')
            },
            darkMatter: {
              icon: '\uD83C\uDF0C',
              title: __alloT('stem.galaxy.inspect_darkmatter_title', 'Dark matter halo'),
              type: __alloT('stem.galaxy.inspect_darkmatter_type', 'Invisible gravity'),
              color: '#e879f9',
              desc: __alloT('stem.galaxy.inspect_darkmatter_desc', 'Outer stars orbit too fast for visible matter alone. A large invisible halo must be adding gravity.'),
              facts: [__alloT('stem.galaxy.inspect_darkmatter_fact1', 'Does not emit light'), __alloT('stem.galaxy.inspect_darkmatter_fact2', 'Revealed by motion'), __alloT('stem.galaxy.inspect_darkmatter_fact3', 'Dominates a galaxy mass budget')],
              evidence: __alloT('stem.galaxy.inspect_darkmatter_evidence', 'Rotation curves stay flat instead of falling, showing extra unseen mass around the galaxy.'),
              question: __alloT('stem.galaxy.inspect_darkmatter_question', 'Why is motion better evidence here than a photograph?')
            }
          };
          var getInspector = function () {
            if (selStar) {
              return {
                key: 'star:' + selStar.id,
                icon: '\u2B50',
                title: selStar.label + ' star',
                type: 'Spectral class ' + selStar.id,
                color: selStar.color,
                desc: selStar.desc,
                facts: [selStar.temp + ' K', selStar.mass || __alloT('stem.galaxy.inspect_mass_varies', 'Mass varies'), selStar.lifetime || __alloT('stem.galaxy.inspect_lifetime_varies', 'Lifetime varies')],
                evidence: __alloT('stem.galaxy.inspect_star_evidence', 'A spectrum reveals temperature, composition, motion, and class from the pattern of absorption lines.'),
                question: __alloT('stem.galaxy.inspect_star_question', 'How would this star change the galaxy if many formed at once?')
              };
            }
            if (selNeb) {
              return {
                key: 'nebula:' + selNeb.name,
                icon: '\u2728',
                title: selNeb.name,
                type: selNeb.type || __alloT('stem.galaxy.inspect_nebula_type_fallback', 'Nebula'),
                color: selNeb.color,
                desc: selNeb.desc,
                facts: [selNeb.dist || __alloT('stem.galaxy.inspect_distance_varies', 'Distance varies'), __alloT('stem.galaxy.inspect_gas_dust_cloud', 'Gas and dust cloud'), selNeb.type || __alloT('stem.galaxy.inspect_deepsky_object', 'Deep-sky object')],
                evidence: __alloT('stem.galaxy.inspect_nebula_evidence', 'Color, emission lines, shape, and nearby stars tell whether this is a nursery, remnant, or dying-star shell.'),
                question: __alloT('stem.galaxy.inspect_nebula_question', 'Is this object making stars, showing a dead star, or blocking light?')
              };
            }
            return INSPECT_TARGETS[inspectTarget] || INSPECT_TARGETS.galaxyType;
          };
          var currentInspector = getInspector();
          var inspectButtons = [
            { key: 'galaxyType', label: __alloT('stem.galaxy.inspect_btn_shape', 'Shape'), icon: gType.icon },
            { key: 'spiralArms', label: __alloT('stem.galaxy.inspect_btn_arms', 'Arms'), icon: '\uD83C\uDF00' },
            { key: 'gasClouds', label: __alloT('stem.galaxy.inspect_btn_gas', 'Gas'), icon: '\uD83C\uDF0C' },
            { key: 'dustLanes', label: __alloT('stem.galaxy.inspect_btn_dust', 'Dust'), icon: '\uD83C\uDF2B\uFE0F' },
            { key: 'blackHole', label: __alloT('stem.galaxy.inspect_btn_core', 'Core'), icon: '\uD83D\uDD73\uFE0F' },
            { key: 'darkMatter', label: __alloT('stem.galaxy.inspect_btn_dark_halo', 'Dark halo'), icon: '\uD83C\uDF0C' }
          ];
          var observeSeenCount = Object.keys(inspectLog).filter(function (k) { return k.indexOf('observe:') === 0; }).length;
          var dopplerTouched = !!inspectLog.dopplerShift || Math.abs(dopplerVelocity) > 8;
          var countDone = function (items) { return items.filter(function (x) { return !!x.done; }).length; };
          var missionDefs = [
            {
              id: 'cartographer',
              icon: '\uD83D\uDDFA\uFE0F',
              title: __alloT('stem.galaxy.mission_cartographer_title', 'Map the Galaxy'),
              steps: [
                { label: __alloT('stem.galaxy.mission_step_toggle_layers', 'Toggle 3 layers'), done: Object.keys(d.layersToggled || {}).length >= 3 },
                { label: __alloT('stem.galaxy.mission_step_inspect_structure', 'Inspect a structure'), done: !!(inspectLog.spiralArms || inspectLog.gasClouds || inspectLog.dustLanes || inspectLog.blackHole) },
                { label: __alloT('stem.galaxy.mission_step_warp_landmark', 'Warp to a landmark'), done: !!d.warpInfo }
              ]
            },
            {
              id: 'nursery',
              icon: '\u2728',
              title: __alloT('stem.galaxy.mission_nursery_title', 'Find Star Birth'),
              steps: [
                { label: __alloT('stem.galaxy.mission_step_show_gas', 'Show gas or nebulae'), done: layers.gas !== false || layers.nebulae !== false },
                { label: __alloT('stem.galaxy.mission_step_inspect_nebula', 'Inspect a nebula or gas cloud'), done: !!(selNeb || inspectLog.gasClouds) },
                { label: __alloT('stem.galaxy.mission_step_click_star', 'Click any star'), done: !!selStar || Object.keys(inspectLog).some(function (k) { return k.indexOf('star:') === 0; }) }
              ]
            },
            {
              id: 'darkMatter',
              icon: '\uD83C\uDF0C',
              title: __alloT('stem.galaxy.mission_darkmatter_title', 'Prove the Invisible'),
              steps: [
                { label: __alloT('stem.galaxy.mission_step_try_rotation', 'Try 2 rotation models'), done: Object.keys(d.rotTried || {}).length >= 2 },
                { label: __alloT('stem.galaxy.mission_step_flat_curve', 'Use the flat curve'), done: rotMode === 'flat' },
                { label: __alloT('stem.galaxy.mission_step_inspect_darkhalo', 'Inspect dark halo evidence'), done: !!inspectLog.darkMatter || !!inspectLog['observe:gravity'] }
              ]
            },
            {
              id: 'multiwavelength',
              icon: '\uD83D\uDD2D',
              title: __alloT('stem.galaxy.mission_multiwavelength_title', 'Decode Hidden Light'),
              steps: [
                { label: __alloT('stem.galaxy.mission_step_try_filters', 'Try 2 observing filters'), done: observeSeenCount >= 2 },
                { label: __alloT('stem.galaxy.mission_step_radio_infrared', 'Use radio or infrared'), done: !!(inspectLog['observe:radio'] || inspectLog['observe:infrared']) },
                { label: __alloT('stem.galaxy.mission_step_gravity_view', 'Use gravity view'), done: !!inspectLog['observe:gravity'] },
                { label: __alloT('stem.galaxy.mission_step_test_doppler', 'Test Doppler shift'), done: dopplerTouched }
              ]
            },
            {
              id: 'stellarDeath',
              icon: '\uD83D\uDCA5',
              title: __alloT('stem.galaxy.mission_stellardeath_title', 'Track Stellar Death'),
              steps: [
                { label: __alloT('stem.galaxy.mission_step_trigger_supernova', 'Trigger a supernova'), done: !!d.lastGalaxyEvent },
                { label: __alloT('stem.galaxy.mission_step_inspect_core', 'Inspect the core'), done: !!inspectLog.blackHole },
                { label: __alloT('stem.galaxy.mission_step_open_starlife', 'Open Star Life'), done: !!showLifecycle }
              ]
            }
          ];
          var activeMissionId = d.activeGalaxyMission || 'cartographer';
          var activeMission = missionDefs.find(function (m) { return m.id === activeMissionId; }) || missionDefs[0];
          var activeMissionDone = countDone(activeMission.steps);

          var setRealSkyStatus = function (status, message) {
            if (d.realSkyStatus !== status || (d.realSkyMessage || '') !== (message || '')) {
              patchGalaxy({ realSkyStatus: status, realSkyMessage: message || '' });
            }
          };

          var syncRealSkyAladin = function (el) {
            var aladin = el && el._galaxyAladin;
            if (!aladin) return;
            var signature = activeRealSkyTarget.key + '|' + activeRealSkySurvey.id + '|' + activeRealSkyCatalog.id;
            if (el._galaxyAladinSignature === signature) return;
            el._galaxyAladinSignature = signature;
            try {
              if (aladin.setFov) aladin.setFov(activeRealSkyTarget.fov);
              if (aladin.gotoObject) {
                aladin.gotoObject(activeRealSkyTarget.target, {
                  success: function () { setRealSkyStatus('ready', activeRealSkyTarget.name + ' loaded from real sky survey data.'); },
                  error: function () {
                    if (aladin.gotoRaDec) aladin.gotoRaDec(activeRealSkyTarget.ra, activeRealSkyTarget.dec);
                    setRealSkyStatus('ready', activeRealSkyTarget.name + ' loaded by coordinates.');
                  }
                });
              } else if (aladin.gotoRaDec) {
                aladin.gotoRaDec(activeRealSkyTarget.ra, activeRealSkyTarget.dec);
              }
            } catch (e) {}
            try {
              if (aladin.removeLayers) aladin.removeLayers();
            } catch (e2) {}
            try {
              if (aladin.setImageSurvey) {
                var surveySet = false;
                if (aladin.newImageSurvey) {
                  try {
                    aladin.setImageSurvey(aladin.newImageSurvey(activeRealSkySurvey.id));
                    surveySet = true;
                  } catch (eSurvey) {}
                }
                if (!surveySet) aladin.setImageSurvey(activeRealSkySurvey.id);
              }
            } catch (e3) {}
            try {
              if (window.A && window.A.catalog && window.A.marker && aladin.addCatalog) {
                var markerCat = window.A.catalog({ name: 'Classroom target', color: '#67e8f9', sourceSize: 10 });
                markerCat.addSources([window.A.marker(activeRealSkyTarget.ra, activeRealSkyTarget.dec, { popupTitle: activeRealSkyTarget.name, popupDesc: activeRealSkyTarget.story })]);
                aladin.addCatalog(markerCat);
              }
            } catch (e4) {}
            try {
              if (activeRealSkyCatalog.id === 'simbad' && window.A && window.A.catalogFromSimbad && aladin.addCatalog) {
                var cat = window.A.catalogFromSimbad(activeRealSkyTarget.target, Math.min(0.5, Math.max(0.08, activeRealSkyTarget.fov / 4)), { name: 'SIMBAD', color: '#fbbf24', sourceSize: 7, onClick: 'showPopup' });
                if (cat) aladin.addCatalog(cat);
              }
            } catch (e5) {}
            setRealSkyStatus('ready', activeRealSkyTarget.name + ' loaded from real sky survey data.');
          };

          var realSkyRefCb = function (el) {
            if (!el) return;
            if (!el.id) el.id = 'galaxy-real-sky-aladin';
            if (el._galaxyAladin) { syncRealSkyAladin(el); return; }
            setRealSkyStatus('loading', 'Loading Aladin Lite real-sky atlas...');
            ensureGalaxyAladinLite(function (ok) {
              if (!el.isConnected) return;
              if (!ok || !(window.A && window.A.aladin)) {
                setRealSkyStatus('error', 'Real-sky atlas could not load. The external Aladin Lite service may be blocked or offline.');
                return;
              }
              try {
                el.innerHTML = '';
                el._galaxyAladin = window.A.aladin('#' + el.id, {
                  target: activeRealSkyTarget.target,
                  survey: activeRealSkySurvey.id,
                  fov: activeRealSkyTarget.fov,
                  showReticle: true,
                  showCooGrid: true,
                  showSimbadPointerControl: true,
                  showShareControl: false,
                  showContextMenu: true,
                  showFullscreenControl: true,
                  showLayersControl: true,
                  showGotoControl: true
                });
                el._galaxyAladinSignature = '';
                syncRealSkyAladin(el);
                if (typeof awardStemXP === 'function') awardStemXP('galaxy_real_sky', 2, 'Opened real sky survey');
              } catch (e) {
                setRealSkyStatus('error', 'Real-sky atlas could not initialize on this device.');
              }
            });
          };



          // ── Toggle handler ──

          var toggleLayer = function (key) {

            var newLayers = Object.assign({}, layers);

            newLayers[key] = !newLayers[key];

            upd("layers", newLayers);

            // Quest hook 'toggle_layers' reads layersToggled — record every layer the learner has touched.
            var seenLayers = Object.assign({}, d.layersToggled);

            seenLayers[key] = true;

            upd("layersToggled", seenLayers);

            var cv = document.querySelector('[data-galaxy-canvas]');

            if (cv && cv._layers && cv._layers[key]) cv._layers[key].visible = newLayers[key];

          };



          var LAYER_TOGGLES = [

            { key: 'arms', icon: '\uD83C\uDF00', label: t('stem.galaxy.spiral_arms') },

            { key: 'bulge', icon: '\uD83D\uDFE1', label: t('stem.galaxy.central_bulge') },

            { key: 'blackHole', icon: '\uD83D\uDD73\uFE0F', label: t('stem.galaxy.black_hole') },

            { key: 'nebulae', icon: '\u2728', label: t('stem.galaxy.nebulae') },

            { key: 'bgStars', icon: '\uD83C\uDF0C', label: t('stem.galaxy.background') },

            { key: 'grid', icon: '\uD83D\uDCCF', label: t('stem.galaxy.scale_grid') },

            { key: 'labels', icon: '\uD83C\uDFF7\uFE0F', label: t('stem.galaxy.labels') },

            { key: 'dust', icon: '\uD83C\uDF2B\uFE0F', label: __alloT('stem.galaxy.layer_dust_lanes', 'Dust Lanes') },

            { key: 'gas', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.layer_gas_clouds', 'Gas Clouds') }

          ];



          return React.createElement("div", { className: ((simMode === 'star' || simMode === 'realSky' || simMode === 'blackHole') ? 'max-w-7xl' : 'max-w-4xl') + " mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            renderTutorial('galaxy', _tutGalaxy),

            // ── Header ──

            React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyCleanup) cv._galaxyCleanup(); setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': __alloT('stem.galaxy.aria_back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0C " + __alloT('stem.galaxy.header_title', 'Galaxy Explorer')),

              React.createElement("div", { className: "flex flex-wrap gap-1 ml-auto bg-slate-100 rounded-lg p-0.5 max-sm:w-full max-sm:justify-center" },

                [{ key: 'galaxy', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.mode_galaxy', 'Galaxy') }, { key: 'blackHole', icon: '\uD83D\uDD73\uFE0F', label: __alloT('stem.galaxy.mode_black_hole', 'Black Hole') }, { key: 'realSky', icon: '\uD83D\uDD2D', label: __alloT('stem.galaxy.mode_real_sky', 'Real Sky') }, { key: 'star', icon: '\u2B50', label: __alloT('stem.galaxy.mode_star_life', 'Star Life') }, { key: 'quiz', icon: '\uD83E\uDDE0', label: __alloT('stem.galaxy.mode_quiz', 'Quiz') }, { key: 'metalHunt', icon: '\uD83C\uDF1F', label: __alloT('stem.galaxy.mode_metallicity', 'Metallicity') }].map(function (m) {

                  var isActive = m.key === 'quiz' ? d.quizMode : (!d.quizMode && simMode === m.key);

                  return React.createElement("button", { "aria-label": "Switch to " + m.label + " mode",

                    key: m.key, onClick: function () {

                      if (m.key === 'quiz') { 
                        upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizStreak", 0); upd("quizFeedback", null); 
                        upd("isGeneratingQuiz", true);
                        upd("dynamicQuiz", null);
                        var prompt = "Generate 5 challenging multiple-choice questions about stars, galaxies, and astrophysics. Return ONLY valid JSON format exactly like this: [{\"q\": \"Question...\", \"a\": \"Correct Answer\", \"options\": [\"Correct Answer\", \"Opt2\", \"Opt3\", \"Opt4\"]}]. Ensure no markdown backticks wrap the output.";
                        if (typeof callGemini === 'function') {
                            callGemini(prompt, function(res) {
                                upd("isGeneratingQuiz", false);
                                if (res && res.text) {
                                    try {
                                        var cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
                                        var qList = JSON.parse(cleaned);
                                        if (Array.isArray(qList) && qList.length > 0) {
                                            upd("dynamicQuiz", qList);
                                        }
                                    } catch(e) {
                                        console.warn("Gemini JSON Parse Error:", e, res.text);
                                    }
                                }
                            });
                        } else {
                            upd("isGeneratingQuiz", false);
                        }
                      }

                      else {
                        upd("quizMode", false); upd("simMode", m.key);
                        if (m.key === 'star') upd("showLifecycle", true);
                        // Canvas Narration: sim mode switch
                        if (typeof canvasNarrate === 'function') {
                          var modeDesc = m.key === 'galaxy' ? 'Galaxy view. Explore the structure, stars, and nebulae of the Milky Way.' : m.key === 'blackHole' ? 'Black Hole Lab. Orbit an event horizon and observe an accretion disk, photon ring, relativistic beaming, and polar jets.' : m.key === 'realSky' ? 'Real Sky. Compare the model with live sky survey imagery and object catalogs.' : m.key === 'metalHunt' ? 'Metallicity. Investigate how star chemistry records galaxy history.' : 'Star Lifecycle. Adjust stellar mass to explore how stars are born, live, and die.';
                          canvasNarrate('galaxy', 'simMode', {
                            first: 'Switched to ' + m.label + '. ' + modeDesc,
                            repeat: m.label + ' mode active.',
                            terse: m.label
                          });
                        }
                      }

                    }, className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-700 hover:bg-white')

                  }, m.icon + ' ' + m.label);

                })

              )

            ),



            // ── Galaxy Simulation Mode ──

            !d.quizMode && simMode === 'galaxy' && React.createElement("div", null,

              // ── Galaxy type selector ──

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

                Object.keys(GALAXY_TYPES).map(function (key) {

                  var gt = GALAXY_TYPES[key];

                  return React.createElement("button", { key: key,

                    onClick: function () {

                      upd("galaxyType", key);

                      var cv = document.querySelector('[data-galaxy-canvas]');

                      if (cv) { cv._galaxyInit = false; cv._galaxyCleanup && cv._galaxyCleanup(); canvasRefCb(cv); }
                      // Canvas Narration: galaxy type switch
                      if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'galaxyType', {
                        first: 'Switched to ' + gt.label + ' galaxy. ' + gt.desc + ' Example: ' + gt.example + '.',
                        repeat: gt.label + ' galaxy active.',
                        terse: gt.label
                      });

                    },

                    className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (galaxyType === key ? 'border-indigo-400 bg-indigo-100 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200')

                  }, gt.icon + " " + gt.label);

                })

              ),



              // ── Galaxy type info card ──

              React.createElement("div", { className: "mb-3 px-3 py-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg border border-indigo-100 text-[11px]" },

                React.createElement("span", { className: "font-bold text-indigo-700" }, gType.icon + " " + gType.label + ": "),

                React.createElement("span", { className: "text-slate-600" }, gType.desc),

                React.createElement("span", { className: "text-indigo-400 ml-1" }, "(e.g. " + gType.example + ")"),

              ),

              // ── Hubble tuning-fork classification (highlights the current galaxy type) ──
              React.createElement("div", { className: "mb-3 p-2 rounded-lg border border-indigo-100 bg-white" },
                React.createElement("p", { className: "text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1" }, __alloT('stem.galaxy.hubble_tuning_fork_title', 'Hubble Tuning Fork — classified by shape')),
                (function () {
                  var hl = { elliptical: { x: 78, y: 75 }, grandDesign: { x: 260, y: 40 }, barredSpiral: { x: 260, y: 112 }, irregular: { x: 338, y: 75 } }[galaxyType] || null;
                  return React.createElement("svg", { viewBox: "0 0 360 150", className: "w-full", style: { maxHeight: '150px' }, role: "img", "aria-label": __alloT('stem.galaxy.aria_hubble_tuning_fork', 'Hubble tuning fork: ellipticals on the handle, spirals on the top prong, barred spirals on the bottom prong, with the current galaxy type highlighted') },
                    React.createElement("path", { d: "M30 75 H120 M120 75 C150 75 170 52 200 40 H330 M120 75 C150 75 170 100 200 112 H330", fill: "none", stroke: "#94a3b8", strokeWidth: 2 }),
                    React.createElement("ellipse", { cx: 45, cy: 75, rx: 9, ry: 9, fill: "#fca5a5" }),
                    React.createElement("ellipse", { cx: 75, cy: 75, rx: 11, ry: 7, fill: "#fca5a5" }),
                    React.createElement("ellipse", { cx: 105, cy: 75, rx: 13, ry: 5, fill: "#fca5a5" }),
                    React.createElement("text", { x: 28, y: 97, fill: "#64748b", style: { fontSize: '8px', fontWeight: 'bold' } }, "Ellipticals E0–E7"),
                    React.createElement("text", { x: 123, y: 70, fill: "#64748b", style: { fontSize: '7px' } }, "S0"),
                    React.createElement("text", { x: 206, y: 28, fill: "#3b82f6", style: { fontSize: '8px', fontWeight: 'bold' } }, "Spirals  Sa Sb Sc"),
                    React.createElement("circle", { cx: 230, cy: 40, r: 6, fill: "none", stroke: "#3b82f6", strokeWidth: 2 }),
                    React.createElement("circle", { cx: 262, cy: 40, r: 7, fill: "none", stroke: "#3b82f6", strokeWidth: 1.5 }),
                    React.createElement("circle", { cx: 296, cy: 40, r: 8, fill: "none", stroke: "#3b82f6", strokeWidth: 1 }),
                    React.createElement("text", { x: 200, y: 134, fill: "#8b5cf6", style: { fontSize: '8px', fontWeight: 'bold' } }, "Barred  SBa SBb SBc"),
                    React.createElement("ellipse", { cx: 262, cy: 112, rx: 9, ry: 5, fill: "none", stroke: "#8b5cf6", strokeWidth: 1.5 }),
                    React.createElement("line", { x1: 252, y1: 112, x2: 272, y2: 112, stroke: "#8b5cf6", strokeWidth: 2 }),
                    React.createElement("text", { x: 330, y: 97, fill: "#f59e0b", style: { fontSize: '8px', fontWeight: 'bold' } }, "Irr"),
                    hl && React.createElement("circle", { cx: hl.x, cy: hl.y, r: 17, fill: "none", stroke: "#f43f5e", strokeWidth: 2.5 }),
                    hl && React.createElement("text", { x: hl.x, y: hl.y - 20, fill: "#f43f5e", textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold' } }, __alloT('stem.galaxy.you_are_here', 'you are here'))
                  );
                })(),
                React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, __alloT('stem.galaxy.hubble_scheme_note', "Edwin Hubble's 1936 scheme sorts galaxies by SHAPE — it is NOT a timeline. Galaxies do not evolve along the fork from one type to the next."))
              ),

              // ── Cosmological redshift mini-visual (Hubble's law) ──
              React.createElement("div", { className: "mb-3 p-2.5 rounded-lg border border-indigo-200 bg-white" },
                React.createElement("p", { className: "text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1" }, __alloT('stem.galaxy.cosmo_redshift_title', 'Cosmological redshift — farther = faster = redder')),
                (function() {
                  var W = 360, rowH = 24, gap = 20, lines = [0.22, 0.41, 0.63];
                  var spectrum = function(y, shift, label) {
                    return React.createElement("g", { key: label },
                      React.createElement("text", { x: 2, y: y - 3, fontSize: 8, fill: "#475569", fontWeight: 700 }, label),
                      React.createElement("rect", { x: 0, y: y, width: W, height: rowH, rx: 3, fill: "url(#galSpecGrad)" }),
                      lines.map(function(lp, i) {
                        var x = (lp + shift * (1 - lp)) * W;
                        return React.createElement("rect", { key: i, x: x, y: y, width: 2, height: rowH, fill: "#0f172a", opacity: 0.85 });
                      })
                    );
                  };
                  return React.createElement("svg", { viewBox: "0 0 " + W + " " + (2 * rowH + gap + 12), className: "w-full", style: { maxHeight: '108px' }, role: "img", "aria-label": __alloT('stem.galaxy.aria_two_spectra', "Two spectra: a nearby galaxy's absorption lines, and a distant galaxy's same lines shifted toward the red end (redshift).") },
                    React.createElement("defs", null,
                      React.createElement("linearGradient", { id: "galSpecGrad", x1: "0", y1: "0", x2: "1", y2: "0" },
                        React.createElement("stop", { offset: "0%", stopColor: "#7c3aed" }),
                        React.createElement("stop", { offset: "28%", stopColor: "#2563eb" }),
                        React.createElement("stop", { offset: "52%", stopColor: "#16a34a" }),
                        React.createElement("stop", { offset: "74%", stopColor: "#eab308" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#dc2626" }))),
                    spectrum(11, 0, "🪐 " + __alloT('stem.galaxy.spectrum_nearby_rest', 'Nearby galaxy (rest frame)')),
                    spectrum(11 + rowH + gap, 0.22, "🌌 " + __alloT('stem.galaxy.spectrum_distant_redshift', 'Distant galaxy (redshifted)'))
                  );
                })(),
                React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, __alloT('stem.galaxy.redshift_note', "Each dark line is the fingerprint of the same element. In a more distant galaxy those lines sit farther toward red — expanding space stretched the light on its way here (Hubble's law: recession speed ∝ distance)."))
              ),

              // ── Doppler shift lab: motion toward/away changes wavelength ──
              React.createElement("div", { "data-galaxy-doppler": "true", className: "mb-3 p-3 rounded-xl border bg-white shadow-sm", style: { borderColor: dopplerColor + '66' } },
                React.createElement("div", { className: "flex flex-wrap items-start gap-2 mb-2" },
                  React.createElement("span", { className: "text-lg", "aria-hidden": true }, dopplerVelocity < -8 ? "\uD83D\uDD35" : dopplerVelocity > 8 ? "\uD83D\uDD34" : "\u26AA"),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wider", style: { color: dopplerColor } }, __alloT('stem.galaxy.doppler_lab_title', 'Doppler Shift Lab — toward = blue, away = red')),
                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" }, __alloT('stem.galaxy.doppler_lab_desc', 'Move the source along your line of sight. Negative radial velocity moves spectral lines toward blue; positive radial velocity moves them toward red.'))
                  ),
                  React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-black border", style: { color: dopplerColor, borderColor: dopplerColor + '66', background: dopplerColor + '12' } }, dopplerDirection + " • " + dopplerVelocity + " km/s")
                ),
                (function () {
                  var W = 420, H = 150, rowH = 26, lines = [0.24, 0.43, 0.65], visualShift = Math.max(-0.24, Math.min(0.24, dopplerVelocity / 7500));
                  var lineX = function (lp, shift) { return Math.max(12, Math.min(W - 12, (lp + shift) * W)); };
                  var spectrum = function (y, shift, label, tint) {
                    return React.createElement("g", { key: label },
                      React.createElement("text", { x: 2, y: y - 4, fontSize: 8, fill: "#475569", fontWeight: 800 }, label),
                      React.createElement("rect", { x: 0, y: y, width: W, height: rowH, rx: 4, fill: "url(#galDopplerGrad)" }),
                      React.createElement("rect", { x: 0, y: y, width: W, height: rowH, rx: 4, fill: tint, opacity: Math.min(0.26, Math.abs(visualShift) * 0.9) }),
                      lines.map(function (lp, i) {
                        return React.createElement("rect", { key: i, x: lineX(lp, shift), y: y, width: 2.4, height: rowH, fill: "#0f172a", opacity: 0.9 });
                      })
                    );
                  };
                  return React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full", style: { maxHeight: '168px' }, role: "img", "aria-label": __alloT('stem.galaxy.aria_doppler_spectrum', 'Doppler shift spectrum: absorption lines move left for blueshift and right for redshift.') },
                    React.createElement("defs", null,
                      React.createElement("linearGradient", { id: "galDopplerGrad", x1: "0", y1: "0", x2: "1", y2: "0" },
                        React.createElement("stop", { offset: "0%", stopColor: "#4338ca" }),
                        React.createElement("stop", { offset: "24%", stopColor: "#2563eb" }),
                        React.createElement("stop", { offset: "48%", stopColor: "#16a34a" }),
                        React.createElement("stop", { offset: "72%", stopColor: "#eab308" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#dc2626" }))),
                    spectrum(20, 0, __alloT('stem.galaxy.spectrum_rest', 'Rest spectrum'), "transparent"),
                    spectrum(80, visualShift, __alloT('stem.galaxy.spectrum_observed', 'Observed spectrum'),dopplerVelocity < -8 ? "#2563eb" : dopplerVelocity > 8 ? "#dc2626" : "transparent"),
                    React.createElement("line", { x1: lineX(0.43, 0), y1: 54, x2: lineX(0.43, visualShift), y2: 76, stroke: dopplerColor, strokeWidth: 2, strokeDasharray: "4 3" }),
                    React.createElement("text", { x: lineX(0.43, visualShift), y: 124, fill: dopplerColor, textAnchor: "middle", style: { fontSize: '9px', fontWeight: '900' } }, dopplerVelocity < -8 ? __alloT('stem.galaxy.doppler_compressed_blue', 'compressed toward blue') : dopplerVelocity > 8 ? __alloT('stem.galaxy.doppler_stretched_red', 'stretched toward red') : __alloT('stem.galaxy.doppler_same_wavelength', 'same wavelength')),
                    React.createElement("text", { x: 2, y: 144, fill: "#64748b", style: { fontSize: '8px', fontWeight: '700' } }, "Screen shift magnified for clarity; actual z = " + dopplerZ.toFixed(5))
                  );
                })(),
                React.createElement("div", { className: "mt-2" },
                  React.createElement("div", { className: "flex items-center justify-between text-[10px] font-bold mb-1" },
                    React.createElement("span", { className: "text-blue-700" }, "\u2190 " + __alloT('stem.galaxy.doppler_toward_us', 'Toward us / blueshift')),
                    React.createElement("span", { className: "text-slate-500" }, __alloT('stem.galaxy.doppler_radial_velocity', 'Radial velocity')),
                    React.createElement("span", { className: "text-red-700" }, __alloT('stem.galaxy.doppler_away', 'Away / redshift') + " \u2192")
                  ),
                  React.createElement("input", {
                    type: "range", min: -1800, max: 1800, step: 25, value: dopplerVelocity,
                    "aria-label": __alloT('stem.galaxy.aria_doppler_velocity', 'Doppler radial velocity in kilometers per second'),
                    onChange: function (e) {
                      var val = parseInt(e.target.value, 10);
                      var nextLog = addInspectKey('dopplerShift');
                      patchGalaxy({ dopplerVelocity: val, inspectLog: nextLog });
                      if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'dopplerShift', (val < 0 ? 'Blueshift: source moving toward us at ' : val > 0 ? 'Redshift: source moving away at ' : 'No Doppler shift: source has zero radial velocity. ') + Math.abs(val) + ' kilometers per second.', { debounce: 500 });
                    },
                    className: "w-full h-1.5 accent-indigo-500"
                  })
                ),
                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-2" },
                  DOPPLER_PRESETS.map(function (preset) {
                    var on = Math.abs(dopplerVelocity - preset.value) < 1;
                    return React.createElement("button", {
                      type: "button",
                      key: preset.label,
                      onClick: function () {
                        var nextLog = addInspectKey('dopplerShift');
                        patchGalaxy({ dopplerVelocity: preset.value, inspectLog: nextLog });
                        if (typeof awardStemXP === 'function') awardStemXP('galaxy_doppler', 1, 'Tested Doppler shift');
                      },
                      className: "rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition-all " + (on ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                    }, preset.icon + " " + preset.label, React.createElement("span", { className: "block text-[10px] font-semibold opacity-70" }, (preset.value > 0 ? "+" : "") + preset.value + " km/s"));
                  })
                ),
                React.createElement("div", { className: "mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]" },
                  React.createElement("div", { className: "rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-900" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.doppler_blueshift_label', 'Blueshift: ')), __alloT('stem.galaxy.doppler_blueshift_body', 'the source is moving toward us, so wave crests arrive closer together and wavelengths get shorter.')),
                  React.createElement("div", { className: "rounded-lg border border-red-100 bg-red-50 p-2 text-red-900" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.doppler_redshift_label', 'Redshift: ')), __alloT('stem.galaxy.doppler_redshift_body', 'the source is moving away, so wave crests arrive farther apart and wavelengths get longer.'))
                )
              ),

              // ── Cosmic myth-busters ──
              React.createElement("div", { className: "mb-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-900 leading-relaxed" },
                React.createElement("p", { className: "font-bold mb-1" }, "⚠ " + __alloT('stem.galaxy.myth_busters_title', 'Cosmic myth-busters')),
                React.createElement("ul", { className: "list-disc pl-4 space-y-0.5" },
                  React.createElement("li", null, __alloT('stem.galaxy.myth_model', "This 3-D view is a MODEL — no spacecraft has ever photographed the Milky Way from outside. We live inside the disk, which is why we see it edge-on as a band of light across the night sky.")),
                  React.createElement("li", null, __alloT('stem.galaxy.myth_not_solar_system', 'A galaxy is NOT a solar system. Our entire solar system is just one of ~100–400 billion star systems in the Milky Way.')),
                  React.createElement("li", null, __alloT('stem.galaxy.myth_constellation', "Stars in a constellation only LOOK close together — they're often wildly different distances away, just along the same line of sight.")),
                  React.createElement("li", null, __alloT('stem.galaxy.myth_expansion', "Cosmic expansion stretches SPACE ITSELF — galaxies aren't flying outward through space, and there's no center. The Big Bang happened everywhere at once, not at one spot."))
                )
              ),

              // ── Mission Control ──
              React.createElement("div", { className: "mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-lg", "aria-hidden": true }, activeMission.icon),
                  React.createElement("div", { className: "min-w-0" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.mission_control_title', 'Mission Control')),
                    React.createElement("p", { className: "text-[11px] text-slate-500" }, activeMission.title + " • " + activeMissionDone + "/" + activeMission.steps.length + " complete")
                  ),
                  React.createElement("div", { className: "ml-auto h-2 w-24 rounded-full bg-slate-100 overflow-hidden", "aria-hidden": true },
                    React.createElement("div", { className: "h-full rounded-full bg-emerald-500 transition-all", style: { width: Math.round((activeMissionDone / activeMission.steps.length) * 100) + "%" } })
                  )
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },
                  missionDefs.map(function (m) {
                    var on = m.id === activeMission.id;
                    return React.createElement("button", {
                      type: "button",
                      key: m.id,
                      onClick: function () { upd("activeGalaxyMission", m.id); },
                      className: "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all " + (on ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white")
                    }, m.icon + " " + m.title);
                  })
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                  activeMission.steps.map(function (step, i) {
                    return React.createElement("div", {
                      key: step.label,
                      className: "rounded-lg border px-2.5 py-2 text-[11px] " + (step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600")
                    },
                      React.createElement("span", { className: "font-black mr-1" }, step.done ? "✓" : (i + 1) + "."),
                      step.label
                    );
                  })
                )
              ),

              // ── Observatory Filters ──
              React.createElement("div", { "data-galaxy-observatory": "true", className: "mb-3 rounded-xl border border-cyan-100 bg-white p-3 shadow-sm" },
                React.createElement("div", { className: "flex flex-wrap items-start gap-2 mb-2" },
                  React.createElement("span", { className: "text-lg", "aria-hidden": true }, activeObserve.icon),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.observatory_filters_title', 'Observatory Filters')),
                    React.createElement("p", { className: "text-[11px] text-slate-500 leading-relaxed" }, activeObserve.label + ": " + activeObserve.desc)
                  )
                ),
                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-1.5" },
                  OBSERVE_MODES.map(function (mode) {
                    var on = mode.key === observeMode;
                    var seen = !!inspectLog['observe:' + mode.key];
                    return React.createElement("button", {
                      type: "button",
                      key: mode.key,
                      "aria-pressed": on ? "true" : "false",
                      onClick: function () {
                        var cv = document.querySelector('[data-galaxy-canvas]');
                        if (cv && cv._setObserveMode) cv._setObserveMode(mode.key);
                        var nextLog = addInspectKey('observe:' + mode.key);
                        nextLog[mode.target] = true;
                        patchGalaxy({ observeMode: mode.key, selectedStar: null, selectedNebula: null, inspectTarget: mode.target, inspectLog: nextLog });
                        if (!seen && typeof awardStemXP === 'function') awardStemXP('galaxy_observe', 1, 'Used ' + mode.label + ' filter');
                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'observeMode', {
                          first: mode.label + ' observing mode. ' + mode.desc,
                          repeat: mode.label + ' observing mode active.',
                          terse: mode.label
                        }, { debounce: 500 });
                      },
                      className: "text-left rounded-lg border px-2.5 py-2 transition-all " + (on ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-white"),
                      style: { borderColor: on || seen ? mode.accent : '#e2e8f0' }
                    },
                      React.createElement("span", { className: "block text-[11px] font-black leading-tight" }, mode.icon + " " + mode.label + (seen ? " ✓" : "")),
                      React.createElement("span", { className: "block text-[10px] leading-tight mt-0.5", style: { color: on ? '#cbd5e1' : '#64748b' } }, mode.note)
                    );
                  })
                )
              ),



              // ── 3D Canvas ──

              React.createElement("div", { className: "relative rounded-xl overflow-hidden border", style: { height: '520px', background: 'radial-gradient(circle at 50% 44%, rgba(79,70,229,0.26), rgba(15,23,42,0.78) 42%, #020208 86%)', borderColor: 'rgba(129,140,248,0.42)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -46px 90px rgba(2,6,23,0.76), 0 22px 48px rgba(15,23,42,0.24)' } },

                d.webglError ?
                  React.createElement("div", {
                    className: "flex flex-col items-center justify-center p-6 text-center text-white",
                    style: { height: "100%", background: "rgba(5, 5, 16, 0.85)" }
                  },
                    React.createElement("span", { style: { fontSize: "48px", marginBottom: "16px" } }, "⚠️"),
                    React.createElement("h4", { className: "text-lg font-bold text-red-400 mb-2" }, __alloT('stem.galaxy.webgl_error_title', 'Galaxy Explorer 3D Mode Unresolved')),
                    React.createElement("p", { className: "text-xs text-slate-300 max-w-sm mb-6" }, __alloT('stem.galaxy.webgl_error_desc', 'WebGL failed to initialize. Your browser or device might not support 3D hardware acceleration.')),
                    React.createElement("button", {
                      onClick: function () {
                        upd("webglError", false);
                      },
                      className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition-colors"
                    }, __alloT('stem.galaxy.retry_3d_mode', 'Retry 3D Mode'))
                  ) :
                  React.createElement("canvas", {

                    "data-galaxy-canvas": "true", tabIndex: 0, role: "application", "aria-label": __alloT('stem.galaxy.aria_galaxy_canvas', 'Galaxy simulation — use arrow keys to orbit, +/- to zoom, R to reset view'), ref: function (el) { if (!el) { canvasRefCb(null); return; } el._onSelectStar = function (sd) { var key = 'star:' + sd.type.id; patchGalaxy({ selectedStar: sd.type.id, selectedNebula: null, inspectTarget: key, inspectLog: addInspectKey(key) }); if (typeof awardStemXP === 'function') awardStemXP('galaxy_explore', 2, 'Discovered ' + sd.type.label + ' star'); }; el._onSelectNebula = function (neb) { var key = 'nebula:' + neb.name; patchGalaxy({ selectedNebula: neb.name, selectedStar: null, inspectTarget: key, inspectLog: addInspectKey(key) }); if (typeof awardStemXP === 'function') awardStemXP('galaxy_explore', 3, 'Discovered ' + neb.name); }; canvasRefCb(el); }, onKeyDown: function (e) {

                    var cv = e.target; if (!cv || !cv._galaxyOrbit) return;

                    var orb = cv._galaxyOrbit, upCam = cv._galaxyUpdateCam;

                    if (e.key === 'ArrowLeft') { e.preventDefault(); orb.theta -= 0.1; upCam(); }

                    else if (e.key === 'ArrowRight') { e.preventDefault(); orb.theta += 0.1; upCam(); }

                    else if (e.key === 'ArrowUp') { e.preventDefault(); orb.phi = Math.max(0.1, orb.phi - 0.1); upCam(); }

                    else if (e.key === 'ArrowDown') { e.preventDefault(); orb.phi = Math.min(Math.PI - 0.1, orb.phi + 0.1); upCam(); }

                    else if (e.key === '+' || e.key === '=') { e.preventDefault(); orb.r = Math.max(0.2, orb.r * 0.9); upCam(); }

                    else if (e.key === '-') { e.preventDefault(); orb.r = Math.min(3, orb.r * 1.1); upCam(); }

                    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); orb.theta = Math.PI * 0.1; orb.phi = Math.PI * 0.35; orb.r = 1.2; upCam(); }

                  }, style: { width: '100%', height: '100%', cursor: 'grab', outline: 'none', background: 'transparent' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #a78bfa'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

                }),

                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 46%, transparent 34%, rgba(2,6,23,0.62) 100%), linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.045) 1px, transparent 1px)', backgroundSize: '100% 100%, 34px 34px, 34px 34px', mixBlendMode: 'screen', opacity: 0.72 } }),
                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.3) 9%, rgba(2,6,23,0) 20%, rgba(2,6,23,0) 80%, rgba(2,6,23,0.34) 91%, rgba(2,6,23,0.88) 100%)', opacity: 0.86 } }),
                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', left: '10%', right: '10%', top: '50%', height: 1, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.24), rgba(255,255,255,0.42), rgba(244,114,182,0.18), transparent)', boxShadow: '0 0 20px rgba(125,211,252,0.24)', mixBlendMode: 'screen', opacity: 0.48 } }),
                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', inset: '14px', pointerEvents: 'none', border: '1px solid rgba(191,219,254,0.07)', boxShadow: 'inset 0 0 30px rgba(15,23,42,0.5)', backgroundImage: 'linear-gradient(90deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(180deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(270deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(180deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(90deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(0deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(270deg, rgba(226,232,240,0.68), rgba(226,232,240,0)), linear-gradient(0deg, rgba(226,232,240,0.68), rgba(226,232,240,0))', backgroundPosition: 'top left, top left, top right, top right, bottom left, bottom left, bottom right, bottom right', backgroundSize: '92px 1px, 1px 58px, 92px 1px, 1px 58px, 92px 1px, 1px 58px, 92px 1px, 1px 58px', backgroundRepeat: 'no-repeat', opacity: 0.62 } }),

                // Star type legend

                React.createElement("div", { className: "absolute top-3 left-3 bg-slate-950/65 backdrop-blur-md rounded-lg px-2.5 py-2 text-[11px] text-white/85 border border-indigo-200/15 shadow-xl" },

                  React.createElement("div", { className: "font-bold mb-1" }, __alloT('stem.galaxy.star_types_legend_title', 'Star Types')),

                  STAR_TYPES.map(function (st) { return React.createElement("div", { key: st.id, className: "flex items-center gap-1 leading-tight" }, React.createElement("span", { style: { color: st.color, fontSize: '10px' } }, "\u2B50"), React.createElement("span", null, st.id + " (" + st.temp + "K)")); })

                ),

                React.createElement("div", { className: "absolute top-3 right-3 bg-slate-950/65 backdrop-blur-md rounded-lg px-3 py-2 text-[11px] border border-indigo-200/15 shadow-xl", style: { color: '#dbeafe', minWidth: 150 } },
                  React.createElement("div", { className: "font-black uppercase tracking-wider", style: { color: '#a5b4fc', fontSize: 10 } }, __alloT('stem.galaxy.galaxy_model_title', 'Galaxy model')),
                  React.createElement("div", { className: "flex justify-between gap-4 mt-1" }, React.createElement("span", { style: { color: '#94a3b8' } }, __alloT('stem.galaxy.galaxy_model_type', 'Type')), React.createElement("span", { className: "font-bold" }, gType.label)),
                  React.createElement("div", { className: "flex justify-between gap-4" }, React.createElement("span", { style: { color: '#94a3b8' } }, __alloT('stem.galaxy.galaxy_model_stars', 'Stars')), React.createElement("span", { className: "font-bold" }, starCount.toLocaleString())),
                  React.createElement("div", { className: "flex justify-between gap-4" }, React.createElement("span", { style: { color: '#94a3b8' } }, __alloT('stem.galaxy.scale_age', 'Age')), React.createElement("span", { className: "font-bold" }, cosmicAge.toFixed(1) + " Gyr")),
                  React.createElement("div", { className: "flex justify-between gap-4" }, React.createElement("span", { style: { color: '#94a3b8' } }, __alloT('stem.galaxy.galaxy_model_rotation', 'Rotation')), React.createElement("span", { className: "font-bold" }, rotMode === 'rigid' ? __alloT('stem.galaxy.rot_rigid', 'Rigid (toy)') : rotMode === 'keplerian' ? __alloT('stem.galaxy.rot_keplerian', 'Keplerian') : __alloT('stem.galaxy.rot_flat', 'Flat') + ' ✓')),
                  React.createElement("div", { className: "flex justify-between gap-4" }, React.createElement("span", { style: { color: '#94a3b8' } }, __alloT('stem.galaxy.galaxy_model_filter', 'Filter')), React.createElement("span", { className: "font-bold", style: { color: activeObserve.accent } }, activeObserve.label))
                ),

                // Scale info overlay

                layers.grid && React.createElement("div", { className: "absolute bottom-3 right-3 bg-slate-950/70 backdrop-blur-md rounded-lg px-2.5 py-2 text-[11px] text-white/85 border border-blue-200/15 shadow-xl" },

                  React.createElement("div", { className: "font-bold mb-1 text-blue-300" }, "\uD83D\uDCCF " + __alloT('stem.galaxy.scale_overlay_title', 'Scale')),

                  SCALE_INFO.map(function (s) { return React.createElement("div", { key: s.label, className: "flex justify-between gap-3" }, React.createElement("span", { className: "text-white/50" }, s.label), React.createElement("span", { className: "font-bold" }, s.value)); })

                )

              ),



              // ── Layer toggles ──

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

                LAYER_TOGGLES.map(function (lt) {

                  var isOn = layers[lt.key] !== false;

                  return React.createElement("button", { "aria-label": __alloT('stem.galaxy.aria_toggle_layer', 'Toggle layer'),

                    key: lt.key,

                    onClick: function () { toggleLayer(lt.key); },

                    className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (isOn ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600')

                  }, lt.icon + " " + lt.label);

                })

              ),



              // ── Galaxy rotation & the dark matter mystery ──

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl border border-indigo-400/30 p-4 shadow-lg" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                  React.createElement("h4", { className: "text-sm font-bold text-white" }, "🌀 " + __alloT('stem.galaxy.how_galaxy_spin_title', 'How does a galaxy spin?')),

                  React.createElement("span", { className: "ml-auto text-[10px] font-black uppercase tracking-wider text-fuchsia-300 bg-fuchsia-900/40 border border-fuchsia-700/50 px-2 py-0.5 rounded-full" }, __alloT('stem.galaxy.dark_matter_mystery_badge', 'dark matter mystery'))

                ),

                React.createElement("p", { className: "text-[11px] text-slate-400 leading-relaxed mb-2" }, __alloT('stem.galaxy.rotation_intro', "Pick a rotation model and watch the stars in the 3-D view above actually obey it. This one question — “how fast do outer stars orbit?” — led to one of the biggest discoveries in physics.")),

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

                  [

                    { key: 'keplerian', label: '🪐 ' + __alloT('stem.galaxy.rot_keplerian', 'Keplerian'), hint: __alloT('stem.galaxy.rotbtn_keplerian_hint', 'what visible mass predicts') },

                    { key: 'flat', label: '🌌 ' + __alloT('stem.galaxy.rotbtn_flat_label', 'Flat (observed)'), hint: __alloT('stem.galaxy.rotbtn_flat_hint', 'what telescopes measure') },

                    { key: 'rigid', label: '💿 ' + __alloT('stem.galaxy.rotbtn_rigid_label', 'Rigid disk'), hint: __alloT('stem.galaxy.rotbtn_rigid_hint', 'toy model — spins like a DVD') }

                  ].map(function (rm) {

                    var on = rotMode === rm.key;

                    return React.createElement("button", {

                      key: rm.key, "aria-label": "Set rotation model: " + rm.label + " (" + rm.hint + ")", "aria-pressed": on,

                      onClick: function () {

                        upd("rotMode", rm.key);

                        var tried = Object.assign({}, d.rotTried); tried[rm.key] = true;

                        upd("rotTried", tried);

                        if (Object.keys(tried).length === 2 && Object.keys(d.rotTried || {}).length < 2) awardStemXP('galaxy_rotation', 5, 'Compared galaxy rotation models');

                        var cv = document.querySelector('[data-galaxy-canvas]');

                        if (cv && cv._setRotMode) cv._setRotMode(rm.key);

                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'rotMode', {

                          first: 'Rotation model: ' + rm.label + ' — ' + rm.hint + '. Inner and outer stars now orbit at ' + (rm.key === 'rigid' ? 'the same angular speed, like a solid disk' : rm.key === 'keplerian' ? 'Keplerian speeds — inner stars lap the outer ones dramatically' : 'the observed flat-curve speeds — outer stars keep up, which only dark matter can explain') + '.',

                          repeat: rm.label + ' rotation active.',

                          terse: rm.label

                        });

                      },

                      className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (on ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200 shadow-sm' : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-fuchsia-600')

                    }, rm.label, React.createElement("span", { className: "block text-[10px] font-semibold opacity-70" }, rm.hint));

                  })

                ),

                // Rotation curve chart: orbital speed vs distance from center

                (function () {

                  var CW = 360, CH = 148, padL = 36, padR = 10, padT = 12, padB = 26;

                  var px = function (fx) { return padL + fx * (CW - padL - padR); };

                  var py = function (fv) { return CH - padB - fv * (CH - padT - padB); };

                  var kepPath = '', flatPath = '', gapPath = '';

                  var kepPts = [], flatPts = [];

                  for (var ci = 0; ci <= 40; ci++) {

                    var fx = ci / 40;

                    var vKep = Math.min(0.95, 0.30 / Math.sqrt(Math.max(fx, 0.055)));

                    var vFlat = 0.72 * (fx < 0.16 ? fx / 0.16 : 1);

                    kepPts.push([px(fx), py(vKep)]); flatPts.push([px(fx), py(vFlat)]);

                    kepPath += (ci ? 'L' : 'M') + px(fx).toFixed(1) + ' ' + py(vKep).toFixed(1);

                    flatPath += (ci ? 'L' : 'M') + px(fx).toFixed(1) + ' ' + py(vFlat).toFixed(1);

                  }

                  // shaded gap between prediction and observation (outer half only)

                  gapPath = 'M' + flatPts[16][0].toFixed(1) + ' ' + flatPts[16][1].toFixed(1);

                  for (var gi = 17; gi <= 40; gi++) gapPath += 'L' + flatPts[gi][0].toFixed(1) + ' ' + flatPts[gi][1].toFixed(1);

                  for (var gj = 40; gj >= 16; gj--) gapPath += 'L' + kepPts[gj][0].toFixed(1) + ' ' + kepPts[gj][1].toFixed(1);

                  gapPath += 'Z';

                  return React.createElement("svg", { viewBox: "0 0 " + CW + " " + CH, className: "w-full", style: { maxHeight: '160px' }, role: "img", "aria-label": __alloT('stem.galaxy.aria_rotation_curve', 'Rotation curve chart: orbital speed versus distance from the galactic center. The Keplerian prediction from visible matter falls off with distance, but the observed curve stays flat. The shaded gap between them is the evidence for dark matter.') },

                    React.createElement("line", { x1: padL, y1: padT, x2: padL, y2: CH - padB, stroke: "#475569", strokeWidth: 1 }),

                    React.createElement("line", { x1: padL, y1: CH - padB, x2: CW - padR, y2: CH - padB, stroke: "#475569", strokeWidth: 1 }),

                    React.createElement("text", { x: padL - 4, y: padT + 8, fill: "#94a3b8", fontSize: 8, textAnchor: "end" }, __alloT('stem.galaxy.chart_fast', 'fast')),

                    React.createElement("text", { x: padL - 4, y: CH - padB, fill: "#94a3b8", fontSize: 8, textAnchor: "end" }, __alloT('stem.galaxy.chart_slow', 'slow')),

                    React.createElement("text", { x: (padL + CW - padR) / 2, y: CH - 8, fill: "#94a3b8", fontSize: 8, textAnchor: "middle" }, __alloT('stem.galaxy.chart_distance_axis', 'distance from galactic center') + " →"),

                    React.createElement("text", { x: 8, y: (padT + CH - padB) / 2, fill: "#94a3b8", fontSize: 8, textAnchor: "middle", transform: "rotate(-90 8 " + ((padT + CH - padB) / 2) + ")" }, __alloT('stem.galaxy.chart_orbital_speed', 'orbital speed')),

                    React.createElement("path", { d: gapPath, fill: "rgba(217,70,239,0.14)", stroke: "none" }),

                    React.createElement("path", { d: kepPath, fill: "none", stroke: "#fbbf24", strokeWidth: 2, strokeDasharray: "5 3", opacity: rotMode === 'keplerian' ? 1 : 0.55 }),

                    React.createElement("path", { d: flatPath, fill: "none", stroke: "#22d3ee", strokeWidth: 2.2, opacity: rotMode === 'flat' ? 1 : 0.55 }),

                    rotMode === 'rigid' && React.createElement("line", { x1: px(0), y1: py(0), x2: px(1), y2: py(0.9), stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "2 3" }),

                    React.createElement("text", { x: px(0.62), y: py(0.72) - 6, fill: "#22d3ee", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.chart_observed_flat', 'observed (flat)')),

                    React.createElement("text", { x: px(0.62), y: py(0.38) + 12, fill: "#fbbf24", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.chart_visible_matter', 'visible matter alone')),

                    React.createElement("text", { x: px(0.80), y: py(0.55), fill: "#e879f9", fontSize: 9, fontWeight: 800, textAnchor: "middle" }, "↑ " + __alloT('stem.galaxy.chart_dark_matter', 'dark matter') + " ↑"),

                    // our Sun sits ~55% of the way out, moving at the flat-curve speed

                    React.createElement("circle", { cx: px(0.55), cy: py(0.72), r: 3.5, fill: "#fde047", stroke: "#0f172a", strokeWidth: 1 }),

                    React.createElement("text", { x: px(0.55), y: py(0.72) - 7, fill: "#fde047", fontSize: 8, fontWeight: 700, textAnchor: "middle" }, "☉ us (230 km/s)")

                  );

                })(),

                React.createElement("p", { className: "text-[11px] leading-relaxed mt-2 " + (rotMode === 'flat' ? 'text-cyan-200' : rotMode === 'keplerian' ? 'text-amber-200' : 'text-slate-300') },

                  rotMode === 'keplerian' ?

                    __alloT('stem.galaxy.rotation_explain_keplerian', "If starlight were all there is, gravity weakens with distance and outer stars should crawl — watch the galaxy's center above lap the outskirts and the disk shear apart. Our solar system really works this way: Mercury laps Neptune 700 times per Neptune-year.") :

                  rotMode === 'rigid' ?

                    __alloT('stem.galaxy.rotation_explain_rigid', "A toy model — the whole disk turns together like a painted DVD. No real galaxy does this; it would need mass to keep growing with radius squared. Compare it with the other two models!") :

                    __alloT('stem.galaxy.rotation_explain_flat', "In the 1970s Vera Rubin measured real galaxies and found this: outer stars move just as fast as inner ones. Visible matter can't supply that much gravity — an invisible halo of dark matter (~85% of all matter in the universe) must be holding the galaxy together. Nobody yet knows what it is.")

                ),

                React.createElement("p", { className: "text-[10px] text-slate-500 mt-1.5 italic" }, "💡 " + __alloT('stem.galaxy.rotation_density_wave_note', 'Also notice: the glowing gas lanes hold still while stars stream through them — real spiral arms are density waves (cosmic traffic jams), not fixed pinwheels of stars.'))

              ),



              // ── Star density slider ──

              React.createElement("div", { className: "flex items-center gap-3 mt-3 px-1" },

                React.createElement("span", { className: "text-[11px] font-bold text-slate-600 whitespace-nowrap" }, "\u2B50 Stars: " + starCount.toLocaleString()),

                React.createElement("input", {

                  type: "range", min: 2500, max: 100000, step: 2500, value: starCount,

                  'aria-label': __alloT('stem.galaxy.aria_number_of_stars', 'Number of stars'),

                  onChange: function (e) {

                    var val = parseInt(e.target.value);

                    upd("starCount", val);

                    var cv = document.querySelector('[data-galaxy-canvas]');

                    if (cv && cv._setStarCount) cv._setStarCount(val);

                  },

                  className: "flex-1 h-1.5 accent-indigo-500"

                }),

                React.createElement("span", { className: "text-[11px] text-slate-600 w-12 text-right" }, starCount >= 50000 ? __alloT('stem.galaxy.density_dense', 'Dense') : starCount >= 15000 ? __alloT('stem.galaxy.density_normal', 'Normal') : __alloT('stem.galaxy.density_sparse', 'Sparse'))

              ),



              // ── Cosmic Age Time-Lapse ──

              React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 " + __alloT('stem.galaxy.cosmic_timelapse_title', 'Cosmic Time-Lapse')),

                  React.createElement("span", { className: "ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicAge.toFixed(1) + " Gyr")

                ),

                React.createElement("div", { className: "flex items-center gap-2" },

                  React.createElement("span", { className: "text-[11px] text-violet-400 whitespace-nowrap" }, __alloT('stem.galaxy.big_bang_label', 'Big Bang')),

                  React.createElement("input", {

                    type: "range", min: 0.1, max: 14, step: 0.1, value: cosmicAge,

                    'aria-label': __alloT('stem.galaxy.aria_cosmic_age', 'Cosmic age in billion years'),

                    onChange: function (e) {

                      var val = parseFloat(e.target.value);

                      upd("cosmicAge", val);

                      var cv = document.querySelector('[data-galaxy-canvas]');

                      if (cv && cv._updateAge) cv._updateAge(val);
                      // Canvas Narration: cosmic age change
                      if (typeof canvasNarrate === 'function') {
                        var ep = getEpochNarration(val);
                        var msg = val.toFixed(1) + ' billion years' + (ep ? '. ' + ep.title : '');
                        canvasNarrate('galaxy', 'cosmicAge', msg, { debounce: 800 });
                      }

                    },

                    className: "flex-1 h-1.5 accent-violet-500"

                  }),

                  React.createElement("span", { className: "text-[11px] text-violet-400 whitespace-nowrap" }, "14 Gyr")

                ),

                React.createElement("div", { className: "flex gap-1.5 mt-2" },

                  xrSupported && React.createElement("button", {
                    "aria-label": t('vr.enter_title', 'Enter VR (needs a headset)'),
                    title: t('vr.enter_title', 'Enter VR (needs a headset)'),
                    onMouseDown: function (e) { e.preventDefault(); e.stopPropagation(); if (window._galaxyVR && window._galaxyVR.enterVR) window._galaxyVR.enterVR(); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-bold select-none bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                  }, '🥽 ' + t('vr.enter', 'VR')),

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.aria_toggle_timelapse', 'Toggle cosmic time-lapse playback'),

                    onMouseDown: function (e) {

                      e.preventDefault(); e.stopPropagation();

                      if (window._galaxyTimeLapse) { clearInterval(window._galaxyTimeLapse); window._galaxyTimeLapse = null; upd("isPlaying", false); return; }

                      upd("isPlaying", true);

                      var age = d.cosmicAge !== undefined ? d.cosmicAge : cosmicAge;

                      window._galaxyTimeLapse = setInterval(function () {

                        age += 0.1;

                        if (age > 14) { clearInterval(window._galaxyTimeLapse); window._galaxyTimeLapse = null; upd("isPlaying", false); return; }

                        upd("cosmicAge", parseFloat(age.toFixed(1)));

                        var cv = document.querySelector('[data-galaxy-canvas]');

                        if (cv && cv._updateAge) cv._updateAge(age);

                        if (Math.random() < 0.15 && cv && cv._triggerSupernova) cv._triggerSupernova();

                      }, 150);

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold select-none " + (window._galaxyTimeLapse ? "bg-red-700 text-white" : "bg-violet-600 text-white hover:bg-violet-700") + " transition-all"

                  }, window._galaxyTimeLapse ? "\u23F9 " + __alloT('stem.galaxy.stop_btn', 'Stop') : "\u25B6 " + __alloT('stem.galaxy.play_timelapse_btn', 'Play Time-Lapse')),

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.aria_trigger_supernova', 'Trigger a random supernova in the galaxy view'), title: __alloT('stem.galaxy.title_trigger_supernova', 'Trigger a random supernova flash in the galaxy view'),

                    onClick: function () {

                      var cv = document.querySelector('[data-galaxy-canvas]');

                      var evt = (cv && cv._triggerSupernova) ? cv._triggerSupernova() : null;
                      var msg = evt ? "Random supernova: " + evt.type + " star (" + evt.spectral + "-type)" : __alloT('stem.galaxy.supernova_unavailable', 'Supernova effect is not available yet.');
                      patchGalaxy({ lastGalaxyEvent: msg, inspectLog: evt ? addInspectKey('supernovaEvent') : inspectLog });
                      if (evt && typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'supernovaEvent', {
                        first: msg + ". The flash marks a massive star exploding and spreading heavy elements into space.",
                        repeat: msg,
                        terse: "Supernova flash"
                      }, { debounce: 600 });
                      if (evt && typeof awardStemXP === 'function') awardStemXP('galaxy_supernova', 2, 'Triggered a galaxy supernova');
                      if (evt && typeof addToast === 'function') addToast('Supernova flash triggered', 'success');

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all"

                  }, "\uD83D\uDCA5 " + __alloT('stem.galaxy.random_supernova_btn', 'Random supernova')),

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.mode_star_life', 'Star Life'),

                    onClick: function () { patchGalaxy({ quizMode: false, simMode: "star", showLifecycle: true }); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 border border-indigo-200 transition-all hover:bg-indigo-50"

                  }, "\u2B50 " + __alloT('stem.galaxy.mode_star_life', 'Star Life') + " \u2192")

                ),

                d.lastGalaxyEvent && React.createElement("div", { className: "mt-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-100" }, d.lastGalaxyEvent),

                // Milestone labels

                React.createElement("div", { className: "flex justify-between mt-2 text-[11px] text-violet-400" },

                  [

                    { age: 0.4, label: t('stem.galaxy.first_stars') },

                    { age: 1, label: t('stem.galaxy.galaxies_form') },

                    { age: 4.6, label: t('stem.galaxy.milky_way') },

                    { age: 9.2, label: t('stem.galaxy.sun_born') },

                    { age: 13.8, label: __alloT('stem.galaxy.milestone_now', 'Now') }

                  ].map(function (m) {

                    return React.createElement("span", { 

                      key: m.age,

                      className: "cursor-pointer hover:text-violet-600" + (Math.abs(cosmicAge - m.age) < 0.3 ? " font-bold text-violet-700" : ""),

                      onClick: function () {

                        upd("cosmicAge", m.age);

                        var cv = document.querySelector('[data-galaxy-canvas]');

                        if (cv && cv._updateAge) cv._updateAge(m.age);

                      }

                    }, m.label);

                  })

                ),

                // ── Epoch narration card ──

                (function () {

                  var epoch = getEpochNarration(cosmicAge);

                  if (!epoch) return null;

                  return React.createElement("div", { className: "mt-2 flex items-start gap-2 px-3 py-2 bg-violet-100/60 rounded-lg border border-violet-200 animate-in fade-in duration-300" },

                    React.createElement("span", { className: "text-lg flex-shrink-0" }, epoch.emoji),

                    React.createElement("div", null,

                      React.createElement("p", { className: "text-[11px] font-bold text-violet-800" }, epoch.title + " (" + epoch.age + " Gyr)"),

                      React.createElement("p", { className: "text-[11px] text-violet-600 leading-relaxed" }, epoch.desc)

                    )

                  );

                })()

              ),



              // ── Warp points ──

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

                WARP_POINTS.map(function (wp) { return React.createElement("button", { "aria-label": "Warp to " + wp.label, key: wp.label, onClick: function () {
                  var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyWarp) cv._galaxyWarp(wp);
                  var warpInspect = (wp.zoom === 2 && wp.x === 0 && wp.z === 0) ? 'blackHole' : (wp.zoom === 0.8 ? 'galaxyType' : 'spiralArms');
                  var warpDesc = wp.desc || (warpInspect === 'blackHole' ? __alloT('stem.galaxy.warp_blackhole_desc', 'Sagittarius A* sits in this crowded core; stars orbit it so quickly that an unseen compact mass is required.') : null);
                  var warpPatch = { selectedStar: null, selectedNebula: null, inspectTarget: warpInspect, inspectLog: addInspectKey(warpInspect) };
                  if (warpDesc) warpPatch.warpInfo = warpDesc;
                  patchGalaxy(warpPatch);
                  // Canvas Narration: warp navigation
                  if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'warp', {
                    first: 'Warping to ' + wp.label + '. ' + (wp.desc || 'Camera repositioning to this location.'),
                    repeat: 'Warped to ' + wp.label + '.',
                    terse: wp.label
                  });
                }, className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all hover:scale-105" }, "\uD83D\uDE80 " + wp.label); })

              ),



              // ── Warp info ──

              d.warpInfo && React.createElement("div", { className: "mt-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-[11px] text-indigo-700" },

                React.createElement("span", { className: "font-bold" }, "\uD83D\uDCCD "),

                d.warpInfo

              ),



              // ── Object Inspector ──

              currentInspector && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 shadow-sm animate-in fade-in", style: { borderColor: currentInspector.color } },

                React.createElement("div", { className: "flex items-start gap-3" },

                  React.createElement("div", { className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl", style: { background: currentInspector.color + '18', color: currentInspector.color } }, currentInspector.icon),

                  React.createElement("div", { className: "min-w-0 flex-1" },

                    React.createElement("div", { className: "flex flex-wrap items-center gap-2" },

                      React.createElement("h4", { className: "font-black text-sm", style: { color: currentInspector.color } }, __alloT('stem.galaxy.object_inspector_title', 'Object Inspector')),

                      React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold", style: { background: currentInspector.color + '18', color: currentInspector.color } }, currentInspector.type)

                    ),

                    React.createElement("p", { className: "text-sm font-bold text-slate-800 mt-0.5" }, currentInspector.title),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mt-1" }, currentInspector.desc)

                  )

                ),

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

                  inspectButtons.map(function (item) {

                    var target = INSPECT_TARGETS[item.key] || INSPECT_TARGETS.galaxyType;
                    var on = !selStar && !selNeb && currentInspector.key === item.key;
                    var seen = !!inspectLog[item.key];

                    return React.createElement("button", {
                      type: "button",
                      key: item.key,
                      "aria-pressed": on ? "true" : "false",
                      onClick: function () {
                        var alreadySeen = !!inspectLog[item.key];
                        patchGalaxy({ selectedStar: null, selectedNebula: null, inspectTarget: item.key, inspectLog: addInspectKey(item.key) });
                        if (!alreadySeen && typeof awardStemXP === 'function') awardStemXP('galaxy_inspect', 1, 'Inspected ' + item.label);
                      },
                      className: "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all " + (on ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-white"),
                      style: { borderColor: on || seen ? target.color : '#e2e8f0' }
                    }, item.icon + " " + item.label + (seen ? " ✓" : ""));

                  })

                ),

                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] mt-3" },

                  (currentInspector.facts || []).map(function (fact, idx) {

                    return React.createElement("div", { key: currentInspector.key + "-fact-" + idx, className: "rounded-lg bg-slate-50 border border-slate-100 p-2 text-center" },

                      React.createElement("div", { className: "font-black text-slate-500" }, "Signal " + (idx + 1)),

                      React.createElement("div", { className: "font-bold leading-tight", style: { color: currentInspector.color } }, fact)

                    );

                  })

                ),

                React.createElement("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-2 gap-2" },

                  React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2.5" },

                    React.createElement("p", { className: "text-[11px] font-black text-slate-700 mb-1" }, __alloT('stem.galaxy.evidence_label', 'Evidence')),

                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" }, currentInspector.evidence)

                  ),

                  React.createElement("div", { className: "rounded-lg border border-cyan-100 bg-cyan-50 p-2.5" },

                    React.createElement("p", { className: "text-[11px] font-black text-cyan-800 mb-1" }, __alloT('stem.galaxy.astronomer_note_label', 'Astronomer Note')),

                    React.createElement("p", { className: "text-[11px] text-cyan-900 leading-relaxed" }, currentInspector.question)

                  )

                ),

                selStar && selStar.whyItMatters && React.createElement("div", { className: "mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200" },

                  React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 " + __alloT('stem.galaxy.why_it_matters_label', 'Why It Matters')),

                  React.createElement("p", { className: "text-[11px] text-amber-800 leading-relaxed" }, selStar.whyItMatters)

                ),

                selStar && React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-center" },

                  React.createElement("p", { className: "text-[11px] text-indigo-600" }, "\uD83D\uDD2D If our Sun were a basketball, a" + (selStar.id === 'O' ? 'n' : '') + " " + selStar.id + "-type star would be " + ({ 'O': 'a hot tub (6\u201315x wider)', 'B': 'a beach ball (2\u20137x wider)', 'A': 'a soccer ball (1.4\u20132x wider)', 'F': 'a volleyball (slightly bigger)', 'G': 'another basketball (same size!)', 'K': 'a softball (a bit smaller)', 'M': 'a tennis ball or smaller' }[selStar.id] || 'similar in size') + ".")

                )

              ),



              // ── Snapshot button ──

              React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

                React.createElement("button", { "aria-label": __alloT('stem.galaxy.snapshot', 'Snapshot'), onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'gx-' + Date.now(), tool: 'galaxy', label: t('stem.galaxy.galaxy') + (d.selectedStar ? ': ' + d.selectedStar : '') + ' (' + gType.label + ')', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.galaxy.snapshot', 'Snapshot'))

              )

            ), // end Galaxy Simulation mode wrapper

            !d.quizMode && simMode === 'realSky' && React.createElement("div", { className: "animate-in fade-in duration-300" },

              React.createElement("div", { className: "mb-3 rounded-2xl border bg-slate-950 p-4 shadow-xl", style: { borderColor: 'rgba(14,165,233,0.32)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 22px 54px rgba(15,23,42,0.22)' } },
                React.createElement("div", { className: "flex flex-wrap items-start gap-3" },
                  React.createElement("div", { className: "h-11 w-11 rounded-xl flex items-center justify-center text-xl border", style: { borderColor: 'rgba(125,211,252,0.38)', background: 'radial-gradient(circle at 35% 25%, rgba(125,211,252,0.24), rgba(30,41,59,0.9))' } }, "\uD83D\uDD2D"),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wider text-cyan-200" }, __alloT('stem.galaxy.realsky_mode_title', 'Real Sky Survey Mode')),
                    React.createElement("h4", { className: "text-base font-black text-white" }, activeRealSkyTarget.name + " (" + activeRealSkyTarget.short + ")"),
                    React.createElement("p", { className: "text-[12px] text-slate-300 leading-relaxed mt-1" }, activeRealSkyTarget.story)
                  ),
                  React.createElement("a", { href: activeAladinUrl, target: "_blank", rel: "noreferrer", className: "rounded-lg border px-3 py-1.5 text-[11px] font-bold text-cyan-100 hover:bg-cyan-400/10", style: { borderColor: 'rgba(103,232,249,0.35)' } }, __alloT('stem.galaxy.open_in_aladin', 'Open in Aladin'))
                ),
                React.createElement("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]" },
                  React.createElement("div", { className: "rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-2" },
                    React.createElement("p", { className: "font-black text-cyan-100" }, activeRealSkyTarget.type),
                    React.createElement("p", { className: "text-slate-300 leading-relaxed mt-1" }, activeRealSkyTarget.bridge)
                  ),
                  React.createElement("div", { className: "rounded-lg border border-violet-300/20 bg-violet-300/10 p-2" },
                    React.createElement("p", { className: "font-black text-violet-100" }, activeRealSkySurvey.label + " survey"),
                    React.createElement("p", { className: "text-slate-300 leading-relaxed mt-1" }, activeRealSkySurvey.desc)
                  ),
                  React.createElement("div", { className: "rounded-lg border border-amber-300/20 bg-amber-300/10 p-2" },
                    React.createElement("p", { className: "font-black text-amber-100" }, activeRealSkyCatalog.label),
                    React.createElement("p", { className: "text-slate-300 leading-relaxed mt-1" }, activeRealSkyCatalog.desc)
                  )
                )
              ),

              React.createElement("div", { className: "mb-3 rounded-xl border border-cyan-100 bg-white p-3 shadow-sm" },
                React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-base", "aria-hidden": true }, "\uD83E\uDDEA"),
                  React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.real_data_lesson_title', 'Real Data Lesson Prompt')),
                  React.createElement("span", { className: "ml-auto rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700" }, activeRealSkyTarget.short)
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                  (activeRealSkyTarget.lesson || []).map(function (prompt, idx) {
                    return React.createElement("div", { key: activeRealSkyTarget.key + "-lesson-" + idx, className: "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700 leading-relaxed" },
                      React.createElement("span", { className: "font-black text-cyan-700 mr-1" }, (idx + 1) + "."),
                      prompt
                    );
                  })
                )
              ),

              React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-3" },
                React.createElement("div", { className: "space-y-3" },
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.targets_label', 'Targets')),
                    React.createElement("div", { className: "grid grid-cols-2 xl:grid-cols-1 gap-1.5" },
                      REAL_SKY_TARGETS.map(function (target) {
                        var on = target.key === activeRealSkyTarget.key;
                        return React.createElement("button", {
                          type: "button",
                          key: target.key,
                          onClick: function () { patchGalaxy({ realSkyTarget: target.key, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "text-left rounded-lg border px-2.5 py-2 transition-all " + (on ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        },
                          React.createElement("span", { className: "block text-[11px] font-black leading-tight" }, target.short + " " + target.name),
                          React.createElement("span", { className: "block text-[10px] leading-tight mt-0.5 opacity-70" }, target.type)
                        );
                      })
                    )
                  ),
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.survey_light_label', 'Survey Light')),
                    React.createElement("div", { className: "space-y-1.5" },
                      REAL_SKY_SURVEYS.map(function (survey) {
                        var on = survey.id === activeRealSkySurvey.id;
                        return React.createElement("button", {
                          type: "button",
                          key: survey.id,
                          onClick: function () { patchGalaxy({ realSkySurvey: survey.id, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "w-full text-left rounded-lg border px-2.5 py-2 text-[11px] font-bold transition-all " + (on ? "bg-cyan-50 text-cyan-800 border-cyan-300" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        }, survey.label, React.createElement("span", { className: "block text-[10px] font-semibold opacity-70" }, survey.desc));
                      })
                    )
                  ),
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.catalog_overlay_label', 'Catalog Overlay')),
                    React.createElement("div", { className: "space-y-1.5" },
                      REAL_SKY_CATALOGS.map(function (catalog) {
                        var on = catalog.id === activeRealSkyCatalog.id;
                        return React.createElement("button", {
                          type: "button",
                          key: catalog.id,
                          onClick: function () { patchGalaxy({ realSkyCatalog: catalog.id, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "w-full text-left rounded-lg border px-2.5 py-2 text-[11px] font-bold transition-all " + (on ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        }, catalog.label, React.createElement("span", { className: "block text-[10px] font-semibold opacity-70" }, catalog.desc));
                      })
                    )
                  )
                ),

                React.createElement("div", { className: "min-w-0" },
                  React.createElement("div", { className: "relative rounded-2xl overflow-hidden border bg-slate-950 shadow-2xl", style: { borderColor: 'rgba(14,165,233,0.32)' } },
                    React.createElement("div", { key: activeRealSkyTarget.key + "-" + activeRealSkySurvey.id + "-" + activeRealSkyCatalog.id + "-" + realSkyRetry, id: "galaxy-real-sky-aladin", ref: realSkyRefCb, style: { height: 590, minHeight: 420, background: 'radial-gradient(circle at 50% 35%, rgba(14,165,233,0.2), rgba(2,6,23,0.98) 62%)' } }),
                    realSkyStatus !== 'ready' && React.createElement("div", { className: "absolute inset-0 flex items-center justify-center p-6 text-center", style: { pointerEvents: realSkyStatus === 'error' ? 'auto' : 'none', background: realSkyStatus === 'error' ? 'rgba(2,6,23,0.86)' : 'linear-gradient(180deg, rgba(2,6,23,0.62), rgba(2,6,23,0.34))' } },
                      React.createElement("div", { className: "max-w-sm rounded-xl border border-cyan-300/20 bg-slate-950/80 p-4 text-white shadow-xl" },
                        React.createElement("p", { className: "text-xl mb-1" }, realSkyStatus === 'error' ? "\u26A0\uFE0F" : "\uD83D\uDD2D"),
                        React.createElement("p", { className: "text-sm font-black text-cyan-100" }, realSkyStatus === 'error' ? __alloT('stem.galaxy.realsky_atlas_unavailable', 'Real-sky atlas unavailable') : __alloT('stem.galaxy.realsky_connecting', 'Connecting to real sky surveys')),
                        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mt-1" }, realSkyMessage || __alloT('stem.galaxy.realsky_loading', 'Loading Aladin Lite, sky survey tiles, and catalog services.')),
                        realSkyStatus === 'error' && React.createElement("div", { className: "mt-3 flex flex-wrap items-center justify-center gap-2" },
                          React.createElement("button", { type: "button", onClick: function () { patchGalaxy({ realSkyStatus: 'idle', realSkyMessage: '', realSkyRetry: realSkyRetry + 1 }); }, className: "rounded-lg border border-cyan-200/50 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-400/25" }, __alloT('stem.galaxy.retry_atlas', 'Retry atlas')),
                          React.createElement("a", { href: activeAladinUrl, target: "_blank", rel: "noreferrer", className: "inline-block rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-bold text-white" }, __alloT('stem.galaxy.open_external_atlas', 'Open external atlas'))
                        )
                      )
                    )
                  ),

                  React.createElement("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-2" },
                    [
                      { title: __alloT('stem.galaxy.card_observe_title', 'Observe it'), body: __alloT('stem.galaxy.card_observe_body', 'Move this target into Night Sky & Astronomy to compare real survey data with telescope expectations.'), action: __alloT('stem.galaxy.card_observe_action', 'Astronomy'), onClick: function () {
                        setLabToolData(function (prev) { return Object.assign({}, prev, { astronomy: Object.assign({}, prev.astronomy || {}, { tab: 'observe', eyepieceTarget: activeRealSkyTarget.astronomyTarget || 'andromeda' }) }); });
                        setStemLabTool('astronomy');
                      } },
                      { title: __alloT('stem.galaxy.card_time_title', 'Place it in time'), body: __alloT('stem.galaxy.card_time_body', 'Jump to Universe with the matching real-data tour, evidence thread, and guided mission selected.'), action: __alloT('stem.galaxy.card_time_action', 'Universe'), onClick: function () {
                        setLabToolData(function (prev) {
                          var prevUniverse = prev.universe || {};
                          var launched = prevUniverse.cosmicMissionsLaunched || [];
                          var nextLaunched = launched.indexOf(activeRealSkyMission) === -1 ? launched.concat([activeRealSkyMission]) : launched;
                          return Object.assign({}, prev, { universe: Object.assign({}, prevUniverse, { showImages: true, wwtTourStop: activeRealSkyUniverseStop, cosmicEvidenceThread: activeRealSkyEvidenceThread, cosmicTime: activeRealSkyUniverseTime, activeCosmicMission: activeRealSkyMission, cosmicMissionsLaunched: nextLaunched }) });
                        });
                        setStemLabTool('universe');
                      } },
                      { title: __alloT('stem.galaxy.card_analyze_title', 'Analyze data'), body: __alloT('stem.galaxy.card_analyze_body', 'Use Data Lab for the next step: spectra, brightness, color, classification, and student research questions.'), action: __alloT('stem.galaxy.card_analyze_action', 'Data Lab'), onClick: function () { setStemLabTool('dataLab'); } }
                    ].map(function (card) {
                      return React.createElement("div", { key: card.title, className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                        React.createElement("p", { className: "text-xs font-black text-slate-800" }, card.title),
                        React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed mt-1" }, card.body),
                        React.createElement("button", { type: "button", onClick: card.onClick, className: "mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100" }, card.action + " \u2192")
                      );
                    })
                  )
                )
              )
            ),

// ── Quiz mode ──

              d.quizMode && d.isGeneratingQuiz && React.createElement("div", { className: "flex flex-col items-center justify-center p-12 mt-6 max-w-2xl mx-auto rounded-2xl bg-indigo-50 border-2 border-indigo-300 animate-pulse"}, React.createElement("h2", {className: "text-lg font-bold text-indigo-600 mb-2"}, "✨ " + __alloT('stem.galaxy.quiz_generating_title', 'Gemini is Generating Astrophysic Questions...')), React.createElement("p", {className: "text-sm text-indigo-400"}, __alloT('stem.galaxy.quiz_generating_sub', 'Parsing deep space databases...'))),
              d.quizMode && !d.isGeneratingQuiz && quizQ && React.createElement("div", { className: "mt-6 max-w-2xl mx-auto bg-white shadow-xl rounded-2xl border border-slate-400 p-8 animate-in fade-in slide-in-from-bottom-4" },

                React.createElement("div", { className: "flex items-center justify-between mb-2" },

                  React.createElement("p", { className: "text-xs font-bold text-indigo-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + ACTIVE_BANK.length),

                  React.createElement("div", { className: "flex items-center gap-2 text-xs" },

                    React.createElement("span", { className: "font-bold text-green-600" }, "\u2714 " + (d.quizScore || 0)),

                    React.createElement("span", { className: "font-bold text-amber-500" }, "\uD83D\uDD25 " + (d.quizStreak || 0))

                  )

                ),

                React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  quizQ.options.map(function (opt) {

                    return React.createElement("button", { "aria-label": "Select answer: " + opt,

                      key: opt, disabled: !!d.quizFeedback,

                      onClick: function () {

                        var correct = opt === quizQ.a;

                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 " + __alloT('stem.galaxy.quiz_correct', 'Correct! +10 XP') : "\u274C " + __alloT('stem.galaxy.quiz_answer_is', 'The answer is: ') + quizQ.a });

                        if (correct) { upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1); }

                        else { upd("quizStreak", 0); }

                      }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " + (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : d.quizFeedback && !d.quizFeedback.correct && opt !== quizQ.a ? "border-slate-200 bg-white text-slate-200 opacity-50" : "border-slate-200 bg-white text-slate-600") : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400")

                    }, opt);

                  })

                ),

                d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },

                  d.quizFeedback.msg,

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.quiz_next', 'Next'), onClick: function () { upd("quizIdx", ((d.quizIdx || 0) + 1) % ACTIVE_BANK.length); upd("quizFeedback", null); }, className: "ml-3 px-2 py-0.5 bg-indigo-600 text-white rounded text-xs" }, __alloT('stem.galaxy.quiz_next', 'Next') + " \u2192")

                )

              ),




            // ══════════════════════════════════════════════

            // ── Star Lifespan Simulation Mode ──

            // ══════════════════════════════════════════════

            !d.quizMode && simMode === 'blackHole' && React.createElement("div", { className: "animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4" },
              React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 border-indigo-300/30 bg-[#010208] shadow-2xl shadow-indigo-500/10", style: { minHeight: 'clamp(420px, 65vw, 590px)' } },
                React.createElement("canvas", { "data-black-hole-canvas": "true", "data-spin": blackHoleSpin, "data-disk": blackHoleDisk, "data-paused": blackHoleEffectivePaused ? "true" : "false", ref: blackHoleRefCb, tabIndex: 0, role: "img", "aria-label": __alloT('stem.galaxy.aria_blackhole_canvas', 'Interactive model of a rotating black hole with an event horizon, photon ring, accretion disk, polar jets, and a tidal-forces object-drop experiment.'), "aria-describedby": "black-hole-instructions black-hole-description black-hole-status", className: 'focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-inset', style: { width: '100%', height: 'clamp(420px, 65vw, 590px)', display: 'block', cursor: 'grab', touchAction: 'none' } }),
                React.createElement("div", { className: "absolute top-3 left-3 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-2 text-white backdrop-blur-md pointer-events-none" },
                  React.createElement("div", { className: "text-[11px] uppercase tracking-widest font-black text-violet-300" }, __alloT('stem.galaxy.blackhole_lab_title', 'Black Hole Lab')),
                  React.createElement("div", { className: "text-[11px] text-slate-300 mt-0.5" }, __alloT('stem.galaxy.blackhole_drag_hint', 'Drag to orbit - Scroll to zoom'))),
                React.createElement("div", { id: "black-hole-drop-readout", "aria-hidden": true, className: "absolute top-3 right-3 max-w-[55%] rounded-xl border border-orange-200/30 bg-slate-950/75 px-3 py-2 text-right text-[11px] font-bold text-orange-100 backdrop-blur-md pointer-events-none" }, __alloT('stem.galaxy.blackhole_drop_begin', 'Drop an object to begin')),
                React.createElement("p", { id: "black-hole-instructions", className: "sr-only" }, __alloT('stem.galaxy.blackhole_keyboard_help', 'Keyboard controls: use the arrow keys to orbit, plus and minus to zoom, and Home to reset the camera. Animation can be paused with the button after the canvas.')),
                React.createElement("div", { className: "absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none" },
                  [__alloT('stem.galaxy.bh_badge_event_horizon', 'Event horizon'), __alloT('stem.galaxy.bh_badge_photon_ring', 'Photon ring'), __alloT('stem.galaxy.bh_badge_accretion_disk', 'Accretion disk'), __alloT('stem.galaxy.bh_badge_polar_jets', 'Polar jets')].map(function(label, i){ return React.createElement("span", { key: label, className: "rounded-full border border-white/15 bg-slate-950/75 px-2 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md" }, (i===0?'\u25cf ':i===1?'\u25cb ':i===2?'\u2248 ':'\u2195 ') + label); }))
              ),
              React.createElement("aside", { className: "space-y-3" },
                React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" },
                  React.createElement("h4", { className: "text-sm font-black text-slate-800" }, __alloT('stem.galaxy.relativistic_controls_title', 'Relativistic controls')),
                  React.createElement("p", { id: "black-hole-description", className: "mt-1 text-[11px] leading-relaxed text-slate-600" }, __alloT('stem.galaxy.blackhole_description', 'A teaching model near a rotating black hole. Distances are visual, not to scale.')),
                  React.createElement("p", { id: "black-hole-status", role: "status", "aria-live": "polite", className: "mt-2 text-[11px] font-semibold text-indigo-800" }, blackHoleEffectivePaused ? (blackHoleReducedMotion && !blackHoleMotionAllowed ? __alloT('stem.galaxy.bh_status_reduced_motion', 'Animation paused to honor your reduced-motion preference.') : __alloT('stem.galaxy.bh_status_paused', 'Simulation paused.')) : __alloT('stem.galaxy.bh_status_running', 'Simulation running.')),
                  React.createElement("label", { htmlFor: "black-hole-spin", className: "mt-4 block text-[11px] font-bold text-slate-700" }, __alloT('stem.galaxy.bh_spin_label', 'Spin: '), React.createElement("span", { className: "font-mono text-indigo-700" }, blackHoleSpin.toFixed(2))),
                  React.createElement("input", { id: "black-hole-spin", type: "range", min: 0, max: 0.99, step: 0.01, value: blackHoleSpin, "aria-valuetext": blackHoleSpin.toFixed(2) + " of 0.99", className: "w-full accent-indigo-600", onChange: function(e){ var v=parseFloat(e.target.value); upd('blackHoleSpin',v); var cv=document.querySelector('[data-black-hole-canvas]'); if(cv&&cv._setBlackHoleSpin)cv._setBlackHoleSpin(v); } }),
                  React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.galaxy.bh_spin_desc', 'Higher spin speeds the inner disk and strengthens its bright approaching side.')),
                  React.createElement("label", { htmlFor: "black-hole-disk", className: "mt-3 block text-[11px] font-bold text-slate-700" }, __alloT('stem.galaxy.bh_disk_label', 'Disk brightness: '), React.createElement("span", { className: "font-mono text-indigo-700" }, Math.round(blackHoleDisk*100) + "%")),
                  React.createElement("input", { id: "black-hole-disk", type: "range", min: 0.2, max: 1, step: 0.01, value: blackHoleDisk, "aria-valuetext": Math.round(blackHoleDisk*100) + " percent", className: "w-full accent-indigo-600", onChange: function(e){ var v=parseFloat(e.target.value); upd('blackHoleDisk',v); var cv=document.querySelector('[data-black-hole-canvas]'); if(cv&&cv._setBlackHoleDisk)cv._setBlackHoleDisk(v); } }),
                  React.createElement("button", { type: "button", className: "mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700", onClick: function(){ var next; if (!blackHoleMotionAllowed) { upd('blackHoleMotionAllowed',true); upd('blackHolePaused',false); next=false; } else { next=!blackHolePaused; upd('blackHolePaused',next); } var cv=document.querySelector('[data-black-hole-canvas]'); if(cv&&cv._setBlackHolePaused)cv._setBlackHolePaused(next); }, "aria-pressed": blackHoleEffectivePaused }, blackHoleEffectivePaused ? "\u25b6 " + __alloT('stem.galaxy.bh_start_anim', 'Start animation') : "\u23f8 " + __alloT('stem.galaxy.bh_pause_anim', 'Pause animation'))
                ),
                React.createElement("div", { className: "rounded-2xl border border-orange-200 bg-orange-50 p-4" },
                  React.createElement("h4", { className: "text-sm font-black text-orange-950" }, __alloT('stem.galaxy.tidal_forces_title', 'Tidal forces experiment')),
                  React.createElement("p", { id: "black-hole-drop-help", className: "mt-1 text-[11px] leading-relaxed text-orange-950" }, __alloT('stem.galaxy.tidal_forces_desc', 'Release an object and observe spaghettification: gravity pulls harder on its near side, stretching it radially while compressing it sideways.')),
                  React.createElement("div", { className: "mt-3 rounded-xl border border-orange-300/60 bg-white/70 p-3" },
                    React.createElement("p", { className: "text-[11px] font-black text-orange-950" }, __alloT('stem.galaxy.two_views_title', 'Two views of time and light')),
                    React.createElement("div", { className: "mt-2 space-y-2", "aria-hidden": true },
                      React.createElement("div", null,
                        React.createElement("div", { className: "flex justify-between gap-2 text-[11px] font-bold text-slate-700" }, React.createElement("span", null, __alloT('stem.galaxy.bh_traveler_clock', "Traveler's local clock")), React.createElement("span", null, __alloT('stem.galaxy.bh_steady', 'steady'))),
                        React.createElement("div", { className: "mt-1 h-2 overflow-hidden rounded-full bg-slate-200" }, React.createElement("div", { className: "h-full w-full rounded-full bg-indigo-500" }))),
                      React.createElement("div", null,
                        React.createElement("div", { className: "flex justify-between gap-2 text-[11px] font-bold text-slate-700" }, React.createElement("span", { id: "black-hole-signal-label" }, "Distant received signal: 100%"), React.createElement("span", null, __alloT('stem.galaxy.bh_delayed_redshifted', 'delayed + redshifted'))),
                        React.createElement("div", { className: "mt-1 h-2 overflow-hidden rounded-full bg-slate-200" }, React.createElement("div", { id: "black-hole-signal-bar", className: "h-full w-full rounded-full bg-sky-400 transition-all duration-300" })))
                    ),
                    React.createElement("p", { className: "mt-2 text-[11px] leading-relaxed text-orange-900" }, __alloT('stem.galaxy.bh_observer_view_desc', 'Illustrative observer view: the traveler experiences their own clock normally, while a distant observer receives increasingly delayed and redshifted light signals.'))
                  ),                  React.createElement("label", { htmlFor: "black-hole-object", className: "mt-3 block text-[11px] font-bold text-orange-950" }, __alloT('stem.galaxy.bh_object_label', 'Object')),
                  React.createElement("select", { id: "black-hole-object", value: blackHoleDropObject, onChange: function(e){upd('blackHoleDropObject',e.target.value);}, className: "mt-1 w-full rounded-lg border border-orange-300 bg-white px-2 py-2 text-xs text-slate-900" },
                    React.createElement("option", { value: "probe" }, __alloT('stem.galaxy.bh_obj_probe', 'Space probe')), React.createElement("option", { value: "astronaut" }, __alloT('stem.galaxy.bh_obj_astronaut', 'Astronaut model')), React.createElement("option", { value: "star" }, __alloT('stem.galaxy.bh_obj_star', 'Star'))),
                  React.createElement("label", { htmlFor: "black-hole-mass", className: "mt-3 block text-[11px] font-bold text-orange-950" }, __alloT('stem.galaxy.bh_mass_label', 'Black hole mass')),
                  React.createElement("select", { id: "black-hole-mass", value: blackHoleMassMode, onChange: function(e){upd('blackHoleMassMode',e.target.value);}, className: "mt-1 w-full rounded-lg border border-orange-300 bg-white px-2 py-2 text-xs text-slate-900", "aria-describedby": "black-hole-mass-note" },
                    React.createElement("option", { value: "stellar" }, __alloT('stem.galaxy.bh_mass_stellar', 'Stellar-mass')), React.createElement("option", { value: "supermassive" }, __alloT('stem.galaxy.bh_mass_supermassive', 'Supermassive'))),
                  React.createElement("p", { id: "black-hole-mass-note", className: "mt-1 text-[11px] leading-relaxed text-orange-900" }, blackHoleMassMode==='stellar'?__alloT('stem.galaxy.bh_mass_note_stellar', 'Stronger tidal gradient: disruption begins farther outside the horizon.'):__alloT('stem.galaxy.bh_mass_note_supermassive', 'Gentler at the horizon: a compact object can cross before extreme stretching develops.')),
                  React.createElement("button", { type: "button", className: "mt-3 w-full rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold text-white hover:bg-orange-800", onClick: function(){var cv=document.querySelector('[data-black-hole-canvas]');if(cv&&cv._dropIntoBlackHole)cv._dropIntoBlackHole(blackHoleDropObject,blackHoleMassMode);}, "aria-describedby": "black-hole-drop-help" }, __alloT('stem.galaxy.bh_drop_btn', 'Drop object into black hole'))
                ),
                React.createElement("div", { className: "rounded-2xl border border-violet-200 bg-violet-50 p-4" },
                  React.createElement("h4", { className: "text-sm font-black text-violet-900" }, __alloT('stem.galaxy.bh_what_seeing_title', 'What you are seeing')),
                  React.createElement("ul", { className: "mt-2 space-y-2 text-[11px] leading-relaxed text-violet-950" },
                    React.createElement("li", null, React.createElement("strong", null, __alloT('stem.galaxy.bh_li_event_horizon_label', 'Event horizon:')), __alloT('stem.galaxy.bh_li_event_horizon_text', ' the boundary beyond which light cannot escape.')),
                    React.createElement("li", null, React.createElement("strong", null, __alloT('stem.galaxy.bh_li_photon_ring_label', 'Photon ring:')), __alloT('stem.galaxy.bh_li_photon_ring_text', ' light bent into repeated paths around the shadow.')),
                    React.createElement("li", null, React.createElement("strong", null, __alloT('stem.galaxy.bh_li_doppler_label', 'Doppler beaming:')), __alloT('stem.galaxy.bh_li_doppler_text', ' the disk side moving toward us appears brighter.')),
                    React.createElement("li", null, React.createElement("strong", null, __alloT('stem.galaxy.bh_li_jets_label', 'Jets:')), __alloT('stem.galaxy.bh_li_jets_text', ' energized matter guided away from the disk along magnetic poles.')))
                )
              ),
              React.createElement("section", { className: "lg:col-span-2 overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 text-slate-100 shadow-xl", role: "region", "aria-labelledby": "black-hole-evidence-title" },
                React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-2" },
                  React.createElement("div", null,
                    React.createElement("h4", { id: "black-hole-evidence-title", className: "text-sm font-black text-cyan-100" }, __alloT('stem.galaxy.bh_evidence_title', 'What is a black hole - and what might be inside?')),
                    React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_evidence_desc', 'The event horizon is an evidence boundary: outside effects can reach us; information from inside cannot.'))),
                  React.createElement("span", { className: "rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-[11px] font-bold text-cyan-100" }, __alloT('stem.galaxy.bh_evidence_map_badge', 'Evidence map'))
                ),
                React.createElement("div", { className: "mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_150px_1fr]" },
                  React.createElement("div", { className: "rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-emerald-200" }, __alloT('stem.galaxy.bh_outside_title', 'Outside - observable')),
                    React.createElement("ul", { className: "mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-200" },
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li1', 'Bright shadow and photon-ring structure')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li2', 'Fast stellar orbits, hot gas, and X-rays')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li3', 'Gravitational waves from black-hole mergers')))
                  ),
                  React.createElement("div", { className: "mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.24)]", "aria-hidden": true },
                    React.createElement("div", { className: "flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-200/70 bg-gradient-to-br from-orange-400/30 via-indigo-500/20 to-black shadow-[0_0_24px_rgba(251,191,36,0.36)]" },
                      React.createElement("div", { className: "flex h-20 w-20 items-center justify-center rounded-full border border-violet-300/40 bg-black text-center text-[11px] font-black text-violet-200" }, "EVENT", React.createElement("br"), "HORIZON"))
                  ),
                  React.createElement("div", { className: "rounded-xl border border-violet-300/25 bg-violet-300/10 p-3" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-violet-200" }, __alloT('stem.galaxy.bh_inside_title', 'Inside - causally hidden')),
                    React.createElement("ul", { className: "mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-200" },
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li1', 'General relativity predicts continued collapse')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li2', "Its singularity may mark the theory's limit")),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li3', 'No outside observer can receive an interior signal')))
                  )
                ),
                React.createElement("div", { className: "mt-4 grid grid-cols-1 gap-2 md:grid-cols-3" },
                  React.createElement("div", { className: "rounded-xl border border-sky-300/20 bg-sky-300/10 p-3" }, React.createElement("p", { className: "text-[11px] font-black text-sky-200" }, __alloT('stem.galaxy.bh_supported_title', 'Strongly supported')), React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_supported_desc', 'Horizons, curved light paths, accretion, and mergers match observations and relativity.'))),
                  React.createElement("div", { className: "rounded-xl border border-amber-300/20 bg-amber-300/10 p-3" }, React.createElement("p", { className: "text-[11px] font-black text-amber-200" }, __alloT('stem.galaxy.bh_predicted_title', 'Predicted, not directly seen')), React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_predicted_desc', 'A classical singularity and extremely slow Hawking evaporation remain theoretical.'))),
                  React.createElement("div", { className: "rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-3" }, React.createElement("p", { className: "text-[11px] font-black text-fuchsia-200" }, __alloT('stem.galaxy.bh_speculative_title', 'Speculative ideas')), React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_speculative_desc', 'Quantum cores, fuzzballs, firewalls, wormholes, and white holes are hypotheses - not established destinations.')))
                ),
                React.createElement("div", { className: "mt-4 border-t border-cyan-200/15 pt-4" },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-cyan-200" }, __alloT('stem.galaxy.bh_lifecycle_title', 'Black-hole life cycle')),
                  React.createElement("ol", { className: "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5", "aria-label": __alloT('stem.galaxy.aria_bh_lifecycle', "Possible stages in a black hole's history") },
                    [
                      { icon: '\u2605', title: __alloT('stem.galaxy.bh_stage_formation_title', 'Formation'), text: __alloT('stem.galaxy.bh_stage_formation_text', 'Massive-star collapse or growth of an earlier compact seed.'), color: 'border-blue-300/25 bg-blue-300/10 text-blue-100' },
                      { icon: '\u224b', title: __alloT('stem.galaxy.bh_stage_feeding_title', 'Active feeding'), text: __alloT('stem.galaxy.bh_stage_feeding_text', 'Hot accretion, flares, and sometimes enormous particle jets.'), color: 'border-orange-300/25 bg-orange-300/10 text-orange-100' },
                      { icon: '\u25cf', title: __alloT('stem.galaxy.bh_stage_quiet_title', 'Quiet phase'), text: __alloT('stem.galaxy.bh_stage_quiet_text', 'The disk can fade; gravity still reveals the hidden mass.'), color: 'border-slate-300/25 bg-slate-300/10 text-slate-100' },
                      { icon: '\u223f', title: __alloT('stem.galaxy.bh_stage_merger_title', 'Merger'), text: __alloT('stem.galaxy.bh_stage_merger_text', 'Two black holes combine and send gravitational waves outward.'), color: 'border-violet-300/25 bg-violet-300/10 text-violet-100' },
                      { icon: '\u2726', title: __alloT('stem.galaxy.bh_stage_future_title', 'Far future?'), text: __alloT('stem.galaxy.bh_stage_future_text', 'Hawking evaporation is predicted, but has not been observed.'), color: 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100' }
                    ].map(function(stage, index){ return React.createElement("li", { key: stage.title, className: "relative rounded-xl border p-3 " + stage.color },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/25 bg-black/25 text-sm", "aria-hidden": true }, stage.icon),
                        React.createElement("span", { className: "text-[11px] font-black" }, (index + 1) + ". " + stage.title)),
                      React.createElement("p", { className: "mt-2 text-[11px] leading-relaxed text-slate-300" }, stage.text)); })
                  )
                ),
                React.createElement("p", { className: "mt-3 text-[11px] leading-relaxed text-cyan-100" }, __alloT('stem.galaxy.bh_lifecycle_note', 'A black hole is not necessarily active forever: its surroundings can brighten, quiet down, and brighten again as matter becomes available.'))
              )
            ),
            !d.quizMode && simMode === 'star' && React.createElement("div", { className: "animate-in fade-in duration-300", style: { display: "flex", gap: "16px", alignItems: "stretch" } },



              // ── RIGHT COLUMN: Star Visualization (sticky) ──

              React.createElement("div", { style: { flex: "1 1 65%", position: "sticky", top: "16px", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "16px", order: 2, minHeight: "520px" } },



              // ── Animated Star Canvas ──

              React.createElement("div", { className: "w-full flex-1 relative rounded-2xl overflow-hidden border-2 border-indigo-300/30 bg-[#020210] shadow-2xl shadow-indigo-500/10", style: { flex: '1 1 auto', minHeight: '520px', position: 'relative' } },

                React.createElement("canvas", {

                  "data-star-life-canvas": "true",
                  role: "img",
                  "aria-label": __alloT('stem.galaxy.aria_star_canvas', 'Animated star lifecycle visualization showing the selected mass and evolutionary stage, including red dwarf, main sequence, supernova, neutron star, and black hole outcomes.'),

                  ref: function (cvEl) {
                    if (!cvEl) return;
                    cvEl._stellarMass = lifecycleMass;
                    cvEl._stellarStage = activeStage;

                    if (cvEl._starLifeInit) return;

                    cvEl._starLifeInit = true;

                    var ctx = cvEl.getContext('2d');

                    var W = cvEl.offsetWidth, H = cvEl.offsetHeight;

                    cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);

                    var tick = 0;

                    function drawStar() {
                      // Stop + clean up once the canvas leaves the DOM (leaving Star-Life mode or the
                      // tool). Without this guard the rAF loop ran forever at 60fps against a detached
                      // canvas, and the ResizeObserver was never disconnected.
                      if (!cvEl.isConnected) {
                        try { cancelAnimationFrame(cvEl._starLifeAnim); } catch (e) {}
                        try { if (cvEl._starLifeRO) cvEl._starLifeRO.disconnect(); } catch (e) {}
                        return;
                      }
                      tick++;
                      ctx.clearRect(0, 0, W, H);
                      // Starfield background
                      ctx.fillStyle = '#020210';
                      ctx.fillRect(0, 0, W, H);
                      for (var si = 0; si < 120; si++) {
                        var sx = ((si * 137 + 29) % W);
                        var sy = ((si * 211 + 17) % H);
                        var sb = 0.15 + 0.35 * Math.sin(tick * 0.015 + si * 1.7);
                        ctx.globalAlpha = sb;
                        ctx.fillStyle = si % 7 === 0 ? '#aaccff' : si % 11 === 0 ? '#ffddaa' : '#fff';
                        var ssz = si % 13 === 0 ? 2 : 1;
                        ctx.fillRect(sx, sy, ssz, ssz);
                      }
                      ctx.globalAlpha = 1;

                      var mass = cvEl._stellarMass || 1;
                      var stage = cvEl._stellarStage || 'main_sequence';
                      var cx = W * 0.5, cy = H * 0.5;
                      var dim = Math.min(W, H);
                      var baseR = Math.max(dim * 0.10, Math.min(dim * 0.40, Math.pow(mass, 0.55) * (dim * 0.14)));

                      // Determine star color based on mass
                      var coreColor, glowColor, coronaColor;
                      if (mass < HYDROGEN_FUSION_LIMIT) { coreColor = '#d6a35c'; glowColor = '#8b5a2b'; coronaColor = '#9f7a4426'; }
                      else if (mass < M_DWARF_LIMIT) { coreColor = '#ffaa44'; glowColor = '#ff7722'; coronaColor = '#ff550033'; }
                      else if (mass < 0.8) { coreColor = '#ffcc6f'; glowColor = '#ff9944'; coronaColor = '#ff884422'; }
                      else if (mass < 1.04) { coreColor = '#fff8e8'; glowColor = '#ffe4a8'; coronaColor = '#ffdd6622'; }
                      else if (mass < 1.4) { coreColor = '#fff'; glowColor = '#f0f0ff'; coronaColor = '#dde4ff22'; }
                      else if (mass < 2.1) { coreColor = '#e8eeff'; glowColor = '#cad7ff'; coronaColor = '#aabbff22'; }
                      else if (mass < 16) { coreColor = '#d0ddff'; glowColor = '#aabfff'; coronaColor = '#8899ff33'; }
                      else { coreColor = '#c0ccff'; glowColor = '#9bb0ff'; coronaColor = '#7788ff44'; }

                      var stageLabel = '';

                      // ── NEBULA: diffuse gas cloud ──
                      if (stage === 'nebula') {
                        stageLabel = '\u2601\uFE0F Nebular Cloud';
                        for (var nc = 0; nc < 18; nc++) {
                          var na = (nc / 18) * Math.PI * 2 + tick * 0.003;
                          var nd = 30 + nc * 12 + 15 * Math.sin(tick * 0.008 + nc * 2);
                          var nx = cx + Math.cos(na) * nd;
                          var ny = cy + Math.sin(na) * nd;
                          var nr = 40 + 25 * Math.sin(tick * 0.01 + nc);
                          var ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
                          var ncols = ['#a855f766', '#818cf844', '#6366f133', '#f472b622'];
                          ng.addColorStop(0, ncols[nc % ncols.length]);
                          ng.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
                          ctx.fillStyle = ng; ctx.fill();
                        }
                        // Embedded protostars
                        for (var es = 0; es < 5; es++) {
                          var ea = (es / 5) * Math.PI * 2 + 0.5;
                          var ed = 20 + es * 18;
                          var ex = cx + Math.cos(ea) * ed;
                          var ey = cy + Math.sin(ea) * ed;
                          var eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 4);
                          eg.addColorStop(0, '#ffffffcc'); eg.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2);
                          ctx.fillStyle = eg; ctx.fill();
                        }
                      }

                      // ── PROTOSTAR: forming star with accretion disk ──
                      else if (stage === 'protostar') {
                        stageLabel = '\uD83D\uDFE0 Protostar';
                        var pr = baseR * 0.5;
                        var pp = 1 + 0.06 * Math.sin(tick * 0.06);
                        pr *= pp;
                        // Surrounding envelope
                        for (var pe = 0; pe < 10; pe++) {
                          var pea = (pe / 10) * Math.PI * 2 + tick * 0.005;
                          var ped = pr * 3 + pe * 8;
                          var pex = cx + Math.cos(pea) * ped * 0.8;
                          var pey = cy + Math.sin(pea) * ped * 0.5;
                          var peg = ctx.createRadialGradient(pex, pey, 0, pex, pey, 25);
                          peg.addColorStop(0, 'rgba(251,146,60,0.15)'); peg.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(pex, pey, 25, 0, Math.PI * 2);
                          ctx.fillStyle = peg; ctx.fill();
                        }
                        // Accretion disk
                        ctx.save();
                        ctx.translate(cx, cy); ctx.scale(1, 0.3);
                        var diskG = ctx.createRadialGradient(0, 0, pr * 0.8, 0, 0, pr * 4);
                        diskG.addColorStop(0, 'rgba(251,146,60,0.4)'); diskG.addColorStop(0.5, 'rgba(168,85,247,0.2)'); diskG.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(0, 0, pr * 4, 0, Math.PI * 2);
                        ctx.fillStyle = diskG; ctx.fill();
                        ctx.restore();
                        // Protostar body
                        var pbg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr);
                        pbg.addColorStop(0, '#ffffff'); pbg.addColorStop(0.4, '#ffcc6f'); pbg.addColorStop(1, '#fb923c');
                        ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2);
                        ctx.fillStyle = pbg; ctx.fill();
                        // Glow
                        var pgg = ctx.createRadialGradient(cx, cy, pr * 0.5, cx, cy, pr * 2);
                        pgg.addColorStop(0, 'rgba(251,146,60,0.3)'); pgg.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, pr * 2, 0, Math.PI * 2);
                        ctx.fillStyle = pgg; ctx.fill();
                      }

                      // ── RED GIANT: huge pulsing red-orange star ──
                      else if (stage === 'red_giant') {
                        stageLabel = '\uD83D\uDD34 Red Giant';
                        var rgR = baseR * 2.5;
                        var rgPulse = 1 + 0.08 * Math.sin(tick * 0.03) + 0.03 * Math.sin(tick * 0.07);
                        rgR *= rgPulse;
                        // Huge corona
                        var rgCorona = ctx.createRadialGradient(cx, cy, rgR * 0.3, cx, cy, rgR * 3);
                        rgCorona.addColorStop(0, 'rgba(239,68,68,0.25)'); rgCorona.addColorStop(0.5, 'rgba(239,68,68,0.08)'); rgCorona.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, rgR * 3, 0, Math.PI * 2);
                        ctx.fillStyle = rgCorona; ctx.fill();
                        // Body
                        var rgBody = ctx.createRadialGradient(cx - rgR * 0.1, cy - rgR * 0.1, rgR * 0.05, cx, cy, rgR);
                        rgBody.addColorStop(0, '#fff8e0'); rgBody.addColorStop(0.2, '#ffaa44'); rgBody.addColorStop(0.6, '#ef4444'); rgBody.addColorStop(1, '#991b1b');
                        ctx.beginPath(); ctx.arc(cx, cy, rgR, 0, Math.PI * 2);
                        ctx.fillStyle = rgBody; ctx.fill();
                        // Convection cells
                        for (var rc = 0; rc < 12; rc++) {
                          var rca = (rc / 12) * Math.PI * 2 + tick * 0.004;
                          var rcr = rgR * (0.3 + 0.3 * Math.sin(tick * 0.01 + rc));
                          var rcx = cx + Math.cos(rca) * rcr;
                          var rcy = cy + Math.sin(rca) * rcr;
                          var rcg = ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, rgR * 0.25);
                          rcg.addColorStop(0, 'rgba(255,200,100,0.12)'); rcg.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(rcx, rcy, rgR * 0.25, 0, Math.PI * 2);
                          ctx.fillStyle = rcg; ctx.fill();
                        }
                      }

                      // ── PLANETARY NEBULA: expanding ring + white dwarf ──
                      else if (stage === 'planetary_nebula') {
                        stageLabel = '\uD83D\uDFE3 Planetary Nebula';
                        var pnR = baseR * 0.15;
                        var ringR = baseR * 2 + 15 * Math.sin(tick * 0.015);
                        // Nebula rings
                        for (var pr2 = 0; pr2 < 4; pr2++) {
                          var rOff = pr2 * 15 + 5 * Math.sin(tick * 0.01 + pr2);
                          ctx.beginPath(); ctx.arc(cx, cy, ringR + rOff, 0, Math.PI * 2);
                          ctx.lineWidth = 12 - pr2 * 2;
                          var ringCols = ['rgba(129,140,248,0.35)', 'rgba(168,85,247,0.25)', 'rgba(236,72,153,0.2)', 'rgba(99,102,241,0.15)'];
                          ctx.strokeStyle = ringCols[pr2]; ctx.stroke();
                          // Fill glow
                          var prg = ctx.createRadialGradient(cx, cy, ringR + rOff - 10, cx, cy, ringR + rOff + 15);
                          prg.addColorStop(0, ringCols[pr2]); prg.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(cx, cy, ringR + rOff + 15, 0, Math.PI * 2);
                          ctx.fillStyle = prg; ctx.fill();
                        }
                        // Central white dwarf
                        var wdg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pnR);
                        wdg.addColorStop(0, '#ffffff'); wdg.addColorStop(0.5, '#e2e8f0'); wdg.addColorStop(1, '#94a3b8');
                        ctx.beginPath(); ctx.arc(cx, cy, pnR, 0, Math.PI * 2);
                        ctx.fillStyle = wdg; ctx.fill();
                        var wdglow = ctx.createRadialGradient(cx, cy, pnR * 0.5, cx, cy, pnR * 3);
                        wdglow.addColorStop(0, 'rgba(226,232,240,0.4)'); wdglow.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, pnR * 3, 0, Math.PI * 2);
                        ctx.fillStyle = wdglow; ctx.fill();
                      }

                      // ── WHITE DWARF: tiny dim star ──
                      else if (stage === 'white_dwarf') {
                        stageLabel = '\u26AA White Dwarf';
                        var wdr = baseR * 0.12;
                        var wdpulse = 1 + 0.01 * Math.sin(tick * 0.02);
                        wdr *= wdpulse;
                        // Faint glow
                        var wdgl = ctx.createRadialGradient(cx, cy, wdr, cx, cy, wdr * 8);
                        wdgl.addColorStop(0, 'rgba(226,232,240,0.2)'); wdgl.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, wdr * 8, 0, Math.PI * 2);
                        ctx.fillStyle = wdgl; ctx.fill();
                        // Body
                        var wdb = ctx.createRadialGradient(cx, cy, 0, cx, cy, wdr);
                        wdb.addColorStop(0, '#ffffff'); wdb.addColorStop(0.5, '#e2e8f0'); wdb.addColorStop(1, '#94a3b8');
                        ctx.beginPath(); ctx.arc(cx, cy, wdr, 0, Math.PI * 2);
                        ctx.fillStyle = wdb; ctx.fill();
                        // Size comparison text
                        ctx.font = '11px Inter, system-ui';
                        ctx.fillStyle = 'rgba(255,255,255,0.3)';
                        ctx.fillText('(Earth-sized)', cx, cy + wdr + 20);
                      }

                      // ── SUPERNOVA: explosive burst ──
                      else if (stage === 'supernova') {
                        stageLabel = '\uD83D\uDCA5 Supernova!';
                        var snPhase = (tick * 0.02) % (Math.PI * 2);
                        var snScale = 0.5 + 1.5 * Math.abs(Math.sin(snPhase));
                        // Shock waves
                        for (var sw = 0; sw < 6; sw++) {
                          var swR = (baseR * 1.5 + sw * 25) * snScale + 10 * Math.sin(tick * 0.03 + sw);
                          ctx.beginPath(); ctx.arc(cx, cy, swR, 0, Math.PI * 2);
                          ctx.lineWidth = 3 - sw * 0.4;
                          var swAlpha = Math.max(0.05, 0.4 - sw * 0.06);
                          ctx.strokeStyle = 'rgba(251,191,36,' + swAlpha + ')'; ctx.stroke();
                        }
                        // Explosion glow
                        var snG = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 3 * snScale);
                        snG.addColorStop(0, 'rgba(255,255,255,0.9)'); snG.addColorStop(0.15, 'rgba(251,191,36,0.6)');
                        snG.addColorStop(0.4, 'rgba(239,68,68,0.3)'); snG.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, baseR * 3 * snScale, 0, Math.PI * 2);
                        ctx.fillStyle = snG; ctx.fill();
                        // Ejecta rays
                        for (var ej = 0; ej < 12; ej++) {
                          var ejA = (ej / 12) * Math.PI * 2 + tick * 0.01;
                          var ejLen = (baseR * 2 + 30) * snScale;
                          ctx.beginPath(); ctx.moveTo(cx, cy);
                          ctx.lineTo(cx + Math.cos(ejA) * ejLen, cy + Math.sin(ejA) * ejLen);
                          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(251,191,36,0.15)'; ctx.stroke();
                        }
                        // Core flash
                        var cfl = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.5);
                        cfl.addColorStop(0, '#ffffff'); cfl.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2);
                        ctx.fillStyle = cfl; ctx.fill();
                      }

                      // ── NEUTRON STAR: tiny pulsar with beams ──
                      else if (stage === 'neutron_star') {
                        stageLabel = '\u2B50 Neutron Star (Pulsar)';
                        var nsR = baseR * 0.08;
                        // Rotating beams
                        var beamA = tick * 0.05;
                        for (var bi = 0; bi < 2; bi++) {
                          var ba = beamA + bi * Math.PI;
                          ctx.save(); ctx.translate(cx, cy); ctx.rotate(ba);
                          var beamG = ctx.createLinearGradient(0, 0, W * 0.4, 0);
                          beamG.addColorStop(0, 'rgba(56,189,248,0.5)'); beamG.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(W * 0.4, -15); ctx.lineTo(W * 0.4, 15); ctx.lineTo(0, 3); ctx.closePath();
                          ctx.fillStyle = beamG; ctx.fill();
                          ctx.restore();
                        }
                        // Magnetosphere
                        ctx.beginPath(); ctx.arc(cx, cy, nsR * 12, 0, Math.PI * 2);
                        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(56,189,248,0.15)'; ctx.stroke();
                        // Body
                        var nsb = ctx.createRadialGradient(cx, cy, 0, cx, cy, nsR);
                        nsb.addColorStop(0, '#ffffff'); nsb.addColorStop(0.5, '#38bdf8'); nsb.addColorStop(1, '#0ea5e9');
                        ctx.beginPath(); ctx.arc(cx, cy, nsR, 0, Math.PI * 2);
                        ctx.fillStyle = nsb; ctx.fill();
                        // Intense glow
                        var nsg = ctx.createRadialGradient(cx, cy, nsR, cx, cy, nsR * 6);
                        nsg.addColorStop(0, 'rgba(56,189,248,0.4)'); nsg.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, nsR * 6, 0, Math.PI * 2);
                        ctx.fillStyle = nsg; ctx.fill();
                      }

                      // ── BLACK HOLE: dark sphere with accretion disk ──
                      else if (stage === 'black_hole') {
                        stageLabel = '\uD83D\uDD73\uFE0F Black Hole';
                        var bhR = baseR * 0.4;
                        // Accretion disk (behind)
                        ctx.save();
                        ctx.translate(cx, cy); ctx.scale(1, 0.25);
                        for (var ad = 0; ad < 5; ad++) {
                          var adR2 = bhR * (2.5 + ad * 0.8);
                          ctx.beginPath(); ctx.arc(0, 0, adR2, 0, Math.PI * 2);
                          ctx.lineWidth = 6 - ad;
                          var adCols = ['rgba(251,191,36,0.5)', 'rgba(249,115,22,0.4)', 'rgba(239,68,68,0.3)', 'rgba(168,85,247,0.2)', 'rgba(99,102,241,0.1)'];
                          ctx.strokeStyle = adCols[ad]; ctx.stroke();
                        }
                        ctx.restore();
                        // Gravitational lensing ring
                        ctx.beginPath(); ctx.arc(cx, cy, bhR * 1.3, 0, Math.PI * 2);
                        ctx.lineWidth = 3;
                        var lensG = ctx.createRadialGradient(cx, cy, bhR, cx, cy, bhR * 1.5);
                        lensG.addColorStop(0, 'rgba(251,191,36,0.6)'); lensG.addColorStop(1, 'transparent');
                        ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.stroke();
                        ctx.fillStyle = lensG; ctx.fill();
                        // Event horizon (pure black)
                        ctx.beginPath(); ctx.arc(cx, cy, bhR, 0, Math.PI * 2);
                        ctx.fillStyle = '#000000'; ctx.fill();
                        // Subtle edge highlight
                        ctx.beginPath(); ctx.arc(cx, cy, bhR, 0, Math.PI * 2);
                        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(251,191,36,0.3)'; ctx.stroke();
                        // Hawking radiation particles
                        for (var hr = 0; hr < 8; hr++) {
                          var hra = (hr / 8) * Math.PI * 2 + tick * 0.02;
                          var hrd = bhR * 1.3 + 3 * Math.sin(tick * 0.05 + hr);
                          var hrx = cx + Math.cos(hra) * hrd;
                          var hry = cy + Math.sin(hra) * hrd * 0.25;
                          ctx.globalAlpha = 0.3 + 0.3 * Math.sin(tick * 0.04 + hr);
                          ctx.fillStyle = '#fbbf24';
                          ctx.fillRect(hrx, hry, 1.5, 1.5);
                        }
                        ctx.globalAlpha = 1;
                      }

                      // ── BLACK DWARF: cold dead ember ──
                      else if (stage === 'black_dwarf') {
                        stageLabel = mass < HYDROGEN_FUSION_LIMIT ? '\u26AB Cooling Brown Dwarf' : '\u26AB Black Dwarf';
                        var bdR = baseR * 0.1;
                        // Faint deep purple/grey glow
                        var bdg = ctx.createRadialGradient(cx, cy, bdR, cx, cy, bdR * 3);
                        bdg.addColorStop(0, 'rgba(30,27,75,0.4)'); bdg.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, bdR * 3, 0, Math.PI * 2);
                        ctx.fillStyle = bdg; ctx.fill();
                        // Core
                        var bdc = ctx.createRadialGradient(cx, cy, 0, cx, cy, bdR);
                        bdc.addColorStop(0, '#312e81'); bdc.addColorStop(0.8, '#1e1b4b'); bdc.addColorStop(1, '#0f172a');
                        ctx.beginPath(); ctx.arc(cx, cy, bdR, 0, Math.PI * 2);
                        ctx.fillStyle = bdc; ctx.fill();
                      }

                      // ── BLUE DWARF: intensely hot tiny star ──
                      else if (stage === 'blue_dwarf') {
                        stageLabel = '🔵 Blue Dwarf';
                        var bldr = baseR * 0.4;
                        var bldPulse = 1 + 0.05 * Math.sin(tick * 0.1);
                        bldr *= bldPulse;
                        var bldg = ctx.createRadialGradient(cx, cy, bldr, cx, cy, bldr * 4);
                        bldg.addColorStop(0, 'rgba(59,130,246,0.6)'); bldg.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, bldr * 4, 0, Math.PI * 2);
                        ctx.fillStyle = bldg; ctx.fill();
                        var bldc = ctx.createRadialGradient(cx, cy, 0, cx, cy, bldr);
                        bldc.addColorStop(0, '#ffffff'); bldc.addColorStop(0.4, '#93c5fd'); bldc.addColorStop(1, '#3b82f6');
                        ctx.beginPath(); ctx.arc(cx, cy, bldr, 0, Math.PI * 2);
                        ctx.fillStyle = bldc; ctx.fill();
                      }

                      // ── RED SUPERGIANT: extremely massive, turbulent ──
                      else if (stage === 'red_supergiant') {
                        stageLabel = '🔴 Red Supergiant';
                        var rsR = baseR * 3.5;
                        var rsPulse = 1 + 0.15 * Math.sin(tick * 0.02) + 0.05 * Math.sin(tick * 0.05);
                        rsR *= rsPulse;
                        // Massive violent corona
                        var rsCorona = ctx.createRadialGradient(cx, cy, rsR * 0.4, cx, cy, rsR * 2.5);
                        rsCorona.addColorStop(0, 'rgba(220,38,38,0.4)'); rsCorona.addColorStop(0.5, 'rgba(153,27,27,0.1)'); rsCorona.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, rsR * 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = rsCorona; ctx.fill();
                        // Deep crimson body
                        var rsBody = ctx.createRadialGradient(cx - rsR * 0.2, cy - rsR * 0.2, rsR * 0.1, cx, cy, rsR);
                        rsBody.addColorStop(0, '#fcd34d'); rsBody.addColorStop(0.2, '#f59e0b'); rsBody.addColorStop(0.6, '#b91c1c'); rsBody.addColorStop(1, '#7f1d1d');
                        ctx.beginPath(); ctx.arc(cx, cy, rsR, 0, Math.PI * 2);
                        ctx.fillStyle = rsBody; ctx.fill();
                        // Giant convection cells
                        for (var rsc = 0; rsc < 18; rsc++) {
                          var rsca = (rsc / 18) * Math.PI * 2 + tick * 0.002 + Math.sin(rsc);
                          var rscr = rsR * (0.2 + 0.6 * Math.sin(tick * 0.005 + rsc));
                          var rscx = cx + Math.cos(rsca) * rscr;
                          var rscy = cy + Math.sin(rsca) * rscr;
                          var rscg = ctx.createRadialGradient(rscx, rscy, 0, rscx, rscy, rsR * 0.35);
                          rscg.addColorStop(0, 'rgba(251,146,60,0.25)'); rscg.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(rscx, rscy, rsR * 0.35, 0, Math.PI * 2);
                          ctx.fillStyle = rscg; ctx.fill();
                        }
                      }

                      // ── BLUE SUPERGIANT: hyper-luminous, fast winds ──
                      else if (stage === 'blue_supergiant') {
                        stageLabel = '🔵 Blue Supergiant';
                        var bsR = baseR * 2.5;
                        var bsPulse = 1 + 0.02 * Math.sin(tick * 0.15);
                        bsR *= bsPulse;
                        // Intense ultraviolet halo
                        var bsHalo = ctx.createRadialGradient(cx, cy, bsR * 0.8, cx, cy, bsR * 4);
                        bsHalo.addColorStop(0, 'rgba(129,140,248,0.5)'); bsHalo.addColorStop(0.4, 'rgba(99,102,241,0.15)'); bsHalo.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, bsR * 4, 0, Math.PI * 2);
                        ctx.fillStyle = bsHalo; ctx.fill();
                        // Blinding core
                        var bsBody = ctx.createRadialGradient(cx, cy, 0, cx, cy, bsR);
                        bsBody.addColorStop(0, '#ffffff'); bsBody.addColorStop(0.3, '#e0e7ff'); bsBody.addColorStop(0.8, '#818cf8'); bsBody.addColorStop(1, '#4f46e5');
                        ctx.beginPath(); ctx.arc(cx, cy, bsR, 0, Math.PI * 2);
                        ctx.fillStyle = bsBody; ctx.fill();
                        // Violent stellar winds (fast particles)
                        for (var bsw = 0; bsw < 25; bsw++) {
                           var bswa = (bsw / 25) * Math.PI * 2 + tick * 0.05;
                           var bswd = bsR + (tick * 2 + bsw * 15) % (bsR * 2.5);
                           var bswx = cx + Math.cos(bswa) * bswd;
                           var bswy = cy + Math.sin(bswa) * bswd;
                           ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - (bswd - bsR)/(bsR * 2.5)) + ')';
                           ctx.fillRect(bswx, bswy, 2, 2);
                        }
                      }

                      // ── MAIN SEQUENCE (default): normal star ──
                      else {
                        stageLabel = '⭐ Main Sequence';
                        var msR = baseR;
                        var msPulse = 1 + 0.03 * Math.sin(tick * 0.04);
                        msR *= msPulse;
                        // Corona
                        var msCorona = ctx.createRadialGradient(cx, cy, msR * 0.5, cx, cy, msR * 3.5);
                        msCorona.addColorStop(0, coronaColor); msCorona.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, msR * 3.5, 0, Math.PI * 2);
                        ctx.fillStyle = msCorona; ctx.fill();
                        // Glow
                        var msGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, msR * 1.8);
                        msGlow.addColorStop(0, glowColor); msGlow.addColorStop(0.4, glowColor + '88'); msGlow.addColorStop(1, 'transparent');
                        ctx.beginPath(); ctx.arc(cx, cy, msR * 1.8, 0, Math.PI * 2);
                        ctx.fillStyle = msGlow; ctx.fill();
                        // Body
                        var msBody = ctx.createRadialGradient(cx - msR * 0.15, cy - msR * 0.15, msR * 0.1, cx, cy, msR);
                        msBody.addColorStop(0, '#ffffff'); msBody.addColorStop(0.3, coreColor); msBody.addColorStop(1, glowColor);
                        ctx.beginPath(); ctx.arc(cx, cy, msR, 0, Math.PI * 2);
                        ctx.fillStyle = msBody; ctx.fill();
                        // Surface noise
                        for (var sp = 0; sp < 6; sp++) {
                          var spAngle = (sp / 6) * Math.PI * 2 + tick * 0.005;
                          var spR2 = msR * 0.6;
                          var spx = cx + Math.cos(spAngle) * spR2;
                          var spy = cy + Math.sin(spAngle) * spR2;
                          var spotG = ctx.createRadialGradient(spx, spy, 0, spx, spy, msR * 0.3);
                          spotG.addColorStop(0, 'rgba(255,255,255,0.08)'); spotG.addColorStop(1, 'transparent');
                          ctx.beginPath(); ctx.arc(spx, spy, msR * 0.3, 0, Math.PI * 2);
                          ctx.fillStyle = spotG; ctx.fill();
                        }
                      }

                      // ── HUD Labels + Physical Properties ──
                      ctx.textAlign = 'center';
                      // Stage name (top)
                      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.8)';
                      ctx.fillText(stageLabel, cx, 22);
                      // Classification
                      var cls = mass < HYDROGEN_FUSION_LIMIT ? 'Brown dwarf (substellar)' : mass < M_DWARF_LIMIT ? 'M-type Red Dwarf' : mass < 0.8 ? 'K-type Orange' : mass < 1.04 ? 'G-type (Sun-like)' : mass < 1.4 ? 'F-type Yellow-White' : mass < 2.1 ? 'A-type White' : mass < 16 ? 'B-type Blue-White' : 'O-type Blue Giant';
                      ctx.font = '10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.45)';
                      ctx.fillText(cls, cx, 36);

                      // ── Physical properties panel (bottom center) ──
                      var surfTemp = mass < HYDROGEN_FUSION_LIMIT ? 1800 : mass < M_DWARF_LIMIT ? 3200 : mass < 0.8 ? 4500 : mass < 1.04 ? 5778 : mass < 1.4 ? 6500 : mass < 2.1 ? 8500 : mass < 16 ? 20000 : 40000;
                      var luminosity = Math.pow(mass, 3.5);
                      var radius = mass < 0.8 ? Math.pow(mass, 0.8) : mass < 2 ? Math.pow(mass, 0.57) : Math.pow(mass, 0.78);
                      var lifetime = mass < 0.2 ? '>100' : (10 / Math.pow(mass, 2.5)).toFixed(mass < 1 ? 0 : 1);
                      var lifetimeText = mass < HYDROGEN_FUSION_LIMIT ? 'No sustained hydrogen fusion' : 'Lifespan: ' + lifetime + ' billion years';
                      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.55)';
                      ctx.fillText(mass + ' Solar Masses', cx, H - 40);
                      ctx.font = '9px monospace';
                      ctx.fillStyle = 'rgba(255,255,255,0.35)';
                      ctx.fillText('T: ' + surfTemp.toLocaleString() + ' K  |  L: ' + (luminosity < 100 ? luminosity.toFixed(1) : Math.round(luminosity).toLocaleString()) + ' L\u2609  |  R: ' + radius.toFixed(2) + ' R\u2609', cx, H - 26);
                      ctx.fillText(lifetimeText, cx, H - 14);

                      // ── Radiative/Convective zone indicators (on main sequence stars) ──
                      if (stage === 'main_sequence' || stage === 'protostar') {
                        ctx.save(); ctx.globalAlpha = 0.12;
                        // Inner radiative zone ring
                        var rzR = baseR * 0.5;
                        ctx.beginPath(); ctx.arc(cx, cy, rzR, 0, Math.PI * 2);
                        ctx.setLineDash([2, 3]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.setLineDash([]);
                        // Outer convective zone ring
                        ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.85, 0, Math.PI * 2);
                        ctx.setLineDash([3, 2]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.6; ctx.stroke(); ctx.setLineDash([]);
                        ctx.restore();
                        // Zone labels (left side)
                        ctx.save(); ctx.globalAlpha = 0.2;
                        ctx.font = '6px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#fbbf24';
                        ctx.fillText('Radiative', cx - rzR - 4, cy - 2);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillText('Convective', cx - baseR * 0.85 - 4, cy + 8);
                        ctx.restore();
                      }

                      // ── Solar wind particles (emanating outward from star) ──
                      if (stage === 'main_sequence' || stage === 'red_giant' || stage === 'blue_supergiant') {
                        ctx.save(); ctx.globalAlpha = 0.15;
                        for (var swi = 0; swi < 12; swi++) {
                          var swAngle = (swi / 12) * Math.PI * 2 + tick * 0.003;
                          var swDist = baseR * 1.5 + (tick * 0.5 + swi * 30) % (dim * 0.4);
                          var swx = cx + Math.cos(swAngle) * swDist;
                          var swy = cy + Math.sin(swAngle) * swDist;
                          if (swx > 0 && swx < W && swy > 0 && swy < H) {
                            ctx.beginPath(); ctx.arc(swx, swy, 1, 0, Math.PI * 2);
                            ctx.fillStyle = glowColor; ctx.fill();
                          }
                        }
                        ctx.restore();
                      }

                      // ── Size comparison reference (bottom-left) ──
                      ctx.save(); ctx.globalAlpha = 0.25;
                      ctx.font = '7px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8';
                      var sunRefR = dim * 0.14; // reference: what 1 solar mass looks like
                      if (mass !== 1 && stage === 'main_sequence') {
                        ctx.fillText('Sun (1 M\u2609)', 12, H - 50);
                        ctx.beginPath(); ctx.arc(12 + sunRefR * 0.3, H - 60, sunRefR * 0.3, 0, Math.PI * 2);
                        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.5; ctx.setLineDash([1, 2]); ctx.stroke(); ctx.setLineDash([]);
                      }
                      ctx.restore();



                      cvEl._starLifeAnim = requestAnimationFrame(drawStar);

                    };

                    drawStar();

                    var ro = new ResizeObserver(function () {

                      W = cvEl.offsetWidth; H = cvEl.offsetHeight;

                      cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);

                    });

                    ro.observe(cvEl);
                    cvEl._starLifeRO = ro;

                  },

                  style: { width: '100%', height: '100%' }

                }),

                // ── Snapshot button (overlay, bottom-right of canvas) ──
                React.createElement("button", { "aria-label": __alloT('stem.galaxy.snapshot', 'Snapshot'), onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sl-' + Date.now(), tool: 'galaxy', label: 'Star Life: ' + lifecycleMass + ' M\u2609', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Star life snapshot saved!', 'success'); }, className: "px-3 py-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all", style: { position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 } }, "\uD83D\uDCF8 Snapshot")

              )

              ), // end right column



              // ── LEFT COLUMN: Controls & Timeline ──

              React.createElement("div", { style: { flex: "0 0 38%", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", order: 1 } },



              // ── Mass Selector Hero ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border-2 border-indigo-400/40 p-5 shadow-xl" },

                React.createElement("div", { className: "flex items-center gap-3 mb-4" },

                  React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg" }, "\u2B50"),

                  React.createElement("div", null,

                    React.createElement("h4", { className: "text-sm font-bold text-white" }, __alloT('stem.galaxy.star_mass_class_title', 'Star Mass & Classification')),

                    React.createElement("p", { className: "text-[11px] text-slate-300" }, __alloT('stem.galaxy.star_mass_class_sub', 'Adjust mass to explore how different stars live and die'))

                  ),

                  React.createElement("div", { className: "ml-auto px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40" },

                    React.createElement("span", { className: "text-sm font-black text-amber-300" }, lifecycleMass + " M\u2609")

                  )

                ),

                React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                  React.createElement("span", { className: "text-[11px] text-amber-300/70 whitespace-nowrap w-8" }, "0.03"),

                  React.createElement("input", {

                    type: "range", min: 0.03, max: 50, step: 0.01, value: lifecycleMass, "aria-label": __alloT('stem.galaxy.aria_star_mass', 'Star or brown dwarf mass in solar masses'),

                    onChange: function (e) {
                      var massVal = parseFloat(e.target.value);
                      upd("lifecycleMass", massVal);
                      // Canvas Narration: star mass change
                      if (typeof canvasNarrate === 'function') {
                        var cat = lifecycleMassCategory(massVal);
                        canvasNarrate('galaxy', 'starMass', cat + ' at ' + massVal + ' solar masses', { debounce: 800 });
                      }
                    },

                    className: "flex-1 h-2 accent-amber-400 cursor-pointer"

                  }),

                  React.createElement("span", { className: "text-[11px] text-amber-300/70 whitespace-nowrap w-8 text-right" }, "50")

                ),

                // Mass category badge

                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },

                  React.createElement("span", {

                    className: "px-3 py-1 rounded-full text-[11px] font-bold " + lifecycleMassBadgeClass(lifecycleMass)

                  },

                    lifecycleMass < HYDROGEN_FUSION_LIMIT ? "\uD83E\uDEA8 " + __alloT('stem.galaxy.masscat_brown_dwarf', 'Brown Dwarf') :
                      lifecycleMass < M_DWARF_LIMIT ? "\uD83D\uDD34 " + __alloT('stem.galaxy.masscat_red_dwarf', 'Red Dwarf (M-type)') :
                        lifecycleMass < 0.8 ? "\uD83D\uDFE0 " + __alloT('stem.galaxy.masscat_orange_dwarf', 'Orange Dwarf (K-type)') :
                          lifecycleMass < 1.04 ? "\u2600\uFE0F " + __alloT('stem.galaxy.masscat_sunlike', 'Sun-like (G-type)') :
                            lifecycleMass < 2.1 ? "\uD83D\uDD35 " + __alloT('stem.galaxy.masscat_hot_ms', 'Hot Main-Sequence Star') :
                              lifecycleMass < 8 ? "\uD83D\uDD35 " + __alloT('stem.galaxy.masscat_b_type', 'Bright B-type Star') :
                                lifecycleMass < 25 ? "\uD83D\uDCA5 " + __alloT('stem.galaxy.masscat_massive', 'Massive Star') :
                                  "\uD83D\uDD73\uFE0F " + __alloT('stem.galaxy.masscat_very_massive', 'Very Massive Star')

                  ),

                  React.createElement("span", { className: "text-[11px] text-slate-300 italic" },

                    lifecycleMassHint(lifecycleMass)

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-4" },
                  [
                    { key: 'browndwarf', label: "\uD83E\uDEA8 " + __alloT('stem.galaxy.masspath_browndwarf_label', 'Brown-dwarf path'), sub: "0.05 M\u2609 substellar", mass: 0.05, stage: 'main_sequence', border: 'rgba(161,98,7,0.55)', bg: 'rgba(161,98,7,0.14)', text: '#fde68a' },
                    { key: 'reddwarf', label: "\uD83D\uDD34 " + __alloT('stem.galaxy.masspath_reddwarf_label', 'Red-dwarf future'), sub: "0.2 M\u2609 blue-dwarf phase", mass: 0.2, stage: 'blue_dwarf', border: 'rgba(96,165,250,0.55)', bg: 'rgba(59,130,246,0.12)', text: '#bfdbfe' },
                    { key: 'supernova', label: "\uD83D\uDCA5 " + __alloT('stem.galaxy.masspath_supernova_label', 'Supernova path'), sub: "12 M\u2609 core collapse", mass: 12, stage: 'supernova', border: 'rgba(251,191,36,0.55)', bg: 'rgba(251,191,36,0.12)', text: '#fde68a' },
                    { key: 'blackhole', label: "\uD83D\uDD73\uFE0F " + __alloT('stem.galaxy.masspath_blackhole_label', 'Black-hole path'), sub: "30 M\u2609 remnant", mass: 30, stage: 'black_hole', border: 'rgba(168,85,247,0.55)', bg: 'rgba(168,85,247,0.14)', text: '#ddd6fe' }
                  ].map(function (path) {
                    return React.createElement("button", {
                      key: path.key,
                      type: "button",
                      "aria-pressed": (Math.abs(lifecycleMass - path.mass) < 0.001 && activeStage === path.stage) ? "true" : "false",
                      "aria-label": "Show " + path.label.replace(/^[^\s]+\s/, '') + " at " + path.mass + " solar masses",
                      onClick: function () {
                        patchGalaxy({ quizMode: false, simMode: "star", showLifecycle: true, lifecycleMass: path.mass, activeStage: path.stage });
                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'lifePathPreset', path.label.replace(/^[^\s]+\s/, '') + " selected at " + path.mass + " solar masses.", { debounce: 500 });
                        if (typeof awardStemXP === 'function') awardStemXP('galaxy_life_path', 2, 'Explored ' + path.label.replace(/^[^\s]+\s/, ''));
                      },
                      className: "text-left rounded-xl border px-3 py-2 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-300",
                      style: { borderColor: path.border, background: path.bg }
                    },
                      React.createElement("span", { className: "block text-[11px] font-black leading-tight", style: { color: path.text } }, path.label),
                      React.createElement("span", { className: "block text-[10px] text-slate-300 mt-0.5" }, path.sub)
                    );
                  })

                )

              ),



              // ── Lifecycle Flowchart ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },

                React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                  React.createElement("h4", { className: "text-sm font-bold text-white" }, "\u2728 " + __alloT('stem.galaxy.lifecycle_journey_title', 'Stellar Lifecycle Journey')),

                  React.createElement("span", { className: "ml-auto text-[11px] text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/50" },

                    lifecycleMass < 8 ? "\u2193 " + __alloT('stem.galaxy.path_gentle', 'Gentle path') : "\u2193 " + __alloT('stem.galaxy.path_violent', 'Violent path'))

                ),

                // Dynamic stages
                React.createElement("div", { className: "space-y-1" },
                  getStagesForMass(lifecycleMass).map(function (s, idx, arr) {
                    var isActive = activeStage === s.id;
                    
                    // Identify if we need a branch indicator BEFORE this item
                    var showBranch = false;
                    var branchLabel = "", branchEmoji = "";
                    if (s.id === 'planetary_nebula') { showBranch = true; branchLabel = __alloT('stem.galaxy.branch_gentle_death', 'Gentle death \u2014 outer layers drift away'); branchEmoji = '\u2B07\uFE0F'; }
                    else if (s.id === 'supernova') { showBranch = true; branchLabel = __alloT('stem.galaxy.branch_violent_death', 'Violent death \u2014 core collapse!'); branchEmoji = '\uD83D\uDCA5'; }
                    else if (s.id === 'black_dwarf' && lifecycleMass < HYDROGEN_FUSION_LIMIT) { showBranch = true; branchLabel = __alloT('stem.galaxy.branch_cooling', 'Cooling phase \u2014 fades slowly'); branchEmoji = '\u2B07\uFE0F'; }

                    var isDeathBranch = false;
                    if (s.id === 'planetary_nebula' || s.id === 'white_dwarf' || s.id === 'black_dwarf' || s.id === 'supernova' || s.id === 'neutron_star' || s.id === 'black_hole' || (s.id === 'blue_dwarf' && lifecycleMass < M_DWARF_LIMIT)) {
                       isDeathBranch = true;
                    }

                    return React.createElement("div", { key: s.id },
                      showBranch ? React.createElement("div", { className: "flex justify-center py-2" },
                        React.createElement("div", { className: "flex items-center gap-2 px-4 py-1 rounded-full border", style: { borderColor: lifecycleMass < 8 ? '#818cf855' : '#f59e0b55', background: lifecycleMass < 8 ? '#818cf815' : '#f59e0b15' } },
                          React.createElement("span", { className: "text-sm" }, branchEmoji),
                          React.createElement("span", { className: "text-[11px] font-bold", style: { color: lifecycleMass < 8 ? '#a5b4fc' : '#fbbf24' } }, branchLabel)
                        )
                      ) : null,

                      React.createElement("div", { role: "button", tabIndex: 0, "aria-pressed": isActive ? "true" : "false", "aria-label": "Select lifecycle stage: " + s.name + ". " + s.desc, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  onClick: function() {
                        upd('activeStage', s.id);
                        // Canvas Narration: lifecycle stage selection
                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'stageSelect', {
                          first: s.emoji + ' ' + s.name + '. ' + s.desc,
                          repeat: s.name + ' stage selected.',
                          terse: s.name
                        });
                      }, className: "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer " + (isDeathBranch ? "ml-6 " : "") + (isActive ? "scale-[1.03] ring-2 ring-offset-1 ring-amber-400 shadow-lg" : "hover:scale-[1.01]"), style: { borderColor: isActive ? s.color : s.color + '55', background: isActive ? s.color + '25' : s.color + '15' } },
                        React.createElement("div", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-xl flex-shrink-0", style: { background: s.color + '25' } }, s.emoji),
                        React.createElement("div", { className: "flex-1 min-w-0" },
                          React.createElement("p", { className: "text-[11px] font-bold leading-tight", style: { color: s.color } }, s.name),
                          React.createElement("p", { className: "text-[11px] text-slate-300 leading-tight" }, s.desc)
                        ),
                        React.createElement("span", { className: "text-[11px] text-slate-300 flex-shrink-0" },
                          s.id === 'nebula' ? "" :
                          s.id === 'protostar' ? "~100K yr" :
                          s.id === 'main_sequence' ? (lifecycleMass < HYDROGEN_FUSION_LIMIT ? "cools over time" : lifecycleMass < M_DWARF_LIMIT ? "~Trillions of yr" : lifecycleMass < 2 ? "~10 Gyr" : lifecycleMass < 8 ? "~1 Gyr" : lifecycleMass < 25 ? "~10 Myr" : "~3 Myr") :
                          s.id === 'red_giant' ? (lifecycleMass < 2 ? "~1 Gyr" : "~100 Myr") :
                          s.id === 'red_supergiant' || s.id === 'blue_supergiant' ? "~1 Myr" :
                          s.id === 'planetary_nebula' ? "~10,000 yr" :
                          s.id === 'supernova' ? "~Months" :
                          "Forever"
                        )
                      ),
                      
                      (idx < arr.length - 1 && !(arr[idx+1].id === 'planetary_nebula' || arr[idx+1].id === 'supernova' || (lifecycleMass < HYDROGEN_FUSION_LIMIT && arr[idx+1].id === 'black_dwarf'))) ?
                        React.createElement("div", { className: "flex justify-center py-0.5" },
                          React.createElement("div", { className: "w-0.5 h-3 rounded-full" + (isDeathBranch ? " ml-6" : ""), style: { background: 'linear-gradient(to bottom, ' + s.color + '60, ' + arr[idx + 1].color + '60)' } })
                        ) 
                      : null
                    );
                  })
                )

              ),



              // Core-collapse outcome panel
              (function () {
                var collapseState = lifecycleMass < HYDROGEN_FUSION_LIMIT ? {
                  title: 'No sustained stellar fusion',
                  badge: 'Substellar',
                  desc: 'A brown dwarf is below the hydrogen-fusion limit, so it cools and fades instead of becoming a white dwarf, neutron star, or black hole.',
                  accent: '#a16207',
                  final: 'Cooling brown dwarf'
                } : lifecycleMass < 8 ? {
                  title: 'No core-collapse supernova',
                  badge: 'Gentle ending',
                  desc: 'This star will shed outer layers and cool as a white dwarf instead of forming a neutron star or black hole.',
                  accent: '#818cf8',
                  final: 'White dwarf'
                } : lifecycleMass < 25 ? {
                  title: 'Core collapse makes a neutron star',
                  badge: '8-25 M\u2609',
                  desc: 'The iron core collapses, rebounds as a supernova shock, and leaves an ultra-dense neutron-star remnant.',
                  accent: '#38bdf8',
                  final: 'Neutron star'
                } : {
                  title: 'Core collapse can form a black hole',
                  badge: '25+ M\u2609',
                  desc: 'After the supernova, the remaining core is massive enough that gravity wins and an event horizon forms.',
                  accent: '#c084fc',
                  final: 'Black hole'
                };
                var collapseSteps = [
                  { label: 'Massive star', active: lifecycleMass >= 8, color: '#60a5fa' },
                  { label: 'Iron core collapse', active: lifecycleMass >= 8, color: '#f59e0b' },
                  { label: 'Supernova shock', active: lifecycleMass >= 8, color: '#fbbf24' },
                  { label: collapseState.final, active: true, color: collapseState.accent }
                ];
                return React.createElement("div", { className: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl border border-violet-400/30 p-4 shadow-lg" },
                  React.createElement("div", { className: "flex items-start gap-3" },
                    React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-lg border", style: { color: collapseState.accent, borderColor: collapseState.accent + '66', background: collapseState.accent + '18' } }, lifecycleMass < 8 ? "\u26AA" : lifecycleMass < 25 ? "\u2B50" : "\uD83D\uDD73\uFE0F"),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                        React.createElement("h4", { className: "text-sm font-bold text-white" }, collapseState.title),
                        React.createElement("span", { className: "text-[10px] font-black px-2 py-0.5 rounded-full border", style: { color: collapseState.accent, borderColor: collapseState.accent + '66', background: collapseState.accent + '16' } }, collapseState.badge)
                      ),
                      React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mt-1" }, collapseState.desc)
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                    collapseSteps.map(function (step, idx) {
                      return React.createElement("div", { key: step.label, className: "rounded-xl border px-2.5 py-2", style: { borderColor: step.active ? step.color + '66' : 'rgba(100,116,139,0.32)', background: step.active ? step.color + '14' : 'rgba(15,23,42,0.42)' } },
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black", style: { background: step.active ? step.color + '2b' : 'rgba(71,85,105,0.5)', color: step.active ? step.color : '#94a3b8' } }, idx + 1),
                          React.createElement("span", { className: "text-[11px] font-bold leading-tight", style: { color: step.active ? '#e2e8f0' : '#94a3b8' } }, step.label)
                        )
                      );
                    })
                  )
                );
              })(),


              // ── H-R Diagram — live map of the star's journey ──

              (function () {

                var HW = 340, HH = 250, hp = { l: 42, r: 12, t: 14, b: 34 };

                var xOf = function (T) { var f = (4.66 - Math.log10(T)) / (4.66 - 3.38); return hp.l + Math.max(0, Math.min(1, f)) * (HW - hp.l - hp.r); };

                var yOf = function (L) { var f = (6.2 - Math.log10(L)) / (6.2 + 4.2); return hp.t + Math.max(0, Math.min(1, f)) * (HH - hp.t - hp.b); };

                var mass = lifecycleMass;

                var msT = mass < HYDROGEN_FUSION_LIMIT ? 1800 : mass < M_DWARF_LIMIT ? 3200 : mass < 0.8 ? 4500 : mass < 1.04 ? 5778 : mass < 1.4 ? 6500 : mass < 2.1 ? 8500 : mass < 16 ? 20000 : 40000;

                var msL = Math.pow(mass, 3.5);
                var massNoun = mass < HYDROGEN_FUSION_LIMIT ? "object" : "star";

                var STAGE_HR = {

                  protostar: { T: 3800, L: Math.max(0.01, msL * 1.5), note: "sliding down the Hayashi track toward the main sequence" },

                  main_sequence: { T: msT, L: msL, note: mass < HYDROGEN_FUSION_LIMIT ? "a brown dwarf — below the sustained hydrogen-fusion limit" : "on the main sequence, where it spends ~90% of its life" },

                  red_giant: { T: 3600, L: Math.max(80, msL * 200), note: "climbing the giant branch — cooler but far more luminous" },

                  red_supergiant: { T: 3500, L: 120000, note: "top right — enormous, cool, and doomed" },

                  blue_supergiant: { T: 22000, L: 300000, note: "top left — hyper-luminous and shedding mass" },

                  blue_dwarf: { T: 8000, L: 0.02, note: "a theoretical late phase — no red dwarf has died yet" },

                  planetary_nebula: { T: 42000, L: 3000, note: "the exposed core dashes hot and left before fading" },

                  white_dwarf: { T: 12000, L: 0.003, note: "bottom left — white-hot but only Earth-sized" }

                };

                var OFF_CHART = {

                  nebula: "A nebula isn't a star yet — pick a later stage to see your star appear on the map.",

                  supernova: "💥 A supernova briefly outshines this entire chart — off the top by a factor of 10,000!",

                  neutron_star: "A neutron star no longer fuses anything — it has left the H-R diagram forever.",

                  black_hole: "A black hole emits no light at all — nothing to plot. The diagram only maps shining stars.",

                  black_dwarf: mass < HYDROGEN_FUSION_LIMIT ? "A cooling brown dwarf is faint and substellar — it fades below the main-sequence map." : "A black dwarf is a theoretical cooled white dwarf; the universe is not old enough for true black dwarfs yet."

                };

                var stages = getStagesForMass(mass);

                var trackPath = '';

                stages.forEach(function (s) {

                  var p = STAGE_HR[s.id];

                  if (!p) return;

                  trackPath += (trackPath ? 'L' : 'M') + xOf(p.T).toFixed(1) + ' ' + yOf(p.L).toFixed(1);

                });

                var cur = STAGE_HR[activeStage];

                // Main-sequence band: along the MS, L ≈ (T/5778)^6; band spans ×/÷ 6 in L

                var msBandTop = '', msBandBot = '';

                [45000, 20000, 12000, 8000, 6000, 4500, 3400, 2500].forEach(function (T, bi) {

                  var Lms = Math.pow(T / 5778, 6);

                  msBandTop += (bi ? 'L' : 'M') + xOf(T).toFixed(1) + ' ' + yOf(Lms * 6).toFixed(1);

                  msBandBot = 'L' + xOf(T).toFixed(1) + ' ' + yOf(Math.max(0.00008, Lms / 6)).toFixed(1) + msBandBot;

                });

                return React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },

                  React.createElement("h4", { className: "text-sm font-bold text-white mb-1 flex items-center gap-2" }, React.createElement("span", null, "📈"), "H-R Diagram — the astronomer's map"),

                  React.createElement("p", { className: "text-[11px] text-slate-400 leading-relaxed mb-2" }, "Every star is one dot: temperature across (hot on the LEFT — astronomers' quirk), luminosity up. Stars aren't scattered randomly. Drag the mass slider and click lifecycle stages — the dashed line traces YOUR star's whole journey."),

                  React.createElement("svg", { viewBox: "0 0 " + HW + " " + HH, className: "w-full", role: "img", "aria-label": "Hertzsprung-Russell diagram: surface temperature decreasing left to right, luminosity increasing upward. Shows the main sequence band, giants, supergiants and white dwarf regions, the Sun, and the current star's evolutionary track with its active stage highlighted." },

                    // temperature color strip along the bottom

                    React.createElement("defs", null,

                      React.createElement("linearGradient", { id: "hrTempGrad", x1: "0", y1: "0", x2: "1", y2: "0" },

                        React.createElement("stop", { offset: "0%", stopColor: "#9bb0ff" }),

                        React.createElement("stop", { offset: "35%", stopColor: "#f8f7ff" }),

                        React.createElement("stop", { offset: "60%", stopColor: "#fff4ea" }),

                        React.createElement("stop", { offset: "80%", stopColor: "#ffd2a1" }),

                        React.createElement("stop", { offset: "100%", stopColor: "#ff6b4a" }))),

                    React.createElement("rect", { x: hp.l, y: HH - hp.b + 4, width: HW - hp.l - hp.r, height: 5, rx: 2, fill: "url(#hrTempGrad)", opacity: 0.8 }),

                    // axes

                    React.createElement("line", { x1: hp.l, y1: hp.t, x2: hp.l, y2: HH - hp.b, stroke: "#475569", strokeWidth: 1 }),

                    React.createElement("line", { x1: hp.l, y1: HH - hp.b, x2: HW - hp.r, y2: HH - hp.b, stroke: "#475569", strokeWidth: 1 }),

                    [40000, 10000, 5000, 3000].map(function (T) { return React.createElement("text", { key: T, x: xOf(T), y: HH - hp.b + 18, fill: "#94a3b8", fontSize: 8, textAnchor: "middle" }, (T >= 10000 ? (T / 1000) + ',000' : T.toLocaleString()) + " K"); }),

                    [[1000000, "10⁶"], [10000, "10⁴"], [100, "10²"], [1, "1 ☉"], [0.01, "10⁻²"], [0.0001, "10⁻⁴"]].map(function (tk) { return React.createElement("text", { key: tk[1], x: hp.l - 5, y: yOf(tk[0]) + 3, fill: "#94a3b8", fontSize: 8, textAnchor: "end" }, tk[1]); }),

                    // main sequence band + region labels

                    React.createElement("path", { d: msBandTop + msBandBot + 'Z', fill: "rgba(99,102,241,0.16)", stroke: "rgba(129,140,248,0.35)", strokeWidth: 0.7 }),

                    React.createElement("text", { x: xOf(9500), y: yOf(6) + 4, fill: "#a5b4fc", fontSize: 9, fontWeight: 700, transform: "rotate(24 " + xOf(9500) + " " + yOf(6) + ")" }, "MAIN SEQUENCE (90% of stars)"),

                    React.createElement("text", { x: xOf(4200), y: yOf(600), fill: "#fca5a5", fontSize: 9, fontWeight: 700 }, "Giants"),

                    React.createElement("text", { x: xOf(11000), y: yOf(250000), fill: "#fdba74", fontSize: 9, fontWeight: 700 }, "Supergiants"),

                    React.createElement("text", { x: xOf(19000), y: yOf(0.008), fill: "#cbd5e1", fontSize: 9, fontWeight: 700 }, "White Dwarfs"),

                    // the Sun for reference

                    React.createElement("circle", { cx: xOf(5778), cy: yOf(1), r: 3, fill: "#fde047", stroke: "#0f172a", strokeWidth: 0.8 }),

                    React.createElement("text", { x: xOf(5778) + 6, y: yOf(1) + 3, fill: "#fde047", fontSize: 8, fontWeight: 700 }, "Sun"),

                    // evolutionary track for the chosen mass

                    trackPath && React.createElement("path", { d: trackPath, fill: "none", stroke: "#f472b6", strokeWidth: 1.4, strokeDasharray: "4 3", opacity: 0.75 }),

                    stages.map(function (s) {

                      var p = STAGE_HR[s.id];

                      if (!p) return null;

                      return React.createElement("circle", { key: s.id, cx: xOf(p.T), cy: yOf(p.L), r: 2.2, fill: s.color === 'var(--allo-stem-text, #e2e8f0)' ? '#e2e8f0' : s.color, opacity: 0.85 });

                    }),

                    // current stage marker

                    cur && React.createElement("circle", { cx: xOf(cur.T), cy: yOf(cur.L), r: 8, fill: "none", stroke: "#f472b6", strokeWidth: 1.2, opacity: 0.65 }),

                    cur && React.createElement("circle", { cx: xOf(cur.T), cy: yOf(cur.L), r: 4.5, fill: "#f472b6", stroke: "#ffffff", strokeWidth: 1.2 })

                  ),

                  React.createElement("p", { className: "text-[11px] leading-relaxed mt-1 " + (cur ? "text-pink-300" : "text-amber-300") },

                    cur ? "⭐ Your " + mass + " M☉ " + massNoun + " is " + cur.note + "." : (OFF_CHART[activeStage] || "Select a lifecycle stage to plot your star.")

                  )

                );

              })(),



              // ── OBAFGKM Star Classification Reference ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-400 p-4 shadow-sm" },

                React.createElement("h4", { className: "text-sm font-bold text-slate-800 mb-3 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83C\uDF08"),

                  "Harvard Spectral Classification (OBAFGKM)"

                ),

                React.createElement("div", { className: "grid grid-cols-7 gap-1" },

                  STAR_TYPES.map(function (st) {

                    var isMatch = spectralTypeForMass(lifecycleMass) === st.id;

                    return React.createElement("button", {

                      key: st.id,
                      type: "button",
                      "aria-pressed": isMatch ? "true" : "false",
                      "aria-label": "Set mass to " + st.id + "-type star, " + st.mass + ", " + st.lifetime + " lifetime",

                      className: "text-center p-2 rounded-xl border-2 bg-transparent transition-all cursor-pointer hover:scale-105 " +

                        (isMatch ? "border-indigo-400 shadow-md shadow-indigo-100 scale-105" : "border-transparent hover:border-slate-200"),

                      style: isMatch ? { background: st.color + '20' } : {},

                      onClick: function () { var massMap = { O: 30, B: 8, A: 1.8, F: 1.2, G: 1, K: 0.7, M: 0.3 }; upd("lifecycleMass", massMap[st.id] || 1); }

                    },

                      React.createElement("div", { className: "text-2xl mb-1", style: { color: st.color } }, "\u2B50"),

                      React.createElement("p", { className: "text-xs font-black", style: { color: st.color } }, st.id),

                      React.createElement("p", { className: "text-[11px] text-slate-600 leading-tight" }, st.temp + "K"),

                      isMatch ? React.createElement("div", { className: "mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto animate-pulse" }) : null

                    );

                  })

                ),

                // Selected type info

                (function () {

                  var matchType = spectralTypeForMass(lifecycleMass);

                  if (!matchType) {
                    return React.createElement("div", { className: "mt-3 p-3 rounded-xl border border-stone-300 bg-stone-50" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                        React.createElement("span", { className: "text-lg" }, "\uD83E\uDEA8"),
                        React.createElement("span", { className: "text-xs font-bold text-stone-700" }, "Brown dwarf (substellar)")
                      ),
                      React.createElement("p", { className: "text-[11px] text-stone-700 leading-relaxed" }, "This object is below about 0.08 solar masses, so it never settles onto the hydrogen-burning main sequence. It glows from leftover heat and slowly cools instead.")
                    );
                  }

                  var st = STAR_TYPES.find(function (s) { return s.id === matchType; });

                  if (!st) return null;

                  return React.createElement("div", { className: "mt-3 p-3 rounded-xl border", style: { borderColor: st.color + '40', background: st.color + '08' } },

                    React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },

                      React.createElement("span", { className: "text-lg", style: { color: st.color } }, "\u2B50"),

                      React.createElement("span", { className: "text-xs font-bold", style: { color: st.color } }, st.label + " (" + st.example + ")")

                    ),

                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed mb-2" }, st.desc),

                    React.createElement("div", { className: "grid grid-cols-3 gap-2 text-[11px]" },

                      [{ l: "Luminosity", v: st.luminosity }, { l: "Mass Range", v: st.mass || '?' }, { l: "Lifetime", v: st.lifetime || '?' }].map(function (item) {

                        return React.createElement("div", { key: item.l, className: "bg-white rounded-lg p-1.5 text-center border border-slate-100" },

                          React.createElement("div", { className: "text-slate-600 font-bold" }, item.l),

                          React.createElement("div", { className: "font-bold", style: { color: st.color } }, item.v)

                        );

                      })

                    ),

                    st.whyItMatters ? React.createElement("div", { className: "mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200" },

                      React.createElement("p", { className: "text-[11px] text-amber-700" }, "\uD83D\uDCA1 " + st.whyItMatters)

                    ) : null

                  );

                })()

              ),



              // ── Fun Facts ──

              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-4" },

                React.createElement("h4", { className: "text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83D\uDCA1"), "Did You Know?"

                ),

                React.createElement("p", { className: "text-[11px] text-indigo-800 leading-relaxed" },

                  lifecycleMass < HYDROGEN_FUSION_LIMIT ? "Brown dwarfs are sometimes called 'failed stars.' They glow faintly from leftover formation heat, but never sustain hydrogen fusion. They begin around 13 Jupiter masses, so Jupiter itself is far below the brown-dwarf range." :

                    lifecycleMass < M_DWARF_LIMIT ? "M-type red dwarfs are the most common true stars. They burn fuel so slowly that no red dwarf has had time to die since the universe began." :

                    lifecycleMass < 0.8 ? "K-type orange dwarfs are stable, long-lived stars. Astronomers like them for exoplanet studies because their habitable zones can last for many billions of years." :

                    lifecycleMass < 1.4 ? "Stars near the Sun's mass live for billions of years. Our Sun is about halfway through its main-sequence life and will eventually become a red giant before shedding a planetary nebula." :

                      lifecycleMass < 8 ? "Larger main-sequence stars burn hotter and die sooner. A 2 M\u2609 star lives only about 1-2 billion years, much shorter than the Sun." :

                        lifecycleMass < 25 ? "Neutron stars are so dense that a sugar-cube-sized piece weighs about 1 billion tons! They can spin up to 716 times per second and have magnetic fields trillions of times stronger than Earth's." :

                          "Stellar black holes form when the collapsed cores of very massive stars become compact enough for gravity to trap light. Astronomers find them with X-ray binaries, stellar orbits, and gravitational waves."

                )

              ),



              // ── You Are Star Stuff — cosmic origin of the elements ──

              (function () {

                var ORIGINS = {

                  bb: { label: 'Big Bang', color: '#7dd3fc' },

                  cr: { label: 'Cosmic-ray collisions', color: '#86efac' },

                  lm: { label: 'Dying low-mass stars', color: '#d8b4fe' },

                  ms: { label: 'Massive-star supernovae', color: '#60a5fa' },

                  wd: { label: 'Exploding white dwarfs', color: '#fde047' },

                  nsm: { label: 'Merging neutron stars', color: '#fb7185' }

                };

                // [symbol, period-table column, row, dominant origin] — periods 1–4

                var ELEMS = [

                  ['H', 1, 1, 'bb'], ['He', 18, 1, 'bb'],

                  ['Li', 1, 2, 'cr'], ['Be', 2, 2, 'cr'], ['B', 13, 2, 'cr'], ['C', 14, 2, 'lm'], ['N', 15, 2, 'lm'], ['O', 16, 2, 'ms'], ['F', 17, 2, 'ms'], ['Ne', 18, 2, 'ms'],

                  ['Na', 1, 3, 'ms'], ['Mg', 2, 3, 'ms'], ['Al', 13, 3, 'ms'], ['Si', 14, 3, 'ms'], ['P', 15, 3, 'ms'], ['S', 16, 3, 'ms'], ['Cl', 17, 3, 'ms'], ['Ar', 18, 3, 'ms'],

                  ['K', 1, 4, 'ms'], ['Ca', 2, 4, 'ms'], ['Sc', 3, 4, 'ms'], ['Ti', 4, 4, 'ms'], ['V', 5, 4, 'wd'], ['Cr', 6, 4, 'wd'], ['Mn', 7, 4, 'wd'], ['Fe', 8, 4, 'wd'], ['Co', 9, 4, 'wd'], ['Ni', 10, 4, 'wd'], ['Cu', 11, 4, 'ms'], ['Zn', 12, 4, 'ms'], ['Ga', 13, 4, 'ms'], ['Ge', 14, 4, 'ms'], ['As', 15, 4, 'ms'], ['Se', 16, 4, 'ms'], ['Br', 17, 4, 'ms'], ['Kr', 18, 4, 'ms']

                ];

                var stageOrigins = activeStage === 'supernova' ? { ms: true } :

                  (activeStage === 'planetary_nebula' || activeStage === 'red_giant') ? { lm: true } :

                  activeStage === 'neutron_star' ? { nsm: true } :

                  (activeStage === 'white_dwarf' || (activeStage === 'black_dwarf' && lifecycleMass >= HYDROGEN_FUSION_LIMIT)) ? { wd: true } : {};

                var stageMsg = activeStage === 'supernova' ? "💥 This explosion is forging oxygen, silicon, and calcium RIGHT NOW — glowing below." :

                  activeStage === 'planetary_nebula' ? "The dying star's winds are scattering fresh carbon and nitrogen into space — glowing below." :

                  activeStage === 'red_giant' ? "Deep inside, helium is fusing into carbon — the backbone atom of all known life." :

                  activeStage === 'neutron_star' ? "If two neutron stars collide, they forge gold, platinum, and uranium in seconds." :

                  activeStage === 'white_dwarf' ? "If a companion star dumps gas onto it, a white dwarf can detonate — the source of much of the iron in your blood." :

                  activeStage === 'main_sequence' && lifecycleMass < HYDROGEN_FUSION_LIMIT ? "This brown dwarf is substellar: it glows from leftover heat, but it never sustains hydrogen fusion." :

                  activeStage === 'main_sequence' ? "Right now this star fuses hydrogen into helium. Heavier elements come from later stellar stages, explosions, and compact-object mergers." : null;

                return React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 rounded-2xl border border-violet-400/30 p-4 shadow-lg" },

                  React.createElement("h4", { className: "text-sm font-bold text-white mb-1 flex items-center gap-2" }, React.createElement("span", null, "✨"), "You Are Star Stuff"),

                  React.createElement("p", { className: "text-[11px] text-slate-400 leading-relaxed mb-2" }, "Almost every atom heavier than helium was forged inside a star. Colors show where each element in your body — and your phone — came from."),

                  stageMsg && React.createElement("p", { className: "text-[11px] font-bold text-violet-300 bg-violet-900/40 border border-violet-700/50 rounded-lg px-2.5 py-1.5 mb-2" }, stageMsg),

                  React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '2px' } },

                    ELEMS.map(function (el) {

                      var o = ORIGINS[el[3]];

                      var hot = stageOrigins[el[3]];

                      return React.createElement("div", {

                        key: el[0], title: el[0] + ' — ' + o.label,

                        className: "text-center rounded-sm font-bold" + (hot ? " animate-pulse" : ""),

                        style: { gridColumnStart: el[1], gridRowStart: el[2], background: o.color + (hot ? '55' : '26'), border: '1px solid ' + o.color + (hot ? '' : '66'), color: o.color, fontSize: '8px', padding: '3px 0', boxShadow: hot ? '0 0 6px ' + o.color + '88' : 'none' }

                      }, el[0]);

                    })

                  ),

                  React.createElement("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2" },

                    Object.keys(ORIGINS).map(function (k) {

                      return React.createElement("span", { key: k, className: "flex items-center gap-1 text-[10px] font-semibold text-slate-300" },

                        React.createElement("span", { style: { width: 7, height: 7, borderRadius: 2, background: ORIGINS[k].color, display: 'inline-block' } }),

                        ORIGINS[k].label);

                    })

                  ),

                  React.createElement("div", { className: "grid grid-cols-2 gap-1.5 mt-2" },

                    [

                      { e: '🦴', txt: 'Calcium in your bones', src: 'massive supernovae', c: '#60a5fa' },

                      { e: '🩸', txt: 'Iron in your blood', src: 'exploding white dwarfs', c: '#fde047' },

                      { e: '🫁', txt: 'Oxygen in every breath', src: 'massive supernovae', c: '#60a5fa' },

                      { e: '💍', txt: 'Gold in jewelry', src: 'neutron-star mergers', c: '#fb7185' }

                    ].map(function (f) {

                      return React.createElement("div", { key: f.txt, className: "flex items-center gap-1.5 rounded-lg px-2 py-1", style: { background: f.c + '14', border: '1px solid ' + f.c + '40' } },

                        React.createElement("span", { className: "text-sm" }, f.e),

                        React.createElement("span", { className: "text-[10px] leading-tight text-slate-300" }, f.txt, React.createElement("span", { className: "block font-bold", style: { color: f.c } }, f.src)));

                    })

                  ),

                  React.createElement("p", { className: "text-[10px] text-slate-500 italic mt-2 leading-relaxed" }, "Colors show each element's dominant source today — many have more than one. Gold's neutron-star origin was confirmed in 2017, when telescopes watched the glow of freshly forged heavy elements after gravitational-wave event GW170817.")

                );

              })(),



              // ── Size Comparison ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-400 p-4 shadow-sm" },

                React.createElement("h4", { className: "text-sm font-bold text-slate-800 mb-3 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83D\uDD2D"), "Size Comparison"

                ),

                React.createElement("div", { className: "flex items-end justify-center gap-4 py-4" },

                  // Sun reference

                  React.createElement("div", { className: "flex flex-col items-center" },

                    React.createElement("div", { className: "rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-200", style: { width: '40px', height: '40px' } }),

                    React.createElement("span", { className: "text-[11px] text-slate-600 mt-1 font-bold" }, "Sun (1 M\u2609)")

                  ),

                  // Current star

                  React.createElement("div", { className: "flex flex-col items-center" },

                    React.createElement("div", {

                      className: "rounded-full shadow-lg transition-all duration-300", style: {

                        width: Math.max(8, Math.min(120, Math.pow(lifecycleMass, 0.8) * 20)) + 'px',

                        height: Math.max(8, Math.min(120, Math.pow(lifecycleMass, 0.8) * 20)) + 'px',

                        background: lifecycleMass < 0.45 ? 'linear-gradient(135deg, #ffcc6f, #ff9944)' :

                          lifecycleMass < 0.8 ? 'linear-gradient(135deg, #ffd2a1, #ffaa66)' :

                            lifecycleMass < 1.04 ? 'linear-gradient(135deg, #fff4ea, #ffdd99)' :

                              lifecycleMass < 1.4 ? 'linear-gradient(135deg, #f8f7ff, #ddd)' :

                                lifecycleMass < 2.1 ? 'linear-gradient(135deg, #cad7ff, #99aaee)' :

                                  lifecycleMass < 16 ? 'linear-gradient(135deg, #aabfff, #7799ff)' :

                                    'linear-gradient(135deg, #9bb0ff, #6677ff)',

                        boxShadow: '0 0 ' + Math.min(20, lifecycleMass * 2) + 'px ' + (lifecycleMass < 0.8 ? '#ffd2a166' : lifecycleMass < 2.1 ? '#fff4ea66' : '#aabfff66')

                      }

                    }),

                    React.createElement("span", { className: "text-[11px] text-slate-600 mt-1 font-bold" }, lifecycleMass + " M\u2609")

                  )

                ),

                React.createElement("p", { className: "text-center text-[11px] text-slate-600 italic mt-2" },

                  "Main-sequence radius scales roughly as M" + "\u2070\u00B7\u2078" + ". " +

                  (lifecycleMass < 1 ? "Your star is smaller and cooler than the Sun." :

                    lifecycleMass < 2 ? "Your star is similar in size to the Sun." :

                      lifecycleMass < 10 ? "Your star is significantly larger and hotter than the Sun!" :

                        "Your star is a colossal giant \u2014 millions of times more luminous than the Sun!")

                )

              ),



              ), // end left column



              // (Snapshot button moved inside canvas container)

            ),

            // === H7b'' inquiry widget: stellar metallicity discovery ===
            !d.quizMode && simMode === 'metalHunt' && (function() {
              var h = React.createElement;
              var iq = d.metalHunt || { metallicity: 1, mass: 1, age: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('metalHunt', Object.assign({}, iq, patch)); }
              var state;
              if (iq.metallicity < 0.05) state = 'popIII';
              else if (iq.metallicity < 0.3) state = 'poor';
              else if (iq.metallicity < 1.3) state = 'solar';
              else state = 'rich';
              var sm = {
                popIII: { label: '🌌 Population III (zero-metal)', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: 'Hypothetical first stars. Pure H+He. Extremely massive.' },
                poor:   { label: '🔵 Metal-poor (Population II)', color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: 'Old halo stars. Globular clusters. Long-lived.' },
                solar:  { label: '🟡 Solar-metallicity (Pop I)', color: '#facc15', bg: '#fefce8', border: '#fde047', desc: 'Sun-like. Modern disk stars. Planets possible.' },
                rich:   { label: '🟠 Metal-rich (super-solar)', color: '#ea580c', bg: '#fff7ed', border: '#fdba74', desc: 'Young inner-disk stars. High planet formation rate.' }
              }[state];
              return h('div', { className: 'p-4 rounded-xl bg-slate-900 text-slate-100 border border-purple-400 space-y-3' },
                h('h3', { className: 'text-sm font-black text-purple-300' }, '🌟 Stellar metallicity discovery'),
                h('p', { className: 'text-[12px] text-slate-300 leading-relaxed' }, 'Adjust metallicity (Z/Z☉), stellar mass, age. Widget shows 4 discrete stellar populations. No score, no reveal.'),
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-[11px] text-slate-700 mt-1' }, sm.desc)
                ),
                h('div', { className: 'grid grid-cols-3 gap-3' },
                  [{ k: 'metallicity', l: 'Metallicity (Z☉)', mn: 0.001, mx: 2, st: 0.01 },
                   { k: 'mass', l: 'Mass (M☉)', mn: 0.1, mx: 50, st: 0.1 },
                   { k: 'age', l: 'Age (Gyr)', mn: 0, mx: 14, st: 0.1 }].map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'mh-' + s.k, className: 'block text-[11px] font-bold text-slate-300' }, s.l + ': ', h('span', { className: 'font-mono text-purple-300' }, iq[s.k])),
                      h('input', { id: 'mh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseFloat(e.target.value); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ z: iq.metallicity, m: iq.mass, a: iq.age, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-800 text-[11px] font-bold text-slate-200 border border-slate-600' }, '📋 Log'),
                  h('button', { onClick: function() { setIQ({ metallicity: 1, mass: 1, age: 5, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-transparent text-[11px] font-semibold text-slate-400 border border-slate-600' }, '↺ Reset')
                ),
                h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: 'Hypothesis: What does metallicity tell us about a star’s history?',
                  className: 'w-full text-[12px] bg-slate-800 text-slate-100 border border-slate-600 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-700/30 text-[11px] font-bold text-amber-300 border border-amber-700' }, '🤔 Stuck — show open prompts'),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-900/20 border border-amber-700 text-[11px] text-slate-200 leading-relaxed' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, 'Old globular clusters have low Z. Investigate why.'),
                    h('li', null, 'Planets need metals. Which population is most planet-friendly?'))),
                h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-300 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  'I understand — explain in own words'),
                iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: 'Explain how metallicity shaped the early Universe vs today.',
                  className: 'w-full text-[12px] bg-slate-800 text-slate-100 border border-emerald-700 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
                h('div', { className: 'text-[10px] italic text-slate-500' }, 'Design note: discrete 4-state population marker; no luminosity score; no reveal — by design.')
              );
            })()

          );
      })();
    }
  });

})();
