// ═══════════════════════════════════════════
// stem_tool_solarsystem.js — Solar System Explorer (standalone CDN module)
// Extracted from stem_tool_science.js and enhanced
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

// Dedup: skip if already registered (hub may have loaded inline copy)
if (!window.StemLab.isRegistered('solarSystem')) {

(function() {
  'use strict';

  window.StemLab.registerTool('solarSystem', {
    icon: 'ðŸ”¬',
    label: 'solarSystem',
    desc: '',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
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
      var props = ctx.props;

      // â”€â”€ Tool body (solarSystem) â”€â”€
      return (function() {
const d = labToolData.solarSystem;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, solarSystem: { ...prev.solarSystem, [key]: val } }));
          const updMulti = (obj) => setLabToolData(prev => ({ ...prev, solarSystem: { ...prev.solarSystem, ...obj } }));

          // --- Research Points & Challenges ---
          var researchPoints = d.researchPoints || 0;
          var totalRP = d.totalRP || 0;
          var completedChallenges = d.completedChallenges || [];
          var planetsVisited = d.planetsVisited || [];

          var CHALLENGES = [
            { id: 'first_planet', name: 'First Contact', desc: 'Select any planet', icon: '\uD83C\uDF1F', rp: 10, check: function() { return !!sel; } },
            { id: 'visit_3', name: 'Inner Planets', desc: 'Visit 3 different planets', icon: '\uD83D\uDE80', rp: 25, check: function() { return planetsVisited.length >= 3; } },
            { id: 'visit_all', name: 'Grand Tour', desc: 'Visit all 9 planets', icon: '\uD83C\uDFC6', rp: 100, check: function() { return planetsVisited.length >= 9; } },
            { id: 'gas_explorer', name: 'Gas Giant Explorer', desc: 'View the interior of a gas giant', icon: '\u2601', rp: 20, check: function() { return d.viewTab === 'interior' && sel && (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant'); } },
            { id: 'rover_deploy', name: 'Surface Ops', desc: 'Deploy a rover or probe', icon: '\uD83E\uDD16', rp: 20, check: function() { return d.viewTab === 'drone'; } },
            { id: 'quiz_ace', name: 'Quiz Master', desc: 'Score 5+ on planet quiz', icon: '\uD83C\uDF93', rp: 50, check: function() { return d.quiz && d.quiz.score >= 5; } },
            { id: 'compare', name: 'Comparatist', desc: 'Compare two planets', icon: '\uD83D\uDD0D', rp: 15, check: function() { return d.compare1 && d.compare2; } },
            { id: 'gravity_calc', name: 'Weight Watcher', desc: 'Use the gravity calculator', icon: '\u2696', rp: 15, check: function() { return d.gravCalcUsed; } },
            { id: 'light_calc', name: 'Speed of Light', desc: 'Calculate travel time at light speed', icon: '\u26A1', rp: 15, check: function() { return d.lightCalcUsed; } },
            { id: 'ai_question', name: 'Curious Mind', desc: 'Ask the AI Space Tutor a question', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', rp: 20, check: function() { return !!d.aiAnswer; } },
            { id: 'moon_explorer', name: 'Moon Gazer', desc: 'Explore notable moons of a planet', icon: '\uD83C\uDF19', rp: 15, check: function() { return d.showMoons; } },
            { id: 'night_sky', name: 'Stargazer', desc: 'View the night sky from a planet', icon: '\uD83C\uDF03', rp: 15, check: function() { return d.showSky; } },
            { id: 'atmosphere_descent', name: 'Deep Diver', desc: 'Use the atmosphere descent simulator', icon: '\uD83E\uDE82', rp: 20, check: function() { return d.showDescent && d.descentAlt !== undefined && d.descentAlt < 50; } },
            { id: 'planet_builder', name: 'World Builder', desc: 'Build a habitable planet', icon: '\uD83C\uDFD7', rp: 30, check: function() { var m = d.buildMass||1, dd = d.buildDist||1; return d.showBuilder && dd >= 0.8 && dd <= 1.5 && d.buildAtmo && d.buildWater && m >= 0.5 && m <= 5; } },
            { id: 'orbital_learn', name: 'Kepler Student', desc: 'Study orbital mechanics', icon: '\uD83C\uDF0C', rp: 15, check: function() { return d.showOrbital; } },
            { id: 'hohmann_plan', name: 'Mission Planner', desc: 'Plan a Hohmann transfer to any planet', icon: '\uD83D\uDEF0', rp: 20, check: function() { return d.showHohmann; } },
            { id: 'exo_explorer', name: 'Exoplanet Hunter', desc: 'Explore exoplanet comparisons', icon: '\uD83C\uDF20', rp: 15, check: function() { return d.showExo; } },
            { id: 'what_if_thinker', name: 'Thought Experimenter', desc: 'Read What If scenarios', icon: '\uD83E\uDD14', rp: 10, check: function() { return d.showWhatIf; } }
          ];

          function checkChallenges() {
            var newCompleted = completedChallenges.slice();
            var rpGain = 0;
            CHALLENGES.forEach(function(ch) {
              if (newCompleted.indexOf(ch.id) === -1 && ch.check()) {
                newCompleted.push(ch.id);
                rpGain += ch.rp;
                if (typeof addToast === 'function') addToast('\uD83C\uDFC5 Challenge: ' + ch.name + ' (+' + ch.rp + ' RP)', 'success');
                playCelebrate();
              }
            });
            if (rpGain > 0) {
              updMulti({ completedChallenges: newCompleted, researchPoints: researchPoints + rpGain, totalRP: totalRP + rpGain });
            }
          }

          // Track planet visits + check challenges — deferred to after PLANETS/sel are defined
          // (moved inline below const sel declaration to avoid temporal dead zone)

          // Keyboard shortcuts (managed without useEffect)
          if (window._solarKeyHandler) {
            window.removeEventListener('keydown', window._solarKeyHandler);
          }
          window._solarKeyHandler = function(e) {
            if (e.altKey) {
              if (e.key === '1') { e.preventDefault(); upd('viewTab', 'overview'); }
              if (e.key === '2') { e.preventDefault(); upd('viewTab', 'surface'); }
              if (e.key === '3') { e.preventDefault(); upd('viewTab', 'interior'); }
              if (e.key === '4') { e.preventDefault(); upd('viewTab', 'drone'); }
            }
          };
          window.addEventListener('keydown', window._solarKeyHandler);

          // --- Sound effects ---
          function playBeep() {
            try {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              var osc = ac.createOscillator();
              var gain = ac.createGain();
              osc.connect(gain); gain.connect(ac.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.08;
              osc.start(); osc.stop(ac.currentTime + 0.08);
            } catch(e) {}
          }
          function playCelebrate() {
            try {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              [523, 659, 784, 1047].forEach(function(freq, i) {
                var osc = ac.createOscillator();
                var gain = ac.createGain();
                osc.connect(gain); gain.connect(ac.destination);
                osc.frequency.value = freq;
                gain.gain.value = 0.06;
                osc.start(ac.currentTime + i * 0.12);
                osc.stop(ac.currentTime + i * 0.12 + 0.1);
              });
            } catch(e) {}
          }

          // --- AI Space Tutor ---
          function askSpaceTutor(question) {
            if (!question || !question.trim()) return;
            updMulti({ aiQuestion: question, aiAnswer: '', aiLoading: true });
            var grade = gradeLevel || 'middle school';
            var planetCtx = sel ? ' about ' + sel.name : '';
            var prompt = 'You are a friendly space science tutor for a ' + grade + ' student. Answer this question' + planetCtx + ' in 2-3 clear sentences: ' + question;
            var apiKey = (typeof props !== 'undefined' && props && props.geminiKey) || '';
            if (!apiKey) {
              updMulti({ aiAnswer: 'API key not configured. Ask your teacher to set up the AI tutor!', aiLoading: false });
              return;
            }
            fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }).then(function(r) { return r.json(); }).then(function(data) {
              var answer = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || 'I could not generate a response. Try again!';
              updMulti({ aiAnswer: answer, aiLoading: false });
            }).catch(function() {
              updMulti({ aiAnswer: 'Connection error. Please try again.', aiLoading: false });
            });
          }

          // --- TTS (Kokoro-first, browser fallback) ---
          function speakText(text) {
            if (!text) return;
            if (callTTS) { try { callTTS(text); return; } catch(e) {} }
            if (window._kokoroTTS && window._kokoroTTS.speak) {
              window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
              return;
            }
            if (window.speechSynthesis) { window.speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text); u.rate=0.9; window.speechSynthesis.speak(u); }
          }

          // --- Gravity calculator data ---
          var GRAVITY_MAP = { Mercury: 0.38, Venus: 0.91, Earth: 1.0, Mars: 0.38, Jupiter: 2.34, Saturn: 1.06, Uranus: 0.92, Neptune: 1.19, Pluto: 0.06 };
          // Distance from Sun in AU
          var DIST_AU = { Mercury: 0.39, Venus: 0.72, Earth: 1.0, Mars: 1.52, Jupiter: 5.20, Saturn: 9.58, Uranus: 19.22, Neptune: 30.05, Pluto: 39.48 };

          // Famous space missions per planet
          var MISSIONS = {
            Mercury: [
              { name: 'Mariner 10', year: '1974', desc: 'First spacecraft to visit Mercury; mapped 45% of surface' },
              { name: 'MESSENGER', year: '2011-2015', desc: 'First to orbit Mercury; found water ice at poles' },
              { name: 'BepiColombo', year: '2025+', desc: 'ESA/JAXA mission currently en route' }
            ],
            Venus: [
              { name: 'Venera 7', year: '1970', desc: 'First successful landing on another planet' },
              { name: 'Magellan', year: '1990-94', desc: 'Mapped 98% of surface with radar' },
              { name: 'Akatsuki', year: '2015+', desc: 'Japanese orbiter studying atmosphere' }
            ],
            Earth: [
              { name: 'ISS', year: '1998+', desc: 'Continuously inhabited since 2000' },
              { name: 'Apollo 17', year: '1972', desc: 'Last crewed Moon mission (so far)' },
              { name: 'Landsat', year: '1972+', desc: 'Longest continuous Earth observation program' }
            ],
            Mars: [
              { name: 'Curiosity', year: '2012+', desc: 'Car-sized rover exploring Gale Crater' },
              { name: 'Perseverance', year: '2021+', desc: 'Collecting samples; Ingenuity helicopter' },
              { name: 'Mars Reconnaissance Orbiter', year: '2006+', desc: 'High-resolution surface imaging' }
            ],
            Jupiter: [
              { name: 'Juno', year: '2016+', desc: 'Studying magnetosphere and interior structure' },
              { name: 'Galileo', year: '1995-2003', desc: 'First to orbit Jupiter; dropped probe into atmosphere' },
              { name: 'Europa Clipper', year: '2024+', desc: 'Investigating Europa\'s subsurface ocean' }
            ],
            Saturn: [
              { name: 'Cassini-Huygens', year: '2004-2017', desc: 'Most detailed study of Saturn; Huygens landed on Titan' },
              { name: 'Voyager 1', year: '1980', desc: 'Flyby revealed ring structure and new moons' },
              { name: 'Dragonfly', year: '2034+', desc: 'Planned rotorcraft to explore Titan' }
            ],
            Uranus: [
              { name: 'Voyager 2', year: '1986', desc: 'Only spacecraft to visit; found 10 new moons' }
            ],
            Neptune: [
              { name: 'Voyager 2', year: '1989', desc: 'Only spacecraft to visit; discovered Great Dark Spot' }
            ],
            Pluto: [
              { name: 'New Horizons', year: '2015', desc: 'First flyby; revealed Tombaugh Regio heart shape' }
            ]
          };

          // Extra fun facts per planet
          var EXTRA_FACTS = {
            Mercury: ['A day on Mercury (sunrise to sunrise) lasts 176 Earth days!', 'Mercury has no moons and no rings', 'Its core is 85% of its radius \u2014 huge for its size'],
            Venus: ['Venus spins backwards compared to most planets', 'A day on Venus is longer than its year', 'Soviet Venera probes survived only ~2 hours on the surface'],
            Earth: ['Earth is the densest planet in the solar system', 'The Moon is slowly drifting away at 3.8 cm/year', 'Earth\'s magnetic field flips every 200,000-300,000 years'],
            Mars: ['Mars has the largest dust storms in the solar system', 'Olympus Mons is 2.5x taller than Everest', 'Mars\' two moons (Phobos & Deimos) may be captured asteroids'],
            Jupiter: ['Jupiter has the shortest day of any planet (10 hours)', 'The Great Red Spot has been raging for 350+ years', 'Jupiter\'s magnetic field is 20,000x stronger than Earth\'s'],
            Saturn: ['Saturn is the least dense planet \u2014 it would float in water!', 'Its rings are mostly water ice, some only meters thick', 'Saturn\'s hexagonal storm is 30,000 km across'],
            Uranus: ['Uranus was the first planet discovered with a telescope (1781)', 'It rolls on its side \u2014 probably knocked over by a collision', 'Uranus has 13 known rings'],
            Neptune: ['Neptune takes 165 years to orbit the Sun', 'Its moon Triton orbits backwards \u2014 probably captured', 'Neptune radiates 2.6x more heat than it receives from the Sun'],
            Pluto: ['Pluto\'s largest moon Charon is half its size', 'Pluto and Charon are tidally locked \u2014 they always face each other', 'Its atmosphere freezes and falls as snow when farther from the Sun']
          };

          // Notable moons data
          var NOTABLE_MOONS = {
            Earth: [
              { name: 'Moon (Luna)', diameter: '3,474 km', dist: '384,400 km', fact: 'Only natural satellite. Causes tides. Humans walked on it 1969-1972.', type: 'Rocky' }
            ],
            Mars: [
              { name: 'Phobos', diameter: '22.4 km', dist: '9,376 km', fact: 'Slowly spiraling inward; will crash into Mars in ~50 million years.', type: 'Captured asteroid' },
              { name: 'Deimos', diameter: '12.4 km', dist: '23,463 km', fact: 'Smallest known moon in the solar system. Smooth surface.', type: 'Captured asteroid' }
            ],
            Jupiter: [
              { name: 'Io', diameter: '3,643 km', dist: '421,700 km', fact: 'Most volcanically active body in the solar system. 400+ active volcanoes!', type: 'Volcanic' },
              { name: 'Europa', diameter: '3,122 km', dist: '671,034 km', fact: 'Ice shell over a subsurface ocean. Top candidate for alien life!', type: 'Ice/Ocean' },
              { name: 'Ganymede', diameter: '5,268 km', dist: '1,070,412 km', fact: 'Largest moon in the solar system. Bigger than Mercury! Has its own magnetic field.', type: 'Ice/Rock' },
              { name: 'Callisto', diameter: '4,821 km', dist: '1,882,709 km', fact: 'Most heavily cratered object in the solar system. May have a subsurface ocean.', type: 'Ice/Rock' }
            ],
            Saturn: [
              { name: 'Titan', diameter: '5,150 km', dist: '1,221,870 km', fact: 'Only moon with a thick atmosphere. Has lakes and rivers of liquid methane!', type: 'Atmosphere/Lakes' },
              { name: 'Enceladus', diameter: '504 km', dist: '238,042 km', fact: 'Geysers of water vapor erupting from the south pole. Subsurface ocean confirmed!', type: 'Ice/Geysers' },
              { name: 'Mimas', diameter: '396 km', dist: '185,539 km', fact: 'Giant Herschel crater makes it look like the Death Star from Star Wars!', type: 'Ice/Crater' },
              { name: 'Iapetus', diameter: '1,470 km', dist: '3,560,820 km', fact: 'Two-toned: one half bright white, the other dark as coal. Has a giant equatorial ridge.', type: 'Ice/Mystery' }
            ],
            Uranus: [
              { name: 'Miranda', diameter: '471 km', dist: '129,390 km', fact: 'Most geologically diverse moon. Has a 20 km cliff called Verona Rupes!', type: 'Ice/Fractured' },
              { name: 'Titania', diameter: '1,578 km', dist: '435,910 km', fact: 'Largest moon of Uranus. Named after the queen of fairies in Shakespeare.', type: 'Ice/Rock' },
              { name: 'Ariel', diameter: '1,158 km', dist: '190,900 km', fact: 'Brightest and possibly youngest surface of Uranus\' major moons.', type: 'Ice/Canyons' }
            ],
            Neptune: [
              { name: 'Triton', diameter: '2,707 km', dist: '354,759 km', fact: 'Orbits backwards! Probably a captured Kuiper Belt object. Has nitrogen geysers.', type: 'Captured/Geysers' }
            ],
            Pluto: [
              { name: 'Charon', diameter: '1,212 km', dist: '19,591 km', fact: 'Half the size of Pluto! They orbit each other (double dwarf planet). Has a red polar cap.', type: 'Ice/Rock' }
            ]
          };

          // What the sky looks like from each planet
          var SKY_VIEWS = {
            Mercury: { sunSize: '3x larger', visible: ['Venus (brilliant)', 'Earth (blue dot)'], note: 'No atmosphere \u2014 stars visible even during daytime. Sun is blindingly large.' },
            Venus: { sunSize: '1.4x larger', visible: ['Nothing \u2014 clouds too thick'], note: 'Permanent overcast. Surface bathed in dim orange glow. Lightning flashes above.' },
            Earth: { sunSize: 'Normal', visible: ['Moon', 'Venus (evening star)', 'Mars, Jupiter, Saturn'], note: 'Blue sky from Rayleigh scattering. ~5,000 stars visible to naked eye.' },
            Mars: { sunSize: '2/3 Earth size', visible: ['Earth & Moon (bright double star)', 'Phobos (rises in west!)', 'Deimos'], note: 'Butterscotch sky from iron dust. Blue sunsets! Phobos rises 2x/day.' },
            Jupiter: { sunSize: '1/5 Earth size', visible: ['Io (volcanic orange)', 'Europa, Ganymede, Callisto in a line'], note: 'No surface \u2014 from cloud tops, see auroras 100x brighter than Earth\u2019s.' },
            Saturn: { sunSize: '1/10 Earth size', visible: ['Titan (largest)', 'Ring arcs spanning the sky'], note: 'Rings visible as bright arcs overhead. From Titan: orange haze sky, Saturn fills 11\u00B0.' },
            Uranus: { sunSize: 'Bright star', visible: ['Miranda, Ariel, Titania (dots)'], note: 'Sun just a very bright point. 42-year seasons. Extreme tilt means Sun can be at zenith at poles.' },
            Neptune: { sunSize: 'Bright star', visible: ['Triton (retrograde dot)'], note: 'Sun 900x dimmer than on Earth. Still 300x brighter than full Moon on Earth.' },
            Pluto: { sunSize: 'Very bright star', visible: ['Charon (huge in sky, never moves)', 'Sun is just a point'], note: 'Charon appears 7x larger than our Moon. They\u2019re tidally locked \u2014 Charon hangs motionless in the sky.' }
          };

          // Planet radii for scale comparison (km)
          var PLANET_RADII = { Mercury: 2440, Venus: 6052, Earth: 6371, Mars: 3390, Jupiter: 69911, Saturn: 58232, Uranus: 25362, Neptune: 24622, Pluto: 1188 };

          // Atmosphere descent layers (altitude in km, what you'd experience)
          var DESCENT_LAYERS = {
            Venus: [
              { alt: 250, name: 'Upper Haze', desc: 'Thin haze of sulfuric acid droplets', temp: '-45\u00B0C', pressure: '0.001 atm', color: '#f0e0a0' },
              { alt: 65, name: 'Cloud Deck', desc: 'Thick sulfuric acid clouds \u2014 no visibility', temp: '-10\u00B0C', pressure: '0.1 atm', color: '#e0c060' },
              { alt: 48, name: 'Lower Clouds', desc: 'Clouds thinning, dim orange light below', temp: '100\u00B0C', pressure: '1 atm', color: '#d0a040' },
              { alt: 30, name: 'Clear Air', desc: 'CO\u2082 atmosphere, eerily clear visibility', temp: '230\u00B0C', pressure: '10 atm', color: '#c08030' },
              { alt: 0, name: 'Surface', desc: 'Lead-melting heat, crushing pressure', temp: '462\u00B0C', pressure: '90 atm', color: '#a06020' }
            ],
            Earth: [
              { alt: 100, name: 'Thermosphere', desc: 'Auroras glow here. ISS orbits at 408 km.', temp: '-90 to 1500\u00B0C', pressure: '~0 atm', color: '#000020' },
              { alt: 50, name: 'Stratosphere', desc: 'Ozone layer absorbs UV. Jet stream.', temp: '-15\u00B0C', pressure: '0.001 atm', color: '#102060' },
              { alt: 12, name: 'Troposphere', desc: 'All weather happens here. Clouds, rain.', temp: '-55\u00B0C', pressure: '0.2 atm', color: '#4080d0' },
              { alt: 0, name: 'Surface', desc: 'Breathable air. Oceans and land.', temp: '15\u00B0C', pressure: '1 atm', color: '#60a040' }
            ],
            Mars: [
              { alt: 100, name: 'Upper Atmosphere', desc: 'Thin CO\u2082. Spacecraft aerobraking zone.', temp: '-120\u00B0C', pressure: '~0 atm', color: '#301810' },
              { alt: 40, name: 'Dust Layer', desc: 'Red iron-oxide dust suspended by winds', temp: '-70\u00B0C', pressure: '0.002 atm', color: '#905030' },
              { alt: 10, name: 'Lower Atmosphere', desc: 'Thin pink sky. Dust devils visible.', temp: '-50\u00B0C', pressure: '0.005 atm', color: '#b07050' },
              { alt: 0, name: 'Surface', desc: 'Red desert. 0.6% of Earth\u2019s pressure.', temp: '-65\u00B0C', pressure: '0.006 atm', color: '#b04020' }
            ],
            Jupiter: [
              { alt: 200, name: 'Stratosphere', desc: 'Haze layers above the clouds', temp: '-160\u00B0C', pressure: '0.01 atm', color: '#e0c080' },
              { alt: 50, name: 'Ammonia Clouds', desc: 'White and orange cloud bands', temp: '-110\u00B0C', pressure: '1 atm', color: '#d4924f' },
              { alt: 0, name: 'Water Clouds', desc: 'Thunderstorms with 10x Earth lightning', temp: '20\u00B0C', pressure: '5 atm', color: '#7ab8d4' },
              { alt: -100, name: 'Deep Atmosphere', desc: 'Darkness. Pressure crushing.', temp: '500\u00B0C', pressure: '100 atm', color: '#3a2a1a' },
              { alt: -500, name: 'Liquid H\u2082 Ocean', desc: 'Hydrogen compressed into liquid', temp: '2,000\u00B0C', pressure: '10,000 atm', color: '#1a1a3a' },
              { alt: -20000, name: 'Metallic H\u2082', desc: 'Liquid metal hydrogen. Magnetic field source.', temp: '10,000\u00B0C', pressure: '2,000,000 atm', color: '#4a2a6a' }
            ],
            Saturn: [
              { alt: 200, name: 'Upper Haze', desc: 'Golden haze. Rings visible overhead.', temp: '-180\u00B0C', pressure: '0.01 atm', color: '#e0c870' },
              { alt: 50, name: 'Ammonia Clouds', desc: 'Golden-white cloud bands, calmer than Jupiter', temp: '-140\u00B0C', pressure: '1 atm', color: '#c9a04a' },
              { alt: 0, name: 'Water Clouds', desc: 'Deep thunderstorms', temp: '0\u00B0C', pressure: '5 atm', color: '#6a9ab4' },
              { alt: -200, name: 'Deep Atmosphere', desc: 'Increasing pressure, total darkness', temp: '1,000\u00B0C', pressure: '1,000 atm', color: '#2a1a0a' },
              { alt: -10000, name: 'Metallic H\u2082', desc: 'Hydrogen becomes metallic liquid', temp: '8,000\u00B0C', pressure: '1,000,000 atm', color: '#3a2a5a' }
            ],
            Uranus: [
              { alt: 300, name: 'Upper Atmosphere', desc: 'Thin methane haze \u2014 absorbs red light', temp: '-220\u00B0C', pressure: '0.001 atm', color: '#80d0d0' },
              { alt: 50, name: 'Methane Clouds', desc: 'Blue-green ice crystal clouds', temp: '-195\u00B0C', pressure: '1 atm', color: '#5aafa5' },
              { alt: -100, name: 'H\u2082S Clouds', desc: 'Hydrogen sulfide clouds (rotten eggs!)', temp: '-100\u00B0C', pressure: '10 atm', color: '#3a8a7a' },
              { alt: -5000, name: 'Superionic Ice', desc: 'Water in exotic superionic state', temp: '2,700\u00B0C', pressure: '200,000 atm', color: '#2a5a7a' },
              { alt: -15000, name: 'Diamond Rain', desc: 'Carbon atoms crushed into diamonds falling like rain', temp: '5,000\u00B0C', pressure: '1,000,000 atm', color: '#b8d8f8' }
            ],
            Neptune: [
              { alt: 300, name: 'Upper Atmosphere', desc: 'Deep blue from methane absorption', temp: '-220\u00B0C', pressure: '0.001 atm', color: '#4060c0' },
              { alt: 50, name: 'Methane Clouds', desc: 'Supersonic winds: 2,100 km/h', temp: '-200\u00B0C', pressure: '1 atm', color: '#3050a0' },
              { alt: -100, name: 'Deep Clouds', desc: 'Great Dark Spot storms', temp: '-50\u00B0C', pressure: '50 atm', color: '#203080' },
              { alt: -5000, name: 'Hot Ice Mantle', desc: 'Superionic water at extreme pressure', temp: '2,700\u00B0C', pressure: '200,000 atm', color: '#1a2060' },
              { alt: -15000, name: 'Diamond Rain', desc: 'Literal diamonds raining down through the depths', temp: '5,000\u00B0C', pressure: '1,000,000 atm', color: '#a0c8e8' }
            ]
          };

          // Kepler's laws data — computed after PLANETS array (moved from above)

                    // Famous exoplanets for comparison
          var EXOPLANETS = [
            { name: 'Proxima Centauri b', dist: '4.24 ly', mass: '1.17 Earth', temp: '-39\u00B0C', note: 'Closest known exoplanet! In habitable zone of nearest star.', habitable: true },
            { name: 'TRAPPIST-1e', dist: '39 ly', mass: '0.69 Earth', temp: '-22\u00B0C', note: 'One of 7 rocky planets. Best candidate for liquid water.', habitable: true },
            { name: 'Kepler-452b', dist: '1,400 ly', mass: '5x Earth', temp: '-8\u00B0C', note: 'Earth\u2019s \u201Cbigger cousin.\u201D Sun-like star. 385-day year.', habitable: true },
            { name: 'HD 189733 b', dist: '63 ly', mass: '1.13 Jupiter', temp: '1,200\u00B0C', note: 'Rains molten glass sideways! Blue color from silicate particles.', habitable: false },
            { name: '55 Cancri e', dist: '41 ly', mass: '8x Earth', temp: '2,300\u00B0C', note: 'Super-Earth covered in lava oceans. May contain diamond interior.', habitable: false },
            { name: 'WASP-76b', dist: '640 ly', mass: '0.92 Jupiter', temp: '2,400\u00B0C', note: 'So hot that iron vaporizes on the day side and rains as liquid metal at night!', habitable: false },
            { name: 'PSR B1257+12 b', dist: '2,300 ly', mass: '0.02 Earth', temp: '-200\u00B0C', note: 'First exoplanet ever discovered (1992)! Orbits a dead pulsar star.', habitable: false },
            { name: 'TOI-700 d', dist: '100 ly', mass: '1.19 Earth', temp: 'Unknown', note: 'Earth-sized planet in habitable zone. Discovered by TESS in 2020.', habitable: true }
          ];

          // Space exploration timeline
          var TIMELINE = [
            { year: 1957, event: 'Sputnik 1 \u2014 First artificial satellite (USSR)', icon: '\uD83D\uDEF0' },
            { year: 1961, event: 'Yuri Gagarin \u2014 First human in space', icon: '\uD83D\uDE80' },
            { year: 1962, event: 'Mariner 2 \u2014 First successful planetary flyby (Venus)', icon: '\u2640' },
            { year: 1969, event: 'Apollo 11 \u2014 First humans on the Moon', icon: '\uD83C\uDF15' },
            { year: 1971, event: 'Mariner 9 \u2014 First Mars orbiter', icon: '\uD83D\uDD34' },
            { year: 1973, event: 'Pioneer 10 \u2014 First Jupiter flyby', icon: '\uD83E\uDE90' },
            { year: 1976, event: 'Viking 1 \u2014 First successful Mars landing', icon: '\uD83D\uDE97' },
            { year: 1977, event: 'Voyager 1 & 2 launched \u2014 Grand Tour of outer planets', icon: '\uD83C\uDF0C' },
            { year: 1979, event: 'Voyager 1 \u2014 Jupiter flyby; discovers volcanic Io', icon: '\uD83C\uDF0B' },
            { year: 1986, event: 'Voyager 2 \u2014 First & only Uranus flyby', icon: '\u26AA' },
            { year: 1989, event: 'Voyager 2 \u2014 First & only Neptune flyby', icon: '\uD83D\uDD35' },
            { year: 1990, event: 'Hubble Space Telescope launched', icon: '\uD83D\uDD2D' },
            { year: 1997, event: 'Cassini-Huygens \u2014 Launched to Saturn', icon: '\uD83D\uDEF8' },
            { year: 2004, event: 'Spirit & Opportunity \u2014 Mars rovers land', icon: '\uD83E\uDD16' },
            { year: 2005, event: 'Huygens probe lands on Titan \u2014 farthest landing ever', icon: '\uD83C\uDF19' },
            { year: 2012, event: 'Curiosity rover lands on Mars', icon: '\uD83D\uDE97' },
            { year: 2015, event: 'New Horizons \u2014 First Pluto flyby', icon: '\u2B50' },
            { year: 2021, event: 'Perseverance + Ingenuity \u2014 First helicopter on Mars', icon: '\uD83D\uDE81' },
            { year: 2021, event: 'James Webb Space Telescope launched', icon: '\uD83D\uDD2D' },
            { year: 2024, event: 'Europa Clipper launched \u2014 hunting for life', icon: '\uD83E\uDDA0' }
          ];

          // "What If?" scenarios
          var WHAT_IF = {
            Mercury: [
              { q: 'What if Mercury had an atmosphere?', a: 'It would be stripped away by solar wind in months \u2014 Mercury has almost no magnetic field and is too close to the Sun.' },
              { q: 'What if you stood on Mercury at the terminator?', a: 'You\u2019d experience the most extreme temperature gradient in the solar system: 430\u00B0C on one side, -180\u00B0C on the other, just steps apart!' }
            ],
            Venus: [
              { q: 'What if Venus spun the other way?', a: 'Its day would be ~24 hours instead of 243 days! It might have developed a more Earth-like climate.' },
              { q: 'Could we terraform Venus?', a: 'Theoretically! Floating cities at 50 km altitude would have Earth-like pressure and temperature. Some scientists call it easier than Mars.' }
            ],
            Earth: [
              { q: 'What if Earth had no Moon?', a: 'Days would be ~8 hours long, winds up to 200 mph, extreme seasons, and life might never have evolved complex forms.' },
              { q: 'What if Earth were twice as massive?', a: 'Gravity 1.4x stronger, thicker atmosphere, more volcanism, and we\u2019d need rockets 4x more powerful to reach orbit!' }
            ],
            Mars: [
              { q: 'What if Mars still had its magnetic field?', a: 'It would still have a thick atmosphere and possibly liquid water oceans. Mars might have been Earth-like for billions of years!' },
              { q: 'Could you breathe on Mars with just an oxygen mask?', a: 'No! The pressure is so low (0.6% of Earth) that your blood would literally boil. You need a full pressure suit.' }
            ],
            Jupiter: [
              { q: 'What if Jupiter became a star?', a: 'It would need ~80x more mass. If it did, we\u2019d have a binary star system! Earth would be too hot for life.' },
              { q: 'What\u2019s at the very center of Jupiter?', a: 'A rocky core 10-20x Earth\u2019s mass, surrounded by metallic hydrogen at 24,000\u00B0C and 100 million atmospheres of pressure!' }
            ],
            Saturn: [
              { q: 'What if you could stand on Saturn\u2019s rings?', a: 'You\u2019d sink! The rings are mostly tiny ice particles with gaps between them. Average thickness is only 10 meters!' },
              { q: 'Will Saturn always have rings?', a: 'No! They\u2019re slowly raining into Saturn. In ~100 million years, the rings will be completely gone.' }
            ],
            Uranus: [
              { q: 'Why is Uranus sideways?', a: 'Scientists think a proto-planet the size of Earth smashed into Uranus billions of years ago, knocking it on its side!' },
              { q: 'What\u2019s diamond rain like?', a: 'At 8,000 km depth, carbon atoms are crushed into diamonds that fall like hailstones through liquid hydrogen. Truly alien weather!' }
            ],
            Neptune: [
              { q: 'How can Neptune have 2,100 km/h winds?', a: 'With almost no solid surface to create friction, once winds start they barely slow down. Neptune also radiates internal heat.' },
              { q: 'Could Triton support life?', a: 'Unlikely on the surface (-235\u00B0C), but tidal heating from Neptune might create a subsurface ocean. It\u2019s a long shot!' }
            ],
            Pluto: [
              { q: 'Why was Pluto demoted?', a: 'In 2006, the IAU defined planets must \u201Cclear their orbit.\u201D Pluto shares its space with thousands of Kuiper Belt objects.' },
              { q: 'What would a sunset look like on Pluto?', a: 'The Sun would look like a very bright star. At 39 AU away, it would be ~900x dimmer than on Earth, but still 250x brighter than a full Moon.' }
            ]
          };

          // Magnetosphere data
          var MAGNETOSPHERE = {
            Mercury: { strength: 'Very weak (1% of Earth)', shield: false, note: 'Tiny magnetic field from partially molten core. Not enough to protect surface.' },
            Venus: { strength: 'None (induced only)', shield: false, note: 'No global magnetic field. Solar wind interacts directly with atmosphere.' },
            Earth: { strength: '25-65 microtesla', shield: true, note: 'Strong dipole field from liquid iron outer core. Creates Van Allen belts. Essential for life!' },
            Mars: { strength: 'None (crustal remnants)', shield: false, note: 'Lost its global field ~4 billion years ago. Remnant magnetism in ancient crust.' },
            Jupiter: { strength: '20,000x Earth', shield: true, note: 'Strongest in solar system! Deadly radiation belts. Metallic hydrogen generates the field.' },
            Saturn: { strength: '580x Earth', shield: true, note: 'Unique: almost perfectly aligned with rotation axis. Hydrogen metallic core.' },
            Uranus: { strength: '50x Earth', shield: true, note: 'Tilted 59\u00B0 from rotation axis! Off-center. Very unusual configuration.' },
            Neptune: { strength: '27x Earth', shield: true, note: 'Also highly tilted (47\u00B0) and off-center. Complex magnetic environment.' },
            Pluto: { strength: 'None detected', shield: false, note: 'Too small and cold for a dynamo. No protection from solar wind.' }
          };

                    // Escape velocities (km/s)
          var ESCAPE_VEL = { Mercury: 4.3, Venus: 10.4, Earth: 11.2, Mars: 5.0, Jupiter: 59.5, Saturn: 35.5, Uranus: 21.3, Neptune: 23.5, Pluto: 1.2 };

          // Did You Know? rotating facts
          var DYK_FACTS = [
            'The Sun contains 99.86% of all mass in the solar system!',
            'If you could drive to the Sun at 100 km/h, it would take 170 years.',
            'A teaspoon of neutron star material weighs about 6 billion tons.',
            'Space is completely silent \u2014 there\'s no medium for sound to travel.',
            'The footprints on the Moon will last for 100 million years.',
            'There are more stars in the universe than grains of sand on Earth.',
            'Venus rotates so slowly that its day is longer than its year.',
            'Saturn\'s density is so low it would float in a giant bathtub.',
            'The Voyager 1 spacecraft is the farthest human-made object from Earth.',
            'Jupiter\'s Great Red Spot is shrinking \u2014 it was once 3x Earth\'s size.',
            'Mars has blue sunsets because fine dust scatters red light forward.',
            'One year on Pluto is 248 Earth years \u2014 it hasn\'t completed a full orbit since discovery.',
            'The asteroid belt has less total mass than our Moon.',
            'Light from the Sun takes 8 minutes 20 seconds to reach Earth.',
            'There may be a giant \u201CPlanet Nine\u201D lurking beyond Pluto\'s orbit.',
            'Olympus Mons on Mars is so large, you couldn\'t see the edges from its summit.',
            'Europa\'s ocean may contain 2-3x more water than all of Earth\'s oceans.',
            'Diamond rain is real \u2014 it happens inside Uranus and Neptune.',
            'The Kuiper Belt extends from 30 to 50 AU from the Sun.',
            'Saturn\'s moon Titan has a thicker atmosphere than Earth!'
          ];

          // Hohmann transfer orbit data (delta-v in km/s from Earth)
          var HOHMANN = {
            Mercury: { dv1: 7.5, dv2: 5.5, travelDays: 105, window: '~116 days' },
            Venus: { dv1: 3.5, dv2: 2.7, travelDays: 146, window: '~584 days' },
            Mars: { dv1: 3.6, dv2: 2.1, travelDays: 259, window: '~780 days (26 months)' },
            Jupiter: { dv1: 8.8, dv2: 5.6, travelDays: 997, window: '~399 days (13 months)' },
            Saturn: { dv1: 10.3, dv2: 5.4, travelDays: 2210, window: '~378 days' },
            Uranus: { dv1: 11.3, dv2: 4.7, travelDays: 5830, window: '~370 days' },
            Neptune: { dv1: 11.7, dv2: 4.0, travelDays: 11200, window: '~367 days' },
            Pluto: { dv1: 11.8, dv2: 3.3, travelDays: 16500, window: '~366 days' }
          };

                    // Mission log tracker
          var missionLog = d.missionLog || [];
          function addMissionEntry(entry) {
            var log = (d.missionLog || []).slice();
            log.unshift({ text: entry, time: new Date().toLocaleTimeString() });
            if (log.length > 20) log = log.slice(0, 20);
            upd('missionLog', log);
          }

          // Dark mode
          var isDark = d.isDark || false;

          var PLANETS = [

            { name: t('stem.periodic.mercury'), emoji: '\u2638', color: '#94a3b8', rgb: [0.58, 0.64, 0.72], size: 0.2, dist: 8, speed: 4.15, tilt: 0.03, moons: 0, diameter: '4,879 km', dayLen: '59 Earth days', yearLen: '88 days', temp: '\u2212180 to 430\u00B0C', fact: 'Smallest planet; no atmosphere to retain heat.', gravity: '0.38g', atmosphere: 'Virtually none \u2014 exosphere of O\u2082, Na, H\u2082, He', surface: 'Cratered surface similar to the Moon', notableFeatures: ['Caloris Basin (1,550 km impact crater)', 'Water ice in permanently shadowed polar craters', 'Most cratered planet in the solar system'], skyColor: '#000000', terrainColor: '#8a8278', terrainType: 'cratered', surfaceDesc: 'Dark airless surface pocked with ancient craters beneath a pitch-black sky. The Sun blazes 3\u00D7 larger than on Earth.' },

            { name: t('stem.solar_sys.venus'), emoji: '\u2640', color: '#fbbf24', rgb: [0.98, 0.75, 0.14], size: 0.55, dist: 11, speed: 1.62, tilt: 2.64, moons: 0, diameter: '12,104 km', dayLen: '243 Earth days', yearLen: '225 days', temp: '462\u00B0C avg.', fact: 'Hottest planet due to runaway greenhouse effect. Rotates backwards!', gravity: '0.91g', atmosphere: '96.5% CO\u2082 \u2014 crushingly thick (90x Earth pressure)', surface: 'Volcanic plains with lava flows and pancake domes', notableFeatures: ['Maxwell Montes (11 km high)', 'Thousand+ volcanoes', 'Surface hot enough to melt lead'], skyColor: '#c9803a', terrainColor: '#d4723a', terrainType: 'volcanic', surfaceDesc: 'Orange volcanic hellscape with dense sulfuric acid clouds. Surface pressure would crush a submarine.' },

            { name: t('stem.solar_sys.earth'), emoji: '\uD83C\uDF0D', color: '#3b82f6', rgb: [0.23, 0.51, 0.96], size: 0.6, dist: 14, speed: 1.0, tilt: 0.41, moons: 1, diameter: '12,742 km', dayLen: '24 hours', yearLen: '365.25 days', temp: '15\u00B0C avg.', fact: 'Only known planet with liquid water and life.', gravity: '1.0g', atmosphere: '78% N\u2082, 21% O\u2082 \u2014 the only breathable atmosphere', surface: 'Oceans, continents, ice caps, forests', notableFeatures: ['71% covered in water', 'Magnetic field protecting from solar wind', 'Only known planet with plate tectonics'], skyColor: '#5ba3d9', terrainColor: '#3a8c3a', terrainType: 'earthlike', surfaceDesc: 'Blue skies, green hills, flowing water. The only known world with life.' },

            { name: t('stem.solar_sys.mars'), emoji: '\uD83D\uDD34', color: '#ef4444', rgb: [0.94, 0.27, 0.27], size: 0.35, dist: 18, speed: 0.53, tilt: 0.44, moons: 2, diameter: '6,779 km', dayLen: '24h 37m', yearLen: '687 days', temp: '\u221265\u00B0C avg.', fact: 'Has the tallest volcano in the solar system: Olympus Mons (21.9 km high).', gravity: '0.38g', atmosphere: '95% CO\u2082 \u2014 thin (0.6% of Earth pressure)', surface: 'Red iron-oxide desert with deep canyons', notableFeatures: ['Olympus Mons (21.9 km \u2014 tallest volcano)', 'Valles Marineris (4,000 km canyon)', 'Polar ice caps of CO\u2082 and water'], skyColor: '#c4856b', terrainColor: '#b5452a', terrainType: 'desert', surfaceDesc: 'Rust-red desert beneath a butterscotch sky. Dust devils dance across the barren plains.' },

            { name: t('stem.solar_sys.jupiter'), emoji: '\uD83E\uDE90', color: '#f97316', rgb: [0.98, 0.45, 0.09], size: 3.2, dist: 28, speed: 0.084, tilt: 0.05, moons: 95, diameter: '139,820 km', dayLen: '10 hours', yearLen: '12 years', temp: '\u2212110\u00B0C', fact: 'Largest planet. The Great Red Spot is a storm larger than Earth!', gravity: '2.34g', atmosphere: '90% H\u2082, 10% He \u2014 no solid surface', surface: 'Gas giant \u2014 layered cloud bands of ammonia and water', notableFeatures: ['Great Red Spot (storm > Earth-sized)', 'Strongest magnetic field', 'Europa may harbor an ocean under ice'], skyColor: '#d4924f', terrainColor: '#c4713a', terrainType: 'gasgiant', surfaceDesc: 'Endless stratified cloud layers in bands of amber, cream, and rust. Lightning flashes illuminate ammonia storms.' },

            { name: t('stem.solar_sys.saturn'), emoji: '\uD83E\uDE90', color: '#eab308', rgb: [0.92, 0.70, 0.03], size: 2.7, dist: 36, speed: 0.034, tilt: 0.47, moons: 146, diameter: '116,460 km', dayLen: '10.7 hours', yearLen: '29 years', temp: '\u2212140\u00B0C', fact: 'Its rings are made of ice and rock. Could float in a giant bathtub!', hasRings: true, gravity: '1.06g', atmosphere: '96% H\u2082, 3% He \u2014 second gas giant', surface: 'Gas giant \u2014 golden cloud bands, no solid surface', notableFeatures: ['Ring system 282,000 km wide', 'Hexagonal storm at north pole', 'Titan has lakes of liquid methane'], skyColor: '#d4b16a', terrainColor: '#c9a04a', terrainType: 'gasgiant', surfaceDesc: 'Golden cloud decks with ring arcs slicing across the amber sky. A hexagonal polar vortex churns above.' },

            { name: t('stem.solar_sys.uranus'), emoji: '\u26AA', color: '#67e8f9', rgb: [0.40, 0.91, 0.98], size: 1.5, dist: 44, speed: 0.012, tilt: 1.71, moons: 28, diameter: '50,724 km', dayLen: '17 hours', yearLen: '84 years', temp: '\u2212195\u00B0C', fact: 'Rotates on its side! An ice giant with methane atmosphere.', gravity: '0.92g', atmosphere: '83% H\u2082, 15% He, 2% CH\u2084 \u2014 ice giant', surface: 'Ice giant \u2014 methane gives blue-green color', notableFeatures: ['Rotates on its side (97.8\u00B0 tilt)', 'Faint ring system', 'Diamond rain in the interior'], skyColor: '#5aafa5', terrainColor: '#4a9a9a', terrainType: 'icegiant', surfaceDesc: 'Blue-green ice clouds under a teal sky. Deep below, extreme pressures crush carbon into diamonds that rain down.' },

            { name: t('stem.solar_sys.neptune'), emoji: '\uD83D\uDD35', color: '#6366f1', rgb: [0.39, 0.40, 0.95], size: 1.4, dist: 52, speed: 0.006, tilt: 0.49, moons: 16, diameter: '49,244 km', dayLen: '16 hours', yearLen: '165 years', temp: '\u2212200\u00B0C', fact: 'Windiest planet: winds up to 2,100 km/h. Deep blue from methane.', gravity: '1.19g', atmosphere: '80% H\u2082, 19% He, 1% CH\u2084 \u2014 deep blue', surface: 'Ice giant \u2014 vivid blue from methane absorption', notableFeatures: ['Fastest winds: 2,100 km/h', 'Great Dark Spot (storm)', 'Triton orbits backwards'], skyColor: '#2a4a8a', terrainColor: '#1a3a6a', terrainType: 'icegiant', surfaceDesc: 'Deep indigo cloud layers whipped by supersonic winds. Dark storms rage across the methane-blue atmosphere.' },

            { name: t('stem.solar_sys.pluto'), emoji: '\u2B50', color: '#a78bfa', rgb: [0.66, 0.55, 0.98], size: 0.14, dist: 60, speed: 0.004, tilt: 2.04, moons: 5, diameter: '2,377 km', dayLen: '6.4 Earth days', yearLen: '248 years', temp: '\u2212230\u00B0C', fact: 'Dwarf planet since 2006. Has a heart-shaped glacier named Tombaugh Regio.', gravity: '0.06g', atmosphere: 'Thin N\u2082 \u2014 freezes and falls as snow', surface: 'Nitrogen ice plains and water-ice mountains', notableFeatures: ['Tombaugh Regio (heart-shaped glacier)', 'Mountains of water ice', 'Charon is half its size'], skyColor: '#1a1a2a', terrainColor: '#8a7a6a', terrainType: 'iceworld', surfaceDesc: 'Pale nitrogen ice plains under a near-black sky. The Sun is just a bright star. The heart-shaped Tombaugh Regio gleams.' },

          ];

          // Kepler's laws data
          var ORBITAL_DATA = PLANETS.map(function(p) {
            return {
              name: p.name,
              emoji: p.emoji,
              semiMajor: p.dist,
              period: parseFloat(p.yearLen) || 1,
              speed: p.speed,
              eccentricity: p.name === 'Pluto' ? 0.25 : p.name === 'Mercury' ? 0.21 : 0.02 + Math.random() * 0.05
            };
          });

          var sel = d.selectedPlanet ? PLANETS.find(p => p.name === d.selectedPlanet) : null;

          // Track planet visits (moved here from above to avoid temporal dead zone)
          if (sel && planetsVisited.indexOf(sel.name) === -1) {
            var newVisited = planetsVisited.concat([sel.name]);
            upd('planetsVisited', newVisited);
            planetsVisited = newVisited;
          }
          setTimeout(checkChallenges, 100);

          const simSpeed = d.simSpeed || 1;

          const paused = d.paused || false;



          // â”€â”€ Three.js 3D Canvas â”€â”€

          const canvasRef = function (canvas) {

            if (!canvas) { // cleanup on unmount â€” but skip if canvas is still alive (just a ref swap from re-render)

              const prev = document.querySelector('.solar3d-canvas');

              if (prev && prev._solarInit) return; // Still mounted, skip cleanup (React ref swap)

              if (prev && prev._solarCleanup) { prev._solarCleanup(); prev._solarInit = false; }

              return;

            }

            if (canvas._solarInit) return;

            canvas._solarInit = true;



            // Load Three.js if needed

            function initScene(THREE) {

              const W = canvas.clientWidth || 600;

              const H = canvas.clientHeight || 340;

              const scene = new THREE.Scene();

              const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);

              camera.position.set(0, 28, 50);

              camera.lookAt(0, 0, 0);

              const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });

              renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

              renderer.setSize(W, H);



              // â”€â”€ Starfield â”€â”€

              const starGeo = new THREE.BufferGeometry();

              const starPos = new Float32Array(3000);

              for (let i = 0; i < 3000; i++) { starPos[i] = (Math.random() - 0.5) * 400; }

              starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

              scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 })));



              // â”€â”€ Ambient light â”€â”€

              scene.add(new THREE.AmbientLight(0x222244, 0.3));



              // â”€â”€ Sun â”€â”€

              const sunGeo = new THREE.SphereGeometry(5.5, 32, 32);

              const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });

              const sun = new THREE.Mesh(sunGeo, sunMat);

              scene.add(sun);

              const sunLight = new THREE.PointLight(0xffffff, 1.5, 200);

              scene.add(sunLight);

              // Sun glow sprite

              const glowCanvas = document.createElement('canvas'); glowCanvas.width = 128; glowCanvas.height = 128;

              const gctx = glowCanvas.getContext('2d');

              const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);

              grad.addColorStop(0, 'rgba(255,220,80,0.6)'); grad.addColorStop(0.4, 'rgba(255,180,40,0.2)'); grad.addColorStop(1, 'rgba(255,160,0,0)');

              gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);

              const glowTex = new THREE.CanvasTexture(glowCanvas);

              const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending }));

              glowSprite.scale.set(18, 18, 1);

              scene.add(glowSprite);



              // â”€â”€ Procedural planet texture â”€â”€

              function makePlanetTex(rgb, variation) {

                const c = document.createElement('canvas'); c.width = 128; c.height = 64;

                const ctx = c.getContext('2d');

                const base = rgb;

                for (let y = 0; y < 64; y++) {

                  for (let x = 0; x < 128; x++) {

                    const n = (Math.sin(x * 0.3 + y * 0.1) * 0.5 + Math.sin(y * 0.5) * 0.3 + Math.random() * 0.2) * variation;

                    const r = Math.min(255, Math.max(0, Math.round((base[0] + n * 0.15) * 255)));

                    const g = Math.min(255, Math.max(0, Math.round((base[1] + n * 0.1) * 255)));

                    const b = Math.min(255, Math.max(0, Math.round((base[2] - n * 0.05) * 255)));

                    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';

                    ctx.fillRect(x, y, 1, 1);

                  }

                }

                const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex;

              }



              // â”€â”€ Create planets â”€â”€

              const planetMeshes = [];

              const orbitLines = [];

              PLANETS.forEach(function (p, idx) {

                // Orbit ring

                const orbitGeo = new THREE.RingGeometry(p.dist - 0.02, p.dist + 0.02, 128);

                const orbitMat = new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });

                const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);

                orbitMesh.rotation.x = -Math.PI / 2;

                scene.add(orbitMesh);

                orbitLines.push(orbitMesh);



                // Planet sphere

                const geo = new THREE.SphereGeometry(p.size, 24, 24);

                const tex = makePlanetTex(p.rgb, 1.0 + idx * 0.3);

                const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0.1 });

                const mesh = new THREE.Mesh(geo, mat);

                mesh.userData = { name: p.name, idx: idx };

                // Starting orbital angle â€” spread planets out

                mesh._orbitAngle = (idx / PLANETS.length) * Math.PI * 2;

                mesh._orbitDist = p.dist;

                mesh._orbitSpeed = p.speed;

                mesh.position.set(Math.cos(mesh._orbitAngle) * p.dist, 0, Math.sin(mesh._orbitAngle) * p.dist);

                scene.add(mesh);

                planetMeshes.push(mesh);



                // Saturn's rings

                if (p.name === t('stem.solar_sys.earth')) {
                  const moonGeo = new THREE.SphereGeometry(0.12, 8, 8);
                  const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
                  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
                  moonMesh._orbitAngle = 0; moonMesh._dist = p.size + 0.6;
                  mesh.add(moonMesh); mesh._moonObj = moonMesh;
                }
                if (p.name === t('stem.solar_sys.mars')) {
                  mesh._moons = [];
                  for(let m=0; m<2; m++) {
                    const jm = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({color: 0x888888}));
                    jm._dist = p.size + 0.3 + m * 0.2; jm._orbitAngle = Math.random() * Math.PI * 2; jm._speed = 4 - m;
                    mesh.add(jm); mesh._moons.push(jm);
                  }
                }
                if (p.name === t('stem.solar_sys.jupiter')) {
                  mesh._moons = [];
                  for(let m=0; m<4; m++) {
                    const jm = new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.05, 8, 8), new THREE.MeshStandardMaterial({color: 0xddccaa}));
                    jm._dist = p.size + 0.6 + m * 0.4; jm._orbitAngle = Math.random() * Math.PI * 2; jm._speed = 3 - m * 0.4;
                    mesh.add(jm); mesh._moons.push(jm);
                  }
                }
                if (p.name === t('stem.solar_sys.saturn')) {
                  mesh._moons = [];
                  for(let m=0; m<3; m++) {
                    const jm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({color: 0xddddcc}));
                    jm._dist = p.size * 2.4 + m * 0.5; jm._orbitAngle = Math.random() * Math.PI * 2; jm._speed = 2 - m * 0.3;
                    mesh.add(jm); mesh._moons.push(jm);
                  }
                }

                if (p.hasRings) {

                  const ringGeo = new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 64);

                  const ringCanvas = document.createElement('canvas'); ringCanvas.width = 256; ringCanvas.height = 1;

                  const rctx = ringCanvas.getContext('2d');

                  const rGrad = rctx.createLinearGradient(0, 0, 256, 0);

                  rGrad.addColorStop(0, 'rgba(210,180,120,0.0)'); rGrad.addColorStop(0.15, 'rgba(210,180,120,0.7)');

                  rGrad.addColorStop(0.4, 'rgba(180,160,100,0.5)'); rGrad.addColorStop(0.5, 'rgba(140,130,80,0.1)');

                  rGrad.addColorStop(0.6, 'rgba(200,170,110,0.6)'); rGrad.addColorStop(0.85, 'rgba(180,150,90,0.4)');

                  rGrad.addColorStop(1, 'rgba(160,140,80,0.0)');

                  rctx.fillStyle = rGrad; rctx.fillRect(0, 0, 256, 1);

                  const ringTex = new THREE.CanvasTexture(ringCanvas);

                  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

                  const ringMesh = new THREE.Mesh(ringGeo, ringMat);

                  ringMesh.rotation.x = -Math.PI / 2 + p.tilt;

                  mesh.add(ringMesh);

                }

              });



              // â”€â”€ Asteroid belt (between Mars and Jupiter) â”€â”€

              const asteroidCount = 300;

              const asteroidGeo = new THREE.BufferGeometry();

              const aPos = new Float32Array(asteroidCount * 3);

              for (let i = 0; i < asteroidCount; i++) {

                const ang = Math.random() * Math.PI * 2;

                const r = 22 + Math.random() * 4;

                aPos[i * 3] = Math.cos(ang) * r;

                aPos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;

                aPos[i * 3 + 2] = Math.sin(ang) * r;

              }

              asteroidGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));

              scene.add(new THREE.Points(asteroidGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.08 })));

              const cometGeo = new THREE.SphereGeometry(0.15, 8, 8);
              const cometMat = new THREE.MeshBasicMaterial({ color: 0xaaffff });
              const cometMesh = new THREE.Mesh(cometGeo, cometMat);
              cometMesh.userData = { name: 'Halley\'s Comet', idx: planetMeshes.length, isComet: true };
              cometMesh._orbitAngle = 0;
              cometMesh._a = 35; // semi-major axis
              cometMesh._e = 0.94; // eccentricity
              cometMesh._speedScale = 0.8;
              
              // Add a simple tail using points
              const tailGeo = new THREE.BufferGeometry();
              const tailPos = new Float32Array(50 * 3);
              tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3));
              const tailPoints = new THREE.Points(tailGeo, new THREE.PointsMaterial({ color: 0x88ffff, size: 0.1, transparent: true, opacity: 0.4 }));
              scene.add(tailPoints);
              cometMesh._tail = tailPoints;
              
              scene.add(cometMesh);
              planetMeshes.push(cometMesh);




              // â”€â”€ Camera orbit controls (manual) â”€â”€

              let camTheta = 0.5, camPhi = 1.0, camDist = 55;

              let isDragging = false, lastX = 0, lastY = 0;

              let targetLookAt = new THREE.Vector3(0, 0, 0);

              let currentLookAt = new THREE.Vector3(0, 0, 0);

              let currentDist = 55;

              let targetDist = 55;

              let focusedPlanetIdx = -1; // index in planetMeshes, -1 = none (system view)

              let cameraLerp = 0.06; // smooth interpolation speed



              function updateCamera() {

                camera.position.x = currentLookAt.x + currentDist * Math.sin(camPhi) * Math.cos(camTheta);

                camera.position.y = currentLookAt.y + currentDist * Math.cos(camPhi);

                camera.position.z = currentLookAt.z + currentDist * Math.sin(camPhi) * Math.sin(camTheta);

                camera.lookAt(currentLookAt);

              }

              updateCamera();



              function onSolarDown(e) {

                isDragging = true; lastX = e.clientX; lastY = e.clientY;

                canvas._clickStartX = e.clientX; canvas._clickStartY = e.clientY;

                canvas.setPointerCapture(e.pointerId);

              }

              function onSolarMove(e) {

                if (!isDragging) return;

                const dx = e.clientX - lastX; const dy = e.clientY - lastY;

                camTheta -= dx * 0.008;

                camPhi = Math.max(0.15, Math.min(Math.PI - 0.15, camPhi - dy * 0.008));

                lastX = e.clientX; lastY = e.clientY;

                updateCamera();

              }

              function onSolarUp(e) {

                isDragging = false;

                canvas.releasePointerCapture(e.pointerId);

              }

              function onSolarWheel(e) {

                e.preventDefault();

                targetDist = Math.max(3, Math.min(120, targetDist + e.deltaY * 0.05));

              }



              // â”€â”€ Raycasting for planet clicks (smooth fly-to) â”€â”€

              const raycaster = new THREE.Raycaster();

              const mouse = new THREE.Vector2();

              function onSolarClick(e) {

                if (Math.abs(e.clientX - (canvas._clickStartX || 0)) > 5 || Math.abs(e.clientY - (canvas._clickStartY || 0)) > 5) return; // was a drag

                const rect = canvas.getBoundingClientRect();

                mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;

                mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);

                const hits = raycaster.intersectObjects(planetMeshes);

                if (hits.length > 0) {

                  const hitObj = hits[0].object;

                  const name = hitObj.userData.name;

                  upd('selectedPlanet', name);

                  focusedPlanetIdx = hitObj.userData.idx;

                  // Set smooth zoom target â€” closer for small planets, farther for giants

                  var radius = hitObj.geometry.parameters.radius;

                  targetDist = Math.max(3, Math.min(18, radius * 5));

                  // Set lookAt target to planet's current position (will be tracked each frame)

                  targetLookAt.copy(hitObj.position);

                  // Adjust camera angle for a nice viewing angle

                  camPhi = 0.8;

                } else {

                  // Clicked empty space â€” deselect, return to system view

                  upd('selectedPlanet', null);

                  focusedPlanetIdx = -1;

                  targetLookAt.set(0, 0, 0);

                  targetDist = 55;

                }

              }

              // Double-click to reset to full system view

              function onSolarDblClick(e) {

                upd('selectedPlanet', null);

                focusedPlanetIdx = -1;

                targetLookAt.set(0, 0, 0);

                targetDist = 55;

                camPhi = 1.0;

              }

              canvas.addEventListener('pointerdown', onSolarDown);

              canvas.addEventListener('pointermove', onSolarMove);

              canvas.addEventListener('pointerup', onSolarUp);

              canvas.addEventListener('wheel', onSolarWheel, { passive: false });

              canvas.addEventListener('click', onSolarClick);

              canvas.addEventListener('dblclick', onSolarDblClick);



              // â”€â”€ Planet label overlay â”€â”€

              const labelContainer = canvas.parentElement.querySelector('.solar-labels');



              // â”€â”€ Animation loop â”€â”€

              let animId;

              let time = 0;

              function animate() {

                animId = requestAnimationFrame(animate);

                const speed = parseFloat(canvas.dataset.speed || '1');

                const isPaused = canvas.dataset.paused === 'true';

                if (!isPaused) {

                  time += 0.008 * speed;

                }



                // Orbit planets

                var timeScale = 0.008 * speed * (isPaused ? 0 : 1);
                planetMeshes.forEach(function (mesh, i) {
                  if (mesh.userData.isComet) {
                    // Kepler's second law approx (faster near perihelion)
                    var angularSpeed = mesh._speedScale * (1 / (1 - mesh._e * Math.cos(mesh._orbitAngle)));
                    mesh._orbitAngle += timeScale * angularSpeed;
                    const r = mesh._a * (1 - mesh._e * mesh._e) / (1 + mesh._e * Math.cos(mesh._orbitAngle));
                    mesh.position.x = Math.cos(mesh._orbitAngle) * r - (mesh._a * mesh._e);
                    mesh.position.z = Math.sin(mesh._orbitAngle) * r;
                    mesh.rotation.y += 0.1;
                    
                    // Update comet tail
                    if (mesh._tail) {
                       const tArr = mesh._tail.geometry.attributes.position.array;
                       // shift old positions back
                       for(let t=49; t>0; t--) {
                         tArr[t*3] = tArr[(t-1)*3]; tArr[t*3+1] = tArr[(t-1)*3+1]; tArr[t*3+2] = tArr[(t-1)*3+2];
                       }
                       // add new head position, offset slightly away from sun
                       const dirX = mesh.position.x; const dirZ = mesh.position.z;
                       const dist = Math.sqrt(dirX*dirX + dirZ*dirZ);
                       tArr[0] = mesh.position.x + (dirX/dist)*0.5 + (Math.random()-0.5)*0.2;
                       tArr[1] = (Math.random()-0.5)*0.2;
                       tArr[2] = mesh.position.z + (dirZ/dist)*0.5 + (Math.random()-0.5)*0.2;
                       mesh._tail.geometry.attributes.position.needsUpdate = true;
                    }
                    return;
                  }

                  mesh._orbitAngle += timeScale * mesh._orbitSpeed;

                  mesh.position.x = Math.cos(mesh._orbitAngle) * mesh._orbitDist;

                  mesh.position.z = Math.sin(mesh._orbitAngle) * mesh._orbitDist;

                  mesh.rotation.y += 0.02 * speed * (isPaused ? 0 : 1);
                  
                  if (mesh._moonObj && !isPaused) {
                    mesh._moonObj._orbitAngle += 0.05 * speed;
                    mesh._moonObj.position.x = Math.cos(mesh._moonObj._orbitAngle) * mesh._moonObj._dist;
                    mesh._moonObj.position.z = Math.sin(mesh._moonObj._orbitAngle) * mesh._moonObj._dist;
                  }
                  if (mesh._moons && !isPaused) {
                    mesh._moons.forEach(jm => {
                      jm._orbitAngle += 0.03 * jm._speed * speed;
                      jm.position.x = Math.cos(jm._orbitAngle) * jm._dist;
                      jm.position.z = Math.sin(jm._orbitAngle) * jm._dist;
                    });
                  }

                });



                // â”€â”€ Handle camera reset signal from Reset View button â”€â”€

                if (canvas.dataset.resetCamera === 'true') {

                  canvas.dataset.resetCamera = '';

                  focusedPlanetIdx = -1;

                  targetLookAt.set(0, 0, 0);

                  targetDist = 55;

                  camPhi = 1.0;

                  camTheta = 0.5;

                }



                // â”€â”€ Smooth camera tracking â”€â”€

                // If focused on a planet, update targetLookAt to follow it as it orbits

                if (focusedPlanetIdx >= 0 && focusedPlanetIdx < planetMeshes.length) {

                  var fp = planetMeshes[focusedPlanetIdx];

                  targetLookAt.copy(fp.position);

                }

                // Smoothly interpolate camera toward target

                currentLookAt.lerp(targetLookAt, cameraLerp);

                currentDist += (targetDist - currentDist) * cameraLerp;

                updateCamera();



                // Slowly rotate asteroids

                const aArr = asteroidGeo.attributes.position.array;

                if (!isPaused) {

                  for (let i = 0; i < asteroidCount; i++) {

                    const x = aArr[i * 3]; const z = aArr[i * 3 + 2];

                    const a = Math.atan2(z, x) + 0.0003 * speed;

                    const r = Math.sqrt(x * x + z * z);

                    aArr[i * 3] = Math.cos(a) * r;

                    aArr[i * 3 + 2] = Math.sin(a) * r;

                  }

                  asteroidGeo.attributes.position.needsUpdate = true;

                }



                // Sun pulse

                const pulse = 1.0 + Math.sin(time * 2) * 0.03;

                sun.scale.set(pulse, pulse, pulse);

                glowSprite.scale.set(12 * pulse, 12 * pulse, 1);



                // Update labels

                if (labelContainer) {

                  labelContainer.innerHTML = '';

                  planetMeshes.forEach(function (mesh) {

                    const pos = mesh.position.clone();

                    pos.y += mesh.geometry.parameters.radius + 0.4;

                    pos.project(camera);

                    if (pos.z < 1 && pos.z > -1) {

                      const lx = (pos.x * 0.5 + 0.5) * W;

                      const ly = (-pos.y * 0.5 + 0.5) * H;

                      const isSelected = canvas.dataset.selected === mesh.userData.name;

                      const label = document.createElement('div');

                      label.style.cssText = 'position:absolute;left:' + lx + 'px;top:' + ly + 'px;transform:translate(-50%,-100%);font-size:9px;font-weight:700;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.8);color:' + (isSelected ? '#fbbf24' : '#94a3b8') + ';white-space:nowrap;transition:color 0.2s;';

                      label.textContent = mesh.userData.name;

                      labelContainer.appendChild(label);

                    }

                  });

                }

                // HUD telemetry update
                var telemetryEl = canvas.parentElement.querySelector('.solar-telemetry');
                if (telemetryEl) {
                  var days = (time / (Math.PI * 2)) * 365.25;
                  var html = '<b>Time Elapsed:</b> ' + Math.floor(days) + ' Earth days<br/>';
                  if (focusedPlanetIdx >= 0 && planetMeshes[focusedPlanetIdx] && !planetMeshes[focusedPlanetIdx].userData.isComet) {
                     var fd = planetMeshes[focusedPlanetIdx].position.length();
                     var au = (fd / 14).toFixed(2); // Earth is at dist=14
                     html += '<b>Dist from Sun:</b> ' + au + ' AU<br/>';
                  } else if (focusedPlanetIdx >= 0 && planetMeshes[focusedPlanetIdx] && planetMeshes[focusedPlanetIdx].userData.isComet) {
                     var fd = planetMeshes[focusedPlanetIdx].position.length();
                     var au = (fd / 14).toFixed(2);
                     html += '<b>Dist from Sun:</b> ' + au + ' AU<br/>';
                  }
                  telemetryEl.innerHTML = html;
                }

                renderer.render(scene, camera);

              }

              animate();



              // â”€â”€ Resize handler â”€â”€

              const resizeObserver = new ResizeObserver(function () {

                const w = canvas.clientWidth; const h = canvas.clientHeight;

                if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }

              });

              resizeObserver.observe(canvas);



              // â”€â”€ Cleanup â”€â”€

              canvas._solarCleanup = function () {

                cancelAnimationFrame(animId);

                canvas.removeEventListener('pointerdown', onSolarDown);

                canvas.removeEventListener('pointermove', onSolarMove);

                canvas.removeEventListener('pointerup', onSolarUp);

                canvas.removeEventListener('wheel', onSolarWheel);

                canvas.removeEventListener('click', onSolarClick);

                canvas.removeEventListener('dblclick', onSolarDblClick);

                resizeObserver.disconnect();

                renderer.dispose();

                scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });

              };

            }



            // Load Three.js or use existing

            if (window.THREE) {

              initScene(window.THREE);

            } else {

              const s = document.createElement('script');

              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

              s.onload = function () { initScene(window.THREE); };

              document.head.appendChild(s);

            }

          };



          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF0D Solar System Explorer"),

              React.createElement("span", { className: "px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full ml-1" }, "3D")

            ),

            // 3D Canvas container

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-indigo-800/50 shadow-lg", style: { background: '#0a0e27' } },

              React.createElement("canvas", {

                ref: canvasRef,

                className: "solar3d-canvas w-full",

                style: { height: '520px', display: 'block', cursor: 'grab' },

                'data-speed': String(simSpeed),

                'data-paused': String(paused),

                'data-selected': d.selectedPlanet || ''

              }),

              // Floating planet labels

              React.createElement("div", { className: "solar-labels", style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' } }),
              React.createElement("div", { className: "solar-telemetry", style: { position: 'absolute', top: '10px', left: '10px', color: '#60a5fa', background: 'rgba(0,0,0,0.6)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', pointerEvents: 'none', border: '1px solid #1e3a8a', zIndex: 10 } }),

              // Controls overlay

              React.createElement("div", { className: "absolute bottom-3 left-3 right-3 flex items-center gap-2 pointer-events-auto" },

                React.createElement("button", {

                  onClick: () => upd('paused', !paused),

                  className: "px-2.5 py-1 rounded-lg text-xs font-bold " + (paused ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20') + " backdrop-blur-sm border border-white/10 transition-all"

                }, paused ? "\u25B6 Play" : "\u23F8 Pause"),

                React.createElement("div", { className: "flex items-center gap-1.5 flex-1 max-w-[180px] bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/10" },

                  React.createElement("span", { className: "text-[9px] text-white/60 font-bold whitespace-nowrap" }, "Speed"),

                  React.createElement("input", { type: "range", min: "0.1", max: "10", step: "0.1", value: simSpeed, 'aria-label': 'Simulation speed', onChange: e => upd('simSpeed', parseFloat(e.target.value)), className: "flex-1 accent-indigo-400", style: { height: '12px' } }),

                  React.createElement("span", { className: "text-[10px] text-indigo-300 font-bold min-w-[28px] text-right" }, simSpeed.toFixed(1) + "x")

                ),

                React.createElement("button", {

                  onClick: () => { upd('selectedPlanet', null); const c = document.querySelector('.solar3d-canvas'); if (c) { c.dataset.resetCamera = 'true'; } },

                  className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all"

                }, "\uD83C\uDFE0 Reset View"),

                React.createElement("span", { className: "text-[9px] text-white/40 ml-auto hidden sm:inline" }, "Drag to orbit \u2022 Scroll to zoom \u2022 Click a planet")

              )

            ),

            // Planet buttons row

            React.createElement("div", { className: "flex gap-1 mt-2 flex-wrap justify-center" },

              PLANETS.map(p => React.createElement("button", {

                key: p.name,

                onClick: () => upd('selectedPlanet', p.name),

                className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.selectedPlanet === p.name ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),

                style: d.selectedPlanet === p.name ? { backgroundColor: p.color } : {}

              }, p.emoji + " " + p.name))

            ),

            // â”€â”€ Scale Explanation Collapsible â”€â”€

            React.createElement("details", { className: "mt-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden" },

              React.createElement("summary", { className: "px-3 py-1.5 text-[11px] font-bold text-amber-700 cursor-pointer select-none hover:bg-amber-100/50 transition-colors" }, "\uD83D\uDD2D Why aren't the sizes truly to scale?"),

              React.createElement("div", { className: "px-3 pb-3 text-[10px] text-amber-800 leading-relaxed" },

                React.createElement("p", { className: "mb-2" }, "If this model were truly to scale, the Sun would be a beach ball and Earth would be a grain of sand 30 meters away! Jupiter would be a marble 155 meters away, and Pluto would be invisible 1.2 km from the Sun."),

                React.createElement("div", { className: "grid grid-cols-3 gap-1.5 mb-2" },

                  [

                    { body: '\u2600\uFE0F Sun', real: '1,391,000 km', scale: '109\u00D7 Earth' },

                    { body: '\uD83E\uDE90 Jupiter', real: '139,820 km', scale: '11.2\u00D7 Earth' },

                    { body: '\uD83C\uDF0D Earth', real: '12,742 km', scale: '1\u00D7 (baseline)' },

                    { body: '\uD83D\uDD35 Neptune', real: '49,244 km', scale: '3.9\u00D7 Earth' },

                    { body: '\uD83D\uDD34 Mars', real: '6,779 km', scale: '0.53\u00D7 Earth' },

                    { body: '\u2B50 Pluto', real: '2,377 km', scale: '0.19\u00D7 Earth' }

                  ].map(function (item) {

                    return React.createElement("div", { key: item.body, className: "bg-white/60 rounded-lg p-1.5 text-center border border-amber-100" },

                      React.createElement("div", { className: "font-bold" }, item.body),

                      React.createElement("div", { className: "text-amber-600" }, item.real),

                      React.createElement("div", { className: "text-amber-500 italic" }, item.scale)

                    );

                  })

                ),

                React.createElement("p", { className: "italic text-amber-600" }, "\uD83D\uDCA1 The solar system is 99.86% empty space! Our model compresses distances so you can explore everything in one view.")

              )

            ),

            // â”€â”€ Planet Info Card (Enhanced with Close-Up & Drone) â”€â”€

            sel && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-in slide-in-from-bottom duration-300" },

              // Planet header

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("div", { className: "w-12 h-12 rounded-xl flex items-center justify-center text-2xl", style: { backgroundColor: sel.color + '20', border: '2px solid ' + sel.color } }, sel.emoji),

                React.createElement("div", { className: "flex-1" },

                  React.createElement("h4", { className: "text-lg font-black text-slate-800" }, sel.name),

                  React.createElement("p", { className: "text-xs text-slate-500" }, sel.diameter + " \u2022 " + sel.moons + " moon" + (sel.moons !== 1 ? 's' : '') + " \u2022 " + (sel.gravity || '?'))

                ),

                // Mode tabs

                React.createElement("div", { className: "flex gap-1" },

                  ['overview', 'surface', 'drone'].map(function (tab) {

                    var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';

                    return React.createElement("button", {

                      key: tab, onClick: function () { upd('viewTab', tab); },

                      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all " +

                        ((d.viewTab || 'overview') === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300')

                    }, tab === 'overview' ? '\uD83D\uDCCA Overview' : tab === 'surface' ? '\u26C5 Surface' : (isGas ? '\uD83D\uDEF8 Probe' : '\uD83D\uDE97 Rover'));

                  })

                )

              ),



              // â”€â”€ OVERVIEW TAB â”€â”€

              (d.viewTab || 'overview') === 'overview' && React.createElement("div", null,

                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },

                  [['\uD83C\uDF21', 'Temp', sel.temp], ['\u2600', 'Day', sel.dayLen], ['\uD83C\uDF0D', 'Year', sel.yearLen], ['\uD83D\uDCCF', 'Size', sel.diameter],

                  ['\u2696\uFE0F', 'Gravity', sel.gravity || 'Unknown'], ['\uD83C\uDF11', 'Moons', String(sel.moons)], ['\uD83C\uDF2C', 'Atmosphere', (sel.atmosphere || 'Unknown').substring(0, 30)], ['\uD83D\uDCA0', 'Type', sel.terrainType === 'gasgiant' ? 'Gas Giant' : sel.terrainType === 'icegiant' ? 'Ice Giant' : 'Rocky']

                  ].map(function (item) {

                    return React.createElement("div", { key: item[1], className: "bg-white rounded-lg p-2 text-center border" },

                      React.createElement("p", { className: "text-[10px] text-slate-500 font-bold" }, item[0] + ' ' + item[1]),

                      React.createElement("p", { className: "text-xs font-bold text-slate-700" }, item[2])

                    );

                  })

                ),

                React.createElement("p", { className: "text-sm text-slate-600 italic bg-indigo-50 rounded-lg p-2 border border-indigo-100 mb-2" }, "\uD83D\uDCA1 " + sel.fact),

                sel.surfaceDesc && React.createElement("div", { className: "bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-2 border border-sky-200 mb-2" },

                  React.createElement("p", { className: "text-[11px] font-bold text-sky-700 mb-0.5" }, "\uD83C\uDF0D Surface Description"),

                  React.createElement("p", { className: "text-[10px] text-sky-600 leading-relaxed" }, sel.surfaceDesc),

                ),

                sel.notableFeatures && sel.notableFeatures.length > 0 && React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-2 border border-violet-200 mb-2" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700 mb-1" }, "\uD83C\uDFAF Notable Features"),

                  React.createElement("div", { className: "grid grid-cols-1 gap-1" },

                    sel.notableFeatures.map(function (feat, fi) {

                      return React.createElement("div", { key: fi, className: "flex items-center gap-1.5 text-[10px] text-violet-600" },

                        React.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" }),

                        React.createElement("span", null, feat)

                      );

                    })

                  )

                ),

                // Notable features

                sel.notableFeatures && React.createElement("div", { className: "bg-white rounded-lg p-3 border" },

                  React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1.5" }, "\u2B50 Notable Features"),

                  React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                    sel.notableFeatures.map(function (feat, i) {

                      return React.createElement("span", { key: i, className: "px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100" }, feat);

                    })

                  )

                )

              ),



              // â”€â”€ SURFACE TAB â”€â”€

              (d.viewTab) === 'surface' && React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("span", { className: "text-lg" }, "\uD83C\uDF0D"),

                    React.createElement("h5", { className: "font-bold text-sm" }, sel.name + " Surface Conditions")

                  ),

                  React.createElement("p", { className: "text-xs text-slate-300 leading-relaxed mb-3" }, sel.surfaceDesc || 'Surface data unavailable.'),

                  React.createElement("div", { className: "grid grid-cols-3 gap-2" },

                    [

                      ['\u2696\uFE0F Gravity', sel.gravity || '?'],

                      ['\uD83C\uDF21 Temperature', sel.temp],

                      ['\uD83C\uDF2C\uFE0F Atmosphere', (sel.atmosphere || 'None').split(' â€”')[0]]

                    ].map(function (item) {

                      return React.createElement("div", { key: item[0], className: "bg-white/10 rounded-lg p-2 text-center backdrop-blur-sm" },

                        React.createElement("p", { className: "text-[9px] text-slate-500" }, item[0]),

                        React.createElement("p", { className: "text-xs font-bold" }, item[1])

                      );

                    })

                  )

                ),

                // â”€â”€ 2D Planet Surface Canvas â”€â”€

                React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 shadow-xl", style: { height: '350px', borderColor: sel.color + '60' } },

                  React.createElement("canvas", {

                    "data-surface-canvas": "true",

                    style: { width: '100%', height: '100%', display: 'block' },

                    ref: function (cvEl) {

                      if (!cvEl || cvEl._surfInit === sel.name) return;

                      cvEl._surfInit = sel.name;

                      var ctx = cvEl.getContext('2d');

                      var W = cvEl.offsetWidth || 600, H = cvEl.offsetHeight || 350;

                      cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);

                      var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';

                      var tick = 0;

                      function drawPlanet() {

                        tick++;

                        ctx.clearRect(0, 0, W, H);

                        // Space background

                        var bgGrad = ctx.createLinearGradient(0, 0, 0, H);

                        bgGrad.addColorStop(0, '#020210');

                        bgGrad.addColorStop(1, '#0a0a2e');

                        ctx.fillStyle = bgGrad;

                        ctx.fillRect(0, 0, W, H);

                        // Stars

                        for (var si = 0; si < 120; si++) {

                          var sx = ((si * 137 + 29) % W);

                          var sy = ((si * 211 + 17) % H);

                          var sb = 0.15 + 0.25 * Math.sin(tick * 0.015 + si * 0.7);

                          ctx.globalAlpha = sb;

                          ctx.fillStyle = '#fff';

                          ctx.beginPath();

                          ctx.arc(sx, sy, si % 3 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);

                          ctx.fill();

                        }

                        ctx.globalAlpha = 1;

                        // Planet

                        var cx = W * 0.5, cy = H * 0.5;

                        var planetR = Math.min(W, H) * 0.38;

                        // Atmosphere glow

                        var glowGrad = ctx.createRadialGradient(cx, cy, planetR * 0.9, cx, cy, planetR * 1.4);

                        glowGrad.addColorStop(0, sel.color + '40');

                        glowGrad.addColorStop(1, 'transparent');

                        ctx.fillStyle = glowGrad;

                        ctx.fillRect(0, 0, W, H);

                        // Planet body

                        ctx.save();

                        ctx.beginPath();

                        ctx.arc(cx, cy, planetR, 0, Math.PI * 2);

                        ctx.clip();

                        // Base gradient

                        var bodyGrad = ctx.createLinearGradient(cx - planetR, cy - planetR, cx + planetR, cy + planetR);

                        bodyGrad.addColorStop(0, sel.color);

                        var darkerColor = sel.color.length >= 7 ? '#' + Math.max(0, parseInt(sel.color.slice(1, 3), 16) - 60).toString(16).padStart(2, '0') + Math.max(0, parseInt(sel.color.slice(3, 5), 16) - 60).toString(16).padStart(2, '0') + Math.max(0, parseInt(sel.color.slice(5, 7), 16) - 60).toString(16).padStart(2, '0') : sel.color;

                        bodyGrad.addColorStop(1, darkerColor);

                        ctx.fillStyle = bodyGrad;

                        ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);

                        // Surface features (bands for gas, craters for rocky)

                        if (isGas) {

                          for (var bi = 0; bi < 8; bi++) {

                            var by = cy - planetR + (bi + 0.5) * (planetR * 2 / 8);

                            var wave = Math.sin(tick * 0.01 + bi * 1.5) * 4;

                            ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + 0.03 * Math.sin(bi * 2.1)) + ')';

                            ctx.fillRect(cx - planetR, by + wave - 6, planetR * 2, 12);

                          }

                          // Storm spot

                          ctx.fillStyle = 'rgba(200,100,50,0.25)';

                          var spotX = cx + Math.cos(tick * 0.005) * planetR * 0.3;

                          var spotY = cy + planetR * 0.15;

                          ctx.beginPath();

                          ctx.ellipse(spotX, spotY, planetR * 0.18, planetR * 0.09, 0.1, 0, Math.PI * 2);

                          ctx.fill();

                        } else {

                          // Rocky planet: craters

                          for (var ci = 0; ci < 15; ci++) {

                            var crx = cx + ((ci * 97 + 31) % Math.floor(planetR * 1.6)) - planetR * 0.8;

                            var cry = cy + ((ci * 73 + 17) % Math.floor(planetR * 1.4)) - planetR * 0.7;

                            var crr = 3 + (ci % 5) * 4;

                            if (Math.sqrt((crx - cx) * (crx - cx) + (cry - cy) * (cry - cy)) + crr < planetR) {

                              ctx.fillStyle = 'rgba(0,0,0,0.08)';

                              ctx.beginPath();

                              ctx.arc(crx, cry, crr, 0, Math.PI * 2);

                              ctx.fill();

                              ctx.strokeStyle = 'rgba(255,255,255,0.06)';

                              ctx.lineWidth = 0.5;

                              ctx.beginPath();

                              ctx.arc(crx - 1, cry - 1, crr, 0, Math.PI * 2);

                              ctx.stroke();

                            }

                          }

                        }

                        // Lighting: shadow on right side

                        var shadowGrad = ctx.createLinearGradient(cx - planetR, cy, cx + planetR, cy);

                        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');

                        shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0)');

                        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.5)');

                        ctx.fillStyle = shadowGrad;

                        ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);

                        // Specular highlight

                        var specGrad = ctx.createRadialGradient(cx - planetR * 0.3, cy - planetR * 0.3, 0, cx - planetR * 0.3, cy - planetR * 0.3, planetR * 0.8);

                        specGrad.addColorStop(0, 'rgba(255,255,255,0.15)');

                        specGrad.addColorStop(1, 'rgba(255,255,255,0)');

                        ctx.fillStyle = specGrad;

                        ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);

                        ctx.restore();

                        // Planet name label

                        ctx.fillStyle = '#fff';

                        ctx.font = 'bold 14px system-ui, sans-serif';

                        ctx.textAlign = 'center';

                        ctx.fillText(sel.emoji + ' ' + sel.name, cx, H - 20);

                        ctx.font = '10px system-ui, sans-serif';

                        ctx.fillStyle = '#94a3b8';

                        ctx.fillText(sel.diameter + ' \u2022 ' + (sel.gravity || '?'), cx, H - 6);

                        // === ENHANCED: Orbiting moons ===
                        var moonCount = Math.min(sel.moons, 6); // show up to 6 moons
                        if (moonCount > 0) {
                          for (var mi = 0; mi < moonCount; mi++) {
                            var moonOrbitR = planetR * 1.3 + mi * 18;
                            var moonAngle = tick * (0.008 + mi * 0.003) + mi * (Math.PI * 2 / moonCount);
                            var mx = cx + Math.cos(moonAngle) * moonOrbitR;
                            var my = cy + Math.sin(moonAngle) * moonOrbitR * 0.35; // elliptical
                            var moonR = 2.5 + (mi === 0 ? 2 : 0); // largest moon is bigger
                            // orbit path
                            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                            ctx.lineWidth = 0.5;
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, moonOrbitR, moonOrbitR * 0.35, 0, 0, Math.PI * 2);
                            ctx.stroke();
                            // moon body
                            var moonGrad = ctx.createRadialGradient(mx - 1, my - 1, 0, mx, my, moonR);
                            moonGrad.addColorStop(0, '#e2e8f0');
                            moonGrad.addColorStop(1, '#64748b');
                            ctx.fillStyle = moonGrad;
                            ctx.beginPath();
                            ctx.arc(mx, my, moonR, 0, Math.PI * 2);
                            ctx.fill();
                          }
                        }

                        // === ENHANCED: Saturn rings in surface view ===
                        if (sel.hasRings) {
                          ctx.save();
                          ctx.globalAlpha = 0.5;
                          ctx.strokeStyle = '#eab30880';
                          ctx.lineWidth = 2;
                          for (var ri = 0; ri < 4; ri++) {
                            ctx.beginPath();
                            ctx.ellipse(cx, cy, planetR * 1.15 + ri * 6, planetR * 0.2 + ri * 1.5, -0.15, 0, Math.PI * 2);
                            ctx.stroke();
                          }
                          ctx.restore();
                        }

                        // === ENHANCED: Earth-specific features ===
                        if (sel.terrainType === 'earthlike') {
                          // Swirling cloud wisps
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          ctx.globalAlpha = 0.15;
                          ctx.fillStyle = '#ffffff';
                          for (var wi = 0; wi < 5; wi++) {
                            var wx = cx + Math.cos(tick * 0.003 + wi * 1.3) * planetR * 0.6;
                            var wy = cy - planetR * 0.3 + wi * planetR * 0.15;
                            ctx.beginPath();
                            ctx.ellipse(wx, wy, planetR * 0.35, 5, tick * 0.002 + wi, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          ctx.restore();
                        }

                        // === ENHANCED: Polar ice caps for rocky planets ===
                        if (!isGas && sel.terrainType !== 'volcanic') {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          ctx.globalAlpha = 0.2;
                          ctx.fillStyle = '#e2e8f0';
                          // north cap
                          ctx.beginPath();
                          ctx.ellipse(cx, cy - planetR + 8, planetR * 0.5, 10, 0, 0, Math.PI * 2);
                          ctx.fill();
                          // south cap
                          ctx.beginPath();
                          ctx.ellipse(cx, cy + planetR - 8, planetR * 0.4, 8, 0, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.restore();
                        }

                        // === ENHANCED: Atmosphere layers glow ===
                        if (sel.atmosphere && sel.atmosphere !== 'Virtually none') {
                          for (var ai = 0; ai < 3; ai++) {
                            var atmoR = planetR * (1.05 + ai * 0.06);
                            var atmoGrad2 = ctx.createRadialGradient(cx, cy, atmoR * 0.95, cx, cy, atmoR);
                            atmoGrad2.addColorStop(0, 'transparent');
                            atmoGrad2.addColorStop(0.5, sel.color + (ai === 0 ? '18' : '0a'));
                            atmoGrad2.addColorStop(1, 'transparent');
                            ctx.fillStyle = atmoGrad2;
                            ctx.beginPath();
                            ctx.arc(cx, cy, atmoR, 0, Math.PI * 2);
                            ctx.fill();
                          }
                        }

                        // === ENHANCED: Gas giant deep bands with turbulence ===
                        if (isGas) {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          // turbulent eddies
                          ctx.globalAlpha = 0.08;
                          for (var ei = 0; ei < 12; ei++) {
                            var ex = cx + ((ei * 67 + 13) % Math.floor(planetR * 1.6)) - planetR * 0.8;
                            var ey = cy + ((ei * 43 + 7) % Math.floor(planetR * 1.4)) - planetR * 0.7;
                            var eAngle = tick * 0.003 + ei * 0.5;
                            ctx.fillStyle = ei % 2 === 0 ? '#ffffff' : sel.color;
                            ctx.beginPath();
                            ctx.ellipse(ex, ey, 8 + ei % 4 * 3, 5 + ei % 3 * 2, eAngle, 0, Math.PI * 2);
                            ctx.fill();
                          }
                          ctx.restore();
                        }

                        // === ENHANCED: Lightning flashes on gas giants ===
                        if (isGas && tick % 120 < 3) {
                          ctx.save();
                          ctx.beginPath();
                          ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                          ctx.clip();
                          var lx = cx + (Math.sin(tick * 0.1) * planetR * 0.5);
                          var ly = cy + (Math.cos(tick * 0.07) * planetR * 0.3);
                          ctx.globalAlpha = 0.6 - (tick % 120) * 0.2;
                          var flashGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, planetR * 0.15);
                          flashGrad.addColorStop(0, '#ffffff');
                          flashGrad.addColorStop(0.5, '#e0e7ff40');
                          flashGrad.addColorStop(1, 'transparent');
                          ctx.fillStyle = flashGrad;
                          ctx.fillRect(lx - planetR * 0.15, ly - planetR * 0.15, planetR * 0.3, planetR * 0.3);
                          ctx.restore();
                        }

                        // === ENHANCED: Shooting stars / meteorites on airless worlds ===
                        if (sel.atmosphere === 'Virtually none' || sel.terrainType === 'iceworld' || sel.terrainType === 'cratered') {
                          if (tick % 90 < 5) {
                            var metX = W * 0.2 + (tick * 7 % (W * 0.6));
                            var metY = H * 0.05 + (tick * 3 % (H * 0.15));
                            var metLen = 30 + tick % 20;
                            ctx.globalAlpha = 0.7 - (tick % 90) * 0.14;
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(metX, metY);
                            ctx.lineTo(metX + metLen, metY + metLen * 0.4);
                            ctx.stroke();
                            // bright head
                            ctx.fillStyle = '#fef3c7';
                            ctx.beginPath();
                            ctx.arc(metX + metLen, metY + metLen * 0.4, 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                          }
                        }

                        // === ENHANCED: Terminator line (day/night boundary) ===
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
                        ctx.clip();
                        var termX = cx + Math.sin(tick * 0.002) * planetR * 0.8;
                        var termGrad = ctx.createLinearGradient(termX - planetR * 0.3, cy, termX + planetR * 0.3, cy);
                        termGrad.addColorStop(0, 'rgba(0,0,0,0)');
                        termGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
                        termGrad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = termGrad;
                        ctx.fillRect(cx - planetR, cy - planetR, planetR * 2, planetR * 2);
                        ctx.restore();

                        requestAnimationFrame(drawPlanet);

                      }

                      drawPlanet();

                      var ro = new ResizeObserver(function () {

                        W = cvEl.offsetWidth || 600; H = cvEl.offsetHeight || 350;

                        cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);

                      });

                      ro.observe(cvEl);

                    }

                  })

                ),



                React.createElement("button", {

                  onClick: function () { upd('viewTab', 'drone'); addMissionEntry('\uD83D\uDE80 Deployed ' + (sel && (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant') ? 'atmospheric probe' : 'rover') + ' on ' + (sel ? sel.name : 'planet')); },

                  className: "w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all hover:scale-[1.01]"

                }, (sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant' ? "\uD83D\uDEF8 Launch Atmospheric Probe on " : "\uD83D\uDE97 Deploy Rover on ") + sel.name)

              ),



              // â”€â”€ ROVER / PROBE TAB (Three.js First-Person) â”€â”€

              (d.viewTab) === 'drone' && React.createElement("div", { id: "drone-fullscreen-container" },

                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-purple-300 shadow-lg", style: { height: '450px' } },

                  React.createElement("canvas", {

                    "data-drone-canvas": "true",

                    style: { width: '100%', height: '100%', display: 'block', cursor: 'crosshair' },

                    ref: function (canvasEl) {

                      if (!canvasEl || canvasEl._droneInit === sel.name) return;

                      canvasEl._droneInit = sel.name;



                      function doInit(THREE) {

                        var W = canvasEl.clientWidth || canvasEl.offsetWidth || canvasEl.parentElement.clientWidth || 900, H = canvasEl.clientHeight || canvasEl.offsetHeight || canvasEl.parentElement.clientHeight || 450;

                        var scene = new THREE.Scene();

                        var isGas = sel.terrainType === 'gasgiant' || sel.terrainType === 'icegiant';

                        var camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 500);

                        camera.position.set(0, isGas ? 5 : 1.6, 0);

                        var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });

                        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(W, H);

                        renderer.setClearColor(new THREE.Color(sel.skyColor || '#000000'));



                        // â”€â”€ Sky dome â”€â”€

                        var skyGeo = new THREE.SphereGeometry(200, 32, 16);

                        var skyCv = document.createElement('canvas'); skyCv.width = 512; skyCv.height = 256;

                        var sCtx = skyCv.getContext('2d');

                        var sGrad = sCtx.createLinearGradient(0, 0, 0, 256);

                        sGrad.addColorStop(0, sel.skyColor || '#000');

                        sGrad.addColorStop(0.5, sel.terrainType === 'earthlike' ? '#87ceeb' : sel.terrainType === 'volcanic' ? '#d4923a' : sel.skyColor || '#111');

                        sGrad.addColorStop(1, sel.terrainColor || '#333');

                        sCtx.fillStyle = sGrad; sCtx.fillRect(0, 0, 512, 256);

                        // Stars for dark worlds

                        if (sel.terrainType === 'cratered' || sel.terrainType === 'iceworld' || sel.terrainType === 'desert') {

                          for (var si = 0; si < 200; si++) {

                            sCtx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')';

                            sCtx.beginPath(); sCtx.arc(Math.random() * 512, Math.random() * 128, Math.random() * 1.5, 0, Math.PI * 2); sCtx.fill();

                          }

                        }

                        var skyTex = new THREE.CanvasTexture(skyCv);

                        var skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });

                        scene.add(new THREE.Mesh(skyGeo, skyMat));



                        // â”€â”€ Terrain (rocky planets) or Cloud layers (gas giants) â”€â”€

                        if (!isGas) {

                          var terrainGeo = new THREE.PlaneGeometry(200, 200, 100, 100);

                          var posArr = terrainGeo.attributes.position.array;

                          for (var vi = 0; vi < posArr.length; vi += 3) {

                            var px = posArr[vi], py = posArr[vi + 1];

                            var h = Math.sin(px * 0.05) * 3 + Math.sin(py * 0.08) * 2 + Math.sin(px * 0.15 + py * 0.1) * 1;

                            if (sel.terrainType === 'volcanic') h = Math.abs(Math.sin(px * 0.04) * 5) + Math.random() * 0.5;

                            if (sel.terrainType === 'earthlike') h = Math.sin(px * 0.03) * 2 + Math.sin(py * 0.05) * 1.5 + Math.random() * 0.3;

                            if (sel.terrainType === 'desert') h = Math.sin(px * 0.06) * 1.5 + Math.random() * 0.2;

                            if (sel.terrainType === 'iceworld') h = Math.sin(px * 0.04 + py * 0.03) * 1 + Math.random() * 0.15;

                            posArr[vi + 2] = h;

                          }

                          terrainGeo.computeVertexNormals();

                          var tCv = document.createElement('canvas'); tCv.width = 256; tCv.height = 256;

                          var tCx = tCv.getContext('2d');

                          var baseC = new THREE.Color(sel.terrainColor || '#886644');

                          for (var ty = 0; ty < 256; ty++) {

                            for (var tx = 0; tx < 256; tx++) {

                              var n = (Math.sin(tx * 0.3 + ty * 0.2) * 0.5 + Math.random() * 0.3) * 0.15;

                              var r = Math.min(255, Math.max(0, Math.round((baseC.r + n) * 255)));

                              var g = Math.min(255, Math.max(0, Math.round((baseC.g + n * 0.8) * 255)));

                              var b = Math.min(255, Math.max(0, Math.round((baseC.b - n * 0.3) * 255)));

                              tCx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';

                              tCx.fillRect(tx, ty, 1, 1);

                            }

                          }

                          var terrainTex = new THREE.CanvasTexture(tCv);

                          terrainTex.wrapS = terrainTex.wrapT = THREE.RepeatWrapping; terrainTex.repeat.set(10, 10);

                          var terrainMat = new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.9, metalness: 0.1, flatShading: true });

                          var terrain = new THREE.Mesh(terrainGeo, terrainMat);

                          terrain.rotation.x = -Math.PI / 2; scene.add(terrain);

                        } else {

                          // Gas giant cloud layers

                          for (var cl = 0; cl < 5; cl++) {

                            var clGeo = new THREE.PlaneGeometry(300, 300, 1, 1);

                            var clCv = document.createElement('canvas'); clCv.width = 256; clCv.height = 64;

                            var clCx = clCv.getContext('2d');

                            for (var cy = 0; cy < 64; cy++) {

                              var band = Math.sin(cy * 0.3 + cl * 2) * 0.5 + 0.5;

                              var r2 = Math.round(new THREE.Color(sel.terrainColor).r * 255 * (0.7 + band * 0.3));

                              var g2 = Math.round(new THREE.Color(sel.terrainColor).g * 255 * (0.7 + band * 0.3));

                              var b2 = Math.round(new THREE.Color(sel.terrainColor).b * 255 * (0.8 + band * 0.2));

                              for (var cx2 = 0; cx2 < 256; cx2++) {

                                var turb = Math.sin(cx2 * 0.05 + cy * 0.1 + cl) * 20;

                                clCx.fillStyle = 'rgb(' + Math.max(0, r2 + turb) + ',' + Math.max(0, g2 + turb * 0.7) + ',' + Math.max(0, b2 + turb * 0.3) + ')';

                                clCx.fillRect(cx2, cy, 1, 1);

                              }

                            }

                            var clTex = new THREE.CanvasTexture(clCv); clTex.wrapS = THREE.RepeatWrapping; clTex.repeat.set(3, 1);

                            var clMat = new THREE.MeshBasicMaterial({ map: clTex, transparent: true, opacity: 0.6 - cl * 0.1, side: THREE.DoubleSide });

                            var clMesh = new THREE.Mesh(clGeo, clMat);

                            clMesh.rotation.x = -Math.PI / 2; clMesh.position.y = -2 - cl * 4;

                            clMesh._cloudSpeed = 0.01 + cl * 0.005;

                            scene.add(clMesh);

                          }

                        }



                        // â”€â”€ Lighting â”€â”€

                        scene.add(new THREE.AmbientLight(0x444466, 0.6));

                        var sunDir = new THREE.DirectionalLight(0xffeedd, sel.terrainType === 'iceworld' ? 0.3 : 1.0);

                        sunDir.position.set(50, 30, 20); scene.add(sunDir);



                        // â”€â”€ 3D Rover / Probe Model â”€â”€

                        var roverGroup = new THREE.Group();

                        if (!isGas) {

                          // Rocky planet: build a simple rover out of boxes and cylinders

                          // Body

                          var bodyGeo = new THREE.BoxGeometry(0.8, 0.35, 1.2);

                          var bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 });

                          var body = new THREE.Mesh(bodyGeo, bodyMat);

                          body.position.y = 0.35;

                          roverGroup.add(body);

                          // Camera mast

                          var mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);

                          var mastMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7 });

                          var mast = new THREE.Mesh(mastGeo, mastMat);

                          mast.position.set(0, 0.77, -0.3);

                          roverGroup.add(mast);

                          // Camera head

                          var headGeo = new THREE.BoxGeometry(0.2, 0.12, 0.15);

                          var headMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });

                          var head = new THREE.Mesh(headGeo, headMat);

                          head.position.set(0, 1.05, -0.32);

                          roverGroup.add(head);

                          // Lens (blue emissive)

                          var lensGeo = new THREE.SphereGeometry(0.04, 8, 8);

                          var lensMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 0.8 });

                          var lens = new THREE.Mesh(lensGeo, lensMat);

                          lens.position.set(0, 1.05, -0.41);

                          roverGroup.add(lens);

                          // Solar panel

                          var panelGeo = new THREE.BoxGeometry(1.0, 0.03, 0.6);

                          var panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a5e, metalness: 0.3, roughness: 0.5 });

                          var panel = new THREE.Mesh(panelGeo, panelMat);

                          panel.position.set(0, 0.56, 0.15);

                          roverGroup.add(panel);

                          // 6 wheels (3 per side)

                          var wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12);

                          var wheelMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.4, roughness: 0.8 });

                          var wheelPositions = [

                            [-0.45, 0.15, -0.4], [-0.45, 0.15, 0], [-0.45, 0.15, 0.4],

                            [0.45, 0.15, -0.4], [0.45, 0.15, 0], [0.45, 0.15, 0.4]

                          ];

                          wheelPositions.forEach(function (wp) {

                            var wheel = new THREE.Mesh(wheelGeo, wheelMat);

                            wheel.position.set(wp[0], wp[1], wp[2]);

                            wheel.rotation.z = Math.PI / 2;

                            roverGroup.add(wheel);

                          });

                          // Antenna

                          var antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8);

                          var antMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 });

                          var ant = new THREE.Mesh(antGeo, antMat);

                          ant.position.set(0.25, 0.92, 0.3);

                          roverGroup.add(ant);

                          // Antenna dish

                          var dishGeo = new THREE.CircleGeometry(0.1, 12);

                          var dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.3 });

                          var dish = new THREE.Mesh(dishGeo, dishMat);

                          dish.position.set(0.25, 1.35, 0.3);

                          dish.rotation.x = -0.5;

                          roverGroup.add(dish);

                        } else {

                          // Gas giant: build a probe/drone

                          var probeGeo = new THREE.SphereGeometry(0.4, 16, 12);

                          var probeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.7, roughness: 0.2 });

                          var probe = new THREE.Mesh(probeGeo, probeMat);

                          probe.position.y = 0;

                          roverGroup.add(probe);

                          // Heat shield bottom

                          var shieldGeo = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);

                          var shieldMat = new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.2, roughness: 0.8 });

                          var shield = new THREE.Mesh(shieldGeo, shieldMat);

                          shield.rotation.x = Math.PI;

                          roverGroup.add(shield);

                          // Instrument boom

                          var boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0);

                          var boomMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });

                          var boom = new THREE.Mesh(boomGeo, boomMat);

                          boom.position.set(0, 0.5, 0);

                          roverGroup.add(boom);

                          // Antenna top

                          var pAntGeo = new THREE.ConeGeometry(0.08, 0.2, 8);

                          var pAntMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 });

                          var pAnt = new THREE.Mesh(pAntGeo, pAntMat);

                          pAnt.position.set(0, 1.1, 0);

                          roverGroup.add(pAnt);

                          // Blinking lights

                          var lightGeo = new THREE.SphereGeometry(0.05, 8, 8);

                          var lightMat1 = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });

                          var lightMat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.0 });

                          var redLight = new THREE.Mesh(lightGeo, lightMat1);

                          redLight.position.set(0.3, 0.1, 0.3);

                          roverGroup.add(redLight);

                          var greenLight = new THREE.Mesh(lightGeo, lightMat2);

                          greenLight.position.set(-0.3, 0.1, 0.3);

                          roverGroup.add(greenLight);

                        }

                        roverGroup.position.set(0, isGas ? 5 : 0, 0); // initial position; animation loop tracks playerPos

                        scene.add(roverGroup);



                        // â”€â”€ Scattered Environment Objects (rocks/boulders for depth cues) â”€â”€

                        var envObjects = [];

                        if (!isGas) {

                          var rockColor = new THREE.Color(sel.terrainColor || '#886644');

                          for (var ri = 0; ri < 80; ri++) {

                            var rSize = 0.1 + Math.random() * 0.6;

                            var rGeo = new THREE.DodecahedronGeometry(rSize, 0);

                            // Deform vertices for organic shapes

                            var rPositions = rGeo.attributes.position.array;

                            for (var rv = 0; rv < rPositions.length; rv += 3) {

                              rPositions[rv] *= 0.7 + Math.random() * 0.6;

                              rPositions[rv + 1] *= 0.5 + Math.random() * 0.5;

                              rPositions[rv + 2] *= 0.7 + Math.random() * 0.6;

                            }

                            rGeo.computeVertexNormals();

                            var rMat = new THREE.MeshStandardMaterial({

                              color: rockColor.clone().offsetHSL(Math.random() * 0.05 - 0.025, Math.random() * 0.1 - 0.05, Math.random() * 0.1 - 0.05),

                              roughness: 0.9, metalness: 0.1, flatShading: true

                            });

                            var rock = new THREE.Mesh(rGeo, rMat);

                            rock.position.set(

                              (Math.random() - 0.5) * 80,

                              rSize * 0.3,

                              (Math.random() - 0.5) * 80

                            );

                            rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

                            scene.add(rock);

                            envObjects.push(rock);

                          }

                          // A few large landmark boulders

                          for (var bi = 0; bi < 6; bi++) {

                            var bSize = 1.5 + Math.random() * 2;

                            var bGeo = new THREE.DodecahedronGeometry(bSize, 1);

                            var bPositions = bGeo.attributes.position.array;

                            for (var bv = 0; bv < bPositions.length; bv += 3) {

                              bPositions[bv] *= 0.6 + Math.random() * 0.8;

                              bPositions[bv + 1] *= 0.4 + Math.random() * 0.6;

                              bPositions[bv + 2] *= 0.6 + Math.random() * 0.8;

                            }

                            bGeo.computeVertexNormals();

                            var bMat = new THREE.MeshStandardMaterial({

                              color: rockColor.clone().offsetHSL(0, -0.05, -0.1),

                              roughness: 0.95, metalness: 0.05, flatShading: true

                            });

                            var boulder = new THREE.Mesh(bGeo, bMat);

                            boulder.position.set(

                              (Math.random() - 0.5) * 60,

                              bSize * 0.25,

                              (Math.random() - 0.5) * 60

                            );

                            boulder.rotation.y = Math.random() * Math.PI * 2;

                            scene.add(boulder);

                            envObjects.push(boulder);

                          }

                        }



                        // â”€â”€ Particle effects â”€â”€

                        if (sel.terrainType === 'desert' || sel.terrainType === 'volcanic') {

                          var partCount = 200;

                          var partGeo = new THREE.BufferGeometry();

                          var partPos = new Float32Array(partCount * 3);

                          for (var pi = 0; pi < partCount; pi++) {

                            partPos[pi * 3] = (Math.random() - 0.5) * 60;

                            partPos[pi * 3 + 1] = Math.random() * 8;

                            partPos[pi * 3 + 2] = (Math.random() - 0.5) * 60;

                          }

                          partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));

                          var partColor = sel.terrainType === 'volcanic' ? 0xff6600 : 0xc9a06a;

                          scene.add(new THREE.Points(partGeo, new THREE.PointsMaterial({ color: partColor, size: 0.05, transparent: true, opacity: 0.4 })));

                        }

                        if (sel.terrainType === 'icegiant' || sel.name === t('stem.solar_sys.uranus')) {

                          // Diamond rain

                          var drCount = 100;

                          var drGeo = new THREE.BufferGeometry();

                          var drPos = new Float32Array(drCount * 3);

                          for (var di = 0; di < drCount; di++) {

                            drPos[di * 3] = (Math.random() - 0.5) * 40;

                            drPos[di * 3 + 1] = Math.random() * 20;

                            drPos[di * 3 + 2] = (Math.random() - 0.5) * 40;

                          }

                          drGeo.setAttribute('position', new THREE.BufferAttribute(drPos, 3));

                          var diamonds = new THREE.Points(drGeo, new THREE.PointsMaterial({ color: 0xccddff, size: 0.08, transparent: true, opacity: 0.6 }));

                          scene.add(diamonds);

                        }



                        // â”€â”€ Movement state â”€â”€

                        var moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };

                        var yaw = 0, pitch = 0, playerPos = new THREE.Vector3(0, isGas ? 5 : 1.6, 0);

                        var speed3d = isGas ? 0.15 : 0.08;



                        function onKey(e, pressed) {

                          switch (e.key.toLowerCase()) {

                            case 'w': case 'arrowup': moveState.forward = pressed; break;

                            case 's': case 'arrowdown': moveState.back = pressed; break;

                            case 'a': case 'arrowleft': moveState.left = pressed; break;

                            case 'd': case 'arrowright': moveState.right = pressed; break;

                            case 'q': case ' ': moveState.up = pressed; break;

                            case 'e': case 'shift': moveState.down = pressed; break;

                          }

                          e.preventDefault();

                        }

                        canvasEl.tabIndex = 0;

                        canvasEl.addEventListener('keydown', function (e) { onKey(e, true); });

                        canvasEl.addEventListener('keyup', function (e) { onKey(e, false); });



                        // Mouse look

                        var isLooking = false;

                        canvasEl.addEventListener('mousedown', function (e) { isLooking = true; canvasEl.requestPointerLock && canvasEl.requestPointerLock(); });

                        canvasEl.addEventListener('mouseup', function () { isLooking = false; });

                        function onMouseMove(e) {

                          if (!isLooking && !document.pointerLockElement) return;

                          yaw -= e.movementX * 0.003;

                          pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.003));

                        }

                        document.addEventListener('mousemove', onMouseMove);

                        canvasEl.focus();



                        var tick3d = 0;

                        var animId3d;

                        var hudMode = 'full'; // 'simple' | 'standard' | 'full'

                        // animate3d is defined later as animate3dV2 with 3rd-person and compass support



                        // â”€â”€ Rich Educational HUD (Enhanced) â”€â”€

                        var hud = document.createElement('div');

                        hud.className = 'rover-hud';

                        hud.style.cssText = 'position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border-radius:12px;padding:10px 14px;color:#38bdf8;font-family:monospace;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3);max-width:290px;transition:opacity 0.3s';

                        var modeLabel = isGas ? '\uD83D\uDEF8 ATMOSPHERIC PROBE' : '\uD83D\uDE97 SURFACE ROVER';

                        var atmosLabel = sel.atmosphere || 'No data';

                        var gravLabel = sel.gravity || '?';

                        var featList = (sel.notableFeatures || []).slice(0, 3).map(function (f) { return '<div style="color:#94a3b8;font-size:9px;padding-left:8px">\u2022 ' + f + '</div>'; }).join('');

                        // â”€â”€ Fullscreen Toggle â”€â”€

                        var fsToggle = document.createElement('button');

                        fsToggle.style.cssText = 'position:absolute;top:8px;right:64px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:8px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:24px;border:1px solid rgba(56,189,248,0.3);cursor:pointer;z-index:15;transition:background 0.2s';

                        fsToggle.innerHTML = '\u26F6';

                        fsToggle.title = "Toggle Fullscreen";

                        fsToggle.onmouseover = function() { this.style.background = 'rgba(56,189,248,0.3)'; };

                        fsToggle.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.6)'; };

                        fsToggle.onclick = function() {

                          var container = document.getElementById('drone-fullscreen-container') || canvasEl.parentElement;

                          if (!document.fullscreenElement) {

                            if (container.requestFullscreen) { container.requestFullscreen(); }

                            else if (container.mozRequestFullScreen) { container.mozRequestFullScreen(); }

                            else if (container.webkitRequestFullscreen) { container.webkitRequestFullscreen(); }

                            else if (container.msRequestFullscreen) { container.msRequestFullscreen(); }

                            fsToggle.innerHTML = '\xDF'; // shrink icon approximation

                          } else {

                            if (document.exitFullscreen) { document.exitFullscreen(); }

                            else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }

                            else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }

                            else if (document.msExitFullscreen) { document.msExitFullscreen(); }

                            fsToggle.innerHTML = '\u26F6'; // expand icon

                          }

                        };

                        canvasEl.parentElement.appendChild(fsToggle);



                        // Handling true fullscreen resize dynamically

                        // Robust fullscreen + resize handler
                        function resizeDroneCanvas() {
                          if (!renderer || !camera) return;
                          var isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
                          var container = document.getElementById('drone-fullscreen-container') || canvasEl.parentElement;
                          var w, h2;
                          if (isFS) {
                            w = window.innerWidth;
                            h2 = window.innerHeight;
                            canvasEl.style.width = w + 'px';
                            canvasEl.style.height = h2 + 'px';
                            container.style.width = w + 'px';
                            container.style.height = h2 + 'px';
                          } else {
                            canvasEl.style.width = '100%';
                            canvasEl.style.height = '100%';
                            container.style.width = '';
                            container.style.height = '';
                            w = canvasEl.clientWidth || canvasEl.parentElement.clientWidth || 900;
                            h2 = canvasEl.clientHeight || canvasEl.parentElement.clientHeight || 450;
                          }
                          W = w; H = h2;
                          camera.aspect = w / h2;
                          camera.updateProjectionMatrix();
                          renderer.setSize(w, h2);
                        }
                        document.addEventListener('fullscreenchange', resizeDroneCanvas);
                        document.addEventListener('webkitfullscreenchange', resizeDroneCanvas);
                        document.addEventListener('mozfullscreenchange', resizeDroneCanvas);
                        // Also observe size changes from layout reflow
                        var droneRO = new ResizeObserver(function() {
                          if (!document.fullscreenElement) resizeDroneCanvas();
                        });
                        droneRO.observe(canvasEl);
                        // Initial size fix after 1 frame (in case clientWidth was 0)
                        requestAnimationFrame(function() { resizeDroneCanvas(); });



                        // Live telemetry spans (updated each frame)

                        var hudStaticHTML =

                          '<div style="font-weight:bold;font-size:12px;margin-bottom:6px;color:#7dd3fc;letter-spacing:1px" id="hud-mode">' + modeLabel + '</div>' +

                          '<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-bottom:4px">' +

                          '<span style="color:#64748b">' + t('stem.planet_view.planet') + '</span><span style="color:#e2e8f0;font-weight:bold">' + sel.name + ' ' + sel.emoji + '</span>' +

                          '<span style="color:#64748b">' + t('stem.planet_view.gravity') + '</span><span>' + gravLabel + '</span>' +

                          '<span style="color:#64748b">' + t('stem.planet_view.temp') + '</span><span>' + sel.temp + '</span>' +

                          '<span style="color:#64748b">' + t('stem.planet_view.atmos') + '</span><span style="font-size:9px">' + atmosLabel + '</span>' +

                          '</div>' +

                          '<div id="hud-simple-row" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +

                          '<span style="color:#64748b" title="Points of interest found">\uD83D\uDD2D Disc</span><span id="hud-disc" style="color:#fbbf24">0 / 0</span>' +

                          '</div>' +

                          '<div id="hud-standard-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +

                          '<span style="color:#64748b" title="Compass heading: 0=N, 90=E, 180=S, 270=W">\uD83E\uDDED Hdg</span><span id="hud-hdg" style="color:#67e8f9">N 0\u00B0</span>' +

                          '<span style="color:#64748b" title="Cartesian grid position (X, Y)">\uD83D\uDCCD Pos</span><span id="hud-pos" style="color:#67e8f9;font-size:9px">0.0, 0.0</span>' +

                          '<span style="color:#64748b" title="Current speed in m/s">\uD83D\uDCA8 Spd</span><span id="hud-spd" style="color:#67e8f9">0 m/s</span>' +

                          '</div>' +

                          '<div id="hud-full-rows" style="border-top:1px solid rgba(56,189,248,0.12);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px">' +

                          '<span style="color:#64748b" title="Height above surface (radar altimeter)">\uD83D\uDCCF Alt</span><span id="hud-alt" style="color:#67e8f9">0 m</span>' +

                          '<span style="color:#64748b" title="Total distance traveled">\uD83D\uDEB6 Dist</span><span id="hud-odo" style="color:#67e8f9">0 m</span>' +

                          '<span style="color:#64748b" title="Navigation target distance">\uD83C\uDFAF Tgt</span><span id="hud-tgt" style="color:#a78bfa">-- m</span>' +

                          '</div>' +

                          (featList ? '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;margin-bottom:3px"><span style="color:#7dd3fc;font-weight:bold;font-size:9px">\uD83D\uDD2D NOTABLE</span>' + featList + '</div>' : '') +

                          '<div style="border-top:1px solid rgba(56,189,248,0.12);padding-top:3px;color:#94a3b8;font-size:9px">WASD move \u2022 Mouse look \u2022 V view \u2022 M mission \u2022 <span style="color:#38bdf8">H</span> hud \u2022 <span style="color:#a78bfa">N</span> nav \u2022 <span style="color:#8b5cf6">P</span> plot</div>';

                        hud.innerHTML = hudStaticHTML;

                        canvasEl.parentElement.appendChild(hud);



                        // â”€â”€ Hazard Warning Strip â”€â”€

                        var hazardEl = document.createElement('div');

                        hazardEl.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.85);backdrop-filter:blur(4px);border-radius:8px;padding:5px 16px;color:#fff;font-family:monospace;font-size:10px;font-weight:bold;pointer-events:none;z-index:11;border:1px solid rgba(255,100,100,0.4);text-align:center;opacity:0;transition:opacity 0.5s;letter-spacing:0.5px';

                        var hazardMsgs = {

                          [t('stem.solar_sys.venus')]: ['\u26A0 SURFACE TEMP 462\u00B0C \u2014 exceeds hull tolerance', '\u26A0 ATMOSPHERIC PRESSURE: 90x Earth \u2014 structural warning', '\u26A0 SULFURIC ACID CLOUDS DETECTED overhead'],

                          [t('stem.solar_sys.jupiter')]: ['\u26A0 RADIATION: 20 Sv/day \u2014 lethal exposure zone', '\u26A0 WIND SHEAR: 360 km/h crosswind detected', '\u26A0 AMMONIA ICE CRYSTALS impacting sensors'],

                          [t('stem.solar_sys.saturn')]: ['\u26A0 RING DEBRIS: micro-meteoroid risk elevated', '\u26A0 WIND SPEED: 1,800 km/h at equatorial band'],

                          [t('stem.solar_sys.mars')]: ['\u26A0 DUST STORM APPROACHING \u2014 visibility dropping', '\u26A0 UV RADIATION: no magnetic shield \u2014 high exposure', '\u26A0 THIN ATMOSPHERE: suit pressure critical'],

                          [t('stem.periodic.mercury')]: ['\u26A0 SOLAR RADIATION ALERT \u2014 no magnetic shielding', '\u26A0 SURFACE TEMP SWING: -180\u00B0C to 430\u00B0C across terminator'],

                          [t('stem.solar_sys.pluto')]: ['\u26A0 COMMS DELAY: 5h 28m one-way to Earth', '\u26A0 SURFACE TEMP: -230\u00B0C \u2014 nitrogen ice sublimating'],

                          [t('stem.solar_sys.uranus')]: ['\u26A0 DIAMOND RAIN: high-pressure carbon crystallization', '\u26A0 97.8\u00B0 AXIAL TILT: extreme seasonal variations'],

                          [t('stem.solar_sys.neptune')]: ['\u26A0 WIND SPEED: 2,100 km/h \u2014 fastest in solar system', '\u26A0 GREAT DARK SPOT: storm system ahead'],

                          [t('stem.solar_sys.earth')]: ['\u2139 All systems nominal \u2014 home sweet home']

                        };

                        var planetHazards = hazardMsgs[sel.name] || ['\u26A0 Environmental data unavailable'];

                        var hazardIdx = 0;

                        canvasEl.parentElement.appendChild(hazardEl);

                        var hazardTimer = setInterval(function () {

                          hazardEl.style.opacity = '0';

                          setTimeout(function () {

                            hazardEl.textContent = planetHazards[hazardIdx % planetHazards.length];

                            hazardEl.style.background = sel.name === t('stem.solar_sys.earth') ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';

                            hazardEl.style.opacity = '1';

                            hazardIdx++;

                          }, 500);

                          setTimeout(function () { hazardEl.style.opacity = '0'; }, 4500);

                        }, 8000);

                        // Show first warning after 2s

                        setTimeout(function () {

                          hazardEl.textContent = planetHazards[0];

                          hazardEl.style.background = sel.name === t('stem.solar_sys.earth') ? 'rgba(34,197,94,0.8)' : 'rgba(220,38,38,0.85)';

                          hazardEl.style.opacity = '1';

                          hazardIdx = 1;

                          setTimeout(function () { hazardEl.style.opacity = '0'; }, 4500);

                        }, 2000);



                        // â”€â”€ Discovery System (POI landmarks) â”€â”€

                        var POI_DATA = {

                          [t('stem.periodic.mercury')]: [

                            { x: 15, z: -10, name: t('stem.planet_view.caloris_basin'), desc: 'One of the largest impact craters in the solar system (1,550 km wide).', fact: 'The impact was so powerful it created chaotic terrain on the opposite side of Mercury.' },

                            { x: -20, z: 8, name: t('stem.planet_view.ice_deposits'), desc: t('stem.planet_view.permanently_shadowed_craters_at_the'), fact: 'Despite being closest to the Sun, Mercury has ice because some craters never see sunlight.' },

                            { x: 30, z: 25, name: t('stem.planet_view.scarps_cliffs'), desc: 'Mercury shrank as its iron core cooled, creating massive cliff-like wrinkles.', fact: 'These scarps can be hundreds of km long and over 1 km tall.' }

                          ],

                          [t('stem.solar_sys.venus')]: [

                            { x: 12, z: -15, name: t('stem.planet_view.maxwell_montes'), desc: 'Highest mountain on Venus at 11 km \u2014 taller than Everest.', fact: 'The summit is coated with a metallic "snow" made from lead sulfide and bismuth sulfide.' },

                            { x: -18, z: 20, name: t('stem.planet_view.pancake_dome'), desc: 'Flat-topped volcanic domes unique to Venus, up to 65 km across.', fact: 'Extremely viscous lava oozed out and spread like thick pancake batter.' },

                            { x: 25, z: 5, name: t('stem.planet_view.venera_13_landing_site'), desc: 'Soviet lander that survived 127 minutes on the surface in 1982.', fact: 'Venera 13 took the first color photos of Venus\u2019s surface before being crushed by pressure.' }

                          ],

                          [t('stem.solar_sys.earth')]: [

                            { x: 10, z: -12, name: t('stem.planet_view.mariana_trench'), desc: t('stem.planet_view.deepest_point_on_earth_at'), fact: 'More people have walked on the Moon than have been to the bottom of the Mariana Trench.' },

                            { x: -22, z: 15, name: t('stem.planet_view.midatlantic_ridge'), desc: t('stem.planet_view.underwater_mountain_range_where_tectonic'), fact: 'The Atlantic Ocean grows about 2.5 cm wider every year.' },

                            { x: 28, z: -8, name: t('stem.planet_view.great_barrier_reef'), desc: t('stem.planet_view.largest_living_structure_on_earth'), fact: 'The reef is made of 2,900 individual reef systems and supports 1,500+ species of fish.' }

                          ],

                          [t('stem.solar_sys.mars')]: [

                            { x: 20, z: -18, name: t('stem.planet_view.olympus_mons_base'), desc: t('stem.planet_view.base_of_the_tallest_volcano'), fact: 'Olympus Mons is so wide (624 km) that standing on its edge, you couldn\u2019t see the summit \u2014 it curves beyond the horizon.' },

                            { x: -25, z: 12, name: t('stem.planet_view.valles_marineris_rim'), desc: t('stem.planet_view.a_canyon_system_4000_km'), fact: 'It would stretch from New York to Los Angeles and is 5x deeper than the Grand Canyon.' },

                            { x: 8, z: 30, name: t('stem.planet_view.polar_ice_cap'), desc: t('stem.planet_view.layered_ice_deposits_of_frozen'), fact: 'If all of Mars\u2019s polar ice melted, it could cover the entire planet in 11 meters of water.' },

                            { x: -15, z: -25, name: t('stem.planet_view.perseverance_rover_site'), desc: 'Jezero Crater \u2014 where NASA\u2019s rover searches for signs of ancient life.', fact: 'Perseverance arrived Feb 2021 and has driven 28+ km, collecting rock samples for future return to Earth.' }

                          ],

                          [t('stem.solar_sys.jupiter')]: [

                            { x: 18, z: -20, name: t('stem.planet_view.great_red_spot_eye'), desc: 'An anticyclonic storm raging for 350+ years, larger than Earth.', fact: 'Wind speeds at the edge reach 680 km/h \u2014 twice the speed of the strongest Earth hurricane.' },

                            { x: -15, z: 15, name: t('stem.planet_view.ammonia_crystal_layer'), desc: 'Upper cloud layer made of frozen ammonia crystals at -145\u00B0C.', fact: 'Below this layer are ammonium hydrosulfide clouds, and below those, water clouds. Jupiter has weather 3 layers deep.' },

                            { x: 25, z: 8, name: t('stem.planet_view.lightning_alley'), desc: 'Zones between cloud bands where convection drives massive lightning storms.', fact: 'Jupiter\u2019s lightning is 10x more powerful than Earth\u2019s and occurs mostly at the poles and deep clouds.' },

                            { x: -8, z: -28, name: t('stem.planet_view.metallic_hydrogen_zone'), desc: 'Deep below the clouds, pressure turns hydrogen into liquid metal.', fact: 'This metallic hydrogen ocean generates Jupiter\u2019s magnetic field \u2014 20,000x stronger than Earth\u2019s.' }

                          ],

                          [t('stem.solar_sys.saturn')]: [

                            { x: 20, z: -15, name: t('stem.planet_view.hexagonal_polar_vortex'), desc: 'A persistent hexagonal cloud pattern at Saturn\u2019s north pole.', fact: 'Each side of the hexagon is about 14,500 km long \u2014 wider than Earth\u2019s diameter.' },

                            { x: -18, z: 22, name: t('stem.planet_view.ring_shadow_zone'), desc: 'Area where Saturn\u2019s rings cast shadows on the cloud tops.', fact: 'Saturn\u2019s rings are only about 10 m thick despite being 282,000 km wide \u2014 thinner than a razor blade proportionally.' },

                            { x: 12, z: 10, name: t('stem.planet_view.titan_flyby_path'), desc: t('stem.planet_view.the_orbital_zone_of_titan'), fact: 'Titan has lakes of liquid methane and a thicker atmosphere than Earth \u2014 the only moon with a substantial atmosphere.' }

                          ],

                          [t('stem.solar_sys.uranus')]: [

                            { x: 15, z: -18, name: t('stem.planet_view.diamond_rain_zone'), desc: 'At 8,000 km depth, extreme pressure crushes carbon into diamonds.', fact: 'These diamonds may be as large as millions of carats and rain down to form a diamond layer around the core.' },

                            { x: -20, z: 14, name: t('stem.planet_view.magnetic_pole_shift'), desc: 'Uranus\u2019s magnetic field is tilted 59\u00B0 from its rotation axis.', fact: 'Combined with the 98\u00B0 axial tilt, Uranus\u2019s magnetosphere tumbles chaotically through space.' },

                            { x: 25, z: -5, name: t('stem.planet_view.cloud_band_transition'), desc: 'Faint methane cloud bands where wind patterns change direction.', fact: 'Uranus appears featureless but Hubble revealed complex cloud systems moving at 900 km/h.' }

                          ],

                          [t('stem.solar_sys.neptune')]: [

                            { x: 18, z: -22, name: t('stem.planet_view.great_dark_spot_region'), desc: 'A massive storm system similar to Jupiter\u2019s Great Red Spot.', fact: 'Unlike Jupiter\u2019s spot, Neptune\u2019s dark spots appear and disappear within years \u2014 the planet is surprisingly dynamic.' },

                            { x: -14, z: 16, name: t('stem.planet_view.supersonic_wind_belt'), desc: 'Equatorial winds reaching 2,100 km/h \u2014 faster than the speed of sound.', fact: 'Neptune generates more heat than it receives from the Sun, driving these extreme winds from internal energy.' },

                            { x: 22, z: 10, name: t('stem.planet_view.triton_orbital_cross'), desc: 'The path of Triton \u2014 the only large moon that orbits backwards.', fact: 'Triton is likely a captured Kuiper Belt object. Its nitrogen geysers shoot plumes 8 km high.' }

                          ],

                          [t('stem.solar_sys.pluto')]: [

                            { x: 12, z: -14, name: t('stem.planet_view.tombaugh_regio'), desc: 'The famous heart-shaped glacier made of nitrogen and carbon monoxide ice.', fact: 'The left lobe (Sputnik Planitia) is a vast ice plain with convection cells that slowly churn the ice.' },

                            { x: -16, z: 18, name: t('stem.planet_view.ice_mountains'), desc: 'Mountains of water ice rising 2\u20133 km above the nitrogen plains.', fact: 'Because water ice is less dense than nitrogen ice at Pluto\u2019s temperatures, these mountains literally float.' },

                            { x: 20, z: 5, name: t('stem.planet_view.cthulhu_macula'), desc: t('stem.planet_view.a_dark_equatorial_region_2990'), fact: 'Tholins are complex organic molecules created when methane is irradiated \u2014 they give Pluto its reddish-brown color.' }

                          ]

                        };

                        var pois = POI_DATA[sel.name] || [];

                        var discoveredPOIs = {};

                        var totalPOIs = pois.length;



                        // Place POI markers in the 3D scene

                        var poiMeshes = [];

                        pois.forEach(function (poi, idx) {

                          var poiGeo = new THREE.SphereGeometry(0.3, 8, 8);

                          var poiMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });

                          var poiMesh = new THREE.Mesh(poiGeo, poiMat);

                          poiMesh.position.set(poi.x, isGas ? 3 : 1.5, poi.z);

                          poiMesh._poiIdx = idx;

                          scene.add(poiMesh);

                          poiMeshes.push(poiMesh);

                          // Glow ring around POI

                          var ringGeo = new THREE.RingGeometry(0.5, 0.8, 16);

                          var ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

                          var ringMesh = new THREE.Mesh(ringGeo, ringMat);

                          ringMesh.rotation.x = -Math.PI / 2;

                          ringMesh.position.set(poi.x, isGas ? 2.5 : 1.0, poi.z);

                          ringMesh._pulsePhase = idx;

                          scene.add(ringMesh);

                          poiMeshes.push(ringMesh);

                        });



                        // Discovery card overlay

                        var discCard = document.createElement('div');

                        discCard.style.cssText = 'position:absolute;bottom:56px;right:8px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);border-radius:12px;padding:12px 16px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:none;z-index:11;border:1px solid rgba(251,191,36,0.4);max-width:280px;opacity:0;transition:opacity 0.5s,transform 0.5s;transform:translateY(10px)';

                        canvasEl.parentElement.appendChild(discCard);

                        var discTimeout = null;



                        function showDiscovery(poi, idx) {

                          if (discoveredPOIs[idx]) return;

                          discoveredPOIs[idx] = true;

                          var discCount = Object.keys(discoveredPOIs).length;

                          discCard.innerHTML =

                            '<div style="font-weight:bold;font-size:13px;color:#fbbf24;margin-bottom:4px">\uD83D\uDD0D DISCOVERY: ' + poi.name + '</div>' +

                            '<div style="color:#e2e8f0;margin-bottom:4px;line-height:1.4">' + poi.desc + '</div>' +

                            '<div style="color:#67e8f9;font-size:10px;font-style:italic;border-top:1px solid rgba(251,191,36,0.2);padding-top:4px">\uD83D\uDCA1 ' + poi.fact + '</div>' +

                            '<div style="color:#34d399;font-size:10px;font-weight:bold;margin-top:4px">\u2B50 +10 XP \u2022 ' + discCount + '/' + totalPOIs + ' discovered</div>';

                          discCard.style.opacity = '1';

                          discCard.style.transform = 'translateY(0)';

                          // Award XP

                          if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 10);

                          if (discTimeout) clearTimeout(discTimeout);

                          discTimeout = setTimeout(function () {

                            discCard.style.opacity = '0';

                            discCard.style.transform = 'translateY(10px)';

                          }, 7000);

                        }



                        // â”€â”€ Mission Card Overlay (M key toggle) â”€â”€

                        var missionCard = document.createElement('div');

                        missionCard.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:16px;padding:24px;color:#fff;font-family:sans-serif;font-size:12px;pointer-events:auto;z-index:15;border:1px solid rgba(56,189,248,0.3);max-width:380px;width:90%;opacity:0;transition:opacity 0.3s;display:none';

                        var missionIcon = isGas ? '\uD83D\uDEF8' : '\uD83D\uDE97';

                        var missionType = isGas ? 'Atmospheric Survey' : 'Surface Exploration';

                        missionCard.innerHTML =

                          '<div style="text-align:center;margin-bottom:12px">' +

                          '<div style="font-size:32px;margin-bottom:4px">' + missionIcon + '</div>' +

                          '<div style="font-weight:bold;font-size:16px;color:#7dd3fc;letter-spacing:1px">' + t('stem.planet_view.mission_briefing') + '</div>' +

                          '<div style="color:#94a3b8;font-size:11px">' + missionType + ' \u2014 ' + sel.name + '</div>' +

                          '</div>' +

                          '<div style="background:rgba(56,189,248,0.1);border-radius:10px;padding:10px 12px;margin-bottom:10px;border:1px solid rgba(56,189,248,0.15)">' +

                          '<div style="font-weight:bold;color:#38bdf8;margin-bottom:4px">\uD83C\uDFAF Objectives</div>' +

                          '<div id="mission-objectives" style="color:#e2e8f0;line-height:1.8">' +

                          pois.map(function (p, i) { return '<div id="obj-' + i + '" style="font-size:11px">\u2610 Discover ' + p.name + '</div>'; }).join('') +

                          '</div>' +

                          '</div>' +

                          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +

                          '<div style="background:rgba(251,191,36,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(251,191,36,0.15)">' +

                          '<div style="color:#fbbf24;font-weight:bold;font-size:14px" id="mission-disc-count">0/' + totalPOIs + '</div>' +

                          '<div style="color:#94a3b8;font-size:9px">' + t('stem.planet_quiz.discoveries') + '</div></div>' +

                          '<div style="background:rgba(52,211,153,0.1);border-radius:8px;padding:6px 8px;text-align:center;border:1px solid rgba(52,211,153,0.15)">' +

                          '<div style="color:#34d399;font-weight:bold;font-size:14px" id="mission-xp-count">0</div>' +

                          '<div style="color:#94a3b8;font-size:9px">' + t('stem.planet_quiz.xp_earned') + '</div></div>' +

                          '</div>' +

                          '<div style="text-align:center;color:#64748b;font-size:10px">Press <span style="color:#38bdf8;font-weight:bold">M</span> to close \u2022 <span style="color:#38bdf8;font-weight:bold">' + t('stem.planet_quiz.wasd') + '</span> to move \u2022 <span style="color:#38bdf8;font-weight:bold">V</span> to toggle view</div>';

                        canvasEl.parentElement.appendChild(missionCard);

                        var missionVisible = false;



                        // Telemetry tracking state

                        var prevPos = new THREE.Vector3().copy(playerPos);

                        var odometer = 0;

                        var lastSpeed = 0;

                        var scaleFactor = isGas ? 100 : 50; // meters per unit for display



                        // â”€â”€ Science Fact Ticker (bottom of canvas, expanded) â”€â”€

                        var ticker = document.createElement('div');

                        ticker.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);border-radius:8px;padding:6px 12px;color:#fbbf24;font-family:sans-serif;font-size:10px;pointer-events:none;z-index:10;border:1px solid rgba(251,191,36,0.2);text-align:center;transition:opacity 0.5s';

                        // Categorized facts with icons

                        var scienceFacts = [

                          // Surface / Geology

                          '\uD83E\uDEA8 ' + (sel.surfaceDesc || sel.fact),

                          '\uD83E\uDEA8 ' + sel.fact,

                          // Climate / Weather

                          '\uD83C\uDF21 A day on ' + sel.name + ' lasts ' + (sel.dayLen || '?') + '. A year lasts ' + (sel.yearLen || '?') + '.',

                          '\uD83C\uDF21 Gravity on ' + sel.name + ' is ' + gravLabel + ' compared to Earth\u2019s 1.0g.',

                          // Scale comparisons

                          '\uD83C\uDF0D ' + sel.name + '\u2019s diameter is ' + (sel.diameter || '?') + (sel.name !== t('stem.solar_sys.earth') ? ' (Earth: 12,742 km).' : '.'),

                          // Gas vs rocky

                          isGas ? '\uD83E\uDEA8 Gas giants have no solid surface \u2014 you would fall forever through ever-denser gas layers.' : '\uD83E\uDEA8 The terrain is generated from real-world elevation science for ' + sel.terrainType + ' surfaces.',

                          isGas ? '\uD83C\uDF21 If you parachuted into ' + sel.name + ', you would never touch ground \u2014 just endless clouds.' : '\uD83E\uDEA8 The surface of ' + sel.name + ' is made of ' + (sel.surface || 'rock and dust') + '.',

                          // Planet-specific unique facts

                          sel.name === t('stem.periodic.mercury') ? '\uD83D\uDE80 MESSENGER orbited Mercury 2011\u20132015, mapping the entire surface and discovering ice in polar craters.' : sel.name === t('stem.solar_sys.venus') ? '\uD83D\uDE80 Soviet Venera 13 survived 127 minutes on Venus\u2019s surface in 1982 \u2014 still a record.' : sel.name === t('stem.solar_sys.earth') ? '\uD83D\uDE80 The ISS orbits Earth every 90 minutes at 27,600 km/h, 408 km above us.' : sel.name === t('stem.solar_sys.mars') ? '\uD83D\uDE80 Perseverance landed Feb 2021 in Jezero Crater, searching for signs of ancient microbial life.' : sel.name === t('stem.solar_sys.jupiter') ? '\uD83D\uDE80 Juno has been orbiting Jupiter since 2016, peering beneath the cloud tops with microwave sensors.' : sel.name === t('stem.solar_sys.saturn') ? '\uD83D\uDE80 Cassini orbited Saturn for 13 years (2004\u20132017) before its grand finale plunge into the atmosphere.' : sel.name === t('stem.solar_sys.uranus') ? '\uD83D\uDE80 Only Voyager 2 has visited Uranus, flying by in January 1986 and discovering 10 new moons.' : sel.name === t('stem.solar_sys.neptune') ? '\uD83D\uDE80 Voyager 2 is the only spacecraft to visit Neptune, flying by in August 1989.' : '\uD83D\uDE80 NASA\u2019s New Horizons flew past Pluto in July 2015, revealing a geologically active world.',

                          // More planet-specific facts

                          sel.name === t('stem.solar_sys.mars') ? '\uD83C\uDF21 Mars has the largest dust storms in the solar system \u2014 they can engulf the entire planet for months.' : sel.name === t('stem.solar_sys.venus') ? '\uD83C\uDF21 Venus rotates backwards (retrograde) so slowly that its day is longer than its year.' : sel.name === t('stem.solar_sys.jupiter') ? '\uD83E\uDEA8 Jupiter\u2019s core may be a fuzzy mix of metallic hydrogen and dissolved rocky material.' : sel.name === t('stem.solar_sys.saturn') ? '\uD83C\uDF0D Saturn\u2019s density is 0.687 g/cm\u00B3 \u2014 it would float in a bathtub big enough to hold it.' : sel.name === t('stem.solar_sys.uranus') ? '\uD83C\uDF21 Uranus was knocked on its side by an ancient collision with an Earth-sized object.' : sel.name === t('stem.solar_sys.neptune') ? '\uD83E\uDEA8 Neptune radiates 2.6x more energy than it receives from the Sun \u2014 its own internal heat drives supersonic winds.' : sel.name === t('stem.solar_sys.pluto') ? '\uD83C\uDF0D Pluto and its moon Charon are tidally locked \u2014 they always show the same face to each other.' : sel.name === t('stem.periodic.mercury') ? '\uD83C\uDF0D Mercury has virtually no atmosphere \u2014 just a thin exosphere of atoms blasted off the surface by solar wind.' : '\uD83E\uDDE0 Every atom in your body was forged inside a star.',

                          // Chemistry / science

                          '\uD83E\uDDEA Atmosphere: ' + atmosLabel,

                          sel.name === t('stem.solar_sys.mars') ? '\uD83E\uDDEA Mars\u2019s red color comes from iron oxide (rust) in its soil \u2014 the entire planet is literally rusty.' : sel.name === t('stem.solar_sys.venus') ? '\uD83E\uDDEA Venus\u2019s clouds contain sulfuric acid droplets \u2014 rain evaporates before reaching the surface.' : sel.name === t('stem.solar_sys.jupiter') ? '\uD83E\uDDEA Jupiter\u2019s interior contains metallic hydrogen \u2014 hydrogen so compressed it conducts electricity like a metal.' : sel.name === t('stem.solar_sys.saturn') ? '\uD83E\uDDEA Titan\u2019s thick atmosphere is mostly nitrogen, like Earth\u2019s, but with methane playing the role of water.' : sel.name === t('stem.solar_sys.uranus') ? '\uD83E\uDDEA Methane in Uranus\u2019s upper atmosphere absorbs red light, giving it that distinctive blue-green color.' : sel.name === t('stem.solar_sys.neptune') ? '\uD83E\uDDEA Neptune\u2019s vivid blue is from methane \u2014 but a still-unknown compound makes it bluer than Uranus.' : sel.name === t('stem.solar_sys.pluto') ? '\uD83E\uDDEA Tholins on Pluto\u2019s surface are complex organic molecules \u2014 building blocks for prebiotic chemistry.' : sel.name === t('stem.solar_sys.earth') ? '\uD83E\uDDEA Earth\u2019s ozone layer (O\u2083) absorbs 97\u201399% of the Sun\u2019s UV radiation, making life on land possible.' : '\uD83E\uDDEA Mercury\u2019s exosphere contains sodium, pumped off the surface by solar photons.'

                        ].filter(Boolean);

                        var factIdx = 0;

                        ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[0];

                        canvasEl.parentElement.appendChild(ticker);

                        var factTimer = setInterval(function () {

                          factIdx = (factIdx + 1) % scienceFacts.length;

                          ticker.style.opacity = '0';

                          setTimeout(function () { ticker.innerHTML = '\uD83D\uDCA1 ' + scienceFacts[factIdx]; ticker.style.opacity = '1'; }, 400);

                        }, 6000);



                        // â”€â”€ Compass / bearing indicator (top-right) â”€â”€

                        var compass = document.createElement('div');

                        compass.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#38bdf8;font-size:18px;font-weight:bold;pointer-events:none;z-index:10;border:1px solid rgba(56,189,248,0.3)';

                        compass.innerHTML = '\uD83E\uDDED';

                        canvasEl.parentElement.appendChild(compass);



                        // â”€â”€ 3rd-person camera toggle (V key) + Mission card (M key) â”€â”€

                        var thirdPerson = false;

                        var tpOffset = new THREE.Vector3(0, 3, 6);

                        canvasEl.addEventListener('keydown', function (e) {

                          if (e.key === 'v' || e.key === 'V') {

                            thirdPerson = !thirdPerson;

                            var label = document.getElementById('hud-mode');

                            if (label) {

                              var viewLabel = thirdPerson ? ' [3RD PERSON]' : ' [1ST PERSON]';

                              label.textContent = modeLabel + viewLabel;

                            }

                          }

                          if (e.key === 'm' || e.key === 'M') {

                            missionVisible = !missionVisible;

                            missionCard.style.display = missionVisible ? 'block' : 'none';

                            setTimeout(function () { missionCard.style.opacity = missionVisible ? '1' : '0'; }, 10);

                          }

                          if (e.key === 'h' || e.key === 'H') {

                            var modes = ['simple', 'standard', 'full'];

                            hudMode = modes[(modes.indexOf(hudMode) + 1) % modes.length];

                            var stdRows = document.getElementById('hud-standard-rows');

                            var fullRows = document.getElementById('hud-full-rows');

                            if (stdRows) stdRows.style.display = (hudMode === 'standard' || hudMode === 'full') ? 'grid' : 'none';

                            if (fullRows) fullRows.style.display = hudMode === 'full' ? 'grid' : 'none';

                            var modeEl = document.getElementById('hud-mode');

                            if (modeEl) { var icons = { simple: '\uD83D\uDFE2', standard: '\uD83D\uDFE1', full: '\uD83D\uDD34' }; modeEl.textContent = modeLabel + ' [' + icons[hudMode] + ' ' + hudMode.toUpperCase() + ']'; }

                          }

                          if (e.key === 'n' || e.key === 'N') {

                            if (!navChallengeActive) { startNavChallenge(); } else { cancelNavChallenge(); }

                          }

                          if (e.key === 'p' || e.key === 'P') {

                            plotterVisible = !plotterVisible;

                            if (plotterPanel) { plotterPanel.style.display = plotterVisible ? 'block' : 'none'; setTimeout(function () { plotterPanel.style.opacity = plotterVisible ? '1' : '0'; }, 10); }

                          }

                        });



                        // â”€â”€ Trail Line (path history) - REMOVED â”€â”€

                        var trailPositions = []; var trailLine = null; var trailMaxPoints = 500;

                        function updateTrail() {

                          // Removed: User found the breadcrumb trail confusing as a "goal line".

                        }



                        // â”€â”€ Navigation Challenge System (N key) â”€â”€

                        var navChallengeActive = false, navTargetX = 0, navTargetZ = 0, navTargetMesh = null;

                        var navCard = document.createElement('div');

                        navCard.style.cssText = 'position:absolute;bottom:56px;left:8px;background:rgba(0,0,0,0.88);backdrop-filter:blur(10px);border-radius:12px;padding:14px 18px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:none;z-index:12;border:1px solid rgba(167,139,250,0.4);max-width:280px;opacity:0;transition:opacity 0.4s;display:none';

                        canvasEl.parentElement.appendChild(navCard);

                        var NAV_CHALLENGES = [

                          { type: 'math_coord', cx: 120, cz: -160, mX: '60 \u00D7 2', mZ: '-80 \u00D7 2', prompt: 'Navigate to target coordinates. X = 60 \u00D7 2, Z = -80 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },

                          { type: 'math_coord', cx: -150, cz: 200, mX: '-300 \u00F7 2', mZ: '100 \u00D7 2', prompt: 'Navigate to target coordinates. X = -300 \u00F7 2, Z = 100 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },

                          { type: 'math_coord', cx: 250, cz: 80, mX: '125 + 125', mZ: '160 \u00F7 2', prompt: 'Navigate to target coordinates. X = 125 + 125, Z = 160 \u00F7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },

                          { type: 'math_coord', cx: 0, cz: -300, mX: '150 - 150', mZ: '-150 \u00D7 2', prompt: 'Navigate to target coordinates. X = 150 - 150, Z = -150 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },

                          { type: 'math_coord', cx: -220, cz: -180, mX: '-110 \u00D7 2', mZ: '-90 \u00D7 2', prompt: 'Navigate to target coordinates. X = -110 \u00D7 2, Z = -90 \u00D7 2. (Grid is /10)', skill: 'Cartesian Math', badge: '\uD83D\uDCCD' },

                          { type: 'distance', prompt: 'A relay beacon is 35m away at heading 045\u00B0 (NE). Calculate and navigate to its position.', bearing: 45, dist: 3.5, skill: 'Trigonometry & Bearing', badge: '\uD83D\uDCE1' },

                          { type: 'distance', prompt: 'Mission control reports a sample site 50m away at heading 270\u00B0 (W). Navigate there.', bearing: 270, dist: 5, skill: 'Vector Navigation', badge: '\uD83D\uDCE1' }

                        ];

                        var navChallengeIdx = 0, navCompletedCount = 0;

                        var navGoalLine = null;

                        function startNavChallenge() {

                          var ch = NAV_CHALLENGES[navChallengeIdx % NAV_CHALLENGES.length];

                          navChallengeActive = true;

                          if (ch.type === 'cardinal') { navTargetX = playerPos.x + ch.dx; navTargetZ = playerPos.z + ch.dz; }

                          else if (ch.type === 'coord') { navTargetX = ch.tx; navTargetZ = ch.tz; }

                          else if (ch.type === 'math_coord') { navTargetX = ch.cx / 10; navTargetZ = ch.cz / 10; }

                          else if (ch.type === 'distance') { var rad = ch.bearing * Math.PI / 180; navTargetX = playerPos.x + Math.sin(rad) * ch.dist; navTargetZ = playerPos.z - Math.cos(rad) * ch.dist; }

                          // Place target beacon

                          if (navTargetMesh) scene.remove(navTargetMesh);

                          var beamGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 8);

                          var beamMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.4 });

                          navTargetMesh = new THREE.Mesh(beamGeo, beamMat);

                          navTargetMesh.position.set(navTargetX, isGas ? 4 : 4, navTargetZ);

                          scene.add(navTargetMesh);



                          // Draw Direct Goal Line

                          if (navGoalLine) scene.remove(navGoalLine);

                          var pts = [new THREE.Vector3(playerPos.x, isGas ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isGas ? 4 : 0.5, navTargetZ)];

                          var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

                          navGoalLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xa78bfa, dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.8 }));

                          navGoalLine.computeLineDistances();

                          scene.add(navGoalLine);



                          // Show challenge card

                          navCard.innerHTML = '<div style="font-weight:bold;font-size:13px;color:#a78bfa;margin-bottom:6px">\uD83E\uDDED NAVIGATION CHALLENGE</div>' +

                            '<div style="color:#e2e8f0;margin-bottom:6px;line-height:1.5">' + ch.prompt + '</div>' +

                            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">' +

                            '<div style="background:rgba(167,139,250,0.15);border-radius:6px;padding:4px 6px;text-align:center"><div style="color:#a78bfa;font-weight:bold;font-size:12px" id="nav-dist">-- m</div><div style="color:#94a3b8;font-size:8px">DIST TO TARGET</div></div>' +

                            '<div style="background:rgba(167,139,250,0.15);border-radius:6px;padding:4px 6px;text-align:center"><div style="color:#a78bfa;font-weight:bold;font-size:12px" id="nav-bearing">--\u00B0</div><div style="color:#94a3b8;font-size:8px">BEARING</div></div>' +

                            '</div>' +

                            '<div style="margin-top:6px;color:#64748b;font-size:9px">\uD83C\uDF93 Skill: ' + ch.skill + ' \u2022 Press N to cancel</div>';

                          navCard.style.display = 'block';

                          setTimeout(function () { navCard.style.opacity = '1'; }, 10);

                        }

                        function cancelNavChallenge() {

                          navChallengeActive = false;

                          if (navTargetMesh) { scene.remove(navTargetMesh); navTargetMesh = null; }

                          if (navGoalLine) { scene.remove(navGoalLine); navGoalLine = null; }

                          navCard.style.opacity = '0'; setTimeout(function () { navCard.style.display = 'none'; }, 400);

                        }

                        function checkNavCompletion() {

                          if (!navChallengeActive) return;

                          var ndx = playerPos.x - navTargetX, ndz = playerPos.z - navTargetZ;

                          var nDist = Math.sqrt(ndx * ndx + ndz * ndz) * scaleFactor;

                          var nBearing = ((Math.atan2(navTargetX - playerPos.x, -(navTargetZ - playerPos.z)) * 180 / Math.PI) % 360 + 360) % 360;

                          var nDistEl = document.getElementById('nav-dist'); if (nDistEl) nDistEl.textContent = nDist.toFixed(0) + ' m';

                          var nBearEl = document.getElementById('nav-bearing'); if (nBearEl) nBearEl.textContent = Math.round(nBearing) + '\u00B0';

                          var tgtEl = document.getElementById('hud-tgt'); if (tgtEl) tgtEl.textContent = nDist.toFixed(0) + ' m';

                          if (nDist < 150) { // within ~3 world units

                            navCompletedCount++; navChallengeIdx++;

                            var ch = NAV_CHALLENGES[(navChallengeIdx - 1) % NAV_CHALLENGES.length];

                            navCard.innerHTML = '<div style="font-weight:bold;font-size:13px;color:#34d399;margin-bottom:4px">\u2705 TARGET REACHED!</div>' +

                              '<div style="color:#e2e8f0;margin-bottom:4px">Skill demonstrated: <span style="color:#a78bfa;font-weight:bold">' + ch.skill + '</span></div>' +

                              '<div style="color:#34d399;font-size:10px;font-weight:bold">\u2B50 +15 XP \u2022 ' + navCompletedCount + ' challenges completed</div>' +

                              '<div style="margin-top:4px;color:#64748b;font-size:9px">Press N for next challenge</div>';

                            if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 15);

                            navChallengeActive = false;

                            if (navTargetMesh) { navTargetMesh.material.color.setHex(0x34d399); navTargetMesh.material.opacity = 0.7; }

                            if (navGoalLine) { navGoalLine.material.color.setHex(0x34d399); }

                            setTimeout(function () { 

                              if (navTargetMesh) { scene.remove(navTargetMesh); navTargetMesh = null; } 

                              if (navGoalLine) { scene.remove(navGoalLine); navGoalLine = null; }

                            }, 3000);

                          }

                        }



                        // â”€â”€ Course Plotter System (P key) â”€â”€

                        var plotterVisible = false, plotterWaypoints = [], plotterRouteLine = null, plotterActiveWP = 0;

                        var plotterPanel = document.createElement('div');

                        plotterPanel.style.cssText = 'position:absolute;top:50%;right:8px;transform:translateY(-50%);background:rgba(0,0,0,0.92);backdrop-filter:blur(12px);border-radius:14px;padding:16px;color:#fff;font-family:sans-serif;font-size:11px;pointer-events:auto;z-index:14;border:1px solid rgba(56,189,248,0.3);width:260px;opacity:0;transition:opacity 0.3s;display:none';

                        plotterPanel.innerHTML = '<div style="font-weight:bold;font-size:14px;color:#38bdf8;margin-bottom:8px;letter-spacing:1px">\uD83D\uDDFA\uFE0F COURSE PLOTTER</div>' +

                          '<div style="color:#94a3b8;font-size:10px;margin-bottom:10px">Plan your traverse route like a NASA flight director. Enter waypoint coordinates (X, Z) to create a flight plan.</div>' +

                          '<div id="plotter-waypoints"></div>' +

                          '<div style="display:flex;gap:6px;margin-top:8px">' +

                          '<input id="wp-x" type="number" placeholder="X" style="width:60px;padding:4px 6px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.1);color:#fff;font-size:11px;font-family:monospace" />' +

                          '<input id="wp-z" type="number" placeholder="Z" style="width:60px;padding:4px 6px;border-radius:6px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.1);color:#fff;font-size:11px;font-family:monospace" />' +

                          '<button id="wp-add" style="padding:4px 10px;border-radius:6px;background:#38bdf8;color:#000;font-weight:bold;font-size:10px;border:none;cursor:pointer">+ Add</button>' +

                          '</div>' +

                          '<div style="display:flex;gap:6px;margin-top:8px">' +

                          '<button id="wp-launch" style="flex:1;padding:5px;border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-weight:bold;font-size:10px;border:none;cursor:pointer">\uD83D\uDE80 Launch Route</button>' +

                          '<button id="wp-clear" style="padding:5px 10px;border-radius:6px;background:rgba(239,68,68,0.2);color:#f87171;font-weight:bold;font-size:10px;border:1px solid rgba(239,68,68,0.3);cursor:pointer">Clear</button>' +

                          '</div>' +

                          '<div id="plotter-stats" style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(56,189,248,0.12);color:#94a3b8;font-size:9px"></div>';

                        canvasEl.parentElement.appendChild(plotterPanel);



                        // Wire plotter buttons

                        plotterPanel.querySelector('#wp-add').addEventListener('click', function () {

                          var xIn = plotterPanel.querySelector('#wp-x'), zIn = plotterPanel.querySelector('#wp-z');

                          var px = parseFloat(xIn.value), pz = parseFloat(zIn.value);

                          if (isNaN(px) || isNaN(pz)) return;

                          if (plotterWaypoints.length >= 5) return;

                          plotterWaypoints.push({ x: px / 10, z: pz / 10 }); // convert grid coords to world coords

                          xIn.value = ''; zIn.value = '';

                          refreshPlotterUI();

                        });

                        plotterPanel.querySelector('#wp-clear').addEventListener('click', function () {

                          plotterWaypoints = []; plotterActiveWP = 0;

                          if (plotterRouteLine) { scene.remove(plotterRouteLine); plotterRouteLine = null; }

                          plotterWPMeshes.forEach(function (m) { scene.remove(m); }); plotterWPMeshes = [];

                          refreshPlotterUI();

                        });

                        plotterPanel.querySelector('#wp-launch').addEventListener('click', function () {

                          if (plotterWaypoints.length < 2) return;

                          plotterActiveWP = 0;

                          drawPlotterRoute();

                          trailPositions = []; // reset trail for comparison

                        });

                        var plotterWPMeshes = [];

                        function refreshPlotterUI() {

                          var wpDiv = plotterPanel.querySelector('#plotter-waypoints');

                          if (!wpDiv) return;

                          wpDiv.innerHTML = plotterWaypoints.map(function (wp, i) {

                            var label = i === 0 ? '\uD83D\uDFE2 START' : i === plotterWaypoints.length - 1 ? '\uD83D\uDD34 END' : '\uD83D\uDD35 WP' + i;

                            return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(56,189,248,0.08)"><span style="color:#7dd3fc">' + label + '</span><span style="color:#e2e8f0;font-family:monospace">(' + (wp.x * 10).toFixed(0) + ', ' + (wp.z * 10).toFixed(0) + ')</span></div>';

                          }).join('');

                          // Calculate total distance

                          var total = 0;

                          for (var wi = 1; wi < plotterWaypoints.length; wi++) {

                            var ddx = plotterWaypoints[wi].x - plotterWaypoints[wi - 1].x, ddz = plotterWaypoints[wi].z - plotterWaypoints[wi - 1].z;

                            total += Math.sqrt(ddx * ddx + ddz * ddz) * scaleFactor;

                          }

                          var statsDiv = plotterPanel.querySelector('#plotter-stats');

                          if (statsDiv) statsDiv.innerHTML = '\uD83D\uDCCF Total distance: <span style="color:#38bdf8">' + total.toFixed(0) + ' m</span> \u2022 Waypoints: ' + plotterWaypoints.length + '/5';

                        }

                        function drawPlotterRoute() {

                          if (plotterRouteLine) scene.remove(plotterRouteLine);

                          plotterWPMeshes.forEach(function (m) { scene.remove(m); }); plotterWPMeshes = [];

                          var pts = plotterWaypoints.map(function (wp) { return new THREE.Vector3(wp.x, isGas ? 3 : 0.2, wp.z); });

                          if (pts.length > 1) {

                            var geo = new THREE.BufferGeometry().setFromPoints(pts);

                            plotterRouteLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x8b5cf6, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.7 }));

                            plotterRouteLine.computeLineDistances();

                            scene.add(plotterRouteLine);

                          }

                          // Place waypoint markers

                          plotterWaypoints.forEach(function (wp, i) {

                            var mpColor = i === 0 ? 0x34d399 : i === plotterWaypoints.length - 1 ? 0xef4444 : 0x60a5fa;

                            var mpGeo = new THREE.SphereGeometry(0.25, 8, 8);

                            var mp = new THREE.Mesh(mpGeo, new THREE.MeshBasicMaterial({ color: mpColor, transparent: true, opacity: 0.8 }));

                            mp.position.set(wp.x, isGas ? 3 : 0.5, wp.z);

                            scene.add(mp); plotterWPMeshes.push(mp);

                          });

                        }



                        // â”€â”€ Signal Triangulation System â”€â”€

                        var beacons = [

                          { x: 20, z: -15, name: 'Beacon Alpha', color: 0xff6b6b },

                          { x: -18, z: 20, name: 'Beacon Beta', color: 0x4ecdc4 },

                          { x: -15, z: -20, name: 'Beacon Gamma', color: 0xffd93d }

                        ];

                        var beaconMeshes = [];

                        beacons.forEach(function (bc) {

                          var tower = new THREE.Group();

                          var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 }));

                          pole.position.y = 2; tower.add(pole);

                          var light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: bc.color }));

                          light.position.y = 4.2; tower.add(light);

                          var ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 16), new THREE.MeshBasicMaterial({ color: bc.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));

                          ring.rotation.x = -Math.PI / 2; ring.position.y = 0.1; tower.add(ring);

                          tower.position.set(bc.x, 0, bc.z);

                          scene.add(tower); beaconMeshes.push({ group: tower, light: light, data: bc });

                        });

                        function getBeaconSignals() {

                          return beacons.map(function (bc) {

                            var dx = playerPos.x - bc.x, dz = playerPos.z - bc.z;

                            var dist = Math.sqrt(dx * dx + dz * dz);

                            var signal = Math.max(0, Math.round(100 / (1 + dist * 0.3)));

                            return { name: bc.name, signal: signal, dist: dist * scaleFactor, color: bc.color };

                          });

                        }



                        // â”€â”€ Skills Badge System â”€â”€

                        var badges = {

                          navigator: { name: '\uD83E\uDDED Navigator', desc: 'Complete 3 navigation challenges', req: function () { return navCompletedCount >= 3; }, earned: false },

                          flightDirector: { name: '\uD83D\uDCCB Flight Director', desc: 'Complete a course with 3+ waypoints', req: function () { return plotterWaypoints.length >= 3 && plotterActiveWP >= plotterWaypoints.length; }, earned: false },

                          fieldScientist: { name: '\uD83D\uDD2C Field Scientist', desc: 'Discover all points of interest', req: function () { return Object.keys(discoveredPOIs).length >= totalPOIs && totalPOIs > 0; }, earned: false },

                          planetologist: { name: '\uD83E\uDE90 Planetologist', desc: 'Score 5+ on planet quiz', req: function () { return (d.quiz && d.quiz.score >= 5); }, earned: false },

                          pilot: { name: '\u2708\uFE0F Pilot', desc: 'Travel 500+ meters total', req: function () { return odometer >= 500; }, earned: false },

                          safetyOfficer: { name: '\u26A0\uFE0F Safety Officer', desc: 'Read 5+ hazard warnings', req: function () { return hazardIdx >= 5; }, earned: false }

                        };

                        function checkBadges() {

                          Object.keys(badges).forEach(function (key) {

                            var b = badges[key];

                            if (!b.earned && b.req()) {

                              b.earned = true;

                              if (typeof addToast === 'function') addToast('\uD83C\uDFC5 Badge Earned: ' + b.name + ' \u2014 ' + b.desc, 'success');

                              if (typeof awardStemXP === 'function') awardStemXP('solarSystem', 25);

                            }

                          });

                        }



                        // â”€â”€ Animation loop with 3rd-person + compass â”€â”€

                        function animate3dV2() {

                          animId3d = requestAnimationFrame(animate3dV2);

                          tick3d++;

                          // Movement

                          var dir = new THREE.Vector3();

                          if (moveState.forward) dir.z -= 1;

                          if (moveState.back) dir.z += 1;

                          if (moveState.left) dir.x -= 1;

                          if (moveState.right) dir.x += 1;

                          dir.normalize().multiplyScalar(speed3d);

                          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

                          playerPos.add(dir);

                          if (moveState.up) playerPos.y += speed3d;

                          if (moveState.down) playerPos.y = Math.max(isGas ? 1 : 1.0, playerPos.y - speed3d);

                          if (!isGas) playerPos.y = Math.max(1.6, playerPos.y);



                          if (thirdPerson) {

                            // 3rd person: camera behind and above

                            var behind = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(6);

                            camera.position.set(playerPos.x + behind.x, playerPos.y + 3, playerPos.z + behind.z);

                            camera.lookAt(playerPos.x, playerPos.y, playerPos.z);

                          } else {

                            camera.position.copy(playerPos);

                            camera.rotation.order = 'YXZ';

                            camera.rotation.y = yaw;

                            camera.rotation.x = pitch;

                          }



                          // Animate clouds

                          scene.children.forEach(function (c) {

                            if (c._cloudSpeed) {

                              c.position.x = Math.sin(tick3d * c._cloudSpeed) * 2;

                              c.position.z = Math.cos(tick3d * c._cloudSpeed * 0.7) * 1.5;

                            }

                          });



                          // Diamond rain

                          if (typeof diamonds !== 'undefined' && diamonds) {

                            var dArr = diamonds.geometry.attributes.position.array;

                            for (var dri = 0; dri < dArr.length; dri += 3) {

                              dArr[dri + 1] -= 0.05;

                              if (dArr[dri + 1] < -5) dArr[dri + 1] = 20;

                            }

                            diamonds.geometry.attributes.position.needsUpdate = true;

                          }



                          // Update compass bearing

                          var deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;

                          var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

                          var dirLabel = dirs[Math.round(deg / 45) % 8];

                          compass.textContent = dirLabel;



                          // â”€â”€ Live telemetry updates (every 3 frames for perf) â”€â”€

                          if (tick3d % 3 === 0) {

                            var dx = playerPos.x - prevPos.x, dz = playerPos.z - prevPos.z, dy = playerPos.y - prevPos.y;

                            var frameDist = Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;

                            odometer += frameDist;

                            lastSpeed = frameDist * 20; // ~60fps/3 = 20 updates/s

                            prevPos.copy(playerPos);



                            var altEl = document.getElementById('hud-alt');

                            var spdEl = document.getElementById('hud-spd');

                            var hdgEl = document.getElementById('hud-hdg');

                            var posEl = document.getElementById('hud-pos');

                            var odoEl = document.getElementById('hud-odo');

                            var dscEl = document.getElementById('hud-disc');

                            var altitude = ((playerPos.y - (isGas ? 0 : 1.6)) * scaleFactor).toFixed(0);

                            if (altEl) altEl.textContent = altitude + ' m';

                            if (spdEl) spdEl.textContent = lastSpeed.toFixed(1) + ' m/s';

                            if (hdgEl) hdgEl.textContent = dirLabel + ' ' + Math.round(deg) + '\u00B0';

                            if (posEl) posEl.textContent = (playerPos.x * 10).toFixed(1) + ', ' + (playerPos.z * 10).toFixed(1);

                            if (odoEl) odoEl.textContent = odometer > 1000 ? (odometer / 1000).toFixed(1) + ' km' : Math.round(odometer) + ' m';

                            if (dscEl) dscEl.textContent = Object.keys(discoveredPOIs).length + ' / ' + totalPOIs;

                          }



                          // â”€â”€ Update Goal Line Dynamic Vertex â”€â”€

                          if (navChallengeActive && navGoalLine) {

                            var pts = [new THREE.Vector3(playerPos.x, isGas ? playerPos.y - 0.5 : 0.5, playerPos.z), new THREE.Vector3(navTargetX, isGas ? 4 : 0.5, navTargetZ)];

                            navGoalLine.geometry.setFromPoints(pts);

                            navGoalLine.computeLineDistances();

                          }



                          // â”€â”€ POI proximity detection (every 10 frames) â”€â”€

                          if (tick3d % 10 === 0) {

                            for (var pi2 = 0; pi2 < pois.length; pi2++) {

                              var poi = pois[pi2];

                              var pdx = playerPos.x - poi.x, pdz = playerPos.z - poi.z;

                              var poiDist = Math.sqrt(pdx * pdx + pdz * pdz);

                              if (poiDist < 4 && !discoveredPOIs[pi2]) {

                                showDiscovery(poi, pi2);

                                // Update mission card objectives

                                var objEl = document.getElementById('obj-' + pi2);

                                if (objEl) { objEl.innerHTML = '\u2611 <span style="color:#34d399;text-decoration:line-through">' + poi.name + '</span> \u2714'; }

                                var dcEl = document.getElementById('mission-disc-count');

                                if (dcEl) dcEl.textContent = Object.keys(discoveredPOIs).length + '/' + totalPOIs;

                                var xpEl = document.getElementById('mission-xp-count');

                                if (xpEl) xpEl.textContent = (Object.keys(discoveredPOIs).length * 10) + '';

                              }

                            }

                          }



                          // â”€â”€ Feature updates (trail, nav, plotter, badges) â”€â”€

                          if (tick3d % 5 === 0) updateTrail();

                          if (tick3d % 10 === 0) { checkNavCompletion(); checkBadges(); }

                          // Pulse beacon lights

                          beaconMeshes.forEach(function (bm) { bm.light.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.5; });

                          // Pulse nav target

                          if (navTargetMesh) { navTargetMesh.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.08)) * 0.5; navTargetMesh.rotation.y = tick3d * 0.02; }



                          // â”€â”€ Pulse POI markers (animate opacity) â”€â”€

                          poiMeshes.forEach(function (m) {

                            if (m._pulsePhase !== undefined) {

                              m.material.opacity = 0.2 + Math.abs(Math.sin(tick3d * 0.03 + m._pulsePhase)) * 0.3;

                            } else if (m._poiIdx !== undefined && discoveredPOIs[m._poiIdx]) {

                              m.material.color.setHex(0x34d399); // green when discovered

                              m.material.opacity = 0.4;

                            } else if (m._poiIdx !== undefined) {

                              m.material.opacity = 0.5 + Math.abs(Math.sin(tick3d * 0.05)) * 0.3;

                            }

                          });



                          // â”€â”€ Update rover/probe model position â”€â”€

                          roverGroup.position.x = playerPos.x;

                          roverGroup.position.z = playerPos.z;

                          if (!isGas) {

                            roverGroup.position.y = 0; // wheels on ground

                            roverGroup.rotation.y = yaw + Math.PI; // face movement direction

                          } else {

                            roverGroup.position.y = playerPos.y - 0.5;

                            roverGroup.rotation.y = yaw + Math.PI;

                            // Probe lights blink

                            if (redLight && greenLight) {

                              redLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 1.0 : 0.1;

                              greenLight.material.emissiveIntensity = Math.sin(tick3d * 0.1) > 0 ? 0.1 : 1.0;

                            }

                          }

                          // Hide rover in 1st person, show in 3rd

                          roverGroup.visible = thirdPerson;



                          renderer.render(scene, camera);

                        }

                        animId3d = requestAnimationFrame(animate3dV2);



                        // Resize handler

                        var ro3d = new ResizeObserver(function () {

                          W = canvasEl.clientWidth; H = canvasEl.clientHeight;

                          if (W && H) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); }

                        });

                        ro3d.observe(canvasEl);



                        canvasEl._droneCleanup = function () {

                          cancelAnimationFrame(animId3d);

                          clearInterval(factTimer);

                          clearInterval(hazardTimer);

                          document.removeEventListener('mousemove', onMouseMove);

                          if (document.pointerLockElement === canvasEl) document.exitPointerLock();

                          ro3d.disconnect();

                          renderer.dispose();

                          if (hud.parentElement) hud.parentElement.removeChild(hud);

                          if (ticker.parentElement) ticker.parentElement.removeChild(ticker);

                          if (compass.parentElement) compass.parentElement.removeChild(compass);

                          if (hazardEl.parentElement) hazardEl.parentElement.removeChild(hazardEl);

                          if (discCard.parentElement) discCard.parentElement.removeChild(discCard);

                          if (missionCard.parentElement) missionCard.parentElement.removeChild(missionCard);

                          if (discTimeout) clearTimeout(discTimeout);

                          if (navCard.parentElement) navCard.parentElement.removeChild(navCard);

                          if (plotterPanel.parentElement) plotterPanel.parentElement.removeChild(plotterPanel);

                          if (trailLine) scene.remove(trailLine);

                          if (navTargetMesh) scene.remove(navTargetMesh);

                          if (plotterRouteLine) scene.remove(plotterRouteLine);

                          plotterWPMeshes.forEach(function (m) { scene.remove(m); });

                          beaconMeshes.forEach(function (bm) { scene.remove(bm.group); });

                        };

                        canvasEl._droneRO = ro3d;

                      }



                      // Load Three.js and init

                      if (window.THREE) { doInit(window.THREE); }

                      else {

                        var s = document.createElement('script');

                        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

                        s.onload = function () { doInit(window.THREE); };

                        document.head.appendChild(s);

                      }

                    }

                  }),

                  // â”€â”€ Quiz Mode â”€â”€

                  React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("button", {

                        onClick: () => {

                          const QUIZ_QS = [

                            { q: 'Which planet is the hottest?', a: t('stem.solar_sys.venus'), opts: [t('stem.periodic.mercury'), t('stem.solar_sys.venus'), t('stem.solar_sys.mars'), t('stem.solar_sys.jupiter')], tip: 'Venus has a runaway greenhouse effect reaching 462\u00B0C!' },

                            { q: 'Which planet has the most moons?', a: t('stem.solar_sys.saturn'), opts: [t('stem.solar_sys.jupiter'), t('stem.solar_sys.saturn'), t('stem.solar_sys.uranus'), t('stem.solar_sys.neptune')], tip: 'Saturn has 146 known moons as of 2024!' },

                            { q: 'Which planet rotates on its side?', a: t('stem.solar_sys.uranus'), opts: [t('stem.solar_sys.neptune'), t('stem.solar_sys.uranus'), t('stem.solar_sys.saturn'), t('stem.solar_sys.pluto')], tip: 'Uranus has an axial tilt of 97.77\u00B0!' },

                            { q: 'Which is the smallest planet?', a: t('stem.periodic.mercury'), opts: [t('stem.periodic.mercury'), t('stem.solar_sys.mars'), t('stem.solar_sys.pluto'), t('stem.solar_sys.venus')], tip: 'Mercury is only 4,879 km in diameter.' },

                            { q: 'Which planet has the longest year?', a: t('stem.solar_sys.pluto'), opts: [t('stem.solar_sys.neptune'), t('stem.solar_sys.pluto'), t('stem.solar_sys.uranus'), t('stem.solar_sys.saturn')], tip: 'Pluto takes 248 Earth years to orbit the Sun!' },

                            { q: 'Which planet has the shortest day?', a: t('stem.solar_sys.jupiter'), opts: [t('stem.solar_sys.jupiter'), t('stem.solar_sys.saturn'), t('stem.solar_sys.earth'), t('stem.solar_sys.mars')], tip: 'Jupiter rotates in just 10 hours!' },

                            { q: 'Which planet is known as the Red Planet?', a: t('stem.solar_sys.mars'), opts: [t('stem.solar_sys.venus'), t('stem.solar_sys.mars'), t('stem.periodic.mercury'), t('stem.solar_sys.jupiter')], tip: 'Iron oxide (rust) gives Mars its red color.' },

                            { q: 'Which planet could float in water?', a: t('stem.solar_sys.saturn'), opts: [t('stem.solar_sys.jupiter'), t('stem.solar_sys.saturn'), t('stem.solar_sys.neptune'), t('stem.solar_sys.uranus')], tip: 'Saturn\u2019s density is less than water (0.687 g/cm\u00B3)!' },

                            { q: 'Where is the tallest volcano in the solar system?', a: t('stem.solar_sys.mars'), opts: [t('stem.solar_sys.earth'), t('stem.solar_sys.venus'), t('stem.solar_sys.mars'), t('stem.solar_sys.jupiter')], tip: 'Olympus Mons on Mars is 21.9 km high \u2014 nearly 3x Everest!' },

                            { q: 'Which planet has the strongest winds?', a: t('stem.solar_sys.neptune'), opts: [t('stem.solar_sys.jupiter'), t('stem.solar_sys.saturn'), t('stem.solar_sys.neptune'), t('stem.solar_sys.uranus')], tip: 'Neptune\u2019s winds reach 2,100 km/h!' },

                          ];

                          const q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];

                          upd('quiz', { ...q, answered: false, correct: null, score: d.quiz?.score || 0, streak: d.quiz?.streak || 0 });

                        }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white') + " hover:opacity-90 transition-all"

                      }, d.quiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),

                      d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct | \uD83D\uDD25 " + d.quiz.streak + " streak")

                    ),

                    d.quiz && React.createElement("div", { className: "bg-indigo-50 rounded-xl p-4 border border-indigo-200 animate-in slide-in-from-bottom" },

                      React.createElement("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, d.quiz.q),

                      React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                        d.quiz.opts.map(function (opt) {

                          var isCorrect = opt === d.quiz.a;

                          var wasChosen = d.quiz.chosen === opt;

                          var cls = !d.quiz.answered ? 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : wasChosen && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-500 border-slate-200';

                          return React.createElement("button", {

                            key: opt, disabled: d.quiz.answered, onClick: function () {

                              var correct = opt === d.quiz.a;

                              upd('quiz', Object.assign({}, d.quiz, { answered: true, correct: correct, chosen: opt, score: d.quiz.score + (correct ? 1 : 0), streak: correct ? d.quiz.streak + 1 : 0 }));

                              if (correct) addToast(t('stem.planet_quiz.u2705_correct') + d.quiz.tip, 'success');

                              else addToast(t('stem.planet_quiz.u274c_the_answer_is') + d.quiz.a + '. ' + d.quiz.tip, 'error');

                            }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                          }, opt);

                        })

                      ),

                      d.quiz.answered && React.createElement("p", { className: "mt-2 text-xs text-indigo-600 italic" }, "\uD83D\uDCA1 " + d.quiz.tip)

                    ),

                    // â”€â”€ Planet Comparison â”€â”€

                    React.createElement("div", { className: "mt-3" },

                      React.createElement("p", { className: "text-xs font-bold text-slate-500 mb-1" }, "\uD83D\uDD0D Compare Planets"),

                      React.createElement("div", { className: "flex gap-2 mb-2" },

                        React.createElement("select", { 'aria-label': 'First planet to compare', value: d.compare1 || '', onChange: function (e) { upd('compare1', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },

                          React.createElement("option", { value: "" }, "Select..."),

                          PLANETS.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.name); })

                        ),

                        React.createElement("span", { className: "text-slate-500 font-bold self-center" }, "vs"),

                        React.createElement("select", { 'aria-label': 'Second planet to compare', value: d.compare2 || '', onChange: function (e) { upd('compare2', e.target.value); }, className: "flex-1 px-2 py-1 border rounded text-sm" },

                          React.createElement("option", { value: "" }, "Select..."),

                          PLANETS.map(function (p) { return React.createElement("option", { key: p.name, value: p.name }, p.name); })

                        )

                      ),

                      d.compare1 && d.compare2 && (function () {

                        var p1 = PLANETS.find(function (p) { return p.name === d.compare1; });

                        var p2 = PLANETS.find(function (p) { return p.name === d.compare2; });

                        if (!p1 || !p2) return null;

                        var GRAVITY = { Mercury: 0.38, Venus: 0.91, Earth: 1.0, Mars: 0.38, Jupiter: 2.34, Saturn: 1.06, Uranus: 0.92, Neptune: 1.19, Pluto: 0.06 };

                        return React.createElement("div", { className: "grid grid-cols-3 gap-1 text-center text-xs" },

                          [['', p1.name, p2.name], ['\uD83C\uDF21 Temp', p1.temp, p2.temp], ['\u2600 Day', p1.dayLen, p2.dayLen], ['\uD83C\uDF0D Year', p1.yearLen, p2.yearLen], ['\uD83D\uDCCF Size', p1.diameter, p2.diameter], ['\uD83C\uDF11 Moons', p1.moons, p2.moons], ['\u2696 Gravity', (GRAVITY[p1.name] || 1).toFixed(2) + 'g', (GRAVITY[p2.name] || 1).toFixed(2) + 'g'], ['\uD83E\uDDD1 70kg on', Math.round(70 * (GRAVITY[p1.name] || 1)) + 'kg', Math.round(70 * (GRAVITY[p2.name] || 1)) + 'kg']].map(function (row, ri) {

                            return React.createElement(React.Fragment, { key: ri },

                              row.map(function (cell, ci) {

                                return React.createElement("div", { key: ci, className: "py-1 " + (ri === 0 ? 'font-black text-slate-700' : ci === 0 ? 'font-bold text-slate-500' : 'font-bold text-slate-700') + (ri > 0 && ri % 2 === 0 ? ' bg-slate-50' : '') }, cell);

                              })

                            );

                          })

                        );

                      })()

                    )

                  ),

                ),

              ),

              // === MOON EXPLORER ===
              sel && NOTABLE_MOONS[sel.name] && React.createElement("div", { className: "mt-4 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, "\uD83C\uDF19 Moons of " + sel.name + " (" + sel.moons + " total)"),
                  React.createElement("button", {
                    onClick: function() { upd('showMoons', !d.showMoons); },
                    className: "text-[10px] text-indigo-500 hover:text-indigo-700"
                  }, d.showMoons ? 'Hide' : 'Explore \u2192')
                ),
                d.showMoons && React.createElement("div", { className: "space-y-2" },
                  (NOTABLE_MOONS[sel.name] || []).map(function(moon, mi) {
                    return React.createElement("div", { key: mi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-indigo-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center justify-between mb-1" },
                        React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, "\uD83C\uDF11 " + moon.name),
                        React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full " + (isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-600') }, moon.type)
                      ),
                      React.createElement("div", { className: "grid grid-cols-2 gap-1 text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " mb-1" },
                        React.createElement("span", null, "\uD83D\uDCCF " + moon.diameter),
                        React.createElement("span", null, "\uD83D\uDCCD " + moon.dist + " from " + sel.name)
                      ),
                      React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " italic" }, moon.fact),
                      React.createElement("button", {
                        onClick: function() { speakText(moon.name + '. ' + moon.fact); },
                        className: "mt-1 text-[10px] text-indigo-400 hover:text-indigo-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              ),

              // === NIGHT SKY FROM SURFACE ===
              sel && SKY_VIEWS[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-900') + " rounded-xl p-3 border border-slate-700" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-sky-300" }, "\uD83C\uDF03 Night Sky from " + sel.name),
                  React.createElement("button", {
                    onClick: function() { upd('showSky', !d.showSky); },
                    className: "text-[10px] text-sky-400 hover:text-sky-200"
                  }, d.showSky ? 'Hide' : 'View \u2192')
                ),
                d.showSky && React.createElement("div", { className: "space-y-2" },
                  React.createElement("div", { className: "text-[10px] text-sky-200" },
                    React.createElement("div", { className: "mb-1" }, "\u2600\uFE0F Sun appears: " + SKY_VIEWS[sel.name].sunSize),
                    React.createElement("div", { className: "mb-1 font-bold text-sky-300" }, "Visible objects:"),
                    React.createElement("div", { className: "pl-2 space-y-0.5" },
                      SKY_VIEWS[sel.name].visible.map(function(v, vi) {
                        return React.createElement("div", { key: vi, className: "text-sky-100" }, "\u2022 " + v);
                      })
                    ),
                    React.createElement("div", { className: "mt-2 text-sky-400 italic border-t border-slate-700 pt-2" }, SKY_VIEWS[sel.name].note)
                  ),
                  // Simple star field canvas
                  React.createElement("canvas", {
                    style: { width: '100%', height: '80px', display: 'block', borderRadius: '8px' },
                    ref: function(skyEl) {
                      if (!skyEl || skyEl._skyInit === sel.name) return;
                      skyEl._skyInit = sel.name;
                      var skyCtx = skyEl.getContext('2d');
                      var SW = skyEl.offsetWidth || 300, SH = 80;
                      skyEl.width = SW * 2; skyEl.height = SH * 2; skyCtx.scale(2, 2);
                      var skyTick = 0;
                      function drawSky() {
                        skyTick++;
                        skyCtx.fillStyle = '#020210';
                        skyCtx.fillRect(0, 0, SW, SH);
                        // Stars
                        for (var ss = 0; ss < 80; ss++) {
                          skyCtx.globalAlpha = 0.2 + 0.3 * Math.sin(skyTick * 0.02 + ss * 1.3);
                          skyCtx.fillStyle = ss % 7 === 0 ? '#fbbf24' : ss % 11 === 0 ? '#67e8f9' : '#fff';
                          skyCtx.beginPath();
                          skyCtx.arc((ss * 73 + 13) % SW, (ss * 41 + 7) % SH, ss % 5 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
                          skyCtx.fill();
                        }
                        skyCtx.globalAlpha = 1;
                        // Sun (sized per planet)
                        var sunSizes = { Mercury: 8, Venus: 6, Earth: 5, Mars: 3.5, Jupiter: 1.5, Saturn: 1, Uranus: 0.5, Neptune: 0.4, Pluto: 0.3 };
                        var sunR = sunSizes[sel.name] || 3;
                        var sunX = SW * 0.15, sunY = SH * 0.5;
                        var sunGlow = skyCtx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4);
                        sunGlow.addColorStop(0, '#fbbf24');
                        sunGlow.addColorStop(0.3, '#fbbf2440');
                        sunGlow.addColorStop(1, 'transparent');
                        skyCtx.fillStyle = sunGlow;
                        skyCtx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);
                        skyCtx.fillStyle = '#fef3c7';
                        skyCtx.beginPath();
                        skyCtx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
                        skyCtx.fill();
                        // Label
                        skyCtx.fillStyle = '#94a3b8';
                        skyCtx.font = '8px system-ui';
                        skyCtx.textAlign = 'center';
                        skyCtx.fillText('View from ' + sel.name + '\'s surface', SW * 0.5, SH - 4);
                        requestAnimationFrame(drawSky);
                      }
                      drawSky();
                    }
                  })
                )
              ),

              // === ATMOSPHERE DESCENT SIMULATOR ===
              sel && DESCENT_LAYERS[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-blue-50 to-orange-50 border-blue-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-blue-300' : 'text-blue-700') }, "\uD83E\uDE82 Atmosphere Descent \u2014 " + sel.name),
                  React.createElement("button", {
                    onClick: function() { upd('showDescent', !d.showDescent); if (!d.descentAlt && d.descentAlt !== 0) upd('descentAlt', 100); },
                    className: "text-[10px] text-blue-500 hover:text-blue-700"
                  }, d.showDescent ? 'Hide' : 'Descend \u2192')
                ),
                d.showDescent && React.createElement("div", null,
                  // Altitude slider
                  React.createElement("div", { className: "mb-2" },
                    React.createElement("input", {
                      type: "range", min: "0", max: "100",
                      value: d.descentAlt !== undefined ? d.descentAlt : 100,
                      'aria-label': 'Descent altitude',
                      onChange: function(e) { upd('descentAlt', parseInt(e.target.value)); },
                      className: "w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer",
                      style: { direction: 'rtl' } // 100 = top, 0 = bottom
                    }),
                    React.createElement("div", { className: "flex justify-between text-[9px] " + (isDark ? 'text-slate-400' : 'text-slate-500') },
                      React.createElement("span", null, "Surface"),
                      React.createElement("span", null, "High Atmosphere")
                    )
                  ),
                  // Current layer display
                  (function() {
                    var layers = DESCENT_LAYERS[sel.name];
                    var pct = (d.descentAlt !== undefined ? d.descentAlt : 100) / 100;
                    var layerIdx = Math.min(layers.length - 1, Math.floor((1 - pct) * layers.length));
                    var layer = layers[layerIdx];
                    return React.createElement("div", {
                      className: "rounded-lg p-3 text-center transition-all duration-300",
                      style: { background: layer.color + '30', borderLeft: '4px solid ' + layer.color }
                    },
                      React.createElement("div", { className: "text-sm font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, layer.name),
                      React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " mt-1" }, layer.desc),
                      React.createElement("div", { className: "flex justify-center gap-4 mt-2 text-[10px]" },
                        React.createElement("span", { className: "text-red-500 font-bold" }, "\uD83C\uDF21 " + layer.temp),
                        React.createElement("span", { className: "text-blue-500 font-bold" }, "\u2696 " + layer.pressure),
                        React.createElement("span", { className: "text-slate-500" }, "\u2195 " + (layer.alt >= 0 ? layer.alt + ' km' : Math.abs(layer.alt) + ' km deep'))
                      )
                    );
                  })(),
                  // Visual depth indicator
                  React.createElement("div", { className: "mt-2 flex gap-0.5", style: { height: '24px' } },
                    (DESCENT_LAYERS[sel.name] || []).map(function(layer, li) {
                      var pct2 = (d.descentAlt !== undefined ? d.descentAlt : 100) / 100;
                      var layerIdx2 = Math.min(DESCENT_LAYERS[sel.name].length - 1, Math.floor((1 - pct2) * DESCENT_LAYERS[sel.name].length));
                      return React.createElement("div", {
                        key: li,
                        className: "flex-1 rounded transition-all",
                        style: {
                          background: layer.color,
                          opacity: li === layerIdx2 ? 1 : 0.3,
                          transform: li === layerIdx2 ? 'scaleY(1.3)' : 'scaleY(1)'
                        },
                        title: layer.name
                      });
                    })
                  )
                )
              ),

              // === SCALE COMPARISON ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, "\uD83D\uDCCF Planet Size Comparison"),
                  React.createElement("button", {
                    onClick: function() { upd('showScale', !d.showScale); },
                    className: "text-[10px] text-emerald-500 hover:text-emerald-700"
                  }, d.showScale ? 'Hide' : 'Show \u2192')
                ),
                d.showScale && React.createElement("div", { className: "space-y-1" },
                  PLANETS.map(function(p) {
                    var maxR = PLANET_RADII.Jupiter;
                    var pctWidth = Math.max(2, (PLANET_RADII[p.name] || 1000) / maxR * 100);
                    var isSel = sel && sel.name === p.name;
                    return React.createElement("div", { key: p.name, className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-[10px] w-16 text-right " + (isSel ? 'font-bold ' : '') + (isDark ? 'text-slate-300' : 'text-slate-600') }, p.emoji + ' ' + p.name),
                      React.createElement("div", { className: "flex-1 h-3 bg-slate-200 rounded-full overflow-hidden", style: { minWidth: 0 } },
                        React.createElement("div", {
                          className: "h-full rounded-full transition-all",
                          style: { width: pctWidth + '%', background: p.color, opacity: isSel ? 1 : 0.6 }
                        })
                      ),
                      React.createElement("span", { className: "text-[9px] w-14 " + (isDark ? 'text-slate-400' : 'text-slate-500') }, (PLANET_RADII[p.name] || '?').toLocaleString() + ' km')
                    );
                  })
                )
              ),

              // === ORBITAL MECHANICS MINI-LESSON ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-purple-300' : 'text-purple-700') }, "\uD83C\uDF0C Orbital Mechanics"),
                  React.createElement("button", {
                    onClick: function() { upd('showOrbital', !d.showOrbital); },
                    className: "text-[10px] text-purple-500 hover:text-purple-700"
                  }, d.showOrbital ? 'Hide' : 'Learn \u2192')
                ),
                d.showOrbital && React.createElement("div", { className: "space-y-3" },
                  // Kepler's Laws
                  React.createElement("div", { className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2.5 border " + (isDark ? 'border-slate-600' : 'border-purple-100') },
                    React.createElement("div", { className: "text-[10px] font-bold " + (isDark ? 'text-purple-300' : 'text-purple-700') + " mb-1" }, "Kepler\u2019s Three Laws of Planetary Motion"),
                    React.createElement("div", { className: "space-y-1.5 text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      React.createElement("div", null, "\u2460 Orbits are ellipses with the Sun at one focus (not circles!)"),
                      React.createElement("div", null, "\u2461 A planet sweeps equal areas in equal times (faster when closer to Sun)"),
                      React.createElement("div", null, "\u2462 T\u00B2 \u221D a\u00B3 \u2014 orbital period squared is proportional to distance cubed")
                    )
                  ),
                  // Orbital speed visualization
                  React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " font-bold mb-1" }, "Orbital Speed (relative to Earth):"),
                  React.createElement("div", { className: "space-y-1" },
                    PLANETS.map(function(p) {
                      var speedPct = Math.min(100, p.speed / 4.15 * 100); // Mercury is fastest
                      var isSel2 = sel && sel.name === p.name;
                      return React.createElement("div", { key: p.name, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-[9px] w-14 text-right " + (isSel2 ? 'font-bold ' : '') + (isDark ? 'text-slate-400' : 'text-slate-500') }, p.emoji + ' ' + p.name),
                        React.createElement("div", { className: "flex-1 h-2 " + (isDark ? 'bg-slate-700' : 'bg-purple-100') + " rounded-full overflow-hidden" },
                          React.createElement("div", {
                            className: "h-full rounded-full",
                            style: { width: speedPct + '%', background: 'linear-gradient(to right, #8b5cf6, #a78bfa)', opacity: isSel2 ? 1 : 0.5 }
                          })
                        ),
                        React.createElement("span", { className: "text-[9px] w-12 " + (isDark ? 'text-slate-400' : 'text-slate-500') }, (p.speed * 29.78).toFixed(1) + ' km/s')
                      );
                    })
                  )
                )
              ),

              // === PLANET BUILDER ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-pink-300' : 'text-pink-700') }, "\uD83C\uDFD7 Planet Builder"),
                  React.createElement("button", {
                    onClick: function() { upd('showBuilder', !d.showBuilder); },
                    className: "text-[10px] text-pink-500 hover:text-pink-700"
                  }, d.showBuilder ? 'Hide' : 'Build \u2192')
                ),
                d.showBuilder && React.createElement("div", { className: "space-y-2" },
                  React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic mb-1" }, "Design your own hypothetical planet!"),
                  // Mass slider
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') }, "\u2696 Mass (Earth masses): " + (d.buildMass || 1)),
                    React.createElement("input", { type: "range", min: "0.1", max: "300", step: "0.1", value: d.buildMass || 1, 'aria-label': 'Planet mass in Earth masses', onChange: function(e) { upd('buildMass', parseFloat(e.target.value)); }, className: "w-full h-1.5 bg-pink-200 rounded-lg appearance-none" })
                  ),
                  // Distance slider
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') }, "\uD83D\uDCCF Distance from star (AU): " + (d.buildDist || 1)),
                    React.createElement("input", { type: "range", min: "0.1", max: "50", step: "0.1", value: d.buildDist || 1, 'aria-label': 'Distance from star in AU', onChange: function(e) { upd('buildDist', parseFloat(e.target.value)); }, className: "w-full h-1.5 bg-pink-200 rounded-lg appearance-none" })
                  ),
                  // Atmosphere toggle
                  React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("label", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " flex items-center gap-1" },
                      React.createElement("input", { type: "checkbox", checked: d.buildAtmo || false, onChange: function() { upd('buildAtmo', !d.buildAtmo); }, className: "rounded" }),
                      "Has atmosphere"
                    ),
                    React.createElement("label", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " flex items-center gap-1" },
                      React.createElement("input", { type: "checkbox", checked: d.buildWater || false, onChange: function() { upd('buildWater', !d.buildWater); }, className: "rounded" }),
                      "Has liquid water"
                    ),
                    React.createElement("label", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " flex items-center gap-1" },
                      React.createElement("input", { type: "checkbox", checked: d.buildMag || false, onChange: function() { upd('buildMag', !d.buildMag); }, className: "rounded" }),
                      "Magnetic field"
                    )
                  ),
                  // Results
                  (function() {
                    var mass = d.buildMass || 1;
                    var dist = d.buildDist || 1;
                    var hasAtmo = d.buildAtmo || false;
                    var hasWater = d.buildWater || false;
                    var hasMag = d.buildMag || false;
                    // Calculate properties
                    var surfaceGrav = Math.pow(mass, 0.5).toFixed(2); // simplified
                    var orbitalPeriod = Math.pow(dist, 1.5).toFixed(1); // Kepler's 3rd law
                    var surfaceTemp = Math.round(255 / Math.pow(dist, 0.5) * (hasAtmo ? 1.15 : 0.85) - 273); // simplified
                    var escapeVel = (11.2 * Math.pow(mass, 0.5)).toFixed(1);
                    var habitable = dist >= 0.8 && dist <= 1.5 && hasAtmo && hasWater && mass >= 0.5 && mass <= 5;
                    var planetType = mass > 50 ? 'Gas Giant' : mass > 10 ? 'Ice Giant' : mass > 2 ? 'Super-Earth' : mass > 0.5 ? 'Terrestrial' : 'Dwarf Planet';
                    return React.createElement("div", { className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-pink-100') + " rounded-lg p-2.5 border mt-1" },
                      React.createElement("div", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') + " mb-1" }, "\uD83C\uDF0D Your Planet: " + planetType),
                      React.createElement("div", { className: "grid grid-cols-2 gap-1 text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                        React.createElement("span", null, "\u2696 Surface gravity: " + surfaceGrav + "g"),
                        React.createElement("span", null, "\uD83C\uDF0C Orbital period: " + orbitalPeriod + " years"),
                        React.createElement("span", null, "\uD83C\uDF21 Surface temp: ~" + surfaceTemp + "\u00B0C"),
                        React.createElement("span", null, "\uD83D\uDE80 Escape velocity: " + escapeVel + " km/s")
                      ),
                      React.createElement("div", {
                        className: "mt-1.5 text-[10px] font-bold text-center py-1 rounded " + (habitable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                      }, habitable ? '\u2705 HABITABLE ZONE! Life could exist here!' : '\u274C Not in habitable zone' + (dist < 0.8 ? ' (too hot)' : dist > 1.5 ? ' (too cold)' : !hasAtmo ? ' (no atmosphere)' : !hasWater ? ' (no water)' : mass < 0.5 ? ' (too small to hold atmosphere)' : ' (too massive \u2014 gas giant)'))
                    );
                  })()
                )
              ),

                            // === EXOPLANET COMPARISON ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-teal-50 border-teal-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-teal-300' : 'text-teal-700') }, "\uD83C\uDF0C Exoplanet Comparison"),
                  React.createElement("button", {
                    onClick: function() { upd('showExo', !d.showExo); },
                    className: "text-[10px] text-teal-500 hover:text-teal-700"
                  }, d.showExo ? 'Hide' : 'Explore \u2192')
                ),
                d.showExo && React.createElement("div", { className: "space-y-1.5" },
                  React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic mb-1" }, "Compare our planets to worlds around other stars (5,700+ discovered!)"),
                  EXOPLANETS.map(function(exo, ei) {
                    return React.createElement("div", { key: ei, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-teal-100') + " rounded-lg p-2 border" },
                      React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement("span", { className: "text-[10px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, exo.name),
                        React.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded-full " + (exo.habitable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600') }, exo.habitable ? 'Habitable zone' : 'Not habitable')
                      ),
                      React.createElement("div", { className: "grid grid-cols-3 gap-1 text-[9px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " mt-1" },
                        React.createElement("span", null, "\uD83D\uDCCD " + exo.dist),
                        React.createElement("span", null, "\u2696 " + exo.mass),
                        React.createElement("span", null, "\uD83C\uDF21 " + exo.temp)
                      ),
                      React.createElement("div", { className: "text-[9px] " + (isDark ? 'text-teal-400' : 'text-teal-600') + " mt-1 italic" }, exo.note)
                    );
                  })
                )
              ),

              // === "WHAT IF?" SCENARIOS ===
              sel && WHAT_IF[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-yellow-50 border-yellow-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-yellow-300' : 'text-yellow-700') }, "\uD83E\uDD14 What If? \u2014 " + sel.name),
                  React.createElement("button", {
                    onClick: function() { upd('showWhatIf', !d.showWhatIf); },
                    className: "text-[10px] text-yellow-500 hover:text-yellow-700"
                  }, d.showWhatIf ? 'Hide' : 'Think \u2192')
                ),
                d.showWhatIf && React.createElement("div", { className: "space-y-2" },
                  (WHAT_IF[sel.name] || []).map(function(wi, wii) {
                    return React.createElement("div", { key: wii, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-yellow-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "text-[10px] font-bold " + (isDark ? 'text-yellow-200' : 'text-yellow-800') + " mb-1" }, "\u2753 " + wi.q),
                      React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, wi.a),
                      React.createElement("button", {
                        onClick: function() { speakText(wi.q + ' ' + wi.a); },
                        className: "mt-1 text-[10px] text-yellow-400 hover:text-yellow-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              ),

              // === MAGNETOSPHERE & RADIATION ===
              sel && MAGNETOSPHERE[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-violet-50 border-violet-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "text-xs font-bold " + (isDark ? 'text-violet-300' : 'text-violet-700') + " mb-2" }, "\uD83E\uDDF2 Magnetosphere \u2014 " + sel.name),
                React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                  React.createElement("div", {
                    className: "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                    style: { background: MAGNETOSPHERE[sel.name].shield ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }
                  }, MAGNETOSPHERE[sel.name].shield ? '\uD83D\uDEE1' : '\u2716'),
                  React.createElement("div", null,
                    React.createElement("div", { className: "text-[10px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, "Field strength: " + MAGNETOSPHERE[sel.name].strength),
                    React.createElement("div", { className: "text-[10px] " + (MAGNETOSPHERE[sel.name].shield ? 'text-green-500' : 'text-red-500') }, MAGNETOSPHERE[sel.name].shield ? '\u2705 Protected from solar wind' : '\u274C No magnetic shielding')
                  )
                ),
                React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic" }, MAGNETOSPHERE[sel.name].note)
              ),

              // === SPACE EXPLORATION TIMELINE ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-slate-300' : 'text-slate-700') }, "\uD83D\uDCC5 Space Exploration Timeline"),
                  React.createElement("button", {
                    onClick: function() { upd('showTimeline', !d.showTimeline); },
                    className: "text-[10px] text-slate-500 hover:text-slate-700"
                  }, d.showTimeline ? 'Hide' : 'View \u2192')
                ),
                d.showTimeline && React.createElement("div", { className: "relative pl-4 border-l-2 " + (isDark ? 'border-slate-600' : 'border-indigo-200') + " space-y-1.5 max-h-64 overflow-y-auto" },
                  TIMELINE.map(function(ev, evi) {
                    return React.createElement("div", { key: evi, className: "relative" },
                      React.createElement("div", { className: "absolute -left-[21px] top-1 w-3 h-3 rounded-full " + (isDark ? 'bg-indigo-400' : 'bg-indigo-500') }),
                      React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                        React.createElement("span", { className: "font-bold text-indigo-500 mr-1" }, ev.year),
                        React.createElement("span", { className: "mr-1" }, ev.icon),
                        ev.event
                      )
                    );
                  })
                )
              ),

                            // === DID YOU KNOW? TICKER ===
              React.createElement("div", { className: "mt-4 " + (isDark ? 'bg-indigo-900/50 border-indigo-700' : 'bg-gradient-to-r from-indigo-500 to-purple-500') + " rounded-xl p-2.5 border" },
                React.createElement("div", { className: "text-center text-[10px] text-white font-medium" },
                  "\uD83D\uDCA1 Did You Know? " + DYK_FACTS[Math.floor((Date.now() / 8000)) % DYK_FACTS.length]
                )
              ),

              // === HOHMANN TRANSFER CALCULATOR ===
              sel && sel.name !== 'Earth' && HOHMANN[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-rose-50 border-rose-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-rose-300' : 'text-rose-700') }, "\uD83D\uDE80 Mission to " + sel.name + " (Hohmann Transfer)"),
                  React.createElement("button", {
                    onClick: function() { upd('showHohmann', !d.showHohmann); },
                    className: "text-[10px] text-rose-500 hover:text-rose-700"
                  }, d.showHohmann ? 'Hide' : 'Plan \u2192')
                ),
                d.showHohmann && React.createElement("div", null,
                  React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic mb-2" }, "A Hohmann transfer is the most fuel-efficient way to travel between planets."),
                  React.createElement("div", { className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2.5 border " + (isDark ? 'border-slate-600' : 'border-rose-100') },
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[10px]" },
                      React.createElement("div", { className: isDark ? 'text-slate-400' : 'text-slate-500' }, "\uD83D\uDE80 Earth departure \u0394v:"),
                      React.createElement("div", { className: "font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, HOHMANN[sel.name].dv1 + " km/s"),
                      React.createElement("div", { className: isDark ? 'text-slate-400' : 'text-slate-500' }, "\uD83C\uDFAF " + sel.name + " arrival \u0394v:"),
                      React.createElement("div", { className: "font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, HOHMANN[sel.name].dv2 + " km/s"),
                      React.createElement("div", { className: isDark ? 'text-slate-400' : 'text-slate-500' }, "\u23F1 Travel time:"),
                      React.createElement("div", { className: "font-bold " + (isDark ? 'text-white' : 'text-slate-800') },
                        HOHMANN[sel.name].travelDays + " days (" + (HOHMANN[sel.name].travelDays / 365.25).toFixed(1) + " years)"
                      ),
                      React.createElement("div", { className: isDark ? 'text-slate-400' : 'text-slate-500' }, "\uD83D\uDD04 Launch window every:"),
                      React.createElement("div", { className: "font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, HOHMANN[sel.name].window),
                      React.createElement("div", { className: isDark ? 'text-slate-400' : 'text-slate-500' }, "\u2696 Total \u0394v needed:"),
                      React.createElement("div", { className: "font-bold text-rose-600" }, (HOHMANN[sel.name].dv1 + HOHMANN[sel.name].dv2).toFixed(1) + " km/s")
                    ),
                    React.createElement("div", { className: "mt-2 text-[9px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic" },
                      "\u0394v = change in velocity. Earth\'s escape velocity is 11.2 km/s. The Saturn V rocket achieved about 11.2 km/s."
                    )
                  ),
                  // Visual transfer orbit
                  React.createElement("canvas", {
                    style: { width: '100%', height: '100px', display: 'block', borderRadius: '8px', marginTop: '8px' },
                    ref: function(hohEl) {
                      if (!hohEl || hohEl._hohInit === sel.name) return;
                      hohEl._hohInit = sel.name;
                      var hctx = hohEl.getContext('2d');
                      var HW = hohEl.offsetWidth || 300, HH = 100;
                      hohEl.width = HW * 2; hohEl.height = HH * 2; hctx.scale(2, 2);
                      var htick = 0;
                      function drawHohmann() {
                        htick++;
                        hctx.fillStyle = '#020210';
                        hctx.fillRect(0, 0, HW, HH);
                        var cx3 = HW * 0.35, cy3 = HH * 0.5;
                        // Sun
                        hctx.fillStyle = '#fbbf24';
                        hctx.beginPath();
                        hctx.arc(cx3, cy3, 6, 0, Math.PI * 2);
                        hctx.fill();
                        // Earth orbit
                        var earthR = 25;
                        hctx.strokeStyle = '#3b82f640';
                        hctx.lineWidth = 0.5;
                        hctx.beginPath();
                        hctx.arc(cx3, cy3, earthR, 0, Math.PI * 2);
                        hctx.stroke();
                        // Target planet orbit
                        var pDist = DIST_AU[sel.name] || 1;
                        var targetR = Math.min(HH * 0.45, earthR * pDist / 1.0);
                        hctx.strokeStyle = sel.color + '40';
                        hctx.beginPath();
                        hctx.arc(cx3, cy3, targetR, 0, Math.PI * 2);
                        hctx.stroke();
                        // Hohmann ellipse
                        var hohA = (earthR + targetR) / 2; // semi-major
                        var hohB = Math.sqrt(earthR * targetR); // semi-minor approx
                        hctx.strokeStyle = '#f4364440';
                        hctx.lineWidth = 1;
                        hctx.setLineDash([3, 3]);
                        hctx.beginPath();
                        hctx.ellipse(cx3 + (targetR - earthR) / 2, cy3, hohA, hohB * 0.6, 0, Math.PI, 0);
                        hctx.stroke();
                        hctx.setLineDash([]);
                        // Spacecraft dot on transfer orbit
                        var tPct = (htick % 200) / 200;
                        var scAngle = Math.PI + tPct * Math.PI;
                        var scR = earthR + (targetR - earthR) * tPct;
                        var scX = cx3 + (targetR - earthR) / 2 + Math.cos(scAngle) * hohA;
                        var scY = cy3 + Math.sin(scAngle) * hohB * 0.6;
                        hctx.fillStyle = '#f43644';
                        hctx.beginPath();
                        hctx.arc(scX, scY, 2.5, 0, Math.PI * 2);
                        hctx.fill();
                        // Earth dot
                        var eAngle = htick * 0.02;
                        hctx.fillStyle = '#3b82f6';
                        hctx.beginPath();
                        hctx.arc(cx3 + Math.cos(eAngle) * earthR, cy3 + Math.sin(eAngle) * earthR, 3, 0, Math.PI * 2);
                        hctx.fill();
                        // Target planet dot
                        var tAngle = htick * 0.005;
                        hctx.fillStyle = sel.color;
                        hctx.beginPath();
                        hctx.arc(cx3 + Math.cos(tAngle) * targetR, cy3 + Math.sin(tAngle) * targetR, 3, 0, Math.PI * 2);
                        hctx.fill();
                        // Labels
                        hctx.fillStyle = '#94a3b8';
                        hctx.font = '8px system-ui';
                        hctx.textAlign = 'left';
                        hctx.fillText('Earth \u2192 ' + sel.name + ' transfer orbit', HW * 0.65, 15);
                        hctx.fillStyle = '#64748b';
                        hctx.fillText(HOHMANN[sel.name].travelDays + ' days', HW * 0.65, 27);
                        requestAnimationFrame(drawHohmann);
                      }
                      drawHohmann();
                    }
                  })
                )
              ),

              // === ESCAPE VELOCITY COMPARISON ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-red-300' : 'text-red-700') }, "\uD83D\uDE80 Escape Velocity"),
                  React.createElement("button", {
                    onClick: function() { upd('showEscape', !d.showEscape); },
                    className: "text-[10px] text-red-500 hover:text-red-700"
                  }, d.showEscape ? 'Hide' : 'Show \u2192')
                ),
                d.showEscape && React.createElement("div", { className: "space-y-1" },
                  React.createElement("div", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " italic mb-1" }, "Speed needed to escape each planet\'s gravity (without further propulsion)"),
                  PLANETS.map(function(p) {
                    var ev = ESCAPE_VEL[p.name] || 1;
                    var maxEv = ESCAPE_VEL.Jupiter;
                    var pctW = Math.max(3, ev / maxEv * 100);
                    var isSel3 = sel && sel.name === p.name;
                    return React.createElement("div", { key: p.name, className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-[10px] w-16 text-right " + (isSel3 ? 'font-bold ' : '') + (isDark ? 'text-slate-300' : 'text-slate-600') }, p.emoji + ' ' + p.name),
                      React.createElement("div", { className: "flex-1 h-2.5 " + (isDark ? 'bg-slate-700' : 'bg-red-100') + " rounded-full overflow-hidden" },
                        React.createElement("div", {
                          className: "h-full rounded-full",
                          style: { width: pctW + '%', background: isSel3 ? 'linear-gradient(to right, #ef4444, #f97316)' : '#fca5a5', opacity: isSel3 ? 1 : 0.6 }
                        })
                      ),
                      React.createElement("span", { className: "text-[9px] w-14 font-mono " + (isDark ? 'text-slate-400' : 'text-slate-500') }, ev + ' km/s')
                    );
                  })
                )
              ),

                            // === RESEARCH POINTS BAR ===
              React.createElement("div", { className: "mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-200" },
                React.createElement("div", { className: "flex items-center justify-between mb-1" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, "\u2B50 Research Points: " + researchPoints + " RP"),
                  React.createElement("span", { className: "text-[10px] text-indigo-400" }, completedChallenges.length + "/" + CHALLENGES.length + " challenges")
                ),
                React.createElement("div", { className: "w-full bg-indigo-100 rounded-full h-2" },
                  React.createElement("div", { className: "bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all", style: { width: Math.min(100, (completedChallenges.length / CHALLENGES.length) * 100) + '%' } })
                ),
                // Challenge badges
                React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-2" },
                  CHALLENGES.map(function(ch) {
                    var done = completedChallenges.indexOf(ch.id) !== -1;
                    return React.createElement("div", { key: ch.id, title: ch.name + ': ' + ch.desc + ' (' + ch.rp + ' RP)', className: "text-center cursor-default " + (done ? '' : 'opacity-30 grayscale'), style: { fontSize: '16px' } }, ch.icon);
                  })
                )
              ),

              // === GRAVITY CALCULATOR ===
              sel && React.createElement("div", { className: "mt-3 bg-orange-50 rounded-xl p-3 border border-orange-200" },
                React.createElement("div", { className: "text-xs font-bold text-orange-700 mb-2" }, "\u2696 Gravity Calculator \u2014 " + sel.name),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("input", {
                    type: "number", placeholder: "Your weight (kg)", value: d.gravWeight || '',
                    'aria-label': 'Your weight in kilograms',
                    onChange: function(e) { updMulti({ gravWeight: e.target.value, gravCalcUsed: true }); setTimeout(checkChallenges, 50); },
                    className: "flex-1 px-2 py-1.5 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                  }),
                  React.createElement("span", { className: "text-sm font-bold text-orange-600" },
                    d.gravWeight ? (Math.round(parseFloat(d.gravWeight) * (GRAVITY_MAP[sel.name] || 1) * 10) / 10) + ' kg on ' + sel.name : '...'
                  )
                ),
                d.gravWeight && React.createElement("div", { className: "text-[10px] text-orange-500 mt-1" },
                  "Gravity: " + (GRAVITY_MAP[sel.name] || '?') + "g \u2014 You'd " + (GRAVITY_MAP[sel.name] > 1 ? 'feel ' + Math.round((GRAVITY_MAP[sel.name] - 1) * 100) + '% heavier' : GRAVITY_MAP[sel.name] < 1 ? 'feel ' + Math.round((1 - GRAVITY_MAP[sel.name]) * 100) + '% lighter' : 'feel the same') + "!"
                )
              ),

              // === SPEED OF LIGHT TRAVEL TIME ===
              sel && React.createElement("div", { className: "mt-3 bg-cyan-50 rounded-xl p-3 border border-cyan-200" },
                React.createElement("div", { className: "text-xs font-bold text-cyan-700 mb-2" }, "\u26A1 Light-Speed Travel Time"),
                React.createElement("div", { className: "grid grid-cols-2 gap-2 text-[10px]" },
                  React.createElement("div", { className: "text-cyan-600" }, "From Earth to " + sel.name + ":"),
                  React.createElement("div", { className: "font-bold text-cyan-800" },
                    (function() {
                      var au = Math.abs((DIST_AU[sel.name] || 1) - 1);
                      var lightMin = au * 8.317; // 1 AU = 8.317 light-minutes
                      if (lightMin < 60) return Math.round(lightMin * 10) / 10 + ' light-minutes';
                      return Math.round(lightMin / 60 * 10) / 10 + ' light-hours';
                    })()
                  ),
                  React.createElement("div", { className: "text-cyan-600" }, "By rocket (~40,000 km/h):"),
                  React.createElement("div", { className: "font-bold text-cyan-800" },
                    (function() {
                      var au = Math.abs((DIST_AU[sel.name] || 1) - 1);
                      var km = au * 149597870.7;
                      var hours = km / 40000;
                      if (hours < 24) return Math.round(hours) + ' hours';
                      if (hours < 8760) return Math.round(hours / 24) + ' days';
                      return Math.round(hours / 8760 * 10) / 10 + ' years';
                    })()
                  )
                ),
                React.createElement("button", {
                  onClick: function() { updMulti({ lightCalcUsed: true }); setTimeout(checkChallenges, 50); playBeep(); },
                  className: "mt-1 text-[10px] text-cyan-500 hover:text-cyan-700 underline"
                }, "\uD83D\uDCCA Calculate for all planets")
              ),

              // === AI SPACE TUTOR ===
              React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200" },
                React.createElement("div", { className: "text-xs font-bold text-violet-700 mb-2" }, "\uD83E\uDDD1\u200D\uD83D\uDE80 AI Space Tutor"),
                React.createElement("div", { className: "flex gap-2 mb-2" },
                  React.createElement("input", {
                    type: "text", placeholder: sel ? "Ask about " + sel.name + "..." : "Ask about space...",
                    value: d.aiQuestion || '',
                    'aria-label': 'Ask the AI space tutor a question',
                    onChange: function(e) { upd('aiQuestion', e.target.value); },
                    onKeyDown: function(e) { if (e.key === 'Enter') askSpaceTutor(d.aiQuestion); },
                    className: "flex-1 px-3 py-1.5 border border-violet-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                  }),
                  React.createElement("button", {
                    onClick: function() { askSpaceTutor(d.aiQuestion); },
                    disabled: d.aiLoading,
                    className: "px-3 py-1.5 rounded-lg text-xs font-bold text-white " + (d.aiLoading ? 'bg-gray-400' : 'bg-violet-600 hover:bg-violet-700')
                  }, d.aiLoading ? "\u23F3" : "Ask")
                ),
                // Quick-ask presets
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-2" },
                  [
                    sel ? 'Why is ' + sel.name + ' that color?' : 'Why is Mars red?',
                    'Could humans live on Mars?',
                    sel ? 'What would I see on ' + sel.name + '?' : 'What is a black hole?',
                    'How do planets form?'
                  ].map(function(q, qi) {
                    return React.createElement("button", { key: qi, onClick: function() { askSpaceTutor(q); }, className: "text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors" }, q);
                  })
                ),
                d.aiAnswer && React.createElement("div", { className: "bg-white rounded-lg p-2 text-xs text-slate-700 border border-violet-100 relative" },
                  React.createElement("div", null, d.aiAnswer),
                  React.createElement("button", {
                    onClick: function() { speakText(d.aiAnswer); },
                    className: "absolute top-1 right-1 text-violet-400 hover:text-violet-600",
                    title: "Read aloud"
                  }, "\uD83D\uDD0A")
                )
              ),

              // === FAMOUS MISSIONS ===
              sel && MISSIONS[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-sky-50 border-sky-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "text-xs font-bold " + (isDark ? 'text-sky-300' : 'text-sky-700') + " mb-2" }, "\uD83D\uDE80 Famous Missions to " + sel.name),
                React.createElement("div", { className: "space-y-1.5" },
                  (MISSIONS[sel.name] || []).map(function(m, mi) {
                    return React.createElement("div", { key: mi, className: "flex items-start gap-2 text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      React.createElement("span", { className: "font-bold text-sky-500 whitespace-nowrap" }, m.year),
                      React.createElement("div", null,
                        React.createElement("span", { className: "font-bold" }, m.name),
                        " \u2014 " + m.desc
                      )
                    );
                  })
                )
              ),

              // === EXTRA FUN FACTS ===
              sel && EXTRA_FACTS[sel.name] && React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "text-xs font-bold " + (isDark ? 'text-amber-300' : 'text-amber-700') + " mb-2" }, "\uD83D\uDCA1 More " + sel.name + " Facts"),
                React.createElement("div", { className: "space-y-1" },
                  (EXTRA_FACTS[sel.name] || []).map(function(fact, fi) {
                    return React.createElement("div", { key: fi, className: "text-[10px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " flex items-start gap-1.5" },
                      React.createElement("span", { className: "text-amber-400" }, "\u2022"),
                      fact
                    );
                  })
                )
              ),

              // === MISSION LOG ===
              React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200') + " rounded-xl p-3 border" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-slate-300' : 'text-slate-700') }, "\uD83D\uDCCB Mission Log"),
                  React.createElement("button", {
                    onClick: function() { upd('showLog', !d.showLog); },
                    className: "text-[10px] text-indigo-500 hover:text-indigo-700"
                  }, d.showLog ? 'Hide' : 'Show (' + (missionLog.length) + ')')
                ),
                d.showLog && React.createElement("div", { className: "space-y-1 max-h-32 overflow-y-auto" },
                  missionLog.length === 0
                    ? React.createElement("div", { className: "text-[10px] text-slate-500 italic" }, "No entries yet. Start exploring!")
                    : missionLog.map(function(entry, ei) {
                        return React.createElement("div", { key: ei, className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') + " flex gap-2" },
                          React.createElement("span", { className: "text-slate-500 font-mono whitespace-nowrap" }, entry.time),
                          entry.text
                        );
                      })
                )
              ),

              // === DARK MODE TOGGLE ===
              React.createElement("div", { className: "mt-3 flex items-center justify-between" },
                React.createElement("label", { className: "text-xs " + (isDark ? 'text-slate-400' : 'text-slate-500') + " flex items-center gap-2 cursor-pointer" },
                  React.createElement("input", {
                    type: "checkbox", checked: isDark,
                    onChange: function() { upd('isDark', !isDark); },
                    className: "rounded"
                  }),
                  (isDark ? '\uD83C\uDF19' : '\u2600\uFE0F') + " Dark Mode"
                ),
                React.createElement("span", { className: "text-[10px] " + (isDark ? 'text-slate-400' : 'text-slate-500') }, "\uD83C\uDF0D Planets visited: " + planetsVisited.length + "/9")
              ),

              // === TUTORIAL OVERLAY (first visit) ===
              !d.tutorialDismissed && React.createElement("div", {
                className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50",
                onClick: function(e) { if (e.target === e.currentTarget) upd('tutorialDismissed', true); }
              },
                React.createElement("div", { className: "bg-white rounded-2xl p-6 max-w-md shadow-2xl mx-4" },
                  React.createElement("div", { className: "text-center mb-4" },
                    React.createElement("div", { className: "text-4xl mb-2" }, "\u2600\uFE0F\uD83C\uDF0D\uD83D\uDE80"),
                    React.createElement("h2", { className: "text-lg font-black text-slate-800" }, "Welcome to Solar System Explorer!"),
                    React.createElement("p", { className: "text-sm text-slate-500 mt-1" }, "Your interactive guide to our cosmic neighborhood")
                  ),
                  React.createElement("div", { className: "space-y-2 text-xs text-slate-600" },
                    [
                      { icon: '\uD83C\uDF0D', text: 'Click any planet in the 3D view to select it' },
                      { icon: '\uD83C\uDF05', text: 'Surface View shows the planet with orbiting moons' },
                      { icon: '\uD83C\uDF0B', text: 'Interior View reveals the hidden layers inside each planet' },
                      { icon: '\uD83D\uDE97', text: 'Deploy a rover/probe to explore planet surfaces in 3D' },
                      { icon: '\u2B50', text: 'Earn Research Points by completing exploration challenges' },
                      { icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', text: 'Ask the AI Space Tutor any question about the cosmos' }
                    ].map(function(step, si) {
                      return React.createElement("div", { key: si, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-lg" }, step.icon),
                        React.createElement("span", null, step.text)
                      );
                    })
                  ),
                  React.createElement("button", {
                    onClick: function() { upd('tutorialDismissed', true); playBeep(); },
                    className: "mt-4 w-full py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg"
                  }, "\uD83D\uDE80 Start Exploring!")
                )
              ),

              React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ss-' + Date.now(), tool: 'solarSystem', label: sel ? sel.name : 'Solar System', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

            )

          );
      })();
    }
  });


})();

} // end dedup guard
