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
    icon: '🔬',
    label: 'galaxy',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'toggle_layers', label: 'Toggle 3 galaxy visualization layers', icon: '🌌', check: function(d) { return Object.keys(d.layersToggled || {}).length >= 3; }, progress: function(d) { return Object.keys(d.layersToggled || {}).length + '/3'; } },
      { id: 'view_lifecycle', label: 'Explore stellar lifecycle', icon: '⭐', check: function(d) { return d.showLifecycle || false; }, progress: function(d) { return d.showLifecycle ? 'Viewing!' : 'Toggle lifecycle'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
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
    if (d.simMode && d.simMode !== 'galaxy') {
        setTimeout(function() { ctx.setToolData(function(prev) { return Object.assign({}, prev, { galaxy: Object.assign({}, prev.galaxy || {}, {simMode: 'galaxy'})}); })}, 10);
        d.simMode = 'galaxy';
    }
}

          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { galaxy: Object.assign({}, prev.galaxy || {}, (function () { var o = {}; o[key] = val; return o; })()) }); }); };



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



          // ── Star type data (OBAFGKM Harvard classification) ──

          var STAR_TYPES = [

            { id: 'O', label: t('stem.galaxy.otype'), color: '#9bb0ff', temp: '30,000+', pct: 0.003, example: 'Naos', desc: 'Extremely hot, blue, massive. Rarest type \u2014 short lives of only a few million years.', whyItMatters: 'O-type stars produce most of a galaxy\'s ultraviolet light and ionize surrounding gas, creating the glowing emission nebulae we see. Their supernovae seed the universe with heavy elements like iron and gold.', luminosity: '30,000-1,000,000x Sun', mass: '16-150 M\u2609', lifetime: '1-10 Myr' },

            { id: 'B', label: t('stem.galaxy.btype'), color: '#aabfff', temp: '10,000-30,000', pct: 0.13, example: 'Rigel', desc: 'Blue-white giants. Often found in young OB associations and spiral arms.', whyItMatters: 'B-type stars trace the spiral arms of galaxies because they are short-lived. Astronomers use them as markers for galactic structure and recent star formation.', luminosity: '25-30,000x Sun', mass: '2.1-16 M\u2609', lifetime: '10-100 Myr' },

            { id: 'A', label: t('stem.galaxy.atype'), color: '#cad7ff', temp: '7,500-10,000', pct: 0.6, example: 'Sirius', desc: 'White stars with strong hydrogen absorption lines. Many are binary systems.', whyItMatters: 'A-type stars like Sirius were among the first to have their spectra analyzed, helping astronomers develop the stellar classification system we use today.', luminosity: '5-25x Sun', mass: '1.4-2.1 M\u2609', lifetime: '1-2 Gyr' },

            { id: 'F', label: t('stem.galaxy.ftype'), color: '#f8f7ff', temp: '6,000-7,500', pct: 3, example: 'Procyon', desc: 'Yellow-white. Transition zone where convection begins in the outer layer.', whyItMatters: 'F-type stars are interesting for exoplanet searches because they have habitable zones and lifespans long enough for complex life to potentially develop.', luminosity: '1.5-5x Sun', mass: '1.04-1.4 M\u2609', lifetime: '2-4 Gyr' },

            { id: 'G', label: t('stem.galaxy.gtype'), color: '#fff4ea', temp: '5,200-6,000', pct: 7.6, example: 'Sun', desc: 'Our Sun is a G2V star! Yellow stars with lifespans of ~10 billion years.', whyItMatters: 'G-type stars like our Sun prove that modest stars can nurture life. Their 10-billion-year lifespan gives plenty of time for biological evolution.', luminosity: '0.6-1.5x Sun', mass: '0.8-1.04 M\u2609', lifetime: '10 Gyr' },

            { id: 'K', label: t('stem.galaxy.ktype'), color: '#ffd2a1', temp: '3,700-5,200', pct: 12.1, example: 'Arcturus', desc: 'Orange stars. Many have habitable zones \u2014 prime candidates for exoplanet searches.', whyItMatters: 'K-type stars are considered the best candidates for finding habitable exoplanets\u2014they are stable, long-lived, and common enough to offer many opportunities.', luminosity: '0.08-0.6x Sun', mass: '0.45-0.8 M\u2609', lifetime: '15-30 Gyr' },

            { id: 'M', label: t('stem.galaxy.mtype'), color: '#ffcc6f', temp: '2,400-3,700', pct: 76.5, example: 'Proxima Centauri', desc: 'Red dwarfs \u2014 76% of all stars! Extremely long-lived (trillions of years).', whyItMatters: 'M-type red dwarfs will be the last stars shining in the universe. Proxima Centauri b, a potentially habitable exoplanet, orbits one of these stars\u2014our closest neighbor!', luminosity: '0.001-0.08x Sun', mass: '0.08-0.45 M\u2609', lifetime: '100+ Gyr' }

          ];



          // ── Nebulae + deep-sky objects (expanded from 4 to 8) ──

          var NEBULAE = [

            { name: t('stem.galaxy.orion_nebula'), x: 0.35, y: 0.02, z: 0.15, r: 0.08, color: '#ff6b9d', type: 'Emission', dist: '1,344 ly', desc: 'Stellar nursery 1,344 light-years away. Visible to the naked eye. Contains the Trapezium star cluster.' },

            { name: t('stem.galaxy.eagle_nebula'), x: -0.2, y: 0.01, z: -0.25, r: 0.06, color: '#7c6dff', type: 'Emission', dist: '7,000 ly', desc: 'Home of the Pillars of Creation. Star-forming region 7,000 light-years from Earth.' },

            { name: t('stem.galaxy.crab_nebula'), x: 0.4, y: 0.05, z: -0.1, r: 0.05, color: '#00d4aa', type: 'Supernova Remnant', dist: '6,500 ly', desc: 'Supernova remnant from 1054 AD. Contains a pulsar spinning 30x per second.' },

            { name: t('stem.galaxy.carina_nebula'), x: -0.3, y: -0.02, z: 0.3, r: 0.07, color: '#ff9f43', type: 'Emission', dist: '8,500 ly', desc: 'One of the largest nebulae. Contains Eta Carinae, a hypergiant 4 million times brighter than the Sun.' },

            { name: t('stem.galaxy.helix_nebula'), x: 0.25, y: -0.01, z: -0.3, r: 0.05, color: '#00bcd4', type: 'Planetary', dist: '655 ly', desc: 'The "Eye of God." A planetary nebula \u2014 the outer shell of a dying Sun-like star.' },

            { name: t('stem.galaxy.ring_nebula'), x: -0.15, y: 0.03, z: 0.2, r: 0.04, color: '#e040fb', type: 'Planetary', dist: '2,283 ly', desc: 'Classic planetary nebula in Lyra. The central white dwarf is visible at high zoom.' },

            { name: t('stem.galaxy.horsehead_nebula'), x: 0.32, y: 0.01, z: 0.05, r: 0.04, color: '#8d6e63', type: 'Dark', dist: '1,375 ly', desc: 'Dark nebula silhouetted against the emission nebula IC 434. An iconic astronomical object.' },

            { name: t('stem.galaxy.lagoon_nebula'), x: -0.1, y: -0.01, z: -0.15, r: 0.06, color: '#ef5350', type: 'Emission', dist: '4,100 ly', desc: 'One of the brightest emission nebulae. Visible with binoculars in Sagittarius.' }

          ];



          // ── Galaxy type definitions ──

          var GALAXY_TYPES = {

            barredSpiral: { label: t('stem.galaxy.barred_spiral'), icon: '\uD83C\uDF00', desc: 'Like our Milky Way. A central bar of stars with spiral arms winding outward. ~60% of spirals have bars.', example: 'Milky Way, NGC 1300', arms: 4, barLength: 0.15, windTightness: 2.5 },

            grandDesign: { label: t('stem.galaxy.grand_design_spiral'), icon: '\uD83C\uDF00', desc: 'Prominent, well-defined spiral arms. Usually triggered by gravitational interaction with a companion galaxy.', example: 'M51 (Whirlpool), M81', arms: 2, barLength: 0, windTightness: 3.5 },

            elliptical: { label: t('stem.galaxy.elliptical'), icon: '\u2B2D\uFE0F', desc: 'Smooth, featureless ellipsoidal shape. Contain old, red stars with little gas or dust. Formed from galaxy mergers.', example: 'M87, M49', arms: 0, barLength: 0, windTightness: 0 },

            irregular: { label: t('stem.galaxy.irregular'), icon: '\u2728', desc: 'No distinct shape. Rich in gas and dust with active star formation. Often satellites of larger galaxies.', example: 'LMC, SMC', arms: 0, barLength: 0, windTightness: 0 }

          };

          var gType = GALAXY_TYPES[galaxyType] || GALAXY_TYPES.barredSpiral;



          // ── Warp points ──

          var WARP_POINTS = [

            { label: t('stem.galaxy.galactic_core'), x: 0, y: 0, z: 0, zoom: 2 },

            { label: t('stem.galaxy.orion_arm_us'), x: 0.35, y: 0, z: 0.1, zoom: 4, desc: 'Our Solar System is here, about 26,000 light-years from the center.' },

            { label: t('stem.galaxy.perseus_arm'), x: 0.5, y: 0, z: -0.2, zoom: 3, desc: 'The next spiral arm outward from us. Contains many young, hot stars.' },

            { label: t('stem.galaxy.sagittarius_arm'), x: -0.15, y: 0, z: 0.35, zoom: 3, desc: t('stem.galaxy.the_next_arm_inward_toward') },

            { label: t('stem.galaxy.overview'), x: 0, y: 0.8, z: 0, zoom: 0.8, desc: t('stem.galaxy.full_view_of_the_galaxy') }

          ];



          // ── Quiz bank (expanded from 10 to 15) ──

          var QUIZ_BANK = [

            { q: 'What type of star is our Sun?', a: t('stem.galaxy.gtype'), options: [t('stem.galaxy.otype'), t('stem.galaxy.atype'), t('stem.galaxy.gtype'), t('stem.galaxy.mtype')] },

            { q: 'What is at the center of the Milky Way?', a: 'Supermassive black hole', options: ['Supermassive black hole', 'Giant star', 'Neutron star', t('stem.galaxy.nebula')] },

            { q: 'Which star type is the hottest?', a: t('stem.galaxy.otype'), options: [t('stem.galaxy.mtype'), t('stem.galaxy.gtype'), t('stem.galaxy.atype'), t('stem.galaxy.otype')] },

            { q: 'Which spiral arm contains our Solar System?', a: 'Orion Arm', options: [t('stem.galaxy.perseus_arm'), 'Orion Arm', t('stem.galaxy.sagittarius_arm'), 'Norma Arm'] },

            { q: 'What percentage of stars are M-type red dwarfs?', a: '~76%', options: ['~10%', '~30%', '~50%', '~76%'] },

            { q: 'What is a nebula?', a: 'A cloud of gas and dust', options: ['A dead star', 'A cloud of gas and dust', 'A type of galaxy', 'A black hole'] },

            { q: 'How many stars are in the Milky Way?', a: '100-400 billion', options: ['1 million', '100 million', '100-400 billion', '1 trillion'] },

            { q: 'What type of galaxy is the Milky Way?', a: 'Barred spiral', options: [t('stem.galaxy.elliptical'), t('stem.galaxy.irregular'), 'Spiral', 'Barred spiral'] },

            { q: 'Which star is closest to our Sun?', a: 'Proxima Centauri', options: ['Sirius', 'Proxima Centauri', 'Alpha Centauri A', 'Barnards Star'] },

            { q: 'What color are the hottest stars?', a: 'Blue', options: ['Red', 'Yellow', 'White', 'Blue'] },

            { q: 'What is a planetary nebula?', a: 'Outer layers shed by a dying star', options: ['A nebula with planets', 'Outer layers shed by a dying star', 'Gas around a planet', 'A type of dark matter'] },

            { q: 'How wide is the Milky Way?', a: '~100,000 light-years', options: ['~1,000 light-years', '~10,000 light-years', '~100,000 light-years', '~1 million light-years'] },

            { q: 'What causes a supernova?', a: 'A massive star exploding', options: ['Two galaxies colliding', 'A massive star exploding', 'A nebula igniting', 'A black hole evaporating'] },

            { q: 'What is dark matter?', a: 'Invisible matter detected by gravity', options: ['Black holes', 'Invisible matter detected by gravity', 'Empty space', 'Antimatter'] },

            { q: 'How long does it take light to cross the Milky Way?', a: '~100,000 years', options: ['~1,000 years', '~10,000 years', '~100,000 years', '~1 million years'] },

            { q: 'What will our Sun become at the end of its life?', a: 'White dwarf', options: ['Black hole', 'Neutron star', 'White dwarf', 'Red dwarf'] },

            { q: 'What stage comes after a Red Giant for a massive star?', a: 'Supernova', options: ['White dwarf', 'Planetary nebula', 'Supernova', 'Protostar'] },

            { q: 'How long does a star with 1 solar mass live?', a: '~10 billion years', options: ['~1 million years', '~100 million years', '~10 billion years', '~1 trillion years'] },

            { q: 'What is a protostar?', a: 'A star forming from a collapsing gas cloud', options: ['A dying star', 'A star forming from a collapsing gas cloud', 'A type of neutron star', 'A binary star system'] },

            { q: 'What determines a star\'s final fate?', a: 'Its mass', options: ['Its color', 'Its mass', 'Its age', 'Its distance from Earth'] }

          ];



          // ── Scale data ──

          var SCALE_INFO = [

            { label: t('stem.galaxy.galaxy_diameter'), value: '~100,000 light-years' },

            { label: t('stem.galaxy.disk_thickness'), value: '~2,000 light-years' },

            { label: t('stem.galaxy.central_bulge'), value: '~10,000 light-years' },

            { label: t('stem.galaxy.sun_to_center'), value: '~26,000 light-years' },

            { label: t('stem.galaxy.stars'), value: '100\u2013400 billion' },

            { label: 'Age', value: '~13.6 billion years' }

          ];



          // ── Epoch narration for time-lapse ──

          var EPOCH_NARRATION = [

            { age: 0.1, title: t('stem.galaxy.cosmic_dawn'), emoji: '\u2728', desc: 'The first stars ignite, ending the cosmic dark ages. These massive Population III stars forge the first heavy elements.' },

            { age: 0.4, title: t('stem.galaxy.first_galaxies'), emoji: '\uD83C\uDF0C', desc: 'Protogalaxies begin to coalesce from dark matter halos. The first quasars blaze to life, powered by supermassive black holes.' },

            { age: 1.0, title: t('stem.galaxy.galaxy_assembly'), emoji: '\uD83C\uDF00', desc: 'Galaxies collide and merge, building larger structures. Spiral arms begin to form as gas settles into rotating disks.' },

            { age: 4.6, title: t('stem.galaxy.milky_way_forms'), emoji: '\uD83C\uDF1F', desc: 'Our galaxy takes shape. The galactic bar forms, organizing the inner structure. Star formation peaks in the spiral arms.' },

            { age: 9.2, title: t('stem.galaxy.sun_is_born'), emoji: '\u2600\uFE0F', desc: 'A cloud of gas collapses in the Orion Arm, forming our Sun and Solar System 4.6 billion years ago. Life will eventually arise on Earth.' },

            { age: 10.0, title: t('stem.galaxy.mature_galaxy'), emoji: '\uD83D\uDD2D', desc: 'The Milky Way settles into its current form with 200-400 billion stars. Star formation slows as gas reserves deplete.' },

            { age: 13.0, title: t('stem.galaxy.present_era'), emoji: '\uD83C\uDF0D', desc: 'We are here! Humanity looks outward. The universe continues expanding, and dark energy accelerates its growth.' },

            { age: 13.8, title: t('stem.galaxy.right_now'), emoji: '\uD83D\uDE80', desc: 'The observable universe is 93 billion light-years across. We can see the cosmic microwave background\u2014the afterglow of the Big Bang.' }

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
            if (mass < 0.5) {
              stages.push({ id: 'main_sequence', name: 'Brown Dwarf', emoji: '\uD83E\uDDF4', desc: 'Too small for hydrogen fusion. Glows faintly from gravitational contraction.', color: '#a16207' });
              stages.push({ id: 'black_dwarf', name: 'Black Dwarf', emoji: '\u26AB', desc: 'A cold, dead ember wandering the cosmos forever.', color: '#18181b' });
            } else if (mass < 0.8) {
              stages.push({ id: 'main_sequence', name: 'Red Dwarf', emoji: '\uD83D\uDD34', desc: 'Burns slowly for hundreds of billions of years.', color: '#dc2626' });
              stages.push({ id: 'blue_dwarf', name: 'Blue Dwarf', emoji: '\uD83D\uDD35', desc: 'Theoretical phase where a red dwarf heats up as its opacity changes.', color: '#3b82f6' });
              stages.push({ id: 'white_dwarf', name: t('stem.galaxy.white_dwarf'), emoji: '\u26AA', desc: t('stem.galaxy.dense_stellar_core_slowly_cools'), color: '#e2e8f0' });
              stages.push({ id: 'black_dwarf', name: 'Black Dwarf', emoji: '\u26AB', desc: 'A cold, dead ember wandering the cosmos forever.', color: '#18181b' });
            } else if (mass < 8) {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: 'Hydrogen fusion ignites! Stable for billions of years.', color: '#fbbf24' });
              stages.push({ id: 'red_giant', name: t('stem.galaxy.red_giant'), emoji: '\uD83D\uDD34', desc: t('stem.galaxy.core_contracts_outer_layers_expand'), color: '#ef4444' });
              stages.push({ id: 'planetary_nebula', name: t('stem.galaxy.planetary_nebula'), emoji: '\uD83D\uDFE3', desc: t('stem.galaxy.outer_layers_shed_gently_into'), color: '#818cf8' });
              stages.push({ id: 'white_dwarf', name: t('stem.galaxy.white_dwarf'), emoji: '\u26AA', desc: t('stem.galaxy.dense_stellar_core_slowly_cools'), color: '#e2e8f0' });
              stages.push({ id: 'black_dwarf', name: 'Black Dwarf', emoji: '\u26AB', desc: 'A cold, dead ember wandering the cosmos forever.', color: '#18181b' });
            } else if (mass < 25) {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: 'Hot and enormous. Burns through fuel in millions of years.', color: '#60a5fa' });
              stages.push({ id: 'red_supergiant', name: 'Red Supergiant', emoji: '\uD83D\uDD34', desc: 'Expands to massive proportions, large enough to swallow Jupiter!', color: '#b91c1c' });
              stages.push({ id: 'supernova', name: t('stem.galaxy.supernova'), emoji: '\uD83D\uDCA5', desc: 'Core collapses! A catastrophic explosion outshining entire galaxies.', color: '#fbbf24' });
              stages.push({ id: 'neutron_star', name: t('stem.galaxy.neutron_star'), emoji: '\u2B50', desc: t('stem.galaxy.ultradense_remnant_a_teaspoon_weighs'), color: '#38bdf8' });
            } else {
              stages.push({ id: 'main_sequence', name: t('stem.galaxy.main_sequence'), emoji: '\u2B50', desc: 'An ultra-hot blue giant blazing with intense radiation.', color: '#818cf8' });
              stages.push({ id: 'blue_supergiant', name: 'Blue Supergiant', emoji: '\uD83D\uDD35', desc: 'Sheds immense mass through violent stellar winds.', color: '#3b82f6' });
              stages.push({ id: 'supernova', name: t('stem.galaxy.supernova'), emoji: '\uD83D\uDCA5', desc: 'A hypernova explosion obliterates the star.', color: '#fbbf24' });
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

              var script = document.createElement('script');

              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

              script.onload = doInit;

              document.head.appendChild(script);

            }

          };



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

            var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });

            renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0x020208);



            // ── Layer groups ──

            var bgGroup = new THREE.Group(); bgGroup.name = 'bgStars';

            var armGroup = new THREE.Group(); armGroup.name = 'arms';

            var bulgeGroup = new THREE.Group(); bulgeGroup.name = 'bulge';

            var bhGroup = new THREE.Group(); bhGroup.name = 'blackHole';

            var nebGroup = new THREE.Group(); nebGroup.name = 'nebulae';

            var gridGroup = new THREE.Group(); gridGroup.name = 'grid'; gridGroup.visible = false;

            var labelGroup = new THREE.Group(); labelGroup.name = 'labels'; labelGroup.visible = false;

            scene.add(bgGroup); scene.add(armGroup); scene.add(bulgeGroup);

            scene.add(bhGroup); scene.add(nebGroup); scene.add(gridGroup); scene.add(labelGroup);



            // Background stars

            var bgGeo = new THREE.BufferGeometry(), bgCount = 2000, bgPos = new Float32Array(bgCount * 3);

            for (var i = 0; i < bgCount; i++) { bgPos[i * 3] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 1] = (Math.random() - 0.5) * 20; bgPos[i * 3 + 2] = (Math.random() - 0.5) * 20; }

            bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));

            bgGroup.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0xccccff, size: 0.015, transparent: true, opacity: 0.3, sizeAttenuation: true })));



            // Spiral galaxy stars

            var starResult = generateStars(THREE, starCount, gType, galaxyType);

            var starShaderMat = new THREE.ShaderMaterial({

              uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },

              vertexShader: [

                'attribute float aStarType;',

                'attribute float aPhase;',

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'uniform float uTime;',

                'uniform float uPR;',

                'void main() {',

                '  vSC = color;',

                '  vType = aStarType;',

                '  float sz = 5.0 - aStarType * 0.5;',

                '  float twinkleSpeed = 0.8 + aStarType * 0.3;',

                '  vA = 0.6 + 0.4 * sin(uTime * twinkleSpeed + aPhase * 6.283);',

                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',

                '  gl_PointSize = min(sz * uPR * (80.0 / max(-mv.z, 1.0)), 14.0);',

                '  gl_Position = projectionMatrix * mv;',

                '}'

              ].join('\n'),

              fragmentShader: [

                'varying vec3 vSC;',

                'varying float vA;',

                'varying float vType;',

                'void main() {',

                '  float d = length(gl_PointCoord - 0.5) * 2.0;',

                '  if (d > 1.0) discard;',

                '  float glow = exp(-d * d * 8.0);',

                '  float core = smoothstep(1.0, 0.0, d);',

                '  float brightness = mix(1.0, 0.5, vType / 6.0);',

                '  vec3 col = vSC * (0.2 + 0.8 * glow) * brightness;',

                '  gl_FragColor = vec4(col, core * vA * 0.75);',

                '}'

              ].join('\n'),

              vertexColors: true,

              transparent: true,

              depthWrite: false,

              blending: THREE.AdditiveBlending

            });

            var starPoints = new THREE.Points(starResult.geo, starShaderMat);

            armGroup.add(starPoints);

            var starData = starResult.data;



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

            bulgeGroup.add(new THREE.Points(bulgeGeo, new THREE.PointsMaterial({ size: 0.01, vertexColors: true, transparent: true, opacity: 0.8 })));

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



            // Scale grid

            var gridHelper = new THREE.GridHelper(2, 20, 0x223366, 0x112244);

            gridHelper.position.y = -0.03;

            gridGroup.add(gridHelper);

            var ringScale = new THREE.Mesh(new THREE.RingGeometry(0.49, 0.5, 64), new THREE.MeshBasicMaterial({ color: 0x4488ff, side: THREE.DoubleSide, transparent: true, opacity: 0.2 }));

            ringScale.rotation.x = Math.PI * 0.5; ringScale.position.y = -0.02;

            gridGroup.add(ringScale);



            // Nebulae as sprites

            var nebCanvas = document.createElement('canvas'); nebCanvas.width = 64; nebCanvas.height = 64;

            var nCtx = nebCanvas.getContext('2d'), nebulaSprites = [];

            NEBULAE.forEach(function (neb) {

              nCtx.clearRect(0, 0, 64, 64);

              var grad = nCtx.createRadialGradient(32, 32, 0, 32, 32, 32);

              grad.addColorStop(0, neb.color + 'aa'); grad.addColorStop(0.5, neb.color + '44'); grad.addColorStop(1, neb.color + '00');

              nCtx.fillStyle = grad; nCtx.fillRect(0, 0, 64, 64);

              var tex = new THREE.CanvasTexture(nebCanvas); tex.needsUpdate = true;

              var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.clone(), transparent: true, opacity: 0.5 }));

              sprite.position.set(neb.x, neb.y, neb.z); sprite.scale.set(neb.r * 2, neb.r * 2, 1);

              sprite.userData = neb; nebGroup.add(sprite); nebulaSprites.push(sprite);

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

              armGroup.add(starPoints);

              starData = result.data;

            };



            // Post-processing bloom

            var composer = null;

            if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {

              composer = new THREE.EffectComposer(renderer);

              composer.addPass(new THREE.RenderPass(scene, camera));

              var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 1.2, 0.25, 0.9);

              composer.addPass(bloomPass);

              canvasEl._bloomPass = bloomPass;

            }



            // Supernova flash system for time-lapse

            var supernovae = [];

            canvasEl._triggerSupernova = function () {

              if (starData.length === 0) return;

              var idx = Math.floor(Math.random() * starData.length);

              var sd = starData[idx];

              var snCv = document.createElement('canvas'); snCv.width = 64; snCv.height = 64;

              var sc = snCv.getContext('2d');

              var sg = sc.createRadialGradient(32, 32, 0, 32, 32, 32);

              sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.2, 'rgba(200,220,255,0.8)');

              sg.addColorStop(0.5, 'rgba(100,150,255,0.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');

              sc.fillStyle = sg; sc.fillRect(0, 0, 64, 64);

              var snTex = new THREE.CanvasTexture(snCv);

              var snSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: snTex, transparent: true, blending: THREE.AdditiveBlending }));

              snSprite.position.set(sd.x, sd.y, sd.z);

              snSprite.scale.set(0.001, 0.001, 1);

              scene.add(snSprite);

              supernovae.push({ sprite: snSprite, birth: Date.now(), duration: 2000 });

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

            function onGalDown(e) { isDragging = true; prevX = e.clientX; prevY = e.clientY; }

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

            canvasEl._galaxyWarp = function (wp) {

              spherical.theta = Math.atan2(wp.x, wp.z) || 0.1;

              spherical.phi = Math.acos(Math.max(-0.99, Math.min(0.99, wp.y / (Math.hypot(wp.x, wp.y, wp.z) || 1))));

              spherical.r = wp.zoom || 1; updateCamera();

            };

            var animId, startT = Date.now();

            function animate() {

              animId = requestAnimationFrame(animate);

              var elapsed = (Date.now() - startT) * 0.001;
              if (!isDragging) { spherical.theta -= 0.0003; updateCamera(); }
              starShaderMat.uniforms.uTime.value = elapsed;

              if (armGroup.visible) armGroup.children.forEach(function (c) { c.rotation.y += 0.0003; });

              if (dustGroup.visible) dustGroup.children.forEach(function (c) { c.rotation.y += 0.0003; });

              if (gasGroup.visible) gasGroup.children.forEach(function (c) { c.rotation.y += 0.0003; });

              nebulaSprites.forEach(function (s, i) { s.material.opacity = 0.25 + 0.15 * Math.sin(elapsed * 0.5 + i * 1.8); });

              if (bhGroup.visible) {

                rings.forEach(function (r) { r.rotation.y -= 0.03; });

                bhGlow.material.opacity = 0.6 + 0.3 * Math.sin(elapsed * 0.8);

                bhGlow.scale.set(0.12 + 0.01 * Math.sin(elapsed * 1.5), 0.12 + 0.01 * Math.sin(elapsed * 1.5), 1);

              }

              // Animate supernovae

              for (var sni = supernovae.length - 1; sni >= 0; sni--) {

                var sn = supernovae[sni];

                var prog = (Date.now() - sn.birth) / sn.duration;

                if (prog > 1) { scene.remove(sn.sprite); sn.sprite.material.dispose(); supernovae.splice(sni, 1); continue; }

                var scale = 0.001 + prog * 0.08;

                sn.sprite.scale.set(scale, scale, 1);

                sn.sprite.material.opacity = prog < 0.3 ? prog / 0.3 : 1 - (prog - 0.3) / 0.7;

              }

              if (composer) composer.render();

              else renderer.render(scene, camera);

            }

            animate();

            var ro = new ResizeObserver(function () { W = canvasEl.offsetWidth; H = canvasEl.offsetHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); });

            ro.observe(canvasEl);

            canvasEl._galaxyCleanup = function () {

              if (animId) cancelAnimationFrame(animId);

              canvasEl.removeEventListener('mousedown', onGalDown);

              canvasEl.removeEventListener('mousemove', onGalMove);

              canvasEl.removeEventListener('mouseup', onGalUp);

              canvasEl.removeEventListener('wheel', onGalWheel);

              canvasEl.removeEventListener('click', onGalClick);

              ro.disconnect();

              if (composer) { composer.passes.forEach(function (p) { if (p.dispose) p.dispose(); }); }

              supernovae.forEach(function (sn) { scene.remove(sn.sprite); sn.sprite.material.dispose(); });

              renderer.dispose();

            };

          }



          var selStar = d.selectedStar ? STAR_TYPES.find(function (s) { return s.id === d.selectedStar; }) : null;

          var selNeb = d.selectedNebula ? NEBULAE.find(function (n) { return n.name === d.selectedNebula; }) : null;

          var ACTIVE_BANK = d.dynamicQuiz || QUIZ_BANK; var quizQ = d.quizMode && ACTIVE_BANK[d.quizIdx || 0] ? ACTIVE_BANK[d.quizIdx || 0] : null;



          // ── Toggle handler ──

          var toggleLayer = function (key) {

            var newLayers = Object.assign({}, layers);

            newLayers[key] = !newLayers[key];

            upd("layers", newLayers);

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

            { key: 'dust', icon: '\uD83C\uDF2B\uFE0F', label: 'Dust Lanes' },

            { key: 'gas', icon: '\uD83C\uDF0C', label: 'Gas Clouds' }

          ];



          return React.createElement("div", { className: (simMode === 'star' ? 'max-w-7xl' : 'max-w-4xl') + " mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            renderTutorial('galaxy', _tutGalaxy),

            // ── Header ──

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyCleanup) cv._galaxyCleanup(); setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0C Galaxy Explorer"),

              React.createElement("div", { className: "flex gap-1 ml-auto bg-slate-100 rounded-lg p-0.5" },

                [{ key: 'galaxy', icon: '\uD83C\uDF0C', label: 'Galaxy' }, { key: 'star', icon: '\u2B50', label: 'Star Life' }, { key: 'quiz', icon: '\uD83E\uDDE0', label: 'Quiz' }].map(function (m) {

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
                                        console.error("Gemini JSON Parse Error:", e, res.text);
                                    }
                                }
                            });
                        } else {
                            upd("isGeneratingQuiz", false);
                        }
                      }

                      else {
                        upd("quizMode", false); upd("simMode", m.key);
                        // Canvas Narration: sim mode switch
                        if (typeof canvasNarrate === 'function') {
                          var modeDesc = m.key === 'galaxy' ? 'Galaxy view. Explore the structure, stars, and nebulae of the Milky Way.' : 'Star Lifecycle. Adjust stellar mass to explore how stars are born, live, and die.';
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

                  return React.createElement("button", { "aria-label": "Change galaxy type",

                    key: key,

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



              // ── 3D Canvas ──

              React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-[#050510]", style: { height: '520px' } },

                React.createElement("canvas", {

                  "data-galaxy-canvas": "true", tabIndex: 0, role: "application", "aria-label": "Galaxy simulation — use arrow keys to orbit, +/- to zoom, R to reset view", ref: function (el) { if (!el) return; el._onSelectStar = function (sd) { upd("selectedStar", sd.type.id); upd("selectedNebula", null); awardStemXP('galaxy_explore', 2, 'Discovered ' + sd.type.label + ' star'); }; el._onSelectNebula = function (neb) { upd("selectedNebula", neb.name); upd("selectedStar", null); awardStemXP('galaxy_explore', 3, 'Discovered ' + neb.name); }; canvasRefCb(el); }, onKeyDown: function (e) {

                    var cv = e.target; if (!cv || !cv._galaxyOrbit) return;

                    var orb = cv._galaxyOrbit, upCam = cv._galaxyUpdateCam;

                    if (e.key === 'ArrowLeft') { e.preventDefault(); orb.theta -= 0.1; upCam(); }

                    else if (e.key === 'ArrowRight') { e.preventDefault(); orb.theta += 0.1; upCam(); }

                    else if (e.key === 'ArrowUp') { e.preventDefault(); orb.phi = Math.max(0.1, orb.phi - 0.1); upCam(); }

                    else if (e.key === 'ArrowDown') { e.preventDefault(); orb.phi = Math.min(Math.PI - 0.1, orb.phi + 0.1); upCam(); }

                    else if (e.key === '+' || e.key === '=') { e.preventDefault(); orb.r = Math.max(0.2, orb.r * 0.9); upCam(); }

                    else if (e.key === '-') { e.preventDefault(); orb.r = Math.min(3, orb.r * 1.1); upCam(); }

                    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); orb.theta = Math.PI * 0.1; orb.phi = Math.PI * 0.35; orb.r = 1.2; upCam(); }

                  }, style: { width: '100%', height: '100%', cursor: 'grab', outline: 'none' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #a78bfa'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

                }),

                // Star type legend

                React.createElement("div", { className: "absolute top-2 left-2 bg-black/50 backdrop-blur rounded-lg px-2 py-1.5 text-[11px] text-white/80" },

                  React.createElement("div", { className: "font-bold mb-1" }, "Star Types"),

                  STAR_TYPES.map(function (st) { return React.createElement("div", { key: st.id, className: "flex items-center gap-1 leading-tight" }, React.createElement("span", { style: { color: st.color, fontSize: '10px' } }, "\u2B50"), React.createElement("span", null, st.id + " (" + st.temp + "K)")); })

                ),

                // Scale info overlay

                layers.grid && React.createElement("div", { className: "absolute bottom-2 right-2 bg-black/60 backdrop-blur rounded-lg px-2 py-1.5 text-[11px] text-white/80" },

                  React.createElement("div", { className: "font-bold mb-1 text-blue-300" }, "\uD83D\uDCCF Scale"),

                  SCALE_INFO.map(function (s) { return React.createElement("div", { key: s.label, className: "flex justify-between gap-3" }, React.createElement("span", { className: "text-white/50" }, s.label), React.createElement("span", { className: "font-bold" }, s.value)); })

                )

              ),



              // ── Layer toggles ──

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

                LAYER_TOGGLES.map(function (lt) {

                  var isOn = layers[lt.key] !== false;

                  return React.createElement("button", { "aria-label": "Toggle layer",

                    key: lt.key,

                    onClick: function () { toggleLayer(lt.key); },

                    className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 " + (isOn ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-500')

                  }, lt.icon + " " + lt.label);

                })

              ),



              // ── Star density slider ──

              React.createElement("div", { className: "flex items-center gap-3 mt-3 px-1" },

                React.createElement("span", { className: "text-[11px] font-bold text-slate-600 whitespace-nowrap" }, "\u2B50 Stars: " + starCount.toLocaleString()),

                React.createElement("input", {

                  type: "range", min: 2500, max: 100000, step: 2500, value: starCount,

                  'aria-label': 'Number of stars',

                  onChange: function (e) {

                    var val = parseInt(e.target.value);

                    upd("starCount", val);

                    var cv = document.querySelector('[data-galaxy-canvas]');

                    if (cv && cv._setStarCount) cv._setStarCount(val);

                  },

                  className: "flex-1 h-1.5 accent-indigo-500"

                }),

                React.createElement("span", { className: "text-[10px] text-slate-600 w-12 text-right" }, starCount >= 50000 ? "Dense" : starCount >= 15000 ? "Normal" : "Sparse")

              ),



              // ── Cosmic Age Time-Lapse ──

              React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 Cosmic Time-Lapse"),

                  React.createElement("span", { className: "ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicAge.toFixed(1) + " Gyr")

                ),

                React.createElement("div", { className: "flex items-center gap-2" },

                  React.createElement("span", { className: "text-[11px] text-violet-400 whitespace-nowrap" }, "Big Bang"),

                  React.createElement("input", {

                    type: "range", min: 0.1, max: 14, step: 0.1, value: cosmicAge,

                    'aria-label': 'Cosmic age in billion years',

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

                  React.createElement("button", { "aria-label": "Toggle cosmic time-lapse playback",

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

                  }, window._galaxyTimeLapse ? "\u23F9 Stop" : "\u25B6 Play Time-Lapse"),

                  React.createElement("button", { "aria-label": "Supernova!",

                    onClick: function () {

                      var cv = document.querySelector('[data-galaxy-canvas]');

                      if (cv && cv._triggerSupernova) cv._triggerSupernova();

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all"

                  }, "\uD83D\uDCA5 Supernova!"),

                  React.createElement("button", { "aria-label": "Star Life",

                    onClick: function () { upd("quizMode", false); upd("simMode", "star"); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 border border-indigo-200 transition-all hover:bg-indigo-50"

                  }, "\u2B50 Star Life \u2192")

                ),

                // Milestone labels

                React.createElement("div", { className: "flex justify-between mt-2 text-[10px] text-violet-400" },

                  [

                    { age: 0.4, label: t('stem.galaxy.first_stars') },

                    { age: 1, label: t('stem.galaxy.galaxies_form') },

                    { age: 4.6, label: t('stem.galaxy.milky_way') },

                    { age: 9.2, label: t('stem.galaxy.sun_born') },

                    { age: 13.8, label: "Now" }

                  ].map(function (m) {

                    return React.createElement("span", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },

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

                      React.createElement("p", { className: "text-[10px] text-violet-600 leading-relaxed" }, epoch.desc)

                    )

                  );

                })()

              ),



              // ── Warp points ──

              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-3" },

                WARP_POINTS.map(function (wp) { return React.createElement("button", { "aria-label": "Warp to " + wp.label, key: wp.label, onClick: function () {
                  var cv = document.querySelector('[data-galaxy-canvas]'); if (cv && cv._galaxyWarp) cv._galaxyWarp(wp); if (wp.desc) upd("warpInfo", wp.desc);
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



              // ── Star info card ──

              selStar && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selStar.color } },

                React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selStar.color } }, "\u2B50 " + selStar.label + " Star (" + selStar.example + ")"),

                React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, selStar.desc),

                React.createElement("div", { className: "grid grid-cols-3 gap-2 text-[10px]" },

                  [

                    { label: t('stem.galaxy.temperature'), val: selStar.temp + ' K' },

                    { label: '% of Stars', val: selStar.pct + '%' },

                    { label: t('stem.galaxy.luminosity'), val: selStar.luminosity },

                    { label: t('stem.galaxy.mass'), val: selStar.mass || '?' },

                    { label: t('stem.galaxy.lifetime'), val: selStar.lifetime || '?' },

                    { label: t('stem.galaxy.example'), val: selStar.example }

                  ].map(function (item) {

                    return React.createElement("div", { key: item.label, className: "bg-slate-50 rounded-lg p-2 text-center" },

                      React.createElement("div", { className: "font-bold text-slate-600" }, item.label),

                      React.createElement("div", { className: "font-bold", style: { color: selStar.color } }, item.val)

                    );

                  })

                ),

                // Why It Matters

                selStar.whyItMatters && React.createElement("div", { className: "mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200" },

                  React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 Why It Matters"),

                  React.createElement("p", { className: "text-[10px] text-amber-800 leading-relaxed" }, selStar.whyItMatters)

                ),

                // Scale comparison

                React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-center" },

                  React.createElement("p", { className: "text-[11px] text-indigo-600" }, "\uD83D\uDD2D If our Sun were a basketball, a" + (selStar.id === 'O' ? 'n' : '') + " " + selStar.id + "-type star would be " + ({ 'O': 'a hot tub (6\u201315x wider)', 'B': 'a beach ball (2\u20137x wider)', 'A': 'a soccer ball (1.4\u20132x wider)', 'F': 'a volleyball (slightly bigger)', 'G': 'another basketball (same size!)', 'K': 'a softball (a bit smaller)', 'M': 'a tennis ball or smaller' }[selStar.id] || 'similar in size') + ".")

                )

              ),



              // ── Nebula info card ──

              selNeb && !selStar && React.createElement("div", { className: "mt-3 bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: selNeb.color } },

                React.createElement("h4", { className: "font-bold text-sm mb-1", style: { color: selNeb.color } }, "\u2728 " + selNeb.name),

                React.createElement("div", { className: "flex gap-3 mb-2 text-[10px]" },

                  React.createElement("span", { className: "px-2 py-0.5 rounded-full font-bold", style: { background: selNeb.color + '20', color: selNeb.color } }, selNeb.type || t('stem.galaxy.nebula')),

                  selNeb.dist && React.createElement("span", { className: "text-slate-500" }, "\uD83D\uDCCD " + selNeb.dist)

                ),

                React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selNeb.desc)

              ),



              // ── Snapshot button ──

              React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

                React.createElement("button", { "aria-label": "Snapshot", onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'gx-' + Date.now(), tool: 'galaxy', label: t('stem.galaxy.galaxy') + (d.selectedStar ? ': ' + d.selectedStar : '') + ' (' + gType.label + ')', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

              )

            ), // end Galaxy Simulation mode wrapper

// ── Quiz mode ──

              d.quizMode && d.isGeneratingQuiz && React.createElement("div", { className: "flex flex-col items-center justify-center p-12 mt-6 max-w-2xl mx-auto rounded-2xl bg-indigo-50 border-2 border-indigo-300 animate-pulse"}, React.createElement("h2", {className: "text-lg font-bold text-indigo-600 mb-2"}, "✨ Gemini is Generating Astrophysic Questions..."), React.createElement("p", {className: "text-sm text-indigo-400"}, "Parsing deep space databases...")),
              d.quizMode && !d.isGeneratingQuiz && quizQ && React.createElement("div", { className: "mt-6 max-w-2xl mx-auto bg-white shadow-xl rounded-2xl border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4" },

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

                        upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +10 XP" : "\u274C The answer is: " + quizQ.a });

                        if (correct) { upd("quizScore", (d.quizScore || 0) + 1); upd("quizStreak", (d.quizStreak || 0) + 1); }

                        else { upd("quizStreak", 0); }

                      }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " + (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : d.quizFeedback && !d.quizFeedback.correct && opt !== quizQ.a ? "border-slate-200 bg-white text-slate-500 opacity-50" : "border-slate-200 bg-white text-slate-600") : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400")

                    }, opt);

                  })

                ),

                d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },

                  d.quizFeedback.msg,

                  React.createElement("button", { "aria-label": "Next", onClick: function () { upd("quizIdx", ((d.quizIdx || 0) + 1) % ACTIVE_BANK.length); upd("quizFeedback", null); }, className: "ml-3 px-2 py-0.5 bg-indigo-600 text-white rounded text-xs" }, "Next \u2192")

                )

              ),




            // ══════════════════════════════════════════════

            // ── Star Lifespan Simulation Mode ──

            // ══════════════════════════════════════════════

            !d.quizMode && simMode === 'star' && React.createElement("div", { className: "animate-in fade-in duration-300", style: { display: "flex", gap: "16px", alignItems: "stretch" } },



              // ── RIGHT COLUMN: Star Visualization (sticky) ──

              React.createElement("div", { style: { flex: "1 1 65%", position: "sticky", top: "16px", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: "16px", order: 2, minHeight: "520px" } },



              // ── Animated Star Canvas ──

              React.createElement("div", { className: "w-full flex-1 relative rounded-2xl overflow-hidden border-2 border-indigo-300/30 bg-[#020210] shadow-2xl shadow-indigo-500/10", style: { flex: '1 1 auto', minHeight: '520px', position: 'relative' } },

                React.createElement("canvas", {

                  "data-star-life-canvas": "true",

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
                      if (mass < 0.5) { coreColor = '#ffaa44'; glowColor = '#ff7722'; coronaColor = '#ff550033'; }
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
                        stageLabel = '⚫ Black Dwarf';
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
                      var cls = mass < 0.45 ? 'M-type Red Dwarf' : mass < 0.8 ? 'K-type Orange' : mass < 1.04 ? 'G-type (Sun-like)' : mass < 1.4 ? 'F-type Yellow-White' : mass < 2.1 ? 'A-type White' : mass < 16 ? 'B-type Blue-White' : 'O-type Blue Giant';
                      ctx.font = '10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.45)';
                      ctx.fillText(cls, cx, 36);

                      // ── Physical properties panel (bottom center) ──
                      var surfTemp = mass < 0.45 ? 3200 : mass < 0.8 ? 4500 : mass < 1.04 ? 5778 : mass < 1.4 ? 6500 : mass < 2.1 ? 8500 : mass < 16 ? 20000 : 40000;
                      var luminosity = Math.pow(mass, 3.5);
                      var radius = mass < 0.8 ? Math.pow(mass, 0.8) : mass < 2 ? Math.pow(mass, 0.57) : Math.pow(mass, 0.78);
                      var lifetime = mass < 0.2 ? '>100' : (10 / Math.pow(mass, 2.5)).toFixed(mass < 1 ? 0 : 1);
                      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                      ctx.fillStyle = 'rgba(255,255,255,0.55)';
                      ctx.fillText(mass + ' Solar Masses', cx, H - 40);
                      ctx.font = '9px monospace';
                      ctx.fillStyle = 'rgba(255,255,255,0.35)';
                      ctx.fillText('T: ' + surfTemp.toLocaleString() + ' K  |  L: ' + (luminosity < 100 ? luminosity.toFixed(1) : Math.round(luminosity).toLocaleString()) + ' L\u2609  |  R: ' + radius.toFixed(2) + ' R\u2609', cx, H - 26);
                      ctx.fillText('Lifespan: ' + lifetime + ' billion years', cx, H - 14);

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
                      if (stage === 'main_sequence' || stage === 'red_giant' || stage === 'blue_giant') {
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

                  },

                  style: { width: '100%', height: '100%' }

                }),

                // ── Snapshot button (overlay, bottom-right of canvas) ──
                React.createElement("button", { "aria-label": "Snapshot", onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sl-' + Date.now(), tool: 'galaxy', label: 'Star Life: ' + lifecycleMass + ' M\u2609', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Star life snapshot saved!', 'success'); }, className: "px-3 py-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all", style: { position: 'absolute', bottom: '12px', right: '12px', zIndex: 10 } }, "\uD83D\uDCF8 Snapshot")

              )

              ), // end right column



              // ── LEFT COLUMN: Controls & Timeline ──

              React.createElement("div", { style: { flex: "0 0 38%", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", order: 1 } },



              // ── Mass Selector Hero ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border-2 border-indigo-400/40 p-5 shadow-xl" },

                React.createElement("div", { className: "flex items-center gap-3 mb-4" },

                  React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg" }, "\u2B50"),

                  React.createElement("div", null,

                    React.createElement("h4", { className: "text-sm font-bold text-white" }, "Star Mass & Classification"),

                    React.createElement("p", { className: "text-[10px] text-slate-600" }, "Adjust mass to explore how different stars live and die")

                  ),

                  React.createElement("div", { className: "ml-auto px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40" },

                    React.createElement("span", { className: "text-sm font-black text-amber-300" }, lifecycleMass + " M\u2609")

                  )

                ),

                React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                  React.createElement("span", { className: "text-[10px] text-amber-300/70 whitespace-nowrap w-8" }, "0.5"),

                  React.createElement("input", {

                    type: "range", min: 0.5, max: 50, step: 0.5, value: lifecycleMass, "aria-label": "Star mass in solar masses",

                    onChange: function (e) {
                      var massVal = parseFloat(e.target.value);
                      upd("lifecycleMass", massVal);
                      // Canvas Narration: star mass change
                      if (typeof canvasNarrate === 'function') {
                        var cat = massVal < 0.5 ? 'Brown Dwarf' : massVal < 0.8 ? 'Red Dwarf' : massVal < 2 ? 'Sun-like star' : massVal < 8 ? 'Hot star' : massVal < 25 ? 'Massive star' : 'Hypermassive star';
                        canvasNarrate('galaxy', 'starMass', cat + ' at ' + massVal + ' solar masses', { debounce: 800 });
                      }
                    },

                    className: "flex-1 h-2 accent-amber-400 cursor-pointer"

                  }),

                  React.createElement("span", { className: "text-[10px] text-amber-300/70 whitespace-nowrap w-8 text-right" }, "50")

                ),

                // Mass category badge

                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },

                  React.createElement("span", {

                    className: "px-3 py-1 rounded-full text-[10px] font-bold " +

                      (lifecycleMass < 0.5 ? "bg-stone-800 text-stone-300 border border-stone-600" :

                        lifecycleMass < 0.8 ? "bg-red-900/60 text-red-300 border border-red-700/50" :

                          lifecycleMass < 2 ? "bg-amber-900/60 text-amber-300 border border-amber-600/50" :

                            lifecycleMass < 8 ? "bg-blue-900/60 text-blue-300 border border-blue-600/50" :

                              lifecycleMass < 25 ? "bg-violet-900/60 text-violet-300 border border-violet-600/50" :

                                "bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-600/50")

                  },

                    lifecycleMass < 0.5 ? "\uD83E\uDEA8 Brown Dwarf" :

                      lifecycleMass < 0.8 ? "\uD83D\uDD34 Red Dwarf (M-type)" :

                        lifecycleMass < 2 ? "\u2600\uFE0F Sun-like (G/K-type)" :

                          lifecycleMass < 8 ? "\uD83D\uDD35 Hot Star (A/B-type)" :

                            lifecycleMass < 25 ? "\uD83D\uDCA5 Massive Star" :

                              "\uD83D\uDD73\uFE0F Hypermassive Star"

                  ),

                  React.createElement("span", { className: "text-[11px] text-slate-600 italic" },

                    lifecycleMass < 0.5 ? "Too small for hydrogen fusion" :

                      lifecycleMass < 0.8 ? "Lives 50\u2013100+ billion years" :

                        lifecycleMass < 2 ? "Lives ~10 billion years" :

                          lifecycleMass < 8 ? "Lives 1\u20134 billion years" :

                            lifecycleMass < 25 ? "Lives 8\u201330 million years" :

                              "Lives < 5 million years"

                  )

                )

              ),



              // ── Lifecycle Flowchart ──

              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-400/30 p-5 shadow-lg" },

                React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                  React.createElement("h4", { className: "text-sm font-bold text-white" }, "\u2728 Stellar Lifecycle Journey"),

                  React.createElement("span", { className: "ml-auto text-[11px] text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-700/50" },

                    lifecycleMass < 8 ? "\u2193 Gentle path" : "\u2193 Violent path")

                ),

                // Dynamic stages
                React.createElement("div", { className: "space-y-1" },
                  getStagesForMass(lifecycleMass).map(function (s, idx, arr) {
                    var isActive = activeStage === s.id;
                    
                    // Identify if we need a branch indicator BEFORE this item
                    var showBranch = false;
                    var branchLabel = "", branchEmoji = "";
                    if (s.id === 'planetary_nebula') { showBranch = true; branchLabel = 'Gentle death \u2014 outer layers drift away'; branchEmoji = '\u2B07\uFE0F'; }
                    else if (s.id === 'supernova') { showBranch = true; branchLabel = 'Violent death \u2014 core collapse!'; branchEmoji = '\uD83D\uDCA5'; }
                    else if (s.id === 'black_dwarf' && lifecycleMass < 0.5) { showBranch = true; branchLabel = 'Cooling phase \u2014 fades to black'; branchEmoji = '\u2B07\uFE0F'; }

                    var isDeathBranch = false;
                    if (s.id === 'planetary_nebula' || s.id === 'white_dwarf' || s.id === 'black_dwarf' || s.id === 'supernova' || s.id === 'neutron_star' || s.id === 'black_hole' || (s.id === 'blue_dwarf' && lifecycleMass < 0.8)) {
                       isDeathBranch = true;
                    }

                    return React.createElement("div", { key: s.id },
                      showBranch ? React.createElement("div", { className: "flex justify-center py-2" },
                        React.createElement("div", { className: "flex items-center gap-2 px-4 py-1 rounded-full border", style: { borderColor: lifecycleMass < 8 ? '#818cf855' : '#f59e0b55', background: lifecycleMass < 8 ? '#818cf815' : '#f59e0b15' } },
                          React.createElement("span", { className: "text-sm" }, branchEmoji),
                          React.createElement("span", { className: "text-[10px] font-bold", style: { color: lifecycleMass < 8 ? '#a5b4fc' : '#fbbf24' } }, branchLabel)
                        )
                      ) : null,

                      React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  onClick: function() {
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
                          React.createElement("p", { className: "text-[11px] text-slate-600 leading-tight" }, s.desc)
                        ),
                        React.createElement("span", { className: "text-[10px] text-slate-600 flex-shrink-0" },
                          s.id === 'nebula' ? "" :
                          s.id === 'protostar' ? "~100K yr" :
                          s.id === 'main_sequence' ? (lifecycleMass < 0.8 ? "~Trillions of yr" : lifecycleMass < 2 ? "~10 Gyr" : lifecycleMass < 8 ? "~1 Gyr" : lifecycleMass < 25 ? "~10 Myr" : "~3 Myr") :
                          s.id === 'red_giant' ? (lifecycleMass < 2 ? "~1 Gyr" : "~100 Myr") :
                          s.id === 'red_supergiant' || s.id === 'blue_supergiant' ? "~1 Myr" :
                          s.id === 'planetary_nebula' ? "~10,000 yr" :
                          s.id === 'supernova' ? "~Months" :
                          "Forever"
                        )
                      ),
                      
                      (idx < arr.length - 1 && !(arr[idx+1].id === 'planetary_nebula' || arr[idx+1].id === 'supernova' || (lifecycleMass < 0.5 && arr[idx+1].id === 'black_dwarf'))) ? 
                        React.createElement("div", { className: "flex justify-center py-0.5" },
                          React.createElement("div", { className: "w-0.5 h-3 rounded-full" + (isDeathBranch ? " ml-6" : ""), style: { background: 'linear-gradient(to bottom, ' + s.color + '60, ' + arr[idx + 1].color + '60)' } })
                        ) 
                      : null
                    );
                  })
                )

              ),



              // ── OBAFGKM Star Classification Reference ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm" },

                React.createElement("h4", { className: "text-sm font-bold text-slate-800 mb-3 flex items-center gap-2" },

                  React.createElement("span", null, "\uD83C\uDF08"),

                  "Harvard Spectral Classification (OBAFGKM)"

                ),

                React.createElement("div", { className: "grid grid-cols-7 gap-1" },

                  STAR_TYPES.map(function (st) {

                    var isMatch = (lifecycleMass < 0.45 && st.id === 'M') ||

                      (lifecycleMass >= 0.45 && lifecycleMass < 0.8 && st.id === 'K') ||

                      (lifecycleMass >= 0.8 && lifecycleMass < 1.04 && st.id === 'G') ||

                      (lifecycleMass >= 1.04 && lifecycleMass < 1.4 && st.id === 'F') ||

                      (lifecycleMass >= 1.4 && lifecycleMass < 2.1 && st.id === 'A') ||

                      (lifecycleMass >= 2.1 && lifecycleMass < 16 && st.id === 'B') ||

                      (lifecycleMass >= 16 && st.id === 'O');

                    return React.createElement("div", { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },

                      key: st.id,

                      className: "text-center p-2 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 " +

                        (isMatch ? "border-indigo-400 shadow-md shadow-indigo-100 scale-105" : "border-transparent hover:border-slate-200"),

                      style: isMatch ? { background: st.color + '20' } : {},

                      onClick: function () { var massMap = { O: 30, B: 8, A: 1.8, F: 1.2, G: 1, K: 0.7, M: 0.3 }; upd("lifecycleMass", massMap[st.id] || 1); }

                    },

                      React.createElement("div", { className: "text-2xl mb-1", style: { color: st.color } }, "\u2B50"),

                      React.createElement("p", { className: "text-xs font-black", style: { color: st.color } }, st.id),

                      React.createElement("p", { className: "text-[10px] text-slate-600 leading-tight" }, st.temp + "K"),

                      isMatch ? React.createElement("div", { className: "mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 mx-auto animate-pulse" }) : null

                    );

                  })

                ),

                // Selected type info

                (function () {

                  var matchType = lifecycleMass < 0.45 ? 'M' : lifecycleMass < 0.8 ? 'K' : lifecycleMass < 1.04 ? 'G' : lifecycleMass < 1.4 ? 'F' : lifecycleMass < 2.1 ? 'A' : lifecycleMass < 16 ? 'B' : 'O';

                  var st = STAR_TYPES.find(function (s) { return s.id === matchType; });

                  if (!st) return null;

                  return React.createElement("div", { className: "mt-3 p-3 rounded-xl border", style: { borderColor: st.color + '40', background: st.color + '08' } },

                    React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },

                      React.createElement("span", { className: "text-lg", style: { color: st.color } }, "\u2B50"),

                      React.createElement("span", { className: "text-xs font-bold", style: { color: st.color } }, st.label + " (" + st.example + ")")

                    ),

                    React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed mb-2" }, st.desc),

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

                  lifecycleMass < 0.5 ? "Brown dwarfs are sometimes called 'failed stars.' They glow faintly from gravitational contraction, but never achieve hydrogen fusion. Jupiter is almost big enough to be one!" :

                    lifecycleMass < 2 ? "Stars like our Sun live ~10 billion years. Our Sun is about halfway through its life! When it dies, it will expand to engulf Mercury, Venus, and possibly Earth before shedding its outer layers into a beautiful planetary nebula." :

                      lifecycleMass < 8 ? "Larger low-mass stars burn hotter and die sooner. A 2 M\u2609 star lives only ~1.5 billion years. The relationship between mass and lifetime follows an inverse cube law: double the mass, live 8x shorter!" :

                        lifecycleMass < 25 ? "Neutron stars are so dense that a sugar-cube-sized piece weighs about 1 billion tons! They can spin up to 716 times per second and have magnetic fields trillions of times stronger than Earth's." :

                          "Stellar black holes form from stars >25 M\u2609. The Milky Way alone has ~100 million of them! The most massive known stellar black hole, in the binary system LB-1, weighs about 70 solar masses."

                )

              ),



              // ── Size Comparison ──

              React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 p-4 shadow-sm" },

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

                React.createElement("p", { className: "text-center text-[10px] text-slate-600 italic mt-2" },

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

          );
      })();
    }
  });

})();
