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
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } } @media (forced-colors: active) { [data-galaxy-canvas]:focus-visible, [data-black-hole-canvas]:focus-visible { outline: 4px solid CanvasText !important; outline-offset: -4px !important; } [data-galaxy-root] button:focus-visible, [data-galaxy-root] summary:focus-visible, [data-galaxy-root] input:focus-visible, [data-galaxy-root] select:focus-visible, [data-galaxy-root] textarea:focus-visible, [data-galaxy-root] a:focus-visible { outline: 3px solid Highlight !important; outline-offset: 2px !important; } [data-galaxy-mode][aria-pressed=true], [data-galaxy-shape][aria-pressed=true], [data-galaxy-toggle][aria-pressed=true], [data-galaxy-control-tab][aria-selected=true] { border: 3px solid Highlight !important; } }';
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


  // ── Is WebGL actually available here? ──
  // The tool used to infer this from a THREE.WebGLRenderer constructor throw,
  // which cannot tell "this device has no WebGL" apart from "three.js never
  // loaded" or "the scene builder threw". All three produced the same card
  // telling the student their hardware was inadequate — false and unactionable
  // for the other two. Probe it directly instead.
  //
  // Releases the probe context immediately: browsers cap the number of live
  // WebGL contexts (~16), and leaking one to answer a yes/no question could
  // itself be what makes the real scene fail.
  var _galaxyWebglProbe = null;
  function galaxyWebglStatus() {
    if (_galaxyWebglProbe) return _galaxyWebglProbe;
    var out = { supported: false, renderer: '' };
    try {
      var probe = document.createElement('canvas');
      probe.setAttribute('aria-hidden', 'true');
      var gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
      if (gl) {
        out.supported = true;
        try {
          var info = gl.getExtension('WEBGL_debug_renderer_info');
          out.renderer = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
        } catch (infoError) {}
        try { var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (loseError) {}
      }
    } catch (probeError) {}
    _galaxyWebglProbe = out;
    return out;
  }

  // ── 2-D fallback galaxy ──
  // The 3-D view needs BOTH WebGL and a CDN-served three.js. When either is
  // missing the tool replaced its whole viewport with a red error card, so a
  // student on a locked-down laptop or a blocked network got no galaxy at all
  // — even though every teaching claim the panels make (arms, bar, bulge,
  // morphology) is perfectly drawable in Canvas2D, which every browser has.
  //
  // Driven by the SAME GALAXY_TYPES fields the 3-D scene uses (arms,
  // barLength, windTightness), so the fallback cannot drift into showing a
  // different shape from the one the tool is describing.
  //
  // Deterministic: a seeded LCG, never Math.random, so the same galaxy redraws
  // identically across re-renders and a screenshot stays comparable.
  function galaxyFallbackRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function galaxyDrawFallback(cv, opts) {
    if (!cv) return false;
    var o = opts || {};
    var w = cv.clientWidth || cv.offsetWidth || 0;
    var hgt = cv.clientHeight || cv.offsetHeight || 0;
    if (!w || !hgt) return false;
    var g = null;
    try { g = cv.getContext('2d'); } catch (ctxError) { return false; }
    if (!g) return false;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(hgt * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cx = w / 2, cy = hgt / 2;
    var R = Math.min(w, hgt) * 0.42;
    var arms = o.arms || 0;
    var barLength = o.barLength || 0;
    var wind = o.windTightness || 0;
    var type = o.type || 'barredSpiral';
    var rnd = galaxyFallbackRng(17 * 1 + (type.length * 7919) + arms * 104729);

    // Deep space
    var sky = g.createLinearGradient(0, 0, 0, hgt);
    sky.addColorStop(0, '#070b18');
    sky.addColorStop(1, '#02030a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, hgt);

    // Distant field stars
    var i;
    for (i = 0; i < 260; i++) {
      var fx = rnd() * w, fy = rnd() * hgt, fa = 0.18 + rnd() * 0.5;
      g.fillStyle = 'rgba(226,232,240,' + fa.toFixed(3) + ')';
      g.fillRect(fx, fy, rnd() > 0.92 ? 1.6 : 1, rnd() > 0.92 ? 1.6 : 1);
    }

    function star(px, py, radius, colour, alpha) {
      g.beginPath();
      g.arc(px, py, radius, 0, Math.PI * 2);
      g.fillStyle = colour.replace('ALPHA', alpha.toFixed(3));
      g.fill();
    }

    if (type === 'elliptical') {
      // Smooth ellipsoid of OLD stars — no arms, no dust, which is the whole
      // point of the class and what the panel beside it says.
      for (i = 0; i < 2600; i++) {
        var er = Math.pow(rnd(), 1.8) * R;
        var ea = rnd() * Math.PI * 2;
        var ex = cx + Math.cos(ea) * er * 1.25;
        var ey = cy + Math.sin(ea) * er * 0.82;
        star(ex, ey, 0.7 + rnd() * 0.7, 'rgba(255,214,170,ALPHA)', 0.35 + rnd() * 0.4);
      }
    } else if (type === 'irregular') {
      // Clumpy, no symmetry, active star formation — bluer knots.
      var clumps = 5;
      for (var c = 0; c < clumps; c++) {
        var ox = cx + (rnd() - 0.5) * R * 1.5;
        var oy = cy + (rnd() - 0.5) * R * 1.1;
        var spread = R * (0.18 + rnd() * 0.26);
        for (i = 0; i < 520; i++) {
          var ir = Math.pow(rnd(), 1.5) * spread;
          var ia = rnd() * Math.PI * 2;
          var young = rnd() > 0.55;
          star(ox + Math.cos(ia) * ir, oy + Math.sin(ia) * ir, 0.7 + rnd() * 0.8,
            young ? 'rgba(147,197,253,ALPHA)' : 'rgba(255,226,190,ALPHA)', 0.3 + rnd() * 0.45);
        }
      }
    } else {
      // Spiral. Arms are logarithmic; a bar, when the morphology has one,
      // carries the inner stars and the arms start from its ends.
      var barR = barLength * R * 2.2;
      var perArm = 1500;
      for (var a = 0; a < Math.max(1, arms); a++) {
        var base = (a / Math.max(1, arms)) * Math.PI * 2;
        for (i = 0; i < perArm; i++) {
          var t = i / perArm;
          var rr = barR + (R - barR) * Math.pow(t, 0.85);
          var th = base + wind * Math.log(1 + t * 2.6);
          // Perpendicular scatter, wider outward — arms are not wires.
          var jitter = (rnd() - 0.5) * R * (0.05 + t * 0.13);
          var jr = (rnd() - 0.5) * R * 0.03;
          var sx = cx + Math.cos(th) * (rr + jr) - Math.sin(th) * jitter;
          var sy = cy + Math.sin(th) * (rr + jr) * 0.55 + Math.cos(th) * jitter * 0.55;
          var isYoung = rnd() > 0.42;
          star(sx, sy, 0.6 + rnd() * 0.9,
            isYoung ? 'rgba(165,205,255,ALPHA)' : 'rgba(255,231,196,ALPHA)',
            0.28 + rnd() * 0.5);
        }
      }
      if (barR > 2) {
        // The bar itself.
        for (i = 0; i < 1100; i++) {
          var bt = (rnd() - 0.5) * 2;
          var bx = cx + bt * barR;
          var by = cy + (rnd() - 0.5) * R * 0.09 * (1 - Math.abs(bt) * 0.5);
          star(bx, by, 0.7 + rnd() * 0.8, 'rgba(255,222,180,ALPHA)', 0.35 + rnd() * 0.45);
        }
      }
    }

    // Central bulge glow, last so it reads as light rather than a disc.
    var bulge = g.createRadialGradient(cx, cy, 0, cx, cy, R * (type === 'elliptical' ? 0.85 : 0.42));
    bulge.addColorStop(0, 'rgba(255,244,214,0.85)');
    bulge.addColorStop(0.35, 'rgba(255,214,150,0.30)');
    bulge.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = bulge;
    g.fillRect(0, 0, w, hgt);

    cv.setAttribute('data-fallback-drawn', type);
    return true;
  }

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
      }, []);      // Keep motion preference reactive so controls, status text, and both WebGL
      // scenes pause immediately when the operating-system setting changes.
      var _galaxyMotionPreference = React.useState(function () {
        try { return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (motionPreferenceError) { return false; }
      });
      var galaxyPrefersReducedMotion = _galaxyMotionPreference[0];
      var setGalaxyPrefersReducedMotion = _galaxyMotionPreference[1];
      React.useEffect(function () {
        var query;
        try { query = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (motionQueryError) { return; }
        var onMotionPreferenceChange = function (event) { setGalaxyPrefersReducedMotion(!!event.matches); };
        onMotionPreferenceChange(query);
        if (query.addEventListener) query.addEventListener('change', onMotionPreferenceChange);
        else if (query.addListener) query.addListener(onMotionPreferenceChange);
        return function () {
          if (query.removeEventListener) query.removeEventListener('change', onMotionPreferenceChange);
          else if (query.removeListener) query.removeListener(onMotionPreferenceChange);
        };
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

          // Range inputs fire on every pointer move. Rebuilding up to 100,000 star
          // vertices (or recolouring them) per event stalls the drag, so the expensive
          // scene work is coalesced onto the canvas element, which outlives re-renders.
          var scheduleOnCanvas = function (cv, timerKey, delay, work) {
            if (!cv) return;
            if (cv[timerKey]) clearTimeout(cv[timerKey]);
            cv[timerKey] = setTimeout(function () {
              cv[timerKey] = null;
              if (cv.isConnected) work(cv);
            }, delay);
          };



          // ── Layer toggle defaults ──

          var layers = d.layers || { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false };

          var starCount = d.starCount || 25000;

          var cosmicAge = d.cosmicAge !== undefined ? d.cosmicAge : 10;

          var showLifecycle = d.showLifecycle || false;

          var lifecycleMass = d.lifecycleMass !== undefined ? d.lifecycleMass : 1;
          var activeStage = d.activeStage || 'main_sequence';

          var showSNAnim = d.showSNAnim || false;

          var galaxyType = d.galaxyType || 'barredSpiral';
          var galaxyControlPanel = d.galaxyControlPanel || 'view';
          var galaxyReducedMotion = galaxyPrefersReducedMotion;
          var galaxyAutoRotate = d.galaxyAutoRotate !== false && !galaxyReducedMotion;
          var galaxyHudHidden = !!d.galaxyHudHidden;
          var galaxyTourActive = !!d.galaxyTourActive && !galaxyReducedMotion;
          var galaxyQuality = d.galaxyQuality || 'auto';
          var galaxyScienceOverlay = d.galaxyScienceOverlay !== false;

          var simMode = d.simMode || 'galaxy';

          var blackHoleSpin = d.blackHoleSpin !== undefined ? d.blackHoleSpin : 0.72;
          var blackHoleDisk = d.blackHoleDisk !== undefined ? d.blackHoleDisk : 0.78;
          var blackHolePaused = !!d.blackHolePaused;
          var blackHoleReducedMotion = galaxyPrefersReducedMotion;
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

          // Main-sequence radius in solar radii. Piecewise because the mass-radius
          // relation steepens either side of ~1 M☉. Shared by the Star Life canvas
          // read-out and the Size Comparison panel so the two cannot disagree.
          function mainSequenceRadius(mass) {
            var m = Math.max(0.01, mass);
            return m < 0.8 ? Math.pow(m, 0.8) : m < 2 ? Math.pow(m, 0.57) : Math.pow(m, 0.78);
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

          // Ellipticals are pressure-supported, gas-poor stellar systems. Keep their
          // point sources small and their diffuse light below the bloom clip point;
          // spiral-only dust, gas and nursery layers are unavailable for this shape.
          var morphologyVisual = galaxyType === 'elliptical' ? {
            pointScale: 0.48,
            glowPointSize: 0.034,
            diskGlow: 0.62,
            armGlow: 0.42,
            coreGlow: 0.52,
            bloomStrength: 0.55,
            bloomThreshold: 0.04,
            exposureBias: -0.12,
            sparkleDensity: 0,
            sparkleScale: 0.7,
            diffractionScale: 0,
            stellarOpacity: 0.28,
            microStarOpacity: 0.32,
            bulgeOpacity: 0.32,
            hiddenLayers: { dust: true, gas: true, nebulae: true }
          } : {
            pointScale: 1,
            glowPointSize: 0.046,
            diskGlow: 1,
            armGlow: 1,
            coreGlow: 1,
            bloomStrength: 1,
            bloomThreshold: 0,
            exposureBias: 0,
            sparkleDensity: 1,
            sparkleScale: 1,
            diffractionScale: 1,
            stellarOpacity: 1,
            microStarOpacity: 1,
            bulgeOpacity: 1,
            hiddenLayers: {}
          };

          var OBSERVE_MODES = [
            { key: 'visible', icon: '\uD83D\uDC41\uFE0F', label: __alloT('stem.galaxy.observe_visible_label', 'Visible'), target: 'galaxyType', accent: '#6366f1', desc: __alloT('stem.galaxy.observe_visible_desc', 'Human-eye color shows stars, dust shadows, and the overall shape of the galaxy.'), note: __alloT('stem.galaxy.observe_visible_note', 'Best for classifying galaxy shape and comparing star colors.') },
            { key: 'infrared', icon: '\uD83D\uDD25', label: __alloT('stem.galaxy.observe_infrared_label', 'Infrared'), target: 'dustLanes', accent: '#f97316', desc: __alloT('stem.galaxy.observe_infrared_desc', 'Infrared light passes through dusty lanes and reveals warm star-forming regions.'), note: __alloT('stem.galaxy.observe_infrared_note', 'Great for seeing through dust that blocks visible light.') },
            { key: 'radio', icon: '\uD83D\uDCE1', label: __alloT('stem.galaxy.observe_radio_label', 'Radio'), target: 'gasClouds', accent: '#06b6d4', desc: __alloT('stem.galaxy.observe_radio_desc', 'Radio maps trace cold hydrogen gas that outlines spiral arms and future star birth.'), note: __alloT('stem.galaxy.observe_radio_note', 'Hydrogen at 21 cm is one of the best maps of hidden galactic gas.') },
            { key: 'xray', icon: '\u26A1', label: __alloT('stem.galaxy.observe_xray_label', 'X-ray'), target: 'blackHole', accent: '#38bdf8', desc: __alloT('stem.galaxy.observe_xray_desc', 'X-rays highlight the hottest, most energetic regions near compact objects and young massive stars.'), note: __alloT('stem.galaxy.observe_xray_note', 'Useful for black-hole accretion, neutron stars, and supernova remnants.') },
            { key: 'gravity', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.observe_gravity_label', 'Gravity'), target: 'darkMatter', accent: '#c084fc', desc: __alloT('stem.galaxy.observe_gravity_desc', 'A gravity view shows the invisible mass halo inferred from star motions.'), note: __alloT('stem.galaxy.observe_gravity_note', 'This is evidence-based, not a photograph: motion reveals the dark matter halo.') }
          ];
          var activeObserve = OBSERVE_MODES.find(function (m) { return m.key === observeMode; }) || OBSERVE_MODES[0];
          var OBSERVATORY_INSTRUMENTS = {
            visible: { band: '380-700 nm', detector: __alloT('stem.galaxy.instrument_visible_detector', 'Optical composite'), tracer: __alloT('stem.galaxy.instrument_visible_tracer', 'Starlight + dust shadows'), gradient: 'linear-gradient(90deg,#4338ca,#2563eb,#16a34a,#eab308,#dc2626)' },
            infrared: { band: '3-100 µm', detector: __alloT('stem.galaxy.instrument_infrared_detector', 'Thermal infrared'), tracer: __alloT('stem.galaxy.instrument_infrared_tracer', 'Warm dust + embedded stars'), gradient: 'linear-gradient(90deg,#7c2d12,#f97316,#fdba74,#fef3c7)' },
            radio: { band: '21 cm / 1.420 GHz', detector: __alloT('stem.galaxy.instrument_radio_detector', 'H I spectral line'), tracer: __alloT('stem.galaxy.instrument_radio_tracer', 'Cold hydrogen + magnetic field'), gradient: 'linear-gradient(90deg,#2563eb,#67e8f9,#e2e8f0,#f0abfc,#dc2626)' },
            xray: { band: '0.5-8 keV', detector: __alloT('stem.galaxy.instrument_xray_detector', 'High-energy imaging'), tracer: __alloT('stem.galaxy.instrument_xray_tracer', 'Hot plasma + compact objects'), gradient: 'linear-gradient(90deg,#312e81,#0284c7,#7dd3fc,#ffffff)' },
            gravity: { band: __alloT('stem.galaxy.instrument_gravity_band', 'Mass inference'), detector: __alloT('stem.galaxy.instrument_gravity_detector', 'Kinematics + lensing'), tracer: __alloT('stem.galaxy.instrument_gravity_tracer', 'Dark halo + shear arclets'), gradient: 'linear-gradient(90deg,#581c87,#a855f7,#e9d5ff,#67e8f9)' }
          };
          var activeInstrument = OBSERVATORY_INSTRUMENTS[observeMode] || OBSERVATORY_INSTRUMENTS.visible;
          if (galaxyType === 'elliptical') {
            var ellipticalInstrumentTracers = {
              visible: __alloT('stem.galaxy.instrument_elliptical_visible_tracer', 'Old starlight + smooth profile'),
              infrared: __alloT('stem.galaxy.instrument_elliptical_infrared_tracer', 'Evolved stars + very little dust'),
              radio: __alloT('stem.galaxy.instrument_elliptical_radio_tracer', 'Weak cold-gas reservoir'),
              xray: __alloT('stem.galaxy.instrument_elliptical_xray_tracer', 'Hot halo gas + compact core'),
              gravity: __alloT('stem.galaxy.instrument_elliptical_gravity_tracer', 'Dark halo + pressure-supported stars')
            };
            activeInstrument = Object.assign({}, activeInstrument, { tracer: ellipticalInstrumentTracers[observeMode] || ellipticalInstrumentTracers.visible });
          }
          var OBSERVE_GUIDES = {
            visible: {
              question: __alloT('stem.galaxy.guide_visible_question', 'Where does visible starlight disappear, and what is blocking it?'),
              sees: __alloT('stem.galaxy.guide_visible_sees', 'Star colors, galaxy shape, and dark dust silhouettes'),
              misses: __alloT('stem.galaxy.guide_visible_misses', 'Cold gas and stars still buried inside dense clouds'),
              inference: __alloT('stem.galaxy.guide_visible_inference', 'A dark lane is evidence of foreground dust absorbing light, not an empty gap.'),
              change: __alloT('stem.galaxy.guide_visible_change', 'Starlight and sharp dust shadows return, making morphology easiest to classify.'),
              marks: [
                { label: __alloT('stem.galaxy.mark_dust_lane', 'Dust lane'), detail: __alloT('stem.galaxy.mark_dust_lane_detail', 'absorbs visible starlight'), lx: 4, ly: 34, tx: 37, ty: 49, anchor: 'left' },
                { label: __alloT('stem.galaxy.mark_blue_association', 'Young blue stars'), detail: __alloT('stem.galaxy.mark_blue_association_detail', 'trace recent star formation'), lx: 88, ly: 68, tx: 64, ty: 56, anchor: 'right' }
              ]
            },
            infrared: {
              question: __alloT('stem.galaxy.guide_infrared_question', 'Which bright regions were hidden in the visible-light dust lanes?'),
              sees: __alloT('stem.galaxy.guide_infrared_sees', 'Warm dust, embedded protostars, and the older stellar disk'),
              misses: __alloT('stem.galaxy.guide_infrared_misses', 'The coldest gas and the highest-energy compact objects'),
              inference: __alloT('stem.galaxy.guide_infrared_inference', 'Infrared light penetrates dust better, revealing star birth before clouds disperse.'),
              change: __alloT('stem.galaxy.guide_infrared_change', 'Dark lanes become translucent while warm nurseries and embedded stars brighten.'),
              marks: [
                { label: __alloT('stem.galaxy.mark_embedded_protostars', 'Embedded protostars'), detail: __alloT('stem.galaxy.mark_embedded_protostars_detail', 'warm knots inside clouds'), lx: 4, ly: 34, tx: 39, ty: 49, anchor: 'left' },
                { label: __alloT('stem.galaxy.mark_old_stellar_disk', 'Older stellar disk'), detail: __alloT('stem.galaxy.mark_old_stellar_disk_detail', 'warm stars fill the disk'), lx: 88, ly: 68, tx: 63, ty: 57, anchor: 'right' },
                { label: __alloT('stem.galaxy.mark_thermal_dust', 'Thermal dust emission'), detail: __alloT('stem.galaxy.mark_thermal_dust_detail', 'absorbed starlight re-radiated as heat'), lx: 88, ly: 27, tx: 71, ty: 42, anchor: 'right' }
              ]
            },
            radio: {
              question: __alloT('stem.galaxy.guide_radio_question', 'Does the cold gas extend beyond the bright stellar arms?'),
              sees: __alloT('stem.galaxy.guide_radio_sees', 'Cold hydrogen, magnetic structure, and energetic remnant shells'),
              misses: __alloT('stem.galaxy.guide_radio_misses', 'Ordinary starlight and fine optical dust silhouettes'),
              inference: __alloT('stem.galaxy.guide_radio_inference', 'The 21 cm hydrogen signal maps the fuel reservoir from which future stars can form.'),
              change: __alloT('stem.galaxy.guide_radio_change', 'Most starlight fades while extended gas lanes and remnant filaments strengthen.'),
              marks: [
                { label: __alloT('stem.galaxy.mark_cold_hydrogen', 'Cold hydrogen'), detail: __alloT('stem.galaxy.mark_cold_hydrogen_detail', 'fuel for future stars'), lx: 4, ly: 34, tx: 39, ty: 50, anchor: 'left' },
                { label: __alloT('stem.galaxy.mark_radio_remnants', 'Remnant shells'), detail: __alloT('stem.galaxy.mark_radio_remnants_detail', 'expanding magnetized debris'), lx: 88, ly: 68, tx: 65, ty: 55, anchor: 'right' },
                { label: __alloT('stem.galaxy.mark_doppler_field', 'Doppler velocity field'), detail: __alloT('stem.galaxy.mark_doppler_field_detail', 'blue approaches; red recedes'), lx: 88, ly: 28, tx: 70, ty: 41, anchor: 'right' }
              ]
            },
            xray: {
              question: __alloT('stem.galaxy.guide_xray_question', 'Where is matter hottest or being accelerated most violently?'),
              sees: __alloT('stem.galaxy.guide_xray_sees', 'Accreting compact objects, hot gas, and supernova remnants'),
              misses: __alloT('stem.galaxy.guide_xray_misses', 'Cool stars, cold molecular clouds, and most of the stellar disk'),
              inference: __alloT('stem.galaxy.guide_xray_inference', 'Strong X-rays reveal million-degree gas or matter accelerated near neutron stars and black holes.'),
              change: __alloT('stem.galaxy.guide_xray_change', 'The cool disk recedes while the energetic core and shocked remnant shells dominate.'),
              marks: [
                { label: __alloT('stem.galaxy.mark_accreting_core', 'Energetic core'), detail: __alloT('stem.galaxy.mark_accreting_core_detail', 'hot infalling matter'), lx: 4, ly: 34, tx: 50, ty: 50, anchor: 'left' },
                { label: __alloT('stem.galaxy.mark_xray_remnants', 'Hot remnants'), detail: __alloT('stem.galaxy.mark_xray_remnants_detail', 'shock-heated plasma'), lx: 88, ly: 68, tx: 66, ty: 56, anchor: 'right' },
                { label: __alloT('stem.galaxy.mark_xray_binaries', 'Compact-object beacons'), detail: __alloT('stem.galaxy.mark_xray_binaries_detail', 'flickering accretion and pulsars'), lx: 88, ly: 27, tx: 70, ty: 42, anchor: 'right' }
              ]
            },
            gravity: {
              question: __alloT('stem.galaxy.guide_gravity_question', 'How can motions reveal mass that emits no light?'),
              sees: __alloT('stem.galaxy.guide_gravity_sees', 'The inferred dark-matter halo and gravitational structure'),
              misses: __alloT('stem.galaxy.guide_gravity_misses', 'This is not a photograph and does not show a new kind of light'),
              inference: __alloT('stem.galaxy.guide_gravity_inference', 'Outer stars orbit too quickly for visible matter alone, so additional unseen mass is required.'),
              change: __alloT('stem.galaxy.guide_gravity_change', 'Luminous detail is suppressed and the much larger inferred mass halo becomes the central evidence.'),
              marks: [
                { label: __alloT('stem.galaxy.mark_dark_halo', 'Dark-matter halo'), detail: __alloT('stem.galaxy.mark_dark_halo_detail', 'inferred from orbital speeds'), lx: 4, ly: 34, tx: 31, ty: 39, anchor: 'left' },
                { label: __alloT('stem.galaxy.mark_fast_outer_stars', 'Fast outer stars'), detail: __alloT('stem.galaxy.mark_fast_outer_stars_detail', 'gravity exceeds visible mass'), lx: 88, ly: 68, tx: 72, ty: 58, anchor: 'right' },
                { label: __alloT('stem.galaxy.mark_weak_lensing', 'Weak-lensing arclets'), detail: __alloT('stem.galaxy.mark_weak_lensing_detail', 'background light sheared by halo mass'), lx: 88, ly: 28, tx: 77, ty: 33, anchor: 'right' }
              ]
            }
          };
          var activeObserveGuide = OBSERVE_GUIDES[observeMode] || OBSERVE_GUIDES.visible;
          if (galaxyType === 'elliptical') {
            var ELLIPTICAL_OBSERVE_GUIDES = {
              visible: {
                question: __alloT('stem.galaxy.guide_elliptical_visible_question', 'How smoothly does the light fade from the bright center to the outer halo?'),
                sees: __alloT('stem.galaxy.guide_elliptical_visible_sees', 'A smooth ellipsoidal profile dominated by old, warm-colored stars'),
                misses: __alloT('stem.galaxy.guide_elliptical_visible_misses', 'The dark halo and any very faint hot gas around the galaxy'),
                inference: __alloT('stem.galaxy.guide_elliptical_visible_inference', 'The lack of arms, dust lanes, and blue nurseries indicates little recent star formation.'),
                change: __alloT('stem.galaxy.guide_elliptical_visible_change', 'Warm starlight returns as a smooth oval with a concentrated but resolved core.'),
                marks: [
                  { label: __alloT('stem.galaxy.mark_elliptical_old_stars', 'Old warm stars'), detail: __alloT('stem.galaxy.mark_elliptical_old_stars_detail', 'dominate the smooth stellar halo'), lx: 4, ly: 34, tx: 38, ty: 46, anchor: 'left' },
                  { label: __alloT('stem.galaxy.mark_elliptical_core', 'Concentrated core'), detail: __alloT('stem.galaxy.mark_elliptical_core_detail', 'brightness rises without forming a disk'), lx: 88, ly: 68, tx: 55, ty: 53, anchor: 'right' }
                ]
              },
              infrared: {
                question: __alloT('stem.galaxy.guide_elliptical_infrared_question', 'Does infrared reveal hidden nurseries, or mostly the same old stellar population?'),
                sees: __alloT('stem.galaxy.guide_elliptical_infrared_sees', 'Long-lived cool stars and the galaxy\'s smooth stellar mass distribution'),
                misses: __alloT('stem.galaxy.guide_elliptical_infrared_misses', 'Only a small amount of warm dust because ellipticals are usually gas-poor'),
                inference: __alloT('stem.galaxy.guide_elliptical_infrared_inference', 'A similar visible and infrared shape supports an old population with little obscuring dust.'),
                change: __alloT('stem.galaxy.guide_elliptical_infrared_change', 'The smooth old population remains while dust-dependent knots stay faint.'),
                marks: [
                  { label: __alloT('stem.galaxy.mark_elliptical_evolved_stars', 'Evolved stars'), detail: __alloT('stem.galaxy.mark_elliptical_evolved_stars_detail', 'remain bright in infrared'), lx: 4, ly: 34, tx: 39, ty: 48, anchor: 'left' },
                  { label: __alloT('stem.galaxy.mark_elliptical_low_dust', 'Very little dust'), detail: __alloT('stem.galaxy.mark_elliptical_low_dust_detail', 'few hidden stellar nurseries'), lx: 88, ly: 68, tx: 65, ty: 57, anchor: 'right' }
                ]
              },
              radio: {
                question: __alloT('stem.galaxy.guide_elliptical_radio_question', 'How weak is the cold-hydrogen reservoir compared with a spiral galaxy?'),
                sees: __alloT('stem.galaxy.guide_elliptical_radio_sees', 'A weak gas signal and occasional activity associated with the central black hole'),
                misses: __alloT('stem.galaxy.guide_elliptical_radio_misses', 'Most of the old stellar population that defines the visible shape'),
                inference: __alloT('stem.galaxy.guide_elliptical_radio_inference', 'Little cold hydrogen means little raw material is available for new stars.'),
                change: __alloT('stem.galaxy.guide_elliptical_radio_change', 'Ordinary starlight fades without revealing spiral gas lanes.'),
                marks: [
                  { label: __alloT('stem.galaxy.mark_elliptical_gas_poor', 'Gas-poor body'), detail: __alloT('stem.galaxy.mark_elliptical_gas_poor_detail', 'weak cold-hydrogen signal'), lx: 4, ly: 34, tx: 39, ty: 50, anchor: 'left' },
                  { label: __alloT('stem.galaxy.mark_elliptical_radio_core', 'Possible active core'), detail: __alloT('stem.galaxy.mark_elliptical_radio_core_detail', 'radio emission can trace black-hole activity'), lx: 88, ly: 68, tx: 55, ty: 53, anchor: 'right' }
                ]
              }
            };
            activeObserveGuide = ELLIPTICAL_OBSERVE_GUIDES[observeMode] || activeObserveGuide;
          }
          var previousObserveKey = d.previousObserveMode && d.previousObserveMode !== observeMode ? d.previousObserveMode : null;
          var previousObserve = previousObserveKey ? (OBSERVE_MODES.find(function (m) { return m.key === previousObserveKey; }) || null) : null;
          var observeHistory = Array.isArray(d.observeHistory) ? d.observeHistory : [observeMode];
          var galaxyEvidenceNote = d.galaxyEvidenceNote || '';

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



          // AI-generated questions are untrusted input: the render path indexes
          // `options` and compares against `a`, so anything malformed is discarded
          // here rather than thrown at React.
          function sanitizeGeneratedQuiz(list) {
            if (!Array.isArray(list)) return [];
            return list.map(function (item) {
              if (!item || typeof item !== 'object') return null;
              var q = typeof item.q === 'string' ? item.q.trim() : '';
              var a = typeof item.a === 'string' ? item.a.trim() : '';
              if (!q || !a || !Array.isArray(item.options)) return null;
              var seen = {}, options = [];
              item.options.forEach(function (opt) {
                if (typeof opt !== 'string') return;
                var text = opt.trim();
                if (!text || seen[text]) return;
                seen[text] = true;
                options.push(text);
              });
              // The answer must actually be selectable, and a single-option item is
              // not a multiple-choice question.
              if (options.indexOf(a) === -1 || options.length < 2) return null;
              return { q: q, a: a, options: options };
            }).filter(Boolean);
          }



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

          function getMorphologyAgeDistribution(ageDistribution) {
            var distribution = (ageDistribution || [0.003, 0.13, 0.6, 3, 7.6, 12.1, 76.5]).slice();
            if (galaxyType === 'elliptical') {
              distribution[0] *= 0.04;
              distribution[1] *= 0.08;
              distribution[2] *= 0.18;
              distribution[3] *= 0.45;
              distribution[5] *= 1.15;
              distribution[6] *= 1.18;
            }
            return distribution;
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

          // The stage list depends on mass, so a stage chosen at one mass can become
          // impossible at another (e.g. picking Black Hole at 30 M☉, then sliding the
          // mass down to 1 M☉ left a Sun-like star rendered as a black hole). Fall back
          // to the main sequence whenever the remembered stage is not on the new path.
          (function () {
            var reachableStages = getStagesForMass(lifecycleMass);
            for (var rsi = 0; rsi < reachableStages.length; rsi++) {
              if (reachableStages[rsi].id === activeStage) return;
            }
            activeStage = 'main_sequence';
          })();



          // ── Three.js init with layer groups ──

          // Post-processing script loader

          function loadGalaxyPP(cb) {

            if (window._galaxyPPLoaded) { cb(); return; }
            if (window._galaxyPPLoading) {
              window._galaxyPPCallbacks = window._galaxyPPCallbacks || [];
              window._galaxyPPCallbacks.push(cb);
              return;
            }

            window._galaxyPPLoading = true;
            window._galaxyPPCallbacks = [cb];

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

              if (idx >= urls.length) {
                window._galaxyPPLoaded = true;
                window._galaxyPPLoading = false;
                var callbacks = window._galaxyPPCallbacks || [];
                window._galaxyPPCallbacks = [];
                callbacks.forEach(function (fn) { try { fn(); } catch (e) {} });
                return;
              }

              var s = document.createElement('script');

              s.src = urls[idx]; s.onload = function () { idx++; next(); };

              s.onerror = function () { idx++; next(); };

              document.head.appendChild(s);

            }

            next();

          }



          // React calls an old callback ref with null whenever the callback identity
          // changes. Keep this ref stable so ordinary state renders do not tear down
          // and recreate the complete Three.js scene.
          var galaxyCanvasActive = React.useRef(null);
          // Three.js comes off a CDN, so on school wi-fi the canvas can sit empty for
          // seconds. This is deliberately local state, not toolData: a saved session
          // must not reopen claiming the scene is already built.
          var _galaxySceneReady = React.useState(false);
          var galaxySceneReady = _galaxySceneReady[0];
          var setGalaxySceneReady = _galaxySceneReady[1];
          var galaxyRuntimeRef = React.useRef(null);
          galaxyRuntimeRef.current = {
            canvasNarrate: canvasNarrate,
            galaxyType: galaxyType,
            galaxyQuality: galaxyQuality,
            initGalaxy: initGalaxy,
            loadGalaxyPP: loadGalaxyPP,
            starCount: starCount,
            // Shows the "3-D mode unavailable / retry" card instead of a black canvas.
            // `reason` distinguishes the three ways this is reached: the 3-D
            // library never loaded ('noThree'), the scene builder threw
            // ('initFailed'), or WebGL itself is absent ('noWebgl'). They used
            // to be indistinguishable, so a blocked CDN told the student their
            // device could not do 3-D.
            reportInitFailure: function (reason) { setTimeout(function () { patchGalaxy({ webglError: true, webglErrorReason: reason || 'initFailed' }); setGalaxySceneReady(false); }, 0); },
            reportSceneReady: function () { setTimeout(function () { setGalaxySceneReady(true); }, 0); }
          };

          var canvasRefCb = React.useCallback(function (canvasEl) {

            if (!canvasEl) {
              var prev = galaxyCanvasActive.current;
              galaxyCanvasActive.current = null;
              if (prev) {
                prev._galaxyInitToken = (prev._galaxyInitToken || 0) + 1;
                if (prev._galaxyCleanup) prev._galaxyCleanup();
                prev._galaxyInit = false;
              }
              setGalaxySceneReady(false);

              return;

            }

            galaxyCanvasActive.current = canvasEl;
            if (canvasEl._galaxyInit) return;

            // Ask before spending. If this browser has no WebGL at all there is
            // no point pulling a multi-megabyte 3-D library over what may be a
            // school connection purely to watch the renderer throw — go
            // straight to the flat view and say why.
            //
            // Only when THREE is not already loaded: the saving here is the
            // DOWNLOAD, so if the library is already in the page there is
            // nothing to skip, and short-circuiting anyway would refuse to
            // build a scene in any environment that supplies its own THREE.
            if (!window.THREE && !galaxyWebglStatus().supported) {
              var noGlRuntime = galaxyRuntimeRef.current;
              if (noGlRuntime && noGlRuntime.reportInitFailure) noGlRuntime.reportInitFailure('noWebgl');
              return;
            }

            canvasEl._galaxyInit = true;
            var initToken = (canvasEl._galaxyInitToken || 0) + 1;
            canvasEl._galaxyInitToken = initToken;
            var initialRuntime = galaxyRuntimeRef.current;
            canvasEl._galaxyRequestedType = initialRuntime.galaxyType;
            canvasEl._galaxyRequestedQuality = initialRuntime.galaxyQuality;
            // Canvas Narration: galaxy init
            if (typeof initialRuntime.canvasNarrate === 'function') initialRuntime.canvasNarrate('galaxy', 'init', {
              first: 'Galaxy Explorer loaded. A 3-D view of the Milky Way with ' + initialRuntime.starCount.toLocaleString() + ' stars. Drag or use arrow keys to orbit; scroll, pinch, or use plus and minus to zoom. Explore galaxy types, warp to locations, and travel through cosmic time.',
              repeat: 'Galaxy Explorer ready.',
              terse: 'Galaxy Explorer ready.'
            });

            var isCurrentCanvas = function () {
              return galaxyCanvasActive.current === canvasEl &&
                canvasEl.isConnected &&
                canvasEl._galaxyInit &&
                canvasEl._galaxyInitToken === initToken;
            };
            var doInit = function () {
              if (!isCurrentCanvas()) return;
              var runtime = galaxyRuntimeRef.current;
              runtime.loadGalaxyPP(function () {
                if (!isCurrentCanvas()) return;
                runtime = galaxyRuntimeRef.current;
                canvasEl._galaxyRenderedType = runtime.galaxyType;
                // loadGalaxyPP swallows callback exceptions, so an init failure here
                // would otherwise leave a silent black canvas with no way back.
                try {
                  runtime.initGalaxy(canvasEl);
                } catch (initError) {
                  console.error('[Galaxy] Scene initialization failed:', initError);
                  canvasEl._galaxyInit = false;
                  if (runtime.reportInitFailure) runtime.reportInitFailure('initFailed');
                }
              });
            };

            if (window.THREE) { doInit(); } else {

              window.StemLab.ensureThree({ orbit: false }).then(doInit).catch(function () {
                if (isCurrentCanvas()) {
                  canvasEl._galaxyInit = false;
                  console.error('[Galaxy] Three.js failed to load');
                  var runtime = galaxyRuntimeRef.current;
                  if (runtime && runtime.reportInitFailure) runtime.reportInitFailure('noThree');
                }
              });

            }

          }, []);

          // Galaxy type and visual-quality changes intentionally need a rebuild,
          // but only after React has committed the new state.
          React.useEffect(function () {
            var canvasEl = galaxyCanvasActive.current;
            if (!canvasEl || !canvasEl.isConnected || !canvasEl._galaxyInit) return;
            if (canvasEl._galaxyRequestedType === galaxyType && canvasEl._galaxyRequestedQuality === galaxyQuality) return;
            canvasEl._galaxyInitToken = (canvasEl._galaxyInitToken || 0) + 1;
            // This rebuild keeps the same canvas. Dispose the old scene and bloom
            // targets, but keep its WebGL context alive for the replacement renderer.
            if (canvasEl._galaxyCleanup) canvasEl._galaxyCleanup(true);
            canvasEl._galaxyInit = false;
            // Switching morphology or quality tears the whole scene down and rebuilds
            // it, so the overlay must come back for that wait too.
            setGalaxySceneReady(false);
            canvasRefCb(canvasEl);
          }, [galaxyType, galaxyQuality, canvasRefCb]);

          // Time-lapse belongs to the live galaxy view. Stop its global timer when
          // another mode replaces the canvas or when the Galaxy tool unmounts.
          React.useEffect(function () {
            if ((simMode !== 'galaxy' || d.quizMode) && window._galaxyTimeLapse) {
              clearInterval(window._galaxyTimeLapse);
              window._galaxyTimeLapse = null;
            }
            return function () {
              if (window._galaxyTimeLapse) {
                clearInterval(window._galaxyTimeLapse);
                window._galaxyTimeLapse = null;
              }
            };
          }, [simMode, !!d.quizMode]);


          var blackHoleCanvasActive = React.useRef(null);
          // Holds the Real Sky container across renders so its Aladin Lite instance
          // can be disposed when the node genuinely unmounts. Declared here, with the
          // other refs, to keep the hook budget fixed and unconditional.
          var realSkyElementRef = React.useRef(null);
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

              var glowCanvas = document.createElement('canvas'); glowCanvas.setAttribute('aria-hidden', 'true'); glowCanvas.width = glowCanvas.height = 256;
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
            // Named so cleanup can detach them (anonymous listeners could never be removed).
            function onBhDown(e){ drag=true; lastX=e.clientX; lastY=e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch(captureError) {} }
            function onBhMove(e){ if(!drag)return; yaw-=(e.clientX-lastX)*.006; pitch+=(e.clientY-lastY)*.006; lastX=e.clientX; lastY=e.clientY; }
            function onBhUp(){ drag=false; }
            function onBhWheel(e){ e.preventDefault(); distance=Math.max(1.6,Math.min(6,distance+e.deltaY*.002)); }
            function onBhKey(e){ var handled=true; if(e.key==='ArrowLeft')yaw-=.1; else if(e.key==='ArrowRight')yaw+=.1; else if(e.key==='ArrowUp')pitch+=.1; else if(e.key==='ArrowDown')pitch-=.1; else if(e.key==='+'||e.key==='=')distance=Math.max(1.6,distance-.2); else if(e.key==='-')distance=Math.min(6,distance+.2); else if(e.key==='Home'){yaw=.28;pitch=.28;distance=3.25; var status=document.getElementById('black-hole-status'); if(status)status.textContent=__alloT('stem.galaxy.bh_status_camera_reset', 'Camera reset to the starting view.');} else handled=false; if(handled)e.preventDefault(); }
            canvas.addEventListener('pointerdown', onBhDown);
            canvas.addEventListener('pointermove', onBhMove);
            canvas.addEventListener('pointerup', onBhUp);
            canvas.addEventListener('pointercancel', onBhUp);
            canvas.addEventListener('wheel', onBhWheel, {passive:false});
            canvas.addEventListener('keydown', onBhKey);
            function onContextLost(e){ e.preventDefault(); paused=true; var status=document.getElementById('black-hole-status'); if(status)status.textContent='The 3-D graphics context was interrupted. The simulation is paused while it recovers.'; }
            function onContextRestored(){ paused=canvas.getAttribute('data-paused')==='true'; var status=document.getElementById('black-hole-status'); if(status)status.textContent=paused?'The 3-D view recovered and remains paused.':'The 3-D view recovered and is running.'; }
            canvas.addEventListener('webglcontextlost',onContextLost,false);
            canvas.addEventListener('webglcontextrestored',onContextRestored,false);
            function onVisibilityChange(){ pageHidden=!!document.hidden; }
            document.addEventListener('visibilitychange', onVisibilityChange);
            if (window.IntersectionObserver) { observer=new IntersectionObserver(function(entries){ inView=!!(entries[0]&&entries[0].isIntersecting); },{rootMargin:'100px'}); observer.observe(canvas); }
            window.addEventListener('resize', resize);
            var blackHoleCleanedUp = false;
            canvas._blackHoleCleanup = function(){
              if(blackHoleCleanedUp)return;
              blackHoleCleanedUp=true;
              stopped=true;
              cancelAnimationFrame(frame);
              window.removeEventListener('resize',resize);
              document.removeEventListener('visibilitychange',onVisibilityChange);
              canvas.removeEventListener('webglcontextlost',onContextLost);
              canvas.removeEventListener('webglcontextrestored',onContextRestored);
              canvas.removeEventListener('pointerdown',onBhDown);
              canvas.removeEventListener('pointermove',onBhMove);
              canvas.removeEventListener('pointerup',onBhUp);
              canvas.removeEventListener('pointercancel',onBhUp);
              canvas.removeEventListener('wheel',onBhWheel);
              canvas.removeEventListener('keydown',onBhKey);
              if(observer)observer.disconnect();
              while(fallingObjects.length)disposeFalling(fallingObjects.pop());
              if(scene){
                var blackHoleGeometries=new Set(),blackHoleMaterials=new Set(),blackHoleTextures=new Set();
                scene.traverse(function(node){
                  if(node.geometry&&node.geometry.dispose&&!blackHoleGeometries.has(node.geometry)){blackHoleGeometries.add(node.geometry);node.geometry.dispose();}
                  var nodeMaterials=node.material?(Array.isArray(node.material)?node.material:[node.material]):[];
                  nodeMaterials.forEach(function(material){
                    if(!material||blackHoleMaterials.has(material))return;
                    blackHoleMaterials.add(material);
                    Object.keys(material).forEach(function(key){var texture=material[key];if(texture&&texture.isTexture&&texture.dispose&&!blackHoleTextures.has(texture)){blackHoleTextures.add(texture);texture.dispose();}});
                    if(material.dispose)material.dispose();
                  });
                });
              }
              if(renderer){
                if(renderer.renderLists&&renderer.renderLists.dispose)renderer.renderLists.dispose();
                renderer.dispose();
                // The black-hole canvas is being removed, so release its GPU context
                // immediately instead of waiting for browser garbage collection.
                if(renderer.forceContextLoss)renderer.forceContextLoss();
              }
              canvas._blackHoleInit=false;
            };
            if (window.THREE) init(); else { window.StemLab.ensureThree({ orbit: false }).then(init).catch(function(){ var fallback=document.getElementById('black-hole-status'); if(fallback)fallback.textContent='The 3-D library could not load. The labeled black-hole explanation remains available.'; }); }
          }, []);
          React.useEffect(function () {
            var activeBlackHoleCanvas = blackHoleCanvasActive.current;
            if (activeBlackHoleCanvas && activeBlackHoleCanvas._setBlackHolePaused) activeBlackHoleCanvas._setBlackHolePaused(blackHoleEffectivePaused);
          }, [blackHoleEffectivePaused]);
          function generateStars(THREE, count, gType, galaxyType, ageDist) {

            var starGeo = new THREE.BufferGeometry();

            var starPos = new Float32Array(count * 3), starColors = new Float32Array(count * 3), starData = [];

            var starTypeArr = new Float32Array(count), starPhaseArr = new Float32Array(count), starLuminosityArr = new Float32Array(count);

            // Hoisted out of the per-star loop: with 100,000 stars the old code
            // allocated an array and re-ran reduce() once per star.
            var pcts = getMorphologyAgeDistribution(ageDist);

            var pctTotal = pcts.reduce(function (a, b) { return a + b; }, 0);

            var typeColors = STAR_TYPES.map(function (st) { return new THREE.Color(st.color); });

            for (var i = 0; i < count; i++) {

              var x, y, z;

              if (galaxyType === 'elliptical') {

                // A triaxial distribution gives ellipticals genuine 3-D depth.
                // A dense old core blends into a much broader stellar envelope.
                var ellipticalEnvelope = Math.random() < 0.72;
                var ellipticalRadius = Math.pow(Math.random(), ellipticalEnvelope ? 1.8 : 0.62) * 0.78;
                var ellipticalAzimuth = Math.random() * Math.PI * 2;
                var ellipticalCosPolar = Math.random() * 2 - 1;
                var ellipticalSinPolar = Math.sqrt(Math.max(0, 1 - ellipticalCosPolar * ellipticalCosPolar));
                x = Math.cos(ellipticalAzimuth) * ellipticalSinPolar * ellipticalRadius;
                y = ellipticalCosPolar * ellipticalRadius * 0.62;
                z = Math.sin(ellipticalAzimuth) * ellipticalSinPolar * ellipticalRadius * 0.78;
                // Uniform cos(polar) sampling avoids artificial latitude bands.

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

              var cum = 0, roll = Math.random() * pctTotal, typeIdx = 6;

              for (var ti = 0; ti < pcts.length; ti++) { cum += pcts[ti]; if (roll < cum) { typeIdx = ti; break; } }

              var st = STAR_TYPES[typeIdx], c = typeColors[typeIdx];

              starColors[i * 3] = c.r; starColors[i * 3 + 1] = c.g; starColors[i * 3 + 2] = c.b;

              starTypeArr[i] = typeIdx; starPhaseArr[i] = Math.random();
              starLuminosityArr[i] = Math.min(2.4, 0.34 + (1 - typeIdx / 8) * 0.52 + Math.pow(Math.random(), 4.2) * 1.72);

              starData.push({ type: st, x: x, y: y, z: z, idx: i, luminosity: starLuminosityArr[i] });

            }

            starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

            starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

            starGeo.setAttribute('aStarType', new THREE.BufferAttribute(starTypeArr, 1));

            starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhaseArr, 1));
            starGeo.setAttribute('aLuminosity', new THREE.BufferAttribute(starLuminosityArr, 1));

            return { geo: starGeo, data: starData };

          }



          function initGalaxy(canvasEl) {

            if (!canvasEl || !canvasEl.isConnected || !canvasEl._galaxyInit) return;
            var THREE = window.THREE;

            var W = canvasEl.offsetWidth, H = canvasEl.offsetHeight;
            var prefersReducedMotion = false, reducedMotionQuery = null;
            try { reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); prefersReducedMotion = !!reducedMotionQuery.matches; } catch (motionError) {}
            var requestedQuality = canvasEl.getAttribute('data-quality') || 'auto';
            var deviceMemory = Number(navigator.deviceMemory || 4);
            var deviceCores = Number(navigator.hardwareConcurrency || 8);
            var resolvedQuality = requestedQuality === 'auto' ? (deviceMemory >= 8 && deviceCores >= 8 ? 'cinematic' : deviceMemory >= 4 && deviceCores >= 4 ? 'high' : 'balanced') : requestedQuality;
            if (prefersReducedMotion && resolvedQuality === 'cinematic') resolvedQuality = 'high';
            var detailScale = resolvedQuality === 'cinematic' ? 1.7 : resolvedQuality === 'high' ? 1.12 : 0.72;
            var pixelRatioCap = resolvedQuality === 'cinematic' ? 3 : resolvedQuality === 'high' ? 2.25 : 1.5;
            var textureResolutionScale = resolvedQuality === 'cinematic' ? 2 : resolvedQuality === 'high' ? 1.25 : 1;
            canvasEl.setAttribute('data-resolved-quality', resolvedQuality);

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
                // Ask the browser directly rather than inferring: the
                // constructor also throws for reasons that have nothing to do
                // with whether this device can do 3-D at all.
                patchGalaxy({ webglError: true, webglErrorReason: galaxyWebglStatus().supported ? 'contextFailed' : 'noWebgl' });
              }, 0);
              return;
            }

            renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
            if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            if (THREE.ACESFilmicToneMapping) {
              renderer.toneMapping = THREE.ACESFilmicToneMapping;
              renderer.toneMappingExposure = 1.12;
            }
            renderer.setClearColor(0x020208, 1);
            canvasEl.setAttribute('data-render-resolution', Math.round(W * renderer.getPixelRatio()) + 'x' + Math.round(H * renderer.getPixelRatio()));
            var galaxyMaxAnisotropy = renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
            var galaxyTextureAnisotropy = Math.min(galaxyMaxAnisotropy, resolvedQuality === 'cinematic' ? 16 : resolvedQuality === 'high' ? 8 : 4);
            // Enlarge a texture-source canvas, then scale its 2-D context so every
            // caller can keep drawing in the original (logical) coordinate space.
            // Setting canvas.width resets the context transform, so the scale() must
            // come after the resize. `_galaxyUpscaled` makes this idempotent — a second
            // call on the same canvas would otherwise compound the resize.
            function upscaleGalaxyCanvas(canvas, context) {
              if (!canvas || textureResolutionScale <= 1) return context;
              if (canvas._galaxyUpscaled) return context;
              var logicalWidth = canvas.width, logicalHeight = canvas.height;
              canvas.width = Math.max(1, Math.round(logicalWidth * textureResolutionScale));
              canvas.height = Math.max(1, Math.round(logicalHeight * textureResolutionScale));
              canvas._galaxyUpscaled = true;
              var detailedContext = canvas.getContext('2d');
              if (!detailedContext) return context;
              detailedContext.scale(canvas.width / logicalWidth, canvas.height / logicalHeight);
              return detailedContext;
            }
            function tuneGalaxyTexture(texture) {
              if (!texture) return texture;
              var textureImage = texture.image || {};
              var textureIsPowerOfTwo = THREE.MathUtils && THREE.MathUtils.isPowerOfTwo ? THREE.MathUtils.isPowerOfTwo(textureImage.width || 1) && THREE.MathUtils.isPowerOfTwo(textureImage.height || 1) : false;
              var canUseMipmaps = !!(renderer.capabilities && renderer.capabilities.isWebGL2) || textureIsPowerOfTwo;
              texture.anisotropy = canUseMipmaps ? galaxyTextureAnisotropy : 1;
              texture.generateMipmaps = canUseMipmaps;
              if (canUseMipmaps && THREE.LinearMipmapLinearFilter) texture.minFilter = THREE.LinearMipmapLinearFilter;
              else if (THREE.LinearFilter) texture.minFilter = THREE.LinearFilter;
              if (THREE.LinearFilter) texture.magFilter = THREE.LinearFilter;
              texture.needsUpdate = true;
              return texture;
            }


            // ── Layer groups ──

            var bgGroup = new THREE.Group(); bgGroup.name = 'bgStars';

            var armGroup = new THREE.Group(); armGroup.name = 'arms';

            var bulgeGroup = new THREE.Group(); bulgeGroup.name = 'bulge';

            var bhGroup = new THREE.Group(); bhGroup.name = 'blackHole';

            var nebGroup = new THREE.Group(); nebGroup.name = 'nebulae';
            var stellarFeedbackGroup = new THREE.Group(); stellarFeedbackGroup.name = 'stellarFeedbackMicrostructure'; nebGroup.add(stellarFeedbackGroup);
            var feedbackIonizationRims = [], feedbackPillarSprites = [], bokGlobuleSprites = [];

            var gridGroup = new THREE.Group(); gridGroup.name = 'grid'; gridGroup.visible = false;

            var labelGroup = new THREE.Group(); labelGroup.name = 'labels'; labelGroup.visible = false;

            var infraredGroup = new THREE.Group(); infraredGroup.name = 'infrared';
            var infraredThermalGroup = new THREE.Group(); infraredThermalGroup.name = 'infraredThermalEmission'; infraredGroup.add(infraredThermalGroup);
            var infraredThermalMats = [], infraredThermalSprites = [];

            var radioGroup = new THREE.Group(); radioGroup.name = 'radio';
            var dopplerVelocityFieldGroup = new THREE.Group(); dopplerVelocityFieldGroup.name = 'dopplerVelocityField'; radioGroup.add(dopplerVelocityFieldGroup);
            var dopplerVelocityFieldMaterial = null, dopplerVelocitySampleMaterial = null;
            var radioPolarizationGroup = new THREE.Group(); radioPolarizationGroup.name = 'radioMagneticPolarizationField'; radioGroup.add(radioPolarizationGroup);
            var radioPolarizationMaterial = null, faradayRibbonMaterials = [], faradayRibbonObjects = [];
            dopplerVelocityFieldGroup.visible = galaxyType !== 'elliptical';
            radioPolarizationGroup.visible = galaxyType !== 'elliptical';

            var xrayGroup = new THREE.Group(); xrayGroup.name = 'xray';
            var xrayEventGroup = new THREE.Group(); xrayEventGroup.name = 'xrayEnergeticEvents'; xrayGroup.add(xrayEventGroup);
            var xrayThermalShellGroup = new THREE.Group(); xrayThermalShellGroup.name = 'xrayTemperatureStratifiedShockFronts'; xrayEventGroup.add(xrayThermalShellGroup);
            var xrayNuclearOutflowGroup = new THREE.Group(); xrayNuclearOutflowGroup.name = 'xrayLayeredNuclearOutflow'; xrayEventGroup.add(xrayNuclearOutflowGroup);
            var xrayEventSprites = [], xrayShockShells = [], xrayThermalShells = [], xrayThermalShellMaterials = [], xrayOutflowMaterials = [], xrayOutflowSprites = [];

            var darkHaloGroup = new THREE.Group(); darkHaloGroup.name = 'darkMatterHalo';

            scene.add(bgGroup); scene.add(armGroup); scene.add(bulgeGroup);

            scene.add(bhGroup); scene.add(nebGroup); scene.add(gridGroup); scene.add(labelGroup);

            scene.add(infraredGroup); scene.add(radioGroup); scene.add(xrayGroup); scene.add(darkHaloGroup);



            // Background stars

            var bgGeo = new THREE.BufferGeometry(), bgCount = Math.round(2000 * detailScale), bgPos = new Float32Array(bgCount * 3);

            for (var i = 0; i < bgCount; i++) { bgPos[i * 3] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 1] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 2] = (Math.random() - 0.5) * 20; }

            bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));

            bgGroup.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0xccccff, size: 0.015, transparent: true, opacity: 0.3, sizeAttenuation: true })));

            var deepFieldGroup = new THREE.Group(); deepFieldGroup.name = 'deepField';
            var cosmicFilamentGroup = new THREE.Group(); cosmicFilamentGroup.name = 'cosmicFilaments';
            var weakLensingGroup = new THREE.Group(); weakLensingGroup.name = 'weakLensingField';
            bgGroup.add(deepFieldGroup); bgGroup.add(cosmicFilamentGroup); bgGroup.add(weakLensingGroup);
            var deepFieldMats = [], distantGalaxySprites = [], filamentMats = [], weakLensingSources = [], weakLensingArcMats = [];
            var deepFieldGlow = { galaxies: 0.28, filaments: 0.16 };
            var weakLensingVisual = observeMode === 'gravity' ? 1 : 0, weakLensingTarget = weakLensingVisual;
            weakLensingGroup.visible = weakLensingVisual > 0;
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
              var fgCv = document.createElement('canvas'); fgCv.setAttribute('aria-hidden', 'true'); fgCv.width = 96; fgCv.height = 96;
              var fgCtx = fgCv.getContext('2d');
              fgCtx = upscaleGalaxyCanvas(fgCv, fgCtx);
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
              var fgTex = tuneGalaxyTexture(new THREE.CanvasTexture(fgCv));

              var streakCv = document.createElement('canvas'); streakCv.setAttribute('aria-hidden', 'true'); streakCv.width = 192; streakCv.height = 32;
              var streakCtx = streakCv.getContext('2d');
              streakCtx = upscaleGalaxyCanvas(streakCv, streakCtx);
              var streakGrad = streakCtx.createLinearGradient(0, 16, 192, 16);
              streakGrad.addColorStop(0, 'rgba(255,255,255,0)');
              streakGrad.addColorStop(0.28, 'rgba(96,165,250,0.18)');
              streakGrad.addColorStop(0.52, 'rgba(255,255,255,0.92)');
              streakGrad.addColorStop(0.72, 'rgba(244,114,182,0.18)');
              streakGrad.addColorStop(1, 'rgba(255,255,255,0)');
              streakCtx.fillStyle = streakGrad; streakCtx.fillRect(0, 13, 192, 6);
              streakCtx.fillStyle = 'rgba(255,255,255,0.32)'; streakCtx.fillRect(44, 15, 104, 2);
              var streakTex = tuneGalaxyTexture(new THREE.CanvasTexture(streakCv));

              var sweepCv = document.createElement('canvas'); sweepCv.setAttribute('aria-hidden', 'true'); sweepCv.width = 384; sweepCv.height = 48;
              var sweepCtx = sweepCv.getContext('2d');
              sweepCtx = upscaleGalaxyCanvas(sweepCv, sweepCtx);
              var sweepGrad = sweepCtx.createLinearGradient(0, 24, 384, 24);
              sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
              sweepGrad.addColorStop(0.34, 'rgba(125,211,252,0.06)');
              sweepGrad.addColorStop(0.5, 'rgba(255,255,255,0.46)');
              sweepGrad.addColorStop(0.66, 'rgba(244,114,182,0.08)');
              sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
              sweepCtx.fillStyle = sweepGrad; sweepCtx.fillRect(0, 20, 384, 8);
              sweepCtx.fillStyle = 'rgba(255,255,255,0.2)'; sweepCtx.fillRect(118, 23, 148, 2);
              var sweepTex = tuneGalaxyTexture(new THREE.CanvasTexture(sweepCv));

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

              var cloudCv = document.createElement('canvas'); cloudCv.setAttribute('aria-hidden', 'true'); cloudCv.width = 256; cloudCv.height = 256;
              var cloudCtx = cloudCv.getContext('2d');
              cloudCtx = upscaleGalaxyCanvas(cloudCv, cloudCtx);
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
              var cloudTex = tuneGalaxyTexture(new THREE.CanvasTexture(cloudCv));
              for (var cvI = 0; cvI < 5; cvI++) {
                var cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.07 + cvI * 0.012, depthWrite: false, blending: THREE.AdditiveBlending, rotation: cvI * 0.7 });
                var cloud = new THREE.Sprite(cloudMat);
                cloud.position.set(Math.cos(cvI * 1.37) * (2.5 + cvI * 0.28), (cvI - 2) * 0.34, Math.sin(cvI * 1.1) * 2.2 - 2.2);
                cloud.scale.set(1.7 + cvI * 0.28, 1.05 + cvI * 0.2, 1);
                cloud.userData = { baseOpacity: cloudMat.opacity, phase: cvI * 1.9 };
                deepFieldGroup.add(cloud);
                deepFieldMats.push(cloudMat);
              }

              var galaxyCv = document.createElement('canvas'); galaxyCv.setAttribute('aria-hidden', 'true'); galaxyCv.width = 128; galaxyCv.height = 128;
              var galaxyCtx = galaxyCv.getContext('2d');
              galaxyCtx = upscaleGalaxyCanvas(galaxyCv, galaxyCtx);
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
              var distantGalaxyTex = tuneGalaxyTexture(new THREE.CanvasTexture(galaxyCv));
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

              // Weak lensing: background galaxies are stretched tangentially by the
              // inferred halo. This evidence layer appears only in Gravity mode.
              var weakLensingCount = resolvedQuality === 'cinematic' ? 18 : resolvedQuality === 'high' ? 12 : 8;
              for (var wl = 0; wl < weakLensingCount; wl++) {
                var wlAngle = wl / weakLensingCount * Math.PI * 2 + (wl % 3) * 0.09;
                var wlRadius = 1.2 + (wl % 4) * 0.22 + Math.random() * 0.12;
                var wlMat = new THREE.SpriteMaterial({ map: distantGalaxyTex, color: wl % 3 === 0 ? 0xc4b5fd : wl % 3 === 1 ? 0x7dd3fc : 0xf0abfc, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: wlAngle + Math.PI * 0.5 });
                var wlSprite = new THREE.Sprite(wlMat);
                var wlX = Math.cos(wlAngle) * wlRadius;
                var wlY = Math.sin(wlAngle) * wlRadius * 0.72;
                var wlBase = 0.055 + (wl % 5) * 0.008;
                wlSprite.position.set(wlX, wlY, -2.35 - (wl % 3) * 0.08);
                wlSprite.scale.set(wlBase * 2.8, wlBase * 0.58, 1);
                wlSprite.userData = { baseOpacity: 0.18 + (wl % 4) * 0.035, baseScaleX: wlBase * 2.8, baseScaleY: wlBase * 0.58, baseRotation: wlAngle + Math.PI * 0.5, phase: wl * 0.83, shear: 0.45 + (wl % 5) * 0.08 };
                weakLensingGroup.add(wlSprite); weakLensingSources.push(wlSprite);
              }
              var weakLensingArcCount = resolvedQuality === 'cinematic' ? 9 : resolvedQuality === 'high' ? 7 : 5;
              for (var wla = 0; wla < weakLensingArcCount; wla++) {
                var wlaGeometry = new THREE.BufferGeometry();
                var wlaSegments = resolvedQuality === 'cinematic' ? 72 : 48;
                var wlaPositions = new Float32Array(wlaSegments * 3);
                var wlaRadius = 1.1 + (wla % 4) * 0.24;
                var wlaStart = wla / weakLensingArcCount * Math.PI * 2 + 0.18;
                var wlaSpan = 0.24 + (wla % 3) * 0.1;
                for (var wlai = 0; wlai < wlaSegments; wlai++) { var wlaf = wlai / Math.max(1, wlaSegments - 1); var wlat = wlaStart + wlaSpan * wlaf; wlaPositions[wlai * 3] = Math.cos(wlat) * wlaRadius; wlaPositions[wlai * 3 + 1] = Math.sin(wlat) * wlaRadius * 0.72; wlaPositions[wlai * 3 + 2] = -2.32; }
                wlaGeometry.setAttribute('position', new THREE.BufferAttribute(wlaPositions, 3));
                var wlaMaterial = new THREE.LineBasicMaterial({ color: wla % 2 ? 0x67e8f9 : 0xd8b4fe, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                var wlaLine = new THREE.Line(wlaGeometry, wlaMaterial); wlaLine.userData = { baseOpacity: 0.26 + (wla % 3) * 0.04, phase: wla * 1.1 }; wlaLine.renderOrder = 1;
                weakLensingGroup.add(wlaLine); weakLensingArcMats.push(wlaMaterial);
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

            // Seed the population from the restored cosmic age so a session reopened
            // at (say) 0.4 Gyr does not start with present-day star colours.
            var starResult = generateStars(THREE, starCount, gType, galaxyType, getAgeDistribution(cosmicAge));

            var starShaderMat = new THREE.ShaderMaterial({

              uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uDetail: { value: Math.min(1.5, detailScale) }, uPointScale: { value: morphologyVisual.pointScale }, uZoomPointScale: { value: 1 }, uZoomOpacity: { value: 1 }, uStellarOpacity: { value: morphologyVisual.stellarOpacity }, uDiffractionScale: { value: morphologyVisual.diffractionScale }, uElliptical: { value: galaxyType === 'elliptical' ? 1 : 0 }, uRotMode: { value: rotMode === 'rigid' ? 0 : rotMode === 'keplerian' ? 1 : 2 }, uObserve: { value: observeMode === 'infrared' ? 1 : observeMode === 'radio' ? 2 : observeMode === 'xray' ? 3 : observeMode === 'gravity' ? 4 : 0 }, uCameraDir: { value: new THREE.Vector3(0, 1, 0) }, uOpticalDetail: { value: resolvedQuality === 'cinematic' ? 1.35 : resolvedQuality === 'high' ? 1 : 0.78 }, uFocusDepth: { value: 1.2 }, uDepthOfField: { value: 0 } },

              vertexShader: [

                'attribute float aStarType;',

                'attribute float aPhase;',

                'attribute float aLuminosity;',

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'varying float vBright;',

                'varying float vLuminosity;',

                'varying float vDepthCue;',

                'varying float vFocusDefocus;',

                'uniform float uTime;',

                'uniform float uPR;',

                'uniform float uDetail;',
                'uniform float uPointScale;',
                'uniform float uZoomPointScale;',
                'uniform float uZoomOpacity;',
                'uniform float uElliptical;',

                'uniform float uRotMode;',

                'uniform vec3 uCameraDir;',

                'uniform float uFocusDepth;',

                'uniform float uDepthOfField;',

                'void main() {',

                '  vSC = color;',

                '  vType = aStarType;',

                '  vLuminosity = aLuminosity;',

                '  float sz = (5.0 - aStarType * 0.5) * mix(0.76, 1.42, clamp(aLuminosity / 2.4, 0.0, 1.0));',

                '  float twinkleSpeed = 0.72 + aStarType * 0.18;',

                '  vBright = 1.0 - smoothstep(1.4, 5.8, aStarType);',

                '  float twinkle = 0.5 + 0.5 * sin(uTime * twinkleSpeed + aPhase * 6.283);',

                '  vA = mix(0.9, 0.64 + 0.36 * twinkle, vBright);',

                // Spiral stars share a disk plane; elliptical stars instead occupy
                // differently tilted orbital planes and are pressure-supported.
                '  vec3 p = position;',
                '  float rr = length(position.xz);',
                '  if (uElliptical > 0.5) {',
                '    float radius3 = length(position);',
                '    vec3 orbitAxis = normalize(vec3(sin(aPhase * 6.283), 0.45 + 0.35 * cos(aPhase * 10.2), cos(aPhase * 6.283)));',
                '    float orbitRate = 0.009 * (0.72 + fract(aPhase * 5.73) * 0.66) / sqrt(max(radius3, 0.08));',
                '    float orbitAngle = uTime * orbitRate;',
                '    float orbitCos = cos(orbitAngle);',
                '    float orbitSin = sin(orbitAngle);',
                '    p = position * orbitCos + cross(orbitAxis, position) * orbitSin + orbitAxis * dot(orbitAxis, position) * (1.0 - orbitCos);',
                '    rr = length(p);',
                '  } else if (rr > 0.001) {',
                '    float a0 = atan(position.z, position.x);',
                '    float omega = uRotMode < 0.5 ? 0.018 : (uRotMode < 1.5 ? 0.012 / pow(max(rr, 0.06), 1.5) : 0.03 / max(rr, 0.06));',
                '    float aa = a0 + uTime * omega;',
                '    p = vec3(cos(aa) * rr, position.y, sin(aa) * rr);',
                '  }',
                '  vDepthCue = clamp(0.5 + 0.5 * dot(p, uCameraDir) / max(length(p), 0.08), 0.0, 1.0);',

                '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',

                '  vFocusDefocus = smoothstep(0.08, 0.72, abs(-mv.z - uFocusDepth) / max(uFocusDepth, 0.2)) * uDepthOfField;',

                '  gl_PointSize = min(sz * uPR * (84.0 / max(-mv.z, 1.0)) * (1.0 + vFocusDefocus * 0.28), mix(13.0, 24.0, min(uDetail, 1.5))) * uPointScale * uZoomPointScale;',

                '  gl_Position = projectionMatrix * mv;',

                '}'

              ].join('\n'),

              fragmentShader: [

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'varying float vBright;',

                'varying float vLuminosity;',

                'varying float vDepthCue;',

                'varying float vFocusDefocus;',

                'uniform float uObserve;',

                'uniform float uOpticalDetail;',
                'uniform float uStellarOpacity;',
                'uniform float uZoomOpacity;',
                'uniform float uDiffractionScale;',

                // ── Star profile tuning ───────────────────────────────────────
                // These three control how a single star reads. The old profile used
                // a plain smoothstep, i.e. a broad soft disc filling the whole point
                // sprite: at half-radius it was still at 50% alpha. Stacking 25,000+
                // of those additively turned the disk into a milky wash instead of
                // resolved stars, and it fed the bloom threshold a flat grey rather
                // than bright cores.
                //
                // Concentrating the same energy into a tight core with a faint
                // extended halo is the astrophotography profile: crisper stars, more
                // apparent resolution, and bloom that picks out genuinely bright
                // stars instead of blooming everything uniformly.
                //   CORE_TIGHTNESS  higher = smaller, sharper core (was effectively 1.0)
                //   CORE_GAIN       peak brightness, compensates for the tighter core
                //   HALO_GAIN       how much of the wide falloff survives around it
                'const float CORE_TIGHTNESS = 2.6;',
                'const float CORE_GAIN = 1.05;',
                'const float HALO_GAIN = 0.10;',

                'void main() {',

                '  float d = length(gl_PointCoord - 0.5) * 2.0;',

                '  if (d > 1.0) discard;',

                '  float glow = exp(-d * d * 7.2);',

                '  float core = pow(smoothstep(1.0, 0.0, d), CORE_TIGHTNESS);',

                '  vec2 q = abs(gl_PointCoord - 0.5);',

                '  float diffraction = max(exp(-q.x * 52.0) * (1.0 - smoothstep(0.05, 0.5, q.y)), exp(-q.y * 52.0) * (1.0 - smoothstep(0.05, 0.5, q.x))) * vBright * mix(0.72, 1.12, clamp(uOpticalDetail / 1.35, 0.0, 1.0)) * uDiffractionScale;',

                '  float airyRing = exp(-pow((d - 0.46) * 18.0, 2.0)) * vBright * clamp(vLuminosity / 2.4, 0.0, 1.0);',

                '  float chromaticFringe = exp(-pow((d - 0.64) * 15.0, 2.0)) * vBright * clamp(vLuminosity / 2.1, 0.0, 1.0) * uOpticalDetail;',

                '  float microCore = pow(max(0.0, 1.0 - d), 18.0);',

                '  float bokehHalo = exp(-d * d * 2.6) * vFocusDefocus;',

                '  float brightness = mix(1.0, 0.5, vType / 6.0) * mix(0.72, 1.38, clamp(vLuminosity / 2.4, 0.0, 1.0));',

                '  vec3 col = vSC * (0.2 + 0.8 * glow) * brightness;',
                '  if (uObserve < 0.5) {',

                '    float farSide = 1.0 - vDepthCue;',

                '    col = mix(col, col * vec3(1.08, 0.78, 0.62), farSide * 0.24);',

                '    col *= mix(0.84, 1.06, vDepthCue);',

                '  }',

                '  col += mix(vec3(0.52, 0.72, 1.0), vec3(1.0, 0.82, 0.58), vType / 6.0) * (diffraction * 0.55 + airyRing * 0.24 + microCore * 0.4);',

                '  col += mix(vec3(0.32, 0.58, 1.0), vec3(1.0, 0.34, 0.16), smoothstep(0.38, 0.72, d)) * chromaticFringe * 0.16;',

                '  col += mix(vec3(0.34, 0.56, 1.0), vec3(1.0, 0.54, 0.3), vType / 6.0) * bokehHalo * 0.055;',

                '  float focusedAlpha = core * vA * CORE_GAIN + glow * HALO_GAIN * vA + diffraction * 0.34 + airyRing * 0.12 + chromaticFringe * 0.045 + microCore * 0.22;',

                '  float alpha = min(1.0, focusedAlpha * (1.0 - vFocusDefocus * 0.24) + bokehHalo * 0.075);',

                '  if (uObserve < 0.5) alpha *= mix(0.82, 1.06, vDepthCue);',

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

                '  gl_FragColor = vec4(col, alpha * uStellarOpacity * uZoomOpacity);',

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

            var visualGlow = { disk: 0.16 * morphologyVisual.diskGlow, arms: 0.18 * morphologyVisual.armGlow, core: 0.42 * morphologyVisual.coreGlow };
            var diskSheenMat = null, armGlowMat = null, coreFlare = null, coreFlareBaseScaleX = galaxyType === 'elliptical' ? 0.34 : 0.58, coreFlareBaseScaleY = galaxyType === 'elliptical' ? 0.2 : 0.24;
            var coreLightBars = [];
            var streamlineGroup = new THREE.Group(); streamlineGroup.name = 'orbitalStreamlines'; streamlineGroup.renderOrder = 3; armGroup.add(streamlineGroup);
            var streamlineMats = [], streamlineGlow = 1;
            (function () {
              if (galaxyType === 'elliptical') return;
              var streamCount = galaxyType === 'irregular' ? 5 : 7;
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
            // Nested luminosity ridges keep the arm pitch readable at high zoom while
            // short, branching spurs break up the mathematically perfect spiral.
            var spiralRidgeGroup = new THREE.Group(); spiralRidgeGroup.name = 'spiralLuminosityRidges'; spiralRidgeGroup.renderOrder = 3; armGroup.add(spiralRidgeGroup);
            var spiralSpurGroup = new THREE.Group(); spiralSpurGroup.name = 'spiralArmSpurs'; spiralRidgeGroup.add(spiralSpurGroup);
            var spiralRidgeMaterials = [], spiralSpurMaterials = [], spiralRidgeGlow = 1;
            (function () {
              if (galaxyType === 'elliptical' || galaxyType === 'irregular') return;
              var ridgeArmCount = gType.arms || 4;
              var ridgeStrands = resolvedQuality === 'cinematic' ? 5 : resolvedQuality === 'high' ? 4 : 3;
              var ridgeSegments = resolvedQuality === 'cinematic' ? 224 : resolvedQuality === 'high' ? 160 : 104;
              for (var ridgeArm = 0; ridgeArm < ridgeArmCount; ridgeArm++) {
                for (var ridgeStrand = 0; ridgeStrand < ridgeStrands; ridgeStrand++) {
                  var ridgePoints = [];
                  var strandOffset = (ridgeStrand - (ridgeStrands - 1) * 0.5) * 0.016;
                  for (var ridgeStep = 0; ridgeStep <= ridgeSegments; ridgeStep++) {
                    var ridgeT = ridgeStep / ridgeSegments;
                    var ridgeRadius = 0.12 + ridgeT * 0.78;
                    var ridgeFeather = Math.sin(ridgeT * Math.PI * (5 + ridgeStrand) + ridgeArm * 1.7) * (0.0025 + ridgeT * 0.005);
                    var ridgeAngle = ridgeArm / ridgeArmCount * Math.PI * 2 + ridgeRadius * (gType.windTightness || 2.5) + strandOffset + ridgeFeather;
                    ridgePoints.push(new THREE.Vector3(Math.cos(ridgeAngle) * ridgeRadius, 0.003 + (ridgeStrand % 2 ? -1 : 1) * 0.0018 + Math.sin(ridgeT * Math.PI * 3 + ridgeArm) * 0.0012, Math.sin(ridgeAngle) * ridgeRadius));
                  }
                  var ridgeMaterial = new THREE.LineBasicMaterial({ color: ridgeStrand % 3 === 0 ? 0xbfdbfe : ridgeStrand % 3 === 1 ? 0xf9a8d4 : 0xffedd5, transparent: true, opacity: 0.028 + (ridgeStrands - ridgeStrand) * 0.006, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                  ridgeMaterial.userData = { baseOpacity: ridgeMaterial.opacity, phase: ridgeArm * 1.4 + ridgeStrand * 0.72 };
                  var ridgeLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ridgePoints), ridgeMaterial); ridgeLine.renderOrder = 3; spiralRidgeGroup.add(ridgeLine); spiralRidgeMaterials.push(ridgeMaterial);
                }
              }
              var spurCount = ridgeArmCount * (resolvedQuality === 'cinematic' ? 9 : resolvedQuality === 'high' ? 7 : 4);
              for (var spurIndex = 0; spurIndex < spurCount; spurIndex++) {
                var spurPoints = [], spurSegments = resolvedQuality === 'cinematic' ? 42 : resolvedQuality === 'high' ? 30 : 20;
                var spurArm = spurIndex % ridgeArmCount, spurBaseRadius = 0.22 + ((spurIndex * 0.173) % 0.58);
                for (var spurStep = 0; spurStep <= spurSegments; spurStep++) {
                  var spurT = spurStep / spurSegments, spurRadius = spurBaseRadius + spurT * (0.035 + (spurIndex % 4) * 0.009);
                  var parentAngle = spurArm / ridgeArmCount * Math.PI * 2 + spurRadius * (gType.windTightness || 2.5);
                  var spurAngle = parentAngle - 0.018 + spurT * (0.1 + (spurIndex % 3) * 0.024) + Math.sin(spurT * Math.PI) * 0.012;
                  spurPoints.push(new THREE.Vector3(Math.cos(spurAngle) * spurRadius, 0.005 + Math.sin(spurT * Math.PI) * 0.0025, Math.sin(spurAngle) * spurRadius));
                }
                var spurMaterial = new THREE.LineBasicMaterial({ color: spurIndex % 4 === 0 ? 0xf0abfc : spurIndex % 3 === 0 ? 0xfde68a : 0x93c5fd, transparent: true, opacity: 0.025 + (spurIndex % 5) * 0.004, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                spurMaterial.userData = { baseOpacity: spurMaterial.opacity, phase: spurIndex * 0.83 };
                var spurLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(spurPoints), spurMaterial); spurLine.renderOrder = 3; spiralSpurGroup.add(spurLine); spiralSpurMaterials.push(spurMaterial);
              }
            })();
            var sparkleGroup = new THREE.Group(); sparkleGroup.name = 'stellarGlints'; sparkleGroup.renderOrder = 3; armGroup.add(sparkleGroup);
            var sparkleSprites = [], chromaticHaloSprites = [];
            var chromaticHaloGroup = new THREE.Group(); chromaticHaloGroup.name = 'luminousChromaticHalos'; chromaticHaloGroup.renderOrder = 2; armGroup.add(chromaticHaloGroup);
            var chromaticHaloMode = 1, haloScatteringMode = 1;
            var stellarWindBowShockGroup = new THREE.Group(); stellarWindBowShockGroup.name = 'stellarWindBowShocks'; stellarWindBowShockGroup.visible = false; armGroup.add(stellarWindBowShockGroup);
            var stellarWindBowShocks = [], bowShockMode = 1;
            var sparkleTex = null, chromaticHaloTex = null;

            (function () {
              var softCv = document.createElement('canvas'); softCv.setAttribute('aria-hidden', 'true'); softCv.width = 64; softCv.height = 64;
              var softCtx = softCv.getContext('2d');
              softCtx = upscaleGalaxyCanvas(softCv, softCtx);
              var softGrad = softCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
              softGrad.addColorStop(0, 'rgba(255,255,255,1)');
              softGrad.addColorStop(0.28, 'rgba(255,255,255,0.42)');
              softGrad.addColorStop(1, 'rgba(255,255,255,0)');
              softCtx.fillStyle = softGrad; softCtx.fillRect(0, 0, 64, 64);
              var softTex = tuneGalaxyTexture(new THREE.CanvasTexture(softCv));

              var diskCv = document.createElement('canvas'); diskCv.setAttribute('aria-hidden', 'true'); diskCv.width = 512; diskCv.height = 512;
              var diskCtx = diskCv.getContext('2d');
              diskCtx = upscaleGalaxyCanvas(diskCv, diskCtx);
              var diskGrad = diskCtx.createRadialGradient(256, 256, 0, 256, 256, 245);
              if (galaxyType === 'elliptical') {
                diskGrad.addColorStop(0, 'rgba(255,244,220,0.34)');
                diskGrad.addColorStop(0.18, 'rgba(255,210,150,0.18)');
                diskGrad.addColorStop(0.48, 'rgba(225,160,95,0.09)');
                diskGrad.addColorStop(0.78, 'rgba(165,95,55,0.035)');
                diskGrad.addColorStop(1, 'rgba(2,6,23,0)');
              } else {
                diskGrad.addColorStop(0, 'rgba(255,239,196,0.56)');
                diskGrad.addColorStop(0.16, 'rgba(251,191,36,0.24)');
                diskGrad.addColorStop(0.44, 'rgba(96,165,250,0.13)');
                diskGrad.addColorStop(0.72, 'rgba(217,70,239,0.08)');
                diskGrad.addColorStop(1, 'rgba(2,6,23,0)');
              }
              diskCtx.fillStyle = diskGrad; diskCtx.fillRect(0, 0, 512, 512);
              if (galaxyType !== 'elliptical') {
                diskCtx.save(); diskCtx.translate(256, 256); diskCtx.scale(1, 0.68);
                var diskArms = Math.max(2, gType.arms || 3);
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
              }
              var diskTex = tuneGalaxyTexture(new THREE.CanvasTexture(diskCv));
              var diskSheen;
              if (galaxyType === 'elliptical') {
                diskSheenMat = new THREE.SpriteMaterial({ map: diskTex, transparent: true, opacity: visualGlow.disk, depthWrite: false, blending: THREE.AdditiveBlending });
                diskSheen = new THREE.Sprite(diskSheenMat);
                diskSheen.scale.set(1.42, 0.86, 1);
              } else {
                diskSheenMat = new THREE.MeshBasicMaterial({ map: diskTex, transparent: true, opacity: visualGlow.disk, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                diskSheen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), diskSheenMat);
                diskSheen.rotation.x = Math.PI * 0.5;
              }
              diskSheen.position.y = -0.012;
              diskSheen.renderOrder = -2;
              armGroup.add(diskSheen);

              var glowCount = Math.round((galaxyType === 'elliptical' ? 1800 : galaxyType === 'irregular' ? 2400 : 4200) * detailScale);
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
              armGlowMat = new THREE.PointsMaterial({ size: morphologyVisual.glowPointSize, map: softTex, vertexColors: true, transparent: true, opacity: visualGlow.arms, depthWrite: false, blending: THREE.AdditiveBlending });
              var armGlowPoints = new THREE.Points(glowGeo, armGlowMat);
              armGlowPoints.renderOrder = 0;
              armGroup.add(armGlowPoints);

              // A second, subpixel stellar field resolves arm knots and faint disk light
              // without inflating the selectable scientific star catalogue.
              var microStarCount = resolvedQuality === 'cinematic' ? 18000 : resolvedQuality === 'high' ? 7200 : 2400;
              var microStarGeo = new THREE.BufferGeometry();
              var microStarPos = new Float32Array(microStarCount * 3), microStarCol = new Float32Array(microStarCount * 3);
              for (var ms = 0; ms < microStarCount; ms++) {
                var msRadius = Math.pow(Math.random(), galaxyType === 'elliptical' ? 0.48 : 0.66) * (galaxyType === 'elliptical' ? 0.72 : 0.88);
                var msAngle, msY;
                if (galaxyType === 'elliptical') {
                  msAngle = Math.random() * Math.PI * 2; msY = (Math.random() - 0.5) * 0.34 * (1 - msRadius * 0.55);
                } else if (galaxyType === 'irregular') {
                  msAngle = Math.random() * Math.PI * 2 + Math.sin(ms * 1.91) * 0.46; msY = (Math.random() - 0.5) * 0.16;
                } else {
                  var msArm = ms % (gType.arms || 4);
                  msAngle = msArm / (gType.arms || 4) * Math.PI * 2 + msRadius * (gType.windTightness || 2.5) + (Math.random() - 0.5) * (0.045 + msRadius * 0.07);
                  msY = (Math.random() - 0.5) * 0.038 * (1 - msRadius * 0.45);
                }
                microStarPos[ms * 3] = Math.cos(msAngle) * msRadius + (Math.random() - 0.5) * 0.012;
                microStarPos[ms * 3 + 1] = msY;
                microStarPos[ms * 3 + 2] = Math.sin(msAngle) * msRadius * (galaxyType === 'elliptical' ? 0.78 : 1) + (Math.random() - 0.5) * 0.012;
                var microHue = galaxyType === 'elliptical' ? 0.1 + Math.random() * 0.045 : Math.random() < 0.58 ? 0.57 + Math.random() * 0.045 : Math.random() < 0.82 ? 0.92 + Math.random() * 0.055 : 0.11;
                var microColor = new THREE.Color().setHSL(microHue, 0.62 + Math.random() * 0.26, 0.44 + Math.random() * 0.24);
                microStarCol[ms * 3] = microColor.r; microStarCol[ms * 3 + 1] = microColor.g; microStarCol[ms * 3 + 2] = microColor.b;
              }
              microStarGeo.setAttribute('position', new THREE.BufferAttribute(microStarPos, 3)); microStarGeo.setAttribute('color', new THREE.BufferAttribute(microStarCol, 3));
              var microStarMat = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.012 : 0.009, map: softTex, vertexColors: true, transparent: true, opacity: (resolvedQuality === 'cinematic' ? 0.46 : 0.34) * morphologyVisual.microStarOpacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
              var microStarPoints = new THREE.Points(microStarGeo, microStarMat); microStarPoints.renderOrder = 1; armGroup.add(microStarPoints);

              var spCv = document.createElement('canvas'); spCv.setAttribute('aria-hidden', 'true'); spCv.width = 96; spCv.height = 96;
              var spCtx = spCv.getContext('2d');
              spCtx = upscaleGalaxyCanvas(spCv, spCtx);
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
              sparkleTex = tuneGalaxyTexture(new THREE.CanvasTexture(spCv));
              var chromaticCv = document.createElement('canvas'); chromaticCv.setAttribute('aria-hidden', 'true'); chromaticCv.width = 192; chromaticCv.height = 192;
              var chromaticCtx = upscaleGalaxyCanvas(chromaticCv, chromaticCv.getContext('2d'));
              [{ x: 91, stops: ['rgba(96,165,250,0.34)', 'rgba(96,165,250,0.12)', 'rgba(96,165,250,0.04)'] }, { x: 96, stops: ['rgba(255,255,255,0.46)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.055)'] }, { x: 101, stops: ['rgba(251,113,133,0.3)', 'rgba(251,113,133,0.11)', 'rgba(251,113,133,0.038)'] }].forEach(function (channel) { var channelGlow = chromaticCtx.createRadialGradient(channel.x, 96, 0, channel.x, 96, 78); channelGlow.addColorStop(0, channel.stops[0]); channelGlow.addColorStop(0.16, channel.stops[1]); channelGlow.addColorStop(0.56, channel.stops[2]); channelGlow.addColorStop(1, 'rgba(0,0,0,0)'); chromaticCtx.fillStyle = channelGlow; chromaticCtx.fillRect(12, 12, 168, 168); });
              chromaticCtx.strokeStyle = 'rgba(255,255,255,0.18)'; chromaticCtx.lineWidth = 1.5; chromaticCtx.beginPath(); chromaticCtx.arc(96, 96, 58, 0, Math.PI * 2); chromaticCtx.stroke();
              chromaticHaloTex = tuneGalaxyTexture(new THREE.CanvasTexture(chromaticCv));

              var flareCv = document.createElement('canvas'); flareCv.setAttribute('aria-hidden', 'true'); flareCv.width = 192; flareCv.height = 192;
              var flareCtx = flareCv.getContext('2d');
              flareCtx = upscaleGalaxyCanvas(flareCv, flareCtx);
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
              var flareTex = tuneGalaxyTexture(new THREE.CanvasTexture(flareCv));
              coreFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: visualGlow.core, depthWrite: false, blending: THREE.AdditiveBlending, rotation: 0 }));
              var coreFlareScaleX = galaxyType === 'elliptical' ? 0.34 : 0.58, coreFlareScaleY = galaxyType === 'elliptical' ? 0.2 : 0.24;
              coreFlare.scale.set(coreFlareBaseScaleX, coreFlareBaseScaleY, 1);
              coreFlare.renderOrder = 4;
              coreFlare.visible = galaxyType !== 'elliptical';
              bulgeGroup.add(coreFlare);

              var barCv = document.createElement('canvas'); barCv.setAttribute('aria-hidden', 'true'); barCv.width = 384; barCv.height = 48;
              var barCtx = barCv.getContext('2d');
              barCtx = upscaleGalaxyCanvas(barCv, barCtx);
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
              var barTex = tuneGalaxyTexture(new THREE.CanvasTexture(barCv));
              (galaxyType === 'elliptical' ? [] : [0, 1]).forEach(function (barIdx) {
                var barMat = new THREE.SpriteMaterial({ map: barTex, transparent: true, opacity: barIdx ? 0.16 : 0.24, depthWrite: false, blending: THREE.AdditiveBlending, rotation: barIdx ? 0.08 : -0.05 });
                var barSprite = new THREE.Sprite(barMat);
                barSprite.scale.set(barIdx ? 0.82 : 1.12, barIdx ? 0.065 : 0.08, 1);
                barSprite.userData = { baseOpacity: barMat.opacity, baseScaleX: barSprite.scale.x, baseScaleY: barSprite.scale.y, phase: barIdx * 1.7 };
                barSprite.renderOrder = 5;
                bulgeGroup.add(barSprite);
                coreLightBars.push(barSprite);
              });
            })();

            function setLuminousOverlayOrbitData(sprite, star) {
              var radius = Math.sqrt(star.x * star.x + star.z * star.z);
              sprite.userData.radius = radius; sprite.userData.baseAngle = Math.atan2(star.z, star.x); sprite.userData.baseY = star.y;
            }

            function updateLuminousOverlayOrbit(sprite, elapsedTime) {
              if (!sprite || !sprite.userData) return;
              var radius = sprite.userData.radius || 0, mode = starShaderMat.uniforms.uRotMode.value;
              var omega = mode < 0.5 ? 0.018 : mode < 1.5 ? 0.012 / Math.pow(Math.max(radius, 0.08), 1.5) : 0.03 / Math.max(radius, 0.08);
              var angle = (sprite.userData.baseAngle || 0) + elapsedTime * omega;
              sprite.position.set(Math.cos(angle) * radius, sprite.userData.baseY || 0, Math.sin(angle) * radius);
            }

            function rebuildSparkles() {
              sparkleSprites.forEach(function (s) { sparkleGroup.remove(s); if (s.material && s.material.dispose) s.material.dispose(); });
              chromaticHaloSprites.forEach(function (s) { chromaticHaloGroup.remove(s); if (s.material && s.material.dispose) s.material.dispose(); });
              sparkleSprites = []; chromaticHaloSprites = [];
              stellarWindBowShocks.forEach(function (bowShock) { stellarWindBowShockGroup.remove(bowShock); if (bowShock.geometry && bowShock.geometry.dispose) bowShock.geometry.dispose(); if (bowShock.material && bowShock.material.dispose) bowShock.material.dispose(); });
              stellarWindBowShocks = [];
              if (!sparkleTex || !starData || !starData.length) return;
              var sparkleCount = Math.round(Math.min(96, Math.max(24, Math.floor(starData.length / 650))) * Math.min(1.25, detailScale) * morphologyVisual.sparkleDensity);
              for (var si2 = 0; si2 < sparkleCount; si2++) {
                var idx = Math.floor(Math.random() * starData.length);
                for (var tries = 0; tries < 8 && starData[idx].type && ['O', 'B', 'A', 'F'].indexOf(starData[idx].type.id) < 0; tries++) idx = Math.floor(Math.random() * starData.length);
                var sd2 = starData[idx];
                var sm = new THREE.SpriteMaterial({ map: sparkleTex, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, color: sd2.type && sd2.type.color ? sd2.type.color : '#ffffff' });
                var sprite = new THREE.Sprite(sm); sprite.position.set(sd2.x, sd2.y + 0.002, sd2.z);
                var baseScale = (0.018 + Math.random() * 0.026) * morphologyVisual.sparkleScale; sprite.scale.set(baseScale, baseScale, 1);
                sprite.userData = { baseScale: baseScale, phase: Math.random() * Math.PI * 2, baseOpacity: 0.12 + Math.random() * 0.18 }; setLuminousOverlayOrbitData(sprite, sd2);
                sparkleGroup.add(sprite); sparkleSprites.push(sprite);
              }
              if (!chromaticHaloTex) return;
              var luminousCandidates = starData.slice().sort(function (a, b) { return (b.luminosity || 0) - (a.luminosity || 0); });
              var chromaticHaloCount = Math.min(luminousCandidates.length, Math.round((resolvedQuality === 'cinematic' ? 68 : resolvedQuality === 'high' ? 42 : 22) * morphologyVisual.sparkleDensity));
              for (var chromaticIndex = 0; chromaticIndex < chromaticHaloCount; chromaticIndex++) {
                var luminousStar = luminousCandidates[chromaticIndex], luminosity = Math.max(0.5, luminousStar.luminosity || 1);
                var haloMaterial = new THREE.SpriteMaterial({ map: chromaticHaloTex, color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
                var haloSprite = new THREE.Sprite(haloMaterial), haloScale = (0.032 + Math.min(0.052, Math.sqrt(luminosity) * 0.014)) * morphologyVisual.sparkleScale; haloSprite.position.set(luminousStar.x, luminousStar.y, luminousStar.z); haloSprite.scale.set(haloScale, haloScale, 1); haloSprite.userData = { baseScale: haloScale, baseOpacity: 0.055 + Math.min(0.1, luminosity * 0.018), phase: Math.random() * Math.PI * 2, luminosity: luminosity }; setLuminousOverlayOrbitData(haloSprite, luminousStar); haloSprite.renderOrder = 2; chromaticHaloGroup.add(haloSprite); chromaticHaloSprites.push(haloSprite);
              }
              var bowShockCount = galaxyType === 'elliptical' ? 0 : Math.min(luminousCandidates.length, resolvedQuality === 'cinematic' ? 34 : resolvedQuality === 'high' ? 22 : 12);
              for (var bowShockIndex = 0; bowShockIndex < bowShockCount; bowShockIndex++) {
                var windStar = luminousCandidates[bowShockIndex], windLuminosity = Math.max(0.5, windStar.luminosity || 1), bowShockScale = 0.014 + Math.min(0.024, Math.sqrt(windLuminosity) * 0.0045);
                var bowShockMaterial = new THREE.MeshBasicMaterial({ color: bowShockIndex % 5 === 0 ? 0xf9a8d4 : bowShockIndex % 3 === 0 ? 0xfde68a : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                var bowShock = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, resolvedQuality === 'cinematic' ? 72 : 48, 1, -0.92, 1.84), bowShockMaterial);
                bowShock.position.set(windStar.x, windStar.y + 0.0025, windStar.z); bowShock.scale.set(bowShockScale * 0.72, bowShockScale, bowShockScale);
                bowShock.userData = { baseOpacity: 0.09 + Math.min(0.14, windLuminosity * 0.012), baseScale: bowShockScale, phase: bowShockIndex * 1.17, upstreamAngle: Math.atan2(windStar.z, windStar.x) + Math.PI * 0.5, luminosity: windLuminosity };
                setLuminousOverlayOrbitData(bowShock, windStar); bowShock.renderOrder = 7; stellarWindBowShockGroup.add(bowShock); stellarWindBowShocks.push(bowShock);
              }
            }
            rebuildSparkles();
            var layeredHaloScatteringGroup = new THREE.Group(); layeredHaloScatteringGroup.name = 'cameraLayeredHaloScattering'; scene.add(layeredHaloScatteringGroup);
            var layeredHaloScatteringSprites = [], haloScatteringCameraDirection = new THREE.Vector3();
            (function () {
              if (!chromaticHaloTex) return;
              var haloScatteringLayerCount = resolvedQuality === 'cinematic' ? 8 : resolvedQuality === 'high' ? 5 : 3;
              for (var haloScatteringLayer = 0; haloScatteringLayer < haloScatteringLayerCount; haloScatteringLayer++) { var scatteringMaterial = new THREE.SpriteMaterial({ map: chromaticHaloTex, color: haloScatteringLayer % 4 === 0 ? 0xfde68a : haloScatteringLayer % 3 === 0 ? 0xf9a8d4 : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: haloScatteringLayer * 0.37 }); var scatteringSprite = new THREE.Sprite(scatteringMaterial), scatteringScaleX = 1.9 + haloScatteringLayer * 0.18, scatteringScaleY = scatteringScaleX * (0.62 + haloScatteringLayer % 3 * 0.055); scatteringSprite.scale.set(scatteringScaleX, scatteringScaleY, 1); scatteringSprite.userData = { baseOpacity: 0.007 + haloScatteringLayer % 4 * 0.003, baseScaleX: scatteringScaleX, baseScaleY: scatteringScaleY, depthOffset: (haloScatteringLayer - (haloScatteringLayerCount - 1) * 0.5) * 0.035, phase: haloScatteringLayer * 0.82, drift: (haloScatteringLayer % 2 ? -1 : 1) * 0.00004 }; scatteringSprite.renderOrder = -3; layeredHaloScatteringGroup.add(scatteringSprite); layeredHaloScatteringSprites.push(scatteringSprite); }
            })();



            // Central bulge

            var bulgeGeo = new THREE.BufferGeometry(), bulgeCount = Math.round(800 * detailScale);

            var bulgePos = new Float32Array(bulgeCount * 3), bulgeCol = new Float32Array(bulgeCount * 3);

            for (var i = 0; i < bulgeCount; i++) {

              var r = Math.pow(Math.random(), 2) * 0.12, th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI * 0.4;

              bulgePos[i * 3] = Math.cos(th) * Math.cos(ph) * r; bulgePos[i * 3 + 1] = Math.sin(ph) * r * 0.5; bulgePos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;

              var warmth = 0.8 + Math.random() * 0.2; bulgeCol[i * 3] = warmth; bulgeCol[i * 3 + 1] = warmth * 0.85; bulgeCol[i * 3 + 2] = warmth * 0.5;

            }

            bulgeGeo.setAttribute('position', new THREE.BufferAttribute(bulgePos, 3));

            bulgeGeo.setAttribute('color', new THREE.BufferAttribute(bulgeCol, 3));

            bulgeGroup.add(new THREE.Points(bulgeGeo, new THREE.PointsMaterial({ size: 0.01, vertexColors: true, transparent: true, opacity: 0.8 * morphologyVisual.bulgeOpacity, blending: THREE.AdditiveBlending, depthWrite: false }))); // bulge stars sum to a radiant core (dust lanes untouched — absorption physics)

            // Bulge glow sprite

            var bgCv = document.createElement('canvas'); bgCv.setAttribute('aria-hidden', 'true'); bgCv.width = 128; bgCv.height = 128;

            var bgCtx = bgCv.getContext('2d');
              bgCtx = upscaleGalaxyCanvas(bgCv, bgCtx);

            var bgGrad = bgCtx.createRadialGradient(64, 64, 0, 64, 64, 64);

            bgGrad.addColorStop(0, 'rgba(255,230,200,1.0)'); bgGrad.addColorStop(0.15, 'rgba(255,180,100,0.5)'); bgGrad.addColorStop(0.4, 'rgba(200,100,50,0.15)');

            bgGrad.addColorStop(0.6, 'rgba(200,150,80,0.05)'); bgGrad.addColorStop(1, 'rgba(0,0,0,0)');

            bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 128, 128);

            var bulgeTex = tuneGalaxyTexture(new THREE.CanvasTexture(bgCv));

            var bulgeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bulgeTex, transparent: true, blending: THREE.AdditiveBlending }));

            bulgeGlow.scale.set(galaxyType === 'elliptical' ? 0.82 : 0.9, galaxyType === 'elliptical' ? 0.48 : 0.3, 1); bulgeGroup.add(bulgeGlow);



            // ── Dust lanes (dark absorption bands between arms) ──

            var dustGroup = new THREE.Group(); dustGroup.name = 'dust';

            scene.add(dustGroup);

            (function () {

              if (galaxyType === 'elliptical') return;
              var dustCount = Math.round(12000 * detailScale);

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

              // A PointsMaterial with no map draws a hard-edged SQUARE. Twelve thousand
              // black squares read as digital noise up close rather than as dust; a soft
              // radial alpha turns each one into a grain that blends into a lane.
              var dustGrainCv = document.createElement('canvas'); dustGrainCv.setAttribute('aria-hidden', 'true'); dustGrainCv.width = 32; dustGrainCv.height = 32;
              var dustGrainCtx = upscaleGalaxyCanvas(dustGrainCv, dustGrainCv.getContext('2d'));
              var dustGrainGrad = dustGrainCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
              dustGrainGrad.addColorStop(0, 'rgba(255,255,255,1)');
              dustGrainGrad.addColorStop(0.45, 'rgba(255,255,255,0.5)');
              dustGrainGrad.addColorStop(1, 'rgba(255,255,255,0)');
              dustGrainCtx.fillStyle = dustGrainGrad; dustGrainCtx.fillRect(0, 0, 32, 32);
              var dustGrainTex = tuneGalaxyTexture(new THREE.CanvasTexture(dustGrainCv));

              var dustMat = new THREE.PointsMaterial({ color: 0x050409, map: dustGrainTex, size: 0.032, transparent: true, opacity: 0.16, depthWrite: false });

              var dustPoints = new THREE.Points(dustGeo, dustMat);
              // Dark lanes cutting across the arms are the single most recognisable
              // feature of a spiral galaxy, and this layer could not produce them: it
              // drew at renderOrder 0, BEFORE the additive star field at 2, so the
              // stars simply added straight over the top of it. Drawing it after the
              // stars (but before the labels at 12+) lets the grains actually subtract
              // light, which is what dust does.
              //
              // The inter-arm feather lines and molecular filaments in this same scene
              // already rely on that ordering (renderOrder 4-6), so this is the
              // established approach here rather than a new trick.
              //
              // Approximation worth knowing: nothing in this scene writes depth, so
              // dust on the FAR side of the disk darkens near-side stars too. The dust
              // layer is thin (y within +/-0.005 against a +/-0.03 star scale height),
              // so the error is small face-on and only slightly muddies edge-on views.
              dustPoints.renderOrder = 8;
              dustGroup.add(dustPoints);

            })();

            // ── Volumetric Emission Gas Clouds ──
            // Camera-facing absorption and rim layers become visible only as the disk
            // approaches edge-on, separating its dark mid-plane from the stellar halo.
            var edgeOnDustSilhouette = new THREE.Group(); edgeOnDustSilhouette.name = 'edgeOnDustSilhouette'; dustGroup.add(edgeOnDustSilhouette);
            var edgeOnSilhouetteSprites = [], edgeOnRimSprites = [], edgeOnFactor = 0, edgeOnModeOpacity = 1;
            (function () {
              if (galaxyType === 'elliptical') return;
              var silhouetteCv = document.createElement('canvas'); silhouetteCv.setAttribute('aria-hidden', 'true'); silhouetteCv.width = 512; silhouetteCv.height = 96;
              var silhouetteCtx = upscaleGalaxyCanvas(silhouetteCv, silhouetteCv.getContext('2d'));
              silhouetteCtx.clearRect(0, 0, 512, 96);
              var silhouetteBand = silhouetteCtx.createLinearGradient(0, 16, 0, 80);
              silhouetteBand.addColorStop(0, 'rgba(255,255,255,0)'); silhouetteBand.addColorStop(0.32, 'rgba(255,255,255,0.38)'); silhouetteBand.addColorStop(0.5, 'rgba(255,255,255,0.84)'); silhouetteBand.addColorStop(0.68, 'rgba(255,255,255,0.38)'); silhouetteBand.addColorStop(1, 'rgba(255,255,255,0)');
              silhouetteCtx.fillStyle = silhouetteBand; silhouetteCtx.fillRect(16, 10, 480, 76);
              for (var silhouetteClump = 0; silhouetteClump < 74; silhouetteClump++) {
                var clumpX = 18 + Math.random() * 476, clumpY = 38 + (Math.random() - 0.5) * 24, clumpRadiusX = 7 + Math.random() * 28, clumpRadiusY = 2 + Math.random() * 9;
                silhouetteCtx.save(); silhouetteCtx.translate(clumpX, clumpY); silhouetteCtx.scale(clumpRadiusX, clumpRadiusY); silhouetteCtx.beginPath(); silhouetteCtx.arc(0, 0, 1, 0, Math.PI * 2); silhouetteCtx.fillStyle = 'rgba(255,255,255,' + (0.16 + Math.random() * 0.48).toFixed(2) + ')'; silhouetteCtx.fill(); silhouetteCtx.restore();
              }
              var silhouetteTexture = tuneGalaxyTexture(new THREE.CanvasTexture(silhouetteCv));
              for (var silhouetteLayer = 0; silhouetteLayer < 4; silhouetteLayer++) {
                var silhouetteMaterial = new THREE.SpriteMaterial({ map: silhouetteTexture, color: silhouetteLayer % 2 ? 0x08040f : 0x020107, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.NormalBlending });
                silhouetteMaterial.userData = { baseOpacity: 0.2 + silhouetteLayer * 0.055, phase: silhouetteLayer * 1.3 };
                var silhouetteSprite = new THREE.Sprite(silhouetteMaterial); silhouetteSprite.position.set((silhouetteLayer - 1.5) * 0.012, (silhouetteLayer - 1.5) * 0.008, 0); silhouetteSprite.scale.set(2.12 - silhouetteLayer * 0.08, 0.135 + silhouetteLayer * 0.018, 1); silhouetteSprite.renderOrder = 9; edgeOnDustSilhouette.add(silhouetteSprite); edgeOnSilhouetteSprites.push(silhouetteSprite);
              }
              var rimCv = document.createElement('canvas'); rimCv.setAttribute('aria-hidden', 'true'); rimCv.width = 512; rimCv.height = 32;
              var rimCtx = upscaleGalaxyCanvas(rimCv, rimCv.getContext('2d'));
              var rimLong = rimCtx.createLinearGradient(0, 0, 512, 0); rimLong.addColorStop(0, 'rgba(255,255,255,0)'); rimLong.addColorStop(0.12, 'rgba(255,255,255,0.2)'); rimLong.addColorStop(0.5, 'rgba(255,255,255,0.82)'); rimLong.addColorStop(0.88, 'rgba(255,255,255,0.2)'); rimLong.addColorStop(1, 'rgba(255,255,255,0)'); rimCtx.fillStyle = rimLong; rimCtx.fillRect(0, 12, 512, 8);
              var rimTexture = tuneGalaxyTexture(new THREE.CanvasTexture(rimCv));
              for (var rimIndex = 0; rimIndex < 2; rimIndex++) {
                var rimMaterial = new THREE.SpriteMaterial({ map: rimTexture, color: rimIndex ? 0x93c5fd : 0xfde68a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                rimMaterial.userData = { baseOpacity: rimIndex ? 0.18 : 0.24 };
                var rimSprite = new THREE.Sprite(rimMaterial); rimSprite.position.y = rimIndex ? 0.045 : -0.038; rimSprite.scale.set(rimIndex ? 1.82 : 1.68, 0.045, 1); rimSprite.renderOrder = 8; edgeOnDustSilhouette.add(rimSprite); edgeOnRimSprites.push(rimSprite);
              }
            })();
            // These two were declared ~80 lines BELOW the loop that fills them.
            // `var` hoists the name but not the assignment, so the loop was
            // calling `.add()` on undefined and the whole scene build threw —
            // taking barred spiral, grand design and irregular down with it.
            // Only elliptical survived, and only because the early return just
            // below it skips the loop entirely, which is what made this look
            // like a device problem rather than an ordering one.
            var dustBacklightGroup = new THREE.Group(); dustBacklightGroup.name = 'dustLaneBacklightingShafts'; dustGroup.add(dustBacklightGroup);
            var dustBacklightSprites = [], dustBacklightMode = 1, dustBacklightAngleFactor = 0;

            // Tapered, low-opacity shafts expose backlit dust only from oblique
            // viewpoints, where real lanes carve the strongest depth cues.
            (function () {
              if (galaxyType === 'elliptical') return;
              var shaftCv = document.createElement('canvas'); shaftCv.setAttribute('aria-hidden', 'true'); shaftCv.width = 256; shaftCv.height = 128;
              var shaftCtx = upscaleGalaxyCanvas(shaftCv, shaftCv.getContext('2d')); var shaftGradient = shaftCtx.createLinearGradient(12, 64, 244, 64); shaftGradient.addColorStop(0, 'rgba(255,255,255,0)'); shaftGradient.addColorStop(0.18, 'rgba(255,255,255,0.12)'); shaftGradient.addColorStop(0.54, 'rgba(255,255,255,0.42)'); shaftGradient.addColorStop(1, 'rgba(255,255,255,0)'); shaftCtx.fillStyle = shaftGradient; shaftCtx.beginPath(); shaftCtx.moveTo(8, 62); shaftCtx.quadraticCurveTo(118, 20, 248, 54); shaftCtx.quadraticCurveTo(118, 108, 8, 66); shaftCtx.closePath(); shaftCtx.fill();
              var shaftTexture = tuneGalaxyTexture(new THREE.CanvasTexture(shaftCv));
              var shaftCount = resolvedQuality === 'cinematic' ? 32 : resolvedQuality === 'high' ? 22 : 12;
              for (var shaftIndex = 0; shaftIndex < shaftCount; shaftIndex++) { var shaftRadius = 0.16 + Math.pow(Math.random(), 0.82) * 0.58, shaftArm = shaftIndex % (gType.arms || 4), shaftAngle = galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : shaftArm / (gType.arms || 4) * Math.PI * 2 + shaftRadius * (gType.windTightness || 2.5) + 0.08; var shaftMaterial = new THREE.SpriteMaterial({ map: shaftTexture, color: shaftIndex % 5 === 0 ? 0x93c5fd : shaftIndex % 3 === 0 ? 0xf9a8d4 : 0xfde68a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: shaftAngle + Math.PI * 0.5 }); var shaftSprite = new THREE.Sprite(shaftMaterial), shaftScaleX = 0.16 + Math.random() * 0.24, shaftScaleY = shaftScaleX * (0.16 + Math.random() * 0.15); shaftSprite.position.set(Math.cos(shaftAngle) * shaftRadius, 0.012 + (Math.random() - 0.5) * 0.035, Math.sin(shaftAngle) * shaftRadius); shaftSprite.scale.set(shaftScaleX, shaftScaleY, 1); shaftSprite.userData = { baseOpacity: 0.025 + Math.random() * 0.055, baseScaleX: shaftScaleX, baseScaleY: shaftScaleY, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00016 }; shaftSprite.renderOrder = 7; dustBacklightGroup.add(shaftSprite); dustBacklightSprites.push(shaftSprite); }
            })();
            var gasGroup = new THREE.Group(); gasGroup.name = 'gas';
            scene.add(gasGroup);
            (function () {
              if (galaxyType === 'elliptical') return;
              var gasCount = Math.round(8000 * detailScale);
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
              
              var gasCv = document.createElement('canvas'); gasCv.setAttribute('aria-hidden', 'true'); gasCv.width = 32; gasCv.height = 32;
              var gCtx = gasCv.getContext('2d');
              gCtx = upscaleGalaxyCanvas(gasCv, gCtx);
              var gGrad = gCtx.createRadialGradient(16,16,0,16,16,16);
              gGrad.addColorStop(0, 'rgba(255,255,255,1)');
              gGrad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
              gGrad.addColorStop(1, 'rgba(0,0,0,0)');
              gCtx.fillStyle = gGrad; gCtx.fillRect(0,0,32,32);
              var gasTex = tuneGalaxyTexture(new THREE.CanvasTexture(gasCv));
              
              var gasMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true, map: gasTex });
              gasGroup.add(new THREE.Points(gasGeo, gasMat));
            })();

            // ── Layered dust volume, stellar nurseries, satellites, and tidal streams ──
            var atmosphereGroup = new THREE.Group(); atmosphereGroup.name = 'volumetricAtmosphere';
            var satelliteGroup = new THREE.Group(); satelliteGroup.name = 'satellitesAndTidalStreams';
            var globularGroup = new THREE.Group(); globularGroup.name = 'globularClusterHalo';
            bgGroup.add(globularGroup); bgGroup.add(satelliteGroup); scene.add(atmosphereGroup);
            atmosphereGroup.visible = galaxyType !== 'elliptical';
            var volumetricDustSprites = [], starBirthSprites = [], satelliteMats = [], tidalStreamMats = [];
            var globularSprites = [], satelliteCoreSprites = [], dustFeatherMats = [], ionizedShells = [], supernovaRemnantArcs = [];
            var resolvedSatelliteMorphologyGroup = new THREE.Group(); resolvedSatelliteMorphologyGroup.name = 'resolvedSatelliteDwarfMorphologies'; satelliteGroup.add(resolvedSatelliteMorphologyGroup);
            var satelliteEnvelopeSprites = [], ramPressureTailMaterials = [], strippedSatelliteGasKnots = [], satelliteDwarfMode = 1, ramPressureMode = 1;
            var resolvedSupernovaEjectaGroup = new THREE.Group(); resolvedSupernovaEjectaGroup.name = 'resolvedSupernovaEjecta'; resolvedSupernovaEjectaGroup.visible = false; gasGroup.add(resolvedSupernovaEjectaGroup);
            var supernovaEjectaFilamentMaterials = [], reverseShockShells = [], supernovaEjectaKnots = [], compactRemnantCoreSprites = [], supernovaEjectaMode = 1;
            var emissionLineRims = [], emissionLineMode = 1;
            var molecularFilamentMats = [], protostarKnotSprites = [], foregroundDustSprites = [];
            var armScatteringGroup = new THREE.Group(); armScatteringGroup.name = 'spiralArmLightScattering'; atmosphereGroup.add(armScatteringGroup);
            var stellarHaloShellGroup = new THREE.Group(); stellarHaloShellGroup.name = 'stellarHaloShells'; bgGroup.add(stellarHaloShellGroup);
            var armScatteringSprites = [], haloShellMaterials = [], haloShellObjects = [];
            var dustColorScatteringGroup = new THREE.Group(); dustColorScatteringGroup.name = 'dustScatteringColorGradients'; atmosphereGroup.add(dustColorScatteringGroup);
            var dustColorScatteringSprites = [], dustColorScatteringMode = 1;
            var resolvedClusterGroup = new THREE.Group(); resolvedClusterGroup.name = 'resolvedOpenClusterCoronas'; resolvedClusterGroup.visible = false; armGroup.add(resolvedClusterGroup);
            var resolvedBinaryGroup = new THREE.Group(); resolvedBinaryGroup.name = 'binaryStellarCompanions'; resolvedClusterGroup.add(resolvedBinaryGroup);
            var resolvedClusterCoronas = [], resolvedClusterMembers = [], resolvedClusterBinaries = [];
            var clusterDissolutionTailGroup = new THREE.Group(); clusterDissolutionTailGroup.name = 'clusterDissolutionTidalTails'; resolvedClusterGroup.add(clusterDissolutionTailGroup);
            var clusterTidalTailMaterials = [], escapedClusterMemberMaterial = null, clusterTidalTailMode = 1;
            var resolvedPlanetaryNebulaGroup = new THREE.Group(); resolvedPlanetaryNebulaGroup.name = 'resolvedBipolarPlanetaryNebulae'; resolvedPlanetaryNebulaGroup.visible = false; gasGroup.add(resolvedPlanetaryNebulaGroup);
            var planetaryNebulaLobes = [], planetaryNebulaShells = [], planetaryNebulaCores = [], planetaryNebulaMode = 1;
            var circumstellarNurseryGroup = new THREE.Group(); circumstellarNurseryGroup.name = 'resolvedCircumstellarNurseries'; circumstellarNurseryGroup.visible = false; gasGroup.add(circumstellarNurseryGroup);
            var protoplanetaryDiskGroup = new THREE.Group(); protoplanetaryDiskGroup.name = 'resolvedProtoplanetaryDisks'; circumstellarNurseryGroup.add(protoplanetaryDiskGroup);
            var protostellarJetGroup = new THREE.Group(); protostellarJetGroup.name = 'bipolarProtostellarJets'; circumstellarNurseryGroup.add(protostellarJetGroup);
            var protoplanetaryDiskMeshes = [], protostellarJetSprites = [], protostellarShockKnots = [], protostellarCoreSprites = [], circumstellarMode = 1, protostellarJetMode = 1;
            var emissionLineGroup = new THREE.Group(); emissionLineGroup.name = 'emissionLineStratification'; gasGroup.add(emissionLineGroup);
            var dustDepthCameraDirection = new THREE.Vector3(), dustNearTint = new THREE.Color(0x5b263c), dustFarTint = new THREE.Color(0x172554);
            var armScatteringMode = 1, haloShellMode = 1;
            var molecularCloudGroup = new THREE.Group(); molecularCloudGroup.name = 'molecularCloudFilaments';
            var protostarKnotGroup = new THREE.Group(); protostarKnotGroup.name = 'embeddedProtostarKnots';
            var foregroundDepthGroup = new THREE.Group(); foregroundDepthGroup.name = 'foregroundParallaxDust';
            var foregroundStarGroup = new THREE.Group(); foregroundStarGroup.name = 'foregroundStellarParallax'; foregroundDepthGroup.add(foregroundStarGroup);
            var foregroundParallaxStars = [], foregroundStarMode = 1;
            // (dustBacklightGroup / dustBacklightSprites are declared above,
            // before the loop that populates them.)
            dustGroup.add(molecularCloudGroup); dustGroup.add(foregroundDepthGroup); gasGroup.add(protostarKnotGroup);
            var shockFrontDustGroup = new THREE.Group(); shockFrontDustGroup.name = 'spiralDensityWaveShockFronts'; dustGroup.add(shockFrontDustGroup);
            var shockFrontFormationGroup = new THREE.Group(); shockFrontFormationGroup.name = 'downstreamStarFormationOffsets'; gasGroup.add(shockFrontFormationGroup);
            var magneticFilamentGroup = new THREE.Group(); magneticFilamentGroup.name = 'magneticallyAlignedDustFilaments'; dustGroup.add(magneticFilamentGroup);
            var shockFrontDustMaterials = [], shockFrontFormationMaterials = [], magneticFilamentMaterials = [], shockFrontMode = 1, magneticFilamentMode = 1;
            (function () {
              if (galaxyType === 'elliptical' || galaxyType === 'irregular') return;
              var shockArmCount = gType.arms || 4, shockSegments = resolvedQuality === 'cinematic' ? 220 : resolvedQuality === 'high' ? 156 : 96;
              for (var shockArm = 0; shockArm < shockArmCount; shockArm++) {
                var shockDustPoints = [], shockFormationPoints = [];
                for (var shockStep = 0; shockStep <= shockSegments; shockStep++) {
                  var shockT = shockStep / shockSegments, shockRadius = 0.15 + shockT * 0.72, shockBaseAngle = shockArm / shockArmCount * Math.PI * 2 + shockRadius * (gType.windTightness || 2.5), shockRipple = Math.sin(shockT * Math.PI * 7 + shockArm) * 0.006;
                  var compressionAngle = shockBaseAngle - 0.038 + shockRipple, formationAngle = shockBaseAngle + 0.024 + shockRipple * 0.55;
                  shockDustPoints.push(new THREE.Vector3(Math.cos(compressionAngle) * shockRadius, 0.006 + Math.sin(shockT * Math.PI * 4 + shockArm) * 0.0018, Math.sin(compressionAngle) * shockRadius));
                  shockFormationPoints.push(new THREE.Vector3(Math.cos(formationAngle) * shockRadius, 0.009 + Math.sin(shockT * Math.PI * 5 + shockArm) * 0.0022, Math.sin(formationAngle) * shockRadius));
                }
                var shockDustMaterial = new THREE.LineBasicMaterial({ color: shockArm % 2 ? 0x09040e : 0x120717, transparent: true, opacity: 0.24, depthWrite: false, depthTest: false, blending: THREE.NormalBlending }); shockDustMaterial.userData = { baseOpacity: shockDustMaterial.opacity, phase: shockArm * 1.27 };
                var shockDustLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(shockDustPoints), shockDustMaterial); shockDustLine.renderOrder = 7; shockFrontDustGroup.add(shockDustLine); shockFrontDustMaterials.push(shockDustMaterial);
                var shockFormationMaterial = new THREE.LineBasicMaterial({ color: shockArm % 3 === 0 ? 0x67e8f9 : shockArm % 3 === 1 ? 0xf9a8d4 : 0xfde68a, transparent: true, opacity: 0.065, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); shockFormationMaterial.userData = { baseOpacity: shockFormationMaterial.opacity, phase: shockArm * 1.27 + 0.8 };
                var shockFormationLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(shockFormationPoints), shockFormationMaterial); shockFormationLine.renderOrder = 4; shockFrontFormationGroup.add(shockFormationLine); shockFrontFormationMaterials.push(shockFormationMaterial);
              }
              var magneticFilamentCount = resolvedQuality === 'cinematic' ? 180 : resolvedQuality === 'high' ? 108 : 56, filamentPositions = new Float32Array(magneticFilamentCount * 6), filamentRimPositions = new Float32Array(magneticFilamentCount * 6);
              for (var magneticFilamentIndex = 0; magneticFilamentIndex < magneticFilamentCount; magneticFilamentIndex++) {
                var filamentArm = magneticFilamentIndex % shockArmCount, filamentRadius = 0.18 + Math.pow(Math.random(), 0.82) * 0.64, filamentLength = 0.018 + Math.random() * 0.038, filamentRadiusA = filamentRadius - filamentLength * 0.5, filamentRadiusB = filamentRadius + filamentLength * 0.5;
                var filamentJitter = (Math.random() - 0.5) * 0.09, filamentAngleA = filamentArm / shockArmCount * Math.PI * 2 + filamentRadiusA * (gType.windTightness || 2.5) - 0.012 + filamentJitter, filamentAngleB = filamentArm / shockArmCount * Math.PI * 2 + filamentRadiusB * (gType.windTightness || 2.5) - 0.012 + filamentJitter + (Math.random() - 0.5) * 0.025, filamentY = 0.008 + (Math.random() - 0.5) * 0.012, filamentOffset = magneticFilamentIndex * 6;
                filamentPositions[filamentOffset] = Math.cos(filamentAngleA) * filamentRadiusA; filamentPositions[filamentOffset + 1] = filamentY; filamentPositions[filamentOffset + 2] = Math.sin(filamentAngleA) * filamentRadiusA; filamentPositions[filamentOffset + 3] = Math.cos(filamentAngleB) * filamentRadiusB; filamentPositions[filamentOffset + 4] = filamentY; filamentPositions[filamentOffset + 5] = Math.sin(filamentAngleB) * filamentRadiusB;
                filamentRimPositions[filamentOffset] = filamentPositions[filamentOffset] * 1.002; filamentRimPositions[filamentOffset + 1] = filamentY + 0.0012; filamentRimPositions[filamentOffset + 2] = filamentPositions[filamentOffset + 2] * 1.002; filamentRimPositions[filamentOffset + 3] = filamentPositions[filamentOffset + 3] * 1.002; filamentRimPositions[filamentOffset + 4] = filamentY + 0.0012; filamentRimPositions[filamentOffset + 5] = filamentPositions[filamentOffset + 5] * 1.002;
              }
              var filamentGeometry = new THREE.BufferGeometry(); filamentGeometry.setAttribute('position', new THREE.BufferAttribute(filamentPositions, 3));
              var filamentMaterial = new THREE.LineBasicMaterial({ color: 0x07030a, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false, blending: THREE.NormalBlending }); filamentMaterial.userData = { baseOpacity: filamentMaterial.opacity, phase: 0.4, edge: false };
              var filamentLines = new THREE.LineSegments(filamentGeometry, filamentMaterial); filamentLines.renderOrder = 8; magneticFilamentGroup.add(filamentLines); magneticFilamentMaterials.push(filamentMaterial);
              var filamentRimGeometry = new THREE.BufferGeometry(); filamentRimGeometry.setAttribute('position', new THREE.BufferAttribute(filamentRimPositions, 3));
              var filamentRimMaterial = new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.038, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); filamentRimMaterial.userData = { baseOpacity: filamentRimMaterial.opacity, phase: 1.3, edge: true };
              var filamentRimLines = new THREE.LineSegments(filamentRimGeometry, filamentRimMaterial); filamentRimLines.renderOrder = 8; magneticFilamentGroup.add(filamentRimLines); magneticFilamentMaterials.push(filamentRimMaterial);
            })();
            var warpedOuterDiskGroup = new THREE.Group(); warpedOuterDiskGroup.name = 'warpedOuterDiskStellarArcs'; armGroup.add(warpedOuterDiskGroup);
            var extraplanarGasGroup = new THREE.Group(); extraplanarGasGroup.name = 'extraplanarSuperbubbleChimneys'; gasGroup.add(extraplanarGasGroup);
            var outerWarpMaterials = [], gasChimneyMaterials = [], outerWarpMode = 1, extraplanarGasMode = 1;
            var fountainParticleGroup = new THREE.Group(); fountainParticleGroup.name = 'galacticFountainParticleFlows'; extraplanarGasGroup.add(fountainParticleGroup);
            var superbubbleCapGroup = new THREE.Group(); superbubbleCapGroup.name = 'layeredSuperbubbleCapShells'; extraplanarGasGroup.add(superbubbleCapGroup);
            var fountainParticleMaterial = null, superbubbleCapShells = [];
            (function () {
              if (galaxyType === 'elliptical') return;
              var outerWarpArcCount = resolvedQuality === 'cinematic' ? 10 : resolvedQuality === 'high' ? 7 : 4, outerWarpSegments = resolvedQuality === 'cinematic' ? 240 : resolvedQuality === 'high' ? 164 : 104;
              for (var outerWarpArc = 0; outerWarpArc < outerWarpArcCount; outerWarpArc++) {
                var warpArcPoints = [], warpRadius = 0.72 + outerWarpArc / Math.max(1, outerWarpArcCount - 1) * 0.24, warpPhase = outerWarpArc * 0.43;
                for (var warpArcStep = 0; warpArcStep <= outerWarpSegments; warpArcStep++) { var warpArcT = warpArcStep / outerWarpSegments, warpArcAngle = warpArcT * Math.PI * 2 + warpPhase, warpEnvelope = Math.pow(Math.max(0, (warpRadius - 0.68) / 0.28), 1.35), warpArcY = Math.sin(warpArcAngle - 0.48) * (0.018 + outerWarpArc * 0.0045) * warpEnvelope + Math.sin(warpArcAngle * 3 + outerWarpArc) * 0.0022; warpArcPoints.push(new THREE.Vector3(Math.cos(warpArcAngle) * warpRadius, warpArcY, Math.sin(warpArcAngle) * warpRadius)); }
                var outerWarpMaterial = new THREE.LineBasicMaterial({ color: outerWarpArc % 4 === 0 ? 0xfde68a : outerWarpArc % 3 === 0 ? 0xf9a8d4 : 0x93c5fd, transparent: true, opacity: 0.024 + outerWarpArc % 4 * 0.005, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); outerWarpMaterial.userData = { baseOpacity: outerWarpMaterial.opacity, phase: outerWarpArc * 0.77 };
                var outerWarpLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(warpArcPoints), outerWarpMaterial); outerWarpLine.renderOrder = 2; warpedOuterDiskGroup.add(outerWarpLine); outerWarpMaterials.push(outerWarpMaterial);
              }
              var gasChimneyCount = resolvedQuality === 'cinematic' ? 22 : resolvedQuality === 'high' ? 14 : 8;
              for (var gasChimneyIndex = 0; gasChimneyIndex < gasChimneyCount; gasChimneyIndex++) {
                var chimneyRadius = 0.18 + Math.pow(Math.random(), 0.72) * 0.5, chimneyAngle = gasChimneyIndex / gasChimneyCount * Math.PI * 2 + Math.sin(gasChimneyIndex * 1.7) * 0.46, chimneyDirection = gasChimneyIndex % 2 ? -1 : 1, chimneyHeight = 0.1 + Math.random() * 0.18, chimneySegments = resolvedQuality === 'cinematic' ? 42 : 28;
                for (var chimneyEdge = 0; chimneyEdge < 2; chimneyEdge++) {
                  var chimneyPoints = [], chimneyLateral = (chimneyEdge ? -1 : 1) * (0.008 + Math.random() * 0.008);
                  for (var chimneyStep = 0; chimneyStep <= chimneySegments; chimneyStep++) { var chimneyT = chimneyStep / chimneySegments, chimneyFlare = chimneyLateral * (0.45 + chimneyT * 0.9), chimneyRadialDrift = chimneyT * chimneyT * 0.026, chimneyWave = Math.sin(chimneyT * Math.PI * 2 + gasChimneyIndex) * 0.004, chimneyR = chimneyRadius + chimneyRadialDrift; chimneyPoints.push(new THREE.Vector3(Math.cos(chimneyAngle) * chimneyR + Math.cos(chimneyAngle + Math.PI * 0.5) * (chimneyFlare + chimneyWave), chimneyDirection * chimneyHeight * chimneyT, Math.sin(chimneyAngle) * chimneyR + Math.sin(chimneyAngle + Math.PI * 0.5) * (chimneyFlare + chimneyWave))); }
                  var chimneyMaterial = new THREE.LineBasicMaterial({ color: gasChimneyIndex % 4 === 0 ? 0x67e8f9 : gasChimneyIndex % 3 === 0 ? 0xf9a8d4 : 0xc4b5fd, transparent: true, opacity: 0.055 + Math.random() * 0.045, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); chimneyMaterial.userData = { baseOpacity: chimneyMaterial.opacity, phase: gasChimneyIndex * 0.68 + chimneyEdge * 1.2 };
                  var chimneyLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(chimneyPoints), chimneyMaterial); chimneyLine.renderOrder = 4; extraplanarGasGroup.add(chimneyLine); gasChimneyMaterials.push(chimneyMaterial);
                }
              }
            })();
            (function () {
              if (galaxyType === 'elliptical') return;
              var galacticFountainParticleCount = resolvedQuality === 'cinematic' ? 1800 : resolvedQuality === 'high' ? 820 : 320;
              var fountainGeometry = new THREE.BufferGeometry(), fountainPositions = new Float32Array(galacticFountainParticleCount * 3), fountainColors = new Float32Array(galacticFountainParticleCount * 3), fountainHeights = new Float32Array(galacticFountainParticleCount), fountainPhases = new Float32Array(galacticFountainParticleCount), fountainDirections = new Float32Array(galacticFountainParticleCount), fountainSpeeds = new Float32Array(galacticFountainParticleCount);
              for (var fountainParticleIndex = 0; fountainParticleIndex < galacticFountainParticleCount; fountainParticleIndex++) { var fountainRadius = 0.17 + Math.pow(Math.random(), 0.76) * 0.54, fountainAngle = Math.random() * Math.PI * 2, fountainSpread = (Math.random() - 0.5) * 0.028; fountainPositions[fountainParticleIndex * 3] = Math.cos(fountainAngle) * (fountainRadius + fountainSpread); fountainPositions[fountainParticleIndex * 3 + 1] = (Math.random() - 0.5) * 0.012; fountainPositions[fountainParticleIndex * 3 + 2] = Math.sin(fountainAngle) * (fountainRadius + fountainSpread); fountainHeights[fountainParticleIndex] = 0.08 + Math.pow(Math.random(), 0.7) * 0.24; fountainPhases[fountainParticleIndex] = Math.random(); fountainDirections[fountainParticleIndex] = fountainParticleIndex % 2 ? -1 : 1; fountainSpeeds[fountainParticleIndex] = 0.018 + Math.random() * 0.032; var fountainColor = new THREE.Color(fountainParticleIndex % 7 === 0 ? 0xf9a8d4 : fountainParticleIndex % 5 === 0 ? 0xc4b5fd : 0x67e8f9); fountainColors[fountainParticleIndex * 3] = fountainColor.r; fountainColors[fountainParticleIndex * 3 + 1] = fountainColor.g; fountainColors[fountainParticleIndex * 3 + 2] = fountainColor.b; }
              fountainGeometry.setAttribute('position', new THREE.BufferAttribute(fountainPositions, 3)); fountainGeometry.setAttribute('color', new THREE.BufferAttribute(fountainColors, 3)); fountainGeometry.setAttribute('aHeight', new THREE.BufferAttribute(fountainHeights, 1)); fountainGeometry.setAttribute('aPhase', new THREE.BufferAttribute(fountainPhases, 1)); fountainGeometry.setAttribute('aDirection', new THREE.BufferAttribute(fountainDirections, 1)); fountainGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(fountainSpeeds, 1));
              fountainParticleMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPointScale: { value: renderer.getPixelRatio() * (resolvedQuality === 'cinematic' ? 5.8 : resolvedQuality === 'high' ? 4.8 : 4.1) } }, vertexShader: ['attribute float aHeight;','attribute float aPhase;','attribute float aDirection;','attribute float aSpeed;','varying vec3 vFountainColor;','varying float vFountainFade;','uniform float uTime;','uniform float uPointScale;','void main(){','float cycle=fract(aPhase+uTime*aSpeed);','float lift=sin(cycle*3.14159265);','vec3 p=position;','p.y+=aDirection*aHeight*lift;','p.xz*=1.0+cycle*cycle*0.035;','vFountainColor=color;','vFountainFade=sin(cycle*3.14159265);','vec4 mv=modelViewMatrix*vec4(p,1.0);','gl_PointSize=min(9.0,uPointScale*(58.0/max(-mv.z,1.0))*(0.65+vFountainFade*0.55));','gl_Position=projectionMatrix*mv;','}'].join('\n'), fragmentShader: ['varying vec3 vFountainColor;','varying float vFountainFade;','uniform float uOpacity;','void main(){','float d=length(gl_PointCoord-0.5)*2.0;','if(d>1.0)discard;','float core=exp(-d*d*5.6);','float halo=exp(-d*d*1.8)*0.18;','gl_FragColor=vec4(vFountainColor*(0.62+core*0.72),(core+halo)*uOpacity*(0.35+vFountainFade*0.65));','}'].join('\n'), vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
              var fountainPoints = new THREE.Points(fountainGeometry, fountainParticleMaterial); fountainPoints.renderOrder = 5; fountainParticleGroup.add(fountainPoints);
              var superbubbleCapCount = resolvedQuality === 'cinematic' ? 28 : resolvedQuality === 'high' ? 18 : 10;
              for (var superbubbleCapIndex = 0; superbubbleCapIndex < superbubbleCapCount; superbubbleCapIndex++) { var capRadiusFromCore = 0.18 + Math.pow(Math.random(), 0.76) * 0.5, capAngle = superbubbleCapIndex / superbubbleCapCount * Math.PI * 2 + Math.sin(superbubbleCapIndex * 1.3) * 0.36, capDirection = superbubbleCapIndex % 2 ? -1 : 1, capHeight = 0.1 + Math.random() * 0.18, capMaterial = new THREE.MeshBasicMaterial({ color: superbubbleCapIndex % 4 === 0 ? 0x67e8f9 : superbubbleCapIndex % 3 === 0 ? 0xf9a8d4 : 0xc4b5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), capScale = 0.016 + Math.random() * 0.018; var capShell = new THREE.Mesh(new THREE.RingGeometry(0.64, 1, resolvedQuality === 'cinematic' ? 64 : 42, 1, superbubbleCapIndex * 0.51, Math.PI * (1.1 + superbubbleCapIndex % 4 * 0.12)), capMaterial); capShell.position.set(Math.cos(capAngle) * (capRadiusFromCore + 0.025), capDirection * capHeight, Math.sin(capAngle) * (capRadiusFromCore + 0.025)); capShell.rotation.x = Math.PI * 0.5; capShell.rotation.z = superbubbleCapIndex * 0.38; capShell.scale.set(capScale, capScale, capScale); capShell.userData = { baseOpacity: 0.07 + Math.random() * 0.06, baseScale: capScale, phase: superbubbleCapIndex * 0.74, drift: (superbubbleCapIndex % 2 ? -1 : 1) * 0.00014 }; capShell.renderOrder = 5; superbubbleCapGroup.add(capShell); superbubbleCapShells.push(capShell); }
            })();
            var openClusterMat = null, thickDiskMat = null;
            var morphologySignatureGroup = new THREE.Group(); morphologySignatureGroup.name = 'morphologySignatureStructures'; scene.add(morphologySignatureGroup);
            var morphologySignatureMaterials = [], morphologySignatureObjects = [];
            function getGalaxyEvolutionForAge(age) {
              var normalizedAge = Math.max(0, Math.min(1, (age || 0) / 14));
              var young = Math.max(0, Math.min(1, (4.5 - age) / 4.5));
              var old = Math.max(0, Math.min(1, (age - 7) / 7));
              var mature = Math.max(0, 1 - Math.abs(age - 7) / 7);
              return { gas: 0.48 + young * 1.38 + mature * 0.32, birth: 0.28 + young * 2.15 + mature * 0.5, thickness: 0.7 + old * 0.72 + young * 0.16, disturbance: 0.56 + young * 1.18, remnants: 0.58 + young * 0.9 + mature * 0.24, structure: 0.54 + mature * 0.7 + (galaxyType === 'irregular' ? young * 0.62 : 0), normalized: normalizedAge };
            }
            var ageEvolutionVisual = getGalaxyEvolutionForAge(cosmicAge), ageEvolutionTarget = getGalaxyEvolutionForAge(cosmicAge);
            var volumetricVisual = { dust: 1, birth: 1, satellite: 1 };
            var volumetricTarget = { dust: 1, birth: 1, satellite: 1 };
            var populationVisual = { clusters: 1, thickDisk: 1, remnants: 1 };
            var populationTarget = { clusters: 1, thickDisk: 1, remnants: 1 };
            var cloudVisual = { molecular: 1, protostar: 1, foreground: 1 };
            var cloudTarget = { molecular: 1, protostar: 1, foreground: 1 };
            (function () {
              var dustCv = document.createElement('canvas'); dustCv.setAttribute('aria-hidden', 'true'); dustCv.width = 192; dustCv.height = 192;
              var dustCtx = dustCv.getContext('2d');
              dustCtx = upscaleGalaxyCanvas(dustCv, dustCtx);
              for (var dc = 0; dc < 34; dc++) {
                var dcx = 28 + Math.random() * 136, dcy = 32 + Math.random() * 128, dcr = 18 + Math.random() * 52;
                var dustGrad = dustCtx.createRadialGradient(dcx, dcy, 0, dcx, dcy, dcr);
                dustGrad.addColorStop(0, dc % 3 ? 'rgba(19,12,31,0.34)' : 'rgba(42,20,44,0.28)');
                dustGrad.addColorStop(0.55, 'rgba(14,10,27,0.16)'); dustGrad.addColorStop(1, 'rgba(0,0,0,0)');
                dustCtx.fillStyle = dustGrad; dustCtx.fillRect(dcx - dcr, dcy - dcr, dcr * 2, dcr * 2);
              }
              var dustVolumeTex = tuneGalaxyTexture(new THREE.CanvasTexture(dustCv));

              var birthCv = document.createElement('canvas'); birthCv.setAttribute('aria-hidden', 'true'); birthCv.width = 128; birthCv.height = 128;
              var birthCtx = birthCv.getContext('2d');
              birthCtx = upscaleGalaxyCanvas(birthCv, birthCtx);
              var birthGrad = birthCtx.createRadialGradient(64, 64, 0, 64, 64, 62);
              birthGrad.addColorStop(0, 'rgba(255,255,255,1)');
              birthGrad.addColorStop(0.08, 'rgba(191,219,254,0.92)');
              birthGrad.addColorStop(0.24, 'rgba(244,114,182,0.48)');
              birthGrad.addColorStop(0.54, 'rgba(129,140,248,0.16)');
              birthGrad.addColorStop(1, 'rgba(0,0,0,0)');
              birthCtx.fillStyle = birthGrad; birthCtx.fillRect(0, 0, 128, 128);
              for (var bray = 0; bray < 8; bray++) {
                birthCtx.save(); birthCtx.translate(64, 64); birthCtx.rotate(bray * Math.PI / 4);
                var birthRay = birthCtx.createLinearGradient(0, 0, 58, 0); birthRay.addColorStop(0, 'rgba(255,255,255,0.28)'); birthRay.addColorStop(1, 'rgba(255,255,255,0)');
                birthCtx.strokeStyle = birthRay; birthCtx.lineWidth = bray % 2 ? 1 : 2; birthCtx.beginPath(); birthCtx.moveTo(6, 0); birthCtx.lineTo(58, 0); birthCtx.stroke(); birthCtx.restore();
              }
              var birthTex = tuneGalaxyTexture(new THREE.CanvasTexture(birthCv));
              // A high-resolution, asymmetrical kernel approximates light scattered
              // through unresolved gas without turning every arm knot into a point glow.
              var scatteringCv = document.createElement('canvas'); scatteringCv.setAttribute('aria-hidden', 'true'); scatteringCv.width = 256; scatteringCv.height = 128;
              var scatteringCtx = upscaleGalaxyCanvas(scatteringCv, scatteringCv.getContext('2d'));
              var scatteringCore = scatteringCtx.createRadialGradient(128, 64, 0, 128, 64, 64); scatteringCore.addColorStop(0, 'rgba(255,255,255,0.34)'); scatteringCore.addColorStop(0.28, 'rgba(219,234,254,0.18)'); scatteringCore.addColorStop(0.68, 'rgba(196,181,253,0.06)'); scatteringCore.addColorStop(1, 'rgba(0,0,0,0)'); scatteringCtx.fillStyle = scatteringCore; scatteringCtx.fillRect(48, 0, 160, 128);
              for (var scatteringWisp = 0; scatteringWisp < 26; scatteringWisp++) { var wispX = 30 + Math.random() * 196, wispY = 35 + Math.random() * 58, wispRadiusX = 12 + Math.random() * 46, wispRadiusY = 3 + Math.random() * 13; scatteringCtx.save(); scatteringCtx.translate(wispX, wispY); scatteringCtx.scale(wispRadiusX, wispRadiusY); var wispGradient = scatteringCtx.createRadialGradient(0, 0, 0, 0, 0, 1); wispGradient.addColorStop(0, 'rgba(255,255,255,' + (0.08 + Math.random() * 0.13).toFixed(2) + ')'); wispGradient.addColorStop(1, 'rgba(255,255,255,0)'); scatteringCtx.fillStyle = wispGradient; scatteringCtx.beginPath(); scatteringCtx.arc(0, 0, 1, 0, Math.PI * 2); scatteringCtx.fill(); scatteringCtx.restore(); }
              var armScatteringTexture = tuneGalaxyTexture(new THREE.CanvasTexture(scatteringCv));

              // Resolved globular clusters occupy the old stellar halo.
              var clusterCv = document.createElement('canvas'); clusterCv.setAttribute('aria-hidden', 'true'); clusterCv.width = 128; clusterCv.height = 128;
              var clusterCtx = upscaleGalaxyCanvas(clusterCv, clusterCv.getContext('2d')); clusterCtx.translate(64, 64);
              var clusterHalo = clusterCtx.createRadialGradient(0, 0, 0, 0, 0, 62); clusterHalo.addColorStop(0, 'rgba(255,249,220,0.94)'); clusterHalo.addColorStop(0.2, 'rgba(254,215,170,0.38)'); clusterHalo.addColorStop(0.58, 'rgba(191,219,254,0.1)'); clusterHalo.addColorStop(1, 'rgba(0,0,0,0)'); clusterCtx.fillStyle = clusterHalo; clusterCtx.fillRect(-64, -64, 128, 128);
              for (var clusterStar = 0; clusterStar < 110; clusterStar++) { var clusterAngle = Math.random() * Math.PI * 2, clusterRadius = Math.pow(Math.random(), 1.9) * 55; clusterCtx.fillStyle = clusterStar % 5 === 0 ? 'rgba(191,219,254,0.72)' : clusterStar % 3 === 0 ? 'rgba(253,230,138,0.68)' : 'rgba(255,255,255,0.58)'; clusterCtx.beginPath(); clusterCtx.arc(Math.cos(clusterAngle) * clusterRadius, Math.sin(clusterAngle) * clusterRadius, 0.45 + Math.random() * 1.15, 0, Math.PI * 2); clusterCtx.fill(); }
              var clusterTex = tuneGalaxyTexture(new THREE.CanvasTexture(clusterCv));

              var fineStarCv = document.createElement('canvas'); fineStarCv.setAttribute('aria-hidden', 'true'); fineStarCv.width = 48; fineStarCv.height = 48;
              var fineStarCtx = upscaleGalaxyCanvas(fineStarCv, fineStarCv.getContext('2d'));
              var fineStarGlow = fineStarCtx.createRadialGradient(24, 24, 0, 24, 24, 24); fineStarGlow.addColorStop(0, 'rgba(255,255,255,1)'); fineStarGlow.addColorStop(0.18, 'rgba(219,234,254,0.7)'); fineStarGlow.addColorStop(0.56, 'rgba(147,197,253,0.12)'); fineStarGlow.addColorStop(1, 'rgba(0,0,0,0)'); fineStarCtx.fillStyle = fineStarGlow; fineStarCtx.fillRect(0, 0, 48, 48);
              var fineStarTex = tuneGalaxyTexture(new THREE.CanvasTexture(fineStarCv));

              // The brightest nursery knots resolve into dusty circumstellar disks,
              // accreting cores, and paired jets with terminal bow shocks.
              var circumstellarNurseryCount = resolvedQuality === 'cinematic' ? 26 : resolvedQuality === 'high' ? 16 : 9;
              for (var nurseryIndex = 0; nurseryIndex < circumstellarNurseryCount; nurseryIndex++) {
                var nurseryRadius = 0.18 + Math.pow(Math.random(), 0.72) * 0.54, nurseryArm = nurseryIndex % (gType.arms || 4), nurseryAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : nurseryArm / (gType.arms || 4) * Math.PI * 2 + nurseryRadius * (gType.windTightness || 2.5) + 0.11;
                var nurseryX = Math.cos(nurseryAngle) * nurseryRadius, nurseryY = (Math.random() - 0.5) * 0.036, nurseryZ = Math.sin(nurseryAngle) * nurseryRadius, nurseryAxis = nurseryAngle + Math.PI * 0.5 + ((nurseryIndex % 5) - 2) * 0.21, nurserySize = 0.009 + Math.random() * 0.007;
                for (var diskLayerIndex = 0; diskLayerIndex < 2; diskLayerIndex++) {
                  var isDiskRim = diskLayerIndex === 1, diskMaterial = new THREE.MeshBasicMaterial({ color: isDiskRim ? (nurseryIndex % 3 === 0 ? 0xf9a8d4 : 0xfbbf24) : 0x08030d, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: isDiskRim ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
                  var diskGeometry = isDiskRim ? new THREE.RingGeometry(0.58, 1, resolvedQuality === 'cinematic' ? 72 : 48, 1, 0.12, Math.PI * 1.72) : new THREE.RingGeometry(0.12, 1, resolvedQuality === 'cinematic' ? 72 : 48);
                  var diskMesh = new THREE.Mesh(diskGeometry, diskMaterial); diskMesh.position.set(nurseryX, nurseryY, nurseryZ); diskMesh.rotation.x = Math.PI * 0.5 + ((nurseryIndex % 4) - 1.5) * 0.08; diskMesh.rotation.z = nurseryAxis + diskLayerIndex * 0.07; diskMesh.scale.set(nurserySize, nurserySize * (isDiskRim ? 0.42 : 0.34), nurserySize); diskMesh.userData = { baseOpacity: isDiskRim ? 0.16 + (nurseryIndex % 4) * 0.025 : 0.24 + (nurseryIndex % 3) * 0.045, baseScale: nurserySize, flattening: isDiskRim ? 0.42 : 0.34, phase: nurseryIndex * 0.81 + diskLayerIndex, drift: (nurseryIndex % 2 ? -1 : 1) * (isDiskRim ? 0.00022 : 0.00008), isRim: isDiskRim }; diskMesh.renderOrder = isDiskRim ? 8 : 6; protoplanetaryDiskGroup.add(diskMesh); protoplanetaryDiskMeshes.push(diskMesh);
                }
                var nurseryCoreMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: nurseryIndex % 4 === 0 ? 0xfef3c7 : 0xe0f2fe, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                var nurseryCore = new THREE.Sprite(nurseryCoreMaterial), nurseryCoreScale = nurserySize * 0.36; nurseryCore.position.set(nurseryX, nurseryY, nurseryZ); nurseryCore.scale.set(nurseryCoreScale, nurseryCoreScale, 1); nurseryCore.userData = { baseOpacity: 0.52 + (nurseryIndex % 5) * 0.06, baseScale: nurseryCoreScale, phase: nurseryIndex * 0.81 }; nurseryCore.renderOrder = 9; circumstellarNurseryGroup.add(nurseryCore); protostellarCoreSprites.push(nurseryCore);
                var jetVectorX = Math.cos(nurseryAxis) * 0.34, jetVectorY = 0.88, jetVectorZ = Math.sin(nurseryAxis) * 0.34;
                for (var jetSideIndex = 0; jetSideIndex < 2; jetSideIndex++) {
                  var jetDirection = jetSideIndex ? -1 : 1, jetMaterial = new THREE.SpriteMaterial({ map: chromaticHaloTex || fineStarTex, color: nurseryIndex % 5 === 0 ? 0xf9a8d4 : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: nurseryAxis + (jetSideIndex ? Math.PI : 0) });
                  var jetSprite = new THREE.Sprite(jetMaterial), jetOffset = nurserySize * 1.08; jetSprite.position.set(nurseryX + jetVectorX * jetOffset * jetDirection, nurseryY + jetVectorY * jetOffset * jetDirection, nurseryZ + jetVectorZ * jetOffset * jetDirection); jetSprite.scale.set(nurserySize * 0.34, nurserySize * 2.35, 1); jetSprite.userData = { baseOpacity: 0.1 + (nurseryIndex % 4) * 0.02, baseScaleX: nurserySize * 0.34, baseScaleY: nurserySize * 2.35, phase: nurseryIndex * 0.81 + jetSideIndex * Math.PI, drift: (jetSideIndex ? -1 : 1) * 0.00018 }; jetSprite.renderOrder = 8; protostellarJetGroup.add(jetSprite); protostellarJetSprites.push(jetSprite);
                  var shockMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: jetSideIndex ? 0xf9a8d4 : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                  var shockKnot = new THREE.Sprite(shockMaterial), shockOffset = nurserySize * 2.28, shockScale = nurserySize * 0.31; shockKnot.position.set(nurseryX + jetVectorX * shockOffset * jetDirection, nurseryY + jetVectorY * shockOffset * jetDirection, nurseryZ + jetVectorZ * shockOffset * jetDirection); shockKnot.scale.set(shockScale, shockScale, 1); shockKnot.userData = { baseOpacity: 0.32 + (nurseryIndex % 3) * 0.07, baseScale: shockScale, phase: nurseryIndex * 0.81 + jetSideIndex * 2.1 }; shockKnot.renderOrder = 9; protostellarJetGroup.add(shockKnot); protostellarShockKnots.push(shockKnot);
                }
              }
              // Nearby evolved stars resolve into compact ionizing cores, opposing
              // gas lobes, and broken emission shells only at inspection distance.
              var planetaryNebulaCount = resolvedQuality === 'cinematic' ? 34 : resolvedQuality === 'high' ? 22 : 12;
              for (var planetaryNebulaIndex = 0; planetaryNebulaIndex < planetaryNebulaCount; planetaryNebulaIndex++) {
                var planetaryRadius = 0.16 + Math.pow(Math.random(), 0.78) * 0.58, planetaryArm = planetaryNebulaIndex % (gType.arms || 4), planetaryAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : planetaryArm / (gType.arms || 4) * Math.PI * 2 + planetaryRadius * (gType.windTightness || 2.5) + 0.045;
                var planetaryX = Math.cos(planetaryAngle) * planetaryRadius, planetaryY = (Math.random() - 0.5) * 0.052, planetaryZ = Math.sin(planetaryAngle) * planetaryRadius, planetaryAxis = planetaryAngle + Math.PI * (0.26 + (planetaryNebulaIndex % 7) * 0.067), planetarySize = 0.012 + Math.random() * 0.009;
                for (var planetaryLobeSide = 0; planetaryLobeSide < 2; planetaryLobeSide++) {
                  var planetaryDirection = planetaryLobeSide ? -1 : 1, planetaryLobeMaterial = new THREE.SpriteMaterial({ map: chromaticHaloTex || fineStarTex, color: planetaryNebulaIndex % 4 === 0 ? 0xf9a8d4 : planetaryNebulaIndex % 3 === 0 ? 0xc4b5fd : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: planetaryAxis + Math.PI * 0.5 });
                  var planetaryLobe = new THREE.Sprite(planetaryLobeMaterial), planetaryOffset = planetarySize * 0.62;
                  planetaryLobe.position.set(planetaryX + Math.cos(planetaryAxis) * planetaryOffset * planetaryDirection, planetaryY + (planetaryLobeSide ? -1 : 1) * planetarySize * 0.08, planetaryZ + Math.sin(planetaryAxis) * planetaryOffset * planetaryDirection);
                  planetaryLobe.scale.set(planetarySize * 0.62, planetarySize * 1.85, 1); planetaryLobe.userData = { baseOpacity: 0.11 + (planetaryNebulaIndex % 5) * 0.018, baseScaleX: planetarySize * 0.62, baseScaleY: planetarySize * 1.85, phase: planetaryNebulaIndex * 0.93 + planetaryLobeSide * Math.PI, drift: (planetaryLobeSide ? -1 : 1) * 0.0002 }; planetaryLobe.renderOrder = 7; resolvedPlanetaryNebulaGroup.add(planetaryLobe); planetaryNebulaLobes.push(planetaryLobe);
                }
                for (var planetaryShellIndex = 0; planetaryShellIndex < 2; planetaryShellIndex++) {
                  var planetaryShellMaterial = new THREE.MeshBasicMaterial({ color: planetaryShellIndex ? 0xf9a8d4 : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                  var planetaryShell = new THREE.Mesh(new THREE.RingGeometry(0.76, 1, resolvedQuality === 'cinematic' ? 64 : 40, 1, planetaryShellIndex * Math.PI + 0.24, Math.PI * 0.72), planetaryShellMaterial);
                  planetaryShell.position.set(planetaryX, planetaryY, planetaryZ); planetaryShell.rotation.x = Math.PI * 0.5; planetaryShell.rotation.z = planetaryAxis + planetaryShellIndex * 0.22; planetaryShell.scale.set(planetarySize, planetarySize * 0.72, planetarySize); planetaryShell.userData = { baseOpacity: 0.09 + planetaryShellIndex * 0.025, baseScale: planetarySize, phase: planetaryNebulaIndex * 0.93 + planetaryShellIndex * 1.6, drift: (planetaryShellIndex ? -1 : 1) * 0.00024 }; planetaryShell.renderOrder = 8; resolvedPlanetaryNebulaGroup.add(planetaryShell); planetaryNebulaShells.push(planetaryShell);
                }
                var planetaryCoreMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: planetaryNebulaIndex % 3 === 0 ? 0xe0f2fe : 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                var planetaryCore = new THREE.Sprite(planetaryCoreMaterial), planetaryCoreScale = planetarySize * 0.34; planetaryCore.position.set(planetaryX, planetaryY, planetaryZ); planetaryCore.scale.set(planetaryCoreScale, planetaryCoreScale, 1); planetaryCore.userData = { baseOpacity: 0.58 + (planetaryNebulaIndex % 4) * 0.06, baseScale: planetaryCoreScale, phase: planetaryNebulaIndex * 0.93 }; planetaryCore.renderOrder = 9; resolvedPlanetaryNebulaGroup.add(planetaryCore); planetaryNebulaCores.push(planetaryCore);
              }

              // Compact open clusters resolve the youngest spiral-arm associations.
              var openClusterStarCount = resolvedQuality === 'cinematic' ? 7200 : resolvedQuality === 'high' ? 3200 : 1200;
              var openClusterSize = 28, openCenterCount = Math.ceil(openClusterStarCount / openClusterSize), openCenters = [];
              for (var oc = 0; oc < openCenterCount; oc++) { var ocRadius = 0.13 + Math.pow(Math.random(), 0.7) * 0.72, ocAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : (oc % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + ocRadius * (gType.windTightness || 2.5) - 0.05; openCenters.push({ x: Math.cos(ocAngle) * ocRadius, y: (Math.random() - 0.5) * 0.045, z: Math.sin(ocAngle) * ocRadius }); }
              var openGeo = new THREE.BufferGeometry(), openPos = new Float32Array(openClusterStarCount * 3), openCol = new Float32Array(openClusterStarCount * 3);
              for (var os = 0; os < openClusterStarCount; os++) { var openCenter = openCenters[Math.floor(os / openClusterSize) % openCenters.length], openSpread = 0.004 + Math.pow(Math.random(), 2) * 0.024; openPos[os * 3] = openCenter.x + (Math.random() - 0.5) * openSpread; openPos[os * 3 + 1] = openCenter.y + (Math.random() - 0.5) * openSpread * 0.42; openPos[os * 3 + 2] = openCenter.z + (Math.random() - 0.5) * openSpread; var openColor = new THREE.Color().setHSL(os % 7 === 0 ? 0.91 : 0.57 + Math.random() * 0.045, 0.58 + Math.random() * 0.35, 0.58 + Math.random() * 0.3); openCol[os * 3] = openColor.r; openCol[os * 3 + 1] = openColor.g; openCol[os * 3 + 2] = openColor.b; }
              openGeo.setAttribute('position', new THREE.BufferAttribute(openPos, 3)); openGeo.setAttribute('color', new THREE.BufferAttribute(openCol, 3)); openClusterMat = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.012 : 0.009, map: fineStarTex, vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending }); openClusterMat.userData.baseOpacity = openClusterMat.opacity; var openClusterPoints = new THREE.Points(openGeo, openClusterMat); openClusterPoints.renderOrder = 3; armGroup.add(openClusterPoints);
              // At close range, selected associations resolve into faint tidal
              // coronas and individually luminous members rather than larger dots.
              var resolvedClusterCount = Math.min(openCenters.length, resolvedQuality === 'cinematic' ? 48 : resolvedQuality === 'high' ? 30 : 18);
              for (var resolvedClusterIndex = 0; resolvedClusterIndex < resolvedClusterCount; resolvedClusterIndex++) {
                var resolvedCenter = openCenters[Math.floor(resolvedClusterIndex * openCenters.length / resolvedClusterCount)], coronaRadius = 0.014 + (resolvedClusterIndex % 5) * 0.0025;
                var coronaMaterial = new THREE.MeshBasicMaterial({ color: resolvedClusterIndex % 5 === 0 ? 0xf9a8d4 : resolvedClusterIndex % 3 === 0 ? 0xfde68a : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); coronaMaterial.userData = { baseOpacity: 0.09 + (resolvedClusterIndex % 4) * 0.025, phase: resolvedClusterIndex * 0.74 };
                var coronaMesh = new THREE.Mesh(new THREE.RingGeometry(coronaRadius * 0.72, coronaRadius, resolvedQuality === 'cinematic' ? 72 : 48, 1, resolvedClusterIndex * 0.47, Math.PI * (1.25 + resolvedClusterIndex % 3 * 0.18)), coronaMaterial); coronaMesh.position.set(resolvedCenter.x, resolvedCenter.y, resolvedCenter.z); coronaMesh.rotation.x = Math.PI * 0.5; coronaMesh.rotation.z = resolvedClusterIndex * 0.31; coronaMesh.userData = { baseScale: 1, phase: resolvedClusterIndex * 0.74, drift: (resolvedClusterIndex % 2 ? -1 : 1) * 0.00016 }; coronaMesh.renderOrder = 5; resolvedClusterGroup.add(coronaMesh); resolvedClusterCoronas.push(coronaMesh);
                var resolvedMemberCount = resolvedQuality === 'cinematic' ? 7 : resolvedQuality === 'high' ? 5 : 4;
                for (var resolvedMemberIndex = 0; resolvedMemberIndex < resolvedMemberCount; resolvedMemberIndex++) { var memberMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: resolvedMemberIndex % 5 === 0 ? 0xf9a8d4 : resolvedMemberIndex % 3 === 0 ? 0xfde68a : 0xbfdbfe, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); var memberSprite = new THREE.Sprite(memberMaterial), memberAngle = resolvedMemberIndex / resolvedMemberCount * Math.PI * 2 + resolvedClusterIndex, memberRadius = coronaRadius * (0.18 + Math.random() * 0.58), memberScale = 0.0045 + Math.random() * 0.005; memberSprite.position.set(resolvedCenter.x + Math.cos(memberAngle) * memberRadius, resolvedCenter.y + (Math.random() - 0.5) * coronaRadius * 0.22, resolvedCenter.z + Math.sin(memberAngle) * memberRadius); memberSprite.scale.set(memberScale, memberScale, 1); memberSprite.userData = { baseOpacity: 0.24 + Math.random() * 0.32, baseScale: memberScale, phase: resolvedClusterIndex * 0.8 + resolvedMemberIndex * 1.1 }; memberSprite.renderOrder = 6; resolvedClusterGroup.add(memberSprite); resolvedClusterMembers.push(memberSprite); }
                var resolvedBinaryPairCount = resolvedQuality === 'cinematic' ? 2 : resolvedQuality === 'high' ? 1 : resolvedClusterIndex % 2 === 0 ? 1 : 0;
                for (var binaryPairIndex = 0; binaryPairIndex < resolvedBinaryPairCount; binaryPairIndex++) { var binaryCenterAngle = resolvedClusterIndex * 0.61 + binaryPairIndex * 2.2, binaryCenterRadius = coronaRadius * (0.24 + Math.random() * 0.34), binaryCenterX = Math.cos(binaryCenterAngle) * binaryCenterRadius, binaryCenterZ = Math.sin(binaryCenterAngle) * binaryCenterRadius, binarySeparation = 0.0018 + Math.random() * 0.0018, binaryPhase = resolvedClusterIndex * 0.73 + binaryPairIndex * 1.9, binarySpeed = 0.48 + Math.random() * 0.42; for (var binarySide = 0; binarySide < 2; binarySide++) { var binaryMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: binarySide ? 0xfde68a : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); var binarySprite = new THREE.Sprite(binaryMaterial), binaryScale = (binarySide ? 0.0032 : 0.0038) + Math.random() * 0.0016, binaryDirection = binarySide ? -1 : 1; binarySprite.position.set(resolvedCenter.x + binaryCenterX + Math.cos(binaryPhase) * binarySeparation * binaryDirection, resolvedCenter.y, resolvedCenter.z + binaryCenterZ + Math.sin(binaryPhase) * binarySeparation * binaryDirection); binarySprite.scale.set(binaryScale, binaryScale, 1); binarySprite.userData = { baseOpacity: 0.36 + Math.random() * 0.26, baseScale: binaryScale, clusterX: resolvedCenter.x, clusterY: resolvedCenter.y, clusterZ: resolvedCenter.z, centerX: binaryCenterX, centerZ: binaryCenterZ, separation: binarySeparation, phase: binaryPhase, speed: binarySpeed, direction: binaryDirection }; binarySprite.renderOrder = 7; resolvedBinaryGroup.add(binarySprite); resolvedClusterBinaries.push(binarySprite); } }
              }

              // Leading and trailing streams reveal cluster dissolution under the
              // galaxy's tidal field without adding noise at overview scales.
              var clusterTailCount = resolvedClusterCount, clusterTailSegments = resolvedQuality === 'cinematic' ? 24 : resolvedQuality === 'high' ? 18 : 12;
              for (var clusterTailIndex = 0; clusterTailIndex < clusterTailCount; clusterTailIndex++) {
                var clusterTailCenter = openCenters[Math.floor(clusterTailIndex * openCenters.length / clusterTailCount)], clusterTailRadialAngle = Math.atan2(clusterTailCenter.z, clusterTailCenter.x), clusterTailTangentAngle = clusterTailRadialAngle + Math.PI * 0.5, clusterTailExtent = 0.026 + (clusterTailIndex % 6) * 0.0045;
                for (var clusterTailSideIndex = 0; clusterTailSideIndex < 2; clusterTailSideIndex++) {
                  var clusterTailDirection = clusterTailSideIndex ? -1 : 1, clusterTailPoints = [];
                  for (var clusterTailStep = 0; clusterTailStep <= clusterTailSegments; clusterTailStep++) {
                    var clusterTailT = clusterTailStep / clusterTailSegments, clusterTailAlong = clusterTailDirection * clusterTailExtent * clusterTailT, clusterTailBend = clusterTailDirection * Math.sin(clusterTailT * Math.PI) * clusterTailExtent * 0.16 + Math.sin(clusterTailT * Math.PI * 2 + clusterTailIndex) * clusterTailExtent * 0.045;
                    clusterTailPoints.push(new THREE.Vector3(clusterTailCenter.x + Math.cos(clusterTailTangentAngle) * clusterTailAlong + Math.cos(clusterTailRadialAngle) * clusterTailBend, clusterTailCenter.y + Math.sin(clusterTailT * Math.PI + clusterTailIndex) * clusterTailExtent * 0.045, clusterTailCenter.z + Math.sin(clusterTailTangentAngle) * clusterTailAlong + Math.sin(clusterTailRadialAngle) * clusterTailBend));
                  }
                  var clusterTailMaterial = new THREE.LineBasicMaterial({ color: clusterTailIndex % 5 === 0 ? 0xf9a8d4 : clusterTailIndex % 3 === 0 ? 0xfde68a : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); clusterTailMaterial.userData = { baseOpacity: 0.038 + (clusterTailIndex % 4) * 0.012, phase: clusterTailIndex * 0.79 + clusterTailSideIndex * Math.PI };
                  var clusterTailLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(clusterTailPoints), clusterTailMaterial); clusterTailLine.renderOrder = 6; clusterDissolutionTailGroup.add(clusterTailLine); clusterTidalTailMaterials.push(clusterTailMaterial);
                }
              }
              var escapedMembersPerCluster = resolvedQuality === 'cinematic' ? 12 : resolvedQuality === 'high' ? 8 : 5, clusterTailPointCount = clusterTailCount * escapedMembersPerCluster, escapedMemberPositions = new Float32Array(clusterTailPointCount * 3), escapedMemberColors = new Float32Array(clusterTailPointCount * 3);
              for (var escapedMemberIndex = 0; escapedMemberIndex < clusterTailPointCount; escapedMemberIndex++) {
                var escapedClusterIndex = Math.floor(escapedMemberIndex / escapedMembersPerCluster), escapedCenter = openCenters[Math.floor(escapedClusterIndex * openCenters.length / clusterTailCount)], escapedRadialAngle = Math.atan2(escapedCenter.z, escapedCenter.x), escapedTangentAngle = escapedRadialAngle + Math.PI * 0.5, escapedDirection = escapedMemberIndex % 2 ? -1 : 1, escapedT = Math.pow(Math.random(), 0.72), escapedExtent = 0.026 + (escapedClusterIndex % 6) * 0.0045, escapedAlong = escapedDirection * escapedExtent * (0.16 + escapedT * 0.88), escapedBend = escapedDirection * Math.sin(escapedT * Math.PI) * escapedExtent * 0.16 + (Math.random() - 0.5) * escapedExtent * 0.08, escapedOffset = escapedMemberIndex * 3;
                escapedMemberPositions[escapedOffset] = escapedCenter.x + Math.cos(escapedTangentAngle) * escapedAlong + Math.cos(escapedRadialAngle) * escapedBend; escapedMemberPositions[escapedOffset + 1] = escapedCenter.y + (Math.random() - 0.5) * escapedExtent * 0.12; escapedMemberPositions[escapedOffset + 2] = escapedCenter.z + Math.sin(escapedTangentAngle) * escapedAlong + Math.sin(escapedRadialAngle) * escapedBend;
                var escapedColor = new THREE.Color().setHSL(escapedMemberIndex % 7 === 0 ? 0.91 : escapedMemberIndex % 3 === 0 ? 0.12 : 0.58, 0.62, 0.72); escapedMemberColors[escapedOffset] = escapedColor.r; escapedMemberColors[escapedOffset + 1] = escapedColor.g; escapedMemberColors[escapedOffset + 2] = escapedColor.b;
              }
              var escapedMemberGeometry = new THREE.BufferGeometry(); escapedMemberGeometry.setAttribute('position', new THREE.BufferAttribute(escapedMemberPositions, 3)); escapedMemberGeometry.setAttribute('color', new THREE.BufferAttribute(escapedMemberColors, 3)); escapedClusterMemberMaterial = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.0065 : 0.0055, map: fineStarTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); escapedClusterMemberMaterial.userData = { baseOpacity: 0.42 };
              var escapedClusterMemberPoints = new THREE.Points(escapedMemberGeometry, escapedClusterMemberMaterial); escapedClusterMemberPoints.renderOrder = 7; clusterDissolutionTailGroup.add(escapedClusterMemberPoints);
              // A vertically extended thick disk gives edge-on views real depth.
              var thickDiskCount = resolvedQuality === 'cinematic' ? 15000 : resolvedQuality === 'high' ? 6500 : 2200;
              var thickGeo = new THREE.BufferGeometry(), thickPos = new Float32Array(thickDiskCount * 3), thickCol = new Float32Array(thickDiskCount * 3);
              for (var td = 0; td < thickDiskCount; td++) { var thickRadius = Math.pow(Math.random(), 0.54) * 0.94, thickAngle = Math.random() * Math.PI * 2, thickHeight = (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 2.3) * (galaxyType === 'elliptical' ? 0.28 : 0.16) * (1 - thickRadius * 0.34); thickPos[td * 3] = Math.cos(thickAngle) * thickRadius; thickPos[td * 3 + 1] = thickHeight; thickPos[td * 3 + 2] = Math.sin(thickAngle) * thickRadius * (galaxyType === 'elliptical' ? 0.8 : 1); var thickColor = new THREE.Color().setHSL(0.075 + Math.random() * 0.09, 0.28 + Math.random() * 0.34, 0.42 + Math.random() * 0.28); thickCol[td * 3] = thickColor.r; thickCol[td * 3 + 1] = thickColor.g; thickCol[td * 3 + 2] = thickColor.b; }
              thickGeo.setAttribute('position', new THREE.BufferAttribute(thickPos, 3)); thickGeo.setAttribute('color', new THREE.BufferAttribute(thickCol, 3)); thickDiskMat = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.009 : 0.007, map: fineStarTex, vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }); thickDiskMat.userData.baseOpacity = thickDiskMat.opacity; var thickDiskPoints = new THREE.Points(thickGeo, thickDiskMat); thickDiskPoints.renderOrder = 0; armGroup.add(thickDiskPoints);

              // Broken shells preserve the filamentary look of supernova remnants.
              var remnantCount = resolvedQuality === 'cinematic' ? 24 : resolvedQuality === 'high' ? 15 : 8;
              for (var remnant = 0; remnant < remnantCount; remnant++) { var remnantRadius = 0.18 + Math.random() * 0.64, remnantAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : (remnant % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + remnantRadius * (gType.windTightness || 2.5); for (var remnantArcIndex = 0; remnantArcIndex < 3; remnantArcIndex++) { var remnantMat = new THREE.MeshBasicMaterial({ color: remnantArcIndex === 0 ? 0x7dd3fc : remnantArcIndex === 1 ? 0xf9a8d4 : 0xfde68a, transparent: true, opacity: 0.08 + Math.random() * 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var remnantArc = new THREE.Mesh(new THREE.RingGeometry(0.78, 1, resolvedQuality === 'cinematic' ? 72 : 40, 1, remnantArcIndex * 2.05 + Math.random() * 0.3, 1.1 + Math.random() * 0.72), remnantMat); remnantArc.position.set(Math.cos(remnantAngle) * remnantRadius, (Math.random() - 0.5) * 0.035, Math.sin(remnantAngle) * remnantRadius); remnantArc.rotation.x = Math.PI * 0.5; remnantArc.rotation.z = Math.random() * Math.PI; var remnantScale = 0.016 + Math.random() * 0.032; remnantArc.scale.set(remnantScale, remnantScale, remnantScale); remnantArc.userData = { baseOpacity: remnantMat.opacity, baseScale: remnantScale, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.0005 }; remnantArc.renderOrder = 4; gasGroup.add(remnantArc); supernovaRemnantArcs.push(remnantArc); } }

              // Inspection-distance remnants reveal unstable ejecta fingers, a
              // reverse shock, outward-moving knots, and the compact survivor.
              var resolvedRemnantCount = resolvedQuality === 'cinematic' ? 18 : resolvedQuality === 'high' ? 11 : 6;
              for (var resolvedRemnantIndex = 0; resolvedRemnantIndex < resolvedRemnantCount; resolvedRemnantIndex++) {
                var resolvedRemnantRadius = 0.18 + Math.pow(Math.random(), 0.78) * 0.6, resolvedRemnantArm = resolvedRemnantIndex % (gType.arms || 4), resolvedRemnantAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : resolvedRemnantArm / (gType.arms || 4) * Math.PI * 2 + resolvedRemnantRadius * (gType.windTightness || 2.5) - 0.018;
                var remnantCenterX = Math.cos(resolvedRemnantAngle) * resolvedRemnantRadius, remnantCenterY = (Math.random() - 0.5) * 0.045, remnantCenterZ = Math.sin(resolvedRemnantAngle) * resolvedRemnantRadius, remnantInteriorSize = 0.017 + Math.random() * 0.022;
                var ejectaFilamentCount = resolvedQuality === 'cinematic' ? 18 : resolvedQuality === 'high' ? 12 : 8, ejectaFilamentPositions = new Float32Array(ejectaFilamentCount * 6);
                for (var ejectaFilamentIndex = 0; ejectaFilamentIndex < ejectaFilamentCount; ejectaFilamentIndex++) {
                  var ejectaDirection = ejectaFilamentIndex / ejectaFilamentCount * Math.PI * 2 + Math.sin(ejectaFilamentIndex * 2.17 + resolvedRemnantIndex) * 0.16, ejectaInnerRadius = remnantInteriorSize * (0.18 + Math.random() * 0.2), ejectaOuterRadius = remnantInteriorSize * (0.68 + Math.random() * 0.3), ejectaFilamentOffset = ejectaFilamentIndex * 6, ejectaWarp = Math.sin(ejectaFilamentIndex * 1.31 + resolvedRemnantIndex) * remnantInteriorSize * 0.08;
                  ejectaFilamentPositions[ejectaFilamentOffset] = remnantCenterX + Math.cos(ejectaDirection - 0.08) * ejectaInnerRadius; ejectaFilamentPositions[ejectaFilamentOffset + 1] = remnantCenterY + ejectaWarp * 0.35; ejectaFilamentPositions[ejectaFilamentOffset + 2] = remnantCenterZ + Math.sin(ejectaDirection - 0.08) * ejectaInnerRadius;
                  ejectaFilamentPositions[ejectaFilamentOffset + 3] = remnantCenterX + Math.cos(ejectaDirection + 0.12) * ejectaOuterRadius; ejectaFilamentPositions[ejectaFilamentOffset + 4] = remnantCenterY + ejectaWarp; ejectaFilamentPositions[ejectaFilamentOffset + 5] = remnantCenterZ + Math.sin(ejectaDirection + 0.12) * ejectaOuterRadius;
                }
                var ejectaFilamentGeometry = new THREE.BufferGeometry(); ejectaFilamentGeometry.setAttribute('position', new THREE.BufferAttribute(ejectaFilamentPositions, 3));
                var ejectaFilamentMaterial = new THREE.LineBasicMaterial({ color: resolvedRemnantIndex % 4 === 0 ? 0xf9a8d4 : resolvedRemnantIndex % 3 === 0 ? 0xfde68a : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); ejectaFilamentMaterial.userData = { baseOpacity: 0.055 + (resolvedRemnantIndex % 5) * 0.012, phase: resolvedRemnantIndex * 0.91 };
                var ejectaFilamentWeb = new THREE.LineSegments(ejectaFilamentGeometry, ejectaFilamentMaterial); ejectaFilamentWeb.renderOrder = 8; resolvedSupernovaEjectaGroup.add(ejectaFilamentWeb); supernovaEjectaFilamentMaterials.push(ejectaFilamentMaterial);
                for (var reverseShockIndex = 0; reverseShockIndex < 2; reverseShockIndex++) {
                  var reverseShockMaterial = new THREE.MeshBasicMaterial({ color: reverseShockIndex ? 0xf9a8d4 : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                  var reverseShockShell = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, resolvedQuality === 'cinematic' ? 72 : 48, 1, reverseShockIndex * Math.PI + 0.18, Math.PI * 0.78), reverseShockMaterial); reverseShockShell.position.set(remnantCenterX, remnantCenterY, remnantCenterZ); reverseShockShell.rotation.x = Math.PI * 0.5; reverseShockShell.rotation.z = resolvedRemnantAngle + reverseShockIndex * 0.3; var reverseShockScale = remnantInteriorSize * (0.42 + reverseShockIndex * 0.12); reverseShockShell.scale.set(reverseShockScale, reverseShockScale, reverseShockScale); reverseShockShell.userData = { baseOpacity: 0.08 + reverseShockIndex * 0.035, baseScale: reverseShockScale, phase: resolvedRemnantIndex * 0.91 + reverseShockIndex * 1.7, drift: (reverseShockIndex ? -1 : 1) * 0.00028 }; reverseShockShell.renderOrder = 9; resolvedSupernovaEjectaGroup.add(reverseShockShell); reverseShockShells.push(reverseShockShell);
                }
                var ejectaKnotCount = resolvedQuality === 'cinematic' ? 5 : resolvedQuality === 'high' ? 4 : 3;
                for (var ejectaKnotIndex = 0; ejectaKnotIndex < ejectaKnotCount; ejectaKnotIndex++) {
                  var knotDirectionAngle = ejectaKnotIndex / ejectaKnotCount * Math.PI * 2 + resolvedRemnantIndex * 0.73, knotElevation = ((ejectaKnotIndex % 3) - 1) * 0.22, knotPlanar = Math.cos(knotElevation), knotDirectionX = Math.cos(knotDirectionAngle) * knotPlanar, knotDirectionY = Math.sin(knotElevation), knotDirectionZ = Math.sin(knotDirectionAngle) * knotPlanar, knotBaseRadius = remnantInteriorSize * (0.48 + Math.random() * 0.38);
                  var ejectaKnotMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: ejectaKnotIndex % 3 === 0 ? 0xfde68a : ejectaKnotIndex % 2 === 0 ? 0xf9a8d4 : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                  var ejectaKnot = new THREE.Sprite(ejectaKnotMaterial), ejectaKnotScale = remnantInteriorSize * (0.1 + Math.random() * 0.08); ejectaKnot.position.set(remnantCenterX + knotDirectionX * knotBaseRadius, remnantCenterY + knotDirectionY * knotBaseRadius, remnantCenterZ + knotDirectionZ * knotBaseRadius); ejectaKnot.scale.set(ejectaKnotScale, ejectaKnotScale, 1); ejectaKnot.userData = { baseOpacity: 0.28 + (ejectaKnotIndex % 3) * 0.08, baseScale: ejectaKnotScale, centerX: remnantCenterX, centerY: remnantCenterY, centerZ: remnantCenterZ, directionX: knotDirectionX, directionY: knotDirectionY, directionZ: knotDirectionZ, baseRadius: knotBaseRadius, expansion: remnantInteriorSize * (0.04 + Math.random() * 0.05), phase: resolvedRemnantIndex * 0.91 + ejectaKnotIndex * 1.34 }; ejectaKnot.renderOrder = 10; resolvedSupernovaEjectaGroup.add(ejectaKnot); supernovaEjectaKnots.push(ejectaKnot);
                }
                var compactCoreMaterial = new THREE.SpriteMaterial({ map: fineStarTex, color: resolvedRemnantIndex % 4 === 0 ? 0xc4b5fd : 0xe0f2fe, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                var compactCoreSprite = new THREE.Sprite(compactCoreMaterial), compactCoreScale = remnantInteriorSize * 0.14; compactCoreSprite.position.set(remnantCenterX, remnantCenterY, remnantCenterZ); compactCoreSprite.scale.set(compactCoreScale, compactCoreScale, 1); compactCoreSprite.userData = { baseOpacity: 0.54 + (resolvedRemnantIndex % 4) * 0.08, baseScale: compactCoreScale, phase: resolvedRemnantIndex * 0.91 }; compactCoreSprite.renderOrder = 11; resolvedSupernovaEjectaGroup.add(compactCoreSprite); compactRemnantCoreSprites.push(compactCoreSprite);
              }
              // Braided molecular clouds add parsec-scale structure across the bright arms.
              var molecularCloudCount = resolvedQuality === 'cinematic' ? 34 : resolvedQuality === 'high' ? 22 : 12;
              for (var mc = 0; mc < molecularCloudCount; mc++) {
                var cloudRadius = 0.16 + Math.pow(Math.random(), 0.72) * 0.7;
                var cloudArm = mc % (gType.arms || 4);
                var cloudBaseAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : cloudArm / (gType.arms || 4) * Math.PI * 2 + cloudRadius * (gType.windTightness || 2.5) + 0.1;
                for (var braid = 0; braid < 2; braid++) {
                  var cloudPoints = [], cloudSegments = resolvedQuality === 'cinematic' ? 54 : 34;
                  for (var mcs = 0; mcs <= cloudSegments; mcs++) {
                    var cloudT = mcs / cloudSegments, cloudSpan = (cloudT - 0.5) * (0.09 + (mc % 5) * 0.008), cloudR = cloudRadius + cloudSpan;
                    var cloudAngle = cloudBaseAngle + cloudSpan * 2.2 + Math.sin(cloudT * Math.PI * (2 + mc % 3) + braid * 1.8) * 0.012 + braid * 0.009;
                    cloudPoints.push(new THREE.Vector3(Math.cos(cloudAngle) * cloudR, 0.006 + Math.sin(cloudT * Math.PI * 2 + mc) * 0.004 + braid * 0.0015, Math.sin(cloudAngle) * cloudR));
                  }
                  var cloudMat = new THREE.LineBasicMaterial({ color: braid ? 0x160c20 : 0x030108, transparent: true, opacity: braid ? 0.25 : 0.46, depthWrite: false, blending: THREE.NormalBlending });
                  cloudMat.userData = { baseOpacity: cloudMat.opacity, phase: Math.random() * Math.PI * 2, edge: false };
                  var cloudLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cloudPoints), cloudMat); cloudLine.renderOrder = 5; molecularCloudGroup.add(cloudLine); molecularFilamentMats.push(cloudMat);
                  var cloudEdgeMat = new THREE.LineBasicMaterial({ color: mc % 3 === 0 ? 0x7dd3fc : mc % 2 === 0 ? 0xa78bfa : 0xfb7185, transparent: true, opacity: 0.035 + Math.random() * 0.035, depthWrite: false, blending: THREE.AdditiveBlending });
                  cloudEdgeMat.userData = { baseOpacity: cloudEdgeMat.opacity, phase: cloudMat.userData.phase + 0.7, edge: true };
                  var cloudEdge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cloudPoints), cloudEdgeMat); cloudEdge.position.y += 0.001; cloudEdge.renderOrder = 6; molecularCloudGroup.add(cloudEdge); molecularFilamentMats.push(cloudEdgeMat);
                }
              }

              // Embedded protostars punctuate dense cloud lanes with tiny, warm cores.
              var protostarCount = resolvedQuality === 'cinematic' ? 96 : resolvedQuality === 'high' ? 56 : 28;
              for (var pk = 0; pk < protostarCount; pk++) {
                var protoRadius = 0.14 + Math.pow(Math.random(), 0.76) * 0.7;
                var protoAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : (pk % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + protoRadius * (gType.windTightness || 2.5) + 0.08;
                var protoMat = new THREE.SpriteMaterial({ map: birthTex, color: pk % 5 === 0 ? 0x93c5fd : pk % 3 === 0 ? 0xf9a8d4 : 0xfde68a, transparent: true, opacity: 0.28 + Math.random() * 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
                var protoSprite = new THREE.Sprite(protoMat); protoSprite.position.set(Math.cos(protoAngle) * protoRadius, (Math.random() - 0.5) * 0.026, Math.sin(protoAngle) * protoRadius); var protoScale = 0.009 + Math.random() * 0.016; protoSprite.scale.set(protoScale, protoScale, 1); protoSprite.userData = { baseOpacity: protoMat.opacity, baseScale: protoScale, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.0012 }; protoSprite.renderOrder = 7; protostarKnotGroup.add(protoSprite); protostarKnotSprites.push(protoSprite);
              }

              // Nearby translucent dust produces a restrained parallax layer during camera orbit.
              var foregroundDustCount = resolvedQuality === 'cinematic' ? 38 : resolvedQuality === 'high' ? 22 : 10;
              for (var fd = 0; fd < foregroundDustCount; fd++) {
                var foregroundMat = new THREE.SpriteMaterial({ map: dustVolumeTex, color: fd % 3 === 0 ? 0x312e81 : fd % 2 === 0 ? 0x3b1b4d : 0x172554, transparent: true, opacity: 0.022 + Math.random() * 0.042, depthWrite: false, blending: THREE.NormalBlending, rotation: Math.random() * Math.PI });
                var foregroundSprite = new THREE.Sprite(foregroundMat), foregroundAngle = Math.random() * Math.PI * 2, foregroundRadius = 0.88 + Math.random() * 0.5;
                foregroundSprite.position.set(Math.cos(foregroundAngle) * foregroundRadius, (Math.random() - 0.5) * 0.34, Math.sin(foregroundAngle) * foregroundRadius); var foregroundScaleX = 0.16 + Math.random() * 0.28, foregroundScaleY = foregroundScaleX * (0.42 + Math.random() * 0.42); foregroundSprite.scale.set(foregroundScaleX, foregroundScaleY, 1); foregroundSprite.userData = { baseOpacity: foregroundMat.opacity, baseY: foregroundSprite.position.y, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00024 }; foregroundSprite.renderOrder = 1; foregroundDepthGroup.add(foregroundSprite); foregroundDustSprites.push(foregroundSprite);
              }
              // A sparse near-field layer shifts more strongly than the galaxy when
              // the camera orbits, supplying binocular-like depth without hiding it.
              var foregroundStarCount = resolvedQuality === 'cinematic' ? 78 : resolvedQuality === 'high' ? 46 : 26;
              for (var foregroundStarIndex = 0; foregroundStarIndex < foregroundStarCount; foregroundStarIndex++) {
                var foregroundStarAngle = Math.random() * Math.PI * 2, foregroundStarRadius = 1.02 + Math.random() * 0.88;
                var foregroundStarMaterial = new THREE.SpriteMaterial({ map: sparkleTex, color: foregroundStarIndex % 7 === 0 ? 0xfde68a : foregroundStarIndex % 5 === 0 ? 0xf9a8d4 : 0xbfdbfe, transparent: true, opacity: 0.1 + Math.random() * 0.24, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.random() * Math.PI });
                var foregroundStarSprite = new THREE.Sprite(foregroundStarMaterial), foregroundStarScale = 0.014 + Math.pow(Math.random(), 2.1) * 0.052;
                foregroundStarSprite.position.set(Math.cos(foregroundStarAngle) * foregroundStarRadius, (Math.random() - 0.5) * 0.82, Math.sin(foregroundStarAngle) * foregroundStarRadius); foregroundStarSprite.scale.set(foregroundStarScale, foregroundStarScale, 1); foregroundStarSprite.userData = { baseX: foregroundStarSprite.position.x, baseY: foregroundStarSprite.position.y, baseZ: foregroundStarSprite.position.z, baseOpacity: foregroundStarMaterial.opacity, baseScale: foregroundStarScale, phase: Math.random() * Math.PI * 2, parallaxFactor: 0.012 + Math.random() * 0.035 }; foregroundStarSprite.renderOrder = 10; foregroundStarGroup.add(foregroundStarSprite); foregroundParallaxStars.push(foregroundStarSprite);
              }
              var globularCount = resolvedQuality === 'cinematic' ? 168 : resolvedQuality === 'high' ? 104 : 58;
              for (var gc = 0; gc < globularCount; gc++) { var gcRadius = 0.76 + Math.pow(Math.random(), 0.72) * 0.92, gcTheta = Math.random() * Math.PI * 2, gcPhi = (Math.random() - 0.5) * Math.PI * 0.78; var gcMat = new THREE.SpriteMaterial({ map: clusterTex, color: gc % 4 === 0 ? 0xbfdbfe : gc % 3 === 0 ? 0xfde68a : 0xffedd5, transparent: true, opacity: 0.12 + Math.random() * 0.18, depthWrite: false, blending: THREE.AdditiveBlending }); var gcSprite = new THREE.Sprite(gcMat); gcSprite.position.set(Math.cos(gcTheta) * Math.cos(gcPhi) * gcRadius, Math.sin(gcPhi) * gcRadius * 0.68, Math.sin(gcTheta) * Math.cos(gcPhi) * gcRadius); var gcScale = 0.018 + Math.random() * 0.034; gcSprite.scale.set(gcScale, gcScale, 1); gcSprite.userData = { baseOpacity: gcMat.opacity, baseScale: gcScale, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00014 }; globularGroup.add(gcSprite); globularSprites.push(gcSprite); }

              // Dark feathers split bright spiral arms into fine inter-arm lanes.
              if (galaxyType !== 'elliptical') { var featherCount = resolvedQuality === 'cinematic' ? 54 : resolvedQuality === 'high' ? 34 : 18; for (var df = 0; df < featherCount; df++) { var featherPoints = [], featherSegments = resolvedQuality === 'cinematic' ? 48 : 30, featherBaseRadius = 0.15 + Math.random() * 0.66, featherArm = df % (gType.arms || 4); for (var dfs = 0; dfs <= featherSegments; dfs++) { var featherT = dfs / featherSegments, featherRadius = featherBaseRadius + (featherT - 0.5) * 0.07, featherAngle = featherArm / (gType.arms || 4) * Math.PI * 2 + featherRadius * (gType.windTightness || 2.5) + 0.13 + Math.sin(featherT * Math.PI) * 0.028 + df * 0.014; featherPoints.push(new THREE.Vector3(Math.cos(featherAngle) * featherRadius, 0.004 + Math.sin(featherT * Math.PI * 2) * 0.003, Math.sin(featherAngle) * featherRadius)); } var featherMat = new THREE.LineBasicMaterial({ color: df % 4 === 0 ? 0x1d1021 : 0x08050f, transparent: true, opacity: 0.2 + Math.random() * 0.16, depthWrite: false, blending: THREE.NormalBlending }); featherMat.userData = { baseOpacity: featherMat.opacity, phase: Math.random() * Math.PI * 2 }; var featherLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(featherPoints), featherMat); featherLine.renderOrder = 4; dustGroup.add(featherLine); dustFeatherMats.push(featherMat); } }

              // Expanding H-II shells surround the youngest star-forming knots.
              var shellCount = Math.round((galaxyType === 'elliptical' ? 8 : galaxyType === 'irregular' ? 30 : 46) * Math.min(1.45, detailScale));
              for (var hs = 0; hs < shellCount; hs++) {
                var shellRadiusFromCore = 0.16 + Math.pow(Math.random(), 0.7) * 0.68, shellAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : (hs % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + shellRadiusFromCore * (gType.windTightness || 2.5) - 0.06;
                var shellMat = new THREE.MeshBasicMaterial({ color: hs % 4 === 0 ? 0x7dd3fc : hs % 3 === 0 ? 0xc4b5fd : 0xfb7185, transparent: true, opacity: 0.07 + Math.random() * 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                var shellMesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, resolvedQuality === 'cinematic' ? 64 : 36), shellMat); shellMesh.position.set(Math.cos(shellAngle) * shellRadiusFromCore, (Math.random() - 0.5) * 0.026, Math.sin(shellAngle) * shellRadiusFromCore); shellMesh.rotation.x = Math.PI * 0.5; var shellScale = 0.013 + Math.random() * 0.026; shellMesh.scale.set(shellScale, shellScale, shellScale); shellMesh.userData = { baseOpacity: shellMat.opacity, baseScale: shellScale, phase: Math.random() * Math.PI * 2, expansion: 0.08 + Math.random() * 0.16 }; shellMesh.renderOrder = 3; gasGroup.add(shellMesh); ionizedShells.push(shellMesh);
                if (hs % 3 === 0) { for (var emissionBand = 0; emissionBand < 2; emissionBand++) { var emissionMaterial = new THREE.MeshBasicMaterial({ color: emissionBand ? 0x67e8f9 : 0xfb7185, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var emissionArc = new THREE.Mesh(new THREE.RingGeometry(emissionBand ? 0.58 : 0.88, emissionBand ? 0.72 : 1.06, resolvedQuality === 'cinematic' ? 72 : 48, 1, shellAngle + emissionBand * 0.62, Math.PI * (1.08 + hs % 4 * 0.13)), emissionMaterial), emissionScale = shellScale * (emissionBand ? 0.78 : 1.08); emissionArc.position.copy(shellMesh.position); emissionArc.rotation.x = Math.PI * 0.5; emissionArc.rotation.z = hs * 0.37 + emissionBand * 0.44; emissionArc.scale.set(emissionScale, emissionScale, emissionScale); emissionArc.userData = { baseOpacity: emissionBand ? 0.12 : 0.095, baseScale: emissionScale, phase: shellMesh.userData.phase + emissionBand * 1.2, expansion: shellMesh.userData.expansion, drift: (emissionBand ? -1 : 1) * 0.00012 }; emissionArc.renderOrder = 5; emissionLineGroup.add(emissionArc); emissionLineRims.push(emissionArc); } }
              }

              var volumeCount = Math.round((galaxyType === 'elliptical' ? 18 : galaxyType === 'irregular' ? 38 : 58) * detailScale);
              for (var vd = 0; vd < volumeCount; vd++) {
                var vdRadius = 0.12 + Math.pow(Math.random(), 0.72) * 0.78;
                var vdAngle;
                if (galaxyType === 'elliptical') vdAngle = Math.random() * Math.PI * 2;
                else if (galaxyType === 'irregular') vdAngle = Math.random() * Math.PI * 2 + Math.sin(vd * 2.7) * 0.5;
                else vdAngle = (vd % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + vdRadius * (gType.windTightness || 2.5) + 0.12 + (Math.random() - 0.5) * 0.18;
                var vdMat = new THREE.SpriteMaterial({ map: dustVolumeTex, color: vd % 3 === 0 ? 0x37213f : 0x171124, transparent: true, opacity: 0.07 + Math.random() * 0.07, depthWrite: false, depthTest: true, rotation: Math.random() * Math.PI });
                var vdSprite = new THREE.Sprite(vdMat);
                vdSprite.position.set(Math.cos(vdAngle) * vdRadius, (Math.random() - 0.5) * (galaxyType === 'elliptical' ? 0.18 : 0.075), Math.sin(vdAngle) * vdRadius);
                var vdScale = 0.13 + Math.random() * 0.22, vdScaleX = vdScale * (1.25 + Math.random() * 0.8), vdScaleY = vdScale * (0.34 + Math.random() * 0.25);
                vdSprite.scale.set(vdScaleX, vdScaleY, 1);
                vdSprite.userData = { baseOpacity: vdMat.opacity, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00045, baseY: vdSprite.position.y, baseScaleX: vdScaleX, baseScaleY: vdScaleY, baseColor: vdMat.color.clone() };
                vdSprite.renderOrder = 1; atmosphereGroup.add(vdSprite); volumetricDustSprites.push(vdSprite);
              }

              var birthCount = Math.round((galaxyType === 'elliptical' ? 12 : galaxyType === 'irregular' ? 48 : 76) * detailScale);
              for (var sb = 0; sb < birthCount; sb++) {
                var sbRadius = 0.14 + Math.pow(Math.random(), 0.68) * 0.72;
                var sbAngle = galaxyType === 'irregular' || galaxyType === 'elliptical' ? Math.random() * Math.PI * 2 : (sb % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + sbRadius * (gType.windTightness || 2.5) - 0.08 + (Math.random() - 0.5) * 0.11;
                var sbMat = new THREE.SpriteMaterial({ map: birthTex, color: sb % 5 === 0 ? 0x93c5fd : sb % 3 === 0 ? 0xf9a8d4 : 0xe0e7ff, transparent: true, opacity: 0.12 + Math.random() * 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
                var sbSprite = new THREE.Sprite(sbMat);
                sbSprite.position.set(Math.cos(sbAngle) * sbRadius + (Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.045, Math.sin(sbAngle) * sbRadius + (Math.random() - 0.5) * 0.035);
                var sbScale = 0.018 + Math.random() * 0.038; sbSprite.scale.set(sbScale, sbScale, 1);
                sbSprite.userData = { baseOpacity: sbMat.opacity, baseScale: sbScale, phase: Math.random() * Math.PI * 2, baseY: sbSprite.position.y };
                sbSprite.renderOrder = 3; atmosphereGroup.add(sbSprite); starBirthSprites.push(sbSprite);
              }

              // Broad, overlapping cloudlets reveal the diffuse luminosity that sits
              // beneath resolved stars and dust feathers at spiral-arm scales.
              var armScatteringCount = resolvedQuality === 'cinematic' ? 156 : resolvedQuality === 'high' ? 92 : 48;
              if (galaxyType === 'elliptical') armScatteringCount = Math.round(armScatteringCount * 0.28);
              for (var armScatter = 0; armScatter < armScatteringCount; armScatter++) {
                var scatterRadius = 0.13 + Math.pow(Math.random(), 0.74) * 0.76, scatterAngle;
                if (galaxyType === 'elliptical') scatterAngle = Math.random() * Math.PI * 2;
                else if (galaxyType === 'irregular') scatterAngle = Math.random() * Math.PI * 2 + Math.sin(armScatter * 1.73) * 0.42;
                else scatterAngle = (armScatter % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + scatterRadius * (gType.windTightness || 2.5) - 0.035 + (Math.random() - 0.5) * 0.075;
                var scatterMaterial = new THREE.SpriteMaterial({ map: armScatteringTexture, color: armScatter % 7 === 0 ? 0xf9a8d4 : armScatter % 5 === 0 ? 0xfde68a : 0xbfdbfe, transparent: true, opacity: 0.028 + Math.random() * 0.055, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, rotation: scatterAngle + (Math.random() - 0.5) * 0.4 });
                var scatterSprite = new THREE.Sprite(scatterMaterial); scatterSprite.position.set(Math.cos(scatterAngle) * scatterRadius, (Math.random() - 0.5) * (galaxyType === 'elliptical' ? 0.14 : 0.048), Math.sin(scatterAngle) * scatterRadius * (galaxyType === 'elliptical' ? 0.8 : 1));
                var scatterScaleX = 0.07 + Math.random() * 0.15, scatterScaleY = scatterScaleX * (0.24 + Math.random() * 0.24); scatterSprite.scale.set(scatterScaleX, scatterScaleY, 1); scatterSprite.userData = { baseOpacity: scatterMaterial.opacity, baseScaleX: scatterScaleX, baseScaleY: scatterScaleY, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00018 }; scatterSprite.renderOrder = 2; armScatteringGroup.add(scatterSprite); armScatteringSprites.push(scatterSprite);
              }
              // Paired warm/cool scattering lobes sit on opposite sides of dense
              // lanes, suggesting forward scattering and blue reflection nebulosity.
              var dustColorPairCount = resolvedQuality === 'cinematic' ? 54 : resolvedQuality === 'high' ? 34 : 20;
              if (galaxyType === 'elliptical') dustColorPairCount = Math.round(dustColorPairCount * 0.32);
              for (var dustColorPair = 0; dustColorPair < dustColorPairCount; dustColorPair++) { var dustColorRadius = 0.16 + Math.pow(Math.random(), 0.76) * 0.68, dustColorArm = dustColorPair % (gType.arms || 4), dustColorAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : dustColorArm / (gType.arms || 4) * Math.PI * 2 + dustColorRadius * (gType.windTightness || 2.5) + 0.1; for (var dustColorSide = 0; dustColorSide < 2; dustColorSide++) { var dustColorOffset = dustColorSide ? 0.018 : -0.018, dustColorMaterial = new THREE.SpriteMaterial({ map: armScatteringTexture, color: dustColorSide ? 0x93c5fd : 0xfdba74, transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, rotation: dustColorAngle + Math.PI * 0.5 }); var dustColorSprite = new THREE.Sprite(dustColorMaterial), dustColorScaleX = 0.07 + Math.random() * 0.13, dustColorScaleY = dustColorScaleX * (0.18 + Math.random() * 0.16), dustColorR = dustColorRadius + dustColorOffset; dustColorSprite.position.set(Math.cos(dustColorAngle) * dustColorR, 0.006 + (dustColorSide ? 0.002 : -0.002), Math.sin(dustColorAngle) * dustColorR); dustColorSprite.scale.set(dustColorScaleX, dustColorScaleY, 1); dustColorSprite.userData = { baseOpacity: 0.018 + Math.random() * 0.035, baseScaleX: dustColorScaleX, baseScaleY: dustColorScaleY, phase: dustColorPair * 0.66 + dustColorSide * 1.8, drift: (dustColorSide ? 1 : -1) * 0.00008 }; dustColorSprite.renderOrder = 3; dustColorScatteringGroup.add(dustColorSprite); dustColorScatteringSprites.push(dustColorSprite); } }
              var satelliteCenters = [new THREE.Vector3(1.24, 0.18, -0.48), new THREE.Vector3(-1.48, -0.26, 0.64), new THREE.Vector3(0.46, 0.42, 1.58)];
              satelliteCenters.forEach(function (center, satelliteIndex) {
                var satelliteCount = Math.round((satelliteIndex === 0 ? 620 : 410) * detailScale);
                var satelliteGeo = new THREE.BufferGeometry(); var satellitePos = new Float32Array(satelliteCount * 3); var satelliteCol = new Float32Array(satelliteCount * 3);
                for (var sat = 0; sat < satelliteCount; sat++) {
                  var satRadius = Math.pow(Math.random(), 1.8) * (satelliteIndex === 0 ? 0.18 : 0.13); var satAngle = Math.random() * Math.PI * 2; var satHeight = (Math.random() - 0.5) * satRadius * 0.35;
                  satellitePos[sat * 3] = center.x + Math.cos(satAngle) * satRadius; satellitePos[sat * 3 + 1] = center.y + satHeight; satellitePos[sat * 3 + 2] = center.z + Math.sin(satAngle) * satRadius * (0.58 + satelliteIndex * 0.08);
                  var satColor = new THREE.Color().setHSL(satelliteIndex === 1 ? 0.08 : 0.58 + satelliteIndex * 0.04, 0.58, 0.48 + Math.random() * 0.26);
                  satelliteCol[sat * 3] = satColor.r; satelliteCol[sat * 3 + 1] = satColor.g; satelliteCol[sat * 3 + 2] = satColor.b;
                }
                satelliteGeo.setAttribute('position', new THREE.BufferAttribute(satellitePos, 3)); satelliteGeo.setAttribute('color', new THREE.BufferAttribute(satelliteCol, 3));
                var satelliteMat = new THREE.PointsMaterial({ size: 0.018 + satelliteIndex * 0.003, map: birthTex, vertexColors: true, transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.AdditiveBlending });
                satelliteMat.userData = { baseOpacity: satelliteMat.opacity, phase: satelliteIndex * 1.8 };
                var satellitePoints = new THREE.Points(satelliteGeo, satelliteMat); satellitePoints.userData = { phase: satelliteIndex * 2.2, center: center }; satelliteGroup.add(satellitePoints); satelliteMats.push(satelliteMat);
                var satelliteCoreMat = new THREE.SpriteMaterial({ map: clusterTex, color: satelliteIndex === 1 ? 0xfde68a : 0xbfdbfe, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
                var satelliteCore = new THREE.Sprite(satelliteCoreMat); satelliteCore.position.copy(center); var satelliteCoreScale = satelliteIndex === 0 ? 0.15 : 0.11; satelliteCore.scale.set(satelliteCoreScale, satelliteCoreScale * 0.58, 1); satelliteCore.userData = { baseOpacity: satelliteCoreMat.opacity, baseScaleX: satelliteCoreScale, baseScaleY: satelliteCoreScale * 0.58, phase: satelliteIndex * 2.1 }; satelliteCore.renderOrder = 3; satelliteGroup.add(satelliteCore); satelliteCoreSprites.push(satelliteCore);
              });
              // Each companion resolves into nested stellar envelopes plus gas
              // swept outward by motion through the circumgalactic medium.
              var satelliteEnvelopeLayerCount = resolvedQuality === 'cinematic' ? 4 : resolvedQuality === 'high' ? 3 : 2;
              satelliteCenters.forEach(function (satelliteCenter, dwarfIndex) {
                for (var envelopeLayerIndex = 0; envelopeLayerIndex < satelliteEnvelopeLayerCount; envelopeLayerIndex++) {
                  var envelopeMaterial = new THREE.SpriteMaterial({ map: clusterTex, color: envelopeLayerIndex === 0 ? (dwarfIndex === 1 ? 0xfde68a : 0xbfdbfe) : envelopeLayerIndex % 2 ? 0xc4b5fd : 0x93c5fd, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: dwarfIndex * 0.72 + envelopeLayerIndex * 0.38 });
                  var envelopeSprite = new THREE.Sprite(envelopeMaterial), envelopeBaseScaleX = (dwarfIndex === 0 ? 0.2 : 0.145) * (1 + envelopeLayerIndex * 0.24), envelopeBaseScaleY = envelopeBaseScaleX * (0.48 + dwarfIndex * 0.06 + envelopeLayerIndex * 0.025); envelopeSprite.position.copy(satelliteCenter); envelopeSprite.scale.set(envelopeBaseScaleX, envelopeBaseScaleY, 1); envelopeSprite.userData = { baseOpacity: 0.07 + Math.max(0, satelliteEnvelopeLayerCount - envelopeLayerIndex) * 0.018, baseScaleX: envelopeBaseScaleX, baseScaleY: envelopeBaseScaleY, phase: dwarfIndex * 1.83 + envelopeLayerIndex * 0.76, drift: (envelopeLayerIndex % 2 ? -1 : 1) * 0.00008 }; envelopeSprite.renderOrder = 2; resolvedSatelliteMorphologyGroup.add(envelopeSprite); satelliteEnvelopeSprites.push(envelopeSprite);
                }
                var satelliteDistance = Math.max(0.01, satelliteCenter.length()), satelliteOutwardX = satelliteCenter.x / satelliteDistance, satelliteOutwardY = satelliteCenter.y / satelliteDistance, satelliteOutwardZ = satelliteCenter.z / satelliteDistance, satelliteTangentX = -satelliteOutwardZ, satelliteTangentZ = satelliteOutwardX;
                var ramPressureTailCount = resolvedQuality === 'cinematic' ? 3 : resolvedQuality === 'high' ? 2 : 1;
                for (var ramTailIndex = 0; ramTailIndex < ramPressureTailCount; ramTailIndex++) {
                  var ramTailPoints = [], ramTailSegments = resolvedQuality === 'cinematic' ? 52 : resolvedQuality === 'high' ? 38 : 26, ramTailLength = 0.3 + dwarfIndex * 0.045 + ramTailIndex * 0.035;
                  for (var ramTailStep = 0; ramTailStep <= ramTailSegments; ramTailStep++) { var ramTailT = ramTailStep / ramTailSegments, ramTailSpread = (ramTailIndex - (ramPressureTailCount - 1) * 0.5) * 0.018 * ramTailT + Math.sin(ramTailT * Math.PI * (2 + ramTailIndex) + dwarfIndex) * 0.012 * ramTailT, ramTailDistance = ramTailLength * Math.pow(ramTailT, 0.82); ramTailPoints.push(new THREE.Vector3(satelliteCenter.x + satelliteOutwardX * ramTailDistance + satelliteTangentX * ramTailSpread, satelliteCenter.y + satelliteOutwardY * ramTailDistance * 0.38 + Math.sin(ramTailT * Math.PI + dwarfIndex) * 0.012, satelliteCenter.z + satelliteOutwardZ * ramTailDistance + satelliteTangentZ * ramTailSpread)); }
                  var ramTailMaterial = new THREE.LineBasicMaterial({ color: ramTailIndex % 2 ? 0xf9a8d4 : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); ramTailMaterial.userData = { baseOpacity: 0.045 + ramTailIndex * 0.012, phase: dwarfIndex * 1.67 + ramTailIndex * 1.14 }; var ramTailLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ramTailPoints), ramTailMaterial); ramTailLine.renderOrder = 3; resolvedSatelliteMorphologyGroup.add(ramTailLine); ramPressureTailMaterials.push(ramTailMaterial);
                }
                var strippedGasKnotCount = resolvedQuality === 'cinematic' ? 12 : resolvedQuality === 'high' ? 8 : 5;
                for (var strippedKnotIndex = 0; strippedKnotIndex < strippedGasKnotCount; strippedKnotIndex++) {
                  var strippedKnotT = (strippedKnotIndex + 1) / (strippedGasKnotCount + 1), strippedKnotDistance = (0.3 + dwarfIndex * 0.045) * Math.pow(strippedKnotT, 0.82), strippedKnotSpread = Math.sin(strippedKnotT * Math.PI * 3 + dwarfIndex * 1.7) * 0.018 * strippedKnotT + (Math.random() - 0.5) * 0.012;
                  var strippedKnotMaterial = new THREE.SpriteMaterial({ map: armScatteringTexture, color: strippedKnotIndex % 4 === 0 ? 0xf9a8d4 : strippedKnotIndex % 3 === 0 ? 0xc4b5fd : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: Math.atan2(satelliteOutwardZ, satelliteOutwardX) + Math.PI * 0.5 });
                  var strippedKnotSprite = new THREE.Sprite(strippedKnotMaterial), strippedKnotScaleX = 0.026 + Math.random() * 0.026, strippedKnotScaleY = strippedKnotScaleX * (0.28 + Math.random() * 0.18); strippedKnotSprite.position.set(satelliteCenter.x + satelliteOutwardX * strippedKnotDistance + satelliteTangentX * strippedKnotSpread, satelliteCenter.y + satelliteOutwardY * strippedKnotDistance * 0.38 + (Math.random() - 0.5) * 0.018, satelliteCenter.z + satelliteOutwardZ * strippedKnotDistance + satelliteTangentZ * strippedKnotSpread); strippedKnotSprite.scale.set(strippedKnotScaleX, strippedKnotScaleY, 1); strippedKnotSprite.userData = { baseOpacity: 0.055 + Math.random() * 0.06, baseScaleX: strippedKnotScaleX, baseScaleY: strippedKnotScaleY, phase: dwarfIndex * 1.67 + strippedKnotIndex * 0.73, drift: (strippedKnotIndex % 2 ? -1 : 1) * 0.0001 }; strippedKnotSprite.renderOrder = 4; resolvedSatelliteMorphologyGroup.add(strippedKnotSprite); strippedSatelliteGasKnots.push(strippedKnotSprite);
                }
              });

              for (var ts = 0; ts < 5; ts++) {
                var tidalPoints = []; var tidalSegments = Math.round(150 * detailScale);
                for (var tp = 0; tp <= tidalSegments; tp++) {
                  var tidalFraction = tp / tidalSegments; var tidalAngle = -0.6 + tidalFraction * (2.1 + ts * 0.18) + ts * 0.92; var tidalRadius = 0.96 + ts * 0.14 + 0.12 * Math.sin(tidalFraction * Math.PI);
                  tidalPoints.push(new THREE.Vector3(Math.cos(tidalAngle) * tidalRadius, (ts - 2) * 0.065 + Math.sin(tidalFraction * Math.PI * 2) * 0.038, Math.sin(tidalAngle) * tidalRadius * 0.88));
                }
                var tidalGeo = new THREE.BufferGeometry().setFromPoints(tidalPoints);
                var tidalMat = new THREE.LineBasicMaterial({ color: ts % 2 ? 0xc4b5fd : 0x93c5fd, transparent: true, opacity: 0.045 + ts * 0.009, depthWrite: false, blending: THREE.AdditiveBlending });
                tidalMat.userData = { baseOpacity: tidalMat.opacity, phase: ts * 1.17 };
                var tidalLine = new THREE.Line(tidalGeo, tidalMat); tidalLine.userData = { drift: (ts % 2 ? -1 : 1) * (0.00005 + ts * 0.000012) }; satelliteGroup.add(tidalLine); tidalStreamMats.push(tidalMat);
              }
            })();

            // Broken, inclined shells make the stellar halo feel three-dimensional
            // at wide fields instead of reading as a uniform sphere of points.
            (function () {
              var haloShellCount = resolvedQuality === 'cinematic' ? 24 : resolvedQuality === 'high' ? 15 : 9;
              var haloSegments = resolvedQuality === 'cinematic' ? 210 : resolvedQuality === 'high' ? 144 : 92;
              for (var haloShell = 0; haloShell < haloShellCount; haloShell++) {
                var haloPoints = [], haloStart = Math.random() * Math.PI * 2, haloSpan = 1.4 + Math.random() * 3.2, haloRadius = 1.02 + Math.pow(Math.random(), 0.82) * 0.76;
                for (var haloStep = 0; haloStep <= haloSegments; haloStep++) { var haloT = haloStep / haloSegments, haloAngle = haloStart + haloT * haloSpan, haloRipple = 1 + Math.sin(haloT * Math.PI * (2 + haloShell % 4) + haloShell) * 0.026; haloPoints.push(new THREE.Vector3(Math.cos(haloAngle) * haloRadius * haloRipple, Math.sin(haloAngle * (1.15 + haloShell % 3 * 0.18) + haloShell) * (0.08 + haloShell % 5 * 0.026), Math.sin(haloAngle) * haloRadius * haloRipple * (0.72 + haloShell % 4 * 0.055))); }
                var haloMaterial = new THREE.LineBasicMaterial({ color: haloShell % 5 === 0 ? 0xfde68a : haloShell % 3 === 0 ? 0xc4b5fd : 0x93c5fd, transparent: true, opacity: 0.018 + Math.random() * 0.032, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); haloMaterial.userData = { baseOpacity: haloMaterial.opacity, phase: haloShell * 0.91 };
                var haloLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(haloPoints), haloMaterial); haloLine.rotation.x = (Math.random() - 0.5) * 0.72; haloLine.rotation.z = (Math.random() - 0.5) * 0.4; haloLine.userData = { drift: (haloShell % 2 ? -1 : 1) * (0.000008 + haloShell * 0.000001), phase: haloShell * 0.7 }; haloLine.renderOrder = 0; stellarHaloShellGroup.add(haloLine); haloShellMaterials.push(haloMaterial); haloShellObjects.push(haloLine);
              }
            })();
            // Morphology signatures ensure each classification carries its own
            // fine structure instead of only changing the global star distribution.
            (function () {
              function registerMorphologyObject(object, material, baseOpacity, phase) { material.userData = material.userData || {}; material.userData.baseOpacity = baseOpacity; material.userData.phase = phase || 0; object.userData = object.userData || {}; object.userData.phase = phase || 0; morphologySignatureGroup.add(object); morphologySignatureMaterials.push(material); morphologySignatureObjects.push(object); }
              if (galaxyType === 'barredSpiral') {
                for (var bl = 0; bl < 4; bl++) { var barLanePoints = [], barLaneSegments = resolvedQuality === 'cinematic' ? 112 : 72; for (var bli = 0; bli <= barLaneSegments; bli++) { var blf = bli / barLaneSegments, blx = (blf - 0.5) * 0.72, blBend = (bl % 2 ? -1 : 1) * (0.022 + Math.pow(Math.abs(blx), 1.7) * 0.2), blz = blBend + (bl < 2 ? -0.026 : 0.026); barLanePoints.push(new THREE.Vector3(blx, 0.009 + bl * 0.001, blz)); } var barLaneMat = new THREE.LineBasicMaterial({ color: bl < 2 ? 0x1f0b1c : 0x67e8f9, transparent: true, opacity: bl < 2 ? 0.42 : 0.12, depthWrite: false, blending: bl < 2 ? THREE.NormalBlending : THREE.AdditiveBlending }); var barLane = new THREE.Line(new THREE.BufferGeometry().setFromPoints(barLanePoints), barLaneMat); barLane.rotation.y = 0.22; barLane.renderOrder = bl < 2 ? 6 : 7; registerMorphologyObject(barLane, barLaneMat, barLaneMat.opacity, bl * 1.2); }
                var resonanceMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var resonanceRing = new THREE.Mesh(new THREE.RingGeometry(0.31, 0.322, resolvedQuality === 'cinematic' ? 160 : 96), resonanceMat); resonanceRing.rotation.x = Math.PI * 0.5; resonanceRing.scale.set(1.42, 1.42, 0.62); resonanceRing.renderOrder = 5; registerMorphologyObject(resonanceRing, resonanceMat, 0.12, 0.8);
              } else if (galaxyType === 'grandDesign') {
                for (var gs = 0; gs < 2; gs++) { var shockPoints = [], shockSegments = resolvedQuality === 'cinematic' ? 180 : 112; for (var gsi = 0; gsi <= shockSegments; gsi++) { var gsf = gsi / shockSegments, gsr = 0.18 + gsf * 0.78, gsa = gs * Math.PI + gsr * gType.windTightness - 0.075; shockPoints.push(new THREE.Vector3(Math.cos(gsa) * gsr, 0.012, Math.sin(gsa) * gsr)); } var shockMat = new THREE.LineBasicMaterial({ color: gs ? 0xfb7185 : 0x67e8f9, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }); var shockLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(shockPoints), shockMat); shockLine.renderOrder = 6; registerMorphologyObject(shockLine, shockMat, 0.14, gs * 2.4); }
              } else if (galaxyType === 'elliptical') {
                var shellCountMorph = resolvedQuality === 'cinematic' ? 10 : resolvedQuality === 'high' ? 8 : 6;
                for (var es = 0; es < shellCountMorph; es++) { var shellMorphMat = new THREE.MeshBasicMaterial({ color: es % 3 === 0 ? 0xbfdbfe : es % 2 ? 0xfde68a : 0xf5d0fe, transparent: true, opacity: 0.055 + es * 0.004, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var shellMorph = new THREE.Mesh(new THREE.RingGeometry(0.66 + es * 0.08, 0.67 + es * 0.08, resolvedQuality === 'cinematic' ? 128 : 80, 1, es * 0.47, 1.35 + (es % 3) * 0.28), shellMorphMat); shellMorph.rotation.x = Math.PI * 0.5; shellMorph.rotation.z = es * 0.31; shellMorph.scale.set(1, 0.68, 1); shellMorph.renderOrder = 2; registerMorphologyObject(shellMorph, shellMorphMat, shellMorphMat.opacity, es * 0.72); }
              } else if (galaxyType === 'irregular') {
                var cavityCount = resolvedQuality === 'cinematic' ? 18 : resolvedQuality === 'high' ? 13 : 9;
                for (var ih = 0; ih < cavityCount; ih++) { var holeRadius = 0.12 + Math.random() * 0.68, holeAngle = Math.random() * Math.PI * 2, holeMat = new THREE.MeshBasicMaterial({ color: ih % 3 === 0 ? 0x67e8f9 : ih % 2 ? 0xfb7185 : 0xc4b5fd, transparent: true, opacity: 0.08 + Math.random() * 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var hole = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, resolvedQuality === 'cinematic' ? 72 : 44, 1, Math.random() * Math.PI, 3.9 + Math.random()), holeMat); hole.position.set(Math.cos(holeAngle) * holeRadius, (Math.random() - 0.5) * 0.08, Math.sin(holeAngle) * holeRadius); hole.rotation.x = Math.PI * 0.5; var holeScale = 0.022 + Math.random() * 0.058; hole.scale.set(holeScale * (1.1 + Math.random()), holeScale, holeScale); hole.userData.baseScale = holeScale; hole.renderOrder = 5; registerMorphologyObject(hole, holeMat, holeMat.opacity, ih * 0.66); }
              }
            })();
            // ── Multiwavelength observing overlays ──
            (function () {
              var irCount = galaxyType === 'elliptical' ? 1100 : 1400;
              var irGeo = new THREE.BufferGeometry();
              var irPos = new Float32Array(irCount * 3);
              var irCol = new Float32Array(irCount * 3);
              for (var ii = 0; ii < irCount; ii++) {
                var irDist = 0.12 + Math.pow(Math.random(), 0.72) * 0.72;
                if (galaxyType === 'elliptical') {
                  var irAzimuth = Math.random() * Math.PI * 2;
                  var irCosPolar = Math.random() * 2 - 1;
                  var irSinPolar = Math.sqrt(Math.max(0, 1 - irCosPolar * irCosPolar));
                  irPos[ii * 3] = Math.cos(irAzimuth) * irSinPolar * irDist;
                  irPos[ii * 3 + 1] = irCosPolar * irDist * 0.58;
                  irPos[ii * 3 + 2] = Math.sin(irAzimuth) * irSinPolar * irDist * 0.78;
                } else {
                  var irArm = ii % (gType.arms || 4);
                  var irAngle = (irArm / (gType.arms || 4)) * Math.PI * 2;
                  var irWind = gType.windTightness || 2.5;
                  var irA = irAngle + irDist * irWind + (Math.random() - 0.5) * 0.18;
                  irPos[ii * 3] = Math.cos(irA) * irDist + (Math.random() - 0.5) * 0.035;
                  irPos[ii * 3 + 1] = (Math.random() - 0.5) * 0.028;
                  irPos[ii * 3 + 2] = Math.sin(irA) * irDist + (Math.random() - 0.5) * 0.035;
                }
                var irC = new THREE.Color().setHSL(0.06 + Math.random() * 0.04, galaxyType === 'elliptical' ? 0.52 : 0.95, 0.45 + Math.random() * 0.18);
                irCol[ii * 3] = irC.r; irCol[ii * 3 + 1] = irC.g; irCol[ii * 3 + 2] = irC.b;
              }
              irGeo.setAttribute('position', new THREE.BufferAttribute(irPos, 3));
              irGeo.setAttribute('color', new THREE.BufferAttribute(irCol, 3));
              infraredGroup.add(new THREE.Points(irGeo, new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
              var thermalCv = document.createElement('canvas'); thermalCv.setAttribute('aria-hidden', 'true'); thermalCv.width = 192; thermalCv.height = 192;
              var thermalCtx = upscaleGalaxyCanvas(thermalCv, thermalCv.getContext('2d'));
              var thermalGradient = thermalCtx.createRadialGradient(96, 96, 0, 96, 96, 96); thermalGradient.addColorStop(0, 'rgba(255,255,255,0.92)'); thermalGradient.addColorStop(0.12, 'rgba(254,240,138,0.86)'); thermalGradient.addColorStop(0.34, 'rgba(251,146,60,0.48)'); thermalGradient.addColorStop(0.68, 'rgba(190,24,93,0.14)'); thermalGradient.addColorStop(1, 'rgba(0,0,0,0)'); thermalCtx.fillStyle = thermalGradient; thermalCtx.fillRect(0, 0, 192, 192);
              var thermalTexture = tuneGalaxyTexture(new THREE.CanvasTexture(thermalCv));
              var thermalCloudCount = galaxyType === 'elliptical' ? 0 : resolvedQuality === 'cinematic' ? 62 : resolvedQuality === 'high' ? 38 : 22;
              for (var tc = 0; tc < thermalCloudCount; tc++) { var tcRadius = 0.13 + Math.pow(Math.random(), 0.7) * 0.76, tcAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : (tc % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + tcRadius * (gType.windTightness || 2.5) + 0.11, tcMat = new THREE.SpriteMaterial({ map: thermalTexture, color: tc % 5 === 0 ? 0xfde68a : tc % 3 === 0 ? 0xfb7185 : 0xfdba74, transparent: true, opacity: 0.12 + Math.random() * 0.2, depthWrite: false, blending: THREE.AdditiveBlending, rotation: tcAngle + (Math.random() - 0.5) * 0.5 }); var tcSprite = new THREE.Sprite(tcMat); tcSprite.position.set(Math.cos(tcAngle) * tcRadius, (Math.random() - 0.5) * 0.035, Math.sin(tcAngle) * tcRadius); var tcScale = 0.05 + Math.random() * 0.1; tcSprite.scale.set(tcScale * (1.35 + Math.random()), tcScale * (0.38 + Math.random() * 0.32), 1); tcSprite.userData = { baseOpacity: tcMat.opacity, baseScaleX: tcSprite.scale.x, baseScaleY: tcSprite.scale.y, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.0006 }; tcSprite.renderOrder = 5; infraredThermalGroup.add(tcSprite); infraredThermalSprites.push(tcSprite); infraredThermalMats.push(tcMat); }
              var thermalLaneCount = galaxyType === 'elliptical' ? 0 : resolvedQuality === 'cinematic' ? 18 : 11;
              for (var tl = 0; tl < thermalLaneCount; tl++) { var thermalLanePoints = [], thermalLaneSegments = resolvedQuality === 'cinematic' ? 84 : 52; for (var tls = 0; tls <= thermalLaneSegments; tls++) { var tlf = tls / thermalLaneSegments, tlRadius = 0.18 + tlf * 0.7, tlAngle = galaxyType === 'irregular' || galaxyType === 'elliptical' ? tl * 1.17 + tlf * 0.8 : (tl % (gType.arms || 4)) / (gType.arms || 4) * Math.PI * 2 + tlRadius * (gType.windTightness || 2.5) + (tl % 3 - 1) * 0.055; thermalLanePoints.push(new THREE.Vector3(Math.cos(tlAngle) * tlRadius, 0.01, Math.sin(tlAngle) * tlRadius)); } var thermalLaneMat = new THREE.LineBasicMaterial({ color: tl % 3 === 0 ? 0xfde68a : tl % 2 ? 0xfb7185 : 0xfdba74, transparent: true, opacity: 0.08 + (tl % 4) * 0.012, depthWrite: false, blending: THREE.AdditiveBlending }); thermalLaneMat.userData = { baseOpacity: thermalLaneMat.opacity, phase: tl * 0.9 }; var thermalLane = new THREE.Line(new THREE.BufferGeometry().setFromPoints(thermalLanePoints), thermalLaneMat); thermalLane.renderOrder = 4; infraredThermalGroup.add(thermalLane); infraredThermalMats.push(thermalLaneMat); }

              for (var rr = 0; rr < (galaxyType === 'elliptical' ? 0 : 6); rr++) {
                var rad = 0.18 + rr * 0.115;
                var ringMat = new THREE.MeshBasicMaterial({ color: rr % 2 ? 0x22d3ee : 0x67e8f9, side: THREE.DoubleSide, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
                var hRing = new THREE.Mesh(new THREE.RingGeometry(rad, rad + 0.0035, 160), ringMat);
                hRing.rotation.x = Math.PI * 0.5;
                hRing.scale.set(1, 1, 0.35);
                radioGroup.add(hRing);
              }
              var radioCount = galaxyType === 'elliptical' ? 180 : 900;
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
              radioGroup.add(new THREE.Points(radioGeo, new THREE.PointsMaterial({ color: 0x67e8f9, size: galaxyType === 'elliptical' ? 0.007 : 0.01, transparent: true, opacity: galaxyType === 'elliptical' ? 0.18 : 0.45, depthWrite: false, blending: THREE.AdditiveBlending })));

              // A resolved 21 cm moment-1 map: blue marks approaching hydrogen and
              // red marks receding hydrogen. Fine contours expose the velocity gradient.
              var velocityMapSize = resolvedQuality === 'cinematic' ? 384 : resolvedQuality === 'high' ? 320 : 256;
              var velocityMapCanvas = document.createElement('canvas'); velocityMapCanvas.setAttribute('aria-hidden', 'true'); velocityMapCanvas.width = velocityMapSize; velocityMapCanvas.height = velocityMapSize;
              var velocityMapCtx = upscaleGalaxyCanvas(velocityMapCanvas, velocityMapCanvas.getContext('2d'));
              var vmCenter = velocityMapSize * 0.5, vmRadius = velocityMapSize * 0.46;
              velocityMapCtx.save(); velocityMapCtx.translate(vmCenter, vmCenter);
              velocityMapCtx.beginPath(); velocityMapCtx.ellipse(0, 0, vmRadius, vmRadius * 0.88, 0, 0, Math.PI * 2); velocityMapCtx.clip();
              var velocityGradient = velocityMapCtx.createLinearGradient(-vmRadius, 0, vmRadius, 0);
              velocityGradient.addColorStop(0, 'rgba(37,99,235,0.78)'); velocityGradient.addColorStop(0.36, 'rgba(56,189,248,0.42)'); velocityGradient.addColorStop(0.5, 'rgba(226,232,240,0.08)'); velocityGradient.addColorStop(0.64, 'rgba(251,113,133,0.42)'); velocityGradient.addColorStop(1, 'rgba(220,38,38,0.78)');
              velocityMapCtx.fillStyle = velocityGradient; velocityMapCtx.fillRect(-vmRadius, -vmRadius, vmRadius * 2, vmRadius * 2);
              var velocityFeather = velocityMapCtx.createRadialGradient(0, 0, vmRadius * 0.08, 0, 0, vmRadius);
              velocityFeather.addColorStop(0, 'rgba(255,255,255,0.92)'); velocityFeather.addColorStop(0.78, 'rgba(255,255,255,0.72)'); velocityFeather.addColorStop(1, 'rgba(255,255,255,0)');
              velocityMapCtx.globalCompositeOperation = 'destination-in'; velocityMapCtx.fillStyle = velocityFeather; velocityMapCtx.fillRect(-vmRadius, -vmRadius, vmRadius * 2, vmRadius * 2);
              velocityMapCtx.globalCompositeOperation = 'source-over'; velocityMapCtx.lineWidth = 1.35; velocityMapCtx.setLineDash(vc < 0 ? [5, 5] : [10, 3]);
              for (var vc = -5; vc <= 5; vc++) { if (vc === 0) continue; var velocityFraction = vc / 6; var velocityX = velocityFraction * vmRadius * 0.82; velocityMapCtx.beginPath(); velocityMapCtx.moveTo(velocityX * 0.28, -vmRadius * 0.82); velocityMapCtx.bezierCurveTo(velocityX * 1.18, -vmRadius * 0.38, velocityX * 1.18, vmRadius * 0.38, velocityX * 0.28, vmRadius * 0.82); velocityMapCtx.strokeStyle = vc < 0 ? 'rgba(191,219,254,0.52)' : 'rgba(254,202,202,0.52)'; velocityMapCtx.stroke(); }
              velocityMapCtx.setLineDash([8, 6]); velocityMapCtx.lineWidth = 2; velocityMapCtx.beginPath(); velocityMapCtx.moveTo(0, -vmRadius * 0.9); velocityMapCtx.lineTo(0, vmRadius * 0.9); velocityMapCtx.strokeStyle = 'rgba(255,255,255,0.48)'; velocityMapCtx.stroke(); velocityMapCtx.restore();
              var velocityMapTexture = tuneGalaxyTexture(new THREE.CanvasTexture(velocityMapCanvas));
              dopplerVelocityFieldMaterial = new THREE.MeshBasicMaterial({ map: velocityMapTexture, transparent: true, opacity: 0.34, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
              var velocityMapPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.18, 2.18), dopplerVelocityFieldMaterial); velocityMapPlane.rotation.x = -Math.PI * 0.5; velocityMapPlane.position.y = 0.012; velocityMapPlane.renderOrder = 2; dopplerVelocityFieldGroup.add(velocityMapPlane);
              var velocitySampleCount = resolvedQuality === 'cinematic' ? 720 : resolvedQuality === 'high' ? 420 : 240;
              var velocitySampleGeo = new THREE.BufferGeometry(), velocitySamplePos = new Float32Array(velocitySampleCount * 3), velocitySampleCol = new Float32Array(velocitySampleCount * 3);
              for (var vs = 0; vs < velocitySampleCount; vs++) { var vsRadius = 0.12 + Math.pow(Math.random(), 0.58) * 0.82, vsAngle = Math.random() * Math.PI * 2, vsX = Math.cos(vsAngle) * vsRadius, vsZ = Math.sin(vsAngle) * vsRadius; velocitySamplePos[vs * 3] = vsX; velocitySamplePos[vs * 3 + 1] = 0.018 + Math.random() * 0.008; velocitySamplePos[vs * 3 + 2] = vsZ; var velocityMix = Math.max(-1, Math.min(1, vsX / 0.78)); velocitySampleCol[vs * 3] = velocityMix > 0 ? 1 : 0.16 + (1 + velocityMix) * 0.22; velocitySampleCol[vs * 3 + 1] = 0.28 + (1 - Math.abs(velocityMix)) * 0.48; velocitySampleCol[vs * 3 + 2] = velocityMix < 0 ? 1 : 0.2 + (1 - velocityMix) * 0.26; }
              velocitySampleGeo.setAttribute('position', new THREE.BufferAttribute(velocitySamplePos, 3)); velocitySampleGeo.setAttribute('color', new THREE.BufferAttribute(velocitySampleCol, 3));
              dopplerVelocitySampleMaterial = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.014 : 0.011, vertexColors: true, transparent: true, opacity: 0.64, depthWrite: false, blending: THREE.AdditiveBlending });
              var velocitySamples = new THREE.Points(velocitySampleGeo, dopplerVelocitySampleMaterial); velocitySamples.renderOrder = 4; dopplerVelocityFieldGroup.add(velocitySamples);

              // Polarization ticks follow the projected magnetic field; layered
              // ribbons add Faraday-depth structure along the spiral disk.
              var radioPolarizationVectorCount = resolvedQuality === 'cinematic' ? 460 : resolvedQuality === 'high' ? 280 : 150, radioPolarizationPositions = new Float32Array(radioPolarizationVectorCount * 6), radioPolarizationColors = new Float32Array(radioPolarizationVectorCount * 6);
              for (var radioPolarizationIndex = 0; radioPolarizationIndex < radioPolarizationVectorCount; radioPolarizationIndex++) {
                var radioPolarizationRadius = 0.13 + Math.pow(Math.random(), 0.62) * 0.79, radioPolarizationArm = radioPolarizationIndex % (gType.arms || 4), radioPolarizationAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? Math.random() * Math.PI * 2 : radioPolarizationArm / (gType.arms || 4) * Math.PI * 2 + radioPolarizationRadius * (gType.windTightness || 2.5) + (Math.random() - 0.5) * 0.18, radioFieldAngle = radioPolarizationAngle + Math.PI * 0.5 + Math.sin(radioPolarizationRadius * 9 + radioPolarizationArm) * 0.16, radioVectorLength = 0.014 + Math.random() * 0.016, radioVectorCenterX = Math.cos(radioPolarizationAngle) * radioPolarizationRadius, radioVectorCenterZ = Math.sin(radioPolarizationAngle) * radioPolarizationRadius, radioVectorOffset = radioPolarizationIndex * 6;
                radioPolarizationPositions[radioVectorOffset] = radioVectorCenterX - Math.cos(radioFieldAngle) * radioVectorLength * 0.5; radioPolarizationPositions[radioVectorOffset + 1] = 0.03 + (Math.random() - 0.5) * 0.012; radioPolarizationPositions[radioVectorOffset + 2] = radioVectorCenterZ - Math.sin(radioFieldAngle) * radioVectorLength * 0.5; radioPolarizationPositions[radioVectorOffset + 3] = radioVectorCenterX + Math.cos(radioFieldAngle) * radioVectorLength * 0.5; radioPolarizationPositions[radioVectorOffset + 4] = radioPolarizationPositions[radioVectorOffset + 1]; radioPolarizationPositions[radioVectorOffset + 5] = radioVectorCenterZ + Math.sin(radioFieldAngle) * radioVectorLength * 0.5;
                var faradaySign = Math.sin(radioPolarizationAngle * 2.1 + radioPolarizationRadius * 7.4), radioPolarizationColor = new THREE.Color(faradaySign > 0 ? 0xf0abfc : 0x67e8f9); radioPolarizationColors[radioVectorOffset] = radioPolarizationColor.r; radioPolarizationColors[radioVectorOffset + 1] = radioPolarizationColor.g; radioPolarizationColors[radioVectorOffset + 2] = radioPolarizationColor.b; radioPolarizationColors[radioVectorOffset + 3] = radioPolarizationColor.r; radioPolarizationColors[radioVectorOffset + 4] = radioPolarizationColor.g; radioPolarizationColors[radioVectorOffset + 5] = radioPolarizationColor.b;
              }
              var radioPolarizationGeometry = new THREE.BufferGeometry(); radioPolarizationGeometry.setAttribute('position', new THREE.BufferAttribute(radioPolarizationPositions, 3)); radioPolarizationGeometry.setAttribute('color', new THREE.BufferAttribute(radioPolarizationColors, 3)); radioPolarizationMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); radioPolarizationMaterial.userData = { baseOpacity: 0.48 }; var radioPolarizationVectors = new THREE.LineSegments(radioPolarizationGeometry, radioPolarizationMaterial); radioPolarizationVectors.renderOrder = 7; radioPolarizationGroup.add(radioPolarizationVectors);
              var faradayDepthRibbonCount = resolvedQuality === 'cinematic' ? 14 : resolvedQuality === 'high' ? 9 : 6;
              for (var faradayRibbonIndex = 0; faradayRibbonIndex < faradayDepthRibbonCount; faradayRibbonIndex++) {
                var faradayRibbonPoints = [], faradayRibbonSegments = resolvedQuality === 'cinematic' ? 132 : resolvedQuality === 'high' ? 92 : 64, faradayRibbonArm = faradayRibbonIndex % (gType.arms || 4);
                for (var faradayRibbonStep = 0; faradayRibbonStep <= faradayRibbonSegments; faradayRibbonStep++) { var faradayRibbonT = faradayRibbonStep / faradayRibbonSegments, faradayRibbonRadius = 0.14 + faradayRibbonT * 0.78, faradayRibbonAngle = galaxyType === 'elliptical' || galaxyType === 'irregular' ? faradayRibbonIndex * 0.83 + faradayRibbonT * (1.2 + faradayRibbonIndex % 3 * 0.18) : faradayRibbonArm / (gType.arms || 4) * Math.PI * 2 + faradayRibbonRadius * (gType.windTightness || 2.5) + (faradayRibbonIndex % 3 - 1) * 0.055 + Math.sin(faradayRibbonT * Math.PI * 4 + faradayRibbonIndex) * 0.018; faradayRibbonPoints.push(new THREE.Vector3(Math.cos(faradayRibbonAngle) * faradayRibbonRadius, 0.025 + (faradayRibbonIndex % 4 - 1.5) * 0.004 + Math.sin(faradayRibbonT * Math.PI * 2) * 0.003, Math.sin(faradayRibbonAngle) * faradayRibbonRadius)); }
                var faradayRibbonMaterial = new THREE.LineBasicMaterial({ color: faradayRibbonIndex % 3 === 0 ? 0xf0abfc : faradayRibbonIndex % 2 ? 0xc4b5fd : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); faradayRibbonMaterial.userData = { baseOpacity: 0.055 + (faradayRibbonIndex % 4) * 0.012, phase: faradayRibbonIndex * 0.87 }; var faradayRibbon = new THREE.Line(new THREE.BufferGeometry().setFromPoints(faradayRibbonPoints), faradayRibbonMaterial); faradayRibbon.userData = { drift: (faradayRibbonIndex % 2 ? -1 : 1) * 0.000018, phase: faradayRibbonIndex * 0.87 }; faradayRibbon.renderOrder = 6; radioPolarizationGroup.add(faradayRibbon); faradayRibbonMaterials.push(faradayRibbonMaterial); faradayRibbonObjects.push(faradayRibbon);
              }
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
              var xrayCv = document.createElement('canvas'); xrayCv.setAttribute('aria-hidden', 'true'); xrayCv.width = 128; xrayCv.height = 128;
              var xrayCtx = upscaleGalaxyCanvas(xrayCv, xrayCv.getContext('2d'));
              var xrayGlow = xrayCtx.createRadialGradient(64, 64, 0, 64, 64, 64); xrayGlow.addColorStop(0, 'rgba(255,255,255,1)'); xrayGlow.addColorStop(0.12, 'rgba(186,230,253,0.9)'); xrayGlow.addColorStop(0.34, 'rgba(56,189,248,0.46)'); xrayGlow.addColorStop(0.7, 'rgba(99,102,241,0.12)'); xrayGlow.addColorStop(1, 'rgba(0,0,0,0)'); xrayCtx.fillStyle = xrayGlow; xrayCtx.fillRect(0, 0, 128, 128);
              var xrayTexture = tuneGalaxyTexture(new THREE.CanvasTexture(xrayCv));
              var xraySourceCount = resolvedQuality === 'cinematic' ? 42 : resolvedQuality === 'high' ? 28 : 16;
              for (var xs = 0; xs < xraySourceCount; xs++) { var xsCore = xs < Math.ceil(xraySourceCount * 0.3), xsRadius = xsCore ? Math.pow(Math.random(), 2) * 0.2 : 0.22 + Math.random() * 0.64, xsAngle = Math.random() * Math.PI * 2, xsMat = new THREE.SpriteMaterial({ map: xrayTexture, color: xs % 5 === 0 ? 0xc4b5fd : xs % 3 === 0 ? 0x67e8f9 : 0xe0f2fe, transparent: true, opacity: 0.3 + Math.random() * 0.48, depthWrite: false, blending: THREE.AdditiveBlending }); var xsSprite = new THREE.Sprite(xsMat); xsSprite.position.set(Math.cos(xsAngle) * xsRadius, (Math.random() - 0.5) * 0.08, Math.sin(xsAngle) * xsRadius); var xsScale = (xsCore ? 0.018 : 0.012) + Math.random() * (xsCore ? 0.035 : 0.022); xsSprite.scale.set(xsScale, xsScale, 1); xsSprite.userData = { baseOpacity: xsMat.opacity, baseScale: xsScale, phase: Math.random() * Math.PI * 2, frequency: 1.1 + Math.random() * 2.6 }; xsSprite.renderOrder = 8; xrayEventGroup.add(xsSprite); xrayEventSprites.push(xsSprite); }
              var xrayShellCount = resolvedQuality === 'cinematic' ? 18 : resolvedQuality === 'high' ? 12 : 7;
              for (var xsh = 0; xsh < xrayShellCount; xsh++) { var xshRadius = 0.22 + Math.random() * 0.62, xshAngle = Math.random() * Math.PI * 2, xshMat = new THREE.MeshBasicMaterial({ color: xsh % 3 === 0 ? 0xc4b5fd : 0x67e8f9, transparent: true, opacity: 0.12 + Math.random() * 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); var xshRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, resolvedQuality === 'cinematic' ? 96 : 56, 1, xsh * 0.7, 4.1 + Math.random()), xshMat); xshRing.position.set(Math.cos(xshAngle) * xshRadius, (Math.random() - 0.5) * 0.04, Math.sin(xshAngle) * xshRadius); xshRing.rotation.x = Math.PI * 0.5; var xshScale = 0.018 + Math.random() * 0.042; xshRing.scale.set(xshScale, xshScale, xshScale); xshRing.userData = { baseOpacity: xshMat.opacity, baseScale: xshScale, phase: xsh * 0.77, expansion: 0.1 + Math.random() * 0.14 }; xshRing.renderOrder = 7; xrayEventGroup.add(xshRing); xrayShockShells.push(xshRing); }

              // Resolved remnants show temperature-stratified shock layers: a cooler violet rim encloses cyan and pale, harder-energy plasma.
              var xrayTemperatureShellCount = resolvedQuality === 'cinematic' ? 12 : resolvedQuality === 'high' ? 8 : 5;
              var xrayTemperatureShellSegments = resolvedQuality === 'cinematic' ? 96 : resolvedQuality === 'high' ? 64 : 40;
              var xrayTemperatureBands = [{ color: 0xa78bfa, radius: 1, opacity: 0.13 }, { color: 0x67e8f9, radius: 0.72, opacity: 0.18 }, { color: 0xe0f2fe, radius: 0.45, opacity: 0.23 }];
              for (var xts = 0; xts < xrayTemperatureShellCount; xts++) {
                var xtsGroup = new THREE.Group(), xtsDiskRadius = 0.22 + Math.random() * 0.58, xtsDiskAngle = Math.random() * Math.PI * 2, xtsBaseScale = 0.025 + Math.random() * 0.045;
                xtsGroup.position.set(Math.cos(xtsDiskAngle) * xtsDiskRadius, 0.018 + (Math.random() - 0.5) * 0.035, Math.sin(xtsDiskAngle) * xtsDiskRadius); xtsGroup.rotation.x = Math.PI * 0.5; xtsGroup.rotation.z = Math.random() * Math.PI * 2; xtsGroup.scale.setScalar(xtsBaseScale); xtsGroup.userData = { baseScale: xtsBaseScale, phase: xts * 0.83 + Math.random(), expansion: 0.12 + Math.random() * 0.12 };
                xrayTemperatureBands.forEach(function (temperatureBand, temperatureBandIndex) {
                  var temperatureArcPoints = [], temperatureArcStart = 0.34 + xts * 0.51 + temperatureBandIndex * 0.26, temperatureArcLength = 4.75 - temperatureBandIndex * 0.24 + Math.random() * 0.42;
                  for (var temperatureArcStep = 0; temperatureArcStep <= xrayTemperatureShellSegments; temperatureArcStep++) { var temperatureArcAngle = temperatureArcStart + temperatureArcLength * temperatureArcStep / xrayTemperatureShellSegments; temperatureArcPoints.push(new THREE.Vector3(Math.cos(temperatureArcAngle) * temperatureBand.radius, Math.sin(temperatureArcAngle) * temperatureBand.radius, temperatureBandIndex * 0.014)); }
                  var temperatureArcMaterial = new THREE.LineBasicMaterial({ color: temperatureBand.color, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); temperatureArcMaterial.userData = { baseOpacity: temperatureBand.opacity, phase: xtsGroup.userData.phase + temperatureBandIndex * 0.62, band: temperatureBandIndex };
                  var temperatureArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(temperatureArcPoints), temperatureArcMaterial); temperatureArc.renderOrder = 9 + temperatureBandIndex; xtsGroup.add(temperatureArc); xrayThermalShellMaterials.push(temperatureArcMaterial);
                });
                xrayThermalShellGroup.add(xtsGroup); xrayThermalShells.push(xtsGroup);
              }

              // Layered, open biconical plasma traces an energetic nuclear wind.
              var xrayNuclearOutflowLayerCount = resolvedQuality === 'cinematic' ? 6 : resolvedQuality === 'high' ? 4 : 3;
              for (var xol = 0; xol < xrayNuclearOutflowLayerCount; xol++) {
                var xolFraction = (xol + 1) / xrayNuclearOutflowLayerCount, xolHeight = 0.15 + xolFraction * 0.34, xolRadius = 0.012 + xolFraction * 0.065, xolColor = xol % 3 === 0 ? 0xe0f2fe : xol % 2 ? 0xa78bfa : 0x67e8f9;
                [-1, 1].forEach(function (xolDirection) {
                  var xolMaterial = new THREE.MeshBasicMaterial({ color: xolColor, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); xolMaterial.userData = { baseOpacity: 0.025 + (1 - xolFraction) * 0.055, phase: xol * 0.71 + (xolDirection < 0 ? Math.PI : 0) };
                  var xolCone = new THREE.Mesh(new THREE.ConeGeometry(xolRadius, xolHeight, resolvedQuality === 'cinematic' ? 48 : 32, 1, true), xolMaterial); xolCone.position.y = xolDirection * xolHeight * 0.5; if (xolDirection < 0) xolCone.rotation.x = Math.PI; xolCone.renderOrder = 6 + xol; xrayNuclearOutflowGroup.add(xolCone); xrayOutflowMaterials.push(xolMaterial);
                });
              }
              var xrayOutflowKnotCount = resolvedQuality === 'cinematic' ? 56 : resolvedQuality === 'high' ? 36 : 22;
              for (var xok = 0; xok < xrayOutflowKnotCount; xok++) {
                var xokDirection = xok % 2 ? 1 : -1, xokHeight = 0.035 + Math.pow(Math.random(), 0.72) * 0.43, xokSpread = 0.008 + xokHeight * 0.1, xokAngle = Math.random() * Math.PI * 2, xokScale = 0.007 + Math.random() * 0.014, xokMaterial = new THREE.SpriteMaterial({ map: xrayTexture, color: xok % 7 === 0 ? 0xffffff : xok % 3 === 0 ? 0xa78bfa : 0x67e8f9, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
                var xokSprite = new THREE.Sprite(xokMaterial); xokSprite.position.set(Math.cos(xokAngle) * Math.random() * xokSpread, xokDirection * xokHeight, Math.sin(xokAngle) * Math.random() * xokSpread); xokSprite.scale.set(xokScale, xokScale, 1); xokSprite.userData = { baseOpacity: 0.22 + Math.random() * 0.42, baseScale: xokScale, phase: Math.random() * Math.PI * 2, frequency: 0.62 + Math.random() * 1.2 }; xokSprite.renderOrder = 12; xrayNuclearOutflowGroup.add(xokSprite); xrayOutflowSprites.push(xokSprite);
              }
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

            var bhGlowCv = document.createElement('canvas'); bhGlowCv.setAttribute('aria-hidden', 'true'); bhGlowCv.width = 64; bhGlowCv.height = 64;

            var bhGc = bhGlowCv.getContext('2d');
              bhGc = upscaleGalaxyCanvas(bhGlowCv, bhGc);

            var bhGrad = bhGc.createRadialGradient(32, 32, 0, 32, 32, 32);

            bhGrad.addColorStop(0, 'rgba(255,255,255,1.0)'); bhGrad.addColorStop(0.1, 'rgba(255,200,100,0.8)'); bhGrad.addColorStop(0.4, 'rgba(255,120,40,0.3)'); bhGrad.addColorStop(1, 'rgba(0,0,0,0)');

            bhGc.fillStyle = bhGrad; bhGc.fillRect(0, 0, 64, 64);

            var bhGlowTex = tuneGalaxyTexture(new THREE.CanvasTexture(bhGlowCv));

            var bhGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: bhGlowTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.7 }));

            bhGlow.scale.set(0.25, 0.25, 1); bhGroup.add(bhGlow);

            var blackHoleDrama = { photon: 0.36, lens: 0.18, jet: 0.1, hotspot: 0.32 };
            var photonRings = [], lensingArcs = [], coreJets = [], accretionHotspots = [];
            var coreLensingCausticGroup = new THREE.Group(); coreLensingCausticGroup.name = 'coreEinsteinRingCaustics'; coreLensingCausticGroup.visible = false; bhGroup.add(coreLensingCausticGroup);
            var coreCausticMaterials = [], coreCausticObjects = [], coreLensedImages = [];
            var horizon = new THREE.Mesh(new THREE.SphereGeometry(0.018, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.96 }));
            bhGroup.add(horizon);

            var hotCv = document.createElement('canvas'); hotCv.setAttribute('aria-hidden', 'true'); hotCv.width = 96; hotCv.height = 32;
            var hotCtx = hotCv.getContext('2d');
              hotCtx = upscaleGalaxyCanvas(hotCv, hotCtx);
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
            var hotTex = tuneGalaxyTexture(new THREE.CanvasTexture(hotCv));
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

            // Fine caustic fragments and mirrored source images resolve only at
            // nuclear scales, completing the visual transition from galaxy to lens.
            (function () {
              var causticCount = resolvedQuality === 'cinematic' ? 16 : resolvedQuality === 'high' ? 11 : 7;
              for (var causticIndex = 0; causticIndex < causticCount; causticIndex++) { var causticRadius = 0.105 + causticIndex * 0.0125, causticSpan = 0.18 + (causticIndex % 4) * 0.09; var causticMaterial = new THREE.MeshBasicMaterial({ color: causticIndex % 4 === 0 ? 0xfde68a : causticIndex % 3 === 0 ? 0xf0abfc : 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); causticMaterial.userData = { baseOpacity: 0.08 + (causticIndex % 5) * 0.018, phase: causticIndex * 0.82 }; var causticArc = new THREE.Mesh(new THREE.RingGeometry(causticRadius, causticRadius + 0.0022, resolvedQuality === 'cinematic' ? 144 : 96, 1, causticIndex * 0.73, Math.PI * causticSpan), causticMaterial); causticArc.rotation.x = Math.PI * 0.5 + (causticIndex % 5 - 2) * 0.018; causticArc.rotation.z = causticIndex * 0.39; causticArc.scale.set(1.22 + (causticIndex % 3) * 0.08, 0.58 + (causticIndex % 4) * 0.045, 1); causticArc.userData = { drift: (causticIndex % 2 ? -1 : 1) * (0.0003 + causticIndex * 0.00002), phase: causticIndex * 0.72 }; causticArc.renderOrder = 8; coreLensingCausticGroup.add(causticArc); coreCausticMaterials.push(causticMaterial); coreCausticObjects.push(causticArc); }
              var lensedPairCount = resolvedQuality === 'cinematic' ? 10 : resolvedQuality === 'high' ? 7 : 5;
              for (var lensedPair = 0; lensedPair < lensedPairCount; lensedPair++) { var lensedRadius = 0.12 + lensedPair * 0.017, lensedAngle = lensedPair * 1.17 + 0.3; for (var lensedSide = 0; lensedSide < 2; lensedSide++) { var imageAngle = lensedAngle + lensedSide * Math.PI, imageMaterial = new THREE.SpriteMaterial({ map: sparkleTex, color: lensedPair % 3 === 0 ? 0xfde68a : lensedPair % 2 ? 0xf9a8d4 : 0xbfdbfe, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: imageAngle }); var lensedImage = new THREE.Sprite(imageMaterial), imageScale = 0.008 + (lensedPair % 4) * 0.002; lensedImage.position.set(Math.cos(imageAngle) * lensedRadius, (lensedSide ? -1 : 1) * 0.0035, Math.sin(imageAngle) * lensedRadius * 0.62); lensedImage.scale.set(imageScale * 1.8, imageScale, 1); lensedImage.userData = { radius: lensedRadius, angle: imageAngle, baseScale: imageScale, baseOpacity: 0.16 + (lensedPair % 4) * 0.035, phase: lensedPair * 0.9 + lensedSide * 1.4, drift: (lensedSide ? -1 : 1) * 0.00022 }; lensedImage.renderOrder = 9; coreLensingCausticGroup.add(lensedImage); coreLensedImages.push(lensedImage); } }
            })();
            var jetMatA = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: blackHoleDrama.jet, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            var jetMatB = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: blackHoleDrama.jet * 0.72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            var jetTop = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.62, 36, 1, true), jetMatA);
            jetTop.position.y = 0.31;
            var jetBottom = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.62, 36, 1, true), jetMatB);
            jetBottom.position.y = -0.31; jetBottom.rotation.x = Math.PI;
            bhGroup.add(jetTop); bhGroup.add(jetBottom);
            coreJets.push(jetTop); coreJets.push(jetBottom);

            // Hierarchical nuclear detail resolves only as the camera approaches the
            // center, preserving the clean galaxy silhouette at overview scale.
            var nuclearDetailGroup = new THREE.Group(); nuclearDetailGroup.name = 'nuclearStarClusterLOD'; nuclearDetailGroup.visible = false; bulgeGroup.add(nuclearDetailGroup);
            var nuclearStarClusterMaterial = null, nuclearDustSpiralMaterials = [];
            var circumnuclearFeedingGroup = new THREE.Group(); circumnuclearFeedingGroup.name = 'circumnuclearFeedingStructures'; nuclearDetailGroup.add(circumnuclearFeedingGroup);
            var circumnuclearRingMaterials = [], circumnuclearRingObjects = [], nuclearMiniSpiralMaterials = [], nuclearFeedingHotKnots = [], nuclearFeedingMode = 1;
            (function () {
              var nuclearCv = document.createElement('canvas'); nuclearCv.setAttribute('aria-hidden', 'true'); nuclearCv.width = 64; nuclearCv.height = 64;
              var nuclearCtx = upscaleGalaxyCanvas(nuclearCv, nuclearCv.getContext('2d'));
              var nuclearGrad = nuclearCtx.createRadialGradient(32, 32, 0, 32, 32, 31);
              nuclearGrad.addColorStop(0, 'rgba(255,255,255,1)'); nuclearGrad.addColorStop(0.14, 'rgba(254,240,138,0.95)'); nuclearGrad.addColorStop(0.45, 'rgba(251,146,60,0.36)'); nuclearGrad.addColorStop(1, 'rgba(0,0,0,0)'); nuclearCtx.fillStyle = nuclearGrad; nuclearCtx.fillRect(0, 0, 64, 64);
              var nuclearTex = tuneGalaxyTexture(new THREE.CanvasTexture(nuclearCv));
              var nuclearCount = resolvedQuality === 'cinematic' ? 11000 : resolvedQuality === 'high' ? 4800 : 1600;
              var nuclearGeo = new THREE.BufferGeometry(), nuclearPos = new Float32Array(nuclearCount * 3), nuclearCol = new Float32Array(nuclearCount * 3);
              for (var nuclearIndex = 0; nuclearIndex < nuclearCount; nuclearIndex++) {
                var nuclearRadius = 0.018 + Math.pow(Math.random(), 2.35) * 0.205, nuclearAngle = Math.random() * Math.PI * 2;
                nuclearPos[nuclearIndex * 3] = Math.cos(nuclearAngle) * nuclearRadius; nuclearPos[nuclearIndex * 3 + 1] = (Math.random() + Math.random() + Math.random() - 1.5) * (0.008 + nuclearRadius * 0.16); nuclearPos[nuclearIndex * 3 + 2] = Math.sin(nuclearAngle) * nuclearRadius;
                var nuclearColor = new THREE.Color(nuclearIndex % 11 === 0 ? 0x93c5fd : nuclearIndex % 5 === 0 ? 0xfecdd3 : 0xfef3c7); nuclearCol[nuclearIndex * 3] = nuclearColor.r; nuclearCol[nuclearIndex * 3 + 1] = nuclearColor.g; nuclearCol[nuclearIndex * 3 + 2] = nuclearColor.b;
              }
              nuclearGeo.setAttribute('position', new THREE.BufferAttribute(nuclearPos, 3)); nuclearGeo.setAttribute('color', new THREE.BufferAttribute(nuclearCol, 3));
              nuclearStarClusterMaterial = new THREE.PointsMaterial({ size: resolvedQuality === 'cinematic' ? 0.0065 : 0.0055, map: nuclearTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
              var nuclearStars = new THREE.Points(nuclearGeo, nuclearStarClusterMaterial); nuclearStars.renderOrder = 5; nuclearDetailGroup.add(nuclearStars);
              var nuclearSpiralCount = resolvedQuality === 'cinematic' ? 10 : resolvedQuality === 'high' ? 8 : 6;
              for (var nuclearSpiral = 0; nuclearSpiral < nuclearSpiralCount; nuclearSpiral++) {
                var nuclearPoints = [], nuclearSegments = resolvedQuality === 'cinematic' ? 180 : 108;
                for (var nuclearSegment = 0; nuclearSegment <= nuclearSegments; nuclearSegment++) { var nuclearF = nuclearSegment / nuclearSegments, nuclearR = 0.026 + nuclearF * 0.18, nuclearA = nuclearSpiral / nuclearSpiralCount * Math.PI * 2 + nuclearR * 14.5 + Math.sin(nuclearF * Math.PI * 3) * 0.025; nuclearPoints.push(new THREE.Vector3(Math.cos(nuclearA) * nuclearR, 0.004 + nuclearSpiral * 0.0004, Math.sin(nuclearA) * nuclearR)); }
                var nuclearSpiralMat = new THREE.LineBasicMaterial({ color: nuclearSpiral % 3 === 0 ? 0x0b0711 : nuclearSpiral % 2 ? 0x7dd3fc : 0xf59e0b, transparent: true, opacity: 0, depthWrite: false, blending: nuclearSpiral % 3 === 0 ? THREE.NormalBlending : THREE.AdditiveBlending }); nuclearSpiralMat.userData = { baseOpacity: nuclearSpiral % 3 === 0 ? 0.42 : 0.16, phase: nuclearSpiral * 0.74 };
                var nuclearLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(nuclearPoints), nuclearSpiralMat); nuclearLine.renderOrder = nuclearSpiral % 3 === 0 ? 6 : 7; nuclearDetailGroup.add(nuclearLine); nuclearDustSpiralMaterials.push(nuclearSpiralMat);
              }
              // Broken circumnuclear rings and ionized mini-spirals bridge the
              // nuclear star cluster to the much smaller accretion flow.
              var circumnuclearRingCount = resolvedQuality === 'cinematic' ? 6 : resolvedQuality === 'high' ? 5 : 3;
              for (var circumnuclearRingIndex = 0; circumnuclearRingIndex < circumnuclearRingCount; circumnuclearRingIndex++) {
                var circumnuclearRadius = 0.038 + circumnuclearRingIndex * 0.019;
                for (var circumnuclearFragmentIndex = 0; circumnuclearFragmentIndex < 3; circumnuclearFragmentIndex++) {
                  var circumnuclearMaterial = new THREE.MeshBasicMaterial({ color: circumnuclearFragmentIndex === 0 ? 0xf59e0b : circumnuclearFragmentIndex === 1 ? 0x67e8f9 : 0xf9a8d4, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); circumnuclearMaterial.userData = { baseOpacity: 0.055 + circumnuclearFragmentIndex * 0.022 + (circumnuclearRingIndex % 3) * 0.008, phase: circumnuclearRingIndex * 0.82 + circumnuclearFragmentIndex * 1.37 };
                  var circumnuclearArc = new THREE.Mesh(new THREE.RingGeometry(circumnuclearRadius, circumnuclearRadius + 0.0025 + circumnuclearFragmentIndex * 0.0006, resolvedQuality === 'cinematic' ? 112 : 72, 1, circumnuclearFragmentIndex * 2.05 + circumnuclearRingIndex * 0.43, 0.88 + (circumnuclearRingIndex % 3) * 0.18), circumnuclearMaterial); circumnuclearArc.rotation.x = Math.PI * 0.5 + (circumnuclearRingIndex % 3 - 1) * 0.025; circumnuclearArc.rotation.z = circumnuclearRingIndex * 0.31; circumnuclearArc.userData = { phase: circumnuclearRingIndex * 0.82 + circumnuclearFragmentIndex, drift: (circumnuclearFragmentIndex % 2 ? -1 : 1) * (0.00028 + circumnuclearRingIndex * 0.000025) }; circumnuclearArc.renderOrder = 8; circumnuclearFeedingGroup.add(circumnuclearArc); circumnuclearRingMaterials.push(circumnuclearMaterial); circumnuclearRingObjects.push(circumnuclearArc);
                }
              }
              var nuclearMiniSpiralCount = resolvedQuality === 'cinematic' ? 4 : resolvedQuality === 'high' ? 3 : 2;
              for (var nuclearMiniSpiralIndex = 0; nuclearMiniSpiralIndex < nuclearMiniSpiralCount; nuclearMiniSpiralIndex++) {
                var nuclearMiniPoints = [], nuclearMiniSegments = resolvedQuality === 'cinematic' ? 110 : resolvedQuality === 'high' ? 78 : 54;
                for (var nuclearMiniStep = 0; nuclearMiniStep <= nuclearMiniSegments; nuclearMiniStep++) { var nuclearMiniT = nuclearMiniStep / nuclearMiniSegments, nuclearMiniRadius = 0.022 + nuclearMiniT * 0.125, nuclearMiniAngle = nuclearMiniSpiralIndex / nuclearMiniSpiralCount * Math.PI * 2 + nuclearMiniT * Math.PI * 2.35 + Math.sin(nuclearMiniT * Math.PI * 3 + nuclearMiniSpiralIndex) * 0.055; nuclearMiniPoints.push(new THREE.Vector3(Math.cos(nuclearMiniAngle) * nuclearMiniRadius, 0.006 + nuclearMiniSpiralIndex * 0.0008 + Math.sin(nuclearMiniT * Math.PI * 2) * 0.0018, Math.sin(nuclearMiniAngle) * nuclearMiniRadius)); }
                var nuclearMiniMaterial = new THREE.LineBasicMaterial({ color: nuclearMiniSpiralIndex % 3 === 0 ? 0x67e8f9 : nuclearMiniSpiralIndex % 2 ? 0xf9a8d4 : 0xfde68a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); nuclearMiniMaterial.userData = { baseOpacity: 0.09 + nuclearMiniSpiralIndex * 0.018, phase: nuclearMiniSpiralIndex * 1.23 }; var nuclearMiniLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(nuclearMiniPoints), nuclearMiniMaterial); nuclearMiniLine.renderOrder = 9; circumnuclearFeedingGroup.add(nuclearMiniLine); nuclearMiniSpiralMaterials.push(nuclearMiniMaterial);
              }
              var nuclearFeedingHotKnotCount = resolvedQuality === 'cinematic' ? 20 : resolvedQuality === 'high' ? 14 : 9;
              for (var nuclearHotKnotIndex = 0; nuclearHotKnotIndex < nuclearFeedingHotKnotCount; nuclearHotKnotIndex++) {
                var nuclearHotKnotMaterial = new THREE.SpriteMaterial({ map: hotTex, color: nuclearHotKnotIndex % 5 === 0 ? 0xf9a8d4 : nuclearHotKnotIndex % 3 === 0 ? 0x67e8f9 : 0xfde68a, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, rotation: nuclearHotKnotIndex * 0.61 });
                var nuclearHotKnot = new THREE.Sprite(nuclearHotKnotMaterial), nuclearHotRadius = 0.032 + Math.pow(Math.random(), 0.72) * 0.112, nuclearHotAngle = Math.random() * Math.PI * 2, nuclearHotScaleX = 0.012 + Math.random() * 0.012, nuclearHotScaleY = nuclearHotScaleX * (0.22 + Math.random() * 0.16); nuclearHotKnot.position.set(Math.cos(nuclearHotAngle) * nuclearHotRadius, (Math.random() - 0.5) * 0.008, Math.sin(nuclearHotAngle) * nuclearHotRadius); nuclearHotKnot.scale.set(nuclearHotScaleX, nuclearHotScaleY, 1); nuclearHotKnot.userData = { angle: nuclearHotAngle, radius: nuclearHotRadius, speed: 0.34 + Math.random() * 0.48, baseScaleX: nuclearHotScaleX, baseScaleY: nuclearHotScaleY, baseOpacity: 0.13 + (nuclearHotKnotIndex % 4) * 0.035, phase: nuclearHotKnotIndex * 0.74, inclination: 0.56 + (nuclearHotKnotIndex % 4) * 0.08 }; nuclearHotKnot.renderOrder = 10; circumnuclearFeedingGroup.add(nuclearHotKnot); nuclearFeedingHotKnots.push(nuclearHotKnot);
              }
            })();



            // Scale grid — the old version was 0x223366/0x112244 lines on a #020208
            // sky, so switching the layer on looked like nothing happened, and the
            // lone unlabelled ring conveyed no scale at all. Brighter lines plus two
            // labelled radii make the layer actually report distances.

            var gridHelper = new THREE.GridHelper(2, 20, 0x4f7fd4, 0x2a4a86);

            gridHelper.position.y = -0.03;
            if (gridHelper.material) {
              var gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
              gridMaterials.forEach(function (m) { m.transparent = true; m.opacity = 0.42; m.depthWrite = false; });
            }

            gridGroup.add(gridHelper);

            // World radius ~0.9 spans the modelled disk, and SCALE_INFO puts the disk
            // at ~50,000 ly in radius — so ~0.5 lands on the Sun's ~26,000 ly orbit.
            var scaleRings = [
              { radius: 0.5, color: 0x67e8f9, opacity: 0.42, label: __alloT('stem.galaxy.grid_ring_sun', 'Sun’s orbit · ~26,000 ly') },
              { radius: 0.9, color: 0x818cf8, opacity: 0.3, label: __alloT('stem.galaxy.grid_ring_edge', 'Disk edge · ~50,000 ly') }
            ];
            scaleRings.forEach(function (ring) {
              var ringMesh = new THREE.Mesh(new THREE.RingGeometry(ring.radius - 0.006, ring.radius, 128), new THREE.MeshBasicMaterial({ color: ring.color, side: THREE.DoubleSide, transparent: true, opacity: ring.opacity, depthWrite: false }));
              ringMesh.rotation.x = Math.PI * 0.5; ringMesh.position.y = -0.02;
              gridGroup.add(ringMesh);

              var ringCv = document.createElement('canvas'); ringCv.setAttribute('aria-hidden', 'true'); ringCv.width = 320; ringCv.height = 44;
              var ringCtx = upscaleGalaxyCanvas(ringCv, ringCv.getContext('2d'));
              ringCtx.font = 'bold 19px Inter, system-ui, sans-serif';
              ringCtx.textAlign = 'center'; ringCtx.textBaseline = 'middle';
              // Stroke first so the text stays readable over bright arms as well as sky.
              ringCtx.lineWidth = 4; ringCtx.strokeStyle = 'rgba(2,6,23,0.92)';
              ringCtx.strokeText(ring.label, 160, 24);
              ringCtx.fillStyle = '#' + ring.color.toString(16).padStart(6, '0');
              ringCtx.fillText(ring.label, 160, 24);
              var ringLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: tuneGalaxyTexture(new THREE.CanvasTexture(ringCv)), transparent: true, depthWrite: false, depthTest: false, opacity: 0.92 }));
              ringLabel.position.set(0, -0.012, ring.radius);
              ringLabel.scale.set(0.34, 0.047, 1);
              ringLabel.renderOrder = 12;
              gridGroup.add(ringLabel);
            });



            // Nebulae as sprites

            // Every nebula gets its OWN canvas. Sharing one canvas and cloning the
            // CanvasTexture shares the image reference too, so all eight sprites
            // uploaded whatever the canvas held after the loop finished — the last
            // nebula's colour. Orion's pink, the Crab's teal and the Ring's magenta
            // all rendered as the Lagoon's red.
            var nebulaSprites = [], nebulaWispSprites = [];

            NEBULAE.forEach(function (neb) {
              if (galaxyType === 'elliptical') return;

              var nebCanvas = document.createElement('canvas'); nebCanvas.setAttribute('aria-hidden', 'true'); nebCanvas.width = 96; nebCanvas.height = 96;

              var nCtx = upscaleGalaxyCanvas(nebCanvas, nebCanvas.getContext('2d'));

              var grad = nCtx.createRadialGradient(48, 48, 0, 48, 48, 48);

              grad.addColorStop(0, neb.color + 'cc'); grad.addColorStop(0.28, neb.color + '7a'); grad.addColorStop(0.62, neb.color + '2e'); grad.addColorStop(1, neb.color + '00');

              nCtx.fillStyle = grad; nCtx.fillRect(0, 0, 96, 96);

              // A few offset lobes stop the sprite reading as a perfect circle —
              // emission nebulae are clumpy, and a plain radial blob looked synthetic.
              for (var lobe = 0; lobe < 5; lobe++) {
                var lobeAngle = lobe * 1.27 + neb.x * 3;
                var lobeDist = 12 + (lobe % 3) * 7;
                var lobeX = 48 + Math.cos(lobeAngle) * lobeDist, lobeY = 48 + Math.sin(lobeAngle) * lobeDist * 0.78;
                var lobeRadius = 15 + (lobe % 4) * 5;
                var lobeGrad = nCtx.createRadialGradient(lobeX, lobeY, 0, lobeX, lobeY, lobeRadius);
                lobeGrad.addColorStop(0, neb.color + '3a'); lobeGrad.addColorStop(1, neb.color + '00');
                nCtx.fillStyle = lobeGrad;
                nCtx.beginPath(); nCtx.arc(lobeX, lobeY, lobeRadius, 0, Math.PI * 2); nCtx.fill();
              }

              // Dark nebulae absorb rather than emit, so they read as a silhouette.
              if (neb.type === 'Dark') {
                nCtx.globalCompositeOperation = 'multiply';
                var darkGrad = nCtx.createRadialGradient(48, 48, 0, 48, 48, 40);
                darkGrad.addColorStop(0, 'rgba(8,6,14,0.86)'); darkGrad.addColorStop(1, 'rgba(8,6,14,0)');
                nCtx.fillStyle = darkGrad; nCtx.fillRect(0, 0, 96, 96);
                nCtx.globalCompositeOperation = 'source-over';
              }

              var tex = tuneGalaxyTexture(new THREE.CanvasTexture(nebCanvas));

              var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, blending: neb.type === 'Dark' ? THREE.NormalBlending : THREE.AdditiveBlending }));

              sprite.position.set(neb.x, neb.y, neb.z); sprite.scale.set(neb.r * 2, neb.r * 2, 1);

              sprite.userData = neb; nebGroup.add(sprite); nebulaSprites.push(sprite);

              for (var wi = 0; wi < 3; wi++) {
                var wCv = document.createElement('canvas'); wCv.setAttribute('aria-hidden', 'true'); wCv.width = 96; wCv.height = 96;
                var wCtx = wCv.getContext('2d');
              wCtx = upscaleGalaxyCanvas(wCv, wCtx);
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
                var wTex = tuneGalaxyTexture(new THREE.CanvasTexture(wCv));
                var wMat = new THREE.SpriteMaterial({ map: wTex, transparent: true, opacity: 0.14 + wi * 0.035, depthWrite: false, blending: THREE.AdditiveBlending, rotation: wi * 0.8 });
                var wSprite = new THREE.Sprite(wMat);
                wSprite.position.set(neb.x + (Math.random() - 0.5) * neb.r * 0.75, neb.y + (Math.random() - 0.5) * neb.r * 0.34, neb.z + (Math.random() - 0.5) * neb.r * 0.75);
                wSprite.scale.set(neb.r * (3.1 + wi * 0.55), neb.r * (1.7 + wi * 0.42), 1);
                wSprite.userData = { baseOpacity: wMat.opacity, baseScaleX: wSprite.scale.x, baseScaleY: wSprite.scale.y, phase: Math.random() * Math.PI * 2 };
                nebGroup.add(wSprite);
                nebulaWispSprites.push(wSprite);
              }

            });


            // Close-range stellar feedback: ionization fronts, dust pillars, and compact
            // Bok globules add the small-scale structure visible in resolved nurseries.
            (function () {
              var pillarCv = document.createElement('canvas'); pillarCv.setAttribute('aria-hidden', 'true'); pillarCv.width = 80; pillarCv.height = 160;
              var pillarCtx = upscaleGalaxyCanvas(pillarCv, pillarCv.getContext('2d'));
              var pillarGrad = pillarCtx.createLinearGradient(18, 0, 62, 160);
              pillarGrad.addColorStop(0, 'rgba(9,6,17,0)'); pillarGrad.addColorStop(0.18, 'rgba(12,8,20,0.82)'); pillarGrad.addColorStop(0.72, 'rgba(24,12,31,0.94)'); pillarGrad.addColorStop(1, 'rgba(7,5,13,0)');
              pillarCtx.fillStyle = pillarGrad; pillarCtx.beginPath(); pillarCtx.moveTo(31, 12); pillarCtx.bezierCurveTo(17, 38, 29, 72, 19, 112); pillarCtx.bezierCurveTo(28, 137, 48, 151, 57, 139); pillarCtx.bezierCurveTo(49, 103, 62, 72, 49, 42); pillarCtx.bezierCurveTo(47, 26, 40, 13, 31, 12); pillarCtx.fill();
              pillarCtx.strokeStyle = 'rgba(251,191,36,0.28)'; pillarCtx.lineWidth = 2; pillarCtx.beginPath(); pillarCtx.moveTo(47, 32); pillarCtx.bezierCurveTo(54, 62, 42, 102, 54, 132); pillarCtx.stroke();
              var pillarTex = tuneGalaxyTexture(new THREE.CanvasTexture(pillarCv));

              var globuleCv = document.createElement('canvas'); globuleCv.setAttribute('aria-hidden', 'true'); globuleCv.width = 96; globuleCv.height = 96;
              var globuleCtx = upscaleGalaxyCanvas(globuleCv, globuleCv.getContext('2d'));
              var globuleGrad = globuleCtx.createRadialGradient(45, 50, 2, 48, 48, 44);
              globuleGrad.addColorStop(0, 'rgba(4,3,10,0.98)'); globuleGrad.addColorStop(0.52, 'rgba(11,7,18,0.9)'); globuleGrad.addColorStop(0.76, 'rgba(60,28,57,0.44)'); globuleGrad.addColorStop(1, 'rgba(0,0,0,0)'); globuleCtx.fillStyle = globuleGrad; globuleCtx.fillRect(0, 0, 96, 96);
              globuleCtx.strokeStyle = 'rgba(253,186,116,0.2)'; globuleCtx.lineWidth = 2; globuleCtx.beginPath(); globuleCtx.arc(48, 48, 31, -1.18, 1.25); globuleCtx.stroke();
              var globuleTex = tuneGalaxyTexture(new THREE.CanvasTexture(globuleCv));

              NEBULAE.forEach(function (neb, nebIndex) {
                if (galaxyType === 'elliptical') return;
                var feedbackEligible = neb.type === 'Emission' || neb.type === 'Dark';
                if (!feedbackEligible) return;
                var rimCount = resolvedQuality === 'cinematic' ? 4 : resolvedQuality === 'high' ? 3 : 2;
                for (var rimIndex = 0; rimIndex < rimCount; rimIndex++) {
                  var rimMat = new THREE.MeshBasicMaterial({ color: rimIndex % 2 ? 0x67e8f9 : 0xfda4af, transparent: true, opacity: 0.13 + rimIndex * 0.018, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
                  var rim = new THREE.Mesh(new THREE.RingGeometry(0.76, 1, resolvedQuality === 'cinematic' ? 96 : 56, 1, rimIndex * 1.37 + nebIndex * 0.42, 1.1 + rimIndex * 0.24), rimMat);
                  rim.position.set(neb.x, neb.y + 0.006 + rimIndex * 0.001, neb.z); rim.rotation.x = Math.PI * 0.5; rim.rotation.z = nebIndex * 0.58; var rimScale = neb.r * (1.45 + rimIndex * 0.27); rim.scale.set(rimScale, rimScale * (0.7 + rimIndex * 0.05), rimScale); rim.userData = { baseOpacity: rimMat.opacity, baseScale: rimScale, phase: nebIndex * 1.1 + rimIndex * 0.9 }; rim.renderOrder = 8; stellarFeedbackGroup.add(rim); feedbackIonizationRims.push(rim);
                }
                var pillarCount = resolvedQuality === 'cinematic' ? 4 : resolvedQuality === 'high' ? 3 : 2;
                for (var pillarIndex = 0; pillarIndex < pillarCount; pillarIndex++) {
                  var pillarMat = new THREE.SpriteMaterial({ map: pillarTex, color: pillarIndex % 2 ? 0x312039 : 0x1e172c, transparent: true, opacity: 0.56, depthWrite: false, blending: THREE.NormalBlending, rotation: -0.42 + pillarIndex * 0.31 + nebIndex * 0.08 });
                  var pillar = new THREE.Sprite(pillarMat), pillarAngle = pillarIndex * 2.05 + nebIndex * 0.74, pillarOffset = neb.r * (0.34 + pillarIndex * 0.12);
                  pillar.position.set(neb.x + Math.cos(pillarAngle) * pillarOffset, neb.y + 0.012, neb.z + Math.sin(pillarAngle) * pillarOffset); var pillarWidth = neb.r * (0.22 + pillarIndex * 0.025), pillarHeight = neb.r * (0.82 + pillarIndex * 0.16); pillar.scale.set(pillarWidth, pillarHeight, 1); pillar.userData = { baseOpacity: pillarMat.opacity, baseScaleX: pillarWidth, baseScaleY: pillarHeight, phase: nebIndex * 0.8 + pillarIndex * 1.3, drift: (pillarIndex % 2 ? -1 : 1) * 0.00016 }; pillar.renderOrder = 9; stellarFeedbackGroup.add(pillar); feedbackPillarSprites.push(pillar);
                }
                var globuleCount = resolvedQuality === 'cinematic' ? 7 : resolvedQuality === 'high' ? 5 : 3;
                for (var globuleIndex = 0; globuleIndex < globuleCount; globuleIndex++) {
                  var globuleMat = new THREE.SpriteMaterial({ map: globuleTex, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.NormalBlending, rotation: Math.random() * Math.PI });
                  var globule = new THREE.Sprite(globuleMat), globuleAngle = Math.random() * Math.PI * 2, globuleOffset = neb.r * (0.2 + Math.random() * 0.72);
                  globule.position.set(neb.x + Math.cos(globuleAngle) * globuleOffset, neb.y + 0.014 + Math.random() * 0.008, neb.z + Math.sin(globuleAngle) * globuleOffset); var globuleScale = neb.r * (0.11 + Math.random() * 0.12); globule.scale.set(globuleScale * (0.8 + Math.random() * 0.5), globuleScale, 1); globule.userData = { baseOpacity: globuleMat.opacity, baseScaleX: globule.scale.x, baseScaleY: globule.scale.y, phase: Math.random() * Math.PI * 2, drift: (Math.random() - 0.5) * 0.00012 }; globule.renderOrder = 10; stellarFeedbackGroup.add(globule); bokGlobuleSprites.push(globule);
                }
              });
            })();


            // Labels for nebulae

            NEBULAE.forEach(function (neb) {
              if (galaxyType === 'elliptical') return;

              var labelCanvas = document.createElement('canvas'); labelCanvas.setAttribute('aria-hidden', 'true'); labelCanvas.width = 288; labelCanvas.height = 52;

              var lCtx = upscaleGalaxyCanvas(labelCanvas, labelCanvas.getContext('2d'));

              // A full-bleed 50%-black rectangle left hard edges floating in space and
              // still failed the darker nebulae — the Horsehead's #8d6e63 on it is
              // about 2.5:1. A rounded pill, a colour chip, and white text with a dark
              // stroke keep every label legible without a boxy black slab.
              var pillX = 6, pillY = 8, pillW = 276, pillH = 34, pillR = 17;
              lCtx.beginPath();
              lCtx.moveTo(pillX + pillR, pillY);
              lCtx.lineTo(pillX + pillW - pillR, pillY);
              lCtx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR);
              lCtx.lineTo(pillX + pillW, pillY + pillH - pillR);
              lCtx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH);
              lCtx.lineTo(pillX + pillR, pillY + pillH);
              lCtx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR);
              lCtx.lineTo(pillX, pillY + pillR);
              lCtx.quadraticCurveTo(pillX, pillY, pillX + pillR, pillY);
              lCtx.closePath();
              lCtx.fillStyle = 'rgba(2,6,23,0.82)'; lCtx.fill();
              lCtx.lineWidth = 1.5; lCtx.strokeStyle = neb.color + 'aa'; lCtx.stroke();

              // Colour chip ties the label back to its sprite without tinting the text.
              lCtx.beginPath(); lCtx.arc(pillX + 20, pillY + pillH / 2, 6, 0, Math.PI * 2);
              lCtx.fillStyle = neb.color; lCtx.fill();

              lCtx.font = 'bold 19px Inter, system-ui, sans-serif';
              lCtx.textAlign = 'center'; lCtx.textBaseline = 'middle';
              lCtx.lineWidth = 3.5; lCtx.strokeStyle = 'rgba(2,6,23,0.95)';
              lCtx.strokeText(neb.name, pillX + pillW / 2 + 10, pillY + pillH / 2 + 1);
              lCtx.fillStyle = '#f8fafc';
              lCtx.fillText(neb.name, pillX + pillW / 2 + 10, pillY + pillH / 2 + 1);

              var labelTex = tuneGalaxyTexture(new THREE.CanvasTexture(labelCanvas));

              var labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false, depthTest: false }));

              labelSprite.position.set(neb.x, neb.y + neb.r + 0.035, neb.z);

              labelSprite.scale.set(0.17, 0.031, 1);
              labelSprite.renderOrder = 14;

              labelGroup.add(labelSprite);

            });



            // Store layer references on canvas for toggle access

            canvasEl._layers = { bgStars: bgGroup, arms: armGroup, bulge: bulgeGroup, blackHole: bhGroup, nebulae: nebGroup, grid: gridGroup, labels: labelGroup, dust: dustGroup, gas: gasGroup };
            canvasEl._isLayerAllowed = function (layerKey) { return morphologyVisual.hiddenLayers[layerKey] !== true; };
            canvasEl._setDetailLayer = function (layerKey, visible) {
              var detailVisible = visible && canvasEl._isLayerAllowed(layerKey);
              if (layerKey === 'dust') volumetricDustSprites.forEach(function (sprite) { sprite.visible = detailVisible; });
              if (layerKey === 'gas') starBirthSprites.forEach(function (sprite) { sprite.visible = detailVisible; });
            };
            canvasEl._setLayerVisibility = function (layerKey, visible) {
              var layerVisible = visible && canvasEl._isLayerAllowed(layerKey);
              if (canvasEl._layers[layerKey]) canvasEl._layers[layerKey].visible = layerVisible;
              canvasEl._setDetailLayer(layerKey, layerVisible);
              return layerVisible;
            };
            Object.keys(canvasEl._layers).forEach(function (layerKey) { canvasEl._setLayerVisibility(layerKey, layers[layerKey] !== false); });



            // Function to regenerate stars with new count

            // Tracks the age distribution the star field currently reflects, so a
            // star-count change does not silently snap the palette back to today.
            var activeAgeDistribution = getMorphologyAgeDistribution(getAgeDistribution(cosmicAge));

            canvasEl._setStarCount = function (count) {

              armGroup.remove(starPoints);

              starPoints.geometry.dispose();

              var result = generateStars(THREE, count, gType, galaxyType, activeAgeDistribution);

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
              if (composer.setPixelRatio) composer.setPixelRatio(renderer.getPixelRatio());
              composer.setSize(W, H);

              composer.addPass(new THREE.RenderPass(scene, camera));

              // Bloom pairs with the star profile above. Now that each star's energy
              // is concentrated into a tight core rather than spread across a soft
              // disc, a LOWER threshold would bloom the whole disk into haze — so the
              // threshold rises slightly and the strength eases back, letting bloom
              // pick out genuinely bright stars and the core instead of everything.
              // Tune these together with CORE_TIGHTNESS / CORE_GAIN.
              var bloomStrength = (resolvedQuality === 'cinematic' ? 1.32 : resolvedQuality === 'high' ? 1.24 : 1.12) * morphologyVisual.bloomStrength;
              var bloomRadius = resolvedQuality === 'cinematic' ? 0.46 : resolvedQuality === 'high' ? 0.36 : 0.26;
              var bloomThreshold = Math.min(0.98, (resolvedQuality === 'cinematic' ? 0.84 : resolvedQuality === 'high' ? 0.87 : 0.9) + morphologyVisual.bloomThreshold);
              var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W * renderer.getPixelRatio(), H * renderer.getPixelRatio()), bloomStrength, bloomRadius, bloomThreshold);

              composer.addPass(bloomPass);

              canvasEl._bloomPass = bloomPass;

            }

            var currentObserveMode = observeMode || 'visible';
            var bloomModeStrength = 1.35 * morphologyVisual.bloomStrength, bloomModeThreshold = Math.min(0.98, (resolvedQuality === 'cinematic' ? 0.84 : resolvedQuality === 'high' ? 0.87 : 0.9) + morphologyVisual.bloomThreshold);
            var observeTransitionReady = false;
            function setObserveMode(mode) {
              var nextObserveMode = mode || 'visible';
              if (observeTransitionReady && nextObserveMode !== currentObserveMode) {
                var transitionEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-observe-transition]');
                if (transitionEl) {
                  var transitionColors = { visible: '99,102,241', infrared: '249,115,22', radio: '6,182,212', xray: '56,189,248', gravity: '192,132,252' };
                  var transitionColor = transitionColors[nextObserveMode] || transitionColors.visible;
                  transitionEl.style.transition = 'none'; transitionEl.style.background = 'radial-gradient(circle at 50% 48%, rgba(' + transitionColor + ',0.42), rgba(2,6,23,0.08) 54%, rgba(2,6,23,0.72))'; transitionEl.style.opacity = '0.72';
                  requestAnimationFrame(function () { if (transitionEl.isConnected) { transitionEl.style.transition = prefersReducedMotion ? 'opacity 0.01s linear' : 'opacity 0.72s ease-out'; transitionEl.style.opacity = '0'; } });
                }
                cinematicMotion.aperture = prefersReducedMotion ? 0 : 1;
              }
              currentObserveMode = nextObserveMode;
              var obsIndex = currentObserveMode === 'infrared' ? 1 : currentObserveMode === 'radio' ? 2 : currentObserveMode === 'xray' ? 3 : currentObserveMode === 'gravity' ? 4 : 0;
              starShaderMat.uniforms.uObserve.value = obsIndex;
              infraredGroup.visible = currentObserveMode === 'infrared';
              radioGroup.visible = currentObserveMode === 'radio';
              xrayGroup.visible = currentObserveMode === 'xray';
              darkHaloGroup.visible = currentObserveMode === 'gravity';
              weakLensingTarget = currentObserveMode === 'gravity' ? 1 : 0; if (weakLensingTarget > 0) weakLensingGroup.visible = true;
              if (gasGroup.children[0] && gasGroup.children[0].material) gasGroup.children[0].material.opacity = currentObserveMode === 'radio' ? 0.18 : currentObserveMode === 'infrared' ? 0.1 : 0.06;
              // Tuned up alongside the softer dust grain: infrared sees THROUGH dust,
              // so it stays the most transparent of the filters.
              if (dustGroup.children[0] && dustGroup.children[0].material) dustGroup.children[0].material.opacity = currentObserveMode === 'infrared' ? 0.05 : currentObserveMode === 'visible' ? 0.17 : 0.09;
              if (bulgeGlow && bulgeGlow.material) bulgeGlow.material.opacity = (currentObserveMode === 'xray' ? 0.35 : currentObserveMode === 'gravity' ? 0.2 : 1) * morphologyVisual.coreGlow;
              if (bhGlow && bhGlow.material) bhGlow.material.opacity = currentObserveMode === 'xray' ? 0.95 : currentObserveMode === 'gravity' ? 0.45 : 0.7;
              visualGlow.disk = (currentObserveMode === 'infrared' ? 0.24 : currentObserveMode === 'radio' ? 0.08 : currentObserveMode === 'xray' ? 0.05 : currentObserveMode === 'gravity' ? 0.07 : 0.16) * morphologyVisual.diskGlow;
              visualGlow.arms = (currentObserveMode === 'infrared' ? 0.32 : currentObserveMode === 'radio' ? 0.1 : currentObserveMode === 'xray' ? 0.07 : currentObserveMode === 'gravity' ? 0.08 : 0.18) * morphologyVisual.armGlow;
              visualGlow.core = (currentObserveMode === 'xray' ? 0.72 : currentObserveMode === 'infrared' ? 0.48 : currentObserveMode === 'gravity' ? 0.24 : currentObserveMode === 'radio' ? 0.16 : 0.42) * morphologyVisual.coreGlow;
              sparkleGroup.visible = currentObserveMode !== 'radio' && currentObserveMode !== 'gravity';
              chromaticHaloMode = currentObserveMode === 'infrared' ? 1.2 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'xray' ? 0.82 : currentObserveMode === 'radio' ? 0.2 : 0.12;
              haloScatteringMode = currentObserveMode === 'gravity' ? 1.35 : currentObserveMode === 'infrared' ? 1.2 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.62 : 0.42;
              planetaryNebulaMode = currentObserveMode === 'xray' ? 1.12 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.62 : currentObserveMode === 'radio' ? 0.34 : 0.12;
              bowShockMode = currentObserveMode === 'xray' ? 1.2 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.78 : currentObserveMode === 'infrared' ? 0.58 : 0.12;
              circumstellarMode = currentObserveMode === 'infrared' ? 1.5 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.76 : currentObserveMode === 'xray' ? 0.52 : 0.12;
              protostellarJetMode = currentObserveMode === 'xray' ? 1.3 : currentObserveMode === 'infrared' ? 1.1 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.65 : 0.1;
              supernovaEjectaMode = currentObserveMode === 'xray' ? 1.5 : currentObserveMode === 'radio' ? 1.32 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.38 : 0.12;
              clusterTidalTailMode = currentObserveMode === 'gravity' ? 1.75 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.82 : currentObserveMode === 'xray' ? 0.38 : 0.24;
              satelliteDwarfMode = currentObserveMode === 'gravity' ? 1.45 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.88 : currentObserveMode === 'radio' ? 0.52 : 0.38;
              ramPressureMode = currentObserveMode === 'radio' ? 1.45 : currentObserveMode === 'xray' ? 1.18 : currentObserveMode === 'infrared' ? 1 : currentObserveMode === 'visible' ? 0.85 : 0.18;
              nuclearFeedingMode = currentObserveMode === 'xray' ? 1.35 : currentObserveMode === 'infrared' ? 1.25 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.72 : 0.28;
              if (diskSheenMat) diskSheenMat.opacity = visualGlow.disk;
              if (armGlowMat) armGlowMat.opacity = visualGlow.arms;
              if (coreFlare && coreFlare.material) coreFlare.material.opacity = visualGlow.core;
              cinematicMotion.foreground = currentObserveMode === 'radio' ? 0.55 : currentObserveMode === 'gravity' ? 0.68 : currentObserveMode === 'xray' ? 0.72 : 1;
              volumetricTarget.dust = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.22 : currentObserveMode === 'radio' ? 0.3 : 0.12;
              volumetricTarget.birth = currentObserveMode === 'infrared' ? 1.55 : currentObserveMode === 'xray' ? 0.42 : currentObserveMode === 'radio' ? 0.62 : currentObserveMode === 'gravity' ? 0.28 : 1;
              volumetricTarget.satellite = currentObserveMode === 'gravity' ? 1.5 : currentObserveMode === 'radio' ? 0.7 : currentObserveMode === 'xray' ? 0.54 : 1;
              populationTarget.clusters = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.92 : currentObserveMode === 'radio' ? 0.16 : currentObserveMode === 'xray' ? 0.48 : 0.22;
              populationTarget.thickDisk = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 1.35 : currentObserveMode === 'radio' ? 0.18 : currentObserveMode === 'xray' ? 0.24 : 0.36;
              populationTarget.remnants = currentObserveMode === 'xray' ? 1.7 : currentObserveMode === 'radio' ? 1.3 : currentObserveMode === 'infrared' ? 0.62 : currentObserveMode === 'gravity' ? 0.22 : 1;
              cloudTarget.molecular = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.35 : currentObserveMode === 'radio' ? 0.68 : currentObserveMode === 'xray' ? 0.12 : 0.18;
              cloudTarget.protostar = currentObserveMode === 'infrared' ? 1.65 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.5 : currentObserveMode === 'xray' ? 0.42 : 0.2;
              cloudTarget.foreground = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.25 : currentObserveMode === 'radio' ? 0.18 : currentObserveMode === 'xray' ? 0.06 : 0.1;
              streamlineGlow = currentObserveMode === 'radio' ? 1.45 : currentObserveMode === 'gravity' ? 1.18 : currentObserveMode === 'infrared' ? 1.05 : currentObserveMode === 'xray' ? 0.62 : 1;
              spiralRidgeGlow = currentObserveMode === 'infrared' ? 1.18 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.72 : currentObserveMode === 'xray' ? 0.5 : 0.44;
              edgeOnModeOpacity = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.28 : currentObserveMode === 'radio' ? 0.32 : currentObserveMode === 'xray' ? 0.12 : 0.08;
              armScatteringMode = currentObserveMode === 'infrared' ? 1.35 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.45 : currentObserveMode === 'xray' ? 0.28 : 0.24;
              dustColorScatteringMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.9 : currentObserveMode === 'radio' ? 0.3 : currentObserveMode === 'xray' ? 0.18 : 0.12;
              emissionLineMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'xray' ? 0.72 : currentObserveMode === 'infrared' ? 0.48 : currentObserveMode === 'radio' ? 0.24 : 0.18;
              shockFrontMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 1.18 : currentObserveMode === 'radio' ? 0.62 : currentObserveMode === 'xray' ? 0.32 : 0.18;
              magneticFilamentMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.82 : currentObserveMode === 'radio' ? 0.5 : currentObserveMode === 'xray' ? 0.18 : 0.12;
              outerWarpMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 1.2 : currentObserveMode === 'radio' ? 0.7 : currentObserveMode === 'xray' ? 0.34 : 0.28;
              extraplanarGasMode = currentObserveMode === 'xray' ? 1.45 : currentObserveMode === 'radio' ? 1.08 : currentObserveMode === 'visible' ? 0.82 : currentObserveMode === 'infrared' ? 0.58 : 0.18;
              haloShellMode = currentObserveMode === 'gravity' ? 1.65 : currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.8 : currentObserveMode === 'infrared' ? 0.72 : 0.42;
              foregroundStarMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.55 : currentObserveMode === 'xray' ? 0.35 : currentObserveMode === 'radio' ? 0.18 : 0.12;
              dustBacklightMode = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.7 : currentObserveMode === 'radio' ? 0.35 : currentObserveMode === 'xray' ? 0.18 : 0.12;
              edgeOnSilhouetteSprites.forEach(function (silhouetteSprite) { silhouetteSprite.material.opacity = (silhouetteSprite.material.userData.baseOpacity || 0.22) * edgeOnFactor * edgeOnModeOpacity; });
              edgeOnRimSprites.forEach(function (rimSprite) { rimSprite.material.opacity = (rimSprite.material.userData.baseOpacity || 0.2) * edgeOnFactor * (currentObserveMode === 'infrared' ? 1.24 : currentObserveMode === 'visible' ? 1 : 0.44); });
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
              bloomModeStrength = (currentObserveMode === 'xray' ? 1.85 : currentObserveMode === 'infrared' ? 1.5 : currentObserveMode === 'radio' ? 1.05 : currentObserveMode === 'gravity' ? 1.24 : 1.35) * morphologyVisual.bloomStrength;
              bloomModeThreshold = Math.min(0.98, (currentObserveMode === 'xray' ? 0.9 : currentObserveMode === 'infrared' ? 0.82 : currentObserveMode === 'radio' ? 0.87 : currentObserveMode === 'gravity' ? 0.88 : resolvedQuality === 'cinematic' ? 0.84 : resolvedQuality === 'high' ? 0.87 : 0.9) + morphologyVisual.bloomThreshold);
              if (composer && canvasEl._bloomPass) { canvasEl._bloomPass.strength = bloomModeStrength; canvasEl._bloomPass.threshold = bloomModeThreshold; }
            }
            canvasEl._setObserveMode = setObserveMode;
            setObserveMode(currentObserveMode);
            observeTransitionReady = true;



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

              var snCv = document.createElement('canvas'); snCv.setAttribute('aria-hidden', 'true'); snCv.width = 160; snCv.height = 160;

              var sc = snCv.getContext('2d');
              sc = upscaleGalaxyCanvas(snCv, sc);

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

              var snTex = tuneGalaxyTexture(new THREE.CanvasTexture(snCv));

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

              var labelCv = document.createElement('canvas'); labelCv.setAttribute('aria-hidden', 'true'); labelCv.width = 256; labelCv.height = 64;
              var labelCtx = labelCv.getContext('2d');
              labelCtx = upscaleGalaxyCanvas(labelCv, labelCtx);
              labelCtx.fillStyle = 'rgba(15,23,42,0.72)'; labelCtx.fillRect(24, 10, 208, 38);
              labelCtx.strokeStyle = 'rgba(251,191,36,0.8)'; labelCtx.strokeRect(24.5, 10.5, 207, 37);
              labelCtx.font = 'bold 20px sans-serif'; labelCtx.textAlign = 'center';
              labelCtx.fillStyle = '#fef3c7'; labelCtx.fillText('SUPERNOVA', 128, 35);
              var labelTex = tuneGalaxyTexture(new THREE.CanvasTexture(labelCv));
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

              var dist = getMorphologyAgeDistribution(getAgeDistribution(age));

              activeAgeDistribution = dist;
              ageEvolutionTarget = getGalaxyEvolutionForAge(age);

              var cumul = [], cum2 = 0, tot = dist.reduce(function (a, b) { return a + b; }, 0);

              for (var t2 = 0; t2 < dist.length; t2++) { cum2 += dist[t2]; cumul.push(cum2 / tot * 100); }

              var colors = starPoints.geometry.attributes.color.array;

              var types = starPoints.geometry.attributes.aStarType.array;

              // Seven colours, resolved once — not one THREE.Color per star per call
              // (this runs on every time-lapse tick with up to 100,000 stars).
              var ageColors = STAR_TYPES.map(function (stt) { return new THREE.Color(stt.color); });

              for (var si = 0; si < starData.length; si++) {

                var roll2 = ((si * 7919 + 1) % 10000) / 100;

                var ti2 = 6;

                for (var tt = 0; tt < cumul.length; tt++) { if (roll2 < cumul[tt]) { ti2 = tt; break; } }

                var stc = ageColors[ti2];

                colors[si * 3] = stc.r; colors[si * 3 + 1] = stc.g; colors[si * 3 + 2] = stc.b;

                types[si] = ti2;

              }

              starPoints.geometry.attributes.color.needsUpdate = true;

              starPoints.geometry.attributes.aStarType.needsUpdate = true;

              var nebOp = 0.2 + 0.5 * Math.max(0, 1 - age / 10);

              nebulaSprites.forEach(function (s) { s.material.opacity = nebOp; });

            };



            // Orbit controls: pointer events keep mouse, pen, and touch interaction consistent.

            var isDragging = false, prevX = 0, prevY = 0, dragDistance = 0, suppressGalaxyClick = false;
            var activeGalaxyPointers = {}, pinchStartDistance = 0, pinchStartRadius = 1.2;
            var autoRotate = canvasEl.getAttribute('data-auto-rotate') !== 'false' && !prefersReducedMotion;
            var tourActive = canvasEl.getAttribute('data-tour-active') === 'true' && !prefersReducedMotion;
            var tourStart = Date.now(), tourLastStage = -1;
            var hudHidden = canvasEl.getAttribute('data-hud-hidden') === 'true';
            var orientationEl = null, lastOrientationLabel = '';

            var spherical = { theta: Math.PI * 0.1, phi: Math.PI * 0.35, r: 1.2 };
            var cameraLookTarget = new THREE.Vector3(0, 0, 0);
            var cameraLookGoal = new THREE.Vector3(0, 0, 0);
            var liveScaleEl = null, lastLiveScaleText = '', scaleRegimeEl = null, lastScaleRegime = '';

            function setCanvasStatus(message) {
              var statusEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-status]');
              if (statusEl) statusEl.textContent = message;
              if (canvasEl._galaxyStatusTimer) clearTimeout(canvasEl._galaxyStatusTimer);
              canvasEl._galaxyStatusTimer = setTimeout(function () {
                var announcerEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-announcer]');
                if (announcerEl && announcerEl.textContent !== message) announcerEl.textContent = message;
              }, 180);
            }

            function onGalaxyReducedMotionChange(event) {
              prefersReducedMotion = !!(event && event.matches);
              if (prefersReducedMotion) {
                autoRotate = false; tourActive = false; warpTween = null;
                cinematicMotion.warp = 0; cinematicMotion.shock = 0; cinematicMotion.aperture = 0;
                if (canvasEl._onMotionPreferenceChange) canvasEl._onMotionPreferenceChange(true);
                setCanvasStatus('Motion paused to honor your reduced-motion preference');
              } else {
                setCanvasStatus('Reduced-motion preference is off; animation remains paused until you resume it');
              }
            }
            if (reducedMotionQuery) {
              if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', onGalaxyReducedMotionChange);
              else if (reducedMotionQuery.addListener) reducedMotionQuery.addListener(onGalaxyReducedMotionChange);
            }

            function updateCamera() {

              camera.position.x = spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta);

              camera.position.y = spherical.r * Math.cos(spherical.phi);

              camera.position.z = spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta);

              camera.lookAt(cameraLookTarget.x, cameraLookTarget.y, cameraLookTarget.z);
              if (starShaderMat && starShaderMat.uniforms && starShaderMat.uniforms.uCameraDir) starShaderMat.uniforms.uCameraDir.value.copy(camera.position).normalize();
              foregroundParallaxStars.forEach(function (foregroundStarSprite) { var foregroundData = foregroundStarSprite.userData || {}, parallax = foregroundData.parallaxFactor || 0.02; foregroundStarSprite.position.set((foregroundData.baseX || 0) - camera.position.x * parallax, (foregroundData.baseY || 0) - camera.position.y * parallax * 0.72, (foregroundData.baseZ || 0) - camera.position.z * parallax); });
              if (foregroundDepthGroup) {
                foregroundDepthGroup.position.x = -camera.position.x * 0.018;
                foregroundDepthGroup.position.y = -camera.position.y * 0.012;
                foregroundDepthGroup.position.z = -camera.position.z * 0.018;
                foregroundDepthGroup.rotation.y = -spherical.theta * 0.028;
              }

              var cameraTilt = Math.abs(Math.cos(spherical.phi));
              dustBacklightAngleFactor = Math.max(0, Math.min(1, 1 - Math.abs(cameraTilt - 0.34) / 0.34));
              edgeOnFactor = Math.max(0, Math.min(1, (0.58 - cameraTilt) / 0.46));
              edgeOnDustSilhouette.visible = edgeOnFactor > 0.012;
              edgeOnSilhouetteSprites.forEach(function (silhouetteSprite) { silhouetteSprite.material.opacity = (silhouetteSprite.material.userData.baseOpacity || 0.22) * edgeOnFactor * edgeOnModeOpacity; });
              edgeOnRimSprites.forEach(function (rimSprite) { rimSprite.material.opacity = (rimSprite.material.userData.baseOpacity || 0.2) * edgeOnFactor * (currentObserveMode === 'infrared' ? 1.24 : currentObserveMode === 'visible' ? 1 : 0.44); });

              if (!hudHidden) {
                if (!orientationEl || !orientationEl.isConnected) orientationEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-orientation]');
                var tilt = cameraTilt;
                var orientationLabel = tilt > 0.72 ? 'Face-on view' : tilt < 0.22 ? 'Edge-on view' : 'Angled view';
                if (orientationEl && orientationLabel !== lastOrientationLabel) { orientationEl.textContent = orientationLabel; lastOrientationLabel = orientationLabel; }
                if (!liveScaleEl || !liveScaleEl.isConnected) liveScaleEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-live-scale-value]');
                var fieldSpanKpc = 2 * spherical.r * Math.tan(camera.fov * Math.PI / 360) * 15;
                var liveScaleText = '~' + (fieldSpanKpc < 10 ? fieldSpanKpc.toFixed(1) : Math.round(fieldSpanKpc)) + ' kpc field';
                if (liveScaleEl && liveScaleText !== lastLiveScaleText) { liveScaleEl.textContent = liveScaleText; lastLiveScaleText = liveScaleText; }
                if (!scaleRegimeEl || !scaleRegimeEl.isConnected) scaleRegimeEl = canvasEl.parentElement && canvasEl.parentElement.querySelector('[data-galaxy-scale-regime]');
                var scaleRegime = spherical.r < 0.42 ? 'Nuclear region' : spherical.r < 0.82 ? 'Spiral-arm detail' : spherical.r > 1.72 ? 'Halo context' : 'Galactic structure';
                if (scaleRegimeEl && scaleRegime !== lastScaleRegime) { scaleRegimeEl.textContent = scaleRegime; lastScaleRegime = scaleRegime; }
              }

            }

            updateCamera();

            canvasEl._galaxyOrbit = spherical;

            canvasEl._galaxyUpdateCam = updateCamera;

            function getPinchDistance() {
              var pointerKeys = Object.keys(activeGalaxyPointers);
              if (pointerKeys.length < 2) return 0;
              var a = activeGalaxyPointers[pointerKeys[0]], b = activeGalaxyPointers[pointerKeys[1]];
              return Math.hypot(a.x - b.x, a.y - b.y);
            }

            function onGalDown(e) {
              if (e.button !== undefined && e.button !== 0) return;
              activeGalaxyPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
              if (tourActive) { tourActive = false; if (canvasEl._onTourStateChange) canvasEl._onTourStateChange(false); }
              isDragging = true; dragDistance = 0; suppressGalaxyClick = false; warpTween = null;
              prevX = e.clientX; prevY = e.clientY;
              if (Object.keys(activeGalaxyPointers).length === 2) { pinchStartDistance = getPinchDistance(); pinchStartRadius = spherical.r; }
              canvasEl.style.cursor = 'grabbing';
              if (canvasEl.setPointerCapture && e.pointerId !== undefined) canvasEl.setPointerCapture(e.pointerId);
            }

            function onGalMove(e) {

              if (!isDragging || !activeGalaxyPointers[e.pointerId]) return;
              activeGalaxyPointers[e.pointerId] = { x: e.clientX, y: e.clientY };
              if (Object.keys(activeGalaxyPointers).length > 1) {
                var pinchDistance = getPinchDistance();
                if (pinchStartDistance > 0 && pinchDistance > 0) spherical.r = Math.max(0.2, Math.min(3, pinchStartRadius * pinchStartDistance / pinchDistance));
                dragDistance += 6; suppressGalaxyClick = true; updateCamera(); return;
              }

              var dx = e.clientX - prevX, dy = e.clientY - prevY;
              dragDistance += Math.abs(dx) + Math.abs(dy);
              spherical.theta += dx * 0.005;

              spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - dy * 0.005));

              prevX = e.clientX; prevY = e.clientY; updateCamera();

            }

            function onGalUp(e) {
              if (e && e.pointerId !== undefined) delete activeGalaxyPointers[e.pointerId];
              isDragging = Object.keys(activeGalaxyPointers).length > 0;
              suppressGalaxyClick = suppressGalaxyClick || dragDistance > 5;
              canvasEl.style.cursor = isDragging ? 'grabbing' : 'grab';
              if (canvasEl.releasePointerCapture && e && e.pointerId !== undefined && canvasEl.hasPointerCapture && canvasEl.hasPointerCapture(e.pointerId)) canvasEl.releasePointerCapture(e.pointerId);
              var remainingKeys = Object.keys(activeGalaxyPointers);
              if (remainingKeys.length === 1) { var remaining = activeGalaxyPointers[remainingKeys[0]]; prevX = remaining.x; prevY = remaining.y; }
            }

            function onGalWheel(e) { e.preventDefault(); spherical.r = Math.max(0.2, Math.min(3, spherical.r * (e.deltaY > 0 ? 1.1 : 0.9))); updateCamera(); setCanvasStatus('Zoom ' + Math.round(120 / spherical.r) + '%'); }

            canvasEl.addEventListener('pointerdown', onGalDown);

            canvasEl.addEventListener('pointermove', onGalMove);

            canvasEl.addEventListener('pointerup', onGalUp);

            canvasEl.addEventListener('pointercancel', onGalUp);

            canvasEl.addEventListener('wheel', onGalWheel, { passive: false });



            // Raycaster and a camera-facing focus reticle make selections easy to follow.

            var raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold = 0.02;

            var mouse = new THREE.Vector2();
            var selectionCanvas = document.createElement('canvas'); selectionCanvas.setAttribute('aria-hidden', 'true'); selectionCanvas.width = 128; selectionCanvas.height = 128;
            var selectionCtx = selectionCanvas.getContext('2d');
              selectionCtx = upscaleGalaxyCanvas(selectionCanvas, selectionCtx);
            selectionCtx.translate(64, 64);
            selectionCtx.strokeStyle = 'rgba(165,243,252,0.98)'; selectionCtx.lineWidth = 4; selectionCtx.shadowColor = '#67e8f9'; selectionCtx.shadowBlur = 12;
            for (var selectionArc = 0; selectionArc < 4; selectionArc++) {
              selectionCtx.beginPath(); selectionCtx.arc(0, 0, 43, selectionArc * Math.PI * 0.5 + 0.14, selectionArc * Math.PI * 0.5 + 0.82); selectionCtx.stroke();
            }
            selectionCtx.fillStyle = 'rgba(255,255,255,0.95)'; selectionCtx.beginPath(); selectionCtx.arc(0, 0, 3, 0, Math.PI * 2); selectionCtx.fill();
            var selectionTexture = tuneGalaxyTexture(new THREE.CanvasTexture(selectionCanvas));
            var selectionMaterial = new THREE.SpriteMaterial({ map: selectionTexture, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
            var selectionMarker = new THREE.Sprite(selectionMaterial); selectionMarker.visible = false; selectionMarker.renderOrder = 20; scene.add(selectionMarker);
            var depthReticleCanvas = document.createElement('canvas'); depthReticleCanvas.setAttribute('aria-hidden', 'true'); depthReticleCanvas.width = 192; depthReticleCanvas.height = 192;
            var depthReticleCtx = upscaleGalaxyCanvas(depthReticleCanvas, depthReticleCanvas.getContext('2d')); depthReticleCtx.translate(96, 96);
            depthReticleCtx.strokeStyle = 'rgba(255,255,255,0.86)'; depthReticleCtx.lineWidth = 3; depthReticleCtx.lineCap = 'round'; depthReticleCtx.shadowColor = '#a5f3fc'; depthReticleCtx.shadowBlur = 9;
            for (var depthTick = 0; depthTick < 8; depthTick++) { var depthTickAngle = depthTick / 8 * Math.PI * 2; depthReticleCtx.beginPath(); depthReticleCtx.moveTo(Math.cos(depthTickAngle) * 61, Math.sin(depthTickAngle) * 61); depthReticleCtx.lineTo(Math.cos(depthTickAngle) * (depthTick % 2 ? 69 : 74), Math.sin(depthTickAngle) * (depthTick % 2 ? 69 : 74)); depthReticleCtx.stroke(); }
            for (var depthCorner = 0; depthCorner < 4; depthCorner++) { depthReticleCtx.save(); depthReticleCtx.rotate(depthCorner * Math.PI * 0.5); depthReticleCtx.beginPath(); depthReticleCtx.moveTo(34, -52); depthReticleCtx.lineTo(52, -52); depthReticleCtx.lineTo(52, -34); depthReticleCtx.stroke(); depthReticleCtx.restore(); }
            depthReticleCtx.setLineDash([5, 8]); depthReticleCtx.globalAlpha = 0.42; depthReticleCtx.beginPath(); depthReticleCtx.arc(0, 0, 66, 0, Math.PI * 2); depthReticleCtx.stroke();
            var selectionDepthTexture = tuneGalaxyTexture(new THREE.CanvasTexture(depthReticleCanvas));
            var selectionDepthMaterial = new THREE.SpriteMaterial({ map: selectionDepthTexture, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
            var selectionHalo = new THREE.Sprite(selectionDepthMaterial); selectionHalo.name = 'selectionDepthReticle'; selectionHalo.visible = false; selectionHalo.renderOrder = 19; scene.add(selectionHalo);
            var selectionTarget = null;
            var measurementRulerGroup = new THREE.Group(); measurementRulerGroup.name = 'galactocentricMeasurementRuler'; measurementRulerGroup.visible = false; scene.add(measurementRulerGroup);
            var measurementRulerGeometry = new THREE.BufferGeometry(); measurementRulerGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
            var measurementRulerMaterial = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
            var measurementRulerLine = new THREE.Line(measurementRulerGeometry, measurementRulerMaterial); measurementRulerLine.renderOrder = 18; measurementRulerGroup.add(measurementRulerLine);
            var measurementTickSprites = [];
            for (var mt = 1; mt <= 3; mt++) { var tickMaterial = new THREE.SpriteMaterial({ map: selectionTexture, color: 0x67e8f9, transparent: true, opacity: 0.34, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }); var tickSprite = new THREE.Sprite(tickMaterial); tickSprite.scale.set(0.018, 0.018, 1); tickSprite.userData.fraction = mt / 4; measurementRulerGroup.add(tickSprite); measurementTickSprites.push(tickSprite); }
            function updateMeasurementRuler(position) {
              if (!position || !measurementRulerGroup.visible) return;
              var rulerPosition = measurementRulerGeometry.attributes.position;
              rulerPosition.setXYZ(0, 0, position.y, 0); rulerPosition.setXYZ(1, position.x, position.y, position.z); rulerPosition.needsUpdate = true;
              measurementTickSprites.forEach(function (tick) { var fraction = tick.userData.fraction; tick.position.set(position.x * fraction, position.y, position.z * fraction); });
            }

            var orbitalMechanicsGroup = new THREE.Group(); orbitalMechanicsGroup.name = 'selectedStarOrbitalMechanics'; orbitalMechanicsGroup.visible = false; scene.add(orbitalMechanicsGroup);
            var ORBIT_GUIDE_SEGMENTS = resolvedQuality === 'cinematic' ? 192 : resolvedQuality === 'high' ? 144 : 96;
            var orbitGuideGeometry = new THREE.BufferGeometry(); orbitGuideGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ORBIT_GUIDE_SEGMENTS + 1) * 3), 3));
            var orbitGuideMaterial = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
            var orbitGuideLine = new THREE.Line(orbitGuideGeometry, orbitGuideMaterial); orbitGuideLine.renderOrder = 17; orbitalMechanicsGroup.add(orbitGuideLine);
            var ORBIT_WAKE_POINTS = resolvedQuality === 'cinematic' ? 32 : 22;
            var orbitWakeGeometry = new THREE.BufferGeometry(); orbitWakeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORBIT_WAKE_POINTS * 3), 3));
            var orbitWakeMaterial = new THREE.LineBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.58, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
            var orbitWakeLine = new THREE.Line(orbitWakeGeometry, orbitWakeMaterial); orbitWakeLine.renderOrder = 19; orbitalMechanicsGroup.add(orbitWakeLine);
            function makeOrbitalVector(color, name) {
              var lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
              var lineMaterial = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.92, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
              var line = new THREE.Line(lineGeometry, lineMaterial); line.name = name + 'Line'; line.renderOrder = 20; orbitalMechanicsGroup.add(line);
              var tipGeometry = new THREE.BufferGeometry(); tipGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.034, 0, 0, -0.022, 0, 0.018, -0.022, 0, -0.018]), 3));
              var tipMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.96, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
              var tip = new THREE.Mesh(tipGeometry, tipMaterial); tip.name = name + 'Arrowhead'; tip.renderOrder = 21; orbitalMechanicsGroup.add(tip);
              return { geometry: lineGeometry, line: line, tip: tip };
            }
            var velocityVector = makeOrbitalVector(0x22d3ee, 'tangentialVelocity');
            var gravityVector = makeOrbitalVector(0xf472b6, 'inwardGravity');
            var orbitalGuideRadius = -1, orbitalGuideY = 0;
            function setOrbitalVector(vector, start, end, directionAngle) {
              var positions = vector.geometry.attributes.position;
              positions.setXYZ(0, start.x, start.y, start.z); positions.setXYZ(1, end.x, end.y, end.z); positions.needsUpdate = true;
              vector.tip.position.copy(end); vector.tip.rotation.y = -directionAngle;
            }
            function updateOrbitalMechanics(position, omega, elapsedTime) {
              if (!position || !orbitalMechanicsGroup.visible) return;
              var radius = Math.sqrt(position.x * position.x + position.z * position.z);
              if (radius < 0.02) { orbitalMechanicsGroup.visible = false; return; }
              if (Math.abs(radius - orbitalGuideRadius) > 0.0001 || Math.abs(position.y - orbitalGuideY) > 0.0001) {
                orbitalGuideRadius = radius; orbitalGuideY = position.y;
                var guidePositions = orbitGuideGeometry.attributes.position;
                for (var gi = 0; gi <= ORBIT_GUIDE_SEGMENTS; gi++) { var ga = gi / ORBIT_GUIDE_SEGMENTS * Math.PI * 2; guidePositions.setXYZ(gi, Math.cos(ga) * radius, position.y, Math.sin(ga) * radius); }
                guidePositions.needsUpdate = true;
              }
              var angle = Math.atan2(position.z, position.x);
              var wakePositions = orbitWakeGeometry.attributes.position;
              var wakeSpan = 0.78;
              for (var wi = 0; wi < ORBIT_WAKE_POINTS; wi++) { var wf = wi / Math.max(1, ORBIT_WAKE_POINTS - 1); var wa = angle - wakeSpan * (1 - wf); wakePositions.setXYZ(wi, Math.cos(wa) * radius, position.y, Math.sin(wa) * radius); }
              wakePositions.needsUpdate = true;
              var tangentX = -position.z / radius, tangentZ = position.x / radius;
              var inwardX = -position.x / radius, inwardZ = -position.z / radius;
              var visualSpeed = Math.abs(omega * radius);
              var velocityLength = 0.14 + Math.min(0.16, visualSpeed * 4.4);
              var gravityLength = 0.16;
              var velocityEnd = new THREE.Vector3(position.x + tangentX * velocityLength, position.y, position.z + tangentZ * velocityLength);
              var gravityEnd = new THREE.Vector3(position.x + inwardX * gravityLength, position.y, position.z + inwardZ * gravityLength);
              setOrbitalVector(velocityVector, position, velocityEnd, Math.atan2(tangentZ, tangentX));
              setOrbitalVector(gravityVector, position, gravityEnd, Math.atan2(inwardZ, inwardX));
              var guidePulse = 0.76 + 0.24 * Math.sin(elapsedTime * 2.1);
              orbitGuideMaterial.opacity = 0.2 + guidePulse * 0.12;
              orbitWakeMaterial.opacity = 0.42 + guidePulse * 0.24;
              var velocityTipScale = 0.88 + guidePulse * 0.18, gravityTipScale = 0.88 + (1 - guidePulse) * 0.18; velocityVector.tip.scale.set(velocityTipScale, velocityTipScale, velocityTipScale); gravityVector.tip.scale.set(gravityTipScale, gravityTipScale, gravityTipScale);
            }

            var keyboardStarIndex = -1;

            function focusSelection(kind, data, position) {
              selectionTarget = { kind: kind, data: data, x: position.x, y: position.y, z: position.z };
              selectionMarker.position.copy(position); selectionMarker.scale.set(0.082, 0.082, 1); selectionMarker.visible = true;
              selectionHalo.position.copy(position); selectionHalo.scale.set(0.118, 0.118, 1); selectionHalo.visible = true;
              var selectionColor = kind === 'star' && data.type && data.type.color ? data.type.color : data.color || '#a5b4fc';
              if (selectionMarker.material && selectionMarker.material.color) selectionMarker.material.color.set(selectionColor);
              if (selectionHalo.material && selectionHalo.material.color) selectionHalo.material.color.set(selectionColor);
              cameraLookGoal.set(position.x * 0.55, position.y * 0.5, position.z * 0.55);
              if (prefersReducedMotion) cameraLookTarget.copy(cameraLookGoal);
              measurementRulerGroup.visible = kind === 'star'; orbitalMechanicsGroup.visible = kind === 'star'; if (measurementRulerGroup.visible) { updateMeasurementRuler(position); updateOrbitalMechanics(position, 0.02, 0); }
              var label = kind === 'star' ? ((data.type && data.type.label) || 'Star') : (data.name || 'Nebula');
              setCanvasStatus('Focused on ' + label + ' · drag to orbit around it');
            }

            function clearGalaxySelection() {
              selectionTarget = null; selectionMarker.visible = false; selectionHalo.visible = false; measurementRulerGroup.visible = false; orbitalMechanicsGroup.visible = false;
              cameraLookGoal.set(0, 0, 0);
              if (prefersReducedMotion) { cameraLookTarget.set(0, 0, 0); updateCamera(); }
              setCanvasStatus('Drag or use arrows to orbit · scroll, pinch, or plus and minus to zoom · brackets select stars');
              if (canvasEl._onClearSelection) canvasEl._onClearSelection();
            }

            canvasEl._galaxyClearSelection = clearGalaxySelection;
            canvasEl._galaxyCycleStar = function (direction) {
              if (!starData.length) return;
              var stride = Math.max(1, Math.floor(starData.length / 47));
              keyboardStarIndex = (keyboardStarIndex + (direction < 0 ? -stride : stride) + starData.length) % starData.length;
              var keyboardStar = starData[keyboardStarIndex];
              focusSelection('star', keyboardStar, new THREE.Vector3(keyboardStar.x, keyboardStar.y, keyboardStar.z));
              if (canvasEl._onSelectStar) canvasEl._onSelectStar(keyboardStar);
              setCanvasStatus('Keyboard focus: ' + ((keyboardStar.type && keyboardStar.type.label) || 'Star') + ' · [ and ] choose another star · Escape clears');
            };

            function onGalClick(e) {

              if (suppressGalaxyClick) { suppressGalaxyClick = false; return; }
              var rect = canvasEl.getBoundingClientRect();

              mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

              mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, camera);

              var hits = raycaster.intersectObject(starPoints);

              if (hits.length > 0 && starData[hits[0].index]) {
                var starHit = starData[hits[0].index];
                focusSelection('star', starHit, new THREE.Vector3(starHit.x, starHit.y, starHit.z));
                if (canvasEl._onSelectStar) canvasEl._onSelectStar(starHit);
                return;
              }

              var nebHits = raycaster.intersectObjects(nebulaSprites);

              if (nebHits.length > 0) {
                focusSelection('nebula', nebHits[0].object.userData, nebHits[0].object.position);
                if (canvasEl._onSelectNebula) canvasEl._onSelectNebula(nebHits[0].object.userData);
              } else {
                clearGalaxySelection();
              }

            }

            canvasEl.addEventListener('click', onGalClick);

            // Cinematic warp: ease the camera to the target over ~1.6s instead of teleporting.

            var warpTween = null;

            canvasEl._galaxyWarp = function (wp) {

              cameraLookGoal.set(0, 0, 0);
              if (prefersReducedMotion) cameraLookTarget.set(0, 0, 0);
              var toTheta = Math.atan2(wp.x, wp.z) || 0.1;

              var toPhi = Math.acos(Math.max(-0.99, Math.min(0.99, wp.y / (Math.hypot(wp.x, wp.y, wp.z) || 1))));

              var toR = wp.zoom || 1;

              var dTheta = toTheta - spherical.theta;

              if (prefersReducedMotion) { spherical.theta = toTheta; spherical.phi = toPhi; spherical.r = toR; updateCamera(); setCanvasStatus('Viewpoint updated'); return; }

              while (dTheta > Math.PI) dTheta -= Math.PI * 2;

              while (dTheta < -Math.PI) dTheta += Math.PI * 2;

              warpTween = { t0: spherical.theta, p0: spherical.phi, r0: spherical.r, dt: dTheta, dp: toPhi - spherical.phi, dr: toR - spherical.r, start: Date.now(), dur: 1600 };
              cinematicMotion.warp = 1;
              cinematicMotion.shock = 0;
              cinematicMotion.aperture = 1;
              warpStreakGroup.visible = true;

            };

            canvasEl._galaxyResetView = function () {
              cameraLookGoal.set(0, 0, 0);
              if (prefersReducedMotion) { cameraLookTarget.set(0, 0, 0); spherical.theta = Math.PI * 0.1; spherical.phi = Math.PI * 0.35; spherical.r = 1.2; updateCamera(); setCanvasStatus('Overview restored'); return; }
              var dTheta = Math.PI * 0.1 - spherical.theta;
              while (dTheta > Math.PI) dTheta -= Math.PI * 2;
              while (dTheta < -Math.PI) dTheta += Math.PI * 2;
              warpTween = { t0: spherical.theta, p0: spherical.phi, r0: spherical.r, dt: dTheta, dp: Math.PI * 0.35 - spherical.phi, dr: 1.2 - spherical.r, start: Date.now(), dur: 720, suppressShock: true };
              cinematicMotion.aperture = 0.45; setCanvasStatus('Returning to the overview');
            };
            canvasEl._galaxyZoom = function (direction) {
              spherical.r = Math.max(0.2, Math.min(3, spherical.r * (direction === 'in' ? 0.82 : 1.22)));
              updateCamera(); setCanvasStatus('Zoom ' + Math.round(120 / spherical.r) + '%');
            };
            canvasEl._galaxyGetAdaptiveVisualState = function () {
              return {
                distance: spherical.r,
                pointScale: starShaderMat.uniforms.uZoomPointScale.value,
                opacity: starShaderMat.uniforms.uZoomOpacity.value,
                exposure: renderer.toneMappingExposure,
                bloomStrength: composer && canvasEl._bloomPass ? canvasEl._bloomPass.strength : 0,
                bloomThreshold: composer && canvasEl._bloomPass ? canvasEl._bloomPass.threshold : 0
              };
            };
            canvasEl._galaxySetAutoRotate = function (enabled) { autoRotate = enabled !== false && !prefersReducedMotion; if (enabled && prefersReducedMotion && canvasEl._onMotionPreferenceChange) canvasEl._onMotionPreferenceChange(true); setCanvasStatus(autoRotate ? 'Gentle auto-rotation on' : prefersReducedMotion ? 'Auto-rotation remains off because reduced motion is enabled' : 'Auto-rotation paused'); };
            canvasEl._galaxySetTour = function (enabled) {
              if (prefersReducedMotion && enabled) { tourActive = false; setCanvasStatus('Cinematic tour is paused by reduced-motion settings'); if (canvasEl._onTourStateChange) canvasEl._onTourStateChange(false); return; }
              tourActive = enabled === true; tourStart = Date.now(); tourLastStage = -1; warpTween = null;
              setCanvasStatus(tourActive ? 'Grand Tour · Galactic overview' : 'Cinematic tour stopped');
            };
            canvasEl._galaxySetHudHidden = function (hidden) { hudHidden = hidden === true; if (!hudHidden) { orientationEl = null; lastOrientationLabel = ''; requestAnimationFrame(function () { if (canvasEl.isConnected) updateCamera(); }); } };
            canvasEl._galaxyToggleFullscreen = function () {
              var canvasFrame = canvasEl.parentElement;
              var frame = canvasFrame && canvasFrame.parentElement ? canvasFrame.parentElement : canvasFrame;
              if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); return; }
              if (!frame || !frame.requestFullscreen) return;
              var previousHeight = frame.style.height;
              var previousOverflow = frame.style.overflow;
              var previousPadding = frame.style.padding;
              var previousBackground = frame.style.background;
              var previousCanvasHeight = canvasFrame ? canvasFrame.style.height : '';
              frame.style.height = '100vh';
              frame.style.overflow = 'auto'; frame.style.padding = '12px'; frame.style.background = '#020617';
              if (canvasFrame) canvasFrame.style.height = 'calc(100vh - 24px)';
              var restoreFullscreenHeight = function () { if (!document.fullscreenElement) { frame.style.height = previousHeight; frame.style.overflow = previousOverflow; frame.style.padding = previousPadding; frame.style.background = previousBackground; if (canvasFrame) canvasFrame.style.height = previousCanvasHeight; document.removeEventListener('fullscreenchange', restoreFullscreenHeight); canvasEl._galaxyFullscreenRestore = null; } };
              canvasEl._galaxyFullscreenRestore = restoreFullscreenHeight;
              document.addEventListener('fullscreenchange', restoreFullscreenHeight);
              var fullscreenRequest = frame.requestFullscreen();
              if (fullscreenRequest && fullscreenRequest.catch) fullscreenRequest.catch(function () { frame.style.height = previousHeight; frame.style.overflow = previousOverflow; frame.style.padding = previousPadding; frame.style.background = previousBackground; if (canvasFrame) canvasFrame.style.height = previousCanvasHeight; document.removeEventListener('fullscreenchange', restoreFullscreenHeight); });
            };

            var animId, startT = Date.now();

            // rAF is throttled by the browser when the TAB is hidden, but not when the
            // canvas is merely scrolled out of view — and this scene drives a bloom
            // composer over a six-figure particle count every frame. The black-hole
            // canvas in this same file already gates on intersection; the galaxy did
            // not, so it kept rendering at full rate while the learner read the panels
            // below it. Rendering resumes on the first frame after it reappears.
            var galaxyInView = true;
            var galaxyViewObserver = null;
            if (window.IntersectionObserver) {
              galaxyViewObserver = new IntersectionObserver(function (entries) {
                galaxyInView = !!(entries[0] && entries[0].isIntersecting);
              }, { rootMargin: '120px' });
              galaxyViewObserver.observe(canvasEl);
            }

            function animate() {

              // Guard against RAF leak after React unmounts the canvas — without this,
              // the loop keeps running 60×/s, holding refs to disposed three.js objects.
              if (!canvasEl.isConnected) { if (animId) cancelAnimationFrame(animId); return; }

              animId = requestAnimationFrame(animate);

              // Stay scheduled (so the view is live the moment it scrolls back) but do
              // no per-frame work while off-screen.
              if (!galaxyInView) return;

              var elapsed = prefersReducedMotion ? 0 : (Date.now() - startT) * 0.001;
              var motionStep = prefersReducedMotion ? 0 : 1;
              if (tourActive) {
                var tourFrames = [
                  { theta: Math.PI * 0.1, phi: Math.PI * 0.35, r: 1.25, label: 'Galactic overview' },
                  { theta: Math.PI * 0.46, phi: Math.PI * 0.43, r: 0.7, label: 'Spiral-arm stellar nurseries' },
                  { theta: Math.PI * 0.86, phi: Math.PI * 0.48, r: 0.34, label: 'Luminous galactic core' },
                  { theta: Math.PI * 1.3, phi: Math.PI * 0.5, r: 1.04, label: 'Dust-lane edge-on view' },
                  { theta: Math.PI * 1.78, phi: Math.PI * 0.27, r: 1.62, label: 'Dark-matter halo perspective' },
                  { theta: Math.PI * 2.12, phi: Math.PI * 0.39, r: 1.08, label: 'Companion galaxies and tidal streams' },
                  { theta: Math.PI * 2.1, phi: Math.PI * 0.35, r: 1.2, label: 'Return to the grand overview' }
                ];
                var tourDuration = 5200; var tourProgress = (Date.now() - tourStart) / tourDuration; var tourStage = Math.floor(tourProgress);
                if (tourStage >= tourFrames.length - 1) {
                  var tourEnd = tourFrames[tourFrames.length - 1]; spherical.theta = tourEnd.theta; spherical.phi = tourEnd.phi; spherical.r = tourEnd.r; updateCamera();
                  tourActive = false; setCanvasStatus('Grand Tour complete'); if (canvasEl._onTourStateChange) canvasEl._onTourStateChange(false);
                } else {
                  var tourLocal = tourProgress - tourStage; var tourEase = 0.5 - Math.cos(Math.PI * tourLocal) * 0.5; var tourFrom = tourFrames[tourStage], tourTo = tourFrames[tourStage + 1];
                  spherical.theta = tourFrom.theta + (tourTo.theta - tourFrom.theta) * tourEase; spherical.phi = tourFrom.phi + (tourTo.phi - tourFrom.phi) * tourEase; spherical.r = tourFrom.r + (tourTo.r - tourFrom.r) * tourEase; updateCamera();
                  if (tourStage !== tourLastStage) { tourLastStage = tourStage; setCanvasStatus('Grand Tour · ' + tourFrom.label); cinematicMotion.aperture = 0.55; }
                }
              } else if (warpTween) {

                var wk = Math.min(1, (Date.now() - warpTween.start) / warpTween.dur);

                var we = wk < 0.5 ? 4 * wk * wk * wk : 1 - Math.pow(-2 * wk + 2, 3) / 2;

                spherical.theta = warpTween.t0 + warpTween.dt * we;

                spherical.phi = warpTween.p0 + warpTween.dp * we;

                spherical.r = warpTween.r0 + warpTween.dr * we;

                updateCamera();

                if (wk > 0.72 && !warpTween.arrivalShock && !warpTween.suppressShock) {
                  warpTween.arrivalShock = true;
                  cinematicMotion.shock = 1;
                  warpShockGroup.visible = true;
                }

                if (wk >= 1) warpTween = null;

              } else if (!isDragging && autoRotate) { spherical.theta -= 0.0003; updateCamera(); }
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
              streamlineGroup.rotation.y += (0.00018 + cinematicMotion.warp * 0.001) * motionStep;
              streamlineGroup.children.forEach(function (line, idx) {
                if (!line.material || !line.material.userData) return;
                line.rotation.y += line.userData.drift * motionStep;
                var streamPulse = 0.74 + 0.26 * Math.sin(elapsed * 0.5 + line.material.userData.phase + idx * 0.4);
                line.material.opacity = Math.max(0, (line.material.userData.baseOpacity || 0.04) * streamlineGlow * streamPulse);
              });
              if (!prefersReducedMotion) spiralRidgeGroup.rotation.y += (0.000025 + cinematicMotion.warp * 0.00012) * motionStep;
              spiralRidgeMaterials.forEach(function (ridgeMaterial) { var ridgeData = ridgeMaterial.userData || {}; var ridgePulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.34 + ridgeData.phase); ridgeMaterial.opacity = (ridgeData.baseOpacity || 0.04) * spiralRidgeGlow * ageEvolutionVisual.structure * ridgePulse; });
              spiralSpurMaterials.forEach(function (spurMaterial) { var spurData = spurMaterial.userData || {}; var spurPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.29 + spurData.phase); spurMaterial.opacity = (spurData.baseOpacity || 0.03) * spiralRidgeGlow * ageEvolutionVisual.structure * spurPulse; });
              if (coreFlare && coreFlare.material) {
                coreFlare.material.opacity = Math.max(0, visualGlow.core + 0.08 * Math.sin(elapsed * 1.1));
                coreFlare.material.rotation = elapsed * 0.08;
                var coreScale = 1 + 0.035 * Math.sin(elapsed * 1.35);
                coreFlare.scale.set(coreFlareBaseScaleX * coreScale, coreFlareBaseScaleY * coreScale, 1);
              }
              coreLightBars.forEach(function (bar, idx) {
                var barPulse = 0.72 + 0.28 * Math.sin(elapsed * 0.95 + bar.userData.phase);
                bar.material.opacity = (bar.userData.baseOpacity || 0.18) * (visualGlow.core / 0.42) * barPulse;
                bar.material.rotation += (idx ? 0.0007 : -0.0005) * motionStep;
                var barScale = 1 + 0.05 * Math.sin(elapsed * 0.7 + idx);
                bar.scale.set(bar.userData.baseScaleX * barScale, bar.userData.baseScaleY, 1);
              });
              if (sparkleGroup.visible) {
                sparkleSprites.forEach(function (sp, idx) {
                  updateLuminousOverlayOrbit(sp, elapsed);
                  var phase = elapsed * (1.4 + (idx % 5) * 0.11) + sp.userData.phase;
                  var pulse = prefersReducedMotion ? 0.72 : 0.5 + 0.5 * Math.sin(phase);
                  var scalePulse = sp.userData.baseScale * (0.78 + pulse * 0.62);
                  sp.scale.set(scalePulse, scalePulse, 1);
                  sp.material.opacity = sp.userData.baseOpacity * (0.55 + pulse * 0.8);
                });
              }
              var luminousHaloDetailLevel = Math.max(0, Math.min(1, (1.54 - spherical.r) / 1.02));
              chromaticHaloGroup.visible = luminousHaloDetailLevel > 0.012 && chromaticHaloMode > 0.05;
              chromaticHaloSprites.forEach(function (haloSprite, haloIndex) { updateLuminousOverlayOrbit(haloSprite, elapsed); var haloData = haloSprite.userData || {}; var haloPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * (0.38 + haloIndex % 5 * 0.035) + haloData.phase); var haloScale = (haloData.baseScale || 0.05) * (0.96 + haloPulse * 0.08); haloSprite.scale.set(haloScale, haloScale, 1); haloSprite.material.opacity = (haloData.baseOpacity || 0.08) * luminousHaloDetailLevel * chromaticHaloMode * haloPulse; if (!prefersReducedMotion) haloSprite.material.rotation += (haloIndex % 2 ? -0.00018 : 0.00014); });
              var layeredHaloDepthLevel = Math.max(0, Math.min(1, (spherical.r - 0.5) / 1.26)) * (0.52 + edgeOnFactor * 0.48);
              layeredHaloScatteringGroup.visible = layeredHaloDepthLevel > 0.008 && haloScatteringMode > 0.05;
              haloScatteringCameraDirection.copy(camera.position).normalize();
              layeredHaloScatteringSprites.forEach(function (scatteringSprite) { var scatteringData = scatteringSprite.userData || {}, scatteringPulse = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 0.14 + scatteringData.phase), scatteringScaleWave = prefersReducedMotion ? 1 : 0.98 + 0.04 * Math.sin(elapsed * 0.11 + scatteringData.phase); scatteringSprite.position.copy(haloScatteringCameraDirection).multiplyScalar(scatteringData.depthOffset || 0); scatteringSprite.scale.set((scatteringData.baseScaleX || 2.2) * scatteringScaleWave, (scatteringData.baseScaleY || 1.4) * (2 - scatteringScaleWave), 1); scatteringSprite.material.opacity = (scatteringData.baseOpacity || 0.01) * layeredHaloDepthLevel * haloScatteringMode * (0.72 + ageEvolutionVisual.disturbance * 0.28) * scatteringPulse; if (!prefersReducedMotion) scatteringSprite.material.rotation += scatteringData.drift || 0; });

              foregroundGroup.rotation.y += (0.00034 + cinematicMotion.warp * 0.0024) * motionStep;
              foregroundGroup.rotation.x = Math.sin(elapsed * 0.16) * 0.018;
              var depthFocusBokeh = Math.max(0, Math.min(1, (1.35 - spherical.r) / 1.05));
              if (starShaderMat && starShaderMat.uniforms.uDepthOfField) { var focusDepthX = camera.position.x - cameraLookTarget.x, focusDepthY = camera.position.y - cameraLookTarget.y, focusDepthZ = camera.position.z - cameraLookTarget.z, focusDepthTarget = Math.max(0.2, Math.sqrt(focusDepthX * focusDepthX + focusDepthY * focusDepthY + focusDepthZ * focusDepthZ)), focusModeStrength = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.72 : currentObserveMode === 'xray' ? 0.42 : 0.3; starShaderMat.uniforms.uFocusDepth.value += (focusDepthTarget - starShaderMat.uniforms.uFocusDepth.value) * (prefersReducedMotion ? 1 : 0.08); starShaderMat.uniforms.uDepthOfField.value = depthFocusBokeh * focusModeStrength * (resolvedQuality === 'cinematic' ? 0.82 : resolvedQuality === 'high' ? 0.68 : 0.52); }
              foregroundSprites.forEach(function (fg, idx) {
                fg.material.rotation += fg.userData.drift * (1 + cinematicMotion.warp * 9) * motionStep;
                var fgPulse = 0.64 + 0.36 * Math.sin(elapsed * (0.55 + (idx % 4) * 0.08) + fg.userData.phase);
                fg.material.opacity = fg.userData.baseOpacity * cinematicMotion.foreground * fgPulse * (0.58 + depthFocusBokeh * 0.62);
                var fgScale = fg.userData.baseScale * (0.82 + fgPulse * 0.42 + cinematicMotion.warp * 1.4 + depthFocusBokeh * 0.18);
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

              deepFieldGroup.rotation.y += 0.00008 * motionStep;
              deepFieldGroup.children.forEach(function (obj, idx) {
                if (!obj.material || obj.material.opacity === undefined || !obj.userData) return;
                var base = obj.userData.baseOpacity || 0.08;
                obj.material.opacity = Math.max(0, base * (deepFieldGlow.galaxies / 0.28) * (0.86 + 0.14 * Math.sin(elapsed * 0.28 + (obj.userData.phase || idx))));
                if (obj.material.rotation !== undefined) obj.material.rotation += (0.00055 + idx * 0.000015) * motionStep;
              });
              cosmicFilamentGroup.rotation.y -= 0.00012 * motionStep;
              cosmicFilamentGroup.children.forEach(function (line, idx) {
                if (line.material && line.material.opacity !== undefined) line.material.opacity = Math.max(0, deepFieldGlow.filaments * (0.38 + 0.22 * Math.sin(elapsed * 0.5 + line.userData.phase)));
              });
              weakLensingVisual += (weakLensingTarget - weakLensingVisual) * (prefersReducedMotion ? 1 : 0.055);
              if (weakLensingGroup.visible) {
                weakLensingSources.forEach(function (source, idx) {
                  var su = source.userData || {};
                  var lensPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.72 + su.phase);
                  source.material.opacity = (su.baseOpacity || 0.2) * weakLensingVisual * lensPulse;
                  var shear = 1 + weakLensingVisual * (su.shear || 0.5);
                  source.scale.set((su.baseScaleX || 0.15) * shear, (su.baseScaleY || 0.04) * (1 - weakLensingVisual * 0.12), 1);
                  source.material.rotation = su.baseRotation + (prefersReducedMotion ? 0 : Math.sin(elapsed * 0.22 + idx) * 0.018);
                });
                weakLensingArcMats.forEach(function (material, idx) { material.opacity = weakLensingVisual * (0.17 + 0.08 * Math.sin(elapsed * 0.58 + idx * 0.9)); });
                if (weakLensingTarget === 0 && weakLensingVisual < 0.01) weakLensingGroup.visible = false;
              }
              var radioPolarizationDetailLevel = Math.max(0, Math.min(1, (2.05 - spherical.r) / 1.32));
              radioPolarizationGroup.visible = radioGroup.visible && radioPolarizationDetailLevel > 0.012;
              if (radioGroup.visible) {
                var velocityPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.86);
                if (dopplerVelocityFieldMaterial) dopplerVelocityFieldMaterial.opacity = 0.3 + velocityPulse * 0.08;
                if (dopplerVelocitySampleMaterial) dopplerVelocitySampleMaterial.opacity = 0.5 + velocityPulse * 0.2;
                if (radioPolarizationMaterial) radioPolarizationMaterial.opacity = (radioPolarizationMaterial.userData.baseOpacity || 0.48) * radioPolarizationDetailLevel * ageEvolutionVisual.structure * Math.max(0.42, ageEvolutionVisual.gas) * velocityPulse;
                faradayRibbonMaterials.forEach(function (faradayRibbonMaterial) { var faradayRibbonData = faradayRibbonMaterial.userData || {}, faradayRibbonPulse = prefersReducedMotion ? 1 : 0.84 + 0.16 * Math.sin(elapsed * 0.34 + faradayRibbonData.phase); faradayRibbonMaterial.opacity = (faradayRibbonData.baseOpacity || 0.065) * radioPolarizationDetailLevel * ageEvolutionVisual.structure * Math.max(0.45, ageEvolutionVisual.gas) * faradayRibbonPulse; });
                if (!prefersReducedMotion) faradayRibbonObjects.forEach(function (faradayRibbon) { faradayRibbon.rotation.y += faradayRibbon.userData.drift || 0; });
              }
              if (infraredGroup.visible) {
                infraredThermalMats.forEach(function (thermalMaterial) { var thermalData = thermalMaterial.userData || {}; var thermalPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.54 + thermalData.phase); thermalMaterial.opacity = (thermalData.baseOpacity || 0.12) * ageEvolutionVisual.gas * thermalPulse; });
                infraredThermalSprites.forEach(function (thermalSprite) { var thermalData = thermalSprite.userData || {}; if (!prefersReducedMotion) thermalSprite.material.rotation += thermalData.drift || 0; var thermalScalePulse = prefersReducedMotion ? 1 : 0.96 + 0.06 * Math.sin(elapsed * 0.42 + thermalData.phase); thermalSprite.scale.set((thermalData.baseScaleX || 0.1) * thermalScalePulse, (thermalData.baseScaleY || 0.04) * (2 - thermalScalePulse), 1); });
              }
              if (xrayGroup.visible) {
                xrayEventSprites.forEach(function (eventSprite) { var eventData = eventSprite.userData || {}; var eventPulse = prefersReducedMotion ? 0.9 : 0.52 + 0.48 * Math.sin(elapsed * eventData.frequency + eventData.phase); var eventScale = (eventData.baseScale || 0.02) * (0.82 + eventPulse * 0.58); eventSprite.scale.set(eventScale, eventScale, 1); eventSprite.material.opacity = (eventData.baseOpacity || 0.5) * ageEvolutionVisual.remnants * (0.52 + eventPulse * 0.55); });
                xrayShockShells.forEach(function (shockShell) { var shockData = shockShell.userData || {}; var shockPulse = prefersReducedMotion ? 0.65 : 0.5 + 0.5 * Math.sin(elapsed * shockData.expansion + shockData.phase); var shockScale = (shockData.baseScale || 0.03) * (0.86 + shockPulse * 0.34); shockShell.scale.set(shockScale, shockScale, shockScale); shockShell.material.opacity = (shockData.baseOpacity || 0.14) * ageEvolutionVisual.remnants * (0.95 - shockPulse * 0.48); if (!prefersReducedMotion) shockShell.rotation.z += 0.00018; });
                var xrayThermalDetailLevel = Math.max(0, Math.min(1, (1.95 - spherical.r) / 1.3));
                xrayThermalShellGroup.visible = xrayThermalDetailLevel > 0.012;
                xrayThermalShells.forEach(function (thermalShell) { var thermalShellData = thermalShell.userData || {}, thermalShellPulse = prefersReducedMotion ? 0.72 : 0.5 + 0.5 * Math.sin(elapsed * thermalShellData.expansion + thermalShellData.phase), thermalShellScale = (thermalShellData.baseScale || 0.04) * (0.9 + thermalShellPulse * 0.22); thermalShell.scale.setScalar(thermalShellScale); if (!prefersReducedMotion) thermalShell.rotation.z += 0.0001; });
                xrayThermalShellMaterials.forEach(function (thermalShellMaterial) { var thermalMaterialData = thermalShellMaterial.userData || {}, thermalBandPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * (0.34 + thermalMaterialData.band * 0.08) + thermalMaterialData.phase); thermalShellMaterial.opacity = (thermalMaterialData.baseOpacity || 0.13) * xrayThermalDetailLevel * ageEvolutionVisual.remnants * thermalBandPulse; });
                var xrayOutflowDetailLevel = Math.max(0.18, Math.min(1, (2.2 - spherical.r) / 1.45)), xrayOutflowEvolution = 0.48 + ageEvolutionVisual.gas * 0.28 + ageEvolutionVisual.remnants * 0.24;
                xrayOutflowMaterials.forEach(function (outflowMaterial) { var outflowData = outflowMaterial.userData || {}, outflowPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.46 + outflowData.phase); outflowMaterial.opacity = (outflowData.baseOpacity || 0.04) * xrayOutflowDetailLevel * xrayOutflowEvolution * outflowPulse; });
                xrayOutflowSprites.forEach(function (outflowSprite) { var outflowSpriteData = outflowSprite.userData || {}, outflowSpritePulse = prefersReducedMotion ? 0.86 : 0.56 + 0.44 * Math.sin(elapsed * outflowSpriteData.frequency + outflowSpriteData.phase), outflowSpriteScale = (outflowSpriteData.baseScale || 0.01) * (0.88 + outflowSpritePulse * 0.34); outflowSprite.scale.set(outflowSpriteScale, outflowSpriteScale, 1); outflowSprite.material.opacity = (outflowSpriteData.baseOpacity || 0.32) * xrayOutflowDetailLevel * xrayOutflowEvolution * (0.56 + outflowSpritePulse * 0.44); });
                if (!prefersReducedMotion) xrayNuclearOutflowGroup.rotation.y += 0.00022 * motionStep;              }

              ['gas', 'birth', 'thickness', 'disturbance', 'remnants', 'structure', 'normalized'].forEach(function (ageKey) { ageEvolutionVisual[ageKey] += (ageEvolutionTarget[ageKey] - ageEvolutionVisual[ageKey]) * (prefersReducedMotion ? 1 : 0.035); });
              volumetricVisual.dust += (volumetricTarget.dust - volumetricVisual.dust) * (prefersReducedMotion ? 1 : 0.045);
              volumetricVisual.birth += (volumetricTarget.birth - volumetricVisual.birth) * (prefersReducedMotion ? 1 : 0.045);
              volumetricVisual.satellite += (volumetricTarget.satellite - volumetricVisual.satellite) * (prefersReducedMotion ? 1 : 0.045);
              populationVisual.clusters += (populationTarget.clusters - populationVisual.clusters) * (prefersReducedMotion ? 1 : 0.045);
              populationVisual.thickDisk += (populationTarget.thickDisk - populationVisual.thickDisk) * (prefersReducedMotion ? 1 : 0.045);
              populationVisual.remnants += (populationTarget.remnants - populationVisual.remnants) * (prefersReducedMotion ? 1 : 0.045);
              if (openClusterMat) openClusterMat.opacity = (openClusterMat.userData.baseOpacity || 0.62) * populationVisual.clusters * ageEvolutionVisual.birth;
              var resolvedClusterDetailLevel = Math.max(0, Math.min(1, (1.04 - spherical.r) / 0.64));
              resolvedClusterGroup.visible = resolvedClusterDetailLevel > 0.012 && populationVisual.clusters > 0.05;
              resolvedClusterCoronas.forEach(function (coronaMesh) { var coronaData = coronaMesh.userData || {}, coronaPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.36 + coronaData.phase); coronaMesh.material.opacity = (coronaMesh.material.userData.baseOpacity || 0.12) * resolvedClusterDetailLevel * populationVisual.clusters * ageEvolutionVisual.birth * coronaPulse; if (!prefersReducedMotion) coronaMesh.rotation.z += coronaData.drift || 0; });
              resolvedClusterMembers.forEach(function (memberSprite) { var memberData = memberSprite.userData || {}, memberPulse = prefersReducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.92 + memberData.phase), memberScale = (memberData.baseScale || 0.006) * (0.9 + memberPulse * 0.18); memberSprite.scale.set(memberScale, memberScale, 1); memberSprite.material.opacity = (memberData.baseOpacity || 0.32) * resolvedClusterDetailLevel * populationVisual.clusters * ageEvolutionVisual.birth * memberPulse; });
              resolvedClusterBinaries.forEach(function (binarySprite) { var binaryData = binarySprite.userData || {}, binaryAngle = binaryData.phase + (prefersReducedMotion ? 0 : elapsed * binaryData.speed), binaryOffset = (binaryData.separation || 0.0024) * (binaryData.direction || 1), binaryPulse = prefersReducedMotion ? 1 : 0.76 + 0.24 * Math.sin(elapsed * 1.36 + binaryData.phase); binarySprite.position.set((binaryData.clusterX || 0) + (binaryData.centerX || 0) + Math.cos(binaryAngle) * binaryOffset, binaryData.clusterY || 0, (binaryData.clusterZ || 0) + (binaryData.centerZ || 0) + Math.sin(binaryAngle) * binaryOffset); var binaryScale = (binaryData.baseScale || 0.0038) * (0.92 + binaryPulse * 0.14); binarySprite.scale.set(binaryScale, binaryScale, 1); binarySprite.material.opacity = (binaryData.baseOpacity || 0.42) * resolvedClusterDetailLevel * populationVisual.clusters * ageEvolutionVisual.birth * binaryPulse; });
              var clusterTailDetailLevel = Math.max(0, Math.min(1, (0.96 - spherical.r) / 0.6)), clusterTailEvolution = 0.38 + ageEvolutionVisual.birth * 0.32 + ageEvolutionVisual.thickness * 0.3;
              clusterDissolutionTailGroup.visible = clusterTailDetailLevel > 0.012 && clusterTidalTailMode > 0.05 && populationVisual.clusters > 0.05;
              clusterTidalTailMaterials.forEach(function (clusterTailMaterial) { var clusterTailData = clusterTailMaterial.userData || {}, clusterTailPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.24 + clusterTailData.phase); clusterTailMaterial.opacity = (clusterTailData.baseOpacity || 0.05) * clusterTailDetailLevel * clusterTidalTailMode * populationVisual.clusters * clusterTailEvolution * clusterTailPulse; });
              if (escapedClusterMemberMaterial) { var escapedMemberPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.34); escapedClusterMemberMaterial.opacity = (escapedClusterMemberMaterial.userData.baseOpacity || 0.42) * clusterTailDetailLevel * clusterTidalTailMode * populationVisual.clusters * clusterTailEvolution * escapedMemberPulse; }
              var planetaryNebulaDetailLevel = Math.max(0, Math.min(1, (1.02 - spherical.r) / 0.66));
              resolvedPlanetaryNebulaGroup.visible = planetaryNebulaDetailLevel > 0.012 && planetaryNebulaMode > 0.05 && ageEvolutionVisual.remnants > 0.05;
              planetaryNebulaLobes.forEach(function (planetaryLobe) { var planetaryLobeData = planetaryLobe.userData || {}, planetaryLobePulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.38 + planetaryLobeData.phase), planetaryLobeScaleWave = prefersReducedMotion ? 1 : 0.96 + 0.06 * Math.sin(elapsed * 0.26 + planetaryLobeData.phase); planetaryLobe.scale.set((planetaryLobeData.baseScaleX || 0.008) * planetaryLobeScaleWave, (planetaryLobeData.baseScaleY || 0.024) * (2 - planetaryLobeScaleWave), 1); planetaryLobe.material.opacity = (planetaryLobeData.baseOpacity || 0.12) * planetaryNebulaDetailLevel * planetaryNebulaMode * populationVisual.remnants * ageEvolutionVisual.remnants * planetaryLobePulse; if (!prefersReducedMotion) planetaryLobe.material.rotation += planetaryLobeData.drift || 0; });
              planetaryNebulaShells.forEach(function (planetaryShell) { var planetaryShellData = planetaryShell.userData || {}, planetaryShellPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.32 + planetaryShellData.phase), planetaryShellScale = (planetaryShellData.baseScale || 0.016) * (0.94 + planetaryShellPulse * 0.1); planetaryShell.scale.set(planetaryShellScale, planetaryShellScale * 0.72, planetaryShellScale); planetaryShell.material.opacity = (planetaryShellData.baseOpacity || 0.1) * planetaryNebulaDetailLevel * planetaryNebulaMode * populationVisual.remnants * ageEvolutionVisual.remnants * planetaryShellPulse; if (!prefersReducedMotion) planetaryShell.rotation.z += planetaryShellData.drift || 0; });
              planetaryNebulaCores.forEach(function (planetaryCore) { var planetaryCoreData = planetaryCore.userData || {}, planetaryCorePulse = prefersReducedMotion ? 1 : 0.72 + 0.28 * Math.sin(elapsed * 1.12 + planetaryCoreData.phase), planetaryCoreScale = (planetaryCoreData.baseScale || 0.005) * (0.92 + planetaryCorePulse * 0.16); planetaryCore.scale.set(planetaryCoreScale, planetaryCoreScale, 1); planetaryCore.material.opacity = (planetaryCoreData.baseOpacity || 0.64) * planetaryNebulaDetailLevel * planetaryNebulaMode * populationVisual.remnants * ageEvolutionVisual.remnants * planetaryCorePulse; });
              var bowShockDetailLevel = Math.max(0, Math.min(1, (1.12 - spherical.r) / 0.72));
              stellarWindBowShockGroup.visible = bowShockDetailLevel > 0.012 && bowShockMode > 0.05 && ageEvolutionVisual.birth > 0.05;
              stellarWindBowShocks.forEach(function (bowShock) { var bowShockData = bowShock.userData || {}, bowShockPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.52 + bowShockData.phase), bowShockScaleWave = (bowShockData.baseScale || 0.022) * (0.94 + bowShockPulse * 0.12); updateLuminousOverlayOrbit(bowShock, elapsed); bowShock.quaternion.copy(camera.quaternion); bowShock.rotateZ((bowShockData.upstreamAngle || 0) + (prefersReducedMotion ? 0 : Math.sin(elapsed * 0.14 + bowShockData.phase) * 0.08)); bowShock.scale.set(bowShockScaleWave * 0.72, bowShockScaleWave, bowShockScaleWave); bowShock.material.opacity = (bowShockData.baseOpacity || 0.12) * bowShockDetailLevel * bowShockMode * ageEvolutionVisual.birth * (0.66 + populationVisual.clusters * 0.34) * bowShockPulse; });
              if (thickDiskMat) thickDiskMat.opacity = (thickDiskMat.userData.baseOpacity || 0.22) * populationVisual.thickDisk * ageEvolutionVisual.thickness;
              var shockFrontDetailLevel = 0.5 + 0.5 * Math.max(0, Math.min(1, (1.72 - spherical.r) / 1.14));
              shockFrontDustGroup.visible = shockFrontMode > 0.05 && ageEvolutionVisual.structure > 0.05;
              shockFrontFormationGroup.visible = shockFrontMode > 0.05 && ageEvolutionVisual.birth > 0.05;
              shockFrontDustMaterials.forEach(function (shockDustMaterial) { var shockDustData = shockDustMaterial.userData || {}, shockDustPulse = prefersReducedMotion ? 1 : 0.94 + 0.06 * Math.sin(elapsed * 0.22 + shockDustData.phase); shockDustMaterial.opacity = (shockDustData.baseOpacity || 0.24) * shockFrontDetailLevel * shockFrontMode * ageEvolutionVisual.gas * shockDustPulse; });
              shockFrontFormationMaterials.forEach(function (shockFormationMaterial) { var shockFormationData = shockFormationMaterial.userData || {}, shockFormationPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.38 + shockFormationData.phase); shockFormationMaterial.opacity = (shockFormationData.baseOpacity || 0.06) * shockFrontDetailLevel * shockFrontMode * ageEvolutionVisual.birth * shockFormationPulse; });
              var magneticFilamentDetailLevel = Math.max(0, Math.min(1, (1.38 - spherical.r) / 0.92)) * (0.78 + (1 - Math.abs(Math.cos(spherical.phi))) * 0.22);
              magneticFilamentGroup.visible = magneticFilamentDetailLevel > 0.012 && magneticFilamentMode > 0.05;
              magneticFilamentMaterials.forEach(function (filamentMaterial) { var filamentData = filamentMaterial.userData || {}, filamentPulse = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 0.2 + filamentData.phase); filamentMaterial.opacity = (filamentData.baseOpacity || 0.12) * magneticFilamentDetailLevel * magneticFilamentMode * ageEvolutionVisual.gas * filamentPulse; });
              var outerWarpViewFactor = 0.32 + edgeOnFactor * 0.68, outerWarpDetailLevel = Math.max(0, Math.min(1, (spherical.r - 0.48) / 0.72)) * outerWarpViewFactor;
              warpedOuterDiskGroup.visible = outerWarpDetailLevel > 0.012 && outerWarpMode > 0.05;
              outerWarpMaterials.forEach(function (outerWarpMaterial) { var outerWarpData = outerWarpMaterial.userData || {}, outerWarpPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.18 + outerWarpData.phase); outerWarpMaterial.opacity = (outerWarpData.baseOpacity || 0.03) * outerWarpDetailLevel * outerWarpMode * ageEvolutionVisual.structure * (0.64 + ageEvolutionVisual.disturbance * 0.36) * outerWarpPulse; });
              if (!prefersReducedMotion && warpedOuterDiskGroup.visible) warpedOuterDiskGroup.rotation.y += 0.000012;
              var extraplanarGasDetailLevel = Math.max(0, Math.min(1, (1.62 - spherical.r) / 1.08)) * (0.28 + edgeOnFactor * 0.72);
              extraplanarGasGroup.visible = extraplanarGasDetailLevel > 0.012 && extraplanarGasMode > 0.05;
              gasChimneyMaterials.forEach(function (chimneyMaterial) { var chimneyData = chimneyMaterial.userData || {}, chimneyPulse = prefersReducedMotion ? 1 : 0.82 + 0.18 * Math.sin(elapsed * 0.34 + chimneyData.phase); chimneyMaterial.opacity = (chimneyData.baseOpacity || 0.07) * extraplanarGasDetailLevel * extraplanarGasMode * ageEvolutionVisual.gas * Math.max(0.38, ageEvolutionVisual.remnants) * chimneyPulse; });
              fountainParticleGroup.visible = extraplanarGasDetailLevel > 0.018 && extraplanarGasMode > 0.05;
              if (fountainParticleMaterial) { fountainParticleMaterial.uniforms.uTime.value = prefersReducedMotion ? 0 : elapsed; fountainParticleMaterial.uniforms.uOpacity.value = Math.min(0.82, extraplanarGasDetailLevel * extraplanarGasMode * ageEvolutionVisual.gas * Math.max(0.34, ageEvolutionVisual.remnants) * 0.42); }
              superbubbleCapGroup.visible = extraplanarGasDetailLevel > 0.012 && extraplanarGasMode > 0.05;
              superbubbleCapShells.forEach(function (capShell) { var capData = capShell.userData || {}, capPulse = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * 0.26 + capData.phase), animatedCapScale = (capData.baseScale || 0.02) * (0.92 + capPulse * 0.18); capShell.scale.set(animatedCapScale, animatedCapScale, animatedCapScale); capShell.material.opacity = (capData.baseOpacity || 0.09) * extraplanarGasDetailLevel * extraplanarGasMode * ageEvolutionVisual.gas * Math.max(0.36, ageEvolutionVisual.remnants) * (0.92 - capPulse * 0.3); if (!prefersReducedMotion) capShell.rotation.z += capData.drift || 0; });
              var armScatteringDetailLevel = Math.max(0, Math.min(1, (1.86 - spherical.r) / 1.24)) * Math.max(0, Math.min(1, (spherical.r - 0.26) / 0.26));
              armScatteringGroup.visible = armScatteringDetailLevel > 0.012 && armScatteringMode > 0.05;
              armScatteringSprites.forEach(function (scatterSprite) { var scatterData = scatterSprite.userData || {}; var scatterPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.26 + scatterData.phase); var scatterScaleWave = prefersReducedMotion ? 1 : 0.97 + 0.05 * Math.sin(elapsed * 0.18 + scatterData.phase); scatterSprite.material.opacity = (scatterData.baseOpacity || 0.05) * armScatteringDetailLevel * armScatteringMode * ageEvolutionVisual.gas * scatterPulse; scatterSprite.scale.set((scatterData.baseScaleX || 0.12) * scatterScaleWave, (scatterData.baseScaleY || 0.04) * (2 - scatterScaleWave), 1); if (!prefersReducedMotion) scatterSprite.material.rotation += scatterData.drift || 0; });
              var dustColorScatteringLevel = Math.max(0, Math.min(1, (1.72 - spherical.r) / 1.16)) * (0.65 + (1 - Math.abs(Math.cos(spherical.phi))) * 0.35);
              dustColorScatteringGroup.visible = dustColorScatteringLevel > 0.012 && dustColorScatteringMode > 0.05;
              dustColorScatteringSprites.forEach(function (dustColorSprite) { var dustColorData = dustColorSprite.userData || {}, dustColorPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.2 + dustColorData.phase), dustColorScaleWave = prefersReducedMotion ? 1 : 0.98 + 0.04 * Math.sin(elapsed * 0.15 + dustColorData.phase); dustColorSprite.material.opacity = (dustColorData.baseOpacity || 0.03) * dustColorScatteringLevel * dustColorScatteringMode * ageEvolutionVisual.gas * dustColorPulse; dustColorSprite.scale.set((dustColorData.baseScaleX || 0.11) * dustColorScaleWave, (dustColorData.baseScaleY || 0.03) * (2 - dustColorScaleWave), 1); if (!prefersReducedMotion) dustColorSprite.material.rotation += dustColorData.drift || 0; });
              var haloContextLevel = Math.max(0, Math.min(1, (spherical.r - 0.72) / 1.08));
              stellarHaloShellGroup.visible = haloContextLevel > 0.01 && haloShellMode > 0.05;
              haloShellMaterials.forEach(function (haloMaterial) { var haloData = haloMaterial.userData || {}; var haloPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.2 + haloData.phase); haloMaterial.opacity = (haloData.baseOpacity || 0.03) * haloContextLevel * haloShellMode * ageEvolutionVisual.disturbance * haloPulse; });
              if (!prefersReducedMotion && stellarHaloShellGroup.visible) haloShellObjects.forEach(function (haloObject) { haloObject.rotation.y += haloObject.userData.drift || 0; });
              var foregroundStarLevel = Math.max(0, Math.min(1, (spherical.r - 0.34) / 0.72));
              foregroundStarGroup.visible = foregroundStarLevel > 0.012 && foregroundStarMode > 0.05;
              foregroundParallaxStars.forEach(function (foregroundStarSprite) { var foregroundData = foregroundStarSprite.userData || {}; var foregroundPulse = prefersReducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * (0.72 + (foregroundData.phase % 0.55)) + foregroundData.phase); var foregroundScale = (foregroundData.baseScale || 0.025) * (0.88 + foregroundPulse * 0.22); foregroundStarSprite.scale.set(foregroundScale, foregroundScale, 1); foregroundStarSprite.material.opacity = (foregroundData.baseOpacity || 0.18) * foregroundStarLevel * foregroundStarMode * (0.72 + foregroundPulse * 0.36); if (!prefersReducedMotion) foregroundStarSprite.material.rotation += 0.00012; });
              var dustBacklightDetailLevel = Math.max(0, Math.min(1, (1.58 - spherical.r) / 1.04)) * dustBacklightAngleFactor;
              dustBacklightGroup.visible = dustBacklightDetailLevel > 0.012 && dustBacklightMode > 0.05;
              dustBacklightSprites.forEach(function (shaftSprite) { var shaftData = shaftSprite.userData || {}; var shaftPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.22 + shaftData.phase); var shaftScaleWave = prefersReducedMotion ? 1 : 0.98 + 0.04 * Math.sin(elapsed * 0.16 + shaftData.phase); shaftSprite.material.opacity = (shaftData.baseOpacity || 0.04) * dustBacklightDetailLevel * dustBacklightMode * ageEvolutionVisual.gas * shaftPulse; shaftSprite.scale.set((shaftData.baseScaleX || 0.22) * shaftScaleWave, (shaftData.baseScaleY || 0.05) * (2 - shaftScaleWave), 1); if (!prefersReducedMotion) shaftSprite.material.rotation += shaftData.drift || 0; });
              supernovaRemnantArcs.forEach(function (remnantArc) {
                var remnantData = remnantArc.userData || {};
                var remnantPulse = prefersReducedMotion ? 0.84 : 0.72 + 0.28 * Math.sin(elapsed * 0.58 + remnantData.phase);
                var remnantSize = (remnantData.baseScale || 0.024) * (0.94 + remnantPulse * 0.12);
                remnantArc.scale.set(remnantSize, remnantSize, remnantSize);
                remnantArc.material.opacity = (remnantData.baseOpacity || 0.1) * populationVisual.remnants * ageEvolutionVisual.remnants * remnantPulse;
                if (!prefersReducedMotion) remnantArc.rotation.z += remnantData.drift || 0;
              });
              var supernovaEjectaDetailLevel = Math.max(0, Math.min(1, (0.98 - spherical.r) / 0.62));
              resolvedSupernovaEjectaGroup.visible = supernovaEjectaDetailLevel > 0.012 && supernovaEjectaMode > 0.05 && ageEvolutionVisual.remnants > 0.05;
              supernovaEjectaFilamentMaterials.forEach(function (ejectaFilamentMaterial) { var ejectaFilamentData = ejectaFilamentMaterial.userData || {}, ejectaFilamentPulse = prefersReducedMotion ? 1 : 0.84 + 0.16 * Math.sin(elapsed * 0.3 + ejectaFilamentData.phase); ejectaFilamentMaterial.opacity = (ejectaFilamentData.baseOpacity || 0.07) * supernovaEjectaDetailLevel * supernovaEjectaMode * populationVisual.remnants * ageEvolutionVisual.remnants * ejectaFilamentPulse; });
              reverseShockShells.forEach(function (reverseShockShell) { var reverseShockData = reverseShockShell.userData || {}, reverseShockPulse = prefersReducedMotion ? 1 : 0.78 + 0.22 * Math.sin(elapsed * 0.42 + reverseShockData.phase), reverseShockScale = (reverseShockData.baseScale || 0.012) * (0.94 + reverseShockPulse * 0.12); reverseShockShell.scale.set(reverseShockScale, reverseShockScale, reverseShockScale); reverseShockShell.material.opacity = (reverseShockData.baseOpacity || 0.1) * supernovaEjectaDetailLevel * supernovaEjectaMode * populationVisual.remnants * ageEvolutionVisual.remnants * reverseShockPulse; if (!prefersReducedMotion) reverseShockShell.rotation.z += reverseShockData.drift || 0; });
              supernovaEjectaKnots.forEach(function (ejectaKnot) { var ejectaKnotData = ejectaKnot.userData || {}, ejectaKnotPulse = prefersReducedMotion ? 1 : 0.62 + 0.38 * Math.sin(elapsed * 1.16 + ejectaKnotData.phase), ejectaExpansionWave = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * 0.24 + ejectaKnotData.phase), ejectaRadius = (ejectaKnotData.baseRadius || 0.012) + (ejectaKnotData.expansion || 0.001) * ejectaExpansionWave, ejectaKnotScale = (ejectaKnotData.baseScale || 0.003) * (0.86 + ejectaKnotPulse * 0.28); ejectaKnot.position.set((ejectaKnotData.centerX || 0) + (ejectaKnotData.directionX || 0) * ejectaRadius, (ejectaKnotData.centerY || 0) + (ejectaKnotData.directionY || 0) * ejectaRadius, (ejectaKnotData.centerZ || 0) + (ejectaKnotData.directionZ || 0) * ejectaRadius); ejectaKnot.scale.set(ejectaKnotScale, ejectaKnotScale, 1); ejectaKnot.material.opacity = (ejectaKnotData.baseOpacity || 0.36) * supernovaEjectaDetailLevel * supernovaEjectaMode * populationVisual.remnants * ageEvolutionVisual.remnants * ejectaKnotPulse; });
              compactRemnantCoreSprites.forEach(function (compactCoreSprite) { var compactCoreData = compactCoreSprite.userData || {}, compactCorePulse = prefersReducedMotion ? 1 : 0.66 + 0.34 * Math.sin(elapsed * 1.72 + compactCoreData.phase), compactCoreScale = (compactCoreData.baseScale || 0.003) * (0.88 + compactCorePulse * 0.22); compactCoreSprite.scale.set(compactCoreScale, compactCoreScale, 1); compactCoreSprite.material.opacity = Math.min(1, (compactCoreData.baseOpacity || 0.62) * supernovaEjectaDetailLevel * supernovaEjectaMode * populationVisual.remnants * ageEvolutionVisual.remnants * compactCorePulse); });
              cloudVisual.molecular += (cloudTarget.molecular - cloudVisual.molecular) * (prefersReducedMotion ? 1 : 0.045);
              cloudVisual.protostar += (cloudTarget.protostar - cloudVisual.protostar) * (prefersReducedMotion ? 1 : 0.045);
              cloudVisual.foreground += (cloudTarget.foreground - cloudVisual.foreground) * (prefersReducedMotion ? 1 : 0.045);
              var circumstellarDetailLevel = Math.max(0, Math.min(1, (0.94 - spherical.r) / 0.6)), diskBandVisibility = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'radio' ? 0.45 : currentObserveMode === 'infrared' ? 0.28 : currentObserveMode === 'xray' ? 0.18 : 0.1;
              circumstellarNurseryGroup.visible = circumstellarDetailLevel > 0.012 && cloudVisual.protostar > 0.05 && ageEvolutionVisual.birth > 0.05;
              protoplanetaryDiskMeshes.forEach(function (diskMesh) { var diskData = diskMesh.userData || {}, diskPulse = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 0.31 + diskData.phase), diskScale = (diskData.baseScale || 0.012) * (0.97 + diskPulse * 0.05), diskModeOpacity = diskData.isRim ? circumstellarMode : diskBandVisibility; diskMesh.scale.set(diskScale, diskScale * (diskData.flattening || 0.36), diskScale); diskMesh.material.opacity = (diskData.baseOpacity || 0.18) * circumstellarDetailLevel * diskModeOpacity * cloudVisual.protostar * ageEvolutionVisual.birth * diskPulse; if (!prefersReducedMotion) diskMesh.rotation.z += diskData.drift || 0; });
              protostellarCoreSprites.forEach(function (nurseryCore) { var nurseryCoreData = nurseryCore.userData || {}, nurseryCorePulse = prefersReducedMotion ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 1.08 + nurseryCoreData.phase), nurseryCoreScale = (nurseryCoreData.baseScale || 0.004) * (0.9 + nurseryCorePulse * 0.18); nurseryCore.scale.set(nurseryCoreScale, nurseryCoreScale, 1); nurseryCore.material.opacity = (nurseryCoreData.baseOpacity || 0.58) * circumstellarDetailLevel * circumstellarMode * cloudVisual.protostar * ageEvolutionVisual.birth * nurseryCorePulse; });
              protostellarJetSprites.forEach(function (jetSprite) { var jetData = jetSprite.userData || {}, jetPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.48 + jetData.phase), jetScaleWave = prefersReducedMotion ? 1 : 0.95 + 0.07 * Math.sin(elapsed * 0.34 + jetData.phase); jetSprite.scale.set((jetData.baseScaleX || 0.004) * jetScaleWave, (jetData.baseScaleY || 0.026) * (2 - jetScaleWave), 1); jetSprite.material.opacity = (jetData.baseOpacity || 0.12) * circumstellarDetailLevel * protostellarJetMode * cloudVisual.protostar * ageEvolutionVisual.birth * jetPulse; if (!prefersReducedMotion) jetSprite.material.rotation += jetData.drift || 0; });
              protostellarShockKnots.forEach(function (shockKnot) { var shockKnotData = shockKnot.userData || {}, shockKnotPulse = prefersReducedMotion ? 1 : 0.64 + 0.36 * Math.sin(elapsed * 1.34 + shockKnotData.phase), shockKnotScale = (shockKnotData.baseScale || 0.004) * (0.86 + shockKnotPulse * 0.28); shockKnot.scale.set(shockKnotScale, shockKnotScale, 1); shockKnot.material.opacity = (shockKnotData.baseOpacity || 0.38) * circumstellarDetailLevel * protostellarJetMode * cloudVisual.protostar * ageEvolutionVisual.birth * shockKnotPulse; });
              molecularFilamentMats.forEach(function (cloudMaterial) { var cloudData = cloudMaterial.userData || {}; var cloudShimmer = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 0.22 + cloudData.phase); cloudMaterial.opacity = (cloudData.baseOpacity || 0.08) * cloudVisual.molecular * ageEvolutionVisual.gas * cloudShimmer; });
              protostarKnotSprites.forEach(function (protoSprite) { var protoData = protoSprite.userData || {}, protoPulse = prefersReducedMotion ? 0.86 : 0.68 + 0.32 * Math.sin(elapsed * 1.42 + protoData.phase); var protoScale = (protoData.baseScale || 0.014) * (0.9 + protoPulse * 0.22); protoSprite.scale.set(protoScale, protoScale, 1); protoSprite.material.opacity = (protoData.baseOpacity || 0.4) * cloudVisual.protostar * ageEvolutionVisual.birth * protoPulse; if (!prefersReducedMotion) protoSprite.material.rotation += protoData.drift || 0; });
              foregroundDustSprites.forEach(function (foregroundSprite) { var foregroundData = foregroundSprite.userData || {}; if (!prefersReducedMotion) { foregroundSprite.position.y = foregroundData.baseY + Math.sin(elapsed * 0.12 + foregroundData.phase) * 0.012; foregroundSprite.material.rotation += foregroundData.drift || 0; } foregroundSprite.material.opacity = (foregroundData.baseOpacity || 0.035) * cloudVisual.foreground * (0.88 + 0.12 * Math.sin(elapsed * 0.2 + foregroundData.phase)); });
              if (!prefersReducedMotion) atmosphereGroup.rotation.y += 0.00007;
              dustDepthCameraDirection.copy(camera.position).normalize();
              var dustDepthParallaxFactor = 0.72 + (1 - Math.abs(Math.cos(spherical.phi))) * 0.48;
              volumetricDustSprites.forEach(function (dustSprite, idx) {
                var dustData = dustSprite.userData || {}, dustRadius = Math.max(0.08, Math.sqrt(dustSprite.position.x * dustSprite.position.x + dustSprite.position.z * dustSprite.position.z)), dustNearSide = 0.5 + 0.5 * (dustSprite.position.x * dustDepthCameraDirection.x + dustSprite.position.z * dustDepthCameraDirection.z) / dustRadius;
                var dustPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.28 + dustData.phase), dustDepthContrast = (0.72 + dustNearSide * 0.56) * dustDepthParallaxFactor;
                if (!prefersReducedMotion) { dustSprite.material.rotation += dustData.drift || 0; dustSprite.position.y = dustData.baseY + Math.sin(elapsed * 0.16 + dustData.phase) * 0.006; }
                dustSprite.material.opacity = (dustData.baseOpacity || 0.08) * volumetricVisual.dust * ageEvolutionVisual.gas * dustPulse * dustDepthContrast;
                dustSprite.scale.set((dustData.baseScaleX || 0.24) * (0.97 + dustNearSide * 0.07), (dustData.baseScaleY || 0.08) * (1.04 - dustNearSide * 0.05), 1);
                if (dustData.baseColor) dustSprite.material.color.copy(dustData.baseColor).lerp(dustNearSide > 0.5 ? dustNearTint : dustFarTint, Math.abs(dustNearSide - 0.5) * 0.24);
              });
              starBirthSprites.forEach(function (birthSprite) {
                var birthData = birthSprite.userData || {}; var birthPulse = 0.7 + 0.3 * Math.sin(elapsed * 1.18 + birthData.phase);
                birthSprite.material.opacity = (birthData.baseOpacity || 0.16) * volumetricVisual.birth * ageEvolutionVisual.birth * birthPulse;
                var birthScale = (birthData.baseScale || 0.025) * (0.88 + birthPulse * 0.28); birthSprite.scale.set(birthScale, birthScale, 1);
              });
              if (!prefersReducedMotion) globularGroup.rotation.y += 0.000025;
              globularSprites.forEach(function (clusterSprite) {
                var clusterData = clusterSprite.userData || {}, clusterPulse = 0.82 + 0.18 * Math.sin(elapsed * 0.72 + clusterData.phase);
                clusterSprite.material.opacity = (clusterData.baseOpacity || 0.16) * volumetricVisual.satellite * clusterPulse;
                var clusterScale = (clusterData.baseScale || 0.026) * (0.94 + clusterPulse * 0.1); clusterSprite.scale.set(clusterScale, clusterScale, 1);
                if (!prefersReducedMotion) clusterSprite.material.rotation += clusterData.drift || 0;
              });
              dustFeatherMats.forEach(function (featherMaterial) { featherMaterial.opacity = (featherMaterial.userData.baseOpacity || 0.24) * volumetricVisual.dust * ageEvolutionVisual.gas * (0.9 + 0.1 * Math.sin(elapsed * 0.24 + featherMaterial.userData.phase)); });
              ionizedShells.forEach(function (shell) {
                var shellData = shell.userData || {}, shellWave = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * (shellData.expansion || 0.12) + shellData.phase);
                var expandedShellScale = (shellData.baseScale || 0.02) * (0.9 + shellWave * 0.24); shell.scale.set(expandedShellScale, expandedShellScale, expandedShellScale);
                shell.material.opacity = (shellData.baseOpacity || 0.09) * volumetricVisual.birth * ageEvolutionVisual.birth * (0.9 - shellWave * 0.38);
              });
              var emissionLineDetailLevel = Math.max(0, Math.min(1, (1.26 - spherical.r) / 0.82));
              emissionLineGroup.visible = emissionLineDetailLevel > 0.012 && emissionLineMode > 0.05;
              emissionLineRims.forEach(function (emissionArc) { var emissionData = emissionArc.userData || {}, emissionWave = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * (emissionData.expansion || 0.12) + emissionData.phase), emissionScale = (emissionData.baseScale || 0.02) * (0.92 + emissionWave * 0.18); emissionArc.scale.set(emissionScale, emissionScale, emissionScale); emissionArc.material.opacity = (emissionData.baseOpacity || 0.1) * emissionLineDetailLevel * emissionLineMode * volumetricVisual.birth * ageEvolutionVisual.birth * (0.94 - emissionWave * 0.3); if (!prefersReducedMotion) emissionArc.rotation.z += emissionData.drift || 0; });
              var satelliteMorphologyDetailLevel = Math.max(0, Math.min(1, (2.25 - spherical.r) / 1.3)) * Math.max(0, Math.min(1, (spherical.r - 0.4) / 0.5));
              resolvedSatelliteMorphologyGroup.visible = satelliteMorphologyDetailLevel > 0.012 && volumetricVisual.satellite > 0.05;
              satelliteEnvelopeSprites.forEach(function (envelopeSprite) { var envelopeData = envelopeSprite.userData || {}, envelopePulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.28 + envelopeData.phase), envelopeScaleWave = prefersReducedMotion ? 1 : 0.97 + 0.05 * Math.sin(elapsed * 0.2 + envelopeData.phase); envelopeSprite.scale.set((envelopeData.baseScaleX || 0.16) * envelopeScaleWave, (envelopeData.baseScaleY || 0.08) * (2 - envelopeScaleWave), 1); envelopeSprite.material.opacity = (envelopeData.baseOpacity || 0.1) * satelliteMorphologyDetailLevel * satelliteDwarfMode * volumetricVisual.satellite * ageEvolutionVisual.disturbance * envelopePulse; if (!prefersReducedMotion) envelopeSprite.material.rotation += envelopeData.drift || 0; });
              ramPressureTailMaterials.forEach(function (ramTailMaterial) { var ramTailData = ramTailMaterial.userData || {}, ramTailPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.3 + ramTailData.phase); ramTailMaterial.opacity = (ramTailData.baseOpacity || 0.05) * satelliteMorphologyDetailLevel * ramPressureMode * volumetricVisual.satellite * ageEvolutionVisual.disturbance * Math.max(0.35, ageEvolutionVisual.gas) * ramTailPulse; });
              strippedSatelliteGasKnots.forEach(function (strippedKnotSprite) { var strippedKnotData = strippedKnotSprite.userData || {}, strippedKnotPulse = prefersReducedMotion ? 1 : 0.74 + 0.26 * Math.sin(elapsed * 0.62 + strippedKnotData.phase), strippedKnotScaleWave = prefersReducedMotion ? 1 : 0.94 + 0.08 * Math.sin(elapsed * 0.38 + strippedKnotData.phase); strippedKnotSprite.scale.set((strippedKnotData.baseScaleX || 0.04) * strippedKnotScaleWave, (strippedKnotData.baseScaleY || 0.014) * (2 - strippedKnotScaleWave), 1); strippedKnotSprite.material.opacity = (strippedKnotData.baseOpacity || 0.08) * satelliteMorphologyDetailLevel * ramPressureMode * volumetricVisual.satellite * ageEvolutionVisual.disturbance * Math.max(0.35, ageEvolutionVisual.gas) * strippedKnotPulse; if (!prefersReducedMotion) strippedKnotSprite.material.rotation += strippedKnotData.drift || 0; });
              satelliteCoreSprites.forEach(function (coreSprite) { var coreData = coreSprite.userData || {}, corePulse = 0.84 + 0.16 * Math.sin(elapsed * 0.64 + coreData.phase); coreSprite.material.opacity = (coreData.baseOpacity || 0.3) * volumetricVisual.satellite * corePulse; coreSprite.scale.set((coreData.baseScaleX || 0.12) * (0.94 + corePulse * 0.08), (coreData.baseScaleY || 0.07) * (0.94 + corePulse * 0.08), 1); });
              if (!prefersReducedMotion) satelliteGroup.rotation.y += 0.000035;
              satelliteMats.forEach(function (satelliteMat) { satelliteMat.opacity = (satelliteMat.userData.baseOpacity || 0.42) * volumetricVisual.satellite * ageEvolutionVisual.disturbance; });
              tidalStreamMats.forEach(function (tidalMat) { tidalMat.opacity = (tidalMat.userData.baseOpacity || 0.05) * volumetricVisual.satellite * ageEvolutionVisual.disturbance * (0.78 + 0.22 * Math.sin(elapsed * 0.38 + tidalMat.userData.phase)); });
              if (!prefersReducedMotion) satelliteGroup.children.forEach(function (satelliteChild) { if (satelliteChild.userData && satelliteChild.userData.drift) satelliteChild.rotation.y += satelliteChild.userData.drift; });
              morphologySignatureMaterials.forEach(function (morphMaterial) { var morphData = morphMaterial.userData || {}; var morphPulse = prefersReducedMotion ? 1 : 0.9 + 0.1 * Math.sin(elapsed * 0.42 + morphData.phase); morphMaterial.opacity = (morphData.baseOpacity || 0.08) * ageEvolutionVisual.structure * morphPulse; });
              if (!prefersReducedMotion) morphologySignatureObjects.forEach(function (morphObject, morphIndex) { if (galaxyType === 'irregular' && morphObject.userData && morphObject.userData.baseScale) { var morphWave = 0.96 + 0.08 * Math.sin(elapsed * 0.36 + morphObject.userData.phase); var morphScale = morphObject.userData.baseScale * morphWave; morphObject.scale.set(morphScale * 1.25, morphScale, morphScale); } else if (galaxyType !== 'elliptical') morphObject.rotation.y += (morphIndex % 2 ? -0.000025 : 0.000018); });

              nebulaSprites.forEach(function (s, i) {
                var nebBase = currentObserveMode === 'radio' ? 0.1 : currentObserveMode === 'xray' ? 0.05 : currentObserveMode === 'infrared' ? 0.18 : 0.25;
                var nebPulse = currentObserveMode === 'radio' ? 0.06 : currentObserveMode === 'xray' ? 0.03 : 0.15;
                s.material.opacity = nebBase + nebPulse * Math.sin(elapsed * 0.5 + i * 1.8);
              });
              nebulaWispSprites.forEach(function (w, i) {
                var wMode = currentObserveMode === 'infrared' ? 1.45 : currentObserveMode === 'radio' ? 0.62 : currentObserveMode === 'xray' ? 0.38 : currentObserveMode === 'gravity' ? 0.5 : 1;
                var wPulse = 0.72 + 0.28 * Math.sin(elapsed * 0.44 + w.userData.phase);
                w.material.opacity = w.userData.baseOpacity * wMode * wPulse;
                w.material.rotation += (0.0009 + (i % 3) * 0.00035) * motionStep;
                var wScale = 0.96 + 0.05 * Math.sin(elapsed * 0.38 + w.userData.phase);
                w.scale.set(w.userData.baseScaleX * wScale, w.userData.baseScaleY * (1.02 - (wScale - 0.96)), 1);
              });

              var microDetailLevel = Math.max(0, Math.min(1, (1.48 - spherical.r) / 0.98));
              var feedbackModeLevel = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 0.42 : currentObserveMode === 'radio' ? 0.24 : currentObserveMode === 'xray' ? 0.13 : 0.08;
              stellarFeedbackGroup.visible = microDetailLevel > 0.015 && feedbackModeLevel > 0.05;
              feedbackIonizationRims.forEach(function (rim) { var rimData = rim.userData || {}, rimPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.46 + rimData.phase); rim.material.opacity = (rimData.baseOpacity || 0.12) * microDetailLevel * feedbackModeLevel * ageEvolutionVisual.birth * rimPulse; if (!prefersReducedMotion) rim.rotation.z += 0.00006; });
              feedbackPillarSprites.forEach(function (pillar) { var pillarData = pillar.userData || {}, pillarPulse = prefersReducedMotion ? 1 : 0.94 + 0.06 * Math.sin(elapsed * 0.24 + pillarData.phase); pillar.material.opacity = (pillarData.baseOpacity || 0.5) * microDetailLevel * (currentObserveMode === 'infrared' ? 0.22 : feedbackModeLevel) * ageEvolutionVisual.gas; pillar.scale.set((pillarData.baseScaleX || 0.012) * pillarPulse, (pillarData.baseScaleY || 0.05) * (2 - pillarPulse), 1); if (!prefersReducedMotion) pillar.material.rotation += pillarData.drift || 0; });
              bokGlobuleSprites.forEach(function (globule) { var globuleData = globule.userData || {}, globulePulse = prefersReducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 0.31 + globuleData.phase); globule.material.opacity = (globuleData.baseOpacity || 0.55) * microDetailLevel * (currentObserveMode === 'infrared' ? 0.14 : feedbackModeLevel) * ageEvolutionVisual.gas; globule.scale.set((globuleData.baseScaleX || 0.012) * globulePulse, (globuleData.baseScaleY || 0.012) * (2 - globulePulse), 1); if (!prefersReducedMotion) globule.material.rotation += globuleData.drift || 0; });

              var nuclearDetailLevel = Math.max(0, Math.min(1, (0.94 - spherical.r) / 0.68));
              var nuclearModeLevel = currentObserveMode === 'visible' ? 1 : currentObserveMode === 'infrared' ? 1.28 : currentObserveMode === 'xray' ? 0.72 : currentObserveMode === 'radio' ? 0.32 : 0.18;
              nuclearDetailGroup.visible = nuclearDetailLevel > 0.012;
              if (nuclearStarClusterMaterial) nuclearStarClusterMaterial.opacity = 0.68 * nuclearDetailLevel * nuclearModeLevel * (0.9 + 0.1 * Math.sin(elapsed * 0.72));
              nuclearDustSpiralMaterials.forEach(function (nuclearMaterial) { var nuclearData = nuclearMaterial.userData || {}; nuclearMaterial.opacity = (nuclearData.baseOpacity || 0.16) * nuclearDetailLevel * (currentObserveMode === 'infrared' ? 0.3 : nuclearModeLevel) * (0.9 + 0.1 * Math.sin(elapsed * 0.38 + nuclearData.phase)); });
              var nuclearFeedingDetailLevel = Math.max(0, Math.min(1, (0.84 - spherical.r) / 0.58));
              circumnuclearFeedingGroup.visible = nuclearFeedingDetailLevel > 0.012 && nuclearFeedingMode > 0.05;
              circumnuclearRingMaterials.forEach(function (circumnuclearMaterial) { var circumnuclearData = circumnuclearMaterial.userData || {}, circumnuclearPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.46 + circumnuclearData.phase); circumnuclearMaterial.opacity = (circumnuclearData.baseOpacity || 0.08) * nuclearFeedingDetailLevel * nuclearFeedingMode * Math.max(0.42, ageEvolutionVisual.gas) * circumnuclearPulse; });
              if (!prefersReducedMotion && circumnuclearFeedingGroup.visible) circumnuclearRingObjects.forEach(function (circumnuclearArc) { circumnuclearArc.rotation.z += circumnuclearArc.userData.drift || 0; });
              nuclearMiniSpiralMaterials.forEach(function (nuclearMiniMaterial) { var nuclearMiniData = nuclearMiniMaterial.userData || {}, nuclearMiniPulse = prefersReducedMotion ? 1 : 0.88 + 0.12 * Math.sin(elapsed * 0.54 + nuclearMiniData.phase); nuclearMiniMaterial.opacity = (nuclearMiniData.baseOpacity || 0.1) * nuclearFeedingDetailLevel * nuclearFeedingMode * Math.max(0.4, ageEvolutionVisual.gas) * nuclearMiniPulse; });
              nuclearFeedingHotKnots.forEach(function (nuclearHotKnot) { var nuclearHotData = nuclearHotKnot.userData || {}, nuclearHotAngle = (nuclearHotData.angle || 0) + (prefersReducedMotion ? 0 : elapsed * (nuclearHotData.speed || 0.5)), nuclearHotRadius = nuclearHotData.radius || 0.08, nuclearHotPulse = prefersReducedMotion ? 1 : 0.66 + 0.34 * Math.sin(elapsed * 1.28 + nuclearHotData.phase), nuclearHotScaleWave = 0.86 + nuclearHotPulse * 0.24; nuclearHotKnot.position.set(Math.cos(nuclearHotAngle) * nuclearHotRadius, Math.sin(nuclearHotAngle * 2 + nuclearHotData.phase) * 0.0045, Math.sin(nuclearHotAngle) * nuclearHotRadius * (nuclearHotData.inclination || 0.68)); nuclearHotKnot.material.rotation = Math.PI * 0.5 - nuclearHotAngle; nuclearHotKnot.scale.set((nuclearHotData.baseScaleX || 0.018) * nuclearHotScaleWave, (nuclearHotData.baseScaleY || 0.005) * (0.92 + nuclearHotPulse * 0.16), 1); nuclearHotKnot.material.opacity = (nuclearHotData.baseOpacity || 0.16) * nuclearFeedingDetailLevel * nuclearFeedingMode * Math.max(0.4, ageEvolutionVisual.gas) * nuclearHotPulse; });
              if (!prefersReducedMotion && nuclearDetailGroup.visible) nuclearDetailGroup.rotation.y += 0.00012;
              var coreLensingDetailLevel = Math.max(0, Math.min(1, (0.8 - spherical.r) / 0.5));
              coreLensingCausticGroup.visible = bhGroup.visible && coreLensingDetailLevel > 0.012;
              coreCausticMaterials.forEach(function (causticMaterial) { var causticData = causticMaterial.userData || {}; var causticPulse = prefersReducedMotion ? 1 : 0.86 + 0.14 * Math.sin(elapsed * 0.72 + causticData.phase); causticMaterial.opacity = (causticData.baseOpacity || 0.1) * coreLensingDetailLevel * Math.max(0.28, blackHoleDrama.lens / 0.18) * causticPulse; });
              if (!prefersReducedMotion && coreLensingCausticGroup.visible) coreCausticObjects.forEach(function (causticObject) { causticObject.rotation.z += causticObject.userData.drift || 0; });
              coreLensedImages.forEach(function (lensedImage) { var imageData = lensedImage.userData || {}, imagePulse = prefersReducedMotion ? 1 : 0.78 + 0.22 * Math.sin(elapsed * 1.08 + imageData.phase), imageAngle = imageData.angle + (prefersReducedMotion ? 0 : elapsed * imageData.drift); lensedImage.position.set(Math.cos(imageAngle) * imageData.radius, Math.sin(imageData.phase) * 0.0035, Math.sin(imageAngle) * imageData.radius * 0.62); lensedImage.material.opacity = (imageData.baseOpacity || 0.2) * coreLensingDetailLevel * Math.max(0.24, blackHoleDrama.lens / 0.18) * imagePulse; var imageScale = (imageData.baseScale || 0.01) * (0.9 + imagePulse * 0.18); lensedImage.scale.set(imageScale * 1.8, imageScale, 1); });

              if (infraredGroup.visible) infraredGroup.rotation.y += 0.0009 * motionStep;

              if (radioGroup.visible) radioGroup.rotation.y -= 0.0012 * motionStep;

              if (xrayGroup.visible) {
                xrayGroup.rotation.y += 0.006 * motionStep;
                xrayGroup.children.forEach(function (obj, idx) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = idx === 0 ? 0.68 + 0.18 * Math.sin(elapsed * 2.4) : 0.14 + 0.08 * Math.sin(elapsed * 3.2 + idx); });
              }

              if (darkHaloGroup.visible) {
                darkHaloGroup.rotation.y += 0.001 * motionStep;
                darkHaloGroup.children.forEach(function (obj, idx) { if (obj.material && obj.material.opacity !== undefined) obj.material.opacity = idx === 0 ? 0.18 + 0.04 * Math.sin(elapsed * 0.9) : 0.045 + 0.018 * Math.sin(elapsed * 0.7); });
              }

              if (bhGroup.visible) {

                rings.forEach(function (r) { r.rotation.y -= 0.03 * motionStep; });

                bhGlow.material.opacity = 0.6 + 0.3 * Math.sin(elapsed * 0.8);

                bhGlow.scale.set(0.12 + 0.01 * Math.sin(elapsed * 1.5), 0.12 + 0.01 * Math.sin(elapsed * 1.5), 1);

                photonRings.forEach(function (r, idx) {
                  r.rotation.z += (0.012 + idx * 0.004) * motionStep;
                  if (r.material) r.material.opacity = Math.max(0, blackHoleDrama.photon - idx * 0.08 + 0.045 * Math.sin(elapsed * 1.9 + idx));
                });
                lensingArcs.forEach(function (a, idx) {
                  a.rotation.z += (idx % 2 ? -0.006 : 0.0045) * motionStep;
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

              if (selectionTarget && selectionMarker.visible) {
                if (selectionTarget.kind === 'star') {
                  var selectedRadius = Math.sqrt(selectionTarget.x * selectionTarget.x + selectionTarget.z * selectionTarget.z);
                  var selectedAngle = Math.atan2(selectionTarget.z, selectionTarget.x);
                  var selectedMode = starShaderMat.uniforms.uRotMode.value;
                  var selectedOmega = selectedMode < 0.5 ? 0.018 : selectedMode < 1.5 ? 0.012 / Math.pow(Math.max(selectedRadius, 0.08), 1.5) : 0.03 / Math.max(selectedRadius, 0.08);
                  var selectedAnimatedAngle = selectedAngle + elapsed * selectedOmega;
                  selectionMarker.position.set(Math.cos(selectedAnimatedAngle) * selectedRadius, selectionTarget.y, Math.sin(selectedAnimatedAngle) * selectedRadius);
                  selectionHalo.position.copy(selectionMarker.position);
                  cameraLookGoal.set(selectionMarker.position.x * 0.55, selectionMarker.position.y * 0.5, selectionMarker.position.z * 0.55);
                  updateMeasurementRuler(selectionMarker.position);
                  updateOrbitalMechanics(selectionMarker.position, selectedOmega, elapsed);
                }
                var focusWave = prefersReducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(elapsed * 3.2);
                var focusPulse = 0.078 + 0.012 * focusWave;
                selectionMarker.scale.set(focusPulse, focusPulse, 1);
                selectionHalo.scale.set(0.112 + focusWave * 0.014, 0.112 + focusWave * 0.014, 1);
                if (!prefersReducedMotion) { selectionMarker.material.rotation = -elapsed * 0.42; selectionHalo.material.rotation = elapsed * 0.16; }
                selectionMarker.material.opacity = prefersReducedMotion ? 0.9 : 0.72 + 0.25 * (0.5 + 0.5 * Math.sin(elapsed * 2.4));
                selectionHalo.material.opacity = prefersReducedMotion ? 0.38 : 0.28 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 1.45 + 0.7));
              }

              var focusDx = cameraLookGoal.x - cameraLookTarget.x, focusDy = cameraLookGoal.y - cameraLookTarget.y, focusDz = cameraLookGoal.z - cameraLookTarget.z;
              if (Math.abs(focusDx) + Math.abs(focusDy) + Math.abs(focusDz) > 0.00002) {
                var focusEase = prefersReducedMotion ? 1 : 0.065;
                cameraLookTarget.x += focusDx * focusEase; cameraLookTarget.y += focusDy * focusEase; cameraLookTarget.z += focusDz * focusEase;
                updateCamera();
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

              var coreProximity = Math.max(0, Math.min(1, (0.92 - spherical.r) / 0.68));
              var outerContextCompression = Math.max(0, Math.min(1, (spherical.r - 0.96) / 1.34));
              var transientGlareCompression = Math.min(0.11, supernovae.length * 0.026 + cinematicMotion.shock * 0.055 + cinematicMotion.aperture * 0.025);
              var modeExposure = currentObserveMode === 'xray' ? 0.96 : currentObserveMode === 'infrared' ? 1.06 : currentObserveMode === 'radio' ? 1.02 : currentObserveMode === 'gravity' ? 1.04 : 1.12;
              var targetExposure = modeExposure + morphologyVisual.exposureBias - coreProximity * 0.19 - outerContextCompression * 0.08 - transientGlareCompression;
              var adaptationRate = prefersReducedMotion ? 1 : 0.04;
              var zoomPointTarget = 1 - outerContextCompression * 0.34;
              var zoomOpacityTarget = 1 - outerContextCompression * 0.26;
              starShaderMat.uniforms.uZoomPointScale.value += (zoomPointTarget - starShaderMat.uniforms.uZoomPointScale.value) * adaptationRate;
              starShaderMat.uniforms.uZoomOpacity.value += (zoomOpacityTarget - starShaderMat.uniforms.uZoomOpacity.value) * adaptationRate;
              renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * adaptationRate;
              if (composer && canvasEl._bloomPass) { var adaptiveBloomStrength = bloomModeStrength - coreProximity * 0.24 - outerContextCompression * 0.18 - transientGlareCompression * 0.8; var adaptiveBloomThreshold = bloomModeThreshold + coreProximity * 0.075 + outerContextCompression * 0.035 + transientGlareCompression * 0.12; canvasEl._bloomPass.strength += (adaptiveBloomStrength - canvasEl._bloomPass.strength) * adaptationRate; canvasEl._bloomPass.threshold += (adaptiveBloomThreshold - canvasEl._bloomPass.threshold) * adaptationRate; }

              if (composer) composer.render();

              else renderer.render(scene, camera);

            }

            animate();

            // The scene now exists — clear the "building" overlay. Deferred a tick so
            // this never sets state inside React's commit phase.
            (function () {
              var readyRuntime = galaxyRuntimeRef.current;
              if (readyRuntime && readyRuntime.reportSceneReady) readyRuntime.reportSceneReady();
            })();

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

            var ro = new ResizeObserver(function () {
              W = canvasEl.offsetWidth; H = canvasEl.offsetHeight;
              var nextPixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);
              if (Math.abs(renderer.getPixelRatio() - nextPixelRatio) > 0.01) renderer.setPixelRatio(nextPixelRatio);
              camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
              if (composer) { if (composer.setPixelRatio) composer.setPixelRatio(nextPixelRatio); if (composer.setSize) composer.setSize(W, H); }
              if (starShaderMat && starShaderMat.uniforms.uPR) starShaderMat.uniforms.uPR.value = renderer.getPixelRatio();
              canvasEl.setAttribute('data-render-resolution', Math.round(W * nextPixelRatio) + 'x' + Math.round(H * nextPixelRatio));
            });

            ro.observe(canvasEl);

            var galaxyCleanedUp = false;
            canvasEl._galaxyCleanup = function (preserveContext) {

              if (galaxyCleanedUp) return;
              galaxyCleanedUp = true;

              try { if (window._galaxyVR && window._galaxyVR.destroy) window._galaxyVR.destroy(); window._galaxyVR = null; } catch(e){}
              if (animId) { cancelAnimationFrame(animId); animId = null; }
              if (canvasEl._galaxyStarCountTimer) { clearTimeout(canvasEl._galaxyStarCountTimer); canvasEl._galaxyStarCountTimer = null; }
              if (canvasEl._galaxyAgeTimer) { clearTimeout(canvasEl._galaxyAgeTimer); canvasEl._galaxyAgeTimer = null; }
              if (canvasEl._galaxyStatusTimer) { clearTimeout(canvasEl._galaxyStatusTimer); canvasEl._galaxyStatusTimer = null; }
              if (reducedMotionQuery) { if (reducedMotionQuery.removeEventListener) reducedMotionQuery.removeEventListener('change', onGalaxyReducedMotionChange); else if (reducedMotionQuery.removeListener) reducedMotionQuery.removeListener(onGalaxyReducedMotionChange); }

              canvasEl.removeEventListener('pointerdown', onGalDown);

              canvasEl.removeEventListener('pointermove', onGalMove);

              canvasEl.removeEventListener('pointerup', onGalUp);

              canvasEl.removeEventListener('pointercancel', onGalUp);

              canvasEl.removeEventListener('wheel', onGalWheel);

              canvasEl.removeEventListener('click', onGalClick);

              ro.disconnect();
              if (galaxyViewObserver) { galaxyViewObserver.disconnect(); galaxyViewObserver = null; }
              if (canvasEl._galaxyFullscreenRestore) { document.removeEventListener('fullscreenchange', canvasEl._galaxyFullscreenRestore); canvasEl._galaxyFullscreenRestore = null; }

              if (composer) {
                composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); });
                if (composer.dispose) {
                  composer.dispose();
                } else {
                  // EffectComposer r128 has no dispose(). Its two full-resolution
                  // targets otherwise survive scene rebuilds until GC, quickly
                  // exhausting GPU memory and making later programs fail to link.
                  var disposedComposerTargets = new Set();
                  [composer.renderTarget1, composer.renderTarget2, composer.readBuffer, composer.writeBuffer].forEach(function (target) {
                    if (target && target.dispose && !disposedComposerTargets.has(target)) {
                      disposedComposerTargets.add(target);
                      target.dispose();
                    }
                  });
                }
              }

              supernovae.forEach(function (sn) { disposeSNPart(sn.sprite); disposeSNPart(sn.ring); disposeSNPart(sn.label); if (sn.light) scene.remove(sn.light); });
              var disposedGalaxyTextures = new Set(), disposedGalaxyMaterials = new Set(), disposedGalaxyGeometries = new Set();
              scene.traverse(function (obj) {
                if (obj.geometry && obj.geometry.dispose && !disposedGalaxyGeometries.has(obj.geometry)) { disposedGalaxyGeometries.add(obj.geometry); obj.geometry.dispose(); }
                var materials = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
                materials.forEach(function (material) {
                  if (!material || disposedGalaxyMaterials.has(material)) return;
                  disposedGalaxyMaterials.add(material);
                  ['map', 'alphaMap', 'emissiveMap'].forEach(function (mapKey) { var texture = material[mapKey]; if (texture && texture.dispose && !disposedGalaxyTextures.has(texture)) { disposedGalaxyTextures.add(texture); texture.dispose(); } });
                  if (material.dispose) material.dispose();
                });
              });

              if (renderer.renderLists && renderer.renderLists.dispose) renderer.renderLists.dispose();
              renderer.dispose();
              if (!preserveContext && renderer.forceContextLoss) renderer.forceContextLoss();
              canvasEl._galaxyCleanup = null;

            };

          }



          var selStar = d.selectedStar ? STAR_TYPES.find(function (s) { return s.id === d.selectedStar; }) : null;

          var selNeb = d.selectedNebula ? NEBULAE.find(function (n) { return n.name === d.selectedNebula; }) : null;
          var selectedStarMeasurement = d.selectedStarMeasurement || null;
          var GALAXY_DISK_RADIUS_KPC = 15;
          function orbitalMeasurementForModel(model, radiusKpc) {
            var rKpc = Math.max(0.6, radiusKpc || 0.6), speed;
            if (model === 'keplerian') speed = Math.min(320, 220 * Math.sqrt(8.2 / Math.max(1.2, rKpc)));
            else if (model === 'rigid') speed = Math.min(320, 220 * rKpc / 8.2);
            else speed = Math.max(55, 220 * Math.min(1, rKpc / 2.4));
            var periodMyr = 2 * Math.PI * rKpc * 977.8 / Math.max(1, speed);
            var enclosedMassSolar = 232500 * speed * speed * rKpc;
            return { model: model, speed: speed, periodMyr: periodMyr, enclosedMassSolar: enclosedMassSolar };
          }
          var selectedRadiusKpc = selectedStarMeasurement ? Math.max(0.6, selectedStarMeasurement.radiusNorm * GALAXY_DISK_RADIUS_KPC) : 0;
          var rotationMeasurementRows = selectedStarMeasurement ? ['keplerian', 'flat', 'rigid'].map(function (model) { return orbitalMeasurementForModel(model, selectedRadiusKpc); }) : [];
          var activeRotationMeasurement = rotationMeasurementRows.find(function (row) { return row.model === rotMode; }) || null;
          function formatGalaxyMass(massSolar) {
            if (massSolar >= 1e12) return (massSolar / 1e12).toFixed(2) + ' trillion M☉';
            if (massSolar >= 1e9) return (massSolar / 1e9).toFixed(1) + ' billion M☉';
            return Math.round(massSolar / 1e6) + ' million M☉';
          }

          // Re-validate on read as well as on write: a bank persisted by an older
          // build (or restored from a snapshot) may predate the sanitizer.
          var generatedBank = sanitizeGeneratedQuiz(d.dynamicQuiz);
          var ACTIVE_BANK = generatedBank.length > 0 ? generatedBank : QUIZ_BANK;
          var quizIndex = Math.min(Math.max(0, d.quizIdx || 0), ACTIVE_BANK.length - 1);
          var quizQ = d.quizMode ? (ACTIVE_BANK[quizIndex] || null) : null;

          var inspectLog = d.inspectLog || {};
          var addInspectKey = function (key) {
            var next = Object.assign({}, d.inspectLog || {});
            next[key] = true;
            return next;
          };
          galaxyRuntimeRef.current.addInspectKey = addInspectKey;
          galaxyRuntimeRef.current.awardStemXP = awardStemXP;
          galaxyRuntimeRef.current.patchGalaxy = patchGalaxy;
          var galaxyCanvasElementRef = React.useCallback(function (el) {
            if (!el) { canvasRefCb(null); return; }
            el._onSelectStar = function (sd) {
              var runtime = galaxyRuntimeRef.current;
              var key = 'star:' + sd.type.id;
              var radiusNorm = Math.sqrt(sd.x * sd.x + sd.z * sd.z);
              runtime.patchGalaxy({ selectedStar: sd.type.id, selectedNebula: null, selectedStarMeasurement: { x: sd.x, y: sd.y, z: sd.z, radiusNorm: radiusNorm, luminosity: sd.luminosity || 1, index: sd.idx }, hasMeasuredStar: true, inspectTarget: key, inspectLog: runtime.addInspectKey(key) });
              if (typeof runtime.awardStemXP === 'function') runtime.awardStemXP('galaxy_explore', 2, 'Discovered ' + sd.type.label + ' star');
            };
            el._onSelectNebula = function (neb) {
              var runtime = galaxyRuntimeRef.current;
              var key = 'nebula:' + neb.name;
              runtime.patchGalaxy({ selectedNebula: neb.name, selectedStar: null, selectedStarMeasurement: null, inspectTarget: key, inspectLog: runtime.addInspectKey(key) });
              if (typeof runtime.awardStemXP === 'function') runtime.awardStemXP('galaxy_explore', 3, 'Discovered ' + neb.name);
            };
            el._onClearSelection = function () { galaxyRuntimeRef.current.patchGalaxy({ selectedNebula: null, selectedStar: null, selectedStarMeasurement: null, inspectTarget: 'galaxyType' }); };
            el._onTourStateChange = function (active) { galaxyRuntimeRef.current.patchGalaxy({ galaxyTourActive: !!active }); };
            el._onMotionPreferenceChange = function (reduced) { if (reduced) galaxyRuntimeRef.current.patchGalaxy({ galaxyAutoRotate: false, galaxyTourActive: false }); };
            canvasRefCb(el);
          }, [canvasRefCb]);
          var inspectTarget = d.inspectTarget || (selStar ? 'star:' + selStar.id : selNeb ? 'nebula:' + selNeb.name : 'galaxyType');
          var INSPECT_TARGETS = {
            galaxyType: {
              icon: gType.icon,
              title: gType.label,
              type: __alloT('stem.galaxy.inspect_galaxytype_type', 'Galaxy shape'),
              color: '#6366f1',
              desc: gType.desc,
              facts: [gType.example, (gType.arms ? gType.arms + ' ' + __alloT('stem.galaxy.fact_arm_pattern', 'arm pattern') : __alloT('stem.galaxy.fact_no_arms', 'None')), gType.barLength ? __alloT('stem.galaxy.fact_bar_present', 'Central bar present') : __alloT('stem.galaxy.fact_bar_absent', 'No central bar')],
              factLabels: [__alloT('stem.galaxy.fact_example', 'Example'), __alloT('stem.galaxy.fact_arms', 'Arms'), __alloT('stem.galaxy.fact_bar', 'Bar')],
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
                // Naming the quantity beats a generic "Signal 1": these tiles hold a
                // temperature, a mass range, and a lifetime, and the reader could not
                // tell which was which.
                factLabels: [__alloT('stem.galaxy.fact_temperature', 'Temperature'), __alloT('stem.galaxy.fact_mass', 'Mass'), __alloT('stem.galaxy.fact_lifetime', 'Lifetime')],
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
                factLabels: [__alloT('stem.galaxy.fact_distance', 'Distance'), __alloT('stem.galaxy.fact_made_of', 'Made of'), __alloT('stem.galaxy.fact_type', 'Type')],
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
                { label: __alloT('stem.galaxy.mission_step_inspect_darkhalo', 'Inspect dark halo evidence'), done: !!inspectLog.darkMatter || !!inspectLog['observe:gravity'] },
                { label: __alloT('stem.galaxy.mission_step_measure_star', 'Measure a star orbit'), done: !!d.hasMeasuredStar }
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
                { label: __alloT('stem.galaxy.mission_step_test_doppler', 'Test Doppler shift'), done: dopplerTouched },
                { label: __alloT('stem.galaxy.mission_step_record_evidence', 'Record an evidence note'), done: galaxyEvidenceNote.trim().length >= 12 }
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

          // The Real Sky container is keyed on target+survey+catalog, so every target
          // click REMOUNTS it and builds a fresh Aladin Lite instance. Nothing ever
          // disposed the old one, so a learner working through the twelve targets left
          // twelve live instances behind, each holding canvases, tile caches and
          // listeners. React also calls a ref with null on every re-render (this
          // callback is a new identity each time), so disposal is deferred by a tick
          // and cancelled if the same element comes straight back.
          var disposeRealSkyAladin = function (el) {
            if (!el || !el._galaxyAladin) return;
            var instance = el._galaxyAladin;
            el._galaxyAladin = null;
            el._galaxyAladinSignature = '';
            try { if (instance.destroy) instance.destroy(); } catch (destroyError) {}
            try { if (typeof el.replaceChildren === 'function') el.replaceChildren(); else el.innerHTML = ''; } catch (clearError) {}
          };

          var realSkyRefCb = React.useCallback(function (el) {
            if (!el) {
              // The callback identity is stable across status renders. Defer disposal
              // for genuine target changes/unmounts and verify the node disconnected.
              // dispose if the node really did leave the document.
              var detached = realSkyElementRef.current;
              if (!detached) return;
              if (detached._galaxyAladinDisposeTimer) clearTimeout(detached._galaxyAladinDisposeTimer);
              detached._galaxyAladinDisposeTimer = setTimeout(function () {
                detached._galaxyAladinDisposeTimer = null;
                if (!detached.isConnected) {
                  disposeRealSkyAladin(detached);
                  if (realSkyElementRef.current === detached) realSkyElementRef.current = null;
                }
              }, 0);
              return;
            }
            if (el._galaxyAladinDisposeTimer) { clearTimeout(el._galaxyAladinDisposeTimer); el._galaxyAladinDisposeTimer = null; }
            realSkyElementRef.current = el;
            if (!el.id) el.id = 'galaxy-real-sky-aladin';
            if (el._galaxyAladinLoading) return;
            if (el._galaxyAladin) { syncRealSkyAladin(el); return; }
            el._galaxyAladinLoading = true;
            setRealSkyStatus('loading', 'Loading Aladin Lite real-sky atlas...');
            ensureGalaxyAladinLite(function (ok) {
              el._galaxyAladinLoading = false;
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
          }, [activeRealSkyTarget.key, activeRealSkySurvey.id, activeRealSkyCatalog.id, realSkyRetry]);



          // ── Toggle handler ──

          var toggleLayer = function (key) {
            if (morphologyVisual.hiddenLayers[key]) return;

            var newLayers = Object.assign({}, layers);

            newLayers[key] = !newLayers[key];

            upd("layers", newLayers);

            // Quest hook 'toggle_layers' reads layersToggled — record every layer the learner has touched.
            var seenLayers = Object.assign({}, d.layersToggled);

            seenLayers[key] = true;

            upd("layersToggled", seenLayers);

            var cv = galaxyCanvasActive.current;

            if (cv && cv._setLayerVisibility) cv._setLayerVisibility(key, newLayers[key]);
            var layerDefinition = LAYER_TOGGLES.filter(function (layer) { return layer.key === key; })[0];
            var layerLabel = layerDefinition ? layerDefinition.label : key;
            if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'layer:' + key, (newLayers[key] ? 'Showing ' : 'Hiding ') + layerLabel + ' layer.', { debounce: 250 });

          };



          var LAYER_TOGGLES = [

            { key: 'arms', icon: galaxyType === 'elliptical' ? '\u2B2D\uFE0F' : '\uD83C\uDF00', label: galaxyType === 'elliptical' ? __alloT('stem.galaxy.stellar_body', 'Stellar Body') : t('stem.galaxy.spiral_arms') },

            { key: 'bulge', icon: '\uD83D\uDFE1', label: t('stem.galaxy.central_bulge') },

            { key: 'blackHole', icon: '\uD83D\uDD73\uFE0F', label: t('stem.galaxy.black_hole') },

            { key: 'nebulae', icon: '\u2728', label: t('stem.galaxy.nebulae') },

            { key: 'bgStars', icon: '\uD83C\uDF0C', label: t('stem.galaxy.background') },

            { key: 'grid', icon: '\uD83D\uDCCF', label: t('stem.galaxy.scale_grid') },

            { key: 'labels', icon: '\uD83C\uDFF7\uFE0F', label: t('stem.galaxy.labels') },

            { key: 'dust', icon: '\uD83C\uDF2B\uFE0F', label: __alloT('stem.galaxy.layer_dust_lanes', 'Dust Lanes') },

            { key: 'gas', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.layer_gas_clouds', 'Gas Clouds') }

          ];
          var GALAXY_CONTROL_PANEL_KEYS = ['view', 'motion', 'time', 'discover'];
          var moveGalaxyControlTab = function (event, currentKey) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].indexOf(event.key) === -1) return;
            event.preventDefault();
            var currentIndex = GALAXY_CONTROL_PANEL_KEYS.indexOf(currentKey);
            var nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? GALAXY_CONTROL_PANEL_KEYS.length - 1 : (currentIndex + ((event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1) + GALAXY_CONTROL_PANEL_KEYS.length) % GALAXY_CONTROL_PANEL_KEYS.length;
            var nextKey = GALAXY_CONTROL_PANEL_KEYS[nextIndex];
            upd('galaxyControlPanel', nextKey);
            window.requestAnimationFrame(function () { var nextTab = document.getElementById('galaxy-tab-' + nextKey); if (nextTab) nextTab.focus(); });
          };
          var enabledLayerLabels = LAYER_TOGGLES.filter(function (layer) { return !morphologyVisual.hiddenLayers[layer.key] && layers[layer.key] !== false; }).map(function (layer) { return layer.label; });
          var galaxySelectionSummary = selStar ? selStar.label + ' star' : selNeb ? selNeb.name : __alloT('stem.galaxy.summary_no_selection', 'No object selected');
          var galaxyMotionSummary = galaxyReducedMotion ? __alloT('stem.galaxy.summary_motion_reduced', 'Reduced motion; automatic movement disabled') : galaxyAutoRotate ? __alloT('stem.galaxy.summary_motion_rotating', 'Gentle automatic rotation active') : __alloT('stem.galaxy.summary_motion_paused', 'Automatic rotation paused');



          return React.createElement("div", { "data-galaxy-root": "true", role: "region", "aria-labelledby": "galaxy-tool-title", className: "max-w-7xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            renderTutorial('galaxy', _tutGalaxy),

            // ── Header ──

            React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { var cv = galaxyCanvasActive.current; if (cv && cv._galaxyCleanup) cv._galaxyCleanup(); setStemLabTool(null); }, className: "flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100", 'aria-label': __alloT('stem.galaxy.aria_back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { id: "galaxy-tool-title", className: "text-xl font-black text-slate-900" }, "\uD83C\uDF0C " + __alloT('stem.galaxy.header_title', 'Galaxy Explorer')),

              React.createElement("div", { className: "flex flex-nowrap gap-1 ml-auto max-sm:ml-0 max-sm:w-full overflow-x-auto bg-slate-100 rounded-xl p-1 snap-x snap-mandatory", role: "group", "aria-label": __alloT('stem.galaxy.mode_switcher_label', 'Galaxy Explorer modes') },

                [{ key: 'galaxy', icon: '\uD83C\uDF0C', label: __alloT('stem.galaxy.mode_galaxy', 'Galaxy') }, { key: 'blackHole', icon: '\uD83D\uDD73\uFE0F', label: __alloT('stem.galaxy.mode_black_hole', 'Black Hole') }, { key: 'realSky', icon: '\uD83D\uDD2D', label: __alloT('stem.galaxy.mode_real_sky', 'Real Sky') }, { key: 'star', icon: '\u2B50', label: __alloT('stem.galaxy.mode_star_life', 'Star Life') }, { key: 'quiz', icon: '\uD83E\uDDE0', label: __alloT('stem.galaxy.mode_quiz', 'Quiz') }, { key: 'metalHunt', icon: '\uD83C\uDF1F', label: __alloT('stem.galaxy.mode_metallicity', 'Metallicity') }].map(function (m) {

                  var isActive = m.key === 'quiz' ? d.quizMode : (!d.quizMode && simMode === m.key);

                  return React.createElement("button", { "data-galaxy-mode": m.key, "aria-label": "Switch to " + m.label + " mode", "aria-pressed": isActive ? "true" : "false", type: "button",

                    key: m.key, onClick: function () {

                      if (m.key === 'quiz') { 
                        patchGalaxy({ quizMode: true, quizIdx: 0, quizScore: 0, quizStreak: 0, quizFeedback: null, quizDone: false, isGeneratingQuiz: true, dynamicQuiz: null });
                        var prompt = "Generate 5 challenging multiple-choice questions about stars, galaxies, and astrophysics. Return ONLY valid JSON format exactly like this: [{\"q\": \"Question...\", \"a\": \"Correct Answer\", \"options\": [\"Correct Answer\", \"Opt2\", \"Opt3\", \"Opt4\"]}]. Ensure no markdown backticks wrap the output.";
                        if (typeof callGemini === 'function') {
                            callGemini(prompt, function(res) {
                                upd("isGeneratingQuiz", false);
                                if (res && res.text) {
                                    try {
                                        var cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
                                        var qList = JSON.parse(cleaned);
                                        var safeList = sanitizeGeneratedQuiz(qList);
                                        // A model reply missing `options` used to crash the render
                                        // (quizQ.options.map); one missing its own answer produced an
                                        // unanswerable item. Drop bad items, keep the static bank if
                                        // nothing usable survives.
                                        if (safeList.length > 0) {
                                            upd("dynamicQuiz", safeList);
                                        } else {
                                            console.warn("Galaxy quiz: generated questions were unusable; keeping the built-in bank.");
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

                    }, className: "shrink-0 snap-start min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-white')

                  }, m.icon + ' ' + m.label);

                })

              )

            ),



            // ── Galaxy Simulation Mode ──

            !d.quizMode && simMode === 'galaxy' && React.createElement("div", null,

              // ── Galaxy type selector ──

              React.createElement("div", { className: "mb-3 flex flex-wrap items-center gap-2", role: "group", "aria-labelledby": "galaxy-shape-label" },

                React.createElement("span", { id: "galaxy-shape-label", className: "mr-1 text-xs font-black uppercase tracking-wider text-slate-500" }, __alloT('stem.galaxy.galaxy_shape_label', 'Galaxy shape')),

                Object.keys(GALAXY_TYPES).map(function (key) {

                  var gt = GALAXY_TYPES[key];

                  return React.createElement("button", { key: key, type: "button", "data-galaxy-shape": key, "aria-pressed": galaxyType === key ? "true" : "false",

                    onClick: function () {

                      upd("galaxyType", key);

                      // Canvas Narration: galaxy type switch
                      if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'galaxyType', {
                        first: 'Switched to ' + gt.label + ' galaxy. ' + gt.desc + ' Example: ' + gt.example + '.',
                        repeat: gt.label + ' galaxy active.',
                        terse: gt.label
                      });

                    },

                    className: "min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors " + (galaxyType === key ? 'border-indigo-400 bg-indigo-100 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200')

                  }, gt.icon + " " + gt.label);

                })

              ),



              // ── Canvas-first workspace ──
              React.createElement("div", { className: "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start" },              // ── 3D Canvas ──

              React.createElement("div", { className: "relative rounded-2xl overflow-hidden border xl:sticky xl:top-4", style: { height: 'clamp(360px, 58vw, 620px)', background: 'radial-gradient(circle at 50% 44%, rgba(79,70,229,0.26), rgba(15,23,42,0.78) 42%, #020208 86%)', borderColor: 'rgba(129,140,248,0.42)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 -46px 90px rgba(2,6,23,0.76), 0 22px 48px rgba(15,23,42,0.24)' } },

                React.createElement("p", { id: "galaxy-canvas-description", className: "sr-only" }, __alloT('stem.galaxy.canvas_description', 'Interactive three-dimensional galaxy model.') + " " + gType.label + ", " + cosmicAge.toFixed(1) + " billion years old. " + activeObserve.label + " observing mode. " + __alloT('stem.galaxy.canvas_description_layers', 'Visible structures can include stars, dust lanes, gas, nebulae, the galactic core, and the dark-matter halo.')),
                React.createElement("p", { id: "galaxy-canvas-instructions", className: "sr-only" }, __alloT('stem.galaxy.canvas_keyboard_instructions', 'When the galaxy canvas has focus, use the arrow keys to orbit, plus and minus to zoom, left and right brackets or Page Up and Page Down to move between stars, Escape to clear a selection, and R to reset. Equivalent on-screen buttons are available after the canvas.')),
                React.createElement("p", { id: "galaxy-motion-note", className: "sr-only" }, galaxyReducedMotion ? __alloT('stem.galaxy.motion_preference_on', 'Reduced-motion preference detected. Automatic rotation and cinematic tours are disabled.') : __alloT('stem.galaxy.motion_preference_off', 'The galaxy rotates gently by default. Use the pause rotation button to stop automatic motion.')),
                React.createElement("span", { id: "galaxy-canvas-status", "data-galaxy-announcer": "true", className: "sr-only", role: "status", "aria-live": "polite", "aria-atomic": "true" }, selStar ? ("Focused on " + selStar.label) : selNeb ? ("Focused on " + selNeb.name) : __alloT('stem.galaxy.canvas_status_ready', 'Galaxy canvas ready for exploration.')),

                d.webglError ?
                  // ── 2-D fallback, not an error screen ──
                  // This used to be a red "3D Mode Unresolved" card with nothing
                  // behind it: on a device without WebGL, or a network that
                  // blocks the three.js CDN, the student lost the galaxy
                  // entirely and was told their hardware was at fault — which
                  // is only one of the three ways this state is reached.
                  //
                  // The morphology is drawn in Canvas2D from the same
                  // GALAXY_TYPES fields the 3-D scene uses, so the shape the
                  // panels describe is still on screen and every other part of
                  // the tool keeps working. The notice explains what is reduced
                  // and, where we can tell, why.
                  (function () {
                    var reason = d.webglErrorReason || 'initFailed';
                    var probe = galaxyWebglStatus();
                    var why = reason === 'noThree'
                      ? __alloT('stem.galaxy.fallback_why_cdn', 'The 3-D engine is loaded from the internet and could not be fetched — often a school network or offline device.')
                      : reason === 'noWebgl'
                        ? __alloT('stem.galaxy.fallback_why_nowebgl', 'This browser reports no WebGL support, which the 3-D view needs.')
                        : reason === 'contextFailed'
                          ? __alloT('stem.galaxy.fallback_why_context', 'WebGL exists here but a drawing surface could not be created — usually too many 3-D views open at once, or hardware acceleration switched off.')
                          : __alloT('stem.galaxy.fallback_why_init', 'The 3-D scene could not finish building on this device.');
                    return React.createElement("div", {
                      className: "relative", style: { height: "100%", background: "#02030a" },
                      "data-galaxy-fallback": reason
                    },
                      React.createElement("canvas", {
                        "data-galaxy-fallback-canvas": "true",
                        role: "img",
                        "aria-label": __alloT('stem.galaxy.fallback_canvas_aria', 'Flat illustration of the selected galaxy shape, shown because the interactive 3-D view is unavailable.') + ' ' + (gType.desc || ''),
                        style: { width: "100%", height: "100%", display: "block" },
                        ref: function (el) {
                          if (!el) return;
                          // Redraw only when the shape actually changes: React
                          // hands a callback ref null-then-element on every
                          // commit, and re-running a few thousand draw calls per
                          // keystroke would be its own bug.
                          if (el.getAttribute('data-fallback-drawn') === galaxyType) return;
                          galaxyDrawFallback(el, {
                            type: galaxyType, arms: gType.arms,
                            barLength: gType.barLength, windTightness: gType.windTightness
                          });
                          el.setAttribute('data-fallback-drawn', galaxyType);
                        }
                      }),
                      React.createElement("div", {
                        className: "absolute left-3 right-3 bottom-3 rounded-xl border border-slate-600 bg-slate-900/90 p-3 text-left",
                        role: "status"
                      },
                        React.createElement("p", { className: "text-xs font-bold text-amber-200 mb-1" },
                          "⚠️ " + __alloT('stem.galaxy.fallback_title', 'Showing a flat view — the interactive 3-D galaxy is unavailable')),
                        React.createElement("p", { className: "text-[11px] text-slate-200 leading-relaxed mb-2" },
                          why + ' ' + __alloT('stem.galaxy.fallback_still_works', 'Everything else on this page still works: filters, the object inspector, star life, and the quiz.')),
                        React.createElement("button", {
                          onClick: function () { patchGalaxy({ webglError: false, webglErrorReason: null }); },
                          className: "min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors text-xs"
                        }, __alloT('stem.galaxy.retry_3d_mode', 'Retry 3D Mode')),
                        probe.renderer ? React.createElement("p", { className: "mt-2 text-[11px] text-slate-300" },
                          __alloT('stem.galaxy.fallback_gpu_label', 'Graphics reported by this browser:') + ' ' + probe.renderer) : null
                      )
                    );
                  })() :
                  React.createElement("canvas", {

                    "data-galaxy-canvas": "true", "data-auto-rotate": galaxyAutoRotate ? "true" : "false", "data-hud-hidden": galaxyHudHidden ? "true" : "false", "data-tour-active": galaxyTourActive ? "true" : "false", "data-quality": galaxyQuality, tabIndex: 0, role: "application", "aria-label": __alloT('stem.galaxy.aria_galaxy_canvas', 'Interactive galaxy simulation'), "aria-describedby": "galaxy-canvas-description galaxy-canvas-instructions galaxy-motion-note galaxy-canvas-status", "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown + - [ ] PageUp PageDown Escape R", ref: galaxyCanvasElementRef, onKeyDown: function (e) {

                    var cv = e.target; if (!cv || !cv._galaxyOrbit) return;

                    var orb = cv._galaxyOrbit, upCam = cv._galaxyUpdateCam;

                    if (e.key === 'ArrowLeft') { e.preventDefault(); orb.theta -= 0.1; upCam(); }

                    else if (e.key === 'ArrowRight') { e.preventDefault(); orb.theta += 0.1; upCam(); }

                    else if (e.key === 'ArrowUp') { e.preventDefault(); orb.phi = Math.max(0.1, orb.phi - 0.1); upCam(); }

                    else if (e.key === 'ArrowDown') { e.preventDefault(); orb.phi = Math.min(Math.PI - 0.1, orb.phi + 0.1); upCam(); }

                    else if (e.key === '+' || e.key === '=') { e.preventDefault(); if (cv._galaxyZoom) cv._galaxyZoom('in'); else { orb.r = Math.max(0.2, orb.r * 0.9); upCam(); } }

                    else if (e.key === '-') { e.preventDefault(); if (cv._galaxyZoom) cv._galaxyZoom('out'); else { orb.r = Math.min(3, orb.r * 1.1); upCam(); } }

                    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (cv._galaxyResetView) cv._galaxyResetView(); else { orb.theta = Math.PI * 0.1; orb.phi = Math.PI * 0.35; orb.r = 1.2; upCam(); } }

                    else if (e.key === ']' || e.key === 'PageDown') { e.preventDefault(); if (cv._galaxyCycleStar) cv._galaxyCycleStar(1); }

                    else if (e.key === '[' || e.key === 'PageUp') { e.preventDefault(); if (cv._galaxyCycleStar) cv._galaxyCycleStar(-1); }

                    else if (e.key === 'Escape') { e.preventDefault(); if (cv._galaxyClearSelection) cv._galaxyClearSelection(); }

                  }, className: "block focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-cyan-300", style: { width: '100%', height: '100%', cursor: 'grab', background: 'transparent', touchAction: 'none' }

                }),

                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 46%, transparent 34%, rgba(2,6,23,0.62) 100%), linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.045) 1px, transparent 1px)', backgroundSize: '100% 100%, 44px 44px, 44px 44px', mixBlendMode: 'screen', opacity: 0.34 } }),
                React.createElement("div", { "aria-hidden": true, style: { position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.3) 9%, rgba(2,6,23,0) 20%, rgba(2,6,23,0) 80%, rgba(2,6,23,0.34) 91%, rgba(2,6,23,0.88) 100%)', opacity: 0.86 } }),
                React.createElement("div", { "data-galaxy-observe-transition": "true", "aria-hidden": true, style: { position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', opacity: 0, mixBlendMode: 'screen' } }),
                !galaxyHudHidden && galaxySceneReady && React.createElement("div", { "data-galaxy-instrument-reticle": "true", "aria-hidden": true, className: "pointer-events-none absolute inset-3 z-[4]" },
                  React.createElement("span", { className: "absolute left-0 top-0 h-8 w-8 border-l border-t", style: { borderColor: activeObserve.accent + '99', filter: 'drop-shadow(0 0 5px ' + activeObserve.accent + '66)' } }),
                  React.createElement("span", { className: "absolute right-0 top-0 h-8 w-8 border-r border-t", style: { borderColor: activeObserve.accent + '99', filter: 'drop-shadow(0 0 5px ' + activeObserve.accent + '66)' } }),
                  React.createElement("span", { className: "absolute bottom-0 left-0 h-8 w-8 border-b border-l", style: { borderColor: activeObserve.accent + '99', filter: 'drop-shadow(0 0 5px ' + activeObserve.accent + '66)' } }),
                  React.createElement("span", { className: "absolute bottom-0 right-0 h-8 w-8 border-b border-r", style: { borderColor: activeObserve.accent + '99', filter: 'drop-shadow(0 0 5px ' + activeObserve.accent + '66)' } }),
                  React.createElement("span", { className: "absolute left-1/2 top-0 h-2 w-px -translate-x-1/2", style: { background: activeObserve.accent + '88' } }),
                  React.createElement("span", { className: "absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2", style: { background: activeObserve.accent + '88' } }),
                  React.createElement("div", { className: "absolute left-1/2 top-1/2 hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-40 sm:block", style: { borderColor: activeObserve.accent, boxShadow: '0 0 18px ' + activeObserve.accent + '33' } },
                    React.createElement("span", { className: "absolute left-1/2 top-1/2 h-px w-12 -translate-x-1/2 -translate-y-1/2", style: { background: 'linear-gradient(90deg,transparent,' + activeObserve.accent + ',transparent)' } }),
                    React.createElement("span", { className: "absolute left-1/2 top-1/2 h-12 w-px -translate-x-1/2 -translate-y-1/2", style: { background: 'linear-gradient(180deg,transparent,' + activeObserve.accent + ',transparent)' } }),
                    React.createElement("span", { className: "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full", style: { background: activeObserve.accent, boxShadow: '0 0 8px ' + activeObserve.accent } })
                  )
                ),

                // Three.js is fetched from a CDN, so on school wi-fi this box could sit
                // empty for several seconds while the status pill already claimed
                // "Drag to orbit". Honest progress instead, cleared by initGalaxy.
                !d.webglError && !galaxySceneReady && React.createElement("div", { "data-galaxy-building": "true", className: "absolute inset-0 z-[8] flex flex-col items-center justify-center gap-3 text-center", style: { pointerEvents: 'none', background: 'radial-gradient(circle at 50% 46%, rgba(15,23,42,0.35), rgba(2,6,23,0.72))' }, role: "status", "aria-live": "polite" },
                  React.createElement("div", { className: "h-9 w-9 rounded-full border-2 border-indigo-300/30 border-t-cyan-300 motion-safe:animate-spin motion-reduce:animate-none", "aria-hidden": true }),
                  React.createElement("p", { className: "text-xs font-black tracking-wide text-cyan-100" }, __alloT('stem.galaxy.building_scene', 'Building the galaxy…')),
                  React.createElement("p", { className: "max-w-[16rem] text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.building_scene_sub', 'Placing stars, dust lanes and nebulae. This can take a moment on a slow connection.'))
                ),
                React.createElement("div", { "aria-hidden": true, className: "absolute inset-x-0 top-0 z-[7] bg-slate-950 transition-all duration-700", style: { height: galaxyTourActive ? '5.5%' : '0', opacity: galaxyTourActive ? 0.92 : 0, pointerEvents: 'none' } }),
                React.createElement("div", { "aria-hidden": true, className: "absolute inset-x-0 bottom-0 z-[7] bg-slate-950 transition-all duration-700", style: { height: galaxyTourActive ? '5.5%' : '0', opacity: galaxyTourActive ? 0.92 : 0, pointerEvents: 'none' } }),
                React.createElement("div", { "data-galaxy-camera-controls": "true", className: "absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5 sm:right-3", role: "toolbar", "aria-label": __alloT('stem.galaxy.aria_camera_controls', 'Galaxy camera controls') },
                  [{ key: 'zoomIn', icon: '+', label: __alloT('stem.galaxy.camera_zoom_in', 'Zoom in'), action: function (cv) { if (cv._galaxyZoom) cv._galaxyZoom('in'); } },
                   { key: 'zoomOut', icon: '−', label: __alloT('stem.galaxy.camera_zoom_out', 'Zoom out'), action: function (cv) { if (cv._galaxyZoom) cv._galaxyZoom('out'); } },
                   { key: 'reset', icon: '⌂', label: __alloT('stem.galaxy.camera_reset', 'Reset camera'), action: function (cv) { if (cv._galaxyResetView) cv._galaxyResetView(); } }].map(function (control) {
                    return React.createElement("button", { type: "button", key: control.key, title: control.label, "aria-label": control.label, onClick: function () { var cv = galaxyCanvasActive.current; if (cv) control.action(cv); }, className: "flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/75 text-lg font-black text-white shadow-lg backdrop-blur-md transition-colors hover:border-cyan-300/50 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" }, control.icon);
                  }),
                  React.createElement("button", { type: "button", disabled: galaxyReducedMotion, title: galaxyReducedMotion ? __alloT('stem.galaxy.camera_motion_disabled', 'Automatic rotation disabled by reduced-motion preference') : galaxyAutoRotate ? __alloT('stem.galaxy.camera_pause_rotation', 'Pause auto-rotation') : __alloT('stem.galaxy.camera_resume_rotation', 'Resume auto-rotation'), "aria-label": galaxyReducedMotion ? __alloT('stem.galaxy.camera_motion_disabled', 'Automatic rotation disabled by reduced-motion preference') : galaxyAutoRotate ? __alloT('stem.galaxy.camera_pause_rotation', 'Pause auto-rotation') : __alloT('stem.galaxy.camera_resume_rotation', 'Resume auto-rotation'), "aria-describedby": "galaxy-motion-note", "aria-pressed": galaxyAutoRotate, onClick: function () { var next = !galaxyAutoRotate; upd('galaxyAutoRotate', next); var cv = galaxyCanvasActive.current; if (cv && cv._galaxySetAutoRotate) cv._galaxySetAutoRotate(next); }, className: "flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-black shadow-lg backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 " + (galaxyAutoRotate ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-100" : "border-white/10 bg-slate-950/75 text-slate-300 hover:bg-slate-900") }, "↻"),
                  React.createElement("button", { type: "button", title: galaxyHudHidden ? __alloT('stem.galaxy.camera_show_labels', 'Show simulation labels') : __alloT('stem.galaxy.camera_hide_labels', 'Hide simulation labels'), "aria-label": galaxyHudHidden ? __alloT('stem.galaxy.camera_show_labels', 'Show simulation labels') : __alloT('stem.galaxy.camera_hide_labels', 'Hide simulation labels'), "aria-pressed": !galaxyHudHidden, onClick: function () { var nextHidden = !galaxyHudHidden; upd('galaxyHudHidden', nextHidden); var cv = galaxyCanvasActive.current; if (cv && cv._galaxySetHudHidden) cv._galaxySetHudHidden(nextHidden); }, className: "flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/75 text-base font-black text-white shadow-lg backdrop-blur-md transition-colors hover:border-indigo-300/50 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" }, galaxyHudHidden ? "◫" : "◩"),
                  React.createElement("button", { type: "button", disabled: galaxyReducedMotion, title: galaxyReducedMotion ? __alloT('stem.galaxy.camera_tour_disabled', 'Cinematic tour disabled by reduced-motion preference') : galaxyTourActive ? __alloT('stem.galaxy.camera_stop_tour', 'Stop cinematic tour') : __alloT('stem.galaxy.camera_start_tour', 'Start cinematic tour'), "aria-label": galaxyReducedMotion ? __alloT('stem.galaxy.camera_tour_disabled', 'Cinematic tour disabled by reduced-motion preference') : galaxyTourActive ? __alloT('stem.galaxy.camera_stop_tour', 'Stop cinematic tour') : __alloT('stem.galaxy.camera_start_tour', 'Start cinematic tour'), "aria-describedby": "galaxy-motion-note", "aria-pressed": galaxyTourActive, onClick: function () { var nextTour = !galaxyTourActive; upd('galaxyTourActive', nextTour); var cv = galaxyCanvasActive.current; if (cv && cv._galaxySetTour) cv._galaxySetTour(nextTour); }, className: "flex h-11 w-11 items-center justify-center rounded-xl border text-base font-black shadow-lg backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 " + (galaxyTourActive ? "border-fuchsia-300/50 bg-fuchsia-400/20 text-fuchsia-100" : "border-white/10 bg-slate-950/75 text-white hover:border-fuchsia-300/50 hover:bg-slate-900") }, galaxyTourActive ? "■" : "▶"),
                  React.createElement("button", { type: "button", title: __alloT('stem.galaxy.camera_fullscreen', 'Toggle fullscreen'), 'aria-label': __alloT('stem.galaxy.camera_fullscreen', 'Toggle fullscreen'), onClick: function () { var cv = galaxyCanvasActive.current; if (cv && cv._galaxyToggleFullscreen) cv._galaxyToggleFullscreen(); }, className: "flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/75 text-base font-black text-white shadow-lg backdrop-blur-md transition-colors hover:border-indigo-300/50 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" }, "⛶")
                ),
                // Compact spectral legend — the letters "O B A F G K M" mean nothing
                // on their own to a learner seeing a field of coloured stars. Showing
                // the actual STAR_TYPES colour beside each class makes the canvas
                // readable, and it now survives on phones instead of being hidden.
                !galaxyHudHidden && React.createElement("div", { className: "absolute top-3 left-3 rounded-2xl border border-indigo-200/15 bg-slate-950/75 px-2.5 py-1.5 text-white/90 shadow-lg backdrop-blur-md", role: "img", "aria-label": __alloT('stem.galaxy.aria_spectral_legend', 'Star colour key, hottest to coolest: O B A F G K M — blue is hottest, red is coolest.') },
                  React.createElement("div", { className: "flex items-end gap-[3px]", "aria-hidden": true },
                    STAR_TYPES.map(function (st) {
                      return React.createElement("div", { key: st.id, className: "flex flex-col items-center gap-0.5", title: st.label + " · " + st.temp + " K" },
                        React.createElement("span", { className: "block h-2.5 w-3.5 rounded-[3px] sm:w-4", style: { background: st.color, boxShadow: '0 0 6px ' + st.color + '99' } }),
                        React.createElement("span", { className: "text-[11px] font-black leading-none text-white/90" }, st.id)
                      );
                    })
                  ),
                  React.createElement("div", { className: "mt-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300", "aria-hidden": true },
                    React.createElement("span", null, __alloT('stem.galaxy.legend_hot', 'hot')),
                    React.createElement("span", { className: "text-slate-500" }, "→"),
                    React.createElement("span", null, __alloT('stem.galaxy.legend_cool', 'cool'))
                  )
                ),
                !galaxyHudHidden && React.createElement("div", { "data-galaxy-instrument-readout": "true", className: "absolute right-3 top-3 z-10 hidden w-52 rounded-xl border bg-slate-950/82 p-2.5 text-white shadow-xl backdrop-blur-md md:block", style: { borderColor: activeObserve.accent + '55' }, role: "img", "aria-label": activeObserve.label + ' instrument readout. ' + activeInstrument.detector + '. Band ' + activeInstrument.band + '. Traces ' + activeInstrument.tracer + '.' },
                  React.createElement("div", { className: "flex items-start justify-between gap-2" },
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em]", style: { color: activeObserve.accent } }, activeObserve.icon + " " + activeObserve.label),
                      React.createElement("p", { className: "mt-0.5 text-xs font-black text-white" }, activeInstrument.detector)
                    ),
                    React.createElement("span", { className: "rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-bold text-slate-200" }, activeInstrument.band)
                  ),
                  React.createElement("div", { className: "mt-2 h-1.5 rounded-full opacity-90", style: { background: activeInstrument.gradient, boxShadow: '0 0 10px ' + activeObserve.accent + '55' }, "aria-hidden": true }),
                  React.createElement("div", { className: "mt-1.5 flex items-center justify-between gap-2 text-[11px]" },
                    React.createElement("span", { className: "min-w-0 truncate font-bold text-slate-300" }, activeInstrument.tracer),
                    React.createElement("span", { className: "shrink-0 font-black text-cyan-100" }, cosmicAge.toFixed(1) + " Gyr")
                  ),
                  React.createElement("p", { className: "mt-1 truncate text-[11px] text-slate-400" }, gType.icon + " " + gType.label)
                ),
                !galaxyHudHidden && observeMode === 'infrared' && React.createElement("div", { "data-galaxy-infrared-legend": "true", className: "pointer-events-none absolute bottom-14 left-3 z-10 w-[min(14rem,calc(100%_-_5.5rem))] rounded-xl border border-orange-200/20 bg-slate-950/80 p-2.5 text-white shadow-xl backdrop-blur-md", role: "img", "aria-label": __alloT('stem.galaxy.infrared_legend_aria', 'Infrared view: visible dust extinction decreases while warm dust thermal emission and embedded protostars brighten.') },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em] text-orange-100" }, __alloT('stem.galaxy.infrared_legend_title', 'Infrared radiative transfer')),
                  React.createElement("div", { className: "mt-1.5 flex items-center justify-between gap-2 text-[11px] font-bold" }, React.createElement("span", { className: "text-slate-300" }, __alloT('stem.galaxy.infrared_extinction_down', 'Dust shadow ↓')), React.createElement("span", { className: "text-orange-200" }, __alloT('stem.galaxy.infrared_emission_up', 'Thermal glow ↑'))),
                  React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.infrared_legend_note', 'Dust absorbs short-wavelength starlight and re-radiates that energy in the infrared.'))
                ),
                !galaxyHudHidden && observeMode === 'xray' && React.createElement("div", { "data-galaxy-xray-legend": "true", className: "pointer-events-none absolute bottom-14 left-3 z-10 w-[min(16rem,calc(100%_-_5.5rem))] rounded-xl border border-sky-200/20 bg-slate-950/82 p-2.5 text-white shadow-xl backdrop-blur-md", role: "img", "aria-label": __alloT('stem.galaxy.xray_legend_aria', 'X-ray plasma key. Brighter points mark compact high-energy sources. Nested violet, cyan, and white arcs map cooler through hotter supernova shock layers. The central bicone traces a nuclear hot-gas outflow.') },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em] text-sky-100" }, __alloT('stem.galaxy.xray_legend_title', 'High-energy plasma map')),
                  React.createElement("div", { className: "mt-1.5 h-2 rounded-full bg-gradient-to-r from-indigo-950 via-sky-400 to-white shadow-[0_0_10px_rgba(125,211,252,0.5)]", "aria-hidden": true }),
                  React.createElement("div", { "data-galaxy-xray-structure-key": "true", className: "mt-2 space-y-1.5 border-t border-white/10 pt-2 text-[11px] font-bold text-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "flex w-9 shrink-0 items-center justify-center", "aria-hidden": true }, React.createElement("span", { className: "h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(224,242,254,1)]" })), React.createElement("span", null, __alloT('stem.galaxy.xray_beacon_key', 'Beacon = compact high-energy source'))),
                    React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "relative h-4 w-9 shrink-0", "aria-hidden": true }, React.createElement("span", { className: "absolute left-2 top-0 h-4 w-4 rounded-full border border-violet-300" }), React.createElement("span", { className: "absolute left-3 top-1 h-2 w-2 rounded-full border border-cyan-200" })), React.createElement("span", null, __alloT('stem.galaxy.xray_shock_key', 'Nested arcs = shock temperature layers'))),
                    React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "relative h-5 w-9 shrink-0", "aria-hidden": true }, React.createElement("span", { className: "absolute left-[14px] top-0 h-2.5 w-2 -skew-x-[20deg] border-x border-t border-sky-200" }), React.createElement("span", { className: "absolute bottom-0 left-[14px] h-2.5 w-2 skew-x-[20deg] border-x border-b border-violet-300" })), React.createElement("span", null, __alloT('stem.galaxy.xray_outflow_key', 'Bicone = nuclear hot-gas outflow')))
                  ),
                  React.createElement("p", { className: "mt-1.5 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.xray_legend_note', 'Color and intensity encode plasma energy, not ordinary visible-light brightness.'))
                ),
                !galaxyHudHidden && observeMode === 'radio' && React.createElement("div", { "data-galaxy-radio-velocity-legend": "true", className: "pointer-events-none absolute bottom-14 left-3 z-10 w-[min(16rem,calc(100%_-_5.5rem))] rounded-xl border border-cyan-200/20 bg-slate-950/82 p-2.5 text-white shadow-xl backdrop-blur-md", role: "img", "aria-label": __alloT('stem.galaxy.radio_velocity_aria', 'Radio observation key. The blue-to-red field shows approaching through receding hydrogen. Short line segments trace projected magnetic-field direction. Cyan and magenta ribbons separate Faraday-rotation depth.') },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100" }, __alloT('stem.galaxy.radio_velocity_title', '21 cm velocity + magnetic field')),
                  React.createElement("div", { className: "mt-1.5 h-2 rounded-full bg-gradient-to-r from-blue-600 via-slate-200 to-red-600 shadow-[0_0_10px_rgba(56,189,248,0.28)]", "aria-hidden": true }),
                  React.createElement("div", { className: "mt-1 flex justify-between gap-2 text-[11px] font-bold" }, React.createElement("span", { className: "text-blue-200" }, __alloT('stem.galaxy.radio_velocity_toward', '← Approaching')), React.createElement("span", { className: "text-red-200" }, __alloT('stem.galaxy.radio_velocity_away', 'Receding →'))),
                  React.createElement("div", { "data-galaxy-radio-polarization-key": "true", className: "mt-2 space-y-1.5 border-t border-white/10 pt-2 text-[11px] font-bold text-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "relative h-3 w-9 shrink-0", "aria-hidden": true }, React.createElement("span", { className: "absolute left-0 top-1/2 h-px w-9 -translate-y-1/2 -rotate-12 bg-cyan-200 shadow-[0_0_6px_rgba(103,232,249,0.9)]" })),
                      React.createElement("span", null, __alloT('stem.galaxy.radio_field_direction', 'Line orientation = magnetic-field direction'))
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "h-1.5 w-9 shrink-0 rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 shadow-[0_0_7px_rgba(216,180,254,0.7)]", "aria-hidden": true }),
                      React.createElement("span", null, __alloT('stem.galaxy.radio_faraday_depth', 'Ribbon color = Faraday depth'))
                    )
                  ),
                  React.createElement("p", { className: "mt-1.5 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.radio_velocity_note', 'Velocity color maps motion; aligned ticks and layered ribbons reveal magnetized gas along the same sightline.'))
                ),
                !galaxyHudHidden && observeMode === 'gravity' && React.createElement("div", { "data-galaxy-gravity-legend": "true", className: "pointer-events-none absolute bottom-14 left-3 z-10 w-[min(16rem,calc(100%_-_5.5rem))] rounded-xl border border-fuchsia-200/20 bg-slate-950/82 p-2.5 text-white shadow-xl backdrop-blur-md", role: "img", "aria-label": __alloT('stem.galaxy.gravity_legend_aria', 'Gravity inference key. Orbital speed constrains enclosed mass, while aligned weak-lensing arclets trace projected halo mass. This is an evidence map, not a photograph.') },
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/50", "aria-hidden": true },
                      React.createElement("span", { className: "h-5 w-5 rounded-full border border-violet-200/50" }),
                      React.createElement("span", { className: "absolute -right-1 top-1 h-5 w-2 rotate-45 rounded-full border-r-2 border-cyan-200" })
                    ),
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em] text-fuchsia-100" }, __alloT('stem.galaxy.gravity_legend_title', 'Mass inference field')),
                      React.createElement("p", { className: "text-[11px] text-slate-300" }, __alloT('stem.galaxy.gravity_legend_sub', 'Two measurements, one invisible halo'))
                    )
                  ),
                  React.createElement("div", { className: "mt-2 space-y-1.5 text-[11px] font-bold text-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "w-8 text-center text-cyan-200", "aria-hidden": true }, '↻'), React.createElement("span", null, __alloT('stem.galaxy.gravity_orbit_key', 'Orbital speed → enclosed mass'))),
                    React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "w-8 text-center text-fuchsia-200", "aria-hidden": true }, '⌒'), React.createElement("span", null, __alloT('stem.galaxy.gravity_lensing_key', 'Arclet shear → projected mass')))
                  ),
                  React.createElement("p", { className: "mt-1.5 border-t border-white/10 pt-1.5 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.gravity_legend_note', 'The luminous disk is observed; the larger halo is reconstructed from motion and lensing evidence.'))
                ),
                galaxyType !== 'elliptical' && !galaxyHudHidden && selectedStarMeasurement && selStar && activeRotationMeasurement && React.createElement("div", {
                  "data-galaxy-measurement": "true",
                  className: "pointer-events-none absolute left-3 top-20 z-10 w-[min(15rem,calc(100%_-_5.5rem))] rounded-xl border border-cyan-200/25 bg-slate-950/82 p-3 text-white shadow-2xl backdrop-blur-md",
                  role: "status",
                  "aria-live": "polite"
                },
                  React.createElement("div", { className: "flex items-start justify-between gap-2" },
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-xs font-black uppercase tracking-[0.12em] text-cyan-200" }, __alloT('stem.galaxy.measurement_title', 'Galactocentric measurement')),
                      React.createElement("p", { className: "mt-0.5 text-[11px] text-slate-300" }, selStar.label + " · " + (rotMode === 'flat' ? __alloT('stem.galaxy.model_flat_short', 'flat observed model') : rotMode === 'keplerian' ? __alloT('stem.galaxy.model_keplerian_short', 'visible-matter model') : __alloT('stem.galaxy.model_rigid_short', 'rigid toy model')))
                    ),
                    React.createElement("span", { className: "rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] font-black text-cyan-100" }, "⌖")
                  ),
                  React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-1.5" },
                    [
                      { label: __alloT('stem.galaxy.measure_radius', 'Radius'), value: selectedRadiusKpc.toFixed(1) + ' kpc' },
                      { label: __alloT('stem.galaxy.measure_speed', 'Orbital speed'), value: Math.round(activeRotationMeasurement.speed) + ' km/s' },
                      { label: __alloT('stem.galaxy.measure_period', 'Orbital period'), value: Math.round(activeRotationMeasurement.periodMyr) + ' Myr' },
                      { label: __alloT('stem.galaxy.measure_mass', 'Mass inside orbit'), value: formatGalaxyMass(activeRotationMeasurement.enclosedMassSolar) }
                    ].map(function (metric) { return React.createElement("div", { key: metric.label, className: "rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5" },
                      React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wide text-slate-400" }, metric.label),
                      React.createElement("p", { className: "mt-0.5 text-xs font-black tabular-nums text-white" }, metric.value)
                    ); })
                  ),
                  React.createElement("div", { "data-galaxy-orbit-vectors": "true", className: "mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[11px] font-bold text-slate-200" },
                    React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("span", { className: "h-0.5 w-5 bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]", "aria-hidden": true }), __alloT('stem.galaxy.vector_velocity', 'Motion is tangent')),
                    React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("span", { className: "h-0.5 w-5 bg-fuchsia-300 shadow-[0_0_8px_rgba(244,114,182,0.9)]", "aria-hidden": true }), __alloT('stem.galaxy.vector_gravity', 'Gravity points inward'))
                  ),
                  React.createElement("p", { className: "mt-1.5 text-[11px] leading-relaxed text-cyan-100/80" }, __alloT('stem.galaxy.measurement_ruler_note', 'The cyan ruler measures radius. Sideways motion plus an inward gravitational pull continuously bends the star onto the glowing orbit path. Change the model to test a new speed and period.'))
                ),
                galaxyScienceOverlay && !selectedStarMeasurement && !galaxyHudHidden && !galaxyTourActive && galaxySceneReady && React.createElement("div", { "data-galaxy-science-overlay": "true", className: "pointer-events-none absolute inset-0 z-[5] hidden md:block", "aria-hidden": true },
                  React.createElement("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", className: "absolute inset-0 h-full w-full", "aria-hidden": true, focusable: "false" },
                    activeObserveGuide.marks.map(function (mark) { return React.createElement("g", { key: mark.label },
                      React.createElement("line", { x1: mark.lx, y1: mark.ly, x2: mark.tx, y2: mark.ty, stroke: activeObserve.accent, strokeWidth: 0.35, strokeDasharray: "1.4 1.1", opacity: 0.72, vectorEffect: "non-scaling-stroke" }),
                      React.createElement("circle", { cx: mark.tx, cy: mark.ty, r: 1.15, fill: "none", stroke: activeObserve.accent, strokeWidth: 0.45, opacity: 0.92, vectorEffect: "non-scaling-stroke" }),
                      React.createElement("circle", { cx: mark.tx, cy: mark.ty, r: 0.32, fill: activeObserve.accent, opacity: 0.95 })
                    ); })
                  ),
                  // Right-anchored labels are positioned from the RIGHT edge,
                  // not with left+translate(-100%). With `left: 96%` the box
                  // only has 4% of the container to size itself in, and
                  // shrink-to-fit runs BEFORE the transform moves it — so every
                  // right-hand label rendered about 70px wide, one word per
                  // line, at every viewport size. Anchoring from the right lets
                  // it take its natural width up to max-w.
                  //
                  // pointer-events-none because these are annotations with
                  // nothing to click, and 9 of the 14 sit over the control
                  // column: they were swallowing clicks on "Hide simulation
                  // labels", "Start cinematic tour" and "Toggle fullscreen" in
                  // every observe mode.
                  activeObserveGuide.marks.map(function (mark) { return React.createElement("div", { key: "label-" + mark.label, className: "absolute max-w-[10.5rem] rounded-lg border bg-slate-950/80 px-2.5 py-2 text-white shadow-xl backdrop-blur-md pointer-events-none", style: Object.assign({ top: mark.ly + '%', transform: 'translate(0, -50%)', borderColor: activeObserve.accent + '88' }, mark.anchor === 'right' ? { right: (100 - mark.lx) + '%' } : { left: mark.lx + '%' }) },
                    React.createElement("p", { className: "text-[11px] font-black leading-tight" }, activeObserve.icon + " " + mark.label),
                    React.createElement("p", { className: "mt-0.5 text-[11px] leading-tight text-slate-300" }, mark.detail)
                  ); })
                ),
                !galaxyHudHidden && React.createElement("div", { "data-galaxy-orientation": "true", className: "absolute left-1/2 top-3 hidden -translate-x-1/2 rounded-full border border-cyan-200/15 bg-slate-950/75 px-3 py-2 text-xs font-bold text-cyan-100 shadow-lg backdrop-blur-md lg:block" }, "Angled view"),
                !galaxyHudHidden && galaxySceneReady && React.createElement("div", { "data-galaxy-live-scale": "true", className: "pointer-events-none absolute left-1/2 top-14 z-[6] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-violet-200/15 bg-slate-950/72 px-3 py-1.5 text-[11px] font-bold text-violet-100 shadow-lg backdrop-blur-md md:flex", role: "img", "aria-label": __alloT('stem.galaxy.live_scale_aria', 'Approximate field of view and current galactic scale regime') },
                  React.createElement("span", { className: "h-px w-5 bg-gradient-to-r from-transparent to-violet-300", "aria-hidden": true }),
                  React.createElement("span", { "data-galaxy-live-scale-value": "true" }, "~21 kpc field"),
                  React.createElement("span", { className: "text-violet-300/60", "aria-hidden": true }, "·"),
                  React.createElement("span", { "data-galaxy-scale-regime": "true", className: "text-cyan-100" }, "Galactic structure"),
                  React.createElement("span", { className: "h-px w-5 bg-gradient-to-l from-transparent to-violet-300", "aria-hidden": true })
                ),
                // Held back until the scene exists — announcing "drag to orbit" to a
                // screen reader while the canvas is still empty is just wrong.
                galaxySceneReady && React.createElement("div", { "data-galaxy-status": "true", className: galaxyHudHidden ? "sr-only" : "absolute bottom-3 left-3 max-w-[calc(100%_-_5.5rem)] rounded-full border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-bold text-slate-100 shadow-lg backdrop-blur-md pointer-events-none" }, selStar ? ("Focused on " + selStar.label + " · drag or use arrow keys to orbit") : selNeb ? ("Focused on " + selNeb.name + " · drag or use arrow keys to orbit") : "Drag or use arrows to orbit · scroll, pinch, or +/- to zoom · [ ] selects stars"),
                // Scale info overlay

                !galaxyHudHidden && layers.grid && React.createElement("div", { className: "absolute bottom-3 right-16 bg-slate-950/70 backdrop-blur-md rounded-lg px-2.5 py-2 text-xs text-white/85 border border-blue-200/15 shadow-xl" },

                  React.createElement("div", { className: "font-bold mb-1 text-blue-300" }, "\uD83D\uDCCF " + __alloT('stem.galaxy.scale_overlay_title', 'Scale')),

                  SCALE_INFO.map(function (s) { return React.createElement("div", { key: s.label, className: "flex justify-between gap-3" }, React.createElement("span", { className: "text-white/50" }, s.label), React.createElement("span", { className: "font-bold" }, s.value)); })

                )

              ),



                React.createElement("aside", { className: "rounded-2xl border border-slate-200 bg-slate-50/95 p-3 shadow-lg shadow-slate-900/5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" },
                  React.createElement("div", { className: "mb-3 flex items-start gap-3" },
                    React.createElement("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-700 text-lg text-white shadow-md", "aria-hidden": true }, "✦"),
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("h4", { className: "text-sm font-black text-slate-900" }, __alloT('stem.galaxy.controls_title', 'Galaxy controls')),
                      React.createElement("p", { className: "text-xs leading-relaxed text-slate-600" }, __alloT('stem.galaxy.controls_sub', 'Adjust the view without losing sight of the simulation.'))
                    )
                  ),
                  React.createElement("div", { className: "mb-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-200/70 p-1", role: "tablist", "aria-orientation": "horizontal", "aria-label": __alloT('stem.galaxy.aria_control_groups', 'Galaxy control groups') },
                    [{ key: 'view', icon: '◉', label: 'View' }, { key: 'motion', icon: '↻', label: 'Motion' }, { key: 'time', icon: '◷', label: 'Time' }, { key: 'discover', icon: '⌖', label: 'Discover' }].map(function (panel) {
                      var active = galaxyControlPanel === panel.key;
                      // A tab without id/aria-controls leaves screen readers unable to
                      // connect the tab to the panel it reveals; roving tabindex keeps
                      // the group a single stop in the tab order.
                      return React.createElement("button", { type: "button", key: panel.key, role: "tab", "data-galaxy-control-tab": panel.key, id: "galaxy-tab-" + panel.key, "aria-controls": "galaxy-panel-" + panel.key, "aria-selected": active, tabIndex: active ? 0 : -1, onKeyDown: function (event) { moveGalaxyControlTab(event, panel.key); }, onClick: function () { upd('galaxyControlPanel', panel.key); }, className: "min-h-[44px] rounded-lg px-1.5 py-2 text-xs font-black transition-colors " + (active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900") },
                        React.createElement("span", { className: "block text-sm", "aria-hidden": true }, panel.icon), __alloT('stem.galaxy.control_group_' + panel.key, panel.label));
                    })
                  ),
                  galaxyControlPanel === 'view' && React.createElement("div", { className: "space-y-3", role: "tabpanel", id: "galaxy-panel-view", "aria-labelledby": "galaxy-tab-view" },              // ── Observatory Filters ──
              React.createElement("div", { "data-galaxy-observatory": "true", className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                React.createElement("div", { className: "flex flex-wrap items-start gap-2 mb-2" },
                  React.createElement("span", { className: "text-lg", "aria-hidden": true }, activeObserve.icon),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.observatory_filters_title', 'Observatory Filters')),
                    React.createElement("p", { className: "text-xs text-slate-500 leading-relaxed" }, activeObserve.label + ": " + activeObserve.desc)
                  )
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                  OBSERVE_MODES.map(function (mode) {
                    var on = mode.key === observeMode;
                    var seen = !!inspectLog['observe:' + mode.key];
                    return React.createElement("button", {
                      type: "button",
                      key: mode.key,
                      "aria-pressed": on ? "true" : "false",
                      onClick: function () {
                        var cv = galaxyCanvasActive.current;
                        if (cv && cv._galaxyClearSelection) cv._galaxyClearSelection();
                        if (cv && cv._setObserveMode) cv._setObserveMode(mode.key);
                        var nextLog = addInspectKey('observe:' + mode.key);
                        nextLog[mode.target] = true;
                        var nextObserveHistory = Array.isArray(d.observeHistory) ? d.observeHistory.slice() : [observeMode];
                        if (nextObserveHistory[nextObserveHistory.length - 1] !== mode.key) nextObserveHistory.push(mode.key);
                        patchGalaxy({ observeMode: mode.key, previousObserveMode: mode.key !== observeMode ? observeMode : d.previousObserveMode, observeHistory: nextObserveHistory.slice(-8), selectedStar: null, selectedStarMeasurement: null, selectedNebula: null, inspectTarget: mode.target, inspectLog: nextLog });
                        if (!seen && typeof awardStemXP === 'function') awardStemXP('galaxy_observe', 1, 'Used ' + mode.label + ' filter');
                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'observeMode', {
                          first: mode.label + ' observing mode. ' + mode.desc,
                          repeat: mode.label + ' observing mode active.',
                          terse: mode.label
                        }, { debounce: 500 });
                      },
                      className: "text-left rounded-lg border min-h-[44px] px-3 py-2 transition-colors " + (on ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-white"),
                      style: { borderColor: on || seen ? mode.accent : '#e2e8f0' }
                    },
                      React.createElement("span", { className: "block text-xs font-black leading-tight" }, mode.icon + " " + mode.label + (seen ? " ✓" : "")),
                      React.createElement("span", { className: "block text-[11px] leading-tight mt-0.5", style: { color: on ? '#cbd5e1' : '#64748b' } }, mode.note)
                    );
                  })
                )
              ),



              // ── Layer toggles ──

              React.createElement("div", { "data-galaxy-observation-guide": "true", className: "rounded-xl border bg-white p-3 shadow-sm", style: { borderColor: activeObserve.accent + '55' } },
                React.createElement("div", { className: "flex items-start gap-2" },
                  React.createElement("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base", style: { background: activeObserve.accent + '18', color: activeObserve.accent }, "aria-hidden": true }, activeObserve.icon),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.observation_guide_title', 'Observe - compare - explain')),
                    React.createElement("p", { className: "mt-0.5 text-xs leading-relaxed text-slate-600" }, activeObserveGuide.question)
                  ),
                  React.createElement("span", { className: "rounded-full px-2 py-1 text-[11px] font-black", style: { background: activeObserve.accent + '16', color: activeObserve.accent } }, Array.from(new Set(observeHistory)).length + '/5')
                ),
                React.createElement("div", { className: "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1" },
                  React.createElement("div", { className: "rounded-lg bg-emerald-50 p-2 text-xs text-emerald-950" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.guide_strong_signal', 'Strong signal: ')), activeObserveGuide.sees),
                  React.createElement("div", { className: "rounded-lg bg-slate-100 p-2 text-xs text-slate-700" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.guide_blind_spot', 'Blind spot: ')), activeObserveGuide.misses)
                ),
                React.createElement("p", { className: "mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-xs leading-relaxed text-indigo-950" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.guide_inference_label', 'Inference: ')), activeObserveGuide.inference),
                observeMode === 'gravity' && React.createElement("div", { "data-galaxy-weak-lensing-guide": "true", className: "mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 p-2 text-xs leading-relaxed text-fuchsia-950" },
                  React.createElement("p", { className: "font-black" }, __alloT('stem.galaxy.weak_lensing_title', 'Read the arclets beyond the disk')),
                  React.createElement("p", { className: "mt-0.5" }, __alloT('stem.galaxy.weak_lensing_explain', 'Background galaxies appear stretched tangentially around the halo. Their shared alignment maps foreground mass, including matter that emits no light.'))
                ),
                observeMode === 'radio' && React.createElement("div", { "data-galaxy-radio-velocity-guide": "true", className: "mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs leading-relaxed text-cyan-950" },
                  React.createElement("p", { className: "font-black" }, __alloT('stem.galaxy.radio_velocity_guide_title', 'Read rotation from the color split')),
                  React.createElement("p", { className: "mt-0.5" }, __alloT('stem.galaxy.radio_velocity_guide_body', 'The 21 cm line shifts blue on the approaching side and red on the receding side. Mapping that shift across the disk reveals both rotation direction and orbital speed.'))
                ),
                observeMode === 'infrared' && React.createElement("div", { "data-galaxy-infrared-transfer-guide": "true", className: "mt-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs leading-relaxed text-orange-950" },
                  React.createElement("p", { className: "font-black" }, __alloT('stem.galaxy.infrared_transfer_title', 'Track absorbed energy')),
                  React.createElement("p", { className: "mt-0.5" }, __alloT('stem.galaxy.infrared_transfer_body', 'Regions that were dark in visible light can glow in infrared because dust grains absorb starlight, warm up, and emit that energy again at longer wavelengths.'))
                ),
                observeMode === 'xray' && React.createElement("div", { "data-galaxy-xray-energy-guide": "true", className: "mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs leading-relaxed text-sky-950" },
                  React.createElement("p", { className: "font-black" }, __alloT('stem.galaxy.xray_energy_title', 'Separate heat from ordinary brightness')),
                  React.createElement("p", { className: "mt-0.5" }, __alloT('stem.galaxy.xray_energy_body', 'Flickering points trace accreting compact objects and pulsars; expanding arcs trace gas heated to millions of degrees by supernova shocks.'))
                ),
                previousObserve && React.createElement("div", { className: "mt-2 rounded-lg border border-violet-100 bg-violet-50 p-2 text-xs text-violet-950", role: "status", "aria-live": "polite" },
                  React.createElement("p", { className: "font-black" }, previousObserve.icon + " " + previousObserve.label + " -> " + activeObserve.icon + " " + activeObserve.label),
                  React.createElement("p", { className: "mt-0.5 leading-relaxed" }, activeObserveGuide.change)
                ),
                React.createElement("label", { htmlFor: "galaxy-evidence-note", className: "mt-2 block text-[11px] font-black text-slate-700" }, __alloT('stem.galaxy.evidence_note_label', 'Evidence note - what changed, and what does it suggest?')),
                React.createElement("textarea", { id: "galaxy-evidence-note", rows: 2, value: galaxyEvidenceNote, onChange: function (e) { upd('galaxyEvidenceNote', e.target.value); }, placeholder: __alloT('stem.galaxy.evidence_note_placeholder', 'I notice... This suggests... because...'), className: "mt-1 w-full resize-y rounded-lg border border-slate-500 bg-white px-2.5 py-2 text-xs leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" })
              ),
              React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                React.createElement("div", { className: "mb-2 flex items-center justify-between gap-2" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-black text-slate-800" }, __alloT('stem.galaxy.rendering_detail_title', 'Rendering detail')),
                    React.createElement("p", { className: "text-[11px] text-slate-500" }, __alloT('stem.galaxy.rendering_detail_sub', 'Auto adapts to this device; Cinematic maximizes depth and particle detail.'))
                  ),
                  React.createElement("span", { className: "rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700" }, galaxyQuality === 'auto' ? "Adaptive" : galaxyQuality.charAt(0).toUpperCase() + galaxyQuality.slice(1))
                ),
                React.createElement("div", { className: "grid grid-cols-4 gap-1" },
                  ['auto', 'balanced', 'high', 'cinematic'].map(function (quality) {
                    var qualityActive = galaxyQuality === quality;
                    return React.createElement("button", { type: "button", key: quality, "aria-label": "Set " + quality + " galaxy rendering detail", "aria-pressed": qualityActive, onClick: function () { upd('galaxyQuality', quality); }, className: "min-h-[44px] rounded-lg border px-1 py-2 text-[11px] font-black transition-colors " + (qualityActive ? "border-indigo-500 bg-indigo-600 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white") }, quality === 'cinematic' ? "Cinema" : quality.charAt(0).toUpperCase() + quality.slice(1));
                  })
                )
              ),

              React.createElement("button", { type: "button", "data-galaxy-science-toggle": "true", "aria-pressed": galaxyScienceOverlay, onClick: function () { upd('galaxyScienceOverlay', !galaxyScienceOverlay); }, className: "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition-colors " + (galaxyScienceOverlay ? "border-cyan-300 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-slate-50 text-slate-600") },
                React.createElement("span", null, React.createElement("span", { className: "block font-black" }, __alloT('stem.galaxy.science_overlay_title', 'Science labels')), React.createElement("span", { className: "block text-[11px] opacity-75" }, __alloT('stem.galaxy.science_overlay_sub', 'Connect visible features to the evidence they provide.'))),
                React.createElement("span", { className: "rounded-full px-2 py-1 text-[11px] font-black", style: { background: galaxyScienceOverlay ? '#334155' : '#e2e8f0', color: galaxyScienceOverlay ? '#f8fafc' : '#475569' } }, galaxyScienceOverlay ? __alloT('stem.galaxy.overlay_on', 'On') : __alloT('stem.galaxy.overlay_off', 'Off'))
              ),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                LAYER_TOGGLES.map(function (lt) {

                  var isAvailable = !morphologyVisual.hiddenLayers[lt.key];
                  var isOn = isAvailable && layers[lt.key] !== false;

                  return React.createElement("button", { type: "button", "data-galaxy-toggle": lt.key, "aria-label": isAvailable ? (isOn ? __alloT('stem.galaxy.hide_layer', 'Hide') : __alloT('stem.galaxy.show_layer', 'Show')) + " " + lt.label : lt.label + " " + __alloT('stem.galaxy.layer_not_characteristic', 'is not characteristic of elliptical galaxies'), "aria-pressed": isOn ? "true" : "false", disabled: !isAvailable,

                    key: lt.key,

                    onClick: function () { toggleLayer(lt.key); },

                    className: "flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border transition-all " + (!isAvailable ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-75' : isOn ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600')

                  }, lt.icon + " " + lt.label + (isAvailable ? "" : " - " + __alloT('stem.galaxy.layer_minimal', 'minimal')));

                })

              ),



                  ),
                  galaxyControlPanel === 'motion' && React.createElement("div", { className: "space-y-3", role: "tabpanel", id: "galaxy-panel-motion", "aria-labelledby": "galaxy-tab-motion" },              // ── Galaxy rotation & the dark matter mystery ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl border border-indigo-400/30 p-4 shadow-lg" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                  React.createElement("h4", { className: "text-sm font-bold text-white" }, (galaxyType === 'elliptical' ? "⬭ " : "🌀 ") + (galaxyType === 'elliptical' ? __alloT('stem.galaxy.how_elliptical_moves_title', 'How do elliptical stars move?') : __alloT('stem.galaxy.how_galaxy_spin_title', 'How does a galaxy spin?'))),

                  React.createElement("span", { className: "ml-auto text-[11px] font-black uppercase tracking-wider text-fuchsia-300 bg-fuchsia-900/40 border border-fuchsia-700/50 px-2 py-0.5 rounded-full" }, galaxyType === 'elliptical' ? __alloT('stem.galaxy.velocity_dispersion_badge', 'velocity dispersion') : __alloT('stem.galaxy.dark_matter_mystery_badge', 'dark matter mystery'))

                ),

                React.createElement("p", { className: "text-xs text-slate-400 leading-relaxed mb-2" }, galaxyType === 'elliptical' ? __alloT('stem.galaxy.elliptical_motion_intro', 'Elliptical galaxies are pressure-supported: their stars criss-cross the galaxy on differently tilted 3-D orbits instead of sharing one rotating disk.') : __alloT('stem.galaxy.rotation_intro', "Pick a rotation model and watch the stars in the 3-D view above actually obey it. This one question — “how fast do outer stars orbit?” — led to one of the biggest discoveries in physics.")),

                React.createElement("div", { className: "mb-3 flex flex-wrap gap-2 " + (galaxyType === 'elliptical' ? 'hidden' : '') },

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

                        var cv = galaxyCanvasActive.current;

                        if (cv && cv._setRotMode) cv._setRotMode(rm.key);

                        if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'rotMode', {

                          first: 'Rotation model: ' + rm.label + ' — ' + rm.hint + '. Inner and outer stars now orbit at ' + (rm.key === 'rigid' ? 'the same angular speed, like a solid disk' : rm.key === 'keplerian' ? 'Keplerian speeds — inner stars lap the outer ones dramatically' : 'the observed flat-curve speeds — outer stars keep up, which only dark matter can explain') + '.',

                          repeat: rm.label + ' rotation active.',

                          terse: rm.label

                        });

                      },

                      className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border transition-all " + (on ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200 shadow-sm' : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-fuchsia-600')

                    }, rm.label, React.createElement("span", { className: "block text-[11px] font-semibold opacity-70" }, rm.hint));

                  })

                ),

                // Rotation curve chart: orbital speed vs distance from center

                (function () {

                  var CW = 360, CH = 148, padL = 36, padR = 10, padT = 12, padB = 26;
                  if (galaxyType === 'elliptical') {
                    return React.createElement("div", { "data-galaxy-elliptical-kinematics": "true", className: "rounded-xl border border-fuchsia-300/20 bg-slate-950/55 p-3" },
                      React.createElement("svg", { viewBox: "0 0 360 112", className: "w-full", style: { maxHeight: '122px' }, role: "img", "aria-label": __alloT('stem.galaxy.elliptical_orbits_aria', 'Stars cross an elliptical galaxy on many differently tilted orbital planes. Their velocity dispersion supports the galaxy against gravity.') },
                        React.createElement("ellipse", { cx: 180, cy: 54, rx: 112, ry: 39, fill: "rgba(251,191,36,0.08)", stroke: "rgba(253,230,138,0.38)", strokeWidth: 1.4 }),
                        [{ rx: 90, ry: 20, rot: -18, color: '#67e8f9' }, { rx: 82, ry: 28, rot: 24, color: '#f0abfc' }, { rx: 104, ry: 13, rot: 4, color: '#fde68a' }, { rx: 58, ry: 34, rot: -42, color: '#c4b5fd' }].map(function (orbit, orbitIndex) { return React.createElement("ellipse", { key: orbitIndex, cx: 180, cy: 54, rx: orbit.rx, ry: orbit.ry, fill: "none", stroke: orbit.color, strokeWidth: 1.2, strokeDasharray: orbitIndex % 2 ? "4 3" : undefined, opacity: 0.72, transform: "rotate(" + orbit.rot + " 180 54)" }); }),
                        React.createElement("circle", { cx: 180, cy: 54, r: 5, fill: "#fff7d6", stroke: "#fbbf24", strokeWidth: 2 }),
                        React.createElement("text", { x: 180, y: 106, textAnchor: "middle", fill: "#cbd5e1", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.elliptical_orbit_caption', 'many orbital planes · no shared stellar disk'))
                      ),
                      React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center text-[11px]" },
                        React.createElement("div", { className: "rounded-lg bg-white/[0.05] px-2 py-2 text-slate-200" }, React.createElement("span", { className: "block font-black text-amber-200" }, __alloT('stem.galaxy.elliptical_shape_label', 'Shape')), __alloT('stem.galaxy.elliptical_shape_value', 'Triaxial')),
                        React.createElement("div", { className: "rounded-lg bg-white/[0.05] px-2 py-2 text-slate-200" }, React.createElement("span", { className: "block font-black text-cyan-200" }, __alloT('stem.galaxy.elliptical_motion_label', 'Motion')), __alloT('stem.galaxy.elliptical_motion_value', '3-D orbits')),
                        React.createElement("div", { className: "rounded-lg bg-white/[0.05] px-2 py-2 text-slate-200" }, React.createElement("span", { className: "block font-black text-fuchsia-200" }, __alloT('stem.galaxy.elliptical_evidence_label', 'Evidence')), __alloT('stem.galaxy.elliptical_evidence_value', 'Velocity spread'))
                      )
                    );
                  }

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

                React.createElement("p", { className: "text-xs leading-relaxed mt-2 " + (galaxyType === 'elliptical' ? 'text-fuchsia-200' : rotMode === 'flat' ? 'text-cyan-200' : rotMode === 'keplerian' ? 'text-amber-200' : 'text-slate-300') },

                  galaxyType === 'elliptical' ?
                    __alloT('stem.galaxy.elliptical_motion_explain', 'The galaxy stays together because stars move through it in many directions. Astronomers measure the spread of those speeds—velocity dispersion—to infer the mass needed to hold the system together.') :
                  rotMode === 'keplerian' ?
                    __alloT('stem.galaxy.rotation_explain_keplerian', "If starlight were all there is, gravity weakens with distance and outer stars should crawl — watch the galaxy's center above lap the outskirts and the disk shear apart. Our solar system really works this way: Mercury laps Neptune 700 times per Neptune-year.") :

                  rotMode === 'rigid' ?

                    __alloT('stem.galaxy.rotation_explain_rigid', "A toy model — the whole disk turns together like a painted DVD. No real galaxy does this; it would need mass to keep growing with radius squared. Compare it with the other two models!") :

                    __alloT('stem.galaxy.rotation_explain_flat', "In the 1970s Vera Rubin measured real galaxies and found this: outer stars move just as fast as inner ones. Visible matter can't supply that much gravity — an invisible halo of dark matter (~85% of all matter in the universe) must be holding the galaxy together. Nobody yet knows what it is.")

                ),

                galaxyType !== 'elliptical' && selectedStarMeasurement && activeRotationMeasurement && React.createElement("section", { "data-galaxy-rotation-measurement": "true", className: "mt-3 overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950/60", "aria-labelledby": "galaxy-rotation-measurement-title" },
                  React.createElement("div", { className: "border-b border-white/10 bg-gradient-to-r from-cyan-400/10 to-fuchsia-400/10 px-3 py-2.5" },
                    React.createElement("div", { className: "flex items-center justify-between gap-2" },
                      React.createElement("h5", { id: "galaxy-rotation-measurement-title", className: "text-xs font-black text-white" }, __alloT('stem.galaxy.comparison_title', 'Same star, three gravity models')),
                      React.createElement("span", { className: "rounded-full bg-cyan-300/10 px-2 py-1 text-[11px] font-black tabular-nums text-cyan-100" }, selectedRadiusKpc.toFixed(1) + " kpc")
                    ),
                    React.createElement("p", { className: "mt-1 text-[11px] leading-relaxed text-slate-300" }, __alloT('stem.galaxy.comparison_sub', 'Radius stays fixed. Speed and orbital period change because each model assumes a different mass distribution.'))
                  ),
                  React.createElement("div", { className: "overflow-x-auto px-2 py-2" },
                    React.createElement("table", { className: "w-full border-separate border-spacing-y-1 text-left text-[11px]" },
                      React.createElement("caption", { className: "sr-only" }, __alloT('stem.galaxy.comparison_caption', 'Predicted orbital motion for the selected star under three galaxy rotation models')),
                      React.createElement("thead", null,
                        React.createElement("tr", { className: "uppercase tracking-wide text-slate-400" },
                          React.createElement("th", { scope: "col", className: "px-2 py-1 font-bold" }, __alloT('stem.galaxy.comparison_model', 'Model')),
                          React.createElement("th", { scope: "col", className: "px-2 py-1 text-right font-bold" }, __alloT('stem.galaxy.comparison_speed', 'Speed')),
                          React.createElement("th", { scope: "col", className: "px-2 py-1 text-right font-bold" }, __alloT('stem.galaxy.comparison_period', 'Period'))
                        )
                      ),
                      React.createElement("tbody", null,
                        rotationMeasurementRows.map(function (row) {
                          var isActiveModel = row.model === rotMode;
                          var modelLabel = row.model === 'flat' ? __alloT('stem.galaxy.comparison_flat', 'Flat observed') : row.model === 'keplerian' ? __alloT('stem.galaxy.comparison_visible', 'Visible matter') : __alloT('stem.galaxy.comparison_rigid', 'Rigid toy');
                          return React.createElement("tr", { key: row.model, className: isActiveModel ? "bg-cyan-300/15 text-white" : "bg-white/[0.04] text-slate-300", "aria-current": isActiveModel ? "true" : undefined },
                            React.createElement("th", { scope: "row", className: "rounded-l-lg px-2 py-2 font-black" }, modelLabel + (isActiveModel ? " · active" : "")),
                            React.createElement("td", { className: "px-2 py-2 text-right font-bold tabular-nums" }, Math.round(row.speed) + " km/s"),
                            React.createElement("td", { className: "rounded-r-lg px-2 py-2 text-right font-bold tabular-nums" }, Math.round(row.periodMyr) + " Myr")
                          );
                        })
                      )
                    )
                  ),
                  React.createElement("p", { className: "border-t border-white/10 px-3 py-2 text-[11px] leading-relaxed " + (rotMode === 'flat' ? 'text-cyan-100' : rotMode === 'keplerian' ? 'text-amber-100' : 'text-slate-300') },
                    rotMode === 'flat' ? __alloT('stem.galaxy.comparison_evidence_flat', 'Evidence: at large radii, the observed speed stays high. The enclosed mass must keep increasing even where the visible disk fades.') :
                    rotMode === 'keplerian' ? __alloT('stem.galaxy.comparison_evidence_keplerian', 'Prediction from visible matter alone: outer stars slow down and take much longer to orbit.') :
                    __alloT('stem.galaxy.comparison_evidence_rigid', 'Toy prediction: speed rises directly with radius, as if the entire galaxy were a solid object.')
                  )
                ),
                React.createElement("p", { className: "text-[11px] text-slate-500 mt-1.5 italic" }, "💡 " + (galaxyType === 'elliptical' ? __alloT('stem.galaxy.elliptical_motion_note', 'Notice that no single orbital plane dominates. The smooth shape is a statistical pattern made by many crossing stellar paths.') : __alloT('stem.galaxy.rotation_density_wave_note', 'Also notice: the glowing gas lanes hold still while stars stream through them — real spiral arms are density waves (cosmic traffic jams), not fixed pinwheels of stars.')))

              ),



              // ── Star density slider ──

              React.createElement("div", { className: "flex items-center gap-3 px-1" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600 whitespace-nowrap" }, "\u2B50 " + __alloT('stem.galaxy.stars_count_label', 'Stars') + ": " + starCount.toLocaleString()),

                React.createElement("input", {

                  type: "range", min: 2500, max: 100000, step: 2500, value: starCount,

                  'aria-label': __alloT('stem.galaxy.aria_number_of_stars', 'Number of stars'),

                  onChange: function (e) {

                    var val = parseInt(e.target.value, 10);

                    upd("starCount", val);

                    scheduleOnCanvas(galaxyCanvasActive.current, '_galaxyStarCountTimer', 140, function (cv) {

                      if (cv._setStarCount) cv._setStarCount(val);

                    });

                  },

                  className: "flex-1 h-1.5 accent-indigo-500"

                }),

                React.createElement("span", { className: "text-xs text-slate-600 w-12 text-right" }, starCount >= 50000 ? __alloT('stem.galaxy.density_dense', 'Dense') : starCount >= 15000 ? __alloT('stem.galaxy.density_normal', 'Normal') : __alloT('stem.galaxy.density_sparse', 'Sparse'))

              ),



                  ),
                  galaxyControlPanel === 'time' && React.createElement("div", { className: "space-y-3", role: "tabpanel", id: "galaxy-panel-time", "aria-labelledby": "galaxy-tab-time" },              // ── Cosmic Age Time-Lapse ──

              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 " + __alloT('stem.galaxy.cosmic_timelapse_title', 'Cosmic Time-Lapse')),

                  React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicAge.toFixed(1) + " Gyr")

                ),

                React.createElement("div", { className: "flex items-center gap-2" },

                  React.createElement("span", { className: "text-xs text-violet-400 whitespace-nowrap" }, __alloT('stem.galaxy.big_bang_label', 'Big Bang')),

                  React.createElement("input", {

                    type: "range", min: 0.1, max: 14, step: 0.1, value: cosmicAge,

                    'aria-label': __alloT('stem.galaxy.aria_cosmic_age', 'Cosmic age in billion years'),

                    onChange: function (e) {

                      var val = parseFloat(e.target.value);

                      upd("cosmicAge", val);

                      scheduleOnCanvas(galaxyCanvasActive.current, '_galaxyAgeTimer', 90, function (cv) {

                        if (cv._updateAge) cv._updateAge(val);

                      });
                      // Canvas Narration: cosmic age change
                      if (typeof canvasNarrate === 'function') {
                        var ep = getEpochNarration(val);
                        var msg = val.toFixed(1) + ' billion years' + (ep ? '. ' + ep.title : '');
                        canvasNarrate('galaxy', 'cosmicAge', msg, { debounce: 800 });
                      }

                    },

                    className: "flex-1 h-1.5 accent-violet-500"

                  }),

                  React.createElement("span", { className: "text-xs text-violet-400 whitespace-nowrap" }, "14 Gyr")

                ),

                React.createElement("div", { className: "flex gap-1.5 mt-2" },

                  xrSupported && React.createElement("button", {
                    "aria-label": t('vr.enter_title', 'Enter VR (needs a headset)'),
                    title: t('vr.enter_title', 'Enter VR (needs a headset)'),
                    onMouseDown: function (e) { e.preventDefault(); e.stopPropagation(); if (window._galaxyVR && window._galaxyVR.enterVR) window._galaxyVR.enterVR(); },
                    className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold select-none bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
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

                        var cv = galaxyCanvasActive.current;

                        if (cv && cv._updateAge) cv._updateAge(age);

                        if (Math.random() < 0.15 && cv && cv._triggerSupernova) cv._triggerSupernova();

                      }, 150);

                    },

                    className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold select-none " + (window._galaxyTimeLapse ? "bg-red-700 text-white" : "bg-violet-600 text-white hover:bg-violet-700") + " transition-all"

                  }, window._galaxyTimeLapse ? "\u23F9 " + __alloT('stem.galaxy.stop_btn', 'Stop') : "\u25B6 " + __alloT('stem.galaxy.play_timelapse_btn', 'Play Time-Lapse')),

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.aria_trigger_supernova', 'Trigger a random supernova in the galaxy view'), title: __alloT('stem.galaxy.title_trigger_supernova', 'Trigger a random supernova flash in the galaxy view'),

                    onClick: function () {

                      var cv = galaxyCanvasActive.current;

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

                    className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-all"

                  }, "\uD83D\uDCA5 " + __alloT('stem.galaxy.random_supernova_btn', 'Random supernova')),

                  React.createElement("button", { "aria-label": __alloT('stem.galaxy.mode_star_life', 'Star Life'),

                    onClick: function () { patchGalaxy({ quizMode: false, simMode: "star", showLifecycle: true }); },

                    className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 border border-indigo-200 transition-all hover:bg-indigo-50"

                  }, "\u2B50 " + __alloT('stem.galaxy.mode_star_life', 'Star Life') + " \u2192")

                ),

                // This banner sits on the LIGHT time-lapse card, but was styled for a
                // dark panel: text-amber-100 (#fef3c7) on bg-amber-300/10 over
                // violet-50 is about 1.1:1 — the supernova read-out was invisible.
                d.lastGalaxyEvent && React.createElement("div", { className: "mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900", role: "status", "aria-live": "polite" },
                  React.createElement("span", { className: "text-sm leading-none", "aria-hidden": true }, "💥"),
                  React.createElement("span", { className: "min-w-0 flex-1 leading-relaxed" }, d.lastGalaxyEvent)
                ),

                // Milestone labels

                React.createElement("div", { className: "flex justify-between mt-2 text-xs text-violet-400" },

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

                        var cv = galaxyCanvasActive.current;

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

                      React.createElement("p", { className: "text-xs font-bold text-violet-800" }, epoch.title + " (" + epoch.age + " Gyr)"),

                      React.createElement("p", { className: "text-xs text-violet-600 leading-relaxed" }, epoch.desc)

                    )

                  );

                })()

              ),



                  ),
                  galaxyControlPanel === 'discover' && React.createElement("div", { className: "space-y-3", role: "tabpanel", id: "galaxy-panel-discover", "aria-labelledby": "galaxy-tab-discover" },              // ── Warp points ──

              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2" },

                WARP_POINTS.map(function (wp) { return React.createElement("button", { "aria-label": "Warp to " + wp.label, key: wp.label, onClick: function () {
                  var cv = galaxyCanvasActive.current; if (cv && cv._galaxyClearSelection) cv._galaxyClearSelection(); if (cv && cv._galaxyWarp) cv._galaxyWarp(wp);
                  var warpInspect = (wp.zoom === 2 && wp.x === 0 && wp.z === 0) ? 'blackHole' : (wp.zoom === 0.8 ? 'galaxyType' : 'spiralArms');
                  var warpDesc = wp.desc || (warpInspect === 'blackHole' ? __alloT('stem.galaxy.warp_blackhole_desc', 'Sagittarius A* sits in this crowded core; stars orbit it so quickly that an unseen compact mass is required.') : null);
                  var warpPatch = { selectedStar: null, selectedStarMeasurement: null, selectedNebula: null, inspectTarget: warpInspect, inspectLog: addInspectKey(warpInspect) };
                  if (warpDesc) warpPatch.warpInfo = warpDesc;
                  patchGalaxy(warpPatch);
                  // Canvas Narration: warp navigation
                  if (typeof canvasNarrate === 'function') canvasNarrate('galaxy', 'warp', {
                    first: 'Warping to ' + wp.label + '. ' + (wp.desc || 'Camera repositioning to this location.'),
                    repeat: 'Warped to ' + wp.label + '.',
                    terse: wp.label
                  });
                }, className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors" }, "\uD83D\uDE80 " + wp.label); })

              ),



                    React.createElement("p", { className: "rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-800" }, __alloT('stem.galaxy.warp_hint', 'Warp to a landmark, then inspect the evidence card below the workspace.'))
                  )
                ),
                React.createElement("details", { "data-galaxy-accessible-summary": "true", className: "mt-3 rounded-xl border border-slate-300 bg-white" },
                  React.createElement("summary", { className: "flex min-h-[44px] cursor-pointer items-center px-3 py-2 text-xs font-black text-slate-800" }, __alloT('stem.galaxy.accessible_summary_title', 'Text alternative for the 3-D scene')),
                  React.createElement("section", { className: "border-t border-slate-200 p-3", "aria-labelledby": "galaxy-accessible-summary-heading" },
                    React.createElement("h5", { id: "galaxy-accessible-summary-heading", className: "text-xs font-black text-slate-900" }, __alloT('stem.galaxy.accessible_summary_heading', 'Current simulation state')),
                    React.createElement("dl", { className: "mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs" },
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_galaxy', 'Galaxy')),
                      React.createElement("dd", { className: "text-slate-900" }, gType.label),
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_observation', 'Observation')),
                      React.createElement("dd", { className: "text-slate-900" }, activeObserve.label + ': ' + (activeObserve.note || activeObserve.desc)),
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_age', 'Cosmic age')),
                      React.createElement("dd", { className: "text-slate-900" }, cosmicAge.toFixed(1) + ' billion years'),
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_selection', 'Selection')),
                      React.createElement("dd", { className: "text-slate-900" }, galaxySelectionSummary),
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_motion', 'Motion')),
                      React.createElement("dd", { className: "text-slate-900" }, galaxyMotionSummary),
                      React.createElement("dt", { className: "font-bold text-slate-600" }, __alloT('stem.galaxy.summary_layers', 'Visible layers')),
                      React.createElement("dd", { className: "text-slate-900" }, enabledLayerLabels.length ? enabledLayerLabels.join(', ') : __alloT('stem.galaxy.summary_layers_none', 'None'))
                    ),
                    React.createElement("p", { className: "mt-2 text-xs leading-relaxed text-slate-600" }, __alloT('stem.galaxy.accessible_summary_help', 'Every camera and layer action has a keyboard-accessible button. Focus the canvas for arrow-key orbiting, plus and minus zoom, bracket-key star selection, Escape to clear, and R to reset.'))
                  )
                )
              ),
              // ── Galaxy type info card ──

              React.createElement("div", { className: "mt-4 mb-3 px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm shadow-sm" },

                React.createElement("span", { className: "font-bold text-indigo-700" }, gType.icon + " " + gType.label + ": "),

                React.createElement("span", { className: "text-slate-600" }, gType.desc),

                React.createElement("span", { className: "text-indigo-400 ml-1" }, "(e.g. " + gType.example + ")"),

              ),

              React.createElement("details", { className: "group rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm" },
                React.createElement("summary", { className: "flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-black text-slate-800" },
                  React.createElement("span", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-base", "aria-hidden": true }, "🔭"),
                  React.createElement("span", { className: "min-w-0 flex-1" }, __alloT('stem.galaxy.explore_science_summary', 'Explore the science behind the simulation')),
                  React.createElement("span", { className: "text-xs font-bold text-indigo-600 group-open:hidden" }, "Show"),
                  React.createElement("span", { className: "hidden text-xs font-bold text-indigo-600 group-open:inline" }, "Hide")
                ),
                React.createElement("div", { className: "grid grid-cols-1 gap-3 border-t border-slate-200 p-3 lg:grid-cols-2" },              // ── Hubble tuning-fork classification (highlights the current galaxy type) ──
              React.createElement("div", { className: "mb-3 p-2 rounded-lg border border-indigo-100 bg-white" },
                React.createElement("p", { className: "text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1" }, __alloT('stem.galaxy.hubble_tuning_fork_title', 'Hubble Tuning Fork — classified by shape')),
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
                React.createElement("p", { className: "text-[11px] text-slate-500 mt-1" }, __alloT('stem.galaxy.hubble_scheme_note', "Edwin Hubble's 1936 scheme sorts galaxies by SHAPE — it is NOT a timeline. Galaxies do not evolve along the fork from one type to the next."))
              ),

              // ── Cosmological redshift mini-visual (Hubble's law) ──
              React.createElement("div", { className: "mb-3 p-2.5 rounded-lg border border-indigo-200 bg-white" },
                React.createElement("p", { className: "text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1" }, __alloT('stem.galaxy.cosmo_redshift_title', 'Cosmological redshift — farther = faster = redder')),
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
                React.createElement("p", { className: "text-[11px] text-slate-500 mt-1" }, __alloT('stem.galaxy.redshift_note', "Each dark line is the fingerprint of the same element. In a more distant galaxy those lines sit farther toward red — expanding space stretched the light on its way here (Hubble's law: recession speed ∝ distance)."))
              ),

              // ── Doppler shift lab: motion toward/away changes wavelength ──
              React.createElement("div", { "data-galaxy-doppler": "true", className: "mb-3 p-3 rounded-xl border bg-white shadow-sm", style: { borderColor: dopplerColor + '66' } },
                React.createElement("div", { className: "flex flex-wrap items-start gap-2 mb-2" },
                  React.createElement("span", { className: "text-lg", "aria-hidden": true }, dopplerVelocity < -8 ? "\uD83D\uDD35" : dopplerVelocity > 8 ? "\uD83D\uDD34" : "\u26AA"),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider", style: { color: dopplerColor } }, __alloT('stem.galaxy.doppler_lab_title', 'Doppler Shift Lab — toward = blue, away = red')),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, __alloT('stem.galaxy.doppler_lab_desc', 'Move the source along your line of sight. Negative radial velocity moves spectral lines toward blue; positive radial velocity moves them toward red.'))
                  ),
                  React.createElement("span", { className: "px-2 py-0.5 rounded-full text-xs font-black border", style: { color: dopplerColor, borderColor: dopplerColor + '66', background: dopplerColor + '12' } }, dopplerDirection + " • " + dopplerVelocity + " km/s")
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
                  React.createElement("div", { className: "flex items-center justify-between text-[11px] font-bold mb-1" },
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
                      "aria-pressed": on ? "true" : "false",
                      onClick: function () {
                        var nextLog = addInspectKey('dopplerShift');
                        patchGalaxy({ dopplerVelocity: preset.value, inspectLog: nextLog });
                        if (typeof awardStemXP === 'function') awardStemXP('galaxy_doppler', 1, 'Tested Doppler shift');
                      },
                      className: "min-h-[44px] rounded-lg border px-2 py-2 text-left text-xs font-bold transition-all " + (on ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                    }, preset.icon + " " + preset.label, React.createElement("span", { className: "block text-[11px] font-semibold opacity-70" }, (preset.value > 0 ? "+" : "") + preset.value + " km/s"));
                  })
                ),
                React.createElement("div", { className: "mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" },
                  React.createElement("div", { className: "rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-900" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.doppler_blueshift_label', 'Blueshift: ')), __alloT('stem.galaxy.doppler_blueshift_body', 'the source is moving toward us, so wave crests arrive closer together and wavelengths get shorter.')),
                  React.createElement("div", { className: "rounded-lg border border-red-100 bg-red-50 p-2 text-red-900" }, React.createElement("span", { className: "font-black" }, __alloT('stem.galaxy.doppler_redshift_label', 'Redshift: ')), __alloT('stem.galaxy.doppler_redshift_body', 'the source is moving away, so wave crests arrive farther apart and wavelengths get longer.'))
                )
              ),

              // ── Cosmic myth-busters ──
              React.createElement("div", { className: "mb-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed" },
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
                    React.createElement("p", { className: "text-xs text-slate-500" }, activeMission.title + " • " + activeMissionDone + "/" + activeMission.steps.length + " complete")
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
                      "aria-pressed": on ? "true" : "false",
                      onClick: function () { upd("activeGalaxyMission", m.id); },
                      className: "min-h-[44px] px-2.5 py-2 rounded-lg border text-xs font-bold transition-all " + (on ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white")
                    }, m.icon + " " + m.title);
                  })
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                  activeMission.steps.map(function (step, i) {
                    return React.createElement("div", {
                      key: step.label,
                      className: "rounded-lg border px-2.5 py-2 text-xs " + (step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600")
                    },
                      React.createElement("span", { className: "font-black mr-1" }, step.done ? "✓" : (i + 1) + "."),
                      step.label
                    );
                  })
                )
              ),

              )
              ),

              // ── Warp info ──

              d.warpInfo && React.createElement("div", { className: "mt-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-xs text-indigo-700" },

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

                      React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-bold", style: { background: currentInspector.color + '18', color: currentInspector.color } }, currentInspector.type)

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
                        patchGalaxy({ selectedStar: null, selectedStarMeasurement: null, selectedNebula: null, inspectTarget: item.key, inspectLog: addInspectKey(item.key) });
                        if (!alreadySeen && typeof awardStemXP === 'function') awardStemXP('galaxy_inspect', 1, 'Inspected ' + item.label);
                      },
                      className: "min-h-[44px] px-2.5 py-2 rounded-lg border text-xs font-bold transition-all " + (on ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-white"),
                      style: { borderColor: on || seen ? target.color : '#e2e8f0' }
                    }, item.icon + " " + item.label + (seen ? " ✓" : ""));

                  })

                ),

                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-3" },

                  (currentInspector.facts || []).map(function (fact, idx) {

                    // "Signal 1 / 2 / 3" named nothing — a tile reading "30,000+ K"
                    // sat under a heading that told you nothing about it. Where the
                    // quantity is known the label says so; where the facts are already
                    // self-describing sentences the label row is dropped entirely
                    // rather than padded with a meaningless one.
                    var factLabel = (currentInspector.factLabels || [])[idx];

                    return React.createElement("div", { key: currentInspector.key + "-fact-" + idx, className: "rounded-lg bg-slate-50 border border-slate-100 p-2 text-center" },

                      factLabel ? React.createElement("div", { className: "text-[11px] font-black uppercase tracking-wider text-slate-500" }, factLabel) : null,

                      React.createElement("div", { className: "font-bold leading-tight" + (factLabel ? " mt-0.5" : ""), style: { color: currentInspector.color } }, fact)

                    );

                  })

                ),

                React.createElement("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-2 gap-2" },

                  React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2.5" },

                    React.createElement("p", { className: "text-xs font-black text-slate-700 mb-1" }, __alloT('stem.galaxy.evidence_label', 'Evidence')),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, currentInspector.evidence)

                  ),

                  React.createElement("div", { className: "rounded-lg border border-cyan-100 bg-cyan-50 p-2.5" },

                    React.createElement("p", { className: "text-xs font-black text-cyan-800 mb-1" }, __alloT('stem.galaxy.astronomer_note_label', 'Astronomer Note')),

                    React.createElement("p", { className: "text-xs text-cyan-900 leading-relaxed" }, currentInspector.question)

                  )

                ),

                selStar && selStar.whyItMatters && React.createElement("div", { className: "mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200" },

                  React.createElement("p", { className: "text-xs font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 " + __alloT('stem.galaxy.why_it_matters_label', 'Why It Matters')),

                  React.createElement("p", { className: "text-xs text-amber-800 leading-relaxed" }, selStar.whyItMatters)

                ),

                selStar && React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-center" },

                  React.createElement("p", { className: "text-xs text-indigo-600" }, "\uD83D\uDD2D If our Sun were a basketball, a" + (selStar.id === 'O' ? 'n' : '') + " " + selStar.id + "-type star would be " + ({ 'O': 'a hot tub (6\u201315x wider)', 'B': 'a beach ball (2\u20137x wider)', 'A': 'a soccer ball (1.4\u20132x wider)', 'F': 'a volleyball (slightly bigger)', 'G': 'another basketball (same size!)', 'K': 'a softball (a bit smaller)', 'M': 'a tennis ball or smaller' }[selStar.id] || 'similar in size') + ".")

                )

              ),



              // ── Snapshot button ──

              React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

                React.createElement("button", { type: "button", "aria-label": __alloT('stem.galaxy.snapshot', 'Snapshot'), onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'gx-' + Date.now(), tool: 'galaxy', label: t('stem.galaxy.galaxy') + (d.selectedStar ? ': ' + d.selectedStar : '') + ' (' + gType.label + ')', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.galaxy.snapshot', 'Snapshot'))

              )

            ), // end Galaxy Simulation mode wrapper

            !d.quizMode && simMode === 'realSky' && React.createElement("div", { className: "animate-in fade-in duration-300" },

              React.createElement("div", { className: "mb-3 rounded-2xl border bg-slate-950 p-4 shadow-xl", style: { borderColor: 'rgba(14,165,233,0.32)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 22px 54px rgba(15,23,42,0.22)' } },
                React.createElement("div", { className: "flex flex-wrap items-start gap-3" },
                  React.createElement("div", { className: "h-11 w-11 rounded-xl flex items-center justify-center text-xl border", style: { borderColor: 'rgba(125,211,252,0.38)', background: 'radial-gradient(circle at 35% 25%, rgba(125,211,252,0.24), rgba(30,41,59,0.9))' } }, "\uD83D\uDD2D"),
                  React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-wider text-cyan-200" }, __alloT('stem.galaxy.realsky_mode_title', 'Real Sky Survey Mode')),
                    React.createElement("h4", { className: "text-base font-black text-white" }, activeRealSkyTarget.name + " (" + activeRealSkyTarget.short + ")"),
                    React.createElement("p", { className: "text-[12px] text-slate-300 leading-relaxed mt-1" }, activeRealSkyTarget.story)
                  ),
                  React.createElement("a", { href: activeAladinUrl, target: "_blank", rel: "noreferrer", className: "inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/10", style: { borderColor: 'rgba(103,232,249,0.35)' } }, __alloT('stem.galaxy.open_in_aladin', 'Open in Aladin'))
                ),
                React.createElement("div", { className: "mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs" },
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
                  React.createElement("span", { className: "ml-auto rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700" }, activeRealSkyTarget.short)
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                  (activeRealSkyTarget.lesson || []).map(function (prompt, idx) {
                    return React.createElement("div", { key: activeRealSkyTarget.key + "-lesson-" + idx, className: "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 leading-relaxed" },
                      React.createElement("span", { className: "font-black text-cyan-700 mr-1" }, (idx + 1) + "."),
                      prompt
                    );
                  })
                )
              ),

              React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-3" },
                React.createElement("div", { className: "space-y-3" },
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { id: "galaxy-real-sky-targets-label", className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.targets_label', 'Targets')),
                    React.createElement("div", { className: "grid grid-cols-2 xl:grid-cols-1 gap-1.5", role: "group", "aria-labelledby": "galaxy-real-sky-targets-label" },
                      REAL_SKY_TARGETS.map(function (target) {
                        var on = target.key === activeRealSkyTarget.key;
                        return React.createElement("button", {
                          type: "button",
                          key: target.key,
                          "data-galaxy-real-sky-target": target.key,
                          "aria-pressed": on ? "true" : "false",
                          onClick: function () { patchGalaxy({ realSkyTarget: target.key, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "min-h-[44px] text-left rounded-lg border px-2.5 py-2 transition-all " + (on ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        },
                          React.createElement("span", { className: "block text-xs font-black leading-tight" }, target.short + " " + target.name),
                          React.createElement("span", { className: "block text-[11px] leading-tight mt-0.5 opacity-70" }, target.type)
                        );
                      })
                    )
                  ),
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { id: "galaxy-real-sky-surveys-label", className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.survey_light_label', 'Survey Light')),
                    React.createElement("div", { className: "space-y-1.5", role: "group", "aria-labelledby": "galaxy-real-sky-surveys-label" },
                      REAL_SKY_SURVEYS.map(function (survey) {
                        var on = survey.id === activeRealSkySurvey.id;
                        return React.createElement("button", {
                          type: "button",
                          key: survey.id,
                          "aria-pressed": on ? "true" : "false",
                          onClick: function () { patchGalaxy({ realSkySurvey: survey.id, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "min-h-[44px] w-full text-left rounded-lg border px-2.5 py-2 text-xs font-bold transition-all " + (on ? "bg-cyan-50 text-cyan-800 border-cyan-300" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        }, survey.label, React.createElement("span", { className: "block text-[11px] font-semibold opacity-70" }, survey.desc));
                      })
                    )
                  ),
                  React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" },
                    React.createElement("p", { id: "galaxy-real-sky-catalogs-label", className: "text-xs font-black text-slate-800 mb-2" }, __alloT('stem.galaxy.catalog_overlay_label', 'Catalog Overlay')),
                    React.createElement("div", { className: "space-y-1.5", role: "group", "aria-labelledby": "galaxy-real-sky-catalogs-label" },
                      REAL_SKY_CATALOGS.map(function (catalog) {
                        var on = catalog.id === activeRealSkyCatalog.id;
                        return React.createElement("button", {
                          type: "button",
                          key: catalog.id,
                          "aria-pressed": on ? "true" : "false",
                          onClick: function () { patchGalaxy({ realSkyCatalog: catalog.id, realSkyStatus: 'idle', realSkyMessage: '' }); },
                          className: "min-h-[44px] w-full text-left rounded-lg border px-2.5 py-2 text-xs font-bold transition-all " + (on ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white")
                        }, catalog.label, React.createElement("span", { className: "block text-[11px] font-semibold opacity-70" }, catalog.desc));
                      })
                    )
                  )
                ),

                React.createElement("div", { className: "min-w-0" },
                  React.createElement("div", { className: "relative rounded-2xl overflow-hidden border bg-slate-950 shadow-2xl", style: { borderColor: 'rgba(14,165,233,0.32)' } },
                    React.createElement("div", { key: activeRealSkyTarget.key + "-" + activeRealSkySurvey.id + "-" + activeRealSkyCatalog.id + "-" + realSkyRetry, id: "galaxy-real-sky-aladin", ref: realSkyRefCb, role: "region", "aria-label": __alloT('stem.galaxy.real_sky_atlas_label', 'Interactive real-sky survey atlas'), "aria-busy": realSkyStatus !== 'ready' ? "true" : "false", "aria-describedby": "galaxy-real-sky-status", style: { height: 590, minHeight: 420, background: 'radial-gradient(circle at 50% 35%, rgba(14,165,233,0.2), rgba(2,6,23,0.98) 62%)' } }),
                    realSkyStatus !== 'ready' && React.createElement("div", { className: "absolute inset-0 flex items-center justify-center p-6 text-center", style: { pointerEvents: realSkyStatus === 'error' ? 'auto' : 'none', background: realSkyStatus === 'error' ? 'rgba(2,6,23,0.86)' : 'linear-gradient(180deg, rgba(2,6,23,0.62), rgba(2,6,23,0.34))' } },
                      React.createElement("div", { className: "max-w-sm rounded-xl border border-cyan-300/20 bg-slate-950/80 p-4 text-white shadow-xl" },
                        React.createElement("p", { className: "text-xl mb-1" }, realSkyStatus === 'error' ? "\u26A0\uFE0F" : "\uD83D\uDD2D"),
                        React.createElement("p", { id: "galaxy-real-sky-status", role: "status", "aria-live": "polite", "aria-atomic": "true", className: "text-sm font-black text-cyan-100" }, realSkyStatus === 'error' ? __alloT('stem.galaxy.realsky_atlas_unavailable', 'Real-sky atlas unavailable') : __alloT('stem.galaxy.realsky_connecting', 'Connecting to real sky surveys')),
                        React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed mt-1" }, realSkyMessage || __alloT('stem.galaxy.realsky_loading', 'Loading Aladin Lite, sky survey tiles, and catalog services.')),
                        realSkyStatus === 'error' && React.createElement("div", { className: "mt-3 flex flex-wrap items-center justify-center gap-2" },
                          React.createElement("button", { type: "button", onClick: function () { patchGalaxy({ realSkyStatus: 'idle', realSkyMessage: '', realSkyRetry: realSkyRetry + 1 }); }, className: "inline-flex min-h-[44px] items-center rounded-lg border border-cyan-200/50 bg-cyan-400/15 px-3 py-2 text-xs font-bold text-cyan-50 hover:bg-cyan-400/25" }, __alloT('stem.galaxy.retry_atlas', 'Retry atlas')),
                          React.createElement("a", { href: activeAladinUrl, target: "_blank", rel: "noreferrer", className: "inline-flex min-h-[44px] items-center rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white" }, __alloT('stem.galaxy.open_external_atlas', 'Open external atlas'))
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
                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mt-1" }, card.body),
                        React.createElement("button", { type: "button", onClick: card.onClick, className: "mt-2 min-h-[44px] rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100" }, card.action + " \u2192")
                      );
                    })
                  )
                )
              )
            ),

// ── Quiz mode ──

              d.quizMode && d.isGeneratingQuiz && React.createElement("div", { className: "flex flex-col items-center justify-center p-12 mt-6 max-w-2xl mx-auto rounded-2xl bg-indigo-50 border-2 border-indigo-300 motion-safe:animate-pulse motion-reduce:animate-none", role: "status", "aria-live": "polite", "aria-atomic": "true"}, React.createElement("h2", {className: "text-lg font-bold text-indigo-600 mb-2"}, "✨ " + __alloT('stem.galaxy.quiz_generating_title', 'Gemini is Generating Astrophysic Questions...')), React.createElement("p", {className: "text-sm text-indigo-400"}, __alloT('stem.galaxy.quiz_generating_sub', 'Parsing deep space databases...'))),
              d.quizMode && !d.isGeneratingQuiz && !d.quizDone && quizQ && React.createElement("div", { className: "mt-6 max-w-2xl mx-auto bg-white shadow-xl rounded-2xl border border-slate-400 p-8 animate-in fade-in slide-in-from-bottom-4" },

                React.createElement("div", { className: "flex items-center justify-between mb-2" },

                  React.createElement("p", { className: "text-xs font-bold text-indigo-700" }, "\uD83E\uDDE0 " + __alloT('stem.galaxy.quiz_question_label', 'Question') + " " + (quizIndex + 1) + "/" + ACTIVE_BANK.length),

                  React.createElement("div", { className: "flex items-center gap-2 text-xs" },

                    React.createElement("span", { className: "font-bold text-green-700" }, "\u2714 " + (d.quizScore || 0)),

                    React.createElement("span", { className: "font-bold text-amber-600" }, "\uD83D\uDD25 " + (d.quizStreak || 0))

                  )

                ),

                // Progress through the bank was only ever a "3/20" string; a bar makes
                // the remaining distance legible at a glance.
                React.createElement("div", { className: "mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": ACTIVE_BANK.length, "aria-valuenow": quizIndex + 1, "aria-label": __alloT('stem.galaxy.aria_quiz_progress', 'Quiz progress') },
                  React.createElement("div", { className: "h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500", style: { width: (((quizIndex + 1) / ACTIVE_BANK.length) * 100).toFixed(1) + "%" } })
                ),

                React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),

                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },

                  quizQ.options.map(function (opt) {

                    var answered = !!d.quizFeedback;
                    var isAnswer = opt === quizQ.a;
                    var isMyPick = answered && d.quizFeedback.picked === opt;
                    // Two defects here. (1) The old "other wrong options" style was
                    // text-slate-200 on bg-white at opacity-50 \u2014 roughly 1.2:1, so
                    // they vanished. (2) The learner's OWN wrong answer was styled
                    // identically to the options they never touched, so there was no
                    // way to see what you had actually picked.
                    var stateClass = !answered ? "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400"
                      : isAnswer ? "border-green-500 bg-green-50 text-green-800"
                      : isMyPick ? "border-red-500 bg-red-50 text-red-800"
                      : "border-slate-200 bg-slate-50 text-slate-500";
                    var marker = !answered ? null : isAnswer ? "\u2713 " : isMyPick ? "\u2717 " : "";

                    return React.createElement("button", { "aria-label": "Select answer: " + opt,

                      key: opt, disabled: answered, type: "button",

                      onClick: function () {

                        var correct = opt === quizQ.a;

                        upd("quizFeedback", { correct: correct, picked: opt, msg: correct ? "\u2705 " + __alloT('stem.galaxy.quiz_correct', 'Correct! +10 XP') : "\u274C " + __alloT('stem.galaxy.quiz_answer_is', 'The answer is: ') + quizQ.a });

                        // The feedback promised "+10 XP" but nothing was ever awarded.
                        if (correct) {
                          upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1);
                          if (typeof awardStemXP === 'function') awardStemXP('galaxy_quiz', 10, 'Answered a galaxy quiz question correctly');
                        }

                        else { upd("quizStreak", 0); }

                      }, className: "min-h-[44px] px-3 py-2 text-left text-xs font-bold rounded-lg border-2 transition-all disabled:cursor-default " + (answered ? "" : "hover:scale-[1.02] ") + stateClass

                    }, marker ? React.createElement("span", { className: "mr-1 font-black", "aria-hidden": true }, marker) : null, opt);

                  })

                ),

                d.quizFeedback && React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200") },

                  d.quizFeedback.msg,

                  (function () {
                    // The old handler wrapped with % ACTIVE_BANK.length, so the quiz
                    // silently looped forever and never reported a result.
                    var isLastQuestion = quizIndex >= ACTIVE_BANK.length - 1;
                    var nextLabel = isLastQuestion ? __alloT('stem.galaxy.quiz_see_results', 'See results') : __alloT('stem.galaxy.quiz_next', 'Next');
                    return React.createElement("button", { type: "button", "aria-label": nextLabel, onClick: function () {
                      patchGalaxy(isLastQuestion ? { quizDone: true, quizFeedback: null } : { quizIdx: quizIndex + 1, quizFeedback: null });
                    }, className: "ml-3 min-h-[44px] px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold" }, nextLabel + " \u2192");
                  })()

                )

              ),

              // \u2500\u2500 Quiz results \u2500\u2500
              d.quizMode && !d.isGeneratingQuiz && d.quizDone && (function () {
                var total = ACTIVE_BANK.length;
                var score = d.quizScore || 0;
                var pct = total ? Math.round((score / total) * 100) : 0;
                var verdict = pct >= 80 ? __alloT('stem.galaxy.quiz_result_strong', 'Strong grasp of stellar and galactic structure.')
                  : pct >= 50 ? __alloT('stem.galaxy.quiz_result_building', 'Solid start \u2014 revisit the panels for the ideas that slipped.')
                  : __alloT('stem.galaxy.quiz_result_explore', 'Explore the simulation panels, then try again \u2014 the answers are all in there.');
                return React.createElement("div", { className: "mt-6 max-w-2xl mx-auto rounded-2xl border border-indigo-200 bg-white p-8 text-center shadow-xl animate-in fade-in", role: "status", "aria-live": "polite", "aria-atomic": "true" },
                  React.createElement("p", { className: "text-3xl", "aria-hidden": true }, pct >= 80 ? "\ud83c\udf1f" : pct >= 50 ? "\ud83d\ude80" : "\ud83d\udd2d"),
                  React.createElement("h4", { className: "mt-2 text-lg font-black text-slate-900" }, __alloT('stem.galaxy.quiz_complete_title', 'Quiz complete')),
                  React.createElement("p", { className: "mt-1 text-sm font-bold text-indigo-700" }, score + " / " + total + " (" + pct + "%)"),
                  React.createElement("p", { className: "mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-600" }, verdict),
                  React.createElement("div", { className: "mt-4 flex flex-wrap justify-center gap-2" },
                    React.createElement("button", { type: "button", onClick: function () { patchGalaxy({ quizIdx: 0, quizScore: 0, quizStreak: 0, quizFeedback: null, quizDone: false }); }, className: "min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700" }, "\u21ba " + __alloT('stem.galaxy.quiz_try_again', 'Try again')),
                    React.createElement("button", { type: "button", onClick: function () { patchGalaxy({ quizMode: false, quizDone: false, quizFeedback: null, simMode: 'galaxy' }); }, className: "min-h-[44px] rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100" }, "\ud83c\udf0c " + __alloT('stem.galaxy.quiz_back_to_galaxy', 'Back to the galaxy'))
                  )
                );
              })(),




            // ══════════════════════════════════════════════

            // ── Star Lifespan Simulation Mode ──

            // ══════════════════════════════════════════════

            !d.quizMode && simMode === 'blackHole' && React.createElement("div", { className: "animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4" },
              React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 border-indigo-300/30 bg-[#010208] shadow-2xl shadow-indigo-500/10", style: { minHeight: 'clamp(420px, 65vw, 590px)' } },
                React.createElement("canvas", { "data-black-hole-canvas": "true", "data-spin": blackHoleSpin, "data-disk": blackHoleDisk, "data-paused": blackHoleEffectivePaused ? "true" : "false", ref: blackHoleRefCb, tabIndex: 0, role: "application", "aria-label": __alloT('stem.galaxy.aria_blackhole_canvas', 'Interactive model of a rotating black hole with an event horizon, photon ring, accretion disk, polar jets, and a tidal-forces object-drop experiment.'), "aria-describedby": "black-hole-instructions black-hole-description black-hole-status", "aria-keyshortcuts": "ArrowLeft ArrowRight ArrowUp ArrowDown + - Home", className: 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-300', style: { width: '100%', height: 'clamp(420px, 65vw, 590px)', display: 'block', cursor: 'grab', touchAction: 'none' } }),
                React.createElement("div", { className: "absolute top-3 left-3 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-2 text-white backdrop-blur-md pointer-events-none" },
                  React.createElement("div", { className: "text-xs uppercase tracking-widest font-black text-violet-300" }, __alloT('stem.galaxy.blackhole_lab_title', 'Black Hole Lab')),
                  React.createElement("div", { className: "text-xs text-slate-300 mt-0.5" }, __alloT('stem.galaxy.blackhole_drag_hint', 'Drag or use arrow keys to orbit - scroll or use plus and minus to zoom'))),
                React.createElement("div", { id: "black-hole-drop-readout", "aria-hidden": true, className: "absolute top-3 right-3 max-w-[55%] rounded-xl border border-orange-200/30 bg-slate-950/75 px-3 py-2 text-right text-xs font-bold text-orange-100 backdrop-blur-md pointer-events-none" }, __alloT('stem.galaxy.blackhole_drop_begin', 'Drop an object to begin')),
                React.createElement("p", { id: "black-hole-instructions", className: "sr-only" }, __alloT('stem.galaxy.blackhole_keyboard_help', 'Keyboard controls: use the arrow keys to orbit, plus and minus to zoom, and Home to reset the camera. Animation can be paused with the button after the canvas.')),
                React.createElement("div", { className: "absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none" },
                  [__alloT('stem.galaxy.bh_badge_event_horizon', 'Event horizon'), __alloT('stem.galaxy.bh_badge_photon_ring', 'Photon ring'), __alloT('stem.galaxy.bh_badge_accretion_disk', 'Accretion disk'), __alloT('stem.galaxy.bh_badge_polar_jets', 'Polar jets')].map(function(label, i){ return React.createElement("span", { key: label, className: "rounded-full border border-white/15 bg-slate-950/75 px-2 py-1 text-xs font-bold text-slate-200 backdrop-blur-md" }, (i===0?'\u25cf ':i===1?'\u25cb ':i===2?'\u2248 ':'\u2195 ') + label); }))
              ),
              React.createElement("aside", { className: "space-y-3" },
                React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" },
                  React.createElement("h4", { className: "text-sm font-black text-slate-800" }, __alloT('stem.galaxy.relativistic_controls_title', 'Relativistic controls')),
                  React.createElement("p", { id: "black-hole-description", className: "mt-1 text-xs leading-relaxed text-slate-600" }, __alloT('stem.galaxy.blackhole_description', 'A teaching model near a rotating black hole. Distances are visual, not to scale.')),
                  React.createElement("p", { id: "black-hole-status", role: "status", "aria-live": "polite", "aria-atomic": "true", className: "mt-2 text-xs font-semibold text-indigo-800" }, blackHoleEffectivePaused ? (blackHoleReducedMotion && !blackHoleMotionAllowed ? __alloT('stem.galaxy.bh_status_reduced_motion', 'Animation paused to honor your reduced-motion preference.') : __alloT('stem.galaxy.bh_status_paused', 'Simulation paused.')) : __alloT('stem.galaxy.bh_status_running', 'Simulation running.')),
                  React.createElement("label", { htmlFor: "black-hole-spin", className: "mt-4 block text-xs font-bold text-slate-700" }, __alloT('stem.galaxy.bh_spin_label', 'Spin: '), React.createElement("span", { className: "font-mono text-indigo-700" }, blackHoleSpin.toFixed(2))),
                  React.createElement("input", { id: "black-hole-spin", type: "range", min: 0, max: 0.99, step: 0.01, value: blackHoleSpin, "aria-valuetext": blackHoleSpin.toFixed(2) + " of 0.99", className: "w-full accent-indigo-600", onChange: function(e){ var v=parseFloat(e.target.value); upd('blackHoleSpin',v); var cv=blackHoleCanvasActive.current; if(cv&&cv._setBlackHoleSpin)cv._setBlackHoleSpin(v); } }),
                  React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.galaxy.bh_spin_desc', 'Higher spin speeds the inner disk and strengthens its bright approaching side.')),
                  React.createElement("label", { htmlFor: "black-hole-disk", className: "mt-3 block text-xs font-bold text-slate-700" }, __alloT('stem.galaxy.bh_disk_label', 'Disk brightness: '), React.createElement("span", { className: "font-mono text-indigo-700" }, Math.round(blackHoleDisk*100) + "%")),
                  React.createElement("input", { id: "black-hole-disk", type: "range", min: 0.2, max: 1, step: 0.01, value: blackHoleDisk, "aria-valuetext": Math.round(blackHoleDisk*100) + " percent", className: "w-full accent-indigo-600", onChange: function(e){ var v=parseFloat(e.target.value); upd('blackHoleDisk',v); var cv=blackHoleCanvasActive.current; if(cv&&cv._setBlackHoleDisk)cv._setBlackHoleDisk(v); } }),
                  React.createElement("button", { type: "button", className: "mt-4 min-h-[44px] w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700", onClick: function(){ var next; if (!blackHoleMotionAllowed) { upd('blackHoleMotionAllowed',true); upd('blackHolePaused',false); next=false; } else { next=!blackHolePaused; upd('blackHolePaused',next); } var cv=blackHoleCanvasActive.current; if(cv&&cv._setBlackHolePaused)cv._setBlackHolePaused(next); }, "aria-label": blackHoleEffectivePaused ? __alloT('stem.galaxy.bh_start_anim', 'Start animation') : __alloT('stem.galaxy.bh_pause_anim', 'Pause animation'), "aria-pressed": !blackHoleEffectivePaused }, blackHoleEffectivePaused ? "\u25b6 " + __alloT('stem.galaxy.bh_start_anim', 'Start animation') : "\u23f8 " + __alloT('stem.galaxy.bh_pause_anim', 'Pause animation'))
                ),
                React.createElement("div", { className: "rounded-2xl border border-orange-200 bg-orange-50 p-4" },
                  React.createElement("h4", { className: "text-sm font-black text-orange-950" }, __alloT('stem.galaxy.tidal_forces_title', 'Tidal forces experiment')),
                  React.createElement("p", { id: "black-hole-drop-help", className: "mt-1 text-xs leading-relaxed text-orange-950" }, __alloT('stem.galaxy.tidal_forces_desc', 'Release an object and observe spaghettification: gravity pulls harder on its near side, stretching it radially while compressing it sideways.')),
                  React.createElement("div", { className: "mt-3 rounded-xl border border-orange-300/60 bg-white/70 p-3" },
                    React.createElement("p", { className: "text-xs font-black text-orange-950" }, __alloT('stem.galaxy.two_views_title', 'Two views of time and light')),
                    React.createElement("div", { className: "mt-2 space-y-2", "aria-hidden": true },
                      React.createElement("div", null,
                        React.createElement("div", { className: "flex justify-between gap-2 text-xs font-bold text-slate-700" }, React.createElement("span", null, __alloT('stem.galaxy.bh_traveler_clock', "Traveler's local clock")), React.createElement("span", null, __alloT('stem.galaxy.bh_steady', 'steady'))),
                        React.createElement("div", { className: "mt-1 h-2 overflow-hidden rounded-full bg-slate-200" }, React.createElement("div", { className: "h-full w-full rounded-full bg-indigo-500" }))),
                      React.createElement("div", null,
                        React.createElement("div", { className: "flex justify-between gap-2 text-xs font-bold text-slate-700" }, React.createElement("span", { id: "black-hole-signal-label" }, "Distant received signal: 100%"), React.createElement("span", null, __alloT('stem.galaxy.bh_delayed_redshifted', 'delayed + redshifted'))),
                        React.createElement("div", { className: "mt-1 h-2 overflow-hidden rounded-full bg-slate-200" }, React.createElement("div", { id: "black-hole-signal-bar", className: "h-full w-full rounded-full bg-sky-400 transition-all duration-300" })))
                    ),
                    React.createElement("p", { className: "mt-2 text-xs leading-relaxed text-orange-900" }, __alloT('stem.galaxy.bh_observer_view_desc', 'Illustrative observer view: the traveler experiences their own clock normally, while a distant observer receives increasingly delayed and redshifted light signals.'))
                  ),                  React.createElement("label", { htmlFor: "black-hole-object", className: "mt-3 block text-xs font-bold text-orange-950" }, __alloT('stem.galaxy.bh_object_label', 'Object')),
                  React.createElement("select", { id: "black-hole-object", value: blackHoleDropObject, onChange: function(e){upd('blackHoleDropObject',e.target.value);}, className: "mt-1 min-h-[44px] w-full rounded-lg border border-orange-600 bg-white px-2 py-2 text-xs text-slate-900" },
                    React.createElement("option", { value: "probe" }, __alloT('stem.galaxy.bh_obj_probe', 'Space probe')), React.createElement("option", { value: "astronaut" }, __alloT('stem.galaxy.bh_obj_astronaut', 'Astronaut model')), React.createElement("option", { value: "star" }, __alloT('stem.galaxy.bh_obj_star', 'Star'))),
                  React.createElement("label", { htmlFor: "black-hole-mass", className: "mt-3 block text-xs font-bold text-orange-950" }, __alloT('stem.galaxy.bh_mass_label', 'Black hole mass')),
                  React.createElement("select", { id: "black-hole-mass", value: blackHoleMassMode, onChange: function(e){upd('blackHoleMassMode',e.target.value);}, className: "mt-1 min-h-[44px] w-full rounded-lg border border-orange-600 bg-white px-2 py-2 text-xs text-slate-900", "aria-describedby": "black-hole-mass-note" },
                    React.createElement("option", { value: "stellar" }, __alloT('stem.galaxy.bh_mass_stellar', 'Stellar-mass')), React.createElement("option", { value: "supermassive" }, __alloT('stem.galaxy.bh_mass_supermassive', 'Supermassive'))),
                  React.createElement("p", { id: "black-hole-mass-note", className: "mt-1 text-xs leading-relaxed text-orange-900" }, blackHoleMassMode==='stellar'?__alloT('stem.galaxy.bh_mass_note_stellar', 'Stronger tidal gradient: disruption begins farther outside the horizon.'):__alloT('stem.galaxy.bh_mass_note_supermassive', 'Gentler at the horizon: a compact object can cross before extreme stretching develops.')),
                  React.createElement("button", { type: "button", className: "mt-3 min-h-[44px] w-full rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold text-white hover:bg-orange-800", onClick: function(){var cv=blackHoleCanvasActive.current;if(cv&&cv._dropIntoBlackHole)cv._dropIntoBlackHole(blackHoleDropObject,blackHoleMassMode);}, "aria-describedby": "black-hole-drop-help" }, __alloT('stem.galaxy.bh_drop_btn', 'Drop object into black hole'))
                ),
                React.createElement("div", { className: "rounded-2xl border border-violet-200 bg-violet-50 p-4" },
                  React.createElement("h4", { className: "text-sm font-black text-violet-900" }, __alloT('stem.galaxy.bh_what_seeing_title', 'What you are seeing')),
                  React.createElement("ul", { className: "mt-2 space-y-2 text-xs leading-relaxed text-violet-950" },
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
                    React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_evidence_desc', 'The event horizon is an evidence boundary: outside effects can reach us; information from inside cannot.'))),
                  React.createElement("span", { className: "rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-xs font-bold text-cyan-100" }, __alloT('stem.galaxy.bh_evidence_map_badge', 'Evidence map'))
                ),
                React.createElement("div", { className: "mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_150px_1fr]" },
                  React.createElement("div", { className: "rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3" },
                    React.createElement("p", { className: "text-xs font-black uppercase tracking-wider text-emerald-200" }, __alloT('stem.galaxy.bh_outside_title', 'Outside - observable')),
                    React.createElement("ul", { className: "mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200" },
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li1', 'Bright shadow and photon-ring structure')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li2', 'Fast stellar orbits, hot gas, and X-rays')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_outside_li3', 'Gravitational waves from black-hole mergers')))
                  ),
                  React.createElement("div", { className: "mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.24)]", "aria-hidden": true },
                    React.createElement("div", { className: "flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-200/70 bg-gradient-to-br from-orange-400/30 via-indigo-500/20 to-black shadow-[0_0_24px_rgba(251,191,36,0.36)]" },
                      React.createElement("div", { className: "flex h-20 w-20 items-center justify-center rounded-full border border-violet-300/40 bg-black text-center text-xs font-black text-violet-200" }, "EVENT", React.createElement("br"), "HORIZON"))
                  ),
                  React.createElement("div", { className: "rounded-xl border border-violet-300/25 bg-violet-300/10 p-3" },
                    React.createElement("p", { className: "text-xs font-black uppercase tracking-wider text-violet-200" }, __alloT('stem.galaxy.bh_inside_title', 'Inside - causally hidden')),
                    React.createElement("ul", { className: "mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200" },
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li1', 'General relativity predicts continued collapse')),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li2', "Its singularity may mark the theory's limit")),
                      React.createElement("li", null, __alloT('stem.galaxy.bh_inside_li3', 'No outside observer can receive an interior signal')))
                  )
                ),
                React.createElement("div", { className: "mt-4 grid grid-cols-1 gap-2 md:grid-cols-3" },
                  React.createElement("div", { className: "rounded-xl border border-sky-300/20 bg-sky-300/10 p-3" }, React.createElement("p", { className: "text-xs font-black text-sky-200" }, __alloT('stem.galaxy.bh_supported_title', 'Strongly supported')), React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_supported_desc', 'Horizons, curved light paths, accretion, and mergers match observations and relativity.'))),
                  React.createElement("div", { className: "rounded-xl border border-amber-300/20 bg-amber-300/10 p-3" }, React.createElement("p", { className: "text-xs font-black text-amber-200" }, __alloT('stem.galaxy.bh_predicted_title', 'Predicted, not directly seen')), React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_predicted_desc', 'A classical singularity and extremely slow Hawking evaporation remain theoretical.'))),
                  React.createElement("div", { className: "rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-3" }, React.createElement("p", { className: "text-xs font-black text-fuchsia-200" }, __alloT('stem.galaxy.bh_speculative_title', 'Speculative ideas')), React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-slate-300" }, __alloT('stem.galaxy.bh_speculative_desc', 'Quantum cores, fuzzballs, firewalls, wormholes, and white holes are hypotheses - not established destinations.')))
                ),
                React.createElement("div", { className: "mt-4 border-t border-cyan-200/15 pt-4" },
                  React.createElement("p", { className: "text-xs font-black uppercase tracking-wider text-cyan-200" }, __alloT('stem.galaxy.bh_lifecycle_title', 'Black-hole life cycle')),
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
                        React.createElement("span", { className: "text-xs font-black" }, (index + 1) + ". " + stage.title)),
                      React.createElement("p", { className: "mt-2 text-xs leading-relaxed text-slate-300" }, stage.text)); })
                  )
                ),
                React.createElement("p", { className: "mt-3 text-xs leading-relaxed text-cyan-100" }, __alloT('stem.galaxy.bh_lifecycle_note', 'A black hole is not necessarily active forever: its surroundings can brighten, quiet down, and brighten again as matter becomes available.'))
              )
            ),
            !d.quizMode && simMode === 'star' && React.createElement("div", { className: "animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-[minmax(280px,38%)_minmax(0,1fr)] gap-4 items-start" },



              // ── RIGHT COLUMN: Star Visualization (sticky) ──

              React.createElement("div", { className: "order-1 lg:order-2 lg:sticky lg:top-4 flex min-w-0 flex-col gap-4", style: { minHeight: "clamp(380px, 62vw, 560px)" } },



              // ── Animated Star Canvas ──

              React.createElement("div", { className: "w-full flex-1 relative rounded-2xl overflow-hidden border-2 border-indigo-300/30 bg-[#020210] shadow-2xl shadow-indigo-500/10", style: { flex: '1 1 auto', minHeight: 'clamp(380px, 62vw, 560px)', position: 'relative' } },

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

                    // The backing store was hardcoded at 2×: soft on 3× phones and
                    // tablets, and four times the pixels needed on a 1× display.
                    // A 0-sized canvas (mode switched while hidden) must not produce
                    // a 0×0 backing store either — nothing would ever draw again.
                    function starLifeScale() { return Math.max(1, Math.min(3, window.devicePixelRatio || 1)); }
                    function sizeStarLifeCanvas() {
                      W = Math.max(1, cvEl.offsetWidth || cvEl.clientWidth || W || 320);
                      H = Math.max(1, cvEl.offsetHeight || cvEl.clientHeight || H || 240);
                      var dpr = starLifeScale();
                      cvEl.width = Math.round(W * dpr); cvEl.height = Math.round(H * dpr);
                      // Assigning width/height resets the transform, so re-apply it.
                      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    }
                    sizeStarLifeCanvas();

                    // WCAG 2.3.3 — the injected reduced-motion CSS only reaches CSS
                    // animations, so this rAF loop kept pulsing, rotating and flashing
                    // (the supernova stage especially) for users who asked for less
                    // motion. Hold the clock at a representative frame instead of 0,
                    // which would freeze mid-pulse and look broken.
                    var starLifeMotionQuery = null;
                    try { starLifeMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (motionQueryError) {}
                    var starLifeReduceMotion = !!(starLifeMotionQuery && starLifeMotionQuery.matches);
                    var onStarLifeMotionChange = function (e) { starLifeReduceMotion = !!(e && e.matches); };
                    if (starLifeMotionQuery) {
                      if (starLifeMotionQuery.addEventListener) starLifeMotionQuery.addEventListener('change', onStarLifeMotionChange);
                      else if (starLifeMotionQuery.addListener) starLifeMotionQuery.addListener(onStarLifeMotionChange);
                      cvEl._starLifeMotionCleanup = function () {
                        if (starLifeMotionQuery.removeEventListener) starLifeMotionQuery.removeEventListener('change', onStarLifeMotionChange);
                        else if (starLifeMotionQuery.removeListener) starLifeMotionQuery.removeListener(onStarLifeMotionChange);
                      };
                    }

                    var tick = starLifeReduceMotion ? 40 : 0;

                    function drawStar() {
                      // Stop + clean up once the canvas leaves the DOM (leaving Star-Life mode or the
                      // tool). Without this guard the rAF loop ran forever at 60fps against a detached
                      // canvas, and the ResizeObserver was never disconnected.
                      if (!cvEl.isConnected) {
                        try { cancelAnimationFrame(cvEl._starLifeAnim); } catch (e) {}
                        try { if (cvEl._starLifeRO) cvEl._starLifeRO.disconnect(); } catch (e) {}
                        try { if (cvEl._starLifeMotionCleanup) cvEl._starLifeMotionCleanup(); } catch (e) {}
                        return;
                      }
                      if (starLifeReduceMotion) { tick = 40; } else { tick++; }
                      ctx.clearRect(0, 0, W, H);
                      // Starfield background
                      ctx.fillStyle = '#020210';
                      ctx.fillRect(0, 0, W, H);
                      // `(si * 137) % W` walks a fixed stride across the canvas, so the
                      // "random" background actually laid the stars out in visible
                      // diagonal rows. A hash scatters them properly, and it is still
                      // deterministic (no per-frame Math.random flicker).
                      for (var si = 0; si < 120; si++) {
                        var hx = Math.sin(si * 12.9898) * 43758.5453;
                        var hy = Math.sin(si * 78.233) * 27183.1234;
                        var sx = (hx - Math.floor(hx)) * W;
                        var sy = (hy - Math.floor(hy)) * H;
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
                      // Legibility floor: the HUD sat directly on the star's own glow,
                      // so a scrim keeps it readable against a red supergiant or a
                      // supernova flash without dimming the artwork itself.
                      var topScrim = ctx.createLinearGradient(0, 0, 0, 46);
                      topScrim.addColorStop(0, 'rgba(2,2,16,0.72)'); topScrim.addColorStop(1, 'rgba(2,2,16,0)');
                      ctx.fillStyle = topScrim; ctx.fillRect(0, 0, W, 46);
                      var bottomScrim = ctx.createLinearGradient(0, H - 56, 0, H);
                      bottomScrim.addColorStop(0, 'rgba(2,2,16,0)'); bottomScrim.addColorStop(1, 'rgba(2,2,16,0.78)');
                      ctx.fillStyle = bottomScrim; ctx.fillRect(0, H - 56, W, 56);

                      ctx.textAlign = 'center';
                      // Stage name (top)
                      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.92)';
                      ctx.fillText(stageLabel, cx, 22);
                      // Classification
                      var cls = mass < HYDROGEN_FUSION_LIMIT ? 'Brown dwarf (substellar)' : mass < M_DWARF_LIMIT ? 'M-type Red Dwarf' : mass < 0.8 ? 'K-type Orange' : mass < 1.04 ? 'G-type (Sun-like)' : mass < 1.4 ? 'F-type Yellow-White' : mass < 2.1 ? 'A-type White' : mass < 16 ? 'B-type Blue-White' : 'O-type Blue Giant';
                      ctx.font = '10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.62)';
                      ctx.fillText(cls, cx, 36);

                      // ── Physical properties panel (bottom center) ──
                      var surfTemp = mass < HYDROGEN_FUSION_LIMIT ? 1800 : mass < M_DWARF_LIMIT ? 3200 : mass < 0.8 ? 4500 : mass < 1.04 ? 5778 : mass < 1.4 ? 6500 : mass < 2.1 ? 8500 : mass < 16 ? 20000 : 40000;
                      var luminosity = Math.pow(mass, 3.5);
                      var radius = mainSequenceRadius(mass);
                      var lifetime = mass < 0.2 ? '>100' : (10 / Math.pow(mass, 2.5)).toFixed(mass < 1 ? 0 : 1);
                      var lifetimeText = mass < HYDROGEN_FUSION_LIMIT ? 'No sustained hydrogen fusion' : 'Lifespan: ' + lifetime + ' billion years';
                      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.72)';
                      ctx.fillText(mass + ' Solar Masses', cx, H - 42);
                      // On a narrow canvas this line ran off both edges. Shrink to fit,
                      // and split across two rows if even the smallest size overflows.
                      var lumText = (luminosity < 100 ? luminosity.toFixed(1) : Math.round(luminosity).toLocaleString()) + ' L\u2609';
                      var statsLine = 'T: ' + surfTemp.toLocaleString() + ' K  |  L: ' + lumText + '  |  R: ' + radius.toFixed(2) + ' R\u2609';
                      ctx.fillStyle = 'rgba(255,255,255,0.52)';
                      var statsSize = 9;
                      ctx.font = statsSize + 'px monospace';
                      while (statsSize > 6.5 && ctx.measureText(statsLine).width > W - 16) {
                        statsSize -= 0.5;
                        ctx.font = statsSize + 'px monospace';
                      }
                      if (ctx.measureText(statsLine).width > W - 16) {
                        ctx.fillText('T: ' + surfTemp.toLocaleString() + ' K', cx, H - 30);
                        ctx.fillText('L: ' + lumText + '  |  R: ' + radius.toFixed(2) + ' R\u2609', cx, H - 21);
                      } else {
                        ctx.fillText(statsLine, cx, H - 26);
                      }
                      ctx.font = '9px monospace';
                      ctx.fillText(lifetimeText, cx, H - 10);

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
                      ctx.save(); ctx.globalAlpha = 0.55;
                      ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fbbf24';
                      // The old marker was labelled "Sun (1 M☉)" but drawn at 0.3× the
                      // scale the star itself uses, so it read as a Sun far smaller than
                      // it is. Overlaying the Sun's true outline on the star makes the
                      // comparison honest and much easier to read.
                      var sunRefR = dim * 0.14; // baseR evaluates to exactly this at 1 M☉
                      if (mass !== 1 && stage === 'main_sequence') {
                        ctx.beginPath(); ctx.arc(cx, cy, sunRefR, 0, Math.PI * 2);
                        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
                        // Park the label clear of whichever circle is larger.
                        ctx.fillText('Sun (1 M\u2609)', cx, Math.max(50, cy - Math.max(sunRefR, baseR) - 6));
                      }
                      ctx.restore();



                      cvEl._starLifeAnim = requestAnimationFrame(drawStar);

                    };

                    drawStar();

                    var ro = new ResizeObserver(function () { sizeStarLifeCanvas(); });

                    ro.observe(cvEl);
                    cvEl._starLifeRO = ro;

                  },

                  style: { width: '100%', height: '100%' }

                }),

                // ── Snapshot button (overlay, bottom-right of canvas) ──
                React.createElement("button", { type: "button", "aria-label": __alloT('stem.galaxy.snapshot', 'Snapshot'), onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sl-' + Date.now(), tool: 'galaxy', label: 'Star Life: ' + lifecycleMass + ' M\u2609', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Star life snapshot saved!', 'success'); }, className: "min-h-[44px] px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 rounded-full hover:from-amber-700 hover:to-orange-700 shadow-md hover:shadow-lg transition-all", style: { position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 } }, "\uD83D\uDCF8 Snapshot")

              )

              ), // end right column



              // ── LEFT COLUMN: Controls & Timeline ──

              React.createElement("div", { className: "order-2 lg:order-1 flex min-w-0 flex-col gap-4 lg:max-h-[85vh] lg:overflow-y-auto lg:pr-1" },



              // ── Mass Selector Hero ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border-2 border-indigo-400/40 p-5 shadow-xl" },

                React.createElement("div", { className: "flex items-center gap-3 mb-4" },

                  React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg" }, "\u2B50"),

                  React.createElement("div", null,

                    React.createElement("h4", { className: "text-sm font-bold text-white" }, __alloT('stem.galaxy.star_mass_class_title', 'Star Mass & Classification')),

                    React.createElement("p", { className: "text-xs text-slate-300" }, __alloT('stem.galaxy.star_mass_class_sub', 'Adjust mass to explore how different stars live and die'))

                  ),

                  React.createElement("div", { className: "ml-auto px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40" },

                    React.createElement("span", { className: "text-sm font-black text-amber-300" }, lifecycleMass + " M\u2609")

                  )

                ),

                React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                  React.createElement("span", { className: "text-xs text-amber-300/70 whitespace-nowrap w-8" }, "0.03"),

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

                  React.createElement("span", { className: "text-xs text-amber-300/70 whitespace-nowrap w-8 text-right" }, "50")

                ),

                // Mass category badge

                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },

                  React.createElement("span", {

                    className: "px-3 py-1 rounded-full text-xs font-bold " + lifecycleMassBadgeClass(lifecycleMass)

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

                  React.createElement("span", { className: "text-xs text-slate-300 italic" },

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
                      className: "min-h-[44px] text-left rounded-xl border px-3 py-2 transition-all hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300",
                      style: { borderColor: path.border, background: path.bg }
                    },
                      React.createElement("span", { className: "block text-xs font-black leading-tight", style: { color: path.text } }, path.label),
                      React.createElement("span", { className: "block text-[11px] text-slate-300 mt-0.5" }, path.sub)
                    );
                  })

                )

              ),



              // ── Lifecycle Flowchart ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },

                React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                  React.createElement("h4", { className: "text-sm font-bold text-white" }, "\u2728 " + __alloT('stem.galaxy.lifecycle_journey_title', 'Stellar Lifecycle Journey')),

                  React.createElement("span", { className: "ml-auto text-xs text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/50" },

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
                          React.createElement("span", { className: "text-xs font-bold", style: { color: lifecycleMass < 8 ? '#a5b4fc' : '#fbbf24' } }, branchLabel)
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
                          React.createElement("p", { className: "text-xs font-bold leading-tight", style: { color: s.color } }, s.name),
                          React.createElement("p", { className: "text-xs text-slate-300 leading-tight" }, s.desc)
                        ),
                        React.createElement("span", { className: "text-xs text-slate-300 flex-shrink-0" },
                          s.id === 'nebula' ? "" :
                          s.id === 'protostar' ? "~100K yr" :
                          s.id === 'main_sequence' ? (lifecycleMass < HYDROGEN_FUSION_LIMIT ? __alloT('stem.galaxy.dur_cools_over_time', 'cools over time') : lifecycleMass < M_DWARF_LIMIT ? "~Trillions of yr" : lifecycleMass < 2 ? "~10 Gyr" : lifecycleMass < 8 ? "~1 Gyr" : lifecycleMass < 25 ? "~10 Myr" : "~3 Myr") :
                          s.id === 'red_giant' ? (lifecycleMass < 2 ? "~1 Gyr" : "~100 Myr") :
                          s.id === 'red_supergiant' || s.id === 'blue_supergiant' ? "~1 Myr" :
                          s.id === 'planetary_nebula' ? "~10,000 yr" :
                          s.id === 'supernova' ? "~Months" :
                          __alloT('stem.galaxy.dur_forever', 'Forever')
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
                  title: __alloT('stem.galaxy.collapse_bd_title', 'No sustained stellar fusion'),
                  badge: __alloT('stem.galaxy.collapse_bd_badge', 'Substellar'),
                  desc: __alloT('stem.galaxy.collapse_bd_desc', 'A brown dwarf is below the hydrogen-fusion limit, so it cools and fades instead of becoming a white dwarf, neutron star, or black hole.'),
                  accent: '#a16207',
                  final: __alloT('stem.galaxy.collapse_bd_final', 'Cooling brown dwarf')
                } : lifecycleMass < 8 ? {
                  title: __alloT('stem.galaxy.collapse_wd_title', 'No core-collapse supernova'),
                  badge: __alloT('stem.galaxy.collapse_wd_badge', 'Gentle ending'),
                  desc: __alloT('stem.galaxy.collapse_wd_desc', 'This star will shed outer layers and cool as a white dwarf instead of forming a neutron star or black hole.'),
                  accent: '#818cf8',
                  final: __alloT('stem.galaxy.collapse_wd_final', 'White dwarf')
                } : lifecycleMass < 25 ? {
                  title: __alloT('stem.galaxy.collapse_ns_title', 'Core collapse makes a neutron star'),
                  badge: '8-25 M\u2609',
                  desc: __alloT('stem.galaxy.collapse_ns_desc', 'The iron core collapses, rebounds as a supernova shock, and leaves an ultra-dense neutron-star remnant.'),
                  accent: '#38bdf8',
                  final: __alloT('stem.galaxy.collapse_ns_final', 'Neutron star')
                } : {
                  title: __alloT('stem.galaxy.collapse_bh_title', 'Core collapse can form a black hole'),
                  badge: '25+ M\u2609',
                  desc: __alloT('stem.galaxy.collapse_bh_desc', 'After the supernova, the remaining core is massive enough that gravity wins and an event horizon forms.'),
                  accent: '#c084fc',
                  final: __alloT('stem.galaxy.collapse_bh_final', 'Black hole')
                };
                var collapseSteps = [
                  { label: __alloT('stem.galaxy.collapse_step_massive', 'Massive star'), active: lifecycleMass >= 8, color: '#60a5fa' },
                  { label: __alloT('stem.galaxy.collapse_step_iron_core', 'Iron core collapse'), active: lifecycleMass >= 8, color: '#f59e0b' },
                  { label: __alloT('stem.galaxy.collapse_step_supernova_shock', 'Supernova shock'), active: lifecycleMass >= 8, color: '#fbbf24' },
                  { label: collapseState.final, active: true, color: collapseState.accent }
                ];
                return React.createElement("div", { className: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl border border-violet-400/30 p-4 shadow-lg" },
                  React.createElement("div", { className: "flex items-start gap-3" },
                    React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-lg border", style: { color: collapseState.accent, borderColor: collapseState.accent + '66', background: collapseState.accent + '18' } }, lifecycleMass < 8 ? "\u26AA" : lifecycleMass < 25 ? "\u2B50" : "\uD83D\uDD73\uFE0F"),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                        React.createElement("h4", { className: "text-sm font-bold text-white" }, collapseState.title),
                        React.createElement("span", { className: "text-[11px] font-black px-2 py-0.5 rounded-full border", style: { color: collapseState.accent, borderColor: collapseState.accent + '66', background: collapseState.accent + '16' } }, collapseState.badge)
                      ),
                      React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed mt-1" }, collapseState.desc)
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                    collapseSteps.map(function (step, idx) {
                      return React.createElement("div", { key: step.label, className: "rounded-xl border px-2.5 py-2", style: { borderColor: step.active ? step.color + '66' : 'rgba(100,116,139,0.32)', background: step.active ? step.color + '14' : 'rgba(15,23,42,0.42)' } },
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black", style: { background: step.active ? step.color + '2b' : 'rgba(71,85,105,0.5)', color: step.active ? step.color : '#94a3b8' } }, idx + 1),
                          React.createElement("span", { className: "text-xs font-bold leading-tight", style: { color: step.active ? '#e2e8f0' : '#94a3b8' } }, step.label)
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

                  protostar: { T: 3800, L: Math.max(0.01, msL * 1.5), note: __alloT('stem.galaxy.stagehr_protostar_note', 'sliding down the Hayashi track toward the main sequence') },

                  main_sequence: { T: msT, L: msL, note: mass < HYDROGEN_FUSION_LIMIT ? __alloT('stem.galaxy.stagehr_ms_note_bd', 'a brown dwarf — below the sustained hydrogen-fusion limit') : __alloT('stem.galaxy.stagehr_ms_note', 'on the main sequence, where it spends ~90% of its life') },

                  red_giant: { T: 3600, L: Math.max(80, msL * 200), note: __alloT('stem.galaxy.stagehr_red_giant_note', 'climbing the giant branch — cooler but far more luminous') },

                  red_supergiant: { T: 3500, L: 120000, note: __alloT('stem.galaxy.stagehr_red_supergiant_note', 'top right — enormous, cool, and doomed') },

                  blue_supergiant: { T: 22000, L: 300000, note: __alloT('stem.galaxy.stagehr_blue_supergiant_note', 'top left — hyper-luminous and shedding mass') },

                  blue_dwarf: { T: 8000, L: 0.02, note: __alloT('stem.galaxy.stagehr_blue_dwarf_note', 'a theoretical late phase — no red dwarf has died yet') },

                  planetary_nebula: { T: 42000, L: 3000, note: __alloT('stem.galaxy.stagehr_planetary_nebula_note', 'the exposed core dashes hot and left before fading') },

                  white_dwarf: { T: 12000, L: 0.003, note: __alloT('stem.galaxy.stagehr_white_dwarf_note', 'bottom left — white-hot but only Earth-sized') }

                };

                var OFF_CHART = {

                  nebula: __alloT('stem.galaxy.offchart_nebula', "A nebula isn't a star yet — pick a later stage to see your star appear on the map."),

                  supernova: "💥 " + __alloT('stem.galaxy.offchart_supernova', 'A supernova briefly outshines this entire chart — off the top by a factor of 10,000!'),

                  neutron_star: __alloT('stem.galaxy.offchart_neutron_star', 'A neutron star no longer fuses anything — it has left the H-R diagram forever.'),

                  black_hole: __alloT('stem.galaxy.offchart_black_hole', 'A black hole emits no light at all — nothing to plot. The diagram only maps shining stars.'),

                  black_dwarf: mass < HYDROGEN_FUSION_LIMIT ? __alloT('stem.galaxy.offchart_black_dwarf_bd', 'A cooling brown dwarf is faint and substellar — it fades below the main-sequence map.') : __alloT('stem.galaxy.offchart_black_dwarf', 'A black dwarf is a theoretical cooled white dwarf; the universe is not old enough for true black dwarfs yet.')

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

                  React.createElement("h4", { className: "text-sm font-bold text-white mb-1 flex items-center gap-2" }, React.createElement("span", null, "📈"), __alloT('stem.galaxy.hr_diagram_title', "H-R Diagram — the astronomer's map")),

                  React.createElement("p", { className: "text-xs text-slate-400 leading-relaxed mb-2" }, __alloT('stem.galaxy.hr_diagram_intro', "Every star is one dot: temperature across (hot on the LEFT — astronomers' quirk), luminosity up. Stars aren't scattered randomly. Drag the mass slider and click lifecycle stages — the dashed line traces YOUR star's whole journey.")),

                  React.createElement("svg", { viewBox: "0 0 " + HW + " " + HH, className: "w-full", role: "img", "aria-label": __alloT('stem.galaxy.aria_hr_diagram', "Hertzsprung-Russell diagram: surface temperature decreasing left to right, luminosity increasing upward. Shows the main sequence band, giants, supergiants and white dwarf regions, the Sun, and the current star's evolutionary track with its active stage highlighted.") },

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

                    React.createElement("text", { x: xOf(9500), y: yOf(6) + 4, fill: "#a5b4fc", fontSize: 9, fontWeight: 700, transform: "rotate(24 " + xOf(9500) + " " + yOf(6) + ")" }, __alloT('stem.galaxy.hr_main_sequence_label', 'MAIN SEQUENCE (90% of stars)')),

                    React.createElement("text", { x: xOf(4200), y: yOf(600), fill: "#fca5a5", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.hr_giants_label', 'Giants')),

                    React.createElement("text", { x: xOf(11000), y: yOf(250000), fill: "#fdba74", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.hr_supergiants_label', 'Supergiants')),

                    React.createElement("text", { x: xOf(19000), y: yOf(0.008), fill: "#cbd5e1", fontSize: 9, fontWeight: 700 }, __alloT('stem.galaxy.hr_white_dwarfs_label', 'White Dwarfs')),

                    // the Sun for reference

                    React.createElement("circle", { cx: xOf(5778), cy: yOf(1), r: 3, fill: "#fde047", stroke: "#0f172a", strokeWidth: 0.8 }),

                    React.createElement("text", { x: xOf(5778) + 6, y: yOf(1) + 3, fill: "#fde047", fontSize: 8, fontWeight: 700 }, __alloT('stem.galaxy.hr_sun_label', 'Sun')),

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

                  React.createElement("p", { className: "text-xs leading-relaxed mt-1 " + (cur ? "text-pink-300" : "text-amber-300") },

                    cur ? "⭐ Your " + mass + " M☉ " + massNoun + " is " + cur.note + "." : (OFF_CHART[activeStage] || __alloT('stem.galaxy.hr_select_stage_prompt', 'Select a lifecycle stage to plot your star.'))

                  )

                );

              })(),



              // ── OBAFGKM Star Classification Reference ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-400 p-4 shadow-sm" },

                React.createElement("h4", { className: "text-sm font-bold text-slate-800 mb-3 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83C\uDF08"),

                  __alloT('stem.galaxy.harvard_classification_title', 'Harvard Spectral Classification (OBAFGKM)')

                ),

                React.createElement("div", { className: "grid grid-cols-7 gap-1" },

                  STAR_TYPES.map(function (st) {

                    var isMatch = spectralTypeForMass(lifecycleMass) === st.id;

                    return React.createElement("button", {

                      key: st.id,
                      type: "button",
                      "aria-pressed": isMatch ? "true" : "false",
                      "aria-label": "Set mass to " + st.id + "-type star, " + st.mass + ", " + st.lifetime + " lifetime",

                      className: "text-center p-2 rounded-xl border-2 bg-transparent transition-all cursor-pointer  " +

                        (isMatch ? "border-indigo-400 shadow-md shadow-indigo-100 scale-105" : "border-transparent hover:border-slate-200"),

                      style: isMatch ? { background: st.color + '20' } : {},

                      onClick: function () { var massMap = { O: 30, B: 8, A: 1.8, F: 1.2, G: 1, K: 0.7, M: 0.3 }; upd("lifecycleMass", massMap[st.id] || 1); }

                    },

                      React.createElement("div", { className: "text-2xl mb-1", style: { color: st.color } }, "\u2B50"),

                      React.createElement("p", { className: "text-xs font-black", style: { color: st.color } }, st.id),

                      React.createElement("p", { className: "text-xs text-slate-600 leading-tight" }, st.temp + "K"),

                      isMatch ? React.createElement("div", { className: "mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto motion-safe:animate-pulse motion-reduce:animate-none" }) : null

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
                        React.createElement("span", { className: "text-xs font-bold text-stone-700" }, __alloT('stem.galaxy.brown_dwarf_substellar_label', 'Brown dwarf (substellar)'))
                      ),
                      React.createElement("p", { className: "text-xs text-stone-700 leading-relaxed" }, __alloT('stem.galaxy.brown_dwarf_substellar_desc', 'This object is below about 0.08 solar masses, so it never settles onto the hydrogen-burning main sequence. It glows from leftover heat and slowly cools instead.'))
                    );
                  }

                  var st = STAR_TYPES.find(function (s) { return s.id === matchType; });

                  if (!st) return null;

                  return React.createElement("div", { className: "mt-3 p-3 rounded-xl border", style: { borderColor: st.color + '40', background: st.color + '08' } },

                    React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },

                      React.createElement("span", { className: "text-lg", style: { color: st.color } }, "\u2B50"),

                      React.createElement("span", { className: "text-xs font-bold", style: { color: st.color } }, st.label + " (" + st.example + ")")

                    ),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, st.desc),

                    React.createElement("div", { className: "grid grid-cols-3 gap-2 text-xs" },

                      [{ l: "Luminosity", v: st.luminosity }, { l: "Mass Range", v: st.mass || '?' }, { l: "Lifetime", v: st.lifetime || '?' }].map(function (item) {

                        return React.createElement("div", { key: item.l, className: "bg-white rounded-lg p-1.5 text-center border border-slate-100" },

                          React.createElement("div", { className: "text-slate-600 font-bold" }, item.l),

                          React.createElement("div", { className: "font-bold", style: { color: st.color } }, item.v)

                        );

                      })

                    ),

                    st.whyItMatters ? React.createElement("div", { className: "mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200" },

                      React.createElement("p", { className: "text-xs text-amber-700" }, "\uD83D\uDCA1 " + st.whyItMatters)

                    ) : null

                  );

                })()

              ),



              // ── Fun Facts ──

              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 p-4" },

                React.createElement("h4", { className: "text-sm font-bold text-indigo-700 mb-2 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83D\uDCA1"), __alloT('stem.galaxy.did_you_know_title', 'Did You Know?')

                ),

                React.createElement("p", { className: "text-xs text-indigo-800 leading-relaxed" },

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

                  React.createElement("h4", { className: "text-sm font-bold text-white mb-1 flex items-center gap-2" }, React.createElement("span", null, "✨"), __alloT('stem.galaxy.star_stuff_title', 'You Are Star Stuff')),

                  React.createElement("p", { className: "text-xs text-slate-400 leading-relaxed mb-2" }, "Almost every atom heavier than helium was forged inside a star. Colors show where each element in your body — and your phone — came from."),

                  stageMsg && React.createElement("p", { className: "text-xs font-bold text-violet-300 bg-violet-900/40 border border-violet-700/50 rounded-lg px-2.5 py-1.5 mb-2" }, stageMsg),

                  React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gap: '2px' } },

                    ELEMS.map(function (el) {

                      var o = ORIGINS[el[3]];

                      var hot = stageOrigins[el[3]];

                      return React.createElement("div", {

                        key: el[0], title: el[0] + ' — ' + o.label,

                        className: "text-center rounded-sm font-bold" + (hot ? " motion-safe:animate-pulse motion-reduce:animate-none" : ""),

                        style: { gridColumnStart: el[1], gridRowStart: el[2], background: o.color + (hot ? '55' : '26'), border: '1px solid ' + o.color + (hot ? '' : '66'), color: o.color, fontSize: '8px', padding: '3px 0', boxShadow: hot ? '0 0 6px ' + o.color + '88' : 'none' }

                      }, el[0]);

                    })

                  ),

                  React.createElement("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2" },

                    Object.keys(ORIGINS).map(function (k) {

                      return React.createElement("span", { key: k, className: "flex items-center gap-1 text-[11px] font-semibold text-slate-300" },

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

                        React.createElement("span", { className: "text-[11px] leading-tight text-slate-300" }, f.txt, React.createElement("span", { className: "block font-bold", style: { color: f.c } }, f.src)));

                    })

                  ),

                  React.createElement("p", { className: "text-[11px] text-slate-500 italic mt-2 leading-relaxed" }, "Colors show each element's dominant source today — many have more than one. Gold's neutron-star origin was confirmed in 2017, when telescopes watched the glow of freshly forged heavy elements after gravitational-wave event GW170817.")

                );

              })(),



              // ── Size Comparison ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-400 p-4 shadow-sm" },

                React.createElement("h4", { className: "text-sm font-bold text-slate-800 mb-3 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83D\uDD2D"), __alloT('stem.galaxy.size_comparison_title', 'Size Comparison')

                ),

                (function () {
                  // The Sun used to be a hardcoded 40px while the star used
                  // M^0.8 * 20 \u2014 which is 20px at 1 M\u2609. Every star below ~2.8 M\u2609
                  // therefore looked SMALLER than the Sun, contradicting the caption
                  // right beneath it. Both circles now come from one scale.
                  var SUN_PX = 34, MAX_PX = 132;
                  var starRadius = mainSequenceRadius(lifecycleMass);
                  var rawPx = SUN_PX * starRadius;
                  var starPx = Math.max(8, Math.min(MAX_PX, rawPx));
                  var clipped = rawPx > MAX_PX;
                  var starGradient = lifecycleMass < 0.45 ? 'linear-gradient(135deg, #ffcc6f, #ff9944)' :
                    lifecycleMass < 0.8 ? 'linear-gradient(135deg, #ffd2a1, #ffaa66)' :
                      lifecycleMass < 1.04 ? 'linear-gradient(135deg, #fff4ea, #ffdd99)' :
                        lifecycleMass < 1.4 ? 'linear-gradient(135deg, #f8f7ff, #dddddd)' :
                          lifecycleMass < 2.1 ? 'linear-gradient(135deg, #cad7ff, #99aaee)' :
                            lifecycleMass < 16 ? 'linear-gradient(135deg, #aabfff, #7799ff)' :
                              'linear-gradient(135deg, #9bb0ff, #6677ff)';
                  var luminosity = Math.pow(lifecycleMass, 3.5);
                  var sizeVerdict = starRadius < 0.92 ? __alloT('stem.galaxy.size_smaller', 'Your star is smaller and cooler than the Sun.')
                    : starRadius <= 1.15 ? __alloT('stem.galaxy.size_similar', 'Your star is about the same size as the Sun.')
                    : starRadius < 3 ? __alloT('stem.galaxy.size_larger', 'Your star is clearly larger and hotter than the Sun.')
                    : __alloT('stem.galaxy.size_giant', 'Your star is a blue giant \u2014 vastly larger, hotter, and more luminous than the Sun.');
                  // The old copy claimed "millions of times more luminous" for anything
                  // over 10 M\u2609; M^3.5 puts 10 M\u2609 at ~3,000 L\u2609, not millions.
                  var luminosityNote = __alloT('stem.galaxy.size_luminosity_prefix', 'About ') +
                    (luminosity < 1 ? luminosity.toFixed(3) : luminosity < 1000 ? Math.round(luminosity).toLocaleString() : Math.round(luminosity / 100) * 100 >= 1000000 ? (luminosity / 1000000).toFixed(1) + '\u00D7 10\u2076' : Math.round(luminosity).toLocaleString()) +
                    __alloT('stem.galaxy.size_luminosity_suffix', ' times the Sun\u2019s luminosity.');
                  return React.createElement("div", null,
                    React.createElement("div", { className: "flex items-end justify-center gap-4 py-4", role: "img", "aria-label": __alloT('stem.galaxy.aria_size_comparison', 'Size comparison: the Sun beside a star of ') + lifecycleMass + __alloT('stem.galaxy.aria_size_comparison_tail', ' solar masses, drawn at ') + starRadius.toFixed(2) + __alloT('stem.galaxy.aria_size_comparison_radii', ' solar radii.') },
                      React.createElement("div", { className: "flex flex-col items-center" },
                        React.createElement("div", { className: "rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-200", style: { width: SUN_PX + 'px', height: SUN_PX + 'px' } }),
                        React.createElement("span", { className: "text-xs text-slate-600 mt-1 font-bold" }, __alloT('stem.galaxy.size_sun_label', 'Sun') + " (1 M\u2609)")
                      ),
                      React.createElement("div", { className: "flex flex-col items-center" },
                        React.createElement("div", {
                          className: "rounded-full shadow-lg transition-all duration-300", style: {
                            width: starPx + 'px',
                            height: starPx + 'px',
                            background: starGradient,
                            boxShadow: '0 0 ' + Math.min(24, 4 + starRadius * 5).toFixed(0) + 'px ' + (lifecycleMass < 0.8 ? '#ffd2a166' : lifecycleMass < 2.1 ? '#fff4ea66' : '#aabfff66')
                          }
                        }),
                        React.createElement("span", { className: "text-xs text-slate-600 mt-1 font-bold" }, lifecycleMass + " M\u2609"),
                        React.createElement("span", { className: "text-[11px] text-slate-500" }, starRadius.toFixed(2) + " R\u2609")
                      )
                    ),
                    React.createElement("p", { className: "text-center text-xs text-slate-600 italic mt-2" },
                      sizeVerdict + " " + luminosityNote
                    ),
                    clipped && React.createElement("p", { className: "text-center text-[11px] text-slate-400 mt-1" }, __alloT('stem.galaxy.size_clipped_note', 'Drawn at the panel limit \u2014 the real star is bigger than this box can show.'))
                  );
                })()

              ),



              ), // end left column



              // (Snapshot button moved inside canvas container)

            ),

            // === H7b'' inquiry widget: stellar metallicity discovery ===
            !d.quizMode && simMode === 'metalHunt' && (function() {
              var h = React.createElement;
              var iq = d.metalHunt || {};
              var metallicity = iq.metallicity !== undefined ? iq.metallicity : 1;
              var starMass = iq.mass !== undefined ? iq.mass : 1;
              var starAge = iq.age !== undefined ? iq.age : 5;
              function setIQ(patch) { upd('metalHunt', Object.assign({ metallicity: metallicity, mass: starMass, age: starAge }, iq, patch)); }
              var state;
              if (metallicity < 0.05) state = 'popIII';
              else if (metallicity < 0.3) state = 'poor';
              else if (metallicity < 1.3) state = 'solar';
              else state = 'rich';
              var sm = {
                popIII: { label: '🌌 ' + __alloT('stem.galaxy.mh_pop3_label', 'Population III (zero-metal)'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.galaxy.mh_pop3_desc', 'The hypothetical first stars: hydrogen and helium only, and thought to be very massive. None has ever been observed.') },
                poor:   { label: '🔵 ' + __alloT('stem.galaxy.mh_pop2_label', 'Metal-poor (Population II)'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: __alloT('stem.galaxy.mh_pop2_desc', 'Old halo and globular-cluster stars, formed before much enrichment. Long-lived and low in heavy elements.') },
                solar:  { label: '🟡 ' + __alloT('stem.galaxy.mh_pop1_label', 'Solar-metallicity (Population I)'), color: '#facc15', bg: '#fefce8', border: '#fde047', desc: __alloT('stem.galaxy.mh_pop1_desc', 'Sun-like disk stars. Enough heavy elements for rocky planets to form.') },
                rich:   { label: '🟠 ' + __alloT('stem.galaxy.mh_rich_label', 'Metal-rich (super-solar)'), color: '#ea580c', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.galaxy.mh_rich_desc', 'Young inner-disk stars born from gas that generations of earlier stars already enriched.') }
              }[state];

              // Mass and age used to be inert decoration. Two textbook relations make
              // them do real work, without turning the widget into a scored quiz:
              //   • main-sequence lifetime ≈ 10 / M^2.5 Gyr
              //   • the interstellar medium was enriched over cosmic time, so a star's
              //     age constrains the metallicity it could have been born with.
              var msLifetime = 10 / Math.pow(Math.max(0.08, starMass), 2.5);
              var formationTime = Math.max(0.2, 13.8 - starAge);
              var expectedZ = Math.min(1.6, Math.pow(formationTime / 9, 1.6));
              var stillBurning = starAge <= msLifetime;
              var zRatio = metallicity / Math.max(0.001, expectedZ);
              var chemistryFits = zRatio > 0.33 && zRatio < 3;
              var checks = [
                {
                  key: 'lifetime',
                  ok: stillBurning,
                  label: __alloT('stem.galaxy.mh_check_lifetime', 'Still on the main sequence?'),
                  detail: stillBurning
                    ? __alloT('stem.galaxy.mh_check_lifetime_yes', 'Yes — its hydrogen-burning lifetime is about ') + (msLifetime >= 1000 ? '>1,000' : msLifetime.toFixed(msLifetime < 10 ? 2 : 0)) + __alloT('stem.galaxy.mh_check_lifetime_yes_tail', ' Gyr, longer than the age you set.')
                    : __alloT('stem.galaxy.mh_check_lifetime_no', 'No — a star this massive burns out in about ') + (msLifetime < 0.01 ? '<0.01' : msLifetime.toFixed(2)) + __alloT('stem.galaxy.mh_check_lifetime_no_tail', ' Gyr, so at this age it would already be a remnant.')
                },
                {
                  key: 'chemistry',
                  ok: chemistryFits,
                  label: __alloT('stem.galaxy.mh_check_chemistry', 'Does the chemistry match the era?'),
                  detail: chemistryFits
                    ? __alloT('stem.galaxy.mh_check_chemistry_yes', 'Yes — gas forming stars this long ago carried roughly this much heavy-element content (about ') + expectedZ.toFixed(2) + __alloT('stem.galaxy.mh_check_chemistry_yes_tail', ' Z☉).')
                    : (zRatio >= 3
                      ? __alloT('stem.galaxy.mh_check_chemistry_high', 'Unusual — that is far more enrichment than the young universe had produced by then (roughly ') + expectedZ.toFixed(2) + __alloT('stem.galaxy.mh_check_chemistry_tail', ' Z☉ expected).')
                      : __alloT('stem.galaxy.mh_check_chemistry_low', 'Unusual — a star born this recently would normally inherit far more heavy elements (roughly ') + expectedZ.toFixed(2) + __alloT('stem.galaxy.mh_check_chemistry_tail', ' Z☉ expected).'))
                }
              ];
              var logEntries = Array.isArray(iq.log) ? iq.log : [];
              var sliders = [
                { k: 'metallicity', v: metallicity, l: __alloT('stem.galaxy.mh_slider_metallicity', 'Metallicity (Z☉)'), mn: 0.001, mx: 2, st: 0.01, unit: ' Z☉' },
                { k: 'mass', v: starMass, l: __alloT('stem.galaxy.mh_slider_mass', 'Mass (M☉)'), mn: 0.1, mx: 50, st: 0.1, unit: ' M☉' },
                { k: 'age', v: starAge, l: __alloT('stem.galaxy.mh_slider_age', 'Age (Gyr)'), mn: 0, mx: 14, st: 0.1, unit: __alloT('stem.galaxy.mh_unit_gyr', ' billion years') }
              ];
              return h('div', { className: 'p-4 rounded-xl bg-slate-900 text-slate-100 border border-purple-400 space-y-3' },
                h('h3', { className: 'text-sm font-black text-purple-300' }, '🌟 ' + __alloT('stem.galaxy.mh_title', 'Stellar metallicity discovery')),
                h('p', { className: 'text-[12px] text-slate-300 leading-relaxed' }, __alloT('stem.galaxy.mh_intro', 'A star’s heavy-element content ("metallicity") records the universe it was born into. Set a metallicity, a mass, and an age, then read what kind of star that describes — and whether such a star could exist.')),
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-xs text-slate-700 mt-1' }, sm.desc)
                ),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                  sliders.map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'mh-' + s.k, className: 'block text-xs font-bold text-slate-300' }, s.l + ': ', h('span', { className: 'font-mono text-purple-300' }, s.v)),
                      h('input', { id: 'mh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: s.v,
                        'aria-valuetext': s.v + s.unit,
                        onChange: function(e) { var p = {}; p[s.k] = parseFloat(e.target.value); setIQ(p); },
                        className: 'w-full accent-purple-400' }));
                  })
                ),
                h('div', { className: 'rounded-lg border border-slate-600 bg-slate-950/60 p-3 space-y-2', role: 'status', 'aria-live': 'polite' },
                  h('p', { className: 'text-xs font-black uppercase tracking-wider text-slate-300' }, __alloT('stem.galaxy.mh_plausibility_title', 'Could this star exist?')),
                  checks.map(function(check) {
                    return h('div', { key: check.key, className: 'flex items-start gap-2' },
                      h('span', { className: 'text-sm leading-none mt-0.5', 'aria-hidden': true }, check.ok ? '✅' : '⚠️'),
                      h('p', { className: 'text-[12px] leading-relaxed ' + (check.ok ? 'text-slate-200' : 'text-amber-200') },
                        h('span', { className: 'font-bold' }, check.label + ' '), check.detail));
                  }),
                  h('p', { className: 'text-[11px] italic leading-relaxed text-slate-400' }, __alloT('stem.galaxy.mh_plausibility_note', 'A warning is not a wrong answer — real stars that break these patterns exist, and each one is a research question. Ask what could explain it.'))
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { type: 'button', onClick: function() { setIQ({ log: logEntries.concat([{ z: metallicity, m: starMass, a: starAge, st: state }]).slice(-8) }); }, className: 'min-h-[44px] px-3 py-2 rounded bg-slate-800 text-xs font-bold text-slate-100 border border-slate-500' }, '📋 ' + __alloT('stem.galaxy.mh_log_btn', 'Log this combination')),
                  h('button', { type: 'button', onClick: function() { setIQ({ metallicity: 1, mass: 1, age: 5, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'min-h-[44px] px-3 py-2 rounded bg-transparent text-xs font-semibold text-slate-300 border border-slate-500' }, '↺ ' + __alloT('stem.galaxy.mh_reset_btn', 'Reset'))
                ),
                // The Log button previously recorded entries that were never displayed.
                logEntries.length > 0 && h('div', { className: 'overflow-x-auto rounded-lg border border-slate-600' },
                  h('table', { className: 'w-full text-left text-[11px]' },
                    h('caption', { className: 'sr-only' }, __alloT('stem.galaxy.mh_log_caption', 'Logged star combinations, most recent last')),
                    h('thead', null, h('tr', { className: 'bg-slate-800 text-slate-300' },
                      h('th', { scope: 'col', className: 'px-2 py-1 font-black' }, '#'),
                      h('th', { scope: 'col', className: 'px-2 py-1 font-black' }, 'Z☉'),
                      h('th', { scope: 'col', className: 'px-2 py-1 font-black' }, 'M☉'),
                      h('th', { scope: 'col', className: 'px-2 py-1 font-black' }, __alloT('stem.galaxy.mh_log_age_col', 'Age (Gyr)')),
                      h('th', { scope: 'col', className: 'px-2 py-1 font-black' }, __alloT('stem.galaxy.mh_log_population_col', 'Population')))),
                    h('tbody', null, logEntries.map(function(entry, entryIndex) {
                      return h('tr', { key: entryIndex, className: entryIndex % 2 ? 'bg-slate-900' : 'bg-slate-900/40' },
                        h('td', { className: 'px-2 py-1 text-slate-400' }, entryIndex + 1),
                        h('td', { className: 'px-2 py-1 font-mono text-purple-300' }, entry.z),
                        h('td', { className: 'px-2 py-1 font-mono text-purple-300' }, entry.m),
                        h('td', { className: 'px-2 py-1 font-mono text-purple-300' }, entry.a),
                        h('td', { className: 'px-2 py-1 text-slate-200' }, entry.st));
                    })))),
                h('label', { htmlFor: 'mh-hypothesis', className: 'block text-xs font-bold text-slate-300' }, __alloT('stem.galaxy.mh_hypothesis_label', 'Your hypothesis')),
                h('textarea', { id: 'mh-hypothesis', value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.galaxy.mh_hypothesis_placeholder', 'What does metallicity tell us about a star’s history?'),
                  className: 'w-full text-[12px] bg-slate-800 text-slate-100 border border-slate-500 rounded p-2 leading-snug', rows: 3 }),
                !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'min-h-[44px] px-3 py-2 rounded bg-amber-700/30 text-xs font-bold text-amber-200 border border-amber-600' }, '🤔 ' + __alloT('stem.galaxy.mh_stuck_btn', 'Stuck — show open prompts')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-900/20 border border-amber-700 text-xs text-slate-200 leading-relaxed' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.galaxy.mh_prompt1', 'Old globular clusters have very low metallicity. What does that say about when they formed?')),
                    h('li', null, __alloT('stem.galaxy.mh_prompt2', 'Rocky planets need heavy elements. Which population is the most planet-friendly, and why?')),
                    h('li', null, __alloT('stem.galaxy.mh_prompt3', 'Where did the metals in a Population I star come from, if the Big Bang made almost none?')))),
                h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-300 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                  __alloT('stem.galaxy.mh_understood_label', 'I understand — let me explain in my own words')),
                iq.understood && h('textarea', { 'aria-label': __alloT('stem.galaxy.mh_explanation_label', 'Your explanation'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.galaxy.mh_explanation_placeholder', 'Explain how metallicity differed in the early universe compared with today.'),
                  className: 'w-full text-[12px] bg-slate-800 text-slate-100 border border-emerald-600 rounded p-2 leading-snug mt-2', rows: 4 }),
                h('p', { className: 'text-[11px] italic leading-relaxed text-slate-500' }, __alloT('stem.galaxy.mh_model_note', 'This is a simplified teaching model: real enrichment histories vary by galaxy and by location within it. There is deliberately no score here — the point is the reasoning, not a right answer.'))
              );
            })()

          );
      })();
    }
  });

})();
