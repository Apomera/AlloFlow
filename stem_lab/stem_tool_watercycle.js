// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// stem_tool_watercycle.js - Water Cycle Interactive Simulator
// Extracted and enhanced with Journey Mode
(function(){
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-watercycle')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-watercycle';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ── Water Cycle Audio System ──
  var _wcAC = null;
  function getWCAC() { if (!_wcAC) { try { _wcAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_wcAC && _wcAC.state === 'suspended') { try { _wcAC.resume(); } catch(e) {} } return _wcAC; }
  function wcTone(f, d2, t, v) { var ac = getWCAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d2||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d2||0.1)); } catch(e) {} }
  function wcNoise(dur, vol, hz, type) { var ac = getWCAC(); if (!ac) return; try { var bs = Math.floor(ac.sampleRate*(dur||0.1)); var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0); for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1)*(1-i/bs); var s = ac.createBufferSource(); s.buffer=b; var f = ac.createBiquadFilter(); f.type=type||'lowpass'; f.frequency.value=hz||600; var g = ac.createGain(); g.gain.setValueAtTime(vol||0.04,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(dur||0.1)); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); } catch(e) {} }
  function sfxRain() { for (var i = 0; i < 5; i++) { (function(d3) { setTimeout(function() { wcNoise(0.03, 0.02 + Math.random() * 0.02, 1500 + Math.random() * 1000, 'bandpass'); }, d3); })(i * 25 + Math.random() * 15); } }
  function sfxEvaporate() { wcTone(400, 0.1, 'sine', 0.05); setTimeout(function() { wcTone(600, 0.08, 'sine', 0.05); }, 60); setTimeout(function() { wcTone(800, 0.12, 'sine', 0.06); }, 120); }
  function sfxCondense() { wcTone(600, 0.08, 'sine', 0.05); setTimeout(function() { wcTone(400, 0.1, 'sine', 0.05); }, 60); }
  function sfxCollect() { wcNoise(0.15, 0.05, 300, 'lowpass'); wcTone(200, 0.1, 'sine', 0.04); }
  function sfxStream() { wcNoise(0.2, 0.04, 400, 'bandpass'); }
  function sfxFreeze() { wcTone(1200, 0.04, 'sine', 0.04); setTimeout(function() { wcTone(1400, 0.03, 'sine', 0.03); }, 30); setTimeout(function() { wcTone(1600, 0.03, 'sine', 0.03); }, 60); }
  function sfxWcCorrect() { wcTone(523, 0.08, 'sine', 0.07); setTimeout(function() { wcTone(659, 0.08, 'sine', 0.07); }, 70); setTimeout(function() { wcTone(784, 0.1, 'sine', 0.08); }, 140); }
  function sfxWcClick() { wcTone(600, 0.03, 'sine', 0.04); }

  // Ambient water background
  var _wcAmb = null;
  function startWcAmbient() {
    if (_wcAmb) return;
    var ac = getWCAC(); if (!ac) return;
    try {
      var bs = ac.sampleRate * 2; var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0);
      for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1);
      var s = ac.createBufferSource(); s.buffer=b; s.loop=true;
      var f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=250;
      var lfo = ac.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.12;
      var lg = ac.createGain(); lg.gain.value=40; lfo.connect(lg); lg.connect(f.frequency);
      var m = ac.createGain(); m.gain.setValueAtTime(0,ac.currentTime); m.gain.linearRampToValueAtTime(0.008,ac.currentTime+2);
      s.connect(f); f.connect(m); m.connect(ac.destination); s.start(); lfo.start();
      _wcAmb = { src:s, lfo:lfo, master:m };
      _wcAmb._int = setInterval(function() {
        if (Math.random() > 0.5) sfxRain();
        if (Math.random() > 0.8) wcTone(200 + Math.random() * 100, 0.3, 'sine', 0.01); // distant thunder
      }, 3000 + Math.random() * 4000);
    } catch(e) {}
  }
  function stopWcAmbient() {
    if (_wcAmb) {
      try { var ac = getWCAC(); if (ac) _wcAmb.master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5); } catch(e) {}
      if (_wcAmb._int) clearInterval(_wcAmb._int);
      var n = _wcAmb; setTimeout(function() { try { n.src.stop(); n.lfo.stop(); } catch(e) {} }, 600);
      _wcAmb = null;
    }
  }

  // WCAG a11y CSS
  if (!document.getElementById('wc-a11y-css')) { var _s = document.createElement('style'); _s.id = 'wc-a11y-css'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }'; document.head.appendChild(_s); }

  if(!window.StemLab||!window.StemLab.registerTool) return;
  window.StemLab.registerTool('waterCycle',{
    icon:'\uD83C\uDF0A', label:'waterCycle', desc:'Interactive Water Cycle with Journey Mode',
    color:'sky', category:'science',
    questHooks: [
      { id: 'complete_journey', label: 'Complete a water droplet journey loop', icon: '\uD83D\uDCA7', check: function(d) { return (d.journeyLoops || 0) >= 1; }, progress: function(d) { return (d.journeyLoops || 0) >= 1 ? 'Complete!' : 'In journey'; } },
      { id: 'complete_3_journeys', label: 'Complete 3 journey loops', icon: '\uD83C\uDFC6', check: function(d) { return (d.journeyLoops || 0) >= 3; }, progress: function(d) { return (d.journeyLoops || 0) + '/3 loops'; } },
      { id: 'explore_all_stages', label: 'View all water cycle stages', icon: '\uD83C\uDF0D', check: function(d) { return Object.keys(d.stagesViewed || {}).length >= 5; }, progress: function(d) { return Object.keys(d.stagesViewed || {}).length + '/5 stages'; } },
      { id: 'adjust_climate', label: 'Experiment with climate controls', icon: '\uD83C\uDF21', check: function(d) { return d.climateAdjusted || false; }, progress: function(d) { return d.climateAdjusted ? 'Explored!' : 'Try the sliders'; } }
    ],
    render:function(ctx){
      var React=ctx.React; var h=React.createElement;
      var labToolData=ctx.toolData; var setLabToolData=ctx.setToolData;
      var setStemLabTool=ctx.setStemLabTool;
      var toolSnapshots=ctx.toolSnapshots; var setToolSnapshots=ctx.setToolSnapshots;
      var addToast=ctx.addToast; var t=ctx.t;
      var ArrowLeft=ctx.icons.ArrowLeft;
      var announceToSR=ctx.announceToSR;
      var a11yClick=ctx.a11yClick;
      var awardStemXP=ctx.awardXP; var getStemXP=ctx.getXP;
      var stemCelebrate=ctx.celebrate; var stemBeep=ctx.beep;
      var gradeLevel=ctx.gradeLevel;
      var callGemini=ctx.callGemini;
      var canvasNarrate=ctx.canvasNarrate;
      return (function(){
const d = labToolData.waterCycle;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, [key]: val } }));

          // ═══ GRADE BAND HELPER ═══
          var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
          function getGradeBand() {
            var ov = d.wcGradeOverride;
            if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
            var gl = (gradeLevel || '5th Grade').toLowerCase();
            if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
            if (/3rd|4th|5th/.test(gl)) return '3-5';
            if (/6th|7th|8th/.test(gl)) return '6-8';
            if (/9th|10|11|12|high/.test(gl)) return '9-12';
            return '3-5';
          }
          var gradeBand = getGradeBand();

          // ═══ GRADE-TIERED STAGES ═══
          const STAGES = [
            { id: 'evaporation', label: t('stem.water_cycle.evaporation'), emoji: '\u2600', color: '#f59e0b',
              desc: { 'K-2': 'The sun heats up water in puddles, lakes, and oceans. The water turns into an invisible gas that floats up into the sky — like when a puddle disappears on a hot day!',
                      '3-5': 'Heat from the sun causes water to change from liquid to gas (water vapor). Oceans, lakes, and rivers provide most of the evaporated water. About 90% of evaporation comes from oceans.',
                      '6-8': 'Solar radiation provides thermal energy that increases water molecule kinetic energy until they escape the liquid surface as vapor. The rate depends on temperature, humidity, wind speed, and surface area. Oceans contribute ~90% of atmospheric moisture.',
                      '9-12': 'Evaporation is governed by the Clausius-Clapeyron relation: saturation vapor pressure increases ~7% per \u00B0C. The latent heat of vaporization is 2.45 MJ/kg at 20\u00B0C. Penman-Monteith equations model evapotranspiration using net radiation, soil heat flux, and aerodynamic resistance.' },
              funFact: { 'K-2': 'If all the water in clouds fell at once, it would only cover the ground with a tiny layer — thinner than your thumb!',
                         '3-5': 'If all the water vapor in the atmosphere rained at once, it would cover Earth with only 2.5 cm of water!',
                         '6-8': 'The atmosphere holds about 12,900 km\u00B3 of water vapor at any time — but that is only 0.001% of all water on Earth.',
                         '9-12': 'Global mean evaporation is ~1,200 mm/yr over oceans. The Bowen ratio (sensible/latent heat) determines partitioning of surface energy into evaporation vs heating.' } },
            { id: 'condensation', label: t('stem.water_cycle.condensation'), emoji: '\u2601', color: '#94a3b8',
              desc: { 'K-2': 'When the warm, wet air goes high up where it is cold, the water vapor turns back into tiny water drops. These tiny drops stick together and make clouds!',
                      '3-5': 'Water vapor cools as it rises, forming tiny droplets around particles of dust, pollen, or pollution, creating clouds. Each cloud droplet is about 10 micrometers wide.',
                      '6-8': 'As air rises, it cools at ~6.5\u00B0C/km (environmental lapse rate). When temperature reaches the dew point, vapor condenses onto cloud condensation nuclei (CCN) — aerosol particles 0.1\u20131 \u00B5m wide. Cloud droplets are typically 5\u201315 \u00B5m.',
                      '9-12': 'Heterogeneous nucleation on CCN requires supersaturation of only ~0.1\u20131%. K\u00F6hler theory describes the competition between the Kelvin effect (curvature) and the Raoult effect (solute). The critical supersaturation determines which CCN activate into cloud droplets.' },
              funFact: { 'K-2': 'A big fluffy cloud weighs as much as 100 elephants! But it floats because the tiny drops are spread out.',
                         '3-5': 'A typical cumulus cloud weighs about 500,000 kg \u2014 as heavy as 100 elephants!',
                         '6-8': 'Clouds reflect ~30% of incoming solar radiation (albedo), making them one of the biggest factors in Earth\'s energy budget.',
                         '9-12': 'Cloud microphysics distinguishes warm-phase (collision-coalescence) and cold-phase (Bergeron-Findeisen) precipitation processes, with ice nucleation occurring at -10\u00B0C to -40\u00B0C.' } },
            { id: 'precipitation', label: t('stem.water_cycle.precipitation'), emoji: '\uD83C\uDF27', color: '#3b82f6',
              desc: { 'K-2': 'When the tiny water drops in clouds bump into each other and get big and heavy, they fall down as rain! If it is very cold, they fall as snow or hail.',
                      '3-5': 'When cloud droplets combine and grow heavy enough, they fall as rain, snow, sleet, or hail. A raindrop falls at about 20 mph and contains about a million cloud droplets.',
                      '6-8': 'Precipitation forms via collision-coalescence (warm clouds) or the Bergeron process (mixed-phase clouds where ice crystals grow at the expense of supercooled droplets). Terminal velocity of a 2mm raindrop is ~6.5 m/s.',
                      '9-12': 'The Marshall-Palmer distribution N(D)=N\u2080e^(-\u039BD) models raindrop size spectra. Z-R relationships (Z=aR^b) connect radar reflectivity to precipitation rate. Convective precipitation involves CAPE > 1000 J/kg driving updrafts.' },
              funFact: { 'K-2': 'A single raindrop is made of about a million teeny-tiny cloud drops all stuck together!',
                         '3-5': 'The wettest place on Earth is Mawsynram, India, with ~11,871 mm of rain per year.',
                         '6-8': 'The largest hailstone ever recorded was 20 cm in diameter — bigger than a softball — and fell in Vivian, South Dakota.',
                         '9-12': 'Global mean precipitation is ~990 mm/yr. ENSO cycles can shift tropical precipitation patterns by hundreds of millimeters per year.' } },
            { id: 'collection', label: t('stem.water_cycle.collection'), emoji: '\uD83C\uDF0A', color: '#0ea5e9',
              desc: { 'K-2': 'Rainwater flows into rivers, lakes, and the big ocean. Some soaks into the ground. Almost all of Earth\'s water is in the salty ocean!',
                      '3-5': 'Water gathers in oceans, rivers, lakes, and underground aquifers. 97% of Earth\'s water is in the oceans. Only 3% is freshwater, and most of that is locked in ice caps.',
                      '6-8': 'Earth holds ~1.386 billion km\u00B3 of water. Oceans contain 96.5%, ice caps 1.74%, groundwater 1.69%, and surface freshwater only 0.01%. Residence time in the ocean averages ~3,200 years.',
                      '9-12': 'The global water budget balances precipitation (~505,000 km\u00B3/yr) against evapotranspiration. Ocean thermohaline circulation redistributes ~1.5 PW of heat poleward. Isotope ratios (\u03B4\u00B9\u2078O, \u03B4D) trace water mass origins.' },
              funFact: { 'K-2': 'If all of Earth\'s water fit in a big jug, the fresh water you can drink would be just one tiny spoonful!',
                         '3-5': 'If all of Earth\'s water fit in a gallon jug, fresh available water would be just one tablespoon.',
                         '6-8': 'The average water molecule spends about 9 days in the atmosphere before falling as precipitation.',
                         '9-12': 'Antarctic ice cores preserve 800,000 years of climate history, with \u03B4\u00B9\u2078O variations of ~5\u2030 between glacial and interglacial periods.' } },
            { id: 'transpiration', label: t('stem.water_cycle.transpiration'), emoji: '\uD83C\uDF3F', color: '#22c55e',
              desc: { 'K-2': 'Plants drink water through their roots. Then the water travels up to the leaves and floats away into the air through tiny holes — like the plant is breathing!',
                      '3-5': 'Plants absorb water through roots and release vapor from tiny pores called stomata in their leaves. A single large oak tree can transpire 150,000 liters per year.',
                      '6-8': 'Transpiration is driven by the soil-plant-atmosphere continuum. Water moves through xylem via cohesion-tension, exiting through ~100,000 stomata per cm\u00B2 of leaf surface. Guard cells regulate stomatal aperture in response to light, CO\u2082, and water stress.',
                      '9-12': 'The Penman-Monteith equation models transpiration: ET = [\u0394(Rn-G) + \u03C1a·cp·VPD/ra] / [\u0394 + \u03B3(1 + rs/ra)]. Stomatal conductance follows the Ball-Berry model linking assimilation, humidity, and CO\u2082 concentration.' },
              funFact: { 'K-2': 'A big oak tree lets out enough water every year to fill a swimming pool!',
                         '3-5': 'An acre of corn transpires about 11,400 liters of water per day!',
                         '6-8': 'Globally, transpiration accounts for about 10% of atmospheric moisture — forests act as giant water pumps.',
                         '9-12': 'Amazon rainforest transpiration generates ~50% of its own rainfall via atmospheric moisture recycling, a process modeled by the "flying rivers" hypothesis.' } },
            { id: 'infiltration', label: t('stem.water_cycle.infiltration'), emoji: '\uD83E\uDEB4', color: '#92400e',
              desc: { 'K-2': 'Some rainwater soaks into the ground like a sponge! It goes down through dirt and rocks, getting cleaned along the way. This underground water fills wells and springs.',
                      '3-5': 'Water soaks through soil and porous rock layers, replenishing underground aquifers that feed wells, springs, and rivers. This process naturally filters the water.',
                      '6-8': 'Infiltration rate depends on soil porosity, hydraulic conductivity, and antecedent moisture. Darcy\'s Law (Q = KA·dh/dl) governs flow through saturated porous media. Typical hydraulic conductivity ranges from 10\u207B\u00B9\u00B2 m/s (clay) to 10\u207B\u00B2 m/s (gravel).',
                      '9-12': 'Richards\' equation extends Darcy\'s Law to unsaturated flow: \u2202\u03B8/\u2202t = \u2207·[K(\u03B8)\u2207(\u03C8+z)]. Van Genuchten parameters characterize soil-water retention curves. Isotope tracers (tritium, \u00B3H) date groundwater residence times from years to millennia.' },
              funFact: { 'K-2': 'Some underground water has been down there longer than the dinosaurs!',
                         '3-5': 'It can take hundreds or thousands of years for water to travel through an aquifer.',
                         '6-8': 'The Ogallala Aquifer under the US Great Plains holds about 3,000 km\u00B3 of water — enough to cover the entire US in 40 cm of water.',
                         '9-12': 'Groundwater depletion in the Indo-Gangetic Basin exceeds 50 km\u00B3/yr, detectable via GRACE satellite gravity anomalies averaging -2 cm/yr equivalent water height.' } },
          ];

          const sel = STAGES.find(s => s.id === (d.activeStage || 'evaporation'));
          // Resolve grade-tiered content
          var selDesc = sel ? (typeof sel.desc === 'object' ? (sel.desc[gradeBand] || sel.desc['3-5']) : sel.desc) : '';
          var selFunFact = sel ? (typeof sel.funFact === 'object' ? (sel.funFact[gradeBand] || sel.funFact['3-5']) : sel.funFact) : '';

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('waterCycle', 'init', {
              first: 'Water Cycle Simulator loaded. Currently viewing ' + (sel ? sel.label : 'evaporation') + '. This interactive diagram shows evaporation, condensation, precipitation, collection, transpiration, and infiltration.',
              repeat: 'Water Cycle, stage: ' + (sel ? sel.label : 'evaporation') + '.',
              terse: 'Water Cycle.'
            }, { debounce: 800 });
          }




          // Canvas animation

          var _lastWcCanvas = null;

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {

              if (_lastWcCanvas && _lastWcCanvas._wcCleanup) { _lastWcCanvas._wcCleanup(); _lastWcCanvas._wcInit = false; }

              _lastWcCanvas = null;

              return;

            }

            _lastWcCanvas = canvasEl;

            if (canvasEl._wcInit) return;

            canvasEl._wcInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            var tick = 0;



            // Evaporation particles (rising)

            var evapPs = [];

            for (var ei = 0; ei < 40; ei++) {

              evapPs.push({ x: Math.random() * cW * 0.55 / dpr, y: cH * 0.6 / dpr + Math.random() * cH * 0.1 / dpr, size: 1.5 + Math.random() * 2, speed: 0.3 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });

            }

            // Rain drops

            var rainPs = [];

            for (var ri = 0; ri < 35; ri++) {

              rainPs.push({ x: cW * 0.1 / dpr + Math.random() * cW * 0.5 / dpr, y: cH * 0.1 / dpr + Math.random() * cH * 0.4 / dpr, speed: 1 + Math.random() * 1.5, len: 3 + Math.random() * 4, phase: Math.random() * Math.PI * 2 });

            }

            // Cloud wisps

            var cloudPs = [];

            for (var ci = 0; ci < 20; ci++) {

              cloudPs.push({ x: Math.random() * cW / dpr, y: cH * 0.05 / dpr + Math.random() * cH * 0.15 / dpr, size: 3 + Math.random() * 5, phase: Math.random() * Math.PI * 2, speed: 0.15 + Math.random() * 0.3 });

            }

            // Transpiration particles (from trees)

            var transPs = [];

            for (var ti = 0; ti < 15; ti++) {

              transPs.push({ x: cW * 0.55 / dpr + Math.random() * cW * 0.15 / dpr, y: cH * 0.45 / dpr + Math.random() * cH * 0.1 / dpr, size: 1 + Math.random() * 1.5, speed: 0.2 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });

            }

            // Infiltration drips

            var infiltPs = [];

            for (var ii = 0; ii < 15; ii++) {

              infiltPs.push({ x: cW * 0.3 / dpr + Math.random() * cW * 0.4 / dpr, y: cH * 0.68 / dpr + Math.random() * cH * 0.05 / dpr, speed: 0.15 + Math.random() * 0.25, phase: Math.random() * Math.PI * 2 });

            }

            // River flow particles

            var riverPs = [];

            for (var rfi = 0; rfi < 12; rfi++) {

              riverPs.push({ t: Math.random(), speed: 0.003 + Math.random() * 0.004 });

            }

            // ═══ CLIMATE LAB — dynamic weather particles ═══
            var snowPs = [];
            for (var si = 0; si < 50; si++) {
              snowPs.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.65 / dpr, size: 1 + Math.random() * 2.5, speed: 0.2 + Math.random() * 0.4, drift: Math.random() * Math.PI * 2, wobble: 0.3 + Math.random() * 0.5 });
            }
            var fogPs = [];
            for (var fi2 = 0; fi2 < 12; fi2++) {
              fogPs.push({ x: Math.random() * cW / dpr, y: cH * 0.5 / dpr + Math.random() * cH * 0.15 / dpr, size: 20 + Math.random() * 30, speed: 0.08 + Math.random() * 0.12, alpha: 0.03 + Math.random() * 0.04 });
            }
            var lightning = { active: false, timer: 0, x: 0, branches: [] };
            var rainbow = { visible: false, alpha: 0 };
            var starField = [];
            for (var sti = 0; sti < 60; sti++) {
              starField.push({ x: Math.random() * cW / dpr, y: Math.random() * cH * 0.35 / dpr, size: 0.5 + Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 });
            }


            // ═══ JOURNEY MODE ENGINE ═══
            var journey = { state: 'idle', progress: 0, pathIdx: 0, timer: 0, particleTrail: [], phase: 0 };

            // Waypoint paths (fractional coords relative to cW/cH, in dpr-independent space)
            var JOURNEY_PATHS = {
              ocean:        { pts: [{x:0.25,y:0.67},{x:0.20,y:0.66},{x:0.15,y:0.67},{x:0.25,y:0.68}], loop: true },
              evaporating:  { pts: [{x:0.25,y:0.64},{x:0.22,y:0.55},{x:0.20,y:0.45},{x:0.22,y:0.35},{x:0.25,y:0.22}], loop: false },
              condensing:   { pts: [{x:0.25,y:0.22},{x:0.30,y:0.18},{x:0.35,y:0.14},{x:0.40,y:0.12}], loop: false },
              precipitating:{ pts: [{x:0.40,y:0.12},{x:0.38,y:0.25},{x:0.36,y:0.38},{x:0.35,y:0.50},{x:0.34,y:0.62}], loop: false },
              river_runoff: { pts: [{x:0.34,y:0.62},{x:0.38,y:0.63},{x:0.45,y:0.64},{x:0.50,y:0.65},{x:0.40,y:0.66},{x:0.30,y:0.67},{x:0.25,y:0.67}], loop: false },
              infiltrating: { pts: [{x:0.34,y:0.62},{x:0.35,y:0.70},{x:0.34,y:0.76},{x:0.33,y:0.82}], loop: false },
              aquifer_flow: { pts: [{x:0.33,y:0.82},{x:0.28,y:0.84},{x:0.22,y:0.83},{x:0.15,y:0.80},{x:0.10,y:0.75},{x:0.08,y:0.70},{x:0.10,y:0.67}], loop: false },
              plant_absorb: { pts: [{x:0.34,y:0.62},{x:0.45,y:0.63},{x:0.55,y:0.62},{x:0.58,y:0.58}], loop: false },
              transpiring:  { pts: [{x:0.58,y:0.58},{x:0.57,y:0.48},{x:0.56,y:0.38},{x:0.55,y:0.28},{x:0.50,y:0.20}], loop: false }
            };

            // Science facts shown at each transition
            var JOURNEY_FACTS = {
              ocean:       'You are in the ocean! 97% of Earth\'s water is here. The sun heats you up...',
              evaporating: 'Solar energy excites your molecules! At 100\u00B0C you become water vapor — invisible gas rising upward.',
              condensing:  'As you rise, temperature drops ~6.5\u00B0C per 1000m. You condense onto tiny dust particles to form a cloud droplet!',
              precipitating:'Cloud droplets collide and merge. When you reach ~0.5mm, gravity overcomes air resistance — you fall!',
              ground_choice:'You hit the ground! Water can take 3 paths from here. Where will you go?',
              river_runoff: 'Surface runoff! You flow downhill over soil and rock, joining streams and rivers back to the ocean.',
              infiltrating: 'You seep through soil pores, filtered naturally. Some water takes hundreds of years to reach the ocean!',
              aquifer_flow: 'Deep underground in porous rock, you join the aquifer — Earth\'s hidden reservoir.',
              plant_absorb: 'Roots absorb you via osmosis! You travel up through the xylem to the leaves.',
              transpiring:  'Through tiny stomata pores, you evaporate from the leaf surface back into the atmosphere!'
            };

            // Journey state labels for HUD
            var JOURNEY_STATE_LABELS = {
              idle: '', ocean: '\uD83C\uDF0A In the Ocean', evaporating: '\u2600\uFE0F Evaporating!',
              condensing: '\u2601\uFE0F Condensing', precipitating: '\uD83C\uDF27\uFE0F Falling!',
              ground_choice: '\uD83E\uDEA8 Choose Your Path', river_runoff: '\uD83C\uDF0A River Runoff',
              infiltrating: '\uD83E\uDEB4 Infiltrating', aquifer_flow: '\uD83D\uDCA7 Aquifer Flow',
              plant_absorb: '\uD83C\uDF3F Absorbed by Plant', transpiring: '\uD83C\uDF43 Transpiring',
              complete: '\u2705 Cycle Complete!'
            };

            // Auto-advance states (after path completes)
            var JOURNEY_NEXT = {
              ocean: 'evaporating', evaporating: 'condensing', condensing: 'precipitating',
              precipitating: 'ground_choice', river_runoff: 'ocean', infiltrating: 'aquifer_flow',
              aquifer_flow: 'ocean', plant_absorb: 'transpiring', transpiring: 'condensing'
            };

            // Shared ground-choice button definitions (used by both draw + click handler)
            var GROUND_CHOICES = [
              { x: 0.20, y: 0.63, w: 0.18, h: 0.08, state: 'river_runoff', pathKey: 'runoff', label: '\uD83C\uDF0A River Path', color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.6)' },
              { x: 0.28, y: 0.72, w: 0.18, h: 0.08, state: 'infiltrating', pathKey: 'infiltrate', label: '\uD83E\uDEB4 Go Underground', color: 'rgba(120,53,15,0.2)', border: 'rgba(120,53,15,0.6)' },
              { x: 0.50, y: 0.56, w: 0.18, h: 0.08, state: 'plant_absorb', pathKey: 'plant', label: '\uD83C\uDF3F Enter Plant', color: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.6)' }
            ];

            // Helper: interpolate along a waypoint path
            function interpPath(pathKey, t) {
              var path = JOURNEY_PATHS[pathKey];
              if (!path) return { x: 0.5, y: 0.5 };
              var pts = path.pts;
              var totalSegs = pts.length - 1;
              if (totalSegs < 1) return { x: pts[0].x, y: pts[0].y };
              var segF = t * totalSegs;
              var segIdx = Math.min(Math.floor(segF), totalSegs - 1);
              var local = segF - segIdx;
              var a = pts[segIdx], b = pts[segIdx + 1];
              return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
            }

            // Drawing the droplet avatar
            function drawDroplet(dx, dy, state, tick) {
              ctx.save();
              var px = dx * cW, py = dy * cH;
              var pulse = 1 + Math.sin(tick * 0.08) * 0.15;
              var baseR = 7 * dpr * pulse;

              // Glow
              var glow = ctx.createRadialGradient(px, py, 0, px, py, baseR * 3);
              if (state === 'evaporating' || state === 'transpiring') {
                glow.addColorStop(0, 'rgba(251,191,36,0.4)'); glow.addColorStop(1, 'rgba(251,191,36,0)');
              } else if (state === 'condensing') {
                glow.addColorStop(0, 'rgba(148,163,184,0.4)'); glow.addColorStop(1, 'rgba(148,163,184,0)');
              } else if (state === 'infiltrating' || state === 'aquifer_flow') {
                glow.addColorStop(0, 'rgba(120,53,15,0.3)'); glow.addColorStop(1, 'rgba(120,53,15,0)');
              } else {
                glow.addColorStop(0, 'rgba(59,130,246,0.4)'); glow.addColorStop(1, 'rgba(59,130,246,0)');
              }
              ctx.fillStyle = glow;
              ctx.beginPath(); ctx.arc(px, py, baseR * 3, 0, Math.PI * 2); ctx.fill();

              // Body
              if (state === 'evaporating' || state === 'transpiring') {
                // Vapor: wispy semi-transparent
                ctx.globalAlpha = 0.5 + Math.sin(tick * 0.06) * 0.2;
                ctx.fillStyle = '#fbbf24';
                for (var vi = 0; vi < 4; vi++) {
                  var vx = px + Math.sin(tick * 0.04 + vi * 1.5) * 4 * dpr;
                  var vy = py + Math.cos(tick * 0.05 + vi * 2) * 3 * dpr;
                  ctx.beginPath(); ctx.arc(vx, vy, (3 + vi) * dpr * 0.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
              } else if (state === 'precipitating') {
                // Raindrop shape
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(px, py - baseR * 1.3);
                ctx.bezierCurveTo(px + baseR, py, px + baseR * 0.6, py + baseR, px, py + baseR);
                ctx.bezierCurveTo(px - baseR * 0.6, py + baseR, px - baseR, py, px, py - baseR * 1.3);
                ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(186,230,253,0.6)';
                ctx.beginPath(); ctx.arc(px - 2 * dpr, py - 2 * dpr, 2 * dpr, 0, Math.PI * 2); ctx.fill();
              } else {
                // Default: water droplet circle
                var bodyColor = (state === 'infiltrating' || state === 'aquifer_flow') ? '#0369a1' : 
                                 state === 'plant_absorb' ? '#16a34a' : '#0ea5e9';
                ctx.fillStyle = bodyColor;
                ctx.beginPath(); ctx.arc(px, py, baseR, 0, Math.PI * 2); ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath(); ctx.arc(px - 2 * dpr, py - 2 * dpr, baseR * 0.35, 0, Math.PI * 2); ctx.fill();
              }

              // Trail particles
              journey.particleTrail.push({ x: dx, y: dy, age: 0 });
              if (journey.particleTrail.length > 20) journey.particleTrail.shift();
              for (var ti = 0; ti < journey.particleTrail.length; ti++) {
                var tp2 = journey.particleTrail[ti];
                tp2.age++;
                var ta = Math.max(0, 1 - tp2.age / 25);
                ctx.fillStyle = 'rgba(147,197,253,' + (ta * 0.3) + ')';
                ctx.beginPath(); ctx.arc(tp2.x * cW, tp2.y * cH, (2 + ta * 3) * dpr, 0, Math.PI * 2); ctx.fill();
              }

              ctx.restore();
            }

            // Click handler for journey decisions — uses shared GROUND_CHOICES for hit zones
            canvasEl.addEventListener('click', function(e) {
              if (journey.state !== 'ground_choice') return;
              var rect = canvasEl.getBoundingClientRect();
              var mx = (e.clientX - rect.left) / rect.width;
              var my = (e.clientY - rect.top) / rect.height;

              for (var gci = 0; gci < GROUND_CHOICES.length; gci++) {
                var gc = GROUND_CHOICES[gci];
                if (mx >= gc.x && mx <= gc.x + gc.w && my >= gc.y && my <= gc.y + gc.h) {
                  // Sync canvas-side state
                  journey.state = gc.state; journey.progress = 0; journey.particleTrail = [];
                  canvasEl.dataset.journeyState = gc.state;
                  if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition(gc.state);
                  // Sync React state via upd()
                  if (canvasEl._wcSyncReact) canvasEl._wcSyncReact(gc.state, gc.pathKey);
                  break;
                }
              }
            });

            function draw() {

              tick++;

              ctx.clearRect(0, 0, cW, cH);



              // ── Sky gradient with dynamic time + climate response ──

              var dayPhase = (Math.sin(tick * 0.003) + 1) / 2;
              var cSolar = parseFloat(canvasEl.dataset.climSolar || '1.0');
              var skyBright = Math.max(0, Math.min(1, cSolar));

              var g = ctx.createLinearGradient(0, 0, 0, cH * 0.6);
              if (skyBright < 0.3) {
                // Night sky — deep indigo/navy
                var nf = skyBright / 0.3;
                g.addColorStop(0, 'hsl(230,' + (40 + nf * 20) + '%,' + (8 + nf * 15) + '%)');
                g.addColorStop(0.5, 'hsl(220,' + (30 + nf * 15) + '%,' + (12 + nf * 18) + '%)');
                g.addColorStop(1, 'hsl(210,' + (25 + nf * 20) + '%,' + (15 + nf * 20) + '%)');
              } else if (skyBright < 0.6) {
                // Dawn/dusk — warm oranges and purples
                var df = (skyBright - 0.3) / 0.3;
                g.addColorStop(0, 'hsl(' + (240 - df * 30) + ',' + (50 + df * 15) + '%,' + (25 + df * 30) + '%)');
                g.addColorStop(0.5, 'hsl(' + (220 - df * 20) + ',60%,' + (40 + df * 20) + '%)');
                g.addColorStop(1, 'hsl(' + (210 - df * 15) + ',' + (50 + df * 10) + '%,' + (50 + df * 15) + '%)');
              } else {
                // Bright day
                var bf = Math.min(1, (skyBright - 0.6) / 0.4);
                g.addColorStop(0, 'hsl(210,' + (60 + dayPhase * 20 + bf * 10) + '%,' + (50 + dayPhase * 25 + bf * 10) + '%)');
                g.addColorStop(0.5, 'hsl(200,70%,' + (65 + dayPhase * 15) + '%)');
                g.addColorStop(1, 'hsl(190,60%,' + (70 + dayPhase * 10) + '%)');
              }

              ctx.fillStyle = g;

              ctx.fillRect(0, 0, cW, cH * 0.65);



              // ── Sun with animated rays ──

              var sunX = cW * 0.82;

              var sunY = cH * 0.08 + Math.sin(tick * 0.005) * cH * 0.03;

              // Outer glow

              var sunGlow = ctx.createRadialGradient(sunX, sunY, 8 * dpr, sunX, sunY, 50 * dpr);

              sunGlow.addColorStop(0, 'rgba(251,191,36,0.4)');

              sunGlow.addColorStop(1, 'rgba(251,191,36,0)');

              ctx.fillStyle = sunGlow;

              ctx.fillRect(sunX - 50 * dpr, sunY - 50 * dpr, 100 * dpr, 100 * dpr);

              ctx.beginPath(); ctx.arc(sunX, sunY, 16 * dpr, 0, Math.PI * 2);

              ctx.fillStyle = '#fbbf24'; ctx.fill();

              // Rays

              for (var sr = 0; sr < 12; sr++) {

                var sra = sr * Math.PI / 6 + tick * 0.008;

                var innerR = 20 * dpr;

                var outerR = (28 + Math.sin(tick * 0.05 + sr) * 5) * dpr;

                ctx.beginPath();

                ctx.moveTo(sunX + Math.cos(sra) * innerR, sunY + Math.sin(sra) * innerR);

                ctx.lineTo(sunX + Math.cos(sra) * outerR, sunY + Math.sin(sra) * outerR);

                ctx.strokeStyle = 'rgba(251,191,36,' + (0.3 + Math.sin(tick * 0.03 + sr) * 0.2) + ')';

                ctx.lineWidth = 2 * dpr; ctx.stroke();

              }



              // ── Mountains (enhanced with rock texture, cracks, snow patches) ──

              // Back mountain

              ctx.fillStyle = '#475569';

              ctx.beginPath(); ctx.moveTo(cW * 0.55, cH * 0.65); ctx.lineTo(cW * 0.72, cH * 0.3); ctx.lineTo(cW * 0.9, cH * 0.65); ctx.fill();

              // Back mountain rock cracks

              ctx.strokeStyle = 'rgba(30,41,59,0.3)'; ctx.lineWidth = 1 * dpr;

              for (var mci = 0; mci < 5; mci++) {

                var mcx = cW * 0.62 + mci * cW * 0.055;

                var mcy = cH * 0.4 + mci * cH * 0.04;

                ctx.beginPath(); ctx.moveTo(mcx, mcy); ctx.lineTo(mcx + 8 * dpr, mcy + 15 * dpr); ctx.stroke();

              }

              // Snow cap (larger, more detailed)

              ctx.fillStyle = '#e2e8f0';

              ctx.beginPath(); ctx.moveTo(cW * 0.685, cH * 0.34); ctx.lineTo(cW * 0.72, cH * 0.3); ctx.lineTo(cW * 0.755, cH * 0.34);

              ctx.lineTo(cW * 0.74, cH * 0.37); ctx.lineTo(cW * 0.725, cH * 0.36); ctx.lineTo(cW * 0.71, cH * 0.375); ctx.lineTo(cW * 0.695, cH * 0.355); ctx.closePath(); ctx.fill();

              // Snow highlights

              ctx.fillStyle = 'rgba(255,255,255,0.5)';

              ctx.beginPath(); ctx.arc(cW * 0.72, cH * 0.32, 4 * dpr, 0, Math.PI * 2); ctx.fill();

              // Snow melt stream

              ctx.strokeStyle = 'rgba(147,197,253,0.4)'; ctx.lineWidth = 1.5 * dpr;

              ctx.beginPath(); ctx.moveTo(cW * 0.725, cH * 0.36);

              ctx.quadraticCurveTo(cW * 0.73, cH * 0.42, cW * 0.735, cH * 0.48);

              ctx.quadraticCurveTo(cW * 0.728, cH * 0.54, cW * 0.74, cH * 0.6);

              ctx.stroke();

              // Front mountain

              ctx.fillStyle = '#374151';

              ctx.beginPath(); ctx.moveTo(cW * 0.65, cH * 0.65); ctx.lineTo(cW * 0.82, cH * 0.38); ctx.lineTo(cW * 0.98, cH * 0.65); ctx.fill();

              // Front mountain rock textures

              ctx.strokeStyle = 'rgba(55,65,81,0.4)'; ctx.lineWidth = 0.8 * dpr;

              for (var mti = 0; mti < 6; mti++) {

                var mtx = cW * 0.72 + mti * cW * 0.04;

                var mty = cH * 0.45 + mti * cH * 0.02;

                ctx.beginPath(); ctx.moveTo(mtx, mty);

                ctx.lineTo(mtx + (mti % 2 === 0 ? 6 : -5) * dpr, mty + 12 * dpr);

                ctx.lineTo(mtx + 3 * dpr, mty + 20 * dpr); ctx.stroke();

              }

              // Front mountain snow patch

              ctx.fillStyle = '#e2e8f0';

              ctx.beginPath(); ctx.moveTo(cW * 0.8, cH * 0.40); ctx.lineTo(cW * 0.82, cH * 0.38); ctx.lineTo(cW * 0.84, cH * 0.41);

              ctx.lineTo(cW * 0.83, cH * 0.43); ctx.lineTo(cW * 0.81, cH * 0.42); ctx.closePath(); ctx.fill();



              // ── Ground ──

              var groundGrad = ctx.createLinearGradient(0, cH * 0.62, 0, cH * 0.72);

              groundGrad.addColorStop(0, '#4ade80');

              groundGrad.addColorStop(0.5, '#22c55e');

              groundGrad.addColorStop(1, '#166534');

              ctx.fillStyle = groundGrad;

              ctx.fillRect(0, cH * 0.62, cW, cH * 0.1);

              // Grass blades along ground surface

              for (var gbi = 0; gbi < 80; gbi++) {

                var gbx = (gbi / 80) * cW;

                // Skip water area

                if (gbx < cW * 0.55) continue;

                var gby = cH * 0.62;

                var gbSway = Math.sin(tick * 0.015 + gbi * 0.7) * 3 * dpr;

                var gbHeight = (4 + Math.random() * 5) * dpr;

                ctx.strokeStyle = gbi % 3 === 0 ? 'rgba(74,222,128,0.6)' : 'rgba(34,197,94,0.5)';

                ctx.lineWidth = 1 * dpr;

                ctx.beginPath(); ctx.moveTo(gbx, gby);

                ctx.lineTo(gbx + gbSway, gby - gbHeight); ctx.stroke();

                // Some grass with seed heads

                if (gbi % 8 === 0) {

                  ctx.fillStyle = 'rgba(250,204,21,0.4)';

                  ctx.beginPath(); ctx.arc(gbx + gbSway, gby - gbHeight, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                }

              }



              // ── Underground / Aquifer layer ──

              var underGrad = ctx.createLinearGradient(0, cH * 0.72, 0, cH);

              underGrad.addColorStop(0, '#78350f');

              underGrad.addColorStop(0.3, '#92400e');

              underGrad.addColorStop(0.6, '#451a03');

              underGrad.addColorStop(1, '#1c1917');

              ctx.fillStyle = underGrad;

              ctx.fillRect(0, cH * 0.72, cW, cH * 0.28);

              // Aquifer water table

              ctx.fillStyle = 'rgba(14,165,233,0.15)';

              ctx.beginPath();

              ctx.moveTo(0, cH * 0.82);

              for (var ax = 0; ax <= cW; ax += 10) {

                ctx.lineTo(ax, cH * 0.82 + Math.sin(ax * 0.01 + tick * 0.01) * 4 * dpr);

              }

              ctx.lineTo(cW, cH); ctx.lineTo(0, cH); ctx.closePath(); ctx.fill();

              // Aquifer shimmer highlights

              ctx.fillStyle = 'rgba(56,189,248,0.08)';

              for (var ashi = 0; ashi < 8; ashi++) {

                var ashx = ((tick * 0.3 + ashi * cW * 0.13) % cW);

                var ashy = cH * 0.84 + Math.sin(ashi * 2.3) * cH * 0.04;

                ctx.beginPath(); ctx.ellipse(ashx, ashy, 12 * dpr, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();

              }

              // Rock layer lines

              ctx.strokeStyle = 'rgba(120,53,15,0.3)';

              ctx.lineWidth = 1 * dpr;

              for (var rl = 0; rl < 3; rl++) {

                ctx.beginPath();

                var rly = cH * (0.76 + rl * 0.06);

                for (var rx = 0; rx <= cW; rx += 8) {

                  ctx.lineTo(rx, rly + Math.sin(rx * 0.015 + rl * 2) * 3 * dpr);

                }

                ctx.stroke();

              }

              // Rock pebbles / gravel in underground layers

              ctx.fillStyle = 'rgba(168,130,100,0.25)';

              for (var rpi2 = 0; rpi2 < 15; rpi2++) {

                var rpx2 = (rpi2 * cW * 0.07 + cW * 0.03) % cW;

                var rpy2 = cH * (0.74 + (rpi2 % 4) * 0.05);

                ctx.beginPath(); ctx.ellipse(rpx2, rpy2, (2 + rpi2 % 3) * dpr, (1.5 + rpi2 % 2) * dpr, rpi2 * 0.5, 0, Math.PI * 2); ctx.fill();

              }

              // Underground tiny aquifer organisms

              for (var aqi = 0; aqi < 5; aqi++) {

                var aqx = ((tick * 0.2 + aqi * cW * 0.21) % cW);

                var aqy = cH * 0.85 + Math.sin(tick * 0.02 + aqi * 1.7) * 4 * dpr;

                var aqAlpha = 0.2 + 0.15 * Math.sin(tick * 0.03 + aqi);

                // Tiny worm-like organism

                ctx.strokeStyle = 'rgba(14,165,233,' + aqAlpha + ')'; ctx.lineWidth = 1 * dpr; ctx.lineCap = 'round';

                ctx.beginPath(); ctx.moveTo(aqx, aqy);

                for (var aqw = 1; aqw <= 4; aqw++) {

                  ctx.lineTo(aqx + aqw * 3 * dpr, aqy + Math.sin(tick * 0.05 + aqw + aqi) * 2 * dpr);

                }

                ctx.stroke();

              }



              // ── Water body (ocean/lake) ──

              var waterGrad = ctx.createLinearGradient(0, cH * 0.62, 0, cH * 0.72);

              waterGrad.addColorStop(0, 'rgba(14,165,233,0.7)');

              waterGrad.addColorStop(1, 'rgba(3,105,161,0.8)');

              ctx.fillStyle = waterGrad;

              ctx.beginPath();

              ctx.moveTo(0, cH * 0.65);

              for (var wx = 0; wx <= cW * 0.55; wx += 4) {

                ctx.lineTo(wx, cH * 0.65 + Math.sin(wx * 0.02 + tick * 0.04) * 3 * dpr);

              }

              ctx.lineTo(cW * 0.55, cH * 0.72); ctx.lineTo(0, cH * 0.72); ctx.closePath(); ctx.fill();

              // Wave highlights

              ctx.strokeStyle = 'rgba(186,230,253,0.3)';

              ctx.lineWidth = 1.5 * dpr;

              for (var wl = 0; wl < 3; wl++) {

                ctx.beginPath();

                var wly = cH * (0.66 + wl * 0.02);

                for (var wlx = 0; wlx <= cW * 0.5; wlx += 6) {

                  ctx.lineTo(wlx, wly + Math.sin(wlx * 0.025 + tick * 0.05 + wl * 1.5) * 2 * dpr);

                }

                ctx.stroke();

              }



              // ── River from mountain (enhanced with rapids) ──

              ctx.strokeStyle = 'rgba(59,130,246,0.5)';

              ctx.lineWidth = 4 * dpr;

              ctx.beginPath();

              ctx.moveTo(cW * 0.78, cH * 0.42);

              ctx.quadraticCurveTo(cW * 0.7, cH * 0.52, cW * 0.55, cH * 0.65);

              ctx.stroke();

              ctx.strokeStyle = 'rgba(186,230,253,0.3)';

              ctx.lineWidth = 2 * dpr;

              ctx.stroke();

              // River ripple highlights

              ctx.strokeStyle = 'rgba(186,230,253,0.2)'; ctx.lineWidth = 1 * dpr;

              for (var rhi = 0; rhi < 5; rhi++) {

                var rhT = ((tick * 0.005 + rhi * 0.2) % 1);

                var rhx = (1 - rhT) * (1 - rhT) * cW * 0.78 + 2 * (1 - rhT) * rhT * cW * 0.7 + rhT * rhT * cW * 0.55;

                var rhy = (1 - rhT) * (1 - rhT) * cH * 0.42 + 2 * (1 - rhT) * rhT * cH * 0.52 + rhT * rhT * cH * 0.65;

                ctx.beginPath();

                ctx.ellipse(rhx, rhy, 4 * dpr, 1.5 * dpr, 0.3, 0, Math.PI * 2); ctx.stroke();

              }

              // River flow particles

              for (var rfp = 0; rfp < riverPs.length; rfp++) {

                var rp = riverPs[rfp];

                rp.t += rp.speed;

                if (rp.t > 1) rp.t -= 1;

                var t2 = rp.t;

                var rpx = (1 - t2) * (1 - t2) * cW * 0.78 + 2 * (1 - t2) * t2 * cW * 0.7 + t2 * t2 * cW * 0.55;

                var rpy = (1 - t2) * (1 - t2) * cH * 0.42 + 2 * (1 - t2) * t2 * cH * 0.52 + t2 * t2 * cH * 0.65;

                ctx.beginPath();

                ctx.arc(rpx / dpr * dpr, rpy / dpr * dpr, 2 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(147,197,253,' + (0.4 + Math.sin(t2 * Math.PI) * 0.3) + ')';

                ctx.fill();

              }

              // ── Waterfall where river meets ocean ──

              var wfX = cW * 0.55, wfY = cH * 0.65;

              // Falling water streaks

              ctx.strokeStyle = 'rgba(147,197,253,0.5)'; ctx.lineWidth = 1.5 * dpr;

              for (var wfi = 0; wfi < 5; wfi++) {

                var wfOffset = (wfi - 2) * 3 * dpr;

                var wfDrop = ((tick * 2 + wfi * 17) % 30) * dpr / 10;

                ctx.beginPath(); ctx.moveTo(wfX + wfOffset, wfY);

                ctx.lineTo(wfX + wfOffset - 1 * dpr, wfY + (4 + wfDrop) * dpr); ctx.stroke();

              }

              // Splash spray particles at base

              ctx.fillStyle = 'rgba(186,230,253,0.4)';

              for (var spi = 0; spi < 6; spi++) {

                var spPhase = tick * 0.06 + spi * 1.1;

                var spx = wfX + Math.sin(spPhase) * 6 * dpr;

                var spy = wfY + 3 * dpr - Math.abs(Math.sin(spPhase * 0.7)) * 5 * dpr;

                ctx.beginPath(); ctx.arc(spx, spy, (1 + Math.sin(spPhase) * 0.5) * dpr, 0, Math.PI * 2); ctx.fill();

              }

              // Mist above waterfall

              ctx.fillStyle = 'rgba(186,230,253,0.1)';

              ctx.beginPath(); ctx.arc(wfX, wfY - 3 * dpr, 10 * dpr, 0, Math.PI * 2); ctx.fill();



              // ── Trees (enhanced with bark texture, roots, fruit, leaf veins) ──

              function drawTree(tx, ty, sz) {

                var sway = Math.sin(tick * 0.01 + tx * 0.1) * 1.5;

                // Roots (visible underground)

                ctx.strokeStyle = 'rgba(120,53,15,0.5)'; ctx.lineWidth = 1.5 * sz * dpr;

                for (var ri = 0; ri < 4; ri++) {

                  var rootDir = (ri - 1.5) * 8 * sz;

                  ctx.beginPath(); ctx.moveTo(tx * dpr, (ty + 2 * sz) * dpr);

                  ctx.quadraticCurveTo((tx + rootDir * 0.5) * dpr, (ty + 8 * sz) * dpr, (tx + rootDir) * dpr, (ty + 12 * sz + ri * 2 * sz) * dpr);

                  ctx.stroke();

                  // Root tips

                  ctx.fillStyle = 'rgba(120,53,15,0.3)';

                  ctx.beginPath(); ctx.arc((tx + rootDir) * dpr, (ty + 12 * sz + ri * 2 * sz) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                }

                // Trunk with bark texture

                var trunkGrad = ctx.createLinearGradient((tx - 2 * sz) * dpr, ty * dpr, (tx + 2 * sz) * dpr, ty * dpr);

                trunkGrad.addColorStop(0, '#78350f'); trunkGrad.addColorStop(0.4, '#92400e'); trunkGrad.addColorStop(0.7, '#a16207'); trunkGrad.addColorStop(1, '#78350f');

                ctx.fillStyle = trunkGrad;

                ctx.fillRect((tx - 2 * sz) * dpr, (ty - 10 * sz) * dpr, 4 * sz * dpr, 12 * sz * dpr);

                // Bark texture lines

                ctx.strokeStyle = 'rgba(60,30,10,0.3)'; ctx.lineWidth = 0.5 * dpr;

                for (var bi = 0; bi < 4; bi++) {

                  var by = (ty - 8 * sz + bi * 4 * sz);

                  ctx.beginPath(); ctx.moveTo((tx - 1.5 * sz) * dpr, by * dpr);

                  ctx.lineTo((tx + 1.5 * sz) * dpr, (by + 1 * sz) * dpr); ctx.stroke();

                }

                // Canopy layers

                ctx.fillStyle = '#22c55e';

                ctx.beginPath(); ctx.arc((tx + sway) * dpr, (ty - 16 * sz) * dpr, 9 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#16a34a';

                ctx.beginPath(); ctx.arc((tx - 4 * sz + sway * 0.7) * dpr, (ty - 12 * sz) * dpr, 7 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc((tx + 5 * sz + sway * 0.7) * dpr, (ty - 13 * sz) * dpr, 6 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                // Dark canopy shadow

                ctx.fillStyle = 'rgba(22,101,52,0.3)';

                ctx.beginPath(); ctx.arc((tx + sway * 0.5) * dpr, (ty - 11 * sz) * dpr, 5 * sz * dpr, 0, Math.PI * 2); ctx.fill();

                // Leaf vein lines

                ctx.strokeStyle = 'rgba(21,128,61,0.25)'; ctx.lineWidth = 0.5 * dpr;

                for (var lvi = 0; lvi < 3; lvi++) {

                  var lvx = tx + (lvi - 1) * 4 * sz + sway * 0.6;

                  var lvy = ty - 14 * sz + lvi * 2 * sz;

                  ctx.beginPath(); ctx.moveTo(lvx * dpr, lvy * dpr);

                  ctx.lineTo((lvx + 5 * sz) * dpr, (lvy + 3 * sz) * dpr); ctx.stroke();

                }

                // Small fruit/flower dots

                if (Math.sin(tx) > 0) {

                  ctx.fillStyle = 'rgba(239,68,68,0.6)';

                  for (var fdi = 0; fdi < 3; fdi++) {

                    ctx.beginPath(); ctx.arc((tx + (fdi - 1) * 5 * sz + sway * 0.5) * dpr, (ty - 14 * sz + fdi * 3 * sz) * dpr, 1.5 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

                } else {

                  ctx.fillStyle = 'rgba(251,191,36,0.5)';

                  for (var fli = 0; fli < 2; fli++) {

                    ctx.beginPath(); ctx.arc((tx + (fli - 0.5) * 6 * sz + sway * 0.4) * dpr, (ty - 15 * sz + fli * 4 * sz) * dpr, 2 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

                }

              }

              drawTree(cW * 0.6 / dpr, cH * 0.62 / dpr, 1.1);

              drawTree(cW * 0.67 / dpr, cH * 0.61 / dpr, 0.8);

              drawTree(cW * 0.54 / dpr, cH * 0.63 / dpr, 0.7);



              // ── Clouds ──

              function drawCloud(ccx, ccy, sz) {

                ctx.fillStyle = 'rgba(226,232,240,0.85)';

                ctx.beginPath(); ctx.arc(ccx, ccy, sz, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx - sz * 0.7, ccy + sz * 0.2, sz * 0.7, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx + sz * 0.7, ccy + sz * 0.15, sz * 0.85, 0, Math.PI * 2); ctx.fill();

                ctx.beginPath(); ctx.arc(ccx + sz * 0.3, ccy - sz * 0.3, sz * 0.6, 0, Math.PI * 2); ctx.fill();

                // Bottom flat

                ctx.fillStyle = 'rgba(203,213,225,0.5)';

                ctx.fillRect(ccx - sz * 1.2, ccy + sz * 0.4, sz * 2.4, sz * 0.3);

              }

              drawCloud(cW * 0.2 + Math.sin(tick * 0.004) * 15, cH * 0.14, 16 * dpr);

              drawCloud(cW * 0.45 + Math.cos(tick * 0.003) * 12, cH * 0.1, 20 * dpr);

              drawCloud(cW * 0.35 + Math.sin(tick * 0.005) * 10, cH * 0.2, 13 * dpr);



              // ── Evaporation particles ──

              for (var epi = 0; epi < evapPs.length; epi++) {

                var ep = evapPs[epi];

                ep.y -= ep.speed * 0.4;

                ep.x += Math.sin(ep.phase + tick * 0.02) * 0.3;

                ep.phase += 0.03;

                if (ep.y < cH * 0.12 / dpr) { ep.y = cH * 0.62 / dpr; ep.x = Math.random() * cW * 0.5 / dpr; }

                ctx.beginPath(); ctx.arc(ep.x * dpr, ep.y * dpr, ep.size * dpr, 0, Math.PI * 2);

                var epAlpha = 0.2 + 0.2 * Math.sin(ep.phase);

                ctx.fillStyle = 'rgba(251,191,36,' + epAlpha + ')';

                ctx.fill();

              }



              // ── Transpiration particles (green, from trees) ──

              for (var tpi = 0; tpi < transPs.length; tpi++) {

                var tp = transPs[tpi];

                tp.y -= tp.speed * 0.35;

                tp.x += Math.sin(tp.phase + tick * 0.025) * 0.25;

                tp.phase += 0.04;

                if (tp.y < cH * 0.15 / dpr) { tp.y = cH * 0.48 / dpr; tp.x = cW * 0.55 / dpr + Math.random() * cW * 0.15 / dpr; }

                ctx.beginPath(); ctx.arc(tp.x * dpr, tp.y * dpr, tp.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(74,222,128,' + (0.2 + Math.sin(tp.phase) * 0.15) + ')';

                ctx.fill();

              }



              // ── Rain drops ──

              for (var rpi = 0; rpi < rainPs.length; rpi++) {

                var rr = rainPs[rpi];

                rr.y += rr.speed * 1.3;

                rr.x -= 0.15; // Slight wind

                if (rr.y > cH * 0.65 / dpr) {

                  rr.y = cH * 0.12 / dpr;

                  rr.x = cW * 0.1 / dpr + Math.random() * cW * 0.5 / dpr;

                }

                ctx.strokeStyle = 'rgba(59,130,246,' + (0.3 + Math.sin(rr.phase + tick * 0.05) * 0.2) + ')';

                ctx.lineWidth = 1.5 * dpr;

                ctx.beginPath();

                ctx.moveTo(rr.x * dpr, rr.y * dpr);

                ctx.lineTo((rr.x - 0.5) * dpr, (rr.y + rr.len) * dpr);

                ctx.stroke();

              }



              // ── Cloud wisps (drifting) ──

              for (var cwi = 0; cwi < cloudPs.length; cwi++) {

                var cw = cloudPs[cwi];

                cw.x += cw.speed;

                if (cw.x > cW / dpr + 20) cw.x = -20;

                ctx.beginPath();

                ctx.arc(cw.x * dpr, cw.y * dpr, cw.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(226,232,240,' + (0.15 + Math.sin(cw.phase + tick * 0.01) * 0.1) + ')';

                ctx.fill();

              }



              // ── Infiltration drips (into ground) ──

              for (var ipi = 0; ipi < infiltPs.length; ipi++) {

                var ip = infiltPs[ipi];

                ip.y += ip.speed;

                ip.x += Math.sin(ip.phase + tick * 0.01) * 0.1;

                if (ip.y > cH * 0.88 / dpr) { ip.y = cH * 0.7 / dpr; ip.x = cW * 0.3 / dpr + Math.random() * cW * 0.4 / dpr; }

                ctx.beginPath(); ctx.arc(ip.x * dpr, ip.y * dpr, 1.5 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(59,130,246,0.2)';

                ctx.fill();

              }



              // ── Process Labels on diagram ──

              var activeId = canvasEl.dataset.activeStage || 'evaporation';

              ctx.textAlign = 'left';

              var labels = [

                { id: 'evaporation', text: '\u2191 Evaporation', x: 8, y: cH * 0.54, color: '#fbbf24' },

                { id: 'condensation', text: '\u2601 Condensation', x: cW * 0.28, y: cH * 0.06, color: '#94a3b8' },

                { id: 'precipitation', text: '\u2193 Precipitation', x: cW * 0.08, y: cH * 0.28, color: '#60a5fa' },

                { id: 'collection', text: '\uD83C\uDF0A Collection', x: cW * 0.55, y: cH * 0.72, color: '#0ea5e9' },

                { id: 'transpiration', text: '\uD83C\uDF3F Transpiration', x: cW * 0.70, y: cH * 0.42, color: '#22c55e' },

                { id: 'infiltration', text: '\uD83E\uDEB4 Infiltration', x: cW * 0.42, y: cH * 0.80, color: '#92400e' }

              ];

              labels.forEach(function (lbl) {

                var isActive = activeId === lbl.id;

                ctx.font = (isActive ? 'bold ' : '') + ((isActive ? 8 : 7) * dpr) + 'px sans-serif';

                ctx.fillStyle = isActive ? lbl.color : lbl.color + '80';

                ctx.fillText(lbl.text, lbl.x * dpr, lbl.y * dpr);

                if (isActive) {

                  ctx.strokeStyle = lbl.color + '40';

                  ctx.lineWidth = 1 * dpr;

                  ctx.setLineDash([4, 3]);

                  ctx.strokeRect((lbl.x - 2) * dpr, (lbl.y - 10) * dpr, ctx.measureText(lbl.text).width + 6 * dpr, 14 * dpr);

                  ctx.setLineDash([]);

                }

              });



              // ── Flying birds ──

              for (var bdi = 0; bdi < 4; bdi++) {

                var bdx = ((tick * 0.4 + bdi * cW * 0.28) % (cW + 40 * dpr)) - 20 * dpr;

                var bdy = cH * (0.08 + bdi * 0.06) + Math.sin(tick * 0.015 + bdi * 2) * 8 * dpr;

                var bdWing = Math.sin(tick * 0.06 + bdi * 1.5) * 0.4;

                ctx.strokeStyle = 'rgba(30,41,59,' + (0.3 + bdi * 0.05) + ')'; ctx.lineWidth = 1.2 * dpr;

                // Left wing

                ctx.beginPath(); ctx.moveTo(bdx - 6 * dpr, bdy + bdWing * 4 * dpr);

                ctx.quadraticCurveTo(bdx - 3 * dpr, bdy - 3 * dpr, bdx, bdy); ctx.stroke();

                // Right wing

                ctx.beginPath(); ctx.moveTo(bdx + 6 * dpr, bdy + bdWing * 4 * dpr);

                ctx.quadraticCurveTo(bdx + 3 * dpr, bdy - 3 * dpr, bdx, bdy); ctx.stroke();

              }


              // ═══ CLIMATE LAB — Dynamic Weather Effects ═══
              var climSolar = parseFloat(canvasEl.dataset.climSolar || '1.0');
              var climTemp = parseFloat(canvasEl.dataset.climTemp || '15');
              var climWind = parseFloat(canvasEl.dataset.climWind || '1.0');

              // ── Stars at night (visible when solar < 0.4) ──
              if (climSolar < 0.4) {
                var starAlpha = Math.max(0, (0.4 - climSolar) / 0.4);
                for (var stj = 0; stj < starField.length; stj++) {
                  var st = starField[stj];
                  var twk = 0.3 + 0.7 * Math.abs(Math.sin(tick * 0.02 + st.twinkle));
                  ctx.fillStyle = 'rgba(255,255,255,' + (starAlpha * twk * 0.8) + ')';
                  ctx.beginPath(); ctx.arc(st.x * dpr, st.y * dpr, st.size * dpr, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Sun reflection shimmer on water ──
              if (climSolar > 0.5) {
                var refAlpha = (climSolar - 0.5) * 0.4;
                for (var sri = 0; sri < 8; sri++) {
                  var srx = cW * 0.15 + ((tick * 0.8 + sri * cW * 0.06) % (cW * 0.4));
                  var sry = cH * 0.66 + Math.sin(tick * 0.04 + sri * 1.3) * 2 * dpr;
                  ctx.fillStyle = 'rgba(251,230,180,' + (refAlpha * (0.3 + Math.sin(tick * 0.06 + sri) * 0.2)) + ')';
                  ctx.beginPath(); ctx.ellipse(srx, sry, (6 + Math.sin(tick * 0.03 + sri) * 2) * dpr, 1.5 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Lightning (random, when temp > 30) ──
              if (climTemp > 30) {
                lightning.timer--;
                if (lightning.timer <= 0 && Math.random() < 0.003) {
                  lightning.active = true;
                  lightning.timer = 6 + Math.floor(Math.random() * 4);
                  lightning.x = cW * 0.15 + Math.random() * cW * 0.4;
                  lightning.branches = [];
                  var lx = lightning.x, ly = cH * 0.08;
                  for (var lb = 0; lb < 8; lb++) {
                    var nx = lx + (Math.random() - 0.5) * 20 * dpr;
                    var ny = ly + (10 + Math.random() * 15) * dpr;
                    lightning.branches.push({ x1: lx, y1: ly, x2: nx, y2: ny });
                    lx = nx; ly = ny;
                    if (Math.random() < 0.35) {
                      lightning.branches.push({ x1: nx, y1: ny, x2: nx + (Math.random() - 0.5) * 30 * dpr, y2: ny + 12 * dpr });
                    }
                  }
                }
                if (lightning.active && lightning.timer > 0) {
                  ctx.save();
                  ctx.shadowColor = 'rgba(147,197,253,0.9)'; ctx.shadowBlur = 15 * dpr;
                  ctx.strokeStyle = 'rgba(220,240,255,0.95)'; ctx.lineWidth = 2.5 * dpr; ctx.lineCap = 'round';
                  for (var lbi = 0; lbi < lightning.branches.length; lbi++) {
                    var br = lightning.branches[lbi];
                    ctx.beginPath(); ctx.moveTo(br.x1, br.y1); ctx.lineTo(br.x2, br.y2); ctx.stroke();
                  }
                  // Flash overlay
                  ctx.fillStyle = 'rgba(200,220,255,' + (lightning.timer / 10 * 0.15) + ')';
                  ctx.fillRect(0, 0, cW, cH);
                  ctx.restore();
                } else { lightning.active = false; }
              }

              // ── Snowflakes (when temp < 0) ──
              if (climTemp < 0) {
                var snowAlpha = Math.min(1, Math.abs(climTemp) / 15);
                var snowCount = Math.floor(snowPs.length * snowAlpha);
                for (var sni = 0; sni < snowCount; sni++) {
                  var sn = snowPs[sni];
                  sn.y += sn.speed * 0.5;
                  sn.x += Math.sin(sn.drift + tick * 0.01) * sn.wobble * climWind;
                  sn.drift += 0.02;
                  if (sn.y > cH * 0.65 / dpr) { sn.y = -2; sn.x = Math.random() * cW / dpr; }
                  if (sn.x > cW / dpr) sn.x = 0; if (sn.x < 0) sn.x = cW / dpr;
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(sn.drift) * 0.2) + ')';
                  ctx.beginPath(); ctx.arc(sn.x * dpr, sn.y * dpr, sn.size * dpr, 0, Math.PI * 2); ctx.fill();
                  // Tiny snowflake arms for larger flakes
                  if (sn.size > 2) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5 * dpr;
                    for (var arm = 0; arm < 6; arm++) {
                      var aa = arm * Math.PI / 3 + tick * 0.005;
                      ctx.beginPath(); ctx.moveTo(sn.x * dpr, sn.y * dpr);
                      ctx.lineTo((sn.x + Math.cos(aa) * sn.size * 1.5) * dpr, (sn.y + Math.sin(aa) * sn.size * 1.5) * dpr); ctx.stroke();
                    }
                  }
                }
                // Snow accumulation on ground
                ctx.fillStyle = 'rgba(255,255,255,' + (snowAlpha * 0.3) + ')';
                ctx.beginPath();
                for (var sgx = 0; sgx <= cW; sgx += 8) {
                  ctx.lineTo(sgx, cH * 0.62 + Math.sin(sgx * 0.02) * 2 * dpr);
                }
                ctx.lineTo(cW, cH * 0.64); ctx.lineTo(0, cH * 0.64); ctx.closePath(); ctx.fill();
              }

              // ── Fog wisps (when temp 5-15 and high solar) ──
              if (climTemp > 2 && climTemp < 18) {
                var fogIntensity = 1 - Math.abs(climTemp - 10) / 10;
                for (var fgi = 0; fgi < fogPs.length; fgi++) {
                  var fg = fogPs[fgi];
                  fg.x += fg.speed * climWind;
                  if (fg.x > cW / dpr + fg.size) fg.x = -fg.size;
                  ctx.fillStyle = 'rgba(203,213,225,' + (fg.alpha * fogIntensity) + ')';
                  ctx.beginPath(); ctx.ellipse(fg.x * dpr, fg.y * dpr, fg.size * dpr, fg.size * 0.3 * dpr, 0, 0, Math.PI * 2); ctx.fill();
                }
              }

              // ── Rainbow (after rain when sun is out — solar > 0.7 and temp > 10) ──
              if (climSolar > 0.7 && climTemp > 10 && climTemp < 35) {
                rainbow.alpha = Math.min(rainbow.alpha + 0.003, 0.25);
                rainbow.visible = true;
              } else {
                rainbow.alpha = Math.max(rainbow.alpha - 0.005, 0);
                if (rainbow.alpha <= 0) rainbow.visible = false;
              }
              if (rainbow.visible && rainbow.alpha > 0.01) {
                var rbColors = ['rgba(255,0,0,A)','rgba(255,127,0,A)','rgba(255,255,0,A)','rgba(0,255,0,A)','rgba(0,0,255,A)','rgba(75,0,130,A)','rgba(148,0,211,A)'];
                var rbCx = cW * 0.35, rbCy = cH * 0.55, rbR = cW * 0.3;
                for (var rbi = 0; rbi < rbColors.length; rbi++) {
                  ctx.strokeStyle = rbColors[rbi].replace(/A/g, String(rainbow.alpha * (0.6 + Math.sin(tick * 0.01 + rbi) * 0.1)));
                  ctx.lineWidth = 3 * dpr;
                  ctx.beginPath(); ctx.arc(rbCx, rbCy, rbR - rbi * 4 * dpr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
                }
              }

              // ── Climate-responsive evaporation/rain intensity ──
              // Adjust particle visibility based on climate controls
              var evapActivity = Math.max(0.2, Math.min(2, climSolar * (climTemp / 15)));
              var rainActivity = climTemp < 0 ? 0.3 : (climTemp > 25 ? 1.5 : 1.0);


              // ═══ JOURNEY MODE — Draw droplet + update state ═══
              var jState = canvasEl.dataset.journeyState || 'idle';
              if (jState !== 'idle') {
                journey.state = jState;
                var speed2 = (jState === 'aquifer_flow' || jState === 'infiltrating') ? 0.003 : 
                            (jState === 'precipitating') ? 0.012 : 0.006;
                
                if (jState !== 'ground_choice' && jState !== 'complete') {
                  journey.progress += speed2;
                  if (journey.progress >= 1) {
                    journey.progress = 0;
                    journey.particleTrail = [];
                    var next = JOURNEY_NEXT[jState];
                    if (next === 'ocean' && jState !== 'ocean') {
                      // Completed a full cycle!
                      canvasEl.dataset.journeyState = 'complete';
                      if (canvasEl._onJourneyComplete) canvasEl._onJourneyComplete(jState);
                    } else if (next === 'ground_choice') {
                      canvasEl.dataset.journeyState = 'ground_choice';
                    } else {
                      canvasEl.dataset.journeyState = next || 'idle';
                      if (canvasEl._onJourneyTransition) canvasEl._onJourneyTransition(next);
                    }
                    jState = canvasEl.dataset.journeyState;
                  }
                }

                // Draw the droplet
                if (jState !== 'idle' && jState !== 'complete' && jState !== 'ground_choice') {
                  var pos = interpPath(jState, Math.min(journey.progress, 0.999));
                  drawDroplet(pos.x, pos.y, jState, tick);
                }

                // Ground choice: draw 3 choice buttons on canvas
                if (jState === 'ground_choice') {
                  drawDroplet(0.34, 0.62, 'ocean', tick);
                  
                  // Choice highlight zones — uses shared GROUND_CHOICES array
                  var choices = GROUND_CHOICES;
                  for (var chi = 0; chi < choices.length; chi++) {
                    var ch = choices[chi];
                    var chPulse = 0.7 + Math.sin(tick * 0.05 + chi * 2) * 0.3;
                    ctx.fillStyle = ch.color;
                    ctx.strokeStyle = ch.border;
                    ctx.lineWidth = 2 * dpr;
                    ctx.globalAlpha = chPulse;
                    var chx = ch.x * cW, chy = ch.y * cH, chw = ch.w * cW, chh = ch.h * cH;
                    ctx.beginPath();
                    ctx.roundRect(chx, chy, chw, chh, 8 * dpr);
                    ctx.fill(); ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText(ch.label, chx + chw / 2, chy + chh / 2 + 2 * dpr);
                  }
                  ctx.textAlign = 'left';
                }

                // Journey HUD bar at top
                if (jState !== 'idle') {
                  ctx.save();
                  ctx.fillStyle = 'rgba(0,0,0,0.6)';
                  ctx.beginPath(); ctx.roundRect(cW * 0.1, 6 * dpr, cW * 0.8, 22 * dpr, 6 * dpr); ctx.fill();
                  ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
                  var hudLabel = JOURNEY_STATE_LABELS[jState] || jState;
                  ctx.fillText(hudLabel, cW * 0.5, 20 * dpr);
                  // Progress bar
                  if (jState !== 'ground_choice' && jState !== 'complete') {
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(cW * 0.15, 24 * dpr, cW * 0.7, 3 * dpr);
                    ctx.fillStyle = '#0ea5e9';
                    ctx.fillRect(cW * 0.15, 24 * dpr, cW * 0.7 * journey.progress, 3 * dpr);
                  }
                  ctx.textAlign = 'left';
                  ctx.restore();
                }

                // Fact tooltip
                if (jState !== 'idle' && jState !== 'complete') {
                  var fact = JOURNEY_FACTS[jState];
                  if (fact && journey.progress < 0.3) {
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, 1 - journey.progress / 0.3);
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = (5.5 * dpr) + 'px sans-serif';
                    var tw = ctx.measureText(fact).width;
                    var fx = Math.max(4 * dpr, Math.min(cW - tw - 12 * dpr, cW * 0.5 - tw / 2));
                    ctx.beginPath(); ctx.roundRect(fx - 4 * dpr, cH * 0.94 - 2 * dpr, tw + 8 * dpr, 14 * dpr, 4 * dpr); ctx.fill();
                    ctx.fillStyle = '#e0f2fe';
                    ctx.fillText(fact, fx, cH * 0.94 + 8 * dpr);
                    ctx.restore();
                  }
                }
              }

              // ── HUD ──

              ctx.fillStyle = 'rgba(0,0,0,0.5)';

              ctx.fillRect(4 * dpr, cH - 22 * dpr, 130 * dpr, 18 * dpr);

              ctx.font = (6 * dpr) + 'px sans-serif';

              ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.textAlign = 'left';

              ctx.fillText('\uD83C\uDF0D 71% of Earth is water \u2022 97% is saltwater', 8 * dpr, cH - 10 * dpr);



              canvasEl._wcAnim = requestAnimationFrame(draw);

            }

            canvasEl._wcAnim = requestAnimationFrame(draw);

            // Journey callbacks
            canvasEl._onJourneyTransition = function(nextState) {
              // Sync active stage to match journey
              var stageMap = { ocean: 'collection', evaporating: 'evaporation', condensing: 'condensation', 
                precipitating: 'precipitation', river_runoff: 'collection', infiltrating: 'infiltration',
                aquifer_flow: 'infiltration', plant_absorb: 'transpiration', transpiring: 'transpiration' };
              if (stageMap[nextState]) canvasEl.dataset.activeStage = stageMap[nextState];
            };
            canvasEl._onJourneyComplete = function(fromState) {
              // Handled by React UI
            };
            // Bridge canvas clicks to React state (called from click handler)
            canvasEl._wcSyncReact = function(nextState, pathKey) {
              // Play state-specific water cycle sound
              if (nextState && nextState.indexOf('evap') >= 0) sfxEvaporate();
              else if (nextState && nextState.indexOf('cloud') >= 0) sfxCondense();
              else if (nextState && (nextState.indexOf('rain') >= 0 || nextState.indexOf('precip') >= 0 || nextState.indexOf('snow') >= 0)) sfxRain();
              else if (nextState && (nextState.indexOf('river') >= 0 || nextState.indexOf('runoff') >= 0 || nextState.indexOf('stream') >= 0)) sfxStream();
              else if (nextState && (nextState.indexOf('collect') >= 0 || nextState.indexOf('ocean') >= 0 || nextState.indexOf('lake') >= 0)) sfxCollect();
              else if (nextState && (nextState.indexOf('freez') >= 0 || nextState.indexOf('ice') >= 0 || nextState.indexOf('glacier') >= 0)) sfxFreeze();
              else sfxWcClick();
              upd('journeyState', nextState);
              if (pathKey) {
                var paths = Object.assign({}, d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 });
                paths[pathKey] = (paths[pathKey] || 0) + 1;
                upd('journeyPaths', paths);
              }
            };

            canvasEl._wcCleanup = function () {

              if (canvasEl._wcAnim) cancelAnimationFrame(canvasEl._wcAnim);

            };

          };



          // ── Keyboard shortcuts (WCAG 2.1.1): 1-6 = stage, J = toggle Journey, R/U/P = journey ground choice ──
          function onWcKey(e) {
            var tgt = e.target || {};
            var tn = (tgt.tagName || '').toUpperCase();
            if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
            var k = e.key;
            if (k >= '1' && k <= '9') {
              var idx = parseInt(k, 10) - 1;
              if (STAGES[idx]) {
                e.preventDefault();
                var st = STAGES[idx];
                upd('activeStage', st.id);
                if (typeof announceToSR === 'function') announceToSR('Stage ' + (idx + 1) + ': ' + st.label + '.');
              }
            } else if (k === 'j' || k === 'J') {
              e.preventDefault();
              if (d.journeyActive) {
                upd('journeyActive', false); upd('journeyState', 'idle');
                var cvOff = document.getElementById('wcCanvas'); if (cvOff) cvOff.dataset.journeyState = 'idle';
                if (typeof announceToSR === 'function') announceToSR('Journey ended.');
              } else {
                upd('journeyActive', true); upd('journeyState', 'ocean');
                upd('journeyLoops', d.journeyLoops || 0);
                upd('journeyPaths', d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 });
                var cvOn = document.getElementById('wcCanvas'); if (cvOn) cvOn.dataset.journeyState = 'ocean';
                if (typeof announceToSR === 'function') announceToSR('Journey started. You are now a water droplet in the ocean.');
              }
            } else if (d.journeyActive && d.journeyState === 'ground_choice' && (k === 'r' || k === 'R' || k === 'u' || k === 'U' || k === 'p' || k === 'P')) {
              e.preventDefault();
              var choice = (k === 'r' || k === 'R') ? 'runoff' : (k === 'u' || k === 'U') ? 'infiltrate' : 'plant';
              var stateMap = { runoff: 'river_runoff', infiltrate: 'infiltrating', plant: 'plant_absorb' };
              var nextState = stateMap[choice];
              upd('journeyState', nextState);
              var newPaths = Object.assign({}, d.journeyPaths || {}, {}); newPaths[choice] = (newPaths[choice] || 0) + 1;
              upd('journeyPaths', newPaths);
              var cv2 = document.getElementById('wcCanvas');
              if (cv2) { cv2.dataset.journeyState = nextState; if (cv2._onJourneyTransition) cv2._onJourneyTransition(nextState); }
              if (typeof announceToSR === 'function') announceToSR('Path chosen: ' + choice + '.');
            }
          }

          return React.createElement("div", {
              className: "max-w-3xl mx-auto animate-in fade-in duration-200 outline-none",
              role: "region",
              "aria-label": "Water Cycle. Keyboard shortcuts: 1 through 6 select a stage, J toggles Journey mode, R U P choose your journey path.",
              tabIndex: 0,
              onKeyDown: onWcKey
            },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0A Water Cycle"),

              React.createElement("span", { className: "px-2 py-0.5 bg-sky-100 text-sky-700 text-[11px] font-bold rounded-full" }, "ANIMATED")

            ),

            // ═══ GRADE LEVEL SELECTOR ═══
            React.createElement("div", { className: "flex items-center gap-1.5 mb-3 flex-wrap" },
              React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1" }, "\uD83C\uDF93 Grade:"),
              GRADE_BANDS.map(function(gb) {
                return React.createElement("button", { "aria-label": "Change wc grade override",
                  key: gb,
                  onClick: function() {
                    upd('wcGradeOverride', gb);
                    addToast('\uD83C\uDF93 Grade set to ' + gb + ' — content complexity updated!', 'success');
                  },
                  className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (gradeBand === gb ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-200')
                }, gb);
              }),
              React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-full border border-indigo-200" },
                gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
              )
            ),

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-sky-300 shadow-lg mb-3", style: { height: "420px" } },

              React.createElement("canvas", { ref: canvasRef, id: "wcCanvas", "data-active-stage": d.activeStage || 'evaporation', "data-clim-solar": String(d.climSolar != null ? d.climSolar : 1.0), "data-clim-temp": String(d.climTemp != null ? d.climTemp : 15), "data-clim-wind": String(d.climWind != null ? d.climWind : 1.0), style: { width: "100%", height: "100%", display: "block" } }),

              // Weather badge overlay
              (d.climTemp != null && d.climTemp < 0) && React.createElement("div", { className: "absolute top-2 left-2 px-2 py-1 bg-blue-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, "\u2744\uFE0F SNOW"),
              (d.climTemp != null && d.climTemp > 30) && React.createElement("div", { className: "absolute top-2 left-2 px-2 py-1 bg-amber-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, "\u26A1 STORM"),
              (d.climSolar != null && d.climSolar < 0.3) && React.createElement("div", { className: "absolute top-2 right-2 px-2 py-1 bg-indigo-900/70 text-white text-[11px] font-bold rounded-full backdrop-blur-sm" }, "\uD83C\uDF19 NIGHT")

            ),

            // ═══ CLIMATE LAB — Interactive Controls ═══
            React.createElement("div", { className: "bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 rounded-xl border-2 border-amber-200 p-3 mb-3 shadow-md" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-lg" }, "\uD83C\uDF21"),
                React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "Climate Lab"),
                React.createElement("span", { className: "px-2 py-0.5 bg-amber-200 text-amber-800 text-[11px] font-bold rounded-full" }, "INTERACTIVE")
              ),
              React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                // Solar Intensity
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold text-amber-700 flex items-center gap-1" }, "\u2600\uFE0F Solar: " + ((d.climSolar != null ? d.climSolar : 1.0) * 100).toFixed(0) + "%"),
                  React.createElement("input", {
                    type: "range", min: "0", max: "2", step: "0.05",
                    value: d.climSolar != null ? d.climSolar : 1.0,
                    onChange: function(e) { upd('climSolar', parseFloat(e.target.value)); var cv = document.getElementById('wcCanvas'); if(cv) cv.dataset.climSolar = e.target.value; },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-indigo-300 via-amber-300 to-amber-500 cursor-pointer",
                    style: { accentColor: '#f59e0b' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] text-amber-500" },
                    React.createElement("span", null, "\uD83C\uDF19 Night"),
                    React.createElement("span", null, "\u2600\uFE0F Bright")
                  )
                ),
                // Temperature
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold text-sky-700 flex items-center gap-1" }, "\uD83C\uDF21\uFE0F Temp: " + (d.climTemp != null ? d.climTemp : 15) + "\u00B0C"),
                  React.createElement("input", {
                    type: "range", min: "-20", max: "45", step: "1",
                    value: d.climTemp != null ? d.climTemp : 15,
                    onChange: function(e) { upd('climTemp', parseFloat(e.target.value)); var cv = document.getElementById('wcCanvas'); if(cv) cv.dataset.climTemp = e.target.value; },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-blue-400 via-emerald-300 to-red-400 cursor-pointer",
                    style: { accentColor: '#0ea5e9' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] text-sky-500" },
                    React.createElement("span", null, "\u2744\uFE0F -20\u00B0"),
                    React.createElement("span", null, "\uD83D\uDD25 45\u00B0")
                  )
                ),
                // Wind Speed
                React.createElement("div", { className: "space-y-1" },
                  React.createElement("label", { className: "text-[11px] font-bold text-emerald-700 flex items-center gap-1" }, "\uD83C\uDF2C\uFE0F Wind: " + ((d.climWind != null ? d.climWind : 1.0)).toFixed(1) + "x"),
                  React.createElement("input", {
                    type: "range", min: "0", max: "3", step: "0.1",
                    value: d.climWind != null ? d.climWind : 1.0,
                    onChange: function(e) { upd('climWind', parseFloat(e.target.value)); var cv = document.getElementById('wcCanvas'); if(cv) cv.dataset.climWind = e.target.value; },
                    className: "w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-slate-200 to-emerald-400 cursor-pointer",
                    style: { accentColor: '#22c55e' }
                  }),
                  React.createElement("div", { className: "flex justify-between text-[11px] text-emerald-500" },
                    React.createElement("span", null, "Calm"),
                    React.createElement("span", null, "\uD83C\uDF2A Gale")
                  )
                )
              ),
              // Weather readout
              React.createElement("div", { className: "mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold" },
                (d.climTemp != null && d.climTemp < 0) && React.createElement("span", { className: "px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded" }, "\u2744\uFE0F Snow active"),
                (d.climTemp != null && d.climTemp > 30) && React.createElement("span", { className: "px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded" }, "\u26A1 Thunderstorm"),
                (d.climSolar != null && d.climSolar > 0.7 && d.climTemp > 10 && d.climTemp < 35) && React.createElement("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded" }, "\uD83C\uDF08 Rainbow"),
                (d.climSolar != null && d.climSolar < 0.3) && React.createElement("span", { className: "px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded" }, "\u2B50 Stars visible"),
                (d.climTemp != null && d.climTemp > 2 && d.climTemp < 18) && React.createElement("span", { className: "px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded" }, "\uD83C\uDF2B\uFE0F Fog"),
                React.createElement("span", { className: "px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded" },
                  "\uD83D\uDCA7 Evap: " + (Math.max(0.2, Math.min(2, (d.climSolar != null ? d.climSolar : 1) * ((d.climTemp != null ? d.climTemp : 15) / 15))) * 100).toFixed(0) + "%"
                )
              )
            ),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3", role: "group", "aria-label": "Water cycle stages" },

              STAGES.map(function (stage, stageIdx) {

                var isActive = (d.activeStage || 'evaporation') === stage.id;

                var shortcut = (stageIdx + 1).toString();

                return React.createElement("button", { "aria-label": "Stage " + shortcut + ": " + stage.label + (isActive ? " (selected)" : ""), "aria-pressed": isActive,

                  key: stage.id, onClick: function () { upd('activeStage', stage.id); if (typeof announceToSR === 'function') announceToSR(stage.label + ' stage selected.'); if (typeof canvasNarrate === 'function') { canvasNarrate('waterCycle', 'stage_select', { first: 'Selected ' + stage.label + ' stage. ' + (typeof selDesc === 'string' ? selDesc.substring(0, 80) : ''), repeat: stage.label + ' stage.', terse: stage.label + '.' }, { debounce: 500 }); } },

                  className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 " + (isActive ? 'text-white shadow-md' : 'border hover:opacity-80'),

                  style: { backgroundColor: isActive ? stage.color : stage.color + '15', borderColor: stage.color, color: isActive ? 'white' : stage.color }

                },

                  React.createElement("span", { className: "inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold " + (isActive ? "bg-white/25 text-white" : "bg-white/60"), "aria-hidden": "true" }, shortcut),

                  React.createElement("span", null, stage.emoji + " " + stage.label));

              })

            ),



            // ═══ JOURNEY MODE UI ═══
            React.createElement("div", { className: "bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl border-2 border-cyan-300 p-4 mb-3 shadow-md" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xl" }, "\uD83D\uDCA7"),
                  React.createElement("h4", { className: "text-sm font-bold text-cyan-800" }, "Journey Mode"),
                  React.createElement("span", { className: "px-2 py-0.5 bg-cyan-200 text-cyan-800 text-[11px] font-bold rounded-full" }, "PLAY AS WATER")
                ),
                !d.journeyActive
                  ? React.createElement("button", { "aria-label": "Start Journey mode (shortcut: J)",
                      onClick: function() {
                        upd('journeyActive', true);
                        upd('journeyState', 'ocean');
                        upd('journeyLoops', d.journeyLoops || 0);
                        upd('journeyPaths', d.journeyPaths || { runoff: 0, infiltrate: 0, plant: 0 });
                        var cv = document.getElementById('wcCanvas');
                        if (cv) { cv.dataset.journeyState = 'ocean'; }
                        if (typeof announceToSR === 'function') announceToSR('Journey started. You are now a water droplet in the ocean.');
                        addToast('\uD83D\uDCA7 You are now a water droplet in the ocean! Watch and learn as you travel through the water cycle.', 'info');
                      },
                      className: "px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-xl hover:from-cyan-600 hover:to-blue-600 shadow-lg transition-all hover:scale-105"
                    }, "\uD83C\uDFAE Start Journey (J)")
                  : React.createElement("div", { className: "flex gap-1.5" },
                      React.createElement("button", { "aria-label": "End Journey mode (shortcut: J)",
                        onClick: function() {
                          upd('journeyActive', false);
                          upd('journeyState', 'idle');
                          var cv = document.getElementById('wcCanvas');
                          if (cv) { cv.dataset.journeyState = 'idle'; }
                          if (typeof announceToSR === 'function') announceToSR('Journey ended.');
                        },
                        className: "px-3 py-1.5 bg-slate-600 text-white text-[11px] font-bold rounded-lg hover:bg-slate-500 transition-all"
                      }, "\u23F9 End Journey (J)")
                    )
              ),

              // Journey status
              d.journeyActive && React.createElement("div", { className: "space-y-2" },
                // Current state card
                React.createElement("div", { className: "bg-white rounded-lg p-3 border border-cyan-100" },
                  React.createElement("p", { className: "text-xs font-bold text-cyan-700 mb-1" },
                    (d.journeyState === 'ground_choice') ? "\uD83E\uDEA8 Choose your path! Click one of the 3 glowing zones on the canvas:" : 
                    (d.journeyState === 'complete') ? "\u2705 You completed the water cycle! +25 XP" :
                    "\uD83D\uDCA7 Current: " + (d.journeyState || 'ocean').replace(/_/g, ' ')
                  ),
                  d.journeyState === 'ground_choice' && React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2", role: "group", "aria-label": "Ground path choices" },
                    React.createElement("button", { "aria-label": "Choose River Runoff path (shortcut: R)",
                      onClick: function() {
                        upd('journeyState', 'river_runoff');
                        upd('journeyPaths', Object.assign({}, d.journeyPaths, { runoff: (d.journeyPaths.runoff || 0) + 1 }));
                        var cv = document.getElementById('wcCanvas');
                        if (cv) { cv.dataset.journeyState = 'river_runoff'; if (cv._onJourneyTransition) cv._onJourneyTransition('river_runoff'); }
                        if (typeof announceToSR === 'function') announceToSR('Path chosen: River Runoff.');
                      },
                      className: "p-2 rounded-lg text-center bg-blue-50 border-2 border-blue-300 hover:bg-blue-100 transition-all hover:scale-105"
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83C\uDF0A"),
                      React.createElement("p", { className: "text-[11px] font-bold text-blue-700" }, "River Runoff (R)"),
                      React.createElement("p", { className: "text-[11px] text-blue-500" }, "Fast path!")
                    ),
                    React.createElement("button", { "aria-label": "Choose Underground infiltration path (shortcut: U)",
                      onClick: function() {
                        upd('journeyState', 'infiltrating');
                        upd('journeyPaths', Object.assign({}, d.journeyPaths, { infiltrate: (d.journeyPaths.infiltrate || 0) + 1 }));
                        var cv = document.getElementById('wcCanvas');
                        if (cv) { cv.dataset.journeyState = 'infiltrating'; if (cv._onJourneyTransition) cv._onJourneyTransition('infiltrating'); }
                        if (typeof announceToSR === 'function') announceToSR('Path chosen: Underground infiltration.');
                      },
                      className: "p-2 rounded-lg text-center bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 transition-all hover:scale-105"
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83E\uDEB4"),
                      React.createElement("p", { className: "text-[11px] font-bold text-amber-700" }, "Underground (U)"),
                      React.createElement("p", { className: "text-[11px] text-amber-500" }, "Slow + deep")
                    ),
                    React.createElement("button", { "aria-label": "Choose Plant absorption path (shortcut: P)",
                      onClick: function() {
                        upd('journeyState', 'plant_absorb');
                        upd('journeyPaths', Object.assign({}, d.journeyPaths, { plant: (d.journeyPaths.plant || 0) + 1 }));
                        var cv = document.getElementById('wcCanvas');
                        if (cv) { cv.dataset.journeyState = 'plant_absorb'; if (cv._onJourneyTransition) cv._onJourneyTransition('plant_absorb'); }
                        if (typeof announceToSR === 'function') announceToSR('Path chosen: Plant absorption.');
                      },
                      className: "p-2 rounded-lg text-center bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 transition-all hover:scale-105"
                    },
                      React.createElement("p", { className: "text-lg" }, "\uD83C\uDF3F"),
                      React.createElement("p", { className: "text-[11px] font-bold text-emerald-700" }, "Enter Plant (P)"),
                      React.createElement("p", { className: "text-[11px] text-emerald-500" }, "Transpiration!")
                    )
                  ),
                  d.journeyState === 'complete' && React.createElement("button", { "aria-label": "Start Another Loop",
                    onClick: function() {
                      upd('journeyState', 'ocean');
                      upd('journeyLoops', (d.journeyLoops || 0) + 1);
                      var cv = document.getElementById('wcCanvas');
                      if (cv) { cv.dataset.journeyState = 'ocean'; }
                      awardStemXP('waterCycle', 25, 'Water Cycle journey loop');
                      stemCelebrate();
                      addToast('\uD83C\uDF89 Cycle complete! +25 XP. Starting new loop...', 'success');
                    },
                    className: "mt-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-bold rounded-xl hover:from-emerald-600 hover:to-cyan-600 shadow-md transition-all"
                  }, "\uD83D\uDD04 Start Another Loop")
                ),

                // Stats bar
                (d.journeyLoops > 0 || (d.journeyPaths && (d.journeyPaths.runoff || d.journeyPaths.infiltrate || d.journeyPaths.plant))) && React.createElement("div", { className: "flex gap-3 text-[11px] font-bold" },
                  React.createElement("span", { className: "text-cyan-600" }, "\uD83D\uDD04 Loops: " + (d.journeyLoops || 0)),
                  React.createElement("span", { className: "text-blue-600" }, "\uD83C\uDF0A Runoff: " + ((d.journeyPaths && d.journeyPaths.runoff) || 0)),
                  React.createElement("span", { className: "text-amber-600" }, "\uD83E\uDEB4 Underground: " + ((d.journeyPaths && d.journeyPaths.infiltrate) || 0)),
                  React.createElement("span", { className: "text-emerald-600" }, "\uD83C\uDF3F Plant: " + ((d.journeyPaths && d.journeyPaths.plant) || 0))
                )
              ),

              // Inactive description
              !d.journeyActive && React.createElement("p", { className: "text-[11px] text-cyan-600 mt-1" }, "Become a water droplet and travel through the entire water cycle! Make choices at each stage and learn the science behind each transformation.")
            ),

            sel && React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200 mb-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                React.createElement("span", { className: "text-2xl" }, sel.emoji),

                React.createElement("h4", { className: "text-base font-bold", style: { color: sel.color } }, sel.label)

              ),

              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed mb-2" }, selDesc),

              selFunFact && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                React.createElement("p", { className: "text-[11px] text-amber-700" }, "\uD83D\uDCA1 " + selFunFact)

              )

            ),

            // ═══ WATER BUDGET — Live Data Panel ═══
            React.createElement("div", { className: "bg-gradient-to-r from-slate-50 to-sky-50 rounded-xl p-3 border border-slate-200 mb-3 shadow-sm" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-base" }, "\uD83D\uDCCA"),
                React.createElement("h4", { className: "text-xs font-bold text-slate-700" }, "Water Budget (Live)"),
                React.createElement("span", { className: "px-1.5 py-0.5 bg-sky-100 text-sky-600 text-[11px] font-bold rounded-full" }, "REAL-TIME")
              ),
              (function() {
                var s2 = d.climSolar != null ? d.climSolar : 1.0;
                var t3 = d.climTemp != null ? d.climTemp : 15;
                var w2 = d.climWind != null ? d.climWind : 1.0;
                var evapRate = Math.max(0, (s2 * 0.5 + Math.max(0, t3) / 30) * (0.8 + w2 * 0.2));
                var precipType = t3 < -5 ? '\u2744\uFE0F Snow' : t3 < 2 ? '\uD83E\uDEE7 Sleet' : t3 > 30 ? '\u26A1 Storm' : '\uD83C\uDF27 Rain';
                var runoffPct = Math.min(95, Math.max(5, 30 + (t3 > 0 ? t3 * 0.8 : 0) + w2 * 8));
                var gwRecharge = Math.max(2, 100 - runoffPct - evapRate * 15);
                return React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border border-amber-100" },
                    React.createElement("p", { className: "text-lg font-bold text-amber-600" }, (evapRate * 100).toFixed(0) + "%"),
                    React.createElement("p", { className: "text-[11px] font-bold text-amber-500" }, "Evaporation")
                  ),
                  React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border border-blue-100" },
                    React.createElement("p", { className: "text-sm font-bold text-blue-600" }, precipType),
                    React.createElement("p", { className: "text-[11px] font-bold text-blue-500" }, "Precip Type")
                  ),
                  React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border border-cyan-100" },
                    React.createElement("p", { className: "text-lg font-bold text-cyan-600" }, runoffPct.toFixed(0) + "%"),
                    React.createElement("p", { className: "text-[11px] font-bold text-cyan-500" }, "Runoff")
                  ),
                  React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border border-emerald-100" },
                    React.createElement("p", { className: "text-lg font-bold text-emerald-600" }, gwRecharge.toFixed(0) + "%"),
                    React.createElement("p", { className: "text-[11px] font-bold text-emerald-500" }, "GW Recharge")
                  )
                );
              })()
            ),

            React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

              React.createElement("button", { "aria-label": "Start water cycle quiz",

                onClick: function () {
                  // Grade-tiered static quiz banks
                  var WC_QS_ELEM = [
                    { q: 'What makes puddles disappear on sunny days?', a: 'The sun heats the water', opts: ['The ground drinks it', 'The sun heats the water', 'Wind blows it away', 'It goes to sleep'] },
                    { q: 'What are clouds made of?', a: 'Tiny water drops', opts: ['Cotton', 'Tiny water drops', 'Smoke', 'Air bubbles'] },
                    { q: 'What falls from clouds?', a: 'Rain and snow', opts: ['Stars', 'Rain and snow', 'Leaves', 'Rocks'] },
                    { q: 'Where does rain go after it falls?', a: 'Rivers, lakes, and oceans', opts: ['It disappears', 'Back up to the sky', 'Rivers, lakes, and oceans', 'Into outer space'] },
                    { q: 'How do plants drink water?', a: 'Through their roots', opts: ['Through their leaves', 'Through their roots', 'Through their flowers', 'They don\'t drink water'] },
                    { q: 'What does the sun do to ocean water?', a: 'Heats it up so it rises as vapor', opts: ['Freezes it', 'Heats it up so it rises as vapor', 'Turns it green', 'Makes it salty'] },
                    { q: 'What happens when water vapor gets cold up high?', a: 'It turns into cloud drops', opts: ['It turns into cloud drops', 'It becomes a star', 'It stays invisible', 'It catches fire'] },
                    { q: 'Can water underground come back up?', a: 'Yes, through springs and wells', opts: ['No, never', 'Yes, through springs and wells', 'Only if you dig', 'Only on rainy days'] },
                  ];
                  var WC_QS_MIDDLE = [
                    { q: 'What drives evaporation?', a: 'Solar energy', opts: ['Wind', 'Solar energy', 'Gravity', 'Moon'] },
                    { q: 'What forms clouds?', a: t('stem.water_cycle.condensation'), opts: [t('stem.water_cycle.evaporation'), t('stem.water_cycle.precipitation'), t('stem.water_cycle.condensation'), t('stem.water_cycle.infiltration')] },
                    { q: 'Where does most evaporation occur?', a: 'Oceans', opts: ['Lakes', 'Rivers', 'Oceans', 'Soil'] },
                    { q: 'What is transpiration?', a: 'Water release from plants', opts: ['Rain falling', 'Water release from plants', 'Snow melting', 'Rivers flowing'] },
                    { q: 'How much of Earth\'s water is freshwater?', a: '3%', opts: ['3%', '10%', '25%', '50%'] },
                    { q: 'What are stomata?', a: 'Tiny pores on leaves', opts: ['Types of clouds', 'Tiny pores on leaves', 'Underground rivers', 'Rain droplets'] },
                    { q: 'What is sublimation?', a: 'Ice turning directly to vapor', opts: ['Ice turning directly to vapor', 'Water freezing', 'Rain evaporating', 'Clouds forming'] },
                    { q: 'How does deforestation affect the water cycle?', a: 'Reduces transpiration and increases runoff', opts: ['Increases evaporation', 'Reduces transpiration and increases runoff', 'Creates more clouds', 'Has no effect'] },
                  ];
                  var WC_QS_ADVANCED = [
                    { q: 'At what rate does air temperature decrease with altitude (environmental lapse rate)?', a: '~6.5\u00B0C per 1000m', opts: ['~2\u00B0C per 1000m', '~6.5\u00B0C per 1000m', '~10\u00B0C per 1000m', '~15\u00B0C per 1000m'] },
                    { q: 'What law governs groundwater flow through saturated porous media?', a: 'Darcy\'s Law', opts: ['Darcy\'s Law', 'Boyle\'s Law', 'Ohm\'s Law', 'Bernoulli\'s Principle'] },
                    { q: 'What is the latent heat of vaporization of water at 20\u00B0C?', a: '~2.45 MJ/kg', opts: ['~1.0 MJ/kg', '~2.45 MJ/kg', '~4.18 MJ/kg', '~0.33 MJ/kg'] },
                    { q: 'The Clausius-Clapeyron relation predicts saturation vapor pressure increases by what per \u00B0C?', a: '~7%', opts: ['~2%', '~7%', '~15%', '~25%'] },
                    { q: 'What equation extends Darcy\'s Law to unsaturated flow?', a: 'Richards\' equation', opts: ['Navier-Stokes', 'Richards\' equation', 'Bernoulli\'s equation', 'Poiseuille\'s equation'] },
                    { q: 'What is cloud albedo\'s approximate effect on solar radiation?', a: 'Reflects ~30%', opts: ['Reflects ~5%', 'Reflects ~30%', 'Reflects ~60%', 'Reflects ~90%'] },
                    { q: 'What is the average residence time of a water molecule in the ocean?', a: '~3,200 years', opts: ['~9 days', '~100 years', '~3,200 years', '~1 million years'] },
                    { q: 'What is the Bowen ratio?', a: 'Ratio of sensible to latent heat flux', opts: ['Ratio of sensible to latent heat flux', 'Ratio of runoff to infiltration', 'Ratio of evaporation to precipitation', 'Ratio of cloud cover to clear sky'] },
                  ];
                  var pool = (gradeBand === 'K-2' || gradeBand === '3-5') ? WC_QS_ELEM : (gradeBand === '9-12') ? WC_QS_ADVANCED : WC_QS_MIDDLE;
                  var q = pool[Math.floor(Math.random() * pool.length)];

                  upd('wcQuiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.wcQuiz ? 'bg-sky-100 text-sky-700' : 'bg-sky-600 text-white') + " transition-all"

              }, d.wcQuiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz (" + gradeBand + ")"),

              // ═══ AI GENERATED QUIZ BUTTON ═══
              callGemini && React.createElement("button", { "aria-label": "Generate AI quiz question",
                onClick: function() {
                  if (d.aiQuizLoading) return;
                  upd('aiQuizLoading', true);
                  var stageCtx = sel ? sel.id : 'evaporation';
                  var climCtx = 'Solar=' + ((d.climSolar != null ? d.climSolar : 1) * 100).toFixed(0) + '%, Temp=' + (d.climTemp != null ? d.climTemp : 15) + '\u00B0C, Wind=' + ((d.climWind != null ? d.climWind : 1)).toFixed(1) + 'x';
                  var gradeCtx = gradeBand === 'K-2' ? 'kindergarten to 2nd grade (ages 5-7), use very simple words and fun analogies' :
                    gradeBand === '3-5' ? '3rd to 5th grade (ages 8-10), use clear explanations with some science vocabulary' :
                    gradeBand === '6-8' ? '6th to 8th grade (ages 11-13), use proper scientific terminology and quantitative data' :
                    '9th to 12th grade (ages 14-18), use advanced terminology, equations, and real-world data';
                  var prompt = 'You are a science teacher creating a water cycle quiz question. ' +
                    'Grade level: ' + gradeCtx + '. ' +
                    'Current stage being studied: ' + stageCtx + '. ' +
                    'Current climate simulation settings: ' + climCtx + '. ' +
                    'Generate exactly ONE multiple-choice question about the water cycle relevant to this stage and conditions. ' +
                    'Respond ONLY with valid JSON in this exact format (no markdown, no explanation): ' +
                    '{"question":"...","correct":"...","distractors":["...","...","..."]}';
                  callGemini(prompt, true, false, 0.7).then(function(resp) {
                    try {
                      var clean = (typeof resp === 'string' ? resp : '').replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.question && parsed.correct && parsed.distractors && parsed.distractors.length >= 3) {
                        var allOpts = [parsed.correct].concat(parsed.distractors.slice(0, 3)).sort(function() { return Math.random() - 0.5; });
                        upd('wcQuiz', { q: parsed.question, a: parsed.correct, opts: allOpts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0, isAI: true });
                        upd('aiQuizLoading', false);
                      } else { throw new Error('bad format'); }
                    } catch(e) {
                      addToast('\u26A0\uFE0F AI quiz failed, using static question', 'error');
                      upd('aiQuizLoading', false);
                      // Fallback to static
                      var fb = [{ q: 'What percentage of Earth is covered by water?', a: '71%', opts: ['50%', '60%', '71%', '85%'] }];
                      var q2 = fb[0];
                      upd('wcQuiz', { q: q2.q, a: q2.a, opts: q2.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0 });
                    }
                  }).catch(function() {
                    addToast('\u26A0\uFE0F AI unavailable, using static question', 'error');
                    upd('aiQuizLoading', false);
                    var fb = [{ q: 'How much of Earth\'s water is freshwater?', a: '3%', opts: ['3%', '10%', '25%', '50%'] }];
                    var q2 = fb[0];
                    upd('wcQuiz', { q: q2.q, a: q2.a, opts: q2.opts, answered: false, score: (d.wcQuiz && d.wcQuiz.score) || 0 });
                  });
                },
                disabled: d.aiQuizLoading,
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiQuizLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md')
              }, d.aiQuizLoading ? '\u23F3 Generating...' : '\u2728 AI Question'),

              d.wcQuiz && d.wcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.wcQuiz.score + " correct"),
              d.wcQuiz && d.wcQuiz.isAI && React.createElement("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, "\uD83E\uDDE0 AI-GENERATED"),
              (d.wcStreak || 0) >= 3 && React.createElement("span", { className: "px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-pulse" }, "\uD83D\uDD25 " + d.wcStreak + " streak!"),
              (d.wcAttempts || 0) > 0 && React.createElement("span", { className: "px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full" }, (d.wcQuiz && d.wcQuiz.score || 0) + "/" + d.wcAttempts + " (" + Math.round(((d.wcQuiz && d.wcQuiz.score || 0) / d.wcAttempts) * 100) + "%)"),

              d.wcQuiz && React.createElement("div", { className: "mt-2 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-3 border border-sky-200 shadow-sm" },

                React.createElement("p", { className: "text-sm font-bold text-sky-800 mb-2" }, d.wcQuiz.q),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  d.wcQuiz.opts.map(function (opt) {

                    var isCorrect = opt === d.wcQuiz.a;

                    var wasChosen = d.wcQuiz.chosen === opt;

                    var cls = !d.wcQuiz.answered ? 'bg-white border-slate-200 hover:border-sky-400 hover:bg-sky-50 hover:shadow-sm' : isCorrect ? 'bg-emerald-100 border-emerald-400 shadow-sm' : wasChosen ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-40';

                    return React.createElement("button", { "aria-label": "Select answer: " + opt,

                      key: opt, disabled: d.wcQuiz.answered, onClick: function () {

                        var correct = opt === d.wcQuiz.a;
                        var newStreak = correct ? (d.wcStreak || 0) + 1 : 0;
                        var newAttempts = (d.wcAttempts || 0) + 1;

                        upd('wcQuiz', Object.assign({}, d.wcQuiz, { answered: true, chosen: opt, score: d.wcQuiz.score + (correct ? 1 : 0) }));
                        upd('wcStreak', newStreak);
                        upd('wcAttempts', newAttempts);

                        if (correct) {
                          addToast('\u2705 Correct! +5 XP', 'success');
                          if (typeof awardStemXP === 'function') awardStemXP('waterCycle', 5, 'Water Cycle quiz');
                          // Streak celebration
                          if (newStreak >= 3 && newStreak % 3 === 0) {
                            if (typeof stemCelebrate === 'function') stemCelebrate();
                            addToast('\uD83D\uDD25 ' + newStreak + '-streak! +10 bonus XP!', 'success');
                            if (typeof awardStemXP === 'function') awardStemXP('waterCycle', 10, 'Water Cycle streak bonus');
                          }
                        } else {
                          addToast('\u274C The answer is: ' + d.wcQuiz.a, 'error');
                        }

                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer " + cls

                    }, opt);

                  })

                )

              )

            ),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'wc-' + Date.now(), tool: 'waterCycle', label: sel ? sel.label : t('stem.tools_menu.water_cycle'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });
})();
