// ═══════════════════════════════════════════
// stem_tool_universe.js — Universe Time-Lapse Explorer (standalone CDN module)
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
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('universe'))) {

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

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-universe')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-universe';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('universe', {
    icon: 'ðŸ”¬',
    label: 'universe',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'visit_5_epochs', label: 'Visit 5 cosmic epochs', icon: '🌠', check: function(d) { return (d.epochsVisited || []).length >= 5; }, progress: function(d) { return (d.epochsVisited || []).length + '/5'; } },
      { id: 'earn_50_rp', label: 'Earn 50 research points', icon: '⭐', check: function(d) { return (d.totalRP || 0) >= 50; }, progress: function(d) { return (d.totalRP || 0) + '/50 RP'; } },
      { id: 'quiz_8', label: 'Score 8+ on cosmic quiz', icon: '🧠', check: function(d) { return (d.quizScore || 0) >= 8; }, progress: function(d) { return (d.quizScore || 0) + '/8'; } }
    ],
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
      var canvasNarrate = ctx.canvasNarrate;

      // â”€â”€ Tool body (universe) â”€â”€
      return (function() {
var d = labToolData.universe || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('universe', 'init', {
              first: 'Universe Explorer loaded. Journey through cosmic scales from atoms to galaxy superclusters. Explore the observable universe.',
              repeat: 'Universe Explorer active.',
              terse: 'Universe.'
            }, { debounce: 800 });
          }

          var upd = function (key, val) { setLabToolData(function (prev) { return Object.assign({}, prev, { universe: Object.assign({}, prev.universe || {}, (function () { var o = {}; o[key] = val; return o; })()) }); }); };

          var updMulti = function (obj) { setLabToolData(function (prev) { return Object.assign({}, prev, { universe: Object.assign({}, prev.universe || {}, obj) }); }); };

          // --- Research Points & Challenges ---
          var researchPoints = d.researchPoints || 0;
          var totalRP = d.totalRP || 0;
          var completedChallenges = d.completedChallenges || [];
          var epochsVisited = d.epochsVisited || [];

          var CHALLENGES = [
            { id: 'first_epoch', name: 'Time Traveler', desc: 'Visit any epoch', icon: '\u23F3', rp: 10, check: function() { return epochsVisited.length >= 1; } },
            { id: 'visit_all', name: 'Cosmic Tourist', desc: 'Visit all 9 epochs', icon: '\uD83C\uDFC6', rp: 100, check: function() { return epochsVisited.length >= 9; } },
            { id: 'play_timelapse', name: 'Time Lord', desc: 'Play the time-lapse animation', icon: '\u25B6', rp: 15, check: function() { return isPlaying; } },
            { id: 'big_bang', name: 'Witness Creation', desc: 'Visit the Big Bang (t=0)', icon: '\uD83D\uDCA5', rp: 20, check: function() { return cosmicTime < 0.01; } },
            { id: 'present_day', name: 'Here and Now', desc: 'Reach the present day', icon: '\uD83C\uDF0D', rp: 15, check: function() { return cosmicTime >= 13.0 && cosmicTime < 13.8; } },
            { id: 'far_future', name: 'Heat Death', desc: 'Peer into the far future', icon: '\uD83D\uDD2E', rp: 20, check: function() { return cosmicTime >= 13.8; } },
            { id: 'star_lifecycle', name: 'Stellar Scholar', desc: 'Explore the star lifecycle', icon: '\u2B50', rp: 20, check: function() { return d.showStarLife; } },
            { id: 'hr_diagram', name: 'Astronomer', desc: 'Study the HR Diagram', icon: '\uD83D\uDCCA', rp: 20, check: function() { return d.showHR; } },
            { id: 'distance_ladder', name: 'Cosmic Surveyor', desc: 'Explore the distance ladder', icon: '\uD83D\uDCCF', rp: 15, check: function() { return d.showDistance; } },
            { id: 'dark_energy', name: 'Dark Researcher', desc: 'Learn about dark energy & dark matter', icon: '\uD83D\uDD73', rp: 20, check: function() { return d.showDark; } },
            { id: 'ai_question', name: 'Curious Mind', desc: 'Ask the AI Cosmos Tutor', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', rp: 20, check: function() { return !!d.aiAnswer; } },
            { id: 'what_if', name: 'Thought Experimenter', desc: 'Explore a What If scenario', icon: '\uD83E\uDD14', rp: 15, check: function() { return d.showWhatIf; } },
            { id: 'elements', name: 'Alchemist', desc: 'Learn where elements come from', icon: '\u2697', rp: 15, check: function() { return d.showElements; } },
            { id: 'structures', name: 'Cosmic Architect', desc: 'Explore the cosmic structure hierarchy', icon: '\uD83C\uDF0C', rp: 10, check: function() { return d.showStructures; } },
            { id: 'quiz_master', name: 'Quiz Champion', desc: 'Score 8+ on the cosmic quiz', icon: '\uD83E\uDDE0', rp: 50, check: function() { return (d.quizScore || 0) >= 8; } },
            { id: 'telescopes', name: 'Observatory Tour', desc: 'Learn about famous telescopes', icon: '\uD83D\uDD2D', rp: 10, check: function() { return d.showTelescopes; } },
            { id: 'numbers', name: 'Number Cruncher', desc: 'View the cosmic numbers', icon: '\uD83D\uDD22', rp: 10, check: function() { return d.showNumbers; } },
            { id: 'cosmic_calendar', name: 'Calendar Keeper', desc: 'View the Cosmic Calendar', icon: '\uD83D\uDCC5', rp: 10, check: function() { return d.showCalendar; } },
            { id: 'black_hole', name: 'Event Horizon', desc: 'Study black hole anatomy', icon: '\uD83D\uDD73', rp: 20, check: function() { return d.showBlackHole; } },
            { id: 'drake_calc', name: 'SETI Scientist', desc: 'Use the Drake Equation', icon: '\uD83D\uDC7D', rp: 20, check: function() { return d.showDrake; } },
            { id: 'galaxy_types', name: 'Galaxy Classifier', desc: 'Learn about galaxy types', icon: '\uD83C\uDF0C', rp: 10, check: function() { return d.showGalaxyTypes; } },
            { id: 'astronomers', name: 'History Buff', desc: 'Explore famous astronomers', icon: '\uD83D\uDD2D', rp: 10, check: function() { return d.showAstronomers; } },
            { id: 'exoplanets', name: 'Planet Hunter', desc: 'Explore exoplanet types', icon: '\uD83C\uDF0D', rp: 15, check: function() { return d.showExoplanets; } },
            { id: 'space_missions', name: 'Mission Control', desc: 'Study space missions timeline', icon: '\uD83D\uDE80', rp: 10, check: function() { return d.showMissions; } },
            { id: 'fermi_paradox', name: 'Fermi Thinker', desc: 'Explore the Fermi Paradox', icon: '\uD83E\uDD14', rp: 20, check: function() { return d.showFermi; } },
            { id: 'grav_lensing', name: 'Light Bender', desc: 'Learn gravitational lensing', icon: '\uD83D\uDD2E', rp: 15, check: function() { return d.showLensing; } },
            { id: 'mysteries', name: 'Deep Thinker', desc: 'Explore unsolved cosmic mysteries', icon: '\u2753', rp: 15, check: function() { return d.showMysteries; } },
            { id: 'multiverse', name: 'Reality Explorer', desc: 'Study multiverse theories', icon: '\uD83C\uDF10', rp: 20, check: function() { return d.showMultiverse; } },
            { id: 'redshift', name: 'Doppler Detective', desc: 'Learn redshift & blueshift', icon: '\uD83D\uDD34', rp: 20, check: function() { return d.showRedshift; } },
            { id: 'nurseries', name: 'Star Nursery', desc: 'Explore stellar nurseries', icon: '\uD83C\uDF1F', rp: 10, check: function() { return d.showNurseries; } },
            { id: 'pn_gallery', name: 'Nebula Artist', desc: 'View planetary nebulae', icon: '\uD83C\uDF00', rp: 10, check: function() { return d.showPNebulae; } },
            { id: 'catastrophes', name: 'Doomsday Scholar', desc: 'Study cosmic catastrophes', icon: '\u2604', rp: 15, check: function() { return d.showCatastrophes; } },
            { id: 'em_spectrum', name: 'Spectrum Master', desc: 'Explore the EM spectrum', icon: '\uD83C\uDF08', rp: 10, check: function() { return d.showSpectrum; } },
            { id: 'cosmic_scale', name: 'Powers of Ten', desc: 'Explore cosmic scales', icon: '\uD83D\uDD0D', rp: 15, check: function() { return d.showScale; } },
            { id: 'spectral_class', name: 'Star Classifier', desc: 'Learn spectral classification', icon: '\uD83C\uDF08', rp: 15, check: function() { return d.showSpectral; } },
            { id: 'gravity_calc', name: 'Weight Watcher', desc: 'Calculate weight on other worlds', icon: '\u2696', rp: 10, check: function() { return d.showGravity; } },
            { id: 'space_images', name: 'Icon Spotter', desc: 'Study famous space images', icon: '\uD83D\uDCF7', rp: 10, check: function() { return d.showImages; } },
            { id: 'cosmic_speed', name: 'Speed Demon', desc: 'Compare cosmic speeds', icon: '\uD83C\uDFC1', rp: 10, check: function() { return d.showSpeeds; } },
            { id: 'citizen_sci', name: 'Citizen Scientist', desc: 'Learn about citizen science', icon: '\uD83E\uDDD1\u200D\uD83D\uDD2C', rp: 15, check: function() { return d.showCitizenSci; } },
            { id: 'glossary', name: 'Lexicographer', desc: 'Explore the cosmology glossary', icon: '\uD83D\uDCD6', rp: 10, check: function() { return d.showGlossary; } }
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

          // Track epoch visits
          var epochName = epoch ? epoch.name : '';
          if (epochName && epochsVisited.indexOf(epochName) === -1) {
            var newVisited = epochsVisited.concat([epochName]);
            upd('epochsVisited', newVisited);
            epochsVisited = newVisited;
          }
          setTimeout(checkChallenges, 100);

          // --- Sound effects ---
          function playBeep() {
            try {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              var osc = ac.createOscillator();
              var gain = ac.createGain();
              osc.connect(gain); gain.connect(ac.destination);
              osc.frequency.value = 660;
              gain.gain.value = 0.06;
              osc.start(); osc.stop(ac.currentTime + 0.08);
            } catch(e) {}
          }
          function playCelebrate() {
            try {
              var ac = new (window.AudioContext || window.webkitAudioContext)();
              [440, 554, 659, 880].forEach(function(freq, i) {
                var osc = ac.createOscillator();
                var gain = ac.createGain();
                osc.connect(gain); gain.connect(ac.destination);
                osc.frequency.value = freq;
                gain.gain.value = 0.05;
                osc.start(ac.currentTime + i * 0.12);
                osc.stop(ac.currentTime + i * 0.12 + 0.1);
              });
            } catch(e) {}
          }

          // --- AI Cosmos Tutor ---
          function askCosmosTutor(question) {
            if (!question || !question.trim()) return;
            updMulti({ aiQuestion: question, aiAnswer: '', aiLoading: true });
            var grade = gradeLevel || 'middle school';
            var epochCtx = epoch ? ' during the ' + epoch.name + ' epoch' : '';
            var prompt = 'You are a friendly cosmology tutor for a ' + grade + ' student. Answer this question about the universe' + epochCtx + ' in 2-3 clear sentences: ' + question;
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

          function speakText(text) {
            if (!text) return;
            if (callTTS) { try { callTTS(text); return; } catch(e) {} }
            if (window._kokoroTTS && window._kokoroTTS.speak) {
              window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url){var a=new Audio(url);a.playbackRate=0.95;a.play();}}).catch(function(){});
              return;
            }
            if (window.speechSynthesis) { window.speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text); u.rate=0.9; window.speechSynthesis.speak(u); }
          }

          // --- Star Lifecycle Data ---
          var STAR_STAGES = [
            { name: 'Molecular Cloud', icon: '\u2601', color: '#4a3a6a', desc: 'Giant clouds of gas and dust (mostly hydrogen) collapse under gravity. Triggered by supernova shockwaves or galaxy collisions.', temp: '10-50 K', size: '1-300 light-years', duration: 'Millions of years' },
            { name: 'Protostar', icon: '\uD83C\uDF1F', color: '#d4924f', desc: 'The cloud core heats up as it contracts. Not yet hot enough for fusion. Surrounded by a rotating disk of gas and dust.', temp: '2,000-3,000 K', size: '~1 AU', duration: '100,000 years' },
            { name: 'Main Sequence', icon: '\u2600\uFE0F', color: '#fbbf24', desc: 'Hydrogen fusion ignites! The star enters a stable equilibrium between gravity (pulling in) and radiation pressure (pushing out). Our Sun is here.', temp: '3,000-50,000 K', size: '0.1-10x Sun', duration: 'Millions to trillions of years' },
            { name: 'Red Giant', icon: '\uD83D\uDD34', color: '#ef4444', desc: 'Hydrogen fuel runs out in the core. The star swells enormously as it fuses helium. Could engulf inner planets.', temp: '3,000-5,000 K', size: '10-100x Sun', duration: 'Millions of years' },
            { name: 'Planetary Nebula', icon: '\uD83C\uDF00', color: '#a78bfa', desc: 'Low-mass stars gently shed their outer layers into beautiful expanding gas shells, enriching space with heavier elements.', temp: '10,000-200,000 K (central star)', size: '~1 light-year', duration: '~10,000 years' },
            { name: 'White Dwarf', icon: '\u26AA', color: '#e2e8f0', desc: 'The Earth-sized remnant core. No fusion. Slowly cools over billions of years. Will eventually become a black dwarf (none exist yet).', temp: '8,000-40,000 K (cooling)', size: 'Earth-sized', duration: 'Trillions of years to cool' },
            { name: 'Supernova', icon: '\uD83D\uDCA5', color: '#f97316', desc: 'Massive stars (8+ solar masses) die in spectacular explosions brighter than entire galaxies! Creates elements heavier than iron (gold, platinum, uranium).', temp: '10 billion K (briefly)', size: 'Visible across galaxies', duration: 'Weeks to months' },
            { name: 'Neutron Star', icon: '\uD83D\uDCAB', color: '#67e8f9', desc: 'A city-sized ball of neutrons spinning at 700 rotations/second. A teaspoon weighs 6 billion tons. Pulsars are spinning neutron stars.', temp: '~1 million K', size: '~20 km diameter', duration: 'Effectively forever' },
            { name: 'Black Hole', icon: '\uD83D\uDD73', color: '#1a1a2a', desc: 'If the star is massive enough (25+ solar masses), the core collapses past neutron star density into a singularity. Nothing escapes the event horizon.', temp: 'N/A (Hawking radiation: ~nanokelvin)', size: 'Event horizon: ~60 km for 10 solar masses', duration: '10\u00B9\u2070\u2070 years (Hawking evaporation)' }
          ];

          // --- Cosmic Distance Ladder ---
          var DISTANCE_LADDER = [
            { name: 'Earth to Moon', dist: '384,400 km', light: '1.3 light-seconds', method: 'Radar ranging', icon: '\uD83C\uDF15' },
            { name: 'Earth to Sun', dist: '150 million km (1 AU)', light: '8.3 light-minutes', method: 'Radar + Kepler\'s laws', icon: '\u2600\uFE0F' },
            { name: 'Sun to Neptune', dist: '4.5 billion km (30 AU)', light: '4.2 light-hours', method: 'Radar + orbital mechanics', icon: '\uD83D\uDD35' },
            { name: 'Sun to Proxima Centauri', dist: '4.24 light-years (268,000 AU)', light: '4.24 years', method: 'Stellar parallax', icon: '\u2B50' },
            { name: 'Across the Milky Way', dist: '100,000 light-years', light: '100,000 years', method: 'Cepheid variables', icon: '\uD83C\uDF00' },
            { name: 'To Andromeda Galaxy', dist: '2.537 million light-years', light: '2.5 million years', method: 'Cepheids + Type Ia supernovae', icon: '\uD83C\uDF0C' },
            { name: 'To Virgo Cluster', dist: '54 million light-years', light: '54 million years', method: 'Type Ia supernovae', icon: '\uD83D\uDD2D' },
            { name: 'Edge of Observable Universe', dist: '46.5 billion light-years', light: '13.8 billion years (lookback)', method: 'CMB + redshift', icon: '\uD83C\uDF20' }
          ];

          // --- What If? Cosmic Scenarios ---
          var WHAT_IF_COSMIC = [
            { q: 'What if the Big Bang never happened?', a: 'There would be nothing \u2014 no space, no time, no matter, no energy. The Big Bang created spacetime itself. Without it, the question itself couldn\'t exist!' },
            { q: 'What if dark matter didn\'t exist?', a: 'Galaxies would fly apart! Dark matter provides 85% of the gravity holding galaxies and galaxy clusters together. Without it, stars would scatter into the void.' },
            { q: 'What if the speed of light were slower?', a: 'Nuclear fusion in stars would produce less energy. Stars might not shine brightly enough for life. GPS would be more accurate though! E=mc\u00B2 means less energy per gram of matter.' },
            { q: 'What if gravity were twice as strong?', a: 'Stars would burn through fuel much faster. The Sun might only last 1 billion years. Planets would be smaller and denser. You\'d weigh twice as much!' },
            { q: 'What if the universe were only 1 billion years old?', a: 'No Sun, no Earth, no life. The first generation of stars would still be forming. Only hydrogen, helium, and traces of lithium would exist \u2014 no carbon, oxygen, or iron.' },
            { q: 'What if dark energy reversed?', a: 'The expansion of the universe would slow and reverse. Eventually, everything would collapse back into a single point \u2014 the Big Crunch. Some theorize this could trigger a new Big Bang.' },
            { q: 'What if protons decayed?', a: 'All matter would eventually dissolve. Even in the most stable materials, every atom would decay over 10\u00B3\u2077 years. Only black holes and radiation would remain.' },
            { q: 'What if there were no neutrinos?', a: 'Supernovae wouldn\'t work properly \u2014 neutrinos carry away 99% of a supernova\'s energy. Without them, heavy elements (including the iron in your blood) might never have been created.' }
          ];

          // Exoplanet types
          var EXOPLANET_TYPES = [
            { name: 'Hot Jupiter', icon: '\uD83D\uDD25', size: '1-2x Jupiter', orbit: '<10 days', temp: '1,000-3,000 K', desc: 'Gas giants orbiting extremely close to their star. First exoplanet type discovered (51 Pegasi b, 1995). They migrated inward from where they formed.', example: '51 Pegasi b, WASP-12b', habitable: false, color: '#ef4444' },
            { name: 'Super-Earth', icon: '\uD83C\uDF0D', size: '1.2-2x Earth', orbit: 'Varies', temp: 'Varies', desc: 'Rocky planets larger than Earth but smaller than Neptune. No equivalent in our Solar System. Some may be habitable with thick atmospheres.', example: 'LHS 1140 b, 55 Cancri e', habitable: 'Possible', color: '#22c55e' },
            { name: 'Mini-Neptune', icon: '\uD83D\uDD35', size: '2-4x Earth', orbit: 'Varies', temp: '200-600 K', desc: 'Small gas/ice planets with thick hydrogen-helium atmospheres. The most common type of exoplanet discovered! No equivalent in our Solar System.', example: 'Kepler-11f, GJ 1214 b', habitable: false, color: '#3b82f6' },
            { name: 'Earth Analog', icon: '\u2B50', size: '0.8-1.5x Earth', orbit: 'Habitable zone', temp: '200-320 K', desc: 'Rocky planets in the habitable zone where liquid water could exist. The holy grail of exoplanet research. Very hard to detect.', example: 'Kepler-442b, TRAPPIST-1e', habitable: 'Best candidate', color: '#fbbf24' },
            { name: 'Rogue Planet', icon: '\uD83C\uDF11', size: 'Varies', orbit: 'None (free-floating)', temp: 'Near absolute zero', desc: 'Planets ejected from their star system, wandering through interstellar space. Estimated billions in the Milky Way alone. Could have subsurface oceans heated by radioactive decay.', example: 'CFBDSIR 2149-0403', habitable: 'Unlikely but possible', color: '#94a3b8' },
            { name: 'Lava World', icon: '\uD83C\uDF0B', size: '0.5-2x Earth', orbit: 'Ultra-short', temp: '2,000+ K', desc: 'Rocky worlds so close to their star that the surface is molten rock. May have magma oceans and silicate vapor atmospheres. Rock literally rains from the sky.', example: 'CoRoT-7b, Kepler-78b', habitable: false, color: '#f97316' }
          ];

          // Space missions timeline
          var SPACE_MISSIONS = [
            { year: '1957', name: 'Sputnik 1', agency: 'USSR', desc: 'First artificial satellite. Launched the Space Age with a simple radio beep heard worldwide.', icon: '\uD83D\uDEF0' },
            { year: '1961', name: 'Vostok 1', agency: 'USSR', desc: 'Yuri Gagarin becomes the first human in space, completing one orbit of Earth in 108 minutes.', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80' },
            { year: '1969', name: 'Apollo 11', agency: 'NASA', desc: 'Neil Armstrong and Buzz Aldrin walk on the Moon. "One small step for man, one giant leap for mankind."', icon: '\uD83C\uDF15' },
            { year: '1977', name: 'Voyager 1 & 2', agency: 'NASA', desc: 'Twin probes explore all four gas giants. Voyager 1 is now the farthest human-made object, in interstellar space.', icon: '\uD83D\uDE80' },
            { year: '1990', name: 'Hubble Space Telescope', agency: 'NASA/ESA', desc: 'Revolutionized astronomy with Deep Field images, measured the expansion rate of the universe.', icon: '\uD83D\uDD2D' },
            { year: '1997', name: 'Cassini-Huygens', agency: 'NASA/ESA', desc: 'Explored Saturn for 13 years. Huygens probe landed on Titan. Discovered geysers on Enceladus.', icon: '\uD83E\uDE90' },
            { year: '2004', name: 'Spirit & Opportunity', agency: 'NASA', desc: 'Mars rovers. Opportunity lasted 14 years (designed for 90 days!) and found evidence of ancient water.', icon: '\uD83D\uDD34' },
            { year: '2012', name: 'Curiosity Rover', agency: 'NASA', desc: 'Car-sized Mars rover. Confirmed Mars once had habitable conditions with flowing water and organic molecules.', icon: '\uD83E\uDD16' },
            { year: '2015', name: 'New Horizons', agency: 'NASA', desc: 'First spacecraft to fly by Pluto, revealing a complex world with nitrogen glaciers and a heart-shaped plain.', icon: '\u2764' },
            { year: '2015', name: 'LIGO Detection', agency: 'LIGO/Caltech/MIT', desc: 'First direct detection of gravitational waves from merging black holes. Confirmed Einstein\'s 1915 prediction.', icon: '\uD83C\uDF0A' },
            { year: '2019', name: 'EHT Black Hole Image', agency: 'EHT Collaboration', desc: 'First image of a black hole shadow (M87*). Used 8 radio telescopes across 4 continents as one Earth-sized dish.', icon: '\uD83D\uDD73' },
            { year: '2021', name: 'Perseverance + Ingenuity', agency: 'NASA', desc: 'Mars rover collecting samples for Earth return. Ingenuity helicopter achieved first powered flight on another planet.', icon: '\uD83D\uDE81' },
            { year: '2022', name: 'James Webb Space Telescope', agency: 'NASA/ESA/CSA', desc: 'Largest space telescope ever. Infrared vision sees the earliest galaxies (13.4+ Gyr old) and exoplanet atmospheres.', icon: '\uD83C\uDF1F' },
            { year: '2023', name: 'OSIRIS-REx Return', agency: 'NASA', desc: 'Returned samples from asteroid Bennu to Earth. First US asteroid sample return. Studying origins of the solar system.', icon: '\u2604' }
          ];

          // Fermi Paradox solutions
          var FERMI_SOLUTIONS = [
            { name: 'The Great Filter', desc: 'There is a nearly impossible step in the development of life/civilizations that most never pass. It could be behind us (abiogenesis) or ahead of us (self-destruction).', icon: '\u26D4', type: 'filter' },
            { name: 'Zoo Hypothesis', desc: 'Advanced civilizations know about us but deliberately avoid contact, treating Earth like a nature reserve or zoo. We are being observed but not contacted.', icon: '\uD83E\uDD81', type: 'social' },
            { name: 'Dark Forest Theory', desc: 'The universe is full of predatory civilizations. Any civilization that reveals itself is destroyed, so everyone stays silent. Popularized by Liu Cixin\'s novels.', icon: '\uD83C\uDF32', type: 'social' },
            { name: 'Rare Earth Hypothesis', desc: 'The conditions needed for complex life (stable star, Jupiter-like protector, large moon, plate tectonics, magnetic field) are extraordinarily rare. We may be nearly unique.', icon: '\uD83D\uDC8E', type: 'filter' },
            { name: 'They Are Already Here', desc: 'Aliens have visited or are visiting, but we don\'t recognize them. They could be operating at scales or timescales we can\'t perceive.', icon: '\uD83D\uDC7D', type: 'contact' },
            { name: 'We Are Too Primitive', desc: 'Detecting alien signals requires technology we haven\'t invented yet. It\'s like indigenous people trying to detect radio waves. We\'re looking with the wrong tools.', icon: '\uD83D\uDCE1', type: 'tech' },
            { name: 'Transcension Hypothesis', desc: 'Advanced civilizations turn inward, migrating into virtual realities, black hole computers, or higher dimensions rather than expanding outward across space.', icon: '\uD83E\uDDE0', type: 'tech' },
            { name: 'Time & Distance', desc: 'Civilizations may exist but are separated by thousands of light-years and millions of years. Two civilizations might never overlap in time.', icon: '\u23F3', type: 'physics' }
          ];

          // Unsolved cosmic mysteries
          var COSMIC_MYSTERIES = [
            { name: 'What Is Dark Energy?', desc: 'We know it\'s 68% of the universe and accelerates expansion, but we have zero idea what it actually IS. Is it a property of space? A new force? Einstein\'s cosmological constant?', urgency: 'Critical', icon: '\u2753' },
            { name: 'What Is Dark Matter?', desc: 'Makes up 27% of the universe. We see its gravitational effects but cannot detect it directly. WIMPs? Axions? Modified gravity? Decades of searches have found nothing.', urgency: 'Critical', icon: '\uD83C\uDF11' },
            { name: 'Why More Matter Than Antimatter?', desc: 'The Big Bang should have created equal matter and antimatter (which would annihilate completely). A tiny asymmetry (1 part per billion) saved the universe. Why?', urgency: 'Fundamental', icon: '\u2696' },
            { name: 'What Caused the Big Bang?', desc: 'We can describe everything from 10\u207B\u00B3\u00B2 seconds onward, but what caused the initial singularity? Was there a "before"? Is time itself meaningless at that point?', urgency: 'Philosophical', icon: '\uD83D\uDCA5' },
            { name: 'Is the Universe Infinite?', desc: 'We can only see 93 billion light-years across, but the universe may extend infinitely. Current measurements suggest it\'s flat (infinite) but we can\'t be sure.', urgency: 'Open', icon: '\u221E' },
            { name: 'Quantum Gravity', desc: 'General relativity (gravity) and quantum mechanics are both correct but fundamentally incompatible. String theory and loop quantum gravity are leading candidates to unify them.', urgency: 'Critical', icon: '\uD83E\uDDF2' },
            { name: 'Black Hole Information Paradox', desc: 'If information is destroyed when it falls into a black hole, it violates quantum mechanics. If it\'s preserved, how? Hawking radiation may encode it, but the details are unclear.', urgency: 'Active debate', icon: '\uD83D\uDD73' },
            { name: 'Are We in a Simulation?', desc: 'Nick Bostrom\'s argument: if civilizations can run ancestor simulations, statistically we\'re almost certainly in one. Unfalsifiable but philosophically provocative.', urgency: 'Philosophical', icon: '\uD83D\uDCBB' }
          ];

          // Multiverse theories
          var MULTIVERSE_THEORIES = [
            { name: 'Many-Worlds (Quantum)', source: 'Hugh Everett III, 1957', desc: 'Every quantum measurement causes the universe to split into branches where each possible outcome occurs. All outcomes are equally real. No wavefunction collapse needed.', evidence: 'Solves quantum measurement problem elegantly. No direct evidence possible.', icon: '\uD83C\uDF33' },
            { name: 'Inflationary Multiverse', source: 'Andrei Linde, 1986', desc: 'Eternal cosmic inflation continuously creates "bubble universes" with different physical laws and constants. Our universe is just one bubble in an infinite foam.', evidence: 'Consistent with CMB observations. Predicted by most inflation models.', icon: '\uD83E\uDEE7' },
            { name: 'String Landscape', source: 'String Theory, 2003', desc: 'String theory predicts 10\u2075\u2070\u2070 possible vacuum states, each corresponding to a universe with different particle physics. Our laws of physics are just one roll of the dice.', evidence: 'Mathematically consistent. No experimental verification yet.', icon: '\uD83C\uDFB2' },
            { name: 'Cyclic Universe', source: 'Steinhardt & Turok, 2002', desc: 'The Big Bang was a collision between higher-dimensional "branes." The universe goes through infinite cycles of expansion and contraction, with each cycle creating new matter.', evidence: 'Alternative to inflation. Testable via gravitational wave signatures.', icon: '\uD83D\uDD04' },
            { name: 'Mathematical Universe', source: 'Max Tegmark, 2007', desc: 'Every self-consistent mathematical structure exists as a physical universe. Our universe is one mathematical object among infinitely many. Reality IS mathematics.', evidence: 'Philosophical. Explains unreasonable effectiveness of math in physics.', icon: '\uD83D\uDCDA' }
          ];

          // Gravitational lensing data
          var LENSING_EXAMPLES = [
            { name: 'Einstein Cross', desc: 'A single quasar appears as four images arranged in a cross pattern around a foreground galaxy. First discovered 1985.', type: 'Strong lensing', icon: '\u2716' },
            { name: 'Einstein Ring', desc: 'When source, lens, and observer are perfectly aligned, the background object appears as a complete ring of light.', type: 'Strong lensing', icon: '\u2B55' },
            { name: 'Galaxy Cluster Arcs', desc: 'Massive galaxy clusters bend light from background galaxies into spectacular arcs and streaks. Used to map dark matter.', type: 'Strong lensing', icon: '\uD83C\uDF19' },
            { name: 'Cosmic Shear', desc: 'Weak distortions in the shapes of millions of background galaxies reveal the distribution of dark matter across vast cosmic scales.', type: 'Weak lensing', icon: '\uD83C\uDF0A' },
            { name: 'Microlensing', desc: 'A passing star briefly magnifies a more distant star, revealing exoplanets around the lens star. Used to find free-floating planets.', type: 'Microlensing', icon: '\u2728' }
          ];

          // Redshift / Blueshift data
          var REDSHIFT_EXAMPLES = [
            { name: 'Andromeda Galaxy (M31)', z: -0.001, vel: '-300 km/s', type: 'blueshift', desc: 'One of the few galaxies moving toward us! Will collide with the Milky Way in ~4.5 billion years.', icon: '\uD83C\uDF0C' },
            { name: 'Virgo Cluster', z: 0.004, vel: '~1,200 km/s', type: 'redshift', desc: 'Nearest large galaxy cluster. Receding due to cosmic expansion.', icon: '\uD83D\uDD2D' },
            { name: 'Quasar 3C 273', z: 0.158, vel: '~47,000 km/s', type: 'redshift', desc: 'First quasar identified (1963). So luminous it outshines its entire host galaxy. 2.4 billion light-years away.', icon: '\u2B50' },
            { name: 'GN-z11 (most distant galaxy)', z: 10.6, vel: '~99.7% c', type: 'redshift', desc: 'Seen as it was 13.4 billion years ago, just 400 million years after the Big Bang. Detected by JWST.', icon: '\uD83C\uDF20' },
            { name: 'Cosmic Microwave Background', z: 1089, vel: 'N/A (cosmological)', type: 'redshift', desc: 'The oldest light in the universe. Originally ~3,000 K visible light, now stretched to 2.725 K microwaves by 13.8 billion years of expansion.', icon: '\uD83C\uDF21' }
          ];

          // Stellar nurseries
          var STELLAR_NURSERIES = [
            { name: 'Orion Nebula (M42)', dist: '1,344 ly', size: '24 ly across', desc: 'The closest massive star-forming region. Visible to the naked eye as a fuzzy patch in Orion\'s sword. Contains ~700 young stars in various stages of formation.', features: 'Trapezium star cluster, protoplanetary disks (proplyds), Herbig-Haro jets', icon: '\u2728', color: '#e879f9' },
            { name: 'Eagle Nebula (M16)', dist: '7,000 ly', size: '70 ly across', desc: 'Home to the iconic "Pillars of Creation" photographed by Hubble. Massive columns of gas and dust where new stars are being born inside dense cocoons.', features: 'Pillars of Creation, evaporating gaseous globules (EGGs), young open cluster', icon: '\uD83E\uDDA5', color: '#a78bfa' },
            { name: 'Carina Nebula', dist: '8,500 ly', size: '300+ ly across', desc: 'One of the largest nebulae in the sky. Contains Eta Carinae, a massive unstable star 100x the Sun\'s mass that could explode as a supernova any time.', features: 'Eta Carinae, Keyhole Nebula, Mystic Mountain, young massive stars', icon: '\uD83C\uDF1F', color: '#f472b6' },
            { name: 'Tarantula Nebula (30 Doradus)', dist: '160,000 ly (LMC)', size: '600 ly across', desc: 'The most active star-forming region in the Local Group. If it were as close as the Orion Nebula, it would cast shadows on Earth. Contains the most massive known stars.', features: 'R136 cluster with stars 200+ solar masses, extreme UV radiation', icon: '\uD83D\uDD25', color: '#fb923c' },
            { name: 'Rosette Nebula', dist: '5,000 ly', size: '130 ly across', desc: 'A beautiful flower-shaped emission nebula. Stellar winds from the central star cluster have carved a cavity in the gas, creating the rose pattern.', features: 'Central cavity, elephant trunk structures, NGC 2244 cluster', icon: '\uD83C\uDF39', color: '#f87171' },
            { name: 'Horsehead Nebula (Barnard 33)', dist: '1,500 ly', size: '3.5 ly tall', desc: 'An iconic dark nebula shaped like a horse\'s head. A dense cloud of dust blocking light from the red emission nebula behind it. Active low-mass star formation inside.', features: 'Dark molecular cloud, infrared-bright protostars, IC 434 background', icon: '\uD83D\uDC0E', color: '#94a3b8' }
          ];

          // Planetary nebulae gallery
          var PLANETARY_NEBULAE = [
            { name: 'Ring Nebula (M57)', dist: '2,570 ly', age: '~4,000 yrs', desc: 'A textbook planetary nebula. The dying star shed its outer layers into a glowing ring of ionized gas. The central white dwarf is visible.', shape: 'Ring/torus', color: '#22d3ee', icon: '\u2B55' },
            { name: 'Helix Nebula (NGC 7293)', dist: '655 ly', age: '~12,000 yrs', desc: 'The closest bright planetary nebula. Known as the "Eye of God" for its striking appearance. Enormous at nearly half a degree (full Moon size).', shape: 'Helical/double ring', color: '#34d399', icon: '\uD83D\uDC41' },
            { name: 'Cat\'s Eye Nebula (NGC 6543)', dist: '3,300 ly', age: '~1,000 yrs', desc: 'One of the most complex planetary nebulae known. Concentric rings, jets, and intricate knots suggest a binary star system at the center.', shape: 'Concentric shells + jets', color: '#60a5fa', icon: '\uD83D\uDC31' },
            { name: 'Butterfly Nebula (NGC 6302)', dist: '3,400 ly', age: '~2,200 yrs', desc: 'Bipolar nebula with "wings" of gas expanding at 600 km/s. Central star is one of the hottest known at 250,000 K (43x the Sun).', shape: 'Bipolar (butterfly)', color: '#c084fc', icon: '\uD83E\uDD8B' },
            { name: 'Hourglass Nebula (MyCn 18)', dist: '8,000 ly', age: '~few thousand yrs', desc: 'Hubble revealed a striking hourglass shape with an eerie "eye" at the center. Formed by fast stellar wind interacting with a slower previous wind.', shape: 'Hourglass/bipolar', color: '#fbbf24', icon: '\u23F3' }
          ];

          // Cosmic catastrophes
          var COSMIC_CATASTROPHES = [
            { name: 'Gamma-Ray Burst (GRB)', energy: '10^44 joules in seconds', freq: '~1/day (observed)', desc: 'The most energetic events since the Big Bang. Long GRBs come from collapsing massive stars (hypernovae). Short GRBs from merging neutron stars. A nearby GRB aimed at Earth could sterilize the biosphere.', danger: 'Extinction-level within ~6,500 ly', icon: '\u26A1' },
            { name: 'Magnetar Flare', energy: '10^39 joules', freq: 'Rare', desc: 'Neutron stars with magnetic fields 10^15 Gauss (quadrillion times Earth\'s). Starquakes release titanic flares. In 2004, a magnetar 50,000 ly away was bright enough to affect Earth\'s ionosphere.', danger: 'Dangerous within ~10 ly', icon: '\uD83E\uDDF2' },
            { name: 'Asteroid Impact', energy: 'Varies (Chicxulub: 10^25 J)', freq: '~100 Myr for extinction-class', desc: 'The Chicxulub impactor (10 km wide) ended the dinosaurs 66 Mya. Smaller impacts (Tunguska 1908, Chelyabinsk 2013) happen more frequently. NASA\'s DART mission proved we can deflect asteroids.', danger: 'Depends on size and speed', icon: '\u2604' },
            { name: 'Supernova Near Earth', energy: '10^44 joules', freq: '~few per century (galaxy-wide)', desc: 'A supernova within 30 light-years could destroy the ozone layer via cosmic rays, causing mass extinction from UV radiation. The nearest candidate (IK Pegasi) is 150 ly away \u2014 safe for now.', danger: 'Dangerous within ~30 ly', icon: '\uD83D\uDCA5' },
            { name: 'Solar Superflare', energy: '10^26+ joules', freq: 'Unknown for our Sun', desc: 'Some Sun-like stars produce superflares 100-10,000x stronger than the strongest recorded solar flare. If our Sun did this, it could fry satellite electronics, knock out power grids, and increase radiation.', danger: 'Infrastructure collapse', icon: '\u2600\uFE0F' },
            { name: 'Galaxy Collision', energy: 'Gravitational', freq: 'Common over Gyr timescales', desc: 'The Milky Way will collide with Andromeda in ~4.5 billion years. Despite billions of stars in each galaxy, direct star collisions are extremely unlikely \u2014 but gravitational disruption will reshape both galaxies entirely.', danger: 'Stellar orbit disruption (very long-term)', icon: '\uD83C\uDF00' }
          ];

          // Electromagnetic spectrum in astronomy
          var EM_SPECTRUM = [
            { name: 'Radio Waves', wavelength: '> 1 mm', sees: 'Pulsars, quasars, CMB, 21-cm hydrogen line, fast radio bursts', telescope: 'Arecibo, ALMA, VLA, FAST, SKA', color: '#ef4444', desc: 'Penetrates dust clouds. Essential for studying cold gas, mapping the Milky Way, and SETI.' },
            { name: 'Microwaves', wavelength: '1 mm \u2013 1 m', sees: 'Cosmic Microwave Background (CMB), Sunyaev-Zel\'dovich effect', telescope: 'Planck, WMAP, COBE, ACT', color: '#f97316', desc: 'The CMB is the oldest light in the universe. Tiny temperature variations reveal the seeds of all cosmic structure.' },
            { name: 'Infrared', wavelength: '700 nm \u2013 1 mm', sees: 'Dust-shrouded star formation, exoplanet atmospheres, early galaxies', telescope: 'JWST, Spitzer, Herschel, WISE', color: '#eab308', desc: 'Sees through dust! JWST observes in infrared to see the most distant (and thus oldest) galaxies in the universe.' },
            { name: 'Visible Light', wavelength: '400 \u2013 700 nm', sees: 'Stars, galaxies, nebulae, planets', telescope: 'Hubble, VLT, Keck, ELT, Rubin', color: '#22c55e', desc: 'What our eyes see. Most of classical astronomy. Hubble\'s visible-light images revolutionized public engagement with space.' },
            { name: 'Ultraviolet', wavelength: '10 \u2013 400 nm', sees: 'Hot young stars, stellar atmospheres, intergalactic medium', telescope: 'GALEX, IUE, HST (UV mode)', color: '#3b82f6', desc: 'Reveals the hottest, most energetic stars. Absorbed by Earth\'s atmosphere \u2014 must observe from space.' },
            { name: 'X-rays', wavelength: '0.01 \u2013 10 nm', sees: 'Black hole accretion, supernova remnants, galaxy cluster hot gas, neutron stars', telescope: 'Chandra, XMM-Newton, NuSTAR, XRISM', color: '#8b5cf6', desc: 'Emitted by matter heated to millions of degrees. Maps the most violent processes in the universe.' },
            { name: 'Gamma Rays', wavelength: '< 0.01 nm', sees: 'Gamma-ray bursts, pulsars, active galactic nuclei, dark matter annihilation', telescope: 'Fermi, MAGIC, H.E.S.S., CTA', color: '#ec4899', desc: 'The highest-energy photons. From the most extreme events. Some gamma-ray photons carry more energy than a tennis ball.' }
          ];

          // Scale of the universe (powers of 10)
          var COSMIC_SCALES = [
            { name: 'Quark', size: '< 10\u207B\u00B9\u2078 m', power: -18, desc: 'Fundamental building blocks of protons and neutrons. Come in 6 flavors: up, down, charm, strange, top, bottom.', icon: '\u26AA' },
            { name: 'Proton', size: '10\u207B\u00B9\u2075 m', power: -15, desc: 'Made of 3 quarks (uud). The nucleus of a hydrogen atom. 1,836x heavier than an electron.', icon: '\u26AB' },
            { name: 'Atom', size: '10\u207B\u00B9\u2070 m', power: -10, desc: 'Mostly empty space! If the nucleus were a marble, the electron cloud would be a football stadium.', icon: '\u2699' },
            { name: 'DNA Molecule', size: '2 nm wide, 2 m long', power: -9, desc: '3.2 billion base pairs encoding the blueprint of life. Uncoiled, one cell\'s DNA stretches 2 meters.', icon: '\uD83E\uDDEC' },
            { name: 'Human Cell', size: '~10 \u00B5m', power: -5, desc: 'Your body contains ~37 trillion cells. Each is a miniature city with its own power plants (mitochondria).', icon: '\uD83E\uDDA0' },
            { name: 'Human', size: '~1.7 m', power: 0, desc: 'You are here. Made of atoms forged in stars, organized by 3.8 billion years of evolution.', icon: '\uD83E\uDDD1' },
            { name: 'Earth', size: '1.27 \u00D7 10\u2077 m', power: 7, desc: 'Our home planet. Thin atmosphere, liquid water, magnetic field \u2014 the conditions for life.', icon: '\uD83C\uDF0D' },
            { name: 'Sun', size: '1.39 \u00D7 10\u2079 m', power: 9, desc: '109 Earths fit across. A G2V main-sequence star, 4.6 billion years old, halfway through its life.', icon: '\u2600\uFE0F' },
            { name: 'Solar System', size: '~9 \u00D7 10\u00B9\u00B2 m', power: 12, desc: 'From the Sun to the Oort Cloud. Light takes ~1.5 years to cross. 8 planets, 200+ moons.', icon: '\uD83E\uDE90' },
            { name: 'Light-Year', size: '9.46 \u00D7 10\u00B9\u2075 m', power: 15, desc: 'The distance light travels in one year. Nearest star (Proxima Centauri): 4.24 light-years away.', icon: '\u2B50' },
            { name: 'Milky Way', size: '~10\u00B2\u2070 m (100,000 ly)', power: 20, desc: '200-400 billion stars. Our solar system orbits the center every 230 million years (one "galactic year").', icon: '\uD83C\uDF00' },
            { name: 'Galaxy Supercluster', size: '~5 \u00D7 10\u00B2\u2074 m (500 Mly)', power: 24, desc: 'Laniakea, our home supercluster, contains 100,000+ galaxies gravitationally connected.', icon: '\uD83C\uDF0C' },
            { name: 'Observable Universe', size: '8.8 \u00D7 10\u00B2\u2076 m (93 Gly)', power: 26, desc: '~2 trillion galaxies. Everything we can ever observe. Beyond this, light has not had time to reach us.', icon: '\uD83C\uDF20' }
          ];

          // Spectral classification (OBAFGKM)
          var SPECTRAL_CLASSES = [
            { class: 'O', temp: '30,000-50,000+ K', color: '#6366f1', colorName: 'Blue', mass: '16-150+ M\u2609', luminosity: '30,000-1,000,000+ L\u2609', lifespan: '1-10 Myr', pct: '~0.00003%', example: 'Alnitak, Naos', desc: 'The hottest, most massive, most luminous, and rarest main-sequence stars. Produce copious UV radiation that ionizes surrounding gas, creating H II regions. Burn through fuel incredibly fast.' },
            { class: 'B', temp: '10,000-30,000 K', color: '#818cf8', colorName: 'Blue-white', mass: '2.1-16 M\u2609', luminosity: '25-30,000 L\u2609', lifespan: '10-100 Myr', pct: '~0.12%', example: 'Rigel, Spica', desc: 'Hot blue-white stars. Rigel, the brightest star in Orion, is a B-type supergiant 120,000x the Sun\'s luminosity. Many B-stars are in young open clusters.' },
            { class: 'A', temp: '7,500-10,000 K', color: '#c4b5fd', colorName: 'White', mass: '1.4-2.1 M\u2609', luminosity: '5-25 L\u2609', lifespan: '1-2 Gyr', pct: '~0.6%', example: 'Sirius, Vega', desc: 'Bright white stars. Sirius (the brightest star in the night sky) and Vega are both A-type. Strong hydrogen absorption lines. Many have debris disks.' },
            { class: 'F', temp: '6,000-7,500 K', color: '#fde68a', colorName: 'Yellow-white', mass: '1.0-1.4 M\u2609', luminosity: '1.5-5 L\u2609', lifespan: '2-7 Gyr', pct: '~3%', example: 'Procyon, Canopus', desc: 'Yellow-white stars slightly hotter than the Sun. Good candidates for habitable planets \u2014 long-lived enough for complex life but brighter than K/M stars.' },
            { class: 'G', temp: '5,200-6,000 K', color: '#fbbf24', colorName: 'Yellow', mass: '0.8-1.0 M\u2609', luminosity: '0.6-1.5 L\u2609', lifespan: '7-15 Gyr', pct: '~7.5%', example: 'Sun, Alpha Centauri A', desc: 'Our Sun is a G2V star! Yellow stars with the right temperature and lifespan for life. The "Goldilocks" spectral type. Prominent calcium absorption lines.' },
            { class: 'K', temp: '3,700-5,200 K', color: '#fb923c', colorName: 'Orange', mass: '0.45-0.8 M\u2609', luminosity: '0.08-0.6 L\u2609', lifespan: '15-30 Gyr', pct: '~12%', example: 'Arcturus, Epsilon Eridani', desc: 'Orange stars. Very long-lived \u2014 great for habitable planets! Less UV radiation than G-stars, reducing mutation rates. Increasingly favored in the search for life.' },
            { class: 'M', temp: '2,400-3,700 K', color: '#ef4444', colorName: 'Red', mass: '0.08-0.45 M\u2609', luminosity: '0.0001-0.08 L\u2609', lifespan: 'Up to trillions of years', pct: '~76%', example: 'Proxima Centauri, TRAPPIST-1', desc: 'Red dwarfs \u2014 the most common stars by far. So dim they\'re invisible to the naked eye. But they live almost forever! Many have been found to host rocky exoplanets (TRAPPIST-1 has 7!).' }
          ];

          // Gravity on different bodies
          var GRAVITY_BODIES = [
            { name: 'Moon', g: 0.166, icon: '\uD83C\uDF15', desc: 'You could jump 6x higher!' },
            { name: 'Mars', g: 0.378, icon: '\uD83D\uDD34', desc: 'About 1/3 of Earth. Manageable for colonists.' },
            { name: 'Earth', g: 1.0, icon: '\uD83C\uDF0D', desc: 'Home! 9.81 m/s\u00B2' },
            { name: 'Jupiter', g: 2.528, icon: '\uD83E\uDE90', desc: 'You\'d be crushed. No solid surface anyway!' },
            { name: 'Saturn', g: 1.065, icon: '\uD83E\uDE90', desc: 'Surprisingly close to Earth (low density!)' },
            { name: 'Sun', g: 27.94, icon: '\u2600\uFE0F', desc: 'A 70 kg person would weigh ~1,956 kg' },
            { name: 'Neutron Star', g: 200000000000, icon: '\uD83D\uDCAB', desc: '200 billion g! Spaghettification guaranteed.' },
            { name: 'Pluto', g: 0.063, icon: '\u26AA', desc: 'You\'d weigh less than a house cat.' },
            { name: 'Titan (Saturn moon)', g: 0.138, icon: '\uD83C\uDF19', desc: 'Low enough that humans could strap on wings and fly!' },
            { name: 'ISS (orbit)', g: 0.89, icon: '\uD83D\uDEF0', desc: 'Not zero-g! Astronauts are in freefall (89% Earth gravity)' }
          ];

          // Famous space images
          var FAMOUS_IMAGES = [
            { name: 'Earthrise (1968)', mission: 'Apollo 8', desc: 'Taken by astronaut Bill Anders during the first crewed orbit of the Moon. Seeing Earth as a fragile blue marble floating in the void of space catalyzed the modern environmental movement.', impact: 'Inspired Earth Day and the environmental movement', icon: '\uD83C\uDF0D' },
            { name: 'Pale Blue Dot (1990)', mission: 'Voyager 1', desc: 'Carl Sagan convinced NASA to turn Voyager 1 around at 6 billion km to photograph Earth. Our planet appears as a tiny blue speck in a sunbeam. "Look again at that dot. That\'s here. That\'s home. That\'s us."', impact: 'Humbled humanity with cosmic perspective', icon: '\uD83D\uDD35' },
            { name: 'Hubble Deep Field (1995)', mission: 'HST', desc: 'Hubble stared at a "blank" patch of sky (1/13-millionth of the sky) for 10 days. Result: ~3,000 galaxies, some 12+ billion years old. Proved galaxies fill the entire universe in every direction.', impact: 'Revealed the universe contains ~2 trillion galaxies', icon: '\uD83C\uDF0C' },
            { name: 'Pillars of Creation (1995/2022)', mission: 'HST / JWST', desc: 'Towering columns of gas and dust in the Eagle Nebula where new stars are being born. Hubble\'s 1995 image became the most famous space photo ever. JWST re-imaged it in infrared, revealing hidden stars.', impact: 'Most iconic nebula image in history', icon: '\u2728' },
            { name: 'First Black Hole Image (2019)', mission: 'EHT', desc: 'The Event Horizon Telescope combined 8 radio telescopes across 4 continents to create an Earth-sized virtual dish. Result: the shadow of the supermassive black hole in galaxy M87, 6.5 billion solar masses.', impact: 'Confirmed black holes look exactly as Einstein predicted', icon: '\uD83D\uDD73' },
            { name: 'JWST Deep Field (2022)', mission: 'JWST', desc: 'The deepest, sharpest infrared image of the distant universe ever taken. Shows galaxy cluster SMACS 0723 as it appeared 4.6 billion years ago, with gravitational lensing revealing galaxies 13+ billion years old.', impact: 'New era of infrared astronomy began', icon: '\uD83C\uDF1F' },
            { name: 'Blue Marble (1972)', mission: 'Apollo 17', desc: 'The first full-disk photograph of Earth taken by humans. Shot by the Apollo 17 crew on their way to the Moon. One of the most reproduced images in history.', impact: 'Became a symbol for the environmental movement', icon: '\uD83C\uDF0E' },
            { name: 'Cosmic Microwave Background (2013)', mission: 'Planck', desc: 'The most detailed map of the oldest light in the universe (380,000 years after the Big Bang). Tiny temperature fluctuations (1 part in 100,000) are the seeds of all cosmic structure.', impact: 'Determined universe age: 13.799 \u00B1 0.021 Gyr', icon: '\uD83C\uDF21' }
          ];

          // Cosmic speed comparison
          var COSMIC_SPEEDS = [
            { name: 'Human walking', speed: '5 km/h', mps: 1.4, frac: '0.0000005%', icon: '\uD83D\uDEB6', color: '#22c55e' },
            { name: 'Cheetah (fastest land animal)', speed: '120 km/h', mps: 33, frac: '0.00001%', icon: '\uD83D\uDC06', color: '#65a30d' },
            { name: 'Commercial jet', speed: '900 km/h', mps: 250, frac: '0.00008%', icon: '\u2708', color: '#3b82f6' },
            { name: 'ISS orbital speed', speed: '28,000 km/h', mps: 7700, frac: '0.003%', icon: '\uD83D\uDEF0', color: '#6366f1' },
            { name: 'New Horizons (fastest spacecraft)', speed: '58,000 km/h', mps: 16000, frac: '0.005%', icon: '\uD83D\uDE80', color: '#8b5cf6' },
            { name: 'Earth orbiting the Sun', speed: '107,000 km/h', mps: 30000, frac: '0.01%', icon: '\uD83C\uDF0D', color: '#0ea5e9' },
            { name: 'Sun orbiting the Milky Way', speed: '828,000 km/h', mps: 230000, frac: '0.08%', icon: '\u2600\uFE0F', color: '#f59e0b' },
            { name: 'Milky Way through space', speed: '2.1 million km/h', mps: 600000, frac: '0.2%', icon: '\uD83C\uDF00', color: '#f97316' },
            { name: 'Speed of light', speed: '1.08 billion km/h', mps: 299792458, frac: '100%', icon: '\u26A1', color: '#fbbf24' },
            { name: 'Cosmic expansion (distant galaxies)', speed: '>c (space expands)', mps: null, frac: '>100%!', icon: '\uD83C\uDF20', color: '#ef4444' }
          ];

          // Citizen science projects
          var CITIZEN_SCIENCE = [
            { name: 'Galaxy Zoo', url: 'zooniverse.org/projects/zookeeper/galaxy-zoo', desc: 'Classify galaxy shapes from real telescope images. Your clicks help astronomers understand how galaxies form and evolve. Over 100 million classifications by volunteers!', field: 'Galaxy morphology', icon: '\uD83C\uDF00' },
            { name: 'Planet Hunters TESS', url: 'zooniverse.org', desc: 'Search NASA TESS satellite data for dips in starlight that reveal orbiting exoplanets. Citizen scientists have already discovered confirmed exoplanets that algorithms missed!', field: 'Exoplanet detection', icon: '\uD83C\uDF0D' },
            { name: 'Backyard Worlds: Planet 9', url: 'zooniverse.org', desc: 'Search WISE infrared data for brown dwarfs and the hypothetical Planet Nine. Citizen scientists discovered over 100 new brown dwarfs and 1,500+ cold worlds.', field: 'Brown dwarfs / Planet 9 search', icon: '\uD83D\uDD0D' },
            { name: 'Supernova Hunters', url: 'zooniverse.org', desc: 'Spot supernovae in galaxy images by looking for new bright points that weren\'t there before. Real-time alerts sent to professional telescopes for follow-up.', field: 'Transient detection', icon: '\uD83D\uDCA5' },
            { name: 'Globe at Night', url: 'globeatnight.org', desc: 'Measure light pollution from your location by counting visible stars. Contributes to the global light pollution database. Great classroom activity!', field: 'Light pollution monitoring', icon: '\uD83C\uDF03' },
            { name: 'SETI@home / Breakthrough Listen', url: 'breakthroughinitiatives.org', desc: 'Search for technosignatures from extraterrestrial intelligence in radio telescope data. Breakthrough Listen is the most comprehensive SETI program ever, scanning 1 million stars.', field: 'Search for ET intelligence', icon: '\uD83D\uDC7D' }
          ];

          // Cosmology glossary
          var COSMO_GLOSSARY = [
            { term: 'Accretion', def: 'The process of matter falling onto a massive object (black hole, star, planet) due to gravity. Accretion disks form when infalling material has angular momentum.' },
            { term: 'Baryon', def: 'Particles made of 3 quarks (protons, neutrons). "Baryonic matter" = ordinary matter. Only ~5% of the universe.' },
            { term: 'CMB (Cosmic Microwave Background)', def: 'The oldest light in the universe, released 380,000 years after the Big Bang when atoms first formed. Now cooled to 2.725 K microwaves.' },
            { term: 'Cosmic Inflation', def: 'A period of exponential expansion in the first 10\u207B\u00B3\u00B2 seconds. Expanded the universe by a factor of ~10\u00B2\u2076. Explains flatness and horizon problems.' },
            { term: 'Dark Energy', def: '~68% of the universe. Causes accelerating expansion. Discovered 1998 via Type Ia supernovae. Nature completely unknown.' },
            { term: 'Dark Matter', def: '~27% of the universe. Has gravity but doesn\'t emit light. Detected via galaxy rotation curves, gravitational lensing. Particle identity unknown.' },
            { term: 'Event Horizon', def: 'The boundary around a black hole beyond which nothing can escape \u2014 not even light. For a 10 M\u2609 black hole: ~30 km radius.' },
            { term: 'General Relativity', def: 'Einstein\'s 1915 theory: gravity is the curvature of spacetime caused by mass/energy. Predicts black holes, gravitational waves, time dilation.' },
            { term: 'Gravitational Waves', def: 'Ripples in spacetime caused by accelerating massive objects (merging black holes, neutron stars). First detected by LIGO in 2015.' },
            { term: 'Hawking Radiation', def: 'Theoretical radiation emitted by black holes due to quantum effects near the event horizon. Causes black holes to slowly evaporate over 10\u00B9\u2070\u2070 years.' },
            { term: 'Hubble Constant (H\u2080)', def: 'The expansion rate of the universe: ~70 km/s per megaparsec. There is currently a "Hubble tension" \u2014 different methods give slightly different values.' },
            { term: 'Light-year', def: 'The distance light travels in one year: 9.461 \u00D7 10\u00B9\u00B2 km. Not a unit of time!' },
            { term: 'Nucleosynthesis', def: 'The creation of atomic nuclei. Big Bang nucleosynthesis made H, He, Li. Stellar nucleosynthesis fuses heavier elements up to iron.' },
            { term: 'Parallax', def: 'The apparent shift in a star\'s position as Earth orbits the Sun. Used to measure distances to nearby stars (< ~1,000 ly).' },
            { term: 'Redshift (z)', def: 'Stretching of light to longer wavelengths. Caused by recession velocity (Doppler) or cosmic expansion (cosmological). z = (\u03BB_obs - \u03BB_emit) / \u03BB_emit.' },
            { term: 'Singularity', def: 'A point of theoretically infinite density. Exists at the center of black holes and at the Big Bang. Indicates our physics breaks down.' },
            { term: 'Spacetime', def: 'The 4-dimensional fabric of the universe (3 space + 1 time). Mass curves spacetime; objects follow curved paths (this IS gravity).' },
            { term: 'Standard Candle', def: 'An object of known intrinsic brightness. By comparing apparent vs. intrinsic brightness, distance can be calculated. Type Ia supernovae and Cepheid variables are key standard candles.' }
          ];

          var isDark = d.isDark || false;

          // Carl Sagan's Cosmic Calendar
          var COSMIC_CALENDAR = [
            { date: 'Jan 1, 00:00:00', event: 'Big Bang', real: '13.8 billion years ago', icon: '\uD83D\uDCA5' },
            { date: 'Jan 22', event: 'First galaxies form', real: '12.85 billion years ago', icon: '\uD83C\uDF0C' },
            { date: 'Mar 16', event: 'Milky Way forms', real: '11 billion years ago', icon: '\uD83C\uDF00' },
            { date: 'Sep 2', event: 'Solar System forms', real: '4.57 billion years ago', icon: '\u2600\uFE0F' },
            { date: 'Sep 7', event: 'Earth forms', real: '4.54 billion years ago', icon: '\uD83C\uDF0D' },
            { date: 'Sep 14', event: 'First life (microbes)', real: '4.1 billion years ago', icon: '\uD83E\uDDA0' },
            { date: 'Nov 9', event: 'First complex cells', real: '2 billion years ago', icon: '\uD83E\uDDEC' },
            { date: 'Dec 5', event: 'First multicellular life', real: '800 million years ago', icon: '\uD83E\uDD9A' },
            { date: 'Dec 14', event: 'Cambrian Explosion', real: '530 million years ago', icon: '\uD83D\uDC1A' },
            { date: 'Dec 17', event: 'First land plants', real: '470 million years ago', icon: '\uD83C\uDF3F' },
            { date: 'Dec 25', event: 'Dinosaurs appear', real: '230 million years ago', icon: '\uD83E\uDD95' },
            { date: 'Dec 30, 06:24', event: 'Dinosaurs go extinct', real: '66 million years ago', icon: '\u2604' },
            { date: 'Dec 31, 22:24', event: 'First humans', real: '2.5 million years ago', icon: '\uD83E\uDDD1' },
            { date: 'Dec 31, 23:59:32', event: 'Pyramids built', real: '~4,500 years ago', icon: '\uD83D\uDDFF' },
            { date: 'Dec 31, 23:59:59', event: 'Modern science', real: '~500 years ago', icon: '\uD83D\uDD2C' }
          ];

          // Galaxy types
          var GALAXY_TYPES = [
            { name: 'Spiral', example: 'Milky Way, Andromeda', pct: '~60%', desc: 'Flat disk with spiral arms of gas, dust, and young stars rotating around a central bulge. Active star formation in the arms.', features: 'Central bulge + disk + spiral arms + halo', icon: '\uD83C\uDF00' },
            { name: 'Elliptical', example: 'M87, IC 1101', pct: '~20%', desc: 'Smooth, featureless blobs ranging from nearly spherical to elongated. Mostly old red/yellow stars. Very little gas or dust \u2014 star formation has stopped.', features: 'No disk, no arms, uniform glow', icon: '\u26AA' },
            { name: 'Lenticular', example: 'NGC 2787, Spindle Galaxy', pct: '~15%', desc: 'Hybrid between spiral and elliptical. Has a disk and bulge but no spiral arms. Star formation depleted.', features: 'Disk + bulge, no arms', icon: '\uD83D\uDFE0' },
            { name: 'Irregular', example: 'Large Magellanic Cloud', pct: '~5%', desc: 'No regular shape. Often the result of gravitational interactions or collisions with other galaxies. Rich in gas and active star formation.', features: 'Chaotic structure', icon: '\u2728' }
          ];

          // Black hole anatomy
          var BLACK_HOLE_PARTS = [
            { name: 'Singularity', desc: 'The infinitely dense point at the center where all the mass is concentrated. Our physics breaks down here \u2014 general relativity and quantum mechanics conflict.', color: '#000000' },
            { name: 'Event Horizon', desc: 'The point of no return. Once anything crosses this boundary, not even light can escape. For a 10-solar-mass black hole, this is about 30 km across.', color: '#1a1a2a' },
            { name: 'Photon Sphere', desc: 'At 1.5x the event horizon radius, photons orbit the black hole. Light can theoretically circle it here, but the orbit is unstable.', color: '#4a3a6a' },
            { name: 'Accretion Disk', desc: 'Superheated matter spiraling into the black hole at near light speed. Friction heats it to millions of degrees, emitting intense X-rays. This is what the EHT photographed.', color: '#f97316' },
            { name: 'Relativistic Jets', desc: 'Powerful beams of matter and energy ejected from the poles at 99.5% the speed of light. Can extend millions of light-years! Powered by magnetic fields in the accretion disk.', color: '#6366f1' },
            { name: 'Ergosphere', desc: 'A region outside the event horizon where spacetime is dragged so violently by the spinning black hole that nothing can remain stationary. Energy can theoretically be extracted here (Penrose process).', color: '#22c55e' }
          ];

          // Drake Equation parameters
          var DRAKE_DEFAULTS = {
            R: 1.5, // star formation rate
            fp: 0.5, // fraction with planets
            ne: 2, // habitable planets per system
            fl: 0.5, // fraction developing life
            fi: 0.1, // fraction developing intelligence
            fc: 0.1, // fraction detectable
            L: 10000 // years civilization lasts
          };

          // Famous astronomers
          var ASTRONOMERS = [
            { name: 'Claudius Ptolemy', year: '~150 AD', contribution: 'Earth-centered (geocentric) model of the universe that dominated for 1,400 years', icon: '\uD83C\uDF0D' },
            { name: 'Nicolaus Copernicus', year: '1543', contribution: 'Proposed Sun-centered (heliocentric) model \u2014 revolutionary paradigm shift', icon: '\u2600\uFE0F' },
            { name: 'Galileo Galilei', year: '1610', contribution: 'First to use telescope for astronomy. Saw Jupiter\'s moons, phases of Venus, craters on Moon', icon: '\uD83D\uDD2D' },
            { name: 'Johannes Kepler', year: '1619', contribution: 'Three laws of planetary motion \u2014 orbits are ellipses, not circles', icon: '\uD83D\uDCCA' },
            { name: 'Isaac Newton', year: '1687', contribution: 'Universal gravitation + calculus. Explained why Kepler\'s laws work', icon: '\uD83C\uDF4E' },
            { name: 'William Herschel', year: '1781', contribution: 'Discovered Uranus \u2014 first new planet since antiquity', icon: '\u26AA' },
            { name: 'Henrietta Leavitt', year: '1912', contribution: 'Period-luminosity relation of Cepheids \u2014 enabled measuring cosmic distances', icon: '\u2B50' },
            { name: 'Edwin Hubble', year: '1929', contribution: 'Proved galaxies exist beyond Milky Way. Discovered universe is expanding', icon: '\uD83C\uDF0C' },
            { name: 'Vera Rubin', year: '1970s', contribution: 'Galaxy rotation curves proved dark matter exists \u2014 galaxies spin too fast for visible matter alone', icon: '\uD83D\uDD73' },
            { name: 'Stephen Hawking', year: '1974', contribution: 'Hawking radiation \u2014 black holes slowly evaporate. Bridged quantum mechanics and gravity', icon: '\u2B1B' },
            { name: 'Jocelyn Bell Burnell', year: '1967', contribution: 'Discovered pulsars (rapidly spinning neutron stars) as a graduate student', icon: '\uD83D\uDCAB' },
            { name: 'Saul Perlmutter et al.', year: '1998', contribution: 'Discovered accelerating expansion of universe \u2014 dark energy (Nobel Prize 2011)', icon: '\uD83D\uDE80' }
          ];

          // Supernova types
          var SUPERNOVA_TYPES = [
            { type: 'Type Ia', trigger: 'White dwarf in binary system', mechanism: 'White dwarf accretes matter from companion star until it exceeds 1.4 solar masses (Chandrasekhar limit) and detonates in thermonuclear explosion.', importance: 'Standard candles \u2014 all have the same brightness, used to measure cosmic distances. Led to discovery of dark energy!', brightness: '~5 billion suns', icon: '\uD83D\uDCA1' },
            { type: 'Type II (Core Collapse)', trigger: 'Massive star (8+ solar masses)', mechanism: 'Iron core grows until it can no longer support itself against gravity. Core collapses in milliseconds, rebounds, and blows outer layers into space.', importance: 'Creates and disperses heavy elements (oxygen, calcium, iron). Leaves behind neutron star or black hole.', brightness: '~1 billion suns', icon: '\uD83D\uDCA5' }
          ];

          // Observable universe facts
          var OBSERVABLE_UNIVERSE = {
            radius: '46.5 billion light-years',
            diameter: '93 billion light-years',
            age: '13.8 billion years',
            whyBigger: 'Space itself has been expanding since the Big Bang. Light left the most distant visible objects 13.8 billion years ago, but those objects have since moved to 46.5 billion light-years away due to expansion.',
            beyondIt: 'There is almost certainly more universe beyond what we can observe. We just can\'t see it because light from there hasn\'t had time to reach us. It might be infinite.',
            comoving: 'The comoving distance (accounting for expansion) to the edge is 46.5 billion light-years in every direction. The particle horizon defines this limit.'
          };

          // Element origins
          var ELEMENT_ORIGINS = [
            { name: 'Hydrogen (H)', origin: 'Big Bang', pct: '73%', note: 'Created in the first 3 minutes. Most abundant element.', color: '#fbbf24' },
            { name: 'Helium (He)', origin: 'Big Bang + Stars', pct: '25%', note: 'Mostly from Big Bang nucleosynthesis. Also made in stellar fusion.', color: '#fde68a' },
            { name: 'Carbon (C)', origin: 'Stellar fusion', pct: 'Trace', note: 'Made in red giant cores via triple-alpha process. Basis of all life.', color: '#94a3b8' },
            { name: 'Oxygen (O)', origin: 'Massive star fusion', pct: 'Trace', note: 'Made in massive star cores. Third most abundant element in universe.', color: '#3b82f6' },
            { name: 'Iron (Fe)', origin: 'Stellar core collapse', pct: 'Trace', note: 'The heaviest element made by normal fusion. Making heavier elements costs energy.', color: '#94a3b8' },
            { name: 'Gold (Au)', origin: 'Neutron star mergers', pct: 'Ultra-trace', note: 'Created when two neutron stars collide! That\'s why gold is so rare.', color: '#f59e0b' },
            { name: 'Uranium (U)', origin: 'Supernovae + mergers', pct: 'Ultra-trace', note: 'Heaviest natural element. Powers nuclear reactors and heats Earth\'s core.', color: '#10b981' },
            { name: 'Lithium (Li)', origin: 'Big Bang + cosmic rays', pct: 'Trace', note: 'Tiny amount from Big Bang. Also made when cosmic rays hit atoms in space.', color: '#ef4444' }
          ];

          // Cosmic structure hierarchy
          var COSMIC_STRUCTURES = [
            { name: 'Planet', example: 'Earth', size: '~12,742 km', icon: '\uD83C\uDF0D', desc: 'Rocky or gas body orbiting a star' },
            { name: 'Star System', example: 'Solar System', size: '~9 billion km', icon: '\u2600\uFE0F', desc: 'A star with its orbiting planets, moons, and debris' },
            { name: 'Star Cluster', example: 'Pleiades', size: '~10 light-years', icon: '\u2728', desc: 'Hundreds to millions of stars born from the same cloud' },
            { name: 'Galaxy', example: 'Milky Way', size: '~100,000 light-years', icon: '\uD83C\uDF00', desc: '100-400 billion stars, gas, dust, and dark matter' },
            { name: 'Galaxy Group', example: 'Local Group', size: '~10 million light-years', icon: '\uD83C\uDF0C', desc: '~80 galaxies gravitationally bound together' },
            { name: 'Galaxy Cluster', example: 'Virgo Cluster', size: '~15 million light-years', icon: '\uD83D\uDD2D', desc: '1,000-10,000 galaxies, hot intracluster gas' },
            { name: 'Supercluster', example: 'Laniakea', size: '~500 million light-years', icon: '\uD83E\uDDE8', desc: 'Thousands of galaxy clusters connected by filaments' },
            { name: 'Observable Universe', example: '\u2014', size: '93 billion light-years', icon: '\uD83C\uDF20', desc: '~2 trillion galaxies. Beyond this, light hasn\'t reached us yet.' }
          ];

          // Famous telescopes
          var TELESCOPES = [
            { name: 'Hubble Space Telescope', year: '1990+', type: 'Optical/UV/IR', achievement: 'Deep Field images revealed thousands of galaxies in a pinpoint of sky. Measured universe expansion rate.', icon: '\uD83D\uDD2D' },
            { name: 'James Webb Space Telescope', year: '2022+', type: 'Infrared', achievement: 'Sees the most distant galaxies ever observed (13.4+ billion years old). Studying exoplanet atmospheres.', icon: '\uD83C\uDF1F' },
            { name: 'LIGO/Virgo', year: '2015+', type: 'Gravitational waves', achievement: 'First direct detection of gravitational waves from merging black holes (Nobel Prize 2017).', icon: '\uD83C\uDF0A' },
            { name: 'Event Horizon Telescope', year: '2019+', type: 'Radio (Earth-sized)', achievement: 'First image of a black hole shadow (M87*, then Sgr A*). Planet-spanning interferometer.', icon: '\uD83D\uDD73' },
            { name: 'Planck Satellite', year: '2009-2013', type: 'Microwave', achievement: 'Most precise map of the CMB. Determined universe age: 13.799 \u00B1 0.021 billion years.', icon: '\uD83C\uDF21' },
            { name: 'Chandra X-ray Observatory', year: '1999+', type: 'X-ray', achievement: 'Images of supernova remnants, black hole jets, galaxy cluster collisions.', icon: '\u2728' }
          ];

          // Cosmic numbers
          var COSMIC_NUMBERS = [
            { label: 'Stars in the Milky Way', value: '200-400 billion', icon: '\u2B50' },
            { label: 'Galaxies in observable universe', value: '~2 trillion', icon: '\uD83C\uDF0C' },
            { label: 'Age of the universe', value: '13.799 billion years', icon: '\u23F3' },
            { label: 'Size of observable universe', value: '93 billion light-years', icon: '\uD83D\uDCCF' },
            { label: 'Temperature of CMB', value: '2.725 K (-270.4\u00B0C)', icon: '\uD83C\uDF21' },
            { label: 'Speed of light', value: '299,792,458 m/s', icon: '\u26A1' },
            { label: 'Mass of the Sun', value: '1.989 \u00D7 10\u00B3\u2070 kg', icon: '\u2600\uFE0F' },
            { label: 'Confirmed exoplanets', value: '5,700+', icon: '\uD83C\uDF0D' },
            { label: 'Farthest human-made object', value: 'Voyager 1: 24+ billion km', icon: '\uD83D\uDEF0' },
            { label: 'Atoms in a human body', value: '~7 \u00D7 10\u00B2\u2077', icon: '\uD83E\uDDEC' }
          ];

          // Cosmic quiz questions
          var COSMIC_QUIZ = [
            { q: 'How old is the universe?', options: ['4.5 billion years', '13.8 billion years', '100 billion years', '1 trillion years'], correct: 1 },
            { q: 'What makes up most of the universe?', options: ['Stars', 'Dark energy', 'Planets', 'Hydrogen gas'], correct: 1 },
            { q: 'What is the CMB?', options: ['A type of star', 'Oldest light in the universe', 'Dark matter signal', 'A galaxy cluster'], correct: 1 },
            { q: 'Where is gold created?', options: ['In the Sun', 'In the Big Bang', 'In neutron star mergers', 'In Earth\'s core'], correct: 2 },
            { q: 'What instrument detected gravitational waves?', options: ['Hubble', 'JWST', 'LIGO', 'Chandra'], correct: 2 },
            { q: 'What percentage of the universe is ordinary matter?', options: ['5%', '27%', '50%', '68%'], correct: 0 },
            { q: 'What will happen to the Sun in ~5 billion years?', options: ['Explode as supernova', 'Become a black hole', 'Become a red giant', 'Burn out suddenly'], correct: 2 },
            { q: 'What is the fastest speed possible?', options: ['Warp speed', 'Speed of light', 'Speed of sound', 'Infinite'], correct: 1 },
            { q: 'What was the first element created after the Big Bang?', options: ['Carbon', 'Iron', 'Hydrogen', 'Helium'], correct: 2 },
            { q: 'How many galaxies are in the observable universe?', options: ['~200 billion', '~2 trillion', '~100 million', '~10 billion'], correct: 1 }
          ];



          var cosmicTime = d.cosmicTime !== undefined ? d.cosmicTime : 0;

          var isPlaying = d.isPlaying || false;

          var speed = d.speed || 1;



          // â”€â”€ Cosmic epochs (enhanced) â”€â”€

          var EPOCHS = [

            {

              t: 0, name: t('stem.universe.the_big_bang'), emoji: '\uD83D\uDCA5', color: '#1a0a00', border: '#f59e0b', sky: '#ffffff',

              temp: '10\u00B3\u00B2 K (infinite)', scale: 'Smaller than a proton',

              keyEvent: 'All four fundamental forces unified as one',

              desc: 'All matter, energy, space, and time erupt from an infinitely dense singularity in the most violent event in cosmic history. Within 10\u207B\u00B3\u00B2 seconds, the universe undergoes exponential inflation, expanding faster than light. Temperature: trillions upon trillions of degrees. The four fundamental forces (gravity, electromagnetism, strong & weak nuclear) separate within the first second. Quarks condense into protons and neutrons within 3 minutes.',

              facts: ['The entire observable universe was smaller than a subatomic particle', 'Temperature exceeded 10 trillion degrees Celsius', 'Matter and antimatter annihilated in almost equal amounts \u2014 a tiny surplus of matter (1 in a billion) is everything we see today', 'Inflation expanded the universe by a factor of 10\u00B2\u2076 in 10\u207B\u00B3\u00B2 seconds', 'Within 3 minutes, protons and neutrons fused into the first atomic nuclei (hydrogen, helium, tiny amounts of lithium)', 'This is called Big Bang Nucleosynthesis \u2014 it set the universe\'s H/He ratio at roughly 75%/25% by mass']

            },

            {

              t: 0.38, name: t('stem.universe.recombination'), emoji: '\uD83C\uDF1F', color: '#1a1000', border: '#eab308', sky: '#ff6b35',

              temp: '~3,000 K', scale: '~1,000x smaller than today',

              keyEvent: 'Light breaks free \u2014 the universe becomes transparent',

              desc: 'The universe cools enough for electrons to bind with protons, forming the first neutral atoms (mostly hydrogen and helium). For the first time, photons can travel freely without scattering off charged particles. This released light is the Cosmic Microwave Background (CMB) \u2014 the oldest light in the universe, still detectable today at 2.725 K after being stretched by 13.8 billion years of expansion.',

              facts: ['This occurred ~380,000 years after the Big Bang', 'The CMB was accidentally discovered in 1965 by Penzias and Wilson, earning them a Nobel Prize', 'The CMB has been redshifted from ~3,000 K to 2.725 K by cosmic expansion', 'Tiny temperature fluctuations in the CMB (1 part in 100,000) are the seeds of all cosmic structure', 'The universe went from an opaque plasma to transparent gas in a geologically brief period', 'COBE, WMAP, and Planck satellites mapped the CMB with increasing precision']

            },

            {

              t: 0.4, name: t('stem.universe.the_dark_ages'), emoji: '\uD83C\uDF11', color: '#08061a', border: '#4338ca', sky: '#0a0a1a',

              temp: '60 K \u2192 ~20 K', scale: 'Expanding but starless',

              keyEvent: 'Total cosmic darkness \u2014 no light sources exist',

              desc: 'The most silent era in cosmic history. No stars, no galaxies, no light. The universe is filled with cold neutral hydrogen gas in absolute darkness. Yet gravity is silently at work: dark matter filaments pull ordinary matter into denser clumps, building the scaffolding for everything to come. This era ends when the first stars ignite.',

              facts: ['Lasted roughly 100\u2013200 million years', 'Dark matter formed a vast cosmic web of filaments and nodes', 'Ordinary matter fell into dark matter gravitational wells, seeding future galaxies', 'The 21-cm hydrogen line may let future radio telescopes observe this era directly', 'No electromagnetic radiation was produced \u2014 only gravitational interactions', 'This is the least understood era in cosmology \u2014 no direct observations exist yet']

            },

            {

              t: 0.5, name: t('stem.universe.first_stars_cosmic_dawn'), emoji: '\u2B50', color: '#0a1020', border: '#3b82f6', sky: '#0a1628',

              temp: '~15 K (gas) / millions K (star cores)', scale: 'First light in 200 million years',

              keyEvent: 'Population III stars ignite \u2014 cosmic reionization begins',

              desc: 'The first stars ignite in the darkness \u2014 Population III stars, composed entirely of hydrogen and helium. These primordial giants were 100\u20131,000 times more massive than our Sun, blazing blue-white and living only a few million years before exploding as hypernovae. Their deaths forged the first heavy elements (carbon, oxygen, iron, gold) and scattered them across space, enriching the gas for future generations of stars. Their UV radiation began reionizing the neutral hydrogen, ending the Dark Ages.',

              facts: ['Population III stars have never been directly observed \u2014 they are predicted by models', 'They were made of pure hydrogen and helium (zero metals)', 'Their surface temperatures exceeded 100,000 K \u2014 far hotter than our Sun\'s 5,778 K', 'Some may have collapsed directly into black holes without supernovae', 'Their supernovae created the first carbon, oxygen, silicon, and iron in the universe', 'The James Webb Space Telescope is actively searching for evidence of these first stars']

            },

            {

              t: 1.0, name: t('stem.galaxy.first_galaxies'), emoji: '\uD83C\uDF0C', color: '#0c0a20', border: '#6366f1', sky: '#0f0f2e',

              temp: 'Varied (millions K in quasars)', scale: 'Protogalaxies: ~1,000 light-years',

              keyEvent: 'Supermassive black holes form \u2014 quasars blaze',

              desc: 'Gravity pulls gas and dark matter into the first protogalaxies \u2014 small, chaotic, intensely star-forming clumps. Supermassive black holes form at their centers, devouring surrounding gas and shining as quasars \u2014 the most luminous objects in the universe. The cosmic web of dark matter filaments connects galaxy clusters with bridges of gas spanning millions of light-years. Galaxy mergers are violent and frequent.',

              facts: ['The first galaxies were 100x smaller than the Milky Way', 'Quasars can outshine their entire host galaxy by 100x', 'JWST discovered galaxies existing just 300 million years after the Big Bang \u2014 earlier than expected', 'Supermassive black holes grew to billions of solar masses surprisingly quickly', 'The cosmic web structure is like a sponge \u2014 galaxies along filaments, voids between them', 'Reionization completed around this time \u2014 the universe became fully transparent again']

            },

            {

              t: 4.6, name: t('stem.galaxy.milky_way_forms'), emoji: '\uD83C\uDF00', color: '#0d0a22', border: '#8b5cf6', sky: '#0d0d2a',

              temp: 'Cold gas clouds (~10 K) to hot stellar cores', scale: '100,000 light-years across',

              keyEvent: 'Our home galaxy assembles through hierarchical merging',

              desc: 'Our Milky Way galaxy assembles over billions of years by merging with dozens of smaller galaxies. A central bar forms, majestic spiral arms develop, and 200\u2013400 billion stars settle into orbits around a supermassive black hole (Sagittarius A*, 4 million solar masses). The galactic disk, halo, and bulge take shape. Heavy elements from generations of stellar deaths accumulate, making rocky planets possible.',

              facts: ['The Milky Way consumed the Gaia-Enceladus dwarf galaxy ~10 billion years ago', 'Our galaxy contains 200\u2013400 billion stars and at least 100 billion planets', 'The central black hole (Sgr A*) has 4 million times the Sun\'s mass', 'The galaxy is ~13.6 billion years old, nearly as old as the universe itself', 'The Milky Way\'s spiral arms are density waves, not permanent structures', 'Our galaxy will collide with Andromeda in ~4.5 billion years (Milkomeda)']

            },

            {

              t: 9.2, name: t('stem.universe.our_sun_is_born'), emoji: '\u2600\uFE0F', color: '#1a1520', border: '#f59e0b', sky: '#1a1a35',

              temp: '15 million K (core) / 5,778 K (surface)', scale: 'Solar System: ~9 billion km across',

              keyEvent: 'A molecular cloud collapses \u2014 our Solar System forms',

              desc: 'A molecular cloud in the Orion Arm collapses \u2014 possibly triggered by a nearby supernova shockwave. Our Sun ignites as a main-sequence G2V star. The remaining disk of gas and dust coalesces into 8 planets, dwarf planets, asteroids, and comets. Within 100 million years, Earth forms and is struck by a Mars-sized body (Theia), creating the Moon. Within a billion years, the first microbial life appears in Earth\'s oceans.',

              facts: ['Our Sun is a 3rd-generation star: it contains elements forged in at least two previous stellar generations', 'The Solar System formed 4.6 billion years ago from a collapsing molecular cloud', 'The Moon formed from the debris of a giant impact with proto-Earth (the Theia hypothesis)', 'Jupiter\'s gravity sculpted the asteroid belt and protected inner planets from bombardment', 'Earth\'s magnetic field, generated by its molten iron core, shields life from solar radiation', 'The oldest confirmed microfossils on Earth are ~3.5 billion years old']

            },

            {

              t: 13.0, name: t('stem.universe.present_day'), emoji: '\uD83C\uDF0D', color: '#0a1518', border: '#10b981', sky: '#0a0a28',

              temp: '2.725 K (CMB background) / 5,778 K (Sun)', scale: 'Observable universe: 93 billion light-years',

              keyEvent: 'Humanity reaches space \u2014 the universe accelerates',

              desc: 'The universe is 13.8 billion years old. Humans have walked on the Moon, landed rovers on Mars, sent Voyager beyond the Solar System, detected gravitational waves from colliding black holes, and photographed a black hole\'s shadow. The James Webb Space Telescope peers back to the first galaxies. Meanwhile, dark energy is accelerating the expansion of the universe \u2014 galaxies beyond our Local Group are receding ever faster.',

              facts: ['The observable universe contains roughly 2 trillion galaxies', 'Dark energy (68%), dark matter (27%), and ordinary matter (5%) make up the cosmic budget', 'JWST observes galaxies from 13.4+ billion years ago in infrared light', 'Gravitational waves were first detected in 2015 by LIGO (Nobel Prize 2017)', 'We have discovered 5,500+ confirmed exoplanets, including potentially habitable ones', 'Voyager 1, launched in 1977, is over 24 billion km from Earth \u2014 in interstellar space']

            },

            {

              t: 13.8, name: t('stem.universe.the_far_future'), emoji: '\uD83D\uDD2E', color: '#060610', border: '#6366f1', sky: '#050510',

              temp: 'Approaching absolute zero', scale: 'Expanding toward infinity',

              keyEvent: 'Heat death \u2014 maximum entropy, eternal darkness',

              desc: 'Stars exhaust their nuclear fuel one by one. Red dwarfs \u2014 the longest-lived stars \u2014 will be the last to shine, burning for up to 10 trillion years. After that: white dwarfs cool to black dwarfs, neutron stars fade, and even black holes slowly evaporate through Hawking radiation over 10\u00B9\u2070\u2070 years. The universe reaches maximum entropy \u2014 no temperature gradients, no usable energy, no structure. An eternal, featureless void.',

              facts: ['In ~5 billion years, the Sun will exhaust its hydrogen and swell into a red giant', 'The last stars (red dwarfs) will burn out in ~100 trillion years', 'Proton decay (if it occurs) would dissolve all remaining matter over 10\u00B3\u2077 years', 'Black holes will evaporate via Hawking radiation \u2014 the last ones in 10\u00B9\u2070\u2070 years', 'Heat death means no thermodynamic free energy \u2014 nothing can happen, ever again', 'Some theories propose quantum tunneling could spontaneously create a new Big Bang after unimaginable timescales']

            }

          ];



          function getCurrentEpoch(t) {

            for (var i = EPOCHS.length - 1; i >= 0; i--) { if (t >= EPOCHS[i].t) return EPOCHS[i]; }

            return EPOCHS[0];

          }

          var epoch = getCurrentEpoch(cosmicTime);



          // â”€â”€ Canvas visualization â”€â”€

          var canvasRefCb = function (canvasEl) {

            if (!canvasEl || canvasEl._universeInit) return;

            canvasEl._universeInit = true;

            var dpr = window.devicePixelRatio || 1;

            var ow = canvasEl.offsetWidth, oh = canvasEl.offsetHeight;

            // Guard: if canvas has no layout yet, defer init

            if (!ow || !oh) {

              canvasEl._universeInit = false;

              requestAnimationFrame(function () { canvasRefCb(canvasEl); });

              return;

            }

            var W = canvasEl.width = ow * dpr;

            var H = canvasEl.height = oh * dpr;

            var ctx = canvasEl.getContext('2d');

            // roundRect polyfill for older browsers

            if (!ctx.roundRect) {

              ctx.roundRect = function (x, y, w, h, r) {

                if (typeof r === 'number') r = [r, r, r, r];

                ctx.moveTo(x + r[0], y);

                ctx.lineTo(x + w - r[1], y);

                ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);

                ctx.lineTo(x + w, y + h - r[2]);

                ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);

                ctx.lineTo(x + r[3], y + h);

                ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);

                ctx.lineTo(x, y + r[0]);

                ctx.arcTo(x, y, x + r[0], y, r[0]);

                ctx.closePath();

              };

            }

            var tick = 0;

            var particles = [];

            for (var i = 0; i < 400; i++) {

              particles.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, c: Math.random(), age: Math.random() * 100 });

            }

            // Expanding plasma particles for Big Bang

            var plasmaParticles = [];

            for (var pp = 0; pp < 120; pp++) {

              var angle = Math.random() * Math.PI * 2;

              var spd = 0.5 + Math.random() * 3;

              plasmaParticles.push({ angle: angle, speed: spd, dist: 0, size: 1 + Math.random() * 3, hue: Math.random() * 60, life: 0.5 + Math.random() * 0.5 });

            }

            // Nebula clouds

            var nebulae = [];

            for (var ni = 0; ni < 8; ni++) {

              nebulae.push({ x: Math.random(), y: Math.random(), size: 0.05 + Math.random() * 0.08, hue: ni % 4 === 0 ? '200,100,255' : ni % 4 === 1 ? '100,180,255' : ni % 4 === 2 ? '255,150,100' : '150,255,200', phase: Math.random() * Math.PI * 2 });

            }

            function draw() {

              try {

                tick++;

                var t = parseFloat(canvasEl.dataset.time || '0');

                var ep = getCurrentEpoch(t);

                ctx.clearRect(0, 0, W, H);

                var cx = W / 2, cy = H / 2;



                // â”€â”€ Sky gradient (era-specific) â”€â”€

                var skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);

                if (t < 0.05) {

                  // Singularity: blinding white core

                  var intensity = Math.max(0, 1 - t / 0.05);

                  skyGrad.addColorStop(0, 'rgba(255,255,255,' + intensity + ')');

                  skyGrad.addColorStop(0.15, 'rgba(255,240,180,' + (intensity * 0.9) + ')');

                  skyGrad.addColorStop(0.4, 'rgba(255,160,50,' + (intensity * 0.6) + ')');

                  skyGrad.addColorStop(0.7, 'rgba(200,50,0,' + (intensity * 0.3) + ')');

                  skyGrad.addColorStop(1, 'rgba(10,5,20,1)');

                } else if (t < 0.2) {

                  // Post-bang: fiery orange fading

                  var cool = (t - 0.05) / 0.15;

                  skyGrad.addColorStop(0, 'rgba(255,' + Math.round(200 - cool * 150) + ',' + Math.round(100 - cool * 80) + ',' + (0.8 - cool * 0.6) + ')');

                  skyGrad.addColorStop(0.3, 'rgba(180,' + Math.round(80 - cool * 60) + ',20,' + (0.4 - cool * 0.3) + ')');

                  skyGrad.addColorStop(1, 'rgba(10,8,25,1)');

                } else if (t < 0.4) {

                  // Dark Ages: deep indigo-black

                  skyGrad.addColorStop(0, '#0c0a18'); skyGrad.addColorStop(0.5, '#060414'); skyGrad.addColorStop(1, '#020210');

                } else if (t < 1.0) {

                  // First stars: hints of blue

                  var starGlow = (t - 0.4) / 0.6;

                  skyGrad.addColorStop(0, 'rgba(15,15,' + Math.round(40 + starGlow * 15) + ',1)');

                  skyGrad.addColorStop(1, 'rgba(5,5,' + Math.round(15 + starGlow * 5) + ',1)');

                } else {

                  // Galaxy era onward: deep cosmic blue-black

                  skyGrad.addColorStop(0, '#0d0d28'); skyGrad.addColorStop(0.6, '#080818'); skyGrad.addColorStop(1, '#040410');

                }

                ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);



                // â”€â”€ Big Bang: expanding shockwave rings â”€â”€

                if (t < 0.3) {

                  var bangPhase = t / 0.3;

                  // Multiple expanding rings

                  for (var ri = 0; ri < 5; ri++) {

                    var ringT = bangPhase - ri * 0.15;

                    if (ringT > 0 && ringT < 1) {

                      var ringR = ringT * W * 0.55;

                      var ringAlpha = (1 - ringT) * 0.6;

                      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);

                      ctx.strokeStyle = 'rgba(255,' + Math.round(200 - ri * 30) + ',' + Math.round(100 - ri * 20) + ',' + ringAlpha + ')';

                      ctx.lineWidth = (3 - ri * 0.4) * dpr;

                      ctx.stroke();

                    }

                  }

                  // Central plasma fireball

                  var fireR = Math.min(bangPhase * 0.4, 0.35) * W;

                  var fireGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fireR);

                  var coreAlpha = Math.max(0, 1 - bangPhase * 1.5);

                  fireGrad.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, coreAlpha + 0.3) + ')');

                  fireGrad.addColorStop(0.2, 'rgba(255,255,200,' + coreAlpha + ')');

                  fireGrad.addColorStop(0.4, 'rgba(255,200,80,' + (coreAlpha * 0.7) + ')');

                  fireGrad.addColorStop(0.7, 'rgba(255,100,20,' + (coreAlpha * 0.4) + ')');

                  fireGrad.addColorStop(1, 'rgba(200,30,0,0)');

                  ctx.beginPath(); ctx.arc(cx, cy, fireR, 0, Math.PI * 2);

                  ctx.fillStyle = fireGrad; ctx.fill();



                  // Expanding plasma particles flying outward

                  for (var ppi = 0; ppi < plasmaParticles.length; ppi++) {

                    var pp2 = plasmaParticles[ppi];

                    var ppDist = bangPhase * pp2.speed * W * 0.3;

                    if (ppDist > W * 0.7) continue;

                    var ppAlpha = Math.max(0, (1 - bangPhase) * pp2.life);

                    var ppx = cx + Math.cos(pp2.angle) * ppDist;

                    var ppy = cy + Math.sin(pp2.angle) * ppDist;

                    var ppSize = pp2.size * dpr * (1 - bangPhase * 0.5);

                    ctx.beginPath(); ctx.arc(ppx, ppy, ppSize, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,' + Math.round(200 + pp2.hue) + ',' + Math.round(100 + pp2.hue * 0.5) + ',' + ppAlpha + ')';

                    ctx.fill();

                  }

                }



                // â”€â”€ CMB glow (recombination era: 0.2-1.0) â”€â”€

                if (t > 0.15 && t < 1.0) {

                  var cmbPhase = (t - 0.15) / 0.85;

                  var cmbAlpha = Math.max(0, 0.35 * (1 - cmbPhase));

                  // Mottled CMB pattern (simulated)

                  for (var cmi = 0; cmi < 20; cmi++) {

                    var cmx = ((cmi * 173 + 37) % (W / dpr)) * dpr;

                    var cmy = ((cmi * 131 + 19) % (H / dpr)) * dpr;

                    var cms = (15 + cmi * 7 % 20) * dpr;

                    var cmGrad = ctx.createRadialGradient(cmx, cmy, 0, cmx, cmy, cms);

                    var warmth = cmi % 2 === 0 ? '255,200,120' : '255,160,80';

                    cmGrad.addColorStop(0, 'rgba(' + warmth + ',' + (cmbAlpha * 0.5) + ')');

                    cmGrad.addColorStop(1, 'rgba(' + warmth + ',0)');

                    ctx.beginPath(); ctx.arc(cmx, cmy, cms, 0, Math.PI * 2);

                    ctx.fillStyle = cmGrad; ctx.fill();

                  }

                }



                // â”€â”€ Stars (appear after Dark Ages) â”€â”€

                var starBrightness = t < 0.4 ? 0 : Math.min(1, (t - 0.4) / 0.8);

                var starCount = Math.min(particles.length, Math.floor(starBrightness * particles.length));

                for (var pi = 0; pi < starCount; pi++) {

                  var p = particles[pi];

                  p.x += p.vx; p.y += p.vy;

                  if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;

                  if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

                  var twinkle = 0.5 + 0.5 * Math.sin(tick * 0.03 + pi * 1.7);

                  // Star color varies by era

                  var hue;

                  if (t < 1) hue = '180,200,255'; // early: blue-white Population III

                  else if (p.c < 0.3) hue = '255,200,150'; // warm yellow

                  else if (p.c < 0.6) hue = '200,210,255'; // cool blue

                  else if (p.c < 0.85) hue = '255,240,220'; // white

                  else hue = '255,160,120'; // red giant

                  ctx.beginPath(); ctx.arc(p.x, p.y, p.s * dpr * twinkle, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(' + hue + ',' + (starBrightness * twinkle * 0.85) + ')';

                  ctx.fill();

                  // Glow around bright stars

                  if (p.s > 1.8 && twinkle > 0.7) {

                    var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * dpr * 3);

                    glow.addColorStop(0, 'rgba(' + hue + ',' + (twinkle * 0.15) + ')');

                    glow.addColorStop(1, 'rgba(' + hue + ',0)');

                    ctx.beginPath(); ctx.arc(p.x, p.y, p.s * dpr * 3, 0, Math.PI * 2);

                    ctx.fillStyle = glow; ctx.fill();

                  }

                }



                // â”€â”€ Nebulae (after t > 2 Gyr, star-forming regions) â”€â”€

                if (t > 2) {

                  var nebAlpha = Math.min(0.3, (t - 2) * 0.03);

                  for (var nbi = 0; nbi < nebulae.length; nbi++) {

                    var nb = nebulae[nbi];

                    var nbx = nb.x * W, nby = nb.y * H;

                    var nbSize = nb.size * W * (1 + 0.1 * Math.sin(tick * 0.01 + nb.phase));

                    var nbGrad = ctx.createRadialGradient(nbx, nby, 0, nbx, nby, nbSize);

                    nbGrad.addColorStop(0, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.6) + ')');

                    nbGrad.addColorStop(0.4, 'rgba(' + nb.hue + ',' + (nebAlpha * 0.3) + ')');

                    nbGrad.addColorStop(1, 'rgba(' + nb.hue + ',0)');

                    ctx.beginPath(); ctx.arc(nbx, nby, nbSize, 0, Math.PI * 2);

                    ctx.fillStyle = nbGrad; ctx.fill();

                  }

                }



                // â”€â”€ Galaxies (after t > 1 Gyr) with spiral hints â”€â”€

                if (t > 1) {

                  var galaxyCount = Math.min(16, Math.floor((t - 1) * 2.5));

                  for (var gi = 0; gi < galaxyCount; gi++) {

                    var gx = ((gi * 137 + 50) % (W / dpr)) * dpr;

                    var gy = ((gi * 97 + 30) % (H / dpr)) * dpr;

                    var gs = (10 + gi % 6 * 5) * dpr;

                    // Core glow

                    var galGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gs);

                    var galHue = gi % 4 === 0 ? '180,160,255' : gi % 4 === 1 ? '255,200,150' : gi % 4 === 2 ? '150,200,255' : '255,220,180';

                    galGrad.addColorStop(0, 'rgba(' + galHue + ',0.5)');

                    galGrad.addColorStop(0.3, 'rgba(' + galHue + ',0.2)');

                    galGrad.addColorStop(0.7, 'rgba(' + galHue + ',0.05)');

                    galGrad.addColorStop(1, 'rgba(' + galHue + ',0)');

                    ctx.beginPath(); ctx.arc(gx, gy, gs, 0, Math.PI * 2);

                    ctx.fillStyle = galGrad; ctx.fill();

                    // Spiral arm hints for larger galaxies

                    if (gs > 12 * dpr && t > 3) {

                      ctx.save();

                      ctx.translate(gx, gy);

                      ctx.rotate(gi * 1.3 + tick * 0.001);

                      ctx.globalAlpha = 0.15;

                      ctx.beginPath();

                      for (var sa = 0; sa < Math.PI * 4; sa += 0.1) {

                        var sr = sa * gs * 0.08;

                        ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);

                      }

                      ctx.strokeStyle = 'rgba(' + galHue + ',0.3)';

                      ctx.lineWidth = 1.5 * dpr;

                      ctx.stroke();

                      ctx.globalAlpha = 1;

                      ctx.restore();

                    }

                  }

                }



                // â”€â”€ Cosmic Web Filaments (dark matter structure connecting galaxies, t > 2) â”€â”€

                if (t > 2) {

                  var filAlpha = Math.min(0.12, (t - 2) * 0.01);

                  var filGalCount = Math.min(16, Math.floor((t - 1) * 2.5));

                  ctx.save();

                  ctx.globalAlpha = filAlpha;

                  ctx.lineWidth = 1.2 * dpr;

                  for (var fi = 0; fi < filGalCount; fi++) {

                    var fx1 = ((fi * 137 + 50) % (W / dpr)) * dpr;

                    var fy1 = ((fi * 97 + 30) % (H / dpr)) * dpr;

                    // Connect to 2 nearest neighbors

                    for (var fj = fi + 1; fj < Math.min(fi + 3, filGalCount); fj++) {

                      var fx2 = ((fj * 137 + 50) % (W / dpr)) * dpr;

                      var fy2 = ((fj * 97 + 30) % (H / dpr)) * dpr;

                      var fDist = Math.sqrt((fx2 - fx1) * (fx2 - fx1) + (fy2 - fy1) * (fy2 - fy1));

                      if (fDist > W * 0.6) continue;

                      // Curved filament with glow

                      var fmx = (fx1 + fx2) / 2 + Math.sin(fi * 2.3 + tick * 0.002) * 20;

                      var fmy = (fy1 + fy2) / 2 + Math.cos(fj * 1.7 + tick * 0.002) * 20;

                      var filGrad = ctx.createLinearGradient(fx1, fy1, fx2, fy2);

                      filGrad.addColorStop(0, 'rgba(100,120,200,0)');

                      filGrad.addColorStop(0.3, 'rgba(120,140,220,' + (filAlpha * 2) + ')');

                      filGrad.addColorStop(0.7, 'rgba(120,140,220,' + (filAlpha * 2) + ')');

                      filGrad.addColorStop(1, 'rgba(100,120,200,0)');

                      ctx.beginPath();

                      ctx.moveTo(fx1, fy1);

                      ctx.quadraticCurveTo(fmx, fmy, fx2, fy2);

                      ctx.strokeStyle = filGrad;

                      ctx.stroke();

                    }

                  }

                  ctx.restore();

                }



                // â”€â”€ Dark Matter Halos (subtle glow behind galaxies) â”€â”€

                if (t > 1.5) {

                  var dmGalCount = Math.min(16, Math.floor((t - 1) * 2.5));

                  ctx.save();

                  for (var dmi = 0; dmi < dmGalCount; dmi++) {

                    var dmx = ((dmi * 137 + 50) % (W / dpr)) * dpr;

                    var dmy = ((dmi * 97 + 30) % (H / dpr)) * dpr;

                    var dms = (10 + dmi % 6 * 5) * dpr;

                    var dmHaloR = dms * 2.2;

                    var dmAlpha = Math.min(0.06, (t - 1.5) * 0.01);

                    var dmGrad = ctx.createRadialGradient(dmx, dmy, dms * 0.3, dmx, dmy, dmHaloR);

                    dmGrad.addColorStop(0, 'rgba(80,60,180,' + dmAlpha + ')');

                    dmGrad.addColorStop(0.5, 'rgba(60,40,160,' + (dmAlpha * 0.5) + ')');

                    dmGrad.addColorStop(1, 'rgba(40,20,140,0)');

                    ctx.beginPath(); ctx.arc(dmx, dmy, dmHaloR, 0, Math.PI * 2);

                    ctx.fillStyle = dmGrad; ctx.fill();

                  }

                  ctx.restore();

                }



                // â”€â”€ Shooting Stars / Meteor Streaks (after t > 9, Solar System era) â”€â”€

                if (t > 9) {

                  ctx.save();

                  var meteorSeed = Math.floor(tick / 80);

                  var meteorPhase = (tick % 80) / 80;

                  for (var mti = 0; mti < 2; mti++) {

                    var mtHash = (meteorSeed * 73 + mti * 41) % 1000;

                    if (mtHash > 300) continue; // Only ~30% chance per slot

                    var mtx1 = (mtHash * 7 % (W / dpr)) * dpr;

                    var mty1 = (mtHash * 3 % Math.floor(H * 0.5 / dpr)) * dpr;

                    var mtAngle = 0.3 + (mtHash % 5) * 0.15;

                    var mtLen = (40 + mtHash % 60) * dpr;

                    var mtx2 = mtx1 + Math.cos(mtAngle) * mtLen * meteorPhase;

                    var mty2 = mty1 + Math.sin(mtAngle) * mtLen * meteorPhase;

                    var mtAlpha = meteorPhase < 0.3 ? meteorPhase / 0.3 : (1 - meteorPhase) / 0.7;

                    mtAlpha *= 0.7;

                    ctx.globalAlpha = mtAlpha;

                    var mtGrad = ctx.createLinearGradient(mtx1, mty1, mtx2, mty2);

                    mtGrad.addColorStop(0, 'rgba(255,255,255,0)');

                    mtGrad.addColorStop(0.6, 'rgba(255,240,200,' + mtAlpha + ')');

                    mtGrad.addColorStop(1, 'rgba(255,255,255,' + mtAlpha + ')');

                    ctx.beginPath(); ctx.moveTo(mtx1, mty1); ctx.lineTo(mtx2, mty2);

                    ctx.strokeStyle = mtGrad; ctx.lineWidth = 1.5 * dpr; ctx.stroke();

                    // Bright head

                    ctx.beginPath(); ctx.arc(mtx2, mty2, 2 * dpr, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,255,240,' + (mtAlpha * 0.8) + ')'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                  ctx.restore();

                }



                // â”€â”€ Protoplanetary Disk (near Sun formation, t â‰ˆ 9.0â€“9.5) â”€â”€

                if (t > 8.5 && t < 10) {

                  var ppAlpha = t < 9.0 ? (t - 8.5) / 0.5 : t > 9.5 ? Math.max(0, 1 - (t - 9.5) / 0.5) : 1;

                  ppAlpha *= 0.6;

                  var ppx = W * 0.78, ppy = H * 0.25;

                  ctx.save();

                  ctx.translate(ppx, ppy);

                  ctx.rotate(tick * 0.003);

                  ctx.globalAlpha = ppAlpha;

                  // Concentric dust rings

                  var ppRings = [

                    { r: 18, w: 4, color: '255,200,100' },

                    { r: 26, w: 3, color: '220,170,80' },

                    { r: 34, w: 5, color: '180,140,70' },

                    { r: 44, w: 3, color: '140,120,80' }

                  ];

                  for (var pri = 0; pri < ppRings.length; pri++) {

                    var ppr = ppRings[pri];

                    var rr = ppr.r * dpr;

                    ctx.beginPath();

                    ctx.ellipse(0, 0, rr, rr * 0.3, 0, 0, Math.PI * 2);

                    ctx.strokeStyle = 'rgba(' + ppr.color + ',' + (ppAlpha * 0.5) + ')';

                    ctx.lineWidth = ppr.w * dpr;

                    ctx.stroke();

                  }

                  // Central protostar glow

                  var psGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12 * dpr);

                  psGrad.addColorStop(0, 'rgba(255,230,150,' + ppAlpha + ')');

                  psGrad.addColorStop(0.4, 'rgba(255,180,60,' + (ppAlpha * 0.6) + ')');

                  psGrad.addColorStop(1, 'rgba(255,120,20,0)');

                  ctx.beginPath(); ctx.arc(0, 0, 12 * dpr, 0, Math.PI * 2);

                  ctx.fillStyle = psGrad; ctx.fill();

                  // Planetesimal dots orbiting

                  for (var pli = 0; pli < 5; pli++) {

                    var plAngle = pli * Math.PI * 2 / 5 + tick * 0.008 * (1 + pli * 0.3);

                    var plR = (22 + pli * 6) * dpr;

                    var plpx = Math.cos(plAngle) * plR;

                    var plpy = Math.sin(plAngle) * plR * 0.3;

                    ctx.beginPath(); ctx.arc(plpx, plpy, (1.5 + pli * 0.3) * dpr, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(200,180,140,' + (ppAlpha * 0.8) + ')'; ctx.fill();

                  }

                  ctx.restore();

                  // Label

                  ctx.save();

                  ctx.globalAlpha = ppAlpha * 0.8;

                  ctx.font = (7 * dpr) + 'px sans-serif';

                  ctx.fillStyle = 'rgba(255,200,100,' + ppAlpha + ')';

                  ctx.textAlign = 'center';

                  ctx.fillText('Protoplanetary Disk', ppx, ppy + 55 * dpr);

                  ctx.restore();

                }



                // â”€â”€ Epoch label overlay (bottom-left HUD) â”€â”€

                // Dark backdrop for readability

                ctx.fillStyle = 'rgba(0,0,0,0.5)';

                var labelW = 220 * dpr, labelH = 48 * dpr;

                ctx.beginPath();

                ctx.roundRect(6 * dpr, H - (54 * dpr), labelW, labelH, 8 * dpr);

                ctx.fill();

                // Epoch name

                ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold ' + (12 * dpr) + 'px sans-serif';

                ctx.fillText(ep.emoji + ' ' + ep.name, 14 * dpr, H - (20 * dpr));

                // Time

                ctx.fillStyle = 'rgba(160,200,255,0.8)'; ctx.font = (9 * dpr) + 'px sans-serif';

                var timeStr = t < 0.001 ? 'T = 0 (Singularity)' : t < 1 ? (t * 1000).toFixed(0) + ' million years' : t.toFixed(1) + ' billion years';

                ctx.fillText(timeStr, 14 * dpr, H - (34 * dpr));



                canvasEl._animId = requestAnimationFrame(draw);

              } catch (e) { console.error('Universe draw error:', e); canvasEl._animId = requestAnimationFrame(draw); }

            }

            canvasEl._animId = requestAnimationFrame(draw);

            canvasEl._universeCleanup = function () { cancelAnimationFrame(canvasEl._animId); canvasEl._universeInit = false; };

            var ro = new ResizeObserver(function () {

              var newW = canvasEl.offsetWidth, newH = canvasEl.offsetHeight;

              if (newW && newH) { W = canvasEl.width = newW * dpr; H = canvasEl.height = newH * dpr; }

            });

            ro.observe(canvasEl); canvasEl._ro = ro;

          };



          return React.createElement("div", { className: "max-w-6xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { var cv = document.querySelector('[data-universe-canvas]'); if (cv && cv._universeCleanup) cv._universeCleanup(); if (cv && cv._ro) cv._ro.disconnect(); setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-200" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDF20 Universe Time-Lapse"),

              React.createElement("span", { className: "text-xs text-slate-600" }, "13.8 billion years of cosmic history")

            ),

            // Canvas

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-violet-300 shadow-lg", style: { height: '55vh', minHeight: '360px', maxHeight: '700px', background: '#050510' } },

              React.createElement("canvas", { "data-universe-canvas": "true", ref: canvasRefCb, "data-time": String(cosmicTime), style: { width: '100%', height: '100%', display: 'block' } })

            ),

            // Timeline slider

            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-amber-50 via-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-4" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u23F3 Cosmic Timeline"),

                React.createElement("span", { className: "ml-auto text-[11px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full" }, cosmicTime < 1 ? (cosmicTime * 1000).toFixed(0) + ' Myr' : cosmicTime.toFixed(1) + ' Gyr')

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-[11px] text-violet-400" }, "Big Bang"),

                React.createElement("input", {

                  type: "range", min: 0, max: 13.8, step: 0.01, value: cosmicTime,

                  'aria-label': 'Cosmic time in billion years',

                  onChange: function (e) { var val = parseFloat(e.target.value); upd("cosmicTime", val); var cv = document.querySelector('[data-universe-canvas]'); if (cv) cv.dataset.time = String(val); },

                  className: "flex-1 h-1.5 accent-violet-500"

                }),

                React.createElement("span", { className: "text-[11px] text-violet-400" }, "Now")

              ),

              // Playback controls

              React.createElement("div", { className: "flex gap-2 mt-2" },

                React.createElement("button", { "aria-label": "Toggle cosmic timeline playback",

                  onClick: function () {

                    if (window._universeTimeLapse) { clearInterval(window._universeTimeLapse); window._universeTimeLapse = null; upd("isPlaying", false); return; }

                    upd("isPlaying", true);

                    var t = cosmicTime;

                    window._universeTimeLapse = setInterval(function () {

                      t += 0.02 * speed;

                      if (t > 13.8) { t = 0; }

                      upd("cosmicTime", parseFloat(t.toFixed(2)));

                      var cv = document.querySelector('[data-universe-canvas]');

                      if (cv) cv.dataset.time = String(t);

                    }, 50);

                  }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (isPlaying ? "bg-red-700 text-white" : "bg-violet-600 text-white hover:bg-violet-700") + " transition-all"

                }, isPlaying ? "\u23F9 Stop" : "\u25B6 Play"),

                React.createElement("div", { className: "flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-violet-200" },

                  React.createElement("span", { className: "text-[11px] text-violet-500 font-bold" }, "Speed"),

                  React.createElement("input", { type: "range", min: 0.5, max: 5, step: 0.5, value: speed, 'aria-label': 'Simulation speed', onChange: function (e) { upd("speed", parseFloat(e.target.value)); }, className: "w-16 h-1 accent-violet-400" }),

                  React.createElement("span", { className: "text-[11px] text-violet-600 font-bold w-6" }, speed + "x")

                )

              ),

              // Epoch quick-jump buttons

              React.createElement("div", { className: "flex flex-wrap gap-1 mt-2" },

                EPOCHS.map(function (ep) {

                  var isCurrent = cosmicTime >= ep.t && (EPOCHS.indexOf(ep) === EPOCHS.length - 1 || cosmicTime < EPOCHS[EPOCHS.indexOf(ep) + 1].t);

                  return React.createElement("button", { "aria-label": "Jump to " + ep.name + " epoch",

                    key: ep.name,

                    onClick: function () { upd("cosmicTime", ep.t); var cv = document.querySelector('[data-universe-canvas]'); if (cv) cv.dataset.time = String(ep.t); awardStemXP('universe_explore', 5, 'Visited epoch: ' + ep.name); },

                    className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105 " + (isCurrent ? "text-white shadow-sm" : "bg-white text-slate-600 border border-slate-400 hover:border-violet-600"),

                    style: isCurrent ? { backgroundColor: ep.border } : {}

                  }, ep.emoji + " " + ep.name);

                })

              )

            ),

            // â”€â”€ Current epoch info card (enhanced with dark theme + extra fields) â”€â”€

            React.createElement("div", { className: "mt-3 rounded-xl border-2 p-5 animate-in fade-in duration-300 shadow-lg", style: { backgroundColor: epoch.color, borderColor: epoch.border } },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-3xl", style: { filter: 'drop-shadow(0 0 8px ' + epoch.border + ')' } }, epoch.emoji),

                React.createElement("div", { className: "flex-1" },

                  React.createElement("h4", { className: "text-base font-black tracking-wide", style: { color: epoch.border } }, epoch.name),

                  React.createElement("p", { className: "text-[11px] font-medium", style: { color: 'rgba(200,210,230,0.8)' } }, cosmicTime < 1 ? (cosmicTime * 1000).toFixed(0) + ' million years after the Big Bang' : cosmicTime.toFixed(1) + ' billion years after the Big Bang')

                )

              ),

              // Key metrics strip

              epoch.temp && React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },

                React.createElement("div", { className: "rounded-lg p-2 text-center", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\uD83C\uDF21\uFE0F Temperature"),

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: '#fbbf24' } }, epoch.temp)

                ),

                React.createElement("div", { className: "rounded-lg p-2 text-center", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\uD83D\uDCCF Scale"),

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: '#a78bfa' } }, epoch.scale)

                ),

                React.createElement("div", { className: "rounded-lg p-2 text-center col-span-1", style: { backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' } },

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: 'rgba(200,200,230,0.6)' } }, "\u26A1 Key Event"),

                  React.createElement("p", { className: "text-[11px] font-bold", style: { color: '#34d399' } }, epoch.keyEvent)

                )

              ),

              // Description with high-contrast white text

              React.createElement("p", { className: "text-[13px] leading-relaxed mb-3", style: { color: 'rgba(230,235,245,0.92)' } }, epoch.desc),

              // Facts grid

              React.createElement("div", { className: "space-y-1.5", style: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' } },

                React.createElement("p", { className: "text-[11px] font-bold mb-1", style: { color: epoch.border } }, "\uD83D\uDCA1 Key Facts"),

                epoch.facts.map(function (fact, i) {

                  return React.createElement("div", { key: i, className: "flex items-start gap-2 text-[11px]", style: { color: 'rgba(210,215,230,0.85)' } },

                    React.createElement("span", { className: "mt-0.5 flex-shrink-0", style: { color: epoch.border } }, "\u2022"),

                    React.createElement("span", null, fact)

                  );

                })

              )

            ),

            // === RESEARCH POINTS BAR ===
            React.createElement("div", { className: "mt-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200" },
              React.createElement("div", { className: "flex items-center justify-between mb-1" },
                React.createElement("span", { className: "text-xs font-bold text-violet-700" }, "\u2B50 Research Points: " + researchPoints + " RP"),
                React.createElement("span", { className: "text-[11px] text-violet-400" }, completedChallenges.length + "/" + CHALLENGES.length + " challenges")
              ),
              React.createElement("div", { className: "w-full bg-violet-100 rounded-full h-2" },
                React.createElement("div", { className: "bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all", style: { width: Math.min(100, (completedChallenges.length / CHALLENGES.length) * 100) + '%' } })
              ),
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-2" },
                CHALLENGES.map(function(ch) {
                  var done = completedChallenges.indexOf(ch.id) !== -1;
                  return React.createElement("div", { key: ch.id, title: ch.name + ': ' + ch.desc + ' (' + ch.rp + ' RP)', className: "text-center cursor-default " + (done ? '' : 'opacity-30 grayscale'), style: { fontSize: '16px' } }, ch.icon);
                })
              )
            ),

            // === STAR LIFECYCLE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-amber-300' : 'text-amber-700') }, "\u2B50 Star Lifecycle \u2014 Birth to Death"),
                React.createElement("button", { "aria-label": "Toggle star lifecycle section",
                  onClick: function() { upd('showStarLife', !d.showStarLife); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-amber-500 hover:text-amber-700"
                }, d.showStarLife ? 'Hide' : 'Explore \u2192')
              ),
              d.showStarLife && React.createElement("div", { className: "space-y-2" },
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-1" }, "Every star follows a lifecycle determined by its mass. Low-mass stars end gently; massive stars end violently."),
                // Two tracks diagram
                React.createElement("div", { className: "flex gap-4 mb-2" },
                  React.createElement("div", { className: "flex-1 text-center" },
                    React.createElement("div", { className: "text-[11px] font-bold text-amber-600 mb-1" }, "Low Mass (< 8 M\u2609)"),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Cloud \u2192 Protostar \u2192 Main Seq \u2192 Red Giant \u2192 Nebula \u2192 White Dwarf")
                  ),
                  React.createElement("div", { className: "flex-1 text-center" },
                    React.createElement("div", { className: "text-[11px] font-bold text-red-600 mb-1" }, "High Mass (> 8 M\u2609)"),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Cloud \u2192 Protostar \u2192 Main Seq \u2192 Red Giant \u2192 Supernova \u2192 Neutron Star / Black Hole")
                  )
                ),
                STAR_STAGES.map(function(stage, si) {
                  var isActive = d.starStage === si;
                  return React.createElement("div", { 
                    key: si,
                    onClick: function() { upd('starStage', isActive ? null : si); playBeep(); },
                    className: "cursor-pointer rounded-lg p-2.5 border transition-all " + (isActive
                      ? (isDark ? 'bg-slate-700 border-amber-500' : 'bg-white border-amber-400 shadow-md')
                      : (isDark ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' : 'bg-white/50 border-amber-100 hover:border-amber-300'))
                  },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-lg", style: { color: stage.color } }, stage.icon),
                      React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, stage.name),
                      React.createElement("span", { className: "ml-auto text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, stage.duration)
                    ),
                    isActive && React.createElement("div", { className: "mt-2 space-y-1" },
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, stage.desc),
                      React.createElement("div", { className: "flex gap-3 text-[11px] mt-1" },
                        React.createElement("span", { className: "text-red-500 font-bold" }, "\uD83C\uDF21 " + stage.temp),
                        React.createElement("span", { className: "text-blue-500 font-bold" }, "\uD83D\uDCCF " + stage.size)
                      ),
                      React.createElement("button", { "aria-label": "Listen to " + stage.name + " stage description",
                        onClick: function(e) { e.stopPropagation(); speakText(stage.name + '. ' + stage.desc); },
                        className: "text-[11px] text-amber-400 hover:text-amber-600 mt-1"
                      }, "\uD83D\uDD0A Listen")
                    )
                  );
                })
              )
            ),

            // === HR DIAGRAM ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-blue-300' : 'text-blue-700') }, "\uD83D\uDCCA Hertzsprung-Russell Diagram"),
                React.createElement("button", { "aria-label": "Toggle Hertzsprung-Russell diagram",
                  onClick: function() { upd('showHR', !d.showHR); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-blue-500 hover:text-blue-700"
                }, d.showHR ? 'Hide' : 'View \u2192')
              ),
              d.showHR && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "The HR Diagram plots stars by temperature (x) and luminosity (y). Most stars fall on the Main Sequence diagonal."),
                React.createElement("canvas", {
                  style: { width: '100%', height: '320px', display: 'block', borderRadius: '8px' },
                  ref: function(hrEl) {
                    if (!hrEl || hrEl._hrInit) return;
                    hrEl._hrInit = true;
                    var hctx = hrEl.getContext('2d');
                    var HW = hrEl.offsetWidth || 300, HH = 320;
                    hrEl.width = HW * 2; hrEl.height = HH * 2; hctx.scale(2, 2);
                    // Background
                    hctx.fillStyle = '#0a0a20';
                    hctx.fillRect(0, 0, HW, HH);
                    // Axes
                    hctx.strokeStyle = '#334155';
                    hctx.lineWidth = 1;
                    hctx.beginPath();
                    hctx.moveTo(40, 10); hctx.lineTo(40, HH - 25); hctx.lineTo(HW - 10, HH - 25);
                    hctx.stroke();
                    // Labels
                    hctx.fillStyle = '#94a3b8';
                    hctx.font = '8px system-ui';
                    hctx.textAlign = 'center';
                    hctx.fillText('Hot (O,B)', 80, HH - 8);
                    hctx.fillText('Cool (K,M)', HW - 40, HH - 8);
                    hctx.fillText('Temperature \u2192 (reversed)', HW / 2, HH - 8);
                    hctx.save();
                    hctx.translate(10, HH / 2);
                    hctx.rotate(-Math.PI / 2);
                    hctx.fillText('Luminosity \u2192', 0, 0);
                    hctx.restore();
                    // Main Sequence band
                    hctx.save();
                    hctx.globalAlpha = 0.3;
                    hctx.beginPath();
                    hctx.moveTo(55, 15);
                    hctx.quadraticCurveTo(HW * 0.4, HH * 0.4, HW - 30, HH - 35);
                    hctx.lineTo(HW - 50, HH - 35);
                    hctx.quadraticCurveTo(HW * 0.35, HH * 0.35, 75, 15);
                    hctx.closePath();
                    var msGrad = hctx.createLinearGradient(55, 15, HW - 30, HH - 35);
                    msGrad.addColorStop(0, '#6366f1');
                    msGrad.addColorStop(0.5, '#fbbf24');
                    msGrad.addColorStop(1, '#ef4444');
                    hctx.fillStyle = msGrad;
                    hctx.fill();
                    hctx.restore();
                    // Plot specific stars
                    var stars = [
                      { name: 'Rigel', x: 0.12, y: 0.05, color: '#a0c4ff', r: 4 },
                      { name: 'Sirius', x: 0.25, y: 0.25, color: '#e0e8ff', r: 3 },
                      { name: 'Sun', x: 0.55, y: 0.6, color: '#fbbf24', r: 4 },
                      { name: 'Betelgeuse', x: 0.8, y: 0.05, color: '#ef4444', r: 6 },
                      { name: 'Proxima Centauri', x: 0.85, y: 0.85, color: '#f87171', r: 2 },
                      { name: 'White Dwarfs', x: 0.2, y: 0.82, color: '#e2e8f0', r: 2 },
                      { name: 'Aldebaran', x: 0.7, y: 0.2, color: '#fb923c', r: 5 }
                    ];
                    stars.forEach(function(s) {
                      var sx = 45 + s.x * (HW - 60);
                      var sy = 12 + s.y * (HH - 45);
                      hctx.fillStyle = s.color;
                      hctx.beginPath();
                      hctx.arc(sx, sy, s.r, 0, Math.PI * 2);
                      hctx.fill();
                      // glow
                      hctx.globalAlpha = 0.3;
                      var glow2 = hctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 3);
                      glow2.addColorStop(0, s.color);
                      glow2.addColorStop(1, 'transparent');
                      hctx.fillStyle = glow2;
                      hctx.beginPath();
                      hctx.arc(sx, sy, s.r * 3, 0, Math.PI * 2);
                      hctx.fill();
                      hctx.globalAlpha = 1;
                      // label
                      hctx.fillStyle = '#94a3b8';
                      hctx.font = '7px system-ui';
                      hctx.textAlign = 'center';
                      hctx.fillText(s.name, sx, sy + s.r + 9);
                    });
                    // Region labels
                    hctx.fillStyle = '#475569';
                    hctx.font = 'bold 9px system-ui';
                    hctx.fillText('Main Sequence', HW * 0.42, HH * 0.45);
                    hctx.fillText('Red Giants', HW * 0.75, HH * 0.15);
                    hctx.fillText('White Dwarfs', HW * 0.25, HH * 0.9);
                    hctx.fillText('Supergiants', HW * 0.35, 20);
                  }
                }),
                React.createElement("div", { className: "mt-2 text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "The Sun is a G2V main-sequence star. It will become a red giant in ~5 billion years, then shrink to a white dwarf.")
              )
            ),

            // === COSMIC DISTANCE LADDER ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, "\uD83D\uDCCF Cosmic Distance Ladder"),
                React.createElement("button", { "aria-label": "Toggle cosmic distance ladder section",
                  onClick: function() { upd('showDistance', !d.showDistance); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-emerald-500 hover:text-emerald-700"
                }, d.showDistance ? 'Hide' : 'Explore \u2192')
              ),
              d.showDistance && React.createElement("div", { className: "space-y-1.5" },
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-1" }, "Astronomers use a chain of methods to measure distances across the universe:"),
                DISTANCE_LADDER.map(function(rung, ri) {
                  return React.createElement("div", { key: ri, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-emerald-100') + " rounded-lg p-2 border" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-sm" }, rung.icon),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, rung.name),
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, rung.dist + " \u2022 " + rung.light)
                      ),
                      React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full " + (isDark ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-100 text-emerald-600') }, rung.method)
                    )
                  );
                })
              )
            ),

            // === DARK ENERGY & DARK MATTER ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-purple-300' : 'text-purple-700') }, "\uD83D\uDD73 Dark Energy & Dark Matter"),
                React.createElement("button", { "aria-label": "Toggle dark energy and dark matter section",
                  onClick: function() { upd('showDark', !d.showDark); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-purple-500 hover:text-purple-700"
                }, d.showDark ? 'Hide' : 'Learn \u2192')
              ),
              d.showDark && React.createElement("div", { className: "space-y-2" },
                // Pie chart canvas
                React.createElement("canvas", {
                  style: { width: '100%', height: '180px', display: 'block', borderRadius: '8px' },
                  ref: function(pieEl) {
                    if (!pieEl || pieEl._pieInit) return;
                    pieEl._pieInit = true;
                    var pctx = pieEl.getContext('2d');
                    var PW = pieEl.offsetWidth || 300, PH = 180;
                    pieEl.width = PW * 2; pieEl.height = PH * 2; pctx.scale(2, 2);
                    pctx.fillStyle = isDark ? '#1e293b' : '#faf5ff';
                    pctx.fillRect(0, 0, PW, PH);
                    var cx2 = PW * 0.3, cy2 = PH * 0.5, r2 = 65;
                    var slices = [
                      { pct: 0.68, color: '#6366f1', label: 'Dark Energy 68%' },
                      { pct: 0.27, color: '#8b5cf6', label: 'Dark Matter 27%' },
                      { pct: 0.05, color: '#fbbf24', label: 'Ordinary Matter 5%' }
                    ];
                    var startAngle = -Math.PI / 2;
                    slices.forEach(function(sl) {
                      var endAngle = startAngle + sl.pct * Math.PI * 2;
                      pctx.beginPath();
                      pctx.moveTo(cx2, cy2);
                      pctx.arc(cx2, cy2, r2, startAngle, endAngle);
                      pctx.closePath();
                      pctx.fillStyle = sl.color;
                      pctx.fill();
                      startAngle = endAngle;
                    });
                    // Legend
                    pctx.font = 'bold 9px system-ui';
                    pctx.textAlign = 'left';
                    slices.forEach(function(sl, si) {
                      var ly = 25 + si * 28;
                      pctx.fillStyle = sl.color;
                      pctx.fillRect(PW * 0.62, ly, 10, 10);
                      pctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
                      pctx.fillText(sl.label, PW * 0.62 + 15, ly + 9);
                    });
                    pctx.fillStyle = isDark ? '#94a3b8' : '#94a3b8';
                    pctx.font = '8px system-ui';
                    pctx.textAlign = 'center';
                    pctx.fillText('Composition of the Universe', PW * 0.5, PH - 5);
                  }
                }),
                React.createElement("div", { className: "space-y-1.5 text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                  React.createElement("div", null, "\uD83D\uDD73 **Dark Energy** (68%): A mysterious force causing the universe\'s expansion to accelerate. Discovered in 1998 via distant supernovae. We have no idea what it is."),
                  React.createElement("div", null, "\uD83C\uDF0C **Dark Matter** (27%): Invisible matter that doesn\'t emit light but has gravity. We see its effects on galaxy rotation and gravitational lensing. Leading candidate: unknown particles (WIMPs)."),
                  React.createElement("div", null, "\u2B50 **Ordinary Matter** (5%): Everything you can see \u2014 stars, planets, people, atoms. All of chemistry and biology is just 5% of the universe!")
                )
              )
            ),

            // === WHAT IF? COSMIC SCENARIOS ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-yellow-50 border-yellow-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-yellow-300' : 'text-yellow-700') }, "\uD83E\uDD14 What If? \u2014 Cosmic Thought Experiments"),
                React.createElement("button", { "aria-label": "Toggle cosmic thought experiments section",
                  onClick: function() { upd('showWhatIf', !d.showWhatIf); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-yellow-500 hover:text-yellow-700"
                }, d.showWhatIf ? 'Hide' : 'Think \u2192')
              ),
              d.showWhatIf && React.createElement("div", { className: "space-y-2" },
                WHAT_IF_COSMIC.map(function(wi, wii) {
                  return React.createElement("div", { key: wii, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-yellow-100') + " rounded-lg p-2.5 border" },
                    React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-yellow-200' : 'text-yellow-800') + " mb-1" }, "\u2753 " + wi.q),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, wi.a),
                    React.createElement("button", { "aria-label": "Listen to thought experiment: " + wi.q,
                      onClick: function() { speakText(wi.q + ' ' + wi.a); },
                      className: "mt-1 text-[11px] text-yellow-400 hover:text-yellow-600"
                    }, "\uD83D\uDD0A Listen")
                  );
                })
              )
            ),

            // === AI COSMOS TUTOR ===
            React.createElement("div", { className: "mt-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200" },
              React.createElement("div", { className: "text-xs font-bold text-violet-700 mb-2" }, "\uD83E\uDDD1\u200D\uD83D\uDE80 AI Cosmos Tutor"),
              React.createElement("div", { className: "flex gap-2 mb-2" },
                React.createElement("input", {
                  type: "text", placeholder: "Ask about the universe...",
                  value: d.aiQuestion || '',
                  'aria-label': 'Ask the AI cosmos tutor a question',
                  onChange: function(e) { upd('aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askCosmosTutor(d.aiQuestion); },
                  className: "flex-1 px-3 py-1.5 border border-violet-600 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                }),
                React.createElement("button", { "aria-label": "Ask Cosmos Tutor",
                  onClick: function() { askCosmosTutor(d.aiQuestion); },
                  disabled: d.aiLoading,
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold text-white " + (d.aiLoading ? 'bg-gray-400' : 'bg-violet-600 hover:bg-violet-700')
                }, d.aiLoading ? "\u23F3" : "Ask")
              ),
              React.createElement("div", { className: "flex flex-wrap gap-1 mb-2" },
                [
                  'What is dark energy?',
                  'How do black holes form?',
                  'What is the CMB?',
                  'Will the universe end?'
                ].map(function(q, qi) {
                  return React.createElement("button", { "aria-label": "Ask cosmos tutor: " + q, key: qi, onClick: function() { askCosmosTutor(q); }, className: "text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors" }, q);
                })
              ),
              d.aiAnswer && React.createElement("div", { className: "bg-white rounded-lg p-2 text-xs text-slate-700 border border-violet-100 relative" },
                React.createElement("div", null, d.aiAnswer),
                React.createElement("button", { "aria-label": "Read AI cosmos tutor answer aloud",
                  onClick: function() { speakText(d.aiAnswer); },
                  className: "absolute top-1 right-1 text-violet-400 hover:text-violet-600",
                  title: "Read aloud"
                }, "\uD83D\uDD0A")
              )
            ),

            // === ELEMENT ORIGINS ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-orange-50 border-orange-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-orange-300' : 'text-orange-700') }, "\u2697 Origin of the Elements"),
                React.createElement("button", { "aria-label": "Toggle element origins section",
                  onClick: function() { upd('showElements', !d.showElements); },
                  className: "text-[11px] text-orange-500 hover:text-orange-700"
                }, d.showElements ? 'Hide' : 'Explore \u2192')
              ),
              d.showElements && React.createElement("div", { className: "space-y-1.5" },
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-1" }, "Every atom in your body was made in a star, supernova, or the Big Bang itself!"),
                ELEMENT_ORIGINS.map(function(el, ei2) {
                  return React.createElement("div", { key: ei2, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-orange-100') + " rounded-lg p-2 border flex items-center gap-2" },
                    React.createElement("div", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white", style: { background: el.color } }, el.name.match(/\((.+)\)/)[1]),
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, el.name + " \u2014 " + el.origin),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, el.note)
                    ),
                    React.createElement("span", { className: "text-[11px] font-mono " + (isDark ? 'text-slate-200' : 'text-slate-200') }, el.pct)
                  );
                })
              )
            ),

            // === COSMIC STRUCTURES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-sky-50 border-sky-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-sky-300' : 'text-sky-700') }, "\uD83C\uDF0C Cosmic Structure Hierarchy"),
                React.createElement("button", { "aria-label": "Toggle cosmic structures section",
                  onClick: function() { upd('showStructures', !d.showStructures); },
                  className: "text-[11px] text-sky-500 hover:text-sky-700"
                }, d.showStructures ? 'Hide' : 'View \u2192')
              ),
              d.showStructures && React.createElement("div", { className: "space-y-1" },
                COSMIC_STRUCTURES.map(function(cs, csi) {
                  return React.createElement("div", { key: csi, className: "flex items-center gap-2 " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                    React.createElement("span", { className: "text-sm", style: { marginLeft: csi * 8 + 'px' } }, cs.icon),
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, cs.name),
                      React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " ml-1" }, "(" + cs.example + ")"),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, cs.size + " \u2022 " + cs.desc)
                    )
                  );
                })
              )
            ),

            // === FAMOUS TELESCOPES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-teal-50 border-teal-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-teal-300' : 'text-teal-700') }, "\uD83D\uDD2D Telescopes & Observatories"),
                React.createElement("button", { "aria-label": "Toggle telescopes and observatories section",
                  onClick: function() { upd('showTelescopes', !d.showTelescopes); },
                  className: "text-[11px] text-teal-500 hover:text-teal-700"
                }, d.showTelescopes ? 'Hide' : 'View \u2192')
              ),
              d.showTelescopes && React.createElement("div", { className: "space-y-1.5" },
                TELESCOPES.map(function(tel, ti) {
                  return React.createElement("div", { key: ti, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-teal-100') + " rounded-lg p-2 border" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-sm" }, tel.icon),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, tel.name + " (" + tel.year + ")"),
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, tel.type)
                      )
                    ),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " mt-1 italic" }, tel.achievement)
                  );
                })
              )
            ),

            // === COSMIC QUIZ ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-pink-50 border-pink-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-pink-300' : 'text-pink-700') }, "\uD83E\uDDE0 Cosmic Quiz"),
                React.createElement("button", { "aria-label": "Toggle cosmic quiz section",
                  onClick: function() { upd('showQuiz', !d.showQuiz); if (!d.quizIdx && d.quizIdx !== 0) updMulti({ quizIdx: 0, quizScore: 0, quizAnswered: false }); },
                  className: "text-[11px] text-pink-500 hover:text-pink-700"
                }, d.showQuiz ? 'Hide' : 'Quiz Me! \u2192')
              ),
              d.showQuiz && (function() {
                var qi = d.quizIdx || 0;
                var qScore = d.quizScore || 0;
                if (qi >= COSMIC_QUIZ.length) {
                  return React.createElement("div", { className: "text-center p-4" },
                    React.createElement("div", { className: "text-3xl mb-2" }, qScore >= 8 ? '\uD83C\uDFC6' : qScore >= 5 ? '\u2B50' : '\uD83D\uDCDA'),
                    React.createElement("div", { className: "text-sm font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, "Score: " + qScore + "/" + COSMIC_QUIZ.length),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mt-1" }, qScore >= 8 ? 'Amazing! You\'re a cosmic genius!' : qScore >= 5 ? 'Great job! Keep exploring!' : 'Keep learning \u2014 the universe is vast!'),
                    React.createElement("button", { "aria-label": "Retry cosmic quiz from the beginning",
                      onClick: function() { updMulti({ quizIdx: 0, quizScore: 0, quizAnswered: false }); },
                      className: "mt-2 px-3 py-1 text-[11px] font-bold text-white bg-pink-700 rounded-lg hover:bg-pink-600"
                    }, "\uD83D\uDD04 Retry")
                  );
                }
                var cq = COSMIC_QUIZ[qi];
                return React.createElement("div", null,
                  React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, "Question " + (qi + 1) + "/" + COSMIC_QUIZ.length + " \u2022 Score: " + qScore),
                  React.createElement("div", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') + " mb-2" }, cq.q),
                  React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                    cq.options.map(function(opt, oi) {
                      var answered = d.quizAnswered;
                      var isCorrect = oi === cq.correct;
                      var wasSelected = d.quizSelected === oi;
                      var btnClass = "text-[11px] py-1.5 px-2 rounded-lg border font-medium text-left transition-all ";
                      if (answered) {
                        if (isCorrect) btnClass += (isDark ? 'bg-green-900 border-green-500 text-green-300' : 'bg-green-100 border-green-400 text-green-700');
                        else if (wasSelected) btnClass += (isDark ? 'bg-red-900 border-red-500 text-red-300' : 'bg-red-100 border-red-400 text-red-700');
                        else btnClass += (isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-200');
                      } else {
                        btnClass += (isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:border-pink-400' : 'bg-white border-pink-200 text-slate-700 hover:border-pink-400');
                      }
                      return React.createElement("button", { "aria-label": "Select quiz answer: " + opt,
                        key: oi,
                        disabled: answered,
                        onClick: function() {
                          var correct = oi === cq.correct;
                          updMulti({ quizAnswered: true, quizSelected: oi, quizScore: correct ? qScore + 1 : qScore });
                          if (correct) playCelebrate(); else playBeep();
                          setTimeout(function() {
                            updMulti({ quizIdx: qi + 1, quizAnswered: false, quizSelected: null });
                          }, 1500);
                        },
                        className: btnClass
                      }, (answered && isCorrect ? '\u2705 ' : answered && wasSelected && !isCorrect ? '\u274C ' : '') + opt);
                    })
                  )
                );
              })()
            ),

            // === NUMBERS OF THE UNIVERSE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, "\uD83D\uDD22 Numbers of the Universe"),
                React.createElement("button", { "aria-label": "Toggle numbers of the universe section",
                  onClick: function() { upd('showNumbers', !d.showNumbers); },
                  className: "text-[11px] text-indigo-500 hover:text-indigo-700"
                }, d.showNumbers ? 'Hide' : 'View \u2192')
              ),
              d.showNumbers && React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                COSMIC_NUMBERS.map(function(cn, cni) {
                  return React.createElement("div", { key: cni, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-indigo-100') + " rounded-lg p-2 border text-center" },
                    React.createElement("div", { className: "text-sm" }, cn.icon),
                    React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, cn.value),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, cn.label)
                  );
                })
              )
            ),

                        // === COSMIC CALENDAR ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-blue-50 to-indigo-50 border-indigo-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, "\uD83D\uDCC5 Cosmic Calendar (Carl Sagan)"),
                React.createElement("button", { "aria-label": "Toggle cosmic calendar section",
                  onClick: function() { upd('showCalendar', !d.showCalendar); },
                  className: "text-[11px] text-indigo-500 hover:text-indigo-700"
                }, d.showCalendar ? 'Hide' : 'View \u2192')
              ),
              d.showCalendar && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "If all 13.8 billion years were compressed into one calendar year, human history would fit in the last second of December 31st."),
                React.createElement("div", { className: "relative pl-4 border-l-2 " + (isDark ? 'border-indigo-700' : 'border-indigo-300') + " space-y-1.5 max-h-64 overflow-y-auto" },
                  COSMIC_CALENDAR.map(function(cc, cci) {
                    return React.createElement("div", { key: cci, className: "relative" },
                      React.createElement("div", { className: "absolute -left-[21px] top-1 w-3 h-3 rounded-full " + (isDark ? 'bg-indigo-400' : 'bg-indigo-500') }),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                        React.createElement("span", { className: "font-bold text-indigo-500 mr-1" }, cc.date),
                        React.createElement("span", { className: "mr-1" }, cc.icon),
                        React.createElement("span", { className: "font-medium" }, cc.event),
                        React.createElement("span", { className: " ml-1 " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "(" + cc.real + ")")
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "mt-2 text-center text-[11px] font-bold " + (isDark ? 'text-indigo-400' : 'text-indigo-600') }, "All of recorded human history = last 14 seconds of Dec 31!")
              )
            ),

            // === GALAXY TYPES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-violet-50 border-violet-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-violet-300' : 'text-violet-700') }, "\uD83C\uDF0C Types of Galaxies"),
                React.createElement("button", { "aria-label": "Toggle galaxy types section",
                  onClick: function() { upd('showGalaxyTypes', !d.showGalaxyTypes); },
                  className: "text-[11px] text-violet-500 hover:text-violet-700"
                }, d.showGalaxyTypes ? 'Hide' : 'View \u2192')
              ),
              d.showGalaxyTypes && React.createElement("div", { className: "space-y-2" },
                GALAXY_TYPES.map(function(gt, gti) {
                  return React.createElement("div", { key: gti, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-violet-100') + " rounded-lg p-2.5 border" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-lg" }, gt.icon),
                      React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, gt.name + " (" + gt.pct + " of galaxies)"),
                      React.createElement("span", { className: "ml-auto text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, gt.example)
                    ),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, gt.desc),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-violet-400' : 'text-violet-500') + " mt-1 font-medium" }, "Structure: " + gt.features)
                  );
                })
              )
            ),

            // === BLACK HOLE ANATOMY ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-900') + " rounded-xl p-3 border border-slate-700" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-orange-400" }, "\uD83D\uDD73 Black Hole Anatomy"),
                React.createElement("button", { "aria-label": "Toggle black hole anatomy section",
                  onClick: function() { upd('showBlackHole', !d.showBlackHole); },
                  className: "text-[11px] text-orange-400 hover:text-orange-300"
                }, d.showBlackHole ? 'Hide' : 'Explore \u2192')
              ),
              d.showBlackHole && React.createElement("div", { className: "space-y-1.5" },
                // Visual canvas
                React.createElement("canvas", {
                  style: { width: '100%', height: '240px', display: 'block', borderRadius: '8px' },
                  ref: function(bhEl) {
                    if (!bhEl || bhEl._bhInit) return;
                    bhEl._bhInit = true;
                    var bctx = bhEl.getContext('2d');
                    var BW = bhEl.offsetWidth || 300, BH = 240;
                    bhEl.width = BW * 2; bhEl.height = BH * 2; bctx.scale(2, 2);
                    var btick = 0;
                    function drawBH() {
                      btick++;
                      bctx.fillStyle = '#050510';
                      bctx.fillRect(0, 0, BW, BH);
                      var cx2 = BW * 0.45, cy2 = BH * 0.5;
                      // Stars in background
                      for (var bsi = 0; bsi < 50; bsi++) {
                        bctx.globalAlpha = 0.2 + 0.2 * Math.sin(btick * 0.02 + bsi);
                        bctx.fillStyle = '#fff';
                        bctx.beginPath();
                        bctx.arc((bsi * 73 + 11) % BW, (bsi * 41 + 7) % BH, 0.6, 0, Math.PI * 2);
                        bctx.fill();
                      }
                      bctx.globalAlpha = 1;
                      // Relativistic jet (top)
                      bctx.save();
                      var jetGrad = bctx.createLinearGradient(cx2, cy2 - 60, cx2, cy2);
                      jetGrad.addColorStop(0, 'rgba(99,102,241,0)');
                      jetGrad.addColorStop(0.5, 'rgba(99,102,241,0.3)');
                      jetGrad.addColorStop(1, 'rgba(99,102,241,0)');
                      bctx.fillStyle = jetGrad;
                      bctx.beginPath();
                      bctx.moveTo(cx2 - 3, cy2);
                      bctx.lineTo(cx2 - 8 + Math.sin(btick * 0.05) * 2, cy2 - 60);
                      bctx.lineTo(cx2 + 8 + Math.sin(btick * 0.05) * 2, cy2 - 60);
                      bctx.lineTo(cx2 + 3, cy2);
                      bctx.fill();
                      // Jet (bottom)
                      var jetGrad2 = bctx.createLinearGradient(cx2, cy2, cx2, cy2 + 60);
                      jetGrad2.addColorStop(0, 'rgba(99,102,241,0)');
                      jetGrad2.addColorStop(0.5, 'rgba(99,102,241,0.3)');
                      jetGrad2.addColorStop(1, 'rgba(99,102,241,0)');
                      bctx.fillStyle = jetGrad2;
                      bctx.beginPath();
                      bctx.moveTo(cx2 - 3, cy2);
                      bctx.lineTo(cx2 - 8 - Math.sin(btick * 0.05) * 2, cy2 + 60);
                      bctx.lineTo(cx2 + 8 - Math.sin(btick * 0.05) * 2, cy2 + 60);
                      bctx.lineTo(cx2 + 3, cy2);
                      bctx.fill();
                      bctx.restore();
                      // Accretion disk (elliptical ring)
                      for (var ari = 3; ari >= 0; ari--) {
                        var diskR = 28 + ari * 7;
                        var aAlpha = 0.3 - ari * 0.05;
                        bctx.strokeStyle = 'rgba(249,115,22,' + aAlpha + ')';
                        bctx.lineWidth = 3 - ari * 0.5;
                        bctx.beginPath();
                        bctx.ellipse(cx2, cy2, diskR, diskR * 0.25, btick * 0.002, 0, Math.PI * 2);
                        bctx.stroke();
                      }
                      // Photon sphere glow
                      var phGrad = bctx.createRadialGradient(cx2, cy2, 14, cx2, cy2, 22);
                      phGrad.addColorStop(0, 'rgba(168,85,247,0)');
                      phGrad.addColorStop(0.5, 'rgba(168,85,247,0.15)');
                      phGrad.addColorStop(1, 'rgba(168,85,247,0)');
                      bctx.fillStyle = phGrad;
                      bctx.beginPath();
                      bctx.arc(cx2, cy2, 22, 0, Math.PI * 2);
                      bctx.fill();
                      // Event horizon (black circle)
                      bctx.fillStyle = '#000';
                      bctx.beginPath();
                      bctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
                      bctx.fill();
                      // Shadow edge glow
                      var edgeGrad = bctx.createRadialGradient(cx2, cy2, 12, cx2, cy2, 16);
                      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
                      edgeGrad.addColorStop(0.5, 'rgba(249,115,22,0.2)');
                      edgeGrad.addColorStop(1, 'rgba(249,115,22,0)');
                      bctx.fillStyle = edgeGrad;
                      bctx.beginPath();
                      bctx.arc(cx2, cy2, 16, 0, Math.PI * 2);
                      bctx.fill();
                      // Labels
                      bctx.fillStyle = '#94a3b8';
                      bctx.font = '7px system-ui';
                      bctx.textAlign = 'left';
                      bctx.fillText('Event Horizon', cx2 + 18, cy2 - 2);
                      bctx.fillText('Accretion Disk', cx2 + 35, cy2 + 12);
                      bctx.fillStyle = '#818cf8';
                      bctx.fillText('Relativistic Jet', cx2 + 12, cy2 - 45);
                      bctx.fillText('Relativistic Jet', cx2 + 12, cy2 + 50);
                      requestAnimationFrame(drawBH);
                    }
                    drawBH();
                  }
                }),
                BLACK_HOLE_PARTS.map(function(part, pi) {
                  return React.createElement("div", { key: pi, className: "flex items-start gap-2" },
                    React.createElement("div", { className: "w-3 h-3 rounded-full mt-0.5 flex-shrink-0 border border-slate-600", style: { background: part.color } }),
                    React.createElement("div", null,
                      React.createElement("span", { className: "text-[11px] font-bold text-white" }, part.name),
                      React.createElement("div", { className: "text-[11px] text-slate-200" }, part.desc)
                    )
                  );
                })
              )
            ),

            // === DRAKE EQUATION CALCULATOR ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-green-300' : 'text-green-700') }, "\uD83D\uDC7D Drake Equation \u2014 Are We Alone?"),
                React.createElement("button", { "aria-label": "Toggle Drake equation section",
                  onClick: function() { upd('showDrake', !d.showDrake); },
                  className: "text-[11px] text-green-500 hover:text-green-700"
                }, d.showDrake ? 'Hide' : 'Calculate \u2192')
              ),
              d.showDrake && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "N = R* \u00D7 fp \u00D7 ne \u00D7 fl \u00D7 fi \u00D7 fc \u00D7 L"),
                React.createElement("div", { className: "space-y-1.5" },
                  [
                    { key: 'drakeR', label: 'R* (star formation rate/yr)', min: 0.5, max: 10, step: 0.5, def: DRAKE_DEFAULTS.R, desc: 'New stars per year in our galaxy' },
                    { key: 'drakeFp', label: 'fp (fraction with planets)', min: 0, max: 1, step: 0.1, def: DRAKE_DEFAULTS.fp, desc: 'Stars that have planetary systems' },
                    { key: 'drakeNe', label: 'ne (habitable planets)', min: 0, max: 5, step: 0.5, def: DRAKE_DEFAULTS.ne, desc: 'Habitable planets per system' },
                    { key: 'drakeFl', label: 'fl (fraction with life)', min: 0, max: 1, step: 0.1, def: DRAKE_DEFAULTS.fl, desc: 'Planets where life actually develops' },
                    { key: 'drakeFi', label: 'fi (fraction intelligent)', min: 0, max: 1, step: 0.05, def: DRAKE_DEFAULTS.fi, desc: 'Life that develops intelligence' },
                    { key: 'drakeFc', label: 'fc (fraction detectable)', min: 0, max: 1, step: 0.05, def: DRAKE_DEFAULTS.fc, desc: 'Civilizations we could detect' },
                    { key: 'drakeL', label: 'L (civilization lifetime, yrs)', min: 100, max: 1000000, step: 1000, def: DRAKE_DEFAULTS.L, desc: 'How long a detectable civilization lasts' }
                  ].map(function(param) {
                    var val = d[param.key] !== undefined ? d[param.key] : param.def;
                    return React.createElement("div", { key: param.key },
                      React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement("label", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, param.label + ": " + val),
                        React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-slate-600' : 'text-slate-200') }, param.desc)
                      ),
                      React.createElement("input", { type: "range", min: param.min, max: param.max, step: param.step, value: val, 'aria-label': param.label, onChange: function(e) { upd(param.key, parseFloat(e.target.value)); }, className: "w-full h-1 bg-green-200 rounded-lg appearance-none" })
                    );
                  })
                ),
                // Result
                (function() {
                  var N = (d.drakeR || DRAKE_DEFAULTS.R) * (d.drakeFp || DRAKE_DEFAULTS.fp) * (d.drakeNe || DRAKE_DEFAULTS.ne) * (d.drakeFl || DRAKE_DEFAULTS.fl) * (d.drakeFi || DRAKE_DEFAULTS.fi) * (d.drakeFc || DRAKE_DEFAULTS.fc) * (d.drakeL || DRAKE_DEFAULTS.L);
                  return React.createElement("div", { className: "mt-2 text-center p-2 rounded-lg " + (isDark ? 'bg-slate-700' : 'bg-green-100') },
                    React.createElement("div", { className: "text-lg font-black " + (isDark ? 'text-green-300' : 'text-green-700') }, "N \u2248 " + Math.round(N).toLocaleString()),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Estimated detectable civilizations in our galaxy right now"),
                    N > 1000 ? React.createElement("div", { className: "text-[11px] text-green-500 mt-1 font-bold" }, "\uD83D\uDC7D That\'s a lot! So where is everybody? (Fermi Paradox)") :
                    N < 1 ? React.createElement("div", { className: "text-[11px] text-orange-500 mt-1 font-bold" }, "\uD83D\uDE14 We might be alone in the Milky Way...") :
                    React.createElement("div", { className: "text-[11px] text-blue-500 mt-1 font-bold" }, "\uD83E\uDD14 A handful of civilizations \u2014 but space is very, very big")
                  );
                })()
              )
            ),

            // === SUPERNOVA TYPES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-red-50 border-red-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-red-300' : 'text-red-700') }, "\uD83D\uDCA5 Types of Supernovae"),
                React.createElement("button", { "aria-label": "Toggle supernovae types section",
                  onClick: function() { upd('showSupernovae', !d.showSupernovae); },
                  className: "text-[11px] text-red-500 hover:text-red-700"
                }, d.showSupernovae ? 'Hide' : 'Learn \u2192')
              ),
              d.showSupernovae && React.createElement("div", { className: "space-y-2" },
                SUPERNOVA_TYPES.map(function(sn, sni) {
                  return React.createElement("div", { key: sni, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-red-100') + " rounded-lg p-2.5 border" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-lg" }, sn.icon),
                      React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, sn.type),
                      React.createElement("span", { className: "ml-auto text-[11px] " + (isDark ? 'text-red-400' : 'text-red-500') + " font-bold" }, "Peak: " + sn.brightness)
                    ),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, "\u26A1 Trigger: " + sn.trigger),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " mb-1" }, sn.mechanism),
                    React.createElement("div", { className: "text-[11px] font-medium " + (isDark ? 'text-amber-400' : 'text-amber-600') }, "\uD83D\uDCA1 " + sn.importance)
                  );
                })
              )
            ),

            // === FAMOUS ASTRONOMERS ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-cyan-50 border-cyan-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-cyan-300' : 'text-cyan-700') }, "\uD83D\uDD2D Famous Astronomers"),
                React.createElement("button", { "aria-label": "Toggle famous astronomers timeline",
                  onClick: function() { upd('showAstronomers', !d.showAstronomers); },
                  className: "text-[11px] text-cyan-500 hover:text-cyan-700"
                }, d.showAstronomers ? 'Hide' : 'View \u2192')
              ),
              d.showAstronomers && React.createElement("div", { className: "relative pl-4 border-l-2 " + (isDark ? 'border-cyan-700' : 'border-cyan-300') + " space-y-1.5 max-h-64 overflow-y-auto" },
                ASTRONOMERS.map(function(ast, asti) {
                  return React.createElement("div", { key: asti, className: "relative" },
                    React.createElement("div", { className: "absolute -left-[21px] top-1 w-3 h-3 rounded-full " + (isDark ? 'bg-cyan-400' : 'bg-cyan-500') }),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') },
                      React.createElement("span", { className: "font-bold text-cyan-500 mr-1" }, ast.year),
                      React.createElement("span", { className: "mr-1" }, ast.icon),
                      React.createElement("span", { className: "font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, ast.name),
                      React.createElement("span", { className: " \u2014 " + (isDark ? 'text-slate-200' : 'text-slate-200') }, " \u2014 " + ast.contribution)
                    )
                  );
                })
              )
            ),

            // === OBSERVABLE UNIVERSE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-fuchsia-50 border-fuchsia-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-fuchsia-300' : 'text-fuchsia-700') }, "\uD83C\uDF20 The Observable Universe"),
                React.createElement("button", { "aria-label": "Toggle observable universe section",
                  onClick: function() { upd('showObservable', !d.showObservable); },
                  className: "text-[11px] text-fuchsia-500 hover:text-fuchsia-700"
                }, d.showObservable ? 'Hide' : 'Learn \u2192')
              ),
              d.showObservable && React.createElement("div", { className: "space-y-2" },
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5 text-center" },
                  React.createElement("div", { className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2 border " + (isDark ? 'border-slate-600' : 'border-fuchsia-100') },
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Radius"),
                    React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, OBSERVABLE_UNIVERSE.radius)
                  ),
                  React.createElement("div", { className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2 border " + (isDark ? 'border-slate-600' : 'border-fuchsia-100') },
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Diameter"),
                    React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, OBSERVABLE_UNIVERSE.diameter)
                  ),
                  React.createElement("div", { className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2 border " + (isDark ? 'border-slate-600' : 'border-fuchsia-100') },
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Age"),
                    React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, OBSERVABLE_UNIVERSE.age)
                  )
                ),
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') + " space-y-1.5" },
                  React.createElement("div", null, "\u2753 **Why is it 93 billion light-years if the universe is only 13.8 billion years old?**"),
                  React.createElement("div", { className: isDark ? 'text-slate-200' : 'text-slate-600' }, OBSERVABLE_UNIVERSE.whyBigger),
                  React.createElement("div", null, "\u2753 **Is there more beyond what we can see?**"),
                  React.createElement("div", { className: isDark ? 'text-slate-200' : 'text-slate-600' }, OBSERVABLE_UNIVERSE.beyondIt)
                )
              )
            ),

            // === EXOPLANET TYPES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, "\uD83C\uDF0D Exoplanet Types"),
                React.createElement("button", { "aria-label": "Toggle exoplanet types section",
                  onClick: function() { upd('showExoplanets', !d.showExoplanets); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-emerald-500 hover:text-emerald-700"
                }, d.showExoplanets ? 'Hide' : 'Explore \u2192')
              ),
              d.showExoplanets && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "We have discovered 5,700+ exoplanets. They come in dazzling variety \u2014 many unlike anything in our Solar System."),
                React.createElement("div", { className: "grid grid-cols-1 gap-2" },
                  EXOPLANET_TYPES.map(function(ep2, epi) {
                    return React.createElement("div", { key: epi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-emerald-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("div", { className: "w-7 h-7 rounded-full flex items-center justify-center text-sm", style: { background: ep2.color + '20', border: '2px solid ' + ep2.color } }, ep2.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, ep2.name),
                          React.createElement("span", { className: "text-[11px] ml-1.5 " + (isDark ? 'text-slate-200' : 'text-slate-200') }, ep2.example)
                        ),
                        React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full font-bold " + (ep2.habitable === 'Best candidate' ? (isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-600') : ep2.habitable === 'Possible' ? (isDark ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-600') : (isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-100 text-slate-200')) }, typeof ep2.habitable === 'string' ? ep2.habitable : (ep2.habitable ? 'Habitable' : 'Not habitable'))
                      ),
                      React.createElement("div", { className: "grid grid-cols-3 gap-1 mb-1.5" },
                        React.createElement("div", { className: "text-[11px] text-center " + (isDark ? 'text-slate-200' : 'text-slate-200') },
                          React.createElement("div", { className: "font-bold " + (isDark ? 'text-slate-300' : 'text-slate-600') }, ep2.size),
                          "Size"
                        ),
                        React.createElement("div", { className: "text-[11px] text-center " + (isDark ? 'text-slate-200' : 'text-slate-200') },
                          React.createElement("div", { className: "font-bold " + (isDark ? 'text-slate-300' : 'text-slate-600') }, ep2.orbit),
                          "Orbit"
                        ),
                        React.createElement("div", { className: "text-[11px] text-center " + (isDark ? 'text-slate-200' : 'text-slate-200') },
                          React.createElement("div", { className: "font-bold " + (isDark ? 'text-slate-300' : 'text-slate-600') }, ep2.temp),
                          "Temperature"
                        )
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, ep2.desc),
                      React.createElement("button", { "aria-label": "Listen to " + ep2.name + " description",
                        onClick: function(e) { e.stopPropagation(); speakText(ep2.name + '. ' + ep2.desc); },
                        className: "mt-1 text-[11px] text-emerald-400 hover:text-emerald-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === SPACE MISSIONS TIMELINE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-sky-50 to-blue-50 border-blue-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-blue-300' : 'text-blue-700') }, "\uD83D\uDE80 Space Missions Timeline"),
                React.createElement("button", { "aria-label": "Toggle space missions timeline section",
                  onClick: function() { upd('showMissions', !d.showMissions); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-blue-500 hover:text-blue-700"
                }, d.showMissions ? 'Hide' : 'Explore \u2192')
              ),
              d.showMissions && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "Key moments in humanity's journey to explore the cosmos:"),
                React.createElement("div", { className: "relative pl-4 border-l-2 " + (isDark ? 'border-blue-700' : 'border-blue-300') + " space-y-2 max-h-80 overflow-y-auto" },
                  SPACE_MISSIONS.map(function(sm, smi) {
                    return React.createElement("div", { key: smi, className: "relative" },
                      React.createElement("div", { className: "absolute -left-[21px] top-1.5 w-3 h-3 rounded-full " + (isDark ? 'bg-blue-400' : 'bg-blue-500') }),
                      React.createElement("div", { className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-blue-100') + " rounded-lg p-2 border" },
                        React.createElement("div", { className: "flex items-center gap-2 mb-0.5" },
                          React.createElement("span", { className: "text-sm" }, sm.icon),
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, sm.name),
                          React.createElement("span", { className: "ml-auto text-[11px] font-bold " + (isDark ? 'text-blue-400' : 'text-blue-500') }, sm.year),
                          React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, sm.agency)
                        ),
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, sm.desc)
                      )
                    );
                  })
                )
              )
            ),

            // === FERMI PARADOX ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-amber-300' : 'text-amber-700') }, "\uD83E\uDD14 The Fermi Paradox \u2014 Where Is Everybody?"),
                React.createElement("button", { "aria-label": "Toggle Fermi paradox section",
                  onClick: function() { upd('showFermi', !d.showFermi); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-amber-500 hover:text-amber-700"
                }, d.showFermi ? 'Hide' : 'Think \u2192')
              ),
              d.showFermi && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-2" }, "If the universe is so vast and old, and the conditions for life aren't rare, why haven't we found evidence of alien civilizations? Physicist Enrico Fermi asked this in 1950 over lunch. Here are the leading proposed answers:"),
                React.createElement("div", { className: "space-y-2" },
                  FERMI_SOLUTIONS.map(function(fs, fsi) {
                    var typeColors = { filter: 'text-red-400', social: 'text-purple-400', contact: 'text-green-400', tech: 'text-blue-400', physics: 'text-cyan-400' };
                    return React.createElement("div", { key: fsi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-amber-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, fs.icon),
                        React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, fs.name),
                        React.createElement("span", { className: "ml-auto text-[11px] px-1.5 py-0.5 rounded-full font-bold " + (typeColors[fs.type] || 'text-slate-200') + " " + (isDark ? 'bg-slate-600' : 'bg-slate-100') }, fs.type)
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, fs.desc),
                      React.createElement("button", { "aria-label": "Listen to " + fs.name + " solution",
                        onClick: function(e) { e.stopPropagation(); speakText(fs.name + '. ' + fs.desc); },
                        className: "mt-1 text-[11px] text-amber-400 hover:text-amber-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === GRAVITATIONAL LENSING ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-900') + " rounded-xl p-3 border border-indigo-700" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-400" }, "\uD83D\uDD2E Gravitational Lensing"),
                React.createElement("button", { "aria-label": "Toggle gravitational lensing section",
                  onClick: function() { upd('showLensing', !d.showLensing); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-indigo-400 hover:text-indigo-300"
                }, d.showLensing ? 'Hide' : 'Explore \u2192')
              ),
              d.showLensing && React.createElement("div", { className: "space-y-2" },
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-1" }, "Einstein predicted that massive objects bend light. This gravitational lensing lets us see behind galaxies, magnify distant objects, and map invisible dark matter."),
                // Animated lensing canvas
                React.createElement("canvas", {
                  style: { width: '100%', height: '260px', display: 'block', borderRadius: '8px' },
                  ref: function(lensEl) {
                    if (!lensEl || lensEl._lensInit) return;
                    lensEl._lensInit = true;
                    var lctx = lensEl.getContext('2d');
                    var LW = lensEl.offsetWidth || 300, LH = 260;
                    lensEl.width = LW * 2; lensEl.height = LH * 2; lctx.scale(2, 2);
                    var ltick = 0;
                    function drawLens() {
                      ltick++;
                      lctx.fillStyle = '#050510';
                      lctx.fillRect(0, 0, LW, LH);
                      // Background stars
                      for (var lsi = 0; lsi < 60; lsi++) {
                        lctx.globalAlpha = 0.15 + 0.1 * Math.sin(ltick * 0.015 + lsi * 2);
                        lctx.fillStyle = '#fff';
                        lctx.beginPath();
                        lctx.arc((lsi * 59 + 17) % LW, (lsi * 37 + 11) % LH, 0.5, 0, Math.PI * 2);
                        lctx.fill();
                      }
                      lctx.globalAlpha = 1;
                      var lcx = LW * 0.5, lcy = LH * 0.5;
                      // Massive foreground galaxy (lens)
                      var lensGrad = lctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, 18);
                      lensGrad.addColorStop(0, 'rgba(255,200,100,0.6)');
                      lensGrad.addColorStop(0.5, 'rgba(200,150,80,0.2)');
                      lensGrad.addColorStop(1, 'rgba(200,150,80,0)');
                      lctx.fillStyle = lensGrad;
                      lctx.beginPath(); lctx.arc(lcx, lcy, 18, 0, Math.PI * 2); lctx.fill();
                      // Einstein Ring (lensed background galaxy)
                      var ringR = 32 + 2 * Math.sin(ltick * 0.02);
                      var ringGrad = lctx.createRadialGradient(lcx, lcy, ringR - 4, lcx, lcy, ringR + 4);
                      ringGrad.addColorStop(0, 'rgba(100,150,255,0)');
                      ringGrad.addColorStop(0.3, 'rgba(100,180,255,0.25)');
                      ringGrad.addColorStop(0.5, 'rgba(120,200,255,0.4)');
                      ringGrad.addColorStop(0.7, 'rgba(100,180,255,0.25)');
                      ringGrad.addColorStop(1, 'rgba(100,150,255,0)');
                      lctx.fillStyle = ringGrad;
                      lctx.beginPath(); lctx.arc(lcx, lcy, ringR + 4, 0, Math.PI * 2); lctx.fill();
                      // Four arc images (simulating strong lensing arcs)
                      for (var ai = 0; ai < 4; ai++) {
                        var arcAngle = ai * Math.PI / 2 + ltick * 0.003;
                        var arcR = 35;
                        var ax = lcx + Math.cos(arcAngle) * arcR;
                        var ay = lcy + Math.sin(arcAngle) * arcR;
                        var arcAlpha = 0.3 + 0.15 * Math.sin(ltick * 0.025 + ai);
                        lctx.save();
                        lctx.translate(ax, ay);
                        lctx.rotate(arcAngle + Math.PI / 2);
                        lctx.beginPath();
                        lctx.ellipse(0, 0, 6, 2, 0, 0, Math.PI * 2);
                        lctx.fillStyle = 'rgba(120,180,255,' + arcAlpha + ')';
                        lctx.fill();
                        lctx.restore();
                      }
                      // Spacetime grid distortion lines
                      lctx.save();
                      lctx.globalAlpha = 0.08;
                      lctx.strokeStyle = '#6366f1';
                      lctx.lineWidth = 0.5;
                      for (var gx = 0; gx < LW; gx += 12) {
                        lctx.beginPath();
                        for (var gy2 = 0; gy2 < LH; gy2 += 2) {
                          var ddx = gx - lcx, ddy = gy2 - lcy;
                          var dist2 = Math.sqrt(ddx * ddx + ddy * ddy);
                          var bend = dist2 > 5 ? 300 / (dist2 * dist2) : 0;
                          var bx = gx + ddx * bend;
                          if (gy2 === 0) lctx.moveTo(bx, gy2);
                          else lctx.lineTo(bx, gy2);
                        }
                        lctx.stroke();
                      }
                      lctx.restore();
                      // Labels
                      lctx.fillStyle = '#94a3b8'; lctx.font = '7px system-ui'; lctx.textAlign = 'center';
                      lctx.fillText('Foreground Galaxy (Lens)', lcx, lcy + 26);
                      lctx.fillStyle = '#818cf8';
                      lctx.fillText('Einstein Ring', lcx, lcy - 38);
                      lctx.fillStyle = '#94a3b8'; lctx.font = '8px system-ui';
                      lctx.fillText('Light from a background galaxy is bent around a massive foreground object', LW / 2, LH - 8);
                      requestAnimationFrame(drawLens);
                    }
                    drawLens();
                  }
                }),
                React.createElement("div", { className: "space-y-1.5" },
                  LENSING_EXAMPLES.map(function(le, lei) {
                    return React.createElement("div", { key: lei, className: "flex items-start gap-2" },
                      React.createElement("span", { className: "text-sm mt-0.5" }, le.icon),
                      React.createElement("div", null,
                        React.createElement("span", { className: "text-[11px] font-bold text-white" }, le.name),
                        React.createElement("span", { className: "text-[11px] ml-1.5 px-1 py-0.5 rounded " + (le.type === 'Strong lensing' ? 'bg-indigo-900 text-indigo-300' : le.type === 'Weak lensing' ? 'bg-purple-900 text-purple-300' : 'bg-cyan-900 text-cyan-300') }, le.type),
                        React.createElement("div", { className: "text-[11px] text-slate-200" }, le.desc)
                      )
                    );
                  })
                )
              )
            ),

            // === UNSOLVED COSMIC MYSTERIES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-rose-50 to-pink-50 border-rose-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-rose-300' : 'text-rose-700') }, "\u2753 Unsolved Cosmic Mysteries"),
                React.createElement("button", { "aria-label": "Toggle unsolved cosmic mysteries section",
                  onClick: function() { upd('showMysteries', !d.showMysteries); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-rose-500 hover:text-rose-700"
                }, d.showMysteries ? 'Hide' : 'Explore \u2192')
              ),
              d.showMysteries && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "These are the biggest unanswered questions in cosmology. Solving any one could win a Nobel Prize."),
                React.createElement("div", { className: "space-y-2" },
                  COSMIC_MYSTERIES.map(function(cm, cmi) {
                    var urgColors = { Critical: 'text-red-200 bg-red-900/30', Fundamental: 'text-amber-400 bg-amber-900/30', Philosophical: 'text-purple-400 bg-purple-900/30', Open: 'text-blue-400 bg-blue-900/30', 'Active debate': 'text-green-400 bg-green-900/30' };
                    var uc = urgColors[cm.urgency] || 'text-slate-200 bg-slate-700';
                    return React.createElement("div", { key: cmi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-rose-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, cm.icon),
                        React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, cm.name),
                        React.createElement("span", { className: "ml-auto text-[11px] px-1.5 py-0.5 rounded-full font-bold " + uc }, cm.urgency)
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, cm.desc),
                      React.createElement("button", { "aria-label": "Listen to " + cm.name + " mystery",
                        onClick: function(e) { e.stopPropagation(); speakText(cm.name + '. ' + cm.desc); },
                        className: "mt-1 text-[11px] text-rose-400 hover:text-rose-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === MULTIVERSE THEORIES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-purple-50 to-violet-50 border-purple-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-purple-300' : 'text-purple-700') }, "\uD83C\uDF10 Multiverse Theories"),
                React.createElement("button", { "aria-label": "Toggle multiverse theories section",
                  onClick: function() { upd('showMultiverse', !d.showMultiverse); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-purple-500 hover:text-purple-700"
                }, d.showMultiverse ? 'Hide' : 'Explore \u2192')
              ),
              d.showMultiverse && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "Is our universe all there is? Several serious scientific frameworks suggest it may be one of infinitely many."),
                React.createElement("div", { className: "space-y-2" },
                  MULTIVERSE_THEORIES.map(function(mt2, mti) {
                    return React.createElement("div", { key: mti, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-purple-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, mt2.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, mt2.name),
                          React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, mt2.source)
                        )
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, mt2.desc),
                      React.createElement("div", { className: "text-[11px] font-medium " + (isDark ? 'text-purple-400' : 'text-purple-600') }, "\uD83D\uDD2C Evidence: " + mt2.evidence),
                      React.createElement("button", { "aria-label": "Listen to " + mt2.name + " theory",
                        onClick: function(e) { e.stopPropagation(); speakText(mt2.name + '. ' + mt2.desc); },
                        className: "mt-1 text-[11px] text-purple-400 hover:text-purple-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === REDSHIFT & BLUESHIFT ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-900') + " rounded-xl p-3 border border-red-700" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-red-400" }, "\uD83D\uDD34 Redshift & Blueshift \u2014 The Doppler Effect of Light"),
                React.createElement("button", { "aria-label": "Toggle redshift and blueshift section",
                  onClick: function() { upd('showRedshift', !d.showRedshift); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-red-400 hover:text-red-300"
                }, d.showRedshift ? 'Hide' : 'Explore \u2192')
              ),
              d.showRedshift && React.createElement("div", { className: "space-y-2" },
                // Animated Doppler canvas
                React.createElement("canvas", {
                  style: { width: '100%', height: '260px', display: 'block', borderRadius: '8px' },
                  ref: function(rsEl) {
                    if (!rsEl || rsEl._rsInit) return;
                    rsEl._rsInit = true;
                    var rctx = rsEl.getContext('2d');
                    var RW = rsEl.offsetWidth || 300, RH = 260;
                    rsEl.width = RW * 2; rsEl.height = RH * 2; rctx.scale(2, 2);
                    var rtick = 0;
                    function drawRS() {
                      rtick++;
                      rctx.fillStyle = '#050510';
                      rctx.fillRect(0, 0, RW, RH);

                      // === TOP HALF: Blueshift (approaching) ===
                      var topY = RH * 0.25;
                      // Approaching galaxy (moves right toward observer)
                      var galX1 = 40 + (rtick * 0.3) % (RW * 0.35);
                      var obsX1 = RW * 0.78;
                      // Draw compressed waves between galaxy and observer
                      var waveCount1 = 12;
                      for (var wi = 0; wi < waveCount1; wi++) {
                        var frac = wi / waveCount1;
                        var wx = galX1 + frac * (obsX1 - galX1);
                        // Compressed wavelength (shorter = bluer)
                        var spacing = 0.6 + frac * 0.2;
                        var alpha = 0.2 + 0.3 * (1 - frac);
                        rctx.beginPath();
                        rctx.arc(wx, topY, 2, 0, Math.PI * 2);
                        rctx.fillStyle = 'rgba(80,160,255,' + alpha + ')';
                        rctx.fill();
                        // Wave rings (compressed)
                        if (wi % 2 === 0) {
                          rctx.beginPath();
                          rctx.arc(wx, topY, 4 + spacing * 3, 0, Math.PI * 2);
                          rctx.strokeStyle = 'rgba(80,160,255,' + (alpha * 0.4) + ')';
                          rctx.lineWidth = 0.8;
                          rctx.stroke();
                        }
                      }
                      // Galaxy icon (approaching)
                      var galGrad1 = rctx.createRadialGradient(galX1, topY, 0, galX1, topY, 10);
                      galGrad1.addColorStop(0, 'rgba(150,200,255,0.8)');
                      galGrad1.addColorStop(1, 'rgba(150,200,255,0)');
                      rctx.fillStyle = galGrad1;
                      rctx.beginPath(); rctx.arc(galX1, topY, 10, 0, Math.PI * 2); rctx.fill();
                      // Observer
                      rctx.fillStyle = '#22c55e';
                      rctx.beginPath(); rctx.arc(obsX1, topY, 5, 0, Math.PI * 2); rctx.fill();
                      // Arrow showing approach
                      rctx.strokeStyle = '#60a5fa'; rctx.lineWidth = 1.5;
                      rctx.beginPath(); rctx.moveTo(galX1 + 14, topY); rctx.lineTo(obsX1 - 10, topY);
                      rctx.stroke();
                      rctx.beginPath(); rctx.moveTo(obsX1 - 10, topY); rctx.lineTo(obsX1 - 16, topY - 4); rctx.moveTo(obsX1 - 10, topY); rctx.lineTo(obsX1 - 16, topY + 4);
                      rctx.stroke();
                      // Labels
                      rctx.fillStyle = '#60a5fa'; rctx.font = 'bold 8px system-ui'; rctx.textAlign = 'center';
                      rctx.fillText('BLUESHIFT', RW * 0.5, topY - 18);
                      rctx.fillStyle = '#94a3b8'; rctx.font = '7px system-ui';
                      rctx.fillText('Approaching \u2192 wavelength compressed \u2192 light appears bluer', RW * 0.5, topY + 22);

                      // Divider
                      rctx.strokeStyle = 'rgba(100,116,139,0.3)'; rctx.lineWidth = 0.5;
                      rctx.beginPath(); rctx.moveTo(20, RH * 0.5); rctx.lineTo(RW - 20, RH * 0.5); rctx.stroke();

                      // === BOTTOM HALF: Redshift (receding) ===
                      var botY = RH * 0.75;
                      // Receding galaxy (moves left away from observer)
                      var galX2 = RW * 0.6 - (rtick * 0.3) % (RW * 0.35);
                      var obsX2 = RW * 0.22;
                      // Draw stretched waves between observer and galaxy
                      var waveCount2 = 8;
                      for (var wj = 0; wj < waveCount2; wj++) {
                        var frac2 = wj / waveCount2;
                        var wx2 = obsX2 + frac2 * (galX2 - obsX2);
                        var spacing2 = 1.0 + frac2 * 0.8;
                        var alpha2 = 0.2 + 0.3 * frac2;
                        rctx.beginPath();
                        rctx.arc(wx2, botY, 2, 0, Math.PI * 2);
                        rctx.fillStyle = 'rgba(255,100,80,' + alpha2 + ')';
                        rctx.fill();
                        // Wave rings (stretched)
                        if (wj % 2 === 0) {
                          rctx.beginPath();
                          rctx.arc(wx2, botY, 5 + spacing2 * 5, 0, Math.PI * 2);
                          rctx.strokeStyle = 'rgba(255,100,80,' + (alpha2 * 0.3) + ')';
                          rctx.lineWidth = 0.8;
                          rctx.stroke();
                        }
                      }
                      // Galaxy icon (receding)
                      var galGrad2 = rctx.createRadialGradient(galX2, botY, 0, galX2, botY, 10);
                      galGrad2.addColorStop(0, 'rgba(255,150,120,0.8)');
                      galGrad2.addColorStop(1, 'rgba(255,150,120,0)');
                      rctx.fillStyle = galGrad2;
                      rctx.beginPath(); rctx.arc(galX2, botY, 10, 0, Math.PI * 2); rctx.fill();
                      // Observer
                      rctx.fillStyle = '#22c55e';
                      rctx.beginPath(); rctx.arc(obsX2, botY, 5, 0, Math.PI * 2); rctx.fill();
                      // Arrow showing recession
                      rctx.strokeStyle = '#f87171'; rctx.lineWidth = 1.5;
                      rctx.beginPath(); rctx.moveTo(obsX2 + 10, botY); rctx.lineTo(galX2 - 14, botY);
                      rctx.stroke();
                      rctx.beginPath(); rctx.moveTo(galX2 - 14, botY); rctx.lineTo(galX2 - 8, botY - 4); rctx.moveTo(galX2 - 14, botY); rctx.lineTo(galX2 - 8, botY + 4);
                      rctx.stroke();
                      // Labels
                      rctx.fillStyle = '#f87171'; rctx.font = 'bold 8px system-ui'; rctx.textAlign = 'center';
                      rctx.fillText('REDSHIFT', RW * 0.5, botY - 18);
                      rctx.fillStyle = '#94a3b8'; rctx.font = '7px system-ui';
                      rctx.fillText('Receding \u2192 wavelength stretched \u2192 light appears redder', RW * 0.5, botY + 22);

                      // Spectrum bar at bottom
                      var specY = RH - 12;
                      var specColors = ['#6366f1','#3b82f6','#22d3ee','#22c55e','#eab308','#f97316','#ef4444'];
                      var barW = (RW - 40) / specColors.length;
                      for (var sci = 0; sci < specColors.length; sci++) {
                        rctx.fillStyle = specColors[sci];
                        rctx.fillRect(20 + sci * barW, specY, barW, 6);
                      }
                      rctx.fillStyle = '#94a3b8'; rctx.font = '6px system-ui';
                      rctx.textAlign = 'left'; rctx.fillText('Blue (short \u03BB)', 20, specY - 2);
                      rctx.textAlign = 'right'; rctx.fillText('Red (long \u03BB)', RW - 20, specY - 2);

                      requestAnimationFrame(drawRS);
                    }
                    drawRS();
                  }
                }),
                // Explanation text
                React.createElement("div", { className: "space-y-1.5 text-[11px] text-slate-300" },
                  React.createElement("div", null, "\uD83D\uDD34 **Redshift**: When an object moves away from us, its light waves get stretched to longer (redder) wavelengths. The faster it recedes, the greater the redshift. Edwin Hubble discovered that distant galaxies are all redshifted \u2014 proving the universe is expanding."),
                  React.createElement("div", null, "\uD83D\uDD35 **Blueshift**: When an object approaches us, its light waves are compressed to shorter (bluer) wavelengths. Andromeda is one of the few blueshifted galaxies \u2014 it's heading toward us at 300 km/s!"),
                  React.createElement("div", null, "\uD83C\uDF20 **Cosmological Redshift**: Not a Doppler effect! Space itself is expanding, stretching the wavelength of photons traveling through it. The CMB has been redshifted by a factor of 1,089.")
                ),
                // z-value formula
                React.createElement("div", { className: "bg-slate-800 rounded-lg p-2 text-center border border-slate-700 mt-1" },
                  React.createElement("div", { className: "text-[11px] font-mono text-indigo-300" }, "z = (\u03BB_observed - \u03BB_emitted) / \u03BB_emitted"),
                  React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5" }, "z > 0 = redshift (receding) \u2022 z < 0 = blueshift (approaching) \u2022 z = 1 means wavelength doubled")
                ),
                // Real examples
                React.createElement("div", { className: "text-[11px] font-bold text-white mt-2 mb-1" }, "Real Examples:"),
                React.createElement("div", { className: "space-y-1.5" },
                  REDSHIFT_EXAMPLES.map(function(re, rei) {
                    return React.createElement("div", { key: rei, className: "flex items-start gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700" },
                      React.createElement("span", { className: "text-sm mt-0.5" }, re.icon),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("div", { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-[11px] font-bold text-white" }, re.name),
                          React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full font-bold " + (re.type === 'blueshift' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300') }, re.type + " z=" + re.z)
                        ),
                        React.createElement("div", { className: "text-[11px] text-slate-200" }, "Velocity: " + re.vel),
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, re.desc)
                      )
                    );
                  })
                ),
                React.createElement("button", { "aria-label": "Listen to explanation",
                  onClick: function() { speakText('Redshift happens when an object moves away from us, stretching its light to longer, redder wavelengths. Blueshift happens when an object approaches, compressing light to shorter, bluer wavelengths. Edwin Hubble discovered that almost all galaxies are redshifted, proving the universe is expanding.'); },
                  className: "mt-1 text-[11px] text-red-400 hover:text-red-300"
                }, "\uD83D\uDD0A Listen to explanation")
              )
            ),

            // === STELLAR NURSERIES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-pink-50 to-purple-50 border-pink-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-pink-300' : 'text-pink-700') }, "\uD83C\uDF1F Stellar Nurseries \u2014 Where Stars Are Born"),
                React.createElement("button", { "aria-label": "Toggle stellar nurseries section",
                  onClick: function() { upd('showNurseries', !d.showNurseries); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-pink-500 hover:text-pink-700"
                }, d.showNurseries ? 'Hide' : 'Explore \u2192')
              ),
              d.showNurseries && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "Stars are born in vast clouds of gas and dust called nebulae. When regions become dense enough, gravity wins and collapse begins."),
                React.createElement("div", { className: "grid grid-cols-1 gap-2" },
                  STELLAR_NURSERIES.map(function(sn, sni) {
                    return React.createElement("div", { key: sni, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-pink-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("div", { className: "w-7 h-7 rounded-full flex items-center justify-center text-sm", style: { background: sn.color + '25', border: '2px solid ' + sn.color } }, sn.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, sn.name),
                          React.createElement("div", { className: "flex gap-2 text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') },
                            React.createElement("span", null, "\uD83D\uDCCF " + sn.dist),
                            React.createElement("span", null, "\u2194 " + sn.size)
                          )
                        )
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, sn.desc),
                      React.createElement("div", { className: "text-[11px] font-medium " + (isDark ? 'text-pink-400' : 'text-pink-600') }, "\u2B50 Features: " + sn.features),
                      React.createElement("button", { "aria-label": "Listen to " + sn.name + " stellar nursery",
                        onClick: function(e) { e.stopPropagation(); speakText(sn.name + '. ' + sn.desc); },
                        className: "mt-1 text-[11px] text-pink-400 hover:text-pink-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === PLANETARY NEBULAE GALLERY ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-cyan-50 to-teal-50 border-cyan-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-cyan-300' : 'text-cyan-700') }, "\uD83C\uDF00 Planetary Nebulae \u2014 Beautiful Stellar Deaths"),
                React.createElement("button", { "aria-label": "Toggle planetary nebulae gallery section",
                  onClick: function() { upd('showPNebulae', !d.showPNebulae); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-cyan-500 hover:text-cyan-700"
                }, d.showPNebulae ? 'Hide' : 'Gallery \u2192')
              ),
              d.showPNebulae && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "When low-mass stars (like our Sun) die, they shed their outer layers into gorgeous expanding shells of glowing gas. The hot white dwarf core illuminates them from within. Despite the name, they have nothing to do with planets!"),
                React.createElement("div", { className: "grid grid-cols-1 gap-2" },
                  PLANETARY_NEBULAE.map(function(pn, pni) {
                    return React.createElement("div", { key: pni, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-cyan-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("div", { className: "w-7 h-7 rounded-full flex items-center justify-center text-sm", style: { background: pn.color + '25', border: '2px solid ' + pn.color } }, pn.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, pn.name),
                          React.createElement("div", { className: "flex gap-2 text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') },
                            React.createElement("span", null, "\uD83D\uDCCF " + pn.dist),
                            React.createElement("span", null, "\u23F3 " + pn.age),
                            React.createElement("span", null, "\uD83C\uDF00 " + pn.shape)
                          )
                        )
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, pn.desc)
                    );
                  })
                )
              )
            ),

            // === COSMIC CATASTROPHES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-orange-50 to-red-50 border-orange-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-orange-300' : 'text-orange-700') }, "\u2604 Cosmic Catastrophes"),
                React.createElement("button", { "aria-label": "Toggle cosmic catastrophes section",
                  onClick: function() { upd('showCatastrophes', !d.showCatastrophes); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-orange-500 hover:text-orange-700"
                }, d.showCatastrophes ? 'Hide' : 'Explore \u2192')
              ),
              d.showCatastrophes && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "The universe is not always peaceful. Here are some of the most violent events that can occur in space:"),
                React.createElement("div", { className: "space-y-2" },
                  COSMIC_CATASTROPHES.map(function(cc, cci) {
                    return React.createElement("div", { key: cci, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-orange-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, cc.icon),
                        React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, cc.name),
                        React.createElement("span", { className: "ml-auto text-[11px] px-1.5 py-0.5 rounded-full font-bold " + (isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600') }, cc.energy)
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, cc.desc),
                      React.createElement("div", { className: "flex items-center gap-2 text-[11px]" },
                        React.createElement("span", { className: (isDark ? 'text-amber-400' : 'text-amber-600') + " font-bold" }, "\u26A0 Danger: " + cc.danger),
                        React.createElement("span", { className: isDark ? 'text-slate-200' : 'text-slate-600' }, "\u2022 Frequency: " + cc.freq)
                      ),
                      React.createElement("button", { "aria-label": "Listen to " + cc.name + " catastrophe",
                        onClick: function(e) { e.stopPropagation(); speakText(cc.name + '. ' + cc.desc); },
                        className: "mt-1 text-[11px] text-orange-400 hover:text-orange-600"
                      }, "\uD83D\uDD0A Listen")
                    );
                  })
                )
              )
            ),

            // === ELECTROMAGNETIC SPECTRUM IN ASTRONOMY ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-900') + " rounded-xl p-3 border border-indigo-600" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-400" }, "\uD83C\uDF08 The Electromagnetic Spectrum in Astronomy"),
                React.createElement("button", { "aria-label": "Toggle electromagnetic spectrum section",
                  onClick: function() { upd('showSpectrum', !d.showSpectrum); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-indigo-400 hover:text-indigo-300"
                }, d.showSpectrum ? 'Hide' : 'Explore \u2192')
              ),
              d.showSpectrum && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "Astronomers observe the universe across the entire electromagnetic spectrum. Each type of light reveals different cosmic phenomena invisible to our eyes."),
                // Spectrum bar visualization
                React.createElement("div", { className: "flex rounded-lg overflow-hidden mb-2 h-3" },
                  EM_SPECTRUM.map(function(em, emi) {
                    return React.createElement("div", { key: emi, className: "flex-1", style: { background: em.color }, title: em.name });
                  })
                ),
                React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600 mb-2" },
                  React.createElement("span", null, "Radio (long \u03BB) \u2190"),
                  React.createElement("span", null, "\u2192 Gamma (short \u03BB)")
                ),
                React.createElement("div", { className: "space-y-1.5" },
                  EM_SPECTRUM.map(function(em, emi) {
                    var isActive = d.spectrumIdx === emi;
                    return React.createElement("div", { 
                      key: emi,
                      onClick: function() { upd('spectrumIdx', isActive ? null : emi); playBeep(); },
                      className: "cursor-pointer rounded-lg p-2 border transition-all " + (isActive ? 'bg-slate-700 border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500')
                    },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("div", { className: "w-3 h-3 rounded-full flex-shrink-0", style: { background: em.color } }),
                        React.createElement("span", { className: "text-[11px] font-bold text-white" }, em.name),
                        React.createElement("span", { className: "ml-auto text-[11px] text-slate-600 font-mono" }, em.wavelength)
                      ),
                      isActive && React.createElement("div", { className: "mt-1.5 space-y-1" },
                        React.createElement("div", { className: "text-[11px] text-slate-200" }, em.desc),
                        React.createElement("div", { className: "text-[11px] text-indigo-300" }, "\uD83D\uDD2D Sees: " + em.sees),
                        React.createElement("div", { className: "text-[11px] text-slate-600" }, "Telescopes: " + em.telescope)
                      )
                    );
                  })
                )
              )
            ),

            // === SCALE OF THE UNIVERSE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-violet-50 to-indigo-50 border-violet-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-violet-300' : 'text-violet-700') }, "\uD83D\uDD0D Scale of the Universe \u2014 Powers of 10"),
                React.createElement("button", { "aria-label": "Toggle scale of the universe section",
                  onClick: function() { upd('showScale', !d.showScale); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-violet-500 hover:text-violet-700"
                }, d.showScale ? 'Hide' : 'Zoom \u2192')
              ),
              d.showScale && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "From quarks to the observable universe \u2014 a journey across 44 orders of magnitude:"),
                // Zoom slider
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-violet-400' : 'text-violet-500') }, "Quarks"),
                  React.createElement("input", {
                    type: "range", min: 0, max: COSMIC_SCALES.length - 1, step: 1,
                    value: d.scaleIdx || 0,
                    'aria-label': 'Cosmic scale zoom from quarks to universe',
                    onChange: function(e) { upd('scaleIdx', parseInt(e.target.value)); playBeep(); },
                    className: "flex-1 h-1.5 accent-violet-500"
                  }),
                  React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-violet-400' : 'text-violet-500') }, "Universe")
                ),
                // Current scale display
                (function() {
                  var si = d.scaleIdx || 0;
                  var cs = COSMIC_SCALES[si];
                  var isHuman = cs.power === 0;
                  return React.createElement("div", { className: "text-center p-3 rounded-xl " + (isDark ? 'bg-slate-700' : 'bg-white') + " border " + (isDark ? 'border-slate-600' : 'border-violet-200') + (isHuman ? ' ring-2 ring-violet-400' : '') },
                    React.createElement("div", { className: "text-3xl mb-1" }, cs.icon),
                    React.createElement("div", { className: "text-sm font-black " + (isDark ? 'text-white' : 'text-slate-800') }, cs.name),
                    React.createElement("div", { className: "text-xs font-mono " + (isDark ? 'text-violet-400' : 'text-violet-600') + " mb-1" }, cs.size),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, cs.desc),
                    isHuman && React.createElement("div", { className: "text-[11px] font-bold text-violet-500 mt-1" }, "\u2B50 You are here!")
                  );
                })(),
                // Scale ladder
                React.createElement("div", { className: "mt-2 relative" },
                  React.createElement("div", { className: "absolute left-3 top-0 bottom-0 w-0.5 " + (isDark ? 'bg-slate-600' : 'bg-violet-200') }),
                  React.createElement("div", { className: "space-y-1 max-h-52 overflow-y-auto" },
                    COSMIC_SCALES.map(function(cs2, csi) {
                      var isActive = (d.scaleIdx || 0) === csi;
                      return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: csi,
                        onClick: function() { upd('scaleIdx', csi); playBeep(); },
                        className: "relative pl-8 py-0.5 cursor-pointer rounded-r transition-all " + (isActive ? (isDark ? 'bg-slate-700' : 'bg-violet-50') : 'hover:bg-slate-50')
                      },
                        React.createElement("div", { className: "absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 " + (isActive ? 'bg-violet-500 border-violet-500' : (isDark ? 'border-slate-500 bg-slate-700' : 'border-violet-200 bg-white')) }),
                        React.createElement("div", { className: "flex items-center gap-1.5" },
                          React.createElement("span", { className: "text-xs" }, cs2.icon),
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? (isActive ? 'text-white' : 'text-slate-200') : (isActive ? 'text-slate-800' : 'text-slate-200')) }, cs2.name),
                          React.createElement("span", { className: "text-[11px] font-mono " + (isDark ? 'text-slate-600' : 'text-slate-200') }, "10^" + cs2.power + " m")
                        )
                      );
                    })
                  )
                )
              )
            ),

            // === SPECTRAL CLASSIFICATION ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-indigo-50 to-red-50 border-indigo-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-indigo-300' : 'text-indigo-700') }, "\uD83C\uDF08 Spectral Classification \u2014 OBAFGKM"),
                React.createElement("button", { "aria-label": "Toggle spectral classification section",
                  onClick: function() { upd('showSpectral', !d.showSpectral); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-indigo-500 hover:text-indigo-700"
                }, d.showSpectral ? 'Hide' : 'Classify \u2192')
              ),
              d.showSpectral && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-1" }, "Stars are classified by surface temperature into spectral types: O, B, A, F, G, K, M."),
                React.createElement("div", { className: "text-center text-[11px] font-bold mb-2 py-1 rounded-lg " + (isDark ? 'bg-slate-700 text-indigo-300' : 'bg-indigo-100 text-indigo-700') }, "\uD83D\uDCA1 Mnemonic: \"Oh Be A Fine Girl/Guy, Kiss Me\""),
                // Color bar
                React.createElement("div", { className: "flex rounded-lg overflow-hidden mb-2 h-2" },
                  SPECTRAL_CLASSES.map(function(sc, sci) {
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: sci, className: "flex-1 cursor-pointer hover:h-3 transition-all", style: { background: sc.color }, title: sc.class + ' (' + sc.colorName + ')',
                      onClick: function() { upd('spectralIdx', sci); playBeep(); }
                    });
                  })
                ),
                React.createElement("div", { className: "flex justify-between text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-2" },
                  React.createElement("span", null, "Hottest (O)"),
                  React.createElement("span", null, "Coolest (M)")
                ),
                // Expanded card for selected class
                (function() {
                  var idx = d.spectralIdx !== undefined ? d.spectralIdx : 4; // Default to G (Sun)
                  var sc = SPECTRAL_CLASSES[idx];
                  return React.createElement("div", { className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-indigo-100') + " rounded-xl p-3 border-2 transition-all", style: { borderColor: sc.color } },
                    React.createElement("div", { className: "flex items-center gap-3 mb-2" },
                      React.createElement("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg", style: { background: sc.color, boxShadow: '0 0 20px ' + sc.color + '60' } }, sc.class),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("div", { className: "text-sm font-black " + (isDark ? 'text-white' : 'text-slate-800') }, "Class " + sc.class + " \u2014 " + sc.colorName + " Stars"),
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "Example: " + sc.example + " \u2022 " + sc.pct + " of all stars")
                      )
                    ),
                    React.createElement("div", { className: "grid grid-cols-4 gap-1.5 mb-2" },
                      [
                        { label: 'Temperature', val: sc.temp },
                        { label: 'Mass', val: sc.mass },
                        { label: 'Luminosity', val: sc.luminosity },
                        { label: 'Lifespan', val: sc.lifespan }
                      ].map(function(stat) {
                        return React.createElement("div", { key: stat.label, className: "text-center text-[11px] p-1 rounded " + (isDark ? 'bg-slate-600' : 'bg-slate-50') },
                          React.createElement("div", { className: "font-bold " + (isDark ? 'text-slate-200' : 'text-slate-700') }, stat.val),
                          React.createElement("div", { className: isDark ? 'text-slate-200' : 'text-slate-600' }, stat.label)
                        );
                      })
                    ),
                    React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, sc.desc),
                    sc.class === 'G' && React.createElement("div", { className: "mt-1 text-[11px] font-bold text-amber-500" }, "\u2600\uFE0F Our Sun is a G2V star!"),
                    React.createElement("button", { "aria-label": "Listen to class " + sc.class + " star description",
                      onClick: function() { speakText('Class ' + sc.class + ' stars. ' + sc.colorName + '. Temperature: ' + sc.temp + '. ' + sc.desc); },
                      className: "mt-1 text-[11px] " + (isDark ? 'text-indigo-400' : 'text-indigo-500') + " hover:text-indigo-600"
                    }, "\uD83D\uDD0A Listen")
                  );
                })(),
                // Class selector buttons
                React.createElement("div", { className: "flex gap-1 mt-2 justify-center" },
                  SPECTRAL_CLASSES.map(function(sc, sci) {
                    var isActive = (d.spectralIdx !== undefined ? d.spectralIdx : 4) === sci;
                    return React.createElement("button", { "aria-label": "Select spectral class " + sc.class, key: sci,
                      onClick: function() { upd('spectralIdx', sci); playBeep(); },
                      className: "w-8 h-8 rounded-full text-xs font-black text-white transition-all " + (isActive ? 'ring-2 ring-offset-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'),
                      style: { background: sc.color }
                    }, sc.class);
                  })
                )
              )
            ),

            // === GRAVITY CALCULATOR ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-green-50 to-emerald-50 border-green-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-green-300' : 'text-green-700') }, "\u2696 Gravity Calculator \u2014 What Would You Weigh?"),
                React.createElement("button", { "aria-label": "Toggle gravity calculator section",
                  onClick: function() { upd('showGravity', !d.showGravity); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-green-500 hover:text-green-700"
                }, d.showGravity ? 'Hide' : 'Calculate \u2192')
              ),
              d.showGravity && React.createElement("div", null,
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("label", { className: "text-[11px] font-bold " + (isDark ? 'text-slate-300' : 'text-slate-600') }, "Your weight on Earth (kg):"),
                  React.createElement("input", {
                    type: "number", min: 1, max: 500, step: 1,
                    value: d.earthWeight || 70,
                    'aria-label': 'Your weight on Earth in kilograms',
                    onChange: function(e) { upd('earthWeight', parseFloat(e.target.value) || 70); },
                    className: "w-20 px-2 py-1 border rounded text-sm text-center " + (isDark ? 'bg-slate-700 border-slate-600 text-white' : 'border-green-600')
                  }),
                  React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "(" + Math.round((d.earthWeight || 70) * 2.205) + " lbs)")
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                  GRAVITY_BODIES.map(function(gb, gbi) {
                    var w = (d.earthWeight || 70) * gb.g;
                    var isEarth = gb.name === 'Earth';
                    return React.createElement("div", { key: gbi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-green-100') + " rounded-lg p-2 border text-center " + (isEarth ? 'ring-2 ring-green-400' : '') },
                      React.createElement("div", { className: "text-sm" }, gb.icon),
                      React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, gb.name),
                      React.createElement("div", { className: "text-sm font-black " + (isDark ? 'text-green-300' : 'text-green-600') }, gb.g > 1000 ? 'N/A' : w.toFixed(1) + " kg"),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, gb.g < 100 ? gb.g + "g" : gb.g.toExponential(1) + "g"),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic" }, gb.desc)
                    );
                  })
                )
              )
            ),

            // === FAMOUS SPACE IMAGES ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-sky-50 to-indigo-50 border-sky-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-sky-300' : 'text-sky-700') }, "\uD83D\uDCF7 Famous Space Images That Changed Everything"),
                React.createElement("button", { "aria-label": "Toggle famous space images section",
                  onClick: function() { upd('showImages', !d.showImages); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-sky-500 hover:text-sky-700"
                }, d.showImages ? 'Hide' : 'View \u2192')
              ),
              d.showImages && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "These photographs didn't just capture light \u2014 they transformed humanity's understanding of our place in the cosmos."),
                React.createElement("div", { className: "space-y-2" },
                  FAMOUS_IMAGES.map(function(fi, fii) {
                    var isActive = d.imageIdx === fii;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: fii,
                      onClick: function() { upd('imageIdx', isActive ? null : fii); playBeep(); },
                      className: "cursor-pointer rounded-lg p-2.5 border transition-all " + (isActive
                        ? (isDark ? 'bg-slate-700 border-sky-500' : 'bg-white border-sky-400 shadow-md')
                        : (isDark ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' : 'bg-white/50 border-sky-100 hover:border-sky-300'))
                    },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-lg" }, fi.icon),
                        React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, fi.name),
                        React.createElement("span", { className: "ml-auto text-[11px] px-1.5 py-0.5 rounded-full " + (isDark ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-600') }, fi.mission)
                      ),
                      isActive && React.createElement("div", { className: "mt-2 space-y-1" },
                        React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-300' : 'text-slate-600') }, fi.desc),
                        React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-sky-400' : 'text-sky-600') }, "\uD83D\uDCA1 Impact: " + fi.impact),
                        React.createElement("button", { "aria-label": "Listen to " + fi.name + " image description",
                          onClick: function(e) { e.stopPropagation(); speakText(fi.name + '. ' + fi.desc + '. Impact: ' + fi.impact); },
                          className: "text-[11px] text-sky-400 hover:text-sky-600"
                        }, "\uD83D\uDD0A Listen")
                      )
                    );
                  })
                )
              )
            ),

            // === COSMIC SPEED COMPARISON ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-amber-300' : 'text-amber-700') }, "\uD83C\uDFC1 Cosmic Speed Comparison"),
                React.createElement("button", { "aria-label": "Toggle cosmic speed comparison section",
                  onClick: function() { upd('showSpeeds', !d.showSpeeds); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-amber-500 hover:text-amber-700"
                }, d.showSpeeds ? 'Hide' : 'Race \u2192')
              ),
              d.showSpeeds && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "How does your walking speed compare to the speed of light? Spoiler: not great."),
                React.createElement("div", { className: "space-y-1.5" },
                  COSMIC_SPEEDS.map(function(cs, csi) {
                    var maxMps = 299792458;
                    var barPct = cs.mps ? Math.max(0.5, Math.log10(cs.mps) / Math.log10(maxMps) * 100) : 100;
                    return React.createElement("div", { key: csi, className: (isDark ? 'bg-slate-700' : 'bg-white') + " rounded-lg p-2 border " + (isDark ? 'border-slate-600' : 'border-amber-100') },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-sm" }, cs.icon),
                        React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') + " flex-1" }, cs.name),
                        React.createElement("span", { className: "text-[11px] font-mono " + (isDark ? 'text-amber-300' : 'text-amber-600') }, cs.speed)
                      ),
                      React.createElement("div", { className: "flex items-center gap-1.5" },
                        React.createElement("div", { className: "flex-1 bg-slate-200 rounded-full h-1.5 " + (isDark ? 'bg-slate-600' : '') },
                          React.createElement("div", { className: "h-1.5 rounded-full transition-all", style: { width: barPct + '%', background: cs.color } })
                        ),
                        React.createElement("span", { className: "text-[11px] font-mono w-16 text-right " + (isDark ? 'text-slate-200' : 'text-slate-200') }, cs.frac + " c")
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "mt-2 text-center text-[11px] " + (isDark ? 'text-amber-400' : 'text-amber-600') + " font-bold" }, "\u26A1 At walking speed, reaching the nearest star would take ~1 million years. Light does it in 4.24 years.")
              )
            ),

            // === CITIZEN SCIENCE ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-teal-50 to-cyan-50 border-teal-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-teal-300' : 'text-teal-700') }, "\uD83E\uDDD1\u200D\uD83D\uDD2C Citizen Science \u2014 You Can Do Real Astronomy!"),
                React.createElement("button", { "aria-label": "Toggle citizen science section",
                  onClick: function() { upd('showCitizenSci', !d.showCitizenSci); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-teal-500 hover:text-teal-700"
                }, d.showCitizenSci ? 'Hide' : 'Join \u2192')
              ),
              d.showCitizenSci && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "You don't need a PhD to contribute to real astronomical research! These projects let students and anyone with a browser help make real discoveries:"),
                React.createElement("div", { className: "space-y-2" },
                  CITIZEN_SCIENCE.map(function(cs, csi) {
                    return React.createElement("div", { key: csi, className: (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-teal-100') + " rounded-lg p-2.5 border" },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, cs.icon),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("span", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, cs.name),
                          React.createElement("span", { className: "ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full " + (isDark ? 'bg-teal-900 text-teal-300' : 'bg-teal-100 text-teal-600') }, cs.field)
                        )
                      ),
                      React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " mb-1" }, cs.desc),
                      React.createElement("div", { className: "text-[11px] font-mono " + (isDark ? 'text-teal-400' : 'text-teal-600') }, "\uD83C\uDF10 " + cs.url)
                    );
                  })
                )
              )
            ),

            // === COSMOLOGY GLOSSARY ===
            React.createElement("div", { className: "mt-3 " + (isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-b from-stone-50 to-slate-50 border-stone-200') + " rounded-xl p-3 border" },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("span", { className: "text-xs font-bold " + (isDark ? 'text-stone-300' : 'text-stone-700') }, "\uD83D\uDCD6 Cosmology Glossary"),
                React.createElement("button", { "aria-label": "Toggle cosmology glossary section",
                  onClick: function() { upd('showGlossary', !d.showGlossary); setTimeout(checkChallenges, 50); },
                  className: "text-[11px] text-stone-500 hover:text-stone-700"
                }, d.showGlossary ? 'Hide' : 'Browse \u2192')
              ),
              d.showGlossary && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') + " italic mb-2" }, "Key terms every aspiring cosmologist should know:"),
                React.createElement("div", { className: "space-y-1 max-h-72 overflow-y-auto" },
                  COSMO_GLOSSARY.map(function(gl, gli) {
                    var isActive = d.glossaryIdx === gli;
                    return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: gli,
                      onClick: function() { upd('glossaryIdx', isActive ? null : gli); },
                      className: "cursor-pointer rounded-lg p-2 border transition-all " + (isActive
                        ? (isDark ? 'bg-slate-700 border-stone-500' : 'bg-white border-stone-300 shadow-sm')
                        : (isDark ? 'bg-slate-700/30 border-slate-700 hover:border-slate-500' : 'bg-white/50 border-stone-100 hover:border-stone-300'))
                    },
                      React.createElement("div", { className: "text-[11px] font-bold " + (isDark ? 'text-white' : 'text-slate-800') }, gl.term),
                      isActive && React.createElement("div", { className: "mt-1 text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, gl.def)
                    );
                  })
                )
              )
            ),

                        // === DARK MODE TOGGLE ===
            React.createElement("div", { className: "mt-3 flex items-center justify-between" },
              React.createElement("label", { className: "text-xs " + (isDark ? 'text-slate-200' : 'text-slate-200') + " flex items-center gap-2 cursor-pointer" },
                React.createElement("input", {
                  type: "checkbox", checked: isDark,
                  onChange: function() { upd('isDark', !isDark); },
                  className: "rounded"
                }),
                (isDark ? '\uD83C\uDF19' : '\u2600\uFE0F') + " Dark Mode"
              ),
              React.createElement("span", { className: "text-[11px] " + (isDark ? 'text-slate-200' : 'text-slate-200') }, "\uD83C\uDF20 Epochs visited: " + epochsVisited.length + "/9")
            ),

            // === TUTORIAL OVERLAY ===
            !d.tutorialDismissed && React.createElement("div", { 
              className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50",
              onClick: function(e) { if (e.target === e.currentTarget) upd('tutorialDismissed', true); }
            },
              React.createElement("div", { className: "bg-white rounded-2xl p-6 max-w-md shadow-2xl mx-4" },
                React.createElement("div", { className: "text-center mb-4" },
                  React.createElement("div", { className: "text-4xl mb-2" }, "\uD83C\uDF20\uD83D\uDCA5\u2B50"),
                  React.createElement("h2", { className: "text-lg font-black text-slate-800" }, "Welcome to Universe Time-Lapse!"),
                  React.createElement("p", { className: "text-sm text-slate-600 mt-1" }, "Explore 13.8 billion years of cosmic history")
                ),
                React.createElement("div", { className: "space-y-2 text-xs text-slate-600" },
                  [
                    { icon: '\u23F3', text: 'Drag the timeline slider to travel through cosmic epochs' },
                    { icon: '\u25B6', text: 'Press Play to watch the universe evolve in real time' },
                    { icon: '\u2B50', text: 'Explore the Star Lifecycle from birth to black hole' },
                    { icon: '\uD83D\uDCCA', text: 'Study the HR Diagram to classify stars' },
                    { icon: '\uD83D\uDD73', text: 'Learn about dark energy, dark matter, and cosmic structure' },
                    { icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', text: 'Ask the AI Cosmos Tutor any question about the universe' }
                  ].map(function(step, si) {
                    return React.createElement("div", { key: si, className: "flex items-center gap-2" },
                      React.createElement("span", { className: "text-lg" }, step.icon),
                      React.createElement("span", null, step.text)
                    );
                  })
                ),
                React.createElement("button", { "aria-label": "Dismiss tutorial and start exploring",
                  onClick: function() { upd('tutorialDismissed', true); playBeep(); },
                  className: "mt-4 w-full py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 shadow-lg"
                }, "\uD83C\uDF20 Start Exploring!")
              )
            ),

            // Snapshot button
            React.createElement("div", { className: "flex mt-3" },

              React.createElement("button", { "aria-label": "Save snapshot of current universe state", onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'uni-' + Date.now(), tool: 'universe', label: t('stem.universe.universe') + epoch.name, data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full hover:from-violet-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

            )

          );
      })();
    }
  });


})();

} // end dedup guard